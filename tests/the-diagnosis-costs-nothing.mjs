// LE DIAGNOSTIC NE COUTE RIEN, ET NE BOUGE PAS
//
// Les huit axes du tableau de bord etaient notes par le modele. Trois defauts,
// dont un grave :
//
//   - Le meme CV n'obtenait pas deux fois la meme note. Un score qui bouge
//     alors que rien n'a change n'est pas un score, c'est un tirage - et
//     l'utilisateur qui rouvre le panneau apres avoir corrige une puce ne
//     sait plus si la variation vient de sa correction ou du hasard.
//   - Chaque ouverture coutait un appel et plusieurs secondes.
//   - Sans cle d'API, la fonctionnalite n'existait pas du tout.
//
// Tout ce que le tableau annonce se COMPTE. Ce test exige donc les trois
// proprietes qui n'appartiennent qu'a une mesure : rien n'est demande au
// reseau, le meme CV rend le meme chiffre, et il le rend sans cle.
//
// Si quelqu'un rebranche un appel d'IA sur ce panneau, ce test le dit.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

async function ouvrirLeScore(page) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .find((x) => /Score recruteur|Recruiter score/i.test(x.textContent || ""));
    if (b) b.click();
  });
  await page.waitForTimeout(600);
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();

    // On compte les appels au reseau vers l'IA, quel que soit le chemin pris.
    const appels = [];
    await page.route("**/api/claude**", (route) => {
      appels.push(route.request().url());
      return route.abort();
    });

    await seedApp(page, SAMPLE_CV, { locale: "fr" });

    // Le panneau se pilote par le meme point d'entree que le tutoriel.
    const dispo = await page.evaluate(() => typeof window.__nuviOpenModal === "function");
    if (dispo) {
      await page.evaluate(() => window.__nuviOpenModal("open-score"));
    } else {
      await ouvrirLeScore(page);
    }
    await page.waitForTimeout(1200);

    // --- 1. Le rapport est bien la ------------------------------------
    const axes = ["title", "bullets", "ats", "relevance",
      "credibility", "design", "readability", "differentiation"];
    const rapport = await page.evaluate(() => (window.__nuviDernierDiagnostic
      ? { ok: true, ids: window.__nuviDernierDiagnostic.scores.map((s) => s.id) }
      : { ok: false, ids: [] }));

    if (!rapport.ok) {
      failures.push(
        "le diagnostic n'est pas expose pour la verification. Sans lui, ce test "
        + "ne peut pas distinguer un rapport calcule d'un panneau vide."
      );
    } else {
      const manquants = axes.filter((a) => !rapport.ids.includes(a));
      if (manquants.length) {
        failures.push(
          "le rapport ne couvre plus " + manquants.join(", ") + ". Le tableau "
          + "annonce huit axes : un axe absent est une note que personne ne rend."
        );
      }
    }

    // --- 2. Rien n'a ete demande au reseau ----------------------------
    if (appels.length) {
      failures.push(
        "le tableau de bord a appele l'IA " + appels.length + " fois alors que "
        + "tout ce qu'il annonce se compte. C'est le cout et l'attente qu'on "
        + "venait de supprimer."
      );
    }

    // --- 3. Le meme CV rend le meme chiffre ---------------------------
    const a = await page.evaluate(() => window.__nuviDernierDiagnostic
      && window.__nuviDernierDiagnostic.global_score);
    await page.evaluate(() => window.__nuviRelancerDiagnostic
      && window.__nuviRelancerDiagnostic());
    await page.waitForTimeout(400);
    const b = await page.evaluate(() => window.__nuviDernierDiagnostic
      && window.__nuviDernierDiagnostic.global_score);

    if (typeof a !== "number" || a !== b) {
      failures.push(
        "deux diagnostics du meme CV rendent " + a + " puis " + b + ". Un score "
        + "qui bouge sans que le CV ait change ne se corrige pas : l'utilisateur "
        + "ne sait plus si la variation vient de lui ou du tirage."
      );
    }

    // --- 4. Chaque note porte sa preuve -------------------------------
    const sansPreuve = await page.evaluate(() => {
      const d = window.__nuviDernierDiagnostic;
      if (!d) return ["(aucun rapport)"];
      return d.scores.filter((s) => !s.fait || typeof s.fait !== "object")
        .map((s) => s.id);
    });
    if (sansPreuve.length) {
      failures.push(
        "ces axes rendent une note sans la mesure qui la justifie : "
        + sansPreuve.join(", ") + ". Une note sans preuve ne se corrige pas "
        + "mieux qu'une note tiree au hasard."
      );
    }

    if (!failures.length) {
      const d = await page.evaluate(() => window.__nuviDernierDiagnostic);
      console.log(
        "      8 axes mesures sur place, " + d.global_score + "/100, "
        + "zero appel reseau, deux passages identiques, chaque note avec sa preuve"
      );
    }
    await ctx.close();
  } catch (err) {
    failures.push("le test a plante : " + (err && err.message ? err.message : String(err)));
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
