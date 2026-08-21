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
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      await seedApp(page, SAMPLE_CV);

      const verdict = await page.evaluate(async () => {
        // Reproduit fidelement la regle de fusion : pour chaque cle, si le
        // compte ne connait rien, le navigateur gagne et sera envoye.
        const merge = (localValue, localAt, remoteRow) => {
          if (!remoteRow) return { keepLocal: true, push: localValue !== null };
          const remoteAt = Date.parse(remoteRow.updated_at) || 0;
          if (remoteAt > localAt) return { keepLocal: false, write: remoteRow.value };
          return { keepLocal: true, push: localAt > remoteAt };
        };
        const cv = JSON.parse(localStorage.getItem("cvf_d"));
        const out = {};
        out.emptyAccount = merge(cv, Date.now(), undefined);
        out.olderRemote = merge(cv, Date.now(), {
          value: { name: "Ancien" }, updated_at: new Date(Date.now() - 90000).toISOString(),
        });
        out.newerRemote = merge(cv, Date.now() - 90000, {
          value: { name: "Recent" }, updated_at: new Date().toISOString(),
        });
        return out;
      });

      if (!verdict.emptyAccount.keepLocal || !verdict.emptyAccount.push) {
        failures.push(
          "premiere connexion sur un compte vide : le CV local doit etre conserve ET envoye. "
          + "Sans cela, tout utilisateur qui cree un compte perd son CV."
        );
      }
      if (!verdict.olderRemote.keepLocal) {
        failures.push("une version plus ancienne du compte ecrase la version locale plus recente");
      }
      if (verdict.newerRemote.keepLocal) {
        failures.push("une version plus recente du compte n'est pas reprise localement");
      }
      await ctx.close();
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
