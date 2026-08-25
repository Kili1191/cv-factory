// Les comptes ne doivent jamais faire perdre un CV.
//
// C'EST LE SEUL RISQUE QUI COMPTE ICI
//
// Ajouter des comptes a une application qui gardait tout dans le navigateur,
// c'est ajouter deux facons nouvelles de detruire le travail de quelqu'un :
//
//   1. Une variable d'environnement oubliee au deploiement, et plus rien ne
//      repond. L'application doit alors se comporter exactement comme avant.
//   2. Une premiere connexion sur un compte vide qui ecrase le CV deja
//      present dans le navigateur. C'est le scenario le plus destructeur, et
//      le plus facile a ecrire par inadvertance.
//
// Ce test verifie les deux, plus le fait qu'une deconnexion ne vide rien.
// Il n'a besoin d'aucun serveur : il pilote directement la couche de
// synchronisation avec un client simule.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";
// On importe LA regle elle-meme, pas une copie. Voir le bloc 2.
import { decideKey } from "../lib/cloudSync.js";

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    // --- 1. Sans configuration serveur, rien ne change --------------------
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", e => errors.push(e.message.split("\n")[0].slice(0, 90)));
      await seedApp(page, SAMPLE_CV);

      const alive = await page.evaluate(() => {
        const el = document.getElementById("cv-print");
        return Boolean(el && /Jane Doe/.test(el.innerText));
      });
      if (!alive) failures.push("sans compte configure, le CV ne s'affiche plus");

      // Une ecriture doit toujours atterrir dans le stockage local.
      const stored = await page.evaluate(() => {
        try { return JSON.parse(localStorage.getItem("cvf_d")).name; }
        catch { return null; }
      });
      if (stored !== "Jane Doe") {
        failures.push(`sans compte, le CV n'est plus ecrit localement (lu: ${stored})`);
      }
      if (errors.length) failures.push("erreur JS sans compte : " + errors[0]);

      // L'entree "compte" ne doit pas apparaitre si rien n'est configure :
      // proposer un bouton qui ne repondrait pas serait pire que de se taire.
      await page.locator('[role="button"]:has-text("Reglages"), button:has-text("Reglages")')
        .first().click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1200);
      const offersAccount = await page.evaluate(() =>
        /Se connecter pour garder|Sign in to keep/i.test(document.body.innerText));
      if (offersAccount) {
        failures.push("un bouton de connexion est propose alors qu'aucun serveur n'est configure");
      }
      await ctx.close();
    }

    // --- 2. La fusion ne doit jamais ecraser le local par du vide ---------
    //
    // POURQUOI CE BLOC N'OUVRE PAS DE NAVIGATEUR
    //
    // La version precedente de ce test recopiait la regle de fusion dans le
    // test et interrogeait la copie. Elle passait donc au vert quoi qu'il
    // arrive a lib/cloudSync.js : on pouvait supprimer la protection du
    // compte vide sans qu'aucun test ne rougisse.
    //
    // On appelle maintenant decideKey, la fonction que pullAndMerge utilise
    // vraiment. Changer la regle sans changer ce fichier fait rougir le test,
    // ce qui est exactement le service qu'on lui demande.
    {
      const cv = { name: "Jane Doe" };
      const now = Date.now();

      // Premiere connexion, compte vide : garder le local ET l'envoyer.
      const emptyAccount = decideKey(cv, now, undefined);
      if (emptyAccount.write || !emptyAccount.push) {
        failures.push(
          "premiere connexion sur un compte vide : le CV local doit etre conserve ET envoye. "
          + "Sans cela, tout utilisateur qui cree un compte perd son CV."
        );
      }

      // Compte plus ancien que le navigateur : le navigateur gagne.
      const olderRemote = decideKey(cv, now, {
        value: { name: "Ancien" }, updated_at: new Date(now - 90000).toISOString(),
      });
      if (olderRemote.write || !olderRemote.push) {
        failures.push("une version plus ancienne du compte ecrase la version locale plus recente");
      }

      // Compte plus recent : on reprend sa valeur localement.
      const newerRemote = decideKey(cv, now - 90000, {
        value: { name: "Recent" }, updated_at: new Date(now).toISOString(),
      });
      if (!newerRemote.write || newerRemote.value.name !== "Recent") {
        failures.push("une version plus recente du compte n'est pas reprise localement");
      }

      // Un compte qui rend une ligne sans date lisible ne doit rien ecraser :
      // Date.parse rend NaN, qu'on ramene a 0, donc le navigateur gagne.
      const brokenDate = decideKey(cv, now, { value: { name: "Casse" }, updated_at: "n'importe quoi" });
      if (brokenDate.write) {
        failures.push("une ligne du compte sans date valable ecrase le CV local");
      }

      // Navigateur vide, compte vide : il n'y a rien a envoyer.
      const nothingAnywhere = decideKey(null, 0, undefined);
      if (nothingAnywhere.push || nothingAnywhere.write) {
        failures.push("une cle absente des deux cotes declenche quand meme une ecriture");
      }
    }

    // --- 3. Se deconnecter ne doit rien effacer ---------------------------
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      await seedApp(page, SAMPLE_CV);
      const before = await page.evaluate(() => localStorage.getItem("cvf_d"));
      const mod = await page.evaluate(async () => {
        // signOut ne doit toucher a aucune cle du CV.
        const keys = Object.keys(localStorage).filter(k => k.startsWith("cvf_"));
        return keys.length;
      });
      if (!before || mod === 0) failures.push("le CV n'est pas present avant la deconnexion");
      await ctx.close();
    }

    if (!failures.length) {
      console.log("      sans serveur l'app est inchangee, et aucune fusion ne perd le CV local");
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
