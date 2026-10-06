// Les trois sources d'offres doivent rendre la meme forme.
//
// Chacune repond dans son propre format. Si l'une d'elles laisse passer un
// champ vide ou mal nomme, l'offre arrive dans le suivi sans intitule ou sans
// annonce, et toute la chaine derriere - CV adapte, relance, entretien -
// travaille sur du vide sans qu'aucune erreur ne soit levee.
//
// Le test ne contacte aucun service : il fournit les formes de reponse
// documentees de chaque source et verifie la sortie. Il tourne donc sans cle,
// en integration continue comme ailleurs.

import {
  franceTravailParse, adzunaParse, reedParse,
  availableSources, adzunaUrl, reedUrl, reedAuthHeader, totalAtTheSource,
  keysTheServerCanSee, AGGREGATOR_KEYS,
} from "../lib/jobSources.js";

const REQUIRED = ["id", "source", "title", "company", "location", "url", "description"];

export async function run() {
  const failures = [];

  const cases = [
    ["France Travail", franceTravailParse, {
      resultats: [{
        id: "184TJKV",
        intitule: "Chef de rang",
        entreprise: { nom: "Le Comptoir" },
        lieuTravail: { libelle: "75 - Paris" },
        origineOffre: { urlOrigine: "https://candidat.francetravail.fr/offres/184TJKV" },
        description: "Service en salle, 39h.",
        dateCreation: "2026-08-19T09:00:00.000Z",
        salaire: { libelle: "Mensuel de 2200 a 2400 euros" },
      }],
    }],
    ["Adzuna", adzunaParse, {
      results: [{
        id: "4912345",
        title: "Bar Manager",
        company: { display_name: "Soho House" },
        location: { display_name: "London" },
        redirect_url: "https://www.adzuna.co.uk/jobs/land/ad/4912345",
        description: "Running a busy cocktail bar.",
        created: "2026-08-18T11:20:00Z",
        salary_min: 38000, salary_max: 45000,
      }],
    }],
    ["Reed", reedParse, {
      results: [{
        jobId: 55123456,
        jobTitle: "Restaurant Manager",
        employerName: "The Ivy",
        locationName: "London",
        jobUrl: "https://www.reed.co.uk/jobs/restaurant-manager/55123456",
        jobDescription: "Leading a floor team of 20.",
        date: "17/08/2026",
        minimumSalary: 42000, maximumSalary: 48000,
      }],
    }],
  ];

  for (const [name, parse, payload] of cases) {
    let out;
    try { out = parse(payload); }
    catch (err) { failures.push(`${name} : l'analyse a leve ${err.message}`); continue; }

    if (!Array.isArray(out) || out.length !== 1) {
      failures.push(`${name} : ${Array.isArray(out) ? out.length : "?"} offre(s) au lieu d'une`);
      continue;
    }
    const job = out[0];
    for (const field of REQUIRED) {
      if (typeof job[field] !== "string") {
        failures.push(`${name} : le champ "${field}" n'est pas une chaine (${typeof job[field]})`);
      } else if (field !== "description" && !job[field]) {
        failures.push(`${name} : le champ "${field}" est vide`);
      }
    }
    if (job.source !== name) {
      failures.push(`${name} : source annoncee "${job.source}"`);
    }
  }

  // Une reponse vide ou malformee ne doit jamais faire tomber la route.
  for (const [name, parse] of cases) {
    for (const bad of [null, undefined, {}, { resultats: null }, { results: "x" }]) {
      try {
        const r = parse(bad);
        if (!Array.isArray(r)) failures.push(`${name} : reponse vide -> ${typeof r} au lieu d'un tableau`);
      } catch (err) {
        failures.push(`${name} : une reponse vide leve ${err.message}`);
      }
    }
  }

  // Sans cle, aucune source ne doit etre annoncee comme disponible.
  const none = availableSources({});
  if (none.length !== 0) {
    failures.push(`sans aucune cle, ${none.length} source(s) annoncee(s) : ${none.join(", ")}`);
  }
  const all = availableSources({
    FRANCE_TRAVAIL_ID: "a", FRANCE_TRAVAIL_SECRET: "b",
    ADZUNA_APP_ID: "c", ADZUNA_APP_KEY: "d", REED_API_KEY: "e",
  });
  if (all.length !== 3) failures.push(`avec les cles, ${all.length} source(s) au lieu de 3`);

  // Les cles ne doivent pas fuir ailleurs que dans la requete prevue.
  const url = adzunaUrl({ ADZUNA_APP_ID: "ID1", ADZUNA_APP_KEY: "KEY1" },
    { what: "bar manager", where: "Paris", country: "fr" });
  if (!url.startsWith("https://api.adzuna.com/")) failures.push("Adzuna : mauvaise adresse");
  if (!url.includes("app_id=ID1")) failures.push("Adzuna : identifiant absent de la requete");
  const injected = adzunaUrl({ ADZUNA_APP_ID: "x", ADZUNA_APP_KEY: "y" },
    { what: "a", where: "b", country: "../../evil" });
  if (!injected.includes("/jobs/fr/")) {
    failures.push("Adzuna : un pays non valide n'est pas ramene a la valeur par defaut");
  }
  if (!reedAuthHeader({ REED_API_KEY: "k" }).startsWith("Basic ")) {
    failures.push("Reed : en-tete d'authentification mal formee");
  }

  // --- THE CEILING THE PERSON ACTUALLY SEES --------------------------------
  //
  // The first version asked for twenty results from page one, and never the
  // next. Aggregators hold hundreds of thousands of ads behind the same
  // query, and they were unreachable: the ceiling was not the index, it was
  // twenty.
  const p2 = adzunaUrl({ ADZUNA_APP_ID: "x", ADZUNA_APP_KEY: "y" },
    { what: "a", where: "b", country: "gb", page: 3 });
  if (!p2.includes("/search/3?")) failures.push("Adzuna: the requested page is ignored");
  if (!p2.includes("results_per_page=50")) {
    failures.push("Adzuna: fewer than fifty results per page, when fifty is its maximum");
  }
  const r3 = reedUrl({ what: "a", where: "b", page: 3 });
  if (!r3.includes("resultsToSkip=100")) {
    failures.push("Reed: the requested page does not move the cursor, the same jobs come back");
  }
  if (reedUrl({ what: "a" }).includes("resultsToSkip=50")) {
    failures.push("Reed: the first page skips jobs");
  }

  // The total the source declares. Without it we write "50", which reads as
  // the end of the seam instead of the start of it.
  if (totalAtTheSource({ count: 64321 }) !== 64321) failures.push("Adzuna: the total is not read");
  if (totalAtTheSource({ totalResults: 812 }) !== 812) failures.push("Reed: the total is not read");
  if (totalAtTheSource(null) !== 0 || totalAtTheSource({}) !== 0) {
    failures.push("a response with no total must give zero, not an exception");
  }

  // --- THREE OF THE SIX ASKED OF THE SOURCE --------------------------------
  //
  // A free Adzuna tier is counted per call, per month. A call that comes back
  // with fifty results the filter then discards costs exactly as much as one
  // that comes back usable, so the three requirements Adzuna understands are
  // sent to it. The three it has no parameter for stay local: sending a guess
  // would narrow the search in a way nothing on screen could explain.
  const serre = adzunaUrl({ ADZUNA_APP_ID: "x", ADZUNA_APP_KEY: "y" },
    { what: "a", where: "b", country: "gb", page: 1,
      filters: { salaryFrom: 50000, postedWithin: 7, contract: "permanent" } });
  if (!serre.includes("salary_min=50000")) failures.push("Adzuna: the salary floor is not asked of the source");
  if (!serre.includes("max_days_old=7")) failures.push("Adzuna: the age is not asked of the source");
  if (!serre.includes("permanent=1")) failures.push("Adzuna: the contract kind is not asked of the source");

  const large = adzunaUrl({ ADZUNA_APP_ID: "x", ADZUNA_APP_KEY: "y" },
    { what: "a", where: "b", country: "gb", page: 1,
      filters: { salaryFrom: 0, postedWithin: 0, contract: "internship" } });
  for (const absent of ["salary_min", "max_days_old", "permanent=", "contract=", "part_time"]) {
    if (large.includes(absent)) {
      failures.push("Adzuna: \"" + absent + "\" is sent for a requirement nobody set, which narrows"
        + " the search with nothing on screen to explain it");
    }
  }
  // An internship has no Adzuna flag. Mapping it onto the wrong one would
  // return permanent roles for a search that asked for internships.
  if (/[?&](permanent|contract|part_time)=1/.test(large)) {
    failures.push("Adzuna: an internship is mapped onto another contract flag");
  }

  // --- WHICH NAMES THE SERVER CAN SEE, AND NEVER A VALUE -------------------
  //
  // A valid Adzuna key sat in Vercel on 6 October 2026 and the search still
  // answered "career pages" only. Three causes read identically on screen:
  // the variable absent, the name misspelt, or the value wrong. A boolean per
  // name separates them. The danger of such a report is obvious, so the test
  // that matters is the one that proves a value can never come out.
  const vu = keysTheServerCanSee({ ADZUNA_APP_ID: "abc123", ADZUNA_APP_KEY: "" });
  if (vu.ADZUNA_APP_ID !== true) failures.push("a variable that is set is not reported as seen");
  if (vu.ADZUNA_APP_KEY !== false) failures.push("an empty variable is reported as seen");
  if (vu.REED_API_KEY !== false) failures.push("a missing variable is not reported as absent");

  const secret = "SUPER-SECRET-VALUE-0123456789";
  const dehors = JSON.stringify(keysTheServerCanSee({
    ADZUNA_APP_ID: secret, ADZUNA_APP_KEY: secret, REED_API_KEY: secret,
    FRANCE_TRAVAIL_ID: secret, FRANCE_TRAVAIL_SECRET: secret,
  }));
  if (dehors.includes(secret) || dehors.includes(secret.slice(0, 6))) {
    failures.push(
      "the key report carries a value, or a piece of one.\n" +
      "      This object is returned to the browser by /api/jobs/search. It may say\n" +
      "      whether a name is set and nothing else, ever."
    );
  }
  for (const v of Object.values(keysTheServerCanSee({ ADZUNA_APP_ID: secret }))) {
    if (typeof v !== "boolean") failures.push("the key report returns something other than a boolean");
  }
  if (!AGGREGATOR_KEYS.includes("ADZUNA_APP_ID") || !AGGREGATOR_KEYS.includes("REED_API_KEY")) {
    failures.push("the reported names do not cover the aggregators the setup page names");
  }

  if (!failures.length) {
    console.log("      3 sources, the same shape out, fifty per page that turns, "
      + "and nothing breaks on an empty response");
  }
  return failures;
}
