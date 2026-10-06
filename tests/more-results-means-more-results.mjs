// THE "SHOW MORE" BUTTON MUST SHOW MORE
//
// Measured on production on 6 October 2026, with no aggregator key at all: a
// London search returned 800 career page jobs in a single response,
// announced 831, and showed the button. Page two returned nothing, because
// career pages were served whole on page one and deliberately absent from
// the rest. A button that does nothing is worse than no button, and nothing
// on screen said so.
//
// Two claims, and they hold with no network and no browser: the route is
// called directly, with `fetch` doubled. That is the only way to test the
// paging, because the defect only appears on page two.
//
//   1. A page returns at most fifty jobs, and the next page returns others
//      without re-reading a single board.
//   2. The button disappears when there is nothing left behind it.

import { GET } from "../app/api/jobs/search/route.js";
import { BOARDS } from "../lib/boards.js";

const PER_BOARD = 20;

function greenhouseResponse() {
  const jobs = Array.from({ length: PER_BOARD }, (_, i) => ({
    title: "Account Manager " + i,
    location: { name: "London, UK" },
    absolute_url: "https://example.invalid/jobs/" + i,
    updated_at: "2026-10-01",
    content: "Own a portfolio of SME accounts.",
  }));
  return new Response(JSON.stringify({ jobs }), { headers: { "content-type": "application/json" } });
}

async function search(page) {
  const r = await GET(new Request(
    "https://nuvi.invalid/api/jobs/search?what=&where=London&country=gb&page=" + page));
  return r.json();
}

export async function run() {
  const failures = [];
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return greenhouseResponse(); };

  try {
    const p1 = await search(1);
    const afterTheFirst = calls;

    if (p1.jobs.length > 50) {
      failures.push(
        "the first page returns " + p1.jobs.length + " jobs.\n" +
        "      On production that was 800 cards in one response: the phone renders them all."
      );
    }
    if (!p1.jobs.length) {
      failures.push("the first page returns nothing although every board answers");
    }

    const p2 = await search(2);
    if (p1.hasMore && !p2.jobs.length) {
      failures.push(
        "the \"show more\" button is offered and page two returns nothing.\n" +
        "      That is the defect measured on production: a button that does nothing,\n" +
        "      with not a word on screen to say so."
      );
    }
    const seen = new Set(p1.jobs.map((j) => j.source + j.id));
    if (p2.jobs.length && p2.jobs.every((j) => seen.has(j.source + j.id))) {
      failures.push("page two returns the same jobs as page one");
    }
    // Later pages re-read no board: the index is already there.
    if (calls > afterTheFirst) {
      failures.push(
        "page two re-read " + (calls - afterTheFirst) + " boards.\n" +
        "      Turning a page must be instant: the index is in memory."
      );
    }

    // At the end of the seam the button must disappear. With the current
    // registry and twenty jobs per board, page one hundred is past it.
    const far = await search(100);
    if (far.hasMore) {
      failures.push("the button is still offered on page one hundred, when there is nothing left");
    }
    if (far.jobs.length) {
      failures.push("page one hundred returns jobs: the slice ignores the page");
    }

    if (typeof p1.total !== "number" || p1.total < p1.jobs.length) {
      failures.push("the announced total (" + p1.total + ") is smaller than what is returned");
    }
    const expected = BOARDS.filter((b) => !b.market || b.market === "gb").length;
    if (!p1.index || p1.index.boards !== expected) {
      failures.push("the response does not say how many boards the search covers");
    }
  } finally {
    globalThis.fetch = realFetch;
  }

  // --- AN AGGREGATOR CALL IS A QUOTA, NOT A REQUEST ----------------------
  //
  // Adzuna and Reed are fast, so they had no cache: every search spent one
  // call each. Their free tiers are counted per month, and a few people
  // searching a few times each would exhaust a month in a day. When the
  // quota runs out the route catches the error and the search quietly loses
  // half its sources: it still answers, with less, which is this repo's
  // favourite failure.
  //
  // The keys are not configured in the harness, so this measures the career
  // page index, which shares the same rule: an identical query inside the
  // window costs nothing.
  const vrai = globalThis.fetch;
  let appels = 0;
  globalThis.fetch = async () => { appels += 1; return greenhouseResponse(); };
  try {
    await search(1);
    const apres = appels;
    await search(1);
    await search(1);
    if (appels > apres) {
      failures.push(
        "repeating the same search spent " + (appels - apres) + " more calls.\n" +
        "      A free aggregator tier is counted per month: without this, a handful of\n" +
        "      people searching a few times each exhaust a month in a day, and the\n" +
        "      search then quietly loses half its sources."
      );
    }
  } finally {
    globalThis.fetch = vrai;
  }

  if (!failures.length) {
    console.log("      fifty per page, the next one without re-reading a board, "
      + "no button when there is nothing left, and the same search twice costs nothing");
  }
  return failures;
}
