// Injected after the fields are filled, with the freshly printed CV. It
// attaches and stops: the person still presses the button themselves.
(async () => {
  try {
    const { boitesACv, attacherLeCv } = await import(chrome.runtime.getURL("champs.js"));
    const { nuvi_pdf: pdf } = await chrome.storage.local.get(["nuvi_pdf"]);
    if (!pdf || !pdf.base64) return { erreur: "aucun fichier" };
    const brut = atob(pdf.base64);
    const octets = new Uint8Array(brut.length);
    for (let i = 0; i < brut.length; i += 1) octets[i] = brut.charCodeAt(i);
    const boites = boitesACv(document);
    let joints = 0;
    for (const el of boites) {
      if (attacherLeCv(el, octets, pdf.nom || "CV.pdf")) {
        joints += 1;
        el.setAttribute("data-nuvi-rempli", "cv");
        try { el.style.outline = "2px solid #5b3df5"; } catch { /* styles refused */ }
      }
    }
    return { joints };
  } catch (e) {
    return { erreur: String((e && e.message) || e) };
  }
})();
