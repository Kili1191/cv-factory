function safeStr(s) {
  if (s === null || s === undefined) return "";
  return String(s).trim();
}

export function serializeCvForContext(cv) {
  if (!cv || typeof cv !== "object") return "";

  const lines = [];

  const name =
    safeStr(cv.fullName) ||
    `${safeStr(cv.firstName)} ${safeStr(cv.lastName)}`.trim() ||
    safeStr(cv.name);
  if (name) lines.push(`Name: ${name}`);

  if (cv.headline || cv.title) {
    lines.push(`Title: ${safeStr(cv.headline || cv.title)}`);
  }

  if (cv.email) lines.push(`Email: ${safeStr(cv.email)}`);
  if (cv.phone) lines.push(`Phone: ${safeStr(cv.phone)}`);
  if (cv.location) lines.push(`Location: ${safeStr(cv.location)}`);
  if (cv.linkedin) lines.push(`LinkedIn: ${safeStr(cv.linkedin)}`);

  if (cv.summary) {
    lines.push("");
    lines.push(`Summary: ${safeStr(cv.summary)}`);
  }

  const experiences = cv.experiences || cv.experience;
  if (Array.isArray(experiences) && experiences.length > 0) {
    lines.push("");
    lines.push("EXPERIENCES:");
    for (const exp of experiences) {
      const role = safeStr(exp.role || exp.title);
      const company = safeStr(exp.company);
      const period = safeStr(exp.period) ||
        `${safeStr(exp.startDate)} - ${safeStr(exp.endDate) || "Present"}`;
      const location = safeStr(exp.location);
      const head = [role, company, location, period].filter(Boolean).join(" | ");
      lines.push(`- ${head}`);
      if (Array.isArray(exp.bullets) && exp.bullets.length > 0) {
        for (const b of exp.bullets) {
          if (safeStr(b)) lines.push(`  * ${safeStr(b)}`);
        }
      } else if (exp.description) {
        lines.push(`  ${safeStr(exp.description)}`);
      }
    }
  }

  if (Array.isArray(cv.education) && cv.education.length > 0) {
    lines.push("");
    lines.push("EDUCATION:");
    for (const edu of cv.education) {
      const degree = safeStr(edu.degree || edu.title);
      const school = safeStr(edu.school || edu.institution);
      const period = safeStr(edu.period) ||
        `${safeStr(edu.startDate)} - ${safeStr(edu.endDate)}`;
      lines.push(`- ${[degree, school, period].filter(Boolean).join(" | ")}`);
    }
  }

  if (Array.isArray(cv.skills) && cv.skills.length > 0) {
    lines.push("");
    lines.push(`SKILLS: ${cv.skills.map(safeStr).filter(Boolean).join(", ")}`);
  }

  if (Array.isArray(cv.languages) && cv.languages.length > 0) {
    const langs = cv.languages
      .map((l) => {
        if (typeof l === "string") return l;
        return `${safeStr(l.lang || l.name)} (${safeStr(l.level)})`;
      })
      .filter(Boolean)
      .join(", ");
    if (langs) lines.push(`LANGUAGES: ${langs}`);
  }

  if (Array.isArray(cv.certifications) && cv.certifications.length > 0) {
    const certs = cv.certifications
      .map((c) => (typeof c === "string" ? c : safeStr(c.name)))
      .filter(Boolean)
      .join(", ");
    if (certs) lines.push(`CERTIFICATIONS: ${certs}`);
  }

  return lines.join("\n").slice(0, 10000);
}
