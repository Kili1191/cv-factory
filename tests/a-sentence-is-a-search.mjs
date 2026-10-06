// A SENTENCE IS A SEARCH, AND A FILTER MUST SWALLOW NOTHING IN SILENCE
//
// Kilian, 6 October 2026, giving one example of what a person would type:
// "find me a French speaker job with my CV in London". The search had two
// fields, a title and a city, and most of that sentence was neither. The
// example is not a niche: what people ask for is a title, a place and two or
// three conditions, and the conditions are what disqualify an ad in a line.
// French below is a test value, not the product.
//
// WHAT THIS SUITE HOLDS
//
// The model translates the sentence, it does not search, so nothing here
// calls the AI. What is ours is reading the requirements out of the prose of
// an ad, and that is where it all turns on:
//
//   1. "Fluent French essential" requires French. "We serve the French
//      market" and "French fries on the menu" do not. Same lesson as
//      includes("account") inside "accounting".
//   2. "This role is not remote" is not a remote job, although the sentence
//      contains the word. The refusal is tested before the offer, like
//      sponsorship before right to work in extension/champs.js.
//   3. An ad with no salary PASSES a floor, and the undecided count says so.
//      Dropping it would empty the list of its best offers with nothing
//      saying so.
//   4. What the model returns is pulled back into range: an unknown enum
//      becomes empty, not a filter that accepts nothing.

import {
  passesFilters, countTheUndecided, activeFilters, workplaceKind,
  jobRequiresLanguage, advertisedReach, contractKind, jobLevel, NO_FILTERS,
} from "../lib/jobFilters.js";
import {
  filtersFromTheModel, searchParams, filtersFromParams,
  searchInstruction, SEARCH_SCHEMA,
} from "../lib/searchFromASentence.js";

const job = (title, text, extra = {}) => ({
  id: "1", source: "ats", title, company: "Test Ltd", location: "London, UK",
  url: "https://example.invalid/1", description: text, ...extra,
});

export async function run() {
  const failures = [];

  // --- 1. THE LANGUAGE REQUIRED, NOT THE LANGUAGE MENTIONED --------------
  const required = [
    "Fluent French is essential for this role.",
    "We are looking for a French speaker.",
    "French-speaking candidates only.",
    "Native French required.",
    "Bilingual French / English.",
    "Francais courant exige.",
    "Maitrise du francais indispensable.",
  ];
  for (const t of required) {
    if (!jobRequiresLanguage(job("Account Manager", t), "french")) {
      failures.push("\"" + t + "\" is not read as a French requirement");
    }
  }
  const mentioned = [
    "We serve the French market from London.",
    "Our French office opened in 2024.",
    "French fries are on the canteen menu.",
    "You will report to the French CEO.",
    "Experience with French GAAP is a plus.",
  ];
  for (const t of mentioned) {
    if (jobRequiresLanguage(job("Account Manager", t), "french")) {
      failures.push(
        "\"" + t + "\" is read as a French requirement.\n" +
        "      Same lesson as includes(\"account\") inside \"accounting\": the word is\n" +
        "      there, the requirement is not, and the person applies to a role that is\n" +
        "      not looking for them."
      );
    }
  }
  if (jobRequiresLanguage(job("Account Manager", "Fluent French essential."), "german")) {
    failures.push("an ad requiring French is returned for a German search");
  }

  // --- 2. THE NEGATION CONTAINS THE WORD ---------------------------------
  const shapes = [
    ["This role is fully remote.", "remote"],
    ["Work from home, UK based.", "remote"],
    ["Hybrid: 3 days a week in the office.", "hybrid"],
    ["This role is not remote.", "onsite"],
    ["On-site only, central London.", "onsite"],
  ];
  for (const [t, expected] of shapes) {
    const seen = workplaceKind(job("Account Manager", t));
    if (seen !== expected) {
      failures.push("\"" + t + "\" is read as \"" + seen + "\" instead of \"" + expected + "\"");
    }
  }
  // Someone who wants remote will take hybrid. The reverse is not true.
  if (!passesFilters(job("x", "Hybrid, 2 days a week in the office."), { workplace: "remote" })) {
    failures.push("a hybrid job is refused to someone looking for remote: three days at home beats nothing");
  }
  if (passesFilters(job("x", "This role is not remote."), { workplace: "remote" })) {
    failures.push("an explicitly on-site job is returned to someone looking for remote");
  }

  // --- 3. A FILTER THAT CANNOT DECIDE DOES NOT EXCLUDE -------------------
  const silent = job("Account Manager", "A great role.", { salary: null });
  if (!passesFilters(silent, { salaryFrom: 50000 })) {
    failures.push(
      "an ad with no salary is dropped by a floor.\n" +
      "      Half of ads do not state one: asking for 50,000 would empty the list of\n" +
      "      its best offers with nothing saying so."
    );
  }
  if (passesFilters(job("x", "", { salary: "28000 - 32000" }), { salaryFrom: 50000 })) {
    failures.push("an advertised salary below the floor passes anyway: the filter filters nothing");
  }

  // A BAND IS TWO NUMBERS AND THE TOP ONE ANSWERS THE QUESTION
  //
  // Measured against a real Adzuna key on 6 October 2026: asking for 60 000
  // returns ads whose band starts at 35 000, because the source reads it as
  // "this band reaches 60 000". Taking the first number would have thrown
  // those same ads away, and a job advertised at 35 000 to 65 000 can pay
  // someone 65 000.
  if (!passesFilters(job("x", "", { salary: "35000 - 65000" }), { salaryFrom: 60000 })) {
    failures.push(
      "a band of 35 000 to 65 000 is refused for a floor of 60 000.\n" +
      "      It can pay 65 000. Dropping it loses a real opportunity, silently, and\n" +
      "      disagrees with the count the source produced for the same search."
    );
  }
  if (passesFilters(job("x", "", { salary: "35000 - 45000" }), { salaryFrom: 60000 })) {
    failures.push("a band that never reaches the floor passes: the filter filters nothing");
  }
  if (advertisedReach({ salary: "45k-60k" }) !== 60000) failures.push('"45k-60k" does not reach 60000');
  if (advertisedReach({ salary: "GBP 50,000" }) !== 50000) failures.push('"GBP 50,000" is not read');
  if (advertisedReach({ salary: "Competitive" }) !== null) failures.push('"Competitive" should return null');
  if (advertisedReach({ salary: "500 per day" }) !== null) {
    failures.push("a day rate is compared to an annual floor: every contract role would be refused");
  }
  const undecided = countTheUndecided([silent, job("x", "", { salary: "60000" })], { salaryFrom: 50000 });
  if (undecided.noSalary !== 1) {
    failures.push("the count of ads with no salary is " + undecided.noSalary + " instead of 1:"
      + " without it the person believes they all clear the floor");
  }

  // A missing date passes too, for the same reason.
  if (!passesFilters(job("x", "", { created: "" }), { postedWithin: 7 })) {
    failures.push("an ad with no date is dropped by a freshness filter");
  }
  const old = job("x", "", { created: new Date(Date.now() - 40 * 86400000).toISOString() });
  if (passesFilters(old, { postedWithin: 7 })) failures.push("a 40 day old ad passes a 7 day filter");

  // --- 4. THE CONTRACT AND THE LEVEL -------------------------------------
  if (contractKind(job("x", "A full-time internship in our London office.")) !== "internship") {
    failures.push("\"full-time internship\" is read as permanent: the order of the patterns matters");
  }
  if (contractKind(job("x", "6 month fixed-term contract.")) !== "contract") {
    failures.push("a fixed-term contract is not read as contract work");
  }
  if (jobLevel(job("Head of Partnerships", "")) !== "lead") failures.push("\"Head of\" is not a lead level");
  if (jobLevel(job("Account Manager", "You will work with senior stakeholders and report to the Head of Sales.")) !== "mid") {
    failures.push(
      "the level is read from the body of the ad.\n" +
      "      Every ad says \"senior stakeholders\" and \"report to the Head of\": the\n" +
      "      level of a role is in its title, not in its prose."
    );
  }

  // --- 5. WHAT THE MODEL RETURNS IS PULLED BACK INTO RANGE ---------------
  const { filters, understood } = filtersFromTheModel({
    what: " Account Manager ", where: "London", country: "GB",
    language: "french", workplace: "anything at all", contract: "permanent",
    salaryFrom: "55000", postedWithin: -3, level: "unknown",
    understood: "Account management roles in London that require French.",
  });
  if (filters.what !== "Account Manager") failures.push("the title is not trimmed");
  if (filters.country !== "gb") failures.push("the country is not lower cased");
  if (filters.workplace !== "") {
    failures.push("a value outside the enum is kept: the filter would accept no job at all");
  }
  if (filters.level !== "") failures.push("an unknown level is kept");
  if (filters.salaryFrom !== 55000) failures.push("a number sent as a string is not read");
  if (filters.postedWithin !== 0) failures.push("a negative number of days is not pulled back to zero");
  if (!understood) failures.push("the understood sentence is not returned: the screen has nothing to show for correction");
  const { filters: empty } = filtersFromTheModel(null);
  if (empty.what !== "" || empty.country !== "gb") {
    failures.push("an empty model response gives an exception rather than an empty search");
  }

  // --- 6. THE QUERY SURVIVES THE ROUND TRIP ------------------------------
  const params = searchParams(filters, 3);
  if (params.get("page") !== "3") failures.push("the page is not passed on");
  if (params.get("language") !== "french") failures.push("the required language is not passed to the route");
  if (params.has("workplace")) failures.push("an empty filter is passed on: the route would read it as a requirement");
  const back = filtersFromParams(params);
  for (const key of ["what", "where", "country", "language", "contract", "salaryFrom"]) {
    if (String(back[key]) !== String(filters[key])) {
      failures.push("the filter \"" + key + "\" does not survive the round trip (" + back[key] + ")");
    }
  }
  const injected = filtersFromParams(new URLSearchParams({ language: "'; DROP--", level: "x" }));
  if (injected.language !== "" || injected.level !== "") {
    failures.push("a made up value in the URL becomes a filter");
  }

  // --- 7. NO REQUIREMENT, NO FILTER --------------------------------------
  if (activeFilters({ ...NO_FILTERS, what: "x", where: "y" }).length) {
    failures.push("the title and the city count as requirements: the panel would always look active");
  }
  if (!passesFilters(job("Anything", "Anything at all."), {})) {
    failures.push("with no requirement at all, a job is dropped");
  }

  // --- 8. THE INSTRUCTION FORBIDS ADDING ANYTHING ------------------------
  const instruction = searchInstruction("a French speaking role in London", "en");
  if (!/do not invent/i.test(instruction) || !/silence/i.test(instruction)) {
    failures.push(
      "the instruction does not forbid adding a requirement the person did not state.\n" +
      "      An invented filter removes jobs with nothing saying so, and that is the\n" +
      "      failure this repo knows best."
    );
  }
  if (!SEARCH_SCHEMA.required.includes("understood")) {
    failures.push("the schema does not require the understood sentence: the screen would have nothing to show");
  }

  if (!failures.length) {
    console.log("      a sentence becomes requirements, required French is told apart from"
      + " mentioned French, and a silent ad is never dropped in silence");
  }
  return failures;
}
