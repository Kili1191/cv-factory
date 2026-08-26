// Copie le worker pdf.js depuis node_modules vers public/ avant chaque build.
//
// L'import de CV chargeait ce worker depuis cdnjs. Quand cette requete
// echoue - bloqueur de contenu sur mobile, filtrage reseau, CSP - pdf.js
// bascule sur un "fake worker" qui retente la MEME url, echoue, et l'import
// ne produit rien. La lecture d'un CV est la premiere etape du produit :
// elle ne doit dependre d'aucun tiers.
//
// On copie au lieu de versionner le fichier : la copie suit automatiquement
// la version installee de pdfjs-dist et ne peut pas deriver.

import { copyFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.js");
const destDir = join(root, "public");
const dest = join(destDir, "pdf.worker.min.js");

if (!existsSync(src)) {
  console.error("[copy-pdf-worker] introuvable :", src);
  console.error("[copy-pdf-worker] pdfjs-dist est-il installe ?");
  process.exit(1);
}
mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`[copy-pdf-worker] ${(statSync(dest).size / 1024).toFixed(0)} Ko -> public/pdf.worker.min.js`);
