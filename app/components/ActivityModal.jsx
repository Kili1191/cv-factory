"use client";

// Journal d'activite : tout ce que l'utilisateur a fait, groupe par jour.
//
// Repond au besoin "je ne veux pas perdre le fil de ma progression" : l'app
// persistait deja des etats (CV courant, versions, messages du coach), mais
// pas le recit des actions. Les donnees viennent de lib/activityLog.js et ne
// quittent jamais le navigateur.

import { useMemo, useState } from "react";
import {
  Ink, InkMuted, CreamSoft, Paper, Hairline,
  Coral, CoralSoft, Green, GreenSoft, Purple, PurpleSoft,
  Gray100, Gray400, Gray600,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm, B,
} from "./tokens";
import Sheet from "./Sheet";
import {
  readActivity, groupActivityByDay, activityStats,
  clearActivity, exportActivityText,
} from "../../lib/activityLog";

// Une pastille de couleur par categorie, pour scanner le journal d'un coup d'oeil.
const CATEGORY_STYLE = {
  cv:          { fg: Purple, bg: PurpleSoft },
  ai:          { fg: Coral,  bg: CoralSoft },
  version:     { fg: Green,  bg: GreenSoft },
  export:      { fg: Ink,    bg: Gray100 },
  application: { fg: Green,  bg: GreenSoft },
  design:      { fg: Purple, bg: PurpleSoft },
  other:       { fg: Gray600, bg: Gray100 },
};

const CATEGORY_LABEL = {
  fr: { cv:"CV", ai:"IA", version:"Versions", export:"Exports",
        application:"Candidatures", design:"Design", other:"Autre" },
  en: { cv:"CV", ai:"AI", version:"Versions", export:"Exports",
        application:"Applications", design:"Design", other:"Other" },
};

function formatDay(dayKey, locale) {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return locale === "en" ? "Today" : "Aujourd'hui";
  if (isSameDay(date, yesterday)) return locale === "en" ? "Yesterday" : "Hier";
  return date.toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function formatTime(ts, locale) {
  return new Date(ts).toLocaleTimeString(locale === "en" ? "en-GB" : "fr-FR", {
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ActivityModal({ locale = "fr", onClose, notify }) {
  const isEn = locale === "en";
  const [filter, setFilter] = useState("all");
  // `version` force un recalcul apres un effacement, sans relire a chaque rendu.
  const [version, setVersion] = useState(0);

  const entries = useMemo(() => readActivity(), [version]);
  const stats = useMemo(() => activityStats(entries), [entries]);

  const visible = useMemo(
    () => (filter === "all" ? entries : entries.filter(e => e.category === filter)),
    [entries, filter]
  );
  const groups = useMemo(() => groupActivityByDay(visible), [visible]);

  const categories = useMemo(() => {
    const present = Object.keys(stats.byCategory);
    present.sort((a, b) => stats.byCategory[b] - stats.byCategory[a]);
    return present;
  }, [stats]);

  const labels = CATEGORY_LABEL[isEn ? "en" : "fr"];

  const handleClear = () => {
    const ok = window.confirm(isEn
      ? "Erase your whole activity log? Your CV, versions and coach history are not affected."
      : "Effacer tout ton journal d'activite ? Ton CV, tes versions et ton historique coach ne sont pas touches.");
    if (!ok) return;
    clearActivity();
    setVersion(v => v + 1);
    notify && notify(isEn ? "Activity log erased" : "Journal efface");
  };

  const handleCopy = async () => {
    const text = exportActivityText(entries, locale);
    try {
      await navigator.clipboard.writeText(text);
      notify && notify(isEn ? "Log copied" : "Journal copie");
    } catch (e) {
      notify && notify(isEn ? "Copy failed" : "Copie impossible");
    }
  };

  return (
    <Sheet
      eyebrow={isEn ? "Your progress" : "Ta progression"}
      title={isEn ? "Everything you've done" : "Tout ce que tu as fait"}
      onClose={onClose}
    >
      {entries.length === 0 ? (
        <div style={{
          padding: "36px 20px", textAlign: "center",
          color: InkMuted, fontFamily: Sans, fontSize: 14, lineHeight: 1.7,
        }}>
          {isEn
            ? "Nothing logged yet. Every edit, AI run and export you make from now on shows up here."
            : "Rien pour l'instant. Chaque modification, analyse IA et export apparaitra ici."}
        </div>
      ) : (
        <>
          {/* Resume chiffre */}
          <div style={{
            display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap",
          }}>
            {[
              { n: stats.total, k: isEn ? "actions" : "actions" },
              { n: stats.days,  k: isEn ? (stats.days > 1 ? "active days" : "active day")
                                        : (stats.days > 1 ? "jours actifs" : "jour actif") },
            ].map((s, i) => (
              <div key={i} style={{
                flex: "1 1 120px", padding: "12px 14px",
                background: Paper, border: "0.5px solid " + Hairline,
                borderRadius: RadiusMd, boxShadow: ShadowSm,
              }}>
                <div style={{
                  fontSize: 26, fontWeight: 600, color: Ink,
                  fontFamily: Serif, lineHeight: 1.1,
                  fontVariantNumeric: "tabular-nums",
                }}>{s.n}</div>
                <div style={{
                  fontSize: 11, color: InkMuted, fontFamily: Sans,
                  letterSpacing: "0.04em",
                }}>{s.k}</div>
              </div>
            ))}
          </div>

          {/* Filtres par categorie */}
          <div style={{
            display: "flex", gap: 6, marginBottom: 18,
            flexWrap: "wrap",
          }}>
            {["all", ...categories].map(c => {
              const on = filter === c;
              const st = CATEGORY_STYLE[c] || CATEGORY_STYLE.other;
              return (
                <button key={c} onClick={() => setFilter(c)} style={{
                  ...B({
                    padding: "6px 12px", borderRadius: RadiusPill,
                    fontSize: 12, fontWeight: 600, fontFamily: Sans,
                    border: "0.5px solid " + (on ? "transparent" : Hairline),
                    background: on ? (c === "all" ? Ink : st.fg) : Paper,
                    color: on ? "#fff" : InkMuted,
                    transition: "all 160ms ease-out",
                  })
                }}>
                  {c === "all"
                    ? (isEn ? "All" : "Tout") + " · " + stats.total
                    : (labels[c] || c) + " · " + stats.byCategory[c]}
                </button>
              );
            })}
          </div>

          {/* Journal groupe par jour */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {groups.map(g => (
              <div key={g.day}>
                <div style={{
                  fontSize: 11, fontWeight: 600,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  color: Coral, marginBottom: 8, fontFamily: Sans,
                }}>{formatDay(g.day, locale)}</div>

                <div style={{
                  background: Paper, borderRadius: RadiusMd,
                  border: "0.5px solid " + Hairline,
                  overflow: "hidden",
                }}>
                  {g.entries.map((e, i) => {
                    const st = CATEGORY_STYLE[e.category] || CATEGORY_STYLE.other;
                    return (
                      <div key={e.id} style={{
                        display: "flex", alignItems: "flex-start", gap: 12,
                        padding: "11px 14px",
                        borderTop: i === 0 ? "none" : "0.5px solid " + Hairline,
                      }}>
                        <span style={{
                          marginTop: 5, width: 8, height: 8, borderRadius: 4,
                          background: st.fg, flexShrink: 0,
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13.5, color: Ink, fontFamily: Sans,
                            lineHeight: 1.45, wordBreak: "break-word",
                          }}>
                            {e.label || e.type}
                          </div>
                          {e.meta && Object.keys(e.meta).length > 0 && (
                            <div style={{
                              fontSize: 11, color: Gray600, fontFamily: Sans,
                              marginTop: 2,
                            }}>
                              {Object.keys(e.meta).map(k => k + ": " + e.meta[k]).join(" · ")}
                            </div>
                          )}
                        </div>
                        <span style={{
                          fontSize: 11, color: Gray400, fontFamily: Sans,
                          fontVariantNumeric: "tabular-nums", flexShrink: 0,
                          marginTop: 2,
                        }}>{formatTime(e.ts, locale)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{
            display: "flex", gap: 8, marginTop: 22, flexWrap: "wrap",
          }}>
            <button onClick={handleCopy} style={{
              ...B({
                flex: "1 1 160px", padding: "11px 14px",
                borderRadius: RadiusSm, border: "0.5px solid " + Hairline,
                background: Paper, color: Ink,
                fontSize: 13, fontWeight: 600, fontFamily: Sans,
              })
            }}>
              {isEn ? "Copy the log" : "Copier le journal"}
            </button>
            <button onClick={handleClear} style={{
              ...B({
                flex: "1 1 160px", padding: "11px 14px",
                borderRadius: RadiusSm, border: "0.5px solid " + Hairline,
                background: Paper, color: Coral,
                fontSize: 13, fontWeight: 600, fontFamily: Sans,
              })
            }}>
              {isEn ? "Erase the log" : "Effacer le journal"}
            </button>
          </div>

          <div style={{
            fontSize: 11, color: Gray600, fontFamily: Sans,
            marginTop: 10, lineHeight: 1.6,
          }}>
            {isEn
              ? "Kept on this browser only, never sent anywhere. The last 400 actions are stored."
              : "Garde uniquement sur ce navigateur, jamais envoye ailleurs. Les 400 dernieres actions sont conservees."}
          </div>
        </>
      )}
    </Sheet>
  );
}
