// "CA ANALYSE, ET PUIS RIEN NE CHANGE"
//
// Kilian, le 25 septembre 2026, apres deux tentatives sur une annonce du
// Civil Service : l'adaptation tourne, le panneau rend son analyse, et le CV
// a l'ecran est exactement celui d'avant. Rien ne disait pourquoi, donc la
// seule conclusion possible etait "l'outil ne marche pas".
//
// DEUX CHEMINS MENAIENT LA, ET AUCUN NE PARLAIT
//
//   1. Une reponse sans cv_optimized. Le champ est OBLIGATOIRE dans
//      SCHEMA_MATCH, donc son absence veut dire qu'un accident s'est produit
//      en amont. Le panneau passait quand meme a "done" : il affichait
//      l'analyse, ne touchait pas au CV, et ne disait rien.
//
//   2. Une reponse coupee au plafond de jetons. L'adaptation est la plus
//      grosse sortie du produit, l'analyse ET le CV entier, et le
//      raisonnement se paie sur le meme budget. L'API repond alors 200 avec
//      un JSON tronque, le navigateur echouait sur JSON.parse, et le message
//      affiche etait "Error - check API key" : la seule chose qui n'etait
//      certainement pas en cause, puisque sans cle on ne serait jamais
//      arrive jusque-la.
//
// Ce test ne prouve pas que l'adaptation reussit. Il prouve qu'une
// adaptation qui n'arrive pas le DIT, et laisse le CV intact.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

const ANNONCE = `Active Portfolio Management Analyst, Specialised Product
UKEF - Risk Management Group
Portfolio management and credit risk analysis of specialised products.
Stakeholder management across the division, and reporting to the committee.
Experience of risk assessment in a financial institution is essential.`;

// Une analyse complete, mais sans le CV reecrit : exactement ce que le
// panneau acceptait en silence.
const SANS_CV = {
  match_score: 61, job_title: "Active Portfolio Management Analyst",
  company: "UKEF", key_requirements: ["portfolio management", "credit risk"],
  keywords_matched: ["stakeholder management"], keywords_to_add: ["credit risk"],
  hidden_signals: [], culture_decode: "Public sector.", seniority_decode: "Senior.",
  likely_interview_questions: ["Tell me about a portfolio you managed."],
  cover_letter_hook: "Ten years of portfolio work.",
};

async function ouvrirEtLancer(page) {
  await page.evaluate(() => window.__nuviOpenModal("open-match"));
  await page.waitForTimeout(900);
  const champ = page.locator('textarea[data-nuvi="match-annonce"]').first();
  if (!(await champ.count())) return false;
  await champ.fill(ANNONCE);
  await page.waitForTimeout(400);
  const choix = page.locator('[data-nuvi="match-choix"][data-nuvi-choix="actuel"]').first();
  if (!(await choix.count())) return false;
  await choix.click({ timeout: 8000 });
  await page.waitForTimeout(2500);
  return true;
}

// Ce que la personne lit, tout de suite apres. On lit la zone d'etat plutot
// que de chercher une chaine dans la page entiere : un message qui n'est pas
// dans role="status" n'est pas annonce, et la moitie du probleme etait qu'on
// ne le voyait pas.
async function messageAffiche(page) {
  return page.evaluate(() => {
    const n = document.querySelector('[data-nuvi="notif"]');
    return n ? (n.textContent || "").trim() : "";
  });
}

async function titreDuCv(page) {
  return page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem("cvf_d") || "{}").title || ""; }
    catch { return ""; }
  });
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    // --- 1. L'ANALYSE REVIENT SANS LE CV ---------------------------------
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      await seedApp(page, SAMPLE_CV, { locale: "en" });
      const avant = await titreDuCv(page);

      await page.route("**/api/claude", (r) => r.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ content: [{ type: "text", text: JSON.stringify(SANS_CV) }] }),
      }));

      if (!(await ouvrirEtLancer(page))) {
        failures.push("le panneau Match n'offre pas son champ d'annonce ou son bouton de depart");
      } else {
        const dit = await messageAffiche(page);
        if (!dit) {
          failures.push(
            "l'analyse est revenue sans cv_optimized : le CV n'a pas bouge et RIEN n'est dit.\n" +
            "      C'est le defaut exact que Kilian a rencontre deux fois : l'outil a l'air de tourner,\n" +
            "      le panneau se remplit, et le document est celui d'avant."
          );
        } else if (/api key|cle api/i.test(dit)) {
          failures.push(
            "le message affiche accuse la cle API (\"" + dit.slice(0, 60) + "\").\n" +
            "      La cle est la seule chose qui n'est pas en cause : sans elle, l'appel ne serait pas parti."
          );
        }
        const apres = await titreDuCv(page);
        if (apres !== avant) {
          failures.push("le CV a change alors qu'aucun CV n'a ete rendu par le modele");
        }
      }
      await ctx.close();
    }

    // --- 2. LA REPONSE A ETE COUPEE --------------------------------------
    //
    // La route rend desormais 502 avec le type "reponse_coupee" plutot que
    // de laisser passer un JSON tronque. Ce que la personne lit doit nommer
    // la longueur, pas la cle.
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      await seedApp(page, SAMPLE_CV, { locale: "en" });
      const avant = await titreDuCv(page);

      await page.route("**/api/claude", (r) => r.fulfill({
        status: 502, contentType: "application/json",
        body: JSON.stringify({ error: {
          message: "La reponse a ete coupee avant la fin : elle depassait 16000 jetons de sortie.",
          type: "reponse_coupee" } }),
      }));

      if (await ouvrirEtLancer(page)) {
        const dit = await messageAffiche(page);
        if (!dit) {
          failures.push("une reponse coupee ne produit aucun message : l'ecran ne bouge pas");
        } else if (/api key|cle api/i.test(dit)) {
          failures.push(
            "une reponse coupee fait afficher \"" + dit.slice(0, 60) + "\".\n" +
            "      Le message envoie la personne changer une cle qui fonctionne."
          );
        }
        const apres = await titreDuCv(page);
        if (apres !== avant) failures.push("le CV a change alors que la reponse etait coupee");
      }
      await ctx.close();
    }

    if (!failures.length) {
      console.log("      une analyse sans CV et une reponse coupee se disent toutes les deux, "
        + "et le CV reste intact");
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
