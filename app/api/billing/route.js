// WHAT THE PERSON'S PLAN IS, FOR THE SETTINGS BLOCK AND THE PLAN SHEET
//
// GET with the account's Bearer token. Without billing configured the
// answer says so and the product is free, as before. Without a token the
// person is a visitor: free fits need an account, because the count lives
// on it.

import { billingConfigured, jetonDe, utilisateurDuJeton, lireDroits } from "../../../lib/facturation.js";
import { AJUSTEMENTS_GRATUITS, abonnementOuvert, PLANS } from "../../../lib/plans.js";

export const runtime = "nodejs";
export const maxDuration = 10;
// Read at every request: without this, the build prerendered the answer
// once, with billing unconfigured, and served "configured:false" forever.
export const dynamic = "force-dynamic";

const json = (corps, status = 200) => new Response(JSON.stringify(corps), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});

export async function GET(request) {
  if (!billingConfigured()) return json({ configured: false, plans: PLANS });
  const user = await utilisateurDuJeton(jetonDe(request));
  if (!user) return json({ configured: true, status: "visitor", plans: PLANS, fits_free: AJUSTEMENTS_GRATUITS });
  const d = await lireDroits(user.id);
  const ouvert = abonnementOuvert(d.abonnement);
  return json({
    configured: true,
    status: ouvert ? "subscribed" : "free",
    plan: ouvert ? d.abonnement.plan : null,
    period_end: ouvert ? d.abonnement.current_period_end : null,
    stripe_status: d.abonnement ? d.abonnement.status : null,
    portal: Boolean(d.abonnement && d.abonnement.stripe_customer_id),
    fits_used: d.fits,
    fits_free: AJUSTEMENTS_GRATUITS,
    plans: PLANS,
  });
}
