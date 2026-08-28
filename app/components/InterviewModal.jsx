"use client";
// CV Factory v17 - InterviewModal (Nuvi v3 palette)
//
// Flashcards 1 question par page. Navigation suivant/precedent + indicateur dots.
// L'IA retourne des questions adaptees au pays/secteur/niveau du candidat.

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Ink, Cream, CreamSoft, Paper, Purple, Magenta, PurpleSoft,
  Coral, CoralSoft, Green, GreenSoft, Gray100, Gray200, Gray400,
  Hairline, InkMuted,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm,
  KEYFRAMES_V17, B,
} from "./tokens";

// Couleur d'accent par categorie de question.
function categoryAccent(cat) {
  if (!cat) return { fg: InkMuted, bg: Gray100 };
  const c = String(cat).toLowerCase();
  if (c.indexOf("tech") !== -1)        return { fg: Purple,   bg: PurpleSoft };
  if (c.indexOf("comport") !== -1
   || c.indexOf("behav")   !== -1)     return { fg: Coral,    bg: CoralSoft };
  if (c.indexOf("cas")     !== -1
   || c.indexOf("case")    !== -1)     return { fg: Magenta,  bg: PurpleSoft };
  if (c.indexOf("culture") !== -1)     return { fg: Green,    bg: GreenSoft };
  if (c.indexOf("motiv")   !== -1)     return { fg: Ink,      bg: Gray100 };
  return { fg: InkMuted, bg: Gray100 };
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
          border:"0.5px solid "+Hairline,
        }}>
          <div style={{
            fontSize:10, fontWeight:700,
            letterSpacing:"0.12em", textTransform:"uppercase",
            color:Coral, marginBottom:4,
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
        border:"0.5px solid "+Hairline,
        borderRadius:RadiusMd,
        boxShadow:ShadowSm,
      }}>
        <div style={{
          fontSize:11, fontWeight:600,
          letterSpacing:"0.1em", textTransform:"uppercase",
          color:Coral, marginBottom:14,
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

// === v2 Interview Continuity ===
// Helper : accent par categorie de "question a poser au recruteur"
function categoryAccentAsk(cat) {
  if (!cat) return { fg: InkMuted, bg: Gray100, label: "" };
  const c = String(cat).toLowerCase();
  if (c === "role")     return { fg: Purple,  bg: PurpleSoft };
  if (c === "team")     return { fg: Green,   bg: GreenSoft };
  if (c === "strategy") return { fg: Magenta, bg: PurpleSoft };
  if (c === "culture")  return { fg: Coral,   bg: CoralSoft };
  if (c === "next")     return { fg: Ink,     bg: Gray100 };
  return { fg: InkMuted, bg: Gray100 };
}

// Section "Questions a poser au recruteur" : se rend dans le tab "before"
// apres les flashcards principales. Cards organisees par categorie avec
// "why this question" et "best for" (round suggere).
function AskRecruiterSection({ T, loading, result, hasMainResult, onRun, onCopyAll }) {
  const [copiedIdx, setCopiedIdx] = useState(-1);
  const [copiedAll, setCopiedAll] = useState(false);

  const questions = result && Array.isArray(result.questions) ? result.questions : [];

  // Group questions by category to render sections.
  const grouped = useMemo(() => {
    const order = ["role", "team", "strategy", "culture", "next"];
    const buckets = {};
    questions.forEach(q => {
      const k = String(q.category || "role").toLowerCase();
      if (!buckets[k]) buckets[k] = [];
      buckets[k].push(q);
    });
    return order.map(cat => ({ cat, items: buckets[cat] || [] })).filter(g => g.items.length > 0);
  }, [questions]);

  const labelFor = (cat) => {
    if (cat === "role")     return T.iv_qta_cat_role;
    if (cat === "team")     return T.iv_qta_cat_team;
    if (cat === "strategy") return T.iv_qta_cat_strategy;
    if (cat === "culture")  return T.iv_qta_cat_culture;
    if (cat === "next")     return T.iv_qta_cat_next;
    return cat;
  };

  const copyOne = (idx, text) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(-1), 1800);
    });
  };

  const copyAll = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    const text = grouped.map(g =>
      "## " + labelFor(g.cat).toUpperCase() + "\n"
      + g.items.map((q, i) => (i+1) + ". " + (q.question || "")).join("\n")
    ).join("\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1800);
      if (onCopyAll) onCopyAll();
    });
  };

  return (
    <div style={{
      marginTop:32,
      paddingTop:24,
      borderTop:"0.5px solid "+Hairline,
    }}>
      {/* Eyebrow + titre */}
      <div style={{
        fontSize:11, fontWeight:600,
        letterSpacing:"0.12em", textTransform:"uppercase",
        color:Coral, marginBottom:4, fontFamily:Sans,
      }}>{T.iv_qta_eyebrow}</div>
      <div style={{
        fontFamily:Serif, fontWeight:400, fontSize:20,
        letterSpacing:"-0.02em", color:Ink, lineHeight:1.2,
        marginBottom:6,
      }}>{T.iv_qta_title}</div>
      <div style={{
        fontSize:12, color:InkMuted, marginBottom:18,
        lineHeight:1.5, fontFamily:Sans,
      }}>{T.iv_qta_sub}</div>

      {/* Etat 1 : pas encore de main result, on dit qu'il faut commencer par la */}
      {!hasMainResult && !loading && (
        <div style={{
          padding:"18px 16px",
          background:CreamSoft, borderRadius:RadiusMd,
          border:"0.5px solid "+Hairline,
          textAlign:"center", color:InkMuted,
          fontSize:12, fontFamily:Sans, lineHeight:1.5,
        }}>{T.iv_qta_empty}</div>
      )}

      {/* Etat 2 : main result OK mais ask-recruiter pas encore lance : bouton run */}
      {hasMainResult && !loading && questions.length === 0 && (
        <button onClick={onRun} style={{
          ...B({
            width:"100%", padding:"14px 22px", borderRadius:RadiusPill,
            background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
            color:"#fff",
            border:"none",
            fontFamily:Sans, fontWeight:600, fontSize:13,
            display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
            transition:"all 200ms ease-out",
          })
        }}>
          {T.iv_qta_run}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        </button>
      )}

      {/* Etat 3 : loading */}
      {loading && (
        <div style={{
          padding:"32px 18px", textAlign:"center",
          background:Paper, borderRadius:RadiusMd,
          border:"0.5px solid "+Hairline,
        }}>
          <div style={{
            width:32, height:32, margin:"0 auto 12px",
            border:"2.5px solid "+Hairline, borderTopColor:Purple,
            borderRadius:"50%",
            animation:"cvfSpin 1s linear infinite",
          }}/>
          <div style={{
            fontSize:13, color:InkMuted, fontFamily:Sans,
          }}>{T.iv_qta_loading}</div>
        </div>
      )}

      {/* Etat 4 : questions affichees */}
      {!loading && questions.length > 0 && (
        <>
          {/* Bouton copier toutes */}
          <div style={{
            display:"flex", justifyContent:"flex-end",
            marginBottom:14,
          }}>
            <button onClick={copyAll} style={{
              ...B({
                padding:"7px 14px", borderRadius:RadiusPill,
                background: copiedAll ? GreenSoft : Paper,
                color: copiedAll ? Green : Ink,
                border:"0.5px solid "+(copiedAll ? Green : Hairline),
                fontSize:11, fontWeight:600,
                fontFamily:Sans, letterSpacing:"0.02em",
                display:"inline-flex", alignItems:"center", gap:6,
                transition:"all 200ms ease-out",
              })
            }}>
              {copiedAll ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                  {T.iv_qta_copied}
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  {T.iv_qta_copy_all}
                </>
              )}
            </button>
          </div>

          {/* Sections par categorie */}
          {grouped.map((g, gi) => {
            const accent = categoryAccentAsk(g.cat);
            return (
              <div key={g.cat} style={{ marginBottom:gi === grouped.length - 1 ? 0 : 22 }}>
                <div style={{
                  display:"inline-block",
                  padding:"4px 10px", borderRadius:RadiusPill,
                  background:accent.bg, color:accent.fg,
                  fontSize:10, fontWeight:700,
                  letterSpacing:"0.08em", textTransform:"uppercase",
                  marginBottom:10, fontFamily:Sans,
                }}>{labelFor(g.cat)}</div>
                {g.items.map((q, qi) => {
                  const globalIdx = grouped.slice(0, gi).reduce((acc, prev) => acc + prev.items.length, 0) + qi;
                  const isCopied = copiedIdx === globalIdx;
                  return (
                    <div key={qi} style={{
                      background:Paper, borderRadius:RadiusMd,
                      border:"0.5px solid "+Hairline,
                      boxShadow:ShadowSm,
                      padding:"14px 16px",
                      marginBottom:10,
                      fontFamily:Sans,
                    }}>
                      <div style={{
                        fontFamily:Serif, fontSize:15, fontWeight:500,
                        color:Ink, lineHeight:1.5,
                        letterSpacing:"-0.005em",
                        marginBottom:8,
                      }}>"{q.question || ""}"</div>
                      {q.why && (
                        <div style={{
                          fontSize:11, color:InkMuted,
                          lineHeight:1.5, marginBottom:6,
                        }}>
                          <span style={{fontWeight:600, color:Coral}}>{T.iv_qta_why}</span>
                          {" : " + q.why}
                        </div>
                      )}
                      <div style={{
                        display:"flex", alignItems:"center",
                        justifyContent:"space-between", gap:10,
                        flexWrap:"wrap",
                      }}>
                        {q.best_for ? (
                          <span style={{
                            fontSize:10, color:InkMuted,
                            fontFamily:Sans, letterSpacing:"0.04em",
                            textTransform:"uppercase", fontWeight:600,
                          }}>
                            {T.iv_qta_for + " : " + q.best_for}
                          </span>
                        ) : <span/>}
                        <button onClick={()=>copyOne(globalIdx, q.question || "")} style={{
                          ...B({
                            padding:"5px 11px", borderRadius:RadiusPill,
                            background: isCopied ? GreenSoft : "transparent",
                            color: isCopied ? Green : InkMuted,
                            border:"0.5px solid "+(isCopied ? Green : Hairline),
                            fontSize:10, fontWeight:600,
                            fontFamily:Sans, letterSpacing:"0.04em",
                            textTransform:"uppercase",
                            display:"inline-flex", alignItems:"center", gap:5,
                            transition:"all 200ms ease-out",
                          })
                        }}>
                          {isCopied ? T.iv_qta_copied : T.iv_qta_copy_one}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// === v2 Tab Apres : composants ===

// AfterContextForm : formulaire de contexte (recruteur, type, duree, date, recap)
// Composant controle, prend afterContext + setAfterContext.
function AfterContextForm({ T, afterContext, setAfterContext }) {
  const update = (key, val) => setAfterContext(prev => ({ ...prev, [key]: val }));
  const fld = {
    fontSize:11, fontWeight:600,
    letterSpacing:"0.08em", textTransform:"uppercase",
    color:Coral, marginBottom:6, fontFamily:Sans,
  };
  const inputStyle = {
    width:"100%", padding:"9px 12px",
    borderRadius:RadiusSm,
    border:"0.5px solid "+Hairline,
    background:Paper, color:Ink,
    fontSize:13, fontFamily:Sans,
    outline:"none",
    boxSizing:"border-box",
  };
  return (
    <div style={{marginBottom:24}}>
      <div style={{
        fontSize:11, fontWeight:600,
        letterSpacing:"0.12em", textTransform:"uppercase",
        color:Coral, marginBottom:14, fontFamily:Sans,
      }}>{T.iv_af_section_context}</div>

      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",
        gap:12, marginBottom:14,
      }}>
        <div>
          <div style={fld}>{T.iv_af_recruiter_name}</div>
          <input type="text" value={afterContext.recruiterName || ""}
            onChange={e => update("recruiterName", e.target.value)}
            placeholder={T.iv_af_recruiter_ph}
            style={inputStyle}/>
        </div>
        <div>
          <div style={fld}>{T.iv_af_type}</div>
          <select value={afterContext.type || "video"}
            onChange={e => update("type", e.target.value)}
            style={{...inputStyle, cursor:"pointer"}}>
            <option value="video">{T.iv_af_type_video}</option>
            <option value="phone">{T.iv_af_type_phone}</option>
            <option value="onsite">{T.iv_af_type_onsite}</option>
            <option value="panel">{T.iv_af_type_panel}</option>
          </select>
        </div>
        <div>
          <div style={fld}>{T.iv_af_duration}</div>
          <input type="number" min="0" value={afterContext.duration || ""}
            onChange={e => update("duration", e.target.value)}
            placeholder={T.iv_af_duration_ph}
            style={inputStyle}/>
        </div>
        <div>
          <div style={fld}>{T.iv_af_date}</div>
          <input type="date" value={afterContext.date || ""}
            onChange={e => update("date", e.target.value)}
            style={inputStyle}/>
        </div>
      </div>

      <div>
        <div style={fld}>{T.iv_af_recap_label}</div>
        <textarea value={afterContext.recap || ""}
          onChange={e => update("recap", e.target.value)}
          placeholder={T.iv_af_recap_ph}
          rows={6}
          style={{
            ...inputStyle,
            minHeight:120, resize:"vertical",
            lineHeight:1.5,
          }}/>
      </div>
    </div>
  );
}

// EmailCard : carte email de remerciement avec etats run / loading / result.
function EmailCard({ T, loading, result, tone, setTone, recapFilled, onRun }) {
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const copy = (text, setter) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setter(true);
      setTimeout(() => setter(false), 1800);
    });
  };

  const tonePill = (val, label) => ({
    padding:"6px 12px", borderRadius:RadiusPill,
    background: tone === val ? Ink : Paper,
    color: tone === val ? Cream : Ink,
    border:"0.5px solid "+(tone === val ? Ink : Hairline),
    fontFamily:Sans, fontWeight: tone === val ? 600 : 500,
    fontSize:11, letterSpacing:"0.02em",
    transition:"all 180ms ease-out", cursor:"pointer",
  });

  return (
    <div style={{
      background:Paper, borderRadius:RadiusMd,
      border:"0.5px solid "+Hairline,
      boxShadow:ShadowSm,
      padding:18, marginBottom:16,
      fontFamily:Sans,
    }}>
      <div style={{
        display:"flex", alignItems:"center", gap:10,
        marginBottom:10,
      }}>
        <div style={{
          width:34, height:34, borderRadius:9,
          background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
          color:"#fff",
          display:"flex", alignItems:"center", justifyContent:"center",
          flexShrink:0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <div>
          <div style={{
            fontFamily:Serif, fontWeight:500, fontSize:16,
            color:Ink, letterSpacing:"-0.01em",
          }}>{T.iv_em_card_title}</div>
          <div style={{fontSize:11, color:InkMuted, marginTop:2}}>
            {T.iv_em_card_sub}
          </div>
        </div>
      </div>

      {/* Etat 1 : pas encore genere : tone selector + bouton run */}
      {!loading && !result && (
        <>
          <div style={{
            fontSize:10, fontWeight:600,
            letterSpacing:"0.08em", textTransform:"uppercase",
            color:InkMuted, marginBottom:8, marginTop:6,
            fontFamily:Sans,
          }}>{T.iv_em_tone_label}</div>
          <div style={{
            display:"flex", flexWrap:"wrap", gap:6, marginBottom:14,
          }}>
            <button onClick={()=>setTone("warm")} style={B(tonePill("warm", T.iv_em_tone_warm))}>{T.iv_em_tone_warm}</button>
            <button onClick={()=>setTone("pro")} style={B(tonePill("pro", T.iv_em_tone_pro))}>{T.iv_em_tone_pro}</button>
            <button onClick={()=>setTone("concise")} style={B(tonePill("concise", T.iv_em_tone_concise))}>{T.iv_em_tone_concise}</button>
            <button onClick={()=>setTone("assertive")} style={B(tonePill("assertive", T.iv_em_tone_assertive))}>{T.iv_em_tone_assertive}</button>
          </div>
          <button onClick={onRun} disabled={!recapFilled} style={{
            ...B({
              width:"100%", padding:"12px 18px", borderRadius:RadiusPill,
              background: recapFilled ? `linear-gradient(135deg, ${Purple}, ${Magenta})` : Gray200,
              color: recapFilled ? "#fff" : InkMuted,
              border:"none",
              fontFamily:Sans, fontWeight:600, fontSize:13,
              display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
              transition:"all 200ms ease-out",
            })
          }}>
            {T.iv_em_run}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </button>
        </>
      )}

      {/* Etat 2 : loading */}
      {loading && (
        <div style={{
          padding:"24px 12px", textAlign:"center",
        }}>
          <div style={{
            width:28, height:28, margin:"0 auto 10px",
            border:"2px solid "+Hairline, borderTopColor:Purple,
            borderRadius:"50%",
            animation:"cvfSpin 1s linear infinite",
          }}/>
          <div style={{fontSize:12, color:InkMuted}}>{T.iv_em_loading}</div>
        </div>
      )}

      {/* Etat 3 : result : sujet + corps + boutons copier + tone selector pour regenerer */}
      {!loading && result && (
        <>
          {/* Sujet */}
          <div style={{
            background:CreamSoft, borderRadius:RadiusSm,
            padding:"10px 12px", marginBottom:10,
            border:"0.5px solid "+Hairline,
          }}>
            <div style={{
              fontSize:9, fontWeight:700,
              letterSpacing:"0.1em", textTransform:"uppercase",
              color:Coral, marginBottom:3,
            }}>{T.iv_em_subject}</div>
            <div style={{
              fontSize:13, fontWeight:500, color:Ink,
              lineHeight:1.4,
            }}>{result.subject || ""}</div>
          </div>
          {/* Corps */}
          <div style={{
            background:CreamSoft, borderRadius:RadiusSm,
            padding:"12px 14px", marginBottom:14,
            border:"0.5px solid "+Hairline,
          }}>
            <div style={{
              fontSize:9, fontWeight:700,
              letterSpacing:"0.1em", textTransform:"uppercase",
              color:Coral, marginBottom:6,
            }}>{T.iv_em_body}</div>
            <div style={{
              fontSize:13, color:Ink, lineHeight:1.6,
              whiteSpace:"pre-wrap",
              fontFamily:Sans,
            }}>{result.body || ""}</div>
          </div>
          {/* Boutons copier */}
          <div style={{display:"flex", flexWrap:"wrap", gap:6, marginBottom:14}}>
            <button onClick={()=>copy(result.subject || "", setCopiedSubject)} style={{
              ...B({
                padding:"7px 12px", borderRadius:RadiusPill,
                background: copiedSubject ? GreenSoft : Paper,
                color: copiedSubject ? Green : Ink,
                border:"0.5px solid "+(copiedSubject ? Green : Hairline),
                fontSize:11, fontWeight:600, fontFamily:Sans,
                letterSpacing:"0.02em",
              })
            }}>
              {copiedSubject ? T.iv_em_copied : T.iv_em_copy_subject}
            </button>
            <button onClick={()=>copy(result.body || "", setCopiedBody)} style={{
              ...B({
                padding:"7px 12px", borderRadius:RadiusPill,
                background: copiedBody ? GreenSoft : Paper,
                color: copiedBody ? Green : Ink,
                border:"0.5px solid "+(copiedBody ? Green : Hairline),
                fontSize:11, fontWeight:600, fontFamily:Sans,
                letterSpacing:"0.02em",
              })
            }}>
              {copiedBody ? T.iv_em_copied : T.iv_em_copy_body}
            </button>
            <button onClick={()=>copy(
                "Sujet: " + (result.subject || "") + "\n\n" + (result.body || ""),
                setCopiedAll
              )} style={{
              ...B({
                padding:"7px 12px", borderRadius:RadiusPill,
                background: copiedAll ? GreenSoft : `linear-gradient(135deg, ${Purple}, ${Magenta})`,
                color: copiedAll ? Green : "#fff",
                border:"none",
                fontSize:11, fontWeight:600, fontFamily:Sans,
                letterSpacing:"0.02em",
              })
            }}>
              {copiedAll ? T.iv_em_copied : T.iv_em_copy_all}
            </button>
          </div>
          {/* Tone selector + regenerate */}
          <div style={{
            paddingTop:14,
            borderTop:"0.5px solid "+Hairline,
          }}>
            <div style={{
              fontSize:10, fontWeight:600,
              letterSpacing:"0.08em", textTransform:"uppercase",
              color:InkMuted, marginBottom:8,
            }}>{T.iv_em_regenerate}</div>
            <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
              <button onClick={()=>{ setTone("warm"); onRun(); }} style={B(tonePill("warm", T.iv_em_tone_warm))}>{T.iv_em_tone_warm}</button>
              <button onClick={()=>{ setTone("pro"); onRun(); }} style={B(tonePill("pro", T.iv_em_tone_pro))}>{T.iv_em_tone_pro}</button>
              <button onClick={()=>{ setTone("concise"); onRun(); }} style={B(tonePill("concise", T.iv_em_tone_concise))}>{T.iv_em_tone_concise}</button>
              <button onClick={()=>{ setTone("assertive"); onRun(); }} style={B(tonePill("assertive", T.iv_em_tone_assertive))}>{T.iv_em_tone_assertive}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// DebriefCard : carte auto-debrief avec forces / improvements / red flags / verdict / next steps.
function DebriefCard({ T, loading, result, recapFilled, onRun }) {
  return (
    <div style={{
      background:Paper, borderRadius:RadiusMd,
      border:"0.5px solid "+Hairline,
      boxShadow:ShadowSm,
      padding:18, marginBottom:16,
      fontFamily:Sans,
    }}>
      <div style={{
        display:"flex", alignItems:"center", gap:10,
        marginBottom:10,
      }}>
        <div style={{
          width:34, height:34, borderRadius:9,
          background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
          color:"#fff",
          display:"flex", alignItems:"center", justifyContent:"center",
          flexShrink:0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div>
          <div style={{
            fontFamily:Serif, fontWeight:500, fontSize:16,
            color:Ink, letterSpacing:"-0.01em",
          }}>{T.iv_db_card_title}</div>
          <div style={{fontSize:11, color:InkMuted, marginTop:2}}>
            {T.iv_db_card_sub}
          </div>
        </div>
      </div>

      {/* Etat 1 : pas encore genere : bouton run */}
      {!loading && !result && (
        <button onClick={onRun} disabled={!recapFilled} style={{
          ...B({
            width:"100%", padding:"12px 18px", borderRadius:RadiusPill,
            background: recapFilled ? `linear-gradient(135deg, ${Purple}, ${Magenta})` : Gray200,
            color: recapFilled ? "#fff" : InkMuted,
            border:"none",
            fontFamily:Sans, fontWeight:600, fontSize:13,
            display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
            transition:"all 200ms ease-out",
            marginTop:6,
          })
        }}>
          {T.iv_db_run}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        </button>
      )}

      {/* Etat 2 : loading */}
      {loading && (
        <div style={{
          padding:"24px 12px", textAlign:"center",
        }}>
          <div style={{
            width:28, height:28, margin:"0 auto 10px",
            border:"2px solid "+Hairline, borderTopColor:Purple,
            borderRadius:"50%",
            animation:"cvfSpin 1s linear infinite",
          }}/>
          <div style={{fontSize:12, color:InkMuted}}>{T.iv_db_loading}</div>
        </div>
      )}

      {/* Etat 3 : result */}
      {!loading && result && (
        <div style={{marginTop:6}}>
          {/* Verdict en haut, tres visible */}
          {result.verdict && (
            <div style={{
              padding:"14px 16px",
              background:CreamSoft,
              border:"0.5px solid "+Hairline,
              borderRadius:RadiusMd,
              marginBottom:14,
            }}>
              <div style={{
                fontSize:10, fontWeight:700,
                letterSpacing:"0.1em", textTransform:"uppercase",
                color:Coral, marginBottom:5,
              }}>{T.iv_db_verdict}</div>
              <div style={{
                fontFamily:Serif, fontWeight:500, fontSize:16,
                color:Ink, letterSpacing:"-0.01em",
                marginBottom:4,
              }}>{result.verdict.label || ""}</div>
              <div style={{
                fontSize:12, color:InkMuted, lineHeight:1.5,
                fontStyle:"italic",
              }}>{result.verdict.why || ""}</div>
            </div>
          )}

          {/* Forces */}
          {Array.isArray(result.strengths) && result.strengths.length > 0 && (
            <div style={{marginBottom:14}}>
              <div style={{
                fontSize:11, fontWeight:600,
                letterSpacing:"0.08em", textTransform:"uppercase",
                color:Green, marginBottom:8,
              }}>{T.iv_db_strengths}</div>
              {result.strengths.map((s, i) => (
                <div key={i} style={{
                  display:"flex", gap:8, alignItems:"flex-start",
                  padding:"9px 12px", marginBottom:6,
                  background:GreenSoft, borderRadius:RadiusSm,
                  border:"0.5px solid "+Green,
                  fontSize:12, color:Ink, lineHeight:1.5,
                }}>
                  <span style={{color:Green, fontWeight:700, flexShrink:0}}>+</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}

          {/* Improvements */}
          {Array.isArray(result.improvements) && result.improvements.length > 0 && (
            <div style={{marginBottom:14}}>
              <div style={{
                fontSize:11, fontWeight:600,
                letterSpacing:"0.08em", textTransform:"uppercase",
                color:Coral, marginBottom:8,
              }}>{T.iv_db_improvements}</div>
              {result.improvements.map((s, i) => (
                <div key={i} style={{
                  display:"flex", gap:8, alignItems:"flex-start",
                  padding:"9px 12px", marginBottom:6,
                  background:CoralSoft, borderRadius:RadiusSm,
                  border:"0.5px solid "+Coral,
                  fontSize:12, color:Ink, lineHeight:1.5,
                }}>
                  <span style={{color:Coral, fontWeight:700, flexShrink:0}}>!</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}

          {/* Red flags */}
          {Array.isArray(result.red_flags) && (
            <div style={{marginBottom:14}}>
              <div style={{
                fontSize:11, fontWeight:600,
                letterSpacing:"0.08em", textTransform:"uppercase",
                color:Coral, marginBottom:8,
              }}>{T.iv_db_red_flags}</div>
              {result.red_flags.length === 0 ? (
                <div style={{
                  padding:"9px 12px",
                  background:CreamSoft, borderRadius:RadiusSm,
                  border:"0.5px solid "+Hairline,
                  fontSize:12, color:InkMuted, fontStyle:"italic",
                }}>{T.iv_db_no_red_flags}</div>
              ) : (
                result.red_flags.map((s, i) => (
                  <div key={i} style={{
                    display:"flex", gap:8, alignItems:"flex-start",
                    padding:"9px 12px", marginBottom:6,
                    background:CoralSoft, borderRadius:RadiusSm,
                    border:"0.5px solid "+Coral,
                    fontSize:12, color:Ink, lineHeight:1.5,
                  }}>
                    <span style={{color:Coral, fontWeight:700, flexShrink:0}}>x</span>
                    <span>{s}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Next steps */}
          {Array.isArray(result.next_steps) && result.next_steps.length > 0 && (
            <div>
              <div style={{
                fontSize:11, fontWeight:600,
                letterSpacing:"0.08em", textTransform:"uppercase",
                color:Purple, marginBottom:8,
              }}>{T.iv_db_next_steps}</div>
              {result.next_steps.map((s, i) => (
                <div key={i} style={{
                  display:"flex", gap:8, alignItems:"flex-start",
                  padding:"9px 12px", marginBottom:6,
                  background:PurpleSoft, borderRadius:RadiusSm,
                  border:"0.5px solid "+Purple,
                  fontSize:12, color:Ink, lineHeight:1.5,
                }}>
                  <span style={{color:Purple, fontWeight:700, flexShrink:0}}>{i + 1}.</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// === v2 Tab Pendant : composants ===

// CheatSheetCard : pense-bete A4 imprimable.
// Etat 1 : bouton run. Etat 2 : loading. Etat 3 : preview imprimable + boutons
// imprimer / telecharger PDF.
function CheatSheetCard({ T, cv, loading, result, hasMainResult, onRun, notify }) {
  const sheetRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  // Imprime le pense-bete via window.print() avec un container clone temporaire
  // qui passe par une feuille de style "print" injectee a la volee.
  const printSheet = () => {
    if (!sheetRef.current) return;
    const html = sheetRef.current.innerHTML;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) {
      if (notify) notify("Bloque par le navigateur");
      return;
    }
    w.document.write(
      '<html><head><title>' + (T.iv_cs_card_title || "Pense-bete") + '</title>'
      + '<style>'
      + '@page { size: A4 portrait; margin: 12mm; }'
      + '* { box-sizing: border-box; }'
      + 'body { font-family: Inter, Helvetica, Arial, sans-serif; color:#0a0a0a; margin:0; padding:0; }'
      + '</style></head><body>' + html + '</body></html>'
    );
    w.document.close();
    setTimeout(() => { w.print(); }, 250);
  };

  // Telecharge le pense-bete en PDF (A4 portrait, 1 page)
  const downloadPDF = async () => {
    if (!sheetRef.current) return;
    setDownloading(true);
    try {
      const loadHtml2pdf = () => {
        if (typeof window === "undefined") return Promise.reject(new Error("no window"));
        if (window.html2pdf) return Promise.resolve(window.html2pdf);
        // Depuis le bundle : un CDN injoignable ne doit pas tuer l'export.
        return import("html2pdf.js").then((mod) => {
          window.html2pdf = mod.default || mod;
          return window.html2pdf;
        });
      };
      const html2pdf = await loadHtml2pdf();
      const opt = {
        margin: 10,
        filename: "pense-bete-entretien-" + (cv && cv.name ? cv.name.replace(/[^a-z0-9]/gi, "_") : "candidat") + ".pdf",
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };
      await html2pdf().set(opt).from(sheetRef.current).save();
    } catch (err) {
      if (notify) notify("Erreur PDF: " + (err && err.message ? err.message : ""));
    }
    setDownloading(false);
  };

  return (
    <div style={{
      background:Paper, borderRadius:RadiusMd,
      border:"0.5px solid "+Hairline,
      boxShadow:ShadowSm,
      padding:18, marginBottom:16,
      fontFamily:Sans,
    }}>
      <div style={{
        display:"flex", alignItems:"center", gap:10,
        marginBottom:10,
      }}>
        <div style={{
          width:34, height:34, borderRadius:9,
          background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
          color:"#fff",
          display:"flex", alignItems:"center", justifyContent:"center",
          flexShrink:0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
        </div>
        <div>
          <div style={{
            fontFamily:Serif, fontWeight:500, fontSize:16,
            color:Ink, letterSpacing:"-0.01em",
          }}>{T.iv_cs_card_title}</div>
          <div style={{fontSize:11, color:InkMuted, marginTop:2}}>
            {T.iv_cs_card_sub}
          </div>
        </div>
      </div>

      {/* Etat 1 : pas encore genere */}
      {!loading && !result && (
        <button onClick={onRun} disabled={!hasMainResult} style={{
          ...B({
            width:"100%", padding:"12px 18px", borderRadius:RadiusPill,
            background: hasMainResult ? `linear-gradient(135deg, ${Purple}, ${Magenta})` : Gray200,
            color: hasMainResult ? "#fff" : InkMuted,
            border:"none",
            fontFamily:Sans, fontWeight:600, fontSize:13,
            display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
            transition:"all 200ms ease-out",
            marginTop:6,
          })
        }}>
          {hasMainResult ? T.iv_cs_run : T.iv_cs_empty}
          {hasMainResult && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          )}
        </button>
      )}

      {/* Etat 2 : loading */}
      {loading && (
        <div style={{
          padding:"24px 12px", textAlign:"center",
        }}>
          <div style={{
            width:28, height:28, margin:"0 auto 10px",
            border:"2px solid "+Hairline, borderTopColor:Purple,
            borderRadius:"50%",
            animation:"cvfSpin 1s linear infinite",
          }}/>
          <div style={{fontSize:12, color:InkMuted}}>{T.iv_cs_loading}</div>
        </div>
      )}

      {/* Etat 3 : pense-bete genere : preview + boutons imprimer / pdf */}
      {!loading && result && (
        <>
          {/* Boutons d'action */}
          <div style={{
            display:"flex", gap:8, marginTop:12, marginBottom:14,
            flexWrap:"wrap",
          }}>
            <button onClick={printSheet} style={{
              ...B({
                flex:1, minWidth:130,
                padding:"10px 14px", borderRadius:RadiusPill,
                background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
                color:"#fff",
                border:"none",
                fontSize:12, fontWeight:600, fontFamily:Sans,
                display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6,
              })
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              {T.iv_cs_print}
            </button>
            <button onClick={downloadPDF} disabled={downloading} style={{
              ...B({
                flex:1, minWidth:130,
                padding:"10px 14px", borderRadius:RadiusPill,
                background: downloading ? Gray200 : Paper,
                color: downloading ? InkMuted : Ink,
                border:"0.5px solid "+(downloading ? Hairline : Ink),
                fontSize:12, fontWeight:600, fontFamily:Sans,
                display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6,
              })
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {downloading ? "..." : T.iv_cs_download}
            </button>
          </div>

          {/* Preview du pense-bete (rendu A4 simule) - garde palette gold pour cohérence avec PDF */}
          <div ref={sheetRef} style={{
            background:"#ffffff",
            border:"0.5px solid "+Hairline,
            borderRadius:8,
            padding:"24px 28px",
            fontFamily:"Inter, Helvetica, Arial, sans-serif",
            color:"#0a0a0a",
          }}>
            <div style={{
              borderBottom:"2px solid #0a0a0a",
              paddingBottom:10, marginBottom:18,
            }}>
              <div style={{
                fontSize:9, letterSpacing:"0.12em",
                textTransform:"uppercase", color:"#a07e3a",
                fontWeight:600, marginBottom:3,
              }}>Nuvi</div>
              <div style={{
                fontFamily:"Georgia, serif", fontSize:20,
                fontWeight:600, letterSpacing:"-0.02em",
              }}>{T.iv_cs_card_title}</div>
              {cv && cv.name && (
                <div style={{fontSize:10, color:"#666", marginTop:3}}>
                  {cv.name}{cv.title ? " - " + cv.title : ""}
                </div>
              )}
            </div>

            {/* Section 1 : Messages cles */}
            {Array.isArray(result.key_messages) && result.key_messages.length > 0 && (
              <div style={{marginBottom:16}}>
                <div style={{
                  fontFamily:"Georgia, serif", fontSize:14,
                  fontWeight:600, color:"#0a0a0a",
                  marginBottom:8, paddingBottom:3,
                  borderBottom:"1px solid #ccc",
                }}>{T.iv_cs_section_messages}</div>
                {result.key_messages.map((m, i) => (
                  <div key={i} style={{
                    display:"flex", gap:8, alignItems:"flex-start",
                    fontSize:12, lineHeight:1.5,
                    marginBottom:5,
                  }}>
                    <span style={{
                      color:"#a07e3a", fontWeight:700,
                      flexShrink:0, minWidth:18,
                    }}>{i + 1}.</span>
                    <span>{m}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Section 2 : Top 3 questions a poser */}
            {Array.isArray(result.top_questions) && result.top_questions.length > 0 && (
              <div style={{marginBottom:16}}>
                <div style={{
                  fontFamily:"Georgia, serif", fontSize:14,
                  fontWeight:600, color:"#0a0a0a",
                  marginBottom:8, paddingBottom:3,
                  borderBottom:"1px solid #ccc",
                }}>{T.iv_cs_section_ask}</div>
                {result.top_questions.map((q, i) => (
                  <div key={i} style={{
                    fontSize:12, lineHeight:1.5,
                    marginBottom:6, fontStyle:"italic",
                    paddingLeft:14, position:"relative",
                  }}>
                    <span style={{
                      position:"absolute", left:0,
                      color:"#7a4d96", fontWeight:700,
                      fontStyle:"normal",
                    }}>?</span>
                    "{q}"
                  </div>
                ))}
              </div>
            )}

            {/* Section 3 : Checklist last-minute */}
            {Array.isArray(result.checklist) && result.checklist.length > 0 && (
              <div>
                <div style={{
                  fontFamily:"Georgia, serif", fontSize:14,
                  fontWeight:600, color:"#0a0a0a",
                  marginBottom:8, paddingBottom:3,
                  borderBottom:"1px solid #ccc",
                }}>{T.iv_cs_section_checklist}</div>
                {result.checklist.map((c, i) => (
                  <div key={i} style={{
                    display:"flex", gap:8, alignItems:"flex-start",
                    fontSize:12, lineHeight:1.5,
                    marginBottom:4,
                  }}>
                    <span style={{
                      flexShrink:0, width:13, height:13,
                      border:"1.5px solid #0a0a0a",
                      borderRadius:2, marginTop:2,
                    }}/>
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// PackPdfCard : carte qui declenche l'export PDF du pack complet
// (questions a recevoir + STAR + questions a poser).
function PackPdfCard({ T, loading, hasMainResult, onRun }) {
  return (
    <div style={{
      background:Paper, borderRadius:RadiusMd,
      border:"0.5px solid "+Hairline,
      boxShadow:ShadowSm,
      padding:18, marginBottom:16,
      fontFamily:Sans,
    }}>
      <div style={{
        display:"flex", alignItems:"center", gap:10,
        marginBottom:10,
      }}>
        <div style={{
          width:34, height:34, borderRadius:9,
          background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
          color:"#fff",
          display:"flex", alignItems:"center", justifyContent:"center",
          flexShrink:0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
        <div>
          <div style={{
            fontFamily:Serif, fontWeight:500, fontSize:16,
            color:Ink, letterSpacing:"-0.01em",
          }}>{T.iv_pk_card_title}</div>
          <div style={{fontSize:11, color:InkMuted, marginTop:2}}>
            {T.iv_pk_card_sub}
          </div>
        </div>
      </div>

      <button onClick={onRun} disabled={!hasMainResult || loading} style={{
        ...B({
          width:"100%", padding:"12px 18px", borderRadius:RadiusPill,
          background: !hasMainResult ? Gray200 : (loading ? Gray200 : `linear-gradient(135deg, ${Purple}, ${Magenta})`),
          color: !hasMainResult ? InkMuted : (loading ? InkMuted : "#fff"),
          border:"none",
          fontFamily:Sans, fontWeight:600, fontSize:13,
          display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
          transition:"all 200ms ease-out",
          marginTop:6,
        })
      }}>
        {!hasMainResult ? T.iv_pk_empty
          : loading ? T.iv_pk_loading
          : T.iv_pk_run}
        {hasMainResult && !loading && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        )}
        {loading && (
          <span style={{
            display:"inline-block",
            width:14, height:14,
            border:"2px solid "+Gray400, borderTopColor:InkMuted,
            borderRadius:"50%",
            animation:"cvfSpin 1s linear infinite",
          }}/>
        )}
      </button>
    </div>
  );
}

export default function InterviewModal({
  T, cv, apiKey, loading, result,
  offerText, setOfferText, prefilledOffer,
  onRun, onClose,
  // v2 Interview Continuity : nouveaux props
  round, setRound,
  askRecruiterLoading, askRecruiterResult, onRunAskRecruiter,
  // v2 Tab Apres
  afterContext, setAfterContext,
  emailLoading, emailResult, emailTone, setEmailTone, onRunEmail,
  debriefLoading, debriefResult, onRunDebrief,
  // v2 Tab Pendant
  cheatSheetLoading, cheatSheetResult, onRunCheatSheet,
  packLoading, onRunPackPDF,
}) {
  const [idx, setIdx] = useState(0);
  // v2 : tab actif (Avant / Pendant / Apres). Par defaut "before".
  const [tab, setTab] = useState("before");

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
    <div className="nuvi-panneau" style={{
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
          width:40, height:4, background:Hairline,
          borderRadius:RadiusPill,
          margin:"10px auto 6px", flexShrink:0,
        }}/>

        {/* Header */}
        <div style={{
          padding:"6px 24px 14px",
          borderBottom:"0.5px solid "+Hairline, flexShrink:0,
          display:"flex", alignItems:"flex-start",
          justifyContent:"space-between", gap:12,
        }}>
          <div style={{flex:1, minWidth:0}}>
            <div style={{
              fontSize:11, fontWeight:600,
              letterSpacing:"0.12em", textTransform:"uppercase",
              color:Coral, marginBottom:4,
            }}>{T.iv_eyebrow}</div>
            <div style={{
              fontFamily:Serif, fontWeight:400, fontSize:22,
              letterSpacing:"-0.02em", color:Ink, lineHeight:1.15,
            }}>
              {T.iv_title_a}
              {" "}<em style={{
                fontStyle:"italic",
                background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
                WebkitBackgroundClip:"text",
                WebkitTextFillColor:"transparent",
                backgroundClip:"text",
                paddingRight:"0.15em",
                display:"inline-block",
              }}>{T.iv_title_em}</em>
              {T.iv_title_b}
            </div>
            <div style={{
              fontSize:12, color:InkMuted, marginTop:4,
              lineHeight:1.5,
            }}>{T.iv_sub}</div>
          </div>
          <button onClick={onClose} disabled={loading} aria-label="close" style={{
            ...B({
              background:Paper, borderRadius:RadiusPill,
              width: 44, height: 44, fontSize:16, color:InkMuted,
              border:"0.5px solid "+Hairline,
              display:"flex", alignItems:"center", justifyContent:"center",
              flexShrink:0,
              opacity: loading ? 0.4 : 1,
            })
          }}>x</button>
        </div>

        {/* v2 Interview Continuity : Round selector + Tabs */}
        <div style={{
          padding:"14px 24px 6px",
          borderBottom:"0.5px solid "+Hairline,
          flexShrink:0,
          background:CreamSoft,
        }}>
          {/* Round selector */}
          {setRound && (
            <div style={{marginBottom:14}}>
              <div style={{
                fontSize:10, fontWeight:600,
                letterSpacing:"0.1em", textTransform:"uppercase",
                color:Coral, marginBottom:6, fontFamily:Sans,
              }}>{T.iv_round_label}</div>
              <select
                value={round || "all"}
                onChange={e => setRound(e.target.value)}
                style={{
                  width:"100%", padding:"9px 12px",
                  borderRadius:RadiusSm,
                  border:"0.5px solid "+Hairline,
                  background:Paper, color:Ink,
                  fontSize:13, fontFamily:Sans,
                  outline:"none", cursor:"pointer",
                  boxSizing:"border-box",
                }}>
                <option value="all">{T.iv_round_all}</option>
                <option value="hr">{T.iv_round_hr}</option>
                <option value="manager">{T.iv_round_manager}</option>
                <option value="board">{T.iv_round_board}</option>
              </select>
              <div style={{
                fontSize:10, color:InkMuted,
                marginTop:5, fontFamily:Sans, lineHeight:1.4,
                fontStyle:"italic",
              }}>
                {round === "hr" ? T.iv_round_hint_hr
                  : round === "manager" ? T.iv_round_hint_manager
                  : round === "board" ? T.iv_round_hint_board
                  : T.iv_round_hint_all}
              </div>
            </div>
          )}

          {/* Tabs Avant / Pendant / Apres */}
          <div style={{
            display:"flex", gap:6,
          }}>
            {[
              ["before", T.iv_tab_before],
              ["during", T.iv_tab_during],
              ["after",  T.iv_tab_after],
            ].map(([k, label]) => (
              <button key={k} onClick={()=>setTab(k)} style={{
                ...B({
                  flex:1, padding:"9px 12px", borderRadius:RadiusPill,
                  background: tab === k ? Ink : Paper,
                  color: tab === k ? Cream : Ink,
                  border:"0.5px solid "+(tab === k ? Ink : Hairline),
                  fontFamily:Sans, fontWeight: tab === k ? 600 : 500,
                  fontSize:12,
                  transition:"all 180ms ease-out",
                  cursor:"pointer",
                })
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Body scrollable */}
        <div style={{
          overflowY:"auto",
          padding:"18px 24px 24px",
          flex:1,
        }}>

          {/* Tab "Pendant" : pense-bete imprimable + export PDF du pack */}
          {tab === "during" && (
            <>
              {cvIsEmpty ? (
                <div style={{
                  padding:"24px 18px",
                  background:CreamSoft, borderRadius:RadiusMd,
                  border:"0.5px solid "+Hairline,
                  textAlign:"center", color:InkMuted,
                  fontSize:13, fontFamily:Sans,
                }}>{T.iv_no_cv}</div>
              ) : (
                <>
                  {/* Header editorial du tab Pendant */}
                  <div style={{marginBottom:20}}>
                    <div style={{
                      fontSize:11, fontWeight:600,
                      letterSpacing:"0.12em", textTransform:"uppercase",
                      color:Coral, marginBottom:4, fontFamily:Sans,
                    }}>{T.iv_during_eyebrow}</div>
                    <div style={{
                      fontFamily:Serif, fontWeight:400, fontSize:22,
                      letterSpacing:"-0.02em", color:Ink, lineHeight:1.15,
                    }}>
                      {T.iv_during_title_a}
                      {" "}<em style={{
                        fontStyle:"italic",
                        background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
                        WebkitBackgroundClip:"text",
                        WebkitTextFillColor:"transparent",
                        backgroundClip:"text",
                        paddingRight:"0.15em",
                        display:"inline-block",
                      }}>{T.iv_during_title_em}</em>
                      {T.iv_during_title_b}
                    </div>
                    <div style={{
                      fontSize:12, color:InkMuted, marginTop:5,
                      lineHeight:1.5,
                    }}>{T.iv_during_sub}</div>
                  </div>

                  {/* Section "Tes outils du jour J" */}
                  <div style={{
                    fontSize:11, fontWeight:600,
                    letterSpacing:"0.12em", textTransform:"uppercase",
                    color:Coral, marginBottom:14, fontFamily:Sans,
                  }}>{T.iv_during_section_tools}</div>

                  {/* Cartes pense-bete + pack PDF */}
                  <CheatSheetCard
                    T={T}
                    cv={cv}
                    loading={!!cheatSheetLoading}
                    result={cheatSheetResult}
                    hasMainResult={!!result}
                    onRun={onRunCheatSheet || (()=>{})}
                  />
                  <PackPdfCard
                    T={T}
                    loading={!!packLoading}
                    hasMainResult={!!result}
                    onRun={onRunPackPDF || (()=>{})}
                  />
                </>
              )}
            </>
          )}

          {/* Tab "Apres" : email thank-you + auto-debrief */}
          {tab === "after" && (
            <>
              {cvIsEmpty ? (
                <div style={{
                  padding:"24px 18px",
                  background:CreamSoft, borderRadius:RadiusMd,
                  border:"0.5px solid "+Hairline,
                  textAlign:"center", color:InkMuted,
                  fontSize:13, fontFamily:Sans,
                }}>{T.iv_no_cv}</div>
              ) : (
                <>
                  {/* Header editorial du tab Apres */}
                  <div style={{marginBottom:20}}>
                    <div style={{
                      fontSize:11, fontWeight:600,
                      letterSpacing:"0.12em", textTransform:"uppercase",
                      color:Coral, marginBottom:4, fontFamily:Sans,
                    }}>{T.iv_after_eyebrow}</div>
                    <div style={{
                      fontFamily:Serif, fontWeight:400, fontSize:22,
                      letterSpacing:"-0.02em", color:Ink, lineHeight:1.15,
                    }}>
                      {T.iv_after_title_a}
                      {" "}<em style={{
                        fontStyle:"italic",
                        background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
                        WebkitBackgroundClip:"text",
                        WebkitTextFillColor:"transparent",
                        backgroundClip:"text",
                        paddingRight:"0.15em",
                        display:"inline-block",
                      }}>{T.iv_after_title_em}</em>
                      {T.iv_after_title_b}
                    </div>
                    <div style={{
                      fontSize:12, color:InkMuted, marginTop:5,
                      lineHeight:1.5,
                    }}>{T.iv_after_sub}</div>
                  </div>

                  {/* Formulaire de contexte */}
                  {afterContext && setAfterContext && (
                    <AfterContextForm
                      T={T}
                      afterContext={afterContext}
                      setAfterContext={setAfterContext}
                    />
                  )}

                  {/* Section "Tes outils de suivi" */}
                  <div style={{
                    fontSize:11, fontWeight:600,
                    letterSpacing:"0.12em", textTransform:"uppercase",
                    color:Coral, marginBottom:14, fontFamily:Sans,
                  }}>{T.iv_af_section_tools}</div>

                  {/* Cartes email + debrief */}
                  <EmailCard
                    T={T}
                    loading={!!emailLoading}
                    result={emailResult}
                    tone={emailTone || "warm"}
                    setTone={setEmailTone || (()=>{})}
                    recapFilled={!!(afterContext && afterContext.recap && afterContext.recap.trim())}
                    onRun={onRunEmail || (()=>{})}
                  />
                  <DebriefCard
                    T={T}
                    loading={!!debriefLoading}
                    result={debriefResult}
                    recapFilled={!!(afterContext && afterContext.recap && afterContext.recap.trim())}
                    onRun={onRunDebrief || (()=>{})}
                  />
                </>
              )}
            </>
          )}

          {/* Tab "Avant" : tout le contenu existant + nouvelle section ask-recruiter */}
          {tab === "before" && (<>
          {/* Etat 1 : pas de CV */}
          {cvIsEmpty && !loading && (
            <div style={{
              padding:"24px 18px",
              background:CreamSoft, borderRadius:RadiusMd,
              border:"0.5px solid "+Hairline,
              textAlign:"center", color:InkMuted,
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
                  color:Coral, marginBottom:8,
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
                    border:"0.5px solid "+Hairline,
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
                  background: apiKey ? `linear-gradient(135deg, ${Purple}, ${Magenta})` : Gray200,
                  color: apiKey ? "#fff" : InkMuted,
                  border:"none",
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
              }}>{T.iv_running}</div>
              <div style={{
                fontSize:12, color:InkMuted, marginTop:6,
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
                      border:"0.5px solid "+Hairline,
                    }}>{result.country}</span>
                  )}
                  {result.sector && (
                    <span style={{
                      padding:"5px 10px", borderRadius:RadiusPill,
                      background:Paper, color:Ink,
                      fontSize:11, fontWeight:500,
                      fontFamily:Sans,
                      border:"0.5px solid "+Hairline,
                    }}>{result.sector}</span>
                  )}
                  {result.level && (
                    <span style={{
                      padding:"5px 10px", borderRadius:RadiusPill,
                      background:Paper, color:Ink,
                      fontSize:11, fontWeight:500,
                      fontFamily:Sans,
                      border:"0.5px solid "+Hairline,
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
                  color:InkMuted,
                }}>
                  {T.iv_progress} {idx + 1} {T.iv_of} {total}
                </div>
                <button onClick={onRun} style={{
                  ...B({
                    padding:"6px 12px", borderRadius:RadiusPill,
                    background:"transparent", color:Coral,
                    border:"0.5px solid "+Hairline,
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
                        background: i === idx ? Ink : (i < idx ? Purple : Hairline),
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
                      border:"0.5px solid "+(idx === 0 ? Hairline : Ink),
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
                      background: idx >= total - 1 ? Gray100 : `linear-gradient(135deg, ${Purple}, ${Magenta})`,
                      color: idx >= total - 1 ? Gray400 : "#fff",
                      border:"none",
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
                    background:`radial-gradient(ellipse 100% 80% at 90% 0%, ${Purple}66 0%, transparent 60%)`,
                    pointerEvents:"none",
                  }}/>
                  <div style={{position:"relative"}}>
                    <div style={{
                      fontFamily:Serif, fontSize:18, fontWeight:500,
                      color:Cream, letterSpacing:"-0.01em", marginBottom:4,
                    }}>{T.iv_done}</div>
                    <div style={{
                      fontSize:12, color:Purple,
                      lineHeight:1.5,
                    }}>{T.iv_done_sub}</div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* v2 : Section "Questions a poser au recruteur" sous les flashcards */}
          {!cvIsEmpty && (
            <AskRecruiterSection
              T={T}
              loading={!!askRecruiterLoading}
              result={askRecruiterResult}
              hasMainResult={!!result}
              onRun={onRunAskRecruiter}
            />
          )}
          </>)}

        </div>

        <style>{KEYFRAMES_V17}</style>
      </div>
    </div>
  );
}
