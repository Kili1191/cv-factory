// The cues are asked for while the recruiter is still talking.
//
// WHAT THIS REPLACES
//
// The assistant waited for 1500ms of silence to decide a question had ended,
// then called the model. Two point three seconds of dead air before the first
// cue word appeared, on a screen whose whole job is to be read while somebody
// waits for you to speak. A human turn-taking gap is about 200ms.
//
// Simultaneous interpreters never wait for the sentence to end: they run a
// few seconds behind and start producing before the speaker stops. So the
// cues are asked for when the words are recognisably a question, not when the
// silence says one ended.
//
// THE TWO WAYS THIS GOES WRONG
//
// Too eager, and every "so" costs a model call and shows cues for a question
// nobody asked. Too shy, and it is the old timer with extra steps. Both are
// measured here on the sentences recruiters actually say.

import {
  ressembleAUneQuestion, vautUneReprise, ASSEZ_DE_MOTS, CROISSANCE_UTILE,
} from "../lib/uneQuestion.js";

// Real openings, as a live transcript renders them: no punctuation, no
// capitals, no tidy grammar.
const DE_VRAIES_QUESTIONS = [
  "tell me about a time you handled a difficult customer",
  "so tell me a bit about your experience in hospitality",
  "walk me through your last role",
  "can you describe a situation where you had to work under pressure",
  "what would you do if two members of staff called in sick",
  "how did you manage stock control at your last place",
  "why did you leave your last job",
  "give me an example of when you went above and beyond",
  "how many people were you responsible for",
  "what interests you about this role in particular",
  "have you ever had to deal with a complaint from a customer",
  "are you comfortable working weekends and bank holidays",
];

// Things a recruiter says that are NOT a question to answer. Firing on these
// costs a call and puts cues on screen for nothing.
const PAS_DES_QUESTIONS = [
  "so",
  "right so",
  "okay great",
  "yeah absolutely",
  "let me just find your cv one second",
  "thanks for coming in today",
  "i am the general manager here",
  "we are a team of about twenty people",
  "the shift pattern is five days over seven",
];

export async function run() {
  const failures = [];

  // --- 1. A real question is recognised -----------------------------------
  for (const q of DE_VRAIES_QUESTIONS) {
    if (!ressembleAUneQuestion(q)) {
      failures.push("not recognised as a question: \"" + q + "\"");
    }
  }

  // --- 2. Filler and small talk are not ------------------------------------
  for (const p of PAS_DES_QUESTIONS) {
    if (ressembleAUneQuestion(p)) {
      failures.push(
        "fired on something that is not a question: \"" + p + "\". "
        + "That costs a model call and puts cues on screen for nothing."
      );
    }
  }

  // --- 3. It fires BEFORE the question is finished -------------------------
  //
  // The whole point. If it only recognises the complete sentence, this is the
  // old timer with extra steps and the dead air is unchanged.
  {
    const complet = "tell me about a time you handled a difficult customer";
    const mots = complet.split(" ");
    let premier = -1;
    for (let i = 1; i <= mots.length; i += 1) {
      if (ressembleAUneQuestion(mots.slice(0, i).join(" "))) { premier = i; break; }
    }
    if (premier < 0) {
      failures.push("the question was never recognised, even complete");
    } else if (premier >= mots.length) {
      failures.push(
        "recognised only at the last word, so nothing is gained: the model "
        + "still starts after the recruiter has stopped talking"
      );
    } else if (premier > mots.length - 2) {
      failures.push("recognised at word " + premier + " of " + mots.length + ", too late to matter");
    }
  }

  // --- 4. An opening alone is not enough ----------------------------------
  //
  // "So tell me" is how a recruiter clears their throat. Answering it would
  // show cues for a question that has not been asked.
  {
    for (const amorce of ["tell me", "so tell me", "can you", "what would you"]) {
      if (ressembleAUneQuestion(amorce)) {
        failures.push("\"" + amorce + "\" is an opening, not a question, and it fired");
      }
    }
    // And the threshold is a real edge, not a drift with the data.
    const six = "tell me about a time you";
    if (six.split(" ").length !== ASSEZ_DE_MOTS) {
      failures.push("this case no longer sits on the threshold; it proves nothing");
    } else if (!ressembleAUneQuestion(six)) {
      failures.push("at exactly " + ASSEZ_DE_MOTS + " words a question must be recognised");
    }
  }

  // --- 5. A question mark settles it --------------------------------------
  if (!ressembleAUneQuestion("and your notice period is what exactly?")) {
    failures.push("a transcript that does carry a question mark must be trusted");
  }

  // --- 6. Asking twice costs money, so it needs a reason ------------------
  //
  // The recruiter finishes the sentence. If it grew enough to change the
  // answer, better cues are worth a second call. If they added "yeah", they
  // are not.
  {
    const demande = "tell me about a time you handled a difficult";
    if (vautUneReprise(demande, demande + " customer")) {
      failures.push(
        "one more word triggered a second model call. The first answer still "
        + "fits, and this doubles the cost of every question in the interview."
      );
    }
    if (!vautUneReprise(demande, demande + " customer and what you would do differently now")) {
      failures.push(
        "the recruiter added a whole second clause and the cues were not "
        + "refreshed: the question on screen is no longer the question asked"
      );
    }
    // Nothing added is never worth a call.
    if (vautUneReprise(demande, demande)) failures.push("an unchanged question asked for cues again");
    if (vautUneReprise(demande, "")) failures.push("an empty transcript asked for cues");
  }

  // --- 7. The growth rule has a stated edge -------------------------------
  {
    const dix = "one two three four five six seven eight nine ten";
    const plus = Math.ceil(10 * CROISSANCE_UTILE);
    const assez = dix + " " + Array.from({ length: plus }, () => "mot").join(" ");
    if (!vautUneReprise(dix, assez)) {
      failures.push("at exactly the stated growth the cues must be refreshed");
    }
  }

  // --- 8. Nothing at all does not throw ------------------------------------
  for (const vide of [null, undefined, "", "   "]) {
    if (ressembleAUneQuestion(vide)) failures.push("an empty transcript was read as a question");
  }

  return failures;
}
