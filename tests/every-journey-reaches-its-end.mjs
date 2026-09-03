// Le crash test des parcours : chacun va jusqu'au bout, sans casser.
//
// POURQUOI CE TEST, ALORS QU'IL Y A DEJA UN CRASH TEST
//
// tests/ready-to-launch.mjs ouvre chaque ecran dans quatre situations et
// verifie qu'il TIENT DEBOUT : pas d'erreur, pas de defilement lateral, pas de
// bouton de 28px. C'est la moitie de la question. L'autre moitie, c'est
// celle que se pose quelqu'un qui arrive avec une annonce dans un onglet et
// un vieux CV dans un mail : est-ce que j'arrive au bout ?
//
// Ce qui coule un produit n'est presque jamais un ecran qui plante. C'est
// une CHAINE qui casse a son troisieme maillon : l'annonce se colle, le CV
// s'ecrit, et le telechargement s'ouvre sur un panneau qui n'a pas de sortie.
// Chaque suite de ce depot verifie un maillon. Celle-ci tire sur la chaine.
//
// CE QU'ELLE FAIT
//
// Six parcours, tels qu'une vraie personne les fait, du premier clic au
// resultat. Le modele est remplace par des reponses fixes, choisies par nom de
// tache, parce qu'on prouve ici le circuit et pas la qualite de l'ecriture,
// qui a ses propres suites. A chaque etape, trois questions :
//
//   1. Une erreur JavaScript ? Un parcours qui jette est un parcours mort.
//   2. L'artefact attendu est-il la ? Le CV, le verdict, la lettre, le PDF.
//   3. Quand ca finit par un telechargement : UNE page A4, toujours.
//
// L'echec nomme le parcours et l'etape. "Le pack ne s'ouvre pas" envoie
// chercher ; "parcours B, etape 4 : apres l'analyse, aucun score a l'ecran"
// dit ou regarder.

import { mkdtempSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

const CADRATIN = String.fromCharCode(0x2014);
const ORDINATEUR = { width: 1440, height: 950 };
const TELEPHONE = { width: 390, height: 844, isMobile: true, hasTouch: true };

// --- Ce que le modele repond, par tache ----------------------------------

const CV_ECRIT = {
  name: "Sam Carter", title: "Care Assistant", email: "sam.carter@gmail.com",
  phone: "07700 900123", location: "Manchester", linkedin: "",
  summary: "Care assistant with three years in residential settings.",
  experience: [{
    title: "Care Assistant", company: "Elmwood House", period: "2022 - 2026",
    location: "Manchester",
    bullets: ["Supported 14 residents with personal care and medication.",
              "Trained 5 new starters."],
  }],
  education: [{ degree: "NVQ Level 3 in Health and Social Care", school: "Manchester College", period: "2020" }],
  skills: ["Medication administration", "Personal care", "Record keeping"],
  languages: [{ lang: "English", level: "Native" }],
  certifications: ["First Aid at Work"],
  deduit: [],
};

const ANALYSE = {
  match_score: 78, job_title: "Care Assistant", company: "Elmwood House",
  key_requirements: ["medication", "night shifts"],
  keywords_matched: ["medication"], keywords_to_add: ["safeguarding"],
  hidden_signals: ["understaffed nights"], culture_decode: "small team",
  seniority_decode: "junior", likely_interview_questions: ["Tell me about a difficult resident."],
  cover_letter_hook: "Fourteen residents a night taught me calm.",
  cv_optimized: (({ deduit, ...reste }) => reste)(CV_ECRIT),
};

const PACK = {
  "application-pack-ecrits": {
    cover_letter: "Madame, Monsieur,\n\nVotre annonce a retenu mon attention.",
    linkedin_message: "Bonjour, je viens de postuler.",
    application_email: { subject: "Candidature", body: "Madame, Monsieur, ..." },
    follow_up: { subject: "Suite a ma candidature", body: "Bonjour, ..." },
  },
  "application-pack-entretien": {
    interview_pitch: "Trois ans en residence.",
    star_answers: [{ question: "Un resident difficile ?", situation: "s", task: "t", action: "a", result: "r" }],
  },
  "application-pack-defense": {
    objections: [{ doubt: "Pas de nuit", answer: "Trente par an" }],
    questions_to_ask: ["Comment se passe la releve ?"],
    negotiation: { range: "12 a 13 GBP", argument: "medication", levers: ["rota"] },
  },
};

const DIAGNOSTIC = { annonces: [
  { titre: "Care Home Manager", entreprise: "Elmwood", score: 30, niveau: "dessus", manques: ["team leadership"] },
  { titre: "Deputy Manager", entreprise: "Bright Path", score: 25, niveau: "dessus", manques: ["budget"] },
  { titre: "Service Manager", entreprise: "Oakfield", score: 35, niveau: "dessus", manques: ["CQC"] },
] };

function reponseDuModele(corps) {
  const t = corps.task_name || "";
  if (t === "cv-from-offer" || t === "cv-from-offer-reprise" || t === "import-cv"
      || t === "shorten-to-one-page" || t === "generate-cv") return CV_ECRIT;
  if (t === "match") return ANALYSE;
  if (PACK[t]) return PACK[t];
  if (t === "why-no-interview") return DIAGNOSTIC;
  return {};
}

const ANNONCE = "Care Assistant wanted for a residential home in Manchester.&nbsp;"
  + "You will support 14 residents with personal care, medication and daily "
  + "records. NVQ Level 3 preferred. Night shifts available. Full training "
  + "given, competitive rates, immediate start for the right candidate.";

const CV_BRUT = [
  "Sam Carter", "Care Assistant", "sam.carter@gmail.com | 07700 900123", "",
  "EXPERIENCE", "Care Assistant - Elmwood House", "2022 - 2026",
  "- Supported 14 residents with personal care and medication.", "- Trained 5 new starters.", "",
  "EDUCATION", "NVQ Level 3 in Health and Social Care", "Manchester College", "2020", "",
  "SKILLS", "Medication administration, personal care, record keeping",
].join("\n");

const CV_CASSE = {
  ...SAMPLE_CV,
  experience: [
    { ...SAMPLE_CV.experience[0], id: 1, title: "Account Manager " + CADRATIN,
      company: "Stenn International", bullets: ["Onboarded 60+ SME clients."] },
  ],
  certifications: ["2023"],
};

// --- Outils --------------------------------------------------------------

async function ouvrirContexte(browser, viewport, cv, locale) {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on("pageerror", (e) => erreurs.push(e.message.split("\n")[0].slice(0, 100)));
  const appels = [];
  await page.route("**/api/claude", (r) => {
    let corps = {};
    try { corps = JSON.parse(r.request().postData() || "{}"); } catch { corps = {}; }
    appels.push(corps.task_name || "?");
    return r.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ content: [{ type: "text", text: JSON.stringify(reponseDuModele(corps)) }] }) });
  });
  await seedApp(page, cv, { locale });
  return { ctx, page, erreurs, appels };
}

// Un bouton par son texte, dans la barre, le tiroir ou une feuille.
async function cliquerTexte(page, motif, delai = 900) {
  const l = page.locator('button, [role="button"]').filter({ hasText: motif }).first();
  if (!(await l.count())) return false;
  await l.click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(delai);
  return true;
}

// Telecharger, en traversant le controle et le choix de format, puis lire.
async function telecharger(page, etape, echec) {
  const attente = page.waitForEvent("download", { timeout: 60_000 }).catch(() => null);
  if (!(await cliquerTexte(page, /^\s*(Telecharger|Download)\s*$/i, 1200))) {
    echec(etape + " : aucun bouton Telecharger"); return null;
  }
  const quandMeme = page.locator('[data-nuvi="defauts-quand-meme"]');
  const corriger = page.locator('[data-nuvi="defauts-corriger"]');
  if (await corriger.count()) { await corriger.first().click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(1000); }
  if (await quandMeme.count()) { await quandMeme.first().click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(800); }
  if (await page.locator('[data-nuvi="defauts-raccourcir"]').count()) {
    echec(etape + " : le controle demande de raccourcir un CV qui devrait tenir"); return null;
  }
  const confirmer = page.getByRole("button", { name: /A4|Standard|Telecharger|Download/i });
  if (await confirmer.count() > 1) await confirmer.nth(1).click({ timeout: 8000 }).catch(() => {});
  const dl = await attente;
  if (!dl) { echec(etape + " : aucun PDF telecharge"); return null; }
  const dossier = mkdtempSync(join(tmpdir(), "cvf-parcours-"));
  const chemin = join(dossier, "cv.pdf");
  await dl.saveAs(chemin);
  const mod = await import("pdfjs-dist/legacy/build/pdf.js");
  const pdfjs = mod.getDocument ? mod : (mod.default || {});
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(chemin)) }).promise;
  const p1 = await doc.getPage(1);
  const v = p1.getViewport({ scale: 1 });
  const texte = (await p1.getTextContent()).items.map((it) => it.str).join(" ");
  if (doc.numPages !== 1) echec(etape + " : le PDF fait " + doc.numPages + " pages, le recruteur en recoit une");
  if (Math.abs(v.width - 595.28) > 6 || Math.abs(v.height - 841.89) > 6) {
    echec(etape + " : la page fait " + Math.round(v.width) + "x" + Math.round(v.height) + " points, pas un A4");
  }
  return { pages: doc.numPages, texte };
}

const texteDuCv = (page) => page.evaluate(() =>
  (document.getElementById("cv-print") || document.querySelector('[data-cvf="cv"]') || {}).innerText || "");

// --- Les parcours --------------------------------------------------------

const PARCOURS = [
  {
    nom: "A. Je pars de l'annonce, sans CV, sur telephone",
    viewport: TELEPHONE, cv: { name: "", title: "", summary: "", experience: [], education: [], skills: [] },
    locale: "en",
    async jouer({ page, echec, appels }) {
      if (!(await cliquerTexte(page, /.*/, 0))) { /* pas d'erreur : on cherche l'entree ci-dessous */ }
      const entree = page.locator('[data-nuvi="home-offre"]');
      if (!(await entree.count())) { echec("etape 1 : l'accueil n'offre pas \"je pars de l'annonce\""); return; }
      await entree.first().click({ timeout: 8000 }); await page.waitForTimeout(900);
      const champ = page.locator('[data-nuvi="offre-annonce"]');
      if (!(await champ.count())) { echec("etape 2 : pas de champ d'annonce"); return; }
      await champ.fill(ANNONCE); await page.waitForTimeout(300);
      const cta = page.locator('[data-nuvi="offre-cta"]');
      if (await cta.isDisabled()) { echec("etape 3 : l'annonce est collee et le bouton reste gris"); return; }
      await cta.click({ timeout: 8000 }); await page.waitForTimeout(3500);
      if (!appels.includes("cv-from-offer")) { echec("etape 3 : aucun appel cv-from-offer"); return; }
      const t = await texteDuCv(page);
      if (!/Sam Carter/.test(t)) { echec("etape 4 : le CV ecrit n'est pas a l'ecran"); return; }
      const pdf = await telecharger(page, "etape 5", echec);
      if (pdf && !/Sam\s*Carter/.test(pdf.texte)) echec("etape 5 : le PDF ne porte pas le nom");
    },
  },
  {
    nom: "B. J'ai deja un CV : je le colle, je l'adapte a une annonce, je genere le pack",
    viewport: ORDINATEUR, cv: { name: "", title: "", summary: "", experience: [], education: [], skills: [] },
    locale: "en",
    async jouer({ page, echec, appels }) {
      if (!(await cliquerTexte(page, /already have|deja un CV|import/i))) { echec("etape 1 : pas d'entree \"j'ai deja un CV\""); return; }
      const zone = page.locator("textarea").first();
      if (!(await zone.count())) { echec("etape 2 : pas de zone pour coller le CV"); return; }
      await zone.fill(CV_BRUT); await page.waitForTimeout(300);
      if (!(await cliquerTexte(page, /import|structur|analy|lire|read|continue|go/i, 3000))) {
        echec("etape 2 : pas de bouton pour lancer l'import"); return;
      }
      let t = await texteDuCv(page);
      if (!/Sam Carter/.test(t)) { echec("etape 3 : le CV colle n'est pas a l'ecran (" + t.slice(0, 40) + ")"); return; }
      if (!(await cliquerTexte(page, /^\s*Match\s*$/i))) { echec("etape 4 : pas d'entree Match"); return; }
      const offre = page.locator("textarea").first();
      await offre.fill(ANNONCE); await page.waitForTimeout(300);
      if (!(await cliquerTexte(page, /analy|match|adapt/i, 3000))) { echec("etape 4 : pas de bouton d'analyse"); return; }
      if (!appels.includes("match")) { echec("etape 4 : aucun appel match"); return; }
      const corps = await page.locator("body").innerText();
      if (!/78/.test(corps)) { echec("etape 5 : le score de l'analyse n'est pas a l'ecran"); return; }
      if (!(await cliquerTexte(page, /full application|candidature complete|Application Pack|Pack candidature/i, 1200))) {
        echec("etape 6 : pas d'entree vers le pack"); return;
      }
      if (await page.locator("textarea").count() && !appels.some((a) => a.startsWith("application-pack"))) {
        const z = page.locator("textarea").first();
        if (!(await z.inputValue())) await z.fill(ANNONCE);
        await cliquerTexte(page, /gener|generate/i, 1200);
      }
      await page.waitForTimeout(4000);
      const apres = await page.locator("body").innerText();
      if (!/Madame, Monsieur/.test(apres)) { echec("etape 7 : la lettre du pack n'est pas a l'ecran"); return; }
    },
  },
  {
    nom: "C. Mon CV est casse : le compagnon le voit, Corriger corrige, et ca part sur une page",
    viewport: ORDINATEUR, cv: CV_CASSE, locale: "en",
    async jouer({ page, echec }) {
      const badge = page.locator('[data-nuvi="badge-defauts"]');
      if (!(await badge.count())) { echec("etape 1 : le compagnon ne compte rien sur un CV casse"); return; }
      await badge.first().click({ timeout: 5000 }); await page.waitForTimeout(800);
      const corriger = page.locator('[data-nuvi="defauts-corriger"]');
      if (!(await corriger.count())) { echec("etape 2 : la liste n'offre pas Corriger"); return; }
      await corriger.first().click({ timeout: 5000 }); await page.waitForTimeout(1200);
      const t = await texteDuCv(page);
      if (t.includes(CADRATIN)) { echec("etape 3 : le tiret long est encore dans le CV apres Corriger"); return; }
      await page.keyboard.press("Escape").catch(() => {}); await page.waitForTimeout(400);
      if (await badge.count()) { echec("etape 4 : le compagnon compte encore apres correction"); }
      await telecharger(page, "etape 5", echec);
    },
  },
  {
    nom: "D. Pourquoi personne ne repond : trois annonces, un verdict",
    viewport: ORDINATEUR, cv: SAMPLE_CV, locale: "fr",
    async jouer({ page, echec }) {
      if (!(await cliquerTexte(page, /Pourquoi personne ne repond/i))) { echec("etape 1 : pas d'entree"); return; }
      const champs = page.locator("[data-pq-annonce]");
      if ((await champs.count()) < 3) { echec("etape 2 : moins de trois champs"); return; }
      for (let i = 0; i < 3; i++) await champs.nth(i).fill(ANNONCE + " Ref " + i + ".");
      await page.locator("[data-pq-lancer]").first().click({ timeout: 8000 });
      const verdict = await page.waitForSelector("[data-pq-verdict]", { timeout: 15000 }).catch(() => null);
      if (!verdict) { echec("etape 3 : aucun verdict"); return; }
      const cause = await page.locator("[data-pq-verdict]").first().getAttribute("data-pq-verdict");
      if (cause !== "niveau") echec("etape 4 : verdict \"" + cause + "\" au lieu de \"niveau\"");
    },
  },
  {
    nom: "E. Suivi : une candidature de huit jours, la pastille, et l'entree des reponses",
    viewport: ORDINATEUR, cv: SAMPLE_CV, locale: "en",
    async avant(page) {
      const ilYA = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
      await page.evaluate((apps) => localStorage.setItem("cvf_ap", JSON.stringify(apps)),
        [{ id: "a1", company: "Elmwood", role: "Care Assistant", status: "applied", date: ilYA(8) }]);
      await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(2000);
    },
    async jouer({ page, echec }) {
      const entree = page.locator('button, [role="button"]').filter({ hasText: /^(Applications|Candidatures)$/i }).first();
      if (!(await entree.count())) { echec("etape 1 : pas d'entree Applications"); return; }
      const point = await entree.evaluate((e) => [...e.querySelectorAll("*")].some((n) => {
        const r = n.getBoundingClientRect(); const cs = getComputedStyle(n);
        return r.width >= 3 && r.width <= 14 && Math.abs(r.width - r.height) <= 3
          && (parseFloat(cs.borderRadius) >= r.width / 2 - 1 || cs.borderRadius.includes("%"))
          && !(n.textContent || "").trim(); }));
      if (!point) echec("etape 2 : pas de pastille sur une candidature de huit jours sans reponse");
      if (!(await cliquerTexte(page, /Recruiter replies|Reponses des recruteurs/i))) { echec("etape 3 : pas d'entree Reponses des recruteurs"); return; }
      const corps = await page.locator("body").innerText();
      if (!/Elmwood/.test(corps)) echec("etape 4 : le tableau de suivi ouvert ne montre pas la candidature");
    },
  },
  {
    nom: "F. Sur telephone : editer une experience, changer de modele, telecharger",
    viewport: TELEPHONE, cv: SAMPLE_CV, locale: "en",
    async jouer({ page, echec }) {
      if (!(await cliquerTexte(page, /^\s*(More|Plus)\s*$/i))) { echec("etape 1 : pas de tiroir"); return; }
      if (!(await cliquerTexte(page, /Edit experience|Editer les experiences/i))) { echec("etape 2 : pas d'entree pour editer les experiences"); return; }
      const feuille = await page.locator('[aria-label="close" i], [aria-label*="Close" i], [aria-label*="Fermer" i]').count();
      if (!feuille) { echec("etape 2 : la feuille d'edition ne s'ouvre pas"); return; }
      await page.keyboard.press("Escape").catch(() => {}); await page.waitForTimeout(500);
      if (!(await cliquerTexte(page, /^\s*(More|Plus)\s*$/i))) { echec("etape 3 : le tiroir ne se rouvre pas"); return; }
      if (!(await cliquerTexte(page, /Change template|Changer de modele/i))) { echec("etape 3 : pas d'entree pour changer de modele"); return; }
      await page.keyboard.press("Escape").catch(() => {}); await page.waitForTimeout(500);
      await telecharger(page, "etape 4", echec);
    },
  },
  {
    // "parcours avec juste putting job offer for best match cv" : j'ai deja
    // un CV, je colle SEULEMENT l'annonce, et je repars avec le CV qui lui
    // correspond le mieux, applique, telecharge.
    nom: "G. J'ai un CV, je colle juste l'annonce, je repars avec le CV qui matche",
    viewport: ORDINATEUR, cv: SAMPLE_CV, locale: "en",
    async jouer({ page, echec, appels }) {
      const avant = await texteDuCv(page);
      if (!(await cliquerTexte(page, /^\s*Match\s*$/i))) { echec("etape 1 : pas d'entree Match"); return; }
      const offre = page.locator("textarea").first();
      if (!(await offre.count())) { echec("etape 1 : pas de champ d'annonce"); return; }
      await offre.fill(ANNONCE); await page.waitForTimeout(300);
      if (!(await cliquerTexte(page, /analy|match|adapt/i, 3000))) { echec("etape 2 : pas de bouton d'analyse"); return; }
      if (!appels.includes("match")) { echec("etape 2 : aucun appel match"); return; }
      if (!(await cliquerTexte(page, /apply|appliquer|use this|utiliser|adopt/i, 1500))) {
        echec("etape 3 : aucun bouton pour appliquer le CV adapte"); return;
      }
      const apres = await texteDuCv(page);
      if (apres === avant || !/Sam Carter/.test(apres)) { echec("etape 4 : le CV a l'ecran n'est pas le CV adapte"); return; }
      await page.keyboard.press("Escape").catch(() => {}); await page.waitForTimeout(400);
      const pdf = await telecharger(page, "etape 5", echec);
      if (pdf && !/Sam\s*Carter/.test(pdf.texte)) echec("etape 5 : le PDF ne porte pas le CV adapte");
    },
  },
  {
    // "accompagnement entretien" : la preparation, puis l'assistance en
    // direct avec une question tapee.
    nom: "H. Accompagnement entretien : preparation, puis assistance en direct",
    viewport: ORDINATEUR, cv: SAMPLE_CV, locale: "en",
    async jouer({ page, echec, appels }) {
      if (!(await cliquerTexte(page, /Score & Audits/i))) { echec("etape 1 : pas d'entree Score & Audits"); return; }
      if (!(await cliquerTexte(page, /Interview prep/i))) { echec("etape 1 : pas d'entree Interview prep"); return; }
      const offre = page.locator("textarea").first();
      if (await offre.count()) { await offre.fill(ANNONCE); await page.waitForTimeout(300); }
      if (!(await cliquerTexte(page, /prep|prepar|generate|questions|run|lancer/i, 3000))) {
        echec("etape 2 : pas de bouton pour lancer la preparation"); return;
      }
      if (!appels.includes("interview-prep")) { echec("etape 2 : aucun appel interview-prep"); return; }
      const corps = await page.locator("body").innerText();
      if (!/difficult resident/i.test(corps)) { echec("etape 3 : les questions preparees ne sont pas a l'ecran"); return; }
      await page.keyboard.press("Escape").catch(() => {}); await page.waitForTimeout(500);

      // L'assistance en direct : elle repond en flux. On remplace le flux
      // par un texte fixe ; ce qu'on prouve est que la question tapee
      // arrive et que les reperes s'affichent.
      await page.route("**/api/claude/stream", (r) => r.fulfill({
        status: 200, contentType: "text/plain",
        body: "- Say the fourteen residents figure.\n- Name the night shifts.\n- Ask about the handover.",
      }));
      if (!(await cliquerTexte(page, /Live interview/i))) { echec("etape 4 : pas d'entree Live interview"); return; }
      const question = page.locator('input[placeholder*="question" i], textarea[placeholder*="question" i]').first();
      if (!(await question.count())) { echec("etape 4 : pas de champ pour taper la question"); return; }
      await question.fill("Tell me about a difficult resident.");
      await question.press("Enter"); await page.waitForTimeout(1500);
      const direct = await page.locator("body").innerText();
      if (!/fourteen residents/i.test(direct)) { echec("etape 5 : les reperes de l'assistance ne s'affichent pas"); }
    },
  },
  {
    // "download" : rien d'autre. Un CV propre, le bouton, un PDF d'une page,
    // sur les deux appareils.
    nom: "I. Telecharger, sur telephone",
    viewport: TELEPHONE, cv: SAMPLE_CV, locale: "en",
    async jouer({ page, echec }) {
      const pdf = await telecharger(page, "etape 1", echec);
      if (pdf && !new RegExp(String(SAMPLE_CV.name || "").split(" ")[0] || "a", "i").test(pdf.texte)) {
        echec("etape 1 : le PDF ne porte pas le nom");
      }
    },
  },
];

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    let aboutis = 0;
    for (const p of PARCOURS) {
      const avantEchecs = failures.length;
      const echec = (m) => failures.push(p.nom + " / " + m);
      let ctx = null;
      try {
        const o = await ouvrirContexte(browser, p.viewport, p.cv, p.locale);
        ctx = o.ctx;
        if (p.avant) await p.avant(o.page);
        await p.jouer({ page: o.page, echec, appels: o.appels });
        for (const e of o.erreurs) echec("erreur JavaScript : " + e);
      } catch (err) {
        echec("le parcours a plante : " + (err && err.message ? err.message.split("\n")[0] : err));
      } finally {
        if (ctx) await ctx.close().catch(() => {});
      }
      if (failures.length === avantEchecs) aboutis += 1;
    }
    if (!failures.length) {
      console.log("      " + aboutis + " parcours sur " + PARCOURS.length + " vont jusqu'au bout, sans une erreur");
    }
  } catch (err) {
    failures.push("le test lui-meme a plante : " + (err && err.message));
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((f) => {
    for (const l of f) console.log("ECHEC " + l);
    process.exit(f.length ? 1 : 0);
  });
}
