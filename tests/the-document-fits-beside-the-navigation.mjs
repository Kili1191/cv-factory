// The document fits next to the navigation, at every desktop width.
//
// HOW THIS BROKE, AND WHY NOTHING CAUGHT IT
//
// The sidebar used to be a 56px rail of mute icons, opening on hover. The
// rebuild made it 244px and permanent, which is what makes it readable - and
// it takes 188px out of the work area on every screen, permanently.
//
// At 1024 the sheet then ran to x=1062 inside an area ending at 1024: 38px of
// document cut off, and the work area scrolling sideways. 1024 is an iPad in
// landscape, a small laptop, a window at half a screen. Not a corner case.
//
// The scale factor had a floor of 1 - "never shrink, scrolling beats an
// illegible CV" - written when the rail was 56px and a 1024 window left 968px
// for a 794px sheet. The case could not arise. Widening the bar made the old
// rule produce the very thing it was written to avoid.
//
// WHAT THIS TEST HOLDS
//
// At every desktop width: the sheet stays inside its area, and nothing
// scrolls sideways. It is a test about the RELATIONSHIP between the two, so it
// keeps holding whatever either one's width becomes - which is the point,
// since it is a change to one of them that broke the other.
//
// It also holds the floor from the other side: the sheet must not be shrunk
// into unreadability to make it fit. Both halves matter, and only asserting
// one of them invites the wrong fix.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

// 1024 est la largeur qui a casse. Les autres encadrent : juste au-dessus, la
// zone confortable, et le grand ecran.
const LARGEURS = [1024, 1100, 1280, 1600];

// En dessous, on ne lit plus un CV, on devine sa forme. C'est le plancher que
// le produit s'autorise, et le test le tient : si un jour la barre s'elargit
// encore, il vaut mieux echouer ici que livrer un timbre-poste.
const FACTEUR_MIN = 0.7;

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    for (const w of LARGEURS) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
      const page = await ctx.newPage();
      await seedApp(page, SAMPLE_CV, { locale: "en" });
      await page.waitForTimeout(1100);

      const vu = await page.evaluate(() => {
        const cv = document.querySelector('[data-cvf="cv"]');
        const aside = document.querySelector("aside");
        if (!cv) return null;
        // La zone de travail : le parent qui defile, deux crans au-dessus de
        // la feuille (la boite intermediaire reserve la taille apres zoom).
        const zone = cv.parentElement.parentElement;
        const rc = cv.getBoundingClientRect();
        const rz = zone.getBoundingClientRect();
        return {
          cvDroite: Math.round(rc.right), cvGauche: Math.round(rc.left),
          zoneDroite: Math.round(rz.right), zoneGauche: Math.round(rz.left),
          rail: aside ? Math.round(aside.getBoundingClientRect().width) : 0,
          // offsetWidth ignore le transform : le rapport des deux donne le
          // facteur d'echelle applique.
          facteur: cv.offsetWidth ? rc.width / cv.offsetWidth : 1,
          defileLateral: zone.scrollWidth > zone.clientWidth + 1,
          pageDefile: document.documentElement.scrollWidth
            > document.documentElement.clientWidth + 1,
          mobile: window.innerWidth < 900,
        };
      });

      if (!vu) {
        failures.push(w + "px : le document est introuvable.");
      } else if (!vu.mobile) {
        if (vu.cvDroite > vu.zoneDroite + 1) {
          failures.push(
            w + "px : le document deborde de " + (vu.cvDroite - vu.zoneDroite)
            + "px hors de sa zone (feuille jusqu'a " + vu.cvDroite + ", zone "
            + "jusqu'a " + vu.zoneDroite + "). Avec une barre de " + vu.rail
            + "px, il ne reste pas la place de l'afficher en entier."
          );
        }
        if (vu.cvGauche < vu.zoneGauche - 1) {
          failures.push(
            w + "px : le document deborde a gauche (" + vu.cvGauche + " contre "
            + vu.zoneGauche + ")."
          );
        }
        if (vu.defileLateral) {
          failures.push(
            w + "px : la zone de travail defile lateralement. On lit son CV en "
            + "poussant la page de gauche a droite."
          );
        }
        // ET PAS EN LE REDUISANT A RIEN
        if (vu.facteur < FACTEUR_MIN) {
          failures.push(
            w + "px : le document est reduit a " + vu.facteur.toFixed(2)
            + ", sous le plancher de " + FACTEUR_MIN + ". Le faire tenir en le "
            + "rendant illisible n'est pas le faire tenir."
          );
        }
      }
      if (vu && vu.pageDefile) {
        failures.push(w + "px : la page entiere defile lateralement.");
      }

      await ctx.close();
    }
  } catch (err) {
    failures.push("le test a plante : " + (err && err.message ? err.message : String(err)));
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
