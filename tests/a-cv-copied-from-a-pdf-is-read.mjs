// A CV copied out of a PDF is read, bullets and all.
//
// WHAT WENT WRONG
//
// Kilian selected the text of his own PDF, pasted it into "Paste your CV as
// plain text", and got a CV with one job out of three, zero bullets, and
// "Owned complex, high-value transactions end to end" as the employer. The
// local reader had answered with a confidence of 0.9, so the model was
// never asked.
//
// Text copied from a PDF has a shape of its own: no bullet characters, one
// line per sentence, the middle dot separator alone on its line, "Professional
// Profile" as the summary heading, "French: Native" for a language. The
// reader knew none of it.
//
// WHAT THIS HOLDS
//
//   1. On that shape, the reader finds every job, every bullet, the
//      summary, the skills with their parentheses intact, and the
//      languages with their level.
//   2. And it is confident enough not to call the model: this is the
//      free, instant path the product promises for an ordinary CV.
//   3. On a shape it still cannot read (the same text with the section
//      headings removed), it says so: the confidence drops under the
//      threshold, so the model reads instead of a broken CV shipping.

import { lireUnCv, CONFIANCE_SUFFISANTE } from "../lib/lireUnCv.js";
import { defautsDuCv } from "../lib/leCvEstIlPresentable.js";

const COPIE = `Sam Carter
Client Listening Manager
sam.carter@example.com
07700900123
London
Professional Profile
Bilingual French-English client listening and relationship specialist with 10+ years in regulated roles.
Professional Experience
Client Relationship Manager
2023 - February 2026
Anarock
·
UAE
Managed a portfolio of private investors and high-net-worth clients through the full investment cycle, from qualification to signed contract.
Ran structured listening conversations with clients across the Middle East, Europe and Asia to capture expectations.
Owned complex, high-value transactions end to end, coordinating banks, notaries and legal partners.
Account Manager
2016 - 2023
Stenn International, London, UK
Onboarded 60+ SME clients over 7 years, cutting time-to-first-transaction by 30% by building clear playbooks.
Sustained retention above 85% across 20 to 60 accounts by running a structured check-in cadence.
Grew ARR consistently by owning the full account lifecycle, from first onboarding call to upsell.
Turned recurring client feedback into concrete process change, aligning risk, compliance and operations.
Managed accounts across Asia, Europe, and the US in English and French, working with SME directors.
Conducted post-onboarding and account review interviews with SME directors and C-level contacts.
Customer Service Advisor
2013 - 2016
La Banque Postale, Lyon
·
France
Handled in-branch and telephone client requests in a high-volume retail banking environment.
Matched banking products (accounts, savings, insurance, consumer credit) to each client's situation.
Applied KYC and AML procedures on every client interaction, building lasting compliance habits.
Completed internal banking and finance training on banking products, regulatory compliance and advisory sales.
Education
Level 7 Diploma in Strategic Management and Leadership
OTHM
2023-2026
Skills
Client Listening and Voice-of-Client Programmes
•
Client Interviews, Check-ins and QBRs
•
Relationship Management (SME, C-level, HNW clients)
•
Cross-team Coordination (Risk, Compliance, Operations)
•
KYC and AML Compliance
Languages
French: Native
English: Professional fluency`;

export async function run() {
  const failures = [];
  const lu = lireUnCv(COPIE);
  const cv = lu.cv;

  const jobs = cv.experience.map((e) => [e.title, e.company, e.bullets.length]);
  const attendu = [["Client Relationship Manager", "Anarock", 3], ["Account Manager", "Stenn International", 6],
    ["Customer Service Advisor", "La Banque Postale", 4]];
  if (cv.experience.length !== 3) {
    failures.push("the reader found " + cv.experience.length + " job(s) out of 3: " + JSON.stringify(jobs));
  } else {
    attendu.forEach(([t, c, n], i) => {
      const e = cv.experience[i];
      if (e.title !== t) failures.push("job " + (i + 1) + ": title \"" + e.title + "\" instead of \"" + t + "\"");
      if (!String(e.company).startsWith(c)) failures.push("job " + (i + 1) + ": employer \"" + e.company + "\" instead of \"" + c + "\"");
      if (e.bullets.length !== n) failures.push("job " + (i + 1) + ": " + e.bullets.length + " bullet(s) instead of " + n);
    });
  }
  if (!/^Bilingual French-English/.test(cv.summary)) {
    failures.push("the summary under \"Professional Profile\" was not read (got \"" + cv.summary.slice(0, 40) + "\")");
  }
  if (!cv.skills.includes("Relationship Management (SME, C-level, HNW clients)")) {
    failures.push("a skill with parentheses was cut on its commas: " + JSON.stringify(cv.skills.filter((s) => /SME|HNW/.test(s))));
  }
  if (cv.skills.some((s) => s === "•" || !s.trim())) failures.push("a lone bullet character became a skill");
  const langues = cv.languages.map((l) => l.lang + "=" + l.level).join(", ");
  if (langues !== "French=Native, English=Professional fluency") {
    failures.push("languages read as \"" + langues + "\"");
  }
  if (!cv.education.length || cv.education[0].school !== "OTHM") {
    failures.push("education not read: " + JSON.stringify(cv.education));
  }
  if (lu.confiance < CONFIANCE_SUFFISANTE) {
    failures.push("the reader is not confident enough (" + lu.confiance + ") on a CV it reads correctly, so the model "
      + "would be called for nothing: " + lu.raisons.join("; "));
  }

  // 3. WHAT IT CANNOT READ, IT DOUBTS
  const sansTitres = COPIE.split("\n").filter((l) => !/^(Professional Profile|Professional Experience|Education|Skills|Languages)$/.test(l)).join("\n");
  const doute = lireUnCv(sansTitres);
  const pucesLues = doute.cv.experience.reduce((n, e) => n + e.bullets.length, 0);
  if (pucesLues < 10 && doute.confiance >= CONFIANCE_SUFFISANTE) {
    failures.push("without section headings the reader keeps " + pucesLues + " bullet(s) out of 13 and is still "
      + "confident (" + doute.confiance + "): a broken CV would ship without the model");
  }

  // 4. A LINE CUT MID-SENTENCE IS NAMED BEFORE IT SHIPS
  //
  // Text copied from a PDF whose layer was amputated arrived with "Europe
  // an" and "by 30% by" at the end of bullets, and nothing said so.
  const coupe = lireUnCv(COPIE.replace("Europe and Asia to capture expectations.", "Europe an")
    .replace("by 30% by building clear playbooks.", "by 30% by")).cv;
  const vus = defautsDuCv(coupe, "en").filter((d) => d.cle === "coupe_en_fin");
  if (vus.length !== 2) {
    failures.push("two bullets cut mid-sentence, " + vus.length + " flagged: " + JSON.stringify(vus.map((d) => d.extrait)));
  }
  const propres = defautsDuCv(cv, "en").filter((d) => d.cle === "coupe_en_fin");
  if (propres.length) {
    failures.push("whole bullets flagged as cut: " + JSON.stringify(propres.map((d) => d.extrait)));
  }

  if (!failures.length) console.log("      three jobs, thirteen bullets, the summary, whole skills and levelled languages, read on the device");
  return failures;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((f) => { for (const l of f) console.log("ECHEC " + l); process.exit(f.length ? 1 : 0); });
}
