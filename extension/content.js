// Injecte dans la page consultee pour y relever l'annonce.
// Ne fait que lire : aucune modification de la page visitee.
(() => {
  const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')]
    .map(s => s.textContent || "");

  const meta = {};
  for (const el of document.querySelectorAll("meta[property], meta[name]")) {
    const key = el.getAttribute("property") || el.getAttribute("name");
    if (key && !meta[key]) meta[key] = el.getAttribute("content") || "";
  }
  meta.title = document.title || "";

  // Le bloc de texte le plus dense, pour le repli. main ou article d'abord :
  // ils excluent deja la navigation et le pied de page.
  const host = document.querySelector("main, article, [role='main']") || document.body;
  const bodyText = (host.innerText || "").replace(/\n{3,}/g, "\n\n").trim();

  return { jsonLd, meta, bodyText, url: location.href, host: location.host };
})();
