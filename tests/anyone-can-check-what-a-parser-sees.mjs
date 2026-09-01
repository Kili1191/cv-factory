// Anybody can see what a screening tool reads, on their own file, unaided.
//
// WHY THIS PAGE EXISTS
//
// The diagnostic panel used to state that downloading a CV had it re-read by
// three real parsers. It did not: lib/atsFidelity.js, which performs that
// comparison, was imported by tests only. The owner of the product relied on
// that sentence, discovered nothing had verified, and stopped believing the
// rest of what the product said. A promise of verification stops doubt
// instead of informing it.
//
// The answer was not a better sentence. It is running the check in front of
// the person, on the file they hold, as often as they want. /verifier reads
// any PDF with pdf.js, on the device, and shows the extraction plus what six
// real parser profiles do with it.
//
// THE FAILURE THIS TEST WAS WRITTEN AFTER
//
// The first working version reported 0 of 6 on a CV the product had just
// exported and that poppler, MuPDF and pdf.js all read in full. The page was
// not wrong about its own input: lib/lireUnFichier.js joined every pdf.js
// text fragment with a space, so the extracted text had NO line breaks at
// all. Every reader downstream is line based, so none of them found a
// heading, a job, an employer or a period.
//
// That defect was not limited to this page: it is the same function the CV
// import uses. It has been fixed by rebuilding lines from fragment
// positions, the way poppler does.
//
// A verification tool that cries wolf is worse than none: it would tell
// somebody with a perfectly good CV that all six systems reject them. So
// this test holds both directions. A sound CV must pass, and a PDF carrying
// no text must be named for what it is.

import { startServer, stopServer, launchBrowser } from "./lib/harness.mjs";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import zlib from "node:zlib";

// Un PDF d'une page qui porte une image et aucun texte. C'est le cas que
// l'outil existe pour attraper : il s'affiche parfaitement et arrive vide.
function pdfSansTexte() {
  const comp = zlib.deflateSync(Buffer.alloc(30 * 30 * 3, 0xff));
  const flux = Buffer.from("q 500 0 0 700 50 70 cm /Im0 Do Q");
  const objs = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    Buffer.from("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
      + "/Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>"),
    Buffer.concat([Buffer.from("<< /Length " + flux.length + " >>\nstream\n"), flux,
      Buffer.from("\nendstream")]),
    Buffer.concat([Buffer.from("<< /Type /XObject /Subtype /Image /Width 30 /Height 30 "
      + "/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length "
      + comp.length + " >>\nstream\n"), comp, Buffer.from("\nendstream")]),
  ];
  let out = Buffer.from("%PDF-1.4\n");
  const offs = [];
  objs.forEach((o, i) => {
    offs.push(out.length);
    out = Buffer.concat([out, Buffer.from((i + 1) + " 0 obj\n"), o, Buffer.from("\nendobj\n")]);
  });
  const x = out.length;
  let xref = "xref\n0 " + (objs.length + 1) + "\n0000000000 65535 f \n";
  for (const o of offs) xref += String(o).padStart(10, "0") + " 00000 n \n";
  return Buffer.concat([out, Buffer.from(xref
    + "trailer\n<< /Size " + (objs.length + 1) + " /Root 1 0 R >>\nstartxref\n" + x + "\n%%EOF")]);
}

export async function run() {
  const failures = [];
  let srv = null;
  let browser = null;
  const dir = mkdtempSync(join(tmpdir(), "cvf-verif-"));

  try {
    srv = await startServer();
    browser = await launchBrowser();
    const base = "http://127.0.0.1:" + (process.env.TEST_PORT || "4311");

    // --- 1. Un CV sain passe -------------------------------------------
    //
    // On exporte un vrai PDF depuis le produit plutot que d'en fabriquer un :
    // le fichier teste est celui que la personne enverrait.
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
    const page = await ctx.newPage();
    const jsErrs = [];
    page.on("pageerror", (e) => jsErrs.push(e.message.split("\n")[0]));

    const { seedApp } = await import("./lib/harness.mjs");
    const CV = {
      name: "Jane Doe", title: "Chef de Produit Senior",
      email: "jane.doe@email.com", phone: "+33 6 12 34 56 78",
      location: "Paris, France",
      summary: "Chef de produit senior, 8 ans en SaaS B2B.",
      experience: [{ id: 1, title: "Senior Product Manager", company: "Acme SaaS",
        period: "2021 - 2024", location: "Paris",
        bullets: ["Croissance du revenu recurrent de 1,2M a 4M EUR"] }],
      education: [{ id: 1, degree: "Diplome ESSEC", school: "ESSEC", period: "2014" }],
      skills: ["Roadmap", "Analytics", "SQL"],
      languages: [], certifications: [],
    };
    await seedApp(page, CV, { layout: "ats" });
    const dlP = page.waitForEvent("download", { timeout: 180000 }).catch(() => null);
    await page.getByRole("button", { name: /Telecharger/i }).first().click({ timeout: 15000 });
    await page.waitForTimeout(1500);
    const confirm = page.getByRole("button", { name: /A4|Standard|Telecharger/i });
    if (await confirm.count() > 1) { await confirm.nth(1).click({ timeout: 10000 }).catch(() => {}); }
    const dl = await dlP;
    if (!dl) {
      await ctx.close();
      failures.push("aucun PDF exporte : le test ne peut pas verifier la page sur un vrai fichier.");
      return failures;
    }
    // On enregistre AVANT de fermer le contexte : saveAs a besoin de la page
    // qui a produit le telechargement.
    const bon = join(dir, "bon.pdf");
    await dl.saveAs(bon);
    await ctx.close();

    // LA LANGUE SE POSE, ELLE NE SE SUBIT PAS
    //
    // Le harnais le dit deja pour seedApp : un test qui affirme du texte doit
    // dire dans quelle langue il l'attend, sinon il depend d'un reglage que
    // le produit a le droit de changer. C'est exactement ce qui est arrive
    // ici : ce test cherchait une phrase francaise, la page est passee a
    // l'anglais par defaut comme le reste du produit, et le test a accuse une
    // page qui allait bien.
    //
    // /verifier lit la meme cle que l'application, donc on la pose avant de
    // naviguer.
    const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const p2 = await ctx2.newPage();
    p2.on("pageerror", (e) => jsErrs.push(e.message.split("\n")[0]));
    await p2.goto(base + "/verifier", { waitUntil: "domcontentloaded" });
    await p2.evaluate(() => localStorage.setItem("cvf_c", JSON.stringify("en")));
    await p2.reload({ waitUntil: "domcontentloaded" });
    await p2.waitForTimeout(700);
    await p2.setInputFiles("input[type=file]", bon);
    await p2.waitForTimeout(4000);

    const vu = await p2.evaluate(() => {
      const t = document.body.innerText;
      const nu = t.replace(/\s+/g, " ");
      return {
        texte: nu,
        verdict: (nu.match(/(\d)\s*\/\s*6/) || [])[1] || null,
        blanche: /BLANK PAGE/i.test(nu),
      };
    });

    if (vu.blanche) {
      failures.push(
        "un CV exporte par le produit est annonce comme une page blanche. "
        + "Un outil de verification qui crie au loup est pire que pas d'outil : "
        + "il envoie quelqu'un refaire un CV qui allait bien."
      );
    }
    if (vu.verdict !== "6") {
      failures.push(
        "le CV exporte par le produit passe " + vu.verdict + " analyseurs sur 6. "
        + "Trois moteurs independants lisent pourtant ce fichier en entier. "
        + "C'est le symptome d'une extraction qui perd les lignes : sans elles, "
        + "aucun lecteur ne retrouve de rubrique, de poste ni d'employeur."
      );
    }
    // La preuve brute doit etre montrable : c'est elle qu'on ne peut pas contester.
    // On vise l'attribut, pas le libelle : le texte du bouton a le droit de
    // changer, ce qu'il ouvre n'a pas le droit de disparaitre. La premiere
    // version cherchait "texte brut" et est tombee au premier changement de
    // formulation, en accusant une page qui allait bien.
    const bouton = p2.locator('[data-nuvi-texte-brut="1"]');
    if (await bouton.count() === 0) {
      failures.push(
        "la page ne montre pas le texte brut extrait. C'est la seule chose "
        + "qu'une personne mefiante peut verifier sans nous croire."
      );
    } else {
      await bouton.first().click();
      await p2.waitForTimeout(500);
      const brut = await p2.evaluate(() => {
        const boite = document.querySelector('[data-nuvi-texte-brut="1"]');
        const zone = boite && boite.parentElement;
        return zone ? zone.textContent : "";
      });
      for (const [quoi, aiguille] of [["l'employeur", "Acme SaaS"], ["l'ecole", "ESSEC"],
        ["le chiffre", "4M EUR"]]) {
        if (!brut.includes(aiguille)) {
          failures.push(
            "le texte montre a la personne ne contient pas " + quoi + " (\""
            + aiguille + "\"). Ce panneau doit montrer ce que la machine lit "
            + "vraiment, sinon il rassure sans informer."
          );
        }
      }
    }
    await ctx2.close();

    // --- 2. Un PDF sans texte est nomme ---------------------------------
    const vide = join(dir, "sans-texte.pdf");
    writeFileSync(vide, pdfSansTexte());

    const ctx3 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p3 = await ctx3.newPage();
    p3.on("pageerror", (e) => jsErrs.push(e.message.split("\n")[0]));
    await p3.goto(base + "/verifier", { waitUntil: "domcontentloaded" });
    await p3.evaluate(() => localStorage.setItem("cvf_c", JSON.stringify("en")));
    await p3.reload({ waitUntil: "domcontentloaded" });
    await p3.waitForTimeout(700);
    await p3.setInputFiles("input[type=file]", vide);
    await p3.waitForTimeout(3500);
    const t3 = await p3.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
    if (!/carries no text at all/i.test(t3)) {
      failures.push(
        "un PDF qui ne porte aucun texte n'est pas signale. C'est le seul "
        + "defaut qu'on ne peut pas voir en regardant le fichier : il "
        + "s'affiche parfaitement et arrive vide devant le premier filtre."
      );
    }
    await ctx3.close();

    if (jsErrs.length) {
      failures.push("erreurs JS sur la page : " + jsErrs.slice(0, 2).join(" | "));
    }

    if (!failures.length) {
      console.log(
        "      un CV exporte par le produit passe les six analyseurs et montre "
        + "son texte brut, et un PDF sans couche de texte est nomme pour ce qu'il est"
      );
    }
  } catch (err) {
    failures.push("le test a plante : " + (err && err.message ? err.message : String(err)));
  } finally {
    if (browser) await browser.close();
    if (srv) await stopServer(srv);
  }
  return failures;
}
