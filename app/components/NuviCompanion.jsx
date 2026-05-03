"use client";

import React from 'react';

/**
 * NuviCompanion — The Nuvi mascot eye, with 4 contextual modes
 *
 * Self-contained React component with all CSS animations inlined.
 * Drop into your app and import: <NuviCompanion size={56} mode="idle" />
 *
 * MODES :
 *   "idle"      - Default cycle of 8 playful gags (30s loop)
 *   "appearing" - Flies in from the Coach button origin
 *   "speaking"  - Subtle expressive animations while talking
 *                 (varied eyebrow movements, blink with synced pupil close)
 *   "loading"   - Gentle 3D Y-axis spin (2.5s/turn) showing front then back
 *                 of the eye, with pupil doing human-like search saccades
 *
 * IDLE MODE — 8 personalities in 30s :
 *   0-2s    : Idle — 1 blink, breathe
 *   2-7s    : Surprise — sursaute, iris zooms ×1.5, pupil grows ×1.4 and
 *             does HUMAN search with saccades + fixations on 5 points
 *   7-10s   : Heart eyes — iris hides, pink heart pulses 3×
 *   10-13s  : Raspberry — body tilts back, big pink tongue out
 *   13-15s  : Super bounce — 2 high cartoon jumps with squash & stretch
 *   15-19s  : Disassemble — parts fly in 4 directions then reassemble
 *   19-23s  : Dizzy spin — 1440° rotation with wobble
 *   23-27s  : Faint — entire companion tilts 90°, X eyes appear
 *   27-30s  : Pop up — jaillit back up
 *
 * @param {string}  mode            - "idle" | "appearing" | "speaking" | "loading"
 * @param {number}  size            - Size in pixels (default 56)
 * @param {object}  coachOrigin     - {x, y} delta from companion center (for "appearing" mode).
 *                                    Default {x: 85, y: 85} = bottom-right Coach button.
 * @param {string}  bodyFill        - Body fill (default uses sphere gradient #FAF1ED)
 * @param {string}  bodyStroke      - Body outline (default #c25b3f terracotta)
 * @param {string}  irisColor       - Iris ring (default #6d3fc4 iris)
 * @param {string}  pupilColor      - Pupil (default #1a1a1a ink)
 * @param {string}  highlightColor  - Highlights (default #fbf6ee paper)
 * @param {string}  heartColor      - Heart fill (default #e0789c rose)
 * @param {string}  tongueColor     - Tongue fill (default #e0789c rose)
 * @param {boolean} animated        - Enable animations (default true)
 * @param {number}  cycleDuration   - Idle cycle duration in seconds (default 30)
 *                                    For Coach button integration use 60-90s
 */
export default function NuviCompanion({
  mode = 'idle',
  size = 56,
  coachOrigin = { x: 85, y: 85 },
  bodyFill = '#FAF1ED',
  bodyStroke = '#c25b3f',
  irisColor = '#6d3fc4',
  pupilColor = '#1a1a1a',
  highlightColor = '#fbf6ee',
  heartColor = '#e0789c',
  tongueColor = '#e0789c',
  animated = true,
  cycleDuration = 30,
}) {
  const animDuration = animated ? `${cycleDuration}s` : '0s';
  const uniqueId = React.useId();
  const gradientIds = {
    body: `nuvi-body-sphere-${uniqueId}`,
    bodyBack: `nuvi-body-back-${uniqueId}`,
    iris: `nuvi-iris-sphere-${uniqueId}`,
  };

  // Loading mode uses a different SVG structure (3D spin with front/back faces)
  const isLoading = mode === 'loading';

  return (
    <>
      <style>
        {nuviCompanionStyles({
          animDuration,
          coachOrigin,
          mode,
        })}
      </style>

      {/* SVG defs — gradients for spherical 3D body */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <radialGradient id={gradientIds.body} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#FFFCF7" />
            <stop offset="55%" stopColor={bodyFill} />
            <stop offset="100%" stopColor="#E5C9B8" />
          </radialGradient>
          <radialGradient id={gradientIds.bodyBack} cx="65%" cy="35%" r="80%">
            <stop offset="0%" stopColor="#F8E8DC" />
            <stop offset="60%" stopColor="#EFD9CB" />
            <stop offset="100%" stopColor="#D4B3A1" />
          </radialGradient>
          <radialGradient id={gradientIds.iris} cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#9d7fe0" />
            <stop offset="60%" stopColor={irisColor} />
            <stop offset="100%" stopColor="#5631a3" />
          </radialGradient>
        </defs>
      </svg>

      <div
        className={`nuvi-companion nuvi-mode-${mode}`}
        style={{ width: size, height: size }}
        aria-label="Nuvi"
        role="img"
      >
        {isLoading ? (
          // === LOADING MODE: 3D spin with front and back faces ===
          <>
            <div className="nuvi-eye-3d">
              <div className="nuvi-eye-front">
                <CompanionFront gradients={gradientIds} bodyStroke={bodyStroke} irisColor={irisColor} pupilColor={pupilColor} highlightColor={highlightColor} heartColor={heartColor} tongueColor={tongueColor} />
              </div>
              <div className="nuvi-eye-back">
                <CompanionBack gradient={gradientIds.bodyBack} bodyStroke={bodyStroke} />
              </div>
            </div>
            <div className="nuvi-toupie-shadow" />
          </>
        ) : (
          // === ALL OTHER MODES: standard front-facing eye ===
          <CompanionFront
            gradients={gradientIds}
            bodyStroke={bodyStroke}
            irisColor={irisColor}
            pupilColor={pupilColor}
            highlightColor={highlightColor}
            heartColor={heartColor}
            tongueColor={tongueColor}
          />
        )}
      </div>
    </>
  );
}

// === Front face: full eye with all elements ===
function CompanionFront({ gradients, bodyStroke, irisColor, pupilColor, highlightColor, heartColor, tongueColor }) {
  return (
    <svg viewBox="-50 -50 280 280" xmlns="http://www.w3.org/2000/svg">
      <path
        className="nuvi-c-body"
        d="M 90 28 C 128 30, 160 56, 162 92 C 163 128, 132 158, 88 156 C 44 154, 16 126, 18 88 C 20 54, 52 28, 90 28 Z"
        fill={`url(#${gradients.body})`}
        stroke={bodyStroke}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        className="nuvi-c-eyebrow"
        d="M 52 50 Q 90 36, 130 52"
        fill="none"
        stroke={irisColor}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        className="nuvi-c-tongue"
        d="M 72 120 Q 90 152, 108 120 Q 110 142, 100 152 Q 90 162, 80 152 Q 70 142, 72 120 Z"
        fill={tongueColor}
        stroke={bodyStroke}
        strokeWidth="1.5"
      />
      <path
        className="nuvi-c-heart"
        d="M 90 78 C 78 64, 60 70, 60 86 C 60 100, 78 116, 90 124 C 102 116, 120 100, 120 86 C 120 70, 102 64, 90 78 Z"
        fill={heartColor}
      />
      <g className="nuvi-c-star-eye">
        <line x1="75" y1="76" x2="105" y2="106" stroke={pupilColor} strokeWidth="4" strokeLinecap="round" />
        <line x1="105" y1="76" x2="75" y2="106" stroke={pupilColor} strokeWidth="4" strokeLinecap="round" />
      </g>
      <g className="nuvi-c-eye-inner">
        <path
          className="nuvi-c-iris"
          d="M 90 60 C 108 60, 122 75, 122 92 C 122 108, 109 122, 90 122 C 73 122, 58 109, 58 91 C 58 75, 73 60, 90 60 Z"
          fill={`url(#${gradients.iris})`}
        />
        <circle className="nuvi-c-pupil" cx="92" cy="89" r="7" fill={pupilColor} />
        <ellipse className="nuvi-c-highlight-1" cx="98" cy="79" rx="6" ry="5" fill={highlightColor} />
        <circle className="nuvi-c-highlight-2" cx="83" cy="98" r="2.5" fill={highlightColor} opacity="0.6" />
      </g>
    </svg>
  );
}

// === Back face: just the body, no iris (visible during 3D rotation) ===
function CompanionBack({ gradient, bodyStroke }) {
  return (
    <svg viewBox="-50 -50 280 280" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M 90 28 C 128 30, 160 56, 162 92 C 163 128, 132 158, 88 156 C 44 154, 16 126, 18 88 C 20 54, 52 28, 90 28 Z"
        fill={`url(#${gradient})`}
        stroke={bodyStroke}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M 60 90 Q 90 95, 120 90"
        fill="none"
        stroke="#a44a32"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.25"
      />
    </svg>
  );
}

const nuviCompanionStyles = ({ animDuration, coachOrigin, mode }) => `
  .nuvi-companion {
    display: inline-block;
    position: relative;
    user-select: none;
    transform-style: preserve-3d;
  }
  .nuvi-companion svg {
    width: 100%;
    height: 100%;
    overflow: visible;
    display: block;
    shape-rendering: geometricPrecision;
  }

  .nuvi-c-body, .nuvi-c-iris, .nuvi-c-pupil, .nuvi-c-highlight-1, .nuvi-c-highlight-2,
  .nuvi-c-eyebrow, .nuvi-c-eye-inner, .nuvi-c-heart, .nuvi-c-tongue {
    transform-origin: center;
    transform-box: fill-box;
  }
  .nuvi-c-eyebrow { transform-origin: center bottom; }
  .nuvi-c-tongue  { transform-origin: center top; }
  .nuvi-c-star-eye { transform-origin: 90px 91px; }

  /* =================================================================
     IDLE MODE — full 8-gag cycle (default)
     ================================================================= */
  .nuvi-mode-idle {
    transform-origin: center center;
    animation: nuvi-c-companion-tilt ${animDuration} ease-in-out infinite;
  }
  .nuvi-mode-idle .nuvi-c-body        { animation: nuvi-c-body-life ${animDuration} cubic-bezier(0.4, 0, 0.2, 1) infinite; }
  .nuvi-mode-idle .nuvi-c-eye-inner   { animation: nuvi-c-eye-look ${animDuration} ease-in-out infinite; }
  .nuvi-mode-idle .nuvi-c-iris        { animation: nuvi-c-iris-life ${animDuration} ease-in-out infinite; }
  .nuvi-mode-idle .nuvi-c-pupil       { animation: nuvi-c-pupil-life ${animDuration} ease-in-out infinite; }
  .nuvi-mode-idle .nuvi-c-highlight-1 { animation: nuvi-c-hl1-life ${animDuration} ease-in-out infinite; }
  .nuvi-mode-idle .nuvi-c-highlight-2 { animation: nuvi-c-hl2-life ${animDuration} ease-in-out infinite; }
  .nuvi-mode-idle .nuvi-c-eyebrow     { animation: nuvi-c-eyebrow-life ${animDuration} ease-in-out infinite; }
  .nuvi-mode-idle .nuvi-c-heart       { animation: nuvi-c-heart-life ${animDuration} ease-in-out infinite; opacity: 0; }
  .nuvi-mode-idle .nuvi-c-tongue      { animation: nuvi-c-tongue-life ${animDuration} ease-out infinite; opacity: 0; }
  .nuvi-mode-idle .nuvi-c-star-eye    { animation: nuvi-c-star-life ${animDuration} linear infinite; opacity: 0; }

  /* Hide elements that should not appear in non-idle modes */
  .nuvi-mode-appearing .nuvi-c-heart,
  .nuvi-mode-appearing .nuvi-c-tongue,
  .nuvi-mode-appearing .nuvi-c-star-eye,
  .nuvi-mode-speaking .nuvi-c-heart,
  .nuvi-mode-speaking .nuvi-c-tongue,
  .nuvi-mode-speaking .nuvi-c-star-eye,
  .nuvi-mode-loading .nuvi-c-heart,
  .nuvi-mode-loading .nuvi-c-tongue,
  .nuvi-mode-loading .nuvi-c-star-eye {
    opacity: 0;
  }

  /* =================================================================
     APPEARING MODE — fly in from Coach button origin
     ================================================================= */
  .nuvi-mode-appearing {
    animation: nuvi-c-fly-from-coach 4.5s cubic-bezier(0.22, 1, 0.36, 1) infinite;
  }
  .nuvi-mode-appearing .nuvi-c-body {
    animation: nuvi-c-gentle-breathe 4s ease-in-out infinite;
  }
  @keyframes nuvi-c-fly-from-coach {
    0%        { transform: translate(${coachOrigin.x}px, ${coachOrigin.y}px) scale(0.1); }
    78%, 92%  { transform: translate(0, 0) scale(1); }
    100%      { transform: translate(${coachOrigin.x}px, ${coachOrigin.y}px) scale(0.1); }
  }
  @keyframes nuvi-c-gentle-breathe {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.03); }
  }

  /* =================================================================
     SPEAKING MODE — expressive eyebrow + synced blink
     ================================================================= */
  .nuvi-mode-speaking .nuvi-c-body        { animation: nuvi-c-speak-bob 1.6s ease-in-out infinite; }
  .nuvi-mode-speaking .nuvi-c-eyebrow     { animation: nuvi-c-speak-eyebrow 2.4s ease-in-out infinite; }
  .nuvi-mode-speaking .nuvi-c-iris        { animation: nuvi-c-speak-blink 5s ease-in-out infinite; }
  .nuvi-mode-speaking .nuvi-c-pupil       { animation: nuvi-c-speak-pupil-blink 5s ease-in-out infinite; }
  .nuvi-mode-speaking .nuvi-c-highlight-1 { animation: nuvi-c-speak-pupil-blink 5s ease-in-out infinite; }
  .nuvi-mode-speaking .nuvi-c-highlight-2 { animation: nuvi-c-speak-hl2-blink 5s ease-in-out infinite; }
  .nuvi-mode-speaking .nuvi-c-eye-inner   { animation: nuvi-c-speak-look 3.5s ease-in-out infinite; }

  @keyframes nuvi-c-speak-bob {
    0%, 100% { transform: scale(1) rotate(0deg); }
    25%      { transform: scale(1.02) rotate(-1deg); }
    50%      { transform: scale(1) rotate(0deg); }
    75%      { transform: scale(1.02) rotate(1deg); }
  }

  @keyframes nuvi-c-speak-eyebrow {
    0%   { transform: translateY(0) rotate(0deg) scaleX(1); }
    8%   { transform: translateY(-2px) rotate(-1deg) scaleX(1); }
    14%  { transform: translateY(-4px) rotate(-3deg) scaleX(1); }
    20%  { transform: translateY(-1px) rotate(-1deg) scaleX(1); }
    27%  { transform: translateY(-3px) rotate(2deg) scaleX(1); }
    34%  { transform: translateY(0) rotate(0deg) scaleX(1); }
    40%  { transform: translateY(1px) rotate(0deg) scaleX(0.95); }
    46%  { transform: translateY(-2px) rotate(-2deg) scaleX(1); }
    53%  { transform: translateY(-5px) rotate(3deg) scaleX(1); }
    60%  { transform: translateY(-2px) rotate(0deg) scaleX(1); }
    67%  { transform: translateY(0) rotate(-1deg) scaleX(1); }
    74%  { transform: translateY(-3px) rotate(-2deg) scaleX(1); }
    81%  { transform: translateY(-1px) rotate(1deg) scaleX(1); }
    88%  { transform: translateY(-2px) rotate(-1deg) scaleX(1); }
    94%  { transform: translateY(0) rotate(0deg) scaleX(1); }
    100% { transform: translateY(0) rotate(0deg) scaleX(1); }
  }

  @keyframes nuvi-c-speak-blink {
    0%, 30%, 100% { transform: scaleY(1); }
    32%, 33%      { transform: scaleY(0.08); }
    34%           { transform: scaleY(1); }
    65%, 67%      { transform: scaleY(0.08); }
    68%           { transform: scaleY(1); }
  }

  @keyframes nuvi-c-speak-pupil-blink {
    0%, 30%, 100% { transform: scaleY(1); opacity: 1; }
    32%, 33%      { transform: scaleY(0); opacity: 0; }
    34%           { transform: scaleY(1); opacity: 1; }
    65%, 67%      { transform: scaleY(0); opacity: 0; }
    68%           { transform: scaleY(1); opacity: 1; }
  }

  @keyframes nuvi-c-speak-hl2-blink {
    0%, 30%, 100% { transform: scaleY(1); opacity: 0.6; }
    32%, 33%      { transform: scaleY(0); opacity: 0; }
    34%           { transform: scaleY(1); opacity: 0.6; }
    65%, 67%      { transform: scaleY(0); opacity: 0; }
    68%           { transform: scaleY(1); opacity: 0.6; }
  }

  @keyframes nuvi-c-speak-look {
    0%, 100% { transform: translate(0, 0); }
    25%      { transform: translate(2px, 1px); }
    50%      { transform: translate(-1px, -1px); }
    75%      { transform: translate(2px, 0); }
  }

  /* =================================================================
     LOADING MODE — gentle 3D spin (2.5s/turn) + searching pupil
     ================================================================= */
  .nuvi-mode-loading {
    transform-style: preserve-3d;
  }
  .nuvi-mode-loading .nuvi-eye-3d {
    width: 100%;
    height: 100%;
    position: relative;
    transform-style: preserve-3d;
    animation: nuvi-c-toupie-spin-3d 30s linear infinite;
  }
  .nuvi-eye-front, .nuvi-eye-back {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
  }
  .nuvi-eye-back {
    transform: rotateY(180deg);
  }
  .nuvi-toupie-shadow {
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 80%;
    height: 12px;
    background: radial-gradient(ellipse, rgba(0,0,0,0.22), transparent 70%);
    animation: nuvi-c-shadow-life 30s ease-in-out infinite;
    z-index: -1;
  }
  @keyframes nuvi-c-shadow-life {
    0%, 23%   { transform: translateX(-50%) scale(1); opacity: 0.6; }
    24%, 40%  { transform: translateX(-50%) scale(0.85); opacity: 0.4; }
    41%, 60%  { transform: translateX(-50%) scale(1); opacity: 0.6; }
    61%, 70%  { transform: translateX(-50%) scale(0.85); opacity: 0.4; }
    71%, 86%  { transform: translateX(-50%) scale(1); opacity: 0.6; }
    87%, 100% { transform: translateX(-50%) scale(0.95); opacity: 0.5; }
  }

  /*
    SPIN Y synchronisé sur 30s — alterne spin actif et arrêts face avant.
    Toutes les rotations finales sont multiples de 360° pour rester face avant.
    - 0-23%   : 3 tours rapides (1080°)
    - 23-40%  : ARRÊT face avant → pupille cherche, visible
    - 40-60%  : 2 tours (1800°)
    - 60-70%  : ARRÊT face avant → blinks visibles
    - 70-86%  : 2 tours (2520°)
    - 86-100% : ARRÊT face avant → concentration visible
  */
  @keyframes nuvi-c-toupie-spin-3d {
    0%   { transform: rotateY(0deg); }
    23%  { transform: rotateY(1080deg); }
    40%  { transform: rotateY(1080deg); }
    60%  { transform: rotateY(1800deg); }
    70%  { transform: rotateY(1800deg); }
    86%  { transform: rotateY(2520deg); }
    100% { transform: rotateY(2520deg); }
  }

  .nuvi-mode-loading .nuvi-c-iris    { animation: nuvi-c-load-iris 30s ease-in-out infinite; }
  .nuvi-mode-loading .nuvi-c-pupil   { animation: nuvi-c-load-pupil 30s ease-in-out infinite; }
  .nuvi-mode-loading .nuvi-c-highlight-1,
  .nuvi-mode-loading .nuvi-c-highlight-2 { animation: nuvi-c-load-highlights 30s ease-in-out infinite; }
  .nuvi-mode-loading .nuvi-c-eyebrow { animation: nuvi-c-load-eyebrow 30s ease-in-out infinite; }
  .nuvi-mode-loading .nuvi-c-eye-inner { animation: nuvi-c-load-eye 30s ease-in-out infinite; }

  @keyframes nuvi-c-load-iris {
    /* Phase 1 toupie : zoom 1.4 stable */
    0%, 23%   { transform: scale(1.4); opacity: 1; }
    /* Phase curieux : zoom 1.5 reste centré */
    25%       { transform: scale(1.5); opacity: 1; animation-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55); }
    38%       { transform: scale(1.5); opacity: 1; }
    40%       { transform: scale(1.4); opacity: 1; }
    /* Phase 2 toupie */
    41%, 60%  { transform: scale(1.4); opacity: 1; }
    /* Phase blink : 3 blinks lents */
    62%       { transform: scaleY(1) scale(1.4); }
    63%       { transform: scaleY(0.08) scale(1.4); }
    64%       { transform: scaleY(1) scale(1.4); }
    66%       { transform: scaleY(1) scale(1.4); }
    67%       { transform: scaleY(0.08) scale(1.4); }
    68%       { transform: scaleY(1) scale(1.4); }
    69%       { transform: scaleY(0.08) scale(1.4); }
    70%       { transform: scaleY(1) scale(1.4); }
    /* Phase 3 toupie */
    71%, 86%  { transform: scale(1.4); opacity: 1; }
    /* Phase concentré : iris pulse */
    88%       { transform: scale(1.5); opacity: 1; }
    91%       { transform: scale(1.35); opacity: 1; }
    94%       { transform: scale(1.5); opacity: 1; }
    97%       { transform: scale(1.35); opacity: 1; }
    100%      { transform: scale(1.4); opacity: 1; }
  }

  @keyframes nuvi-c-load-pupil {
    /* Phase 1 toupie : centrée scale 1.4 */
    0%, 23%   { transform: translate(0, 0) scale(1.4); opacity: 1; }
    /* Phase curieux : SACCADES sur 4 points avec fixations */
    24%       { transform: translate(0, 0) scale(1.4); animation-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55); }
    26%       { transform: translate(8px, -6px) scale(1.4); }
    29%       { transform: translate(8px, -6px) scale(1.4); }
    30%       { transform: translate(-9px, -5px) scale(1.4); animation-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55); }
    33%       { transform: translate(-9px, -5px) scale(1.4); }
    34%       { transform: translate(7px, 7px) scale(1.4); animation-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55); }
    37%       { transform: translate(7px, 7px) scale(1.4); }
    38%       { transform: translate(-8px, 6px) scale(1.4); animation-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55); }
    39%       { transform: translate(-8px, 6px) scale(1.4); }
    40%       { transform: translate(0, 0) scale(1.4); }
    /* Phase 2 toupie : centrée */
    41%, 60%  { transform: translate(0, 0) scale(1.4); opacity: 1; }
    /* Phase blink : pupille suit l'iris (disparaît) */
    62%       { transform: scaleY(1) scale(1.4); opacity: 1; }
    63%       { transform: scaleY(0) scale(1.4); opacity: 0; }
    64%       { transform: scaleY(1) scale(1.4); opacity: 1; }
    66%       { transform: scaleY(1) scale(1.4); opacity: 1; }
    67%       { transform: scaleY(0) scale(1.4); opacity: 0; }
    68%       { transform: scaleY(1) scale(1.4); opacity: 1; }
    69%       { transform: scaleY(0) scale(1.4); opacity: 0; }
    70%       { transform: scaleY(1) scale(1.4); opacity: 1; }
    /* Phase 3 toupie */
    71%, 86%  { transform: translate(0, 0) scale(1.4); opacity: 1; }
    /* Phase concentré : pupille pulse */
    88%       { transform: scale(1.6); opacity: 1; }
    91%       { transform: scale(1.3); opacity: 1; }
    94%       { transform: scale(1.6); opacity: 1; }
    97%       { transform: scale(1.3); opacity: 1; }
    100%      { transform: translate(0, 0) scale(1.4); opacity: 1; }
  }

  @keyframes nuvi-c-load-highlights {
    /* Stables sauf pendant les blinks */
    0%, 60%   { opacity: 1; }
    62%       { opacity: 1; }
    63%       { opacity: 0; }
    64%       { opacity: 1; }
    66%       { opacity: 1; }
    67%       { opacity: 0; }
    68%       { opacity: 1; }
    69%       { opacity: 0; }
    70%, 100% { opacity: 1; }
  }

  @keyframes nuvi-c-load-eyebrow {
    /* Phase 1 toupie : froncé concentré */
    0%, 23%   { transform: translateY(-2px) rotate(-1deg); }
    /* Phase curieux : monte (surprise) */
    25%       { transform: translateY(-6px) rotate(0deg); animation-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55); }
    32%       { transform: translateY(-4px) rotate(2deg); }
    36%       { transform: translateY(-6px) rotate(-2deg); }
    40%       { transform: translateY(-2px) rotate(-1deg); }
    /* Phase 2 toupie */
    41%, 60%  { transform: translateY(-2px) rotate(-1deg); }
    /* Phase blink : neutre */
    62%, 70%  { transform: translateY(-1px) rotate(0deg); }
    /* Phase 3 toupie */
    71%, 86%  { transform: translateY(-2px) rotate(-1deg); }
    /* Phase concentré : fronce intense */
    88%       { transform: translateY(2px) rotate(0deg) scaleX(0.85); }
    92%       { transform: translateY(2px) rotate(0deg) scaleX(0.85); }
    96%       { transform: translateY(0) rotate(-1deg) scaleX(0.95); }
    100%      { transform: translateY(-2px) rotate(-1deg); }
  }

  @keyframes nuvi-c-load-eye {
    /* Eye-inner reste centré sauf pendant la phase curieux */
    0%, 23%   { transform: translate(0, 0); }
    26%       { transform: translate(2px, -1px); }
    30%       { transform: translate(-2px, -1px); }
    34%       { transform: translate(2px, 2px); }
    38%       { transform: translate(-2px, 2px); }
    40%, 100% { transform: translate(0, 0); }
  }

  /* =================================================================
     IDLE MODE KEYFRAMES (full 8-gag cycle)
     ================================================================= */

  @keyframes nuvi-c-companion-tilt {
    0%, 78%   { transform: rotate(0deg); }
    80%       { transform: rotate(-3deg); }
    82%       { transform: rotate(90deg); animation-timing-function: cubic-bezier(0.55, 0, 0.85, 0); }
    84%, 89%  { transform: rotate(90deg); }
    90%       { transform: rotate(0deg); animation-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55); }
    100%      { transform: rotate(0deg); }
  }

  @keyframes nuvi-c-body-life {
    0%    { transform: scale(1) translate(0, 0) rotate(0deg); }
    5%    { transform: scale(1.04) translate(0, -2px); }
    7%    { transform: scale(1) translate(0, 0); }
    7.5%  { transform: scale(0.85, 1.15) translate(0, -15px); animation-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55); }
    10%   { transform: scale(1.18, 0.85) translate(0, 0); animation-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55); }
    13%   { transform: scale(1.08) translate(0, 0); }
    15%   { transform: scale(1.08) translate(0, 0); }
    16%   { transform: scale(1) translate(0, 0) rotate(-3deg); }
    19%   { transform: scale(1.05) translate(0, -2px) rotate(3deg); }
    22%   { transform: scale(1.05) translate(0, -1px) rotate(-2deg); }
    25%   { transform: scale(1.05) translate(0, -2px) rotate(2deg); }
    28%   { transform: scale(1) translate(0, 0) rotate(0deg); }
    30%   { transform: scale(1) translate(0, 0) rotate(0deg); }
    32%   { transform: scale(0.95, 1.05) translate(-3px, 0) rotate(-8deg); }
    35%   { transform: scale(0.95, 1.05) translate(-3px, 0) rotate(-8deg); }
    38%   { transform: scale(1.10, 0.92) translate(0, 0) rotate(0deg); }
    40%   { transform: scale(1) translate(0, 0) rotate(0deg); }
    41%   { transform: scale(1.18, 0.78) translate(0, 12px); animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
    43%   { transform: scale(0.78, 1.20) translate(0, -55px); animation-timing-function: cubic-bezier(0.55, 0, 0.85, 0); }
    45%   { transform: scale(1.15, 0.82) translate(0, 10px); animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
    47%   { transform: scale(0.85, 1.15) translate(0, -40px); animation-timing-function: cubic-bezier(0.55, 0, 0.85, 0); }
    49%   { transform: scale(1.10, 0.88) translate(0, 8px); animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
    50%   { transform: scale(1) translate(0, 0); }
    51%   { transform: scale(1) translate(0, 0); }
    53%   { transform: scale(0.75) translate(0, 8px); animation-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55); }
    60%   { transform: scale(0.75) translate(0, 8px); }
    63%   { transform: scale(1.18) translate(0, -2px); animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
    65%   { transform: scale(1) translate(0, 0); }
    66%   { transform: scale(1) translate(0, 0) rotate(0deg); animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1); }
    70%   { transform: scale(1) translate(-2px, 0) rotate(720deg); }
    74%   { transform: scale(1) translate(2px, 0) rotate(1440deg); }
    77%   { transform: scale(1) translate(0, 0) rotate(1440deg); }
    78%   { transform: scale(1) translate(0, 0) rotate(1440deg); animation-timing-function: cubic-bezier(0.55, 0, 0.85, 0); }
    80%   { transform: scale(1.05, 0.95) translate(0, 5px) rotate(1440deg); }
    82%   { transform: scale(1.10, 0.85) translate(0, 8px) rotate(1440deg); animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
    84%   { transform: scale(1.10, 0.85) translate(0, 8px) rotate(1440deg); }
    87%   { transform: scale(1.10, 0.85) translate(0, 8px) rotate(1440deg); }
    89%   { transform: scale(1.10, 0.85) translate(0, 8px) rotate(1440deg); }
    90%   { transform: scale(0.85, 1.20) translate(0, -25px) rotate(1440deg); animation-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55); }
    92%   { transform: scale(1.15, 0.85) translate(0, 5px) rotate(1440deg); animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
    94%   { transform: scale(1) translate(0, 0) rotate(1440deg); }
    97%   { transform: scale(1.05) translate(0, -2px) rotate(1440deg); }
    100%  { transform: scale(1) translate(0, 0) rotate(1440deg); }
  }

  @keyframes nuvi-c-eye-look {
    0%, 4%      { transform: translate(0, 0); }
    7%          { transform: translate(0, 0); animation-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55); }
    8%          { transform: translate(0, 0); }
    14%, 15%    { transform: translate(0, 0); }
    32%         { transform: translate(-4px, -3px); }
    35%         { transform: translate(-4px, -3px); }
    38%         { transform: translate(0, 0); }
    41%         { transform: translate(0, 4px); }
    43%         { transform: translate(0, -3px); }
    45%         { transform: translate(0, 4px); }
    47%         { transform: translate(0, -3px); }
    49%, 50%    { transform: translate(0, 0); }
    68%         { transform: translate(-3px, -2px); }
    72%         { transform: translate(3px, -2px); }
    75%         { transform: translate(-3px, 2px); }
    77%         { transform: translate(0, 0); }
    82%, 89%    { transform: translate(0, 3px); }
    91%         { transform: translate(0, -3px); }
    100%        { transform: translate(0, 0); }
  }

  @keyframes nuvi-c-iris-life {
    0%, 3%      { transform: scaleY(1); opacity: 1; }
    4%          { transform: scaleY(0.08); }
    4.5%        { transform: scaleY(1); }
    7%          { transform: scaleY(1) scale(1); opacity: 1; animation-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55); }
    8.5%        { transform: scaleY(1) scale(1.5); opacity: 1; }
    21%         { transform: scaleY(1) scale(1.5); opacity: 1; }
    22%         { transform: scaleY(1) scale(1); opacity: 1; }
    23%         { opacity: 1; transform: scale(1); }
    24%         { opacity: 0; transform: scale(0); }
    33%         { opacity: 0; transform: scale(0); }
    34%         { opacity: 1; transform: scale(1); }
    51%         { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
    54%         { transform: translate(-65px, -80px) rotate(-360deg) scale(1.2); opacity: 1; animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
    59%         { transform: translate(-65px, -80px) rotate(-360deg) scale(1.2); opacity: 1; }
    62%         { transform: translate(0, 0) rotate(-720deg) scale(1); opacity: 1; animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
    65%         { transform: translate(0, 0) rotate(-720deg) scale(1); opacity: 1; }
    66%, 77%    { transform: scale(1); opacity: 1; }
    78%         { opacity: 1; transform: scale(1); }
    79%         { opacity: 0; transform: scale(0); }
    87%         { opacity: 0; transform: scale(0); }
    89%         { opacity: 1; transform: scale(1); }
    91%         { transform: scale(1.4); opacity: 1; animation-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55); }
    93%         { transform: scale(1); opacity: 1; }
    100%        { transform: scaleY(1) scale(1); opacity: 1; }
  }

  @keyframes nuvi-c-pupil-life {
    0%, 7%      { transform: translate(0, 0) scale(1); opacity: 1; }
    8%          { transform: translate(0, 0) scale(1.4); opacity: 1; animation-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55); }
    9%          { transform: translate(8px, -6px) scale(1.4); opacity: 1; animation-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55); }
    11%         { transform: translate(8px, -6px) scale(1.4); opacity: 1; }
    11.5%       { transform: translate(-9px, -5px) scale(1.4); opacity: 1; animation-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55); }
    13.5%       { transform: translate(-9px, -5px) scale(1.4); opacity: 1; }
    14%         { transform: translate(7px, 7px) scale(1.4); opacity: 1; animation-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55); }
    16%         { transform: translate(7px, 7px) scale(1.4); opacity: 1; }
    16.5%       { transform: translate(0, 9px) scale(1.4); opacity: 1; animation-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55); }
    18%         { transform: translate(0, 9px) scale(1.4); opacity: 1; }
    18.5%       { transform: translate(-8px, 6px) scale(1.4); opacity: 1; animation-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55); }
    20%         { transform: translate(-8px, 6px) scale(1.4); opacity: 1; }
    21%         { transform: translate(0, 0) scale(1.4); opacity: 1; animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1); }
    22%         { transform: translate(0, 0) scale(1); opacity: 1; }
    23%         { transform: scale(0); opacity: 0; }
    33%         { transform: scale(0); opacity: 0; }
    34%         { transform: scale(1); opacity: 1; }
    51%         { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 1; }
    54%         { transform: translate(70px, -75px) scale(1.5) rotate(540deg); opacity: 1; animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
    59%         { transform: translate(70px, -75px) scale(1.5) rotate(540deg); opacity: 1; }
    62%         { transform: translate(0, 0) scale(1) rotate(720deg); opacity: 1; }
    65%         { transform: translate(0, 0) scale(1); opacity: 1; }
    78%         { opacity: 1; }
    79%         { opacity: 0; }
    89%         { opacity: 1; }
    100%        { transform: translate(0, 0) scale(1); opacity: 1; }
  }

  @keyframes nuvi-c-hl1-life {
    0%, 22%     { transform: translate(0, 0) scale(1); opacity: 1; }
    23%         { transform: scale(0); opacity: 0; }
    33%         { transform: scale(0); opacity: 0; }
    34%, 51%    { transform: translate(0, 0) scale(1); opacity: 1; }
    54%         { transform: translate(-55px, 60px) scale(1.5) rotate(360deg); opacity: 1; animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
    59%         { transform: translate(-55px, 60px) scale(1.5) rotate(360deg); opacity: 1; }
    62%         { transform: translate(0, 0) scale(1) rotate(720deg); opacity: 1; }
    65%         { transform: translate(0, 0) scale(1); opacity: 1; }
    78%, 89%    { opacity: 0; }
    100%        { transform: translate(0, 0) scale(1); opacity: 1; }
  }

  @keyframes nuvi-c-hl2-life {
    0%, 22%     { transform: translate(0, 0) scale(1); opacity: 0.6; }
    23%         { transform: scale(0); opacity: 0; }
    33%         { transform: scale(0); opacity: 0; }
    34%, 51%    { transform: translate(0, 0) scale(1); opacity: 0.6; }
    54%         { transform: translate(60px, 55px) scale(2.5) rotate(-360deg); opacity: 1; animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
    59%         { transform: translate(60px, 55px) scale(2.5) rotate(-360deg); opacity: 1; }
    62%         { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 0.6; }
    65%         { transform: translate(0, 0) scale(1); opacity: 0.6; }
    78%, 89%    { opacity: 0; }
    100%        { transform: translate(0, 0) scale(1); opacity: 0.6; }
  }

  @keyframes nuvi-c-eyebrow-life {
    0%          { transform: translateY(0) rotate(0deg) scaleX(1); }
    8%          { transform: translateY(-10px) rotate(0deg) scaleX(1); animation-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55); }
    13%         { transform: translateY(-10px) rotate(0deg) scaleX(1); }
    15%         { transform: translateY(0) rotate(0deg) scaleX(1); }
    16%         { transform: translateY(0) rotate(0deg); }
    18%         { transform: translateY(-3px) rotate(-2deg); }
    25%         { transform: translateY(-3px) rotate(2deg); }
    28%         { transform: translateY(0) rotate(0deg); }
    30%         { transform: translateY(0) rotate(0deg) scaleX(1); }
    32%         { transform: translateY(8px) rotate(0deg) scaleX(0.8); animation-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55); }
    35%         { transform: translateY(8px) rotate(0deg) scaleX(0.8); }
    38%         { transform: translateY(0) rotate(0deg) scaleX(1); }
    41%         { transform: translateY(8px) rotate(0deg); }
    43%         { transform: translateY(-12px) rotate(0deg); }
    49%         { transform: translateY(0) rotate(0deg); }
    51%         { transform: translateY(0) rotate(0deg); }
    54%         { transform: translate(15px, -90px) rotate(540deg) scaleX(1); opacity: 1; animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
    59%         { transform: translate(15px, -90px) rotate(540deg) scaleX(1); }
    62%         { transform: translate(0, 0) rotate(720deg) scaleX(1); }
    65%         { transform: translate(0, 0) rotate(0deg) scaleX(1); }
    70%         { transform: translateY(2px) rotate(-15deg); }
    74%         { transform: translateY(2px) rotate(15deg); }
    77%         { transform: translateY(0) rotate(0deg); }
    82%, 89%    { transform: translateY(2px) rotate(0deg) scaleX(0.9); }
    91%         { transform: translateY(-8px) rotate(0deg); }
    94%         { transform: translateY(0) rotate(0deg); }
    100%        { transform: translateY(0) rotate(0deg) scaleX(1); }
  }

  @keyframes nuvi-c-heart-life {
    0%, 22%   { opacity: 0; transform: scale(0); }
    23%       { opacity: 1; transform: scale(1.2); animation-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55); }
    24%       { transform: scale(1); }
    26%       { transform: scale(1.15); }
    28%       { transform: scale(1); }
    30%       { transform: scale(1.15); }
    32%       { transform: scale(1); }
    33%       { opacity: 1; transform: scale(0); }
    34%, 100% { opacity: 0; transform: scale(0); }
  }

  @keyframes nuvi-c-tongue-life {
    0%, 31%   { opacity: 0; transform: translateY(0) scaleY(0); }
    32%       { opacity: 1; transform: translateY(0) scaleY(1); animation-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55); }
    33.5%     { transform: translateY(0) scaleY(1) rotate(-5deg); }
    35%       { opacity: 1; transform: translateY(0) scaleY(1); }
    36%       { transform: translateY(0) scaleY(1) rotate(5deg); }
    37%       { transform: translateY(0) scaleY(1) rotate(0deg); }
    38%       { opacity: 0; transform: translateY(-5px) scaleY(0); }
    100%      { opacity: 0; }
  }

  @keyframes nuvi-c-star-life {
    0%, 78%   { opacity: 0; transform: rotate(0deg) scale(0); }
    79%       { opacity: 1; transform: rotate(0deg) scale(1.2); animation-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55); }
    80%       { opacity: 1; transform: rotate(0deg) scale(1); }
    84%       { opacity: 1; transform: rotate(180deg) scale(1.05); }
    88%       { opacity: 1; transform: rotate(360deg) scale(1); }
    89%       { opacity: 0; transform: rotate(360deg) scale(0); }
    100%      { opacity: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .nuvi-companion,
    .nuvi-eye-3d,
    .nuvi-c-body,
    .nuvi-c-iris,
    .nuvi-c-pupil,
    .nuvi-c-highlight-1,
    .nuvi-c-highlight-2,
    .nuvi-c-eyebrow,
    .nuvi-c-eye-inner,
    .nuvi-c-heart,
    .nuvi-c-tongue,
    .nuvi-c-star-eye,
    .nuvi-toupie-shadow {
      animation: none !important;
    }
  }
`;
