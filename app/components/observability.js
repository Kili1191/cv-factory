const LOG_KEY = "cvf_api_log";
const LOG_MAX_ENTRIES = 500;

export function logApiCall(meta) {
  if (typeof window === "undefined") return;
  if (!meta || typeof meta !== "object") return;

  try {
    const log = JSON.parse(window.localStorage.getItem(LOG_KEY) || "[]");
    const entry = {
      ts: Date.now(),
      task_name: meta.task_name || "unknown",
      elapsed_ms: meta.elapsed_ms || 0,
      input_tokens: meta.input_tokens || 0,
      output_tokens: meta.output_tokens || 0,
      cache_read_tokens: meta.cache_read_tokens || 0,
      cache_creation_tokens: meta.cache_creation_tokens || 0,
      cached_ratio_pct: meta.cached_ratio_pct || 0,
      cost_usd: meta.cost_usd || 0,
      cost_eur: meta.cost_eur || 0,
      from_cache: meta.from_cache || false,
      error: meta.error || false,
    };
    log.push(entry);
    const trimmed = log.slice(-LOG_MAX_ENTRIES);
    window.localStorage.setItem(LOG_KEY, JSON.stringify(trimmed));
  } catch (e) {}
}

export function getApiLog() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LOG_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

export function clearApiLog() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LOG_KEY);
  } catch (e) {}
}

export function getApiStats(periodMs) {
  const log = getApiLog();
  const cutoff = periodMs ? Date.now() - periodMs : 0;
  const entries = log.filter((e) => e.ts >= cutoff);

  const stats = {
    total_calls: entries.length,
    successful_calls: 0,
    error_calls: 0,
    cache_hits: 0,
    total_input_tokens: 0,
    total_output_tokens: 0,
    total_cache_read_tokens: 0,
    total_cache_creation_tokens: 0,
    total_cost_usd: 0,
    total_cost_eur: 0,
    avg_elapsed_ms: 0,
    avg_cached_ratio: 0,
    by_task: {},
    by_day: {},
    cache_savings_usd: 0,
  };

  let elapsedSum = 0;
  let cachedRatioSum = 0;

  for (const e of entries) {
    if (e.error) {
      stats.error_calls += 1;
    } else {
      stats.successful_calls += 1;
    }
    if (e.from_cache) {
      stats.cache_hits += 1;
    }

    stats.total_input_tokens += e.input_tokens;
    stats.total_output_tokens += e.output_tokens;
    stats.total_cache_read_tokens += e.cache_read_tokens;
    stats.total_cache_creation_tokens += e.cache_creation_tokens;
    stats.total_cost_usd += e.cost_usd;
    stats.total_cost_eur += e.cost_eur;

    elapsedSum += e.elapsed_ms;
    cachedRatioSum += e.cached_ratio_pct;

    if (!stats.by_task[e.task_name]) {
      stats.by_task[e.task_name] = { calls: 0, cost_usd: 0, cost_eur: 0, tokens_in: 0, tokens_out: 0 };
    }
    stats.by_task[e.task_name].calls += 1;
    stats.by_task[e.task_name].cost_usd += e.cost_usd;
    stats.by_task[e.task_name].cost_eur += e.cost_eur;
    stats.by_task[e.task_name].tokens_in += e.input_tokens + e.cache_read_tokens;
    stats.by_task[e.task_name].tokens_out += e.output_tokens;

    const dayKey = new Date(e.ts).toISOString().split("T")[0];
    if (!stats.by_day[dayKey]) {
      stats.by_day[dayKey] = { calls: 0, cost_usd: 0, cost_eur: 0 };
    }
    stats.by_day[dayKey].calls += 1;
    stats.by_day[dayKey].cost_usd += e.cost_usd;
    stats.by_day[dayKey].cost_eur += e.cost_eur;
  }

  if (entries.length > 0) {
    stats.avg_elapsed_ms = Math.round(elapsedSum / entries.length);
    stats.avg_cached_ratio = Math.round(cachedRatioSum / entries.length);
  }

  const cacheSavingsRatio = 0.90;
  stats.cache_savings_usd = (stats.total_cache_read_tokens * 3 * cacheSavingsRatio) / 1_000_000;

  return stats;
}

export function detectDuplicates(periodMs) {
  const log = getApiLog();
  const cutoff = periodMs ? Date.now() - periodMs : 0;
  const entries = log.filter((e) => e.ts >= cutoff);
  const duplicates = [];

  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      if (entries[i].task_name === entries[j].task_name &&
          Math.abs(entries[i].ts - entries[j].ts) < 60000 &&
          entries[i].input_tokens === entries[j].input_tokens) {
        duplicates.push({
          task: entries[i].task_name,
          gap_seconds: Math.round((entries[j].ts - entries[i].ts) / 1000),
          cost_wasted_usd: entries[j].cost_usd,
        });
      }
    }
  }

  return {
    count: duplicates.length,
    total_wasted_usd: duplicates.reduce((sum, d) => sum + d.cost_wasted_usd, 0),
    examples: duplicates.slice(0, 10),
  };
}
