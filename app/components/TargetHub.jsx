"use client";

// Nuvi v3 - TargetHub (refondu palette Nuvi).
//
// Hub des super-pouvoirs pour adapter le CV a une offre.

import {
  Coral, CoralSoft, Cream, CreamSoft, Hairline, Ink, InkMuted,
  Gray100, Gray200, Gray400, Gray600,
  Green, GreenSoft, Magenta, Paper, Purple, PurpleSoft,
  RadiusLg, RadiusMd, RadiusPill, Sans, Serif, ShadowSm, B,
} from "./sharedTokens";

function TargetHub({ T, cvIsEmpty, offerResult, locale,
  onOpenOffer, onOpenAudit, onOpenPos, onOpenTruth, onOpenPack, onOpenInterview, onOpenMultiCV }) {

  // Couleur du score.
  const scoreColor = (s) => {
    if (s >= 80) return Green;
    if (s >= 65) return Purple;
    if (s >= 50) return Coral;
    return "#dc2626";
  };

  // Cas vide.
  if (cvIsEmpty) {
    return (
      <div style={{fontFamily:Sans, padding:"8px 4px"}}>
        <h1 style={{
          fontFamily:Serif, fontWeight:400,
          fontSize:28, lineHeight:1.1,
          letterSpacing:"-0.02em", color:Ink,
          margin:"0 0 18px",
        }}>{T.ph_target}</h1>
        <div style={{
          background:Paper, borderRadius:RadiusLg,
          padding:"24px 22px", border:"0.5px solid "+Hairline,
          boxShadow:ShadowSm,
        }}>
          <div style={{
            fontSize:11, fontWeight:600,
            letterSpacing:"0.12em", textTransform:"uppercase",
            color:Coral, marginBottom:8,
          }}>{T.hub_eyebrow}</div>
          <p style={{
            fontFamily:Serif, fontWeight:400,
            fontSize:18, lineHeight:1.35,
            letterSpacing:"-0.01em",
            color:Ink, margin:0,
          }}>{T.hub_empty}</p>
        </div>
      </div>
    );
  }

  // Cartes "super-pouvoirs"
  const powers = [
    {
      key:"audit", icon:(
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
      ),
      iconBg:CoralSoft, iconColor:Coral,
      title:T.hub_audit, desc:T.hub_audit_desc, onClick:onOpenAudit,
    },
    {
      key:"pos", icon:(
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/>
        </svg>
      ),
      iconBg:PurpleSoft, iconColor:Purple,
      title:T.hub_pos, desc:T.hub_pos_desc, onClick:onOpenPos,
    },
    {
      key:"truth", icon:(
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"/>
          <path d="M16 19h6"/><path d="M19 16v6"/>
          <path d="M8 7h8"/><path d="M8 11h6"/>
        </svg>
      ),
      iconBg:CoralSoft, iconColor:Coral,
      title:T.hub_truth, desc:T.hub_truth_desc, onClick:onOpenTruth,
    },
    {
      key:"pack", icon:(
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6"/>
          <path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>
        </svg>
      ),
      iconBg:GreenSoft, iconColor:Green,
      title:T.hub_pack, desc:T.hub_pack_desc, onClick:onOpenPack,
    },
  ];

  const hasOffer = !!(offerResult && typeof offerResult.match_score === "number");

  return (
    <div style={{fontFamily:Sans, padding:"8px 4px"}}>
      {/* Header editorial */}
      <h1 style={{
        fontFamily:Serif, fontWeight:400,
        fontSize:28, lineHeight:1.1,
        letterSpacing:"-0.02em", color:Ink,
        margin:"0 0 16px",
      }}>{T.ph_target}</h1>

      {/* Hero card - gradient violet→magenta */}
      <div style={{
        position:"relative", overflow:"hidden",
        background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
        color:"#fff",
        borderRadius:RadiusLg,
        padding:"24px 22px", marginBottom:14,
      }}>
        <div style={{
          fontSize:11, fontWeight:600,
          letterSpacing:"0.12em", textTransform:"uppercase",
          color:"rgba(255,255,255,0.85)", marginBottom:10, position:"relative",
        }}>{T.hub_eyebrow}</div>
        <h2 style={{
          fontFamily:Serif, fontWeight:400,
          fontSize:26, lineHeight:1.15,
          letterSpacing:"-0.02em",
          margin:"0 0 14px", position:"relative",
        }}>
          {T.hub_title_a}
          {" "}
          <em style={{fontStyle:"italic", color:"#fff", textDecoration:"underline", textUnderlineOffset:4, textDecorationColor:"rgba(255,255,255,0.5)"}}>
            {T.hub_title_em}
          </em>
          {", "}
          {T.hub_title_b}
        </h2>
        <button onClick={onOpenOffer} style={{
          ...B({
            display:"inline-flex", alignItems:"center", gap:8,
            background:"#fff", color:Purple,
            padding:"13px 22px", borderRadius:RadiusPill,
            fontSize:14, fontWeight:600,
            fontFamily:Sans, border:"none",
            position:"relative",
            transition:"all 200ms ease-out",
            boxShadow:"0 4px 12px rgba(0,0,0,0.15)",
          })
        }}>
          {hasOffer ? T.hub_cta_change : T.hub_cta_paste}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        </button>
      </div>

      {/* Score card si offre analysee */}
      {hasOffer && (
        <button onClick={onOpenOffer} style={{
          ...B({
            width:"100%", textAlign:"left",
            background:Paper, borderRadius:RadiusLg,
            padding:"22px 22px", marginBottom:14,
            border:"0.5px solid "+Hairline,
            boxShadow:ShadowSm,
            fontFamily:Sans, color:Ink,
            transition:"all 200ms ease-out",
            display:"block", cursor:"pointer",
          })
        }}>
          <div style={{display:"flex", alignItems:"center", gap:18}}>
            <div style={{
              fontFamily:Serif, fontWeight:300,
              fontSize:56, lineHeight:1,
              letterSpacing:"-0.04em",
              background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
              WebkitBackgroundClip:"text",
              backgroundClip:"text",
              color:"transparent",
              flexShrink:0,
            }}>{offerResult.match_score}</div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{
                fontSize:11, fontWeight:600,
                letterSpacing:"0.1em", textTransform:"uppercase",
                color:InkMuted, marginBottom:4,
              }}>{T.hub_match_label}</div>
              <div style={{
                fontFamily:Serif, fontSize:15, fontWeight:500,
                letterSpacing:"-0.01em",
                color:Ink, marginBottom:8,
                overflow:"hidden", textOverflow:"ellipsis",
                whiteSpace:"nowrap",
              }}>
                {offerResult.job_title || ""}
                {offerResult.company ? " - " + offerResult.company : ""}
              </div>
              <div style={{
                width:"100%", height:6, background:Hairline,
                borderRadius:RadiusPill, overflow:"hidden",
              }}>
                <div style={{
                  height:"100%",
                  width:Math.max(2, Math.min(100, offerResult.match_score)) + "%",
                  background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
                  borderRadius:RadiusPill,
                }}/>
              </div>
            </div>
          </div>
          {/* Tags mots-cles a integrer - terracotta */}
          {(offerResult.keywords_to_add || []).length > 0 && (
            <div style={{
              display:"flex", flexWrap:"wrap", gap:6,
              marginTop:14,
            }}>
              {(offerResult.keywords_to_add || []).slice(0, 6).map((k,i)=>(
                <span key={i} style={{
                  padding:"5px 11px", borderRadius:RadiusPill,
                  fontSize:11, fontWeight:500,
                  background:CoralSoft, color:Coral,
                  border:"0.5px solid "+Coral,
                }}>+ {k}</span>
              ))}
            </div>
          )}
        </button>
      )}

      {/* Eyebrow grille */}
      <div style={{
        fontSize:11, fontWeight:600,
        letterSpacing:"0.12em", textTransform:"uppercase",
        color:Coral, marginTop:18, marginBottom:10,
      }}>{T.hub_subhead}</div>

      {/* Grille 2x2 super-pouvoirs */}
      <div style={{
        display:"grid",
        gridTemplateColumns:"1fr 1fr",
        gap:12,
      }}>
        {powers.map(p => (
          <button key={p.key} onClick={p.onClick} style={{
            ...B({
              background:Paper, borderRadius:RadiusMd,
              padding:"18px 16px",
              border:"0.5px solid "+Hairline,
              transition:"all 200ms ease-out",
              minHeight:130,
              display:"flex", flexDirection:"column",
              justifyContent:"space-between",
              textAlign:"left", fontFamily:Sans,
              boxShadow:ShadowSm,
            })
          }}>
            <div>
              <div style={{
                width:36, height:36, borderRadius:11,
                display:"flex", alignItems:"center", justifyContent:"center",
                background:p.iconBg, color:p.iconColor,
                marginBottom:12,
              }}>{p.icon}</div>
              <div style={{
                fontFamily:Serif, fontWeight:500,
                fontSize:15, letterSpacing:"-0.01em",
                color:Ink, marginBottom:4,
              }}>{p.title}</div>
              <div style={{
                fontSize:11, color:InkMuted, lineHeight:1.4,
              }}>{p.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* 5e super-pouvoir : Preparer l'entretien (gradient violet→magenta) */}
      {onOpenInterview && (
        <button onClick={onOpenInterview} style={{
          ...B({
            display:"flex", alignItems:"center", gap:14,
            width:"100%",
            background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
            color:"#fff",
            borderRadius:RadiusMd,
            padding:"16px 18px",
            marginTop:12,
            border:"none",
            textAlign:"left", fontFamily:Sans,
            position:"relative", overflow:"hidden",
            transition:"all 200ms ease-out",
            boxShadow:"0 4px 16px rgba(91, 61, 245, 0.25)",
          })
        }}>
          <div style={{
            width:40, height:40, borderRadius:11,
            display:"flex", alignItems:"center", justifyContent:"center",
            background:"rgba(255,255,255,0.2)", color:"#fff",
            flexShrink:0, position:"relative",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div style={{flex:1, minWidth:0, position:"relative"}}>
            <div style={{
              fontFamily:Serif, fontWeight:500,
              fontSize:16, letterSpacing:"-0.01em",
              color:"#fff", marginBottom:3,
            }}>{T.iv_btn || "Preparer l'entretien"}</div>
            <div style={{
              fontSize:11, color:"rgba(255,255,255,0.85)", lineHeight:1.4,
            }}>{T.iv_btn_desc || "Nuvi simule le recruteur typique de ton marche"}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="#fff" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{flexShrink:0, position:"relative"}}>
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        </button>
      )}

      {/* 6e super-pouvoir : Multi-CV strategie (terracotta accent) */}
      {onOpenMultiCV && (
        <button onClick={onOpenMultiCV} style={{
          ...B({
            display:"flex", alignItems:"center", gap:14,
            width:"100%",
            background:Paper, color:Ink,
            borderRadius:RadiusMd,
            padding:"16px 18px",
            marginTop:10,
            border:"0.5px solid "+Coral,
            textAlign:"left", fontFamily:Sans,
            position:"relative", overflow:"hidden",
            boxShadow:ShadowSm,
            transition:"all 200ms ease-out",
          })
        }}>
          <div style={{
            width:40, height:40, borderRadius:11,
            display:"flex", alignItems:"center", justifyContent:"center",
            background:CoralSoft, color:Coral,
            flexShrink:0, position:"relative",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <rect width="14" height="18" x="5" y="3" rx="2"/>
              <line x1="9" y1="9" x2="15" y2="9"/>
              <line x1="9" y1="13" x2="15" y2="13"/>
              <line x1="9" y1="17" x2="13" y2="17"/>
            </svg>
          </div>
          <div style={{flex:1, minWidth:0, position:"relative"}}>
            <div style={{
              fontFamily:Serif, fontWeight:500,
              fontSize:16, letterSpacing:"-0.01em",
              color:Ink, marginBottom:3,
            }}>{T.mc_btn || "Quel CV envoyer ?"}</div>
            <div style={{
              fontSize:11, color:InkMuted, lineHeight:1.4,
            }}>{T.mc_btn_desc || "Nuvi recommande la meilleure version"}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={Coral} strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{flexShrink:0, position:"relative"}}>
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        </button>
      )}
    </div>
  );
}

export default TargetHub;
