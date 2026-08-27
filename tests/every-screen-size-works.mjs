// Nuvi tient debout a toutes les largeurs, pas seulement aux deux testees.
//
// POURQUOI CE TEST EXISTE
//
// Le crash test avant mise en ligne est profond mais etroit : il ouvre 130
// ecrans, dans quatre situations... sur DEUX largeurs, 390 et 1440. Or une
// mise en page responsive ne casse presque jamais aux largeurs qu'on
// regarde. Elle casse ENTRE : a 768 ou bascule le point de rupture, a 1024
// sur un iPad pose a plat, a 360 sur un Android d'entree de gamme, a 1920 ou
// tout s'etire.
//
// Ce test est l'inverse du premier : peu profond, tres large. Une seule
// situation, mais huit largeurs, dont les deux cotes exacts de chaque point
// de rupture. C'est la que se trouvent les defauts qu'on ne voit qu'en
// recevant le message d'un utilisateur.
//
// CE QU'IL VERIFIE, A CHAQUE LARGEUR
//
//   1. Aucun defilement lateral. Le defaut "pas adapte" par excellence, et
//      il ne se voit jamais sur la machine de celui qui a ecrit la page.
//   2. Aucune erreur JavaScript.
//   3. Rien qui deborde du bord droit.
//   4. Sous 768px, les zones tactiles tiennent le plancher de 44px.
//   5. La bascule telephone/ordinateur se fait DU BON COTE du point de
//      rupture : une barre laterale d'ordinateur a 500px de large, ou une
//      barre du bas de telephone a 1400px, veut dire que la bascule s'est
//      trompee de sens.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

// Les deux cotes de chaque point de rupture, et les extremes reels du parc.
const LARGEURS = [
  { w: 360, h: 780, nom: "Android d'entree de gamme", tactile: true },
  { w: 390, h: 844, nom: "iPhone", tactile: true },
  { w: 430, h: 932, nom: "iPhone Max", tactile: true },
  // Les tablettes en portrait : 768 et 834 selon le modele. Elles recoivent
  // l'interface de telephone, parce qu'a ces largeurs le CV a besoin de
  // toute la place et que l'appareil se tient a la main.
  { w: 768, h: 1024, nom: "iPad portrait", tactile: true },
  { w: 834, h: 1112, nom: "iPad 11 pouces portrait", tactile: true },
  // LES DEUX COTES EXACTS DU POINT DE RUPTURE, A UN PIXEL PRES.
  // C'est la que la bascule se trompe de sens, et nulle part ailleurs.
  { w: 899, h: 1000, nom: "juste sous la rupture", tactile: true },
  { w: 900, h: 1000, nom: "juste au-dessus de la rupture", tactile: false },
  { w: 1024, h: 768, nom: "iPad paysage", tactile: false },
  { w: 1280, h: 800, nom: "portable", tactile: false },
  { w: 1920, h: 1080, nom: "grand ecran", tactile: false },
];

const TOUCHE_MIN = 44;

function ausculter(page, tactile, TOUCHE_MIN) {
  return page.evaluate(({ tactile, TOUCHE_MIN }) => {
    const doc = document.documentElement;
    const vp = { w: window.innerWidth, h: window.innerHeight };

    const visible = (el) => {
      const s = getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return false;
      let p = el.parentElement;
      let box = { l: r.left, t: r.top, r: r.right, b: r.bottom };
      while (p && p !== doc) {
        const ps = getComputedStyle(p);
        if (ps.display === "none" || ps.visibility === "hidden") return false;
        if (/auto|scroll|hidden/.test(ps.overflow + ps.overflowX + ps.overflowY)) {
          const pr = p.getBoundingClientRect();
          box = {
            l: Math.max(box.l, pr.left), t: Math.max(box.t, pr.top),
            r: Math.min(box.r, pr.right), b: Math.min(box.b, pr.bottom),
          };
          if (box.r - box.l < 1 || box.b - box.t < 1) return false;
        }
        p = p.parentElement;
      }
      return true;
    };

    const petits = [];
    const deborde = [];
    for (const el of document.querySelectorAll("button, a, [role=button], input, select, textarea")) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      const t = (el.innerText || el.value || el.getAttribute("aria-label") || "")
        .replace(/\s+/g, " ").trim().slice(0, 26);
      if (tactile && (r.height < TOUCHE_MIN - 0.5 || r.width < TOUCHE_MIN - 0.5)) {
        // Une commande a l'interieur du CV suit l'echelle du document : elle
        // se traite ailleurs, avec le zoom, pas par la taille.
        let echelle = 1, p2 = el.parentElement;
        while (p2 && p2 !== doc) {
          const tr = getComputedStyle(p2).transform;
          if (tr && tr !== "none") {
            const m = tr.match(/matrix\(([^,]+),/);
            if (m) { const f = parseFloat(m[1]); if (f > 0 && f < 0.99) echelle *= f; }
          }
          p2 = p2.parentElement;
        }
        if (echelle > 0.99) {
          petits.push({ t: t || el.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height) });
        }
      }
      // Deborde du bord droit : inatteignable, quelle que soit la largeur.
      if (r.left > vp.w + 1 || r.right < -1) {
        deborde.push({ t: t || el.tagName.toLowerCase(), x: Math.round(r.left) });
      }
    }

    // La bascule s'est-elle faite du bon cote ? On mesure ce qui existe :
    // une barre laterale verticale haute et etroite, ou une barre du bas
    // large et basse collee en bas.
    let railLateral = false, barreDuBas = false;
    for (const el of document.querySelectorAll("nav, aside, div")) {
      const s = getComputedStyle(el);
      if (s.position !== "fixed") continue;
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.height > vp.h * 0.6 && r.width < 300 && r.left < 60) railLateral = true;
      if (r.width > vp.w * 0.8 && r.height < 140 && r.bottom > vp.h - 8) barreDuBas = true;
    }

    return {
      largeurDoc: doc.scrollWidth, largeurVue: doc.clientWidth,
      petits: petits.slice(0, 5), nbPetits: petits.length,
      deborde: deborde.slice(0, 3),
      railLateral, barreDuBas,
    };
  }, { tactile, TOUCHE_MIN });
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();
  const bilan = [];

  try {
    for (const t of LARGEURS) {
      const ctx = await browser.newContext({
        viewport: { width: t.w, height: t.h },
        isMobile: t.tactile, hasTouch: t.tactile,
      });
      const page = await ctx.newPage();
      const erreurs = [];
      page.on("pageerror", (e) => erreurs.push(String(e && e.message || e).split("\n")[0]));

      try {
        await seedApp(page, SAMPLE_CV, { locale: "en" });
        await page.waitForTimeout(900);
        const vu = await ausculter(page, t.tactile, TOUCHE_MIN);
        const ou = `${t.w}px (${t.nom})`;

        if (vu.largeurDoc > vu.largeurVue + 1) {
          failures.push(
            `${ou} : la page defile lateralement (${vu.largeurDoc}px de contenu `
            + `pour ${vu.largeurVue}px d'ecran). Sur un telephone on fait glisser `
            + "la page sans le vouloir ; sur un ordinateur une barre grise apparait "
            + "en bas. Dans les deux cas ca se voit tout de suite, sauf sur la "
            + "machine de celui qui a ecrit la page."
          );
        }
        if (vu.nbPetits) {
          failures.push(
            `${ou} : ${vu.nbPetits} zone(s) de touche sous ${TOUCHE_MIN}px : `
            + vu.petits.map((p) => `"${p.t}" ${p.w}x${p.h}`).join(", ")
          );
        }
        if (vu.deborde.length) {
          failures.push(
            `${ou} : ${vu.deborde.length} commande(s) hors de l'ecran : `
            + vu.deborde.map((d) => `"${d.t}" a x=${d.x}`).join(", ")
          );
        }
        // --- La bascule est-elle du bon cote ? -------------------------
        if (t.tactile && vu.railLateral && !vu.barreDuBas) {
          failures.push(
            `${ou} : l'interface d'ordinateur (barre laterale) s'affiche sur une `
            + "largeur de telephone. Le point de rupture s'est trompe de sens."
          );
        }
        if (!t.tactile && vu.barreDuBas && !vu.railLateral) {
          failures.push(
            `${ou} : l'interface de telephone (barre du bas) s'affiche sur une `
            + "largeur d'ordinateur. Le point de rupture s'est trompe de sens."
          );
        }
        bilan.push(`${t.w}:${vu.railLateral ? "rail" : ""}${vu.barreDuBas ? "bas" : ""}` || `${t.w}:?`);
      } catch (err) {
        failures.push(`${t.w}px : le test a plante - ${err && err.message}`);
      } finally {
        if (erreurs.length) {
          failures.push(
            `${t.w}px (${t.nom}) : ${erreurs.length} erreur(s) JavaScript - `
            + [...new Set(erreurs)].slice(0, 2).join(" | ")
          );
        }
        await ctx.close();
      }
    }

    console.log(`      ${LARGEURS.length} largeurs de 360 a 1920 : ${bilan.join("  ")}`);
  } catch (err) {
    failures.push(`le test a plante : ${err && err.message}`);
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
