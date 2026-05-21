"use client";

import React, { useState, useEffect, useRef } from "react";
import NuviCompanion from "./NuviCompanion";

/**
 * NuviHome v5 : Demarrage "avant / apres" (Direction D, verdict panel 2026-05-21)
 *
 * Remplace l'ancien processus (compagnon spin -> texte lettre par lettre 9,5s
 * -> 2 modes Generate/Upload -> chargement). Nouveau flow, 0 token, instantane :
 *
 *   Temps 1 : phrase d'accueil INSTANTANEE (plus de typewriter lent)
 *   Temps 2 : le WOW. Un CV banal se transforme en CV percutant sous les yeux
 *             du visiteur (avant -> apres, reecrit ligne par ligne). Joue 1 fois
 *             automatiquement + bouton "Rejouer". 2 exemples qui alternent.
 *   Temps 3 : le CHOIX, APRES la valeur : "Envie de ca pour le mien" (onGenerate)
 *             / "J'ai deja un CV" (onImport).
 *
 * Aucun appel IA ici : les exemples sont pre-faits en local. L'IA ne se declenche
 * que plus tard, quand le visiteur a fourni de la vraie matiere (modales Adjust,
 * Match, Generate...). Coherent avec la logique anti-gaspillage de tokens.
 *
 * Props identiques a v4 : lang, mob, userName, onGenerate, onImport, onCoachOpen.
 */

const TEXT = {
  fr: {
    title: "Voila ce que je fais aux",
    titleAccent: "CV",
    sub: "Regarde la difference. Aucune inscription, juste un apercu.",
    before: "Avant",
    after: "Apres",
    replay: "Rejouer",
    transforming: "Nuvi reecrit...",
    ctaMain: "Envie de ca pour le mien",
    ctaImport: "J'ai deja un CV",
    coachLabel: "Coach",
  },
  en: {
    title: "Here's what I do to a",
    titleAccent: "resume",
    sub: "See the difference. No signup, just a preview.",
    before: "Before",
    after: "After",
    replay: "Replay",
    transforming: "Nuvi is rewriting...",
    ctaMain: "I want this for mine",
    ctaImport: "I already have a CV",
    coachLabel: "Coach",
  },
};

/**
 * Les 2 exemples avant/apres (alternent a chaque rejouer).
 * "before" = plat, vague, sans chiffres. "after" = percutant, chiffre, verbes
 * d'action. Le contraste DOIT etre fort (condition du panel).
 */
const EXAMPLES = {
  fr: [
    {
      name: "Thomas Martin",
      beforeTitle: "Commercial",
      afterTitle: "Responsable Commercial B2B : +40% de CA en 2 ans",
      before: [
        "Responsable des ventes dans une entreprise. J'ai vendu des produits aux clients et gere mon secteur.",
        "Charge de developper le portefeuille clients et d'atteindre les objectifs commerciaux fixes.",
      ],
      after: [
        "Developpe un portefeuille de 45 comptes grands groupes, generant 1,2M EUR de CA annuel (+40% en 2 ans).",
        "Pilote une equipe de 4 commerciaux, depassant les objectifs de 18% trois trimestres consecutifs.",
      ],
    },
    {
      name: "Sarah Dubois",
      beforeTitle: "Cheffe de projet",
      afterTitle: "Cheffe de projet digital : 12 projets livres dans les delais",
      before: [
        "Gestion de projets pour differents clients. Coordination des equipes et suivi de l'avancement.",
        "Participation aux reunions et redaction de comptes-rendus reguliers.",
      ],
      after: [
        "Pilote 12 projets digitaux (budget cumule 800K EUR), tous livres dans les delais et le budget.",
        "Coordonne des equipes de 8 personnes en mode agile, reduisant les retards de livraison de 30%.",
      ],
    },
  ],
  en: [
    {
      name: "Thomas Martin",
      beforeTitle: "Sales rep",
      afterTitle: "B2B Sales Manager : +40% revenue in 2 years",
      before: [
        "Responsible for sales at a company. I sold products to clients and managed my territory.",
        "In charge of growing the client portfolio and hitting the assigned sales targets.",
      ],
      after: [
        "Grew a portfolio of 45 enterprise accounts, generating 1.2M EUR annual revenue (+40% in 2 years).",
        "Led a team of 4 sales reps, beating targets by 18% three quarters in a row.",
      ],
    },
    {
      name: "Sarah Dubois",
      beforeTitle: "Project manager",
      afterTitle: "Digital Project Manager : 12 projects delivered on time",
      before: [
        "Managed projects for various clients. Coordinated teams and tracked progress.",
        "Attended meetings and wrote regular status reports.",
      ],
      after: [
        "Delivered 12 digital projects (800K EUR combined budget), all on time and on budget.",
        "Coordinated agile teams of 8 people, cutting delivery delays by 30%.",
      ],
    },
  ],
};

function balanceText(text) {
  if (!text || typeof text !== "string") return text;
  let t = text;
  t = t.replace(/ ([?!:;»])/g, "\u00A0$1");
  t = t.replace(/« /g, "«\u00A0");
  return t;
}

export default function NuviHome({
  lang = "fr",
  mob = false,
  userName = null,
  onGenerate = () => {},
  onImport = () => {},
  onCoachOpen = () => {},
}) {
  const T = TEXT[lang] || TEXT.fr;
  const examples = EXAMPLES[lang] || EXAMPLES.fr;

  const Cream = "var(--nuvi-cream)";
  const Paper = "var(--nuvi-paper)";
  const Ink = "var(--nuvi-ink)";
  const InkMuted = "var(--nuvi-ink-muted)";
  const Hairline = "var(--nuvi-hairline)";
  const Coral = "var(--nuvi-coral)";
  const Violet = "var(--nuvi-purple)";
  const Magenta = "var(--nuvi-magenta)";

  // exampleIdx : quel exemple afficher (alterne a chaque rejouer)
  const [exampleIdx, setExampleIdx] = useState(0);
  // showAfter : false = on montre le "avant", true = le "apres" reecrit
  const [showAfter, setShowAfter] = useState(false);
  // transforming : pendant la bascule (Nuvi "reecrit")
  const [transforming, setTransforming] = useState(false);
  // entered : petit fade-in d'entree global
  const [entered, setEntered] = useState(false);

  const timers = useRef([]);
  const ex = examples[exampleIdx];

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };

  // Joue la transformation : montre "avant" 1,2s, bascule "transforming" 0,9s,
  // puis revele "apres".
  const playTransform = (idx) => {
    clearTimers();
    setExampleIdx(idx);
    setShowAfter(false);
    setTransforming(false);
    timers.current.push(setTimeout(() => setTransforming(true), 1200));
    timers.current.push(setTimeout(() => {
      setTransforming(false);
      setShowAfter(true);
    }, 2100));
  };

  // Au montage : fade-in puis joue la transformation une fois.
  useEffect(() => {
    setEntered(true);
    const t = setTimeout(() => playTransform(0), 500);
    timers.current.push(t);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReplay = () => {
    const next = (exampleIdx + 1) % examples.length;
    playTransform(next);
  };

  const cardPad = mob ? "16px 18px" : "20px 22px";
  const lineColBefore = InkMuted;
  const lineColAfter = "#3a3a40";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: Cream,
        zIndex: 1000,
        overflow: "auto",
        fontFamily: "'Inter', -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: mob ? "24px 16px" : "32px",
        opacity: entered ? 1 : 0,
        transition: "opacity 500ms ease",
      }}
    >
      <div style={{ width: "100%", maxWidth: mob ? "100%" : 720 }}>

        {/* ===== TEMPS 1 : ACCUEIL (instantane) ===== */}
        <div style={{ textAlign: "center", marginBottom: mob ? 18 : 24 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <NuviCompanion
              size={mob ? 56 : 64}
              mode={transforming ? "loading" : "speaking"}
              cycleDuration={transforming ? 30 : 4}
            />
          </div>
          <div style={{
            color: Ink,
            fontFamily: "'Fraunces', 'DM Serif Display', Georgia, serif",
            fontSize: mob ? 24 : 30,
            fontWeight: 400,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            marginBottom: 6,
          }}>
            {T.title}{" "}
            <em style={{
              fontStyle: "italic",
              color: Magenta,
              background: "linear-gradient(135deg, " + Violet + " 0%, " + Magenta + " 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>{T.titleAccent}</em>.
          </div>
          <p style={{
            color: InkMuted,
            fontSize: mob ? 13 : 14,
            margin: 0,
            lineHeight: 1.5,
          }}>{balanceText(T.sub)}</p>
        </div>

        {/* ===== TEMPS 2 : LE WOW (avant -> apres) ===== */}
        <div style={{
          display: "flex",
          flexDirection: mob ? "column" : "row",
          gap: mob ? 12 : 14,
          alignItems: "stretch",
        }}>

          {/* CARTE AVANT */}
          <div style={{
            flex: 1,
            background: Paper,
            border: "1px solid " + Hairline,
            borderRadius: 14,
            padding: cardPad,
            position: "relative",
            opacity: showAfter ? (mob ? 0.55 : 0.7) : 1,
            transition: "opacity 400ms ease",
          }}>
            <span style={{
              position: "absolute", top: 12, right: 12,
              background: "#f1efe8", color: "#888780",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase", padding: "3px 9px", borderRadius: 999,
            }}>{T.before}</span>
            <div style={{ fontSize: 15, fontWeight: 500, color: InkMuted, marginBottom: 2 }}>
              {ex.name}
            </div>
            <div style={{ fontSize: 12, color: "#a89f8a", marginBottom: 14 }}>
              {ex.beforeTitle}
            </div>
            {ex.before.map((line, i) => (
              <p key={i} style={{
                fontSize: 12, color: lineColBefore, lineHeight: 1.6,
                margin: i === 0 ? "0 0 10px" : 0,
              }}>{line}</p>
            ))}
          </div>

          {/* FLECHE NUVI (au centre) */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: mob ? "row" : "column", gap: 4,
            ...(mob ? { padding: "2px 0" } : {}),
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: "linear-gradient(135deg, " + Violet + " 0%, " + Magenta + " 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: transforming ? "0 0 0 6px rgba(91,61,245,0.15)" : "0 2px 8px rgba(91,61,245,0.25)",
              transition: "box-shadow 300ms ease",
              animation: transforming ? "nuviArrowPulse 0.9s ease-in-out infinite" : "none",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: mob ? "rotate(90deg)" : "none" }}>
                <path d="M5 12h14M13 6l6 6-6 6"/>
              </svg>
            </div>
            <span style={{ fontSize: 10, color: Violet, fontWeight: 700, letterSpacing: "0.06em" }}>
              {transforming ? T.transforming : "Nuvi"}
            </span>
          </div>

          {/* CARTE APRES */}
          <div style={{
            flex: 1,
            background: Paper,
            border: "2px solid " + (showAfter ? Violet : Hairline),
            borderRadius: 14,
            padding: cardPad,
            position: "relative",
            opacity: showAfter ? 1 : (mob ? 0.4 : 0.5),
            transition: "opacity 400ms ease, border-color 400ms ease",
          }}>
            <span style={{
              position: "absolute", top: 12, right: 12,
              background: showAfter ? "linear-gradient(135deg, " + Violet + ", " + Magenta + ")" : "#f1efe8",
              color: showAfter ? "#fff" : "#888780",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase", padding: "3px 9px", borderRadius: 999,
              transition: "all 400ms ease",
            }}>{T.after}</span>
            <div style={{ fontSize: 15, fontWeight: 600, color: Ink, marginBottom: 2 }}>
              {ex.name}
            </div>
            <div style={{
              fontSize: 12, color: Coral, fontWeight: 500, marginBottom: 14,
              minHeight: 16,
            }}>
              {showAfter ? ex.afterTitle : ""}
            </div>
            {ex.after.map((line, i) => (
              <p key={i} style={{
                fontSize: 12, color: lineColAfter, lineHeight: 1.6,
                margin: i === 0 ? "0 0 8px" : 0,
                opacity: showAfter ? 1 : 0,
                transform: showAfter ? "translateY(0)" : "translateY(6px)",
                transition: "opacity 500ms ease, transform 500ms ease",
                transitionDelay: showAfter ? (i * 180 + 100) + "ms" : "0ms",
              }}>{line}</p>
            ))}
          </div>
        </div>

        {/* Bouton Rejouer (apparait apres la 1ere transformation) */}
        <div style={{ textAlign: "center", height: 28, marginTop: 12 }}>
          {showAfter && (
            <button
              onClick={handleReplay}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "transparent", border: "none", cursor: "pointer",
                color: InkMuted, fontSize: 12, fontWeight: 500,
                fontFamily: "'Inter', sans-serif",
                animation: "nuviFadeIn 400ms ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = Violet; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = InkMuted; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 4v4h4"/>
              </svg>
              {T.replay}
            </button>
          )}
        </div>

        {/* ===== TEMPS 3 : LE CHOIX (apres la valeur) ===== */}
        <div style={{
          display: "flex",
          flexDirection: mob ? "column" : "row",
          gap: 10,
          maxWidth: mob ? "100%" : 440,
          margin: "20px auto 0",
        }}>
          <button
            onClick={onGenerate}
            style={{
              flex: 1,
              background: "linear-gradient(135deg, " + Violet + " 0%, " + Magenta + " 100%)",
              color: "#fff", border: "none", borderRadius: 12,
              padding: "13px 18px", fontSize: 14, fontWeight: 500,
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
              boxShadow: "0 4px 16px rgba(91,61,245,0.28)",
              transition: "transform 180ms ease, box-shadow 180ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(91,61,245,0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(91,61,245,0.28)";
            }}
          >{T.ctaMain}</button>

          <button
            onClick={onImport}
            style={{
              flex: 1,
              background: Paper, color: Ink,
              border: "1px solid " + Hairline, borderRadius: 12,
              padding: "13px 18px", fontSize: 14, fontWeight: 500,
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
              transition: "border-color 180ms ease, transform 180ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = Coral;
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = Hairline;
              e.currentTarget.style.transform = "";
            }}
          >{T.ctaImport}</button>
        </div>

      </div>

      {/* ===== COACH FLOTTANT (bas-droite) ===== */}
      <button
        onClick={onCoachOpen}
        aria-label={T.coachLabel}
        style={{
          position: "fixed",
          ...(mob ? { right: 16, bottom: 16 } : { right: 24, bottom: 24 }),
          zIndex: 90,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          padding: 0, background: "transparent", border: "none", cursor: "pointer",
          fontFamily: "'Inter', -apple-system, sans-serif",
          transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
          userSelect: "none",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px) scale(1.05)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
      >
        <span aria-hidden="true" style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, position: "relative",
          width: mob ? 70 : 96, height: mob ? 70 : 96,
        }}>
          <span style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: "radial-gradient(circle at 50% 55%, rgba(91, 61, 245, 0.35) 0%, rgba(185, 28, 140, 0.20) 35%, rgba(91, 61, 245, 0.05) 60%, transparent 75%)",
            animation: "nuviBoxBreathe 16s ease-in-out infinite",
            pointerEvents: "none", filter: "blur(8px)",
          }} />
          <span style={{
            position: "relative", zIndex: 2,
            filter: "drop-shadow(0 4px 12px rgba(91, 61, 245, 0.25))",
          }}>
            <NuviCompanion size={mob ? 54 : 76} mode="idle" cycleDuration={60} />
          </span>
        </span>
        <span style={{
          marginTop: 2, padding: "3px 10px",
          background: "rgba(91, 61, 245, 0.08)", borderRadius: 999,
          fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
          color: "#5b3df5", border: "0.5px solid rgba(91, 61, 245, 0.15)",
        }}>{T.coachLabel}</span>
      </button>

      {/* ===== STYLES ===== */}
      <style>{`
        @keyframes nuviFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes nuviArrowPulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.12); }
        }
        @keyframes nuviBoxBreathe {
          0%   { transform: scale(0.65); opacity: 0.35; }
          25%  { transform: scale(1.0);  opacity: 0.85; }
          50%  { transform: scale(1.0);  opacity: 0.85; }
          75%  { transform: scale(0.65); opacity: 0.35; }
          100% { transform: scale(0.65); opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
