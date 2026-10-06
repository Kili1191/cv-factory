// TROUVER LES TABLEAUX D'OFFRES EN NOMBRE
//
//   node scripts/trouver-des-tableaux.mjs                       # Londres
//   node scripts/trouver-des-tableaux.mjs --ville Q90 --limite 800
//   node scripts/trouver-des-tableaux.mjs --fichier noms.txt
//   node scripts/trouver-des-tableaux.mjs --agregateur --marche gb
//   node scripts/trouver-des-tableaux.mjs --hn --marche gb
//   node scripts/trouver-des-tableaux.mjs --ecrire
//
// `decouvrir-des-boards.mjs` essaie des noms qu'on lui donne, un par ligne.
// Celui-ci fabrique la liste de noms lui-meme, et c'est toute la difference :
// le registre ne grandit plus a la vitesse ou quelqu'un tape des noms.
//
// OU LES NOMS SONT PRIS
//
// Wikidata, qui rend les entreprises par siege social avec leur site
// officiel, sans cle et en une seconde : 1201 pour Londres, 1500 pour le
// Royaume-Uni entier. C'est la seule source gratuite qui donne a la fois le
// nom qu'un candidat reconnait et le domaine, et le domaine est ce qui
// permet la seconde methode.
//
// DEUX METHODES, PARCE QU'AUCUNE SEULE NE SUFFIT
//
// 1. Deviner l'identifiant depuis le nom et le domaine, et l'essayer contre
//    les six ATS. Rapide, du JSON, aucun HTML. Environ 40 % de reussite.
// 2. Lire la page carriere de l'entreprise et y chercher le lien vers son
//    ATS. Mesure le 6 octobre 2026 sur douze entreprises londoniennes :
//    3 sur 12, parce que beaucoup de pages carriere chargent leur tableau en
//    JavaScript et qu'un fetch n'y voit rien.
//
// Elles ne trouvent pas les memes. La premiere rate `octopus.energy`, dont
// l'identifiant Lever est `octoenergy`, et `thoughtmachine.net`, qui est
// `thought-machine` chez Ashby. La seconde rate Monzo, dont la page carriere
// est une application JavaScript alors que son tableau Greenhouse s'appelle
// bien `monzo`. On fait donc les deux, dans cet ordre, et la seconde ne
// tourne que sur ce que la premiere n'a pas trouve : c'est celle qui coute
// un chargement de page.
//
// RIEN N'EST DEVINE DANS CE QUI EST ECRIT. Une ligne ajoutee est une ligne
// dont l'ATS a repondu avec au moins un poste.

import { readFileSync, writeFileSync } from "node:fs";
import { ATS, NOMS_ATS, dansLeMarche } from "../lib/ats.js";
import {
  adzunaConfigured, adzunaUrl, adzunaParse,
  reedConfigured, reedUrl, reedAuthHeader, reedParse,
} from "../lib/jobSources.js";
import { BOARDS } from "../lib/boards.js";

const args = process.argv.slice(2);
const option = (nom, defaut) => {
  const i = args.indexOf("--" + nom);
  return i >= 0 && args[i + 1] ? args[i + 1] : defaut;
};
const ecrire = args.includes("--ecrire");
const ville = option("ville", "Q84");           // Q84 = Londres
// `--pays Q145` prend les entreprises d'un pays entier au lieu d'une ville.
// Londres d'abord parce que c'est le marche de la personne qui ecrit ce
// code, mais un registre qui s'arrete a une ville s'arrete trop tot.
const pays = option("pays", "");
const marche = option("marche", "gb");
const limite = Number(option("limite", "1200"));
const fichier = option("fichier", "");
const agregateur = args.includes("--agregateur");
const hn = args.includes("--hn");
const AGENT = "Mozilla/5.0 (compatible; Nuvi/1.0; +https://thenuvi.com)";

// ----------------------------------------------------------------- les noms

async function depuisWikidata() {
  // wdt:P159 pointe le siege social. On ne prend pas le chemin transitif
  // wdt:P131* : "dans le Grand Londres" met la requete a 24 secondes pour
  // 50 lignes, le predicat direct rend 1200 lignes en une seconde.
  // Par pays, il faut une contrainte de plus : `wdt:P17` seul rend aussi
  // les clubs, les ecoles et les paroisses. `wdt:P452` (secteur d'activite)
  // garde ce qui est une entreprise sans couter de temps a la requete.
  const ou = pays
    ? `?c wdt:P17 wd:${pays} ; wdt:P452 ?secteur .`
    : `?c wdt:P159 wd:${ville} .`;
  const q = `SELECT DISTINCT ?label ?site WHERE {
    ${ou}
    ?c rdfs:label ?label ; wdt:P856 ?site .
    FILTER(LANG(?label) = "en")
  } LIMIT ${limite}`;
  const url = "https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(q);
  const r = await fetch(url, { headers: { "User-Agent": AGENT, Accept: "application/sparql-results+json" } });
  if (!r.ok) throw new Error("Wikidata HTTP " + r.status);
  const d = await r.json();
  return (d.results.bindings || []).map((b) => ({
    nom: b.label.value,
    site: (b.site && b.site.value) || "",
  }));
}

// LA MEILLEURE LISTE EST CELLE OU LES GENS ONT DEJA COLLE LEURS LIENS
//
// "Ask HN: Who is hiring?" tourne chaque mois depuis 2011. Mesure le
// 6 octobre 2026 : 186 fils, 119 808 commentaires, et chaque commentaire
// est une entreprise qui recrute avec, le plus souvent, le lien direct vers
// son tableau. L'API Algolia de Hacker News les rend par fil, gratuitement
// et sans cle.
//
// Rendement : **2633 couples identifiant/ATS uniques**, contre 23 tableaux
// pour 1199 noms chez Wikidata. Et la difference n'est pas que le volume :
// ici l'ATS est DEJA connu, parce qu'il est dans l'adresse. Il n'y a plus
// rien a deviner, donc une requete par couple au lieu de dix-huit, et plus
// aucun homonyme venu d'une devinette.
//
// Beaucoup de ces liens ont dix ans et sont morts. C'est sans importance :
// la verification est la meme pour tous, un poste ouvert dans le marche et
// un tableau qui dit de qui il est, et un tableau mort echoue a la premiere.
async function depuisHackerNews() {
  const MOTIFS = [
    [/boards\.greenhouse\.io\/(?:embed\/job_board\?for=)?([A-Za-z0-9_-]{2,40})/g, "greenhouse"],
    [/job-boards\.greenhouse\.io\/([A-Za-z0-9_-]{2,40})/g, "greenhouse"],
    [/jobs\.lever\.co\/([A-Za-z0-9_-]{2,40})/g, "lever"],
    [/jobs\.ashbyhq\.com\/([A-Za-z0-9_.-]{2,40})/g, "ashby"],
    [/([A-Za-z0-9-]{2,40})\.recruitee\.com/g, "recruitee"],
    [/([A-Za-z0-9-]{2,40})\.teamtailor\.com/g, "teamtailor"],
    [/([A-Za-z0-9-]{2,40})\.jobs\.personio\.(?:com|de)/g, "personio"],
  ];
  // Les morceaux d'adresse qui ne sont pas des identifiants.
  const BRUIT = new Set(["embed", "jobs", "job", "job_board", "www", "api", "careers", "search", "en", "us", "app"]);

  async function algolia(url) {
    const r = await fetch(url, { headers: { Accept: "application/json", "User-Agent": AGENT },
      signal: AbortSignal.timeout(60_000) });
    if (!r.ok) throw new Error("Algolia HTTP " + r.status);
    return r.json();
  }

  const fils = [];
  for (let page = 0; page < 6; page += 1) {
    const d = await algolia("https://hn.algolia.com/api/v1/search?tags=story,author_whoishiring"
      + "&query=" + encodeURIComponent("Ask HN: Who is hiring?") + "&hitsPerPage=100&page=" + page);
    const h = d.hits || [];
    if (!h.length) break;
    for (const x of h) fils.push(x.objectID);
    if (page + 1 >= (d.nbPages || 1)) break;
  }
  console.log(fils.length + " fils \"Who is hiring\" a lire");

  const vus = new Map();
  let f = 0;
  async function lecteur() {
    while (f < fils.length) {
      const id = fils[f++];
      for (let page = 0; page < 3; page += 1) {
        let d;
        try {
          d = await algolia("https://hn.algolia.com/api/v1/search?tags=comment,story_"
            + id + "&hitsPerPage=1000&page=" + page);
        } catch { break; }
        const h = d.hits || [];
        if (!h.length) break;
        const blob = JSON.stringify(h);
        for (const [re, ats] of MOTIFS) {
          re.lastIndex = 0;
          let m;
          while ((m = re.exec(blob)) !== null) {
            const slug = m[1].toLowerCase();
            if (BRUIT.has(slug) || /^\d+$/.test(slug)) continue;
            vus.set(slug + " " + ats, { nom: "", site: "", slug, ats });
          }
        }
        if (page + 1 >= (d.nbPages || 1)) break;
      }
    }
  }
  await Promise.all(Array.from({ length: 12 }, lecteur));
  console.log(vus.size + " couples identifiant/ATS releves");
  return [...vus.values()];
}

// LA SOURCE QUI SE NOURRIT DE L'USAGE
//
// Mesure le 6 octobre 2026 : Wikidata par ville rend 1201 noms pour Londres
// mais 5 % repondent, parce que la liste est faite d'ambassades, de clubs de
// football et de colleges, pas d'entreprises qui achetent un ATS moderne.
// Filtree par secteur, elle rend de vraies entreprises de technologie, mais
// seulement trois cents pour le Royaume-Uni entier : Wikidata plafonne.
//
// Les listes qui iraient au volume ne sont pas atteignables d'ici, mesure
// le meme jour : l'index Common Crawl rend 504 en dix secondes, les moteurs
// de recherche repondent 202 ou coupent la connexion, et les sitemaps de
// Greenhouse, Lever et Ashby sont 301, 404 ou du HTML vide.
//
// Ce qui reste, et qui est meilleur que tout ca : les agregateurs nomment
// l'employeur sur chaque annonce. Ce sont exactement les entreprises qui
// embauchent, dans le marche de la personne, aujourd'hui. Le registre
// grandit donc avec l'usage du produit au lieu d'une liste recopiee, et
// c'est la meme cle gratuite qui ouvre les deux.
async function depuisLesAgregateurs() {
  const env = process.env;
  const noms = new Set();
  if (adzunaConfigured(env)) {
    for (let p = 1; p <= 10; p += 1) {
      const r = await fetch(adzunaUrl(env, { what: "", where: "", country: marche, page: p }));
      if (!r.ok) break;
      for (const j of adzunaParse(await r.json())) if (j.company) noms.add(j.company);
    }
  }
  if (reedConfigured(env)) {
    for (let p = 1; p <= 10; p += 1) {
      const r = await fetch(reedUrl({ what: "", where: "", page: p }),
        { headers: { Authorization: reedAuthHeader(env) } });
      if (!r.ok) break;
      for (const j of reedParse(await r.json())) if (j.company) noms.add(j.company);
    }
  }
  if (!noms.size) {
    console.error("--agregateur sans cle : posez ADZUNA_APP_ID / ADZUNA_APP_KEY ou REED_API_KEY.");
    process.exit(2);
  }
  return [...noms].map((n) => ({ nom: n, site: "" }));
}

function depuisUnFichier(chemin) {
  return readFileSync(chemin, "utf8").split("\n")
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => ({ nom: l, site: l.includes(".") ? "https://" + l.replace(/^https?:\/\//, "") : "" }));
}

// -------------------------------------------------- les identifiants a tenter

// "Thought Machine Group Ltd" donne thoughtmachine, thought-machine. Les
// formes juridiques sont retirees avant : aucun ATS ne les porte, et les
// garder double le nombre de requetes pour rien.
const FORMES = /\b(ltd|limited|plc|llp|llc|inc|incorporated|holdings?|group|company|corp|corporation|sa|sas|gmbh|bv|nv|ag)\b/g;

function identifiants({ nom, site }) {
  const out = [];
  const ajouter = (s) => {
    const v = String(s || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (v.length >= 2 && v.length <= 40 && !out.includes(v)) out.push(v);
  };
  if (site) {
    try {
      // octopus.energy donne octopus ; www.thoughtmachine.net donne
      // thoughtmachine. Le premier label du domaine est l'identifiant le
      // plus souvent juste, parce que c'est le nom que l'entreprise a achete.
      const h = new URL(site).hostname.replace(/^www\./, "");
      ajouter(h.split(".")[0]);
    } catch { /* un site mal forme dans Wikidata ne doit pas arreter la course */ }
  }
  const propre = nom.toLowerCase().replace(/\(.*?\)/g, " ").replace(FORMES, " ").trim();
  ajouter(propre.replace(/[^a-z0-9]/g, ""));
  ajouter(propre.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  return out.slice(0, 3);
}

async function postesDe(slug, ats) {
  try {
    const r = await fetch(ATS[ats].url(slug), {
      headers: { Accept: "application/json", "User-Agent": AGENT },
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) return [];
    return ATS[ats].lire(await r.json());
  } catch { return []; }
}

// Un tableau qui a repondu n'est pas encore un tableau a nous : il faut
// qu'au moins un poste ouvert soit dans le marche cherche. C'est ce qui
// distingue la BBC de `bbc.recruitee.com`, qui est belge. Voir lib/ats.js.
let horsMarche = 0;
function retenu(postes) {
  if (!postes.length) return false;
  if (postes.some((p) => dansLeMarche(p.lieu, marche))) return true;
  horsMarche += 1;
  return false;
}

// Un couple identifiant/ATS releve dans une adresse : il n'y a rien a
// deviner, une seule requete suffit, et le filtre du marche reste le meme.
async function tableauConnu({ slug, ats }) {
  const postes = await postesDe(slug, ats);
  return retenu(postes) ? { slug, ats, postes: postes.length, par: "lien", lus: postes } : null;
}

async function parLeNom(entreprise) {
  for (const slug of identifiants(entreprise)) {
    for (const ats of NOMS_ATS) {
      const postes = await postesDe(slug, ats);
      if (retenu(postes)) return { slug, ats, postes: postes.length, par: "nom", lus: postes };
    }
  }
  return null;
}

// QUI EST CE TABLEAU : LE TABLEAU LE DIT LUI-MEME
//
// Wikidata rend l'article, pas l'employeur : "BBC Radio 2" pour la BBC,
// "Eon Productions" pour E.ON, "Photobox" pour ce qui s'appelle aujourd'hui
// Storio group. Un intitule faux sur une carte d'offre est pire qu'une
// carte absente : la personne clique et decouvre un autre employeur, sur un
// produit dont toute la promesse est la credibilite.
//
// Les six ATS declarent tous l'employeur, mesure le 6 octobre 2026 :
// Greenhouse sur /v1/boards/<slug>, Recruitee sur chaque offre, et les
// quatre autres dans le titre de la page du tableau ("ClearBank Jobs",
// "Storio group", "Jobs at ECFR").
//
// C'EST AUSSI LA PREUVE D'APPARTENANCE, ET C'EST LA SON VRAI ROLE
//
// `lloydsbank.jobs.personio.com` et `arsenalfc.jobs.personio.com` rendent
// tous deux "Jobs at " avec un nom vide, et le premier publie un poste de
// SEO et un stage de reseaux sociaux : ce n'est pas la banque Lloyds. Un
// identifiant d'ATS est mondial, court, et il se partage. Donc la regle :
// un tableau qui ne sait pas dire de qui il est n'entre pas au registre.
const TITRES = {
  ashby: [(slug) => "https://jobs.ashbyhq.com/" + slug, /<title>\s*([^<]*?)\s*(?:Jobs|Careers)?\s*<\/title>/i],
  lever: [(slug) => "https://jobs.lever.co/" + slug, /<title>\s*([^<]*?)\s*<\/title>/i],
  personio: [(slug) => "https://" + slug + ".jobs.personio.com/", /<title>\s*(?:Jobs at\s*)?([^<]*?)\s*<\/title>/i],
  teamtailor: [(slug) => "https://" + slug + ".teamtailor.com/jobs", /<title>\s*([^<|]*?)\s*(?:\||<\/title>)/i],
};

async function nomDuTableau(slug, ats, postes) {
  if (ats === "greenhouse") {
    try {
      const r = await fetch("https://boards-api.greenhouse.io/v1/boards/" + slug, {
        headers: { Accept: "application/json", "User-Agent": AGENT },
        signal: AbortSignal.timeout(12_000),
      });
      if (r.ok) {
        const d = await r.json();
        if (d && typeof d.name === "string") return d.name.trim();
      }
    } catch { /* un tableau muet sera refuse par l'appelant */ }
    return "";
  }
  if (ats === "recruitee") {
    const p = (postes || []).find((x) => x.entreprise);
    return p ? String(p.entreprise).trim() : "";
  }
  const def = TITRES[ats];
  if (!def) return "";
  const html = await page(def[0](slug));
  const m = html && html.match(def[1]);
  const nom = m ? m[1].trim() : "";
  // "Jobs", "Careers", "Job Board" : le gabarit de l'ATS sans employeur.
  if (!nom || /^(jobs?|careers?|job board|openings?)$/i.test(nom)) return "";
  return nom;
}

// ------------------------------------------------- la page carriere, sinon

const MOTIFS = [
  [/boards\.greenhouse\.io\/(?:embed\/job_board\?for=)?([a-z0-9_-]{2,40})/i, "greenhouse"],
  [/job-boards\.greenhouse\.io\/([a-z0-9_-]{2,40})/i, "greenhouse"],
  [/jobs\.lever\.co\/([a-z0-9_-]{2,40})/i, "lever"],
  [/jobs\.ashbyhq\.com\/([a-z0-9_.-]{2,40})/i, "ashby"],
  [/([a-z0-9-]{2,40})\.recruitee\.com/i, "recruitee"],
  [/([a-z0-9-]{2,40})\.teamtailor\.com/i, "teamtailor"],
  [/([a-z0-9-]{2,40})\.jobs\.personio\.(?:com|de)/i, "personio"],
];

async function page(url) {
  try {
    const r = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": AGENT },
      signal: AbortSignal.timeout(12_000),
    });
    if (!r.ok) return "";
    if (!/html|text/.test(r.headers.get("content-type") || "")) return "";
    // Une page carriere depasse rarement 400 ko d'HTML, et une qui les
    // depasse est un bundle JavaScript ou le lien ne sera pas non plus.
    return (await r.text()).slice(0, 400_000);
  } catch { return ""; }
}

function lienDAts(html) {
  for (const [re, ats] of MOTIFS) {
    const m = html.match(re);
    if (m) return { slug: m[1].toLowerCase(), ats };
  }
  return null;
}

function liensCarriere(html, base) {
  const out = new Set();
  for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    if (!/care|job|vacanc|recruit|emploi|join-us|werken/i.test(m[1])) continue;
    try { out.add(new URL(m[1], base).href); } catch { /* href relatif casse */ }
    if (out.size >= 5) break;
  }
  return [...out];
}

async function parLaPageCarriere({ site }) {
  if (!site) return null;
  const html = await page(site);
  if (!html) return null;
  let trouve = lienDAts(html);
  if (!trouve) {
    for (const lien of liensCarriere(html, site)) {
      trouve = lienDAts(await page(lien));
      if (trouve) break;
    }
  }
  if (!trouve) return null;
  // Le lien peut etre mort ou pointer un tableau vide : on verifie contre
  // l'API avant d'ecrire, comme pour un nom devine. Le marche est exige ici
  // aussi, alors que la page carriere prouve deja l'appartenance : un
  // tableau sans un poste dans le marche ne rendrait rien a la recherche.
  const postes = await postesDe(trouve.slug, trouve.ats);
  return retenu(postes) ? { ...trouve, postes: postes.length, par: "page", lus: postes } : null;
}

// ------------------------------------------------------------------- la course

const entreprises = hn
  ? await depuisHackerNews()
  : agregateur ? await depuisLesAgregateurs()
  : fichier ? depuisUnFichier(fichier) : await depuisWikidata();
const connus = new Set(BOARDS.map((b) => b.slug));
const aEssayer = entreprises.filter((e) => (e.slug
  ? !connus.has(e.slug)
  : !identifiants(e).some((s) => connus.has(s))));
console.log(entreprises.length + " entreprises, " + aEssayer.length + " a essayer");

// Seize en vol : au-dela, Greenhouse repond 429 et on perd des entreprises
// qui existent. Chaque entreprise fait jusqu'a dix-huit requetes JSON, donc
// seize en vol tiennent deja une centaine de requetes par seconde.
const EN_VOL = 16;
const trouves = [];
let i = 0, faits = 0, sansNom = 0;

async function ouvrier() {
  while (i < aEssayer.length) {
    const e = aEssayer[i++];
    // Un candidat venu d'un lien porte deja son ATS : une requete suffit.
    // Un candidat venu d'une liste de noms n'a rien, et il faut deviner.
    const hit = e.slug && e.ats
      ? await tableauConnu(e)
      : (await parLeNom(e)) || (await parLaPageCarriere(e));
    faits += 1;
    if (hit && !connus.has(hit.slug)) {
      connus.add(hit.slug);
      // Le nom vient du tableau, jamais de la liste de depart : sans nom
      // declare, on ne sait pas de qui est ce tableau et il n'entre pas.
      const nom = await nomDuTableau(hit.slug, hit.ats, hit.lus);
      if (!nom) { sansNom += 1; connus.delete(hit.slug); continue; }
      trouves.push({ ...hit, nom });
      console.log("  + " + hit.slug.padEnd(26) + hit.ats.padEnd(12)
        + String(hit.postes).padStart(4) + " postes  " + hit.par + "  (" + e.nom + ")");
    }
    if (faits % 100 === 0) console.log("    " + faits + "/" + aEssayer.length + ", " + trouves.length + " trouves");
  }
}
await Promise.all(Array.from({ length: EN_VOL }, ouvrier));

const postes = trouves.reduce((s, t) => s + t.postes, 0);
const parChemin = { nom: 0, page: 0, lien: 0 };
for (const t of trouves) parChemin[t.par] = (parChemin[t.par] || 0) + 1;
console.log("\n" + trouves.length + " tableaux sur " + aEssayer.length + " essayees ("
  + Math.round((trouves.length / Math.max(1, aEssayer.length)) * 100) + " %), " + postes + " postes");
console.log(parChemin.lien + " par un lien releve, " + parChemin.nom + " par le nom devine, "
  + parChemin.page + " par la page carriere");
console.log(horsMarche + " tableaux ecartes : ils ont repondu, sans un poste dans " + marche);
console.log(sansNom + " tableaux ecartes : ils ne disent pas de qui ils sont");

if (!ecrire) {
  console.log("\nRien n'a ete ecrit. Relancer avec --ecrire.");
  process.exit(0);
}

const chemin = new URL("../lib/boards.js", import.meta.url).pathname;
const source = readFileSync(chemin, "utf8");
const marque = "];\n\nexport function boardsParAts";
if (!source.includes(marque)) {
  console.error("lib/boards.js n'a plus la forme attendue : rien n'est ecrit.");
  process.exit(1);
}
trouves.sort((a, b) => b.postes - a.postes);
const lignes = trouves.map((t) => '  { slug: "' + t.slug + '", ats: "' + t.ats
  + '", nom: ' + JSON.stringify(t.nom) + ', marche: "' + marche + '" },').join("\n");
writeFileSync(chemin, source.replace(marque, lignes + "\n" + marque));
console.log(trouves.length + " lignes ajoutees a lib/boards.js.");
