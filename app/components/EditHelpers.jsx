"use client";

// CV Factory v17 - EditHelpers
//
// Helpers de bas niveau utilises par les modals d'edition et les layouts CV :
//
//   E         : champ inline editable (click-to-edit, autofocus, blur to commit)
//   FR        : ligne de formulaire (label + input ou textarea)
//   SaveBtn   : bouton "Sauvegarder" pour fermer un modal d'edition
//   MK        : factory de setters typees (u, ux, ub, ue, us, ul, uc) pour le state CV
//
// Tous ces helpers etaient initialement dans page.jsx. Extraits ici pour
// permettre l'extraction des layouts et sheets d'edition vers des fichiers separes.

import { useState, useCallback } from "react";
import {
  Ink, Cream, Gold, GoldDeep, Dark,
  Sans, IN, LBL, B,
} from "./tokens";

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
export function E({ value, onChange, multi=false, style={} }) {
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
    const s = {
      width:"100%", background:"rgba(255,255,200,.95)",
      border:"2px solid "+Gold, borderRadius:3,
      padding:"2px 6px", font:"inherit", fontSize:"inherit",
      color:"inherit",
      resize: multi ? "vertical" : "none",
      minHeight: multi ? 52 : undefined,
      boxSizing:"border-box", outline:"none",
      ...style,
    };
    if (multi) {
      return (
        <textarea autoFocus value={loc}
          onChange={e=>setLoc(e.target.value)}
          onBlur={commit} style={s}/>
      );
    }
    return (
      <input autoFocus value={loc}
        onChange={e=>setLoc(e.target.value)}
        onBlur={commit}
        onKeyDown={e=>{
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEd(false);
        }}
        style={s}/>
    );
  }

  return (
    <span onClick={open}
      style={{
        cursor:"text",
        display: multi ? "block" : "inline",
        borderBottom:"1.5px dashed transparent",
        transition:"border-color .15s",
        ...style,
      }}
      onMouseEnter={e=>e.currentTarget.style.borderBottomColor = Gold + "aa"}
      onMouseLeave={e=>e.currentTarget.style.borderBottomColor = "transparent"}>
      {/* LE POINTILLE EST UN OUTIL, PAS DU CONTENU
          Un champ vide affiche "..." pour se signaler comme cliquable. C'est
          juste dans l'editeur, et faux partout ailleurs : ces trois points
          partaient dans le PDF telecharge, ou ils ne veulent plus rien dire.
          Un recruteur y lit une information manquante, ou une negligence.
          La classe cvf-no-print est celle que l'export masque deja pour les
          boutons d'edition ; le pointille en releve exactement de la meme
          facon, et la poser ici couvre tous les gabarits d'un coup. */}
      {value || (
        <span className="cvf-no-print"
          style={{opacity:.3, fontStyle:"italic"}}>...</span>
      )}
    </span>
  );
}

// Ligne de formulaire : label + input ou textarea.
// Utilise dans les Sheets d'edition (SheetId, SheetEx, SheetEd, SheetSk).
export function FR({ label, value, onChange, multi=false }) {
  return (
    <div style={{marginBottom:12}}>
      <label style={LBL}>{label}</label>
      {multi
        ? <textarea value={value} onChange={e=>onChange(e.target.value)}
            rows={3} style={{...IN(), resize:"vertical"}}/>
        : <input value={value} onChange={e=>onChange(e.target.value)}
            style={IN()}/>
      }
    </div>
  );
}

// Bouton "Sauvegarder" qui ferme le modal d'edition. Style Ink/Gold legacy
// pour rester coherent avec les Sheets d'edition existantes.
export function SaveBtn({ onClose, T }) {
  return (
    <button onClick={onClose} style={{
      ...B({
        width:"100%", padding:13, minHeight:44, boxSizing:"border-box", borderRadius:12,
        background:Dark, color:Gold,
        fontWeight:700, fontSize:14, marginTop:6,
      })
    }}>
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
    u:  f => v => set(p => ({...p, [f]: v})),
    ux: (id, k, v) => set(p => ({...p,
      experience: p.experience.map(e => e.id === id ? {...e, [k]: v} : e)})),
    ub: (id, i, v) => set(p => ({...p,
      experience: p.experience.map(e => e.id === id
        ? {...e, bullets: e.bullets.map((b, j) => j === i ? v : b)}
        : e)})),
    ue: (id, k, v) => set(p => ({...p,
      education: p.education.map(e => e.id === id ? {...e, [k]: v} : e)})),
    us: (i, v) => set(p => ({...p, skills: p.skills.map((s, j) => j === i ? v : s)})),
    ul: (i, k, v) => set(p => ({...p,
      languages: p.languages.map((l, j) => j === i ? {...l, [k]: v} : l)})),
    uc: (i, v) => set(p => ({...p,
      certifications: p.certifications.map((c, j) => j === i ? v : c)})),
  };
}
