// "MET HERMES EN DEBUT DE CARRIERE ET APRES EXPERIENCE A SANDRO"
//
// Kilian, le 2 octobre 2026, dans le Coach. Reponse de Nuvi : il lui fallait
// des dates, un lieu et au moins une puce pour chacun, "since I won't invent
// employment details on your CV", et le CV n'a pas bouge.
//
// C'est la regle QUI_DECIDE a l'envers. Il venait de dire ou il avait
// travaille : c'est son materiau, pas une invention, et lui demander de le
// retaper dans une autre forme avant d'agir, c'est l'outil qui decide a sa
// place. Une periode vide est honnete et se voit dans l'editeur ; un refus
// ne se rattrape qu'en recommencant.
//
// CE QUE CE TEST PEUT PROUVER, ET CE QU'IL NE PEUT PAS
//
// Le comportement final appartient au modele, et le harnais n'a pas de cle
// API. Ce test tient donc les deux bouts qui sont a nous :
//
//   1. LA CONSIGNE QUI PART. Le prompt du coach doit porter la regle, et ne
//      doit plus offrir d'echappatoire generale ("if you need more info,
//      return empty operations"), qui etait posee juste sous le format de
//      sortie et que le modele a prise.
//   2. LA MECANIQUE QUI RECOIT. Une experience ajoutee en fin de tableau
//      avec une periode vide doit s'appliquer et s'afficher. Si le produit
//      ne savait pas porter une entree incomplete, demander au modele de
//      l'ecrire ne servirait a rien.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

const DEMANDE = "met hermes en debut de carriere et apres experience a sandro en client advisor";

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

    const envoyes = [];
    await page.route("**/api/claude", (r) => {
      let corps = {};
      try { corps = JSON.parse(r.request().postData() || "{}"); } catch { /* ignore */ }
      envoyes.push(String(corps.prompt || ""));
      // La reponse que la consigne demande desormais : on ajoute, on laisse
      // vide ce qu'on ne sait pas, on le dit.
      return r.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ content: [{ type: "text", text: JSON.stringify({
          reply: "Added Sandro at the start of your career. Dates and location are blank.",
          operations: [{ op: "add", path: "/experience/-", value: {
            title: "Client Advisor", company: "Sandro", period: "", location: "", bullets: [] } }],
        }) }] }),
      });
    });

    await page.evaluate(() => window.__nuviOpenModal("open-coach"));
    await page.waitForTimeout(1200);
    const champ = page.locator("textarea").last();
    if (!(await champ.count())) {
      failures.push("le Coach n'offre pas de champ de saisie");
    } else {
      await champ.fill(DEMANDE);
      await champ.press("Enter");
      await page.waitForTimeout(4000);

      // --- 1. LA CONSIGNE QUI PART ---------------------------------------
      const p = envoyes[0] || "";
      if (!p) {
        failures.push("le Coach n'appelle pas /api/claude quand on lui ecrit");
      } else {
        if (!/ADDING A JOB THE PERSON NAMES/.test(p)) {
          failures.push(
            "la consigne du Coach ne porte pas la regle sur l'ajout d'un emploi nomme.\n" +
            "      Sans elle il redemande des dates et ne fait rien, ce qui est le defaut du 2 octobre."
          );
        }
        if (/If you need more info before acting/i.test(p)) {
          failures.push(
            "la consigne offre de nouveau l'echappatoire generale \"If you need more info before\n" +
            "      acting, return empty operations\". Elle est posee sous le format de sortie, et c'est\n" +
            "      celle que le modele a prise plutot que QUI_DECIDE."
          );
        }
        if (!/QUI DECIDE/.test(p)) {
          failures.push("la consigne du Coach ne porte plus QUI_DECIDE");
        }
      }

      // --- 2. LA MECANIQUE QUI RECOIT ------------------------------------
      const cv = await page.evaluate(() => {
        try { return JSON.parse(localStorage.getItem("cvf_d") || "{}"); } catch { return {}; }
      });
      const ajoutee = (cv.experience || []).find((e) => e && e.company === "Sandro");
      if (!ajoutee) {
        failures.push(
          "l'operation d'ajout n'a pas atteint le CV : une experience nommee par la personne,\n" +
          "      avec une periode vide, ne s'applique pas. Demander au modele de l'ecrire ne servirait a rien."
        );
      } else if (ajoutee.period !== "") {
        failures.push("la periode vide n'a pas survecu a l'application (\"" + ajoutee.period + "\")");
      }
      if ((cv.experience || []).length !== (SAMPLE_CV.experience || []).length + 1) {
        failures.push("le nombre d'experiences n'a pas augmente de un");
      }
      if (erreurs.length) failures.push("erreur de page pendant l'ajout : " + erreurs[0]);
    }
    await ctx.close();

    if (!failures.length) {
      console.log("      la consigne porte la regle, et une experience nommee s'ajoute avec ses champs vides");
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
