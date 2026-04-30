"use client";

// CV Factory v17 - VersionsModal (extracted + modernized v17).
//
// Affiche la liste des versions de CV sauvegardees + permet d'en sauvegarder
// une nouvelle, de charger ou supprimer une existante.
//
// Props :
//   T         : i18n
//   versions  : [{ id, name, created, cv: {...} }]
//   onSave()  : sauvegarde la version actuelle (handler page.jsx)
//   onLoad(id): charge une version
//   onDelete(id): supprime une version
//   onClose()

import {
  Ink, Cream, CreamSoft, Paper, Gold, GoldDeep,
  Coral, CoralSoft, Green, GreenSoft,
  Gray100, Gray200, Gray400, Gray600,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm,
  GradDark, B,
} from "./tokens";
import Sheet from "./Sheet";

export default function VersionsModal({ T, versions, onSave, onLoad, onDelete, onClose }) {
  return (
    <Sheet
      eyebrow={T.vs_eyebrow}
      title={
        <>
          {T.vs_title_a}{" "}
          <em style={{
            fontFamily:Serif, fontStyle:"italic", color:Gold,
          }}>{T.vs_title_em}</em>
          {T.vs_title_b}
        </>
      }
      onClose={onClose}
    >
      <p style={{
        fontSize:13, color:Gray600, lineHeight:1.5,
        margin:"0 0 18px", fontFamily:Sans,
      }}>{T.vs_sub}</p>

      {/* CTA Save */}
      <button onClick={onSave} style={{
        ...B({
          width:"100%", padding:"15px 22px", borderRadius:RadiusPill,
          background:GradDark, color:Cream,
          fontFamily:Sans, fontWeight:600, fontSize:14,
          display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
          marginBottom:18,
          transition:"all 200ms ease-out",
        })
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
        {T.vs_save}
      </button>

      {/* Liste vide */}
      {(!versions || versions.length === 0) && (
        <div style={{
          padding:"32px 18px",
          background:CreamSoft, borderRadius:RadiusMd,
          border:"0.5px solid "+Gray200,
          textAlign:"center",
        }}>
          <div style={{
            fontFamily:Serif, fontSize:16, fontWeight:500,
            color:Ink, letterSpacing:"-0.01em", marginBottom:6,
          }}>{T.vs_empty_title}</div>
          <div style={{
            fontSize:12, color:Gray600, lineHeight:1.5,
          }}>{T.vs_empty_sub}</div>
        </div>
      )}

      {/* Liste */}
      {versions && versions.length > 0 && (
        <>
          <div style={{
            fontSize:11, fontWeight:600,
            letterSpacing:"0.1em", textTransform:"uppercase",
            color:GoldDeep, marginBottom:10,
            fontFamily:Sans,
          }}>{versions.length} {T.vs_count}</div>

          {versions.map(v => (
            <div key={v.id} style={{
              padding:"14px 16px",
              background:Paper, borderRadius:RadiusMd,
              border:"0.5px solid "+Gray200, boxShadow:ShadowSm,
              marginBottom:10, fontFamily:Sans,
            }}>
              {/* Meta */}
              <div style={{marginBottom:10}}>
                <div style={{
                  fontFamily:Serif, fontSize:15, fontWeight:500,
                  color:Ink, letterSpacing:"-0.01em", lineHeight:1.3,
                  marginBottom:3,
                }}>{v.name || "?"}</div>
                {(v.cv && (v.cv.title || v.cv.name)) && (
                  <div style={{
                    fontSize:12, color:Gray600, lineHeight:1.4,
                  }}>
                    {v.cv.title || ""}
                    {v.cv.title && v.cv.name ? " - " : ""}
                    {v.cv.name || ""}
                  </div>
                )}
                {v.created && (
                  <div style={{
                    fontSize:10, color:Gray400, marginTop:2,
                    fontFamily:Sans,
                  }}>
                    {new Date(v.created).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{display:"flex", gap:8}}>
                <button onClick={()=>onLoad(v.id)} style={{
                  ...B({
                    flex:1, padding:"9px 14px", borderRadius:RadiusPill,
                    background:Ink, color:Cream,
                    fontSize:11, fontWeight:600, fontFamily:Sans,
                    letterSpacing:"0.02em",
                    display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6,
                  })
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>
                  </svg>
                  {T.vs_load}
                </button>
                <button onClick={()=>onDelete(v.id)} style={{
                  ...B({
                    padding:"9px 14px", borderRadius:RadiusPill,
                    background:CoralSoft, color:Coral,
                    border:"0.5px solid "+Coral,
                    fontSize:11, fontWeight:600, fontFamily:Sans,
                  })
                }}>{T.vs_delete}</button>
              </div>
            </div>
          ))}
        </>
      )}
    </Sheet>
  );
}
