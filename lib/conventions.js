// WHAT A CV LEAVES OUT, COUNTRY BY COUNTRY.
//
// Nuvi already knows which market someone is aiming at: the country picker
// drives the recruiter audit and the interview simulation. The CV itself
// ignored it. So somebody applying in London with a French CV got a French
// CV back, photo slot and all, from a product whose one promise is a
// document that gets through.
//
// THE RULE HAS ONE DIRECTION, AND IT MATTERS
//
// These conventions say what to LEAVE OUT and how long to be. They never
// say what to add. A convention that added things would have to invent a
// date of birth or a nationality the person never wrote, which is the one
// thing this product does not do. Leaving a field out is always safe: the
// person already wrote it, and they can put it back.
//
// The facts below are the ordinary hiring conventions of each market, the
// same ones a recruiter there would state. Where a market is genuinely
// split, the note says so rather than pretending there is one answer.

const RIEN = { pages: "", retirer: [], note: "" };

const PAYS = {
  UK: {
    nom: "the United Kingdom", document: "CV",
    pages: "two pages are normal, one is fine",
    retirer: ["photo", "date of birth", "age", "marital status", "nationality", "gender"],
    note: "British spelling. Discrimination law makes personal details a liability for the employer, so a CV carrying them reads as naive.",
  },
  US: {
    nom: "the United States", document: "resume",
    pages: "one page unless the career is long, then two",
    retirer: ["photo", "date of birth", "age", "marital status", "nationality", "gender",
      "references available on request"],
    note: "American spelling. Personal details expose the employer to discrimination claims and are never included.",
  },
  CA: {
    nom: "Canada", document: "resume",
    pages: "one or two pages",
    retirer: ["photo", "date of birth", "age", "marital status", "nationality", "gender"],
    note: "Same reasoning as the United States. Quebec employers may work in French.",
  },
  FR: {
    nom: "France", document: "CV",
    pages: "one page, two once the career is long",
    retirer: [],
    note: "A photo is common and optional. Nothing is removed: keep what the person wrote.",
  },
  BE: { nom: "Belgium", document: "CV", pages: "one or two pages", retirer: [], note: "Close to French practice." },
  LU: { nom: "Luxembourg", document: "CV", pages: "one or two pages", retirer: [], note: "Close to French practice, often multilingual." },
  DE: {
    nom: "Germany", document: "Lebenslauf",
    pages: "one or two pages, in reverse chronological order",
    retirer: [],
    note: "A photo is customary and dates are expected. Gaps are noticed, so periods stay continuous and explicit.",
  },
  CH: {
    nom: "Switzerland", document: "CV",
    pages: "two pages",
    retirer: [],
    note: "A photo is customary. Close to German practice.",
  },
  ES: { nom: "Spain", document: "CV", pages: "one or two pages", retirer: [], note: "A photo is common and optional." },
  IT: { nom: "Italy", document: "CV", pages: "one or two pages", retirer: [], note: "A photo is common and optional." },
  AE: {
    nom: "the United Arab Emirates", document: "CV",
    pages: "two pages",
    retirer: [],
    note: "A photo is common, and nationality and visa status are usually expected.",
  },
};

export const PAYS_CONNUS = Object.keys(PAYS);

export function conventionsDuPays(code) {
  const c = String(code || "").toUpperCase();
  return PAYS[c] || null;
}

// The line handed to the model. Empty when the country is unknown or set to
// AUTO: saying nothing is better than asserting a convention we do not have.
export function reglesDuPays(code) {
  const r = conventionsDuPays(code);
  if (!r) return "";
  const bouts = [
    "TARGET MARKET: " + r.nom + ". The document is called a " + r.document
    + " there, and " + r.pages + ".",
  ];
  if (r.retirer.length) {
    bouts.push("Leave out, because that market does not put them on a "
      + r.document + ": " + r.retirer.join(", ") + ". Remove them only if the "
      + "source CV carries them, and introduce nothing that is not already "
      + "there.");
  }
  if (r.note) bouts.push(r.note);
  return bouts.join(" ") + "\n";
}

// THE COUNTRY IS A GUESS UNTIL SOMEBODY SAYS OTHERWISE
//
// It was hardcoded to FR for everyone, so a person in London was audited
// against the French market by default. The ad names the market better than
// any setting, and the person's own location better than a default.
const INDICES = [
  [/\b(united kingdom|england|scotland|wales|london|manchester|birmingham|leeds|glasgow|bristol|edinburgh|uk)\b/i, "UK"],
  [/\b(united states|usa|u\.s\.|new york|san francisco|chicago|boston|seattle|austin|los angeles)\b/i, "US"],
  [/\b(canada|toronto|montreal|vancouver|ottawa|calgary)\b/i, "CA"],
  [/\b(deutschland|germany|berlin|munich|munchen|hamburg|frankfurt|cologne|koln)\b/i, "DE"],
  [/\b(switzerland|suisse|schweiz|zurich|geneva|geneve|basel|lausanne)\b/i, "CH"],
  [/\b(belgium|belgique|brussels|bruxelles|antwerp|anvers|liege)\b/i, "BE"],
  [/\b(luxembourg|luxemburg)\b/i, "LU"],
  [/\b(spain|espana|espagne|madrid|barcelona|valencia|seville)\b/i, "ES"],
  [/\b(italy|italia|italie|rome|roma|milan|milano|turin|naples)\b/i, "IT"],
  [/\b(emirates|dubai|abu dhabi)\b/i, "AE"],
  [/\b(france|paris|lyon|marseille|toulouse|bordeaux|lille|nantes)\b/i, "FR"],
];

export function paysDuTexte(texte) {
  const t = String(texte || "");
  if (!t.trim()) return "";
  for (const [motif, code] of INDICES) if (motif.test(t)) return code;
  return "";
}

// ADZUNA CALLS THE UNITED KINGDOM "gb"
//
// The job search had its own country state, defaulting to France, separate
// from the market the person had already chosen everywhere else. So someone
// in London opened "Find a role" and searched the French market until they
// noticed the little button. The market is one setting and everything obeys
// it; this maps it onto the codes Adzuna uses. A market Adzuna does not
// cover returns nothing, and the search keeps its own default.
const ADZUNA = {
  UK: "gb", FR: "fr", US: "us", DE: "de", CH: "ch", BE: "be",
  ES: "es", IT: "it", CA: "ca", AE: "",  LU: "",
};

export function codeAdzuna(code) {
  return ADZUNA[String(code || "").toUpperCase()] || "";
}
