// The CV obeys the market it is being sent to.
//
// WHY THIS EXISTS
//
// Nuvi already knew which country someone was aiming at: the picker drove
// the recruiter audit and the interview simulation. The CV itself ignored
// it. So somebody applying in London got a French convention CV back from a
// product whose single promise is a document that gets through, and the
// picker defaulted to France for everyone and was forgotten on reload.
//
// WHAT THIS HOLDS
//
//   1. The rules only ever REMOVE and shorten. This is the one that must
//      never slip: a rule that added anything would have to invent a date
//      of birth or a nationality nobody wrote, and that is the line the
//      whole product is built on.
//   2. A market with no removals says so instead of inventing a rule, and
//      an unknown market says nothing at all rather than asserting a
//      convention we do not have.
//   3. The market is read off the ad, because the ad names it better than
//      any setting.
//   4. The request that reaches the model carries the rules.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";
import { reglesDuPays, conventionsDuPays, paysDuTexte, PAYS_CONNUS, codeAdzuna } from "../lib/conventions.js";

// Words that would mean the rules are telling the model to put something on
// the CV. None of them belongs in a rule that only takes away.
const AJOUTE = /\b(add|include|insert|put in|mention|state your|provide your|ajoute|indique)\b/i;

export async function run() {
  const failures = [];

  // --- 1. The rules never add ------------------------------------------
  for (const code of PAYS_CONNUS) {
    const texte = reglesDuPays(code);
    if (!texte) { failures.push(code + " : aucune regle rendue pour un pays connu"); continue; }
    if (AJOUTE.test(texte)) {
      failures.push(code + " : la regle demande d'AJOUTER quelque chose au CV (\""
        + (texte.match(AJOUTE) || [""])[0] + "\"). Une convention ne peut que retirer : "
        + "ajouter voudrait dire inventer une date de naissance ou une nationalite");
    }
    const r = conventionsDuPays(code);
    if (!r.pages) failures.push(code + " : aucune longueur annoncee");
    if (!r.document) failures.push(code + " : le document n'est pas nomme");
  }

  // --- 2. The markets that differ, differ ------------------------------
  const uk = conventionsDuPays("UK");
  for (const champ of ["photo", "date of birth", "marital status", "nationality"]) {
    if (!uk.retirer.includes(champ)) {
      failures.push("le marche britannique ne retire pas \"" + champ + "\" : "
        + "c'est exactement ce qui fait passer un CV francais pour naif a Londres");
    }
  }
  if (conventionsDuPays("FR").retirer.length) {
    failures.push("le marche francais retire des champs : une photo y est courante, "
      + "on ne touche pas a ce que la personne a ecrit");
  }
  if (!/photo/i.test(conventionsDuPays("DE").note || "")) {
    failures.push("le marche allemand ne dit rien de la photo, qui y est d'usage");
  }
  if (reglesDuPays("AUTO") !== "" || reglesDuPays("") !== "" || reglesDuPays("ZZ") !== "") {
    failures.push("un marche inconnu produit quand meme une regle : mieux vaut se taire "
      + "que d'affirmer une convention qu'on n'a pas");
  }

  // --- 2 bis. One market, obeyed everywhere ----------------------------
  //
  // The job search kept its own country, defaulting to France, so somebody
  // in London opened "Find a role" and searched the French market until
  // they spotted the button. Adzuna calls the United Kingdom "gb", which is
  // exactly the kind of detail that makes a search quietly return nothing.
  if (codeAdzuna("UK") !== "gb") {
    failures.push("le marche britannique n'est pas traduit en \"gb\" pour Adzuna (rendu "
      + JSON.stringify(codeAdzuna("UK")) + ") : la recherche londonienne ne rendrait rien");
  }
  if (codeAdzuna("FR") !== "fr") failures.push("le marche francais n'est pas traduit en \"fr\"");
  if (codeAdzuna("ZZ") !== "" || codeAdzuna("") !== "") {
    failures.push("un marche inconnu rend quand meme un code de pays a la recherche");
  }

  // --- 3. The ad names the market --------------------------------------
  for (const [texte, attendu] of [
    ["Beverage Manager, Soho House, London", "UK"],
    ["Chef de projet, Lyon", "FR"],
    ["Sales Manager based in Dubai", "AE"],
    ["Softwareentwickler in Berlin", "DE"],
    ["Fully remote, anywhere", ""],
  ]) {
    const vu = paysDuTexte(texte);
    if (vu !== attendu) {
      failures.push("\"" + texte.slice(0, 34) + "\" lu comme " + JSON.stringify(vu)
        + " au lieu de " + JSON.stringify(attendu));
    }
  }

  // --- 4. The rules reach the model ------------------------------------
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await ctx.newPage();
    await seedApp(page, SAMPLE_CV, { locale: "en" });
    let envoye = "";
    await page.route("**/api/claude", (route) => {
      try { envoye = route.request().postData() || ""; } catch { envoye = ""; }
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ content: [{ type: "text", text: "{}" }] }) });
    });
    await page.evaluate(() => window.__nuviOpenModal("open-match"));
    await page.waitForTimeout(900);
    const champ = page.locator('textarea[data-nuvi="match-annonce"]').first();
    if (!(await champ.count())) failures.push("le panneau Match n'offre pas son champ d'annonce");
    else {
      await champ.fill("Beverage Manager wanted in central London. You will own the drinks "
        + "programme for a 200 cover venue, manage fifteen staff, and control gross profit "
        + "and stock across both bars. WSET Level 2 essential.");
      await page.waitForTimeout(400);
      await page.locator('[data-nuvi="match-choix"][data-nuvi-choix="actuel"]').first().click({ timeout: 8000 });
      await page.waitForTimeout(2000);
      if (!envoye) failures.push("la demande envoyee a l'IA n'a pas ete lue");
      else if (!/TARGET MARKET: the United Kingdom/.test(envoye)) {
        failures.push("une annonce londonienne part sans dire au modele qu'il ecrit pour "
          + "le marche britannique : le CV reviendra avec les usages d'un autre pays");
      } else if (!/date of birth/.test(envoye)) {
        failures.push("les regles partent sans nommer ce qu'il faut retirer");
      }
    }
    await ctx.close();
    if (!failures.length) {
      console.log("      " + PAYS_CONNUS.length + " marches, aucune regle n'ajoute quoi que ce soit, "
        + "un marche inconnu se tait, l'annonce nomme le marche, et les regles arrivent au modele");
    }
  } catch (err) {
    failures.push("the test itself crashed: " + (err && err.message));
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
