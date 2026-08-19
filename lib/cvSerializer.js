function safeStr(s) {
  if (s === null || s === undefined) return "";
  if (typeof s === "object") return "";
  return String(s).trim();
}

// Construit "2020 - 2023" / "2020 - Present" / "" selon ce qui est renseigne.
// Ne renvoie JAMAIS un residu du genre " - Present" quand aucune date n'existe.
function buildPeriod(item, openEndedLabel) {
  const explicit = safeStr(item.period);
  if (explicit) return explicit;
  const start = safeStr(item.startDate);
  const end = safeStr(item.endDate);
  if (start && end) return `${start} - ${end}`;
  if (start) return openEndedLabel ? `${start} - ${openEndedLabel}` : start;
  if (end) return end;
  return "";
}

export function serializeCvForContext(cv) {
  if (!cv || typeof cv !== "object") return "";

  const lines = [];

  const name =
    safeStr(cv.fullName) ||
    `${safeStr(cv.firstName)} ${safeStr(cv.lastName)}`.trim() ||
    safeStr(cv.name);
  if (name) lines.push(`Name: ${name}`);

  const title = safeStr(cv.headline) || safeStr(cv.title);
  if (title) lines.push(`Title: ${title}`);

  if (safeStr(cv.email)) lines.push(`Email: ${safeStr(cv.email)}`);
  if (safeStr(cv.phone)) lines.push(`Phone: ${safeStr(cv.phone)}`);
  if (safeStr(cv.location)) lines.push(`Location: ${safeStr(cv.location)}`);
  if (safeStr(cv.linkedin)) lines.push(`LinkedIn: ${safeStr(cv.linkedin)}`);

  if (safeStr(cv.summary)) {
    lines.push("");
    lines.push(`Summary: ${safeStr(cv.summary)}`);
  }

  const experiences = cv.experiences || cv.experience;
  if (Array.isArray(experiences)) {
    const expLines = [];
    for (const exp of experiences) {
      if (!exp || typeof exp !== "object") continue;
      const role = safeStr(exp.role) || safeStr(exp.title);
      const company = safeStr(exp.company);
      const period = buildPeriod(exp, "Present");
      const location = safeStr(exp.location);
      const head = [role, company, location, period].filter(Boolean).join(" | ");
      if (!head) continue;
      expLines.push(`- ${head}`);
      const bullets = Array.isArray(exp.bullets)
        ? exp.bullets.map(safeStr).filter(Boolean)
        : [];
      if (bullets.length > 0) {
        for (const b of bullets) expLines.push(`  * ${b}`);
      } else if (safeStr(exp.description)) {
        expLines.push(`  ${safeStr(exp.description)}`);
      }
    }
    if (expLines.length > 0) {
      lines.push("");
      lines.push("EXPERIENCES:");
      lines.push(...expLines);
    }
  }

  if (Array.isArray(cv.education)) {
    const eduLines = [];
    for (const edu of cv.education) {
      if (!edu || typeof edu !== "object") continue;
      const degree = safeStr(edu.degree) || safeStr(edu.title);
      const school = safeStr(edu.school) || safeStr(edu.institution);
      const period = buildPeriod(edu, "");
      const head = [degree, school, period].filter(Boolean).join(" | ");
      if (!head) continue;
      eduLines.push(`- ${head}`);
    }
    if (eduLines.length > 0) {
      lines.push("");
      lines.push("EDUCATION:");
      lines.push(...eduLines);
    }
  }

  if (Array.isArray(cv.skills)) {
    const skills = cv.skills
      .map(s => (typeof s === "string" ? safeStr(s) : safeStr(s && (s.name || s.label))))
      .filter(Boolean)
      .join(", ");
    if (skills) {
      lines.push("");
      lines.push(`SKILLS: ${skills}`);
    }
  }

  if (Array.isArray(cv.languages)) {
    const langs = cv.languages
      .map((l) => {
        if (typeof l === "string") return safeStr(l);
        if (!l || typeof l !== "object") return "";
        const label = safeStr(l.lang) || safeStr(l.name);
        if (!label) return "";
        const level = safeStr(l.level);
        return level ? `${label} (${level})` : label;
      })
      .filter(Boolean)
      .join(", ");
    if (langs) lines.push(`LANGUAGES: ${langs}`);
  }

  if (Array.isArray(cv.certifications)) {
    const certs = cv.certifications
      .map((c) => {
        if (typeof c === "string") return safeStr(c);
        if (!c || typeof c !== "object") return "";
        return safeStr(c.name) || safeStr(c.title) || safeStr(c.label);
      })
      .filter(Boolean)
      .join(", ");
    if (certs) lines.push(`CERTIFICATIONS: ${certs}`);
  }

  return lines.join("\n").slice(0, 10000);
}
