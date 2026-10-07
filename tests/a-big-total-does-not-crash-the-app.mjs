// A CLIENT SIDE EXCEPTION IS NOT A BROKEN PANEL, IT IS THE ERROR PAGE
//
// WHAT HAPPENED, AND WHY EVERYTHING WAS GREEN
//
// The results line called `L.sur(...)`. That string had been split into `of`
// and `ofFound` and the call site kept the old name, so `L.sur` was
// undefined, calling it threw, React unmounted the tree and the whole of
// /app became "Application error: a client-side exception has occurred".
// Not the job search: the product.
//
// Nothing caught it. The lint carries one rule, `no-undef`, and `L.sur` is a
// property on an object, not an undefined identifier. The build passed. Every
// suite passed. And it was dormant for a day, because the branch only runs
// when the total is bigger than the page: with career pages alone the two are
// equal, so no test and no human ever ran that line. The hour Adzuna and Reed
// went live it became 8781 against 120 shown, and it fired on every search.
//
// A DEFECT CAN SHIP GREEN AND WAIT FOR A KEY
//
// So the fixture here is the one the old suites never had: a source that
// declares far more than it returns, which is what every aggregator does.
// Both ways, because the exact and the approximate total are two different
// strings and only one of them was ever rendered.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

const job = (i) => ({
  id: "j" + i, source: "Adzuna", title: "Account Manager " + i, company: "Firm " + i,
  location: "London", url: "https://example.invalid/" + i,
  description: "Own a portfolio of enterprise accounts, lead renewals and upsell.",
  created: new Date().toISOString(),
});

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    for (const [name, totalExact] of [["an exact total", true], ["an approximate total", false]]) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
      const page = await ctx.newPage();
      const erreurs = [];
      page.on("pageerror", (e) => erreurs.push(String(e.message || e).split("\n")[0].slice(0, 120)));

      await page.route("**/api/jobs/search**", (r) => r.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          configured: true, jobs: Array.from({ length: 12 }, (_, i) => job(i)),
          sources: ["Adzuna", "Reed", "career pages"], warnings: [],
          // The whole point: far more declared than returned.
          total: 8781, totalExact, page: 1, hasMore: true,
          filters: [], undecided: {}, index: { boards: 265, read: 265, pending: 0 },
        }),
      }));
      await seedApp(page, SAMPLE_CV);
      await page.locator('[role="button"], button').filter({ hasText: "Trouver un poste" })
        .first().click({ timeout: 8000 });
      await page.waitForTimeout(900);
      await page.getByRole("button", { name: /^Chercher$/i }).first().click({ timeout: 8000 });
      await page.waitForTimeout(2200);

      const vu = await page.evaluate(() => ({
        texte: document.body.innerText,
        casse: /Application error|client-side exception/i.test(document.body.innerText),
      }));

      if (vu.casse) {
        failures.push(name + ": the whole app is replaced by its error page. A total "
          + "larger than the page is what every aggregator returns.");
      }
      for (const e of erreurs) {
        failures.push(name + ": JavaScript error, " + e);
      }
      // The line has to be there AND carry both numbers, or it is a crash
      // traded for a silence.
      if (!vu.casse && !/8\s?781/.test(vu.texte)) {
        failures.push(name + ": the total of 8781 is not shown, so the line that used to "
          + "crash now says nothing at all: a crash traded for a silence.");
      }
      if (!vu.casse && !/12/.test(vu.texte)) {
        failures.push(name + ": the number of jobs shown does not appear.");
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }

  if (!failures.length) {
    console.log("      a total larger than the page is displayed instead of replacing the "
      + "application with its error page, exact and approximate alike");
  }
  return failures;
}
