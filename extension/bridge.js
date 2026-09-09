// Pont, cote thenuvi.com.
//
// L'extension range l'annonce, ouvre Nuvi, et ce script la depose dans la
// page. C'est ce qui evite le detour reproche aux extensions concurrentes :
// celle de Jobscan capture l'annonce puis renvoie l'utilisateur sur son site,
// ou il doit tout reprendre a la main.
//
// L'annonce est consommee une seule fois : sans cela, chaque ouverture de
// Nuvi rejouerait la derniere offre capturee.
// THE PROFILE TRAVELS OUT, THE SAME WAY THE AD TRAVELS IN
//
// A content script on a job board cannot read what Nuvi stored on
// thenuvi.com: each site has its own storage, and that is the whole point
// of the rule. So this script, which does run on thenuvi.com, copies the
// few fields a form asks for into the extension's own storage, where the
// filler can reach them. Nothing else leaves: no experience, no bullets,
// no ad, only what the person types into a contact box anyway.
function porterLeProfil() {
  try {
    const brut = localStorage.getItem("cvf_d");
    if (!brut) return;
    const cv = JSON.parse(brut);
    if (!cv || typeof cv !== "object") return;
    let reponses = null;
    try { reponses = JSON.parse(localStorage.getItem("cvf_rep") || "null"); } catch { reponses = null; }
    import(chrome.runtime.getURL("champs.js")).then(({ profilComplet }) => {
      const profil = profilComplet(cv, reponses);
      if (!profil.email && !profil.nomComplet) return;
      chrome.storage.local.set({ nuvi_profil: profil });
    }).catch(() => { /* module unreachable: the filler simply has nothing */ });
  } catch { /* unreadable storage: nothing to carry */ }
}

(() => {
  const KEY = "nuvi_captured_job";
  porterLeProfil();
  // The CV changes while the person works; the profile follows without
  // asking them to press anything.
  window.addEventListener("focus", porterLeProfil);
  setInterval(porterLeProfil, 60000);
  try {
    chrome.storage.local.get([KEY], (data) => {
      const job = data && data[KEY];
      if (!job) return;
      chrome.storage.local.remove(KEY);
      try {
        localStorage.setItem("cvf_incoming_job", JSON.stringify(job));
        window.dispatchEvent(new CustomEvent("nuvi:job-captured", { detail: job }));
      } catch { /* stockage indisponible : l'application ne recevra rien */ }
    });
  } catch { /* hors extension */ }
})();
