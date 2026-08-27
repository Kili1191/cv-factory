/**
 * CE QU'UN LOGICIEL DE TRI SAIT RANGER, MOT A MOT
 *
 * La vitrine montrait une phrase ecrite d'avance mourir sous une ligne de
 * lecture. C'etait une demonstration ; ca restait la demonstration de
 * quelqu'un d'autre. Ce fichier permet de la faire sur LA phrase du visiteur,
 * dans son navigateur, sans appel reseau et sans cout : on ne peut pas
 * facturer une page d'accueil, et on ne veut pas envoyer le CV d'un inconnu
 * a une IA pour lui vendre un produit.
 *
 * TROIS ETATS, PAS DEUX
 *
 * On a d'abord ecrit deux etats : retenu, ecarte. C'etait faux dans un sens
 * qui compte. "and", "with", "de", "la" ne sont pas ECARTES par un logiciel
 * de tri au sens ou l'entend un candidat : ils n'ont jamais ete candidats.
 * Les compter comme des pertes gonflait le chiffre et rendait la
 * demonstration malhonnete - or tout le produit repose sur le fait qu'on ne
 * gonfle rien.
 *
 *   0 - RETENU  : la machine sait ou le mettre (un chiffre, un metier, une
 *                 competence, un nom de chose).
 *   1 - ECARTE  : un vrai mot, choisi par le candidat, que la machine n'a
 *                 nulle part ou ranger. C'est la perte, et c'est le sujet.
 *   2 - LIANT   : la grammaire. Ni retenu ni perdu, elle n'a jamais pese.
 *
 * Le chiffre annonce ne compte que les ECARTES. Il est plus petit que
 * "tous les mots sauf un", et il est vrai.
 */

import { fold } from "./atsMatch.js";

// Le liant. Aucun index n'en fait quoi que ce soit, et personne n'a jamais
// perdu un entretien a cause de "the".
const LIANT = new Set((
  "the a an and or but so of in on at to for with without from by as is are "
  + "was were be been being have has had do does did will would shall can "
  + "could should may might this that these those it its their our your my "
  + "we you they he she i me him her not no nor if then than when where "
  + "while which who whom whose all any some more most other such per via "
  + "etc about into over under between during after before again once here "
  + "there very too also just only own same s t ll re ve "
  + "le la les un une des du de d au aux et ou mais donc or ni car en dans "
  + "sur sous pour par avec sans chez vers ce cet cette ces son sa ses leur "
  + "leurs notre nos votre vos mon ma mes ton ta tes qui que quoi dont est "
  + "sont etre avoir ete plus moins tres tout tous toute toutes meme aussi "
  + "il elle je nous vous ils elles on ne pas y l n c j m qu lui se sy"
).split(/\s+/).filter(Boolean));

// LES MOTS QUI ONT L'AIR DE DIRE QUELQUE CHOSE
//
// Ce sont eux, le sujet de la page. Un candidat les choisit, les relit, en
// est fier - et un logiciel de tri n'a aucun champ ou les mettre. Ils ne
// sont pas mal ecrits. Ils sont non classables : ni intitule, ni competence,
// ni chiffre, ni outil, ni employeur.
const MOU = new Set((
  // l'auto-portrait
  "passionate passionately passion hardworking dedicated motivated committed "
  + "enthusiastic enthusiastically dynamic driven reliable dependable punctual "
  + "friendly outgoing personable proactive flexible adaptable ambitious "
  + "conscientious diligent meticulous versatile energetic positive hands "
  + "detail oriented selfmotivated selfstarter teamplayer "
  // les mots-valises
  + "professional professionalism experience experienced expertise background "
  + "career profile summary objective challenge challenges challenging "
  + "business results result success successful successfully achievement "
  + "achievements excellent excellence outstanding exceptional great good "
  + "strong solid proven track record quality environment "
  + "opportunity opportunities role responsibilities responsible duties "
  + "various several many numerous wide range variety plenty lots "
  + "decade decades "
  // les verbes qui ne prouvent rien
  + "loves love loved enjoy enjoys enjoyed improved improve improving helped "
  + "help helping worked work working ensured ensure ensuring provided "
  + "provide providing assisted assist assisting handled handle handling "
  + "involved involving dealt dealing utilised utilized leveraged "
  + "spearheaded participated contributed supported "
  // l'equivalent francais
  + "passionne passionnee passion dynamique motive motivee motives serieux "
  + "serieuse rigoureux rigoureuse autonome polyvalent polyvalente "
  + "consciencieux consciencieuse ponctuel ponctuelle souriant souriante "
  + "professionnel professionnelle professionnalisme experience experiences "
  + "parcours profil objectif defi defis resultat resultats reussite "
  + "reussites excellente excellent veritable atout atouts qualite qualites "
  + "environnement mission missions poste postes taches diverses divers "
  + "plusieurs nombreux nombreuses large gamme decennie decennies "
  + "aime aimant adore ameliore ameliorer amelioration aide aider aidant "
  + "travaille travailler travaillant assure assurer assurant participe "
  + "participer contribue contribuer gere gerer gerant permis permettre"
).split(/\s+/).filter(Boolean));

// Un mot qui porte un chiffre est toujours range : un index sait quoi faire
// d'un pourcentage, d'un montant, d'une duree, d'un effectif. C'est la raison
// pour laquelle le produit pousse les candidats a en mettre.
function porteUnChiffre(brut) { return /\d/.test(brut); }

/**
 * Classe un mot. `brut` garde sa ponctuation pour l'affichage ; la decision
 * se prend sur la forme repliee, sans accent ni ponctuation.
 */
export function etatDuMot(brut) {
  const nu = fold(String(brut)).replace(/[^a-z0-9]+/g, "");
  if (!nu) return 2;
  if (porteUnChiffre(brut)) return 0;
  if (LIANT.has(nu)) return 2;
  if (MOU.has(nu)) return 1;
  // Un mot de deux lettres qui n'est pas dans le liant n'est pas un mot-clef
  // metier : c'est presque toujours une abreviation de grammaire.
  if (nu.length <= 2) return 2;
  return 0;
}

/**
 * Lit une phrase comme le ferait un logiciel de tri.
 *
 * Rend exactement la forme que la vitrine sait deja afficher - des lignes de
 * { m, f } - pour que la demonstration ecrite d'avance et celle du visiteur
 * passent par le meme rendu, et donc ne puissent pas diverger.
 *
 * @param {string} texte
 * @param {number} parLigne  mots par ligne, pour que la phrase respire
 */
export function lireCommeUneMachine(texte, parLigne = 7) {
  const mots = String(texte || "").trim().split(/\s+/).filter(Boolean).slice(0, 60);
  const lignes = [];
  for (let i = 0; i < mots.length; i += parLigne) {
    lignes.push(mots.slice(i, i + parLigne).map((m) => ({ m, f: etatDuMot(m) })));
  }
  const plats = lignes.flat();
  return {
    lignes,
    total: plats.length,
    ecartes: plats.filter((x) => x.f === 1).length,
    retenus: plats.filter((x) => x.f === 0).map((x) => x.m.replace(/[.,;:!?]+$/, "")),
  };
}
