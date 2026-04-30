"use client";

// CV Factory v17 - MultiCVStrategyModal
//
// L'utilisateur a sauvegarde plusieurs versions de son CV. Cet outil prend une
// offre d'emploi et recommande LA version la plus pertinente a envoyer.
// Plus malin que Versions (qui est juste du stockage) - ici on a l'analyse IA.
//
// Shape attendue de result :
//   {
//     recommended_id: number (id de la version recommandee),
//     recommended_score: number (0-100),
//     why: "texte explicatif",
//     alternatives: [
//       { id: number, score: number, comment: "..." }
//     ]
//   }
//
// Props :
//   T              : i18n
//   versions       : [{ id, name, cv, created }]
//   apiKey         : string
//   loading        : bool
//   result         : recommendation | null
//   offerText      : string (textarea controlled)
//   setOfferText   : setter
//   prefilledOffer : bool
//   onRun()
//   onLoadVersion(id)
//   onClose()

import { useEffect } from "react";
import {
  Ink, Cream, CreamSoft, Paper, Gold, GoldDeep,
  Coral, CoralSoft, Green, GreenSoft, Purple, PurpleSoft,
  Gray100, Gray200, Gray400, Gray600,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm,
  GradPurple, B,
} from "./tokens";
import Sheet from "./Sheet";

// Couleur score.
function scoreAccent(s) {
  if (s >= 80) return Green;
  if (s >= 65) return GoldDeep;
  if (s >= 50) return Coral;
  return "#dc2626";
}

export default function MultiCVStrategyModal({
  T, versions, apiKey, loading, result,
  offerText, setOfferText, prefilledOffer,
  onRun, onLoadVersion, onClose,
}) {

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !loading) onClose(); };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [loading, onClose]);

  const enoughVersions = versions && versions.length >= 2;
  const canRun = !!(offerText && offerText.trim() && enoughVersions && apiKey);

  // Trouve une version par id.
  const versionById = (id) => (versions || []).find(v => v.id === id);

  // Version recommandee.
  const recVersion = result && result.recommended_id ? versionById(result.recommended_id) : null;
  const recAccent = result ? scoreAccent(result.recommended_score || 0) : Gray600;

  return (
    <Sheet
      eyebrow={T.mc_eyebrow}
      title={
        <>
          {T.mc_title_a}
          {" "}<em style={{
            fontFamily:Serif, fontStyle:"italic", color:Gold,
          }}>{T.mc_title_em}</em>
          {" "}{T.mc_title_b}
        </>
      }
      onClose={onClose}
    >
      <p style={{
        fontSize:13, color:Gray600, lineHeight:1.5,
        margin:"0 0 18px", fontFamily:Sans,
      }}>{T.mc_sub}</p>

      {/* Etat 1 : pas assez de versions */}
      {!enoughVersions && !loading && (
        <div style={{
          padding:"24px 18px",
          background:CreamSoft, borderRadius:RadiusMd,
          border:"0.5px solid "+Gray200,
          textAlign:"center", color:Gray600,
          fontSize:13, fontFamily:Sans, lineHeight:1.6,
        }}>{T.mc_no_versions}</div>
      )}

      {/* Etat 2 : form */}
      {enoughVersions && !loading && !result && (
        <>
          <div style={{marginBottom:18}}>
            <label style={{
              display:"block", fontSize:11, fontWeight:600,
              letterSpacing:"0.1em", textTransform:"uppercase",
              color:GoldDeep, marginBottom:8, fontFamily:Sans,
            }}>{T.mc_offer_label}</label>
            {prefilledOffer && (
              <div style={{
                padding:"8px 12px",
                background:GreenSoft, color:Green,
                borderRadius:RadiusSm,
                fontSize:11, fontWeight:500, marginBottom:8,
                fontFamily:Sans,
                border:"0.5px solid "+Green,
              }}>{T.mc_offer_already}</div>
            )}
            <textarea
              value={offerText}
              onChange={e=>setOfferText(e.target.value)}
              placeholder={T.mc_offer_ph}
              rows={6}
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
                minHeight:120,
                boxSizing:"border-box",
              }}
            />
          </div>

          <button onClick={onRun} disabled={!canRun} style={{
            ...B({
              width:"100%", padding:"15px 22px", borderRadius:RadiusPill,
              background: canRun ? GradPurple : Gray200,
              color: canRun ? "#fff" : Gray600,
              fontFamily:Sans, fontWeight:600, fontSize:14,
              display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
              transition:"all 200ms ease-out",
            })
          }}>
            {T.mc_run}
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
          }}>{T.mc_loading}</div>
          <div style={{
            fontSize:12, color:Gray600, marginTop:6,
          }}>{T.mc_loading_sub}</div>
        </div>
      )}

      {/* Etat 4 : result */}
      {!loading && result && (
        <>
          {/* Recommendation hero */}
          {recVersion && (
            <div style={{
              padding:"20px 22px",
              background:Ink, color:Cream,
              borderRadius:RadiusMd, marginBottom:16,
              position:"relative", overflow:"hidden",
              fontFamily:Sans,
            }}>
              <div style={{
                position:"absolute", inset:0,
                background:"radial-gradient(ellipse 100% 80% at 90% 0%, rgba(91,61,245,.45) 0%, transparent 60%)",
                pointerEvents:"none",
              }}/>
              <div style={{position:"relative"}}>
                <div style={{
                  fontSize:11, fontWeight:600,
                  letterSpacing:"0.12em", textTransform:"uppercase",
                  color:Purple, marginBottom:6,
                }}>{T.mc_recommendation}</div>
                <div style={{
                  fontFamily:Serif, fontSize:22, fontWeight:500,
                  letterSpacing:"-0.02em", marginBottom:10, lineHeight:1.2,
                }}>{recVersion.name || "?"}</div>
                <div style={{
                  display:"flex", alignItems:"center", gap:10,
                }}>
                  <div style={{
                    fontSize:11, fontWeight:600,
                    letterSpacing:"0.06em", color:Gold,
                  }}>{T.mc_match}</div>
                  <div style={{
                    padding:"4px 12px", borderRadius:RadiusPill,
                    background:recAccent, color:"#fff",
                    fontFamily:Serif, fontSize:18, fontWeight:500,
                    letterSpacing:"-0.01em",
                  }}>{result.recommended_score || 0}</div>
                </div>
              </div>
            </div>
          )}

          {/* Why */}
          {result.why && (
            <div style={{marginBottom:16}}>
              <div style={{
                fontSize:11, fontWeight:600,
                letterSpacing:"0.1em", textTransform:"uppercase",
                color:GoldDeep, marginBottom:8, fontFamily:Sans,
              }}>{T.mc_why}</div>
              <div style={{
                padding:"14px 16px",
                background:CreamSoft, borderRadius:RadiusMd,
                border:"0.5px solid "+Gold,
                fontFamily:Serif, fontStyle:"italic",
                fontSize:13, color:Ink, lineHeight:1.65,
                letterSpacing:"-0.005em",
              }}>"{result.why}"</div>
            </div>
          )}

          {/* Bouton charger */}
          {recVersion && onLoadVersion && (
            <button onClick={()=>onLoadVersion(recVersion.id)} style={{
              ...B({
                width:"100%", padding:"13px 18px", borderRadius:RadiusPill,
                background:GradPurple, color:"#fff",
                fontFamily:Sans, fontWeight:600, fontSize:13,
                display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
                marginBottom:18,
                transition:"all 200ms ease-out",
              })
            }}>
              {T.mc_load_recommended}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12l7 7 7-7"/>
              </svg>
            </button>
          )}

          {/* Alternatives */}
          {result.alternatives && result.alternatives.length > 0 && (
            <div style={{marginBottom:16}}>
              <div style={{
                fontSize:11, fontWeight:600,
                letterSpacing:"0.1em", textTransform:"uppercase",
                color:GoldDeep, marginBottom:10, fontFamily:Sans,
              }}>{T.mc_alternatives}</div>
              {result.alternatives.map((alt, i) => {
                const v = versionById(alt.id);
                if (!v) return null;
                const aAccent = scoreAccent(alt.score || 0);
                return (
                  <div key={i} style={{
                    padding:"12px 14px",
                    background:Paper,
                    border:"0.5px solid "+Gray200,
                    borderRadius:RadiusMd,
                    boxShadow:ShadowSm,
                    marginBottom:8, fontFamily:Sans,
                  }}>
                    <div style={{
                      display:"flex", justifyContent:"space-between",
                      alignItems:"center", gap:10, marginBottom:6,
                    }}>
                      <div style={{
                        fontFamily:Serif, fontSize:14, fontWeight:500,
                        color:Ink, letterSpacing:"-0.005em",
                        flex:1, minWidth:0,
                      }}>{v.name || "?"}</div>
                      <span style={{
                        padding:"3px 11px", borderRadius:RadiusPill,
                        background:aAccent + "22",
                        color:aAccent,
                        fontFamily:Sans, fontSize:13, fontWeight:600,
                        flexShrink:0,
                      }}>{alt.score || 0}</span>
                    </div>
                    {alt.comment && (
                      <div style={{
                        fontSize:11, color:Gray600, lineHeight:1.5,
                      }}>{alt.comment}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}
