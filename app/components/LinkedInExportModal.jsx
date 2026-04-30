"use client";

// CV Factory v17 - LinkedInExportModal
//
// Genere un profil LinkedIn complet (headline + about + experiences reformates)
// a partir du CV. Format LinkedIn = informel, premiere personne, mots-cles ATS.
//
// Shape attendue de result :
//   {
//     headline: "Senior Product Manager | B2B SaaS | Building...",
//     about: "I help...",
//     experiences: [
//       { role: "...", company: "...", description: "..." }
//     ]
//   }
//
// Props :
//   T            : i18n
//   cv           : CV
//   apiKey       : string
//   loading      : bool
//   result       : { headline, about, experiences } | null
//   onRun()      : lance la generation
//   onCopy(text) : copy-to-clipboard handler
//   onClose()

import { useEffect } from "react";
import {
  Ink, Cream, CreamSoft, Paper, Gold, GoldDeep,
  Coral, CoralSoft, Green, GreenSoft,
  Gray100, Gray200, Gray400, Gray600,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm,
  GradGold, B,
} from "./tokens";
import Sheet from "./Sheet";

// Sous-composant : zone copiable (header + content + bouton copier).
function CopySection({ T, title, hint, content, onCopy }) {
  if (!content) return null;
  return (
    <div style={{marginBottom:18}}>
      <div style={{
        display:"flex", justifyContent:"space-between", alignItems:"center",
        marginBottom:6,
      }}>
        <div>
          <div style={{
            fontSize:11, fontWeight:600,
            letterSpacing:"0.1em", textTransform:"uppercase",
            color:GoldDeep, fontFamily:Sans,
          }}>{title}</div>
          {hint && (
            <div style={{
              fontSize:10, color:Gray600, fontStyle:"italic",
              marginTop:2, fontFamily:Sans,
            }}>{hint}</div>
          )}
        </div>
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
          {T.li_copy_section}
        </button>
      </div>
      <div style={{
        background:CreamSoft,
        border:"0.5px solid "+Gold,
        borderRadius:RadiusSm,
        padding:"14px 16px",
        fontSize:13, color:Ink, lineHeight:1.7,
        whiteSpace:"pre-wrap",
        fontFamily:Sans,
      }}>{content}</div>
    </div>
  );
}

export default function LinkedInExportModal({ T, cv, apiKey, loading, result, onRun, onCopy, onClose }) {

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !loading) onClose(); };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [loading, onClose]);

  const cvIsEmpty = !cv.name && !cv.title && !cv.summary
    && (cv.experience || []).every(e => !e.title && !e.company);

  // Construit le texte complet pour "Tout copier"
  const buildAllText = () => {
    if (!result) return "";
    const parts = [];
    if (result.headline) {
      parts.push("=== HEADLINE ===\n" + result.headline);
    }
    if (result.about) {
      parts.push("=== ABOUT ===\n" + result.about);
    }
    if (result.experiences && result.experiences.length > 0) {
      parts.push("=== EXPERIENCES ===");
      result.experiences.forEach(e => {
        parts.push((e.role || "") + " - " + (e.company || "") + "\n" + (e.description || ""));
      });
    }
    return parts.join("\n\n");
  };

  return (
    <Sheet
      eyebrow={T.li_eyebrow}
      title={
        <>
          {T.li_title_a}
          {" "}<em style={{
            fontFamily:Serif, fontStyle:"italic", color:Gold,
          }}>{T.li_title_em}</em>
          {" "}{T.li_title_b}
        </>
      }
      onClose={onClose}
    >
      <p style={{
        fontSize:13, color:Gray600, lineHeight:1.5,
        margin:"0 0 18px", fontFamily:Sans,
      }}>{T.li_sub}</p>

      {/* Etat 1 : pas de CV */}
      {cvIsEmpty && !loading && (
        <div style={{
          padding:"24px 18px",
          background:CreamSoft, borderRadius:RadiusMd,
          border:"0.5px solid "+Gray200,
          textAlign:"center", color:Gray600,
          fontSize:13, fontFamily:Sans,
        }}>{T.li_no_cv}</div>
      )}

      {/* Etat 2 : CV charge mais pas encore genere */}
      {!cvIsEmpty && !loading && !result && (
        <button onClick={onRun} disabled={!apiKey} style={{
          ...B({
            width:"100%", padding:"15px 22px", borderRadius:RadiusPill,
            background: apiKey ? GradGold : Gray200,
            color: apiKey ? "#fff" : Gray600,
            fontFamily:Sans, fontWeight:600, fontSize:14,
            display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
            transition:"all 200ms ease-out",
          })
        }}>
          {T.li_run}
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
          }}>{T.li_loading}</div>
          <div style={{
            fontSize:12, color:Gray600, marginTop:6,
          }}>{T.li_loading_sub}</div>
        </div>
      )}

      {/* Etat 4 : resultat */}
      {!loading && result && (
        <>
          {/* Bouton Tout copier en haut */}
          <button
            onClick={()=>onCopy && onCopy(buildAllText())}
            style={{
              ...B({
                width:"100%", padding:"11px 18px", borderRadius:RadiusPill,
                background:Ink, color:Cream,
                fontFamily:Sans, fontWeight:600, fontSize:13,
                display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6,
                marginBottom:18,
                transition:"all 200ms ease-out",
              })
            }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
            {T.li_copy_all}
          </button>

          {/* Headline */}
          <CopySection T={T}
            title={T.li_section_headline}
            hint={T.li_headline_hint}
            content={result.headline}
            onCopy={onCopy}
          />

          {/* About */}
          <CopySection T={T}
            title={T.li_section_about}
            hint={T.li_about_hint}
            content={result.about}
            onCopy={onCopy}
          />

          {/* Experiences */}
          {result.experiences && result.experiences.length > 0 && (
            <div style={{marginBottom:18}}>
              <div style={{
                fontSize:11, fontWeight:600,
                letterSpacing:"0.1em", textTransform:"uppercase",
                color:GoldDeep, marginBottom:10,
                fontFamily:Sans,
              }}>{T.li_section_experiences}</div>

              {result.experiences.map((e, i) => (
                <div key={i} style={{
                  padding:"14px 16px",
                  background:Paper,
                  border:"0.5px solid "+Gray200,
                  borderRadius:RadiusMd,
                  boxShadow:ShadowSm,
                  marginBottom:10, fontFamily:Sans,
                }}>
                  <div style={{
                    display:"flex", justifyContent:"space-between",
                    alignItems:"flex-start", gap:10, marginBottom:8,
                  }}>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{
                        fontFamily:Serif, fontSize:14, fontWeight:500,
                        color:Ink, letterSpacing:"-0.005em", lineHeight:1.3,
                      }}>{e.role || "?"}</div>
                      {e.company && (
                        <div style={{
                          fontSize:11, color:Gray600, marginTop:2,
                        }}>{e.company}</div>
                      )}
                    </div>
                    <button
                      onClick={()=>onCopy && onCopy(
                        (e.role || "")
                        + (e.company ? " - " + e.company : "")
                        + "\n\n"
                        + (e.description || "")
                      )}
                      style={{
                        ...B({
                          padding:"5px 11px", borderRadius:RadiusPill,
                          background:CreamSoft, color:GoldDeep,
                          border:"0.5px solid "+Gold,
                          fontSize:10, fontWeight:600, fontFamily:Sans,
                          flexShrink:0,
                        })
                      }}>{T.li_copy_section}</button>
                  </div>
                  {e.description && (
                    <div style={{
                      padding:"10px 12px",
                      background:CreamSoft,
                      borderRadius:RadiusSm,
                      fontSize:12, color:Ink, lineHeight:1.6,
                      whiteSpace:"pre-wrap",
                    }}>{e.description}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Bouton regenerer */}
          <button onClick={onRun} style={{
            ...B({
              width:"100%", padding:"11px 16px", borderRadius:RadiusPill,
              background:Paper, color:Gray600,
              border:"0.5px solid "+Gray200,
              fontFamily:Sans, fontWeight:500, fontSize:12,
            })
          }}>{T.li_run}</button>
        </>
      )}
    </Sheet>
  );
}
