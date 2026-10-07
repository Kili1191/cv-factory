// THE STORED LANGUAGE MOVES TO ENGLISH, ONCE
//
// English is what the product opens in, and since 7 October 2026 it is what
// the whole site speaks: the previews, the editor's sheets, /diagnostic, the
// extension's popup. None of that reached Kilian, because his browser held
// "fr" from the day the language question was answered, and a stored answer
// beats a default. He read French on every screen, asked for English twice,
// and the cause was a setting rather than a missing translation. Nothing on
// screen could have told him that.
//
// So a stored "fr" is moved to English one time, and the flag recording the
// move is the whole safety of it:
//
//   - it runs once per browser, so somebody who then chooses French in
//     Settings keeps French for ever. A migration that ran on every load
//     would undo a deliberate choice, which is worse than the defect;
//   - the flag is written even when nothing is stored yet, so a visitor who
//     answers the question AFTER this ships is never touched. Without that,
//     their fresh "fr" would be moved on the next load, and the language
//     question would read as broken;
//   - nothing is lost either way. The control is one click in Settings, and
//     French keeps exactly the status it had.
//
// THE TIMESTAMP IS NOT OPTIONAL
//
// `cvf_c` is in SYNCED_KEYS, and cloudSync settles a conflict by comparing
// `<key>__at` on each side: the most recent wins. A local write with no stamp
// is therefore older than anything the account holds, so the next pull would
// hand "fr" straight back and the move would silently undo itself on a
// signed-in browser. The stamp is written here for that reason, and
// `tests/the-language-setting-moves-to-english-once.mjs` asks cloudSync for
// its own `stampKey` and refuses a format that has drifted from this one.

export const CLE_LANGUE = "cvf_c";
export const CLE_PASSAGE_ANGLAIS = "cvf_c_en";

// Same shape as cloudSync's stampKey. Defined here rather than imported so
// that the shop window, whose whole point is a fast first paint, does not pull
// cloudSync and Supabase into its bundle for one string. The suite holds the
// two together.
export function cleHorodatage(cle) { return `${cle}__at`; }

const LANGUES = ["fr", "en"];

function lire(storage, cle) {
  try { return storage.getItem(cle); } catch { return null; }
}

function ecrire(storage, cle, valeur) {
  try { storage.setItem(cle, valeur); return true; } catch { return false; }
}

// Returns "fr", "en", or null when nobody has chosen yet, which is what makes
// the language question appear. The caller decides what to do with null: the
// app asks, the other pages fall back to English.
//
// `maintenant` is injected so a test can pin the stamp instead of reading the
// clock through the code under test.
export function langueDuSite(storage, maintenant = Date.now) {
  if (!storage) return null;

  const brut = lire(storage, CLE_LANGUE);
  let choisie = null;
  if (brut) {
    try {
      const v = JSON.parse(brut);
      if (LANGUES.includes(v)) choisie = v;
    } catch { /* unreadable value: treated as no choice */ }
  }

  const dejaPassee = lire(storage, CLE_PASSAGE_ANGLAIS);
  if (dejaPassee) return choisie;

  // The flag goes down first and unconditionally. If the write fails, which
  // is what a browser with storage refused does, we must not move anything:
  // the move would then repeat on every load and hold somebody on English
  // against their own choice.
  if (!ecrire(storage, CLE_PASSAGE_ANGLAIS, "1")) return choisie;

  if (choisie !== "fr") return choisie;

  if (!ecrire(storage, CLE_LANGUE, JSON.stringify("en"))) return choisie;
  ecrire(storage, cleHorodatage(CLE_LANGUE), String(maintenant()));
  return "en";
}
