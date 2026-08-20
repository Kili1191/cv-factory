// La couche de texte invisible ne doit contenir que ce qui est sur la page.
//
// POURQUOI CE TEST EXISTE
//
// Le PDF exporte est une image, doublee d'une couche de texte invisible que
// les robots de tri lisent. Depuis qu'elle se deroule en une colonne pour
// rester lisible par les moteurs qui vont par position, cette couche n'est
// plus posee sur les mots de l'image : les deux peuvent diverger sans que rien
// ne s'en apercoive.
//
// Deux risques, opposes :
//   - du texte perdu : la couche oublie ce que l'oeil voit, et le robot ne
//     retrouve pas un employeur pourtant imprime.
//   - du texte fantome : la couche contient des mots absents de la page. Ce
//     serait du bourrage de mots-cles, c'est-a-dire tromper le logiciel de
//     tri sur ce que le candidat a reellement ecrit. L'application ne doit
//     jamais faire ca, et ce test est la garantie que personne ne l'ajoutera
//     plus tard sans que la suite le refuse.
//
// COMMENT
//
// On rend la page en image, on la lit avec un moteur d'OCR - donc exactement
// ce qu'un oeil voit, sans acces au fichier - et on compare au texte extrait
// du PDF. L'OCR est bruite par nature : un mot en gris clair de 8px peut lui
// echapper. Le seuil ne cherche donc pas la perfection, il cherche l'absence
// de bloc entier de texte invente.

import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServer, stopServer, launchBrowser, exportCvPdf, SAMPLE_CV } from "./lib/harness.mjs";

const LAYOUTS = ["sidebar", "ats", "classic", "timeline", "swiss", "compact"];

// Part des mots de la couche que l'OCR doit confirmer. Mesure sur les six
// modeles : de 84% (modele a la typographie la plus fine) a 100%. En dessous
// de 75%, ce n'est plus du bruit d'OCR : c'est du texte qui n'est pas la.
const MIN_CONFIRMED = 0.75;

function available(cmd, args) {
  try { execFileSync(cmd, args, { stdio: "pipe" }); return true; }
  catch { return false; }
}

function fold(s) {
  return String(s == null ? "" : s)
    .normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Mots assez longs pour etre significatifs : les mots courts sont trop
// sensibles au bruit de l'OCR pour prouver quoi que ce soit.
function words(text) {
  return new Set((fold(text).match(/[a-z0-9@]{4,}/g) || []));
}

export async function run() {
  const failures = [];
  const haveMutool = available("mutool", ["-v"]);
  const haveTesseract = available("tesseract", ["--version"]);
  const havePdftotext = available("pdftotext", ["-v"]);

  if (!haveMutool || !haveTesseract || !havePdftotext) {
    const missing = [
      !haveMutool && "mutool (mupdf-tools)",
      !haveTesseract && "tesseract-ocr",
      !havePdftotext && "pdftotext (poppler-utils)",
    ].filter(Boolean);
    // Non execute, dit a voix haute : un controle qui n'a pas tourne ne
    // prouve rien, et le taire donnerait une fausse assurance.
    console.log(`      NON EXECUTE : ${missing.join(", ")} absent(s) de cette machine`);
    return [];
  }

  const server = await startServer();
  const browser = await launchBrowser();
  const scores = [];
  try {
    for (const layout of LAYOUTS) {
      const out = await exportCvPdf(browser, SAMPLE_CV, layout);
      if (out.failed) { failures.push(`modele ${layout} : ${out.failed}`); continue; }

      const dir = mkdtempSync(join(tmpdir(), "cvf-ocr-"));
      const png = join(dir, "page.png");
      const base = join(dir, "vu");
      try {
        // 200 dpi : ce qu'un ecran ou une impression rendent honnetement.
        execFileSync("mutool", ["draw", "-F", "png", "-r", "200", "-o", png, out.pdfPath], { stdio: "pipe" });
        execFileSync("tesseract", [png, base, "-l", "fra"], { stdio: "pipe" });
      } catch (err) {
        failures.push(`modele ${layout} : rendu ou OCR impossible - ${err.message.split("\n")[0]}`);
        continue;
      }

      const seenByEye = words(readFileSync(base + ".txt", "utf8"));
      const inLayer = words(execFileSync("pdftotext", ["-enc", "UTF-8", out.pdfPath, "-"], { encoding: "utf8" }));
      if (inLayer.size === 0) { failures.push(`modele ${layout} : couche de texte vide`); continue; }

      const confirmed = [...inLayer].filter(w => seenByEye.has(w));
      const share = confirmed.length / inLayer.size;
      scores.push(`${layout}:${Math.round(share * 100)}%`);

      if (share < MIN_CONFIRMED) {
        const phantom = [...inLayer].filter(w => !seenByEye.has(w)).slice(0, 8);
        failures.push(
          `modele ${layout} : seulement ${Math.round(share * 100)}% des mots de la couche `
          + `invisible sont visibles sur la page. Mots non vus : ${phantom.join(", ")}. `
          + `Soit la page a perdu du texte, soit la couche en contient qui n'y est pas.`
        );
      }
    }
    if (!failures.length) {
      console.log(`      couche invisible confirmee par l'oeil : ${scores.join("  ")}`);
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
