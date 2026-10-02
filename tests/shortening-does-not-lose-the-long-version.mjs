// "DONC LA PERSONNE PERD TOUTE LA VALEUR QU'ELLE A MIS DU TEMPS A CONSTRUIRE ?"
//
// Kilian, le 2 octobre 2026, devant le panneau d'avant telechargement : le
// CV fait 1,3 page, et le seul bouton propose de le raccourcir. La question
// est la bonne. Raccourcir enleve des puces, et des puces sont ce qu'on
// ecrit le plus lentement.
//
// CE QUI EXISTAIT, ET POURQUOI CA NE REPONDAIT PAS
//
// pushH() etait bien appele, donc Ctrl+Z revenait en arriere. Mais cet
// historique vit en memoire, douze etats, et il disparait au rechargement.
// Quelqu'un qui raccourcit, telecharge son PDF et revient le lendemain
// n'avait plus que la version courte : le texte long n'existait plus nulle
// part.
//
// La version longue est donc rangee dans Mes CV AVANT la coupe. Mes CV
// (cvf_vs) survit au rechargement et suit le compte d'un appareil a
// l'autre.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

// Assez long pour deborder vraiment d'une feuille : le panneau ne s'ouvre
// que sur un CV qui depasse, et un CV d'essai de dix lignes ne le declenche
// pas. Six postes de six puces, ecrits comme quelqu'un les ecrit.
const PUCES = [
  "Grew annual recurring revenue from one million to four million across three product lines",
  "Managed a team of six engineers and two designers through a full replatforming",
  "Cut onboarding time from six weeks to ten days by rebuilding the first run experience",
  "Ran the pricing migration for two thousand accounts without a single billing incident",
  "Built the churn model that the commercial team still uses every week",
  "Rewrote the quarterly roadmap process so each team could name its own trade offs",
];
const LONG = {
  ...SAMPLE_CV,
  summary: "A long summary written slowly, line by line, over several evenings, "
    + "the kind nobody wants to lose because a panel offered one button.",
  experience: Array.from({ length: 6 }, (_, i) => ({
    id: "e" + (i + 1),
    title: "Senior Product Manager " + (i + 1),
    company: "Company " + (i + 1),
    period: (2024 - i * 3) + " - " + (2026 - i * 3),
    location: "London",
    bullets: PUCES,
  })),
};

// Le CV raccourci que le modele rend : deux puces au lieu de cinq.
const COURT = {
  ...LONG,
  summary: "A short summary.",
  experience: [{ ...LONG.experience[0], bullets: LONG.experience[0].bullets.slice(0, 2) }],
};

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const erreurs = [];
    page.on("pageerror", (e) => erreurs.push(e.message.split("\n")[0].slice(0, 90)));
    await seedApp(page, LONG, { locale: "en" });

    await page.route("**/api/claude", (r) => r.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ content: [{ type: "text", text: JSON.stringify(COURT) }] }),
    }));

    const versionsAvant = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem("cvf_vs") || "[]").length; } catch { return 0; }
    });

    // Le panneau ne s'ouvre qu'au telechargement, et seulement si le
    // document mesure plus d'une feuille : on passe donc par le bouton que
    // la personne utilise.
    await page.waitForTimeout(1500);
    // getByRole ne le trouve pas : la commande porte une icone et son nom
    // accessible ne vaut pas "Download". On clique le texte, comme la
    // personne clique ce qu'elle lit.
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")]
        .find((x) => /^download$/i.test((x.innerText || "").trim()));
      if (b) b.click();
    });
    await page.waitForTimeout(3500);

    // LES DEUX APERCUS SONT LA AVANT TOUT CLIC
    //
    // Premiere version : ils arrivaient APRES avoir clique "Raccourcir".
    // Kilian : "l'apercu doit etre avant le clic". Cliquer un bouton qui
    // coupe du texte en esperant que ce soit le bon choix est exactement ce
    // que cet ecran existe pour supprimer, donc le panneau ne propose plus
    // ce bouton du tout : il montre les deux documents et on en choisit un.
    const resteUnClicAveugle = await page.evaluate(() =>
      [...document.querySelectorAll("button")]
        .some((x) => /shorten to fit one page/i.test((x.innerText || "").trim())));
    if (resteUnClicAveugle) {
      failures.push(
        "le panneau propose encore \"Shorten to fit one page\" : un bouton qui coupe du\n" +
        "      texte avant d'avoir montre ce qu'il coupe."
      );
    }
    const lance = (await page.locator('[data-nuvi="choix-longueur"]').count()) ? "apercus" : null;
    if (!lance) {
      // Le panneau ne s'ouvre qu'au telechargement d'un CV trop long ; dans
      // le harnais la mesure de hauteur depend du rendu. On passe alors par
      // la fonction elle-meme, exposee nulle part : le test le dit plutot
      // que de se declarer vert sans avoir rien exerce.
      failures.push(
        "le panneau d'avant telechargement ne montre aucune comparaison de longueur.\n" +
        "      La personne n'a que le choix de couper a l'aveugle, ou de renoncer."
      );
    } else {
      await page.waitForTimeout(5000);

      // --- LES DEUX LONGUEURS SONT A L'ECRAN, A LA MEME ECHELLE ---------
      //
      // Ranger la version longue dans Mes CV repond a "elle n'est pas
      // perdue". Elle ne repond pas a "laquelle j'envoie" : juger ce qui
      // manque en lisant une phrase de confirmation est impossible. Les deux
      // documents sont donc poses cote a cote et on clique celui qu'on garde.
      const avantCarte = await page.locator('[data-nuvi="choix-avant"]').count();
      const apresCarte = await page.locator('[data-nuvi="choix-apres"]').count();
      if (!avantCarte || !apresCarte) {
        failures.push(
          "les deux longueurs ne sont pas proposees cote a cote (" + avantCarte + " et "
          + apresCarte + ").\n" +
          "      Le CV serait remplace sans que personne ait vu ce qui disparait."
        );
      } else {
        // Rien ne doit etre applique tant que la personne n'a pas choisi.
        const pendant = await page.evaluate(() => {
          try {
            const c = JSON.parse(localStorage.getItem("cvf_d") || "{}");
            return ((c.experience || [])[0] || {}).bullets?.length || 0;
          } catch { return -1; }
        });
        if (pendant !== PUCES.length) {
          failures.push(
            "le CV a deja ete raccourci avant le choix (" + pendant + " puces).\n" +
            "      Un choix qu'on presente apres coup n'en est pas un."
          );
        }
        await page.locator('[data-nuvi="choix-apres"]').click({ timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(400);
        await page.locator('[data-nuvi="choix-garder"]').click({ timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(1500);
      }

      const apres = await page.evaluate(() => {
        let vs = [];
        let cv = {};
        try { vs = JSON.parse(localStorage.getItem("cvf_vs") || "[]"); } catch { /* rien */ }
        try { cv = JSON.parse(localStorage.getItem("cvf_d") || "{}"); } catch { /* rien */ }
        return { vs, puces: ((cv.experience || [])[0] || {}).bullets || [] };
      });

      if (apres.vs.length !== versionsAvant + 1) {
        failures.push(
          "raccourcir n'a range aucune version : " + versionsAvant + " avant, "
          + apres.vs.length + " apres.\n" +
          "      Ctrl+Z vit en memoire et disparait au rechargement : sans version rangee,\n" +
          "      le texte long n'existe plus nulle part des que l'onglet se ferme."
        );
      } else {
        const rangee = apres.vs[apres.vs.length - 1];
        const puces = ((rangee.cv.experience || [])[0] || {}).bullets || [];
        if (puces.length !== LONG.experience[0].bullets.length) {
          failures.push(
            "la version rangee n'est pas la longue : " + puces.length + " puces au lieu de "
            + LONG.experience[0].bullets.length + "."
          );
        }
        if (!/full length|version longue/i.test(String(rangee.name || ""))) {
          failures.push(
            "la version rangee s'appelle \"" + rangee.name + "\" : son nom ne dit pas ce qu'elle est,\n" +
            "      donc personne ne la reconnaitra dans Mes CV dans trois semaines."
          );
        }
      }
      if (apres.puces.length !== 2) {
        failures.push("le CV a l'ecran n'a pas ete raccourci : " + apres.puces.length + " puces");
      }
      if (erreurs.length) failures.push("erreur de page : " + erreurs[0]);
    }
    await ctx.close();

    if (!failures.length) {
      console.log("      la version longue est rangee dans Mes CV avant la coupe, et nommee pour etre reconnue");
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
