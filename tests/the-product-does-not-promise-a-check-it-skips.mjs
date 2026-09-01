// The product must not claim a verification it never runs.
//
// WHAT WAS ON SCREEN
//
// The diagnostic panel said, under the machine score: "Downloading re-checks
// it against three real parsers." It does not. lib/atsFidelity.js, which
// performs that comparison, is imported by exactly two files and both are
// tests. The three parsers run in CI, never on the person's machine.
// Downloading re-checks nothing.
//
// WHY THIS ONE MATTERS MORE THAN AN ORDINARY WRONG SENTENCE
//
// The owner of the product read that line, took the export to be verified,
// and later found out nothing had verified it. A promise of verification is
// the worst sentence to get wrong: it stops the doubt instead of informing
// it. The person stops checking precisely because they were told a check
// happened. When it turns out to be hollow, it takes the credibility of
// everything else with it, including the parts that are true.
//
// WHAT THIS TEST HOLDS
//
// Either the claim is backed by code that actually runs in the app, or the
// claim is not made. The rule is deliberately narrow: it only fires on
// sentences promising that the PRODUCT performs a parser check, and it
// checks one thing, whether the module that would perform it is reachable
// from the app at all. A test that tried to judge marketing language in
// general would accuse honest copy, which this repo has been bitten by
// before.

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

// Les tournures qui promettent que le PRODUIT verifie, pas qu'il estime.
const PROMESSES = [
  /re-?checks? it against .{0,20}parsers/i,
  /verifie avec .{0,20}analyseurs/i,
  /re-?read .{0,20}by .{0,20}real parsers/i,
  /relu par .{0,20}vrais analyseurs/i,
];

// UN TEST QUI LIT LES COMMENTAIRES ACCUSE LE CODE QUI S'EXPLIQUE
//
// La premiere version a echoue sur le commentaire qui cite la phrase
// retiree pour dire pourquoi elle l'a ete. Punir la trace d'une correction
// pousse a l'effacer, ce qui est l'inverse du but. Meme correction que dans
// tests/nuvi-does-not-fill-in-your-figure.mjs : on ne retire que les lignes
// qui COMMENCENT par //, pour ne pas amputer une chaine contenant "https://".
function sansCommentaires(src) {
  return src.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
}

async function fichiersDe(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const chemin = join(dir, e.name);
    if (e.isDirectory()) await fichiersDe(chemin, out);
    else if (/\.(js|jsx|mjs)$/.test(e.name)) out.push(chemin);
  }
  return out;
}

export async function run() {
  const failures = [];
  const racine = new URL("..", import.meta.url).pathname;

  const fichiersApp = (await fichiersDe(join(racine, "app")))
    .concat(await fichiersDe(join(racine, "lib")));

  // 1. Le module qui compare aux analyseurs est-il atteignable depuis l'app ?
  let atteignable = false;
  for (const f of fichiersApp) {
    if (f.endsWith("atsFidelity.js")) continue;
    const src = await readFile(f, "utf8");
    if (/from\s+["'].*atsFidelity/.test(src) || /require\(["'].*atsFidelity/.test(src)) {
      atteignable = true;
      break;
    }
  }

  // 2. Une promesse de verification est-elle affichee ?
  const promesses = [];
  for (const f of fichiersApp.concat(
    (await fichiersDe(join(racine, "app", "i18n"))))) {
    const src = sansCommentaires(await readFile(f, "utf8"));
    for (const r of PROMESSES) {
      if (r.test(src)) promesses.push(f.replace(racine, "") + " : " + r.source);
    }
  }

  if (promesses.length && !atteignable) {
    failures.push(
      "le produit promet une verification qu'il ne fait pas : "
      + promesses.join(", ") + ". lib/atsFidelity.js n'est importe par aucun "
      + "fichier de app/ ni de lib/, donc les analyseurs ne tournent qu'en "
      + "integration continue. Une promesse de verification arrete le doute "
      + "au lieu de l'informer : la personne cesse de verifier parce qu'on "
      + "lui a dit qu'un controle avait eu lieu. Soit le controle tourne "
      + "vraiment dans l'application, soit la phrase ne s'ecrit pas."
    );
  }

  if (!failures.length) {
    console.log(
      atteignable
        ? "      la verification par analyseurs tourne dans l'application, la promesse est tenue"
        : "      aucune promesse de verification par analyseurs n'est affichee, et c'est coherent : le controle ne tourne qu'en CI"
    );
  }
  return failures;
}
