// THE NUMBER THE PRODUCT COMPETES ON
//
// A job board's claim is inventory: Career Hound, measured on 6 October 2026,
// "8,573 people finding 4.5 million hidden jobs". Ours is 19,188 jobs across
// 282 boards, so on that axis we lose by two orders of magnitude, to an asset
// anybody can read off a public endpoint.
//
// Nobody's goal is to find job ads. So the number that belongs on this
// product is the one a listings site cannot produce: how many applications
// actually went out. This suite holds the two ways that number can lie.
//
// It calls no model and opens no browser: what is ours here is the counting.

import { throughput, bestWeek, sentAt } from "../lib/throughput.js";

const DAY = 86400000;
const NOW = Date.parse("2026-10-06T12:00:00Z");
const daysAgo = (n) => new Date(NOW - n * DAY).toISOString().slice(0, 10);

const app = (status, days, extra = {}) => ({
  id: String(Math.random()), company: "Acme", role: "Account Manager",
  status, date: daysAgo(days), created: NOW - days * DAY, ...extra,
});

export async function run() {
  const failures = [];

  // --- 1. ONLY WHAT ACTUALLY LEFT ---------------------------------------
  //
  // "prepared" is a row that exists because an ad was read and nothing was
  // sent. Counting it would turn the one honest number on the screen into a
  // count of the ads the person browsed, which is the competitor's number
  // wearing our label.
  const mixed = [
    app("applied", 1), app("applied", 2), app("interview", 3),
    app("prepared", 1), app("prepared", 2),
  ];
  const t = throughput(mixed, NOW);
  if (t.thisWeek !== 3) {
    failures.push("this week counts " + t.thisWeek + " instead of 3: a row that was"
      + " prepared and never sent is being counted as an application.");
  }
  if (t.total !== 3) failures.push("the total counts " + t.total + " instead of 3.");

  // --- 2. THE WINDOW IS A WINDOW ----------------------------------------
  const twoWeeks = [
    app("applied", 1), app("applied", 6),
    app("applied", 8), app("applied", 9), app("applied", 13),
    app("applied", 40),
  ];
  const w = throughput(twoWeeks, NOW);
  if (w.thisWeek !== 2) failures.push("this week counts " + w.thisWeek + " instead of 2");
  if (w.lastWeek !== 3) failures.push("last week counts " + w.lastWeek + " instead of 3");
  if (w.total !== 6) failures.push("the total counts " + w.total + " instead of 6: a row older"
    + " than a fortnight left the total as well as the window.");
  if (w.change !== -1) failures.push("the change reads " + w.change + " instead of -1");

  // A first week has no previous week. Showing a change against nothing
  // would invent a comparison out of an absence.
  const first = throughput([app("applied", 1), app("applied", 2)], NOW);
  if (first.change !== null) {
    failures.push("a first week reports a change of " + first.change + " against a week"
      + " that never happened.");
  }

  // --- 3. A ROW WITH NO DATE IS NOT A ROW THAT NEVER HAPPENED -----------
  //
  // Same rule as a missing salary: what cannot be placed is not discarded in
  // silence. It stays in the total, out of the window, and it is counted so
  // the screen can say so.
  const undated = { id: "x", status: "applied", company: "Acme", role: "AM" };
  const u = throughput([app("applied", 1), undated], NOW);
  if (u.total !== 2) failures.push("a dated row and an undated one total " + u.total
    + " instead of 2: the person's own work was dropped for want of a date.");
  if (u.thisWeek !== 1) failures.push("an undated row landed inside this week: it could be"
    + " from any week at all.");
  if (u.undated !== 1) failures.push("the count of undated rows is " + u.undated
    + " instead of 1, so nothing on screen can explain the gap between the two numbers.");
  if (sentAt(undated) !== null) failures.push("a row with no date is given one.");

  // The date the person sees in the tracker leads, because it is the one they
  // would correct. `created` only answers for the rows written before that
  // field existed.
  if (sentAt({ date: daysAgo(3), created: NOW - 300 * DAY }) !== Date.parse(daysAgo(3) + "T12:00:00Z")) {
    failures.push("`created` wins over the date shown in the tracker: correcting the date"
      + " by hand would change nothing.");
  }
  if (sentAt({ created: NOW - 2 * DAY }) === null) {
    failures.push("a row with only a timestamp is treated as undated.");
  }

  // --- 4. A BEST WEEK, NOT A STREAK -------------------------------------
  //
  // A streak punishes the week somebody was ill and then means nothing ever
  // again. A personal best only goes up and costs nothing to miss.
  if (bestWeek([], NOW) !== 0) failures.push("an empty list reports a best week above zero");
  const burst = [
    app("applied", 30), app("applied", 29), app("applied", 28), app("applied", 27),
    app("applied", 2), app("applied", 1),
  ];
  const best = bestWeek(burst, NOW);
  if (best !== 4) {
    failures.push("the best week is " + best + " instead of 4: the four sent inside one"
      + " week a month ago are the best week there has been.");
  }
  if (best > throughput(burst, NOW).total) {
    failures.push("the best week is larger than everything ever sent.");
  }
  if (bestWeek([app("prepared", 1), app("prepared", 2)], NOW) !== 0) {
    failures.push("rows that were never sent make a best week.");
  }

  if (!failures.length) {
    console.log("      only what left is counted, a week is a week, an undated row keeps"
      + " its place in the total, and the best week is a best and not a streak");
  }
  return failures;
}
