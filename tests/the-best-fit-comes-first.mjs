// THE BEST MATCH FOR THIS PERSON COMES FIRST, AND THE REST IS NOT BURIED
//
// WHAT THIS SUITE IS ABOUT
//
// The search returns thousands of ads. Sorting them by what the person's own
// CV already covers is the one thing a job board cannot do, and it is also
// the one place where a measurement can quietly throw a real job away: an ad
// that says too little to be measured must not come out as a bad match.
//
// So this file holds two assertions that pull in opposite directions: the ad
// that fits really does come first, AND the ad that could not be measured is
// still in the list, still in the order its source gave it, and counted so
// the screen can say how many there are.
//
// It calls no model. What is ours is the ranking, not the reading of the ad,
// and `couverture` has its own test.

import { rankByFit, fitOfAJob, jobText, fitKey } from "../lib/jobFit.js";

const CV = {
  name: "Camille Marchetti", title: "Account Manager",
  summary: "Account manager with seven years in SaaS, managing enterprise renewals and upsell.",
  experience: [{
    title: "Account Manager", company: "Northwind", period: "2021 - 2026",
    bullets: [
      "Owned a portfolio of enterprise accounts worth 3.2m in annual recurring revenue.",
      "Led renewals and upsell, lifting net revenue retention from 94 to 109 per cent.",
      "Ran quarterly business reviews with senior stakeholders.",
      "Forecast in Salesforce every week.",
    ],
  }],
  skills: ["Salesforce", "HubSpot", "renewals", "upsell", "forecasting"],
};

const ad = (id, source, title, description) => ({ id, source, title, description });

// The same trade as the CV, written the way the ad writes it.
const MATCHES = ad("fit", "ats", "Account Manager",
  "You will own a portfolio of enterprise accounts, lead renewals and upsell, run "
  + "quarterly business reviews with senior stakeholders, and forecast in Salesforce. "
  + "Net revenue retention is the number we care about.");

// A real job in another world: it has to be measured, and to end up below.
const DOES_NOT_MATCH = ad("far", "ats", "Warehouse Operative",
  "Picking and packing in our Enfield depot. Forklift licence required. Early starts, "
  + "manual handling, pallet wrapping and stock counts. Comfortable on your feet all "
  + "day in a cold store environment.");

// An aggregator's furniture: a title, a salary, a contract type. Nothing to
// measure, and exactly the ad a score of zero would make disappear.
const TOO_THIN = ad("thin", "Adzuna", "Account Manager", "45000 GBP. Permanent. Apply now.");

export async function run() {
  const failures = [];

  // --- 1. WHAT FITS COMES FIRST ----------------------------------------
  // THE ORDER OF THIS FIXTURE IS THE TEST
  //
  // The warehouse ad is measured and covers 0%, so it is the one case that
  // tells "the unmeasurable go last" apart from "the unmeasurable are scored
  // zero". It has to sit AFTER the thin ad in the input: with it first, both
  // land on 0 and the tie-break on the original index puts them in the right
  // order by accident, and the suite stays green on the defect. Checked by
  // scoring the unmeasurable at zero on purpose: with the first order the
  // suite passed, with this one it reports it.
  const jobs = [MATCHES, TOO_THIN, DOES_NOT_MATCH];
  const { ranked, fits, measured, unmeasured } = rankByFit(CV, jobs);

  if (ranked.length !== jobs.length) {
    failures.push("the ranking returns " + ranked.length + " of " + jobs.length
      + " jobs: sorting a list is never allowed to lose one.");
  }
  if (ranked[0] && ranked[0].id !== "fit") {
    failures.push("the first job is \"" + (ranked[0] || {}).title + "\" and not the one "
      + "that repeats the trade in the CV. A sort by fit that does not put the fit "
      + "at the top is worth nothing.");
  }

  const fitScore = fits.get(fitKey(MATCHES, 0));
  const farScore = fits.get(fitKey(DOES_NOT_MATCH, 0));
  if (!fitScore) {
    failures.push("the job that fits carries no measurement: its card would have "
      + "nothing to show.");
  }
  if (!farScore) {
    failures.push("the warehouse job is not measured although its ad is long: it would "
      + "sit with the silent ads, which are not bad matches but short ads.");
  }
  if (fitScore && farScore && !(fitScore.score > farScore.score)) {
    failures.push("the warehouse ad covers " + farScore.score + "% and the ad in the "
      + "person's own trade " + fitScore.score + "%: the measurement does not tell "
      + "the two apart.");
  }
  // A count, not a mark dropped on the card: that is the panel's rule, and it
  // holds here because the count is what gets shown and the percentage only
  // ever decides the order.
  if (fitScore && !(fitScore.present <= fitScore.demandees && fitScore.demandees > 0)) {
    failures.push("the measurement reads " + fitScore.present + " of " + fitScore.demandees
      + ": a count whose denominator does not hold means nothing.");
  }

  // --- 2. A SILENT AD IS NOT A BAD MATCH -------------------------------
  //
  // Half of aggregated ads are a title and a salary. If they came out at zero
  // they would fall below the warehouse job, and a real opportunity would
  // disappear for the sole reason that its ad is short.
  if (fitOfAJob(CV, TOO_THIN) !== null) {
    failures.push("a three line ad receives a measurement: a share of nothing stays "
      + "nothing, and scoring it would make it read as a match.");
  }
  if (!ranked.some((j) => j.id === "thin")) {
    failures.push("the too thin ad has vanished from the ranking. It cannot be "
      + "measured, which is not a reason to remove it from the results.");
  }
  // The invariant, stated as an invariant rather than as two positions: every
  // ad that could be measured sits above every ad that could not, whatever
  // the measured one scored. An ad measured at 0% is a job in another trade;
  // an unmeasured ad is a job nobody described. They are not the same answer
  // and they must not interleave.
  const measuredRanks = ranked.map((j, i) => (fits.has(fitKey(j, 0)) ? i : -1)).filter((i) => i >= 0);
  const silentRanks = ranked.map((j, i) => (fits.has(fitKey(j, 0)) ? -1 : i)).filter((i) => i >= 0);
  if (measuredRanks.length && silentRanks.length
    && Math.max(...measuredRanks) > Math.min(...silentRanks)) {
    failures.push("a measured ad sits below an unmeasurable one: at rank "
      + Math.min(...silentRanks) + " the list already holds an ad nobody described, "
      + "while an ad measured at " + (farScore ? farScore.score : "?") + "% comes at "
      + Math.max(...measuredRanks) + ". An ad with no text is not a bad match.");
  }
  if (measured !== 2 || unmeasured !== 1) {
    failures.push("the count reads " + measured + " measured and " + unmeasured
      + " unmeasurable instead of 2 and 1: without that number the screen cannot tell "
      + "the person what it could not read.");
  }

  // --- 3. WITH NO CV, NOTHING IS RANKED --------------------------------
  //
  // Someone searching before importing a CV must see their source's list in
  // their source's order. Inventing an order with no material to build it on
  // is the silent version of inventing a result.
  const without = rankByFit(null, jobs);
  if (without.ranked.map((j) => j.id).join(",") !== jobs.map((j) => j.id).join(",")) {
    failures.push("with no CV the source's order changed: there is nothing to rank on.");
  }
  if (without.measured !== 0) failures.push("with no CV a job is declared measured.");

  // --- 4. ON A TIE, THE SOURCE'S ORDER DECIDES -------------------------
  //
  // Two identical ads cover the same share. If the order depended on the sort
  // itself, the list would change between two renders of the same result and
  // the person would not find the job they just saw.
  const twins = [
    { ...MATCHES, id: "a" }, { ...MATCHES, id: "b" }, { ...MATCHES, id: "c" },
  ];
  const order = rankByFit(CV, twins).ranked.map((j) => j.id).join(",");
  if (order !== "a,b,c") {
    failures.push("at equal fit the order comes out \"" + order + "\" instead of "
      + "\"a,b,c\": the list would move from one render to the next.");
  }

  // --- 5. THE TITLE COUNTS IN THE MEASUREMENT --------------------------
  //
  // The trade and the level live in the title and nowhere else. A measurement
  // taken on the body alone under-reads the ad whose title IS the person's
  // own job title.
  if (!jobText(MATCHES).includes("Account Manager")) {
    failures.push("the ad's title is not part of the measured text.");
  }

  if (!failures.length) {
    console.log("      what fits comes first, a silent ad is not a bad match, and with "
      + "no CV the source's order does not move");
  }
  return failures;
}
