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
  + "you ll we ll ii iii etc via per "
  // Residu d'entite HTML : une annonce collee depuis une page en charrie,
  // et "manchester nbsp" se retrouvait propose comme exigence du poste.
  + "nbsp amp quot apos"
).split(" "));

function estVide(m) { return !m || m.length < 3 || VIDES.has(m); }

// Des intensificateurs qui ne portent aucun sens metier. Une annonce ecrit
// "full stock control" et "strong team leadership" ; le terme que cherche un
// index, et que le CV a une chance de contenir, c'est "stock control" et
// "team leadership". On les retire en TETE d'expression seulement : "high
// volume" garde son sens, "volume" seul ne l'a plus.
const INTENSIFICATEURS = new Set(
  ("full strong proven excellent solid deep extensive demonstrable significant "
   + "great good outstanding exceptional relevant successful genuine true "
   + "solide veritable excellente forte forte reelle").split(" ")
);

function sansIntensificateur(p) {
  const mots = p.split(" ");
  while (mots.length > 1 && INTENSIFICATEURS.has(mots[0])) mots.shift();
  return mots.join(" ");
}

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
  // L'EN-TETE DE L'ANNONCE N'EST PAS UNE EXIGENCE
  //
  // Les premieres lignes portent l'intitule, l'employeur et la ville : "Soho
  // House", "London". Proposer d'ajouter le nom de la boite a son CV n'a aucun
  // sens, et deux propositions absurdes suffisent a faire ignorer les vingt
  // bonnes. L'intitule, lui, est traite a part par titreEnTete.
  const brutes = String(annonce).split(/[\r\n]+/);
  const corps = brutes.slice(brutes.findIndex(l => l.trim().length > 0) + 2).join("\n");
  const segments = (corps || String(annonce))
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

  // On rabat chaque expression sur sa forme sans intensificateur AVANT de
  // compter : "full stock control" et "stock control" deviennent la meme
  // chose, et leurs occurrences s'additionnent au lieu de se concurrencer.
  const fusionne = new Map();
  for (const [p, n] of compte.entries()) {
    const clef = sansIntensificateur(p);
    if (estVide(clef) && !clef.includes(" ")) continue;
    if (estDuMobilier(clef)) continue;
    fusionne.set(clef, (fusionne.get(clef) || 0) + n);
  }

  const classees = [...fusionne.entries()]
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
  // demandees manquait sur ce retour la, donc un CV vide rendait un ecart
  // sans denominateur et toute mesure batie dessus valait NaN.
  if (!texte) return { manquantes: clefs, aReformuler: [], demandees: clefs.length };

  const manquantes = [];
  const aReformuler = [];

  for (const p of clefs) {
    if (texte.includes(p)) continue;
    const mots = p.split(" ");
    const tousPresents = mots.every(m => new RegExp(`\\b${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(texte));
    if (tousPresents && mots.length > 1) aReformuler.push(p);
    else manquantes.push(p);
  }
  // COMBIEN L'ANNONCE EN RECLAMAIT EN TOUT
  //
  // Les expressions deja presentes sortent de la boucle par `continue` et ne
  // figuraient dans aucune liste : impossible de dire "huit manquantes sur
  // combien". Or huit sur dix et huit sur soixante ne decrivent pas le meme
  // CV. On rend donc le total.
  return { manquantes, aReformuler, demandees: clefs.length };
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
// LE MOBILIER D'UNE ANNONCE N'EST PAS UNE EXIGENCE
//
// Sur une annonce agregee, celles qui portent un titre, un salaire, un type
// de contrat et presque rien d'autre, les expressions extraites etaient :
//
//   000 gbp | days ago | apply now | group europe | london united |
//   united kingdom | expedite group | company website | senior associate
//
// Le salaire, la date de publication, le bouton Postuler et le nom de la
// boite. Le panneau les proposait comme "absentes de ton CV", ce qui est
// vrai et sans le moindre interet, et le chiffre les comptait au
// denominateur : un CV parfaitement adapte sortait a 7 sur 100 parce que
// personne n'ecrit "days ago" sur un CV.
//
// L'en-tete etait deja coupe, mais sur une annonce mince le mobilier est
// dans le corps. On le reconnait a ce qu'il dit : une somme, une date, une
// invitation a postuler, un mode de contrat, une adresse. Jamais une
// competence.
// L'ADRESSE DU BUREAU N'EST PAS UNE COMPETENCE
//
// Deuxieme passage, sur une vraie annonce de Kilian. Le panneau lui donnait
// a ajouter a son CV : "job", "lane london", "london ec2n",
// "bartholomew lane", "details align", "lavender road". Le nom de la rue et
// le code postal du bureau, plus deux morceaux de la page du site d'emploi.
// La premiere passe du filtre ne les voyait pas : \b\d ne trouve pas le
// chiffre au milieu de "ec2n", et rien ne connaissait les noms de voie.
const VOIE = /\b(street|st|road|rd|lane|ln|avenue|ave|square|sq|place|court|way|drive|hill|row|gardens|terrace|close|crescent|mews|wharf|quay|embankment|bridge|park|floor|suite|rue|avenue|boulevard|impasse|allee)\b/;
// Un code postal britannique : deux lettres, un ou deux chiffres, parfois une
// lettre. Deux lettres au depart et non une, sinon "b2b" y passerait.
const CODE_POSTAL = /\b[a-z]{2}\d{1,2}[a-z]?\b/;

const MOBILIER = [
  VOIE,
  CODE_POSTAL,
  // Le vocabulaire de la page, pas du poste.
  /\b(job|jobs|post|posting|listing|advert|advertisement|details|align|aligns)\b/,
  // Des mots isoles qui ne sont jamais une exigence. La liste reste courte
  // et prudente : "office manager", "company secretary" et "contact centre"
  // sont de vrais postes, donc office, company et contact n'y sont pas.
  /\b(ago|today|yesterday|now|days?|weeks?|months?|hours?|website|kingdom|united|posted|closing|deadline)\b/,
  /\b\d/,                                     // un montant, une date, un code postal
  /\b(gbp|eur|usd|k|pa|per annum|par an|annum)\b/,
  /\b(apply|postuler|candidature|application) (now|today|here|online|en ligne)\b/,
  /\b(apply|postuler)\b/,
  /\b(posted|published|publiee?|updated|mis a jour|expires?|closing)\b/,
  /\b(days?|weeks?|months?|hours?|jours?|semaines?|mois|heures?) (ago|il y a)\b/,
  /\b(full time|part time|temps plein|temps partiel|permanent|cdi|cdd|freelance|contract type)\b/,
  /\b(salary|salaire|remuneration|package|benefits|avantages)\b/,
  /\b(company|entreprise|societe) (website|site|page|profile)\b/,
  /\b(united kingdom|royaume uni|london united|greater london|ile de france)\b/,
  /\b(ltd|limited|gmbh|sarl|sas|inc|plc|llc|group|groupe)\b/,
  /\b(job|offre|poste|vacancy|annonce) (id|reference|ref|number|numero)\b/,
  /\b(click|cliquez|see more|voir plus|read more|lire la suite|share|partager)\b/,
  /\b(equal opportunit|diversity|inclusion|privacy|cookies|rgpd)\b/,
];

function estDuMobilier(p) {
  return MOBILIER.some((re) => re.test(p));
}

// LE CHIFFRE QUE L'ON PEUT MONTRER
//
// Le panneau affichait un score sur 100 rendu par le modele : un champ
// libre du schema, que rien ne calcule et que rien ne verifie. Deux
// passages sur la meme annonce et le meme CV ne donnaient pas le meme
// nombre, et aucun logiciel de tri n'en produit de semblable. Ce fichier
// avait pourtant deja tranche la question, quelques lignes plus bas : on
// rend un compte et pas une note, parce qu'une note fait croire a une
// precision qu'on n'a pas. Le grand chiffre en tete du panneau disait le
// contraire du principe ecrit dessous.
//
// Celui-ci se calcule. C'est la part des expressions de l'annonce qui
// figurent dans le CV telles que l'annonce les ecrit, ce que fait
// exactement un tri par chaines de caracteres. Il se reproduit, il
// s'explique en une phrase, et il monte quand le CV s'ameliore vraiment.
//
// Les expressions "a reformuler" ne comptent pas : leurs mots sont la mais
// pas la tournure, et un robot qui compare des chaines ne les trouve pas.
// Elles ont deja leur rubrique dans le panneau, qui dit quoi en faire.
// Rien n'est pondere : une ponderation serait une invention de plus.
//
// Rend null quand l'annonce ne livre aucune expression a comparer. Mieux
// vaut pas de chiffre qu'un chiffre qui ne repose sur rien.
// Sous ce seuil, l'annonce n'a pas livre assez d'exigences pour qu'une part
// veuille dire quoi que ce soit : une sur trois s'affiche 33 et ne repose sur
// rien. Les deux listes du panneau restent, elles, toujours justes.
const ASSEZ_POUR_UNE_PART = 6;

export function couverture(cv, annonce) {
  const ecart = ecartMotsClefs(cv, annonce);
  const demandees = ecart.demandees || 0;
  if (demandees < ASSEZ_POUR_UNE_PART) return null;
  const present = demandees - ecart.manquantes.length - ecart.aReformuler.length;
  return {
    present,
    demandees,
    score: Math.round((present / demandees) * 100),
  };
}

export function rapport(cv, annonce) {
  const titre = titreEnTete(cv, annonce);
  const ecart = ecartMotsClefs(cv, annonce);
  const tics = ticsDeMachine(cv);
  return {
    titre,
    manquantes: ecart.manquantes,
    aReformuler: ecart.aReformuler,
    // Combien d'expressions l'annonce reclamait en tout. Sans ce
    // denominateur, "huit manquantes" ne veut rien dire : huit sur dix et
    // huit sur soixante ne decrivent pas le meme CV.
    demandees: ecart.demandees,
    tics,
    // Un compte, pas une note sur 100 : une note laisse croire a une precision
    // qu'on n'a pas, et pousse a optimiser le chiffre plutot que le CV.
    aCorriger: (titre.present ? 0 : 1) + ecart.aReformuler.length + tics.length,
  };
}
