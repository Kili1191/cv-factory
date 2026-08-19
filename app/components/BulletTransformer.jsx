"use client";

// CV Factory v17 - BulletTransformer (extrait depuis page.jsx).
//
// Modal qui affiche 5 reformulations d'un texte (bullet d'experience OU
// accroche/summary) dans 5 registres distincts.
//
// Props :
//   kind     : "bullet" | "summary"  (controle les labels et le titre)
//   original : string                (texte de base a transformer)
//   levels   : { simple, pro, ats, premium, impact } | null
//   loading  : bool
//   onAdopt(text) : applique la version choisie
//   onClose() : ferme le modal
//   T : i18n object
//
// Pour le summary, les cles dans `levels` restent simple/pro/ats/premium/impact
// pour garder la meme shape JSON, mais les LABELS affiches a l'utilisateur sont
// adaptes : Sobre / Pro / ATS / Premium / Storytelling.

import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Ink, Cream, CreamSoft, Paper, Gold, GoldDeep, Purple,
  Coral, Green, Gray100, Gray200, Gray400, Gray600,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm,
  GradDark, KEYFRAMES_V17, B,
} from "./tokens";

export default function BulletTransformer({ kind = "bullet", original, levels, loading, onAdopt, onClose, T }) {

  // Empeche le scroll du body quand le modal est ouvert.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Esc pour fermer (sauf en loading).
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !loading) onClose(); };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [loading, onClose]);

  // Labels selon le mode (bullet ou summary).
  // 3 identiques + 2 adaptes pour le summary (Sobre + Storytelling).
  const isSummary = kind === "summary";
  const cards = [
    {
      key:"simple",
      label: isSummary ? (T.bts_sobre || "Sobre") : T.bt_simple,
      hint:  isSummary ? (T.bts_sobre_hint || "Factuel, sans superlatifs") : T.bt_simple_hint,
      tagBg: Gray100, tagColor: Gray600,
    },
    {
      key:"pro",
      label: T.bt_pro,
      hint:  T.bt_pro_hint,
      tagBg: "rgba(10,10,10,.08)", tagColor: Ink,
    },
    {
      key:"ats",
      label: T.bt_ats,
      hint:  T.bt_ats_hint,
      tagBg: "rgba(91,61,245,.12)", tagColor: Purple,
    },
    {
      key:"premium",
      label: T.bt_premium,
      hint:  T.bt_premium_hint,
      tagBg: "rgba(201,169,110,.18)", tagColor: GoldDeep,
    },
    {
      key:"impact",
      label: isSummary ? (T.bts_story || "Storytelling") : T.bt_impact,
      hint:  isSummary ? (T.bts_story_hint || "Narration fil rouge") : T.bt_impact_hint,
      tagBg: "rgba(255,90,54,.12)", tagColor: Coral,
    },
  ];

  if (typeof document === "undefined") return null;

  return createPortal((
    <div style={{
      position:"fixed", inset:0, zIndex:99999,
      display:"flex", flexDirection:"column", justifyContent:"flex-end",
      fontFamily:Sans,
    }} onClick={(e)=>{ if (e.target === e.currentTarget && !loading) onClose(); }}>
      {/* Backdrop blur */}
      <div style={{
        position:"absolute", inset:0,
        background:"rgba(10,10,10,.55)",
        backdropFilter:"blur(8px)",
        WebkitBackdropFilter:"blur(8px)",
        animation:"cvfFadeIn 200ms ease-out",
      }} onClick={()=>{ if (!loading) onClose(); }}/>
      {/* Sheet */}
      <div style={{
        position:"relative", background:CreamSoft,
        borderRadius:"32px 32px 0 0",
        maxHeight:"92vh", display:"flex", flexDirection:"column",
        boxShadow:"0 -20px 60px rgba(0,0,0,.2)",
        animation:"cvfSlideUp 280ms cubic-bezier(.32,.72,0,1)",
      }}>
        {/* Handle iOS */}
        <div style={{
          width:40, height:4, background:Gray200,
          borderRadius:RadiusPill,
          margin:"10px auto 6px",
          flexShrink:0,
        }}/>
        {/* Header editorial */}
        <div style={{
          padding:"6px 24px 14px",
          borderBottom:"0.5px solid "+Gray200,
          flexShrink:0,
          display:"flex", alignItems:"flex-start",
          justifyContent:"space-between", gap:12,
        }}>
          <div style={{flex:1, minWidth:0}}>
            <div style={{
              fontSize:11, fontWeight:600,
              letterSpacing:"0.12em", textTransform:"uppercase",
              color:GoldDeep, marginBottom:4,
            }}>
              {isSummary ? (T.bts_eyebrow || "Accroche") : (T.bt_eyebrow || "Bullet")}
            </div>
            <div style={{
              fontFamily:Serif, fontWeight:400, fontSize:22,
              letterSpacing:"-0.02em", color:Ink, lineHeight:1.15,
            }}>
              {isSummary ? (T.bts_title || "5 angles, ton choix.") : T.bt_modal_title}
            </div>
            <div style={{
              fontSize:12, color:Gray600, marginTop:4,
              lineHeight:1.5,
            }}>
              {isSummary ? (T.bts_sub || "5 reformulations de ton accroche, registres differents.") : T.bt_modal_sub}
            </div>
          </div>
          <button onClick={onClose} aria-label="close" disabled={loading} style={{
            ...B({
              background:Paper, borderRadius:RadiusPill,
              width:32, height:32, fontSize:16, color:Gray600,
              border:"0.5px solid "+Gray200,
              display:"flex", alignItems:"center", justifyContent:"center",
              flexShrink:0,
              opacity: loading ? 0.4 : 1,
            })
          }}>x</button>
        </div>

        <div style={{
          overflowY:"auto",
          padding:"18px 24px 36px",
          flex:1,
        }}>
          {/* Texte original */}
          <div style={{
            background:Paper, border:"0.5px solid "+Gray200,
            borderRadius:RadiusSm, padding:"12px 14px", marginBottom:18,
            boxShadow:ShadowSm,
          }}>
            <div style={{
              fontSize:11, fontWeight:600,
              letterSpacing:"0.1em", textTransform:"uppercase",
              color:Gray400, marginBottom:6,
            }}>{T.bt_original}</div>
            <div style={{
              fontSize:13, color:Ink, lineHeight:1.6,
              fontStyle:"italic",
            }}>"{original}"</div>
          </div>

          {/* Loading state */}
          {loading && (
            <div style={{
              padding:"40px 20px", textAlign:"center",
              background:Paper, borderRadius:RadiusMd,
              border:"0.5px solid "+Gray200,
              boxShadow:ShadowSm,
            }}>
              <div style={{
                width:42, height:42, margin:"0 auto 14px",
                border:"3px solid "+Gray200, borderTopColor:Gold,
                borderRadius:"50%",
                animation:"cvfSpin 1s linear infinite",
              }}/>
              <div style={{
                fontFamily:Serif, fontSize:16, fontWeight:500,
                color:Ink, letterSpacing:"-0.01em",
              }}>{T.bt_loading}</div>
              <div style={{
                fontSize:12, color:Gray600, marginTop:6,
              }}>{T.bt_loading_sub}</div>
            </div>
          )}

          {/* Resultats : 5 cards */}
          {!loading && levels && cards.map(c => levels[c.key] && (
            <div key={c.key} style={{
              background:Paper, border:"0.5px solid "+Gray200,
              borderRadius:RadiusMd,
              padding:"14px 16px", marginBottom:10,
              boxShadow:ShadowSm,
              transition:"all 180ms ease-out",
            }}>
              <div style={{
                display:"flex", alignItems:"center",
                justifyContent:"space-between", gap:10,
                marginBottom:9,
              }}>
                <div style={{display:"flex", alignItems:"center", gap:8, minWidth:0}}>
                  <span style={{
                    fontSize:10, fontWeight:600, color:c.tagColor,
                    background:c.tagBg, padding:"4px 10px", borderRadius:RadiusPill,
                    letterSpacing:"0.06em", textTransform:"uppercase",
                    fontFamily:Sans, flexShrink:0,
                  }}>{c.label}</span>
                  <span style={{
                    fontSize:11, color:Gray600,
                    overflow:"hidden", textOverflow:"ellipsis",
                    whiteSpace:"nowrap",
                  }}>{c.hint}</span>
                </div>
                <button onClick={()=>onAdopt(levels[c.key])} style={{
                  ...B({
                    padding:"6px 14px", borderRadius:RadiusPill,
                    background:Ink, color:Cream,
                    fontSize:11, fontWeight:600, fontFamily:Sans,
                    letterSpacing:"0.02em",
                    flexShrink:0,
                  })
                }}>{T.bt_adopt}</button>
              </div>
              <div style={{
                fontSize:13, color:Ink, lineHeight:1.55,
                fontFamily:isSummary ? Serif : Sans,
                fontWeight: isSummary ? 400 : 400,
              }}>
                {levels[c.key]}
              </div>
            </div>
          ))}
        </div>

        <style dangerouslySetInnerHTML={{ __html: KEYFRAMES_V17 }} />
      </div>
    </div>
  ), document.body);
}
