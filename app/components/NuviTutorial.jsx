"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

// NuviCompanion en dynamic (ssr:false)
const NuviCompanion = dynamic(() => import("./NuviCompanion"), { ssr: false });

// ============================================================
// NuviTutorial v2 — Mode Demo Interactif
//
// Le tutorial NAVIGUE dans l'app pour de vrai avec :
//   - Un CV demo (Marie Dupont) charge temporairement
//   - Un curseur fantome qui clique sur les boutons
//   - Des resultats IA mockes (pas d'appels API reels)
//   - Auto-skip 4-6s par etape avec progress bar
//   - Sauvegarde/restore du CV original a la fin
//
// Props:
//   - lang: "fr" | "en"
//   - mob: boolean
//   - onComplete: () => void
//   - onSkip: () => void
//   - onLoadDemoCV: (demoCV) => void
//   - onRestoreCV: () => void
//   - onOpenModal: (modalKey) => void  - "open-coach" | "open-match" | etc.
//   - onCloseModal: () => void
//   - onSetMockMode: (active) => void
// ============================================================

const Purple    = "#5b3df5";
const Magenta   = "#b91c8c";
const GradPurple = `linear-gradient(135deg, ${Purple}, ${Magenta})`;
const Sans = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const Serif = "'Fraunces', 'Playfair Display', Georgia, serif";

// === CV Demo : Marie Dupont, Marketing Manager ===
export const DEMO_CV = {
  name: "Marie Dupont",
  title: "Marketing Manager B2B SaaS",
  email: "marie.dupont@email.com",
  phone: "+33 6 12 34 56 78",
  location: "Paris, France",
  linkedin: "linkedin.com/in/mariedupont",
  summary: "Marketing Manager 8 ans en B2B SaaS. Specialiste growth, demand generation et content. Pilotage budgets 500K-1.5M EUR avec ROI mesure +180% en 2 ans.",
  experience: [
    {
      id: 1,
      title: "Marketing Manager Senior",
      company: "TechFlow SaaS",
      period: "2022-Present",
      location: "Paris",
      bullets: [
        "Pilotage strategie growth B2B sur 4 marches europeens",
        "Augmentation MQL +180% en 18 mois (budget 1.2M EUR)",
        "Equipe de 6 personnes : content, ops, paid, brand"
      ]
    },
    {
      id: 2,
      title: "Content Marketing Lead",
      company: "DataLab",
      period: "2019-2022",
      location: "Paris",
      bullets: [
        "Strategie editoriale 3 langues, 80 articles par an",
        "Audience blog x4 en 2 ans (de 25K a 100K visites/mois)",
        "Lancement podcast B2B, 12K ecoutes par episode"
      ]
    },
    {
      id: 3,
      title: "Marketing Specialist",
      company: "WebStudio",
      period: "2016-2019",
      location: "Lyon",
      bullets: [
        "Campagnes paid (Google, LinkedIn, Meta) ROAS 4.2x",
        "Mise en place CRM HubSpot (700 leads / mois)"
      ]
    }
  ],
  education: [
    { id: 1, degree: "Master Marketing & Strategie", school: "EM Lyon", period: "2014-2016" },
    { id: 2, degree: "Licence Communication", school: "Sorbonne", period: "2011-2014" }
  ],
  skills: [
    "Growth marketing", "B2B SaaS", "Content strategy",
    "HubSpot CRM", "Google Analytics", "SEO/SEM",
    "Demand generation", "Marketing automation"
  ],
  languages: [
    { lang: "Francais", level: "Natif" },
    { lang: "Anglais", level: "C1" },
    { lang: "Espagnol", level: "B2" }
  ],
  certifications: [
    "HubSpot Inbound Marketing",
    "Google Analytics Individual Qualification"
  ]
};

// === Etapes ===
const STEPS_FR = [
  {
    id: "welcome",
    target: null,
    duration: 4500,
    companionPosition: "center",
    companionMode: "idle",
    bubblePosition: "below",
    eyebrow: "Bienvenue",
    title: "Salut, je suis Nuvi.",
    text: "Mon job ? Transformer ton CV en arme pour decrocher tes entretiens. Je te montre 4 features cles en 30 secondes avec un CV exemple.",
    cta: "Allons-y",
  },
  {
    id: "coach",
    target: "button[aria-label=\"Coach\"]",
    duration: 5500,
    action: "open-coach",
    companionPosition: "near-target",
    companionMode: "speaking",
    bubblePosition: "left",
    eyebrow: "Coach IA",
    title: "Je suis ton conseiller perso",
    text: "Tu doutes d'une formulation ? Tu chattes avec moi, je te propose 3 versions, tu choisis. Resultat : une accroche taillee pour ton secteur.",
    cta: "Suivant",
  },
  {
    id: "match",
    target: null,
    duration: 5500,
    action: "open-match",
    companionPosition: "center",
    companionMode: "speaking",
    bubblePosition: "below",
    eyebrow: "Match offre",
    title: "87% de match detecte",
    text: "Tu colles une offre, je te dis ton % de match et les mots-cles manquants. Tu candidates qu'aux jobs ou t'as des chances.",
    cta: "Suivant",
  },
  {
    id: "pack",
    target: null,
    duration: 5500,
    action: "open-pack",
    companionPosition: "center",
    companionMode: "speaking",
    bubblePosition: "below",
    eyebrow: "Pack candidature",
    title: "4 textes en 1 click",
    text: "Lettre de motiv + message LinkedIn + mail + pitch entretien. Tout coherent, tout cible sur l'offre. Pret a copier-coller.",
    cta: "Suivant",
  },
  {
    id: "score",
    target: null,
    duration: 5500,
    action: "open-score",
    companionPosition: "center",
    companionMode: "speaking",
    bubblePosition: "below",
    eyebrow: "Score 8 axes",
    title: "Note 75/100 - Top priorite",
    text: "Je note ton CV sur 8 dimensions et te dis EXACTEMENT quoi ameliorer. La premiere chose a faire est tout en haut.",
    cta: "Suivant",
  },
  {
    id: "conclusion",
    target: null,
    duration: 6000,
    action: "restore",
    companionPosition: "center",
    companionMode: "idle",
    bubblePosition: "below",
    eyebrow: "Et bien plus",
    title: "Pret a briller ?",
    text: "Audit ATS, Truth Check, Positionnement, Versions multi-CV, Preparation entretien... Tu decouvriras le reste. A toi de jouer !",
    cta: "Commencer",
  },
];

const STEPS_EN = [
  {
    id: "welcome",
    target: null,
    duration: 4500,
    companionPosition: "center",
    companionMode: "idle",
    bubblePosition: "below",
    eyebrow: "Welcome",
    title: "Hi, I'm Nuvi.",
    text: "My job? Turn your CV into a weapon to land interviews. Let me show you 4 key features in 30 seconds with a sample CV.",
    cta: "Let's go",
  },
  {
    id: "coach",
    target: "button[aria-label=\"Coach\"]",
    duration: 5500,
    action: "open-coach",
    companionPosition: "near-target",
    companionMode: "speaking",
    bubblePosition: "left",
    eyebrow: "AI Coach",
    title: "Your personal advisor",
    text: "Doubting a phrasing? Chat with me, I suggest 3 versions, you pick. Result: a summary tailored to your industry.",
    cta: "Next",
  },
  {
    id: "match",
    target: null,
    duration: 5500,
    action: "open-match",
    companionPosition: "center",
    companionMode: "speaking",
    bubblePosition: "below",
    eyebrow: "Job match",
    title: "87% match detected",
    text: "Paste a job offer, I tell you your match % and missing keywords. Apply only to jobs where you have a real shot.",
    cta: "Next",
  },
  {
    id: "pack",
    target: null,
    duration: 5500,
    action: "open-pack",
    companionPosition: "center",
    companionMode: "speaking",
    bubblePosition: "below",
    eyebrow: "Application pack",
    title: "4 texts in 1 click",
    text: "Cover letter + LinkedIn message + email + interview pitch. All consistent, all targeted. Ready to copy-paste.",
    cta: "Next",
  },
  {
    id: "score",
    target: null,
    duration: 5500,
    action: "open-score",
    companionPosition: "center",
    companionMode: "speaking",
    bubblePosition: "below",
    eyebrow: "Score 8 axes",
    title: "75/100 - Top priority",
    text: "I score your CV on 8 dimensions and tell you EXACTLY what to improve. The first thing to fix is at the top.",
    cta: "Next",
  },
  {
    id: "conclusion",
    target: null,
    duration: 6000,
    action: "restore",
    companionPosition: "center",
    companionMode: "idle",
    bubblePosition: "below",
    eyebrow: "And much more",
    title: "Ready to shine?",
    text: "ATS Audit, Truth Check, Positioning, Multi-CV, Interview Prep... You'll discover the rest. Now it's your turn!",
    cta: "Start",
  },
];

// Calcule la position de NuviCompanion
function computeCompanionPos(step, viewportW, viewportH) {
  const SIZE = 120;
  if (step.companionPosition === "center" || !step.target) {
    return {
      x: (viewportW - SIZE) / 2,
      y: (viewportH - SIZE) / 2 - 80,
    };
  }
  const el = document.querySelector(step.target);
  if (!el) {
    return {
      x: (viewportW - SIZE) / 2,
      y: (viewportH - SIZE) / 2 - 80,
    };
  }
  const rect = el.getBoundingClientRect();
  if (step.bubblePosition === "right") {
    return {
      x: Math.min(rect.right + 30, viewportW - SIZE - 20),
      y: Math.max(20, rect.top + rect.height / 2 - SIZE / 2),
    };
  }
  if (step.bubblePosition === "left") {
    return {
      x: Math.max(20, rect.left - SIZE - 30),
      y: Math.max(20, rect.top + rect.height / 2 - SIZE / 2),
    };
  }
  if (step.bubblePosition === "above") {
    return {
      x: Math.max(20, Math.min(rect.left + rect.width / 2 - SIZE / 2, viewportW - SIZE - 20)),
      y: Math.max(20, rect.top - SIZE - 30),
    };
  }
  return {
    x: Math.max(20, Math.min(rect.left + rect.width / 2 - SIZE / 2, viewportW - SIZE - 20)),
    y: Math.min(rect.bottom + 30, viewportH - SIZE - 20),
  };
}

function computeCursorTarget(step) {
  if (!step.target) return null;
  const el = document.querySelector(step.target);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

export default function NuviTutorial({
  lang = "fr",
  mob = false,
  onComplete,
  onSkip,
  onLoadDemoCV,
  onRestoreCV,
  onOpenModal,
  onCloseModal,
  onSetMockMode,
}) {
  const STEPS = lang === "en" ? STEPS_EN : STEPS_FR;
  const [stepIdx, setStepIdx] = useState(0);
  const [companionPos, setCompanionPos] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0, visible: false, clicking: false });
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const autoSkipTimer = useRef(null);
  const progressTimer = useRef(null);
  const cursorTimer = useRef(null);

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  useEffect(() => {
    const update = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Au mount : load CV demo + mock mode
  useEffect(() => {
    if (onLoadDemoCV) onLoadDemoCV(DEMO_CV);
    if (onSetMockMode) onSetMockMode(true);
    return () => {
      if (onSetMockMode) onSetMockMode(false);
      if (onCloseModal) onCloseModal();
      if (onRestoreCV) onRestoreCV();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNext = useCallback(() => {
    if (onCloseModal) onCloseModal();
    if (isLast) {
      if (onSetMockMode) onSetMockMode(false);
      if (onRestoreCV) onRestoreCV();
      onComplete && onComplete();
    } else {
      setStepIdx(i => i + 1);
    }
  }, [isLast, onCloseModal, onComplete, onRestoreCV, onSetMockMode]);

  const handleSkip = useCallback(() => {
    if (autoSkipTimer.current) clearTimeout(autoSkipTimer.current);
    if (progressTimer.current) clearInterval(progressTimer.current);
    if (onCloseModal) onCloseModal();
    if (onSetMockMode) onSetMockMode(false);
    if (onRestoreCV) onRestoreCV();
    onSkip && onSkip();
  }, [onCloseModal, onRestoreCV, onSetMockMode, onSkip]);

  // Sequence d'animation par etape
  useEffect(() => {
    if (!viewport.w || !viewport.h) return;

    setBubbleVisible(false);
    setProgress(0);
    setCursorPos(p => ({ ...p, visible: false, clicking: false }));

    if (autoSkipTimer.current) clearTimeout(autoSkipTimer.current);
    if (progressTimer.current) clearInterval(progressTimer.current);
    if (cursorTimer.current) clearTimeout(cursorTimer.current);

    const cursorTarget = computeCursorTarget(step);

    if (cursorTarget && step.action) {
      // Curseur fantome se deplace puis clique
      setCursorPos({
        x: viewport.w / 2,
        y: viewport.h / 2,
        visible: true,
        clicking: false,
      });
      cursorTimer.current = setTimeout(() => {
        setCursorPos({
          x: cursorTarget.x,
          y: cursorTarget.y,
          visible: true,
          clicking: false,
        });
        cursorTimer.current = setTimeout(() => {
          setCursorPos(p => ({ ...p, clicking: true }));
          if (step.action && onOpenModal) {
            onOpenModal(step.action);
          }
          cursorTimer.current = setTimeout(() => {
            setCursorPos(p => ({ ...p, clicking: false, visible: false }));
          }, 600);
        }, 800);
      }, 200);
    } else if (step.action && onOpenModal) {
      // Pas de target visible mais action a faire (open-match, open-pack, etc.)
      setTimeout(() => onOpenModal(step.action), 400);
    }

    setTimeout(() => {
      const pos = computeCompanionPos(step, viewport.w, viewport.h);
      setCompanionPos(pos);
      setTimeout(() => setBubbleVisible(true), 300);
    }, cursorTarget ? 1500 : 100);

    const startTime = Date.now();
    progressTimer.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min(100, (elapsed / step.duration) * 100));
    }, 50);

    autoSkipTimer.current = setTimeout(() => {
      handleNext();
    }, step.duration);

    return () => {
      if (autoSkipTimer.current) clearTimeout(autoSkipTimer.current);
      if (progressTimer.current) clearInterval(progressTimer.current);
      if (cursorTimer.current) clearTimeout(cursorTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, viewport.w, viewport.h]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") handleSkip();
      if (e.key === "ArrowRight" || e.key === " ") handleNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleNext, handleSkip]);

  if (!viewport.w) return null;

  const BUBBLE_W = mob ? Math.min(280, viewport.w - 40) : 340;
  const COMPANION_SIZE = 120;
  let bubbleStyle = {};
  if (step.bubblePosition === "below") {
    bubbleStyle = {
      left: companionPos.x + COMPANION_SIZE / 2 - BUBBLE_W / 2,
      top: companionPos.y + COMPANION_SIZE + 16,
    };
  } else if (step.bubblePosition === "above") {
    bubbleStyle = {
      left: companionPos.x + COMPANION_SIZE / 2 - BUBBLE_W / 2,
      top: companionPos.y - 16,
      transform: "translateY(-100%)",
    };
  } else if (step.bubblePosition === "right") {
    bubbleStyle = {
      left: companionPos.x + COMPANION_SIZE + 16,
      top: companionPos.y,
    };
  } else if (step.bubblePosition === "left") {
    bubbleStyle = {
      left: companionPos.x - 16,
      top: companionPos.y,
      transform: "translateX(-100%)",
    };
  }
  bubbleStyle.left = Math.max(20, Math.min(bubbleStyle.left, viewport.w - BUBBLE_W - 20));
  bubbleStyle.top = Math.max(20, Math.min(bubbleStyle.top, viewport.h - 240));

  return (
    <>
      {/* Overlay sombre */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 10, 10, 0.55)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          zIndex: 9000,
          animation: "nvTutFadeIn 300ms ease-out",
          pointerEvents: "auto",
        }}
        onClick={handleSkip}
      />

      {/* Curseur fantome */}
      {cursorPos.visible && (
        <div
          style={{
            position: "fixed",
            left: cursorPos.x - 14,
            top: cursorPos.y - 14,
            width: 28,
            height: 28,
            zIndex: 9004,
            pointerEvents: "none",
            transition: "left 800ms cubic-bezier(0.4, 0, 0.2, 1), top 800ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#ffffff",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.1)",
              border: "2px solid rgba(255, 255, 255, 0.9)",
              transform: cursorPos.clicking ? "scale(0.85)" : "scale(1)",
              transition: "transform 200ms ease-out",
            }}
          />
          {cursorPos.clicking && (
            <div
              style={{
                position: "absolute",
                inset: -8,
                borderRadius: "50%",
                border: "2px solid rgba(255, 255, 255, 0.6)",
                animation: "nvTutClickPulse 600ms ease-out",
              }}
            />
          )}
        </div>
      )}

      {/* NuviCompanion */}
      <div
        style={{
          position: "fixed",
          left: companionPos.x,
          top: companionPos.y,
          width: COMPANION_SIZE,
          height: COMPANION_SIZE,
          zIndex: 9002,
          transition: "all 700ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <NuviCompanion size={COMPANION_SIZE} mode={step.companionMode} />
      </div>

      {/* Bulle de dialogue */}
      <div
        style={{
          position: "fixed",
          ...bubbleStyle,
          width: BUBBLE_W,
          zIndex: 9003,
          background: "var(--nuvi-paper)",
          color: "var(--nuvi-ink)",
          borderRadius: 20,
          padding: "20px 22px 16px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25), 0 0 0 0.5px rgba(10, 10, 10, 0.08)",
          fontFamily: Sans,
          opacity: bubbleVisible ? 1 : 0,
          transform: `${bubbleStyle.transform || ""} ${bubbleVisible ? "scale(1)" : "scale(0.92)"}`,
          transformOrigin:
            step.bubblePosition === "above" ? "bottom center" :
            step.bubblePosition === "left" ? "right center" :
            step.bubblePosition === "right" ? "left center" :
            "top center",
          transition: "opacity 280ms ease-out, transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}>
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: Purple,
          }}>{step.eyebrow || "Nuvi"}</span>
          <span style={{
            fontSize: 10,
            fontWeight: 500,
            color: "var(--nuvi-ink-muted)",
          }}>{stepIdx + 1} / {STEPS.length}</span>
        </div>

        <div style={{
          fontFamily: Serif,
          fontSize: mob ? 18 : 20,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          marginBottom: 8,
          lineHeight: 1.2,
        }}>{step.title}</div>

        <div style={{
          fontSize: mob ? 13 : 14,
          lineHeight: 1.5,
          color: "var(--nuvi-ink-muted)",
          marginBottom: 14,
        }}>{step.text}</div>

        <div style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}>
          <button
            onClick={handleSkip}
            style={{
              border: "none",
              background: "transparent",
              color: "var(--nuvi-ink-muted)",
              fontSize: 12,
              fontFamily: Sans,
              fontWeight: 500,
              cursor: "pointer",
              padding: "6px 4px",
              textDecoration: "underline",
              textUnderlineOffset: "2px",
            }}
          >
            {lang === "en" ? "Skip" : "Passer"}
          </button>
          <button
            onClick={handleNext}
            style={{
              border: "none",
              background: GradPurple,
              color: "#fff",
              fontSize: 13,
              fontFamily: Sans,
              fontWeight: 600,
              cursor: "pointer",
              padding: "10px 22px",
              borderRadius: 999,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 14px rgba(91, 61, 245, 0.35)",
              transition: "transform 200ms ease-out",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
          >
            {step.cta}
            {!isLast && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
            )}
          </button>
        </div>

        <div style={{
          height: 3,
          background: "rgba(91, 61, 245, 0.12)",
          borderRadius: 2,
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${progress}%`,
            background: GradPurple,
            borderRadius: 2,
            transition: "width 50ms linear",
          }}/>
        </div>
      </div>

      <style>{`
        @keyframes nvTutFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes nvTutClickPulse {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </>
  );
}
