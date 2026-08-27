// Le test qui aurait attrape le bug.
//
// L'export produisait un unique JPEG : zero texte dans le fichier. Un ATS lit
// du texte, donc chaque CV exporte arrivait vide devant le premier filtre
// automatique. Personne ne l'a vu parce que rien n'exercait l'export.
//
// Ce test telecharge un vrai PDF depuis l'application et verifie qu'un
// analyseur y retrouve les informations qui decident d'une candidature. S'il
// echoue, le CV n'est pas lisible par une machine : ne pas livrer.
//
// Il couvre les deux formes de mise en page : la colonne laterale, qui est le
// choix par defaut, et la mise en page ATS-Safe en une seule colonne. Ce sont
// deux dispositions du texte tres differentes, et la couche invisible se
// calcule a partir de la position reelle des mots a l'ecran.

import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServer, stopServer, launchBrowser, seedApp, extractPdfText, SAMPLE_CV } from "./lib/harness.mjs";

// Un CV francais est plein d'accents, et la couche de texte invisible est
// ecrite par jsPDF, pas par le navigateur : si son encodage les abime, l'ATS
// lit "Ing nieur" la ou le candidat a ecrit "Ingenieur diplome". On exporte
// donc un CV accentue et on verifie que les accents ressortent intacts.
const CV = {
  ...SAMPLE_CV,
  title: "Chef de Produit Sénior",
  summary: "Diplômé de l'ESSEC, spécialisé dans les produits à forte récurrence."
    + " Mène des équipes pluridisciplinaires depuis huit années.",
  experience: [{
    ...SAMPLE_CV.experience[0],
    bullets: [
      "Lance 3 produits generant 4M EUR d'ARR",
      "Déploie une stratégie orientée données à l'échelle européenne",
    ],
  }],
};

// Ce qu'un recruteur, ou son logiciel, doit pouvoir retrouver.
const MUST_CONTAIN = [
  ["nom",           CV.name],
  ["intitule",      "Chef de Produit"],
  ["email",         CV.email],
  ["telephone",     CV.phone],
  ["employeur",     "Acme SaaS"],
  ["resultat chiffre", "4M EUR"],
  ["ecole",         "ESSEC"],
  ["competence",    "Roadmap"],
  ["certification", "Scrum"],
  ["accents conserves", "stratégie orientée données"],
  ["accent circonflexe", "Diplômé"],
];

// Telecharge un PDF depuis l'application dans la mise en page demandee.
// LE PREMIER EXPORT PAIE UN DEMARRAGE QUE LES SUIVANTS NE PAIENT PAS
//
// La generation du PDF charge ses modules au premier appel. Sur une machine
// de CI, ce chargement s'ajoute a l'export lui-meme et a deja fait depasser
// les 90 secondes - une seule fois, sur le premier modele, les cinq suivants
// passant sans probleme.
//
// On donne donc au premier un budget plus large, et on AFFICHE la duree de
// chacun. Elargir un delai sans regarder ce qu'il couvre, c'est se rendre
// aveugle a un vrai ralentissement ; l'afficher permet de le voir venir.
const BUDGET_PREMIER = 180_000;
const BUDGET_SUIVANTS = 90_000;

async function exportOnce(browser, layout, premier = false) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, acceptDownloads: true });
  const page = await ctx.newPage();
  // Seules les exceptions JS comptent. Les erreurs de chargement de
  // ressources (polices Google, favicon) dependent du reseau de la machine
  // qui execute le test et n'ont rien a voir avec l'export : les prendre
  // pour des echecs rendrait la suite ininterpretable.
  const errors = [];
  page.on("pageerror", e => errors.push(e.message.split("\n")[0]));
  await seedApp(page, CV, { layout });

  // Le .catch est attache tout de suite : sans lui, si un clic echoue, la
  // promesse de telechargement reste pendante et sa rejection masque la
  // vraie erreur au moment ou le navigateur se ferme.
  let downloadErr = null;
  const debut = Date.now();
  const downloadPromise = page
    .waitForEvent("download", { timeout: premier ? BUDGET_PREMIER : BUDGET_SUIVANTS })
    .catch((e) => { downloadErr = e; return null; });

  let clickErrMsg = null;
  try {
    await page.getByRole("button", { name: /Telecharger/i }).first().click({ timeout: 15_000 });
    await page.waitForTimeout(1500);
    // Une modale de choix de format peut s'interposer.
    const confirm = page.getByRole("button", { name: /A4|Standard|Telecharger/i });
    if (await confirm.count() > 1) { await confirm.nth(1).click({ timeout: 10_000 }).catch(() => {}); }
  } catch (clickErr) {
    clickErrMsg = clickErr.message.split("\n")[0];
  }

  const download = await downloadPromise;
  if (!download) {
    await ctx.close();
    return {
      errors, failed:
        "aucun PDF telecharge.\n" +
        (clickErrMsg ? "      clic : " + clickErrMsg + "\n" : "") +
        "      erreurs page : " + (errors.slice(0, 3).join(" | ") || "aucune") + "\n" +
        "      " + (downloadErr ? downloadErr.message.split("\n")[0] : ""),
    };
  }
  const secondes = Math.round((Date.now() - debut) / 100) / 10;
  const dir = mkdtempSync(join(tmpdir(), "cvf-export-"));
  const pdfPath = join(dir, "cv.pdf");
  await download.saveAs(pdfPath);
  const bytes = readFileSync(pdfPath);
  await ctx.close();
  const { text, pages } = await extractPdfText(bytes);
  return { errors, bytes, text, pages, secondes };
}

// Les controles qui valent pour toute mise en page.
function checkCommon(label, out, failures) {
  if (out.text.length === 0) {
    failures.push(
      `${label} : le PDF exporte ne contient AUCUN texte extractible.\n` +
      "      C'est le bug de la couche image : un ATS ne lira rien du CV.\n" +
      "      Verifier overlayTextLayer dans app/AppRoot.jsx."
    );
    return;
  }
  if (!out.bytes.includes(Buffer.from("DCTDecode"))) {
    failures.push(`${label} : l'image du rendu a disparu du PDF, le CV ne ressemblera plus a rien`);
  }
  if (out.pages !== 1) failures.push(`${label} : le CV devrait tenir sur 1 page, ${out.pages} trouvees`);

  // Un robot de tri lit le flux de texte dans l'ordre et prend les premieres
  // lignes pour l'identite. La mise en page a deux colonnes rangeant la
  // colonne laterale en premier dans le HTML, le texte commencait par
  // "CONTACT" et l'adresse e-mail : le nom du candidat arrivait apres les
  // competences. Le nom doit venir avant le mot CONTACT.
  const posNom = out.text.indexOf(CV.name);
  const posContact = out.text.search(/CONTACT/i);
  if (posNom === -1) {
    failures.push(`${label} : le nom du candidat est absent du flux de texte`);
  } else if (posContact !== -1 && posContact < posNom) {
    failures.push(
      `${label} : le texte extrait commence par la colonne laterale, un ATS lira ` +
      `"${out.text.slice(0, 40).replace(/\s+/g, " ").trim()}" avant le nom du candidat`
    );
  }

  // Beaucoup d'analyseurs prennent la premiere ligne pour le nom du candidat.
  // Le monogramme d'initiales du CV, purement decoratif, s'ecrivait dans la
  // couche de texte et sortait en premiere ligne sur trois modeles : un
  // analyseur y lisait "JD" comme nom. Le decor est exclu de la couche ; la
  // premiere ligne doit donc etre le nom.
  const premiere = out.text.split("\n").map(l => l.trim()).find(Boolean) || "";
  if (!premiere.includes(CV.name)) {
    failures.push(
      `${label} : la premiere ligne lue par un ATS est "${premiere.slice(0, 40)}" ` +
      `au lieu du nom du candidat`
    );
  }
  const initiales = CV.name.split(/\s+/).map(w => w[0]).join("").toUpperCase();
  if (new RegExp(`(^|\\s)${initiales}(\\s|$)`).test(out.text)) {
    failures.push(
      `${label} : le monogramme "${initiales}" est present dans le texte extrait, ` +
      `c'est du decor qui pollue le nom du candidat`
    );
  }
  if (out.errors.length) {
    failures.push(`${label} : erreurs JS pendant l'export - ` + out.errors.slice(0, 2).join(" | "));
  }
}

// Le CV existe en six modeles, et un seul etait teste.
//
// Pendant l'export, un CSS force le CV a remplir exactement une page A4 et
// coupe ce qui depasse. Une de ces regles visait tous les petits-enfants de
// #cv-print, pour que la colonne laterale du modele par defaut descende
// jusqu'en bas. Dans les modeles a une seule colonne, ces petits-enfants sont
// les sections du CV : chacune se retrouvait haute d'une page entiere. Le
// contenu descendait a 11450px pour ATS-Safe et 11509px pour Classique, sur
// une page qui en fait 1123. Cinq modeles sur six exportaient une page
// quasiment vide - l'image comme le texte.
//
// On exporte donc reellement les six. C'est plus long qu'une verification du
// CSS depuis le test, mais un test qui reecrit le CSS de l'application ne
// verifie que sa propre copie : il aurait laisse passer exactement ce bug.
const LAYOUTS = ["sidebar", "ats", "classic", "timeline", "swiss", "compact"];

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();
  const sizes = [];
  try {
    const durees = [];
    for (const [i, layout] of LAYOUTS.entries()) {
      const out = await exportOnce(browser, layout, i === 0);
      if (out.secondes !== undefined) durees.push(`${layout} ${out.secondes}s`);
      if (out.failed) { failures.push(`modele ${layout} : ` + out.failed); continue; }
      checkCommon(`modele ${layout}`, out, failures);
      for (const [what, needle] of MUST_CONTAIN) {
        if (!out.text.includes(needle)) {
          failures.push(`modele ${layout} : ${what} absent du texte du PDF - "${needle}"`);
        }
      }
      sizes.push(`${layout} ${out.text.length}`);
    }

    if (!failures.length) {
      console.log(`      ${LAYOUTS.length} modeles exportes, nom en tete, accents intacts, `
        + `image conservee (caracteres extraits : ${sizes.join(", ")})`);
      // La duree du PREMIER export dit le cout du demarrage. S'il grimpe d'une
      // livraison a l'autre, quelque chose ralentit l'application - et on le
      // verra ici avant que la CI ne se mette a rougir par intermittence.
      console.log(`      duree par modele : ${durees.join("  ")}`);
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
