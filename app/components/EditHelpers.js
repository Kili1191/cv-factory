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
//   - SaveBtn : gradient violet->magenta + check icon (coherent CTA Nuvi)
//   - E : highlight Cream/Coral au lieu de jaune classique au focus
//   - Inputs : padding plus genereux, font-size 13, border-radius 10

import { useState, useCallback, useEffect, useRef } from "react";
import { Trans } from "./tokens";
import {
  Ink, InkMuted, Cream, CreamSoft, Paper,
  Coral, Purple, Magenta, Hairline,
  Gold, GoldDeep, Dark,
  Sans, B, CoralText,
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
  // Corail de marque : 3,12:1 sur blanc, sous AA. Encre calibree.
  color: CoralText,
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
// SELECTIONNER DU TEXTE ET APPUYER SUR SUPPRIMER
//
// Kilian, le 3 octobre 2026, "Lyon," surligne dans son CV : "je ne peux pas
// supprimer". Mesure dans un navigateur : la valeur ne bouge pas d'un pixel.
//
// Le champ est un texte ordinaire tant qu'on n'a pas clique dessus, et un
// input ensuite. Selectionner puis appuyer sur Supprimer ne touche donc
// rien : il n'y a pas d'input a cet instant, et le navigateur n'efface pas
// un noeud de texte qui n'est pas editable. Rien a l'ecran ne le dit, et
// toute la page est faite pour ressembler a un document qu'on edite. Le
// geste est juste, c'est la reponse qui manquait.
//
// Un seul ecouteur pour tout le document : chaque champ depose son setter
// sur son propre noeud, et l'ecouteur remonte de la selection jusqu'a lui.
// Poser un ecouteur par champ en ferait une centaine sur un CV fourni.
let ecouteurPose = false;

function texteApresSuppression(span, plage) {
  const texte = span.textContent || "";
  // La selection deborde du champ : on vide ce champ-ci entierement, ce que
  // la personne a demande pour lui.
  if (!span.contains(plage.startContainer) || !span.contains(plage.endContainer)) return "";
  const avant = plage.cloneRange();
  avant.selectNodeContents(span);
  avant.setEnd(plage.startContainer, plage.startOffset);
  const debut = avant.toString().length;
  const fin = debut + plage.toString().length;
  return texte.slice(0, debut) + texte.slice(fin);
}

function poserLEcouteur() {
  if (ecouteurPose || typeof document === "undefined") return;
  ecouteurPose = true;
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Backspace" && e.key !== "Delete") return;
    // Un champ deja ouvert se debrouille seul, et une zone de saisie
    // ailleurs sur la page ne nous regarde pas.
    const actif = document.activeElement;
    if (actif && (actif.tagName === "INPUT" || actif.tagName === "TEXTAREA"
      || actif.isContentEditable)) return;
    const sel = typeof window !== "undefined" ? window.getSelection() : null;
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    const plage = sel.getRangeAt(0);
    if (!plage.toString()) return;

    // Tous les champs que la selection touche, pas seulement le premier :
    // on selectionne souvent une ligne entiere, qui en compte trois.
    const touches = [...document.querySelectorAll("[data-cvf-e]")]
      .filter((n) => typeof n.__cvfSet === "function" && plage.intersectsNode(n));
    if (!touches.length) return;

    e.preventDefault();
    sel.removeAllRanges();
    for (const n of touches) {
      const reste = texteApresSuppression(n, plage);
      if (reste !== (n.textContent || "")) n.__cvfSet(reste);
    }
  });
}

export function E({ value, onChange, multi = false, style = {} }) {
  const [ed, setEd] = useState(false);
  const [loc, setLoc] = useState("");
  const noeud = useRef(null);
  useEffect(() => { poserLEcouteur(); }, []);
  // Le setter voyage sur le noeud : l'ecouteur unique part d'une selection,
  // donc d'un element du DOM, et n'a aucun autre chemin vers ce champ.
  useEffect(() => {
    const n = noeud.current;
    if (!n) return undefined;
    n.__cvfSet = onChange;
    return () => { if (n) delete n.__cvfSet; };
  }, [onChange, ed]);

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
      ref={noeud}
      data-cvf-e
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
// [Nuvi v2] Style gradient violet->magenta + check icon (coherent CTA Nuvi).
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
          transition: Trans(["background","color","border-color","box-shadow","transform","opacity"], "fast"),
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
    // DEPLACER UNE PUCE DANS SON EXPERIENCE
    //
    // L'ordre des puces est ce qu'un recruteur lit en premier et c'est le
    // seul reglage du CV qui ne se corrige pas en reecrivant : il faut
    // deplacer. Jusqu'ici il fallait le demander au coach, ou couper-coller
    // deux textes a la main. Le deplacement est une seule operation pour que
    // l'historique le reprenne d'un coup.
    bm: (id, de, vers) => set(p => ({
      ...p,
      experience: p.experience.map(e => {
        if (e.id !== id) return e;
        const liste = Array.isArray(e.bullets) ? [...e.bullets] : [];
        if (de < 0 || vers < 0 || de >= liste.length || vers >= liste.length || de === vers) return e;
        const [prise] = liste.splice(de, 1);
        liste.splice(vers, 0, prise);
        return { ...e, bullets: liste };
      }),
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
