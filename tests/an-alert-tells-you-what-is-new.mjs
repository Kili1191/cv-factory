// AN ALERT THAT REPEATS ITSELF IS UNSUBSCRIBED FROM
//
// Every job site has alerts and this product has none, which is the one piece
// of table stakes it is missing outright. The part worth getting right is not
// the sending: it is deciding what counts as new. An alert that repeats what
// the person already saw is switched off inside a week, and one that misses
// the job they wanted is worse, because nothing on screen says it happened.
//
// This suite holds the three ways that decision goes wrong: the first run
// that dumps the whole search, the capped memory that resurrects a job from
// months ago, and a digest whose number cannot be told apart from a failure.

import { whatIsNew, digestSummary, jobId, NO_WATCH, SEEN_MAX } from "../lib/digest.js";

const NOW = Date.parse("2026-10-06T12:00:00Z");
const DAY = 86400000;
const job = (id, source, daysOld) => ({
  id, source, title: "Account Manager", company: "Acme " + id,
  url: "https://example.invalid/" + id, description: "A role.",
  created: daysOld === null ? "" : new Date(NOW - daysOld * DAY).toISOString(),
});

export async function run() {
  const failures = [];

  // --- 1. THE FIRST RUN ARMS THE WATCH AND REPORTS NOTHING --------------
  //
  // Every job is unseen on the first run, so a literal reading sends fifty.
  // Fifty is not a digest, it is the search results with a stamp on them, and
  // it teaches the person this message is noise before the second one lands.
  const fifty = Array.from({ length: 50 }, (_, i) => job("j" + i, "ats", 1));
  const first = whatIsNew(fifty, { ...NO_WATCH, id: "w1" }, NOW);
  if (first.fresh.length !== 0) {
    failures.push("the first run reports " + first.fresh.length + " jobs. The person has"
      + " just run that search by hand: every one of them is something they have"
      + " already seen, and the first message teaches them to ignore the rest.");
  }
  if (first.armed) failures.push("a watch that has never run reports itself as armed.");
  if (first.watch.seen.length !== 50) {
    failures.push("the first run remembered " + first.watch.seen.length + " of 50 jobs, so"
      + " the second run would report what the first one already looked at.");
  }
  if (!(first.watch.lastRunAt > 0)) failures.push("the first run does not arm the watch.");

  // --- 2. THE SECOND RUN REPORTS ONLY WHAT ARRIVED ----------------------
  const armed = first.watch;
  const later = NOW + 2 * DAY;
  const second = whatIsNew(
    [...fifty, job("new1", "ats", 0), job("new2", "Adzuna", 0)], armed, later);
  if (second.fresh.length !== 2) {
    failures.push("the second run reports " + second.fresh.length + " jobs instead of the 2"
      + " that are actually new.");
  }
  if (second.looked !== 52) failures.push("the run says it looked at " + second.looked + " of 52.");
  if (!second.fresh.every((j) => ["new1", "new2"].includes(j.id))) {
    failures.push("the second run reports a job the first one already showed.");
  }

  // Nothing arriving means nothing reported, and the run still moves on.
  const quiet = whatIsNew(fifty, second.watch, later + DAY);
  if (quiet.fresh.length !== 0) failures.push("a quiet day reports " + quiet.fresh.length + " jobs.");

  // --- 3. A CAPPED MEMORY MUST NOT RESURRECT AN OLD JOB -----------------
  //
  // The seen list keeps the most recent thousand. Once it trims, a job the
  // person saw months ago is no longer in it. Without a date guard it comes
  // back as new, and the digest fills with jobs they already rejected.
  const forgotten = job("ancient", "ats", 200);
  const tiny = { ...NO_WATCH, id: "w2", seen: [], lastRunAt: NOW - 30 * DAY };
  const r = whatIsNew([forgotten, job("today", "ats", 0)], tiny, NOW);
  if (r.fresh.some((j) => j.id === "ancient")) {
    failures.push("a job posted 200 days ago is reported as new because the memory no"
      + " longer holds it. A posting older than the watch was never new.");
  }
  if (!r.fresh.some((j) => j.id === "today")) {
    failures.push("the date guard swallowed a job posted today.");
  }

  // A job with no date keeps the benefit of the doubt: half of aggregated ads
  // carry none, and dropping them would empty the digest in silence.
  const silent = whatIsNew([job("nodate", "Reed", null)], tiny, NOW);
  if (!silent.fresh.some((j) => j.id === "nodate")) {
    failures.push("an ad with no date is dropped from the digest: half of aggregated ads"
      + " have none, so the digest would quietly lose most of its sources.");
  }
  if (silent.undated !== 1) {
    failures.push("the count of undated jobs in the digest is " + silent.undated
      + " instead of 1, so the screen cannot say what it could not place.");
  }

  // The memory stays bounded whatever happens, or it grows until the
  // browser refuses to store it and the whole watch is lost.
  const many = Array.from({ length: SEEN_MAX + 400 }, (_, i) => job("m" + i, "ats", 1));
  const big = whatIsNew(many, { ...NO_WATCH, id: "w3", lastRunAt: NOW - DAY }, NOW);
  if (big.watch.seen.length > SEEN_MAX) {
    failures.push("the memory grew to " + big.watch.seen.length + ", past its cap of "
      + SEEN_MAX + ": it would grow until storage refuses it and the watch is lost.");
  }

  // --- 4. THE DIGEST SAYS WHAT IT LOOKED AT ------------------------------
  //
  // "Nothing new" after reading 265 boards is a fact. "Nothing new" because
  // the search broke is a failure, and the two read the same from the number
  // alone. Same reason the search prints how many boards it read.
  const none = digestSummary(quiet, "en");
  if (!/\d+/.test(none) || !/nothing new/i.test(none)) {
    failures.push("a quiet digest reads \"" + none + "\": it has to say how many jobs it"
      + " looked at, or a broken search and a quiet week read the same.");
  }
  const some = digestSummary(second, "en");
  if (!/2 new jobs/.test(some) || !/52/.test(some)) {
    failures.push("a digest with results reads \"" + some + "\" instead of naming both the"
      + " new jobs and what was looked at.");
  }
  // The first message explains itself rather than looking like an empty one.
  const armedMsg = digestSummary(first, "en");
  if (/nothing new/i.test(armedMsg)) {
    failures.push("the first message reads like an empty digest instead of saying the"
      + " watch starts from now.");
  }
  for (const [loc, res] of [["fr", second], ["fr", quiet], ["fr", first]]) {
    const line = digestSummary(res, loc);
    if (/new job|nothing new|Watching from now/i.test(line)) {
      failures.push("the French digest is in English: \"" + line + "\"");
    }
  }

  // An identifier has to survive a source that gives none, or two jobs from
  // two sources collapse into one and one of them is never reported.
  if (jobId({ source: "ats", url: "https://x.invalid/1" }) === jobId({ source: "Adzuna", url: "https://x.invalid/1" })) {
    failures.push("the same posting at two sources gets one identifier: one of the two"
      + " would never be reported.");
  }

  if (!failures.length) {
    console.log("      the first run arms and says nothing, the second reports only what"
      + " arrived, a forgotten old job does not come back, and the digest says what it"
      + " looked at");
  }
  return failures;
}
