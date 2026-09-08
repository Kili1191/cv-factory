// THE ROUTES HAVE A CEILING
//
// Every route under /api was callable without limit by anyone: one spends
// AI tokens per call, one launches a browser. middleware.js now counts
// calls per address over a minute. This suite proves three things:
//   1. a visitor (a forwarded address) hits 429 once past the limit, with
//      a Retry-After the client's retry logic already honours;
//   2. another visitor is not affected by the first one's count;
//   3. a local caller with no address, which is what the test harness is,
//      is never limited, so the other suites keep their pace.
// The calls are POSTs with an empty body: the route answers 400 before it
// spends anything, so the suite costs nothing and proves only the ceiling.

import { startServer, stopServer, BASE_URL } from "./lib/harness.mjs";

const LIMITE_IA = 40;
const LIMITE_JOUR = 300;

async function appel(ip) {
  const headers = { "content-type": "application/json" };
  if (ip) headers["x-forwarded-for"] = ip;
  const r = await fetch(BASE_URL + "/api/claude", { method: "POST", headers, body: "{}" });
  return { status: r.status, retryAfter: r.headers.get("retry-after") };
}

export async function run() {
  const failures = [];
  const server = await startServer();
  try {
    const statuts = [];
    for (let i = 0; i < LIMITE_IA + 3; i += 1) statuts.push(await appel("203.0.113.9"));
    const premiers = statuts.slice(0, LIMITE_IA);
    const derniers = statuts.slice(LIMITE_IA);
    if (premiers.some((s) => s.status === 429)) {
      failures.push("a visitor was refused before the limit: " + premiers.map((s) => s.status).join(","));
    }
    if (!derniers.every((s) => s.status === 429)) {
      failures.push("past the limit the route still answered: " + derniers.map((s) => s.status).join(","));
    }
    if (derniers[0] && derniers[0].status === 429 && !/^\d+$/.test(derniers[0].retryAfter || "")) {
      failures.push("429 without a Retry-After in seconds (got " + derniers[0].retryAfter + ")");
    }

    const autre = await appel("203.0.113.10");
    if (autre.status === 429) failures.push("another visitor inherited the first one's count");

    // The day. A script pacing itself under the minute would have spent a
    // month of revenue in a night: past three hundred calls in a day the
    // answer says to come back tomorrow, not in a minute.
    const troisieme = "203.0.113.11";
    let dernier = null;
    for (let i = 0; i < LIMITE_JOUR + 2; i += 1) dernier = await appel(troisieme);
    const secondes = Number(dernier && dernier.retryAfter);
    if (dernier.status !== 429) failures.push("past " + LIMITE_JOUR + " calls in a day the route still answered");
    else if (!(secondes > 3600)) {
      failures.push("past the day limit the Retry-After is " + dernier.retryAfter + "s, a minute's wait instead of a day's");
    }

    const local = [];
    for (let i = 0; i < LIMITE_IA + 3; i += 1) local.push((await appel(null)).status);
    if (local.includes(429)) failures.push("a local caller, the harness itself, was limited");

    if (!failures.length) {
      console.log("      a visitor is stopped at " + LIMITE_IA + " AI calls a minute and " + LIMITE_JOUR
        + " a day with a Retry-After, another visitor is not, and the local harness never is");
    }
  } catch (err) {
    failures.push("the test crashed: " + (err && err.message ? err.message : String(err)));
  } finally {
    await stopServer(server);
  }
  return failures;
}
