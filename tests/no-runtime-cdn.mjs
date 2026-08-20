// Les deux pannes arrivees en production avaient la meme origine : une
// fonction essentielle allait chercher son code sur un CDN tiers.
//
//   - import de CV  : worker pdf.js depuis cdnjs -> rien ne s'importait
//   - export PDF    : html2canvas et jsPDF depuis cdnjs -> intestable, et le
//                     PDF est reste une image pendant des mois
//
// Un bloqueur de contenu, un reseau filtre ou une panne de CDN suffit. Ce
// controle interdit le motif : ce dont l'application a besoin pour
// fonctionner doit venir de son propre bundle.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SCAN_DIRS = ["app", "lib"];
const CDN_PATTERN = /https?:\/\/(cdnjs\.cloudflare\.com|unpkg\.com|cdn\.jsdelivr\.net|esm\.sh)/g;

// Les polices Google restent autorisees : purement decoratives, et le texte
// reste lisible avec la pile de repli si elles ne chargent pas.
const ALLOWED = [/fonts\.googleapis\.com/, /fonts\.gstatic\.com/];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|jsx|ts|tsx)$/.test(entry)) out.push(p);
  }
  return out;
}

export async function run() {
  const failures = [];
  let scanned = 0;

  for (const d of SCAN_DIRS) {
    let files = [];
    try { files = walk(join(ROOT, d)); } catch (e) { continue; }
    for (const file of files) {
      scanned += 1;
      const src = readFileSync(file, "utf8");
      const lines = src.split("\n");
      lines.forEach((line, i) => {
        if (ALLOWED.some(rx => rx.test(line))) return;
        const hits = line.match(CDN_PATTERN);
        if (hits) {
          failures.push(
            `${relative(ROOT, file)}:${i + 1} charge du code depuis un CDN tiers (${hits[0]}).\n` +
            "      Installer la dependance et l'importer, comme pdfjs-dist / html2canvas / jspdf.\n" +
            "      Un CDN injoignable = fonctionnalite morte chez l'utilisateur, et intestable ici."
          );
        }
      });
    }
  }
  if (!failures.length) console.log(`      ${scanned} fichiers, aucune dependance CDN a l'execution`);
  return failures;
}
