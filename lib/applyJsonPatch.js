// lib/applyJsonPatch.js (2026-05-20)
//
// Applique des operations JSON Patch (RFC 6902) sur un CV.
// Permet a l'IA de faire N'IMPORTE QUELLE modification du CV en composant
// des operations standard (add, remove, replace, move, copy, test).
//
// Beaucoup plus puissant que les 31 actions structurees : couvre 100% des
// cas possibles. L'IA n'est plus limitee a un set d'actions predefinies.
//
// Format d'une operation :
//   { op: "replace", path: "/experience/0/bullets/2", value: "..." }
//   { op: "remove",  path: "/experience/3" }
//   { op: "add",     path: "/experience/0/bullets/-", value: "..." }
//   { op: "move",    from: "/experience/2", path: "/experience/0" }
//   { op: "copy",    from: "/experience/1", path: "/experience/-" }
//   { op: "test",    path: "/title", value: "Senior PM" }
//
// Path RFC 6901 :
//   ""                       = le document entier (racine)
//   /experience/0/bullets/2  = cv.experience[0].bullets[2]
//   /experience/0/bullets/-  = append a la fin de bullets
//   /summary                 = cv.summary
//
// ATOMICITE (RFC 6902 sect. 5) : par defaut, si UNE operation echoue, aucune
// n'est appliquee et le CV d'origine est renvoye tel quel. C'est ce qui rend
// l'op "test" utile comme garde. Passer { atomic: false } pour l'ancien
// comportement best-effort.
//
// Renvoie { newCv, applied, failed, summary, realChange, rolledBack }

function deepClone(obj) {
  try { if (typeof structuredClone === "function") return structuredClone(obj); } catch (e) {}
  return JSON.parse(JSON.stringify(obj));
}

// ============================================================================
// Path parser (RFC 6901)
// ============================================================================

// Segments qui permettraient d'atteindre la chaine de prototypes. Les
// operations viennent d'une reponse LLM : on ne leur fait pas confiance.
const FORBIDDEN_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);

function parsePath(path) {
  if (typeof path !== "string") {
    throw new Error("Invalid JSON Pointer path: " + path);
  }
  // "" = le document entier (RFC 6901 sect. 5)
  if (path === "") return [];
  if (!path.startsWith("/")) {
    throw new Error("Invalid JSON Pointer path: " + path);
  }
  // "/" designe la cle vide "", pas la racine
  const tokens = path === "/"
    ? [""]
    : path.split("/").slice(1).map(seg =>
        seg.replace(/~1/g, "/").replace(/~0/g, "~")
      );
  for (const seg of tokens) {
    if (FORBIDDEN_SEGMENTS.has(seg)) {
      throw new Error("Forbidden path segment: " + seg);
    }
  }
  return tokens;
}

// Un token est-il un index de tableau ("0", "12", "-") ?
function isArrayToken(token) {
  return token === "-" || /^(0|[1-9][0-9]*)$/.test(token);
}

// Descend jusqu'au parent du dernier token.
// create = true : cree les conteneurs manquants sur le chemin (pour "add"),
// en choisissant tableau ou objet selon la forme du token suivant.
function walkToParent(doc, tokens, path, create) {
  let parent = doc;
  for (let i = 0; i < tokens.length - 1; i++) {
    if (parent == null || typeof parent !== "object") {
      throw new Error("Path not found: " + path);
    }
    const token = tokens[i];
    let child = parent[token];
    if (child === undefined && create) {
      child = isArrayToken(tokens[i + 1]) ? [] : {};
      if (Array.isArray(parent)) {
        // On ne cree pas de trous dans un tableau
        const idx = parseInt(token, 10);
        if (token === "-" || isNaN(idx) || idx < 0 || idx > parent.length) {
          throw new Error("Invalid array index: " + token);
        }
        parent[idx] = child;
      } else {
        parent[token] = child;
      }
    }
    parent = child;
  }
  return parent;
}

// ============================================================================
// Get value at path (returns { parent, key, value })
// ============================================================================
function getAtPath(doc, path) {
  const tokens = parsePath(path);
  if (tokens.length === 0) return { parent: null, key: null, value: doc };
  const parent = walkToParent(doc, tokens, path, false);
  const key = tokens[tokens.length - 1];
  const value = (parent != null && typeof parent === "object") ? parent[key] : undefined;
  return { parent, key, value };
}

// ============================================================================
// JSON Patch operations
// ============================================================================
function opAdd(doc, path, value) {
  const tokens = parsePath(path);
  if (tokens.length === 0) return value; // replace root

  const parent = walkToParent(doc, tokens, path, true);
  const key = tokens[tokens.length - 1];

  if (Array.isArray(parent)) {
    if (key === "-") {
      parent.push(value);
    } else {
      const idx = parseInt(key, 10);
      if (isNaN(idx) || idx < 0 || idx > parent.length) {
        throw new Error("Invalid array index: " + key);
      }
      parent.splice(idx, 0, value);
    }
  } else if (parent != null && typeof parent === "object") {
    parent[key] = value;
  } else {
    throw new Error("Cannot add to path: " + path);
  }
  return doc;
}

function opRemove(doc, path) {
  const tokens = parsePath(path);
  if (tokens.length === 0) throw new Error("Cannot remove root");

  const parent = walkToParent(doc, tokens, path, false);
  const key = tokens[tokens.length - 1];

  if (Array.isArray(parent)) {
    const idx = parseInt(key, 10);
    if (isNaN(idx) || idx < 0 || idx >= parent.length) {
      throw new Error("Invalid array index for remove: " + key);
    }
    parent.splice(idx, 1);
  } else if (parent != null && typeof parent === "object") {
    if (!Object.prototype.hasOwnProperty.call(parent, key)) {
      throw new Error("Key not found: " + key);
    }
    delete parent[key];
  } else {
    throw new Error("Cannot remove from path: " + path);
  }
  return doc;
}

function opReplace(doc, path, value) {
  const tokens = parsePath(path);
  if (tokens.length === 0) return value; // replace root

  const parent = walkToParent(doc, tokens, path, false);
  const key = tokens[tokens.length - 1];

  if (Array.isArray(parent)) {
    const idx = parseInt(key, 10);
    if (isNaN(idx) || idx < 0 || idx >= parent.length) {
      throw new Error("Invalid array index for replace: " + key);
    }
    parent[idx] = value;
  } else if (parent != null && typeof parent === "object") {
    parent[key] = value;
  } else {
    throw new Error("Cannot replace at path: " + path);
  }
  return doc;
}

// Lit la valeur pointee par "from" (sans la retirer).
function readFrom(doc, from, label) {
  const tokens = parsePath(from);
  if (tokens.length === 0) return doc;
  const parent = walkToParent(doc, tokens, from, false);
  const key = tokens[tokens.length - 1];
  if (Array.isArray(parent)) {
    const idx = parseInt(key, 10);
    if (isNaN(idx) || idx < 0 || idx >= parent.length) {
      throw new Error("Invalid array index for " + label + ": " + key);
    }
    return parent[idx];
  }
  if (parent != null && typeof parent === "object") {
    if (!Object.prototype.hasOwnProperty.call(parent, key)) {
      throw new Error("Cannot " + label + " from: " + from);
    }
    return parent[key];
  }
  throw new Error("Cannot " + label + " from: " + from);
}

// RFC 6902 : "from" ne doit pas etre un prefixe de "path"
// (on ne peut pas deplacer un noeud dans son propre sous-arbre).
function assertNotPrefix(from, path) {
  if (path === from || path.startsWith(from + "/")) {
    throw new Error("Cannot move a location into one of its children: " + from);
  }
}

function opMove(doc, from, path) {
  assertNotPrefix(from, path);
  const value = readFrom(doc, from, "move");
  // RFC 6902 : remove puis add. Les index du tableau cible sont donc
  // evalues APRES le retrait.
  opRemove(doc, from);
  return opAdd(doc, path, value);
}

function opCopy(doc, from, path) {
  const value = readFrom(doc, from, "copy");
  // deepClone la valeur pour eviter les references partagees
  return opAdd(doc, path, deepClone(value));
}

function opTest(doc, path, value) {
  const { value: current } = getAtPath(doc, path);
  if (JSON.stringify(current) !== JSON.stringify(value)) {
    throw new Error("Test failed at " + path);
  }
  return doc;
}

// ============================================================================
// Dedup education vs certifications (fuzzy match)
// Si un meme item apparait dans education ET certifications, on le garde
// uniquement dans la section la plus probable :
//   - "Diploma", "Master", "Bachelor", "BTS", "Licence", "MBA" -> education
//   - tout le reste -> certifications
// ============================================================================

// Une certification peut etre une string OU un objet { name } / { title } / { label }.
function certText(c) {
  if (c == null) return "";
  if (typeof c === "string") return c;
  if (typeof c === "object") return String(c.name || c.title || c.label || "");
  return String(c);
}

function normalizeForCompare(s) {
  if (!s) return "";
  return String(s)
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Mots-cles diplomes academiques (FR + EN).
// Compares en MOTS ENTIERS : "ba" ne doit pas matcher "database",
// "cap" ne doit pas matcher "capacity", "but" ne doit pas matcher "distribution".
const ACADEMIC_KEYWORDS = [
  "diploma", "diplome", "bachelor", "licence", "master", "mba",
  "doctorat", "phd", "bts", "dut", "but", "bep", "cap",
  "ingenieur", "engineer", "doctorate", "msc", "ba", "bsc",
  "level 7", "level 6", "level 5", "level 8", "rqf",
  "ecole", "universite", "university", "school", "faculty", "faculte",
];

function looksLikeAcademic(text) {
  const t = normalizeForCompare(certText(text));
  if (!t) return false;
  const words = t.split(" ");
  return ACADEMIC_KEYWORDS.some(kw => {
    if (kw.includes(" ")) {
      // Expression multi-mots : match sur mots entiers dans la phrase
      return (" " + t + " ").includes(" " + kw + " ");
    }
    return words.includes(kw);
  });
}

function dedupEducationCertifications(cv, log) {
  const edu = Array.isArray(cv.education) ? cv.education : [];
  const certs = Array.isArray(cv.certifications) ? cv.certifications : [];
  if (edu.length === 0 || certs.length === 0) return cv;

  // Index normalise des education (par degree)
  const eduNorms = edu.map(e => normalizeForCompare((e && e.degree) || ""));

  const certsToRemove = new Set();
  const eduToRemove = new Set();

  // Pour chaque certification, regarde si match avec une education
  for (let i = 0; i < certs.length; i++) {
    if (certsToRemove.has(i)) continue;
    const certNorm = normalizeForCompare(certText(certs[i]));
    if (!certNorm) continue;

    for (let j = 0; j < eduNorms.length; j++) {
      if (eduToRemove.has(j)) continue;
      const eduNorm = eduNorms[j];
      if (!eduNorm) continue;

      // Match si >= 2 mots significatifs DISTINCTS en commun
      const certWords = new Set(certNorm.split(" ").filter(w => w.length >= 4));
      const eduWords = new Set(eduNorm.split(" ").filter(w => w.length >= 4));
      let common = 0;
      for (const w of certWords) if (eduWords.has(w)) common++;
      if (common < 2) continue;

      // Doublon detecte. Decider quelle section garde l'item.
      const certIsAcademic = looksLikeAcademic(certs[i]);
      const eduIsAcademic = looksLikeAcademic(edu[j].degree);

      if (eduIsAcademic && !certIsAcademic) {
        // Cas standard : item academique mal mis aussi en certifs -> garde edu
        certsToRemove.add(i);
      } else if (certIsAcademic && !eduIsAcademic) {
        // Inverse : item certif mal mis aussi en education -> garde certif
        eduToRemove.add(j);
      } else if (eduIsAcademic && certIsAcademic) {
        // Tous deux academiques : garde education (plus pertinent)
        certsToRemove.add(i);
      } else {
        // Aucun n'est academique : c'est probablement une certification pro
        // dupliquee a tort dans education -> garde dans certifications
        eduToRemove.add(j);
      }
      break;
    }
  }

  if (certsToRemove.size > 0) {
    cv.certifications = certs.filter((_, i) => !certsToRemove.has(i));
  }
  if (eduToRemove.size > 0) {
    cv.education = edu.filter((_, i) => !eduToRemove.has(i));
  }

  const total = certsToRemove.size + eduToRemove.size;
  if (total > 0) {
    log.dedup_removed = (log.dedup_removed || 0) + total;
  }

  return cv;
}

// ============================================================================
// Apply patch (main API)
// ============================================================================
export function applyJsonPatch(cv, operations, opts = {}) {
  const lang = opts.lang || "fr";
  const skipDedup = opts.skipDedup === true;
  // RFC 6902 : tout ou rien. { atomic: false } pour l'ancien best-effort.
  const atomic = opts.atomic !== false;

  const empty = {
    newCv: cv, applied: 0, failed: [], summary: "",
    realChange: false, rolledBack: false, dedupRemoved: 0,
  };
  if (!cv || typeof cv !== "object") return empty;
  if (!Array.isArray(operations) || operations.length === 0) return empty;

  // Snapshot avant modification (pour detection realChange)
  const before = JSON.stringify(cv);

  let next = deepClone(cv);
  const failed = [];
  let applied = 0;
  let tested = 0;

  // Stats par categorie pour summary
  const stats = {
    bullets: 0,
    experiences: 0,
    education: 0,
    skills: 0,
    languages: 0,
    certifications: 0,
    profile: 0,
    personal: 0,
    other: 0,
  };

  for (const operation of operations) {
    if (!operation || typeof operation !== "object" || !operation.op) {
      failed.push({ operation, reason: "invalid operation shape" });
      continue;
    }
    try {
      switch (operation.op) {
        case "add":
          next = opAdd(next, operation.path, operation.value);
          break;
        case "remove":
          next = opRemove(next, operation.path);
          break;
        case "replace":
          next = opReplace(next, operation.path, operation.value);
          break;
        case "move":
          next = opMove(next, operation.from, operation.path);
          break;
        case "copy":
          next = opCopy(next, operation.from, operation.path);
          break;
        case "test":
          next = opTest(next, operation.path, operation.value);
          // "test" ne modifie rien : ni compte comme applique, ni statistique
          tested++;
          continue;
        default:
          failed.push({ operation, reason: "unknown op: " + operation.op });
          continue;
      }
      applied++;
      // Track stats par categorie pour summary
      const p = operation.path || "";
      if (p.includes("/bullets")) stats.bullets++;
      else if (p.startsWith("/experience")) stats.experiences++;
      else if (p.startsWith("/education")) stats.education++;
      else if (p.startsWith("/skills")) stats.skills++;
      else if (p.startsWith("/languages")) stats.languages++;
      else if (p.startsWith("/certifications")) stats.certifications++;
      else if (p === "/summary" || p === "/title") stats.profile++;
      else if (["/name", "/email", "/phone", "/location", "/linkedin"].includes(p)) stats.personal++;
      else stats.other++;
    } catch (err) {
      failed.push({ operation, reason: err.message });
      if (atomic) {
        // Rollback complet : le CV d'origine ressort intact.
        return {
          newCv: cv, applied: 0, failed, summary: "",
          realChange: false, rolledBack: true, dedupRemoved: 0,
        };
      }
    }
  }

  // ========================================================================
  // POST-PATCH : dedup education vs certifications
  // Si l'IA a accidentellement mis le meme item dans les 2 sections,
  // on supprime le doublon en gardant le plus pertinent (academique = education)
  // ========================================================================
  const dedupLog = {};
  if (!skipDedup) {
    next = dedupEducationCertifications(next, dedupLog);
  }

  // Detection realChange : compare JSON avant/apres
  const after = JSON.stringify(next);
  const realChange = before !== after;

  // Build summary lisible
  const isEn = lang === "en";
  const parts = [];
  const n = (count, en, enPlural, fr, frPlural) =>
    count + " " + (isEn ? (count > 1 ? enPlural : en) : (count > 1 ? frPlural : fr));

  if (stats.bullets > 0) parts.push(n(stats.bullets, "bullet op", "bullet ops", "modif bullet", "modifs bullets"));
  if (stats.experiences > 0) parts.push(n(stats.experiences, "experience op", "experience ops", "modif exp", "modifs exps"));
  if (stats.education > 0) parts.push(n(stats.education, "education op", "education ops", "modif formation", "modifs formations"));
  if (stats.skills > 0) parts.push(n(stats.skills, "skill op", "skill ops", "modif competence", "modifs competences"));
  if (stats.languages > 0) parts.push(n(stats.languages, "language op", "language ops", "modif langue", "modifs langues"));
  if (stats.certifications > 0) parts.push(n(stats.certifications, "certification op", "certification ops", "modif certif", "modifs certifs"));
  if (stats.profile > 0) parts.push(isEn ? "profile updated" : "profil mis a jour");
  if (stats.personal > 0) parts.push(isEn ? "personal info updated" : "infos mises a jour");
  if (dedupLog.dedup_removed > 0) {
    parts.push(n(dedupLog.dedup_removed, "duplicate removed", "duplicates removed", "doublon supprime", "doublons supprimes"));
  }
  const summary = parts.join(", ");

  return {
    newCv: next,
    applied,
    tested,
    failed,
    summary,
    realChange,
    rolledBack: false,
    dedupRemoved: dedupLog.dedup_removed || 0,
  };
}

export default applyJsonPatch;
export { dedupEducationCertifications };

// ============================================================
// cleanupCv : applique le dedup education/certifications sans patch
// A utiliser apres import CV, apres generation, ou via bouton "Nettoyer"
// ============================================================
export function cleanupCv(cv, opts = {}) {
  const lang = opts.lang || "fr";
  if (!cv || typeof cv !== "object") {
    return { newCv: cv, changed: false, dedupRemoved: 0, summary: "" };
  }

  const before = JSON.stringify(cv);
  let next = deepClone(cv);
  const log = {};

  // Run dedup
  next = dedupEducationCertifications(next, log);

  const after = JSON.stringify(next);
  const changed = before !== after;
  const dedupRemoved = log.dedup_removed || 0;

  let summary = "";
  if (dedupRemoved > 0) {
    summary = lang === "en"
      ? dedupRemoved + (dedupRemoved > 1 ? " duplicates removed" : " duplicate removed")
      : dedupRemoved + (dedupRemoved > 1 ? " doublons supprimes" : " doublon supprime");
  }

  return { newCv: next, changed, dedupRemoved, summary };
}
