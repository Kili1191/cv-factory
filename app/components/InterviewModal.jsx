"use client";

// CV Factory v17 - InterviewModal
//
// Flashcards 1 question par page. Navigation suivant/precedent + indicateur dots.
// L'IA retourne des questions adaptees au pays/secteur/niveau du candidat.
//
// Shape attendue de result :
// {
//   country, sector, level, total_questions, questions: [
//     {
//       category: "Technique" | "Comportementale" | "Cas pratique" | "Culture" | "Motivation",
//       question: "...",
//       why: "...", // pourquoi le recruteur la pose
//       answer: {
//         situation: "...",
//         task: "...",
//         action: "...",
//         result: "...",
//         tip: "..."
//       }
//     }
//   ]
// }
//
// Props :
//   T              : i18n
//   cv             : CV
//   apiKey         : string
//   loading        : bool
//   result         : { questions: [...], ... } | null
//   offerText      : string (textarea controlled)
//   setOfferText   : setter
//   prefilledOffer : bool (true if offer was prefilled from Cibler)
//   onRun()
//   onClose()

import { useState, useEffect, useMemo } from "react";
import {
  Ink, Cream, CreamSoft, Paper, Gold, GoldDeep, Purple, PurpleSoft,
  Coral, CoralSoft, Green, GreenSoft, Gray100, Gray200, Gray400, Gray600,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm,
  GradPurple, GradGold, KEYFRAMES_V17, B,
} from "./tokens";

// Couleur d'accent par categorie de question.
function categoryAccent(cat) {
  if (!cat) return { fg: Gray600, bg: Gray100 };
  const c = String(cat).toLowerCase();
  if (c.indexOf("tech") !== -1)        return { fg: Purple,   bg: PurpleSoft };
  if (c.indexOf("comport") !== -1
   || c.indexOf("behav")   !== -1)     return { fg: GoldDeep, bg: "rgba(201,169,110,.15)" };
  if (c.indexOf("cas")     !== -1
   || c.indexOf("case")    !== -1)     return { fg: Coral,    bg: CoralSoft };
  if (c.indexOf("culture") !== -1)     return { fg: Green,    bg: GreenSoft };
  if (c.indexOf("motiv")   !== -1)     return { fg: Ink,      bg: Gray100 };
  return { fg: Gray600, bg: Gray100 };
}

// Petit composant : affiche une section de la reponse STAR.
function StarSection({ label, value, accent }) {
  if (!value || !String(value).trim()) return null;
  return (
    <div style={{marginBottom:12}}>
      <div style={{
        fontSize:10, fontWeight:700,
        letterSpacing:"0.12em", textTransform:"uppercase",
        color:accent, marginBottom:4,
        fontFamily:Sans,
      }}>{label}</div>
      <div style={{
        fontSize:13, color:Ink, lineHeight:1.55,
        fontFamily:Sans,
      }}>{value}</div>
    </div>
  );
}

// Une flashcard avec scroll interne si besoin.
function Flashcard({ T, q }) {
  const accent = categoryAccent(q.category);
  return (
    <div style={{
      display:"flex", flexDirection:"column", gap:14,
      animation:"cvfFadeIn 240ms ease-out",
    }}>
      {/* Tag categorie */}
      <div>
        <span style={{
          display:"inline-flex", alignItems:"center", gap:6,
          padding:"5px 12px", borderRadius:RadiusPill,
          background:accent.bg, color:accent.fg,
          fontSize:11, fontWeight:600,
          fontFamily:Sans,
          letterSpacing:"0.06em", textTransform:"uppercase",
        }}>{q.category || "?"}</span>
      </div>

      {/* La question en serif, taille generous */}
      <div style={{
        fontFamily:Serif, fontWeight:400,
        fontSize:22, lineHeight:1.3,
        letterSpacing:"-0.01em",
        color:Ink,
      }}>{q.question || "?"}</div>

      {/* Le pourquoi (pourquoi le recruteur la pose) */}
      {q.why && (
        <div style={{
          padding:"12px 14px",
          background:CreamSoft,
          borderRadius:RadiusSm,
          border:"0.5px solid "+Gray200,
        }}>
          <div style={{
            fontSize:10, fontWeight:700,
            letterSpacing:"0.12em", textTransform:"uppercase",
            color:GoldDeep, marginBottom:4,
            fontFamily:Sans,
          }}>{T.iv_star_tip || "Conseil"}</div>
          <div style={{
            fontFamily:Serif, fontStyle:"italic",
            fontSize:13, color:Ink, lineHeight:1.5,
            letterSpacing:"-0.005em",
          }}>"{q.why}"</div>
        </div>
      )}

      {/* Reponse STAR */}
      <div style={{
        padding:"16px 18px",
        background:Paper,
        border:"0.5px solid "+Gray200,
        borderRadius:RadiusMd,
        boxShadow:ShadowSm,
      }}>
        <div style={{
          fontSize:11, fontWeight:600,
          letterSpacing:"0.1em", textTransform:"uppercase",
          color:GoldDeep, marginBottom:14,
          fontFamily:Sans,
        }}>{T.iv_star_title}</div>

        {q.answer && (
          <>
            <StarSection
              label={T.iv_star_situation}
              value={q.answer.situation}
              accent={accent.fg}
            />
            <StarSection
              label={T.iv_star_task}
              value={q.answer.task}
              accent={accent.fg}
            />
            <StarSection
              label={T.iv_star_action}
              value={q.answer.action}
              accent={accent.fg}
            />
            <StarSection
              label={T.iv_star_result}
              value={q.answer.result}
              accent={accent.fg}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function InterviewModal({
  T, cv, apiKey, loading, result,
  offerText, setOfferText, prefilledOffer,
  onRun, onClose,
}) {
  const [idx, setIdx] = useState(0);

  // Lock body scroll
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Esc to close
  useEffect(() => {
    const onKey = (e) => {
      if (loading) return;
      if (e.key === "Escape") onClose();
      if (result && result.questions && result.questions.length > 0) {
        if (e.key === "ArrowRight") setIdx(i => Math.min(result.questions.length - 1, i + 1));
        if (e.key === "ArrowLeft")  setIdx(i => Math.max(0, i - 1));
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [loading, onClose, result]);

  // Reset idx when a new result arrives.
  useEffect(() => {
    setIdx(0);
  }, [result]);

  const cvIsEmpty = !cv.name && !cv.title && !cv.summary
    && (cv.experience || []).every(e => !e.title && !e.company);

  const questions = result && Array.isArray(result.questions) ? result.questions : [];
  const total = questions.length;
  const current = total > 0 ? questions[Math.max(0, Math.min(total - 1, idx))] : null;

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:99999,
      display:"flex", flexDirection:"column", justifyContent:"flex-end",
      fontFamily:Sans,
    }}>
      {/* Backdrop */}
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
        maxHeight:"94vh", display:"flex", flexDirection:"column",
        boxShadow:"0 -20px 60px rgba(0,0,0,.2)",
        animation:"cvfSlideUp 280ms cubic-bezier(.32,.72,0,1)",
      }}>
        {/* iOS handle */}
        <div style={{
          width:40, height:4, background:Gray200,
          borderRadius:RadiusPill,
          margin:"10px auto 6px", flexShrink:0,
        }}/>

        {/* Header */}
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
            }}>{T.iv_eyebrow}</div>
            <div style={{
              fontFamily:Serif, fontWeight:400, fontSize:22,
              letterSpacing:"-0.02em", color:Ink, lineHeight:1.15,
            }}>
              {T.iv_title_a}
              {" "}<em style={{
                fontStyle:"italic", color:Gold,
              }}>{T.iv_title_em}</em>
              {T.iv_title_b}
            </div>
            <div style={{
              fontSize:12, color:Gray600, marginTop:4,
              lineHeight:1.5,
            }}>{T.iv_sub}</div>
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

        {/* Body scrollable */}
        <div style={{
          overflowY:"auto",
          padding:"18px 24px 24px",
          flex:1,
        }}>

          {/* Etat 1 : pas de CV */}
          {cvIsEmpty && !loading && (
            <div style={{
              padding:"24px 18px",
              background:CreamSoft, borderRadius:RadiusMd,
              border:"0.5px solid "+Gray200,
              textAlign:"center", color:Gray600,
              fontSize:13, fontFamily:Sans,
            }}>{T.iv_no_cv}</div>
          )}

          {/* Etat 2 : CV charge mais pas encore de questions */}
          {!cvIsEmpty && !loading && !result && (
            <>
              {/* Champ offre optionnel */}
              <div style={{marginBottom:18}}>
                <div style={{
                  fontSize:11, fontWeight:600,
                  letterSpacing:"0.1em", textTransform:"uppercase",
                  color:GoldDeep, marginBottom:8,
                  fontFamily:Sans,
                }}>{T.iv_offer_label}</div>
                {prefilledOffer && (
                  <div style={{
                    padding:"8px 12px",
                    background:GreenSoft, color:Green,
                    borderRadius:RadiusSm,
                    fontSize:11, fontWeight:500, marginBottom:8,
                    fontFamily:Sans,
                    border:"0.5px solid "+Green,
                  }}>{T.iv_offer_already}</div>
                )}
                <textarea
                  value={offerText}
                  onChange={e => setOfferText(e.target.value)}
                  placeholder={T.iv_offer_ph}
                  rows={4}
                  style={{
                    width:"100%",
                    padding:"12px 14px",
                    borderRadius:RadiusSm,
                    border:"0.5px solid "+Gray200,
                    background:Paper,
                    color:Ink, fontSize:13,
                    fontFamily:Sans,
                    outline:"none",
                    resize:"vertical",
                    minHeight:90,
                    boxSizing:"border-box",
                  }}
                />
              </div>

              {/* CTA Run */}
              <button onClick={onRun} disabled={!apiKey} style={{
                ...B({
                  width:"100%", padding:"15px 22px", borderRadius:RadiusPill,
                  background: apiKey ? GradPurple : Gray200,
                  color: apiKey ? "#fff" : Gray600,
                  fontFamily:Sans, fontWeight:600, fontSize:14,
                  display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
                  transition:"all 200ms ease-out",
                })
              }}>
                {T.iv_run}
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
              border:"0.5px solid "+Gray200, boxShadow:ShadowSm,
            }}>
              <div style={{
                width:42, height:42, margin:"0 auto 14px",
                border:"3px solid "+Gray200, borderTopColor:Purple,
                borderRadius:"50%",
                animation:"cvfSpin 1s linear infinite",
              }}/>
              <div style={{
                fontFamily:Serif, fontSize:16, fontWeight:500,
                color:Ink, letterSpacing:"-0.01em",
              }}>{T.iv_running}</div>
              <div style={{
                fontSize:12, color:Gray600, marginTop:6,
              }}>{T.iv_running_sub}</div>
            </div>
          )}

          {/* Etat 4 : flashcards */}
          {!loading && total > 0 && current && (
            <>
              {/* Meta : pays / niveau / total */}
              {(result.country || result.sector || result.level) && (
                <div style={{
                  display:"flex", flexWrap:"wrap", gap:6,
                  marginBottom:16,
                }}>
                  {result.country && (
                    <span style={{
                      padding:"5px 10px", borderRadius:RadiusPill,
                      background:Paper, color:Ink,
                      fontSize:11, fontWeight:500,
                      fontFamily:Sans,
                      border:"0.5px solid "+Gray200,
                    }}>{result.country}</span>
                  )}
                  {result.sector && (
                    <span style={{
                      padding:"5px 10px", borderRadius:RadiusPill,
                      background:Paper, color:Ink,
                      fontSize:11, fontWeight:500,
                      fontFamily:Sans,
                      border:"0.5px solid "+Gray200,
                    }}>{result.sector}</span>
                  )}
                  {result.level && (
                    <span style={{
                      padding:"5px 10px", borderRadius:RadiusPill,
                      background:Paper, color:Ink,
                      fontSize:11, fontWeight:500,
                      fontFamily:Sans,
                      border:"0.5px solid "+Gray200,
                    }}>{result.level}</span>
                  )}
                </div>
              )}

              {/* Indicateur progression */}
              <div style={{
                display:"flex", alignItems:"center",
                justifyContent:"space-between",
                marginBottom:14,
              }}>
                <div style={{
                  fontSize:11, fontWeight:600,
                  letterSpacing:"0.1em", textTransform:"uppercase",
                  color:Gray600,
                }}>
                  {T.iv_progress} {idx + 1} {T.iv_of} {total}
                </div>
                <button onClick={onRun} style={{
                  ...B({
                    padding:"6px 12px", borderRadius:RadiusPill,
                    background:"transparent", color:GoldDeep,
                    border:"0.5px solid "+Gray200,
                    fontSize:11, fontWeight:500,
                    fontFamily:Sans,
                  })
                }}>{T.iv_run_again}</button>
              </div>

              {/* Barre dots de progression */}
              <div style={{
                display:"flex", gap:4, marginBottom:18,
              }}>
                {questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={()=>setIdx(i)}
                    aria-label={"Question " + (i+1)}
                    style={{
                      ...B({
                        flex:1, height:4,
                        background: i === idx ? Ink : (i < idx ? Gold : Gray200),
                        borderRadius:RadiusPill,
                        cursor:"pointer", padding:0,
                        transition:"all 200ms ease-out",
                      })
                    }}
                  />
                ))}
              </div>

              {/* Flashcard */}
              <Flashcard T={T} q={current}/>

              {/* Footer navigation */}
              <div style={{
                display:"flex", gap:10, marginTop:24,
              }}>
                <button
                  onClick={()=>setIdx(i => Math.max(0, i - 1))}
                  disabled={idx === 0}
                  style={{
                    ...B({
                      flex:1, padding:"12px 14px", borderRadius:RadiusPill,
                      background: idx === 0 ? Gray100 : Paper,
                      color: idx === 0 ? Gray400 : Ink,
                      border:"0.5px solid "+(idx === 0 ? Gray200 : Ink),
                      fontFamily:Sans, fontWeight:600, fontSize:13,
                      display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6,
                      transition:"all 200ms ease-out",
                    })
                  }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                  {T.iv_prev}
                </button>
                <button
                  onClick={()=>setIdx(i => Math.min(total - 1, i + 1))}
                  disabled={idx >= total - 1}
                  style={{
                    ...B({
                      flex:1, padding:"12px 14px", borderRadius:RadiusPill,
                      background: idx >= total - 1 ? Gray100 : Ink,
                      color: idx >= total - 1 ? Gray400 : Cream,
                      fontFamily:Sans, fontWeight:600, fontSize:13,
                      display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6,
                      transition:"all 200ms ease-out",
                    })
                  }}>
                  {T.iv_next}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </button>
              </div>

              {/* Si on est sur la derniere : message de fin */}
              {idx === total - 1 && (
                <div style={{
                  marginTop:18, padding:"18px 16px",
                  background:Ink, color:Cream,
                  borderRadius:RadiusMd, textAlign:"center",
                  position:"relative", overflow:"hidden",
                }}>
                  <div style={{
                    position:"absolute", inset:0,
                    background:"radial-gradient(ellipse 100% 80% at 90% 0%, rgba(201,169,110,.4) 0%, transparent 60%)",
                    pointerEvents:"none",
                  }}/>
                  <div style={{position:"relative"}}>
                    <div style={{
                      fontFamily:Serif, fontSize:18, fontWeight:500,
                      color:Cream, letterSpacing:"-0.01em", marginBottom:4,
                    }}>{T.iv_done}</div>
                    <div style={{
                      fontSize:12, color:Gold,
                      lineHeight:1.5,
                    }}>{T.iv_done_sub}</div>
                  </div>
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
