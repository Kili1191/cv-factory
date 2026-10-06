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
