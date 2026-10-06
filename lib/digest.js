// WHAT IS NEW SINCE THE PERSON LAST LOOKED
//
// WHY THIS IS THE PIECE THAT WAS MISSING
//
// Job hunting is a daily habit, and whoever lands in the habit owns the
// search. Every job site has alerts; this product has none, which is the one
// piece of table stakes it is missing outright. The part worth getting right
// is not the sending, it is deciding what counts as new: an alert that
// repeats what you already saw is unsubscribed from within a week, and an
// alert that misses the one job you wanted is worse, because nothing on
// screen says it happened.
//
// THE FIRST RUN ARMS THE WATCH, IT DOES NOT REPORT
//
// On the first run every job is unseen, so a literal reading sends fifty.
// Fifty is not a digest, it is the search results with a stamp on them, and
// it teaches the person that this message is noise before the second one ever
// arrives. So the first run records what exists and says nothing. The person
// has just run the search by hand anyway: they have seen those fifty.
//
// A CAPPED MEMORY CAN RESURRECT AN OLD JOB, AND THAT IS A REAL FAILURE
//
// The seen list cannot grow for ever, so it keeps the most recent thousand
// identifiers. Once it trims, a job the person saw months ago is no longer in
// it and would come back as "new". A date is the guard: a posting older than
// the watch itself was never new, whatever the memory has forgotten. Ads with
// no date keep the benefit of the doubt, because half of them have none, and
// the digest counts them so the screen can say so.

export const SEEN_MAX = 1000;

// A day of slack on the date guard. Sources disagree about what "posted"
// means to within a few hours, and the boards restate a job's date when they
// touch it, so a strict comparison drops jobs that really are new.
const SLACK_MS = 36 * 3600 * 1000;

export const NO_WATCH = {
  id: "", what: "", where: "", country: "gb",
  filters: {},
  // The identifiers already reported. Capped, newest kept.
  seen: [],
  // 0 means never run: the next run arms it and reports nothing.
  lastRunAt: 0,
};

export function jobId(job) {
  if (!job) return "";
  return String(job.source || "") + "|" + String(job.id || job.url || "");
}

function postedAt(job) {
  const raw = (job && (job.created || job.posted || job.date)) || "";
  if (!raw) return null;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : t;
}

// What the person has not been told about yet, and the memory to store back.
// Pure: it decides nothing about sending, and it reads no clock of its own.
export function whatIsNew(jobs, watch = {}, now = Date.now()) {
  const w = { ...NO_WATCH, ...watch };
  const list = (Array.isArray(jobs) ? jobs : []).filter(Boolean);
  const seen = new Set((Array.isArray(w.seen) ? w.seen : []).map(String));

  const ids = list.map(jobId).filter(Boolean);
  // The memory is written on every run, armed or not: that is what makes the
  // first run cost nothing on the second.
  const remembered = [];
  const keep = new Set();
  for (let i = ids.length - 1; i >= 0 && remembered.length < SEEN_MAX; i -= 1) {
    if (!keep.has(ids[i])) { keep.add(ids[i]); remembered.push(ids[i]); }
  }
  for (const id of (Array.isArray(w.seen) ? w.seen : [])) {
    if (remembered.length >= SEEN_MAX) break;
    const s = String(id);
    if (!keep.has(s)) { keep.add(s); remembered.push(s); }
  }

  const armed = Number(w.lastRunAt) > 0;
  let undatedAmong = 0;
  const fresh = !armed ? [] : list.filter((job) => {
    const id = jobId(job);
    if (!id || seen.has(id)) return false;
    const t = postedAt(job);
    // Older than the watch itself: it was never new, the memory simply
    // forgot it. A job with no date keeps the benefit of the doubt.
    if (t !== null && t < Number(w.lastRunAt) - SLACK_MS) return false;
    if (t === null) undatedAmong += 1;
    return true;
  });

  return {
    fresh,
    armed,
    looked: list.length,
    undated: undatedAmong,
    watch: { ...w, seen: remembered, lastRunAt: now },
  };
}

// THE SENTENCE A DIGEST OPENS WITH
//
// It has to say what was looked at, not only what was found, for the reason
// the search's own count exists: a short list means two very different things
// and they read the same. "Nothing new" after reading 265 boards is a fact;
// "nothing new" because the search broke is a failure, and the person cannot
// tell them apart from the number alone.
export function digestSummary(result, locale = "en") {
  const en = locale !== "fr";
  const n = result && result.fresh ? result.fresh.length : 0;
  const looked = (result && result.looked) || 0;
  if (!result || !result.armed) {
    return en
      ? "Watching from now. You will hear about what appears after today, not about what is already there."
      : "Surveillance active. Tu entendras parler de ce qui arrive apres aujourd'hui, pas de ce qui est deja la.";
  }
  if (!n) {
    return en ? "Nothing new, from " + looked + " jobs looked at"
      : "Rien de nouveau, sur " + looked + " offres regardees";
  }
  const head = en
    ? n + (n > 1 ? " new jobs" : " new job") + ", from " + looked + " looked at"
    : n + (n > 1 ? " nouvelles offres" : " nouvelle offre") + ", sur " + looked + " regardees";
  if (!result.undated) return head;
  return head + (en
    ? " (" + result.undated + " of them state no date)"
    : " (" + result.undated + " d'entre elles n'annoncent pas de date)");
}

// WHERE A WATCH LIVES WHILE THERE IS NO SERVER TO KEEP IT
//
// A digest needs to remember what it already showed. On the device that is a
// single key, one watch per search, because "account manager in London" and
// "account manager in Manchester" are two different questions and a person
// who runs both has to be told about both. The map is capped for the same
// reason the seen list is: a store that grows without a ceiling eventually
// refuses to write and takes the whole watch with it.
export const WATCHES_MAX = 20;

export function watchKey(query = {}) {
  const part = (v) => String(v || "").trim().toLowerCase();
  return [part(query.what), part(query.where), part(query.country)].join("|");
}

// Newest first, oldest dropped. The watch just written is always kept.
export function storeWatch(watches, key, watch) {
  const kept = { ...(watches && typeof watches === "object" ? watches : {}) };
  kept[key] = watch;
  const byAge = Object.keys(kept)
    .sort((a, b) => (kept[b].lastRunAt || 0) - (kept[a].lastRunAt || 0))
    .slice(0, WATCHES_MAX);
  const out = {};
  for (const k of byAge) out[k] = kept[k];
  return out;
}
