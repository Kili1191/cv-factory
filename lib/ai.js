// TALKING TO THE MODEL, FROM ONE PLACE
//
// Every feature of the product that asks the model something goes through
// aiCall: the import, the rewrite, the match, the letter, the interview
// family, the coach. It carries the retry policy on saturation, the client
// timeout, the observability log and the dash sweep on the answer. It
// lived in the root component with its helpers, invisible to any module
// outside it and handed to panels as a prop. Here it is a module: a panel
// imports it, and a test that needs the real function has one file to
// read.

import { san, sanDeep } from "./cvSchema.js";
import { signaler } from "./incidents.js";
import { serializeCvForContext } from "./cvSerializer.js";

// SURCHARGE N'EST PAS PANNE
//
// Quand l'API est saturee elle repond 429 (trop d'appels) ou 529
// (surchargee). Ce ne sont pas des erreurs de la demande : la meme demande,
// dix secondes plus tard, passe. Avant, Nuvi les remontait comme n'importe
// quelle panne, et quelqu'un qui cliquait "generer" a une heure de pointe
// voyait un produit casse alors qu'il n'y avait qu'a attendre.
//
// Ce qui se retente, et RIEN D'AUTRE :
//   - 429 et 529 : saturation, par definition passagere.
//   - 503 : indisponible, meme raisonnement.
//   - une coupure reseau : le premier paquet n'est jamais parti.
// Ce qui ne se retente pas, et c'est aussi important :
//   - 400, 401, 403 : la demande ou la cle est mauvaise. Retenter ne fait
//     que consommer du quota pour recevoir trois fois la meme reponse, et
//     retarder de plusieurs secondes un message que la personne doit lire.
//   - le delai de 60s cote client : trois tentatives, c'est trois minutes
//     devant un ecran fige. Une seule suffit a dire que c'est trop long.
//   - 500 de notre propre route : c'est notre bug, pas une saturation.
const AI_RETENTABLES = new Set([429, 503, 529]);

// Deux nouvelles tentatives, pas plus. Trois attentes de 30s enchainees
// tiennent quelqu'un devant un ecran pendant une minute et demie pour finir
// par echouer quand meme : mieux vaut rendre la main et le laisser recliquer.
const AI_TENTATIVES = 3;
const AI_ATTENTE_MAX = 20000;

// Le serveur sait parfois quand revenir, et il vaut mieux que nos suppositions.
function attenteConseillee(reponse) {
  try {
    const h = reponse && reponse.headers && reponse.headers.get("retry-after");
    if (!h) return null;
    const secondes = Number(h);
    if (Number.isFinite(secondes) && secondes >= 0) {
      return Math.min(secondes * 1000, AI_ATTENTE_MAX);
    }
    // La forme date est autorisee par la norme et arrive en pratique.
    const quand = Date.parse(h);
    if (Number.isFinite(quand)) {
      return Math.max(0, Math.min(quand - Date.now(), AI_ATTENTE_MAX));
    }
  } catch { /* en-tete illisible : on retombe sur notre propre calcul */ }
  return null;
}

// Progression, plus un peu de hasard. Sans le hasard, tous les onglets
// ouverts au meme moment repartent a la meme seconde et resaturent ce qu'ils
// attendaient - c'est le troupeau qui se reforme.
function attenteAvant(tentative) {
  const base = 1200 * Math.pow(2, tentative - 1);
  return Math.min(base, AI_ATTENTE_MAX) + Math.floor(Math.random() * 400);
}

function dors(ms) {
  return new Promise((resoudre) => setTimeout(resoudre, ms));
}

// Une nouvelle tentative ne doit pas ressembler a un ecran fige. On previent
// l'application, qui le dit ; personne n'ecoute, il ne se passe rien.
function signalerNouvelleTentative(detail) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("nuvi:ai-retry", { detail }));
  } catch { /* un navigateur sans CustomEvent : on retente en silence */ }
}


export async function aiCall(prompt, options = {}) {
  // Options: { cv, max_tokens, task_name, messages }
  // [Migration Opus 5] `temperature` a disparu : les parametres
  // d'echantillonnage sont retires sur cette generation de modeles et
  // provoquent une erreur 400. La route ne le transmet plus ; on cesse aussi
  // de l'envoyer, pour qu'aucun appelant ne croie encore pouvoir le regler.
  // __base : uniquement pour les tests, qui font tourner cette fonction
  // contre un serveur qu'ils controlent afin d'observer les nouvelles
  // tentatives. En production il est absent et l'appel part sur la route
  // relative, comme avant.
  // `schema` : quand l'appelant attend du JSON, il donne sa forme. L'API
  // garantit alors une reponse conforme, au lieu qu'on la demande en prose et
  // qu'on rattrape les cloture de bloc a la main.
  const { cv, max_tokens, task_name = "unknown", messages, schema, __base } = options;
  const url = (__base || "") + "/api/claude";

  // Serialise le CV pour le system block cache (gain ~30% par cache_control Anthropic)
  let cv_context = null;
  if (cv) {
    try {
      cv_context = serializeCvForContext(cv);
    } catch (e) {
      cv_context = null;
    }
  }

  const corps = JSON.stringify({
    prompt,
    messages,
    cv_context,
    max_tokens,
    task_name,
    schema,
  });

  let derniere = null;
  for (let tentative = 1; tentative <= AI_TENTATIVES; tentative++) {
    // Timeout cote client a 60s (legerement plus que le serveur a 55s)
    // pour qu'on lise toujours la reponse du serveur plutot que de couper avant.
    // Un controleur NEUF par tentative : reutiliser celui d'avant repartirait
    // avec un signal deja avorte et la deuxieme tentative echouerait aussitot.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    let r;
    try {
      r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: corps,
        signal: ctrl.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if (err && err.name === "AbortError") {
        throw new Error("Timeout cote client (60s). L'IA met trop longtemps a repondre.");
      }
      // Reseau coupe : la demande n'est jamais partie, donc la retenter ne
      // risque pas de faire deux fois le meme travail cote serveur.
      derniere = new Error("Erreur reseau: " + (err.message || String(err)));
      if (tentative < AI_TENTATIVES) {
        const attente = attenteAvant(tentative);
        signalerNouvelleTentative({ tentative, sur: AI_TENTATIVES, attente, cause: "reseau", task_name });
        await dors(attente);
        continue;
      }
      throw derniere;
    }
    clearTimeout(timer);
    // Si le serveur renvoie une erreur HTTP (504, 500, 401, 429...) on le voit ici
    let d;
    try {
      d = await r.json();
    } catch {
      throw new Error("Reponse serveur invalide (HTTP " + r.status + "). Probablement un timeout Vercel.");
    }

    // Logging observabilite (gain via detection des doublons et erreurs)
    if (d && d._cvf_meta && typeof window !== "undefined") {
      try {
        const log = JSON.parse(window.localStorage.getItem("cvf_api_log") || "[]");
        log.push({ ts: Date.now(), ...d._cvf_meta });
        window.localStorage.setItem("cvf_api_log", JSON.stringify(log.slice(-500)));
      } catch (e) {}
    }

    if (!r.ok || (d && d.error)) {
      const m = (d && d.error && d.error.message) || ("Erreur HTTP " + r.status);
      derniere = new Error(m);
      const saturation = AI_RETENTABLES.has(r.status)
        || (d && d.error && d.error.type === "overloaded_error");
      if (saturation && tentative < AI_TENTATIVES) {
        const attente = attenteConseillee(r) ?? attenteAvant(tentative);
        signalerNouvelleTentative({ tentative, sur: AI_TENTATIVES, attente, cause: r.status, task_name });
        await dors(attente);
        continue;
      }
      throw derniere;
    }
    return san((d.content||[]).map(b=>b.text||"").join(""));
  }
  // Inatteignable : la boucle rend ou leve a chaque tour. La ligne existe
  // pour que le jour ou quelqu'un touche aux conditions, l'echec soit une
  // exception claire et pas un `undefined` qui traverse tout l'appelant.
  signaler("ia_echec", (derniere && derniere.message) || "no answer", { tache: String((options && options.task_name) || "") });
  throw derniere || new Error("L'IA n'a pas repondu.");
}

// L'EXPOSITION EST POUR LE TEST, ET ELLE NE DONNE RIEN A PERSONNE
//
// Le test des nouvelles tentatives doit faire tourner CETTE fonction, pas
// une copie : une copie prouverait que la copie marche. la fonction vit
// maintenant dans lib/ai.js et s'exporte, mais le test tourne dans le
// navigateur, ou seule la fenetre est atteignable, d'ou ce point d'accroche.
//
// Il n'ouvre aucune porte : la cle de l'API vit cote serveur, et n'importe
// quel script de la page pouvait deja appeler fetch("/api/claude"). On
// n'expose donc pas un pouvoir, on nomme un chemin.
if (typeof window !== "undefined") {
  window.__nuviAiCall = aiCall;
}

export function parseJSON(txt) {
  const clean = txt.split("```json").join("").split("```").join("").trim();
  const parsed = JSON.parse(clean);
  return sanDeep(parsed);
}
