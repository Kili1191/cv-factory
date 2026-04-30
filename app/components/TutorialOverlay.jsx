"use client";

// CV Factory v17 - TutorialOverlay
//
// Overlay narratif en 8 etapes. Pas de spotlight rectangulaire (trop fragile
// a positionner sans pouvoir tester). A la place, une grande carte centree avec
// titre/description/icone illustrative pour chaque etape.
//
// Persistance : si l'utilisateur termine ou skip, on flag dans localStorage
// pour ne pas reouvrir au prochain lancement (sauf relance manuelle depuis
// Reglages).
//
// Props :
//   T            : i18n
//   onClose()    : ferme le tuto (et marque comme vu)
//   onSkip()     : skip (et marque comme vu)

import { useState, useEffect } from "react";
import {
  Ink, Cream, CreamSoft, Paper, Gold, GoldDeep,
  Coral, CoralSoft, Green, GreenSoft, Purple, PurpleSoft,
  Gray100, Gray200, Gray400, Gray600,
  Serif, Sans, RadiusSm, RadiusMd, RadiusLg, RadiusPill, ShadowSm, ShadowMd,
  GradGold, GradPurple, B,
} from "./tokens";

// Construit la liste des steps a partir de T.
function buildSteps(T) {
  return [
    { key:"welcome",   t:T.tu_welcome_t,   d:T.tu_welcome_d,
      bg:Ink,    fg:Cream,  iconBg:GradGold,
      icon:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
    { key:"phases",    t:T.tu_phases_t,    d:T.tu_phases_d,
      bg:Cream,  fg:Ink,    iconBg:Gold,
      icon:"M3 12h18M3 6h18M3 18h18" },
    { key:"demarrer",  t:T.tu_demarrer_t,  d:T.tu_demarrer_d,
      bg:Cream,  fg:Ink,    iconBg:Coral,
      icon:"M5 3l14 9-14 9V3z" },
    { key:"cibler",    t:T.tu_cibler_t,    d:T.tu_cibler_d,
      bg:Cream,  fg:Ink,    iconBg:Coral,
      icon:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-6a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
    { key:"coach",     t:T.tu_coach_t,     d:T.tu_coach_d,
      bg:Ink,    fg:Cream,  iconBg:GradPurple,
      icon:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
    { key:"finaliser", t:T.tu_finaliser_t, d:T.tu_finaliser_d,
      bg:Cream,  fg:Ink,    iconBg:Green,
      icon:"M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
    { key:"score",     t:T.tu_score_t,     d:T.tu_score_d,
      bg:Cream,  fg:Ink,    iconBg:GoldDeep,
      icon:"M12 1v22M5 8l7-7 7 7M5 16l7 7 7-7" },
    { key:"export",    t:T.tu_export_t,    d:T.tu_export_d,
      bg:Ink,    fg:Cream,  iconBg:GradGold,
      icon:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" },
  ];
}

export default function TutorialOverlay({ T, onClose, onSkip }) {
  const [step, setStep] = useState(0);
  const steps = buildSteps(T);
  const total = steps.length;
  const cur = steps[step];

  // Esc to skip
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onSkip();
      if (e.key === "ArrowRight" && step < total - 1) setStep(step + 1);
      if (e.key === "ArrowLeft" && step > 0) setStep(step - 1);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [step, total, onSkip]);

  const isDark = cur.bg === Ink;
  const subdued = isDark ? "rgba(245,241,232,.7)" : Gray600;
  const accentColor = isDark ? Gold : GoldDeep;

  return (
    <div style={{
      position:"fixed", inset:0,
      zIndex:9999,
      background:"rgba(10,10,10,.78)",
      backdropFilter:"blur(8px)",
      WebkitBackdropFilter:"blur(8px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:"20px",
      animation:"cvfFadeIn 280ms ease-out",
    }}>
      <div style={{
        background:cur.bg, color:cur.fg,
        borderRadius:RadiusLg,
        boxShadow:ShadowMd,
        width:"100%", maxWidth:520,
        maxHeight:"90vh",
        overflow:"hidden",
        position:"relative",
        display:"flex", flexDirection:"column",
        animation:"cvfFadeIn 280ms ease-out",
      }}>
        {/* Header avec eyebrow + close */}
        <div style={{
          display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"16px 20px 0",
        }}>
          <div style={{
            fontSize:11, fontWeight:600,
            letterSpacing:"0.12em", textTransform:"uppercase",
            color:accentColor, fontFamily:Sans,
          }}>{T.tu_step} {step + 1} {T.tu_of} {total}</div>
          <button onClick={onSkip} style={{
            ...B({
              padding:"6px 12px", borderRadius:RadiusPill,
              background: isDark ? "rgba(245,241,232,.1)" : Paper,
              color: subdued,
              border:"0.5px solid "+(isDark ? "rgba(245,241,232,.25)" : Gray200),
              fontSize:11, fontWeight:500, fontFamily:Sans,
            })
          }}>{T.tu_skip}</button>
        </div>

        {/* Content scrollable */}
        <div style={{
          flex:1, overflowY:"auto",
          padding:"24px 28px",
        }}>
          {/* Icone illustrative */}
          <div style={{
            width:64, height:64, borderRadius:18,
            display:"flex", alignItems:"center", justifyContent:"center",
            background:cur.iconBg,
            color:"#fff",
            marginBottom:20,
            position:"relative",
            boxShadow:isDark ? "0 4px 18px rgba(91,61,245,.35)" : "0 4px 14px rgba(0,0,0,.08)",
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d={cur.icon}/>
            </svg>
          </div>

          {/* Titre */}
          <div style={{
            fontFamily:Serif, fontSize:26, fontWeight:500,
            letterSpacing:"-0.02em", lineHeight:1.15,
            color:cur.fg, marginBottom:14,
          }}>{cur.t}</div>

          {/* Description */}
          <div style={{
            fontFamily:Sans, fontSize:14, lineHeight:1.65,
            color:subdued,
          }}>{cur.d}</div>
        </div>

        {/* Footer : barre de progression + boutons */}
        <div style={{
          padding:"18px 22px 22px",
          borderTop:"0.5px solid "+(isDark ? "rgba(245,241,232,.12)" : Gray100),
        }}>
          {/* Dots de progression */}
          <div style={{
            display:"flex", gap:6, marginBottom:14,
            justifyContent:"center",
          }}>
            {steps.map((_, i) => (
              <div key={i} style={{
                width: i === step ? 22 : 6,
                height:6, borderRadius:3,
                background: i === step ? accentColor
                  : (i < step
                      ? (isDark ? "rgba(201,169,110,.5)" : "rgba(160,120,64,.4)")
                      : (isDark ? "rgba(245,241,232,.18)" : Gray200)),
                transition:"all 220ms ease-out",
              }}/>
            ))}
          </div>

          {/* Boutons */}
          <div style={{display:"flex", gap:8}}>
            {step > 0 && (
              <button onClick={()=>setStep(step - 1)} style={{
                ...B({
                  flex:1, padding:"11px 16px", borderRadius:RadiusPill,
                  background: isDark ? "rgba(245,241,232,.1)" : Paper,
                  color: cur.fg,
                  border:"0.5px solid "+(isDark ? "rgba(245,241,232,.25)" : Gray200),
                  fontFamily:Sans, fontWeight:500, fontSize:13,
                  display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6,
                })
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
                </svg>
                {T.tu_prev}
              </button>
            )}
            {step < total - 1 ? (
              <button onClick={()=>setStep(step + 1)} style={{
                ...B({
                  flex:2, padding:"11px 16px", borderRadius:RadiusPill,
                  background: isDark ? GradGold : Ink,
                  color: isDark ? Ink : Cream,
                  fontFamily:Sans, fontWeight:600, fontSize:13,
                  display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6,
                  transition:"all 200ms ease-out",
                })
              }}>
                {T.tu_next}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
              </button>
            ) : (
              <button onClick={onClose} style={{
                ...B({
                  flex:2, padding:"11px 16px", borderRadius:RadiusPill,
                  background: GradGold,
                  color: Ink,
                  fontFamily:Sans, fontWeight:600, fontSize:13,
                  display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6,
                  transition:"all 200ms ease-out",
                })
              }}>
                {T.tu_done}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.8"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
