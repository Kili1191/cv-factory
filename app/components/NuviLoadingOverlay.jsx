"use client";
import React, { useEffect, useState } from "react";
import NuviCompanion from "./NuviCompanion";
import NuviLoadingMessages from "./NuviLoadingMessages";

/**
 * NuviLoadingOverlay : Plein écran de chargement premium.
 *
 * Affiche NuviCompanion (mode loading) + NuviLoadingMessages (copy psychologique)
 * au-dessus de tout pendant qu'une opération asynchrone se déroule.
 * À la fin (quand `active` passe à false), fade out élégant pour dévoiler le contenu.
 *
 * Props :
 *   - active: boolean (true = overlay visible)
 *   - series: "generation" | "audit" | "match" | "interview" | "generic"
 *   - user: { nom, metier, secteur, annees } (pour personnaliser les messages)
 *   - lang: "fr" | "en"
 *   - mob: boolean
 */
export default function NuviLoadingOverlay({
  active = false,
  series = "generic",
  user = {},
  lang = "fr",
  mob = false,
}) {
  const [shouldRender, setShouldRender] = useState(active);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (active) {
      setShouldRender(true);
      setFadingOut(false);
    } else if (shouldRender) {
      // [Fix glitch] Pour eviter le flash de l'ancien CV :
      //   1. On attend 100ms (laisse React re-render le NOUVEAU CV derriere)
      //   2. Puis on commence le fade-out (250ms)
      // Total : 350ms apres que active passe a false, l'overlay est parti.
      // L'utilisateur voit DIRECTEMENT le nouveau CV (jamais l'ancien).
      const renderDelay = setTimeout(() => {
        setFadingOut(true);
        const fadeTimer = setTimeout(() => {
          setShouldRender(false);
          setFadingOut(false);
        }, 250);
        // store in closure pour cleanup
        renderDelay._fadeTimer = fadeTimer;
      }, 100);
      return () => {
        clearTimeout(renderDelay);
        if (renderDelay._fadeTimer) clearTimeout(renderDelay._fadeTimer);
      };
    }
  }, [active, shouldRender]);

  if (!shouldRender) return null;

  // Couleurs Nuvi
  const Cream = "#faf8f3";
  const Ink = "#0f0f12";

  // Taille du compagnon
  const companionSize = mob ? 110 : 160;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={lang === "en" ? "Loading" : "Chargement en cours"}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 4500,
        background: "linear-gradient(135deg, #faf8f3 0%, #f0ebe0 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: mob ? "20px" : "40px",
        opacity: fadingOut ? 0 : 1,
        transition: "opacity 250ms cubic-bezier(0.4, 0, 0.2, 1)",
        pointerEvents: fadingOut ? "none" : "auto",
      }}
    >
      {/* Glow ambient effect derriere le compagnon */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -55%)",
        width: mob ? 320 : 480,
        height: mob ? 320 : 480,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(217, 119, 87, 0.15) 0%, rgba(217, 119, 87, 0) 70%)",
        animation: "nuviLoadingPulse 4s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      {/* Companion + messages container */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: mob ? 32 : 48,
        maxWidth: 600,
        width: "100%",
        position: "relative",
        zIndex: 1,
      }}>
        {/* NuviCompanion en mode loading (30s synchronisé) */}
        <div style={{
          width: companionSize,
          height: companionSize,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          filter: "drop-shadow(0 8px 24px rgba(15, 15, 18, 0.12))",
        }}>
          <NuviCompanion
            size={companionSize}
            mode="loading"
            cycleDuration={30}
          />
        </div>

        {/* NuviLoadingMessages (copy psychologique) */}
        <div style={{
          width: "100%",
          minHeight: mob ? 100 : 120,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <NuviLoadingMessages
            series={series}
            user={user}
            cycleDuration={18}
          />
        </div>

        {/* Subtle progress indicator */}
        <div style={{
          width: mob ? 120 : 160,
          height: 2,
          background: "rgba(15, 15, 18, 0.08)",
          borderRadius: 999,
          overflow: "hidden",
          position: "relative",
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: "30%",
            background: "linear-gradient(90deg, #d97757, #b91c8c)",
            borderRadius: 999,
            animation: "nuviLoadingBar 1.6s ease-in-out infinite",
          }} />
        </div>
      </div>

      <style>{`
        @keyframes nuviLoadingPulse {
          0%, 100% { transform: translate(-50%, -55%) scale(1); opacity: 0.6; }
          50% { transform: translate(-50%, -55%) scale(1.1); opacity: 1; }
        }
        @keyframes nuviLoadingBar {
          0% { left: -30%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
