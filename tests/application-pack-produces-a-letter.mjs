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
  const manquantes = await lireLesOnglets(page);
  await ctx.close();
  return { errors, letter, manquantes };
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
  const manquantes = await lireLesOnglets(page);
  await ctx.close();
  return { errors, letter, manquantes };
}

// LES CINQ PIECES, PAS SEULEMENT LA LETTRE
//
// Le pack promet cinq livrables : lettre, message LinkedIn, e-mail de
// candidature, pitch d'entretien, reponses STAR. Ce test n'en verifiait
// qu'un. Les quatre autres pouvaient etre vides, ou leur onglet muet, sans
// que rien ne le signale - et on ne s'en apercevait qu'en cliquant soi-meme,
// c'est-a-dire jamais.
//
// Le stub de l'IA renvoie les cinq. Tout ce qui manque a l'ecran manque donc
// a l'affichage, pas au modele : la panne est chez nous, et nommee.
const PIECES = [
  { onglet: "lettre|cover", temoin: "Votre annonce de Head of Product a retenu mon attention", nom: "la lettre de motivation" },
  { onglet: "linkedin", temoin: "je viens de postuler au poste de Head of Product", nom: "le message LinkedIn" },
  { onglet: "e-?mail", temoin: "Candidature Head of Product", nom: "l'e-mail de candidature" },
  { onglet: "pitch", temoin: "8 ans en produit SaaS B2B", nom: "le pitch d'entretien" },
  { onglet: "star", temoin: "Un projet difficile", nom: "les reponses STAR" },
];

async function lireLesOnglets(page) {
  const manquantes = [];
  for (const piece of PIECES) {
    const ouvert = await page.evaluate((motif) => {
      const rx = new RegExp(motif, "i");
      const cible = [...document.querySelectorAll("button")]
        .filter((b) => {
          const t = (b.innerText || "").trim();
          return t.length > 0 && t.length < 30 && rx.test(t);
        });
      const b = cible[cible.length - 1];
      if (!b) return false;
      b.click();
      return true;
    }, piece.onglet);
    // Un onglet absent est deja un constat : la piece est promise et
    // introuvable.
    if (!ouvert) { manquantes.push(`${piece.nom} : onglet introuvable`); continue; }
    await page.waitForTimeout(700);
    const vu = await page.evaluate((t) => (document.body.innerText || "").includes(t), piece.temoin);
    if (!vu) manquantes.push(`${piece.nom} : onglet ouvert, mais son contenu ne s'affiche pas`);
  }
  return manquantes;
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
    for (const m of (menu.manquantes || [])) failures.push("depuis le menu, " + m);

    const offer = await fromOfferAnalysis(browser);
    if (!offer.letter) {
      failures.push("depuis l'analyse d'offre, aucune lettre produite" + (offer.reason ? ` (${offer.reason})` : ""));
    }
    if (offer.errors.length) failures.push("erreurs JS (analyse d'offre) : " + offer.errors.slice(0, 2).join(" | "));
    for (const m of (offer.manquantes || [])) failures.push("depuis l'analyse d'offre, " + m);

    if (!failures.length) {
      console.log(`      les ${PIECES.length} pieces du pack s'affichent par les deux chemins, sans erreur JS`);
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
