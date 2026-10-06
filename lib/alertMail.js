// THE DIGEST, AS AN EMAIL
//
// `lib/digest.js` decides what is new; this file turns that into a message
// and hands it to a provider. The split is deliberate: the deciding is the
// part worth getting right and it already runs on the device, so the day a
// mail key exists the sending is a thin layer and not a second
// implementation of "what counts as new".
//
// WHAT IS MISSING, NAMED RATHER THAN GUESSED
//
// Two variables, and the screen has to say which: an alert that silently
// sends nothing is the exact failure this repo keeps finding. The Adzuna key
// cost a round trip because three causes read identically, so the rule from
// that day applies here: report ONE BOOLEAN PER NAME AND NEVER A VALUE, so
// a missing name and a wrong value can be told apart without anybody pasting
// a secret into a chat window.
//
// A MAIL PROVIDER IS A POST, NOT A DEPENDENCY
//
// Resend takes one header and one JSON body, so there is nothing to install
// and nothing to load at runtime, which keeps rule two intact. `fetch` is
// injected so the circuit can be proved against a double, the way the
// billing circuit is proved without Stripe.

export const ALERT_KEYS = ["RESEND_API_KEY", "ALERT_FROM", "SUPABASE_SERVICE_ROLE_KEY", "CRON_SECRET"];

const read = (env, name) => String((env && env[name]) || "").trim();

// One boolean per name, never a value. The test that matters is not that the
// booleans are right, it is that no secret can come out of this function.
export function alertKeysTheServerCanSee(env = {}) {
  const out = {};
  for (const name of ALERT_KEYS) out[name] = Boolean(read(env, name));
  return out;
}

// Sending needs a provider and an address to send from. The store and the
// secret belong to the schedule, not to the message, so they are reported
// separately: with a mail key alone a person can still be sent a digest from
// their own browser.
export function canSend(env = {}) {
  return Boolean(read(env, "RESEND_API_KEY") && read(env, "ALERT_FROM"));
}

export function canRunOnASchedule(env = {}) {
  return Boolean(canSend(env) && read(env, "SUPABASE_SERVICE_ROLE_KEY") && read(env, "CRON_SECRET"));
}

export function whatIsMissing(env = {}) {
  return ALERT_KEYS.filter((name) => !read(env, name));
}

const escape = (s) => String(s || "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

// THE SUBJECT LINE IS THE WHOLE MESSAGE FOR MOST PEOPLE
//
// A digest is read in a list of subject lines, so the count goes in it. A
// subject that says "Your job alert" every morning is indistinguishable from
// the last one and gets filtered within a week, which is the same failure as
// a first run that sends fifty.
export function digestSubject(fresh, query = {}, locale = "en") {
  const en = locale !== "fr";
  const n = Array.isArray(fresh) ? fresh.length : 0;
  const what = String(query.what || "").trim();
  const where = String(query.where || "").trim();
  const role = [what, where].filter(Boolean).join(", ");
  if (en) {
    return n + (n > 1 ? " new jobs" : " new job") + (role ? ": " + role : "");
  }
  return n + (n > 1 ? " nouvelles offres" : " nouvelle offre") + (role ? " : " + role : "");
}

// Nothing is sent when nothing is new. An empty digest teaches the person to
// stop opening them, and then the one that matters is unread too.
export function composeDigest({ fresh, query = {}, locale = "en", summary = "", origin = "" }) {
  const list = (Array.isArray(fresh) ? fresh : []).filter(Boolean);
  if (!list.length) return null;
  const en = locale !== "fr";

  const lines = list.slice(0, 20).map((j) => {
    const where = String(j.location || "").trim();
    return {
      title: String(j.title || "").trim(),
      company: String(j.company || "").trim(),
      where,
      url: String(j.url || "").trim(),
    };
  });

  const text = [
    summary,
    "",
    ...lines.map((l) => "- " + [l.title, l.company, l.where].filter(Boolean).join(" | ")
      + (l.url ? "\n  " + l.url : "")),
    "",
    list.length > lines.length
      ? (en ? "and " + (list.length - lines.length) + " more"
        : "et " + (list.length - lines.length) + " de plus")
      : "",
    origin ? (en ? "Open Nuvi: " + origin : "Ouvrir Nuvi : " + origin) : "",
  ].filter(Boolean).join("\n");

  const html = "<div style=\"font:15px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#22201c\">"
    + "<p style=\"color:#6b6559\">" + escape(summary) + "</p><ul style=\"padding-left:18px\">"
    + lines.map((l) => "<li style=\"margin-bottom:10px\">"
      + (l.url ? "<a href=\"" + escape(l.url) + "\" style=\"color:#22201c\">" + escape(l.title) + "</a>" : escape(l.title))
      + "<br><span style=\"color:#6b6559;font-size:13px\">"
      + escape([l.company, l.where].filter(Boolean).join(" - ")) + "</span></li>").join("")
    + "</ul>"
    + (list.length > lines.length
      ? "<p style=\"color:#6b6559\">" + escape(en ? "and " + (list.length - lines.length) + " more"
        : "et " + (list.length - lines.length) + " de plus") + "</p>" : "")
    + (origin ? "<p><a href=\"" + escape(origin) + "\">" + escape(en ? "Open Nuvi" : "Ouvrir Nuvi") + "</a></p>" : "")
    + "</div>";

  return { subject: digestSubject(list, query, locale), text, html };
}

// `doFetch` is injected so the circuit is provable against a double. It
// returns what happened rather than throwing: a digest that fails to send
// must leave a line in the logs, not take the whole run down with it.
export async function sendDigest(env, { to, subject, text, html }, doFetch = fetch) {
  if (!canSend(env)) return { sent: false, reason: "not configured", missing: whatIsMissing(env) };
  if (!to || !subject) return { sent: false, reason: "nothing to send" };
  try {
    const res = await doFetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + read(env, "RESEND_API_KEY"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: read(env, "ALERT_FROM"), to: [to], subject, text, html }),
    });
    if (!res || !res.ok) {
      return { sent: false, reason: "http " + ((res && res.status) || "?") };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: String((e && e.message) || e).slice(0, 120) };
  }
}
