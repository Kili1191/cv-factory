// Petit harnais commun aux tests de bout en bout.
//
// Pas de framework : un serveur Next demarre, un Chromium pilote, des
// assertions explicites. L'objectif est qu'un test qui casse dise en une
// ligne ce qui ne va plus, et qu'il tourne aussi bien ici qu'en CI.

import { chromium } from "playwright";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const PORT = Number(process.env.TEST_PORT || 4311);
export const BASE_URL = `http://127.0.0.1:${PORT}`;
// L'APPLICATION N'EST PLUS A LA RACINE
//
// "/" est devenu une vitrine ; l'outil vit sur /app. Les suites qui pilotent
// l'application doivent donc viser APP_URL. BASE_URL reste la racine, pour
// les rares controles qui portent sur la vitrine elle-meme (les balises de
// partage, le relais de connexion).
export const APP_URL = `${BASE_URL}/app`;

// En CI, playwright installe son propre Chromium et trouve tout seul.
// En local, l'image fournit un binaire a un emplacement fixe.
function browserOptions() {
  const explicit = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  const candidates = [
    explicit,
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  ].filter(Boolean);
  for (const p of candidates) {
    if (existsSync(p)) return { executablePath: p };
  }
  return {};
}

async function portAnswers() {
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(1500) });
    return res.ok || res.status > 0;
  } catch (e) { return false; }
}

export async function startServer() {
  // Un serveur deja en ecoute sur ce port sert le build PRECEDENT : son HTML
  // reference des chunks qui n'existent plus sur le disque, la page reste
  // bloquee au demarrage et le test accuse l'application. On refuse de
  // continuer plutot que de tester un fantome.
  if (await portAnswers()) {
    throw new Error(
      `le port ${PORT} repond deja. Un serveur d'un run precedent tourne encore ` +
      `et servira un build perime.\n      Le tuer, ou lancer avec TEST_PORT=<autre port>.`
    );
  }

  const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
    // Groupe de processus a part : npx lance next-server en enfant, et un
    // SIGTERM sur npx laisserait l'enfant vivant a tenir le port.
    detached: true,
  });

  // Les flux DOIVENT etre consommes. Sans lecteur, le tampon du tube se
  // remplit et le serveur se bloque en cours de route : les premieres
  // requetes passent, puis les chunks JS partent en 400 et l'application
  // reste sur son ecran de demarrage. On garde seulement la fin, pour
  // pouvoir l'afficher si le demarrage echoue.
  server.stdout.setEncoding("utf8");
  server.stderr.setEncoding("utf8");
  server.log = "";
  const keep = (chunk) => { server.log = (server.log + chunk).slice(-4000); };
  server.stdout.on("data", keep);
  server.stderr.on("data", keep);
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return server;
    } catch (e) { /* pas encore pret */ }
    await new Promise(r => setTimeout(r, 500));
  }
  server.kill("SIGKILL");
  throw new Error(`le serveur n'a pas demarre sur ${BASE_URL} en 90s\n${server.log || ""}`);
}

export async function stopServer(server) {
  if (!server || !server.pid) return;
  // Tuer le GROUPE : sinon next-server survit a la mort de npx et garde le
  // port, ce qui fait echouer le run suivant sur un build perime.
  const killGroup = (sig) => { try { process.kill(-server.pid, sig); } catch (e) {} };

  // ON VERIFIE EXACTEMENT CE QUE LA SUITE SUIVANTE VERIFIERA
  //
  // La version precedente sondait le port avec 300 ms de patience et se
  // declarait satisfaite des que la requete echouait. Or un serveur encore
  // vivant mais lent echoue aussi a 300 ms : stopServer rendait la main en
  // croyant l'avoir tue, et la suite suivante - qui sonde avec 1500 ms - le
  // trouvait bien debout et refusait de demarrer.
  //
  // Le message d'echec accusait alors "un run precedent", alors que le
  // coupable etait la suite d'avant, dans le MEME run. Un test qui se trompe
  // de coupable coute plus cher qu'un test absent : on cherche la panne la ou
  // elle n'est pas.
  //
  // On reutilise donc portAnswers(), la fonction meme dont depend le demarrage
  // suivant. Le critere d'arret devient identique au critere d'entree, et les
  // deux ne peuvent plus diverger.
  killGroup("SIGTERM");
  for (let i = 0; i < 20; i += 1) {
    await new Promise(r => setTimeout(r, 200));
    if (!(await portAnswers())) return;
  }

  killGroup("SIGKILL");
  for (let i = 0; i < 15; i += 1) {
    await new Promise(r => setTimeout(r, 200));
    if (!(await portAnswers())) return;
  }

  // Se taire ici rendrait la suite suivante incomprehensible.
  throw new Error(
    `le serveur de test tient encore le port ${PORT} apres SIGKILL. ` +
    "Les suites suivantes vont echouer en accusant un run precedent."
  );
}

export async function launchBrowser() {
  return chromium.launch(browserOptions());
}

// CV de reference : contient un exemplaire de chaque chose qu'un ATS cherche.
export const SAMPLE_CV = {
  name: "Jane Doe",
  title: "Product Manager Senior",
  email: "jane.doe@email.com",
  phone: "+33 6 12 34 56 78",
  location: "Paris, France",
  linkedin: "linkedin.com/in/janedoe",
  summary: "Product Manager senior avec 8 ans d'experience dans le SaaS B2B.",
  experience: [{
    id: 1, title: "Senior Product Manager", company: "Acme SaaS",
    period: "2021 - 2024", location: "Paris",
    bullets: ["Lance 3 produits generant 4M EUR d'ARR", "Manage une equipe de 6 personnes"],
  }],
  education: [{ id: 1, degree: "Master Marketing", school: "ESSEC Business School", period: "2016 - 2018" }],
  skills: ["Roadmap produit", "SQL", "Agile"],
  languages: [{ lang: "Francais", level: "Natif" }],
  certifications: ["Certified Scrum Product Owner"],
  labels: {},
};

// LA LANGUE EST FIXEE, ET C'EST DELIBERE
//
// La plupart des tests cherchent des boutons par leur libelle francais :
// "Generer", "Reglages", "Trouver un poste". Tant que le francais etait la
// langue par defaut, ils marchaient par accident.
//
// Le jour ou l'anglais est devenu le defaut, huit suites se sont mises a
// chercher des mots qui n'existaient plus - et le message parlait d'un clic
// qui expire, pas d'une langue qui a change. Une heure perdue a chercher au
// mauvais endroit.
//
// La langue est donc posee explicitement. Un test qui affirme du texte doit
// dire dans quelle langue il l'attend ; il ne doit pas dependre d'un reglage
// que le produit a le droit de changer.
export async function seedApp(page, cv = SAMPLE_CV, { layout, locale = "fr" } = {}) {
  await page.goto(APP_URL, { waitUntil: "networkidle" });
  await page.evaluate(({ data, layout, locale }) => {
    localStorage.setItem("cvf_d", JSON.stringify(data));
    localStorage.setItem("cvf_k", JSON.stringify("sk-test-not-used"));
    localStorage.setItem("cvf_tu", JSON.stringify(true));
    localStorage.setItem("cvf_c", JSON.stringify(locale));
    if (layout) localStorage.setItem("cvf_l", JSON.stringify(layout));
  }, { data: cv, layout: layout || null, locale });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
}

// LA QUESTION DE LA LANGUE BARRE LA ROUTE, ET C'EST VOULU
//
// A la premiere visite, Nuvi demande la langue et rend tout le reste
// inutilisable tant qu'on n'a pas repondu - sinon on peut commencer a saisir
// son CV dans une langue et basculer dans l'autre juste apres.
//
// Un test qui part d'un navigateur vierge doit donc y repondre, comme une
// vraie personne. Sans ca, Playwright signale "locator.click: Timeout" sur le
// bouton suivant : un message qui parle d'un clic et pas de langue, et qui
// envoie chercher la panne au mauvais endroit. C'est exactement ce qui est
// arrive a l'import de PDF.
//
// seedApp n'en a pas besoin : il epingle deja cvf_c avant que l'application
// demarre, donc la question ne se pose jamais.
export async function answerLanguageIfAsked(page, lc = "fr") {
  const sel = '[data-nuvi-lang-ask="1"]';
  try {
    await page.waitForSelector(sel, { timeout: 4000 });
  } catch {
    return false; // pas de question posee : rien a faire
  }
  await page.locator(`${sel} button[lang="${lc}"]`).click();
  await page.waitForSelector(sel, { state: "detached", timeout: 5000 });
  await page.waitForTimeout(600);
  return true;
}

// Extrait le texte d'un PDF comme le ferait un robot de tri de CV.
export async function extractPdfText(bytes) {
  const mod = await import("pdfjs-dist/legacy/build/pdf.js");
  const pdfjs = mod.getDocument ? mod : (mod.default || {});
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  let out = "";
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    out += content.items.map(it => it.str).join(" ") + "\n";
  }
  return { text: out.replace(/\s+/g, " ").trim(), pages: doc.numPages };
}

// Meme extraction, mais en conservant les lignes.
//
// extractPdfText ci-dessus ecrase les sauts de ligne : pratique pour chercher
// une chaine, inutilisable pour analyser un CV. Un analyseur reconnait ses
// sections parce que "Experience" est seul sur sa ligne ; sans lignes, tout
// devient un bloc unique et plus rien n'est classe. pdf.js ne rend pas de
// lignes, il rend des fragments places : on les regroupe par ordonnee, comme
// le font poppler et PDFBox.
export async function extractPdfLines(bytes) {
  const mod = await import("pdfjs-dist/legacy/build/pdf.js");
  const pdfjs = mod.getDocument ? mod : (mod.default || {});
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const lines = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const rows = [];
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue;
      const x = item.transform[4];
      const y = item.transform[5];
      // Deux fragments sur la meme ligne de base appartiennent a la meme
      // ligne. La tolerance absorbe les variations de police.
      const row = rows.find(r => Math.abs(r.y - y) <= 3);
      if (row) row.parts.push({ x, str: item.str });
      else rows.push({ y, parts: [{ x, str: item.str }] });
    }
    // Ordonnee decroissante : dans un PDF, l'origine est en bas de page.
    rows.sort((a, b) => b.y - a.y);
    for (const row of rows) {
      row.parts.sort((a, b) => a.x - b.x);
      const text = row.parts.map(p => p.str).join(" ").replace(/\s+/g, " ").trim();
      if (text) lines.push(text);
    }
  }
  return { lines, text: lines.join("\n"), pages: doc.numPages };
}

// Telecharge un vrai PDF depuis l'application, dans la mise en page demandee.
// Rend aussi le chemin du fichier : les analyseurs externes (poppler, Tika)
// lisent un fichier, pas un tableau d'octets.
export async function exportCvPdf(browser, cv, layout) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 950 }, acceptDownloads: true,
  });
  const page = await ctx.newPage();
  // Seules les exceptions JS comptent : un echec de chargement de police
  // depend du reseau de la machine, pas de l'export.
  const errors = [];
  page.on("pageerror", e => errors.push(e.message.split("\n")[0]));
  await seedApp(page, cv, { layout });

  // Le .catch est attache tout de suite : sinon, si un clic echoue, la
  // promesse reste pendante et sa rejection masque la vraie erreur.
  let downloadErr = null;
  const downloadPromise = page
    .waitForEvent("download", { timeout: 90_000 })
    .catch((e) => { downloadErr = e; return null; });

  let clickErrMsg = null;
  try {
    await page.getByRole("button", { name: /Telecharger/i }).first().click({ timeout: 15_000 });
    await page.waitForTimeout(1500);
    const confirm = page.getByRole("button", { name: /A4|Standard|Telecharger/i });
    if (await confirm.count() > 1) { await confirm.nth(1).click({ timeout: 10_000 }).catch(() => {}); }
  } catch (clickErr) {
    clickErrMsg = clickErr.message.split("\n")[0];
  }

  // CE QUE LA PAGE AFFICHE VRAIMENT, LU DANS LE DOCUMENT
  //
  // Sert a repondre exactement a la question "la couche de texte invisible
  // du PDF contient-elle un mot qui n'est pas sur la page ?". L'OCR y
  // repondait approximativement : il ne lit pas les petits caracteres d'une
  // serif fine, et son taux de reussite change avec les polices reellement
  // chargees - donc avec le reseau de la machine. Le DOM, lui, dit la verite
  // sans marge d'erreur.
  //
  // [data-cvf="cv"] est le CV seul, sans l'interface autour : prendre toute
  // la page laisserait un mot invente passer pour vu s'il figurait par
  // hasard dans un menu.
  let domText = "";
  try {
    domText = await page.evaluate(() => {
      const el = document.querySelector('[data-cvf="cv"]');
      return el ? (el.innerText || "") : "";
    });
  } catch { /* la page a disparu : domText reste vide, le test le dira */ }

  const download = await downloadPromise;
  if (!download) {
    await ctx.close();
    return {
      errors, failed:
        "aucun PDF telecharge.\n"
        + (clickErrMsg ? "      clic : " + clickErrMsg + "\n" : "")
        + "      erreurs page : " + (errors.slice(0, 3).join(" | ") || "aucune") + "\n"
        + "      " + (downloadErr ? downloadErr.message.split("\n")[0] : ""),
    };
  }
  const dir = mkdtempSync(join(tmpdir(), "cvf-export-"));
  const pdfPath = join(dir, "cv.pdf");
  await download.saveAs(pdfPath);
  const bytes = readFileSync(pdfPath);
  await ctx.close();
  const { text, pages } = await extractPdfText(bytes);
  return { errors, bytes, text, pages, pdfPath, domText };
}
