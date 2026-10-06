// THE LOOP THAT COSTS NOTHING AND THE PRODUCT NEVER OFFERED
//
// `thenuvi.com/<the ad's address>` has opened the app with that ad already
// read since the day the door shipped, and its own header says the link is
// shareable. Nothing in the product has ever produced one, so the loop could
// only be used by somebody who already knew the trick, which is nobody.
//
// The competitor grows through 73 search pages, all under /remote/. That
// needs Google's permission and a year. This needs one person to send one job
// to one friend, which happens in every group chat every day. What was
// missing was a link worth sending, and a recipient who lands in a tool that
// has read the ad rather than on a home page asking them to sign up.
//
// WHAT THIS SUITE REFUSES TO LET SLIDE
//
// A share button that makes a link the door will refuse is worse than no
// button: the person sends it, and it dies on somebody else's screen where
// neither of them can see why.

import { shareLink } from "../lib/shareLink.js";
import { adresseDepuisLeChemin } from "../lib/annonceEnLigne.js";

const HOME = "https://thenuvi.com";

export async function run() {
  const failures = [];

  // --- 1. THE LINK OPENS THE DOOR ---------------------------------------
  //
  // Not "the string looks right": the address is handed to the very function
  // the door uses to read it back, so the two can never drift apart.
  for (const ad of [
    "https://job-boards.greenhouse.io/acme/jobs/4012",
    "https://boards.lever.co/octoenergy/abc-123",
    "https://jobs.ashbyhq.com/monzo/9f8e7d?utm_source=x&ref=y",
    "https://apply.workable.com/firm/j/ABCDEF/",
  ]) {
    const link = shareLink(ad, HOME);
    if (!link) {
      failures.push("no shareable link is built for " + ad);
      continue;
    }
    // The door receives the path split into segments, exactly as Next hands
    // it over, plus the query string.
    const url = new URL(link);
    const segments = url.pathname.replace(/^\//, "").split("/");
    const readBack = adresseDepuisLeChemin(segments, url.search);
    // A TRAILING SLASH CANNOT SURVIVE, AND THAT IS THE ROUTER, NOT THE LINK
    //
    // A trailing slash makes an empty last segment, which the router drops
    // before the door's parser ever sees the path. So it is lost whatever the
    // link says, and it is harmless: the boards serve both forms or redirect
    // between them, and the door follows redirects with its guard at every
    // hop. What would be a real defect is losing the host, the path or the
    // query, so those are compared exactly.
    const same = (u) => { const x = new URL(u); return x.host + x.pathname.replace(/\/$/, "") + x.search; };
    if (!readBack || same(readBack) !== same(ad)) {
      failures.push("the door reads \"" + readBack + "\" back from the link built for \""
        + ad + "\". A link the product makes and its own door cannot read is a link "
        + "that dies on the other person's screen.");
    }
  }

  // --- 2. IT NEVER MAKES A LINK THE DOOR WOULD REFUSE --------------------
  //
  // The door makes the server fetch an address a stranger chose, so it
  // refuses anything private, by name and by resolved address. Building such
  // a link here only produces one that dies later, and the button must simply
  // not appear.
  const refused = [
    ["http://localhost:3000/job/1", "a private host"],
    ["http://127.0.0.1/job", "a loopback address"],
    ["http://169.254.169.254/latest/meta-data/", "the cloud metadata address"],
    ["mailto:someone@example.com", "an address a browser cannot open as a page"],
    ["javascript:alert(1)", "a script address"],
    ["not a url at all", "something that is not an address"],
    ["", "an empty address"],
  ];
  for (const [bad, why] of refused) {
    if (shareLink(bad, HOME) !== null) {
      failures.push("a link is built from " + why + " (" + bad + "): the person would "
        + "send a link that cannot open.");
    }
  }

  // A job already on Nuvi's own host is a loop back to this page, not a door.
  if (shareLink("https://thenuvi.com/app", HOME) !== null) {
    failures.push("a link is built back to Nuvi itself.");
  }
  // With no address for the product, there is nothing to put in front.
  if (shareLink("https://example.com/j/1", "") !== null) {
    failures.push("a link is built with no address for the product in front of it.");
  }

  // --- 3. IT OPENS THE DEPLOYMENT IT WAS BUILT ON ------------------------
  //
  // A link made on a preview deployment has to open that preview, and one
  // made inside the test harness must never send anybody to production.
  const onPreview = shareLink("https://boards.lever.co/x/1", "https://nuvi-git-abc.vercel.app");
  if (!onPreview || !onPreview.startsWith("https://nuvi-git-abc.vercel.app/")) {
    failures.push("a link built on a preview deployment points somewhere else: "
      + String(onPreview));
  }
  const local = shareLink("https://boards.lever.co/x/1", "http://localhost:4311");
  if (!local || !local.startsWith("http://localhost:4311/")) {
    failures.push("a link built by the harness does not stay on the harness: " + String(local));
  }

  // --- 4. THE QUERY STRING SURVIVES --------------------------------------
  //
  // Plenty of boards carry the posting's identity in the query rather than in
  // the path. Losing it turns a link to one job into a link to a job list.
  const withQuery = shareLink("https://example-ats.com/careers?gh_jid=4012", HOME);
  if (!withQuery || !withQuery.includes("gh_jid=4012")) {
    failures.push("the query string is dropped: the link would open a list of jobs "
      + "instead of the job that was sent.");
  }

  if (!failures.length) {
    console.log("      the link the product builds is the link its own door reads back, "
      + "it refuses every address the door would refuse, and it opens the deployment "
      + "it was built on");
  }
  return failures;
}
