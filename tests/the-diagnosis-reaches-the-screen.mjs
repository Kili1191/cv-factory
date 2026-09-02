// Le diagnostic arrive a l'ecran, et il change avec ce qu'on lui donne.
//
// CE QUE LA LOGIQUE PURE NE PEUT PAS PROUVER
//
// tests/the-diagnosis-names-one-cause.mjs tient le verdict lui-meme, sur des
// entrees fixes et sans navigateur. Il ne dit rien de la chaine : l'entree
// dans la barre, la modale, la consigne envoyee, la forme demandee, la
// lecture de la reponse, l'affichage. Chacun de ces maillons peut lacher
// sans rien casser d'autre, et l'ecran affichera alors toujours la meme
// chose, ou rien.
//
// LE PIEGE PROPRE A CETTE FONCTIONNALITE
//
// Un ecran qui rend "tu vises trop haut" a exactement la meme allure quand
// la bonne reponse etait "ce ne sont pas les bons postes". La sortie est une
// phrase dans les deux cas, et une phrase a toujours l'air d'une reponse.
// Un test qui se contenterait de verifier qu'un verdict s'affiche passerait
// au vert sur un ecran qui repond la meme chose a tout le monde.
//
// On lui donne donc DEUX lectures differentes et on exige DEUX verdicts
// differents. C'est la seule facon de savoir que ce qui s'affiche vient de
// ce qui a ete lu.

import { startServer, stopServer, launchBrowser, seedApp } from "./lib/harness.mjs";

// Une annonce assez longue pour passer le seuil qui evite d'analyser trois
// mots colles par erreur.
const ANNONCE = "Care Assistant wanted for a residential home in Manchester. "
  + "You will support 14 residents with personal care, medication and daily "
  + "records. NVQ Level 3 preferred. Night shifts available. Full training "
  + "given, competitive rates, immediate start for the right candidate.";

// Deux jeux de lectures, choisis pour tomber de part et d'autre du seuil et
// pour se distinguer par le niveau, qui est justement ce que la logique
// examine en premier.
const CAS = [
  {
    nom: "vise au-dessus du dossier",
    attendu: "niveau",
    annonces: [
      { titre: "Care Home Manager", entreprise: "Elmwood", score: 30, niveau: "dessus", manques: ["team leadership"] },
      { titre: "Deputy Manager", entreprise: "Bright Path", score: 25, niveau: "dessus", manques: ["budget"] },
      { titre: "Service Manager", entreprise: "Oakfield", score: 35, niveau: "dessus", manques: ["CQC"] },
    ],
  },
  {
    nom: "bons postes, la meme exigence manque partout",
    attendu: "mots_cles",
    annonces: [
      { titre: "Care Assistant", entreprise: "Elmwood", score: 72, niveau: "niveau", manques: ["medication administration"] },
      { titre: "Care Assistant", entreprise: "Bright Path", score: 68, niveau: "niveau", manques: ["medication administration"] },
      { titre: "Support Worker", entreprise: "Oakfield", score: 75, niveau: "niveau", manques: ["medication administration"] },
    ],
  },
];

async function jouer(browser, cas) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on("pageerror", (e) => erreurs.push(e.message.split("\n")[0].slice(0, 90)));

  let envoye = null;
  await page.route("**/api/claude", (r) => {
    try { envoye = JSON.parse(r.request().postData() || "{}"); } catch { envoye = {}; }
    return r.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ content: [{ type: "text",
        text: JSON.stringify({ annonces: cas.annonces }) }] }),
    });
  });
  await seedApp(page, undefined, { locale: "fr" });

  const out = { erreurs, envoye: null, verdict: null, titre: "", raison: null };
  try {
    const entree = page.locator('[role="button"], button')
      .filter({ hasText: /Pourquoi personne ne repond/i }).first();
    if (await entree.count() === 0) {
      out.raison = "aucune entree \"Pourquoi personne ne repond\" dans la barre laterale";
      await ctx.close();
      return out;
    }
    await entree.click({ timeout: 8000 });
    await page.waitForTimeout(900);

    const champs = page.locator("[data-pq-annonce]");
    const n = await champs.count();
    if (n < 3) {
      out.raison = "l'ecran n'offre que " + n + " champ(s) : on ne peut pas "
        + "coller le minimum de trois annonces";
      await ctx.close();
      return out;
    }
    for (let i = 0; i < 3; i++) {
      await champs.nth(i).fill(ANNONCE + " Reference " + i + ".");
    }
    await page.locator("[data-pq-lancer]").first().click({ timeout: 8000 });
    await page.waitForSelector("[data-pq-verdict]", { timeout: 15000 });

    out.envoye = envoye;
    out.verdict = await page.locator("[data-pq-verdict]").first().getAttribute("data-pq-verdict");
    out.titre = (await page.locator("[data-pq-verdict] h3").first().innerText().catch(() => "")).trim();
  } catch (err) {
    out.raison = (err && err.message ? err.message : String(err)).split("\n")[0];
  }
  await ctx.close();
  return out;
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const vus = [];
    for (const cas of CAS) {
      const r = await jouer(browser, cas);

      if (r.raison) {
        failures.push(cas.nom + " : " + r.raison);
        continue;
      }
      for (const e of r.erreurs) {
        failures.push(cas.nom + " : erreur JavaScript a l'ecran, " + e);
      }

      // LA FORME PART AVEC LA CONSIGNE
      // Sans schema, la reponse redevient du JSON demande en prose, qui cede
      // exactement sur les reponses longues, donc sur les gens qui collent
      // le plus d'annonces.
      const fmt = r.envoye && r.envoye.schema;
      if (!fmt || !fmt.properties || !fmt.properties.annonces) {
        failures.push(cas.nom + " : aucune forme declaree dans l'appel. La "
          + "reponse n'est plus garantie, elle est demandee poliment.");
      }

      if (r.verdict !== cas.attendu) {
        failures.push(cas.nom + " : verdict \"" + r.verdict + "\" au lieu de \""
          + cas.attendu + "\". L'ecran ne reflete pas ce qui a ete lu.");
      }
      if (!r.titre) {
        failures.push(cas.nom + " : le verdict n'affiche aucun titre, donc "
          + "rien que la personne puisse lire.");
      }
      vus.push({ cause: r.verdict, titre: r.titre });
    }

    // DEUX MATIERES DIFFERENTES DOIVENT DONNER DEUX REPONSES DIFFERENTES
    //
    // C'est le seul controle qui distingue un diagnostic d'un texte fixe.
    if (vus.length === 2 && vus[0].cause === vus[1].cause) {
      failures.push(
        "les deux jeux d'annonces donnent le meme verdict (" + vus[0].cause
        + ") : l'ecran repond la meme chose quoi qu'on lui donne.");
    }
    if (vus.length === 2 && vus[0].titre && vus[0].titre === vus[1].titre) {
      failures.push(
        "les deux verdicts affichent le meme titre : ce que la personne lit "
        + "ne depend pas de ce qui a ete lu.");
    }

    if (!failures.length) {
      failures.length = 0;
      console.log("      deux jeux d'annonces, deux verdicts distincts : "
        + vus.map((v) => v.cause).join(" et "));
    }
  } catch (err) {
    failures.push("le test lui-meme a plante : " + (err && err.message));
  } finally {
    await browser.close();
    await stopServer(server);
  }

  return failures;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((f) => {
    for (const l of f) console.log("ECHEC " + l);
    process.exit(f.length ? 1 : 0);
  });
}
