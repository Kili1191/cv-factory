// THE CITY YOU TYPED IS THE CITY THAT GETS SEARCHED
//
// Kilian, 7 October 2026: "I put London in the city field and it gives me
// Toronto". The list was not wrong about the search, the search was wrong
// about him: the request went out with no city at all.
//
// Two defects, and only together do they produce a Canadian job.
//
// The sentence path sent the model's reading and nothing else. The comment
// on `runSearch` says the two fields at the top stay the truth; that path did
// not honour it, so a city typed by hand was overwritten AND left out of the
// request whenever the model named none.
//
// And with no city, `locationMatches` lets everything through. A board enters
// the registry on its market and the jobs it serves were never checked again,
// so a British board posting in Toronto reached a British search.
//
// Measured on production the same hour: with the city empty the search
// returned Skegness, Crewe, Bedford and that Toronto role; with London it
// returned London postcodes and London districts.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

const job = (i, where) => ({
  id: "j" + i, source: "ats", title: "Hospitality Staff " + i, company: "Firm " + i,
  location: where, url: "https://example.invalid/" + i,
  description: "Own a portfolio of accounts and run business reviews.",
  created: new Date().toISOString(),
});

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await ctx.newPage();
    const erreurs = [];
    page.on("pageerror", (e) => erreurs.push(String(e.message || e).split("\n")[0].slice(0, 110)));

    const demandes = [];
    await page.route("**/api/jobs/search**", (r) => {
      demandes.push(new URL(r.request().url()));
      return r.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          configured: true,
          jobs: [job(1, "London"), job(2, "Toronto, Canada"), job(3, "Remote")],
          sources: ["career pages"], warnings: [], total: 3, totalExact: true,
          page: 1, hasMore: false, filters: [], undecided: {},
          index: { boards: 265, read: 265, pending: 0 },
        }),
      });
    });
    // The model is replaced by an answer that names no city, which is the
    // case that lost it. What is ours is keeping the person's words, not the
    // translation.
    await page.route("**/api/claude", (r) => r.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ content: [{ type: "text", text: JSON.stringify({
        what: "hospitality", where: "", country: "gb",
        understood: "Hospitality roles.",
      }) }] }),
    }));

    await seedApp(page, SAMPLE_CV);
    await page.locator('[role="button"], button').filter({ hasText: "Trouver un poste" })
      .first().click({ timeout: 8_000 });
    await page.waitForTimeout(900);

    // A city typed by hand, and a sentence that says nothing about a place.
    const champs = page.locator('input[placeholder="Ville ou region"]');
    await champs.first().fill("London", { timeout: 8_000 });
    await page.locator('input[placeholder="Dis ce que tu cherches"]').first()
      .fill("hospitality", { timeout: 8_000 });
    await page.getByRole("button", { name: /^Chercher$/i }).first().click({ timeout: 8_000 });
    await page.waitForTimeout(2500);

    const derniere = demandes[demandes.length - 1];
    if (!derniere) {
      failures.push("no search request was made at all.");
    } else {
      const envoye = derniere.searchParams.get("where") || "";
      if (envoye.toLowerCase() !== "london") {
        failures.push("the city sent to the route is \"" + envoye + "\" and not the London "
          + "typed into the field. With no city the search returns another country and the "
          + "person is never told their words were dropped.");
      }
    }
    // And it has to still be on screen afterwards, or the model quietly
    // emptied the field the person is looking at.
    const surEcran = await page.locator('input[placeholder="Ville ou region"]').first()
      .inputValue().catch(() => "");
    if (surEcran.toLowerCase() !== "london") {
      failures.push("the field now reads \"" + surEcran + "\": reading the sentence erased "
        + "what the person typed, and a search you cannot correct is one you cannot trust.");
    }

    // THE PANEL TAKES THE SCREEN, AND ONLY THE TOP OF IT ANIMATES
    //
    // "it judders when I scroll and the window is too small". The cards are
    // direct children of the sheet body, and the entry animation applied to
    // every direct child: a hundred and twenty animated layers under a full
    // screen backdrop blur.
    const vu = await page.evaluate(() => {
      const f = document.querySelector(".nuvi-feuille");
      const r = f ? f.getBoundingClientRect() : null;
      const enfants = [...document.querySelectorAll(".nuvi-sheet-corps > *")];
      return {
        large: r ? Math.round(r.width) : 0,
        haut: r ? Math.round(r.height) : 0,
        fenetre: [window.innerWidth, window.innerHeight],
        enfants: enfants.length,
        animes: enfants.filter((el) => getComputedStyle(el).animationName !== "none").length,
        retour: !!document.querySelector('[data-nuvi="feuille-retour"]'),
      };
    });
    if (vu.large < vu.fenetre[0] - 2 || vu.haut < vu.fenetre[1] - 2) {
      failures.push("the panel is " + vu.large + "x" + vu.haut + " inside a window of "
        + vu.fenetre.join("x") + ": a list with no natural end is being read through a letterbox.");
    }
    if (!vu.retour) {
      failures.push("full screen covers the backdrop and there is no way back on the panel.");
    }
    if (vu.animes > 8) {
      failures.push(vu.animes + " of " + vu.enfants + " children carry an entry animation. "
        + "Every card on its own layer is what makes a long list judder; only the first "
        + "screenful needs it.");
    }
    for (const e of erreurs) failures.push("JavaScript error, " + e);
    await ctx.close();
  } finally {
    await browser.close();
    await stopServer(server);
  }

  if (!failures.length) {
    console.log("      a city typed by hand survives the sentence and reaches the route, and "
      + "the panel takes the screen with only its first few children animated");
  }
  return failures;
}
