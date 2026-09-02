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
import { NAV_ICONS } from "./navIcons";

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

  // LES DESSINS VIENNENT DU MODULE PARTAGE
  //
  // Ils etaient definis ici, en local, donc la barre du telephone n'y avait
  // pas acces : son tiroir affichait une pastille ronde vide sur vingt et une
  // entrees. Ils vivent maintenant dans navIcons.jsx, et les deux navigations
  // y puisent. Seul "design" reste particulier ici : la barre laterale utilise
  // le composant anime, le tiroir un trace fixe.
  const Icons = { ...NAV_ICONS, design: <DesignPaletteIcon size={20} /> };
  const SubIcons = NAV_ICONS;

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
