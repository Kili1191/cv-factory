"use client";

// Ecran de connexion.
//
// PARTI PRIS : AUCUN MOT DE PASSE
//
// Un mot de passe est une friction pure sur ce produit. Il faut l'inventer,
// le retenir, le reinitialiser, et il n'ajoute aucune securite qu'un lien
// envoye par courriel n'apporte deja. Deux chemins seulement :
//
//   Google, un bouton, zero saisie.
//   Un courriel, un lien, zero mot de passe a retenir.
//
// La session est ensuite conservee et renouvelee toute seule (voir
// supabaseClient.js), donc on ne redemande jamais de se reconnecter.
//
// L'ecran se ferme aussi sans se connecter : le compte sert a retrouver son
// CV ailleurs, il n'est pas un peage a l'entree du produit.

import React, { useEffect, useRef, useState } from "react";
import { signInWithEmail, signInWithGoogle } from "../../lib/cloudSync.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function AuthSheet({ open, onClose, locale = "en" }) {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | sending | sent | error
  const [message, setMessage] = useState("");
  const inputRef = useRef(null);

  const T = locale === "en" ? {
    title: "Keep your CV",
    sub: "Sign in and your CV follows you to every device. No password to remember.",
    google: "Continue with Google",
    or: "or",
    email: "Your email address",
    send: "Send me a link",
    sending: "Sending...",
    sentTitle: "Check your inbox",
    sentBody: "We sent a link to",
    sentHint: "Open it on this device and you are in. The link works once.",
    bad: "That email address does not look right.",
    later: "Later",
    close: "Close",
    reassure: "Your CV stays on this device either way.",
  } : {
    title: "Garde ton CV",
    sub: "Connecte-toi et ton CV te suit sur tous tes appareils. Aucun mot de passe a retenir.",
    google: "Continuer avec Google",
    or: "ou",
    email: "Ton adresse e-mail",
    send: "Envoie-moi un lien",
    sending: "Envoi...",
    sentTitle: "Regarde ta boite mail",
    sentBody: "On a envoye un lien a",
    sentHint: "Ouvre-le sur cet appareil et c'est fait. Le lien ne sert qu'une fois.",
    bad: "Cette adresse ne ressemble pas a un e-mail.",
    later: "Plus tard",
    close: "Fermer",
    reassure: "Dans tous les cas, ton CV reste sur cet appareil.",
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 260);
    return () => { window.removeEventListener("keydown", onKey); clearTimeout(t); };
  }, [open, onClose]);

  useEffect(() => { if (open) { setPhase("idle"); setMessage(""); } }, [open]);

  if (!open) return null;

  const submit = async (e) => {
    if (e) e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) { setPhase("error"); setMessage(T.bad); return; }
    setPhase("sending");
    try {
      await signInWithEmail(value);
      setPhase("sent");
    } catch (err) {
      setPhase("error");
      setMessage((err && err.message) || "Envoi impossible");
    }
  };

  const google = async () => {
    setPhase("sending");
    try { await signInWithGoogle(); }
    catch (err) { setPhase("error"); setMessage((err && err.message) || "Connexion impossible"); }
  };

  const field = {
    width: "100%", minHeight: 52, padding: "0 16px",
    borderRadius: 12, border: "1px solid var(--nuvi-hairline, #e8e3d6)",
    background: "var(--nuvi-paper, #fff)", color: "var(--nuvi-ink, #0a0a0a)",
    fontSize: 16, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={T.title}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 6000,
        background: "rgba(10,10,10,.5)",
        WebkitBackdropFilter: "blur(10px)", backdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, animation: "authFade 180ms ease-out",
        // AUCUNE POLICE N'ETAIT DECLAREE ICI
        //
        // Rien dans la feuille de style ne pose de famille sur body, et cette
        // feuille vit hors de [data-cvf="app"] : le navigateur retombait donc
        // sur sa serif par defaut, Times New Roman. Ce n'etait pas un choix
        // typographique discutable, c'etait l'absence de choix - et ca se voit
        // exactement au moment ou l'on demande a quelqu'un de se connecter,
        // c'est-a-dire au moment ou il decide si le site merite son adresse.
        //
        // Tous les enfants heritent, puisqu'ils declarent fontFamily:"inherit".
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 400,
          background: "var(--nuvi-cream, #faf8f3)",
          borderRadius: 22, padding: "30px 26px 24px",
          boxShadow: "0 30px 90px rgba(0,0,0,.3)",
          animation: "authRise 260ms cubic-bezier(.22,1,.36,1)",
        }}
      >
        {phase === "sent" ? (
          <>
            <div style={{
              width: 46, height: 46, borderRadius: 14, marginBottom: 18,
              background: "var(--nuvi-purple-soft, #ede9fe)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="var(--nuvi-purple, #5b3df5)" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>
              </svg>
            </div>
            <h2 style={{
              margin: "0 0 10px", fontSize: 23, fontWeight: 600,
              letterSpacing: "-.02em", color: "var(--nuvi-ink, #0a0a0a)",
            }}>{T.sentTitle}</h2>
            <p style={{ margin: "0 0 6px", fontSize: 15, color: "var(--nuvi-ink-muted, #5a5a62)", lineHeight: 1.5 }}>
              {T.sentBody} <strong style={{ color: "var(--nuvi-ink, #0a0a0a)" }}>{email.trim()}</strong>
            </p>
            <p style={{ margin: "0 0 22px", fontSize: 14, color: "var(--nuvi-ink-muted, #5a5a62)", lineHeight: 1.5 }}>
              {T.sentHint}
            </p>
            <button onClick={onClose} style={{
              width: "100%", minHeight: 52, borderRadius: 12, border: "none",
              background: "var(--nuvi-ink, #0a0a0a)", color: "#fff",
              fontSize: 15, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
            }}>{T.close}</button>
          </>
        ) : (
          <>
            <h2 style={{
              margin: "0 0 8px", fontSize: 24, fontWeight: 650,
              letterSpacing: "-.025em", color: "var(--nuvi-ink, #0a0a0a)",
              fontFamily: "inherit",
            }}>{T.title}</h2>
            <p style={{
              margin: "0 0 24px", fontSize: 15, lineHeight: 1.5,
              color: "var(--nuvi-ink-muted, #5a5a62)",
            }}>{T.sub}</p>

            <button
              onClick={google}
              disabled={phase === "sending"}
              style={{
                width: "100%", minHeight: 52, borderRadius: 12,
                border: "1px solid var(--nuvi-hairline, #e8e3d6)",
                background: "var(--nuvi-paper, #fff)", color: "var(--nuvi-ink, #0a0a0a)",
                fontSize: 15, fontWeight: 600, fontFamily: "inherit",
                cursor: phase === "sending" ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.84C6.71 7.29 9.14 5.38 12 5.38z"/>
              </svg>
              {T.google}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
              <div style={{ flex: 1, height: 1, background: "var(--nuvi-hairline, #e8e3d6)" }} />
              <span style={{ fontSize: 12, color: "var(--nuvi-ink-muted, #5a5a62)" }}>{T.or}</span>
              <div style={{ flex: 1, height: 1, background: "var(--nuvi-hairline, #e8e3d6)" }} />
            </div>

            <form onSubmit={submit}>
              <input
                ref={inputRef}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={T.email}
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (phase === "error") setPhase("idle"); }}
                style={{
                  ...field,
                  borderColor: phase === "error"
                    ? "var(--nuvi-coral, #d97757)"
                    : "var(--nuvi-hairline, #e8e3d6)",
                  marginBottom: 10,
                }}
              />
              <button
                type="submit"
                disabled={phase === "sending"}
                style={{
                  width: "100%", minHeight: 52, borderRadius: 12, border: "none",
                  background: "linear-gradient(135deg, var(--nuvi-purple, #5b3df5), var(--nuvi-magenta, #b91c8c))",
                  color: "#fff", fontSize: 15, fontWeight: 600, fontFamily: "inherit",
                  cursor: phase === "sending" ? "default" : "pointer",
                  opacity: phase === "sending" ? .7 : 1,
                }}
              >{phase === "sending" ? T.sending : T.send}</button>
            </form>

            {phase === "error" && message && (
              <p role="alert" style={{
                margin: "12px 0 0", fontSize: 13.5, lineHeight: 1.45,
                color: "var(--nuvi-coral, #d97757)",
              }}>{message}</p>
            )}

            <p style={{
              margin: "20px 0 0", fontSize: 12.5, textAlign: "center",
              color: "var(--nuvi-ink-muted, #5a5a62)",
            }}>{T.reassure}</p>

            <button onClick={onClose} style={{
              width: "100%", minHeight: 44, marginTop: 10, border: "none",
              background: "transparent", color: "var(--nuvi-ink-muted, #5a5a62)",
              fontSize: 14, fontFamily: "inherit", cursor: "pointer",
            }}>{T.later}</button>
          </>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes authFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes authRise {
          from { opacity: 0; transform: translateY(14px) scale(.98) }
          to { opacity: 1; transform: none }
        }
        @media (prefers-reduced-motion: reduce) {
          [role="dialog"] { animation: none !important }
          [role="dialog"] > div { animation: none !important }
        }
      ` }} />
    </div>
  );
}
