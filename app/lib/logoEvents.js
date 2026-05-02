"use client";

// Bus d'evenements pour piloter le logo depuis n'importe ou dans l'app
// Usage:
//   import { triggerCelebration, setThinking } from "../lib/logoEvents";
//   triggerCelebration("mega"); // declenche le feu d'artifice
//   setThinking(true); // active l'animation thinking
//   setThinking(false); // desactive

const LISTENERS = new Set();

export function subscribe(callback) {
  LISTENERS.add(callback);
  return () => LISTENERS.delete(callback);
}

function emit(event) {
  LISTENERS.forEach((cb) => {
    try { cb(event); } catch (e) { console.warn("logoEvents listener error", e); }
  });
}

export function triggerCelebration(level) {
  // level: "micro" | "mini" | "big" | "mega"
  emit({ type: "celebrate", level });
}

export function setThinking(active) {
  emit({ type: "thinking", active: !!active });
}

// Vibrations mobile - respect le toggle utilisateur stocke dans localStorage
const VIBE_KEY = "cvf_vibe";

export function isVibrationEnabled() {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(VIBE_KEY);
    return v === null ? true : v === "1";
  } catch (e) { return true; }
}

export function setVibrationEnabled(enabled) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VIBE_KEY, enabled ? "1" : "0");
  } catch (e) {}
}

export function vibratePattern(pattern) {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  if (!isVibrationEnabled()) return;
  try { navigator.vibrate(pattern); } catch (e) {}
}

// Patterns predefinis par niveau de celebration
export const VIBE_PATTERNS = {
  micro: [15],
  mini: [20, 50, 20],
  big: [30, 80, 50, 100, 50],
  mega: [40, 60, 40, 60, 80, 100, 40, 60, 200],
};
