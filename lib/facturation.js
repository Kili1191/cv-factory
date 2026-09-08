// THE MONEY SIDE, SERVER ONLY
//
// Stripe and Supabase are reached with plain fetch: two HTTP APIs, no SDK,
// same as the model route. Everything here needs a secret, so nothing here
// is imported by the browser.
//
// Configuration is seven environment variables on Vercel, never in the
// repo (docs/facturation.md). Without them, billingConfigured() is false
// and the product behaves as before: every call free, no account needed.
// That is also what the test harness and a developer machine get.
//
//   STRIPE_SECRET_KEY            sk_live_... or sk_test_...
//   STRIPE_WEBHOOK_SECRET        whsec_..., from the webhook endpoint
//   STRIPE_PRICE_MONTHLY         price_..., 24 euros a month
//   STRIPE_PRICE_QUARTERLY       price_..., 49 euros per three months
//   SUPABASE_SERVICE_ROLE_KEY    server only; never with a NEXT_PUBLIC_ prefix
//   NEXT_PUBLIC_SUPABASE_URL     already set for the account
//   NEXT_PUBLIC_SUPABASE_ANON_KEY (or _PUBLISHABLE_KEY), already set
//
// Two more exist for the suite that proves the circuit against stubs:
// STRIPE_API_URL and SUPABASE_API_URL replace the two hosts.

import { createHmac, timingSafeEqual } from "node:crypto";
import { PLANS, moisCourant } from "./plans.js";

const env = (k) => process.env[k] || "";

export function billingConfigured() {
  return Boolean(env("STRIPE_SECRET_KEY") && env("STRIPE_WEBHOOK_SECRET")
    && env("STRIPE_PRICE_MONTHLY") && env("STRIPE_PRICE_QUARTERLY")
    && env("SUPABASE_SERVICE_ROLE_KEY") && supabaseUrl() && anonKey());
}

function supabaseUrl() {
  return (env("SUPABASE_API_URL") || env("NEXT_PUBLIC_SUPABASE_URL")).replace(/\/$/, "");
}
function anonKey() {
  return env("NEXT_PUBLIC_SUPABASE_ANON_KEY") || env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}
function stripeUrl() {
  return (env("STRIPE_API_URL") || "https://api.stripe.com").replace(/\/$/, "");
}

export function prixDuPlan(planId) {
  if (planId === "mensuel") return env("STRIPE_PRICE_MONTHLY");
  if (planId === "trimestre") return env("STRIPE_PRICE_QUARTERLY");
  return "";
}
export function planDuPrix(priceId) {
  if (priceId && priceId === env("STRIPE_PRICE_QUARTERLY")) return "trimestre";
  if (priceId && priceId === env("STRIPE_PRICE_MONTHLY")) return "mensuel";
  return null;
}

// --- the person behind the request --------------------------------------
// The browser sends its Supabase access token as a Bearer; Supabase says
// who it is. No token, or a stale one, is nobody.
export function jetonDe(request) {
  const h = request.headers.get("authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : "";
}

export async function utilisateurDuJeton(token) {
  if (!token) return null;
  try {
    const r = await fetch(supabaseUrl() + "/auth/v1/user", {
      headers: { apikey: anonKey(), Authorization: "Bearer " + token },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? { id: u.id, email: u.email || "" } : null;
  } catch {
    return null;
  }
}

// --- the tables, through PostgREST with the service role ----------------
function rest(path, init = {}) {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  return fetch(supabaseUrl() + "/rest/v1" + path, {
    ...init,
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(8000),
  });
}

export async function lireDroits(userId) {
  const mois = moisCourant();
  const [a, u] = await Promise.all([
    rest("/subscriptions?select=status,plan,current_period_end,stripe_customer_id&user_id=eq." + encodeURIComponent(userId) + "&limit=1"),
    rest("/usage_monthly?select=fits,calls&user_id=eq." + encodeURIComponent(userId) + "&month=eq." + mois + "&limit=1"),
  ]);
  const abonnements = a.ok ? await a.json() : [];
  const usages = u.ok ? await u.json() : [];
  return {
    abonnement: Array.isArray(abonnements) && abonnements[0] ? abonnements[0] : null,
    fits: Array.isArray(usages) && usages[0] ? Number(usages[0].fits) || 0 : 0,
    calls: Array.isArray(usages) && usages[0] ? Number(usages[0].calls) || 0 : 0,
    mois,
  };
}

// Read, add one, write back. Two calls racing lose at most one count,
// which errs in the person's favour; the ceiling on the route bounds it.
export async function compterUnAppel(userId, { fit = false } = {}) {
  try {
    const d = await lireDroits(userId);
    await rest("/usage_monthly?on_conflict=user_id,month", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        user_id: userId, month: d.mois,
        fits: d.fits + (fit ? 1 : 0), calls: d.calls + 1,
        updated_at: new Date().toISOString(),
      }),
    });
  } catch { /* a count lost is not a call refused */ }
}

export async function enregistrerAbonnement(ligne) {
  const r = await rest("/subscriptions?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ ...ligne, updated_at: new Date().toISOString() }),
  });
  return r.ok;
}

// --- Stripe -------------------------------------------------------------
// Form-encoded, nested keys in brackets, as Stripe's API expects.
function encoder(obj, prefixe = "", out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const cle = prefixe ? prefixe + "[" + k + "]" : k;
    if (typeof v === "object") encoder(v, cle, out);
    else out.push(encodeURIComponent(cle) + "=" + encodeURIComponent(String(v)));
  }
  return out;
}

export async function stripe(path, params, methode = "POST") {
  const r = await fetch(stripeUrl() + path, {
    method: methode,
    headers: {
      Authorization: "Bearer " + env("STRIPE_SECRET_KEY"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: methode === "POST" ? encoder(params || {}).join("&") : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error((data && data.error && data.error.message) || ("Stripe " + r.status));
    e.status = r.status;
    throw e;
  }
  return data;
}

// The signature Stripe puts on a webhook: "t=<unix>,v1=<hmac>" over
// "<t>.<raw body>" with the endpoint secret. Five minutes of tolerance,
// as Stripe's own libraries use. Pure, so the suite can sign its own.
export function signerPourStripe(rawBody, secret, t = Math.floor(Date.now() / 1000)) {
  const v1 = createHmac("sha256", secret).update(t + "." + rawBody).digest("hex");
  return "t=" + t + ",v1=" + v1;
}

export function verifierSignatureStripe(rawBody, header, secret, maintenant = Math.floor(Date.now() / 1000)) {
  if (!header || !secret) return false;
  const parts = Object.create(null);
  for (const morceau of String(header).split(",")) {
    const i = morceau.indexOf("=");
    if (i > 0) parts[morceau.slice(0, i).trim()] = morceau.slice(i + 1).trim();
  }
  const t = Number(parts.t);
  if (!Number.isFinite(t) || Math.abs(maintenant - t) > 300) return false;
  const attendu = createHmac("sha256", secret).update(t + "." + rawBody).digest("hex");
  const recu = String(parts.v1 || "");
  if (recu.length !== attendu.length) return false;
  return timingSafeEqual(Buffer.from(recu, "utf8"), Buffer.from(attendu, "utf8"));
}

export function montantDuPlan(planId) {
  const p = PLANS[planId];
  return p ? p.montant : null;
}
