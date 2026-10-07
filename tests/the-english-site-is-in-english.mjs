// THE ENGLISH PAGE SHOWED SIX FRENCH CVs
//
// The language of the interface is a product choice and both languages have
// the same standing. What is not a choice is one language appearing inside
// the other, and this suite exists because the most visible case of it had
// been on the shop window since the template gallery shipped.
//
// The six previews are filled by one sample CV. The labels around it had been
// translated long ago, in ApercuGabarit, with a comment saying why: somebody
// picking a layout in English was reading "Formation" and "Competences". The
// CV inside them had not. So an English visitor judged the product on six
// French documents, "Reduction du churn de 18% en 6 mois", "Langue
// maternelle", a degree from HEC Paris and a +33 phone number, on the page
// where the decision to try the tool is made.
//
// The other half was in the editor, the screen a person spends the most time
// on: sh_eyebrow_id, _ex, _ed, _sk existed in NEITHER dictionary, so the
// French literal in the `||` fallback rendered whatever the setting said.
// "Identite", "Experiences", "Formations", "Competences" above each sheet.
//
// WHY NO SUITE SAW IT, AND WHAT THIS ONE DOES DIFFERENTLY
//
// Comparing fr.js and en.js key by key finds nothing: those four keys were
// missing from both, and the sample CV is not in a dictionary at all. The
// readability suite measures contrast, not language. Every assertion in the
// repository that reads text says which language it expects and then looks
// for one string it knows. None of them reads the rest of the screen.
//
// So this one reads every visible word, in English, and refuses French. It is
// the same method as the readability sweep, pointed at language instead of
// contrast, and it is the only method that catches a string nobody listed.
//
// The CV it seeds is English on purpose. The harness SAMPLE_CV is a French
// product manager, and seeding it would make this suite red for the person's
// own content, which is theirs to write in any language they like.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { startServer, stopServer, launchBrowser, seedApp } from "./lib/harness.mjs";

// An English CV, so anything French on the screen belongs to the product.
// Fictional: this repository is public.
const CV_EN = {
  name: "Camille Marchetti",
  title: "Account Manager",
  email: "camille.marchetti@example.com",
  phone: "07700900123",
  location: "London, United Kingdom",
  linkedin: "linkedin.com/in/camille-marchetti",
  summary: "Account Manager, 8 years holding enterprise portfolios in B2B software.",
  skills: ["Salesforce", "HubSpot", "Renewals", "Forecasting", "Negotiation"],
  experience: [
    {
      id: "x1", title: "Account Manager", company: "Northwind",
      period: "2021 - 2026", location: "London",
      bullets: [
        "Owned a portfolio worth 3.2m in annual recurring revenue.",
        "Lifted net revenue retention from 94 to 109 per cent.",
      ],
    },
  ],
  education: [{ id: "e1", school: "University of Leeds", degree: "BA Business", period: "2014 - 2017" }],
  languages: [{ lang: "English", level: "Native" }, { lang: "Italian", level: "Fluent" }],
  certifications: [],
  labels: {},
};

// Words that cannot be English, and that this repository has actually shipped
// onto an English screen. Short and specific on purpose: a long list of
// French stop words turns every proper noun into a failure and the suite gets
// switched off. "Experience" and "Information" are spelt the same in both and
// are deliberately absent.
const FRENCH_WORDS = [
  "aucun", "aucune", "annonce", "candidature", "candidatures", "entretien",
  "competences", "formations", "identite", "langue maternelle", "fourchette",
  "telecharger", "enregistrer", "fermer", "retour", "chercher", "exigences",
  "reponse", "relance", "parcours", "accroche", "chiffre", "trou", "trous",
  "colle", "coller", "ecris", "genere", "charge d", "decris", "rediger",
  "preparer", "reecrit", "resout", "creuser", "reduction du churn",
  "premiere annee", "equipe de", "une seule", "beaucoup de", "tout tient",
  "ton ", "tes ", "ta ", "votre ", "vos ", "mon ", "mes ",
  "d'un", "d'une", "qu'un", "qu'une", "c'est", "n'a ", "l'ordre", "la plus",
];
// Accented letters are French here whatever the word: the English dictionary
// has none, by convention in this repository.
const ACCENTED = /[àâäçèéêëîïôöùûü]/;

// A term ending in a space is a prefix ("ton ", "tes "): the word after it
// is anything. Every other term matches whole. That boundary is the whole
// difference between a usable suite and one that calls "Manchester College"
// French because "colle" is a word inside it, which is the includes("account")
// lesson this repository already paid for once.
const FRENCH_RE = FRENCH_WORDS.map((w) => {
  const bare = w.trimEnd();
  const esc = bare.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return { w: bare, re: new RegExp("\\b" + esc + (w.endsWith(" ") ? "\\s" : "\\b"), "i") };
});

function frenchIn(text) {
  const t = String(text || "");
  if (ACCENTED.test(t)) return t.match(ACCENTED)[0];
  const flat = t.replace(/\s+/g, " ");
  for (const { w, re } of FRENCH_RE) if (re.test(flat)) return w;
  return null;
}

// Every piece of text a person can actually see, plus the labels only a
// screen reader hears: those were the ones frozen as "Fermer".
async function visibleText(page) {
  return page.evaluate(() => {
    const out = [];
    const seen = new Set();
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walk.nextNode())) {
      const t = (n.nodeValue || "").trim();
      if (!t || t.length < 3) continue;
      const el = n.parentElement;
      if (!el) continue;
      if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
      const key = el.tagName + "|" + t;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ t, where: el.tagName });
    }
    for (const el of document.querySelectorAll("[aria-label],[placeholder]")) {
      for (const a of ["aria-label", "placeholder"]) {
        const v = el.getAttribute(a);
        if (v && v.trim().length >= 3) out.push({ t: v.trim(), where: el.tagName + "@" + a });
      }
    }
    return out;
  });
}


// THE STATIC HALF, AND IT IS THE ONE WITH TEETH
//
// Driving the screen finds French on the screens it opens. It cannot open all
// of them, and the four eyebrows that shipped in French only exist once a
// sheet is open. So this part reads no browser at all: it asks whether every
// key the code reads from the shared dictionary exists in BOTH of them.
//
// That is the check that was missing. Comparing fr.js with en.js finds nothing
// when a key is absent from both, which is exactly what had happened twelve
// times: sh_eyebrow_id, _ex, _ed, _sk, three hints in the application pack,
// the tracker's ad field and its three track steps, the length picker's
// labels. The `||` fallback then carries the only wording there is, in one
// hardcoded language, and nothing on screen says which.
//
// Files that build their own T are skipped: a component carrying a local
// { fr, en } pair is not reading the shared dictionary, and treating its keys
// as missing would fill this with noise until somebody switched it off.
function dictionaryKeys(file) {
  const src = readFileSync(file, "utf8");
  const found = new Set();
  const re = /(?:^|[,{]|\n)\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/g;
  let m;
  while ((m = re.exec(src))) found.add(m[1]);
  return found;
}

function everyKeyIsInBothDictionaries() {
  const bad = [];
  const en = dictionaryKeys("app/i18n/en.js");
  const fr = dictionaryKeys("app/i18n/fr.js");
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (/node_modules|\.next|app\/i18n/.test(p)) continue;
      if (entry.isDirectory()) { walk(p); continue; }
      if (!/\.(js|jsx)$/.test(p)) continue;
      const src = readFileSync(p, "utf8");
      if (/\b(const|let)\s+T\s*=/.test(src)) continue;
      const re = /\bT\.([A-Za-z_][A-Za-z0-9_]*)\b/g;
      let m;
      while ((m = re.exec(src))) {
        const k = m[1];
        if (en.has(k) && fr.has(k)) continue;
        const line = src.slice(0, m.index).split("\n").length;
        bad.push(p + ":" + line + " reads T." + k
          + (en.has(k) ? "" : ", absent from en.js")
          + (fr.has(k) ? "" : ", absent from fr.js"));
      }
    }
  };
  walk("app");
  return bad;
}

export async function run() {
  const failures = [];

  // The static half first: it needs no server, and it explains any French the
  // browser half then finds.
  const uncovered = everyKeyIsInBothDictionaries();
  if (uncovered.length) {
    failures.push(uncovered.length + " place(s) read a key that is not in both "
      + "dictionaries, so only the hardcoded fallback can render and it has one "
      + "language: " + uncovered.slice(0, 8).join(" | ")
      + (uncovered.length > 8 ? " | and " + (uncovered.length - 8) + " more" : ""));
  }

  const server = await startServer();
  const browser = await launchBrowser();
  const base = "http://127.0.0.1:" + (process.env.TEST_PORT || 4311);

  function check(screen, items) {
    const bad = [];
    for (const { t, where } of items) {
      const w = frenchIn(t);
      if (w) bad.push(where + " \"" + t.replace(/\s+/g, " ").slice(0, 80) + "\" (" + w + ")");
    }
    // Reported together: one French string and twenty are the same defect,
    // and a failure per string buries the screen it is on.
    if (bad.length) {
      failures.push("on " + screen + ", in English, " + bad.length
        + " string(s) are French: " + bad.slice(0, 6).join(" | ")
        + (bad.length > 6 ? " | and " + (bad.length - 6) + " more" : ""));
    }
    return bad.length;
  }

  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await ctx.newPage();

    // 1. THE SHOP WINDOW. Every word on it is the product's own copy, the
    //    sample CV in the template gallery included: nobody's personal text
    //    is on this page, so all of it has to be English.
    await page.evaluate(() => {}).catch(() => {});
    await page.goto(base + "/", { waitUntil: "networkidle", timeout: 60_000 });
    await page.evaluate(() => { try { localStorage.setItem("cvf_c", JSON.stringify("en")); } catch {} });
    await page.reload({ waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(2000);
    // The gallery is below the fold and its previews mount when scrolled to.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
    check("the shop window", await visibleText(page));

    // 2. THE TEMPLATE PREVIEWS ON THEIR OWN. The gallery is the defect's
    //    home: assert the sample CV directly, so this stays red even if the
    //    cards move or the page is rearranged.
    const gallery = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".vv-tpl__card")];
      return cards.map((c) => (c.innerText || "").replace(/\s+/g, " ").slice(0, 400));
    });
    if (gallery.length === 0) {
      failures.push("no template preview found on the shop window: the suite would "
        + "pass by reading nothing, which is the failure it exists to prevent.");
    } else {
      const frenchCards = gallery.map((g) => frenchIn(g)).filter(Boolean);
      if (frenchCards.length) {
        failures.push(gallery.length + " template previews on the English shop window, "
          + frenchCards.length + " of them hold French ("
          + [...new Set(frenchCards)].slice(0, 5).join(", ")
          + "). The sample CV is what a visitor judges the product's output on.");
      }
    }

    // 3. THE APP, with an English CV seeded so anything French is ours.
    await seedApp(page, CV_EN, { locale: "en" });
    check("the app's main screen", await visibleText(page));

    // 4. THE EDITOR'S SHEETS. sh_eyebrow_* lived in neither dictionary, and
    //    the eyebrow only exists once a sheet is open.
    const editTab = page.locator("button").filter({ hasText: /^\s*Edit\s*$/i }).first();
    if (await editTab.count()) {
      await editTab.click({ timeout: 8_000 }).catch(() => {});
      await page.waitForTimeout(900);
    }
    let opened = 0;
    for (const name of [/Identity/i, /Experience/i, /Education/i, /Skills/i]) {
      const row = page.locator("button").filter({ hasText: name }).first();
      if (await row.count() === 0) continue;
      await row.click({ timeout: 6_000 }).catch(() => {});
      await page.waitForTimeout(800);
      const items = await visibleText(page);
      if (items.length) { opened += 1; check("the edit sheet " + String(name), items); }
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(500);
    }
    if (opened === 0) {
      failures.push("not one edit sheet could be opened, so the four eyebrows that "
        + "shipped in French were not read. A suite that reads nothing passes.");
    }
  } catch (e) {
    failures.push("the suite could not finish: " + String(e && e.message || e).split("\n")[0].slice(0, 160));
  } finally {
    await browser.close();
    await stopServer(server);
  }

  return failures;
}
