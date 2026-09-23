// WHO IS SPEAKING, DECIDED BY SOURCE AND NOT BY VOICE
//
// The live assistant has to answer one question every few hundred
// milliseconds: are these words the recruiter asking, or the candidate
// answering? Getting it wrong is not cosmetic. The candidate reads the cues
// out loud, the microphone hears that, takes it for a new question, and
// replaces on screen the very thing being read. The more the assistant is
// used, the more it breaks.
//
// The first version answered by going deaf: the microphone was stopped the
// moment cues were sent, and restarted by hand. That removes the loop but
// costs everything else. A recruiter who pauses to think for a second has
// their question cut in half, and the half that follows is never heard,
// because the microphone is already off. A follow-up question reaches
// nothing at all.
//
// NO VOICE IS RECOGNISED HERE. On a video call the two voices are not mixed
// at their origin: the recruiter exists as an audio track inside the meeting
// tab, before it ever reaches a speaker, and the browser hands that track
// over. So the question stops being "whose voice is this" (a model, a server,
// a delay) and becomes "which stream carries energy right now" (a number, on
// the device, every 20ms).
//
//   tab audio has energy            -> the recruiter is speaking
//   only the microphone has energy  -> the candidate is speaking
//   neither                         -> silence
//
// The tab always wins when both carry energy. With the call on speakers the
// microphone hears the recruiter too, faintly, through echo cancellation;
// the tab track is the clean copy, so it decides.
//
// This module is deliberately pure: it takes two numbers and a clock and
// returns a verdict. Everything that needs a browser (getDisplayMedia, the
// analyser nodes, the RMS) stays in the component, and the rule itself can be
// driven by a synthetic timeline in a test, which is the only way to prove
// "that was the candidate, not the recruiter" without recording two humans.

export const RECRUTEUR = "recruteur";
export const CANDIDAT = "candidat";
export const PERSONNE = "personne";

// Speech is not a continuous noise: between two syllables the energy drops to
// nothing for tens of milliseconds. Without a hangover the verdict would flap
// several times inside a single word. 300ms bridges syllables and even a
// short breath, and stays far below the silence that ends a question.
export const REMANENCE_MS = 300;

// How long the recruiter has to be quiet before the question counts as
// finished. The old code used 900ms of global silence, which is inside the
// range of an ordinary pause for thought: "So... tell me about a time you
// handled a difficult customer" fired on "So". The window is longer here
// because it costs nothing to be wrong now: the microphone is no longer
// stopped, so a question that turns out to continue is simply appended to,
// and the cues are replaced rather than lost.
export const FIN_DE_QUESTION_MS = 1500;

// After cues are shown, the recruiter often keeps going: they finish the
// thought, or add "and tell me why". Within this window their words belong to
// the SAME question and refresh the cues. Later than this, it is a new one.
export const REPRISE_MS = 8000;

export function creerOracle(reglages) {
  const r = reglages || {};
  const seuilTab = typeof r.seuilTab === "number" ? r.seuilTab : 0.02;
  const seuilMic = typeof r.seuilMic === "number" ? r.seuilMic : 0.05;
  const remanence = typeof r.remanenceMs === "number" ? r.remanenceMs : REMANENCE_MS;
  const finDeQuestion = typeof r.finDeQuestionMs === "number" ? r.finDeQuestionMs : FIN_DE_QUESTION_MS;
  const reprise = typeof r.repriseMs === "number" ? r.repriseMs : REPRISE_MS;

  let dernierRecruteur = -Infinity;
  let dernierCandidat = -Infinity;
  // "enCours" means the recruiter has started a question we have not yet
  // acted on. "finieA" is when we last emitted one, and it is what tells a
  // continuation apart from a fresh question.
  let enCours = false;
  let finieA = -Infinity;

  // The microphone threshold is higher than the tab's on purpose. The tab
  // track carries one speaker and nothing else, so a small value is already
  // speech. The microphone carries the room: a chair, a keyboard, the
  // recruiter leaking back through the speakers. Being slow to call it the
  // candidate is the safe direction, because the only cost is a few words of
  // theirs briefly treated as silence, while the opposite cost is their
  // answer being sent to the model as a question.
  return {
    // tab: RMS of the meeting tab's audio, 0 when it is not being captured.
    // mic: RMS of the microphone.
    // t: milliseconds, any monotonic clock.
    pas(tab, mic, t) {
      if (tab > seuilTab) dernierRecruteur = t;
      else if (mic > seuilMic) dernierCandidat = t;

      const recruteurParle = t - dernierRecruteur <= remanence;
      const candidatParle = !recruteurParle && t - dernierCandidat <= remanence;
      const qui = recruteurParle ? RECRUTEUR : (candidatParle ? CANDIDAT : PERSONNE);

      let evenement = null;
      if (recruteurParle) {
        if (!enCours) {
          // Their first energy after we emitted: a continuation if it lands
          // inside the window, otherwise a question of its own.
          evenement = (t - finieA <= reprise) ? "reprise" : "debut";
          enCours = true;
        }
      } else if (enCours && t - dernierRecruteur >= finDeQuestion) {
        enCours = false;
        finieA = t;
        evenement = "fin";
      }

      return { qui, evenement };
    },

    // The component asks this before it lets a transcript through. Words that
    // arrive while the candidate is the one speaking are their own answer,
    // and belong nowhere near the model.
    ecouteLeRecruteur(t) {
      return t - dernierRecruteur <= remanence;
    },
  };
}

// HEADPHONES
//
// Capturing the tab works whatever the candidate listens on: the track is
// taken before the audio reaches any output. So with headphones the oracle
// still knows exactly when the recruiter speaks. What it cannot get is their
// WORDS, because those only ever existed in the headphones and the microphone
// never heard them.
//
// That case has to be named. A recruiter who speaks for several seconds while
// the transcript stays empty is not a broken application, it is a pair of
// headphones, and the person is mid-interview with no time to work it out.
export const CASQUE_APRES_MS = 2500;

export function ressembleAUnCasque(msDeParoleRecruteur, motsEntendus) {
  return msDeParoleRecruteur >= CASQUE_APRES_MS && !String(motsEntendus || "").trim();
}
