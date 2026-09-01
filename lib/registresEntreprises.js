// UN ANCIEN EMPLOYEUR QUI N'EXISTE PLUS
//
// Le moment ou une candidature meurt sans que personne ne le dise : le
// recruteur appelle l'employeur d'il y a six ans pour verifier, le numero ne
// repond plus, le site est mort, et il passe au dossier suivant. Cote
// candidat, rien ne se voit. On ne recoit pas de refus pour ca, on ne recoit
// rien du tout.
//
// C'est un risque de metier autant que de personne. Nuvi sert des gens qui ont
// travaille en restaurant, en agence d'aide a domicile, en petit commerce :
// des entreprises qui ferment beaucoup, et dont la fermeture ne laisse aucune
// trace visible sur un CV.
//
// D'ou la verification, et le poste actuel mis de cote : quelqu'un sait si la
// boite ou il travaille aujourd'hui tourne encore.
//
// CE QUI EXISTE VRAIMENT COMME SOURCE, ET CE QUI N'EXISTE PAS
//
//   France   recherche-entreprises.api.gouv.fr. Registre officiel, gratuit,
//            sans cle. Porte l'etat administratif de l'entreprise et la date
//            de cessation.
//   Royaume-Uni  Companies House. Registre officiel, gratuit, cle developpeur
//            immediate. company_status vaut "active", "dissolved",
//            "liquidation", "administration"... et date_of_cessation donne la
//            date.
//   Ailleurs Rien de gratuit et d'ouvert. Les Emirats, la Suisse, le Canada
//            n'exposent pas de registre interrogeable sans contrat. Une
//            experience dans ces pays n'est donc PAS verifiee, et le produit
//            doit le dire au lieu de laisser croire qu'elle est saine.
//
// LE SENS DU DOUTE EST DECIDE ICI, UNE FOIS
//
// Se tromper dans un sens fait rater une preparation. Se tromper dans l'autre
// annonce a quelqu'un que son ancien employeur a coule alors qu'il tourne
// toujours : c'est une accusation, elle est fausse, et elle est humiliante si
// la personne la repete en entretien.
//
// Donc : "fermee" exige qu'un registre le dise, avec un etat reconnu et un nom
// qui correspond vraiment. Tout le reste - injoignable, illisible, ambigu,
// pays sans registre, plusieurs societes du meme nom - vaut INCONNU. Une
// panne de reseau, un champ renomme par le registre ou un pays non couvert
// produisent du silence, jamais un verdict.

// Etats qu'un registre emploie pour dire "cette societe ne trade plus".
// La liste est fermee volontairement : un etat inconnu de cette liste ne
// devient pas "fermee" par defaut, il reste inconnu.
const ETATS_FERMES_UK = new Set([
  "dissolved", "liquidation", "receivership", "administration",
  "converted-closed", "closed", "insolvency-proceedings",
]);

// Le registre francais code l'etat administratif sur une lettre : A pour
// active, C pour cessee.
const ETATS_FERMES_FR = new Set(["c", "cessee", "ferme", "fermee"]);

// L'etat rendu par un registre se compare sans accent ni casse : "Cessee" et
// "cessee" sont le meme etat, et un accent qui traine ferait rater la
// correspondance, donc rendrait INCONNU une fermeture pourtant annoncee.
function etatNormalise(brut) {
  return String(brut || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim();
}

// Etats qui disent explicitement "elle tourne". Utile pour distinguer "le
// registre a repondu, tout va bien" de "on n'a rien pu verifier" : les deux
// se taisent a l'ecran, mais seul le premier est une reponse.
const ETATS_ACTIFS_UK = new Set(["active", "open"]);
const ETATS_ACTIFS_FR = new Set(["a", "active"]);

/** Normalise un nom de societe pour le comparer : casse, accents, ponctuation,
 *  et les suffixes juridiques qu'un CV n'ecrit jamais mais qu'un registre
 *  porte toujours ("Ltd", "SARL", "SAS"). Sans ca, "Le Bistrot" ne
 *  correspondrait jamais a "LE BISTROT SARL". */
export function normaliserNom(nom) {
  return String(nom || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(ltd|limited|plc|llp|inc|llc|sarl|sas|sasu|sa|eurl|snc|sci|group|groupe|holdings?|company|co)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Deux noms designent-ils la meme societe ? Egalite apres normalisation, ou
 *  inclusion quand le nom du registre est le nom du CV plus une mention
 *  ("Harrods" contre "Harrods Stores"). L'inclusion exige un nom du CV d'au
 *  moins quatre caracteres : "Le" ou "Bar" matcherait la moitie du registre. */
export function memeSociete(nomCv, nomRegistre) {
  const a = normaliserNom(nomCv);
  const b = normaliserNom(nomRegistre);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length < 4) return false;
  return b.startsWith(a + " ") || b.endsWith(" " + a) || b.includes(" " + a + " ");
}

// Le pays se lit sur le lieu ecrit dans l'experience, parce que c'est la seule
// indication que le CV porte. On ne devine pas : un lieu qui ne nomme aucun
// des deux pays couverts rend null, et l'experience sera declaree non
// verifiable au lieu d'etre envoyee au mauvais registre.
const INDICES_UK = /\b(uk|u\.k\.|united kingdom|england|scotland|wales|london|manchester|birmingham|leeds|glasgow|liverpool|bristol|edinburgh|sheffield|cardiff|belfast|nottingham|newcastle|brighton|oxford|cambridge)\b/i;
const INDICES_FR = /\b(france|paris|lyon|marseille|toulouse|nice|nantes|montpellier|strasbourg|bordeaux|lille|rennes|reims|toulon|grenoble|dijon|angers|nimes|villeurbanne|clermont|aix|brest|tours|amiens|limoges|annecy|perpignan|metz|besancon|orleans|rouen|mulhouse|caen|nancy|avignon|poitiers|dunkerque|versailles|courbevoie|colombes|asnieres|cergy|antibes|calais|beziers|bourges|la rochelle|saint etienne|saint-etienne|le havre|le mans|aix-en-provence|boulogne)\b/i;

/** Quel registre peut repondre pour cette experience, d'apres le lieu ecrit.
 *  Rend "fr", "uk" ou null. */
export function paysDeLExperience(exp) {
  const lieu = String((exp && exp.location) || "");
  if (INDICES_UK.test(lieu)) return "uk";
  if (INDICES_FR.test(lieu)) return "fr";
  return null;
}

// Derniere annee mentionnee dans une periode. "2017 - 2024" rend 2024,
// "depuis 2022" et "2022 - present" rendent l'annee en cours, ce qui est
// exact : le poste court toujours.
const ANNEE_EN_COURS = new Date().getFullYear();
function finDe(periode) {
  const p = String(periode || "");
  if (/\b(present|actuel|aujourd|current|now|ongoing|to date)\b/i.test(p)) return ANNEE_EN_COURS;
  const annees = (p.match(/(?:19|20)\d{2}/g) || []).map(Number);
  return annees.length ? Math.max(...annees) : 0;
}

/** Les experiences a verifier : toutes sauf la plus recente.
 *
 *  "La plus recente" se decide sur les dates et pas sur la position dans la
 *  liste. Un CV importe d'un PDF n'est pas toujours antichronologique, et
 *  prendre l'element zero ferait sauter la verification du bon poste tout en
 *  la faisant sur le poste actuel.
 *
 *  Une experience sans employeur nomme n'est pas verifiable : rien a chercher.
 */
export function experiencesAVerifier(cv) {
  const exps = (cv && Array.isArray(cv.experience) ? cv.experience : [])
    .map((exp, index) => ({ exp, index, fin: finDe(exp && exp.period) }));
  if (exps.length < 2) return [];

  // La plus recente est celle qui finit le plus tard. A egalite, la premiere
  // de la liste : c'est la convention d'un CV antichronologique.
  let recente = exps[0];
  for (const e of exps) if (e.fin > recente.fin) recente = e;

  return exps
    .filter((e) => e.index !== recente.index)
    .filter((e) => String((e.exp && e.exp.company) || "").trim().length >= 2)
    .map((e) => ({
      index: e.index,
      company: String(e.exp.company).trim(),
      location: String(e.exp.location || "").trim(),
      period: String(e.exp.period || "").trim(),
      pays: paysDeLExperience(e.exp),
    }));
}

function inconnue(pourquoi) {
  return { etat: "inconnue", depuis: null, source: null, nomTrouve: null, pourquoi };
}

/** Lit la reponse de Companies House pour un nom donne.
 *
 *  Ne rend "fermee" que si UN seul candidat porte ce nom et que son etat est
 *  un etat de fermeture reconnu. Deux societes du meme nom dont l'une a coule
 *  ne prouvent rien sur celle ou la personne a travaille. */
export function lireReponseUk(payload, nomCv) {
  const items = payload && Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) return inconnue("aucun resultat");

  const candidats = items.filter((it) => memeSociete(nomCv, it && (it.title || it.company_name)));
  if (!candidats.length) return inconnue("aucun nom ne correspond");
  if (candidats.length > 1) {
    const etats = new Set(candidats.map((c) => etatNormalise(c.company_status)));
    // Plusieurs societes du meme nom : on ne tranche que si elles s'accordent.
    if (etats.size > 1) return inconnue("plusieurs societes de ce nom, etats differents");
  }
  const c = candidats[0];
  const etat = etatNormalise(c.company_status);
  if (ETATS_FERMES_UK.has(etat)) {
    return {
      etat: "fermee",
      depuis: c.date_of_cessation || null,
      source: "Companies House",
      nomTrouve: c.title || c.company_name || null,
      pourquoi: etat,
    };
  }
  if (ETATS_ACTIFS_UK.has(etat)) {
    return { etat: "active", depuis: null, source: "Companies House", nomTrouve: c.title || null, pourquoi: etat };
  }
  // Un etat que cette liste ne connait pas ne devient pas une fermeture.
  return inconnue(etat ? "etat non reconnu : " + etat : "etat absent");
}

/** Lit la reponse du registre francais.
 *
 *  Le registre a change de nom de champ par le passe (date_cessation,
 *  date_fermeture) et l'etat se trouve tantot sur la societe, tantot sur son
 *  siege. On lit les deux orthographes et les deux emplacements : un champ
 *  qu'on ne trouve pas rend INCONNU, donc une evolution du registre rend le
 *  produit muet et jamais faux. */
export function lireReponseFrance(payload, nomCv) {
  const items = payload && Array.isArray(payload.results) ? payload.results : [];
  if (!items.length) return inconnue("aucun resultat");

  const candidats = items.filter((it) =>
    memeSociete(nomCv, it && (it.nom_complet || it.nom_raison_sociale)));
  if (!candidats.length) return inconnue("aucun nom ne correspond");

  const c = candidats[0];
  const siege = (c && c.siege) || {};
  const brut = c.etat_administratif || siege.etat_administratif || "";
  const etat = etatNormalise(brut);
  const depuis = c.date_cessation || c.date_fermeture
    || siege.date_cessation || siege.date_fermeture || null;

  if (ETATS_FERMES_FR.has(etat)) {
    return {
      etat: "fermee", depuis: depuis || null,
      source: "Annuaire des entreprises",
      nomTrouve: c.nom_complet || c.nom_raison_sociale || null,
      pourquoi: etat,
    };
  }
  if (ETATS_ACTIFS_FR.has(etat)) {
    return {
      etat: "active", depuis: null, source: "Annuaire des entreprises",
      nomTrouve: c.nom_complet || null, pourquoi: etat,
    };
  }
  return inconnue(etat ? "etat non reconnu : " + etat : "etat absent");
}

/** La phrase montree a la personne. Elle dit ce qui a ete constate, par qui,
 *  et ce que ca change concretement pour elle : un recruteur qui appelle cet
 *  employeur ne joindra personne, donc ce qui reste verifiable, c'est un
 *  ancien collegue et un papier. */
export function direLaFermeture(v, exp, langue = "fr") {
  if (!v || v.etat !== "fermee") return "";
  const en = langue === "en";
  const quand = v.depuis ? String(v.depuis).slice(0, 4) : "";
  if (en) {
    return exp.company + " is struck off the register"
      + (quand ? " (since " + quand + ")" : "")
      + ", according to " + v.source + ". A recruiter checking this job will "
      + "reach nobody. What still stands up: a former manager or colleague who "
      + "will take the call on their own phone, and a payslip, contract or "
      + "certificate. Get one of those before you send this.";
  }
  return exp.company + " est radiee du registre"
    + (quand ? " (depuis " + quand + ")" : "")
    + ", d'apres " + v.source + ". Un recruteur qui verifie ce poste ne joindra "
    + "personne. Ce qui tient encore : un ancien responsable ou collegue qui "
    + "repondra sur son propre telephone, et une fiche de paie, un contrat ou "
    + "un certificat de travail. Procure-t'en un avant d'envoyer.";
}
