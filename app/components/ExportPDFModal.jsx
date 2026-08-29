"use client";

// ExportPDFModal - Modale de choix d'export PDF quand le CV deborde sur plusieurs pages
//
// Cas d'usage :
//   - L'user clique "Telecharger"
//   - Si le CV fait > 1.1 page, on ouvre cette modale au lieu d'exporter direct
//   - L'user choisit : 2 pages / 1 page longue / annuler
//
// Props :
//   open       : boolean
//   onClose    : () => void
//   onTwoPages : () => void   (export A4 multi-pages avec coupure entre sections)
//   onLongPage : () => void   (export 1 page longue, hauteur custom)
//   pageCount  : number       (estimation du nombre de pages, ex: 1.4)
//   T          : i18n
//   lang       : "fr" | "en"
//   mob        : boolean

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

import { Trans } from "./tokens";
const NuviLogo = dynamic(() => import("./NuviLogo"), { ssr: false });
const NuviCompanion = dynamic(() => import("./NuviCompanion"), { ssr: false });

export default function ExportPDFModal({
  open,
  onClose,
  onTwoPages,
  onLongPage,
  pageCount = 1.4,
  T = {},
  lang = "en",
  mob = false,
}) {
  const Cream = "var(--nuvi-cream)";
  const CreamSoft = "var(--nuvi-cream-soft)";
  const Paper = "var(--nuvi-paper)";
  const Ink = "var(--nuvi-ink)";
  const InkMuted = "var(--nuvi-ink-muted)";
  const Hairline = "var(--nuvi-hairline)";
  const Purple = "var(--nuvi-purple)";
  const Magenta = "var(--nuvi-magenta)";
  const PurpleSoft = "var(--nuvi-purple-soft)";

  const [shouldRender, setShouldRender] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      setClosing(false);
    } else if (shouldRender) {
      setClosing(true);
      const t = setTimeout(() => {
        setShouldRender(false);
        setClosing(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open, shouldRender]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && open) onClose(); };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [open, onClose]);

  if (!shouldRender) return null;

  const niceCount = Math.round(pageCount * 10) / 10;

  const tx = lang === "en" ? {
    title_a: "Your CV is",
    title_em: niceCount + " pages",
    title_b: "long.",
    subtitle: "Pick how you want to export it.",
    opt_two_label: "Two A4 pages",
    opt_two_desc: "Standard print format. Sections won't be cut in half.",
    opt_two_badge: "RECOMMENDED",
    opt_long_label: "One long page",
    opt_long_desc: "Single long page, no break. Web-friendly, less standard for print.",
    cancel: "Cancel",
    close: "Close",
  } : {
    title_a: "Ton CV fait",
    title_em: niceCount + " pages",
    title_b: ".",
    subtitle: "Choisis comment l'exporter.",
    opt_two_label: "Deux pages A4",
    opt_two_desc: "Format print standard. On coupe entre les sections.",
    opt_two_badge: "RECOMMANDE",
    opt_long_label: "Une page longue",
    opt_long_desc: "Une seule page longue, sans coupure. Style web, moins standard pour l'impression.",
    cancel: "Annuler",
    close: "Fermer",
  };

  const modalWidth = mob ? "100vw" : 480;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 15, 18, 0.5)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          zIndex: 950,
          opacity: closing ? 0 : 1,
          transition: "opacity 200ms ease-out",
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          ...(mob ? {
            inset: 0,
            display: "flex",
            flexDirection: "column",
          } : {
            top: "50%",
            left: "50%",
            transform: closing
              ? "translate(-50%, -50%) scale(0.96)"
              : "translate(-50%, -50%) scale(1)",
            width: modalWidth,
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
          }),
          background: Paper,
          borderRadius: mob ? 0 : 20,
          boxShadow: "0 24px 60px rgba(0,0,0,0.22)",
          zIndex: 951,
          fontFamily: "'Inter', -apple-system, sans-serif",
          opacity: closing ? 0 : 1,
          transition: Trans(["background","color","border-color","box-shadow","transform","opacity"], "base"),
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "18px 22px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <NuviLogo size={28} inkColor={Ink} />
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: InkMuted,
              cursor: "pointer",
              padding: 6,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = CreamSoft;
              e.currentTarget.style.color = Ink;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = InkMuted;
            }}
            aria-label={tx.close}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={{
          padding: "16px 22px 26px",
          overflowY: "auto",
          flex: mob ? 1 : "none",
        }}>
          {/* NuviCompanion + Title */}
          <div style={{
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
            marginBottom: 22,
          }}>
            <div style={{
              width: 56,
              height: 56,
              flexShrink: 0,
            }}>
              <NuviCompanion mode="idle" size={56} ariaLabel="Nuvi" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 400,
                fontSize: 24,
                lineHeight: 1.1,
                color: Ink,
                margin: 0,
                letterSpacing: "-0.02em",
              }}>
                {tx.title_a}{" "}
                <em style={{
                  fontStyle: "italic",
                  background: "linear-gradient(135deg, " + Purple + ", " + Magenta + ")",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}>{tx.title_em}</em>
                {tx.title_b}
              </h2>
              <p style={{
                fontSize: 13,
                color: InkMuted,
                lineHeight: 1.5,
                margin: "8px 0 0",
              }}>
                {tx.subtitle}
              </p>
            </div>
          </div>

          {/* Option 1 : Two pages (recommended, primary) */}
          <button
            onClick={() => { onTwoPages(); onClose(); }}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 12,
              background: "linear-gradient(135deg, " + Purple + ", " + Magenta + ")",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 12,
              transition: Trans(["background","color","border-color","box-shadow","transform","opacity"], "fast"),
              boxShadow: "0 4px 14px rgba(91, 61, 245, 0.25)",
              position: "relative",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 6px 18px rgba(91, 61, 245, 0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 14px rgba(91, 61, 245, 0.25)";
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(255,255,255,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="8" height="18" rx="1"/>
                <rect x="13" y="3" width="8" height="18" rx="1"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 2,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                {tx.opt_two_label}
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  padding: "2px 6px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.2)",
                }}>{tx.opt_two_badge}</span>
              </div>
              <div style={{
                fontSize: 11,
                opacity: 0.85,
                lineHeight: 1.4,
              }}>{tx.opt_two_desc}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0, opacity: 0.7 }}>
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </button>

          {/* Option 2 : One long page (secondary) */}
          <button
            onClick={() => { onLongPage(); onClose(); }}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 12,
              background: PurpleSoft,
              color: Ink,
              border: "0.5px solid " + Hairline,
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 12,
              transition: Trans(["background","color","border-color","box-shadow","transform","opacity"], "fast"),
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(91, 61, 245, 0.10)";
              e.currentTarget.style.borderColor = Purple;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = PurpleSoft;
              e.currentTarget.style.borderColor = Hairline;
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: Paper,
              color: Purple,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              border: "0.5px solid " + Hairline,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="2" width="12" height="20" rx="1"/>
                <line x1="9" y1="7" x2="15" y2="7"/>
                <line x1="9" y1="11" x2="15" y2="11"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
                <line x1="9" y1="19" x2="13" y2="19"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 2,
              }}>{tx.opt_long_label}</div>
              <div style={{
                fontSize: 11,
                color: InkMuted,
                lineHeight: 1.4,
              }}>{tx.opt_long_desc}</div>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
