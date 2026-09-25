---
name: ats
description: The exported document, read the way sorting software reads it. Use for anything touching app/api/pdf, app/imprimer, the CV templates, the Word export, or CV import. Knows the five extraction engines and the specific ways this repo has lost text in a PDF.
tools: Read, Grep, Glob, Bash
model: opus
---

The promise is one sentence: the CV must get past the recruiters' sorting
software. Everything here follows from it, and "it looks right on screen" has
been wrong every single time.

## What the engines do differently, and why there are five

`poppler`, `MuPDF`, `Tika` (PDFBox) and `pdf.js` disagree, and that
disagreement is the point. A reading-order bug was visible **only** to PDFBox:
the other two reorder text by position and hid it. Tika only runs with
`TIKA_JAR` set, and without it declares itself not run rather than being
skipped silently. `tesseract` reads the rendered image.

Measured facts this repo paid for:

- **Two columns cannot be fixed by rendering.** Printed natively, the
  two-column templates read 100% in flow order but fall to 97/86/92% by
  position and 86/86/56% under pdf.js sorted, which is how some ATS work. A
  heading or a date shares its line with the other column. It is geometry,
  not rendering. The picture plus a written layer holds 100% on all five, and
  that is why it stays.
- **Chromium cannot embed a variable font.** It draws every glyph as an
  outline (Type 3, no font file) and extractors lose whole lines: the email
  and the phone disappeared. The route asks Google for static instances with
  a pre-variable user agent and inlines them as `data:`.
- **Contextual alternates break numbers.** Inter replaces `+` and `-` next to
  a digit with variants that have no Unicode mapping, and pdf.js read
  "33 6 12 34 56 78".
- **Paint order is not reading order.** CSS paints positioned elements after
  in-flow text, so timeline jobs came out after the languages. PDFBox reads
  the stream as-is: 81%. The print page positions everything in tree order.
- **Chromium version matters.** Build 1194 (141) from Playwright 1.56 is what
  CI runs. The 131 from Playwright 1.49 emitted Type 3 even for static fonts
  and the extracted text fell to 8%. Measure what CI executes.
- **The file must carry no trace of the tool.** `/Info` had `Nuvi - the CV
  that gets past the ATS` as Title and `HeadlessChrome` as Creator, on the
  candidate's document. The agent is forced on Chromium's command line;
  `page.setUserAgent()` goes through the network layer and the print engine
  never sees it.

## How you verify

Never by eye. Extract, and say which engine said what. The suites that
already do this are `the-pdf-is-real-text`, `export-pdf-is-machine-readable`,
`ats-parsers-read-the-cv`, `the-invisible-layer-matches-the-page`,
`the-pdf-carries-no-trace-of-nuvi` and `an-old-download-is-read-whole`. Read
them before writing a new one; the case is usually already covered.

`GET /api/pdf` says from a browser whether the function's Chromium starts.
The photo fallback hides any breakage of that route, from the person
downloading and from the person maintaining it.

## Word

`lib/exporterEnDocx.js`: one column, real headings, real list items, named
fonts, never a table. A Word file is worth what a recruiter can edit in it,
and a table breaks under their cursor. CI opens it with LibreOffice Writer
and prints it. `libreoffice-core` alone is not enough: `soffice` launches,
refuses a valid `.docx`, and exits 0.
