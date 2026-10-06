// A SENTENCE IS A SEARCH
//
// Kilian, 6 October 2026, giving one example of the kind of request a person
// would type: "find me a French speaker job with my CV in London". It did
// not search, before today: there were two fields, a title and a city, and
// most of that sentence was neither. The example is not the feature and it
// is not a niche; it is one sentence out of all the sentences people type.
// What a person asks for is rarely a job title and a place. It is a job
// title and a place and three conditions, and the conditions are what
// disqualify an ad in one line.
//
// The model does not search: it turns the sentence into requirements, and
// the search does the searching. That distinction is everything. A model
// that "found offers" would invent them, and an invented offer is the one
// thing this product cannot afford.
//
// WHAT COMES FROM THE CV, AND WHAT DOES NOT
//
// "with my CV" means: the trade, the level and the languages are already
// written down, do not ask me again. So the model reads the CV to fill what
// the sentence leaves implicit, and that is choosing inside the person's own
// material, not inventing (CLAUDE.md, rule 3). What it never does: add a
// requirement the person did not state. Someone asking for "a role in
// London" must not get a salary filter they never set, because an invented
// filter removes offers in silence.

import { NO_FILTERS } from "./jobFilters.js";

export const SEARCH_SCHEMA = {
  type: "object",
  properties: {
    what: { type: "string", description: "Job title or keywords, in the language of the job market" },
    where: { type: "string", description: "City or region, empty if the person did not say one" },
    country: { type: "string", description: "Two letter code: gb, fr, us, de, es, nl" },
    workplace: { type: "string", enum: ["", "remote", "hybrid", "onsite"] },
    language: { type: "string", enum: ["", "french", "german", "spanish", "italian", "dutch", "portuguese", "arabic", "mandarin"],
      description: "A language the JOB must require. Only if the person asked for it." },
    salaryFrom: { type: "number", description: "0 unless the person named a floor" },
    contract: { type: "string", enum: ["", "permanent", "contract", "internship", "parttime"] },
    postedWithin: { type: "number", description: "Days. 0 unless the person asked for recent postings" },
    level: { type: "string", enum: ["", "junior", "mid", "senior", "lead"] },
    understood: { type: "string", description: "One short sentence, in the person's language, saying what you understood. It is shown to them." },
  },
  required: ["what", "where", "country", "understood"],
  additionalProperties: false,
};

export function searchInstruction(sentence, locale = "en") {
  return [
    "Turn this sentence into a job search. You do not search, and you do not invent",
    "offers or requirements: you only say what to look for.",
    "",
    "THE SENTENCE: " + JSON.stringify(String(sentence || "")),
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
    "- `language` is a language THE JOB must require, and only when the person",
    "  asked for it. \"as a French speaker\" means yes: they want the ads that",
    "  demand French. A CV written in French does not mean yes.",
    "- Leave every other field at its empty value unless the person named it.",
    "  A filter nobody asked for removes offers in silence, and silence is",
    "  the one failure this product cannot have.",
    "- `country` follows the city when the person named one: London is gb,",
    "  Paris is fr, Berlin is de. Default to gb if nothing says otherwise.",
    "- `understood` is one sentence, in " + (locale === "fr" ? "French" : "English") + ",",
    "  saying what you understood. The person reads it and corrects it, so it",
    "  names the real filters and nothing else.",
  ].join("\n");
}

// The model returns JSON that matches the schema, but an enum can still
// arrive with a value outside the list, and a number as a string. We pull it
// back into range here rather than let an unknown filter empty the results.
const ENUMS = {
  workplace: ["", "remote", "hybrid", "onsite"],
  language: ["", "french", "german", "spanish", "italian", "dutch", "portuguese", "arabic", "mandarin"],
  contract: ["", "permanent", "contract", "internship", "parttime"],
  level: ["", "junior", "mid", "senior", "lead"],
};

export function filtersFromTheModel(raw) {
  const d = raw && typeof raw === "object" ? raw : {};
  const out = { ...NO_FILTERS };
  out.what = String(d.what || "").trim();
  out.where = String(d.where || "").trim();
  const country = String(d.country || "").trim().toLowerCase();
  out.country = /^[a-z]{2}$/.test(country) ? country : "gb";
  for (const key of Object.keys(ENUMS)) {
    const v = String(d[key] || "").trim().toLowerCase();
    out[key] = ENUMS[key].includes(v) ? v : "";
  }
  const n = (v) => {
    const x = Number(v);
    return Number.isFinite(x) && x > 0 ? Math.round(x) : 0;
  };
  out.salaryFrom = n(d.salaryFrom);
  out.postedWithin = n(d.postedWithin);
  return { filters: out, understood: String(d.understood || "").trim() };
}

// The sentence becomes a query. `what` and `where` go to the source, the
// rest is applied to what it returns: an aggregator cannot filter on "the ad
// requires French", and that is precisely where the value is.
export function searchParams(filters, page = 1) {
  const f = { ...NO_FILTERS, ...filters };
  const p = new URLSearchParams({
    what: f.what, where: f.where, country: f.country, page: String(Math.max(1, page)),
  });
  for (const key of ["workplace", "language", "contract", "level"]) if (f[key]) p.set(key, f[key]);
  if (f.salaryFrom > 0) p.set("salaryFrom", String(f.salaryFrom));
  if (f.postedWithin > 0) p.set("postedWithin", String(f.postedWithin));
  return p;
}

export function filtersFromParams(params) {
  const g = (k) => String(params.get(k) || "").trim();
  const out = { ...NO_FILTERS };
  out.what = g("what");
  out.where = g("where");
  out.country = g("country") || "gb";
  for (const key of Object.keys(ENUMS)) {
    const v = g(key).toLowerCase();
    out[key] = ENUMS[key].includes(v) ? v : "";
  }
  out.salaryFrom = Math.max(0, Math.round(Number(g("salaryFrom")) || 0));
  out.postedWithin = Math.max(0, Math.round(Number(g("postedWithin")) || 0));
  return out;
}
