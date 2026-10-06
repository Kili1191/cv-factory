// WHAT THE PERSON ACTUALLY GOT DONE, WHICH IS NOT HOW MANY JOBS EXIST
//
// THE NUMBER A COMPETITOR PUTS ON ITS HOME PAGE
//
// Career Hound, measured on 6 October 2026: "8,573 people finding 4.5 million
// hidden jobs". That is the whole shape of a job board's claim, and it is a
// claim about inventory. Ours is 19,188 jobs across 283 boards, so on that
// axis we lose by two orders of magnitude, against an asset anyone can read
// off a public Greenhouse endpoint.
//
// Nobody's goal is to find job ads. The goal is an interview, and between the
// ad and the interview sits the work: the CV rewritten for THIS ad, the PDF a
// sorting robot can read, the twenty form boxes, the follow up. That is the
// part a listings site does not do, and the only honest unit of value Nuvi
// has: not jobs found, applications sent.
//
// WHY A WEEK
//
// Job hunting is a weekly rhythm, not a daily one: nobody applies on a
// Sunday and everybody applies in bursts. A day is noise and a month is too
// late to change anything. A week is the window a person can still act on.
//
// WHAT COUNTS, AND WHY IT IS NOT DECIDED HERE
//
// "Sent" means exactly what lib/reponses.js already means by it, imported
// rather than restated. That module counts what came back; this one counts
// what went out, and two definitions of "sent" in one product would put two
// numbers on one screen with no way to tell which to believe.

import { estEnvoyee } from "./reponses.js";

const DAY = 86400000;

// An application carries `date` ("2026-10-06") and `created` (a timestamp).
// The date is what the person sees in the tracker and what they would edit,
// so it leads; `created` catches the rows written before the field existed.
export function sentAt(application) {
  if (!application) return null;
  const d = String(application.date || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
    const t = Date.parse(d + "T12:00:00Z");
    if (!Number.isNaN(t)) return t;
  }
  const c = Number(application.created);
  return Number.isFinite(c) && c > 0 ? c : null;
}

// A row with no usable date is not counted in a window, and it is not thrown
// away either: it stays in the total. A week that silently omitted rows would
// under-report the person's own work, which is the one number here that is
// supposed to encourage them.
export function throughput(applications, now = Date.now()) {
  const list = Array.isArray(applications) ? applications.filter(Boolean) : [];
  const sent = list.filter(estEnvoyee);

  const inWindow = (from, to) => sent.filter((a) => {
    const t = sentAt(a);
    return t !== null && t >= from && t < to;
  }).length;

  const thisWeek = inWindow(now - 7 * DAY, now + DAY);
  const lastWeek = inWindow(now - 14 * DAY, now - 7 * DAY);
  const undated = sent.filter((a) => sentAt(a) === null).length;

  return {
    thisWeek,
    lastWeek,
    total: sent.length,
    undated,
    // Null rather than zero when there is nothing to compare against: a first
    // week has no previous week, and showing "0% change" would invent a
    // comparison out of an absence.
    change: lastWeek > 0 ? thisWeek - lastWeek : null,
  };
}

// THE BEST WEEK, AND WHY IT IS NOT A STREAK
//
// A streak punishes the week somebody was ill and then stops meaning
// anything, which is how every habit counter dies. A personal best only ever
// goes up, costs nothing to miss, and is the number a person actually quotes
// about their own search.
export function bestWeek(applications, now = Date.now()) {
  const sent = (Array.isArray(applications) ? applications.filter(Boolean) : []).filter(estEnvoyee);
  const stamps = sent.map(sentAt).filter((t) => t !== null).sort((a, b) => a - b);
  if (!stamps.length) return 0;
  let best = 0;
  for (let i = 0; i < stamps.length; i += 1) {
    // Every seven day window that starts on a real application: the windows
    // between two applications can never hold more than the one before them.
    let n = 0;
    for (let k = i; k < stamps.length && stamps[k] < stamps[i] + 7 * DAY; k += 1) n += 1;
    if (n > best) best = n;
  }
  return Math.min(best, sent.length);
}
