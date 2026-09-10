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
  // The page's own heading, used only when the title names the kind of page
  // ("Job Advert") instead of the job. Read here so the extension and the
  // server side reader answer the same thing on the same page.
  const titre = document.querySelector("h1");
  const h1 = titre ? (titre.textContent || "").trim() : "";

  // Le bloc de texte le plus dense, pour le repli. main ou article d'abord :
  // ils excluent deja la navigation et le pied de page.
  const host = document.querySelector("main, article, [role='main']") || document.body;
  const bodyText = (host.innerText || "").replace(/\n{3,}/g, "\n\n").trim();

  return { jsonLd, meta, bodyText, h1, url: location.href, host: location.host };
})();
