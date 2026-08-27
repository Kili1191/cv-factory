// La langue est demandee une fois, puis plus jamais.
//
// POURQUOI CE TEST EXISTE
//
// Nuvi vise le marche britannique ET le marche francais. Ouvrir en francais
// pour un Londonien lui demande de trouver un reglage avant de comprendre ce
// qu'il regarde ; ouvrir en anglais pour un Parisien pose exactement le meme
// probleme dans l'autre sens. On ne devine donc pas : on demande, a la
// premiere visite, et une seule fois.
//
// Trois facons de casser ca, toutes silencieuses - la page s'affiche, dans la
// mauvaise langue ou avec un ecran de trop :
//
//   1. La question ne se pose plus. Un visiteur francais atterrit en anglais
//      sans qu'on lui ait rien demande. C'est l'etat d'avant.
//   2. La question se repose. A chaque visite, a chaque rechargement : le
//      reglage enregistre n'est pas relu, et l'ecran devient un peage.
//   3. La question ecrase un choix. Quelqu'un qui avait pris le francais le
//      reperd. C'est le pire des trois, parce qu'il se repete.
//
// CE QU'IL VERIFIE
//
//   1. Un visiteur neuf est INTERROGE, et l'ecran est bien devant le reste.
//   2. La suggestion suit le navigateur - fr-FR propose le francais, en-GB
//      l'anglais, de-DE ne propose rien - mais rien n'est applique sans clic.
//   3. Repondre applique la langue, l'enregistre, et referme l'ecran.
//   4. Un rechargement ne repose pas la question.
//   5. Quelqu'un qui avait deja choisi n'est jamais interroge et garde sa
//      langue.
//   6. Le document DECLARE la langue qu'il affiche. C'est ce que lisent
//      Google et les lecteurs d'ecran ; du francais annonce comme anglais est
//      lu a voix haute avec le mauvais accent.

import { startServer, stopServer, launchBrowser, BASE_URL, APP_URL } from "./lib/harness.mjs";

// Des mots qui n'existent que dans une seule des deux langues, et qui sont
// affiches sur l'ecran d'arrivee.
const ANGLAIS = /Here's what I do|See the difference|I already have a CV/i;
const FRANCAIS = /Voila ce que je fais|Regarde la difference|J'ai deja un CV/i;

const ASK = '[data-nuvi-lang-ask="1"]';

// choixDeja : la langue a poser dans le stockage local AVANT que
// l'application ne demarre, pour rejouer le cas de quelqu'un qui est deja
// venu. On passe une vraie fonction a evaluate et non une chaine : une
// chaine "() => ..." est evaluee comme une EXPRESSION, donc la fonction est
// creee et jamais appelee - le stockage reste vide et le test croit avoir
// prepare un visiteur connu alors qu'il en teste un neuf.
async function ouvrir(browser, { locale, choixDeja } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, locale });
  const page = await ctx.newPage();
  await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
  if (choixDeja) {
    await page.evaluate((lc) => localStorage.setItem("cvf_c", JSON.stringify(lc)), choixDeja);
    const pose = await page.evaluate(() => localStorage.getItem("cvf_c"));
    if (pose !== JSON.stringify(choixDeja)) {
      throw new Error(`preparation du test impossible : cvf_c vaut ${pose}`);
    }
    await page.reload({ waitUntil: "domcontentloaded" });
  }
  await page.waitForTimeout(3200);
  return { ctx, page };
}

function etat(page) {
  return page.evaluate((sel) => {
    const d = document.querySelector(sel);
    const boutons = d
      ? [...d.querySelectorAll("button")].map((b) => ({
          langue: b.getAttribute("lang"),
          texte: (b.innerText || "").replace(/\s+/g, " ").trim(),
        }))
      : [];
    return {
      demande: !!d,
      boutons,
      lang: document.documentElement.lang,
      titre: document.title,
      stocke: localStorage.getItem("cvf_c"),
      texte: (document.body.innerText || "").replace(/\s+/g, " "),
    };
  }, ASK);
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    // --- 1 et 2. Le visiteur neuf est interroge, la suggestion suit -----
    //
    // Trois navigateurs, trois attentes differentes sur la SEULE suggestion.
    // Aucun des trois ne doit voir une langue appliquee d'office.
    for (const [navigateur, attendu] of [["fr-FR", "fr"], ["en-GB", "en"], ["de-DE", null]]) {
      const { ctx, page } = await ouvrir(browser, { locale: navigateur });
      const vu = await etat(page);

      if (!vu.demande) {
        failures.push(
          `navigateur ${navigateur} : la question de la langue n'est pas posee a `
          + "un visiteur neuf. Il subit la langue par defaut sans qu'on lui "
          + `demande. Debut de l'ecran : "${vu.texte.slice(0, 80)}"`
        );
      } else {
        const langues = vu.boutons.map((b) => b.langue).filter(Boolean).sort();
        if (langues.join(",") !== "en,fr") {
          failures.push(
            `navigateur ${navigateur} : l'ecran ne propose pas exactement les deux `
            + `langues. Boutons trouves : ${JSON.stringify(vu.boutons.map((b) => b.texte))}`
          );
        }
        // La pastille de suggestion, et rien d'autre, doit bouger avec le
        // navigateur. Elle est le seul mot de l'ecran qui en depende.
        const propose = vu.boutons
          .filter((b) => /suggested|suggéré|suggere/i.test(b.texte))
          .map((b) => b.langue);
        const dit = propose.join(",");
        const veut = attendu === null ? "" : attendu;
        if (dit !== veut) {
          failures.push(
            `navigateur ${navigateur} : la suggestion devrait etre `
            + `${attendu === null ? "absente" : `"${attendu}"`} et vaut "${dit || "aucune"}"`
          );
        }
      }

      // Rien n'est enregistre tant que personne n'a repondu : sinon la
      // question ne se reposerait jamais alors qu'elle n'a pas eu de reponse.
      if (vu.stocke != null) {
        failures.push(
          `navigateur ${navigateur} : une langue (${vu.stocke}) est enregistree `
          + "avant que le visiteur ait repondu"
        );
      }
      await ctx.close();
    }

    // --- 3 et 4. Repondre applique, enregistre, et ne se repose pas -----
    //
    // On repond FRANCAIS depuis un navigateur anglais, pour prouver que c'est
    // bien le clic qui decide et pas le navigateur.
    {
      const { ctx, page } = await ouvrir(browser, { locale: "en-GB" });
      // Si la question n'est plus posee, le clic expire au bout de 30s avec
      // "locator.click: Timeout" - un message qui parle d'un clic et pas de
      // langue, et qui emporte au passage les constats deja faits plus haut.
      // On verifie donc d'abord, et on dit ce qui manque.
      if (!(await page.locator(ASK).count())) {
        failures.push(
          "impossible de repondre a la question : elle n'est pas affichee pour "
          + "un visiteur neuf. Le reste du parcours (enregistrement, "
          + "non-repetition) n'a donc pas pu etre verifie."
        );
        await ctx.close();
        return finir(failures, browser, server);
      }
      await page.locator(`${ASK} button[lang="fr"]`).click();
      await page.waitForTimeout(2000);
      const apres = await etat(page);

      if (apres.demande) {
        failures.push("la question reste affichee apres qu'on y a repondu");
      }
      if (apres.stocke !== JSON.stringify("fr")) {
        failures.push(
          `la reponse n'est pas enregistree : cvf_c vaut ${apres.stocke} et non "fr". `
          + "La question se reposera a la prochaine visite."
        );
      }
      if (!FRANCAIS.test(apres.texte)) {
        failures.push(
          "on a repondu francais et l'ecran reste en anglais. Debut : "
          + `"${apres.texte.slice(0, 80)}"`
        );
      }
      if (apres.lang !== "fr") {
        failures.push(
          `l'ecran affiche du francais mais le document se declare lang="${apres.lang}". `
          + "Les lecteurs d'ecran le liront avec le mauvais accent."
        );
      }

      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3200);
      const relance = await etat(page);
      if (relance.demande) {
        failures.push(
          "la question se repose au rechargement alors qu'elle a deja eu une "
          + "reponse. L'ecran devient un peage a chaque visite."
        );
      }
      if (!FRANCAIS.test(relance.texte)) {
        failures.push("le francais choisi n'est pas retrouve apres rechargement");
      }
      await ctx.close();
    }

    // --- 5. Un choix deja fait n'est ni ecrase ni requestionne ----------
    //
    // Y COMPRIS QUAND CE CHOIX EST L'ANGLAIS. C'est le cas qui se casse tout
    // seul : "anglais" est aussi la valeur par defaut, donc un code qui
    // confond "absent" et "vaut en" reposera la question a quelqu'un qui a
    // deja repondu anglais, indefiniment.
    for (const choix of ["fr", "en"]) {
      const { ctx, page } = await ouvrir(browser, {
        locale: choix === "fr" ? "en-GB" : "fr-FR",
        choixDeja: choix,
      });
      const vu = await etat(page);

      if (vu.demande) {
        failures.push(
          `quelqu'un qui avait deja choisi "${choix}" se voit reposer la question`
        );
      }
      const bonneLangue = choix === "fr" ? FRANCAIS : ANGLAIS;
      const autre = choix === "fr" ? ANGLAIS : FRANCAIS;
      if (!bonneLangue.test(vu.texte)) {
        failures.push(
          `le choix "${choix}" n'est pas respecte. Debut de l'ecran : `
          + `"${vu.texte.slice(0, 80)}"`
        );
      }
      if (autre.test(vu.texte)) {
        failures.push(`le choix "${choix}" laisse passer du texte dans l'autre langue`);
      }
      if (vu.lang !== choix) {
        failures.push(`choix "${choix}" : le document se declare lang="${vu.lang}"`);
      }
      if (choix === "en" && /le CV qui passe/i.test(vu.titre)) {
        failures.push(`le titre de l'onglet est reste en francais : "${vu.titre}"`);
      }
      await ctx.close();
    }

    return finir(failures, browser, server);
  } catch (err) {
    failures.push(`le test a plante : ${err && err.message}`);
    return finir(failures, browser, server);
  }
}

// Un seul endroit ferme le navigateur et le serveur, et un seul endroit dit
// que tout va bien : sortir par trois chemins differents laissait un
// "next start" derriere lui quand le test plantait au milieu.
async function finir(failures, browser, server) {
  try { await browser.close(); } catch { /* deja ferme */ }
  await stopServer(server);
  if (!failures.length) {
    console.log(
      "      la langue est demandee une fois : suggestion selon le navigateur, "
      + "reponse enregistree, jamais reposee, document declare la bonne langue"
    );
  }
  return failures;
}
