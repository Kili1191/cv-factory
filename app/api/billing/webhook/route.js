// WHAT STRIPE TELLS US, AND THE ONLY WAY A PLAN BECOMES REAL
//
// The browser never writes to the subscriptions table: it has no policy to.
// A plan exists because Stripe said so on this route, signed with the
// endpoint secret. Three events matter:
//
//   checkout.session.completed      the first payment; we fetch the
//                                   subscription to learn its state
//   customer.subscription.updated   renewals, card failures, plan changes
//   customer.subscription.deleted   the cancellation took effect
//
// The person is found by the metadata the checkout put on the subscription
// (user_id), or by client_reference_id on the checkout session. Anything
// else is acknowledged and ignored: Stripe retries a non-2xx for days, and
// an event we do not handle must not become a retry storm.

import { billingConfigured, verifierSignatureStripe, enregistrerAbonnement, stripe, planDuPrix } from "../../../../lib/facturation.js";

export const runtime = "nodejs";
export const maxDuration = 20;

const json = (corps, status = 200) => new Response(JSON.stringify(corps), {
  status, headers: { "Content-Type": "application/json" },
});

function ligneDepuisAbonnement(sub, userId) {
  const item = sub && sub.items && sub.items.data && sub.items.data[0];
  const price = item && item.price && (item.price.id || item.price);
  const fin = sub && sub.current_period_end;
  return {
    user_id: userId,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : (sub.customer && sub.customer.id) || null,
    stripe_subscription_id: sub.id || null,
    status: sub.status || "none",
    plan: planDuPrix(price) || (sub.metadata && sub.metadata.plan) || null,
    current_period_end: fin ? new Date(fin * 1000).toISOString() : null,
  };
}

export async function POST(request) {
  if (!billingConfigured()) return json({ error: { type: "billing_not_configured" } }, 503);
  const brut = await request.text();
  const signature = request.headers.get("stripe-signature") || "";
  if (!verifierSignatureStripe(brut, signature, process.env.STRIPE_WEBHOOK_SECRET)) {
    return json({ error: { type: "bad_signature", message: "Invalid Stripe signature" } }, 400);
  }
  let event;
  try { event = JSON.parse(brut); } catch { return json({ error: { type: "bad_json" } }, 400); }
  const type = event && event.type;
  const objet = event && event.data && event.data.object;
  if (!type || !objet) return json({ received: true, ignored: "no object" });

  try {
    if (type === "checkout.session.completed" && objet.mode === "subscription" && objet.subscription) {
      const userId = objet.client_reference_id;
      if (!userId) return json({ received: true, ignored: "no user" });
      const sub = await stripe("/v1/subscriptions/" + encodeURIComponent(objet.subscription), null, "GET");
      await enregistrerAbonnement(ligneDepuisAbonnement(sub, userId));
      return json({ received: true, applied: type });
    }
    if (type === "customer.subscription.updated" || type === "customer.subscription.deleted") {
      const userId = objet.metadata && objet.metadata.user_id;
      if (!userId) return json({ received: true, ignored: "no user" });
      const ligne = ligneDepuisAbonnement(objet, userId);
      if (type === "customer.subscription.deleted") ligne.status = "canceled";
      await enregistrerAbonnement(ligne);
      return json({ received: true, applied: type });
    }
  } catch (err) {
    // Stripe retries on a 5xx, which is what we want when our side failed.
    return json({ error: { type: "apply_failed", message: err && err.message } }, 500);
  }
  return json({ received: true, ignored: type });
}
