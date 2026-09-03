// Le bouton "Corriger" corrige.
//
// LE DEFAUT
//
// "Quand je mets download, apres je mets fix, et bah y a aucun fix qui se
// fait." Le controle avant telechargement affichait la liste des defauts et
// un bouton "Corriger d'abord". Il refermait le panneau et rendait la main.
// Un bouton qui s'appelle "Corriger" et qui ne corrige rien est pire qu'un
// bouton absent : il promet, puis il laisse la personne devant le meme
// document, en lui ayant pris un clic.
//
// CE QUE CE TEST GARDE
//
//   1. Un clic sur "Corriger" change le CV : le separateur orphelin est
//      parti, la certification creuse est partie. On le lit dans le
//      document, pas dans le panneau.
//   2. Ce qui vient d'etre fait est montre. Sinon le panneau qui se rouvre
//      avec une liste plus courte ressemble a un panneau qui n'a rien fait.
//   3. Ce qui reste est ce qui demande une decision, et seulement ca. Le
//      poste sans ligne reste : personne ne peut ecrire a sa place ce qu'il
//      y a fait.
//   4. Quand tout etait automatique, on continue vers le telechargement :
//      c'est ce que la personne voulait au depart.
//   5. C'est annulable : une correction dans un CV qui ne se defait pas est
//      une decision prise a la place de la personne.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

const CADRATIN = String.fromCharCode(0x2014);

// Deux accidents automatiques et une decision.
const MIXTE = {
  ...SAMPLE_CV,
  experience: [
    { ...SAMPLE_CV.experience[0], id: 1, title: "Account Manager " + CADRATIN,
      company: "Stenn International", bullets: ["Onboarded 60+ SME clients."] },
    { ...SAMPLE_CV.experience[0], id: 2, title: "Customer Service Advisor",
      company: "La Banque Postale", bullets: [] },
  ],
  certifications: ["2023"],
};

// Uniquement des accidents automatiques : "Corriger" doit tout regler et
// continuer vers le telechargement.
const TOUT_AUTOMATIQUE = {
  ...SAMPLE_CV,
  experience: [
    { ...SAMPLE_CV.experience[0], id: 1, title: "Account Manager " + CADRATIN,
      company: "Stenn International", bullets: ["Onboarded 60+ SME clients."] },
  ],
  certifications: ["2023"],
};

async function jouer(browser, cv) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on("pageerror", (e) => erreurs.push(e.message.split("\n")[0].slice(0, 90)));
  await seedApp(page, cv, { locale: "en" });

  const out = { erreurs, panneau: false, apresCorrection: null };
  await page.getByRole("button", { name: /Download|Telecharger/i }).first().click({ timeout: 15_000 });
  await page.waitForTimeout(1200);
  const corriger = page.locator('[data-nuvi="defauts-corriger"]');
  out.panneau = (await corriger.count()) > 0;
  if (!out.panneau) { await ctx.close(); return out; }

  await corriger.first().click({ timeout: 8_000 });
  await page.waitForTimeout(1200);

  out.apresCorrection = {
    corriges: await page.locator('[data-nuvi="defauts-corriges"]').count(),
    corrigerEncore: await page.locator('[data-nuvi="defauts-corriger"]').count(),
    panneauTexte: await page.locator('[data-nuvi="defauts-corriges"]').innerText().catch(() => ""),
    formatOuvert: (await page.getByRole("button", { name: /A4|Standard/i }).count()) > 0,
    // Le document lui-meme, sans les commandes d'edition.
    document: await page.evaluate(() => {
      const el = document.getElementById("cv-print") || document.querySelector('[data-cvf="cv"]');
      return el ? el.innerText : "";
    }),
  };
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(400);
  // 5. ANNULABLE
  //
  // "z" minuscule. Le raccourci ecoute e.key === "z", et Playwright envoie
  // "Z" pour "Control+Z" : la premiere version de ce test a accuse
  // l'annulation de ne pas marcher alors qu'elle restaurait tout, avec sa
  // notification "Undone". Le sondage a la main l'a montre en une minute.
  await page.keyboard.press(process.platform === "darwin" ? "Meta+z" : "Control+z").catch(() => {});
  await page.waitForTimeout(600);
  out.apresAnnulation = await page.evaluate(() => {
    const el = document.getElementById("cv-print") || document.querySelector('[data-cvf="cv"]');
    return el ? el.innerText : "";
  });
  await ctx.close();
  return out;
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    // === CAS MIXTE : deux automatiques, une decision ===
    const m = await jouer(browser, MIXTE);
    for (const e of m.erreurs) failures.push("mixte : erreur JavaScript, " + e);
    if (!m.panneau) {
      failures.push("mixte : le controle avant telechargement ne s'affiche pas "
        + "sur un CV avec un intitule coupe et une certification creuse.");
    } else {
      const a = m.apresCorrection;
      // 1. LE CV A CHANGE
      if (a.document.includes(CADRATIN) || /Account Manager\s*-\s*$/m.test(a.document)) {
        failures.push("mixte : apres \"Corriger\", l'intitule porte encore son "
          + "separateur orphelin. Le bouton ne corrige pas.");
      }
      if (/\b2023\b/.test(a.document) && !/2023\s*-|-\s*2023|2023\s*$/m.test(a.document)) {
        // 2023 seul sur une ligne de certification : la coquille est restee.
        const lignes = a.document.split("\n").map((l) => l.trim());
        if (lignes.includes("2023")) {
          failures.push("mixte : apres \"Corriger\", la certification \"2023\" est "
            + "encore la.");
        }
      }
      // 2. LE TRAVAIL EST MONTRE
      if (!a.corriges) {
        failures.push("mixte : rien ne montre ce qui vient d'etre corrige. Le "
          + "panneau rouvert avec une liste plus courte a l'air de n'avoir "
          + "rien fait.");
      } else if (!/Account Manager/.test(a.panneauTexte)) {
        failures.push("mixte : la liste des corrections ne montre pas le champ "
          + "corrige. Quelqu'un ne reconnait que ce qu'il lit.");
      }
      // 3. NE RESTE QUE CE QUI DEMANDE UNE DECISION
      if (a.corrigerEncore) {
        failures.push("mixte : \"Corriger\" est encore propose alors qu'il ne "
          + "reste que des defauts qui demandent une decision. Le bouton "
          + "recommencerait a ne rien faire.");
      }
      if (a.formatOuvert) {
        failures.push("mixte : le telechargement a continue alors qu'un poste "
          + "sans ligne reste. On a laisse partir un CV en sachant.");
      }
      // 5. ANNULABLE
      if (m.apresAnnulation && !m.apresAnnulation.includes("2023")
          && !/Account Manager\s*-/.test(m.apresAnnulation)) {
        failures.push("mixte : l'annulation ne ramene pas le CV d'avant. Une "
          + "correction qui ne se defait pas est une decision prise a la "
          + "place de la personne.");
      }
    }

    // === CAS TOUT AUTOMATIQUE : on continue vers le telechargement ===
    const t = await jouer(browser, TOUT_AUTOMATIQUE);
    for (const e of t.erreurs) failures.push("automatique : erreur JavaScript, " + e);
    if (!t.panneau) {
      failures.push("automatique : le controle ne s'affiche pas.");
    } else if (!t.apresCorrection.formatOuvert && t.apresCorrection.corrigerEncore) {
      failures.push("automatique : tout etait corrigeable d'un clic, et apres "
        + "\"Corriger\" le telechargement ne continue pas. La personne a "
        + "clique Telecharger : c'est ce qu'elle voulait.");
    }

    if (!failures.length) {
      console.log("      \"Corriger\" corrige, montre ce qu'il a fait, laisse ce "
        + "qui demande une decision, et s'annule");
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
