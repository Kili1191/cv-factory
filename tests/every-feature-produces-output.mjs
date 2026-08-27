// Trois fonctionnalites entieres n'avaient aucun point d'entree sur ordinateur.
//
// L'ancien panneau de 300px qui portait leurs boutons a ete supprime lors de
// la refonte v2, et la nouvelle barre laterale ne les a jamais repris :
// l'audit ATS, la preparation d'entretien et l'export LinkedIn existaient dans
// le code, se declenchaient correctement, et restaient injoignables. Aucune
// erreur, aucun bouton grise : simplement rien pour les ouvrir.
//
// Ce test pilote chaque entree de la barre laterale comme un utilisateur : il
// ouvre la section, clique le sous-item, lance l'action, et exige que le
// resultat de l'IA s'affiche vraiment. Une fonctionnalite qu'on retire de la
// navigation, ou qui cesse de rendre sa reponse, fait echouer la suite.
//
// Il verifie aussi qu'Echap referme chaque panneau : Versions, Activite et les
// feuilles d'edition ne le faisaient pas, ce qui piegeait l'utilisateur dans
// un panneau qu'il fallait fermer a la souris.

import { startServer, stopServer, launchBrowser, seedApp } from "./lib/harness.mjs";

// Une seule reponse d'IA sert toutes les fonctionnalites : chaque ecran y
// prend les cles qu'il connait. Les valeurs sont uniques pour qu'un test ne
// puisse pas confondre le resultat avec du texte deja present a l'ecran.
const PAYLOAD = {
  // Score recruteur (ScoreDashboard)
  global_score: 74,
  verdict_global: "Profil credible, chiffres absents.",
  top_priority: "Chiffre chaque bullet d'experience.",
  scores: ["title", "bullets", "ats", "relevance", "credibility", "design", "readability", "differentiation"]
    .map((id, i) => ({ id, score: 55 + i * 4, reco: "Revois la section " + id })),
  // Audit ATS (AuditModal)
  score_global: 74,
  verdict_recruteur: "Je rappelle",
  raison_verdict: "Resultats mesurables et lisibles.",
  premiere_impression: "Profil produit credible en dix secondes.",
  verdict_longueur: "Longueur correcte",
  longueur_recommandation: "Garder une page.",
  forces: ["Experience produit solide"],
  faiblesses: ["Accroche trop generique"],
  suggestions: ["Ajouter un chiffre des la premiere ligne"],
  mots_cles_manquants: ["roadmap produit"],
  // Truth Check
  overall_verdict: "Globalement defendable",
  issues: [{
    id: "i1", claim: "8 ans d'experience", risk: "moyen",
    question: "Peux-tu detailler ces annees ?", suggestion: "Preciser les dates",
  }],
  // Positionnement
  angles: [{
    title: "Product leader SaaS B2B",
    credibility: "Huit ans sur des produits a forte recurrence.",
    salary_range: "75-90k EUR",
    key_points: ["4M EUR d'ARR", "Equipe de 6", "Roadmap sur 18 mois"],
    target_employers: "Scale-up serie B",
    new_summary: "Accroche reecrite pour ce positionnement.",
  }],
  // Preparation entretien (InterviewModal)
  questions: [{ q: "Parlez-moi de vous", a: "Reponse structuree en trois temps",
                question: "Parlez-moi de vous", answer: "Reponse structuree en trois temps" }],
  top_questions: [{ question: "Votre plus gros echec ?", answer: "Une reponse honnete" }],
  strengths: ["Vision produit"], improvements: ["Chiffrer davantage"],
  red_flags: [], key_messages: ["Impact mesurable"], next_steps: ["Relancer sous 5 jours"],
  checklist: ["Preparer 3 exemples STAR"],
  level: "senior", sector: "SaaS", country: "France",
  // Export LinkedIn
  headline: "Product Manager Senior | SaaS B2B | 4M EUR ARR",
  about: "Product Manager senior, huit ans sur des produits SaaS B2B.",
  experiences: [{ title: "Senior PM", company: "Acme SaaS", description: "Lance trois produits." }],
  // Champs neutres pour les ecrans qui lisent autre chose.
  reply: "ok", operations: [], actions: [],
};
const AI_STUB = JSON.stringify({ content: [{ type: "text", text: JSON.stringify(PAYLOAD) }] });

// nav : entree de la barre laterale. sub : sous-item. cta : bouton qui lance
// l'action une fois le panneau ouvert (null si le panneau se lance seul).
// expect : texte qui ne peut venir que de la reponse de l'IA.
const FEATURES = [
  {
    // Ce panneau ne passe plus par l'IA : il mesure sur place. On attend donc
    // un des verdicts que seule la mesure produit, et non le texte bouchon.
    // Le motif couvre les cinq bandes de note, pour qu'un changement de
    // ponderation ne fasse pas echouer un test qui parle de l'affichage.
    // cta null : le panneau se lance seul. Il ne le pouvait pas tant qu'un
    // appel partait au reseau - on ne depense pas sans qu'on le demande - et
    // il le peut depuis que la mesure est locale et immediate.
    name: "Score recruteur", nav: "Score & Audits", sub: "Score recruteur",
    cta: null,
    expect: /Ce CV tient|une faiblesse nette|fragile devant un logiciel|le tri l'ecartera|presque rien a ranger/,
  },
  {
    name: "Audit ATS", nav: "Score & Audits", sub: "Audit ATS",
    cta: /Lancer|Analyser|Auditer/i, expect: /Experience produit solide|roadmap produit/,
  },
  {
    name: "Truth Check", nav: "Score & Audits", sub: "Truth Check",
    cta: null, expect: /Globalement defendable/,
  },
  {
    name: "Positionnement", nav: "Score & Audits", sub: "Positionnement",
    cta: null, expect: /Product leader SaaS B2B/,
  },
  {
    name: "Preparation entretien", nav: "Score & Audits", sub: "Preparer l'entretien",
    cta: /Lancer|Preparer|Generer|Simuler/i,
    expect: /Parlez-moi de vous|Votre plus gros echec|Preparer 3 exemples STAR/,
  },
  {
    name: "Export LinkedIn", nav: "Design", sub: "Profil LinkedIn",
    cta: /Generer|Lancer|Optimiser/i, expect: /4M EUR ARR|huit ans sur des produits SaaS/i,
  },
];

async function drive(browser, f) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message.split("\n")[0].slice(0, 90)));
  let calls = 0;
  await page.route("**/api/claude", r => {
    calls += 1;
    return r.fulfill({ status: 200, contentType: "application/json", body: AI_STUB });
  });
  await seedApp(page);

  try {
    await page.locator(`[role="button"]:has-text("${f.nav}"), button:has-text("${f.nav}")`)
      .first().click({ timeout: 8000 });
    await page.waitForTimeout(1200);

    const item = page.locator('[role="button"], button').filter({ hasText: f.sub }).first();
    if (await item.count() === 0) {
      await ctx.close();
      return { errors, shown: false, calls, reason: `aucune entree "${f.sub}" dans la barre laterale` };
    }
    await item.click({ timeout: 8000 });
    await page.waitForTimeout(2500);

    if (f.cta) {
      const cta = page.getByRole("button", { name: f.cta });
      if (await cta.count() === 0) {
        await ctx.close();
        return { errors, shown: false, calls, reason: "panneau ouvert mais aucun bouton pour lancer l'action" };
      }
      await cta.first().click({ timeout: 8000 });
    }
    await page.waitForTimeout(9000);

    const shown = await page.evaluate(
      rx => new RegExp(rx.source, rx.flags).test(document.body.innerText),
      { source: f.expect.source, flags: f.expect.flags },
    );
    await ctx.close();
    return { errors, shown, calls };
  } catch (err) {
    await ctx.close();
    return { errors, shown: false, calls, reason: err.message.split("\n")[0].slice(0, 80) };
  }
}

// Echap doit refermer un panneau. On prend Versions, qui ne le faisait pas.
async function escapeCloses(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  await page.route("**/api/claude", r =>
    r.fulfill({ status: 200, contentType: "application/json", body: AI_STUB }));
  await seedApp(page);
  await page.locator('[role="button"]:has-text("Mes CV"), button:has-text("Mes CV")').first().click();
  await page.waitForTimeout(1000);
  await page.locator('[role="button"], button').filter({ hasText: "Versions" }).first().click();
  await page.waitForTimeout(1800);
  const opened = await page.evaluate(() => /Sauvegarder cette version/i.test(document.body.innerText));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(900);
  const closed = !(await page.evaluate(() => /Sauvegarder cette version/i.test(document.body.innerText)));
  await ctx.close();
  return { opened, closed };
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    for (const f of FEATURES) {
      const r = await drive(browser, f);
      if (!r.shown) {
        failures.push(`${f.name} : aucun resultat affiche` + (r.reason ? ` (${r.reason})` : ""));
      }
      if (r.errors.length) {
        failures.push(`${f.name} : erreur JS - ${r.errors[0]}`);
      }
    }

    const esc = await escapeCloses(browser);
    if (!esc.opened) failures.push("le panneau Versions ne s'ouvre pas depuis Mes CV");
    else if (!esc.closed) failures.push("Echap ne referme pas le panneau Versions");

    if (!failures.length) {
      console.log(`      ${FEATURES.length} fonctionnalites pilotees, chacune affiche son resultat`);
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
