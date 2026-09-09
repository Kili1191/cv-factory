// Injected into the page the person is looking at, only when they press
// the button in the popup. It fills and stops: there is no code here that
// submits anything.
(async () => {
  try {
    const { remplirLeDocument } = await import(chrome.runtime.getURL("champs.js"));
    const { nuvi_profil: profil } = await chrome.storage.local.get(["nuvi_profil"]);
    if (!profil || !profil.email) return { erreur: "aucun profil" };
    return { remplis: remplirLeDocument(document, profil) };
  } catch (e) {
    return { erreur: String((e && e.message) || e) };
  }
})();
