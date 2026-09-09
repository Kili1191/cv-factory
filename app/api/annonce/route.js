// READ THE AD BEHIND A LINK
//
// POST { url } and the server fetches that page and pulls the job posting
// out of it, with the same extractor the browser extension uses: the job
// boards publish a schema.org JobPosting block because Google Jobs asks
// them to, and it is the one shape that survives every redesign.
//
// The address comes from a stranger, so the guard in lib/annonceEnLigne.js
// runs before anything is fetched, and again on the address of every
// redirect: a public host that redirects to 127.0.0.1 is the classic way
// past a check made only once.

import { lookup } from "node:dns/promises";
import { adressePriveeOuInterdite, pageDepuisLeHtml } from "../../../lib/annonceEnLigne.js";
import { extractJob, stripTags } from "../../../extension/extract.js";

export const runtime = "nodejs";
export const maxDuration = 20;

const TAILLE_MAX = 2_000_000;
const REDIRECTIONS_MAX = 3;

const json = (corps, status = 200) => new Response(JSON.stringify(corps), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});

async function hoteAutorise(hostname) {
  const parNom = adressePriveeOuInterdite(hostname);
  if (parNom) return parNom;
  // A public name that resolves to a private address is the same attack
  // wearing a hat.
  try {
    const adresses = await lookup(hostname, { all: true });
    for (const a of adresses) {
      const raison = adressePriveeOuInterdite(a.address);
      if (raison) return raison;
    }
  } catch {
    return "a name that does not resolve";
  }
  return null;
}

// Redirects are followed by hand so that each hop is checked.
async function chercher(depart) {
  let url = depart;
  for (let saut = 0; saut <= REDIRECTIONS_MAX; saut += 1) {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return { erreur: "not a web address" };
    const raison = await hoteAutorise(u.hostname);
    if (raison) return { erreur: raison };
    const r = await fetch(u.toString(), {
      redirect: "manual",
      headers: {
        // Job boards serve a stub to anything that looks like a script.
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
          + "(KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (r.status >= 300 && r.status < 400) {
      const suivant = r.headers.get("location");
      if (!suivant) return { erreur: "a redirect with nowhere to go" };
      url = new URL(suivant, u).toString();
      continue;
    }
    if (!r.ok) return { erreur: "the page answered " + r.status };
    const type = r.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml/i.test(type)) return { erreur: "that link is not a web page" };
    // Read with a ceiling: an endless response must not fill the function.
    const brut = await r.arrayBuffer();
    if (brut.byteLength > TAILLE_MAX) return { erreur: "that page is too large to read" };
    return { html: new TextDecoder("utf-8").decode(brut), finale: u.toString() };
  }
  return { erreur: "too many redirects" };
}

export async function POST(request) {
  let corps = {};
  try { corps = await request.json(); } catch { corps = {}; }
  const cible = String((corps && corps.url) || "").trim();
  if (!cible) return json({ error: { type: "no_url", message: "No address given" } }, 400);
  let u;
  try { u = new URL(cible); } catch { return json({ error: { type: "bad_url", message: "That is not an address" } }, 400); }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return json({ error: { type: "bad_url", message: "That is not a web address" } }, 400);
  }

  try {
    const { html, erreur, finale } = await chercher(u.toString());
    if (erreur) return json({ error: { type: "unreachable", message: erreur } }, 422);
    const job = extractJob(pageDepuisLeHtml(html, stripTags));
    if (!job || !job.description) {
      return json({ error: { type: "no_posting", message: "No job ad found on that page" } }, 422);
    }
    return json({ job: { ...job, url: finale || u.toString(), source: u.hostname } });
  } catch (err) {
    const message = err && err.name === "TimeoutError"
      ? "that page took too long to answer"
      : (err && err.message) || "could not read that page";
    return json({ error: { type: "unreachable", message } }, 422);
  }
}
