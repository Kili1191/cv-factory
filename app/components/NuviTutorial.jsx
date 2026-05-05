"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

const NuviCompanion = dynamic(() => import("./NuviCompanion"), { ssr: false });

// ============================================================
// NuviTutorial v5 — Sidebar Tour Zen + Sub-menu auto
//
// Le tutorial fait visiter les onglets de la sidebar :
//   - NuviHome cachee (CV demo charge)
//   - Sidebar FORCEE expanded (240px) pendant tout le tour
//   - Pour Editer/Audits/Mes CV/Design : panel flottant auto-ouvert
//   - Nuvi vole vers chaque onglet (700ms cubic-bezier)
//   - Highlight pulsant subtil
//   - Bulle a cote avec Eyebrow + Title + Text
//   - 5-7s par etape, ~70s total
//   - Detection langue auto (FR/EN)
//
// Props:
//   - mob: boolean
//   - onComplete: () => void
//   - onSkip: () => void
//   - onLoadDemoCV: (demoCV) => void
//   - onRestoreCV: () => void
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

// === Etapes du tutorial ===
// Format: { id, target, hasSubMenu, duration, eyebrow, title, text, cta?, position? }
// hasSubMenu: true = simule mouseenter pour ouvrir le panel flottant
const STEPS_FR = [
  {
    id: "welcome",
    target: null,
    position: "center",
    duration: 6500,
    eyebrow: "Bienvenue",
    title: "Je vais te faire briller.",
    text: "60 secondes pour découvrir comment Nuvi t'aide à décrocher ton prochain job.",
    cta: "C'est parti",
  },
  {
    id: "home",
    target: "home",
    duration: 5500,
    eyebrow: "Accueil",
    title: "Ton tableau de bord.",
    text: "Tout ton CV en un coup d'œil. Tes modifications en direct.",
  },
  {
    id: "coach",
    target: "coach",
    duration: 7500,
    eyebrow: "Coach IA",
    title: "Ton conseiller carrière 24/7.",
    text: "Reformuler, préparer un entretien, comprendre un refus, choisir entre 2 jobs, négocier ton salaire. Tout ce dont tu as besoin, je le fais.",
  },
  {
    id: "edit",
    target: "edit",
    hasSubMenu: true,
    duration: 6500,
    eyebrow: "Éditer",
    title: "Clique et ça change.",
    text: "Identité, expériences, formation, compétences. Tout se modifie sur place.",
  },
  {
    id: "target",
    target: "target",
    duration: 5500,
    eyebrow: "Match offre",
    title: "87% de match. Bonne nouvelle.",
    text: "Tes chances avant de postuler. Et les mots-clés à ajouter pour passer à 95%.",
  },
  {
    id: "pack",
    target: "pack",
    duration: 5500,
    eyebrow: "Pack candidature",
    title: "4 textes. 1 clic.",
    text: "Lettre, message LinkedIn, mail, pitch entretien. Tous cohérents avec l'offre.",
  },
  {
    id: "audits",
    target: "audits",
    hasSubMenu: true,
    duration: 7000,
    eyebrow: "Score & Audits",
    title: "75/100 et tu sais quoi faire.",
    text: "Score recruteur, positionnement, vérité, lisser le parcours. L'action numéro 1 te fait gagner 5 points.",
  },
  {
    id: "cvs",
    target: "cvs",
    hasSubMenu: true,
    duration: 6000,
    eyebrow: "Mes CV",
    title: "Plusieurs CV pour plusieurs cibles.",
    text: "Liste, versions, comparaison, modèles. Garde toutes tes versions.",
  },
  {
    id: "design",
    target: "design",
    hasSubMenu: true,
    duration: 6000,
    eyebrow: "Apparence",
    title: "Design adapté à ton secteur.",
    text: "Personnaliser couleurs et polices. Traduire FR/EN en 1 clic.",
  },
  {
    id: "tracking",
    target: "tracking",
    duration: 5500,
    eyebrow: "Candidatures",
    title: "Suivi de toutes tes candidatures.",
    text: "Plus jamais « j'ai postulé chez qui déjà ? ».",
  },
  {
    id: "conclusion",
    target: null,
    position: "center",
    duration: 6500,
    eyebrow: "À toi",
    title: "À toi de briller.",
    text: "Tu peux relancer ce tour à tout moment dans Réglages.",
    cta: "Commencer",
  },
];

const STEPS_EN = [
  {
    id: "welcome",
    target: null,
    position: "center",
    duration: 6500,
    eyebrow: "Welcome",
    title: "I'll make you shine.",
    text: "60 seconds to discover how Nuvi helps you land your next job.",
    cta: "Let's go",
  },
  {
    id: "home",
    target: "home",
    duration: 5500,
    eyebrow: "Home",
    title: "Your dashboard.",
    text: "All your CV at a glance. Your edits in real time.",
  },
  {
    id: "coach",
    target: "coach",
    duration: 7500,
    eyebrow: "AI Coach",
    title: "Your 24/7 career advisor.",
    text: "Rephrase, prepare interviews, understand rejections, choose between 2 jobs, negotiate salary. Whatever you need, I do it.",
  },
  {
    id: "edit",
    target: "edit",
    hasSubMenu: true,
    duration: 6500,
    eyebrow: "Edit",
    title: "Click and it changes.",
    text: "Identity, experience, education, skills. Everything edits in place.",
  },
  {
    id: "target",
    target: "target",
    duration: 5500,
    eyebrow: "Match",
    title: "87% match. Good news.",
    text: "Your chances before you apply. Plus the keywords to add to reach 95%.",
  },
  {
    id: "pack",
    target: "pack",
    duration: 5500,
    eyebrow: "Application pack",
    title: "4 texts. 1 click.",
    text: "Cover letter, LinkedIn message, email, interview pitch. All aligned with the offer.",
  },
  {
    id: "audits",
    target: "audits",
    hasSubMenu: true,
    duration: 7000,
    eyebrow: "Score & Audits",
    title: "75/100 and you know what to do.",
    text: "Recruiter score, positioning, truth check, gap repair. The #1 action gains you 5 points.",
  },
  {
    id: "cvs",
    target: "cvs",
    hasSubMenu: true,
    duration: 6000,
    eyebrow: "My CVs",
    title: "Multiple CVs for multiple targets.",
    text: "List, versions, compare, templates. Keep all your versions.",
  },
  {
    id: "design",
    target: "design",
    hasSubMenu: true,
    duration: 6000,
    eyebrow: "Appearance",
    title: "Design tailored to your industry.",
    text: "Customize colors and fonts. Translate FR/EN in 1 click.",
  },
  {
    id: "tracking",
    target: "tracking",
    duration: 5500,
    eyebrow: "Applications",
    title: "Track all your applications.",
    text: "Never again 'where did I apply already?'.",
  },
  {
    id: "conclusion",
    target: null,
    position: "center",
    duration: 6500,
    eyebrow: "Your turn",
    title: "Now it's your turn.",
    text: "You can replay this tour anytime in Settings.",
    cta: "Start",
  },
];

// Detection langue navigateur
function detectBrowserLang() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "en";
  const browserLang = navigator.language || navigator.userLanguage || "en";
  return browserLang.toLowerCase().startsWith("fr") ? "fr" : "en";
}

// Cherche l'element de la sidebar par data-nv-nav
function findSidebarItem(navKey) {
  if (!navKey) return null;
  return document.querySelector(`[data-nv-nav="${navKey}"]`);
}

// Force la sidebar en mode expanded en simulant un mouseenter
function forceSidebarExpanded() {
  const aside = document.querySelector("aside");
  if (!aside) return;
  // Simule mouseenter sur la sidebar pour declencher le state expanded
  const event = new MouseEvent("mouseenter", { bubbles: true });
  aside.dispatchEvent(event);
}

// Cherche le panel flottant (sub-menu) qui s'ouvre apres mouseenter sur Editer/Audits/etc
function findFloatingPanel() {
  // Le panel flottant a role="menu"
  return document.querySelector('[role="menu"]');
}

// Calcule la position de NuviCompanion
function computeCompanionPos(step, viewportW, viewportH) {
  const SIZE = 110;
  // Etape welcome / conclusion : centre haut
  if (step.position === "center" || !step.target) {
    return {
      x: (viewportW - SIZE) / 2,
      y: viewportH * 0.30 - SIZE / 2,
    };
  }
  // Etape avec target : a droite de l'onglet (ou plus a droite si sub-menu)
  const el = findSidebarItem(step.target);
  if (!el) {
    return {
      x: (viewportW - SIZE) / 2,
      y: viewportH * 0.30 - SIZE / 2,
    };
  }
  const rect = el.getBoundingClientRect();
  // Si sub-menu ouvert, Nuvi va plus a droite pour laisser voir le panel
  let xOffset = 24;
  if (step.hasSubMenu) {
    // Sidebar expanded = 240px, panel flottant ~220-260px de large
    xOffset = 250 + 24;
  }
  return {
    x: Math.min(rect.right + xOffset, viewportW - SIZE - 20),
    y: Math.max(20, rect.top + rect.height / 2 - SIZE / 2),
  };
}

// Calcule la box de highlight autour du target
function computeHighlightBox(step) {
  if (!step.target) return null;
  const el = findSidebarItem(step.target);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const PAD = 6;
  return {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  };
}

export default function NuviTutorial({
  mob = false,
  onComplete,
  onSkip,
  onLoadDemoCV,
  onRestoreCV,
}) {
  const [detectedLang] = useState(() => detectBrowserLang());
  const STEPS = detectedLang === "fr" ? STEPS_FR : STEPS_EN;

  const [stepIdx, setStepIdx] = useState(0);
  const [companionPos, setCompanionPos] = useState({ x: 0, y: 0 });
  const [highlightBox, setHighlightBox] = useState(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const autoSkipTimer = useRef(null);
  const progressTimer = useRef(null);
  const sidebarKeepAliveTimer = useRef(null);

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;
  const isFirstOrLast = step.position === "center";

  // Init viewport
  useEffect(() => {
    const update = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Au mount : load CV demo + force sidebar expanded
  useEffect(() => {
    if (onLoadDemoCV) onLoadDemoCV(DEMO_CV);
    // Force la sidebar expanded en boucle (toutes les 200ms)
    // pour eviter qu'elle se ferme si on bouge accidentellement la souris
    const keepAlive = () => {
      forceSidebarExpanded();
    };
    keepAlive();
    sidebarKeepAliveTimer.current = setInterval(keepAlive, 300);

    return () => {
      if (sidebarKeepAliveTimer.current) clearInterval(sidebarKeepAliveTimer.current);
      if (onRestoreCV) onRestoreCV();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNext = useCallback(() => {
    if (isLast) {
      if (onRestoreCV) onRestoreCV();
      onComplete && onComplete();
    } else {
      setStepIdx(i => i + 1);
    }
  }, [isLast, onComplete, onRestoreCV]);

  const handleSkip = useCallback(() => {
    if (autoSkipTimer.current) clearTimeout(autoSkipTimer.current);
    if (progressTimer.current) clearInterval(progressTimer.current);
    if (onRestoreCV) onRestoreCV();
    onSkip && onSkip();
  }, [onRestoreCV, onSkip]);

  // Sequence par etape
  useEffect(() => {
    if (!viewport.w || !viewport.h) return;

    setBubbleVisible(false);
    setProgress(0);

    if (autoSkipTimer.current) clearTimeout(autoSkipTimer.current);
    if (progressTimer.current) clearInterval(progressTimer.current);

    // Force sidebar expanded
    forceSidebarExpanded();

    // Simule mouseenter sur l'onglet pour highlight + sub-menu si applicable
    const targetEl = findSidebarItem(step.target);
    if (targetEl) {
      // mouseenter sur l'onglet declenche l'ouverture du sub-menu (via le code de NuviSidebar)
      const event = new MouseEvent("mouseenter", { bubbles: true });
      targetEl.dispatchEvent(event);
    }

    // Recalcul positions apres petit delai (pour laisser le sub-menu s'ouvrir)
    const positionDelay = step.hasSubMenu ? 250 : 100;
    setTimeout(() => {
      const pos = computeCompanionPos(step, viewport.w, viewport.h);
      const box = computeHighlightBox(step);
      setCompanionPos(pos);
      setHighlightBox(box);
      setTimeout(() => setBubbleVisible(true), 400);
    }, positionDelay);

    // Auto-skip
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, viewport.w, viewport.h]);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") handleSkip();
      if (e.key === "ArrowRight" || e.key === " ") handleNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleNext, handleSkip]);

  if (!viewport.w) return null;

  // Position de la bulle
  const COMPANION_SIZE = 110;
  const BUBBLE_W = mob ? Math.min(280, viewport.w - 40) : 320;
  let bubbleStyle = {};

  if (isFirstOrLast) {
    bubbleStyle = {
      left: companionPos.x + COMPANION_SIZE / 2 - BUBBLE_W / 2,
      top: companionPos.y + COMPANION_SIZE + 18,
    };
  } else {
    bubbleStyle = {
      left: companionPos.x + COMPANION_SIZE + 16,
      top: companionPos.y - 10,
    };
  }
  bubbleStyle.left = Math.max(20, Math.min(bubbleStyle.left, viewport.w - BUBBLE_W - 20));
  bubbleStyle.top = Math.max(20, Math.min(bubbleStyle.top, viewport.h - 240));

  return (
    <>
      {/* Overlay sombre - sans flou pour garder la sidebar nette */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 10, 10, 0.4)",
          zIndex: 9000,
          animation: "nvTutFadeIn 350ms ease-out",
          pointerEvents: "auto",
        }}
        onClick={handleSkip}
      />

      {/* Highlight box decoupant l'overlay */}
      {highlightBox && (
        <div
          style={{
            position: "fixed",
            top: highlightBox.top,
            left: highlightBox.left,
            width: highlightBox.width,
            height: highlightBox.height,
            zIndex: 9001,
            borderRadius: 14,
            boxShadow: "0 0 0 9999px rgba(10, 10, 10, 0.4)",
            pointerEvents: "none",
            transition: "all 600ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            animation: "nvTutHighlight 1.8s ease-in-out infinite",
          }}
        />
      )}

      {/* NuviCompanion qui vole entre les positions */}
      <div
        style={{
          position: "fixed",
          left: companionPos.x,
          top: companionPos.y,
          width: COMPANION_SIZE,
          height: COMPANION_SIZE,
          zIndex: 9002,
          transition: "left 700ms cubic-bezier(0.34, 1.56, 0.64, 1), top 700ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <NuviCompanion size={COMPANION_SIZE} mode={isFirstOrLast ? "idle" : "speaking"} />
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
          padding: "20px 22px 14px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25), 0 0 0 0.5px rgba(10, 10, 10, 0.08)",
          fontFamily: Sans,
          opacity: bubbleVisible ? 1 : 0,
          transform: bubbleVisible ? "scale(1)" : "scale(0.94)",
          transformOrigin: isFirstOrLast ? "top center" : "left center",
          transition: "opacity 280ms ease-out, transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Eyebrow + counter */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}>
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: Purple,
          }}>{step.eyebrow}</span>
          <span style={{
            fontSize: 10,
            fontWeight: 500,
            color: "var(--nuvi-ink-muted)",
          }}>{stepIdx + 1} / {STEPS.length}</span>
        </div>

        {/* Titre */}
        <div style={{
          fontFamily: Serif,
          fontSize: mob ? 18 : 20,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          marginBottom: 8,
          lineHeight: 1.2,
        }}>{step.title}</div>

        {/* Texte */}
        <div style={{
          fontSize: mob ? 13 : 14,
          lineHeight: 1.5,
          color: "var(--nuvi-ink-muted)",
          marginBottom: 14,
        }}>{step.text}</div>

        {/* Boutons */}
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
            {detectedLang === "en" ? "Skip" : "Passer"}
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
              padding: "10px 20px",
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
            {step.cta || (detectedLang === "en" ? "Next" : "Suivant")}
            {!isLast && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
            )}
          </button>
        </div>

        {/* Progress bar */}
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
        @keyframes nvTutHighlight {
          0%, 100% {
            box-shadow:
              0 0 0 9999px rgba(10, 10, 10, 0.4),
              0 0 0 0 rgba(91, 61, 245, 0.5);
          }
          50% {
            box-shadow:
              0 0 0 9999px rgba(10, 10, 10, 0.4),
              0 0 0 8px rgba(91, 61, 245, 0);
          }
        }
      `}</style>
    </>
  );
}
