// Sur telephone, le tiroir "Plus" ne listait que six entrees.
//
// L'audit ATS, la preparation d'entretien, l'export LinkedIn, le Truth Check,
// le positionnement, la traduction, les versions, la comparaison, le lissage
// de parcours, l'edition, l'ajustement et le journal d'activite n'avaient
// aucun point d'entree : douze fonctionnalites sur dix-huit etaient
// reservees a l'ordinateur, sans que rien ne le dise.
//
// Ce test ouvre le tiroir sur un ecran de telephone, clique chaque entree, et
// exige qu'un panneau s'ouvre vraiment. Il verifie aussi que le tiroir defile,
// sinon les dernieres entrees sont hors de l'ecran et donc injoignables.

import { startServer, stopServer, launchBrowser, seedApp } from "./lib/harness.mjs";

const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

const AI_STUB = JSON.stringify({ content: [{ type: "text", text: JSON.stringify({
  score_global: 74, global_score: 74, verdict_global: "v", top_priority: "tp",
  scores: [{ id: "title", score: 70, reco: "r" }],
  forces: ["f"], faiblesses: ["fa"], suggestions: ["s"], mots_cles_manquants: ["m"],
  premiere_impression: "pi", verdict_recruteur: "Je rappelle", raison_verdict: "rv",
  overall_verdict: "Globalement defendable",
  issues: [{ id: "i1", claim: "c", risk: "moyen", question: "q", suggestion: "s" }],
  angles: [{ title: "Product leader", credibility: "c", salary_range: "75k",
             key_points: ["k"], target_employers: "t", new_summary: "n" }],
  headline: "h", about: "a", experiences: [{ title: "t", company: "c", description: "d" }],
  questions: [{ question: "q", answer: "a", q: "q", a: "a" }],
  top_questions: [{ question: "q", answer: "a" }],
  strengths: ["s"], improvements: ["i"], red_flags: [], key_messages: ["k"],
  next_steps: ["n"], checklist: ["c"], level: "senior", sector: "SaaS", country: "France",
  reply: "ok", operations: [], actions: [],
}) }] });

// Entrees qui doivent ouvrir un panneau. "Lisser le parcours" et "Comparer"
// n'y sont pas : avec un CV neuf elles repondent par un message, ce qui est le
// comportement voulu et non l'ouverture d'un panneau.
const ITEMS = [
  "Trouver un poste",
  "Editer", "Ajuster", "Design", "Traduction",
  "Score", "Audit ATS", "Truth Check", "Positionnement", "Preparer l'entretien",
  "Mes CV", "Versions", "Profil LinkedIn", "Suivi", "Mon activite",
];

async function openDrawer(page) {
  await page.getByRole("button", { name: /Plus|More/ }).first().click({ timeout: 8000 });
  await page.waitForTimeout(900);
}

// On se limite au tiroir : le contenu qui reste derriere l'overlay porte des
// libelles identiques, et viser le mauvais bouton donnerait un faux echec.
function drawerButton(page, label) {
  return page.locator('[data-nuvi="more-drawer"] button').filter({ hasText: label }).first();
}

async function tryItem(browser, label) {
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message.split("\n")[0].slice(0, 80)));
  await page.route("**/api/claude", r =>
    r.fulfill({ status: 200, contentType: "application/json", body: AI_STUB }));
  await seedApp(page);
  try {
    const before = await page.evaluate(() => document.body.innerText.length);
    await openDrawer(page);
    const btn = drawerButton(page, label);
    if (await btn.count() === 0) {
      await ctx.close();
      return { errors, opened: false, reason: "absente du tiroir" };
    }
    await btn.click({ timeout: 8000 });
    await page.waitForTimeout(4000);
    const after = await page.evaluate(() => document.body.innerText.length);
    await ctx.close();
    return { errors, opened: after !== before };
  } catch (err) {
    await ctx.close();
    return { errors, opened: false, reason: err.message.split("\n")[0].slice(0, 70) };
  }
}

// Le tiroir depasse la hauteur d'un telephone : sans defilement, les dernieres
// entrees sont hors d'atteinte.
async function drawerScrolls(browser) {
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  await seedApp(page);
  await openDrawer(page);
  const ok = await page.evaluate(() => {
    const drawer = document.querySelector('[data-nuvi="more-drawer"]');
    if (!drawer) return { found: false };
    const st = getComputedStyle(drawer);
    const scrollable = (st.overflowY === "auto" || st.overflowY === "scroll")
      && drawer.scrollHeight > drawer.clientHeight + 4;
    return { found: true, scrollable };
  });
  await ctx.close();
  return ok;
}

// Le telechargement est la derniere etape du parcours. Sur telephone le
// bouton n'a pas de libelle, seulement une icone : s'il disparait ou devient
// trop petit pour le pouce, l'utilisateur ne repart avec rien.
async function downloadIsReachable(browser) {
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  await seedApp(page);
  const box = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")]
      .find(b => /telecharger/i.test(b.getAttribute("aria-label") || b.innerText || ""));
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    return { w: r.width, h: r.height, onScreen: r.top >= 0 && r.top < 844 && r.left >= 0 && r.left < 390 };
  });
  await ctx.close();
  return box;
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    for (const label of ITEMS) {
      const r = await tryItem(browser, label);
      if (!r.opened) {
        failures.push(`"${label}" n'ouvre rien sur telephone` + (r.reason ? ` (${r.reason})` : ""));
      }
      if (r.errors.length) failures.push(`"${label}" : erreur JS - ${r.errors[0]}`);
    }
    const scroll = await drawerScrolls(browser);
    if (!scroll.found) failures.push("le tiroir Plus n'a pas pu etre trouve");
    else if (!scroll.scrollable) {
      failures.push("le tiroir Plus ne defile pas : ses dernieres entrees sont hors de l'ecran");
    }
    const dl = await downloadIsReachable(browser);
    if (!dl) failures.push("aucun bouton de telechargement sur telephone");
    else {
      if (!dl.onScreen) failures.push("le bouton de telechargement est hors de l'ecran sur telephone");
      if (dl.w < 44 || dl.h < 44) {
        failures.push(`bouton de telechargement trop petit pour le pouce : ${Math.round(dl.w)}x${Math.round(dl.h)}px, minimum 44`);
      }
    }

    if (!failures.length) {
      console.log(`      ${ITEMS.length} entrees ouvertes depuis le tiroir, qui defile, telechargement a portee`);
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
