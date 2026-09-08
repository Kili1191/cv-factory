// THE MODEL FOLLOWS THE TASK, AND THE COST FOLLOWS THE MODEL
//
// Every call went to Opus 5, the strongest and the dearest. Priced at the
// list rates (5 $ in, 25 $ out per million tokens), one application, a fit
// plus its second pass, the letter half the time and the interview prep a
// fifth of the time, costs about 0,39 $. At 19 euros a month the plan
// breaks even at 48 applications: below the hundred the product promises.
//
// The fit is measured after it is written (lib/mesurerLeCv.js), and a
// second pass runs exactly when the first one falls short. That is what
// makes a cheaper first pass safe: Sonnet 5 (2 $ in, 10 $ out) writes it,
// and when the score says it is not enough, Opus 5 writes it again. The
// tasks that read a person's own history (an imported CV, a photo of one,
// a LinkedIn export) stay on Opus: an error there is the kind that gets
// someone rejected, and there is no score to catch it.
//
// Measured on the same weights, one application drops to about 0,18 $,
// and 19 euros hold a hundred of them. The live assist keeps Haiku, which
// its own route chose for speed.
//
// Prices are Anthropic's list prices on 8 September 2026, in dollars per
// million tokens. They are here so the function logs can carry a cost per
// call, and so the study that set the price can be checked against what
// the console bills.

export const MODELE_PREMIER_PASSAGE = "claude-sonnet-5";
export const MODELE_SECOND_PASSAGE = "claude-opus-5";

export const PRIX_PAR_MILLION = {
  "claude-opus-5":    { entree: 5,  cacheEcrit: 6.25, cacheLu: 0.5,  sortie: 25 },
  "claude-sonnet-5":  { entree: 2,  cacheEcrit: 2.5,  cacheLu: 0.2,  sortie: 10 },
  "claude-haiku-4-5": { entree: 1,  cacheEcrit: 1.25, cacheLu: 0.1,  sortie: 5 },
};

// The second pass of a measured task carries the "-reprise" suffix
// (app/AppRoot.jsx, ecrireLeCv). The reading tasks are named where they
// are called: import-cv, read_cv_image, linkedin.
const SECOND_PASSAGE = /-reprise$/;
const LECTURE_DU_PARCOURS = new Set(["import-cv", "read_cv_image", "linkedin"]);

export function modelePour(tache) {
  const nom = typeof tache === "string" ? tache : "";
  if (SECOND_PASSAGE.test(nom) || LECTURE_DU_PARCOURS.has(nom)) return MODELE_SECOND_PASSAGE;
  return MODELE_PREMIER_PASSAGE;
}

// The usage block of a Messages response, priced. Cache reads are the
// cheap part and cache writes the slightly dearer one; both are counted
// on top of the uncached input, as the API bills them.
export function coutEnDollars(modele, usage) {
  const p = PRIX_PAR_MILLION[modele];
  if (!p || !usage) return null;
  const n = (k) => (typeof usage[k] === "number" && usage[k] > 0 ? usage[k] : 0);
  const dollars = (n("input_tokens") * p.entree
    + n("cache_creation_input_tokens") * p.cacheEcrit
    + n("cache_read_input_tokens") * p.cacheLu
    + n("output_tokens") * p.sortie) / 1e6;
  return Math.round(dollars * 1e5) / 1e5;
}
