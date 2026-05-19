"use client";

// LiquidGlassPanel v1 - iOS 26 Liquid Glass effect
//
// Technique inspiree des refs 2026 :
//   - dev.to/fabiosleal "Apple Liquid Glass with CSS and SVG"
//   - cssscript "Liquid Glass Effect"
//   - github.com/nikdelvin/liquid-glass
//
// Architecture : 4 layers
//   Layer 1 : SVG filter (feTurbulence + feGaussianBlur + feDisplacementMap)
//             -> applique au backdrop-filter, distorsion REELLE du fond
//   Layer 2 : Tint semi-transparent (cream chaud par defaut)
//   Layer 3 : Specular highlight (inset shadow blanc en haut + bord lumineux)
//   Layer 4 : Contenu enfant
//
// Le SVG filter contient une <animate> sur le seed pour faire bouger
// la distorsion subtilement (cycle 12s) -> effet "verre vivant" iOS 26.
//
// Props :
//   children      : contenu du panel
//   height        : hauteur (default "94vh")
//   borderRadius  : default "32px 32px 0 0" (sheet bottom iOS)
//   borderColor   : default Coral (rouille)
//   distortion    : scale du displacement (default 30, plus = plus distordu)
//   tintColor     : couleur du tint cream (default rgba 250 248 243 0.10)
//   className     : extra className pour le wrapper
//   filterId      : ID unique du filter SVG (pour eviter conflicts si plusieurs panels)

import { useRef, useId } from "react";
import { Coral } from "./tokens";

export default function LiquidGlassPanel({
  children,
  height = "94vh",
  maxWidth = 840,
  borderRadius = "32px 32px 0 0",
  borderColor = Coral,
  distortion = 30,
  tintColor = "rgba(250, 248, 243, 0.10)",
  className = "",
  style = {},
  animate = true,
}) {
  // ID unique pour ce filter (evite collisions si plusieurs panels)
  const rawId = useId();
  const filterId = "lg-filter-" + rawId.replace(/:/g, "");
  const wrapperRef = useRef(null);

  return (
    <>
      {/* SVG hidden : contient les filters */}
      <svg
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <defs>
          <filter
            id={filterId}
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            colorInterpolationFilters="sRGB"
          >
            {/* 1. Turbulence : noise fractal qui sert de map de displacement.
                baseFrequency=0.008 -> ripples larges (style iOS).
                numOctaves=2 -> texture riche mais pas trop chaotique. */}
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.008 0.008"
              numOctaves="2"
              seed="5"
              result="noise"
            >
              {animate && (
                <animate
                  attributeName="seed"
                  from="1"
                  to="200"
                  dur="12s"
                  repeatCount="indefinite"
                />
              )}
            </feTurbulence>

            {/* 2. Gaussian blur : adoucit le noise pour distorsion fluide
                au lieu de pixels chaotiques. */}
            <feGaussianBlur in="noise" stdDeviation="2" result="blurredNoise" />

            {/* 3. Displacement map : applique la distorsion au SourceGraphic
                en utilisant le noise floute comme map.
                scale=30 -> distorsion subtile mais visible (iOS authentique). */}
            <feDisplacementMap
              in="SourceGraphic"
              in2="blurredNoise"
              scale={distortion}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Wrapper du panel */}
      <div
        ref={wrapperRef}
        className={"nv-liquid-glass-wrapper " + className}
        style={{
          position: "relative",
          isolation: "isolate",
          height,
          width: "100%",
          maxWidth,
          marginLeft: "auto",
          marginRight: "auto",
          borderRadius,
          border: "1.5px solid " + borderColor,
          borderBottom: "none",
          boxShadow:
            "0 -20px 60px rgba(0,0,0,.18), " +
            "0 0 0 1px rgba(217,119,87,0.15)",
          animation: "cvfSlideUp 280ms cubic-bezier(.32,.72,0,1)",
          overflow: "hidden",
          ...style,
        }}
      >
        {/* Layer 1 : Filter layer (distorsion REELLE du fond via backdrop-filter).
            Le filter ID pointe vers le SVG ci-dessus. */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            backdropFilter: `url(#${filterId})`,
            WebkitBackdropFilter: `url(#${filterId})`,
            pointerEvents: "none",
          }}
        />

        {/* Layer 2 : Tint cream chaud semi-transparent.
            Donne l'ambiance Nuvi sans masquer le fond. */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            background: tintColor,
            pointerEvents: "none",
          }}
        />

        {/* Layer 3 : Specular highlight.
            - Inset shadow blanc 25% en haut (1px) = reflet de lumiere iOS
            - Inset glow Coral 6% sur 80px = profondeur du verre
            - Inset shadow Coral 15% en bas (1px) = bord inferieur subtil
            - Inset shadow blanc 15% lateral (1px) = bords lateraux fins */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            borderRadius: "inherit",
            boxShadow: [
              "inset 0 1px 0 rgba(255, 255, 255, 0.30)",
              "inset 1px 0 0 rgba(255, 255, 255, 0.12)",
              "inset -1px 0 0 rgba(255, 255, 255, 0.12)",
              "inset 0 0 80px rgba(217, 119, 87, 0.05)",
              "inset 0 -1px 0 rgba(217, 119, 87, 0.20)",
            ].join(", "),
            pointerEvents: "none",
          }}
        />

        {/* Layer 4 : Content (le vrai contenu enfant flotte au-dessus). */}
        <div
          style={{
            position: "relative",
            zIndex: 3,
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
