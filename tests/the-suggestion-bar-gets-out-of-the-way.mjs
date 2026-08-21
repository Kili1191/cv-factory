// LA BARRE DE SUGGESTION DOIT SAVOIR S'EFFACER, ET SAVOIR PARTIR
//
// Elle est en position fixe au-dessus de la barre de navigation. Le contenu
// passe dessous, et sur un ecran de telephone elle coupe en deux le titre de
// la carte qu'on est en train de lire. Sur une vraie capture d'iPhone, la
// carte "Tu as deja un CV" apparaissait tranchee au milieu de sa phrase.
//
// TROIS PROMESSES, CHACUNE VERIFIABLE
//
//   1. Elle s'efface des que ca defile.
//   2. Elle revient quand ca s'arrete - sinon ce n'est pas s'effacer, c'est
//      disparaitre, et on perd la suggestion.
//   3. Effacee, elle ne vole plus les taps. Une opacite nulle ne rend pas un
//      element transparent au doigt : sans pointer-events:none on obtiendrait
//      une barre invisible qui avale les taps de ce qu'elle recouvre. Ce
//      serait pire que le defaut d'origine, puisque rien ne se verrait.
//
// ET UNE QUATRIEME, QUI TIENT DANS LE TEMPS
//
//   4. La croix fait partir la suggestion POUR DE BON. Elle existait deja,
//      mais son effet mourait avec l'onglet : au rechargement la barre
//      revenait. Une suggestion qu'on a refusee et qui revient n'est plus une
//      suggestion, c'est une relance.

import { startServer, stopServer, launchBrowser, seedApp } from "./lib/harness.mjs";

const PHONE = {
  viewport: { width: 390, height: 844 },
  isMobile: true, hasTouch: true, deviceScaleFactor: 2,
};

const BAR = '[data-nuvi="suggest-bar"]';

// Rend { opacity, taps } : ce que vaut la barre a cet instant, et si elle
// intercepterait un tap en son centre.
function readBar(page) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      opacity: Number(s.opacity),
      pointerEvents: s.pointerEvents,
      // La barre intercepte-t-elle vraiment, d'apres le navigateur ?
      interceptsTap: Boolean(hit && (el === hit || el.contains(hit))),
      height: Math.round(r.height),
    };
  }, BAR);
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const ctx = await browser.newContext(PHONE);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message.split("\n")[0].slice(0, 90)));

    await seedApp(page);
    // La barre mesure sa hauteur puis la publie ; on la laisse se poser.
    await page.waitForTimeout(3200);

    const atRest = await readBar(page);
    if (!atRest) {
      await ctx.close();
      return ["aucune barre de suggestion sur telephone avec un CV : le test ne peut rien verifier"];
    }
    if (atRest.opacity < 0.9) {
      failures.push(`au repos la barre n'est visible qu'a ${Math.round(atRest.opacity * 100)}%`);
    }
    if (!atRest.interceptsTap) {
      failures.push("au repos la barre ne recoit pas les taps : son bouton serait mort");
    }

    // 1. ELLE S'EFFACE DES QUE CA DEFILE
    //
    // On declenche un vrai evenement de defilement sur un bloc interieur, pas
    // sur la page : c'est le cas courant, et c'est celui que la barre ne
    // voyait pas avant qu'on ecoute en phase de capture.
    const scrolled = await page.evaluate(() => {
      const inner = [...document.querySelectorAll("*")].find(el => {
        const s = getComputedStyle(el);
        return (s.overflowY === "auto" || s.overflowY === "scroll")
          && el.scrollHeight - el.clientHeight > 40;
      });
      const target = inner || document.scrollingElement;
      target.scrollTop = Math.min(120, target.scrollHeight - target.clientHeight);
      return Boolean(inner);
    });
    await page.waitForTimeout(180);

    const during = await readBar(page);
    if (during.opacity > 0.2) {
      failures.push(
        `pendant le defilement la barre reste a ${Math.round(during.opacity * 100)}%`
        + (scrolled ? " (bloc interieur)" : " (page entiere)")
        + " : elle continue de couper le contenu"
      );
    }
    if (during.pointerEvents !== "none") {
      failures.push("effacee, la barre garde pointer-events : elle avalerait des taps sans se voir");
    }
    if (during.interceptsTap) {
      failures.push("effacee, la barre intercepte encore le tap en son centre");
    }

    // 2. ELLE REVIENT QUAND CA S'ARRETE
    await page.waitForTimeout(1400);
    const after = await readBar(page);
    if (after.opacity < 0.9) {
      failures.push(
        `une seconde apres l'arret, la barre n'est revenue qu'a ${Math.round(after.opacity * 100)}%`
      );
    }
    if (!after.interceptsTap) {
      failures.push("revenue, la barre ne recoit toujours pas les taps");
    }

    // La hauteur ne doit pas bouger : le contenu reserve sa place une fois
    // pour toutes. Une barre qui retire sa place a chaque defilement ferait
    // sauter la page sous le doigt.
    if (Math.abs(after.height - atRest.height) > 2) {
      failures.push(
        `la barre change de hauteur (${atRest.height}px puis ${after.height}px) :`
        + " le contenu sautera a chaque defilement"
      );
    }

    // 3. LA CROIX LA FAIT PARTIR POUR DE BON
    await page.locator(BAR + ' button[aria-label]').last().click({ timeout: 8000 });
    await page.waitForTimeout(400);
    if (await page.locator(BAR).count() > 0) {
      failures.push("la croix ne fait pas disparaitre la barre");
    }

    // Le vrai test du "pour de bon" : on recharge.
    await page.reload({ waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3200);
    if (await page.locator(BAR).count() > 0) {
      failures.push("apres rechargement la suggestion refusee revient : le refus n'a pas ete retenu");
    }

    if (errors.length) failures.push(`erreur JS - ${errors[0]}`);
    await ctx.close();
  } catch (err) {
    failures.push(`le test a plante : ${err && err.message}`);
  } finally {
    try { await browser.close(); } catch { /* deja fermee */ }
    await stopServer(server);
  }

  if (!failures.length) {
    console.log("      la barre s'efface au defilement sans voler de tap, revient a l'arret, et la croix la fait partir pour de bon");
  }
  return failures;
}
