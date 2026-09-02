// AUCUN TEXTE NE DOIT ETRE INVISIBLE
//
// Ce test nait d'un defaut qui est parti en production : le titre de
// l'accueil affichait "Voila ce que je fais aux ." - le mot "CV" avait
// disparu, et rien ne le signalait. Ni erreur JavaScript, ni test rouge, ni
// avertissement de compilation. La page se chargeait parfaitement, avec un
// trou au milieu de sa premiere phrase.
//
// LA MECANIQUE, PARCE QU'ELLE SE REPRODUIRA
//
// Le mot d'accent est peint par un degrade decoupe sur la forme des lettres :
//
//     -webkit-text-fill-color: transparent   le texte ne se peint pas
//     background: linear-gradient(...)       c'est le fond qui se voit
//     background-clip: text                  decoupe sur les lettres
//
// Les trois ensemble donnent un mot en degrade. Mais si le mot est ensuite
// decoupe en elements enfants - pour l'animer, pour le mesurer, pour
// n'importe quelle raison - chaque enfant HERITE de la transparence et
// N'HERITE PAS du fond. Resultat : du texte transparent devant rien.
//
// C'est un piege qui ne se voit qu'a l'oeil, et seulement si on regarde ce
// mot-la. D'ou ce test, qui le voit sans regarder.
//
// CE QU'IL VERIFIE
//
// Tout element dont le texte est transparent DOIT porter lui-meme un fond.
// La regle est exacte : elle laisse passer le degrade legitime, et elle
// attrape tout element qui a herite de la transparence sans le fond qui va
// avec. Elle vaut pour l'accueil comme pour tout ce qui sera ajoute apres.

import { startServer, stopServer, launchBrowser, BASE_URL, APP_URL, seedApp } from "./lib/harness.mjs";

// Les deux ecrans qui comptent : celui que voit un visiteur, et celui que
// voit quelqu'un qui a deja un CV.
const VIEWS = [
  { label: "accueil", viewport: { width: 1280, height: 860 }, seed: false },
  { label: "accueil sur telephone", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, seed: false },
  { label: "application", viewport: { width: 1280, height: 860 }, seed: true },
];

async function inspect(browser, view) {
  const { label, seed, ...ctxOpts } = view;
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message.split("\n")[0].slice(0, 100)));

  if (seed) await seedApp(page);
  else await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 45000 });

  // Le temps que les apparitions au defilement se jouent. Sans cette
  // attente, on accuserait une animation en cours d'etre un texte perdu.
  await page.waitForTimeout(3600);

  const found = await page.evaluate(() => {
    const bad = [];
    const seen = new Set();
    for (const el of document.querySelectorAll("*")) {
      const text = (el.textContent || "").trim();
      if (!text || text.length > 120) continue;
      // Seules les feuilles portent du texte a elles ; remonter plus haut
      // signalerait le meme mot a chaque niveau du document.
      if ([...el.children].some(c => (c.textContent || "").trim())) continue;

      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.display === "none") continue;

      const fill = s.webkitTextFillColor || s.color;
      const transparent = /rgba\(0,\s*0,\s*0,\s*0\)|^transparent$/.test(fill);
      if (!transparent) continue;

      // Transparent AVEC un fond a soi : c'est le degrade voulu.
      if (s.backgroundImage && s.backgroundImage !== "none") continue;

      const key = text.slice(0, 40);
      if (seen.has(key)) continue;
      seen.add(key);
      const r = el.getBoundingClientRect();
      bad.push({ text: key, tag: el.tagName.toLowerCase(), w: Math.round(r.width) });
    }
    return bad;
  });

  await ctx.close();
  return { found, errors };
}

// LE MOT D'ACCENT DOIT ETRE LA
//
// La regle generale ci-dessus attrape la cause. Celle-ci attrape l'effet,
// dans le cas precis qui a casse : le titre de l'accueil doit contenir le
// mot mis en valeur, et il doit occuper de la place a l'ecran.
async function accentIsPainted(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 45000 });

  await page.waitForTimeout(3600);
  const r = await page.evaluate(() => {
    const em = document.querySelector("em");
    if (!em) return { missing: true };
    const box = em.getBoundingClientRect();
    const s = getComputedStyle(em);
    return {
      text: (em.textContent || "").trim(),
      width: Math.round(box.width),
      hasBackground: s.backgroundImage !== "none",
      // Un mot transparent SANS fond a lui est invisible, quoi qu'en dise le
      // document.
      fill: s.webkitTextFillColor || s.color,
    };
  });
  await ctx.close();
  return r;
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    for (const view of VIEWS) {
      const { found, errors } = await inspect(browser, view);
      for (const f of found) {
        failures.push(
          `${view.label} : <${f.tag}> "${f.text}" est peint transparent sans fond,`
          + ` donc invisible (${f.w}px de large a l'ecran)`
        );
      }
      if (errors.length) failures.push(`${view.label} : erreur JS - ${errors[0]}`);
    }

    const accent = await accentIsPainted(browser);
    if (accent.missing) {
      failures.push("le titre de l'accueil n'a plus de mot mis en valeur");
    } else {
      if (!accent.text) failures.push("le mot mis en valeur du titre est vide");
      if (accent.width < 8) {
        failures.push(`le mot mis en valeur n'occupe que ${accent.width}px : il ne s'affiche pas`);
      }
      const transparent = /rgba\(0,\s*0,\s*0,\s*0\)/.test(accent.fill);
      if (transparent && !accent.hasBackground) {
        failures.push("le mot mis en valeur est transparent et n'a plus son degrade : il a disparu de la page");
      }
    }
  } catch (err) {
    failures.push(`le test a plante : ${err && err.message}`);
  } finally {
    try { await browser.close(); } catch { /* deja fermee */ }
    await stopServer(server);
  }

  if (!failures.length) {
    console.log("      3 ecrans inspectes : aucun texte transparent sans son fond, le mot d'accent du titre est bien peint");
  }
  return failures;
}
