// "How do you know you filled it with the best one?"
//
// The honest answer, before this, was that nobody knew. The product asked a
// model for the best possible CV, got back something plausible, and shipped
// it under the word "ready". The only guarantee on offer was a promise.
//
// So the generation now measures what it wrote, with the three readers the
// product already owned and ran nowhere: the six parser profiles, the
// coverage of THIS job ad, and the nine-axis diagnostic. All local, all
// deterministic, all free, so they can run on every generation.
//
// WHAT THIS TEST HOLDS, AND WHY EACH PART EARNED ITS PLACE
//
//   1. A weak first draft costs exactly one corrective pass. Not zero, which
//      would mean the measurement is decorative. Not three, which would
//      quietly triple what a generation costs the user.
//   2. A second draft that measures WORSE is thrown away. This is the part
//      that is easy to get wrong and impossible to notice: keeping the last
//      answer instead of the best one ships a CV worse than the one the
//      product already had, and it would look like a normal generation.
//   3. The numbers are shown. A measurement the person cannot see does not
//      answer their question, and this whole feature exists because they
//      stopped taking my word for it.

import { startServer, stopServer, launchBrowser, seedApp } from "./lib/harness.mjs";

// UN CV FAIBLE, MAIS PAS VIDE
//
// Il porte un poste et une date, donc il passe le parseur assez pour etre un
// document ; il n'a ni competences ni puces chiffrees, et surtout aucun des
// mots de l'annonce. La mesure a donc de quoi trouver a redire, ce qui est la
// condition pour que la reprise se declenche.
const FAIBLE = {
  name: "Sam Ortiz", title: "Serveur", email: "sam@example.com",
  phone: "0600000000", location: "Lyon", summary: "Serveur.",
  experience: [{ role: "Serveur", company: "Le Bistrot", location: "Lyon",
    period: "2021 - 2024", bullets: ["Service en salle."] }],
  education: [], skills: [], languages: [], deduit: [],
};

// PIRE QUE LE PREMIER, ET DE FACON MESURABLE
//
// Plus de dates, plus d'employeur : les profils d'analyseur le perdent. C'est
// exactement le genre de degradation qu'une seconde passe produit quand elle
// reformule pour caser des mots-cles, et c'est pour ca qu'on mesure les deux
// au lieu de garder le dernier.
const PIRE = {
  name: "Sam Ortiz", title: "", email: "", phone: "", location: "",
  summary: "Barista latte art cafe", experience: [
    { role: "Barista", company: "", location: "", period: "", bullets: [] }],
  education: [], skills: [], languages: [], deduit: [],
};

const ANNONCE = "Nous recrutons un Barista pour notre cafe de specialite a "
  + "Lyon. Vous maitrisez l'extraction espresso, le latte art, le moulin et "
  + "le reglage de la mouture. Vous assurez l'encaissement, la mise en place "
  + "et l'hygiene HACCP. Experience en cafe de specialite appreciee. Anglais "
  + "courant demande pour la clientele internationale.";

export async function run() {
  const failures = [];
  let srv = null;
  let browser = null;
  try {
    srv = await startServer();
    browser = await launchBrowser();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();

    const appels = [];
    await page.route("**/api/claude", (r) => {
      let corps = {};
      try { corps = JSON.parse(r.request().postData() || "{}"); } catch { corps = {}; }
      appels.push(corps);
      const n = appels.filter((a) => String(a.task_name || "").startsWith("cv-from-offer")).length;
      // Premier appel : le CV faible. Deuxieme : un CV pire. Le produit doit
      // garder le premier.
      const rendu = n === 1 ? FAIBLE : PIRE;
      return r.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ content: [{ type: "text", text: JSON.stringify(rendu) }] }),
      });
    });

    // CV vide : c'est la condition pour que l'ecran d'arrivee s'affiche, donc
    // pour que le chemin "je pars de l'annonce" existe.
    await seedApp(page, {}, { locale: "fr" });

    await page.locator('[data-nuvi="home-offre"]').first().click();
    await page.waitForSelector('[data-nuvi="offre-annonce"]', { timeout: 8000 });
    await page.locator('[data-nuvi="offre-annonce"]').fill(ANNONCE);
    await page.locator('[data-nuvi="offre-parcours"]').fill(
      "J'ai fait serveur trois ans au Bistrot a Lyon, 2021 a 2024. Je sais "
      + "faire le cafe et l'encaissement.");
    await page.locator('[data-nuvi="offre-cta"]').click();

    await page.waitForSelector('[data-nuvi="mesure"]', { timeout: 30000 });

    const genese = appels.filter((a) => String(a.task_name || "").startsWith("cv-from-offer"));
    const reprises = genese.filter((a) => a.task_name === "cv-from-offer-reprise");

    // 1. Une reprise, une seule.
    if (reprises.length !== 1) {
      failures.push(
        "un CV faible declenche " + reprises.length + " passe(s) de correction, "
        + "il en faut exactement une : zero veut dire que la mesure ne sert a "
        + "rien, plus d'une multiplie ce que la generation coute a la personne."
      );
    }

    // La consigne de reprise doit nommer ce qui manque, pas dire "fais mieux".
    const consigne = reprises.length ? String(reprises[0].prompt || "") : "";
    if (consigne && !/latte art|espresso|mouture|HACCP/i.test(consigne)) {
      failures.push(
        "la passe de correction ne cite aucun mot de l'annonce absent du CV. "
        + "Une consigne qui ne nomme rien ne corrige rien."
      );
    }

    // 2. Le pire des deux est jete.
    const garde = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem("cvf_d") || "{}"); } catch { return {}; }
    });
    const boites = (garde.experience || []).map((e) => String(e.company || ""));
    if (!boites.some((c) => /Bistrot/i.test(c))) {
      failures.push(
        "le CV garde n'est pas le meilleur des deux : la seconde passe mesurait "
        + "plus bas et c'est elle qui a ete livree. Employeurs trouves : "
        + (boites.join(", ") || "aucun") + "."
      );
    }

    // 3. Les chiffres sont montres.
    for (const k of ["ats", "couverture", "diagnostic"]) {
      const vu = await page.locator('[data-nuvi-chiffre="' + k + '"]').count();
      if (!vu) {
        failures.push(
          "le chiffre \"" + k + "\" n'est pas affiche. Une mesure que la "
          + "personne ne voit pas ne repond pas a sa question."
        );
      }
    }

    const texte = await page.locator('[data-nuvi="mesure"]').innerText();
    if (!/\d+\s*\/\s*6/.test(texte)) {
      failures.push(
        "la carte de mesure n'affiche pas le compte d'analyseurs. Texte lu : "
        + texte.slice(0, 160)
      );
    }

    await ctx.close();
  } catch (e) {
    failures.push("erreur inattendue : " + (e && e.message ? e.message : String(e)));
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (srv) await stopServer(srv);
  }
  return failures;
}
