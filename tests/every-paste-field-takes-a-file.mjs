// Partout ou l'on demande de coller, on peut deposer un fichier.
//
// LE DEFAUT, ET POURQUOI IL SE REFAIT TOUT SEUL
//
// Le produit demandait du texte colle a onze endroits. Deux acceptaient un
// fichier. Ce n'est pas une negligence ponctuelle : ecrire une zone de texte
// prend une ligne, cabler une lecture de fichier en prend quarante, et
// chaque nouvel ecran repart donc de la zone de texte. Sans garde-fou, la
// proportion revient toute seule.
//
// Or les gens que Nuvi vise n'ont presque jamais leur materiau en texte. Ils
// ont un CV en PDF, un vieux document Word, la photo d'un CV imprime, une
// capture d'ecran de l'annonce. "Colle le texte" leur demande de le retaper
// sur un telephone, c'est a dire d'abandonner.
//
// CE QUE CE TEST LIT, ET CE QU'IL NE LIT PAS
//
// Il lit la source, pas l'ecran. Ouvrir onze modales dans un navigateur
// couterait plusieurs minutes et casserait a chaque changement de chemin de
// navigation, pour prouver la meme chose : que le champ a son depot a cote.
// Un test qui met dix minutes finit desactive.
//
// Il ne remplace donc pas les tests de bout en bout qui exercent vraiment un
// depot (a-posting-alone-is-enough en fait un). Il empeche l'oubli, ce qui
// est le defaut reel ici.

import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const DOSSIER = new URL("../app/", import.meta.url).pathname;

// Les champs qui ne sont pas des portes d'entree de matiere. Chacun est ici
// pour une raison qui tient en une ligne, et cette raison est le vrai
// contenu du test : sans elle la liste deviendrait un endroit ou ranger ce
// qu'on n'a pas envie de cabler.
const HORS_SUJET = [
  ["EditHelpers.js", "edition d'un champ du CV deja importe, pas une entree"],
  ["EditSheets.jsx", "edition d'un champ du CV deja importe, pas une entree"],
  ["BulletTransformer.jsx", "un chiffre a saisir, jamais un fichier"],
  ["JobSearchModal.jsx", "des mots-cles de recherche"],
  ["ScanEssai.jsx", "une seule ligne, demonstration locale sur la vitrine"],
  ["LiquidGlassModal.jsx", "champ generique, sans matiere propre"],
  ["AdjustModal.jsx", "une instruction au modele, pas une matiere"],
  ["CoachModal.jsx", "porte son propre trombone depuis le debut"],
  ["PhotoCropEditor.jsx", "n'est qu'un depot d'image"],
  ["InterviewModal.jsx:apres", "le recit de l'entretien qu'on vient de passer"],
];

function fichiersJsx(racine) {
  const out = [];
  for (const e of readdirSync(racine, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = join(racine, e.name);
    if (e.isDirectory()) out.push(...fichiersJsx(p));
    else if (/\.(jsx|js)$/.test(e.name)) out.push(p);
  }
  return out;
}

// Une zone de texte qui attend une ANNONCE ou un CV se reconnait a ce
// qu'elle affiche : le libelle et l'invite le disent en toutes lettres, dans
// les deux langues. On cherche donc les cles d'i18n qui les portent.
const MATIERE = /offer|offre|annonce|parcours|ob_paste|cv_texte|pq_placeholder/i;

export async function run() {
  const failures = [];

  try {
    const fichiers = fichiersJsx(DOSSIER);
    const exempts = new Set(HORS_SUJET.map(([f]) => f.split(":")[0]));
    let vus = 0;

    for (const chemin of fichiers) {
      const nom = chemin.split("/").pop();
      if (exempts.has(nom)) continue;
      const src = readFileSync(chemin, "utf8");
      if (!src.includes("<textarea")) continue;

      // Les zones de texte de ce fichier qui attendent de la matiere.
      const morceaux = src.split("<textarea").slice(1);
      const attendMatiere = morceaux.some((m) => MATIERE.test(m.slice(0, 700)));
      if (!attendMatiere) continue;
      vus += 1;

      const aDepot = src.includes("FileDrop") || src.includes("type=\"file\"");
      if (!aDepot) {
        failures.push(nom + " demande de coller une annonce ou un parcours et "
          + "n'offre aucun depot de fichier. Qui a son annonce en PDF ou en "
          + "capture d'ecran doit la retaper. Poser <FileDrop T={T} "
          + "quoi=\"annonce\" .../> sous le champ suffit.");
      }

      // UN COLLAGE VENU D'UN SITE D'EMPLOI ARRIVE AVEC SES ENTITES
      //
      // "&nbsp;" s'est affiche sur trois lignes dans le champ d'un
      // utilisateur, sur la version en production. Le nettoyage se pose sur
      // le collage, une fois par champ.
      if (/offer|offre|annonce|pq_placeholder/i.test(src) && !src.includes("nettoyerLAnnonce")) {
        failures.push(nom + " recoit une annonce collee sans la nettoyer. Les "
          + "sites d'emploi rendent leurs espaces insecables en entites, et "
          + "le presse-papier les emporte : la personne lit \"&nbsp;\" dans "
          + "son propre champ, et le modele les recoit aussi.");
      }
    }

    if (vus < 6) {
      failures.push("seulement " + vus + " zone(s) de matiere reperee(s) : le "
        + "test ne balaie plus ce qu'il croit balayer, sans doute parce que "
        + "les cles d'i18n ont change de nom.");
    }

    if (!failures.length) {
      console.log("      " + vus + " champs de matiere, tous avec un depot de fichier");
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
