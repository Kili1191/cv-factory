"use client";

// LiquidGlassPanel v7 FINAL - Aurora Smooth + Sharp Edges + Logo Nuvi
//
// Architecture complete :
//   AURORA :
//     8 blobs (2 par couleur) avec opacity-pulse desynchronise -> melange smooth
//     Couleurs : Coral, Purple, Magenta, Gold
//
//   SHARP EDGES (iOS 26 vrais bords nets) :
//     - Top edge net 2px blanc
//     - Corner glow TL + TR
//     - Inner line 1px
//     - Gloss diagonal BRUTAL (transition rapide)
//     - Outer glow halo
//     - Bottom edge subtle
//
//   REFLETS FIXES & MOUVANTS :
//     - Reflet pulsant (highlight qui glisse)
//     - 2 gouttes top
//     - Caustics (refl. eau)
//     - Refraction lines
//     - Specular inset
//
//   BORDURE : couleurs qui transitionnent (pas rotation)
//
//   EXPORT BONUS : composant NuviTextGlass (text-shadow universelle)
//                  composant NuviLogoAnimated (logo hyper cool)

import { useId } from "react";

const COLORS = {
  coral:   "#d97757",
  purple:  "#5b3df5",
  magenta: "#b91c8c",
  gold:    "#c8a96a",
};

// ============================================
// EXPORT : NuviTextGlass - texte universel lisible partout
// (sur fond clair ET sombre)
// ============================================
export function NuviTextGlass({ children, color = "#fff", style = {}, as: Tag = "div", ...rest }) {
  return (
    <Tag
      style={{
        color,
        textShadow:
          "0 1px 2px rgba(0, 0, 0, 0.85), " +
          "0 2px 6px rgba(0, 0, 0, 0.6), " +
          "0 0 12px rgba(0, 0, 0, 0.4)",
        WebkitTextStroke: "0.3px rgba(0, 0, 0, 0.5)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// ============================================
// EXPORT : NuviTextGlassCoral - variante eyebrow Coral
// ============================================
export function NuviTextGlassCoral({ children, style = {}, as: Tag = "div", ...rest }) {
  return (
    <Tag
      style={{
        color: COLORS.coral,
        textShadow:
          "0 1px 2px rgba(0, 0, 0, 0.85), " +
          "0 2px 6px rgba(0, 0, 0, 0.5), " +
          "0 0 12px rgba(74, 27, 12, 0.5)",
        WebkitTextStroke: "0.3px rgba(74, 27, 12, 0.4)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// ============================================
// EXPORT : NuviLogoAnimated v8 - logo "relax & surprise"
// Base continue : gradient flow + glow pulse Coral
// Cycle 50s : 3 surprises desynchronisees qui apparaissent puis se reposent
//   - Liquid morph (8s) : lettres ondulent doucement
//   - Drop ink (5s) : goutte tombe sur le mot puis se diffuse et fade
//   - Mirror reflection (15s) : reflet en bas qui ondule comme dans l'eau
// Entre les surprises : repos -> jamais stressant, toujours relaxant
// ============================================
export function NuviLogoAnimated({ size = 26, style = {} }) {
  const rawId = useId();
  const id = "nl-" + rawId.replace(/:/g, "");

  return (
    <>
      <style>{`
        /* Base : gradient des 4 couleurs qui glisse + glow Coral pulse */
        @keyframes ${id}-gradient-flow {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes ${id}-glow-pulse {
          0%, 100% {
            filter: drop-shadow(0 0 6px rgba(217,119,87,0.25))
                    drop-shadow(0 1px 3px rgba(0,0,0,0.4));
          }
          50% {
            filter: drop-shadow(0 0 14px rgba(217,119,87,0.45))
                    drop-shadow(0 1px 3px rgba(0,0,0,0.4));
          }
        }

        /* Surprise 1 : LIQUID MORPH - cycle 50s
           Plage active : 10% -> 26% (5s -> 13s) = 8s d'ondulation douce
           Repos : 0% -> 10%, 26% -> 100% */
        @keyframes ${id}-morph {
          0%, 10%, 26%, 100% { transform: scaleY(1) scaleX(1) skewX(0); }
          14% { transform: scaleY(1.04) scaleX(0.99) skewX(-1deg); }
          18% { transform: scaleY(0.98) scaleX(1.01) skewX(1deg); }
          22% { transform: scaleY(1.05) scaleX(0.98) skewX(-0.5deg); }
        }

        /* Surprise 2 : DROP INK - cycle 50s
           Plage active : 50% -> 60% (25s -> 30s) = 5s
           La goutte tombe du haut, atterrit, eclate et fade */
        @keyframes ${id}-drop {
          0%, 50%, 62%, 100% { opacity: 0; transform: translateY(-30px) scale(0.5); }
          52% { opacity: 1; transform: translateY(0px) scale(0.8); }
          55% { opacity: 1; transform: translateY(8px) scale(1); }
          58% { opacity: 0.7; transform: translateY(12px) scale(1.5); }
          61% { opacity: 0; transform: translateY(14px) scale(2.3); }
        }

        /* Surprise 3 : MIRROR REFLECTION - cycle 50s
           Plage active : 75% -> 96% (37.5s -> 48s) = 10.5s
           Reflet en bas qui apparait, ondule comme eau, et fade */
        @keyframes ${id}-mirror {
          0%, 75%, 96%, 100% { opacity: 0; transform: scaleY(-1) translateY(0); }
          78% { opacity: 0.35; transform: scaleY(-1) translateY(0); }
          83% { opacity: 0.30; transform: scaleY(-1) translateY(2%) skewX(2deg); }
          88% { opacity: 0.40; transform: scaleY(-1) translateY(0) skewX(0); }
          92% { opacity: 0.25; transform: scaleY(-1) translateY(3%) skewX(-2deg); }
        }

        .${id}-block {
          position: relative;
          display: inline-block;
          padding-bottom: ${Math.round(size * 0.5)}px;
        }

        .${id}-wrap {
          position: relative;
          display: inline-block;
          font-family: Georgia, "Times New Roman", serif;
          font-style: italic;
          font-size: ${size}px;
          font-weight: 400;
          letter-spacing: -0.02em;
          line-height: 1;
          transform-origin: center bottom;
          animation:
            ${id}-glow-pulse 5s ease-in-out infinite,
            ${id}-morph 50s ease-in-out infinite;
        }
        .${id}-text {
          background: linear-gradient(90deg,
            ${COLORS.coral}, ${COLORS.gold}, ${COLORS.magenta}, ${COLORS.purple}, ${COLORS.coral}
          );
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation: ${id}-gradient-flow 8s linear infinite;
          display: inline-block;
        }

        /* Mirror reflection : copie du texte retournee sous le logo */
        .${id}-mirror {
          position: absolute;
          top: 100%;
          left: 0;
          font-family: Georgia, "Times New Roman", serif;
          font-style: italic;
          font-size: ${size}px;
          font-weight: 400;
          letter-spacing: -0.02em;
          line-height: 1;
          color: rgba(217, 119, 87, 0.75);
          filter: blur(2.5px);
          -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%);
          mask-image: linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%);
          animation: ${id}-mirror 50s ease-in-out infinite;
          pointer-events: none;
        }

        /* Drop ink : petite goutte coloree qui tombe sur le logo */
        .${id}-drop {
          position: absolute;
          top: -${Math.round(size * 1.2)}px;
          left: 35%;
          width: ${Math.round(size * 0.5)}px;
          height: ${Math.round(size * 0.5)}px;
          border-radius: 50% 50% 60% 40% / 70% 70% 30% 30%;
          background: radial-gradient(circle at 30% 30%, ${COLORS.coral}, ${COLORS.magenta});
          animation: ${id}-drop 50s ease-in-out infinite;
          pointer-events: none;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
        }
      `}</style>
      <div className={`${id}-block`} style={style}>
        <div className={`${id}-wrap`}>
          <span className={`${id}-text`}>Nuvi</span>
          <div className={`${id}-drop`} aria-hidden="true" />
          <div className={`${id}-mirror`} aria-hidden="true">Nuvi</div>
        </div>
      </div>
    </>
  );
}

// ============================================
// MAIN : LiquidGlassPanel v7
// ============================================
export default function LiquidGlassPanel({
  children,
  height = "94vh",
  maxWidth = 840,
  borderRadius = "32px 32px 0 0",
  intensity = 1,
  animate = true,
  style = {},
  className = "",
}) {
  const rawId = useId();
  const id = "lg-" + rawId.replace(/:/g, "");

  const opMax = (0.18 * intensity).toFixed(2);

  return (
    <>
      <style>{`
        /* ============ BLOBS MOVES ============ */
        @keyframes ${id}-move-a { 0%,100% { transform: translate3d(-15%,-10%,0) scale(1.1); } 50% { transform: translate3d(45%,30%,0) scale(1.3); } }
        @keyframes ${id}-move-b { 0%,100% { transform: translate3d(40%,35%,0) scale(1.2); } 50% { transform: translate3d(-5%,-10%,0) scale(1.0); } }
        @keyframes ${id}-move-c { 0%,100% { transform: translate3d(60%,-10%,0) scale(1.0); } 50% { transform: translate3d(-10%,40%,0) scale(1.3); } }
        @keyframes ${id}-move-d { 0%,100% { transform: translate3d(20%,45%,0) scale(1.15); } 50% { transform: translate3d(55%,-5%,0) scale(1.0); } }
        @keyframes ${id}-move-e { 0%,100% { transform: translate3d(-25%,25%,0) scale(1.2); } 50% { transform: translate3d(40%,-5%,0) scale(0.95); } }
        @keyframes ${id}-move-f { 0%,100% { transform: translate3d(55%,-25%,0) scale(1.1); } 50% { transform: translate3d(-5%,50%,0) scale(1.25); } }
        @keyframes ${id}-move-g { 0%,100% { transform: translate3d(35%,55%,0) scale(1.0); } 50% { transform: translate3d(60%,15%,0) scale(1.3); } }
        @keyframes ${id}-move-h { 0%,100% { transform: translate3d(-5%,-25%,0) scale(1.15); } 50% { transform: translate3d(30%,35%,0) scale(1.05); } }

        /* ============ OPACITY PULSES desync ============ */
        @keyframes ${id}-pulse-1 { 0%,100% { opacity: 0; } 50% { opacity: ${opMax}; } }
        @keyframes ${id}-pulse-2 { 0%,100% { opacity: ${opMax}; } 50% { opacity: 0; } }
        @keyframes ${id}-pulse-3 { 0%,100% { opacity: 0; } 30%,70% { opacity: ${opMax}; } }
        @keyframes ${id}-pulse-4 { 0%,100% { opacity: ${(opMax * 0.7).toFixed(3)}; } 50% { opacity: 0; } }

        /* ============ BORDER COLOR TRANSITIONS ============ */
        @property --c1-${id} { syntax: '<color>'; initial-value: ${COLORS.coral};   inherits: false; }
        @property --c2-${id} { syntax: '<color>'; initial-value: ${COLORS.gold};    inherits: false; }
        @property --c3-${id} { syntax: '<color>'; initial-value: ${COLORS.magenta}; inherits: false; }
        @property --c4-${id} { syntax: '<color>'; initial-value: ${COLORS.purple};  inherits: false; }
        @property --bg-from-${id} { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
        @keyframes ${id}-border-colors {
          0%   { --c1-${id}: ${COLORS.coral};   --c2-${id}: ${COLORS.gold};    --c3-${id}: ${COLORS.magenta}; --c4-${id}: ${COLORS.purple}; }
          25%  { --c1-${id}: ${COLORS.gold};    --c2-${id}: ${COLORS.magenta}; --c3-${id}: ${COLORS.purple};  --c4-${id}: ${COLORS.coral}; }
          50%  { --c1-${id}: ${COLORS.magenta}; --c2-${id}: ${COLORS.purple};  --c3-${id}: ${COLORS.coral};   --c4-${id}: ${COLORS.gold}; }
          75%  { --c1-${id}: ${COLORS.purple};  --c2-${id}: ${COLORS.coral};   --c3-${id}: ${COLORS.gold};    --c4-${id}: ${COLORS.magenta}; }
          100% { --c1-${id}: ${COLORS.coral};   --c2-${id}: ${COLORS.gold};    --c3-${id}: ${COLORS.magenta}; --c4-${id}: ${COLORS.purple}; }
        }
        /* Bordure scintillement aleatoire : 3 animations independantes
           avec durees premieres entre elles (37s, 53s, 71s) ->
           jamais le meme etat 2 fois. */
        @keyframes ${id}-border-angle {
          0%   { --bg-from-${id}: 0deg; }
          33%  { --bg-from-${id}: 137deg; }
          66%  { --bg-from-${id}: 251deg; }
          100% { --bg-from-${id}: 360deg; }
        }
        @keyframes ${id}-border-opacity {
          0%, 100% { opacity: 0.5; }
          17%      { opacity: 0.85; }
          43%      { opacity: 0.4; }
          71%      { opacity: 0.95; }
          88%      { opacity: 0.6; }
        }
        @keyframes ${id}-border-glow {
          0%, 100% { filter: drop-shadow(0 0 4px rgba(217,119,87,0.4)); }
          22%      { filter: drop-shadow(0 0 14px rgba(217,119,87,0.7)); }
          47%      { filter: drop-shadow(0 0 8px rgba(185,28,140,0.6)); }
          73%      { filter: drop-shadow(0 0 18px rgba(91,61,245,0.7)); }
          91%      { filter: drop-shadow(0 0 10px rgba(200,169,106,0.5)); }
        }

        /* ============ REFLET PULSANT ============ */
        @keyframes ${id}-reflect-pulse {
          0%   { transform: translateX(-30%) translateY(-10%) rotate(-15deg); opacity: 0; }
          30%  { opacity: 0.18; }
          70%  { opacity: 0.10; }
          100% { transform: translateX(130%) translateY(20%) rotate(-15deg); opacity: 0; }
        }

        /* ============ BLOBS STYLES ============ */
        .${id}-blob {
          position: absolute;
          top: 0; left: 0;
          width: 85%;
          height: 85%;
          border-radius: 50%;
          mix-blend-mode: screen;
          filter: blur(75px);
          pointer-events: none;
          will-change: transform, opacity;
        }
        .${id}-coral-1 { background: radial-gradient(circle, ${COLORS.coral} 0%, transparent 65%); ${animate ? `animation: ${id}-move-a 70s ease-in-out infinite, ${id}-pulse-1 55s ease-in-out infinite;` : `opacity: ${opMax};`} }
        .${id}-coral-2 { background: radial-gradient(circle, ${COLORS.coral} 0%, transparent 65%); ${animate ? `animation: ${id}-move-e 90s ease-in-out infinite, ${id}-pulse-2 68s ease-in-out infinite -20s;` : `opacity: ${opMax};`} }
        .${id}-purple-1 { background: radial-gradient(circle, ${COLORS.purple} 0%, transparent 65%); ${animate ? `animation: ${id}-move-b 85s ease-in-out infinite, ${id}-pulse-3 62s ease-in-out infinite -10s;` : `opacity: ${opMax};`} }
        .${id}-purple-2 { background: radial-gradient(circle, ${COLORS.purple} 0%, transparent 65%); ${animate ? `animation: ${id}-move-f 100s ease-in-out infinite, ${id}-pulse-4 50s ease-in-out infinite -30s;` : `opacity: ${opMax};`} }
        .${id}-magenta-1 { background: radial-gradient(circle, ${COLORS.magenta} 0%, transparent 65%); ${animate ? `animation: ${id}-move-c 95s ease-in-out infinite, ${id}-pulse-2 58s ease-in-out infinite -15s;` : `opacity: ${opMax};`} }
        .${id}-magenta-2 { background: radial-gradient(circle, ${COLORS.magenta} 0%, transparent 65%); ${animate ? `animation: ${id}-move-g 110s ease-in-out infinite, ${id}-pulse-1 75s ease-in-out infinite -35s;` : `opacity: ${opMax};`} }
        .${id}-gold-1 { background: radial-gradient(circle, ${COLORS.gold} 0%, transparent 65%); ${animate ? `animation: ${id}-move-d 80s ease-in-out infinite, ${id}-pulse-3 65s ease-in-out infinite -25s;` : `opacity: ${opMax};`} }
        .${id}-gold-2 { background: radial-gradient(circle, ${COLORS.gold} 0%, transparent 65%); ${animate ? `animation: ${id}-move-h 105s ease-in-out infinite, ${id}-pulse-4 72s ease-in-out infinite -45s;` : `opacity: ${opMax};`} }

        /* ============ REFLET PULSANT MOUVANT ============ */
        .${id}-reflect-pulse {
          position: absolute;
          top: 0; left: 0;
          width: 40%; height: 200%;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%);
          filter: blur(40px);
          pointer-events: none;
          mix-blend-mode: screen;
          ${animate ? `animation: ${id}-reflect-pulse 28s ease-in-out infinite;` : ""}
        }

        /* ============ SHARP EDGES iOS 26 ============ */
        .${id}-edge-top {
          position: absolute;
          top: 0; left: 5%; right: 5%;
          height: 2px;
          background: linear-gradient(90deg,
            transparent 0%,
            rgba(255,255,255,0.85) 20%,
            rgba(255,255,255,0.95) 50%,
            rgba(255,255,255,0.85) 80%,
            transparent 100%
          );
          z-index: 9;
          pointer-events: none;
          border-radius: 2px;
        }
        .${id}-corner-tl {
          position: absolute;
          top: 0; left: 0;
          width: 80px; height: 80px;
          background: radial-gradient(circle at 0 0, rgba(255,255,255,0.35) 0%, transparent 50%);
          pointer-events: none;
          z-index: 9;
          border-radius: 32px 0 0 0;
        }
        .${id}-corner-tr {
          position: absolute;
          top: 0; right: 0;
          width: 80px; height: 80px;
          background: radial-gradient(circle at 100% 0, rgba(255,255,255,0.30) 0%, transparent 50%);
          pointer-events: none;
          z-index: 9;
          border-radius: 0 32px 0 0;
        }
        .${id}-inner-line {
          position: absolute;
          top: 3px; left: 16px; right: 16px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45) 30%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0.45) 70%, transparent);
          z-index: 9;
          pointer-events: none;
        }
        .${id}-gloss {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          background: linear-gradient(115deg,
            transparent 0%,
            transparent 25%,
            rgba(255,255,255,0.22) 28%,
            rgba(255,255,255,0.30) 30%,
            rgba(255,255,255,0.22) 32%,
            transparent 35%,
            transparent 100%
          );
          z-index: 3;
        }
        .${id}-edge-bottom {
          position: absolute;
          bottom: 0; left: 8%; right: 8%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
          z-index: 9;
          pointer-events: none;
        }

        /* ============ DROPS, CAUSTICS, REFRACTION ============ */
        .${id}-drops {
          position: absolute; inset: 0;
          border-radius: inherit;
          pointer-events: none;
          background:
            radial-gradient(ellipse 60px 15px at 22% 5%, rgba(255,255,255,0.25) 0%, transparent 70%),
            radial-gradient(ellipse 40px 12px at 78% 8%, rgba(255,255,255,0.20) 0%, transparent 70%);
          z-index: 4;
        }
        .${id}-caustics {
          position: absolute; inset: 0;
          border-radius: inherit;
          pointer-events: none;
          opacity: 0.5;
          background:
            radial-gradient(circle 80px at 35% 35%, rgba(255,255,255,0.04) 0%, transparent 100%),
            radial-gradient(circle 100px at 50% 80%, rgba(255,255,255,0.03) 0%, transparent 100%);
          z-index: 5;
        }
        .${id}-refraction {
          position: absolute; inset: 0;
          border-radius: inherit;
          pointer-events: none;
          opacity: 0.8;
          background:
            linear-gradient(105deg, transparent 49.7%, rgba(255,255,255,0.12) 50%, transparent 50.3%),
            linear-gradient(95deg, transparent 74.6%, rgba(255,255,255,0.08) 75%, transparent 75.4%);
          z-index: 6;
        }

        /* ============ BORDER GLOWY + SPECULAR ============ */
        /* Bordure visible + EPAISSEUR (2.5px) + drop-shadow rayonnante
           + 3 animations independantes desynchronisees (37s/53s/71s)
           pour rotation angle, opacite, et glow color */
        .${id}-border {
          position: absolute; inset: 0;
          border-radius: inherit;
          pointer-events: none;
          padding: 2.5px;
          background: conic-gradient(from var(--bg-from-${id}, 0deg),
            var(--c1-${id}, ${COLORS.coral}),
            var(--c2-${id}, ${COLORS.gold}),
            var(--c3-${id}, ${COLORS.magenta}),
            var(--c4-${id}, ${COLORS.purple}),
            var(--c1-${id}, ${COLORS.coral})
          );
          ${animate ? `animation:
            ${id}-border-colors 50s ease-in-out infinite,
            ${id}-border-angle 71s ease-in-out infinite,
            ${id}-border-opacity 53s ease-in-out infinite,
            ${id}-border-glow 37s ease-in-out infinite;` : "opacity: 0.55;"}
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          z-index: 8;
        }
        /* Halo rayonnant exterieur (visible AUSSI hors du panel)
           - Couche separee pour pouvoir deborder + blur */
        .${id}-border-halo {
          position: absolute;
          inset: -8px;
          border-radius: 40px 40px 8px 8px;
          pointer-events: none;
          padding: 12px;
          background: conic-gradient(from var(--bg-from-${id}, 0deg),
            var(--c1-${id}, ${COLORS.coral}),
            var(--c2-${id}, ${COLORS.gold}),
            var(--c3-${id}, ${COLORS.magenta}),
            var(--c4-${id}, ${COLORS.purple}),
            var(--c1-${id}, ${COLORS.coral})
          );
          ${animate ? `animation:
            ${id}-border-colors 50s ease-in-out infinite,
            ${id}-border-angle 71s ease-in-out infinite,
            ${id}-border-opacity 53s ease-in-out infinite;` : "opacity: 0.55;"}
          filter: blur(8px);
          opacity: 0.4;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          z-index: 0;
        }
        .${id}-specular {
          position: absolute; inset: 0;
          border-radius: inherit;
          pointer-events: none;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.30),
            inset 1px 0 0 rgba(255,255,255,0.10),
            inset -1px 0 0 rgba(255,255,255,0.10);
          z-index: 9;
        }

        /* ============ OUTER GLOW (halo exterieur subtil) ============ */
        .${id}-outer-glow {
          position: absolute;
          inset: -5px;
          border-radius: 37px 37px 5px 5px;
          background: linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 30%);
          filter: blur(3px);
          pointer-events: none;
          z-index: -1;
        }
      `}</style>

      {/* Outer container - pas d'isolation pour blobs */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth,
          marginLeft: "auto",
          marginRight: "auto",
          height,
          ...style,
        }}
        className={className}
      >
        {/* Outer glow halo */}
        <div className={`${id}-outer-glow`} aria-hidden="true" />

        {/* Border halo rayonnant - dehors du panel isolated pour pouvoir
            deborder de -8px sur tous les cotes (vraie glow exterieure) */}
        <div className={`${id}-border-halo`} aria-hidden="true" />

        {/* 8 blobs auroraux qui debordent */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "-40%",
            left: "-40%",
            right: "-40%",
            bottom: "-40%",
            pointerEvents: "none",
            zIndex: 0,
            overflow: "hidden",
          }}
        >
          <div className={`${id}-blob ${id}-coral-1`} />
          <div className={`${id}-blob ${id}-coral-2`} />
          <div className={`${id}-blob ${id}-purple-1`} />
          <div className={`${id}-blob ${id}-purple-2`} />
          <div className={`${id}-blob ${id}-magenta-1`} />
          <div className={`${id}-blob ${id}-magenta-2`} />
          <div className={`${id}-blob ${id}-gold-1`} />
          <div className={`${id}-blob ${id}-gold-2`} />
        </div>

        {/* Inner panel - isolated pour les reflets */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            isolation: "isolate",
            height: "100%",
            width: "100%",
            borderRadius,
            overflow: "hidden",
            boxShadow:
              "0 -20px 60px rgba(0,0,0,.18), " +
              "0 0 0 1px rgba(255,255,255,0.08)",
            animation: "cvfSlideUp 280ms cubic-bezier(.32,.72,0,1)",
          }}
        >
          {/* Mouvants */}
          <div className={`${id}-reflect-pulse`} aria-hidden="true" />

          {/* Sharp edges + reflets fixes */}
          <div className={`${id}-gloss`} aria-hidden="true" />
          <div className={`${id}-drops`} aria-hidden="true" />
          <div className={`${id}-caustics`} aria-hidden="true" />
          <div className={`${id}-refraction`} aria-hidden="true" />
          <div className={`${id}-edge-top`} aria-hidden="true" />
          <div className={`${id}-corner-tl`} aria-hidden="true" />
          <div className={`${id}-corner-tr`} aria-hidden="true" />
          <div className={`${id}-inner-line`} aria-hidden="true" />
          <div className={`${id}-edge-bottom`} aria-hidden="true" />
          <div className={`${id}-border`} aria-hidden="true" />
          <div className={`${id}-specular`} aria-hidden="true" />

          {/* Contenu */}
          <div style={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            width: "100%",
          }}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
