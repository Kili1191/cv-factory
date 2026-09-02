// Why hundreds of applications produced no interview.
//
// WHAT THIS ANSWERS, AND WHY IT IS NOT ANOTHER GENERATOR
//
// Someone who has sent two hundred applications and heard nothing does not
// need a two hundred and first CV. They need to know which of a small number
// of things is actually broken, because each one has a different fix and
// they are mutually exclusive in practice:
//
//   - the roles are wrong for the record they have;
//   - the level is above what the record evidences;
//   - the roles are right and the CV does not say the words;
//   - none of the above, and the problem is somewhere this file cannot see.
//
// Volume is what people do when they do not know which one it is. Nuvi has
// eleven tools that each fix one of these and, until now, no opinion about
// which one you need.
//
// THE MODEL PERCEIVES, THIS FILE JUDGES
//
// The model reads each ad and reports facts about it: how well the record
// covers it, whether the ad asks above or below that record, and which
// requirements are missing. Those are readings, and a model is good at them.
//
// The verdict is computed here, in ordinary code, for three reasons. It can
// be tested without a browser or a paid call, on fixed input. It can be read
// by a person who wants to know why they were told what they were told. And
// it cannot drift: a model asked for a diagnosis will happily produce a
// different one on the same evidence twice.

// COMBIEN D'ANNONCES AVANT DE SE PRONONCER
//
// Deux annonces ne font pas une tendance : un score bas sur les deux peut
// tenir a deux offres mal ecrites. A partir de trois, un ecart qui se repete
// est un ecart. Le seuil est bas expres, parce que quelqu'un qui vient de se
// faire ignorer cent fois ne va pas recoller cinquante annonces pour obtenir
// une reponse.
export const MINIMUM_ANNONCES = 3;

// LE SCORE SOUS LEQUEL CE N'EST PLUS LE MEME METIER
//
// Le score dit quelle part des exigences de l'annonce le parcours couvre
// deja. En dessous de 50, la moitie de ce que demande l'offre n'est nulle
// part dans le dossier : aucune reecriture n'y changera quoi que ce soit,
// parce qu'on ne reecrit pas ce qui n'existe pas. C'est la frontiere entre
// "mal dit" et "pas la meme chose".
export const SCORE_HORS_CIBLE = 50;

// A PARTIR DE QUAND UN MANQUE EST UN MOTIF
//
// Une exigence absente d'une annonce sur cinq est une annonce exigeante. La
// meme absente de la majorite d'entre elles est un trou dans le CV, et c'est
// alors la chose a corriger en premier. On prend la majorite stricte.
const PART_RECURRENTE = 0.5;

// Idem pour le niveau : c'est la majorite des annonces qui fait le verdict,
// pas la plus ambitieuse du lot.
const PART_NIVEAU = 0.5;

function mediane(nombres) {
  if (!nombres.length) return 0;
  const tri = [...nombres].sort((a, b) => a - b);
  const milieu = Math.floor(tri.length / 2);
  return tri.length % 2
    ? tri[milieu]
    : Math.round((tri[milieu - 1] + tri[milieu]) / 2);
}

// LA MEDIANE, PAS LA MOYENNE
//
// Une seule annonce parfaitement alignee, collee par espoir au milieu de dix
// qui ne le sont pas, remonte une moyenne et cache la situation. La mediane
// decrit la candidature ordinaire, qui est justement celle qui echoue.

// Deux libelles differents pour la meme exigence ne doivent pas compter pour
// deux. On compare sur une forme reduite, sans accents ni ponctuation.
function reduire(mot) {
  return String(mot || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// LE NIVEAU VIENT D'UN MODELE, DONC ON NE FAIT PAS CONFIANCE AU LIBELLE
//
// Le schema garantit qu'un texte arrive, pas lequel. On a prefere une chaine
// libre a un enum : une valeur refusee par l'API ferait echouer l'appel
// entier, ce qui est pire que pas de contrainte du tout. La consigne demande
// trois mots precis, et ce qui arrive quand meme de travers retombe ici sur
// "au niveau", le cas qui n'accuse personne.
function niveauDe(annonce) {
  const v = reduire(annonce && annonce.niveau);
  if (v === "dessus" || v === "above") return "dessus";
  if (v === "dessous" || v === "below") return "dessous";
  return "niveau";
}

/**
 * Reads a batch of ads the person applied to and heard nothing from.
 *
 * @param {Array} annonces one entry per ad, as read by the model:
 *        { titre, entreprise, score, niveau: "dessous"|"niveau"|"dessus",
 *          manques: string[] }
 * @returns {{cause: string, annonces: number, mediane: number,
 *            manquesRecurrents: Array<{quoi: string, sur: number}>,
 *            tropHaut: number, exemples: Array}}
 *          cause is one of: "pas_assez", "niveau", "ciblage", "mots_cles",
 *          "ailleurs".
 */
export function pourquoiPasDentretien(annonces) {
  const lues = Array.isArray(annonces) ? annonces.filter(Boolean) : [];

  const scores = lues
    .map((a) => Number(a.score))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 100);

  const med = mediane(scores);
  const tropHaut = lues.filter((a) => niveauDe(a) === "dessus").length;

  // Chaque exigence manquante, comptee sur le nombre d'annonces ou elle
  // manque. On garde le libelle tel qu'il a ete lu la premiere fois : c'est
  // celui que la personne va relire.
  const compte = new Map();
  for (const a of lues) {
    const vus = new Set();
    for (const m of Array.isArray(a.manques) ? a.manques : []) {
      const cle = reduire(m);
      if (!cle || vus.has(cle)) continue;
      vus.add(cle);
      const dejaVu = compte.get(cle);
      compte.set(cle, { quoi: dejaVu ? dejaVu.quoi : String(m), sur: (dejaVu ? dejaVu.sur : 0) + 1 });
    }
  }
  const manquesRecurrents = [...compte.values()]
    .filter((x) => lues.length && x.sur / lues.length > PART_RECURRENTE)
    .sort((a, b) => b.sur - a.sur);

  const base = {
    annonces: lues.length,
    mediane: med,
    manquesRecurrents,
    tropHaut,
    // Les deux annonces les plus basses : ce sont elles que la personne doit
    // regarder pour se convaincre, pas une moyenne.
    exemples: [...lues]
      .filter((a) => Number.isFinite(Number(a.score)))
      .sort((a, b) => Number(a.score) - Number(b.score))
      .slice(0, 2),
  };

  // ON NE SE PRONONCE PAS SUR TROP PEU
  //
  // Rendre un verdict sur deux annonces serait le meme defaut que le produit
  // corrige ailleurs : affirmer plus que ce que la matiere permet.
  if (lues.length < MINIMUM_ANNONCES) {
    return { ...base, cause: "pas_assez" };
  }

  // L'ORDRE DES TESTS EST LE VERDICT
  //
  // Le niveau passe avant le ciblage, et le ciblage avant les mots. Viser
  // au-dessus de son dossier produit un score bas, donc les deux premieres
  // causes se ressemblent dans les chiffres ; mais on ne repond pas la meme
  // chose. "Tu vises trop haut" se corrige en changeant de poste vise, "ce
  // n'est pas le meme metier" en changeant de secteur, et dire le second
  // quand c'est le premier envoie quelqu'un reecrire un CV qui allait bien.
  if (tropHaut / lues.length > PART_NIVEAU) {
    return { ...base, cause: "niveau" };
  }
  if (med < SCORE_HORS_CIBLE) {
    return { ...base, cause: "ciblage" };
  }
  if (manquesRecurrents.length) {
    return { ...base, cause: "mots_cles" };
  }

  // LE CAS OU LE CV N'EST PAS EN CAUSE, ET IL FAUT LE DIRE
  //
  // Le score est bon, le niveau tient, rien ne manque deux fois. Un produit
  // qui vend de la reecriture a tout interet a trouver quelque chose ici, et
  // c'est exactement pour ca qu'il ne faut pas. Ce qui reste, la quantite,
  // le canal, la relance, le reseau, ne se lit pas dans une annonce, et la
  // personne merite de l'apprendre plutot que de recevoir une douzieme
  // version d'un CV qui allait bien.
  return { ...base, cause: "ailleurs" };
}
