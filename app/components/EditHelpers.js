"use client";

// Nuvi v2 - EditHelpers
//
// Helpers de bas niveau utilises par les modals d'edition et les layouts CV :
//
//   E         : champ inline editable (click-to-edit, autofocus, blur to commit)
//   FR        : ligne de formulaire (label + input ou textarea)
//   SaveBtn   : bouton "Sauvegarder" pour fermer un modal d'edition
//   MK        : factory de setters typees (u, ux, ub, ue, us, ul, uc) pour le state CV
//
// [Nuvi v2 redesign] :
//   - FR : label en uppercase Coral (eyebrow style), border Hairline, focus violet
//   - SaveBtn : gradient violet->magenta + check icon (cohérent CTA Nuvi)
//   - E : highlight Cream/Coral au lieu de jaune classique au focus
//   - Inputs : padding plus genereux, font-size 13, border-radius 10

import { useState, useCallback } from "react";
import {
  Ink, InkMuted, Cream, CreamSoft, Paper,
  Coral, Purple, Magenta, Hairline,
  Gold, GoldDeep, Dark,
  Sans, B,
} from "./tokens";

// [Nuvi v2] Style input/textarea Nuvi avec focus violet
const NuviInputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid " + Hairline,
  fontSize: 13,
  fontFamily: Sans,
  color: Ink,
  background: Paper,
  boxSizing: "border-box",
  outline: "none",
  transition: "border-color 150ms ease, box-shadow 150ms ease",
};

// [Nuvi v2] Style label : eyebrow uppercase terracotta
const NuviLabelStyle = {
  display: "block",
  fontSize: 10,
  fontWeight: 600,
  color: Coral,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: 6,
};

// Champ inline editable. Click pour passer en mode edition, blur pour commit,
// Enter pour commit, Escape pour annuler.
//
// Utilise dans les layouts CV (CVSidebar, CVAts) sur tous les textes du CV.
//
// Props :
//   value     : valeur actuelle
//   onChange  : callback (newValue) => void
//   multi     : true pour textarea, false pour input
//   style     : styles personnalises (couleur, font-size, etc.) qui sont aussi
//               appliques a l'input et au span d'affichage pour conserver la coherence visuelle
export function E({ value, onChange, multi = false, style = {} }) {
  const [ed, setEd] = useState(false);
  const [loc, setLoc] = useState("");

  const open = useCallback(() => {
    setLoc(value || "");
    setEd(true);
  }, [value]);

  const commit = useCallback(() => {
    onChange(loc);
    setEd(false);
  }, [loc, onChange]);

  if (ed) {
    // [Nuvi v2] Highlight Cream/Coral au focus (au lieu de jaune)
    const s = {
      width: "100%",
      background: "rgba(217, 119, 87, 0.06)", // terracotta tres subtil
      border: "2px solid " + Coral,
      borderRadius: 4,
      padding: "2px 6px",
      font: "inherit", fontSize: "inherit",
      color: "inherit",
      resize: multi ? "vertical" : "none",
      minHeight: multi ? 52 : undefined,
      boxSizing: "border-box",
      outline: "none",
      ...style,
    };
    if (multi) {
      return (
        <textarea autoFocus value={loc}
          onChange={e => setLoc(e.target.value)}
          onBlur={commit} style={s} />
      );
    }
    return (
      <input autoFocus value={loc}
        onChange={e => setLoc(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEd(false);
        }}
        style={s} />
    );
  }

  return (
    <span onClick={open}
      style={{
        cursor: "text",
        display: multi ? "block" : "inline",
        borderBottom: "1.5px dashed transparent",
        transition: "border-color .15s",
        ...style,
      }}
      // [Nuvi v2] Hover terracotta au lieu d'or
      onMouseEnter={e => e.currentTarget.style.borderBottomColor = Coral + "aa"}
      onMouseLeave={e => e.currentTarget.style.borderBottomColor = "transparent"}>
      {/* LE POINTILLE EST UN OUTIL, PAS DU CONTENU
          Un champ vide affiche "..." pour se signaler comme cliquable. C'est
          juste dans l'editeur, et faux partout ailleurs : ces trois points
          partaient dans le PDF telecharge, ou ils ne veulent plus rien dire.
          Un recruteur y lit une information manquante, ou de la negligence.
          La classe cvf-no-print est celle que l'export masque deja pour les
          boutons d'edition, et que la couche de texte invisible rejette : le
          pointille en releve exactement de la meme facon, et la poser ici
          couvre tous les gabarits d'un coup. */}
      {value || (
        <span className="cvf-no-print"
          style={{ opacity: .3, fontStyle: "italic" }}>...</span>
      )}
    </span>
  );
}

// Ligne de formulaire : label terracotta + input avec focus violet.
// Utilise dans les Sheets d'edition (SheetId, SheetEx, SheetEd, SheetSk).
export function FR({ label, value, onChange, multi = false, placeholder }) {
  const [focused, setFocused] = useState(false);

  // [Nuvi v2] Focus violet (au lieu d'or) avec subtle glow
  const dynamicStyle = {
    ...NuviInputStyle,
    borderColor: focused ? Purple : Hairline,
    boxShadow: focused ? "0 0 0 3px rgba(91, 61, 245, 0.08)" : "none",
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={NuviLabelStyle}>{label}</label>
      {multi
        ? <textarea value={value || ""} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={3}
          style={{ ...dynamicStyle, resize: "vertical", minHeight: 80 }} />
        : <input value={value || ""} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={dynamicStyle} />
      }
    </div>
  );
}

// Bouton "Sauvegarder" qui ferme le modal d'edition.
// [Nuvi v2] Style gradient violet->magenta + check icon (cohérent CTA Nuvi).
export function SaveBtn({ onClose, T }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClose}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...B({
          width: "100%",
          padding: "13px 20px",
          borderRadius: 999, // [Nuvi v2] pill au lieu de rounded
          background: "linear-gradient(135deg, " + Purple + ", " + Magenta + ")",
          color: "#fff",
          fontWeight: 600,
          fontSize: 14,
          fontFamily: Sans,
          letterSpacing: "0.01em",
          marginTop: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow: hovered
            ? "0 6px 20px rgba(91, 61, 245, 0.35)"
            : "0 2px 8px rgba(91, 61, 245, 0.20)",
          transform: hovered ? "translateY(-1px)" : "translateY(0)",
          transition: "all 180ms ease-out",
          cursor: "pointer",
        })
      }}>
      {/* [Nuvi v2] Check icon pour signaler la confirmation */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {T.sh_save}
    </button>
  );
}

// Factory de setters typees pour le state CV. Reduit le boilerplate dans
// les Sheets d'edition et les layouts CV.
//
// Usage :
//   const { u, ux, ub, ue, us, ul, uc } = MK(setCV);
//   u("name")("John")             // set cv.name
//   ux(expId, "title", "Dev")     // set cv.experience[expId].title
//   ub(expId, bulletIdx, "...")   // set cv.experience[expId].bullets[bulletIdx]
//   ue(eduId, "school", "...")    // set cv.education[eduId].school
//   us(skillIdx, "React")         // set cv.skills[skillIdx]
//   ul(langIdx, "level", "...")   // set cv.languages[langIdx].level
//   uc(certIdx, "...")            // set cv.certifications[certIdx]
export function MK(set) {
  return {
    u: f => v => set(p => ({ ...p, [f]: v })),
    ux: (id, k, v) => set(p => ({
      ...p,
      experience: p.experience.map(e => e.id === id ? { ...e, [k]: v } : e)
    })),
    ub: (id, i, v) => set(p => ({
      ...p,
      experience: p.experience.map(e => e.id === id
        ? { ...e, bullets: e.bullets.map((b, j) => j === i ? v : b) }
        : e)
    })),
    ue: (id, k, v) => set(p => ({
      ...p,
      education: p.education.map(e => e.id === id ? { ...e, [k]: v } : e)
    })),
    us: (i, v) => set(p => ({ ...p, skills: p.skills.map((s, j) => j === i ? v : s) })),
    ul: (i, k, v) => set(p => ({
      ...p,
      languages: p.languages.map((l, j) => j === i ? { ...l, [k]: v } : l)
    })),
    uc: (i, v) => set(p => ({
      ...p,
      certifications: p.certifications.map((c, j) => j === i ? v : c)
    })),
  };
}
