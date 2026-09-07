// A LinkedIn profile saved as PDF is a CV.
//
// WHAT WENT WRONG
//
// Half the people who arrive with no CV file have a LinkedIn profile, and
// LinkedIn hands it out as a PDF in one click ("Save to PDF"). Dropped on
// Nuvi, that file came back as a puzzle: the contact column on the left
// (Contact, Top Skills, Languages, Certifications) sits beside the profile
// on the right, and the reader rebuilt lines from their height alone, so
// each line took a piece of both columns, "Top Skills" glued to a job
// title. What survived was misfiled: "Contact" became a degree, the period
// "January 2021 - Present (3 years 8 months)" left its bracket as a
// location, the school came out as the degree, and a description the page
// had wrapped became a job called "sur deux continents.".
//
// WHAT THIS HOLDS
//
//   1. On a two-column page, the file reader finds the columns and reads
//      the profile first, the narrow column after, from the fragments
//      pdf.js hands it.
//   2. The CV reader knows LinkedIn's shapes: its headings, its period
//      with the length in brackets, the school above the degree, the page
//      footer, and the sentence the page wrapped.
//   3. Through the app, the file is read on the device, whole, without a
//      call to the model.
//
// The fixture is a page laid out like the export, printed by Chromium at
// test time: a LinkedIn file is personal and none is checked in. The
// shape is the export's (columns, headings, orders, period format); the
// fonts and margins are not, and a real file is the next thing to try.

import { chromium } from "playwright";
import { browserOptions } from "./lib/chromium.mjs";
import { startServer, stopServer, launchBrowser, answerLanguageIfAsked, BASE_URL } from "./lib/harness.mjs";
import { enColonnes } from "../lib/lireUnFichier.js";
import { lireUnCv, CONFIANCE_SUFFISANTE } from "../lib/lireUnCv.js";

const APP = (b) => b + "/app";

const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: A4; margin: 0; }
body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #000; }
.page { position: relative; width: 210mm; height: 297mm; }
.gauche { position: absolute; left: 12mm; top: 16mm; width: 42mm; font-size: 9pt; line-height: 1.35; }
.droite { position: absolute; left: 68mm; top: 16mm; width: 130mm; font-size: 10pt; line-height: 1.4; }
h1 { font-size: 22pt; margin: 0 0 2pt; } h2 { font-size: 13pt; margin: 14pt 0 4pt; }
.gauche h3 { font-size: 10.5pt; margin: 12pt 0 3pt; } .gauche p { margin: 0 0 2pt; }
.droite p { margin: 0 0 2pt; } .muted { color: #555; }
.foot { position: absolute; left: 12mm; bottom: 10mm; font-size: 8pt; color: #666; }
</style></head><body><div class="page">
<div class="gauche">
<h3>Contact</h3><p>camille.marchetti@example.com</p><p>www.linkedin.com/in/camille-marchetti (LinkedIn)</p>
<h3>Top Skills</h3><p>Roadmap produit</p><p>SQL</p><p>Agile</p>
<h3>Languages</h3><p>French (Native or Bilingual)</p><p>English (Full Professional)</p>
<h3>Certifications</h3><p>Professional Scrum Master I</p>
</div>
<div class="droite">
<h1>Camille Marchetti</h1><p>Senior Product Manager at Acme SaaS</p><p class="muted">Paris, Ile-de-France, France</p>
<h2>Summary</h2><p>Product Manager senior avec huit ans d'experience dans le SaaS B2B, de la decouverte client au lancement.</p>
<h2>Experience</h2>
<p><b>Acme SaaS</b></p><p>Senior Product Manager</p><p class="muted">January 2021 - Present (3 years 8 months)</p><p class="muted">Paris, France</p>
<p>Lance trois produits generant quatre millions d'euros de revenu annuel recurrent sur deux continents.</p>
<p>Manage une equipe de six personnes, produit et design, avec un cycle de livraison de deux semaines.</p>
<p><b>Beta Corp</b></p><p>Product Manager</p><p class="muted">March 2017 - December 2020 (3 years 10 months)</p><p class="muted">Lyon, France</p>
<p>Pilote la roadmap produit avec les equipes commerciales et reduit le delai de mise sur le marche de trente pour cent.</p>
<h2>Education</h2><p><b>ESSEC Business School</b></p><p class="muted">Master's degree, Marketing &middot; (2016 - 2018)</p>
</div>
<div class="foot">Page 1 of 1</div>
</div></body></html>`;

async function fixture() {
  const browser = await chromium.launch(browserOptions());
  try {
    const page = await browser.newPage();
    await page.setContent(HTML, { waitUntil: "load" });
    return await page.pdf({ format: "A4", printBackground: true });
  } finally { await browser.close(); }
}

// The lines as the file reader builds them, from pdf.js's fragments, so the
// column detector is exercised on the real fragments and not on a story
// about them.
async function lignesDuPdf(bytes) {
  const mod = await import("pdfjs-dist/legacy/build/pdf.js");
  const pdfjs = mod.getDocument ? mod : (mod.default || {});
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  const frags = content.items.filter((it) => it.str && it.str.trim()).map((it) => ({
    texte: it.str, x: it.transform[4], y: it.transform[5], h: Math.abs(it.transform[3]) || 10, w: it.width,
  }));
  const vue = page.view;
  const col = enColonnes(frags, Math.abs(vue[2] - vue[0]));
  const lignesDe = (fs) => {
    const m = new Map();
    for (const f of fs) { const k = Math.round(f.y / 3); m.set(k, [...(m.get(k) || []), f]); }
    return [...m.entries()].sort((a, b) => b[0] - a[0])
      .map(([, l]) => l.sort((a, b) => a.x - b.x).map((f) => f.texte).join(" ").replace(/\s+/g, " ").trim());
  };
  return { col, lignes: col ? [...lignesDe(col.entete), ...lignesDe(col.principale), ...lignesDe(col.laterale)] : lignesDe(frags) };
}

export async function run() {
  const failures = [];
  const pdf = await fixture();

  // --- 1. The columns are found and read in order ------------------------
  const { col, lignes } = await lignesDuPdf(pdf);
  if (!col) failures.push("the column detector sees one column on a page laid out in two");
  else {
    const texte = lignes.join("\n");
    const iNom = texte.indexOf("Camille Marchetti"), iContact = texte.indexOf("Contact");
    if (iNom < 0) failures.push("the name is not in the lines read");
    else if (iContact >= 0 && iContact < iNom) failures.push("the contact column is read before the profile");
    const collee = lignes.find((l) => /Top Skills/.test(l) && l.length > 12);
    if (collee) failures.push("a line still mixes the two columns: \"" + collee + "\"");
  }

  // --- 2. The CV reader reads LinkedIn's shapes -----------------------------
  const { cv, confiance, raisons } = lireUnCv(lignes.join("\n"));
  const attendu = [
    ["the name", cv.name === "Camille Marchetti"],
    ["two jobs", cv.experience.length === 2],
    ["the first title", cv.experience[0] && cv.experience[0].title === "Senior Product Manager"],
    ["the first employer", cv.experience[0] && cv.experience[0].company === "Acme SaaS"],
    ["the period without its length", cv.experience[0] && cv.experience[0].period === "January 2021 - Present"],
    ["the wrapped sentence whole", cv.experience[0] && cv.experience[0].bullets.some((b) => /recurrent sur deux continents\.$/.test(b))],
    ["the second employer", cv.experience[1] && cv.experience[1].company === "Beta Corp"],
    ["the school as the school", cv.education[0] && cv.education[0].school === "ESSEC Business School"],
    ["the degree as the degree", cv.education[0] && /^Master's degree, Marketing$/.test(cv.education[0].degree)],
    ["the three top skills", cv.skills.join("|") === "Roadmap produit|SQL|Agile"],
    ["the languages with their level", cv.languages.length === 2 && cv.languages[0].level === "Native or Bilingual"],
    ["the certification", cv.certifications.join("|") === "Professional Scrum Master I"],
    ["no page footer anywhere", !JSON.stringify(cv).includes("Page 1 of")],
    ["no \"Contact\" filed as anything", !JSON.stringify(cv).includes("\"Contact\"")],
  ];
  for (const [quoi, ok] of attendu) if (!ok) failures.push("the reader misses " + quoi + ": " + JSON.stringify(cv).slice(0, 300));
  if (confiance < CONFIANCE_SUFFISANTE) failures.push("confidence " + confiance + " under the threshold: " + raisons.join("; "));

  // --- 3. Through the app, on the device, without the model ----------------
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const erreurs = [];
    page.on("pageerror", (e) => erreurs.push(String(e && e.message || e).split("\n")[0]));
    const appels = [];
    await page.route("**/api/claude**", (route) => {
      appels.push(1);
      return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { message: "not expected" } }) });
    });
    await page.goto(APP(BASE_URL), { waitUntil: "domcontentloaded" });
    await answerLanguageIfAsked(page, "en");
    await page.waitForTimeout(2500);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")]
        .find((x) => /already have a CV|I have a CV|deja un CV/i.test(x.textContent || ""));
      if (b) b.click();
    });
    await page.waitForTimeout(1400);
    const champ = await page.$('input[type="file"]');
    if (!champ) failures.push("no file field on the import screen");
    else {
      await page.setInputFiles('input[type="file"]', { name: "Profile.pdf", mimeType: "application/pdf", buffer: pdf });
      await page.waitForTimeout(6000);
      const zone = await page.evaluate(() => { const t = document.querySelector("textarea"); return t ? t.value : null; });
      if (appels.length) failures.push("the LinkedIn PDF was sent to the model: it should be read on the device");
      if (!zone) failures.push("no text area received the file");
      else {
        const iNom = zone.indexOf("Camille Marchetti"), iContact = zone.indexOf("Contact");
        if (iNom < 0) failures.push("the app did not read the name from the file: \"" + zone.slice(0, 80) + "\"");
        else if (iContact >= 0 && iContact < iNom) failures.push("in the app, the contact column comes before the profile");
        if (!/recurrent\s+sur deux continents/.test(zone)) failures.push("in the app, the wrapped sentence is not whole");
        if (/Top Skills\s+\S.*\S/.test(zone.split("\n").find((l) => /Top Skills/.test(l)) || "") && (zone.split("\n").find((l) => /Top Skills/.test(l)) || "").length > 12) {
          failures.push("in the app, a line mixes the two columns: \"" + zone.split("\n").find((l) => /Top Skills/.test(l)) + "\"");
        }
      }
    }
    if (erreurs.length) failures.push("JS error while importing: " + [...new Set(erreurs)].slice(0, 2).join(" | "));
    await ctx.close();
  } catch (err) {
    failures.push("the test crashed: " + (err && err.message ? err.message : String(err)));
  } finally {
    await browser.close();
    await stopServer(server);
  }

  if (!failures.length) {
    console.log("      two columns read in order, two jobs, the school, three skills, two languages and the certification, on the device");
  }
  return failures;
}
