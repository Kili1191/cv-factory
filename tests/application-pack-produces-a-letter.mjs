// Le pack candidature ne produisait rien quand on l'ouvrait depuis le menu.
//
// Sa generation etait declenchee par un effet garde par `packCtx`, lui-meme
// pose uniquement par le bouton "Generer la candidature complete" affiche
// dans les resultats d'une analyse d'offre. Ouvert par le menu, packCtx
// restait nul, aucune requete ne partait, et le panneau n'avait meme pas de
// branche d'affichage pour ce cas : titre, puis plus rien, indefiniment.
//
// Les deux chemins doivent produire une lettre.

import { startServer, stopServer, launchBrowser, seedApp } from "./lib/harness.mjs";

const LETTER = "Madame, Monsieur,";

const AI_STUB = JSON.stringify({ content: [{ type: "text", text: JSON.stringify({
  match_score: 82, job_title: "Head of Product", company: "OfferCo",
  points_forts: ["a"], points_faibles: ["b"], mots_cles: ["roadmap"],
  cv_optimized: {
    name: "Jane Doe", title: "Head of Product", email: "j@d.com", phone: "06",
    location: "Paris", linkedin: "", summary: "s",
    experience: [], education: [], skills: [], languages: [], certifications: [],
  },
  cover_letter: LETTER + "\n\nVotre annonce de Head of Product a retenu mon attention.",
  linkedin_message: "Bonjour, je viens de postuler au poste de Head of Product.",
  application_email: { subject: "Candidature Head of Product", body: "Madame, Monsieur, ..." },
  interview_pitch: "8 ans en produit SaaS B2B.",
  star_answers: [{ question: "Un projet difficile ?", situation: "s", task: "t", action: "a", result: "r" }],
})}]});

const OFFER = "Head of Product, roadmap produit, management d'une equipe de 6 personnes.";

async function fromMenu(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message.split("\n")[0].slice(0, 90)));
  await page.route("**/api/claude", r => r.fulfill({ status: 200, contentType: "application/json", body: AI_STUB }));
  await seedApp(page);

  await page.locator('[role="button"]:has-text("Pack candidature"), button:has-text("Pack candidature")').first().click();
  await page.waitForTimeout(2000);

  const box = page.locator("textarea").first();
  if (!(await box.count())) return { errors, letter: false, reason: "aucun champ pour coller l'offre" };
  await box.fill(OFFER);
  await page.waitForTimeout(400);
  const cta = page.getByRole("button", { name: /Generer ma candidature/i });
  if (!(await cta.count())) return { errors, letter: false, reason: "bouton de generation absent" };
  await cta.first().click();
  await page.waitForTimeout(8000);

  const letter = await page.evaluate((needle) => document.body.innerText.includes(needle), LETTER);
  await ctx.close();
  return { errors, letter };
}

async function fromOfferAnalysis(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message.split("\n")[0].slice(0, 90)));
  await page.route("**/api/claude", r => r.fulfill({ status: 200, contentType: "application/json", body: AI_STUB }));
  await seedApp(page);

  await page.locator('[role="button"]:has-text("Match offre"), button:has-text("Match offre")').first().click();
  await page.waitForTimeout(1600);
  await page.locator("textarea").first().fill(OFFER);
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /Adapter mon CV a cette offre/i }).first().click();
  await page.waitForTimeout(4000);

  const cta = page.getByRole("button", { name: /Generer la candidature complete/i });
  if (!(await cta.count())) return { errors, letter: false, reason: "bouton absent des resultats d'offre" };
  await cta.last().click();
  await page.waitForTimeout(8000);

  const letter = await page.evaluate((needle) => document.body.innerText.includes(needle), LETTER);
  await ctx.close();
  return { errors, letter };
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    const menu = await fromMenu(browser);
    if (!menu.letter) {
      failures.push("depuis le menu, aucune lettre de motivation produite" + (menu.reason ? ` (${menu.reason})` : ""));
    }
    if (menu.errors.length) failures.push("erreurs JS (menu) : " + menu.errors.slice(0, 2).join(" | "));

    const offer = await fromOfferAnalysis(browser);
    if (!offer.letter) {
      failures.push("depuis l'analyse d'offre, aucune lettre produite" + (offer.reason ? ` (${offer.reason})` : ""));
    }
    if (offer.errors.length) failures.push("erreurs JS (analyse d'offre) : " + offer.errors.slice(0, 2).join(" | "));

    if (!failures.length) console.log("      lettre generee par les deux chemins, sans erreur JS");
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
