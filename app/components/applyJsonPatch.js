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
//   /experience/0/bullets/2  = cv.experience[0].bullets[2]
//   /experience/0/bullets/-  = append a la fin de bullets
//   /summary                 = cv.summary
//
// Renvoie { newCv, applied, failed, summary, realChange }

function deepClone(obj) {
  try { if (typeof structuredClone === "function") return structuredClone(obj); } catch (e) {}
  return JSON.parse(JSON.stringify(obj));
}

// ============================================================================
// Path parser (RFC 6901)
// ============================================================================
function parsePath(path) {
  if (typeof path !== "string" || !path.startsWith("/")) {
    throw new Error("Invalid JSON Pointer path: " + path);
  }
  if (path === "/") return [""];
  return path.split("/").slice(1).map(seg =>
    seg.replace(/~1/g, "/").replace(/~0/g, "~")
  );
}

// ============================================================================
// Get value at path (returns { parent, key, value })
// ============================================================================
function getAtPath(doc, path) {
  const tokens = parsePath(path);
  if (tokens.length === 0) return { parent: null, key: null, value: doc };
  let parent = doc;
  for (let i = 0; i < tokens.length - 1; i++) {
    if (parent == null) throw new Error("Path not found: " + path);
    parent = parent[tokens[i]];
  }
  const key = tokens[tokens.length - 1];
  const value = parent != null ? parent[key] : undefined;
  return { parent, key, value };
}

// ============================================================================
// JSON Patch operations
// ============================================================================
function opAdd(doc, path, value) {
  const tokens = parsePath(path);
  if (tokens.length === 0) return value; // replace root

  let parent = doc;
  for (let i = 0; i < tokens.length - 1; i++) {
    if (parent == null) throw new Error("Add path not found: " + path);
    parent = parent[tokens[i]];
  }
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

  let parent = doc;
  for (let i = 0; i < tokens.length - 1; i++) {
    if (parent == null) throw new Error("Remove path not found: " + path);
    parent = parent[tokens[i]];
  }
  const key = tokens[tokens.length - 1];

  if (Array.isArray(parent)) {
    const idx = parseInt(key, 10);
    if (isNaN(idx) || idx < 0 || idx >= parent.length) {
      throw new Error("Invalid array index for remove: " + key);
    }
    parent.splice(idx, 1);
  } else if (parent != null && typeof parent === "object") {
    if (!(key in parent)) throw new Error("Key not found: " + key);
    delete parent[key];
  } else {
    throw new Error("Cannot remove from path: " + path);
  }
  return doc;
}

function opReplace(doc, path, value) {
  const tokens = parsePath(path);
  if (tokens.length === 0) return value; // replace root

  let parent = doc;
  for (let i = 0; i < tokens.length - 1; i++) {
    if (parent == null) throw new Error("Replace path not found: " + path);
    parent = parent[tokens[i]];
  }
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

function opMove(doc, from, path) {
  const fromTokens = parsePath(from);
  // Get value
  let parent = doc;
  for (let i = 0; i < fromTokens.length - 1; i++) {
    if (parent == null) throw new Error("Move 'from' path not found: " + from);
    parent = parent[fromTokens[i]];
  }
  const fromKey = fromTokens[fromTokens.length - 1];
  let value;
  if (Array.isArray(parent)) {
    const idx = parseInt(fromKey, 10);
    value = parent[idx];
  } else if (parent != null && typeof parent === "object") {
    value = parent[fromKey];
  } else {
    throw new Error("Cannot move from: " + from);
  }
  // Remove from old location
  opRemove(doc, from);
  // Add to new location
  return opAdd(doc, path, value);
}

function opCopy(doc, from, path) {
  const fromTokens = parsePath(from);
  let parent = doc;
  for (let i = 0; i < fromTokens.length - 1; i++) {
    if (parent == null) throw new Error("Copy 'from' path not found: " + from);
    parent = parent[fromTokens[i]];
  }
  const fromKey = fromTokens[fromTokens.length - 1];
  let value;
  if (Array.isArray(parent)) {
    value = parent[parseInt(fromKey, 10)];
  } else if (parent != null && typeof parent === "object") {
    value = parent[fromKey];
  } else {
    throw new Error("Cannot copy from: " + from);
  }
  // deepClone the value pour eviter shared references
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
// Apply patch (main API)
// ============================================================================
export function applyJsonPatch(cv, operations, opts = {}) {
  const lang = opts.lang || "fr";

  if (!cv || typeof cv !== "object") {
    return { newCv: cv, applied: 0, failed: [], summary: "", realChange: false };
  }
  if (!Array.isArray(operations) || operations.length === 0) {
    return { newCv: cv, applied: 0, failed: [], summary: "", realChange: false };
  }

  // Snapshot avant modification (pour detection realChange)
  const before = JSON.stringify(cv);

  let next = deepClone(cv);
  const failed = [];
  let applied = 0;

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
          break;
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
    }
  }

  // Detection realChange : compare JSON avant/apres
  const after = JSON.stringify(next);
  const realChange = before !== after;

  // Build summary lisible
  const isEn = lang === "en";
  const parts = [];
  if (stats.bullets > 0) parts.push(stats.bullets + (isEn ? " bullet ops" : " modif bullet" + (stats.bullets > 1 ? "s" : "")));
  if (stats.experiences > 0) parts.push(stats.experiences + (isEn ? " experience ops" : " modif exp" + (stats.experiences > 1 ? "s" : "")));
  if (stats.education > 0) parts.push(stats.education + (isEn ? " education ops" : " modif formation" + (stats.education > 1 ? "s" : "")));
  if (stats.skills > 0) parts.push(stats.skills + (isEn ? " skill ops" : " modif competence" + (stats.skills > 1 ? "s" : "")));
  if (stats.languages > 0) parts.push(stats.languages + (isEn ? " language ops" : " modif langue" + (stats.languages > 1 ? "s" : "")));
  if (stats.certifications > 0) parts.push(stats.certifications + (isEn ? " certification ops" : " modif certif" + (stats.certifications > 1 ? "s" : "")));
  if (stats.profile > 0) parts.push(isEn ? "profile updated" : "profil mis a jour");
  if (stats.personal > 0) parts.push(isEn ? "personal info updated" : "infos mises a jour");
  const summary = parts.join(", ");

  return { newCv: next, applied, failed, summary, realChange };
}

export default applyJsonPatch;
