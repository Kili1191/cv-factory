// Une connexion qui echoue doit le dire.
//
// POURQUOI CE TEST EXISTE
//
// Le fournisseur d'identite renvoie le visiteur sur l'accueil avec l'echec
// dans l'adresse :
//
//   /?error=server_error&error_code=unexpected_failure
//    &error_description=Unable+to+exchange+external+code...
//
// L'application ne lisait que `go` et `gmail` et sortait aussitot. La page
// se chargeait normalement, rien ne s'affichait, et la seule trace de
// l'echec etait une barre d'adresse que personne ne lit.
//
// Vu du visiteur : il clique "Continuer avec Google", choisit son compte,
// revient sur Nuvi... et il n'est pas connecte. Sans explication. Il
// recommence, ca rate encore, et il part en pensant que le site est casse.
// C'est le pire moment possible pour se taire : il venait d'accepter de
// donner son adresse.
//
// C'est arrive en vrai, sur thenuvi.com, et c'est une capture d'ecran de
// l'adresse - pas un test - qui l'a revele.
//
// CE QU'IL VERIFIE
//
//   1. L'echec s'affiche, dans les deux emplacements ou il peut arriver :
//      la query ET le fragment. La redirection utilise la premiere, le flux
//      implicite le second ; n'en lire qu'un rend le message invisible une
//      fois sur deux.
//   2. Le message rassure sur le CV. C'est la premiere inquietude de
//      quelqu'un qui voit "echec" sur un site ou il a ecrit quelque chose.
//   3. Le code technique reste atteignable. C'est la seule chose qui permet
//      de reparer : sans elle il faut reproduire la panne pour la
//      diagnostiquer.
//   4. L'adresse est nettoyee et le message ne se rejoue pas au
//      rechargement.
//   5. Une adresse SANS erreur n'affiche rien. Un message d'echec qui
//      apparait tout seul serait pire que pas de message du tout.

import { startServer, stopServer, launchBrowser, BASE_URL, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

const PANNEAU = '[data-nuvi-signin-failed="1"]';
const DESC = "Unable to exchange external code: 4/0AVGzR1D";

const CAS = [
  {
    nom: "query",
    url: "/?error=server_error&error_code=unexpected_failure&error_description="
      + encodeURIComponent(DESC),
  },
  {
    nom: "fragment",
    url: "/#error=server_error&error_code=unexpected_failure&error_description="
      + encodeURIComponent(DESC),
  },
];

async function ouvrir(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on("pageerror", (e) => erreurs.push(e.message.split("\n")[0]));
  await seedApp(page, SAMPLE_CV, { locale: "en" });
  // ON QUITTE LA PAGE AVANT D'Y REVENIR, ET C'EST INDISPENSABLE
  //
  // seedApp a deja charge BASE_URL. Y retourner en ne changeant que le
  // fragment est une navigation DANS le meme document : le navigateur ne
  // recharge rien, l'application ne redemarre pas, et l'effet qui lit
  // l'adresse ne tourne jamais. Le test concluait alors que le produit
  // ignore le fragment, alors qu'il ne lui avait simplement jamais donne
  // l'occasion de le lire.
  //
  // En vrai le fournisseur redirige depuis un autre domaine, donc c'est
  // toujours un chargement complet. On le reproduit en passant par
  // about:blank - meme origine conservee pour le stockage local.
  await page.goto("about:blank");
  await page.goto(BASE_URL + url, { waitUntil: "networkidle" });
  await page.waitForTimeout(2600);
  return { ctx, page, erreurs };
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    for (const cas of CAS) {
      const { ctx, page, erreurs } = await ouvrir(browser, cas.url);

      const present = await page.locator(PANNEAU).count();
      if (!present) {
        const texte = await page.evaluate(() =>
          (document.body.innerText || "").replace(/\s+/g, " ").slice(0, 90));
        failures.push(
          `${cas.nom} : l'echec de connexion ne s'affiche nulle part. La page `
          + `se charge comme si de rien n'etait - debut de l'ecran : "${texte}". `
          + "Quelqu'un qui vient d'accepter de donner son adresse revient non "
          + "connecte, sans un mot, et repart en pensant que le site est casse."
        );
        await ctx.close();
        continue;
      }

      const vu = await page.evaluate((sel) => {
        const d = document.querySelector(sel);
        return {
          texte: (d.innerText || "").replace(/\s+/g, " "),
          adresse: location.search + location.hash,
          boutons: [...d.querySelectorAll("button")].map((b) => (b.innerText || "").trim()),
        };
      }, PANNEAU);

      // --- 2. Le CV est rassure ---------------------------------------
      if (!/CV is safe|CV est intact/i.test(vu.texte)) {
        failures.push(
          `${cas.nom} : le message ne dit pas que le CV est intact. C'est la `
          + "premiere inquietude de quelqu'un qui voit le mot echec sur un site "
          + "ou il a ecrit quelque chose."
        );
      }
      // Et il ne doit pas accuser la personne.
      if (/you did|ta faute|votre faute/i.test(vu.texte) && !/not something you did/i.test(vu.texte)) {
        failures.push(`${cas.nom} : le message rejette la faute sur le visiteur`);
      }

      // --- 3. Le code technique est atteignable ------------------------
      const detail = page.locator(`${PANNEAU} button`, { hasText: /Technical details|Detail technique/i });
      if (!(await detail.count())) {
        failures.push(
          `${cas.nom} : aucun acces au detail technique. Sans le code renvoye `
          + "par le fournisseur, la panne doit etre reproduite pour etre diagnostiquee."
        );
      } else {
        await detail.click();
        await page.waitForTimeout(400);
        const apres = await page.evaluate((sel) =>
          (document.querySelector(sel).innerText || "").replace(/\s+/g, " "), PANNEAU);
        if (!apres.includes("unexpected_failure") || !apres.includes("exchange external code")) {
          failures.push(
            `${cas.nom} : le detail technique n'expose pas le vrai message du `
            + `fournisseur. Affiche : "${apres.slice(-120)}"`
          );
        }
      }

      // --- 4. L'adresse est nettoyee, et rien ne se rejoue -------------
      if (vu.adresse.includes("error")) {
        failures.push(
          `${cas.nom} : l'adresse porte encore l'erreur ("${vu.adresse.slice(0, 60)}"). `
          + "Elle sera copiee, partagee, et rejouera le message chez quelqu'un d'autre."
        );
      }
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(2200);
      if (await page.locator(PANNEAU).count()) {
        failures.push(
          `${cas.nom} : le message revient au rechargement alors qu'il a deja `
          + "ete lu. Il devient impossible a faire partir."
        );
      }

      if (erreurs.length) {
        failures.push(`${cas.nom} : erreur JS - ${erreurs[0]}`);
      }
      await ctx.close();
    }

    // --- 5. Sans erreur, pas de message ------------------------------
    {
      const { ctx, page } = await ouvrir(browser, "/");
      if (await page.locator(PANNEAU).count()) {
        failures.push(
          "le message d'echec s'affiche sur une adresse normale, sans aucune "
          + "erreur. Un avertissement qui apparait tout seul est pire que pas "
          + "d'avertissement : plus personne ne le croit."
        );
      }
      await ctx.close();
    }

    if (!failures.length) {
      console.log(
        "      l'echec s'affiche depuis la query comme depuis le fragment, "
        + "rassure sur le CV, garde le code technique, et ne se rejoue pas"
      );
    }
  } catch (err) {
    failures.push(`le test a plante : ${err && err.message}`);
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
