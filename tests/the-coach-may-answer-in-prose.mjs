// LE COACH A LE DROIT DE PARLER NORMALEMENT
//
// Il n'a pas de schema, et c'est voulu : il repond en prose quand il n'a
// rien a modifier, en JSON quand il porte des operations. Un schema
// obligerait le JSON a chaque tour et supprimerait la conversation.
//
// Le commentaire au-dessus de l'appel disait depuis toujours que les deux
// passaient, "parsed.reply si le JSON tient, le texte brut sinon". Le repli
// etait bien ecrit, une ligne plus bas, et ne s'executait jamais : parseJSON
// leve une exception sur de la prose, et elle remontait jusqu'au catch qui
// affiche T.ea.
//
// Kilian, le 2 octobre 2026, repond a une question du coach et lit :
//   Error - check API key.: Unexpected token 'C', "Commercial"... is not valid JSON
// Sa cle fonctionnait. Le coach venait de lui parler, ce qu'on lui demande
// de faire. Un commentaire qui decrit une intention que le code n'a pas est
// pire qu'un commentaire absent : il fait passer la relecture.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

const PROSE = "Commercial/Partnerships and Membership roles are the strongest fit for your "
  + "account management record. Tell me which one and I will aim the CV at it.";

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const erreurs = [];
    page.on("pageerror", (e) => erreurs.push(e.message.split("\n")[0].slice(0, 90)));
    await seedApp(page, SAMPLE_CV, { locale: "en" });

    // Le modele repond en prose, exactement comme le prompt l'autorise.
    await page.route("**/api/claude", (r) => r.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ content: [{ type: "text", text: PROSE }] }),
    }));

    await page.evaluate(() => window.__nuviOpenModal("open-coach"));
    await page.waitForTimeout(1200);
    const champ = page.locator("textarea").last();
    if (!(await champ.count())) {
      failures.push("le Coach n'offre pas de champ de saisie");
    } else {
      await champ.fill("which Chelsea department fits my record best");
      await champ.press("Enter");
      await page.waitForTimeout(4000);

      const ecran = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, " ");

      if (!ecran.includes("Commercial/Partnerships")) {
        failures.push(
          "la reponse en prose du coach n'arrive pas a l'ecran.\n" +
          "      Le repli vers le texte brut est ecrit mais parseJSON leve avant de l'atteindre."
        );
      }
      if (/is not valid JSON/i.test(ecran)) {
        failures.push(
          "l'ecran montre l'erreur de parsing JSON a la personne : \"is not valid JSON\".\n" +
          "      C'est une phrase pour un developpeur, sur un ecran de candidature."
        );
      }
      if (/check API key|cle API/i.test(ecran)) {
        failures.push(
          "une reponse en prose fait accuser la cle API.\n" +
          "      La cle est la seule chose qui n'est pas en cause : sans elle, rien ne serait revenu."
        );
      }
      if (erreurs.length) failures.push("erreur de page pendant la reponse : " + erreurs[0]);
    }
    await ctx.close();

    if (!failures.length) {
      console.log("      une reponse en prose s'affiche telle quelle, sans erreur de parsing a l'ecran");
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
