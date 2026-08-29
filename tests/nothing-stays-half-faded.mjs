// Une section arrivee a l'ecran est entierement opaque.
//
// POURQUOI CE TEST EXISTE
//
// Le titre "Les metiers pour qui personne n'ecrit de modele" s'affichait
// gris, sur une page ou le titre juste en dessous s'affichait noir. Les deux
// portaient exactement le meme style en ligne, et aucun des deux ne fixait de
// couleur. Lire le code ne pouvait donc pas donner la reponse : mesuree, la
// couleur du titre valait rgb(10,10,10), du noir franc. C'est la section
// entiere qui restait a 0.52 d'opacite.
//
// La cause n'etait pas dans la section. La vitrine portait overflow-x:
// hidden, pour couper le document qui deborde volontairement par la droite.
// La specification ramene alors l'autre axe a auto, et ce conteneur devient
// defilant. Or animation-timeline: view() se mesure contre le conteneur de
// defilement le plus proche : les quatre sections lisaient leur progression
// sur une regle qui ne bouge jamais, et restaient figees a mi-animation,
// d'autant plus pales qu'elles etaient basses dans la page. 1, 1, 0.86, 0.52.
//
// Rien ne signalait la panne. Le build passait, le lint passait, la page
// s'affichait, les animations existaient dans la feuille de style. Le seul
// symptome etait du texte pale, que l'on peut prendre pour un choix de
// design - c'est d'ailleurs ce qui est arrive, la page est restee ainsi en
// ligne jusqu'a ce qu'un visiteur demande pourquoi cette partie etait grise.
//
// CE QU'IL VERIFIE
//
//   1. Chaque section a revelation, amenee en position de lecture, atteint
//      une opacite pleine. C'est l'affirmation qui compte : du texte pose
//      devant les yeux se lit a fond de contraste.
//   2. Aucun ancetre d'une section a revelation n'est un conteneur de
//      defilement immobile. C'est la cause exacte du defaut, et elle peut
//      revenir par une autre ligne d'overflow que celle qui l'a introduite.

import { startServer, stopServer, launchBrowser, BASE_URL } from "./lib/harness.mjs";

const ECRANS = [
  { nom: "ordinateur", viewport: { width: 1440, height: 900 } },
  { nom: "telephone", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
];

// Une section revelee au defilement n'est pleine qu'apres avoir defile. On
// l'amene donc en position de lecture - haut de section un peu sous le haut
// de l'ecran - avant de mesurer, comme le ferait quelqu'un qui la lit.
const PLEIN = 0.99;

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    for (const ecran of ECRANS) {
      const { nom, ...opts } = ecran;
      const ctx = await browser.newContext(opts);
      const page = await ctx.newPage();
      await page.goto(BASE_URL + "/", { waitUntil: "networkidle" });
      await page.waitForTimeout(1200);

      const combien = await page.evaluate(
        () => document.querySelectorAll(".nuvi-scroll-in").length
      );
      if (!combien) {
        failures.push(
          `${nom} : aucune section a revelation sur la vitrine. Soit la classe `
          + "a ete renommee, soit les animations ont disparu ; dans les deux cas "
          + "ce test ne garde plus rien."
        );
        await ctx.close();
        continue;
      }

      // Le conteneur de defilement d'abord : c'est la cause, et elle se lit
      // sans avoir a faire defiler quoi que ce soit.
      const prison = await page.evaluate(() => {
        const trouves = [];
        document.querySelectorAll(".nuvi-scroll-in").forEach((s) => {
          let n = s.parentElement;
          while (n && n !== document.documentElement) {
            const cs = getComputedStyle(n);
            const defilant = /auto|scroll|hidden/.test(cs.overflowY);
            if (defilant && n.scrollHeight <= n.clientHeight + 1) {
              trouves.push(
                n.tagName.toLowerCase()
                + (n.className ? "." + String(n.className).split(" ")[0] : "")
                + " (overflow-y: " + cs.overflowY + ")"
              );
              break;
            }
            n = n.parentElement;
          }
        });
        return [...new Set(trouves)];
      });
      if (prison.length) {
        failures.push(
          `${nom} : une section a revelation est enfermee dans un conteneur de `
          + `defilement immobile - ${prison.join(", ")}. animation-timeline: `
          + "view() s'y mesure et n'avance jamais : les sections restent figees "
          + "a mi-animation. Couper avec overflow-x: clip, qui ne cree pas de "
          + "conteneur de defilement."
        );
      }

      // Puis ce que le visiteur constate : chaque section, amenee sous ses
      // yeux, est-elle lisible a fond de contraste ?
      const pales = await page.evaluate(async (plein) => {
        const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
        const restants = [];
        const sections = [...document.querySelectorAll(".nuvi-scroll-in")];
        for (const s of sections) {
          const haut = s.getBoundingClientRect().top + window.scrollY;
          window.scrollTo(0, Math.max(0, haut - 60));
          await dodo(450);
          const o = Number(getComputedStyle(s).opacity);
          if (o < plein) {
            restants.push({
              opacite: o.toFixed(2),
              texte: s.textContent.trim().replace(/\s+/g, " ").slice(0, 44),
            });
          }
        }
        return restants;
      }, PLEIN);

      for (const p of pales) {
        failures.push(
          `${nom} : "${p.texte}" est en position de lecture et reste a `
          + `${p.opacite} d'opacite. Du texte noir s'affiche alors gris, et rien `
          + "ne dit au visiteur que c'est une panne plutot qu'un choix."
        );
      }

      await ctx.close();
    }

    if (!failures.length) {
      console.log(
        "      chaque section arrivee a l'ecran est pleinement opaque, et "
        + "aucune n'est enfermee dans un conteneur de defilement immobile"
      );
    }
  } catch (err) {
    failures.push(`le test a plante : ${err && err.message}`);
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
