// Sources d'offres d'emploi.
//
// CE QUI EXISTE VRAIMENT, ET CE QUI N'EXISTE PAS
//
// Verifie source par source avant d'ecrire une ligne, parce que se tromper
// ici coute des semaines :
//
//   France Travail   API officielle, gratuite, plus de 300 000 offres,
//                    OAuth2 client credentials. La meilleure source francaise,
//                    et de loin.
//   Adzuna           gratuite en self-service, 19 pays dont la France et le
//                    Royaume-Uni. Une seule inscription couvre les deux
//                    marches qui interessent Nuvi.
//   Reed             gratuite, cle developpeur immediate, Royaume-Uni.
//
//   LinkedIn         PAS de donnees. "Sign In with LinkedIn" donne le nom,
//                    l'e-mail et la photo, rien d'autre. Le profil et les
//                    offres passent par le Partner Program : trois a six mois
//                    d'instruction, accorde a discretion, refus rarement
//                    expliques. Le chemin honnete pour importer un profil
//                    LinkedIn reste l'export PDF que LinkedIn fournit a
//                    chacun, et que Nuvi sait deja lire.
//   Indeed           l'API publique de recherche est fermee depuis 2024. Il
//                    ne reste qu'une API employeur payante a l'appel. Aucun
//                    acces en lecture pour une application tierce.
//   Google           pas d'API d'offres. Google se branche pour la connexion,
//                    la boite mail et l'agenda, pas pour les offres.
//
// Chaque source est absente tant que sa cle n'est pas posee. Aucune ne casse
// les autres : une source en panne est signalee, les autres repondent.

function truthy(v) { return typeof v === "string" && v.trim().length > 0; }

// Une source peut repondre autre chose qu'un tableau : champ absent, erreur
// rendue en JSON, format modifie sans prevenir. Sans ce garde-fou, `.map`
// leve et toute la recherche tombe, y compris les sources qui, elles, ont
// bien repondu.
function listOf(payload, key) {
  const raw = payload && typeof payload === "object" ? payload[key] : null;
  return Array.isArray(raw) ? raw : [];
}

// Forme commune. Tout ce qui suit dans l'application ne connait que ceci.
function normalise({ id, source, title, company, location, url, description, postedAt, salary }) {
  return {
    id: String(id || ""),
    source,
    title: String(title || "").trim(),
    company: String(company || "").trim(),
    location: String(location || "").trim(),
    url: String(url || ""),
    description: String(description || "").trim(),
    postedAt: postedAt || null,
    salary: salary || null,
  };
}

// --- France Travail ---------------------------------------------------------

export function franceTravailConfigured(env) {
  return truthy(env.FRANCE_TRAVAIL_ID) && truthy(env.FRANCE_TRAVAIL_SECRET);
}

export async function franceTravailToken(env, fetchImpl = fetch) {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.FRANCE_TRAVAIL_ID,
    client_secret: env.FRANCE_TRAVAIL_SECRET,
    scope: "api_offresdemploiv2 o2dsoffre",
  });
  const res = await fetchImpl(
    "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire",
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body }
  );
  if (!res.ok) throw new Error(`France Travail auth ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

export function franceTravailParse(payload) {
  const list = listOf(payload, "resultats");
  return list.map(o => normalise({
    id: o.id,
    source: "France Travail",
    title: o.intitule,
    company: o.entreprise && o.entreprise.nom,
    location: o.lieuTravail && o.lieuTravail.libelle,
    url: o.origineOffre && o.origineOffre.urlOrigine,
    description: o.description,
    postedAt: o.dateCreation,
    salary: o.salaire && o.salaire.libelle,
  }));
}

// --- Adzuna -----------------------------------------------------------------

export function adzunaConfigured(env) {
  return truthy(env.ADZUNA_APP_ID) && truthy(env.ADZUNA_APP_KEY);
}

// FIFTY PER PAGE, AND A PAGE THAT TURNS
//
// The first version asked for twenty results from page one, and never the
// next. So the ceiling the person sees is not the size of the index: it is
// twenty. An aggregator holds hundreds of thousands behind the same query,
// and they were unreachable. Fifty is the most Adzuna accepts per page.
export function adzunaUrl(env, { what, where, country = "fr", page = 1, filters = null }) {
  const c = /^[a-z]{2}$/.test(String(country)) ? country : "fr";
  const params = new URLSearchParams({
    app_id: env.ADZUNA_APP_ID,
    app_key: env.ADZUNA_APP_KEY,
    results_per_page: "50",
    "content-type": "application/json",
  });
  if (truthy(what)) params.set("what", what);
  if (truthy(where)) params.set("where", where);

  // THREE OF THE SIX REQUIREMENTS, ASKED OF THE SOURCE
  //
  // The route filters all six on what comes back, because no aggregator can
  // read "the ad requires French" out of the prose. But Adzuna does take a
  // salary floor, an age and a contract kind, and asking it is strictly
  // better twice over: the fifty results it returns are fifty results that
  // can survive the filter instead of fifty it will discard, and `count`
  // then describes the search the person actually made rather than a wider
  // one. The quota is counted per call, so a call that comes back full is
  // worth more than one that comes back and gets thrown away.
  //
  // The other three stay local. Adzuna has no parameter for the place of
  // work, the language or the level, and sending a guess would silently
  // narrow the search in a way nothing on screen could explain.
  if (filters) {
    if (filters.salaryFrom > 0) params.set("salary_min", String(filters.salaryFrom));
    if (filters.postedWithin > 0) params.set("max_days_old", String(filters.postedWithin));
    const kind = { permanent: "permanent", contract: "contract", parttime: "part_time" }[filters.contract];
    // An internship has no Adzuna flag: it stays read from the prose.
    if (kind) params.set(kind, "1");
  }
  return `https://api.adzuna.com/v1/api/jobs/${c}/search/${Math.max(1, Number(page) || 1)}?${params}`;
}

export function adzunaParse(payload) {
  const list = listOf(payload, "results");
  return list.map(o => normalise({
    id: o.id,
    source: "Adzuna",
    title: o.title,
    company: o.company && o.company.display_name,
    location: o.location && o.location.display_name,
    url: o.redirect_url,
    description: o.description,
    postedAt: o.created,
    salary: o.salary_min && o.salary_max
      ? `${Math.round(o.salary_min)} - ${Math.round(o.salary_max)}`
      : null,
  }));
}

// --- Reed -------------------------------------------------------------------

export function reedConfigured(env) { return truthy(env.REED_API_KEY); }

export function reedUrl({ what, where, page = 1, filters = null }) {
  const n = Math.max(1, Number(page) || 1);
  const params = new URLSearchParams({
    // Reed allows up to 100 per call. Fifty keeps every source on the same
    // page size as the screen, so "show more" means the same thing whichever
    // source a job came from.
    resultsToTake: "50",
    resultsToSkip: String((n - 1) * 50),
  });
  if (truthy(what)) params.set("keywords", what);
  if (truthy(where)) params.set("locationName", where);

  // WHAT REED TAKES, AND WHAT IT DOES NOT
  //
  // Documented on reed.co.uk/developers: minimumSalary, permanent, contract,
  // temp, partTime, fullTime, graduate, distanceFromLocation. So the salary
  // floor and the contract kind go to the source, same reasoning as Adzuna:
  // a call that comes back usable costs the same as one that comes back and
  // gets discarded.
  //
  // Reed has NO parameter for how old an ad is, where Adzuna has
  // max_days_old. The two aggregators therefore disagree about what they can
  // sieve, which is why `atSource` below is per source rather than one list.
  // An internship is not Reed's `graduate` and the level is not either, so
  // both stay read from the prose.
  if (filters) {
    if (filters.salaryFrom > 0) params.set("minimumSalary", String(filters.salaryFrom));
    const kind = { permanent: "permanent", contract: "contract", parttime: "partTime" }[filters.contract];
    if (kind) params.set(kind, "true");
  }
  return `https://www.reed.co.uk/api/1.0/search?${params}`;
}

export function reedAuthHeader(env) {
  // Reed attend la cle comme identifiant d'une authentification basique,
  // mot de passe vide.
  const raw = `${env.REED_API_KEY}:`;
  const b64 = typeof Buffer !== "undefined"
    ? Buffer.from(raw).toString("base64")
    : btoa(raw);
  return `Basic ${b64}`;
}

export function reedParse(payload) {
  const list = listOf(payload, "results");
  return list.map(o => normalise({
    id: o.jobId,
    source: "Reed",
    title: o.jobTitle,
    company: o.employerName,
    location: o.locationName,
    url: o.jobUrl,
    description: o.jobDescription,
    postedAt: o.date,
    salary: o.minimumSalary && o.maximumSalary
      ? `${o.minimumSalary} - ${o.maximumSalary}`
      : null,
  }));
}

// HOW MANY THE AGGREGATOR HAS, NOT HOW MANY IT RETURNED
//
// Both declare their own total: Adzuna in `count`, Reed in `totalResults`.
// It is the only honest way to write "1 to 50 of 64,000" rather than "50",
// and the difference is not cosmetic: a list of fifty reads as the end of
// the seam.
export function totalAtTheSource(payload) {
  if (!payload || typeof payload !== "object") return 0;
  for (const cle of ["count", "totalResults", "total"]) {
    const v = payload[cle];
    if (typeof v === "number" && v >= 0) return v;
  }
  return 0;
}

// --- inventaire -------------------------------------------------------------

export function availableSources(env) {
  const out = [];
  if (franceTravailConfigured(env)) out.push("France Travail");
  if (adzunaConfigured(env)) out.push("Adzuna");
  if (reedConfigured(env)) out.push("Reed");
  return out;
}

// WHICH REQUIREMENTS EACH SOURCE CAN SIEVE ITSELF
//
// This decides whether a total describes the search that was made. A
// requirement the source applied is counted by the source; a requirement we
// apply afterwards is not, and only the page we fetched has been sieved.
//
// They do not agree. Adzuna takes an age (`max_days_old`), Reed does not.
// Neither takes the place of work, the language or the level, because none
// of the three is a field on a job ad: they are sentences in its prose, and
// that is exactly why reading them is worth doing here.
export const FILTERS_AT_SOURCE = {
  Adzuna: ["salaryFrom", "postedWithin", "contract"],
  Reed: ["salaryFrom", "contract"],
  "France Travail": [],
};

export function sourceSievesItself(source, filter) {
  const taken = FILTERS_AT_SOURCE[source];
  return Array.isArray(taken) && taken.includes(filter);
}

// WHICH NAMES THE SERVER CAN SEE, AND NOTHING ELSE
//
// On 6 October 2026 Kilian created an Adzuna key, put it in Vercel, and the
// search still answered "career pages" only. The key was good: run from a
// terminal against the real API it returned 6794 jobs. Nothing on any screen
// could tell the three causes apart, so it cost a round trip to find out.
// The three are: the variable is not there at all (saved after the redeploy,
// or ticked for Preview and not Production), the name is misspelt, or the
// value is wrong.
//
// A boolean per name separates them in one glance. Absent means Vercel is
// not delivering it; present but the search failing means the value is
// wrong, and that already arrives as its own warning.
//
// ONLY EVER A BOOLEAN. The names are in a public repository and tell an
// attacker nothing; a value would be the whole secret. There is no branch
// here that can return one, which is the point of writing it this way rather
// than returning a prefix or a length.
export const AGGREGATOR_KEYS = [
  "ADZUNA_APP_ID", "ADZUNA_APP_KEY",
  "REED_API_KEY",
  "FRANCE_TRAVAIL_ID", "FRANCE_TRAVAIL_SECRET",
];

export function keysTheServerCanSee(env) {
  const out = {};
  for (const name of AGGREGATOR_KEYS) out[name] = truthy(env[name]);
  return out;
}
