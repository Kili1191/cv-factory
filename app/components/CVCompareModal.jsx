"use client";

// Nuvi v3 - CVCompareModal (refondu palette Nuvi).
//
// Compare 2 versions du CV avec analyse IA.

import { useEffect } from "react";
import {
  Ink, InkMuted, Cream, CreamSoft, Paper, Hairline,
  Coral, CoralSoft, Green, GreenSoft, Purple, Magenta, PurpleSoft,
  Gray100, Gray200, Gray400, Gray600,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm, B, Trans } from "./tokens";
import Sheet from "./Sheet";

// Couleur tag pour type de changement.
function typeBadge(type) {
  const c = (type||"").toLowerCase();
  if (c === "added")
    return { fg:"#fff", bg:Green };
  if (c === "removed")
    return { fg:"#fff", bg:Coral };
  return { fg:"#fff", bg:Purple };  // changed
}

export default function CVCompareModal({
  T, versions, apiKey, loading, result,
  pickA, setPickA, pickB, setPickB, onRun, onClose,
}) {

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !loading) onClose(); };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [loading, onClose]);

  const enoughVersions = versions && versions.length >= 2;
  const canRun = !!(pickA && pickB && pickA !== pickB && apiKey);

  const winnerLabel = (w) => {
    if (w === "A") return T.cmp_winner_a;
    if (w === "B") return T.cmp_winner_b;
    return T.cmp_winner_tie;
  };

  return (
    <Sheet
      eyebrow={T.cmp_eyebrow}
      title={
        <>
          {T.cmp_title_a}
          {" "}<em style={{
            fontFamily:Serif, fontStyle:"italic",
            background: `linear-gradient(135deg, ${Purple}, ${Magenta})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}>{T.cmp_title_em}</em>
          {" "}{T.cmp_title_b}
        </>
      }
      onClose={onClose}
    >
      <p style={{
        fontSize:13, color:InkMuted, lineHeight:1.5,
        margin:"0 0 18px", fontFamily:Sans,
      }}>{T.cmp_sub}</p>

      {/* Etat 1 : pas assez de versions */}
      {!enoughVersions && !loading && (
        <div style={{
          padding:"24px 18px",
          background:CreamSoft, borderRadius:RadiusMd,
          border:"0.5px solid "+Hairline,
          textAlign:"center", color:InkMuted,
          fontSize:13, fontFamily:Sans,
        }}>{T.cmp_no_versions}</div>
      )}

      {/* Etat 2 : selecteurs A/B */}
      {enoughVersions && !loading && !result && (
        <>
          <div style={{marginBottom:14}}>
            <label style={{
              display:"block", fontSize:11, fontWeight:600,
              letterSpacing:"0.1em", textTransform:"uppercase",
              color:Coral, marginBottom:8,
              fontFamily:Sans,
            }}>{T.cmp_pick_a}</label>
            <select
              value={pickA || ""}
              onChange={e=>setPickA(e.target.value || null)}
              style={{
                width:"100%", padding:"12px 14px", borderRadius:RadiusSm,
                border:"1.5px solid "+Hairline, fontSize:14, color:Ink,
                background:Paper, fontFamily:Sans,
                outline:"none", cursor:"pointer",
                boxSizing:"border-box",
              }}>
              <option value="">{T.cmp_pick_ph}</option>
              {versions.map(v => (
                <option key={v.id} value={v.id}>{v.name || "?"}</option>
              ))}
            </select>
          </div>

          <div style={{marginBottom:18}}>
            <label style={{
              display:"block", fontSize:11, fontWeight:600,
              letterSpacing:"0.1em", textTransform:"uppercase",
              color:Coral, marginBottom:8,
              fontFamily:Sans,
            }}>{T.cmp_pick_b}</label>
            <select
              value={pickB || ""}
              onChange={e=>setPickB(e.target.value || null)}
              style={{
                width:"100%", padding:"12px 14px", borderRadius:RadiusSm,
                border:"1.5px solid "+Hairline, fontSize:14, color:Ink,
                background:Paper, fontFamily:Sans,
                outline:"none", cursor:"pointer",
                boxSizing:"border-box",
              }}>
              <option value="">{T.cmp_pick_ph}</option>
              {versions.map(v => (
                <option key={v.id} value={v.id} disabled={v.id === pickA}>
                  {v.name || "?"}
                </option>
              ))}
            </select>
          </div>

          <button onClick={onRun} disabled={!canRun} style={{
            ...B({
              width:"100%", padding:"15px 22px", borderRadius:RadiusPill,
              background: canRun
                ? `linear-gradient(135deg, ${Purple}, ${Magenta})`
                : Hairline,
              color: canRun ? "#fff" : InkMuted,
              fontFamily:Sans, fontWeight:600, fontSize:14,
              border:"none",
              display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
              transition: Trans(["background","color","border-color","box-shadow","transform","opacity"], "fast"),
              boxShadow: canRun ? "0 4px 16px rgba(91, 61, 245, 0.25)" : "none",
            })
          }}>
            {T.cmp_run}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </button>
        </>
      )}

      {/* Etat 3 : loading */}
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
          }}>{T.cmp_loading}</div>
          <div style={{
            fontSize:12, color:InkMuted, marginTop:6,
          }}>{T.cmp_loading_sub}</div>
        </div>
      )}

      {/* Etat 4 : result */}
      {!loading && result && (
        <>
          {/* Verdict winner en haut - hero gradient violet→magenta */}
          {result.winner && (
            <div style={{
              padding:"16px 20px",
              background: result.winner === "tie"
                ? CreamSoft
                : `linear-gradient(135deg, ${Purple}, ${Magenta})`,
              color: result.winner === "tie" ? Ink : "#fff",
              borderRadius:RadiusMd, marginBottom:16,
              position:"relative", overflow:"hidden",
              fontFamily:Sans,
            }}>
              <div style={{position:"relative"}}>
                <div style={{
                  fontSize:11, fontWeight:600,
                  letterSpacing:"0.1em", textTransform:"uppercase",
                  color: result.winner === "tie" ? Coral : "#fff",
                  marginBottom:4, opacity: result.winner === "tie" ? 1 : 0.85,
                }}>{T.cmp_section_better}</div>
                <div style={{
                  fontFamily:Serif, fontSize:18, fontWeight:500,
                  letterSpacing:"-0.01em", lineHeight:1.2,
                }}>{winnerLabel(result.winner)}</div>
              </div>
            </div>
          )}

          {/* Resume - eyebrow Coral */}
          {result.summary && (
            <div style={{marginBottom:16}}>
              <div style={{
                fontSize:11, fontWeight:600,
                letterSpacing:"0.1em", textTransform:"uppercase",
                color:Coral, marginBottom:8, fontFamily:Sans,
              }}>{T.cmp_section_summary}</div>
              <div style={{
                padding:"12px 16px",
                background:Paper, borderRadius:RadiusMd,
                border:"0.5px solid "+Hairline,
                fontSize:13, color:Ink, lineHeight:1.6,
                fontFamily:Sans,
              }}>{result.summary}</div>
            </div>
          )}

          {/* Diffs liste */}
          {result.diffs && result.diffs.length > 0 && (
            <div style={{marginBottom:16}}>
              <div style={{
                fontSize:11, fontWeight:600,
                letterSpacing:"0.1em", textTransform:"uppercase",
                color:Coral, marginBottom:10, fontFamily:Sans,
              }}>{T.cmp_section_diffs}</div>
              {result.diffs.map((d, i) => {
                const badge = typeBadge(d.type);
                const labelType = d.type === "added" ? T.cmp_field_added
                  : d.type === "removed" ? T.cmp_field_removed
                  : T.cmp_field_changed;
                return (
                  <div key={i} style={{
                    padding:"12px 14px",
                    background:Paper,
                    border:"0.5px solid "+Hairline,
                    borderRadius:RadiusMd,
                    marginBottom:8, fontFamily:Sans,
                  }}>
                    <div style={{
                      display:"flex", gap:8, alignItems:"center",
                      marginBottom:6, flexWrap:"wrap",
                    }}>
                      <span style={{
                        fontSize:10, fontWeight:600, color:badge.fg,
                        background:badge.bg,
                        padding:"3px 9px", borderRadius:RadiusPill,
                        letterSpacing:"0.06em", textTransform:"uppercase",
                      }}>{labelType}</span>
                      <span style={{
                        fontSize:10, color:InkMuted,
                        background:Hairline, padding:"3px 8px", borderRadius:RadiusPill,
                        fontFamily:"ui-monospace, monospace",
                      }}>{d.field || "?"}</span>
                    </div>
                    {d.old && (
                      <div style={{
                        padding:"7px 11px", marginBottom:5,
                        background:CoralSoft, borderRadius:RadiusSm,
                        fontSize:11, color:"#7f1d1d", lineHeight:1.5,
                        textDecoration: d.type === "changed" ? "line-through" : "none",
                      }}>{d.old}</div>
                    )}
                    {d.new && (
                      <div style={{
                        padding:"7px 11px",
                        background:GreenSoft, borderRadius:RadiusSm,
                        fontSize:11, color:"#15803d", lineHeight:1.5,
                      }}>{d.new}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Verdict IA - terracotta */}
          {result.verdict && (
            <div style={{marginBottom:16}}>
              <div style={{
                fontSize:11, fontWeight:600,
                letterSpacing:"0.1em", textTransform:"uppercase",
                color:Coral, marginBottom:8, fontFamily:Sans,
              }}>{T.cmp_section_verdict}</div>
              <div style={{
                padding:"14px 16px",
                background:CoralSoft, borderRadius:RadiusMd,
                border:"0.5px solid "+Coral,
                fontFamily:Serif, fontStyle:"italic",
                fontSize:13, color:Ink, lineHeight:1.6,
                letterSpacing:"-0.005em",
              }}>"{result.verdict}"</div>
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}
