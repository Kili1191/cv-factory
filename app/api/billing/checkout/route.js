// THE DOOR TO STRIPE CHECKOUT
//
// POST { plan: "mensuel" | "trimestre" } with the account's Bearer token.
// Stripe hosts the payment page; this route only opens it, tied to the
// account by client_reference_id and by the subscription's metadata, so
// the webhook can find the person again whatever Stripe sends later.
// Tax is computed by Stripe Tax from the card's country, and the prices
// are tax-inclusive, as consumer prices in France and the UK must be.

import { billingConfigured, jetonDe, utilisateurDuJeton, prixDuPlan, stripe } from "../../../../lib/facturation.js";

export const runtime = "nodejs";
export const maxDuration = 20;

const json = (corps, status = 200) => new Response(JSON.stringify(corps), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});

export async function POST(request) {
  if (!billingConfigured()) return json({ error: { type: "billing_not_configured", message: "Billing is not configured" } }, 503);
  const user = await utilisateurDuJeton(jetonDe(request));
  if (!user) return json({ error: { type: "sign_in_required", message: "Sign in first" } }, 401);
  let corps = {};
  try { corps = await request.json(); } catch { corps = {}; }
  const plan = corps && corps.plan === "trimestre" ? "trimestre" : "mensuel";
  const price = prixDuPlan(plan);
  if (!price) return json({ error: { type: "unknown_plan", message: "Unknown plan" } }, 400);

  const origine = (request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "https://thenuvi.com").replace(/\/$/, "");
  try {
    const session = await stripe("/v1/checkout/sessions", {
      mode: "subscription",
      line_items: { 0: { price, quantity: 1 } },
      client_reference_id: user.id,
      customer_email: user.email || undefined,
      allow_promotion_codes: "true",
      automatic_tax: { enabled: "true" },
      billing_address_collection: "auto",
      subscription_data: { metadata: { user_id: user.id, plan } },
      success_url: origine + "/app?facture=ok",
      cancel_url: origine + "/app?facture=non",
    });
    return json({ url: session.url });
  } catch (err) {
    return json({ error: { type: "stripe_error", message: err && err.message ? err.message : "Stripe error" } }, 502);
  }
}
