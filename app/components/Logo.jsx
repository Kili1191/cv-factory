"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { subscribe, vibratePattern, VIBE_PATTERNS } from "../lib/logoEvents";
import LogoFireworks from "./LogoFireworks";

// Compagnon CV Factory - logo anime avec 7 etats
// Rond creux rouille + sourcil violet + oeil violet
// Desktop: oeil suit la souris
// Mobile: oeil suit l'inclinaison du telephone (gyroscope)

const COLORS = {
  ringStroke: "#D85A30",
  brow: "#5b3df5",
  eye: "#5b3df5",
  glowGold: "#fbbf24",
  glowPurple: "#5b3df5",
};

// Detecte si l'appareil supporte les motions reduites (accessibilite)
function usesReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Detecte si on est sur mobile/tablette (pour activer le gyroscope)
function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
}

export default function Logo({
  size = 36,
  showFactoryText = true,
  factoryFontSize = 17,
  factorySubtitle = null,
  factorySubtitleColor = "#888",
  inkColor = "#0a0a0a",
  serifFamily = "ui-serif, Georgia, serif",
  sansFamily = "ui-sans-serif, system-ui, sans-serif",
}) {
  const [state, setState] = useState("idle");
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [showMega, setShowMega] = useState(false);
  const [orientationGranted, setOrientationGranted] = useState(false);
  const containerRef = useRef(null);
  const stateTimerRef = useRef(null);
  const archStrokeRef = useRef(COLORS.brow);
  const reducedMotion = useRef(usesReducedMotion());

  // Animation states avec timers de retour automatique a idle
  const playState = useCallback((newState, durationMs) => {
    if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    setState(newState);
    if (durationMs && newState !== "idle" && newState !== "thinking") {
      stateTimerRef.current = setTimeout(() => setState("idle"), durationMs);
    }
  }, []);

  // Subscribe au bus d'evenements global
  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (event.type === "thinking") {
        if (event.active) playState("thinking");
        else playState("idle");
        return;
      }
      if (event.type === "celebrate") {
        const lvl = event.level;
        if (lvl === "micro") {
          playState("micro", 400);
          vibratePattern(VIBE_PATTERNS.micro);
        } else if (lvl === "mini") {
          playState("mini", 1500);
          vibratePattern(VIBE_PATTERNS.mini);
        } else if (lvl === "big") {
          playState("big", 2500);
          vibratePattern(VIBE_PATTERNS.big);
        } else if (lvl === "mega") {
          playState("mega", 3000);
          setShowMega(true);
          vibratePattern(VIBE_PATTERNS.mega);
        }
      }
    });
    return unsubscribe;
  }, [playState]);

  // Suivi du curseur (desktop) - oeil bouge subtilement vers la souris
  useEffect(() => {
    if (isTouchDevice()) return; // skip sur mobile
    if (reducedMotion.current) return;

    function handleMove(e) {
      if (!containerRef.current) return;
      // Pendant les anims spin (big/mega/thinking), on fige l'oeil
      if (state === "big" || state === "mega" || state === "thinking") {
        setEyeOffset({ x: 0, y: 0 });
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxOffset = size * 0.06; // proportionnel a la taille du logo
      const pull = Math.min(1, dist / 300);
      const ox = (dx / Math.max(dist, 1)) * pull * maxOffset;
      const oy = (dy / Math.max(dist, 1)) * pull * maxOffset;
      setEyeOffset({ x: ox, y: oy });
    }
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [state, size]);

  // Suivi du gyroscope (mobile) - oeil bouge avec l'inclinaison
  useEffect(() => {
    if (!isTouchDevice()) return;
    if (reducedMotion.current) return;

    function handleOrientation(e) {
      if (state === "big" || state === "mega" || state === "thinking") {
        setEyeOffset({ x: 0, y: 0 });
        return;
      }
      // gamma = inclinaison gauche/droite (-90 a 90)
      // beta = inclinaison avant/arriere (-180 a 180)
      const gamma = e.gamma || 0;
      const beta = e.beta || 0;
      const maxOffset = size * 0.08;
      // Normalise: 30 degres d'inclinaison = max offset
      const ox = Math.max(-1, Math.min(1, gamma / 30)) * maxOffset;
      const oy = Math.max(-1, Math.min(1, (beta - 30) / 30)) * maxOffset;
      setEyeOffset({ x: ox, y: oy });
    }

    // iOS 13+ requires explicit permission
    function setupOrientation() {
      if (typeof DeviceOrientationEvent !== "undefined" &&
          typeof DeviceOrientationEvent.requestPermission === "function") {
        // iOS - need user gesture to request permission
        // On l'attache au premier touch
        const requestOnTouch = () => {
          DeviceOrientationEvent.requestPermission()
            .then((response) => {
              if (response === "granted") {
                window.addEventListener("deviceorientation", handleOrientation);
                setOrientationGranted(true);
              }
            })
            .catch(() => {});
          document.removeEventListener("touchstart", requestOnTouch);
        };
        document.addEventListener("touchstart", requestOnTouch, { once: true });
      } else {
        // Android et autres - direct
        window.addEventListener("deviceorientation", handleOrientation);
        setOrientationGranted(true);
      }
    }
    setupOrientation();

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, [state, size]);

  // Hover handlers
  const handleMouseEnter = () => {
    if (state === "idle") playState("hover", 600);
  };

  // Tap mobile = mini-feedback
  const handleClick = () => {
    if (state === "idle") {
      playState("micro", 400);
      vibratePattern(VIBE_PATTERNS.micro);
    }
  };

  // Calcul de la classe CSS selon l'etat
  const stateClass = `cvf-companion cvf-${state}`;

  return (
    <>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: Math.round(size * 0.28),
          fontFamily: serifFamily,
        }}
        onMouseEnter={handleMouseEnter}
        onClick={handleClick}
      >
        <div
          ref={containerRef}
          className={stateClass}
          style={{
            width: size, height: size,
            position: "relative",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <svg
            viewBox="0 0 80 80"
            style={{ width: "100%", height: "100%", overflow: "visible", display: "block" }}
          >
            {/* Halo (visible seulement en thinking, big, mega) */}
            <ellipse
              className="cvf-glow"
              cx="40" cy="44" rx="20" ry="20"
              fill={COLORS.glowPurple}
            />
            {/* Corps - rond creux contour rouille */}
            <circle
              className="cvf-body"
              cx="40" cy="44" r="22"
              fill="none"
              stroke={COLORS.ringStroke}
              strokeWidth="2.5"
            />
            {/* Sourcil - arc violet */}
            <path
              className="cvf-arch"
              d="M 18 32 Q 40 12, 62 32"
              fill="none"
              stroke={COLORS.brow}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Oeil - circle violet qui suit le curseur/gyroscope */}
            <circle
              className="cvf-eye"
              cx={40 + eyeOffset.x}
              cy={46 + eyeOffset.y}
              r="6"
              fill={COLORS.eye}
            />
          </svg>
        </div>
        {showFactoryText && (
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{
              fontFamily: serifFamily,
              fontWeight: 500,
              fontSize: factoryFontSize,
              letterSpacing: "-0.01em",
              color: inkColor,
              lineHeight: 1,
            }}>Factory</div>
            {factorySubtitle && (
              <div style={{
                color: factorySubtitleColor,
                fontSize: Math.max(9, Math.round(factoryFontSize * 0.6)),
                marginTop: 3,
                fontFamily: sansFamily,
              }}>{factorySubtitle}</div>
            )}
          </div>
        )}
      </div>

      {/* Overlay fullscreen pour MEGA happy */}
      <LogoFireworks
        visible={showMega}
        onDone={() => setShowMega(false)}
      />

      {/* Styles globaux pour les animations */}
      <style jsx global>{`
        .cvf-companion .cvf-glow {
          opacity: 0;
          transform-origin: 40px 44px;
          transform-box: view-box;
        }
        .cvf-companion .cvf-body {
          transform-origin: 40px 44px;
          transform-box: view-box;
        }
        .cvf-companion .cvf-arch {
          transform-origin: 40px 32px;
          transform-box: view-box;
        }
        .cvf-companion .cvf-eye {
          transform-origin: center;
          transform-box: fill-box;
          transition: cx 100ms ease-out, cy 100ms ease-out;
        }

        /* IDLE - respire + cligne rare */
        .cvf-idle .cvf-body {
          animation: cvfBreathe 3.5s ease-in-out infinite;
        }
        .cvf-idle .cvf-arch {
          animation: cvfArchSway 4s ease-in-out infinite;
        }
        .cvf-idle .cvf-eye {
          animation: cvfBlink 4s ease-in-out infinite;
        }

        /* THINKING - tout le compagnon rotate */
        .cvf-thinking {
          animation: cvfThinkRotate 1.8s linear infinite;
        }
        .cvf-thinking .cvf-glow {
          animation: cvfThinkGlow 1.5s ease-in-out infinite;
        }

        /* HOVER - sort + oeil grossit + rebondit */
        .cvf-hover {
          animation: cvfHoverPop 600ms ease-out forwards;
        }
        .cvf-hover .cvf-eye {
          animation: cvfHoverEye 600ms ease-out forwards;
        }

        /* MICRO - 1 clignement */
        .cvf-micro .cvf-eye {
          animation: cvfMicroBlink 400ms ease-in-out;
        }

        /* MINI HAPPY - sourcil vibre puis se courbe en sourire */
        .cvf-mini .cvf-body {
          animation: cvfMiniBounce 1.5s ease-out;
        }
        .cvf-mini .cvf-arch {
          animation: cvfBrowSmile 1.5s ease-in-out;
        }

        /* BIG HAPPY - levitation + transformation en confettis */
        .cvf-big {
          animation: cvfBigSpin 2.5s ease-in-out;
        }
        .cvf-big .cvf-body {
          animation: cvfBigLevitate 2.5s ease-out;
        }
        .cvf-big .cvf-glow {
          animation: cvfBigGlow 2.5s ease-out;
          fill: ${COLORS.glowGold};
        }
        .cvf-big .cvf-arch {
          animation: cvfBigArchColor 2.5s ease-in-out;
        }
        .cvf-big .cvf-eye {
          animation: cvfBigEyePop 2.5s ease-out;
        }

        /* MEGA HAPPY - le logo principal rotate 720 + couleurs cascade */
        .cvf-mega {
          animation: cvfMegaSpin 3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cvf-mega .cvf-body {
          animation: cvfMegaBounce 3s ease-out;
        }
        .cvf-mega .cvf-arch {
          animation: cvfMegaColor 3s ease-in-out;
        }
        .cvf-mega .cvf-glow {
          animation: cvfMegaGlow 3s ease-out;
          fill: ${COLORS.glowGold};
        }

        /* Keyframes - IDLE */
        @keyframes cvfBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes cvfArchSway {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
        @keyframes cvfBlink {
          0%, 88%, 100% { transform: scaleY(1); }
          91%, 95% { transform: scaleY(0.1); }
        }

        /* Keyframes - THINKING */
        @keyframes cvfThinkRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes cvfThinkGlow {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.5); }
        }

        /* Keyframes - HOVER */
        @keyframes cvfHoverPop {
          0% { transform: scale(1); }
          50% { transform: scale(1.18) translateY(-5px); }
          100% { transform: scale(1.05) translateY(-2px); }
        }
        @keyframes cvfHoverEye {
          0%, 100% { r: 6; }
          50% { r: 9; }
        }

        /* Keyframes - MICRO */
        @keyframes cvfMicroBlink {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.1); }
        }

        /* Keyframes - MINI - sourcil vibre puis se transforme en sourire */
        @keyframes cvfMiniBounce {
          0%, 100% { transform: translateY(0); }
          30% { transform: translateY(-10px); }
          60% { transform: translateY(0); }
        }
        @keyframes cvfBrowSmile {
          0% {
            transform: rotate(0deg) translateY(0);
            d: path("M 18 32 Q 40 12, 62 32");
          }
          15% { transform: rotate(-5deg) translateY(-1px); }
          25% { transform: rotate(5deg) translateY(1px); }
          35% { transform: rotate(-3deg) translateY(-1px); }
          45% { transform: rotate(0deg) translateY(0); }
          /* morph en sourire (U inverse) */
          60%, 80% {
            d: path("M 22 36 Q 40 56, 58 36");
            transform: translateY(8px);
          }
          100% {
            d: path("M 18 32 Q 40 12, 62 32");
            transform: rotate(0deg) translateY(0);
          }
        }

        /* Keyframes - BIG - levitation + glow dore */
        @keyframes cvfBigSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes cvfBigLevitate {
          0% { transform: translateY(0) scale(1); }
          30% { transform: translateY(-25px) scale(1.1); }
          60% { transform: translateY(-15px) scale(1.05); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes cvfBigGlow {
          0%, 100% { opacity: 0; transform: scale(0.8); }
          50% { opacity: 0.7; transform: scale(2.5); }
        }
        @keyframes cvfBigArchColor {
          0%, 100% { stroke: #5b3df5; }
          33% { stroke: #d4347e; }
          66% { stroke: #fbbf24; }
        }
        @keyframes cvfBigEyePop {
          0%, 100% { r: 6; }
          40% { r: 8; }
        }

        /* Keyframes - MEGA - 720 rotation + 5 couleurs cascade */
        @keyframes cvfMegaSpin {
          from { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(360deg) scale(1.3); }
          to { transform: rotate(720deg) scale(1); }
        }
        @keyframes cvfMegaBounce {
          0%, 100% { transform: translateY(0); }
          20% { transform: translateY(-25px); }
          60% { transform: translateY(-12px); }
        }
        @keyframes cvfMegaColor {
          0%, 100% { stroke: #5b3df5; }
          20% { stroke: #d4347e; }
          40% { stroke: #06b6d4; }
          60% { stroke: #f59e0b; }
          80% { stroke: #10b981; }
        }
        @keyframes cvfMegaGlow {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 0.8; transform: scale(3); }
        }

        /* Accessibilite - respect des preferences utilisateur */
        @media (prefers-reduced-motion: reduce) {
          .cvf-companion,
          .cvf-companion .cvf-body,
          .cvf-companion .cvf-arch,
          .cvf-companion .cvf-eye,
          .cvf-companion .cvf-glow {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}
