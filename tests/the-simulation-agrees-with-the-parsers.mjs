// La simulation ne doit jamais contredire la mesure.
//
// POURQUOI CE TEST EST LE PLUS IMPORTANT DES DEUX
//
// L'autre test des deux lectures verifie des proprietes internes : bornes,
// determinisme, divergence. Toutes peuvent tenir sur un bareme entierement
// faux. Celui-ci exporte un vrai PDF, le relit avec l'extraction qui conserve
// les lignes, mesure la fidelite reelle champ par champ, et exige que la
// simulation dise la meme chose.
//
// C'EST DEJA ARRIVE DEUX FOIS, DANS LES DEUX SENS
//
// 1. Une premiere version modelisait la mise en page a bande en rangeant le
//    bloc contact avant le nom. Elle annoncait un echec chez les six
//    analyseurs sur un document lu correctement par poppler, MuPDF et Tika.
//    Trop pessimiste : elle aurait fait fuir les gens d'un modele qui marche.
//
// 2. La version suivante cherchait les rubriques inventees en reperant les
//    lignes courtes tout en majuscules. Sur un vrai PDF, elle a signale "SQL"
//    comme rubrique inventee : c'est une competence, seule sur sa ligne, en
//    capitales. Le CV etait lu a 100%, la simulation le recalait chez quatre
//    analyseurs sur six, soit 33 points d'ecart. Le public de Nuvi porte des
//    acronymes partout : SIA, HACCP, EPOS, WSET.
//
// Les deux fois, l'erreur etait invisible en relisant le code et evidente en
// comparant a la mesure. Un score confiant et faux est pire que pas de score :
// il fait prendre de mauvaises decisions avec assurance.

import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  startServer, stopServer, launchBrowser, seedApp, extractPdfLines, SAMPLE_CV,
} from "./lib/harness.mjs";
import { parseResume } from "../lib/atsParser.js";
import { compareToTruth } from "../lib/atsFidelity.js";
import { deuxLectures } from "../lib/deuxLectures.js";

const LAYOUTS = ["sidebar", "classic", "timeline", "swiss", "compact", "ats"];

// L'ecart tolere entre la simulation et la mesure. Il n'est pas un confort :
// au-dela, la note affichee raconte une autre histoire que le PDF reel.
const ECART_MAX = 12;

async function exporte(browser, layout) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 950 }, acceptDownloads: true,
  });
  const page = await ctx.newPage();
  await seedApp(page, SAMPLE_CV, { layout });
  const attente = page.waitForEvent("download", { timeout: 180_000 }).catch(() => null);
  try {
    await page.getByRole("button", { name: /Telecharger/i }).first().click({ timeout: 15_000 });
    await page.waitForTimeout(1500);
    const c = page.getByRole("button", { name: /A4|Standard|Telecharger/i });
    if (await c.count() > 1) await c.nth(1).click({ timeout: 10_000 }).catch(() => {});
  } catch (e) { /* l'absence de fichier le dira mieux */ }
  const d = await attente;
  if (!d) { await ctx.close(); return null; }
  const chemin = join(mkdtempSync(join(tmpdir(), "cvf-cal-")), "cv.pdf");
  await d.saveAs(chemin);
  await ctx.close();
  // Les LIGNES, pas le texte a plat. Sans elles aucun analyseur ne reconnait
  // ses sections, et on mesurerait son propre instrument au lieu du PDF : la
  // premiere calibration s'est trompee exactement la, et annoncait 51% de
  // fidelite sur un document lu a 100%.
  const { text } = await extractPdfLines(readFileSync(chemin));
  return text;
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();
  const resume = [];

  try {
    for (const layout of LAYOUTS) {
      const texte = await exporte(browser, layout);
      if (!texte) { failures.push(`modele ${layout} : aucun PDF exporte`); continue; }

      const mesure = Math.round(compareToTruth(SAMPLE_CV, parseResume(texte), texte).score);
      const sim = deuxLectures(SAMPLE_CV, { texte, layout, langue: "fr" }).machine;
      const ecart = sim.note - mesure;
      resume.push(`${layout} ${sim.note}/${mesure}`);

      if (Math.abs(ecart) > ECART_MAX) {
        failures.push(
          `modele ${layout} : la simulation annonce ${sim.note} et la mesure `
          + `donne ${mesure}, soit ${ecart > 0 ? "+" : ""}${ecart} points pour `
          + `${ECART_MAX} tolere. ` + (ecart < 0
            ? "La simulation est pessimiste : elle ferait fuir les gens d'un "
              + "document qui passe. "
            : "La simulation est optimiste : elle rassurerait quelqu'un dont le "
              + "CV se fait perdre. ")
          + "Controles en echec : "
          + (sim.premierObstacle
            ? sim.premierObstacle.bloquants.map((b) => b.quoi + " (" + b.fait + ")").join("; ")
            : "aucun")
        );
      }

      // Un document que les vrais moteurs lisent entierement ne doit etre
      // recale par aucun profil. C'est la forme la plus dure de la meme
      // exigence, et c'est elle qui a attrape le defaut "SQL".
      if (mesure >= 100 && sim.passent < sim.total) {
        failures.push(
          `modele ${layout} : les moteurs reels retrouvent 100% des champs, `
          + `mais la simulation ne fait passer que ${sim.passent}/${sim.total} `
          + "analyseurs. Un controle refuse un document correct."
        );
      }
    }

    if (!failures.length) {
      console.log("      simule/mesure par modele : " + resume.join(", ")
        + " (ecart tolere " + ECART_MAX + ")");
    }
  } catch (err) {
    failures.push(`le test a plante : ${err && err.message}`);
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
