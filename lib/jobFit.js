// RANKING A LIST OF ADS BY WHAT THE PERSON'S CV ALREADY COVERS
//
// WHY THIS EXISTS, AND WHY IT IS THE ONLY ANSWER TO VOLUME
//
// The search went from 20 results to 8781 on one London query the day the
// second aggregator went live. That is not a feature yet: nobody reads 8781
// ads, and a list sorted by date is a list where the best match for THIS
// person sits at position 400. Every job site sorts by recency or by keyword
// because that is all it has. Nuvi holds the person's CV, so it can sort by
// what their own experience already covers, and no job board can copy that
// without asking for a CV it has no reason to hold.
//
// IT COSTS NOTHING, AND THE CV DOES NOT LEAVE THE DEVICE
//
// `couverture` is plain string work: no call to the model, no network. So the
// ranking runs in the browser on the list already on screen. Sending the CV
// to the route on every search would have put the person's history in a
// request, and in the route's cache key, to compute something the browser can
// do in a few milliseconds.
//
// IT MEASURES AGAINST THE CV AS IT IS, NOT AN ADAPTED ONE
//
// The panel's number is taken on the ADAPTED CV, the one that would be sent,
// and that is right there: the question is "what would the robot read in the
// document I am about to send". Here the question is the other one, "which of
// these ads fits what I have already done", and it is asked of 120 ads at
// once. Adapting 120 CVs would be 120 calls to the model for one scroll.
//
// AND AN AD THAT SAYS TOO LITTLE IS NOT A BAD MATCH
//
// `couverture` returns null under six required phrases, because a share of
// nothing stays nothing. Half of aggregated ads are a title, a salary and a
// contract type, so they cannot be measured at all. They are NOT scored zero
// and they are NOT dropped: they keep the order the source gave them, after
// the ones that could be measured, and the count of them is returned so the
// screen can say how many. Scoring them zero would bury real jobs for the
// crime of having a short ad, which is the silent loss this repo knows best.

import { couverture } from "./atsMatch.js";

// The ad as text. The title carries the trade and the level, so it belongs in
// the measurement: an ad whose title is the person's own job title is a match
// the body alone would under-read.
export function jobText(job) {
  if (!job) return "";
  return String(job.title || "") + ". \n " + String(job.description || "");
}

// A count, never a mark on its own: `present` of `demandees`. The repo settled
// this once, on the panel, and the reason holds here: a score nobody can
// explain is a score nobody should act on, so what the screen shows is what
// was counted and the percentage only ever decides the order.
export function fitOfAJob(cv, job) {
  if (!cv) return null;
  try {
    return couverture(cv, jobText(job));
  } catch {
    // A measurement that throws must never cost the person the result. The ad
    // stays in the list, unmeasured, like an ad that said too little.
    return null;
  }
}

export function rankByFit(cv, jobs) {
  const list = Array.isArray(jobs) ? jobs : [];
  if (!cv || !list.length) return { ranked: list, fits: new Map(), measured: 0, unmeasured: list.length };

  const fits = new Map();
  const keyOf = (j, i) => String((j && j.source) || "") + "|" + String((j && j.id) || i);

  const marked = list.map((job, i) => {
    const fit = fitOfAJob(cv, job);
    if (fit) fits.set(keyOf(job, i), fit);
    return { job, i, fit };
  });

  // The measured ones first, best covered first. The original index breaks
  // every tie, so two ads covering the same share keep the order the source
  // gave them rather than an order that changes between two renders.
  const ranked = marked.slice().sort((a, b) => {
    if (!a.fit && !b.fit) return a.i - b.i;
    if (!a.fit) return 1;
    if (!b.fit) return -1;
    if (b.fit.score !== a.fit.score) return b.fit.score - a.fit.score;
    return a.i - b.i;
  }).map((m) => m.job);

  const measured = marked.filter((m) => m.fit).length;
  return { ranked, fits, measured, unmeasured: list.length - measured };
}

// The key the screen uses to find a job's measurement again. Same shape as
// the one `rankByFit` wrote, because a card that cannot find its own count
// shows nothing and reads as "not measured".
export function fitKey(job, i) {
  return String((job && job.source) || "") + "|" + String((job && job.id) || i);
}
