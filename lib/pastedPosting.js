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

// CE NETTOYAGE NE S'APPLIQUE QU'UNE FOIS, ET C'EST VOULU
//
// Il n'est pas idempotent, et il ne peut pas l'etre. Il fait deux choses qui
// se contredisent sur un second passage : il retire les balises, et il decode
// les entites, dont &lt; et &gt; qui redonnent des chevrons. Une annonce qui
// contient litteralement "&lt;b&gt;" rend "<b>" au premier passage, que le
// second prendrait pour une balise et effacerait.
//
// On nettoie donc UNE fois, a la porte : au collage, au depot d'un fichier,
// au moment ou le texte entre dans un champ. Ce qui est deja dans un champ a
// deja ete nettoye, et le repasser une seconde fois grignoterait du contenu
// sans que personne ne le voie. Aucune fonction en aval ne doit le rappeler
// "par securite" : ici, la securite consiste a ne pas y toucher deux fois.

// Does this hold enough to aim at? The threshold is deliberately low: the
// point is to refuse three words pasted by accident, not to judge the
// posting. Boards publish short adverts and those people deserve a CV too.
export const ANNONCE_MINIMUM = 40;

export function annonceSuffisante(texte) {
  return nettoyerLAnnonce(texte).length >= ANNONCE_MINIMUM;
}

// UN LIEN N'EST PAS UNE ANNONCE
//
// Kilian, le 2 octobre 2026 : il colle l'adresse d'une offre Indeed dans le
// champ et lance l'adaptation. Le champ ne voyait qu'un texte de plus de
// quarante caracteres, donc l'adresse est partie au modele telle quelle. Un
// modele ne navigue pas : il a rendu un intitule qui disait
// "Not retrievable from the provided Indeed link (page content
// inaccessible)", et la couverture a compte les mots de l'URL. Zero sur 6.
//
// Le pire n'est pas l'echec, c'est qu'il a produit un resultat. Un panneau
// rempli, un chiffre, une liste de mots manquants, tous bati sur une phrase
// d'erreur. Rien a l'ecran ne disait que l'annonce n'avait jamais ete lue.
//
// On reconnait donc le lien a la porte. Le seuil de six mots laisse passer
// "voici l'annonce : https://..." comme un lien (c'est bien un lien que la
// personne colle), et traite une vraie annonce qui contient une adresse en
// bas de page comme une annonce.
const MOTS_AUTOUR_MAX = 6;

export function lienDedans(texte) {
  const propre = nettoyerLAnnonce(texte);
  const trouve = propre.match(/https?:\/\/[^\s<>"']+|(?:^|\s)www\.[^\s<>"']+/i);
  if (!trouve) return null;
  const lien = trouve[0].trim().replace(/[.,;:)\]]+$/, "");
  const reste = propre.replace(trouve[0], " ").trim();
  const mots = reste ? reste.split(/\s+/).filter(Boolean).length : 0;
  if (mots > MOTS_AUTOUR_MAX) return null;
  return /^https?:\/\//i.test(lien) ? lien : "https://" + lien;
}

// Les sites qui refusent un serveur, mesure plutot que suppose : Indeed
// repond 401 avec une page de detection de robot qui renvoie vers son
// ecran de connexion, quel que soit l'agent declare. LinkedIn et Glassdoor
// font la meme chose. Aucune adresse de serveur ne lira ces pages, jamais,
// et promettre le contraire fait perdre une tentative a la personne. Ce
// qui marche sur ces sites, c'est le navigateur de la personne, ou elle est
// deja passee : c'est exactement ce que fait l'extension.
const MURS = /(^|\.)(indeed\.[a-z.]+|linkedin\.com|glassdoor\.[a-z.]+|ziprecruiter\.[a-z.]+)$/i;

export function hoteQuiRefuseUnServeur(lien) {
  try {
    const h = new URL(lien).hostname;
    return MURS.test(h) ? h.replace(/^www\./i, "") : null;
  } catch {
    return null;
  }
}
