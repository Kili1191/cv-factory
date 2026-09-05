// End to end test runner.
//
//   npm test
//
// Every suite returns a list of failures. One is enough to fail the command,
// so CI blocks the merge. They cover what has already shipped broken to
// production, not what is easy to test.
//
// The suite names are sentences, and they are the assertion: "a photo of a CV
// is a CV" says what the user gets to observe. They were French until the
// 30th of August 2026, when the repo convention moved to English. The file
// names never changed, because they were English from the start.

const SUITES = [
  ["no CDN dependency at runtime", "./no-runtime-cdn.mjs"],
  ["no em dash, no en dash", "./no-em-dash.mjs"],
  ["no em dash reaches the CV", "./no-em-dash-reaches-the-cv.mjs"],
  ["a bad reading doubts itself", "./a-bad-reading-doubts-itself.mjs"],
  ["a CV copied from a PDF is read", "./a-cv-copied-from-a-pdf-is-read.mjs"],
  ["a broken CV does not leave in silence", "./a-broken-cv-does-not-leave-in-silence.mjs"],
  ["the companion keeps watch", "./the-companion-keeps-watch.mjs"],
  ["fix means fix", "./fix-means-fix.mjs"],
  ["Nuvi asks before it moves", "./nuvi-asks-before-it-moves.mjs"],
  ["the comments stay ASCII", "./the-comments-stay-ascii.mjs"],
  ["no text is dimmed by opacity", "./no-text-is-dimmed-by-opacity.mjs"],
  ["the design system does not drift", "./the-design-system-does-not-drift.mjs"],
  ["the request sent to the AI is well formed", "./the-ai-request-is-well-formed.mjs"],
  ["the shape is a contract, not a plea", "./the-shape-is-a-contract-not-a-plea.mjs"],
  ["a schema the API refuses is worse than none", "./a-schema-the-api-refuses-is-worse-than-none.mjs"],
  ["the best is a measurement, not a promise", "./the-best-is-a-measurement-not-a-promise.mjs"],
  ["accounts never lose the CV", "./accounts-never-lose-the-cv.mjs"],
  ["the setup page names what is missing", "./the-setup-page-names-what-is-missing.mjs"],
  ["job sources return the same shape", "./job-sources-normalise.mjs"],
  ["the gap with the job ad is honest", "./the-gap-with-the-job-ad-is-honest.mjs"],
  ["the diagnosis names one cause", "./the-diagnosis-names-one-cause.mjs"],
  ["the diagnosis reaches the screen", "./the-diagnosis-reaches-the-screen.mjs"],
  ["a posting alone is enough", "./a-posting-alone-is-enough.mjs"],
  ["one click from the ad", "./one-click-from-the-ad.mjs"],
  ["every paste field takes a file", "./every-paste-field-takes-a-file.mjs"],
  ["every panel can be closed", "./every-panel-can-be-closed.mjs"],
  ["no page is an orphan", "./no-page-is-an-orphan.mjs"],
  ["a phone reaches what a desktop reaches", "./a-phone-reaches-what-a-desktop-reaches.mjs"],
  ["the dot means something", "./the-dot-means-something.mjs"],
  ["the career record invents nothing", "./the-career-record-invents-nothing.mjs"],
  ["a job found becomes an application", "./job-search-becomes-an-application.mjs"],
  ["the extension reads a job ad", "./extension-reads-a-job-ad.mjs"],
  ["the interview assistant answers", "./live-assist-answers.mjs"],
  ["the live assistant does not answer itself", "./the-live-assist-does-not-answer-itself.mjs"],
  ["Gmail gives the tracker its real state", "./gmail-reads-the-replies.mjs"],
  ["the app installs on the home screen", "./installs-on-the-home-screen.mjs"],
  ["the home screen hides no text", "./the-home-screen-hides-no-text.mjs"],
  ["the language is asked once", "./the-site-opens-in-english.mjs"],
  ["a failed sign in says so", "./a-failed-sign-in-says-so.mjs"],
  ["Nuvi does not decide for the candidate", "./nuvi-does-not-decide.mjs"],
  ["a busy AI is not a broken one", "./a-busy-ai-is-not-a-broken-one.mjs"],
  ["the career record really reaches the screen", "./the-career-record-reaches-the-screen.mjs"],
  ["the front door does its job", "./the-front-door-does-its-job.mjs"],
  ["nothing stays half faded", "./nothing-stays-half-faded.mjs"],
  ["the shared link tells the truth", "./the-shared-link-tells-the-truth.mjs"],
  ["crash test before going live", "./ready-to-launch.mjs"],
  ["every journey reaches its end", "./every-journey-reaches-its-end.mjs"],
  ["every screen size holds", "./every-screen-size-works.mjs"],
  ["italic words are real italics", "./the-italics-are-real.mjs"],
  ["no monogram is invisible", "./no-monogram-is-invisible.mjs"],
  ["nothing covers a control on mobile", "./nothing-covers-a-control-on-mobile.mjs"],
  ["nothing covers the rail footer", "./nothing-covers-the-rail-footer.mjs"],
  ["the suggestion bar gets out of the way and knows how to leave", "./the-suggestion-bar-gets-out-of-the-way.mjs"],
  ["the exported PDF is readable by an ATS", "./export-pdf-is-machine-readable.mjs"],
  ["the picture matches the page", "./the-picture-matches-the-page.mjs"],
  ["a long cv keeps its size", "./a-long-cv-keeps-its-size.mjs"],
  ["an empty field leaves no trace", "./an-empty-field-leaves-no-trace.mjs"],
  ["the ATS extraction engines read the CV", "./ats-parsers-read-the-cv.mjs"],
  ["the screening software verdict never moves", "./the-ats-verdict-never-moves.mjs"],
  ["the two readings can disagree", "./two-readings-can-disagree.mjs"],
  ["the simulation does not contradict the parsers", "./the-simulation-agrees-with-the-parsers.mjs"],
  ["the invisible layer matches the page", "./the-invisible-layer-matches-the-page.mjs"],
  ["import reads a PDF, cut worker included", "./import-reads-a-pdf.mjs"],
  ["the application pack produces a letter", "./application-pack-produces-a-letter.mjs"],
  ["the pack fits under the ceiling", "./the-pack-fits-under-the-ceiling.mjs"],
  ["one panel at a time, in the right language", "./one-panel-at-a-time.mjs"],
  ["a photo of a CV is a CV", "./a-photo-of-a-cv-is-a-cv.mjs"],
  ["an ordinary CV costs nothing to import", "./an-ordinary-cv-costs-nothing.mjs"],
  ["the diagnosis costs nothing and does not move", "./the-diagnosis-costs-nothing.mjs"],
  ["an achievement is not a responsibility", "./an-achievement-is-not-a-responsibility.mjs"],
  ["Nuvi does not fill in your figure for you", "./nuvi-does-not-fill-in-your-figure.mjs"],
  ["Nuvi comes and says it to your face", "./nuvi-comes-and-says-it-to-your-face.mjs"],
  ["what they will make you prove", "./what-they-will-make-you-prove.mjs"],
  ["the product does not promise a check it skips", "./the-product-does-not-promise-a-check-it-skips.mjs"],
  ["anyone can check what a parser sees", "./anyone-can-check-what-a-parser-sees.mjs"],
  ["two jobs do not become one", "./two-jobs-do-not-become-one.mjs"],
  ["a dead employer cannot be called", "./a-dead-employer-cannot-be-called.mjs"],
  ["the promise is visible while you write", "./the-promise-is-visible-while-you-write.mjs"],
  ["you see where the page ends", "./you-see-where-the-page-ends.mjs"],
  ["the screen shows the page you get", "./the-screen-shows-the-page-you-get.mjs"],
  ["dark mode does not darken the CV", "./dark-mode-does-not-darken-the-cv.mjs"],
  ["the document fits beside the navigation", "./the-document-fits-beside-the-navigation.mjs"],
  ["the keyboard shows where it is", "./the-keyboard-shows-where-it-is.mjs"],
  ["the interface can be read", "./the-interface-can-be-read.mjs"],
  ["the page moves when you scroll", "./the-page-moves-when-you-scroll.mjs"],
  ["the document holds while the steps arrive", "./the-document-holds-while-the-steps-arrive.mjs"],
  ["the coach reads a dropped file", "./the-coach-reads-a-file.mjs"],
  ["every feature produces output", "./every-feature-produces-output.mjs"],
  ["the phone reaches every feature", "./mobile-reaches-every-feature.mjs"],
];

const only = process.argv[2];
let failed = 0;

for (const [name, path] of SUITES) {
  if (only && !path.includes(only) && !name.includes(only)) continue;
  process.stdout.write(`\n  ${name}\n`);
  let failures;
  try {
    const mod = await import(path);
    failures = await mod.run();
  } catch (err) {
    failures = [`le test lui-meme a plante : ${err && err.message}`];
  }
  if (failures.length === 0) {
    console.log("      OK");
  } else {
    failed += failures.length;
    for (const f of failures) console.log(`    ECHEC ${f}`);
  }
}

console.log("");
if (failed) {
  console.log(`${failed} probleme(s). Ne pas livrer en l'etat.`);
  process.exit(1);
}
console.log("Tout est vert.");
