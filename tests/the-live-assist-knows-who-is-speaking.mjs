// The live assistant knows who is speaking.
//
// WHAT THIS REPLACES
//
// The assistant used to decide by silence alone: 900ms with nothing heard
// meant "the question is over", and the microphone was then stopped so the
// candidate reading the cues aloud could not be mistaken for a new question.
// Going deaf removed the loop and broke everything else. A recruiter pausing
// to think had their question cut in half, and the second half arrived at a
// microphone that was already off.
//
// The verdict now comes from the source: the meeting tab's audio track is the
// recruiter, the microphone is the candidate. This suite drives that rule
// with synthetic energy timelines, because the thing it has to prove, "those
// words were the candidate, not the recruiter", cannot be proved by recording
// one person.
//
// Each case is a script of frames: [tab RMS, mic RMS], one every 20ms, which
// is what an AnalyserNode gives the component.

import {
  creerOracle, ressembleAUnCasque, RECRUTEUR, CANDIDAT, PERSONNE,
  FIN_DE_QUESTION_MS, CASQUE_APRES_MS,
} from "../lib/quiParle.js";

const PAS_MS = 20;
const FORT = 0.3;      // clearly speech
const FOND = 0.005;    // room noise, under both thresholds
// The recruiter leaking back into the microphone through the speakers. Echo
// cancellation takes most of it, and what is left must never be read as the
// candidate: it is above the noise floor and still below the mic threshold.
const FUITE = 0.04;

// Runs a timeline and collects every event, with the verdict at each frame.
function jouer(images, oracle) {
  const o = oracle || creerOracle();
  const evenements = [];
  const verdicts = [];
  let t = 0;
  for (const [tab, mic] of images) {
    const { qui, evenement } = o.pas(tab, mic, t);
    verdicts.push(qui);
    if (evenement) evenements.push({ evenement, t });
    t += PAS_MS;
  }
  return { evenements, verdicts, oracle: o, duree: t };
}

// Builds N milliseconds of a given pair.
function pendant(ms, tab, mic) {
  const n = Math.round(ms / PAS_MS);
  return Array.from({ length: n }, () => [tab, mic]);
}

export async function run() {
  const failures = [];

  // --- 1. The recruiter asks, and only then is the question complete -------
  {
    const { evenements } = jouer([
      ...pendant(200, FOND, FOND),
      ...pendant(1800, FORT, FUITE),        // they ask, leaking into the mic
      ...pendant(2000, FOND, FOND),         // they stop
    ]);
    const noms = evenements.map((e) => e.evenement).join(",");
    if (noms !== "debut,fin") {
      failures.push("a plain question should read as debut then fin, got: " + (noms || "nothing"));
    }
    const fin = evenements.find((e) => e.evenement === "fin");
    // It must not fire before the window, and must fire soon after it.
    const attendu = 200 + 1800 + FIN_DE_QUESTION_MS;
    if (fin && Math.abs(fin.t - attendu) > 120) {
      failures.push("the question ended at " + fin.t + "ms, expected about " + attendu + "ms");
    }
  }

  // --- 2. A pause for thought does not cut the question in half -----------
  //
  // This is the case the old 900ms timer got wrong: "So... tell me about a
  // time you handled a difficult customer". The gap after "So" is longer than
  // 900ms and shorter than the window here, so it must stay ONE question.
  {
    const { evenements } = jouer([
      ...pendant(400, FORT, FUITE),         // "So"
      ...pendant(1100, FOND, FOND),         // thinking, longer than the old 900ms
      ...pendant(1600, FORT, FUITE),        // the rest of the question
      ...pendant(2000, FOND, FOND),
    ]);
    const noms = evenements.map((e) => e.evenement).join(",");
    if (noms !== "debut,fin") {
      failures.push(
        "a 1100ms pause for thought must not split the question. Expected debut,fin and got: "
        + (noms || "nothing") + ". This is exactly what the 900ms timer did wrong."
      );
    }
    const fin = evenements.find((e) => e.evenement === "fin");
    // The end must be measured from the LAST word, not the first silence.
    if (fin && fin.t < 400 + 1100 + 1600) {
      failures.push("the question ended at " + fin.t + "ms, before the recruiter had finished speaking");
    }
  }

  // --- 3. The candidate answering is never taken for a question -----------
  //
  // The loop the whole design exists to prevent: the candidate reads the cues
  // out loud. The microphone is hot, the tab is silent, and nothing about
  // that may look like the recruiter.
  {
    const { evenements, verdicts, oracle, duree } = jouer([
      ...pendant(1200, FORT, FUITE),        // the recruiter asks
      ...pendant(2000, FOND, FOND),         // they stop, cues appear
      ...pendant(4000, FOND, FORT),         // the candidate answers, at length
    ]);
    const apresLaFin = evenements.filter((e) => e.t > 1200 + FIN_DE_QUESTION_MS);
    if (apresLaFin.length) {
      failures.push(
        "the candidate answering raised " + apresLaFin.map((e) => e.evenement).join(",")
        + ". Their own answer must never start or continue a question."
      );
    }
    // And the verdict during the answer says so by name.
    const pendantLaReponse = verdicts.slice(Math.round((1200 + 2000) / PAS_MS) + 20);
    if (pendantLaReponse.some((v) => v !== CANDIDAT)) {
      failures.push("while the candidate speaks the verdict must be " + CANDIDAT);
    }
    // The gate the component consults must be shut.
    if (oracle.ecouteLeRecruteur(duree)) {
      failures.push("the transcript gate is open while the candidate is the one speaking");
    }
  }

  // --- 4. A second question arrives on its own, with no tap ---------------
  {
    const { evenements } = jouer([
      ...pendant(1200, FORT, FUITE),        // first question
      ...pendant(2000, FOND, FOND),         // ends
      ...pendant(3000, FOND, FORT),         // the candidate answers
      ...pendant(1200, FOND, FOND),
      ...pendant(1400, FORT, FUITE),        // the recruiter asks again
      ...pendant(2000, FOND, FOND),
    ]);
    const noms = evenements.map((e) => e.evenement).join(",");
    if (!/^debut,fin,(debut|reprise),fin$/.test(noms)) {
      failures.push(
        "a follow-up question must be picked up without the person touching anything. Got: " + noms
      );
    }
  }

  // --- 5. Carrying on right after the cues refreshes the same question ----
  {
    const { evenements } = jouer([
      ...pendant(1200, FORT, FUITE),
      ...pendant(2000, FOND, FOND),         // cues shown
      ...pendant(800, FORT, FUITE),         // "and tell me why"
      ...pendant(2000, FOND, FOND),
    ]);
    const noms = evenements.map((e) => e.evenement).join(",");
    if (noms !== "debut,fin,reprise,fin") {
      failures.push(
        "the recruiter carrying on within the window is the same question, expected "
        + "debut,fin,reprise,fin and got: " + noms
      );
    }
  }

  // --- 6. Leakage through the speakers is not the candidate ---------------
  //
  // Without this the assistant would decide the candidate was talking every
  // time the recruiter did, and shut its own gate on the question.
  {
    const { verdicts } = jouer([...pendant(1500, FORT, FUITE)]);
    if (verdicts.some((v) => v !== RECRUTEUR)) {
      failures.push(
        "while the recruiter speaks and leaks into the microphone, the verdict must stay "
        + RECRUTEUR + "; got " + [...new Set(verdicts)].join("/")
      );
    }
  }

  // --- 7. Silence is silence ----------------------------------------------
  {
    const { verdicts, evenements } = jouer([...pendant(3000, FOND, FOND)]);
    if (verdicts.some((v) => v !== PERSONNE)) {
      failures.push("an empty room must read as " + PERSONNE);
    }
    if (evenements.length) {
      failures.push("silence alone raised " + evenements.map((e) => e.evenement).join(","));
    }
  }

  // --- 8. Headphones are named, not left looking like a breakage ----------
  //
  // Capturing the tab works whatever they listen on, so the recruiter is
  // still detected; the microphone simply never hears the words. That is a
  // pair of headphones, and it must be said rather than shown as silence.
  if (!ressembleAUnCasque(CASQUE_APRES_MS + 500, "")) {
    failures.push("a recruiter speaking with no words heard must be reported as headphones");
  }
  if (ressembleAUnCasque(CASQUE_APRES_MS + 500, "tell me about a time")) {
    failures.push("words were heard, so this is not headphones");
  }
  if (ressembleAUnCasque(400, "")) {
    failures.push("a short burst with no words is not yet enough to call it headphones");
  }

  return failures;
}
