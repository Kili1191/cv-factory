import { extractJob } from "./extract.js";

const NUVI = "https://thenuvi.com/";
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
