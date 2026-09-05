/**
 * LIRE UN CV SANS APPELER PERSONNE
 *
 * Importer un CV coutait un appel au modele et plusieurs secondes, a chaque
 * fois, y compris pour un document parfaitement ordinaire. C'est le tout
 * premier geste du produit : quelqu'un colle son CV et attend devant un
 * ecran vide.
 *
 * POURQUOI PAS lib/atsParser.js
 *
 * Il existe deja et il lit des CV - mais pour une autre question. Il sert a
 * VERIFIER ce qu'un robot a retrouve dans un PDF exporte, donc il garde le
 * texte brut de chaque bloc et ne cherche jamais a separer l'intitule de
 * l'employeur. Mesure sur un CV reel : trois experiences la ou il y en a
 * deux, aucun intitule, aucun employeur, et une periode rendue en objet la
 * ou l'editeur attend une chaine. Excellent pour son travail, inutilisable
 * pour celui-ci.
 *
 * CE QUI EST DIFFICILE, ET COMMENT ON S'EN SORT
 *
 * Un bloc d'experience s'ecrit de plusieurs facons :
 *
 *     Senior Care Assistant              Bar Manager | Le Comptoir | 2019-2024
 *     Elmwood Residential Home
 *     2022 - 2026                        Le Comptoir - Bar Manager (2019-2024)
 *
 * On ne devine donc pas par la position, mais par la NATURE des mots. Un
 * intitule contient un mot de metier ; un employeur porte une marque de
 * societe, ou n'est rien d'autre qu'un nom propre. Quand le doute subsiste,
 * on laisse vide plutot que d'inventer : un champ vide se corrige d'un coup
 * d'oeil, un employeur invente peut partir chez un recruteur.
 *
 * CE QUI RESTE AU MODELE
 *
 * Les CV que cette lecture ne sait pas ranger. `lireUnCv` rend toujours sa
 * confiance ; l'appelant decide, et n'appelle le modele que si elle est
 * basse. Un CV ordinaire arrive donc instantanement et sans rien couter.
 */

import { fold } from "./atsMatch.js";
import { anneeEnFin } from "./leCvEstIlPresentable.js";

// --- reperes -------------------------------------------------------------

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]{2,}/;
const TEL = /(?:\+?\d[\d .()-]{7,}\d)/;
const LIEN = /(?:linkedin\.com|github\.com)\/[\w/-]+/i;

// Une periode : "2019 - 2024", "Mar 2022 - Jan 2025", "2020 - present".
const MOIS = "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec"
  + "|janv|fevr|mars|avr|mai|juin|juil|aout|sept|oct|nov|dec";
const PERIODE = new RegExp(
  "((?:" + MOIS + ")\\w*\\.?\\s*)?((?:19|20)\\d{2})"
  + "\\s*(?:-|\u2013|\u2014|a |to |au )\\s*"
  + "((?:" + MOIS + ")\\w*\\.?\\s*)?((?:19|20)\\d{2}|present|actuel|aujourd|now|today|ce jour)",
  "i");

// Les titres de section, dans les deux langues et sous leurs formes usuelles.
const SECTIONS = {
  // "Professional Profile" est la forme la plus courante en anglais, et
  // elle ne commencait par aucun de ces mots : l'accroche tombait dans
  // l'en-tete et disparaissait du CV lu.
  summary: /^(profil|profile|about|a propos|resume|summary|accroche|objectif|objective|presentation|professional (profile|summary)|personal (profile|statement)|career (summary|profile|objective)|executive summary|profil professionnel)\b/i,
  experience: /^(experiences?|professional experience|work experience|employment|parcours|emplois?|carriere)\b/i,
  education: /^(formation|education|diplomes?|studies|academic|scolarite)\b/i,
  skills: /^(competences?|skills|expertise|savoir-faire|technical skills)\b/i,
  languages: /^(langues?|languages?)\b/i,
  certifications: /^(certifications?|certificats?|licences?|accreditations?)\b/i,
};

// Des mots qui font un METIER. Volontairement large et concret : ce produit
// sert des serveurs, des aides-soignants, des chauffeurs - pas seulement des
// cadres. Un intitule qui n'en contient aucun n'est pas rejete pour autant :
// il devient simplement moins probable que l'autre ligne du bloc.
const METIER = new RegExp("\\b(" + [
  "manager", "assistant", "assistante", "director", "directeur", "directrice",
  "supervisor", "superviseur", "lead", "head", "chef", "responsable", "adjoint",
  "officer", "agent", "operative", "operator", "technician", "technicien",
  "engineer", "ingenieur", "developer", "developpeur", "designer", "analyst",
  "analyste", "consultant", "advisor", "conseiller", "conseillere",
  "waiter", "waitress", "serveur", "serveuse", "barman", "barmaid", "bartender",
  "chef", "cook", "cuisinier", "commis", "plongeur", "runner", "host", "hostess",
  "carer", "caregiver", "nurse", "infirmier", "infirmiere", "aide", "soignant",
  "soignante", "auxiliaire", "driver", "chauffeur", "livreur", "courier",
  "warehouse", "magasinier", "preparateur", "cariste", "picker", "packer",
  "receptionist", "receptionniste", "cashier", "caissier", "caissiere",
  "sales", "vendeur", "vendeuse", "clerk", "secretary", "secretaire",
  "cleaner", "agent d'entretien", "security", "securite", "gardien",
  "teacher", "professeur", "educateur", "animateur", "coordinator",
  "coordinateur", "administrator", "administrateur", "apprentice", "apprenti",
  "intern", "stagiaire", "trainee", "specialist", "specialiste", "executive",
].join("|") + ")\\b", "i");

// Ce qui trahit une SOCIETE. Une virgule suivie d'une ville compte aussi,
// mais elle est traitee a part parce qu'elle sert en plus a extraire le lieu.
const SOCIETE = /\b(ltd|limited|inc|llc|plc|gmbh|sarl|sas|sa|bv|nv|group|groupe|holdings?|company|co|corp|corporation|associates|partners|agency|agence|studio|home|hospital|clinic|clinique|ehpad|school|ecole|college|university|universite|hotel|restaurant|cafe|bar|pub|store|shop|magasin|centre|center)\b\.?/i;

// --- outils --------------------------------------------------------------

function lignes(texte) {
  return String(texte || "")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.replace(/ /g, " ").replace(/[ \t]+/g, " ").trim())
    .filter((l) => l.length > 0);
}

// LA LISTE DES PUCES DECIDE DU DECOUPAGE, PAS SEULEMENT DE L'AFFICHAGE
//
// Elle ne contenait pas U+25CF, le gros rond noir, alors que c'est la puce
// par defaut de Word et de Google Docs des qu'on choisit un autre niveau de
// liste. Un CV reel depose sur /verifier en etait rempli.
//
// Le cout n'etait pas cosmetique. blocs() ferme un bloc quand une ligne qui
// n'est PAS une puce suit une puce : c'est ce qui separe deux postes. Aucune
// ligne n'etant reconnue comme puce, aucun bloc ne se fermait, et les deux
// postes du CV n'en formaient plus qu'un. Le resultat melangeait l'intitule
// du premier, la ville du premier prise pour un employeur, la periode du
// second, et zero puce. La page annoncait "1 employeur retrouve" sur un CV
// qui en portait deux.
//
// On accepte donc tout ce qu'un traitement de texte pose vraiment devant une
// ligne de liste. Les fleches et les coches en font partie : elles arrivent
// des modeles Canva et des CV mis en forme a la main.
const PUCES = "[\\u2022\\u2023\\u25aa\\u25ab\\u25a0\\u25a1\\u25cf\\u25cb\\u25e6\\u2043\\u00b7"
  + "\\u25b8\\u25b9\\u27a2\\u27a4\\u2713\\u2714\\u00bb>*\\-\\u2013\\u2014]";
const RE_PUCE = new RegExp("^\\s*" + PUCES + "\\s+");
function estPuce(l) { return RE_PUCE.test(l); }
function sansPuce(l) { return l.replace(RE_PUCE, "").trim(); }

// UNE PHRASE EST UNE PUCE, MEME SANS SA PUCE
//
// Le texte copie depuis un PDF perd ses puces : chaque ligne d'un poste
// arrive nue, a la suite de l'intitule et de l'employeur. Lue avec la
// seule regle "une puce commence par un point", la section entiere devenait
// UN bloc de trente lignes : un intitule, un employeur pris au hasard parmi
// les phrases, et zero puce. Vu sur le CV de Kilian colle depuis son
// propre PDF : deux postes sur trois disparus, et pour employeur "Owned
// complex, high-value transactions end to end".
//
// Une phrase ne s'ecrit pas comme un intitule : elle est longue, ou elle
// finit par un point. Dans la section experience, c'est une puce.
function estPhrase(l) {
  const t = String(l || "").trim();
  if (!t || estPuce(t) || PERIODE.test(t)) return false;
  const mots = t.split(/\s+/).length;
  return t.length >= 60 || (/[.!?]$/.test(t) && mots >= 6);
}

// UNE ANNEE SEULE EST UNE DATE, MEME SI C'EST UNE MAUVAISE DATE
//
// PERIODE exige deux reperes, et c'est juste pour JUGER un CV : un analyseur
// a besoin d'un debut et d'une fin pour ranger un poste par anciennete, et
// /verifier le dit a la personne.
//
// Mais extraire et juger sont deux choses. "Real Estate Sales Consultant -
// Dubai, UAE 2025" porte une date. En n'en retenant rien, l'import la
// perdait purement et simplement, et la personne devait la retaper.
//
// On se rabat donc sur une annee seule EN FIN DE LIGNE d'en-tete, la forme
// "poste, ville, annee". En fin de ligne seulement : une annee au milieu
// d'une phrase appartient au recit, pas a l'en-tete.
//
// Le verdict ATS ne bouge pas pour autant : lib/verifierUnPdf.js applique sa
// propre exigence de deux reperes, sans se fier a ce champ.
const ANNEE_SEULE = /((?:19|20)\d{2})\s*$/;

function periodeDe(l) {
  const t = String(l || "");
  const m = t.match(PERIODE);
  if (m) return m[0].replace(/\s+/g, " ").trim();
  const a = t.match(ANNEE_SEULE);
  return a ? a[1] : "";
}

/** Le nom : la premiere ligne courte, sans chiffre ni arobase, avant tout titre. */
function nomDe(ls) {
  for (const l of ls.slice(0, 6)) {
    if (EMAIL.test(l) || TEL.test(l) || LIEN.test(l)) continue;
    if (Object.values(SECTIONS).some((r) => r.test(l))) break;
    const mots = l.split(/\s+/);
    if (mots.length >= 2 && mots.length <= 5 && !/\d/.test(l) && l.length <= 46) {
      return l.replace(/[,;|].*$/, "").trim();
    }
  }
  return "";
}

/** Decoupe le document par titres de section. */
function parSections(ls) {
  const out = { entete: [] };
  let cle = "entete";
  for (const l of ls) {
    let trouve = null;
    for (const [k, r] of Object.entries(SECTIONS)) {
      // Un titre de section est court : "Experience", pas une phrase qui
      // commence par "Experience acquise aupres de...".
      if (r.test(l) && l.split(/\s+/).length <= 4) { trouve = k; break; }
    }
    if (trouve) { cle = trouve; out[cle] = out[cle] || []; continue; }
    (out[cle] = out[cle] || []).push(l);
  }
  return out;
}

/**
 * Regroupe les lignes d'une section en blocs. Un bloc commence quand une
 * ligne NON-puce suit une puce : c'est le debut du poste suivant.
 */
function blocs(ls, { phrases = false } = {}) {
  const out = [];
  let cur = null;
  let vientDePuce = false;
  for (const l of ls) {
    const puce = estPuce(l) || (phrases && estPhrase(l));
    if (!puce && vientDePuce) cur = null;
    if (!cur) { cur = { tetes: [], puces: [] }; out.push(cur); }
    if (puce) cur.puces.push(sansPuce(l));
    else cur.tetes.push(l);
    vientDePuce = puce;
  }
  return out.filter((b) => b.tetes.length || b.puces.length);
}

/**
 * Attribue intitule et employeur aux lignes d'en-tete d'un bloc.
 * Rend "" pour ce qu'on ne sait pas : un champ vide se corrige, un employeur
 * invente peut partir chez un recruteur.
 */
/** Retire la periode et les restes de ponctuation qu'elle laisse derriere. */
function sansLaPeriode(t) {
  return String(t || "")
    .replace(PERIODE, "")
    // "(2019 - 2024)" laisse "()" : la paire vide part avant tout le reste,
    // sinon seule la parenthese fermante etait rognee et l'intitule
    // s'appelait "Barman responsable (".
    .replace(/[([{]\s*[)\]}]/g, " ")
    .replace(/^[\s,;:([{|-]+|[\s,;:([{)\]}|-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titreEtEmployeur(tetes) {
  // Une meme ligne peut tout porter, separe par | ou - ou @.
  let morceaux = [];
  for (const t of tetes) {
    const sansPer = sansLaPeriode(t);
    if (/[|•·]|\s[-\u2013\u2014]\s|\bchez\b|\bat\b|@/i.test(sansPer)) {
      morceaux.push(...sansPer.split(/\s*[|•·@]\s*|\s+[-\u2013\u2014]\s+|\s+chez\s+|\s+at\s+/i));
    } else if (sansPer) {
      morceaux.push(sansPer);
    }
  }
  morceaux = morceaux.map((m) => m.replace(/^[,;-]+|[,;-]+$/g, "").trim()).filter(Boolean);
  if (!morceaux.length) return { title: "", company: "", location: "" };

  // Le lieu se detache d'un morceau du type "Elmwood Home, Manchester".
  let location = "";
  morceaux = morceaux.map((m) => {
    const v = m.match(/^(.*?),\s*([A-Z][\w' -]{2,24})$/);
    if (v && !METIER.test(v[2])) { location = location || v[2].trim(); return v[1].trim(); }
    return m;
  });

  const note = (m) => (METIER.test(m) ? 2 : 0) - (SOCIETE.test(m) ? 2 : 0);
  const classes = morceaux.map((m) => ({ m, n: note(m) }));
  const metier = classes.filter((c) => c.n > 0);
  const boite = classes.filter((c) => c.n < 0);

  let title = metier.length ? metier[0].m : "";
  let company = boite.length ? boite[0].m : "";

  // Deux morceaux et un seul reconnu : l'autre est forcement le second role.
  const restants = classes.filter((c) => c.m !== title && c.m !== company);
  if (!title && restants.length && company) title = restants[0].m;
  else if (!company && restants.length && title) company = restants[0].m;
  else if (!title && !company && morceaux.length >= 2) {
    // Aucun indice : l'usage veut l'intitule d'abord.
    title = morceaux[0]; company = morceaux[1];
  } else if (!title && !company && morceaux.length === 1) {
    title = morceaux[0];
  }
  // Ce qui reste apres l'intitule et l'employeur, court et sans mot de
  // metier, est un lieu : "Anarock / UAE" copie depuis un PDF arrive en
  // deux lignes, et "UAE" n'a nulle part ailleurs ou aller.
  if (!location) {
    const lieu = morceaux.find((m) => m !== title && m !== company
      && m.length <= 24 && m.split(/\s+/).length <= 3 && !METIER.test(m));
    if (lieu) location = lieu;
  }
  return { title: title || "", company: company || "", location };
}

// Coupe sur les virgules et les separateurs, sauf entre parentheses :
// "Relationship Management (SME, C-level, HNW clients)" est UNE competence,
// et la couper en trois donnait "(SME" et "HNW clients)".
function decouper(s) {
  const out = [];
  let cur = "", prof = 0;
  for (const c of String(s || "")) {
    if (c === "(" || c === "[") prof += 1;
    if (c === ")" || c === "]") prof = Math.max(0, prof - 1);
    if (prof === 0 && /[,;|\u2022\u00b7]/.test(c)) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out.flatMap((p) => p.split(/\s{3,}/));
}
function listeDe(ls) {
  const out = [];
  for (const l of ls) {
    for (const p of decouper(sansPuce(l))) {
      const t = p.trim();
      if (t && t.length <= 70) out.push(t);
    }
  }
  return [...new Set(out)];
}

// --- la lecture ----------------------------------------------------------

/**
 * Lit un CV colle ou extrait d'un fichier.
 *
 * Rend { cv, confiance, raisons } - `confiance` entre 0 et 1. L'appelant
 * n'appelle le modele que si elle est basse : un CV ordinaire arrive
 * instantanement et sans rien couter.
 */
export function lireUnCv(texte) {
  const ls = lignes(texte);
  const sec = parSections(ls);
  const entete = sec.entete || [];
  const tout = ls.join("\n");

  const experience = blocs(sec.experience || [], { phrases: true }).map((b, i) => {
    const per = b.tetes.map(periodeDe).find(Boolean) || "";
    const { title, company, location } = titreEtEmployeur(b.tetes);
    return { id: i + 1, title, company, period: per, location, bullets: b.puces };
  }).filter((e) => e.title || e.company || e.bullets.length);

  const education = blocs(sec.education || []).map((b, i) => {
    const per = b.tetes.map(periodeDe).find(Boolean) || "";
    const t = b.tetes.map(sansLaPeriode).filter(Boolean);
    return { id: i + 1, degree: t[0] || "", school: t[1] || "", period: per };
  }).filter((e) => e.degree || e.school);

  const cv = {
    name: nomDe(entete),
    // L'intitule affiche : la ligne juste apres le nom, si elle sonne metier.
    title: (() => {
      const n = nomDe(entete);
      const i = entete.findIndex((l) => l === n);
      const suivante = i >= 0 ? entete[i + 1] : entete[1];
      if (!suivante || EMAIL.test(suivante) || TEL.test(suivante)) return "";
      return METIER.test(suivante) && suivante.length <= 60 ? suivante : "";
    })(),
    email: (tout.match(EMAIL) || [""])[0],
    phone: (() => {
      for (const l of ls) {
        const sansMail = l.replace(EMAIL, "");
        const m = sansMail.match(TEL);
        if (m && m[0].replace(/\D/g, "").length >= 9) return m[0].trim();
      }
      return "";
    })(),
    linkedin: (tout.match(LIEN) || [""])[0],
    location: "",
    summary: (sec.summary || []).join(" ").replace(/\s+/g, " ").trim(),
    experience,
    education,
    skills: listeDe(sec.skills || []),
    languages: listeDe(sec.languages || []).map((x) => {
      // "French (Native)", "French: Native", "French - Native" : trois
      // ecritures du meme couple.
      const m = x.match(/^(.*?)\s*[({]\s*(.+?)\s*[)}]$/)
        || x.match(/^(.+?)\s*:\s*(.+)$/)
        || x.match(/^(.+?)\s+[-\u2013]\s+(.+)$/);
      return m ? { lang: m[1].trim(), level: m[2].trim() } : { lang: x, level: "" };
    }),
    certifications: listeDe(sec.certifications || []),
  };

  // LA CONFIANCE COMPTAIT CE QUI ETAIT LA, JAMAIS CE QUI CLOCHAIT
  //
  // Le CV de Kilian, en production, marquait dix sur dix : un nom, un
  // contact, six postes tous nommes, des puces, des competences. Il passait
  // donc sans que le modele le voie jamais. Voici ce qu'il affichait :
  //
  //     Account Manager (cadratin)
  //     Private Clients (cadratin) . UAE
  //     CERTIFICATIONS
  //     . 2023
  //     Level 7 Diploma ... (expected 2026) (cadratin) 2026     [2026]
  //     Banking and Finance Training - Banking products, regulatory
  //     compliance, advisory sales techniques (cadratin)        [ecole]
  //
  // Un intitule qui finit par un separateur, une certification qui n'est
  // qu'une annee, une annee repetee dans le diplome ET dans sa colonne, une
  // phrase entiere rangee comme nom d'ecole. Le decoupage s'est trompe a
  // quatre endroits, et le score n'avait aucun moyen de s'en apercevoir :
  // c'etait un score de COMPLETUDE deguise en score de qualite.
  //
  // Le doute retire donc des points, comme la trouvaille en ajoute. Sous le
  // seuil, le modele reprend la lecture et reorganise : c'est exactement son
  // travail, et c'est ce que le produit promet quand il dit qu'il met en
  // forme. Un CV proprement lu ne perd rien et ne coute toujours rien.
  const raisons = [];
  let points = 0;
  if (cv.name) points += 2; else raisons.push("nom introuvable");
  if (cv.email || cv.phone) points += 1; else raisons.push("aucun contact");
  if (experience.length) points += 2; else raisons.push("aucune experience");
  const nommees = experience.filter((e) => e.title && e.company).length;
  if (experience.length && nommees === experience.length) points += 3;
  else if (nommees) { points += 1; raisons.push(nommees + "/" + experience.length + " postes nommes"); }
  else if (experience.length) raisons.push("postes sans intitule ni employeur");
  if (experience.some((e) => e.bullets.length)) points += 1; else raisons.push("aucune puce");
  if (cv.skills.length) points += 1; else raisons.push("aucune competence");

  // LES PHRASES DU DOCUMENT DOIVENT SE RETROUVER DANS LE CV LU
  //
  // Une lecture qui perd les puces rend un CV a trous avec une confiance
  // de 0,9 : elle avait un nom, un contact, un poste nomme. Le nombre de
  // phrases de la section experience est connu ; si moins de six sur dix
  // sont devenues des puces, la lecture a perdu le document, et c'est le
  // modele qui doit lire.
  const phrasesSource = (sec.experience || []).filter((l) => estPuce(l) || estPhrase(l)).length;
  const pucesLues = experience.reduce((n, e) => n + e.bullets.length, 0);
  if (phrasesSource >= 3 && pucesLues < phrasesSource * 0.6) {
    points -= 3;
    raisons.push(pucesLues + " puce(s) lue(s) pour " + phrasesSource + " phrases dans le document");
  }
  for (const d of signesDeDoute(cv)) { points -= 1; raisons.push(d); }

  return { cv, confiance: Math.max(0, Math.min(1, points / 10)), raisons };
}

// LES QUATRE SIGNES QU'UN DECOUPAGE S'EST TROMPE
//
// Chacun est objectif, se calcule sans rien demander a personne, et vient
// d'un defaut reellement observe. Aucun ne juge le CV de la personne : ils
// jugent le travail du lecteur.
export function signesDeDoute(cv) {
  const signes = [];
  const finitParUnSeparateur = (s) => /[\-\u2013\u2014\u00b7|,;:]\s*$/.test(String(s || "").trim());

  // 1. Un champ qui finit par un separateur : la coupure est tombee au
  //    mauvais endroit et la moitie droite est perdue.
  const coupes = [
    ...(cv.experience || []).flatMap((e) => [e.title, e.company]),
    ...(cv.education || []).flatMap((e) => [e.degree, e.school]),
  ].filter(finitParUnSeparateur);
  if (coupes.length) {
    signes.push(coupes.length + " champ(s) finissent par un separateur, donc "
      + "coupes au mauvais endroit : \"" + coupes[0] + "\"");
  }

  // 2. Une certification qui n'est qu'une date.
  // Un intitule ou un employeur qui est une phrase : une puce a pris la
  // place d'un nom, donc le decoupage des blocs est faux.
  const phrasesEnNom = (cv.experience || []).flatMap((e) => [e.title, e.company])
    .filter((s) => { const t = String(s || "").trim(); return t.length >= 60 || (/[.!?]$/.test(t) && t.split(/\s+/).length >= 6); });
  if (phrasesEnNom.length) {
    signes.push("un intitule ou un employeur est une phrase entiere : \"" + phrasesEnNom[0].slice(0, 50) + "\"");
  }
  const creuses = (cv.certifications || [])
    .filter((c) => /^\(?\d{4}\)?$/.test(String(c || "").trim()));
  if (creuses.length) {
    signes.push("une certification ne contient qu'une annee (\"" + creuses[0]
      + "\") : c'est une ligne mal decoupee, pas une certification");
  }

  // 3. L'annee du diplome se repete dans son intitule ET dans sa colonne :
  //    la periode n'a pas ete retiree du texte.
  // En fin d'intitule seulement : "(expected 2026)" au milieu est une
  // precision. La meme regle que le detecteur et le correcteur, sinon la
  // lecture doute de ce que personne ne sait reparer.
  const doublons = (cv.education || []).filter((e) => {
    const an = String(e.period || "").match(/\d{4}/);
    return an && anneeEnFin(String(e.degree || ""), an[0]);
  });
  if (doublons.length) {
    signes.push("un diplome repete son annee dans son intitule et dans sa "
      + "colonne : la periode n'a pas ete detachee");
  }

  // 4. Un nom d'ecole qui est une phrase. Une ecole s'appelle rarement en
  //    quatre-vingts caracteres avec des virgules ; une description, si.
  const phrases = (cv.education || []).filter((e) => {
    const s = String(e.school || "");
    return s.length > 70 && (s.match(/,/g) || []).length >= 2;
  });
  if (phrases.length) {
    signes.push("un nom d'ecole est une phrase entiere : c'est une "
      + "description rangee au mauvais endroit");
  }

  return signes;
}

/** Le seuil au-dela duquel on n'appelle pas le modele. */
export const CONFIANCE_SUFFISANTE = 0.8;

export { fold };
