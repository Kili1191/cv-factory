"use client";

// DesignPaletteIcon v3 (2026-05-20)
//
// REFONTE v3 :
// - Blobs PLUS GROS qui se chevauchent (mieux visible)
// - Cycle des couleurs PLUS RAPIDE (8s au lieu de 20s)
// - Mouvement de "breathing" (scale qui pulse subtilement)
// - Glow leger autour des blobs pour pop visuellement
// - Toutes les couleurs DANS le cercle central de la palette

import { useId } from "react";

const PALETTE_COLORS = [
  "#d97757", // Coral
  "#5b3df5", // Purple
  "#b91c8c", // Magenta
  "#16a34a", // Green
  "#c8a96a", // Gold
];

export default function DesignPaletteIcon({
  size = 22,
  active = false,
  cycleDuration = 8,  // Plus rapide pour mieux voir le changement
}) {
  const rawId = useId();
  const id = "dp-" + rawId.replace(/:/g, "");

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <style>{`
          /* Cycle des COULEURS - chaque blob avec dephasage */
          @keyframes ${id}-color-cycle-0 {
            0%   { fill: ${PALETTE_COLORS[0]}; }
            20%  { fill: ${PALETTE_COLORS[1]}; }
            40%  { fill: ${PALETTE_COLORS[2]}; }
            60%  { fill: ${PALETTE_COLORS[3]}; }
            80%  { fill: ${PALETTE_COLORS[4]}; }
            100% { fill: ${PALETTE_COLORS[0]}; }
          }
          @keyframes ${id}-color-cycle-1 {
            0%   { fill: ${PALETTE_COLORS[1]}; }
            20%  { fill: ${PALETTE_COLORS[2]}; }
            40%  { fill: ${PALETTE_COLORS[3]}; }
            60%  { fill: ${PALETTE_COLORS[4]}; }
            80%  { fill: ${PALETTE_COLORS[0]}; }
            100% { fill: ${PALETTE_COLORS[1]}; }
          }
          @keyframes ${id}-color-cycle-2 {
            0%   { fill: ${PALETTE_COLORS[2]}; }
            20%  { fill: ${PALETTE_COLORS[3]}; }
            40%  { fill: ${PALETTE_COLORS[4]}; }
            60%  { fill: ${PALETTE_COLORS[0]}; }
            80%  { fill: ${PALETTE_COLORS[1]}; }
            100% { fill: ${PALETTE_COLORS[2]}; }
          }
          @keyframes ${id}-color-cycle-3 {
            0%   { fill: ${PALETTE_COLORS[3]}; }
            20%  { fill: ${PALETTE_COLORS[4]}; }
            40%  { fill: ${PALETTE_COLORS[0]}; }
            60%  { fill: ${PALETTE_COLORS[1]}; }
            80%  { fill: ${PALETTE_COLORS[2]}; }
            100% { fill: ${PALETTE_COLORS[3]}; }
          }

          /* Breathing animation - chaque blob "respire" */
          @keyframes ${id}-breathe-0 {
            0%, 100% { transform: scale(1) translate(0, 0); }
            50%      { transform: scale(1.15) translate(0.3px, -0.2px); }
          }
          @keyframes ${id}-breathe-1 {
            0%, 100% { transform: scale(1) translate(0, 0); }
            50%      { transform: scale(1.1) translate(-0.3px, 0.3px); }
          }
          @keyframes ${id}-breathe-2 {
            0%, 100% { transform: scale(1) translate(0, 0); }
            50%      { transform: scale(1.2) translate(0.2px, 0.3px); }
          }
          @keyframes ${id}-breathe-3 {
            0%, 100% { transform: scale(1) translate(0, 0); }
            50%      { transform: scale(1.12) translate(-0.2px, -0.3px); }
          }

          /* Classes : applique color cycle + breathing en meme temps */
          .${id}-dot-0 {
            animation:
              ${id}-color-cycle-0 ${cycleDuration}s linear infinite,
              ${id}-breathe-0 ${cycleDuration / 2}s ease-in-out infinite;
            transform-origin: 10px 11px;
          }
          .${id}-dot-1 {
            animation:
              ${id}-color-cycle-1 ${cycleDuration}s linear infinite,
              ${id}-breathe-1 ${cycleDuration / 2.5}s ease-in-out infinite;
            transform-origin: 13px 9px;
          }
          .${id}-dot-2 {
            animation:
              ${id}-color-cycle-2 ${cycleDuration}s linear infinite,
              ${id}-breathe-2 ${cycleDuration / 2.2}s ease-in-out infinite;
            transform-origin: 8px 13.5px;
          }
          .${id}-dot-3 {
            animation:
              ${id}-color-cycle-3 ${cycleDuration}s linear infinite,
              ${id}-breathe-3 ${cycleDuration / 2.7}s ease-in-out infinite;
            transform-origin: 12.5px 13px;
          }
        `}</style>

        {/* Clip path : les blobs restent DANS la palette */}
        <clipPath id={`${id}-clip`}>
          <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10 .55 0 1-.45 1-1v-1c0-1.1.9-2 2-2h1c2.21 0 4-1.79 4-4 0-6.07-4.93-11-11-11z" />
        </clipPath>

        {/* Filtre glow pour rendre les blobs plus lumineux */}
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.4" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* 1. Contour de la palette */}
      <path
        d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10 .55 0 1-.45 1-1v-1c0-1.1.9-2 2-2h1c2.21 0 4-1.79 4-4 0-6.07-4.93-11-11-11z"
        fill="rgba(250, 248, 243, 0.05)"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 2. Blobs de peinture DANS le centre - PLUS GROS et qui se chevauchent
            Disposition en grappe pour evoquer le melange de peinture.
            Glow filter pour les rendre lumineux. */}
      <g clipPath={`url(#${id}-clip)`} filter={`url(#${id}-glow)`}>
        {/* Blob central principal - grand */}
        <circle cx="10" cy="11" r="3.2"
          className={id + "-dot-0"}
          fill={PALETTE_COLORS[0]}
          opacity="0.92"
        />
        {/* Blob superieur droit - moyen */}
        <circle cx="13" cy="9" r="2.8"
          className={id + "-dot-1"}
          fill={PALETTE_COLORS[1]}
          opacity="0.92"
        />
        {/* Blob inferieur gauche - moyen */}
        <circle cx="8" cy="13.5" r="2.6"
          className={id + "-dot-2"}
          fill={PALETTE_COLORS[2]}
          opacity="0.92"
        />
        {/* Blob inferieur droit - moyen */}
        <circle cx="12.5" cy="13" r="2.4"
          className={id + "-dot-3"}
          fill={PALETTE_COLORS[3]}
          opacity="0.92"
        />
      </g>

      {/* 3. Trou pour le pouce */}
      <circle cx="16" cy="16" r="2"
        fill="rgba(0, 0, 0, 0.15)"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.4"
      />
    </svg>
  );
}
