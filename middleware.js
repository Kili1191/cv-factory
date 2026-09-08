// A CEILING ON THE ROUTES THAT COST MONEY
//
// Every route under /api is callable by anyone on the internet with no
// account: one spends Opus tokens per call, one launches a Chromium per
// call, two forward to job and company registries with the site's quotas.
// Nothing limited them. This middleware runs before any of them and keeps
// a per-address count over a one-minute window.
//
// The store is a Map in the edge runtime's memory: it holds for the life
// of an instance, which is enough to stop a loop or a script, and nothing
// more. A limit that must hold across every instance at once belongs in a
// shared store (Vercel KV, Upstash); this is the floor, not the ceiling.
//
// The address comes from the first x-forwarded-for entry, or from the
// platform (request.ip on Vercel). Loopback, or no address at all, is
// local: the test harness, or a developer machine. Local is exempt, and
// the suite that proves the ceiling sets the forwarded header to stand
// for a visitor.
//
// The limits are far above what a person does by hand (twenty downloads a
// minute, forty AI calls a minute) and far below what a script does.
//
// A second window, a day long, sits on the AI route. Forty calls a minute
// is 57,600 a day: a script pacing itself under the minute limit could
// spend a month of revenue in a night. Three hundred calls a day is three
// times what the heaviest hand does (a hundred applications a month is
// about fifteen calls a day), and a script gets nothing past it until
// tomorrow. Same memory, same caveat: a floor, not the ceiling.

import { NextResponse } from "next/server";

const FENETRE_MS = 60_000;
const JOUR_MS = 24 * 60 * 60 * 1000;
const LIMITES = [
  { motif: /^\/api\/pdf/, parMinute: 20 },
  { motif: /^\/api\/claude/, parMinute: 40, parJour: 300 },
  { motif: /^\/api\/(entreprise|jobs)/, parMinute: 30 },
  // A page in an error loop reports once every ten seconds by itself; a
  // script that hammers the report route gets nothing past this.
  { motif: /^\/api\/incident/, parMinute: 10 },
];
const COMPTEURS = new Map();
const MAX_ENTREES = 5000;

// Next's own server stamps the socket address into x-forwarded-for, so a
// caller on the same machine arrives as 127.0.0.1, not as nobody. Loopback
// is local by definition: the harness, a developer, never a visitor.
const LOCAL = /^(127\.\d+\.\d+\.\d+|::1|::ffff:127\.\d+\.\d+\.\d+|localhost)$/;

function adresse(req) {
  const xff = req.headers.get("x-forwarded-for") || "";
  const premiere = xff.split(",")[0].trim();
  const ip = req.ip || premiere || null;
  if (!ip || LOCAL.test(ip)) return null;
  return ip;
}

function elaguer(maintenant) {
  if (COMPTEURS.size < MAX_ENTREES) return;
  for (const [cle, c] of COMPTEURS) {
    if (maintenant - c.debut > (c.fenetre || FENETRE_MS)) COMPTEURS.delete(cle);
  }
}

// One counter per address, rule and window. Past the limit, the answer
// says when the window reopens, so the client's existing wait applies.
function compter(cle, maintenant, fenetre, limite) {
  let c = COMPTEURS.get(cle);
  if (!c || maintenant - c.debut > fenetre) {
    c = { debut: maintenant, n: 0, fenetre };
    COMPTEURS.set(cle, c);
  }
  c.n += 1;
  if (c.n <= limite) return null;
  return Math.max(1, Math.ceil((c.debut + fenetre - maintenant) / 1000));
}

function refuser(attente) {
  return new NextResponse(JSON.stringify({ error: "too many requests" }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": String(attente) },
  });
}

export function middleware(req) {
  const chemin = req.nextUrl.pathname;
  const regle = LIMITES.find((l) => l.motif.test(chemin));
  if (!regle) return NextResponse.next();
  const ip = adresse(req);
  if (!ip) return NextResponse.next();

  const maintenant = Date.now();
  elaguer(maintenant);
  const cle = ip + " " + regle.motif.source;
  // The day is counted first, so a call refused by the minute still counts
  // against the day: a script that retries every second is exactly the
  // caller the day limit is for.
  if (regle.parJour) {
    const attente = compter(cle + " jour", maintenant, JOUR_MS, regle.parJour);
    if (attente) return refuser(attente);
  }
  const attente = compter(cle, maintenant, FENETRE_MS, regle.parMinute);
  if (attente) return refuser(attente);
  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*"] };
