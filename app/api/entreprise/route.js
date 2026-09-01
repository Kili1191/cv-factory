// EST-CE QUE CET ANCIEN EMPLOYEUR EXISTE ENCORE ?
//
// Cote serveur, pour trois raisons : la cle de Companies House est un secret,
// les registres refusent les appels depuis un navigateur (pas d'en-tete CORS),
// et une reponse mise en cache ici sert tous les utilisateurs au lieu d'etre
// refaite a chaque ouverture d'un CV.
//
// LA REGLE QUI GOUVERNE CETTE ROUTE
//
// Elle peut rendre "inconnue" autant qu'elle veut. Elle ne rend "fermee" que
// si un registre officiel l'a dit. Un registre injoignable, lent, ou qui a
// renomme un champ produit "inconnue" : lib/registresEntreprises.js est ecrit
// pour que ce soit la pente naturelle, et cette route ne la contredit pas.
// Annoncer a quelqu'un que son ancien employeur a coule alors qu'il tourne
// toujours, c'est lui faire dire une betise en entretien.

import {
  experiencesAVerifier, lireReponseFrance, lireReponseUk,
} from "../../../lib/registresEntreprises.js";

export const maxDuration = 30;

// Le registre francais est ouvert et sans cle : il repond toujours. Companies
// House demande une cle gratuite ; sans elle, le Royaume-Uni n'est simplement
// pas verifie, comme une source d'offres non configuree est simplement
// absente.
const FR_URL = "https://recherche-entreprises.api.gouv.fr/search";
const UK_URL = "https://api.company-information.service.gov.uk/search/companies";

// POURQUOI UN CACHE, ET POURQUOI SI LONG
//
// Cette route part au chargement de chaque CV, pas sur un clic. Sans cache,
// une poignee d'utilisateurs suffit a faire marteler les registres depuis les
// quelques adresses que Vercel partage entre toutes les fonctions, et le
// premier a repondre 429 fait taire la verification pour tout le monde.
//
// Le statut d'une societe bouge de l'ordre d'une fois dans sa vie. Vingt-quatre
// heures de retard sur une radiation ne coutent rien a personne ; un registre
// qui nous bloque coute la fonctionnalite entiere.
//
// Le cache vit dans l'instance, donc il disparait a froid. Ce n'est pas un
// probleme : il sert a absorber les rafales, pas a garantir un taux de succes.
const CACHE = new Map();
const CACHE_MS = 24 * 60 * 60 * 1000;

function duCache(clef) {
  const e = CACHE.get(clef);
  if (!e) return null;
  if (Date.now() - e.t > CACHE_MS) { CACHE.delete(clef); return null; }
  return e.v;
}

function auCache(clef, v) {
  // On ne garde que les reponses d'un registre. Un echec reseau remis en cache
  // ferait durer une panne de dix secondes pendant vingt-quatre heures.
  if (!v || v.etat === "inconnue") return;
  // Une carte sans borne dans une instance longue finit par peser. Mille
  // entrees couvrent largement une rafale ; au-dela on repart de zero, ce qui
  // coute un aller-retour et rien d'autre.
  if (CACHE.size > 1000) CACHE.clear();
  CACHE.set(clef, { t: Date.now(), v });
}

function ukConfigured(env) {
  return typeof env.COMPANIES_HOUSE_KEY === "string"
    && env.COMPANIES_HOUSE_KEY.trim().length > 0;
}

// Un registre lent ne doit pas retenir la reponse : la verification est un
// complement, pas un prealable. Au-dela du delai, l'experience est inconnue et
// le reste part quand meme.
async function avecDelai(promesse, ms) {
  let minuteur;
  try {
    return await Promise.race([
      promesse,
      new Promise((_, rejette) => {
        minuteur = setTimeout(() => rejette(new Error("delai depasse")), ms);
      }),
    ]);
  } finally {
    if (minuteur) clearTimeout(minuteur);
  }
}

async function verifierFrance(nom) {
  const url = FR_URL + "?" + new URLSearchParams({ q: nom, per_page: "5" });
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return lireReponseFrance(await res.json(), nom);
}

async function verifierUk(nom, env) {
  const url = UK_URL + "?" + new URLSearchParams({ q: nom, items_per_page: "5" });
  // Companies House s'authentifie en Basic, la cle en identifiant et un mot de
  // passe vide.
  const jeton = Buffer.from(env.COMPANIES_HOUSE_KEY + ":").toString("base64");
  const res = await fetch(url, {
    headers: { Accept: "application/json", Authorization: "Basic " + jeton },
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return lireReponseUk(await res.json(), nom);
}

export async function POST(request) {
  let corps = {};
  try { corps = await request.json(); } catch { corps = {}; }
  // ON N'ENVOIE QUE CE QUI SERT A REPONDRE
  //
  // La question est "cette societe existe-t-elle encore". Y repondre demande
  // un nom, un lieu et des dates. Le nom de la personne, son telephone et son
  // adresse n'y servent a rien, donc ils ne sortent pas du navigateur : le
  // client n'envoie que la liste des experiences.
  const experience = corps && Array.isArray(corps.experience) ? corps.experience : [];
  const aFaire = experiencesAVerifier({ experience });
  const env = process.env;

  const resultats = await Promise.all(aFaire.map(async (exp) => {
    // Un pays sans registre ouvert n'est pas une entreprise suspecte : c'est
    // une verification qu'on ne sait pas faire, et le produit le dit.
    if (!exp.pays) {
      return { ...exp, etat: "inconnue", pourquoi: "pas de registre ouvert pour ce pays" };
    }
    if (exp.pays === "uk" && !ukConfigured(env)) {
      return { ...exp, etat: "inconnue", pourquoi: "registre britannique non configure" };
    }
    const clef = exp.pays + ":" + exp.company.toLowerCase().trim();
    const connu = duCache(clef);
    if (connu) return { ...exp, ...connu };
    try {
      const v = await avecDelai(
        exp.pays === "fr" ? verifierFrance(exp.company) : verifierUk(exp.company, env),
        8000
      );
      auCache(clef, v);
      return { ...exp, ...v };
    } catch (err) {
      return { ...exp, etat: "inconnue", pourquoi: "registre injoignable (" + err.message + ")" };
    }
  }));

  return Response.json({
    verifiees: resultats,
    // Ce que le produit ne sait pas faire se dit, au lieu d'etre confondu avec
    // "rien a signaler".
    registres: { fr: true, uk: ukConfigured(env) },
  });
}
