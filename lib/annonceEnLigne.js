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

// WHERE THE AD IS ON A PAGE THAT DOES NOT DECLARE IT
//
// The boards that publish a schema.org block are the easy half. The other
// half, and it is most of the British ones, is an ordinary page: the ad
// sits inside navigation, a cookie notice, a search form, a column of
// "jobs like this one" and a footer of county names. Handing all of that
// to the model as the ad is worse than failing, because the CV then gets
// fitted against a page of chrome and nobody can see why the result is
// poor.
//
// So the furniture is removed by tag, and the ad is looked for where a
// page puts its content: <main>, then <article>, then the block that holds
// the most running text. Density, not length: a footer of two hundred town
// names is long and says nothing, while an ad is paragraphs and bullets.
const FURNITURE = /<(script|style|noscript|svg|nav|header|footer|aside|form|iframe|template|button|select)\b[^>]*>[\s\S]*?<\/\1>/gi;
const AUTO_FERMANTES = /<(input|img|source|link|meta)\b[^>]*\/?>/gi;

function densite(html, stripTags) {
  const texte = stripTags(html);
  if (!texte) return { texte: "", score: 0 };
  // Running text is punctuated and broken into lines. A list of links is
  // neither, and this is what tells them apart without a parser.
  const phrases = (texte.match(/[.!?][\s"')\]]/g) || []).length;
  const lignes = texte.split(/\n+/).filter((l) => l.trim().length > 40).length;
  return { texte, score: texte.length + phrases * 120 + lignes * 60 };
}

export function texteDeLAnnonce(html, stripTags) {
  const propre = String(html || "").replace(FURNITURE, " ").replace(AUTO_FERMANTES, " ");
  const candidats = [];
  for (const balise of ["main", "article", "section", "div"]) {
    const re = new RegExp("<" + balise + "\\b[^>]*>([\\s\\S]*?)<\\/" + balise + ">", "gi");
    let m;
    let vus = 0;
    while ((m = re.exec(propre)) !== null && vus < 40) {
      vus += 1;
      const d = densite(m[1], stripTags);
      if (d.texte.length >= 400) candidats.push({ ...d, balise });
    }
    // <main> and <article> are declarations of intent: if the page made one
    // and it holds an ad's worth of text, no heuristic beats it.
    if ((balise === "main" || balise === "article") && candidats.length) break;
  }
  const meilleur = candidats.sort((a, b) => b.score - a.score)[0];
  const entier = densite(propre, stripTags);
  // The whole page still wins when no block stands out, so a plain page
  // with no wrappers at all is not lost.
  const retenu = !meilleur ? entier
    : (meilleur.texte.length >= entier.texte.length * 0.25 ? meilleur : entier);

  // A PAGE OF LINKS IS NOT AN AD, AND SAYING SO IS THE POINT
  //
  // A search page, a login wall or a board that draws its ad by script
  // still has plenty of words: menus, counties, cookie notices. Handing
  // those over as the ad would fit someone's CV against a navigation bar
  // and neither they nor we could see why the result was poor. An ad is
  // written in sentences; three of them is a low bar that prose clears and
  // a list of links never does.
  const phrases = (retenu.texte.match(/[.!?][\s"')\]]/g) || []).length;
  if (phrases < 3) return "";
  return retenu.texte;
}

// The pieces extension/extract.js expects, pulled out of raw HTML without a
// parser: the same job boards that the extension reads in the browser
// publish the same schema.org block on the server.
//
// THE BLOCKS ARE HANDED OVER AS TEXT, NOT AS OBJECTS
//
// extract.js takes what a <script> tag contains, because in the browser that
// is what the extension collects: element.textContent. Parsing here and
// passing the object made fromJsonLd call JSON.parse on an object, which
// stringifies it to "[object Object]", throws, and skips the block without a
// word. Every board went silently to the page-text fallback: Lever answered
// with the browser tab's title instead of the posting's, and Ashby, whose ad
// exists only inside that block, answered "no job ad found on that page".
// Measured on the live route against real ads on ten boards, 10 September
// 2026. The parse stays here only to drop a broken block.
export function pageDepuisLeHtml(html, stripTags) {
  const texte = String(html || "");
  const jsonLd = [];
  const script = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = script.exec(texte)) !== null) {
    const brut = m[1].trim();
    try { JSON.parse(brut); jsonLd.push(brut); } catch { /* a broken block is skipped */ }
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
  const bodyText = texteDeLAnnonce(corps ? corps[1] : texte, stripTags);
  return { jsonLd, meta, bodyText };
}
