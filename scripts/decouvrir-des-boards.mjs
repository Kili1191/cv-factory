// TROUVER LES TABLEAUX D'OFFRES, UN NOM A LA FOIS
//
//   node scripts/decouvrir-des-boards.mjs mes-candidats.txt
//   node scripts/decouvrir-des-boards.mjs mes-candidats.txt --ecrire
//
// Un nom par ligne, tel qu'une entreprise l'ecrirait dans une adresse :
// "monzo", "gocardless", "signal-ai". Chacun est essaye contre les six ATS,
// et seul ce qui repond avec au moins un poste est garde.
//
// POURQUOI UN SCRIPT ET PAS UNE LISTE ECRITE A LA MAIN
//
// Parce que la liste est le produit. Lire un tableau d'offres est trivial,
// savoir qu'il existe ne l'est pas, et c'est la seule part de cette
// fonctionnalite qui coute du temps a un concurrent. Un outil qui la fait
// grandir vaut mieux qu'une liste qu'on recopie.
//
// Rien n'est devine : une ligne ecrite est une ligne qui a repondu. Le taux
// de reussite observe sur des noms plausibles est d'environ quarante pour
// cent, donc il faut proposer large.

import { readFileSync, writeFileSync } from "node:fs";
import { ATS, NOMS_ATS } from "../lib/ats.js";
import { BOARDS } from "../lib/boards.js";

const fichier = process.argv[2];
const ecrire = process.argv.includes("--ecrire");
if (!fichier) {
  console.error("usage: node scripts/decouvrir-des-boards.mjs <fichier> [--ecrire]");
  process.exit(2);
}

const candidats = readFileSync(fichier, "utf8")
  .split("\n").map((l) => l.trim().toLowerCase())
  .filter((l) => l && !l.startsWith("#"));

const connus = new Set(BOARDS.map((b) => b.slug));
const aEssayer = candidats.filter((c) => !connus.has(c));
console.log(aEssayer.length + " noms a essayer (" + (candidats.length - aEssayer.length) + " deja connus)");

async function compter(slug, nom) {
  try {
    const r = await fetch(ATS[nom].url(slug), {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; Nuvi)" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) return 0;
    return ATS[nom].lire(await r.json()).length;
  } catch { return 0; }
}

// Vingt-quatre requetes en vol : au-dela, Workable et Recruitee repondent
// 429 et on perd des entreprises qui existent.
const EN_VOL = 24;
const trouves = [];
let i = 0;
async function ouvrier() {
  while (i < aEssayer.length) {
    const slug = aEssayer[i++];
    let meilleur = null;
    for (const nom of NOMS_ATS) {
      const n = await compter(slug, nom);
      if (n > 0 && (!meilleur || n > meilleur.n)) meilleur = { ats: nom, n };
    }
    if (meilleur) {
      trouves.push({ slug, ats: meilleur.ats, nom: slug, postes: meilleur.n });
      console.log("  + " + slug + "  " + meilleur.ats + "  " + meilleur.n + " postes");
    }
  }
}
await Promise.all(Array.from({ length: EN_VOL }, ouvrier));

trouves.sort((a, b) => b.postes - a.postes);
console.log("\n" + trouves.length + " tableaux trouves sur " + aEssayer.length + " essayes, "
  + trouves.reduce((s, t) => s + t.postes, 0) + " postes");

if (!ecrire) {
  console.log("\nRien n'a ete ecrit. Relancer avec --ecrire pour les ajouter a lib/boards.js.");
  process.exit(0);
}

// On ajoute avant la fermeture du tableau, sans toucher a ce qui est deja
// la : le nom lisible des entreprises existantes a souvent ete corrige a la
// main, et une regeneration complete le perdrait.
const chemin = new URL("../lib/boards.js", import.meta.url).pathname;
const source = readFileSync(chemin, "utf8");
const lignes = trouves.map((t) =>
  '  { slug: "' + t.slug + '", ats: "' + t.ats + '", nom: "' + t.nom + '" },').join("\n");
const marque = "];\n\nexport function boardsParAts";
if (!source.includes(marque)) {
  console.error("lib/boards.js n'a plus la forme attendue : rien n'est ecrit.");
  process.exit(1);
}
writeFileSync(chemin, source.replace(marque, lignes + "\n" + marque));
console.log(trouves.length + " lignes ajoutees a lib/boards.js.");
