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
  availableSources, adzunaUrl, reedAuthHeader,
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

  if (!failures.length) {
    console.log("      3 sources, meme forme en sortie, rien ne casse sur une reponse vide");
  }
  return failures;
}
