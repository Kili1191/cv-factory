// A BREAKAGE REACHES THE OWNER
//
// For months a broken export on the live site was learnt from the
// founder's screenshot. Now the page keeps what breaks and sends it to
// /api/incident, and a person can write what happened from Settings.
// This suite holds four things:
//   1. the route accepts a well-formed report and refuses junk and bulk;
//   2. an error thrown in the page reaches the route on its own, with a
//      build id and a message, and without a word of the CV;
//   3. the Settings row sends the note, and the CV's shape only when the
//      box is ticked, again without the CV's text;
//   4. the route is under the ceiling like every other.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV, BASE_URL } from "./lib/harness.mjs";

async function poster(body, headers = {}) {
  const r = await fetch(BASE_URL + "/api/incident", { method: "POST",
    headers: { "content-type": "application/json", ...headers }, body });
  return r.status;
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    // --- 1. the route ---------------------------------------------------
    const ok = await poster(JSON.stringify({ incidents: [{ genre: "erreur", message: "x is not defined", build: "t" }] }));
    if (ok !== 204) failures.push("a well-formed report answered " + ok + " instead of 204");
    const vide = await poster(JSON.stringify({ hello: 1 }));
    if (vide !== 400) failures.push("junk answered " + vide + " instead of 400");
    const gros = await poster(JSON.stringify({ incidents: [{ message: "a".repeat(20000) }] }));
    if (gros !== 413) failures.push("a 20 KB body answered " + gros + " instead of 413");

    // --- 2. an error in the page -----------------------------------------
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const recus = [];
    await page.route("**/api/incident", (route) => {
      recus.push(route.request().postData() || "");
      return route.fulfill({ status: 204, body: "" });
    });
    await seedApp(page, SAMPLE_CV, { locale: "en" });
    await page.waitForTimeout(1500);
    await page.evaluate(() => { setTimeout(() => { throw new Error("nuvi test breakage 4711"); }, 0); });
    // The sender debounces ten seconds: wait for it rather than guess.
    await page.waitForTimeout(11_500);
    const auto = recus.find((b) => b.includes("nuvi test breakage 4711"));
    if (!auto) {
      failures.push("an error thrown in the page never reached /api/incident (" + recus.length + " call(s) seen)");
    } else {
      if (!/"build":"/.test(auto)) failures.push("the automatic report carries no build id");
      if (auto.includes(SAMPLE_CV.name) || auto.includes(SAMPLE_CV.email)) {
        failures.push("the automatic report carries the CV's name or e-mail");
      }
    }

    // --- 3. the Settings row -----------------------------------------------
    recus.length = 0;
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) => /^Settings$|Reglages|Settings/.test((x.textContent || "").trim()));
      if (b) b.click();
    });
    await page.waitForTimeout(1200);
    const ouvert = await page.evaluate(() => {
      const b = [...document.querySelectorAll('[data-cvf="report"] button')][0];
      if (!b) return false;
      b.click();
      return true;
    });
    if (!ouvert) {
      failures.push("no 'Report a problem' row in Settings");
    } else {
      await page.waitForTimeout(500);
      await page.fill('[data-cvf="report"] textarea', "the download came out blank 4712");
      await page.check('[data-cvf="report"] input[type="checkbox"]');
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('[data-cvf="report"] button')].find((x) => /Send|Envoyer/.test(x.textContent || ""));
        if (b) b.click();
      });
      await page.waitForTimeout(1500);
      const rapport = recus.find((b) => b.includes("4712"));
      if (!rapport) failures.push("the written report never reached /api/incident");
      else {
        if (!/"forme":\{/.test(rapport)) failures.push("the report lacks the CV shape although the box was ticked");
        if (rapport.includes(SAMPLE_CV.name) || rapport.includes(SAMPLE_CV.experience[0].bullets[0])) {
          failures.push("the report carries CV text: name or a bullet");
        }
      }
      const dit = await page.evaluate(() => (document.querySelector('[data-cvf="report"] [role="status"]') || {}).textContent || "");
      if (!/Sent|Envoye/.test(dit)) failures.push("after sending, the row does not say so (got \"" + dit + "\")");
    }
    await ctx.close();

    // --- 4. under the ceiling ------------------------------------------------
    let dernier = 0;
    for (let i = 0; i < 13; i += 1) {
      dernier = await poster(JSON.stringify({ incidents: [{ genre: "erreur", message: "loop" }] }), { "x-forwarded-for": "203.0.113.77" });
    }
    if (dernier !== 429) failures.push("thirteen reports from one visitor in a minute were all accepted (last status " + dernier + ")");

    if (!failures.length) {
      console.log("      a thrown error and a written report reach the route with a build id and no CV text, junk and bulk are refused, and a visitor is capped");
    }
  } catch (err) {
    failures.push("the test crashed: " + (err && err.message ? err.message : String(err)));
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
