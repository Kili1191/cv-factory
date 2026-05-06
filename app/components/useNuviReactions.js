"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// useNuviReactions — Hook de reactions contextuelles de Nuvi
//
// Surveille le contexte global et fait reagir Nuvi aux moments-cles
// avec une expression appropriee. Respecte les regles d'or :
//   1. Presence ambiante toujours (respire, vit subtilement)
//   2. Reactions rares (max 1/30sec, 5-7 par session)
//   3. Significatives (renforce wins, previent problemes)
//   4. Respect du flow (ne pas interrompre)
//   5. Celebrer les wins (pas les taches banales)
//
// 11 triggers actifs :
//   - first-visit-today    -> wink (bonjour)
//   - audit-excellent      -> celebrating
//   - audit-low            -> sad
//   - feature-completed    -> proud (Pack/Match/Score)
//   - cv-exported          -> celebrating
//   - inactive-back        -> joy (welcome back apres 5+ min)
//   - inactive-long        -> tired (10+ min sans toucher)
//   - night-time           -> tired (>23h)
//   - morning-time         -> wink (6-9h)
//   - api-error            -> scared puis sad
//   - coach-clicked        -> curious (1s)
//
// USAGE :
//   const { expression, triggerEvent } = useNuviReactions();
//   triggerEvent('audit-excellent', { score: 85 });
//
//   <NuviCompanion
//     mode={expression ? "expression" : "idle"}
//     expression={expression}
//   />
// ============================================================

const COOLDOWN_MS = 30000; // Min 30s entre reactions
const REACTION_DURATION = {
  'first-visit-today': 3500,
  'audit-excellent': 5000,
  'audit-low': 4500,
  'feature-completed': 4000,
  'cv-exported': 5000,
  'inactive-back': 3500,
  'inactive-long': 60000, // persiste tant que inactif
  'night-time': 60000,    // persiste tant que tard
  'morning-time': 60000,  // persiste tant que matin
  'api-error': 3500,
  'coach-clicked': 1500,
};

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
};

// Priorité des events (pour résoudre les conflits)
// Higher number = higher priority
const EVENT_PRIORITY = {
  'cv-exported': 10,
  'audit-excellent': 9,
  'feature-completed': 8,
  'audit-low': 8,
  'api-error': 7,
  'inactive-back': 6,
  'first-visit-today': 5,
  'coach-clicked': 4,
  'night-time': 2,
  'morning-time': 2,
  'inactive-long': 1,
};

const LS_KEY_LAST_VISIT = 'nuvi-last-visit-day';

// Helper : returns YYYY-MM-DD for today
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// Helper : check if first visit today
function isFirstVisitToday() {
  if (typeof window === 'undefined') return false;
  try {
    const lastVisit = localStorage.getItem(LS_KEY_LAST_VISIT);
    const today = todayKey();
    if (lastVisit !== today) {
      localStorage.setItem(LS_KEY_LAST_VISIT, today);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Helper : check if night time (>23h or <5h)
function isNightTime() {
  const h = new Date().getHours();
  return h >= 23 || h < 5;
}

// Helper : check if morning time (6h-9h)
function isMorningTime() {
  const h = new Date().getHours();
  return h >= 6 && h < 9;
}

export function useNuviReactions() {
  const [expression, setExpression] = useState(null);
  const lastReactionTime = useRef(0);
  const currentEventRef = useRef(null);
  const expirationTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const inactiveTimerRef = useRef(null);
  const wasInactive = useRef(false);

  // Trigger a reaction event (avec cooldown + priorité)
  const triggerEvent = useCallback((eventName, payload = {}) => {
    if (!EVENT_TO_EXPRESSION[eventName]) return;

    const now = Date.now();
    const sinceLast = now - lastReactionTime.current;
    const currentPriority = currentEventRef.current
      ? (EVENT_PRIORITY[currentEventRef.current] || 0)
      : 0;
    const newPriority = EVENT_PRIORITY[eventName] || 0;

    // Cooldown bypass si priorité plus haute
    if (sinceLast < COOLDOWN_MS && newPriority <= currentPriority) {
      return; // Trop tot et pas plus important
    }

    // Audit-low ne se déclenche que pour score < 50
    if (eventName === 'audit-low' && payload.score >= 50) return;
    if (eventName === 'audit-excellent' && payload.score < 80) return;

    const exprName = EVENT_TO_EXPRESSION[eventName];
    const duration = REACTION_DURATION[eventName] || 3000;

    // Clear previous timer
    if (expirationTimerRef.current) {
      clearTimeout(expirationTimerRef.current);
    }

    setExpression(exprName);
    currentEventRef.current = eventName;
    lastReactionTime.current = now;

    // Auto-clear apres duration (sauf events persistants)
    if (eventName !== 'inactive-long' && eventName !== 'night-time' && eventName !== 'morning-time') {
      expirationTimerRef.current = setTimeout(() => {
        setExpression(null);
        currentEventRef.current = null;
      }, duration);
    }
  }, []);

  // === ACTIVITY TRACKING (inactive detection) ===
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleActivity = () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivityRef.current;

      // Si inactif >5 min puis revient -> joy (welcome back)
      if (wasInactive.current && timeSinceActivity > 5 * 60 * 1000) {
        triggerEvent('inactive-back');
        wasInactive.current = false;
      }

      lastActivityRef.current = now;
      wasInactive.current = false;

      // Reset timer inactivite
      if (inactiveTimerRef.current) clearTimeout(inactiveTimerRef.current);
      inactiveTimerRef.current = setTimeout(() => {
        wasInactive.current = true;
        triggerEvent('inactive-long');
      }, 10 * 60 * 1000); // 10 min inactif
    };

    // Activity events
    const events = ['mousedown', 'keydown', 'scroll'];
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));

    // Init
    handleActivity();

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      if (inactiveTimerRef.current) clearTimeout(inactiveTimerRef.current);
    };
  }, [triggerEvent]);

  // === FIRST VISIT TODAY (au mount) ===
  useEffect(() => {
    // Delay 2s pour laisser l'app se charger
    const t = setTimeout(() => {
      if (isFirstVisitToday()) {
        triggerEvent('first-visit-today');
      } else if (isMorningTime()) {
        triggerEvent('morning-time');
      } else if (isNightTime()) {
        triggerEvent('night-time');
      }
    }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // === TIME CHECK (toutes les 5 min, vérifie si night/morning) ===
  useEffect(() => {
    const interval = setInterval(() => {
      // Si pas d'expression active, on peut mettre tired/wink selon heure
      if (!currentEventRef.current) {
        if (isNightTime()) {
          triggerEvent('night-time');
        } else if (isMorningTime()) {
          triggerEvent('morning-time');
        }
      }
    }, 5 * 60 * 1000); // toutes les 5 min

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (expirationTimerRef.current) clearTimeout(expirationTimerRef.current);
      if (inactiveTimerRef.current) clearTimeout(inactiveTimerRef.current);
    };
  }, []);

  return {
    expression,
    triggerEvent,
    // Helpers pour les composants
    isReacting: !!expression,
  };
}
