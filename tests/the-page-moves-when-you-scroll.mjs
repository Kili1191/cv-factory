// La vitrine bouge quand on la fait defiler, et elle se tait si on le demande.
//
// CE QUE CE TEST EMPECHE
//
// La motion de cette page ne tient a aucune bibliotheque : elle est ecrite en
// CSS natif, avec animation-timeline. C'est sa force - rien a telecharger,
// rien a executer avant le premier pixel - et sa fragilite : une regle
// deplacee, un @supports mal ferme, un selecteur renomme, et il ne reste
// qu'une page qui defile. Rien ne casse, rien ne s'affiche en rouge, la page
// est simplement morte.
//
// L'etat a ete etabli en mesurant, pas en lisant. Sur 5605 px de vitrine :
// 43 animations vivantes, dont 12 seulement pilotees par le defilement, et
// onze de ces douze appartenaient a la meme section. Le reste de la page
// n'avait qu'un geste, un fondu-montee, applique partout. Les titres qui
// s'assemblent mot a mot ont porte ce chiffre a 59.
//
// CE QU'IL TIENT
//
//   1. Le defilement pilote vraiment. On compte les animations dont la
//      timeline est une ViewTimeline, pas les animations tout court : une
//      animation sur horloge se declenche seule et ne prouve rien.
//   2. Les titres sont decoupes en mots, chacun portant sa position. Sans ca
//      ils se remettraient a monter d'un bloc sans que personne le voie.
//   3. prefers-reduced-motion est respecte. Ce n'est pas une option : le
//      mouvement declenche des nausees chez une partie des gens, et une page
//      qui l'ignore leur est physiquement penible.

import { startServer, stopServer, launchBrowser, BASE_URL } from "./lib/harness.mjs";

// Mesure du jour : 59 animations pilotees par le defilement. On exige
// nettement moins, parce que ce test garde une PRESENCE, pas un chiffre : il
// doit rougir quand la motion disparait, pas quand on retire une section.
const MINIMUM = 20;

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL + "/", { waitUntil: "load" });
    await page.waitForTimeout(1200);

    const vu = await page.evaluate(() => {
      const anims = document.getAnimations();
      const parTimeline = (nom) => anims.filter(
        (a) => a.timeline && a.timeline.constructor.name === nom).length;
      const titres = [...document.querySelectorAll(".nuvi-titre-geant")];
      return {
        supporte: CSS.supports("animation-timeline: view()"),
        defilement: parTimeline("ViewTimeline"),
        horloge: parTimeline("DocumentTimeline"),
        titresDecoupes: titres.filter((h) => h.querySelector(".nuvi-mots > span")).length,
        titres: titres.length,
        // Un mot vide trahirait un decoupage casse ; le titre disparaitrait.
        motsVides: [...document.querySelectorAll(".nuvi-mots > span")]
          .filter((x) => !x.textContent.trim()).length,
      };
    });

    // LE NAVIGATEUR DOIT SAVOIR FAIRE, SINON ON NE VERIFIE RIEN
    if (!vu.supporte) {
      failures.push(
        "ce navigateur ne connait pas animation-timeline : le test ne peut "
        + "rien affirmer sur la motion de la page. Il ne doit pas passer au "
        + "vert pour autant."
      );
    } else {
      if (vu.defilement < MINIMUM) {
        failures.push(
          "seulement " + vu.defilement + " animation(s) pilotee(s) par le "
          + "defilement, il en faut au moins " + MINIMUM + ". La page a "
          + "probablement perdu sa motion sans rien casser d'autre : elle "
          + "defile, elle ne bouge plus."
        );
      }
      if (vu.titresDecoupes < 4) {
        failures.push(
          "seuls " + vu.titresDecoupes + " titres sur " + vu.titres + " sont "
          + "decoupes en mots. Les autres remontent d'un bloc."
        );
      }
    }
    if (vu.motsVides) {
      failures.push(
        vu.motsVides + " mot(s) vide(s) dans les titres : le decoupage est "
        + "casse et une partie du titre a disparu."
      );
    }
    await ctx.close();

    // --- ET ELLE SE TAIT QUAND ON LE DEMANDE ---------------------------
    const calme = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    const p2 = await calme.newPage();
    await p2.goto(BASE_URL + "/", { waitUntil: "load" });
    await p2.waitForTimeout(900);
    const bouge = await p2.evaluate(() => {
      const mots = [...document.querySelectorAll(".nuvi-mots > span")];
      const anime = mots.filter((m) => getComputedStyle(m).animationName !== "none").length;
      // Et le texte reste lisible : c'est la regle de repli du fichier, l'etat
      // par defaut est VISIBLE.
      const invisibles = mots.filter((m) => Number(getComputedStyle(m).opacity) < 0.5).length;
      return { mots: mots.length, anime, invisibles };
    });
    if (bouge.mots && bouge.anime) {
      failures.push(
        bouge.anime + " mot(s) de titre s'animent encore alors que la personne "
        + "a demande moins de mouvement. Ce reglage n'est pas une preference "
        + "esthetique."
      );
    }
    if (bouge.invisibles) {
      failures.push(
        bouge.invisibles + " mot(s) restent invisibles en mouvement reduit : "
        + "l'animation coupee, le titre doit s'afficher entier, pas disparaitre."
      );
    }
    await calme.close();
  } catch (err) {
    failures.push("le test a plante : " + (err && err.message ? err.message : String(err)));
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
