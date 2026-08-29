// Aucune combinaison de couleurs ne rend un element du CV invisible.
//
// LE DEFAUT QU'IL EMPECHE
//
// Le monogramme du CV, un disque portant les initiales, se peignait en noir
// sur noir sur le theme par defaut. Un vide en haut de la colonne, et rien
// pour dire que quelque chose aurait du s'y trouver. Il partait comme ca dans
// le PDF envoye au recruteur.
//
// La fonction censee garantir la lisibilite en etait la cause. Elle
// n'assombrissait, jamais autre chose. Sur un fond clair c'est la bonne
// direction ; sur un fond sombre, assombrir l'accent le rapproche du fond a
// chaque tour. Elle ne pouvait donc pas atteindre son seuil, rendait la main
// apres dix essais, et retournait une couleur PLUS proche du fond que celle
// qu'on lui avait donnee. Le theme Ink en est le cas limite : accent et
// bande y valent la meme couleur, et la fonction rendait 1.12 : 1.
//
// POURQUOI TOUTES LES COMBINAISONS
//
// Le defaut ne vivait pas dans un theme, mais dans la fonction. Or l'accent
// et la couleur de bande se choisissent SEPAREMENT dans la personnalisation :
// n'importe qui pouvait fabriquer la meme disparition sans comprendre
// pourquoi. Tester le seul theme par defaut aurait laisse passer les
// quarante-sept autres.

import { readableAccentOn, contrastRatioCv } from "../lib/contrasteCv.js";

// Les palettes reellement proposees dans la personnalisation.
const ACCENTS = [
  ["Or classique", "#c9a96e"], ["Bordeaux", "#7a1f2b"],
  ["Vert foret", "#2d5a3d"],   ["Bleu marine", "#1e3a5f"],
  ["Aubergine", "#4a1d3f"],    ["Charbon", "#3a3a3a"],
  ["Rouille", "#a64b2a"],      ["Bleu petrole", "#1f4d4a"],
  // L'accent du theme Ink, qui n'est pas dans les presets mais qui est la
  // valeur par defaut : c'est lui qui a produit le noir sur noir.
  ["Ink (defaut)", "#14140f"],
];
const BANDES = [
  ["Noir profond", "#0a0a0a"],  ["Bleu nuit", "#0f1d3a"],
  ["Charbon", "#26262b"],       ["Vert sapin", "#1a3329"],
  ["Bordeaux fonce", "#3a0e15"],["Creme inverse", "#f5f1e8"],
];

// Le seuil que la fonction promet. En dessous, du texte sur le document que
// lit un recruteur devient difficile a lire ou disparait.
const SEUIL = 4.0;

export async function run() {
  const failures = [];

  for (const [nomAc, ac] of ACCENTS) {
    for (const [nomSb, sb] of BANDES) {
      const corrige = readableAccentOn(ac, sb);
      const ratio = contrastRatioCv(corrige, sb);
      if (!(ratio >= SEUIL)) {
        failures.push(
          `accent ${nomAc} (${ac}) sur bande ${nomSb} (${sb}) : corrige en `
          + `${corrige}, contraste ${ratio.toFixed(2)} pour ${SEUIL} exige. `
          + "Le monogramme et les libelles de la bande sont illisibles, sur "
          + "l'ecran comme dans le PDF envoye au recruteur."
        );
      }
    }
  }

  // Une garantie separee, parce qu'elle a deja ete violee dans l'autre sens :
  // un accent qui passe deja ne doit pas etre touche. Le corriger quand meme
  // ferait deriver la couleur choisie par la personne a chaque rendu.
  const dejaBon = readableAccentOn("#14140f", "#f5f1e8");
  if (dejaBon.toLowerCase() !== "#14140f") {
    failures.push(
      `un accent deja lisible a ete modifie : #14140f sur #f5f1e8 est devenu `
      + `${dejaBon}. La couleur choisie par la personne doit etre rendue telle `
      + "quelle quand elle contraste deja."
    );
  }

  if (!failures.length) {
    console.log(
      `      les ${ACCENTS.length * BANDES.length} combinaisons accent x bande `
      + `passent ${SEUIL} : 1, et un accent deja lisible reste intact`
    );
  }
  return failures;
}
