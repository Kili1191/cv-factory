// Le compagnon veille sur le CV, en continu, et il ne crie pas pour rien.
//
// CE QUE KILIAN A DEMANDE
//
// "Le compagnon Nuvi doit toujours verifier et s'assurer de la plus haute
// qualite, dans le design comme dans le contenu." Il venait de telecharger
// un CV avec "Account Manager (cadratin)" comme intitule, pendant qu'un
// compagnon anime souriait dans le coin de l'ecran. Un compagnon qui regarde
// ca pendant une heure sans rien dire n'est pas un compagnon, c'est une
// decoration.
//
// CE QUE CE TEST GARDE, ET DANS QUEL ORDRE
//
//   1. Sur un CV casse, le compagnon porte un chiffre, et c'est le bon.
//   2. Sur un CV propre, il ne porte RIEN. C'est le controle qui compte :
//      un badge qui reste allume sur un CV correct est ignore dans la
//      journee, et il emmene avec lui la confiance dans tout ce que le
//      compagnon dira ensuite.
//   3. Le chiffre ouvre la liste, avec le texte exact de chaque defaut, et
//      SANS "telecharger quand meme" : depuis le compagnon il n'y a rien a
//      faire quand meme, on n'est pas en train de partir.
//   4. Le badge est un frere du bouton du compagnon, pas un enfant. Un
//      bouton dans un bouton n'est pas du HTML, et le compagnon se deplace a
//      la souris : un enfant cliquable y declencherait le glissement.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

const CADRATIN = String.fromCharCode(0x2014);

// LES ACCIDENTS DOIVENT SURVIVRE A LA PORTE
//
// normCV nettoie tout CV a l'entree, y compris celui que le stockage rend a
// l'ouverture : un tiret long ou une certification "2023" posee dans
// localStorage a disparu avant que le compagnon regarde. Les accidents d'ici
// sont ceux que la porte laisse passer et que "Corriger" repare : une annee
// repetee en bout de diplome, une puce recopiee.
const CV_CASSE = {
  ...SAMPLE_CV,
  experience: [
    { ...SAMPLE_CV.experience[0], id: 1, title: "Account Manager",
      company: "Stenn International",
      bullets: ["Onboarded 60+ SME clients.", "Onboarded 60+ SME clients."] },
    { ...SAMPLE_CV.experience[0], id: 2, title: "Customer Service Advisor",
      company: "La Banque Postale", bullets: [] },
  ],
  education: [{ id: 1, degree: "NVQ Level 3 in Health and Social Care 2020",
    school: "Manchester College", period: "2020" }],
};

async function mesurer(browser, cv, viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on("pageerror", (e) => erreurs.push(e.message.split("\n")[0].slice(0, 90)));
  await seedApp(page, cv, { locale: "en" });
  await page.waitForTimeout(800);

  const badge = page.locator('[data-nuvi="badge-defauts"]');
  const present = (await badge.count()) > 0;
  const compte = present ? Number(await badge.first().getAttribute("data-nuvi-compte")) : 0;

  // Frere, pas enfant : aucun bouton ne doit contenir le badge.
  const imbrique = present
    ? await badge.first().evaluate((b) => !!b.parentElement.closest("button"))
    : false;

  let liste = null;
  if (present) {
    await badge.first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(700);
    liste = {
      corriger: await page.locator('[data-nuvi="defauts-corriger"]').count(),
      quandMeme: await page.locator('[data-nuvi="defauts-quand-meme"]').count(),
      texte: await page.locator("body").innerText(),
    };
  }
  await ctx.close();
  return { present, compte, imbrique, liste, erreurs };
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    for (const [nom, vp] of [["ordinateur", { width: 1440, height: 950 }],
                             ["telephone", { width: 390, height: 844 }]]) {
      // 1. UN CV CASSE : LE CHIFFRE, ET LE BON
      const casse = await mesurer(browser, CV_CASSE, vp);
      for (const e of casse.erreurs) failures.push(nom + " : erreur JavaScript, " + e);
      if (!casse.present) {
        failures.push(nom + " : le CV porte une annee doublee, une puce "
          + "recopiee et un poste muet, et le compagnon ne dit "
          + "rien. Il regarde un document casse en souriant.");
      } else {
        // Trois accidents : l'annee doublee, la puce recopiee, le poste
        // sans puce. Le chiffre doit les compter, pas en inventer.
        if (casse.compte !== 3) {
          failures.push(nom + " : le compagnon affiche " + casse.compte
            + " alors que le CV a exactement 3 accidents de structure. Un "
            + "chiffre faux est pire qu'aucun chiffre.");
        }
        if (casse.imbrique) {
          failures.push(nom + " : le badge est DANS le bouton du compagnon. "
            + "Un bouton dans un bouton n'est pas du HTML, et le compagnon "
            + "se deplace a la souris : le clic declenchera le glissement.");
        }
        // 3. LE CHIFFRE OUVRE LA LISTE, SANS "QUAND MEME"
        if (!casse.liste || !casse.liste.corriger) {
          failures.push(nom + " : cliquer le chiffre n'ouvre pas la liste des "
            + "defauts. Un compte qu'on ne peut pas ouvrir est une "
            + "accusation sans explication.");
        } else {
          if (casse.liste.quandMeme) {
            failures.push(nom + " : la liste ouverte depuis le compagnon "
              + "propose \"telecharger quand meme\". On n'est pas en train "
              + "de partir : il n'y a rien a faire quand meme.");
          }
          if (!casse.liste.texte.includes("NVQ Level 3")) {
            failures.push(nom + " : la liste ne montre pas le texte exact du "
              + "champ fautif. Quelqu'un ne corrige que ce qu'il reconnait.");
          }
        }
      }

      // 2. UN CV PROPRE : RIEN
      const propre = await mesurer(browser, SAMPLE_CV, vp);
      for (const e of propre.erreurs) failures.push(nom + " : erreur JavaScript, " + e);
      if (propre.present) {
        failures.push(nom + " : le compagnon affiche " + propre.compte
          + " sur le CV de reference, qui n'a aucun accident de structure. "
          + "Un badge allume sur un CV correct est ignore dans la journee, "
          + "et il emmene la confiance dans tout ce que le compagnon dira.");
      }
    }

    if (!failures.length) {
      console.log("      le compagnon compte 3 accidents sur le CV casse, "
        + "rien sur le CV propre, sur les deux appareils");
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
