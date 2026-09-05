// Paper sizes the export offers, in millimetres, with the CSS page keyword
// Chromium understands. Shared by the print page and the route that prints
// it, so a page never claims a size the printer does not apply.
export const FORMATS = {
  a4: { largeur: 210, hauteur: 297, css: "A4", puppeteer: "A4" },
  letter: { largeur: 215.9, hauteur: 279.4, css: "letter", puppeteer: "Letter" },
  legal: { largeur: 215.9, hauteur: 355.6, css: "legal", puppeteer: "Legal" },
};

// The same floor as the picture export and the check before download: a
// sheet reduced below it is unreadable, and the check refuses it upstream.
export const FACTEUR_MIN = 0.85;
