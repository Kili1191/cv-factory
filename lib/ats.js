import { sponsorshipStance } from "./jobFilters.js";
// THE JOBS THAT ARE ON NO JOB SITE
//
// Career Hound sells exactly one thing: roles posted on a company's own site
// and nowhere else. Its argument fits in a line and it is right: an ad on an
// aggregator has two hundred applicants within the hour, the employer pays a
// commission, and they prefer direct applications.
//
// WHAT THAT MEANS TECHNICALLY
//
// Almost no company writes its own careers page: it buys an ATS, and the six
// big ones serve their jobs as public JSON with no key. Measured on
// 6 October 2026: Greenhouse, Lever and Ashby answer 200 to an anonymous
// request; a hundred and eighteen company names guessed by hand gave
// forty-nine live boards and close to four thousand jobs.
//
// AND WHY THIS IS EXACTLY OUR GROUND
//
// Indeed and LinkedIn answer 401 to any server whatever user agent it
// declares: that is what made the link Kilian pasted fail. The ATSs give
// everything. The jobs Nuvi will never be able to read are precisely the
// ones nobody should be aiming at, and the ones it reads effortlessly are
// the ones where an application counts.
//
// THE HARD PART IS NOT THE READING, IT IS THE LIST
//
// You need each company's identifier at its ATS. That is the only part that
// is bought with time, so it is the only part that protects anything.
// `scripts/find-job-boards.mjs` builds it.

export const ATS = {
  greenhouse: {
    url: (slug) => "https://boards-api.greenhouse.io/v1/boards/" + slug + "/jobs?content=true",
    read: (d) => (d && Array.isArray(d.jobs) ? d.jobs : []).map((j) => ({
      title: j.title || "",
      location: (j.location && j.location.name) || "",
      url: j.absolute_url || "",
      posted: j.updated_at || j.first_published || "",
      text: j.content || "",
    })),
  },
  lever: {
    url: (slug) => "https://api.lever.co/v0/postings/" + slug + "?mode=json",
    read: (d) => (Array.isArray(d) ? d : []).map((j) => ({
      title: j.text || "",
      location: (j.categories && j.categories.location) || "",
      url: j.hostedUrl || j.applyUrl || "",
      posted: j.createdAt ? new Date(j.createdAt).toISOString() : "",
      text: j.descriptionPlain || j.description || "",
    })),
  },
  ashby: {
    url: (slug) => "https://api.ashbyhq.com/posting-api/job-board/" + slug + "?includeCompensation=true",
    read: (d) => (d && Array.isArray(d.jobs) ? d.jobs : []).map((j) => ({
      title: j.title || "",
      location: j.location || "",
      url: j.jobUrl || j.applyUrl || "",
      posted: j.publishedAt || "",
      text: j.descriptionPlain || "",
    })),
  },
  recruitee: {
    url: (slug) => "https://" + slug + ".recruitee.com/api/offers/",
    read: (d) => (d && Array.isArray(d.offers) ? d.offers : []).map((j) => ({
      title: j.title || "",
      location: [j.city, j.country].filter(Boolean).join(", "),
      url: j.careers_url || j.url || "",
      posted: j.published_at || "",
      text: j.description || "",
      // Recruitee is the only ATS that names the employer on every job. The
      // discovery script uses it to learn whose board this is; the search
      // ignores it, since it already has the name from the registry.
      company: j.company_name || "",
    })),
  },
  teamtailor: {
    url: (slug) => "https://" + slug + ".teamtailor.com/jobs.json",
    read: (d) => (d && Array.isArray(d.jobs) ? d.jobs : []).map((j) => ({
      title: j.title || "",
      location: j.location || "",
      url: j.url || "",
      posted: j.created_at || "",
      text: j.body || "",
    })),
  },
  personio: {
    url: (slug) => "https://" + slug + ".jobs.personio.com/search.json",
    read: (d) => (Array.isArray(d) ? d : []).map((j) => ({
      title: j.name || "",
      location: j.office || "",
      url: j.url || "",
      posted: j.createdAt || "",
      text: "",
    })),
  },
};

export const ATS_NAMES = Object.keys(ATS);

// Normalise to the shape the rest of the product already knows, the one in
// lib/jobSources.js: a job from an ATS and a job from Adzuna must be
// indistinguishable downstream.
export function normalise(post, company, source) {
  // READ THE REQUIREMENTS WHERE THE TEXT IS STILL WHOLE
  //
  // The description below is cut to 1200 characters for transport, and the
  // sentence about visas is at the bottom of an ad, so the cut removes
  // precisely what the filter needs. We already hold the whole text here, and
  // we paid for it. So the stance is read now and only the verdict travels: a
  // dozen bytes instead of the whole ad, no cost to the index's memory and
  // none to the response. Aggregated ads arrive already truncated by their
  // source and cannot be rescued this way, which is exactly why the career
  // pages, the source we own, are the one that has to be right.
  const whole = String(post.text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return {
    id: source + ":" + company + ":" + (post.url || post.title),
    title: String(post.title || "").trim(),
    company,
    location: String(post.location || "").trim(),
    url: post.url || "",
    created: post.posted || "",
    description: whole.slice(0, 1200),
    visaStance: sponsorshipStance({ title: post.title, description: whole }),
    source,
  };
}

// A BOARD'S MARKET, AND WHY IT SITS ON THE LINE
//
// An ATS identifier is global and short, so it gets shared. Measured on
// 6 October 2026 while guessing London company names: `bbc.recruitee.com`
// is a Belgian firm in Mechelen, not the BBC, and `web.jobs.personio.com`
// is in Munich. Both answered with jobs, and the rule "a line written is a
// line that answered" would have kept them: answering is not belonging.
//
// What settles it is where the open jobs are. A board kept in the registry
// has, at the moment it enters, at least one job in the market it was
// searched for, and that market is written on its line. A London company
// hiring only in Berlin that day is therefore refused: an accepted gap,
// because it would return nothing to a London search anyway, and the search
// already filters by location.
//
// The market then carries the scale: with thousands of boards, a London
// search has no reason to go and read the German ones.
export const MARKETS = {
  gb: /\b(united kingdom|uk|u\.k\.|england|scotland|wales|northern ireland|london|manchester|birmingham|leeds|bristol|edinburgh|glasgow|cambridge|oxford|reading|cardiff|belfast|sheffield|liverpool|newcastle|nottingham|brighton|britain)\b/i,
  fr: /\b(france|paris|lyon|marseille|toulouse|bordeaux|lille|nantes|nice|strasbourg|montpellier|rennes|grenoble|sophia antipolis)\b/i,
  us: /\b(usa|u\.s\.|united states|new york|nyc|san francisco|boston|chicago|austin|seattle|los angeles|denver|atlanta|miami|washington dc)\b/i,
  de: /\b(germany|deutschland|berlin|munich|munchen|m\u00fcnchen|hamburg|frankfurt|cologne|k\u00f6ln|stuttgart|dusseldorf|d\u00fcsseldorf|leipzig)\b/i,
  es: /\b(spain|espa\u00f1a|madrid|barcelona|valencia|seville|sevilla|bilbao|malaga|m\u00e1laga)\b/i,
  nl: /\b(netherlands|nederland|amsterdam|rotterdam|utrecht|the hague|den haag|eindhoven)\b/i,
};

// A BRITISH CITY NAME ALSO EXISTS IN THE UNITED STATES
//
// Measured on 6 October 2026: `boards.greenhouse.io/serif` is Serif
// Biomedicines, in Cambridge Massachusetts, and it entered the registry as
// British because the list above contains "cambridge". There is a Boston, a
// Birmingham, a Manchester, a Bristol, a Reading and an Oxford in the United
// States, and the American form writes them with the state code right after.
// So a marker from elsewhere beats a city name: that is the only order that
// does not get it wrong.
//
// State codes are tested in upper case, as they are written. Tested without
// case, "ma", "in" and "or" would appear in legitimate locations.
const US_STATES = /\b(AL|AK|AZ|AR|CA|CO|CT|DC|DE|FL|GA|HI|IA|ID|IL|IN|KS|KY|LA|MA|MD|ME|MI|MN|MO|MS|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VA|VT|WA|WI|WV|WY)\b/;
const ELSEWHERE_MARKERS = /\b(usa|u\.s\.a|united states|canada|australia|new zealand|india|singapore|japan|china|brazil|mexico|south africa|ireland|dublin|belgium|belgique|netherlands|nederland|germany|deutschland|france|spain|espa\u00f1a|italy|italia|portugal|poland|polska|sweden|norway|denmark|finland|switzerland|austria|czech|romania|hungary|greece|turkey|israel|uae|dubai|hong kong)\b/i;

// THE STATE WRITTEN OUT IN FULL, WHICH THE TWO LETTER FORM DID NOT COVER
//
// The two letter codes caught "Birmingham, AL". They do nothing for
// "Sheffield, Ohio", and that is how Carvana, a used car company in Tempe
// Arizona with 1831 American jobs, entered the British registry on
// 6 October 2026: one of its listings is in Sheffield, Ohio, and `sheffield`
// is in the British city list. Seven of eight American cities sharing a
// British name passed this way, "Birmingham, Alabama", "Manchester, New
// Hampshire", "Reading, Pennsylvania", "Cambridge, Massachusetts" among them.
//
// The comma is what makes this safe. "City, State" is the American form, so
// the state name is only tested after one: this rule does not fire on
// "Washington, Tyne and Wear", whose comma is followed by "Tyne", while
// "Seattle, Washington" is refused. Matching the bare word would have thrown
// away a real British town to catch an American one. (That town is not in
// the registry either way: MARKETS.gb carries no "tyne and wear", which is a
// gap in the city list and not this rule's doing.)
const US_STATE_NAMES = /,\s*(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\b/i;

function elsewhere(location) {
  const l = String(location || "");
  return ELSEWHERE_MARKERS.test(l) || US_STATES.test(l) || US_STATE_NAMES.test(l);
}

// Remote counts, but only when it is named: "Remote" on its own does not
// say whether someone in London has the right to work where the employer is.
export function inTheMarket(location, code) {
  const c = String(code || "").toLowerCase();
  const re = MARKETS[c];
  if (!re) return true;
  const l = String(location || "");
  // The named country always wins: "London, United Kingdom" stays true even
  // when another country appears in the same multi-site string.
  const named = {
    gb: /\b(united kingdom|u\.k\.|uk|england|scotland|wales|northern ireland)\b/i,
    fr: /\bfrance\b/i, us: /\b(usa|united states)\b/i,
    de: /\b(germany|deutschland)\b/i, es: /\b(spain|espa\u00f1a)\b/i,
    nl: /\b(netherlands|nederland)\b/i,
  }[c];
  if (named && named.test(l)) return true;
  if (c !== "us" && elsewhere(l)) return false;
  return re.test(l);
}

// A LOCATION IS FREE TEXT, AND EVERY ATS WRITES IT DIFFERENTLY
//
// "London", "London, UK", "London (hybrid)", "UK - London", "Remote, UK".
// Comparing equal strings would find almost nothing. So we compare on a
// contained word, and "remote" inside the target country counts: a remote
// job in the United Kingdom is a job someone in London can take.
export function locationMatches(location, wanted) {
  const l = String(location || "").toLowerCase();
  const c = String(wanted || "").toLowerCase().trim();
  if (!c) return true;
  if (l.includes(c)) return true;
  if (c === "london" && /\b(uk|united kingdom|england)\b/.test(l) && /remote/.test(l)) return true;
  return false;
}

// The title first, because that is what an ATS sorts on and what a person
// recognises. The body second, so as not to miss "Account Manager" hidden
// inside a house title ("Commercial Partner, SME").
//
// A WHOLE WORD, NOT A SUBSTRING
//
// First version used includes(): "account manager" returned "Senior Manager,
// Accounting" and "Manager Engineering, Accounting Data". The word "account"
// is inside "accounting", and accounting is not account management. Three of
// the first ten results were the wrong trade.
const wholeWord = (term) => new RegExp("\\b" + term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");

export function titleMatches(post, words) {
  const terms = String(words || "").toLowerCase().split(/\s+/).filter((m) => m.length > 2);
  if (!terms.length) return true;
  const title = String(post.title || "");
  if (terms.every((t) => wholeWord(t).test(title))) return true;

  // THE BODY, BUT ONLY THE WHOLE PHRASE
  //
  // Second measurement, after moving to whole words: "account manager" still
  // returned "Data Science Manager" and "Credit Risk Manager" at Monzo. The
  // rule was "seventy percent of the terms somewhere in the body", and every
  // manager ad contains the word "account" once. Twenty results out of
  // twenty-nine were the wrong trade.
  //
  // So the body now rescues one thing only: the complete phrase, written as
  // such. "Client Partner" is found if the ad says "acting as their account
  // manager", and not because it holds the two words three paragraphs apart.
  // A short, right list beats a long one to sort through.
  if (terms.length < 2) return false;
  const phrase = new RegExp("\\b" + terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+") + "\\b", "i");
  return phrase.test(String(post.description || ""));
}

// A BOARD THAT HAS GONE SILENT MUST NOT TAKE THE SEARCH DOWN WITH IT
//
// A company changes ATS and its identifier stops answering. If this read
// threw, every other board would be lost with it. So the failure is a value,
// never an exception, and the caller names the silent ones.
export async function readABoard(company, ats, fetchImpl = fetch) {
  const engine = ATS[ats];
  if (!engine) return { company, ats, error: "unknown ats", posts: [] };
  try {
    const r = await fetchImpl(engine.url(company), {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; Nuvi)" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!r.ok) return { company, ats, error: "HTTP " + r.status, posts: [] };
    const d = await r.json();
    return { company, ats, posts: engine.read(d) };
  } catch (e) {
    return { company, ats, error: (e && e.message) || "unreachable", posts: [] };
  }
}
