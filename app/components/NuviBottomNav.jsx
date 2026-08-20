"use client";
import React, { useState, useEffect, useRef } from "react";

/**
 * NuviBottomNav — Bottom navigation mobile (5 icônes)
 *
 * Style : Apple Human Interface Guidelines
 * - Icônes 24px
 * - Labels 10px en dessous
 * - Active = Coral
 * - Inactive = InkMuted
 *
 * Les 5 icônes principales (espace contraint mobile) :
 *   1. CV (home, vue principale)
 *   2. Coach (chat IA)
 *   3. Match (cibler)
 *   4. Pack (candidature)
 *   5. Plus (drawer pour le reste)
 *
 * Props :
 *   - active: string (key active)
 *   - onSelect: (key) => void
 *   - lang: "fr" | "en"
 *   - onCoachOpen: () => void
 */
export default function NuviBottomNav({
  active = "home",
  onSelect = () => {},
  lang = "fr",
  onCoachOpen,
  onSettingsOpen,
  onReset,
  suggestedAction = null,
  hasNotification = {},
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [suggestDismissed, setSuggestDismissed] = useState(false);

  // La barre de nav et la barre de suggestion sont en position fixed et
  // recouvraient le bas du contenu : le champ "annees d'experience" passait
  // sous la suggestion, les boutons de theme sous la nav. Le padding bas du
  // contenu etait fige a 96px alors que le mobilier fait 70px + la hauteur
  // reelle de la suggestion. On publie la hauteur mesuree, le contenu s'y
  // adapte (voir --nuvi-bottom-inset dans page.jsx).
  const suggestRef = useRef(null);

  // Si Nuvi change de suggestion, on re-affiche (meme si l'user avait ferme
  // l'ancienne). Une nouvelle suggestion merite une nouvelle chance.
  const suggestLabel = suggestedAction && suggestedAction.label;
  useEffect(() => {
    setSuggestDismissed(false);
  }, [suggestLabel]);

  // Couleurs Nuvi (CSS variables - support dark mode)
  const Cream = "var(--nuvi-cream)";
  const CreamSoft = "var(--nuvi-cream-soft)";
  const Paper = "var(--nuvi-paper)";
  const Ink = "var(--nuvi-ink)";
  const InkMuted = "var(--nuvi-ink-muted)";
  const Hairline = "var(--nuvi-hairline)";
  const Coral = "var(--nuvi-coral)";

  // Labels
  const labels = {
    fr: {
      home: "CV",
      coach: "Coach",
      target: "Cibler",
      pack: "Pack",
      more: "Plus",
      score: "Score",
      cvs: "Mes CV",
      design: "Design",
      tracking: "Suivi",
      settings: "Réglages",
      reset: "Reset",
    },
    en: {
      home: "CV",
      coach: "Coach",
      target: "Match",
      pack: "Pack",
      more: "More",
      score: "Score",
      cvs: "My CVs",
      design: "Design",
      tracking: "Tracking",
      settings: "Settings",
      reset: "Reset",
    },
  };
  const L = labels[lang] || labels.fr;

  // Icônes (réutilisé du NuviSidebar mais 22px)
  const Icons = {
    home: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    ),
    coach: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
    target: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <circle cx="12" cy="12" r="5"/>
        <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
      </svg>
    ),
    pack: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/>
      </svg>
    ),
    more: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5" cy="12" r="1.5" fill="currentColor"/>
        <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
        <circle cx="19" cy="12" r="1.5" fill="currentColor"/>
      </svg>
    ),
    score: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"/>
        <path d="M7 16l4-4 4 4 5-5"/>
      </svg>
    ),
    cvs: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="14" height="18" rx="1.5"/>
        <rect x="7" y="6" width="14" height="18" rx="1.5" opacity="0.5"/>
      </svg>
    ),
    design: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <circle cx="12" cy="9" r="1" fill="currentColor"/>
        <circle cx="9" cy="12" r="1" fill="currentColor"/>
        <circle cx="15" cy="12" r="1" fill="currentColor"/>
      </svg>
    ),
    tracking: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
      </svg>
    ),
    settings: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
    reset: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 2v6h6"/>
        <path d="M3 13a9 9 0 103-7.7L3 8"/>
      </svg>
    ),
  };

  // 5 items principaux du bottom nav
  const mainItems = [
    { key: "home", label: L.home },
    { key: "coach", label: L.coach, special: true }, // Coach déclenche openCoach
    { key: "target", label: L.target },
    { key: "pack", label: L.pack },
    { key: "more", label: L.more, isMore: true },
  ];

  // Items du drawer "Plus" (TOUT est accessible : amelioration 2 "Plus complet")
  const drawerItems = [
    { key: "score", label: L.score },
    { key: "cvs", label: L.cvs },
    { key: "design", label: L.design },
    { key: "tracking", label: L.tracking },
    { key: "settings", label: L.settings, isSettings: true },
    { key: "reset", label: L.reset, isReset: true, danger: true },
  ];

  const handleSelect = (item) => {
    if (item.isMore) {
      setDrawerOpen(true);
      return;
    }
    if (item.key === "coach" && onCoachOpen) {
      onCoachOpen();
      return;
    }
    if (item.key === "settings" && onSettingsOpen) {
      setDrawerOpen(false);
      onSettingsOpen();
      return;
    }
    if (item.key === "reset" && onReset) {
      setDrawerOpen(false);
      onReset();
      return;
    }
    setDrawerOpen(false);
    onSelect(item.key);
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    const NAV_H = 70;
    const apply = () => {
      const el = suggestRef.current;
      const extra = el ? el.getBoundingClientRect().height + 12 : 0;
      document.documentElement.style.setProperty(
        "--nuvi-bottom-inset", (NAV_H + extra) + "px");
    };
    apply();
    let ro = null;
    if (suggestRef.current && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(apply);
      ro.observe(suggestRef.current);
    }
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      if (ro) ro.disconnect();
    };
  }, [suggestedAction, suggestDismissed, drawerOpen]);

  return (
    <>
      {/* Drawer "Plus" en overlay */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 15, 18, 0.4)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            zIndex: 95,
            animation: "nuviDrawerFadeIn 220ms ease-out",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: "var(--nuvi-glass-bg, " + Paper + ")",
              WebkitBackdropFilter: "blur(28px) saturate(160%)",
              backdropFilter: "blur(28px) saturate(160%)",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderTop: "0.5px solid rgba(255,255,255,0.7)",
              paddingTop: 8,
              paddingBottom: 24,
              boxShadow: "inset 0 1px 1px rgba(255,255,255,0.6), 0 -8px 32px rgba(0,0,0,0.12)",
              animation: "nuviDrawerSlideUp 280ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {/* Handle */}
            <div style={{
              width: 36,
              height: 4,
              background: Hairline,
              borderRadius: 999,
              margin: "0 auto 16px",
            }} />

            {/* Items */}
            {drawerItems.map((item) => (
              <button
                key={item.key}
                onClick={() => handleSelect(item)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 24px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: item.danger ? "#c0392b" : Ink,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 15,
                  fontWeight: 500,
                  textAlign: "left",
                }}
              >
                <span style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  color: item.danger ? "#c0392b" : InkMuted,
                  flexShrink: 0,
                }}>
                  {Icons[item.key]}
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* [Dock contextuel 2026-05-20] Suggestion Nuvi : 1 action mise en
          avant selon l'etat du CV. Dismissable (amelioration 1). L'user reste
          libre : la barre 5-icones en dessous donne acces a tout. */}
      {suggestedAction && !suggestDismissed && !drawerOpen && (
        <div ref={suggestRef} style={{
          position: "fixed",
          bottom: "calc(70px + env(safe-area-inset-bottom, 0px))",
          left: 12, right: 12,
          zIndex: 79,
          display: "flex", alignItems: "center", gap: 10,
          background: "var(--nuvi-glass-bg, " + Paper + ")",
          WebkitBackdropFilter: "blur(28px) saturate(160%)",
          backdropFilter: "blur(28px) saturate(160%)",
          border: "0.5px solid rgba(255,255,255,0.7)",
          borderRadius: 18,
          padding: "10px 12px",
          boxShadow: "inset 0 1px 1px rgba(255,255,255,0.7), 0 8px 28px rgba(120,90,60,0.12)",
          animation: "nuviSuggestIn 320ms cubic-bezier(0.22,1,0.36,1)",
        }}>
          {/* Oeil Nuvi (petit) */}
          <span style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "var(--nuvi-purple-soft, #ede9fe)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5b3df5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <circle cx="12" cy="12" r="3" fill="#5b3df5"/>
            </svg>
          </span>
          {/* Bouton action principal (gradient) */}
          <button
            onClick={() => { if (suggestedAction.onClick) suggestedAction.onClick(); }}
            style={{
              flex: 1,
              background: "linear-gradient(135deg, #5b3df5, #b91c8c)",
              color: "#fff", border: "none", borderRadius: 12,
              padding: "11px 14px", minHeight: 44, boxSizing: "border-box",
              fontSize: 14, fontWeight: 600,
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
              textAlign: "center",
            }}>
            {suggestedAction.label}
          </button>
          {/* Fermer la suggestion (dismissable) */}
          <button
            onClick={() => setSuggestDismissed(true)}
            aria-label={lang === "fr" ? "Masquer la suggestion" : "Dismiss"}
            style={{
              // Cible 44px (WCAG 2.5.5) ; le rond visible reste petit grace au
              // fond transparent, seule la zone tactile grandit.
              width: 44, height: 44, borderRadius: "50%",
              background: "transparent", border: "none", cursor: "pointer",
              color: InkMuted, fontSize: 16, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            ×
          </button>
        </div>
      )}

      {/* Bottom nav */}
      <nav style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 70,
        background: "var(--nuvi-glass-bg, " + Paper + ")",
        WebkitBackdropFilter: "blur(28px) saturate(150%)",
        backdropFilter: "blur(28px) saturate(150%)",
        borderTop: "0.5px solid rgba(255,255,255,0.6)",
        display: "flex",
        alignItems: "stretch",
        zIndex: 80,
        paddingBottom: "env(safe-area-inset-bottom, 0)",
      }}>
        {mainItems.map((item) => {
          const isActive = active === item.key;
          const hasNotif = hasNotification[item.key];
          return (
            <button
              key={item.key}
              onClick={() => handleSelect(item)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: isActive ? Coral : InkMuted,
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                fontWeight: isActive ? 600 : 500,
                letterSpacing: 0.2,
                position: "relative",
                transition: "color 180ms ease",
                padding: "8px 4px",
              }}
            >
              <span style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}>
                {Icons[item.key]}
                {hasNotif && (
                  <span style={{
                    position: "absolute",
                    top: -2,
                    right: -4,
                    width: 8,
                    height: 8,
                    background: Coral,
                    borderRadius: "50%",
                    border: "2px solid " + Paper,
                  }} />
                )}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <style>{`
        @keyframes nuviDrawerFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes nuviDrawerSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes nuviSuggestIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
