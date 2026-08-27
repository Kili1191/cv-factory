/**
 * LE DIAGNOSTIC DU CV, SANS APPELER PERSONNE
 *
 * Les huit axes du tableau de bord etaient notes par le modele. Trois defauts,
 * dont un grave :
 *
 *   1. Le meme CV ne recevait pas deux fois la meme note. Un score qui bouge
 *      sans que rien n'ait change n'est pas un score, c'est un tirage.
 *   2. Chaque ouverture coutait un appel et plusieurs secondes d'attente.
 *   3. L'axe "design" demandait de juger la hierarchie visuelle a partir d'un
 *      bloc de texte et d'un nom de gabarit. Le modele ne voyait pas la page.
 *      Il inventait ce chiffre.
 *
 * Or presque tout ce qu'on veut savoir se COMPTE. Combien de puces portent un
 * chiffre. Combien commencent par "Responsable de". Combien de mots qu'aucun
 * index ne sait ranger. Ces reponses sont exactes, immediates, gratuites, et
 * identiques d'une fois sur l'autre.
 *
 * C'est la meme position que lib/atsFidelity.js tient deja : "les outils qui
 * promettent un score ATS devinent". Ici non plus on ne devine pas.
 *
 * CE QUI CHANGE POUR LE CANDIDAT
 *
 * Le tableau ne rend plus seulement une note, il rend sa PREUVE : "3 puces sur
 * 11 portent un chiffre" se verifie d'un coup d'oeil et se corrige. "Ameliore
 * l'impact de tes puces" ne se verifie pas.
 *
 * CE QUI RESTE AU MODELE
 *
 * Ecrire. Reformuler une puce dans la voix du candidat, rediger une lettre,
 * repondre dans le chat. Mesurer n'a jamais eu besoin de lui.
 */

import { fold } from "./atsMatch.js";
import { etatDuMot } from "./lectureMachine.js";

// --- outils de comptage --------------------------------------------------

function mots(s) {
  return String(s || "").trim().split(/\s+/).filter(Boolean);
}

function porteUnChiffre(s) {
  // Un pourcentage, un montant, un effectif, une duree. C'est ce qu'un index
  // range en premier, et ce qu'un recruteur retient.
  return /\d/.test(String(s || ""));
}

// Les debuts de puce qui annoncent une description de poste au lieu d'un
// resultat. "Responsable de la caisse" dit ce qu'on nous a confie ;
// "Tenu une caisse de 1 200 euros par jour" dit ce qu'on a fait.
const DEBUTS_PLATS = [
  /^responsable (de|du|des|d')/i, /^en charge (de|du|des|d')/i,
  /^charge (de|du|des|d')/i, /^participation a/i, /^aide a/i,
  /^gestion (de|du|des|d')/i, /^suivi (de|du|des|d')/i,
  /^responsible for/i, /^in charge of/i, /^tasked with/i,
  /^duties includ/i, /^helped (to |with )?/i, /^assisted (in|with)/i,
  /^worked (on|with|as)/i, /^involved in/i, /^participated in/i,
];

function debutPlat(b) {
  const t = String(b || "").trim();
  return DEBUTS_PLATS.some((r) => r.test(t));
}

/** La part de mots qu'aucun logiciel de tri ne sait ranger. */
function partMolle(texte) {
  const m = mots(texte);
  if (!m.length) return 0;
  const porteurs = m.filter((x) => etatDuMot(x) !== 2);   // hors grammaire
  if (!porteurs.length) return 0;
  const mous = porteurs.filter((x) => etatDuMot(x) === 1);
  return mous.length / porteurs.length;
}

function toutesLesPuces(cv) {
  return ((cv && cv.experience) || []).flatMap((e) => (e.bullets || []).filter(Boolean));
}

function texteEntier(cv) {
  return [
    cv && cv.title, cv && cv.summary,
    ...((cv && cv.experience) || []).flatMap((e) => [e.title, e.company, ...(e.bullets || [])]),
    ...((cv && cv.skills) || []),
  ].filter(Boolean).join(" ");
}

// Une note bornee, pour qu'aucun calcul ne sorte de l'echelle affichee.
function borne(n) { return Math.max(0, Math.min(100, Math.round(n))); }

// --- les huit axes -------------------------------------------------------
//
// Chaque axe rend sa note ET la mesure qui la justifie. La mesure est la
// partie utile : elle se verifie et elle se corrige.

const AXES = [
  {
    id: "title",
    poids: 1.2,
    mesure(cv) {
      const t = String((cv && cv.title) || "").trim();
      if (!t) return { note: 0, fait: { quoi: "absent" } };
      const m = mots(t);
      const mous = m.filter((x) => etatDuMot(x) === 1).length;
      let note = 100;
      // Un intitule est un nom de metier, pas une phrase de presentation.
      if (m.length > 6) note -= (m.length - 6) * 9;
      if (mous) note -= mous * 22;
      if (t.length < 3) note = 20;
      return { note: borne(note), fait: { mots: m.length, mous } };
    },
  },
  {
    id: "bullets",
    poids: 1.6,
    mesure(cv) {
      const b = toutesLesPuces(cv);
      if (!b.length) return { note: 0, fait: { total: 0 } };
      const chiffrees = b.filter(porteUnChiffre).length;
      const plates = b.filter(debutPlat).length;
      const longueurs = b.map((x) => mots(x).length);
      const tropCourtes = longueurs.filter((n) => n < 5).length;
      const tropLongues = longueurs.filter((n) => n > 34).length;
      const note = 100
        - Math.round((1 - chiffrees / b.length) * 52)
        - Math.round((plates / b.length) * 30)
        - Math.round(((tropCourtes + tropLongues) / b.length) * 18);
      return {
        note: borne(note),
        fait: { total: b.length, chiffrees, plates, tropCourtes, tropLongues },
      };
    },
  },
  {
    id: "ats",
    poids: 1.5,
    mesure(cv) {
      // Ce qu'un logiciel de tri cherche en premier, et ne devine jamais.
      const champs = [
        ["nom", !!String((cv && cv.name) || "").trim()],
        ["contact", !!(String((cv && cv.email) || "").trim() || String((cv && cv.phone) || "").trim())],
        ["intitule", !!String((cv && cv.title) || "").trim()],
        ["lieu", !!String((cv && cv.location) || "").trim()],
      ];
      const manquants = champs.filter(([, ok]) => !ok).map(([n]) => n);
      const comps = ((cv && cv.skills) || []).filter(Boolean).length;
      const postes = ((cv && cv.experience) || []).filter((e) => e && (e.title || e.company)).length;
      const datees = ((cv && cv.experience) || []).filter((e) => e && String(e.period || "").trim()).length;
      let note = 100;
      note -= manquants.length * 17;
      if (comps < 5) note -= (5 - comps) * 5;
      if (!postes) note -= 30;
      else if (datees < postes) note -= (postes - datees) * 8;
      return { note: borne(note), fait: { manquants, comps, postes, datees } };
    },
  },
  {
    id: "relevance",
    poids: 1.1,
    mesure(cv) {
      // Le titre affiche et le parcours parlent-ils du meme metier ? On
      // compare les mots porteurs, pas les phrases.
      const cible = new Set(mots(fold((cv && cv.title) || ""))
        .filter((x) => etatDuMot(x) === 0));
      // Un intitule fait uniquement de formules n'a aucun mot porteur a
      // comparer. Ce n'est pas "0 sur 0", c'est un intitule vide de metier.
      if (!cible.size) return { note: 25, fait: { partages: 0, cible: 0, sansMetier: true } };
      const ailleurs = new Set(mots(fold(
        ((cv && cv.experience) || []).map((e) => (e.title || "") + " " + (e.company || "")).join(" ")
        + " " + ((cv && cv.skills) || []).join(" ")
      )).filter((x) => etatDuMot(x) === 0));
      const partages = [...cible].filter((x) => ailleurs.has(x)).length;
      const part = partages / cible.size;
      return { note: borne(30 + part * 70), fait: { partages, cible: cible.size } };
    },
  },
  {
    id: "credibility",
    poids: 1.3,
    mesure(cv) {
      // La densite de mots que la machine ne sait pas ranger. C'est la mesure
      // du "bullshit" : elle ne juge pas l'honnetete de la personne, elle
      // compte les formules qui ne prouvent rien.
      const part = partMolle([(cv && cv.summary) || "", ...toutesLesPuces(cv)].join(" "));
      return { note: borne(100 - part * 190), fait: { part: Math.round(part * 100) } };
    },
  },
  {
    id: "design",
    poids: 0.8,
    mesure(cv) {
      // Le modele ne voyait pas la page et notait quand meme. Nous ne la
      // voyons pas non plus depuis ici - alors on ne note que ce qui se
      // compte vraiment : l'equilibre entre les sections.
      const sections = [
        ["accroche", mots((cv && cv.summary) || "").length > 0],
        ["experience", ((cv && cv.experience) || []).length > 0],
        ["competences", ((cv && cv.skills) || []).filter(Boolean).length > 0],
        ["langues", ((cv && cv.languages) || []).filter((l) => l && l.lang).length > 0],
        ["formation", ((cv && cv.education) || []).filter(Boolean).length > 0],
      ];
      const vides = sections.filter(([, ok]) => !ok).map(([n]) => n);
      const parPoste = ((cv && cv.experience) || []).map((e) => (e.bullets || []).filter(Boolean).length);
      const desequilibre = parPoste.length > 1
        ? Math.max(...parPoste) - Math.min(...parPoste) : 0;
      let note = 100 - vides.length * 14;
      if (desequilibre > 4) note -= (desequilibre - 4) * 6;
      return { note: borne(note), fait: { vides, desequilibre } };
    },
  },
  {
    id: "readability",
    poids: 1.0,
    mesure(cv) {
      const total = mots(texteEntier(cv)).length;
      const acc = mots((cv && cv.summary) || "").length;
      let note = 100;
      // Un CV trop court n'a rien a lire ; trop long, il n'est pas lu.
      if (total < 120) note -= (120 - total) * 0.42;
      if (total > 650) note -= (total - 650) * 0.10;
      if (acc > 70) note -= (acc - 70) * 1.1;
      return { note: borne(note), fait: { total, acc } };
    },
  },
  {
    id: "differentiation",
    poids: 0.9,
    mesure(cv) {
      // Un CV interchangeable est un CV sans faits propres. On compte ce qui
      // n'appartient qu'a cette personne : ses chiffres et ses employeurs.
      const b = toutesLesPuces(cv);
      const chiffres = (texteEntier(cv).match(/\d+(?:[.,]\d+)?%?/g) || []).length;
      const employeurs = new Set(((cv && cv.experience) || [])
        .map((e) => fold((e && e.company) || "")).filter(Boolean)).size;
      let note = 24 + Math.min(chiffres, 12) * 5 + Math.min(employeurs, 4) * 5;
      if (!b.length) note = Math.min(note, 30);
      return { note: borne(note), fait: { chiffres, employeurs } };
    },
  },
];

// --- ce qu'on dit au candidat -------------------------------------------
//
// La consigne donnee au modele etait : "concrete, pas 'ameliore'". Une phrase
// fabriquee a partir du compte l'est par construction - elle cite le nombre
// qu'on vient de mesurer.

// Les noms de champs voyageaient en francais jusque dans la phrase anglaise
// ("Fill in: contact, lieu"). On les traduit au moment de les dire.
const NOMS = {
  fr: { nom: "nom", contact: "contact", intitule: "intitule", lieu: "lieu",
    accroche: "accroche", experience: "experience", competences: "competences",
    langues: "langues", formation: "formation" },
  en: { nom: "name", contact: "contact details", intitule: "job title", lieu: "location",
    accroche: "summary", experience: "experience", competences: "skills",
    langues: "languages", formation: "education" },
};

function nommer(langue, cles) {
  return (cles || []).map((c) => NOMS[langue][c] || c).join(", ");
}

const PHRASES = {
  fr: {
    title: (f) => f.quoi === "absent"
      ? "Ajoute un intitule de poste : sans lui, le logiciel n'a rien a ranger."
      : f.mous
        ? "Retire les " + f.mous + " mot(s) d'auto-portrait de l'intitule, garde le nom du metier."
        : "Raccourcis l'intitule a " + Math.min(f.mots, 4) + " mots : un metier, pas une phrase.",
    bullets: (f) => f.total === 0
      ? "Ajoute des puces a tes experiences : un poste sans puce ne prouve rien."
      : f.chiffrees < f.total
        ? "Mets un chiffre dans " + (f.total - f.chiffrees) + " puce(s) sur " + f.total + " : montant, volume, effectif, delai."
        : f.plates
          ? "Reecris " + f.plates + " puce(s) qui commencent par une description de poste au lieu d'un resultat."
          : "Ramene les puces trop longues sous 30 mots.",
    ats: (f) => f.manquants.length
      ? "Renseigne : " + nommer("fr", f.manquants) + ". Un champ vide est un candidat introuvable."
      : f.datees < f.postes
        ? "Date " + (f.postes - f.datees) + " poste(s) : sans periode, l'anciennete ne se calcule pas."
        : "Ajoute " + Math.max(0, 5 - f.comps) + " competence(s) nommees comme dans les annonces.",
    relevance: (f) => f.sansMetier
      ? "L'intitule ne contient aucun nom de metier : la machine n'a rien a rapprocher de ton parcours."
      : "Reprends dans l'intitule ou les competences les mots de ton parcours : "
        + f.partages + " sur " + f.cible + " s'y retrouvent aujourd'hui.",
    credibility: (f) => f.part > 0
      ? f.part + "% de tes mots porteurs ne prouvent rien. Remplace chaque adjectif par un fait."
      : "Les formules tiennent : chaque mot porte un fait.",
    design: (f) => f.vides.length
      ? "Remplis : " + nommer("fr", f.vides) + "."
      : "Repartis les puces entre les postes : " + f.desequilibre + " d'ecart entre le plus et le moins fourni.",
    readability: (f) => f.total < 120
      ? "Le CV fait " + f.total + " mots. Vise 200 au minimum, sinon il n'y a rien a lire."
      : f.acc > 70
        ? "Ramene l'accroche de " + f.acc + " a 50 mots."
        : "Reduis : " + f.total + " mots, c'est au-dela de ce qu'on lit en premier tri.",
  },
  en: {
    title: (f) => f.quoi === "absent"
      ? "Add a job title: without one the software has nothing to file."
      : f.mous
        ? "Drop the " + f.mous + " self-description word(s) from the title, keep the trade."
        : "Cut the title to " + Math.min(f.mots, 4) + " words: a job, not a sentence.",
    bullets: (f) => f.total === 0
      ? "Add bullets to your roles: a job with no bullets proves nothing."
      : f.chiffrees < f.total
        ? "Put a figure in " + (f.total - f.chiffrees) + " of " + f.total + " bullets: amount, volume, headcount, time."
        : f.plates
          ? "Rewrite " + f.plates + " bullet(s) that open with a job description instead of a result."
          : "Bring the longest bullets under 30 words.",
    ats: (f) => f.manquants.length
      ? "Fill in: " + nommer("en", f.manquants) + ". An empty field is a candidate nobody can find."
      : f.datees < f.postes
        ? "Date " + (f.postes - f.datees) + " role(s): with no period, your seniority cannot be computed."
        : "Add " + Math.max(0, 5 - f.comps) + " skill(s), named the way job ads name them.",
    relevance: (f) => f.sansMetier
      ? "The title names no trade, so there is nothing for the software to match against your history."
      : "Carry your history's words into the title or skills: "
        + f.partages + " of " + f.cible + " appear there today.",
    credibility: (f) => f.part > 0
      ? f.part + "% of your meaning-carrying words prove nothing. Swap each adjective for a fact."
      : "The wording holds: every word carries a fact.",
    design: (f) => f.vides.length
      ? "Fill in: " + nommer("en", f.vides) + "."
      : "Even out the bullets across roles: " + f.desequilibre + " between the fullest and the thinnest.",
    readability: (f) => f.total < 120
      ? "The CV is " + f.total + " words. Aim for 200 at least, or there is nothing to read."
      : f.acc > 70
        ? "Bring the summary from " + f.acc + " words down to 50."
        : "Trim: " + f.total + " words is past what gets read in a first pass.",
  },
};

// La differenciation n'a pas de consigne mecanique honnete : on ne peut pas
// demander "sois plus singulier". On dit ce qui manque factuellement.
PHRASES.fr.differentiation = (f) => "Ajoute des faits qui n'appartiennent qu'a toi : "
  + f.chiffres + " chiffre(s) et " + f.employeurs + " employeur(s) nommes aujourd'hui.";
PHRASES.en.differentiation = (f) => "Add facts only you have: "
  + f.chiffres + " figure(s) and " + f.employeurs + " named employer(s) so far.";

// QUAND L'AXE TIENT, ON LE DIT
//
// Les consignes ci-dessus sont fabriquees a partir du compte, donc elles
// sortent TOUJOURS une correction - meme sur un axe a 100. Le tableau
// conseillait ainsi de raccourcir un intitule deja parfait, et d'ajouter
// "0 competence". Une correction inventee sur un point qui va bien coute la
// confiance dans toutes les autres.
const SEUIL_BIEN = 85;

const BIEN = {
  fr: {
    title: "L'intitule nomme un metier, sans formule autour.",
    bullets: (f) => f.chiffrees + " puce(s) sur " + f.total + " portent un chiffre.",
    ats: "Les champs qu'un logiciel de tri cherche sont tous remplis.",
    relevance: "L'intitule et le parcours parlent du meme metier.",
    credibility: "Chaque mot porte un fait : rien a retirer.",
    design: "Les sections sont remplies et les postes equilibres.",
    readability: (f) => f.total + " mots : la longueur se lit en premier tri.",
    differentiation: (f) => f.chiffres + " chiffre(s) et " + f.employeurs
      + " employeur(s) nommes : ce CV n'est pas interchangeable.",
  },
  en: {
    title: "The title names a trade, with nothing padded around it.",
    bullets: (f) => f.chiffrees + " of " + f.total + " bullets carry a figure.",
    ats: "Every field screening software looks for is filled in.",
    relevance: "The title and the history name the same trade.",
    credibility: "Every word carries a fact: nothing to cut.",
    design: "Sections are filled and roles are evenly weighted.",
    readability: (f) => f.total + " words: a length that gets read in a first pass.",
    differentiation: (f) => f.chiffres + " figure(s) and " + f.employeurs
      + " named employer(s): this CV is not interchangeable.",
  },
};

/** La phrase de l'axe : une confirmation s'il tient, une correction sinon. */
function phrase(langue, id, fait, note) {
  if (note >= SEUIL_BIEN) {
    const b = BIEN[langue][id];
    return typeof b === "function" ? b(fait) : b;
  }
  return PHRASES[langue][id](fait);
}

const VERDICTS = {
  fr: [
    [85, "Ce CV tient. Le tri automatique le laissera passer."],
    [70, "Solide, avec une faiblesse nette a corriger avant d'envoyer."],
    [50, "Lisible par un humain, fragile devant un logiciel de tri."],
    [30, "Trop de champs vides ou de formules : le tri l'ecartera."],
    [0, "En l'etat, le CV ne donne presque rien a ranger a la machine."],
  ],
  en: [
    [85, "This CV holds. Automated screening will let it through."],
    [70, "Solid, with one clear weakness to fix before sending."],
    [50, "Readable by a human, fragile in front of screening software."],
    [30, "Too many empty fields or empty phrases: screening will drop it."],
    [0, "As it stands, the CV gives the machine almost nothing to file."],
  ],
};

/**
 * Le rapport complet, sans reseau et sans modele.
 *
 * Rend exactement la forme que le tableau de bord consomme deja
 * ({ scores, global_score, verdict_global, top_priority }), plus `faits`,
 * la mesure derriere chaque note.
 *
 * Deterministe : le meme CV rend le meme rapport, toujours.
 */
export function diagnostiquer(cv, langue = "fr") {
  const L = PHRASES[langue] ? langue : "fr";
  const mesures = AXES.map((a) => {
    const m = a.mesure(cv || {});
    return { id: a.id, poids: a.poids, score: m.note, fait: m.fait };
  });

  const totalPoids = mesures.reduce((n, m) => n + m.poids, 0);
  const global = Math.round(
    mesures.reduce((n, m) => n + m.score * m.poids, 0) / totalPoids);

  // La priorite : l'axe ou l'on perd le plus de points ponderes. C'est le
  // seul classement honnete - le plus bas en valeur absolue peut etre un axe
  // qui ne pese presque rien.
  const pire = mesures.slice().sort(
    (a, b) => ((100 - b.score) * b.poids) - ((100 - a.score) * a.poids))[0];

  const bande = VERDICTS[L].find(([seuil]) => global >= seuil);

  return {
    scores: mesures.map((m) => ({
      id: m.id,
      score: m.score,
      reco: phrase(L, m.id, m.fait, m.score),
      fait: m.fait,
    })),
    global_score: global,
    verdict_global: bande ? bande[1] : "",
    top_priority: pire.score >= SEUIL_BIEN
      ? (L === "en"
        ? "Nothing left to fix by measurement. What remains is the writing itself."
        : "Plus rien a corriger a la mesure. Ce qui reste tient a l'ecriture.")
      : PHRASES[L][pire.id](pire.fait),
    // Marque l'origine : le tableau doit pouvoir dire d'ou vient la note.
    source: "mesure",
  };
}
