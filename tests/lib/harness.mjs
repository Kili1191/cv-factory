// Petit harnais commun aux tests de bout en bout.
//
// Pas de framework : un serveur Next demarre, un Chromium pilote, des
// assertions explicites. L'objectif est qu'un test qui casse dise en une
// ligne ce qui ne va plus, et qu'il tourne aussi bien ici qu'en CI.

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const PORT = Number(process.env.TEST_PORT || 4311);
export const BASE_URL = `http://127.0.0.1:${PORT}`;

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
  killGroup("SIGTERM");
  for (let i = 0; i < 20; i += 1) {
    await new Promise(r => setTimeout(r, 200));
    try {
      await fetch(BASE_URL, { signal: AbortSignal.timeout(300) });
    } catch (e) { return; }   // ne repond plus : c'est bon
  }
  killGroup("SIGKILL");
  await new Promise(r => setTimeout(r, 300));
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

export async function seedApp(page, cv = SAMPLE_CV) {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.evaluate((data) => {
    localStorage.setItem("cvf_d", JSON.stringify(data));
    localStorage.setItem("cvf_k", JSON.stringify("sk-test-not-used"));
    localStorage.setItem("cvf_tu", JSON.stringify(true));
  }, cv);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
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
