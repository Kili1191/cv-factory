// RIEN NE DOIT RECOUVRIR UNE COMMANDE
//
// Ce test naît d'un defaut vu sur un vrai telephone : le compagnon flottant
// etait pose sur la moitie droite du bouton "Ajuster". Taper la ouvrait le
// Coach. Rien ne le signalait - le bouton etait la, visible, parfaitement
// dessine, et il ne repondait pas.
//
// C'est la troisieme fois que ce defaut se presente sous une forme
// differente : le compagnon sur "J'ai deja un CV" a l'accueil, le compagnon
// sur la croix de la barre de suggestion, le compagnon sur "Ajuster". A
// chaque fois on a deplace quelque chose de quelques pixels. A chaque fois
// c'est revenu ailleurs.
//
// COMMENT ON LE MESURE
//
// Pour chaque bouton entierement visible a l'ecran, on demande au navigateur
// QUI recevrait un tap en son centre - document.elementFromPoint. Si la
// reponse n'est pas ce bouton ni un de ses enfants, c'est qu'autre chose est
// posee dessus, et le bouton est injoignable au doigt.
//
// La mesure ne juge pas l'apparence : elle interroge le navigateur sur le
// comportement reel du tap. Un element qui laisse passer les evenements
// (pointer-events: none) ne declenche donc aucun echec, alors qu'il
// recouvrirait visuellement - c'est correct, il ne vole pas le tap.
//
// On ne regarde que les boutons ENTIEREMENT dans l'ecran. Un bouton a moitie
// sorti par le defilement est normalement recouvert par le mobilier fixe :
// c'est le comportement attendu d'une barre fixe, pas un defaut.

import { startServer, stopServer, launchBrowser, seedApp, BASE_URL } from "./lib/harness.mjs";

const PHONE = {
  viewport: { width: 390, height: 844 },
  isMobile: true, hasTouch: true, deviceScaleFactor: 2,
};

// Les deux etats du telephone qui comptent : quelqu'un qui arrive sans rien,
// et quelqu'un qui a deja son CV - c'est ce second ecran, avec sa rangee
// Generer / Ajuster et sa barre de suggestion, qui portait le defaut.
const STATES = [
  { label: "avec un CV", seed: true },
  { label: "sans CV", seed: false },
];

async function blockedControls(browser, state) {
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message.split("\n")[0].slice(0, 90)));

  if (state.seed) await seedApp(page);
  else await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });

  // Le temps que le mobilier fixe se place : la barre de suggestion mesure sa
  // propre hauteur puis la publie, et le compagnon s'y accroche.
  await page.waitForTimeout(3600);

  // POURQUOI UNE SEULE MESURE, A LA POSITION NATURELLE
  //
  // Une premiere version balayait la page a cinq hauteurs de defilement, pour
  // attraper un bouton qui devient injoignable en cours de descente. Elle
  // trouvait beaucoup de choses - et elle mentait : elle saisissait le premier
  // conteneur defilant venu, souvent l'apercu du CV, et fabriquait des etats
  // qu'aucun utilisateur n'atteint. Elle a signale "Generer" comme recouvert
  // par l'apercu du CV, ce qui n'arrive jamais.
  //
  // Un test qui trouve plus mais dont on ne peut pas croire le verdict ne vaut
  // rien : on finit par ignorer ses echecs, et le jour ou il a raison personne
  // ne l'ecoute. On mesure donc a la position ou la page s'ouvre - celle que
  // tout le monde voit - et la regle structurelle plus bas, qui compte les
  // boutons Coach, couvre la cause plutot que ses manifestations.
  const blocked = await measure(page);

  await ctx.close();
  return { blocked, errors };
}

function measure(page) {
  return page.evaluate(() => {
    const out = [];
    const W = window.innerWidth, H = window.innerHeight;

    for (const el of document.querySelectorAll('button, a[href], [role="button"]')) {
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      // Entierement visible seulement. Un bouton a cheval sur le bord est
      // legitimement recouvert par une barre fixe.
      if (r.top < 0 || r.left < 0 || r.right > W || r.bottom > H) continue;

      // UN RECTANGLE DANS L'ECRAN NE VEUT PAS DIRE VISIBLE
      //
      // getBoundingClientRect rend une GEOMETRIE, pas une visibilite. Un
      // bouton pousse hors de son conteneur defilant garde un rectangle
      // parfaitement situe dans l'ecran, alors qu'il est decoupe et n'est
      // peint nulle part.
      //
      // Sans ce controle, le test affirmait "visible mais injoignable" sur
      // trois boutons qui n'etaient pas affiches du tout - et il le disait aux
      // memes coordonnees avant et apres la correction, ce qui a failli faire
      // corriger deux fois une application qui allait bien.
      //
      // On coupe donc le rectangle par celui de chaque ancetre qui decoupe.
      // S'il ne reste rien, le bouton n'est pas a l'ecran.
      let vis = { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a);
        const decoupe = /(auto|scroll|hidden|clip)/.test(cs.overflowY + " " + cs.overflowX);
        if (!decoupe) continue;
        const ar = a.getBoundingClientRect();
        vis.top = Math.max(vis.top, ar.top);
        vis.bottom = Math.min(vis.bottom, ar.bottom);
        vis.left = Math.max(vis.left, ar.left);
        vis.right = Math.min(vis.right, ar.right);
      }
      // On exige que le CENTRE survive au decoupage : c'est le point qu'on va
      // interroger juste apres, et le seul dont la reponse ait un sens.
      const ccx = r.left + r.width / 2, ccy = r.top + r.height / 2;
      if (ccy < vis.top || ccy > vis.bottom || ccx < vis.left || ccx > vis.right) continue;

      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.display === "none" || s.opacity === "0") continue;
      if (el.disabled) continue;

      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      if (!hit) continue;
      // Le tap arrive-t-il sur ce bouton, sur un de ses enfants, ou sur un
      // parent qui l'englobe ? Dans les trois cas le bouton recoit l'evenement.
      if (el.contains(hit) || hit.contains(el)) continue;

      // UN ECRAN PAR-DESSUS N'EST PAS UN DEFAUT
      //
      // L'accueil, les modales et les tiroirs sont des calques qui couvrent
      // volontairement toute la page : ce qui est derriere est cense etre
      // inaccessible, c'est la definition meme d'une modale. Sans cette
      // distinction, le test signalerait chaque bouton de l'application des
      // qu'un ecran s'ouvre par-dessus - un bruit qui rendrait le vrai
      // signal invisible.
      //
      // Ce qu'on cherche est l'inverse : un element QUI NE COUVRE PAS l'ecran
      // et qui vole quand meme le tap. Un compagnon flottant, une barre, une
      // pastille.
      let node = hit, coversScreen = false;
      while (node && node !== document.body) {
        const p = getComputedStyle(node).position;
        if (p === "fixed" || p === "absolute") {
          const nr = node.getBoundingClientRect();
          if (nr.width >= W * 0.9 && nr.height >= H * 0.9) { coversScreen = true; break; }
        }
        node = node.parentElement;
      }
      if (coversScreen) continue;

      const label = (el.getAttribute("aria-label")
        || (el.innerText || "").trim()
        || el.getAttribute("title") || "?").slice(0, 40).replace(/\s+/g, " ");
      const thief = (hit.getAttribute("aria-label")
        || (hit.innerText || "").trim()
        || hit.tagName.toLowerCase()).slice(0, 40).replace(/\s+/g, " ");

      out.push({ label, thief, x: Math.round(cx), y: Math.round(cy) });
    }
    return out;
  });
}

// UN SEUL COACH A L'ECRAN
//
// Le defaut d'origine n'etait pas seulement une superposition : c'etait un
// SECOND bouton Coach, en plus de celui de la barre du bas. Deux entrees pour
// la meme chose, dont une posee sur les autres commandes.
async function coachAppearsOnce(browser) {
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  await seedApp(page);
  await page.waitForTimeout(3000);
  const n = await page.evaluate(() => {
    let count = 0;
    for (const el of document.querySelectorAll('button, [role="button"]')) {
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.display === "none" || s.opacity === "0") continue;
      const label = (el.getAttribute("aria-label") || el.innerText || "").trim();
      if (/^coach$/i.test(label)) count += 1;
    }
    return count;
  });
  await ctx.close();
  return n;
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    for (const state of STATES) {
      const { blocked, errors } = await blockedControls(browser, state);
      for (const b of blocked) {
        failures.push(
          `${state.label} : le bouton "${b.label}" est visible mais un tap en son centre`
          + ` (${b.x}, ${b.y}) arrive sur "${b.thief}" : il est injoignable au doigt`
        );
      }
      if (errors.length) failures.push(`${state.label} : erreur JS - ${errors[0]}`);
    }

    const coaches = await coachAppearsOnce(browser);
    if (coaches > 1) {
      failures.push(
        `${coaches} boutons Coach a l'ecran en meme temps : la barre du bas en porte`
        + " deja un, le compagnon flottant fait doublon et recouvre les commandes"
      );
    }
    if (coaches === 0) {
      failures.push("aucun bouton Coach sur telephone : le Coach est devenu injoignable");
    }
  } catch (err) {
    failures.push(`le test a plante : ${err && err.message}`);
  } finally {
    try { await browser.close(); } catch { /* deja fermee */ }
    await stopServer(server);
  }

  if (!failures.length) {
    console.log("      2 etats du telephone : chaque bouton visible recoit son propre tap, un seul Coach a l'ecran");
  }
  return failures;
}
