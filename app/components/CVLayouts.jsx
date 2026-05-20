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

// ============================================================
// hasContent : verifie si une section CV a du contenu reel
// Si vide -> le titre de section sera cache (regle UX 2026-05-20)
// ============================================================
function hasContent(cv, key) {
  if (!cv) return false;
  switch (key) {
    case "profile":
      return !!(cv.summary && String(cv.summary).trim());
    case "experience":
      return Array.isArray(cv.experience) && cv.experience.length > 0
        && cv.experience.some(e => e && (
          (e.title && e.title.trim()) ||
          (e.company && e.company.trim()) ||
          (Array.isArray(e.bullets) && e.bullets.some(b => b && b.trim()))
        ));
    case "education":
      return Array.isArray(cv.education) && cv.education.length > 0
        && cv.education.some(e => e && (
          (e.degree && e.degree.trim()) ||
          (e.school && e.school.trim())
        ));
    case "skills":
      return Array.isArray(cv.skills) && cv.skills.some(s => s && String(s).trim());
    case "languages":
      return Array.isArray(cv.languages) && cv.languages.length > 0
        && cv.languages.some(l => l && (
          (l.lang && l.lang.trim()) || (l.level && l.level.trim())
        ));
    case "certifications":
      return Array.isArray(cv.certifications) && cv.certifications.some(c => c && String(c).trim());
    case "contact":
      return !!(cv.email || cv.phone || cv.location || cv.linkedin);
    case "links":
      return !!(cv.linkedin || (cv.links && Object.values(cv.links).some(v => v)));
    default:
      return true; // fallback : montre si on ne sait pas
  }
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

  // SS (sidebar section header) - retourne null si section vide (UX 2026-05-20)
  const SS = (labelKey, fallback) => {
    if (!hasContent(cv, labelKey)) return null;
    return (
      <div style={{
        fontSize:8, fontWeight:700, letterSpacing:3, textTransform:"uppercase",
        color: t.ac, margin:"14px 0 7px",
        borderBottom:"1px solid "+t.ac+"44", paddingBottom:3,
      }}>
        <EditableTitle cv={cv} set={set} labelKey={labelKey}
          locale={locale} fallback={fallback}/>
      </div>
    );
  };

  // MS (main section header) - retourne null si section vide
  const MS = (labelKey, fallback) => {
    if (!hasContent(cv, labelKey)) return null;
    return (
      <div style={{
        fontSize:9, fontWeight:700, letterSpacing:2.5, textTransform:"uppercase",
        color: t.ac, margin:"16px 0 9px",
        borderBottom:"2px solid "+t.ac, paddingBottom:3,
      }}>
        <EditableTitle cv={cv} set={set} labelKey={labelKey}
          locale={locale} fallback={fallback}/>
      </div>
    );
  };

  return (
    <div style={{
      display:"flex",
      // [FIX bande blanche 2026-05-20] minHeight 100% pour que le gradient
      // sidebar s'etende sur toute la hauteur du conteneur cv-print (297mm)
      minHeight:"297mm",
      fontFamily: t.bf,
      // Background gradient split :
      // gauche = couleur sidebar (185px = width sidebar)
      // droite = couleur fond CV
      // Garantit que la sidebar visuelle va jusqu'en bas meme si son contenu s'arrete plus tot
      background: `linear-gradient(to right, ${t.sb} 0, ${t.sb} 185px, ${t.bg} 185px, ${t.bg} 100%)`,
    }}>
      {/* Colonne sidebar - le background transparent laisse voir le gradient parent */}
      <div style={{
        width:185, color: t.st,
        padding:"22px 15px", flexShrink:0,
        // [FIX overflow text 2026-05-20] Garantit qu'aucun texte ne deborde
        overflow:"hidden",
        wordBreak:"break-word",
        overflowWrap:"anywhere",
        boxSizing:"border-box",
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
          <div key={f} style={{
            marginBottom:4,
            wordBreak:"break-word", overflowWrap:"anywhere",
          }}>
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
            <div style={{
              flex:1, minWidth:0,
              wordBreak:"break-word", overflowWrap:"anywhere",
            }}>
              <E value={s} onChange={v=>us(i, v)}
                style={{color: t.st, fontSize:9}}/>
            </div>
          </div>
        ))}

        {SS("languages", T.cv_l)}
        {cv.languages.map((l, i) => (
          <div key={i} style={{
            marginBottom:4, wordBreak:"break-word", overflowWrap:"anywhere",
          }}>
            <E value={l.lang} onChange={v=>ul(i, "lang", v)}
              style={{color: t.st, fontWeight:600, fontSize:9, display:"block"}}/>
            <E value={l.level} onChange={v=>ul(i, "level", v)}
              style={{color: t.st + "88", fontSize:8, display:"block"}}/>
          </div>
        ))}

        {SS("certifications", T.cv_c)}
        {cv.certifications.map((c, i) => (
          <div key={i} style={{
            fontSize:8, marginBottom:3, lineHeight:1.4,
            wordBreak:"break-word", overflowWrap:"anywhere",
          }}>
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
// CVClassic : layout traditionnel sobre, 1 colonne, accents couleurs
// Inspiration : Newcast/Resume.io Classic - le plus polyvalent
// Photo facultative en haut a gauche
// ============================================================
export function CVClassic({ cv, set, t, T, locale }) {
  const { u, ux, ub, ue, us, ul, uc } = MK(set);

  const S = (labelKey, fallback) => {
    if (!hasContent(cv, labelKey)) return null;
    return (
    <div style={{
      fontSize: 10, fontWeight: 700,
      letterSpacing: 2, textTransform: "uppercase",
      color: t.ac, margin: "18px 0 8px",
      paddingBottom: 4,
      borderBottom: "1.5px solid " + t.ac,
    }}>
      <EditableTitle cv={cv} set={set} labelKey={labelKey}
        locale={locale} fallback={fallback}/>
    </div>
    );
  };

  return (
    <div style={{
      fontFamily: t.bf, background: t.bg, color: t.ti,
      padding: "32px 40px", minHeight: "297mm",
    }}>
      {/* Header avec photo facultative a gauche */}
      <div style={{
        display: "flex", gap: 20, alignItems: "center",
        marginBottom: 16, paddingBottom: 14,
        borderBottom: "0.5px solid " + t.ac + "55",
      }}>
        <CVPhoto cv={cv} set={set} t={t} variant="round" size={80}
          T={T} locale={locale}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 22, fontWeight: 700, color: t.ti,
            lineHeight: 1.1, marginBottom: 4,
          }}>
            <E value={cv.name} onChange={u("name")}
              style={{ fontSize: 22, fontWeight: 700 }}/>
          </div>
          <div style={{
            fontSize: 12, color: t.ac, fontWeight: 600,
            letterSpacing: 1, textTransform: "uppercase",
            marginBottom: 6,
          }}>
            <E value={cv.title} onChange={u("title")}
              style={{ fontSize: 12, fontWeight: 600 }}/>
          </div>
          <div style={{
            fontSize: 10, color: t.ti, opacity: 0.7,
            display: "flex", gap: 12, flexWrap: "wrap",
          }}>
            {["email", "phone", "location", "linkedin"].map(f => (
              cv[f] ? <span key={f}>
                <E value={cv[f]} onChange={u(f)} style={{ fontSize: 10 }}/>
              </span> : null
            ))}
          </div>
        </div>
      </div>

      {/* PROFIL */}
      {S("profile", T.cv_p)}
      <p style={{
        fontSize: 11, lineHeight: 1.55, margin: 0,
        color: t.ti, opacity: 0.92,
      }}>
        <E value={cv.summary} onChange={u("summary")} multi
          style={{ fontSize: 11 }}/>
      </p>

      {/* EXPERIENCE */}
      {S("experience", T.cv_el)}
      {cv.experience.map(ex => (
        <div key={ex.id} className="cv-exp-item" style={{ marginBottom: 14 }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "baseline", marginBottom: 2,
          }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: t.ti }}>
              <E value={ex.title} onChange={v => ux(ex.id, "title", v)}
                style={{ fontWeight: 700, fontSize: 12 }}/>
            </div>
            <div style={{ fontSize: 10, color: t.ac, fontWeight: 600 }}>
              <E value={ex.period} onChange={v => ux(ex.id, "period", v)}
                style={{ fontSize: 10 }}/>
            </div>
          </div>
          <div style={{
            fontSize: 11, color: t.ac, fontStyle: "italic",
            marginBottom: 5,
          }}>
            <E value={ex.company} onChange={v => ux(ex.id, "company", v)}/>
            {ex.company && ex.location ? " — " : ""}
            <E value={ex.location} onChange={v => ux(ex.id, "location", v)}/>
          </div>
          <ul style={{ margin: "0 0 0 18px", padding: 0, listStyleType: "disc" }}>
            {ex.bullets.map((b, i) => (
              <li key={i} style={{
                fontSize: 11, color: t.ti, opacity: 0.92,
                marginBottom: 2, lineHeight: 1.5,
              }}>
                <E value={b} onChange={v => ub(ex.id, i, v)}
                  style={{ fontSize: 11 }}/>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* FORMATION */}
      {S("education", T.cv_ed)}
      {cv.education.map(ed => (
        <div key={ed.id} className="cv-edu-item" style={{
          marginBottom: 8,
          display: "flex", justifyContent: "space-between",
          alignItems: "baseline",
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: t.ti }}>
              <E value={ed.degree} onChange={v => ue(ed.id, "degree", v)}
                style={{ fontWeight: 700, fontSize: 11 }}/>
            </div>
            <div style={{ fontSize: 10, color: t.ac, fontStyle: "italic" }}>
              <E value={ed.school} onChange={v => ue(ed.id, "school", v)}/>
            </div>
          </div>
          <div style={{ fontSize: 10, color: t.ac, fontWeight: 600 }}>
            <E value={ed.period} onChange={v => ue(ed.id, "period", v)}
              style={{ fontSize: 10 }}/>
          </div>
        </div>
      ))}

      {/* COMPETENCES */}
      {S("skills", T.cv_s)}
      <p style={{ fontSize: 11, margin: 0, lineHeight: 1.7, color: t.ti }}>
        {cv.skills.map((s, i) => (
          <span key={i}>
            <E value={s} onChange={v => us(i, v)} style={{ fontSize: 11 }}/>
            {i < cv.skills.length - 1
              ? <span style={{ color: t.ac, margin: "0 6px" }}>•</span>
              : null}
          </span>
        ))}
      </p>

      {/* LANGUES */}
      {S("languages", T.cv_l)}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {cv.languages.map((l, i) => (
          <div key={i} style={{ fontSize: 11, color: t.ti }}>
            <E value={l.lang} onChange={v => ul(i, "lang", v)}
              style={{ fontWeight: 700, fontSize: 11 }}/>
            <span style={{ color: t.ac }}> — </span>
            <E value={l.level} onChange={v => ul(i, "level", v)}
              style={{ fontSize: 11 }}/>
          </div>
        ))}
      </div>

      {/* CERTIFICATIONS (si non vide) */}
      {cv.certifications.filter(c => c).length > 0 && (
        <>
          {S("certifications", T.cv_c)}
          <ul style={{ margin: "0 0 0 18px", padding: 0, listStyleType: "disc" }}>
            {cv.certifications.map((c, i) => (
              <li key={i} style={{
                fontSize: 11, color: t.ti, marginBottom: 2, lineHeight: 1.5,
              }}>
                <E value={c} onChange={v => uc(i, v)} style={{ fontSize: 11 }}/>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ============================================================
// CVTimeline : layout avec timeline visuelle a gauche
// Inspiration : Diamond de Zety - parfait pour montrer progression
// ============================================================
export function CVTimeline({ cv, set, t, T, locale }) {
  const { u, ux, ub, ue, us, ul, uc } = MK(set);

  return (
    <div style={{
      fontFamily: t.bf, background: t.bg, color: t.ti,
      minHeight: "297mm",
    }}>
      {/* Header sombre contraste */}
      <div style={{
        background: t.sb, color: t.st,
        padding: "30px 40px",
        display: "flex", gap: 18, alignItems: "center",
      }}>
        <CVPhoto cv={cv} set={set} t={t} variant="round" size={90}
          T={T} locale={locale}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 24, fontWeight: 400, color: t.st,
            fontFamily: t.tf || t.bf, lineHeight: 1.1, marginBottom: 4,
          }}>
            <E value={cv.name} onChange={u("name")}
              style={{ fontSize: 24, color: t.st }}/>
          </div>
          <div style={{
            fontSize: 12, color: t.ac, fontWeight: 600,
            letterSpacing: 1.5, textTransform: "uppercase",
            marginBottom: 8,
          }}>
            <E value={cv.title} onChange={u("title")}
              style={{ fontSize: 12, color: t.ac }}/>
          </div>
          <div style={{
            fontSize: 10, color: t.st, opacity: 0.75,
            display: "flex", gap: 14, flexWrap: "wrap",
          }}>
            {["email", "phone", "location", "linkedin"].map(f => (
              cv[f] ? <span key={f}>
                <E value={cv[f]} onChange={u(f)}
                  style={{ fontSize: 10, color: t.st }}/>
              </span> : null
            ))}
          </div>
        </div>
      </div>

      {/* Body avec timeline */}
      <div style={{ padding: "28px 40px" }}>
        {/* PROFIL */}
        <div style={{ marginBottom: 22 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 2,
            textTransform: "uppercase", color: t.ac, marginBottom: 8,
          }}>
            <EditableTitle cv={cv} set={set} labelKey="profile"
              locale={locale} fallback={T.cv_p}/>
          </div>
          <p style={{ fontSize: 11, lineHeight: 1.6, margin: 0, color: t.ti }}>
            <E value={cv.summary} onChange={u("summary")} multi
              style={{ fontSize: 11 }}/>
          </p>
        </div>

        {/* EXPERIENCE avec timeline */}
        <div style={{ marginBottom: 22 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 2,
            textTransform: "uppercase", color: t.ac, marginBottom: 14,
          }}>
            <EditableTitle cv={cv} set={set} labelKey="experience"
              locale={locale} fallback={T.cv_el}/>
          </div>
          <div style={{ position: "relative", paddingLeft: 28 }}>
            {/* Ligne verticale timeline */}
            <div style={{
              position: "absolute", left: 7, top: 6, bottom: 6,
              width: 1, background: t.ac, opacity: 0.4,
            }}/>
            {cv.experience.map(ex => (
              <div key={ex.id} style={{
                marginBottom: 16, position: "relative",
              }}>
                {/* Diamant timeline */}
                <div style={{
                  position: "absolute", left: -25, top: 4,
                  width: 8, height: 8,
                  background: t.ac, transform: "rotate(45deg)",
                }}/>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "baseline", marginBottom: 2,
                }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: t.ti }}>
                    <E value={ex.title} onChange={v => ux(ex.id, "title", v)}
                      style={{ fontWeight: 700, fontSize: 12 }}/>
                  </div>
                  <div style={{ fontSize: 10, color: t.ac, fontWeight: 600 }}>
                    <E value={ex.period} onChange={v => ux(ex.id, "period", v)}
                      style={{ fontSize: 10 }}/>
                  </div>
                </div>
                <div style={{
                  fontSize: 11, color: t.ac, fontStyle: "italic",
                  marginBottom: 6,
                }}>
                  <E value={ex.company} onChange={v => ux(ex.id, "company", v)}/>
                  {ex.company && ex.location ? " · " : ""}
                  <E value={ex.location} onChange={v => ux(ex.id, "location", v)}/>
                </div>
                <ul style={{ margin: "0 0 0 16px", padding: 0, listStyleType: "disc" }}>
                  {ex.bullets.map((b, i) => (
                    <li key={i} style={{
                      fontSize: 11, color: t.ti, opacity: 0.92,
                      marginBottom: 2, lineHeight: 1.5,
                    }}>
                      <E value={b} onChange={v => ub(ex.id, i, v)}
                        style={{ fontSize: 11 }}/>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* FORMATION en timeline aussi */}
        <div style={{ marginBottom: 18 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 2,
            textTransform: "uppercase", color: t.ac, marginBottom: 12,
          }}>
            <EditableTitle cv={cv} set={set} labelKey="education"
              locale={locale} fallback={T.cv_ed}/>
          </div>
          {cv.education.map(ed => (
            <div key={ed.id} style={{
              marginBottom: 8, display: "flex",
              justifyContent: "space-between", alignItems: "baseline",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 11, color: t.ti }}>
                  <E value={ed.degree} onChange={v => ue(ed.id, "degree", v)}
                    style={{ fontWeight: 700, fontSize: 11 }}/>
                </div>
                <div style={{ fontSize: 10, color: t.ac, fontStyle: "italic" }}>
                  <E value={ed.school} onChange={v => ue(ed.id, "school", v)}/>
                </div>
              </div>
              <div style={{ fontSize: 10, color: t.ac, fontWeight: 600 }}>
                <E value={ed.period} onChange={v => ue(ed.id, "period", v)}
                  style={{ fontSize: 10 }}/>
              </div>
            </div>
          ))}
        </div>

        {/* COMPETENCES */}
        <div style={{ marginBottom: 18 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 2,
            textTransform: "uppercase", color: t.ac, marginBottom: 8,
          }}>
            <EditableTitle cv={cv} set={set} labelKey="skills"
              locale={locale} fallback={T.cv_s}/>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {cv.skills.map((s, i) => (
              <span key={i} style={{
                fontSize: 10, color: t.ti,
                background: t.ac + "22",
                padding: "3px 8px", borderRadius: 3,
              }}>
                <E value={s} onChange={v => us(i, v)} style={{ fontSize: 10 }}/>
              </span>
            ))}
          </div>
        </div>

        {/* LANGUES + CERTIFICATIONS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 2,
              textTransform: "uppercase", color: t.ac, marginBottom: 6,
            }}>
              <EditableTitle cv={cv} set={set} labelKey="languages"
                locale={locale} fallback={T.cv_l}/>
            </div>
            {cv.languages.map((l, i) => (
              <div key={i} style={{ fontSize: 11, color: t.ti, marginBottom: 3 }}>
                <E value={l.lang} onChange={v => ul(i, "lang", v)}
                  style={{ fontWeight: 700, fontSize: 11 }}/>
                <span style={{ color: t.ac }}> · </span>
                <E value={l.level} onChange={v => ul(i, "level", v)}
                  style={{ fontSize: 11 }}/>
              </div>
            ))}
          </div>
          {cv.certifications.filter(c => c).length > 0 && (
            <div>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 2,
                textTransform: "uppercase", color: t.ac, marginBottom: 6,
              }}>
                <EditableTitle cv={cv} set={set} labelKey="certifications"
                  locale={locale} fallback={T.cv_c}/>
              </div>
              {cv.certifications.map((c, i) => (
                <div key={i} style={{
                  fontSize: 11, color: t.ti, marginBottom: 3, lineHeight: 1.4,
                }}>
                  <E value={c} onChange={v => uc(i, v)} style={{ fontSize: 11 }}/>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CVSwiss : layout minimaliste suisse, ultra-sobre
// Inspiration : Dieter Rams - moins c'est plus
// PAS d'icones, PAS de couleurs sauf 1 accent, focus contenu
// ============================================================
export function CVSwiss({ cv, set, t, T, locale }) {
  const { u, ux, ub, ue, us, ul, uc } = MK(set);

  const S = (labelKey, fallback) => {
    if (!hasContent(cv, labelKey)) return null;
    return (
    <div style={{
      fontSize: 9, fontWeight: 700,
      letterSpacing: 3, textTransform: "uppercase",
      color: t.ac, margin: "22px 0 10px",
    }}>
      <EditableTitle cv={cv} set={set} labelKey={labelKey}
        locale={locale} fallback={fallback}/>
    </div>
    );
  };

  return (
    <div style={{
      fontFamily: t.bf, background: t.bg, color: t.ti,
      padding: "40px 48px", minHeight: "297mm",
      maxWidth: 800,
    }}>
      {/* Header epure */}
      <div style={{ marginBottom: 28 }}>
        <CVPhoto cv={cv} set={set} t={t} variant="square" size={70}
          T={T} locale={locale}/>
        <div style={{ marginTop: 18 }}>
          <div style={{
            fontSize: 28, fontWeight: 300, color: t.ti,
            lineHeight: 1, letterSpacing: -0.5, marginBottom: 8,
            fontFamily: t.tf || t.bf,
          }}>
            <E value={cv.name} onChange={u("name")}
              style={{ fontSize: 28, fontWeight: 300 }}/>
          </div>
          <div style={{
            fontSize: 11, color: t.ti, opacity: 0.7,
            fontWeight: 400, letterSpacing: 0.5,
            marginBottom: 12,
          }}>
            <E value={cv.title} onChange={u("title")}
              style={{ fontSize: 11 }}/>
          </div>
          <div style={{
            fontSize: 10, color: t.ti, opacity: 0.55,
            display: "flex", gap: 14, flexWrap: "wrap",
          }}>
            {["email", "phone", "location", "linkedin"].map(f => (
              cv[f] ? <span key={f}>
                <E value={cv[f]} onChange={u(f)} style={{ fontSize: 10 }}/>
              </span> : null
            ))}
          </div>
        </div>
      </div>

      {/* PROFIL */}
      {S("profile", T.cv_p)}
      <p style={{
        fontSize: 11, lineHeight: 1.65, margin: 0, color: t.ti,
        maxWidth: 680,
      }}>
        <E value={cv.summary} onChange={u("summary")} multi
          style={{ fontSize: 11 }}/>
      </p>

      {/* EXPERIENCE */}
      {S("experience", T.cv_el)}
      {cv.experience.map(ex => (
        <div key={ex.id} className="cv-exp-item" style={{
          marginBottom: 18, display: "grid",
          gridTemplateColumns: "100px 1fr", gap: 20,
        }}>
          <div style={{
            fontSize: 10, color: t.ac, fontWeight: 600,
            letterSpacing: 0.3, paddingTop: 1,
          }}>
            <E value={ex.period} onChange={v => ux(ex.id, "period", v)}
              style={{ fontSize: 10 }}/>
          </div>
          <div>
            <div style={{
              fontSize: 12, fontWeight: 600, color: t.ti, marginBottom: 2,
            }}>
              <E value={ex.title} onChange={v => ux(ex.id, "title", v)}
                style={{ fontWeight: 600, fontSize: 12 }}/>
            </div>
            <div style={{
              fontSize: 11, color: t.ti, opacity: 0.7,
              marginBottom: 6,
            }}>
              <E value={ex.company} onChange={v => ux(ex.id, "company", v)}/>
              {ex.company && ex.location ? ", " : ""}
              <E value={ex.location} onChange={v => ux(ex.id, "location", v)}/>
            </div>
            {ex.bullets.map((b, i) => (
              <div key={i} style={{
                fontSize: 11, color: t.ti, opacity: 0.88,
                marginBottom: 3, lineHeight: 1.5,
              }}>
                <E value={b} onChange={v => ub(ex.id, i, v)}
                  style={{ fontSize: 11 }}/>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* FORMATION */}
      {S("education", T.cv_ed)}
      {cv.education.map(ed => (
        <div key={ed.id} style={{
          marginBottom: 10, display: "grid",
          gridTemplateColumns: "100px 1fr", gap: 20,
        }}>
          <div style={{
            fontSize: 10, color: t.ac, fontWeight: 600, paddingTop: 1,
          }}>
            <E value={ed.period} onChange={v => ue(ed.id, "period", v)}
              style={{ fontSize: 10 }}/>
          </div>
          <div>
            <div style={{
              fontSize: 11, fontWeight: 600, color: t.ti,
            }}>
              <E value={ed.degree} onChange={v => ue(ed.id, "degree", v)}
                style={{ fontWeight: 600, fontSize: 11 }}/>
            </div>
            <div style={{ fontSize: 10, color: t.ti, opacity: 0.7 }}>
              <E value={ed.school} onChange={v => ue(ed.id, "school", v)}/>
            </div>
          </div>
        </div>
      ))}

      {/* COMPETENCES + LANGUES en grid */}
      <div style={{
        marginTop: 22, display: "grid",
        gridTemplateColumns: "1fr 1fr", gap: 32,
      }}>
        <div>
          {S("skills", T.cv_s)}
          <div style={{ fontSize: 11, color: t.ti, lineHeight: 1.7 }}>
            {cv.skills.map((s, i) => (
              <span key={i}>
                <E value={s} onChange={v => us(i, v)} style={{ fontSize: 11 }}/>
                {i < cv.skills.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        </div>
        <div>
          {S("languages", T.cv_l)}
          {cv.languages.map((l, i) => (
            <div key={i} style={{ fontSize: 11, color: t.ti, marginBottom: 3 }}>
              <E value={l.lang} onChange={v => ul(i, "lang", v)}
                style={{ fontWeight: 600, fontSize: 11 }}/>
              <span style={{ color: t.ti, opacity: 0.5 }}> — </span>
              <E value={l.level} onChange={v => ul(i, "level", v)}
                style={{ fontSize: 11, opacity: 0.7 }}/>
            </div>
          ))}
        </div>
      </div>

      {cv.certifications.filter(c => c).length > 0 && (
        <>
          {S("certifications", T.cv_c)}
          {cv.certifications.map((c, i) => (
            <div key={i} style={{
              fontSize: 11, color: t.ti, marginBottom: 3, lineHeight: 1.5,
            }}>
              <E value={c} onChange={v => uc(i, v)} style={{ fontSize: 11 }}/>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ============================================================
// CVCompact : layout dense 2 colonnes pour tenir sur 1 page
// Inspiration : Crisp/Cubic 1-page de Zety - junior/stages
// ============================================================
export function CVCompact({ cv, set, t, T, locale }) {
  const { u, ux, ub, ue, us, ul, uc } = MK(set);

  const S = (labelKey, fallback) => {
    if (!hasContent(cv, labelKey)) return null;
    return (
    <div style={{
      fontSize: 9, fontWeight: 700,
      letterSpacing: 1.5, textTransform: "uppercase",
      color: t.ac, margin: "12px 0 6px",
      paddingBottom: 2, borderBottom: "1px solid " + t.ac + "44",
    }}>
      <EditableTitle cv={cv} set={set} labelKey={labelKey}
        locale={locale} fallback={fallback}/>
    </div>
    );
  };

  return (
    <div style={{
      fontFamily: t.bf, background: t.bg, color: t.ti,
      padding: "20px 28px", minHeight: "297mm",
    }}>
      {/* Header compact */}
      <div style={{
        display: "flex", gap: 14, alignItems: "center",
        marginBottom: 12, paddingBottom: 10,
        borderBottom: "1.5px solid " + t.ac,
      }}>
        <CVPhoto cv={cv} set={set} t={t} variant="round" size={58}
          T={T} locale={locale}/>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 17, fontWeight: 700, color: t.ti,
            lineHeight: 1.1, marginBottom: 2,
          }}>
            <E value={cv.name} onChange={u("name")}
              style={{ fontSize: 17, fontWeight: 700 }}/>
          </div>
          <div style={{
            fontSize: 10, color: t.ac, fontWeight: 600,
            letterSpacing: 0.8, textTransform: "uppercase",
            marginBottom: 3,
          }}>
            <E value={cv.title} onChange={u("title")}
              style={{ fontSize: 10, fontWeight: 600 }}/>
          </div>
          <div style={{
            fontSize: 9, color: t.ti, opacity: 0.75,
            display: "flex", gap: 10, flexWrap: "wrap",
          }}>
            {["email", "phone", "location", "linkedin"].map(f => (
              cv[f] ? <span key={f}>
                <E value={cv[f]} onChange={u(f)} style={{ fontSize: 9 }}/>
              </span> : null
            ))}
          </div>
        </div>
      </div>

      {/* PROFIL pleine largeur */}
      <p style={{
        fontSize: 10, lineHeight: 1.5, margin: "0 0 8px",
        color: t.ti, opacity: 0.92,
      }}>
        <E value={cv.summary} onChange={u("summary")} multi
          style={{ fontSize: 10 }}/>
      </p>

      {/* Body 2 colonnes */}
      <div style={{
        display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18,
      }}>
        {/* Colonne gauche : Experience + Education */}
        <div>
          {S("experience", T.cv_el)}
          {cv.experience.map(ex => (
            <div key={ex.id} className="cv-exp-item" style={{ marginBottom: 8 }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "baseline",
              }}>
                <div style={{ fontWeight: 700, fontSize: 10.5, color: t.ti }}>
                  <E value={ex.title} onChange={v => ux(ex.id, "title", v)}
                    style={{ fontWeight: 700, fontSize: 10.5 }}/>
                </div>
                <div style={{ fontSize: 9, color: t.ac, fontWeight: 600 }}>
                  <E value={ex.period} onChange={v => ux(ex.id, "period", v)}
                    style={{ fontSize: 9 }}/>
                </div>
              </div>
              <div style={{
                fontSize: 9.5, color: t.ac, fontStyle: "italic",
                marginBottom: 3,
              }}>
                <E value={ex.company} onChange={v => ux(ex.id, "company", v)}/>
                {ex.company && ex.location ? " · " : ""}
                <E value={ex.location} onChange={v => ux(ex.id, "location", v)}/>
              </div>
              <ul style={{
                margin: "0 0 0 14px", padding: 0, listStyleType: "disc",
              }}>
                {ex.bullets.map((b, i) => (
                  <li key={i} style={{
                    fontSize: 9.5, color: t.ti, opacity: 0.9,
                    marginBottom: 1, lineHeight: 1.4,
                  }}>
                    <E value={b} onChange={v => ub(ex.id, i, v)}
                      style={{ fontSize: 9.5 }}/>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {S("education", T.cv_ed)}
          {cv.education.map(ed => (
            <div key={ed.id} style={{
              marginBottom: 5, display: "flex",
              justifyContent: "space-between", alignItems: "baseline",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 10, color: t.ti }}>
                  <E value={ed.degree} onChange={v => ue(ed.id, "degree", v)}
                    style={{ fontWeight: 700, fontSize: 10 }}/>
                </div>
                <div style={{ fontSize: 9, color: t.ac, fontStyle: "italic" }}>
                  <E value={ed.school} onChange={v => ue(ed.id, "school", v)}/>
                </div>
              </div>
              <div style={{ fontSize: 9, color: t.ac, fontWeight: 600 }}>
                <E value={ed.period} onChange={v => ue(ed.id, "period", v)}
                  style={{ fontSize: 9 }}/>
              </div>
            </div>
          ))}
        </div>

        {/* Colonne droite : Skills + Languages + Certifs */}
        <div>
          {S("skills", T.cv_s)}
          <div style={{ fontSize: 9.5, color: t.ti, lineHeight: 1.7 }}>
            {cv.skills.map((s, i) => (
              <div key={i} style={{ marginBottom: 1 }}>
                <span style={{ color: t.ac }}>• </span>
                <E value={s} onChange={v => us(i, v)} style={{ fontSize: 9.5 }}/>
              </div>
            ))}
          </div>

          {S("languages", T.cv_l)}
          {cv.languages.map((l, i) => (
            <div key={i} style={{ fontSize: 9.5, color: t.ti, marginBottom: 2 }}>
              <E value={l.lang} onChange={v => ul(i, "lang", v)}
                style={{ fontWeight: 700, fontSize: 9.5 }}/>
              <span style={{ color: t.ac }}> : </span>
              <E value={l.level} onChange={v => ul(i, "level", v)}
                style={{ fontSize: 9.5, opacity: 0.8 }}/>
            </div>
          ))}

          {cv.certifications.filter(c => c).length > 0 && (
            <>
              {S("certifications", T.cv_c)}
              {cv.certifications.map((c, i) => (
                <div key={i} style={{
                  fontSize: 9.5, color: t.ti, marginBottom: 2, lineHeight: 1.4,
                }}>
                  <span style={{ color: t.ac }}>• </span>
                  <E value={c} onChange={v => uc(i, v)}
                    style={{ fontSize: 9.5 }}/>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CVAts : layout ATS-Safe v2 (REWRITE 2026-05-19)
// ============================================================
// Optimise pour passer TOUS les ATS (Workday, Greenhouse, Lever,
// Taleo, SAP SuccessFactors, iCIMS, Bullhorn, Jobscan, Rezi).
//
// REGLES ATS strictes appliquees :
// - 1 seule colonne (les colonnes/sidebar cassent le parsing)
// - Police Calibri (native Word + supportee partout) puis Arial fallback
// - PAS de border-bottom sur sections (cree du bruit dans le parsing)
// - PAS de bordure decorative sous le header
// - PAS de photo (la plupart des ATS US/UK l'ignorent ou crashent)
// - PAS d'emojis, icones, caracteres speciaux
// - Bullets en caractere standard U+2022 (•)
// - Sections en MAJUSCULES bold (les ATS detectent les titres)
// - Dates a droite alignees avec flex (parse OK)
// - Skills separes par virgules (standard) au lieu de "|"
// - Contact info en ligne avec bullet separators (parse OK)
// - Tirets remplaces par bullets dans certifications
// - Couleurs : que du noir/gris fonce (#000 et #333)
export function CVAts({ cv, set, T, locale }) {
  const { u, ux, ub, ue, us, ul, uc } = MK(set);

  // Titre de section : MAJUSCULES bold, PAS de border-bottom.
  // Les ATS modernes detectent les sections via le formatting (caps + bold).
  const S = (labelKey, fallback) => {
    if (!hasContent(cv, labelKey)) return null;
    return (
    <div style={{
      fontWeight: 700, fontSize: 11.5, color: "#000",
      marginTop: 18, marginBottom: 6,
      letterSpacing: 0.6, textTransform: "uppercase",
    }}>
      <EditableTitle cv={cv} set={set} labelKey={labelKey}
        locale={locale} fallback={fallback}/>
    </div>
    );
  };

  // Helper pour join contact info avec bullet separator (• standard)
  const contactItems = ["email", "phone", "location", "linkedin"]
    .map(f => ({ field: f, value: cv[f] }))
    .filter(item => item.value);

  return (
    <div style={{
      fontFamily: "Calibri, Arial, Helvetica, sans-serif",
      background: "#fff",
      padding: "32px 40px",
      color: "#111",
      fontSize: 11,
      lineHeight: 1.45,
    }}>
      {/* HEADER : nom + titre + contact, AUCUNE bordure decorative */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontSize: 22, fontWeight: 700, color: "#000",
          lineHeight: 1.1, marginBottom: 2,
        }}>
          <E value={cv.name} onChange={u("name")}
            style={{ fontSize: 22, fontWeight: 700 }}/>
        </div>
        <div style={{
          fontSize: 12, fontWeight: 600, color: "#333",
          marginBottom: 6,
        }}>
          <E value={cv.title} onChange={u("title")}
            style={{ fontSize: 12, fontWeight: 600 }}/>
        </div>
        {/* Contact en ligne, bullets separators */}
        <div style={{
          fontSize: 10.5, color: "#333",
          display: "flex", gap: 0, flexWrap: "wrap",
          alignItems: "center",
        }}>
          {["email", "phone", "location", "linkedin"].map((f, idx) => (
            <span key={f} style={{ display: "inline-flex", alignItems: "center" }}>
              <E value={cv[f]} onChange={u(f)} style={{ fontSize: 10.5 }}/>
              {idx < 3 && cv[f] && (
                <span style={{ margin: "0 8px", color: "#666" }}>•</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* PROFIL */}
      {S("profile", T.cv_p)}
      <p style={{
        fontSize: 11, color: "#222", lineHeight: 1.5,
        margin: 0, textAlign: "justify",
      }}>
        <E value={cv.summary} onChange={u("summary")} multi
          style={{ fontSize: 11 }}/>
      </p>

      {/* EXPERIENCE PROFESSIONNELLE */}
      {S("experience", T.cv_el)}
      {cv.experience.map(ex => (
        <div key={ex.id} className="cv-exp-item" style={{ marginBottom: 12 }}>
          {/* Titre + dates sur meme ligne, flex space-between */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "baseline", marginBottom: 1,
          }}>
            <div style={{ fontWeight: 700, fontSize: 11.5, color: "#000" }}>
              <E value={ex.title} onChange={v => ux(ex.id, "title", v)}
                style={{ fontWeight: 700, fontSize: 11.5 }}/>
            </div>
            <div style={{ fontSize: 10.5, color: "#333", fontWeight: 600 }}>
              <E value={ex.period} onChange={v => ux(ex.id, "period", v)}
                style={{ fontSize: 10.5 }}/>
            </div>
          </div>
          {/* Company + location sur ligne 2 */}
          <div style={{
            fontSize: 11, fontStyle: "italic", color: "#333",
            marginBottom: 4,
          }}>
            <E value={ex.company} onChange={v => ux(ex.id, "company", v)}/>
            {ex.company && ex.location ? ", " : ""}
            <E value={ex.location} onChange={v => ux(ex.id, "location", v)}/>
          </div>
          {/* Bullets avec • standard, indentation simple */}
          <ul style={{
            margin: "0 0 0 18px", padding: 0,
            listStyleType: "disc",
          }}>
            {ex.bullets.map((b, i) => (
              <li key={i} style={{
                fontSize: 11, color: "#222",
                marginBottom: 2, lineHeight: 1.5,
              }}>
                <E value={b} onChange={v => ub(ex.id, i, v)}
                  style={{ fontSize: 11 }}/>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* FORMATION */}
      {S("education", T.cv_ed)}
      {cv.education.map(ed => (
        <div key={ed.id} className="cv-edu-item" style={{
          marginBottom: 8,
          display: "flex", justifyContent: "space-between",
          alignItems: "baseline",
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: "#000" }}>
              <E value={ed.degree} onChange={v => ue(ed.id, "degree", v)}
                style={{ fontWeight: 700, fontSize: 11 }}/>
            </div>
            <div style={{ fontSize: 10.5, color: "#333", fontStyle: "italic" }}>
              <E value={ed.school} onChange={v => ue(ed.id, "school", v)}/>
            </div>
          </div>
          <div style={{ fontSize: 10.5, color: "#333", fontWeight: 600 }}>
            <E value={ed.period} onChange={v => ue(ed.id, "period", v)}
              style={{ fontSize: 10.5 }}/>
          </div>
        </div>
      ))}

      {/* COMPETENCES : virgules (standard ATS) au lieu de "|" */}
      {S("skills", T.cv_s)}
      <p style={{
        fontSize: 11, margin: 0, lineHeight: 1.6, color: "#222",
      }}>
        {cv.skills.map((s, i) => (
          <span key={i}>
            <E value={s} onChange={v => us(i, v)} style={{ fontSize: 11 }}/>
            {i < cv.skills.length - 1 ? ", " : ""}
          </span>
        ))}
      </p>

      {/* LANGUES : format Langue : Niveau, ligne par ligne */}
      {S("languages", T.cv_l)}
      {cv.languages.map((l, i) => (
        <div key={i} style={{ fontSize: 11, marginBottom: 2, color: "#222" }}>
          <E value={l.lang} onChange={v => ul(i, "lang", v)}
            style={{ fontWeight: 600, fontSize: 11 }}/>
          {" : "}
          <E value={l.level} onChange={v => ul(i, "level", v)}
            style={{ fontSize: 11 }}/>
        </div>
      ))}

      {/* CERTIFICATIONS (seulement si non vide) - bullets standards */}
      {cv.certifications.filter(c => c).length > 0 && (
        <>
          {S("certifications", T.cv_c)}
          <ul style={{
            margin: "0 0 0 18px", padding: 0,
            listStyleType: "disc",
          }}>
            {cv.certifications.map((c, i) => (
              <li key={i} style={{
                fontSize: 11, color: "#222",
                marginBottom: 2, lineHeight: 1.5,
              }}>
                <E value={c} onChange={v => uc(i, v)} style={{ fontSize: 11 }}/>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
