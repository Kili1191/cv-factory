"use client";

// CV Factory v17 - GapRepairModal
//
// Detect gaps in CV chronology (>= 1 month) and propose 4 strategies to make them
// DISAPPEAR (not justify them). Pivot strategique : on ne veut pas avoir a se justifier,
// on veut que les trous n'existent plus visuellement.
//
// 4 strategies :
//   1. Years only format (deterministic, pas d'IA) : reformatte tous les MM/YYYY en YYYY
//   2. Legitimate stretch : etend une experience (avec disclaimer)
//   3. Group experiences : fusionne plusieurs missions courtes en une ligne
//   4. Functional format : conseil pour passer en CV par competences
//
// Props :
//   T            : i18n
//   cv           : CV
//   loading      : bool (loading IA pour les strategies advanced)
//   gaps         : [{gap, beforeExp, afterExp, beforeIdx, afterIdx}]
//   yearStrategy : { applicable, allDisappear, beforeGaps, afterGaps }
//   groupOps     : [{indices, startYear, endYear, count}]
//   unparsableCount : nombre d'experiences avec dates non parsables
//   onApplyYearOnly()                         : applique stratégie 1
//   onApplyExtend(beforeIdx, newEndDate)      : applique stratégie 2
//   onApplyGroup(indices, label)              : applique stratégie 3
//   onClose()

import { useState, useEffect } from "react";
import {
  Ink, Cream, CreamSoft, Paper, Gold, GoldDeep, Purple, PurpleSoft,
  Coral, CoralSoft, Green, GreenSoft, Gray100, Gray200, Gray400, Gray600,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm,
  GradPurple, KEYFRAMES_V17, B,
} from "./tokens";

// Format a parsed date for display ("01/2020", "2020", "present").
function fmt(d, T) {
  if (!d) return "?";
  if (d.present) return T.gr_gap_present || "present";
  if (!d.month) return String(d.year);
  return String(d.month).padStart(2, "0") + "/" + d.year;
}

// Format months count : "5 mois", "1 an", "2 ans".
function fmtMonths(n, T) {
  if (n < 12) return n + " " + (T.gr_gap_months || "mois");
  if (n < 24) return "1 " + (T.gr_gap_year || "an");
  return Math.round(n / 12) + " " + (T.gr_gap_years || "ans");
}

// Petit composant : carte d'un gap detecte.
function GapCard({ gap, T }) {
  return (
    <div style={{
      padding:"14px 16px",
      background:Paper, borderRadius:RadiusMd,
      border:"0.5px solid "+Gray200, boxShadow:ShadowSm,
      marginBottom:10, fontFamily:Sans,
    }}>
      <div style={{
        display:"flex", alignItems:"center", gap:10, marginBottom:6,
      }}>
        <span style={{
          padding:"3px 9px", borderRadius:RadiusPill,
          background:CoralSoft, color:Coral,
          fontSize:11, fontWeight:600,
          letterSpacing:"0.04em",
        }}>{fmtMonths(gap.gap.months, T)}</span>
      </div>
      <div style={{
        fontFamily:Serif, fontSize:14, fontWeight:500,
        color:Ink, letterSpacing:"-0.01em", lineHeight:1.4,
        marginBottom:4,
      }}>
        {(T.gr_gap_between || "entre")}
        {" "}<em style={{fontStyle:"italic"}}>{fmt(gap.gap.start, T)}</em>
        {" "}{(T.gr_gap_and || "et")}
        {" "}<em style={{fontStyle:"italic"}}>{fmt(gap.gap.end, T)}</em>
      </div>
      <div style={{
        fontSize:11, color:Gray600, lineHeight:1.5,
      }}>
        {gap.beforeExp.title || gap.beforeExp.company || "?"}
        {" -> "}
        {gap.afterExp.title || gap.afterExp.company || "?"}
      </div>
    </div>
  );
}

// Carte d'une strategie applicable.
function StrategyCard({
  T, eyebrow, title, sub, warn, btnLabel, btnDisabled,
  accent, accentBg, onApply,
}) {
  return (
    <div style={{
      padding:"16px 18px",
      background:Paper, borderRadius:RadiusMd,
      border:"0.5px solid "+Gray200, boxShadow:ShadowSm,
      marginBottom:12, fontFamily:Sans,
    }}>
      <div style={{
        fontSize:11, fontWeight:600,
        letterSpacing:"0.1em", textTransform:"uppercase",
        color:accent, marginBottom:6,
      }}>{eyebrow}</div>
      <div style={{
        fontFamily:Serif, fontSize:15, fontWeight:500,
        color:Ink, letterSpacing:"-0.01em", lineHeight:1.3,
        marginBottom:6,
      }}>{title}</div>
      <div style={{
        fontSize:12, color:Gray600, lineHeight:1.5,
        marginBottom:10,
      }}>{sub}</div>
      {warn && (
        <div style={{
          padding:"8px 12px",
          background:CoralSoft, color:"#991b1b",
          borderRadius:RadiusSm,
          fontSize:11, lineHeight:1.5,
          marginBottom:10,
        }}>{warn}</div>
      )}
      <button onClick={onApply} disabled={btnDisabled} style={{
        ...B({
          width:"100%", padding:"11px 16px", borderRadius:RadiusPill,
          background: btnDisabled ? Gray100 : Ink,
          color: btnDisabled ? Gray400 : Cream,
          fontFamily:Sans, fontWeight:600, fontSize:12,
          display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
          transition:"all 200ms ease-out",
        })
      }}>
        {btnLabel}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
        </svg>
      </button>
    </div>
  );
}

export default function GapRepairModal({
  T, cv, loading,
  gaps, yearStrategy, groupOps, unparsableCount,
  onApplyYearOnly, onApplyExtend, onApplyGroup, onClose,
}) {

  // Lock body scroll
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Esc to close
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !loading) onClose(); };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [loading, onClose]);

  const noGaps = !gaps || gaps.length === 0;
  const hasMostlyUnparsable = unparsableCount > 0
    && (cv && cv.experience && unparsableCount >= cv.experience.length / 2);

  // For "extend" strategy: applicable if there's at least 1 gap we could close
  // by extending the previous experience to the next start date.
  // The button is per-gap in our UI: we pick the first gap that allows it.
  const firstGapForExtend = (gaps && gaps.length > 0) ? gaps[0] : null;

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:99999,
      display:"flex", flexDirection:"column", justifyContent:"flex-end",
      fontFamily:Sans,
    }}>
      <div style={{
        position:"absolute", inset:0,
        background:"rgba(10,10,10,.55)",
        backdropFilter:"blur(8px)",
        WebkitBackdropFilter:"blur(8px)",
        animation:"cvfFadeIn 200ms ease-out",
      }} onClick={()=>{ if (!loading) onClose(); }}/>

      <div style={{
        position:"relative", background:CreamSoft,
        borderRadius:"32px 32px 0 0",
        maxHeight:"92vh", display:"flex", flexDirection:"column",
        boxShadow:"0 -20px 60px rgba(0,0,0,.2)",
        animation:"cvfSlideUp 280ms cubic-bezier(.32,.72,0,1)",
      }}>
        {/* iOS handle */}
        <div style={{
          width:40, height:4, background:Gray200,
          borderRadius:RadiusPill,
          margin:"10px auto 6px", flexShrink:0,
        }}/>
        {/* Header editorial */}
        <div style={{
          padding:"6px 24px 14px",
          borderBottom:"0.5px solid "+Gray200, flexShrink:0,
          display:"flex", alignItems:"flex-start",
          justifyContent:"space-between", gap:12,
        }}>
          <div style={{flex:1, minWidth:0}}>
            <div style={{
              fontSize:11, fontWeight:600,
              letterSpacing:"0.12em", textTransform:"uppercase",
              color:GoldDeep, marginBottom:4,
            }}>{T.gr_eyebrow}</div>
            <div style={{
              fontFamily:Serif, fontWeight:400, fontSize:22,
              letterSpacing:"-0.02em", color:Ink, lineHeight:1.15,
            }}>
              {T.gr_title_a}
              {" "}<em style={{
                fontStyle:"italic", color:Coral,
              }}>{T.gr_title_em}</em>
              {" "}{T.gr_title_b}
            </div>
            <div style={{
              fontSize:12, color:Gray600, marginTop:4,
              lineHeight:1.5,
            }}>{T.gr_sub}</div>
          </div>
          <button onClick={onClose} disabled={loading} aria-label="close" style={{
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
              }}>{T.gr_running}</div>
              <div style={{
                fontSize:12, color:Gray600, marginTop:6,
              }}>{T.gr_running_sub}</div>
            </div>
          )}

          {/* Most dates unparsable */}
          {!loading && hasMostlyUnparsable && (
            <div style={{
              padding:"18px 18px",
              background:CoralSoft, borderRadius:RadiusMd,
              border:"0.5px solid "+Coral,
              marginBottom:16,
            }}>
              <div style={{
                fontFamily:Serif, fontSize:15, fontWeight:500,
                color:Ink, letterSpacing:"-0.01em", marginBottom:6,
              }}>{T.gr_unparsable}</div>
              <div style={{
                fontSize:12, color:Gray600, lineHeight:1.5,
              }}>{T.gr_unparsable_sub}</div>
            </div>
          )}

          {/* No gaps detected */}
          {!loading && !hasMostlyUnparsable && noGaps && (
            <div style={{
              padding:"24px 18px",
              background:GreenSoft, borderRadius:RadiusMd,
              border:"0.5px solid "+Green,
              textAlign:"center",
            }}>
              <div style={{
                fontFamily:Serif, fontSize:18, fontWeight:500,
                color:Ink, letterSpacing:"-0.01em", marginBottom:6,
              }}>{T.gr_no_gaps_title}</div>
              <div style={{
                fontSize:13, color:Gray600, lineHeight:1.5,
              }}>{T.gr_no_gaps_sub}</div>
            </div>
          )}

          {/* Gaps detected: list + strategies */}
          {!loading && !hasMostlyUnparsable && !noGaps && (
            <>
              {/* Detected gaps section */}
              <div style={{
                fontSize:11, fontWeight:600,
                letterSpacing:"0.1em", textTransform:"uppercase",
                color:GoldDeep, marginBottom:10,
              }}>{T.gr_section_results}</div>

              {gaps.map((g, i) => (
                <GapCard key={i} gap={g} T={T}/>
              ))}

              {/* Strategies section */}
              <div style={{
                fontSize:11, fontWeight:600,
                letterSpacing:"0.1em", textTransform:"uppercase",
                color:GoldDeep, marginTop:24, marginBottom:10,
              }}>{T.gr_section_strategies}</div>

              {/* Strategy 1 : year-only format */}
              {yearStrategy && yearStrategy.applicable && (
                <StrategyCard
                  T={T}
                  eyebrow={
                    yearStrategy.allDisappear
                      ? (T.gr_strat_year_full || "Resout tous les trous")
                      : (T.gr_strat_year_partial || "Resout certains trous")
                  }
                  title={T.gr_strat_year}
                  sub={T.gr_strat_year_sub}
                  warn={T.gr_strat_year_warn}
                  btnLabel={T.gr_strat_year_btn}
                  accent={yearStrategy.allDisappear ? Green : GoldDeep}
                  accentBg={yearStrategy.allDisappear ? GreenSoft : "rgba(201,169,110,.15)"}
                  onApply={onApplyYearOnly}
                />
              )}

              {/* Strategy 2 : legitimate extend (one card per first gap) */}
              {firstGapForExtend && onApplyExtend && (
                <StrategyCard
                  T={T}
                  eyebrow={T.gr_strat_extend}
                  title={
                    (firstGapForExtend.beforeExp.title || firstGapForExtend.beforeExp.company || "?")
                    + " -> "
                    + fmt(firstGapForExtend.afterExp.period
                      ? { year: firstGapForExtend.gap.end.year, month: firstGapForExtend.gap.end.month }
                      : null, T)
                  }
                  sub={T.gr_strat_extend_sub}
                  warn={T.gr_strat_extend_warn}
                  btnLabel={T.gr_strat_extend_btn}
                  accent={GoldDeep}
                  accentBg={"rgba(201,169,110,.15)"}
                  onApply={()=>onApplyExtend(firstGapForExtend)}
                />
              )}

              {/* Strategy 3 : group experiences (if applicable) */}
              {groupOps && groupOps.length > 0 && groupOps.map((op, i) => (
                <StrategyCard
                  key={"grp"+i}
                  T={T}
                  eyebrow={T.gr_strat_group}
                  title={op.startYear + " - " + op.endYear + " (" + op.count + " experiences)"}
                  sub={T.gr_strat_group_sub}
                  warn={T.gr_strat_group_warn}
                  btnLabel={T.gr_strat_group_btn}
                  accent={Purple}
                  accentBg={PurpleSoft}
                  onApply={()=>onApplyGroup(op.indices)}
                />
              ))}

              {/* Strategy 4 : functional format (info only, no apply) */}
              <div style={{
                padding:"14px 16px",
                background:CreamSoft, borderRadius:RadiusMd,
                border:"0.5px solid "+Gray200, boxShadow:ShadowSm,
                marginBottom:12, fontFamily:Sans,
              }}>
                <div style={{
                  fontSize:11, fontWeight:600,
                  letterSpacing:"0.1em", textTransform:"uppercase",
                  color:Gray600, marginBottom:6,
                }}>{T.gr_strat_functional}</div>
                <div style={{
                  fontFamily:Serif, fontSize:14, fontWeight:500,
                  color:Ink, marginBottom:6,
                }}>{T.gr_strat_functional_sub}</div>
                <div style={{
                  fontSize:11, color:Gray600, lineHeight:1.5,
                  fontStyle:"italic",
                }}>{T.gr_strat_functional_help}</div>
              </div>

              {/* No strategies fallback */}
              {(!yearStrategy || !yearStrategy.applicable)
                && (!groupOps || groupOps.length === 0)
                && !firstGapForExtend && (
                <div style={{
                  padding:"18px 18px",
                  background:Paper, borderRadius:RadiusMd,
                  border:"0.5px solid "+Gray200, boxShadow:ShadowSm,
                  textAlign:"center",
                }}>
                  <div style={{
                    fontFamily:Serif, fontSize:15, fontWeight:500,
                    color:Ink, marginBottom:4,
                  }}>{T.gr_no_strategies}</div>
                  <div style={{
                    fontSize:12, color:Gray600, lineHeight:1.5,
                  }}>{T.gr_no_strategies_sub}</div>
                </div>
              )}
            </>
          )}
        </div>

        <style>{KEYFRAMES_V17}</style>
      </div>
    </div>
  );
}
