"use client";

import React, { useEffect, useState, useRef } from "react";

// Overlay fullscreen pour la celebration MEGA happy
// Affiche 4 potes (vert, rose, cyan, or) qui dansent + 60 confettis sur tout l'ecran

const FRIEND_COLORS = [
  { name: "vert", body: "#10b981", brow: "#10b981" },
  { name: "rose", body: "#ec4899", brow: "#ec4899" },
  { name: "cyan", body: "#06b6d4", brow: "#06b6d4" },
  { name: "or", body: "#f59e0b", brow: "#f59e0b" },
];

const PARTY_COLORS = ["#5b3df5", "#d4347e", "#fbbf24", "#06b6d4", "#10b981", "#f59e0b", "#ec4899"];

function MiniFriend({ color, delay, x, y, scale }) {
  return (
    <div style={{
      position: "absolute",
      left: x, top: y,
      width: 80, height: 80,
      transform: `scale(${scale})`,
      animation: `cvfFriendDance 1.2s ease-in-out ${delay}ms infinite, cvfFriendFadeIn 0.4s ease-out ${delay}ms both`,
    }}>
      <svg viewBox="0 0 80 80" style={{ width: "100%", height: "100%", overflow: "visible" }}>
        <circle cx="40" cy="44" r="22" fill="none" stroke={color.body} strokeWidth="2.5" />
        <path d="M 18 32 Q 40 12, 62 32" fill="none" stroke={color.brow} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="40" cy="46" r="6" fill={color.brow} />
      </svg>
    </div>
  );
}

export default function LogoFireworks({ visible, onDone }) {
  const [confetti, setConfetti] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!visible) {
      setConfetti([]);
      return;
    }
    // Genere 60 confettis avec trajectoires aleatoires
    const pieces = [];
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const dist = 200 + Math.random() * 400;
      pieces.push({
        id: i,
        color: PARTY_COLORS[i % PARTY_COLORS.length],
        startDelay: Math.random() * 800,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist + Math.random() * 200,
        rot: Math.random() * 720,
        size: 6 + Math.random() * 8,
      });
    }
    setConfetti(pieces);

    const t = setTimeout(() => {
      if (onDone) onDone();
    }, 3000);
    return () => clearTimeout(t);
  }, [visible, onDone]);

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed", inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
      {/* Halo radial qui irradie depuis le centre */}
      <div style={{
        position: "absolute",
        top: "50%", left: "50%",
        width: 400, height: 400,
        marginLeft: -200, marginTop: -200,
        background: "radial-gradient(circle, rgba(251,191,36,0.4) 0%, rgba(251,191,36,0) 70%)",
        animation: "cvfMegaHalo 3s ease-out forwards",
      }} />

      {/* Les 4 potes apparaissent en cercle autour du centre */}
      <div style={{ position: "absolute", top: "50%", left: "50%" }}>
        <MiniFriend color={FRIEND_COLORS[0]} delay={200} x={-180} y={-80} scale={0.9} />
        <MiniFriend color={FRIEND_COLORS[1]} delay={350} x={120} y={-80} scale={0.9} />
        <MiniFriend color={FRIEND_COLORS[2]} delay={500} x={-180} y={40} scale={0.9} />
        <MiniFriend color={FRIEND_COLORS[3]} delay={650} x={120} y={40} scale={0.9} />
      </div>

      {/* Confettis fullscreen */}
      {confetti.map((c) => (
        <div
          key={c.id}
          style={{
            position: "absolute",
            top: "50%", left: "50%",
            width: c.size, height: c.size,
            background: c.color,
            borderRadius: 2,
            opacity: 0,
            animation: `cvfConfettiFly 2.5s cubic-bezier(0.4,0.7,0.6,1) ${c.startDelay}ms forwards`,
            "--tx": c.tx + "px",
            "--ty": c.ty + "px",
            "--rot": c.rot + "deg",
          }}
        />
      ))}

      <style>{`
        @keyframes cvfMegaHalo {
          0% { transform: scale(0.3); opacity: 0; }
          30% { transform: scale(1.5); opacity: 1; }
          100% { transform: scale(3); opacity: 0; }
        }
        @keyframes cvfFriendDance {
          0%, 100% { transform: scale(0.9) translateY(0) rotate(-5deg); }
          25% { transform: scale(0.95) translateY(-15px) rotate(5deg); }
          50% { transform: scale(1) translateY(0) rotate(-5deg); }
          75% { transform: scale(0.95) translateY(-10px) rotate(5deg); }
        }
        @keyframes cvfFriendFadeIn {
          from { opacity: 0; transform: scale(0.3); }
          to { opacity: 1; transform: scale(0.9); }
        }
        @keyframes cvfConfettiFly {
          0% { opacity: 1; transform: translate(0, 0) rotate(0deg); }
          100% { opacity: 0; transform: translate(var(--tx), var(--ty)) rotate(var(--rot)); }
        }
      `}</style>
    </div>
  );
}
