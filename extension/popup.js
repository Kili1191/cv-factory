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

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) { sub.textContent = "Aucune page active."; return; }

  let page;
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
    page = res && res.result;
  } catch {
    sub.textContent = "Impossible de lire cette page.";
    return;
  }

  const job = page ? extractJob(page) : null;
  if (!job) {
    sub.textContent = "Aucune annonce reconnue ici.";
    out.innerHTML = '<div class="card warn">Ouvre la page de l\'offre elle-meme, '
      + 'pas une liste de resultats.</div>';
    return;
  }

  sub.textContent = job.confidence === "high"
    ? "Annonce lue."
    : "Lecture approximative, verifie avant d'envoyer.";

  out.innerHTML = '<div class="card">'
    + `<div class="role">${esc(job.title) || "Poste inconnu"}</div>`
    + (job.company ? `<div class="co">${esc(job.company)}</div>` : "")
    + (job.location ? `<div class="loc">${esc(job.location)}</div>` : "")
    + `<div class="loc">${job.description.length} caracteres</div>`
    + "</div>"
    + (job.tooShort
      ? '<div class="card warn">Cette annonce est tres courte. Le CV adapte '
        + 'sera moins precis.</div>'
      : "");

  go.disabled = false;
  go.addEventListener("click", async () => {
    go.disabled = true;
    go.textContent = "Envoi...";
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
const NOMS = {
  prenom: "prenom", nom: "nom", nomComplet: "nom", email: "e-mail",
  telephone: "telephone", ville: "ville", lieu: "lieu", linkedin: "LinkedIn", site: "site",
};

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
    fill.disabled = true;
    fillout.textContent = "Lecture du formulaire...";
    try {
      const [onglet] = await chrome.tabs.query({ active: true, currentWindow: true });
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: onglet.id },
        files: ["remplir.js"],
      });
      const r = (res && res.result) || {};
      if (r.erreur === "aucun profil") {
        fillout.textContent = "Ouvre Nuvi une fois pour que ton CV soit connu.";
      } else if (r.erreur) {
        fillout.textContent = "Cette page n'a pas laisse faire.";
      } else if (!r.remplis || !r.remplis.length) {
        fillout.textContent = "Aucun champ reconnu ici. A remplir a la main.";
      } else {
        const vus = [...new Set(r.remplis.map((c) => NOMS[c] || c))];
        fillout.textContent = r.remplis.length + " champs remplis. Le CV arrive...";
        const joints = await joindreLeCv(onglet.id);
        fillout.textContent = r.remplis.length + " champs remplis : " + vus.join(", ")
          + (joints ? ", et le CV joint" : "")
          + ". Relis, puis envoie toi-meme.";
      }
    } catch {
      fillout.textContent = "Cette page n'a pas laisse faire.";
    }
    fill.disabled = false;
  });
}
