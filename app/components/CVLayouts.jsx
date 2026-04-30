"use client";

// CV Factory v17 - CVLayouts
//
// Les 2 layouts de CV implementes :
//
//   CVSidebar : layout sidebar/classic. Une colonne de gauche en couleur sombre
//               avec contact + skills + langues + certifs ; une colonne de droite
//               blanche avec name/title + summary + experiences + formations.
//               Utilise pour layout==="sidebar" et layout==="classic".
//
//   CVAts     : layout ATS-Safe. Sobre, mono-colonne, Arial, sans deco.
//               Optimisate pour les robots de tracking (ATS).
//
// Tous les champs sont editables inline via le composant E (click-to-edit).
//
// Props communes :
//   cv  : objet CV
//   set : setter useState pour mettre a jour cv
//   T   : i18n (T.cv_ct, T.cv_s, T.cv_l, T.cv_p, T.cv_e, T.cv_ed, T.cv_c, T.cv_el)
//
// CVSidebar prop specifique :
//   t : theme effectif (couleurs et fonts) avec t.ac, t.bg, t.sb, t.st,
//       t.pr, t.hf, t.bf

import { E, MK } from "./EditHelpers";

// ============================================================
// CVSidebar : layout sidebar/classic
// ============================================================
export function CVSidebar({ cv, set, t, T }) {
  const { u, ux, ub, ue, us, ul, uc } = MK(set);

  // SS (sidebar section header) : petit titre dans la colonne sidebar.
  const SS = l => (
    <div style={{
      fontSize:8, fontWeight:700, letterSpacing:3, textTransform:"uppercase",
      color: t.ac, margin:"14px 0 7px",
      borderBottom:"1px solid "+t.ac+"44", paddingBottom:3,
    }}>{l}</div>
  );

  // MS (main section header) : titre dans la colonne principale.
  const MS = l => (
    <div style={{
      fontSize:9, fontWeight:700, letterSpacing:2.5, textTransform:"uppercase",
      color: t.ac, margin:"16px 0 9px",
      borderBottom:"2px solid "+t.ac, paddingBottom:3,
    }}>{l}</div>
  );

  return (
    <div style={{
      display:"flex", minHeight:"100%",
      fontFamily: t.bf, background: t.bg,
    }}>
      {/* Colonne sidebar */}
      <div style={{
        width:185, background: t.sb, color: t.st,
        padding:"22px 15px", flexShrink:0, minHeight:"100%",
      }}>
        {/* Avatar (initiale) */}
        <div style={{
          width:52, height:52, borderRadius:"50%",
          background: t.ac + "33", border:"2px solid "+t.ac,
          margin:"0 auto 12px",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:19, fontFamily: t.hf, fontWeight:700, color: t.ac,
        }}>{cv.name ? cv.name.charAt(0) : "?"}</div>

        {SS(T.cv_ct)}
        {["email","phone","location","linkedin"].map(f => (
          <div key={f} style={{marginBottom:4}}>
            <E value={cv[f]} onChange={u(f)}
              style={{color: t.st, fontSize:9, lineHeight:1.5}}/>
          </div>
        ))}

        {SS(T.cv_s)}
        {cv.skills.map((s, i) => (
          <div key={i} style={{
            display:"flex", gap:4, marginBottom:3, alignItems:"flex-start",
          }}>
            <span style={{color: t.ac, fontSize:8, flexShrink:0, marginTop:2}}>|</span>
            <E value={s} onChange={v=>us(i, v)}
              style={{color: t.st, fontSize:9}}/>
          </div>
        ))}

        {SS(T.cv_l)}
        {cv.languages.map((l, i) => (
          <div key={i} style={{marginBottom:4}}>
            <E value={l.lang} onChange={v=>ul(i, "lang", v)}
              style={{color: t.st, fontWeight:600, fontSize:9, display:"block"}}/>
            <E value={l.level} onChange={v=>ul(i, "level", v)}
              style={{color: t.st + "88", fontSize:8, display:"block"}}/>
          </div>
        ))}

        {SS(T.cv_c)}
        {cv.certifications.map((c, i) => (
          <div key={i} style={{fontSize:8, marginBottom:3, lineHeight:1.4}}>
            <span style={{color: t.ac}}>v </span>
            <E value={c} onChange={v=>uc(i, v)}
              style={{color: t.st, fontSize:8}}/>
          </div>
        ))}
      </div>

      {/* Colonne principale */}
      <div style={{flex:1, padding:"22px 24px"}}>
        {/* Nom + titre */}
        <div style={{
          fontFamily: t.hf, fontSize:21, fontWeight:700,
          color: t.pr, lineHeight:1.1, marginBottom:2,
        }}>
          <E value={cv.name} onChange={u("name")}
            style={{
              fontFamily: t.hf, fontSize:21, fontWeight:700, color: t.pr,
            }}/>
        </div>
        <div style={{
          fontSize:10, color: t.ac, fontWeight:600,
          letterSpacing:1.5, textTransform:"uppercase",
        }}>
          <E value={cv.title} onChange={u("title")}
            style={{color: t.ac, fontSize:10}}/>
        </div>

        {/* Summary */}
        {MS(T.cv_p)}
        <E value={cv.summary} onChange={u("summary")} multi
          style={{fontSize:10, color:"#555", lineHeight:1.7}}/>

        {/* Experiences */}
        {MS(T.cv_e)}
        {cv.experience.map(ex => (
          <div key={ex.id} style={{marginBottom:12}}>
            <div style={{
              display:"flex", justifyContent:"space-between", gap:8,
            }}>
              <div>
                <div style={{fontWeight:700, fontSize:11, color: t.pr}}>
                  <E value={ex.title} onChange={v=>ux(ex.id, "title", v)}
                    style={{fontWeight:700, fontSize:11, color: t.pr}}/>
                </div>
                <div style={{fontSize:9.5, color: t.ac, fontWeight:600}}>
                  <E value={ex.company} onChange={v=>ux(ex.id, "company", v)}
                    style={{fontSize:9.5, color: t.ac}}/>
                  {" - "}
                  <E value={ex.location} onChange={v=>ux(ex.id, "location", v)}
                    style={{fontSize:9.5, color:"#888"}}/>
                </div>
              </div>
              <div style={{fontSize:8.5, color:"#aaa", flexShrink:0}}>
                <E value={ex.period} onChange={v=>ux(ex.id, "period", v)}
                  style={{fontSize:8.5, color:"#aaa"}}/>
              </div>
            </div>
            <ul style={{margin:"3px 0 0 12px", padding:0}}>
              {ex.bullets.map((b, i) => (
                <li key={i} style={{
                  fontSize:9.5, color:"#444", marginBottom:2, lineHeight:1.5,
                }}>
                  <E value={b} onChange={v=>ub(ex.id, i, v)}
                    style={{fontSize:9.5}}/>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Formations */}
        {MS(T.cv_ed)}
        {cv.education.map(ed => (
          <div key={ed.id} style={{
            marginBottom:7, display:"flex",
            justifyContent:"space-between", gap:8,
          }}>
            <div>
              <div style={{fontWeight:700, fontSize:10, color: t.pr}}>
                <E value={ed.degree} onChange={v=>ue(ed.id, "degree", v)}
                  style={{fontWeight:700, fontSize:10}}/>
              </div>
              <div style={{fontSize:9, color:"#777"}}>
                <E value={ed.school} onChange={v=>ue(ed.id, "school", v)}
                  style={{fontSize:9}}/>
              </div>
            </div>
            <div style={{fontSize:8.5, color:"#aaa", flexShrink:0}}>
              <E value={ed.period} onChange={v=>ue(ed.id, "period", v)}
                style={{fontSize:8.5}}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// CVAts : layout ATS-Safe (sobre, robot-friendly)
// ============================================================
export function CVAts({ cv, set, T }) {
  const { u, ux, ub, ue, us, ul, uc } = MK(set);

  // S (section header) en style ATS sobre.
  const S = l => (
    <div style={{
      fontWeight:700, fontSize:11, color:"#000",
      borderBottom:"1.5px solid #000",
      paddingBottom:3, marginBottom:8, marginTop:16,
      letterSpacing:.5, textTransform:"uppercase",
    }}>{l}</div>
  );

  return (
    <div style={{
      fontFamily:"Arial,sans-serif", background:"#fff",
      padding:"28px 36px", color:"#111",
    }}>
      {/* Header */}
      <div style={{
        marginBottom:12, paddingBottom:10,
        borderBottom:"2px solid #000",
      }}>
        <div style={{fontSize:20, fontWeight:700}}>
          <E value={cv.name} onChange={u("name")}
            style={{fontSize:20, fontWeight:700}}/>
        </div>
        <div style={{
          fontSize:11, fontWeight:600, color:"#333", marginTop:2,
        }}>
          <E value={cv.title} onChange={u("title")}/>
        </div>
        <div style={{
          fontSize:9.5, color:"#444", marginTop:5,
          display:"flex", gap:12, flexWrap:"wrap",
        }}>
          {["email","phone","location","linkedin"].map(f => (
            <span key={f}>
              <E value={cv[f]} onChange={u(f)} style={{fontSize:9.5}}/>
            </span>
          ))}
        </div>
      </div>

      {/* Summary */}
      {S(T.cv_p)}
      <p style={{
        fontSize:10, color:"#222", lineHeight:1.7, margin:"0 0 3px",
      }}>
        <E value={cv.summary} onChange={u("summary")} multi
          style={{fontSize:10}}/>
      </p>

      {/* Experiences */}
      {S(T.cv_el)}
      {cv.experience.map(ex => (
        <div key={ex.id} style={{marginBottom:12}}>
          <div style={{display:"flex", justifyContent:"space-between"}}>
            <div style={{fontWeight:700, fontSize:11}}>
              <E value={ex.title} onChange={v=>ux(ex.id, "title", v)}
                style={{fontWeight:700, fontSize:11}}/>
            </div>
            <div style={{fontSize:9.5, color:"#555"}}>
              <E value={ex.period} onChange={v=>ux(ex.id, "period", v)}
                style={{fontSize:9.5}}/>
            </div>
          </div>
          <div style={{
            fontSize:10, fontStyle:"italic", color:"#444", marginBottom:2,
          }}>
            <E value={ex.company} onChange={v=>ux(ex.id, "company", v)}/>
            {" - "}
            <E value={ex.location} onChange={v=>ux(ex.id, "location", v)}/>
          </div>
          <ul style={{margin:"0 0 0 14px", padding:0}}>
            {ex.bullets.map((b, i) => (
              <li key={i} style={{
                fontSize:10, color:"#222", marginBottom:2, lineHeight:1.5,
              }}>
                <E value={b} onChange={v=>ub(ex.id, i, v)}
                  style={{fontSize:10}}/>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Formations */}
      {S(T.cv_ed)}
      {cv.education.map(ed => (
        <div key={ed.id} style={{
          marginBottom:7, display:"flex", justifyContent:"space-between",
        }}>
          <div>
            <div style={{fontWeight:700, fontSize:10.5}}>
              <E value={ed.degree} onChange={v=>ue(ed.id, "degree", v)}
                style={{fontWeight:700, fontSize:10.5}}/>
            </div>
            <div style={{fontSize:9.5, color:"#555"}}>
              <E value={ed.school} onChange={v=>ue(ed.id, "school", v)}/>
            </div>
          </div>
          <div style={{fontSize:9.5, color:"#555"}}>
            <E value={ed.period} onChange={v=>ue(ed.id, "period", v)}
              style={{fontSize:9.5}}/>
          </div>
        </div>
      ))}

      {/* Skills */}
      {S(T.cv_s)}
      <p style={{
        fontSize:10, margin:0, lineHeight:1.7, color:"#222",
      }}>
        {cv.skills.map((s, i) => (
          <span key={i}>
            <E value={s} onChange={v=>us(i, v)} style={{fontSize:10}}/>
            {i < cv.skills.length - 1
              ? <span style={{color:"#888"}}> | </span>
              : null}
          </span>
        ))}
      </p>

      {/* Languages */}
      {S(T.cv_l)}
      {cv.languages.map((l, i) => (
        <div key={i} style={{fontSize:10, marginBottom:2}}>
          <E value={l.lang} onChange={v=>ul(i, "lang", v)}
            style={{fontWeight:600, fontSize:10}}/>
          {" : "}
          <E value={l.level} onChange={v=>ul(i, "level", v)} style={{fontSize:10}}/>
        </div>
      ))}

      {/* Certifications (seulement si non vide) */}
      {cv.certifications.filter(c => c).length > 0 && (
        <>
          {S(T.cv_c)}
          {cv.certifications.map((c, i) => (
            <div key={i} style={{fontSize:10, marginBottom:2}}>
              {"- "}
              <E value={c} onChange={v=>uc(i, v)} style={{fontSize:10}}/>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
