"use client";

import React, { useState } from "react";

/**
 * QUAND LA CONNEXION ECHOUE, IL FAUT QUE CA SE VOIE
 *
 * Le fournisseur d'identite renvoie le visiteur sur l'accueil avec l'echec
 * dans l'adresse :
 *
 *   thenuvi.com/?error=server_error&error_code=unexpected_failure
 *                &error_description=Unable+to+exchange+external+code...
 *
 * L'application ne lisait que `go` et `gmail`. Elle ignorait `error`. Donc
 * la page se chargeait normalement, rien ne s'affichait, et la seule trace
 * de l'echec etait une barre d'adresse que personne ne lit.
 *
 * Vu du visiteur : il clique "Continuer avec Google", choisit son compte,
 * revient sur Nuvi... et il n'est pas connecte. Sans explication. Il
 * recommence, ca rate encore, et il s'en va en pensant que le site est
 * casse. C'est le pire moment possible pour se taire : il venait
 * d'accepter de donner son adresse.
 *
 * TROIS REGLES POUR CE MESSAGE
 *
 * 1. Ne jamais accuser la personne. L'echec est presque toujours une
 *    configuration de notre cote ; elle n'a rien fait de travers.
 * 2. Rassurer sur le CV. Quelqu'un qui voit "echec" pense d'abord a ce
 *    qu'il a ecrit. Le CV vit dans ce navigateur et n'a pas bouge.
 * 3. Donner le code technique en petit. Le visiteur n'en fera rien, mais
 *    c'est la seule chose qui permet de reparer - et sans elle, le
 *    proprietaire du site doit reproduire l'echec pour le diagnostiquer.
 */

// Ce que le fournisseur dit, traduit en ce que ca veut dire.
//
// "Unable to exchange external code" est le cas le plus frequent et le plus
// mal nomme : Google a bien accepte la personne - l'ecran de choix du compte
// s'affiche - et c'est l'ECHANGE qui suit qui echoue. Autrement dit le
// secret client enregistre cote serveur ne correspond plus a celui de la
// console Google.
function expliquer(desc, code, locale) {
  const d = String(desc || "").toLowerCase();
  const en = locale === "en";
  if (d.includes("exchange external code")) {
    return en
      ? "The sign-in provider accepted you, but the handshake with our server failed. This is a setting on our side, not something you did."
      : "Le fournisseur t'a bien reconnu, mais l'echange avec notre serveur a echoue. C'est un reglage de notre cote, pas une erreur de ta part.";
  }
  if (d.includes("access_denied") || String(code || "").includes("access_denied")) {
    return en
      ? "The sign-in window was closed before it finished."
      : "La fenetre de connexion a ete fermee avant la fin.";
  }
  if (d.includes("expired") || d.includes("otp")) {
    return en
      ? "That sign-in link has expired. Links are valid for a short time only."
      : "Ce lien de connexion a expire. Les liens ne sont valables que peu de temps.";
  }
  return en
    ? "Sign-in did not complete. This is usually a setting on our side."
    : "La connexion n'est pas allee au bout. C'est en general un reglage de notre cote.";
}

export default function SignInFailed({ code, description, locale = "en", onRetry, onClose }) {
  const [detail, setDetail] = useState(false);
  const en = locale === "en";

  return (
    <div
      role="alert"
      data-nuvi-signin-failed="1"
      style={{
        position: "fixed",
        // Sous la ligne d'en-tete, pas par-dessus : ce message informe, il
        // n'interrompt pas. Le CV reste utilisable derriere.
        top: "max(14px, env(safe-area-inset-top))",
        left: "50%", transform: "translateX(-50%)",
        width: "min(440px, calc(100vw - 32px))",
        zIndex: 9990,
        background: "var(--nuvi-paper, #fff)",
        border: "1px solid var(--nuvi-coral, #d97757)",
        borderRadius: 14,
        boxShadow: "0 16px 44px rgba(26,24,22,.18)",
        padding: "14px 16px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
        <span style={{
          flexShrink: 0, width: 22, height: 22, borderRadius: "50%",
          background: "var(--nuvi-coral-soft, #fce7dd)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginTop: 1,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="var(--nuvi-coral, #d97757)" strokeWidth="2.4" strokeLinecap="round">
            <line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="17" x2="12" y2="17"/>
          </svg>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 650, color: "var(--nuvi-ink, #0a0a0a)",
            letterSpacing: "-0.01em",
          }}>
            {en ? "Sign-in didn't work" : "La connexion n'a pas marche"}
          </div>
          <div style={{
            fontSize: 12.5, lineHeight: 1.5, marginTop: 3,
            color: "var(--nuvi-ink-muted, #5a5a62)",
          }}>
            {expliquer(description, code, locale)}
          </div>
          {/* Le CV d'abord : c'est la premiere inquietude de quelqu'un qui
              voit le mot "echec" sur un site ou il a ecrit quelque chose. */}
          <div style={{
            fontSize: 12.5, lineHeight: 1.5, marginTop: 6,
            color: "var(--nuvi-ink, #0a0a0a)", fontWeight: 550,
          }}>
            {en
              ? "Your CV is safe on this device. Nothing was lost."
              : "Ton CV est intact sur cet appareil. Rien n'a ete perdu."}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 11, flexWrap: "wrap" }}>
            {onRetry && (
              <button onClick={onRetry} style={{
                minHeight: 44, padding: "0 16px", borderRadius: 999, border: "none",
                background: "linear-gradient(135deg,#5b3df5,#b91c8c)", color: "#fff",
                fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
              }}>{en ? "Try again" : "Reessayer"}</button>
            )}
            <button onClick={onClose} style={{
              minHeight: 44, padding: "0 14px", borderRadius: 999,
              border: "1px solid var(--nuvi-hairline, #e8e3d6)",
              background: "transparent", color: "var(--nuvi-ink, #0a0a0a)",
              fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer",
            }}>{en ? "Continue without an account" : "Continuer sans compte"}</button>
          </div>

          {/* LE CODE TECHNIQUE, EN PETIT ET REPLIE
              Le visiteur n'en fera rien. Mais c'est la seule chose qui permet
              de reparer : sans elle, il faut reproduire l'echec pour savoir
              ce qui a lache. Replie, pour ne pas transformer un message
              rassurant en page d'erreur. */}
          {(code || description) && (
            <div style={{ marginTop: 9 }}>
              <button
                onClick={() => setDetail((v) => !v)}
                style={{
                  border: "none", background: "transparent", padding: "4px 0",
                  color: "var(--nuvi-ink-muted, #5a5a62)", fontSize: 11,
                  fontFamily: "inherit", cursor: "pointer", textDecoration: "underline",
                }}>
                {detail
                  ? (en ? "Hide details" : "Masquer le detail")
                  : (en ? "Technical details" : "Detail technique")}
              </button>
              {detail && (
                <div style={{
                  marginTop: 5, padding: "8px 10px", borderRadius: 8,
                  background: "var(--nuvi-cream-soft, #f6f2e8)",
                  fontSize: 11, lineHeight: 1.5, wordBreak: "break-word",
                  color: "var(--nuvi-ink-muted, #5a5a62)",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}>
                  {code ? `code: ${code}` : null}
                  {code && description ? <br/> : null}
                  {description || null}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
