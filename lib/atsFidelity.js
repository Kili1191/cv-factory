// Compare ce qu'un robot a lu dans le PDF a ce que le CV contient vraiment.
//
// C'est la mesure que personne d'autre ne peut faire. Les outils qui promettent
// un "score ATS" devinent : ils n'ont que le PDF. L'application, elle, detient
// le CV sous forme de donnees avant de fabriquer le fichier. On exporte, on
// relit le PDF avec un vrai analyseur, et on compare champ par champ. Le
// resultat n'est pas une opinion : soit le robot retrouve l'employeur, soit il
// ne le retrouve pas.
//
// Vocabulaire du rapport :
//   ok      le champ est retrouve tel quel
//   abime   le champ est present mais deforme (accents perdus, colle a un
//           autre champ, coupe)
//   perdu   le robot ne le retrouve pas du tout
//
// "perdu" est le cas grave : un recruteur qui cherche "Acme" dans son logiciel
// ne verra jamais ce candidat.

import { fold } from "./atsParser.js";

// Deux textes sont consideres identiques si leurs formes canoniques le sont.
function same(a, b) {
  return fold(a) === fold(b) && fold(a).length > 0;
}

// Le champ est present quelque part dans le texte, meme mal range.
function appearsIn(haystack, needle) {
  const n = fold(needle);
  return n.length > 0 && fold(haystack).includes(n);
}

function verdict(truth, got, wholeText) {
  if (!String(truth || "").trim()) return null; // rien a verifier
  if (same(truth, got)) return { state: "ok" };
  if (appearsIn(got, truth)) return { state: "abime", why: "present mais melange a un autre champ" };
  if (appearsIn(wholeText, truth)) {
    return { state: "abime", why: "present dans le document mais range dans le mauvais champ" };
  }
  return { state: "perdu", why: "introuvable dans le texte extrait" };
}

/**
 * @param {object} cv       le CV tel que l'application le detient
 * @param {object} parsed   la sortie de parseResume()
 * @param {string} rawText  le texte brut extrait du PDF
 */
export function compareToTruth(cv, parsed, rawText) {
  const checks = [];
  const add = (label, weight, v) => { if (v) checks.push({ label, weight, ...v }); };

  // Identite et contact : ce sur quoi un recruteur filtre en premier.
  add("nom", 3, verdict(cv.name, parsed.name, rawText));
  add("email", 3, verdict(cv.email, parsed.email, rawText));
  add("telephone", 2, verdict(
    (cv.phone || "").replace(/\s/g, ""),
    (parsed.phone || "").replace(/\s/g, ""),
    (rawText || "").replace(/\s/g, ""),
  ));
  add("lien LinkedIn", 1, verdict(cv.linkedin, parsed.linkedin, rawText));

  // L'intitule vise : un analyseur le cherche juste sous le nom.
  if (String(cv.title || "").trim()) {
    add("intitule", 2, appearsIn(rawText, cv.title)
      ? { state: "ok" }
      : { state: "perdu", why: "introuvable dans le texte extrait" });
  }

  // Experiences : employeur, intitule, periode. C'est ce qui decide d'un
  // rapprochement avec une offre.
  const expText = (parsed.experience || []).map(e => e.text + " " + e.bullets.join(" ")).join("\n");
  for (const exp of cv.experience || []) {
    if (exp.company) {
      add(`employeur "${exp.company}"`, 3, appearsIn(expText, exp.company)
        ? { state: "ok" }
        : appearsIn(rawText, exp.company)
          ? { state: "abime", why: "present, mais hors de la section experience" }
          : { state: "perdu", why: "introuvable" });
    }
    if (exp.title) {
      add(`poste "${exp.title}"`, 3, appearsIn(expText, exp.title)
        ? { state: "ok" }
        : appearsIn(rawText, exp.title)
          ? { state: "abime", why: "present, mais hors de la section experience" }
          : { state: "perdu", why: "introuvable" });
    }
    // Une periode illisible fait perdre le calcul d'anciennete.
    const years = String(exp.period || "").match(/(?:19|20)\d{2}/g) || [];
    if (years.length) {
      const found = (parsed.experience || []).some(e =>
        e.period && years.includes(e.period.start));
      add(`dates "${exp.period}"`, 2, found
        ? { state: "ok" }
        : { state: "perdu", why: "aucune periode reconnue pour ce poste : l'anciennete ne peut pas etre calculee" });
    }
  }

  // Formation.
  for (const ed of cv.education || []) {
    const edText = (parsed.education || []).map(e => e.text).join("\n");
    if (ed.school) {
      add(`ecole "${ed.school}"`, 2, appearsIn(edText, ed.school)
        ? { state: "ok" }
        : appearsIn(rawText, ed.school)
          ? { state: "abime", why: "present, mais hors de la section formation" }
          : { state: "perdu", why: "introuvable" });
    }
    if (ed.degree) {
      add(`diplome "${ed.degree}"`, 2, appearsIn(edText, ed.degree)
        ? { state: "ok" }
        : appearsIn(rawText, ed.degree)
          ? { state: "abime", why: "present, mais hors de la section formation" }
          : { state: "perdu", why: "introuvable" });
    }
  }

  // Competences : c'est la-dessus que portent les recherches par mots-cles.
  const skillText = (parsed.skills || []).join(" | ");
  for (const skill of (cv.skills || []).filter(s => String(s || "").trim())) {
    add(`competence "${skill}"`, 2, appearsIn(skillText, skill)
      ? { state: "ok" }
      : appearsIn(rawText, skill)
        ? { state: "abime", why: "presente, mais hors de la section competences : une recherche par mot-cle peut la manquer" }
        : { state: "perdu", why: "introuvable" });
  }

  for (const cert of (cv.certifications || []).filter(c => String(c || "").trim())) {
    add(`certification "${cert}"`, 1, appearsIn(rawText, cert)
      ? { state: "ok" } : { state: "perdu", why: "introuvable" });
  }

  // Les sections elles-memes : un analyseur qui ne trouve pas "Experience"
  // range tout dans un seul bloc et ne sait plus separer les postes.
  const expected = [];
  if ((cv.experience || []).length) expected.push("experience");
  if ((cv.education || []).length) expected.push("education");
  if ((cv.skills || []).filter(Boolean).length) expected.push("skills");
  for (const key of expected) {
    add(`section ${key}`, 2, (parsed.sectionsFound || []).includes(key)
      ? { state: "ok" }
      : { state: "perdu", why: "titre de section non reconnu : le contenu ne sera pas classe" });
  }

  const total = checks.reduce((s, c) => s + c.weight, 0) || 1;
  const earned = checks.reduce(
    (s, c) => s + (c.state === "ok" ? c.weight : c.state === "abime" ? c.weight * 0.5 : 0), 0);

  return {
    score: Math.round((earned / total) * 100),
    checks,
    lost: checks.filter(c => c.state === "perdu"),
    damaged: checks.filter(c => c.state === "abime"),
  };
}
