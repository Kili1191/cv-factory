// THE CV LEAVES AS WORD
//
// Agencies paste CVs into their own template and ask for Word; four of
// the builders people compare Nuvi with sell it. The format dialog now
// offers Word beside the paper sizes, and lib/exporterEnDocx.js writes
// the same CV as one column with real headings and real bullets.
//
// Three checks:
//   1. in Node, the file is a real .docx: the name, the contact line,
//      every job, school, skill and certification are in its text, the
//      headings are Word headings, the bullets are list items, and the
//      template's fonts are named;
//   2. LibreOffice Writer opens it and prints one page whose text carries
//      the same facts: the file is a document, not a zip that passes a
//      regex. Required on CI where Writer is installed; a loud skip
//      elsewhere;
//   3. in the browser, choosing Word in the dialog downloads a file whose
//      document.xml carries the name.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV, BASE_URL } from "./lib/harness.mjs";
import { exporterEnDocx, nomDuFichierDocx } from "../lib/exporterEnDocx.js";

function texteDuDocx(octets) {
  const dossier = mkdtempSync(join(tmpdir(), "nuvi-docx-"));
  const fichier = join(dossier, "cv.docx");
  writeFileSync(fichier, octets);
  execFileSync("unzip", ["-q", "-o", fichier, "-d", dossier]);
  const xml = readFileSync(join(dossier, "word", "document.xml"), "utf8");
  return { dossier, fichier, xml, texte: xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") };
}

function ouEstSoffice() {
  for (const p of ["/usr/bin/soffice", "/usr/bin/libreoffice", "/usr/lib/libreoffice/program/soffice"]) if (existsSync(p)) return p;
  return null;
}

export async function run() {
  const failures = [];
  const AIGUILLES = [SAMPLE_CV.name, SAMPLE_CV.email, SAMPLE_CV.phone, SAMPLE_CV.experience[0].title,
    SAMPLE_CV.experience[0].company, SAMPLE_CV.experience[0].bullets[0], SAMPLE_CV.education[0].school,
    SAMPLE_CV.skills[0], SAMPLE_CV.certifications[0]];

  // --- 1. the file itself -------------------------------------------------
  const octets = await exporterEnDocx(SAMPLE_CV, { locale: "fr", theme: { hf: "'Fraunces',Georgia,serif", bf: "'Inter',sans-serif" } });
  if (!octets || octets.length < 3000) failures.push("the .docx is " + (octets ? octets.length : 0) + " bytes");
  if (nomDuFichierDocx(SAMPLE_CV) !== "CV_Jane_Doe.docx") failures.push("file name " + nomDuFichierDocx(SAMPLE_CV));
  const d = texteDuDocx(octets);
  for (const a of AIGUILLES) if (!d.texte.includes(a.replace(/'/g, "&apos;"))) failures.push("missing from the Word text: \"" + a + "\"");
  const titres = (d.xml.match(/w:val="Heading2"/g) || []).length;
  if (titres < 5) failures.push("only " + titres + " Word headings; the sections must be real headings");
  const puces = (d.xml.match(/<w:numPr>/g) || []).length;
  if (puces < SAMPLE_CV.experience[0].bullets.length) failures.push("only " + puces + " list items; bullets must be real list items");
  const polices = new Set(d.xml.match(/w:ascii="([^"]+)"/g) || []);
  if (![...polices].some((p) => /Inter/.test(p)) || ![...polices].some((p) => /Fraunces/.test(p))) {
    failures.push("the template's fonts are not named in the file: " + [...polices].join(", "));
  }
  if (/<w:tbl>/.test(d.xml)) failures.push("the file carries a table: one column, no tables, or an editor's cursor breaks it");

  // --- 2. LibreOffice Writer opens and prints it ------------------------------
  const soffice = ouEstSoffice();
  if (!soffice) {
    console.log("      NON EXECUTE : LibreOffice Writer absent de cette machine");
    if (process.env.CI) failures.push("LibreOffice Writer missing on CI");
  } else {
    try {
      execFileSync(soffice, ["-env:UserInstallation=file://" + d.dossier + "/lo", "--headless", "--convert-to", "pdf", "--outdir", d.dossier, d.fichier],
        { stdio: "ignore", timeout: 180_000 });
      const pdf = join(d.dossier, "cv.pdf");
      if (!existsSync(pdf)) failures.push("Writer produced no PDF from the .docx");
      else {
        const info = execFileSync("pdfinfo", [pdf]).toString();
        const pages = Number((info.match(/Pages:\s+(\d+)/) || [])[1] || 0);
        if (pages !== 1) failures.push("Writer prints the sample CV on " + pages + " page(s) instead of one");
        const txt = execFileSync("pdftotext", [pdf, "-"]).toString();
        for (const a of AIGUILLES) if (!txt.includes(a)) failures.push("missing from Writer's rendering: \"" + a + "\"");
      }
    } catch (e) {
      failures.push("Writer could not convert the file: " + (e && e.message ? e.message.split("\n")[0] : e));
    }
  }

  // --- 3. the browser path ---------------------------------------------------
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
    const page = await ctx.newPage();
    await seedApp(page, SAMPLE_CV, { locale: "en", layout: "classic" });
    await page.evaluate(() => { try { localStorage.removeItem("nuvi-format-always"); localStorage.removeItem("nuvi-format-pref"); } catch (e) {} });
    await page.waitForTimeout(1200);
    await page.click('button[aria-label="Telecharger CV"]');
    await page.waitForTimeout(1200);
    const choisi = await page.evaluate(() => {
      const b = [...document.querySelectorAll("button, [role=button], label, div")].find((x) => /^Word\b/.test((x.textContent || "").trim()));
      if (!b) return false; b.click(); return true;
    });
    if (!choisi) failures.push("no Word option in the format dialog");
    else {
      const [dl] = await Promise.all([
        page.waitForEvent("download", { timeout: 30_000 }),
        page.evaluate(() => {
          const b = [...document.querySelectorAll("button")].find((x) => /^(Download|Telecharger)$/.test((x.textContent || "").trim()));
          if (b) b.click();
        }),
      ]);
      const chemin = await dl.path();
      const nom = dl.suggestedFilename();
      if (!/\.docx$/.test(nom)) failures.push("the browser download is named " + nom);
      const dd = texteDuDocx(readFileSync(chemin));
      if (!dd.texte.includes(SAMPLE_CV.name)) failures.push("the downloaded Word file does not carry the name");
    }
    await ctx.close();
    if (!failures.length) {
      console.log("      a real .docx: headings, list items, the template's fonts, one page under Writer, and the dialog's Word choice downloads it");
    }
  } catch (err) {
    failures.push("the test crashed: " + (err && err.message ? err.message : String(err)));
  } finally {
    await browser.close();
    await stopServer(server);
  }
  void BASE_URL;
  return failures;
}
