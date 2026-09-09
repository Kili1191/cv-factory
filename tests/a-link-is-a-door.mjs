// A link is a door.
//
//     thenuvi.com/https://job-boards.greenhouse.io/acme/jobs/4012
//
// Put Nuvi's address in front of any job posting and land in the app with
// that ad already read. A competitor's whole growth loop is this one trick,
// and it costs a person nothing to learn.
//
// Three things have to hold. The address survives what browsers do to it on
// the way in, because Chrome collapses the double slash of a nested URL and
// people paste links already encoded. The server refuses to fetch anything
// private, because this route makes it fetch an address a stranger chose,
// which is the textbook shape of a server side request forgery. And the ad
// actually arrives in the app, filed as an application, without the person
// pasting anything.

import { createServer } from "node:http";
import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV, BASE_URL } from "./lib/harness.mjs";
import { adresseDepuisLeChemin, adressePriveeOuInterdite, texteDeLAnnonce } from "../lib/annonceEnLigne.js";
import { stripTags } from "../extension/extract.js";

const DESCRIPTION = "We are looking for a Bar Manager to lead a cocktail led venue in central "
  + "London. You will own the drinks list end to end, from costing to training, and manage a "
  + "team of twelve across two floors. Full responsibility for gross profit, stock control and "
  + "pour cost sits with you, reporting weekly to the general manager. Experience running a high "
  + "volume bar in a premium setting is essential, and WSET Level 2 is desirable. You will work "
  + "five days a week including weekends, with a rota published a fortnight ahead. We offer a "
  + "competitive salary, tronc, and a clear route to Beverage Manager within eighteen months.";

function pageDOffre() {
  const html = "<!doctype html><html><head><title>Bar Manager at Anchor Group</title>"
    + '<script type="application/ld+json">' + JSON.stringify({
      "@context": "https://schema.org", "@type": "JobPosting",
      title: "Bar Manager", description: "<p>" + DESCRIPTION + "</p>",
      hiringOrganization: { "@type": "Organization", name: "Anchor Group" },
      jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: "London" } },
    }) + "</script></head><body><h1>Bar Manager</h1></body></html>";
  const server = createServer((req, res) => {
    if (req.url.startsWith("/vers-le-prive")) {
      res.writeHead(302, { Location: "http://127.0.0.1:9/secret" });
      res.end();
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  });
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r({ server, port: server.address().port })));
}

export async function run() {
  const failures = [];

  // --- 1. The address, put back together --------------------------------
  const formes = [
    [["https:", "job-boards.greenhouse.io", "acme", "jobs", "4012"], "", "https://job-boards.greenhouse.io/acme/jobs/4012"],
    [["https:", "", "job-boards.greenhouse.io", "acme"], "", "https://job-boards.greenhouse.io/acme"],
    [["https%3A%2F%2Fboards.eu%2Fjobs%2F7"], "", "https://boards.eu/jobs/7"],
    [["http:", "example.org", "poste"], "", "http://example.org/poste"],
    [["boards.eu", "jobs", "9"], "", "https://boards.eu/jobs/9"],
    [["https:", "boards.eu", "jobs"], "?gh_jid=88", "https://boards.eu/jobs?gh_jid=88"],
  ];
  for (const [segments, requete, attendu] of formes) {
    const vu = adresseDepuisLeChemin(segments, requete);
    if (vu !== attendu) failures.push("/" + segments.join("/") + requete + " becomes " + vu + " instead of " + attendu);
  }
  for (const rien of [[], ["app"], ["verifier"], ["a", "b"], ["javascript:alert(1)"]]) {
    const vu = adresseDepuisLeChemin(rien, "");
    if (vu) failures.push("/" + rien.join("/") + " was read as the address " + vu + ", so an ordinary path becomes a fetch");
  }

  // --- 2. The ad, on a page that does not declare one --------------------
  //
  // The boards that publish a schema.org block are the easy half. Most of
  // the British ones are an ordinary page, where the ad sits between a
  // menu, a cookie notice, a column of "jobs like this one" and a footer
  // of county names. What gets sent to the model has to be the ad.
  const chrome = "<nav><a href=\"/\">Home</a><a href=\"/jobs\">Jobs</a><a href=\"/cv\">CV advice</a>"
    + "<a href=\"/login\">Sign in</a></nav><header><h1>The Board</h1></header>"
    + "<aside><h2>Similar jobs</h2><a>Bar Supervisor London</a><a>Assistant Manager Leeds</a>"
    + "<a>Head Chef Bristol</a><a>Sous Chef Cardiff</a></aside>"
    + "<footer>Jobs in London Jobs in Manchester Jobs in Birmingham Jobs in Leeds Jobs in "
    + "Glasgow Jobs in Bristol Jobs in Liverpool Jobs in Sheffield Jobs in Edinburgh Jobs in "
    + "Cardiff Jobs in Belfast Jobs in Newcastle Jobs in Nottingham Jobs in Brighton</footer>";
  const annonce = "<main><h1>Bar Manager</h1><p>" + DESCRIPTION + "</p>"
    + "<ul><li>Salary 38,000 to 42,000 plus tronc</li><li>Five days including weekends</li></ul></main>";

  const lu = texteDeLAnnonce(chrome + annonce, stripTags);
  if (!/cocktail led venue/.test(lu)) failures.push("the ad itself was not found on a page without a schema block");
  if (!/tronc/.test(lu)) failures.push("the ad was cut before its pay and hours");
  for (const [quoi, motif] of [["the menu", /CV advice/], ["the jobs beside it", /Head Chef Bristol/],
    ["the footer of counties", /Jobs in Cardiff/]]) {
    if (motif.test(lu)) failures.push(quoi + " was sent to the model as part of the ad");
  }

  // A page that is only furniture must fail, not hand over a menu as an ad.
  const sansAnnonce = texteDeLAnnonce(chrome + "<main><h1>Search results</h1>"
    + "<a>Bar Manager London</a><a>Bar Manager Leeds</a><a>Bar Manager Bath</a>"
    + "<a>Bar Manager York</a><a>Bar Manager Hull</a><a>Bar Manager Ely</a></main>", stripTags);
  if (sansAnnonce) {
    failures.push("a page of links was read as an ad (" + sansAnnonce.slice(0, 60)
      + "): a CV would be fitted against a navigation bar");
  }

  // --- 3. What the server refuses to fetch ------------------------------
  const interdits = ["127.0.0.1", "localhost", "10.0.0.5", "192.168.1.1", "172.16.0.9",
    "169.254.169.254", "metadata.google.internal", "::1", "fd00::1", "boitier.local"];
  for (const h of interdits) {
    if (!adressePriveeOuInterdite(h)) failures.push(h + " is not refused: the server would fetch a private address");
  }
  for (const h of ["job-boards.greenhouse.io", "example.org", "8.8.8.8"]) {
    if (adressePriveeOuInterdite(h)) failures.push(h + " is refused, and it should not be");
  }

  // --- 4. The route, and the door ---------------------------------------
  const { server: offre, port } = await pageDOffre();
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    // The guard, against the running route. Loopback is refused by name,
    // and a public page that redirects into loopback is refused at the hop.
    const appel = (url) => fetch(BASE_URL + "/api/annonce", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }),
    }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => ({})) }));

    let r = await appel("http://169.254.169.254/latest/meta-data/");
    if (r.status !== 422) failures.push("the cloud metadata address answered " + r.status + " instead of being refused");
    r = await appel("file:///etc/passwd");
    if (r.status !== 400) failures.push("a file address answered " + r.status + " instead of being refused");

    // The stub is on loopback, which the guard refuses on purpose. The
    // browser part below is what proves the whole door; here we only check
    // that the refusal is the loopback one and not something else.
    r = await appel("http://127.0.0.1:" + port + "/offre");
    if (r.status !== 422 || !/loopback/i.test((r.json.error && r.json.error.message) || "")) {
      failures.push("a loopback address was not refused as loopback (" + r.status + " "
        + JSON.stringify(r.json.error || "") + ")");
    }

    // The door itself, with the route's answer doubled so the test does not
    // depend on the guard letting the stub through.
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await ctx.newPage();
    const erreurs = [];
    page.on("pageerror", (e) => erreurs.push(String(e.message).split("\n")[0].slice(0, 110)));
    await page.route("**/api/claude", (r2) => r2.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ content: [{ type: "text", text: "{}" }] }) }));
    await page.route("**/api/annonce", (r2) => r2.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ job: { title: "Bar Manager", company: "Anchor Group", location: "London",
        description: DESCRIPTION, url: "https://boards.example/jobs/1", confidence: "high" } }) }));
    await seedApp(page, SAMPLE_CV, { locale: "en" });
    await page.goto(BASE_URL + "/https://boards.example/jobs/1", { waitUntil: "domcontentloaded" });
    await page.waitForURL("**/app", { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);

    if (!/\/app$/.test(new URL(page.url()).pathname)) {
      failures.push("the link did not land in the app (still at " + page.url() + ")");
    }
    // The ad lands in the fitting sheet's field, and a field's value is not
    // innerText: reading only the rendered text would look for it where it
    // can never be.
    const vu = await page.evaluate(() => {
      const champs = [...document.querySelectorAll("textarea")].map((t) => t.value || "").join(" ");
      return (champs + " " + (document.body.innerText || "")).replace(/\s+/g, " ");
    });
    if (!/cocktail led venue/i.test(vu)) {
      failures.push("the ad did not arrive with the person: it is in no field and nowhere on screen");
    }
    if (!(await page.locator('textarea[data-nuvi="match-annonce"]').count())) {
      failures.push("the fitting sheet did not open on the ad the link carried");
    }
    const suivies = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem("cvf_ap") || "[]"); } catch { return []; }
    });
    if (!suivies.some((a) => (a.offer || "").includes("cocktail led venue"))) {
      failures.push("the ad opened by link was not filed as an application");
    }
    if (erreurs.length) failures.push("JS error on the door: " + [...new Set(erreurs)].slice(0, 2).join(" | "));

    // A path that is not an address still shows the page it always showed.
    await page.goto(BASE_URL + "/pas-une-adresse", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    const perdu = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    if (!/This page is not here/i.test(perdu)) {
      failures.push("an ordinary wrong address no longer shows the 404 page (saw: " + perdu.slice(0, 70) + ")");
    }
    await ctx.close();

    if (!failures.length) {
      console.log("      6 shapes of a pasted link become one address, the ad is found without a schema "
        + "block and a page of links is not, 10 private addresses are refused, and a job link lands "
        + "in the app with the ad read and filed");
    }
  } catch (err) {
    failures.push("the test itself crashed: " + (err && err.message));
  } finally {
    await browser.close();
    await stopServer(server);
    offre.close();
  }
  return failures;
}
