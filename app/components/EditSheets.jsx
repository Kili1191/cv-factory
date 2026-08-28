"use client";

// Nuvi v2 - EditSheets
//
// Les 4 modals d'edition pour les sections du CV :
//   SheetId   : identite (nom, titre, email, phone, location, linkedin, accroche)
//   SheetEx   : experiences (liste d'expe avec bullets + add/delete)
//   SheetEd   : formations
//   SheetSk   : competences + langues + certifications
//
// [Nuvi v2 redesign] :
//   - Sheet wrapper (Sheet.jsx) : NuviLogo + eyebrow Coral + close SVG
//   - Cards : background CreamSoft + border Hairline (au lieu de #f8f6f1)
//   - Buttons "+ Ajouter" : border dashed Hairline + texte Ink + icone +
//   - Buttons "Supprimer" : ghost rouge subtle (au lieu de red bg)
//   - Buttons "x" inline : SVG icon (au lieu de "x" texte)
//   - Bullet markers : bullet point neutre (au lieu de pipe |)
//   - Bouton "Transformer" sur bullets : violet (au lieu d'or)
//   - SaveBtn : gradient violet->magenta (defini dans EditHelpers)
//   - Section headers (SH) : eyebrow terracotta uppercase

import { useState } from "react";
import {
  Ink, InkMuted, Cream, CreamSoft, Paper,
  Coral, CoralSoft, Purple, Magenta, Hairline,
  Gold,
  Sans, B,
} from "./tokens";
import Sheet from "./Sheet";
import { FR, SaveBtn, MK } from "./EditHelpers";

// ============================================================
// Helpers visuels [Nuvi v2]
// ============================================================

// Section header style (au lieu de SH() de tokens.js)
// Eyebrow terracotta uppercase
const sectionHeaderStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: Coral,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  margin: "20px 0 12px",
  paddingBottom: 8,
  borderBottom: "0.5px solid " + Hairline,
};

// Style card (experience / formation)
const cardStyle = {
  background: Paper,
  borderRadius: 14,
  padding: 16,
  marginBottom: 14,
  border: "0.5px solid " + Hairline,
  boxShadow: "0 1px 2px rgba(10,10,10,.04)",
};

// Bouton "Supprimer" ghost rouge subtle
function DeleteBtn({ onClick, label }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...B({
          background: hovered ? "rgba(220, 38, 38, 0.08)" : "transparent",
          border: "0.5px solid " + (hovered ? "rgba(220, 38, 38, 0.3)" : Hairline),
          borderRadius: 999,
          padding: "5px 12px",
          fontSize: 11,
          fontWeight: 500,
          color: hovered ? "#dc2626" : InkMuted,
          fontFamily: Sans,
          letterSpacing: "0.01em",
          transition: "all 150ms ease",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
        })
      }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
      {label}
    </button>
  );
}

// Bouton "x" inline (suppression item liste : skills, certifs, langues, bullets)
function XBtn({ onClick, ariaLabel = "delete" }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick}
      aria-label={ariaLabel}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...B({
          width: 26, height: 26,
          borderRadius: "50%",
          background: hovered ? "rgba(220, 38, 38, 0.1)" : "transparent",
          border: "0.5px solid " + (hovered ? "rgba(220, 38, 38, 0.3)" : Hairline),
          color: hovered ? "#dc2626" : InkMuted,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "all 150ms ease",
        })
      }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}

// Bouton "+ Ajouter" generique (full-width dashed)
function AddBtn({ onClick, label, fullWidth = false }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...B({
          width: fullWidth ? "100%" : "auto",
          padding: fullWidth ? "12px 18px" : "8px 14px",
          borderRadius: fullWidth ? 12 : 999,
          border: "1px dashed " + (hovered ? Purple : Hairline),
          background: hovered ? "rgba(91, 61, 245, 0.04)" : "transparent",
          color: hovered ? Purple : InkMuted,
          fontWeight: 500,
          fontSize: fullWidth ? 13 : 12,
          fontFamily: Sans,
          letterSpacing: "0.01em",
          marginTop: fullWidth ? 4 : 6,
          marginBottom: fullWidth ? 10 : 4,
          display: fullWidth ? "flex" : "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          transition: "all 150ms ease",
        })
      }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      {label}
    </button>
  );
}

// Bouton "Transformer" pour les bullets (violet subtle)
function TransformBtn({ onClick, title }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...B({
          width: 28, height: 28,
          borderRadius: "50%",
          background: hovered
            ? "linear-gradient(135deg, " + Purple + ", " + Magenta + ")"
            : "rgba(91, 61, 245, 0.08)",
          border: "none",
          color: hovered ? "#fff" : Purple,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "all 180ms ease-out",
        })
      }}>
      {/* Icone "magic wand / sparkle" */}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z" />
      </svg>
    </button>
  );
}

// ============================================================
// SheetId : Edition de l'identite
// ============================================================
export function SheetId({ cv, set, onClose, onTransformSummary, T }) {
  const { u } = MK(set);
  const [summaryFocused, setSummaryFocused] = useState(false);
  const summaryEmpty = !cv.summary || !cv.summary.trim();

  return (
    <Sheet
      title={T.edit_id}
      eyebrow={T.sh_eyebrow_id || "Identite"}
      onClose={onClose}
    >
      <FR label={T.sh_name} value={cv.name} onChange={u("name")} />
      <FR label={T.sh_title} value={cv.title} onChange={u("title")} />
      <FR label={T.sh_email} value={cv.email} onChange={u("email")} />
      <FR label={T.sh_phone} value={cv.phone} onChange={u("phone")} />
      <FR label={T.sh_loc} value={cv.location} onChange={u("location")} />
      <FR label={T.sh_li} value={cv.linkedin} onChange={u("linkedin")} />

      {/* Summary avec bouton transformer en inline */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 6,
        }}>
          <label style={{
            display: "block",
            fontSize: 10,
            fontWeight: 600,
            color: Coral,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}>{T.sh_sum}</label>
          {onTransformSummary && (
            <button
              onClick={() => onTransformSummary(cv.summary || "")}
              disabled={summaryEmpty}
              title={T.bts_btn || "Transformer l'accroche avec Nuvi"}
              style={{
                ...B({
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 999,
                  background: summaryEmpty
                    ? "rgba(232, 227, 214, 0.5)"
                    : "linear-gradient(135deg," + Purple + "," + Magenta + ")",
                  color: summaryEmpty ? InkMuted : "#fff",
                  fontSize: 11, fontWeight: 600,
                  fontFamily: Sans,
                  letterSpacing: "0.02em",
                  opacity: summaryEmpty ? 0.6 : 1,
                  cursor: summaryEmpty ? "not-allowed" : "pointer",
                  boxShadow: summaryEmpty ? "none" : "0 2px 8px rgba(91, 61, 245, 0.25)",
                  transition: "all 180ms ease",
                })
              }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z" />
              </svg>
              {T.bts_btn || "Transformer"}
            </button>
          )}
        </div>
        <textarea
          value={cv.summary || ""}
          onChange={e => u("summary")(e.target.value)}
          onFocus={() => setSummaryFocused(true)}
          onBlur={() => setSummaryFocused(false)}
          rows={3}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid " + (summaryFocused ? Purple : Hairline),
            boxShadow: summaryFocused ? "0 0 0 3px rgba(91, 61, 245, 0.08)" : "none",
            fontSize: 13,
            fontFamily: Sans,
            color: Ink,
            background: Paper,
            boxSizing: "border-box",
            outline: "none",
            resize: "vertical",
            minHeight: 80,
            transition: "border-color 150ms ease, box-shadow 150ms ease",
          }}
        />
      </div>

      <SaveBtn onClose={onClose} T={T} />
    </Sheet>
  );
}

// ============================================================
// SheetEx : Edition des experiences
// ============================================================
export function SheetEx({ cv, set, onClose, onTransformBullet, T }) {
  const { ux, ub } = MK(set);

  const ax = () => set(p => ({
    ...p,
    experience: [...p.experience, {
      id: Date.now(), title: "", company: "", period: "", location: "", bullets: [""]
    }]
  }));
  const dx = id => set(p => ({
    ...p,
    experience: p.experience.filter(e => e.id !== id)
  }));
  const ab = id => set(p => ({
    ...p,
    experience: p.experience.map(e => e.id === id
      ? { ...e, bullets: [...e.bullets, ""] }
      : e)
  }));
  const db = (id, i) => set(p => ({
    ...p,
    experience: p.experience.map(e => e.id === id
      ? { ...e, bullets: e.bullets.filter((_, j) => j !== i) }
      : e)
  }));

  // [Nuvi v2] Composant bullet avec focus violet
  const BulletInput = ({ value, onChange, expId, idx }) => {
    const [focused, setFocused] = useState(false);
    return (
      <div style={{
        display: "flex", gap: 8, marginBottom: 8, alignItems: "center",
      }}>
        {/* [Nuvi v2] Bullet point neutre au lieu de pipe Gold */}
        <span style={{
          width: 5, height: 5, borderRadius: "50%",
          background: InkMuted, flexShrink: 0,
          opacity: 0.5,
        }} />
        <input value={value} onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid " + (focused ? Purple : Hairline),
            boxShadow: focused ? "0 0 0 3px rgba(91, 61, 245, 0.08)" : "none",
            fontSize: 12,
            fontFamily: Sans,
            color: Ink,
            background: Paper,
            outline: "none",
            transition: "all 150ms ease",
          }} />
        {onTransformBullet && (
          <TransformBtn
            onClick={() => onTransformBullet(expId, idx, value)}
            title={T.bt_btn_title || "Transformer ce bullet avec Nuvi"}
          />
        )}
        <XBtn onClick={() => db(expId, idx)} ariaLabel="supprimer bullet" />
      </div>
    );
  };

  return (
    <Sheet
      title={T.edit_ex}
      eyebrow={T.sh_eyebrow_ex || "Experiences"}
      onClose={onClose}
    >
      {cv.experience.map((ex, i) => (
        <div key={ex.id} style={cardStyle}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 12,
          }}>
            <div style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 14, fontWeight: 500,
              color: Ink, letterSpacing: "-0.01em",
            }}>{T.sh_et} {i + 1}</div>
            <DeleteBtn onClick={() => dx(ex.id)} label={T.sh_del} />
          </div>
          <FR label={T.sh_et} value={ex.title} onChange={v => ux(ex.id, "title", v)} />
          <FR label={T.sh_ec} value={ex.company} onChange={v => ux(ex.id, "company", v)} />
          <FR label={T.sh_ep} value={ex.period} onChange={v => ux(ex.id, "period", v)} />
          <FR label={T.sh_ey} value={ex.location} onChange={v => ux(ex.id, "location", v)} />

          <label style={{
            display: "block",
            fontSize: 10,
            fontWeight: 600,
            color: Coral,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 8,
            marginTop: 4,
          }}>{T.sh_eb}</label>

          {ex.bullets.map((b, j) => (
            <BulletInput
              key={j}
              value={b}
              onChange={e => ub(ex.id, j, e.target.value)}
              expId={ex.id}
              idx={j}
            />
          ))}

          <AddBtn onClick={() => ab(ex.id)} label={T.sh_addl} />
        </div>
      ))}

      <AddBtn onClick={ax} label={T.sh_addex} fullWidth />

      <SaveBtn onClose={onClose} T={T} />
    </Sheet>
  );
}

// ============================================================
// SheetEd : Edition des formations
// ============================================================
export function SheetEd({ cv, set, onClose, T }) {
  const { ue } = MK(set);

  const ae = () => set(p => ({
    ...p,
    education: [...p.education, { id: Date.now(), degree: "", school: "", period: "" }]
  }));
  const de = id => set(p => ({
    ...p,
    education: p.education.filter(e => e.id !== id)
  }));

  return (
    <Sheet
      title={T.edit_ed}
      eyebrow={T.sh_eyebrow_ed || "Formations"}
      onClose={onClose}
    >
      {cv.education.map((ed, i) => (
        <div key={ed.id} style={cardStyle}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 12,
          }}>
            <div style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 14, fontWeight: 500,
              color: Ink, letterSpacing: "-0.01em",
            }}>{T.sh_edd} {i + 1}</div>
            <DeleteBtn onClick={() => de(ed.id)} label={T.sh_del} />
          </div>
          <FR label={T.sh_edd} value={ed.degree} onChange={v => ue(ed.id, "degree", v)} />
          <FR label={T.sh_eds} value={ed.school} onChange={v => ue(ed.id, "school", v)} />
          <FR label={T.sh_ep} value={ed.period} onChange={v => ue(ed.id, "period", v)} />
        </div>
      ))}

      <AddBtn onClick={ae} label={T.sh_added} fullWidth />

      <SaveBtn onClose={onClose} T={T} />
    </Sheet>
  );
}

// ============================================================
// SheetSk : Edition des competences + langues + certifications
// ============================================================
export function SheetSk({ cv, set, onClose, T }) {
  const { us, ul, uc } = MK(set);

  const as = () => set(p => ({ ...p, skills: [...p.skills, ""] }));
  const ds = i => set(p => ({ ...p, skills: p.skills.filter((_, j) => j !== i) }));
  const al = () => set(p => ({
    ...p,
    languages: [...p.languages, { lang: "", level: "" }]
  }));
  const dl = i => set(p => ({
    ...p,
    languages: p.languages.filter((_, j) => j !== i)
  }));
  const ac = () => set(p => ({ ...p, certifications: [...p.certifications, ""] }));
  const dc = i => set(p => ({
    ...p,
    certifications: p.certifications.filter((_, j) => j !== i)
  }));

  // Input simple avec focus violet (pour skills, langues, certifs)
  const SimpleInput = ({ value, onChange, placeholder, flex = 1 }) => {
    const [focused, setFocused] = useState(false);
    return (
      <input value={value} onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex,
          padding: "9px 12px",
          borderRadius: 8,
          border: "1px solid " + (focused ? Purple : Hairline),
          boxShadow: focused ? "0 0 0 3px rgba(91, 61, 245, 0.08)" : "none",
          fontSize: 13,
          fontFamily: Sans,
          color: Ink,
          background: Paper,
          outline: "none",
          boxSizing: "border-box",
          transition: "all 150ms ease",
        }} />
    );
  };

  return (
    <Sheet
      title={T.edit_sk}
      eyebrow={T.sh_eyebrow_sk || "Competences"}
      onClose={onClose}
    >
      {/* Section Compétences */}
      <div style={{ ...sectionHeaderStyle, marginTop: 0 }}>{T.sh_sk}</div>
      {cv.skills.map((s, i) => (
        <div key={i} style={{
          display: "flex", gap: 8, marginBottom: 8, alignItems: "center",
        }}>
          <SimpleInput value={s} onChange={e => us(i, e.target.value)} />
          <XBtn onClick={() => ds(i)} ariaLabel={T.ui_del_skill} />
        </div>
      ))}
      <AddBtn onClick={as} label={T.sh_addsk} />

      {/* Section Langues */}
      <div style={sectionHeaderStyle}>{T.sh_lg}</div>
      {cv.languages.map((l, i) => (
        <div key={i} style={{
          display: "flex", gap: 8, marginBottom: 8, alignItems: "center",
        }}>
          <SimpleInput value={l.lang}
            placeholder={T.sh_lph1}
            onChange={e => ul(i, "lang", e.target.value)} />
          <SimpleInput value={l.level}
            placeholder={T.sh_lph2}
            onChange={e => ul(i, "level", e.target.value)} />
          <XBtn onClick={() => dl(i)} ariaLabel={T.ui_del_lang} />
        </div>
      ))}
      <AddBtn onClick={al} label={T.sh_addlg} />

      {/* Section Certifications */}
      <div style={sectionHeaderStyle}>{T.sh_ct}</div>
      {cv.certifications.map((c, i) => (
        <div key={i} style={{
          display: "flex", gap: 8, marginBottom: 8, alignItems: "center",
        }}>
          <SimpleInput value={c} onChange={e => uc(i, e.target.value)} />
          <XBtn onClick={() => dc(i)} ariaLabel="supprimer certification" />
        </div>
      ))}
      <AddBtn onClick={ac} label={T.sh_addct} />

      <div style={{ marginTop: 14 }}>
        <SaveBtn onClose={onClose} T={T} />
      </div>
    </Sheet>
  );
}
