"use client";

// CV Factory v17 - ApplicationPackModal (extracted + modernized v17).
//
// Modal qui presente le pack candidature complet genere par l'IA :
// - Lettre de motivation
// - Message LinkedIn au recruteur
// - Email de candidature (subject + body)
// - Pitch d'entretien ("Tell me about yourself" - 60 secondes)
// - Reponses STAR aux questions probables
//
// 5 onglets internes (cover / linkedin / email / pitch / star) + Section helper
// pour rendre une zone de texte avec bouton Copier.
//
// Props :
//   T          : i18n
//   pack       : { cover_letter, linkedin_message, application_email: {subject, body},
//                  interview_pitch, star_answers: [{question, situation, task, action, result}] }
//   loading    : bool
//   msgIdx     : index pour cycling des loadingMsgs
//   onClose()
//   onCopy(s)  : copy-to-clipboard (handler page.jsx)

import { useState, useEffect } from "react";
import {
  Ink, Cream, CreamSoft, Paper, Gold, GoldDeep,
  Coral, CoralSoft, Green, GreenSoft, Purple, PurpleSoft,
  Gray100, Gray200, Gray400, Gray600,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm,
  GradGold, B,
} from "./tokens";
import Sheet from "./Sheet";

// Sous-composant : zone de texte copiable.
function Section({ T, title, content, onCopy, small }) {
  return (
    <div style={{marginBottom:16}}>
      <div style={{
        display:"flex", justifyContent:"space-between", alignItems:"center",
        marginBottom:8,
      }}>
        <div style={{
          fontSize:11, fontWeight:600,
          letterSpacing:"0.1em", textTransform:"uppercase",
          color:GoldDeep,
          fontFamily:Sans,
        }}>{title}</div>
        <button onClick={()=>onCopy && onCopy(content)} style={{
          ...B({
            padding:"6px 12px", borderRadius:RadiusPill,
            background:Paper, color:Gray600,
            border:"0.5px solid "+Gray200,
            fontSize:11, fontWeight:500,
            fontFamily:Sans,
            display:"inline-flex", alignItems:"center", gap:4,
            transition:"all 180ms ease-out",
          })
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
          </svg>
          {T.pk_copy}
        </button>
      </div>
      <div style={{
        background:CreamSoft,
        border:"0.5px solid "+Gold,
        borderRadius:RadiusSm,
        padding:"14px 16px",
        fontSize: small ? 12 : 13,
        color:Ink, lineHeight:1.7,
        whiteSpace:"pre-wrap",
        fontFamily:Sans,
      }}>{content}</div>
    </div>
  );
}

export default function ApplicationPackModal({ T, pack, loading, msgIdx, onClose, onCopy }) {
  const [activeTab, setActiveTab] = useState("cover");

  // Esc to close
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !loading) onClose(); };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [loading, onClose]);

  const tabs = [
    ["cover",    T.pk_tab_cover],
    ["linkedin", T.pk_tab_linkedin],
    ["email",    T.pk_tab_email],
    ["pitch",    T.pk_tab_pitch],
    ["star",     T.pk_tab_star],
  ];
  const loadingMsgs = T.pk_loading_msgs || [];

  return (
    <Sheet
      eyebrow={T.pk_eyebrow}
      title={T.pk_title}
      onClose={onClose}
    >
      <p style={{
        fontSize:13, color:Gray600, lineHeight:1.5,
        margin:"0 0 18px", fontFamily:Sans,
      }}>{T.pk_sub}</p>

      {/* Loading */}
      {loading && (
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
          }}>{loadingMsgs[msgIdx % loadingMsgs.length]}</div>
          <div style={{
            fontSize:12, color:Gray600, marginTop:6,
          }}>{T.pk_loading_sub}</div>
          <div style={{
            marginTop:18, height:3, background:Gray200,
            borderRadius:RadiusPill, overflow:"hidden", width:200,
            margin:"18px auto 0", position:"relative",
          }}>
            <div style={{
              position:"absolute", top:0, height:"100%",
              background:Gold,
              animation:"cvfPkSlide 2s ease-in-out infinite",
              width:"40%",
            }}/>
          </div>
          <style>{`
            @keyframes cvfPkSlide {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(350%); }
            }
          `}</style>
        </div>
      )}

      {/* Pack pret */}
      {!loading && pack && (
        <>
          {/* Tabs */}
          <div style={{
            display:"flex", gap:6, marginBottom:18,
            borderBottom:"0.5px solid "+Gray200,
            overflowX:"auto",
            paddingBottom:0,
          }}>
            {tabs.map(([k, l]) => (
              <button key={k} onClick={()=>setActiveTab(k)} style={{
                ...B({
                  padding:"10px 14px", borderRadius:0,
                  background:"transparent",
                  color: activeTab === k ? Ink : Gray600,
                  fontFamily:Sans,
                  fontWeight: activeTab === k ? 600 : 500,
                  fontSize:12, letterSpacing:"0.02em",
                  borderBottom: activeTab === k
                    ? "2.5px solid "+Gold
                    : "2.5px solid transparent",
                  whiteSpace:"nowrap", flexShrink:0,
                  transition:"all 180ms ease-out",
                  marginBottom:"-0.5px",
                })
              }}>{l}</button>
            ))}
          </div>

          {/* Tab : Cover letter */}
          {activeTab === "cover" && pack.cover_letter && (
            <Section T={T}
              title={T.pk_section_cover}
              content={pack.cover_letter}
              onCopy={onCopy}
            />
          )}

          {/* Tab : LinkedIn */}
          {activeTab === "linkedin" && pack.linkedin_message && (
            <Section T={T}
              title={T.pk_section_linkedin}
              content={pack.linkedin_message}
              onCopy={onCopy}
            />
          )}

          {/* Tab : Email */}
          {activeTab === "email" && pack.application_email && (
            <>
              {pack.application_email.subject && (
                <Section T={T}
                  title={T.pk_section_email_subject}
                  content={pack.application_email.subject}
                  onCopy={onCopy}
                  small
                />
              )}
              {pack.application_email.body && (
                <Section T={T}
                  title={T.pk_section_email_body}
                  content={pack.application_email.body}
                  onCopy={onCopy}
                />
              )}
            </>
          )}

          {/* Tab : Pitch */}
          {activeTab === "pitch" && pack.interview_pitch && (
            <>
              <div style={{
                fontSize:11, color:Gray600, marginBottom:12,
                fontStyle:"italic", fontFamily:Sans,
              }}>{T.pk_pitch_hint}</div>
              <Section T={T}
                title={T.pk_section_pitch}
                content={pack.interview_pitch}
                onCopy={onCopy}
              />
            </>
          )}

          {/* Tab : STAR */}
          {activeTab === "star" && pack.star_answers && pack.star_answers.length > 0 && (
            <>
              <div style={{
                fontSize:11, color:Gray600, marginBottom:14,
                fontStyle:"italic", fontFamily:Sans,
              }}>{T.pk_star_hint}</div>

              {pack.star_answers.map((qa, i) => (
                <div key={i} style={{
                  marginBottom:20, paddingBottom:16,
                  borderBottom: i < pack.star_answers.length - 1
                    ? "0.5px solid "+Gray200
                    : "none",
                }}>
                  {/* Question */}
                  <div style={{
                    padding:"10px 14px",
                    background:"#fef3c7",
                    border:"0.5px solid #fbbf24",
                    borderRadius:RadiusSm,
                    marginBottom:12,
                  }}>
                    <div style={{
                      fontSize:10, fontWeight:600,
                      letterSpacing:"0.1em", textTransform:"uppercase",
                      color:GoldDeep, marginBottom:4,
                      fontFamily:Sans,
                    }}>Q{i+1}</div>
                    <div style={{
                      fontFamily:Serif, fontSize:14, fontWeight:500,
                      color:Ink, letterSpacing:"-0.005em", lineHeight:1.4,
                    }}>{qa.question}</div>
                  </div>

                  {/* STAR sections */}
                  {[
                    ["situation", T.pk_star_situation],
                    ["task",      T.pk_star_task],
                    ["action",    T.pk_star_action],
                    ["result",    T.pk_star_result],
                  ].map(([k, label]) => qa[k] && (
                    <div key={k} style={{marginBottom:10}}>
                      <div style={{
                        fontSize:10, fontWeight:600,
                        letterSpacing:"0.12em", textTransform:"uppercase",
                        color:Gold, marginBottom:4,
                        fontFamily:Sans,
                      }}>{label}</div>
                      <div style={{
                        fontSize:12, color:Ink, lineHeight:1.6,
                        paddingLeft:12,
                        borderLeft:"2px solid "+Gold,
                        fontFamily:Sans,
                      }}>{qa[k]}</div>
                    </div>
                  ))}

                  {/* Copy button */}
                  <button
                    onClick={()=>onCopy && onCopy(
                      "Q: " + qa.question + "\n\n"
                      + "S: " + (qa.situation || "") + "\n"
                      + "T: " + (qa.task || "") + "\n"
                      + "A: " + (qa.action || "") + "\n"
                      + "R: " + (qa.result || "")
                    )}
                    style={{
                      ...B({
                        marginTop:8, padding:"7px 12px", borderRadius:RadiusPill,
                        background:Paper, color:Gray600,
                        border:"0.5px solid "+Gray200,
                        fontSize:11, fontWeight:500,
                        fontFamily:Sans,
                        display:"inline-flex", alignItems:"center", gap:4,
                      })
                    }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.2"
                      strokeLinecap="round" strokeLinejoin="round">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                    </svg>
                    {T.pk_copy_answer}
                  </button>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </Sheet>
  );
}
