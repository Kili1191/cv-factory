"use client";

// Nuvi v3 - CoachModal (compagnon proactif)
//
// [Nuvi v3 redesign] : Coach n'est plus un menu de parcours statiques.
// C'est un compagnon qui :
//   1. Analyse le CV en local (instant, sans API) au mount
//   2. Genere un message d'accueil PERSONNALISE selon ce qu'il voit
//      (CV vide / accroche manquante / bullets sans chiffres / trou / etc.)
//   3. Propose des quick replies = boutons de FEATURES (Audit, Match, Score, etc.)
//   4. Mentionne les features au fil de la conversation (proactif)
//   5. Garde le chat libre pour conversations ouvertes
//
// Props :
//   T              : i18n
//   cv             : CV actuel
//   apiKey         : string
//   loading        : bool
//   messages       : tableau de messages [{role, content, ts, adopt?, quickReplies?}]
//   onSend(text)   : envoie un message utilisateur
//   onClear()      : efface la conversation
//   onAdopt(kind, value) : applique une suggestion au CV
//   onClose()      : ferme la modale
//   onAction(action) : NOUVEAU - dispatch des actions feature
//                      ex: { type: "open_modal", modal: "audit" }
//                      ex: { type: "send_text", text: "Aide-moi avec mon accroche" }

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Ink, InkMuted, Cream, CreamSoft, Paper, Gold, GoldDeep,
  Coral, CoralSoft, Green, GreenSoft, Purple, PurpleSoft, Magenta,
  Hairline, Gray100, Gray200, Gray400, Gray600,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm,
  GradPurple, B,
} from "./tokens";

// [Nuvi v3] NuviLogo en dynamic pour eviter mismatch hydratation
const NuviLogo = dynamic(() => import("./NuviLogo"), { ssr: false });

// [Nuvi v3] NuviCompanion : oeil anime du compagnon, utilise comme avatar
// devant chaque message du coach (mode "speaking" quand il parle, "idle" sinon).
const NuviCompanion = dynamic(() => import("./NuviCompanion"), { ssr: false });

// SVG icons line-style 1.6px stroke
const Icons = {
  audit: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l3-9 4 18 3-9h4"/>
    </svg>
  ),
  match: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <circle cx="12" cy="12" r="5"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
    </svg>
  ),
  score: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  truth: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12l2 2 4-4"/>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  pack: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  rewrite: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"/>
    </svg>
  ),
  chat: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  arrow: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/>
      <path d="m12 5 7 7-7 7"/>
    </svg>
  ),
};

// Analyse locale du CV pour generer le message d'accueil
function analyzeCv(cv, T, lang) {
  const empty = !cv.name && !cv.title && !cv.summary
    && (cv.experience || []).every(e => !e.title && !e.company)
    && (cv.education || []).every(e => !e.degree && !e.school);

  if (empty) {
    return {
      type: "empty",
      message: lang === "fr"
        ? "Salut ! Je suis Nuvi, ton compagnon CV. Tu n'as encore rien rempli, c'est parfait : on part d'une page blanche.\n\nJe peux te le rediger depuis zero (juste avec un peu d'info sur toi), ou si tu as deja un CV ailleurs, on l'importe et je l'audite."
        : "Hi! I'm Nuvi, your CV companion. Nothing here yet, perfect: we start from scratch.\n\nI can write it from zero (just need a bit about you), or if you have a CV elsewhere, we import it and I'll audit it.",
      quickReplies: [
        { label: lang === "fr" ? "Rediger mon CV" : "Write my CV",
          icon: "rewrite", accent: Purple,
          action: { type: "send_text", text: lang === "fr" ? "Aide-moi a rediger mon CV depuis zero" : "Help me write my CV from scratch" }
        },
        { label: lang === "fr" ? "Importer un CV" : "Import a CV",
          icon: "pack", accent: Coral,
          action: { type: "send_text", text: lang === "fr" ? "Comment importer mon CV existant ?" : "How do I import my existing CV?" }
        },
        { label: lang === "fr" ? "Discuter d'abord" : "Chat first",
          icon: "chat", accent: null,
          action: { type: "send_text", text: lang === "fr" ? "Avant de commencer, j'aimerais te poser des questions sur mon parcours" : "Before starting, I'd like to ask questions about my career" }
        },
      ]
    };
  }

  const issues = [];
  const summaryEmpty = !cv.summary || !cv.summary.trim();
  if (summaryEmpty) issues.push("summary");

  let bulletsTotal = 0;
  let bulletsWithNumbers = 0;
  (cv.experience || []).forEach(e => {
    (e.bullets || []).forEach(b => {
      if (b && b.trim()) {
        bulletsTotal++;
        if (/\d/.test(b)) bulletsWithNumbers++;
      }
    });
  });
  const bulletsWeak = bulletsTotal > 0 && (bulletsWithNumbers / bulletsTotal) < 0.4;
  if (bulletsWeak) issues.push("bullets");

  const titles = (cv.experience || []).map(e => (e.title || "").toLowerCase());
  const hasSeniorTitles = titles.some(t =>
    t.includes("director") || t.includes("head") || t.includes("vp") ||
    t.includes("chef") || t.includes("directeur") || t.includes("responsable")
  );
  const fewBullets = bulletsTotal < 5 && (cv.experience || []).length > 0;
  const possiblyOverstated = hasSeniorTitles && fewBullets;

  let intro = lang === "fr"
    ? "Salut ! Je suis Nuvi, ton compagnon CV.\n\n"
    : "Hi! I'm Nuvi, your CV companion.\n\n";

  let observation = "";
  let suggestions = [];

  if (issues.length === 0) {
    observation = lang === "fr"
      ? "J'ai jete un coup d'oeil rapide a ton CV : ca a l'air solide. Bonne base. On peut maintenant aller plus loin : audit detaille, adapter a une offre precise, ou check du score recruteur."
      : "I had a quick look at your CV: it looks solid. Good base. Now we can go further: detailed audit, adapt to a specific job, or check recruiter score.";
    suggestions = [
      { label: lang === "fr" ? "Audit complet" : "Full audit",
        icon: "audit", accent: Purple,
        action: { type: "open_modal", modal: "audit" }
      },
      { label: lang === "fr" ? "Adapter a une offre" : "Match to a job",
        icon: "match", accent: Purple,
        action: { type: "open_modal", modal: "offer" }
      },
      { label: lang === "fr" ? "Score recruteur" : "Recruiter score",
        icon: "score", accent: Purple,
        action: { type: "open_modal", modal: "score" }
      },
    ];
  } else if (issues.includes("summary") && issues.includes("bullets")) {
    observation = lang === "fr"
      ? "J'ai jete un coup d'oeil : tu as un parcours mais ton accroche est vide ET tes bullets manquent de chiffres. C'est dommage, c'est exactement ce que les recruteurs lisent en premier.\n\nOn s'attaque a quoi en premier ?"
      : "I had a look: you have experience but your summary is empty AND your bullets lack numbers. Too bad, that's exactly what recruiters read first.\n\nWhat do we tackle first?";
    suggestions = [
      { label: lang === "fr" ? "Reecrire mon accroche" : "Rewrite my summary",
        icon: "rewrite", accent: Purple,
        action: { type: "send_text", text: lang === "fr" ? "Aide-moi a reecrire mon accroche" : "Help me rewrite my summary" }
      },
      { label: lang === "fr" ? "Muscler les bullets" : "Strengthen bullets",
        icon: "rewrite", accent: Purple,
        action: { type: "send_text", text: lang === "fr" ? "Aide-moi a chiffrer et muscler mes bullets" : "Help me add numbers to my bullets" }
      },
      { label: lang === "fr" ? "Audit complet" : "Full audit",
        icon: "audit", accent: Purple,
        action: { type: "open_modal", modal: "audit" }
      },
    ];
  } else if (issues.includes("summary")) {
    observation = lang === "fr"
      ? "Ton CV a une bonne base, mais ton accroche est vide. C'est dommage : c'est la premiere chose que les recruteurs lisent. Je te la rediger ?"
      : "Your CV has a good base but the summary is empty. Too bad: that's the first thing recruiters read. Want me to write it?";
    suggestions = [
      { label: lang === "fr" ? "Rediger mon accroche" : "Write my summary",
        icon: "rewrite", accent: Purple,
        action: { type: "send_text", text: lang === "fr" ? "Aide-moi a rediger mon accroche" : "Help me write my summary" }
      },
      { label: lang === "fr" ? "Audit complet" : "Full audit",
        icon: "audit", accent: Purple,
        action: { type: "open_modal", modal: "audit" }
      },
      { label: lang === "fr" ? "J'ai une offre en tete" : "I have a job in mind",
        icon: "match", accent: Purple,
        action: { type: "open_modal", modal: "offer" }
      },
    ];
  } else if (issues.includes("bullets")) {
    observation = lang === "fr"
      ? "Ton CV est bien rempli mais tes bullets manquent de chiffres. Les recruteurs adorent les chiffres : impact, equipes, budgets. On les muscle ensemble ?"
      : "Your CV is filled but bullets lack numbers. Recruiters love numbers: impact, teams, budgets. Want to strengthen them?";
    suggestions = [
      { label: lang === "fr" ? "Muscler les bullets" : "Strengthen bullets",
        icon: "rewrite", accent: Purple,
        action: { type: "send_text", text: lang === "fr" ? "Aide-moi a chiffrer et muscler mes bullets" : "Help me add numbers to my bullets" }
      },
      { label: lang === "fr" ? "Audit complet" : "Full audit",
        icon: "audit", accent: Purple,
        action: { type: "open_modal", modal: "audit" }
      },
      { label: lang === "fr" ? "Truth check" : "Truth check",
        icon: "truth", accent: Coral,
        action: { type: "open_modal", modal: "truth" }
      },
    ];
  }

  if (possiblyOverstated && !suggestions.find(s => s.action && s.action.modal === "truth")) {
    suggestions.push({
      label: lang === "fr" ? "Verifier la coherence" : "Truth check",
      icon: "truth", accent: Coral,
      action: { type: "open_modal", modal: "truth" }
    });
  }

  return {
    type: "diagnostic",
    message: intro + observation,
    quickReplies: suggestions,
  };
}

function withOpacity(hex, opacity) {
  if (!hex || hex[0] !== "#") return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// QuickReplyButton : bouton de feature dans un message
function QuickReplyButton({ qr, onAction, primary = false }) {
  const [hovered, setHovered] = useState(false);
  const accent = qr.accent || InkMuted;

  if (primary) {
    return (
      <button
        onClick={() => onAction(qr.action)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          ...B({
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 999,
            background: `linear-gradient(135deg, ${Purple}, ${Magenta})`,
            color: "#fff",
            border: "none",
            fontSize: 12, fontWeight: 600,
            fontFamily: Sans,
            letterSpacing: "0.01em",
            boxShadow: hovered
              ? "0 4px 14px rgba(91, 61, 245, 0.35)"
              : "0 2px 8px rgba(91, 61, 245, 0.25)",
            transform: hovered ? "translateY(-1px)" : "translateY(0)",
            transition: "all 180ms ease-out",
          })
        }}>
        {qr.icon && Icons[qr.icon]}
        {qr.label}
        {Icons.arrow}
      </button>
    );
  }

  return (
    <button
      onClick={() => onAction(qr.action)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...B({
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 12px", borderRadius: 999,
          background: hovered ? withOpacity(accent, 0.06) : Paper,
          color: Ink,
          border: "0.5px solid " + (hovered ? accent : Hairline),
          fontSize: 12, fontWeight: 500,
          fontFamily: Sans,
          letterSpacing: "0.01em",
          transition: "all 150ms ease",
        })
      }}>
      {qr.icon && (
        <span style={{ color: accent, display: "flex" }}>
          {Icons[qr.icon]}
        </span>
      )}
      {qr.label}
    </button>
  );
}

// Bubble : bulle de message (user / nuvi)
function Bubble({ T, msg, onAdopt, onAction }) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div style={{
        display: "flex", justifyContent: "flex-end", marginBottom: 12,
      }}>
        <div style={{
          maxWidth: "80%",
          padding: "10px 14px", borderRadius: "18px 18px 4px 18px",
          background: Purple, color: "#fff",
          fontSize: 13, lineHeight: 1.5, fontFamily: Sans,
          whiteSpace: "pre-wrap",
        }}>{msg.content}</div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", justifyContent: "flex-start", marginBottom: 12,
      gap: 10, alignItems: "flex-start",
    }}>
      {/* [Nuvi v3] Avatar = NuviCompanion (oeil anime) en mode speaking.
          C'est le visage du compagnon dans le chat. */}
      <div style={{
        width: 32, height: 32, flexShrink: 0,
        marginTop: 2,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <NuviCompanion size={48} mode="speaking" />
      </div>
      <div style={{ maxWidth: "85%" }}>
        <div style={{
          padding: "12px 16px", borderRadius: "4px 18px 18px 18px",
          background: Paper, color: Ink,
          border: "0.5px solid " + Hairline, boxShadow: ShadowSm,
          fontSize: 13, lineHeight: 1.55, fontFamily: Sans,
          whiteSpace: "pre-wrap",
        }}>{msg.content}</div>

        {msg.quickReplies && msg.quickReplies.length > 0 && onAction && (
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10,
          }}>
            {msg.quickReplies.map((qr, i) => (
              <QuickReplyButton
                key={i}
                qr={qr}
                onAction={onAction}
                primary={qr.primary === true}
              />
            ))}
          </div>
        )}

        {msg.adopt && msg.adopt.kind && msg.adopt.value && onAdopt && (
          <button
            onClick={() => onAdopt(msg.adopt.kind, msg.adopt.value)}
            style={{
              ...B({
                marginTop: 6,
                padding: "7px 12px", borderRadius: RadiusPill,
                background: GradPurple, color: "#fff",
                fontSize: 11, fontWeight: 600, fontFamily: Sans,
                display: "inline-flex", alignItems: "center", gap: 5,
                transition: "all 180ms ease-out",
                boxShadow: "0 2px 8px rgba(91, 61, 245, 0.25)",
              })
            }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {msg.adopt.kind === "summary" ? T.co_adopt_summary
              : msg.adopt.kind === "title" ? T.co_adopt_title
              : T.co_adopt_bullet}
          </button>
        )}
      </div>
    </div>
  );
}

// CoachModal v3
export default function CoachModal({
  T, cv, apiKey, lang = "fr",
  loading, messages,
  onSend, onClear, onAdopt, onClose, onAction,
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const [welcomeMsg, setWelcomeMsg] = useState(null);

  // Genere le welcome contextuel SEULEMENT si pas de messages existants
  useEffect(() => {
    if ((!messages || messages.length === 0) && cv) {
      const analysis = analyzeCv(cv, T, lang);
      setWelcomeMsg({
        role: "nuvi",
        content: analysis.message,
        quickReplies: analysis.quickReplies,
        ts: Date.now(),
      });
    } else {
      setWelcomeMsg(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages?.length, cv]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !loading) onClose(); };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [loading, onClose]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, welcomeMsg]);

  const hasMessages = messages && messages.length > 0;

  const submit = () => {
    const t = input.trim();
    if (!t || loading) return;
    onSend(t);
    setInput("");
  };

  const handleAction = (action) => {
    if (!action) return;
    if (action.type === "send_text" && action.text) {
      onSend(action.text);
    } else if (action.type === "open_modal" && onAction) {
      onAction(action);
    } else if (action.type === "external" && action.url) {
      if (typeof window !== "undefined") {
        window.open(action.url, "_blank", "noopener");
      }
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99998,
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
      fontFamily: Sans,
    }}>
      {/* Backdrop */}
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(10,10,10,.55)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        animation: "cvfFadeIn 200ms ease-out",
      }} onClick={() => { if (!loading) onClose(); }} />

      {/* Sheet */}
      <div style={{
        position: "relative", background: CreamSoft,
        borderRadius: "32px 32px 0 0",
        height: "94vh", display: "flex", flexDirection: "column",
        boxShadow: "0 -20px 60px rgba(0,0,0,.2)",
        animation: "cvfSlideUp 280ms cubic-bezier(.32,.72,0,1)",
        width: "100%", maxWidth: 840,
        marginLeft: "auto", marginRight: "auto",
      }}>
        {/* iOS handle */}
        <div style={{
          width: 40, height: 4, background: Hairline,
          borderRadius: RadiusPill,
          margin: "10px auto 6px", flexShrink: 0,
        }} />

        {/* [Nuvi v3] NuviLogo wordmark anime en haut a gauche */}
        <div style={{
          padding: "8px 24px 0",
          display: "flex", alignItems: "center",
          flexShrink: 0,
        }}>
          <NuviLogo size={28} inkColor={Ink} />
        </div>

        {/* Header */}
        <div style={{
          padding: "10px 24px 14px",
          borderBottom: "0.5px solid " + Hairline, flexShrink: 0,
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between", gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 11, fontWeight: 600,
              letterSpacing: "0.12em", textTransform: "uppercase",
              color: Purple, marginBottom: 4,
            }}>{T.co_eyebrow}</div>
            <div style={{
              fontFamily: Serif, fontWeight: 400, fontSize: 24,
              letterSpacing: "-0.02em", color: Ink, lineHeight: 1.15,
            }}>
              {T.co_title_a}
              {" "}<em style={{
                fontStyle: "italic",
                background: `linear-gradient(135deg, ${Purple}, ${Magenta})`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}>{T.co_title_em}</em>
              {" "}{T.co_title_b}
            </div>
            <div style={{
              fontSize: 12, color: InkMuted, marginTop: 4, lineHeight: 1.5,
            }}>{T.co_sub}</div>
          </div>

          {/* Bouton clear si conversation en cours */}
          {hasMessages && (
            <button
              onClick={onClear}
              disabled={loading}
              title={T.co_clear}
              style={{
                ...B({
                  background: Paper, borderRadius: "50%",
                  width: 32, height: 32, color: InkMuted,
                  border: "0.5px solid " + Hairline,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  opacity: loading ? 0.4 : 1,
                  transition: "all 150ms ease",
                })
              }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          )}

          {/* Close button */}
          <button onClick={onClose} disabled={loading} aria-label="close" style={{
            ...B({
              background: Paper, borderRadius: "50%",
              width: 32, height: 32, color: InkMuted,
              border: "0.5px solid " + Hairline,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              opacity: loading ? 0.4 : 1,
              transition: "all 150ms ease",
            })
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div ref={scrollRef} style={{
          flex: 1,
          overflowY: "auto",
          padding: "18px 24px",
        }}>
          {/* [Nuvi v3] Welcome message contextuel */}
          {!hasMessages && welcomeMsg && (
            <Bubble
              T={T}
              msg={welcomeMsg}
              onAdopt={onAdopt}
              onAction={handleAction}
            />
          )}

          {/* Conversation */}
          {hasMessages && messages.map((msg, i) => (
            <Bubble
              key={i}
              T={T}
              msg={msg}
              onAdopt={onAdopt}
              onAction={handleAction}
            />
          ))}

          {/* Loading bubble */}
          {loading && (
            <div style={{
              display: "flex", justifyContent: "flex-start", marginBottom: 12,
              gap: 10, alignItems: "flex-start",
            }}>
              {/* [Nuvi v3] Avatar loading = NuviCompanion en mode loading
                  (3D spin synchronise avec saccades de pupille) */}
              <div style={{
                width: 32, height: 32, flexShrink: 0,
                marginTop: 2,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <NuviCompanion size={32} mode="loading" />
              </div>
              <div style={{
                padding: "12px 16px", borderRadius: "4px 18px 18px 18px",
                background: Paper, color: InkMuted,
                border: "0.5px solid " + Hairline,
                fontSize: 13, fontFamily: Sans,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%", background: Purple,
                  animation: "cvfPulse1 1.4s ease-in-out infinite",
                }} />
                <div style={{
                  width: 6, height: 6, borderRadius: "50%", background: Purple,
                  animation: "cvfPulse2 1.4s ease-in-out infinite",
                }} />
                <div style={{
                  width: 6, height: 6, borderRadius: "50%", background: Purple,
                  animation: "cvfPulse3 1.4s ease-in-out infinite",
                }} />
              </div>
            </div>
          )}

          <style>{`
            @keyframes cvfPulse1 { 0%, 60%, 100% { opacity:.3; } 30% { opacity:1; } }
            @keyframes cvfPulse2 {
              0%, 30%, 70%, 100% { opacity:.3; }
              50% { opacity:1; }
            }
            @keyframes cvfPulse3 {
              0%, 50%, 80%, 100% { opacity:.3; }
              70% { opacity:1; }
            }
          `}</style>
        </div>

        {/* Input zone */}
        <div style={{
          padding: "12px 24px 18px",
          borderTop: "0.5px solid " + Hairline,
          flexShrink: 0,
          background: CreamSoft,
        }}>
          <div style={{
            display: "flex", gap: 8, alignItems: "flex-end",
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={T.co_input_ph || (lang === "fr" ? "Demande a Nuvi..." : "Ask Nuvi...")}
              rows={1}
              disabled={loading}
              style={{
                flex: 1,
                padding: "11px 16px",
                borderRadius: RadiusPill,
                border: "0.5px solid " + Hairline,
                background: Paper,
                color: Ink, fontSize: 13,
                fontFamily: Sans,
                outline: "none",
                resize: "none",
                maxHeight: 120,
                boxSizing: "border-box",
                opacity: loading ? 0.5 : 1,
                transition: "border-color 150ms ease",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = Purple; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = Hairline; }}
            />
            <button
              onClick={submit}
              disabled={loading || !input.trim() || !apiKey}
              aria-label={T.co_send}
              style={{
                ...B({
                  width: 42, height: 42, borderRadius: "50%",
                  background: (loading || !input.trim() || !apiKey)
                    ? Gray200 : GradPurple,
                  color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 180ms ease-out",
                  boxShadow: (loading || !input.trim() || !apiKey)
                    ? "none"
                    : "0 2px 8px rgba(91, 61, 245, 0.3)",
                })
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5"/>
                <path d="m5 12 7-7 7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// CoachFAB : bouton flottant persistant (preserve)
export function CoachFAB({ T, onOpen, hidden }) {
  if (hidden) return null;
  return (
    <button
      onClick={onOpen}
      aria-label={T.co_fab_aria}
      title={T.co_fab_aria}
      style={{
        ...B({
          position: "fixed",
          bottom: 90,
          right: 16,
          width: 56, height: 56, borderRadius: "50%",
          background: GradPurple, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 24px rgba(91,61,245,.45)",
          zIndex: 9999,
          transition: "all 200ms ease-out",
          animation: "cvfFabIn 350ms cubic-bezier(.34,1.56,.64,1)",
        })
      }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <style>{`
        @keyframes cvfFabIn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </button>
  );
}
