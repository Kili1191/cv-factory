// Pont, cote thenuvi.com.
//
// L'extension range l'annonce, ouvre Nuvi, et ce script la depose dans la
// page. C'est ce qui evite le detour reproche aux extensions concurrentes :
// celle de Jobscan capture l'annonce puis renvoie l'utilisateur sur son site,
// ou il doit tout reprendre a la main.
//
// L'annonce est consommee une seule fois : sans cela, chaque ouverture de
// Nuvi rejouerait la derniere offre capturee.
(() => {
  const KEY = "nuvi_captured_job";
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
