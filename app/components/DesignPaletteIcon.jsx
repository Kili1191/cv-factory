"use client";

// DesignPaletteIcon - icone palette pour la sidebar Nuvi
//
// Au lieu d'un trait de contouring statique, la palette est REMPLIE
// avec des taches de peinture qui cyclent en continu a travers la palette Nuvi :
//   Coral -> Purple -> Magenta -> Green -> Gold -> (cycle 20s)
//
// Chaque "tache" de peinture (4 ronds sur la palette + 1 pinceau) est dephase
// pour creer un effet de palette vivante.
//
// Props :
//   size      : taille en px (default 22)
//   active    : si actif, animation plus vive ; sinon discrete

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
  cycleDuration = 20,
}) {
  const rawId = useId();
  const id = "dp-" + rawId.replace(/:/g, "");

  // 5 ronds de peinture sur la palette + le pinceau (qui a sa propre couleur)
  // Chacun cycle a travers les couleurs mais avec un dephasage.

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
        {/* Style pour les animations - cycle continu des couleurs */}
        <style>{`
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
          @keyframes ${id}-color-cycle-4 {
            0%   { fill: ${PALETTE_COLORS[4]}; }
            20%  { fill: ${PALETTE_COLORS[0]}; }
            40%  { fill: ${PALETTE_COLORS[1]}; }
            60%  { fill: ${PALETTE_COLORS[2]}; }
            80%  { fill: ${PALETTE_COLORS[3]}; }
            100% { fill: ${PALETTE_COLORS[4]}; }
          }
          .${id}-dot-0 { animation: ${id}-color-cycle-0 ${cycleDuration}s linear infinite; }
          .${id}-dot-1 { animation: ${id}-color-cycle-1 ${cycleDuration}s linear infinite; }
          .${id}-dot-2 { animation: ${id}-color-cycle-2 ${cycleDuration}s linear infinite; }
          .${id}-dot-3 { animation: ${id}-color-cycle-3 ${cycleDuration}s linear infinite; }
          .${id}-dot-4 { animation: ${id}-color-cycle-4 ${cycleDuration}s linear infinite; }
        `}</style>
      </defs>

      {/* Forme de palette (contour) */}
      <path
        d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10 .55 0 1-.45 1-1v-1c0-1.1.9-2 2-2h1c2.21 0 4-1.79 4-4 0-6.07-4.93-11-11-11z"
        fill="rgba(250, 248, 243, 0.06)"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 5 taches de peinture sur la palette - chacune avec sa propre cycle */}
      <circle cx="7" cy="10" r="1.4" className={id + "-dot-0"} fill={PALETTE_COLORS[0]} />
      <circle cx="9.5" cy="6.5" r="1.4" className={id + "-dot-1"} fill={PALETTE_COLORS[1]} />
      <circle cx="14" cy="6" r="1.4" className={id + "-dot-2"} fill={PALETTE_COLORS[2]} />
      <circle cx="17.5" cy="9" r="1.4" className={id + "-dot-3"} fill={PALETTE_COLORS[3]} />
      <circle cx="7.5" cy="14" r="1.4" className={id + "-dot-4"} fill={PALETTE_COLORS[4]} />
    </svg>
  );
}
