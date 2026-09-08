// The downloaded PDF carries no trace of the tool.
//
// A PDF has properties that every reader shows under File > Properties, and
// that a part of the ATS read: Title, Author, Creator, Producer. The print
// page had no title of its own, so it inherited the site's, and every CV
// printed natively left with "Nuvi - the CV that gets past the ATS" in its
// Title. The picture export left the field empty, which is its own tell.
//
// Nuvi's whole promise is a credible document. A recruiter who opens the
// properties and reads the name of the tool that wrote it learns something
// the candidate did not choose to tell them. In September 2026 a competitor
// went viral for exactly this class of leak, a trace of the tool visible to
// the person hiring, and it is the kind of thing nobody checks until it is
// on a screen in front of HR.
//
// So: the Title is the candidate's, the Author is the candidate, and the
// word Nuvi appears nowhere in the metadata of any layout.

import { startServer, stopServer, launchBrowser, exportCvPdf, SAMPLE_CV } from "./lib/harness.mjs";

// The properties Chromium and jsPDF write, read straight from the trailer's
// /Info dictionary. No external tool: the suite must fail on the metadata,
// not on whether poppler happens to be installed.
function proprietes(octets) {
  const brut = Buffer.from(octets).toString("latin1");
  const champs = {};
  for (const nom of ["Title", "Author", "Creator", "Producer", "Subject", "Keywords"]) {
    // "/Title (texte)" or "/Title <hex>", the two forms a PDF string takes.
    const litteral = new RegExp("/" + nom + "\\s*\\(((?:\\\\.|[^\\\\)])*)\\)").exec(brut);
    if (litteral) { champs[nom] = litteral[1].replace(/\\([()\\\\])/g, "$1"); continue; }
    const hexa = new RegExp("/" + nom + "\\s*<([0-9A-Fa-f\\s]+)>").exec(brut);
    if (hexa) {
      const octetsHex = hexa[1].replace(/\s+/g, "");
      let texte = "";
      for (let i = 0; i < octetsHex.length; i += 2) texte += String.fromCharCode(parseInt(octetsHex.slice(i, i + 2), 16));
      // UTF-16BE with a byte order mark, which is how Chromium writes them.
      if (texte.startsWith("\xFE\xFF")) {
        let u = "";
        for (let i = 2; i < texte.length; i += 2) u += String.fromCharCode((texte.charCodeAt(i) << 8) | texte.charCodeAt(i + 1));
        texte = u;
      }
      champs[nom] = texte;
    }
  }
  return champs;
}

const CV = { ...SAMPLE_CV, name: "Camille Marchetti", title: "Bar Manager" };

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    // "classic" prints natively through Chromium; "sidebar" is a two column
    // layout and leaves as a picture doubled with its written layer. The two
    // paths write their properties differently, so both are measured.
    for (const layout of ["classic", "sidebar"]) {
      let octets;
      try {
        const r = await exportCvPdf(browser, CV, layout);
        octets = Buffer.from(r && r.bytes ? r.bytes : r);
      } catch (err) {
        failures.push(layout + ": the export crashed: " + (err && err.message ? err.message.slice(0, 120) : String(err)));
        continue;
      }
      const p = proprietes(octets);

      // 1. Nothing in the properties names the tool.
      for (const [nom, valeur] of Object.entries(p)) {
        if (/nuvi/i.test(valeur || "")) {
          failures.push(layout + ": " + nom + " says \"" + valeur + "\". A recruiter who opens "
            + "the properties reads the name of the tool on the candidate's document.");
        }
        if (/gets past the ATS|passe les robots/i.test(valeur || "")) {
          failures.push(layout + ": " + nom + " carries the product's slogan (\"" + valeur + "\").");
        }
      }

      // 2. The title is the candidate's, and it is not empty.
      const titre = (p.Title || "").trim();
      if (!titre) {
        failures.push(layout + ": the PDF has no Title. An empty Title is its own tell: a "
          + "document written by hand carries the name of the person.");
      } else if (!titre.includes("Camille Marchetti")) {
        failures.push(layout + ": Title is \"" + titre + "\" instead of naming the candidate.");
      }

      // 3. Nothing announces the machine that printed it. Chromium writes
      // its user agent into Creator, and headless says "HeadlessChrome":
      // the one string in the file that no document printed by a person
      // ever carries.
      if (/headless/i.test(p.Creator || "")) {
        failures.push(layout + ": Creator says \"" + p.Creator + "\". A CV printed by a person "
          + "never announces a headless browser.");
      }

      // 4. The whole file, not only the properties: no stray mention of the
      // site anywhere a reader could surface it.
      const brut = octets.toString("latin1");
      if (/thenuvi\.com/i.test(brut)) {
        failures.push(layout + ": the file body contains the site address.");
      }
    }

    if (!failures.length) {
      console.log("      2 layouts exported: the properties name the candidate, never the tool, "
        + "and no title carries the product's slogan");
    }
  } catch (err) {
    failures.push("the test itself crashed: " + (err && err.message));
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
