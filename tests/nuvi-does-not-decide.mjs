// Nuvi ne decide pas a la place du candidat, dans les deux sens.
//
// POURQUOI CE TEST EXISTE
//
// Les prompts disaient "n'invente JAMAIS". Pris au mot par le modele, ca
// veut dire que quelqu'un qui demande explicitement d'ajouter une ligne a
// son CV se fait refuser par son propre outil, ou sermonner sur
// l'honnetete. Ce n'est pas a Nuvi de decider ce que quelqu'un met sur son
// CV : c'est son CV, sa candidature, sa responsabilite.
//
// Mais inventer SPONTANEMENT est le meme defaut vu de l'autre cote :
// quelqu'un qui clique "ameliorer" et recupere un diplome qu'il n'a pas se
// fait piloner au premier entretien sans avoir rien demande.
//
// Une regle a deux faces, donc, et un test qui refuse qu'on n'en garde
// qu'une : c'est exactement ce qui arrive quand quelqu'un "nettoie" les
// prompts et retrouve la formule courte d'avant.
//
// CE QU'IL VERIFIE
//
//   1. La regle existe et enonce bien SES DEUX FACES.
//   2. Elle est effectivement posee dans les prompts ou Nuvi ecrit pour le
//      candidat - a commencer par le coach, l'endroit ou l'on parle a Nuvi.
//   3. Aucun "n'invente jamais" solitaire n'est revenu ailleurs.
//   4. Rien dans l'interface ne promet au candidat que Nuvi refusera de
//      faire ce qu'il demande.
//
// C'est un test de source, pas de navigateur : ces regles sont des chaines
// de caracteres envoyees a un modele. Les faire tourner couterait un appel
// payant par execution et rendrait le resultat non deterministe - le modele
// pourrait obeir un jour sur deux. Ce qu'on peut garantir sans appel, c'est
// que l'instruction PART. C'est ce qu'on garantit.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = join(RACINE, "app/AppRoot.jsx");

// Les deux faces de la regle, chacune reconnue par ce qu'elle interdit.
const FACES = [
  {
    nom: "de sa propre initiative, Nuvi n'ajoute rien",
    motif: /DE TA PROPRE INITIATIVE/,
    pourquoi:
      "sans cette face, Nuvi peut inventer un diplome pendant un simple "
      + "\"ameliorer\", et le candidat le decouvre en entretien",
  },
  {
    nom: "sur demande explicite, Nuvi execute sans sermon",
    motif: /DEMANDE EXPLICITEMENT/,
    pourquoi:
      "sans cette face, Nuvi refuse ou fait la morale a quelqu'un qui lui "
      + "demande quelque chose sur son propre CV",
  },
  {
    nom: "ni refus, ni morale, ni avertissement, ni version edulcoree",
    motif: /Ne refuse pas, ne fais pas la morale/,
    pourquoi:
      "c'est la partie qui se perd en premier quand on raccourcit la regle, "
      + "et c'est celle qui compte pour la personne devant l'ecran",
  },
];

// Les prompts ou Nuvi ECRIT pour le candidat. Le coach est le premier de la
// liste : c'est la qu'on parle a Nuvi, donc la que le refus se verrait.
const PROMPTS = [
  { nom: "le coach", repere: "# CORE BEHAVIOR" },
  { nom: "l'integration des mots-cles", repere: "bourrage de mots-cles" },
  { nom: "la lettre de motivation", repere: "CV CANDIDAT:" },
  { nom: "les questions d'entretien", repere: "methode STAR" },
  // LE REPERE DOIT DESIGNER UN SEUL PROMPT
  //
  // Celui du debrief etait "Sois HONNETE", que DEUX prompts contiennent :
  // l'audit du CV, plus haut dans le fichier, et le debrief. indexOf rendant
  // la premiere occurrence, ce test croyait verifier le debrief et verifiait
  // l'audit depuis toujours. Le debrief, lui, n'etait couvert par rien.
  //
  // Les deux ont desormais leur entree, avec un repere qui n'existe qu'a un
  // seul endroit du fichier.
  { nom: "l'audit du CV", repere: "Aucune diplomatie" },
  { nom: "le debrief d'entretien", repere: "VERDICT PROBABLE" },
];

// Un prompt est un long enchainement de "+". On regarde donc autour du
// repere, pas le fichier entier : sinon la regle posee dans le coach
// couvrirait tous les autres et le test ne prouverait rien.
const PORTEE = 4000;

function autour(source, repere) {
  const i = source.indexOf(repere);
  if (i < 0) return null;
  return source.slice(Math.max(0, i - PORTEE), i + PORTEE);
}

export async function run() {
  const failures = [];
  const source = readFileSync(PAGE, "utf8");

  // --- 1. La regle existe, avec ses deux faces ------------------------
  const i = source.indexOf("const QUI_DECIDE");
  if (i < 0) {
    failures.push(
      "la regle QUI_DECIDE a disparu de app/AppRoot.jsx. Nuvi n'a plus rien qui "
      + "lui dise a qui appartient la decision, ni dans un sens ni dans l'autre."
    );
    return failures;
  }
  // Un prompt est ecrit en morceaux recolles par des "+", donc une phrase
  // peut etre coupee en plein milieu par `" + "`. Chercher la phrase telle
  // qu'elle arrive au modele demande de recoller d'abord : sinon le test
  // signale une face manquante alors qu'elle est la, coupee en deux.
  const regle = source.slice(i, i + 2600).replace(/"\s*\+\s*"/g, "");
  for (const face of FACES) {
    if (!face.motif.test(regle)) {
      failures.push(
        `la regle a perdu une de ses deux faces : "${face.nom}". `
        + `Consequence : ${face.pourquoi}.`
      );
    }
  }

  // --- 2. Elle est posee la ou Nuvi ecrit -----------------------------
  for (const p of PROMPTS) {
    const bloc = autour(source, p.repere);
    if (bloc === null) {
      failures.push(
        `le prompt "${p.nom}" est introuvable (repere "${p.repere}"). `
        + "Soit il a ete deplace, soit ce test ne surveille plus rien : "
        + "corriger le repere plutot que supprimer la ligne."
      );
      continue;
    }
    if (!bloc.includes("QUI_DECIDE")) {
      failures.push(
        `le prompt "${p.nom}" n'inclut pas QUI_DECIDE. A cet endroit, Nuvi `
        + "peut refuser ce que le candidat demande, ou inventer sans qu'on "
        + "lui ait rien demande."
      );
    }
  }

  // --- 3. Aucune formule courte n'est revenue -------------------------
  //
  // La traduction est exclue : "do not invent, add or remove content" y est
  // une contrainte de traduction (ne pas ajouter de contenu en traduisant),
  // pas une regle d'honnetete. L'import aussi : un analyseur qui invente ne
  // lit plus le document qu'on lui donne.
  const EXCLUS = [
    /Do not invent, add or remove content\. Translate what is there\./,
    /jamais inventer experiences\/diplomes,/,
  ];
  const SOLITAIRES = [
    /N'invente jamais/g,
    /NEVER invent/g,
    /Ne pas inventer/g,
    /\(pas inventer\)/g,
    /\(pas invente\)/g,
  ];
  for (const motif of SOLITAIRES) {
    for (const m of source.matchAll(motif)) {
      const extrait = source.slice(m.index, m.index + 120).split("\n")[0];
      if (EXCLUS.some((e) => e.test(extrait))) continue;
      const ligne = source.slice(0, m.index).split("\n").length;
      failures.push(
        `app/AppRoot.jsx:${ligne} a retrouve un "n'invente jamais" solitaire : `
        + `"${extrait.trim()}". Cette formule, seule, fait refuser Nuvi quand `
        + "le candidat demande quelque chose sur son propre CV. Utiliser "
        + "QUI_DECIDE, qui dit les deux faces."
      );
    }
  }

  // --- 4. L'interface ne promet pas un refus --------------------------
  //
  // "Je modifie sans inventer" etait affiche en tete d'Ajuster : une
  // promesse faite au candidat que l'outil ne ferait pas ce qu'il demande.
  const ECRANS = [
    "app/components/AdjustModal.jsx",
    "app/components/MatchPanel.jsx",
    "app/components/NuviHome.jsx",
  ];
  for (const f of ECRANS) {
    let txt = "";
    try { txt = readFileSync(join(RACINE, f), "utf8"); } catch { continue; }
    // Les formules de refus ne vivent pas toutes dans une chaine entre
    // guillemets : dans du JSX elles sont du texte nu. On regarde donc le
    // fichier, pas seulement ses litteraux.
    const TOURNURES = [
      /sans (rien )?inventer/i,
      /without inventing/i,
      /que l[ao] ou c'est vrai/i,
      /only where it'?s true/i,
    ];
    for (const t of TOURNURES) {
      const m = txt.match(t);
      if (!m) continue;
      const i = txt.indexOf(m[0]);
      const extrait = txt.slice(Math.max(0, i - 60), i + 60).replace(/\s+/g, " ").trim();
      failures.push(
        `${f} affiche "${m[0]}" au candidat (…${extrait}…). C'est promettre que `
        + "Nuvi refusera, ou lui rappeler ce qu'il a le droit d'ecrire sur son "
        + "propre CV. Dire qui decide, pas ce qui est permis."
      );
    }
  }

  if (!failures.length) {
    console.log(
      `      la regle a ses deux faces et est posee dans ${PROMPTS.length} prompts ; `
      + "aucune formule de refus n'est revenue"
    );
  }
  return failures;
}
