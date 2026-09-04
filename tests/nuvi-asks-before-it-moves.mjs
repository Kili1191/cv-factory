// Nuvi asks before it moves, then shows what it moved.
//
// WHAT THIS IS FOR
//
// The check before download flagged "Banking and Finance Training - Banking
// products, regulatory compliance, advisory" as a school named like a
// description. The owner of the product read it and said: it is not a
// school, it is a training I did at the company, and Nuvi should be clever
// enough to put it where it belongs, and to ask me when it needs to. This
// file holds that promise from the candidate's side of the screen.
//
// WHAT IT HOLDS
//
//   1. On the flagged card, the candidate can write to Nuvi in their own
//      words. The words reach the model, with the flagged text.
//   2. When the model asks a question, the question is shown as Nuvi's, and
//      the candidate can answer in the same thread.
//   3. When the model returns the CV, the CV on screen changes, the card
//      disappears, and the panel shows what moved: Nuvi's sentence and the
//      field-by-field difference. A change one cannot see is a change one
//      cannot refuse.
//   4. A figure that is in neither the CV nor the thread is refused: the CV
//      does not change, and the thread says why. Rule three of the repo, held
//      by code rather than by trust.
//
// The model is a mock: what is proven here is the circuit, not the quality
// of a real answer.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";
import { chiffresInventes } from "../lib/parlerANuvi.js";

const ECOLE = "Banking and Finance Training, banking products, regulatory "
  + "compliance, advisory and client onboarding across three regions";

const CV = {
  ...SAMPLE_CV,
  name: "Samuel Carter", title: "Client Listening Manager",
  experience: [
    { id: 1, title: "Client Listening Manager", company: "Private Clients", period: "2021 - 2026",
      location: "London", bullets: ["Ran the voice-of-client programme across 4 branches."] },
    // A second, silent job: keeps one decision open after the first is
    // settled, so the panel stays on screen and shows its work.
    { id: 2, title: "Customer Service Advisor", company: "Retail Bank", period: "2016 - 2021",
      location: "London", bullets: [] },
  ],
  education: [{ id: 1, degree: "Training", school: ECOLE, period: "2019" }],
  certifications: [], skills: ["Client listening", "Compliance"],
};

const QUESTION = "Which job was this training part of?";
const EXPLICATION = "Moved the training under Client Listening Manager at Private Clients, as one line, and removed the education entry.";
const CV_RANGE = {
  ...CV,
  experience: [
    { ...CV.experience[0], bullets: [...CV.experience[0].bullets,
      "Internal training in banking products, regulatory compliance and advisory."] },
    CV.experience[1],
  ],
  education: [],
};
const CV_INVENTE = {
  ...CV_RANGE,
  experience: [
    { ...CV_RANGE.experience[0], bullets: [...CV_RANGE.experience[0].bullets,
      "Raised client satisfaction by 37% after the training."] },
    CV_RANGE.experience[1],
  ],
};

export async function run() {
  const failures = [];

  // --- 4a. THE GUARD, WITHOUT A BROWSER ------------------------------
  const inventes = chiffresInventes(CV, CV_INVENTE, [{ de: "candidat", texte: "it was in 2019 at Private Clients" }]);
  if (inventes.join() !== "37") {
    failures.push("the figure guard should refuse exactly \"37\" and got: " + JSON.stringify(inventes));
  }
  if (chiffresInventes(CV, CV_RANGE, []).length) {
    failures.push("the figure guard refuses a CV that adds no figure: " + JSON.stringify(chiffresInventes(CV, CV_RANGE, [])));
  }

  const server = await startServer();
  const browser = await launchBrowser();
  try {
    for (const scenario of ["range", "invente"]) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
      const page = await ctx.newPage();
      const erreurs = [];
      page.on("pageerror", (e) => erreurs.push(e.message.split("\n")[0].slice(0, 90)));
      const requetes = [];
      await page.route("**/api/claude", async (route) => {
        let corps = {};
        try { corps = JSON.parse(route.request().postData() || "{}"); } catch { corps = {}; }
        requetes.push(corps);
        const n = requetes.filter((c) => c.task_name === "explain-a-defect").length;
        let reponse = {};
        if (corps.task_name === "explain-a-defect") {
          reponse = n === 1
            ? { question: QUESTION, explication: "", cv: CV }
            : { question: "", explication: EXPLICATION, cv: scenario === "invente" ? CV_INVENTE : CV_RANGE };
        }
        await route.fulfill({ status: 200, contentType: "application/json",
          body: JSON.stringify({ content: [{ type: "text", text: JSON.stringify(reponse) }] }) });
      });
      await seedApp(page, CV, { locale: "en" });

      await page.locator('button[aria-label="Telecharger CV"]').first().click({ timeout: 15_000 });
      const dire = page.locator('[data-nuvi="defaut-dire"]');
      await dire.first().waitFor({ timeout: 8_000 }).catch(() => {});
      if (!(await dire.count())) {
        failures.push(scenario + ": the check panel offers no way to tell Nuvi what the flagged line is");
        await ctx.close(); continue;
      }
      // The card for the school, not the one for the silent job.
      const carte = page.locator('[data-nuvi="defaut-dire"]').first();
      await carte.click();
      const champ = page.locator('[data-nuvi="defaut-message"]').first();
      await champ.fill("This is not a school, it is a training I did at the company");
      await page.locator('[data-nuvi="defaut-envoyer"]').first().click();

      // 2. NUVI'S QUESTION, IN NUVI'S BUBBLE
      const bulle = page.locator('[data-nuvi="defaut-fil"] [data-nuvi-de="nuvi"]');
      await bulle.first().waitFor({ timeout: 10_000 }).catch(() => {});
      const question = (await bulle.count()) ? await bulle.first().innerText() : "";
      if (!question.includes(QUESTION)) {
        failures.push(scenario + ": Nuvi's question did not reach the thread (saw: \"" + question.slice(0, 60) + "\")");
      }
      // 1. THE CANDIDATE'S WORDS, AND THE FLAGGED TEXT, REACH THE MODEL
      const premiere = requetes.find((c) => c.task_name === "explain-a-defect") || {};
      const prompt = String(premiere.prompt || "");
      if (!prompt.includes("training I did at the company")) {
        failures.push(scenario + ": the candidate's words are not in what the model reads");
      }
      if (!prompt.includes("Banking and Finance Training")) {
        failures.push(scenario + ": the flagged text is not in what the model reads");
      }
      if (!premiere.schema || !premiere.schema.properties || !premiere.schema.properties.question) {
        failures.push(scenario + ": the request carries no shape for the answer");
      }

      // The answer, in the same thread.
      await page.locator('[data-nuvi="defaut-message"]').first().fill("The first one, at Private Clients");
      await page.locator('[data-nuvi="defaut-envoyer"]').first().click();
      await page.waitForTimeout(2500);

      const etat = await page.evaluate(() => ({
        cv: (document.getElementById("cv-print") || {}).innerText || "",
        cartes: [...document.querySelectorAll('[data-nuvi="defauts-corriger"], [data-nuvi="defaut-dire"], [data-nuvi="defaut-fil"]')].length,
        explication: [...document.querySelectorAll('[data-nuvi="defauts-explication"]')].map((e) => e.innerText).join(" | "),
        corriges: (document.querySelector('[data-nuvi="defauts-corriges"]') || {}).innerText || "",
        erreur: (document.querySelector('[data-nuvi="defaut-erreur"]') || {}).innerText || "",
        panneau: !!document.querySelector('[data-nuvi="defauts-corriger"], [data-nuvi="defaut-dire"], [data-nuvi="defaut-fil"]'),
      }));

      if (scenario === "range") {
        // 3. THE CV MOVED, THE CARD LEFT, THE WORK IS SHOWN
        if (!etat.cv.includes("Internal training in banking products")) {
          failures.push("after Nuvi's answer, the training is not on the CV where Nuvi said it put it");
        }
        if (etat.cv.includes("client onboarding across three regions")) {
          failures.push("after Nuvi's answer, the description still sits in the school field");
        }
        if (!etat.explication.includes("Moved the training")) {
          failures.push("the panel does not show Nuvi's sentence on what it moved");
        }
        if (!/education 1|job 1, line 2/i.test(etat.corriges)) {
          failures.push("the panel does not show the field-by-field difference (saw: \""
            + etat.corriges.replace(/\s+/g, " ").slice(0, 120) + "\")");
        }
        if (!etat.panneau) {
          failures.push("the panel closed although the silent job still needs a decision");
        }
      } else {
        // 4. AN INVENTED FIGURE IS REFUSED, AND THE THREAD SAYS WHY
        if (etat.cv.includes("37%")) {
          failures.push("a figure the candidate never gave (37%) reached the CV");
        }
        if (!etat.erreur.includes("37")) {
          failures.push("the thread does not say that Nuvi's answer was refused for an invented figure (saw: \""
            + etat.erreur.slice(0, 80) + "\")");
        }
      }
      for (const e of erreurs) failures.push(scenario + ": JavaScript error, " + e);
      await ctx.close();
    }
    if (!failures.length) {
      console.log("      the candidate explains, Nuvi asks, the CV moves and shows its work; an invented figure is refused");
    }
  } catch (err) {
    failures.push("the test itself crashed: " + (err && err.message));
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
