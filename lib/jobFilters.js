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

export const NO_FILTERS = {
  what: "", where: "", country: "",
  workplace: "",     // "" | "remote" | "hybrid" | "onsite"
  language: "",      // "french", "german"... the language the AD requires
  salaryFrom: 0,     // in the currency of the ad, never converted
  contract: "",      // "" | "permanent" | "contract" | "internship" | "parttime"
  postedWithin: 0,   // 0 = no limit, otherwise days
  level: "",         // "" | "junior" | "mid" | "senior" | "lead"
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
  return "";
}

// --- the language the ad requires ------------------------------------------
//
// This is what Kilian asked for on 6 October 2026: a French speaker's role
// in London. A London ad that requires French is an ad where his profile
// walks past every other candidate, and no job site knows how to find it.
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
// "Competitive". We take the first number, which is the advertised floor,
// and "45k" means 45000. No currency conversion: comparing pounds to euros
// would produce a false refusal, and a person searches inside one market.
export function advertisedFloor(job) {
  const s = String((job && job.salary) || "");
  if (!s) return null;
  const m = s.replace(/[\s,]/g, "").match(/(\d+(?:\.\d+)?)(k)?/i);
  if (!m) return null;
  let n = Number(m[1]);
  if (m[2]) n *= 1000;
  // An hourly or daily rate is not an annual salary: comparing it to an
  // annual floor would refuse every contract role.
  if (/\b(per hour|\/h|hourly|par heure|per day|\/day|day rate)\b/i.test(s)) return null;
  return n > 0 ? n : null;
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
  return "";
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

  if (f.salaryFrom > 0) {
    const floor = advertisedFloor(job);
    // A missing salary passes: see the header of this file.
    if (floor !== null && floor < f.salaryFrom) return false;
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
  if (f.salaryFrom > 0) out.noSalary = jobs.filter((j) => advertisedFloor(j) === null).length;
  if (f.postedWithin > 0) out.noDate = jobs.filter((j) => daysSincePosted(j) === null).length;
  return out;
}

export function activeFilters(filters = {}) {
  const f = { ...NO_FILTERS, ...filters };
  return ["workplace", "language", "contract", "level"].filter((k) => f[k])
    .concat(f.salaryFrom > 0 ? ["salaryFrom"] : [])
    .concat(f.postedWithin > 0 ? ["postedWithin"] : []);
}
