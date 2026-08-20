// Le test qui aurait attrape le bug.
//
// L'export produisait un unique JPEG : zero texte dans le fichier. Un ATS lit
// du texte, donc chaque CV exporte arrivait vide devant le premier filtre
// automatique. Personne ne l'a vu parce que rien n'exercait l'export.
//
// Ce test telecharge un vrai PDF depuis l'application et verifie qu'un
// analyseur y retrouve les informations qui decident d'une candidature. S'il
// echoue, le CV n'est pas lisible par une machine : ne pas livrer.

import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServer, stopServer, launchBrowser, seedApp, extractPdfText, SAMPLE_CV } from "./lib/harness.mjs";

// Ce qu'un recruteur, ou son logiciel, doit pouvoir retrouver.
const MUST_CONTAIN = [
  ["nom",           SAMPLE_CV.name],
  ["intitule",      "Product Manager"],
  ["email",         SAMPLE_CV.email],
  ["telephone",     SAMPLE_CV.phone],
  ["employeur",     "Acme SaaS"],
  ["resultat chiffre", "4M EUR"],
  ["ecole",         "ESSEC"],
  ["competence",    "Roadmap"],
  ["certification", "Scrum"],
];

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, acceptDownloads: true });
    const page = await ctx.newPage();
    // Seules les exceptions JS comptent. Les erreurs de chargement de
    // ressources (polices Google, favicon) dependent du reseau de la machine
    // qui execute le test et n'ont rien a voir avec l'export : les prendre
    // pour des echecs rendrait la suite ininterpretable.
    const errors = [];
    page.on("pageerror", e => errors.push(e.message.split("\n")[0]));
    await seedApp(page);

    // Le .catch est attache tout de suite : sans lui, si un clic echoue, la
    // promesse de telechargement reste pendante et sa rejection masque la
    // vraie erreur au moment ou le navigateur se ferme.
    let downloadErr = null;
    const downloadPromise = page
      .waitForEvent("download", { timeout: 90_000 })
      .catch((e) => { downloadErr = e; return null; });

    try {
      await page.getByRole("button", { name: /Telecharger/i }).first().click({ timeout: 15_000 });
      await page.waitForTimeout(1500);
      // Une modale de choix de format peut s'interposer.
      const confirm = page.getByRole("button", { name: /A4|Standard|Telecharger/i });
      if (await confirm.count() > 1) { await confirm.nth(1).click({ timeout: 10_000 }).catch(() => {}); }
    } catch (clickErr) {
      failures.push("impossible de declencher l'export : " + clickErr.message.split("\n")[0]);
    }

    const download = await downloadPromise;
    if (!download) {
      failures.push(
        "aucun PDF telecharge.\n" +
        "      erreurs page : " + (errors.slice(0, 3).join(" | ") || "aucune") + "\n" +
        "      " + (downloadErr ? downloadErr.message.split("\n")[0] : "")
      );
      return failures;
    }
    const dir = mkdtempSync(join(tmpdir(), "cvf-export-"));
    const pdfPath = join(dir, "cv.pdf");
    await download.saveAs(pdfPath);
    const bytes = readFileSync(pdfPath);

    const { text, pages } = await extractPdfText(bytes);

    if (text.length === 0) {
      failures.push(
        "le PDF exporte ne contient AUCUN texte extractible.\n" +
        "      C'est le bug de la couche image : un ATS ne lira rien du CV.\n" +
        "      Verifier overlayTextLayer dans app/page.jsx."
      );
    }
    for (const [label, needle] of MUST_CONTAIN) {
      if (!text.includes(needle)) failures.push(`${label} absent du texte du PDF : "${needle}"`);
    }
    if (pages !== 1) failures.push(`le CV devrait tenir sur 1 page, ${pages} trouvees`);
    if (!bytes.includes(Buffer.from("DCTDecode"))) {
      failures.push("l'image du rendu a disparu du PDF : le CV ne ressemblera plus a rien");
    }
    if (errors.length) failures.push("erreurs JS pendant l'export : " + errors.slice(0, 2).join(" | "));

    if (!failures.length) {
      console.log(`      ${text.length} caracteres extraits, ${pages} page, image conservee`);
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
