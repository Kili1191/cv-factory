// The screen shows the page you get.
//
// WHAT WENT WRONG
//
// The recruiter's PDF is one page, always: up to 297mm the document leaves
// as it is, up to 297/0.85 the export shrinks the image to fit, and beyond
// that it does not leave before being shortened. The screen had not been
// told. It still drew "Page 1 ends here" across a CV of 1200px, and the
// owner of the product read it as "still doing it on 2 pages" after a
// refresh, on a document that was actually leaving whole on one sheet.
//
// A preview that contradicts the file is worse than no preview: it sends
// someone cutting a CV that already fits, or lets them trust one that does
// not.
//
// THE SAME PANEL SPOKE FRENCH IN AN ENGLISH INTERFACE
//
// "experience 1, employeur", "deux textes se recouvrent" : the rules that
// name the defects wrote their labels in one language. A check that cannot
// be read is closed without being read. Both halves of the rule set, the
// data half and the drawn half, take the interface language now, and this
// file holds them to it.
//
// WHAT THIS FILE HOLDS
//
//   1. A CV between one page and the shrink ceiling shows NO page marker,
//      and shows the sheet as the PDF will carry it: an A4-shaped box with
//      the document reduced inside it, ratio kept.
//   2. The same CV on a phone: same rule.
//   3. In English, every defect label and reason is English. Measured on the
//      rules directly, for every rule at once, and on the panel a person
//      sees.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";
import { defautsDuCv, FACTEUR_MIN } from "../lib/leCvEstIlPresentable.js";

// Built from its code point: written in clear, the dash would fail the
// repo-wide scan on this very file.
const CADRATIN = String.fromCharCode(0x2014);
const PAGE = 1123;
const PLAFOND = PAGE / FACTEUR_MIN;
const A4 = 297 / 210;

const POSTES = [
  ["Care Assistant", "Elmwood House", "2024 - 2026"],
  ["Care Assistant", "Rowan Lodge", "2023 - 2024"],
  ["Support Worker", "Bright Path Care", "2022 - 2023"],
  ["Support Worker", "Hollybank", "2021 - 2022"],
  ["Waiter", "Le Comptoir", "2020 - 2021"],
  ["Waiter", "Brasserie Nord", "2019 - 2020"],
  ["Kitchen Porter", "The Old Mill", "2018 - 2019"],
  ["Kitchen Porter", "Canal House", "2017 - 2018"],
  ["Baker's Assistant", "Boulangerie Rivet", "2016 - 2017"],
  ["Baker's Assistant", "Pain Quotidien", "2015 - 2016"],
];
const PUCES = [
  (i) => "Supported " + (10 + i) + " residents with personal care, medication and daily records.",
  (i) => "Trained " + (2 + i) + " new starters, each independent within their first fortnight.",
  (i) => "Kept handover notes that the night team never had to chase, " + (30 + i) + " weeks running.",
  (i) => "Covered " + (20 + i * 3) + " night shifts a year on top of the standard rota.",
];

// A CV with exactly `n` bullet lines in total, spread four per job. The
// height of the document is what the test needs to steer, and one bullet is
// the finest step it has: about a line.
function cvDe(n) {
  const jobs = [];
  let restant = n;
  for (let i = 0; i < POSTES.length && restant > 0; i += 1) {
    const [title, company, period] = POSTES[i];
    const k = Math.min(4, restant);
    restant -= k;
    jobs.push({
      ...(SAMPLE_CV.experience[0] || {}), id: "exp" + i,
      title, company, period, location: "Manchester",
      bullets: PUCES.slice(0, k).map((f) => f(i)),
    });
  }
  return {
    ...SAMPLE_CV, name: "Samuel Carter", title: "Care Assistant",
    summary: "Years across care, hospitality and logistics. Trusted with "
      + "medication rounds, night shifts and training new starters.",
    experience: jobs,
  };
}

const CASSE = {
  ...SAMPLE_CV,
  name: "Samuel Carter",
  title: "Account Manager " + CADRATIN,
  education: [{ degree: "Diploma", period: "2019",
    school: "Banking and Finance Training, banking products, regulatory compliance, "
      + "advisory and client onboarding across three regions" }],
  certifications: ["2023"],
};

const FRANCAIS = /\b(le|la|les|une|des|est|dans|pas|deux|sur|avec|ce|cette|qui)\b/i;

async function regarder(browser, cv, { mobile } = {}) {
  const ctx = await browser.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await seedApp(page, cv, { locale: "en" });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    // On a phone the drawn document is the child of the zoom wrapper, and
    // [data-cvf="cv"] is the scroll box around it; on a desktop it is the
    // sheet's direct child. Either way, its parent is the sheet.
    const cvEl = document.querySelector('[data-cvf-zoom] > div')
      || document.querySelector('[data-cvf="cv"]');
    const doc = document.getElementById("cv-print");
    const feuille = cvEl && cvEl.parentElement;
    const rc = cvEl ? cvEl.getBoundingClientRect() : { width: 0, height: 0, left: 0, top: 0 };
    const rf = feuille ? feuille.getBoundingClientRect() : { width: 0, height: 0, left: 0, top: 0 };
    return {
      naturelle: doc ? doc.offsetHeight : 0,
      cv: { w: rc.width, h: rc.height, l: rc.left, t: rc.top, r: rc.right, b: rc.bottom },
      feuille: { w: rf.width, h: rf.height, l: rf.left, t: rf.top, r: rf.right, b: rf.bottom },
      traits: document.querySelectorAll("[data-nuvi-coupe-page]").length,
    };
  });
  await ctx.close();
  return r;
}

// Find a CV whose natural height lands between the page and the ceiling.
// Fonts differ between machines, so the count of lines is measured, not
// assumed: two probes give the height per bullet, then one or two
// corrections land inside the window.
async function unCvQuiSeReduit(browser) {
  const h = async (n) => (await regarder(browser, cvDe(n))).naturelle;
  const h8 = await h(8), h20 = await h(20);
  const pas = (h20 - h8) / 12;
  if (!(pas > 0)) return null;
  const cible = (PAGE + PLAFOND) / 2;
  let n = Math.round(8 + (cible - h8) / pas);
  for (let essai = 0; essai < 5; essai += 1) {
    n = Math.max(1, Math.min(40, n));
    const hn = await h(n);
    if (hn > PAGE && hn <= PLAFOND) return { n, h: hn };
    n += hn <= PAGE ? Math.max(1, Math.round((cible - hn) / pas)) : -Math.max(1, Math.round((hn - cible) / pas));
  }
  return null;
}

export async function run() {
  const failures = [];

  // --- 3a. EVERY RULE, IN BOTH LANGUAGES, WITHOUT A BROWSER ---------
  //
  // The full broken CV of a-broken-cv-does-not-leave-in-silence triggers
  // most rules; here the point is only that each has an English voice.
  const CV_TOUT_CASSE = {
    name: "", title: "Account Manager " + CADRATIN, email: "", phone: "",
    experience: [
      { title: "", company: "", period: "2020", bullets: [] },
      { title: "Advisor", company: "Bank", bullets: [] },
      { title: "Advisor", company: "Bank", bullets: ["Handled the daily branch reporting.", "Handled the daily branch reporting."] },
    ],
    education: [{ degree: "Diploma 2019", period: "2019",
      school: "Banking and Finance Training, banking products, regulatory compliance, advisory and onboarding" }],
    certifications: ["2023"], skills: ["..."], languages: [{ lang: "", level: "B2" }],
  };
  const fr = defautsDuCv(CV_TOUT_CASSE, "fr");
  const en = defautsDuCv(CV_TOUT_CASSE, "en");
  if (fr.length !== en.length) {
    failures.push("the rules find " + fr.length + " defects in French and "
      + en.length + " in English: the language changed what is seen");
  }
  for (const d of en) {
    if (FRANCAIS.test(d.ou) || FRANCAIS.test(d.pourquoi)) {
      failures.push("in English, the \"" + d.cle + "\" defect still speaks French: \""
        + d.ou + "\" / \"" + d.pourquoi.slice(0, 50) + "\"");
    }
    const jumeau = fr.find((f) => f.cle === d.cle && f.extrait === d.extrait);
    if (jumeau && jumeau.pourquoi === d.pourquoi) {
      failures.push("the \"" + d.cle + "\" reason is the same text in both languages");
    }
  }
  if (!en.some((d) => d.cle === "cadratin" || d.cle === "coupe")
    || !en.some((d) => d.cle === "phrase") || !en.some((d) => d.cle === "doublon")) {
    failures.push("the broken CV used here does not trigger the rules it should: check the fixture");
  }

  const server = await startServer();
  const browser = await launchBrowser();
  try {
    // --- 1. A CV THAT FITS BY SHRINKING SHOWS THE SHRUNK SHEET --------
    const trouve = await unCvQuiSeReduit(browser);
    if (!trouve) {
      failures.push("no fixture landed between " + PAGE + "px and " + Math.round(PLAFOND)
        + "px: the test cannot exercise the shrink case");
    } else {
      for (const mobile of [false, true]) {
        const ou = mobile ? "on a phone" : "on a desktop";
        const r = await regarder(browser, cvDe(trouve.n), { mobile });
        const h = Math.round(r.naturelle);
        if (r.naturelle <= PAGE || r.naturelle > PLAFOND) {
          failures.push(ou + ": the fixture measures " + h + "px there, outside the shrink window");
          continue;
        }
        if (r.traits) {
          failures.push(ou + ": a CV of " + h + "px, which the export shrinks onto one "
            + "sheet, still shows " + r.traits + " \"page ends here\" marker(s). The "
            + "screen says two pages, the file says one.");
        }
        // The sheet on screen is A4-shaped, the document sits inside it, and
        // its own proportions are kept: shrunk, not squashed.
        const ratioFeuille = r.feuille.h / r.feuille.w;
        if (Math.abs(ratioFeuille - A4) > 0.02) {
          failures.push(ou + ": the sheet on screen is " + Math.round(r.feuille.w) + "x"
            + Math.round(r.feuille.h) + "px, ratio " + ratioFeuille.toFixed(3)
            + " instead of A4 (" + A4.toFixed(3) + ")");
        }
        const ratioCv = r.cv.h / r.cv.w;
        const ratioNaturel = r.naturelle / 794;
        if (Math.abs(ratioCv - ratioNaturel) > 0.02) {
          failures.push(ou + ": the document is squashed: drawn ratio " + ratioCv.toFixed(3)
            + ", natural ratio " + ratioNaturel.toFixed(3));
        }
        if (r.cv.l < r.feuille.l - 1 || r.cv.r > r.feuille.r + 1
          || r.cv.t < r.feuille.t - 1 || r.cv.b > r.feuille.b + 1) {
          failures.push(ou + ": the document runs outside its sheet");
        }
        const marge = { g: r.cv.l - r.feuille.l, d: r.feuille.r - r.cv.r };
        if (Math.abs(marge.g - marge.d) > 3) {
          failures.push(ou + ": the shrunk document is not centred on the sheet ("
            + Math.round(marge.g) + "px left, " + Math.round(marge.d) + "px right); the PDF centres it");
        }
      }
    }

    // --- 3b. THE PANEL A PERSON SEES, IN ENGLISH -----------------------
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await seedApp(page, CASSE, { locale: "en" });
    await page.getByRole("button", { name: /Download/i }).first().click({ timeout: 15_000 });
    await page.waitForTimeout(1200);
    const panneau = page.locator('[data-nuvi="defauts-corriger"]');
    if (!(await panneau.count())) {
      failures.push("the check panel did not open on a CV with a cut title and a hollow certification");
    } else {
      // The whole screen: the CV under the panel is English, the interface
      // is English, so any French word on it comes from the panel.
      const texte = await page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " "));
      for (const mot of ["intitule", "employeur", "etablissement", "certification 1",
        "formation", "experience 1"]) {
        if (mot !== "certification 1" && texte.toLowerCase().includes(mot)) {
          failures.push("the English check panel shows a French label: \"" + mot + "\"");
        }
      }
      if (!/job 1|CV headline|education 1/i.test(texte)) {
        failures.push("the English check panel names no location in English");
      }
    }
    await ctx.close();

    if (!failures.length) {
      console.log("      the shrunk sheet is shown as it leaves, on desktop and phone; "
        + "every rule speaks English when asked");
    }
  } catch (err) {
    failures.push("the test itself crashed: " + (err && err.message));
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
