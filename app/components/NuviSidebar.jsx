"use client";
import React, { useState } from "react";

/**
 * NuviSidebar — Sidebar verticale gauche (Apple-like)
 *
 * Layout :
 *   - Collapsed : 56px (icônes seules)
 *   - Expanded : 240px (icônes + labels)
 *   - Expand au hover (200ms ease)
 *
 * Sections :
 *   - Top : 8 icônes principales (navigation + features)
 *   - Bottom : 1 icône paramètres
 *
 * Props :
 *   - active: string (key de la section active)
 *   - onSelect: (key) => void
 *   - lang: "fr" | "en"
 *   - onCoachOpen: () => void  (ouverture directe du Coach)
 *   - onSettingsOpen: () => void
 *   - hasNotification: { coach: bool, ... } (badge rouge)
 */
export default function NuviSidebar({
  active = "home",
  onSelect = () => {},
  lang = "fr",
  onCoachOpen,
  onSettingsOpen,
  hasNotification = {},
}) {
  const [expanded, setExpanded] = useState(false);

  // Couleurs Nuvi (design system)
  const Cream = "#faf8f3";
  const CreamSoft = "#f6f2e8";
  const Paper = "#ffffff";
  const Ink = "#0f0f12";
  const InkMuted = "#5a5a62";
  const Hairline = "#e8e3d6";
  const Coral = "#d97757";

  // Labels FR/EN
  const labels = {
    fr: {
      home: "Accueil",
      coach: "Coach",
      target: "Match offre",
      pack: "Pack candidature",
      score: "Score",
      cvs: "Mes CV",
      design: "Design",
      tracking: "Candidatures",
      settings: "Réglages",
    },
    en: {
      home: "Home",
      coach: "Coach",
      target: "Match",
      pack: "Application Pack",
      score: "Score",
      cvs: "My CVs",
      design: "Design",
      tracking: "Applications",
      settings: "Settings",
    },
  };
  const L = labels[lang] || labels.fr;

  // Icônes (SVG inline, style Apple "stroke 1.5px")
  const Icons = {
    home: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1V9.5z"/>
      </svg>
    ),
    coach: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
    target: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <circle cx="12" cy="12" r="5"/>
        <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
      </svg>
    ),
    pack: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/>
      </svg>
    ),
    score: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"/>
        <path d="M7 16l4-4 4 4 5-5"/>
      </svg>
    ),
    cvs: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    ),
    design: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r="2.5"/>
        <circle cx="17.5" cy="10.5" r="2.5"/>
        <circle cx="8.5" cy="7.5" r="2.5"/>
        <circle cx="6.5" cy="12.5" r="2.5"/>
        <path d="M12 22a10 10 0 110-20 7 7 0 017 7c0 1.5-1.2 2.5-2.5 2.5H14a2 2 0 00-2 2 2 2 0 002 2 2 2 0 010 4z"/>
      </svg>
    ),
    tracking: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    settings: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
  };

  // Items principaux (top)
  const topItems = [
    { key: "home", label: L.home },
    { key: "coach", label: L.coach },
    { key: "target", label: L.target },
    { key: "pack", label: L.pack },
    { key: "score", label: L.score },
    { key: "cvs", label: L.cvs },
    { key: "design", label: L.design },
    { key: "tracking", label: L.tracking },
  ];

  const handleSelect = (key) => {
    if (key === "coach" && onCoachOpen) {
      onCoachOpen();
      return;
    }
    if (key === "settings" && onSettingsOpen) {
      onSettingsOpen();
      return;
    }
    onSelect(key);
  };

  // Item style
  const itemStyle = (isActive) => ({
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "10px 12px",
    margin: "2px 8px",
    borderRadius: 10,
    cursor: "pointer",
    background: isActive ? CreamSoft : "transparent",
    color: isActive ? Ink : InkMuted,
    transition: "all 180ms cubic-bezier(0.22, 1, 0.36, 1)",
    fontFamily: "'Inter', -apple-system, sans-serif",
    fontSize: 13,
    fontWeight: isActive ? 600 : 500,
    whiteSpace: "nowrap",
    overflow: "hidden",
    position: "relative",
  });

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        width: expanded ? 240 : 56,
        height: "100vh",
        background: Paper,
        borderRight: "1px solid " + Hairline,
        display: "flex",
        flexDirection: "column",
        transition: "width 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        overflow: "hidden",
        flexShrink: 0,
        zIndex: 50,
      }}
    >
      {/* Top items */}
      <div style={{ flex: 1, paddingTop: 16, overflowY: "auto" }}>
        {topItems.map((item) => {
          const isActive = active === item.key;
          const hasNotif = hasNotification[item.key];
          return (
            <div
              key={item.key}
              role="button"
              tabIndex={0}
              onClick={() => handleSelect(item.key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelect(item.key);
                }
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = CreamSoft;
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
              style={itemStyle(isActive)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <span style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 20,
                height: 20,
                flexShrink: 0,
                position: "relative",
              }}>
                {Icons[item.key]}
                {hasNotif && (
                  <span style={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    width: 7,
                    height: 7,
                    background: Coral,
                    borderRadius: "50%",
                    border: "1.5px solid " + Paper,
                  }} />
                )}
              </span>
              <span style={{
                opacity: expanded ? 1 : 0,
                transition: "opacity 150ms ease " + (expanded ? "60ms" : "0ms"),
                pointerEvents: expanded ? "auto" : "none",
              }}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom : Settings */}
      <div style={{ borderTop: "1px solid " + Hairline, padding: "8px 0" }}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleSelect("settings")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleSelect("settings");
            }
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = CreamSoft;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
          style={itemStyle(false)}
          aria-label={L.settings}
        >
          <span style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 20,
            height: 20,
            flexShrink: 0,
          }}>
            {Icons.settings}
          </span>
          <span style={{
            opacity: expanded ? 1 : 0,
            transition: "opacity 150ms ease " + (expanded ? "60ms" : "0ms"),
            pointerEvents: expanded ? "auto" : "none",
          }}>
            {L.settings}
          </span>
        </div>
      </div>
    </aside>
  );
}
