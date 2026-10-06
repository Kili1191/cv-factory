// WHAT A PERSON CAN DEMAND OF A JOB AD
//
// The search had two fields, a title and a city, and that is far too few
// once there are eight hundred results: "developer in London" returns
// everything, and the person reads everything. The requirements that
// actually matter are the ones that disqualify an ad in a single line, and
// they are always the same six: the place of work, the language, the salary
// floor, the kind of contract, the freshness, the level.
//
// ALL OF IT IS READ IN FREE TEXT, AND THAT IS THE TRAP
//
// A job ad has no "requires French" field. It is read from the prose, and
// the lesson of lib/resultatOuResponsabilite.js applies here: a word being
// present does not mean what you think. "Our Paris office" contains
// "Paris", "French fries on the menu" contains "French", and an ad saying
// "no remote" contains "remote". So every pattern below demands the shape a
// requirement is really written in, not the bare word.
//
// AND A FILTER THAT CANNOT DECIDE MUST NOT EXCLUDE
//
// Half of job ads do not state a salary. If the floor dropped them, asking
// for 50,000 would empty the list of its best offers with nothing saying
// so, and that is exactly the silent failure this repo knows best. So: an
// ad with no stated salary passes the floor, and `countTheUndecided` says
// how many they are so the screen can write it.
//
// SILENCE IS NOT UNDECIDED: IT IS THE DEFAULT, AND THE DEFAULT HAS A NAME
//
// An ad states what deviates and assumes the rest. Remote and hybrid are
// stated because they are the selling point; an internship, a fixed term
// and part time are stated because they are what the candidate has to be
// warned about. Permanent, full office and mid level are never stated,
// because they are what you get if nothing is said. So a reader that
// returned "" on silence and let the filter turn that into an exclusion
// emptied the list: measured on production on 6 October 2026, "account
// manager in London, permanent" kept 24 jobs of 120 and dropped all 23
// career page ads, none of which prints the word "permanent" anywhere.
// `jobLevel` already read silence as "mid"; `workplaceKind` and
// `contractKind` now read it as "onsite" and "permanent" for the same
// reason. The asymmetry is the point: asking for an internship still drops
// every ad that does not say so, which is right, because an ad that is one
// says so in its title.

export const NO_FILTERS = {
  what: "", where: "", country: "",
  workplace: "",     // "" | "remote" | "hybrid" | "onsite"
  language: "",      // "french", "german"... the language the AD requires
  salaryFrom: 0,     // in the currency of the ad, never converted
  contract: "",      // "" | "permanent" | "contract" | "internship" | "parttime"
  postedWithin: 0,   // 0 = no limit, otherwise days
  level: "",         // "" | "junior" | "mid" | "senior" | "lead"
  sponsorship: "",   // "" | "possible": drop the ads that rule sponsorship out
};

const textOf = (job) => String((job && job.title) || "") + " \n " + String((job && job.description) || "");

// --- the place of work -----------------------------------------------------
//
// "Hybrid - 3 days in office" and "Remote (UK)" are different promises, and
// "This role is not remote" is the opposite of a promise. The refusal is
// tested before the offer, like sponsorship before right to work in
// extension/champs.js: the negation contains the word.
const NOT_REMOTE = /\b(not|non|no)[\s-]remote\b|\bremote\s*:?\s*no\b|\bon[\s-]?site only\b|\bfully on[\s-]?site\b/i;
const HYBRID = /\bhybrid(e)?\b|\b\d\s*days?\s*(a|per)\s*week\s*in\s*(the\s*)?office\b|\bpartiel\s*sur\s*site\b/i;
const REMOTE = /\b(fully\s+)?remote\b|\bwork from home\b|\btelet?ravail\b|\b100\s*%\s*remote\b|\bdistributed team\b/i;

export function workplaceKind(job) {
  const t = textOf(job) + " \n " + String((job && job.location) || "");
  if (HYBRID.test(t)) return "hybrid";
  if (NOT_REMOTE.test(t)) return "onsite";
  if (REMOTE.test(t)) return "remote";
  // An ad that is remote or hybrid says so: it is the selling point. Silence
  // therefore means the office, and is read rather than left undecided.
  return "onsite";
}

// --- the language the ad requires ------------------------------------------
//
// One of the six, and the one that shows why they are read from the prose
// at all. An ad that requires a language says so in a sentence, never in a
// field, so no job site can filter on it. Any of the eight below works the
// same way; French is only the one the first example happened to use.
// The bare word "French" is not enough: it is in "French fries", in "French
// market" and in the name of half the banks.
const LANGUAGES = {
  french: "fran[cç]ais|french",
  german: "allemand|german|deutsch",
  spanish: "espagnol|spanish|castellano",
  italian: "italien|italian",
  dutch: "n[eé]erlandais|dutch|nederlands",
  portuguese: "portugais|portuguese",
  arabic: "arabe|arabic",
  mandarin: "mandarin|chinese|chinois",
};

// The shapes a language requirement is really written in. The name of the
// language must sit next to a word that means speaking it.
const REQUIREMENT = "(speaker|speaking|fluen\\w*|native|bilingual|biling\\w*|proficien\\w*|"
  + "mother tongue|courant|courante|parl\\w*|ma[iî]tris\\w*|langue)";

// The glue between the two words. Fifteen characters, letters allowed:
// "Maitrise du francais" has a "du" in the middle, and a class that admits
// only punctuation and spaces misses it. Fifteen is the bound that lets
// through "du", "de la", "in", "of the", and not a whole clause: "We serve
// the French market from London" has no requirement word within fifteen
// characters of "French".
const GLUE = "[\\s\\-,/()'\\w]{0,15}";

export function jobRequiresLanguage(job, language) {
  const names = LANGUAGES[String(language || "").toLowerCase()];
  if (!names) return false;
  const t = textOf(job);
  // Both orders: "fluent French" and "French speaker".
  const before = new RegExp("\\b" + REQUIREMENT + GLUE + "(" + names + ")\\b", "i");
  const after = new RegExp("\\b(" + names + ")" + GLUE + REQUIREMENT, "i");
  return before.test(t) || after.test(t);
}

// --- the salary ------------------------------------------------------------
//
// `salary` is free text: "38000 - 45000", "GBP 50,000", "45k-60k",
// "Competitive". A band is two numbers, and WHICH ONE ANSWERS THE QUESTION
// is the whole point.
//
// The first version took the first number and called it the floor. Measured
// against a real Adzuna key on 6 October 2026: asking for 60 000 returned
// ads whose band starts at 35 000, because Adzuna reads `salary_min` as
// "this band reaches 60 000". Our local filter would then have thrown those
// same ads away for starting below it. A job advertised at 35 000 to 65 000
// can pay someone 65 000, and dropping it is a real opportunity lost with
// nothing on screen to say why.
//
// So the question a salary floor asks is "can this job reach my number",
// and the answer is the TOP of the band. That also matches what the source
// did to produce the count, so the number on screen and the list under it
// describe the same search.
//
// A single figure is its own top. "Competitive" is no figure at all and
// returns null, which passes: see the header of this file.
export function advertisedReach(job) {
  const s = String((job && job.salary) || "");
  if (!s) return null;
  // An hourly or daily rate is not an annual salary: comparing it to an
  // annual floor would refuse every contract role.
  if (/\b(per hour|\/h|hourly|par heure|per day|\/day|day rate)\b/i.test(s)) return null;
  const nombres = [...s.replace(/[\s,]/g, "").matchAll(/(\d+(?:\.\d+)?)(k)?/gi)]
    .map((m) => Number(m[1]) * (m[2] ? 1000 : 1))
    .filter((n) => n > 0);
  if (!nombres.length) return null;
  return Math.max(...nombres);
}

// --- the kind of contract --------------------------------------------------
const CONTRACTS = {
  permanent: /\b(permanent|full[\s-]?time|cdi|perm)\b/i,
  contract: /\b(contract|contractor|freelance|interim|fixed[\s-]?term|ftc|day rate|mission)\b/i,
  internship: /\b(intern|internship|stage|stagiaire|placement|graduate scheme|apprentice\w*)\b/i,
  parttime: /\b(part[\s-]?time|temps partiel)\b/i,
};

export function contractKind(job) {
  const t = textOf(job);
  // The order matters: an internship ad often says "full-time internship".
  for (const name of ["internship", "parttime", "contract", "permanent"]) {
    if (CONTRACTS[name].test(t)) return name;
  }
  // Permanent is the kind nobody writes down, because it is what an ad means
  // when it says nothing. The deviations above all announce themselves.
  return "permanent";
}

// --- the level -------------------------------------------------------------
//
// Read from the title only. A job ad's body says "you will report to the
// Head of" and "work with senior stakeholders": the level of the role is
// not in the body, it is in the title.
const LEVELS = {
  lead: /\b(head of|director|vp|vice president|chief|c[t|e|o|f]o|principal|staff|lead)\b/i,
  senior: /\b(senior|snr|sr\.?|experienced|expert)\b/i,
  junior: /\b(junior|jr\.?|graduate|trainee|entry[\s-]level|apprentice\w*|intern(ship)?|stagiaire)\b/i,
};

export function jobLevel(job) {
  const t = String((job && job.title) || "");
  for (const name of ["lead", "senior", "junior"]) if (LEVELS[name].test(t)) return name;
  return "mid";
}

// --- how old the ad is -----------------------------------------------------
export function daysSincePosted(job, now = Date.now()) {
  const raw = (job && (job.created || job.postedAt)) || "";
  if (!raw) return null;
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now - t) / 86400000));
}

// --- the sieve -------------------------------------------------------------

// --- the visa, the requirement no job site can sieve ---------------------
//
// WHY THIS ONE IS WORTH MORE THAN THE OTHER SIX PUT TOGETHER, IN LONDON
//
// Someone who needs a visa burns most of their applications on employers who
// were never going to sponsor one, and finds out weeks later or never. No job
// board filters on it, for the usual reason: it is a sentence in the prose,
// never a field. It is the same reading as the required language, and the
// same payoff.
//
// WHAT IT CAN HONESTLY SAY, WHICH IS LESS THAN "WILL SPONSOR"
//
// An employer that sponsors usually says nothing, because it is not a selling
// point to most readers. An employer that will NOT sponsor says so, because
// it wants to stop the applications. So silence here is genuinely undecided,
// unlike the contract kind: this is the rule above, not the one below it. The
// filter therefore removes the ads that ruled sponsorship OUT and keeps the
// silent ones, counted, so the screen can say how many said nothing. It
// cannot promise a sponsor; it can delete the certain waste of time.
//
// AND "SPONSORSHIP" IS A SALES WORD BEFORE IT IS AN IMMIGRATION WORD
//
// "Sponsorship packages", "sponsorship revenue", "event sponsorship": on an
// account manager ad, which is the example this repo keeps testing with, the
// word is about money. So nothing is read as a stance unless the ad talks
// about immigration somewhere, and a commercial use next to the word refuses
// it outright. That is `includes("account")` inside "accounting" again.
const SPONSOR = /\bsponsor\w*/i;
// Plurals count: "we cannot sponsor work visas" is the commonest refusal
// there is, and \bvisa\b does not match "visas", so the whole sentence was
// read as saying nothing about immigration and the refusal was lost.
const IMMIGRATION = /\b(visas?|work permits?|working permits?|skilled workers?|tier 2|immigration|right to work|settled status|sponsor(?:ship)? licen[cs]es?)\b/i;
const COMMERCIAL = new RegExp("\\b(package|revenue|deal|opportunit\\w*|sales|event|brand|partnership|sponsor)\\w*" + GLUE
  + "sponsor\\w*|sponsor\\w*" + GLUE + "(package|revenue|deal|opportunit\\w*|sales|event|brand|partnership)\\b", "i");

// The refusal is tested before the offer, for the third time in this
// repository: "we are unable to offer visa sponsorship" contains "offer
// sponsorship", and reading it the other way round inverts the meaning on the
// one requirement whose cost lands on the person weeks later.
const SPONSOR_REFUSES = [
  // A loose "no" within forty characters read "there is no doubt we will
  // sponsor the right candidate" as a refusal, and dropping an employer who
  // WOULD sponsor is the silent loss this file exists to avoid. So "no" has
  // to sit directly on the word, and the gap on the other forms is short
  // enough to stay inside one clause.
  /\b(?:un(?:able|availab\w*)|not able|cannot|can ?not|can't|do(?:es)? not|will not|won't|are not)\b[^.!?]{0,25}\bsponsor\w*/i,
  /\bno\s+(?:visa\s+|work\s+permit\s+)?sponsor\w*/i,
  /\bsponsor\w*[^.!?]{0,40}\b(?:not available|unavailable|is not offered|not provided|not an option)\b/i,
  /\bwithout(?:\s+the\s+need\s+for|\s+requiring)?\s+sponsor\w*/i,
  /\bright to work\b[^.!?]{0,60}\bwithout\b[^.!?]{0,20}\bsponsor\w*/i,
];
const SPONSOR_OFFERS = [
  /\bsponsor\w*[^.!?]{0,25}\b(?:available|provided|offered|considered)\b/i,
  /\b(?:we|they)\b[^.!?]{0,30}\b(?:can|will|are able to|are happy to|are willing to|do)\b[^.!?]{0,20}\bsponsor\w*/i,
  /\b(?:happy|willing|able|open)\s+to\s+sponsor\w*/i,
  /\b(?:offer|offers|offering|provide|provides|providing)\b[^.!?]{0,20}\bsponsor\w*/i,
];

// THE NOUN IS THE VISA, THE VERB IS ANYTHING AT ALL
//
// Requiring an immigration word anywhere in the ad was too strict, and it was
// measured on production: a Reed ad reading "No sponsorship is offered" never
// says "visa", so a plain refusal sitting right there was read as silence.
// Aggregated ads arrive truncated, 500 characters at Adzuna and 452 at Reed,
// and the sentence about visas is at the bottom of an ad, so the word that
// would have rescued it is usually the part that got cut.
//
// What separates the two uses is grammar, not vocabulary. The bare noun
// "sponsorship" in a job ad is the visa: "sponsorship is not available", "we
// are unable to offer sponsorship". The verb with a direct object is anything
// an employer can sponsor: a qualification, a charity, a marathon. So the
// noun decides on its own, and only the verb has to prove it is talking about
// immigration.
const NOUN_IS_COMMERCIAL = /\b(event|brand|commercial|corporate|match|sports|title)\s+sponsorship\b|\bsponsorship\s+(?:package|revenue|opportunit|deal|sales|portfolio|partnership|team|manager|executive|director|lead|budget|income)/i;
const BARE_NOUN = /\bsponsorship\b/i;

export function sponsorshipStance(job) {
  // A stance already read on the whole ad wins over one read here, because
  // the description that reaches this point has been cut for transport. The
  // career pages read it in lib/ats.js, where the text is still whole.
  const already = job && job.visaStance;
  if (already === "refuses" || already === "offers") return already;
  const t = textOf(job);
  if (!SPONSOR.test(t)) return "";
  // The noun, used as a job ad uses it, stands on its own. Used as a sales
  // word it says nothing about this employer's visas.
  const nounSpeaks = BARE_NOUN.test(t) && !NOUN_IS_COMMERCIAL.test(t);
  if (!nounSpeaks && !IMMIGRATION.test(t)) return "";
  if (COMMERCIAL.test(t) && !/\b(visas?|work permits?|skilled workers?|tier 2)\b[^.!?]{0,40}\bsponsor\w*|\bsponsor\w*[^.!?]{0,40}\b(visas?|work permits?|skilled workers?|tier 2)\b/i.test(t)) return "";
  for (const re of SPONSOR_REFUSES) if (re.test(t)) return "refuses";
  for (const re of SPONSOR_OFFERS) if (re.test(t)) return "offers";
  return "";
}

export function passesFilters(job, filters = {}, now = Date.now()) {
  const f = { ...NO_FILTERS, ...filters };

  if (f.workplace) {
    const kind = workplaceKind(job);
    // "remote" accepts hybrid: someone who wants remote will take three days
    // at home over nothing. The reverse is not true.
    const ok = f.workplace === "remote" ? (kind === "remote" || kind === "hybrid")
      : kind === f.workplace;
    if (!ok) return false;
  }
  if (f.language && !jobRequiresLanguage(job, f.language)) return false;
  if (f.contract && contractKind(job) !== f.contract) return false;
  if (f.level && jobLevel(job) !== f.level) return false;
  // Only the ads that ruled it out are dropped. An ad that said nothing stays,
  // because silence here is not a refusal, and it is counted below.
  if (f.sponsorship === "possible" && sponsorshipStance(job) === "refuses") return false;

  if (f.salaryFrom > 0) {
    const reach = advertisedReach(job);
    // A missing salary passes: see the header of this file.
    if (reach !== null && reach < f.salaryFrom) return false;
  }
  if (f.postedWithin > 0) {
    const days = daysSincePosted(job, now);
    // A missing date passes, for the same reason a missing salary does.
    if (days !== null && days > f.postedWithin) return false;
  }
  return true;
}

// How many returned ads did not say what a filter asked about. This is what
// lets the screen write "31 of these do not state a salary" instead of
// letting the person believe all thirty-one clear their floor.
export function countTheUndecided(jobs, filters = {}) {
  const f = { ...NO_FILTERS, ...filters };
  const out = {};
  if (f.salaryFrom > 0) out.noSalary = jobs.filter((j) => advertisedReach(j) === null).length;
  if (f.postedWithin > 0) out.noDate = jobs.filter((j) => daysSincePosted(j) === null).length;
  if (f.sponsorship === "possible") {
    out.noSponsorship = jobs.filter((j) => sponsorshipStance(j) === "").length;
  }
  return out;
}

export function activeFilters(filters = {}) {
  const f = { ...NO_FILTERS, ...filters };
  return ["workplace", "language", "contract", "level", "sponsorship"].filter((k) => f[k])
    .concat(f.salaryFrom > 0 ? ["salaryFrom"] : [])
    .concat(f.postedWithin > 0 ? ["postedWithin"] : []);
}
