// LE BOUTON "EN VOIR PLUS" DOIT RENDRE PLUS
//
// Mesure sur la production le 6 octobre 2026, sans aucune cle d'agregateur :
// une recherche a Londres rendait 800 offres de pages carriere dans une
// seule reponse, annoncait 831 au total, et affichait le bouton. La page
// deux ne rendait rien : les pages carriere etaient servies en entier a la
// premiere page et volontairement absentes des suivantes. Un bouton qui ne
// fait rien est pire qu'un bouton absent, et rien a l'ecran ne le disait.
//
// Deux affirmations, et elles tiennent sans reseau ni navigateur : la route
// est appelee directement, avec `fetch` double. C'est le seul moyen de
// tester la pagination, parce que le defaut n'apparait qu'a la page deux.
//
//   1. Une page rend au plus cinquante offres, et la page suivante en rend
//      d'autres sans relire un seul tableau.
//   2. Le bouton disparait quand il n'y a plus rien derriere.

import { GET } from "../app/api/jobs/search/route.js";
import { BOARDS } from "../lib/boards.js";

const PAR_TABLEAU = 20;

function reponseGreenhouse() {
  const jobs = Array.from({ length: PAR_TABLEAU }, (_, i) => ({
    title: "Account Manager " + i,
    location: { name: "London, UK" },
    absolute_url: "https://example.invalid/jobs/" + i,
    updated_at: "2026-10-01",
    content: "Own a portfolio of SME accounts.",
  }));
  return new Response(JSON.stringify({ jobs }), { headers: { "content-type": "application/json" } });
}

async function chercher(page, compteur) {
  const r = await GET(new Request(
    "https://nuvi.invalid/api/jobs/search?what=&where=London&country=gb&page=" + page));
  compteur.pages += 1;
  return r.json();
}

export async function run() {
  const failures = [];
  const vrai = globalThis.fetch;
  let appels = 0;
  globalThis.fetch = async () => { appels += 1; return reponseGreenhouse(); };
  const compteur = { pages: 0 };

  try {
    const p1 = await chercher(1, compteur);
    const apresLaPremiere = appels;

    if (p1.jobs.length > 50) {
      failures.push(
        "la premiere page rend " + p1.jobs.length + " offres.\n" +
        "      En production, 800 cartes dans une reponse : le telephone les rend toutes."
      );
    }
    if (!p1.jobs.length) {
      failures.push("la premiere page ne rend rien alors que chaque tableau repond");
    }

    const p2 = await chercher(2, compteur);
    if (p1.plus && !p2.jobs.length) {
      failures.push(
        "le bouton \"en voir plus\" est propose et la page deux ne rend rien.\n" +
        "      C'est le defaut mesure en production : un bouton qui ne fait rien,\n" +
        "      sans un mot a l'ecran pour le dire."
      );
    }
    const vus = new Set(p1.jobs.map((j) => j.source + j.id));
    if (p2.jobs.length && p2.jobs.every((j) => vus.has(j.source + j.id))) {
      failures.push("la page deux rend les memes offres que la premiere");
    }
    // Les pages suivantes ne relisent aucun tableau : l'index est deja la.
    if (appels > apresLaPremiere) {
      failures.push(
        "la page deux a relu " + (appels - apresLaPremiere) + " tableaux.\n" +
        "      Tourner une page doit etre instantane : l'index est en memoire."
      );
    }

    // Au bout du gisement, le bouton doit disparaitre. Avec le registre
    // actuel et vingt offres par tableau, la page cent est au-dela.
    const loin = await chercher(100, compteur);
    if (loin.plus) {
      failures.push("le bouton est encore propose page cent, alors qu'il n'y a plus rien");
    }
    if (loin.jobs.length) {
      failures.push("la page cent rend des offres : la tranche ne tient pas compte de la page");
    }

    if (typeof p1.total !== "number" || p1.total < p1.jobs.length) {
      failures.push("le total annonce (" + p1.total + ") est plus petit que ce qui est rendu");
    }
    if (!p1.index || p1.index.tableaux !== BOARDS.filter((b) => !b.marche || b.marche === "gb").length) {
      failures.push("la reponse ne dit pas combien de tableaux la recherche couvre");
    }
  } finally {
    globalThis.fetch = vrai;
  }

  if (!failures.length) {
    console.log("      cinquante par page, la suivante sans relire un tableau, "
      + "et pas de bouton quand il n'y a plus rien");
  }
  return failures;
}
