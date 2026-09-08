// The model follows the task, and the cost follows the model.
//
// The price of the plan was set against a cost per application, and that
// cost rests on one rule: the first pass is written by Sonnet 5, the
// measured second pass and the readings of a person's own history by
// Opus 5. If the rule drifts, the margin drifts with it and nothing on
// screen shows it. So the rule is asserted here, task by task, and the
// cost formula against a hand-computed call.

import { readFile } from "node:fs/promises";
import { modelePour, coutEnDollars, PRIX_PAR_MILLION } from "../lib/modeles.js";

export async function run() {
  const failures = [];
  const attendu = {
    "match": "claude-sonnet-5",
    "cv-from-offer": "claude-sonnet-5",
    "generate-cv": "claude-sonnet-5",
    "application-pack-ecrits": "claude-sonnet-5",
    "interview-prep": "claude-sonnet-5",
    "coach_chat": "claude-sonnet-5",
    "": "claude-sonnet-5",
    "cv-from-offer-reprise": "claude-opus-5",
    "generate-cv-reprise": "claude-opus-5",
    "import-cv": "claude-opus-5",
    "read_cv_image": "claude-opus-5",
    "linkedin": "claude-opus-5",
  };
  for (const [tache, modele] of Object.entries(attendu)) {
    const vu = modelePour(tache);
    if (vu !== modele) failures.push("task \"" + tache + "\" goes to " + vu + " instead of " + modele);
  }
  if (modelePour(undefined) !== "claude-sonnet-5") failures.push("a call without a task name does not take the first-pass model");

  // A fit on Opus: 1 500 uncached in, 3 000 read from cache, 5 500 out.
  // 1500*5 + 3000*0.5 + 5500*25 = 7 500 + 1 500 + 137 500 = 146 500 / 1e6.
  const opus = coutEnDollars("claude-opus-5", { input_tokens: 1500, cache_read_input_tokens: 3000, output_tokens: 5500 });
  if (opus !== 0.1465) failures.push("the Opus fit costs " + opus + " instead of 0.1465");
  const sonnet = coutEnDollars("claude-sonnet-5", { input_tokens: 1500, cache_read_input_tokens: 3000, output_tokens: 5500 });
  if (sonnet !== 0.0586) failures.push("the Sonnet fit costs " + sonnet + " instead of 0.0586");
  if (coutEnDollars("claude-unknown", { input_tokens: 1 }) !== null) failures.push("an unknown model is priced instead of returning null");
  for (const m of Object.keys(PRIX_PAR_MILLION)) {
    const p = PRIX_PAR_MILLION[m];
    if (!(p.cacheLu < p.entree && p.entree < p.cacheEcrit && p.cacheEcrit < p.sortie)) {
      failures.push("the price table for " + m + " is not in the order the API bills (cache read < input < cache write < output)");
    }
  }

  // The route must use the rule, not a constant of its own.
  const route = await readFile(new URL("../app/api/claude/route.js", import.meta.url), "utf8");
  if (!/modelePour\(taskName\)/.test(route)) failures.push("app/api/claude/route.js does not choose its model with modelePour(taskName)");
  if (/model:\s*"claude-/.test(route)) failures.push("app/api/claude/route.js still names a model of its own");
  if (!/\[usage\]/.test(route)) failures.push("the route no longer logs a [usage] line with the cost per call");

  if (!failures.length) {
    console.log("      12 tasks go to the model the price was set against, and a fit is priced to the cent");
  }
  return failures;
}
