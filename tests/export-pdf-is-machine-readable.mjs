// Le test qui aurait attrape le bug.
//
// L'export produisait un unique JPEG : zero texte dans le fichier. Un ATS lit
// du texte, donc chaque CV exporte arrivait vide devant le premier filtre
// automatique. Personne ne l'a vu parce que rien n'exercait l'export.
//
// Ce test telecharge un vrai PDF depuis l'application et verifie qu'un
// analyseur y retrouve les informations qui decident d'une candidature. S'il
// echoue, le CV n'est pas lisible par une machine : ne pas livrer.
//
// Il couvre les deux formes de mise en page : la colonne laterale, qui est le
// choix par defaut, et la mise en page ATS-Safe en une seule colonne. Ce sont
// deux dispositions du texte tres differentes, et la couche invisible se
// calcule a partir de la position reelle des mots a l'ecran.

import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServer, stopServer, launchBrowser, seedApp, extractPdfText, SAMPLE_CV } from "./lib/harness.mjs";

// Un CV francais est plein d'accents, et la couche de texte invisible est
// ecrite par jsPDF, pas par le navigateur : si son encodage les abime, l'ATS
// lit "Ing nieur" la ou le candidat a ecrit "Ingenieur diplome". On exporte
// donc un CV accentue et on verifie que les accents ressortent intacts.
const CV = {
  ...SAMPLE_CV,
  title: "Chef de Produit Sénior",
  summary: "Diplômé de l'ESSEC, spécialisé dans les produits à forte récurrence."
    + " Mène des équipes pluridisciplinaires depuis huit années.",
  experience: [{
    ...SAMPLE_CV.experience[0],
    bullets: [
      "Lance 3 produits generant 4M EUR d'ARR",
      "Déploie une stratégie orientée données à l'échelle européenne",
    ],
  }],
};

// Ce qu'un recruteur, ou son logiciel, doit pouvoir retrouver.
const MUST_CONTAIN = [
  ["nom",           CV.name],
  ["intitule",      "Chef de Produit"],
  ["email",         CV.email],
  ["telephone",     CV.phone],
  ["employeur",     "Acme SaaS"],
  ["resultat chiffre", "4M EUR"],
  ["ecole",         "ESSEC"],
  ["competence",    "Roadmap"],
  ["certification", "Scrum"],
  ["accents conserves", "stratégie orientée données"],
  ["accent circonflexe", "Diplômé"],
];

// Telecharge un PDF depuis l'application dans la mise en page demandee.
async function exportOnce(browser, layout) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, acceptDownloads: true });
  const page = await ctx.newPage();
  // Seules les exceptions JS comptent. Les erreurs de chargement de
  // ressources (polices Google, favicon) dependent du reseau de la machine
  // qui execute le test et n'ont rien a voir avec l'export : les prendre
  // pour des echecs rendrait la suite ininterpretable.
  const errors = [];
  page.on("pageerror", e => errors.push(e.message.split("\n")[0]));
  await seedApp(page, CV, { layout });

  // Le .catch est attache tout de suite : sans lui, si un clic echoue, la
  // promesse de telechargement reste pendante et sa rejection masque la
  // vraie erreur au moment ou le navigateur se ferme.
  let downloadErr = null;
  const downloadPromise = page
    .waitForEvent("download", { timeout: 90_000 })
    .catch((e) => { downloadErr = e; return null; });

  let clickErrMsg = null;
  try {
    await page.getByRole("button", { name: /Telecharger/i }).first().click({ timeout: 15_000 });
    await page.waitForTimeout(1500);
    // Une modale de choix de format peut s'interposer.
    const confirm = page.getByRole("button", { name: /A4|Standard|Telecharger/i });
    if (await confirm.count() > 1) { await confirm.nth(1).click({ timeout: 10_000 }).catch(() => {}); }
  } catch (clickErr) {
    clickErrMsg = clickErr.message.split("\n")[0];
  }

  const download = await downloadPromise;
  if (!download) {
    await ctx.close();
    return {
      errors, failed:
        "aucun PDF telecharge.\n" +
        (clickErrMsg ? "      clic : " + clickErrMsg + "\n" : "") +
        "      erreurs page : " + (errors.slice(0, 3).join(" | ") || "aucune") + "\n" +
        "      " + (downloadErr ? downloadErr.message.split("\n")[0] : ""),
    };
  }
  const dir = mkdtempSync(join(tmpdir(), "cvf-export-"));
  const pdfPath = join(dir, "cv.pdf");
  await download.saveAs(pdfPath);
  const bytes = readFileSync(pdfPath);
  await ctx.close();
  const { text, pages } = await extractPdfText(bytes);
  return { errors, bytes, text, pages };
}

// Les controles qui valent pour toute mise en page.
function checkCommon(label, out, failures) {
  if (out.text.length === 0) {
    failures.push(
      `${label} : le PDF exporte ne contient AUCUN texte extractible.\n` +
      "      C'est le bug de la couche image : un ATS ne lira rien du CV.\n" +
      "      Verifier overlayTextLayer dans app/page.jsx."
    );
    return;
  }
  if (!out.bytes.includes(Buffer.from("DCTDecode"))) {
    failures.push(`${label} : l'image du rendu a disparu du PDF, le CV ne ressemblera plus a rien`);
  }
  if (out.pages !== 1) failures.push(`${label} : le CV devrait tenir sur 1 page, ${out.pages} trouvees`);

  // Un robot de tri lit le flux de texte dans l'ordre et prend les premieres
  // lignes pour l'identite. La mise en page a deux colonnes rangeant la
  // colonne laterale en premier dans le HTML, le texte commencait par
  // "CONTACT" et l'adresse e-mail : le nom du candidat arrivait apres les
  // competences. Le nom doit venir avant le mot CONTACT.
  const posNom = out.text.indexOf(CV.name);
  const posContact = out.text.search(/CONTACT/i);
  if (posNom === -1) {
    failures.push(`${label} : le nom du candidat est absent du flux de texte`);
  } else if (posContact !== -1 && posContact < posNom) {
    failures.push(
      `${label} : le texte extrait commence par la colonne laterale, un ATS lira ` +
      `"${out.text.slice(0, 40).replace(/\s+/g, " ").trim()}" avant le nom du candidat`
    );
  }
  if (out.errors.length) {
    failures.push(`${label} : erreurs JS pendant l'export - ` + out.errors.slice(0, 2).join(" | "));
  }
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    // Mise en page par defaut : deux colonnes.
    const main = await exportOnce(browser, "sidebar");
    if (main.failed) {
      failures.push("colonne laterale : " + main.failed);
    } else {
      checkCommon("colonne laterale", main, failures);
      for (const [what, needle] of MUST_CONTAIN) {
        if (!main.text.includes(needle)) {
          failures.push(`colonne laterale : ${what} absent du texte du PDF - "${needle}"`);
        }
      }
    }

    // Mise en page ATS-Safe : une seule colonne. Le regroupement par colonne
    // ne doit pas y inventer de gouttiere et disperser le texte.
    const ats = await exportOnce(browser, "ats");
    if (ats.failed) {
      failures.push("ATS-Safe : " + ats.failed);
    } else {
      checkCommon("ATS-Safe", ats, failures);
      for (const [what, needle] of MUST_CONTAIN) {
        if (!ats.text.includes(needle)) {
          failures.push(`ATS-Safe : ${what} absent du texte du PDF - "${needle}"`);
        }
      }
    }

    if (!failures.length) {
      console.log(
        `      colonne laterale : ${main.text.length} caracteres, ` +
        `ATS-Safe : ${ats.text.length} caracteres, nom en tete, image conservee`
      );
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
