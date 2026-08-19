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

// Id unique pour les items crees. Date.now() seul collisionne des que deux
// actions du meme batch s'executent dans la meme milliseconde.
let uidCounter = 0;
function uid() {
  uidCounter += 1;
  return Date.now() * 1000 + (uidCounter % 1000);
}

// Reordonne un tableau a partir d'une liste d'index.
// L'IA renvoie souvent un ordre PARTIEL ("remonte le bullet 2 en premier").
// On ne supprime jamais un item absent de la liste : il est simplement
// conserve a la suite, dans son ordre d'origine. Les doublons sont ignores.
function resolveOrder(order, length) {
  const seen = new Set();
  const resolved = [];
  for (const raw of order) {
    const i = typeof raw === "number" ? raw : parseInt(raw, 10);
    if (!Number.isInteger(i) || i < 0 || i >= length) continue;
    if (seen.has(i)) continue;
    seen.add(i);
    resolved.push(i);
  }
  if (resolved.length === 0) return null;
  for (let i = 0; i < length; i++) {
    if (!seen.has(i)) resolved.push(i);
  }
  return resolved;
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
      if (!e || typeof e !== "object") return false;
      const c = String(e.company || "").toLowerCase().trim();
      const t = String(e.title || "").toLowerCase().trim();
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
      if (!e || typeof e !== "object") return false;
      const s = String(e.school || "").toLowerCase().trim();
      const d = String(e.degree || "").toLowerCase().trim();
      if (wantedS && wantedD) return s.includes(wantedS) && d.includes(wantedD);
      if (wantedS) return s.includes(wantedS);
      if (wantedD) return d.includes(wantedD);
      return false;
    });
    if (idx >= 0) return idx;
  }
  return -1;
}

// Texte d'un item de liste : string brute, ou champ d'un objet
// ({lang} pour les langues, {name} pour une certification objet).
function itemText(item, key) {
  if (item == null) return "";
  if (typeof item === "string") return item;
  if (typeof item === "object") {
    if (key && item[key] != null) return String(item[key]);
    return String(item.name || item.title || item.label || "");
  }
  return String(item);
}

function findIdxByText(arr, target, key = null) {
  // Cherche dans un array de strings (skills, certifications) OU d'objets (languages).
  // Le match se fait par paliers du plus precis au plus large : une recherche
  // "Java" ne doit pas emporter "JavaScript" tant qu'un "Java" exact existe.
  if (!Array.isArray(arr) || !target) return -1;
  const t = String(target).toLowerCase().trim();
  if (!t) return -1;
  const texts = arr.map(item => itemText(item, key).toLowerCase().trim());

  let idx = texts.findIndex(s => s === t);
  if (idx >= 0) return idx;
  idx = texts.findIndex(s => s.startsWith(t));
  if (idx >= 0) return idx;
  // Dernier recours : sous-chaine, mais sur un mot entier uniquement
  // ("Scrum Master" doit matcher "Scrum Master Advanced", pas "Scrummaster").
  return texts.findIndex(s => s !== "" && (" " + s + " ").includes(" " + t + " "));
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
            id: uid(),
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
      // order = [2, 0, 1] = nouveau ordre des indices.
      // Un ordre partiel est accepte : les bullets non cites restent a la suite.
      const resolved = resolveOrder(action.order, bullets.length);
      if (!resolved) {
        log.failed.push({ action, reason: "invalid order" }); return cv;
      }
      const newBullets = resolved.map(i => bullets[i]);
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
        id: uid(),
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
      const resolvedExps = resolveOrder(action.order, exps.length);
      if (!resolvedExps) {
        log.failed.push({ action, reason: "invalid order" }); return cv;
      }
      cv.experience = resolvedExps.map(i => exps[i]);
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
        id: uid(),
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
      const resolvedEds = resolveOrder(action.order, eds.length);
      if (!resolvedEds) {
        log.failed.push({ action, reason: "invalid order" }); return cv;
      }
      cv.education = resolvedEds.map(i => eds[i]);
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
      if ((idx < 0 || idx >= certs.length) && action.text) idx = findIdxByText(certs, action.text);
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
      if ((idx < 0 || idx >= certs.length) && action.old_text) idx = findIdxByText(certs, action.old_text);
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
      if ((idx < 0 || idx >= skills.length) && action.text) idx = findIdxByText(skills, action.text);
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
      if ((idx < 0 || idx >= skills.length) && action.old_text) idx = findIdxByText(skills, action.old_text);
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
      if ((idx < 0 || idx >= langs.length) && action.lang) idx = findIdxByText(langs, action.lang, "lang");
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
      if ((idx < 0 || idx >= langs.length) && action.lang) idx = findIdxByText(langs, action.lang, "lang");
      if (idx < 0 || idx >= langs.length) {
        log.failed.push({ action, reason: "language not found" }); return cv;
      }
      const updates = {};
      if (typeof action.new_lang === "string") updates.lang = action.new_lang.trim();
      if (typeof action.new_level === "string") updates.level = action.new_level.trim();
      if (Object.keys(updates).length === 0) {
        log.failed.push({ action, reason: "no field to update" }); return cv;
      }
      // Une langue peut etre stockee en string brute ("Anglais") : on la
      // normalise en objet avant de la mettre a jour, sinon le spread
      // eclaterait la string en { 0:"A", 1:"n", ... }.
      const current = langs[idx];
      const base = (current && typeof current === "object")
        ? current
        : { lang: itemText(current, "lang"), level: "" };
      const newLangs = [...langs];
      newLangs[idx] = { ...base, ...updates };
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

  // n(3, "bullet added", "bullets added", "bullet ajoute", "bullets ajoutes")
  // Le "s" porte sur le groupe entier, pas colle apres la phrase : "2 bullets
  // ajoutes", jamais "2 bullet ajoutes" ni "2 bullet addeds".
  const push = (count, en, enPlural, fr, frPlural) => {
    if (!count) return;
    parts.push(count + " " + (isEn ? (count > 1 ? enPlural : en) : (count > 1 ? frPlural : fr)));
  };
  const flag = (count, en, fr) => { if (count) parts.push(isEn ? en : fr); };

  // Experiences
  push(log.experiences_added, "experience added", "experiences added", "experience ajoutee", "experiences ajoutees");
  push(log.experiences_deleted, "experience removed", "experiences removed", "experience supprimee", "experiences supprimees");
  push(log.experiences_updated, "experience updated", "experiences updated", "experience modifiee", "experiences modifiees");
  flag(log.experiences_reordered, "experiences reordered", "experiences reordonnees");

  // Bullets
  push(log.bullets_replaced, "bullet rewritten", "bullets rewritten", "bullet reecrit", "bullets reecrits");
  push(log.bullets_added, "bullet added", "bullets added", "bullet ajoute", "bullets ajoutes");
  push(log.bullets_deleted, "bullet removed", "bullets removed", "bullet supprime", "bullets supprimes");
  flag(log.bullets_reordered, "bullets reordered", "bullets reordonnes");

  // Profil
  flag(log.summary_changes, "summary updated", "accroche mise a jour");
  flag(log.title_changes, "title updated", "titre mis a jour");

  // Education
  push(log.education_added, "education entry added", "education entries added", "formation ajoutee", "formations ajoutees");
  push(log.education_deleted, "education entry removed", "education entries removed", "formation supprimee", "formations supprimees");
  push(log.education_updated, "education entry updated", "education entries updated", "formation modifiee", "formations modifiees");
  flag(log.education_reordered, "education reordered", "formations reordonnees");

  // Certifications
  push(log.certifications_added, "certification added", "certifications added", "certification ajoutee", "certifications ajoutees");
  push(log.certifications_deleted, "certification removed", "certifications removed", "certification supprimee", "certifications supprimees");
  push(log.certifications_updated, "certification updated", "certifications updated", "certification modifiee", "certifications modifiees");

  // Skills
  push(log.skills_added, "skill added", "skills added", "competence ajoutee", "competences ajoutees");
  push(log.skills_deleted, "skill removed", "skills removed", "competence supprimee", "competences supprimees");
  flag(log.skills_updated, "skills updated", "competences mises a jour");

  // Langues
  push(log.languages_added, "language added", "languages added", "langue ajoutee", "langues ajoutees");
  push(log.languages_deleted, "language removed", "languages removed", "langue supprimee", "langues supprimees");
  flag(log.languages_updated, "languages updated", "langues mises a jour");

  // Personal
  flag(log.personal_changes, "personal info updated", "infos personnelles mises a jour");

  return parts.join(", ");
}

// ============================================================================
// Export principal
// ============================================================================
// Somme des compteurs de modification (hors metadonnees du log).
const LOG_META_KEYS = new Set(["failed", "actions_applied"]);
function countChanges(log) {
  let total = 0;
  for (const k of Object.keys(log)) {
    if (!LOG_META_KEYS.has(k)) total += log[k];
  }
  return total;
}

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
    actions_applied: 0,
    failed: [],
  };

  if (!cv || typeof cv !== "object") {
    return { newCv: cv, applied: 0, changes: 0, failed: [], summary: "" };
  }
  if (!Array.isArray(actions) || actions.length === 0) {
    return { newCv: cv, applied: 0, changes: 0, failed: [], summary: "" };
  }

  let next = deepClone(cv);
  for (const action of actions) {
    const failedBefore = log.failed.length;
    const changesBefore = countChanges(log);
    try {
      next = applyOne(next, action, log);
    } catch (err) {
      // Une action malformee ne doit jamais faire tomber tout le batch :
      // les callers attendent { applied, failed }, pas une exception.
      log.failed.push({ action, reason: err && err.message ? err.message : String(err) });
      continue;
    }
    // Une action compte pour 1, quel que soit le nombre de compteurs qu'elle
    // incremente (add_bullet peut creer une experience ET un bullet).
    if (log.failed.length === failedBefore && countChanges(log) > changesBefore) {
      log.actions_applied++;
    }
  }

  return {
    newCv: next,
    applied: log.actions_applied,
    changes: countChanges(log),
    failed: log.failed,
    summary: buildSummary(log, lang),
  };
}

export default applyCoachActions;
