// Un CV plus long qu'une feuille prend une seconde feuille, a sa taille.
//
// LE DEFAUT, EN DEUX TEMPS
//
// Kilian a signale deux choses sur la version en production, a partir de son
// propre CV : "ca depasse la 1ere page", puis "une fois telecharge pas du
// tout cadre". C'est le meme defaut vu des deux cotes.
//
// L'export creait la page au format EXACT de l'image capturee :
//
//   format: [imgWidthMm, imgHeightMm]
//
// Tant que le CV tenait, une regle CSS le forcait a 297mm et le rapport
// tombait par hasard sur celui d'un A4, ce qui masquait tout. Des que le
// contenu depassait, cette regle ne s'appliquait plus et le fichier sortait
// a la taille de ce que l'ecran avait mesure : une feuille unique, tres
// haute, qui n'est pas un A4. Elle ne s'imprime sur rien.
//
// ET LA PREMIERE CORRECTION N'ETAIT PAS LA BONNE
//
// Faire tenir l'image entiere dans une page A4 rend bien un document cadre.
// Mais un CV d'une page et demie sort alors a 66% : un corps 10 devient un
// corps 6,6. Cadre et illisible. C'est le piege de ce defaut : la correction
// evidente passe le controle "c'est bien un A4" et rate ce qui compte.
//
// CE QUE CE TEST MESURE, ET POURQUOI CELA
//
//   1. Chaque feuille est un A4. C'est la plainte "pas du tout cadre".
//   2. Il y a plus d'une feuille. C'est la preuve que le CV n'a pas ete
//      reduit pour rentrer : la reduction ne produit qu'une feuille.
//   3. Du texte se trouve sur la seconde. Une seconde feuille blanche avec
//      tout le texte reste page 1 signifierait que la couche que lisent les
//      robots de tri ne suit pas ce qui s'affiche.
//
// Le point 3 est celui qu'on rate le plus facilement : l'image et le texte
// invisible sont poses par deux chemins differents, et rien a l'oeil ne
// distingue un PDF dont la couche de texte est bonne d'un autre.

import { mkdtempSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

// A4 en points PostScript, l'unite dans laquelle pdf.js rend ses pages.
// 210mm x 297mm a 72 points par pouce.
const A4_PT = { l: 595.28, h: 841.89 };
const MARGE_PT = 6;   // les arrondis d'un generateur de PDF, pas plus

// UN CV QUI DEPASSE POUR DE BON
//
// Pas d'un cheveu : la tolerance d'une page vaut 4%, et un CV a 1,03 page
// doit justement rester sur une feuille. Le test vise donc franchement
// au-dela.
//
// COMBIEN, EXACTEMENT ? MESURE, PAS DEVINE
//
// Six postes de quatre puces paraissaient largement suffire. Mesure dans le
// navigateur : 890px de contenu, soit 235mm, sous les 297 d'une feuille. Le
// document est mis a l'echelle pour l'affichage (facteur 1,35), donc ce qui
// remplit l'ecran ne remplit pas la page, et l'oeil se trompe dans le bon
// sens. Douze postes donnent environ 470mm, deux feuilles franches.
const POSTES = [
  ["Care Assistant", "Elmwood House", "2024 - 2026"],
  ["Care Assistant", "Rowan Lodge", "2023 - 2024"],
  ["Support Worker", "Bright Path Care", "2022 - 2023"],
  ["Support Worker", "Hollybank", "2021 - 2022"],
  ["Waiter", "Le Comptoir", "2020 - 2021"],
  ["Waiter", "Brasserie Nord", "2019 - 2020"],
  ["Kitchen Porter", "The Old Mill", "2018 - 2019"],
  ["Kitchen Porter", "Canal House", "2017 - 2018"],
  ["Baker's Assistant", "Boulangerie Rivet", "2016 - 2017"],
  ["Baker's Assistant", "Pain Quotidien", "2015 - 2016"],
  ["Warehouse Operative", "Fenwick Logistics", "2014 - 2015"],
  ["Warehouse Operative", "Northgate Depot", "2013 - 2014"],
];

const CV_LONG = {
  ...SAMPLE_CV,
  name: "Samuel Carter",
  title: "Care Assistant",
  summary: "Six years across care, hospitality and logistics. Trusted with "
    + "medication rounds, night shifts and training new starters. Known for "
    + "turning up, staying calm, and leaving a handover nobody has to chase.",
  experience: POSTES.map(([title, company, period], i) => ({
    ...(SAMPLE_CV.experience[0] || {}),
    id: "exp" + i,
    title, company, period,
    location: "Manchester",
    bullets: [
      "Supported 14 residents with personal care, medication and daily records.",
      "Trained 5 new starters, each independent within their first fortnight.",
      "Kept handover notes the night team never had to phone about.",
      "Covered 30 night shifts a year on top of the standard rota.",
    ],
  })),
};

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await ctx.newPage();
    const erreurs = [];
    page.on("pageerror", (e) => erreurs.push(e.message.split("\n")[0].slice(0, 90)));
    await seedApp(page, CV_LONG);

    let raison = null;
    const attente = page.waitForEvent("download", { timeout: 90_000 })
      .catch((e) => { raison = e.message.split("\n")[0]; return null; });

    try {
      await page.getByRole("button", { name: /Telecharger/i }).first().click({ timeout: 15_000 });
      await page.waitForTimeout(1500);
      const confirmer = page.getByRole("button", { name: /A4|Standard|Telecharger/i });
      if (await confirmer.count() > 1) {
        await confirmer.nth(1).click({ timeout: 10_000 }).catch(() => {});
      }
    } catch (e) {
      raison = "le clic sur Telecharger a echoue : " + e.message.split("\n")[0];
    }

    const download = await attente;
    if (!download) {
      failures.push("aucun PDF telecharge" + (raison ? " (" + raison + ")" : ""));
    } else {
      const dossier = mkdtempSync(join(tmpdir(), "cvf-long-"));
      const chemin = join(dossier, "cv.pdf");
      await download.saveAs(chemin);
      const octets = readFileSync(chemin);

      const mod = await import("pdfjs-dist/legacy/build/pdf.js");
      const pdfjs = mod.getDocument ? mod : (mod.default || {});
      const doc = await pdfjs.getDocument({ data: new Uint8Array(octets) }).promise;

      // 1. CHAQUE FEUILLE EST UN A4
      const tailles = [];
      const parPage = [];
      for (let i = 1; i <= doc.numPages; i += 1) {
        const p = await doc.getPage(i);
        const v = p.getViewport({ scale: 1 });
        tailles.push(Math.round(v.width) + "x" + Math.round(v.height));
        if (Math.abs(v.width - A4_PT.l) > MARGE_PT || Math.abs(v.height - A4_PT.h) > MARGE_PT) {
          failures.push("la page " + i + " mesure " + Math.round(v.width) + "x"
            + Math.round(v.height) + " points au lieu de 595x842, c'est a dire "
            + "qu'elle n'est pas un A4. Elle ne s'imprimera sur aucune feuille "
            + "et s'ouvrira mal cadree.");
        }
        const contenu = await p.getTextContent();
        parPage.push(contenu.items.map((it) => it.str).join(" ").trim());
      }

      // 2. LE CV N'A PAS ETE REDUIT POUR RENTRER
      if (doc.numPages < 2) {
        failures.push("douze postes de quatre puces tiennent sur une seule "
          + "feuille : le CV a donc ete reduit pour y entrer. Cadre, mais "
          + "illisible. Un CV plus long qu'une page prend une seconde page a "
          + "sa taille reelle, comme n'importe quel CV.");
      }

      // 3. LA COUCHE DE TEXTE SUIT LES FEUILLES
      const vides = parPage
        .map((t, i) => (t.length < 40 ? i + 1 : 0))
        .filter(Boolean);
      if (doc.numPages > 1 && vides.length) {
        failures.push("la ou les page(s) " + vides.join(", ") + " ne portent "
          + "presque aucun texte. L'image se repartit sur les feuilles mais "
          + "la couche que lisent les robots de tri reste sur la premiere : "
          + "tout ce qui s'affiche page 2 est invisible pour eux.");
      }

      // Le nom du candidat ouvre le document, sur la premiere feuille : c'est
      // la ligne qu'un analyseur prend pour l'identite.
      if (!/Samuel\s*Carter/i.test(parPage[0] || "")) {
        failures.push("le nom du candidat n'est pas sur la premiere feuille "
          + "du texte extrait. Un analyseur retiendra autre chose comme "
          + "identite. Debut lu : \"" + (parPage[0] || "").slice(0, 60) + "\"");
      }

      if (!failures.length) {
        const total = parPage.reduce((a, t) => a + t.length, 0);
        console.log("      " + doc.numPages + " feuilles A4 (" + tailles.join(" ")
          + "), " + total + " caracteres repartis dessus");
      }
    }

    for (const e of erreurs) failures.push("erreur JavaScript a l'ecran : " + e);
    await ctx.close();
  } catch (err) {
    failures.push("le test lui-meme a plante : " + (err && err.message));
  } finally {
    await browser.close();
    await stopServer(server);
  }

  return failures;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((f) => {
    for (const l of f) console.log("ECHEC " + l);
    process.exit(f.length ? 1 : 0);
  });
}
