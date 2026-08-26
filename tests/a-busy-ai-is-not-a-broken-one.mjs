// Une IA saturee n'est pas une IA en panne.
//
// POURQUOI CE TEST EXISTE
//
// Quand l'API est saturee elle repond 429 ou 529. Ce ne sont pas des
// erreurs de la demande : la meme demande, dix secondes plus tard, passe.
// Avant, Nuvi les remontait comme n'importe quelle panne. Quelqu'un qui
// cliquait "generer" a une heure de pointe voyait un produit casse alors
// qu'il n'y avait qu'a attendre, et souvent recliquait - ce qui lancait un
// deuxieme appel et aggravait la saturation qu'il attendait.
//
// Mais retenter est une arme a double tranchant, et les trois facons de se
// tromper coutent toutes quelque chose de reel :
//
//   - retenter une vraie erreur (400 mauvaise demande, 401 mauvaise cle) :
//     on consomme du quota pour recevoir trois fois la meme reponse, et on
//     retarde de plusieurs secondes un message que la personne doit lire.
//   - retenter sans fin : l'ecran ne rend jamais la main.
//   - retenter sans le dire : indistinguable d'un ecran fige.
//
// CE QU'IL VERIFIE
//
// On fait tourner le VRAI aiCall du produit contre un serveur que ce test
// controle, et on regarde ce qui arrive au serveur. Pas de lecture de
// source : ce qui compte ici est le comportement, et une regle ecrite dans
// un commentaire ne prouve rien sur ce que le code fait.
//
//   1. 529 puis 200 : la personne recoit sa reponse, sans rien savoir.
//   2. 429 avec Retry-After : l'attente annoncee par le serveur est suivie.
//   3. 400 : UN SEUL appel. Une mauvaise demande ne se retente pas.
//   4. 401 : UN SEUL appel. Une mauvaise cle ne se retente pas.
//   5. 529 sans fin : ca s'arrete, et l'erreur remonte.
//   6. Chaque nouvelle tentative previent l'application.

import { createServer } from "node:http";
import { startServer, stopServer, launchBrowser, BASE_URL } from "./lib/harness.mjs";

// Le faux serveur d'API. Chaque scenario lui donne la suite de reponses a
// servir, et il note ce qu'il a recu.
function fauxServeur(reponses) {
  const recu = [];
  const srv = createServer((req, res) => {
    const i = recu.length;
    recu.push({ url: req.url, quand: Date.now() });
    const r = reponses[Math.min(i, reponses.length - 1)];
    // Le navigateur appelle ce serveur depuis une autre origine que la page.
    // Sans ces en-tetes, chaque appel echoue en "Erreur reseau" - que aiCall
    // retente, ce qui ferait passer le test sur la mauvaise raison.
    const entetes = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Expose-Headers": "Retry-After",
    };
    if (req.method === "OPTIONS") {
      recu.pop();
      res.writeHead(204, entetes);
      res.end();
      return;
    }
    if (r.retryAfter != null) entetes["Retry-After"] = String(r.retryAfter);
    res.writeHead(r.status, entetes);
    res.end(JSON.stringify(r.corps));
  });
  return new Promise((ok) => {
    srv.listen(0, "127.0.0.1", () => ok({ srv, recu, port: srv.address().port }));
  });
}

const OK = { status: 200, corps: { content: [{ text: "PARFAIT" }] } };
const SATURE = { status: 529, corps: { error: { type: "overloaded_error", message: "Overloaded" } } };
const MAUVAISE_DEMANDE = { status: 400, corps: { error: { type: "invalid_request_error", message: "Bad request" } } };
const MAUVAISE_CLE = { status: 401, corps: { error: { type: "authentication_error", message: "Invalid API key" } } };

// On detourne /api/claude vers le faux serveur, puis on appelle le vrai
// aiCall de la page. Il n'est pas exporte - c'est un module client de 9000
// lignes - donc on passe par le bouton qui l'utilise ? Non : ce serait
// tester le bouton. On rejoue la fonction dans la page, chargee depuis le
// bundle servi, en la retrouvant par le seul chemin qui la rend
// accessible : window.__nuviAiCall, expose exclusivement pour ce test.
async function appeler(page, port) {
  return page.evaluate(async (p) => {
    const dit = [];
    const ecoute = (e) => dit.push(e.detail);
    window.addEventListener("nuvi:ai-retry", ecoute);
    const t0 = Date.now();
    let valeur = null, erreur = null;
    try {
      valeur = await window.__nuviAiCall("bonjour", { task_name: "test", __base: `http://127.0.0.1:${p}` });
    } catch (err) {
      erreur = err.message;
    }
    window.removeEventListener("nuvi:ai-retry", ecoute);
    return { valeur, erreur, duree: Date.now() - t0, dit };
  }, port);
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();
  const aFermer = [];

  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const expose = await page.evaluate(() => typeof window.__nuviAiCall === "function");
    if (!expose) {
      failures.push(
        "window.__nuviAiCall n'existe pas : ce test ne peut pas atteindre la "
        + "fonction du produit et ne prouve donc RIEN. Soit l'exposition a ete "
        + "retiree de app/page.jsx, soit elle n'a jamais ete branchee."
      );
      await ctx.close();
      return failures;
    }

    // --- 1. Saturation puis reponse -----------------------------------
    {
      const f = await fauxServeur([SATURE, OK]);
      aFermer.push(f.srv);
      const r = await appeler(page, f.port);
      if (r.valeur !== "PARFAIT") {
        failures.push(
          `une saturation passagere (529) fait echouer l'appel au lieu d'etre `
          + `retentee. Recu : ${JSON.stringify(r.erreur || r.valeur)}. La personne `
          + "voit un produit casse alors qu'il n'y avait qu'a attendre."
        );
      }
      if (f.recu.length !== 2) {
        failures.push(`529 puis 200 : ${f.recu.length} appel(s) au serveur, 2 attendus`);
      }
      if (!r.dit.length) {
        failures.push(
          "la nouvelle tentative ne previent pas l'application. L'attente est "
          + "alors indistinguable d'un ecran fige, et la personne reclique - ce "
          + "qui lance un deuxieme appel et aggrave la saturation."
        );
      }
    }

    // --- 2. Retry-After est suivi -------------------------------------
    //
    // Le serveur sait parfois quand revenir. Ignorer l'en-tete, c'est
    // revenir trop tot et se refaire refuser.
    {
      const f = await fauxServeur([{ ...SATURE, status: 429, retryAfter: 2 }, OK]);
      aFermer.push(f.srv);
      const r = await appeler(page, f.port);
      if (r.valeur !== "PARFAIT") {
        failures.push(`429 avec Retry-After : l'appel a echoue (${r.erreur})`);
      } else if (f.recu.length === 2) {
        const ecart = f.recu[1].quand - f.recu[0].quand;
        // 2s demandees. On accepte large : la machine de test est chargee.
        if (ecart < 1700) {
          failures.push(
            `le serveur demandait 2s avant de revenir, Nuvi est revenu apres `
            + `${ecart}ms. Il se refera refuser, et l'en-tete Retry-After ne sert a rien.`
          );
        }
      }
    }

    // --- 3 et 4. Une vraie erreur ne se retente pas --------------------
    for (const [nom, reponse] of [["400 mauvaise demande", MAUVAISE_DEMANDE], ["401 mauvaise cle", MAUVAISE_CLE]]) {
      const f = await fauxServeur([reponse, reponse, reponse]);
      aFermer.push(f.srv);
      const r = await appeler(page, f.port);
      if (!r.erreur) {
        failures.push(`${nom} : aucune erreur remontee, l'appel a l'air d'avoir reussi`);
      }
      if (f.recu.length !== 1) {
        failures.push(
          `${nom} : ${f.recu.length} appels au serveur au lieu d'un seul. `
          + "Retenter une vraie erreur consomme du quota pour recevoir trois "
          + "fois la meme reponse, et retarde le message que la personne doit lire."
        );
      }
    }

    // --- 5. Ca s'arrete ------------------------------------------------
    {
      const f = await fauxServeur([SATURE]);
      aFermer.push(f.srv);
      const r = await appeler(page, f.port);
      if (!r.erreur) {
        failures.push("une saturation permanente ne remonte aucune erreur");
      }
      if (f.recu.length > 3) {
        failures.push(
          `saturation permanente : ${f.recu.length} appels. La boucle ne s'arrete `
          + "pas et l'ecran ne rend jamais la main."
        );
      }
      if (f.recu.length < 2) {
        failures.push(
          `saturation permanente : ${f.recu.length} appel(s), donc aucune nouvelle `
          + "tentative n'a eu lieu."
        );
      }
    }

    await ctx.close();
    if (!failures.length) {
      console.log(
        "      saturation retentee et annoncee, Retry-After suivi, "
        + "400 et 401 jamais retentes, la boucle s'arrete"
      );
    }
  } catch (err) {
    failures.push(`le test a plante : ${err && err.message}`);
  } finally {
    for (const srv of aFermer) { try { srv.close(); } catch { /* deja ferme */ } }
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
