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

// `plein` : la feuille prend tout l'ecran, avec un retour explicite.
//
// WHY A PANEL ASKS FOR THE WHOLE SCREEN
//
// A bottom sheet is right for a short panel. It is wrong for a list of a
// hundred job ads: at 840 by 62vh the reading window was a letterbox on a
// 1440 screen, and the person scrolled a long list through a small hole.
// Measured on 7 October 2026 on the job search, which is the only panel in
// the product whose content has no natural end.
//
// Full screen also removes the backdrop a person would click to get out, so
// it has to carry its own way back, named rather than a bare cross.
export default function Sheet({
  title, eyebrow, onClose, children, showLogo = true, plein = false,
  // The word on the way back. Passed in rather than guessed: the Sheet has
  // no locale of its own and the caller always does, and a label in the
  // wrong language is the leak this repo has a whole agent for.
  retour = "Back",
}) {
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
        // A FULL SCREEN BLUR IS PAID FOR ON EVERY FRAME
        //
        // `backdrop-filter` keeps a composited layer the size of the window
        // and is the first thing to blame when a long list judders. Under a
        // full screen sheet it blurs what nobody can see, so it goes.
        ...(plein ? null : {
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }),
        animation: "cvfFadeIn 200ms ease-out",
      }} onClick={plein ? undefined : onClose} />

      {/* Sheet container */}
      <div className="nuvi-feuille" style={{
        position: "relative",
        background: CreamSoft,
        borderRadius: plein ? 0 : "32px 32px 0 0",
        maxHeight: plein ? "100vh" : "92vh",
        height: plein ? "100vh" : undefined,
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
        minHeight: plein ? "100vh" : (surOrdinateur ? "min(62vh, 560px)" : undefined),
        display: "flex", flexDirection: "column",
        // Full screen has no edge to cast a shadow onto, and the shadow is
        // another layer to paint while the list scrolls.
        boxShadow: plein ? "none" : "0 -20px 60px rgba(0,0,0,.2)",
        animation: "cvfSlideUp 280ms cubic-bezier(.32,.72,0,1)",
        width: "100%",
        maxWidth: plein ? "100%" : 840,
        marginLeft: "auto", marginRight: "auto",
      }}>
        {/* Handle iOS: a sheet you pull down. Full screen is not one. */}
        {!plein && <div style={{
          width: 40, height: 4,
          background: Hairline,
          borderRadius: RadiusPill,
          margin: "10px auto 6px",
          flexShrink: 0,
        }} />}

        {/* THE WAY BACK, NAMED
            Full screen covers the backdrop, so the click that used to get
            somebody out is gone. A bare cross in a corner is not the same
            thing: this says where it goes. */}
        {plein && (
          <div style={{
            maxWidth: 980, width: "100%", marginLeft: "auto", marginRight: "auto",
            boxSizing: "border-box", padding: "12px 24px 0", flexShrink: 0,
          }}>
            <button onClick={onClose} data-nuvi="feuille-retour" style={{
              ...B({
                display: "inline-flex", alignItems: "center", gap: 7,
                minHeight: 40, padding: "0 14px 0 10px",
                borderRadius: RadiusPill,
                background: Paper, color: Ink,
                border: "0.5px solid " + Hairline,
                fontFamily: Sans, fontSize: 13, fontWeight: 600,
                transition: Trans(["background", "border-color"], "fast"),
              })
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              {retour}
            </button>
          </div>
        )}

        {/* [Nuvi v2] Logo wordmark en haut a gauche */}
        {showLogo && (
          <div style={{
            ...(plein ? { maxWidth: 980, width: "100%", marginLeft: "auto", marginRight: "auto", boxSizing: "border-box" } : null),
            padding: "8px 24px 0",
            display: "flex", alignItems: "center",
            flexShrink: 0,
          }}>
            <NuviLogo size={28} inkColor={Ink} />
          </div>
        )}

        {/* Header editorial : eyebrow + titre + close */}
        <div style={{
          ...(plein ? { maxWidth: 980, width: "100%", marginLeft: "auto", marginRight: "auto", boxSizing: "border-box" } : null),
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

          {/* [Nuvi v2] Close button : SVG icon.
              Gone in full screen: "Back" is already there, and two controls
              doing the same thing under two names make the person choose
              between them for nothing. */}
          {!plein && <button onClick={onClose} aria-label="close" style={{
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
          </button>}
        </div>

        {/* Body scrollable.
            La classe porte la sequence d'entree du contenu : elle vaut pour
            les quinze panneaux d'un coup, et pour ceux qu'on ecrira apres. */}
        <div className="nuvi-sheet-corps" style={{
          overflowY: "auto",
          padding: "18px 24px 48px",
          flex: 1,
          // FULL SCREEN IS ROOM, NOT A WIDER LINE
          //
          // At 1440 the cards ran the whole width and a job title sat alone
          // on a 1400px line. The window takes the screen so the list has
          // somewhere to go; the reading column keeps a measure, the same
          // one the sheet had before, a little wider.
          // boxSizing, and it was missing. The header and the logo row both
          // carry it; this one did not, so 980 was the width INSIDE the 24px
          // padding and the body ran 48px wider than the header above it.
          // Nothing showed it while the content was loose text on cream. The
          // job search console has an edge, and the misalignment was the
          // first thing visible on it.
          ...(plein ? {
            maxWidth: 980, width: "100%", marginLeft: "auto", marginRight: "auto",
            boxSizing: "border-box",
          } : null),
        }}>
          {children}
        </div>
      </div>

      <style>{KEYFRAMES_V17}</style>
    </div>
  );
}
