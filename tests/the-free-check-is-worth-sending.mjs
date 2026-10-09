// THE ONE PAGE BUILT TO BE PASSED BETWEEN TWO PEOPLE
//
// /verifier is the only thing on this site a stranger can use in full with no
// account, no upload and no reason to trust us: it reads their file in their
// own browser and names which of six real screening systems can read it. It
// is the page somebody sends to a friend who is job hunting.
//
// And the moment it is sent, the only thing that decides whether anyone opens
// it is a card built by a messaging app from the tags in the HTML, before any
// visit. The page is a client component, so it can export none, and nothing
// else did it for it: every link carried the site's default card, "Nuvi, the
// CV that gets past the ATS", with the home page's description under it.
// Pasted into a group chat that reads as an advert, which nobody opens,
// rather than a free check on your own CV, which people do.
//
// WHY THIS IS A SUITE AND NOT A GLANCE
//
// It is the one part of the page no visitor can ever correct for us, and the
// one part nobody on the team ever looks at: you do not see your own card
// unless you paste your own link somewhere. It would go back to the default
// the day someone deletes a layout that renders nothing, and the page would
// look exactly the same in every browser.
//
// It reads the server's HTML rather than driving a browser, because that is
// what a crawler gets: the card is made from the first response, before any
// JavaScript runs.

import { startServer, stopServer } from "./lib/harness.mjs";

const BASE = "http://127.0.0.1:" + (process.env.TEST_PORT || 4311);

// Enough of the six that the description says what the tool actually does.
// Naming the systems is the whole reason to click: "ATS-friendly" is what
// every competitor says, and a named vendor is a fact.
const VENDEURS = ["Workday", "Taleo", "iCIMS", "SuccessFactors", "Greenhouse", "Lever"];

function balise(html, re) {
  const m = html.match(re);
  return m ? m[1] : "";
}

export async function run() {
  const failures = [];
  const server = await startServer();

  try {
    const [page, accueil] = await Promise.all([
      fetch(BASE + "/verifier").then((r) => r.text()),
      fetch(BASE + "/").then((r) => r.text()),
    ]);

    const titre = balise(page, /<title>([^<]*)<\/title>/);
    const titreAccueil = balise(accueil, /<title>([^<]*)<\/title>/);
    const desc = balise(page, /<meta name="description" content="([^"]*)"/);
    const ogTitre = balise(page, /<meta property="og:title" content="([^"]*)"/);
    const ogDesc = balise(page, /<meta property="og:description" content="([^"]*)"/);
    const ogUrl = balise(page, /<meta property="og:url" content="([^"]*)"/);
    const carte = balise(page, /<meta name="twitter:card" content="([^"]*)"/);

    // 1. It has a card of its own. Falling back to the site's default is the
    //    exact state this page shipped in, and it looks like nothing is wrong.
    if (!titre || titre === titreAccueil) {
      failures.push("/verifier carries the home page's title, " + JSON.stringify(titre)
        + ". Every link to the free check then advertises the product instead of "
        + "the check, and nobody who receives one can tell.");
    }
    if (!ogTitre || ogTitre === balise(accueil, /<meta property="og:title" content="([^"]*)"/)) {
      failures.push("/verifier has no og:title of its own, so a link pasted into a "
        + "message shows the home page's card.");
    }
    if (!ogDesc || ogDesc === balise(accueil, /<meta property="og:description" content="([^"]*)"/)) {
      failures.push("/verifier has no og:description of its own. The line under the "
        + "title is what decides whether a link gets opened.");
    }

    // 2. It says what the tool does. A card that could belong to any CV
    //    product is a card nobody clicks.
    const nommes = VENDEURS.filter((v) => (desc + " " + ogDesc).includes(v));
    if (nommes.length < 2) {
      failures.push("the card names " + nommes.length + " of the six screening systems. "
        + "Naming them is the reason to click: every competitor says "
        + "\"ATS-friendly\", and a named vendor is a fact. Description read: "
        + JSON.stringify((desc + " | " + ogDesc).slice(0, 140)));
    }

    // 3. And it says the two things that remove any reason not to try it.
    //    They are true, they are unusual, and they are what makes this
    //    shareable rather than another landing page.
    const promesse = (desc + " " + ogDesc).toLowerCase();
    for (const [quoi, re] of [
      ["that no account is needed", /no account/],
      ["that nothing is uploaded", /nothing (is )?upload|in your browser/],
    ]) {
      if (!re.test(promesse)) {
        failures.push("the card does not say " + quoi + ". It is true, it is rare, "
          + "and it is the reason somebody opens a link to a CV tool from a stranger.");
      }
    }

    // 4. The card points at this page. An og:url left on the site root sends
    //    everyone who clicks the card to the home page instead.
    if (!/\/verifier$/.test(ogUrl)) {
      failures.push("og:url is " + JSON.stringify(ogUrl) + " and not /verifier. The "
        + "card would open the home page, which is not what was shared.");
    }
    if (carte !== "summary_large_image") {
      failures.push("twitter:card is " + JSON.stringify(carte) + ". Without "
        + "summary_large_image the link shows as a bare URL.");
    }

    // 5. And the page itself still answers. A card for a page that 404s is
    //    worse than no card, and this suite would otherwise pass on one.
    const r = await fetch(BASE + "/verifier");
    if (!r.ok) {
      failures.push("/verifier answered HTTP " + r.status + ". Everything above was "
        + "measured on a page that does not load.");
    }
    if (!/type="file"/.test(page)) {
      failures.push("/verifier serves no file input in its HTML, so the check it "
        + "advertises cannot be started.");
    }
  } catch (e) {
    failures.push("the suite could not finish: "
      + String((e && e.message) || e).split("\n")[0].slice(0, 160));
  } finally {
    await stopServer(server);
  }

  if (!failures.length) {
    console.log("      a link to the free check carries its own card, names the "
      + "screening systems, and says no account and nothing uploaded");
  }
  return failures;
}
