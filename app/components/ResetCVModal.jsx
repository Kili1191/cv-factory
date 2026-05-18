"use client";

// ResetCVModal - Modale de confirmation avant Reset CV
//
// 3 chemins proposes a l'utilisateur :
//   1. Sauvegarder en local (snapshot dans Versions multi-CV puis reset)
//   2. Creer un compte (STUB : placeholder en attendant l'auth Supabase/Stripe)
//   3. Effacer sans sauvegarder (destructeur, double confirmation visuelle)
//
// Design : palette Nuvi v3, NuviLogo top-left, gradient Purple->Magenta sur CTA
// principal, Coral pour "destructive" action.
//
// Props :
//   open       : boolean
//   onClose    : () => void
//   onSaveAndReset : () => void  (snapshot puis reset)
//   onAccountStub : () => void   (ouvre stub "Bientot disponible")
//   onResetWithoutSave : () => void (efface direct, double confirm)
//   T          : translations
//   lang       : "fr" | "en"
//   mob        : boolean (mobile fullscreen vs desktop centered)

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const NuviLogo = dynamic(() => import("./NuviLogo"), { ssr: false });
const NuviCompanion = dynamic(() => import("./NuviCompanion"), { ssr: false });

export default function ResetCVModal({
  open,
  onClose,
  onSaveAndReset,
  onAccountStub,
  onResetWithoutSave,
  T,
  lang = "fr",
  mob = false,
}) {
  // Couleurs Nuvi v3 (CSS variables - support dark mode)
  const Cream = "var(--nuvi-cream)";
  const CreamSoft = "var(--nuvi-cream-soft)";
  const Paper = "var(--nuvi-paper)";
  const Ink = "var(--nuvi-ink)";
  const InkMuted = "var(--nuvi-ink-muted)";
  const Hairline = "var(--nuvi-hairline)";
  const Coral = "var(--nuvi-coral)";
  const CoralSoft = "var(--nuvi-coral-soft)";
  const Purple = "var(--nuvi-purple)";
  const Magenta = "var(--nuvi-magenta)";
  const PurpleSoft = "var(--nuvi-purple-soft)";

  // 2-step confirmation pour l'action destructive
  const [confirmDestroy, setConfirmDestroy] = useState(false);
  const [shouldRender, setShouldRender] = useState(open);
  const [closing, setClosing] = useState(false);

  // Anim entree/sortie
  useEffect(() => {
    if (open) {
      setShouldRender(true);
      setClosing(false);
      setConfirmDestroy(false); // reset state quand on rouvre
    } else if (shouldRender) {
      setClosing(true);
      const t = setTimeout(() => {
        setShouldRender(false);
        setClosing(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open, shouldRender]);

  // Lock body scroll quand ouverte
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  // Escape pour fermer
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && open) onClose(); };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [open, onClose]);

  if (!shouldRender) return null;

  // Textes localises
  const tx = lang === "en" ? {
    title_a: "Start a",
    title_em: "fresh",
    title_b: "CV?",
    subtitle: "Your current CV will be erased. Save it first to keep it.",
    opt_save_label: "Save locally first",
    opt_save_desc: "Snapshot to Versions, then start fresh.",
    opt_account_label: "Save to my account",
    opt_account_desc: "Coming soon. Sign in to keep your CVs across devices.",
    opt_account_badge: "SOON",
    opt_destroy_label: "Erase without saving",
    opt_destroy_desc: "Permanent. Can't be undone.",
    confirm_destroy_q: "Sure? This cannot be undone.",
    confirm_destroy_yes: "Yes, erase everything",
    confirm_destroy_no: "Cancel",
    cancel: "Cancel",
  } : {
    title_a: "Commencer un",
    title_em: "nouveau",
    title_b: "CV ?",
    subtitle: "Ton CV actuel sera efface. Sauvegarde-le d'abord pour le garder.",
    opt_save_label: "Sauvegarder en local",
    opt_save_desc: "Snapshot dans tes Versions, puis on recommence.",
    opt_account_label: "Sauvegarder sur mon compte",
    opt_account_desc: "Bientot. Connecte-toi pour garder tes CV partout.",
    opt_account_badge: "BIENTOT",
    opt_destroy_label: "Effacer sans sauvegarder",
    opt_destroy_desc: "Definitif. Pas d'annulation possible.",
    confirm_destroy_q: "Tu es sur ? Action irreversible.",
    confirm_destroy_yes: "Oui, tout effacer",
    confirm_destroy_no: "Annuler",
    cancel: "Annuler",
  };

  const modalWidth = mob ? "100vw" : 460;
  const modalHeight = mob ? "100vh" : "auto";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 15, 18, 0.45)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          zIndex: 700,
          opacity: closing ? 0 : 1,
          transition: "opacity 200ms ease-out",
          animation: !closing ? "nuviResetFadeIn 220ms ease-out" : undefined,
        }}
        aria-hidden="true"
      />

      {/* Modal centered */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tx.title_a + " " + tx.title_em + " " + tx.title_b}
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
          zIndex: 701,
          fontFamily: "'Inter', -apple-system, sans-serif",
          opacity: closing ? 0 : 1,
          transition: "all 220ms cubic-bezier(0.22, 1, 0.36, 1)",
          animation: !closing ? "nuviResetModalIn 280ms cubic-bezier(0.22, 1, 0.36, 1)" : undefined,
          overflow: "hidden",
        }}
      >
        {/* Header avec NuviLogo top-left */}
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
              transition: "all 150ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = CreamSoft;
              e.currentTarget.style.color = Ink;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = InkMuted;
            }}
            aria-label={tx.cancel}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{
          padding: "16px 22px 22px",
          overflowY: "auto",
          flex: mob ? 1 : "none",
        }}>
          {/* NuviCompanion + Title */}
          <div style={{
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
            marginBottom: 18,
          }}>
            <div style={{
              width: 56,
              height: 56,
              flexShrink: 0,
              marginTop: 2,
            }}>
              <NuviCompanion mode="idle" size={56} ariaLabel="Nuvi" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 400,
                fontSize: 26,
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
                }}>{tx.title_em}</em>{" "}
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

          {/* Choix 1 : Sauvegarder en local (gradient Purple->Magenta) */}
          {!confirmDestroy && (
            <>
              <button
                onClick={() => { onSaveAndReset(); onClose(); }}
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
                  transition: "all 180ms ease",
                  boxShadow: "0 4px 14px rgba(91, 61, 245, 0.25)",
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
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 2,
                  }}>{tx.opt_save_label}</div>
                  <div style={{
                    fontSize: 11,
                    opacity: 0.85,
                    lineHeight: 1.4,
                  }}>{tx.opt_save_desc}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{ flexShrink: 0, opacity: 0.7 }}>
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
              </button>

              {/* Choix 2 : Compte (STUB - bientot disponible) */}
              <button
                onClick={() => onAccountStub()}
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
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  transition: "all 150ms ease",
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
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
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
                    {tx.opt_account_label}
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      padding: "2px 6px",
                      borderRadius: 999,
                      background: Purple,
                      color: "#fff",
                    }}>{tx.opt_account_badge}</span>
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: InkMuted,
                    lineHeight: 1.4,
                  }}>{tx.opt_account_desc}</div>
                </div>
              </button>

              {/* Choix 3 : Detruire (Coral, destructif) */}
              <button
                onClick={() => setConfirmDestroy(true)}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  borderRadius: 12,
                  background: Paper,
                  color: InkMuted,
                  border: "0.5px solid " + Hairline,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  transition: "all 150ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = CoralSoft;
                  e.currentTarget.style.borderColor = Coral;
                  e.currentTarget.style.color = "#993C1D";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = Paper;
                  e.currentTarget.style.borderColor = Hairline;
                  e.currentTarget.style.color = InkMuted;
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: CoralSoft,
                  color: Coral,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 500,
                    marginBottom: 2,
                  }}>{tx.opt_destroy_label}</div>
                  <div style={{
                    fontSize: 11,
                    lineHeight: 1.4,
                    opacity: 0.75,
                  }}>{tx.opt_destroy_desc}</div>
                </div>
              </button>
            </>
          )}

          {/* Confirmation 2-step pour destruction */}
          {confirmDestroy && (
            <div style={{
              padding: "20px 18px",
              borderRadius: 14,
              background: CoralSoft,
              border: "1px solid " + Coral,
              animation: "nuviResetConfirmIn 220ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}>
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#993C1D",
                marginBottom: 16,
                lineHeight: 1.4,
              }}>
                {tx.confirm_destroy_q}
              </div>
              <div style={{
                display: "flex",
                gap: 10,
                flexDirection: "column",
              }}>
                <button
                  onClick={() => { onResetWithoutSave(); onClose(); }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 999,
                    background: Coral,
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    transition: "all 150ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#993C1D";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = Coral;
                  }}
                >
                  {tx.confirm_destroy_yes}
                </button>
                <button
                  onClick={() => setConfirmDestroy(false)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 999,
                    background: "transparent",
                    color: "#993C1D",
                    border: "0.5px solid " + Coral,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: "inherit",
                    transition: "all 150ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(217, 119, 87, 0.10)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {tx.confirm_destroy_no}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Animations */}
        <style>{`
          @keyframes nuviResetFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes nuviResetModalIn {
            0% {
              opacity: 0;
              transform: translate(-50%, -48%) scale(0.94);
            }
            100% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
          }
          @keyframes nuviResetConfirmIn {
            from {
              opacity: 0;
              transform: translateY(-6px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </>
  );
}
