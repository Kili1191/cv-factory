// Le pack de candidature tient sous le plafond du serveur.
//
// LE DEFAUT, TEL QUE LA PERSONNE LE VIT
//
// Elle colle son annonce, le panneau annonce qu'il ecrit sa candidature, elle
// attend une minute pleine devant l'ecran, et recoit une erreur. Sur la
// fonctionnalite qui promet le plus : lettre, email, message LinkedIn, pitch,
// reponses STAR, relance, objections, questions, negociation.
//
// LA CAUSE, QUI N'EST PAS REGLABLE
//
//   export const maxDuration = 60;    // app/api/claude/route.js
//
// Ce n'est pas un reglage timide qu'on remonte, c'est le plafond de la
// fonction serverless. Le pack demandait ses neuf pieces en un appel, environ
// mille sept cents mots, et n'y arrivait pas. Remonter le delai du client ne
// change rien : c'est le serveur qui meurt, pas la patience du navigateur.
// C'est le piege du defaut - la seule correction visible depuis le client est
// exactement celle qui ne peut pas marcher.
//
// CE QUE CE TEST MESURE
//
// Que le travail est decoupe, et que les morceaux partent ENSEMBLE. Trois
// appels a la suite tiendraient chacun sous le plafond et feraient attendre
// trois fois plus longtemps ; en parallele, l'attente est celle du plus lent.
//
// Et qu'un morceau qui tombe n'emporte pas les autres : la lettre est ecrite
// et payee, elle doit s'afficher meme si la partie entretien a lache.

import { startServer, stopServer, launchBrowser, seedApp } from "./lib/harness.mjs";

const OFFER = "Head of Product, roadmap produit, management d'une equipe de "
  + "six personnes, croissance B2B SaaS, poste base a Paris.";

// Ce que chaque appel rend, par nom de tache. Chaque morceau ne connait que
// ses propres pieces : c'est ce decoupage-la qu'on verifie.
const PIECES = {
  "application-pack-ecrits": {
    cover_letter: "Madame, Monsieur,\n\nVotre annonce a retenu mon attention.",
    linkedin_message: "Bonjour, je viens de postuler.",
    application_email: { subject: "Candidature", body: "Madame, Monsieur, ..." },
    follow_up: { subject: "Suite a ma candidature", body: "Bonjour, ..." },
  },
  "application-pack-entretien": {
    interview_pitch: "Huit ans en produit SaaS B2B.",
    star_answers: [{ question: "Un projet difficile ?", situation: "s",
                     task: "t", action: "a", result: "r" }],
  },
  "application-pack-defense": {
    objections: [{ doubt: "Pas de management d'equipe de six", answer: "j'en ai mene quatre" }],
    questions_to_ask: ["Comment mesurez-vous le succes a six mois ?"],
    negotiation: { range: "55 a 65k", argument: "marche parisien", levers: ["teletravail"] },
  },
};

const ANALYSE = {
  match_score: 82, job_title: "Head of Product", company: "OfferCo",
  points_forts: ["a"], points_faibles: ["b"], mots_cles: ["roadmap"],
  cv_optimized: {
    name: "Jane Doe", title: "Head of Product", email: "j@d.com", phone: "06",
    location: "Paris", linkedin: "", summary: "s",
    experience: [], education: [], skills: [], languages: [], certifications: [],
  },
};

// On ouvre le pack par le menu, le chemin qui ne depend d'aucune analyse
// prealable.
async function ouvrirLePack(page) {
  await page.locator('[role="button"]:has-text("Pack candidature"), button:has-text("Pack candidature")')
    .first().click({ timeout: 10000 });
  await page.waitForTimeout(700);
  const champ = page.locator("textarea").first();
  await champ.fill(OFFER);
  await page.locator('button:has-text("Generer"), button:has-text("Generate")')
    .first().click({ timeout: 10000 });
}

// `tombe` : le nom de tache qu'on fait echouer, ou null pour aucun.
async function jouer(browser, tombe) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on("pageerror", (e) => erreurs.push(e.message.split("\n")[0].slice(0, 90)));

  // On note quand chaque appel PART et quand il repond. Deux appels qui se
  // chevauchent dans le temps sont paralleles ; sinon ils sont en file.
  const vus = [];
  await page.route("**/api/claude", async (r) => {
    let corps = {};
    try { corps = JSON.parse(r.request().postData() || "{}"); } catch { corps = {}; }
    const nom = corps.task_name || "?";
    const trace = { nom, debut: Date.now(), fin: 0, prompt: String(corps.prompt || "") };
    vus.push(trace);

    // Un delai reel : sans lui, tout se resout en une milliseconde et un
    // enchainement sequentiel ressemblerait a du parallele.
    await new Promise((ok) => setTimeout(ok, 700));
    trace.fin = Date.now();

    if (nom === tombe) {
      return r.fulfill({ status: 500, contentType: "application/json",
        body: JSON.stringify({ error: "boom" }) });
    }
    const charge = PIECES[nom] || ANALYSE;
    return r.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ content: [{ type: "text", text: JSON.stringify(charge) }] }),
    });
  });

  await seedApp(page, undefined, { locale: "fr" });
  const out = { vus, erreurs, texte: "", raison: null };
  try {
    await ouvrirLePack(page);
    // Assez pour laisser les trois appels aboutir, leurs reprises comprises.
    await page.waitForTimeout(9000);
    out.texte = await page.locator("body").innerText();
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
    // === TOUT VA BIEN : LE TRAVAIL EST DECOUPE ET PARALLELE ===
    const ok = await jouer(browser, null);
    if (ok.raison) {
      failures.push("le pack ne s'ouvre pas : " + ok.raison);
    } else {
      const duPack = ok.vus.filter((v) => v.nom.startsWith("application-pack"));

      if (duPack.length < 2) {
        failures.push("le pack part en " + duPack.length + " appel(s). Il "
          + "demande environ mille sept cents mots, et la route coupe a 60 "
          + "secondes : en un seul appel, il n'arrive pas. Ce n'est pas un "
          + "delai a remonter, c'est le plafond de la fonction serverless.");
      }

      // Le chevauchement, pas l'ordre : deux appels qui commencent avant que
      // le premier ait repondu sont bien partis ensemble.
      const enFile = duPack.length > 1 && duPack.every((v, i) =>
        i === 0 || v.debut >= (duPack[i - 1].fin || 0));
      if (enFile) {
        failures.push("les " + duPack.length + " appels du pack se suivent au "
          + "lieu de partir ensemble : la personne attend la somme des trois "
          + "au lieu du plus lent, ce qui defait la moitie du gain.");
      }

      // Aucun morceau ne redemande tout : sinon la decoupe est cosmetique.
      for (const v of duPack) {
        const p = v.prompt.toLowerCase();
        const lourds = ["star", "lettre", "negociation"].filter((m) => p.includes(m));
        if (lourds.length === 3) {
          failures.push("l'appel \"" + v.nom + "\" redemande la lettre, les "
            + "reponses STAR et la negociation : la decoupe ne reduit rien.");
        }
      }
    }
    for (const e of ok.erreurs) failures.push("erreur JavaScript a l'ecran : " + e);

    // === UN MORCEAU TOMBE : LE RESTE S'AFFICHE QUAND MEME ===
    //
    // C'est ce qui separe une decoupe utile d'une decoupe qui a seulement
    // divise le risque par trois. La lettre a ete ecrite et payee.
    const casse = await jouer(browser, "application-pack-entretien");
    if (casse.raison) {
      failures.push("avec un morceau en echec, le pack ne s'ouvre plus : " + casse.raison);
    } else if (!/Madame, Monsieur/i.test(casse.texte)) {
      failures.push("la partie entretien echoue et la lettre disparait avec "
        + "elle. Elle etait ecrite : la personne doit la recevoir.");
    }
    for (const e of casse.erreurs) {
      failures.push("erreur JavaScript quand un morceau echoue : " + e);
    }

    if (!failures.length) {
      const n = ok.vus.filter((v) => v.nom.startsWith("application-pack")).length;
      console.log("      le pack part en " + n + " appels paralleles, et un "
        + "morceau perdu n'emporte pas les autres");
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
