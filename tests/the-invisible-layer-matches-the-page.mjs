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

// DEUX CONTROLES, PARCE QU'IL Y A DEUX RISQUES ET UN SEUL NE LES COUVRE PAS
//
// 1. LE TEXTE FANTOME - la couche invisible contient un mot qui n'est pas sur
//    la page. C'est du bourrage de mots-cles : tromper le logiciel de tri sur
//    ce que le candidat a reellement ecrit. C'est le risque grave, et il se
//    verifie EXACTEMENT en comparant la couche au DOM du CV. Zero tolerance.
//
// 2. LA COUCHE DETACHEE - la couche ne dit plus rien de ce que la page
//    montre. Seul l'OCR peut le voir, puisqu'il lit l'image rendue.
//
// POURQUOI L'OCR NE PEUT PAS SERVIR AU PREMIER
//
// Ce test gardait le premier risque avec un pourcentage d'OCR a 75%. Il a
// bloque une mise en ligne pour une raison qui n'avait rien a voir avec le
// produit : sur la machine de developpement, le reseau bloque Google Fonts,
// le CV se rend donc avec des polices de secours, et tesseract les lit BIEN
// (sidebar 79%, timeline 79%). En integration continue les vraies polices se
// chargent - Fraunces est une serif fine - et tesseract les lit MOINS bien
// (70% et 74%). Le meme commit, le meme CV, deux verdicts opposes.
//
// Aucun des mots manquants n'etait invente : "profil", "2021", "linkedin",
// "france" sont tous imprimes sur la page. L'OCR ne savait pas les lire.
//
// Autrement dit le pourcentage mesurait la lisibilite de la police par un
// moteur d'OCR, pas l'honnetete de la couche. Il garde donc le seul role qu'il
// peut tenir : constater que la couche n'est pas detachee de la page.
const MIN_CONFIRMED = 0.55;

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

  // DEUX PHASES, ET C'EST INDISPENSABLE
  //
  // La premiere version intercalait le rendu d'image et l'OCR entre chaque
  // export. Les trois premiers modeles passaient, les trois derniers
  // echouaient sur un clic qui expirait : mutool et tesseract sont lourds, et
  // la pression accumulee finissait par affamer le navigateur encore ouvert.
  //
  // On exporte donc les six PDF d'abord, on ferme le navigateur, et seulement
  // ensuite on lance les outils d'analyse. Plus rien ne se dispute la machine,
  // et le test est aussi nettement plus rapide.
  const server = await startServer();
  const browser = await launchBrowser();
  const scores = [];
  const exported = [];
  try {
    for (const layout of LAYOUTS) {
      const out = await exportCvPdf(browser, SAMPLE_CV, layout);
      if (out.failed) { failures.push(`modele ${layout} : ${out.failed}`); continue; }
      exported.push({ layout, pdfPath: out.pdfPath, domText: out.domText || "" });
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }

  try {
    for (const { layout, pdfPath, domText } of exported) {
      const out = { pdfPath };

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

      // --- 1. AUCUN MOT FANTOME (exact, sans OCR) --------------------
      const onPage = words(domText);
      if (onPage.size === 0) {
        failures.push(
          `modele ${layout} : le texte du CV n'a pas pu etre lu dans la page. `
          + "Le controle du bourrage de mots-cles n'a donc PAS eu lieu."
        );
      } else {
        const fantomes = [...inLayer].filter(w => !onPage.has(w));
        if (fantomes.length) {
          failures.push(
            `modele ${layout} : la couche de texte invisible contient `
            + `${fantomes.length} mot(s) absents de la page : ${fantomes.slice(0, 10).join(", ")}. `
            + "C'est du bourrage de mots-cles - tromper le logiciel de tri sur ce "
            + "que le candidat a reellement ecrit. L'application ne doit jamais faire ca."
          );
        }
      }

      // --- 2. LA COUCHE N'EST PAS DETACHEE DE LA PAGE (OCR) ----------
      const confirmed = [...inLayer].filter(w => seenByEye.has(w));
      const share = confirmed.length / inLayer.size;
      scores.push(`${layout}:${Math.round(share * 100)}%`);

      if (share < MIN_CONFIRMED) {
        const nonVus = [...inLayer].filter(w => !seenByEye.has(w)).slice(0, 8);
        failures.push(
          `modele ${layout} : l'oeil ne retrouve que ${Math.round(share * 100)}% des mots `
          + `de la couche invisible sur la page. Mots non vus : ${nonVus.join(", ")}. `
          + "A ce niveau la couche ne decrit plus ce qui est imprime : soit la page "
          + "a perdu du texte, soit la couche s'est desolidarisee du rendu."
        );
      }
    }
    if (!failures.length) {
      console.log(
        `      aucun mot invente dans la couche invisible sur ${exported.length} modeles ; `
        + `part relue par l'oeil : ${scores.join("  ")}`
      );
    }
  } catch (err) {
    failures.push(`analyse impossible : ${err.message.split("\n")[0]}`);
  }
  return failures;
}
