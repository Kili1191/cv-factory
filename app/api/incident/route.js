// WHERE A BREAKAGE LANDS
//
// The browser sends here what went wrong (lib/incidents.js): short
// messages, a build id, a device string, never CV text. The route writes
// one line per report to the function's log, which Vercel keeps and
// shows, so the owner reads breakages there instead of waiting for a
// screenshot. When INCIDENT_WEBHOOK_URL is set, the same report is posted
// to it as JSON: a Slack or Discord incoming webhook, or anything that
// takes a POST, so a phone can buzz on a broken export without an
// account at an error-tracking vendor. The webhook is optional and its
// failure is silent: a breakage report must never itself break.
//
// The body is capped at 16 KB and validated by shape. Anything else is a
// 400, and the route answers 204 with nothing to read: a reporter needs
// no confirmation body, and there is nothing here worth fetching.

export const runtime = "nodejs";
export const maxDuration = 10;

const MAX_OCTETS = 16 * 1024;
const MAX_INCIDENTS = 40;

function texte(v, max) { return typeof v === "string" ? v.slice(0, max) : ""; }

function incidentSur(i) {
  if (!i || typeof i !== "object") return null;
  return {
    quand: texte(i.quand, 40), genre: texte(i.genre, 40), message: texte(i.message, 300),
    ou: texte(i.ou, 120), build: texte(i.build, 60), appareil: texte(i.appareil, 80),
    ecran: texte(i.ecran, 20), langue: texte(i.langue, 20), source: texte(i.source, 60),
  };
}

export async function POST(req) {
  const brut = await req.text().catch(() => "");
  if (!brut || brut.length > MAX_OCTETS) {
    return new Response(null, { status: brut ? 413 : 400 });
  }
  let corps;
  try { corps = JSON.parse(brut); } catch (e) { return new Response(null, { status: 400 }); }
  if (!corps || typeof corps !== "object" || !Array.isArray(corps.incidents)) {
    return new Response(null, { status: 400 });
  }
  const incidents = corps.incidents.slice(0, MAX_INCIDENTS).map(incidentSur).filter(Boolean);
  const rapport = {
    recu: new Date().toISOString(),
    rapport: corps.rapport === true,
    note: texte(corps.note, 2000),
    forme: corps.forme && typeof corps.forme === "object" ? corps.forme : null,
    ou: texte(corps.ou, 120), build: texte(corps.build, 60),
    appareil: texte(corps.appareil, 80), ecran: texte(corps.ecran, 20),
    incidents,
  };
  if (!incidents.length && !rapport.rapport) return new Response(null, { status: 400 });

  // One line, JSON, easy to grep in the function logs.
  console.error("[incident] " + JSON.stringify(rapport));

  const webhook = process.env.INCIDENT_WEBHOOK_URL;
  if (webhook && /^https:\/\//.test(webhook)) {
    try {
      const resume = (rapport.rapport ? "Report from a person" : "Incident") + " on " + (rapport.ou || "?")
        + " (build " + (rapport.build || "?") + "): "
        + (rapport.note || (incidents[0] && (incidents[0].genre + " " + incidents[0].message)) || "");
      await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        // "text" and "content" cover Slack and Discord incoming webhooks;
        // the full report rides along for anything else.
        body: JSON.stringify({ text: resume, content: resume.slice(0, 1900), rapport }),
        signal: AbortSignal.timeout(4000),
      });
    } catch (e) { /* the webhook is a convenience, never a dependency */ }
  }
  return new Response(null, { status: 204 });
}
