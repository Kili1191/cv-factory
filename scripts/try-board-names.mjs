// TRYING BOARD NAMES, ONE AT A TIME
//
//   node scripts/try-board-names.mjs my-candidates.txt
//   node scripts/try-board-names.mjs my-candidates.txt --write
//
// One name per line, written the way a company would write it in a URL:
// "monzo", "gocardless", "signal-ai". Each is tried against the six ATSs,
// and only what answers with at least one job is kept.
//
// This is the small tool. `find-job-boards.mjs` is the one that builds its
// own candidate list, verifies the market and reads the employer's name off
// the board; prefer it. This one stays because handing it twenty names you
// have in mind is still the fastest way to check a hunch.
//
// WHY A SCRIPT AND NOT A HAND-WRITTEN LIST
//
// Because the list is the product. Reading a job board is trivial, knowing
// it exists is not, and that is the only part of this feature that costs a
// competitor any time. A tool that grows it beats a list you copy out.
//
// Nothing is guessed: a line written is a line that answered. The hit rate
// observed on plausible names is about forty percent, so offer plenty.

import { readFileSync, writeFileSync } from "node:fs";
import { ATS, ATS_NAMES } from "../lib/ats.js";
import { BOARDS } from "../lib/boards.js";

const file = process.argv[2];
const write = process.argv.includes("--write");
if (!file) {
  console.error("usage: node scripts/try-board-names.mjs <file> [--write]");
  process.exit(2);
}

const candidates = readFileSync(file, "utf8")
  .split("\n").map((l) => l.trim().toLowerCase())
  .filter((l) => l && !l.startsWith("#"));

const known = new Set(BOARDS.map((b) => b.slug));
const toTry = candidates.filter((c) => !known.has(c));
console.log(toTry.length + " names to try (" + (candidates.length - toTry.length) + " already known)");

async function count(slug, ats) {
  try {
    const r = await fetch(ATS[ats].url(slug), {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; Nuvi)" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) return 0;
    return ATS[ats].read(await r.json()).length;
  } catch { return 0; }
}

// Twenty-four requests in flight: past that Workable and Recruitee answer
// 429 and we lose companies that exist.
const IN_FLIGHT = 24;
const found = [];
let i = 0;
async function worker() {
  while (i < toTry.length) {
    const slug = toTry[i++];
    let best = null;
    for (const ats of ATS_NAMES) {
      const n = await count(slug, ats);
      if (n > 0 && (!best || n > best.n)) best = { ats, n };
    }
    if (best) {
      found.push({ slug, ats: best.ats, name: slug, jobs: best.n });
      console.log("  + " + slug + "  " + best.ats + "  " + best.n + " jobs");
    }
  }
}
await Promise.all(Array.from({ length: IN_FLIGHT }, worker));

found.sort((a, b) => b.jobs - a.jobs);
console.log("\n" + found.length + " boards found out of " + toTry.length + " tried, "
  + found.reduce((s, t) => s + t.jobs, 0) + " jobs");

if (!write) {
  console.log("\nNothing was written. Run again with --write to add them to lib/boards.js.");
  process.exit(0);
}

// We add before the end of the array, without touching what is already
// there: the readable name of existing companies has often been corrected by
// hand, and a full regeneration would lose it.
const path = new URL("../lib/boards.js", import.meta.url).pathname;
const source = readFileSync(path, "utf8");
const lines = found.map((t) =>
  '  { slug: "' + t.slug + '", ats: "' + t.ats + '", name: "' + t.name + '" },').join("\n");
const anchor = "];\n\nexport function boardsByAts";
if (!source.includes(anchor)) {
  console.error("lib/boards.js no longer has the expected shape: nothing is written.");
  process.exit(1);
}
writeFileSync(path, source.replace(anchor, lines + "\n" + anchor));
console.log(found.length + " lines added to lib/boards.js.");
