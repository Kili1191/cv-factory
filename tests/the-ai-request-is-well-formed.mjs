// La requete envoyee a Anthropic doit rester valide pour le modele choisi.
//
// POURQUOI CE TEST EXISTE
//
// L'application appelait claude-sonnet-4-6 et envoyait un parametre
// `temperature`. Les parametres d'echantillonnage ont ete retires sur la
// generation actuelle : les envoyer renvoie une erreur 400. Autrement dit, un
// simple changement du nom de modele aurait casse TOUS les appels IA d'un
// coup - generation de CV, lettre de motivation, entretien, traduction - sans
// qu'aucun test existant ne s'en apercoive, puisque tous stubbent l'IA.
//
// Ce test n'appelle pas Anthropic. Il appelle la route avec `fetch` remplace,
// et inspecte ce qu'elle AURAIT envoye. Il tourne donc sans cle API, en
// integration continue comme sur un poste de developpement.

import { readFileSync } from "node:fs";

// Parametres refuses par la generation actuelle (400). La liste vient de la
// documentation de migration, pas d'une supposition.
const REJECTED = ["temperature", "top_p", "top_k", "budget_tokens"];

// Modeles courants. Un modele hors de cette liste doit faire echouer le test :
// c'est le signal qu'il faut relire les notes de migration avant de livrer.
const CURRENT_MODELS = [
  "claude-opus-5", "claude-fable-5", "claude-sonnet-5",
  "claude-opus-4-8", "claude-opus-4-7", "claude-opus-4-6",
  "claude-sonnet-4-6", "claude-haiku-4-5",
];

// Modeles sur lesquels le raisonnement est actif et les parametres
// d'echantillonnage sont refuses.
const NO_SAMPLING = ["claude-opus-5", "claude-fable-5", "claude-sonnet-5",
  "claude-opus-4-8", "claude-opus-4-7"];

export async function run() {
  const failures = [];

  // La route lit la cle dans l'environnement ; on en pose une fausse, aucune
  // requete reelle ne partira.
  const hadKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "sk-ant-test-not-used";

  const realFetch = globalThis.fetch;
  let sent = null;
  globalThis.fetch = async (url, init) => {
    sent = { url: String(url), body: JSON.parse(init.body), headers: init.headers };
    return {
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: "text", text: "{}" }], usage: {} }),
    };
  };

  try {
    const mod = await import("../app/api/claude/route.js");
    const res = await mod.POST(new Request("http://localhost/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Test", task_name: "test", cv_context: "Jane Doe" }),
    }));

    if (!sent) {
      failures.push(`la route n'a envoye aucune requete (statut ${res.status})`);
    } else {
      for (const key of REJECTED) {
        if (key in sent.body) {
          failures.push(
            `la requete contient "${key}", refuse par la generation actuelle avec une `
            + `erreur 400. Tous les appels IA echoueraient.`
          );
        }
      }

      const model = sent.body.model;
      if (!CURRENT_MODELS.includes(model)) {
        failures.push(
          `modele "${model}" inconnu de la liste des modeles courants. Verifier les `
          + `notes de migration avant de livrer.`
        );
      }
      if (NO_SAMPLING.includes(model)) {
        const sampling = REJECTED.filter(k => k in sent.body);
        if (sampling.length) {
          failures.push(`"${model}" refuse : ${sampling.join(", ")}`);
        }
      }

      // Le raisonnement consomme des jetons comptes dans max_tokens : un
      // plafond trop bas coupe la reponse en plein JSON.
      if (typeof sent.body.max_tokens !== "number" || sent.body.max_tokens < 8000) {
        failures.push(
          `max_tokens vaut ${sent.body.max_tokens}. Le raisonnement etant compte dedans, `
          + `un budget aussi court risque de tronquer le JSON du CV.`
        );
      }

      if (!Array.isArray(sent.body.messages) || sent.body.messages.length === 0) {
        failures.push("la requete ne porte aucun message");
      }
      if (!sent.headers || !sent.headers["anthropic-version"]) {
        failures.push("en-tete anthropic-version absent");
      }
    }

    // Le plafond de duree de la fonction doit rester coherent avec un modele
    // qui raisonne.
    const source = readFileSync(new URL("../app/api/claude/route.js", import.meta.url), "utf8");
    const m = source.match(/maxDuration\s*=\s*(\d+)/);
    if (!m) failures.push("maxDuration absent de la route");
    else if (Number(m[1]) < 30) {
      failures.push(`maxDuration vaut ${m[1]}s, trop court pour un modele qui raisonne`);
    }

    if (!failures.length) {
      console.log(
        `      modele ${sent.body.model}, effort ${sent.body.output_config?.effort || "defaut"}, `
        + `max_tokens ${sent.body.max_tokens}, aucun parametre refuse`
      );
    }
  } catch (err) {
    failures.push(`la route a leve une exception : ${err.message.split("\n")[0]}`);
  } finally {
    globalThis.fetch = realFetch;
    if (hadKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = hadKey;
  }

  return failures;
}
