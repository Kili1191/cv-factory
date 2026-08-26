"use client";

import React from 'react';

/**
 * NuviLogo - Animated brand wordmark for Nuvi
 *
 * Self-contained React component with all CSS animations inlined.
 * Drop this file into your app and import it: <NuviLogo size={32} />
 *
 * CYCLE (65 seconds, 11 personalities):
 *   0-7s    : Caméléon (multi-color : iris → glow → turquoise → gold)
 *   7-15s   : Œil curieux (dot grandit, sourcil violet apparait, pupille regarde)
 *   15-20s  : Clin d'œil (dot s'écrase verticalement comme un blink)
 *   20-29s  : Bowling strike (la boule roule sur la baseline, renverse N/u/v/i)
 *   29-34s  : Balle qui rebondit (vrais grands bonds dégressifs)
 *   38-46s  : Drop & bounce (le i devient ! avec point qui tombe et rebondit)
 *   46-49s  : Météorite (le dot file en diagonale avec trail)
 *   54-62s  : Pendule (oscillation horizontale lente)
 *   62-70s  : Glitch (4 ghosts en multiply : terracotta, ocean, turquoise, gold)
 *   71-76s  : Lune dormante (lune SVG à la place du dot, avec zzz)
 *   77-83s  : Étoile (5-pointed rotative à 720°)
 *   85-91s  : Respiration finale (breathing scale)
 *
 * @param {number}  size           - Font size in pixels (default 32)
 * @param {string}  inkColor       - Color for letters and stems (default #1a1a1a)
 * @param {string}  dotColor       - Color for the iris dot (default #6d3fc4)
 * @param {string}  fontFamily     - Display font (default DM Serif Display)
 * @param {boolean} animated       - Enable animations (default true)
 * @param {number}  cycleDuration  - Animation cycle in seconds (default 65)
 */
export default function NuviLogo({
  size = 32,
  inkColor = 'var(--nuvi-ink)',
  dotColor = '#6d3fc4',
  fontFamily = "'DM Serif Display', Georgia, serif",
  animated = true,
  cycleDuration = 65,
}) {
  const animDuration = animated ? `${cycleDuration}s` : '0s';

  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <symbol id="nuvi-sleeping-moon" viewBox="0 0 100 100">
            <path d="M 65 50 A 25 25 0 1 1 65 49.5 A 18 18 0 1 0 65 50 Z" fill={dotColor} />
            <path d="M 45 47 Q 50 50 55 47" stroke="#fbf6ee" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </symbol>
          <symbol id="nuvi-real-star" viewBox="0 0 100 100">
            <polygon points="50,5 61,38 96,38 68,59 79,92 50,72 21,92 32,59 4,38 39,38" fill={dotColor} />
          </symbol>
        </defs>
      </svg>

      <style>{nuviLogoStyles({ inkColor, dotColor, fontFamily, animDuration })}</style>

      <div className="nuvi-logo" style={{ fontSize: `${size}px` }}>
        <span className="nuvi-letter nuvi-letter-N">N</span>
        <span className="nuvi-letter nuvi-letter-u">u</span>
        <span className="nuvi-letter nuvi-letter-v">v</span>
        <span className="nuvi-mark">
          <span className="nuvi-i-stem" />
          <span className="nuvi-bang-stem" />
          <span className="nuvi-trail" />
          <span className="nuvi-ghost-r" />
          <span className="nuvi-ghost-b" />
          <span className="nuvi-ghost-g" />
          <span className="nuvi-ghost-y" />
          <span className="nuvi-dot" />
          <span className="nuvi-bowling-holes" />
          <span className="nuvi-pupil" />
          <span className="nuvi-moon">
            <svg width="100%" height="100%"><use href="#nuvi-sleeping-moon" /></svg>
          </span>
          <span className="nuvi-zzz">z</span>
          <span className="nuvi-star">
            <svg width="100%" height="100%"><use href="#nuvi-real-star" /></svg>
          </span>
        </span>
      </div>
    </>
  );
}

const nuviLogoStyles = ({ inkColor, dotColor, fontFamily, animDuration }) => `
  .nuvi-logo {
    font-family: ${fontFamily};
    font-weight: 400;
    line-height: 1;
    color: ${inkColor};
    display: inline-flex;
    align-items: baseline;
    letter-spacing: -0.01em;
    user-select: none;
    position: relative;
  }

  .nuvi-letter {
    display: inline-block;
    transform-origin: 50% 100%;
    position: relative;
    z-index: 5;
  }
  .nuvi-letter-N { animation: nuvi-letter-fall-N ${animDuration} infinite; }
  .nuvi-letter-u { animation: nuvi-letter-fall-u ${animDuration} infinite; }
  .nuvi-letter-v { animation: nuvi-letter-fall-v ${animDuration} infinite; }

  .nuvi-mark {
    display: inline-block;
    position: relative;
    width: 0.26em;
    height: 1em;
    margin-left: -0.02em;
    vertical-align: baseline;
  }

  .nuvi-i-stem {
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    width: 0.13em;
    height: 0.50em;
    background: ${inkColor};
    border-radius: 0.018em;
    transform-origin: 50% 100%;
    z-index: 5;
    animation: nuvi-i-stem-life ${animDuration} infinite;
  }

  .nuvi-bang-stem {
    position: absolute;
    left: 50%;
    bottom: 0.25em;
    transform: translateX(-50%) scaleY(0);
    width: 0.13em;
    height: 0.45em;
    background: ${inkColor};
    border-radius: 0.018em;
    transform-origin: 50% 100%;
    opacity: 0;
    z-index: 5;
    animation: nuvi-bang-stem-life ${animDuration} infinite;
  }

  .nuvi-dot {
    position: absolute;
    left: 50%;
    top: 0.16em;
    width: 0.18em;
    height: 0.18em;
    background: ${dotColor};
    border-radius: 50%;
    transform: translateX(-50%);
    z-index: 100;
    animation: nuvi-dot-life ${animDuration} infinite;
  }

  .nuvi-bowling-holes {
    position: absolute;
    left: 50%;
    top: 0.16em;
    width: 0.18em;
    height: 0.18em;
    transform: translateX(-50%);
    opacity: 0;
    z-index: 101;
    pointer-events: none;
    animation: nuvi-bowling-holes-life ${animDuration} infinite;
  }
  .nuvi-bowling-holes::before {
    content: '';
    position: absolute;
    width: 0.025em;
    height: 0.025em;
    top: 25%;
    left: 28%;
    background: ${inkColor};
    border-radius: 50%;
    box-shadow:
      0.06em 0 0 0 ${inkColor},
      0.03em 0.04em 0 0 ${inkColor};
  }

  .nuvi-pupil {
    position: absolute;
    left: 50%;
    top: 0.16em;
    width: 0.06em;
    height: 0.06em;
    background: ${inkColor};
    border-radius: 50%;
    transform: translate(-50%, 0.06em);
    opacity: 0;
    z-index: 102;
    animation: nuvi-pupil-life ${animDuration} infinite;
  }

  .nuvi-trail {
    position: absolute;
    left: 50%;
    top: 0.16em;
    width: 0.18em;
    height: 0.18em;
    background: linear-gradient(45deg, #9d7fe0, transparent);
    border-radius: 50%;
    transform: translateX(-50%);
    opacity: 0;
    filter: blur(3px);
    z-index: 9;
    animation: nuvi-trail-life ${animDuration} ease-out infinite;
  }

  .nuvi-ghost-r,
  .nuvi-ghost-b,
  .nuvi-ghost-g,
  .nuvi-ghost-y {
    position: absolute;
    left: 50%;
    top: 0.16em;
    width: 0.18em;
    height: 0.18em;
    border-radius: 50%;
    transform: translateX(-50%);
    opacity: 0;
    mix-blend-mode: multiply;
    z-index: 9;
  }
  .nuvi-ghost-r { background: #c25b3f; animation: nuvi-ghost-r-life ${animDuration} steps(1, end) infinite; }
  .nuvi-ghost-b { background: #4a7bc8; animation: nuvi-ghost-b-life ${animDuration} steps(1, end) infinite; }
  .nuvi-ghost-g { background: #4dbfb0; animation: nuvi-ghost-g-life ${animDuration} steps(1, end) infinite; }
  .nuvi-ghost-y { background: #d9a44b; animation: nuvi-ghost-y-life ${animDuration} steps(1, end) infinite; }

  .nuvi-star {
    position: absolute;
    left: 50%;
    top: 0.16em;
    width: 0.40em;
    height: 0.40em;
    transform: translate(-50%, -0.10em) scale(0) rotate(0deg);
    opacity: 0;
    z-index: 12;
    animation: nuvi-star-life ${animDuration} linear infinite;
    pointer-events: none;
  }

  .nuvi-moon {
    position: absolute;
    left: 50%;
    top: 0.16em;
    width: 0.18em;
    height: 0.18em;
    transform: translate(-50%, 0) scale(0);
    opacity: 0;
    z-index: 11;
    animation: nuvi-moon-life ${animDuration} cubic-bezier(0.16, 1, 0.3, 1) infinite;
  }

  .nuvi-zzz {
    position: absolute;
    left: 50%;
    top: 0.05em;
    font-family: ${fontFamily};
    font-size: 0.20em;
    color: ${dotColor};
    transform: translateX(0.3em) scale(0);
    opacity: 0;
    z-index: 12;
    animation: nuvi-zzz-life ${animDuration} ease-out infinite;
    pointer-events: none;
  }

  /* ===== KEYFRAMES ===== */

  @keyframes nuvi-dot-life {
    /* CAMÉLÉON */
    0%   { background: #6d3fc4; transform: translateX(-50%) translate(0, 0) scale(1); border-radius: 50%; opacity: 1; }
    1.5% { background: #6d3fc4; transform: translateX(-50%) translate(0, 0) scale(1.1); }
    3%   { background: #9d7fe0; transform: translateX(-50%) translate(0, 0) scale(1); }
    4.5% { background: #4dbfb0; transform: translateX(-50%) translate(0, 0) scale(1.1); }
    6%   { background: #d9a44b; transform: translateX(-50%) translate(0, 0) scale(1); }
    7.7% { background: #6d3fc4; transform: translateX(-50%) translate(0, 0) scale(1); animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }

    /* ŒIL CURIEUX */
    9%    { background: #6d3fc4; transform: translateX(-50%) translate(0, 0) scale(1.4); }
    11%   { transform: translateX(-50%) translate(-0.04em, 0) scale(1.4); }
    13%   { transform: translateX(-50%) translate(0.04em, 0) scale(1.4); }
    14%   { transform: translateX(-50%) translate(0, -0.03em) scale(1.4); }
    15.4% { transform: translateX(-50%) translate(0, 0) scale(1); }

    /* CLIN D'ŒIL - le dot s'écrase verticalement */
    16% { transform: translateX(-50%) translate(0, 0) scale(1, 1); opacity: 1; }
    17% { transform: translateX(-50%) translate(0, 0) scale(1, 0.05); opacity: 1; }
    18% { transform: translateX(-50%) translate(0, 0) scale(0.5, 0.05); opacity: 0; }
    19% { transform: translateX(-50%) translate(0, 0) scale(1.15, 1.15); opacity: 1; }
    20% { transform: translateX(-50%) translate(0, 0) scale(1); opacity: 1; }

    /* BOWLING STRIKE */
    21%   { transform: translateX(-50%) translate(0, 0.40em) scale(1.8); background: #6d3fc4; animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
    21.5% { transform: translateX(-50%) translate(0.5em, 0.65em) scale(2.5); background: #5631a3; animation-timing-function: linear; }
    27%   { transform: translateX(-50%) translate(-3em, 0.65em) scale(2.5) rotate(-1080deg); opacity: 1; animation-timing-function: cubic-bezier(0.55, 0, 0.85, 1); }
    27.5% { transform: translateX(-50%) translate(-3em, 0.65em) scale(2); opacity: 0; }
    28.5% { transform: translateX(-50%) translate(0, 0) scale(0); opacity: 0; animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
    29.2% { transform: translateX(-50%) translate(0, 0) scale(1); background: #6d3fc4; opacity: 1; }

    /* BALLE QUI REBONDIT - vrais grands bonds dégressifs */
    29.5% { transform: translateX(-50%) translate(0, 0) scale(1); opacity: 1; animation-timing-function: cubic-bezier(0.55, 0, 0.85, 0); }
    30.5% { transform: translateX(-50%) translate(0, 0.66em) scale(1.3, 0.7); opacity: 1; animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
    31.3% { transform: translateX(-50%) translate(0, -0.20em) scale(0.92, 1.15); opacity: 1; animation-timing-function: cubic-bezier(0.55, 0, 0.85, 0); }
    32%   { transform: translateX(-50%) translate(0, 0.66em) scale(1.2, 0.8); opacity: 1; animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
    32.6% { transform: translateX(-50%) translate(0, -0.05em) scale(0.95, 1.1); opacity: 1; animation-timing-function: cubic-bezier(0.55, 0, 0.85, 0); }
    33.2% { transform: translateX(-50%) translate(0, 0.66em) scale(1.1, 0.9); opacity: 1; animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
    33.8% { transform: translateX(-50%) translate(0, 0) scale(1); opacity: 1; animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }

    /* DROP & BOUNCE (i → !) */
    40%   { transform: translateX(-50%) translate(0, 0.55em) scale(0.92, 1.15); opacity: 1; animation-timing-function: cubic-bezier(0.55, 0, 0.85, 0); }
    41%   { transform: translateX(-50%) translate(0, 0.66em) scale(1.25, 0.78); opacity: 1; animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
    42.5% { transform: translateX(-50%) translate(0, 0.62em) scale(1); opacity: 1; }
    44%   { transform: translateX(-50%) translate(0, 0.62em) scale(1); opacity: 1; }
    45%   { transform: translateX(-50%) translate(0, 0.10em) scale(0.92, 1.15); opacity: 1; animation-timing-function: cubic-bezier(0.55, 0, 0.85, 0); }
    45.5% { transform: translateX(-50%) translate(0, -0.03em) scale(1.22, 0.80); opacity: 1; animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
    46.2% { transform: translateX(-50%) translate(0, 0) scale(1); opacity: 1; }

    /* MÉTÉORITE */
    47%   { transform: translateX(-50%) translate(0.7em, -0.7em) scale(0.3); opacity: 0; animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1); }
    48%   { transform: translateX(-50%) translate(-0.7em, -0.6em) scale(0.3); opacity: 0; animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
    48.6% { transform: translateX(-50%) translate(0, 0) scale(1.3); opacity: 1; }
    49.2% { transform: translateX(-50%) translate(0, 0) scale(1); opacity: 1; }

    /* PENDULE */
    55%   { transform: translateX(-50%) translate(-0.06em, 0) scale(1); }
    57%   { transform: translateX(-50%) translate(0.06em, 0) scale(1); }
    59%   { transform: translateX(-50%) translate(-0.04em, 0) scale(1); }
    60%   { transform: translateX(-50%) translate(0.02em, 0) scale(1); }
    61.5% { transform: translateX(-50%) translate(0, 0) scale(1); }

    /* GLITCH */
    63%   { transform: translateX(-50%) translate(-0.02em, 0.01em) scale(1); opacity: 0.7; }
    64%   { transform: translateX(-50%) translate(0.02em, -0.01em) scale(1); opacity: 1; }
    65%   { transform: translateX(-50%) translate(-0.01em, 0.02em) scale(1); opacity: 0.5; }
    66%   { transform: translateX(-50%) translate(0.03em, 0) scale(1); opacity: 1; }
    67%   { transform: translateX(-50%) translate(-0.02em, -0.02em) scale(1); opacity: 0.8; }
    69%   { transform: translateX(-50%) translate(0, 0) scale(1.15); opacity: 1; }
    70.7% { transform: translateX(-50%) translate(0, 0) scale(1); opacity: 1; }

    /* LUNE */
    71.7% { transform: translateX(-50%) translate(0, 0) scale(0); opacity: 0; }
    75.9% { transform: translateX(-50%) translate(0, 0) scale(0); opacity: 0; }
    76.9% { transform: translateX(-50%) translate(0, 0) scale(1); opacity: 1; animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }

    /* ÉTOILE */
    77.9% { transform: translateX(-50%) translate(0, 0) scale(0); opacity: 0; }
    82.5% { transform: translateX(-50%) translate(0, 0) scale(0); opacity: 0; }
    83.1% { transform: translateX(-50%) translate(0, 0) scale(1); opacity: 1; animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }

    /* RESPIRATION FINALE */
    87%  { transform: translateX(-50%) translate(0, 0) scale(1.08); }
    91%  { transform: translateX(-50%) translate(0, 0) scale(1); }
    100% { transform: translateX(-50%) translate(0, 0) scale(1); background: #6d3fc4; }
  }

  @keyframes nuvi-bowling-holes-life {
    0%, 20%     { opacity: 0; transform: translateX(-50%) translate(0, 0) scale(0); }
    21%         { opacity: 1; transform: translateX(-50%) translate(0, 0.40em) scale(1.8); animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
    21.5%       { opacity: 1; transform: translateX(-50%) translate(0.5em, 0.65em) scale(2.5); animation-timing-function: linear; }
    27%         { opacity: 1; transform: translateX(-50%) translate(-3em, 0.65em) scale(2.5) rotate(-1080deg); }
    27.3%       { opacity: 0; transform: translateX(-50%) translate(-3em, 0.65em) scale(2); }
    27.4%, 100% { opacity: 0; transform: translateX(-50%) translate(0, 0) scale(0); }
  }

  @keyframes nuvi-letter-fall-v {
    0%, 22.3%   { transform: translate(0, 0) rotate(0deg); }
    22.4%       { transform: translate(0, 0) rotate(0deg); animation-timing-function: cubic-bezier(0.55, 0.06, 0.68, 0.19); }
    22.95%      { transform: translate(-0.10em, 0.18em) rotate(-90deg); }
    22.95%, 28% { transform: translate(-0.10em, 0.18em) rotate(-90deg); }
    28%         { transform: translate(-0.10em, 0.18em) rotate(-90deg); animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
    29.5%       { transform: translate(0, 0) rotate(0deg); }
    100%        { transform: translate(0, 0) rotate(0deg); }
  }

  @keyframes nuvi-letter-fall-u {
    0%, 23.2%     { transform: translate(0, 0) rotate(0deg); }
    23.3%         { transform: translate(0, 0) rotate(0deg); animation-timing-function: cubic-bezier(0.55, 0.06, 0.68, 0.19); }
    23.85%        { transform: translate(-0.10em, 0.18em) rotate(-90deg); }
    23.85%, 28.5% { transform: translate(-0.10em, 0.18em) rotate(-90deg); }
    28.5%         { transform: translate(-0.10em, 0.18em) rotate(-90deg); animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
    30%           { transform: translate(0, 0) rotate(0deg); }
    100%          { transform: translate(0, 0) rotate(0deg); }
  }

  @keyframes nuvi-letter-fall-N {
    0%, 23.9%   { transform: translate(0, 0) rotate(0deg); }
    24.0%       { transform: translate(0, 0) rotate(0deg); animation-timing-function: cubic-bezier(0.55, 0.06, 0.68, 0.19); }
    24.55%      { transform: translate(-0.10em, 0.18em) rotate(-90deg); }
    24.55%, 29% { transform: translate(-0.10em, 0.18em) rotate(-90deg); }
    29%         { transform: translate(-0.10em, 0.18em) rotate(-90deg); animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
    30.5%       { transform: translate(0, 0) rotate(0deg); }
    100%        { transform: translate(0, 0) rotate(0deg); }
  }

  @keyframes nuvi-star-life {
    0%, 77.9% { opacity: 0; transform: translate(-50%, -0.10em) scale(0) rotate(0deg); }
    78.5%     { opacity: 1; transform: translate(-50%, -0.10em) scale(1.1) rotate(60deg); animation-timing-function: linear; }
    82.5%     { opacity: 1; transform: translate(-50%, -0.10em) scale(1) rotate(720deg); animation-timing-function: cubic-bezier(0.55, 0, 0.85, 0.55); }
    83.1%     { opacity: 0; transform: translate(-50%, -0.10em) scale(0) rotate(800deg); }
    100%      { opacity: 0; }
  }

  @keyframes nuvi-pupil-life {
    0%, 7.7% { opacity: 0; transform: translate(-50%, 0.06em); }
    9%       { opacity: 1; transform: translate(-50%, 0.06em); }
    11%      { opacity: 1; transform: translate(calc(-50% - 0.025em), 0.06em); }
    13%      { opacity: 1; transform: translate(calc(-50% + 0.025em), 0.06em); }
    14%      { opacity: 1; transform: translate(-50%, 0.04em); }
    15.4%    { opacity: 0; transform: translate(-50%, 0.06em); }
    100%     { opacity: 0; }
  }

  @keyframes nuvi-trail-life {
    0%, 46.2%   { opacity: 0; transform: translateX(-50%) translate(0, 0) scale(0); }
    47%         { opacity: 0.9; transform: translateX(-50%) translate(0.5em, -0.5em) scale(2.5, 0.4) rotate(-45deg); }
    48%         { opacity: 0.7; transform: translateX(-50%) translate(-0.45em, -0.35em) scale(2.5, 0.4) rotate(45deg); }
    48.6%       { opacity: 0.3; transform: translateX(-50%) translate(-0.20em, -0.15em) scale(1.5, 0.4) rotate(45deg); }
    49.2%, 100% { opacity: 0; transform: translateX(-50%) translate(0, 0) scale(0); }
  }

  @keyframes nuvi-ghost-r-life {
    0%, 61.5% { opacity: 0; transform: translateX(-50%); }
    63%       { opacity: 0.7; transform: translateX(-50%) translate(0.04em, -0.02em); }
    64%       { opacity: 0.5; transform: translateX(-50%) translate(-0.04em, 0.02em); }
    65%       { opacity: 0.8; transform: translateX(-50%) translate(0.03em, 0.03em); }
    66%       { opacity: 0.4; transform: translateX(-50%) translate(-0.05em, 0); }
    67%       { opacity: 0.6; transform: translateX(-50%) translate(0.04em, -0.03em); }
    68%       { opacity: 0.5; transform: translateX(-50%) translate(-0.03em, 0.04em); }
    69%, 100% { opacity: 0; transform: translateX(-50%); }
  }
  @keyframes nuvi-ghost-b-life {
    0%, 61.5% { opacity: 0; transform: translateX(-50%); }
    63%       { opacity: 0.6; transform: translateX(-50%) translate(-0.04em, 0.02em); }
    64%       { opacity: 0.7; transform: translateX(-50%) translate(0.04em, -0.02em); }
    65%       { opacity: 0.4; transform: translateX(-50%) translate(-0.03em, -0.03em); }
    66%       { opacity: 0.7; transform: translateX(-50%) translate(0.05em, 0); }
    67%       { opacity: 0.5; transform: translateX(-50%) translate(-0.04em, 0.03em); }
    68%       { opacity: 0.4; transform: translateX(-50%) translate(0.03em, -0.04em); }
    69%, 100% { opacity: 0; transform: translateX(-50%); }
  }
  @keyframes nuvi-ghost-g-life {
    0%, 61.5% { opacity: 0; transform: translateX(-50%); }
    63%       { opacity: 0.5; transform: translateX(-50%) translate(0.05em, 0.04em); }
    64%       { opacity: 0.6; transform: translateX(-50%) translate(-0.05em, -0.03em); }
    65%       { opacity: 0.7; transform: translateX(-50%) translate(0.04em, -0.04em); }
    66%       { opacity: 0.5; transform: translateX(-50%) translate(-0.06em, 0.02em); }
    67%       { opacity: 0.6; transform: translateX(-50%) translate(0.05em, 0.04em); }
    68%       { opacity: 0.4; transform: translateX(-50%) translate(-0.04em, -0.05em); }
    69%, 100% { opacity: 0; transform: translateX(-50%); }
  }
  @keyframes nuvi-ghost-y-life {
    0%, 61.5% { opacity: 0; transform: translateX(-50%); }
    63%       { opacity: 0.4; transform: translateX(-50%) translate(-0.05em, -0.04em); }
    64%       { opacity: 0.6; transform: translateX(-50%) translate(0.05em, 0.04em); }
    65%       { opacity: 0.5; transform: translateX(-50%) translate(0.04em, -0.05em); }
    66%       { opacity: 0.6; transform: translateX(-50%) translate(-0.05em, 0.03em); }
    67%       { opacity: 0.4; transform: translateX(-50%) translate(0.06em, -0.02em); }
    68%       { opacity: 0.5; transform: translateX(-50%) translate(-0.03em, 0.05em); }
    69%, 100% { opacity: 0; transform: translateX(-50%); }
  }

  @keyframes nuvi-moon-life {
    0%, 70.7% { opacity: 0; transform: translate(-50%, 0) scale(0) rotate(0deg); }
    71.7%     { opacity: 1; transform: translate(-50%, 0) scale(1.1) rotate(-15deg); }
    72.5%     { opacity: 1; transform: translate(-50%, 0) scale(1) rotate(-15deg); }
    74%       { opacity: 1; transform: translate(-50%, 0.005em) scale(1) rotate(-12deg); }
    75%       { opacity: 1; transform: translate(-50%, -0.005em) scale(1) rotate(-18deg); }
    76%       { opacity: 0; transform: translate(-50%, 0) scale(0) rotate(0deg); }
    100%      { opacity: 0; }
  }

  @keyframes nuvi-zzz-life {
    0%, 72% { opacity: 0; transform: translate(0.3em, 0) scale(0); }
    73%     { opacity: 1; transform: translate(0.4em, -0.05em) scale(1); }
    74.5%   { opacity: 0.7; transform: translate(0.5em, -0.15em) scale(0.9); }
    76%     { opacity: 0; transform: translate(0.6em, -0.25em) scale(0.7); }
    100%    { opacity: 0; }
  }

  @keyframes nuvi-i-stem-life {
    0%, 21.6%     { transform: translateX(-50%) scaleY(1) rotate(0deg) translateY(0); opacity: 1; }
    21.7%         { transform: translateX(-50%) scaleY(1) rotate(0deg) translateY(0); animation-timing-function: cubic-bezier(0.55, 0.06, 0.68, 0.19); }
    22.25%        { transform: translateX(-50%) scaleY(1) rotate(-90deg) translateY(0.20em); }
    22.25%, 27.5% { transform: translateX(-50%) scaleY(1) rotate(-90deg) translateY(0.20em); }
    27.5%         { transform: translateX(-50%) scaleY(1) rotate(-90deg) translateY(0.20em); animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
    29%           { transform: translateX(-50%) scaleY(1) rotate(0deg) translateY(0); }
    29.1%, 38.5%  { transform: translateX(-50%) scaleY(1) rotate(0deg); opacity: 1; }
    40%, 44%      { transform: translateX(-50%) scaleY(0); opacity: 0; }
    45%           { transform: translateX(-50%) scaleY(1.05); opacity: 1; }
    46.2%, 100%   { transform: translateX(-50%) scaleY(1); opacity: 1; }
  }

  @keyframes nuvi-bang-stem-life {
    0%, 39%   { transform: translateX(-50%) scaleY(0); opacity: 0; }
    41%       { transform: translateX(-50%) scaleY(1.08); opacity: 1; }
    42%, 44%  { transform: translateX(-50%) scaleY(1); opacity: 1; }
    45%, 100% { transform: translateX(-50%) scaleY(0); opacity: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .nuvi-letter,
    .nuvi-i-stem,
    .nuvi-bang-stem,
    .nuvi-dot,
    .nuvi-bowling-holes,
    .nuvi-pupil,
    .nuvi-trail,
    .nuvi-ghost-r,
    .nuvi-ghost-b,
    .nuvi-ghost-g,
    .nuvi-ghost-y,
    .nuvi-star,
    .nuvi-moon,
    .nuvi-zzz {
      animation: none !important;
    }
  }
`;
