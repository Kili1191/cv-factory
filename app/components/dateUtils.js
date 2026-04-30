// CV Factory v17 - Date utilities for chronology analysis (Gap Repair).
// Pure helpers (no React, no DOM). Importable from any component.
//
// Goals:
//   1. Parse common date formats found in CVs (FR/EN, MM/YYYY, YYYY-MM, "Jan 2020", "2020", etc.)
//   2. Detect gaps between experiences (>=1 month threshold)
//   3. Compute strategies to make gaps disappear without lying
//
// All dates internally use { year, month } where month is 1..12, or null if not specified.
// "Present" / "en cours" / etc. is represented as { year: <currentYear>, month: <currentMonth>, present: true }.

const FR_MONTHS = {
  janvier: 1, fevrier: 2, février: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, août: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12, décembre: 12,
  janv: 1, fevr: 2, févr: 2, sept: 9, oct: 10, nov: 11, dec: 12, déc: 12,
};
const EN_MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const PRESENT_TOKENS = [
  "present", "présent", "now", "today", "aujourd", "en cours",
  "actuel", "actuelle", "actuellement", "current", "ongoing",
];

function _isPresentToken(s) {
  if (!s) return false;
  const lower = s.toLowerCase().trim();
  return PRESENT_TOKENS.some(t => lower.indexOf(t) !== -1);
}

// Parses a single date token. Returns { year, month, present } or null if unparsable.
// Examples accepted:
//   "01/2020"      -> { year: 2020, month: 1 }
//   "2020-01"      -> { year: 2020, month: 1 }
//   "2020"         -> { year: 2020, month: null }
//   "Jan 2020"     -> { year: 2020, month: 1 }
//   "Janvier 2020" -> { year: 2020, month: 1 }
//   "01-2020"      -> { year: 2020, month: 1 }
//   "present"      -> { year: now, month: now, present: true }
export function parseDateToken(token) {
  if (!token) return null;
  const s = String(token).trim();
  if (!s) return null;

  // Present / current
  if (_isPresentToken(s)) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, present: true };
  }

  // MM/YYYY or M/YYYY
  let m = s.match(/^(\d{1,2})\s*[\/\-]\s*(\d{4})$/);
  if (m) {
    const month = parseInt(m[1], 10);
    const year = parseInt(m[2], 10);
    if (month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
      return { year, month };
    }
  }

  // YYYY-MM or YYYY/MM
  m = s.match(/^(\d{4})\s*[\/\-]\s*(\d{1,2})$/);
  if (m) {
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    if (month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
      return { year, month };
    }
  }

  // YYYY only
  m = s.match(/^(\d{4})$/);
  if (m) {
    const year = parseInt(m[1], 10);
    if (year >= 1900 && year <= 2100) {
      return { year, month: null };
    }
  }

  // "Mois YYYY" (FR) or "Month YYYY" (EN)
  m = s.match(/^([a-zA-ZéûôîàâèêëïüùçÉÉÉ]+)\.?\s+(\d{4})$/i);
  if (m) {
    const monthStr = m[1].toLowerCase().replace(/\./g, "");
    const year = parseInt(m[2], 10);
    const monthNum = FR_MONTHS[monthStr] || EN_MONTHS[monthStr];
    if (monthNum && year >= 1900 && year <= 2100) {
      return { year, month: monthNum };
    }
  }

  return null;
}

// Parses a "period" string like "01/2019 - 12/2020" or "2019 - present".
// Returns { start, end } where each is a parsed date or null.
// Accepts separators: ASCII hyphen, em dash (U+2014), en dash (U+2013), "to", "a".
export function parsePeriod(period) {
  if (!period) return { start: null, end: null };
  const s = String(period).trim();
  if (!s) return { start: null, end: null };

  // Replace fancy dashes with regular dash, normalize separators.
  const normalized = s
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+to\s+/gi, " - ")
    .replace(/\s+a\s+/gi, " - ")
    .replace(/\s+à\s+/gi, " - ");

  // Split on " - " (with surrounding spaces required to avoid splitting "01-2020").
  const parts = normalized.split(/\s+-\s+/);
  if (parts.length === 2) {
    return {
      start: parseDateToken(parts[0]),
      end: parseDateToken(parts[1]),
    };
  }

  // Single date (only start, no end)
  const single = parseDateToken(s);
  if (single) return { start: single, end: null };

  return { start: null, end: null };
}

// Returns the difference in months between two dates (date1 must be before date2).
// If a date has no month, treats it as month=6 (mid-year) for pessimistic estimation.
// Returns 0 if any date is null.
export function diffMonths(d1, d2) {
  if (!d1 || !d2) return 0;
  const m1 = d1.month || 6;
  const m2 = d2.month || 6;
  return (d2.year - d1.year) * 12 + (m2 - m1);
}

// Sorts experiences by start date (earliest first). Unparsable ones go to the end.
export function sortExperiencesByStart(experiences) {
  return [...experiences]
    .map((e, idx) => ({ exp: e, idx, period: parsePeriod(e.period || "") }))
    .sort((a, b) => {
      const sa = a.period.start;
      const sb = b.period.start;
      if (!sa && !sb) return a.idx - b.idx;
      if (!sa) return 1;
      if (!sb) return -1;
      const ya = sa.year + (sa.month || 6) / 12;
      const yb = sb.year + (sb.month || 6) / 12;
      return ya - yb;
    });
}

// Detects gaps >= thresholdMonths between consecutive experiences (sorted by start date).
// Returns array of { gap: { start, end, months }, beforeExp, afterExp, beforeIdx, afterIdx }.
// Only counts experiences that have BOTH parsable start AND end dates.
// "present" end date counts (no gap can be after a present-running experience).
export function detectGaps(experiences, thresholdMonths = 1) {
  if (!Array.isArray(experiences) || experiences.length < 2) return [];
  const sorted = sortExperiencesByStart(experiences);

  const gaps = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (!a.period.end || !b.period.start) continue;
    // If a is "present", no gap possible after.
    if (a.period.end.present) continue;
    const months = diffMonths(a.period.end, b.period.start);
    // Only gaps strictly greater than thresholdMonths months.
    // 1 month threshold means "any visible gap >= 1 month gets flagged".
    if (months >= thresholdMonths) {
      gaps.push({
        gap: {
          start: a.period.end,
          end: b.period.start,
          months,
        },
        beforeExp: a.exp,
        afterExp: b.exp,
        beforeIdx: a.idx,
        afterIdx: b.idx,
      });
    }
  }
  return gaps;
}

// Returns total count of experiences with unparsable period.
export function countUnparsable(experiences) {
  if (!Array.isArray(experiences)) return 0;
  let n = 0;
  experiences.forEach(e => {
    if (!e.period || !String(e.period).trim()) return;
    const p = parsePeriod(e.period);
    if (!p.start && !p.end) n++;
  });
  return n;
}

// Format a date object as "YYYY" (year only) or "MM/YYYY" depending on options.
export function formatDate(d, mode = "auto") {
  if (!d) return "";
  if (d.present) {
    return "present";
  }
  if (mode === "year" || (mode === "auto" && !d.month)) {
    return String(d.year);
  }
  const mm = String(d.month).padStart(2, "0");
  return mm + "/" + d.year;
}

// Reformats a "MM/YYYY - MM/YYYY" period to "YYYY - YYYY" (or "YYYY" if same year).
export function reformatPeriodToYearOnly(period) {
  const p = parsePeriod(period);
  if (!p.start && !p.end) return period; // unparsable: leave alone
  const y1 = p.start ? p.start.year : null;
  const y2 = p.end && !p.end.present ? p.end.year
           : p.end && p.end.present ? "present"
           : null;
  if (y1 == null && y2 == null) return period;
  if (y1 != null && y2 == null) return String(y1);
  if (y1 == null) return String(y2);
  if (y1 === y2) return String(y1);
  return y1 + " - " + y2;
}

// Strategy analysis: would the year-only format make all gaps disappear?
// Returns { applicable, allDisappear, beforeGaps, afterGaps }.
export function analyzeYearOnlyStrategy(experiences, thresholdMonths = 1) {
  const beforeGaps = detectGaps(experiences, thresholdMonths);
  if (beforeGaps.length === 0) return { applicable: false, allDisappear: false, beforeGaps: [], afterGaps: [] };

  // Simulate the reformatting: replace each period with its year-only version.
  const reformatted = experiences.map(e => ({
    ...e,
    period: reformatPeriodToYearOnly(e.period || ""),
  }));
  const afterGaps = detectGaps(reformatted, thresholdMonths);
  return {
    applicable: true,
    allDisappear: afterGaps.length === 0,
    beforeGaps,
    afterGaps,
  };
}

// Find groups of consecutive short experiences (<= 12 months each) that could be merged.
// Returns array of { indices, totalSpan, label } where indices is an array of cv.experience
// indices that could be grouped.
export function findGroupingOpportunities(experiences) {
  if (!Array.isArray(experiences) || experiences.length < 2) return [];
  const sorted = sortExperiencesByStart(experiences);

  const groups = [];
  let current = [];
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i];
    if (!e.period.start || !e.period.end) {
      if (current.length >= 2) groups.push(current);
      current = [];
      continue;
    }
    if (e.period.end.present) {
      if (current.length >= 2) groups.push(current);
      current = [];
      continue;
    }
    const duration = diffMonths(e.period.start, e.period.end);
    if (duration <= 12) {
      current.push(e);
    } else {
      if (current.length >= 2) groups.push(current);
      current = [];
    }
  }
  if (current.length >= 2) groups.push(current);

  return groups.map(g => ({
    indices: g.map(e => e.idx),
    startYear: g[0].period.start.year,
    endYear: g[g.length - 1].period.end.year,
    count: g.length,
  }));
}
