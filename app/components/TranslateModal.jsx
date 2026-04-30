"use client";

// CV Factory v17 - TranslateModal (extracted + modernized v17).
//
// Permet de traduire le CV entier FR <-> EN via Claude API.
// Affiche un loading state animé pendant la traduction.
//
// Props :
//   T            : i18n (les strings tr_* viennent de page.jsx)
//   dir          : "fr_en" | "en_fr"
//   setDir(k)    : changer la direction
//   loading      : bool
//   msgIdx       : index du message de loading (le tableau T.tr_msgs cycle)
//   hasBackup    : bool, true si on a un backup pour annuler
//   onRun()      : lance la traduction
//   onClose()

import { useEffect } from "react";
import {
  Ink, Cream, CreamSoft, Paper, Gold, GoldDeep,
  Coral, CoralSoft, Green, GreenSoft, Purple,
  Gray100, Gray200, Gray400, Gray600,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm,
  GradGold, B,
} from "./tokens";
import Sheet from "./Sheet";

export default function TranslateModal({ T, dir, setDir, loading, msgIdx, hasBackup, onRun, onClose }) {

  // Esc to close
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !loading) onClose(); };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [loading, onClose]);

  return (
    <Sheet
      eyebrow={T.tr_title}
      title={T.tr_sub}
      onClose={onClose}
    >
      {loading ? (
        <div style={{
          padding:"40px 20px", textAlign:"center",
          background:Paper, borderRadius:RadiusMd,
          border:"0.5px solid "+Gray200, boxShadow:ShadowSm,
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
            animation:"cvfFadeIn 600ms ease-out",
          }}>{T.tr_msgs && T.tr_msgs[msgIdx]}</div>
          <div style={{
            fontSize:12, color:Gray600, marginTop:6,
          }}>{T.tr_loading}</div>
          <div style={{
            marginTop:18, height:3, background:Gray200,
            borderRadius:RadiusPill, overflow:"hidden", width:200,
            margin:"18px auto 0", position:"relative",
          }}>
            <div style={{
              position:"absolute", top:0, height:"100%",
              background:Gold,
              animation:"cvfTrSlide 2s ease-in-out infinite",
              width:"40%",
            }}/>
          </div>
          <style>{`
            @keyframes cvfTrSlide {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(350%); }
            }
          `}</style>
        </div>
      ) : (
        <>
          {/* Direction picker */}
          <div style={{
            fontSize:11, fontWeight:600,
            letterSpacing:"0.1em", textTransform:"uppercase",
            color:GoldDeep, marginBottom:10,
            fontFamily:Sans,
          }}>{T.tr_dir}</div>

          <div style={{display:"flex", gap:8, marginBottom:18}}>
            {[
              ["fr_en", T.tr_fr_en],
              ["en_fr", T.tr_en_fr],
            ].map(([k, l]) => (
              <button key={k} onClick={()=>setDir(k)} style={{
                ...B({
                  flex:1, padding:"12px 14px", borderRadius:RadiusMd,
                  background: dir === k ? CreamSoft : Paper,
                  color: dir === k ? Ink : Gray600,
                  border:"1.5px solid "+(dir === k ? Gold : Gray200),
                  fontFamily:Sans, fontWeight: dir === k ? 600 : 500,
                  fontSize:13,
                  transition:"all 180ms ease-out",
                  boxShadow: dir === k ? "none" : ShadowSm,
                })
              }}>{l}</button>
            ))}
          </div>

          {/* Warn */}
          <div style={{
            padding:"12px 14px",
            background:"#fff8eb",
            border:"0.5px solid "+Gold,
            borderRadius:RadiusSm,
            marginBottom:18,
          }}>
            <div style={{
              fontFamily:Sans, fontSize:12,
              color:"#664d00", lineHeight:1.55,
            }}>{T.tr_warn}</div>
          </div>

          {/* CTA Run */}
          <button onClick={onRun} style={{
            ...B({
              width:"100%", padding:"15px 22px", borderRadius:RadiusPill,
              background:GradGold, color:"#fff",
              fontFamily:Sans, fontWeight:600, fontSize:14,
              display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
              transition:"all 200ms ease-out",
            })
          }}>
            {T.tr_run}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </button>

          {/* Backup hint */}
          {hasBackup && (
            <div style={{
              marginTop:14,
              fontSize:11, color:Gray600,
              textAlign:"center", lineHeight:1.5,
              fontFamily:Sans, fontStyle:"italic",
            }}>{T.tr_hint_backup}</div>
          )}
        </>
      )}
    </Sheet>
  );
}
