"use client";

// CV Factory — MatchPanel
// Extrait de page.jsx pour permettre le lazy loading.

import { useState } from "react";
import ScoreDashboard from "./ScoreDashboard";
import {
  Dark, Gold, B, IN, LBL, NO_DASH,
} from "./sharedTokens";

function MatchPanel({  cv, setCVFn, notify, apiKey, T, onPackRequest,
  onResult, onApplied, initialResult,
  aiCall, parseJSON, normCV }) {
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
    setCVFn(() => normCV(res.cv_optimized, cv));
    notify("CV adapte applique!");
    setPh("input");
    setRes(null);
    setOffer("");
    if (onApplied) onApplied();
  };

  const sc = function(s) { if (s >= 80) return "#16a34a"; if (s >= 65) return "#ca8a04"; if (s >= 50) return "#ea580c"; return "#dc2626"; };

  if (ph === "loading") {
    return (
      <div style={{textAlign:"center", padding:"36px 20px"}}>
        <div style={{fontSize:28, marginBottom:10}}>{">"}</div>
        <div style={{fontSize:14, fontWeight:700, color:Dark, marginBottom:6}}>
          Analyse en cours...
        </div>
        <div style={{fontSize:12, color:"#888"}}>
          L'IA adapte ton CV pour matcher parfaitement.
        </div>
      </div>
    );
  }

  if (ph === "done" && res) {
    return (
      <div>
        <div style={{
          display:"flex", alignItems:"center", gap:14,
          background:"#f8f6f1", borderRadius:11,
          padding:"14px 18px", marginBottom:12,
        }}>
          <div style={{textAlign:"center", flexShrink:0}}>
            <div style={{
              fontSize:34, fontWeight:900,
              color:sc(res.match_score), lineHeight:1,
            }}>
              {res.match_score}
            </div>
            <div style={{fontSize:9, color:"#888", fontWeight:600, letterSpacing:1}}>
              Match
            </div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:13, fontWeight:700, color:Dark, marginBottom:4}}>
              {res.job_title}{res.company?" - "+res.company:""}
            </div>
            <div style={{width:"100%", height:5, borderRadius:3, background:"#eee"}}>
              <div style={{
                width:res.match_score+"%", height:"100%",
                borderRadius:3, background:sc(res.match_score),
              }}/>
            </div>
          </div>
        </div>
        {(res.key_requirements||[]).length > 0 && (
          <div style={{
            background:"#f0f4ff", borderRadius:9,
            padding:"10px 13px", marginBottom:10,
          }}>
            <div style={{fontSize:10, fontWeight:700, color:"#4338ca", marginBottom:6}}>
              Requirements cles
            </div>
            {(res.key_requirements||[]).map((r,i) => (
              <div key={i} style={{fontSize:12, color:"#333", marginBottom:3}}>
                {"* "}{r}
              </div>
            ))}
          </div>
        )}
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:10}}>
          {(res.keywords_matched||[]).length > 0 && (
            <div style={{background:"#f0fff4", borderRadius:9, padding:"9px 11px"}}>
              <div style={{fontSize:9, fontWeight:700, color:"#16a34a", marginBottom:5}}>
                Presents
              </div>
              <div style={{display:"flex", flexWrap:"wrap", gap:3}}>
                {(res.keywords_matched||[]).map((k,i) => (
                  <span key={i} style={{
                    background:"#dcfce7", color:"#16a34a",
                    borderRadius:3, padding:"2px 5px", fontSize:9,
                  }}>{k}</span>
                ))}
              </div>
            </div>
          )}
          {(res.keywords_to_add||[]).length > 0 && (
            <div style={{background:"#fff9f0", borderRadius:9, padding:"9px 11px"}}>
              <div style={{fontSize:9, fontWeight:700, color:Gold, marginBottom:5}}>
                Ajoutes
              </div>
              <div style={{display:"flex", flexWrap:"wrap", gap:3}}>
                {(res.keywords_to_add||[]).map((k,i) => (
                  <span key={i} style={{
                    background:"#fff3cd", color:"#92400e",
                    borderRadius:3, padding:"2px 5px", fontSize:9,
                  }}>{k}</span>
                ))}
              </div>
            </div>
          )}
        </div>
        {res.cover_letter_hook && (
          <div style={{
            background:Gold+"15",
            border:"1px solid "+Gold+"44",
            borderRadius:9, padding:"10px 13px", marginBottom:12,
          }}>
            <div style={{fontSize:10, fontWeight:700, color:Gold, marginBottom:5}}>
              Accroche lettre de motivation
            </div>
            <div style={{fontSize:12, color:"#555", lineHeight:1.6, fontStyle:"italic"}}>
              "{res.cover_letter_hook}"
            </div>
          </div>
        )}
        {res.hidden_signals && res.hidden_signals.length > 0 && (
          <div style={{
            background:"#fef3c7", border:"1px solid #fbbf24",
            borderRadius:9, padding:"10px 13px", marginBottom:10,
          }}>
            <div style={{fontSize:10, fontWeight:700, color:"#92400e", marginBottom:6}}>
              Signaux caches dans l'offre
            </div>
            {res.hidden_signals.map((s,i) => (
              <div key={i} style={{fontSize:12, color:"#78350f", marginBottom:4, lineHeight:1.5}}>
                {"> "}{s}
              </div>
            ))}
          </div>
        )}
        {res.culture_decode && (
          <div style={{
            background:"#ede9fe", border:"1px solid #c4b5fd",
            borderRadius:9, padding:"10px 13px", marginBottom:10,
          }}>
            <div style={{fontSize:10, fontWeight:700, color:"#5b21b6", marginBottom:5}}>
              Culture entreprise (decodee)
            </div>
            <div style={{fontSize:12, color:"#4c1d95", lineHeight:1.5}}>
              {res.culture_decode}
            </div>
          </div>
        )}
        {res.seniority_decode && (
          <div style={{
            background:"#f0fdf4", border:"1px solid #86efac",
            borderRadius:9, padding:"10px 13px", marginBottom:10,
          }}>
            <div style={{fontSize:10, fontWeight:700, color:"#166534", marginBottom:5}}>
              Niveau attendu (decode)
            </div>
            <div style={{fontSize:12, color:"#14532d", lineHeight:1.5}}>
              {res.seniority_decode}
            </div>
          </div>
        )}
        {res.likely_interview_questions && res.likely_interview_questions.length > 0 && (
          <div style={{
            background:"#fee2e2", border:"1px solid #fca5a5",
            borderRadius:9, padding:"10px 13px", marginBottom:12,
          }}>
            <div style={{fontSize:10, fontWeight:700, color:"#991b1b", marginBottom:6}}>
              Questions probables en entretien
            </div>
            {res.likely_interview_questions.map((q,i) => (
              <div key={i} style={{fontSize:12, color:"#7f1d1d", marginBottom:4, lineHeight:1.5}}>
                {(i+1)+". "}{q}
              </div>
            ))}
          </div>
        )}
        <button onClick={apply} style={{
          ...B({
            width:"100%", padding:13, borderRadius:11,
            background:"linear-gradient(135deg,#7c3aed,"+Gold+")",
            color:"#fff", fontWeight:800, fontSize:14, marginBottom:8,
          })
        }}>
          Appliquer ce CV adapte
        </button>
        {onPackRequest && (
          <button onClick={()=>onPackRequest(offer, res)} style={{
            ...B({
              width:"100%", padding:13, borderRadius:11,
              background:"linear-gradient(135deg,"+Dark+","+Gold+")",
              color:"#fff", fontWeight:800, fontSize:14, marginBottom:8,
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            })
          }}>
            <span style={{fontSize:16}}>{">"}</span>
            <span>Generer la candidature complete</span>
          </button>
        )}
        <button onClick={()=>{setPh("input");setRes(null);}} style={{
          ...B({
            width:"100%", padding:10, borderRadius:9,
            background:"#f0f0f0", color:"#666", fontWeight:600, fontSize:13,
          })
        }}>
          Nouvelle offre
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        background:Gold+"15", border:"1px solid "+Gold+"44",
        borderRadius:9, padding:"11px 13px", marginBottom:14,
      }}>
        <div style={{fontSize:13, fontWeight:700, color:Dark, marginBottom:3}}>
          CV sur mesure pour une offre
        </div>
        <div style={{fontSize:12, color:"#666", lineHeight:1.6}}>
          Colle l'offre - l'IA adapte ton CV existant sans rien inventer.
        </div>
      </div>
      {!cv.name && !cv.summary && (
        <div style={{
          background:"#fff3cd", border:"1px solid #ffc107",
          borderRadius:8, padding:"9px 12px", marginBottom:10,
          fontSize:12, color:"#664d03",
        }}>
          Ton CV est vide - importe ou genere un CV d'abord.
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
            width:"100%", padding:13, borderRadius:11,
            background:load||!apiKey||!offer.trim()
              ? "#ccc"
              : "linear-gradient(135deg,#7c3aed,"+Gold+")",
            color:"#fff", fontWeight:800, fontSize:14,
          })
        }}>
        Adapter mon CV a cette offre
      </button>
      {!apiKey && (
        <div style={{fontSize:11, color:"#888", textAlign:"center", marginTop:7}}>
          Cle API requise dans Outils
        </div>
      )}
    </div>
  );
}

export default MatchPanel;
