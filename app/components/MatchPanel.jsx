"use client";

// Nuvi v3 - MatchPanel (refondu palette Nuvi).
//
// Adapte le CV a une offre d'emploi.

import { useState } from "react";
import {
  Ink, InkMuted, Cream, CreamSoft, Paper, Hairline,
  Coral, CoralSoft, Green, GreenSoft, Purple, Magenta, PurpleSoft,
  Sans, Serif, RadiusMd, RadiusPill, ShadowSm,
  B, IN, LBL, NO_DASH,
} from "./sharedTokens";

function MatchPanel({ cv, setCVFn, notify, apiKey, T, onPackRequest,
  onResult, onApplied, initialResult,
  aiCall, parseJSON, normCV, pushH }) {
  const [offer, setOffer] = useState("");
  const [load, setLoad]   = useState(false);
  const [res, setRes]     = useState(initialResult || null);
  const [ph, setPh]       = useState(initialResult ? "done" : "input");

  const analyze = async () => {
    if (!offer.trim()) { notify(T.off_no_offer); return; }
    if (!apiKey) { notify(T.nk); return; }
    setLoad(true);
    setPh("loading");
    const expT = cv.experience.map(e =>
      e.title + " chez " + e.company
      + " (" + e.period + "): "
      + e.bullets.filter(b=>b).join("; ")
    ).join(" | ");
    const cvT = "Profil: " + cv.name + " - " + cv.title
      + "\nAcrroche: " + cv.summary
      + "\nExps: " + expT
      + "\nSkills: " + cv.skills.filter(s=>s).join(", ")
      + "\nLangues: " + cv.languages.filter(l=>l.lang)
          .map(l=>l.lang+" "+l.level).join(", ");
    const expJ = cv.experience.map((e,i) =>
      JSON.stringify({
        id:i+1, title:e.title, company:e.company,
        period:e.period, location:e.location,
        bullets:e.bullets.filter(b=>b),
      })
    ).join(",");
    const eduJ = cv.education.map((e,i) =>
      JSON.stringify({id:i+1, degree:e.degree, school:e.school, period:e.period})
    ).join(",");
    const p = "Expert recrutement. Decode l'offre fournie + reecris le CV pour matcher.\n"
      +"OFFRE:\n"+offer+"\nCV:\n"+cvT+"\n"
      +"REGLES: ne pas inventer, adapter mots-cles offre. " + NO_DASH + "\n"
      +"Sois precis et actionnable. Le decodage de l'offre doit reveler des elements caches.\n"
      +'JSON uniquement: {"match_score":75,"job_title":"","company":"",'
      +'"key_requirements":["r1","r2","r3"],"keywords_matched":["k1","k2"],'
      +'"keywords_to_add":["k1","k2"],'
      +'"hidden_signals":["signal cache 1 que la plupart ne voient pas","signal 2"],'
      +'"culture_decode":"Ce que dit l offre sur la culture reelle de l entreprise en 2 phrases",'
      +'"seniority_decode":"Niveau reellement attendu vs ce qui est ecrit",'
      +'"likely_interview_questions":["q1","q2","q3","q4","q5"],'
      +'"cover_letter_hook":"accroche",'
      +'"cv_optimized":{"name":"'+cv.name+'","title":"","email":"'+cv.email+'",'
      +'"phone":"'+cv.phone+'","location":"'+cv.location+'","linkedin":"'+cv.linkedin+'",'
      +'"summary":"","experience":['+expJ+'],"education":['+eduJ+'],'
      +'"skills":["s1","s2","s3","s4","s5","s6","s7","s8"],'
      +'"languages":'+JSON.stringify(cv.languages)+',"certifications":'+JSON.stringify(cv.certifications)+'}}';
    try {
      const txt = await aiCall(p);
      const r = parseJSON(txt);
      setRes(r);
      setPh("done");
      if (onResult) onResult(r);
    } catch { notify(T.ea); setPh("input"); }
    setLoad(false);
  };

  const apply = () => {
    if (!res || !res.cv_optimized) return;
    // Snapshot avant de remplacer TOUT le CV. C'est l'action centrale de
    // l'app (coller une offre -> CV adapte) et elle ecrasait le CV de
    // l'utilisateur sans retour possible : si la version optimisee est moins
    // bonne, il n'y avait aucun moyen de revenir en arriere.
    if (typeof pushH === "function") pushH();
    setCVFn(() => normCV(res.cv_optimized, cv));
    notify("CV adapte applique!");
    setPh("input");
    setRes(null);
    setOffer("");
    if (onApplied) onApplied();
  };

  const sc = function(s) { if (s >= 80) return "#16a34a"; if (s >= 65) return Purple; if (s >= 50) return Coral; return "#dc2626"; };

  if (ph === "loading") {
    return (
      <div style={{textAlign:"center", padding:"36px 20px", fontFamily:Sans}}>
        <div style={{
          width:42, height:42, margin:"0 auto 14px",
          border:"3px solid "+Hairline, borderTopColor:Purple,
          borderRadius:"50%",
          animation:"cvfSpin 1s linear infinite",
        }}/>
        <div style={{fontFamily:Serif, fontSize:16, fontWeight:500, color:Ink, marginBottom:6, letterSpacing:"-0.01em"}}>
          Analyse en cours...
        </div>
        <div style={{fontSize:12, color:InkMuted}}>
          Nuvi adapte ton CV pour matcher parfaitement.
        </div>
      </div>
    );
  }

  if (ph === "done" && res) {
    return (
      <div style={{fontFamily:Sans}}>
        {/* Score Match - hero card */}
        <div style={{
          display:"flex", alignItems:"center", gap:14,
          background:CreamSoft, borderRadius:RadiusMd,
          padding:"14px 18px", marginBottom:12,
          border:"0.5px solid "+Hairline,
        }}>
          <div style={{textAlign:"center", flexShrink:0}}>
            <div style={{
              fontFamily:Serif, fontSize:34, fontWeight:500,
              color:sc(res.match_score), lineHeight:1, letterSpacing:"-0.02em",
            }}>
              {res.match_score}
            </div>
            <div style={{fontSize:9, color:InkMuted, fontWeight:600, letterSpacing:1, marginTop:2}}>
              Match
            </div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:13, fontWeight:600, color:Ink, marginBottom:6, fontFamily:Sans}}>
              {res.job_title}{res.company?" - "+res.company:""}
            </div>
            <div style={{width:"100%", height:5, borderRadius:3, background:Hairline}}>
              <div style={{
                width:res.match_score+"%", height:"100%",
                borderRadius:3, background:sc(res.match_score),
              }}/>
            </div>
          </div>
        </div>

        {/* Requirements */}
        {(res.key_requirements||[]).length > 0 && (
          <div style={{
            background:PurpleSoft, borderRadius:RadiusMd,
            padding:"10px 13px", marginBottom:10,
            border:"0.5px solid "+Purple,
          }}>
            <div style={{fontSize:10, fontWeight:700, color:Purple, marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase"}}>
              Requirements cles
            </div>
            {(res.key_requirements||[]).map((r,i) => (
              <div key={i} style={{fontSize:12, color:Ink, marginBottom:3}}>
                {"* "}{r}
              </div>
            ))}
          </div>
        )}

        {/* Keywords matched / to add */}
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:10}}>
          {(res.keywords_matched||[]).length > 0 && (
            <div style={{background:GreenSoft, borderRadius:RadiusMd, padding:"9px 11px"}}>
              <div style={{fontSize:9, fontWeight:700, color:Green, marginBottom:5, letterSpacing:"0.05em", textTransform:"uppercase"}}>
                Presents
              </div>
              <div style={{display:"flex", flexWrap:"wrap", gap:3}}>
                {(res.keywords_matched||[]).map((k,i) => (
                  <span key={i} style={{
                    background:"#dcfce7", color:Green,
                    borderRadius:3, padding:"2px 5px", fontSize:9,
                  }}>{k}</span>
                ))}
              </div>
            </div>
          )}
          {(res.keywords_to_add||[]).length > 0 && (
            <div style={{background:CoralSoft, borderRadius:RadiusMd, padding:"9px 11px"}}>
              <div style={{fontSize:9, fontWeight:700, color:Coral, marginBottom:5, letterSpacing:"0.05em", textTransform:"uppercase"}}>
                Ajoutes
              </div>
              <div style={{display:"flex", flexWrap:"wrap", gap:3}}>
                {(res.keywords_to_add||[]).map((k,i) => (
                  <span key={i} style={{
                    background:"#fef3c7", color:"#92400e",
                    borderRadius:3, padding:"2px 5px", fontSize:9,
                  }}>{k}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cover letter hook - terracotta */}
        {res.cover_letter_hook && (
          <div style={{
            background:CoralSoft,
            border:"0.5px solid "+Coral,
            borderRadius:RadiusMd, padding:"10px 13px", marginBottom:12,
          }}>
            <div style={{fontSize:10, fontWeight:700, color:Coral, marginBottom:5, letterSpacing:"0.06em", textTransform:"uppercase"}}>
              Accroche lettre de motivation
            </div>
            <div style={{fontSize:12, color:Ink, lineHeight:1.6, fontStyle:"italic", fontFamily:Serif}}>
              "{res.cover_letter_hook}"
            </div>
          </div>
        )}

        {/* Hidden signals */}
        {res.hidden_signals && res.hidden_signals.length > 0 && (
          <div style={{
            background:CoralSoft, border:"0.5px solid "+Coral,
            borderRadius:RadiusMd, padding:"10px 13px", marginBottom:10,
          }}>
            <div style={{fontSize:10, fontWeight:700, color:Coral, marginBottom:6, letterSpacing:"0.05em", textTransform:"uppercase"}}>
              Signaux caches dans l'offre
            </div>
            {res.hidden_signals.map((s,i) => (
              <div key={i} style={{fontSize:12, color:"#7f1d1d", marginBottom:4, lineHeight:1.5}}>
                {"> "}{s}
              </div>
            ))}
          </div>
        )}

        {/* Culture decode */}
        {res.culture_decode && (
          <div style={{
            background:PurpleSoft, border:"0.5px solid "+Purple,
            borderRadius:RadiusMd, padding:"10px 13px", marginBottom:10,
          }}>
            <div style={{fontSize:10, fontWeight:700, color:Purple, marginBottom:5, letterSpacing:"0.05em", textTransform:"uppercase"}}>
              Culture entreprise (decodee)
            </div>
            <div style={{fontSize:12, color:Ink, lineHeight:1.5}}>
              {res.culture_decode}
            </div>
          </div>
        )}

        {/* Seniority decode */}
        {res.seniority_decode && (
          <div style={{
            background:GreenSoft, border:"0.5px solid "+Green,
            borderRadius:RadiusMd, padding:"10px 13px", marginBottom:10,
          }}>
            <div style={{fontSize:10, fontWeight:700, color:Green, marginBottom:5, letterSpacing:"0.05em", textTransform:"uppercase"}}>
              Niveau attendu (decode)
            </div>
            <div style={{fontSize:12, color:Ink, lineHeight:1.5}}>
              {res.seniority_decode}
            </div>
          </div>
        )}

        {/* Interview questions */}
        {res.likely_interview_questions && res.likely_interview_questions.length > 0 && (
          <div style={{
            background:CoralSoft, border:"0.5px solid "+Coral,
            borderRadius:RadiusMd, padding:"10px 13px", marginBottom:12,
          }}>
            <div style={{fontSize:10, fontWeight:700, color:Coral, marginBottom:6, letterSpacing:"0.05em", textTransform:"uppercase"}}>
              Questions probables en entretien
            </div>
            {res.likely_interview_questions.map((q,i) => (
              <div key={i} style={{fontSize:12, color:"#7f1d1d", marginBottom:4, lineHeight:1.5}}>
                {(i+1)+". "}{q}
              </div>
            ))}
          </div>
        )}

        {/* Apply button - gradient violet→magenta */}
        <button onClick={apply} style={{
          ...B({
            width:"100%", padding:13, minHeight:44, boxSizing:"border-box", borderRadius:RadiusPill,
            background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
            color:"#fff", fontWeight:600, fontSize:14, marginBottom:8,
            border:"none", fontFamily:Sans,
            boxShadow:"0 4px 16px rgba(91, 61, 245, 0.25)",
          })
        }}>
          Appliquer ce CV adapte
        </button>

        {/* Pack button - secondary CTA */}
        {onPackRequest && (
          <button onClick={()=>onPackRequest(offer, res)} style={{
            ...B({
              width:"100%", padding:13, minHeight:44, boxSizing:"border-box", borderRadius:RadiusPill,
              background:Paper, color:Purple,
              border:"0.5px solid "+Purple,
              fontWeight:600, fontSize:14, marginBottom:8,
              fontFamily:Sans,
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            })
          }}>
            <span>Generer la candidature complete</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </button>
        )}

        {/* New offer */}
        <button onClick={()=>{setPh("input");setRes(null);}} style={{
          ...B({
            width:"100%", padding:10, borderRadius:RadiusPill,
            background:Hairline, color:InkMuted, fontWeight:600, fontSize:13,
            border:"none", fontFamily:Sans,
          })
        }}>
          Nouvelle offre
        </button>
      </div>
    );
  }

  return (
    <div style={{fontFamily:Sans}}>
      {/* Intro card - terracotta */}
      <div style={{
        background:CoralSoft,
        border:"0.5px solid "+Coral,
        borderRadius:RadiusMd, padding:"11px 13px", marginBottom:14,
      }}>
        <div style={{fontSize:13, fontWeight:600, color:Ink, marginBottom:3, fontFamily:Serif}}>
          CV sur mesure pour une offre
        </div>
        <div style={{fontSize:12, color:InkMuted, lineHeight:1.6}}>
          Colle l'offre, Nuvi adapte ton CV existant sans rien inventer.
        </div>
      </div>

      {!cv.name && !cv.summary && (
        <div style={{
          background:CoralSoft, border:"0.5px solid "+Coral,
          borderRadius:RadiusMd, padding:"9px 12px", marginBottom:10,
          fontSize:12, color:"#7f1d1d",
        }}>
          Ton CV est vide, importe ou genere un CV d'abord.
        </div>
      )}
      <label style={LBL}>Offre d'emploi</label>
      <textarea value={offer} onChange={e=>setOffer(e.target.value)}
        placeholder={"Colle l'offre d'emploi complete ici:\n- Intitule du poste\n- Missions\n- Profil recherche\n- Competences requises"}
        rows={11}
        style={{...IN({resize:"vertical", marginBottom:14, fontSize:12, lineHeight:1.7})}}/>
      <button onClick={analyze}
        disabled={load||!apiKey||!offer.trim()}
        style={{
          ...B({
            width:"100%", padding:13, minHeight:44, boxSizing:"border-box", borderRadius:RadiusPill,
            background: load||!apiKey||!offer.trim()
              ? Hairline
              : `linear-gradient(135deg, ${Purple}, ${Magenta})`,
            color: load||!apiKey||!offer.trim() ? InkMuted : "#fff",
            fontWeight:600, fontSize:14,
            border:"none", fontFamily:Sans,
            boxShadow: load||!apiKey||!offer.trim() ? "none" : "0 4px 16px rgba(91, 61, 245, 0.25)",
          })
        }}>
        Adapter mon CV a cette offre
      </button>
      {!apiKey && (
        <div style={{fontSize:11, color:InkMuted, textAlign:"center", marginTop:7}}>
          Cle API requise dans Outils
        </div>
      )}
    </div>
  );
}

export default MatchPanel;
