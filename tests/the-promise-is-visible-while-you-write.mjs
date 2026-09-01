// The promise is readable while you write, and it tells the truth.
//
// Nuvi sells one sentence: the CV has to get past the sorting robots. Until
// now that sentence was verifiable nowhere without opening a window and
// launching an audit. Someone editing their CV for twenty minutes had no sign
// that their work was going the right way, and no sign when a change had just
// broken the reading.
//
// The six parser profiles run locally, with no network and no model, on the
// text the product really emits. Cheap enough to recompute on every keystroke,
// so cheap enough to stay on screen permanently.
//
// WHAT THIS TEST IS REALLY FOR
//
// A badge that always reads "6/6" would be worse than no badge at all: it
// would be the product's central promise, displayed as a certainty, backed by
// nothing. That is the exact failure this repo has already shipped once, when
// a screen claimed the export was checked by three real engines and the module
// doing the checking was imported only by tests.
//
// So the assertion is not "a badge appears". It is that the number MOVES: a CV
// the parsers lose must not show the same score as one they all read.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

const SELECT = "[data-nuvi-ats-entete]";

// Un CV qu'aucun analyseur ne peut ranger : pas d'employeur, pas de dates, pas
// de rubrique reconnaissable. C'est le cas reel d'un import rate, pas un cas
// theorique - le produit en a deja produit.
const CASSE = {
  name: "Sam Ortiz", title: "", email: "", phone: "", location: "",
  summary: "",
  experience: [{ role: "", company: "", location: "", period: "", bullets: [] }],
  education: [], skills: [], languages: [], certifications: [],
};

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const lire = async (cv) => {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      await seedApp(page, cv, { locale: "en" });
      await page.waitForTimeout(800);
      const n = await page.locator(SELECT).count();
      const valeur = n ? await page.locator(SELECT).first().getAttribute("data-nuvi-ats-entete") : null;
      const texte = n ? (await page.locator(SELECT).first().innerText()).trim() : "";
      await ctx.close();
      return { present: n > 0, valeur, texte };
    };

    const bon = await lire(SAMPLE_CV);
    if (!bon.present) {
      failures.push(
        "le compte d'analyseurs n'apparait pas dans la bande du haut. La "
        + "promesse du produit reste invisible pendant qu'on edite."
      );
    } else {
      if (!/\d+\s*\/\s*\d+/.test(bon.texte)) {
        failures.push('la pastille n\'affiche pas un compte lisible : "' + bon.texte + '"');
      }
      // Le libelle doit etre dans la langue choisie : la bande est en anglais.
      if (/analyseur/i.test(bon.texte)) {
        failures.push('la pastille parle francais dans une interface anglaise : "' + bon.texte + '"');
      }
    }

    const casse = await lire(CASSE);

    // LE CHIFFRE DOIT BOUGER
    if (bon.present && casse.present && bon.valeur === casse.valeur) {
      failures.push(
        "un CV sans employeur, sans dates et sans rubrique affiche le meme "
        + "score (" + casse.valeur + ") qu'un CV complet. La pastille est donc "
        + "decorative : elle affirme la promesse centrale du produit sans rien "
        + "mesurer."
      );
    }
    if (casse.present && bon.present) {
      const n = (v) => Number(String(v || "").split("/")[0]) || 0;
      if (n(casse.valeur) >= n(bon.valeur)) {
        failures.push(
          "le CV casse marque " + casse.valeur + " et le CV complet "
          + bon.valeur + " : le compte ne descend pas quand la lecture casse."
        );
      }
    }

    // Sur un CV vide, il n'y a rien a mesurer : mieux vaut se taire que
    // d'afficher un zero qui ressemble a un echec.
    const vide = await lire({});
    if (vide.present) {
      failures.push(
        "un CV vide affiche quand meme un score d'analyseurs (" + vide.valeur
        + "). Il n'y a rien a lire : c'est un chiffre sur du vide."
      );
    }
  } catch (err) {
    failures.push("le test a plante : " + (err && err.message ? err.message : String(err)));
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
