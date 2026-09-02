// You can see where the page ends, before you send it.
//
// The export cuts at 1123px: an A4 at 96 points per inch, and the same value
// cvH already uses to clamp the phone preview. A CV that runs sixty pixels
// past it therefore leaves as TWO pages, the second carrying three lines and
// a lot of white.
//
// Recruiters decide things on that. And nothing on screen said a word: you
// discovered the second page by opening the PDF, which is to say after
// sending it.
//
// WHAT THIS TEST HOLDS
//
// Both directions, because only one of them is the useful half:
//
//   1. A CV that overflows shows the boundary, in the right place. A marker
//      that never appears is the defect this feature exists to remove.
//   2. A CV that fits shows NOTHING. This is the half that would rot first:
//      a dashed line across every document, permanently, teaches people to
//      ignore it, and then it is not there when it matters.
//
// The position is asserted against the number the exporter actually uses,
// not against a screenshot. A marker drawn in the wrong place is worse than
// no marker: it would send someone trimming a CV that already fits.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

const PAGE = 1123;

// Un CV franchement trop long. Premiere version : neuf postes, qui donnaient
// 1064px de haut - sous la page, donc le test ne verifiait rien. Il l'a dit
// lui-meme au lieu de passer, ce qui est la seule raison pour laquelle on le
// sait. La marge est maintenant large : il ne s'agit pas de friser 1123px,
// il s'agit de le depasser franchement quelle que soit la police disponible.
const LONG = {
  name: "Sam Ortiz", title: "Chef de rang", email: "sam@exemple.com",
  phone: "0600000000", location: "Lyon",
  summary: "Chef de rang, dix ans de salle en brasserie et en restaurant.",
  experience: Array.from({ length: 16 }, (_, i) => ({
    role: "Chef de rang", company: "Brasserie " + (i + 1), location: "Lyon",
    period: (2006 + i) + " - " + (2007 + i),
    bullets: [
      "Service de 80 couverts en autonomie sur un rang de six tables.",
      "Encaissement, cloture de caisse et remise des especes chaque soir.",
      "Formation des nouveaux arrivants sur la carte et le service au gueridon.",
    ],
  })),
  education: [{ degree: "CAP Restaurant", school: "CFA Lyon", period: "2004 - 2006" }],
  skills: ["Service en salle", "Encaissement", "HACCP", "Gueridon"],
  languages: [{ name: "Francais", level: "Natif" }],
  certifications: [],
};

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const regarder = async (cv) => {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      await seedApp(page, cv, { locale: "en" });
      await page.waitForTimeout(1500);
      const r = await page.evaluate(() => {
        const cvEl = document.querySelector('[data-cvf="cv"]');
        const traits = [...document.querySelectorAll("[data-nuvi-coupe-page]")].map((el) => ({
          n: Number(el.getAttribute("data-nuvi-coupe-page")),
          top: Math.round(el.getBoundingClientRect().top),
          txt: (el.innerText || "").trim(),
        }));
        if (!cvEl) return { hauteur: 0, cvTop: 0, echelle: 1, traits };
        // LA HAUTEUR QUI COMPTE EST CELLE D'AVANT L'AGRANDISSEMENT
        //
        // L'apercu grossit le CV jusqu'a 1,35 pour remplir la zone, et
        // getBoundingClientRect inclut ce transform : un CV qui tient sur une
        // page se mesurait donc a 1437px et paraissait deborder. L'export,
        // lui, travaille sur le document non transforme. offsetHeight ignore
        // le transform, c'est donc lui qui dit la verite - la meme mesure que
        // celle dont le produit se sert pour placer le trait.
        const rect = cvEl.getBoundingClientRect();
        return {
          hauteur: cvEl.offsetHeight,
          rendue: Math.round(rect.height),
          echelle: cvEl.offsetHeight ? rect.height / cvEl.offsetHeight : 1,
          cvTop: Math.round(rect.top),
          traits,
        };
      });
      await ctx.close();
      return r;
    };

    // --- 1. Un CV qui deborde le dit ---------------------------------
    const long = await regarder(LONG);
    if (long.hauteur <= PAGE) {
      failures.push(
        "le CV de controle ne depasse pas une page (" + long.hauteur + "px) : "
        + "ce test ne verifie donc pas ce qu'il pretend. Il faut l'allonger."
      );
    } else if (!long.traits.length) {
      failures.push(
        "un CV de " + long.hauteur + "px, soit plus d'une page A4 de " + PAGE
        + "px, n'affiche aucune limite de page. La deuxieme page se decouvre "
        + "en ouvrant le PDF, c'est a dire apres l'envoi."
      );
    } else {
      // LA POSITION DOIT ETRE CELLE QUE L'EXPORT UTILISE
      const attendu = Math.round(long.cvTop + PAGE * long.echelle);
      const vu = long.traits[0].top;
      if (Math.abs(vu - attendu) > 6) {
        failures.push(
          "la limite de page est tracee a " + vu + "px alors que l'export coupe "
          + "a " + attendu + "px. Un trait au mauvais endroit est pire que pas "
          + "de trait : il envoie couper un CV qui tenait deja."
        );
      }
      if (!/page/i.test(long.traits[0].txt)) {
        failures.push(
          'la limite ne dit pas ce qu\'elle est : "' + long.traits[0].txt
          + '". Un trait pointille sans mot ne s\'interprete pas.'
        );
      }
      // La langue suit l'interface, ici l'anglais.
      if (/Fin de la page/i.test(long.traits[0].txt)) {
        failures.push('la limite parle francais dans une interface anglaise : "'
          + long.traits[0].txt + '"');
      }
    }

    // --- 2. Un CV qui tient ne dit rien ------------------------------
    //
    // C'est la moitie qui pourrirait la premiere. Un trait en travers de tous
    // les documents, en permanence, apprend a l'ignorer - et il n'est alors
    // plus la le jour ou il compte.
    const court = await regarder(SAMPLE_CV);
    if (court.hauteur > PAGE) {
      failures.push(
        "le CV court fait " + court.hauteur + "px et depasse deja une page : "
        + "ce controle ne verifie plus le cas ou rien ne doit s'afficher."
      );
    } else if (court.traits.length) {
      failures.push(
        "un CV de " + court.hauteur + "px, qui tient largement sur une page, "
        + "affiche quand meme " + court.traits.length + " limite(s) de page. Un "
        + "avertissement permanent finit par ne plus rien vouloir dire."
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
