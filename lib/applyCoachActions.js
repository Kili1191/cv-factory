// lib/applyCoachActions.js v2 (2026-05-20)
//
// Systeme COMPLET d'actions pour modifier un CV chirurgicalement.
// Utilise par Coach + AdjustModal + futures modales (Match, Audit, etc.)
//
// 20+ actions disponibles couvrant TOUS les cas de modification CV :
//   - Infos personnelles (5 actions)
//   - Profil/Resume (2 actions)
//   - Titre/Headline (2 actions)
//   - Experiences (8 actions : ajout, suppression, modif metadata, bullets, reorder)
//   - Formation (4 actions)
//   - Certifications (3 actions)
//   - Skills (4 actions)
//   - Langues (3 actions)
//
// Format d'une action :
//   { type: "<action_type>", ...params }
//
// Targeting d'une experience :
//   - exp_idx (0-based) OU
//   - exp_id (matching cv.experience[i].id) OU
//   - exp_company + exp_title (fuzzy match, fallback)
//
// Renvoie { newCv, applied, failed, summary }

function deepClone(obj) {
  try { if (typeof structuredClone === "function") return structuredClone(obj); } catch (e) {}
  return JSON.parse(JSON.stringify(obj));
}

// ============================================================================
// Helpers de targeting
// ============================================================================
function findExpIdx(cv, action) {
  const exps = cv.experience || [];
  if (!exps.length) return -1;
  if (typeof action.exp_idx === "number" && action.exp_idx >= 0 && action.exp_idx < exps.length) {
    return action.exp_idx;
  }
  if (action.exp_id != null) {
    const idx = exps.findIndex(e => e && e.id != null && String(e.id) === String(action.exp_id));
    if (idx >= 0) return idx;
  }
  if (action.exp_company || action.exp_title) {
    const wantedC = (action.exp_company || "").toLowerCase().trim();
    const wantedT = (action.exp_title || "").toLowerCase().trim();
    const idx = exps.findIndex(e => {
      const c = (e.company || "").toLowerCase().trim();
      const t = (e.title || "").toLowerCase().trim();
      if (wantedC && wantedT) return c.includes(wantedC) && t.includes(wantedT);
      if (wantedC) return c.includes(wantedC);
      if (wantedT) return t.includes(wantedT);
      return false;
    });
    if (idx >= 0) return idx;
  }
  return -1; // pas de fallback auto pour eviter modifs sur la mauvaise exp
}

function findEduIdx(cv, action) {
  const eds = cv.education || [];
  if (!eds.length) return -1;
  if (typeof action.edu_idx === "number" && action.edu_idx >= 0 && action.edu_idx < eds.length) {
    return action.edu_idx;
  }
  if (action.edu_id != null) {
    const idx = eds.findIndex(e => e && e.id != null && String(e.id) === String(action.edu_id));
    if (idx >= 0) return idx;
  }
  if (action.edu_school || action.edu_degree) {
    const wantedS = (action.edu_school || "").toLowerCase().trim();
    const wantedD = (action.edu_degree || "").toLowerCase().trim();
    const idx = eds.findIndex(e => {
      const s = (e.school || "").toLowerCase().trim();
      const d = (e.degree || "").toLowerCase().trim();
      if (wantedS && wantedD) return s.includes(wantedS) && d.includes(wantedD);
      if (wantedS) return s.includes(wantedS);
      if (wantedD) return d.includes(wantedD);
      return false;
    });
    if (idx >= 0) return idx;
  }
  return -1;
}

function findIdxByText(arr, target, key = null) {
  // Cherche dans un array de strings (skills, certifications) OU d'objets (languages)
  if (!Array.isArray(arr) || !target) return -1;
  const t = String(target).toLowerCase().trim();
  return arr.findIndex(item => {
    if (item == null) return false;
    const s = key ? (item[key] || "") : String(item);
    return s.toLowerCase().trim().includes(t);
  });
}

// ============================================================================
// Application d'une action individuelle
// ============================================================================
function applyOne(cv, action, log) {
  if (!action || typeof action !== "object" || !action.type) {
    log.failed.push({ action, reason: "invalid action shape" });
    return cv;
  }

  switch (action.type) {

    // ========================================================================
    // INFOS PERSONNELLES
    // ========================================================================
    case "update_name": {
      if (typeof action.new_text !== "string" || !action.new_text.trim()) {
        log.failed.push({ action, reason: "missing new_text" }); return cv;
      }
      cv.name = action.new_text.trim();
      log.personal_changes++;
      return cv;
    }
    case "update_email": {
      if (typeof action.new_text !== "string") {
        log.failed.push({ action, reason: "missing new_text" }); return cv;
      }
      cv.email = action.new_text.trim();
      log.personal_changes++;
      return cv;
    }
    case "update_phone": {
      if (typeof action.new_text !== "string") {
        log.failed.push({ action, reason: "missing new_text" }); return cv;
      }
      cv.phone = action.new_text.trim();
      log.personal_changes++;
      return cv;
    }
    case "update_location": {
      if (typeof action.new_text !== "string") {
        log.failed.push({ action, reason: "missing new_text" }); return cv;
      }
      cv.location = action.new_text.trim();
      log.personal_changes++;
      return cv;
    }
    case "update_linkedin": {
      if (typeof action.new_text !== "string") {
        log.failed.push({ action, reason: "missing new_text" }); return cv;
      }
      cv.linkedin = action.new_text.trim();
      log.personal_changes++;
      return cv;
    }

    // ========================================================================
    // PROFIL / TITRE
    // ========================================================================
    case "update_summary": {
      if (typeof action.new_text !== "string" || !action.new_text.trim()) {
        log.failed.push({ action, reason: "missing new_text" }); return cv;
      }
      cv.summary = action.new_text.trim();
      log.summary_changes++;
      return cv;
    }
    case "clear_summary": {
      cv.summary = "";
      log.summary_changes++;
      return cv;
    }
    case "update_title": {
      if (typeof action.new_text !== "string" || !action.new_text.trim()) {
        log.failed.push({ action, reason: "missing new_text" }); return cv;
      }
      cv.title = action.new_text.trim();
      log.title_changes++;
      return cv;
    }
    case "clear_title": {
      cv.title = "";
      log.title_changes++;
      return cv;
    }

    // ========================================================================
    // EXPERIENCES - bullets
    // ========================================================================
    case "replace_bullet": {
      const idx = findExpIdx(cv, action);
      if (idx < 0) { log.failed.push({ action, reason: "experience not found" }); return cv; }
      const exp = cv.experience[idx];
      const bullets = Array.isArray(exp.bullets) ? exp.bullets : [];
      const bIdx = typeof action.bullet_idx === "number" ? action.bullet_idx : -1;
      if (bIdx < 0 || bIdx >= bullets.length) {
        log.failed.push({ action, reason: "bullet_idx out of range" }); return cv;
      }
      if (typeof action.new_text !== "string" || !action.new_text.trim()) {
        log.failed.push({ action, reason: "missing new_text" }); return cv;
      }
      const newBullets = [...bullets];
      newBullets[bIdx] = action.new_text.trim();
      cv.experience = [...cv.experience];
      cv.experience[idx] = { ...exp, bullets: newBullets };
      log.bullets_replaced++;
      return cv;
    }
    case "delete_bullet": {
      const idx = findExpIdx(cv, action);
      if (idx < 0) { log.failed.push({ action, reason: "experience not found" }); return cv; }
      const exp = cv.experience[idx];
      const bullets = Array.isArray(exp.bullets) ? exp.bullets : [];
      const bIdx = typeof action.bullet_idx === "number" ? action.bullet_idx : -1;
      if (bIdx < 0 || bIdx >= bullets.length) {
        log.failed.push({ action, reason: "bullet_idx out of range" }); return cv;
      }
      const newBullets = bullets.filter((_, i) => i !== bIdx);
      cv.experience = [...cv.experience];
      cv.experience[idx] = { ...exp, bullets: newBullets };
      log.bullets_deleted++;
      return cv;
    }
    case "add_bullet": {
      const idx = findExpIdx(cv, action);
      if (idx < 0) {
        if (action.exp_company || action.exp_title) {
          const newExp = {
            id: Date.now(),
            title: action.exp_title || "",
            company: action.exp_company || "",
            period: action.exp_period || "",
            location: action.exp_location || "",
            bullets: [String(action.text || "").trim()].filter(Boolean),
          };
          cv.experience = [...(cv.experience || []), newExp];
          log.experiences_added++;
          log.bullets_added++;
          return cv;
        }
        log.failed.push({ action, reason: "no experience and no context to create one" }); return cv;
      }
      const exp = cv.experience[idx];
      if (typeof action.text !== "string" || !action.text.trim()) {
        log.failed.push({ action, reason: "missing text" }); return cv;
      }
      const bullets = Array.isArray(exp.bullets) ? exp.bullets : [];
      const newBullets = [...bullets, action.text.trim()];
      cv.experience = [...cv.experience];
      cv.experience[idx] = { ...exp, bullets: newBullets };
      log.bullets_added++;
      return cv;
    }
    case "reorder_bullets": {
      const idx = findExpIdx(cv, action);
      if (idx < 0) { log.failed.push({ action, reason: "experience not found" }); return cv; }
      const exp = cv.experience[idx];
      const bullets = Array.isArray(exp.bullets) ? exp.bullets : [];
      if (!Array.isArray(action.order)) {
        log.failed.push({ action, reason: "missing order array" }); return cv;
      }
      // order = [2, 0, 1] = nouveau ordre des indices
      const newBullets = action.order
        .filter(i => typeof i === "number" && i >= 0 && i < bullets.length)
        .map(i => bullets[i]);
      if (newBullets.length === 0) {
        log.failed.push({ action, reason: "invalid order" }); return cv;
      }
      cv.experience = [...cv.experience];
      cv.experience[idx] = { ...exp, bullets: newBullets };
      log.bullets_reordered++;
      return cv;
    }

    // ========================================================================
    // EXPERIENCES - metadata
    // ========================================================================
    case "update_experience": {
      // Modif metadata d'une exp : title, company, period, location
      const idx = findExpIdx(cv, action);
      if (idx < 0) { log.failed.push({ action, reason: "experience not found" }); return cv; }
      const exp = cv.experience[idx];
      const updates = {};
      if (typeof action.new_title === "string") updates.title = action.new_title.trim();
      if (typeof action.new_company === "string") updates.company = action.new_company.trim();
      if (typeof action.new_period === "string") updates.period = action.new_period.trim();
      if (typeof action.new_location === "string") updates.location = action.new_location.trim();
      if (Object.keys(updates).length === 0) {
        log.failed.push({ action, reason: "no field to update" }); return cv;
      }
      cv.experience = [...cv.experience];
      cv.experience[idx] = { ...exp, ...updates };
      log.experiences_updated++;
      return cv;
    }
    case "add_experience": {
      // Ajoute une exp entiere
      if (typeof action.title !== "string" && typeof action.company !== "string") {
        log.failed.push({ action, reason: "need at least title or company" }); return cv;
      }
      const newExp = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        title: (action.title || "").trim(),
        company: (action.company || "").trim(),
        period: (action.period || "").trim(),
        location: (action.location || "").trim(),
        bullets: Array.isArray(action.bullets)
          ? action.bullets.map(b => String(b || "").trim()).filter(Boolean)
          : [],
      };
      // Insertion : si action.insert_at est defini, on insere a cet index
      // sinon on append
      const insertAt = typeof action.insert_at === "number" ? action.insert_at : -1;
      const exps = cv.experience || [];
      if (insertAt >= 0 && insertAt <= exps.length) {
        cv.experience = [...exps.slice(0, insertAt), newExp, ...exps.slice(insertAt)];
      } else {
        cv.experience = [...exps, newExp];
      }
      log.experiences_added++;
      return cv;
    }
    case "delete_experience": {
      const idx = findExpIdx(cv, action);
      if (idx < 0) { log.failed.push({ action, reason: "experience not found" }); return cv; }
      cv.experience = cv.experience.filter((_, i) => i !== idx);
      log.experiences_deleted++;
      return cv;
    }
    case "reorder_experiences": {
      if (!Array.isArray(action.order)) {
        log.failed.push({ action, reason: "missing order array" }); return cv;
      }
      const exps = cv.experience || [];
      const newExps = action.order
        .filter(i => typeof i === "number" && i >= 0 && i < exps.length)
        .map(i => exps[i]);
      if (newExps.length === 0) {
        log.failed.push({ action, reason: "invalid order" }); return cv;
      }
      cv.experience = newExps;
      log.experiences_reordered++;
      return cv;
    }

    // ========================================================================
    // FORMATION
    // ========================================================================
    case "update_education": {
      const idx = findEduIdx(cv, action);
      if (idx < 0) { log.failed.push({ action, reason: "education not found" }); return cv; }
      const edu = cv.education[idx];
      const updates = {};
      if (typeof action.new_degree === "string") updates.degree = action.new_degree.trim();
      if (typeof action.new_school === "string") updates.school = action.new_school.trim();
      if (typeof action.new_period === "string") updates.period = action.new_period.trim();
      if (Object.keys(updates).length === 0) {
        log.failed.push({ action, reason: "no field to update" }); return cv;
      }
      cv.education = [...cv.education];
      cv.education[idx] = { ...edu, ...updates };
      log.education_updated++;
      return cv;
    }
    case "add_education": {
      if (typeof action.degree !== "string" && typeof action.school !== "string") {
        log.failed.push({ action, reason: "need at least degree or school" }); return cv;
      }
      const newEdu = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        degree: (action.degree || "").trim(),
        school: (action.school || "").trim(),
        period: (action.period || "").trim(),
      };
      const insertAt = typeof action.insert_at === "number" ? action.insert_at : -1;
      const eds = cv.education || [];
      if (insertAt >= 0 && insertAt <= eds.length) {
        cv.education = [...eds.slice(0, insertAt), newEdu, ...eds.slice(insertAt)];
      } else {
        cv.education = [...eds, newEdu];
      }
      log.education_added++;
      return cv;
    }
    case "delete_education": {
      const idx = findEduIdx(cv, action);
      if (idx < 0) { log.failed.push({ action, reason: "education not found" }); return cv; }
      cv.education = cv.education.filter((_, i) => i !== idx);
      log.education_deleted++;
      return cv;
    }
    case "reorder_education": {
      if (!Array.isArray(action.order)) {
        log.failed.push({ action, reason: "missing order array" }); return cv;
      }
      const eds = cv.education || [];
      const newEds = action.order
        .filter(i => typeof i === "number" && i >= 0 && i < eds.length)
        .map(i => eds[i]);
      if (newEds.length === 0) {
        log.failed.push({ action, reason: "invalid order" }); return cv;
      }
      cv.education = newEds;
      log.education_reordered++;
      return cv;
    }

    // ========================================================================
    // CERTIFICATIONS
    // ========================================================================
    case "add_certification": {
      if (typeof action.text !== "string" || !action.text.trim()) {
        log.failed.push({ action, reason: "missing text" }); return cv;
      }
      const certs = Array.isArray(cv.certifications) ? cv.certifications : [];
      const insertAt = typeof action.insert_at === "number" ? action.insert_at : -1;
      if (insertAt >= 0 && insertAt <= certs.length) {
        cv.certifications = [...certs.slice(0, insertAt), action.text.trim(), ...certs.slice(insertAt)];
      } else {
        cv.certifications = [...certs, action.text.trim()];
      }
      log.certifications_added++;
      return cv;
    }
    case "delete_certification": {
      const certs = Array.isArray(cv.certifications) ? cv.certifications : [];
      let idx = typeof action.cert_idx === "number" ? action.cert_idx : -1;
      if (idx < 0 && action.text) idx = findIdxByText(certs, action.text);
      if (idx < 0 || idx >= certs.length) {
        log.failed.push({ action, reason: "certification not found" }); return cv;
      }
      cv.certifications = certs.filter((_, i) => i !== idx);
      log.certifications_deleted++;
      return cv;
    }
    case "replace_certification": {
      const certs = Array.isArray(cv.certifications) ? cv.certifications : [];
      let idx = typeof action.cert_idx === "number" ? action.cert_idx : -1;
      if (idx < 0 && action.old_text) idx = findIdxByText(certs, action.old_text);
      if (idx < 0 || idx >= certs.length) {
        log.failed.push({ action, reason: "certification not found" }); return cv;
      }
      if (typeof action.new_text !== "string" || !action.new_text.trim()) {
        log.failed.push({ action, reason: "missing new_text" }); return cv;
      }
      const newCerts = [...certs];
      newCerts[idx] = action.new_text.trim();
      cv.certifications = newCerts;
      log.certifications_updated++;
      return cv;
    }

    // ========================================================================
    // SKILLS
    // ========================================================================
    case "add_skill": {
      if (typeof action.text !== "string" || !action.text.trim()) {
        log.failed.push({ action, reason: "missing text" }); return cv;
      }
      const skills = Array.isArray(cv.skills) ? cv.skills : [];
      const insertAt = typeof action.insert_at === "number" ? action.insert_at : -1;
      if (insertAt >= 0 && insertAt <= skills.length) {
        cv.skills = [...skills.slice(0, insertAt), action.text.trim(), ...skills.slice(insertAt)];
      } else {
        cv.skills = [...skills, action.text.trim()];
      }
      log.skills_added++;
      return cv;
    }
    case "delete_skill": {
      const skills = Array.isArray(cv.skills) ? cv.skills : [];
      let idx = typeof action.skill_idx === "number" ? action.skill_idx : -1;
      if (idx < 0 && action.text) idx = findIdxByText(skills, action.text);
      if (idx < 0 || idx >= skills.length) {
        log.failed.push({ action, reason: "skill not found" }); return cv;
      }
      cv.skills = skills.filter((_, i) => i !== idx);
      log.skills_deleted++;
      return cv;
    }
    case "replace_skill": {
      const skills = Array.isArray(cv.skills) ? cv.skills : [];
      let idx = typeof action.skill_idx === "number" ? action.skill_idx : -1;
      if (idx < 0 && action.old_text) idx = findIdxByText(skills, action.old_text);
      if (idx < 0 || idx >= skills.length) {
        log.failed.push({ action, reason: "skill not found" }); return cv;
      }
      if (typeof action.new_text !== "string" || !action.new_text.trim()) {
        log.failed.push({ action, reason: "missing new_text" }); return cv;
      }
      const newSkills = [...skills];
      newSkills[idx] = action.new_text.trim();
      cv.skills = newSkills;
      log.skills_updated++;
      return cv;
    }
    case "replace_all_skills": {
      // Remplace TOUTE la liste de skills (utile pour categorisation, reorg complete)
      if (!Array.isArray(action.skills)) {
        log.failed.push({ action, reason: "missing skills array" }); return cv;
      }
      cv.skills = action.skills
        .map(s => String(s || "").trim())
        .filter(Boolean);
      log.skills_updated++;
      return cv;
    }

    // ========================================================================
    // LANGUES
    // ========================================================================
    case "add_language": {
      if (!action.lang || typeof action.lang !== "string") {
        log.failed.push({ action, reason: "missing lang" }); return cv;
      }
      const langs = Array.isArray(cv.languages) ? cv.languages : [];
      const newLang = {
        lang: action.lang.trim(),
        level: (action.level || "").trim(),
      };
      cv.languages = [...langs, newLang];
      log.languages_added++;
      return cv;
    }
    case "delete_language": {
      const langs = Array.isArray(cv.languages) ? cv.languages : [];
      let idx = typeof action.lang_idx === "number" ? action.lang_idx : -1;
      if (idx < 0 && action.lang) idx = findIdxByText(langs, action.lang, "lang");
      if (idx < 0 || idx >= langs.length) {
        log.failed.push({ action, reason: "language not found" }); return cv;
      }
      cv.languages = langs.filter((_, i) => i !== idx);
      log.languages_deleted++;
      return cv;
    }
    case "update_language": {
      const langs = Array.isArray(cv.languages) ? cv.languages : [];
      let idx = typeof action.lang_idx === "number" ? action.lang_idx : -1;
      if (idx < 0 && action.lang) idx = findIdxByText(langs, action.lang, "lang");
      if (idx < 0 || idx >= langs.length) {
        log.failed.push({ action, reason: "language not found" }); return cv;
      }
      const updates = {};
      if (typeof action.new_lang === "string") updates.lang = action.new_lang.trim();
      if (typeof action.new_level === "string") updates.level = action.new_level.trim();
      if (Object.keys(updates).length === 0) {
        log.failed.push({ action, reason: "no field to update" }); return cv;
      }
      const newLangs = [...langs];
      newLangs[idx] = { ...langs[idx], ...updates };
      cv.languages = newLangs;
      log.languages_updated++;
      return cv;
    }

    default:
      log.failed.push({ action, reason: "unknown action type: " + action.type });
      return cv;
  }
}

// ============================================================================
// Resume textuel des changements
// ============================================================================
function buildSummary(log, lang) {
  const isEn = lang === "en";
  const parts = [];

  // Experiences
  if (log.experiences_added > 0)
    parts.push(log.experiences_added + (isEn ? " experience added" : " experience ajoutee") + (log.experiences_added > 1 ? "s" : ""));
  if (log.experiences_deleted > 0)
    parts.push(log.experiences_deleted + (isEn ? " experience removed" : " experience supprimee") + (log.experiences_deleted > 1 ? "s" : ""));
  if (log.experiences_updated > 0)
    parts.push(log.experiences_updated + (isEn ? " experience updated" : " experience modifiee") + (log.experiences_updated > 1 ? "s" : ""));
  if (log.experiences_reordered > 0)
    parts.push(isEn ? "experiences reordered" : "experiences reordonnees");

  // Bullets
  if (log.bullets_replaced > 0)
    parts.push(log.bullets_replaced + (isEn ? " bullet rewritten" : " bullet reecrit") + (log.bullets_replaced > 1 ? "s" : ""));
  if (log.bullets_added > 0)
    parts.push(log.bullets_added + (isEn ? " bullet added" : " bullet ajoute") + (log.bullets_added > 1 ? "s" : ""));
  if (log.bullets_deleted > 0)
    parts.push(log.bullets_deleted + (isEn ? " bullet removed" : " bullet supprime") + (log.bullets_deleted > 1 ? "s" : ""));
  if (log.bullets_reordered > 0)
    parts.push(isEn ? "bullets reordered" : "bullets reordonnes");

  // Profil
  if (log.summary_changes > 0) parts.push(isEn ? "summary updated" : "accroche mise a jour");
  if (log.title_changes > 0) parts.push(isEn ? "title updated" : "titre mis a jour");

  // Education
  if (log.education_added > 0)
    parts.push(log.education_added + (isEn ? " education added" : " formation ajoutee") + (log.education_added > 1 ? "s" : ""));
  if (log.education_deleted > 0)
    parts.push(log.education_deleted + (isEn ? " education removed" : " formation supprimee") + (log.education_deleted > 1 ? "s" : ""));
  if (log.education_updated > 0)
    parts.push(log.education_updated + (isEn ? " education updated" : " formation modifiee") + (log.education_updated > 1 ? "s" : ""));
  if (log.education_reordered > 0)
    parts.push(isEn ? "education reordered" : "formations reordonnees");

  // Certifications
  if (log.certifications_added > 0)
    parts.push(log.certifications_added + (isEn ? " certification added" : " certification ajoutee") + (log.certifications_added > 1 ? "s" : ""));
  if (log.certifications_deleted > 0)
    parts.push(log.certifications_deleted + (isEn ? " certification removed" : " certification supprimee") + (log.certifications_deleted > 1 ? "s" : ""));
  if (log.certifications_updated > 0)
    parts.push(log.certifications_updated + (isEn ? " certification updated" : " certification modifiee") + (log.certifications_updated > 1 ? "s" : ""));

  // Skills
  if (log.skills_added > 0)
    parts.push(log.skills_added + (isEn ? " skill added" : " competence ajoutee") + (log.skills_added > 1 ? "s" : ""));
  if (log.skills_deleted > 0)
    parts.push(log.skills_deleted + (isEn ? " skill removed" : " competence supprimee") + (log.skills_deleted > 1 ? "s" : ""));
  if (log.skills_updated > 0)
    parts.push(isEn ? "skills updated" : "competences mises a jour");

  // Langues
  if (log.languages_added > 0)
    parts.push(log.languages_added + (isEn ? " language added" : " langue ajoutee") + (log.languages_added > 1 ? "s" : ""));
  if (log.languages_deleted > 0)
    parts.push(log.languages_deleted + (isEn ? " language removed" : " langue supprimee") + (log.languages_deleted > 1 ? "s" : ""));
  if (log.languages_updated > 0)
    parts.push(isEn ? "languages updated" : "langues mises a jour");

  // Personal
  if (log.personal_changes > 0)
    parts.push(isEn ? "personal info updated" : "infos personnelles mises a jour");

  return parts.join(", ");
}

// ============================================================================
// Export principal
// ============================================================================
export function applyCoachActions(cv, actions, opts = {}) {
  const lang = opts.lang || "fr";

  const log = {
    bullets_replaced: 0, bullets_added: 0, bullets_deleted: 0, bullets_reordered: 0,
    experiences_added: 0, experiences_deleted: 0, experiences_updated: 0, experiences_reordered: 0,
    summary_changes: 0, title_changes: 0,
    education_added: 0, education_deleted: 0, education_updated: 0, education_reordered: 0,
    certifications_added: 0, certifications_deleted: 0, certifications_updated: 0,
    skills_added: 0, skills_deleted: 0, skills_updated: 0,
    languages_added: 0, languages_deleted: 0, languages_updated: 0,
    personal_changes: 0,
    failed: [],
  };

  if (!cv || typeof cv !== "object") {
    return { newCv: cv, applied: 0, failed: [], summary: "" };
  }
  if (!Array.isArray(actions) || actions.length === 0) {
    return { newCv: cv, applied: 0, failed: [], summary: "" };
  }

  let next = deepClone(cv);
  for (const action of actions) {
    next = applyOne(next, action, log);
  }

  const applied = Object.keys(log)
    .filter(k => k !== "failed")
    .reduce((sum, k) => sum + log[k], 0);

  return {
    newCv: next,
    applied,
    failed: log.failed,
    summary: buildSummary(log, lang),
  };
}

export default applyCoachActions;
