// LE COACH LIT UN FICHIER, ET NE L'ENVOIE PAS QUAND IL N'A PAS A LE FAIRE
//
// On peut deposer un CV, une annonce ou une capture d'ecran dans le coach.
// Deux chemins, et la difference n'est pas un detail technique :
//
//   PDF / DOCX / TXT  le texte est extrait DANS LE NAVIGATEUR et rejoint le
//                     message comme si la personne l'avait colle. Le fichier
//                     ne quitte pas l'appareil, et un CV de trois pages coute
//                     le prix de son texte, pas celui d'une image.
//   IMAGE             il n'y a pas de texte a extraire ; l'image part au
//                     modele. C'est le seul cas, et l'interface l'annonce
//                     AVANT l'envoi.
//
// Ce test verifie les deux, et surtout la promesse affichee : si un jour un
// PDF repart en image, la puce continuerait de dire "rien n'a ete envoye"
// alors que ce serait faux. C'est le genre de mensonge qu'un test doit
// attraper, pas un utilisateur.

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServer, stopServer, launchBrowser, seedApp } from "./lib/harness.mjs";

function construirePdf(lignes) {
  const objs = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];
  let stream = "BT /F1 14 Tf 60 780 Td";
  lignes.forEach((l, i) => { stream += (i ? " 0 -22 Td" : "") + ` (${l}) Tj`; });
  stream += " ET";
  objs.push(`5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`);
  let out = "%PDF-1.4\n";
  const offsets = [];
  for (const o of objs) { offsets.push(out.length); out += o; }
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return out;
}

// Un PNG minuscule mais valide : 1 pixel, suffisant pour eprouver le chemin.
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64");

async function joindre(page, chemin) {
  await page.setInputFiles('input[type="file"]', chemin);
  await page.waitForTimeout(2500);
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();
  const dir = mkdtempSync(join(tmpdir(), "cvf-coach-"));

  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const erreurs = [];
    page.on("pageerror", (e) => erreurs.push(String(e && e.message || e).split("\n")[0]));

    // On intercepte l'appel au modele pour LIRE ce qui part, sans depenser.
    let envoye = null;
    await page.route("**/api/claude**", async (route) => {
      try { envoye = JSON.parse(route.request().postData() || "{}"); } catch { envoye = {}; }
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ content: [{ type: "text",
          text: '{"reply":"Bien recu.","operations":[]}' }] }),
      });
    });

    await seedApp(page, undefined, { locale: "fr" });
    await page.evaluate(() => window.__nuviOpenModal && window.__nuviOpenModal("open-coach"));
    await page.waitForTimeout(1200);

    const champ = page.locator('input[type="file"]');
    if (!(await champ.count())) {
      failures.push(
        "le coach n'a aucun moyen de recevoir un fichier. On ne peut donc lui "
        + "montrer ni un CV ni une annonce : il faut tout retaper."
      );
      await ctx.close();
      throw new Error("__abandon");
    }

    // --- 1. LE PDF EST LU SUR PLACE -----------------------------------
    const pdf = join(dir, "annonce.pdf");
    writeFileSync(pdf, construirePdf([
      "Bar Manager - Le Comptoir",
      "Gestion de stock et encadrement equipe",
      "MOTCLEUNIQUE7788",
    ]));
    await joindre(page, pdf);

    const puce = await page.evaluate(() => document.body.innerText);
    if (!/rien n'a ete envoye|nothing was sent/i.test(puce)) {
      failures.push(
        "le fichier joint n'annonce pas qu'il a ete lu sur place. Quelqu'un a "
        + "qui on demande son CV a le droit de savoir ou il va, et la reponse "
        + "doit etre visible avant l'envoi, pas apres."
      );
    }

    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")]
        .find((x) => /envoyer|send/i.test(x.getAttribute("aria-label") || ""));
      if (b) b.click();
    });
    await page.waitForTimeout(2500);

    const corps = JSON.stringify(envoye || {});
    if (!corps.includes("MOTCLEUNIQUE7788")) {
      failures.push(
        "le texte du PDF n'est pas arrive dans le message. Le fichier est "
        + "accepte et son contenu est perdu : le coach repond a cote."
      );
    }
    if (envoye && Array.isArray(envoye.messages)) {
      failures.push(
        "le PDF est parti par le canal des images. Le fichier quitte donc "
        + "l'appareil alors que la puce annonce que rien n'a ete envoye : "
        + "l'interface ment sur ce qu'elle fait."
      );
    }

    // --- 2. L'IMAGE, ELLE, PART - ET LE DIT ---------------------------
    envoye = null;
    const png = join(dir, "capture.png");
    writeFileSync(png, PNG_1PX);
    await joindre(page, png);

    const puce2 = await page.evaluate(() => document.body.innerText);
    if (!/sera envoyee|will be sent/i.test(puce2)) {
      failures.push(
        "l'image ne previent pas qu'elle va etre envoyee. C'est le seul cas ou "
        + "un fichier quitte l'appareil : le taire est le pire moment pour "
        + "etre discret."
      );
    }

    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")]
        .find((x) => /envoyer|send/i.test(x.getAttribute("aria-label") || ""));
      if (b) b.click();
    });
    await page.waitForTimeout(2500);

    const img = envoye && Array.isArray(envoye.messages)
      && JSON.stringify(envoye.messages).includes('"type":"image"');
    if (!img) {
      failures.push(
        "l'image n'est pas partie au format que le modele sait lire. Elle est "
        + "acceptee a l'ecran et ne produit rien."
      );
    }

    if (erreurs.length) {
      failures.push("erreur JS pendant le depot : "
        + [...new Set(erreurs)].slice(0, 2).join(" | "));
    }

    if (!failures.length) {
      console.log(
        "      PDF lu dans le navigateur et joint au texte (rien n'est envoye), "
        + "image transmise au modele, et chaque cas annonce ce qu'il fait"
      );
    }
    await ctx.close();
  } catch (err) {
    if (!err || err.message !== "__abandon") {
      failures.push("le test a plante : " + (err && err.message ? err.message : String(err)));
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
