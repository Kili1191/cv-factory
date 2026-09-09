// PASTE A JOB LINK BEHIND THE ADDRESS, AND THE AD IS ALREADY THERE
//
// A competitor's whole growth loop is one trick: you put their domain in
// front of a job posting URL and land in their product with the ad loaded.
// It costs the person nothing to learn, it works from any job board, and
// the link is shareable. Nuvi answers the same shape:
//
//     thenuvi.com/https://job-boards.greenhouse.io/acme/jobs/4012
//
// This module holds the two parts that are worth testing on their own: how
// the address is put back together, and whether it is safe to fetch.

// WHAT THE BROWSER DOES TO THE ADDRESS ON THE WAY IN
//
// Chrome and Safari collapse the double slash of a nested URL, so the path
// arrives as "/https:/job-boards..." with one slash. Some people paste the
// link already percent-encoded, which arrives as a single segment. Some
// leave the scheme out entirely. All three mean the same thing.
export function adresseDepuisLeChemin(segments, requete = "") {
  const morceaux = (Array.isArray(segments) ? segments : [segments])
    .filter((s) => typeof s === "string" && s.length > 0);
  if (!morceaux.length) return null;

  let brut = morceaux.join("/");
  try { brut = decodeURIComponent(brut); } catch { /* already plain */ }
  brut = brut.trim();

  // The collapsed scheme, put back.
  brut = brut.replace(/^(https?):\/{0,2}/i, (m, p) => p.toLowerCase() + "://");
  // No scheme at all: a bare host only, never a relative path, so that a
  // mistyped route does not become a fetch.
  if (!/^https?:\/\//i.test(brut)) {
    if (!/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(brut)) return null;
    brut = "https://" + brut;
  }

  const q = String(requete || "").replace(/^\?/, "");
  if (q && !brut.includes("?")) brut += "?" + q;

  try {
    const u = new URL(brut);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

// WHERE THE SERVER IS ALLOWED TO GO
//
// This route makes the server fetch an address a stranger chose, which is
// the textbook shape of a server side request forgery: without a guard,
// "thenuvi.com/http://169.254.169.254/..." reads the cloud metadata service
// from inside the function. Everything private is refused by name and by
// resolved address; the caller is told which, because a person pasting a
// staging link deserves an answer rather than a silent failure.
const HOTES_INTERDITS = /^(localhost|.*\.local|.*\.internal|metadata\.google\.internal)$/i;

export function adressePriveeOuInterdite(hostname) {
  const h = String(hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (!h) return "empty host";
  if (HOTES_INTERDITS.test(h)) return "a local name";
  // IPv6 loopback, link local and unique local.
  if (h === "::1" || h === "::") return "a loopback address";
  if (/^fe80:/i.test(h)) return "a link local address";
  if (/^f[cd][0-9a-f]{2}:/i.test(h)) return "a private address";
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (v4.slice(1).some((n) => Number(n) > 255)) return "not an address";
    if (a === 127) return "a loopback address";
    if (a === 10) return "a private address";
    if (a === 0 || a === 255) return "a reserved address";
    if (a === 169 && b === 254) return "the cloud metadata address";
    if (a === 172 && b >= 16 && b <= 31) return "a private address";
    if (a === 192 && b === 168) return "a private address";
    if (a === 100 && b >= 64 && b <= 127) return "a carrier address";
  }
  return null;
}

// The pieces extension/extract.js expects, pulled out of raw HTML without a
// parser: the same job boards that the extension reads in the browser
// publish the same schema.org block on the server.
export function pageDepuisLeHtml(html, stripTags) {
  const texte = String(html || "");
  const jsonLd = [];
  const script = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = script.exec(texte)) !== null) {
    try { jsonLd.push(JSON.parse(m[1].trim())); } catch { /* a broken block is skipped */ }
  }
  const meta = {};
  const balise = /<meta\s+([^>]+)>/gi;
  while ((m = balise.exec(texte)) !== null) {
    const attrs = m[1];
    const nom = /(?:name|property)\s*=\s*["']([^"']+)["']/i.exec(attrs);
    const val = /content\s*=\s*["']([^"']*)["']/i.exec(attrs);
    if (nom && val) meta[nom[1].toLowerCase()] = val[1];
  }
  const titre = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(texte);
  if (titre && !meta["og:title"]) meta["og:title"] = stripTags(titre[1]);
  const corps = /<body[^>]*>([\s\S]*)<\/body>/i.exec(texte);
  const bodyText = stripTags((corps ? corps[1] : texte)
    .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " "));
  return { jsonLd, meta, bodyText };
}
