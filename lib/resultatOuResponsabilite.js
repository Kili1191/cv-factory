// UNE PUCE DIT-ELLE CE QU'ON VOUS A CONFIE, OU CE QUE VOUS AVEZ OBTENU ?
//
// C'est la difference qui decide d'un rappel. "Responsable du bar" dit le
// perimetre : n'importe qui ayant tenu ce poste pourrait l'ecrire. "Marge
// boissons tenue a 78% en resserrant les pertes" dit ce qui a change parce
// que vous etiez la. Le premier se verifie sur une fiche de poste, le second
// seulement aupres de vous.
//
// CE QUE LE DIAGNOSTIC MESURAIT DEJA, ET CE QU'IL RATAIT
//
// Il comptait deux choses : la presence d'un chiffre, et les debuts de puce
// en forme de fiche de poste. Les deux sont utiles et aucune ne suffit.
//
//   "Encadre une equipe de 12 sur quatre points de vente"
//
// Cette puce porte un chiffre et ne commence pas par une formule plate. Elle
// passait donc les deux controles. Elle ne dit pourtant aucun resultat : 12
// et 4 mesurent le perimetre confie, pas ce qu'il en est advenu.
//
// UN CHIFFRE DE PERIMETRE N'EST PAS UN CHIFFRE DE RESULTAT
//
// C'est le coeur de ce fichier. "Equipe de 12", "quatre points de vente",
// "200 couverts par service" disent la taille du terrain. "De 5 a 120 clients
// en cinq mois", "78% de marge", "25% de pertes en moins" disent le
// deplacement. Un recruteur lit les seconds ; les premiers ne le renseignent
// que sur l'employeur precedent.
//
// TROIS ETATS, PAS DEUX
//
// "Indetermine" existe parce qu'une puce peut annoncer un mouvement sans le
// prouver : "ameliore le service" est un resultat revendique et non mesure.
// La ranger avec les responsabilites serait injuste, la ranger avec les
// resultats serait complaisant. Elle merite sa case, et un conseil a elle :
// il ne manque qu'un chiffre.

import { fold } from "./atsParser.js";

// Les verbes qui disent un deplacement : quelque chose n'est plus comme
// avant. Ce sont eux qui transforment une tache en resultat.
const VERBES_DE_RESULTAT = [
  // francais
  "augmente", "augmentation", "reduit", "reduction", "baisse", "diminue",
  "double", "triple", "multiplie", "fait passer", "porte a", "ramene",
  "gagne", "economise", "gagne", "developpe", "ouvert", "lance", "cree",
  "redresse", "sauve", "recupere", "depasse", "atteint", "obtenu", "decroche",
  "ameliore", "amelioration", "optimise", "renforce", "elargi", "etendu",
  "accelere", "raccourci", "supprime", "elimine", "resolu", "corrige",
  "forme", "fidelise", "converti",
  // anglais
  "grew", "grow", "increased", "increase", "reduced", "reduce", "cut",
  "lowered", "raised", "doubled", "tripled", "saved", "won", "delivered",
  "launched", "opened", "built", "turned around", "recovered", "exceeded",
  "beat", "hit", "achieved", "improved", "boosted", "accelerated",
  "shortened", "eliminated", "resolved", "fixed", "converted", "retained",
  // Les formes non conjuguees comptent : "helped improve the business" annonce
  // un resultat sans le mesurer, et doit tomber dans l'indetermine.
  "improve", "increase", "reduce", "grow", "raise", "save", "boost",
];

// Les verbes qui disent un perimetre : on vous a confie quelque chose. Ils
// ne sont pas fautifs, ils sont seulement insuffisants seuls.
const VERBES_DE_PERIMETRE = [
  "responsable", "en charge", "charge de", "gestion", "gere", "suivi",
  "encadre", "supervise", "assure", "participe", "aide", "assiste",
  "tenu", "anime", "accompagne", "realise", "effectue", "utilise",
  "responsible", "in charge", "managed", "manage", "oversaw", "oversee",
  "supervised", "handled", "ran", "run", "supported", "assisted", "helped",
  "worked", "involved", "participated", "performed", "carried out",
  "maintained", "monitored", "tracked", "used", "operated",
];

// LES CHIFFRES QUI NE MESURENT QU'UN PERIMETRE
//
// Un effectif, un nombre de sites, un volume quotidien : ils disent la taille
// de ce qu'on vous a confie. Reconnus par la forme, pas par le nombre.
const CHIFFRES_DE_PERIMETRE = [
  /\b(?:equipe|team)\s+(?:de|of)\s+\d+/i,
  /\b\d+\s+(?:personnes|people|staff|collaborateurs|employes)\b/i,
  /\b\d+\s+(?:points? de vente|outlets?|sites?|magasins?|stores?|bars?|restaurants?)\b/i,
  /\b\d+\s+(?:couverts|covers|clients par|customers per|colis par|parcels per)\b/i,
  /\bde\s+\d+\s+(?:personnes|couverts)\b/i,
];

// LES CHIFFRES QUI MESURENT UN DEPLACEMENT
//
// Un pourcentage, une somme, un avant-apres, une atteinte de cible. Ce sont
// eux qu'un recruteur retient, parce qu'ils disent ce qui a bouge.
const CHIFFRES_DE_RESULTAT = [
  /\d+\s*%/,                                        // 25%, 78 %
  /[€$£]\s*\d|\d+\s*(?:k€|k\$|eur|euros|gbp|usd)\b/i, // une somme
  /\b(?:de|from)\s+\d+\s+(?:a|to)\s+\d+/i,           // de 5 a 120
  /\b(?:\+|\-|plus de|moins de|up|down|under|over)\s*\d+/i,
  /\b\d+\s*(?:points?|pts)\b/i,
  // UN RESULTAT NE S'ECRIT PAS TOUJOURS EN CHIFFRES
  //
  // "Erreurs de picking divisees par trois en six mois" est un resultat
  // mesure, et il tombait dans les responsabilites : "divisees" n'etait dans
  // aucune liste et "trois" n'est pas un chiffre. Les gens qui n'ont jamais
  // redige de CV ecrivent volontiers le multiple en toutes lettres, et c'est
  // exactement le public vise. Trouve en essayant le classement hors
  // hospitalite, sur un magasinier.
  /\b(?:divise|divisee|divises|divisees|multiplie|multipliee|multiplies|multipliees)s?\s+par\s+(?:\d+|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\b/i,
  /\b(?:moitie|deux fois|trois fois|dix fois)\s+(?:moins|plus|mieux)\b/i,
  /\b(?:halved|doubled|tripled|quadrupled)\b/i,
  /\b(?:twice|three times|ten times)\s+(?:as|fewer|more|faster)\b/i,
];

// LA COMPARAISON SE FAIT SUR DES MOTS ENTIERS, ET C'EST INDISPENSABLE
//
// La premiere version cherchait chaque verbe comme une sous-chaine. Elle a
// range "Servi 200 couverts par service" dans les resultats, parce que
// "couverts" contient "ouvert". Le mot le plus banal du metier vise devenait
// une preuve de reussite.
//
// C'est le meme defaut qui, ailleurs dans ce depot, faisait passer "SQL" pour
// un intitule de rubrique : un signal choisi pour sa commodite plutot que
// pour ce qu'il distingue. On compare donc des mots entiers, avec un suffixe
// libre pour couvrir les conjugaisons - "reduit", "reduite", "reduction".
function contient(nu, liste) {
  return liste.some((v) => {
    const f = fold(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Debut de mot obligatoire ; la fin reste libre pour les conjugaisons,
    // mais le mot doit commencer la ou on l'attend.
    return new RegExp("(?:^|[^a-z0-9])" + f, "i").test(nu);
  });
}

/**
 * Range une puce dans l'un des trois etats.
 *
 * @param {string} texte la puce, telle que la personne l'a ecrite
 * @returns {{etat: "resultat"|"responsabilite"|"indetermine", pourquoi: string}}
 */
export function etatDeLaPuce(texte) {
  const brut = String(texte || "").trim();
  if (!brut) return { etat: "responsabilite", pourquoi: "vide" };
  const nu = fold(brut);

  const mouvement = contient(nu, VERBES_DE_RESULTAT);
  const perimetre = contient(nu, VERBES_DE_PERIMETRE);
  const chiffreResultat = CHIFFRES_DE_RESULTAT.some((r) => r.test(brut));
  const chiffreParPerimetre = CHIFFRES_DE_PERIMETRE.some((r) => r.test(brut));
  const chiffreQuelconque = /\d/.test(brut);

  // Un chiffre de resultat suffit : meme sous un verbe de perimetre, "marge
  // tenue a 78%" dit ou l'on a amene la marge.
  if (chiffreResultat) {
    return { etat: "resultat", pourquoi: "un chiffre qui mesure un deplacement" };
  }

  // Un mouvement chiffre, meme sans forme reconnue : "servi 140 colis par
  // jour" reste un fait verifiable attache a une action.
  if (mouvement && chiffreQuelconque && !chiffreParPerimetre) {
    return { etat: "resultat", pourquoi: "une action et un chiffre" };
  }

  // Un mouvement annonce sans chiffre : la revendication est la, la preuve
  // manque. Ce n'est pas une responsabilite, c'est un resultat a prouver.
  if (mouvement) {
    return { etat: "indetermine", pourquoi: "un resultat annonce mais pas mesure" };
  }

  // Il ne reste qu'un perimetre, chiffre ou non.
  if (perimetre || chiffreParPerimetre || chiffreQuelconque) {
    return {
      etat: "responsabilite",
      pourquoi: chiffreParPerimetre || chiffreQuelconque
        ? "un chiffre qui mesure le perimetre confie, pas ce qui en est advenu"
        : "ce qui a ete confie, sans ce qui en est advenu",
    };
  }

  return { etat: "responsabilite", pourquoi: "ni action mesuree ni resultat" };
}

/** Le compte des trois etats sur une liste de puces. */
export function compterLesPuces(puces) {
  const out = { resultat: 0, indetermine: 0, responsabilite: 0, total: 0, exemples: {} };
  for (const p of (puces || [])) {
    const t = String(p || "").trim();
    if (!t) continue;
    const { etat, pourquoi } = etatDeLaPuce(t);
    out.total += 1;
    out[etat] += 1;
    // On garde un exemple par etat : un conseil qui cite la phrase de la
    // personne se corrige, un conseil general se relit et s'oublie.
    if (!out.exemples[etat]) out.exemples[etat] = { texte: t, pourquoi };
  }
  return out;
}
