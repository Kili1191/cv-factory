// CANCEL, CHANGE THE CARD, SEE THE INVOICES: STRIPE'S PORTAL
//
// One click from Settings, no retention screen. Needs a customer id, which
// exists once a checkout has completed.

import { billingConfigured, jetonDe, utilisateurDuJeton, lireDroits, stripe } from "../../../../lib/facturation.js";

export const runtime = "nodejs";
export const maxDuration = 20;

const json = (corps, status = 200) => new Response(JSON.stringify(corps), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});

export async function POST(request) {
  if (!billingConfigured()) return json({ error: { type: "billing_not_configured", message: "Billing is not configured" } }, 503);
  const user = await utilisateurDuJeton(jetonDe(request));
  if (!user) return json({ error: { type: "sign_in_required", message: "Sign in first" } }, 401);
  const d = await lireDroits(user.id);
  const customer = d.abonnement && d.abonnement.stripe_customer_id;
  if (!customer) return json({ error: { type: "no_subscription", message: "No subscription on this account" } }, 404);
  const origine = (request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "https://thenuvi.com").replace(/\/$/, "");
  try {
    const session = await stripe("/v1/billing_portal/sessions", { customer, return_url: origine + "/app" });
    return json({ url: session.url });
  } catch (err) {
    return json({ error: { type: "stripe_error", message: err && err.message ? err.message : "Stripe error" } }, 502);
  }
}
