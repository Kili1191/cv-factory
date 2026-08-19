const CACHE_PREFIX = "cvf_aicache_";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const CACHE_MAX_ENTRIES = 50;

function hashString(str) {
  if (typeof str !== "string") return "0";
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < str.length; i += 1) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function lsGetSafe(key) {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(key);
    return v ? JSON.parse(v) : null;
  } catch (e) {
    return null;
  }
}

function lsSetSafe(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    pruneCacheStorage();
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e2) {}
  }
}

function cacheKeys() {
  const keys = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(CACHE_PREFIX)) keys.push(k);
  }
  return keys;
}

// Ramene le cache a `keep` entrees en supprimant les plus anciennes.
// Appele apres chaque ecriture, pas seulement quand le quota explose :
// la cle contient un hash du CV, donc chaque edition cree une entree de plus.
function pruneCacheStorage(keep = CACHE_MAX_ENTRIES - 5) {
  if (typeof window === "undefined") return;
  try {
    const target = Math.max(0, keep);
    const entries = cacheKeys()
      .map((k) => {
        const v = lsGetSafe(k);
        return { key: k, ts: (v && typeof v.ts === "number") ? v.ts : 0 };
      })
      .sort((a, b) => a.ts - b.ts);
    const toRemove = entries.slice(0, Math.max(0, entries.length - target));
    for (const e of toRemove) {
      window.localStorage.removeItem(e.key);
    }
  } catch (e) {}
}

export function buildCacheKey(taskName, cvObject, extraInputs) {
  const cvSig = cvObject ? hashString(JSON.stringify(cvObject)) : "no-cv";
  const extraSig = extraInputs ? hashString(JSON.stringify(extraInputs)) : "no-extra";
  return `${CACHE_PREFIX}${taskName}_${cvSig}_${extraSig}`;
}

// Lecture interne : distingue le miss ({ hit: false }) d'une valeur
// legitimement nulle en cache ({ hit: true, value: null }).
function readCacheEntry(taskName, cvObject, extraInputs) {
  const key = buildCacheKey(taskName, cvObject, extraInputs);
  const entry = lsGetSafe(key);
  if (!entry || typeof entry !== "object") return { hit: false, value: null };
  if (typeof entry.ts !== "number" || Date.now() - entry.ts > CACHE_TTL_MS) {
    return { hit: false, value: null };
  }
  // `hasValue` distingue une valeur absente d'un `value: null` volontaire.
  // Les entrees ecrites avant l'ajout de ce flag n'ont pas la cle : on les
  // considere valides si elles portent un `value`.
  if (entry.hasValue === false) return { hit: false, value: null };
  if (entry.hasValue !== true && !("value" in entry)) return { hit: false, value: null };
  return { hit: true, value: entry.value === undefined ? null : entry.value };
}

export function readCache(taskName, cvObject, extraInputs) {
  return readCacheEntry(taskName, cvObject, extraInputs).value;
}

export function writeCache(taskName, cvObject, extraInputs, value) {
  // Ne jamais mettre en cache un `undefined` : JSON.stringify supprime la cle
  // et l'entree serait relue comme un hit servant `undefined` pendant 7 jours.
  if (value === undefined) return;
  const key = buildCacheKey(taskName, cvObject, extraInputs);
  lsSetSafe(key, { ts: Date.now(), hasValue: true, value });
  pruneCacheStorage();
}

export function invalidateCacheForTask(taskName) {
  if (typeof window === "undefined") return;
  try {
    const prefix = `${CACHE_PREFIX}${taskName}_`;
    for (const k of cacheKeys()) {
      if (k.startsWith(prefix)) window.localStorage.removeItem(k);
    }
  } catch (e) {}
}

export function clearAllAiCache() {
  if (typeof window === "undefined") return;
  try {
    for (const k of cacheKeys()) window.localStorage.removeItem(k);
  } catch (e) {}
}

export async function cachedAiCall(taskName, cvObject, extraInputs, fetcherFn) {
  const cached = readCacheEntry(taskName, cvObject, extraInputs);
  if (cached.hit) {
    return { value: cached.value, fromCache: true };
  }
  const value = await fetcherFn();
  writeCache(taskName, cvObject, extraInputs, value);
  return { value, fromCache: false };
}

export function getCacheStats() {
  if (typeof window === "undefined") {
    return { entries: 0, sizeBytes: 0, hitsByTask: {} };
  }
  try {
    let entries = 0;
    let sizeBytes = 0;
    const hitsByTask = {};
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) {
        const v = window.localStorage.getItem(k);
        entries += 1;
        sizeBytes += (v && v.length) || 0;
        // La cle vaut PREFIX + task + "_" + cvSig + "_" + extraSig, et un nom
        // de tache peut lui-meme contenir des "_" : on retire les DEUX
        // derniers segments plutot que de garder le premier.
        const rest = k.slice(CACHE_PREFIX.length);
        const taskMatch = rest.split("_").slice(0, -2).join("_") || rest;
        hitsByTask[taskMatch] = (hitsByTask[taskMatch] || 0) + 1;
      }
    }
    return { entries, sizeBytes, hitsByTask };
  } catch (e) {
    return { entries: 0, sizeBytes: 0, hitsByTask: {}, error: e.message };
  }
}
