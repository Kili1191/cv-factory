"use client";

// CV Factory v17 - EditSheets
//
// Les 4 modals d'edition pour les sections du CV :
//   SheetId   : identite (nom, titre, email, phone, location, linkedin, accroche)
//   SheetEx   : experiences (liste d'expe avec bullets + add/delete)
//   SheetEd   : formations
//   SheetSk   : competences + langues + certifications
//
// Tous utilisent la primitive Sheet (./Sheet) et les helpers (./EditHelpers).
// Conserves en style legacy (pour rester coherent avec la fenetre d'edition
// au-dessus du CV qui n'a pas ete moderniseе v17).
//
// Props communes :
//   cv      : objet CV (etat)
//   set     : setter du CV (useState setter)
//   onClose : ferme le modal
//   T       : i18n
//
// SheetId props specifiques :
//   onTransformSummary(summary) : ouvre le BulletTransformer en mode summary
//
// SheetEx props specifiques :
//   onTransformBullet(expId, bulletIdx, text) : ouvre le BulletTransformer en mode bullet

import {
  Gold, Dark,
  Sans, IN, LBL, SH, B,
} from "./tokens";
import Sheet from "./Sheet";
import { FR, SaveBtn, MK } from "./EditHelpers";

// ============================================================
// SheetId : Edition de l'identite
// ============================================================
export function SheetId({ cv, set, onClose, onTransformSummary, T }) {
  const { u } = MK(set);
  const summaryEmpty = !cv.summary || !cv.summary.trim();

  return (
    <Sheet title={T.edit_id} onClose={onClose}>
      <FR label={T.sh_name}  value={cv.name}     onChange={u("name")}/>
      <FR label={T.sh_title} value={cv.title}    onChange={u("title")}/>
      <FR label={T.sh_email} value={cv.email}    onChange={u("email")}/>
      <FR label={T.sh_phone} value={cv.phone}    onChange={u("phone")}/>
      <FR label={T.sh_loc}   value={cv.location} onChange={u("location")}/>
      <FR label={T.sh_li}    value={cv.linkedin} onChange={u("linkedin")}/>
      {/* Summary avec bouton transformer en inline */}
      <div style={{marginBottom:12}}>
        <div style={{
          display:"flex", justifyContent:"space-between", alignItems:"center",
          marginBottom:6,
        }}>
          <label style={LBL}>{T.sh_sum}</label>
          {onTransformSummary && (
            <button
              onClick={()=>onTransformSummary(cv.summary || "")}
              disabled={summaryEmpty}
              title={T.bts_btn || "Transformer l'accroche"}
              style={{
                ...B({
                  display:"inline-flex", alignItems:"center", gap:5,
                  padding:"5px 10px", borderRadius:999,
                  background: summaryEmpty
                    ? "#f0ede5"
                    : "linear-gradient(135deg,#5b3df5,#b91c8c)",
                  color: summaryEmpty ? "#999" : "#fff",
                  fontSize:11, fontWeight:600,
                  fontFamily:"'Inter',sans-serif",
                  letterSpacing:"0.02em",
                  opacity: summaryEmpty ? 0.6 : 1,
                  cursor: summaryEmpty ? "not-allowed" : "pointer",
                })
              }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>
                <circle cx="12" cy="12" r="2.5"/>
              </svg>
              {T.bts_btn || "Transformer"}
            </button>
          )}
        </div>
        <textarea
          value={cv.summary || ""}
          onChange={e=>u("summary")(e.target.value)}
          rows={3}
          style={{...IN(), resize:"vertical"}}
        />
      </div>
      <SaveBtn onClose={onClose} T={T}/>
    </Sheet>
  );
}

// ============================================================
// SheetEx : Edition des experiences
// ============================================================
export function SheetEx({ cv, set, onClose, onTransformBullet, T }) {
  const { ux, ub } = MK(set);

  const ax = () => set(p => ({...p,
    experience:[...p.experience, {
      id: Date.now(), title:"", company:"", period:"", location:"", bullets:[""]
    }]
  }));
  const dx = id => set(p => ({...p,
    experience: p.experience.filter(e => e.id !== id)
  }));
  const ab = id => set(p => ({...p,
    experience: p.experience.map(e => e.id === id
      ? {...e, bullets:[...e.bullets, ""]}
      : e)
  }));
  const db = (id, i) => set(p => ({...p,
    experience: p.experience.map(e => e.id === id
      ? {...e, bullets: e.bullets.filter((_, j) => j !== i)}
      : e)
  }));

  return (
    <Sheet title={T.edit_ex} onClose={onClose}>
      {cv.experience.map((ex, i) => (
        <div key={ex.id} style={{
          background:"#f8f6f1", borderRadius:10, padding:14, marginBottom:14,
        }}>
          <div style={{
            display:"flex", justifyContent:"space-between", marginBottom:10,
          }}>
            <b style={{fontSize:13}}>{T.sh_et} {i+1}</b>
            <button onClick={()=>dx(ex.id)} style={{
              ...B({
                background:"#fee2e2", borderRadius:7,
                padding:"4px 10px", fontSize:12, color:"#dc2626", fontWeight:600,
              })
            }}>{T.sh_del}</button>
          </div>
          <FR label={T.sh_et}   value={ex.title}    onChange={v=>ux(ex.id,"title",v)}/>
          <FR label={T.sh_ec}   value={ex.company}  onChange={v=>ux(ex.id,"company",v)}/>
          <FR label={T.sh_ep}   value={ex.period}   onChange={v=>ux(ex.id,"period",v)}/>
          <FR label={T.sh_ey}   value={ex.location} onChange={v=>ux(ex.id,"location",v)}/>
          <label style={LBL}>{T.sh_eb}</label>
          {ex.bullets.map((b, j) => (
            <div key={j} style={{
              display:"flex", gap:6, marginBottom:6, alignItems:"center",
            }}>
              <span style={{color:Gold}}>|</span>
              <input value={b} onChange={e=>ub(ex.id, j, e.target.value)}
                style={{...IN({padding:"7px 9px", fontSize:12, flex:1})}}/>
              <button
                onClick={()=>onTransformBullet(ex.id, j, b)}
                style={{
                  ...B({
                    background:"#fff9f0",
                    border:"1px solid "+Gold+"44",
                    borderRadius:5, padding:"4px 7px",
                    fontSize:11, color:Gold, flexShrink:0,
                  })
                }}
                title={T.bt_btn_title || "Transformer ce bullet"}>
                *
              </button>
              <button onClick={()=>db(ex.id, j)} style={{
                ...B({
                  color:"#e74c3c", fontSize:20, lineHeight:1,
                  padding:0, background:"none", flexShrink:0,
                })
              }}>x</button>
            </div>
          ))}
          <button onClick={()=>ab(ex.id)} style={{
            ...B({
              fontSize:12, color:Gold, background:"none",
              border:"1px dashed "+Gold, borderRadius:5,
              padding:"4px 10px", marginTop:3,
            })
          }}>{T.sh_addl}</button>
        </div>
      ))}
      <button onClick={ax} style={{
        ...B({
          width:"100%", padding:12, borderRadius:10,
          border:"2px dashed "+Gold, background:"#fff9f0",
          color:Gold, fontWeight:700, fontSize:13, marginBottom:10,
        })
      }}>{T.sh_addex}</button>
      <SaveBtn onClose={onClose} T={T}/>
    </Sheet>
  );
}

// ============================================================
// SheetEd : Edition des formations
// ============================================================
export function SheetEd({ cv, set, onClose, T }) {
  const { ue } = MK(set);

  const ae = () => set(p => ({...p,
    education:[...p.education, {id: Date.now(), degree:"", school:"", period:""}]
  }));
  const de = id => set(p => ({...p,
    education: p.education.filter(e => e.id !== id)
  }));

  return (
    <Sheet title={T.edit_ed} onClose={onClose}>
      {cv.education.map((ed, i) => (
        <div key={ed.id} style={{
          background:"#f8f6f1", borderRadius:10, padding:14, marginBottom:14,
        }}>
          <div style={{
            display:"flex", justifyContent:"space-between", marginBottom:10,
          }}>
            <b style={{fontSize:13}}>{T.sh_edd} {i+1}</b>
            <button onClick={()=>de(ed.id)} style={{
              ...B({
                background:"#fee2e2", borderRadius:7,
                padding:"4px 10px", fontSize:12, color:"#dc2626", fontWeight:600,
              })
            }}>{T.sh_del}</button>
          </div>
          <FR label={T.sh_edd} value={ed.degree} onChange={v=>ue(ed.id,"degree",v)}/>
          <FR label={T.sh_eds} value={ed.school} onChange={v=>ue(ed.id,"school",v)}/>
          <FR label={T.sh_ep}  value={ed.period} onChange={v=>ue(ed.id,"period",v)}/>
        </div>
      ))}
      <button onClick={ae} style={{
        ...B({
          width:"100%", padding:12, borderRadius:10,
          border:"2px dashed "+Gold, background:"#fff9f0",
          color:Gold, fontWeight:700, fontSize:13, marginBottom:10,
        })
      }}>{T.sh_added}</button>
      <SaveBtn onClose={onClose} T={T}/>
    </Sheet>
  );
}

// ============================================================
// SheetSk : Edition des competences + langues + certifications
// ============================================================
export function SheetSk({ cv, set, onClose, T }) {
  const { us, ul, uc } = MK(set);

  const as = () => set(p => ({...p, skills:[...p.skills, ""]}));
  const ds = i => set(p => ({...p, skills: p.skills.filter((_, j) => j !== i)}));
  const al = () => set(p => ({...p,
    languages:[...p.languages, {lang:"", level:""}]
  }));
  const dl = i => set(p => ({...p,
    languages: p.languages.filter((_, j) => j !== i)
  }));
  const ac = () => set(p => ({...p, certifications:[...p.certifications, ""]}));
  const dc = i => set(p => ({...p,
    certifications: p.certifications.filter((_, j) => j !== i)
  }));

  // Petits helpers locaux pour les boutons add/delete
  const X = ({fn}) => (
    <button onClick={fn} style={{
      ...B({
        color:"#e74c3c", fontSize:20, lineHeight:1,
        padding:0, background:"none", flexShrink:0,
      })
    }}>x</button>
  );
  const Plus = ({fn, label}) => (
    <button onClick={fn} style={{
      ...B({
        fontSize:12, color:Gold, background:"none",
        border:"1px dashed "+Gold, borderRadius:5,
        padding:"4px 10px", marginBottom:4,
      })
    }}>{label}</button>
  );

  return (
    <Sheet title={T.edit_sk} onClose={onClose}>
      <div style={SH()}>{T.sh_sk}</div>
      {cv.skills.map((s, i) => (
        <div key={i} style={{
          display:"flex", gap:7, marginBottom:7, alignItems:"center",
        }}>
          <input value={s} onChange={e=>us(i, e.target.value)} style={IN()}/>
          <X fn={()=>ds(i)}/>
        </div>
      ))}
      <Plus fn={as} label={T.sh_addsk}/>
      <div style={SH()}>{T.sh_lg}</div>
      {cv.languages.map((l, i) => (
        <div key={i} style={{
          display:"flex", gap:7, marginBottom:7, alignItems:"center",
        }}>
          <input value={l.lang} placeholder={T.sh_lph1}
            onChange={e=>ul(i, "lang", e.target.value)}
            style={{...IN({flex:1})}}/>
          <input value={l.level} placeholder={T.sh_lph2}
            onChange={e=>ul(i, "level", e.target.value)}
            style={{...IN({flex:1})}}/>
          <X fn={()=>dl(i)}/>
        </div>
      ))}
      <Plus fn={al} label={T.sh_addlg}/>
      <div style={SH()}>{T.sh_ct}</div>
      {cv.certifications.map((c, i) => (
        <div key={i} style={{
          display:"flex", gap:7, marginBottom:7, alignItems:"center",
        }}>
          <input value={c} onChange={e=>uc(i, e.target.value)} style={IN()}/>
          <X fn={()=>dc(i)}/>
        </div>
      ))}
      <Plus fn={ac} label={T.sh_addct}/>
      <div style={{marginTop:10}}>
        <SaveBtn onClose={onClose} T={T}/>
      </div>
    </Sheet>
  );
}
