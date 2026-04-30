"use client";

// CV Factory v17 - TruthModal (extracted + modernized v17).
//
// Affiche le resultat du Truth Check : phrases faibles / vagues / risquees
// detectees dans le CV avec reformulation proposee + bouton "Envoyer dans Ajuster".
//
// Props :
//   T              : i18n
//   result         : { overall_verdict, issues: [...] } | null
//   loading        : bool
//   onApplyFix(iss): callback pour envoyer la correction dans Ajuster
//   onClose()
//
// Shape attendue de chaque issue :
//   { type, location, quote, why, fix }

import { useEffect } from "react";
import {
  Ink, Cream, CreamSoft, Paper, Gold, GoldDeep,
  Coral, CoralSoft, Green, GreenSoft, Purple,
  Gray100, Gray200, Gray400, Gray600,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm, B,
} from "./tokens";
import Sheet from "./Sheet";

// Couleur tag selon le type d'issue.
function typeBadge(type, T) {
  const c = (type||"").toLowerCase();
  if (c.indexOf("bullshit") !== -1 || c.indexOf("pretentieux") !== -1)
    return { fg:"#fff", bg:Coral, label:T.tc_type_bullshit };
  if (c.indexOf("incoherent") !== -1)
    return { fg:"#fff", bg:Coral, label:T.tc_type_incoherent };
  if (c.indexOf("risque") !== -1)
    return { fg:"#fff", bg:Coral, label:T.tc_type_risky };
  if (c.indexOf("vague") !== -1 || c.indexOf("generique") !== -1)
    return { fg:"#fff", bg:"#ea580c", label:T.tc_type_vague };
  if (c.indexOf("faible") !== -1)
    return { fg:"#fff", bg:GoldDeep, label:T.tc_type_weak };
  return { fg:Gray600, bg:Gray100, label:type || "issue" };
}

export default function TruthModal({ T, result, loading, onApplyFix, onClose }) {
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
      eyebrow={T.tc_eyebrow}
      title={T.tc_title}
      onClose={onClose}
    >
      <p style={{
        fontSize:13, color:Gray600, lineHeight:1.5,
        margin:"0 0 18px", fontFamily:Sans,
      }}>{T.tc_sub}</p>

      {/* Loading */}
      {loading && (
        <div style={{
          padding:"40px 20px", textAlign:"center",
          background:Paper, borderRadius:RadiusMd,
          border:"0.5px solid "+Gray200, boxShadow:ShadowSm,
        }}>
          <div style={{
            width:42, height:42, margin:"0 auto 14px",
            border:"3px solid "+Gray200, borderTopColor:Coral,
            borderRadius:"50%",
            animation:"cvfSpin 1s linear infinite",
          }}/>
          <div style={{
            fontFamily:Serif, fontSize:16, fontWeight:500,
            color:Ink, letterSpacing:"-0.01em",
          }}>{T.tc_loading}</div>
          <div style={{
            fontSize:12, color:Gray600, marginTop:6,
          }}>{T.tc_loading_sub}</div>
        </div>
      )}

      {/* Resultats */}
      {!loading && result && (
        <>
          {/* Verdict global */}
          {result.overall_verdict && (
            <div style={{
              padding:"14px 16px",
              background:"#fef3c7",
              border:"0.5px solid #fbbf24",
              borderRadius:RadiusMd,
              marginBottom:16,
              fontFamily:Sans,
            }}>
              <div style={{
                fontSize:11, fontWeight:600,
                letterSpacing:"0.1em", textTransform:"uppercase",
                color:GoldDeep, marginBottom:6,
              }}>{T.tc_verdict}</div>
              <div style={{
                fontFamily:Serif, fontStyle:"italic",
                fontSize:13, color:Ink, lineHeight:1.55,
                letterSpacing:"-0.005em",
              }}>"{result.overall_verdict}"</div>
            </div>
          )}

          {/* Liste d'issues OU message vide */}
          {result.issues && result.issues.length > 0 ? (
            result.issues.map((iss, i) => {
              const badge = typeBadge(iss.type, T);
              return (
                <div key={i} style={{
                  padding:"16px 18px",
                  background:Paper,
                  border:"0.5px solid "+Gray200,
                  borderRadius:RadiusMd,
                  boxShadow:ShadowSm,
                  marginBottom:12, fontFamily:Sans,
                }}>
                  {/* Tag type + location */}
                  <div style={{
                    display:"flex", gap:8, alignItems:"center",
                    marginBottom:10, flexWrap:"wrap",
                  }}>
                    <span style={{
                      fontSize:10, fontWeight:600, color:badge.fg,
                      background:badge.bg,
                      padding:"4px 10px", borderRadius:RadiusPill,
                      letterSpacing:"0.06em", textTransform:"uppercase",
                      fontFamily:Sans,
                    }}>{badge.label}</span>
                    {iss.location && (
                      <span style={{
                        fontSize:10, color:Gray600,
                        background:Gray100, padding:"4px 9px", borderRadius:RadiusPill,
                        fontFamily:"ui-monospace, monospace",
                        letterSpacing:"0.02em",
                      }}>{iss.location}</span>
                    )}
                  </div>

                  {/* Quote */}
                  {iss.quote && (
                    <div style={{
                      padding:"10px 14px",
                      background:CoralSoft,
                      borderRadius:RadiusSm,
                      marginBottom:10,
                    }}>
                      <div style={{
                        fontFamily:Serif, fontStyle:"italic",
                        fontSize:13, color:"#7f1d1d", lineHeight:1.55,
                        letterSpacing:"-0.005em",
                      }}>"{iss.quote}"</div>
                    </div>
                  )}

                  {/* Pourquoi */}
                  {iss.why && (
                    <div style={{
                      fontSize:12, color:"#7f1d1d", lineHeight:1.55,
                      marginBottom:10,
                    }}>
                      <span style={{fontWeight:600}}>{T.tc_why}:</span>
                      {" "}{iss.why}
                    </div>
                  )}

                  {/* Reformulation */}
                  {iss.fix && (
                    <div style={{
                      padding:"12px 14px",
                      background:GreenSoft,
                      border:"0.5px solid #86efac",
                      borderRadius:RadiusSm,
                      marginBottom: onApplyFix ? 10 : 0,
                    }}>
                      <div style={{
                        fontSize:10, fontWeight:600, color:Green,
                        letterSpacing:"0.1em", textTransform:"uppercase",
                        marginBottom:4,
                      }}>{T.tc_fix}</div>
                      <div style={{
                        fontSize:13, color:"#14532d", lineHeight:1.55,
                      }}>{iss.fix}</div>
                    </div>
                  )}

                  {/* Bouton envoyer dans Ajuster */}
                  {iss.fix && onApplyFix && (
                    <button onClick={()=>onApplyFix(iss)} style={{
                      ...B({
                        width:"100%", padding:"10px 16px", borderRadius:RadiusPill,
                        background:Ink, color:Cream,
                        fontSize:11, fontWeight:600, fontFamily:Sans,
                        letterSpacing:"0.02em",
                        display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6,
                      })
                    }}>
                      {T.tc_send}
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                      </svg>
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{
              padding:"32px 18px",
              background:GreenSoft, borderRadius:RadiusMd,
              border:"0.5px solid "+Green,
              textAlign:"center",
            }}>
              <div style={{
                fontFamily:Serif, fontSize:18, fontWeight:500,
                color:Ink, letterSpacing:"-0.01em",
              }}>{T.tc_no_issues}</div>
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}
