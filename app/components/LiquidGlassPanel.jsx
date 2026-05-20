"use client";

// LiquidGlassPanel v10 - REWRITE PROPRE
//
// Approche simplifiee qui evite TOUS les bugs precedents :
// - PAS de mix-blend-mode (cause des elements qui disparaissent)
// - PAS d'animation sur filter:drop-shadow (cause les repaints/flickers)
// - PAS d'isolation chaotique
// - 4 blobs SEULEMENT (pas 8) en background-image (pas en DOM elements)
// - Bordure SIMPLE qui change de couleur via background-image animation
// - Logo Nuvi avec shadow gentle (text-shadow, pas filter)
//
// Sub-exports :
//   - NuviLogoAnimated : logo "Nuvi" en gradient anime avec shadow gentle
//   - NuviTextGlass    : texte blanc avec text-shadow universelle
//   - NuviTextGlassCoral : texte Coral avec text-shadow

import React from "react";

// ============================================================================
// LOGO ANIME NUVI
// ============================================================================

export function NuviLogoAnimated({ size = 26 }) {
  return (
    <div
      style={{
        fontFamily: '"Fraunces", "Playfair Display", Georgia, serif',
        fontWeight: 400,
        fontStyle: "italic",
        fontSize: size,
        letterSpacing: "-0.02em",
        lineHeight: 1,
        color: "#fff",
        textShadow: `
          0 2px 6px rgba(0,0,0,0.35),
          0 0 10px rgba(217,119,87,0.4),
          0 0 18px rgba(91,61,245,0.3)
        `,
        userSelect: "none",
        display: "inline-block",
      }}
    >
      Nuvi
    </div>
  );
}

// ============================================================================
// TEXTE GLASS (titre + sous-titre)
// ============================================================================

export function NuviTextGlass({ children, style = {} }) {
  return (
    <div
      style={{
        color: "#fff",
        textShadow: `
          0 1px 3px rgba(0,0,0,0.6),
          0 0 8px rgba(0,0,0,0.3),
          0 0 12px rgba(0,0,0,0.2)
        `,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function NuviTextGlassCoral({ children, style = {} }) {
  return (
    <div
      style={{
        color: "#d97757",
        textShadow: `
          0 1px 3px rgba(0,0,0,0.5),
          0 0 8px rgba(217,119,87,0.4)
        `,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ============================================================================
// PANEL PRINCIPAL
// ============================================================================

export default function LiquidGlassPanel({
  children,
  height = "94vh",
  maxWidth = 840,
  borderRadius = "32px 32px 0 0",
  borderColor = "#d97757",
  distortion = 30,
  tintColor = "rgba(255, 255, 255, 0.0)",
  animate = true,
}) {
  // ID unique pour eviter conflits CSS si plusieurs panels
  const id = React.useId().replace(/:/g, "");

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth,
        marginLeft: "auto",
        marginRight: "auto",
        height,
        borderRadius,
        overflow: "hidden",
        // [Fix 2026-05-20] Backdrop blur iOS Control Center : le CV derriere
        // est legerement floute, ce qui permet de "voir a travers" et suivre
        // les changements live sans que le texte du CV ne se confonde avec
        // le contenu du panel.
        backdropFilter: "blur(8px) saturate(140%)",
        WebkitBackdropFilter: "blur(8px) saturate(140%)",
        boxShadow: `
          0 -8px 32px rgba(0, 0, 0, 0.25),
          0 -2px 8px rgba(0, 0, 0, 0.15)
        `,
      }}
    >
      <style>{`
        /* ============================================================
           AURORA v3 - 6 blobs DIFFORMES qui morphent
           Chaque keyframe combine transform + border-radius pour que
           les blobs aient des shapes ORGANIQUES qui changent (comme
           du slime liquide), pas des cercles parfaits qui glissent.
           Pas de mix-blend-mode, juste superposition + blur + opacity.
           ============================================================ */
        @keyframes lgp-${id}-blob-a {
          0%   { transform: translate3d(0%, 0%, 0)    scale(1);    border-radius: 60% 40% 30% 70% / 50% 60% 40% 50%; }
          20%  { transform: translate3d(40%, 20%, 0)  scale(1.15); border-radius: 30% 70% 60% 40% / 40% 50% 50% 60%; }
          40%  { transform: translate3d(60%, 50%, 0)  scale(0.95); border-radius: 50% 50% 70% 30% / 60% 40% 60% 40%; }
          60%  { transform: translate3d(30%, 70%, 0)  scale(1.1);  border-radius: 40% 60% 50% 50% / 30% 70% 50% 50%; }
          80%  { transform: translate3d(-10%, 40%, 0) scale(1.05); border-radius: 70% 30% 40% 60% / 50% 60% 30% 70%; }
          100% { transform: translate3d(0%, 0%, 0)    scale(1);    border-radius: 60% 40% 30% 70% / 50% 60% 40% 50%; }
        }
        @keyframes lgp-${id}-blob-b {
          0%   { transform: translate3d(50%, 0%, 0)   scale(1.1); border-radius: 40% 60% 70% 30% / 60% 40% 50% 50%; }
          25%  { transform: translate3d(20%, 30%, 0)  scale(0.9); border-radius: 60% 40% 30% 70% / 30% 70% 60% 40%; }
          50%  { transform: translate3d(50%, 60%, 0)  scale(1.2); border-radius: 30% 70% 50% 50% / 50% 50% 70% 30%; }
          75%  { transform: translate3d(80%, 30%, 0)  scale(1);   border-radius: 50% 50% 60% 40% / 70% 30% 40% 60%; }
          100% { transform: translate3d(50%, 0%, 0)   scale(1.1); border-radius: 40% 60% 70% 30% / 60% 40% 50% 50%; }
        }
        @keyframes lgp-${id}-blob-c {
          0%   { transform: translate3d(20%, 60%, 0)  scale(1);    border-radius: 50% 50% 40% 60% / 60% 50% 50% 40%; }
          33%  { transform: translate3d(60%, 30%, 0)  scale(1.15); border-radius: 70% 30% 60% 40% / 40% 60% 30% 70%; }
          66%  { transform: translate3d(40%, 80%, 0)  scale(0.95); border-radius: 30% 70% 50% 50% / 50% 30% 70% 50%; }
          100% { transform: translate3d(20%, 60%, 0)  scale(1);    border-radius: 50% 50% 40% 60% / 60% 50% 50% 40%; }
        }
        @keyframes lgp-${id}-blob-d {
          0%   { transform: translate3d(70%, 70%, 0)  scale(1.1); border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%; }
          30%  { transform: translate3d(40%, 40%, 0)  scale(1);   border-radius: 40% 60% 70% 30% / 70% 40% 50% 30%; }
          60%  { transform: translate3d(10%, 70%, 0)  scale(1.2); border-radius: 50% 50% 30% 70% / 30% 60% 70% 40%; }
          100% { transform: translate3d(70%, 70%, 0)  scale(1.1); border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%; }
        }
        @keyframes lgp-${id}-blob-e {
          0%   { transform: translate3d(40%, 30%, 0)  scale(1.05); border-radius: 50% 50% 60% 40% / 40% 60% 50% 50%; }
          50%  { transform: translate3d(60%, 50%, 0)  scale(0.9);  border-radius: 70% 30% 40% 60% / 60% 40% 70% 30%; }
          100% { transform: translate3d(40%, 30%, 0)  scale(1.05); border-radius: 50% 50% 60% 40% / 40% 60% 50% 50%; }
        }
        @keyframes lgp-${id}-blob-f {
          0%   { transform: translate3d(10%, 50%, 0)  scale(1);    border-radius: 40% 60% 50% 50% / 50% 40% 60% 50%; }
          50%  { transform: translate3d(70%, 20%, 0)  scale(1.15); border-radius: 60% 40% 30% 70% / 40% 70% 30% 60%; }
          100% { transform: translate3d(10%, 50%, 0)  scale(1);    border-radius: 40% 60% 50% 50% / 50% 40% 60% 50%; }
        }

        .lgp-${id}-aurora-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-color: ${tintColor};
          overflow: hidden;
        }

        .lgp-${id}-blob {
          position: absolute;
          top: 0; left: 0;
          width: 80%;
          height: 80%;
          /* border-radius initial sera override par les keyframes */
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.22;
          will-change: transform, border-radius;
        }

        .lgp-${id}-blob.coral-1 {
          background: radial-gradient(circle, rgba(217, 119, 87, 0.95) 0%, rgba(217, 119, 87, 0) 70%);
          ${animate ? `animation: lgp-${id}-blob-a 38s ease-in-out infinite;` : ""}
        }
        .lgp-${id}-blob.coral-2 {
          background: radial-gradient(circle, rgba(217, 119, 87, 0.80) 0%, rgba(217, 119, 87, 0) 70%);
          ${animate ? `animation: lgp-${id}-blob-e 47s ease-in-out infinite;` : ""}
        }
        .lgp-${id}-blob.purple-1 {
          background: radial-gradient(circle, rgba(91, 61, 245, 0.85) 0%, rgba(91, 61, 245, 0) 70%);
          ${animate ? `animation: lgp-${id}-blob-b 43s ease-in-out infinite;` : ""}
        }
        .lgp-${id}-blob.purple-2 {
          background: radial-gradient(circle, rgba(91, 61, 245, 0.75) 0%, rgba(91, 61, 245, 0) 70%);
          ${animate ? `animation: lgp-${id}-blob-f 41s ease-in-out infinite;` : ""}
        }
        .lgp-${id}-blob.magenta-1 {
          background: radial-gradient(circle, rgba(185, 28, 140, 0.85) 0%, rgba(185, 28, 140, 0) 70%);
          ${animate ? `animation: lgp-${id}-blob-c 53s ease-in-out infinite;` : ""}
        }
        .lgp-${id}-blob.gold-1 {
          background: radial-gradient(circle, rgba(200, 169, 106, 0.70) 0%, rgba(200, 169, 106, 0) 70%);
          ${animate ? `animation: lgp-${id}-blob-d 49s ease-in-out infinite;` : ""}
        }

        /* ============================================================
           BORDURE ANIMEE - couleur qui change doucement
           Utilise box-shadow inset (pas de filter, pas de drop-shadow)
           = ZERO repaint extreme, ZERO flicker.
           ============================================================ */
        @keyframes lgp-${id}-border {
          0%, 100% {
            box-shadow:
              inset 0 0 0 1.5px rgba(217, 119, 87, 0.7),
              inset 0 0 20px rgba(217, 119, 87, 0.15);
          }
          33% {
            box-shadow:
              inset 0 0 0 1.5px rgba(91, 61, 245, 0.7),
              inset 0 0 20px rgba(91, 61, 245, 0.15);
          }
          66% {
            box-shadow:
              inset 0 0 0 1.5px rgba(185, 28, 140, 0.7),
              inset 0 0 20px rgba(185, 28, 140, 0.15);
          }
        }

        .lgp-${id}-border {
          position: absolute;
          inset: 0;
          z-index: 5;
          pointer-events: none;
          border-radius: ${typeof borderRadius === "string" ? borderRadius : borderRadius + "px"};
          ${animate ? `animation: lgp-${id}-border 18s ease-in-out infinite;` : `box-shadow: inset 0 0 0 1.5px ${borderColor};`}
        }

        /* ============================================================
           GLASS LIGHTING v3 - effet "soleil tape sur le verre" Apple-style
           ============================================================
           - Top edge : bord superieur lumineux comme un vrai bord de verre
           - Specular highlight : zone claire diagonale (reflet du soleil)
           - Edge light : bord exterieur lumineux (style widget iOS 26)
           - Glass refraction : gradient interne qui suggere l'epaisseur
        */

        /* 1. TOP EDGE LIGHT - bord superieur tres net et lumineux
              Simule la lumiere qui frappe le haut du verre */
        .lgp-${id}-top-edge {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1.5px;
          z-index: 6;
          pointer-events: none;
          background: linear-gradient(90deg,
            rgba(255, 255, 255, 0.0) 0%,
            rgba(255, 255, 255, 0.85) 35%,
            rgba(255, 255, 255, 0.95) 50%,
            rgba(255, 255, 255, 0.85) 65%,
            rgba(255, 255, 255, 0.0) 100%
          );
          border-radius: ${typeof borderRadius === "string" ? borderRadius : borderRadius + "px"} ${typeof borderRadius === "string" ? borderRadius : borderRadius + "px"} 0 0;
        }

        /* 2. TOP GRADIENT SHINE - zone claire douce sous le top edge
              Comme la lumiere qui filtre a travers le verre */
        .lgp-${id}-shine {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 80px;
          z-index: 4;
          pointer-events: none;
          background: linear-gradient(180deg,
            rgba(255, 255, 255, 0.22) 0%,
            rgba(255, 255, 255, 0.10) 30%,
            rgba(255, 255, 255, 0.04) 70%,
            transparent 100%
          );
          border-radius: ${typeof borderRadius === "string" ? borderRadius : borderRadius + "px"};
        }

        /* 3. SPECULAR HIGHLIGHT - reflet du soleil en diagonale
              Style "verre poli vu de l'angle ou la lumiere arrive" */
        .lgp-${id}-specular {
          position: absolute;
          top: -10%;
          left: 5%;
          width: 60%;
          height: 50%;
          z-index: 5;
          pointer-events: none;
          background: linear-gradient(135deg,
            rgba(255, 255, 255, 0.0) 0%,
            rgba(255, 255, 255, 0.0) 25%,
            rgba(255, 255, 255, 0.18) 45%,
            rgba(255, 255, 255, 0.28) 50%,
            rgba(255, 255, 255, 0.18) 55%,
            rgba(255, 255, 255, 0.0) 75%,
            rgba(255, 255, 255, 0.0) 100%
          );
          transform: rotate(-12deg);
          filter: blur(8px);
        }

        /* 4. SECONDARY HIGHLIGHT - 2eme reflet plus petit cote droit
              Pour donner la profondeur du verre */
        .lgp-${id}-specular-2 {
          position: absolute;
          top: 15%;
          right: 8%;
          width: 25%;
          height: 35%;
          z-index: 5;
          pointer-events: none;
          background: radial-gradient(ellipse at 30% 30%,
            rgba(255, 255, 255, 0.22) 0%,
            rgba(255, 255, 255, 0.08) 40%,
            rgba(255, 255, 255, 0.0) 70%
          );
          filter: blur(6px);
        }

        /* 5. EDGE LIGHTING APPLE STYLE - halo lumineux blanc cote droit + bas
              C'est ce qu'Apple fait sur les widgets iOS 26 / Sonoma */
        .lgp-${id}-edge-light {
          position: absolute;
          inset: 0;
          z-index: 7;
          pointer-events: none;
          border-radius: ${typeof borderRadius === "string" ? borderRadius : borderRadius + "px"};
          box-shadow:
            inset -1px -1px 0 0 rgba(255, 255, 255, 0.25),
            inset 1px 1px 0 0 rgba(255, 255, 255, 0.4),
            inset 0 0 30px rgba(255, 255, 255, 0.04);
        }

        /* 6. GLASS REFRACTION - tres subtil gradient interne
              Suggere que le verre a une epaisseur */
        .lgp-${id}-refraction {
          position: absolute;
          inset: 0;
          z-index: 3;
          pointer-events: none;
          border-radius: ${typeof borderRadius === "string" ? borderRadius : borderRadius + "px"};
          background: linear-gradient(160deg,
            rgba(255, 255, 255, 0.06) 0%,
            rgba(255, 255, 255, 0.0) 40%,
            rgba(255, 255, 255, 0.0) 60%,
            rgba(255, 255, 255, 0.03) 100%
          );
        }

        /* ============================================================
           CONTENT WRAPPER - z-index eleve pour etre AU-DESSUS de tout
           ============================================================ */
        .lgp-${id}-content {
          position: relative;
          z-index: 10;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
      `}</style>

      {/* Layer 0 : Aurora background - 6 blobs flottants */}
      <div className={`lgp-${id}-aurora-bg`} aria-hidden="true">
        <div className={`lgp-${id}-blob coral-1`} />
        <div className={`lgp-${id}-blob coral-2`} />
        <div className={`lgp-${id}-blob purple-1`} />
        <div className={`lgp-${id}-blob purple-2`} />
        <div className={`lgp-${id}-blob magenta-1`} />
        <div className={`lgp-${id}-blob gold-1`} />
      </div>

      {/* Layer 3 : Glass refraction (gradient interne) */}
      <div className={`lgp-${id}-refraction`} aria-hidden="true" />

      {/* Layer 4 : Top gradient shine */}
      <div className={`lgp-${id}-shine`} aria-hidden="true" />

      {/* Layer 5 : Specular highlights (reflets soleil) */}
      <div className={`lgp-${id}-specular`} aria-hidden="true" />
      <div className={`lgp-${id}-specular-2`} aria-hidden="true" />

      {/* Layer 5 : Bordure animee */}
      <div className={`lgp-${id}-border`} aria-hidden="true" />

      {/* Layer 6 : Top edge light (bord superieur lumineux) */}
      <div className={`lgp-${id}-top-edge`} aria-hidden="true" />

      {/* Layer 7 : Edge lighting Apple-style (halo bordure) */}
      <div className={`lgp-${id}-edge-light`} aria-hidden="true" />

      {/* Layer 10 : Contenu */}
      <div className={`lgp-${id}-content`}>
        {children}
      </div>
    </div>
  );
}
