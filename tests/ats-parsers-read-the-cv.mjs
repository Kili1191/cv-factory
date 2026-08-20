// Le CV lu par les moteurs d'extraction que les ATS utilisent vraiment.
//
// Pourquoi ce test existe : jusqu'ici l'export n'etait verifie qu'avec pdf.js.
// pdf.js n'est pas un ATS, et se fier a un seul moteur avait deja laisse
// passer deux bugs graves. Un ATS ne lit pas le PDF lui-meme : il delegue a
// une bibliotheque d'extraction. Les deux plus repandues dans les chaines de
// traitement de CV sont Apache PDFBox (via Tika, cote Java) et poppler (cote
// Unix). Ce sont des implementations totalement independantes l'une de
// l'autre, et de pdf.js.
//
// Ce que ce test ne fait PAS : simuler un ATS. Le classement, les mots-cles
// et les questions eliminatoires sont propres a chaque editeur, et les
// inventer ne prouverait rien d'autre que nos propres hypotheses. Ce test
// mesure la seule chose qui soit objectivement vraie ou fausse : le texte que
// ces moteurs extraient du fichier, et dans quel ordre.
//
// Deux bugs trouves par ce test, invisibles avec pdf.js seul :
//   - modele chronologie : "Paris, France" chevauchait la gouttiere detectee
//     et se retrouvait en premiere ligne. Tika lisait une ville la ou un
//     analyseur attend le nom du candidat.
//   - le seuil de detection des colonnes classait la chronologie en deux
//     colonnes alors qu'elle n'en a qu'une, cassant tout l'ordre de lecture.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  startServer, stopServer, launchBrowser, exportCvPdf, extractPdfText, SAMPLE_CV,
} from "./lib/harness.mjs";
import { readFileSync } from "node:fs";

const LAYOUTS = ["sidebar", "ats", "classic", "timeline", "swiss", "compact"];

const CV = {
  ...SAMPLE_CV,
  title: "Chef de Produit Sénior",
  summary: "Diplômé de l'ESSEC, spécialisé dans les produits à forte récurrence.",
  experience: [{
    ...SAMPLE_CV.experience[0],
    bullets: [
      "Lance 3 produits generant 4M EUR d'ARR",
      "Déploie une stratégie orientée données à l'échelle européenne",
    ],
  }],
};

// Ce qu'un logiciel de tri doit pouvoir retrouver pour ne pas ecarter la
// candidature sur un champ vide.
const MUST_CONTAIN = [
  ["nom", CV.name],
  ["intitule", "Chef de Produit"],
  ["email", CV.email],
  ["telephone", "+33 6 12 34 56 78"],
  ["employeur", "Acme SaaS"],
  ["resultat chiffre", "4M EUR"],
  ["ecole", "ESSEC"],
  ["competence", "Roadmap"],
  ["certification", "Scrum"],
  ["accents", "stratégie orientée données"],
  ["accent circonflexe", "Diplômé"],
];

// --- Les moteurs -----------------------------------------------------------
// Chacun rend le texte brut du PDF. Absent de la machine, il est signale comme
// non execute plutot que silencieusement ignore : un moteur qui ne tourne pas
// ne prouve rien, et le taire donnerait une fausse assurance.

function popplerAvailable() {
  try { execFileSync("pdftotext", ["-v"], { stdio: "pipe" }); return true; }
  catch { return false; }
}

function tikaJar() {
  const fromEnv = process.env.TIKA_JAR;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  return null;
}

const ENGINES = [
  {
    name: "pdf.js",
    available: () => true,
    read: async (pdfPath) => (await extractPdfText(readFileSync(pdfPath))).text,
  },
  {
    name: "poppler",
    available: popplerAvailable,
    read: async (pdfPath) =>
      execFileSync("pdftotext", ["-enc", "UTF-8", pdfPath, "-"],
        { encoding: "utf8", maxBuffer: 8 << 20 }),
  },
  {
    name: "tika/pdfbox",
    available: () => tikaJar() !== null,
    read: async (pdfPath) =>
      execFileSync("java", ["-jar", tikaJar(), "--text", pdfPath],
        { encoding: "utf8", maxBuffer: 8 << 20, stdio: ["ignore", "pipe", "ignore"] }),
  },
];

// Premiere ligne non vide : c'est celle que beaucoup d'analyseurs prennent
// pour l'identite du candidat.
function firstLine(text) {
  for (const raw of String(text).split("\n")) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (line) return line;
  }
  return "";
}

export async function run() {
  const failures = [];
  const engines = ENGINES.filter(e => e.available());
  const missing = ENGINES.filter(e => !e.available()).map(e => e.name);

  const server = await startServer();
  const browser = await launchBrowser();
  const summary = [];
  try {
    for (const layout of LAYOUTS) {
      const out = await exportCvPdf(browser, CV, layout);
      if (out.failed) { failures.push(`modele ${layout} : ${out.failed}`); continue; }

      for (const engine of engines) {
        let text;
        try {
          text = await engine.read(out.pdfPath);
        } catch (err) {
          failures.push(`${layout} / ${engine.name} : l'extraction a echoue - ${err.message.split("\n")[0]}`);
          continue;
        }
        const flat = String(text).replace(/\s+/g, " ");

        for (const [label, needle] of MUST_CONTAIN) {
          if (!flat.includes(needle)) {
            failures.push(`${layout} / ${engine.name} : ${label} absent du texte extrait - "${needle}"`);
          }
        }

        // L'identite doit ouvrir le document.
        const head = firstLine(text);
        if (!head.includes(CV.name)) {
          failures.push(
            `${layout} / ${engine.name} : la premiere ligne est "${head}" et non le nom du `
            + `candidat. Un analyseur qui prend la premiere ligne pour l'identite se trompe.`
          );
        }
        summary.push(`${layout}/${engine.name}`);
      }
    }

    if (!failures.length) {
      console.log(
        `      ${LAYOUTS.length} modeles x ${engines.length} moteurs `
        + `(${engines.map(e => e.name).join(", ")}) : tous les champs presents, nom en premiere ligne`
      );
    }
    if (missing.length) {
      // Pas un echec : un manque de couverture, dit a voix haute.
      console.log(`      moteur non execute sur cette machine : ${missing.join(", ")}`);
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
