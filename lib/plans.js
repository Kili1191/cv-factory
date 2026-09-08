// THE PLAN, IN ONE PLACE
//
// Shared by the browser (the plan sheet, the settings block) and the server
// (the entitlement on the AI route). No secret lives here. The amounts are
// what the site shows and what the Stripe prices must match; the price ids
// themselves are environment variables on the server (lib/facturation.js).
//
// Set by the price study of 8 September 2026: 24 euros a month or 49 euros
// for three months, VAT included, three fits free with an account. One plan
// gives everything; the free tier is what costs nothing to serve (the check,
// the tracker, the layouts) plus three fits to feel the product.

export const PLANS = {
  mensuel:   { id: "mensuel",   montant: 24, devise: "EUR", mois: 1 },
  trimestre: { id: "trimestre", montant: 49, devise: "EUR", mois: 3 },
};

export const AJUSTEMENTS_GRATUITS = 3;

// The tasks that count as a fit: one CV written or rewritten for one ad.
// The measured second pass ("-reprise") belongs to the fit it repairs and
// never counts as a new one. Every other model task (the letter, the coach,
// the interview prep) rides along while free fits remain, and needs the
// plan once they are used up.
const AJUSTEMENTS = new Set(["match", "cv-from-offer", "generate-cv"]);
export function estUnAjustement(tache) {
  return AJUSTEMENTS.has(String(tache || ""));
}
export function estUneReprise(tache) {
  return /-reprise$/.test(String(tache || ""));
}

// Stripe statuses that keep the door open. past_due stays open: Stripe
// retries the card for days, and a person mid-search should not lose the
// product over a bank hiccup. canceled, unpaid and incomplete close it.
const OUVERTS = new Set(["active", "trialing", "past_due"]);
export function abonnementOuvert(abonnement) {
  return Boolean(abonnement && OUVERTS.has(String(abonnement.status || "")));
}

// The decision, pure. `fits` is the count already used this month.
export function decider({ abonnement = null, fits = 0, tache = "" } = {}) {
  if (abonnementOuvert(abonnement)) return { ok: true, raison: "abonne", restants: null };
  const n = Number.isFinite(fits) && fits > 0 ? fits : 0;
  // A second pass repairs a fit that was allowed: it passes with it, even
  // when that fit was the last free one.
  if (estUneReprise(tache) && n <= AJUSTEMENTS_GRATUITS) {
    return { ok: true, raison: "gratuit", restants: Math.max(0, AJUSTEMENTS_GRATUITS - n) };
  }
  if (n < AJUSTEMENTS_GRATUITS) return { ok: true, raison: "gratuit", restants: AJUSTEMENTS_GRATUITS - n };
  return { ok: false, raison: "quota", restants: 0 };
}

export function moisCourant(date = new Date()) {
  return date.toISOString().slice(0, 7);
}
