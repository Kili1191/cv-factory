// Aucun cadratin n'atteint le CV, d'ou qu'il vienne.
//
// LE DEFAUT, RELEVE SUR UN VRAI CV EN PRODUCTION
//
// Une capture de thenuvi.com/app, le CV de Kilian a l'ecran :
//
//     Client Relationship Manager
//     Private Clients (cadratin) . UAE
//     Account Manager (cadratin)
//     Customer Service Advisor (cadratin)
//     CERTIFICATIONS
//     . 2023
//
// Des cadratins dans le document, sur la page que lira le recruteur. C'est la
// regle numero un du depot, enfreinte a l'endroit exact qu'elle nomme.
//
// POURQUOI LE GARDE-FOU EXISTANT NE POUVAIT PAS LE VOIR
//
// tests/no-em-dash.mjs lit les FICHIERS du depot. Il est juste, il est utile,
// et il ne peut rien contre ce defaut-la : le cadratin n'etait pas dans le
// code, il etait dans les donnees de quelqu'un. Word en met tout seul, et la
// plupart des CV bien mis en page ecrivent "Account Manager (cadratin)
// Stenn International".
//
// san() les retirait pourtant depuis longtemps. Mais sanDeep(), qui
// l'applique a tout un arbre, n'etait appele que dans parseJSON : uniquement
// sur les reponses du modele. Le lecteur local, lireUnCv, lit un CV colle
// sans rien demander a personne. C'est le chemin le plus frequent du produit,
// celui que le CLAUDE.md decrit comme prioritaire parce qu'il est instantane
// et gratuit, et il ne passait par aucun nettoyage. La porte la moins chere
// etait celle par laquelle ils entraient tous.
//
// CE QUE CE TEST MESURE
//
// La regle metier, sans navigateur, sur les chaines EXACTES de la capture.
// Un test de bout en bout ouvrirait un navigateur pour prouver la meme chose
// plus lentement et sur un cas invente ; celui-ci part de ce qui est
// reellement arrive a quelqu'un.

import { nettoyerUnChamp, nettoyerLesChamps, estUneCoquille }
  from "../lib/nettoyerLesChamps.js";

const CADRATIN = String.fromCharCode(0x2014);
const DEMI = String.fromCharCode(0x2013);

// Releve mot pour mot sur les deux captures.
const RELEVE = [
  ["Account Manager " + CADRATIN, "Account Manager"],
  ["Private Clients " + CADRATIN, "Private Clients"],
  ["Customer Service Advisor " + CADRATIN, "Customer Service Advisor"],
  ["Banking and Finance Training " + DEMI + " Banking products, advisory sales "
    + CADRATIN,
   "Banking and Finance Training - Banking products, advisory sales"],
];

// Ce qui doit traverser sans une egratignure. Un nettoyage trop zele coute
// plus cher que le defaut : il abime le CV de tout le monde pour reparer
// celui d'un seul.
// LA PONCTUATION FINALE EN FAIT PARTIE, ET J'AI FAILLI LA PERDRE
//
// La premiere version taillait tout point final sauf dans une chaine
// contenant une espace. "Sales." devenait "Sales" et "M.Sc." devenait
// "M.Sc" : la longueur d'une chaine ne dit rien de la nature de son point.
// Ces trois lignes sont la pour que le raccourci ne revienne pas.
const INTOUCHABLES = [
  "Sales.",
  "M.Sc.",
  "Node.js",
  "C++",
  "Stenn International, London, UK",
  "Managed a portfolio of private investors through the full cycle.",
  "Kept retention above 85% across 20 to 60 accounts at any one time.",
  "Client Onboarding in Regulated and Fintech Environments",
  "2016 - 2023",
  "Level 7 Diploma in Strategic Management and Leadership (expected 2026)",
  "KYC and AML Compliance",
  "English: Professional fluency",
];

export async function run() {
  const failures = [];

  try {
    // 1. LES CHAINES DE LA CAPTURE
    for (const [avant, attendu] of RELEVE) {
      const apres = nettoyerUnChamp(avant);
      if (apres !== attendu) {
        failures.push("\"" + avant + "\" devient \"" + apres + "\" au lieu de \""
          + attendu + "\".");
      }
    }

    // 2. PLUS AUCUN TIRET LONG NE SURVIT, SOUS AUCUNE FORME
    const formes = ["‐", "‑", "‒", DEMI, CADRATIN, "―"];
    for (const f of formes) {
      const apres = nettoyerUnChamp("Account Manager " + f + " Stenn");
      if (apres.includes(f)) {
        failures.push("le tirer long U+" + f.charCodeAt(0).toString(16)
          + " traverse le nettoyage. Il s'affichera dans le CV et partira "
          + "dans le PDF du recruteur.");
      }
    }

    // 3. CE QUI EST BON RESTE INTACT
    for (const t of INTOUCHABLES) {
      const apres = nettoyerUnChamp(t);
      if (apres !== t) {
        failures.push("\"" + t + "\" est abime par le nettoyage : il devient \""
          + apres + "\". Un nettoyage trop zele abime le CV de tout le monde "
          + "pour reparer celui d'un seul.");
      }
    }

    // 4. UNE ENTREE QUI N'EST QU'UNE DATE N'EST PAS UNE ENTREE
    //
    // La section CERTIFICATIONS de la capture ne contenait que "2023".
    for (const c of ["2023", "(2026)", "2016 - 2023", "---", "  "]) {
      if (!estUneCoquille(c)) {
        failures.push("\"" + c + "\" est accepte comme certification. Un "
          + "analyseur lira une certification qui s'appelle \"" + c + "\".");
      }
    }
    for (const c of ["CIPD Level 3", "AML Certificate 2023", "Salesforce Admin"]) {
      if (estUneCoquille(c)) {
        failures.push("\"" + c + "\" est jete alors que c'est une vraie "
          + "certification.");
      }
    }

    // 5. L'ARBRE ENTIER, PAS SEULEMENT LES CHAINES DU DESSUS
    const cv = nettoyerLesChamps({
      name: "Kilian Maisonnette",
      experience: [{
        id: 2,
        title: "Account Manager " + CADRATIN,
        company: "Stenn International, London, UK",
        bullets: ["Onboarded 60+ SME clients " + DEMI + " cutting delays."],
      }],
    });
    const entier = JSON.stringify(cv);
    if (entier.includes(CADRATIN) || entier.includes(DEMI)) {
      failures.push("un tiret long survit dans l'arbre du CV : " + entier);
    }
    if (cv.experience[0].id !== 2) {
      failures.push("le nettoyage a touche a un identifiant : il ne doit "
        + "toucher qu'aux chaines.");
    }

    if (!failures.length) {
      console.log("      les chaines relevees sur le CV en production sortent "
        + "propres, et rien de bon n'est abime");
    }
  } catch (err) {
    failures.push("le test lui-meme a plante : " + (err && err.message));
  }

  return failures;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((f) => {
    for (const l of f) console.log("ECHEC " + l);
    process.exit(f.length ? 1 : 0);
  });
}
