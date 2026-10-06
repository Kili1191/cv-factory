// CE QUE LA PERSONNE PEUT EXIGER D'UNE OFFRE
//
// La recherche n'avait que deux champs, l'intitule et la ville, et c'est
// trop peu des qu'il y a huit cents resultats : "developpeur a Londres"
// rend tout, et la personne lit tout. Les exigences qui comptent vraiment
// sont celles qui disqualifient en une ligne, et elles sont toujours les
// memes : le remote, la langue, le salaire plancher, le type de contrat,
// la fraicheur, le niveau.
//
// TOUT CE QUI SUIT SE LIT DANS DU TEXTE LIBRE, ET C'EST LE PIEGE
//
// Une offre n'a pas de champ "exige le francais". On le lit dans la prose,
// et la lecon de `lib/resultatOuResponsabilite.js` vaut ici : un mot
// present ne veut pas dire ce qu'on croit. "Our Paris office" contient
// "Paris", "French fries on the menu" contient "French", et une annonce qui
// dit "no remote" contient "remote". Chaque motif ci-dessous exige donc la
// forme sous laquelle une exigence s'ecrit vraiment, pas le mot seul.
//
// ET UN FILTRE QUI NE PEUT PAS TRANCHER NE DOIT PAS EXCLURE
//
// La moitie des annonces ne disent pas le salaire. Si le plancher les
// ecartait, demander 50 000 viderait la liste de ses meilleures offres sans
// qu'un mot le dise, et c'est exactement la panne silencieuse que ce depot
// connait. Donc : une offre dont le salaire n'est pas ecrit passe le
// plancher, et `compterLesIndecis` dit combien elles sont pour que l'ecran
// puisse l'ecrire.

export const FILTRES_VIDES = {
  what: "", where: "", country: "",
  remote: "",        // "" | "remote" | "hybride" | "surplace"
  langue: "",        // "french", "german"... la langue EXIGEE par l'offre
  salaireMin: 0,     // dans la monnaie de l'annonce, sans conversion
  contrat: "",       // "" | "cdi" | "mission" | "stage" | "partiel"
  depuisJours: 0,    // 0 = sans limite
  seniorite: "",     // "" | "junior" | "confirme" | "senior" | "lead"
};

const texteDe = (o) => String((o && o.title) || "") + " \n " + String((o && o.description) || "");

// --- le remote -------------------------------------------------------------
//
// "Hybrid - 3 days in office" et "Remote (UK)" sont des promesses
// differentes, et "This role is not remote" est le contraire d'une promesse.
// Le refus se teste avant l'offre, comme le parrainage avant le droit de
// travailler dans extension/champs.js : la negation contient le mot.
const PAS_REMOTE = /\b(not|non|no)[\s-]remote\b|\bremote\s*:?\s*no\b|\bon[\s-]?site only\b|\bfully on[\s-]?site\b/i;
const HYBRIDE = /\bhybrid(e)?\b|\b\d\s*days?\s*(a|per)\s*week\s*in\s*(the\s*)?office\b|\bpartiel\s*sur\s*site\b/i;
const REMOTE = /\b(fully\s+)?remote\b|\bwork from home\b|\btelet?ravail\b|\b100\s*%\s*remote\b|\bdistributed team\b/i;

export function formeDeTravail(offre) {
  const t = texteDe(offre) + " \n " + String((offre && offre.location) || "");
  if (HYBRIDE.test(t)) return "hybride";
  if (PAS_REMOTE.test(t)) return "surplace";
  if (REMOTE.test(t)) return "remote";
  return "";
}

// --- la langue exigee ------------------------------------------------------
//
// C'est la demande de Kilian le 6 octobre 2026 : "un poste de francophone a
// Londres". Une annonce londonienne qui exige le francais est une annonce
// ou son profil passe devant tout le monde, et aucun site d'emploi ne sait
// la trouver. Le mot "French" seul ne suffit pas : il est dans "French
// fries", dans "French market" et dans le nom de la moitie des banques.
const LANGUES = {
  french: "fran[cç]ais|french",
  german: "allemand|german|deutsch",
  spanish: "espagnol|spanish|castellano",
  italian: "italien|italian",
  dutch: "n[eé]erlandais|dutch|nederlands",
  portuguese: "portugais|portuguese",
  arabic: "arabe|arabic",
  mandarin: "mandarin|chinese|chinois",
};

// Les formes sous lesquelles une exigence de langue s'ecrit vraiment. Le
// nom de la langue doit etre a cote d'un mot qui dit "la parler".
const EXIGENCE = "(speaker|speaking|fluen\\w*|native|bilingual|biling\\w*|proficien\\w*|"
  + "mother tongue|courant|courante|parl\\w*|ma[iî]tris\\w*|langue)";

// Le liant entre les deux mots. Quinze caracteres, et les lettres sont
// admises : "Maitrise du francais" a un "du" au milieu, et une classe qui
// n'accepte que la ponctuation et les espaces le rate. Quinze est la borne
// qui laisse passer "du", "de la", "in", "of the", et pas une proposition
// entiere : "We serve the French market from London" n'a aucun mot
// d'exigence a quinze caracteres de "French".
const LIANT = "[\\s\\-,/()'\\w]{0,15}";

export function offreExigeLaLangue(offre, langue) {
  const noms = LANGUES[String(langue || "").toLowerCase()];
  if (!noms) return false;
  const t = texteDe(offre);
  // Dans les deux ordres : "fluent French" et "French speaker".
  const avant = new RegExp("\\b" + EXIGENCE + LIANT + "(" + noms + ")\\b", "i");
  const apres = new RegExp("\\b(" + noms + ")" + LIANT + EXIGENCE, "i");
  return avant.test(t) || apres.test(t);
}

// --- le salaire ------------------------------------------------------------
//
// `salary` est une chaine libre : "38000 - 45000", "GBP 50,000", "45k-60k",
// "Competitive". On prend le premier nombre, qui est le plancher annonce,
// et "45k" vaut 45000. Aucune conversion de monnaie : comparer des livres a
// des euros donnerait un faux refus, et la personne cherche dans un marche.
export function plancherAnnonce(offre) {
  const s = String((offre && offre.salary) || "");
  if (!s) return null;
  const m = s.replace(/[\s,]/g, "").match(/(\d+(?:\.\d+)?)(k)?/i);
  if (!m) return null;
  let n = Number(m[1]);
  if (m[2]) n *= 1000;
  // Un taux horaire ou journalier n'est pas un salaire annuel : le comparer
  // a un plancher annuel refuserait toutes les missions.
  if (/\b(per hour|\/h|hourly|par heure|per day|\/day|day rate)\b/i.test(s)) return null;
  return n > 0 ? n : null;
}

// --- le contrat ------------------------------------------------------------
const CONTRATS = {
  cdi: /\b(permanent|full[\s-]?time|cdi|perm)\b/i,
  mission: /\b(contract|contractor|freelance|interim|fixed[\s-]?term|ftc|day rate|mission)\b/i,
  stage: /\b(intern|internship|stage|stagiaire|placement|graduate scheme|apprentice\w*)\b/i,
  partiel: /\b(part[\s-]?time|temps partiel)\b/i,
};

export function typeDeContrat(offre) {
  const t = texteDe(offre);
  // L'ordre compte : une offre de stage dit souvent "full-time internship".
  for (const nom of ["stage", "partiel", "mission", "cdi"]) {
    if (CONTRATS[nom].test(t)) return nom;
  }
  return "";
}

// --- le niveau -------------------------------------------------------------
//
// Lu dans l'intitule seulement. Un corps d'annonce dit "you will report to
// the Head of" et "work with senior stakeholders" : le niveau du poste
// n'est pas dans le corps, il est dans le titre.
const NIVEAUX = {
  lead: /\b(head of|director|vp|vice president|chief|c[t|e|o|f]o|principal|staff|lead)\b/i,
  senior: /\b(senior|snr|sr\.?|experienced|expert)\b/i,
  junior: /\b(junior|jr\.?|graduate|trainee|entry[\s-]level|apprentice\w*|intern(ship)?|stagiaire)\b/i,
};

export function niveauDuPoste(offre) {
  const t = String((offre && offre.title) || "");
  for (const nom of ["lead", "senior", "junior"]) if (NIVEAUX[nom].test(t)) return nom;
  return "confirme";
}

// --- l'age de l'annonce ----------------------------------------------------
export function jourspublie(offre, maintenant = Date.now()) {
  const brut = (offre && (offre.created || offre.postedAt)) || "";
  if (!brut) return null;
  const t = Date.parse(brut);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((maintenant - t) / 86400000));
}

// --- le tamis --------------------------------------------------------------

export function passeLesFiltres(offre, filtres = {}, maintenant = Date.now()) {
  const f = { ...FILTRES_VIDES, ...filtres };

  if (f.remote) {
    const forme = formeDeTravail(offre);
    // "remote" accepte l'hybride : quelqu'un qui veut du remote prend trois
    // jours chez lui plutot que rien. L'inverse n'est pas vrai.
    const ok = f.remote === "remote" ? (forme === "remote" || forme === "hybride")
      : forme === f.remote;
    if (!ok) return false;
  }
  if (f.langue && !offreExigeLaLangue(offre, f.langue)) return false;
  if (f.contrat && typeDeContrat(offre) !== f.contrat) return false;
  if (f.seniorite && niveauDuPoste(offre) !== f.seniorite) return false;

  if (f.salaireMin > 0) {
    const plancher = plancherAnnonce(offre);
    // Un salaire absent passe : voir l'en-tete de ce fichier.
    if (plancher !== null && plancher < f.salaireMin) return false;
  }
  if (f.depuisJours > 0) {
    const jours = jourspublie(offre, maintenant);
    // Une date absente passe, pour la meme raison qu'un salaire absent.
    if (jours !== null && jours > f.depuisJours) return false;
  }
  return true;
}

// Combien d'offres rendues ne disaient pas ce qu'un filtre demandait. C'est
// ce qui permet d'ecrire "dont 31 sans salaire annonce" au lieu de laisser
// croire que les 31 tiennent le plancher.
export function compterLesIndecis(offres, filtres = {}) {
  const f = { ...FILTRES_VIDES, ...filtres };
  const out = {};
  if (f.salaireMin > 0) out.sansSalaire = offres.filter((o) => plancherAnnonce(o) === null).length;
  if (f.depuisJours > 0) out.sansDate = offres.filter((o) => jourspublie(o) === null).length;
  return out;
}

export function filtresActifs(filtres = {}) {
  const f = { ...FILTRES_VIDES, ...filtres };
  return ["remote", "langue", "contrat", "seniorite"].filter((k) => f[k])
    .concat(f.salaireMin > 0 ? ["salaireMin"] : [])
    .concat(f.depuisJours > 0 ? ["depuisJours"] : []);
}
