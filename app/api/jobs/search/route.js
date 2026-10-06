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
  availableSources, combienEnTout,
} from "../../../../lib/jobSources.js";
import { lireUnBoard, normaliser, lieuCorrespond, titreCorrespond } from "../../../../lib/ats.js";
import { boardsDuMarche, nomDeLEntreprise } from "../../../../lib/boards.js";

export const maxDuration = 30;

// LES TABLEAUX D'OFFRES SONT UNE SOURCE QUI NE DEMANDE AUCUNE CLE
//
// Les trois sources au-dessus sont des agregateurs : ils publient ce que les
// entreprises leur paient pour publier, et une annonce y recoit deux cents
// candidatures dans l'heure. Les ATS, eux, servent la page carriere de
// l'entreprise elle-meme, en JSON public. C'est la ou se trouvent les postes
// que personne ne voit, et c'est gratuit.
//
// POURQUOI UN INDEX ET PLUS UN CACHE
//
// La premiere version lisait les cinquante tableaux a chaque fois que le
// cache expirait, dix en vol, et tenait dans les trente secondes de la
// fonction. Elle ne tient plus a cinq cents : cinquante passes en serie
// depassent le delai et la recherche rend une liste vide, ce qui se lit
// comme "aucune offre" et non comme une panne. Et le registre doit grandir
// jusqu'a des milliers de lignes, c'est tout son interet.
//
// Donc l'inverse : chaque recherche sert l'index entier, et en profite pour
// rafraichir les tableaux les plus vieux, dans un budget de temps fixe. Le
// cout par recherche est borne quelle que soit la taille du registre, et
// l'index se remplit en quelques recherches au lieu d'une seule tres lente.
// Une recherche ne rend donc jamais moins que ce que l'instance sait deja.
const FRAICHEUR_MS = 30 * 60 * 1000;
const BUDGET_MS = 7000;
const EN_VOL = 12;

// slug -> { lu, postes }. En memoire d'instance, comme le compteur de
// middleware.js : assez pour qu'une personne qui cherche trois fois de suite
// ne paie qu'une fois, pas un index partage. Le magasin partage viendra avec
// le rafraichissement quotidien, qui demande la cle service de Supabase.
const index = new Map();

async function rafraichir(boards, warnings) {
  const t0 = Date.now();
  // Les jamais lus d'abord, puis les plus vieux : a froid l'index se
  // remplit, a chaud il tourne.
  const file = boards
    .map((b) => ({ b, lu: (index.get(b.slug) || { lu: 0 }).lu }))
    .filter((x) => Date.now() - x.lu > FRAICHEUR_MS)
    .sort((x, y) => x.lu - y.lu);

  const muets = [];
  let i = 0;
  async function ouvrier() {
    while (i < file.length && Date.now() - t0 < BUDGET_MS) {
      const { b } = file[i++];
      const r = await lireUnBoard(b.slug, b.ats);
      if (r.erreur) {
        // Un tableau muet est note comme lu : sans ca il reste en tete de
        // file et vole son tour a un tableau qui repond, a chaque recherche.
        index.set(b.slug, { lu: Date.now(), postes: [] });
        muets.push(b.slug);
        continue;
      }
      index.set(b.slug, {
        lu: Date.now(),
        postes: r.postes.map((p) => normaliser(p, nomDeLEntreprise(b.slug), "ats")),
      });
    }
  }
  await Promise.all(Array.from({ length: EN_VOL }, ouvrier));
  if (muets.length) warnings.push(muets.length + " career pages did not answer");
  return file.length - i;
}

function postesDeLIndex(boards) {
  const out = [];
  for (const b of boards) {
    const e = index.get(b.slug);
    if (e) out.push(...e.postes);
  }
  return out;
}

export async function GET(request) {
  const url = new URL(request.url);
  const what = url.searchParams.get("what") || "";
  const where = url.searchParams.get("where") || "";
  const country = url.searchParams.get("country") || "fr";
  // La page est ce qui ouvre le gisement. Sans elle, la recherche plafonne a
  // la premiere poignee de resultats quoi qu'il y ait derriere.
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const env = process.env;

  // Les pages carriere ne demandent pas de cle, donc cette source existe
  // toujours : la recherche ne rend plus jamais "non configuree".
  const sources = [...availableSources(env), "career pages"];
  const warnings = [];
  const tasks = [];
  // Le total annonce par chaque agregateur, pour que l'ecran puisse dire
  // "50 sur 64 000" au lieu de "50".
  let total = 0;

  if (franceTravailConfigured(env)) {
    tasks.push((async () => {
      try {
        const token = await franceTravailToken(env);
        const debut = (page - 1) * 50;
        const params = new URLSearchParams({ range: debut + "-" + (debut + 49) });
        if (what) params.set("motsCles", what);
        if (where) params.set("commune", where);
        const res = await fetch(
          `https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // 204 signifie "aucun resultat", ce n'est pas une erreur.
        if (res.status === 204) return [];
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        total += combienEnTout(data);
        return franceTravailParse(data);
      } catch (err) {
        warnings.push(`France Travail indisponible (${err.message})`);
        return [];
      }
    })());
  }

  if (adzunaConfigured(env)) {
    tasks.push((async () => {
      try {
        const res = await fetch(adzunaUrl(env, { what, where, country, page }));
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        total += combienEnTout(data);
        return adzunaParse(data);
      } catch (err) {
        warnings.push(`Adzuna indisponible (${err.message})`);
        return [];
      }
    })());
  }

  if (reedConfigured(env)) {
    tasks.push((async () => {
      try {
        const res = await fetch(reedUrl({ what, where, page }), {
          headers: { Authorization: reedAuthHeader(env) },
        });
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        total += combienEnTout(data);
        return reedParse(data);
      } catch (err) {
        warnings.push(`Reed indisponible (${err.message})`);
        return [];
      }
    })());
  }

  const boards = boardsDuMarche(country);
  let enAttente = 0;
  // Les pages carriere ne se paginent pas : l'index rend tout ce qu'il a
  // d'un coup. Les redemander page deux les renverrait a l'identique.
  if (page === 1) tasks.push((async () => {
    try {
      enAttente = await rafraichir(boards, warnings);
      const retenus = postesDeLIndex(boards)
        .filter((j) => lieuCorrespond(j.location, where))
        .filter((j) => titreCorrespond(j, what));
      total += retenus.length;
      return retenus;
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

  // L'ETAT DE L'INDEX EST DIT, PAS DEVINE
  //
  // Une liste courte peut vouloir dire "peu d'offres correspondent" ou
  // "l'index n'a pas encore lu la moitie du registre". Les deux se lisent
  // pareil a l'ecran, et c'est exactement la panne silencieuse que ce depot
  // connait le mieux. La reponse porte donc le compte.
  const index_etat = {
    tableaux: boards.length,
    lus: boards.filter((b) => index.has(b.slug)).length,
    en_attente: enAttente,
  };
  // Pas d'avertissement pour l'attente : l'ecran la dit sous le compte, dans
  // la langue de la personne, et le cadre d'avertissement est corail. Un
  // index qui se remplit n'est pas une panne.

  return Response.json({
    jobs: unique, sources, warnings, index: index_etat, configured: true,
    page, total, plus: unique.length > 0 && total > page * 50,
  });
}
