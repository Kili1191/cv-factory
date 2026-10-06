// AN ALERT THAT SENDS NOTHING MUST SAY WHY
//
// The Adzuna key cost a round trip because three causes read identically:
// the variable absent, the name misspelt, the value wrong. The answer then
// was a report of ONE BOOLEAN PER NAME AND NEVER A VALUE, and the test that
// mattered was not that the booleans were right, it was that no secret could
// come out. The same applies here, more so: a mail key and a service role key
// are the two most dangerous strings in the deployment.
//
// This suite also holds the message itself, because an alert is read in a
// list of subject lines. "Your job alert" every morning is indistinguishable
// from yesterday's and gets filtered within a week, which is the same failure
// as a first run that sends fifty.

import {
  ALERT_KEYS, alertKeysTheServerCanSee, canSend, canRunOnASchedule,
  whatIsMissing, composeDigest, digestSubject, sendDigest,
} from "../lib/alertMail.js";

const SECRET = "ZZtopSecretZZ-9f3a1c";

export async function run() {
  const failures = [];

  // --- 1. NOT ONE PIECE OF A VALUE COMES OUT ----------------------------
  const planted = {};
  for (const name of ALERT_KEYS) planted[name] = SECRET + "-" + name;
  const report = alertKeysTheServerCanSee(planted);
  const asText = JSON.stringify(report);
  if (asText.includes(SECRET) || asText.includes("ZZtop")) {
    failures.push("a key's value reaches the report: " + asText);
  }
  for (const name of ALERT_KEYS) {
    if (report[name] !== true) failures.push(name + " is set and the report says " + report[name]);
    if (typeof report[name] !== "boolean") {
      failures.push(name + " is reported as a " + typeof report[name] + " instead of a boolean, "
        + "which is how a value escapes.");
    }
  }
  const empty = alertKeysTheServerCanSee({});
  if (Object.values(empty).some((v) => v !== false)) {
    failures.push("an unset key reports as present, so nothing on screen can explain the silence.");
  }

  // --- 2. THE TWO HALVES ARE REPORTED APART -----------------------------
  //
  // With a mail key alone a digest can still be sent from a browser. The
  // store and the secret belong to the schedule. Merging them would hide a
  // half that works behind a half that does not.
  const mailOnly = { RESEND_API_KEY: "k", ALERT_FROM: "nuvi@example.com" };
  if (!canSend(mailOnly)) failures.push("a mail key and a from address are not enough to send.");
  if (canRunOnASchedule(mailOnly)) {
    failures.push("a schedule claims to be possible with no store and no secret: the cron would "
      + "run and quietly send nothing.");
  }
  const missing = whatIsMissing(mailOnly);
  if (!missing.includes("SUPABASE_SERVICE_ROLE_KEY") || !missing.includes("CRON_SECRET")) {
    failures.push("the missing list does not name what is missing: " + missing.join(", "));
  }
  if (missing.includes("RESEND_API_KEY")) failures.push("a key that is set is listed as missing.");

  // --- 3. NOTHING IS SENT WHEN NOTHING IS NEW ---------------------------
  //
  // An empty digest teaches the person to stop opening them, and then the one
  // that matters goes unread too.
  if (composeDigest({ fresh: [], query: { what: "account manager" } }) !== null) {
    failures.push("a digest is composed with nothing new in it.");
  }

  // --- 4. THE SUBJECT LINE CARRIES THE COUNT ----------------------------
  const one = digestSubject([{}], { what: "account manager", where: "London" }, "en");
  const many = digestSubject([{}, {}, {}], { what: "account manager", where: "London" }, "en");
  if (!/^1 new job/.test(one)) failures.push("a single job reads \"" + one + "\"");
  if (!/^3 new jobs/.test(many)) failures.push("three jobs read \"" + many + "\"");
  if (one === many) failures.push("two different digests carry the same subject line.");
  if (!many.includes("account manager")) failures.push("the subject does not say which search it is.");
  const fr = digestSubject([{}, {}], { what: "gestion de comptes" }, "fr");
  if (/new job/.test(fr)) failures.push("the French subject is in English: " + fr);

  // --- 5. THE MESSAGE CARRIES THE JOBS AND ESCAPES THEM -----------------
  const jobs = [
    { title: "Account Manager", company: "Alpha & Sons", location: "London", url: "https://e.invalid/1" },
    { title: "<script>x</script>", company: "Beta", location: "Leeds", url: "https://e.invalid/2" },
  ];
  const msg = composeDigest({ fresh: jobs, query: { what: "account manager" }, locale: "en",
    summary: "2 new jobs, from 50 looked at", origin: "https://thenuvi.com" });
  if (!msg) {
    failures.push("no message is composed from two new jobs.");
  } else {
    if (!msg.text.includes("Account Manager") || !msg.text.includes("https://e.invalid/1")) {
      failures.push("the plain text message loses the job or its link.");
    }
    if (!msg.text.includes("50")) failures.push("the message does not say what was looked at.");
    if (msg.html.includes("<script>")) {
      failures.push("a job title is put into the HTML without escaping: an ad's own text would "
        + "run as markup in the person's mail client.");
    }
    if (!msg.html.includes("&lt;script&gt;")) failures.push("the title was dropped rather than escaped.");
    if (!msg.html.includes("Alpha &amp; Sons")) failures.push("an ampersand in a company name is not escaped.");
  }

  // --- 6. A SEND THAT FAILS SAYS SO AND DOES NOT THROW ------------------
  //
  // A digest that fails has to leave a line, not take the whole run down with
  // every other person's digest in it.
  const live = { RESEND_API_KEY: "k", ALERT_FROM: "nuvi@example.com" };
  const ok = await sendDigest(live, { to: "a@b.invalid", subject: "s", text: "t", html: "<p>t</p>" },
    async () => ({ ok: true, status: 200 }));
  if (!ok.sent) failures.push("a send against a provider that answers 200 reports a failure: " + ok.reason);

  const refused = await sendDigest(live, { to: "a@b.invalid", subject: "s", text: "t", html: "" },
    async () => ({ ok: false, status: 422 }));
  if (refused.sent) failures.push("a provider refusing with 422 is reported as sent.");
  if (!String(refused.reason).includes("422")) {
    failures.push("the refusal does not name the code: \"" + refused.reason + "\"");
  }

  const broken = await sendDigest(live, { to: "a@b.invalid", subject: "s", text: "t", html: "" },
    async () => { throw new Error("network down"); });
  if (broken.sent) failures.push("a send that threw is reported as sent.");
  if (!String(broken.reason).includes("network down")) {
    failures.push("a send that threw loses the reason: \"" + broken.reason + "\"");
  }

  const unconfigured = await sendDigest({}, { to: "a@b.invalid", subject: "s" },
    async () => { throw new Error("should never be called"); });
  if (unconfigured.sent) failures.push("a send with no key reports as sent.");
  if (!unconfigured.missing || !unconfigured.missing.length) {
    failures.push("a send with no key does not say which key is missing.");
  }

  // And the request really carries the key, or the send is a no-op that
  // reports success.
  let seen = null;
  await sendDigest(live, { to: "a@b.invalid", subject: "s", text: "t", html: "" },
    async (url, init) => { seen = { url, init }; return { ok: true, status: 200 }; });
  if (!seen || !/resend\.com/.test(seen.url)) failures.push("the send does not reach a provider.");
  if (!seen || !String(seen.init.headers.Authorization).includes("k")) {
    failures.push("the request carries no key: the provider would refuse every digest.");
  }
  if (!seen || !String(seen.init.body).includes("a@b.invalid")) {
    failures.push("the request does not carry the address it is being sent to.");
  }

  if (!failures.length) {
    console.log("      no value escapes the report, the two halves are named apart, an empty "
      + "digest is never sent, the message escapes what an ad wrote, and a failed send says why");
  }
  return failures;
}
