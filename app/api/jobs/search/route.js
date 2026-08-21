// Recherche d'offres, cote serveur.
//
// Les cles des sources sont des secrets : elles ne doivent jamais atteindre le
// navigateur. Cette route interroge les sources configurees en parallele et
// rend une liste unique, de forme identique quelle que soit l'origine.
//
// Une source non configuree est simplement absente. Une source en panne est
// signalee sans empecher les autres de repondre : mieux vaut vingt offres et
// un avertissement que rien du tout.

import {
  franceTravailConfigured, franceTravailToken, franceTravailParse,
  adzunaConfigured, adzunaUrl, adzunaParse,
  reedConfigured, reedUrl, reedAuthHeader, reedParse,
  availableSources,
} from "../../../../lib/jobSources.js";

export const maxDuration = 30;

export async function GET(request) {
  const url = new URL(request.url);
  const what = url.searchParams.get("what") || "";
  const where = url.searchParams.get("where") || "";
  const country = url.searchParams.get("country") || "fr";
  const env = process.env;

  const sources = availableSources(env);
  if (sources.length === 0) {
    return Response.json({
      jobs: [], sources: [], warnings: [],
      configured: false,
    });
  }

  const warnings = [];
  const tasks = [];

  if (franceTravailConfigured(env)) {
    tasks.push((async () => {
      try {
        const token = await franceTravailToken(env);
        const params = new URLSearchParams({ range: "0-19" });
        if (what) params.set("motsCles", what);
        if (where) params.set("commune", where);
        const res = await fetch(
          `https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // 204 signifie "aucun resultat", ce n'est pas une erreur.
        if (res.status === 204) return [];
        if (!res.ok) throw new Error(`${res.status}`);
        return franceTravailParse(await res.json());
      } catch (err) {
        warnings.push(`France Travail indisponible (${err.message})`);
        return [];
      }
    })());
  }

  if (adzunaConfigured(env)) {
    tasks.push((async () => {
      try {
        const res = await fetch(adzunaUrl(env, { what, where, country }));
        if (!res.ok) throw new Error(`${res.status}`);
        return adzunaParse(await res.json());
      } catch (err) {
        warnings.push(`Adzuna indisponible (${err.message})`);
        return [];
      }
    })());
  }

  if (reedConfigured(env)) {
    tasks.push((async () => {
      try {
        const res = await fetch(reedUrl({ what, where }), {
          headers: { Authorization: reedAuthHeader(env) },
        });
        if (!res.ok) throw new Error(`${res.status}`);
        return reedParse(await res.json());
      } catch (err) {
        warnings.push(`Reed indisponible (${err.message})`);
        return [];
      }
    })());
  }

  const groups = await Promise.all(tasks);
  const jobs = groups.flat().filter(j => j.title);

  // Deux sources publient souvent la meme offre. On rapproche sur le couple
  // intitule + entreprise, en minuscules, pour ne pas la proposer deux fois.
  const seen = new Set();
  const unique = [];
  for (const job of jobs) {
    const key = `${job.title.toLowerCase()}|${job.company.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(job);
  }

  return Response.json({ jobs: unique, sources, warnings, configured: true });
}
