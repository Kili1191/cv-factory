"use client";
import React, { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";

import { Trans, Cream, CreamSoft, Paper, Ink, InkMuted, Hairline, Coral, Magenta, Purple } from "./tokens";
const NuviLogo = dynamic(() => import("./NuviLogo"), { ssr: false });
const DesignPaletteIcon = dynamic(() => import("./DesignPaletteIcon"), { ssr: false });
const AccountBadge = dynamic(() => import("./AccountBadge"), { ssr: false });

export default function NuviSidebar({
  // Vrai des qu'un panneau est ouvert : le survol n'ouvre plus de
  // sous-menu, sinon il reapparait derriere le panneau.
  panneauOuvert = false,
  active = "home",
  onSelect = () => {},
  onSubSelect = () => {},
  lang = "en",
  onCoachOpen,
  onSettingsOpen,
  onReset,
  hasNotification = {},
  // Le compte. Absent tant qu'aucun serveur n'est configure : la barre se tait
  // plutot que de proposer une entree qui ne repondrait pas.
  cloudEnabled = false,
  cloudUser = null,
  cloudStatus = "off",
  cloudLastSyncAt = null,
  cloudError = null,
  gmailConnected = false,
  onSignIn = () => {},
  onSignOut = () => {},
  onConnectGmail = () => {},
}) {
  const [expanded, setExpanded] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const closeTimerRef = useRef(null);


  useEffect(() => {
    const onTutHover = (e) => {
      if (e && e.detail && e.detail.key !== undefined) {
        setHoveredItem(e.detail.key);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("nuvi-tutorial-hover", onTutHover);
      return () => window.removeEventListener("nuvi-tutorial-hover", onTutHover);
    }
  }, []);


  const itemColors = {
    home: Coral,
    coach: Purple,
    edit: Coral,
    adjust: Purple,
    jobs: Coral,
    target: Coral,
    pack: Purple,
    live: Magenta,
    audits: Purple,
    cvs: Coral,
    design: Coral,
    tracking: Coral,
    settings: InkMuted,
  };

  const labels = {
    fr: {
      home: "Accueil", coach: "Coach", edit: "Editer", adjust: "Ajuster",
      jobs: "Trouver un poste", target: "Match offre", pack: "Pack candidature",
      live: "Entretien live",
      audits: "Score & Audits", cvs: "Mes CV", design: "Design",
      tracking: "Candidatures", settings: "Reglages",
      replay: "Reset",
      edit_id: "Identite", edit_exp: "Experiences", edit_edu: "Formation", edit_sk: "Competences",
      audits_score: "Score recruteur", audits_pos: "Positionnement",
      audits_truth: "Truth Check", audits_gap: "Lisser le parcours",
      audits_ats: "Audit ATS", audits_interview: "Preparer l'entretien",
      audits_live: "Assistant live",
      cvs_list: "Liste de mes CV", cvs_versions: "Versions",
      cvs_compare: "Comparer", cvs_templates: "Modeles",
      design_custom: "Personnaliser", design_translate: "Traduction",
      design_linkedin: "Profil LinkedIn",
    },
    en: {
      home: "Home", coach: "Coach", edit: "Edit", adjust: "Tweak",
      jobs: "Find a role", target: "Match", pack: "Application Pack",
      live: "Live interview",
      audits: "Score & Audits", cvs: "My CVs", design: "Design",
      tracking: "Applications", settings: "Settings",
      replay: "Reset",
      edit_id: "Identity", edit_exp: "Experience", edit_edu: "Education", edit_sk: "Skills",
      audits_score: "Recruiter score", audits_pos: "Positioning",
      audits_truth: "Truth Check", audits_gap: "Gap repair",
      audits_ats: "ATS audit", audits_interview: "Interview prep",
      audits_live: "Live assist",
      cvs_list: "My CVs", cvs_versions: "Versions",
      cvs_compare: "Compare", cvs_templates: "Templates",
      design_custom: "Customize", design_translate: "Translate",
      design_linkedin: "LinkedIn profile",
    },
  };
  const L = labels[lang] || labels.fr;

  const Icons = {
    home: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1V9.5z"/></svg>),
    coach: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>),
    edit: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>),
    adjust: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 008.5 14.063l-6.135-1.582a.5.5 0 010-.962L8.5 9.936A2 2 0 009.937 8.5l1.582-6.135a.5.5 0 01.962 0L14.063 8.5A2 2 0 0015.5 9.937l6.135 1.582a.5.5 0 010 .962L15.5 14.063a2 2 0 00-1.437 1.437l-1.582 6.135a.5.5 0 01-.962 0z"/></svg>),
    jobs: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.2" y2="16.2"/></svg>),
    target: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>),
    pack: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/></svg>),
    live: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 013 3v6a3 3 0 01-6 0V5a3 3 0 013-3z"/><path d="M19 10v1a7 7 0 01-14 0v-1"/><line x1="12" y1="18" x2="12" y2="22"/><circle cx="19.5" cy="4.5" r="2" fill="currentColor" stroke="none"/></svg>),
    audits: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 5-5"/></svg>),
    cvs: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>),
    design: <DesignPaletteIcon size={20} />,
    tracking: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>),
    settings: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>),
    replay: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6"/><path d="M3 13a9 9 0 103-7.7L3 8"/></svg>),
  };

  const SubIcons = {
    id: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0114 0v2"/></svg>),
    exp: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>),
    edu: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>),
    sk: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>),
    score: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
    pos: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>),
    truth: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h6"/><path d="M16 19h6"/><path d="M19 16v6"/></svg>),
    gap: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3-9 4 18 3-9h4"/></svg>),
    list: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>),
    versions: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>),
    compare: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 00-2 2v14a2 2 0 002 2h3"/><path d="M16 3h3a2 2 0 012 2v14a2 2 0 01-2 2h-3"/><path d="M12 3v18"/></svg>),
    templates: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>),
    custom: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/></svg>),
    ats: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13h2"/><path d="M9 17h6"/></svg>),
    live: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M5.5 5.5a9 9 0 000 13M18.5 5.5a9 9 0 010 13"/><path d="M2.5 2.5a13 13 0 000 19M21.5 2.5a13 13 0 010 19"/></svg>),
    interview: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 013 3v6a3 3 0 01-6 0V5a3 3 0 013-3z"/><path d="M19 10v1a7 7 0 01-14 0v-1"/><line x1="12" y1="18" x2="12" y2="22"/></svg>),
    linkedin: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-11h4v1.5"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>),
    translate: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>),
  };

  const subItemsMap = {
    edit: [
      { key: "id",  label: L.edit_id,  icon: SubIcons.id,  isAI: false },
      { key: "exp", label: L.edit_exp, icon: SubIcons.exp, isAI: false },
      { key: "edu", label: L.edit_edu, icon: SubIcons.edu, isAI: false },
      { key: "sk",  label: L.edit_sk,  icon: SubIcons.sk,  isAI: false },
    ],
    audits: [
      { key: "score", label: L.audits_score, icon: SubIcons.score, isAI: false },
      { key: "pos",   label: L.audits_pos,   icon: SubIcons.pos,   isAI: true  },
      { key: "truth", label: L.audits_truth, icon: SubIcons.truth, isAI: true  },
      { key: "gap",   label: L.audits_gap,   icon: SubIcons.gap,   isAI: true  },
      { key: "ats",   label: L.audits_ats,   icon: SubIcons.ats,   isAI: true  },
      { key: "interview", label: L.audits_interview, icon: SubIcons.interview, isAI: true },
    ],
    cvs: [
      { key: "list",      label: L.cvs_list,      icon: SubIcons.list,      isAI: false },
      { key: "versions",  label: L.cvs_versions,  icon: SubIcons.versions,  isAI: false },
      { key: "compare",   label: L.cvs_compare,   icon: SubIcons.compare,   isAI: false },
      { key: "templates", label: L.cvs_templates, icon: SubIcons.templates, isAI: false },
    ],
    design: [
      { key: "custom",    label: L.design_custom,    icon: SubIcons.custom,    isAI: false },
      { key: "translate", label: L.design_translate, icon: SubIcons.translate, isAI: true  },
      { key: "linkedin",  label: L.design_linkedin,  icon: SubIcons.linkedin,  isAI: true  },
    ],
  };

  const topItems = [
    { key: "home",     label: L.home,     hasSub: false },
    { key: "coach",    label: L.coach,    hasSub: false },
    { key: "edit",     label: L.edit,     hasSub: true  },
    { key: "adjust",   label: L.adjust,   hasSub: false },
    { key: "jobs",     label: L.jobs,     hasSub: false },
    { key: "target",   label: L.target,   hasSub: false },
    { key: "pack",     label: L.pack,     hasSub: false },
    { key: "live",     label: L.live,     hasSub: false },
    { key: "audits",   label: L.audits,   hasSub: true  },
  ];
  const middleItems = [
    { key: "cvs",      label: L.cvs,      hasSub: true  },
    { key: "design",   label: L.design,   hasSub: true  },
    { key: "tracking", label: L.tracking, hasSub: false },
  ];

  const handleSelect = (key) => {
    if (key === "coach" && onCoachOpen) { onCoachOpen(); return; }
    if (key === "settings" && onSettingsOpen) { onSettingsOpen(); return; }
    onSelect(key);
  };

  const handleSubSelect = (parentKey, subKey) => {
    onSubSelect(parentKey, subKey);
    setHoveredItem(null);
  };

  const handleItemMouseEnter = (key, hasSub) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    // LA CASCADE VENAIT D'ICI
    //
    // Le sous-menu s'ouvre au survol. Une fois un panneau ouvert, la souris
    // qui remonte vers lui traverse la barre, reveille ce gestionnaire, et le
    // sous-menu se rouvre DERRIERE le panneau. On voyait alors le menu DESIGN
    // sous la feuille Apparence.
    //
    // Aucun test ne l'attrapait : "un panneau a la fois" verifie que deux
    // panneaux ne coexistent pas apres des CLICS, et ce menu s'ouvre sans
    // clic. Il fallait repasser la souris sur la barre, ce que personne ne
    // scriptait et que tout le monde fait.
    if (panneauOuvert) { setHoveredItem(null); return; }
    if (hasSub) {
      setHoveredItem(key);
    } else {
      setHoveredItem(null);
    }
  };

  const handleItemMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setHoveredItem(null);
    }, 600);
  };

  const handlePanelMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handlePanelMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setHoveredItem(null);
    }, 600);
  };

  useEffect(() => {
    if (panneauOuvert) setHoveredItem(null);
  }, [panneauOuvert]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const itemStyle = (isActive, accentColor) => ({
    display: "flex",
    alignItems: "center",
    gap: 14,
    // 40px de haut : sous le minimum tactile de 44px (WCAG 2.5.5).
    // La barre est repliee en icones, donc la cible etait un carre de 40.
    padding: "10px 12px",
    minHeight: 44,
    minWidth: 44,
    boxSizing: "border-box",
    margin: "2px 8px",
    borderRadius: 10,
    cursor: "pointer",
    background: isActive ? accentColor + "15" : "transparent",
    color: isActive ? accentColor : InkMuted,
    transition: Trans(["background","color","border-color","box-shadow","transform","opacity"], "fast"),
    fontFamily: "'Inter', -apple-system, sans-serif",
    fontSize: 13,
    fontWeight: isActive ? 600 : 500,
    whiteSpace: "nowrap",
    overflow: "hidden",
    position: "relative",
  });

  const subChevron = (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto", opacity: 0.4 }}>
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );

  const renderItem = (item) => {
    const isActive = active === item.key;
    const hasNotif = hasNotification[item.key];
    const accentColor = itemColors[item.key] || Coral;
    return (
      <div
        key={item.key}
        role="button"
        tabIndex={0}
        onClick={() => !item.hasSub && handleSelect(item.key)}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !item.hasSub) {
            e.preventDefault();
            handleSelect(item.key);
          }
        }}
        onMouseEnter={(e) => {
          handleItemMouseEnter(item.key, item.hasSub);
          if (!isActive) {
            e.currentTarget.style.background = accentColor + "0a";
            e.currentTarget.style.color = accentColor;
          }
        }}
        onMouseLeave={(e) => {
          handleItemMouseLeave();
          if (!isActive) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = InkMuted;
          }
        }}
        style={itemStyle(isActive, accentColor)}
        data-nv-nav={item.key}
        aria-label={item.label}
        aria-current={isActive ? "page" : undefined}
        aria-haspopup={item.hasSub ? "menu" : undefined}
        aria-expanded={item.hasSub && hoveredItem === item.key ? "true" : undefined}
      >
        <span style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          flexShrink: 0,
          position: "relative",
          color: "inherit",
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
          flex: 1,
          opacity: expanded ? 1 : 0,
          transition: "opacity 150ms ease " + (expanded ? "60ms" : "0ms"),
          pointerEvents: expanded ? "auto" : "none",
        }}>
          {item.label}
        </span>
        {item.hasSub && expanded && subChevron}
      </div>
    );
  };

  return (
    <>
      {/* L'espaceur. Il tient la place de la barre repliee et ne bouge
          jamais : c'est lui qui garantit que rien ne se decale au survol. */}
      <div aria-hidden="true" style={{ width: 56, flexShrink: 0 }}/>
      {/* LA BARRE OUVERTE RECOUVRAIT LE NOM DU DOCUMENT
          Se poser au-dessus a resolu le vrai probleme - le CV ne se decale
          plus au survol - mais la ligne d'en-tete, elle, commence a 78px et
          se faisait donc avaler : "Kilian Maisonnette" se lisait "ette".
          On publie la largeur reelle de la barre ; l'en-tete s'ecarte de
          juste ce qu'il faut, et le document ne bouge toujours pas. */}
      <aside
        onMouseEnter={() => {
          setExpanded(true);
          if (typeof document !== "undefined") {
            document.documentElement.style.setProperty("--nuvi-rail", "240px");
          }
        }}
        onMouseLeave={() => {
          setExpanded(false);
          if (typeof document !== "undefined") {
            document.documentElement.style.setProperty("--nuvi-rail", "56px");
          }
        }}
        style={{
          // LA BARRE SE POSE PAR-DESSUS, ELLE NE POUSSE PLUS
          //
          // Elle etait dans le flux, en position relative, et sa largeur
          // passait de 56 a 240 au survol. Tout ce qui suit se decalait donc
          // de 92px : mesure a 1440x900, le CV sautait de x=213 a x=305 des
          // que le curseur passait pres du bord gauche, et revenait en
          // partant.
          //
          // Ce n'est pas un detail d'animation. On lit son CV, la souris
          // derive vers la gauche, et le document bondit sous les yeux. Si
          // l'on etait en train de viser un mot, on le rate.
          //
          // Elle est donc fixee et se pose AU-DESSUS du contenu quand elle
          // s'ouvre ; un espaceur de 56px garde sa place dans le flux, qui ne
          // bouge plus jamais. L'ombre n'apparait qu'ouverte : c'est ce qui
          // dit qu'on est au-dessus de quelque chose, et non a cote.
          position: "fixed",
          top: 0,
          left: 0,
          width: expanded ? 240 : 56,
          height: "100vh",
          boxShadow: expanded
            ? "0 0 0 1px rgba(0,0,0,.04), 18px 0 46px rgba(26,24,22,.10)"
            : "inset -1px 0 1px rgba(255,255,255,0.4)",
          // OPAQUE UNE FOIS OUVERTE, ET C'EST LA CONSEQUENCE DU RESTE
          //
          // Le verre translucide convenait tant que la barre etait A COTE du
          // contenu : il n'y avait rien derriere elle. Depuis qu'elle se pose
          // AU-DESSUS, la ligne d'en-tete et le CV transparaissent derriere
          // les libelles - constate a l'ecran, "Jane Doe" lisible a travers
          // "Home" et "Coach".
          //
          // C'est exactement le defaut corrige sur l'ecran d'assistance
          // d'entretien : un fond a 95% laisse passer assez d'un texte sombre
          // pour qu'on le lise. Repliee elle garde son verre, puisqu'elle ne
          // recouvre plus rien.
          background: expanded
            ? "var(--nuvi-paper, #fff)"
            : "var(--nuvi-glass-bg, " + Paper + ")",
          WebkitBackdropFilter: "blur(24px) saturate(160%)",
          backdropFilter: "blur(24px) saturate(160%)",
          borderRight: "0.5px solid rgba(255,255,255,0.6)",
          display: "flex",
          flexDirection: "column",
          transition: "width 220ms cubic-bezier(0.22, 1, 0.36, 1)",
          overflow: "visible",
          flexShrink: 0,
          zIndex: 50,
        }}
      >
        <div style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: expanded ? "flex-start" : "center",
          paddingLeft: expanded ? 18 : 0,
          paddingRight: expanded ? 18 : 0,
          flexShrink: 0,
          borderBottom: "0.5px solid rgba(255,255,255,0.5)",
          overflow: "hidden",
          transition: "padding 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}>
          <NuviLogo
            size={expanded ? 32 : 26}
            inkColor={Ink}
          />
        </div>

        <div style={{ paddingTop: 16, overflowY: "auto", overflowX: "visible" }}>
          {topItems.map(renderItem)}
        </div>

        <div style={{
          height: 1,
          background: Hairline,
          margin: "8px 14px",
        }} />

        <div style={{ flex: 1, overflowY: "auto", overflowX: "visible" }}>
          {middleItems.map(renderItem)}
        </div>

        <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.5)", padding: "8px 0" }}>
          {onReset && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => onReset()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onReset();
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = InkMuted + "0a";
                e.currentTarget.style.color = Ink;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = InkMuted;
              }}
              style={itemStyle(false, InkMuted)}
              data-nv-nav="reset"
              aria-label={L.replay}
              title={L.replay}
            >
              <span style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 20,
                height: 20,
                flexShrink: 0,
                color: "inherit",
              }}>
                {Icons.replay}
              </span>
              <span style={{
                opacity: expanded ? 1 : 0,
                transition: "opacity 150ms ease " + (expanded ? "60ms" : "0ms"),
                pointerEvents: expanded ? "auto" : "none",
              }}>
                {L.replay}
              </span>
            </div>
          )}
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
              handleItemMouseEnter("settings", false);
              e.currentTarget.style.background = InkMuted + "0a";
              e.currentTarget.style.color = Ink;
            }}
            onMouseLeave={(e) => {
              handleItemMouseLeave();
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = InkMuted;
            }}
            style={itemStyle(false, InkMuted)}
            data-nv-nav="settings"
            aria-label={L.settings}
          >
            <span style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 20,
              height: 20,
              flexShrink: 0,
              color: "inherit",
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

          {/* Le compte ferme la barre, sous les Reglages : c'est la place que
              tout le monde connait deja, et elle reste visible en permanence. */}
          {cloudEnabled && (
            <AccountBadge
              user={cloudUser}
              status={cloudStatus}
              lastSyncAt={cloudLastSyncAt}
              error={cloudError}
              gmailConnected={gmailConnected}
              expanded={expanded}
              lang={lang}
              onSignIn={onSignIn}
              onSignOut={onSignOut}
              onConnectGmail={onConnectGmail}
            />
          )}
        </div>
      </aside>

      {hoveredItem && subItemsMap[hoveredItem] && (
        <FloatingPanel
          parentKey={hoveredItem}
          subItems={subItemsMap[hoveredItem]}
          accentColor={itemColors[hoveredItem]}
          parentLabel={L[hoveredItem]}
          onSelect={(subKey) => handleSubSelect(hoveredItem, subKey)}
          onMouseEnter={handlePanelMouseEnter}
          onMouseLeave={handlePanelMouseLeave}
          sidebarExpanded={expanded}
          parentVerticalIndex={
            [...topItems, ...middleItems].findIndex(i => i.key === hoveredItem)
          }
          parentSection={
            topItems.find(i => i.key === hoveredItem) ? "top" : "middle"
          }
          colors={{ Paper, Ink, InkMuted, Hairline, Purple, Coral }}
        />
      )}
    </>
  );
}

function FloatingPanel({
  parentKey,
  subItems,
  accentColor,
  parentLabel,
  onSelect,
  onMouseEnter,
  onMouseLeave,
  sidebarExpanded,
  parentVerticalIndex,
  parentSection,
  colors,
}) {
  const { Paper, Ink, InkMuted, Hairline, Purple, Coral } = colors;

  const ITEM_HEIGHT = 44;
  const TOP_PADDING = 16;
  const TOP_ITEMS_COUNT = 7;
  const SEPARATOR_HEIGHT = 17;

  let topPosition;
  if (parentSection === "top") {
    topPosition = TOP_PADDING + parentVerticalIndex * ITEM_HEIGHT;
  } else {
    const middleIdx = parentVerticalIndex - TOP_ITEMS_COUNT;
    topPosition = TOP_PADDING + TOP_ITEMS_COUNT * ITEM_HEIGHT
                  + SEPARATOR_HEIGHT + middleIdx * ITEM_HEIGHT;
  }

  const leftPosition = sidebarExpanded ? 244 : 60;

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="menu"
      style={{
        position: "fixed",
        left: leftPosition,
        top: topPosition,
        minWidth: 220,
        maxWidth: 260,
        background: "var(--nuvi-glass-bg, " + Paper + ")",
        backdropFilter: "blur(28px) saturate(160%)",
        WebkitBackdropFilter: "blur(28px) saturate(160%)",
        border: "0.5px solid rgba(255,255,255,0.7)",
        borderRadius: 14,
        boxShadow: "inset 0 1px 1px rgba(255,255,255,0.6), 0 8px 24px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)",
        padding: 8,
        zIndex: 100,
        animation: "nuviPanelIn 320ms cubic-bezier(0.22, 1, 0.36, 1)",
        transformOrigin: "left center",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      <div style={{
        position: "absolute",
        left: -24,
        top: -8,
        width: 28,
        height: "calc(100% + 16px)",
        background: "transparent",
      }} />

      <div style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: InkMuted,
        padding: "6px 10px 8px",
        borderBottom: "0.5px solid " + Hairline,
        marginBottom: 4,
      }}>
        {parentLabel}
      </div>

      {subItems.map((sub, idx) => {
        const isStarred = idx < 2;
        const iconColor = sub.isAI ? Purple : Ink;

        return (
          <button
            key={sub.key}
            role="menuitem"
            onClick={() => onSelect(sub.key)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = accentColor + "0d";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "9px 10px",
              border: "none",
              background: "transparent",
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: isStarred ? 600 : 500,
              color: Ink,
              textAlign: "left",
              transition: "background 120ms ease-out",
            }}
          >
            <span style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 18,
              height: 18,
              color: iconColor,
              flexShrink: 0,
            }}>
              {sub.icon}
            </span>
            <span style={{ flex: 1 }}>{sub.label}</span>
            {sub.isAI && (
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.05em",
                color: Purple,
                background: Purple + "12",
                padding: "2px 6px",
                borderRadius: 4,
              }}>NUVI</span>
            )}
          </button>
        );
      })}

      <style>{`
        @keyframes nuviPanelIn {
          0% {
            opacity: 0;
            transform: translateX(-12px) scale(0.96);
            filter: blur(2px);
          }
          50% {
            opacity: 0.5;
            filter: blur(0px);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
            filter: blur(0px);
          }
        }
      `}</style>
    </div>
  );
}
