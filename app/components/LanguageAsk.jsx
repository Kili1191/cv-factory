"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * LA QUESTION DE LA LANGUE, POSEE UNE SEULE FOIS
 *
 * Nuvi s'ouvre en anglais par defaut. Un visiteur francais tombait donc sur
 * une interface anglaise sans jamais qu'on lui demande son avis, et devait
 * aller chercher le reglage au fond de la barre laterale pour en sortir.
 *
 * On lui pose donc la question a la premiere visite, avant tout le reste.
 * Trois regles, et elles comptent :
 *
 *   1. On DEMANDE, on ne devine pas. Le navigateur sait souvent la reponse
 *      (navigator.languages), mais il se trompe : un francais en voyage, un
 *      poste de travail configure en anglais, un telephone d'emprunt. La
 *      langue du navigateur ne sert donc qu'a mettre en avant la reponse la
 *      plus probable - le visiteur clique quand meme.
 *
 *   2. On ne la pose qu'une fois. Des qu'un choix existe dans le navigateur,
 *      cet ecran ne revient plus jamais, y compris si le choix est la valeur
 *      par defaut. C'est la difference entre "aucun choix enregistre" et
 *      "choix enregistre = anglais", que lsG(SK.LC, "en") ne sait pas faire :
 *      la page lit donc localStorage directement pour decider.
 *
 *   3. Rien derriere n'est cliquable tant qu'on n'a pas repondu. Un visiteur
 *      qui commence a taper son CV dans une langue puis change tout de suite
 *      apres se retrouverait avec des intitules melanges.
 *
 * Le choix est definitif au sens ou on ne redemande pas - il reste modifiable
 * a tout moment dans Reglages > Langue de l'interface.
 */

// La reponse la plus probable, d'apres le navigateur. On ne s'en sert QUE
// pour poser une pastille "suggere" sur un des deux boutons.
export function langueProbable(langues) {
  const liste = Array.isArray(langues) ? langues : [];
  for (const l of liste) {
    const code = String(l || "").toLowerCase();
    if (code.startsWith("fr")) return "fr";
    if (code.startsWith("en")) return "en";
  }
  return null;
}

const CHOIX = [
  {
    lc: "en",
    nom: "English",
    sousTitre: "Nuvi speaks English",
    drapeau: "EN",
  },
  {
    lc: "fr",
    nom: "Français",
    sousTitre: "Nuvi parle français",
    drapeau: "FR",
  },
];

export default function LanguageAsk({ onChoose }) {
  const [suggere, setSuggere] = useState(null);
  const [entre, setEntre] = useState(false);
  const boutons = useRef({});

  useEffect(() => {
    // navigator n'existe pas au rendu serveur, et le lire pendant le rendu
    // ferait diverger le HTML envoye et le HTML reconstruit dans le
    // navigateur. On le lit donc apres le montage, comme le reste.
    try {
      setSuggere(langueProbable(navigator.languages || [navigator.language]));
    } catch { /* un navigateur sans navigator.languages : pas de suggestion */ }
    const t = setTimeout(() => setEntre(true), 30);
    return () => clearTimeout(t);
  }, []);

  // LE FOCUS SUIT LA SUGGESTION, IL NE LA CONTREDIT PAS
  //
  // Le clavier doit pouvoir repondre sans souris, donc un bouton prend le
  // focus. Mais le cadre de focus se lit comme une preselection : le poser
  // sur "English" pendant que la pastille "suggere" designe le francais
  // donnait deux reponses differentes sur le meme ecran. On attend donc de
  // connaitre la suggestion, et c'est elle qui recoit le focus.
  useEffect(() => {
    const cible = boutons.current[suggere] || boutons.current.en;
    const f = setTimeout(() => { try { cible?.focus(); } catch {} }, 140);
    return () => clearTimeout(f);
  }, [suggere]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose your language / Choisissez votre langue"
      data-nuvi-lang-ask="1"
      style={{
        position: "fixed", inset: 0,
        // 10000, et pas 3000 : les notifications de l'application montent a
        // 9999 et l'indicateur d'enregistrement a 9998. Une synchronisation
        // de compte qui se termine pendant que la question est affichee
        // ferait apparaitre son message PAR-DESSUS. La question doit rester
        // la couche du dessus tant qu'elle n'a pas eu de reponse.
        zIndex: 10000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
        background: "rgba(26, 24, 22, 0.44)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        opacity: entre ? 1 : 0,
        transition: "opacity 260ms ease-out",
      }}
    >
      <div style={{
        width: "100%", maxWidth: 420,
        background: "var(--nuvi-paper, #fffdf9)",
        borderRadius: 22,
        border: "0.5px solid var(--nuvi-hairline, rgba(0,0,0,0.10))",
        boxShadow: "0 24px 60px rgba(26,24,22,0.22)",
        padding: 26,
        textAlign: "center",
        transform: entre ? "translateY(0) scale(1)" : "translateY(10px) scale(0.98)",
        transition: "transform 320ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        <div style={{
          fontFamily: "'Fraunces', 'DM Serif Display', Georgia, serif",
          fontSize: 22, lineHeight: 1.25, fontWeight: 400,
          color: "var(--nuvi-ink, #1a1816)",
          letterSpacing: "-0.02em",
          marginBottom: 6,
        }}>
          Choose your language
        </div>
        <div style={{
          fontSize: 13, lineHeight: 1.5,
          color: "var(--nuvi-ink-muted, #6b655d)",
          marginBottom: 20,
        }}>
          Choisissez votre langue. You can change it at any time in Settings.
        </div>

        {/* Le cadre de focus par defaut du navigateur est jaune vif sur
            certaines plateformes et jure avec le reste. On le remplace, sans
            jamais le supprimer : il porte la reponse suggeree, et quelqu'un
            au clavier n'a que lui pour savoir ou il est. */}
        <style>{`
          [data-nuvi-lang-ask] button:focus-visible {
            outline: 2px solid var(--nuvi-purple, #6b4de6);
            outline-offset: 2px;
          }
        `}</style>
        <div style={{ display: "grid", gap: 10 }}>
          {CHOIX.map((c) => {
            const propose = suggere === c.lc;
            return (
              <button
                key={c.lc}
                ref={(n) => { boutons.current[c.lc] = n; }}
                onClick={() => onChoose(c.lc)}
                lang={c.lc}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  width: "100%", minHeight: 56,
                  padding: "12px 16px",
                  borderRadius: 14,
                  border: "1px solid " + (propose
                    ? "var(--nuvi-purple, #6b4de6)"
                    : "var(--nuvi-hairline, rgba(0,0,0,0.10))"),
                  background: propose
                    ? "rgba(107, 77, 230, 0.06)"
                    : "transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                  transition: "border-color 160ms ease-out, background 160ms ease-out",
                }}
              >
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 34, height: 26, flexShrink: 0,
                  borderRadius: 7,
                  background: "var(--nuvi-cream, #faf8f3)",
                  border: "0.5px solid var(--nuvi-hairline, rgba(0,0,0,0.10))",
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
                  color: "var(--nuvi-ink-muted, #6b655d)",
                }}>{c.drapeau}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    display: "block",
                    fontSize: 15, fontWeight: 600,
                    color: "var(--nuvi-ink, #1a1816)",
                  }}>{c.nom}</span>
                  <span style={{
                    display: "block",
                    fontSize: 12,
                    color: "var(--nuvi-ink-muted, #6b655d)",
                  }}>{c.sousTitre}</span>
                </span>
                {propose && (
                  <span style={{
                    flexShrink: 0,
                    fontSize: 10, fontWeight: 700,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    color: "var(--nuvi-purple, #6b4de6)",
                  }}>{c.lc === "fr" ? "suggéré" : "suggested"}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
