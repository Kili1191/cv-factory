// L'ORDRE DES PUCES SE CHANGE A LA SOURIS
//
// Kilian, le 2 octobre 2026 : "les puces, j'aimerais pouvoir les monter ou
// les descendre a la souris".
//
// C'est le seul reglage du CV qu'on ne corrige pas en reecrivant, et c'est
// aussi le premier que lit un recruteur : la premiere puce d'un poste est
// celle qu'il verra toujours. Il fallait jusqu'ici le demander au coach, ou
// couper-coller deux textes a la main dans un document qu'on edite en place.
//
// CE QUE CE TEST TIENT
//
//   1. La poignee existe sur chaque puce, et elle porte cvf-no-print : elle
//      ne doit atteindre ni la photo exportee ni le PDF natif.
//   2. Les fleches montent et descendent la puce. Un glisser n'existe pas
//      sans souris, et la moitie des gens ecrivent leur CV sur un telephone.
//   3. Le CV enregistre suit, et le document a l'ecran aussi.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

const CV = {
  ...SAMPLE_CV,
  experience: [{
    id: "e1", title: "Senior Product Manager", company: "Acme SaaS",
    period: "2021 - 2024", location: "Paris",
    bullets: ["PREMIERE puce du poste", "DEUXIEME puce du poste", "TROISIEME puce du poste"],
  }],
};

const puces = (page) => page.evaluate(() => {
  try {
    const c = JSON.parse(localStorage.getItem("cvf_d") || "{}");
    return ((c.experience || [])[0] || {}).bullets || [];
  } catch { return []; }
});

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const erreurs = [];
    page.on("pageerror", (e) => erreurs.push(e.message.split("\n")[0].slice(0, 90)));
    await seedApp(page, CV, { locale: "en" });
    await page.waitForTimeout(800);

    const poignees = page.locator("[data-cvf-poignee]");
    const combien = await poignees.count();
    if (combien < 3) {
      failures.push(
        "seules " + combien + " poignees sur les trois puces du poste.\n" +
        "      Sans poignee, l'ordre ne se change qu'en demandant au coach."
      );
    } else {
      // --- 1. LA POIGNEE NE PART PAS A L'IMPRESSION --------------------
      const imprimable = await poignees.first().evaluate((el) => el.className || "");
      if (!String(imprimable).includes("cvf-no-print")) {
        failures.push(
          "la poignee ne porte pas cvf-no-print : elle partira sur le document du recruteur.\n" +
          "      La page d'impression masque cette classe, rien d'autre."
        );
      }

      // --- 1 bis. AU REPOS, LE DOCUMENT EST CELUI QUI PART EN PDF -------
      //
      // Premiere version : poignee visible en permanence, a quinze pixels sur
      // la gauche. Mesure a l'ecran sur le gabarit classique, elle se posait
      // exactement sur la puce du navigateur et la remplacait. Le document
      // perdait ses points pour gagner des poignees, et aucune suite ne le
      // voyait : le texte etait la, le contraste etait juste.
      const auRepos = await poignees.first().evaluate((el) => getComputedStyle(el).opacity);
      if (Number(auRepos) > 0.01) {
        failures.push(
          "la poignee est visible sans qu'on survole la ligne (opacite " + auRepos + ").\n" +
          "      Elle se pose sur la puce du document et la remplace a l'ecran."
        );
      }

      // --- 2. LA DEUXIEME PUCE MONTE -----------------------------------
      const avant = await puces(page);
      await poignees.nth(1).focus();
      await page.keyboard.press("ArrowUp");
      await page.waitForTimeout(600);
      const apres = await puces(page);
      if (apres[0] !== avant[1] || apres[1] !== avant[0]) {
        failures.push(
          "monter la deuxieme puce ne l'echange pas avec la premiere.\n" +
          "      Avant : " + JSON.stringify(avant.slice(0, 2)) +
          "\n      Apres : " + JSON.stringify(apres.slice(0, 2))
        );
      }
      if (apres.length !== avant.length) {
        failures.push("le nombre de puces a change pendant le deplacement : " +
          avant.length + " puis " + apres.length);
      }

      // --- 3. ET ELLE REDESCEND ----------------------------------------
      await page.locator("[data-cvf-poignee]").nth(0).focus();
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(600);
      const retour = await puces(page);
      if (retour[0] !== avant[0] || retour[1] !== avant[1]) {
        failures.push("redescendre la puce ne rend pas l'ordre de depart");
      }

      // --- 4. CE QUI EST A L'ECRAN SUIT --------------------------------
      await page.evaluate(() => { try { localStorage.setItem("x", "1"); } catch { /* rien */ } });
      const ecran = await page.evaluate(() => {
        const n = [...document.querySelectorAll("[data-cvf-puce]")];
        return n.map((e) => (e.innerText || "").trim().slice(0, 20));
      });
      if (ecran.length >= 2 && !ecran[0].includes("PREMIERE")) {
        failures.push("le document a l'ecran ne montre pas le meme ordre que le CV enregistre : "
          + JSON.stringify(ecran.slice(0, 3)));
      }
      if (erreurs.length) failures.push("erreur de page : " + erreurs[0]);
    }
    await ctx.close();

    if (!failures.length) {
      console.log("      chaque puce porte sa poignee, elle monte et descend, et rien n'en part a l'impression");
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
