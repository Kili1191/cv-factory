// lib/activityLog.js
//
// Journal d'activite : garde une trace de TOUT ce que l'utilisateur a fait,
// pour qu'il ne perde jamais le fil de sa progression entre deux sessions.
//
// Le reste de l'app persiste deja des ETATS (le CV courant, les versions,
// les messages du coach). Ce qui manquait, c'est le RECIT : quelle action a
// eu lieu, quand, et ce qu'elle a change. C'est ce que ce module stocke.
//
// Stockage : localStorage, append-only, plafonne a MAX_ENTRIES.
// Aucune donnee ne part sur le reseau.
//
// Usage :
//   import { logActivity, ACT } from "./activityLog";
//   logActivity(ACT.COACH_APPLIED, "2 bullets reecrits", { source: "coach" });

const STORAGE_KEY = "cvf_activity";
const MAX_ENTRIES = 400;
const SCHEMA_VERSION = 1;

// Types d'evenements. Chaque type porte une categorie, qui sert au
// regroupement et au filtrage dans l'UI.
export const ACT = {
  CV_IMPORTED:      "cv_imported",
  CV_GENERATED:     "cv_generated",
  CV_EDITED:        "cv_edited",
  CV_RESET:         "cv_reset",
  CV_CLEANED:       "cv_cleaned",
  COACH_APPLIED:    "coach_applied",
  ADJUST_APPLIED:   "adjust_applied",
  UNDO:             "undo",
  VERSION_SAVED:    "version_saved",
  VERSION_RESTORED: "version_restored",
  AUDIT_RUN:        "audit_run",
  MATCH_RUN:        "match_run",
  INTERVIEW_RUN:    "interview_run",
  TRANSLATE_RUN:    "translate_run",
  LETTER_RUN:       "letter_run",
  EXPORT_PDF:       "export_pdf",
  EXPORT_LINKEDIN:  "export_linkedin",
  APPLICATION_ADDED:"application_added",
  THEME_CHANGED:    "theme_changed",
};

const CATEGORY_BY_TYPE = {
  [ACT.CV_IMPORTED]: "cv",
  [ACT.CV_GENERATED]: "cv",
  [ACT.CV_EDITED]: "cv",
  [ACT.CV_RESET]: "cv",
  [ACT.CV_CLEANED]: "cv",
  [ACT.COACH_APPLIED]: "ai",
  [ACT.ADJUST_APPLIED]: "ai",
  [ACT.UNDO]: "cv",
  [ACT.VERSION_SAVED]: "version",
  [ACT.VERSION_RESTORED]: "version",
  [ACT.AUDIT_RUN]: "ai",
  [ACT.MATCH_RUN]: "ai",
  [ACT.INTERVIEW_RUN]: "ai",
  [ACT.TRANSLATE_RUN]: "ai",
  [ACT.LETTER_RUN]: "ai",
  [ACT.EXPORT_PDF]: "export",
  [ACT.EXPORT_LINKEDIN]: "export",
  [ACT.APPLICATION_ADDED]: "application",
  [ACT.THEME_CHANGED]: "design",
};

export function categoryOf(type) {
  return CATEGORY_BY_TYPE[type] || "other";
}

// ============================================================================
// Stockage
// ============================================================================
function readRaw() {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v ? JSON.parse(v) : null;
  } catch (e) {
    return null;
  }
}

function writeRaw(payload) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (e) {
    // Quota atteint : on retente une fois avec un journal reduit de moitie
    // plutot que de perdre l'historique en entier.
    try {
      const half = payload.entries.slice(-Math.floor(MAX_ENTRIES / 2));
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...payload, entries: half })
      );
      return true;
    } catch (e2) {
      return false;
    }
  }
}

/** Toutes les entrees, de la plus ANCIENNE a la plus recente. */
export function readActivity() {
  const raw = readRaw();
  if (!raw || !Array.isArray(raw.entries)) return [];
  return raw.entries.filter(e => e && typeof e === "object" && e.ts);
}

/** Efface le journal. */
export function clearActivity() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}

let seq = 0;

/**
 * Enregistre une action.
 * @param {string} type    une valeur de ACT
 * @param {string} label   resume lisible ("2 bullets reecrits")
 * @param {object} meta    contexte libre et court (source, score, format...)
 * @returns {object|null}  l'entree ecrite, ou null si le stockage est indispo
 */
export function logActivity(type, label, meta = {}) {
  if (typeof window === "undefined") return null;
  if (!type) return null;

  const entries = readActivity();
  seq += 1;
  const entry = {
    id: String(Date.now()) + "-" + seq,
    ts: Date.now(),
    type: String(type),
    category: categoryOf(type),
    label: label == null ? "" : String(label).slice(0, 300),
    meta: sanitizeMeta(meta),
  };

  entries.push(entry);
  const trimmed = entries.length > MAX_ENTRIES
    ? entries.slice(entries.length - MAX_ENTRIES)
    : entries;

  return writeRaw({ v: SCHEMA_VERSION, entries: trimmed }) ? entry : null;
}

// Le meta doit rester petit et serialisable : le journal vit en localStorage
// a cote du CV, on ne veut pas qu'il grossisse sans limite.
function sanitizeMeta(meta) {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return {};
  const out = {};
  let kept = 0;
  for (const k of Object.keys(meta)) {
    if (kept >= 8) break;
    const v = meta[k];
    if (v === null || v === undefined) continue;
    if (typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
      kept += 1;
    } else if (typeof v === "string") {
      out[k] = v.slice(0, 160);
      kept += 1;
    }
  }
  return out;
}

// ============================================================================
// Lecture pour l'UI
// ============================================================================

/** Cle de jour locale ("2026-08-19") pour regrouper les entrees. */
export function dayKey(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Entrees groupees par jour, du jour le PLUS RECENT au plus ancien,
 * et a l'interieur d'un jour de l'action la plus recente a la plus ancienne.
 * @returns {Array<{ day: string, entries: Array }>}
 */
export function groupActivityByDay(entries) {
  const list = Array.isArray(entries) ? entries : readActivity();
  const byDay = new Map();
  for (const e of list) {
    const k = dayKey(e.ts);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k).push(e);
  }
  return [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, es]) => ({
      day,
      entries: es.slice().sort((a, b) => b.ts - a.ts),
    }));
}

/**
 * Chiffres de progression, pour la ligne de resume en haut du journal.
 */
export function activityStats(entries) {
  const list = Array.isArray(entries) ? entries : readActivity();
  const byCategory = {};
  for (const e of list) {
    const c = e.category || "other";
    byCategory[c] = (byCategory[c] || 0) + 1;
  }
  const days = new Set(list.map(e => dayKey(e.ts)));
  return {
    total: list.length,
    days: days.size,
    byCategory,
    firstTs: list.length ? list[0].ts : null,
    lastTs: list.length ? list[list.length - 1].ts : null,
  };
}

/**
 * Reprise de session : de quoi dire "voila ou tu en etais".
 * Renvoie null si le journal est vide.
 */
export function lastSessionRecap(entries, locale = "fr") {
  const list = Array.isArray(entries) ? entries : readActivity();
  if (list.length === 0) return null;

  const last = list[list.length - 1];
  const lastDay = dayKey(last.ts);
  const sameDay = list.filter(e => dayKey(e.ts) === lastDay);
  const isEn = locale === "en";

  return {
    ts: last.ts,
    label: last.label,
    type: last.type,
    actionsThatDay: sameDay.length,
    text: isEn
      ? `Last time: ${last.label || last.type} (${sameDay.length} action${sameDay.length > 1 ? "s" : ""} that day)`
      : `La derniere fois : ${last.label || last.type} (${sameDay.length} action${sameDay.length > 1 ? "s" : ""} ce jour-la)`,
  };
}

/** Export texte du journal, pour que l'utilisateur puisse le garder. */
export function exportActivityText(entries, locale = "fr") {
  const groups = groupActivityByDay(entries);
  const isEn = locale === "en";
  const lines = [isEn ? "ACTIVITY LOG" : "JOURNAL D'ACTIVITE", ""];
  for (const g of groups) {
    lines.push(g.day);
    for (const e of g.entries) {
      const d = new Date(e.ts);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      lines.push(`  ${hh}:${mm}  ${e.label || e.type}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
