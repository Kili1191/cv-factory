// THE LETTER IS ONE CLICK FROM DOWNLOAD
//
// Every competitor puts a cover letter next to the CV. Nuvi had written
// one for a long time, inside the Application Pack, three menus deep,
// where a new user never looked. A button now sits beside Download on
// both trees, desktop and phone, and opens the pack on its letter. This
// suite proves the button exists where Download is, in both languages,
// and that the pack opens from it with the offer field or the letter.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

async function verifier(browser, { viewport, locale, attendu }, failures) {
  const ctx = await browser.newContext({ viewport, isMobile: viewport.width < 700, hasTouch: viewport.width < 700 });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on("pageerror", (e) => erreurs.push(String(e && e.message || e).split("\n")[0]));
  await seedApp(page, SAMPLE_CV, { locale });
  await page.waitForTimeout(1500);
  const etiquette = viewport.width + "px / " + locale;

  const bouton = await page.$('[data-cvf="lettre"]');
  if (!bouton) { failures.push(etiquette + ": no cover-letter button beside Download"); await ctx.close(); return; }
  const visible = await bouton.isVisible();
  const box = await bouton.boundingBox();
  if (!visible || !box) failures.push(etiquette + ": the cover-letter button is not visible");
  else if (box.height < 44) failures.push(etiquette + ": the cover-letter button is " + Math.round(box.height) + "px high, under the 44px floor");
  const label = await bouton.getAttribute("aria-label");
  if (label !== attendu) failures.push(etiquette + ": aria-label \"" + label + "\" instead of \"" + attendu + "\"");

  // Download must still be there, next to it.
  const dl = await page.$('button[aria-label="Telecharger CV"]');
  if (!dl || !(await dl.isVisible())) failures.push(etiquette + ": Download disappeared next to the letter");

  await bouton.click();
  await page.waitForTimeout(1200);
  const ouvert = await page.evaluate(() => {
    const t = document.body.innerText || "";
    return /Cover letter|Lettre de motivation|Paste the job offer|Colle l'offre|Generate my full application|candidature/i.test(t);
  });
  if (!ouvert) failures.push(etiquette + ": clicking the button did not open the pack on its letter");
  if (erreurs.length) failures.push(etiquette + ": JS error: " + [...new Set(erreurs)].slice(0, 2).join(" | "));
  await ctx.close();
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    await verifier(browser, { viewport: { width: 1280, height: 900 }, locale: "en", attendu: "Cover letter" }, failures);
    await verifier(browser, { viewport: { width: 390, height: 844 }, locale: "fr", attendu: "Lettre de motivation" }, failures);
    if (!failures.length) {
      console.log("      a 44px cover-letter button sits beside Download on desktop and phone, in both languages, and opens the pack on its letter");
    }
  } catch (err) {
    failures.push("the test crashed: " + (err && err.message ? err.message : String(err)));
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
