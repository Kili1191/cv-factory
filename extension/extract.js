// Lecture d'une annonce depuis la page ou l'utilisateur se trouve.
//
// POURQUOI PAS DES SELECTEURS PAR SITE
//
// Ecrire un selecteur pour LinkedIn, un pour Indeed, un pour Welcome to the
// Jungle, c'est signer pour les reparer chacun a chaque refonte, et n'avoir
// rien du tout sur les milliers d'autres sites d'emploi.
//
// La plupart des sites d'annonces publient deja leurs offres en donnees
// structurees schema.org "JobPosting", parce que Google Jobs l'exige pour les
// referencer. C'est donc le format le plus fiable et le plus universel
// disponible, et il se lit sans connaitre le site.
//
// Trois niveaux, du plus sur au plus approximatif :
//   1. JSON-LD JobPosting  intitule, entreprise, lieu, description, tout est
//                          nomme. Aucune devinette.
//   2. balises meta        og:title et consorts, quand le site les remplit.
//   3. le texte de la page le bloc le plus dense, en dernier recours.
//
// Chaque niveau dit d'ou vient ce qu'il rend, pour que l'interface puisse
// prevenir quand la lecture est approximative.

// MARKUP THAT ARRIVES ESCAPED IS STILL MARKUP
//
// Tags are removed before entities are decoded, so a board that writes its
// description with the angle brackets escaped ("&lt;strong&gt;") hands back
// text with the tags spelled out. LinkedIn does exactly this inside its
// JobPosting block, and the ad reached the model as
// "<strong>Company Description<br><br></strong>Cint is ...".
//
// A second pass, once and only over real tag names, clears it. Once, because
// a loop here is a loop on a stranger's page; real tag names, because "a
// budget < 50 > the last one" is a sentence and not an element.
const UNE_BALISE = /<\/?[a-z][a-z0-9]*(?:\s[^<>]*)?\/?>/gi;

export function stripTags(html) {
  const texte = String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"');
  const propre = UNE_BALISE.test(texte)
    ? texte.replace(UNE_BALISE, (m) => (/^<br/i.test(m) ? "\n" : " "))
    : texte;
  return propre.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function firstString(...values) {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

// schema.org autorise plusieurs formes pour un meme champ : un objet, un
// tableau, une chaine. On accepte les trois plutot que de supposer.
function nameOf(node) {
  if (!node) return "";
  if (typeof node === "string") return node.trim();
  if (Array.isArray(node)) return nameOf(node[0]);
  if (typeof node === "object") return firstString(node.name, node.legalName, node.title);
  return "";
}

function placeOf(node) {
  if (!node) return "";
  if (Array.isArray(node)) return placeOf(node[0]);
  if (typeof node === "string") return node.trim();
  const addr = node.address || node;
  if (typeof addr === "string") return addr.trim();
  if (addr && typeof addr === "object") {
    return [addr.addressLocality, addr.addressRegion, addr.addressCountry]
      .map(x => (typeof x === "string" ? x : nameOf(x)))
      .filter(Boolean).join(", ");
  }
  return "";
}

// Deroule les formes imbriquees : @graph, tableaux, objets uniques.
function flattenNodes(parsed) {
  const out = [];
  const walk = (n) => {
    if (!n) return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (typeof n !== "object") return;
    if (Array.isArray(n["@graph"])) n["@graph"].forEach(walk);
    out.push(n);
  };
  walk(parsed);
  return out;
}

export function fromJsonLd(blocks) {
  for (const raw of blocks || []) {
    let parsed;
    // A caller that already has the object hands it over as it is. The
    // browser side collects textContent, so both shapes reach here, and a
    // JSON.parse on an object throws instead of saying so: the block then
    // disappears and the caller only sees a poorer reading. Accepting both
    // costs one test and removes the whole class of failure.
    if (raw && typeof raw === "object") parsed = raw;
    else { try { parsed = JSON.parse(raw); } catch { continue; } }
    for (const node of flattenNodes(parsed)) {
      const type = node["@type"];
      const isJob = type === "JobPosting"
        || (Array.isArray(type) && type.includes("JobPosting"));
      if (!isJob) continue;
      const description = stripTags(node.description);
      if (!description) continue;
      return {
        title: firstString(node.title, nameOf(node)),
        company: nameOf(node.hiringOrganization),
        location: placeOf(node.jobLocation),
        description,
        confidence: "high",
        via: "JobPosting",
      };
    }
  }
  return null;
}

// A PAGE TITLE THAT NAMES THE PAGE AND NOT THE JOB
//
// NHS Jobs titles every advert page "Job Advert", so every NHS application
// was filed under that one name and the tracker could not tell two apart,
// while the job's own name sat in the heading right above the ad. These are
// labels for a kind of page, never a job: when one is all the page offers,
// the heading is the better answer.
const TITRE_DE_PAGE = /^(job advert|job advert details|job description|job details|job vacancy|vacancy|vacancy details|job|careers?|job posting)$/i;

export function fromMeta(meta, bodyText, h1) {
  const declare = firstString(meta["og:title"], meta.title);
  const titre = String(h1 || "").trim();
  const title = TITRE_DE_PAGE.test(declare) && titre ? titre : declare;
  const text = String(bodyText || "").trim();
  if (!title || text.length < 400) return null;
  return {
    title,
    company: firstString(meta["og:site_name"]),
    location: "",
    description: text.slice(0, 12000),
    confidence: "low",
    via: "page",
  };
}

/**
 * @param {{ jsonLd?: string[], meta?: object, bodyText?: string, h1?: string }} page
 */
export function extractJob(page) {
  const found = fromJsonLd(page.jsonLd)
    || fromMeta(page.meta || {}, page.bodyText, page.h1);
  if (!found) return null;
  // Une annonce de trois lignes n'est pas exploitable pour adapter un CV.
  // Le seuil vaut ce qu'il mesure : une vraie annonce fait plusieurs milliers
  // de caracteres, un resume de resultat de recherche en fait deux cents. En
  // dessous de quatre cents on a capture un extrait, pas une annonce, et le
  // dire vaut mieux que rendre quelque chose d'inutilisable.
  if (found.description.length < 400) {
    return { ...found, confidence: "low", tooShort: true };
  }
  return found;
}
