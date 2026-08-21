// Une offre trouvee doit devenir une candidature qui porte son annonce.
//
// C'EST LA CHAINE ENTIERE
//
// Toutes les briques existaient separement : la recherche, le suivi,
// l'adaptation du CV, la preparation d'entretien. Ce qui les relie est un seul
// champ, l'annonce, transporte d'un bout a l'autre. S'il se perd en route,
// rien ne casse visiblement : les ecrans s'ouvrent, mais chacun redemande de
// recoller le texte, et le produit redevient ce que font les concurrents.
//
// Ce test suit ce champ depuis la source d'offres jusqu'a la candidature
// enregistree, avec les sources simulees.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

const AD = "Bar Manager for a cocktail led venue in Shoreditch. Team of 12, "
  + "full P&L responsibility, WSET desirable.";

const RESULTS = {
  configured: true,
  sources: ["Adzuna"],
  warnings: [],
  jobs: [{
    id: "4912345", source: "Adzuna",
    title: "Bar Manager", company: "Soho House", location: "London",
    url: "https://example.invalid/jobs/4912345",
    description: AD, postedAt: "2026-08-18T11:20:00Z", salary: "38000 - 45000",
  }],
};

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    // --- 1. sans source branchee, l'ecran l'explique au lieu de rester vide
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
      const page = await ctx.newPage();
      await page.route("**/api/jobs/search**", r => r.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ configured: false, jobs: [], sources: [], warnings: [] }),
      }));
      await seedApp(page, SAMPLE_CV);
      await page.locator('[role="button"], button').filter({ hasText: "Trouver un poste" })
        .first().click({ timeout: 8000 });
      await page.waitForTimeout(1200);
      await page.getByRole("button", { name: /^Chercher$/i }).first().click({ timeout: 8000 });
      await page.waitForTimeout(1500);
      const explains = await page.evaluate(() =>
        /Aucune source d'offres branchee/i.test(document.body.innerText));
      if (!explains) {
        failures.push("sans source branchee, l'ecran ne dit pas quoi faire");
      }
      await ctx.close();
    }

    // --- 2. la chaine complete
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", e => errors.push(e.message.split("\n")[0].slice(0, 90)));
      await page.route("**/api/jobs/search**", r => r.fulfill({
        status: 200, contentType: "application/json", body: JSON.stringify(RESULTS),
      }));
      await page.route("**/api/claude", r => r.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ content: [{ type: "text", text: "{}" }] }),
      }));
      await seedApp(page, SAMPLE_CV);

      await page.locator('[role="button"], button').filter({ hasText: "Trouver un poste" })
        .first().click({ timeout: 8000 });
      await page.waitForTimeout(1200);
      await page.getByRole("button", { name: /^Chercher$/i }).first().click({ timeout: 8000 });
      await page.waitForTimeout(1800);

      const listed = await page.evaluate(() => /Soho House/.test(document.body.innerText));
      if (!listed) { failures.push("l'offre n'apparait pas dans les resultats"); }
      else {
        await page.getByRole("button", { name: /Suivre et adapter/i }).first().click({ timeout: 8000 });
        await page.waitForTimeout(2200);

        const stored = await page.evaluate(() => {
          try { return JSON.parse(localStorage.getItem("cvf_ap")) || []; }
          catch { return []; }
        });
        if (stored.length !== 1) {
          failures.push(`${stored.length} candidature(s) enregistree(s) au lieu d'une`);
        } else {
          const a = stored[0];
          if (a.role !== "Bar Manager") failures.push(`intitule perdu : "${a.role}"`);
          if (a.company !== "Soho House") failures.push(`entreprise perdue : "${a.company}"`);
          if (!a.link) failures.push("lien vers l'annonce perdu");
          // Le champ qui porte toute la chaine.
          if (!a.offer || !a.offer.includes("cocktail led venue")) {
            failures.push(
              "l'ANNONCE n'est pas enregistree avec la candidature. Sans elle, "
              + "l'adaptation du CV, la relance et la preparation d'entretien "
              + "redemanderont de la recoller a chaque fois."
            );
          }
        }

        // Et l'annonce doit deja etre chargee dans l'ecran d'adaptation.
        const prefilled = await page.evaluate(() => {
          const areas = [...document.querySelectorAll("textarea")];
          return areas.some(t => (t.value || "").includes("cocktail led venue"));
        });
        if (!prefilled) {
          failures.push("l'annonce n'est pas pre-remplie dans l'adaptation du CV apres le suivi");
        }
      }

      if (errors.length) failures.push("erreur JS : " + errors[0]);
      await ctx.close();
    }

    if (!failures.length) {
      console.log("      offre trouvee -> candidature suivie avec son annonce -> CV pre-rempli");
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
