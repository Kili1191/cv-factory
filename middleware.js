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

import { NextResponse } from "next/server";

const FENETRE_MS = 60_000;
const LIMITES = [
  { motif: /^\/api\/pdf/, parMinute: 20 },
  { motif: /^\/api\/claude/, parMinute: 40 },
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
    if (maintenant - c.debut > FENETRE_MS) COMPTEURS.delete(cle);
  }
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
  let c = COMPTEURS.get(cle);
  if (!c || maintenant - c.debut > FENETRE_MS) {
    c = { debut: maintenant, n: 0 };
    COMPTEURS.set(cle, c);
  }
  c.n += 1;
  if (c.n <= regle.parMinute) return NextResponse.next();

  const attente = Math.max(1, Math.ceil((c.debut + FENETRE_MS - maintenant) / 1000));
  return new NextResponse(JSON.stringify({ error: "too many requests" }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": String(attente) },
  });
}

export const config = { matcher: ["/api/:path*"] };
