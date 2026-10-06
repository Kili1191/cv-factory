// UNE PHRASE EST UNE RECHERCHE
//
// Kilian, le 6 octobre 2026 : "si j'ecris trouve moi un job de francophone
// avec mon CV a Londres, est-ce que ca cherche ?" Non, avant aujourd'hui :
// il y avait deux champs, l'intitule et la ville, et "francophone" n'etait
// ni l'un ni l'autre. C'est pourtant l'exigence qui compte le plus pour lui,
// parce qu'une annonce londonienne qui demande le francais est une annonce
// ou son profil passe devant les autres candidats.
//
// Le modele ne cherche pas : il traduit la phrase en exigences, et c'est la
// recherche qui cherche. La distinction est tout : un modele qui "trouverait
// des offres" les inventerait, et une offre inventee est la seule chose que
// ce produit ne peut pas se permettre.
//
// CE QUI VIENT DU CV, ET CE QUI N'EN VIENT PAS
//
// "avec mon CV" veut dire : le metier, le niveau et les langues sont deja
// ecrits, ne me les redemande pas. Le modele lit donc le CV pour remplir ce
// que la phrase laisse implicite, et c'est du choix dans le materiau de la
// personne, pas de l'invention (CLAUDE.md, regle 3). Ce qu'il ne fait jamais
// : ajouter une exigence que la personne n'a pas dite. Quelqu'un qui demande
// "un poste a Londres" ne doit pas recevoir un filtre de salaire qu'il n'a
// pas pose, parce qu'un filtre invente retire des offres en silence.

import { FILTRES_VIDES } from "./filtresDOffre.js";

export const SCHEMA_RECHERCHE = {
  type: "object",
  properties: {
    what: { type: "string", description: "Job title or keywords, in the language of the job market" },
    where: { type: "string", description: "City or region, empty if the person did not say one" },
    country: { type: "string", description: "Two letter code: gb, fr, us, de, es, nl" },
    remote: { type: "string", enum: ["", "remote", "hybride", "surplace"] },
    langue: { type: "string", enum: ["", "french", "german", "spanish", "italian", "dutch", "portuguese", "arabic", "mandarin"],
      description: "A language the JOB must require. Only if the person asked for it." },
    salaireMin: { type: "number", description: "0 unless the person named a floor" },
    contrat: { type: "string", enum: ["", "cdi", "mission", "stage", "partiel"] },
    depuisJours: { type: "number", description: "0 unless the person asked for recent postings" },
    seniorite: { type: "string", enum: ["", "junior", "confirme", "senior", "lead"] },
    lu: { type: "string", description: "One short sentence, in the person's language, saying what you understood. It is shown to them." },
  },
  required: ["what", "where", "country", "lu"],
  additionalProperties: false,
};

export function consigneDeRecherche(phrase, locale = "en") {
  return [
    "Turn this sentence into a job search. You do not search, and you do not invent",
    "offers or requirements: you only say what to look for.",
    "",
    "THE SENTENCE: " + JSON.stringify(String(phrase || "")),
    "",
    "RULES",
    "- `what` is the job title as an employer would write it in the job ad,",
    "  two or three words at most. Broad beats narrow: the search matches",
    "  whole words in the title, so \"senior account manager\" finds almost",
    "  nothing while \"account manager\" finds the role.",
    "- If the sentence refers to the person's CV (\"with my CV\", \"for my",
    "  profile\", \"like my last job\"), read the CV in context and take the",
    "  trade and the level from it. That is choosing inside their own",
    "  material, which is what anyone does when they adapt a CV by hand.",
    "- `langue` is a language THE JOB must require, and only when the person",
    "  asked for it. \"as a French speaker\" means yes: they want the ads that",
    "  demand French. A CV written in French does not mean yes.",
    "- Leave every other field at its empty value unless the person named it.",
    "  A filter nobody asked for removes offers in silence, and silence is",
    "  the one failure this product cannot have.",
    "- `country` follows the city when the person named one: London is gb,",
    "  Paris is fr, Berlin is de. Default to gb if nothing says otherwise.",
    "- `lu` is one sentence, in " + (locale === "fr" ? "French" : "English") + ",",
    "  saying what you understood. The person reads it and corrects it, so it",
    "  names the real filters and nothing else.",
  ].join("\n");
}

// Le modele rend du JSON conforme au schema, mais une enumeration peut
// arriver avec une valeur hors liste, et un nombre en chaine. On le ramene
// dans les clous ici plutot que de laisser un filtre inconnu tout vider.
const ENUMS = {
  remote: ["", "remote", "hybride", "surplace"],
  langue: ["", "french", "german", "spanish", "italian", "dutch", "portuguese", "arabic", "mandarin"],
  contrat: ["", "cdi", "mission", "stage", "partiel"],
  seniorite: ["", "junior", "confirme", "senior", "lead"],
};

export function filtresDepuisLeModele(brut) {
  const d = brut && typeof brut === "object" ? brut : {};
  const out = { ...FILTRES_VIDES };
  out.what = String(d.what || "").trim();
  out.where = String(d.where || "").trim();
  const pays = String(d.country || "").trim().toLowerCase();
  out.country = /^[a-z]{2}$/.test(pays) ? pays : "gb";
  for (const cle of Object.keys(ENUMS)) {
    const v = String(d[cle] || "").trim().toLowerCase();
    out[cle] = ENUMS[cle].includes(v) ? v : "";
  }
  const n = (v) => {
    const x = Number(v);
    return Number.isFinite(x) && x > 0 ? Math.round(x) : 0;
  };
  out.salaireMin = n(d.salaireMin);
  out.depuisJours = n(d.depuisJours);
  return { filtres: out, lu: String(d.lu || "").trim() };
}

// La phrase part en requete. `what` et `where` vont a la source, le reste
// est applique sur ce qu'elle rend : un agregateur ne sait pas filtrer sur
// "l'annonce exige le francais", et c'est justement la l'interet.
export function parametresDeRecherche(filtres, page = 1) {
  const f = { ...FILTRES_VIDES, ...filtres };
  const p = new URLSearchParams({
    what: f.what, where: f.where, country: f.country, page: String(Math.max(1, page)),
  });
  for (const cle of ["remote", "langue", "contrat", "seniorite"]) if (f[cle]) p.set(cle, f[cle]);
  if (f.salaireMin > 0) p.set("salaireMin", String(f.salaireMin));
  if (f.depuisJours > 0) p.set("depuisJours", String(f.depuisJours));
  return p;
}

export function filtresDepuisLesParametres(params) {
  const g = (k) => String(params.get(k) || "").trim();
  const out = { ...FILTRES_VIDES };
  out.what = g("what");
  out.where = g("where");
  out.country = g("country") || "gb";
  for (const cle of Object.keys(ENUMS)) {
    const v = g(cle).toLowerCase();
    out[cle] = ENUMS[cle].includes(v) ? v : "";
  }
  out.salaireMin = Math.max(0, Math.round(Number(g("salaireMin")) || 0));
  out.depuisJours = Math.max(0, Math.round(Number(g("depuisJours")) || 0));
  return out;
}
