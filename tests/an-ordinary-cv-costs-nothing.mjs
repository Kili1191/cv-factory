// UN CV ORDINAIRE NE COUTE RIEN A IMPORTER
//
// Importer coutait un appel au modele et plusieurs secondes A CHAQUE FOIS,
// y compris pour un CV parfaitement banal. C'est le tout premier geste du
// produit : quelqu'un colle son CV et attend devant un ecran vide.
//
// lib/lireUnCv.js le lit sur place. Ce test exige les trois proprietes qui
// n'appartiennent qu'a une lecture locale : rien ne part au reseau, le CV
// arrive vraiment a l'ecran, et il arrive JUSTE - un import rapide qui perd
// l'employeur serait pire que l'attente qu'il remplace.
//
// Il verifie aussi l'autre face : un texte que la lecture ne sait pas ranger
// doit repasser par le modele plutot que d'afficher un CV a moitie vide.

import { startServer, stopServer, launchBrowser, seedApp, answerLanguageIfAsked, BASE_URL } from "./lib/harness.mjs";

const CV_ORDINAIRE = `Amara Okafor
Care Assistant
amara.okafor@email.com | 07700 900312

PROFILE
Care Assistant, 6 years in residential and domiciliary care.

EXPERIENCE
Senior Care Assistant
Elmwood Residential Home, Manchester
2022 - 2026
- Led a team of 6 across night shifts for 32 residents.
- Cut medication errors to zero across 18 months of audits.

Care Assistant
Bright Path Homecare, Manchester
2020 - 2022
- Visited 14 clients a day across a 20 mile round.

SKILLS
Medication administration, Manual handling, Safeguarding

LANGUAGES
English, Igbo`;

const TEXTE_ILLISIBLE = "some notes\nworked places\nstuff happened 2019";

async function importer(browser, base, texte) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const appels = [];
  const erreurs = [];
  page.on("pageerror", (e) => erreurs.push(String(e && e.message || e).split("\n")[0]));
  await page.route("**/api/claude**", (route) => {
    appels.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ content: [{ type: "text", text: '{"name":"VOIE MODELE"}' }] }) });
  });

  await page.goto(base + "/app", { waitUntil: "domcontentloaded" });
  await answerLanguageIfAsked(page, "en");
  await page.waitForTimeout(2500);

  // On colle le texte par le chemin d'import, comme une vraie personne.
  const pose = await page.evaluate((t) => {
    if (typeof window.__nuviCollerImport !== "function") return false;
    window.__nuviCollerImport(t);
    return true;
  }, texte);
  if (!pose) { await ctx.close(); return { pose: false, appels, erreurs }; }
  await page.waitForTimeout(3500);

  const vu = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
  await ctx.close();
  return { pose: true, appels, erreurs, vu };
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();
  // LE PORT NE SE RECOPIE PAS
  // Ces deux lignes portaient 4311 en dur. La CI reglant TEST_PORT a 4311,
  // elles passaient par coincidence, et cassaient des qu'on lance la suite
  // sur un autre port - ce qui arrive des qu'un serveur occupe deja celui-la.
  // Le harnais calcule deja l'adresse depuis TEST_PORT : on la lui demande.
  const base = BASE_URL;

  try {
    // --- 1. Le CV ordinaire : local, gratuit, et juste ------------------
    const a = await importer(browser, base, CV_ORDINAIRE);
    if (!a.pose) {
      failures.push(
        "impossible de piloter l'import : __nuviCollerImport absent. Sans lui "
        + "ce test ne peut pas distinguer une lecture locale d'un appel."
      );
    } else {
      if (a.appels.length) {
        failures.push(
          "un CV ordinaire a coute " + a.appels.length + " appel(s) au modele. "
          + "C'est l'attente et le cout qu'on venait de supprimer sur le tout "
          + "premier geste du produit."
        );
      }
      for (const attendu of ["Amara Okafor", "Elmwood Residential Home",
        "Senior Care Assistant", "Bright Path Homecare"]) {
        if (!a.vu.includes(attendu)) {
          failures.push(
            "\"" + attendu + "\" n'est pas arrive a l'ecran. Un import rapide "
            + "qui perd l'employeur est pire que l'attente qu'il remplace."
          );
        }
      }
      if (a.vu.includes("VOIE MODELE")) {
        failures.push("le CV affiche vient du modele alors que la lecture locale suffisait.");
      }
      if (a.erreurs.length) {
        failures.push("erreur JS pendant l'import local - " + a.erreurs.slice(0, 2).join(" | "));
      }
    }

    // --- 2. Le texte illisible repasse par le modele --------------------
    const b = await importer(browser, base, TEXTE_ILLISIBLE);
    if (b.pose && !b.appels.length) {
      failures.push(
        "un texte que la lecture locale ne sait pas ranger n'a PAS ete confie "
        + "au modele. On preferera toujours un CV lu correctement en trois "
        + "secondes a un CV a moitie vide affiche tout de suite."
      );
    }

    if (!failures.length) {
      console.log(
        "      un CV ordinaire arrive sans un seul appel reseau, avec ses "
        + "employeurs et ses intitules ; un texte illisible repasse par le modele"
      );
    }
  } catch (err) {
    failures.push("le test a plante : " + (err && err.message ? err.message : String(err)));
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
