"use client";

// Nuvi v2 - Sheet primitive (iOS bottom-sheet style).
// Extracted from page.jsx to be reusable across all Nuvi modals.
//
// [Nuvi v2 redesign] :
//   - NuviLogo wordmark anime en haut a gauche du header
//   - Eyebrow passe de GoldDeep (or) a Coral (terracotta Nuvi)
//   - Close button : SVG icon au lieu de "x" texte
//   - Border Hairline #e8e3d6 au lieu de Gray200
//   - Backdrop blur conserve, animation slide-up conservee
//
// Props :
//   title    : string OR JSX (le titre principal en Fraunces)
//   eyebrow  : string optionnel (eyebrow terracotta au-dessus du titre)
//   onClose  : callback quand l'utilisateur ferme la sheet
//   children : contenu scrollable
//   showLogo : afficher le NuviLogo en haut a gauche (default: true)

import { useEffect, useState } from "react";
import { estTelephone } from "../../lib/breakpoint.js";
import dynamic from "next/dynamic";
import {
  Ink, Cream, CreamSoft, Paper, Coral,
  Hairline, InkMuted,
  Gray200, Gray600,
  Serif, Sans, RadiusPill, B,
  KEYFRAMES_V17, Trans, CoralText } from "./tokens";

// NuviLogo importe en dynamic (ssr:false) pour eviter mismatch hydratation
const NuviLogo = dynamic(() => import("./NuviLogo"), { ssr: false });

export default function Sheet({ title, eyebrow, onClose, children, showLogo = true }) {
  // [Fix] Escape ferme la sheet. Chaque modale ajoutait son propre ecouteur,
  // et trois d'entre elles l'avaient oublie : Versions, Activite et les
  // feuilles d'edition ne se fermaient qu'au bouton ou au clic sur le fond.
  // La primitive s'en charge maintenant pour toutes. Les modales qui doivent
  // rester ouvertes pendant un chargement gardent leur garde dans `onClose`,
  // donc rien ne se ferme au mauvais moment.
  // Le plancher de hauteur ne vaut que sur ordinateur : sur telephone, une
  // feuille qui colle au bas est exactement ce qu'il faut.
  const [surOrdinateur, setSurOrdinateur] = useState(false);
  useEffect(() => {
    const voir = () => setSurOrdinateur(!estTelephone());
    voir();
    window.addEventListener("resize", voir);
    return () => window.removeEventListener("resize", voir);
  }, []);

  useEffect(() => {
    if (typeof onClose !== "function") return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
      fontFamily: Sans,
    }}>
      {/* Backdrop avec blur */}
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(10,10,10,.55)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        animation: "cvfFadeIn 200ms ease-out",
      }} onClick={onClose} />

      {/* Sheet container */}
      <div className="nuvi-feuille" style={{
        position: "relative",
        background: CreamSoft,
        borderRadius: "32px 32px 0 0",
        maxHeight: "92vh",
        // UN PLANCHER DE HAUTEUR SUR ORDINATEUR
        //
        // La hauteur suivait le contenu. Un panneau peu rempli - le suivi des
        // candidatures avant la premiere - se reduisait a 441px colles au bas
        // de l'ecran, et les 459px du dessus restaient vides. Mesure a
        // 1440x900 : plus de la moitie de la hauteur perdue.
        //
        // C'est le defaut typique d'une feuille de telephone posee sur un
        // ecran d'ordinateur. Sur un telephone, coller au bas est juste : le
        // pouce est la. Sur un ordinateur, ca donne une fenetre qui a l'air
        // tombee.
        //
        // Exprime en vh ET en pixels : sur un portable bas, une valeur fixe
        // deborderait ; sur un grand ecran, une valeur relative seule ferait
        // demesure. Le maxHeight au-dessus reste la borne haute.
        minHeight: surOrdinateur ? "min(62vh, 560px)" : undefined,
        display: "flex", flexDirection: "column",
        boxShadow: "0 -20px 60px rgba(0,0,0,.2)",
        animation: "cvfSlideUp 280ms cubic-bezier(.32,.72,0,1)",
        width: "100%",
        maxWidth: 840,
        marginLeft: "auto", marginRight: "auto",
      }}>
        {/* Handle iOS */}
        <div style={{
          width: 40, height: 4,
          background: Hairline,
          borderRadius: RadiusPill,
          margin: "10px auto 6px",
          flexShrink: 0,
        }} />

        {/* [Nuvi v2] Logo wordmark en haut a gauche */}
        {showLogo && (
          <div style={{
            padding: "8px 24px 0",
            display: "flex", alignItems: "center",
            flexShrink: 0,
          }}>
            <NuviLogo size={28} inkColor={Ink} />
          </div>
        )}

        {/* Header editorial : eyebrow + titre + close */}
        <div style={{
          padding: showLogo ? "10px 24px 14px" : "6px 24px 14px",
          borderBottom: "0.5px solid " + Hairline,
          flexShrink: 0,
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between", gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {eyebrow && (
              <div style={{
                fontSize: 11, fontWeight: 600,
                letterSpacing: "0.12em", textTransform: "uppercase",
                color: CoralText,
                marginBottom: 4,
              }}>{eyebrow}</div>
            )}
            <div style={{
              fontFamily: Serif, fontWeight: 400, fontSize: 22,
              letterSpacing: "-0.02em", color: Ink, lineHeight: 1.15,
            }}>{title}</div>
          </div>

          {/* [Nuvi v2] Close button : SVG icon */}
          <button onClick={onClose} aria-label="close" style={{
            ...B({
              background: Paper,
              borderRadius: "50%",
              width: 44, height: 44,
              color: InkMuted,
              border: "0.5px solid " + Hairline,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              transition: Trans(["background","color","border-color","box-shadow","transform","opacity"], "fast"),
            })
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body scrollable.
            La classe porte la sequence d'entree du contenu : elle vaut pour
            les quinze panneaux d'un coup, et pour ceux qu'on ecrira apres. */}
        <div className="nuvi-sheet-corps" style={{
          overflowY: "auto",
          padding: "18px 24px 48px",
          flex: 1,
        }}>
          {children}
        </div>
      </div>

      <style>{KEYFRAMES_V17}</style>
    </div>
  );
}
