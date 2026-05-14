"use client";

import React, { useState, useEffect } from "react";
import NuviCompanion from "./NuviCompanion";

/**
 * NuviHome v4 : Écran d'accueil minimaliste premium
 *
 * Cinématique :
 *   1. NuviCompanion arrive en tournant (spin) + scale 0→1 (excited)
 *   2. Bulle "Bonjour" apparaît avec stream
 *   3. Cards "Générer" / "Importer" apparaissent en stagger smoothly
 *   4. Coach se déplace en bas-droite avec halo box breathing (v4 style)
 *   5. État stable : utilisateur peut interagir
 */

const TEXT = {
  fr: {
    greeting: "Salut",
    nameLine: "C'est Nuvi.",
    nameLineWithUser: "! C'est Nuvi.",
    intro: "Je réécris ton CV, je l'adapte à chaque offre,\nje passe les filtres ATS,\net je te coache jusqu'à l'entretien.",
    outro: "Ton CV mérite mieux. Prêt(e) ?",
    question: "Par quoi commence-t-on ?",
    generate: "Générer un CV",
    generateSub: "Avec l'IA, en quelques minutes",
    import: "Importer mon CV",
    importSub: "À partir d'un texte ou doc existant",
    coachLabel: "Coach",
  },
  en: {
    greeting: "Hi",
    nameLine: "I'm Nuvi.",
    nameLineWithUser: "! I'm Nuvi.",
    intro: "I rewrite your CV, tailor it to every job,\nbeat ATS filters,\nand coach you all the way to the interview.",
    outro: "Your CV deserves better. Ready?",
    question: "Where shall we start?",
    generate: "Generate a CV",
    generateSub: "With AI, in just minutes",
    import: "Import my CV",
    importSub: "From existing text or doc",
    coachLabel: "Coach",
  },
};

function balanceText(text) {
  if (!text || typeof text !== "string") return text;
  let t = text;
  t = t.replace(/ ([?!:;»])/g, "\u00A0$1");
  t = t.replace(/« /g, "«\u00A0");
  const words = t.split(" ");
  if (words.length >= 2) {
    const lastTwo = words.slice(-2).join("\u00A0");
    t = words.slice(0, -2).concat([lastTwo]).join(" ");
  }
  return t;
}

export default function NuviHome({
  lang = "fr",
  mob = false,
  userName = null,
  onGenerate = () => {},
  onImport = () => {},
  onCoachOpen = () => {},
}) {
  const T = TEXT[lang] || TEXT.fr;
  const [phase, setPhase] = useState(0);
  const [displayedText, setDisplayedText] = useState("");

  const Cream = "var(--nuvi-cream)";
  const Paper = "var(--nuvi-paper)";
  const Ink = "var(--nuvi-ink)";
  const InkMuted = "var(--nuvi-ink-muted)";
  const Hairline = "var(--nuvi-hairline)";
  const Coral = "var(--nuvi-coral)";
  const Violet = "var(--nuvi-purple)";
  const Magenta = "var(--nuvi-magenta)";

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1200);
    const t2 = setTimeout(() => setPhase(2), 1500);
    const t3 = setTimeout(() => setPhase(3), 9500);
    const t4 = setTimeout(() => setPhase(4), 10300);
    const t5 = setTimeout(() => setPhase(5), 10900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, []);

  useEffect(() => {
    if (phase < 2) return;
    let i = 0;
    const greetingPart = userName
      ? T.greeting + " " + userName + " " + T.nameLineWithUser
      : T.greeting + " ! " + T.nameLine;
    const rawText = greetingPart + "\n" + T.intro + "\n" + T.outro;
    const fullText = balanceText(rawText);
    setDisplayedText("");
    const tick = () => {
      i++;
      setDisplayedText(fullText.slice(0, i));
      if (i < fullText.length) setTimeout(tick, 28);
    };
    setTimeout(tick, 28);
  }, [phase, T, userName]);

  const skipAnimation = () => {
    setPhase(5);
    const greetingPart = userName
      ? T.greeting + " " + userName + " " + T.nameLineWithUser
      : T.greeting + " ! " + T.nameLine;
    const rawText = greetingPart + "\n" + T.intro + "\n" + T.outro;
    setDisplayedText(balanceText(rawText));
  };

  // === Phase 0-2 : compagnon centré en haut avec halo cream
  // === Phase 3+ : compagnon en bas-droite avec halo box breathing v4 ===
  const showBubble = phase >= 1 && phase < 3;
  const showCards = phase >= 4;
  const showFloating = phase >= 3;

  // Taille phase 0-2 : grande (cinematique)
  const introSize = mob ? 100 : 130;
  // Taille phase 3+ : version Coach v4 (90 mobile / 140 desktop)
  const coachSize = mob ? 90 : 140;
  // Taille de l'oeil v4 a l'interieur du halo (70 mobile / 120 desktop)
  const innerEyeSize = mob ? 70 : 120;

  return (
    <div
      onClick={phase < 5 ? skipAnimation : undefined}
      style={{
        position: "fixed",
        inset: 0,
        background: Cream,
        zIndex: 1000,
        overflow: "hidden",
        cursor: phase < 5 ? "pointer" : "default",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* ===== COMPAGNON PHASE 0-2 (cinematique centree) ===== */}
      {!showFloating && (
        <div
          style={{
            position: "absolute",
            top: mob ? 80 : 120,
            left: "50%",
            transform: "translateX(-50%)",
            width: introSize,
            height: introSize,
            transition: "all 800ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              animation: phase === 0
                ? "nuviHomeAppear 1100ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
                : "none",
              transformOrigin: "center",
              position: "relative",
            }}
          >
            {/* Halo cream subtil derriere l'oeil */}
            {phase >= 1 && (
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: introSize * 1.15,
                height: introSize * 1.15,
                borderRadius: "50%",
                background: "radial-gradient(circle, " + Coral + "1f 0%, " + Coral + "0a 50%, transparent 75%)",
                pointerEvents: "none",
                zIndex: -1,
              }} />
            )}
            <NuviCompanion
              size={introSize}
              mode={phase < 1 ? "appearing" : "speaking"}
              cycleDuration={4}
            />
          </div>
        </div>
      )}

      {/* ===== COMPAGNON PHASE 3+ : COACH BUTTON v4 (eye + halo box breathing) ===== */}
      {showFloating && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCoachOpen();
          }}
          aria-label="Coach"
          style={{
            position: "fixed",
            ...(mob
              ? { right: 16, bottom: 16 }
              : { right: 24, bottom: 24 }),
            zIndex: 90,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            padding: 0,
            background: "transparent",
            color: "#5b3df5",
            border: "none",
            cursor: "pointer",
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
            userSelect: "none",
            animation: "nuviCoachLand 600ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px) scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "";
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              position: "relative",
              width: coachSize,
              height: coachSize,
            }}
          >
            {/* Halo box breathing externe (gradient radial qui pulse) */}
            <span style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: "radial-gradient(circle at 50% 55%, rgba(91, 61, 245, 0.35) 0%, rgba(185, 28, 140, 0.20) 35%, rgba(91, 61, 245, 0.05) 60%, transparent 75%)",
              animation: "nuviBoxBreathe 16s ease-in-out infinite",
              pointerEvents: "none",
              filter: "blur(8px)",
            }} />
            {/* Halo box breathing interne (plus concentre) */}
            <span style={{
              position: "absolute",
              inset: "15%",
              borderRadius: "50%",
              background: "radial-gradient(ellipse at 45% 40%, rgba(91, 61, 245, 0.25) 0%, transparent 65%)",
              animation: "nuviBoxBreathe 16s ease-in-out infinite",
              animationDelay: "0.5s",
              pointerEvents: "none",
              filter: "blur(4px)",
            }} />
            {/* NuviCompanion centre (oeil) */}
            <span style={{
              position: "relative",
              zIndex: 2,
              filter: "drop-shadow(0 4px 12px rgba(91, 61, 245, 0.25))",
            }}>
              <NuviCompanion
                size={innerEyeSize}
                mode="idle"
                cycleDuration={60}
              />
            </span>
          </span>
          {/* Label Coach pill */}
          <span style={{
            marginTop: 2,
            padding: "3px 10px",
            background: "rgba(91, 61, 245, 0.08)",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#5b3df5",
            border: "0.5px solid rgba(91, 61, 245, 0.15)",
          }}>
            {T.coachLabel}
          </span>
        </button>
      )}

      {/* ===== BULLE DE TEXTE ===== */}
      {showBubble && (
        <div
          style={{
            position: "absolute",
            top: mob ? 180 : 240,
            left: "50%",
            transform: "translateX(-50%)",
            maxWidth: mob ? "92%" : 720,
            width: mob ? "92%" : "auto",
            zIndex: 5,
            animation: "nuviBubbleSlideIn 500ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <div
            style={{
              background: Paper,
              borderRadius: 20,
              padding: mob ? "18px 22px" : "26px 36px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
              border: "1px solid " + Hairline,
              position: "relative",
              textAlign: "center",
            }}
          >
            <div style={{
              color: Ink,
              fontFamily: "'DM Serif Display', serif",
              fontSize: mob ? 19 : 24,
              fontWeight: 400,
              lineHeight: 1.45,
              letterSpacing: "-0.01em",
              minHeight: mob ? 140 : 180,
              whiteSpace: "pre-line",
            }}>
              {displayedText}
              {phase >= 2 && phase < 3 && (
                <span style={{
                  display: "inline-block",
                  width: 2,
                  height: mob ? 19 : 22,
                  background: Ink,
                  marginLeft: 3,
                  verticalAlign: "middle",
                  animation: "nuviCursorBlink 700ms infinite",
                }} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== TITRE QUESTION + CARDS ===== */}
      {showCards && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -45%)",
            width: mob ? "92%" : 640,
            maxWidth: "92%",
            zIndex: 4,
            animation: "nuviCardsAppear 700ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <div style={{
            color: Ink,
            fontFamily: "'DM Serif Display', serif",
            fontSize: mob ? 28 : 40,
            fontWeight: 400,
            textAlign: "center",
            marginBottom: mob ? 28 : 40,
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}>
            {balanceText(T.question)}
          </div>

          <div style={{
            display: "flex",
            flexDirection: mob ? "column" : "row",
            gap: mob ? 12 : 16,
            width: "100%",
          }}>
            {/* Card Generer */}
            <button
              onClick={(e) => { e.stopPropagation(); onGenerate(); }}
              style={{
                flex: 1,
                background: Paper,
                border: "1px solid " + Hairline,
                borderRadius: 16,
                padding: mob ? "20px 22px" : "26px 28px",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "'Inter', sans-serif",
                transition: "all 220ms cubic-bezier(0.22, 1, 0.36, 1)",
                animation: "nuviCardStagger 600ms cubic-bezier(0.22, 1, 0.36, 1)",
                opacity: 0,
                animationFillMode: "forwards",
                animationDelay: "100ms",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(91, 61, 245, 0.12), 0 2px 6px rgba(0,0,0,0.04)";
                e.currentTarget.style.borderColor = Violet + "40";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.03)";
                e.currentTarget.style.borderColor = Hairline;
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: "linear-gradient(135deg, " + Violet + " 0%, " + Magenta + " 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 2px 8px rgba(91, 61, 245, 0.25)",
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M5 19l4-4M15 9l4-4"/>
                  </svg>
                </div>
              </div>
              <div style={{
                color: Ink,
                fontSize: mob ? 17 : 19,
                fontWeight: 600,
                marginBottom: 4,
                letterSpacing: "-0.01em",
              }}>{T.generate}</div>
              <div style={{ color: InkMuted, fontSize: mob ? 13 : 14, fontWeight: 400 }}>
                {balanceText(T.generateSub)}
              </div>
            </button>

            {/* Card Importer */}
            <button
              onClick={(e) => { e.stopPropagation(); onImport(); }}
              style={{
                flex: 1,
                background: Paper,
                border: "1px solid " + Hairline,
                borderRadius: 16,
                padding: mob ? "20px 22px" : "26px 28px",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "'Inter', sans-serif",
                transition: "all 220ms cubic-bezier(0.22, 1, 0.36, 1)",
                animation: "nuviCardStagger 600ms cubic-bezier(0.22, 1, 0.36, 1)",
                opacity: 0,
                animationFillMode: "forwards",
                animationDelay: "200ms",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(217, 119, 87, 0.12), 0 2px 6px rgba(0,0,0,0.04)";
                e.currentTarget.style.borderColor = Coral + "40";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.03)";
                e.currentTarget.style.borderColor = Hairline;
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: Coral,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 2px 8px rgba(217, 119, 87, 0.25)",
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                </div>
              </div>
              <div style={{
                color: Ink,
                fontSize: mob ? 17 : 19,
                fontWeight: 600,
                marginBottom: 4,
                letterSpacing: "-0.01em",
              }}>{T.import}</div>
              <div style={{ color: InkMuted, fontSize: mob ? 13 : 14, fontWeight: 400 }}>
                {balanceText(T.importSub)}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ===== STYLES ===== */}
      <style>{`
        @keyframes nuviHomeAppear {
          0%   { opacity: 0; transform: scale(0) rotate(0deg); }
          50%  { opacity: 1; transform: scale(1.15) rotate(360deg); }
          100% { opacity: 1; transform: scale(1) rotate(360deg); }
        }
        @keyframes nuviBubbleSlideIn {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes nuviCardsAppear {
          from { opacity: 0; transform: translate(-50%, -42%); }
          to   { opacity: 1; transform: translate(-50%, -45%); }
        }
        @keyframes nuviCardStagger {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes nuviCoachLand {
          from { opacity: 0; transform: scale(0.7) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes nuviCursorBlink {
          0%, 50%   { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes nuviBoxBreathe {
          0%   { transform: scale(0.65); opacity: 0.35; }
          25%  { transform: scale(1.0);  opacity: 0.85; }
          50%  { transform: scale(1.0);  opacity: 0.85; }
          75%  { transform: scale(0.65); opacity: 0.35; }
          100% { transform: scale(0.65); opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
