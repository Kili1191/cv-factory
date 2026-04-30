"use client";

// CV Factory v17 - CoachModal (conversational AI assistant)
//
// Mode coaching conversationnel : l'IA dialogue avec l'utilisateur pour
// l'aider a faire briller son CV.
//
// Workflow :
//   1. Welcome screen avec 5 parcours guides + 1 question libre
//   2. Une fois le parcours selectionne, l'IA pose la 1ere question
//   3. L'utilisateur repond, l'IA reformule + propose une adoption directe au CV
//   4. Conversation libre apres ca
//
// Persistance : historique stocke en localStorage (cap 50 derniers messages).
// Aucun stockage cote serveur, donc 0 impact sur les couts de l'app.
//
// Props :
//   T              : i18n
//   cv             : CV
//   apiKey         : string
//   loading        : bool (true pendant l'appel IA)
//   messages       : tableau [{role: "user"|"assistant", content, ts, adopt: {kind, value}}]
//   onSend(text)   : envoie un message utilisateur (handler page.jsx)
//   onClear()      : efface la conversation
//   onAdopt(kind, value) : applique une suggestion au CV (kind = "summary"/"title"/"bullet")
//   onClose()
//
// Format du message assistant avec adoption :
//   {
//     role: "assistant",
//     content: "Voici une accroche refondue : 'Director...' ",
//     adopt: { kind: "summary", value: "Director..." }   // optionnel
//   }

import { useState, useEffect, useRef } from "react";
import {
  Ink, Cream, CreamSoft, Paper, Gold, GoldDeep,
  Coral, CoralSoft, Green, GreenSoft, Purple, PurpleSoft,
  Gray100, Gray200, Gray400, Gray600,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm,
  GradPurple, B,
} from "./tokens";

// 5 parcours guides + 1 question libre.
function getPaths(T) {
  return [
    {
      key:"describe", emoji:"\u270D\uFE0F",
      title:T.co_path_describe, desc:T.co_path_describe_desc,
      // Premier message envoye par l'utilisateur quand il choisit ce parcours
      starter:"J'aimerais bien decrire mieux une de mes experiences. Aide-moi.",
    },
    {
      key:"shine", emoji:"\u2728",
      title:T.co_path_shine, desc:T.co_path_shine_desc,
      starter:"Mon CV manque de relief. Aide-moi a identifier ce qui peut etre ameliore et a le transformer.",
    },
    {
      key:"gap", emoji:"\u23F8\uFE0F",
      title:T.co_path_gap, desc:T.co_path_gap_desc,
      starter:"J'ai un trou ou une periode floue dans mon parcours. Aide-moi a la presenter en force.",
    },
    {
      key:"transition", emoji:"\u2194\uFE0F",
      title:T.co_path_transition, desc:T.co_path_transition_desc,
      starter:"Je fais une transition (secteur, role). Aide-moi a la justifier de maniere convaincante.",
    },
    {
      key:"pitch", emoji:"\uD83C\uDFAF",
      title:T.co_path_pitch, desc:T.co_path_pitch_desc,
      starter:"Aide-moi a construire mon pitch personnel de 60 secondes.",
    },
    {
      key:"free", emoji:"\uD83D\uDCAC",
      title:T.co_path_free, desc:T.co_path_free_desc,
      starter:null,  // pas de starter pour question libre, l'utilisateur tape directement
    },
  ];
}

// Bulle de message individuelle.
function Bubble({ T, msg, onAdopt }) {
  const isUser = msg.role === "user";

  // Style pour message utilisateur : aligne a droite, fond Ink/Cream
  if (isUser) {
    return (
      <div style={{
        display:"flex", justifyContent:"flex-end", marginBottom:12,
      }}>
        <div style={{
          maxWidth:"80%",
          padding:"10px 14px", borderRadius:"18px 18px 4px 18px",
          background:Ink, color:Cream,
          fontSize:13, lineHeight:1.5, fontFamily:Sans,
          whiteSpace:"pre-wrap",
        }}>{msg.content}</div>
      </div>
    );
  }

  // Style pour message assistant : aligne a gauche, fond Paper/Ink
  return (
    <div style={{
      display:"flex", justifyContent:"flex-start", marginBottom:12,
    }}>
      <div style={{maxWidth:"85%"}}>
        <div style={{
          padding:"12px 16px", borderRadius:"18px 18px 18px 4px",
          background:Paper, color:Ink,
          border:"0.5px solid "+Gray200, boxShadow:ShadowSm,
          fontSize:13, lineHeight:1.55, fontFamily:Sans,
          whiteSpace:"pre-wrap",
        }}>{msg.content}</div>

        {/* Bouton d'adoption si l'IA a propose une reformulation */}
        {msg.adopt && msg.adopt.kind && msg.adopt.value && onAdopt && (
          <button
            onClick={()=>onAdopt(msg.adopt.kind, msg.adopt.value)}
            style={{
              ...B({
                marginTop:6,
                padding:"7px 12px", borderRadius:RadiusPill,
                background:GradPurple, color:"#fff",
                fontSize:11, fontWeight:600, fontFamily:Sans,
                display:"inline-flex", alignItems:"center", gap:5,
                transition:"all 180ms ease-out",
              })
            }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {msg.adopt.kind === "summary" ? T.co_adopt_summary
              : msg.adopt.kind === "title" ? T.co_adopt_title
              : T.co_adopt_bullet}
          </button>
        )}
      </div>
    </div>
  );
}

export default function CoachModal({
  T, cv, apiKey, loading, messages,
  onSend, onClear, onAdopt, onClose,
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

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

  // Auto-scroll vers le bas quand un nouveau message arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const cvIsEmpty = !cv.name && !cv.title && !cv.summary
    && (cv.experience || []).every(e => !e.title && !e.company);

  const hasMessages = messages && messages.length > 0;
  const paths = getPaths(T);

  const submit = () => {
    const t = input.trim();
    if (!t || loading) return;
    onSend(t);
    setInput("");
  };

  const onPickPath = (path) => {
    if (path.starter) {
      onSend(path.starter);
    } else {
      // Question libre : focus l'input pour que l'utilisateur ecrive
      setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 100);
    }
  };

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:99998,
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
        height:"94vh", display:"flex", flexDirection:"column",
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
              color:Purple, marginBottom:4,
            }}>{T.co_eyebrow}</div>
            <div style={{
              fontFamily:Serif, fontWeight:400, fontSize:22,
              letterSpacing:"-0.02em", color:Ink, lineHeight:1.15,
            }}>
              {T.co_title_a}
              {" "}<em style={{
                fontStyle:"italic", color:Purple,
              }}>{T.co_title_em}</em>
              {" "}{T.co_title_b}
            </div>
            <div style={{
              fontSize:12, color:Gray600, marginTop:4, lineHeight:1.5,
            }}>{T.co_sub}</div>
          </div>

          {/* Bouton clear si conversation en cours */}
          {hasMessages && (
            <button
              onClick={onClear}
              disabled={loading}
              title={T.co_clear}
              style={{
                ...B({
                  background:Paper, borderRadius:RadiusPill,
                  width:32, height:32, color:Gray600,
                  border:"0.5px solid "+Gray200,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  flexShrink:0,
                  opacity: loading ? 0.4 : 1,
                })
              }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          )}

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

        {/* Body : welcome OU messages */}
        <div ref={scrollRef} style={{
          flex:1,
          overflowY:"auto",
          padding:"18px 24px",
        }}>
          {/* Etat 1 : pas de CV */}
          {cvIsEmpty && (
            <div style={{
              padding:"24px 18px",
              background:CreamSoft, borderRadius:RadiusMd,
              border:"0.5px solid "+Gray200,
              textAlign:"center", color:Gray600,
              fontSize:13, fontFamily:Sans,
            }}>{T.co_no_cv}</div>
          )}

          {/* Etat 2 : welcome screen avec parcours */}
          {!cvIsEmpty && !hasMessages && (
            <>
              <div style={{
                fontFamily:Serif, fontSize:20, fontWeight:500,
                letterSpacing:"-0.01em",
                color:Ink, marginBottom:6,
              }}>{T.co_welcome_title}</div>
              <div style={{
                fontSize:13, color:Gray600, marginBottom:18, lineHeight:1.5,
              }}>{T.co_welcome_sub}</div>

              {paths.map(path => (
                <button
                  key={path.key}
                  onClick={()=>onPickPath(path)}
                  style={{
                    ...B({
                      width:"100%", textAlign:"left",
                      padding:"14px 16px", marginBottom:10, borderRadius:RadiusMd,
                      background:Paper, color:Ink,
                      border:"0.5px solid "+Gray200, boxShadow:ShadowSm,
                      display:"flex", alignItems:"center", gap:14,
                      fontFamily:Sans,
                      transition:"all 180ms ease-out",
                    })
                  }}>
                  <div style={{
                    width:40, height:40, borderRadius:11,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    background:PurpleSoft,
                    fontSize:20, flexShrink:0,
                  }}>{path.emoji}</div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{
                      fontFamily:Serif, fontWeight:500, fontSize:15,
                      letterSpacing:"-0.01em", color:Ink, marginBottom:2,
                    }}>{path.title}</div>
                    <div style={{
                      fontSize:11, color:Gray600, lineHeight:1.4,
                    }}>{path.desc}</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke={Purple} strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{flexShrink:0}}>
                    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                  </svg>
                </button>
              ))}
            </>
          )}

          {/* Etat 3 : conversation */}
          {!cvIsEmpty && hasMessages && (
            <>
              {messages.map((msg, i) => (
                <Bubble key={i} T={T} msg={msg} onAdopt={onAdopt}/>
              ))}

              {/* Loading bubble (l'IA reflechit) */}
              {loading && (
                <div style={{
                  display:"flex", justifyContent:"flex-start", marginBottom:12,
                }}>
                  <div style={{
                    padding:"12px 16px", borderRadius:"18px 18px 18px 4px",
                    background:Paper, color:Gray600,
                    border:"0.5px solid "+Gray200,
                    fontSize:13, fontFamily:Sans,
                    display:"flex", alignItems:"center", gap:8,
                  }}>
                    <div style={{
                      width:6, height:6, borderRadius:"50%", background:Purple,
                      animation:"cvfPulse1 1.4s ease-in-out infinite",
                    }}/>
                    <div style={{
                      width:6, height:6, borderRadius:"50%", background:Purple,
                      animation:"cvfPulse2 1.4s ease-in-out infinite",
                    }}/>
                    <div style={{
                      width:6, height:6, borderRadius:"50%", background:Purple,
                      animation:"cvfPulse3 1.4s ease-in-out infinite",
                    }}/>
                  </div>
                </div>
              )}

              <style>{`
                @keyframes cvfPulse1 { 0%, 60%, 100% { opacity:.3; } 30% { opacity:1; } }
                @keyframes cvfPulse2 { 0%, 60%, 100% { opacity:.3; } 30% { opacity:1; } }
                @keyframes cvfPulse3 { 0%, 60%, 100% { opacity:.3; } 30% { opacity:1; } }
                @keyframes cvfPulse2 {
                  0%, 30%, 70%, 100% { opacity:.3; }
                  50% { opacity:1; }
                }
                @keyframes cvfPulse3 {
                  0%, 50%, 80%, 100% { opacity:.3; }
                  70% { opacity:1; }
                }
              `}</style>
            </>
          )}
        </div>

        {/* Input zone */}
        {!cvIsEmpty && (
          <div style={{
            padding:"12px 24px 18px",
            borderTop:"0.5px solid "+Gray200,
            flexShrink:0,
            background:CreamSoft,
          }}>
            <div style={{
              display:"flex", gap:8, alignItems:"flex-end",
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder={T.co_input_ph}
                rows={1}
                disabled={loading}
                style={{
                  flex:1,
                  padding:"11px 14px",
                  borderRadius:RadiusMd,
                  border:"0.5px solid "+Gray200,
                  background:Paper,
                  color:Ink, fontSize:13,
                  fontFamily:Sans,
                  outline:"none",
                  resize:"none",
                  maxHeight:120,
                  boxSizing:"border-box",
                  opacity: loading ? 0.5 : 1,
                }}
              />
              <button
                onClick={submit}
                disabled={loading || !input.trim() || !apiKey}
                aria-label={T.co_send}
                style={{
                  ...B({
                    width:42, height:42, borderRadius:"50%",
                    background: (loading || !input.trim() || !apiKey)
                      ? Gray200 : GradPurple,
                    color:"#fff",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    flexShrink:0,
                    transition:"all 180ms ease-out",
                  })
                }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 2-7 20-4-9-9-4z"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CoachFAB : bouton flottant persistant en bas a droite
// ============================================================
export function CoachFAB({ T, onOpen, hidden }) {
  if (hidden) return null;
  return (
    <button
      onClick={onOpen}
      aria-label={T.co_fab_aria}
      title={T.co_fab_aria}
      style={{
        ...B({
          position:"fixed",
          bottom:90,  // au-dessus du BottomNav
          right:16,
          width:56, height:56, borderRadius:"50%",
          background:GradPurple, color:"#fff",
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 8px 24px rgba(91,61,245,.45)",
          zIndex:9999,
          transition:"all 200ms ease-out",
          animation:"cvfFabIn 350ms cubic-bezier(.34,1.56,.64,1)",
        })
      }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <style>{`
        @keyframes cvfFabIn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </button>
  );
}
