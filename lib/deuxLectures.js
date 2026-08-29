// UN CV EST LU DEUX FOIS, PAR DEUX LECTEURS QUI NE CHERCHENT PAS LA MEME CHOSE.
//
// D'abord un logiciel, qui ne juge rien : il essaie de RANGER le document en
// champs. S'il n'y arrive pas, la personne n'existe pas dans la base, et
// aucune qualite du texte ne la rattrape.
//
// Ensuite un humain, qui ne range rien : il cherche en quelques secondes une
// raison d'appeler. Un CV parfaitement range peut n'en donner aucune.
//
// Les deux lectures se contredisent souvent, et c'est pour ca qu'il en faut
// deux. Bourrer un CV de mots-cles fait monter la premiere et descendre la
// seconde. Une accroche brillante et vague fait l'inverse. Une note unique
// moyennerait ces deux mouvements et cacherait le seul renseignement utile :
// lequel des deux lecteurs vous perd.
//
// TOUT SE COMPTE, RIEN NE SE DEVINE
//
// Aucun appel a un modele, ici ni ailleurs dans ce fichier. Le meme CV rend
// toujours exactement le meme couple de notes, et chaque note arrive avec les
// mesures qui la composent. Une note qui bouge sans que rien n'ait change
// n'est pas une mesure, c'est un tirage.

import { diagnostiquer } from "./diagnostic.js";
import { lireCommeLesAts, PROFILS } from "./atsVendors.js";

function borne(n) { return Math.max(0, Math.min(100, Math.round(n))); }

// CE QUE L'HUMAIN REGARDE, ET AVEC QUEL POIDS
//
// Les poids ne sont pas ceux du diagnostic general : un recruteur et un
// logiciel n'ont pas les memes priorites. Ce qui decide d'un appel, dans
// l'ordre, c'est la preuve chiffree, puis l'absence de formules creuses, puis
// ce qui n'appartient qu'a cette personne. La mise en page vient loin
// derriere : elle se remarque, elle ne convainc pas.
//
// L'axe "ats" est volontairement absent. Il appartient a l'autre lecture, et
// le compter deux fois ferait monter les deux notes ensemble alors que leur
// interet est justement de pouvoir diverger.
const POIDS_HUMAIN = {
  bullets: 1.7,          // la preuve : des puces qui portent des chiffres
  credibility: 1.5,      // les formules qui ne prouvent rien
  differentiation: 1.2,  // des faits qui n'appartiennent qu'a cette personne
  title: 1.1,            // sait-on pour quel poste on lit ce CV
  relevance: 1.0,        // le titre et le parcours parlent-ils du meme metier
  readability: 0.9,      // assez a lire, pas trop
  design: 0.6,           // l'equilibre des sections
};

// La note d'un analyseur pris seul.
//
// Un analyseur qui echoue ne "note pas mal" le CV : il perd le candidat. La
// note plafonne donc bas des qu'un point dur manque, parce qu'aucune qualite
// du reste ne compense d'etre absent d'une recherche.
function noteProfil(p) {
  if (!p.passe) return borne(42 - (p.bloquants.length - 1) * 14);
  return borne(100 - p.degradations.length * 11);
}

// Les paliers. Un chiffre seul ne dit pas quoi en faire ; le palier donne la
// phrase, et la phrase dit s'il faut agir.
function palier(note, langue, quiLit) {
  const en = langue === "en";
  if (quiLit === "machine") {
    if (note >= 85) return en ? "Read cleanly everywhere" : "Lu proprement partout";
    if (note >= 70) return en ? "Read, except by the strictest" : "Lu, sauf par les plus stricts";
    if (note >= 50) return en ? "Partly lost" : "En partie perdu";
    return en ? "Lost before a human sees it" : "Perdu avant d'atteindre un humain";
  }
  if (note >= 85) return en ? "Gives a reason to call" : "Donne une raison d'appeler";
  if (note >= 70) return en ? "Solid, not yet striking" : "Solide, pas encore frappant";
  if (note >= 50) return en ? "Readable but interchangeable" : "Lisible mais interchangeable";
  return en ? "Nothing to hold on to" : "Rien a quoi se raccrocher";
}

// Le texte qu'un analyseur verrait, quand on n'a pas encore exporte le PDF.
//
// UNE PREMIERE VERSION A ETE CALIBREE, PUIS CORRIGEE
//
// Elle modelisait la mise en page a bande en rangeant le bloc contact avant
// le nom, en partant du principe qu'une colonne de gauche se lit en premier.
// Le resultat etait spectaculaire et faux : la bande echouait chez les six
// analyseurs, alors que le meme document, exporte pour de vrai, est lu
// correctement par poppler, MuPDF et Tika, avec le nom AVANT le mot CONTACT.
// C'est verifie sur les six mises en page par le test d'export, et cet ordre
// avait ete corrige expres dans la couche de texte du PDF.
//
// Une simulation qui contredit la mesure a tort. Elle aurait fait fuir les
// gens d'une mise en page qui marche, sur la foi d'un chiffre invente. On
// reconstitue donc l'ordre que le produit emet reellement, et le drapeau
// `source` dit que ce texte est reconstitue et non mesure : le verdict
// definitif reste l'export, relu par trois vrais moteurs.
export function texteProbable(cv) {
  const c = cv || {};
  const bloc = (titre, lignes) => [titre, ...lignes.filter(Boolean)];
  const contact = bloc("CONTACT", [c.email, c.phone, c.location, c.linkedin]);
  const competences = bloc("SKILLS", [(c.skills || []).filter(Boolean).join(", ")]);
  const identite = [c.name, c.title].filter(Boolean);
  const experience = ["EXPERIENCE", ...((c.experience) || []).flatMap((e) => [
    [e.title, e.company, e.location].filter(Boolean).join(", "),
    [e.period, e.start && e.end ? e.start + " - " + e.end : ""].filter(Boolean).join(" "),
    ...((e.bullets || []).filter(Boolean)),
  ])];
  const formation = ["EDUCATION", ...((c.education) || []).map(
    (e) => [e.degree, e.school, e.period].filter(Boolean).join(", ")
  )];
  const accroche = c.summary ? ["PROFILE", c.summary] : [];

  // L'identite en premier, quelle que soit la mise en page : c'est ce que le
  // PDF exporte produit reellement, sur les six modeles.
  return [...identite, ...contact, ...accroche, ...experience, ...formation, ...competences]
    .filter(Boolean).join("\n");
}

/**
 * Les deux lectures d'un CV.
 *
 * @param {object} cv        le CV tel que l'application le detient
 * @param {object} [options]
 * @param {string} [options.texte]   le texte reellement extrait d'un PDF, s'il existe
 * @param {string} [options.layout]  la mise en page choisie, pour l'ordre de lecture
 * @param {string} [options.langue]  "fr" | "en"
 */
export function deuxLectures(cv, options = {}) {
  const langue = options.langue === "en" ? "en" : "fr";
  const layout = options.layout || "classic";
  const texte = options.texte || texteProbable(cv);

  const diag = diagnostiquer(cv, langue);
  const parAxe = {};
  for (const s of (diag.scores || [])) parAxe[s.id] = s;

  // ---- LECTURE 1 : LA MACHINE ----
  const ats = lireCommeLesAts(cv, texte);
  const notesProfils = ats.profils.map((p) => ({ ...p, note: noteProfil(p) }));

  // Les six analyseurs pesent pareil. Les parts de marche publiees varient
  // trop d'une source a l'autre pour en tirer une ponderation : en inventer
  // une donnerait a la note une precision qu'elle n'a pas. Ce qui compte se
  // dit autrement, et honnetement : combien en lisent le CV en entier.
  const moyenne = notesProfils.reduce((s, p) => s + p.note, 0) / (notesProfils.length || 1);

  // L'axe ats du diagnostic compte les champs qu'un logiciel cherche et ne
  // devine jamais. Il complete les profils, qui regardent la structure.
  const champs = parAxe.ats ? parAxe.ats.score : 100;
  const noteMachine = borne(moyenne * 0.72 + champs * 0.28);

  const passent = notesProfils.filter((p) => p.passe).length;
  // Le plus severe qui echoue : le corriger fait passer tous les autres, donc
  // c'est la seule chose a dire en premier.
  const premierObstacle = notesProfils.find((p) => !p.passe) || null;

  // ---- LECTURE 2 : L'HUMAIN ----
  let somme = 0, poidsTotal = 0;
  const axesHumains = [];
  for (const [id, poids] of Object.entries(POIDS_HUMAIN)) {
    const a = parAxe[id];
    if (!a) continue;
    somme += a.score * poids;
    poidsTotal += poids;
    // `reco` est la phrase que le diagnostic tire deja de la mesure. La
    // reprendre evite d'ecrire une deuxieme fois, ailleurs, ce que veut dire
    // un axe bas : deux formulations du meme fait finissent par diverger.
    axesHumains.push({ id, note: Math.round(a.score), poids, fait: a.fait, reco: a.reco });
  }
  const noteHumain = borne(poidsTotal ? somme / poidsTotal : 0);

  // Ce qui tire la note humaine vers le bas, du plus couteux au moins
  // couteux : poids multiplie par ce qui manque a 100.
  const aTravailler = axesHumains
    .filter((a) => a.note < 75)
    .sort((a, b) => (b.poids * (100 - b.note)) - (a.poids * (100 - a.note)));

  return {
    machine: {
      note: noteMachine,
      palier: palier(noteMachine, langue, "machine"),
      passent,
      total: notesProfils.length,
      profils: notesProfils,
      premierObstacle,
      champs: parAxe.ats ? parAxe.ats.fait : null,
      // Dit d'ou vient le texte juge : mesure sur un vrai PDF, ou reconstitue.
      source: options.texte ? "pdf" : "reconstitue",
    },
    humain: {
      note: noteHumain,
      palier: palier(noteHumain, langue, "humain"),
      axes: axesHumains,
      aTravailler,
    },
    // Les deux notes divergent souvent, et l'ecart est un renseignement en
    // soi : il dit lequel des deux lecteurs vous perd.
    ecart: noteMachine - noteHumain,
  };
}

export { PROFILS };
