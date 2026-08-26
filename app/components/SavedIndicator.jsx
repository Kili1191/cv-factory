"use client";

// SavedIndicator - Affiche "Sauvegarde il y a Xs" style Google Docs / Notion
//
// Props :
//   lastSavedAt : timestamp (ms) de la derniere sauvegarde, ou null
//   lang        : "fr" | "en"
//   compact     : boolean (par defaut false). Compact = juste le point vert + tooltip
//
// Mise a jour automatique : tick toutes les 10s pour rafraichir "il y a Xs".

import { useState, useEffect } from "react";

export default function SavedIndicator({
  lastSavedAt = null,
  lang = "en",
  compact = false,
}) {
  // Tick toutes les 10s pour rafraichir le texte
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!lastSavedAt) return;
    const t = setInterval(() => setTick(n => n + 1), 10000);
    return () => clearInterval(t);
  }, [lastSavedAt]);

  if (!lastSavedAt) {
    return null;
  }

  const InkMuted = "var(--nuvi-ink-muted)";
  const Green = "var(--nuvi-green)";

  const ageSec = Math.max(0, Math.floor((Date.now() - lastSavedAt) / 1000));

  const formatAge = () => {
    if (lang === "en") {
      if (ageSec < 3) return "saved just now";
      if (ageSec < 60) return "saved " + ageSec + "s ago";
      if (ageSec < 3600) return "saved " + Math.floor(ageSec / 60) + " min ago";
      if (ageSec < 86400) return "saved " + Math.floor(ageSec / 3600) + "h ago";
      return "saved " + Math.floor(ageSec / 86400) + "d ago";
    }
    if (ageSec < 3) return "sauvegarde a l'instant";
    if (ageSec < 60) return "sauvegarde il y a " + ageSec + "s";
    if (ageSec < 3600) return "sauvegarde il y a " + Math.floor(ageSec / 60) + " min";
    if (ageSec < 86400) return "sauvegarde il y a " + Math.floor(ageSec / 3600) + "h";
    return "sauvegarde il y a " + Math.floor(ageSec / 86400) + "j";
  };

  if (compact) {
    return (
      <div
        title={formatAge()}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          color: InkMuted,
          fontFamily: "'Inter', -apple-system, sans-serif",
        }}
      >
        <span style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: Green,
          flexShrink: 0,
          animation: ageSec < 3 ? "savedPulse 1.4s ease-out" : "none",
        }} />
        <style>{`
          @keyframes savedPulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.5); opacity: 0.6; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "4px 10px",
      borderRadius: 999,
      background: "rgba(22, 163, 74, 0.08)",
      fontSize: 11,
      color: InkMuted,
      fontFamily: "'Inter', -apple-system, sans-serif",
      fontWeight: 500,
      letterSpacing: "0.01em",
      transition: "all 200ms ease",
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: Green,
        flexShrink: 0,
        animation: ageSec < 3 ? "savedPulse 1.4s ease-out" : "none",
      }} />
      <span>{formatAge()}</span>
      <style>{`
        @keyframes savedPulse {
          0% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.5); }
          70% { transform: scale(1.4); opacity: 0.7; box-shadow: 0 0 0 4px rgba(22, 163, 74, 0); }
          100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
        }
      `}</style>
    </div>
  );
}
