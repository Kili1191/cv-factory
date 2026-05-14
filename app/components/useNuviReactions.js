"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useNuviReactions v2 - Hook gestion des reactions emotionnelles de Nuvi
 *
 * v1 : 11 triggers (5 auto + 6 manuels)
 * v2 : + 5 nouveaux triggers (cheshire, monocle, wizard, walking, monocycle)
 *      + 1 trigger easter egg (biglogo via Konami code)
 *
 * Usage :
 *   const { expression, mode, triggerEvent } = useNuviReactions();
 *   triggerEvent('feature-completed');  // expression
 *   triggerEvent('walking-trigger');    // mode
 */

const COOLDOWN_MS = 30000; // Min 30s entre reactions

const REACTION_DURATION = {
  // === Existants v1 ===
  'first-visit-today': 3500,
  'audit-excellent': 5000,
  'audit-low': 4500,
  'feature-completed': 4000,
  'cv-exported': 5000,
  'inactive-back': 3500,
  'inactive-long': 60000,
  'night-time': 60000,
  'morning-time': 60000,
  'api-error': 3500,
  'coach-clicked': 1500,
  'paste-detected': 800,
  // === Nouveaux v2 ===
  'truth-check-done': 4000,        // monocle
  'audit-ats-done': 5000,           // wizard
  'idle-writing': 8000,             // walking
  'easter-egg-monocycle': 5500,     // monocycle traverse
  'easter-egg-biglogo': 3500,       // BigLogo Konami
  'cheshire-trigger': 3500,         // cheshire smile manuel
};

// Map trigger -> expression name (pour mode="expression")
const EVENT_TO_EXPRESSION = {
  'first-visit-today': 'wink',
  'audit-excellent': 'celebrating',
  'audit-low': 'sad',
  'feature-completed': 'proud',
  'cv-exported': 'celebrating',
  'inactive-back': 'joy',
  'inactive-long': 'tired',
  'night-time': 'tired',
  'morning-time': 'wink',
  'api-error': 'scared',
  'coach-clicked': 'curious',
  'paste-detected': 'wink',
  // === Nouveaux v2 (expressions) ===
  'truth-check-done': 'monocle',
  'audit-ats-done': 'wizard',
  'cheshire-trigger': 'cheshire',
};

// Map trigger -> mode name (pour mode="walking" ou "monocycle")
// Ces triggers retournent un MODE complet, pas une expression
const EVENT_TO_MODE = {
  'idle-writing': 'walking',
  'easter-egg-monocycle': 'monocycle',
};

// Priorite des events (pour resoudre les conflits)
const EVENT_PRIORITY = {
  'cv-exported': 10,
  'audit-excellent': 9,
  'audit-ats-done': 9,
  'truth-check-done': 8,
  'feature-completed': 8,
  'audit-low': 8,
  'api-error': 7,
  'inactive-back': 6,
  'easter-egg-biglogo': 6,
  'easter-egg-monocycle': 6,
  'first-visit-today': 5,
  'cheshire-trigger': 4,
  'coach-clicked': 4,
  'paste-detected': 3,
  'idle-writing': 3,
  'night-time': 2,
  'morning-time': 2,
  'inactive-long': 1,
};

export function useNuviReactions() {
  const [expression, setExpression] = useState(null);
  const [mode, setMode] = useState(null);
  const [bigLogoActive, setBigLogoActive] = useState(false);
  const lastTriggerTime = useRef(0);
  const lastTriggerEvent = useRef(null);
  const currentTimer = useRef(null);
  const inactivityTimer = useRef(null);

  // === Clear current animation ===
  const clearCurrent = useCallback(() => {
    if (currentTimer.current) {
      clearTimeout(currentTimer.current);
      currentTimer.current = null;
    }
    setExpression(null);
    setMode(null);
    setBigLogoActive(false);
  }, []);

  // === Public trigger function ===
  const triggerEvent = useCallback((eventName, options = {}) => {
    const now = Date.now();
    const isPriority = options.priority || EVENT_PRIORITY[eventName] || 0;
    const lastPriority = EVENT_PRIORITY[lastTriggerEvent.current] || 0;
    const sinceLastMs = now - lastTriggerTime.current;

    // Cooldown check : si recent ET priorite inferieure, ignore
    if (sinceLastMs < COOLDOWN_MS && isPriority <= lastPriority && !options.force) {
      return false;
    }

    const duration = REACTION_DURATION[eventName] || 3000;
    const expr = EVENT_TO_EXPRESSION[eventName];
    const modeName = EVENT_TO_MODE[eventName];

    // Clear pending timer
    if (currentTimer.current) clearTimeout(currentTimer.current);

    // BigLogo special case
    if (eventName === 'easter-egg-biglogo') {
      setBigLogoActive(true);
      setExpression(null);
      setMode(null);
      lastTriggerTime.current = now;
      lastTriggerEvent.current = eventName;
      currentTimer.current = setTimeout(() => {
        setBigLogoActive(false);
        lastTriggerEvent.current = null;
      }, duration);
      return true;
    }

    // Mode trigger (walking, monocycle)
    if (modeName) {
      setMode(modeName);
      setExpression(null);
      lastTriggerTime.current = now;
      lastTriggerEvent.current = eventName;
      currentTimer.current = setTimeout(() => {
        setMode(null);
        lastTriggerEvent.current = null;
      }, duration);
      return true;
    }

    // Expression trigger
    if (expr) {
      setExpression(expr);
      setMode(null);
      lastTriggerTime.current = now;
      lastTriggerEvent.current = eventName;
      currentTimer.current = setTimeout(() => {
        setExpression(null);
        lastTriggerEvent.current = null;
      }, duration);
      return true;
    }

    return false;
  }, []);

  // === Auto triggers (first-visit, morning, night, inactive) ===
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // First visit today
    const lastVisit = localStorage.getItem('nv-last-visit-day');
    const today = new Date().toDateString();
    if (lastVisit !== today) {
      localStorage.setItem('nv-last-visit-day', today);
      setTimeout(() => triggerEvent('first-visit-today'), 1500);
    }

    // Morning / night time
    const hour = new Date().getHours();
    if (hour >= 6 && hour <= 9) {
      setTimeout(() => triggerEvent('morning-time'), 2500);
    } else if (hour >= 23 || hour <= 4) {
      setTimeout(() => triggerEvent('night-time'), 2500);
    }

    // === Inactive long detection ===
    const resetInactivity = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => {
        triggerEvent('inactive-long');
      }, 10 * 60 * 1000); // 10 min
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetInactivity, { passive: true }));
    resetInactivity();

    // === Visibility (inactive-back) ===
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        triggerEvent('inactive-back');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivity));
      document.removeEventListener('visibilitychange', onVisibility);
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (currentTimer.current) clearTimeout(currentTimer.current);
    };
  }, [triggerEvent]);

  // === Konami code listener (easter egg) ===
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
                    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
                    'KeyB', 'KeyA'];
    let buffer = [];
    const onKey = (e) => {
      buffer.push(e.code);
      if (buffer.length > konami.length) buffer.shift();
      if (buffer.length === konami.length && buffer.every((k, i) => k === konami[i])) {
        // KONAMI ACTIVATED
        triggerEvent('easter-egg-biglogo', { force: true });
        buffer = [];
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [triggerEvent]);

  return {
    expression,
    mode,
    bigLogoActive,
    triggerEvent,
  };
}
