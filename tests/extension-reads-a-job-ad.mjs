// L'extension doit lire une annonce sur n'importe quel site d'emploi.
//
// L'approche par selecteurs propres a chaque site aurait demande un correctif
// a chaque refonte de LinkedIn ou d'Indeed, et n'aurait rien donne ailleurs.
// On lit donc les donnees structurees schema.org "JobPosting" que ces sites
// publient deja, parce que Google Jobs l'exige pour les referencer.
//
// Ce test fournit les formes reellement rencontrees dans la nature. Elles ne
// sont pas propres : le meme champ arrive tantot en objet, tantot en tableau,
// tantot en chaine, la description est du HTML, et certains sites emballent
// tout dans un @graph. Un extracteur qui suppose une seule forme rend du vide
// sans lever d'erreur, ce qui est le pire des cas : l'utilisateur croit avoir
// capture l'annonce.

import { extractJob, fromJsonLd, stripTags } from "../extension/extract.js";

export async function run() {
  const failures = [];

  // Longueur realiste : une vraie annonce fait plusieurs milliers de
  // caracteres. Un echantillon trop court testerait le seuil, pas la lecture.
  const LONG = "We are looking for a Bar Manager to lead a cocktail led venue. "
    + "You will own the drinks list end to end, from costing to training, and "
    + "manage a team of twelve across two floors. Full responsibility for gross "
    + "profit, stock control and pour cost sits with you, reporting weekly to "
    + "the general manager. Experience running a high volume bar in a premium "
    + "setting is essential, and WSET Level 2 is desirable. You will work five "
    + "days a week including weekends, with a rota published a fortnight ahead. "
    + "We offer a competitive salary, tronc, and a clear route to Beverage "
    + "Manager within eighteen months for the right person. ";

  const cases = [
    ["objet simple", {
      jsonLd: [JSON.stringify({
        "@context": "https://schema.org", "@type": "JobPosting",
        title: "Bar Manager",
        hiringOrganization: { "@type": "Organization", name: "Soho House" },
        jobLocation: { "@type": "Place", address: { addressLocality: "London", addressCountry: "GB" } },
        description: `<p>${LONG}</p><ul><li>Team of 12</li></ul>`,
      })],
    }, { title: "Bar Manager", company: "Soho House", location: "London, GB" }],

    ["@graph et types en tableau", {
      jsonLd: [JSON.stringify({
        "@graph": [
          { "@type": "WebSite", name: "JobBoard" },
          {
            "@type": ["JobPosting", "Thing"],
            title: "Responsable de salle",
            hiringOrganization: [{ name: "Maison Francois" }],
            jobLocation: [{ address: { addressLocality: "Paris", addressRegion: "IDF" } }],
            description: LONG,
          },
        ],
      })],
    }, { title: "Responsable de salle", company: "Maison Francois", location: "Paris, IDF" }],

    ["entreprise et lieu en chaine", {
      jsonLd: [JSON.stringify({
        "@type": "JobPosting",
        title: "Head Bartender",
        hiringOrganization: "Duck and Waffle",
        jobLocation: "London",
        description: LONG,
      })],
    }, { title: "Head Bartender", company: "Duck and Waffle", location: "London" }],
  ];

  for (const [name, page, expect] of cases) {
    const got = extractJob(page);
    if (!got) { failures.push(`${name} : rien extrait`); continue; }
    for (const [k, v] of Object.entries(expect)) {
      if (got[k] !== v) failures.push(`${name} : ${k} = "${got[k]}" au lieu de "${v}"`);
    }
    if (got.confidence !== "high") failures.push(`${name} : confiance "${got.confidence}"`);
    if (/<[a-z]/i.test(got.description)) failures.push(`${name} : du HTML reste dans la description`);
    if (!got.description.includes("cocktail led venue")) {
      failures.push(`${name} : le texte de l'annonce est perdu`);
    }
  }

  // Le HTML doit devenir du texte lisible, pas une bouillie.
  const cleaned = stripTags("<p>Ligne un</p><ul><li>Point A</li><li>Point B</li></ul>");
  if (!cleaned.includes("Ligne un")) failures.push("stripTags perd le texte");
  if (cleaned.includes("<")) failures.push("stripTags laisse des balises");
  if (!cleaned.includes("- Point A")) failures.push("stripTags perd la structure des listes");

  // Rien d'exploitable ne doit jamais faire croire a une capture reussie.
  for (const [name, page] of [
    ["page vide", {}],
    ["JSON casse", { jsonLd: ["{oops"] }],
    ["autre type", { jsonLd: [JSON.stringify({ "@type": "Article", description: LONG })] }],
    ["JobPosting sans description", { jsonLd: [JSON.stringify({ "@type": "JobPosting", title: "X" })] }],
  ]) {
    let out;
    try { out = extractJob(page); }
    catch (err) { failures.push(`${name} : leve ${err.message}`); continue; }
    if (out) failures.push(`${name} : une annonce est rendue alors qu'il n'y en a pas`);
  }

  // Une annonce trop courte est signalee, pas rendue comme exploitable.
  const short = extractJob({
    jsonLd: [JSON.stringify({ "@type": "JobPosting", title: "X", description: "Bar manager wanted." })],
  });
  if (!short || !short.tooShort) {
    failures.push("une annonce de trois mots n'est pas signalee comme trop courte");
  }

  // Repli sur le texte de la page, avec une confiance annoncee comme faible.
  const fallback = extractJob({
    meta: { "og:title": "Restaurant Manager - The Ivy", "og:site_name": "Reed" },
    bodyText: LONG.repeat(3),
  });
  if (!fallback) failures.push("aucun repli quand les donnees structurees manquent");
  else if (fallback.confidence !== "low") {
    failures.push("le repli devrait annoncer une confiance faible");
  }

  if (!fromJsonLd([])) { /* attendu : rien */ }

  // --- l'application recoit-elle vraiment ce que l'extension depose ? -----
  // Une extension qui capture parfaitement et depose dans le vide ne sert a
  // rien. On simule le pont, puis on verifie que l'annonce devient une
  // candidature suivie et que le CV s'ouvre pre-rempli.
  const { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } =
    await import("./lib/harness.mjs");
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message.split("\n")[0].slice(0, 90)));
    await page.route("**/api/claude", r => r.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ content: [{ type: "text", text: "{}" }] }),
    }));
    await seedApp(page, SAMPLE_CV);

    // Ce que le pont depose, exactement.
    await page.evaluate((ad) => {
      localStorage.setItem("cvf_incoming_job", JSON.stringify({
        title: "Bar Manager", company: "Soho House", location: "London",
        description: ad, url: "https://example.invalid/job/1", confidence: "high",
      }));
    }, LONG);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(2600);

    const stored = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem("cvf_ap")) || []; } catch { return []; }
    });
    if (stored.length !== 1) {
      failures.push(`l'annonce capturee n'est pas devenue une candidature (${stored.length})`);
    } else if (!stored[0].offer || !stored[0].offer.includes("cocktail led venue")) {
      failures.push("la candidature creee depuis l'extension ne porte pas l'annonce");
    }

    const consumed = await page.evaluate(() => localStorage.getItem("cvf_incoming_job"));
    if (consumed) {
      failures.push("l'annonce n'est pas consommee : chaque visite rejouerait la meme offre");
    }

    const prefilled = await page.evaluate(() =>
      [...document.querySelectorAll("textarea")].some(t => (t.value || "").includes("cocktail led venue")));
    if (!prefilled) failures.push("le CV ne s'ouvre pas pre-rempli avec l'annonce capturee");

    if (errors.length) failures.push("erreur JS : " + errors[0]);
    await ctx.close();
  } finally {
    await browser.close();
    await stopServer(server);
  }

  if (!failures.length) {
    console.log("      3 formes reelles lues, rien invente sur une page vide, et l'annonce capturee devient une candidature pre-remplie");
  }
  return failures;
}
