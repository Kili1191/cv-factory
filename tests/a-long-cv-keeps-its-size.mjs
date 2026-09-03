// Un CV tient sur une page, et un CV qui ne peut pas y tenir ne part pas
// coupe en silence.
//
// LA REGLE, ET D'OU ELLE VIENT
//
// "Un CV doit toujours etre dans une page, et pas telecharge coupe." C'est
// le proprietaire du produit qui le dit, apres avoir vu son CV partir sur
// deux feuilles. Ce fichier a suivi tout le chemin de cette regle :
//
//   1. une feuille unique, tres haute, qui n'etait pas un A4 : "pas cadre" ;
//   2. l'image entiere dans un A4, donc un CV d'une page et demie a 66%,
//      illisible ;
//   3. deux feuilles a taille reelle, ce qu'un recruteur lit comme un
//      document coupe, et ce que Kilian a decrit exactement ainsi.
//
// La regle finale a trois cas, par hauteur du contenu :
//
//   - il tient : une feuille, echelle 1 ;
//   - il deborde de moins de 18% : une feuille, image reduite jusqu'a 85%,
//     ce que "ajuster a la page" fait dans n'importe quelle boite
//     d'impression ;
//   - il deborde davantage : il faut couper du texte. Le controle avant
//     telechargement le dit et propose de raccourcir ; "telecharger quand
//     meme" pagine, parce que deux feuilles lisibles valent mieux qu'une
//     feuille a 60%, mais on ne l'a pas fait sans le dire.
//
// CE QUE CE TEST MESURE, ET COMMENT IL SAIT DANS QUEL CAS IL EST
//
// La hauteur du document est mesuree dans le navigateur par la MEME fonction
// que le controle avant telechargement. Le test ne devine donc pas le cas :
// il le lit, puis exige ce que la regle impose pour ce cas-la. Deux CV sont
// exerces, un long et un plus court, pour toucher au moins deux cas ; leur
// hauteur exacte depend des polices de la machine, et le test l'assume.

import { mkdtempSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";
import { HAUTEUR_UNE_PAGE_MM, HAUTEUR_MAX_UNE_PAGE_MM, FACTEUR_MIN }
  from "../lib/leCvEstIlPresentable.js";

const A4_PT = { l: 595.28, h: 841.89 };
const MARGE_PT = 6;

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

// Des puces distinctes par poste : un CV ou la meme ligne revient douze
// fois est exactement ce qu'un CV casse ressemble, et le controle avant
// telechargement l'attrape a raison. Le test de pagination doit porter sur
// un CV qui a le droit de partir.
function cvDe(nombreDePostes) {
  return {
    ...SAMPLE_CV,
    name: "Samuel Carter",
    title: "Care Assistant",
    summary: "Years across care, hospitality and logistics. Trusted with "
      + "medication rounds, night shifts and training new starters.",
    experience: POSTES.slice(0, nombreDePostes).map(([title, company, period], i) => ({
      ...(SAMPLE_CV.experience[0] || {}),
      id: "exp" + i, title, company, period, location: "Manchester",
      bullets: [
        "Supported " + (10 + i) + " residents with personal care, medication and daily records.",
        "Trained " + (2 + i) + " new starters, each independent within their first fortnight.",
        "Kept handover notes at " + company + " that the night team never had to chase.",
        "Covered " + (20 + i * 3) + " night shifts a year on top of the standard rota.",
      ],
    })),
  };
}

async function exporter(browser, cv) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on("pageerror", (e) => erreurs.push(e.message.split("\n")[0].slice(0, 90)));
  await seedApp(page, cv);

  // La hauteur telle que le controle la mesure : la meme fonction, dans la
  // page, sur le document reel.
  const hauteurMm = await page.evaluate(async () => {
    const m = await import("/lib/leCvEstIlPresentable.js").catch(() => null);
    if (m && m.hauteurDuDocumentMm) return m.hauteurDuDocumentMm(document);
    const el = document.getElementById("cv-print");
    const st = document.createElement("style");
    st.textContent = ".cvf-no-print{display:none !important}[data-cvf-zoom]{zoom:1 !important}";
    document.head.appendChild(st);
    const px = el ? el.scrollHeight : 0;
    st.remove();
    return px * 25.4 / 96;
  });

  let raison = null;
  const attente = page.waitForEvent("download", { timeout: 90_000 })
    .catch((e) => { raison = e.message.split("\n")[0]; return null; });

  let panneau = false;
  try {
    await page.getByRole("button", { name: /Telecharger/i }).first().click({ timeout: 15_000 });
    await page.waitForTimeout(1200);
    // Le controle avant telechargement, s'il a quelque chose a dire.
    const quandMeme = page.locator('[data-nuvi="defauts-quand-meme"]');
    if (await quandMeme.count()) {
      panneau = true;
      await quandMeme.first().click({ timeout: 8_000 });
      await page.waitForTimeout(800);
    }
    const confirmer = page.getByRole("button", { name: /A4|Standard|Telecharger/i });
    if (await confirmer.count() > 1) {
      await confirmer.nth(1).click({ timeout: 10_000 }).catch(() => {});
    }
  } catch (e) {
    raison = "le clic sur Telecharger a echoue : " + e.message.split("\n")[0];
  }

  const download = await attente;
  let pages = 0, tailles = [], parPage = [];
  if (download) {
    const dossier = mkdtempSync(join(tmpdir(), "cvf-long-"));
    const chemin = join(dossier, "cv.pdf");
    await download.saveAs(chemin);
    const mod = await import("pdfjs-dist/legacy/build/pdf.js");
    const pdfjs = mod.getDocument ? mod : (mod.default || {});
    const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(chemin)) }).promise;
    pages = doc.numPages;
    for (let i = 1; i <= pages; i += 1) {
      const p = await doc.getPage(i);
      const v = p.getViewport({ scale: 1 });
      tailles.push([Math.round(v.width), Math.round(v.height)]);
      parPage.push((await p.getTextContent()).items.map((it) => it.str).join(" ").trim());
    }
  }
  await ctx.close();
  return { hauteurMm, panneau, download: !!download, raison, pages, tailles, parPage, erreurs };
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const casVus = new Set();
    for (const [nom, cv] of [["douze postes", cvDe(12)], ["quatre postes", cvDe(4)]]) {
      const r = await exporter(browser, cv);
      for (const e of r.erreurs) failures.push(nom + " : erreur JavaScript, " + e);
      if (!r.download) {
        failures.push(nom + " : aucun PDF telecharge" + (r.raison ? " (" + r.raison + ")" : ""));
        continue;
      }
      for (const [i, [l, h]] of r.tailles.entries()) {
        if (Math.abs(l - A4_PT.l) > MARGE_PT || Math.abs(h - A4_PT.h) > MARGE_PT) {
          failures.push(nom + " : la page " + (i + 1) + " mesure " + l + "x" + h
            + " points au lieu de 595x842. Ce n'est pas un A4.");
        }
      }
      const cas = r.hauteurMm <= HAUTEUR_UNE_PAGE_MM ? "tient"
        : r.hauteurMm <= HAUTEUR_MAX_UNE_PAGE_MM ? "reduit" : "deborde";
      casVus.add(cas);
      const h = Math.round(r.hauteurMm);

      if (cas !== "deborde") {
        // UNE FEUILLE, ET RIEN NE S'EST INTERPOSE
        if (r.pages !== 1) {
          failures.push(nom + " (" + h + "mm, cas \"" + cas + "\") : " + r.pages
            + " feuilles. Un CV qui tient, ou qui tient reduit a plus de "
            + Math.round(FACTEUR_MIN * 100) + "%, sort sur UNE page.");
        }
        if (r.panneau) {
          failures.push(nom + " (" + h + "mm) : le controle avant telechargement "
            + "s'est interpose sur un CV qui tient. Une garde qui crie sur un "
            + "CV correct est desactivee dans la semaine.");
        }
        if (!/Samuel\s*Carter/i.test(r.parPage[0] || "")) {
          failures.push(nom + " : le nom n'ouvre pas le texte extrait.");
        }
      } else {
        // IL DEBORDE : ON L'A DIT, ET "QUAND MEME" PAGINE SANS RIEN PERDRE
        if (!r.panneau) {
          failures.push(nom + " (" + h + "mm, " + (r.hauteurMm / HAUTEUR_UNE_PAGE_MM).toFixed(1)
            + " pages) : le CV deborde et le controle avant telechargement "
            + "n'a rien dit. Il est parti coupe en silence.");
        }
        if (r.pages < 2) {
          failures.push(nom + " (" + h + "mm) : telecharge quand meme, il sort sur "
            + r.pages + " feuille : il a ete reduit sous " + Math.round(FACTEUR_MIN * 100)
            + "%, donc rendu illisible.");
        }
        const vides = r.parPage.map((t, i) => (t.length < 40 ? i + 1 : 0)).filter(Boolean);
        if (r.pages > 1 && vides.length) {
          failures.push(nom + " : la ou les page(s) " + vides.join(", ")
            + " ne portent presque aucun texte : la couche lue par les "
            + "robots de tri ne suit pas les feuilles.");
        }
      }
    }

    if (casVus.size < 2) {
      failures.push("les deux CV tombent dans le meme cas (" + [...casVus].join()
        + ") : le test n'exerce qu'une branche de la regle. Ajuster le "
        + "nombre de postes.");
    }

    if (!failures.length) {
      console.log("      cas exerces : " + [...casVus].join(" et ")
        + " ; une page quand c'est possible, annonce sinon");
    }
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
