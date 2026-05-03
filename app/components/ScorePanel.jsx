"use client";

// CV Factory — ScorePanel
// Extrait de page.jsx pour permettre le lazy loading.

import { useState } from "react";
import ScoreDashboard from "./ScoreDashboard";
import {
  Coral, Cream, GoldDeep, Gray100, Gray200, Gray600, Green, Ink, Paper,
  RadiusMd, RadiusPill, Sans, Serif, ShadowSm, B,
} from "./sharedTokens";


// Helper local : couleur de fond selon le score
function scoreBg(s) {
  if (s >= 80) return "#dcfce7";
  if (s >= 65) return "rgba(201,169,110,.15)";
  if (s >= 50) return "#fff1ed";
  return "#fff1ed";
}

function ScorePanel({ cv, apiKey, notify, layout, T,
  dashLoading, dashResult, onRunDashboard, onCtaAxis }) {
  const [mode, setMode] = useState("dashboard");
  const [quickRes, setQuickRes] = useState(null);

  const computeQuick = () => {
    const C=[]; const add=(cat,label,ok,tip,w=1)=>{C.push({cat,label,ok,tip,w});};
    const sl=(cv.summary||"").trim().length;
    add("Contact","Nom",!!(cv.name||"").trim(),"Nom requis");
    add("Contact","Titre",!!(cv.title||"").trim(),"Titre requis");
    add("Contact","Email",!!(cv.email||"").trim(),"Email requis");
    add("Contact","Tel",!!(cv.phone||"").trim(),"Tel requis");
    add("Contact","Location",!!(cv.location||"").trim(),"Ville requise");
    add("Contact","LinkedIn",!!(cv.linkedin||"").trim(),"LinkedIn recommande");
    add("Accroche","Presente",sl>0,"Accroche indispensable");
    add("Accroche","Longueur ok",sl>100&&sl<600,"Vise 3 a 4 phrases");
    add("Accroche","Chiffres",(cv.summary||"").split("").some(c=>c>="0"&&c<="9"),"Ajoute des chiffres");
    const exps=(cv.experience||[]).filter(e=>e.title||e.company);
    add("Experience","Presente",exps.length>=1,"Aucune experience");
    add("Experience","Periodes",exps.length>0&&exps.every(e=>(e.period||"").trim()),"Periodes requises");
    add("Experience","Bullets chiffres",exps.some(e=>(e.bullets||[]).some(b=>(b||"").split("").some(c=>c>="0"&&c<="9"))),"Ajoute des chiffres");
    add("Experience","Volume",exps.reduce((s,e)=>s+(e.bullets||[]).filter(b=>(b||"").trim()).length,0)>=6,"Min 6 bullets");
    const sk=(cv.skills||[]).filter(s=>(s||"").trim());
    add("Competences","Min 5",sk.length>=5,"Vise 6 a 10");
    add("Competences","Min 8",sk.length>=8,"ATS filtrent sur mots-cles");
    add("Langues","Presente",(cv.languages||[]).filter(l=>(l.lang||"").trim()).length>=1,"Section vide");
    add("Certifications","Presente",(cv.certifications||[]).filter(c=>(c||"").trim()).length>=1,"Valorise le profil");
    add("Format ATS","ATS-Safe",layout==="ats","Passe en ATS-Safe",2);
    const tot=C.filter(c=>c.ok).reduce((s,c)=>s+c.w,0);
    const maxPts=C.reduce((s,c)=>s+c.w,0);
    const score=Math.round((tot/maxPts)*100);
    const bycat={};
    C.forEach(c=>{
      if(!bycat[c.cat])bycat[c.cat]={ok:0,tot:0,checks:[]};
      bycat[c.cat].ok+=c.ok?c.w:0;bycat[c.cat].tot+=c.w;bycat[c.cat].checks.push(c);
    });
    setQuickRes({score,checks:C,bycat});
  };

  const sc = (s) => { if (s >= 80) return Green; if (s >= 65) return GoldDeep; if (s >= 50) return Coral; return "#dc2626"; };

  return (
    <div style={{fontFamily:Sans}}>
      {/* Tabs pills */}
      <div style={{display:"flex", gap:6, marginBottom:18}}>
        <button onClick={()=>setMode("dashboard")} style={{
          ...B({
            flex:1, padding:"10px 14px", borderRadius:RadiusPill,
            background: mode==="dashboard" ? Ink : Paper,
            color: mode==="dashboard" ? Cream : Ink,
            border:"0.5px solid "+(mode==="dashboard" ? Ink : Gray200),
            fontFamily:Sans, fontWeight:mode==="dashboard"?600:500, fontSize:12,
            transition:"all 180ms ease-out",
          })
        }}>{T.sd_tab_dashboard}</button>
        <button onClick={()=>setMode("quick")} style={{
          ...B({
            flex:1, padding:"10px 14px", borderRadius:RadiusPill,
            background: mode==="quick" ? Ink : Paper,
            color: mode==="quick" ? Cream : Ink,
            border:"0.5px solid "+(mode==="quick" ? Ink : Gray200),
            fontFamily:Sans, fontWeight:mode==="quick"?600:500, fontSize:12,
            transition:"all 180ms ease-out",
          })
        }}>{T.sd_tab_quick}</button>
      </div>

      {mode === "dashboard" && (
        <ScoreDashboard
          T={T}
          cv={cv}
          apiKey={apiKey}
          loading={dashLoading}
          result={dashResult}
          onRun={onRunDashboard}
          onCta={onCtaAxis}
        />
      )}

      {mode === "quick" && (
        <div>
          <button onClick={computeQuick} style={{
            ...B({
              width:"100%", padding:"15px 22px", borderRadius:RadiusPill,
              background: "linear-gradient(135deg,#0a0a0a 0%, #1a1a1f 50%, #c9a96e 100%)",
              color:Cream,
              fontFamily:Sans, fontWeight:600, fontSize:14,
              marginBottom: 18,
              transition:"all 200ms ease-out",
              display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
            })
          }}>
            {quickRes ? "Recalculer" : "Analyser mon CV maintenant"}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </button>

          {quickRes && (
            <>
              {/* Score global rapide */}
              <div style={{
                padding: "20px 22px",
                background: scoreBg(quickRes.score),
                borderRadius: RadiusMd, marginBottom: 18,
                border:"0.5px solid "+Gray200,
                boxShadow: ShadowSm,
                display:"flex", alignItems:"center", gap:18,
              }}>
                <div style={{
                  fontFamily: Serif, fontWeight: 300,
                  fontSize: 56, lineHeight: 1,
                  letterSpacing: "-0.04em",
                  color: sc(quickRes.score), flexShrink:0,
                }}>{quickRes.score}</div>
                <div>
                  <div style={{
                    fontSize: 11, fontWeight: 600,
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    color: Gray600, fontFamily: Sans, marginBottom: 4,
                  }}>SCORE</div>
                  <div style={{
                    fontFamily: Serif, fontSize: 14, fontWeight: 400,
                    color: Ink, letterSpacing: "-0.01em",
                  }}>{
                    quickRes.score >= 80 ? "Excellent CV"
                    : quickRes.score >= 65 ? "Bon CV, ameliorations possibles"
                    : quickRes.score >= 50 ? "CV correct, plusieurs faiblesses"
                    : "Plusieurs manques structurels"
                  }</div>
                </div>
              </div>

              {/* Detail par categorie */}
              <div style={{
                fontSize: 11, fontWeight: 600,
                letterSpacing: "0.1em", textTransform: "uppercase",
                color: GoldDeep, marginBottom: 10,
                fontFamily: Sans,
              }}>Detail</div>
              <div style={{
                background: Paper,
                borderRadius: RadiusMd,
                border: "0.5px solid "+Gray200,
                boxShadow: ShadowSm,
                padding: "8px 0",
              }}>
                {quickRes.checks.map((c, i) => (
                  <div key={i} style={{
                    padding: "6px 16px",
                    display: "flex", alignItems: "flex-start", gap: 10,
                    borderBottom: i < quickRes.checks.length - 1 ? "0.5px solid "+Gray100 : "none",
                  }}>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: c.ok ? Green : Coral,
                      lineHeight: 1.45,
                      width: 14, flexShrink: 0,
                    }}>{c.ok ? "v" : "x"}</span>
                    <div style={{flex:1, minWidth:0}}>
                      <span style={{
                        fontSize: 12, color: Ink,
                        fontWeight: c.ok ? 400 : 600,
                        fontFamily: Sans,
                        lineHeight: 1.45,
                      }}>{c.cat}: {c.label}</span>
                      {!c.ok && (
                        <div style={{
                          fontSize: 11, color: Gray600,
                          marginTop: 2, fontFamily: Sans,
                          lineHeight: 1.4,
                        }}>{c.tip}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ScorePanel;
