"use client";
import React, { useState, useEffect } from "react";
import NuviCompanion from "./NuviCompanion";

/**
 * NuviHome : Écran d'accueil minimaliste premium
 *
 * Cinématique :
 *   1. NuviCompanion arrive en tournant (spin) + scale 0→1 (excited)
 *   2. Bulle "Bonjour" apparaît avec stream
 *   3. Cards "Générer" / "Importer" apparaissent en stagger smoothly
 *   4. Coach se déplace en bas-droite (flying)
 *   5. État stable : utilisateur peut interagir
 *
 * Modes mobile/desktop : adaptation responsive
 *
 * Props:
 *   - lang: "fr" | "en"
 *   - mob: bool (mobile)
 *   - userName: string (optional, "Kilian" ou similaire)
 *   - onGenerate: () => void  (action "Générer avec IA")
 *   - onImport: () => void  (action "Importer mon CV")
 *   - onCoachOpen: () => void (action coach floating)
 */

const TEXT = {
  fr: {
    greeting: "Salut",
    nameLine: "C'est Nuvi.",
    nameLineWithUser: "! C'est Nuvi.",
    intro: "Je réécris ton CV, je l'adapte à chaque offre, je passe les filtres ATS, et je te coache jusqu'à l'entretien.",
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
    intro: "I rewrite your CV, tailor it to every job, beat ATS filters, and coach you all the way to the interview.",
    outro: "Your CV deserves better. Ready?",
    question: "Where shall we start?",
    generate: "Generate a CV",
    generateSub: "With AI, in just minutes",
    import: "Import my CV",
    importSub: "From existing text or doc",
    coachLabel: "Coach",
  },
};

/**
 * balanceText : typographie professionnelle
 *
 * Règles appliquées :
 *   1. Espace insecable avant ponctuation francaise (? ! : ; »)
 *   2. Espace insecable entre les 2 derniers mots (evite la veuve typographique)
 *   3. Espace insecable apres apostrophe + 1-2 lettres (l', d', n', s', t', etc.)
 *   4. Espace insecable entre nombres et leurs unites
 *
 * Utilise \u00A0 (U+00A0 NO-BREAK SPACE)
 */
function balanceText(text) {
  if (!text || typeof text !== "string") return text;
  let t = text;
  // 1. Espace insecable avant ponctuation francaise (FR uniquement)
  t = t.replace(/ ([?!:;»])/g, "\u00A0$1");
  // 2. Espace insecable apres «
  t = t.replace(/« /g, "«\u00A0");
  // 3. Eviter la veuve : insecable entre les 2 derniers mots
  // (ex: "Je suis Nuvi" -> "Je suis\u00A0Nuvi" => le dernier mot reste avec le precedent)
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

  // Phases de la cinématique
  // 0 = init (compagnon arrive en spinning)
  // 1 = compagnon stable, bulle apparaît
  // 2 = stream du texte
  // 3 = cards apparaissent
  // 4 = compagnon vole en bas-droite
  // 5 = état stable
  const [phase, setPhase] = useState(0);
  const [displayedText, setDisplayedText] = useState("");

  // Couleurs Nuvi (design system)
  const Cream = "#faf8f3";
  const CreamSoft = "#f6f2e8";
  const Paper = "#ffffff";
  const Ink = "#0f0f12";
  const InkMuted = "#5a5a62";
  const InkSubtle = "#a0a0a8";
  const Hairline = "#e8e3d6";
  const Coral = "#d97757";
  const Violet = "#5b3df5";
  const Magenta = "#b91c8c";

  // Sequence cinematique (texte plus riche : ~140 chars * 28ms ~= 4s de stream)
  // 0    -> 1.2s  : compagnon arrive en spinning
  // 1.2  -> 1.5s  : bulle apparait
  // 1.5  -> ~5.5s : streaming des 3 phrases (greeting + intro + outro)
  // 5.5  -> 9.5s  : temps de lecture confortable (4s, l'utilisateur peut digerer la liste de features)
  // 9.5  -> 10.3s : compagnon vole en bas-droite
  // 10.3 -> 10.9s : cards apparaissent
  // 10.9s+        : etat stable
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1200);
    const t2 = setTimeout(() => setPhase(2), 1500);
    const t3 = setTimeout(() => setPhase(3), 9500);     // +8s : lecture tranquille de la presentation riche
    const t4 = setTimeout(() => setPhase(4), 10300);    // +0.8s : cards apparaissent
    const t5 = setTimeout(() => setPhase(5), 10900);    // +0.6s : etat stable
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, []);

  // Stream de la phrase d'intro (greeting + nameLine + intro + outro)
  useEffect(() => {
    if (phase < 2) return;
    let i = 0;
    // Construction du texte complet en 3 parties :
    // 1. "Salut ! C'est Nuvi." (greeting + presentation)
    // 2. "Je réécris ton CV..." (intro avec features)
    // 3. "Ton CV mérite mieux. Prêt(e) ?" (outro engageant)
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

  // Skip animation : cliquer fait passer à l'état stable
  const skipAnimation = () => {
    setPhase(5);
    const greetingPart = userName
      ? T.greeting + " " + userName + " " + T.nameLineWithUser
      : T.greeting + " ! " + T.nameLine;
    const rawText = greetingPart + "\n" + T.intro + "\n" + T.outro;
    setDisplayedText(balanceText(rawText));
  };

  // Tailles
  // Phase >= 3 : compagnon vole en bas-droite (devient Coach button)
  // Phase >= 4 : cards apparaissent
  const companionSize = phase >= 3 ? (mob ? 44 : 52) : (mob ? 100 : 130);
  const showBubble = phase >= 1 && phase < 3;
  const showCards = phase >= 4;
  const showFloating = phase >= 3;

  // Position du compagnon
  // Phases 0-2 : centré en haut
  // Phase 3+ : en bas-droite (Coach button)
  const companionTop = phase >= 3 ? "auto" : (mob ? 80 : 120);
  const companionRight = phase >= 3 ? (mob ? 16 : 24) : "auto";
  const companionLeft = phase >= 3 ? "auto" : "50%";
  const companionBottom = phase >= 3 ? (mob ? 16 : 24) : "auto";
  const companionTransform = phase >= 3 ? "none" : "translateX(-50%)";

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
      {/* ===== COMPAGNON ===== */}
      <div
        style={{
          position: "absolute",
          top: companionTop,
          left: companionLeft,
          right: companionRight,
          bottom: companionBottom,
          transform: companionTransform,
          width: companionSize,
          height: companionSize,
          transition: "all 800ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          zIndex: 10,
        }}
      >
        {/* Animation d'arrivée : spin + scale 0->1 */}
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
          {/* Halo coach floating (phase 4+) - violet/magenta gradient */}
          {showFloating && (
            <div style={{
              position: "absolute",
              inset: -8,
              borderRadius: "50%",
              background: "linear-gradient(135deg, " + Violet + " 0%, " + Magenta + " 100%)",
              boxShadow: "0 8px 24px rgba(91, 61, 245, 0.35), 0 2px 6px rgba(91, 61, 245, 0.25)",
              animation: showFloating ? "nuviCoachAppear 600ms cubic-bezier(0.22, 1, 0.36, 1) forwards" : "none",
              zIndex: -1,
            }} />
          )}

          {/* Halo cream subtil derriere l'oeil (phases 1-2, sur cream donc subtil) */}
          {phase < 3 && phase >= 1 && (
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: companionSize * 1.15,
              height: companionSize * 1.15,
              borderRadius: "50%",
              background: "radial-gradient(circle, " + Coral + "1f 0%, " + Coral + "0a 50%, transparent 75%)",
              pointerEvents: "none",
              zIndex: -1,
            }} />
          )}

          {/* Halo white pour Coach floating (phase 4+) */}
          {showFloating && (
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: companionSize * 1.1,
              height: companionSize * 1.1,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.15) 40%, rgba(255,255,255,0) 70%)",
              pointerEvents: "none",
              zIndex: 1,
            }} />
          )}

          {/* Compagnon clickable en mode floating */}
          <div
            onClick={(e) => {
              if (showFloating) {
                e.stopPropagation();
                onCoachOpen();
              }
            }}
            style={{
              width: "100%",
              height: "100%",
              cursor: showFloating ? "pointer" : "default",
              position: "relative",
              zIndex: 2,
            }}
          >
            <NuviCompanion
              size={companionSize}
              mode={phase < 1 ? "appearing" : (phase >= 3 ? "idle" : "speaking")}
              cycleDuration={phase >= 3 ? 60 : 4}
            />
          </div>

          {/* Label "Coach" quand floating */}
          {showFloating && !mob && (
            <div style={{
              position: "absolute",
              top: "50%",
              right: "calc(100% + 12px)",
              transform: "translateY(-50%)",
              color: "#fff",
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: 0.3,
              padding: "8px 16px",
              background: "linear-gradient(135deg, " + Violet + " 0%, " + Magenta + " 100%)",
              borderRadius: 999,
              boxShadow: "0 4px 12px rgba(91, 61, 245, 0.3)",
              whiteSpace: "nowrap",
              animation: "nuviLabelAppear 500ms cubic-bezier(0.22, 1, 0.36, 1) 200ms forwards",
              opacity: 0,
            }}>
              {T.coachLabel}
            </div>
          )}
        </div>
      </div>

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
          {/* Titre éditorial */}
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

          {/* Cards container */}
          <div style={{
            display: "flex",
            flexDirection: mob ? "column" : "row",
            gap: mob ? 12 : 16,
            width: "100%",
          }}>
            {/* Card "Générer" */}
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
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 12,
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, " + Violet + " 0%, " + Magenta + " 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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
              }}>
                {T.generate}
              </div>
              <div style={{
                color: InkMuted,
                fontSize: mob ? 13 : 14,
                fontWeight: 400,
              }}>
                {balanceText(T.generateSub)}
              </div>
            </button>

            {/* Card "Importer" */}
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
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 12,
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: Coral,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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
              }}>
                {T.import}
              </div>
              <div style={{
                color: InkMuted,
                fontSize: mob ? 13 : 14,
                fontWeight: 400,
              }}>
                {balanceText(T.importSub)}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ===== STYLES (animations) ===== */}
      <style>{`
        @keyframes nuviHomeAppear {
          0% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1.15) rotate(360deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(360deg);
          }
        }
        @keyframes nuviBubbleSlideIn {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes nuviCardsAppear {
          from { opacity: 0; transform: translate(-50%, -42%); }
          to { opacity: 1; transform: translate(-50%, -45%); }
        }
        @keyframes nuviCardStagger {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes nuviCoachAppear {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes nuviLabelAppear {
          from { opacity: 0; transform: translateY(-50%) translateX(-8px); }
          to { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
        @keyframes nuviCursorBlink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
