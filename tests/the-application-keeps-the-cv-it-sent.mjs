// The application keeps the CV it sent.
//
// A hundred applications means a hundred fitted CVs, and a recruiter who
// calls three weeks later about "the CV you sent us". The tracker row knew
// the ad, the company and the status; it did not know the file. Now the CV,
// as it left through the fit or through the writer, is kept on the row,
// and one tap in the tracker puts it back in the editor.
//
// The model is a mock. What is proven is that the row holds the CV the
// person saw, and that the tracker gives it back.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV, APP_URL } from "./lib/harness.mjs";

const ANNONCE = "Care Assistant wanted for a residential home in Manchester. "
  + "You will support 14 residents with personal care, medication and daily "
  + "records. NVQ Level 3 preferred. Night shifts available. Full training "
  + "given. Apply with a CV that shows your care experience.";

const ADAPTE = {
  match_score: 81, job_title: "Care Assistant", company: "Elmwood House",
  key_requirements: ["medication"], keywords_matched: ["medication"], keywords_to_add: [],
  hidden_signals: [], culture_decode: "", seniority_decode: "", likely_interview_questions: [],
  cover_letter_hook: "",
  cv_optimized: { ...SAMPLE_CV, title: "Care Assistant (kept by the mock)",
    summary: "Care Assistant, medication trained, 14 residents a night." },
};
const ECRIT = { ...SAMPLE_CV, name: "Written From The Ad", title: "Care Assistant",
  experience: [{ title: "Care Assistant", company: "Employer to fill in", period: "2024 - 2026",
    location: "Manchester", bullets: ["Supported residents with personal care."] }],
  deduit: ["experience.0.company"] };

async function ouvrir(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on("pageerror", (e) => erreurs.push(String(e && e.message || e).split("\n")[0]));
  await page.route("**/api/claude", async (route) => {
    let corps = {};
    try { corps = JSON.parse(route.request().postData() || "{}"); } catch { corps = {}; }
    const t = corps.task_name || "";
    const reponse = t === "match" ? ADAPTE
      : (t === "cv-from-offer" || t === "cv-from-offer-reprise") ? ECRIT : {};
    await route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ content: [{ type: "text", text: JSON.stringify(reponse) }] }) });
  });
  await seedApp(page, SAMPLE_CV, { locale: "en" });
  // The shortcut: New ad, the ad in the focused field.
  await page.locator('[data-cvf="annonce"]').first().click({ timeout: 8000 });
  const zone = page.locator('textarea[data-nuvi="match-annonce"]').first();
  await zone.fill(ANNONCE);
  await page.waitForTimeout(400);
  return { ctx, page, erreurs };
}

const lignes = (page) => page.evaluate(() => {
  try { return JSON.parse(localStorage.getItem("cvf_ap") || "[]"); } catch { return []; }
});
const texteDuCv = (page) => page.evaluate(() => (document.getElementById("cv-print") || {}).innerText || "");

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    // --- 1. The fit: the row keeps the fitted CV, and the tracker gives it back
    {
      const { ctx, page, erreurs } = await ouvrir(browser);
      await page.locator('[data-nuvi="match-choix"][data-nuvi-choix="actuel"]').click({ timeout: 5000 });
      await page.waitForTimeout(2500);
      // "Download this CV" records the application and opens the format choice.
      const dl = page.locator('[data-nuvi="match-dl"]');
      if (!(await dl.count())) failures.push("no Download button in the fit result");
      else { await dl.click(); await page.waitForTimeout(800); }

      const rows = await lignes(page);
      const row = rows.find((r) => r && r.cv);
      if (!rows.length) failures.push("the fit left no application row");
      else if (!row) failures.push("the application row does not keep the CV that was sent");
      else {
        if (!/kept by the mock/.test(row.cv.title || "")) {
          failures.push("the row keeps another CV than the fitted one (title: \"" + row.cv.title + "\")");
        }
        if (row.company !== "Elmwood House") failures.push("the row lost the company (saw \"" + row.company + "\")");
      }

      // Time passes, the editor holds something else. The tracker must
      // still hand back the CV that left.
      await page.evaluate((cv) => localStorage.setItem("cvf_d", JSON.stringify(cv)),
        { ...SAMPLE_CV, title: "Something Else Entirely" });
      await page.goto(APP_URL + "?go=tracking", { waitUntil: "networkidle" });
      await page.waitForTimeout(2000);
      const avant = await texteDuCv(page);
      if (!/Something Else Entirely/i.test(avant)) failures.push("the editor did not take the other CV before the reopening");
      const reopen = page.locator('[data-nuvi="ap-reopen"]');
      if (!(await reopen.count())) failures.push("the tracker offers no way to reopen the CV that was sent");
      else {
        const etiquette = (await reopen.first().innerText()).trim();
        if (!/Reopen the CV I sent/.test(etiquette)) failures.push("the reopen button says \"" + etiquette + "\"");
        await reopen.first().click();
        await page.waitForTimeout(1500);
        const apres = await texteDuCv(page);
        if (!/kept by the mock/i.test(apres)) {
          failures.push("after reopening, the CV that was sent is not on screen (saw: \"" + apres.slice(0, 60) + "\")");
        }
        if (await page.locator('[data-nuvi="ap-reopen"]').count()) {
          failures.push("the tracker stayed open over the CV it just reopened");
        }
      }
      if (erreurs.length) failures.push("JS error: " + [...new Set(erreurs)].slice(0, 2).join(" | "));
      await ctx.close();
    }

    // --- 2. The writer: a CV written from the ad is kept the same way
    {
      const { ctx, page, erreurs } = await ouvrir(browser);
      await page.locator('[data-nuvi="match-choix"][data-nuvi-choix="creer"]').click({ timeout: 5000 });
      await page.waitForTimeout(3500);
      const rows = await lignes(page);
      const row = rows.find((r) => r && r.cv);
      if (!row) failures.push("a CV written from the ad leaves a row without the CV");
      else if (row.cv.name !== "Written From The Ad") {
        failures.push("the row keeps another CV than the one written (name: \"" + row.cv.name + "\")");
      }
      if (erreurs.length) failures.push("JS error: " + [...new Set(erreurs)].slice(0, 2).join(" | "));
      await ctx.close();
    }

    if (!failures.length) {
      console.log("      the fitted CV and the written CV stay on their application row, and the tracker puts either back on screen");
    }
  } catch (err) {
    failures.push("the test itself crashed: " + (err && err.message));
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
