"use client";

// Nuvi v3 - PositioningModal (refondu palette Nuvi).
//
// Affiche le resultat de l'analyse de positionnement carriere :
// 3 angles strategiques avec titre, accroche, points cles, cible, salaire.

import { useEffect } from "react";
import {
  Ink, InkMuted, Cream, CreamSoft, Paper, Hairline,
  Coral, CoralSoft, Green, GreenSoft, Purple, Magenta, PurpleSoft,
  Gray100, Gray200, Gray400, Gray600,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm, B, Trans, CoralText, GreenText, PurpleText } from "./tokens";
import Sheet from "./Sheet";

export default function PositioningModal({ T, result, loading, onAdopt, onClose }) {

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !loading) onClose(); };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [loading, onClose]);

  return (
    <Sheet
      eyebrow={T.pm_eyebrow}
      title={T.pm_title}
      onClose={onClose}
    >
      <p style={{
        fontSize:13, color:InkMuted, lineHeight:1.5,
        margin:"0 0 18px", fontFamily:Sans,
      }}>{T.pm_sub}</p>

      {/* Loading */}
      {loading && (
        <div style={{
          padding:"40px 20px", textAlign:"center",
          background:Paper, borderRadius:RadiusMd,
          border:"0.5px solid "+Hairline, boxShadow:ShadowSm,
        }}>
          <div style={{
            width:42, height:42, margin:"0 auto 14px",
            border:"3px solid "+Hairline, borderTopColor:Purple,
            borderRadius:"50%",
            animation:"cvfSpin 1s linear infinite",
          }}/>
          <div style={{
            fontFamily:Serif, fontSize:16, fontWeight:500,
            color:Ink, letterSpacing:"-0.01em",
          }}>{T.pm_loading}</div>
          <div style={{
            fontSize:12, color:InkMuted, marginTop:6,
          }}>{T.pm_loading_sub}</div>
        </div>
      )}

      {/* Angles */}
      {!loading && result && result.angles && result.angles.map((a, i) => (
        <div key={i} style={{
          padding:"18px 20px",
          background: i === 0 ? CreamSoft : Paper,
          border:"0.5px solid "+(i === 0 ? Purple : Hairline),
          borderRadius:RadiusMd,
          boxShadow:ShadowSm,
          marginBottom:14,
          fontFamily:Sans,
        }}>
          {/* Tag Angle + salary */}
          <div style={{
            display:"flex", alignItems:"center", gap:8, marginBottom:10,
            flexWrap:"wrap",
          }}>
            <span style={{
              fontSize:10, fontWeight:600, color:"#fff",
              background:Coral,
              padding:"4px 10px", borderRadius:RadiusPill,
              letterSpacing:"0.06em", textTransform:"uppercase",
              fontFamily:Sans,
            }}>{T.pm_angle} {i+1}</span>
            {a.salary_range && (
              <span style={{
                fontSize:10, fontWeight:600, color:GreenText,
                background:GreenSoft,
                padding:"4px 10px", borderRadius:RadiusPill,
                letterSpacing:"0.04em",
                fontFamily:Sans,
              }}>{a.salary_range}</span>
            )}
          </div>

          {/* Titre */}
          <div style={{
            fontFamily:Serif, fontWeight:500,
            fontSize:18, lineHeight:1.25,
            letterSpacing:"-0.01em",
            color:Ink, marginBottom:10,
          }}>{a.title || "?"}</div>

          {/* Credibility */}
          {a.credibility && (
            <div style={{
              fontSize:13, color:InkMuted, lineHeight:1.55,
              marginBottom:14,
            }}>{a.credibility}</div>
          )}

          {/* Points cles - eyebrow Coral, plus + violet */}
          {a.key_points && a.key_points.length > 0 && (
            <div style={{marginBottom:14}}>
              <div style={{
                fontSize:10, fontWeight:600,
                letterSpacing:"0.1em", textTransform:"uppercase",
                color:CoralText, marginBottom:6,
                fontFamily:Sans,
              }}>{T.pm_highlight}</div>
              {a.key_points.map((p, j) => (
                <div key={j} style={{
                  fontSize:13, color:Ink, lineHeight:1.55,
                  marginBottom:4, paddingLeft:14,
                  position:"relative",
                }}>
                  <span style={{
                    position:"absolute", left:0, top:0,
                    color:PurpleText, fontWeight:600,
                  }}>+</span>
                  {p}
                </div>
              ))}
            </div>
          )}

          {/* Cible */}
          {a.target_employers && (
            <div style={{
              padding:"10px 14px",
              background:Hairline,
              borderRadius:RadiusSm,
              fontSize:12, color:InkMuted, lineHeight:1.55,
              marginBottom:12,
            }}>
              <span style={{fontWeight:600, color:Ink}}>{T.pm_target}:</span>
              {" "}{a.target_employers}
            </div>
          )}

          {/* New summary */}
          {a.new_summary && (
            <div style={{
              padding:"12px 14px",
              background:CoralSoft,
              border:"0.5px solid "+Coral,
              borderRadius:RadiusSm,
              marginBottom:12,
            }}>
              <div style={{
                fontFamily:Serif, fontStyle:"italic",
                fontSize:13, color:"#7f1d1d", lineHeight:1.55,
                letterSpacing:"-0.005em",
              }}>"{a.new_summary}"</div>
            </div>
          )}

          {/* Adopter - gradient violet→magenta */}
          <button onClick={()=>onAdopt(a)} style={{
            ...B({
              width:"100%", padding:"12px 18px", borderRadius:RadiusPill,
              background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
              color:"#fff",
              fontFamily:Sans, fontWeight:600, fontSize:13,
              border:"none",
              display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
              transition: Trans(["background","color","border-color","box-shadow","transform","opacity"], "fast"),
              boxShadow:"0 2px 8px rgba(91, 61, 245, 0.2)",
            })
          }}>
            {T.pm_adopt}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </button>
        </div>
      ))}
    </Sheet>
  );
}
