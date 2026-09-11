// The PDF is real text, and the picture is only the fallback.
//
// WHAT CHANGED
//
// Until now the exported PDF was a photograph of the CV with an invisible
// text layer laid over it. Every parser read it, but it was a picture:
// 700 KB, pixels when zoomed, a hidden text in a generic face. Kilian
// asked the question every recruiter's software answers for him: "is it
// an image or real text?" Now the server prints the same template with
// Chromium (app/api/pdf and app/imprimer): vector glyphs, embedded fonts,
// one page, 60 to 110 KB. The picture path stays as the fallback when the
// server cannot print.
//
// WHAT THIS HOLDS
//
//   1. The download is native: embedded fonts, no JPEG, under 250 KB, one
//      A4 page, on the single-column templates (classic, timeline). The
//      two-column ones keep the picture with its machine-written text
//      layer, on purpose: read by position, two columns come out line by
//      line across both, and the written layer is what keeps them whole.
//   2. A parser reads it right: the name first (even on the column
//      template, where the sidebar sits first in the DOM), the section
//      headings as words and not as spaced letters, a wrapped bullet
//      whole.
//   3. When the server cannot print, the person still gets a file: with
//      the route answering 503, the download happens and carries the
//      picture with its text layer.

import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServer, stopServer, launchBrowser, seedApp, extractPdfText, SAMPLE_CV } from "./lib/harness.mjs";

const CV = {
  ...SAMPLE_CV,
  experience: [{
    ...SAMPLE_CV.experience[0],
    bullets: [
      "Lance trois produits qui generent quatre millions d'euros de revenu annuel recurrent, en coordonnant les equipes produit, vente et support sur deux continents.",
      "Manage une equipe de six personnes",
    ],
  }, ...SAMPLE_CV.experience.slice(1)],
};

async function telecharger(browser, layout, { sansServeur = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on("pageerror", (e) => erreurs.push(e.message.split("\n")[0].slice(0, 90)));
  if (sansServeur) {
    await page.route("**/api/pdf", (r) => r.fulfill({ status: 503, contentType: "application/json", body: '{"error":"chromium indisponible"}' }));
  }
  await seedApp(page, CV, { locale: "en", layout });
  const attente = page.waitForEvent("download", { timeout: 90_000 }).catch(() => null);
  await page.locator('button[aria-label="Telecharger CV"]').first().click({ timeout: 15_000 });
  await page.waitForTimeout(1200);
  const quandMeme = page.locator('[data-nuvi="defauts-quand-meme"]');
  if (await quandMeme.count()) await quandMeme.click();
  await page.waitForTimeout(600);
  const confirmer = page.getByRole("button", { name: /^(Download|Telecharger)$/ });
  if (await confirmer.count()) await confirmer.last().click().catch(() => {});
  const download = await attente;
  let bytes = null;
  if (download) {
    const dossier = mkdtempSync(join(tmpdir(), "cvf-natif-"));
    const chemin = join(dossier, "cv.pdf");
    await download.saveAs(chemin);
    bytes = readFileSync(chemin);
  }
  await ctx.close();
  return { bytes, erreurs };
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    for (const layout of ["classic", "timeline"]) {
      const r = await telecharger(browser, layout);
      for (const e of r.erreurs) failures.push(layout + ": JavaScript error, " + e);
      if (!r.bytes) { failures.push(layout + ": no PDF downloaded"); continue; }
      const natif = r.bytes.includes(Buffer.from("/FontFile")) && !r.bytes.includes(Buffer.from("DCTDecode"));
      if (!natif) {
        failures.push(layout + ": the PDF is not native text (fonts embedded: "
          + r.bytes.includes(Buffer.from("/FontFile")) + ", JPEG inside: " + r.bytes.includes(Buffer.from("DCTDecode"))
          + "). The picture path answered instead of the server.");
        continue;
      }
      // A variable font is printed by Chromium as Type 3 outlines: no font
      // file, and extractors lose lines (the e-mail and phone, measured on
      // CI where Google Fonts load). The route asks for static instances;
      // this is the check that it did.
      if (r.bytes.includes(Buffer.from("/Type3"))) {
        failures.push(layout + ": the PDF carries Type 3 fonts, so a variable font reached the printer. "
          + "The route must hand the page static instances (lib/policesDuSite.js).");
      }
      if (r.bytes.length > 250_000) {
        failures.push(layout + ": the native PDF weighs " + Math.round(r.bytes.length / 1024) + " KB, a text PDF of one page should stay under 250 KB");
      }
      const { text, pages } = await extractPdfText(r.bytes);
      if (pages !== 1) failures.push(layout + ": " + pages + " pages instead of one");
      if (!text.startsWith(CV.name)) {
        failures.push(layout + ": a parser reads \"" + text.slice(0, 40) + "\" before the candidate's name");
      }
      const initiales = CV.name.split(/\s+/).map((w) => w[0]).join("");
      if (new RegExp("(^|\\s)" + initiales + "(\\s|$)").test(text)) {
        failures.push(layout + ": the monogram \"" + initiales + "\" is in the text; it should be drawn, not written");
      }
      if (!/EXPERIENCE/i.test(text) || /E X P E R I E N C E/.test(text)) {
        failures.push(layout + ": the section heading is not read as a word (" + (text.match(/E ?X ?P ?E ?R ?I ?E ?N ?C ?E/i) || ["absent"])[0] + ")");
      }
      if (!/deux continents/.test(text)) {
        failures.push(layout + ": a wrapped bullet is not whole in the text");
      }
    }

    // 2 bis. A TWO-COLUMN TEMPLATE KEEPS THE WRITTEN LAYER, BY DESIGN
    //
    // AND THE LAYER IS WHAT GETS CHECKED, NOT THE PICTURE
    //
    // This case used to assert one thing: that the file contains a JPEG.
    // That proves the page is a picture and says nothing at all about the
    // half that does the work. The picture carries no readable text; the
    // layer written under it is the entire reason an ATS can read this
    // file, and it was the only part nobody looked at.
    //
    // It is also the part that broke before. The exports up to 5 September
    // cut the layer at the right edge of every line, and someone
    // re-imported their own file and found every long bullet amputated
    // mid-word. Nothing on screen showed it: the picture was perfect. A
    // layer that is empty, truncated or out of order looks exactly like a
    // layer that is right, which is why it needs a machine to say so.
    const colonne = await telecharger(browser, "sidebar");
    if (!colonne.bytes) failures.push("sidebar: no PDF downloaded");
    else if (!colonne.bytes.includes(Buffer.from("DCTDecode"))) {
      failures.push("sidebar: the column template went native; its two columns would be read line by line across both");
    } else {
      const { text } = await extractPdfText(colonne.bytes);
      const plat = text.replace(/\s+/g, " ").trim();
      if (!plat) {
        failures.push("sidebar: the picture carries no text layer at all, so an ATS reads nothing: "
          + "what the recruiter's software gets is a blank page");
      } else {
        // The name, the title and every heading: a layer missing any of
        // them is a CV filed under nothing.
        for (const attendu of [CV.name, CV.title]) {
          if (attendu && !plat.includes(attendu)) {
            failures.push("sidebar: \"" + attendu + "\" is not in the written layer, so the file does not name the candidate");
          }
        }
        if (!/EXPERIENCE/i.test(plat)) {
          failures.push("sidebar: the experience heading is missing from the written layer");
        }
        // The failure that reached real people: a line cut at the right
        // margin. The bullet is long enough to wrap several times, so its
        // last words only survive if the layer wraps rather than clips.
        if (!/deux continents/.test(plat)) {
          failures.push("sidebar: a wrapped bullet stops before its last words in the written layer. "
            + "This is the amputated-bullet failure, and it is invisible on screen");
        }
        // And in reading order: the sidebar sits first in the DOM, so a
        // layer that follows the page geometry rather than the reading
        // order puts the contact band ahead of the person's own name.
        // Case-insensitively: the heading is drawn "Experience", and an
        // indexOf on the shouted form finds nothing and reads as position
        // zero, which fails a layer that is in fact correct.
        const ouExp = plat.search(/EXPERIENCE/i);
        const ouNom = plat.indexOf(CV.name);
        if (ouExp >= 0 && ouNom >= 0 && ouNom > ouExp) {
          failures.push("sidebar: the written layer reaches the experience heading before the candidate's name, "
            + "so it follows the columns and not the reading order");
        }
      }
    }

    // 3. THE FALLBACK STILL DELIVERS
    const secours = await telecharger(browser, "classic", { sansServeur: true });
    if (!secours.bytes) {
      failures.push("with the server unable to print, no PDF was downloaded: the fallback is gone");
    } else if (!secours.bytes.includes(Buffer.from("DCTDecode"))) {
      failures.push("with the server unable to print, the download is not the picture fallback");
    } else {
      const { text } = await extractPdfText(secours.bytes);
      if (!text.includes(CV.name)) failures.push("the fallback PDF has no text layer");
    }
    for (const e of secours.erreurs) failures.push("fallback: JavaScript error, " + e);

    if (!failures.length) console.log("      native text on the single-column templates, name first, headings as words, monogram drawn; the column template and the fallback keep the written layer");
  } catch (err) {
    failures.push("the test itself crashed: " + (err && err.message));
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
