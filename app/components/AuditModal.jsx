"use client";

// Nuvi v3 - AuditModal (refondu palette Nuvi).
//
// Affiche le resultat d'un audit recruteur IA :
// - Score global (0-100) + verdict (rappelle / hesite / passe)
// - Premiere impression (5 sec)
// - Verdict longueur
// - Forces, faiblesses, suggestions actionnables
// - Mots-cles ATS manquants avec integration intelligente

import { useEffect } from "react";
import {
  Ink, InkMuted, Cream, CreamSoft, Paper, Hairline,
  Coral, CoralSoft, Green, GreenSoft, Purple, Magenta, PurpleSoft,
  Gray100, Gray200, Gray400, Gray600,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm, B, Trans, CoralText, GreenText, PurpleText } from "./tokens";
import Sheet from "./Sheet";

// Couleurs verdict.
function verdictAccent(v) {
  if (!v) return { fg: InkMuted, bg: Hairline };
  const x = v.toLowerCase();
  if (x.indexOf("rappelle") !== -1 || x.indexOf("call") !== -1)
    return { fg: Green, bg: GreenSoft };
  if (x.indexOf("hesite") !== -1 || x.indexOf("hesitate") !== -1)
    return { fg: Purple, bg: PurpleSoft };
  return { fg: Coral, bg: CoralSoft };
}

// Couleur score.
function scoreAccent(s) {
  if (s >= 80) return Green;
  if (s >= 65) return Purple;
  if (s >= 50) return Coral;
  return "#dc2626";
}

export default function AuditModal({
  T, cv, country, setCountry, loading, result, msgIdx, messages,
  onRun, onClose, onApplySuggestion, onIntegrateKeywords, kwLoading,
}) {

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !loading) onClose(); };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [loading, onClose]);

  // Liste des pays utilisant les strings i18n.
  const countries = [
    ["FR", T.am_country_fr],
    ["UK", T.am_country_uk],
    ["US", T.am_country_us],
    ["DE", T.am_country_de],
    ["CH", T.am_country_ch],
    ["BE", T.am_country_be],
    ["LU", T.am_country_lu],
    ["ES", T.am_country_es],
    ["IT", T.am_country_it],
    ["AE", T.am_country_ae],
    ["CA", T.am_country_ca],
    ["AUTO", T.am_country_auto],
  ];

  const sAccent = result ? scoreAccent(result.score_global) : InkMuted;
  const vAccent = result ? verdictAccent(result.verdict_recruteur) : { fg: InkMuted, bg: Hairline };

  return (
    <Sheet
      eyebrow={T.am_eyebrow}
      title={T.am_title}
      onClose={onClose}
    >
      <p style={{
        fontSize:13, color:InkMuted, lineHeight:1.5,
        margin:"0 0 18px", fontFamily:Sans,
      }}>{T.am_sub}</p>

      {/* Loading - spinner Purple, gradient violet→magenta */}
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
            animation:"cvfFadeIn 600ms ease-out",
          }}>{messages && messages[msgIdx]}</div>
          <div style={{
            fontSize:12, color:InkMuted, marginTop:6,
          }}>{T.am_loading_sub}</div>
          <div style={{
            marginTop:18, height:3, background:Hairline,
            borderRadius:RadiusPill, overflow:"hidden", width:200,
            margin:"18px auto 0", position:"relative",
          }}>
            <div style={{
              position:"absolute", top:0, height:"100%",
              background:`linear-gradient(90deg, ${Purple}, ${Magenta})`,
              animation:"cvfAuSlide 2s ease-in-out infinite",
              width:"40%",
            }}/>
          </div>
          <style>{`
            @keyframes cvfAuSlide {
              0% { transform: translateX(-100%); }
              50% { transform: translateX(150%); }
              100% { transform: translateX(400%); }
            }
          `}</style>
        </div>
      )}

      {/* Form (avant audit) */}
      {!loading && !result && (
        <>
          {/* Intro card - terracotta border */}
          <div style={{
            padding:"14px 16px",
            background:CreamSoft,
            border:"0.5px solid "+Coral,
            borderRadius:RadiusMd,
            marginBottom:18,
          }}>
            <div style={{
              fontFamily:Serif, fontSize:15, fontWeight:500,
              color:Ink, letterSpacing:"-0.01em", marginBottom:4,
              lineHeight:1.3,
            }}>{T.am_intro_title}</div>
            <div style={{
              fontSize:12, color:InkMuted, lineHeight:1.55,
              fontFamily:Sans,
            }}>{T.am_intro_sub}</div>
          </div>

          {/* Eyebrow Coral */}
          <label style={{
            display:"block", fontSize:11, fontWeight:600,
            letterSpacing:"0.1em", textTransform:"uppercase",
            color:CoralText, marginBottom:8,
            fontFamily:Sans,
          }}>{T.am_country_label}</label>

          <select
            value={country}
            onChange={e=>setCountry(e.target.value)}
            style={{
              width:"100%", padding:"12px 14px", borderRadius:RadiusSm,
              border:"1.5px solid "+Hairline, fontSize:14, color:Ink,
              background:Paper, marginBottom:8, fontFamily:Sans,
              outline:"none", cursor:"pointer",
              boxSizing:"border-box",
            }}>
            {countries.map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>

          <div style={{
            fontSize:11, color:InkMuted, marginBottom:18, lineHeight:1.5,
            fontFamily:Sans,
          }}>{T.am_country_help}</div>

          {/* CTA principal - gradient violet→magenta */}
          <button onClick={onRun} style={{
            ...B({
              width:"100%", padding:"15px 22px", borderRadius:RadiusPill,
              background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
              color:"#fff",
              fontFamily:Sans, fontWeight:600, fontSize:14,
              border:"none",
              display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
              transition: Trans(["background","color","border-color","box-shadow","transform","opacity"], "fast"),
              boxShadow:"0 4px 16px rgba(91, 61, 245, 0.25)",
            })
          }}>
            {T.am_run}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </button>
        </>
      )}

      {/* Resultat */}
      {!loading && result && (
        <>
          {/* Score + verdict */}
          <div style={{
            display:"flex", gap:10, marginBottom:16,
            flexWrap:"wrap",
          }}>
            {/* Score */}
            <div style={{
              flex:"1 1 100px", minWidth:100,
              padding:"16px 14px", borderRadius:RadiusMd,
              background:sAccent + "15",
              border:"1.5px solid "+sAccent,
              textAlign:"center",
              fontFamily:Sans,
            }}>
              <div style={{
                fontSize:10, fontWeight:600,
                letterSpacing:"0.1em", textTransform:"uppercase",
                color:InkMuted, marginBottom:4,
              }}>{T.am_score_global}</div>
              <div style={{
                fontFamily:Serif, fontSize:36, fontWeight:500,
                color:sAccent, lineHeight:1, letterSpacing:"-0.02em",
              }}>{result.score_global || 0}</div>
              <div style={{
                fontSize:10, color:InkMuted, marginTop:4,
              }}>{T.am_score_unit}</div>
            </div>
            {/* Verdict */}
            <div style={{
              flex:"2 1 200px", minWidth:200,
              padding:"14px 16px", borderRadius:RadiusMd,
              background:vAccent.bg,
              border:"1.5px solid "+vAccent.fg,
              fontFamily:Sans,
            }}>
              <div style={{
                fontSize:10, fontWeight:600,
                letterSpacing:"0.1em", textTransform:"uppercase",
                color:InkMuted, marginBottom:4,
              }}>{T.am_verdict}</div>
              <div style={{
                fontFamily:Serif, fontSize:17, fontWeight:500,
                color:vAccent.fg, lineHeight:1.2,
                letterSpacing:"-0.01em", marginBottom:6,
              }}>{result.verdict_recruteur || "?"}</div>
              {result.raison_verdict && (
                <div style={{
                  fontSize:12, color:Ink, lineHeight:1.5,
                }}>{result.raison_verdict}</div>
              )}
            </div>
          </div>

          {/* Premiere impression - border violet, eyebrow Coral */}
          {result.premiere_impression && (
            <div style={{
              padding:"12px 16px",
              background:CreamSoft,
              borderLeft:"3px solid "+Purple,
              borderRadius:RadiusSm,
              marginBottom:16,
              fontFamily:Sans,
            }}>
              <div style={{
                fontSize:10, fontWeight:600,
                letterSpacing:"0.1em", textTransform:"uppercase",
                color:CoralText, marginBottom:5,
              }}>{T.am_first_impression}</div>
              <div style={{
                fontFamily:Serif, fontStyle:"italic",
                fontSize:13, color:Ink, lineHeight:1.55,
                letterSpacing:"-0.005em",
              }}>"{result.premiere_impression}"</div>
            </div>
          )}

          {/* Verdict longueur - terracotta */}
          {result.verdict_longueur && (
            <div style={{
              padding:"12px 14px", borderRadius:RadiusSm,
              background:CoralSoft,
              border:"0.5px solid "+Coral,
              marginBottom:16,
              fontFamily:Sans,
            }}>
              <div style={{
                fontSize:11, color:"#7f1d1d", lineHeight:1.55,
              }}>
                <span style={{fontWeight:600}}>{T.am_length}:</span>
                {" "}{result.verdict_longueur}
                {result.longueur_recommandation && (
                  <>
                    <br/>
                    <span style={{fontSize:11, color:InkMuted}}>{result.longueur_recommandation}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Forces */}
          {result.forces && result.forces.length > 0 && (
            <div style={{marginBottom:16}}>
              <div style={{
                fontSize:11, fontWeight:600,
                letterSpacing:"0.1em", textTransform:"uppercase",
                color:GreenText, marginBottom:8,
                fontFamily:Sans,
              }}>{T.am_strengths}</div>
              {result.forces.map((f, i) => (
                <div key={i} style={{
                  padding:"9px 14px", marginBottom:6, borderRadius:RadiusSm,
                  background:GreenSoft, color:"#15803d",
                  fontSize:12, lineHeight:1.5, fontFamily:Sans,
                  border:"0.5px solid #86efac",
                }}>+ {f}</div>
              ))}
            </div>
          )}

          {/* Faiblesses */}
          {result.faiblesses && result.faiblesses.length > 0 && (
            <div style={{marginBottom:16}}>
              <div style={{
                fontSize:11, fontWeight:600,
                letterSpacing:"0.1em", textTransform:"uppercase",
                color:CoralText, marginBottom:8,
                fontFamily:Sans,
              }}>{T.am_weaknesses}</div>
              {result.faiblesses.map((f, i) => (
                <div key={i} style={{
                  padding:"9px 14px", marginBottom:6, borderRadius:RadiusSm,
                  background:CoralSoft, color:"#7f1d1d",
                  fontSize:12, lineHeight:1.5, fontFamily:Sans,
                  border:"0.5px solid "+Coral,
                }}>- {f}</div>
              ))}
            </div>
          )}

          {/* Suggestions - eyebrow Coral, cards CoralSoft + Coral border, hover Purple */}
          {result.suggestions && result.suggestions.length > 0 && (
            <div style={{marginBottom:16}}>
              <div style={{
                fontSize:11, fontWeight:600,
                letterSpacing:"0.1em", textTransform:"uppercase",
                color:CoralText, marginBottom:6,
                fontFamily:Sans,
              }}>{T.am_suggestions}</div>
              <div style={{
                fontSize:11, color:InkMuted, marginBottom:10,
                fontStyle:"italic", fontFamily:Sans,
              }}>{T.am_suggestions_hint}</div>
              {result.suggestions.map((s, i) => (
                <button key={i}
                  onClick={()=>onApplySuggestion && onApplySuggestion(s)}
                  style={{
                    ...B({
                      width:"100%", textAlign:"left",
                      padding:"12px 14px", marginBottom:8, borderRadius:RadiusSm,
                      background:CreamSoft,
                      border:"0.5px solid "+Hairline,
                      fontSize:12, lineHeight:1.55, color:Ink,
                      display:"flex", gap:10, alignItems:"flex-start",
                      fontFamily:Sans,
                      transition: Trans(["background","color","border-color","box-shadow","transform","opacity"], "fast"),
                    })
                  }}>
                  <span style={{color:PurpleText, fontWeight:600, flexShrink:0}}>{i+1}.</span>
                  <span style={{flex:1}}>{s}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke={Purple} strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{flexShrink:0, marginTop:2}}>
                    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                  </svg>
                </button>
              ))}
            </div>
          )}

          {/* Mots-cles manquants - tags gradient violet→magenta */}
          {result.mots_cles_manquants && result.mots_cles_manquants.length > 0 && (
            <div style={{marginBottom:16}}>
              <div style={{
                fontSize:11, fontWeight:600,
                letterSpacing:"0.1em", textTransform:"uppercase",
                color:CoralText, marginBottom:10,
                fontFamily:Sans,
              }}>{T.am_kw_missing}</div>
              <div style={{
                display:"flex", flexWrap:"wrap", gap:6, marginBottom:12,
              }}>
                {result.mots_cles_manquants.map((k, i) => (
                  <span key={i} style={{
                    padding:"5px 12px", borderRadius:RadiusPill,
                    background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
                    color:"#fff",
                    fontSize:11, fontWeight:500,
                    fontFamily:Sans,
                    letterSpacing:"0.02em",
                  }}>{k}</span>
                ))}
              </div>
              {/* Bouton Intégrer - gradient violet→magenta */}
              <button
                onClick={()=>onIntegrateKeywords && onIntegrateKeywords(result.mots_cles_manquants)}
                disabled={kwLoading}
                style={{
                  ...B({
                    width:"100%", padding:"12px 18px", borderRadius:RadiusPill,
                    background: kwLoading
                      ? Hairline
                      : `linear-gradient(135deg, ${Purple}, ${Magenta})`,
                    color: kwLoading ? InkMuted : "#fff",
                    fontFamily:Sans, fontWeight:600, fontSize:13,
                    border:"none",
                    cursor: kwLoading ? "wait" : "pointer",
                    display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6,
                    transition: Trans(["background","color","border-color","box-shadow","transform","opacity"], "fast"),
                    boxShadow: kwLoading ? "none" : "0 4px 16px rgba(91, 61, 245, 0.25)",
                  })
                }}>
                {kwLoading ? T.am_kw_integrating : T.am_kw_integrate}
                {!kwLoading && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                  </svg>
                )}
              </button>
              <div style={{
                fontSize:10, color:InkMuted, marginTop:6, textAlign:"center",
                lineHeight:1.5, fontFamily:Sans,
              }}>{T.am_kw_hint}</div>
            </div>
          )}

          {/* Relancer - secondary */}
          <button onClick={onRun} style={{
            ...B({
              width:"100%", padding:"11px 16px", borderRadius:RadiusPill,
              background:Paper, color:InkMuted,
              border:"0.5px solid "+Hairline,
              fontFamily:Sans, fontWeight:500, fontSize:12,
              marginTop:8,
            })
          }}>{T.am_relaunch}</button>
        </>
      )}
    </Sheet>
  );
}
