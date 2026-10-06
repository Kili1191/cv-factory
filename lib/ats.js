// LES OFFRES QUI NE SONT SUR AUCUN SITE D'EMPLOI
//
// Career Hound vend une seule chose : les postes publies sur le site des
// entreprises et nulle part ailleurs. Son argument tient en une ligne, et il
// est juste : une annonce sur un agregateur a deux cents candidats dans
// l'heure, l'employeur paie une commission, et il prefere les candidatures
// directes.
//
// CE QUE CA VEUT DIRE TECHNIQUEMENT
//
// Presque aucune entreprise n'ecrit sa page carriere : elle achete un ATS,
// et les six grands servent leurs offres en JSON public, sans cle. Mesure le
// 6 octobre 2026 : Greenhouse, Lever et Ashby repondent 200 a une requete
// anonyme ; cent dix-huit noms d'entreprise devines a la main ont donne
// quarante-neuf tableaux vivants et pres de quatre mille postes.
//
// ET POURQUOI C'EST EXACTEMENT NOTRE TERRAIN
//
// Indeed et LinkedIn repondent 401 a un serveur, quel que soit l'agent
// declare : c'est ce qui a fait echouer le lien colle par Kilian. Les ATS,
// eux, donnent tout. Les offres que Nuvi ne pourra jamais lire sont
// precisement celles que personne ne devrait viser, et celles qu'il lit sans
// effort sont celles ou la candidature compte.
//
// LA PARTIE DIFFICILE N'EST PAS LA LECTURE, C'EST LA LISTE
//
// Il faut l'identifiant de chaque entreprise chez son ATS. C'est la seule
// chose qui s'achete avec du temps, et c'est donc la seule qui protege.
// `scripts/decouvrir-des-boards.mjs` la fabrique : il essaie un nom contre
// les six ATS et garde ce qui repond.

export const ATS = {
  greenhouse: {
    url: (slug) => "https://boards-api.greenhouse.io/v1/boards/" + slug + "/jobs?content=true",
    lire: (d) => (d && Array.isArray(d.jobs) ? d.jobs : []).map((j) => ({
      titre: j.title || "",
      lieu: (j.location && j.location.name) || "",
      url: j.absolute_url || "",
      publie: j.updated_at || j.first_published || "",
      texte: j.content || "",
    })),
  },
  lever: {
    url: (slug) => "https://api.lever.co/v0/postings/" + slug + "?mode=json",
    lire: (d) => (Array.isArray(d) ? d : []).map((j) => ({
      titre: j.text || "",
      lieu: (j.categories && j.categories.location) || "",
      url: j.hostedUrl || j.applyUrl || "",
      publie: j.createdAt ? new Date(j.createdAt).toISOString() : "",
      texte: j.descriptionPlain || j.description || "",
    })),
  },
  ashby: {
    url: (slug) => "https://api.ashbyhq.com/posting-api/job-board/" + slug + "?includeCompensation=true",
    lire: (d) => (d && Array.isArray(d.jobs) ? d.jobs : []).map((j) => ({
      titre: j.title || "",
      lieu: j.location || "",
      url: j.jobUrl || j.applyUrl || "",
      publie: j.publishedAt || "",
      texte: j.descriptionPlain || "",
    })),
  },
  recruitee: {
    url: (slug) => "https://" + slug + ".recruitee.com/api/offers/",
    lire: (d) => (d && Array.isArray(d.offers) ? d.offers : []).map((j) => ({
      titre: j.title || "",
      lieu: [j.city, j.country].filter(Boolean).join(", "),
      url: j.careers_url || j.url || "",
      publie: j.published_at || "",
      texte: j.description || "",
      // Recruitee est le seul ATS qui nomme l'employeur sur chaque offre.
      // Le script de decouverte s'en sert pour savoir de qui est le tableau,
      // et la recherche l'ignore : elle a deja le nom du registre.
      entreprise: j.company_name || "",
    })),
  },
  teamtailor: {
    url: (slug) => "https://" + slug + ".teamtailor.com/jobs.json",
    lire: (d) => (d && Array.isArray(d.jobs) ? d.jobs : []).map((j) => ({
      titre: j.title || "",
      lieu: j.location || "",
      url: j.url || "",
      publie: j.created_at || "",
      texte: j.body || "",
    })),
  },
  personio: {
    url: (slug) => "https://" + slug + ".jobs.personio.com/search.json",
    lire: (d) => (Array.isArray(d) ? d : []).map((j) => ({
      titre: j.name || "",
      lieu: j.office || "",
      url: j.url || "",
      publie: j.createdAt || "",
      texte: "",
    })),
  },
};

export const NOMS_ATS = Object.keys(ATS);

// Normalise vers la forme que le reste du produit connait deja, celle de
// lib/jobSources.js : un poste venu d'un ATS et un poste venu d'Adzuna
// doivent etre indistinguables en aval.
export function normaliser(poste, entreprise, source) {
  return {
    id: source + ":" + entreprise + ":" + (poste.url || poste.titre),
    title: String(poste.titre || "").trim(),
    company: entreprise,
    location: String(poste.lieu || "").trim(),
    url: poste.url || "",
    created: poste.publie || "",
    description: String(poste.texte || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1200),
    source,
  };
}

// LE MARCHE D'UN TABLEAU, ET POURQUOI IL EST SUR LA LIGNE
//
// Un identifiant d'ATS est mondial et court, donc il se partage. Mesure le
// 6 octobre 2026 en devinant des noms d'entreprises londoniennes :
// `bbc.recruitee.com` est une societe belge de Mechelen, pas la BBC, et
// `web.jobs.personio.com` est a Munich. Les deux avaient repondu avec des
// postes, et la regle "une ligne ecrite est une ligne qui a repondu" les
// aurait gardees : repondre n'est pas appartenir.
//
// Ce qui tranche, c'est le lieu des postes ouverts. Un tableau garde dans le
// registre a, au moment ou il y entre, au moins un poste dans le marche pour
// lequel on l'a cherche, et ce marche est ecrit sur sa ligne. Une entreprise
// londonienne qui n'embauche ce jour-la qu'a Berlin est donc refusee : c'est
// un manque assume, parce qu'elle ne rendrait de toute facon rien a une
// recherche sur Londres, et que la recherche filtre deja par lieu.
//
// Le marche sert ensuite a l'echelle : avec des milliers de tableaux, une
// recherche a Londres n'a aucune raison d'aller lire les tableaux allemands.
export const MARCHES = {
  gb: /\b(united kingdom|uk|u\.k\.|england|scotland|wales|northern ireland|london|manchester|birmingham|leeds|bristol|edinburgh|glasgow|cambridge|oxford|reading|cardiff|belfast|sheffield|liverpool|newcastle|nottingham|brighton|britain)\b/i,
  fr: /\b(france|paris|lyon|marseille|toulouse|bordeaux|lille|nantes|nice|strasbourg|montpellier|rennes|grenoble|sophia antipolis)\b/i,
  us: /\b(usa|u\.s\.|united states|new york|nyc|san francisco|boston|chicago|austin|seattle|los angeles|denver|atlanta|miami|washington dc)\b/i,
  de: /\b(germany|deutschland|berlin|munich|munchen|m\u00fcnchen|hamburg|frankfurt|cologne|k\u00f6ln|stuttgart|dusseldorf|d\u00fcsseldorf|leipzig)\b/i,
  es: /\b(spain|espa\u00f1a|madrid|barcelona|valencia|seville|sevilla|bilbao|malaga|m\u00e1laga)\b/i,
  nl: /\b(netherlands|nederland|amsterdam|rotterdam|utrecht|the hague|den haag|eindhoven)\b/i,
};

// UN NOM DE VILLE BRITANNIQUE EXISTE AUSSI AUX ETATS-UNIS
//
// Mesure le 6 octobre 2026 : `boards.greenhouse.io/serif` est Serif
// Biomedicines, a Cambridge, Massachusetts, et il est entre au registre
// comme britannique parce que la liste ci-dessus contient "cambridge". Il y
// a un Boston, un Birmingham, un Manchester, un Bristol, un Reading et un
// Oxford aux Etats-Unis, et la forme americaine les ecrit avec le code de
// l'Etat juste apres. Un marqueur d'ailleurs l'emporte donc sur un nom de
// ville : c'est le seul ordre qui ne se trompe pas.
//
// Les codes d'Etat sont testes en majuscules, comme ils s'ecrivent. Teste
// sans la casse, "ma", "in" ou "or" apparaitraient dans des lieux legitimes.
const ETATS_US = /\b(AL|AK|AZ|AR|CA|CO|CT|DC|DE|FL|GA|HI|IA|ID|IL|IN|KS|KY|LA|MA|MD|ME|MI|MN|MO|MS|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VA|VT|WA|WI|WV|WY)\b/;
const AILLEURS = /\b(usa|u\.s\.a|united states|canada|australia|new zealand|india|singapore|japan|china|brazil|mexico|south africa|ireland|dublin|belgium|belgique|netherlands|nederland|germany|deutschland|france|spain|espa\u00f1a|italy|italia|portugal|poland|polska|sweden|norway|denmark|finland|switzerland|austria|czech|romania|hungary|greece|turkey|israel|uae|dubai|hong kong)\b/i;

function ailleurs(lieu) {
  const l = String(lieu || "");
  return AILLEURS.test(l) || ETATS_US.test(l);
}

// Le remote compte, mais seulement nomme : "Remote" seul ne dit pas si
// quelqu'un a Londres a le droit du travail la ou l'employeur est.
export function dansLeMarche(lieu, code) {
  const c = String(code || "").toLowerCase();
  const re = MARCHES[c];
  if (!re) return true;
  const l = String(lieu || "");
  // Le pays nomme gagne toujours : "London, United Kingdom" reste vrai meme
  // si un autre pays figure dans la meme chaine multi-sites.
  const explicite = {
    gb: /\b(united kingdom|u\.k\.|uk|england|scotland|wales|northern ireland)\b/i,
    fr: /\bfrance\b/i, us: /\b(usa|united states)\b/i,
    de: /\b(germany|deutschland)\b/i, es: /\b(spain|espa\u00f1a)\b/i,
    nl: /\b(netherlands|nederland)\b/i,
  }[c];
  if (explicite && explicite.test(l)) return true;
  if (c !== "us" && ailleurs(l)) return false;
  return re.test(l);
}

// UN LIEU EST UNE CHAINE LIBRE, ET CHAQUE ATS L'ECRIT AUTREMENT
//
// "London", "London, UK", "London (hybrid)", "UK - London", "Remote, UK".
// Comparer des chaines egales ne trouverait presque rien. On compare donc
// sur un mot contenu, et "remote" dans le pays vise compte : une offre
// remote au Royaume-Uni est une offre que quelqu'un a Londres peut prendre.
export function lieuCorrespond(lieu, cherche) {
  const l = String(lieu || "").toLowerCase();
  const c = String(cherche || "").toLowerCase().trim();
  if (!c) return true;
  if (l.includes(c)) return true;
  if (c === "london" && /\b(uk|united kingdom|england)\b/.test(l) && /remote/.test(l)) return true;
  return false;
}

// Le titre d'abord, parce que c'est ce qu'un ATS trie et ce qu'une personne
// reconnait. Le corps ensuite, pour ne pas rater "Account Manager" cache
// dans un intitule maison ("Commercial Partner, SME").
// UN MOT ENTIER, PAS UNE SOUS-CHAINE
//
// Premiere version avec includes() : "account manager" rendait "Senior
// Manager, Accounting" et "Manager Engineering, Accounting Data". Le mot
// "account" est dans "accounting", et la comptabilite n'est pas la gestion
// de comptes. Trois des dix premiers resultats etaient du mauvais metier.
const motEntier = (terme) => new RegExp("\\b" + terme.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");

export function titreCorrespond(poste, mots) {
  const termes = String(mots || "").toLowerCase().split(/\s+/).filter((m) => m.length > 2);
  if (!termes.length) return true;
  const titre = String(poste.title || "");
  if (termes.every((t) => motEntier(t).test(titre))) return true;

  // LE CORPS, MAIS SEULEMENT L'EXPRESSION ENTIERE
  //
  // Deuxieme mesure, apres le passage aux mots entiers : "account manager"
  // rendait encore "Data Science Manager" et "Credit Risk Manager" chez
  // Monzo. La regle etait "soixante-dix pour cent des termes quelque part
  // dans le corps", et toute annonce de manager contient le mot "account"
  // une fois. Vingt resultats sur vingt-neuf etaient du mauvais metier.
  //
  // Le corps ne rattrape donc plus qu'une chose : l'expression complete,
  // ecrite telle quelle. "Client Partner" se trouve si l'annonce dit
  // "acting as their account manager", et pas parce qu'elle contient les
  // deux mots a trois paragraphes d'ecart. Une liste courte et juste vaut
  // mieux qu'une longue a trier.
  if (termes.length < 2) return false;
  const phrase = new RegExp("\\b" + termes.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+") + "\\b", "i");
  return phrase.test(String(poste.description || ""));
}

export async function lireUnBoard(entreprise, ats, fetchImpl = fetch) {
  const moteur = ATS[ats];
  if (!moteur) return { entreprise, ats, erreur: "unknown ats", postes: [] };
  try {
    const r = await fetchImpl(moteur.url(entreprise), {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; Nuvi)" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!r.ok) return { entreprise, ats, erreur: "HTTP " + r.status, postes: [] };
    const d = await r.json();
    return { entreprise, ats, postes: moteur.lire(d) };
  } catch (e) {
    return { entreprise, ats, erreur: (e && e.message) || "unreachable", postes: [] };
  }
}
