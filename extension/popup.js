import { extractJob } from "./extract.js";

// The app, not the front page: since the site split, "/" is the landing
// page and the capture listener lives on "/app". Opening the root parked the
// ad in storage while the person read the landing page: exactly the detour
// the bridge says it avoids.
const NUVI = "https://thenuvi.com/app";
const sub = document.getElementById("sub");
const out = document.getElementById("out");
const go = document.getElementById("go");

const esc = (s) => String(s || "").replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));

// THE POPUP SPEAKS THE LANGUAGE THE PERSON CHOSE, AND IT SPOKE ONLY FRENCH
//
// Every string here was frozen in French, in a surface with no language
// setting of its own: somebody using Nuvi in English pressed a button that
// answered them in French, on a job board, with an application half filled.
//
// Nothing had to be invented to fix it. bridge.js already carries the chosen
// language into the extension's storage, under nuvi_cv.locale, because the
// PDF printer needs it: the popup only had to read it. English is the default
// for the same reason it is the default in the product, and because a popup
// opened before Nuvi has ever been visited has no profile to read it from.
const DICO = {
  en: {
    noTab: "No active page.",
    unreadable: "Cannot read this page.",
    noAd: "No job ad recognised here.",
    noAdFix: "Open the job ad itself, not a list of results.",
    adRead: "Ad read.",
    adRough: "Rough reading, check it before you send.",
    unknownRole: "Role unknown",
    characters: "characters",
    tooShort: "This ad is very short. The tailored CV will be less precise.",
    sending: "Sending...",
    readingForm: "Reading the form...",
    noProfile: "Open Nuvi once so that your CV is known here.",
    refused: "This page would not allow it.",
    noField: "No field recognised here. This one is by hand.",
    filledWait: (n) => n + " fields filled. The CV is on its way...",
    filledDone: (n, list, withCv) => n + " fields filled: " + list
      + (withCv ? ", and the CV attached" : "") + ". Read it over, then send it yourself.",
    names: {
      prenom: "first name", nom: "surname", nomComplet: "name", email: "email",
      telephone: "phone", ville: "city", lieu: "location", linkedin: "LinkedIn", site: "website",
    },
  },
  fr: {
    noTab: "Aucune page active.",
    unreadable: "Impossible de lire cette page.",
    noAd: "Aucune annonce reconnue ici.",
    noAdFix: "Ouvre la page de l'offre elle-meme, pas une liste de resultats.",
    adRead: "Annonce lue.",
    adRough: "Lecture approximative, verifie avant d'envoyer.",
    unknownRole: "Poste inconnu",
    characters: "caracteres",
    tooShort: "Cette annonce est tres courte. Le CV adapte sera moins precis.",
    sending: "Envoi...",
    readingForm: "Lecture du formulaire...",
    noProfile: "Ouvre Nuvi une fois pour que ton CV soit connu.",
    refused: "Cette page n'a pas laisse faire.",
    noField: "Aucun champ reconnu ici. A remplir a la main.",
    filledWait: (n) => n + " champs remplis. Le CV arrive...",
    filledDone: (n, list, withCv) => n + " champs remplis : " + list
      + (withCv ? ", et le CV joint" : "") + ". Relis, puis envoie toi-meme.",
    names: {
      prenom: "prenom", nom: "nom", nomComplet: "nom", email: "e-mail",
      telephone: "telephone", ville: "ville", lieu: "lieu", linkedin: "LinkedIn", site: "site",
    },
  },
};

// Read before anything is written to the screen. The markup carries the
// English strings, so a storage read that fails leaves a correct popup rather
// than an empty one.
async function langue() {
  try {
    const { nuvi_cv: paquet } = await chrome.storage.local.get(["nuvi_cv"]);
    return paquet && paquet.locale === "fr" ? "fr" : "en";
  } catch {
    return "en";
  }
}

let L = DICO.en;

// The three strings the markup already shows. They are rewritten here rather
// than left to the branches below, because two of them (the buttons) are never
// touched again and would have stayed English for a French reader.
function poserLesLibelles() {
  sub.textContent = L === DICO.fr ? "Lecture de l'annonce..." : "Reading the ad...";
  if (go) go.textContent = L === DICO.fr ? "Envoyer vers Nuvi" : "Send to Nuvi";
  const b = document.getElementById("fill");
  const n = document.getElementById("fillout");
  if (b) b.textContent = L === DICO.fr ? "Remplir ce formulaire" : "Fill this form";
  if (n) {
    n.textContent = L === DICO.fr
      ? "Nuvi remplit, c'est toi qui envoies."
      : "Nuvi fills it in, you are the one who sends it.";
  }
}

const pret = (async () => {
  L = DICO[await langue()] || DICO.en;
  poserLesLibelles();
})();

(async () => {
  await pret;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) { sub.textContent = L.noTab; return; }

  let page;
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
    page = res && res.result;
  } catch {
    sub.textContent = L.unreadable;
    return;
  }

  const job = page ? extractJob(page) : null;
  if (!job) {
    sub.textContent = L.noAd;
    out.innerHTML = '<div class="card warn">' + esc(L.noAdFix) + "</div>";
    return;
  }

  sub.textContent = job.confidence === "high" ? L.adRead : L.adRough;

  out.innerHTML = '<div class="card">'
    + `<div class="role">${esc(job.title) || esc(L.unknownRole)}</div>`
    + (job.company ? `<div class="co">${esc(job.company)}</div>` : "")
    + (job.location ? `<div class="loc">${esc(job.location)}</div>` : "")
    + `<div class="loc">${job.description.length} ${esc(L.characters)}</div>`
    + "</div>"
    + (job.tooShort ? '<div class="card warn">' + esc(L.tooShort) + "</div>" : "");

  go.disabled = false;
  go.addEventListener("click", async () => {
    go.disabled = true;
    go.textContent = L.sending;
    await chrome.storage.local.set({
      nuvi_captured_job: { ...job, url: page.url, source: page.host, capturedAt: Date.now() },
    });
    await chrome.tabs.create({ url: NUVI });
    window.close();
  });
})();

// REMPLIR LE FORMULAIRE OUVERT
//
// The script is injected only here, on the tab the person is looking at,
// only when they press this button: the extension asks for no standing
// permission on the job boards. It fills and stops, and the note under the
// button says so, because a person is about to send this to an employer.
const fill = document.getElementById("fill");
const fillout = document.getElementById("fillout");

// THE CV FILE, THE LAST BOX ON EVERY FORM
//
// Filling twenty text boxes and then asking the person to go and find a PDF
// on their disk is most of the work again: the file they should send is the
// one Nuvi just adapted to this ad, and it is nowhere on their machine until
// they download it. So the popup asks Nuvi to print it, here, now, and
// attaches the bytes to the form. The CV travels from thenuvi.com (the only
// host this extension may reach) to the extension, never to the job board's
// server: the page gets a file the person then sends, exactly as if they had
// picked it themselves.
const NUVI_PDF = "https://thenuvi.com/api/pdf";

async function enBase64(blob) {
  // FileReader rather than a loop over the bytes: a 300 kB CV is 300k
  // charCodeAt calls, and String.fromCharCode(...octets) blows the stack.
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("lecture"));
    r.onload = () => {
      const s = String(r.result || "");
      const virgule = s.indexOf(",");
      resolve(virgule < 0 ? "" : s.slice(virgule + 1));
    };
    r.readAsDataURL(blob);
  });
}

// Returns the number of boxes the CV landed in, or null when there is
// nothing to attach. Never throws: a form with no CV box is the common case,
// not a failure, and the fields are already filled either way.
async function joindreLeCv(tabId) {
  let paquet = null;
  try {
    const { nuvi_cv: enregistre } = await chrome.storage.local.get(["nuvi_cv"]);
    paquet = enregistre;
  } catch { return null; }
  if (!paquet || !paquet.cv) return null;

  let blob;
  try {
    const rep = await fetch(NUVI_PDF, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cv: paquet.cv,
        layout: paquet.layout || "classic",
        theme: paquet.theme || null,
        locale: paquet.locale || "en",
        format: "a4",
      }),
    });
    if (!rep.ok) return null;
    blob = await rep.blob();
  } catch { return null; }
  if (!blob || !blob.size) return null;

  const nom = String((paquet.cv && paquet.cv.name) || "CV").trim().replace(/[\\/:*?"<>|]+/g, " ");
  try {
    await chrome.storage.local.set({
      nuvi_pdf: { base64: await enBase64(blob), nom: (nom || "CV") + ".pdf" },
    });
    const [res] = await chrome.scripting.executeScript({ target: { tabId }, files: ["joindre.js"] });
    return ((res && res.result && res.result.joints) || 0);
  } catch {
    return null;
  } finally {
    // The file does not stay behind in the extension once it is on the page.
    try { await chrome.storage.local.remove("nuvi_pdf"); } catch { /* already gone */ }
  }
}

if (fill) {
  fill.addEventListener("click", async () => {
    await pret;
    fill.disabled = true;
    fillout.textContent = L.readingForm;
    try {
      const [onglet] = await chrome.tabs.query({ active: true, currentWindow: true });
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: onglet.id },
        files: ["remplir.js"],
      });
      const r = (res && res.result) || {};
      if (r.erreur === "aucun profil") {
        fillout.textContent = L.noProfile;
      } else if (r.erreur) {
        fillout.textContent = L.refused;
      } else if (!r.remplis || !r.remplis.length) {
        fillout.textContent = L.noField;
      } else {
        const vus = [...new Set(r.remplis.map((c) => L.names[c] || c))];
        fillout.textContent = L.filledWait(r.remplis.length);
        const joints = await joindreLeCv(onglet.id);
        fillout.textContent = L.filledDone(r.remplis.length, vus.join(", "), Boolean(joints));
      }
    } catch {
      fillout.textContent = L.refused;
    }
    fill.disabled = false;
  });
}
