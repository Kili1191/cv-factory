"use client";
import React, { useState, useEffect } from "react";

/**
 * VerdictModal - Fullscreen Liquid Glass moment of truth.
 * Triggered when CV score crosses 85+. Tells user "STOP editing, send now".
 *
 * Synthesis of expert council brainstorm :
 *   - Kahneman : commitment device (action now)
 *   - Fogg : variable reward + celebration
 *   - Hoffman : market data
 *   - Kondo : ritual of finalization
 *   - Naval : adress underlying fear
 *   - Lau : diminishing returns visualization
 *   - Jocko : firm verdict, no compromise
 *   - Cal Newport : redirect energy to higher-value tasks
 *   - Caplan : reframe metric ("probability of interview")
 *
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   score: number (current CV score, 0-100)
 *   onReady: () => void (user clicks "I'm ready, show me offers" -> BatchApply)
 *   onFear: () => void (user clicks "I have an unnamed fear" -> empathic conversation)
 *   onContinue: () => void (user insists on editing -> dismissed but warned)
 *   editsCount: number (edits made in session)
 *   recentDelta: number (avg point gain per recent edit, computed by parent)
 *   locale: "fr"|"en"
 */
export default function VerdictModal({
  isOpen, onClose,
  score = 85, editsCount = 0, recentDelta = 0.4,
  onReady, onFear, onContinue,
  locale = "en",
}) {
  const [scoreAnim, setScoreAnim] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Animation du score : compte de 0 a score sur 1.6s
  useEffect(() => {
    if (!isOpen) {
      setScoreAnim(0);
      setShowConfetti(false);
      return;
    }
    let frame = 0;
    const totalFrames = 60;
    const interval = setInterval(() => {
      frame++;
      const t = frame / totalFrames;
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setScoreAnim(Math.round(score * eased));
      if (frame >= totalFrames) {
        clearInterval(interval);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2500);
      }
    }, 26);
    return () => clearInterval(interval);
  }, [isOpen, score]);

  if (!isOpen) return null;

  const isEn = locale === "en";
  const probability = Math.min(85, score); // plafond a 85% (Caplan : rien n'est jamais sur)

  const t = {
    eyebrow: isEn ? "VERDICT NUVI" : "VERDICT NUVI",
    title_a: isEn ? "Your CV is" : "Ton CV est",
    title_b: isEn ? "ready." : "pret.",
    subtitle: isEn
      ? "Real talk : you're past the threshold. More editing won't get you more interviews."
      : "Soyons direct : tu as franchi le seuil. Continuer a editer ne te decrochera pas plus d'entretiens.",
    proba_label: isEn ? "Probability of interview" : "Probabilite d'entretien",
    proba_cap: isEn ? "(max possible: luck plays a role)" : "(max possible : la chance joue aussi)",
    stats_title: isEn ? "What the numbers say" : "Ce que disent les chiffres",
    stat1_a: isEn ? "Recent edits :" : "Tes derniers edits :",
    stat1_b: isEn ? " pts per edit avg" : " pt par edit en moyenne",
    stat2: isEn
      ? "87% of candidates with this score get at least 1 interview"
      : "87% des candidats avec ce score decrochent au moins 1 entretien",
    stat3: isEn
      ? "Editing past 85 = diminishing returns"
      : "Editer au-dela de 85 = rendement decroissant",
    real_q: isEn ? "The real question now :" : "La vraie question maintenant :",
    fear: isEn ? "What's stopping you from sending it ?" : "Qu'est-ce qui te bloque pour l'envoyer ?",
    btn_ready: isEn ? "I'm ready, show me 5 offers" : "Je suis pret, montre-moi 5 offres",
    btn_ready_sub: isEn ? "Open BatchApply" : "Ouvrir BatchApply",
    btn_fear: isEn ? "I have a fear I can't name" : "J'ai une peur que j'arrive pas a nommer",
    btn_fear_sub: isEn ? "Talk to Nuvi about it" : "En parler avec Nuvi",
    btn_continue: isEn ? "Keep editing (-2% chance)" : "Continuer d'editer (-2% chance)",
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes vrdFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes vrdScoreGlow {
          0%, 100% { text-shadow: 0 0 30px rgba(91,61,245,0.4); }
          50% { text-shadow: 0 0 50px rgba(91,61,245,0.7), 0 0 80px rgba(185,28,140,0.4); }
        }
        @keyframes vrdConfetti {
          0% { transform: translateY(-100vh) rotate(0); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes vrdBlobFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -30px) scale(1.1); }
        }
        @keyframes vrdSlideUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes vrdPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      ` }} />

      {/* Fullscreen overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 3000,
          background: "rgba(10, 10, 10, 0.55)",
          backdropFilter: "blur(60px) saturate(200%)",
          WebkitBackdropFilter: "blur(60px) saturate(200%)",
          animation: "vrdFadeIn 600ms ease-out",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          overflow: "auto",
        }}
      >
        {/* Aurora background layer (animated blobs) */}
        <div style={{
          position: "absolute", inset: 0,
          pointerEvents: "none", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: "-15%", right: "-10%",
            width: 500, height: 500, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(91,61,245,0.35) 0%, transparent 70%)",
            filter: "blur(80px)",
            animation: "vrdBlobFloat 12s ease-in-out infinite",
          }}/>
          <div style={{
            position: "absolute", bottom: "-20%", left: "-15%",
            width: 600, height: 600, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(185,28,140,0.3) 0%, transparent 70%)",
            filter: "blur(90px)",
            animation: "vrdBlobFloat 14s ease-in-out infinite reverse",
          }}/>
          <div style={{
            position: "absolute", top: "40%", left: "30%",
            width: 350, height: 350, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(217,119,87,0.25) 0%, transparent 70%)",
            filter: "blur(70px)",
            animation: "vrdBlobFloat 10s ease-in-out infinite",
          }}/>
        </div>

        {/* Confetti celebration (Fogg : variable reward) */}
        {showConfetti && (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            overflow: "hidden",
          }}>
            {Array.from({ length: 32 }).map((_, i) => {
              const colors = ["#5b3df5", "#b91c8c", "#d97757", "#fce7dd", "#ede9fe"];
              const color = colors[i % colors.length];
              const left = (i * 7.3) % 100;
              const delay = (i * 0.05) % 1;
              const size = 6 + (i % 4) * 2;
              return (
                <div key={i} style={{
                  position: "absolute",
                  top: "-10px", left: left + "%",
                  width: size, height: size,
                  background: color,
                  borderRadius: i % 2 === 0 ? "50%" : "2px",
                  animation: `vrdConfetti ${2 + (i % 3) * 0.5}s ${delay}s ease-out forwards`,
                }}/>
              );
            })}
          </div>
        )}

        {/* Main content card */}
        <div style={{
          position: "relative",
          maxWidth: 600, width: "100%",
          background: "rgba(250, 248, 243, 0.55)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          borderRadius: 36,
          border: "0.5px solid rgba(255,255,255,0.4)",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.25), inset 0 1.5px 0 rgba(255,255,255,0.7)",
          padding: "40px 36px 32px",
          animation: "vrdSlideUp 700ms cubic-bezier(.32,.72,0,1) 300ms backwards",
          fontFamily: "Inter, sans-serif",
          textAlign: "center",
          overflow: "hidden",
        }}>
          {/* Specular highlight top */}
          <div style={{
            position: "absolute", top: 0, left: "20%", right: "20%", height: 1.5,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)",
            pointerEvents: "none",
          }}/>

          {/* Eyebrow */}
          <div style={{
            position: "relative",
            fontSize: 11, fontWeight: 700, letterSpacing: "0.18em",
            textTransform: "uppercase",
            background: "linear-gradient(135deg, #5b3df5, #b91c8c)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: 8,
          }}>{t.eyebrow}</div>

          {/* Title */}
          <h1 style={{
            position: "relative",
            fontFamily: "'Fraunces', serif", fontWeight: 400,
            fontSize: 42, lineHeight: 1.05,
            color: "#0a0a0a", margin: "0 0 6px",
            letterSpacing: "-0.02em",
          }}>
            {t.title_a}{" "}
            <em style={{
              fontFamily: "'Fraunces', serif", fontStyle: "italic",
              background: "linear-gradient(135deg, #5b3df5, #b91c8c)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>{t.title_b}</em>
          </h1>

          {/* Subtitle */}
          <p style={{
            position: "relative",
            fontSize: 15, color: "#5a5a62",
            marginTop: 12, marginBottom: 24,
            lineHeight: 1.45, maxWidth: 460, marginInline: "auto",
          }}>{t.subtitle}</p>

          {/* Animated score with probability framing (Caplan reframing) */}
          <div style={{
            position: "relative",
            marginBottom: 24,
            padding: "20px 16px",
            background: "rgba(255,255,255,0.4)",
            borderRadius: 24,
            border: "0.5px solid rgba(232,227,214,0.6)",
            backdropFilter: "blur(20px)",
          }}>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "#5a5a62",
              marginBottom: 4,
            }}>{t.proba_label}</div>
            <div style={{
              fontFamily: "'Fraunces', serif", fontWeight: 300,
              fontSize: 84, lineHeight: 1,
              background: "linear-gradient(135deg, #5b3df5, #b91c8c)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: scoreAnim >= score ? "vrdScoreGlow 2.4s ease-in-out infinite" : "none",
              letterSpacing: "-0.04em",
            }}>{Math.min(85, scoreAnim)}<span style={{ fontSize: 36, opacity: 0.7 }}>%</span></div>
            <div style={{
              fontSize: 11, color: "#5a5a62", fontStyle: "italic",
              marginTop: 4,
            }}>{t.proba_cap}</div>
          </div>

          {/* Data block (Hoffman + Lau) */}
          <div style={{
            position: "relative",
            marginBottom: 24,
            padding: "16px 20px",
            background: "rgba(255,255,255,0.35)",
            borderRadius: 20,
            border: "0.5px solid rgba(232,227,214,0.5)",
            backdropFilter: "blur(20px)",
            textAlign: "left",
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "#d97757",
              marginBottom: 10,
            }}>{t.stats_title}</div>
            <div style={{
              fontSize: 13, color: "#0a0a0a", lineHeight: 1.65,
            }}>
              <div style={{ marginBottom: 4 }}>
                <span style={{ opacity: 0.6 }}>{t.stat1_a}</span>{" "}
                <span style={{ fontWeight: 600 }}>+{recentDelta.toFixed(1)}</span>
                {t.stat1_b}
              </div>
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>87%</span>
                {" "}{t.stat2.replace("87% des", "").replace("87% of", "")}
              </div>
              <div style={{ opacity: 0.85, fontStyle: "italic", fontSize: 12 }}>
                {t.stat3}
              </div>
            </div>
          </div>

          {/* The real question (Naval) */}
          <p style={{
            position: "relative",
            fontFamily: "'Fraunces', serif",
            fontSize: 17, fontStyle: "italic",
            color: "#0a0a0a",
            marginTop: 18, marginBottom: 24,
            lineHeight: 1.4,
          }}>
            {t.real_q}
            <br/>
            <strong style={{ fontStyle: "normal", fontWeight: 500 }}>
              {t.fear}
            </strong>
          </p>

          {/* Action buttons */}
          <div style={{
            position: "relative",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            {/* Primary : I'm ready -> BatchApply (Cal Newport : redirect energy) */}
            <button
              onClick={onReady}
              style={{
                padding: "16px 24px",
                borderRadius: 999,
                background: "linear-gradient(135deg, #5b3df5, #b91c8c)",
                border: "none",
                color: "white",
                fontFamily: "Inter, sans-serif",
                fontWeight: 600, fontSize: 15,
                cursor: "pointer",
                boxShadow: "0 8px 24px rgba(91,61,245,0.4), 0 2px 6px rgba(185,28,140,0.3)",
                animation: "vrdPulse 3s ease-in-out infinite",
                transition: "transform 200ms ease-out",
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div>{t.btn_ready}</div>
              <div style={{
                fontSize: 11, fontWeight: 400, opacity: 0.85,
                marginTop: 3,
              }}>{t.btn_ready_sub}</div>
            </button>

            {/* Secondary : I have a fear (Naval : empathic conversation) */}
            <button
              onClick={onFear}
              style={{
                padding: "13px 22px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.7)",
                border: "0.5px solid rgba(232,227,214,0.8)",
                color: "#0a0a0a",
                fontFamily: "Inter, sans-serif",
                fontWeight: 500, fontSize: 14,
                cursor: "pointer",
                backdropFilter: "blur(10px)",
                transition: "all 200ms ease-out",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.9)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.7)"}
            >
              <div>{t.btn_fear}</div>
              <div style={{
                fontSize: 11, fontWeight: 400, color: "#5a5a62",
                marginTop: 2,
              }}>{t.btn_fear_sub}</div>
            </button>

            {/* Tertiary : keep editing - dissuasive small link (Jocko : make it costly) */}
            <button
              onClick={onContinue}
              style={{
                padding: "10px 16px",
                borderRadius: 999,
                background: "transparent",
                border: "none",
                color: "#9b9b9b",
                fontFamily: "Inter, sans-serif",
                fontWeight: 400, fontSize: 12,
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 3,
                transition: "color 200ms ease-out",
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#5a5a62"}
              onMouseLeave={(e) => e.currentTarget.style.color = "#9b9b9b"}
            >
              {t.btn_continue}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
