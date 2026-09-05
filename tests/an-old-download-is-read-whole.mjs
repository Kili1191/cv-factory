// AN OLD DOWNLOAD IS READ WHOLE
//
// Until 5 September 2026 the product exported a picture of the CV with an
// invisible text layer under it, and that layer was cut at the right edge
// of every line. Someone who re-imported one of those files got every long
// bullet amputated: "across the Middle East, Europe an". The reader trusted
// the layer because a layer is text, and text is what it reads.
//
// The picture in those files is complete. So a PDF whose page IS a picture,
// and whose layer stops mid-sentence, is now read from its picture, the way
// a photo of a CV is read: the page is rendered and sent to the model. This
// suite holds three things:
//   1. the detector itself, on the two shapes it must tell apart: a cut
//      layer, and a real text PDF whose sentences merely wrap;
//   2. a picture PDF with a cut layer goes to the model as a legible
//      rendering of the page, and the text that comes back is what lands;
//   3. a text-only PDF with the same lines never leaves the device: the
//      layer is read as is, and the model is not called.
//
// The fixtures are built here with jsPDF, the library that produced the
// real files, so the shape is the one in the wild and no personal CV is
// checked into a public repository.

import { jsPDF } from "jspdf";
import { startServer, stopServer, launchBrowser, answerLanguageIfAsked, BASE_URL } from "./lib/harness.mjs";
import { laCoucheTexteEstCoupee, lignesCoupees } from "../lib/lireUnFichier.js";

const APP = (b) => b + "/app";

const LIGNES = [
  "Amara Okafor",
  "Client Listening Manager",
  "amara@example.com 0600000000 London",
  "Professional Experience",
  "Client Relationship Manager",
  "2023 - February 2026",
  "Anarock UAE",
  "Managed a portfolio of private investors through the full investment cycle, from qualification to signed contract.",
  "Ran structured listening conversations with clients across the Middle East, Europe an",
  "Owned complex, high-value transactions end to end, coordinating banks, notaries and legal partners.",
  "Account Manager",
  "2016 - 2023",
  "Stenn International, London, UK",
  "Onboarded 60+ SME clients over 7 years, cutting time-to-first-transaction by 30% by",
  "Sustained retention above 85% across 20 to 60 accounts by running a structured che",
];

const TRANSCRIPTION = LIGNES.join("\n")
  .replace("Europe an", "Europe and Asia to capture expectations, concerns and satisfaction.")
  .replace("by 30% by", "by 30% by building clear playbooks and staying ahead of blockers.")
  .replace("a structured che", "a structured check-in and feedback cadence.");

// A 1x1 white PNG. The detector reads the DRAWN size of the image, not its
// pixels, so one pixel stretched over the sheet is the shape of the export.
const PNG_1PX = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8//8/AwAI/AL+hc2rNAAAAABJRU5ErkJggg==";

function fixture({ avecImage }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  if (avecImage) doc.addImage(PNG_1PX, "PNG", 0, 0, 210, 297);
  doc.setFontSize(10);
  LIGNES.forEach((l, i) => {
    doc.text(l, 15, 20 + i * 7, avecImage ? { renderingMode: "invisible" } : {});
  });
  return Buffer.from(doc.output("arraybuffer"));
}

// Width of a PNG from its IHDR, to check the page was rendered legibly and
// not sent as the one pixel the fixture carries.
function largeurPng(base64) {
  const b = Buffer.from(base64, "base64");
  return b.length > 24 ? b.readUInt32BE(16) : 0;
}

export async function run() {
  const failures = [];

  // --- 1. The detector, on the two shapes it must tell apart -----------
  if (!laCoucheTexteEstCoupee(LIGNES)) {
    failures.push("the detector does not see the cut layer: " + JSON.stringify(lignesCoupees(LIGNES)));
  }
  const ENVELOPPEES = [
    "Onboarded 60+ SME clients over 7 years, cutting time-to-first-transaction by 30% by",
    "building clear playbooks and staying ahead of blockers.",
    "Sustained retention above 85% across 20 to 60 accounts by running a structured check-in",
    "and feedback cadence, surfacing dissatisfaction signals early.",
  ];
  if (laCoucheTexteEstCoupee(ENVELOPPEES)) {
    failures.push("the detector takes wrapped sentences of a real text PDF for a cut layer: "
      + JSON.stringify(lignesCoupees(ENVELOPPEES)));
  }

  const server = await startServer();
  const browser = await launchBrowser();
  try {
    const ouvrirImport = async (page) => {
      await page.goto(APP(BASE_URL), { waitUntil: "domcontentloaded" });
      await answerLanguageIfAsked(page, "en");
      await page.waitForTimeout(2500);
      await page.evaluate(() => {
        const b = [...document.querySelectorAll("button")]
          .find((x) => /already have a CV|I have a CV|deja un CV/i.test(x.textContent || ""));
        if (b) b.click();
      });
      await page.waitForTimeout(1400);
      return page.$('input[type="file"]');
    };
    const zoneDeTexte = (page) => page.evaluate(() => {
      const t = document.querySelector("textarea");
      return t ? t.value : null;
    });

    // --- 2. A picture PDF with a cut layer is read from its picture ------
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      const erreurs = [];
      page.on("pageerror", (e) => erreurs.push(String(e && e.message || e).split("\n")[0]));
      const appels = [];
      await page.route("**/api/claude**", (route) => {
        appels.push(route.request().postData() || "");
        return route.fulfill({ status: 200, contentType: "application/json",
          body: JSON.stringify({ content: [{ type: "text", text: TRANSCRIPTION }] }) });
      });

      const champ = await ouvrirImport(page);
      if (!champ) {
        failures.push("no file field on the import screen");
      } else {
        await page.setInputFiles('input[type="file"]', {
          name: "CV_old_download.pdf", mimeType: "application/pdf", buffer: fixture({ avecImage: true }),
        });
        await page.waitForTimeout(6000);
        const zone = await zoneDeTexte(page);

        if (!appels.length) {
          failures.push("the picture PDF with a cut layer was read from its layer: the model was "
            + "never asked to read the page. Text received: \"" + String(zone).slice(0, 90) + "\"");
        } else {
          const corps = appels[0];
          const images = [...corps.matchAll(/"type":"image"[^}]*?"data":"([A-Za-z0-9+/=]+)"/g)];
          if (!images.length) {
            failures.push("the model was called without the page as an image");
          } else {
            const largeur = largeurPng(images[0][1]);
            if (largeur < 1000) {
              failures.push("the page sent to the model is " + largeur + "px wide: too small to read "
                + "9pt text. The fixture's one pixel was forwarded instead of a rendering.");
            }
          }
        }
        if (zone === null) failures.push("no text area to receive what was read");
        else if (/Europe an\b/.test(zone) || !/Europe and Asia/.test(zone)) {
          failures.push("the cut layer landed instead of the page's text: \""
            + String(zone).slice(0, 120) + "\"");
        }
      }
      if (erreurs.length) failures.push("JS error while importing the picture PDF: " + [...new Set(erreurs)].slice(0, 2).join(" | "));
      await ctx.close();
    }

    // --- 3. A text PDF with the same lines never leaves the device -------
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      const appels = [];
      await page.route("**/api/claude**", (route) => {
        appels.push(1);
        return route.fulfill({ status: 200, contentType: "application/json",
          body: JSON.stringify({ content: [{ type: "text", text: TRANSCRIPTION }] }) });
      });
      const champ = await ouvrirImport(page);
      if (champ) {
        await page.setInputFiles('input[type="file"]', {
          name: "CV_text.pdf", mimeType: "application/pdf", buffer: fixture({ avecImage: false }),
        });
        await page.waitForTimeout(5000);
        const zone = await zoneDeTexte(page);
        if (appels.length) {
          failures.push("a text-only PDF was sent to the model: the picture path must be reserved "
            + "to pages that are pictures, or every PDF costs a call and leaves the device.");
        }
        if (!zone || !/Middle East, Europe an/.test(zone)) {
          failures.push("the text PDF was not read on the device as is: \"" + String(zone).slice(0, 90) + "\"");
        }
      }
      await ctx.close();
    }

    if (!failures.length) {
      console.log("      a picture PDF with a cut layer is rendered and read as a photo, "
        + "a text PDF is read on the device, and the detector tells wrapping from cutting");
    }
  } catch (err) {
    failures.push("the test crashed: " + (err && err.message ? err.message : String(err)));
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
