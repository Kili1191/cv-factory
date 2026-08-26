"use client";

// LA PREUVE VISIBLE QU'ON EST CONNECTE
//
// Avant ce composant, se connecter ne changeait rien a l'ecran. La seule
// trace du compte etait une carte au fond des Reglages : il fallait aller la
// chercher pour savoir si son CV etait sauvegarde ou non.
//
// C'est le pire endroit ou laisser un doute. Quelqu'un qui vient de passer
// une heure sur son CV veut voir, sans cliquer, que son travail est a l'abri.
// Un produit qui ne le montre pas se fait fermer.
//
// Le badge vit donc en bas de la barre laterale, visible en permanence, et
// dit trois choses d'un coup d'oeil :
//
//   - qui est connecte (l'initiale, puis l'adresse quand la barre s'ouvre)
//   - si le CV est bien parti vers le compte (la pastille)
//   - ce que le compte donne acces a de plus (le panneau, au clic)
//
// DECONNECTE, IL NE DISPARAIT PAS
//
// Il devient une invitation. Cacher l'entree du compte a ceux qui n'en ont
// pas est le meilleur moyen de n'avoir personne : ils ne peuvent pas vouloir
// ce qu'ils ne voient pas.

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Ink, InkMuted, Paper, Hairline, Purple, Magenta, Green,
  RadiusMd, RadiusPill, ShadowMd, Sans,
} from "./tokens";

const T = {
  fr: {
    signIn: "Se connecter",
    signInHint: "Garde ton CV sur tous tes appareils",
    signOut: "Deconnexion",
    saved: "CV sauvegarde",
    savingNow: "Envoi en cours",
    offline: "Hors ligne - sera envoye",
    justNow: "a l'instant",
    minsAgo: (n) => `il y a ${n} min`,
    hoursAgo: (n) => `il y a ${n} h`,
    gmailTitle: "Suivre les reponses",
    gmailBody: "Nuvi lit l'expediteur et l'objet de tes mails pour mettre a jour tes candidatures.",
    gmailOn: "Boite mail reliee",
    gmailCta: "Relier Gmail",
    account: "Compte",
  },
  en: {
    signIn: "Sign in",
    signInHint: "Keep your CV on every device",
    signOut: "Sign out",
    saved: "CV saved",
    savingNow: "Saving",
    offline: "Offline - will be sent",
    justNow: "just now",
    minsAgo: (n) => `${n} min ago`,
    hoursAgo: (n) => `${n} h ago`,
    gmailTitle: "Follow the replies",
    gmailBody: "Nuvi reads sender and subject only, to keep your applications up to date.",
    gmailOn: "Mailbox connected",
    gmailCta: "Connect Gmail",
    account: "Account",
  },
};

// "il y a 3 min" plutot qu'une heure exacte : personne ne lit une heure, tout
// le monde lit une fraicheur.
function freshness(at, L) {
  if (!at) return null;
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (s < 60) return L.justNow;
  const m = Math.round(s / 60);
  if (m < 60) return L.minsAgo(m);
  return L.hoursAgo(Math.round(m / 60));
}

export default function AccountBadge({
  user = null,
  status = "off",
  lastSyncAt = null,
  error = null,
  gmailConnected = false,
  expanded = false,
  lang = "fr",
  onSignIn = () => {},
  onSignOut = () => {},
  onConnectGmail = () => {},
}) {
  const L = T[lang === "en" ? "en" : "fr"];
  const [open, setOpen] = useState(false);
  const [ancre, setAncre] = useState(null);
  const [, tick] = useState(0);
  const rootRef = useRef(null);
  const panelRef = useRef(null);

  // LE PANNEAU DOIT SORTIR DE LA BARRE LATERALE
  //
  // Un z-index ne traverse pas son parent : la barre vit dans un contexte
  // d'empilement a 50, donc tout ce qu'elle contient reste sous le bouton
  // Telecharger, qui est a 89 a la racine. Monter le panneau a 120 ne changeait
  // rien - verifie a l'ecran, la Deconnexion restait recouverte.
  //
  // On le rend donc dans <body>, en position fixe, ancre sur la position
  // mesuree du badge au moment de l'ouverture.
  const mesurer = () => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAncre({ left: Math.round(r.right + 10), bottom: Math.round(window.innerHeight - r.bottom) });
  };

  // La fraicheur doit vieillir toute seule : sans ce reveil, "a l'instant"
  // reste affiche une heure apres.
  useEffect(() => {
    if (!open && !expanded) return undefined;
    const id = setInterval(() => tick(n => n + 1), 30000);
    return () => clearInterval(id);
  }, [open, expanded]);

  // Un panneau qui ne se ferme pas au clic exterieur donne l'impression d'un
  // ecran bloque.
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => {
      const dansBadge = rootRef.current && rootRef.current.contains(e.target);
      // Le panneau vit dans <body> : sans ce second test, cliquer dedans le
      // fermerait aussitot et aucun de ses boutons ne serait utilisable.
      const dansPanneau = panelRef.current && panelRef.current.contains(e.target);
      if (!dansBadge && !dansPanneau) setOpen(false);
    };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const signedIn = Boolean(user);
  const initial = String((user && user.email) || "?").charAt(0).toUpperCase();
  const fresh = freshness(lastSyncAt, L);

  // Trois etats, trois couleurs. L'erreur n'est pas rouge : une synchro qui
  // attend n'est pas une panne, et alarmer pour du reseau lent apprend a
  // ignorer les alertes.
  const dot = error ? "#d99a2b" : status === "loading" ? InkMuted : Green;
  const stateLabel = error ? L.offline : status === "loading" ? L.savingNow : L.saved;

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <div
        role="button"
        tabIndex={0}
        aria-label={signedIn ? `${L.account} ${user.email}` : L.signIn}
        onClick={() => {
          if (!signedIn) { onSignIn(); return; }
          if (!open) mesurer();
          setOpen(o => !o);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!signedIn) { onSignIn(); return; }
            if (!open) mesurer();
            setOpen(o => !o);
          }
        }}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "8px 10px", borderRadius: RadiusPill,
          cursor: "pointer", color: InkMuted, fontFamily: Sans,
          background: open ? InkMuted + "0f" : "transparent",
          transition: "background 160ms ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = InkMuted + "0a"; }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = open ? InkMuted + "0f" : "transparent";
        }}
      >
        {/* La pastille est posee SUR l'avatar : meme replie, un coup d'oeil
            a la barre suffit a savoir si le CV est a l'abri. */}
        <span style={{ position: "relative", width: 20, height: 20, flexShrink: 0 }}>
          <span style={{
            width: 20, height: 20, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 700, color: signedIn ? "#fff" : InkMuted,
            background: signedIn
              ? `linear-gradient(135deg, ${Purple}, ${Magenta})`
              : "transparent",
            border: signedIn ? "none" : "1.5px solid currentColor",
          }}>
            {signedIn ? initial : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="12" cy="8" r="3.4"/><path d="M5 20c1.2-3.6 4-5.2 7-5.2s5.8 1.6 7 5.2"/>
              </svg>
            )}
          </span>
          {signedIn && (
            <span aria-hidden style={{
              position: "absolute", right: -1, bottom: -1,
              width: 7, height: 7, borderRadius: "50%",
              background: dot, boxShadow: "0 0 0 1.5px var(--nuvi-cream, #faf8f3)",
            }}/>
          )}
        </span>

        <span style={{
          minWidth: 0,
          opacity: expanded ? 1 : 0,
          transition: "opacity 150ms ease " + (expanded ? "60ms" : "0ms"),
          pointerEvents: expanded ? "auto" : "none",
        }}>
          <span style={{
            display: "block", fontSize: 12.5, fontWeight: 500, color: Ink,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            maxWidth: 150,
          }}>{signedIn ? user.email : L.signIn}</span>
          <span style={{ display: "block", fontSize: 10.5, color: InkMuted, whiteSpace: "nowrap" }}>
            {signedIn ? (fresh ? `${stateLabel} · ${fresh}` : stateLabel) : L.signInHint}
          </span>
        </span>
      </div>

      {open && signedIn && ancre && typeof document !== "undefined" && createPortal(
        <div ref={(n) => { panelRef.current = n; }} style={{
          position: "fixed", left: ancre.left, bottom: ancre.bottom,
          width: 268, padding: 14,
          // Au-dessus du bouton Telecharger (89). En dessous des modales, qui
          // vivent dans les milliers : ce panneau reste un survol, pas un ecran.
          zIndex: 900,
          background: Paper, border: "0.5px solid " + Hairline,
          borderRadius: RadiusMd, boxShadow: ShadowMd,
          fontFamily: Sans, color: Ink,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{
              width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
              background: `linear-gradient(135deg, ${Purple}, ${Magenta})`,
              color: "#fff", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 13, fontWeight: 600,
            }}>{initial}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 12.5, fontWeight: 600,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{user.email}</div>
              <div style={{ fontSize: 11, color: InkMuted, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot }}/>
                {fresh ? `${stateLabel} · ${fresh}` : stateLabel}
              </div>
            </div>
          </div>

          {/* CE QUE LE COMPTE DONNE EN PLUS
              Une seule fonctionnalite est reellement debloquee par le compte,
              et on la propose ICI plutot qu'a l'inscription : reclamer l'acces
              a la boite mail de quelqu'un qui vient d'arriver, c'est le voir
              fermer l'onglet - et il aurait raison. */}
          <div style={{
            padding: "10px 12px", borderRadius: 10, marginBottom: 10,
            background: gmailConnected ? Green + "14" : InkMuted + "0a",
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>
              {gmailConnected ? L.gmailOn : L.gmailTitle}
            </div>
            {!gmailConnected && (
              <>
                <div style={{ fontSize: 11, color: InkMuted, lineHeight: 1.45, marginBottom: 9 }}>
                  {L.gmailBody}
                </div>
                <button
                  onClick={() => { setOpen(false); onConnectGmail(); }}
                  style={{
                    border: "none", cursor: "pointer", fontFamily: "inherit",
                    width: "100%", minHeight: 34, borderRadius: RadiusPill,
                    background: `linear-gradient(135deg, ${Purple}, ${Magenta})`,
                    color: "#fff", fontSize: 12, fontWeight: 600,
                  }}
                >{L.gmailCta}</button>
              </>
            )}
          </div>

          <button
            onClick={() => { setOpen(false); onSignOut(); }}
            style={{
              border: "0.5px solid " + Hairline, cursor: "pointer", fontFamily: "inherit",
              width: "100%", minHeight: 34, borderRadius: RadiusPill,
              background: "transparent", color: InkMuted, fontSize: 12,
            }}
          >{L.signOut}</button>
        </div>,
        document.body
      )}
    </div>
  );
}
