// lib/applyCoachActions.js
//
// Applique les actions structurees retournees par Nuvi Coach sur un CV.
// Les actions sont une liste d'operations ciblees (replace_bullet, delete_bullet,
// add_bullet, update_summary, update_title) qui modifient le CV chirurgicalement
// au lieu de re-generer tout le JSON.
//
// Bug fixes (priorite 1):
//   1.1.b  Actions APPEND only ->  on a maintenant replace/delete/add cibles
//   1.1.c  Pas de modif in-place -> replace_bullet remplace directement
//   1.1.d  Repetitions -> le Coach applique au lieu de proposer
//
// Format d'une action:
//   { type: "replace_bullet", exp_idx: 0, bullet_idx: 2, new_text: "..." }
//   { type: "delete_bullet",  exp_idx: 0, bullet_idx: 5 }
//   { type: "add_bullet",     exp_idx: 0, text: "..." }
//   { type: "update_summary", new_text: "..." }
//   { type: "update_title",   new_text: "..." }
//
// Targeting d'une experience:
//   - exp_idx (0-based) OU
//   - exp_id (matching cv.experience[i].id) OU
//   - exp_company + exp_title (fuzzy match, fallback)
//
// Renvoie { newCv, applied, failed, summary }
//   newCv  : nouveau CV (ou cv inchange si rien applique)
//   applied: nombre d'actions appliquees avec succes
//   failed : tableau { action, reason } pour celles qui ont echoue
//   summary: string lisible "3 bullets modifies, 1 supprime"

function deepClone(obj) {
  // structuredClone est dispo dans tous les browsers modernes + Node 17+
  // Fallback JSON pour les environnements anciens.
  try {
    if (typeof structuredClone === "function") return structuredClone(obj);
  } catch (e) {}
  return JSON.parse(JSON.stringify(obj));
}

function findExpIdx(cv, action) {
  const exps = cv.experience || [];
  if (!exps.length) return -1;

  // 1) exp_idx direct
  if (typeof action.exp_idx === "number"
      && action.exp_idx >= 0
      && action.exp_idx < exps.length) {
    return action.exp_idx;
  }

  // 2) exp_id match
  if (action.exp_id != null) {
    const idx = exps.findIndex(e => e && e.id != null
      && String(e.id) === String(action.exp_id));
    if (idx >= 0) return idx;
  }

  // 3) Fuzzy fallback: company + title
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

  // 4) Defaut: 1ere experience
  return 0;
}

function applyOne(cv, action, log) {
  if (!action || typeof action !== "object" || !action.type) {
    log.failed.push({ action, reason: "invalid action shape" });
    return cv;
  }

  switch (action.type) {
    case "update_summary": {
      if (typeof action.new_text !== "string" || !action.new_text.trim()) {
        log.failed.push({ action, reason: "missing new_text" });
        return cv;
      }
      cv.summary = action.new_text.trim();
      log.summary_changes++;
      return cv;
    }

    case "update_title": {
      if (typeof action.new_text !== "string" || !action.new_text.trim()) {
        log.failed.push({ action, reason: "missing new_text" });
        return cv;
      }
      cv.title = action.new_text.trim();
      log.title_changes++;
      return cv;
    }

    case "replace_bullet": {
      const idx = findExpIdx(cv, action);
      if (idx < 0) {
        log.failed.push({ action, reason: "experience not found" });
        return cv;
      }
      const exp = cv.experience[idx];
      const bullets = Array.isArray(exp.bullets) ? exp.bullets : [];
      const bIdx = typeof action.bullet_idx === "number" ? action.bullet_idx : -1;
      if (bIdx < 0 || bIdx >= bullets.length) {
        log.failed.push({ action, reason: "bullet_idx out of range" });
        return cv;
      }
      if (typeof action.new_text !== "string" || !action.new_text.trim()) {
        log.failed.push({ action, reason: "missing new_text" });
        return cv;
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
      if (idx < 0) {
        log.failed.push({ action, reason: "experience not found" });
        return cv;
      }
      const exp = cv.experience[idx];
      const bullets = Array.isArray(exp.bullets) ? exp.bullets : [];
      const bIdx = typeof action.bullet_idx === "number" ? action.bullet_idx : -1;
      if (bIdx < 0 || bIdx >= bullets.length) {
        log.failed.push({ action, reason: "bullet_idx out of range" });
        return cv;
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
        // Aucune experience : on en cree une si l'action precise le contexte
        if (action.exp_company || action.exp_title) {
          const newExp = {
            id: Date.now(),
            title: action.exp_title || "",
            company: action.exp_company || "",
            period: "",
            location: "",
            bullets: [String(action.text || "").trim()].filter(Boolean),
          };
          cv.experience = [...(cv.experience || []), newExp];
          log.bullets_added++;
          return cv;
        }
        log.failed.push({ action, reason: "no experience and no exp context to create one" });
        return cv;
      }
      const exp = cv.experience[idx];
      if (typeof action.text !== "string" || !action.text.trim()) {
        log.failed.push({ action, reason: "missing text" });
        return cv;
      }
      const newBullets = [...(Array.isArray(exp.bullets) ? exp.bullets : []), action.text.trim()];
      cv.experience = [...cv.experience];
      cv.experience[idx] = { ...exp, bullets: newBullets };
      log.bullets_added++;
      return cv;
    }

    default:
      log.failed.push({ action, reason: "unknown action type: " + action.type });
      return cv;
  }
}

function buildSummary(log, lang) {
  const parts = [];
  if (log.bullets_replaced > 0) {
    parts.push(lang === "en"
      ? log.bullets_replaced + " bullet" + (log.bullets_replaced > 1 ? "s" : "") + " rewritten"
      : log.bullets_replaced + " bullet" + (log.bullets_replaced > 1 ? "s" : "") + " reecrit" + (log.bullets_replaced > 1 ? "s" : ""));
  }
  if (log.bullets_added > 0) {
    parts.push(lang === "en"
      ? log.bullets_added + " added"
      : log.bullets_added + " ajoute" + (log.bullets_added > 1 ? "s" : ""));
  }
  if (log.bullets_deleted > 0) {
    parts.push(lang === "en"
      ? log.bullets_deleted + " removed"
      : log.bullets_deleted + " supprime" + (log.bullets_deleted > 1 ? "s" : ""));
  }
  if (log.summary_changes > 0) {
    parts.push(lang === "en" ? "summary updated" : "accroche mise a jour");
  }
  if (log.title_changes > 0) {
    parts.push(lang === "en" ? "title updated" : "titre mis a jour");
  }
  if (parts.length === 0) return "";
  return parts.join(", ");
}

export function applyCoachActions(cv, actions, opts = {}) {
  const lang = opts.lang || "fr";

  const log = {
    bullets_replaced: 0,
    bullets_deleted: 0,
    bullets_added: 0,
    summary_changes: 0,
    title_changes: 0,
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

  const applied = log.bullets_replaced + log.bullets_deleted + log.bullets_added
                + log.summary_changes + log.title_changes;

  return {
    newCv: next,
    applied,
    failed: log.failed,
    summary: buildSummary(log, lang),
  };
}

export default applyCoachActions;
