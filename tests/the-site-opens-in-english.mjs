// Le site s'ouvre en anglais, et le francais reste a un clic.
//
// POURQUOI CE TEST EXISTE
//
// Nuvi vise le marche britannique ET le marche francais. Ouvrir en francais
// pour un Londonien lui demande de trouver un reglage avant de comprendre ce
// qu'il regarde, et la plupart ferment l'onglet avant d'y arriver.
//
// C'est un choix produit, pas un detail : il doit donc etre garde. Une valeur
// par defaut se change en un caractere, dans cinq fichiers differents, et rien
// ne le signale - la page s'affiche, simplement dans la mauvaise langue.
//
// CE QU'IL VERIFIE, ET DANS CET ORDRE
//
//   1. Un visiteur neuf voit l'anglais.
//   2. Le document DECLARE l'anglais. C'est ce que lisent Google et les
//      lecteurs d'ecran ; un site anglais qui se declare francais est mal
//      indexe et mal lu a voix haute.
//   3. Quelqu'un qui a deja choisi le francais le garde. C'est le point le
//      plus important : une valeur par defaut ne doit jamais ecraser un choix.

import { startServer, stopServer, launchBrowser, BASE_URL } from "./lib/harness.mjs";

// Des mots qui n'existent que dans une seule des deux langues, et qui sont
// affiches sur l'ecran d'arrivee.
const ANGLAIS = /Here's what I do|See the difference|I already have a CV/i;
const FRANCAIS = /Voila ce que je fais|Regarde la difference|J'ai deja un CV/i;

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    // --- 1. Visiteur neuf ---------------------------------------------
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3600);

      const vu = await page.evaluate(() => ({
        lang: document.documentElement.lang,
        titre: document.title,
        texte: (document.body.innerText || "").replace(/\s+/g, " "),
      }));

      if (!ANGLAIS.test(vu.texte)) {
        failures.push(
          "un visiteur neuf ne voit pas l'anglais. Debut de l'ecran : "
          + `"${vu.texte.slice(0, 80)}"`
        );
      }
      if (FRANCAIS.test(vu.texte)) {
        failures.push("un visiteur neuf voit du francais sur l'ecran d'arrivee");
      }
      if (vu.lang !== "en") {
        failures.push(
          `le document se declare lang="${vu.lang}" alors qu'il affiche l'anglais. `
          + "Google l'indexera comme francais et les lecteurs d'ecran le liront "
          + "avec le mauvais accent."
        );
      }
      if (/le CV qui passe/i.test(vu.titre)) {
        failures.push(`le titre de l'onglet est reste en francais : "${vu.titre}"`);
      }
      await ctx.close();
    }

    // --- 2. Un choix deja fait n'est jamais ecrase ---------------------
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => localStorage.setItem("cvf_c", JSON.stringify("fr")));
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3600);

      const texte = await page.evaluate(() =>
        (document.body.innerText || "").replace(/\s+/g, " "));

      if (!FRANCAIS.test(texte)) {
        failures.push(
          "quelqu'un qui avait choisi le francais ne le retrouve pas : la valeur "
          + "par defaut a ecrase son choix. Debut de l'ecran : "
          + `"${texte.slice(0, 80)}"`
        );
      }
      await ctx.close();
    }

    if (!failures.length) {
      console.log("      anglais pour un visiteur neuf, document declare en, choix francais respecte");
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
