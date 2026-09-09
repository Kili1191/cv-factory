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
        fillout.textContent = r.remplis.length + " champs remplis : " + vus.join(", ")
          + ". Relis, puis envoie toi-meme.";
      }
    } catch {
      fillout.textContent = "Cette page n'a pas laisse faire.";
    }
    fill.disabled = false;
  });
}
