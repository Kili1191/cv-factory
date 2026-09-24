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

// A FIXED THRESHOLD WAS THE WRONG IDEA, AND IT FAILED THE COMMON CASE
//
// The first version called it speech above a fixed loudness: 0.02 on the tab,
// a number chosen by hand. A meeting tab is never silent. The recruiter's
// microphone is open, so their room comes with it: a fan, a keyboard, an
// office. Measured against a steady room tone of 0.025, the oracle decided
// the recruiter had never stopped talking, the question never ended, and NOT
// ONE CUE EVER APPEARED. No error, no message, an assistant that just sits
// there.
//
// Nothing is compared to a constant now. Each stream is measured against its
// own quiet level, and speech is what rises well clear of it.
//
// HOW THE QUIET LEVEL IS FOUND
//
// By taking the smallest loudness seen in the last five to ten seconds, in
// two blocks: one filling, one complete, and the floor is the lower of the
// two. That is cheap, it needs no history, and it is honest about speech,
// which is not a continuous noise. Between syllables, between words and
// between sentences the energy drops to the room, so over several seconds
// the smallest value IS the room. An exponential average cannot do this: it
// is dragged upwards by the speech it is supposed to ignore.
//
// ONE CASE THIS GETS WRONG, AND IT MENDS ITSELF
//
// Start following the call while the recruiter is already mid-sentence and
// the only thing ever seen is speech, so the floor sits too high and that
// first question can be missed. At their first pause the floor falls to the
// room and stays right for the rest of the interview. The alternative, a
// floor that starts low and climbs, takes tens of seconds to reach a noisy
// room and reads the room as speech the whole time: that is the failure
// above, which is permanent rather than self-mending.
const FACTEUR = 3.5;

// One absolute floor remains, for the opposite failure: a digitally silent
// tab has a quiet level of zero, and everything is infinitely above zero.
const PLANCHER = 0.004;

// 250 frames at 20ms. The floor therefore spans five to ten seconds of call,
// which always contains a gap between two sentences.
const BLOC = 250;

function suiveurDeFond() {
  let bloc = Infinity;   // smallest of the block being filled
  let precedent = Infinity;  // smallest of the last complete one
  let n = 0;
  return {
    voir(v) {
      if (v < bloc) bloc = v;
      n += 1;
      if (n >= BLOC) { precedent = bloc; bloc = Infinity; n = 0; }
    },
    seuil() {
      const fond = Math.min(bloc, precedent);
      if (!isFinite(fond)) return PLANCHER;
      return Math.max(PLANCHER, fond * FACTEUR);
    },
  };
}

export function creerOracle(reglages) {
  const r = reglages || {};
  const fondTab = suiveurDeFond();
  const fondMic = suiveurDeFond();
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

  // Each stream is judged against its own quiet level, so the microphone
  // needs no special rule: it simply has a higher floor than the tab, because
  // it carries the room and the recruiter leaking back through the speakers,
  // and its threshold rises with it. seuilTab and seuilMic can still be
  // passed to pin a stream to a fixed value, which is only useful for showing
  // in a test what the fixed version used to do.
  return {
    // tab: RMS of the meeting tab's audio, 0 when it is not being captured.
    // mic: RMS of the microphone.
    // t: milliseconds, any monotonic clock.
    pas(tab, mic, t) {
      // The floors are updated before the comparison, so the very first frame
      // sets them rather than being judged against nothing.
      fondTab.voir(tab);
      fondMic.voir(mic);
      const seuilTab = typeof r.seuilTab === "number" ? r.seuilTab : fondTab.seuil();
      const seuilMic = typeof r.seuilMic === "number" ? r.seuilMic : fondMic.seuil();

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

// A TAB THAT CARRIES NO CALL
//
// Following the call is a share picker, and a share picker is a chance to
// pick the wrong thing. Share a tab the interview is not in, or try it on a
// phone interview where there is no meeting tab at all, and the oracle sees
// a stream that never carries energy. It therefore decides the recruiter is
// never speaking, and every word the microphone hears is dropped as the
// candidate's own answer.
//
// The result is the worst shape a failure can take here: the assistant is
// silent, correctly, forever, and nothing says why. The headphone message
// cannot cover it either, because that one only fires once the tab has
// reported somebody speaking.
//
// The microphone hearing speech is what makes it a mistake rather than a
// quiet moment: somebody IS talking, and none of it is reaching the tab.
export const ONGLET_MUET_APRES_MS = 6000;
export const ASSEZ_DE_PAROLE_MS = 1500;

export function ongletSansSon(msDepuisLeSuivi, ongletAParle, msDeParoleAuMicro) {
  if (ongletAParle) return false;
  return msDepuisLeSuivi >= ONGLET_MUET_APRES_MS && msDeParoleAuMicro >= ASSEZ_DE_PAROLE_MS;
}
