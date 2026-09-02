"use client";
import React, { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";

import { Trans, Cream, CreamSoft, Paper, Ink, InkMuted, Hairline, Coral, Magenta, Purple, CoralText, PurpleText, MagentaText } from "./tokens";

// La largeur de la barre, en un seul endroit : l'espaceur, la barre elle-meme
// et la variable CSS que lit l'en-tete doivent dire le meme nombre, sinon le
// nom du document repasse sous la navigation.
const RAIL = 244;
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
  // LA BARRE EST OUVERTE, ET ELLE LE RESTE
  //
  // Elle etait un rail de douze icones sans un mot, qui ne se depliait qu'au
  // survol. Trois consequences, constatees a l'ecran et pas supposees :
  //
  //   1. Personne ne sait ce que font les icones. Nuvi s'adresse a des gens
  //      qui cherchent un poste en salle ou en aide a domicile, pas a des
  //      habitues des barres d'outils. Un cercle dans un cercle ne dit rien.
  //   2. Rien n'indique que des libelles existent. Ce qui n'apparait qu'au
  //      survol n'existe pas pour qui ne survole pas.
  //   3. La cascade venait de la : le sous-menu s'ouvrait au survol, donc
  //      derriere le panneau qu'on venait d'ouvrir. On a soigne le symptome
  //      avec panneauOuvert ; ouvrir au clic supprime la cause.
  //
  // Une seule section reste ouverte a la fois : deux accordeons deplies
  // rendraient la liste plus longue que l'ecran.
  const [sectionOuverte, setSectionOuverte] = useState(null);


  // Le tutoriel designait une entree en simulant un survol. Il n'y a plus de
  // survol : il ouvre maintenant la section, ce qui est ce qu'il voulait
  // montrer depuis le debut.
  useEffect(() => {
    const onTutHover = (e) => {
      if (e && e.detail && e.detail.key !== undefined) {
        setSectionOuverte(e.detail.key);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("nuvi-tutorial-hover", onTutHover);
      return () => window.removeEventListener("nuvi-tutorial-hover", onTutHover);
    }
  }, []);


  // DEUX ROLES, DEUX COULEURS
  //
  // itemColors sert a la fois d'encre pour le libelle et de teinte pour
  // l'aplat de l'entree active. Ce sont deux usages differents : le corail de
  // marque donne 3,12:1 en texte sur blanc, sous le plancher AA de 4,5:1,
  // mais il est parfait a 8% d'opacite derriere. On garde donc la marque pour
  // le fond et on prend la version calibree pour l'encre.
  const encreItem = {
    home: CoralText, coach: PurpleText, edit: CoralText, adjust: PurpleText,
    jobs: CoralText, target: CoralText, pack: PurpleText, live: MagentaText,
    audits: PurpleText, cvs: CoralText, design: CoralText, tracking: CoralText,
    settings: InkMuted,
  };

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
  };

  const itemStyle = (isActive, accentColor, encre) => ({
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "calc(100% - 16px)",
    textAlign: "left",
    padding: "0 12px",
    // 44px : le minimum tactile de WCAG 2.5.5. La barre etant desormais
    // toujours large, la cible l'est aussi.
    minHeight: 44,
    boxSizing: "border-box",
    margin: "1px 8px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    background: isActive ? accentColor + "14" : "transparent",
    color: isActive ? encre : InkMuted,
    transition: Trans(["background", "color"], "fast"),
    fontFamily: "'Inter', -apple-system, sans-serif",
    fontSize: 13.5,
    fontWeight: isActive ? 600 : 500,
    position: "relative",
  });

  const chevron = (ouvert) => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      style={{
        marginLeft: "auto", opacity: 0.45, flexShrink: 0,
        transform: "rotate(" + (ouvert ? 90 : 0) + "deg)",
        transition: "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}>
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );

  const survol = (accent, encre) => ({
    onMouseEnter: (e) => {
      if (e.currentTarget.getAttribute("data-nv-actif") === "1") return;
      e.currentTarget.style.background = accent + "0d";
      e.currentTarget.style.color = encre || accent;
    },
    onMouseLeave: (e) => {
      if (e.currentTarget.getAttribute("data-nv-actif") === "1") return;
      e.currentTarget.style.background = "transparent";
      e.currentTarget.style.color = InkMuted;
    },
  });

  const pastille = (
    <span style={{
      position: "absolute", top: -2, right: -2, width: 7, height: 7,
      background: Coral, borderRadius: "50%", border: "1.5px solid " + Paper,
    }}/>
  );

  const renderItem = (item) => {
    const isActive = active === item.key;
    const accent = itemColors[item.key] || Coral;
    const encre = encreItem[item.key] || CoralText;
    const sousItems = subItemsMap[item.key];
    const ouvert = sectionOuverte === item.key;

    return (
      <div key={item.key}>
        <button
          type="button"
          onClick={() => {
            if (item.hasSub) {
              // Un accordeon a la fois : ouvrir celui-ci referme l'autre.
              setSectionOuverte(ouvert ? null : item.key);
            } else {
              handleSelect(item.key);
            }
          }}
          {...survol(accent, encre)}
          style={itemStyle(isActive, accent, encre)}
          data-nv-nav={item.key}
          data-nv-actif={isActive ? "1" : "0"}
          aria-current={isActive ? "page" : undefined}
          aria-expanded={item.hasSub ? (ouvert ? "true" : "false") : undefined}
        >
          <span style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 20, height: 20, flexShrink: 0, position: "relative",
            color: "inherit",
          }}>
            {Icons[item.key]}
            {hasNotification[item.key] && pastille}
          </span>
          {/* LE LIBELLE N'EST PLUS UNE INFOBULLE
              Il est la, tout le temps, lisible sans rien survoler. C'est la
              seule facon qu'une barre de navigation soit utilisable par
              quelqu'un qui ouvre le produit pour la premiere fois. */}
          <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.label}
          </span>
          {item.hasSub && chevron(ouvert)}
        </button>

        {/* Les sous-entrees poussent leurs voisines vers le bas au lieu de
            flotter par-dessus. Rien ne peut donc recouvrir rien. */}
        {item.hasSub && ouvert && sousItems && (
          <div role="group" aria-label={item.label} data-nv-sous={item.key} style={{
            margin: "2px 8px 6px 26px",
            paddingLeft: 12,
            borderLeft: "1.5px solid " + accent + "33",
            animation: "cvfFadeIn 180ms ease both",
          }}>
            {sousItems.map((sub) => (
              <button
                key={sub.key}
                type="button"
                onClick={() => handleSubSelect(item.key, sub.key)}
                {...survol(accent, encre)}
                data-nv-sub={item.key + ":" + sub.key}
                data-nv-actif="0"
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", textAlign: "left", border: "none",
                  background: "transparent", cursor: "pointer",
                  minHeight: 40, padding: "0 10px", borderRadius: 8,
                  color: InkMuted, fontFamily: "'Inter', -apple-system, sans-serif",
                  fontSize: 12.5, fontWeight: 500,
                  transition: Trans(["background", "color"], "fast"),
                }}>
                <span style={{ display: "flex", width: 14, height: 14, flexShrink: 0, color: "inherit" }}>
                  {sub.icon}
                </span>
                <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {sub.label}
                </span>
                {/* Ce qui coute un appel au modele le dit. Les autres entrees
                    sont instantanees et gratuites, et la difference se voit
                    avant de cliquer, pas apres. */}
                {sub.isAI && (
                  <span aria-hidden="true" style={{
                    fontSize: 9, letterSpacing: ".06em", fontWeight: 700,
                    color: PurpleText, background: Purple + "14",
                    borderRadius: 4, padding: "2px 5px", flexShrink: 0,
                  }}>{lang === "en" ? "AI" : "IA"}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const pied = (key, label, icone, onClick) => (
    <button
      type="button"
      onClick={onClick}
      {...survol(InkMuted, InkMuted)}
      style={itemStyle(false, InkMuted, InkMuted)}
      data-nv-nav={key}
      data-nv-actif="0"
    >
      <span style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 20, height: 20, flexShrink: 0, color: "inherit",
      }}>{icone}</span>
      <span style={{ flex: 1, whiteSpace: "nowrap" }}>{label}</span>
    </button>
  );

  return (
    <>
      {/* L'ESPACEUR VAUT LA LARGEUR REELLE
          La barre ne se deplie plus, donc elle ne recouvre plus rien et ne
          decale plus rien : l'espaceur lui garde exactement sa place, une fois
          pour toutes. */}
      <div aria-hidden="true" style={{ width: RAIL, flexShrink: 0 }}/>
      <aside
        aria-label={L.home}
        // LA BARRE ANNONCE QU'ELLE EST UNE SURFACE SOMBRE
        //
        // Ce n'est pas decoratif : globals.css redeclare sous cet attribut les
        // encres, le filet et le papier. Tout ce qu'on pose ici herite des
        // valeurs qui tiennent sur du sombre, au lieu de celles calibrees pour
        // du clair. Repeindre le fond sans ca aurait donne exactement le
        // defaut corrige ce matin : du texte juste sur le mauvais fond.
        data-nuvi-sombre="1"
        style={{
          position: "fixed", top: 0, left: 0, width: RAIL, height: "100vh",
          display: "flex", flexDirection: "column",
          background: Paper,
          borderRight: "1px solid rgba(0,0,0,.10)",
          zIndex: 300,
          fontFamily: "'Inter', -apple-system, sans-serif",
        }}>
        <div style={{
          height: 72, display: "flex", alignItems: "center",
          padding: "0 20px", flexShrink: 0,
          borderBottom: "0.5px solid " + Hairline,
        }}>
          <NuviLogo size={30} inkColor={Ink}/>
        </div>

        {/* UN ELEMENT COUPE EN DEUX RESSEMBLE A UNE PANNE
            Sur un portable avec la barre de favoris, la fenetre descend sous
            740px de haut et la liste ne tient plus : mesure, "Applications" se
            retrouvait tranchee par le pied de la barre. Elle defilait bien,
            mais rien ne le disait, et une entree a moitie visible se lit comme
            un bug plutot que comme une invitation a faire defiler.
            Le degrade en bas apparait quand il reste quelque chose dessous, et
            disparait une fois en bas. */}
        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
          <nav style={{ height: "100%", overflowY: "auto", padding: "14px 0" }}>
            {topItems.map(renderItem)}
            <div style={{ height: 1, background: Hairline, margin: "12px 20px" }}/>
            {middleItems.map(renderItem)}
          </nav>
          {/* LE DEGRADE ETAIT PIRE QUE LE DEFAUT QU'IL COUVRAIT
              Idee : estomper la derniere entree pour dire que la liste
              continue. Rendu a l'ecran : "Applications" a demi effacee, et
              juste dessous "Reglages" en pleine lumiere. Ca ne se lit pas
              comme "fais defiler", ca se lit comme "cette entree est
              desactivee" - une information fausse, et sur l'entree meme que la
              personne cherchait.
              Une coupe nette au-dessus d'un separateur franc est la convention
              de toutes les navigations qui defilent, et elle ne ment pas. */}
        </div>

        {/* LE PIED EST UN BLOC, PAS LA SUITE DE LA LISTE
            Son filet faisait 0,5px a 10% d'opacite : sur fond sombre, on ne le
            voyait pas, et Reglages avait l'air d'etre la treizieme entree,
            collee a une douzieme a moitie coupee. Un vrai separateur dit que
            ce qui suit est d'une autre nature. */}
        <div style={{
          borderTop: "1px solid rgba(246,242,232,.13)",
          padding: "10px 0 12px", flexShrink: 0,
        }}>
          {onReset && pied("reset", L.replay, Icons.replay, () => onReset())}
          {pied("settings", L.settings, Icons.settings, () => handleSelect("settings"))}
          {cloudEnabled && (
            <AccountBadge
              user={cloudUser}
              status={cloudStatus}
              lastSyncAt={cloudLastSyncAt}
              error={cloudError}
              gmailConnected={gmailConnected}
              expanded
              lang={lang}
              onSignIn={onSignIn}
              onSignOut={onSignOut}
              onConnectGmail={onConnectGmail}
            />
          )}
        </div>
      </aside>
    </>
  );
}
