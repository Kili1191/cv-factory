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
  tintColor = "rgba(20, 18, 30, 0.85)",
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
        boxShadow: `
          0 -8px 32px rgba(0, 0, 0, 0.25),
          0 -2px 8px rgba(0, 0, 0, 0.15)
        `,
      }}
    >
      <style>{`
        /* ============================================================
           AURORA BACKGROUND - 4 blobs en gradients radials
           Pas de mix-blend-mode, pas de DOM elements multiples.
           Tout est en BACKGROUND-IMAGE = ZERO flicker possible.
           ============================================================ */
        @keyframes lgp-${id}-aurora {
          0% {
            background-position:
              15% 20%,
              80% 30%,
              60% 75%,
              25% 80%;
          }
          25% {
            background-position:
              70% 35%,
              30% 60%,
              15% 50%,
              80% 25%;
          }
          50% {
            background-position:
              85% 75%,
              20% 80%,
              75% 25%,
              40% 60%;
          }
          75% {
            background-position:
              30% 65%,
              65% 20%,
              40% 80%,
              70% 50%;
          }
          100% {
            background-position:
              15% 20%,
              80% 30%,
              60% 75%,
              25% 80%;
          }
        }

        .lgp-${id}-aurora {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-color: ${tintColor};
          background-image:
            radial-gradient(circle 400px at 15% 20%, rgba(217, 119, 87, 0.55) 0%, transparent 60%),
            radial-gradient(circle 450px at 80% 30%, rgba(91, 61, 245, 0.55) 0%, transparent 60%),
            radial-gradient(circle 380px at 60% 75%, rgba(185, 28, 140, 0.50) 0%, transparent 60%),
            radial-gradient(circle 420px at 25% 80%, rgba(200, 169, 106, 0.40) 0%, transparent 60%);
          background-size: 100% 100%;
          background-repeat: no-repeat;
          ${animate ? `animation: lgp-${id}-aurora 32s ease-in-out infinite;` : ""}
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
           REFLET HAUT - subtle glass shine, statique (pas d'animation)
           ============================================================ */
        .lgp-${id}-shine {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          z-index: 4;
          pointer-events: none;
          background: linear-gradient(180deg,
            rgba(255, 255, 255, 0.18) 0%,
            rgba(255, 255, 255, 0.05) 60%,
            transparent 100%
          );
          border-radius: ${typeof borderRadius === "string" ? borderRadius : borderRadius + "px"};
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

      {/* Layer 0 : Aurora background */}
      <div className={`lgp-${id}-aurora`} aria-hidden="true" />

      {/* Layer 4 : Reflet du haut */}
      <div className={`lgp-${id}-shine`} aria-hidden="true" />

      {/* Layer 5 : Bordure animee */}
      <div className={`lgp-${id}-border`} aria-hidden="true" />

      {/* Layer 10 : Contenu */}
      <div className={`lgp-${id}-content`}>
        {children}
      </div>
    </div>
  );
}
