// Un champ vide ne laisse rien dans le PDF telecharge.
//
// LE DEFAUT QU'IL EMPECHE
//
// Un champ vide affiche "..." dans l'editeur. C'est une affordance : elle dit
// qu'il y a la une zone cliquable a remplir. Elle n'a aucun sens hors de
// l'editeur, et elle partait pourtant telle quelle dans le PDF telecharge.
// Un recruteur y lit une information manquante, ou de la negligence, sur le
// seul document qui le decide.
//
// Le meme oubli produisait un separateur orphelin. La condition posait un
// point apres tout champ rempli qui n'est pas le dernier de la liste, sans
// regarder si quelque chose suivait vraiment : un LinkedIn vide laissait
// "London SW11 -" suivi de rien.
//
// POURQUOI LES TESTS D'EXPORT NE L'ONT PAS VU
//
// Le CV de reference remplit TOUS les champs de contact. Aucun placeholder
// ne pouvait donc apparaitre, et six mises en page passaient au vert sur un
// document qui n'exercait pas le cas. Le CV d'ici laisse volontairement des
// champs vides, parce que c'est le cas ordinaire : beaucoup de gens n'ont
// pas de LinkedIn, et c'est precisement le public de Nuvi.

import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  startServer, stopServer, launchBrowser, seedApp, extractPdfText, SAMPLE_CV,
} from "./lib/harness.mjs";

// Les champs facultatifs sont vides, comme chez quelqu'un qui n'a ni
// LinkedIn ni certification a declarer.
const CV_INCOMPLET = {
  ...SAMPLE_CV,
  linkedin: "",
  certifications: [],
};

// Les mises en page qui composent une ligne de contact, donc celles ou un
// champ vide peut laisser un point orphelin ou un pointille.
const LAYOUTS = ["ats", "sidebar", "classic"];

async function exporte(browser, layout) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 950 }, acceptDownloads: true,
  });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on("pageerror", e => erreurs.push(e.message.split("\n")[0]));
  await seedApp(page, CV_INCOMPLET, { layout });

  let echecTelechargement = null;
  const attente = page
    .waitForEvent("download", { timeout: 180_000 })
    .catch((e) => { echecTelechargement = e; return null; });

  try {
    await page.getByRole("button", { name: /Telecharger/i }).first().click({ timeout: 15_000 });
    await page.waitForTimeout(1500);
    const confirmer = page.getByRole("button", { name: /A4|Standard|Telecharger/i });
    if (await confirmer.count() > 1) {
      await confirmer.nth(1).click({ timeout: 10_000 }).catch(() => {});
    }
  } catch (e) { /* l'absence de telechargement le dira mieux */ }

  const download = await attente;
  if (!download) {
    await ctx.close();
    return { failed: "aucun PDF telecharge - "
      + (echecTelechargement ? echecTelechargement.message.split("\n")[0] : "cause inconnue") };
  }
  const dir = mkdtempSync(join(tmpdir(), "cvf-vide-"));
  const chemin = join(dir, "cv.pdf");
  await download.saveAs(chemin);
  await ctx.close();
  const { text } = await extractPdfText(readFileSync(chemin));
  return { text, erreurs };
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    for (const layout of LAYOUTS) {
      const out = await exporte(browser, layout);
      if (out.failed) { failures.push(`modele ${layout} : ${out.failed}`); continue; }

      // Le pointille lui-meme. On cherche trois points colles, la forme
      // exacte du placeholder, et non une ellipse typographique.
      if (/\.\.\./.test(out.text)) {
        const autour = out.text.slice(
          Math.max(0, out.text.indexOf("...") - 40), out.text.indexOf("...") + 12
        ).replace(/\s+/g, " ");
        failures.push(
          `modele ${layout} : le PDF telecharge contient le pointille d'un `
          + `champ vide - "...${autour}...". C'est une marque de l'editeur, `
          + "elle n'a rien a faire sur le document que lit un recruteur."
        );
      }

      // Le separateur orphelin : un point qui ne separe plus rien parce que
      // ce qui le suivait etait vide.
      if (/[••]\s*$/m.test(out.text) || /[••]\s*[••]/.test(out.text)) {
        failures.push(
          `modele ${layout} : le PDF contient un separateur qui ne separe `
          + "rien. Un champ vide a laisse son point derriere lui."
        );
      }

      // Le CV doit rester complet par ailleurs : une correction qui masque
      // le pointille en masquant aussi le contenu serait pire que le defaut.
      for (const [quoi, attendu] of [["le nom", CV_INCOMPLET.name],
                                     ["l'e-mail", CV_INCOMPLET.email]]) {
        if (!out.text.includes(attendu)) {
          failures.push(
            `modele ${layout} : ${quoi} a disparu du PDF ("${attendu}"). `
            + "Le masquage du pointille a emporte du contenu reel."
          );
        }
      }

      if (out.erreurs.length) {
        failures.push(`modele ${layout} : erreur JS - ${out.erreurs.slice(0, 2).join(" | ")}`);
      }
    }

    if (!failures.length) {
      console.log(
        "      un CV sans LinkedIn s'exporte sans pointille et sans separateur "
        + "orphelin, et garde son nom et son e-mail"
      );
    }
  } catch (err) {
    failures.push(`le test a plante : ${err && err.message}`);
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
