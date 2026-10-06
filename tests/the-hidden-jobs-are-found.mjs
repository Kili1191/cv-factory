// THE JOBS THAT ARE ON NO JOB SITE
//
// Kilian, 6 October 2026, showing careerhound.io: "can we do the same?" That
// product sells exactly one thing, roles posted on a company's own site and
// nowhere else, and its argument is right: an ad on an aggregator has two
// hundred applicants within the hour, the employer pays a commission, and
// they prefer direct applications.
//
// Technically it is within reach for a reason we had already measured
// without seeing it: Indeed and LinkedIn answer 401 to a server, and the
// ATSs serve everything as public JSON with no key. The jobs Nuvi will never
// read are the ones not worth aiming at; the ones it reads effortlessly are
// the ones where an application counts.
//
// WHAT THIS SUITE HOLDS, WITH NO NETWORK
//
// The real reads belong to a third party's CI, not ours: a Greenhouse board
// changing shape on a Tuesday must not turn this suite red. So it holds what
// is ours, which is also what broke while it was being written:
//
//   1. Every ATS is read in the shape it really returns, taken from a real
//      board on the day this was written.
//   2. "account manager" does not return "Senior Manager, Accounting". That
//      was the first version's defect: includes() finds "account" inside
//      "accounting", and three of the first ten results were accountancy.
//   3. A house job title is still found, but only if the ad writes the whole
//      phrase. "Client Partner" at Deliveroo is an account management role
//      and its title does not say so. The earlier rule accepted the two
//      words anywhere in the body, and every manager ad contains "account"
//      once: twenty results out of twenty-nine were the wrong trade.
//   4. The registry holds only verified companies with a known ATS. A
//      guessed line would be a slower search for nothing.

import { ATS, ATS_NAMES, normalise, locationMatches, titleMatches, readABoard, inTheMarket, MARKETS } from "../lib/ats.js";
import { BOARDS, companyName, boardsForMarket } from "../lib/boards.js";

// The shapes taken from real boards on 6 October 2026.
const RESPONSES = {
  greenhouse: { jobs: [{ title: "Corporate Account Manager", location: { name: "London, UK" },
    absolute_url: "https://job-boards.greenhouse.io/x/jobs/1", updated_at: "2026-10-01", content: "Own a portfolio." }] },
  lever: [{ text: "Account Manager", categories: { location: "London" },
    hostedUrl: "https://jobs.lever.co/x/1", createdAt: 1759276800000, descriptionPlain: "Own a portfolio." }],
  ashby: { jobs: [{ title: "Account Manager", location: "London", jobUrl: "https://jobs.ashbyhq.com/x/1",
    publishedAt: "2026-10-01", descriptionPlain: "Own a portfolio." }] },
  recruitee: { offers: [{ title: "Account Manager", city: "London", country: "UK",
    careers_url: "https://x.recruitee.com/o/1", published_at: "2026-10-01", description: "Own a portfolio." }] },
  teamtailor: { jobs: [{ title: "Account Manager", location: "London",
    url: "https://x.teamtailor.com/jobs/1", created_at: "2026-10-01", body: "Own a portfolio." }] },
  personio: [{ name: "Account Manager", office: "London", url: "https://x.jobs.personio.com/job/1",
    createdAt: "2026-10-01" }],
};

export async function run() {
  const failures = [];

  // --- 1. EVERY ATS IS READ IN THE SHAPE IT REALLY RETURNS --------------
  for (const name of ATS_NAMES) {
    const posts = ATS[name].read(RESPONSES[name]);
    if (posts.length !== 1) {
      failures.push(name + ": " + posts.length + " jobs read instead of one, from the shape this ATS really returns");
      continue;
    }
    const p = normalise(posts[0], "Test Ltd", "ats");
    if (!/account manager/i.test(p.title)) failures.push(name + ": the title is not read (\"" + p.title + "\")");
    if (!/london/i.test(p.location)) failures.push(name + ": the location is not read (\"" + p.location + "\")");
    if (!/^https?:\/\//.test(p.url)) {
      failures.push(name + ": no address to apply at.\n" +
        "      A job with no link is a job nobody can take.");
    }
    if (p.company !== "Test Ltd") failures.push(name + ": the company is lost");
  }

  // --- 2. ACCOUNTANCY IS NOT ACCOUNT MANAGEMENT -------------------------
  const accountant = { title: "Senior Manager, Accounting", description: "Month end close and reporting." };
  if (titleMatches(accountant, "account manager")) {
    failures.push(
      "\"Senior Manager, Accounting\" is returned for \"account manager\".\n" +
      "      includes() finds \"account\" inside \"accounting\": three of the first ten\n" +
      "      results of the first version were the wrong trade."
    );
  }

  // --- 3. A HOUSE JOB TITLE IS STILL FOUND ------------------------------
  const house = { title: "Client Partner",
    description: "Own a portfolio of SME accounts, acting as their account manager day to day." };
  if (!titleMatches(house, "account manager")) {
    failures.push(
      "\"Client Partner\" is not found for \"account manager\".\n" +
      "      That is Deliveroo's account management role; its title does not say so, and\n" +
      "      it is exactly the kind of job nobody sees."
    );
  }
  const far = { title: "Data Science Manager",
    description: "You will work with the credit account teams. Reports to the senior manager." };
  if (titleMatches(far, "account manager")) {
    failures.push(
      "\"Data Science Manager\" is returned for \"account manager\".\n" +
      "      The two words sit three paragraphs apart in the body, which every manager ad\n" +
      "      does: twenty results out of twenty-nine were the wrong trade."
    );
  }

  // --- 4. A LOCATION IS FREE TEXT ---------------------------------------
  for (const location of ["London", "London, United Kingdom", "London, England", "UK - London", "Remote, UK"]) {
    if (!locationMatches(location, "London")) {
      failures.push("\"" + location + "\" is not recognised as London: every ATS writes it differently");
    }
  }
  if (locationMatches("Paris, France", "London")) failures.push("Paris is returned for a London search");

  // --- 5. THE REGISTRY HOLDS ONLY VERIFIED LINES ------------------------
  if (BOARDS.length < 20) {
    failures.push("the registry carries only " + BOARDS.length + " companies: too few for the search to be worth anything");
  }
  const slugs = new Set();
  for (const b of BOARDS) {
    if (!ATS_NAMES.includes(b.ats)) failures.push(b.slug + ': unknown ATS "' + b.ats + '"');
    if (!b.slug || !b.name) failures.push(JSON.stringify(b) + ": incomplete line");
    if (slugs.has(b.slug)) failures.push(b.slug + ": duplicated in the registry");
    slugs.add(b.slug);
  }
  if (companyName("monzo") === "monzo") {
    failures.push("monzo has no readable name: the list would show an identifier");
  }

  // --- 6. ANSWERING IS NOT BELONGING ------------------------------------
  //
  // An ATS identifier is global and short, so it gets shared. The strings
  // below are the ones really read on 6 October 2026 while guessing London
  // company names: `bbc.recruitee.com` posts in Mechelen, Belgium, and
  // `web.jobs.personio.com` in Munich. Both answered with jobs, and the rule
  // "a line written is a line that answered" would have recorded them as the
  // BBC and as a London university.
  const impostors = [
    ["Mechelen, Vlaams Gewest, Belgium", "bbc.recruitee.com, which is not the BBC"],
    ["M\u00fcnchen", "web.jobs.personio.com, which is not in London"],
    ["Salt Lake City", "an American board"],
    // There is a Cambridge, a Boston, a Birmingham, a Manchester, a Bristol,
    // a Reading and an Oxford in the United States. The first list of British
    // words contained "cambridge", and `greenhouse.io/serif`, Serif
    // Biomedicines in Cambridge Massachusetts, entered the registry as
    // British. A marker from elsewhere beats a city name: that is the only
    // order that does not get it wrong.
    ["Cambridge, MA", "Serif Biomedicines, which is in Massachusetts"],
    ["Boston, MA", "a namesake of the Lincolnshire one"],
    ["Reading, PA", "a namesake of the Berkshire one"],
    ["Toronto, Ontario, Canada", "Lush's Canadian board"],
    ["Dublin, Ireland", "Ireland, which is not the United Kingdom"],
  ];
  for (const [location, what] of impostors) {
    if (inTheMarket(location, "gb")) {
      failures.push(
        "\"" + location + "\" passes as the British market: " + what + " would enter the registry.\n" +
        "      The location filter is the only thing telling a namesake from a company."
      );
    }
  }
  // The named country always wins, even inside a multi-site string:
  // otherwise a job open in New York AND London would be lost.
  for (const location of ["London, UK", "Manchester", "Remote, England", "Edinburgh, Scotland",
    "United Kingdom", "Cambridge, Cambridgeshire", "Reading, Berkshire",
    "New York, NY \u00b7 London, United Kingdom"]) {
    if (!inTheMarket(location, "gb")) {
      failures.push("\"" + location + "\" is refused from the British market: real companies would be lost");
    }
  }
  // An unknown market must filter nothing: otherwise adding a country to the
  // registry would empty its search in silence, with nothing saying so.
  if (!inTheMarket("Sao Paulo", "br")) {
    failures.push("a market missing from MARKETS filters everything: the search empties without saying so");
  }
  if (Object.keys(MARKETS).length < 4) failures.push("MARKETS covers almost no country");

  // --- 7. A FIELD THAT GETS ADDED REMOVES NOBODY ------------------------
  //
  // The first forty-nine lines have no market. If the filter dropped them,
  // yesterday's search would return less than the day before's, and that is
  // exactly the kind of regression no screen shows.
  const noMarket = BOARDS.filter((b) => !b.market);
  for (const code of ["gb", "fr", "us", "zz"]) {
    const kept = boardsForMarket(code);
    for (const b of noMarket) {
      if (!kept.some((x) => x.slug === b.slug)) {
        failures.push(b.slug + " disappears from the " + code
          + " search although its line declares no market");
        break;
      }
    }
  }
  const gb = boardsForMarket("gb");
  if (BOARDS.some((b) => b.market === "fr") && gb.some((b) => b.market === "fr")) {
    failures.push("a board declared French is read by a British search: the market filters nothing");
  }
  for (const b of BOARDS) {
    if (b.market && !MARKETS[b.market]) {
      failures.push(b.slug + ' carries the market "' + b.market + '", which inTheMarket does not know:'
        + " its line will never be filtered on location");
    }
  }

  // --- 8. A SILENT BOARD DOES NOT BREAK THE SEARCH ----------------------
  //
  // A company changes ATS and its identifier stops answering. If this read
  // threw, the other forty-eight would be lost with it.
  const dead = await readABoard("doesnotexist", "greenhouse", async () => { throw new Error("ENOTFOUND"); });
  if (!dead.error || dead.posts.length) {
    failures.push("an unreachable board does not report an error: the whole search falls with it");
  }
  const unknown = await readABoard("x", "notanats", async () => { throw new Error("never called"); });
  if (!unknown.error) failures.push("an unknown ATS is not refused");

  if (!failures.length) {
    console.log("      " + BOARDS.length + " verified career pages ("
      + boardsForMarket("gb").length + " for the British market), six ATSs read in their real shape, "
      + "and neither accountancy nor namesakes reach the results");
  }
  return failures;
}
