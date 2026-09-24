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
  creerOracle, ressembleAUnCasque, ongletSansSon, RECRUTEUR, CANDIDAT, PERSONNE,
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

// SPEECH IS NOT A CONTINUOUS NOISE, AND THE FIXTURE MUST NOT PRETEND IT IS
//
// These cases first described a question as a flat run of one loudness for
// two seconds. Nothing says that except a sine tone: between two syllables,
// and between two words, the energy falls back to the room for a few tens of
// milliseconds. That matters, because the oracle finds its quiet level by
// taking the smallest loudness of the last several seconds, and a fixture
// with no gaps hands it speech as the definition of quiet.
//
// A flat fixture would have let a broken threshold pass, and it did: the
// version measured against a fixed 0.02 looked perfect here while a meeting
// tab with an ordinary room tone never produced a single cue.
//
// 120ms voiced, 60ms of gap: slower than real syllables, which makes it the
// harder case, and still far under the 300ms hangover that holds the verdict
// steady across a gap.
function parole(ms, tab, mic, fond) {
  const f = [];
  const n = Math.round(ms / PAS_MS);
  for (let i = 0; i < n; i += 1) {
    const creux = (i % 9) >= 6;            // 120ms on, 60ms off
    f.push(creux ? [fond, fond] : [tab, mic]);
  }
  return f;
}

export async function run() {
  const failures = [];

  // --- 1. The recruiter asks, and only then is the question complete -------
  {
    const { evenements } = jouer([
      ...pendant(200, FOND, FOND),
      ...parole(1800, FORT, FUITE, FOND),   // they ask, leaking into the mic
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
      ...parole(400, FORT, FUITE, FOND),    // "So"
      ...pendant(1100, FOND, FOND),         // thinking, longer than the old 900ms
      ...parole(1600, FORT, FUITE, FOND),   // the rest of the question
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
      ...parole(1200, FORT, FUITE, FOND),   // the recruiter asks
      ...pendant(2000, FOND, FOND),         // they stop, cues appear
      ...parole(4000, FOND, FORT, FOND),    // the candidate answers, at length
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
      ...parole(1200, FORT, FUITE, FOND),   // first question
      ...pendant(2000, FOND, FOND),         // ends
      ...parole(3000, FOND, FORT, FOND),    // the candidate answers
      ...pendant(1200, FOND, FOND),
      ...parole(1400, FORT, FUITE, FOND),   // the recruiter asks again
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
      ...parole(1200, FORT, FUITE, FOND),
      ...pendant(2000, FOND, FOND),         // cues shown
      ...parole(800, FORT, FUITE, FOND),    // "and tell me why"
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
    const { verdicts } = jouer([...parole(1500, FORT, FUITE, FOND)]);

    // What must never happen, at any moment: the leak reading as the
    // candidate. That would shut the gate on the recruiter's own question.
    if (verdicts.includes(CANDIDAT)) {
      failures.push(
        "the recruiter leaking through the speakers was read as the candidate. "
        + "Their question would be dropped as if it were the answer."
      );
    }

    // The first frames are allowed to say "nobody", and that is not a defect
    // to assert away. The quiet level is the smallest loudness seen so far,
    // so before the first gap between syllables the only thing ever measured
    // is speech, and speech cannot stand out from itself. One gap is enough,
    // which is under 200ms here, and it never comes back for the rest of the
    // call. The alternative, a floor that starts low and climbs, reads a
    // noisy room as speech for tens of seconds and never recovers.
    const apresReglage = verdicts.slice(Math.round(300 / PAS_MS));
    if (apresReglage.some((v) => v !== RECRUTEUR)) {
      failures.push(
        "once the quiet level is settled the verdict must stay " + RECRUTEUR
        + " throughout the question; got " + [...new Set(apresReglage)].join("/")
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

  // --- 7 bis. A meeting tab is never silent ------------------------------
  //
  // THE FAILURE THIS EXISTS FOR
  //
  // The first version of the oracle called it speech above a fixed 0.02. The
  // recruiter's microphone is open, so their room arrives with their voice: a
  // fan, a keyboard, an office. Measured against a steady room tone of 0.025
  // the recruiter never stopped talking, the question never ended, and NOT
  // ONE CUE EVER APPEARED. Silently: no error, no message, an assistant that
  // sits there. Every case above passed at the time, because every one of
  // them assumed a digitally silent tab between questions.
  //
  // Four rooms, from a padded studio to a noisy office. All four have to
  // behave identically, because the quiet level is measured and not assumed.
  for (const fond of [0.002, 0.01, 0.025, 0.05]) {
    const { evenements } = jouer([
      ...pendant(400, fond, fond),
      ...parole(1800, FORT, FUITE, fond),
      ...pendant(2500, fond, fond),        // they stop, the room does not
      ...parole(2000, fond, FORT, fond),   // the candidate answers
    ]);
    const noms = evenements.map((e) => e.evenement).join(",");
    if (noms !== "debut,fin") {
      failures.push(
        "with a room tone of " + fond + " the question came out as "
        + (noms || "nothing") + " instead of debut,fin. "
        + (noms === "debut"
          ? "The question never ends, so no cue is ever shown and nothing says why."
          : "The room itself is being read as somebody speaking.")
      );
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

  // --- 9. A tab that carries no call is named, not left silent ------------
  //
  // Following the call means picking a tab, and picking is a chance to pick
  // wrong: the wrong tab, or a phone interview where no meeting tab exists.
  // The oracle is then CORRECT that the recruiter never speaks, so it drops
  // every word as the candidate's own answer, forever, and says nothing. The
  // headphone message cannot cover this one, because that fires only after
  // the tab has reported somebody speaking.
  {
    const o = creerOracle();
    let t = 0, parleAuMicro = 0, ongletAParle = false;
    // Six seconds of the candidate talking to a tab that carries nothing.
    for (const [tab, mic] of [...parole(6500, FOND, FORT, FOND)]) {
      const { qui } = o.pas(tab, mic, t);
      if (qui === RECRUTEUR) ongletAParle = true;
      if (qui === CANDIDAT) parleAuMicro += PAS_MS;
      t += PAS_MS;
    }
    if (ongletAParle) failures.push("a silent tab was read as somebody speaking");
    if (!ongletSansSon(t, ongletAParle, parleAuMicro)) {
      failures.push(
        "six seconds of speech with nothing on the tab is not reported. The "
        + "assistant drops every word and never says why, which is what a phone "
        + "interview looks like if someone presses Follow the call."
      );
    }
  }
  {
    // And it must stay quiet when the tab IS carrying the call, otherwise it
    // would cry wolf over every pause between two questions.
    const o = creerOracle();
    let t = 0, parleAuMicro = 0, ongletAParle = false;
    for (const [tab, mic] of [
      ...parole(1500, FORT, FUITE, FOND),
      ...pendant(3000, FOND, FOND),
      ...parole(4000, FOND, FORT, FOND),
    ]) {
      const { qui } = o.pas(tab, mic, t);
      if (qui === RECRUTEUR) ongletAParle = true;
      if (qui === CANDIDAT) parleAuMicro += PAS_MS;
      t += PAS_MS;
    }
    if (ongletSansSon(t, ongletAParle, parleAuMicro)) {
      failures.push("a working call was reported as a tab with no sound");
    }
  }
  // A quiet room is not a mistake: nobody has said anything yet.
  if (ongletSansSon(20000, false, 0)) {
    failures.push("silence alone was reported as a tab with no sound");
  }

  return failures;
}
