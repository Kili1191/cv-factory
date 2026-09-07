// WHAT BREAKS REACHES THE OWNER BEFORE A SCREENSHOT DOES
//
// Until now a broken export or a JavaScript error on the live site was
// learnt from the founder's own screenshot, hours later. This module keeps
// a short memory of what went wrong in the page and sends it to
// /api/incident, where the function logs it (and forwards it to a webhook
// when one is configured). Nothing personal travels: no CV text, no name,
// no e-mail, no address. An incident is a kind, a message cut short, the
// path of the page, the build id, a short device string and the screen
// size. The person can add a note and, if they tick the box, the SHAPE
// of their CV: section names and counts, never the words.
//
// Two sources feed it: the window's own error and unhandledrejection
// events, installed once, and explicit signals from places that already
// catch their failure quietly (the export falling back to the picture,
// the AI giving up after its retries). Sending is debounced so a loop of
// errors costs one request every ten seconds, and the route itself has a
// ceiling in middleware.js.

const CLE = "nuvi_incidents";
const MAX_GARDES = 20;
const MAX_MESSAGE = 300;
const DELAI_ENVOI_MS = 10_000;

let installee = false;
let minuterie = null;
let enAttente = [];

function maintenant() { return new Date().toISOString(); }

function contexte() {
  if (typeof window === "undefined") return {};
  const nav = window.navigator || {};
  return {
    ou: String(window.location && window.location.pathname || ""),
    build: process.env.NEXT_PUBLIC_BUILD_ID || "unknown",
    appareil: String(nav.userAgent || "").replace(/\([^)]*\)/g, "").trim().slice(0, 80),
    ecran: (window.innerWidth || 0) + "x" + (window.innerHeight || 0),
    langue: String(nav.language || ""),
  };
}

function lireGardes() {
  try { return JSON.parse(window.localStorage.getItem(CLE) || "[]"); } catch (e) { return []; }
}

function garder(incident) {
  try {
    const liste = lireGardes();
    liste.push(incident);
    window.localStorage.setItem(CLE, JSON.stringify(liste.slice(-MAX_GARDES)));
  } catch (e) { /* storage full or blocked: memory still has it */ }
}

/** The incidents kept on this device, newest last. For the report sheet. */
export function incidentsGardes() {
  if (typeof window === "undefined") return [];
  return lireGardes();
}

async function poster(corps) {
  if (typeof fetch !== "function") return false;
  try {
    const r = await fetch("/api/incident", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corps),
      keepalive: true,
    });
    return r.ok;
  } catch (e) { return false; }
}

function programmerEnvoi() {
  if (minuterie) return;
  minuterie = setTimeout(() => {
    minuterie = null;
    const lot = enAttente.splice(0, enAttente.length);
    if (lot.length) poster({ incidents: lot });
  }, DELAI_ENVOI_MS);
}

/**
 * Record one incident and queue it for sending. `genre` names what broke
 * ("erreur", "promesse", "export_photo_secours", "export_echec",
 * "ia_echec"); `message` is cut to 300 characters and never carries CV
 * text by construction: callers pass error messages, not content.
 */
export function signaler(genre, message, extra = {}) {
  if (typeof window === "undefined") return null;
  const incident = {
    quand: maintenant(),
    genre: String(genre || "erreur").slice(0, 40),
    message: String(message || "").replace(/\s+/g, " ").slice(0, MAX_MESSAGE),
    ...contexte(),
    ...extra,
  };
  garder(incident);
  enAttente.push(incident);
  programmerEnvoi();
  return incident;
}

/** Install the window listeners once. Safe to call many times. */
export function installerLaVigie() {
  if (installee || typeof window === "undefined") return;
  installee = true;
  window.addEventListener("error", (e) => {
    const m = (e && e.message) || (e && e.error && e.error.message) || "error";
    // A script blocked by the browser reports "Script error." with nothing
    // else: not ours to fix, not worth a line.
    if (/^Script error\.?$/.test(m)) return;
    signaler("erreur", m, { source: String(e && e.filename || "").split("/").slice(-1)[0].slice(0, 60) });
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e && e.reason;
    const m = (r && r.message) || (typeof r === "string" ? r : "unhandled rejection");
    signaler("promesse", m);
  });
}

/**
 * The shape of a CV, for a report: which sections exist and how full they
 * are, without a single word of content. What a maintainer needs to
 * reproduce a layout problem; nothing a recruiter or a stranger could use.
 */
export function formeDuCv(cv) {
  if (!cv || typeof cv !== "object") return null;
  const n = (a) => (Array.isArray(a) ? a.length : 0);
  const l = (s) => (typeof s === "string" ? s.length : 0);
  return {
    name: l(cv.name) > 0, title: l(cv.title) > 0, email: l(cv.email) > 0, phone: l(cv.phone) > 0,
    summary: l(cv.summary),
    experience: (Array.isArray(cv.experience) ? cv.experience : []).map((e) => ({
      title: l(e && e.title), company: l(e && e.company), bullets: n(e && e.bullets),
      bulletChars: (Array.isArray(e && e.bullets) ? e.bullets : []).reduce((t, b) => t + l(b), 0),
    })),
    education: n(cv.education), skills: n(cv.skills), languages: n(cv.languages),
    certifications: n(cv.certifications),
  };
}

/**
 * A report written by the person: a note, optionally the CV shape, and
 * the incidents this device kept. Sent at once, not debounced.
 */
export async function envoyerUnRapport({ note, forme } = {}) {
  return poster({
    rapport: true,
    note: String(note || "").slice(0, 2000),
    forme: forme || null,
    incidents: incidentsGardes().slice(-MAX_GARDES),
    ...contexte(),
  });
}
