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
import { lireUnBoard, normaliser, lieuCorrespond, titreCorrespond } from "../../../../lib/ats.js";
import { BOARDS, nomDeLEntreprise } from "../../../../lib/boards.js";

export const maxDuration = 30;

// LES TABLEAUX D'OFFRES SONT UNE SOURCE QUI NE DEMANDE AUCUNE CLE
//
// Les trois sources au-dessus sont des agregateurs : ils publient ce que les
// entreprises leur paient pour publier, et une annonce y recoit deux cents
// candidatures dans l'heure. Les ATS, eux, servent la page carriere de
// l'entreprise elle-meme, en JSON public. C'est la ou se trouvent les postes
// que personne ne voit, et c'est gratuit.
//
// Un cache par instance, parce que lire cinquante tableaux prend quelques
// secondes et que deux recherches d'affilee ne doivent pas les relire.
// Quinze minutes : un poste publie ce matin reste trouvable ce matin.
const CACHE_MS = 15 * 60 * 1000;
let cache = { a: 0, postes: [] };

// Dix a la fois : les ATS repondent vite, mais la fonction meurt a trente
// secondes et cinquante requetes en serie n'y tiendraient pas.
const EN_VOL = 10;

async function lireLesBoards(warnings) {
  if (cache.postes.length && Date.now() - cache.a < CACHE_MS) return cache.postes;
  const postes = [];
  const muets = [];
  let i = 0;
  async function ouvrier() {
    while (i < BOARDS.length) {
      const b = BOARDS[i++];
      const r = await lireUnBoard(b.slug, b.ats);
      if (r.erreur) { muets.push(b.slug); continue; }
      for (const p of r.postes) postes.push(normaliser(p, nomDeLEntreprise(b.slug), "ats"));
    }
  }
  await Promise.all(Array.from({ length: EN_VOL }, ouvrier));
  // Un tableau qui ne repond plus n'est pas une panne de la recherche : on
  // le dit sans rien casser, parce qu'une entreprise change d'ATS et que la
  // liste doit alors etre corrigee.
  if (muets.length) warnings.push(muets.length + " career pages did not answer");
  cache = { a: Date.now(), postes };
  return postes;
}

export async function GET(request) {
  const url = new URL(request.url);
  const what = url.searchParams.get("what") || "";
  const where = url.searchParams.get("where") || "";
  const country = url.searchParams.get("country") || "fr";
  const env = process.env;

  // Les pages carriere ne demandent pas de cle, donc cette source existe
  // toujours : la recherche ne rend plus jamais "non configuree".
  const sources = [...availableSources(env), "career pages"];
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

  tasks.push((async () => {
    try {
      const tous = await lireLesBoards(warnings);
      return tous
        .filter((j) => lieuCorrespond(j.location, where))
        .filter((j) => titreCorrespond(j, what));
    } catch (err) {
      warnings.push("career pages unavailable (" + (err && err.message) + ")");
      return [];
    }
  })());

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
