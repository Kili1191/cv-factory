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

    // --- 7. La phrase du visiteur passe sous la meme ligne -------------
    //
    // C'est la seule chose de la page qui ne soit pas une affirmation. Si le
    // champ n'existe plus, ou s'il n'a plus d'effet, il ne reste qu'une
    // demonstration ecrite d'avance - c'est-a-dire une publicite.
    for (const ecran of ECRANS) {
      const { ctx, page, erreurs } = await ouvrir(browser, ecran);
      const champ = page.locator('input[type="text"]').first();
      if (!(await champ.count())) {
        failures.push(
          `${ecran.nom} : aucun champ pour faire lire sa propre phrase. La `
          + "page redevient une demonstration ecrite d'avance, que le visiteur "
          + "regarde sans jamais s'y reconnaitre."
        );
        await ctx.close();
        continue;
      }

      const avant = await page.evaluate(() => document.body.innerText);
      // Une phrase dont on connait le verdict : "Tesco" et "van" sont
      // classables, "reliable" ne l'est pas.
      await champ.fill("Very reliable driver, 40 deliveries a day for Tesco");
      await page.waitForTimeout(1400);
      const apres = await page.evaluate(() => document.body.innerText);

      if (apres === avant) {
        failures.push(
          `${ecran.nom} : taper sa propre phrase ne change rien a l'ecran. Le `
          + "champ promet une lecture et ne la fait pas."
        );
      }
      // Ses mots doivent etre a l'ecran, et le verdict doit porter sur EUX.
      for (const attendu of ["Tesco", "deliveries"]) {
        if (!apres.includes(attendu)) {
          failures.push(
            `${ecran.nom} : "${attendu}" a ete tape et n'apparait pas dans la `
            + "phrase analysee. Ce n'est pas la phrase du visiteur qui est lue."
          );
        }
      }
      if (!/\b40\b/.test(apres)) {
        failures.push(
          `${ecran.nom} : le chiffre "40" n'est pas retenu. Un logiciel de tri `
          + "range les chiffres avant tout le reste, et c'est exactement ce que "
          + "le produit demande aux candidats d'ecrire."
        );
      }
      if (erreurs.length) {
        failures.push(
          `${ecran.nom} : erreur JS pendant la lecture de la phrase du `
          + `visiteur - ${[...new Set(erreurs)].slice(0, 2).join(" | ")}`
        );
      }
      await ctx.close();
    }

    if (!failures.length) {
      console.log(
        "      la vitrine explique, laisse entrer et lit la phrase du visiteur ; "
        + "connexion, fragment et app installee sont relayes, une adresse "
        + "ordinaire ne l'est pas"
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
