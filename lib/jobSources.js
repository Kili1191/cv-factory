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

export function adzunaUrl(env, { what, where, country = "fr", page = 1 }) {
  const c = /^[a-z]{2}$/.test(String(country)) ? country : "fr";
  const params = new URLSearchParams({
    app_id: env.ADZUNA_APP_ID,
    app_key: env.ADZUNA_APP_KEY,
    results_per_page: "20",
    "content-type": "application/json",
  });
  if (truthy(what)) params.set("what", what);
  if (truthy(where)) params.set("where", where);
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

export function reedUrl({ what, where }) {
  const params = new URLSearchParams({ resultsToTake: "20" });
  if (truthy(what)) params.set("keywords", what);
  if (truthy(where)) params.set("locationName", where);
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

// --- inventaire -------------------------------------------------------------

export function availableSources(env) {
  const out = [];
  if (franceTravailConfigured(env)) out.push("France Travail");
  if (adzunaConfigured(env)) out.push("Adzuna");
  if (reedConfigured(env)) out.push("Reed");
  return out;
}
