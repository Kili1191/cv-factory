// Ce que l'ATS compare, et ce que le recruteur voit en six secondes.
//
// LA MOITIE QUI MANQUAIT
//
// atsParser et atsFidelity repondent a "la machine lit-elle bien le CV ?".
// Ce fichier repond a l'autre moitie : "le classe-t-elle en haut de la pile ?".
// Ce sont deux problemes distincts. Un CV parfaitement lisible peut finir
// 200e parce qu'il n'emploie aucun des mots de l'annonce.
//
// CE QUI PESE VRAIMENT, ET POURQUOI
//
//   1. L'INTITULE. C'est le signal individuel le plus lourd chez Workday et
//      iCIMS : un ecart meme leger fait chuter le rang. Quelqu'un qui postule
//      "Bar Manager" avec "Assistant Bar Manager" en tete de CV perd des
//      places sur un mot.
//
//   2. LA FORMULATION EXACTE. Taleo indexe en booleen : "project management"
//      et "program management" ne se rencontrent jamais. Greenhouse a une
//      couche semantique, les autres non. On ne peut donc pas compter sur la
//      machine pour deviner les equivalences - c'est au CV de parler leur
//      langue.
//
// CE QUE CE FICHIER NE FAIT PAS, ET NE FERA JAMAIS
//
// Il ne fabrique aucun texte cache, aucun mot-clef que l'humain ne verrait
// pas. Tromper le tri sur ce que quelqu'un a reellement fait, c'est une
// fausse declaration dans un recrutement - et ca se repere : les ATS
// extraient le texte, pas l'image, donc du blanc sur blanc ressort en clair.
//
// Ce qu'il fait, c'est montrer l'ecart : les mots de l'annonce absents du CV,
// et surtout ceux que la personne a DEJA mais nomme autrement. La plupart du
// temps l'experience est la, elle porte juste un autre nom.

// --- outils de texte ---------------------------------------------------

// Sans accents, sans casse, ponctuation ramenee a des espaces. C'est la forme
// sous laquelle on compare : "Gestion d'equipe" et "gestion d equipe" doivent
// se reconnaitre.
export function fold(s) {
  return String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, " ")
    // Le point disparait SAUF entre deux caracteres, pour garder "node.js"
    // et "3.5" intacts tout en supprimant les points de fin de phrase.
    .replace(/\.(?![a-z0-9])/g, " ")
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Mots vides des deux langues du produit. Une liste courte suffit : on ne
// cherche pas a analyser la langue, seulement a ne pas proposer "avec" comme
// mot-clef manquant.
const VIDES = new Set((
  "le la les un une des du de d au aux et ou mais donc or ni car a en dans sur "
  + "sous pour par avec sans chez vers ce cet cette ces son sa ses leur leurs "
  + "notre nos votre vos mon ma mes ton ta tes qui que quoi dont ou est sont "
  + "etre avoir fait faire plus moins tres tout tous toute toutes meme aussi "
  + "the a an and or but so of in on at to for with without from by as is are "
  + "be been being have has had will would can could should this that these "
  + "those it its their our your my we you they he she i not no yes if then "
  + "than when where which who whom whose all any some more most other such "
  + "you ll we ll ii iii etc via per"
).split(" "));

function estVide(m) { return !m || m.length < 3 || VIDES.has(m); }

// --- intitule de poste --------------------------------------------------

// L'intitule d'une annonce est presque toujours dans ses premieres lignes.
// On prend la premiere ligne courte et non vide : les annonces commencent par
// le titre, pas par un paragraphe.
export function titreDeLAnnonce(annonce) {
  const lignes = String(annonce || "").split(/\r?\n/)
    .map(l => l.trim()).filter(Boolean);
  for (const l of lignes.slice(0, 6)) {
    const nu = l.replace(/^(poste|offre|job|role|title|intitule)\s*[:\-]\s*/i, "").trim();
    // Une ligne de titre est courte et n'est pas une phrase.
    if (nu.length >= 3 && nu.length <= 70 && !/[.!?]$/.test(nu)) return nu;
  }
  return "";
}

/**
 * L'intitule vise apparait-il en tete du CV ?
 *
 * On ne regarde QUE le titre et le resume : c'est la zone que les ATS pesent
 * le plus lourd, et c'est aussi ce que l'oeil lit en premier. Un intitule
 * enterre dans la troisieme experience ne compte pas.
 */
export function titreEnTete(cv, annonce) {
  const vise = titreDeLAnnonce(annonce);
  if (!vise) return { vise: "", present: true, actuel: String((cv && cv.title) || "") };

  const vf = fold(vise);
  const actuel = String((cv && cv.title) || "");
  const af = fold(actuel);
  const tete = fold([cv && cv.title, cv && cv.summary].filter(Boolean).join(" "));

  // TROIS ETATS, PAS UN BOOLEEN
  //
  // Un booleen disait "present" pour "Assistant Bar Manager" face a une
  // annonce "Bar Manager", puisque la chaine contient bien la chaine. C'est
  // pourtant le cas qui coute le plus cher : l'intitule est le signal le plus
  // lourd, et un ecart de seniorite se paye au classement.
  //
  //   exact    l'intitule du CV est celui de l'annonce
  //   proche   il le contient mais dit autre chose en plus (Assistant, Senior,
  //            Junior...). A signaler, pas a taire.
  //   absent   l'expression ne figure ni dans le titre ni dans le resume
  let etat;
  if (!vf) etat = "exact";
  else if (af === vf) etat = "exact";
  else if (af.includes(vf) || vf.includes(af)) etat = "proche";
  else if (tete.includes(vf)) etat = "proche";
  else etat = "absent";

  return {
    vise,
    actuel,
    etat,
    // Conserve pour les appelants qui ne veulent qu'un oui/non : seul "exact"
    // ne demande aucune action.
    present: etat === "exact",
  };
}

// --- phrases-clefs de l'annonce ----------------------------------------

/**
 * Les expressions de l'annonce qui valent la peine d'etre reprises.
 *
 * On extrait des groupes de deux et trois mots plutot que des mots isoles :
 * "stock" tout seul ne veut rien dire, "stock control" oui. Une expression
 * repetee dans l'annonce compte double - une annonce qui dit trois fois
 * "team leadership" ne le dit pas par hasard.
 */
export function phrasesClefs(annonce, max = 24) {
  if (!annonce) return [];
  const compte = new Map();
  const ajoute = (p) => compte.set(p, (compte.get(p) || 0) + 1);

  // ON NE TRAVERSE PAS UNE FIN DE PHRASE
  //
  // En decoupant l'annonce entiere en suites de mots, on fabriquait des
  // expressions qui n'existent nulle part : "beverage team. responsibilities"
  // enjambe un point et un titre de section, "bar manager soho" enjambe une
  // ligne. Proposer ca comme mot-clef manquant fait perdre confiance dans tout
  // le reste du panneau.
  const segments = String(annonce)
    .split(/[\r\n]+|(?<=[.!?;:])\s+/)
    .map(fold).filter(Boolean);

  for (const seg of segments) {
    const mots = seg.split(" ");
    for (let i = 0; i < mots.length; i++) {
      if (estVide(mots[i])) continue;
      ajoute(mots[i]);
      if (i + 1 < mots.length && !estVide(mots[i + 1])) {
        ajoute(mots[i] + " " + mots[i + 1]);
        if (i + 2 < mots.length && !estVide(mots[i + 2])) {
          ajoute(mots[i] + " " + mots[i + 1] + " " + mots[i + 2]);
        }
      }
    }
  }

  const classees = [...compte.entries()]
    // Un groupe de plusieurs mots vaut plus qu'un mot seul a frequence egale :
    // c'est lui qui porte le sens, et c'est lui que Taleo cherche en exact.
    .map(([p, n]) => ({ phrase: p, poids: n * (p.includes(" ") ? 2.2 : 1) }))
    .filter(x => x.poids >= 2)
    // A poids egal, la PLUS COURTE gagne. "full stock control" et "stock
    // control" pesent pareil, mais c'est le second que cherche un index
    // booleen et que le CV a une chance de contenir : "full" est un adverbe
    // de l'annonce, pas une competence.
    .sort((a, b) => b.poids - a.poids || a.phrase.length - b.phrase.length);

  // UNE IDEE, UNE LIGNE
  //
  // Les suites de deux et trois mots se recouvrent : une annonce qui dit
  // "deliver exceptional guest experience" produit "deliver exceptional",
  // "exceptional guest", "exceptional guest experience"... Quatre lignes pour
  // une seule chose a corriger. On ne garde que la plus longue de chaque
  // famille : c'est celle qui porte le sens, et celle qu'un index booleen
  // cherche telle quelle.
  // Le recouvrement se coupe dans LES DEUX SENS. En ne supprimant que les
  // sous-expressions, "bar manager" et "experienced bar manager" survivaient
  // tous les deux. On garde la mieux classee - la plus frequente, donc celle
  // que l'annonce martele - et on ecarte tout ce qui la contient ou qu'elle
  // contient.
  const gardees = [];
  for (const x of classees) {
    if (gardees.some(g => g.includes(x.phrase) || x.phrase.includes(g))) continue;
    gardees.push(x.phrase);
    if (gardees.length >= max) break;
  }
  return gardees;
}

// --- tout le texte du CV, comme l'ATS le voit --------------------------

export function texteDuCv(cv) {
  if (!cv || typeof cv !== "object") return "";
  const bouts = [cv.title, cv.summary, cv.location];
  for (const e of cv.experience || []) {
    bouts.push(e.title, e.company, e.location, ...(e.bullets || []));
  }
  for (const e of cv.education || []) bouts.push(e.degree, e.school);
  bouts.push(...(cv.skills || []), ...(cv.certifications || []));
  for (const l of cv.languages || []) bouts.push(l.lang, l.level);
  return fold(bouts.filter(Boolean).join(" "));
}

// --- l'ecart ------------------------------------------------------------

/**
 * Ce que l'annonce demande et que le CV ne dit pas.
 *
 * Rend deux listes, et la seconde est la plus utile :
 *
 *   manquantes : l'expression n'apparait nulle part. Soit la personne ne l'a
 *                pas, soit elle ne l'a pas ecrite.
 *   aReformuler : tous les mots de l'expression sont dans le CV, mais pas
 *                 dans cet ordre. C'est le cas le plus frequent et le plus
 *                 injuste : l'experience est la, elle porte un autre nom, et
 *                 un index booleen ne les rapproche jamais.
 */
export function ecartMotsClefs(cv, annonce, max = 24) {
  const clefs = phrasesClefs(annonce, max);
  const texte = texteDuCv(cv);
  if (!texte) return { manquantes: clefs, aReformuler: [] };

  const manquantes = [];
  const aReformuler = [];

  for (const p of clefs) {
    if (texte.includes(p)) continue;
    const mots = p.split(" ");
    const tousPresents = mots.every(m => new RegExp(`\\b${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(texte));
    if (tousPresents && mots.length > 1) aReformuler.push(p);
    else manquantes.push(p);
  }
  return { manquantes, aReformuler };
}

// --- ce qui sent la machine --------------------------------------------

// Les recruteurs rejettent desormais activement les CV qui sentent le texte
// genere sans relecture. Ce ne sont pas des fautes : ce sont des tics. Un
// humain qui ecrit son CV n'ecrit pas "passionne par l'excellence
// operationnelle" trois fois.
const TICS = [
  { motif: /\bspearhead(ed|ing)?\b/i, quoi: "spearheaded" },
  { motif: /\bleverag(e|ed|ing)\b/i, quoi: "leverage" },
  { motif: /\bsynerg(y|ies|istic)\b/i, quoi: "synergy" },
  { motif: /\bpassionate about\b/i, quoi: "passionate about" },
  { motif: /\bresults?-driven\b/i, quoi: "results-driven" },
  { motif: /\bdynamic professional\b/i, quoi: "dynamic professional" },
  { motif: /\bproven track record\b/i, quoi: "proven track record" },
  { motif: /\bpassionne par\b/i, quoi: "passionne par" },
  { motif: /\bforce de proposition\b/i, quoi: "force de proposition" },
  { motif: /\bexcellence operationnelle\b/i, quoi: "excellence operationnelle" },
  { motif: /\bveritable atout\b/i, quoi: "veritable atout" },
  // Le cadratin et le demi-cadratin : la ponctuation qui trahit une machine
  // avant meme qu'on ait lu la phrase.
  { motif: new RegExp(String.fromCharCode(0x2014) + "|" + String.fromCharCode(0x2013)), quoi: "tiret long" },
];

export function ticsDeMachine(cv) {
  const brut = [
    cv && cv.summary,
    ...((cv && cv.experience) || []).flatMap(e => e.bullets || []),
  ].filter(Boolean).join(" ");
  const vus = [];
  for (const t of TICS) if (t.motif.test(brut)) vus.push(t.quoi);
  return vus;
}

// --- le rapport complet -------------------------------------------------

/**
 * Tout ce qu'on peut dire d'un CV face a une annonce, sans rien inventer.
 * Aucun effet de bord, aucun appel reseau : c'est interrogeable par un test.
 */
export function rapport(cv, annonce) {
  const titre = titreEnTete(cv, annonce);
  const ecart = ecartMotsClefs(cv, annonce);
  const tics = ticsDeMachine(cv);
  return {
    titre,
    manquantes: ecart.manquantes,
    aReformuler: ecart.aReformuler,
    tics,
    // Un compte, pas une note sur 100 : une note laisse croire a une precision
    // qu'on n'a pas, et pousse a optimiser le chiffre plutot que le CV.
    aCorriger: (titre.present ? 0 : 1) + ecart.aReformuler.length + tics.length,
  };
}
