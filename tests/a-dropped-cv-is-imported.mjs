// THE GESTURE EVERYBODY TRIES FIRST
//
// `FileDrop` has accepted a dropped file since it shipped and serves eight
// panels. The import card was not one of them: it was a button with a single
// onClick, so the most important screen in the product, the one the CV
// arrives on, refused the first thing anyone does with a file on a computer.
//
// AND WITHOUT preventDefault THE BROWSER OPENS THE PDF
//
// That is the defect worth a suite. A file dropped on a page that intercepts
// nothing makes the browser leave the application to display the file: the
// person loses the screen they were on, their CV is not imported, and nothing
// says why. It looks like the app crashed.

import { startServer, stopServer, launchBrowser } from "./lib/harness.mjs";

const CV = [
  "Camille Marchetti", "Account Manager", "camille.marchetti@example.com", "07700900123",
  "", "EXPERIENCE",
  "Account Manager, Northwind, 2021 - 2026, London",
  "- Owned a portfolio of enterprise accounts worth 3.2m in annual recurring revenue.",
  "- Led renewals and upsell, lifting net revenue retention from 94 to 109 per cent.",
  "", "EDUCATION", "BA Business, University of Leeds, 2017",
  "", "SKILLS", "Salesforce, HubSpot, renewals, forecasting",
].join("\n");

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await ctx.newPage();
    const erreurs = [];
    page.on("pageerror", (e) => erreurs.push(String(e.message || e).split("\n")[0].slice(0, 110)));

    const base = "http://127.0.0.1:" + (process.env.TEST_PORT || 4311);
    await page.goto(base + "/app", { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(1200);
    // The language is asked once and a test that reads text has to say which
    // one it expects.
    await page.getByRole("button", { name: /English/i }).first().click({ timeout: 8_000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.locator("button").filter({ hasText: /have a CV/i }).first()
      .click({ timeout: 8_000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const zone = page.locator('[data-nuvi="ob-depot-cv"]');
    if (await zone.count() === 0) {
      failures.push("the import card is not a drop target at all.");
      return failures;
    }

    // The label has to say it, or the zone exists and nobody tries it.
    const label = await zone.first().innerText().catch(() => "");
    if (!/drop/i.test(label)) {
      failures.push("the card does not say a file can be dropped on it: \""
        + label.replace(/\n/g, " ").slice(0, 70) + "\". A target nobody is told about is "
        + "a target nobody uses.");
    }

    const handle = async (text, name, type) => page.evaluateHandle(([t, n, ty]) => {
      const d = new DataTransfer();
      d.items.add(new File([t], n, { type: ty }));
      return d;
    }, [text, name, type]);

    // It has to answer while the file is over it, or nothing says to let go.
    const dt = await handle(CV, "cv.txt", "text/plain");
    await zone.first().dispatchEvent("dragenter", { dataTransfer: dt });
    await page.waitForTimeout(400);
    const pendant = await zone.first().evaluate((el) => getComputedStyle(el).borderStyle);
    if (pendant !== "solid") {
      failures.push("the card does not change while a file is held over it (border is \""
        + pendant + "\"): the person cannot tell it will be caught.");
    }

    await zone.first().dispatchEvent("drop", { dataTransfer: dt });
    await page.waitForTimeout(3000);

    const apres = await page.evaluate(() => {
      const valeurs = [...document.querySelectorAll("textarea")].map((t) => t.value).filter(Boolean);
      return {
        texte: valeurs[0] || "",
        parti: !/Application error|client-side exception/i.test(document.body.innerText),
        toujoursSurLEcran: /Import|drop/i.test(document.body.innerText),
      };
    });

    if (!apres.parti) {
      failures.push("dropping a file replaced the app with its error page.");
    }
    if (!apres.toujoursSurLEcran) {
      failures.push("after the drop the import screen is gone: the browser followed the file "
        + "instead of the app reading it, which is exactly what the missing preventDefault does.");
    }
    if (!/Camille\s*Marchetti/.test(apres.texte)) {
      failures.push("the dropped CV did not reach the field. It read \""
        + apres.texte.slice(0, 50).replace(/\n/g, " ") + "\"");
    }
    if (!/Northwind/.test(apres.texte)) {
      failures.push("only the top of the dropped CV arrived: the experience is missing.");
    }
    for (const e of erreurs) failures.push("JavaScript error on drop, " + e);

    await ctx.close();
  } finally {
    await browser.close();
    await stopServer(server);
  }

  if (!failures.length) {
    console.log("      a CV dropped on the import card is read into the field, the card says "
      + "so and answers while the file is held over it, and the browser never follows the file");
  }
  return failures;
}
