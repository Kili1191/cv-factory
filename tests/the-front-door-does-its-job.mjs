// La vitrine dit ce qu'est Nuvi, et laisse entrer.
//
// POURQUOI CE TEST EXISTE
//
// L'application a demenage sur /app pour que "/" devienne une page qui
// explique le produit. Ce deplacement a mis DEUX chemins critiques sur la
// racine, et aucun des deux ne se voit quand on regarde la page :
//
//   1. Le retour de connexion. Le fournisseur d'identite renvoie toujours
//      vers la racine du domaine - ce reglage vit chez Supabase et chez
//      Google, pas ici. Si la vitrine ne relaie pas, se connecter ramene le
//      visiteur sur une page de presentation, deconnecte, sans un mot.
//   2. L'icone deja posee sur un ecran d'accueil. Elle pointe encore sur
//      /?src=homescreen, parce qu'un manifeste n'est relu qu'a la prochaine
//      installation. Sans relais, les seules personnes deja engagees
//      ouvrent leur application sur une page de vente.
//
// Ces deux-la ne cassent pas bruyamment : la page s'affiche, tout a l'air
// normal, et seul l'utilisateur constate que rien ne marche.
//
// CE QU'IL VERIFIE
//
//   1. La vitrine s'affiche, et dit ce qu'est le produit.
//   2. Elle laisse entrer : au moins un chemin vers /app.
//   3. Elle montre le mecanisme - les champs lus et ceux ecartes. C'est la
//      seule chose qui distingue cette page d'une page de vente.
//   4. Le retour de connexion est relaye vers /app, requete ET fragment.
//   5. Une application deja installee est relayee.
//   6. Une adresse ordinaire N'EST PAS relayee : sinon la vitrine
//      n'existerait plus pour personne.
//   7. Aucun debordement lateral, aucune erreur JS, sur telephone comme sur
//      ordinateur.

import { startServer, stopServer, launchBrowser, BASE_URL } from "./lib/harness.mjs";

const ECRANS = [
  { nom: "ordinateur", viewport: { width: 1440, height: 900 } },
  { nom: "telephone", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
];

async function ouvrir(browser, ecran, chemin = "/") {
  const { nom, ...opts } = ecran;
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const erreurs = [];
  page.on("pageerror", (e) => erreurs.push(String(e && e.message || e).split("\n")[0]));
  await page.goto(BASE_URL + chemin, { waitUntil: "networkidle" });
  await page.waitForTimeout(2200);
  return { ctx, page, erreurs };
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    for (const ecran of ECRANS) {
      const { ctx, page, erreurs } = await ouvrir(browser, ecran);
      const vu = await page.evaluate(() => ({
        texte: (document.body.innerText || "").replace(/\s+/g, " "),
        versApp: [...document.querySelectorAll('a[href^="/app"]')].length,
        deborde: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        largeurDoc: document.documentElement.scrollWidth,
        largeurVue: document.documentElement.clientWidth,
        hauteur: document.documentElement.scrollHeight,
      }));

      // --- 1. Elle dit ce que c'est ------------------------------------
      if (!/ATS/i.test(vu.texte)) {
        failures.push(
          `${ecran.nom} : la vitrine ne nomme jamais l'ATS, qui est la raison `
          + `d'etre du produit. Debut : "${vu.texte.slice(0, 90)}"`
        );
      }
      // --- 2. Elle laisse entrer ---------------------------------------
      if (!vu.versApp) {
        failures.push(
          `${ecran.nom} : aucun lien vers /app. La vitrine est une impasse : `
          + "on comprend le produit et on ne peut pas l'ouvrir."
        );
      }
      // --- 3. Elle montre le mecanisme ---------------------------------
      const montreLu = /\bread\b|\blu\b/i.test(vu.texte);
      const montreEcarte = /dropped|ecarte/i.test(vu.texte);
      if (!montreLu || !montreEcarte) {
        failures.push(
          `${ecran.nom} : la page ne montre plus ce que le logiciel de tri lit `
          + "et ce qu'il ecarte. C'est la seule chose qui la distingue d'une "
          + "page de vente, et le seul endroit du produit ou ce mecanisme est visible."
        );
      }
      // --- 7. Rien ne deborde -------------------------------------------
      if (vu.deborde) {
        failures.push(
          `${ecran.nom} : la vitrine defile lateralement (${vu.largeurDoc}px `
          + `pour ${vu.largeurVue}px). Le bandeau defilant est le suspect le plus `
          + "probable : une bande large doit etre coupee par son conteneur."
        );
      }
      if (erreurs.length) {
        failures.push(`${ecran.nom} : erreur JS - ${[...new Set(erreurs)].slice(0, 2).join(" | ")}`);
      }
      await ctx.close();
    }

    // --- 4. Le retour de connexion est relaye --------------------------
    const RETOURS = [
      { nom: "erreur en requete", chemin: "/?error=server_error&error_code=unexpected_failure&error_description=Unable+to+exchange+external+code" },
      { nom: "jetons en fragment", chemin: "/#access_token=abc&refresh_token=def&token_type=bearer" },
      { nom: "code d'echange", chemin: "/?code=4%2F0AVGzR1Dexemple" },
    ];
    for (const r of RETOURS) {
      const { ctx, page } = await ouvrir(browser, ECRANS[0], r.chemin);
      const ou = await page.evaluate(() => location.pathname);
      if (ou !== "/app") {
        failures.push(
          `${r.nom} : le retour de connexion reste sur "${ou}" au lieu d'etre `
          + "relaye vers /app. Se connecter ramene donc le visiteur sur la "
          + "vitrine, deconnecte, sans un mot."
        );
      }
      await ctx.close();
    }

    // --- 5. L'application deja installee est relayee --------------------
    {
      const { ctx, page } = await ouvrir(browser, ECRANS[0], "/?src=homescreen");
      const ou = await page.evaluate(() => location.pathname);
      if (ou !== "/app") {
        failures.push(
          `une application deja posee sur un ecran d'accueil ouvre "${ou}" au lieu `
          + "de /app. Le manifeste n'est relu qu'a la prochaine installation : sans "
          + "ce relais, les seules personnes deja engagees tombent sur une page de vente."
        );
      }
      await ctx.close();
    }

    // --- 6. Une adresse ordinaire n'est PAS relayee ---------------------
    {
      const { ctx, page } = await ouvrir(browser, ECRANS[0], "/?utm_source=linkedin");
      const ou = await page.evaluate(() => location.pathname);
      if (ou !== "/") {
        failures.push(
          `une adresse ordinaire (?utm_source=...) est relayee vers "${ou}". `
          + "La vitrine n'existerait plus pour personne : tout lien de campagne "
          + "sauterait directement dans l'editeur."
        );
      }
      await ctx.close();
    }

    if (!failures.length) {
      console.log(
        "      la vitrine explique et laisse entrer ; connexion, fragment et app "
        + "installee sont relayes, une adresse ordinaire ne l'est pas"
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
