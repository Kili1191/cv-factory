"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

const NuviCompanion = dynamic(() => import("./NuviCompanion"), { ssr: false });

/**
 * NuviIntro — Présentation initiale du compagnon Nuvi.
 *
 * Workflow :
 * 1. Apparait au centre, NuviCompanion vole vers l'écran (mode "appearing")
 * 2. Bulles de dialogue s'affichent en streaming auto
 * 3. Bouton "Suivant" pour accélérer + "Skip" pour passer
 * 4. À la fin : appelle onComplete()
 *
 * Props :
 *   - lang: "fr" | "en"
 *   - onComplete: callback appelé en fin de présentation
 *   - onSkip: callback appelé si l'utilisateur clique sur Skip
 *   - mob: boolean (mobile)
 *   - origin: { x, y } position de départ du compagnon (le bouton Coach)
 */
export default function NuviIntro({ lang = "fr", onComplete, onSkip, mob = false, origin = null }) {
  const [step, setStep] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [streaming, setStreaming] = useState(true);
  const [appearing, setAppearing] = useState(true);
  const streamTimerRef = useRef(null);
  const appearTimerRef = useRef(null);

  // Script multilingue
  const scripts = {
    fr: [
      { text: "Hello, je suis Nuvi.", emoji: "👋" },
      { text: "Ton compagnon jusqu'au succès.", emoji: "" },
      { text: "Plus jamais perdu dans une pile de CVs ignorés.", emoji: "" },
      { text: "Mon job : faire en sorte que les recruteurs te voient. Vraiment.", emoji: "" },
      { text: "Voici comment je t'accompagne :", emoji: "✨" },
      { text: "Génération CV — je crée ou j'importe le tien, en quelques secondes.", emoji: "📝", isFeature: true },
      { text: "Audit ATS — je vérifie que tu passes les filtres automatiques.", emoji: "🎯", isFeature: true },
      { text: "Match offre — j'adapte ton CV à chaque candidature.", emoji: "🔍", isFeature: true },
      { text: "Coach — pose-moi tes questions, je te guide à chaque étape.", emoji: "💬", isFeature: true },
      { text: "Pack candidature — lettre de motivation, email, LinkedIn, tout est prêt.", emoji: "✉️", isFeature: true },
      { text: "Ensemble, on va décrocher LE bon job.", emoji: "" },
      { text: "Prêt(e) ? Allez, on y va.", emoji: "🚀" },
    ],
    en: [
      { text: "Hi, I'm Nuvi.", emoji: "👋" },
      { text: "Your companion all the way to success.", emoji: "" },
      { text: "No more getting lost in a pile of ignored CVs.", emoji: "" },
      { text: "My job: making sure recruiters actually see you.", emoji: "" },
      { text: "Here's how I'll help you:", emoji: "✨" },
      { text: "CV Generation — I create or import yours in seconds.", emoji: "📝", isFeature: true },
      { text: "ATS Audit — I check you pass automated filters.", emoji: "🎯", isFeature: true },
      { text: "Job Match — I tailor your CV for every application.", emoji: "🔍", isFeature: true },
      { text: "Coach — ask me anything, I'll guide you through.", emoji: "💬", isFeature: true },
      { text: "Application Pack — cover letter, email, LinkedIn, all ready.", emoji: "✉️", isFeature: true },
      { text: "Together, we'll land THE right job.", emoji: "" },
      { text: "Ready? Let's go.", emoji: "🚀" },
    ],
  };

  const script = scripts[lang] || scripts.fr;
  const currentLine = script[step];
  const isLastStep = step === script.length - 1;

  // Animation d'apparition (le compagnon vole vers le centre)
  useEffect(() => {
    appearTimerRef.current = setTimeout(() => {
      setAppearing(false);
    }, 1200);
    return () => clearTimeout(appearTimerRef.current);
  }, []);

  // Streaming du texte (caractère par caractère)
  useEffect(() => {
    if (appearing) return;
    if (!currentLine) return;

    setDisplayedText("");
    setStreaming(true);

    const fullText = currentLine.text;
    let i = 0;
    const speed = 22; // ms par caractère

    streamTimerRef.current = setInterval(() => {
      i++;
      setDisplayedText(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(streamTimerRef.current);
        setStreaming(false);
      }
    }, speed);

    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    };
  }, [step, currentLine, appearing]);

  // Auto-advance après affichage complet (sauf dernière étape)
  useEffect(() => {
    if (streaming || appearing) return;
    if (isLastStep) return;
    const delay = currentLine.isFeature ? 2400 : 2000;
    const t = setTimeout(() => {
      setStep(prev => prev + 1);
    }, delay);
    return () => clearTimeout(t);
  }, [streaming, appearing, isLastStep, currentLine]);

  const handleNext = useCallback(() => {
    if (streaming) {
      // Si en streaming → finir l'affichage immédiatement
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
      setDisplayedText(currentLine.text);
      setStreaming(false);
      return;
    }
    if (isLastStep) {
      onComplete && onComplete();
      return;
    }
    setStep(prev => prev + 1);
  }, [streaming, isLastStep, currentLine, onComplete]);

  const handleSkip = useCallback(() => {
    if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    onSkip && onSkip();
  }, [onSkip]);

  const labels = {
    fr: { next: "Suivant", finish: "C'est parti", skip: "Passer" },
    en: { next: "Next", finish: "Let's go", skip: "Skip" },
  };
  const L = labels[lang] || labels.fr;

  // Position de départ du compagnon (origine = bouton Coach)
  const startX = origin ? origin.x : (typeof window !== "undefined" ? window.innerWidth - 80 : 0);
  const startY = origin ? origin.y : (typeof window !== "undefined" ? window.innerHeight - 80 : 0);

  // Couleurs
  const Ink = "#0f0f12";
  const Cream = "#faf8f3";
  const Gold = "#b8860b";

  // Taille du compagnon dans la présentation
  const companionSize = mob ? 88 : 120;

  return (
    <div
      role="dialog"
      aria-label="Nuvi presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(15, 15, 18, 0.78)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: mob ? "20px" : "40px",
        animation: "nuviIntroFadeIn 400ms ease-out",
      }}
    >
      {/* Skip button (top right) */}
      <button
        onClick={handleSkip}
        style={{
          position: "absolute",
          top: mob ? 16 : 24,
          right: mob ? 16 : 24,
          background: "rgba(255,255,255,0.1)",
          color: Cream,
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 999,
          padding: mob ? "6px 14px" : "8px 18px",
          fontSize: mob ? 12 : 13,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 500,
          cursor: "pointer",
          backdropFilter: "blur(10px)",
          transition: "all 200ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.18)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.1)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
        }}
      >
        {L.skip}
      </button>

      {/* Companion + bubble container */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: mob ? 24 : 32,
        maxWidth: 600,
        width: "100%",
      }}>
        {/* Companion */}
        <div
          style={{
            width: companionSize,
            height: companionSize,
            transform: appearing
              ? `translate(${startX - (typeof window !== "undefined" ? window.innerWidth/2 : 0)}px, ${startY - (typeof window !== "undefined" ? window.innerHeight/2 : 0)}px) scale(0.4)`
              : "translate(0, 0) scale(1)",
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

        {/* Speech bubble */}
        {!appearing && currentLine && (
          <div
            key={step}
            style={{
              background: Cream,
              borderRadius: 18,
              padding: mob ? "20px 22px" : "24px 28px",
              maxWidth: mob ? "100%" : 540,
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.15)",
              fontFamily: "'Inter', sans-serif",
              animation: "nuviBubbleIn 350ms cubic-bezier(0.22, 1, 0.36, 1)",
              position: "relative",
              border: currentLine.isFeature ? `2px solid ${Gold}` : "none",
            }}
          >
            {/* Tail pointing up to companion */}
            <div style={{
              position: "absolute",
              top: -10,
              left: "50%",
              transform: "translateX(-50%) rotate(45deg)",
              width: 20,
              height: 20,
              background: Cream,
              borderTopLeftRadius: 4,
              borderLeft: currentLine.isFeature ? `2px solid ${Gold}` : "none",
              borderTop: currentLine.isFeature ? `2px solid ${Gold}` : "none",
            }} />

            <div style={{
              color: Ink,
              fontSize: mob ? 16 : 19,
              lineHeight: 1.45,
              fontWeight: 500,
              minHeight: mob ? 48 : 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: 8,
              flexWrap: "wrap",
            }}>
              {currentLine.emoji && <span style={{ fontSize: mob ? 22 : 26 }}>{currentLine.emoji}</span>}
              <span>{displayedText}</span>
              {streaming && (
                <span style={{
                  display: "inline-block",
                  width: 2,
                  height: mob ? 18 : 22,
                  background: Ink,
                  marginLeft: 2,
                  animation: "nuviCursorBlink 700ms infinite",
                  verticalAlign: "middle",
                }} />
              )}
            </div>
          </div>
        )}

        {/* Progress dots + Next button */}
        {!appearing && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            width: "100%",
          }}>
            {/* Progress dots */}
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

            {/* Next/Finish button */}
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
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px) scale(1.04)";
                e.currentTarget.style.boxShadow = "0 12px 32px rgba(91, 61, 245, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(91, 61, 245, 0.4), 0 2px 8px rgba(91, 61, 245, 0.3)";
              }}
            >
              {isLastStep ? L.finish : (streaming ? "→" : L.next)}
            </button>
          </div>
        )}
      </div>

      {/* Inline animations */}
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
