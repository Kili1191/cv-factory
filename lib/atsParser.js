// Un analyseur de CV, du meme type que celui qui tourne dans un ATS.
//
// POURQUOI IL EXISTE
//
// Un ATS ne "lit" pas un CV. Il en extrait le texte avec une bibliotheque
// (PDFBox, poppler), puis un analyseur decoupe ce texte en champs : nom,
// contact, experiences, formation, competences. C'est cette deuxieme etape qui
// ecarte des candidatures sans que personne ne s'en apercoive : si l'employeur
// atterrit dans le champ "intitule de poste", la recherche du recruteur ne
// trouve rien, et le CV n'apparait jamais dans ses resultats.
//
// CE QU'IL FAIT, ET CE QU'IL NE FAIT PAS
//
// Il reproduit l'etape de structuration, celle qui est objectivement juste ou
// fausse : on connait la verite, puisque l'application detient le CV sous
// forme de donnees avant de fabriquer le PDF. On peut donc exporter, relire le
// fichier comme un robot, et comparer champ par champ.
//
// Il ne reproduit PAS le classement, les mots-cles ponderes ni les questions
// eliminatoires. Ces regles changent d'un editeur a l'autre, souvent d'un
// client a l'autre, et les inventer ne prouverait que nos propres hypotheses.
// Un score invente rassurerait sans rien garantir.
//
// Les heuristiques ci-dessous sont volontairement proches de celles d'un vrai
// analyseur, y compris dans leurs faiblesses : c'est le but. Si notre CV les
// met en defaut, il mettra aussi en defaut le leur.

// --- Vocabulaire des titres de section, francais et anglais ----------------
const SECTION_WORDS = {
  summary: ["profil", "resume", "a propos", "about", "summary", "objectif", "objective"],
  experience: [
    "experience", "experiences", "experience professionnelle",
    "experiences professionnelles", "parcours", "parcours professionnel",
    "work experience", "professional experience", "employment",
  ],
  education: [
    "formation", "formations", "education", "diplomes", "diplome",
    "academic", "etudes", "scolarite",
  ],
  skills: [
    "competences", "competence", "skills", "technical skills", "expertise",
    "savoir-faire", "technologies",
  ],
  languages: ["langues", "langue", "languages", "language"],
  certifications: [
    "certifications", "certification", "certificats", "certificat",
    "licenses", "accreditations",
  ],
};

// Accents retires, minuscules, espaces normalises : un analyseur compare des
// formes canoniques, pas le texte tel qu'il est imprime.
export function fold(s) {
  return String(s == null ? "" : s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
// Numeros internationaux et nationaux, avec espaces, points ou tirets.
const PHONE_RE = /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{1,4}\)[\s.-]?)?\d(?:[\s.-]?\d){7,13}/;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/[^\s,;]+/i;
// Une periode : "2021 - 2024", "01/2021 - present", "mars 2021 - aujourd'hui".
const YEAR_RE = /(?:19|20)\d{2}/;
const PRESENT_WORDS = ["present", "aujourd'hui", "aujourdhui", "current", "now", "en cours"];

// Un titre de section est court, souvent seul sur sa ligne, et correspond a un
// mot du vocabulaire. On exige la ligne entiere : "Experience" est un titre,
// "8 ans d'experience produit" ne l'est pas.
function sectionOf(line) {
  const f = fold(line).replace(/[:.•|]+$/g, "").trim();
  if (!f || f.length > 42) return null;
  for (const [key, words] of Object.entries(SECTION_WORDS)) {
    if (words.includes(f)) return key;
  }
  return null;
}

// Le nom du candidat. Les analyseurs le cherchent en tete de document : c'est
// la convention, et c'est pour cela que l'ordre d'ecriture du PDF compte tant.
// On prend la premiere ligne qui ressemble a un nom propre et ne contient ni
// arobase, ni chiffre, ni titre de section.
function findName(lines) {
  for (const line of lines.slice(0, 6)) {
    const t = line.trim();
    if (!t || t.length > 60) continue;
    if (EMAIL_RE.test(t) || /\d/.test(t)) continue;
    if (sectionOf(t)) continue;
    const words = t.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 5) continue;
    // Au moins deux mots commencant par une majuscule.
    const capitalised = words.filter(w => /^[A-ZÀ-ÖØ-Þ]/.test(w)).length;
    if (capitalised >= 2) return t;
  }
  return "";
}

// Decoupe le texte en sections a partir des titres reconnus.
export function splitSections(lines) {
  const sections = { header: [] };
  let current = "header";
  for (const line of lines) {
    const key = sectionOf(line);
    if (key) { current = key; if (!sections[key]) sections[key] = []; continue; }
    if (!sections[current]) sections[current] = [];
    sections[current].push(line);
  }
  return sections;
}

// Extrait une periode d'une ligne : deux annees, ou une annee et un mot qui
// veut dire "toujours en poste".
function periodOf(line) {
  const f = fold(line);
  const years = f.match(new RegExp(YEAR_RE.source, "g")) || [];
  const open = PRESENT_WORDS.some(w => f.includes(w));
  if (years.length >= 2) return { start: years[0], end: years[years.length - 1] };
  if (years.length === 1 && open) return { start: years[0], end: "present" };
  if (years.length === 1) return { start: years[0], end: years[0] };
  return null;
}

// Une entree d'experience : intitule, employeur, periode. Les analyseurs
// s'appuient sur la ligne qui porte les dates pour delimiter chaque poste,
// puis lisent autour. On fait pareil.
function parseEntries(lines) {
  const entries = [];
  let current = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const period = periodOf(line);
    // Une puce n'ouvre jamais un poste : c'est une realisation.
    const isBullet = /^[•‣▪\-*•·]\s*/.test(raw);
    if (period && !isBullet) {
      current = { lines: [line], period, bullets: [] };
      entries.push(current);
      continue;
    }
    if (!current) { current = { lines: [line], period: null, bullets: [] }; entries.push(current); continue; }
    if (isBullet) current.bullets.push(line.replace(/^[•‣▪\-*•·]\s*/, "").trim());
    else current.lines.push(line);
  }
  // Dans chaque entree, la ligne la plus longue sans dates est en general
  // l'intitule ou l'employeur ; on garde le texte brut pour la comparaison.
  return entries.map(e => ({
    period: e.period,
    text: e.lines.join(" ").replace(/\s+/g, " ").trim(),
    bullets: e.bullets,
  }));
}

// Une liste de competences, ecrite en ligne ou en colonne, separee par des
// virgules, des points medians ou des puces.
function parseList(lines) {
  const out = [];
  for (const raw of lines) {
    const line = raw.replace(/^[•‣▪\-*•·]\s*/, "").trim();
    if (!line) continue;
    for (const part of line.split(/[,;|•·]|\s{3,}/)) {
      const t = part.trim();
      if (t) out.push(t);
    }
  }
  return out;
}

/**
 * Analyse le texte brut d'un CV comme le ferait un ATS.
 * @param {string} rawText texte extrait du PDF
 * @returns {object} champs structures + sections reconnues
 */
export function parseResume(rawText) {
  const lines = String(rawText == null ? "" : rawText)
    .split("\n")
    .map(l => l.replace(/ /g, " ").replace(/[ \t]+/g, " ").trim())
    .filter(l => l.length > 0);

  const whole = lines.join("\n");
  const sections = splitSections(lines);

  const email = (whole.match(EMAIL_RE) || [""])[0];
  const linkedin = (whole.match(LINKEDIN_RE) || [""])[0];
  // Le telephone est cherche hors de la ligne d'e-mail pour eviter d'attraper
  // une suite de chiffres qui n'en est pas un.
  let phone = "";
  for (const line of lines) {
    if (EMAIL_RE.test(line) && !PHONE_RE.test(line.replace(EMAIL_RE, ""))) continue;
    const m = line.replace(EMAIL_RE, "").match(PHONE_RE);
    if (m && (m[0].replace(/\D/g, "").length >= 9)) { phone = m[0].trim(); break; }
  }

  return {
    name: findName(lines),
    email,
    phone,
    linkedin,
    summary: (sections.summary || []).join(" ").trim(),
    experience: parseEntries(sections.experience || []),
    education: parseEntries(sections.education || []),
    skills: parseList(sections.skills || []),
    languages: parseList(sections.languages || []),
    certifications: parseList(sections.certifications || []),
    sectionsFound: Object.keys(sections).filter(k => k !== "header" && (sections[k] || []).length),
    lineCount: lines.length,
  };
}
