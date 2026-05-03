"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import NuviCompanion from "./NuviCompanion";

/**
 * NuviIntro : Présentation initiale du compagnon Nuvi.
 * Version béton : streaming basé sur step uniquement (pas de currentLine en deps).
 */

// Scripts STATIQUES - hors composant pour stabilité de référence
const SCRIPTS = {
  fr: [
    { text: "Bonjour, je suis Nuvi.", emoji: "👋" },
    { text: "Ton compagnon jusqu'au succès.", emoji: "" },
    { text: "Plus jamais perdu dans une pile de CV ignorés.", emoji: "" },
    { text: "Mon job : faire en sorte que les recruteurs te voient. Vraiment.", emoji: "" },
    { text: "Voici comment je t'accompagne :", emoji: "✨" },
    { text: "Génération CV : je crée ou j'importe le tien, en quelques secondes.", emoji: "📝", isFeature: true },
    { text: "Audit ATS : je vérifie que tu passes les filtres automatiques.", emoji: "🎯", isFeature: true },
    { text: "Match offre : j'adapte ton CV à chaque candidature.", emoji: "🔍", isFeature: true },
    { text: "Coach : pose-moi tes questions, je te guide à chaque étape.", emoji: "💬", isFeature: true },
    { text: "Pack candidature : lettre de motivation, email, LinkedIn, tout est prêt.", emoji: "✉️", isFeature: true },
    { text: "Ensemble, on va décrocher LE bon job.", emoji: "" },
    { text: "Prêt(e) ? Allez, on y va.", emoji: "🚀" },
  ],
  en: [
    { text: "Hi, I'm Nuvi.", emoji: "👋" },
    { text: "Your companion all the way to success.", emoji: "" },
    { text: "No more getting lost in a pile of ignored CVs.", emoji: "" },
    { text: "My job: making sure recruiters actually see you.", emoji: "" },
    { text: "Here's how I'll help you:", emoji: "✨" },
    { text: "CV Generation: I create or import yours in seconds.", emoji: "📝", isFeature: true },
    { text: "ATS Audit: I check you pass automated filters.", emoji: "🎯", isFeature: true },
    { text: "Job Match: I tailor your CV for every application.", emoji: "🔍", isFeature: true },
    { text: "Coach: ask me anything, I'll guide you through.", emoji: "💬", isFeature: true },
    { text: "Application Pack: cover letter, email, LinkedIn, all ready.", emoji: "✉️", isFeature: true },
    { text: "Together, we'll land THE right job.", emoji: "" },
    { text: "Ready? Let's go.", emoji: "🚀" },
  ],
};

const LABELS = {
  fr: { next: "Suivant", finish: "C'est parti", skip: "Passer" },
  en: { next: "Next", finish: "Let's go", skip: "Skip" },
};

export default function NuviIntro({
  lang = "fr",
  onComplete,
  onSkip,
  mob = false,
  origin = null,
}) {
  const [step, setStep] = useState(0);
  const [appearing, setAppearing] = useState(true);
  const [displayedText, setDisplayedText] = useState("");
  const [streaming, setStreaming] = useState(false);

  // Refs pour éviter les race conditions
  const stepRef = useRef(0);
  const cancelStreamRef = useRef(null);
  const cancelAdvanceRef = useRef(null);

  const script = SCRIPTS[lang] || SCRIPTS.fr;
  const L = LABELS[lang] || LABELS.fr;
  const currentLine = script[step] || script[0];
  const isLastStep = step === script.length - 1;

  // Sync step to ref
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  // ========== STREAMING TEXT ==========
  // Démarre le streaming pour la step actuelle.
  // Utilise une fonction stable pour éviter les re-runs en boucle.
  const startStreaming = useCallback((stepIdx) => {
    // Cancel any previous stream
    if (cancelStreamRef.current) {
      cancelStreamRef.current();
      cancelStreamRef.current = null;
    }

    const line = script[stepIdx];
    if (!line) return;

    const fullText = line.text;
    setDisplayedText("");
    setStreaming(true);

    let i = 0;
    let cancelled = false;
    const speed = 22;

    const tick = () => {
      if (cancelled) return;
      // Vérifie qu'on est toujours sur la bonne step
      if (stepRef.current !== stepIdx) {
        cancelled = true;
        return;
      }
      i++;
      setDisplayedText(fullText.slice(0, i));
      if (i >= fullText.length) {
        cancelled = true;
        setStreaming(false);
        return;
      }
      setTimeout(tick, speed);
    };
    setTimeout(tick, speed);

    cancelStreamRef.current = () => {
      cancelled = true;
    };
  }, [script]);

  // Effect: appearing animation
  useEffect(() => {
    const t = setTimeout(() => {
      setAppearing(false);
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  // Effect: trigger streaming when step changes OR when appearing ends
  useEffect(() => {
    if (appearing) return;
    startStreaming(step);
    return () => {
      if (cancelStreamRef.current) {
        cancelStreamRef.current();
        cancelStreamRef.current = null;
      }
    };
  }, [step, appearing, startStreaming]);

  // Effect: auto-advance after stream finishes (sauf derniere etape)
  useEffect(() => {
    if (streaming || appearing) return;
    if (isLastStep) return;

    const line = script[step];
    // Delais plus longs pour laisser le temps de lire et comprendre
    const delay = line && line.isFeature ? 4500 : 3500;

    const t = setTimeout(() => {
      setStep(prev => Math.min(prev + 1, script.length - 1));
    }, delay);
    cancelAdvanceRef.current = () => clearTimeout(t);
    return () => clearTimeout(t);
  }, [streaming, appearing, isLastStep, step, script]);

  // Cleanup global on unmount
  useEffect(() => {
    return () => {
      if (cancelStreamRef.current) cancelStreamRef.current();
      if (cancelAdvanceRef.current) cancelAdvanceRef.current();
    };
  }, []);

  const handleNext = useCallback(() => {
    if (streaming) {
      // Skip streaming → finir le texte immédiatement
      if (cancelStreamRef.current) {
        cancelStreamRef.current();
        cancelStreamRef.current = null;
      }
      const line = script[stepRef.current];
      if (line) setDisplayedText(line.text);
      setStreaming(false);
      return;
    }
    if (isLastStep) {
      onComplete && onComplete();
      return;
    }
    setStep(prev => Math.min(prev + 1, script.length - 1));
  }, [streaming, isLastStep, script, onComplete]);

  const handleSkip = useCallback(() => {
    if (cancelStreamRef.current) cancelStreamRef.current();
    if (cancelAdvanceRef.current) cancelAdvanceRef.current();
    onSkip && onSkip();
  }, [onSkip]);

  // Couleurs Nuvi
  const Ink = "#0f0f12";
  const Cream = "#faf8f3";
  const Coral = "#d97757";

  const companionSize = mob ? 80 : 110;

  // Position de depart du compagnon
  const winW = typeof window !== "undefined" ? window.innerWidth : 0;
  const winH = typeof window !== "undefined" ? window.innerHeight : 0;
  const startX = origin ? origin.x : (winW - 80);
  const startY = origin ? origin.y : (winH - 80);
  const offsetX = appearing ? (startX - winW / 2) : 0;
  const offsetY = appearing ? (startY - winH / 2 + 80) : 0;

  return (
    <div
      role="dialog"
      aria-label="Nuvi presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5000,
        background: "rgba(15, 15, 18, 0.85)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: mob ? "16px" : "40px",
        animation: "nuviIntroFadeIn 400ms ease-out",
      }}
    >
      <button
        onClick={handleSkip}
        style={{
          position: "absolute",
          top: mob ? 14 : 24,
          right: mob ? 14 : 24,
          background: "rgba(255,255,255,0.12)",
          color: Cream,
          border: "1px solid rgba(255,255,255,0.22)",
          borderRadius: 999,
          padding: mob ? "6px 14px" : "8px 18px",
          fontSize: mob ? 12 : 13,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 500,
          cursor: "pointer",
          transition: "all 200ms ease",
          zIndex: 10,
        }}
      >
        {L.skip}
      </button>

      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: mob ? 18 : 28,
        maxWidth: 600,
        width: "100%",
      }}>
        {/* Compagnon */}
        <div
          style={{
            width: companionSize,
            height: companionSize,
            transform: "translate(" + offsetX + "px, " + offsetY + "px) scale(" + (appearing ? 0.5 : 1) + ")",
            transition: "transform 1100ms cubic-bezier(0.34, 1.5, 0.64, 1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <NuviCompanion
            size={companionSize}
            mode={appearing ? "appearing" : "speaking"}
            cycleDuration={4}
          />
        </div>

        {/* Bulle */}
        {!appearing && (
          <div
            key={step}
            style={{
              background: Cream,
              borderRadius: 18,
              padding: mob ? "20px 22px" : "24px 32px",
              maxWidth: mob ? "100%" : 540,
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.18)",
              fontFamily: "'Inter', sans-serif",
              animation: "nuviBubbleIn 350ms cubic-bezier(0.22, 1, 0.36, 1)",
              position: "relative",
              border: currentLine.isFeature ? "2px solid " + Coral : "none",
            }}
          >
            <div style={{
              position: "absolute",
              top: -10,
              left: "50%",
              transform: "translateX(-50%) rotate(45deg)",
              width: 18,
              height: 18,
              background: Cream,
              borderTopLeftRadius: 4,
              borderLeft: currentLine.isFeature ? "2px solid " + Coral : "none",
              borderTop: currentLine.isFeature ? "2px solid " + Coral : "none",
            }} />

            <div style={{
              color: Ink,
              fontSize: mob ? 15 : 18,
              lineHeight: 1.5,
              fontWeight: 500,
              minHeight: mob ? 44 : 54,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: 8,
              flexWrap: "wrap",
            }}>
              {currentLine.emoji && <span style={{ fontSize: mob ? 22 : 26, flexShrink: 0 }}>{currentLine.emoji}</span>}
              <span>{displayedText}</span>
              {streaming && (
                <span style={{
                  display: "inline-block",
                  width: 2,
                  height: mob ? 16 : 20,
                  background: Ink,
                  marginLeft: 2,
                  animation: "nuviCursorBlink 700ms infinite",
                  verticalAlign: "middle",
                }} />
              )}
            </div>
          </div>
        )}

        {/* Dots + Next button */}
        {!appearing && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            width: "100%",
          }}>
            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
              {script.map((_, i) => (
                <div key={i} style={{
                  width: i === step ? 18 : 6,
                  height: 6,
                  borderRadius: 999,
                  background: i <= step ? Cream : "rgba(255,255,255,0.3)",
                  transition: "all 300ms ease",
                }} />
              ))}
            </div>

            <button
              onClick={handleNext}
              style={{
                background: "linear-gradient(135deg, #5b3df5 0%, #b91c8c 100%)",
                color: "#fff",
                border: "none",
                borderRadius: 999,
                padding: mob ? "12px 28px" : "14px 36px",
                fontSize: mob ? 14 : 16,
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                cursor: "pointer",
                letterSpacing: 0.3,
                boxShadow: "0 8px 24px rgba(91, 61, 245, 0.4), 0 2px 8px rgba(91, 61, 245, 0.3)",
                transition: "all 200ms ease",
                minWidth: mob ? 160 : 200,
              }}
            >
              {isLastStep ? L.finish : (streaming ? "→" : L.next + " →")}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes nuviIntroFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes nuviBubbleIn {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes nuviCursorBlink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
