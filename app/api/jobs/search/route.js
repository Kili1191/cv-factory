// Job search, server side.
//
// The source keys are secrets: they must never reach the browser. This route
// queries every configured source in parallel and returns a single list,
// identical in shape whatever it came from.
//
// A source that is not configured is simply absent. A source that is down is
// reported without stopping the others from answering: twenty jobs and a
// warning beat nothing at all.

import {
  franceTravailConfigured, franceTravailToken, franceTravailParse,
  adzunaConfigured, adzunaUrl, adzunaParse,
  reedConfigured, reedUrl, reedAuthHeader, reedParse,
  availableSources, totalAtTheSource, keysTheServerCanSee,
} from "../../../../lib/jobSources.js";
import { readABoard, normalise, locationMatches, titleMatches } from "../../../../lib/ats.js";
import { passesFilters, countTheUndecided, activeFilters } from "../../../../lib/jobFilters.js";
import { filtersFromParams } from "../../../../lib/searchFromASentence.js";
import { boardsForMarket, companyName } from "../../../../lib/boards.js";

export const maxDuration = 30;

// CAREER BOARDS ARE A SOURCE THAT ASKS FOR NO KEY
//
// The three sources above are aggregators: they publish what companies pay
// them to publish, and an ad there collects two hundred applications within
// the hour. The ATSs serve the company's own careers page, as public JSON.
// That is where the jobs nobody sees are, and it is free.
//
// WHY AN INDEX AND NO LONGER A CACHE
//
// The first version read all fifty boards whenever the cache expired, ten in
// flight, and fitted inside the function's thirty seconds. It does not fit
// at five hundred: fifty serial passes overrun the deadline and the search
// returns an empty list, which reads as "no jobs" rather than as a failure.
// And the registry has to grow to thousands of lines; that is the whole
// point of it.
//
// So the opposite: every search serves the whole index, and takes the
// opportunity to refresh the stalest boards within a fixed time budget. The
// cost per search is bounded whatever the registry's size, and the index
// fills over a few searches instead of one very slow one. A search therefore
// never returns less than what the instance already knows.
const FRESH_FOR_MS = 30 * 60 * 1000;

// THE BUDGET IS MEASURED, NOT CHOSEN
//
// On 6 October 2026, against the real ATSs: at twelve requests in flight,
// 30 ms per board over a sample of sixty; at twenty-four, 16 ms; at forty,
// 14 ms, and no silent board in any of the three. Past forty the gain
// disappears and the risk of a 429 from Greenhouse remains.
//
// But the sample lied: the full 266 lines take 8.8 s at twenty-four, not the
// 4.2 s the extrapolation promised, because the big boards are slow and they
// are not spread evenly. So the budget is twelve seconds, measured on the
// whole registry and not on a slice of it. It is paid once per instance per
// half hour; later searches read the index and cost nothing.
//
// When the registry outgrows what twelve seconds cover, the index will fill
// over two searches instead of one, and the screen will say so. The real
// remedy is the shared store, which needs the Supabase service key.
const BUDGET_MS = 12_000;
const IN_FLIGHT = 24;

// slug -> { read, posts }. In instance memory, like the counter in
// middleware.js: enough that someone searching three times in a row pays
// once, not a shared index. The shared store comes with the daily refresh,
// which needs the Supabase service key.
const index = new Map();

async function refreshTheIndex(boards, warnings) {
  const t0 = Date.now();
  // Never read first, then the stalest: cold, the index fills; warm, it
  // rotates.
  const queue = boards
    .map((b) => ({ b, read: (index.get(b.slug) || { read: 0 }).read }))
    .filter((x) => Date.now() - x.read > FRESH_FOR_MS)
    .sort((x, y) => x.read - y.read);

  const silent = [];
  let i = 0;
  async function worker() {
    while (i < queue.length && Date.now() - t0 < BUDGET_MS) {
      const { b } = queue[i++];
      const r = await readABoard(b.slug, b.ats);
      if (r.error) {
        // A silent board is recorded as read: without that it stays at the
        // head of the queue and steals the turn of a board that answers, on
        // every single search.
        index.set(b.slug, { read: Date.now(), posts: [] });
        silent.push(b.slug);
        continue;
      }
      index.set(b.slug, {
        read: Date.now(),
        posts: r.posts.map((p) => normalise(p, companyName(b.slug), "ats")),
      });
    }
  }
  await Promise.all(Array.from({ length: IN_FLIGHT }, worker));
  if (silent.length) warnings.push(silent.length + " career pages did not answer");
  return queue.length - i;
}

// AN AGGREGATOR CALL IS A QUOTA, NOT A REQUEST
//
// The career page index exists because reading 266 boards is slow. The
// aggregators are fast, so they had no cache at all: every search spent one
// Adzuna call and one Reed call. Their free tiers are counted per month, and
// a handful of people searching a few times each would exhaust a month in a
// day. When the quota runs out the route catches the error and the search
// quietly loses half its sources, which is the failure this repo keeps
// finding: it still answers, with less.
//
// So the same answer as the boards, bounded: an identical query inside the
// window is served from memory. Thirty minutes, because an ad posted this
// morning is still findable this morning, and the cap keeps a bot typing
// random words from growing the map without end.
const AGGREGATOR_FRESH_MS = 30 * 60 * 1000;
const AGGREGATOR_MAX = 200;
const aggregatorCache = new Map();

async function cached(key, fetchIt) {
  const hit = aggregatorCache.get(key);
  if (hit && Date.now() - hit.at < AGGREGATOR_FRESH_MS) return hit.value;
  const value = await fetchIt();
  // The oldest entry goes first. A Map keeps insertion order, so the first
  // key it yields is the oldest written.
  if (aggregatorCache.size >= AGGREGATOR_MAX) {
    aggregatorCache.delete(aggregatorCache.keys().next().value);
  }
  aggregatorCache.set(key, { at: Date.now(), value });
  return value;
}

function postsFromTheIndex(boards) {
  const out = [];
  for (const b of boards) {
    const e = index.get(b.slug);
    if (e) out.push(...e.posts);
  }
  return out;
}

export async function GET(request) {
  const url = new URL(request.url);
  const what = url.searchParams.get("what") || "";
  const where = url.searchParams.get("where") || "";
  const country = url.searchParams.get("country") || "fr";
  // The page is what opens the seam. Without it the search is capped at the
  // first handful of results whatever lies behind them.
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);

  // THE REQUIREMENTS YOU CANNOT ASK THE SOURCE FOR
  //
  // `what` and `where` go to the aggregator, which knows how to read them.
  // The rest, "the ad requires French", "no contract work", "posted this
  // week", no aggregator can filter on: it is read from the prose of the ad.
  // So we do it here, on what the sources return, and that is precisely what
  // a job site cannot do.
  const filters = filtersFromParams(url.searchParams);
  const active = activeFilters(filters);
  const keep = (j) => (active.length ? passesFilters(j, filters) : true);

  const env = process.env;

  // Career pages need no key, so this source always exists: the search never
  // returns "not configured" again.
  const sources = [...availableSources(env), "career pages"];

  // ASKING WHICH SOURCES EXIST IS NOT ASKING FOR JOBS
  //
  // /diagnostic only ever reads `sources`, `configured` and `keys`. It was
  // getting them by running a whole search, which since the budget went to
  // twelve seconds means the setup page sits blank for twelve seconds before
  // point 8 says anything, on the one page whose entire job is to tell you
  // quickly what is wrong. A suite caught it first, by reading the page after
  // six seconds and finding nothing, which is what a person would have found
  // too.
  if (url.searchParams.get("only") === "sources") {
    return Response.json({
      configured: true, sources, keys: keysTheServerCanSee(env),
      jobs: [], warnings: [], total: 0, totalExact: true, page: 1,
      hasMore: false, filters: [], undecided: {},
      index: { boards: boardsForMarket(country).length, read: 0, pending: 0 },
    });
  }
  const warnings = [];
  const tasks = [];
  // The total each aggregator declares, so the screen can say "50 of 64,000"
  // instead of "50". Aggregators are counted apart from career pages,
  // because they alone paginate at the source.
  let aggregatorTotal = 0;
  let boardTotal = 0;

  if (franceTravailConfigured(env)) {
    tasks.push((async () => {
      try {
        const token = await franceTravailToken(env);
        const debut = (page - 1) * 50;
        const params = new URLSearchParams({ range: debut + "-" + (debut + 49) });
        if (what) params.set("motsCles", what);
        if (where) params.set("commune", where);
        const data = await cached("ft|" + what + "|" + where + "|" + page, async () => {
          const res = await fetch(
            `https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?${params}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          // 204 means "no results", it is not an error.
          if (res.status === 204) return null;
          if (!res.ok) throw new Error(`${res.status}`);
          return res.json();
        });
        if (data === null) return [];
        aggregatorTotal += totalAtTheSource(data);
        return franceTravailParse(data).filter(keep);
      } catch (err) {
        warnings.push(`France Travail indisponible (${err.message})`);
        return [];
      }
    })());
  }

  if (adzunaConfigured(env)) {
    tasks.push((async () => {
      try {
        const key = "adzuna|" + country + "|" + what + "|" + where + "|" + page
          + "|" + filters.salaryFrom + "|" + filters.postedWithin + "|" + filters.contract;
        const data = await cached(key, async () => {
          const res = await fetch(adzunaUrl(env, { what, where, country, page, filters }));
          if (!res.ok) throw new Error(`${res.status}`);
          return res.json();
        });
        aggregatorTotal += totalAtTheSource(data);
        return adzunaParse(data).filter(keep);
      } catch (err) {
        warnings.push(`Adzuna indisponible (${err.message})`);
        return [];
      }
    })());
  }

  if (reedConfigured(env)) {
    tasks.push((async () => {
      try {
        const data = await cached("reed|" + what + "|" + where + "|" + page, async () => {
          const res = await fetch(reedUrl({ what, where, page }), {
            headers: { Authorization: reedAuthHeader(env) },
          });
          if (!res.ok) throw new Error(`${res.status}`);
          return res.json();
        });
        aggregatorTotal += totalAtTheSource(data);
        return reedParse(data).filter(keep);
      } catch (err) {
        warnings.push(`Reed indisponible (${err.message})`);
        return [];
      }
    })());
  }

  const boards = boardsForMarket(country);
  let pending = 0;
  // CAREER PAGES PAGINATE HERE, NOT AT THE SOURCE
  //
  // The index is in memory: it returns everything it has at once. On a broad
  // London search that is 800 jobs in a single response and 800 cards on
  // screen. So we slice the list into a page, and say how many are behind
  // it. The refresh only happens on page one: later pages must be instant.
  tasks.push((async () => {
    try {
      if (page === 1) pending = await refreshTheIndex(boards, warnings);
      // The filter runs BEFORE the slice: otherwise a whole page can come
      // back empty while kept jobs are waiting further down.
      const kept = postsFromTheIndex(boards)
        .filter((j) => locationMatches(j.location, where))
        .filter((j) => titleMatches(j, what))
        .filter(keep);
      boardTotal = kept.length;
      return kept.slice((page - 1) * 50, page * 50);
    } catch (err) {
      warnings.push("career pages unavailable (" + (err && err.message) + ")");
      return [];
    }
  })());

  const groups = await Promise.all(tasks);
  const jobs = groups.flat().filter(j => j.title);

  // Two sources often publish the same job. We match on title + company in
  // lower case, so as not to offer it twice.
  const seen = new Set();
  const unique = [];
  for (const job of jobs) {
    const key = `${job.title.toLowerCase()}|${job.company.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(job);
  }

  // THE STATE OF THE INDEX IS STATED, NOT GUESSED
  //
  // A short list can mean "few jobs match" or "the index has not read half
  // the registry yet". Both read the same on screen, and that is exactly the
  // silent failure this repo knows best. So the response carries the count.
  //
  // No warning for the pending part: the screen says it under the count, in
  // the person's language, and the warning frame is coral. An index that is
  // filling is not a failure.
  const indexState = {
    boards: boards.length,
    read: boards.filter((b) => index.has(b.slug)).length,
    pending,
  };

  // THE BUTTON ONLY EXISTS IF THERE IS REALLY MORE
  //
  // The first version compared the total to the current page, all counts
  // mixed together. With no aggregator key, a London search announces 831
  // career page jobs, the button appeared, and page two returned nothing:
  // career pages were served whole on page one and absent from the rest. A
  // button that does nothing is worse than no button.
  const hasMore = page * 50 < boardTotal || page * 50 < aggregatorTotal;

  // WHEN THE TOTAL STOPS DESCRIBING THE SEARCH
  //
  // Three of the six requirements are asked of the aggregator, so its count
  // describes the search that was made. The other three are not: Adzuna has
  // no parameter for the place of work, the language or the level, so when
  // one of those is set its count still describes the WIDER search, and only
  // the page we fetched has been sieved.
  //
  // Measured on production on 6 October 2026, the minute the key went live:
  // "account manager in London, remote" showed 13 jobs and announced 6798.
  // That reads as "13 of 6798 match", and it is not true. 6798 is how many
  // were found before the requirement was applied, and nobody knows how many
  // of them are remote without fetching all 6798.
  //
  // So the response says which it is, and the screen changes one word. A
  // count that cannot explain what it counted is the panel score mistake all
  // over again, and that one is written up in CLAUDE.md as settled.
  const askedLocally = ["workplace", "language", "level"].filter((k) => filters[k]);
  const totalExact = askedLocally.length === 0 || aggregatorTotal === 0;

  // WHAT A FILTER COULD NOT DECIDE IS SAID OUT LOUD
  //
  // Half of ads do not state a salary, and a floor cannot settle them: they
  // pass (lib/jobFilters.js). If the screen does not write how many they
  // are, the person believes all thirty-one shown clear their floor, and
  // opens one paying 28,000.
  const undecided = active.length ? countTheUndecided(unique, filters) : {};

  return Response.json({
    jobs: unique, sources, warnings, index: indexState, configured: true,
    page, total: boardTotal + aggregatorTotal, hasMore, totalExact,
    filters: active, undecided,
    // Booleans only, never a value. See lib/jobSources.js.
    keys: keysTheServerCanSee(env),
  });
}
