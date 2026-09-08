// The money arrives.
//
// A plan exists because Stripe said so on the webhook, signed. A fit is
// paid for by a subscriber or by one of three free ones on an account, and
// a visitor is told to sign in. Nothing of this touches the product when
// billing is not configured: the harness and a developer machine run free.
//
// Stripe, Supabase and Anthropic are stubs on a local port here. What is
// proven is the circuit: who is refused with which status, what is counted
// after a call, what the checkout asks Stripe for, and that a webhook with
// a bad signature changes nothing.

import { createServer } from "node:http";
import { decider, estUnAjustement, abonnementOuvert } from "../lib/plans.js";
import { verifierSignatureStripe, signerPourStripe } from "../lib/facturation.js";

const UTILISATEURS = {
  "jeton-visiteur": null,
  "jeton-libre":    { id: "11111111-1111-1111-1111-111111111111", email: "libre@example.com", fits: 3, abonnement: null },
  "jeton-debutant": { id: "22222222-2222-2222-2222-222222222222", email: "debut@example.com", fits: 1, abonnement: null },
  "jeton-abonne":   { id: "33333333-3333-3333-3333-333333333333", email: "abonne@example.com", fits: 40,
    abonnement: { status: "active", plan: "mensuel", current_period_end: "2026-10-08T00:00:00Z", stripe_customer_id: "cus_1" } },
};
const parId = Object.fromEntries(Object.values(UTILISATEURS).filter(Boolean).map((u) => [u.id, u]));

function stub() {
  const vu = { usages: [], abonnements: [], checkouts: [], portails: [], anthropic: 0 };
  const server = createServer((req, res) => {
    let corps = "";
    req.on("data", (c) => { corps += c; });
    req.on("end", () => {
      const url = new URL(req.url, "http://x");
      const json = (o, status = 200) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(o)); };
      if (url.pathname === "/auth/v1/user") {
        const jeton = (req.headers.authorization || "").replace(/^Bearer /, "");
        const u = UTILISATEURS[jeton];
        return u ? json({ id: u.id, email: u.email }) : json({ message: "invalid" }, 401);
      }
      if (url.pathname === "/rest/v1/subscriptions") {
        if (req.method === "POST") { vu.abonnements.push(JSON.parse(corps)); return json({}, 201); }
        const id = (url.searchParams.get("user_id") || "").replace("eq.", "");
        const u = parId[id];
        return json(u && u.abonnement ? [u.abonnement] : []);
      }
      if (url.pathname === "/rest/v1/usage_monthly") {
        if (req.method === "POST") { vu.usages.push(JSON.parse(corps)); return json({}, 201); }
        const id = (url.searchParams.get("user_id") || "").replace("eq.", "");
        const u = parId[id];
        return json(u ? [{ fits: u.fits, calls: u.fits }] : []);
      }
      if (url.pathname === "/v1/checkout/sessions") { vu.checkouts.push(corps); return json({ url: "https://checkout.stripe.test/s_1" }); }
      if (url.pathname === "/v1/billing_portal/sessions") { vu.portails.push(corps); return json({ url: "https://billing.stripe.test/p_1" }); }
      if (url.pathname.startsWith("/v1/subscriptions/")) {
        return json({ id: "sub_9", customer: "cus_9", status: "active", current_period_end: 1790000000,
          items: { data: [{ price: { id: "price_q" } }] }, metadata: { user_id: parId["11111111-1111-1111-1111-111111111111"].id, plan: "trimestre" } });
      }
      if (url.pathname === "/v1/messages") {
        vu.anthropic += 1;
        return json({ content: [{ type: "text", text: "{}" }], usage: { input_tokens: 100, output_tokens: 20 } });
      }
      json({ error: "unknown " + url.pathname }, 404);
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, vu, base: "http://127.0.0.1:" + server.address().port })));
}

export async function run() {
  const failures = [];

  // --- the rule, pure --------------------------------------------------
  const cas = [
    [{ abonnement: { status: "active" }, fits: 900, tache: "match" }, true, "a subscriber at 900 fits"],
    [{ abonnement: { status: "past_due" }, fits: 0, tache: "match" }, true, "a subscriber whose card is being retried"],
    [{ abonnement: { status: "canceled" }, fits: 3, tache: "match" }, false, "a canceled subscriber past the free fits"],
    [{ abonnement: null, fits: 0, tache: "match" }, true, "a new account"],
    [{ abonnement: null, fits: 2, tache: "coach_chat" }, true, "the coach while free fits remain"],
    [{ abonnement: null, fits: 3, tache: "coach_chat" }, false, "the coach once the free fits are used"],
    [{ abonnement: null, fits: 3, tache: "match" }, false, "a fourth free fit"],
    [{ abonnement: null, fits: 3, tache: "cv-from-offer-reprise" }, true, "the second pass of the third free fit"],
    [{ abonnement: null, fits: 4, tache: "cv-from-offer-reprise" }, false, "a second pass past the free fits"],
  ];
  for (const [entree, attendu, nom] of cas) {
    const v = decider(entree);
    if (v.ok !== attendu) failures.push(nom + " is " + (v.ok ? "allowed" : "refused") + " (" + v.raison + ")");
  }
  if (!estUnAjustement("match") || !estUnAjustement("cv-from-offer") || !estUnAjustement("generate-cv")) failures.push("a fit task is not counted as a fit");
  if (estUnAjustement("cv-from-offer-reprise") || estUnAjustement("coach_chat")) failures.push("a non-fit task is counted as a fit");
  if (abonnementOuvert({ status: "incomplete" })) failures.push("an incomplete subscription opens the door");

  // --- the signature, pure --------------------------------------------
  const corps = JSON.stringify({ id: "evt_1", type: "customer.subscription.updated", data: { object: {} } });
  const t = 1_800_000_000;
  const entete = signerPourStripe(corps, "whsec_test", t);
  if (!verifierSignatureStripe(corps, entete, "whsec_test", t + 10)) failures.push("a correctly signed webhook is refused");
  if (verifierSignatureStripe(corps + " ", entete, "whsec_test", t + 10)) failures.push("a tampered body passes the signature");
  if (verifierSignatureStripe(corps, entete, "whsec_other", t + 10)) failures.push("another secret passes the signature");
  if (verifierSignatureStripe(corps, entete, "whsec_test", t + 3600)) failures.push("an hour-old signature passes");
  if (verifierSignatureStripe(corps, "", "whsec_test", t)) failures.push("an empty signature passes");

  // --- the circuit, against stubs --------------------------------------
  const { server: stubSrv, vu, base } = await stub();
  const ENV = {
    STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_test",
    STRIPE_PRICE_MONTHLY: "price_m", STRIPE_PRICE_QUARTERLY: "price_q",
    SUPABASE_SERVICE_ROLE_KEY: "service-test", NEXT_PUBLIC_SUPABASE_URL: base, NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-test",
    SUPABASE_API_URL: base, STRIPE_API_URL: base, ANTHROPIC_API_URL: base + "/v1/messages", ANTHROPIC_API_KEY: "k-test",
  };
  const avant = {};
  for (const [k, v] of Object.entries(ENV)) { avant[k] = process.env[k]; process.env[k] = v; }
  const { startServer, stopServer, BASE_URL } = await import("./lib/harness.mjs");
  let serveur = null;
  try {
    serveur = await startServer();
    const appel = (chemin, { jeton, corps: b, methode = "POST", entetes = {} } = {}) => fetch(BASE_URL + chemin, {
      method: methode,
      headers: { "Content-Type": "application/json", ...(jeton ? { Authorization: "Bearer " + jeton } : {}), ...entetes },
      body: methode === "POST" ? (typeof b === "string" ? b : JSON.stringify(b || {})) : undefined,
    }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => ({})) }));
    const ia = (jeton, task_name) => appel("/api/claude", { jeton, corps: { prompt: "hello", task_name } });

    let r = await ia(null, "match");
    if (r.status !== 401 || !(r.json.error && r.json.error.type === "sign_in_required")) failures.push("a visitor is not told to sign in (got " + r.status + ")");
    r = await ia("jeton-libre", "match");
    if (r.status !== 402 || !(r.json.error && r.json.error.type === "plan_required")) failures.push("an account past its free fits is not told the plan (got " + r.status + ")");
    else if (r.json.error.fits_used !== 3) failures.push("the 402 does not say how many fits were used");
    r = await ia("jeton-libre", "coach_chat");
    if (r.status !== 402) failures.push("the coach still answers an account past its free fits (got " + r.status + ")");
    const anthropicAvant = vu.anthropic;
    r = await ia("jeton-debutant", "match");
    if (r.status !== 200) failures.push("an account with free fits left is refused (got " + r.status + " " + JSON.stringify(r.json.error || "") + ")");
    if (vu.anthropic !== anthropicAvant + 1) failures.push("the free fit did not reach the model");
    const compte = vu.usages.find((u) => u.user_id === UTILISATEURS["jeton-debutant"].id);
    if (!compte) failures.push("the free fit was not counted");
    else if (compte.fits !== 2 || compte.calls !== 2) failures.push("the free fit counted " + compte.fits + " fits and " + compte.calls + " calls instead of 2 and 2");
    r = await ia("jeton-abonne", "match");
    if (r.status !== 200) failures.push("a subscriber is refused (got " + r.status + ")");
    r = await ia("jeton-abonne", "coach_chat");
    // The stub does not remember writes, so each write shows what the
    // route added to the stub's fixed count of 40: a fit adds one, the
    // coach adds none.
    const ecrits = vu.usages.filter((u) => u.user_id === UTILISATEURS["jeton-abonne"].id);
    if (ecrits.length !== 2) failures.push("the subscriber's two calls were counted " + ecrits.length + " time(s)");
    else {
      if (ecrits[0].fits !== 41 || ecrits[0].calls !== 41) failures.push("the subscriber's fit was not counted as a fit (" + JSON.stringify(ecrits[0]) + ")");
      if (ecrits[1].fits !== 40 || ecrits[1].calls !== 41) failures.push("the coach counted as a fit (" + JSON.stringify(ecrits[1]) + ")");
    }

    r = await appel("/api/billing", { jeton: "jeton-libre", methode: "GET" });
    if (!(r.json.configured === true && r.json.status === "free" && r.json.fits_used === 3 && r.json.fits_free === 3)) {
      failures.push("/api/billing does not describe a free account (" + JSON.stringify(r.json) + ")");
    }
    r = await appel("/api/billing", { jeton: "jeton-abonne", methode: "GET" });
    if (!(r.json.status === "subscribed" && r.json.plan === "mensuel" && r.json.portal === true)) {
      failures.push("/api/billing does not describe a subscriber (" + JSON.stringify(r.json) + ")");
    }
    r = await appel("/api/billing", { methode: "GET" });
    if (r.json.status !== "visitor") failures.push("/api/billing does not call a visitor a visitor");

    r = await appel("/api/billing/checkout", { jeton: "jeton-libre", corps: { plan: "trimestre" }, entetes: { Origin: "https://thenuvi.com" } });
    if (r.status !== 200 || r.json.url !== "https://checkout.stripe.test/s_1") failures.push("the checkout did not hand back Stripe's page (" + r.status + ")");
    const demande = vu.checkouts[0] || "";
    for (const morceau of ["mode=subscription", "price_q", "client_reference_id=" + UTILISATEURS["jeton-libre"].id,
      "automatic_tax%5Benabled%5D=true", "subscription_data%5Bmetadata%5D%5Buser_id%5D=", "success_url=https%3A%2F%2Fthenuvi.com%2Fapp%3Ffacture%3Dok"]) {
      if (!demande.includes(morceau)) failures.push("the checkout request lacks " + decodeURIComponent(morceau));
    }
    r = await appel("/api/billing/checkout", { corps: { plan: "mensuel" } });
    if (r.status !== 401) failures.push("a visitor can open a checkout (got " + r.status + ")");
    r = await appel("/api/billing/portal", { jeton: "jeton-abonne" });
    if (r.status !== 200 || r.json.url !== "https://billing.stripe.test/p_1") failures.push("the portal did not open for a subscriber (" + r.status + ")");
    r = await appel("/api/billing/portal", { jeton: "jeton-libre" });
    if (r.status !== 404) failures.push("the portal opens for an account without a subscription (got " + r.status + ")");

    // The webhook: a completed checkout makes the plan; a bad signature makes nothing.
    const evenement = JSON.stringify({ id: "evt_2", type: "checkout.session.completed",
      data: { object: { mode: "subscription", subscription: "sub_9", customer: "cus_9", client_reference_id: UTILISATEURS["jeton-libre"].id } } });
    r = await appel("/api/billing/webhook", { corps: evenement, entetes: { "stripe-signature": signerPourStripe(evenement, "whsec_test") } });
    if (r.status !== 200 || r.json.applied !== "checkout.session.completed") failures.push("a signed checkout event was not applied (" + r.status + " " + JSON.stringify(r.json) + ")");
    const ligne = vu.abonnements[0];
    if (!ligne) failures.push("the completed checkout wrote no subscription row");
    else if (!(ligne.user_id === UTILISATEURS["jeton-libre"].id && ligne.status === "active" && ligne.plan === "trimestre" && ligne.stripe_customer_id === "cus_9" && ligne.stripe_subscription_id === "sub_9")) {
      failures.push("the subscription row is wrong: " + JSON.stringify(ligne));
    }
    const n = vu.abonnements.length;
    r = await appel("/api/billing/webhook", { corps: evenement, entetes: { "stripe-signature": signerPourStripe(evenement, "whsec_wrong") } });
    if (r.status !== 400 || vu.abonnements.length !== n) failures.push("a webhook with a bad signature was accepted (" + r.status + ")");
    const fin = JSON.stringify({ id: "evt_3", type: "customer.subscription.deleted",
      data: { object: { id: "sub_9", customer: "cus_9", status: "canceled", current_period_end: 1790000000, items: { data: [{ price: { id: "price_q" } }] }, metadata: { user_id: UTILISATEURS["jeton-libre"].id } } } });
    r = await appel("/api/billing/webhook", { corps: fin, entetes: { "stripe-signature": signerPourStripe(fin, "whsec_test") } });
    const derniere = vu.abonnements[vu.abonnements.length - 1];
    if (r.status !== 200 || !derniere || derniere.status !== "canceled") failures.push("a cancellation did not close the plan");
  } catch (err) {
    failures.push("the circuit crashed: " + (err && err.message));
  } finally {
    if (serveur) await stopServer(serveur);
    for (const [k, v] of Object.entries(avant)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    stubSrv.close();
  }

  // --- without configuration, the product is free and the routes say so
  let serveur2 = null;
  try {
    serveur2 = await startServer();
    const r1 = await fetch(BASE_URL + "/api/billing").then((r) => r.json());
    if (r1.configured !== false) failures.push("without configuration /api/billing claims billing is on");
    const r2 = await fetch(BASE_URL + "/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    if (r2.status !== 503) failures.push("without configuration the checkout answers " + r2.status + " instead of 503");
    const r3 = await fetch(BASE_URL + "/api/billing/webhook", { method: "POST", body: "{}" });
    if (r3.status !== 503) failures.push("without configuration the webhook answers " + r3.status + " instead of 503");
  } catch (err) {
    failures.push("the unconfigured check crashed: " + (err && err.message));
  } finally {
    if (serveur2) await stopServer(serveur2);
  }

  if (!failures.length) {
    console.log("      a visitor is sent to sign in, three fits are free on an account, a subscriber passes, "
      + "the checkout asks Stripe for the right thing, and only a signed webhook makes a plan");
  }
  return failures;
}
