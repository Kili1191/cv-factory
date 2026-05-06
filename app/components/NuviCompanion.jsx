"use client";

import React, { useState, useEffect, useRef } from 'react';

/**
 * NuviCompanion v3 — The Nuvi mascot, now with mouth and arms for expressions
 *
 * NEW IN v3:
 *   - Mouth (changes shape per expression)
 *   - Two arms (left + right) that animate per expression
 *   - Both invisible in standard modes (idle/speaking/loading)
 *
 * MODES (compatible with v1/v2):
 *   "idle"       - Default cycle of 8 playful gags (30s loop)
 *   "appearing"  - Flies in from the Coach button origin
 *   "speaking"   - Subtle expressive animations while talking
 *   "loading"    - Gentle 3D Y-axis spin
 *   "expression" - Static or animated emoji expression with mouth + arms
 *
 * EXPRESSIONS (15):
 *   joy, sad, surprised, angry, scared, love, focus,
 *   tired, proud, thinking, wink, laughing, curious, zen, celebrating
 */

const EXPRESSIONS = [
  'joy', 'sad', 'surprised', 'angry', 'scared', 'love', 'focus',
  'tired', 'proud', 'thinking', 'wink', 'laughing', 'curious', 'zen', 'celebrating'
];

export default function NuviCompanion({
  mode = 'idle',
  expression = null,
  followCursor = false,
  breathing = true,
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
  const containerRef = useRef(null);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });

  const gradientIds = {
    body: `nuvi-body-sphere-${uniqueId}`,
    bodyBack: `nuvi-body-back-${uniqueId}`,
    iris: `nuvi-iris-sphere-${uniqueId}`,
    bodyAngry: `nuvi-body-angry-${uniqueId}`,
  };

  const isLoading = mode === 'loading';
  const isExpression = mode === 'expression' && expression && EXPRESSIONS.includes(expression);

  // === EYE FOLLOWS CURSOR ===
  useEffect(() => {
    if (!followCursor || isLoading || isExpression) {
      setPupilOffset({ x: 0, y: 0 });
      return;
    }
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxOffset = 12;
      if (distance < 5) {
        setPupilOffset({ x: 0, y: 0 });
        return;
      }
      const ratio = Math.min(maxOffset / distance, maxOffset / 200);
      setPupilOffset({ x: dx * ratio, y: dy * ratio });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [followCursor, isLoading, isExpression]);

  const pupilFollowStyle = followCursor && !isLoading && !isExpression
    ? { transform: `translate(${pupilOffset.x}px, ${pupilOffset.y}px)`, transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)' }
    : {};

  return (
    <>
      <style>
        {nuviCompanionStyles({ animDuration, coachOrigin, mode, breathing })}
      </style>

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
          <radialGradient id={gradientIds.bodyAngry} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#FFE5E0" />
            <stop offset="55%" stopColor="#FFC4B8" />
            <stop offset="100%" stopColor="#E5867A" />
          </radialGradient>
        </defs>
      </svg>

      <div
        ref={containerRef}
        className={`nuvi-companion nuvi-mode-${mode}${isExpression ? ` nuvi-expr-${expression}` : ''}${breathing ? ' nuvi-breathing' : ''}`}
        style={{ width: size, height: size }}
        aria-label="Nuvi"
        role="img"
      >
        {isLoading ? (
          <>
            <div className="nuvi-eye-3d">
              <div className="nuvi-eye-front">
                <CompanionFront gradients={gradientIds} bodyStroke={bodyStroke} irisColor={irisColor} pupilColor={pupilColor} highlightColor={highlightColor} heartColor={heartColor} tongueColor={tongueColor} pupilFollowStyle={{}} />
              </div>
              <div className="nuvi-eye-back">
                <CompanionBack gradient={gradientIds.bodyBack} bodyStroke={bodyStroke} />
              </div>
            </div>
            <div className="nuvi-toupie-shadow" />
          </>
        ) : (
          <CompanionFront
            gradients={gradientIds}
            bodyStroke={bodyStroke}
            irisColor={irisColor}
            pupilColor={pupilColor}
            highlightColor={highlightColor}
            heartColor={heartColor}
            tongueColor={tongueColor}
            pupilFollowStyle={pupilFollowStyle}
          />
        )}
      </div>
    </>
  );
}

// === Front face: full eye + mouth + arms ===
function CompanionFront({ gradients, bodyStroke, irisColor, pupilColor, highlightColor, heartColor, tongueColor, pupilFollowStyle }) {
  return (
    <svg viewBox="-50 -50 280 280" xmlns="http://www.w3.org/2000/svg">
      {/* === BRAS GAUCHE === */}
      <g className="nuvi-c-arm-left" opacity="0">
        <path
          d="M 25 110 Q 5 115, -5 130 Q -10 145, 0 155"
          fill="none"
          stroke={bodyStroke}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle cx="0" cy="155" r="7" fill={`url(#${gradients.body})`} stroke={bodyStroke} strokeWidth="2" />
      </g>

      {/* === BRAS DROIT === */}
      <g className="nuvi-c-arm-right" opacity="0">
        <path
          d="M 155 110 Q 175 115, 185 130 Q 190 145, 180 155"
          fill="none"
          stroke={bodyStroke}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle cx="180" cy="155" r="7" fill={`url(#${gradients.body})`} stroke={bodyStroke} strokeWidth="2" />
      </g>

      {/* === BODY === */}
      <path
        className="nuvi-c-body"
        d="M 90 28 C 128 30, 160 56, 162 92 C 163 128, 132 158, 88 156 C 44 154, 16 126, 18 88 C 20 54, 52 28, 90 28 Z"
        fill={`url(#${gradients.body})`}
        stroke={bodyStroke}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* === EYEBROW === */}
      <path
        className="nuvi-c-eyebrow"
        d="M 52 50 Q 90 36, 130 52"
        fill="none"
        stroke={irisColor}
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Second eyebrow for angry mode */}
      <path
        className="nuvi-c-eyebrow-2"
        d="M 130 52 Q 90 36, 52 50"
        fill="none"
        stroke="#c0392b"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0"
      />

      {/* === MOUTH (varies per expression) === */}
      <path
        className="nuvi-c-mouth"
        d="M 75 130 Q 90 138, 105 130"
        fill="none"
        stroke={pupilColor}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0"
      />

      {/* Open mouth (O shape) for surprise */}
      <ellipse
        className="nuvi-c-mouth-o"
        cx="90"
        cy="135"
        rx="8"
        ry="10"
        fill={pupilColor}
        opacity="0"
      />

      {/* Big smile mouth (filled) for joy/laughing */}
      <path
        className="nuvi-c-mouth-smile"
        d="M 65 125 Q 90 152, 115 125 Q 110 140, 90 142 Q 70 140, 65 125 Z"
        fill={pupilColor}
        opacity="0"
      />

      {/* === ORIGINAL TONGUE (idle mode raspberry) === */}
      <path
        className="nuvi-c-tongue"
        d="M 72 120 Q 90 152, 108 120 Q 110 142, 100 152 Q 90 162, 80 152 Q 70 142, 72 120 Z"
        fill={tongueColor}
        stroke={bodyStroke}
        strokeWidth="1.5"
      />

      {/* === HEART === */}
      <path
        className="nuvi-c-heart"
        d="M 90 78 C 78 64, 60 70, 60 86 C 60 100, 78 116, 90 124 C 102 116, 120 100, 120 86 C 120 70, 102 64, 90 78 Z"
        fill={heartColor}
      />

      {/* === TEAR === */}
      <path
        className="nuvi-c-tear"
        d="M 92 105 Q 88 120, 92 130 Q 96 120, 92 105 Z"
        fill="#5b9fd9"
        opacity="0"
      />

      {/* === CLOSED EYE (laugh, zen, wink) === */}
      <path
        className="nuvi-c-closed-eye"
        d="M 60 95 Q 90 75, 122 95"
        fill="none"
        stroke={pupilColor}
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0"
      />

      {/* === STARS === */}
      <g className="nuvi-c-stars" opacity="0">
        <circle cx="40" cy="55" r="3" fill="#FFD700" className="nuvi-c-star-1" />
        <circle cx="140" cy="55" r="3" fill="#FFD700" className="nuvi-c-star-2" />
        <circle cx="35" cy="120" r="2" fill="#FFD700" className="nuvi-c-star-3" />
        <circle cx="145" cy="120" r="2" fill="#FFD700" className="nuvi-c-star-4" />
      </g>

      <g className="nuvi-c-star-eye">
        <line x1="75" y1="76" x2="105" y2="106" stroke={pupilColor} strokeWidth="4" strokeLinecap="round" />
        <line x1="105" y1="76" x2="75" y2="106" stroke={pupilColor} strokeWidth="4" strokeLinecap="round" />
      </g>

      {/* === EYE INNER === */}
      <g className="nuvi-c-eye-inner">
        <path
          className="nuvi-c-iris"
          d="M 90 60 C 108 60, 122 75, 122 92 C 122 108, 109 122, 90 122 C 73 122, 58 109, 58 91 C 58 75, 73 60, 90 60 Z"
          fill={`url(#${gradients.iris})`}
        />
        <g className="nuvi-c-pupil-group" style={pupilFollowStyle}>
          <circle className="nuvi-c-pupil" cx="92" cy="89" r="7" fill={pupilColor} />
          <ellipse className="nuvi-c-highlight-1" cx="98" cy="79" rx="6" ry="5" fill={highlightColor} />
          <circle className="nuvi-c-highlight-2" cx="83" cy="98" r="2.5" fill={highlightColor} opacity="0.6" />
        </g>
      </g>
    </svg>
  );
}

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

const nuviCompanionStyles = ({ animDuration, coachOrigin, mode, breathing }) => `
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
  .nuvi-c-eyebrow, .nuvi-c-eye-inner, .nuvi-c-heart, .nuvi-c-tongue, .nuvi-c-tear,
  .nuvi-c-closed-eye, .nuvi-c-stars, .nuvi-c-eyebrow-2,
  .nuvi-c-mouth, .nuvi-c-mouth-o, .nuvi-c-mouth-smile,
  .nuvi-c-arm-left, .nuvi-c-arm-right {
    transform-origin: center;
    transform-box: fill-box;
  }
  .nuvi-c-eyebrow, .nuvi-c-eyebrow-2 { transform-origin: center bottom; }
  .nuvi-c-tongue  { transform-origin: center top; }
  .nuvi-c-star-eye { transform-origin: 90px 91px; }
  .nuvi-c-arm-left { transform-origin: 25px 110px; }
  .nuvi-c-arm-right { transform-origin: 155px 110px; }

  /* =================================================================
     BREATHING CYCLE
     ================================================================= */
  .nuvi-breathing .nuvi-c-body {
    animation: nuvi-c-breathe-cycle 4s ease-in-out infinite;
  }
  @keyframes nuvi-c-breathe-cycle {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.025); }
  }

  /* =================================================================
     IDLE MODE
     ================================================================= */
  .nuvi-mode-idle {
    transform-origin: center center;
    animation: nuvi-c-companion-tilt ${animDuration} ease-in-out infinite;
  }
  .nuvi-mode-idle .nuvi-c-body        { animation: nuvi-c-body-life ${animDuration} cubic-bezier(0.4, 0, 0.2, 1) infinite !important; }
  .nuvi-mode-idle .nuvi-c-eye-inner   { animation: nuvi-c-eye-look ${animDuration} ease-in-out infinite; }
  .nuvi-mode-idle .nuvi-c-iris        { animation: nuvi-c-iris-life ${animDuration} ease-in-out infinite; }
  .nuvi-mode-idle .nuvi-c-pupil       { animation: nuvi-c-pupil-life ${animDuration} ease-in-out infinite; }
  .nuvi-mode-idle .nuvi-c-highlight-1 { animation: nuvi-c-hl1-life ${animDuration} ease-in-out infinite; }
  .nuvi-mode-idle .nuvi-c-highlight-2 { animation: nuvi-c-hl2-life ${animDuration} ease-in-out infinite; }
  .nuvi-mode-idle .nuvi-c-eyebrow     { animation: nuvi-c-eyebrow-life ${animDuration} ease-in-out infinite; }
  .nuvi-mode-idle .nuvi-c-heart       { animation: nuvi-c-heart-life ${animDuration} ease-in-out infinite; opacity: 0; }
  .nuvi-mode-idle .nuvi-c-tongue      { animation: nuvi-c-tongue-life ${animDuration} ease-out infinite; opacity: 0; }
  .nuvi-mode-idle .nuvi-c-star-eye    { animation: nuvi-c-star-life ${animDuration} linear infinite; opacity: 0; }

  /* Hide elements in non-idle modes */
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
     APPEARING MODE
     ================================================================= */
  .nuvi-mode-appearing {
    animation: nuvi-c-fly-from-coach 4.5s cubic-bezier(0.22, 1, 0.36, 1) infinite;
  }
  .nuvi-mode-appearing .nuvi-c-body {
    animation: nuvi-c-gentle-breathe 4s ease-in-out infinite !important;
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
     SPEAKING MODE
     ================================================================= */
  .nuvi-mode-speaking .nuvi-c-body        { animation: nuvi-c-speak-bob 1.6s ease-in-out infinite !important; }
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
    14%  { transform: translateY(-4px) rotate(-3deg) scaleX(1); }
    27%  { transform: translateY(-3px) rotate(2deg) scaleX(1); }
    46%  { transform: translateY(-2px) rotate(-2deg) scaleX(1); }
    53%  { transform: translateY(-5px) rotate(3deg) scaleX(1); }
    74%  { transform: translateY(-3px) rotate(-2deg) scaleX(1); }
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
     LOADING MODE
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
  @keyframes nuvi-c-toupie-spin-3d {
    0%   { transform: rotateY(0deg); }
    23%  { transform: rotateY(1080deg); }
    40%  { transform: rotateY(1080deg); }
    60%  { transform: rotateY(1800deg); }
    70%  { transform: rotateY(1800deg); }
    86%  { transform: rotateY(2520deg); }
    100% { transform: rotateY(2520deg); }
  }
  .nuvi-mode-loading .nuvi-c-iris       { animation: nuvi-c-load-iris 30s ease-in-out infinite; }
  .nuvi-mode-loading .nuvi-c-pupil      { animation: nuvi-c-load-pupil 30s ease-in-out infinite; }
  .nuvi-mode-loading .nuvi-c-eyebrow    { animation: nuvi-c-load-eyebrow 30s ease-in-out infinite; }
  .nuvi-mode-loading .nuvi-c-eye-inner  { animation: nuvi-c-load-eye 30s ease-in-out infinite; }

  @keyframes nuvi-c-load-iris {
    0%, 23%   { transform: scale(1.4); opacity: 1; }
    25%       { transform: scale(1.5); opacity: 1; }
    40%       { transform: scale(1.4); opacity: 1; }
    41%, 100% { transform: scale(1.4); opacity: 1; }
  }
  @keyframes nuvi-c-load-pupil {
    0%, 23%   { transform: translate(0, 0) scale(1.4); opacity: 1; }
    26%       { transform: translate(8px, -6px) scale(1.4); }
    30%       { transform: translate(-9px, -5px) scale(1.4); }
    34%       { transform: translate(7px, 7px) scale(1.4); }
    38%       { transform: translate(-8px, 6px) scale(1.4); }
    41%, 100% { transform: translate(0, 0) scale(1.4); opacity: 1; }
  }
  @keyframes nuvi-c-load-eyebrow {
    0%, 100% { transform: translateY(-2px) rotate(-1deg); }
    25%      { transform: translateY(-6px) rotate(0deg); }
  }
  @keyframes nuvi-c-load-eye {
    0%, 100% { transform: translate(0, 0); }
    26%      { transform: translate(2px, -1px); }
    30%      { transform: translate(-2px, -1px); }
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
    0%    { transform: scale(1); }
    50%   { transform: scale(1.03); }
    100%  { transform: scale(1); }
  }
  @keyframes nuvi-c-eye-look {
    0%, 100% { transform: translate(0, 0); }
  }
  @keyframes nuvi-c-iris-life {
    0%, 22%   { transform: scale(1); opacity: 1; }
    23%       { opacity: 1; transform: scale(1); }
    24%       { opacity: 0; transform: scale(0); }
    33%       { opacity: 0; transform: scale(0); }
    34%       { opacity: 1; transform: scale(1); }
    100%      { transform: scale(1); opacity: 1; }
  }
  @keyframes nuvi-c-pupil-life {
    0%, 22%   { transform: scale(1); opacity: 1; }
    23%       { transform: scale(0); opacity: 0; }
    33%       { transform: scale(0); opacity: 0; }
    34%, 100% { transform: scale(1); opacity: 1; }
  }
  @keyframes nuvi-c-hl1-life {
    0%, 22%   { transform: scale(1); opacity: 1; }
    23%       { transform: scale(0); opacity: 0; }
    33%       { transform: scale(0); opacity: 0; }
    34%, 100% { transform: scale(1); opacity: 1; }
  }
  @keyframes nuvi-c-hl2-life {
    0%, 22%   { transform: scale(1); opacity: 0.6; }
    23%       { transform: scale(0); opacity: 0; }
    33%       { transform: scale(0); opacity: 0; }
    34%, 100% { transform: scale(1); opacity: 0.6; }
  }
  @keyframes nuvi-c-eyebrow-life {
    0%, 100% { transform: translateY(0) rotate(0deg) scaleX(1); }
    8%       { transform: translateY(-10px); }
    13%      { transform: translateY(-10px); }
    15%      { transform: translateY(0); }
  }
  @keyframes nuvi-c-heart-life {
    0%, 22%   { opacity: 0; transform: scale(0); }
    23%       { opacity: 1; transform: scale(1.2); }
    24%, 32%  { transform: scale(1); }
    33%       { opacity: 1; transform: scale(0); }
    34%, 100% { opacity: 0; transform: scale(0); }
  }
  @keyframes nuvi-c-tongue-life {
    0%, 31%   { opacity: 0; transform: scaleY(0); }
    32%       { opacity: 1; transform: scaleY(1); }
    37%       { transform: scaleY(1); }
    38%       { opacity: 0; transform: scaleY(0); }
    100%      { opacity: 0; }
  }
  @keyframes nuvi-c-star-life {
    0%, 78%   { opacity: 0; transform: scale(0); }
    79%       { opacity: 1; transform: scale(1.2); }
    88%       { opacity: 1; transform: rotate(360deg) scale(1); }
    89%       { opacity: 0; transform: scale(0); }
    100%      { opacity: 0; }
  }

  /* =================================================================
     EXPRESSION MODE - 15 expressions with mouth + arms
     ================================================================= */

  /* JOY - Big smile + arms raised in joy */
  .nuvi-expr-joy .nuvi-c-body { animation: nuvi-expr-bounce 1.6s ease-in-out infinite !important; }
  .nuvi-expr-joy .nuvi-c-mouth-smile { opacity: 1; animation: nuvi-expr-mouth-pulse 1.6s ease-in-out infinite; }
  .nuvi-expr-joy .nuvi-c-arm-left {
    opacity: 1;
    transform: rotate(-110deg) translate(0, -25px);
    animation: nuvi-expr-arm-wave-left 1.2s ease-in-out infinite;
  }
  .nuvi-expr-joy .nuvi-c-arm-right {
    opacity: 1;
    transform: rotate(110deg) translate(0, -25px);
    animation: nuvi-expr-arm-wave-right 1.2s ease-in-out infinite;
  }
  .nuvi-expr-joy .nuvi-c-eyebrow { transform: translateY(-4px) scaleX(1.1); }
  .nuvi-expr-joy .nuvi-c-iris { transform: scaleY(0.6); }

  /* SAD - Frown + arms down */
  .nuvi-expr-sad .nuvi-c-body { transform: translateY(2px) scale(0.97); }
  .nuvi-expr-sad .nuvi-c-eyebrow { transform: translateY(2px) rotate(0deg) scaleX(0.85); }
  .nuvi-expr-sad .nuvi-c-pupil-group { transform: translateY(3px); }
  .nuvi-expr-sad .nuvi-c-tear { opacity: 1; animation: nuvi-expr-tear-drop 2s ease-in-out infinite; }
  .nuvi-expr-sad .nuvi-c-mouth { opacity: 1; transform: rotate(180deg); }
  .nuvi-expr-sad .nuvi-c-arm-left { opacity: 1; transform: rotate(20deg) translate(-5px, 5px); }
  .nuvi-expr-sad .nuvi-c-arm-right { opacity: 1; transform: rotate(-20deg) translate(5px, 5px); }

  /* SURPRISED - Open mouth O + arms wide */
  .nuvi-expr-surprised .nuvi-c-body { animation: nuvi-expr-sursaut 1.8s ease-in-out infinite !important; }
  .nuvi-expr-surprised .nuvi-c-iris { transform: scale(1.3); }
  .nuvi-expr-surprised .nuvi-c-pupil-group { transform: scale(1.2); }
  .nuvi-expr-surprised .nuvi-c-eyebrow { transform: translateY(-8px); }
  .nuvi-expr-surprised .nuvi-c-mouth-o { opacity: 1; }
  .nuvi-expr-surprised .nuvi-c-arm-left { opacity: 1; transform: rotate(-45deg) translate(-10px, -5px); }
  .nuvi-expr-surprised .nuvi-c-arm-right { opacity: 1; transform: rotate(45deg) translate(10px, -5px); }

  /* ANGRY - Frown + fists */
  .nuvi-expr-angry .nuvi-c-body { animation: nuvi-expr-shake 0.4s ease-in-out infinite !important; }
  .nuvi-expr-angry .nuvi-c-eyebrow { opacity: 0; }
  .nuvi-expr-angry .nuvi-c-eyebrow-2 { opacity: 1; transform: translateY(-2px); }
  .nuvi-expr-angry .nuvi-c-pupil-group { transform: scale(0.85); }
  .nuvi-expr-angry .nuvi-c-mouth { opacity: 1; transform: rotate(180deg) scaleX(0.7); stroke: #c0392b; }
  .nuvi-expr-angry .nuvi-c-arm-left {
    opacity: 1;
    transform: rotate(-30deg) translate(-5px, 0);
    animation: nuvi-expr-fist-shake 0.4s ease-in-out infinite;
  }
  .nuvi-expr-angry .nuvi-c-arm-right {
    opacity: 1;
    transform: rotate(30deg) translate(5px, 0);
    animation: nuvi-expr-fist-shake 0.4s ease-in-out infinite;
  }

  /* SCARED - Trembling + arms covering */
  .nuvi-expr-scared .nuvi-c-body { animation: nuvi-expr-tremble 0.15s linear infinite !important; }
  .nuvi-expr-scared .nuvi-c-pupil-group { animation: nuvi-expr-pupil-tremble 0.2s linear infinite; }
  .nuvi-expr-scared .nuvi-c-iris { transform: scale(1.15); }
  .nuvi-expr-scared .nuvi-c-eyebrow { transform: translateY(-6px); }
  .nuvi-expr-scared .nuvi-c-mouth-o { opacity: 1; transform: scale(0.7); }
  .nuvi-expr-scared .nuvi-c-arm-left { opacity: 1; transform: rotate(60deg) translate(0, -20px); }
  .nuvi-expr-scared .nuvi-c-arm-right { opacity: 1; transform: rotate(-60deg) translate(0, -20px); }

  /* LOVE - Heart eyes + arms forming heart */
  .nuvi-expr-love .nuvi-c-body { animation: nuvi-expr-love-bounce 2s ease-in-out infinite !important; }
  .nuvi-expr-love .nuvi-c-iris { opacity: 0; }
  .nuvi-expr-love .nuvi-c-pupil-group { opacity: 0; }
  .nuvi-expr-love .nuvi-c-heart { opacity: 1; animation: nuvi-expr-heart-beat 1s ease-in-out infinite; }
  .nuvi-expr-love .nuvi-c-mouth-smile { opacity: 1; transform: scale(0.7); }
  .nuvi-expr-love .nuvi-c-arm-left { opacity: 1; transform: rotate(-80deg) translate(-5px, -15px); }
  .nuvi-expr-love .nuvi-c-arm-right { opacity: 1; transform: rotate(80deg) translate(5px, -15px); }

  /* FOCUS - Squinting + arms crossed (concentrated) */
  .nuvi-expr-focus .nuvi-c-iris { transform: scaleY(0.7); }
  .nuvi-expr-focus .nuvi-c-pupil-group { transform: scale(1.3); }
  .nuvi-expr-focus .nuvi-c-eyebrow { transform: translateY(2px) scaleX(0.85); }
  .nuvi-expr-focus .nuvi-c-mouth { opacity: 1; transform: scaleY(0.4); stroke-width: 2; }
  .nuvi-expr-focus .nuvi-c-arm-left { opacity: 1; transform: rotate(-15deg); }
  .nuvi-expr-focus .nuvi-c-arm-right { opacity: 1; transform: rotate(15deg); }

  /* TIRED - Half-closed + slumped arms */
  .nuvi-expr-tired .nuvi-c-body { animation: nuvi-expr-yawn 4s ease-in-out infinite !important; }
  .nuvi-expr-tired .nuvi-c-iris { transform: scaleY(0.5); }
  .nuvi-expr-tired .nuvi-c-pupil-group { transform: translateY(3px) scaleY(0.5); }
  .nuvi-expr-tired .nuvi-c-eyebrow { transform: translateY(3px) scaleX(0.9); }
  .nuvi-expr-tired .nuvi-c-mouth-o { opacity: 1; animation: nuvi-expr-yawn-mouth 4s ease-in-out infinite; }
  .nuvi-expr-tired .nuvi-c-arm-left { opacity: 1; transform: rotate(30deg) translate(0, 10px); }
  .nuvi-expr-tired .nuvi-c-arm-right { opacity: 1; transform: rotate(-30deg) translate(0, 10px); }

  /* PROUD - Chest puffed + arms on hips */
  .nuvi-expr-proud .nuvi-c-body { animation: nuvi-expr-proud-pose 2.5s ease-in-out infinite !important; }
  .nuvi-expr-proud .nuvi-c-eyebrow { transform: translateY(-4px) rotate(2deg); }
  .nuvi-expr-proud .nuvi-c-pupil-group { transform: translateY(-2px); }
  .nuvi-expr-proud .nuvi-c-mouth-smile { opacity: 1; transform: scale(0.6); }
  .nuvi-expr-proud .nuvi-c-arm-left { opacity: 1; transform: rotate(-90deg) translate(-15px, -25px); }
  .nuvi-expr-proud .nuvi-c-arm-right { opacity: 1; transform: rotate(90deg) translate(15px, -25px); }

  /* THINKING - Sideways look + chin scratch */
  .nuvi-expr-thinking .nuvi-c-pupil-group { animation: nuvi-expr-think-look 3s ease-in-out infinite; }
  .nuvi-expr-thinking .nuvi-c-eyebrow { animation: nuvi-expr-think-eyebrow 3s ease-in-out infinite; }
  .nuvi-expr-thinking .nuvi-c-mouth { opacity: 1; transform: scaleX(0.5); stroke-width: 2; }
  .nuvi-expr-thinking .nuvi-c-arm-right { opacity: 1; transform: rotate(-110deg) translate(20px, -45px); animation: nuvi-expr-chin-tap 1.5s ease-in-out infinite; }

  /* WINK - Closed eye + thumbs up */
  .nuvi-expr-wink .nuvi-c-iris { animation: nuvi-expr-wink-cycle 3s ease-in-out infinite; }
  .nuvi-expr-wink .nuvi-c-pupil-group { animation: nuvi-expr-wink-pupil 3s ease-in-out infinite; }
  .nuvi-expr-wink .nuvi-c-eyebrow { animation: nuvi-expr-wink-eyebrow 3s ease-in-out infinite; }
  .nuvi-expr-wink .nuvi-c-mouth-smile { opacity: 1; transform: scale(0.5) translateX(8px); }
  .nuvi-expr-wink .nuvi-c-arm-right { opacity: 1; transform: rotate(-95deg) translate(15px, -25px); }

  /* LAUGHING - Eyes closed + body shake + arms holding belly */
  .nuvi-expr-laughing .nuvi-c-body { animation: nuvi-expr-laugh-shake 0.4s ease-in-out infinite !important; }
  .nuvi-expr-laughing .nuvi-c-iris { opacity: 0; }
  .nuvi-expr-laughing .nuvi-c-pupil-group { opacity: 0; }
  .nuvi-expr-laughing .nuvi-c-closed-eye { opacity: 1; }
  .nuvi-expr-laughing .nuvi-c-mouth-smile { opacity: 1; animation: nuvi-expr-laugh-mouth 0.4s ease-in-out infinite; }
  .nuvi-expr-laughing .nuvi-c-arm-left { opacity: 1; transform: rotate(60deg) translate(-5px, 10px); }
  .nuvi-expr-laughing .nuvi-c-arm-right { opacity: 1; transform: rotate(-60deg) translate(5px, 10px); }

  /* CURIOUS - Raised eyebrow + finger pointed */
  .nuvi-expr-curious .nuvi-c-iris { transform: scale(1.2); }
  .nuvi-expr-curious .nuvi-c-eyebrow { animation: nuvi-expr-curious-eyebrow 2s ease-in-out infinite; }
  .nuvi-expr-curious .nuvi-c-pupil-group { animation: nuvi-expr-curious-pupil 4s ease-in-out infinite; }
  .nuvi-expr-curious .nuvi-c-mouth { opacity: 1; transform: scaleX(0.4); }
  .nuvi-expr-curious .nuvi-c-arm-right { opacity: 1; transform: rotate(-50deg) translate(20px, -10px); }

  /* ZEN - Closed eyes + meditation arms */
  .nuvi-expr-zen .nuvi-c-body { animation: nuvi-expr-zen-breathe 5s ease-in-out infinite !important; }
  .nuvi-expr-zen .nuvi-c-iris { opacity: 0; }
  .nuvi-expr-zen .nuvi-c-pupil-group { opacity: 0; }
  .nuvi-expr-zen .nuvi-c-closed-eye { opacity: 1; stroke: #5b3df5; }
  .nuvi-expr-zen .nuvi-c-eyebrow { transform: translateY(2px); }
  .nuvi-expr-zen .nuvi-c-mouth { opacity: 1; transform: scaleX(0.3); }
  .nuvi-expr-zen .nuvi-c-arm-left { opacity: 1; transform: rotate(15deg) translate(-3px, 5px); }
  .nuvi-expr-zen .nuvi-c-arm-right { opacity: 1; transform: rotate(-15deg) translate(3px, 5px); }

  /* CELEBRATING - Stars + hands up + bounce */
  .nuvi-expr-celebrating .nuvi-c-body { animation: nuvi-expr-celebrate-bounce 0.8s ease-in-out infinite !important; }
  .nuvi-expr-celebrating .nuvi-c-iris { opacity: 0; }
  .nuvi-expr-celebrating .nuvi-c-pupil-group { opacity: 0; }
  .nuvi-expr-celebrating .nuvi-c-heart { opacity: 1; animation: nuvi-expr-heart-beat 0.6s ease-in-out infinite; }
  .nuvi-expr-celebrating .nuvi-c-stars { opacity: 1; animation: nuvi-expr-stars-twinkle 1s ease-in-out infinite; }
  .nuvi-expr-celebrating .nuvi-c-mouth-smile { opacity: 1; }
  .nuvi-expr-celebrating .nuvi-c-arm-left {
    opacity: 1;
    animation: nuvi-expr-arm-celebrate-left 0.6s ease-in-out infinite;
  }
  .nuvi-expr-celebrating .nuvi-c-arm-right {
    opacity: 1;
    animation: nuvi-expr-arm-celebrate-right 0.6s ease-in-out infinite;
  }

  /* === EXPRESSION KEYFRAMES === */
  @keyframes nuvi-expr-bounce {
    0%, 100% { transform: translateY(0) scale(1); }
    50%      { transform: translateY(-6px) scale(1.05); }
  }
  @keyframes nuvi-expr-mouth-pulse {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.1); }
  }
  @keyframes nuvi-expr-arm-wave-left {
    0%, 100% { transform: rotate(-110deg) translate(0, -25px); }
    50%      { transform: rotate(-130deg) translate(0, -30px); }
  }
  @keyframes nuvi-expr-arm-wave-right {
    0%, 100% { transform: rotate(110deg) translate(0, -25px); }
    50%      { transform: rotate(130deg) translate(0, -30px); }
  }
  @keyframes nuvi-expr-tear-drop {
    0%, 100% { opacity: 0; transform: translateY(0); }
    20%      { opacity: 1; transform: translateY(0); }
    80%      { opacity: 1; transform: translateY(20px); }
  }
  @keyframes nuvi-expr-sursaut {
    0%, 100% { transform: scale(1); }
    10%      { transform: scale(1.15) translateY(-4px); }
    20%      { transform: scale(0.95); }
  }
  @keyframes nuvi-expr-shake {
    0%, 100% { transform: translateX(0); }
    25%      { transform: translateX(-2px); }
    75%      { transform: translateX(2px); }
  }
  @keyframes nuvi-expr-fist-shake {
    0%, 100% { transform: rotate(-30deg) translate(-5px, 0); }
    50%      { transform: rotate(-30deg) translate(-5px, -3px); }
  }
  @keyframes nuvi-expr-tremble {
    0%, 100% { transform: translate(0, 0); }
    25%      { transform: translate(-1px, 1px); }
    50%      { transform: translate(1px, -1px); }
    75%      { transform: translate(-1px, -1px); }
  }
  @keyframes nuvi-expr-pupil-tremble {
    0%, 100% { transform: translate(0, 0); }
    25%      { transform: translate(-2px, 1px); }
    50%      { transform: translate(2px, -1px); }
    75%      { transform: translate(-1px, -2px); }
  }
  @keyframes nuvi-expr-love-bounce {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.04) translateY(-3px); }
  }
  @keyframes nuvi-expr-heart-beat {
    0%, 100% { transform: scale(1); }
    20%      { transform: scale(1.2); }
    40%      { transform: scale(1); }
    60%      { transform: scale(1.15); }
  }
  @keyframes nuvi-expr-yawn {
    0%, 90%, 100% { transform: scale(1); }
    93%, 97%      { transform: scale(1.08, 0.92); }
  }
  @keyframes nuvi-expr-yawn-mouth {
    0%, 90%, 100% { transform: scale(0.5); }
    93%, 97%      { transform: scale(1.5); }
  }
  @keyframes nuvi-expr-proud-pose {
    0%, 100% { transform: scale(1) translateY(0); }
    50%      { transform: scale(1.06) translateY(-4px); }
  }
  @keyframes nuvi-expr-think-look {
    0%, 100% { transform: translate(0, 0); }
    25%      { transform: translate(-6px, -3px); }
    50%      { transform: translate(0, 0); }
    75%      { transform: translate(6px, -3px); }
  }
  @keyframes nuvi-expr-think-eyebrow {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    25%      { transform: translateY(-3px) rotate(-2deg); }
    75%      { transform: translateY(-3px) rotate(2deg); }
  }
  @keyframes nuvi-expr-chin-tap {
    0%, 100% { transform: rotate(-110deg) translate(20px, -45px); }
    50%      { transform: rotate(-110deg) translate(20px, -50px); }
  }
  @keyframes nuvi-expr-wink-cycle {
    0%, 35%, 100% { transform: scaleY(1); }
    40%, 60%      { transform: scaleY(0.08); }
    65%           { transform: scaleY(1); }
  }
  @keyframes nuvi-expr-wink-pupil {
    0%, 35%, 100% { opacity: 1; }
    40%, 60%      { opacity: 0; }
    65%           { opacity: 1; }
  }
  @keyframes nuvi-expr-wink-eyebrow {
    0%, 35%, 100% { transform: translateY(0); }
    40%, 60%      { transform: translateY(-3px) rotate(-3deg); }
    65%           { transform: translateY(0); }
  }
  @keyframes nuvi-expr-laugh-shake {
    0%, 100% { transform: translateY(0) scale(1); }
    25%      { transform: translateY(-2px) scale(1.02); }
    75%      { transform: translateY(2px) scale(0.98); }
  }
  @keyframes nuvi-expr-laugh-mouth {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.1); }
  }
  @keyframes nuvi-expr-curious-eyebrow {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-5px) rotate(2deg); }
  }
  @keyframes nuvi-expr-curious-pupil {
    0%, 100% { transform: translate(0, 0) scale(1); }
    25%      { transform: translate(-3px, 0) scale(1); }
    50%      { transform: translate(0, 0) scale(1.1); }
    75%      { transform: translate(3px, 0) scale(1); }
  }
  @keyframes nuvi-expr-zen-breathe {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.04); }
  }
  @keyframes nuvi-expr-celebrate-bounce {
    0%, 100% { transform: translateY(0) scale(1); }
    25%      { transform: translateY(-8px) scale(1.05); }
    50%      { transform: translateY(0) scale(1); }
    75%      { transform: translateY(-6px) scale(1.04); }
  }
  @keyframes nuvi-expr-arm-celebrate-left {
    0%, 100% { transform: rotate(-130deg) translate(-5px, -25px); }
    50%      { transform: rotate(-150deg) translate(-10px, -30px); }
  }
  @keyframes nuvi-expr-arm-celebrate-right {
    0%, 100% { transform: rotate(130deg) translate(5px, -25px); }
    50%      { transform: rotate(150deg) translate(10px, -30px); }
  }
  @keyframes nuvi-expr-stars-twinkle {
    0%, 100% { opacity: 0.4; transform: scale(0.8); }
    50%      { opacity: 1; transform: scale(1.2); }
  }

  /* =================================================================
     ACCESSIBILITY
     ================================================================= */
  @media (prefers-reduced-motion: reduce) {
    .nuvi-companion,
    .nuvi-eye-3d,
    .nuvi-c-body,
    .nuvi-c-iris,
    .nuvi-c-pupil,
    .nuvi-c-pupil-group,
    .nuvi-c-highlight-1,
    .nuvi-c-highlight-2,
    .nuvi-c-eyebrow,
    .nuvi-c-eyebrow-2,
    .nuvi-c-eye-inner,
    .nuvi-c-heart,
    .nuvi-c-tongue,
    .nuvi-c-tear,
    .nuvi-c-closed-eye,
    .nuvi-c-stars,
    .nuvi-c-star-eye,
    .nuvi-c-mouth,
    .nuvi-c-mouth-o,
    .nuvi-c-mouth-smile,
    .nuvi-c-arm-left,
    .nuvi-c-arm-right,
    .nuvi-toupie-shadow {
      animation: none !important;
    }
  }
`;
