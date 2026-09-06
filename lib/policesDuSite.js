// The fonts every page of the site loads from Google, in one place.
//
// app/layout.jsx puts this URL in a <link> for the screen. The print route
// (app/api/pdf) needs the same families for the PDF, but NOT this URL as
// is: Google serves variable fonts to a modern Chrome, and Chromium's PDF
// writer cannot embed a variable font. It draws each glyph as an outline
// (a "Type 3" font, no font file in the PDF) and text extractors then lose
// whole lines: measured, the e-mail and the phone vanished from the text
// the ATS engines read. The route asks Google for the same families with a
// legacy user agent, gets static instances, and Chromium embeds those as
// ordinary TrueType. See cssDesPolices in the route.
//
// The italic stays: it is used 59 times in the product, and a real drawn
// italic is not replaced by a mechanical slant. A suite checks it.
export const POLICES_DU_SITE =
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,wght,SOFT"
  + "@0,300..900,30..100;1,300..900,30..100"
  + "&family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800"
  + ";1,300;1,400;1,500;1,600;1,700;1,800"
  + "&family=DM+Serif+Display:ital@0;1&display=swap";

// The user agent that makes Google Fonts answer with static instances, one
// file per weight, instead of one variable file per family. Firefox 40
// predates variable fonts; the woff2 it gets are the same glyphs.
export const UA_POLICES_STATIQUES =
  "Mozilla/5.0 (Windows NT 6.1; rv:40.0) Gecko/20100101 Firefox/40.0";
