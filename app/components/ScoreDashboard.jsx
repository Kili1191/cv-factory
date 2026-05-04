"use client";

// CV Factory v17 - ScoreDashboard
//
// Affiche 8 axes de score d'un CV, chaque axe ayant une note 0..100,
// une barre de progression coloree et une recommandation actionnable.
//
// Sur mobile : grille 2 colonnes. Sur desktop large (>=768px) : grille 4 colonnes.
// Tap card -> expand inline avec reco + CTA "Aller a l'outil".
//
// Props :
//   T            : i18n
//   cv           : CV (utilise pour cvIsEmpty)
//   apiKey       : pour bouton run
//   loading      : bool
//   result       : { scores: [{ id, score, reco }...], verdict_global, top_priority } | null
//   onRun()      : declenche l'analyse
//   onCta(axisId): redirige vers l'outil correspondant a l'axe (callback fourni par App)

import { useState, useEffect } from "react";
import {
  Ink, Cream, CreamSoft, Paper, Gold, GoldDeep, Purple, PurpleSoft, Magenta,
  Coral, CoralSoft, Green, GreenSoft, Gray100, Gray200, Gray400, Gray600,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm,
  GradPurple, B,
} from "./tokens";

// 8 axes : id stable, label/sub viennent de T (i18n).
// L'ordre ici detemine l'ordre d'affichage dans la grille.
const AXES = [
  { id: "title",           tKey: "sd_ax_title",           subKey: "sd_ax_title_sub",           ctaKey: "sd_cta_title",           accent: Purple,    bg: PurpleSoft },
  { id: "bullets",         tKey: "sd_ax_bullets",         subKey: "sd_ax_bullets_sub",         ctaKey: "sd_cta_bullets",         accent: Purple,    bg: PurpleSoft },
  { id: "ats",             tKey: "sd_ax_ats",             subKey: "sd_ax_ats_sub",             ctaKey: "sd_cta_ats",             accent: Ink,       bg: Gray100 },
  { id: "relevance",       tKey: "sd_ax_relevance",       subKey: "sd_ax_relevance_sub",       ctaKey: "sd_cta_relevance",       accent: Purple,    bg: PurpleSoft },
  { id: "credibility",     tKey: "sd_ax_credibility",     subKey: "sd_ax_credibility_sub",     ctaKey: "sd_cta_credibility",     accent: Coral,     bg: CoralSoft },
  { id: "design",          tKey: "sd_ax_design",          subKey: "sd_ax_design_sub",          ctaKey: "sd_cta_design",          accent: Purple,    bg: PurpleSoft },
  { id: "readability",     tKey: "sd_ax_readability",     subKey: "sd_ax_readability_sub",     ctaKey: "sd_cta_readability",     accent: Ink,       bg: Gray100 },
  { id: "differentiation", tKey: "sd_ax_differentiation", subKey: "sd_ax_differentiation_sub", ctaKey: "sd_cta_differentiation", accent: Purple,    bg: PurpleSoft },
];

// Couleur du score selon sa valeur (90+ green, 75+ goldDeep, 50+ coral, sinon coral fonce).
function scoreColor(s) {
  if (s >= 85) return Green;
  if (s >= 70) return GoldDeep;
  if (s >= 50) return Coral;
  return "#dc2626";
}
function scoreBg(s) {
  if (s >= 85) return GreenSoft;
  if (s >= 70) return PurpleSoft;
  if (s >= 50) return CoralSoft;
  return CoralSoft;
}

// Card individuelle. Mode collapsed (juste score+nom) ou expanded (+ reco + CTA).
function ScoreAxisCard({ T, axis, score, reco, expanded, onToggle, onCta }) {
  const validScore = typeof score === "number" && !isNaN(score)
    ? Math.max(0, Math.min(100, Math.round(score)))
    : null;

  return (
    <div style={{
      gridColumn: expanded ? "1 / -1" : "auto",
      transition: "grid-column 200ms ease-out",
    }}>
      <button onClick={onToggle} style={{
        ...B({
          width:"100%", textAlign:"left",
          background: Paper,
          border: expanded ? "1.5px solid "+Ink : "0.5px solid "+Gray200,
          borderRadius: RadiusMd,
          padding: "16px 16px 14px",
          boxShadow: expanded ? "0 8px 24px rgba(10,10,10,.08)" : ShadowSm,
          fontFamily: Sans,
          transition: "all 180ms ease-out",
          display: "block",
        })
      }}>
        {/* Score en gros */}
        <div style={{
          display:"flex", alignItems:"center", gap:12, marginBottom:8,
        }}>
          <div style={{
            fontFamily: Serif, fontWeight: 300,
            fontSize: 38, lineHeight: 1,
            letterSpacing: "-0.04em",
            color: validScore !== null ? scoreColor(validScore) : Gray400,
            flexShrink: 0,
            minWidth: 56,
          }}>
            {validScore !== null ? validScore : "..."}
          </div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{
              fontFamily: Serif, fontSize: 14, fontWeight: 500,
              color: Ink, lineHeight: 1.2,
              letterSpacing: "-0.01em",
              marginBottom: 2,
            }}>{T[axis.tKey] || axis.id}</div>
            <div style={{
              fontSize: 11, color: Gray600, lineHeight: 1.35,
            }}>{T[axis.subKey] || ""}</div>
          </div>
        </div>

        {/* Barre de progression */}
        <div style={{
          width: "100%", height: 6, background: Gray100,
          borderRadius: RadiusPill, overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: validScore !== null ? Math.max(2, validScore) + "%" : "0%",
            background: validScore !== null ? scoreColor(validScore) : Gray400,
            borderRadius: RadiusPill,
            transition: "width 400ms ease-out",
          }}/>
        </div>

        {/* Expanded : reco + CTA */}
        {expanded && (
          <div style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: "0.5px solid "+Gray200,
          }}>
            {reco && (
              <>
                <div style={{
                  fontSize: 10, fontWeight: 600,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  color: GoldDeep, marginBottom: 6,
                  fontFamily: Sans,
                }}>{T.sd_reco}</div>
                <div style={{
                  fontFamily: Serif, fontStyle: "italic", fontWeight: 400,
                  fontSize: 13, lineHeight: 1.55,
                  color: Ink, marginBottom: 12,
                  letterSpacing: "-0.005em",
                }}>"{reco}"</div>
              </>
            )}
            <button
              onClick={(e)=>{ e.stopPropagation(); onCta(axis.id); }}
              style={{
                ...B({
                  display:"inline-flex", alignItems:"center", gap:6,
                  padding: "9px 16px", borderRadius: RadiusPill,
                  background: `linear-gradient(135deg, ${Purple}, ${Magenta})`,
                  color: "#fff",
                  border: "none",
                  fontFamily: Sans, fontWeight: 600, fontSize: 12,
                })
              }}
            >
              {T[axis.ctaKey] || T.sd_cta_fix}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
            </button>
          </div>
        )}
      </button>
    </div>
  );
}

export default function ScoreDashboard({ T, cv, apiKey, loading, result, onRun, onCta }) {
  const [expandedId, setExpandedId] = useState(null);
  const [isWide, setIsWide] = useState(false);

  // Detect wide viewport (>=768px) for responsive grid 2->4 cols.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsWide(mql.matches);
    onChange();
    if (mql.addEventListener) {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    } else {
      // Fallback older browsers
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
    }
  }, []);

  const cvIsEmpty = !cv.name && !cv.title && !cv.summary
    && (cv.experience || []).every(e => !e.title && !e.company);

  // Resolve score and reco for an axis.
  const scoresMap = {};
  if (result && Array.isArray(result.scores)) {
    result.scores.forEach(s => {
      if (s && s.id) scoresMap[s.id] = s;
    });
  }

  const cols = isWide ? 4 : 2;

  return (
    <div style={{fontFamily:Sans}}>
      {/* CTA Run en haut */}
      <button onClick={onRun} disabled={loading || cvIsEmpty || !apiKey} style={{
        ...B({
          width:"100%", padding:"15px 22px", borderRadius:RadiusPill,
          background: loading || cvIsEmpty || !apiKey ? Gray200 : GradPurple,
          color: loading || cvIsEmpty || !apiKey ? Gray600 : "#fff",
          fontFamily: Sans, fontWeight: 600, fontSize: 14,
          display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
          marginBottom: 20,
          transition: "all 200ms ease-out",
        })
      }}>
        {loading ? T.sd_running : (result ? T.sd_run : T.sd_run)}
        {!loading && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        )}
      </button>

      {cvIsEmpty && (
        <div style={{
          padding:"18px 16px", background:CreamSoft,
          border:"0.5px solid "+Gray200, borderRadius:RadiusMd,
          fontSize:12, color:Gray600, lineHeight:1.5,
          fontFamily:Sans, textAlign:"center", marginBottom: 16,
        }}>{T.sd_no_cv}</div>
      )}

      {/* Loading spinner state */}
      {loading && (
        <div style={{
          padding:"40px 20px", textAlign:"center",
          background: Paper, borderRadius: RadiusMd,
          border: "0.5px solid "+Gray200,
          boxShadow: ShadowSm,
        }}>
          <div style={{
            width: 42, height: 42, margin: "0 auto 14px",
            border: "3px solid "+Gray200, borderTopColor: Purple,
            borderRadius: "50%",
            animation: "cvfSpin 1s linear infinite",
          }}/>
          <div style={{
            fontFamily: Serif, fontSize: 16, fontWeight: 500,
            color: Ink, letterSpacing: "-0.01em",
          }}>{T.sd_running}</div>
          <div style={{
            fontSize: 12, color: Gray600, marginTop: 6,
          }}>{T.sd_running_sub}</div>
        </div>
      )}

      {/* Resultat : verdict global + priorite + grille 8 axes */}
      {!loading && result && (
        <>
          {/* Verdict global card */}
          {(result.verdict_global || typeof result.global_score === "number") && (
            <div style={{
              padding:"22px 22px",
              background: Ink, color: Cream,
              borderRadius: RadiusMd,
              marginBottom: 16,
              position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position:"absolute", inset:0,
                background:"radial-gradient(ellipse 100% 80% at 90% 0%, rgba(201,169,110,.4) 0%, transparent 60%)",
                pointerEvents:"none",
              }}/>
              <div style={{position:"relative"}}>
                <div style={{
                  fontSize: 11, fontWeight: 600,
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  color: Gold, marginBottom: 8,
                }}>{T.sd_global}</div>
                {typeof result.global_score === "number" && (
                  <div style={{
                    fontFamily: Serif, fontWeight: 300,
                    fontSize: 56, lineHeight: 1,
                    letterSpacing: "-0.04em",
                    color: Cream, marginBottom: 8,
                  }}>{Math.round(result.global_score)}</div>
                )}
                {result.verdict_global && (
                  <div style={{
                    fontFamily: Serif, fontStyle: "italic", fontWeight: 400,
                    fontSize: 16, lineHeight: 1.45,
                    color: Cream,
                    letterSpacing: "-0.01em",
                  }}>"{result.verdict_global}"</div>
                )}
              </div>
            </div>
          )}

          {/* Top priority */}
          {result.top_priority && (
            <div style={{
              padding:"14px 16px",
              background: PurpleSoft,
              border: "0.5px solid rgba(91,61,245,.25)",
              borderRadius: RadiusMd,
              marginBottom: 18,
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700,
                letterSpacing: "0.12em", textTransform: "uppercase",
                color: Purple, marginBottom: 4,
                fontFamily: Sans,
              }}>{T.sd_priority}</div>
              <div style={{
                fontFamily: Sans, fontSize: 13, fontWeight: 500,
                color: Ink, lineHeight: 1.45,
              }}>{result.top_priority}</div>
            </div>
          )}

          {/* Grille des 8 axes */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat("+cols+", 1fr)",
            gap: 10,
            marginBottom: 12,
          }}>
            {AXES.map(axis => {
              const s = scoresMap[axis.id];
              return (
                <ScoreAxisCard
                  key={axis.id}
                  T={T}
                  axis={axis}
                  score={s ? s.score : null}
                  reco={s ? s.reco : null}
                  expanded={expandedId === axis.id}
                  onToggle={()=>setExpandedId(prev => prev === axis.id ? null : axis.id)}
                  onCta={onCta}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
