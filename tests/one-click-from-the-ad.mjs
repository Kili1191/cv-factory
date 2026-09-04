// One click from the ad: choose the CV, and the best one is on screen.
//
// WHAT THE OWNER ASKED FOR
//
// "Paste the offer, then Nuvi lets me choose the CV registered in the
// website, a pop-up comes, I click on it, and it automatically makes the
// best CV possible to pass through ATS. Also the opportunity to let Nuvi
// create a CV for this role."
//
// So, on the Match panel, once the ad is pasted:
//
//   1. The starting points show: the CV on screen, every saved CV by its
//      name, and "Let Nuvi write a CV for this role".
//   2. Clicking a saved CV is the launch: one model call, built on THAT
//      CV (not the one on screen), and the result is applied to the
//      editor without a second click. The panel says so, and offers to
//      put the previous one back.
//   3. Clicking "write a CV for this role" goes through the same door as
//      the front screen: a CV written from the ad alone, on screen, and
//      the panel closes on it.
//
// The model is a mock. What is proven is the circuit, and which CV was
// sent to the model.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

const ANNONCE = "Care Assistant wanted for a residential home in Manchester. "
  + "You will support 14 residents with personal care, medication and daily "
  + "records. NVQ Level 3 preferred. Night shifts available. Full training "
  + "given. Apply with a CV that shows your care experience and your "
  + "medication training.";

const VERSION_SOINS = {
  id: 1001, name: "Care version", created: "2026-08-01T10:00:00.000Z",
  cv: { ...SAMPLE_CV, name: "Sam Carter", title: "Care Assistant",
    experience: [{ id: 1, title: "Care Assistant", company: "Rowan Lodge", period: "2022 - 2026",
      location: "Manchester", bullets: ["Supported 12 residents with personal care and medication rounds."] }] },
};
const VERSION_SALLE = {
  id: 1002, name: "Hospitality version", created: "2026-07-01T10:00:00.000Z",
  cv: { ...SAMPLE_CV, name: "Sam Carter", title: "Waiter",
    experience: [{ id: 1, title: "Waiter", company: "Le Comptoir Bleu", period: "2019 - 2022",
      location: "Lyon", bullets: ["Served 80 covers a night on a six table station."] }] },
};

const ADAPTE = {
  match_score: 81, job_title: "Care Assistant", company: "Elmwood House",
  key_requirements: ["medication"], keywords_matched: ["medication"], keywords_to_add: ["safeguarding"],
  hidden_signals: [], culture_decode: "", seniority_decode: "", likely_interview_questions: [],
  cover_letter_hook: "",
  cv_optimized: { ...VERSION_SOINS.cv, title: "Care Assistant (adapted by the mock)",
    summary: "Care Assistant, medication trained, 14 residents a night." },
};
const ECRIT = { ...SAMPLE_CV, name: "Written From The Ad", title: "Care Assistant",
  experience: [{ title: "Care Assistant", company: "Employer to fill in", period: "2024 - 2026",
    location: "Manchester", bullets: ["Supported residents with personal care and medication."] }],
  deduit: ["experience.0.company"] };

async function ouvrir(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  const appels = [];
  await page.route("**/api/claude", async (route) => {
    let corps = {};
    try { corps = JSON.parse(route.request().postData() || "{}"); } catch { corps = {}; }
    appels.push(corps);
    const t = corps.task_name || "";
    const reponse = t === "match" ? ADAPTE
      : (t === "cv-from-offer" || t === "cv-from-offer-reprise") ? ECRIT : {};
    await route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ content: [{ type: "text", text: JSON.stringify(reponse) }] }) });
  });
  await seedApp(page, SAMPLE_CV, { locale: "en" });
  await page.evaluate((vs) => localStorage.setItem("cvf_vs", JSON.stringify(vs)), [VERSION_SOINS, VERSION_SALLE]);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  // The Match entry in the rail, then the ad.
  await page.locator('button, [role="button"], a').filter({ hasText: /^\s*Match\s*$/ }).first().click({ timeout: 8000 });
  const zone = page.locator("textarea").first();
  await zone.fill(ANNONCE);
  await page.waitForTimeout(400);
  return { ctx, page, appels };
}

const texteDuCv = (page) => page.evaluate(() => (document.getElementById("cv-print") || {}).innerText || "");

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    // --- 1 and 2. A saved CV, one click ------------------------------
    {
      const { ctx, page, appels } = await ouvrir(browser);
      const choix = page.locator('[data-nuvi="match-choix"]');
      const ids = await choix.evaluateAll((els) => els.map((e) => e.getAttribute("data-nuvi-choix")));
      const textes = await choix.evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, " ")));
      if (!ids.includes("actuel")) failures.push("the CV on screen is not offered as a starting point");
      if (!ids.includes("version-1001") || !ids.includes("version-1002")) {
        failures.push("the saved CVs are not offered by name (saw: " + ids.join(", ") + ")");
      }
      if (!textes.some((t) => /Care version/.test(t)) || !textes.some((t) => /Hospitality version/.test(t))) {
        failures.push("a saved CV is offered without its name (saw: " + textes.join(" | ") + ")");
      }
      if (!ids.includes("creer")) failures.push("\"write a CV for this role\" is not offered");

      const avant = await texteDuCv(page);
      await page.locator('[data-nuvi="match-choix"][data-nuvi-choix="version-1002"]').click({ timeout: 5000 });
      await page.waitForTimeout(2500);

      const match = appels.filter((c) => c.task_name === "match");
      if (match.length !== 1) {
        failures.push("clicking a saved CV made " + match.length + " match call(s) instead of one");
      } else if (!/Le Comptoir Bleu/.test(match[0].prompt || "")) {
        failures.push("the model was not given the saved CV that was clicked (Hospitality version)");
      } else if (/Rowan Lodge/.test(match[0].prompt || "")) {
        failures.push("the model was given another CV on top of the one clicked");
      }
      const apres = await texteDuCv(page);
      // innerText carries the layout's text-transform: the title may come back in capitals.
      if (!/adapted by the mock/i.test(apres)) {
        failures.push("after one click, the adapted CV is not on screen (still: \"" + apres.slice(0, 50) + "\")");
      }
      if (apres === avant) failures.push("the CV on screen did not change");
      const dit = await page.locator('[data-nuvi="match-applique"]').count();
      if (!dit) failures.push("the panel does not say that the CV was applied");
      const remettre = page.locator('[data-nuvi="match-remettre"]');
      if (!(await remettre.count())) {
        failures.push("no way back is offered next to the applied CV");
      } else {
        await remettre.click();
        await page.waitForTimeout(800);
        const retour = await texteDuCv(page);
        if (/adapted by the mock/i.test(retour)) failures.push("\"put the previous one back\" left the adapted CV on screen");
      }
      await ctx.close();
    }

    // --- 3. Let Nuvi write a CV for this role -------------------------
    {
      const { ctx, page, appels } = await ouvrir(browser);
      await page.locator('[data-nuvi="match-choix"][data-nuvi-choix="creer"]').click({ timeout: 5000 });
      await page.waitForTimeout(3500);
      if (!appels.some((c) => c.task_name === "cv-from-offer")) {
        failures.push("\"write a CV for this role\" made no cv-from-offer call");
      }
      const t = await texteDuCv(page);
      if (!/Written From The Ad/.test(t)) {
        failures.push("the CV written from the ad is not on screen (saw: \"" + t.slice(0, 50) + "\")");
      }
      if (await page.locator('[data-nuvi="match-choix"]').count()) {
        failures.push("the Match panel is still open over the CV it just wrote");
      }
      await ctx.close();
    }

    if (!failures.length) {
      console.log("      the ad, a click on a saved CV, and the adapted one is on screen; "
        + "or a CV written for the role");
    }
  } catch (err) {
    failures.push("the test itself crashed: " + (err && err.message));
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
