"use client";

// Nuvi v3 - SettingsPanel (refondu palette Nuvi).
//
// Panneau de reglages : lang, dark mode, relance tutoriel, raccourcis clavier.

import { useEffect } from "react";
import {
  Ink, InkMuted, Cream, CreamSoft, Paper, Hairline,
  Coral, Green, GreenSoft, Purple, Magenta, PurpleSoft,
  Gray100, Gray200, Gray400, Gray600,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm,
  GradPurple, B,
} from "./tokens";
import Sheet from "./Sheet";

// Sous-composant : une ligne de raccourci.
function KbdRow({ keys, label }) {
  return (
    <div style={{
      display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"10px 0",
      borderBottom:"0.5px solid "+Hairline,
    }}>
      <span style={{
        fontSize:13, color:Ink, fontFamily:Sans,
      }}>{label}</span>
      <div style={{display:"flex", gap:4}}>
        {keys.map((k, i) => (
          <span key={i} style={{
            padding:"3px 9px", borderRadius:6,
            background:CreamSoft, color:Coral,
            border:"0.5px solid "+Hairline,
            fontSize:11, fontWeight:600,
            fontFamily:"ui-monospace, monospace",
            minWidth:24, textAlign:"center",
          }}>{k}</span>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPanel({
  T, locale, setLocale,
  darkMode, onToggleDark,
  onRelaunchTutorial, onClose,
}) {

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [onClose]);

  // Detect platform pour afficher cmd ou ctrl.
  const isMac = typeof navigator !== "undefined"
    && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const cmdKey = isMac ? "⌘" : "Ctrl";

  return (
    <Sheet
      eyebrow={T.set_eyebrow}
      title={T.set_title}
      onClose={onClose}
    >
      {/* Lang switcher - selected = gradient violet→magenta */}
      <div style={{marginBottom:18}}>
        <label style={{
          display:"block", fontSize:11, fontWeight:600,
          letterSpacing:"0.1em", textTransform:"uppercase",
          color:Coral, marginBottom:8, fontFamily:Sans,
        }}>{T.set_lang}</label>
        <div style={{display:"flex", gap:8}}>
          <button onClick={()=>setLocale("fr")} style={{
            ...B({
              flex:1, padding:"10px 14px", borderRadius:RadiusPill,
              background: locale === "fr"
                ? `linear-gradient(135deg, ${Purple}, ${Magenta})`
                : Paper,
              color: locale === "fr" ? "#fff" : Ink,
              border: "0.5px solid "+(locale === "fr" ? "transparent" : Hairline),
              fontSize:13, fontWeight:500, fontFamily:Sans,
              transition:"all 180ms ease-out",
            })
          }}>Francais</button>
          <button onClick={()=>setLocale("en")} style={{
            ...B({
              flex:1, padding:"10px 14px", borderRadius:RadiusPill,
              background: locale === "en"
                ? `linear-gradient(135deg, ${Purple}, ${Magenta})`
                : Paper,
              color: locale === "en" ? "#fff" : Ink,
              border: "0.5px solid "+(locale === "en" ? "transparent" : Hairline),
              fontSize:13, fontWeight:500, fontFamily:Sans,
              transition:"all 180ms ease-out",
            })
          }}>English</button>
        </div>
      </div>

      {/* Dark mode toggle */}
      <div style={{marginBottom:18}}>
        <button onClick={onToggleDark} style={{
          ...B({
            width:"100%",
            display:"flex", alignItems:"center", gap:14,
            padding:"14px 16px",
            background:Paper,
            border:"0.5px solid "+Hairline,
            borderRadius:RadiusMd,
            boxShadow:ShadowSm,
            textAlign:"left", fontFamily:Sans,
            transition:"all 200ms ease-out",
          })
        }}>
          {/* Icon */}
          <div style={{
            width:36, height:36, borderRadius:10,
            display:"flex", alignItems:"center", justifyContent:"center",
            background: darkMode ? Ink : CreamSoft,
            color: darkMode ? "#fff" : Coral,
            flexShrink:0,
            transition:"all 220ms ease-out",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              {darkMode
                ? <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                : <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M5 5l1.5 1.5M17.5 17.5L19 19M2 12h2M20 12h2M5 19l1.5-1.5M17.5 6.5L19 5"/></>
              }
            </svg>
          </div>

          {/* Text */}
          <div style={{flex:1, minWidth:0}}>
            <div style={{
              fontSize:13, fontWeight:600, color:Ink, marginBottom:2,
            }}>{T.set_dark}</div>
            <div style={{
              fontSize:11, color:InkMuted, lineHeight:1.4,
            }}>{T.set_dark_desc}</div>
          </div>

          {/* Toggle pill - gradient violet→magenta quand actif */}
          <div style={{
            width:42, height:24, borderRadius:12,
            background: darkMode
              ? `linear-gradient(135deg, ${Purple}, ${Magenta})`
              : Hairline,
            position:"relative",
            flexShrink:0,
            transition:"all 220ms ease-out",
          }}>
            <div style={{
              position:"absolute",
              top:2, left: darkMode ? 20 : 2,
              width:20, height:20, borderRadius:"50%",
              background:"#fff",
              transition:"all 220ms ease-out",
              boxShadow:"0 2px 4px rgba(0,0,0,.15)",
            }}/>
          </div>
        </button>
      </div>

      {/* Relancer tutoriel */}
      <div style={{marginBottom:18}}>
        <button onClick={onRelaunchTutorial} style={{
          ...B({
            width:"100%",
            display:"flex", alignItems:"center", gap:14,
            padding:"14px 16px",
            background:Paper,
            border:"0.5px solid "+Hairline,
            borderRadius:RadiusMd,
            boxShadow:ShadowSm,
            textAlign:"left", fontFamily:Sans,
            transition:"all 200ms ease-out",
          })
        }}>
          <div style={{
            width:36, height:36, borderRadius:10,
            display:"flex", alignItems:"center", justifyContent:"center",
            background:PurpleSoft, color:Purple,
            flexShrink:0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{
              fontSize:13, fontWeight:600, color:Ink,
            }}>{T.set_tutorial}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={Gray400} strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      {/* Raccourcis clavier - eyebrow Coral */}
      <div style={{marginBottom:18}}>
        <div style={{
          fontSize:11, fontWeight:600,
          letterSpacing:"0.1em", textTransform:"uppercase",
          color:Coral, marginBottom:10, fontFamily:Sans,
        }}>{T.set_kbd}</div>
        <div style={{
          padding:"4px 14px",
          background:Paper, borderRadius:RadiusMd,
          border:"0.5px solid "+Hairline,
        }}>
          <KbdRow keys={[cmdKey, "S"]} label={T.set_kbd_save}/>
          <KbdRow keys={[cmdKey, "K"]} label={T.set_kbd_coach}/>
          <KbdRow keys={[cmdKey, ","]} label={T.set_kbd_settings}/>
          <KbdRow keys={["Esc"]}        label={T.set_kbd_esc}/>
        </div>
      </div>
    </Sheet>
  );
}
