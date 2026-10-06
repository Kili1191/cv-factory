// FINDING CAREER BOARDS IN BULK
//
//   node scripts/find-job-boards.mjs --hn --market gb
//   node scripts/find-job-boards.mjs --aggregator --market gb
//   node scripts/find-job-boards.mjs --file domains.txt --market gb
//   node scripts/find-job-boards.mjs --city Q84 --limit 1200
//   add --write to put what it finds into lib/boards.js
//
// `try-board-names.mjs` tries names you hand it, one per line. This one
// builds the list of candidates itself, and that is the whole difference:
// the registry no longer grows at the speed someone types names.
//
// THE FOUR SOURCES, AND WHAT EACH IS WORTH
//
// Measured on 6 October 2026, all four against the British market.
//
//   --hn          2633 slug/ATS pairs, 172 boards kept (7 %), 13 816 jobs
//   --file        1919 company domains, 27 boards kept (1 %)
//   --city        1199 Wikidata names, 23 boards kept (2 %)
//   --aggregator  needs an Adzuna or Reed key, grows with use
//
// Hacker News wins by a wide margin and the reason matters: there the ATS is
// ALREADY KNOWN, because it is in the URL somebody pasted. Nothing is
// guessed, so one request per pair instead of eighteen, and no homonym from
// a guess. Wikidata by city is the worst list to start from: it is full of
// embassies, football clubs and colleges, not companies that buy a modern
// ATS.
//
// NOTHING WRITTEN HERE IS GUESSED. A line that gets added is a line whose
// board answered with at least one job in the market, and that could say
// whose board it is.

import { readFileSync, writeFileSync } from "node:fs";
import { ATS, ATS_NAMES, inTheMarket } from "../lib/ats.js";
import { BOARDS } from "../lib/boards.js";
import {
  adzunaConfigured, adzunaUrl, adzunaParse,
  reedConfigured, reedUrl, reedAuthHeader, reedParse,
} from "../lib/jobSources.js";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf("--" + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const write = args.includes("--write");
const fromHackerNews = args.includes("--hn");
const fromAggregator = args.includes("--aggregator");
const file = option("file", "");
const city = option("city", "Q84");            // Q84 = London
// `--country Q145` takes a whole country's companies instead of one city.
const country = option("country", "");
const limit = Number(option("limit", "1200"));
const market = option("market", "gb");
const AGENT = "Mozilla/5.0 (compatible; Nuvi/1.0; +https://thenuvi.com)";

// ------------------------------------------------------------ the candidates

// THE BEST LIST IS THE ONE WHERE PEOPLE ALREADY PASTED THEIR LINKS
//
// "Ask HN: Who is hiring?" has run every month since 2011. Measured on
// 6 October 2026: 186 threads, 119 808 comments, and almost every comment is
// a company that is hiring with, most of the time, the direct link to its
// board. The Hacker News Algolia API serves them by thread, free and with no
// key.
//
// Plenty of those links are ten years old and dead. That does not matter:
// verification is the same for all of them, one open job in the market and a
// board that says whose it is, and a dead board fails the first.
async function fromHn() {
  const PATTERNS = [
    [/boards\.greenhouse\.io\/(?:embed\/job_board\?for=)?([A-Za-z0-9_-]{2,40})/g, "greenhouse"],
    [/job-boards\.greenhouse\.io\/([A-Za-z0-9_-]{2,40})/g, "greenhouse"],
    [/jobs\.lever\.co\/([A-Za-z0-9_-]{2,40})/g, "lever"],
    [/jobs\.ashbyhq\.com\/([A-Za-z0-9_.-]{2,40})/g, "ashby"],
    [/([A-Za-z0-9-]{2,40})\.recruitee\.com/g, "recruitee"],
    [/([A-Za-z0-9-]{2,40})\.teamtailor\.com/g, "teamtailor"],
    [/([A-Za-z0-9-]{2,40})\.jobs\.personio\.(?:com|de)/g, "personio"],
  ];
  // The bits of a URL that are not identifiers.
  const NOISE = new Set(["embed", "jobs", "job", "job_board", "www", "api", "careers", "search", "en", "us", "app"]);

  async function algolia(url) {
    const r = await fetch(url, { headers: { Accept: "application/json", "User-Agent": AGENT },
      signal: AbortSignal.timeout(60_000) });
    if (!r.ok) throw new Error("Algolia HTTP " + r.status);
    return r.json();
  }

  const threads = [];
  for (let page = 0; page < 6; page += 1) {
    const d = await algolia("https://hn.algolia.com/api/v1/search?tags=story,author_whoishiring"
      + "&query=" + encodeURIComponent("Ask HN: Who is hiring?") + "&hitsPerPage=100&page=" + page);
    const h = d.hits || [];
    if (!h.length) break;
    for (const x of h) threads.push(x.objectID);
    if (page + 1 >= (d.nbPages || 1)) break;
  }
  console.log(threads.length + " \"Who is hiring\" threads to read");

  const seen = new Map();
  let t = 0;
  async function reader() {
    while (t < threads.length) {
      const id = threads[t++];
      for (let page = 0; page < 3; page += 1) {
        let d;
        try {
          d = await algolia("https://hn.algolia.com/api/v1/search?tags=comment,story_"
            + id + "&hitsPerPage=1000&page=" + page);
        } catch { break; }
        const h = d.hits || [];
        if (!h.length) break;
        const blob = JSON.stringify(h);
        for (const [re, ats] of PATTERNS) {
          re.lastIndex = 0;
          let m;
          while ((m = re.exec(blob)) !== null) {
            const slug = m[1].toLowerCase();
            if (NOISE.has(slug) || /^\d+$/.test(slug)) continue;
            seen.set(slug + " " + ats, { name: "", site: "", slug, ats });
          }
        }
        if (page + 1 >= (d.nbPages || 1)) break;
      }
    }
  }
  await Promise.all(Array.from({ length: 12 }, reader));
  console.log(seen.size + " slug/ATS pairs collected");
  return [...seen.values()];
}

// THE SOURCE THAT FEEDS ON USE
//
// Aggregators name the employer on every ad. Those are exactly the companies
// that are hiring, in the person's market, today. So the registry grows with
// the use of the product instead of a list someone copied out, and the same
// free key opens both.
async function fromAggregators() {
  const env = process.env;
  const names = new Set();
  if (adzunaConfigured(env)) {
    for (let p = 1; p <= 10; p += 1) {
      const r = await fetch(adzunaUrl(env, { what: "", where: "", country: market, page: p }));
      if (!r.ok) break;
      for (const j of adzunaParse(await r.json())) if (j.company) names.add(j.company);
    }
  }
  if (reedConfigured(env)) {
    for (let p = 1; p <= 10; p += 1) {
      const r = await fetch(reedUrl({ what: "", where: "", page: p }),
        { headers: { Authorization: reedAuthHeader(env) } });
      if (!r.ok) break;
      for (const j of reedParse(await r.json())) if (j.company) names.add(j.company);
    }
  }
  if (!names.size) {
    console.error("--aggregator with no key: set ADZUNA_APP_ID / ADZUNA_APP_KEY or REED_API_KEY.");
    process.exit(2);
  }
  return [...names].map((n) => ({ name: n, site: "" }));
}

// Wikidata returns companies by head office with their official site, free
// and in one second: 1201 for London with the direct wdt:P159 predicate. The
// transitive wdt:P131* path, "inside Greater London", takes 24 seconds for
// fifty rows.
async function fromWikidata() {
  // By country you need one more constraint: wdt:P17 alone also returns
  // clubs, schools and parishes. wdt:P452 (industry) keeps what is a company
  // without costing the query any time.
  const where = country
    ? `?c wdt:P17 wd:${country} ; wdt:P452 ?industry .`
    : `?c wdt:P159 wd:${city} .`;
  const q = `SELECT DISTINCT ?label ?site WHERE {
    ${where}
    ?c rdfs:label ?label ; wdt:P856 ?site .
    FILTER(LANG(?label) = "en")
  } LIMIT ${limit}`;
  const url = "https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(q);
  const r = await fetch(url, { headers: { "User-Agent": AGENT, Accept: "application/sparql-results+json" } });
  if (!r.ok) throw new Error("Wikidata HTTP " + r.status);
  const d = await r.json();
  return (d.results.bindings || []).map((b) => ({
    name: b.label.value,
    site: (b.site && b.site.value) || "",
  }));
}

function fromAFile(path) {
  return readFileSync(path, "utf8").split("\n")
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => ({ name: l, site: l.includes(".") ? "https://" + l.replace(/^https?:\/\//, "") : "" }));
}

// ------------------------------------------------- the identifiers to try

// "Thought Machine Group Ltd" gives thoughtmachine, thought-machine. The
// legal forms are stripped first: no ATS carries them, and keeping them
// doubles the number of requests for nothing.
const LEGAL_FORMS = /\b(ltd|limited|plc|llp|llc|inc|incorporated|holdings?|group|company|corp|corporation|sa|sas|gmbh|bv|nv|ag)\b/g;

function identifiers({ name, site }) {
  const out = [];
  const add = (s) => {
    const v = String(s || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (v.length >= 2 && v.length <= 40 && !out.includes(v)) out.push(v);
  };
  if (site) {
    try {
      // octopus.energy gives octopus; www.thoughtmachine.net gives
      // thoughtmachine. The first label of the domain is the identifier that
      // is right most often, because it is the name the company bought.
      const h = new URL(site).hostname.replace(/^www\./, "");
      add(h.split(".")[0]);
    } catch { /* a malformed site in Wikidata must not stop the run */ }
  }
  const clean = name.toLowerCase().replace(/\(.*?\)/g, " ").replace(LEGAL_FORMS, " ").trim();
  add(clean.replace(/[^a-z0-9]/g, ""));
  add(clean.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  return out.slice(0, 3);
}

async function postsOf(slug, ats) {
  try {
    const r = await fetch(ATS[ats].url(slug), {
      headers: { Accept: "application/json", "User-Agent": AGENT },
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) return [];
    return ATS[ats].read(await r.json());
  } catch { return []; }
}

// A board that answered is not yet a board of ours: at least one open job
// must be in the market we are looking for. That is what tells the BBC apart
// from `bbc.recruitee.com`, which is Belgian. See lib/ats.js.
let outOfMarket = 0;
function kept(posts) {
  if (!posts.length) return false;
  if (posts.some((p) => inTheMarket(p.location, market))) return true;
  outOfMarket += 1;
  return false;
}

// A slug/ATS pair taken from a URL: there is nothing to guess, one request is
// enough, and the market filter stays the same.
async function knownBoard({ slug, ats }) {
  const posts = await postsOf(slug, ats);
  return kept(posts) ? { slug, ats, count: posts.length, how: "link", posts } : null;
}

async function byName(company) {
  for (const slug of identifiers(company)) {
    for (const ats of ATS_NAMES) {
      const posts = await postsOf(slug, ats);
      if (kept(posts)) return { slug, ats, count: posts.length, how: "name", posts };
    }
  }
  return null;
}

// WHOSE BOARD IS THIS: THE BOARD ITSELF SAYS SO
//
// Wikidata returns the article, not the employer: "BBC Radio 2" for the BBC,
// "Eon Productions" for E.ON, "Photobox" for what is now called Storio group.
// A wrong name on a job card is worse than a missing card: the person clicks
// and finds a different employer, on a product whose whole promise is
// credibility.
//
// All six ATSs declare the employer, measured on 6 October 2026: Greenhouse
// on /v1/boards/<slug>, Recruitee on every job, and the other four in the
// title of the board page ("ClearBank Jobs", "Storio group", "Jobs at ECFR").
//
// THAT IS ALSO THE PROOF OF OWNERSHIP, AND ITS REAL JOB
//
// `lloydsbank.jobs.personio.com` and `arsenalfc.jobs.personio.com` both
// return "Jobs at " with an empty name, and the first posts an SEO role and a
// social media internship. That is not Lloyds Bank. An ATS identifier is
// global and short, and it gets shared. Hence the rule: a board that cannot
// say whose it is does not enter the registry.
const TITLES = {
  ashby: [(slug) => "https://jobs.ashbyhq.com/" + slug, /<title>\s*([^<]*?)\s*(?:Jobs|Careers)?\s*<\/title>/i],
  lever: [(slug) => "https://jobs.lever.co/" + slug, /<title>\s*([^<]*?)\s*<\/title>/i],
  personio: [(slug) => "https://" + slug + ".jobs.personio.com/", /<title>\s*(?:Jobs at\s*)?([^<]*?)\s*<\/title>/i],
  teamtailor: [(slug) => "https://" + slug + ".teamtailor.com/jobs", /<title>\s*([^<|]*?)\s*(?:\||<\/title>)/i],
};

async function boardName(slug, ats, posts) {
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
    } catch { /* a silent board is refused by the caller */ }
    return "";
  }
  if (ats === "recruitee") {
    const p = (posts || []).find((x) => x.company);
    return p ? String(p.company).trim() : "";
  }
  const def = TITLES[ats];
  if (!def) return "";
  const html = await page(def[0](slug));
  const m = html && html.match(def[1]);
  const name = m ? m[1].trim() : "";
  // "Jobs", "Careers", "Job Board": the ATS template with no employer in it.
  if (!name || /^(jobs?|careers?|job board|openings?)$/i.test(name)) return "";
  return name;
}

// ------------------------------------------------- the careers page, failing that

const LINK_PATTERNS = [
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
    // A careers page rarely exceeds 400 kB of HTML, and one that does is a
    // JavaScript bundle where the link will not be either.
    return (await r.text()).slice(0, 400_000);
  } catch { return ""; }
}

function atsLink(html) {
  for (const [re, ats] of LINK_PATTERNS) {
    const m = html.match(re);
    if (m) return { slug: m[1].toLowerCase(), ats };
  }
  return null;
}

function careersLinks(html, base) {
  const out = new Set();
  for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    if (!/care|job|vacanc|recruit|emploi|join-us|werken/i.test(m[1])) continue;
    try { out.add(new URL(m[1], base).href); } catch { /* broken relative href */ }
    if (out.size >= 5) break;
  }
  return [...out];
}

// Measured on twelve London companies: 3 out of 12, because many careers
// pages load their board in JavaScript and a fetch sees nothing of it. It
// stays because it finds different companies from the guesser: it catches
// octopus.energy, whose Lever board is octoenergy, while the guesser catches
// Monzo, whose careers page is an app but whose board really is called monzo.
async function byCareersPage({ site }) {
  if (!site) return null;
  const html = await page(site);
  if (!html) return null;
  let found = atsLink(html);
  if (!found) {
    for (const link of careersLinks(html, site)) {
      found = atsLink(await page(link));
      if (found) break;
    }
  }
  if (!found) return null;
  // The link can be dead or point at an empty board: we check against the API
  // before writing, exactly as for a guessed name. The market is required here
  // too, even though the careers page already proves ownership: a board with
  // no job in the market would return nothing to the search.
  const posts = await postsOf(found.slug, found.ats);
  return kept(posts) ? { ...found, count: posts.length, how: "page", posts } : null;
}

// --------------------------------------------------------------------- the run

const companies = fromHackerNews
  ? await fromHn()
  : fromAggregator ? await fromAggregators()
  : file ? fromAFile(file) : await fromWikidata();

const known = new Set(BOARDS.map((b) => b.slug));
const toTry = companies.filter((e) => (e.slug
  ? !known.has(e.slug)
  : !identifiers(e).some((s) => known.has(s))));
console.log(companies.length + " companies, " + toTry.length + " to try");

// Sixteen in flight: past that Greenhouse answers 429 and we lose companies
// that exist. A company with no known ATS makes up to eighteen JSON requests,
// so sixteen in flight already means a hundred requests a second.
const IN_FLIGHT = 16;
const found = [];
let i = 0, done = 0, unnamed = 0;

async function worker() {
  while (i < toTry.length) {
    const e = toTry[i++];
    // A candidate that came from a link already carries its ATS: one request
    // is enough. A candidate from a list of names carries nothing, and has to
    // be guessed.
    const hit = e.slug && e.ats
      ? await knownBoard(e)
      : (await byName(e)) || (await byCareersPage(e));
    done += 1;
    if (hit && !known.has(hit.slug)) {
      known.add(hit.slug);
      // The name comes from the board, never from the starting list: with no
      // declared name we do not know whose board this is, and it stays out.
      const name = await boardName(hit.slug, hit.ats, hit.posts);
      if (!name) { unnamed += 1; known.delete(hit.slug); continue; }
      found.push({ ...hit, name });
      console.log("  + " + hit.slug.padEnd(26) + hit.ats.padEnd(12)
        + String(hit.count).padStart(4) + " jobs  " + hit.how + "  (" + name + ")");
    }
    if (done % 100 === 0) console.log("    " + done + "/" + toTry.length + ", " + found.length + " found");
  }
}
await Promise.all(Array.from({ length: IN_FLIGHT }, worker));

const jobs = found.reduce((s, t) => s + t.count, 0);
const byHow = { name: 0, page: 0, link: 0 };
for (const t of found) byHow[t.how] = (byHow[t.how] || 0) + 1;
console.log("\n" + found.length + " boards out of " + toTry.length + " tried ("
  + Math.round((found.length / Math.max(1, toTry.length)) * 100) + " %), " + jobs + " jobs");
console.log(byHow.link + " from a collected link, " + byHow.name + " from a guessed name, "
  + byHow.page + " from a careers page");
console.log(outOfMarket + " boards dropped: they answered, with no job in " + market);
console.log(unnamed + " boards dropped: they do not say whose they are");

if (!write) {
  console.log("\nNothing was written. Run again with --write.");
  process.exit(0);
}

const path = new URL("../lib/boards.js", import.meta.url).pathname;
const source = readFileSync(path, "utf8");
const anchor = "];\n\nexport function boardsByAts";
if (!source.includes(anchor)) {
  console.error("lib/boards.js no longer has the expected shape: nothing is written.");
  process.exit(1);
}
found.sort((a, b) => b.count - a.count);
const lines = found.map((t) => '  { slug: "' + t.slug + '", ats: "' + t.ats
  + '", name: ' + JSON.stringify(t.name) + ', market: "' + market + '" },').join("\n");
writeFileSync(path, source.replace(anchor, lines + "\n" + anchor));
console.log(found.length + " lines added to lib/boards.js.");
