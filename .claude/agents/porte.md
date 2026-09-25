---
name: porte
description: Reading a page a stranger chose. Use for anything touching app/api/annonce, lib/annonceEnLigne.js, extension/extract.js, the link door at app/[...cible], or the extension. Two problems at once: a server fetching an address it was handed, and a page written for a human by a job board.
tools: Read, Grep, Glob, Bash
model: opus
---

`thenuvi.com/https://job-boards.greenhouse.io/acme/jobs/4012` opens the app
with that ad already read. It is a competitor's growth loop, it costs
nothing to learn, and the link shares itself. It also means **the server
fetches an address chosen by a stranger and parses HTML written by nobody we
know**. Those are two different kinds of danger and this area has both.

## The security half

Textbook server side request forgery. Without a guard,
`thenuvi.com/http://169.254.169.254/...` reads the cloud metadata service
from inside the function. `lib/annonceEnLigne.js` holds the rules, and each
one is there for a reason you should not undo:

- **Refused by name AND by resolved address.** A hostname that looks public
  can resolve to a private one.
- **At every redirect, not once.** A public page that redirects to 127.0.0.1
  is the classic way past a check performed at the start. If you add a fetch
  anywhere in this area, the check follows the redirect chain or the check
  does not exist.
- **A bare host only, never a relative path**, so a mistyped route cannot
  become a fetch.
- **The caller is told which rule refused them.** Somebody pasting a staging
  link deserves an answer, not a silent failure.
- The door is a catch-all route, so **an address that is not an address must
  still produce the old 404.**

`tests/a-link-is-a-door.mjs`. Add the case, do not start a new suite.

## The reading half

The extractor refuses per-site selectors on purpose: one for LinkedIn, one
for Indeed, one for each redesign, and nothing at all for the thousands of
other boards. It reads schema.org `JobPosting` first because Google Jobs
requires boards to publish it, then meta tags, then the densest text block,
and **each level says how sure it is** so the interface can warn.

What this repo has already paid for here:

- **The board declares the title, not the browser tab.** Reading the tab
  title gave the ad the site's name.
- **Furniture is not a requirement.** On a thin aggregated ad the extracted
  phrases were `000 gbp`, `days ago`, `apply now`, `company website`, the
  company name. A CV whose job title matched the ad word for word scored 7
  out of 100. Furniture is recognised by what it says: a sum, a date, an
  invitation to apply, an address, a legal form, never a skill.
- **Two jobs do not become one.** A page listing more than one posting.
- **Escaped markup is still markup.** Tags are stripped before entities are
  decoded, because LinkedIn writes `&lt;strong&gt;` inside its JobPosting
  block and the ad reached the model with the tags spelled out.

## One file, two runtimes

`extension/extract.js` runs **in the extension and in `app/api/annonce`**,
imported directly by the route. A change made for one runs in the other, and
the extension has no bundler: it is loaded as a plain script, so anything
you add has to survive that. Check both callers before you touch it.

## The extension's own rules

- **Fill, never send.** The person sends. This is what separates the product
  from the tools that promise fifty applications at once.
- **Only what they already said**, in a box whose meaning is beyond doubt.
  Never a password, a national insurance number, a date of birth, a salary,
  a notice period, right to work, diversity, or a cover letter. The repeated
  questions are answered once in Settings (`cvf_rep`) and repeated verbatim;
  an unanswered question stays empty.
- **Sponsorship is tested before right to work.** "Will you require
  sponsorship" contains both, and getting it the wrong way round inverts the
  answer.
- **The CV goes in the CV box and in no other.** A passport, a photo, a
  portfolio and a letter all take the same shape, and a CV dropped into one
  of them is worse than an empty box: the person does not see it and the
  employer gets the wrong paper. Where a neighbouring label bleeds into the
  CV box (Greenhouse puts the letter right under "Resume/CV"), the CV stays
  out.
- **A file input cannot be assigned.** Only a `DataTransfer` makes a
  `FileList`, which is the part that can only be proved in a browser.
- `host_permissions` is `thenuvi.com` alone, and `remplir.js` is injected on
  the open tab, on a click, and nowhere else.

`tests/the-extension-fills-the-form.mjs` holds both directions and checks
the form did not submit.

## How you verify

Against saved ad HTML on disk, never against a live board: a board that
changes overnight turns a real regression into "the test is flaky". For the
fetch guard, build a redirect chain, because a single URL proves the easy
half. Say which of the three extraction levels produced each field; a title
read from the densest text block and a title from JSON-LD are not the same
claim.
