// HOW DO YOU KNOW IT FILLED IT WITH THE BEST ONE?
//
// You do not, unless you measure it. A model asked to write the best possible
// CV writes something plausible and hands it over; nothing in that loop tells
// anyone whether it is any good. "Trust the model" is not an answer, and it is
// the answer the product was giving.
//
// Everything needed to answer it properly was already here and wired to
// nothing:
//
//   lib/diagnostic.js        nine axes, deterministic, free
//   lib/atsVendors.js        six real parser profiles
//   lib/atsMatch.js          coverage against THIS job ad
//
// All three run locally in a millisecond and cost nothing, so they can run on
// every generation rather than on demand. That turns "here is your CV" into
// "here is your CV, and here is what it scores against this ad".
//
// WHY ONE NUMBER, AND WHY THIS ONE
//
// Comparing two drafts needs a single comparable value, and the order of the
// terms is a product decision, not a mathematical one:
//
//   1. Parsers first. A CV that a parser drops never reaches a human, so no
//      amount of good writing compensates. It dominates.
//   2. Then coverage of the ad, because that is what this document is for.
//   3. Then the general diagnostic, which is quality independent of any ad.
//
// The weights are coarse on purpose. This number exists to CHOOSE BETWEEN two
// drafts, not to be shown as a grade: a precise-looking score invites people
// to optimise the number instead of the CV, which lib/atsMatch.js already
// refuses to do for the same reason.

import { diagnostiquer } from "./diagnostic.js";
import { lireCommeLesAts } from "./atsVendors.js";
import { rapport } from "./atsMatch.js";
import { texteProbable } from "./deuxLectures.js";

/**
 * Measures a CV against a job ad, using only local deterministic readers.
 *
 * @param {object} cv      the CV as the app holds it
 * @param {string} annonce the job ad it is aimed at
 * @param {string} langue  "fr" | "en"
 * @returns {{note: number, ats: number, couverture: number, diagnostic: number,
 *            manquantes: string[], aCorriger: number, titrePresent: boolean}}
 */
export function mesurerLeCv(cv, annonce, langue = "fr") {
  // LE TEXTE DONNE AUX ANALYSEURS DOIT AVOIR DES LIGNES
  //
  // Premiere version : texteDuCv(). Il colle tout bout a bout, en minuscules
  // et sans accents, parce qu'il est fait pour comparer des mots-cles. Donne
  // a un simulateur d'analyseur, il ne porte plus ni rubrique ni poste, et les
  // six profils echouent sur un CV parfaitement bon. Mesure : 0 sur 6 pour un
  // CV que le produit exporte et que trois moteurs reels lisent en entier.
  //
  // C'est la meme erreur que dans lib/lireUnFichier.js quelques heures plus
  // tot : juger un document sur un texte dont on a retire la structure. Elle
  // se represente parce que les deux fonctions rendent une chaine et que rien
  // dans leur nom ne dit laquelle porte des lignes.
  //
  // texteProbable() reconstitue l'ordre que le produit emet vraiment, avec ses
  // sauts de ligne. C'est celui-la qu'un analyseur verrait.
  const texte = texteProbable(cv);
  const ats = lireCommeLesAts(cv, texte);
  const passent = (ats.profils || []).filter((p) => p.passe).length;

  const diag = diagnostiquer(cv, langue === "en" ? "en" : "fr");
  const global = Number(diag.global_score) || 0;

  const r = String(annonce || "").trim() ? rapport(cv, annonce) : null;
  const manquantes = r ? (r.manquantes || []) : [];
  // La couverture est une part, pas un compte : dix mots manquants sur douze
  // et dix sur soixante ne disent pas la meme chose.
  // LA COUVERTURE EST UNE PART DE CE QUE L'ANNONCE DEMANDE
  //
  // phrasesClefs() rend les expressions que l'annonce reclame. Trois sorts
  // possibles : presente telle quelle, presente sous d'autres mots
  // (aReformuler), absente (manquantes). La couverture est donc la part des
  // expressions demandees que le CV porte deja, sous une forme ou une autre.
  //
  // Une premiere version divisait par un denominateur bricole et rendait 11 %
  // pour un CV faible et 14 % pour un bon : deux chiffres faux et trop
  // proches pour departager quoi que ce soit.
  const clefs = r ? (r.demandees || 0) : 0;
  const couverture = !r || !clefs
    ? 100
    : Math.max(0, Math.round(((clefs - manquantes.length) * 100) / clefs));

  return {
    // Les analyseurs pesent le plus : un CV qu'ils perdent n'atteint personne.
    note: passent * 100 + couverture * 2 + global,
    ats: passent,
    couverture,
    diagnostic: global,
    manquantes,
    aCorriger: r ? r.aCorriger : 0,
    titrePresent: r ? !!(r.titre && r.titre.present) : true,
  };
}

/**
 * What to tell the model so the second pass fixes something specific.
 * Returns "" when nothing measurable is wrong: an empty instruction is the
 * signal not to spend a second call.
 */
export function consigneDeReprise(m, langue = "fr") {
  const en = langue === "en";
  const points = [];

  if (m.ats < 6) {
    points.push(en
      ? "Only " + m.ats + " of the 6 parser profiles read this CV in full. Section headings must be the standard ones, every job needs a start and an end date, and every employer must be named."
      : "Seuls " + m.ats + " profils d'analyseur sur 6 lisent ce CV en entier. Les intitules de rubrique doivent etre les intitules standards, chaque poste porte une date de debut et de fin, et chaque employeur est nomme.");
  }
  if (m.manquantes.length) {
    points.push((en
      ? "These words from the ad appear nowhere in the CV, and a recruiter filters on them. Place the ones the person's experience genuinely supports: "
      : "Ces mots de l'annonce n'apparaissent nulle part dans le CV, et un recruteur filtre dessus. Place ceux que le parcours justifie vraiment : ")
      + m.manquantes.slice(0, 14).join(", ") + ".");
  }
  if (!m.titrePresent) {
    points.push(en
      ? "The CV title does not match the one in the ad. Use the ad's wording."
      : "L'intitule du CV ne reprend pas celui de l'annonce. Reprends sa formulation.");
  }
  if (m.diagnostic < 75) {
    points.push(en
      ? "Bullets are still thin: each one should say what changed and by how much, using only figures the person supplied."
      : "Les puces restent minces : chacune doit dire ce qui a change et de combien, en n'utilisant que les chiffres donnes par la personne.");
  }

  return points.length ? points.join("\n") : "";
}
