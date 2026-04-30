"use client";

// CV Factory v17 - Sheet primitive (IOSSheet style).
// Extracted from page.jsx to be reusable across all v17 modals.
//
// Props :
//   title    : string OR JSX (le titre principal en Fraunces)
//   eyebrow  : string optionnel (eyebrow gold-deep au-dessus du titre)
//   onClose  : callback quand l'utilisateur ferme la sheet
//   children : contenu scrollable

import {
  Ink, Cream, CreamSoft, Paper, Gold, GoldDeep,
  Gray200, Gray600,
  Serif, Sans, RadiusPill, B,
  KEYFRAMES_V17,
} from "./tokens";

export default function Sheet({ title, eyebrow, onClose, children }) {
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:2000,
      display:"flex", flexDirection:"column", justifyContent:"flex-end",
      fontFamily:Sans,
    }}>
      <div style={{
        position:"absolute", inset:0,
        background:"rgba(10,10,10,.55)",
        backdropFilter:"blur(8px)",
        WebkitBackdropFilter:"blur(8px)",
        animation:"cvfFadeIn 200ms ease-out",
      }} onClick={onClose}/>
      <div style={{
        position:"relative", background:CreamSoft,
        borderRadius:"32px 32px 0 0",
        maxHeight:"92vh", display:"flex", flexDirection:"column",
        boxShadow:"0 -20px 60px rgba(0,0,0,.2)",
        animation:"cvfSlideUp 280ms cubic-bezier(.32,.72,0,1)",
        width:"100%", maxWidth:840,
        marginLeft:"auto", marginRight:"auto",
      }}>
        {/* Handle iOS */}
        <div style={{
          width:40, height:4, background:Gray200,
          borderRadius:RadiusPill,
          margin:"10px auto 6px",
          flexShrink:0,
        }}/>
        {/* Header editorial */}
        <div style={{
          padding:"6px 24px 14px",
          borderBottom:"0.5px solid "+Gray200,
          flexShrink:0,
          display:"flex", alignItems:"flex-start",
          justifyContent:"space-between", gap:12,
        }}>
          <div style={{flex:1, minWidth:0}}>
            {eyebrow && (
              <div style={{
                fontSize:11, fontWeight:600,
                letterSpacing:"0.12em", textTransform:"uppercase",
                color:GoldDeep, marginBottom:4,
              }}>{eyebrow}</div>
            )}
            <div style={{
              fontFamily:Serif, fontWeight:400, fontSize:22,
              letterSpacing:"-0.02em", color:Ink, lineHeight:1.15,
            }}>{title}</div>
          </div>
          <button onClick={onClose} aria-label="close" style={{
            ...B({
              background:Paper, borderRadius:RadiusPill,
              width:32, height:32, fontSize:16, color:Gray600,
              border:"0.5px solid "+Gray200,
              display:"flex", alignItems:"center", justifyContent:"center",
              flexShrink:0,
            })
          }}>x</button>
        </div>
        <div style={{
          overflowY:"auto",
          padding:"18px 24px 48px",
          flex:1,
        }}>
          {children}
        </div>
      </div>
      <style>{KEYFRAMES_V17}</style>
    </div>
  );
}
