// CE QUE CHAQUE LOGICIEL DE TRI RETIENT DU MEME CV.
//
// CE QUE CE FICHIER EST, ET CE QU'IL N'EST PAS
//
// Il n'est pas le code de Workday, et il ne rend pas "la note Workday". Cette
// note n'existe pas : Workday, Taleo, Greenhouse, iCIMS et Lever ne notent
// pas un CV tout seul et n'affichent aucun chiffre au candidat. Ils extraient
// des champs, puis classent le candidat CONTRE UNE OFFRE PRECISE selon des
// criteres que l'employeur regle lui-meme. Aucune API publique ne rend un tel
// nombre, et pretendre le contraire reviendrait a l'inventer.
//
// Ce fichier fait la seule chose honnete et utile a la place : il rejoue, sur
// le texte reellement extrait du PDF, les regles d'analyse que ces logiciels
// appliquent et les modes d'echec qu'on leur connait. Chaque profil dit quelle
// exigence est dure et laquelle est souple. Le resultat n'est pas une opinion
// sur le CV : c'est le compte de ce qu'un analyseur retrouve, et de ce qu'il
// perd.
//
// POURQUOI NUVI PEUT LE FAIRE ET PAS LES AUTRES
//
// Les outils qui vendent un "score ATS" n'ont que le PDF : ils devinent ce que
// le candidat voulait dire. L'application, elle, detient le CV sous forme de
// donnees AVANT de fabriquer le fichier. On exporte, on relit avec un vrai
// analyseur, et on compare champ par champ a la verite. Soit l'employeur est
// retrouve, soit il ne l'est pas.
//
// TOUT EST DETERMINISTE
//
// Aucun appel a un modele. Le meme texte rend toujours exactement le meme
// rapport, et chaque verdict arrive avec le fait qui le justifie. Une note qui
// bouge sans que rien n'ait change n'est pas une mesure.

import { parseResume, fold } from "./atsParser.js";

// Les intitules de section qu'un analyseur reconnait. Un analyseur ne
// comprend pas une rubrique, il la reconnait dans une liste : "Where I have
// been" ne sera jamais une experience professionnelle, quel qu'en soit le
// contenu. C'est le mode d'echec le plus courant et le plus invisible, parce
// que la rubrique s'affiche parfaitement a l'ecran.
const RUBRIQUES_STANDARD = [
  "experience", "work experience", "professional experience", "employment",
  "employment history", "work history",
  "education", "academic",
  "skills", "technical skills",
  "certifications", "licenses",
  "summary", "profile", "objective",
  // CONTACT et LANGUAGES manquaient, et ce sont deux des rubriques les plus
  // courantes qui soient : un CV parfaitement standard etait signale comme
  // portant une rubrique inventee, et echouait chez quatre profils sur six.
  // Un controle qui refuse un document correct ne garde rien, il fait du
  // bruit et on cesse de le lire.
  "contact", "contact details", "personal details",
  "languages", "interests", "references", "achievements", "projects",
  // Les equivalents francais, pour un CV depose sur un ATS configure en France.
  "experience professionnelle", "experiences professionnelles",
  "formation", "formations", "competences", "langues", "profil",
  "coordonnees", "centres d interet", "interets", "realisations", "projets",
];

// Une periode qu'un analyseur sait lire. Il cherche deux reperes temporels ou
// un repere et un mot de continuite ; "depuis toujours" n'en est pas un.
const MOTS_EN_COURS = [
  "present", "current", "now", "to date", "ongoing",
  "aujourd hui", "aujourdhui", "en cours", "actuel",
];
const ANNEE = /(?:19|20)\d{2}/g;

export function periodeLisible(texte) {
  const t = String(texte || "");
  const annees = t.match(ANNEE) || [];
  if (annees.length >= 2) return true;
  if (annees.length === 1) {
    const nu = fold(t);
    return MOTS_EN_COURS.some((m) => nu.includes(fold(m)));
  }
  return false;
}

// LES PROFILS
//
// La severite de chacun vient de son comportement documente et observable, pas
// d'un classement invente. Les differences reelles entre ces produits tiennent
// a trois choses : la tolerance aux rubriques non standard, l'exigence d'une
// date lisible sur chaque poste, et la tolerance a un ordre de lecture casse
// par une mise en page a colonnes.
//
// `dur` : sans ce point, l'analyseur perd l'information, et le candidat est
//         invisible sur une recherche portant dessus.
// `souple` : degrade le classement sans faire disparaitre le candidat.
export const PROFILS = [
  {
    id: "workday",
    nom: "Workday",
    // Le plus repandu chez les grands employeurs, et celui qui demande le plus
    // souvent de ressaisir tout le CV a la main juste apres l'avoir depose :
    // c'est le signe que son extraction est prudente et qu'elle abandonne vite
    // ce qu'elle ne sait pas ranger.
    exige: ["nom", "email", "rubriques", "dates", "ordre"],
    tolere: ["telephone"],
  },
  {
    id: "taleo",
    nom: "Taleo (Oracle)",
    // Le plus ancien du lot, et le plus strict. Les mises en page a colonnes,
    // les tableaux et les rubriques inventees lui font perdre des blocs
    // entiers sans que rien ne le signale.
    exige: ["nom", "email", "telephone", "rubriques", "dates", "ordre", "employeurs"],
    tolere: [],
  },
  {
    id: "icims",
    nom: "iCIMS",
    exige: ["nom", "email", "rubriques", "dates"],
    tolere: ["telephone", "ordre"],
  },
  {
    id: "successfactors",
    nom: "SAP SuccessFactors",
    exige: ["nom", "email", "rubriques", "employeurs"],
    tolere: ["telephone", "ordre", "dates"],
  },
  {
    id: "greenhouse",
    nom: "Greenhouse",
    // Plus recent, il indexe le texte entier et se repose moins sur un
    // decoupage parfait : une rubrique inhabituelle lui coute moins cher.
    exige: ["nom", "email"],
    tolere: ["telephone", "rubriques", "dates", "ordre", "employeurs"],
  },
  {
    id: "lever",
    nom: "Lever",
    exige: ["nom", "email"],
    tolere: ["telephone", "rubriques", "dates", "ordre", "employeurs"],
  },
];

// LES CONTROLES
//
// Chacun rend { ok, fait } : le fait est la mesure qui justifie le verdict, et
// il doit se verifier d'un coup d'oeil. "3 postes sur 5 sans date lisible" se
// corrige ; "ameliore tes dates" ne se verifie pas.
function controles(cv, parsed, texte) {
  const lignes = String(texte || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const nu = fold(texte || "");

  // L'ordre de lecture. Une bande laterale rangee en premier dans le document
  // fait commencer le texte par CONTACT et les competences : le nom du
  // candidat arrive apres, et l'analyseur prend les premieres lignes pour
  // l'identite.
  const posNom = cv && cv.name ? nu.indexOf(fold(cv.name)) : -1;
  const posContact = nu.search(/contact|competences|skills/);

  const postes = (cv && Array.isArray(cv.experience) ? cv.experience : []);
  const sansDate = postes.filter((e) => !periodeLisible(
    [e && e.period, e && e.start, e && e.end].filter(Boolean).join(" ")
  ));
  const employeursPerdus = postes.filter(
    (e) => e && e.company && !nu.includes(fold(e.company))
  );

  const rubriquesVues = (parsed.sectionsFound || []);
  const rubriquesNonStandard = lignes.filter((l) => {
    // Une ligne courte et isolee, tout en majuscules ou suivie d'un bloc, se
    // lit comme un intitule de rubrique. On ne retient que celles-la.
    if (l.length > 34 || l.split(/\s+/).length > 4) return false;
    if (!/^[\p{Lu}\s'&-]+$/u.test(l)) return false;
    return !RUBRIQUES_STANDARD.some((r) => fold(l) === fold(r));
  });

  return {
    nom: {
      ok: !!(parsed.name && cv && cv.name && fold(parsed.name).includes(fold(cv.name).split(" ")[0])),
      fait: parsed.name ? 'lu comme "' + parsed.name + '"' : "aucun nom retrouve",
    },
    email: {
      ok: !!parsed.email,
      fait: parsed.email ? parsed.email : "aucune adresse lisible",
    },
    telephone: {
      ok: !!parsed.phone,
      fait: parsed.phone ? parsed.phone : "aucun numero lisible",
    },
    rubriques: {
      ok: rubriquesVues.length >= 2 && rubriquesNonStandard.length === 0,
      fait: rubriquesVues.length + " rubrique(s) reconnue(s)"
        + (rubriquesNonStandard.length
          ? ", non reconnue(s) : " + rubriquesNonStandard.slice(0, 3).join(", ")
          : ""),
    },
    dates: {
      ok: postes.length > 0 && sansDate.length === 0,
      fait: postes.length
        ? (postes.length - sansDate.length) + " poste(s) sur " + postes.length
          + " avec une periode lisible"
        : "aucun poste",
    },
    employeurs: {
      ok: postes.length > 0 && employeursPerdus.length === 0,
      fait: employeursPerdus.length
        ? "employeur(s) introuvable(s) dans le texte : "
          + employeursPerdus.map((e) => e.company).slice(0, 3).join(", ")
        : postes.length + " employeur(s) retrouve(s)",
    },
    ordre: {
      ok: posNom >= 0 && (posContact < 0 || posNom < posContact),
      fait: posNom < 0
        ? "le nom n'apparait pas dans le texte extrait"
        : (posContact >= 0 && posNom > posContact
          ? "le texte commence par le bloc contact, le nom arrive apres"
          : "le nom vient en premier"),
    },
  };
}

/**
 * Rejoue le CV dans chaque profil.
 *
 * @param {object} cv     le CV tel que l'application le detient (la verite)
 * @param {string} texte  le texte reellement extrait du PDF exporte
 * @returns {{ profils: Array, pire: object, controles: object }}
 */
export function lireCommeLesAts(cv, texte) {
  const parsed = parseResume(texte);
  const c = controles(cv, parsed, texte);

  const profils = PROFILS.map((p) => {
    const durs = p.exige.filter((k) => c[k] && !c[k].ok);
    const souples = p.tolere.filter((k) => c[k] && !c[k].ok);
    return {
      id: p.id,
      nom: p.nom,
      // "passe" veut dire : cet analyseur retrouve tout ce dont il a besoin
      // pour que le candidat sorte sur une recherche. Ce n'est pas une note
      // de qualite du CV, et ce n'est pas une promesse d'entretien.
      passe: durs.length === 0,
      bloquants: durs.map((k) => ({ quoi: k, fait: c[k].fait })),
      degradations: souples.map((k) => ({ quoi: k, fait: c[k].fait })),
    };
  });

  // Le profil le plus severe qui echoue : c'est lui qui dit ce qu'il faut
  // corriger en premier, parce que le corriger fait passer tous les autres.
  const pire = profils.find((p) => !p.passe) || null;

  return { profils, pire, controles: c, parsed };
}
