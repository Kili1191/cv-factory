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
  summary: /^(profil|profile|about|a propos|resume|summary|accroche|objectif|objective|presentation)\b/i,
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

function estPuce(l) { return /^[•‣▪◦·*\-\u2013\u2014]\s+/.test(l); }
function sansPuce(l) { return l.replace(/^[•‣▪◦·*\-\u2013\u2014]\s+/, "").trim(); }

/** La periode telle qu'ecrite, pour la rendre a l'editeur sans la reformater. */
function periodeDe(l) {
  const m = String(l || "").match(PERIODE);
  return m ? m[0].replace(/\s+/g, " ").trim() : "";
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
function blocs(ls) {
  const out = [];
  let cur = null;
  let vientDePuce = false;
  for (const l of ls) {
    const puce = estPuce(l);
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
  return { title: title || "", company: company || "", location };
}

function listeDe(ls) {
  const out = [];
  for (const l of ls) {
    for (const p of sansPuce(l).split(/[,;|•·]|\s{3,}/)) {
      const t = p.trim();
      if (t && t.length <= 60) out.push(t);
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

  const experience = blocs(sec.experience || []).map((b, i) => {
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
      const m = x.match(/^(.*?)\s*[({]\s*(.+?)\s*[)}]$/);
      return m ? { lang: m[1].trim(), level: m[2].trim() } : { lang: x, level: "" };
    }),
    certifications: listeDe(sec.certifications || []),
  };

  // La confiance ne se decrete pas : elle compte ce qui a ete retrouve.
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

  return { cv, confiance: Math.min(1, points / 10), raisons };
}

/** Le seuil au-dela duquel on n'appelle pas le modele. */
export const CONFIANCE_SUFFISANTE = 0.8;

export { fold };
