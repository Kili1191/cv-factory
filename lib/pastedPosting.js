// What arrives in the box when someone pastes a job posting.
//
// THE DEFECT THIS FIXES
//
// Indeed, LinkedIn and most job boards render their postings with non
// breaking spaces and HTML entities. Selecting the text in the browser and
// copying it does NOT always give you the rendered characters: pasting into a
// plain textarea regularly lands the raw source, and the person then reads
// "&nbsp;" on three lines of their own screen, inside the field that is
// supposed to hold the job they want. It looks broken because it is: those
// six characters also reach the model, which spends attention on them.
//
// So the paste is cleaned once, at the door, rather than defended against in
// every prompt downstream.
//
// WHAT IT DOES NOT DO
//
// It does not summarise, truncate or reorder. The posting is the person's
// material and the product's promise is that it reads all of it. This only
// turns markup back into the characters it stands for, and settles the
// whitespace a copy from a web page always brings.

// The entities a job board actually produces. A general HTML decoder would
// need the full named table; a posting is prose, and prose uses these.
const ENTITES = [
  [/&nbsp;/gi, " "],
  [/&amp;/gi, "&"],
  [/&lt;/gi, "<"],
  [/&gt;/gi, ">"],
  [/&quot;/gi, '"'],
  [/&#0*39;|&apos;|&#x0*27;/gi, "'"],
  [/&rsquo;|&#8217;|&#x2019;/gi, "’"],
  [/&lsquo;|&#8216;/gi, "‘"],
  [/&ldquo;|&#8220;/gi, "“"],
  [/&rdquo;|&#8221;/gi, "”"],
  [/&hellip;|&#8230;/gi, "..."],
  // LES DEUX TIRETS LONGS DEVIENNENT UN TIRET SIMPLE
  //
  // Les sites d'emploi separent volontiers l'intitule de la ville par un
  // demi-cadratin. Le decoder fidelement le ferait entrer dans le champ, dans
  // la consigne, et de la dans le CV : exactement la signature que le produit
  // promet de ne jamais porter. On les ramene donc au tiret simple des la
  // porte, la ou tout le reste du texte colle est deja normalise.
  [/&ndash;|&#8211;|&#x2013;/gi, "-"],
  [/&mdash;|&#8212;|&#x2014;/gi, "-"],
  [/&bull;|&#8226;/gi, "•"],
  [/&eacute;/gi, "é"], [/&egrave;/gi, "è"],
  [/&agrave;/gi, "à"], [/&ccedil;/gi, "ç"],
  [/&ecirc;/gi, "ê"], [/&ocirc;/gi, "ô"],
  [/&ugrave;/gi, "ù"], [/&icirc;/gi, "î"],
];

// Numeric entities the table above did not name. Decimal and hexadecimal
// both, because boards emit both. Anything outside the printable range is
// dropped rather than turned into a control character.
function entitesNumeriques(s) {
  return s.replace(/&#(x?)([0-9a-f]+);/gi, (tout, hex, num) => {
    const code = parseInt(num, hex ? 16 : 10);
    if (!Number.isFinite(code) || code < 9 || code > 0x10ffff) return tout;
    try { return String.fromCodePoint(code); } catch { return tout; }
  });
}

export function nettoyerLAnnonce(brut) {
  let s = String(brut == null ? "" : brut);

  // A posting copied from a rendered page sometimes carries its own tags,
  // when the person copied from the page source or a rich field. Turning
  // block tags into line breaks first keeps the posting's shape; the rest
  // goes away silently.
  s = s.replace(/<\s*(br|\/p|\/div|\/li|\/tr|\/h[1-6])\s*\/?\s*>/gi, "\n");
  s = s.replace(/<\s*li[^>]*>/gi, "\n- ");
  s = s.replace(/<[^>]{0,400}>/g, "");

  for (const [re, par] of ENTITES) s = s.replace(re, par);
  s = entitesNumeriques(s);

  // Les memes deux tirets, quand ils arrivent en vrais caracteres et non en
  // entites : un copier-coller depuis une page rendue les emporte tels quels.
  s = s.replace(/[\u2013\u2014]/g, "-");

  // The real non breaking space, and the thin and zero width relatives that
  // ride along with a copy from a styled page. They measure as characters,
  // so a field that looks empty can hold two hundred of them.
  s = s.replace(/[   ]/g, " ");
  s = s.replace(/[​‌‍﻿]/g, "");

  // Windows and old boards both send carriage returns.
  s = s.replace(/\r\n?/g, "\n");
  // Trailing spaces on every line, and three blank lines down to one. The
  // paragraph breaks stay: a posting reads by its sections.
  s = s.replace(/[ \t]+$/gm, "");
  s = s.replace(/\n{3,}/g, "\n\n");
  s = s.replace(/[ \t]{2,}/g, " ");

  return s.trim();
}

// Does this hold enough to aim at? The threshold is deliberately low: the
// point is to refuse three words pasted by accident, not to judge the
// posting. Boards publish short adverts and those people deserve a CV too.
export const ANNONCE_MINIMUM = 40;

export function annonceSuffisante(texte) {
  return nettoyerLAnnonce(texte).length >= ANNONCE_MINIMUM;
}
