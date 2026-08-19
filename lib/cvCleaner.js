// lib/cvCleaner.js
//
// Analyse un CV et detecte ce qui est vide, puis le nettoie automatiquement
// pour un export PDF homogene. Le CV original (en localStorage) n'est jamais
// modifie : on retourne une COPIE nettoyee pour l'export.
//
// Strategie "adaptive" :
//   - Une section ENTIEREMENT vide -> on la vire completement
//   - Une section PARTIELLEMENT remplie -> on garde la section et on vire juste
//     les items/champs vides a l'interieur
//
// Champs detectes comme "vides" :
//   - String : "", "   ", "..." (placeholder)
//   - Array : [] ou [""] ou [{tous champs vides}]
//   - Object : tous ses string fields sont vides
//
// Renvoie { cleanedCv, removed } :
//   cleanedCv : la copie nettoyee
//   removed   : { sections: [...], items: number, fields: number, summary: string }

function isStringEmpty(s) {
  if (s == null) return true;
  if (typeof s === "object") {
    // Un item objet ({name}, {label}) : vide si son libelle l'est
    return isStringEmpty(s.name || s.title || s.label || "");
  }
  if (typeof s !== "string") return false;
  const t = s.trim();
  if (t === "") return true;
  // Placeholders typiques
  if (t === "..." || t === "…" || t === "-" || t === "/") return true;
  return false;
}

function isExperienceEmpty(exp) {
  if (!exp || typeof exp !== "object") return true;
  const hasTitle = !isStringEmpty(exp.title);
  const hasCompany = !isStringEmpty(exp.company);
  const hasPeriod = !isStringEmpty(exp.period);
  const hasLocation = !isStringEmpty(exp.location);
  const hasBullets = Array.isArray(exp.bullets)
    && exp.bullets.some(b => !isStringEmpty(b));
  // Une exp est vide si aucun des champs critiques (title, company, bullets) n'est rempli
  return !hasTitle && !hasCompany && !hasBullets;
}

function isEducationEmpty(edu) {
  if (!edu || typeof edu !== "object") return true;
  return isStringEmpty(edu.degree)
    && isStringEmpty(edu.school)
    && isStringEmpty(edu.period);
}

function isLanguageEmpty(lang) {
  if (!lang || typeof lang !== "object") return true;
  return isStringEmpty(lang.lang) && isStringEmpty(lang.level);
}

// Clean une experience individuelle : vire les bullets vides
function cleanExperience(exp) {
  return {
    ...exp,
    bullets: Array.isArray(exp.bullets)
      ? exp.bullets.filter(b => !isStringEmpty(b))
      : [],
  };
}

export function analyzeCV(cv) {
  const report = {
    emptySections: [],
    partialSections: [],
    missingContactFields: [],
    emptyItems: 0,
  };

  if (!cv || typeof cv !== "object") return report;

  // === Contact fields (email, phone, location, linkedin) ===
  // Ce ne sont pas des "sections" mais des champs critiques
  const contactFields = [
    { key: "email", label: "email" },
    { key: "phone", label: "telephone" },
    { key: "location", label: "ville" },
  ];
  contactFields.forEach(({ key, label }) => {
    if (isStringEmpty(cv[key])) {
      report.missingContactFields.push(label);
    }
  });

  // === Experiences ===
  const exps = Array.isArray(cv.experience) ? cv.experience : [];
  const emptyExps = exps.filter(isExperienceEmpty).length;
  if (exps.length > 0 && emptyExps === exps.length) {
    report.emptySections.push("experience");
  } else if (emptyExps > 0) {
    report.partialSections.push("experience");
    report.emptyItems += emptyExps;
  }

  // === Education ===
  const edus = Array.isArray(cv.education) ? cv.education : [];
  const emptyEdus = edus.filter(isEducationEmpty).length;
  if (edus.length > 0 && emptyEdus === edus.length) {
    report.emptySections.push("education");
  } else if (emptyEdus > 0) {
    report.partialSections.push("education");
    report.emptyItems += emptyEdus;
  }

  // === Skills ===
  const skills = Array.isArray(cv.skills) ? cv.skills : [];
  const filledSkills = skills.filter(s => !isStringEmpty(s));
  if (skills.length > 0 && filledSkills.length === 0) {
    report.emptySections.push("skills");
  }

  // === Languages ===
  const langs = Array.isArray(cv.languages) ? cv.languages : [];
  const emptyLangs = langs.filter(isLanguageEmpty).length;
  if (langs.length > 0 && emptyLangs === langs.length) {
    report.emptySections.push("languages");
  } else if (emptyLangs > 0) {
    report.partialSections.push("languages");
    report.emptyItems += emptyLangs;
  }

  // === Certifications ===
  const certs = Array.isArray(cv.certifications) ? cv.certifications : [];
  const filledCerts = certs.filter(c => !isStringEmpty(c));
  if (certs.length > 0 && filledCerts.length === 0) {
    report.emptySections.push("certifications");
  }

  return report;
}

// Renvoie le CV nettoye + un report de ce qui a ete enleve.
// Le CV original n'est PAS mute.
export function cleanCVForExport(cv, opts = {}) {
  const lang = opts.lang || "fr";
  if (!cv || typeof cv !== "object") {
    return { cleanedCv: cv, removed: emptyRemovedReport() };
  }

  const cleaned = { ...cv };
  const removed = emptyRemovedReport();

  // === Experiences : adaptive ===
  if (Array.isArray(cv.experience)) {
    const nonEmpty = cv.experience.filter(e => !isExperienceEmpty(e));
    const removedExps = cv.experience.length - nonEmpty.length;
    if (nonEmpty.length === 0) {
      // Section entierement vide -> on vire la section.
      // Une section deja vide au depart n'est pas un retrait : on ne la
      // signale pas, sinon le rapport annonce du travail qui n'a pas eu lieu.
      cleaned.experience = [];
      if (removedExps > 0) {
        removed.sections.push("experience");
        removed.items += removedExps;
      }
    } else {
      // Garde la section mais nettoie les bullets vides de chaque exp
      cleaned.experience = nonEmpty.map(cleanExperience);
      removed.items += removedExps;
    }
  }

  // === Education : adaptive ===
  if (Array.isArray(cv.education)) {
    const nonEmpty = cv.education.filter(e => !isEducationEmpty(e));
    const removedEdus = cv.education.length - nonEmpty.length;
    if (nonEmpty.length === 0) {
      cleaned.education = [];
      if (removedEdus > 0) {
        removed.sections.push("education");
        removed.items += removedEdus;
      }
    } else {
      cleaned.education = nonEmpty;
      removed.items += removedEdus;
    }
  }

  // === Skills : vire les vides ===
  if (Array.isArray(cv.skills)) {
    const nonEmpty = cv.skills.filter(s => !isStringEmpty(s));
    const removedSkills = cv.skills.length - nonEmpty.length;
    if (nonEmpty.length === 0) {
      cleaned.skills = [];
      if (removedSkills > 0) {
        removed.sections.push("skills");
        removed.items += removedSkills;
      }
    } else {
      cleaned.skills = nonEmpty;
      removed.items += removedSkills;
    }
  }

  // === Languages : adaptive ===
  if (Array.isArray(cv.languages)) {
    const nonEmpty = cv.languages.filter(l => !isLanguageEmpty(l));
    const removedLangs = cv.languages.length - nonEmpty.length;
    if (nonEmpty.length === 0) {
      cleaned.languages = [];
      if (removedLangs > 0) {
        removed.sections.push("languages");
        removed.items += removedLangs;
      }
    } else {
      cleaned.languages = nonEmpty;
      removed.items += removedLangs;
    }
  }

  // === Certifications : vire les vides ===
  if (Array.isArray(cv.certifications)) {
    const nonEmpty = cv.certifications.filter(c => !isStringEmpty(c));
    const removedCerts = cv.certifications.length - nonEmpty.length;
    if (nonEmpty.length === 0) {
      cleaned.certifications = [];
      if (removedCerts > 0) {
        removed.sections.push("certifications");
        removed.items += removedCerts;
      }
    } else {
      cleaned.certifications = nonEmpty;
      removed.items += removedCerts;
    }
  }

  // === Champs string vides (email, phone, location, linkedin, summary, etc.) ===
  // On les remplace par "" (vide propre) au cas ou ils contiendraient "..."
  ["email", "phone", "location", "linkedin", "summary", "name", "title"].forEach(k => {
    if (isStringEmpty(cleaned[k])) {
      if (cleaned[k] !== "") removed.fields++;
      cleaned[k] = "";
    }
  });

  // Build summary
  removed.summary = buildRemovedSummary(removed, lang);

  return { cleanedCv: cleaned, removed };
}

function emptyRemovedReport() {
  return {
    sections: [],
    items: 0,
    fields: 0,
    summary: "",
  };
}

function buildRemovedSummary(removed, lang = "fr") {
  const parts = [];
  const sectionLabels = lang === "en" ? {
    experience: "experience",
    education: "education",
    skills: "skills",
    languages: "languages",
    certifications: "certifications",
  } : {
    experience: "experiences",
    education: "formation",
    skills: "competences",
    languages: "langues",
    certifications: "certifications",
  };

  if (removed.sections.length > 0) {
    const names = removed.sections.map(s => sectionLabels[s] || s);
    if (names.length === 1) {
      parts.push(lang === "en"
        ? "1 empty section (" + names[0] + ")"
        : "1 section vide (" + names[0] + ")");
    } else {
      parts.push(lang === "en"
        ? names.length + " empty sections (" + names.join(", ") + ")"
        : names.length + " sections vides (" + names.join(", ") + ")");
    }
  }

  if (removed.items > 0) {
    parts.push(lang === "en"
      ? removed.items + " empty item" + (removed.items > 1 ? "s" : "")
      : removed.items + " element" + (removed.items > 1 ? "s" : "") + " vide" + (removed.items > 1 ? "s" : ""));
  }

  return parts.join(", ");
}

// Helper pour generer le summary en fonction de la lang
export function getRemovedSummary(removed, lang = "fr") {
  return buildRemovedSummary(removed, lang);
}
