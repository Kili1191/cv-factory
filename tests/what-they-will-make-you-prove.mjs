// Interview prep defends the numbers Nuvi talked you into writing.
//
// WHY THIS EXISTS
//
// The diagnostic pushes people to replace "Responsible for the bar" with
// "Held beverage margin at 78% across the year", because the second one is
// what gets you called. It is also what gets interrogated: a recruiter who
// reads a figure asks where it came from. Writing the claim without
// preparing its defence walks someone into a room holding a number they
// cannot explain, which is worse than never writing it.
//
// WHICH LINES GET PROBED IS NOT A QUESTION FOR THE MODEL
//
// lib/resultatOuResponsabilite.js already knows, deterministically: the
// bullets classified "resultat" are the ones carrying a displacement figure,
// and "indetermine" ones claim a result without measuring it, which draws
// "such as?". Both get probed. A responsibility does not: there is nothing
// to verify in "Responsible for the bar".
//
// So the selection is free, instant and stable, and the model only writes
// the question and what to have ready. This test holds that split: a
// responsibility must never appear in the list, because its presence would
// mean the model picked the lines instead of the classifier.
//
// AN EMPTY LIST IS NOT A PASS
//
// If nothing on the CV claims a result there is nothing to prove, and that
// is bad news, not good. The panel has to say so, otherwise a CV with no
// achievements at all reads as a CV with nothing to worry about.

import { startServer, stopServer, launchBrowser, seedApp } from "./lib/harness.mjs";

const QUESTIONS = {
  country: "France", sector: "Restauration", level: "Confirme", total_questions: 1,
  questions: [{
    category: "Comportementale", question: "Parlez-moi d un service difficile.",
    why: "tester le sang-froid",
    answer: { situation: "Un samedi soir", task: "Tenir le service", action: "Repartir les rangs", result: "Service tenu" },
  }],
};

const PREUVES = {
  lignes: [{
    ligne: "Marge boissons tenue a 78 % sur l'annee",
    probe: "Comment saviez-vous que la marge etait a 78 %, et sur quelle periode ?",
    prepare: "D'ou vient le chiffre, qui le suivait, et ce que tu as change pour le tenir.",
    faible: "Sans savoir comment il etait calcule, le chiffre passe pour invente.",
  }],
};

const CV = {
  name: "Kilian Maisonnette", title: "Bar Manager",
  email: "k@example.com", phone: "07 00 00 00 00", location: "London",
  summary: "Bar manager, six ans en hotellerie.",
  experience: [{
    id: 1, title: "Bar Manager", company: "Taj Exotica", period: "2025 - 2026",
    bullets: [
      "Marge boissons tenue a 78 % sur l'annee",
      "Responsable du bar et des commandes fournisseurs",
    ],
  }],
  education: [], skills: ["Bar"], languages: [], certifications: [],
};

// Le meme CV, sans aucune ligne qui affirme un resultat.
const CV_SANS_RESULTAT = {
  ...CV,
  experience: [{
    id: 1, title: "Bar Manager", company: "Taj Exotica", period: "2025 - 2026",
    bullets: [
      "Responsable du bar et des commandes fournisseurs",
      "Encadrement d une equipe de 6 barmen",
    ],
  }],
};

async function ouvrirEtLancer(page, cv) {
  await seedApp(page, cv, { locale: "fr" });
  await page.evaluate(() => window.__nuviOpenModal && window.__nuviOpenModal("open-interview"));
  await page.waitForTimeout(1300);
  await page.getByRole("button", { name: "Generer mes questions", exact: true }).first().click();
  await page.waitForTimeout(2200);
}

export async function run() {
  const failures = [];
  let srv = null;
  let browser = null;
  try {
    srv = await startServer();
    browser = await launchBrowser();

    // --- 1. Le cas ordinaire : une ligne chiffree, une responsabilite -----
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      let tour = 0;
      const envoyes = [];
      await page.route("**/api/claude", (r) => {
        tour += 1;
        try { envoyes.push(r.request().postData() || ""); } catch { envoyes.push(""); }
        const corps = tour === 1 ? QUESTIONS : PREUVES;
        return r.fulfill({
          status: 200, contentType: "application/json",
          body: JSON.stringify({ content: [{ type: "text", text: JSON.stringify(corps) }] }),
        });
      });
      await ouvrirEtLancer(page, CV);

      const bouton = page.getByRole("button", { name: "Preparer mes preuves", exact: true });
      if (await bouton.count() === 0) {
        failures.push(
          "la preparation ne propose pas de defendre les chiffres du CV. Nuvi "
          + "fait ecrire \"78 %\" et laisse la personne le defendre seule."
        );
        await ctx.close();
        return failures;
      }
      await bouton.first().click();
      await page.waitForTimeout(2000);

      // LE PROMPT NE DOIT CONTENIR QUE LES LIGNES QUI AFFIRMENT UN RESULTAT.
      // C'est la preuve que la selection vient du classeur et non du modele.
      const promptPreuve = envoyes[envoyes.length - 1] || "";
      if (!/Marge boissons tenue a 78/.test(promptPreuve)) {
        failures.push(
          "la ligne chiffree n'est pas envoyee au modele : c'est pourtant la "
          + "seule sur laquelle un recruteur peut creuser."
        );
      }
      if (/Responsable du bar et des commandes/.test(promptPreuve)) {
        failures.push(
          "une responsabilite est envoyee comme ligne a defendre. Il n'y a "
          + "rien a prouver dans \"Responsable du bar\", et la faire figurer "
          + "veut dire que le modele choisit les lignes au lieu du classeur."
        );
      }

      const t = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
      if (!/Comment saviez-vous que la marge/.test(t)) {
        failures.push("la question du recruteur ne s'affiche pas.");
      }
      if (!/qui le suivait/.test(t)) {
        failures.push(
          "ce qu'il faut avoir prepare ne s'affiche pas. La question seule "
          + "inquiete sans aider."
        );
      }
      if (!/passe pour invente/.test(t)) {
        failures.push("le point par lequel la ligne s'ecroule ne s'affiche pas.");
      }
      await ctx.close();
    }

    // --- 2. Aucun resultat : on le dit, on ne rend pas une liste vide -----
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      let tour = 0;
      let appelsPreuve = 0;
      await page.route("**/api/claude", (r) => {
        tour += 1;
        if (tour > 1) appelsPreuve += 1;
        return r.fulfill({
          status: 200, contentType: "application/json",
          body: JSON.stringify({ content: [{ type: "text", text: JSON.stringify(tour === 1 ? QUESTIONS : PREUVES) }] }),
        });
      });
      await ouvrirEtLancer(page, CV_SANS_RESULTAT);
      await page.getByRole("button", { name: "Preparer mes preuves", exact: true }).first().click();
      await page.waitForTimeout(1600);

      const t = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
      if (!/n'affirme de resultat/.test(t)) {
        failures.push(
          "un CV sans aucun resultat rend une liste vide, qui se lit comme "
          + "une reussite. C'est l'inverse : il n'y a rien a prouver parce "
          + "qu'il n'y a rien d'affirme, et c'est ce qui fait qu'on ne "
          + "rappelle pas."
        );
      }
      if (appelsPreuve > 0) {
        failures.push(
          "un appel au modele est parti alors qu'aucune ligne n'affirmait de "
          + "resultat. Le classeur le sait sur place : c'est une depense pour "
          + "une reponse deja connue."
        );
      }
      await ctx.close();
    }

    if (!failures.length) {
      console.log(
        "      seules les lignes qui affirment un resultat sont envoyees a "
        + "defendre, la question du recruteur et sa parade s'affichent, et un CV "
        + "sans resultat le dit au lieu de rendre une liste vide"
      );
    }
  } catch (err) {
    failures.push("le test a plante : " + (err && err.message ? err.message : String(err)));
  } finally {
    if (browser) await browser.close();
    if (srv) await stopServer(srv);
  }
  return failures;
}
