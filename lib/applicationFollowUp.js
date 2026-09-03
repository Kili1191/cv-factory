// Quelles candidatures attendent quelque chose de la personne.
//
// POURQUOI CETTE REGLE VIT ICI ET PAS DANS LE TABLEAU DE SUIVI
//
// Le tableau la connaissait deja : une candidature envoyee il y a sept jours
// ou plus affiche "c'est le moment de relancer", en rouge. Elle ne servait
// qu'a l'interieur du tableau, c'est a dire uniquement a qui l'avait deja
// ouvert. Or c'est exactement l'inverse du besoin : on ouvre le suivi parce
// qu'on se souvient qu'il faut relancer, et quelqu'un qui n'y pense pas ne
// relance jamais.
//
// La barre de navigation peut le dire, mais elle ne peut le dire qu'en
// partageant la MEME regle. Deux definitions du meme seuil derivent : la
// pastille dirait trois, le tableau en montrerait cinq, et plus personne ne
// ferait confiance ni a l'une ni a l'autre.
//
// LE SEUIL, ET POURQUOI SEPT
//
// C'est celui que le tableau affichait deja, et il correspond a ce que dit le
// pack de candidature quand il ecrit la relance : "a envoyer 7 a 10 jours
// apres la candidature si aucune reponse". Trois endroits, un seul chiffre.
export const JOURS_AVANT_RELANCE = 7;

// Seul l'etat "envoyee" attend une relance. Un entretien decroche, une offre
// ou un refus n'attendent rien : relancer un refus est le genre de conseil
// qui fait fermer un outil.
const ETAT_QUI_ATTEND = "applied";

export function joursDepuis(dateStr) {
  if (!dateStr) return null;
  const alors = Date.parse(dateStr);
  if (!Number.isFinite(alors)) return null;
  return Math.max(0, Math.floor((Date.now() - alors) / 86400000));
}

// Une candidature a relancer : envoyee, et assez ancienne pour que le silence
// veuille dire quelque chose.
export function aRelancer(app) {
  if (!app || app.status !== ETAT_QUI_ATTEND) return false;
  const j = joursDepuis(app.date);
  return j !== null && j >= JOURS_AVANT_RELANCE;
}

export function combienARelancer(applications) {
  if (!Array.isArray(applications)) return 0;
  return applications.filter(aRelancer).length;
}
