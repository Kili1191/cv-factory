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

function pruneCacheStorage() {
  if (typeof window === "undefined") return;
  try {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) {
        keys.push(k);
      }
    }
    const entries = keys
      .map((k) => {
        const v = lsGetSafe(k);
        return v ? { key: k, ts: v.ts || 0 } : { key: k, ts: 0 };
      })
      .sort((a, b) => a.ts - b.ts);
    const toRemove = entries.slice(0, Math.max(0, entries.length - CACHE_MAX_ENTRIES + 5));
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

export function readCache(taskName, cvObject, extraInputs) {
  const key = buildCacheKey(taskName, cvObject, extraInputs);
  const entry = lsGetSafe(key);
  if (!entry) return null;
  if (typeof entry.ts !== "number" || Date.now() - entry.ts > CACHE_TTL_MS) {
    return null;
  }
  return entry.value;
}

export function writeCache(taskName, cvObject, extraInputs, value) {
  const key = buildCacheKey(taskName, cvObject, extraInputs);
  lsSetSafe(key, { ts: Date.now(), value });
}

export function invalidateCacheForTask(taskName) {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(`${CACHE_PREFIX}${taskName}_`)) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      window.localStorage.removeItem(k);
    }
  } catch (e) {}
}

export function clearAllAiCache() {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      window.localStorage.removeItem(k);
    }
  } catch (e) {}
}

export async function cachedAiCall(taskName, cvObject, extraInputs, fetcherFn) {
  const cached = readCache(taskName, cvObject, extraInputs);
  if (cached !== null) {
    return { value: cached, fromCache: true };
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
        const taskMatch = k.replace(CACHE_PREFIX, "").split("_")[0];
        hitsByTask[taskMatch] = (hitsByTask[taskMatch] || 0) + 1;
      }
    }
    return { entries, sizeBytes, hitsByTask };
  } catch (e) {
    return { entries: 0, sizeBytes: 0, hitsByTask: {}, error: e.message };
  }
}
