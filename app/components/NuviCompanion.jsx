"use client";

import React, { useState, useEffect, useRef } from 'react';

/**
 * NuviCompanion v17 (was v16) - Mains Mickey (un seul trace) sur arm-left / arm-right
 *
 * Changes vs v16 :
 *   - Les deux "moignons" (ellipses au bout des bras) sont remplaces par une vraie
 *     main facon gant cartoon (3 doigts + pouce), dessinee en UN SEUL path continu,
 *     contour coral fin (1.5), soudee au poignet, taille reduite.
 *   - Aucun autre changement : oeil, corps, sourcil, expressions, gags, CSS intacts.
 *   - Les mains restent dans les groupes .arm-left / .arm-right donc elles heritent
 *     automatiquement de toutes les animations de bras existantes (joy, love, etc.).
 *
 * Props:
 *   mode: 'idle' | 'appearing' | 'speaking' | 'loading' | 'walking' | 'monocycle' | 'expression'
 *   expression: 'joy' | 'sad' | 'surprised' | ... | 'wizard' (utilise quand mode='expression')
 *   followCursor: bool
 *   breathing: bool
 *   size: number en px
 *   coachOrigin: {x, y} pour mode 'appearing'
 *   animated: bool
 */

const EXPRESSIONS = [
  'joy', 'sad', 'surprised', 'angry', 'scared', 'love', 'focus',
  'tired', 'proud', 'thinking', 'wink', 'laughing', 'curious', 'zen', 'celebrating',
  'cheshire', 'monocle', 'wizard'
];

const VALID_MODES = [
  'idle', 'appearing', 'speaking', 'loading', 'walking', 'monocycle', 'expression'
];

const EXPRESSION_AUTO_CLEANUP_MS = 4500;

const IDLE_SCHEDULE = [
  { start: 0,     end: 9000,  gag: null },
  { start: 9000,  end: 13000, gag: 'wink' },
  { start: 13000, end: 18000, gag: null },
  { start: 18000, end: 24000, gag: 'heart-eyes' },
  { start: 24000, end: 27000, gag: null },
  { start: 27000, end: 31000, gag: 'raspberry' },
  { start: 31000, end: 35000, gag: null },
  { start: 35000, end: 40000, gag: 'bounce' },
  { start: 40000, end: 43000, gag: null },
  { start: 43000, end: 48000, gag: 'dizzy' },
  { start: 48000, end: 50000, gag: null },
  { start: 50000, end: 54000, gag: 'pop' },
  { start: 54000, end: 55000, gag: null },
  { start: 55000, end: 60000, gag: 'faint' },
];

export default function NuviCompanion({
  mode = 'idle',
  expression = null,
  followCursor = false,
  breathing = true,
  size = 56,
  coachOrigin = { x: 85, y: 85 },
  animated = true,
}) {
  const safeMode = VALID_MODES.indexOf(mode) >= 0 ? mode : 'idle';

  const validExpression = (expression && EXPRESSIONS.indexOf(expression) >= 0)
    ? expression : null;

  const [localExpression, setLocalExpression] = useState(validExpression);

  useEffect(() => {
    setLocalExpression(validExpression);
    if (validExpression) {
      const timer = setTimeout(() => {
        setLocalExpression(null);
      }, EXPRESSION_AUTO_CLEANUP_MS);
      return () => clearTimeout(timer);
    }
  }, [validExpression]);

  const effectiveMode = (safeMode === 'expression' && !localExpression)
    ? 'idle'
    : safeMode;
  const effectiveExpression = (effectiveMode === 'expression') ? localExpression : null;
  const isExpression = effectiveMode === 'expression' && effectiveExpression;

  const containerRef = useRef(null);
  const [currentGag, setCurrentGag] = useState(null);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const startTimeRef = useRef(Date.now());
  const rafRef = useRef(null);

  useEffect(() => {
    if (effectiveMode !== 'idle' || !animated) {
      setCurrentGag(null);
      return;
    }
    startTimeRef.current = Date.now();
    const tick = () => {
      const elapsed = (Date.now() - startTimeRef.current) % 60000;
      const segment = IDLE_SCHEDULE.find(s => elapsed >= s.start && elapsed < s.end);
      const newGag = segment ? segment.gag : null;
      setCurrentGag(newGag);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [effectiveMode, animated]);

  useEffect(() => {
    if (!followCursor || effectiveMode === 'loading' || isExpression) {
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
      const maxOffset = 8;
      if (distance < 5) { setPupilOffset({ x: 0, y: 0 }); return; }
      const ratio = Math.min(maxOffset / distance, maxOffset / 200);
      setPupilOffset({ x: dx * ratio, y: dy * ratio });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [followCursor, effectiveMode, isExpression]);

  const gagClass = currentGag ? ` gag-${currentGag}` : '';
  const modeClass = ` nuvi-mode-${effectiveMode}`;
  const exprClass = isExpression ? ` nuvi-expr-${effectiveExpression}` : '';
  const breathingClass = breathing ? ' nuvi-breathing' : '';
  const followClass = followCursor ? ' nuvi-follow' : '';

  const pupilStyle = followCursor && !currentGag && !isExpression && effectiveMode === 'idle'
    ? { transform: `translate(${pupilOffset.x}px, ${pupilOffset.y}px)` }
    : {};

  return (
    <>
      <style>{nuviV16Styles({ coachOrigin })}</style>
      <div
        ref={containerRef}
        className={`nuvi-companion${modeClass}${exprClass}${gagClass}${breathingClass}${followClass}`}
        style={{ width: size, height: size }}
        aria-label="Nuvi"
        role="img"
      >
        <CompanionSVG pupilStyle={pupilStyle} />
      </div>
    </>
  );
}

function CompanionSVG({ pupilStyle = {} }) {
  return (
    <svg className="nuvi-svg" viewBox="-30 -50 240 280" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="nuvi-body-grad" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#FFFCF7" />
          <stop offset="55%" stopColor="#FAF1ED" />
          <stop offset="100%" stopColor="#E5C9B8" />
        </radialGradient>
        <radialGradient id="nuvi-iris-grad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#9d7fe0" />
          <stop offset="60%" stopColor="#6d3fc4" />
          <stop offset="100%" stopColor="#5631a3" />
        </radialGradient>
        <radialGradient id="nuvi-star-grad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFE680" />
          <stop offset="50%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FFA500" />
        </radialGradient>
        <radialGradient id="nuvi-heart-grad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FF8FA3" />
          <stop offset="60%" stopColor="#E73C5E" />
          <stop offset="100%" stopColor="#C42847" />
        </radialGradient>
        <radialGradient id="nuvi-arm-grad" cx="40%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FFFCF7" />
          <stop offset="50%" stopColor="#FAF1ED" />
          <stop offset="100%" stopColor="#D4B3A1" />
        </radialGradient>
      </defs>

      <g className="nuvi-everything">
        {/* === BRAS GAUCHE (main Mickey, un seul trace) === */}
        <g className="arm-left">
          <path
            d="M 30 105 Q 13 117, 4 134 Q -1 144, 2 152"
            fill="none" stroke="url(#nuvi-arm-grad)" strokeWidth="13" strokeLinecap="round" opacity="0.95"
          />
          <path
            d="M 9 154 Q 11 144, 9 142 Q 6 141, 5 144 L 5 150 Q 4 142, 1 141 Q -2 142, -2 145 L -2 150 Q -4 144, -7 144 Q -9 145, -8 150 L -8 153 Q -12 152, -14 156 Q -16 161, -12 164 Q -8 168, 0 167 Q 9 166, 11 159 Z"
            fill="url(#nuvi-arm-grad)" stroke="#c25b3f" strokeWidth="1.5" strokeLinejoin="round"
          />
        </g>

        {/* === BRAS DROIT (main Mickey, un seul trace) === */}
        <g className="arm-right">
          <path
            d="M 150 105 Q 167 117, 176 134 Q 181 144, 178 152"
            fill="none" stroke="url(#nuvi-arm-grad)" strokeWidth="13" strokeLinecap="round" opacity="0.95"
          />
          <path
            d="M 171 154 Q 169 144, 171 142 Q 174 141, 175 144 L 175 150 Q 176 142, 179 141 Q 182 142, 182 145 L 182 150 Q 184 144, 187 144 Q 189 145, 188 150 L 188 153 Q 192 152, 194 156 Q 196 161, 192 164 Q 188 168, 180 167 Q 171 166, 169 159 Z"
            fill="url(#nuvi-arm-grad)" stroke="#c25b3f" strokeWidth="1.5" strokeLinejoin="round"
          />
        </g>

        {/* Body */}
        <path
          d="M 90 28 C 128 30, 160 56, 162 92 C 163 128, 132 158, 88 156 C 44 154, 16 126, 18 88 C 20 54, 52 28, 90 28 Z"
          fill="url(#nuvi-body-grad)" stroke="#c25b3f" strokeWidth="2" strokeLinejoin="round"
        />
        {/* Sourcil */}
        <path className="eyebrow" d="M 52 50 Q 90 36, 130 52"
              fill="none" stroke="#6d3fc4" strokeWidth="6" strokeLinecap="round"/>
        {/* Sourcil 2 (angry) */}
        <path className="eyebrow-angry" d="M 130 52 Q 90 36, 52 50"
              fill="none" stroke="#c0392b" strokeWidth="6" strokeLinecap="round"/>
        {/* Iris + pupille */}
        <g className="iris-pupil-grp">
          <ellipse cx="90" cy="91" rx="32" ry="31" fill="url(#nuvi-iris-grad)"/>
          <g className="pupil-group" style={pupilStyle}>
            <circle cx="92" cy="89" r="7" fill="#1a1a1a"/>
            <ellipse cx="98" cy="79" rx="6" ry="5" fill="#fbf6ee"/>
            <circle cx="83" cy="98" r="2.5" fill="#fbf6ee" opacity="0.6"/>
          </g>
        </g>
        {/* Heart-eyes */}
        <g className="heart-eyes-grp">
          <path d="M 63 80 C 55 71, 41 75, 41 86 C 41 96, 55 106, 63 113 C 71 106, 85 96, 85 86 C 85 75, 71 71, 63 80 Z"
                fill="url(#nuvi-heart-grad)" stroke="#A6243F" strokeWidth="1.5"/>
          <path d="M 117 80 C 109 71, 95 75, 95 86 C 95 96, 109 106, 117 113 C 125 106, 139 96, 139 86 C 139 75, 125 71, 117 80 Z"
                fill="url(#nuvi-heart-grad)" stroke="#A6243F" strokeWidth="1.5"/>
        </g>
        {/* Heart big (love expr) */}
        <path className="heart-big"
              d="M 90 78 C 78 64, 60 70, 60 86 C 60 100, 78 116, 90 124 C 102 116, 120 100, 120 86 C 120 70, 102 64, 90 78 Z"
              fill="#E0789C"/>
        {/* Tear (sad) */}
        <path className="tear"
              d="M 92 105 Q 88 120, 92 130 Q 96 120, 92 105 Z" fill="#5b9fd9"/>
        {/* Yeux fermes (raspberry, laughing, zen, wink) */}
        <g className="closed-eyes-grp">
          <path d="M 60 85 Q 75 75, 90 85" fill="none" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="round"/>
          <path d="M 90 85 Q 105 75, 120 85" fill="none" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="round"/>
        </g>
        {/* Mouth simple smile */}
        <path className="mouth-smile"
              d="M 75 130 Q 90 138, 105 130" fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round"/>
        {/* Mouth filled smile (joy) */}
        <path className="mouth-filled-smile"
              d="M 65 125 Q 90 152, 115 125 Q 110 140, 90 142 Q 70 140, 65 125 Z" fill="#1a1a1a"/>
        {/* Grande bouche raspberry */}
        <g className="mouth-grand-grp">
          <path d="M 60 120 Q 90 145, 120 120 Q 115 138, 90 142 Q 65 138, 60 120 Z"
                fill="#1a1a1a" stroke="#1a1a1a" strokeWidth="1.5" strokeLinejoin="round"/>
        </g>
        {/* Langue */}
        <g className="tongue-grp">
          <path d="M 75 135 Q 75 158, 85 165 Q 90 168, 95 165 Q 105 158, 105 135 Q 95 142, 90 142 Q 85 142, 75 135 Z"
                fill="#FF6F8A" stroke="#D14C6A" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M 90 145 L 90 162" stroke="#D14C6A" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
        </g>
        {/* Bouche O (surprise / pop) */}
        <g className="mouth-o-grp">
          <ellipse cx="90" cy="139" rx="11" ry="10" fill="#4A1424" stroke="#1a1a1a" strokeWidth="2"/>
          <ellipse cx="90" cy="145" rx="6" ry="2.5" fill="#FF6F8A" stroke="#D14C6A" strokeWidth="0.8"/>
        </g>
        {/* Yeux X */}
        <g className="x-eyes-grp">
          <line x1="75" y1="76" x2="105" y2="106" stroke="#1a1a1a" strokeWidth="5" strokeLinecap="round"/>
          <line x1="105" y1="76" x2="75" y2="106" stroke="#1a1a1a" strokeWidth="5" strokeLinecap="round"/>
        </g>
        {/* Stars (celebrating) */}
        <g className="stars-grp">
          <circle cx="40" cy="55" r="3" fill="#FFD700"/>
          <circle cx="140" cy="55" r="3" fill="#FFD700"/>
          <circle cx="35" cy="120" r="2" fill="#FFD700"/>
          <circle cx="145" cy="120" r="2" fill="#FFD700"/>
        </g>
        {/* CHESHIRE SMILE */}
        <g className="cheshire-smile-grp">
          <path d="M 45 110 Q 90 165, 135 110 Q 130 155, 90 158 Q 50 155, 45 110 Z"
                fill="white" stroke="#1a1a1a" strokeWidth="2" strokeLinejoin="round"/>
          <line x1="65" y1="125" x2="65" y2="140" stroke="#1a1a1a" strokeWidth="1.5"/>
          <line x1="78" y1="130" x2="78" y2="148" stroke="#1a1a1a" strokeWidth="1.5"/>
          <line x1="90" y1="132" x2="90" y2="152" stroke="#1a1a1a" strokeWidth="1.5"/>
          <line x1="102" y1="130" x2="102" y2="148" stroke="#1a1a1a" strokeWidth="1.5"/>
          <line x1="115" y1="125" x2="115" y2="140" stroke="#1a1a1a" strokeWidth="1.5"/>
        </g>
        {/* MONOCLE */}
        <g className="monocle-grp">
          <circle cx="120" cy="82" r="18" fill="none" stroke="#1a1a1a" strokeWidth="4"/>
          <circle cx="120" cy="82" r="14" fill="#6d3fc4" fillOpacity="0.05"/>
          <ellipse cx="113" cy="74" rx="3" ry="2" fill="white" opacity="0.6"/>
          <line x1="138" y1="82" x2="160" y2="120" stroke="#1a1a1a" strokeWidth="1.5"/>
        </g>
        {/* WIZARD HAT */}
        <g className="wizard-grp">
          <path d="M 90 -30 L 50 28 L 130 28 Z" fill="#5b3df5" stroke="#1a1a1a" strokeWidth="2"/>
          <ellipse cx="90" cy="28" rx="48" ry="8" fill="#7c5cf9" stroke="#1a1a1a" strokeWidth="2"/>
          <path d="M 65 14 L 115 14 L 113 22 L 67 22 Z" fill="#b91c8c"/>
          <text x="90" y="2" fontSize="22" fill="gold" textAnchor="middle" stroke="#1a1a1a" strokeWidth="0.5">★</text>
        </g>
        {/* Walking arms (croises dans le dos) */}
        <g className="walking-arms-grp">
          <path d="M 25 110 Q 50 125, 90 132 Q 60 118, 35 105"
                fill="none" stroke="url(#nuvi-arm-grad)" strokeWidth="10" strokeLinecap="round" opacity="0.55"/>
          <path d="M 155 110 Q 130 125, 90 132 Q 120 118, 145 105"
                fill="none" stroke="url(#nuvi-arm-grad)" strokeWidth="10" strokeLinecap="round" opacity="0.55"/>
        </g>
        {/* Monocycle */}
        <g className="monocycle-grp">
          <line x1="90" y1="156" x2="90" y2="180" stroke="#1a1a1a" strokeWidth="3"/>
          <ellipse cx="90" cy="180" rx="15" ry="3" fill="#1a1a1a"/>
          <g className="monocycle-wheel">
            <circle cx="90" cy="210" r="28" fill="white" stroke="#1a1a1a" strokeWidth="4"/>
            <line x1="90" y1="184" x2="90" y2="238" stroke="#1a1a1a" strokeWidth="2"/>
            <line x1="62" y1="210" x2="118" y2="210" stroke="#1a1a1a" strokeWidth="2"/>
            <line x1="71" y1="192" x2="109" y2="228" stroke="#1a1a1a" strokeWidth="1.5"/>
            <line x1="71" y1="228" x2="109" y2="192" stroke="#1a1a1a" strokeWidth="1.5"/>
            <circle cx="90" cy="210" r="4" fill="#1a1a1a"/>
          </g>
        </g>
        {/* Couronne 5 etoiles (faint) */}
        <g className="faint-crown-grp">
          <g className="star-wrap star-A"><g className="star-inner">
            <polygon points="0,-12 4,-4 12,-4 6,2 8,11 0,6 -8,11 -6,2 -12,-4 -4,-4"
                     fill="url(#nuvi-star-grad)" stroke="#FF8800" strokeWidth="1.5" strokeLinejoin="round"/>
          </g></g>
          <g className="star-wrap star-B"><g className="star-inner">
            <polygon points="0,-12 4,-4 12,-4 6,2 8,11 0,6 -8,11 -6,2 -12,-4 -4,-4"
                     fill="url(#nuvi-star-grad)" stroke="#FF8800" strokeWidth="1.5" strokeLinejoin="round"/>
          </g></g>
          <g className="star-wrap star-C"><g className="star-inner">
            <polygon points="0,-12 4,-4 12,-4 6,2 8,11 0,6 -8,11 -6,2 -12,-4 -4,-4"
                     fill="url(#nuvi-star-grad)" stroke="#FF8800" strokeWidth="1.5" strokeLinejoin="round"/>
          </g></g>
          <g className="star-wrap star-D"><g className="star-inner">
            <polygon points="0,-12 4,-4 12,-4 6,2 8,11 0,6 -8,11 -6,2 -12,-4 -4,-4"
                     fill="url(#nuvi-star-grad)" stroke="#FF8800" strokeWidth="1.5" strokeLinejoin="round"/>
          </g></g>
          <g className="star-wrap star-E"><g className="star-inner">
            <polygon points="0,-12 4,-4 12,-4 6,2 8,11 0,6 -8,11 -6,2 -12,-4 -4,-4"
                     fill="url(#nuvi-star-grad)" stroke="#FF8800" strokeWidth="1.5" strokeLinejoin="round"/>
          </g></g>
        </g>
      </g>
    </svg>
  );
}

const nuviV16Styles = ({ coachOrigin }) => `
  .nuvi-companion {
    display: inline-block;
    position: relative;
    user-select: none;
  }
  .nuvi-companion .nuvi-svg {
    width: 100%;
    height: 100%;
    overflow: visible;
    display: block;
    shape-rendering: geometricPrecision;
    filter: drop-shadow(0 2px 8px rgba(0,0,0,0.08));
  }

  /* Cache par defaut tous les elements optionnels */
  .nuvi-svg .heart-eyes-grp,
  .nuvi-svg .tongue-grp,
  .nuvi-svg .mouth-grand-grp,
  .nuvi-svg .closed-eyes-grp,
  .nuvi-svg .mouth-o-grp,
  .nuvi-svg .x-eyes-grp,
  .nuvi-svg .faint-crown-grp,
  .nuvi-svg .heart-big,
  .nuvi-svg .tear,
  .nuvi-svg .mouth-smile,
  .nuvi-svg .mouth-filled-smile,
  .nuvi-svg .stars-grp,
  .nuvi-svg .eyebrow-angry,
  .nuvi-svg .arm-left,
  .nuvi-svg .arm-right,
  .nuvi-svg .cheshire-smile-grp,
  .nuvi-svg .monocle-grp,
  .nuvi-svg .wizard-grp,
  .nuvi-svg .walking-arms-grp,
  .nuvi-svg .monocycle-grp { opacity: 0; }

  /* === BREATHING === */
  .nuvi-breathing .nuvi-everything {
    animation: breathe 4s ease-in-out infinite;
  }
  @keyframes breathe {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.025); }
  }

  /* === MODE IDLE - oeil vivant par defaut === */
  .nuvi-mode-idle .iris-pupil-grp {
    animation: irisPulseAlive 4s ease-in-out infinite;
    transform-origin: 90px 91px;
    transform-box: view-box;
  }
  .nuvi-mode-idle .iris-pupil-grp .pupil-group {
    animation: pupilCameraSearch 6s ease-in-out infinite;
    transform-origin: 92px 89px;
    transform-box: view-box;
  }
  @keyframes irisPulseAlive {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.04); }
  }
  @keyframes pupilCameraSearch {
    0%, 5%   { transform: translate(0, 0); }
    10%, 20% { transform: translate(5px, 0); }
    30%, 40% { transform: translate(-5px, 0); }
    50%, 60% { transform: translate(0, -3px); }
    70%, 80% { transform: translate(0, 4px); }
    90%, 100% { transform: translate(0, 0); }
  }

  /* === GAG WINK === */
  .gag-wink .iris-pupil-grp {
    animation: winkBlink 2s ease-in-out;
    transform-origin: 90px 91px;
  }
  .gag-wink .eyebrow {
    animation: winkEyebrow 2s ease-in-out;
    transform-origin: 90px 50px;
  }
  @keyframes winkBlink {
    0%, 60%, 100% { transform: scaleY(1); }
    70%, 80%      { transform: scaleY(0.08); }
    90%           { transform: scaleY(1); }
  }
  @keyframes winkEyebrow {
    0%, 60%, 100% { transform: translateY(0) rotate(0deg); }
    70%, 80%      { transform: translateY(2px) rotate(-3deg); }
  }

  /* === GAG HEART-EYES === */
  .gag-heart-eyes .iris-pupil-grp { opacity: 0 !important; animation: none; }
  .gag-heart-eyes .heart-eyes-grp {
    opacity: 1;
    animation: heartPulse 1s ease-in-out infinite;
    transform-origin: 90px 91px;
  }
  .gag-heart-eyes .eyebrow { transform: translateY(-6px); }
  @keyframes heartPulse {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.1); }
  }

  /* === GAG RASPBERRY === */
  .gag-raspberry .iris-pupil-grp { opacity: 0 !important; animation: none; }
  .gag-raspberry .closed-eyes-grp { opacity: 1; }
  .gag-raspberry .mouth-grand-grp { opacity: 1; }
  .gag-raspberry .tongue-grp {
    opacity: 1;
    animation: tongueWiggle 0.6s ease-in-out infinite;
    transform-origin: 90px 135px;
    transform-box: view-box;
  }
  .gag-raspberry .eyebrow { transform: translateY(2px) scaleX(0.9); }
  @keyframes tongueWiggle {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    25%      { transform: translateY(2px) rotate(-4deg) scaleY(1.05); }
    50%      { transform: translateY(0) rotate(0deg); }
    75%      { transform: translateY(2px) rotate(4deg) scaleY(1.05); }
  }

  /* === GAG BOUNCE === */
  .gag-bounce .nuvi-everything {
    animation: bounceBody 1.5s ease-in-out !important;
    transform-origin: 90px 156px;
  }
  @keyframes bounceBody {
    0%, 5%   { transform: translateY(0) scale(1); }
    10%      { transform: translateY(5px) scale(1.15, 0.8); }
    20%      { transform: translateY(-50px) scale(0.85, 1.2); }
    30%      { transform: translateY(0) scale(1.1, 0.9); }
    35%      { transform: translateY(5px) scale(1.15, 0.85); }
    45%      { transform: translateY(-30px) scale(0.9, 1.1); }
    55%      { transform: translateY(0) scale(1.05, 0.95); }
    70%, 100% { transform: translateY(0) scale(1); }
  }

  /* === GAG DIZZY === */
  .gag-dizzy .nuvi-everything {
    animation: dizzyWobble 2s linear infinite !important;
    transform-origin: 90px 156px;
  }
  .gag-dizzy .iris-pupil-grp {
    animation: dizzySpiral 1.5s linear infinite !important;
    transform-origin: 90px 91px;
  }
  @keyframes dizzyWobble {
    0%, 100%  { transform: rotate(0deg); }
    6.25%     { transform: rotate(-3deg); }
    12.5%     { transform: rotate(-7deg); }
    18.75%    { transform: rotate(-9.5deg); }
    25%       { transform: rotate(-10deg); }
    31.25%    { transform: rotate(-9.5deg); }
    37.5%     { transform: rotate(-7deg); }
    43.75%    { transform: rotate(-3deg); }
    50%       { transform: rotate(0deg); }
    56.25%    { transform: rotate(3deg); }
    62.5%     { transform: rotate(7deg); }
    68.75%    { transform: rotate(9.5deg); }
    75%       { transform: rotate(10deg); }
    81.25%    { transform: rotate(9.5deg); }
    87.5%     { transform: rotate(7deg); }
    93.75%    { transform: rotate(3deg); }
  }
  @keyframes dizzySpiral {
    0%   { transform: translate(0, 0); }
    25%  { transform: translate(8px, -5px); }
    50%  { transform: translate(0, 6px); }
    75%  { transform: translate(-8px, -5px); }
    100% { transform: translate(0, 0); }
  }

  /* === GAG POP-UP === */
  .gag-pop .nuvi-everything {
    animation: popBody 3s ease-in-out !important;
    transform-origin: 90px 156px;
  }
  .gag-pop .mouth-o-grp {
    opacity: 1;
    animation: popMouth 3s ease-in-out;
    transform-origin: 90px 139px;
    transform-box: view-box;
  }
  .gag-pop .eyebrow {
    animation: popEyebrow 3s ease-in-out;
    transform-origin: 90px 50px;
  }
  .gag-pop .iris-pupil-grp {
    animation: popIrisScale 3s ease-in-out !important;
    transform-origin: 90px 91px;
  }
  @keyframes popBody {
    0%, 20% { transform: translateY(0) scale(1); }
    25%     { transform: translateY(5px) scale(0.95, 1.05); }
    35%     { transform: translateY(-25px) scale(1.08, 0.95); }
    45%, 65% { transform: translateY(-10px) scale(1.03, 0.97); }
    75%, 100% { transform: translateY(0) scale(1); }
  }
  @keyframes popMouth {
    0%, 25%   { opacity: 0; transform: scale(0); }
    30%       { opacity: 0.6; transform: scale(0.7); }
    35%, 70%  { opacity: 1; transform: scale(1); }
    75%       { opacity: 0.5; transform: scale(0.8); }
    80%, 100% { opacity: 0; transform: scale(0); }
  }
  @keyframes popEyebrow {
    0%, 25%   { transform: translateY(0); }
    30%, 70%  { transform: translateY(-12px) scaleY(1.4); }
    80%, 100% { transform: translateY(0) scaleY(1); }
  }
  @keyframes popIrisScale {
    0%, 25%   { transform: scale(1); }
    30%, 70%  { transform: scale(1.15); }
    80%, 100% { transform: scale(1); }
  }

  /* === GAG FAINT === */
  .gag-faint .nuvi-everything {
    animation: faintFall 6s ease-in-out !important;
    transform-origin: 90px 156px;
  }
  .gag-faint .iris-pupil-grp { animation: faintHideEye 6s ease-in-out !important; }
  .gag-faint .x-eyes-grp { animation: faintShowX 6s ease-in-out; }
  .gag-faint .faint-crown-grp { opacity: 1; }
  .gag-faint .star-A { animation: orbit_A 6s linear; }
  .gag-faint .star-B { animation: orbit_B 6s linear; }
  .gag-faint .star-C { animation: orbit_C 6s linear; }
  .gag-faint .star-D { animation: orbit_D 6s linear; }
  .gag-faint .star-E { animation: orbit_E 6s linear; }
  .gag-faint .star-A .star-inner { animation: scaleA 6s linear; }
  .gag-faint .star-B .star-inner { animation: scaleB 6s linear; }
  .gag-faint .star-C .star-inner { animation: scaleC 6s linear; }
  .gag-faint .star-D .star-inner { animation: scaleD 6s linear; }
  .gag-faint .star-E .star-inner { animation: scaleE 6s linear; }
  .gag-faint .star-A polygon { animation: opaA 6s linear; }
  .gag-faint .star-B polygon { animation: opaB 6s linear; }
  .gag-faint .star-C polygon { animation: opaC 6s linear; }
  .gag-faint .star-D polygon { animation: opaD 6s linear; }
  .gag-faint .star-E polygon { animation: opaE 6s linear; }

  @keyframes faintFall {
    0%   { transform: rotate(0deg) translateY(0); }
    3%   { transform: rotate(-15deg); }
    12%  { transform: rotate(80deg) translateY(10px); }
    15%, 90%  { transform: rotate(90deg) translateY(15px); }
    95% { transform: rotate(40deg) translateY(5px); }
    100% { transform: rotate(0deg) translateY(0); }
  }
  @keyframes faintHideEye {
    0%, 3%   { opacity: 1; }
    12%, 92% { opacity: 0; }
    100%     { opacity: 1; }
  }
  @keyframes faintShowX {
    0%, 5%    { opacity: 0; }
    15%, 88%  { opacity: 1; }
    95%, 100% { opacity: 0; }
  }
  @keyframes orbit_A { 0%, 14% { transform: translate(145px, 5px); } 29% { transform: translate(107px, 19px); } 44% { transform: translate(46px, 14px); } 59% { transform: translate(46px, -4px); } 74% { transform: translate(107px, -9px); } 90%, 100% { transform: translate(145px, 5px); } }
  @keyframes orbit_B { 0%, 14% { transform: translate(107px, 19px); } 29% { transform: translate(46px, 14px); } 44% { transform: translate(46px, -4px); } 59% { transform: translate(107px, -9px); } 74% { transform: translate(145px, 5px); } 90%, 100% { transform: translate(107px, 19px); } }
  @keyframes orbit_C { 0%, 14% { transform: translate(46px, 14px); } 29% { transform: translate(46px, -4px); } 44% { transform: translate(107px, -9px); } 59% { transform: translate(145px, 5px); } 74% { transform: translate(107px, 19px); } 90%, 100% { transform: translate(46px, 14px); } }
  @keyframes orbit_D { 0%, 14% { transform: translate(46px, -4px); } 29% { transform: translate(107px, -9px); } 44% { transform: translate(145px, 5px); } 59% { transform: translate(107px, 19px); } 74% { transform: translate(46px, 14px); } 90%, 100% { transform: translate(46px, -4px); } }
  @keyframes orbit_E { 0%, 14% { transform: translate(107px, -9px); } 29% { transform: translate(145px, 5px); } 44% { transform: translate(107px, 19px); } 59% { transform: translate(46px, 14px); } 74% { transform: translate(46px, -4px); } 90%, 100% { transform: translate(107px, -9px); } }
  @keyframes scaleA { 0%, 14% { transform: scale(0.85); } 29% { transform: scale(0.5); } 44% { transform: scale(0.6); } 59% { transform: scale(0.85); } 74% { transform: scale(1); } 90%, 100% { transform: scale(0.85); } }
  @keyframes scaleB { 0%, 14% { transform: scale(0.5); } 29% { transform: scale(0.6); } 44% { transform: scale(0.85); } 59% { transform: scale(1); } 74% { transform: scale(0.85); } 90%, 100% { transform: scale(0.5); } }
  @keyframes scaleC { 0%, 14% { transform: scale(0.6); } 29% { transform: scale(0.85); } 44% { transform: scale(1); } 59% { transform: scale(0.85); } 74% { transform: scale(0.5); } 90%, 100% { transform: scale(0.6); } }
  @keyframes scaleD { 0%, 14% { transform: scale(0.85); } 29% { transform: scale(1); } 44% { transform: scale(0.85); } 59% { transform: scale(0.5); } 74% { transform: scale(0.6); } 90%, 100% { transform: scale(0.85); } }
  @keyframes scaleE { 0%, 14% { transform: scale(1); } 29% { transform: scale(0.85); } 44% { transform: scale(0.5); } 59% { transform: scale(0.6); } 74% { transform: scale(0.85); } 90%, 100% { transform: scale(1); } }
  @keyframes opaA { 0%, 14% { opacity: 0; } 15% { opacity: 0.85; } 29% { opacity: 0; } 44% { opacity: 0.4; } 59% { opacity: 0.85; } 74% { opacity: 1; } 90% { opacity: 0.85; } 100% { opacity: 0; } }
  @keyframes opaB { 0%, 14% { opacity: 0; } 15% { opacity: 0; } 29% { opacity: 0.4; } 44% { opacity: 0.85; } 59% { opacity: 1; } 74% { opacity: 0.85; } 90%, 100% { opacity: 0; } }
  @keyframes opaC { 0%, 14% { opacity: 0; } 15% { opacity: 0.4; } 29% { opacity: 0.85; } 44% { opacity: 1; } 59% { opacity: 0.85; } 74% { opacity: 0; } 90% { opacity: 0.4; } 100% { opacity: 0; } }
  @keyframes opaD { 0%, 14% { opacity: 0; } 15% { opacity: 0.85; } 29% { opacity: 1; } 44% { opacity: 0.85; } 59% { opacity: 0; } 74% { opacity: 0.4; } 90% { opacity: 0.85; } 100% { opacity: 0; } }
  @keyframes opaE { 0%, 14% { opacity: 0; } 15% { opacity: 1; } 29% { opacity: 0.85; } 44% { opacity: 0; } 59% { opacity: 0.4; } 74% { opacity: 0.85; } 90% { opacity: 1; } 100% { opacity: 0; } }

  /* === MODE APPEARING === */
  .nuvi-mode-appearing {
    animation: flyFromCoach 4.5s cubic-bezier(0.22, 1, 0.36, 1) infinite;
  }
  @keyframes flyFromCoach {
    0%       { transform: translate(${coachOrigin.x}px, ${coachOrigin.y}px) scale(0.1); }
    78%, 92% { transform: translate(0, 0) scale(1); }
    100%     { transform: translate(${coachOrigin.x}px, ${coachOrigin.y}px) scale(0.1); }
  }

  /* === MODE SPEAKING === */
  .nuvi-mode-speaking .nuvi-everything {
    animation: speakBob 1.6s ease-in-out infinite !important;
  }
  .nuvi-mode-speaking .eyebrow {
    animation: speakEyebrow 2.4s ease-in-out infinite;
    transform-origin: 90px 50px;
  }
  .nuvi-mode-speaking .iris-pupil-grp {
    animation: speakBlink 5s ease-in-out infinite;
    transform-origin: 90px 91px;
  }
  @keyframes speakBob {
    0%, 100% { transform: scale(1) rotate(0deg); }
    25%      { transform: scale(1.02) rotate(-1deg); }
    50%      { transform: scale(1) rotate(0deg); }
    75%      { transform: scale(1.02) rotate(1deg); }
  }
  @keyframes speakEyebrow {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    25%      { transform: translateY(-3px) rotate(-2deg); }
    50%      { transform: translateY(-4px) rotate(2deg); }
    75%      { transform: translateY(-2px) rotate(-1deg); }
  }
  @keyframes speakBlink {
    0%, 30%, 100% { transform: scaleY(1); }
    32%, 33%      { transform: scaleY(0.08); }
    34%           { transform: scaleY(1); }
    65%, 67%      { transform: scaleY(0.08); }
    68%           { transform: scaleY(1); }
  }

  /* === MODE LOADING === */
  .nuvi-mode-loading .nuvi-everything {
    animation: loadingSpin 2s linear infinite !important;
    transform-origin: 90px 91px;
  }
  @keyframes loadingSpin {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* === MODE WALKING === */
  .nuvi-mode-walking {
    animation: walkingSway 6s ease-in-out infinite;
  }
  .nuvi-mode-walking .walking-arms-grp { opacity: 1; }
  .nuvi-mode-walking .nuvi-everything {
    animation: walkingBob 0.6s ease-in-out infinite !important;
  }
  .nuvi-mode-walking .mouth-smile { opacity: 1; transform: scaleX(0.6); }
  @keyframes walkingSway {
    0%, 100% { transform: translateX(-12px); }
    45%      { transform: translateX(12px); }
    50%      { transform: translateX(12px) scaleX(-1); }
    95%      { transform: translateX(-12px) scaleX(-1); }
  }
  @keyframes walkingBob {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-3px); }
  }

  /* === MODE MONOCYCLE === */
  .nuvi-mode-monocycle {
    animation: monoRoll 5s linear infinite;
  }
  .nuvi-mode-monocycle .monocycle-grp { opacity: 1; }
  .nuvi-mode-monocycle .monocycle-wheel {
    animation: monoSpin 0.4s linear infinite;
    transform-origin: 90px 210px;
  }
  .nuvi-mode-monocycle .nuvi-everything {
    animation: monoWobble 0.4s ease-in-out infinite !important;
  }
  .nuvi-mode-monocycle .mouth-o-grp { opacity: 1; transform: scale(0.7); }
  .nuvi-mode-monocycle .arm-left { opacity: 1; transform: rotate(-60deg) translate(0, -25px); }
  .nuvi-mode-monocycle .arm-right { opacity: 1; transform: rotate(60deg) translate(0, -25px); }
  @keyframes monoRoll {
    0%   { transform: translateX(-200px); opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 1; }
    100% { transform: translateX(200px); opacity: 0; }
  }
  @keyframes monoSpin {
    to { transform: rotate(360deg); }
  }
  @keyframes monoWobble {
    0%, 100% { transform: translateY(0) rotate(0); }
    25%      { transform: translateY(-3px) rotate(-2deg); }
    75%      { transform: translateY(-3px) rotate(2deg); }
  }

  /* === EXPRESSIONS === */
  /* JOY */
  .nuvi-expr-joy .nuvi-everything { animation: exprBounce 1.6s ease-in-out infinite !important; }
  .nuvi-expr-joy .mouth-filled-smile { opacity: 1; }
  .nuvi-expr-joy .arm-left { opacity: 1; animation: exprArmWaveLeft 1.2s ease-in-out infinite; transform-origin: 30px 105px; }
  .nuvi-expr-joy .arm-right { opacity: 1; animation: exprArmWaveRight 1.2s ease-in-out infinite; transform-origin: 150px 105px; }
  .nuvi-expr-joy .eyebrow { transform: translateY(-4px); }
  @keyframes exprBounce { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-6px) scale(1.05); } }
  @keyframes exprArmWaveLeft { 0%, 100% { transform: rotate(-110deg) translate(0, -25px); } 50% { transform: rotate(-130deg) translate(0, -30px); } }
  @keyframes exprArmWaveRight { 0%, 100% { transform: rotate(110deg) translate(0, -25px); } 50% { transform: rotate(130deg) translate(0, -30px); } }

  /* SAD */
  .nuvi-expr-sad .iris-pupil-grp { transform: translateY(3px); }
  .nuvi-expr-sad .eyebrow { transform: translateY(2px) scaleX(0.85); }
  .nuvi-expr-sad .tear { opacity: 1; animation: tearDrop 2s ease-in-out infinite; }
  .nuvi-expr-sad .mouth-smile { opacity: 1; transform: rotate(180deg); transform-origin: 90px 134px; transform-box: view-box; }
  .nuvi-expr-sad .arm-left { opacity: 1; transform: rotate(20deg) translate(-5px, 5px); transform-origin: 30px 105px; }
  .nuvi-expr-sad .arm-right { opacity: 1; transform: rotate(-20deg) translate(5px, 5px); transform-origin: 150px 105px; }
  @keyframes tearDrop { 0%, 100% { opacity: 0; transform: translateY(0); } 20% { opacity: 1; } 80% { opacity: 1; transform: translateY(20px); } }

  /* SURPRISED */
  .nuvi-expr-surprised .nuvi-everything { animation: exprSursaut 1.8s ease-in-out infinite !important; }
  .nuvi-expr-surprised .iris-pupil-grp { transform: scale(1.3); transform-origin: 90px 91px; }
  .nuvi-expr-surprised .eyebrow { transform: translateY(-8px); }
  .nuvi-expr-surprised .mouth-o-grp { opacity: 1; }
  .nuvi-expr-surprised .arm-left { opacity: 1; transform: rotate(-45deg) translate(-10px, -5px); transform-origin: 30px 105px; }
  .nuvi-expr-surprised .arm-right { opacity: 1; transform: rotate(45deg) translate(10px, -5px); transform-origin: 150px 105px; }
  @keyframes exprSursaut { 0%, 100% { transform: scale(1); } 10% { transform: scale(1.15) translateY(-4px); } 20% { transform: scale(0.95); } }

  /* ANGRY */
  .nuvi-expr-angry .nuvi-everything { animation: exprShake 0.4s ease-in-out infinite !important; }
  .nuvi-expr-angry .eyebrow { opacity: 0; }
  .nuvi-expr-angry .eyebrow-angry { opacity: 1; transform: translateY(-2px); }
  .nuvi-expr-angry .mouth-smile { opacity: 1; transform: rotate(180deg) scaleX(0.7); stroke: #c0392b; transform-origin: 90px 134px; transform-box: view-box; }
  .nuvi-expr-angry .arm-left { opacity: 1; animation: angryFistL 0.4s ease-in-out infinite; transform-origin: 30px 105px; }
  .nuvi-expr-angry .arm-right { opacity: 1; animation: angryFistR 0.4s ease-in-out infinite; transform-origin: 150px 105px; }
  @keyframes exprShake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-2px); } 75% { transform: translateX(2px); } }
  @keyframes angryFistL { 0%, 100% { transform: rotate(-30deg) translate(-5px, 0); } 50% { transform: rotate(-30deg) translate(-5px, -3px); } }
  @keyframes angryFistR { 0%, 100% { transform: rotate(30deg) translate(5px, 0); } 50% { transform: rotate(30deg) translate(5px, -3px); } }

  /* SCARED */
  .nuvi-expr-scared .nuvi-everything { animation: exprTremble 0.15s linear infinite !important; }
  .nuvi-expr-scared .iris-pupil-grp { transform: scale(1.15); transform-origin: 90px 91px; }
  .nuvi-expr-scared .eyebrow { transform: translateY(-6px); }
  .nuvi-expr-scared .mouth-o-grp { opacity: 1; transform: scale(0.7); }
  .nuvi-expr-scared .arm-left { opacity: 1; transform: rotate(60deg) translate(0, -20px); transform-origin: 30px 105px; }
  .nuvi-expr-scared .arm-right { opacity: 1; transform: rotate(-60deg) translate(0, -20px); transform-origin: 150px 105px; }
  @keyframes exprTremble { 0%, 100% { transform: translate(0,0); } 25% { transform: translate(-1px,1px); } 50% { transform: translate(1px,-1px); } 75% { transform: translate(-1px,-1px); } }

  /* LOVE */
  .nuvi-expr-love .iris-pupil-grp { opacity: 0; }
  .nuvi-expr-love .heart-big { opacity: 1; animation: heartBeat 1s ease-in-out infinite; transform-origin: 90px 95px; transform-box: view-box; }
  .nuvi-expr-love .mouth-filled-smile { opacity: 1; transform: scale(0.7); }
  .nuvi-expr-love .arm-left { opacity: 1; transform: rotate(-80deg) translate(-5px, -15px); transform-origin: 30px 105px; }
  .nuvi-expr-love .arm-right { opacity: 1; transform: rotate(80deg) translate(5px, -15px); transform-origin: 150px 105px; }
  @keyframes heartBeat { 0%, 100% { transform: scale(1); } 20% { transform: scale(1.2); } 40% { transform: scale(1); } 60% { transform: scale(1.15); } }

  /* FOCUS */
  .nuvi-expr-focus .iris-pupil-grp { transform: scaleY(0.7); transform-origin: 90px 91px; }
  .nuvi-expr-focus .eyebrow { transform: translateY(2px) scaleX(0.85); }
  .nuvi-expr-focus .mouth-smile { opacity: 1; transform: scaleY(0.4); transform-origin: 90px 134px; transform-box: view-box; }

  /* TIRED */
  .nuvi-expr-tired .iris-pupil-grp { transform: translateY(3px) scaleY(0.5); transform-origin: 90px 91px; }
  .nuvi-expr-tired .eyebrow { transform: translateY(3px) scaleX(0.9); }
  .nuvi-expr-tired .mouth-o-grp { opacity: 1; animation: yawnMouth 4s ease-in-out infinite; }
  @keyframes yawnMouth { 0%, 90%, 100% { transform: scale(0.5); } 93%, 97% { transform: scale(1.5); } }

  /* PROUD */
  .nuvi-expr-proud .nuvi-everything { animation: exprProud 2.5s ease-in-out infinite !important; }
  .nuvi-expr-proud .eyebrow { transform: translateY(-4px); }
  .nuvi-expr-proud .mouth-filled-smile { opacity: 1; transform: scale(0.6); }
  @keyframes exprProud { 0%, 100% { transform: scale(1) translateY(0); } 50% { transform: scale(1.06) translateY(-4px); } }

  /* THINKING */
  .nuvi-expr-thinking .iris-pupil-grp .pupil-group { animation: thinkLook 3s ease-in-out infinite; }
  .nuvi-expr-thinking .eyebrow { animation: thinkEyebrow 3s ease-in-out infinite; transform-origin: 90px 50px; }
  .nuvi-expr-thinking .mouth-smile { opacity: 1; transform: scaleX(0.5); transform-origin: 90px 134px; transform-box: view-box; }
  @keyframes thinkLook { 0%, 100% { transform: translate(0,0); } 25% { transform: translate(-6px,-3px); } 50% { transform: translate(0,0); } 75% { transform: translate(6px,-3px); } }
  @keyframes thinkEyebrow { 0%, 100% { transform: translateY(0) rotate(0); } 25% { transform: translateY(-3px) rotate(-2deg); } 75% { transform: translateY(-3px) rotate(2deg); } }

  /* WINK (expression, pas idle gag) */
  .nuvi-expr-wink .iris-pupil-grp { animation: exprWink 3s ease-in-out infinite; transform-origin: 90px 91px; }
  .nuvi-expr-wink .mouth-filled-smile { opacity: 1; transform: scale(0.5) translateX(8px); }
  @keyframes exprWink { 0%, 35%, 100% { transform: scaleY(1); } 40%, 60% { transform: scaleY(0.08); } 65% { transform: scaleY(1); } }

  /* LAUGHING */
  .nuvi-expr-laughing .nuvi-everything { animation: laughShake 0.4s ease-in-out infinite !important; }
  .nuvi-expr-laughing .iris-pupil-grp { opacity: 0; }
  .nuvi-expr-laughing .closed-eyes-grp { opacity: 1; }
  .nuvi-expr-laughing .mouth-filled-smile { opacity: 1; animation: laughMouth 0.4s ease-in-out infinite; }
  @keyframes laughShake { 0%, 100% { transform: translateY(0) scale(1); } 25% { transform: translateY(-2px) scale(1.02); } 75% { transform: translateY(2px) scale(0.98); } }
  @keyframes laughMouth { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }

  /* CURIOUS */
  .nuvi-expr-curious .iris-pupil-grp { transform: scale(1.2); transform-origin: 90px 91px; }
  .nuvi-expr-curious .eyebrow { animation: curiousEyebrow 2s ease-in-out infinite; transform-origin: 90px 50px; }
  .nuvi-expr-curious .mouth-smile { opacity: 1; transform: scaleX(0.4); transform-origin: 90px 134px; transform-box: view-box; }
  @keyframes curiousEyebrow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px) rotate(2deg); } }

  /* ZEN */
  .nuvi-expr-zen .nuvi-everything { animation: zenBreathe 5s ease-in-out infinite !important; }
  .nuvi-expr-zen .iris-pupil-grp { opacity: 0; }
  .nuvi-expr-zen .closed-eyes-grp { opacity: 1; stroke: #5b3df5; }
  .nuvi-expr-zen .eyebrow { transform: translateY(2px); }
  .nuvi-expr-zen .mouth-smile { opacity: 1; transform: scaleX(0.3); transform-origin: 90px 134px; transform-box: view-box; }
  @keyframes zenBreathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }

  /* CELEBRATING */
  .nuvi-expr-celebrating .nuvi-everything { animation: celebBounce 0.8s ease-in-out infinite !important; }
  .nuvi-expr-celebrating .iris-pupil-grp { opacity: 0; }
  .nuvi-expr-celebrating .heart-big { opacity: 1; animation: heartBeat 0.6s ease-in-out infinite; }
  .nuvi-expr-celebrating .stars-grp { opacity: 1; animation: starsTwinkle 1s ease-in-out infinite; }
  .nuvi-expr-celebrating .mouth-filled-smile { opacity: 1; }
  @keyframes celebBounce { 0%, 100% { transform: translateY(0) scale(1); } 25% { transform: translateY(-8px) scale(1.05); } 50% { transform: translateY(0) scale(1); } 75% { transform: translateY(-6px) scale(1.04); } }
  @keyframes starsTwinkle { 0%, 100% { opacity: 0.4; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }

  /* CHESHIRE */
  .nuvi-expr-cheshire .iris-pupil-grp { opacity: 0; }
  .nuvi-expr-cheshire .closed-eyes-grp { opacity: 1; }
  .nuvi-expr-cheshire .cheshire-smile-grp { opacity: 1; animation: cheshirePulse 3s ease-in-out infinite; transform-origin: 90px 130px; transform-box: view-box; }
  @keyframes cheshirePulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }

  /* MONOCLE */
  .nuvi-expr-monocle .monocle-grp { opacity: 1; }
  .nuvi-expr-monocle .eyebrow { transform: translateY(-5px) rotate(-2deg); transform-origin: right center; }
  .nuvi-expr-monocle .mouth-smile { opacity: 1; transform: scaleX(0.5); transform-origin: 90px 134px; transform-box: view-box; }

  /* WIZARD */
  .nuvi-expr-wizard .wizard-grp { opacity: 1; animation: wizardWiggle 2.5s ease-in-out infinite; transform-origin: 90px 28px; transform-box: view-box; }
  .nuvi-expr-wizard .mouth-filled-smile { opacity: 1; transform: scale(0.7); }
  @keyframes wizardWiggle { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }

  @media (prefers-reduced-motion: reduce) {
    .nuvi-companion * { animation: none !important; }
  }
`;
