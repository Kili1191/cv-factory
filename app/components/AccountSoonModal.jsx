"use client";

// AccountSoonModal - Stub placeholder pour la future authentication
//
// Affiche un teaser "Bientot disponible" avec :
//   - Email input pour preinscription (stocke en localStorage pour le moment)
//   - Liste des benefices a venir (sync multi-device, history infinite, BatchApply)
//   - Bouton "Etre prevenu au lancement"
//
// Quand l'auth Supabase/Stripe sera live, on remplace ce stub par le vrai
// AuthModal. L'API reste : open + onClose.

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

import { Trans } from "./tokens";
const NuviLogo = dynamic(() => import("./NuviLogo"), { ssr: false });
const NuviCompanion = dynamic(() => import("./NuviCompanion"), { ssr: false });

export default function AccountSoonModal({
  open,
  onClose,
  T,
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
  const Green = "var(--nuvi-green)";
  const GreenSoft = "var(--nuvi-green-soft)";

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [shouldRender, setShouldRender] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      setClosing(false);
      // Restore prior email if any
      try {
        const prior = localStorage.getItem("nv-waitlist-email") || "";
        if (prior) {
          setEmail(prior);
          setSubmitted(true);
        }
      } catch (e) {}
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

  const tx = lang === "en" ? {
    eyebrow: "COMING SOON",
    title_a: "Your CVs,",
    title_em: "everywhere",
    title_b: "you go.",
    subtitle: "Sync across devices. Unlimited history. Batch apply to 10 jobs at once.",
    benefit_1: "Save every CV version to the cloud",
    benefit_2: "Access from any device, any browser",
    benefit_3: "BatchApply Pro : 10 applications in 5 min",
    email_label: "Be the first to know",
    email_placeholder: "your@email.com",
    submit: "Notify me",
    submitted: "You're on the list. Thanks!",
    submitted_sub: "We'll email you the day accounts go live.",
    invalid: "Please enter a valid email.",
    close: "Close",
  } : {
    eyebrow: "BIENTOT DISPONIBLE",
    title_a: "Tes CV,",
    title_em: "partout",
    title_b: "ou tu vas.",
    subtitle: "Sync sur tous tes appareils. Historique illimite. BatchApply a 10 offres en 5 min.",
    benefit_1: "Sauvegarde chaque version dans le cloud",
    benefit_2: "Acces depuis n'importe quel appareil",
    benefit_3: "BatchApply Pro : 10 candidatures en 5 min",
    email_label: "Sois prevenu au lancement",
    email_placeholder: "ton@email.com",
    submit: "Me prevenir",
    submitted: "Tu es sur la liste. Merci !",
    submitted_sub: "On t'envoie un mail le jour du lancement.",
    invalid: "Email invalide.",
    close: "Fermer",
  };

  const handleSubmit = () => {
    const e = (email || "").trim();
    // Basic email validation
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return;
    }
    try {
      localStorage.setItem("nv-waitlist-email", e);
      localStorage.setItem("nv-waitlist-date", new Date().toISOString());
    } catch (err) {}
    setSubmitted(true);
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
          zIndex: 800,
          opacity: closing ? 0 : 1,
          transition: "opacity 200ms ease-out",
          animation: !closing ? "nuviAccountFadeIn 220ms ease-out" : undefined,
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
          zIndex: 801,
          fontFamily: "'Inter', -apple-system, sans-serif",
          opacity: closing ? 0 : 1,
          transition: Trans(["background","color","border-color","box-shadow","transform","opacity"], "base"),
          animation: !closing ? "nuviAccountIn 280ms cubic-bezier(0.22, 1, 0.36, 1)" : undefined,
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
          {/* Eyebrow + Title */}
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: Purple,
            marginBottom: 8,
          }}>{tx.eyebrow}</div>

          <h2 style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 400,
            fontSize: 30,
            lineHeight: 1.05,
            color: Ink,
            margin: 0,
            letterSpacing: "-0.025em",
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
            lineHeight: 1.55,
            margin: "12px 0 22px",
          }}>{tx.subtitle}</p>

          {/* NuviCompanion + benefits */}
          <div style={{
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
            padding: "16px 16px",
            borderRadius: 14,
            background: CreamSoft,
            marginBottom: 22,
          }}>
            <div style={{
              width: 52,
              height: 52,
              flexShrink: 0,
            }}>
              <NuviCompanion mode="idle" size={52} ariaLabel="Nuvi" />
            </div>
            <ul style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              flex: 1,
            }}>
              {[tx.benefit_1, tx.benefit_2, tx.benefit_3].map((b, i) => (
                <li key={i} style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  fontSize: 12,
                  color: Ink,
                  lineHeight: 1.5,
                }}>
                  <span style={{
                    color: Purple,
                    flexShrink: 0,
                    marginTop: 2,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Email form OR submitted state */}
          {!submitted ? (
            <>
              <label style={{
                display: "block",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: Purple,
                marginBottom: 8,
              }}>
                {tx.email_label}
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                  placeholder={tx.email_placeholder}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    borderRadius: 999,
                    border: "0.5px solid " + Hairline,
                    background: Paper,
                    color: Ink,
                    fontSize: 13,
                    fontFamily: "inherit",
                    outline: "none",
                    transition: "border-color 150ms ease",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = Purple; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = Hairline; }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!email.trim()}
                  style={{
                    padding: "12px 20px",
                    borderRadius: 999,
                    background: email.trim()
                      ? "linear-gradient(135deg, " + Purple + ", " + Magenta + ")"
                      : Hairline,
                    color: email.trim() ? "#fff" : InkMuted,
                    border: "none",
                    cursor: email.trim() ? "pointer" : "not-allowed",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    transition: Trans(["background","color","border-color","box-shadow","transform","opacity"], "fast"),
                    boxShadow: email.trim() ? "0 4px 14px rgba(91, 61, 245, 0.25)" : "none",
                    flexShrink: 0,
                  }}
                >
                  {tx.submit}
                </button>
              </div>
            </>
          ) : (
            <div style={{
              padding: "16px 18px",
              borderRadius: 14,
              background: GreenSoft,
              border: "0.5px solid " + Green,
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: Green,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: Ink,
                  marginBottom: 4,
                }}>{tx.submitted}</div>
                <div style={{
                  fontSize: 12,
                  color: InkMuted,
                  lineHeight: 1.5,
                }}>{tx.submitted_sub}</div>
              </div>
            </div>
          )}
        </div>

        <style>{`
          @keyframes nuviAccountFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes nuviAccountIn {
            0% {
              opacity: 0;
              transform: translate(-50%, -48%) scale(0.94);
            }
            100% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
          }
        `}</style>
      </div>
    </>
  );
}
