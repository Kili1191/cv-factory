"use client";

// LiquidGlassPanel v11 - tokens centralises (verdict panel 2026-05-21)
//
// CHANGEMENT v11 : les valeurs de verre codees en dur sont remplacees par
// les variables centrales --nuvi-glass-* (definies dans page.jsx). Les effets
// riches (aurora 6 blobs, 6 couches de lumiere) sont CONSERVES. Resultat :
// memes couleurs/teinte que les barres/sidebar, mais niveau de verre plus
// substantiel (role "panneau" vs role "controle"). Hierarchie Apple.

import React from "react";

// `tone` doit correspondre au fond sur lequel le logo est pose.
// "dark"  : lettres blanches + halo, pour du verre pose sur le CV.
// "light" : lettres encre, pour un en-tete cream opaque. C'etait la vraie
//           situation dans le Coach, ou le blanc sur cream ne laissait voir
//           que les ombres portees - le mot ressortait comme une tache.
export function NuviLogoAnimated({ size = 26, tone = "dark" }) {
  const light = tone === "light";
  return (
    <div
      style={{
        fontFamily: '"Fraunces", "Playfair Display", Georgia, serif',
        fontWeight: 400,
        fontStyle: "italic",
        fontSize: size,
        letterSpacing: "-0.02em",
        lineHeight: 1,
        color: light ? "#0a0a0a" : "#fff",
        textShadow: light
          ? "none"
          : `
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
        // [v11] Le panneau utilise le verre PANNEAU centralise : plus
        // substantiel que les barres (role "panneau"), meme teinte cream.
        // Le fond cream translucide vient d'ici (avant : header/footer gradients).
        background: "var(--nuvi-glass-panel, rgba(250,248,243,0.62))",
        backdropFilter: "var(--nuvi-glass-panel-blur, blur(40px) saturate(180%))",
        WebkitBackdropFilter: "var(--nuvi-glass-panel-blur, blur(40px) saturate(180%))",
        boxShadow: `
          0 -8px 32px rgba(0, 0, 0, 0.25),
          0 -2px 8px rgba(0, 0, 0, 0.15)
        `,
      }}
    >
      <style>{`
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

        .lgp-${id}-content {
          position: relative;
          z-index: 10;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
      `}</style>

      <div className={`lgp-${id}-aurora-bg`} aria-hidden="true">
        <div className={`lgp-${id}-blob coral-1`} />
        <div className={`lgp-${id}-blob coral-2`} />
        <div className={`lgp-${id}-blob purple-1`} />
        <div className={`lgp-${id}-blob purple-2`} />
        <div className={`lgp-${id}-blob magenta-1`} />
        <div className={`lgp-${id}-blob gold-1`} />
      </div>

      <div className={`lgp-${id}-refraction`} aria-hidden="true" />
      <div className={`lgp-${id}-shine`} aria-hidden="true" />
      <div className={`lgp-${id}-specular`} aria-hidden="true" />
      <div className={`lgp-${id}-specular-2`} aria-hidden="true" />
      <div className={`lgp-${id}-border`} aria-hidden="true" />
      <div className={`lgp-${id}-top-edge`} aria-hidden="true" />
      <div className={`lgp-${id}-edge-light`} aria-hidden="true" />

      <div className={`lgp-${id}-content`}>
        {children}
      </div>
    </div>
  );
}
