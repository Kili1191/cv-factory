"use client";

// Nuvi - OnboardScreen
// Extrait de page.jsx pour permettre le lazy loading.
// [Nuvi rebrand] Couleurs alignees : terracotta (Coral #d97757) + violet/magenta gradient pour CTA primaires.

import {
  Coral, CoralSoft, Cream, CreamSoft, Gold, GoldDeep, GradCoral, GradDark,
  GradGold, GradPurple, Gray200, Gray400, Gray600, Ink, Paper, RadiusMd,
  RadiusPill, RadiusSm, Sans, Serif, ShadowSm, B,
} from "./sharedTokens";

function OnboardScreen({ T, locale, setLocale, apiKey, mode, setMode,
  raw, setRaw, imping, onImport, setTab, setAiMode }) {

  // [Nuvi] Style accent par mode :
  //  - mode "import" simple   : terracotta (Coral)
  //  - mode "import-adapt"    : violet (gradient purple/magenta)
  // Le bouton CTA primaire utilise systematiquement le gradient violet/magenta (signature Nuvi).
  const accent     = mode === "import-adapt" ? Coral     : Coral;
  const accentSoft = mode === "import-adapt" ? CoralSoft : CoralSoft;
  const accentGrad = mode === "import-adapt" ? GradPurple : GradPurple;

  // === Ecran de choix initial ===
  if (!mode) {
    const cards = [
      {
        key:"have", grad:GradCoral,  // [Nuvi] terracotta pour "j'ai deja un CV" (action principale)
        title:T.ob_card_have, desc:T.ob_card_have_desc,
        icon:(<svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v6"/><path d="m9 5 3-3 3 3"/>
          <rect x="4" y="8" width="16" height="14" rx="2"/>
        </svg>),
        onClick:()=>setMode("import"),
      },
      {
        key:"adapt", grad:GradPurple,  // [Nuvi] violet pour "j'adapte a une offre" (Nuvi)
        title:T.ob_card_adapt, desc:T.ob_card_adapt_desc,
        icon:(<svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="6"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>),
        onClick:()=>setMode("import-adapt"),
      },
      {
        key:"create", grad:GradPurple,  // [Nuvi] violet pour "creation Nuvi"
        title:T.ob_card_create, desc:T.ob_card_create_desc,
        icon:(<svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="m4.93 4.93 4.24 4.24"/>
          <path d="m14.83 9.17 4.24-4.24"/>
          <path d="m14.83 14.83 4.24 4.24"/>
          <path d="m9.17 14.83-4.24 4.24"/>
          <circle cx="12" cy="12" r="4"/>
        </svg>),
        onClick:()=>{ setMode("done"); setTab("ai"); setAiMode("generate"); },
      },
      {
        key:"blank", grad:"linear-gradient(135deg,#0a0a0a,#1a1a1f)",
        iconColor:Coral,  // [Nuvi] icone terracotta sur fond noir (etait Gold)
        title:T.ob_card_blank, desc:T.ob_blank_desc,
        icon:(<svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6"/>
        </svg>),
        onClick:()=>setMode("done"),
      },
    ];
    return (
      <div style={{
        position:"fixed", inset:0, zIndex:500,
        background:CreamSoft,
        overflowY:"auto",
        fontFamily:Sans,
      }}>
        <div style={{
          maxWidth:480, margin:"0 auto",
          padding:"28px 24px 40px",
          minHeight:"100%",
          display:"flex", flexDirection:"column",
        }}>
          {/* Brand Nuvi (etait "CV Factory") */}
          <div style={{
            display:"flex", alignItems:"center", gap:10, marginBottom:48,
          }}>
            <div style={{
              width:36, height:36, background:GradPurple,  // [Nuvi] gradient violet pour le mark
              borderRadius:10, display:"flex",
              alignItems:"center", justifyContent:"center",
              color:"#fff", fontFamily:Serif, fontWeight:600, fontSize:16,
              letterSpacing:"-0.02em",
            }}>N</div>
            <div style={{
              fontFamily:Serif, fontWeight:500, fontSize:20,
              letterSpacing:"-0.01em", color:Ink,
            }}>Nuvi</div>
          </div>
          {/* Hero editorial */}
          <h1 style={{
            fontFamily:Serif, fontWeight:300,
            fontSize:42, lineHeight:1.05,
            letterSpacing:"-0.025em",
            color:Ink, margin:"0 0 18px",
          }}>
            {T.hero_h1_a}
            {" "}
            <em style={{
              fontStyle:"italic", fontWeight:400,
              background:GradPurple,
              WebkitBackgroundClip:"text",
              backgroundClip:"text",
              color:"transparent",
            }}>{T.hero_h1_em}</em>
            {" "}
            {T.hero_h1_b}
          </h1>
          <p style={{
            fontSize:15, lineHeight:1.55,
            color:Gray600, margin:"0 0 32px",
            maxWidth:"94%",
          }}>{T.hero_sub}</p>

          {/* Eyebrow [Nuvi] : terracotta au lieu de GoldDeep */}
          <div style={{
            fontSize:11, fontWeight:600,
            letterSpacing:"0.12em", textTransform:"uppercase",
            color:Coral, marginBottom:12,
          }}>{T.ob_choose}</div>

          {/* Cartes CTA */}
          <div style={{
            display:"flex", flexDirection:"column", gap:12,
          }}>
            {cards.map(c => (
              <button key={c.key} onClick={c.onClick} style={{
                ...B({
                  background:Paper,
                  borderRadius:RadiusMd,
                  padding:"18px 20px",
                  display:"flex", alignItems:"center", gap:14,
                  boxShadow:ShadowSm,
                  border:"0.5px solid "+Gray200,
                  textAlign:"left",
                  transition:"all 200ms ease-out",
                  width:"100%",
                })
              }}>
                <div style={{
                  width:48, height:48,
                  borderRadius:14,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background:c.grad,
                  color:c.iconColor || "#fff",
                  flexShrink:0,
                }}>{c.icon}</div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{
                    fontFamily:Serif, fontWeight:500, fontSize:16,
                    letterSpacing:"-0.01em", color:Ink, marginBottom:2,
                  }}>{c.title}</div>
                  <div style={{
                    fontSize:12, color:Gray600,
                    lineHeight:1.4,
                  }}>{c.desc}</div>
                </div>
                <span style={{color:Gray400, flexShrink:0}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </span>
              </button>
            ))}
          </div>

          {/* Locale pills */}
          <div style={{
            display:"flex", justifyContent:"center", gap:8,
            padding:"32px 0 8px",
          }}>
            {[["fr","FR"],["en","EN"]].map(([lc,label]) => (
              <button key={lc} onClick={()=>setLocale(lc)} style={{
                ...B({
                  padding:"6px 14px", borderRadius:RadiusPill,
                  fontSize:12, fontWeight:500,
                  color:locale===lc ? Cream : Gray600,
                  background:locale===lc ? Ink : Paper,
                  border:"0.5px solid "+(locale===lc ? Ink : Gray200),
                })
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // === Ecran d'import (mode "import" ou "import-adapt") ===
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:500,
      background:CreamSoft,
      overflowY:"auto",
      fontFamily:Sans,
    }}>
      <div style={{
        maxWidth:520, margin:"0 auto",
        padding:"24px 24px 40px",
        minHeight:"100%",
        display:"flex", flexDirection:"column",
      }}>
        {/* Bouton retour */}
        <button onClick={()=>setMode(null)} style={{
          ...B({
            background:"none", color:Gray600, fontSize:13,
            fontFamily:Sans, fontWeight:500,
            textAlign:"left", padding:"4px 0", marginBottom:14,
            display:"inline-flex", alignItems:"center", gap:6,
          })
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          {T.back}
        </button>

        {/* Steps bar editoriale */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"center",
          gap:8, marginBottom:22, fontSize:11,
          fontWeight:600, letterSpacing:"0.04em",
        }}>
          <span style={{color:accent}}>1. {T.ob_step_import}</span>
          <span style={{color:Gray400}}>{">"}</span>
          <span style={{color:Gray600}}>
            2. {mode==="import-adapt" ? T.ob_step_paste_offer : T.ob_step_boost}
          </span>
          <span style={{color:Gray400}}>{">"}</span>
          <span style={{color:Gray600}}>
            3. {mode==="import-adapt" ? T.ob_step_adapt : T.ob_step_download}
          </span>
        </div>

        {/* Hero editorial */}
        <h2 style={{
          fontFamily:Serif, fontWeight:400,
          fontSize:32, lineHeight:1.1,
          letterSpacing:"-0.02em", color:Ink,
          textAlign:"center", margin:"0 0 10px",
        }}>{mode==="import-adapt" ? T.ob_import_first : T.ob_import_title}</h2>
        <p style={{
          fontSize:13, color:Gray600, lineHeight:1.6,
          textAlign:"center", margin:"0 0 24px",
        }}>
          {mode==="import-adapt" ? T.ob_import_sub_adapt : T.ob_import_sub_boost}
          {" "}{T.ob_import_format}
        </p>

        {/* Hidden file input */}
        <input
          type="file"
          id="cv-file-upload"
          accept=".pdf,.docx,.txt"
          style={{display:"none"}}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const ext = file.name.split('.').pop().toLowerCase();
              if (ext === 'txt') {
                const text = await file.text();
                setRaw(text);
              } else if (ext === 'pdf') {
                const pdfjsLib = await import('pdfjs-dist/build/pdf');
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                  const page = await pdf.getPage(i);
                  const textContent = await page.getTextContent();
                  const pageText = textContent.items.map(item => item.str).join(' ');
                  fullText += pageText + '\n\n';
                }
                setRaw(fullText.trim());
              } else if (ext === 'docx') {
                const mammoth = await import('mammoth/mammoth.browser');
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({arrayBuffer});
                setRaw(result.value);
              } else {
                alert(T.ob_file_format_err);
              }
            } catch (err) {
              alert(T.ob_file_read_err + ': ' + err.message);
            }
            e.target.value = '';
          }}
        />

        {/* Big upload card (paper, dashed accent terracotta) */}
        <button
          onClick={() => document.getElementById('cv-file-upload').click()}
          style={{
            ...B({
              padding:"26px 18px",
              borderRadius:RadiusMd,
              background:Paper,
              border:"1.5px dashed "+accent,
              color:accent,
              fontWeight:600, fontSize:14,
              display:"flex", flexDirection:"column",
              alignItems:"center", gap:10,
              fontFamily:Sans,
              boxShadow:ShadowSm,
              transition:"all 200ms ease-out",
            })
          }}
        >
          <div style={{
            width:48, height:48, borderRadius:14,
            background:accentGrad, color:"#fff",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div style={{
            fontFamily:Serif, fontWeight:500, fontSize:16,
            letterSpacing:"-0.01em", color:Ink,
          }}>{T.ob_pick_file}</div>
          <div style={{
            fontSize:11, color:Gray600, fontWeight:400,
          }}>{T.ob_pick_file_hint}</div>
        </button>

        {/* Separator */}
        <div style={{
          textAlign:"center",
          color:Gray400,
          fontSize:11,
          letterSpacing:"0.08em",
          textTransform:"uppercase",
          margin:"18px 0 12px",
          fontWeight:500,
        }}>{T.ob_or_paste}</div>

        {/* Paste textarea label [Nuvi] : terracotta au lieu de GoldDeep */}
        <label style={{
          fontSize:11, fontWeight:600,
          letterSpacing:"0.1em", textTransform:"uppercase",
          color:Coral, marginBottom:8, display:"block",
        }}>{T.ob_paste_label}</label>
        <textarea value={raw} onChange={e=>setRaw(e.target.value)}
          placeholder={T.ob_paste_ph}
          rows={8}
          style={{
            width:"100%",
            padding:"14px 16px",
            borderRadius:RadiusMd,
            border:"0.5px solid "+Gray200,
            background:Paper,
            color:Ink, fontSize:13, lineHeight:1.6,
            resize:"vertical",
            fontFamily:Sans,
            outline:"none",
            boxShadow:ShadowSm,
            boxSizing:"border-box",
          }}/>

        {/* API key warning */}
        {!apiKey && (
          <div style={{
            background:CoralSoft,
            border:"0.5px solid "+Coral,
            borderRadius:RadiusSm,
            padding:"10px 14px",
            fontSize:12, color:Ink,
            marginTop:12, lineHeight:1.5,
          }}>{T.ob_no_key}</div>
        )}

        {/* Submit button [Nuvi] : gradient violet/magenta (CTA primaire) */}
        <button onClick={onImport} disabled={imping||!raw.trim()||!apiKey} style={{
          ...B({
            padding:"15px 22px",
            borderRadius:RadiusPill,
            background:imping||!raw.trim()||!apiKey
              ? Gray200
              : GradPurple,
            color:imping||!raw.trim()||!apiKey ? Gray600 : "#fff",
            fontWeight:600, fontSize:14,
            fontFamily:Sans,
            marginTop:14,
            transition:"all 200ms ease-out",
            display:"inline-flex",
            alignItems:"center", justifyContent:"center", gap:8,
            boxShadow: imping||!raw.trim()||!apiKey
              ? "none"
              : "0 4px 16px rgba(91, 61, 245, 0.25)",
          })
        }}>
          {imping ? T.ob_parsing : (mode==="import-adapt" ? T.ob_continue_adapt : T.ob_parse)}
          {!imping && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          )}
        </button>

        {/* Continue without key (only when key missing) */}
        {!apiKey && (
          <button onClick={()=>setMode("done")} style={{
            ...B({
              padding:"10px 22px", borderRadius:RadiusPill,
              background:"transparent",
              color:Gray600, fontSize:12,
              marginTop:8,
            })
          }}>{T.ob_continue}</button>
        )}

        {/* Locale pills */}
        <div style={{
          display:"flex", justifyContent:"center", gap:8,
          padding:"24px 0 8px",
        }}>
          {[["fr","FR"],["en","EN"]].map(([lc,label]) => (
            <button key={lc} onClick={()=>setLocale(lc)} style={{
              ...B({
                padding:"6px 14px", borderRadius:RadiusPill,
                fontSize:12, fontWeight:500,
                color:locale===lc ? Cream : Gray600,
                background:locale===lc ? Ink : Paper,
                border:"0.5px solid "+(locale===lc ? Ink : Gray200),
              })
            }}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default OnboardScreen;
