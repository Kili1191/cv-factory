// THE CV AS A WORD FILE
//
// Recruiters and agencies ask for Word: they paste into their own
// template, their tracking software takes .docx as readily as PDF, and
// four of the builders people compare Nuvi with sell it. The PDF is the
// document; this is the same data written as a document Word opens.
//
// One column, always. The value of a Word file is that the recruiter can
// edit it, and a two-column table in Word is what breaks under their
// cursor. Headings are real Word headings (so navigation and their own
// styles apply), bullets are real list items (so they renumber and
// reflow), the contact line is one paragraph, and every font is named
// with a fallback Word has: a name Word does not know falls back to
// Calibri on its own, and the file still opens as written.
//
// Built in the browser with the docx library, loaded on demand: the
// 4.6 MB package is not part of any first load. No CDN, per the repo's
// rule: what the app needs to work comes from its own bundle.

const LABELS = {
  fr: { profile: "Profil", experience: "Experience", education: "Formation", skills: "Competences",
    languages: "Langues", certifications: "Certifications" },
  en: { profile: "Profile", experience: "Experience", education: "Education", skills: "Skills",
    languages: "Languages", certifications: "Certifications" },
};

function libelle(cv, cle, locale) {
  const perso = cv && cv.labels && cv.labels[cle];
  if (typeof perso === "string" && perso.trim()) return perso.trim();
  return (LABELS[locale === "en" ? "en" : "fr"])[cle] || cle;
}

function texte(v) { return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : ""; }
function liste(a) { return (Array.isArray(a) ? a : []).map(texte).filter(Boolean); }

// A CSS family stack ("'Inter', sans-serif") gives Word its first name,
// and a generic fallback so a machine without it stays legible.
function policeDe(pile, secours) {
  const premiere = String(pile || "").split(",")[0].replace(/['"]/g, "").trim();
  return premiere || secours;
}

/**
 * Build the .docx bytes for a CV. `theme` may carry hf/bf font stacks;
 * `locale` picks the default section labels. Returns a Blob in the
 * browser and a Buffer in Node, so the same function is tested without
 * a browser.
 */
export async function exporterEnDocx(cv, { locale = "fr", theme = {} } = {}) {
  const docx = await import("docx");
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, TabStopType, TabStopPosition } = docx;

  const corps = policeDe(theme.bf, "Calibri");
  const titres = policeDe(theme.hf, corps);
  const gris = "6B6660";
  // Word's own Heading 2 is blue. The CV's headings take the ink, so the
  // file looks like the product's documents and not like a memo.
  const encre = "14140F";

  const P = (children, opts = {}) => new Paragraph({ ...opts, children });
  const R = (text, opts = {}) => new TextRun({ text, font: corps, size: 21, ...opts });
  const H = (text) => new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 80 },
    children: [new TextRun({ text, font: titres, size: 22, bold: true, allCaps: true, characterSpacing: 20, color: encre })],
  });
  const puces = (items) => items.map((t) => new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 40 },
    children: [R(t)],
  }));

  const enfants = [];

  // Header: name, title, one contact line.
  enfants.push(new Paragraph({
    heading: HeadingLevel.TITLE,
    spacing: { after: 40 },
    children: [new TextRun({ text: texte(cv.name) || " ", font: titres, size: 44, bold: true, color: encre })],
  }));
  if (texte(cv.title)) {
    enfants.push(P([new TextRun({ text: texte(cv.title), font: corps, size: 24, color: gris })], { spacing: { after: 60 } }));
  }
  const contact = [cv.email, cv.phone, cv.location, cv.linkedin].map(texte).filter(Boolean);
  if (contact.length) {
    enfants.push(P([R(contact.join("  |  "), { size: 19, color: gris })], { spacing: { after: 160 } }));
  }

  if (texte(cv.summary)) {
    enfants.push(H(libelle(cv, "profile", locale)));
    enfants.push(P([R(texte(cv.summary))], { spacing: { after: 80 } }));
  }

  const exp = (Array.isArray(cv.experience) ? cv.experience : []).filter((e) => e && (texte(e.title) || texte(e.company)));
  if (exp.length) {
    enfants.push(H(libelle(cv, "experience", locale)));
    for (const e of exp) {
      // Title on the left, period on the right of the same line: a right
      // tab stop at the margin, the way Word users lay it out themselves.
      enfants.push(new Paragraph({
        spacing: { before: 120, after: 20 },
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: [
          new TextRun({ text: texte(e.title), font: corps, size: 22, bold: true }),
          ...(texte(e.period) ? [new TextRun({ text: "\t" + texte(e.period), font: corps, size: 19, color: gris })] : []),
        ],
      }));
      const ou = [texte(e.company), texte(e.location)].filter(Boolean).join(", ");
      if (ou) enfants.push(P([R(ou, { italics: true, color: gris, size: 20 })], { spacing: { after: 40 } }));
      enfants.push(...puces(liste(e.bullets)));
    }
  }

  const edu = (Array.isArray(cv.education) ? cv.education : []).filter((e) => e && (texte(e.degree) || texte(e.school)));
  if (edu.length) {
    enfants.push(H(libelle(cv, "education", locale)));
    for (const e of edu) {
      enfants.push(new Paragraph({
        spacing: { before: 80, after: 20 },
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: [
          new TextRun({ text: texte(e.degree), font: corps, size: 22, bold: true }),
          ...(texte(e.period) ? [new TextRun({ text: "\t" + texte(e.period), font: corps, size: 19, color: gris })] : []),
        ],
      }));
      if (texte(e.school)) enfants.push(P([R(texte(e.school), { italics: true, color: gris, size: 20 })], { spacing: { after: 40 } }));
    }
  }

  const skills = liste(cv.skills);
  if (skills.length) {
    enfants.push(H(libelle(cv, "skills", locale)));
    enfants.push(P([R(skills.join("  |  "))], { spacing: { after: 80 } }));
  }

  const langues = (Array.isArray(cv.languages) ? cv.languages : [])
    .map((l) => (l && typeof l === "object") ? [texte(l.lang), texte(l.level)].filter(Boolean).join(": ") : texte(l))
    .filter(Boolean);
  if (langues.length) {
    enfants.push(H(libelle(cv, "languages", locale)));
    enfants.push(P([R(langues.join("  |  "))], { spacing: { after: 80 } }));
  }

  const certifs = liste(cv.certifications);
  if (certifs.length) {
    enfants.push(H(libelle(cv, "certifications", locale)));
    enfants.push(...puces(certifs));
  }

  const document = new Document({
    creator: "Nuvi",
    title: texte(cv.name) || "CV",
    styles: {
      default: { document: { run: { font: corps, size: 21 } } },
    },
    sections: [{
      properties: { page: { margin: { top: 1000, right: 1100, bottom: 1000, left: 1100 } } },
      children: enfants,
    }],
  });

  if (typeof window !== "undefined" && typeof Blob !== "undefined") {
    return Packer.toBlob(document);
  }
  return Packer.toBuffer(document);
}

/** A file name from the person's name, ASCII only, for the download. */
export function nomDuFichierDocx(cv) {
  const base = texte(cv && cv.name).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return "CV_" + (base || "Nuvi") + ".docx";
}
