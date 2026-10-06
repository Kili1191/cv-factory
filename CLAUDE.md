# Nuvi

A CV factory. Someone drops in their CV, the AI rewrites it and adapts it to a
job ad, the app exports it as a PDF, tracks the applications and prepares the
interview. The product lives at thenuvi.com.

The promise fits in one sentence: **the CV has to get past the recruiters'
sorting robots**. Almost every rule below follows from it.

## The three rules that are not up for discussion

**1. No em dash, no en dash.** Long dashes have become the visual signature of
machine-written text. On a product that promises someone a credible CV, that
signature is read before the content is. The rule covers the whole repository,
not only the interface: the separator between the company and the city gets
printed on the PDF the recruiter reads. `tests/no-em-dash.mjs` refuses the
merge. Replacements: a colon to introduce, a comma for an aside, a plain
hyphen in comments.

One exception, and only one: `.claude/`, which holds instruction files copied
verbatim from third party repositories. Nothing in there reaches a screen or
a PDF.

**2. No runtime CDN dependency.** Two production outages had the same cause:
CV import looked for the pdf.js worker on cdnjs, and PDF export looked there
for html2canvas and jsPDF. A content blocker was enough to kill the feature.
What the app needs in order to work comes from its own bundle.
`tests/no-runtime-cdn.mjs` scans `app/` and `lib/`. Google fonts are still
tolerated: decorative, with a fallback stack.

The downloaded PDF has been native since 5 September 2026 on the single
column templates (classic, timeline, ATS): `app/api/pdf` opens `app/imprimer`
in a headless Chromium (`@sparticuz/chromium`, bundled into the function,
nothing downloaded at runtime) and prints the same template as the screen, as
vector text with the fonts embedded. The two column templates keep the old
export, a picture of the CV backed by an invisible text layer written by Nuvi
in reading order: read by position, two columns come out line by line
interleaved, and that layer is what keeps them whole (measured: fidelity fell
from 100% to 56%). If the route does not answer, the picture comes back for
everyone. `tests/the-pdf-is-real-text.mjs` holds all three cases. Off Vercel
the route borrows Playwright's Chromium, found by `lib/chromiumLocal.js`, the
same module the test harness uses: the first version carried its own copy,
limited to the remote session's folder, and answered 503 on CI where
Playwright installs elsewhere.

On 7 September 2026 the two column templates were printed natively to be
measured, with the same test CV and the scale in `lib/atsFidelity.js`:
poppler in flow order, MuPDF and Tika (PDFBox) read all three at 100%,
because the print page paints in reading order; the readers that sort by
position fall to 97, 86 and 92% (poppler by default) and to 86, 86 and 56%
(pdf.js sorted, the method some ATSs use): a section heading or a date range
shares its line with the other column and is no longer recognised. The
picture backed by its written layer holds 100% on all five engines. That is
why it stays: native text in two columns is not a question of rendering but
of geometry, and no PDF makes a reader that sorts by line read one column.

The old downloads, the picture backed by a layer cut at the end of each line,
exist on people's machines: someone re-imported theirs and found every bullet
truncated. So `lib/lireUnFichier.js` decides on two signs: the page is an
image (the drawn area of the image at the `Do` operator) and the layer stops
in the middle of a sentence (a long line with no punctuation, followed by a
new item rather than a lower case continuation). Both together, the page is
rendered and read as a photo. A real text PDF never takes that path.
`GET /api/pdf` says from a browser whether the function's Chromium starts:
the fallback picture hides any failure of the route, from whoever downloads
and from whoever maintains. `tests/an-old-download-is-read-whole.mjs`.

The downloaded CV carries no trace of the tool. A PDF has properties that
every reader displays and that some ATSs index: the print page having no
title of its own, every printed CV came out with `Nuvi - the CV that gets
past the ATS` as Title and `HeadlessChrome` as Creator, the product's name
and its slogan on the candidate's document. So `app/imprimer` titles itself
with the person's name and their role, the picture export sets the same
properties through jsPDF, and the user agent is forced on Chromium's command
line: `page.setUserAgent()` goes through the network layer and the print
engine never sees it. `tests/the-pdf-carries-no-trace-of-nuvi.mjs` reads the
`/Info` dictionary in the bytes, without depending on poppler.

The print fonts are static instances. Chromium cannot embed a variable font
in a PDF: it draws every glyph as an outline (a "Type 3" font, no font file
at all), and extractors lose whole lines to it, measured on CI where the
Google fonts load: the email address and the phone number disappeared from
the text that was read. So the route asks Google for the same families with
a user agent from before variable fonts (`lib/policesDuSite.js`), receives
one file per weight, embeds them as `data:` in the stylesheet and hands it
back to the page, which in turn serves the page's own font requests itself.
On paper the contextual alternates are cut: Inter replaces the "+" and the
"-" next to a digit with variants that have no Unicode mapping in the PDF,
and pdf.js read "33 6 12 34 56 78". `tests/the-pdf-is-real-text.mjs` refuses
a Type 3.

CI prints with the same Chromium as the remote session, build 1194 (141) as
installed by Playwright 1.56: the 131 from Playwright 1.49 emitted web fonts
as Type 3 even when static, and the text read fell to 8%. What we measure
here has to be what CI runs; Vercel prints with 149, measured on a downloaded
file: fonts embedded, text whole.

The PDF's stream follows reading order. Chromium writes in paint order, and
CSS paints positioned elements after the text in flow: the timeline's roles,
positioned to anchor their dot, came out at the end of the stream, after the
languages. Poppler and pdf.js sort by position and saw nothing; PDFBox,
behind Tika and some of the ATSs, reads the stream as it stands: 81% on CI.
So the print page positions every element, in tree order, except the wrappers
between an absolute decoration and its anchor, and wraps bare text nodes in a
positioned span. Tika only runs with `TIKA_JAR`: without it this defect
stayed invisible locally.

The model follows the task, and the cost follows the model. Since
8 September 2026, `lib/modeles.js` chooses: Sonnet 5 writes the first pass,
Opus 5 the measured second pass (`-reprise`) and the readings of the person's
own history (`import-cv`, `read_cv_image`, `linkedin`). Everything used to go
to Opus, and a complete application cost $0.39: at 19 euros a month the plan
lost money from the 48th application. With the rule, $0.18, and a hundred
applications fit inside the plan. The route writes one `[usage]` line per
call, with the model and the cost, which Vercel keeps: that line is what the
price is checked against. `tests/the-model-follows-the-task.mjs`.

A link is a door. `thenuvi.com/https://job-boards.greenhouse.io/acme/jobs/4012`
opens the app with that ad already read: it is a competitor's growth loop, it
costs nothing to learn and the link gets shared. `app/[...cible]/page.jsx`
reassembles the address (browsers collapse the double slash, and plenty of
people paste a link already encoded), `app/api/annonce` fetches the page and
pulls the ad out of it with `extension/extract.js`, the same extractor as the
extension, and all of it then goes through `cvf_incoming_job`, the extension's
channel: the app already knows how to turn that into a tracked application
with the sheet open on it. The route makes the server fetch an address chosen
by a stranger, so `lib/annonceEnLigne.js` refuses anything private, by name and
by resolved address, and at every redirect: a public page that redirects to
127.0.0.1 is the classic way past a check made only once. The page being a
catch-all, an address that is not one returns the 404 it used to.
`tests/a-link-is-a-door.mjs`.

The extension fills the form, and never submits it. Applying a hundred times
is not a hundred decisions, it is the same twenty boxes typed a hundred times:
first name, surname, email, phone, city, LinkedIn. That is exactly what the
tools promising "fifty applications at once" do, inside the person's own
browser, and it is why job sites cannot block them: the browser is her.
`extension/champs.js` carries the rule (`champPour` recognises the box,
`remplirLeDocument` writes through the prototype's setter, or React sees
nothing), `remplir.js` is injected only into the open tab and only on a click,
and `bridge.js` carries the profile from thenuvi.com into the extension's
storage, because a script on a job site cannot read Nuvi's. Two rules hold the
whole thing together: we fill, the person sends; and we only write what she
has already said, into a box whose meaning is in no doubt. Password, national
insurance number, date of birth, salary, notice period, right to work,
diversity, cover letter: never.

The questions every form asks again (right to work, visa sponsorship, notice,
salary, mobility, driving licence) are the ones that cost the twenty minutes,
because they come back with every application and the answer does not change.
Nuvi does not guess them: the person answers once in Settings (`cvf_rep`,
synced), and the extension repeats her words. A question with no answer stays
empty. These questions most often arrive as a dropdown or a pair of buttons,
so `optionPour` recognises yes and no as the page writes them, and sponsorship
is tested before right to work: "will you require sponsorship" contains both,
and getting it the wrong way round inverts the meaning.

The last box is the file. Twenty boxes filled and you still have to go and
find a PDF on disk, where the CV adapted to this ad is not even: it has just
been written inside Nuvi. So the button asks `thenuvi.com/api/pdf` for the
current CV, the only host the extension is allowed to reach, and drops it in
the box. In the one that asks for a CV and in no other: a passport, a photo, a
portfolio or a letter all take the same shape, and a CV dropped into one of
them is worse than an empty box, because the person does not see it and the
employer receives the wrong paper. The words of a neighbouring box bleed onto
it (the letter sits right under "Resume/CV" at Greenhouse), so when both
appear the CV stays out. A file box cannot be assigned to: only a
`DataTransfer` makes a `FileList`, and that is the part of filling that can
only be proved in a browser.
`tests/the-extension-fills-the-form.mjs` holds both directions, the CV box and
the boxes that are not one, and checks that the form has not been submitted.

The career board registry is built, and it does not fit inside one request.
The jobs that are on no job site are served as public JSON by the six big
ATSs: reading a board is trivial, knowing it exists is not, and that is the
only part of this feature that costs a competitor any time. So
`scripts/find-job-boards.mjs` takes names from Wikidata, which returns
companies by head office with their official site, with no key: 1201 for
London in one second with the direct `wdt:P159` predicate (the transitive
`wdt:P131*` path, "inside Greater London", takes 24 seconds for fifty rows).
Two methods, because neither is enough: guessing the identifier from the name
and the domain (about 40%), and reading the careers page to find the link to
the ATS (3 out of 12 measured, because many of those pages load their board in
JavaScript). They do not find the same companies: the first misses
`octopus.energy`, which is `octoenergy` at Lever, the second misses Monzo,
whose Greenhouse board really is called `monzo`.

**Answering is not belonging, and it is the one lesson of the day.** An ATS
identifier is global and short, so it gets shared. A first pass wrote 56 lines
on the rule "a line written is a line that answered", and nearly all of them
were wrong: `bbc.recruitee.com` is a Belgian firm in Mechelen,
`web.jobs.personio.com` is in Munich, `london` was the Serbian embassy,
`amazon` was Book Depository, `fr` was Nickelodeon. They had to be removed one
by one.

Two filters stop them, and both were measured on 6 October 2026.

The first is **where the open jobs are**. A line enters the registry with the
market it was searched for (`market`), and only if an open job is in it. A
London company hiring only in Berlin that day is therefore refused: an
accepted gap, since it would return nothing to a London search anyway. Over
1199 London names, this filter discarded 56 boards that had answered.

The second is **the name the board gives for itself**. Wikidata returns the
article, not the employer: "BBC Radio 2" for the BBC, "Photobox" for what is
now called Storio group. All six ATSs declare the employer, Greenhouse on
`/v1/boards/<slug>`, Recruitee on every job, the other four in the title of
the board page ("ClearBank Jobs", "Jobs at ECFR"). A board that cannot say
whose it is does not get in: `lloydsbank.jobs.personio.com` and
`arsenalfc.jobs.personio.com` both answer "Jobs at " with an empty name, and
the first posts an SEO role and a social media internship. That is not Lloyds
Bank. A wrong name on a job card is worse than a missing card: the person
clicks and finds a different employer, on a product whose whole promise is
credibility.

**And a British city name also exists in the United States.** The first word
list contained "cambridge", and `greenhouse.io/serif`, Serif Biomedicines in
Cambridge Massachusetts, entered the registry as British. There is a Boston, a
Birmingham, a Manchester, a Bristol, a Reading and an Oxford in the United
States, and the American form writes them with the state code right after. So
`inTheMarket` tests in this order: the named country always wins ("New York,
NY and London, United Kingdom" stays true), then a marker from elsewhere
refuses, and only then does a city name count. State codes are tested in upper
case, as they are written: without case, "ma", "in" and "or" would appear in
legitimate locations.

The price of that order is a multi-site string written with commas: the ECFR
role open in "Berlin,Madrid,Paris,Sofia,London,Rome,Warsaw,Washington DC" is
refused although it is also in London. That is the right side of the trade: an
American board inside the registry costs more than a missing organisation, and
it comes back on the next pass as soon as it posts a London role.

Result of the two passes of 6 October 2026: Wikidata by city returned **21
boards kept out of 1199 names, 2%** (56 discarded on location, 2 on the name,
7 renamed by their own board); 1919 British company domains filtered by sector
returned **27, at 1%**, but of far better quality, Octopus Energy, Sophos,
Mulberry, Elsevier, Redgate, Castrol, NaturalMotion. Three were removed
afterwards by the namesake rule. **The registry went from 49 to 94 lines.** The
yield mostly says that Wikidata by city is the wrong list to start from, full
of embassies, football clubs and colleges.

The first forty-nine lines have no market and are tried for every one of them,
because a field that gets added must never remove a line from a search that
found it yesterday.

**The lists that would reach volume are not reachable from the server**,
measured the same day: the Common Crawl index returns 504 in ten seconds,
search engines answer 202 or cut the connection, and the sitemaps of
Greenhouse, Lever and Ashby are 301, 404 or empty HTML. What remains, and it
is worth more than any of those: **aggregators name the employer on every
ad**, and those are exactly the companies hiring in the person's market today.
`scripts/find-job-boards.mjs --aggregator` takes them, so the registry grows
with use rather than from a list copied out. The same free key opens both.

Then Hacker News beat all of it. "Ask HN: Who is hiring?" has run every month
since 2011, and on 6 October 2026 that was 186 threads and 119,808 comments,
almost every one a company that is hiring with the direct link to its board.
The Algolia API serves them free and with no key: **2633 unique slug/ATS
pairs**, against 23 boards for 1199 Wikidata names. The difference is not only
volume. There the ATS is already known, because it is in the URL somebody
pasted, so nothing is guessed, one request per pair instead of eighteen, and
no namesake from a guess. 172 of them passed verification for the British
market, at 7%; 582 answered with no UK job and 2 could not say whose they
were. `--hn` is that source. **The registry stands at 283 lines, 266 of them
British**, holding 19,188 jobs, 2,424 in the UK and 1,772 matching London.

**And the reading became an index, not a cache.** The first version read all
fifty boards as soon as the fifteen minute cache expired, ten in flight, and
fitted inside the function's thirty seconds. At five hundred it does not: the
route overruns and returns an empty list, which reads as "no jobs" rather than
as a failure. So the opposite: every search serves the whole index and
refreshes the stalest boards as it goes, within a measured budget. The cost
per search is bounded whatever the registry's size, and the response carries
the count (`index.read` of `index.boards`) that the screen displays, because a
short list means two very different things and they read the same.

The budget is twelve seconds, and it is measured rather than chosen. Against
the real ATSs: 30 ms per board at twelve requests in flight over a sample of
sixty, 16 ms at twenty-four, 14 ms at forty, and no silent board in any of the
three. But the sample lied: the full 266 take 8.8 s at twenty-four, not the
4.2 s the extrapolation promised, because the big boards are slow and unevenly
spread. It is paid once per instance per half hour.

Asking which sources exist is not asking for jobs. `/diagnostic` only reads
`sources`, `configured` and `keys`, and it was getting them by running a whole
search, so the setup page sat blank for twelve seconds before point 8 said
anything, on the one page whose entire job is to say quickly what is wrong. A
suite caught it by reading the page after six seconds and finding nothing,
which is what a person would have found. `only=sources` skips the boards and
answers in 72 ms.

**A button that does nothing is worse than no button.** Measured on
production on 6 October 2026, with no aggregator key at all: a London search
returned **800 career page jobs in a single response**, announced 831, and
showed "show more". Page two returned nothing, because career pages were
served whole on page one and deliberately absent from the rest. They paginate
like everything else now, fifty per slice taken from the index, and the button
only exists if there really is more. Turning a page re-reads no board: the
index is already in memory, and only page one refreshes it.
`tests/more-results-means-more-results.mjs` calls the route directly with
`fetch` doubled, because the defect only appears on page two.

**The ceiling the person saw was not the index, it was twenty.** Adzuna and
Reed were called for twenty results of page one, and never the next. They hold
hundreds of thousands behind the same query. So the search paginates, fifty
per page (Adzuna's maximum), the sources declare their total (`count`,
`totalResults`) and the screen writes "50 of 64,000" with a button that opens
the rest.

**An aggregator call is a quota, not a request.** Career pages have an index
because reading 266 boards is slow; the aggregators are fast, so they had no
cache and every search spent one Adzuna call and one Reed call. Their free
tiers are counted per month: a handful of people searching a few times each
exhausts a month in a day, and when the quota runs out the route catches the
error and the search loses half its sources with nothing saying so. Same rule
as the boards, then: an identical query inside thirty minutes is served from
memory, two hundred entries at most.

And some of the requirements are asked of the source. Adzuna accepts a salary
floor, an age and a contract kind (`salary_min`, `max_days_old`,
`permanent=1`); Reed accepts a floor and a contract kind (`minimumSalary`,
`permanent=true`) and documents no age at all. So the fifty results they
return are fifty that can survive the filter rather than fifty we discard, and
their `count` describes the search actually made. The place of work, the
language and the level stay local, because none of the three is a field on a
job ad: they are sentences in its prose, which is exactly why reading them
here is worth anything. An internship has no flag at either source and is read
from the prose, because mapping it onto another would return permanent roles
to someone asking for an internship.

**A salary band has two numbers, and the top one answers.** The first version
took the first and called it the floor. Measured against a real Adzuna key on
6 October 2026: asking for 60,000 returns ads whose band starts at 35,000,
because Adzuna reads `salary_min` as "this band reaches 60,000". Our local
filter would then have thrown those same ads away for starting below it. A job
advertised at 35,000 to 65,000 can pay someone 65,000, and dropping it loses a
real opportunity with nothing saying so. The question a floor asks is "can
this job reach my number", and the answer is the top of the band:
`advertisedReach`. That is also what the source did to produce its count, so
the number on screen and the list under it describe the same search. Measured
on the real key: 50 returned, 50 kept, 0 dropped.

That defect could not be seen without a key. It is the argument for connecting
a real source before calling a feature finished, not after.

**The key was good, and no screen could say so.** Kilian created an Adzuna key,
put it in Vercel, and the search kept answering "career pages" only. The key
worked: from a terminal against the real API it returned 6794 jobs. Three
causes read identically, the variable absent, the name misspelt, the value
wrong, and finding the right one cost a round trip. It was the first: Vercel
freezes environment variables into a deployment at build time, so saving them
does nothing until a build is created afterwards. `/api/jobs/search` therefore
returns `keys`, **one boolean per name and never a value**, and `/diagnostic`
prints it. A name absent means Vercel is not delivering it; a name present
with the search still failing means the value is wrong, and that already
arrives as its own warning. The test that matters is not that the boolean is
right, it is that no value can come out: it plants a secret string in all five
variables and refuses to find any piece of it in the response.

**And a total must say which search it counted.** Some of the requirements go
to the source, so its count describes the search that was made. The rest do
not, and **the aggregators do not agree with each other** about what they can
sieve: Adzuna takes an age, Reed has none, both take a salary floor and a
contract kind, and neither knows anything about the place of work, the
language or the level. So "posted this week" is exact with Adzuna alone and
becomes approximate the moment Reed answers too. `FILTERS_AT_SOURCE` declares
it per source, and the total becomes approximate as soon as **one**
contributing source could not sieve an active requirement. Measured on
production the minute the key went live: "account manager in London, remote"
showed 13 jobs and announced 6798. That reads as "13 of 6798 match" and it is
false. The screen now says "13 shown, from 6798 found".

None of this makes millions of jobs without the keys: without
`ADZUNA_APP_ID`, `ADZUNA_APP_KEY` and `REED_API_KEY`, the search has only the
career pages, and a registry of career pages will never be an aggregator.
`/diagnostic` says so, point 8.

A sentence is a search, and the model does not search. Kilian, on 6 October
2026, giving **one example** of what a person would type: "find me a French
speaker job with my CV in London". No, it did not search: there were two
fields, a title and a city, and most of that sentence was neither.

The example is not the feature, and certainly not a niche. Kilian had to say
so, because the session before had turned it into the product's positioning,
"the London job that wants a French speaker", which is a niche he never asked
for. What a person asks for is rarely a title and a place: it is a title, a
place and two or three conditions, and the conditions are what disqualify an
ad in one line. The language is one of the six, and French was an example
value.

`lib/searchFromASentence.js` has the model turn the sentence into
requirements, and the search does the searching. The distinction is
everything: a model that "found offers" would invent them, and an invented
offer is the one thing this product cannot afford. What it understood comes
back in `understood` and is always shown, and the requirements stay editable
by hand, because a search you cannot correct is a search you cannot trust.
"With my CV" means the trade and the level are already written there: taking
them from it is choosing inside the person's own material, not inventing. What
the model never does: add a requirement nobody asked for, because an invented
filter removes jobs in silence.

`lib/jobFilters.js` reads the six requirements in the prose of the ad, and
that is exactly what an aggregator cannot do: `what` and `where` go to the
source, "the ad requires French" is read in the text. Two rules carry the
whole file.

The required language earns its line for a reason that has nothing to do with
any market: an ad that asks for a language says so in a sentence, never in a
field, so no job site can filter on it. That is true of all eight languages,
and true of the other five requirements.

**A word being present does not mean what you think**, the lesson of
`includes("account")` inside "accounting". "Fluent French essential" requires
French; "We serve the French market", "French fries on the menu" and "report
to the French CEO" do not. So the name of the language must sit within fifteen
characters of a word that means speaking it, and letters count inside those
fifteen: "Maitrise du francais" has a "du" in the middle that a punctuation
only class misses. Likewise "This role is not remote" contains "remote": the
refusal is tested before the offer, like sponsorship before right to work in
`extension/champs.js`. And the level is read from the title only, because
every ad says "senior stakeholders" and "report to the Head of".

**A filter that cannot decide does not exclude.** Half of ads do not state a
salary. If a floor dropped them, asking for 50,000 would empty the list of its
best offers with nothing saying so, and that is the silent failure this
repository knows best. So they pass, and `countTheUndecided` says how many
they are so the screen can write "31 of these do not state a salary". Same for
a missing date.

**But silence is not undecided: it is the default, and the default has a
name.** An ad states what deviates and assumes the rest. Remote and hybrid
are written down because they are the selling point; an internship, a fixed
term and part time are written down because they are what the candidate has
to be warned about. Permanent, full office and mid level are never written
down, because they are what you get when nothing is said. So a reader that
returned nothing on silence, and let the filter turn that nothing into an
exclusion, emptied the list: measured on production the day Reed went live,
"account manager in London, permanent" kept 24 jobs of 120 and dropped all
23 career page ads, not one of which prints the word "permanent" anywhere.
`jobLevel` already read silence as "mid"; `workplaceKind` and `contractKind`
read it as "onsite" and "permanent" for the same reason. The asymmetry is the
point, and it is why this is not the rule above: asking for an internship
still drops every ad that does not say so, because an ad that is one says so
in its title. Found by connecting the second source and reading the numbers
per source, not by a suite.

And there is only one button. The first version had two, both named
"Chercher": the sentence's and the fields'. A suite saw it before a human did,
by clicking the first of the two and finding it disabled because the sentence
was empty. Two buttons with the same name on one screen are a defect whatever
the test says, since the person cannot tell which does what, so there is one:
a sentence not yet read is read first, and the search follows with what it
filled in. A sentence already read does not go back to the model when a field
is corrected by hand.

`tests/a-sentence-is-a-search.mjs` does not call the AI: what is ours is the
reading of the requirements, not the translation.

The panel's number is counted. `match_score` was a free field on the schema:
the model filled it however it felt, nothing computed it, nothing checked it,
and two passes over the same ad/CV pair did not give the same number.
`lib/atsMatch.js` had already settled the question, with the reason written
beside the code: a mark out of 100 implies a precision we do not have and
pushes people to optimise the number rather than the CV. The big number at the
top of the panel said the opposite of the principle written under it.
`couverture()` now counts the share of the ad's phrases that appear in the CV
as the ad writes them, which is what a string sort does, and the measurement
is taken on the ADAPTED CV, the one that would be sent. A line under the
number says what it counted: a score nobody can explain is a score nobody
should act on.

A job site's furniture is not a requirement. On an aggregated ad, a title, a
salary, a contract type and almost nothing else, the extracted phrases were
`000 gbp`, `days ago`, `apply now`, `company website`, the company's name. The
panel had been offering them as missing from the CV forever, and the number
counted them: a CV whose job title repeated the ad's word for word came out at
7 out of 100. The header was already cut, but on a thin ad the furniture is in
the body; it is recognised by what it says, an amount, a date, an invitation
to apply, an address, a legal form, never a skill. And under six real
requirements no number is shown at all: a share of nothing stays nothing, and
the two lists stay right. `tests/the-gap-with-the-job-ad-is-honest.mjs`.

The default template is single column. It used to be `sidebar`, two columns,
so anyone who never opened the picker, which is almost everyone, downloaded
the picture: a page without a readable word, which only gets through thanks to
the layer written underneath. That layer measures 100% on all five engines, so
this is not a fidelity fix. It is that the home page's promise is a CV the
sorting software reads, and the file produced by default has to be the one
whose text is simply there. When what you see and what the machine reads are
two separate things, a broken layer still looks perfect on screen: that is how
the truncated bullets of the old exports reached real people.
`GABARIT_PAR_DEFAUT` is `classic`; the six templates remain, the picker still
opens on import, and two columns are one click away.

The money arrives through `app/api/billing`. The plan is set in `lib/plans.js`
(24 euros a month, 49 for three months, three free adaptations with an
account); `lib/facturation.js` talks to Stripe and to Supabase with the
service key, server side only. The AI route asks who is paying: with no
account 401, once the free ones are used 402, and `lib/ai.js` turns those two
answers into a `nuvi:paywall` event that opens the sign-in sheet or the plan
sheet. A plan only exists because Stripe said so on the webhook, signed; the
browser cannot grant itself anything (RLS is read only). Without the seven
variables (`docs/facturation.md`), everything stays free and accountless: the
harness and a development machine run that way.
`tests/the-money-arrives.mjs` proves the circuit against doubles.

The routes have a ceiling. `middleware.js` counts calls per address over a
minute (20 on `/api/pdf`, 40 on `/api/claude`, 30 on the registries) and over
a day (300 on `/api/claude`: a script staying under the minute would have
spent a month of revenue in one night) and answers 429 with `Retry-After`,
which the client already knows how to wait for. The instance's memory is the
counter: enough to stop a loop, not a global ceiling; a shared store will come
when one is needed. A caller with no address is local, the test harness first
of all, and is never limited: `tests/the-routes-have-a-ceiling.mjs` passes
itself off as a visitor. Calls to Anthropic stop at 55 seconds and the stream
cancels upstream when the browser leaves. Supabase's four RLS rules live in
`supabase/migrations/`, not only in the documentation any more.

What breaks reaches the owner before the screenshot does.
`lib/incidents.js` keeps the page's errors, the broken promises, the fallback
picture on export and the AI giving up, and sends them to `/api/incident`:
kind, truncated message, path, build, device, never a word of the CV. The
function writes an `[incident]` line into its logs, which Vercel shows, and
relays it to `INCIDENT_WEBHOOK_URL` if that is set (Slack, Discord, any POST).
In Settings, "Report a problem" sends a note and, if the box is ticked, the
shape of the CV: sections and counts, not the text.
`tests/a-breakage-reaches-the-owner.mjs`.

The CV also leaves as Word. `lib/exporterEnDocx.js` writes the same data in
one column, real section headings, real bullets, the template's fonts named,
with the `docx` library loaded on demand. Never a table: a Word file is worth
what a recruiter can edit in it, and a table breaks under their cursor. CI
opens the file with LibreOffice Writer and prints it: the proof that it is a
document, not a zip that passes a regular expression.
`tests/the-cv-leaves-as-word.mjs`.

A LinkedIn profile saved as a PDF is a CV. The file puts a narrow column
(Contact, Top Skills, Languages, Certifications) beside the profile, and
`lib/lireUnFichier.js` used to rebuild lines from their height alone: every
line took a piece of both columns. So `enColonnes` looks for a vertical band
that no fragment crosses below the top quarter of the page, and reads the wide
column first, the narrow one after; on a single column CV every bullet runs to
the margin and crosses any candidate band, so nothing is cut, whatever the
dates on the right are doing. `lib/lireUnCv.js` knows the shapes of the
export: its headings, the duration in brackets after the period, the school
above the degree, the footer, and the sentence the page has cut (a long line
with no punctuation followed by a lower case letter is one line).
`tests/a-linkedin-profile-is-a-cv.mjs` prints a page in the shape of the
export at test time, no personal file is in the repository; a real file is
still the next thing to try.

The shop window, on `/`, has since 7 September 2026 used the structure Kilian
chose on motionsites, "Planetary Pulse": text at the top left, a card at the
bottom right, light black typography, a chamfered button, a menu that slides.
`app/components/Vitrine.jsx` and `vitrine.css`, prefix `vv-`. A first version
had recoloured it in the site's cream and coral and was refused; the only
colour added is the purple of the logo's dot.

**The orb left on 7 September**, the same day. The reference's video filled
the screen and said nothing about the product. Kilian: too big, no use at all,
and the grey stayed whatever filter was applied. So there is no `<video>` and
no `/vitrine/orbe.mp4` in the repository, and it is not a missing file: the
card now holds the only thing on that page which is not an assertion, the
visitor's own CV line read word by word on the device. The header of
`Vitrine.jsx` says so too, because this very paragraph has already sent a
session looking for a video that no longer exists.

The sections underneath live in the same world and keep the classes the
suites hold (`nuvi-scroll-in`, `nuvi-titre-geant`, `nuvi-mots`,
`nuvi-piste-doc`, `nuvi-temps`): scroll motion stays in `globals.css`. The
inks are solid greys, never an opacity over an unknown background: the
readability suite measures every piece of text against the first opaque box
behind it.

The page is looked at on a phone before it is called finished. Three defects
survived there a long time because nobody had done it: the footer links read
"How it worksLayoutsCheck my CVPrice", the big Nuvi signature had never
exceeded 16px (`.vv-foot a` beat `.vv-foot__mark` by one class, and its
`font: inherit` is a shortcut), and the list of trades left an orphan full
stop at the end of every line. No suite saw any of them: the contrast was
right, the words were there.

**3. The AI invents nothing, except when it is asked to.** Kilian's rule, on
25 September 2026: *the AI invents when it is for the CV and when it is asked
for*. Both conditions count, and it is the second one that holds everything
together.

**By default, nothing.** Adapting a CV to an ad manufactures no fact: the
career record gathers what the person has already written, across their
different CV versions, and the adaptation draws from it. Choosing inside your
own material is not inventing, it is what anyone does when they adapt a CV by
hand. Nobody receives an experience they did not ask for.

**When the person asks, the AI writes what it is asked for.** It is their CV,
it is their signature at the bottom, and a tool that refuses to write the
sentence they demand sends the person back to a word processor. The asking is
what separates a tool from automatic falsification: nothing appears on the
document that the person did not want.

**This mode has existed for a long time and carries the whole rule.**
`ecrireLeCv` in `AppRoot.jsx` writes a complete CV from the ad alone, through
two doors: "I am starting from the ad" on the home screen, and "Generate with
Nuvi" from a job title. Someone who has never written a CV does not arrive
with a CV, they arrive with an ad that interests them. So the model fills in
**everything the role implies**, and that is exactly what it is asked to do,
fully. Three things stay forbidden: an employer, a date, a qualification the
person did not give.

And it **marks what it filled in**, in the schema's `deduit` field, so the
person knows what to replace. It is the same gesture as the live assistant's
`BUILT:`, and it is not a precaution of principle: on a document you send,
what comes from you and what comes from the model read the same, and only the
person can decide what they will stand behind.

**In an interview, the question IS the request.** A hypothetical ("what would
you do if") has nothing to recall: building IS the right answer. On a question
with no material in the CV, the assistant builds too, inside the person's own
world, and **marks the `BUILT:` flag**. Under pressure, a point drawn from the
CV and a point that was built read the same and are said with the same
confidence; one is defended with a payslip, the other with itself, and she has
to know which one she is holding.

**Three facts stay forbidden everywhere: the employer, the job title and the
date.** They are the ones a recruiter checks with one phone call, and the only
ones whose cost lands on the person weeks later.

`tests/the-career-record-invents-nothing.mjs` stays, and does not say what you
would think: `lib/careerRecord.js` is plain JavaScript, with no call to the
model. That test guards the assembler, not the AI. The AI's freedom lives in
the instructions (`MatchPanel.jsx`, `LiveAssistModal.jsx`), and that is where
it has to be changed.

**The promise was taken off the shop window the same day**, in eight places:
the section title, the banner, the "paste the ad" step and the letter card all
said "Nuvi never invents anything". That *never* became false the second
invention on request existed, and a false public promise costs more than the
feature earns.

**And the page does not say the opposite either.** A first rewrite announced
"adds nothing you did not ask it for", which is true and amounts to warning
the visitor, on the home page, that the tool can write whatever it is asked
for. That is not what a home page is about. So it says what Nuvi does: **your
facts stay your facts**, the wording changes so the software finds them, and
what appears on the CV belongs to the person. The section and its
demonstration stay: the same facts rewritten is still exactly what the default
does.

## Structure

| Path | Role |
| --- | --- |
| `app/page.jsx` | The shop window, on `/` |
| `app/app/` | The tool itself, on `/app` |
| `app/components/` | The components, including the CV templates (`CVLayouts.jsx`) |
| `app/api/` | Server routes: `claude/` for the AI, `jobs/` for the job search, `pdf/` which prints the CV |
| `app/imprimer/` | The page `api/pdf` opens in a headless Chromium: the CV alone, ready to print |
| `app/i18n/` | `fr.js`, `en.js`. The language is asked once, then fixed |
| `lib/` | The business logic outside React: ATS parsing, CV serialisation, Gmail, Supabase |
| `extension/` | The browser extension that reads a job ad |
| `tests/` | The end to end tests, plus `lib/harness.mjs` |
| `.claude/agents/` | Nine specialised agents, one per way this repository breaks |
| `docs/` | Setup, accounts, Gmail |

## Commands

```bash
npm run dev      # development server
npm run lint     # eslint, one rule only: no-undef
npm test         # the full suite, preceded by a "next build"
npm test export  # a single suite
```

**`node tests/a-suite.mjs` checks nothing.** The suites export `run()` without
calling it: launched that way the command returns 0 without reading a file,
and that silence reads as a success. Used as a guard rail through a whole
session, it guarded nothing, and rule number one got broken inside this very
file. The two suites that are run by hand, `no-em-dash` and `no-runtime-cdn`,
now really execute when called directly. The others go through
`npm test <name>`.

**`node tests/run.mjs` does not build.** It is `pretest` that runs
`next build`, so only `npm test` does it. Calling the runner directly serves
the previous build to the browser: the suites that drive the screen then
measure code that is no longer yours, and they are green or red for a state of
the repository that does not exist. On 25 September 2026 a fix was declared
unapplied on that basis alone, and a full run was counted as covering a change
that was built two hours later. Comparing `.next/BUILD_ID` with the edited
file settles it in one command. `SKIP_BUILD=1` is honest: it says the build is
being skipped. The trap is saying nothing.

`npm run lint` deserves a word: the configuration carries one rule. A click on
"Compare" went to production raising `lang is not defined`, the component
exposing `locale`. The build passed, the page loaded, the feature was dead. No
unit test would have caught that.

### What the tests need

| Variable | What it is for |
| --- | --- |
| `TEST_PORT` | Port of the test server, 4311 by default |
| `PLAYWRIGHT_CHROMIUM_PATH` | An explicit Chromium. Otherwise `tests/lib/chromium.mjs` looks inside `PLAYWRIGHT_BROWSERS_PATH` |
| `TIKA_JAR` | Without it, the Tika engine declares itself not run instead of being silently skipped |

The suite questions three independent extraction engines: poppler, MuPDF and
Apache Tika, plus tesseract to read the rendered image. That is deliberate. A
reading order bug was visible to PDFBox only, the other two reordered the text
by position and hid it. On a remote session,
`.claude/hooks/session-start.sh` installs all of that.

## The colours: two families, and they do not mix

On 2 September 2026 a sweep measured every visible piece of text in the app:
**twenty-nine** were under the AA floor of 4.5:1. Not one bad colour, a
missing rule. The brand palette was being used as ink.

    coral on white              3.12:1
    the grey eyebrow            2.32:1
    the badge's green           3.00:1 on its soft green background

The navigation labels, **every** field label in the editor, the eyebrow of
every panel. At 10 or 11 point, which is the size where it is paid for. Nuvi
is read on a phone, often outdoors, often badly lit.

Hence the rule, and it is one line:

> **Text takes the `-Text` token. A fill takes the other.**

`--nuvi-coral` paints a background, a gradient, a badge: there it carries
white and the contrast is computed differently. `--nuvi-coral-text` writes.
Both switch with the theme, and the ink versions are calibrated to hold 4.5:1
on the product's backgrounds, including the soft ones, which are more
demanding than white. The same for `purple`, `magenta`, `green`, and
`--nuvi-gray-text` which replaces `Gray400` as soon as it is a matter of
writing.

`tests/the-interface-can-be-read.mjs` measures every visible piece of text on
the shop window and three screens of the app, in light and in dark, on desktop
and on phone. It found its first real defect on its first run, on the shop
window, the page nobody had ever measured.

### A dark surface declares itself

`data-nuvi-sombre` on a container redeclares the inks, the hairline and the
paper inside it. Everything placed in there inherits the right values.

That is what makes a dark bar possible without touching a single colour by
hand: the ink tokens switch to their light versions there. Repainting a
background **without** that attribute is the defect not to repeat: correct
text, on the wrong background, and nothing to signal it.

The rail is `#22201c`. It is not a black: the cream `#faf8f3` and the hairline
`#e8e3d6` are both at hue 43, Nuvi's warm neutral; keep the hue, lower the
lightness. A first version used `#17171a`, borrowed from developer tools:
channels 23/23/26, blue dominates, so it reads cold next to a cream. The sign
that the right one is right: **the brand coral holds on it without washing
out**, which the near-black required.

### The CV never follows the theme

`[data-cvf="cv"]` redeclares the light values, in both themes, and sets its
text colour on itself. It is the document that leaves as a PDF.

A rule already existed for that and applied to **nothing**: it targeted
`.cv-preview-container`, a string absent from the whole repository. In dark
mode the container therefore went to `rgb(26,26,28)` and inherited the light
text of `[data-cvf="app"]`. Invisible on screen, since the children cover the
background, but the export stretches the sheet to 297 mm when the content is
shorter, and the background reappears in the recruiter's PDF.

### Focus is visible, and `:where()` was not enough

Twenty-seven places set `outline:"none"` as an **inline** style. The rule that
was meant to cancel them was wrapped in `:where()`, specificity zero: it lost
against all twenty-seven. It worked for buttons, which do not set it, and
**never** for an input. The accessibility floor is therefore `!important`,
once, in `globals.css`.

### The navigation icons have one source

`app/components/navIcons.jsx`. They used to live as local variables in the
sidebar, so the phone's "More" drawer, twenty-one entries, had none of them
and fell back to an empty round badge. `NAV_TEINTES` sorts the entries into
four families there; only the icon is coloured, the label stays neutral.

---

## How the tests are written

They carry sentences as names: `a photo of a CV is a CV`, `the shared link
tells the truth`, `nothing covers a control on a phone`. They are not unit
tests, they are assertions about what the user observes. They cover what has
already shipped broken to production, not what is easy to test.

Every suite exports `run()` and returns a list of failures. An empty list is a
pass. No framework: `tests/lib/harness.mjs` starts a Next server, drives a
Chromium, and the assertions are explicit.

Three traps the harness documents at length, and which are worth reading
before debugging:

- A server left listening serves the previous build. The harness refuses to
  start rather than test a ghost.
- `stopServer` kills the process group, not only `npx`.
- `seedApp` sets the language explicitly. A test that asserts text has to say
  which language it expects it in, otherwise it depends on a setting the
  product is allowed to change.

## Writing conventions

**Everything in English.** The code, the comments, the internal error
messages, the test names, the commit messages. The rule was French until
30 August 2026; the repository therefore still holds some French comments, and
nothing requires translating them in passing. What gets written from now on is
English.

**This file too, since 6 October 2026.** It had been French, and the rule said
so. Kilian had to ask twice before it was taken seriously: once for the code,
which was translated that day, identifiers included, and once again when he
kept seeing French going into this document. Translating it was the answer,
not explaining why the exception was legitimate. Nothing in the repository is
French any more except the pre-30-August comments in files that were only
passed through, and the strings the user reads.

One thing does not change: **the text the user reads stays bilingual**, in
`app/i18n/fr.js` and `app/i18n/en.js`. The language of the interface is a
product choice, not a code convention, and French has exactly the same status
there as before.

**Comments explain why, and take the room they need.** The CI's
`timeout-minutes: 90` comes with six lines saying why 90 and not 60. That is
the house style: you write the reason while you still have it, because in six
months nobody will. That does not change with the language: an English comment
that merely repeats the line of code below it is worth no more than its French
equivalent was.

**No accents and no non-ASCII characters in code comments.** `docs/` and this
file may carry them. Comments in `.js`, `.jsx` and `.mjs` stay ASCII: it was
true for French without accents, it stays true for English.

## Agent tooling

The skills installed for the agents are described in `.claude/README.md`: the
taste-skill plugin, Vercel's interface recommendations, playwright-cli to
drive a browser from the terminal, and a library of `DESIGN.md` files.

### Nine agents, one per way this repository breaks

`.claude/agents/`. They are not generic roles: each one carries what has
already shipped broken in its area, with the measurement and the file. An
agent that repeats what the code already says does not earn its place; the one
that knows PDFBox was the only engine to see reading order saves a session.

| Agent | What it holds |
| --- | --- |
| `ats` | The PDF as the five engines read it. Two columns, Type 3, paint order, the Word export |
| `humain` | What makes a person throw a CV away: the generic, the verb at the head of a bullet, American spelling |
| `oeil` | The phone screen, the only place the product is really read |
| `silence` | What breaks without saying anything: the fallback that hides the failure, the invisible layer |
| `epreuve` | The only question that counts for a test: can it go red |
| `langue` | One language leaking into the other, and the labels that exist in neither |
| `sous` | What a feature costs per person per month. The arithmetic has been wrong once already |
| `donnees` | The person's data: what follows from one device to another, and what is lost |
| `porte` | Reading a page a stranger chose: the link-door, the extractor, the extension |

`humain` is the one whose content ages: the signs a recruiter associates with
a machine move with the models, and its word list says itself to re-check it
before relying on it.
