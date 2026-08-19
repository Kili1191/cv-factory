"use client";
import React, { useState } from "react";

/**
 * FormatChoiceModal — Liquid Glass dialog asking user for PDF format.
 * Triggered before downloading the CV. Memorizes choice if "Toujours utiliser".
 *
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   onConfirm: (format: "a4"|"letter"|"legal", alwaysUse: boolean) => void
 *   locale: "fr"|"en"
 */
export default function FormatChoiceModal({ isOpen, onClose, onConfirm, locale = "fr" }) {
  const [selected, setSelected] = useState("a4");
  const [alwaysUse, setAlwaysUse] = useState(false);

  if (!isOpen) return null;

  const isEn = locale === "en";
  const t = {
    eyebrow: isEn ? "DOWNLOAD" : "TELECHARGEMENT",
    title: isEn ? "Choose your format" : "Quel format ?",
    subtitle: isEn
      ? "Recruiters print on A4 in Europe and Letter in the US. Pick the right one for them."
      : "Les recruteurs impriment sur A4 en Europe et Letter aux US. Choisis selon ta cible.",
    a4: {
      label: "A4",
      dim: "210 x 297 mm",
      desc: isEn ? "Europe, UK, world standard" : "Europe, UK, standard mondial",
      badge: isEn ? "RECOMMENDED" : "RECOMMANDE",
    },
    letter: {
      label: "US Letter",
      dim: "215.9 x 279.4 mm (8.5 x 11 in)",
      desc: isEn ? "United States, Canada" : "Etats-Unis, Canada",
    },
    legal: {
      label: "US Legal",
      dim: "215.9 x 355.6 mm (8.5 x 14 in)",
      desc: isEn ? "Long documents, rare" : "Documents longs, rare",
    },
    always: isEn ? "Always use this format" : "Toujours utiliser ce format",
    download: isEn ? "Download" : "Telecharger",
    cancel: isEn ? "Cancel" : "Annuler",
  };

  const FORMATS = [
    { key: "a4", ...t.a4 },
    { key: "letter", ...t.letter },
    { key: "legal", ...t.legal },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fcmFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes fcmSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      ` }} />

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2500,
          background: "rgba(10, 10, 10, 0.5)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          animation: "fcmFadeIn 240ms ease-out",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        {/* Modal card */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 520,
            background: "rgba(250, 248, 243, 0.85)",
            backdropFilter: "blur(40px) saturate(200%)",
            WebkitBackdropFilter: "blur(40px) saturate(200%)",
            borderRadius: 28,
            border: "0.5px solid rgba(232, 227, 214, 0.7)",
            boxShadow:
              "0 24px 60px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.06), inset 0 1.5px 0 rgba(255,255,255,0.7)",
            padding: "28px 28px 24px",
            animation: "fcmSlideUp 320ms cubic-bezier(.32,.72,0,1)",
            fontFamily: "Inter, sans-serif",
            overflow: "hidden",
          }}
        >
          {/* Aurora blob top right */}
          <div style={{
            position: "absolute", top: "-30%", right: "-15%",
            width: 240, height: 240, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(91,61,245,0.22) 0%, transparent 70%)",
            filter: "blur(50px)", pointerEvents: "none",
          }}/>
          {/* Aurora blob bottom left */}
          <div style={{
            position: "absolute", bottom: "-25%", left: "-10%",
            width: 200, height: 200, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(217,119,87,0.2) 0%, transparent 70%)",
            filter: "blur(50px)", pointerEvents: "none",
          }}/>
          {/* Specular highlight */}
          <div style={{
            position: "absolute", top: 0, left: "20%", right: "20%", height: 1.5,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)",
            pointerEvents: "none",
          }}/>

          {/* Header */}
          <div style={{ position: "relative", marginBottom: 18 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "#d97757", marginBottom: 6,
            }}>{t.eyebrow}</div>
            <h2 style={{
              fontFamily: "'Fraunces', serif", fontWeight: 400,
              fontSize: 26, color: "#0a0a0a", margin: 0,
              letterSpacing: "-0.02em", lineHeight: 1.1,
            }}>{t.title}</h2>
            <p style={{
              fontSize: 13, color: "#5a5a62", marginTop: 8, marginBottom: 0,
              lineHeight: 1.5,
            }}>{t.subtitle}</p>
          </div>

          {/* Format cards */}
          <div style={{
            position: "relative",
            display: "flex", flexDirection: "column", gap: 8,
            marginBottom: 18,
          }}>
            {FORMATS.map((f) => {
              const active = selected === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setSelected(f.key)}
                  style={{
                    background: active
                      ? "linear-gradient(135deg, rgba(91,61,245,0.10), rgba(185,28,140,0.08))"
                      : "rgba(255, 255, 255, 0.6)",
                    border: active
                      ? "1.5px solid rgba(91,61,245,0.5)"
                      : "0.5px solid rgba(232,227,214,0.7)",
                    borderRadius: 16,
                    padding: "14px 16px",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 200ms ease-out",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    backdropFilter: "blur(10px)",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {/* Radio indicator */}
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    border: active ? "5.5px solid #5b3df5" : "1.5px solid #c0bba8",
                    background: active ? "#5b3df5" : "transparent",
                    boxShadow: active ? "inset 0 0 0 3px white" : "none",
                    flexShrink: 0,
                    transition: "all 200ms ease-out",
                  }}/>
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      marginBottom: 2,
                    }}>
                      <span style={{
                        fontFamily: "'Fraunces', serif",
                        fontSize: 18, fontWeight: 500, color: "#0a0a0a",
                      }}>{f.label}</span>
                      {f.badge && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                          padding: "3px 8px", borderRadius: 6,
                          background: "linear-gradient(135deg, #5b3df5, #b91c8c)",
                          color: "white",
                        }}>{f.badge}</span>
                      )}
                    </div>
                    <div style={{
                      fontSize: 11, color: "#5a5a62",
                      marginBottom: 2,
                    }}>{f.dim}</div>
                    <div style={{
                      fontSize: 12, color: "#0a0a0a", opacity: 0.7,
                    }}>{f.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* "Always use" checkbox */}
          <label style={{
            position: "relative",
            display: "flex", alignItems: "center", gap: 10,
            cursor: "pointer", marginBottom: 16,
            padding: "8px 4px",
          }}>
            <input
              type="checkbox"
              checked={alwaysUse}
              onChange={(e) => setAlwaysUse(e.target.checked)}
              style={{
                width: 16, height: 16, accentColor: "#5b3df5",
                cursor: "pointer",
              }}
            />
            <span style={{ fontSize: 13, color: "#5a5a62" }}>
              {t.always}
            </span>
          </label>

          {/* Actions */}
          <div style={{ position: "relative", display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: "12px 18px",
                borderRadius: 999,
                background: "rgba(255, 255, 255, 0.6)",
                border: "0.5px solid rgba(232, 227, 214, 0.7)",
                color: "#0a0a0a",
                fontFamily: "Inter, sans-serif",
                fontWeight: 500, fontSize: 14,
                cursor: "pointer",
                backdropFilter: "blur(10px)",
              }}
            >{t.cancel}</button>
            <button
              onClick={() => onConfirm(selected, alwaysUse)}
              style={{
                flex: 2,
                padding: "12px 22px",
                borderRadius: 999,
                background: "linear-gradient(135deg, #5b3df5, #b91c8c)",
                border: "none",
                color: "white",
                fontFamily: "Inter, sans-serif",
                fontWeight: 600, fontSize: 14,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(91,61,245,0.35)",
              }}
            >{t.download}</button>
          </div>
        </div>
      </div>
    </>
  );
}
