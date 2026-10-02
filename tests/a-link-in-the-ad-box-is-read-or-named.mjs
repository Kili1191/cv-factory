// COLLER UNE ADRESSE DANS LE CHAMP DE L'ANNONCE
//
// Kilian, le 2 octobre 2026 : il colle l'adresse d'une offre Indeed et lance
// l'adaptation. Le champ ne comptait que des caracteres, l'adresse a donc
// ete envoyee au modele comme si c'etait l'annonce. Un modele ne navigue
// pas : il a rendu un intitule disant "Not retrievable from the provided
// Indeed link (page content inaccessible)", la couverture a compte les mots
// de l'URL, et le panneau a affiche 0 sur 6.
//
// L'echec n'est pas le probleme. Le probleme est qu'il a PRODUIT UN
// RESULTAT : un chiffre, une liste de mots manquants, un panneau rempli,
// bati sur une phrase d'erreur, sans rien qui dise que l'annonce n'avait
// jamais ete lue. C'est la panne que ce depot fabrique le plus souvent.
//
// Trois choses tiennent ici, et la troisieme est la plus importante :
//
//   1. Un lien lisible est LU. Le texte de l'annonce remplace l'adresse dans
//      le champ, pour que la personne voie sur quoi Nuvi travaille.
//   2. Un lien illisible est NOMME, avec les deux chemins qui marchent.
//   3. Dans les deux cas d'echec, AUCUN appel au modele ne part. Une adresse
//      ne doit jamais atteindre le prompt comme si c'etait une annonce.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

const LIEN_INDEED = "https://www.indeed.com/viewjob?jk=6f50ec12aab04228&from=mcp-claude-jobsearch";
const LIEN_LISIBLE = "https://job-boards.greenhouse.io/acme/jobs/4012";

const DESCRIPTION = "Portfolio management and credit risk analysis of specialised products. "
  + "Stakeholder management across the division. Experience of risk assessment in a financial "
  + "institution is essential, with strong commercial awareness.";

// LE MESSAGE S'EFFACE AU BOUT DE TROIS SECONDES
//
// Premiere version de ce test : attendre 3000ms puis lire la zone d'etat.
// Elle etait vide, et le test accusait le produit de ne rien dire alors
// qu'il le disait et que le message venait de partir. On le guette pendant
// l'attente au lieu de le cueillir apres.
async function collerEtLancer(page, texte, msAttente = 4000) {
  await page.evaluate(() => window.__nuviOpenModal("open-match"));
  await page.waitForTimeout(900);
  const champ = page.locator('textarea[data-nuvi="match-annonce"]').first();
  if (!(await champ.count())) return null;
  await champ.fill(texte);
  await page.waitForTimeout(400);
  const choix = page.locator('[data-nuvi="match-choix"][data-nuvi-choix="actuel"]').first();
  if (!(await choix.count())) return null;
  await choix.click({ timeout: 8000 }).catch(() => {});
  let vu = "";
  const fin = Date.now() + msAttente;
  while (Date.now() < fin) {
    const t = await page.evaluate(() => {
      const n = document.querySelector('[data-nuvi="notif"]');
      return n ? (n.textContent || "").trim() : "";
    });
    if (t && !vu) vu = t;
    await page.waitForTimeout(150);
  }
  return { message: vu };
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    // --- 1. UN SITE QUI REFUSE UN SERVEUR EST NOMME, SANS ALLER VOIR -----
    //
    // Indeed repond 401 avec une page de detection de robot quel que soit
    // l'agent declare, mesure le jour ou ce test a ete ecrit. Envoyer la
    // requete quand meme ne ferait qu'ajouter l'attente a l'echec.
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      await seedApp(page, SAMPLE_CV, { locale: "en" });
      let versLeModele = 0, versLaRoute = 0;
      await page.route("**/api/claude", (r) => { versLeModele += 1; return r.abort(); });
      await page.route("**/api/annonce", (r) => { versLaRoute += 1; return r.abort(); });

      const vu1 = await collerEtLancer(page, LIEN_INDEED);
      if (!vu1) {
        failures.push("le panneau Match n'offre pas son champ d'annonce");
      } else {
        const dit = vu1.message;
        if (!dit) {
          failures.push("une adresse Indeed collee ne produit aucun message");
        } else {
          if (!/indeed/i.test(dit)) {
            failures.push("le message ne nomme pas le site qui refuse : \"" + dit.slice(0, 70) + "\"");
          }
          if (!/paste|extension/i.test(dit)) {
            failures.push("le message ne donne aucun chemin qui marche (coller le texte, ou l'extension)");
          }
        }
        if (versLeModele > 0) {
          failures.push(
            "une adresse est partie au modele comme si c'etait l'annonce.\n" +
            "      C'est le defaut d'origine : le modele ne navigue pas, et le panneau se remplit\n" +
            "      d'un resultat bati sur une phrase d'erreur."
          );
        }
        if (versLaRoute > 0) {
          failures.push("Nuvi tente quand meme de lire un site dont on sait qu'il repond 401");
        }
      }
      await ctx.close();
    }

    // --- 2. UN LIEN LISIBLE EST LU, ET LE TEXTE REMPLACE L'ADRESSE -------
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      await seedApp(page, SAMPLE_CV, { locale: "en" });
      let promptRecu = "";
      await page.route("**/api/annonce", (r) => r.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ job: {
          title: "Active Portfolio Management Analyst", company: "UKEF",
          location: "London", description: DESCRIPTION } }),
      }));
      await page.route("**/api/claude", (r) => {
        try { promptRecu = String(JSON.parse(r.request().postData() || "{}").prompt || ""); } catch { /* ignore */ }
        return r.fulfill({ status: 200, contentType: "application/json",
          body: JSON.stringify({ content: [{ type: "text", text: JSON.stringify({
            match_score: 50, job_title: "Active Portfolio Management Analyst", company: "UKEF",
            key_requirements: [], keywords_matched: [], keywords_to_add: [], hidden_signals: [],
            culture_decode: "x", seniority_decode: "x", likely_interview_questions: [],
            cover_letter_hook: "x", cv_optimized: { ...SAMPLE_CV } }) }] }) });
      });

      if (await collerEtLancer(page, LIEN_LISIBLE, 5000)) {
        if (!promptRecu) {
          failures.push("un lien lisible ne declenche aucune adaptation");
        } else {
          if (promptRecu.includes(LIEN_LISIBLE)) {
            failures.push("l'adresse est partie au modele au lieu du texte lu derriere elle");
          }
          if (!promptRecu.includes("credit risk analysis")) {
            failures.push("le texte de l'annonce lue n'atteint pas la consigne");
          }
        }
        const dansLeChamp = await page.locator('textarea[data-nuvi="match-annonce"]').first()
          .inputValue().catch(() => "");
        if (dansLeChamp && dansLeChamp.includes(LIEN_LISIBLE)) {
          failures.push(
            "le champ contient toujours l'adresse apres lecture.\n" +
            "      La personne ne voit pas sur quoi Nuvi a travaille, donc ne peut pas le corriger."
          );
        }
      }
      await ctx.close();
    }

    // --- 3. UN LIEN QUI NE REPOND PAS LE DIT, ET N'ADAPTE RIEN -----------
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      await seedApp(page, SAMPLE_CV, { locale: "en" });
      let versLeModele = 0;
      await page.route("**/api/annonce", (r) => r.fulfill({
        status: 422, contentType: "application/json",
        body: JSON.stringify({ error: { type: "unreachable", message: "the page answered 403" } }),
      }));
      await page.route("**/api/claude", (r) => { versLeModele += 1; return r.abort(); });

      const vu3 = await collerEtLancer(page, LIEN_LISIBLE);
      if (vu3) {
        const dit = vu3.message;
        if (!dit) failures.push("un lien qui ne repond pas ne produit aucun message");
        else if (!/paste|extension/i.test(dit)) {
          failures.push("l'echec de lecture ne propose aucun chemin qui marche");
        }
        if (versLeModele > 0) {
          failures.push("l'adaptation part quand meme apres un echec de lecture de l'annonce");
        }
      }
      await ctx.close();
    }

    if (!failures.length) {
      console.log("      un lien lisible est lu et remplace l'adresse, un site qui refuse est nomme, "
        + "et aucune adresse n'atteint le modele");
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
