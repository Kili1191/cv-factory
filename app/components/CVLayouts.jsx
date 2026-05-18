"use client";

// CV Factory v17 - CVLayouts
// v18 : Titres editables au double-clic via EditableTitle
// v19 [Deploy B] : Photo CV 3 modes (Upload/Initials/None) via CVPhoto
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
// Les TITRES de sections sont editables au double-clic via EditableTitle.
//
// Props communes :
//   cv     : objet CV
//   set    : setter useState pour mettre a jour cv
//   T      : i18n (T.cv_ct, T.cv_s, T.cv_l, T.cv_p, T.cv_e, T.cv_ed, T.cv_c, T.cv_el)
//   locale : "fr" | "en" (pour fallback des labels)
//
// CVSidebar prop specifique :
//   t : theme effectif (couleurs et fonts) avec t.ac, t.bg, t.sb, t.st,
//       t.pr, t.hf, t.bf

import { useState, useRef, useEffect } from "react";
import { E, MK } from "./EditHelpers";
import CVPhoto from "./CVPhoto";

// ============================================================
// EditableTitle : titre de section editable au double-clic
// ============================================================
const DEFAULT_LABELS_FR = {
  profile: "Profil",
  experience: "Experience",
  education: "Formation",
  skills: "Competences",
  languages: "Langues",
  certifications: "Certifications",
  contact: "Contact",
  links: "Liens",
};
const DEFAULT_LABELS_EN = {
  profile: "Profile",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  languages: "Languages",
  certifications: "Certifications",
  contact: "Contact",
  links: "Links",
};

function getLabel(cv, key, locale) {
  const custom = cv && cv.labels && cv.labels[key];
  if (custom && custom.trim()) return custom;
  const defaults = locale === "en" ? DEFAULT_LABELS_EN : DEFAULT_LABELS_FR;
  return defaults[key] || key;
}

function EditableTitle({ cv, set, labelKey, locale, fallback }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  const customLabel = cv && cv.labels && cv.labels[labelKey];
  const currentLabel = (customLabel && customLabel.trim())
    ? customLabel
    : (fallback || getLabel(cv, labelKey, locale));

  useEffect(() => {
    if (editing) {
      setValue(currentLabel);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [editing]);

  const save = () => {
    const trimmed = value.trim();
    set(prev => {
      const newLabels = { ...(prev.labels || {}) };
      if (trimmed && trimmed !== (fallback || getLabel(prev, labelKey, locale))) {
        newLabels[labelKey] = trimmed;
      } else {
        delete newLabels[labelKey];
      }
      return { ...prev, labels: newLabels };
    });
    setEditing(false);
  };

  const cancel = () => {
    setEditing(false);
    setValue("");
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") cancel();
        }}
        style={{
          background: "rgba(91, 61, 245, 0.08)",
          border: "1.5px solid #5b3df5",
          borderRadius: 3,
          padding: "1px 4px",
          outline: "none",
          fontFamily: "inherit",
          color: "inherit",
          fontSize: "inherit",
          fontWeight: "inherit",
          letterSpacing: "inherit",
          textTransform: "inherit",
          minWidth: 80,
        }}
      />
    );
  }

  return (
    <span
      onDoubleClick={() => setEditing(true)}
      title="Double-clic pour modifier"
      style={{
        cursor: "text",
        userSelect: "none",
      }}
    >
      {currentLabel}
    </span>
  );
}

// ============================================================
// CVSidebar : layout sidebar/classic
// v19 [Deploy B] : Photo CV gere par CVPhoto component
// ============================================================
export function CVSidebar({ cv, set, t, T, locale }) {
  const { u, ux, ub, ue, us, ul, uc } = MK(set);

  // SS (sidebar section header)
  const SS = (labelKey, fallback) => (
    <div style={{
      fontSize:8, fontWeight:700, letterSpacing:3, textTransform:"uppercase",
      color: t.ac, margin:"14px 0 7px",
      borderBottom:"1px solid "+t.ac+"44", paddingBottom:3,
    }}>
      <EditableTitle cv={cv} set={set} labelKey={labelKey}
        locale={locale} fallback={fallback}/>
    </div>
  );

  // MS (main section header)
  const MS = (labelKey, fallback) => (
    <div style={{
      fontSize:9, fontWeight:700, letterSpacing:2.5, textTransform:"uppercase",
      color: t.ac, margin:"16px 0 9px",
      borderBottom:"2px solid "+t.ac, paddingBottom:3,
    }}>
      <EditableTitle cv={cv} set={set} labelKey={labelKey}
        locale={locale} fallback={fallback}/>
    </div>
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
        {/* [Deploy B] Photo CV (3 modes : upload/initials/none) */}
        <CVPhoto
          cv={cv}
          set={set}
          t={t}
          variant="round"
          size={110}
          T={T}
          locale={locale}
        />

        {SS("contact", T.cv_ct)}
        {["email","phone","location","linkedin"].map(f => (
          <div key={f} style={{marginBottom:4}}>
            <E value={cv[f]} onChange={u(f)}
              style={{color: t.st, fontSize:9, lineHeight:1.5}}/>
          </div>
        ))}

        {SS("skills", T.cv_s)}
        {cv.skills.map((s, i) => (
          <div key={i} style={{
            display:"flex", gap:4, marginBottom:3, alignItems:"flex-start",
          }}>
            <span style={{color: t.ac, fontSize:8, flexShrink:0, marginTop:2}}>|</span>
            <E value={s} onChange={v=>us(i, v)}
              style={{color: t.st, fontSize:9}}/>
          </div>
        ))}

        {SS("languages", T.cv_l)}
        {cv.languages.map((l, i) => (
          <div key={i} style={{marginBottom:4}}>
            <E value={l.lang} onChange={v=>ul(i, "lang", v)}
              style={{color: t.st, fontWeight:600, fontSize:9, display:"block"}}/>
            <E value={l.level} onChange={v=>ul(i, "level", v)}
              style={{color: t.st + "88", fontSize:8, display:"block"}}/>
          </div>
        ))}

        {SS("certifications", T.cv_c)}
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
        {MS("profile", T.cv_p)}
        <E value={cv.summary} onChange={u("summary")} multi
          style={{fontSize:10, color:"#555", lineHeight:1.7}}/>

        {/* Experiences */}
        {MS("experience", T.cv_e)}
        {cv.experience.map(ex => (
          <div key={ex.id} className="cv-exp-item" style={{marginBottom:12}}>
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
        {MS("education", T.cv_ed)}
        {cv.education.map(ed => (
          <div key={ed.id} className="cv-edu-item" style={{
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
// CVAts : layout ATS-Safe (sobre, robot-friendly, PAS de photo par convention)
// ============================================================
export function CVAts({ cv, set, T, locale }) {
  const { u, ux, ub, ue, us, ul, uc } = MK(set);

  const S = (labelKey, fallback) => (
    <div style={{
      fontWeight:700, fontSize:11, color:"#000",
      borderBottom:"1.5px solid #000",
      paddingBottom:3, marginBottom:8, marginTop:16,
      letterSpacing:.5, textTransform:"uppercase",
    }}>
      <EditableTitle cv={cv} set={set} labelKey={labelKey}
        locale={locale} fallback={fallback}/>
    </div>
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
      {S("profile", T.cv_p)}
      <p style={{
        fontSize:10, color:"#222", lineHeight:1.7, margin:"0 0 3px",
      }}>
        <E value={cv.summary} onChange={u("summary")} multi
          style={{fontSize:10}}/>
      </p>

      {/* Experiences */}
      {S("experience", T.cv_el)}
      {cv.experience.map(ex => (
        <div key={ex.id} className="cv-exp-item" style={{marginBottom:12}}>
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
      {S("education", T.cv_ed)}
      {cv.education.map(ed => (
        <div key={ed.id} className="cv-edu-item" style={{
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
      {S("skills", T.cv_s)}
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
      {S("languages", T.cv_l)}
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
          {S("certifications", T.cv_c)}
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
