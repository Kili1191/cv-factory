// The picture in the PDF matches the page on screen.
//
// WHAT WENT WRONG
//
// Kilian's downloaded PDF read "Managed    a portfolio    of private",
// every line ran off the right edge, and the last quarter of the CV, from
// EDUCATION down, was simply not there. The invisible text layer was fine;
// the picture was not. The desktop preview enlarges the sheet with a CSS
// transform (up to 1.35 on a 1440 screen), and html2canvas took each word's
// position from that enlarged layout while drawing the glyphs at true
// size: words landed at 1.35 times their place, and the bottom fell outside
// the canvas.
//
// No suite looked at the picture. The text-layer suites read the invisible
// text, which was right; the one-page suite counted pages. A recruiter
// looks at the picture.
//
// WHAT THIS HOLDS
//
// The PDF is rasterised without its text layer (poppler does not paint
// invisible text), so what is measured is ink. On a desktop wide enough to
// enlarge the preview, and on a phone:
//
//   1. The name's ink spans the same width as the name on the page, within
//      a few percent. Stretched words would span far more.
//   2. There is ink where the last line of the CV sits. A cut-off page has
//      none.

import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

const DPI = 96;  // one PDF pixel per CSS pixel on a page that fits at scale 1

// A binary PGM (P5) from pdftoppm -gray: header, then one byte per pixel.
function lirePgm(chemin) {
  const b = readFileSync(chemin);
  let pos = 0;
  const mot = () => {
    while (b[pos] === 0x20 || b[pos] === 0x0a || b[pos] === 0x0d || b[pos] === 0x09) pos += 1;
    if (b[pos] === 0x23) { while (b[pos] !== 0x0a) pos += 1; return mot(); }
    let s = ""; while (b[pos] > 0x20) { s += String.fromCharCode(b[pos]); pos += 1; }
    return s;
  };
  const magic = mot(); const w = Number(mot()); const h = Number(mot()); mot();
  pos += 1;
  if (magic !== "P5") throw new Error("not a P5 pgm: " + magic);
  return { w, h, px: (x, y) => b[pos + y * w + x] };
}

// Horizontal extent of ink in a band of rows.
// `x0` skips what sits left of the text on the same rows: the classic
// layout draws a monogram circle beside the name, and its ink would count.
function encre(img, y0, y1, x0 = 0, seuil = 140) {
  let min = Infinity, max = -Infinity, n = 0;
  for (let y = Math.max(0, y0); y < Math.min(img.h, y1); y += 1) {
    for (let x = Math.max(0, Math.floor(x0)); x < img.w; x += 1) {
      if (img.px(x, y) < seuil) { n += 1; if (x < min) min = x; if (x > max) max = x; }
    }
  }
  return { min, max, n };
}

async function exporter(browser, viewport, mobile) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, acceptDownloads: true });
  const page = await ctx.newPage();
  await seedApp(page, SAMPLE_CV, { locale: "en", layout: "classic" });

  // Where the name and the last line sit on the sheet, in sheet pixels.
  const repere = await page.evaluate(() => {
    const el = document.getElementById("cv-print");
    const zoom = el.getBoundingClientRect().width / el.offsetWidth;
    const racine = el.getBoundingClientRect();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n, nom = null, dernier = null;
    while ((n = walker.nextNode())) {
      const t = n.nodeValue.trim(); if (!t) continue;
      if (n.parentElement.closest(".cvf-no-print, [data-cvf-decorative]")) continue;
      const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect();
      if (!b.width) continue;
      const rect = { l: (b.left - racine.left) / zoom, r: (b.right - racine.left) / zoom,
        t: (b.top - racine.top) / zoom, b: (b.bottom - racine.top) / zoom, texte: t.slice(0, 30) };
      if (!nom && t === "Jane Doe") nom = rect;
      if (!dernier || rect.b > dernier.b) dernier = rect;
    }
    return { nom, dernier, zoom, hauteur: el.offsetHeight };
  });

  const attente = page.waitForEvent("download", { timeout: 60_000 }).catch(() => null);
  await page.locator('button[aria-label="Telecharger CV"]').first().click({ timeout: 15_000 });
  await page.waitForTimeout(1200);
  const quandMeme = page.locator('[data-nuvi="defauts-quand-meme"]');
  if (await quandMeme.count()) await quandMeme.click();
  await page.waitForTimeout(600);
  const confirmer = page.getByRole("button", { name: /^(Download|Telecharger)$/ });
  if (await confirmer.count()) await confirmer.last().click().catch(() => {});
  const download = await attente;
  let img = null;
  if (download) {
    const dossier = mkdtempSync(join(tmpdir(), "cvf-image-"));
    const pdf = join(dossier, "cv.pdf");
    await download.saveAs(pdf);
    execFileSync("pdftoppm", ["-gray", "-r", String(DPI), "-f", "1", "-l", "1", pdf, join(dossier, "p")]);
    const fichiers = execFileSync("ls", [dossier]).toString().split("\n").filter((f) => f.endsWith(".pgm"));
    if (fichiers.length) img = lirePgm(join(dossier, fichiers[0]));
  }
  await ctx.close();
  return { repere, img, telecharge: !!download };
}

export async function run() {
  const failures = [];
  try { execFileSync("pdftoppm", ["-v"], { stdio: "ignore" }); } catch {
    return ["pdftoppm is not installed: this suite cannot look at the picture"];
  }
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    for (const [nom, viewport, mobile] of [
      ["desktop 1440", { width: 1440, height: 950 }, false],
      ["phone 390", { width: 390, height: 844 }, true],
    ]) {
      const r = await exporter(browser, viewport, mobile);
      if (!r.telecharge || !r.img) { failures.push(nom + ": no PDF, or no picture out of it"); continue; }
      if (!r.repere.nom || !r.repere.dernier) { failures.push(nom + ": could not locate the name or the last line on the page"); continue; }
      if (r.repere.hauteur > 1123) { failures.push(nom + ": the fixture is taller than a page (" + r.repere.hauteur + "px), the 1:1 comparison does not hold"); continue; }
      const { nom: N, dernier: D } = r.repere;
      // 1. THE NAME'S INK IS AS WIDE AS THE NAME
      const bande = encre(r.img, Math.round(N.t), Math.round(N.b), N.l - 6);
      const attendu = N.r - N.l;
      const vu = bande.n ? bande.max - bande.min + 1 : 0;
      if (!bande.n) {
        failures.push(nom + ": no ink where the name sits (rows " + Math.round(N.t) + " to " + Math.round(N.b) + ")");
      } else if (Math.abs(vu - attendu) > attendu * 0.12 + 8) {
        failures.push(nom + ": the name spans " + vu + "px of ink in the PDF for " + Math.round(attendu)
          + "px on the page. Words are drawn at the wrong places: this is the "
          + "\"Managed    a portfolio\" PDF.");
      } else if (bande.min < N.l - 8 || bande.max > N.r + 8) {
        failures.push(nom + ": the name's ink runs from " + bande.min + " to " + bande.max
          + " while the page puts it from " + Math.round(N.l) + " to " + Math.round(N.r));
      }
      // 2. THE LAST LINE IS THERE
      const fin = encre(r.img, Math.round(D.t), Math.round(D.b));
      if (!fin.n) {
        failures.push(nom + ": no ink where the last line sits (\"" + D.texte + "\", rows "
          + Math.round(D.t) + " to " + Math.round(D.b) + "). The bottom of the CV was cut off the picture.");
      }
    }
    if (!failures.length) console.log("      on desktop and phone, the ink of the PDF sits where the page puts it, first name to last line");
  } catch (err) {
    failures.push("the test itself crashed: " + (err && err.message));
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
