"use client";

import React, { useEffect, useState } from 'react';

/**
 * NuviBigLogo - Overlay plein ecran easter egg
 *
 * Affiche "Nuvi!" en enorme avec animation rebondissement.
 * Trigger : Konami code ou via triggerEvent('easter-egg-biglogo')
 *
 * Auto-dismiss apres ~3.5s, ou clic pour fermer plus vite.
 *
 * Style : Fraunces gradient violet -> magenta + lettres animees (Clippy-style)
 */
export default function NuviBigLogo({ active, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setVisible(true);
    } else {
      // Fade out delay
      const t = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(t);
    }
  }, [active]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes nuviBigLogoFadeIn {
          0%   { opacity: 0; transform: scale(0.5); }
          60%  { opacity: 1; transform: scale(1.05); }
          80%  { transform: scale(0.98); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes nuviBigLogoFadeOut {
          0%   { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.5); }
        }
        @keyframes nuviBigLogoLetterBounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(-30px) rotate(-3deg); }
        }
        @keyframes nuviBigLogoExclaim {
          0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
          25%      { transform: translateY(-25px) rotate(-15deg) scale(1.1); }
          75%      { transform: translateY(-25px) rotate(15deg) scale(1.1); }
        }
        @keyframes nuviBigLogoSparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50%      { opacity: 1; transform: scale(1.2); }
        }
        .nuvi-biglogo-backdrop {
          position: fixed;
          inset: 0;
          background: radial-gradient(ellipse at center,
            rgba(91, 61, 245, 0.18) 0%,
            rgba(185, 28, 140, 0.12) 40%,
            rgba(0, 0, 0, 0.55) 100%);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 99998;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: ${active ? 'nuviBigLogoFadeIn 600ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                               : 'nuviBigLogoFadeOut 400ms ease-out forwards'};
          cursor: pointer;
        }
        .nuvi-biglogo-text {
          font-family: 'Fraunces', Georgia, serif;
          font-size: clamp(80px, 18vw, 220px);
          font-weight: 700;
          letter-spacing: -0.04em;
          line-height: 1;
          user-select: none;
          display: flex;
          align-items: baseline;
        }
        .nuvi-biglogo-text span {
          display: inline-block;
          background: linear-gradient(135deg, #5b3df5 0%, #b91c8c 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: nuviBigLogoLetterBounce 1.4s ease-in-out infinite;
        }
        .nuvi-biglogo-text span:nth-child(1) { animation-delay: 0s; }
        .nuvi-biglogo-text span:nth-child(2) { animation-delay: 0.08s; }
        .nuvi-biglogo-text span:nth-child(3) { animation-delay: 0.16s; }
        .nuvi-biglogo-text span:nth-child(4) { animation-delay: 0.24s; }
        .nuvi-biglogo-text .exclaim {
          background: linear-gradient(135deg, #d97757 0%, #b91c8c 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: nuviBigLogoExclaim 1s ease-in-out infinite 0.32s;
          padding-left: 4px;
        }
        .nuvi-biglogo-sparkles {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .nuvi-biglogo-spark {
          position: absolute;
          font-size: clamp(20px, 4vw, 40px);
          color: gold;
          filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.6));
          animation: nuviBigLogoSparkle 1.4s ease-in-out infinite;
        }
        .nuvi-biglogo-spark.s1 { top: 20%; left: 15%; animation-delay: 0.2s; }
        .nuvi-biglogo-spark.s2 { top: 25%; right: 18%; animation-delay: 0.7s; }
        .nuvi-biglogo-spark.s3 { bottom: 22%; left: 22%; animation-delay: 0.4s; }
        .nuvi-biglogo-spark.s4 { bottom: 28%; right: 16%; animation-delay: 0.9s; }
        .nuvi-biglogo-spark.s5 { top: 50%; left: 8%; animation-delay: 0.5s; }
        .nuvi-biglogo-spark.s6 { top: 55%; right: 9%; animation-delay: 1.0s; }
        .nuvi-biglogo-konami {
          position: absolute;
          bottom: 60px;
          left: 50%;
          transform: translateX(-50%);
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.6);
          padding: 8px 20px;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          border-radius: 999px;
          border: 0.5px solid rgba(255, 255, 255, 0.15);
          animation: nuviBigLogoFadeIn 800ms ease-out 400ms backwards;
        }
      `}</style>
      <div
        className="nuvi-biglogo-backdrop"
        onClick={onDismiss}
        aria-label="Easter egg Nuvi"
        role="dialog"
      >
        <div className="nuvi-biglogo-sparkles">
          <span className="nuvi-biglogo-spark s1">✨</span>
          <span className="nuvi-biglogo-spark s2">⭐</span>
          <span className="nuvi-biglogo-spark s3">✨</span>
          <span className="nuvi-biglogo-spark s4">⭐</span>
          <span className="nuvi-biglogo-spark s5">✨</span>
          <span className="nuvi-biglogo-spark s6">⭐</span>
        </div>
        <div className="nuvi-biglogo-text">
          <span>N</span><span>u</span><span>v</span><span>i</span>
          <span className="exclaim">!</span>
        </div>
        <div className="nuvi-biglogo-konami">
          🎮 Konami code activated
        </div>
      </div>
    </>
  );
}
