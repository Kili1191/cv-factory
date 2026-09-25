// FIRING BEFORE THE RECRUITER HAS FINISHED ASKING
//
// The assistant waited for a second and a half of silence to decide a
// question was over, then called the model. Two point three seconds of dead
// air before the first cue word appeared, on a screen whose whole job is to
// be read while someone is waiting for you to speak. A human turn-taking gap
// is about two hundred milliseconds. Two seconds reads as hesitation, which
// is the exact impression the tool exists to prevent.
//
// Simultaneous interpreters solved this a long time ago and they do it for a
// living: they never wait for the sentence to end. They run a few seconds
// behind and start producing before the speaker stops, which is called
// decalage. Waiting for the full stop is the amateur move.
//
// So the cues are asked for as soon as the words are RECOGNISABLY a question,
// not when the silence says one ended. "Tell me about a time you handled a
// difficult customer" is already answerable at "tell me about a time you",
// and the model is thinking while the recruiter is still talking. The
// question then finishes, and if it grew enough to matter, better cues are
// asked for and added underneath. Most of the time it did not, and one call
// covered it.
//
// WHY THIS IS NOT JUST A SHORTER TIMER
//
// A shorter silence window fires on pauses for thought, which is the bug that
// cut questions in half in the first version. This does the opposite: it
// ignores silence entirely and reads the words. A pause after "so" produces
// nothing, because "so" is not a question.

// The openings of an interview question, as people actually say them out
// loud. Deliberately not a grammar: a transcript has no punctuation and no
// capitals, and half of these are not interrogative sentences at all.
const AMORCES = [
  "tell me about", "tell me a bit about", "talk me through", "walk me through",
  "can you tell", "could you tell", "can you talk", "can you walk",
  "can you describe", "could you describe", "describe",
  "give me an example", "give me a time", "do you have an example",
  "what would you", "what did you", "what do you", "what is your", "what's your",
  "what are your", "what was the", "what made you", "what happened",
  "how would you", "how did you", "how do you", "how have you",
  "how many", "how much", "how long",
  "why did you", "why do you", "why are you", "why should we",
  "when did you", "when have you", "where do you", "which of",
  "have you ever", "have you had", "had you", "did you ever",
  "are you comfortable", "are you able", "would you be",
  "in your experience", "what interests you", "what attracted you",
];

// Under this, the words are not yet a question worth spending a call on. "So
// tell me" is an opening, not a question; "tell me about a time you" is
// enough to start on. Counted from the beginning of the transcript, not from
// the stem, because the stem is usually at the start anyway and counting from
// it would fire on a bare opening.
export const ASSEZ_DE_MOTS = 6;

// How much a question has to grow, after cues were already asked for, before
// it is worth asking again. Under this the first answer still fits, and the
// second call would cost money to say the same thing. Measured in words
// added, as a share of what had already been heard.
export const CROISSANCE_UTILE = 0.5;

function mots(texte) {
  return String(texte || "").trim().split(/\s+/).filter(Boolean);
}

// Is what has been heard so far recognisably a question being asked?
export function ressembleAUneQuestion(texte) {
  const brut = String(texte || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (mots(brut).length < ASSEZ_DE_MOTS) return false;
  // A question mark is rare in a live transcript, but when the engine does
  // produce one it settles the matter.
  if (brut.indexOf("?") !== -1) return true;
  return AMORCES.some((a) => brut.indexOf(a) !== -1);
}

// Has the question grown enough since cues were asked for that it is worth
// asking again? A recruiter who adds "and why" has changed the question; one
// who adds "yeah" has not.
export function vautUneReprise(dejaDemande, maintenant) {
  const avant = mots(dejaDemande).length;
  const apres = mots(maintenant).length;
  if (!avant) return apres >= ASSEZ_DE_MOTS;
  if (apres <= avant) return false;
  return (apres - avant) / avant >= CROISSANCE_UTILE;
}
