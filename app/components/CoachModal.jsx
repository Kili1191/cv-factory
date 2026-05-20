"use client";

// Nuvi v3 - CoachModal (compagnon proactif)
//
// [Glass Coach v2] Updates :
//   - data-nv-coach-sheet="true" sur la sheet pour glass mode propre depuis page.jsx
//   - Nouveau prop coachStatus = 'reading' | 'analyzing' | 'applying' | 'done' | null
//   - Le status s'affiche en discret en bas du dernier message Nuvi (police naturelle)
//   - Le "done" persiste tant qu'un nouveau message n'est pas envoye (cleanup dans page.jsx)
//
// Props :
//   T              : i18n
//   cv             : CV actuel
//   apiKey         : string
//   loading        : bool
//   coachStatus    : 'reading' | 'analyzing' | 'applying' | 'done' | null  (NEW)
//   messages       : tableau de messages [{role, content, ts, adopt?, quickReplies?}]
//   onSend(text)   : envoie un message utilisateur
//   onClear()      : efface la conversation
//   onAdopt(kind, value) : applique une suggestion au CV
//   onClose()      : ferme la modale
//   onAction(action) : dispatch des actions feature

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Ink, InkMuted, Cream, CreamSoft, Paper, Gold, GoldDeep,
  Coral, CoralSoft, Green, GreenSoft, Purple, PurpleSoft, Magenta,
  Hairline, Gray100, Gray200, Gray400, Gray600,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm,
  GradPurple, B,
} from "./tokens";

const NuviLogo = dynamic(() => import("./NuviLogo"), { ssr: false });
const NuviCompanion = dynamic(() => import("./NuviCompanion"), { ssr: false });
const LiquidGlassPanel = dynamic(() => import("./LiquidGlassPanel"), { ssr: false });
// Pour les sub-exports (text glass, logo anime) on charge non-dynamiquement
// car ils n'ont pas de dependance SSR-incompatible.
import { NuviTextGlass, NuviTextGlassCoral, NuviLogoAnimated } from "./LiquidGlassPanel";

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

  // ============================================================
  // [Coach v6 - 2026-05-19] Nouvelles detections qualite
  // ============================================================

  // DETECTION 1 : doublons Formation <-> Certifications
  // Compare chaque entree de cv.education et cv.certifications.
  // Si une certif ressemble fort a une formation (mots-cles partages),
  // on remonte le doublon a l'user.
  const normalize = (s) => (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\sa-uA-U]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const eduList = (cv.education || [])
    .map(e => normalize((e.degree || "") + " " + (e.school || "")))
    .filter(Boolean);

  const certList = (cv.certifications || [])
    .filter(c => c && c.trim())
    .map(c => normalize(c));

  // Une certif "ressemble" a une formation si elles partagent
  // au moins 2 mots significatifs (4+ chars) en commun.
  const duplicates = [];
  certList.forEach((cert, certIdx) => {
    eduList.forEach((edu, eduIdx) => {
      const certWords = new Set(cert.split(" ").filter(w => w.length >= 4));
      const eduWords = new Set(edu.split(" ").filter(w => w.length >= 4));
      let overlap = 0;
      certWords.forEach(w => { if (eduWords.has(w)) overlap++; });
      if (overlap >= 2) {
        duplicates.push({
          certIdx, eduIdx,
          certText: (cv.certifications || [])[certIdx],
          eduText: ((cv.education || [])[eduIdx]?.degree || "") + " - " +
                   ((cv.education || [])[eduIdx]?.school || ""),
        });
      }
    });
  });
  if (duplicates.length > 0) issues.push("duplicates");

  // DETECTION 2 : skills en vrac (pas de categorisation)
  // Si l'user a >= 6 skills tous a plat (string[]) sans structure,
  // on propose de les organiser en blocs thematiques.
  const skillsArr = cv.skills || [];
  const skillsAreFlat = skillsArr.length >= 6 &&
    skillsArr.every(s => typeof s === "string");
  if (skillsAreFlat) issues.push("skills_bulk");

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
  } else if (issues.includes("duplicates")) {
    // [Coach v6] Priorite haute : doublons formation/certifs
    const example = duplicates[0];
    observation = lang === "fr"
      ? `J'ai jete un coup d'oeil. Il y a des doublons entre Formation et Certifications : "${example.certText}" apparait dans les deux sections. Resultat : ton CV a l'air rempli artificiellement.\n\nJe te propose de fusionner en une seule section "FORMATION & CERTIFICATIONS" pour aerer.`
      : `I had a look. There are duplicates between Education and Certifications: "${example.certText}" appears in both sections. Result: your CV looks artificially padded.\n\nLet me merge into a single "EDUCATION & CERTIFICATIONS" section to clean it up.`;
    suggestions = [
      { label: lang === "fr" ? "Fusionner les sections" : "Merge sections",
        icon: "rewrite", accent: Purple, primary: true,
        action: { type: "send_text", text: lang === "fr"
          ? "Fusionne Formation et Certifications en gardant chaque entree une seule fois"
          : "Merge Education and Certifications, keep each entry only once"
        }
      },
      { label: lang === "fr" ? "Voir les doublons" : "See duplicates",
        icon: "audit", accent: Purple,
        action: { type: "send_text", text: lang === "fr"
          ? "Liste-moi tous les doublons entre Formation et Certifications"
          : "List all duplicates between Education and Certifications"
        }
      },
      { label: lang === "fr" ? "Audit complet" : "Full audit",
        icon: "audit", accent: null,
        action: { type: "open_modal", modal: "audit" }
      },
    ];
  } else if (issues.includes("skills_bulk")) {
    // [Coach v6] Priorite moyenne : skills en vrac
    observation = lang === "fr"
      ? `Ton CV est bon, mais tes ${skillsArr.length} competences sont alignees en vrac. Les recruteurs scannent en 6 sec, ils ont besoin de blocs thematiques.\n\nExemple : "Commercial B2B : negociation, prospection... | Finance : affacturage, KYC... | Outils : Salesforce, HubSpot..."\n\nJe les organise pour toi ?`
      : `Your CV is good but your ${skillsArr.length} skills are listed in bulk. Recruiters scan in 6s, they need thematic blocks.\n\nExample: "Sales B2B: negotiation, prospecting... | Finance: factoring, KYC... | Tools: Salesforce, HubSpot..."\n\nWant me to organize them?`;
    suggestions = [
      { label: lang === "fr" ? "Categoriser mes skills" : "Categorize my skills",
        icon: "rewrite", accent: Purple, primary: true,
        action: { type: "send_text", text: lang === "fr"
          ? "Organise mes competences en blocs thematiques (Commercial, Finance, Outils, etc.) avec des labels clairs"
          : "Organize my skills into thematic blocks (Sales, Finance, Tools, etc.) with clear labels"
        }
      },
      { label: lang === "fr" ? "Audit complet" : "Full audit",
        icon: "audit", accent: Purple,
        action: { type: "open_modal", modal: "audit" }
      },
      { label: lang === "fr" ? "Adapter a une offre" : "Match to a job",
        icon: "match", accent: null,
        action: { type: "open_modal", modal: "offer" }
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
          background: hovered
            ? "rgba(250, 248, 243, 0.95)"
            : "rgba(250, 248, 243, 0.85)",
          color: Ink,
          border: "0.5px solid " + (hovered ? accent : "rgba(217, 119, 87, 0.35)"),
          fontSize: 12, fontWeight: 500,
          fontFamily: Sans,
          letterSpacing: "0.01em",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          boxShadow: hovered
            ? "0 4px 14px rgba(217, 119, 87, 0.18)"
            : "0 2px 8px rgba(0, 0, 0, 0.08)",
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

// [Glass Coach v2] Mini status discret affiche sous le dernier message Nuvi.
// Police naturelle (Sans, meme que le chat), juste un dot anime + texte petit.
function CoachInlineStatus({ status, lang }) {
  if (!status) return null;

  const isDone = status === "done";
  const text =
    status === "reading"   ? (lang === "en" ? "Reading your CV..."           : "Je lis ton CV...")
  : status === "analyzing" ? (lang === "en" ? "Analyzing your background..." : "J'analyse ton parcours...")
  : status === "applying"  ? (lang === "en" ? "Applying changes..."          : "J'applique les changements...")
  : status === "done"      ? (lang === "en" ? "Done"                          : "Fait")
  : "";

  return (
    <div style={{
      // Aligne sous la bulle du dernier message Nuvi (apres l'avatar 48px + gap 10px = 58px)
      marginLeft: 58,
      marginTop: -4,
      marginBottom: 12,
      display: "flex", alignItems: "center", gap: 8,
      fontSize: 12,
      fontFamily: Sans,
      color: isDone ? Green : InkMuted,
      fontWeight: isDone ? 600 : 400,
      lineHeight: 1.4,
    }}>
      {isDone ? (
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 14, height: 14, borderRadius: "50%",
          background: Green, color: "#fff",
          fontSize: 9, fontWeight: 700, flexShrink: 0,
        }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="3.5"
            strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </span>
      ) : (
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: Purple,
          animation: "nvStatusDot 1.2s ease-in-out infinite",
          flexShrink: 0,
        }} />
      )}
      <span>{text}</span>
      <style>{`
        @keyframes nvStatusDot {
          0%, 100% { opacity: 0.35; transform: scale(0.85); }
          50%      { opacity: 1;    transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

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
      <div style={{
        width: 48, height: 48, flexShrink: 0,
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

// CoachModal v4
export default function CoachModal({
  T, cv, apiKey, lang = "fr",
  loading, messages,
  coachStatus,  // [Glass Coach v2] NEW prop
  onSend, onClear, onAdopt, onClose, onAction,
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const [welcomeMsg, setWelcomeMsg] = useState(null);

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
  }, [messages, loading, welcomeMsg, coachStatus]);

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
      {/* [Glass Coach v7] Backdrop transparent en permanence - on voit le CV
          a travers tout le temps, plus juste pendant le travail. */}
      <div
        data-nv-coach-backdrop="true"
        style={{
        position: "absolute", inset: 0,
        background: "transparent",
        animation: "cvfFadeIn 200ms ease-out",
      }} onClick={() => { if (!loading) onClose(); }} />

      {/* [Liquid Glass v2] Sheet avec wrapper LiquidGlassPanel propre :
          - SVG feTurbulence + feDisplacementMap (distorsion REELLE iOS 26)
          - Animation seed 12s (verre vivant)
          - Tint cream chaud + specular highlight + bordure Coral */}
      <LiquidGlassPanel
        height="94vh"
        maxWidth={840}
        borderRadius="32px 32px 0 0"
        borderColor={Coral}
        distortion={30}
        tintColor="rgba(250, 248, 243, 0.10)"
        animate={true}
      >
        <div style={{
          width: 40, height: 4, background: Coral,
          borderRadius: RadiusPill,
          margin: "10px auto 6px", flexShrink: 0,
          opacity: 0.7,
        }} />

        <div style={{
          padding: "8px 24px 0",
          display: "flex", alignItems: "center",
          flexShrink: 0,
        }}>
          {/* Logo Nuvi hyper cool : gradient flow + shimmer + glow pulse */}
          <NuviLogoAnimated size={26} />
        </div>

        <div style={{
          padding: "10px 24px 14px",
          borderBottom: "0.5px solid rgba(217, 119, 87, 0.25)", flexShrink: 0,
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between", gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Eyebrow COACH NUVI : gradient Purple->Magenta avec fallback solide */}
            <div style={{
              fontSize: 11, fontWeight: 700,
              letterSpacing: "0.12em", textTransform: "uppercase",
              marginBottom: 4,
              color: "#b91c8c",
              background: "linear-gradient(135deg, #8b6dff 0%, #e547bf 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 6px rgba(139,109,255,0.5)) drop-shadow(0 1px 2px rgba(0,0,0,0.4))",
            }}>{T.co_eyebrow}</div>

            {/* Titre blanc avec shadow universelle - lisible partout */}
            <NuviTextGlass style={{
              fontFamily: Serif, fontWeight: 400, fontSize: 24,
              letterSpacing: "-0.02em", lineHeight: 1.15,
            }}>
              {T.co_title_a}
              {" "}<em style={{
                fontStyle: "italic",
                color: "#b91c8c",
                background: "linear-gradient(135deg, #8b6dff 0%, #e547bf 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                textShadow: "0 0 0 transparent",
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
              }}>{T.co_title_em}</em>
              {" "}{T.co_title_b}
            </NuviTextGlass>

            {/* Sous-titre blanc avec shadow universelle */}
            <NuviTextGlass style={{
              fontSize: 12, marginTop: 4, lineHeight: 1.5,
            }}>{T.co_sub}</NuviTextGlass>
          </div>

          {hasMessages && (
            <button
              onClick={onClear}
              disabled={loading}
              title={T.co_clear}
              style={{
                ...B({
                  background: "rgba(250, 248, 243, 0.85)", borderRadius: "50%",
                  width: 32, height: 32, color: Ink,
                  border: "0.5px solid rgba(217, 119, 87, 0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  opacity: loading ? 0.4 : 1,
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
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

          <button onClick={onClose} disabled={loading} aria-label="close" style={{
            ...B({
              background: "rgba(250, 248, 243, 0.85)", borderRadius: "50%",
              width: 32, height: 32, color: Ink,
              border: "0.5px solid rgba(217, 119, 87, 0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              opacity: loading ? 0.4 : 1,
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
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

        <div ref={scrollRef} style={{
          flex: 1,
          overflowY: "auto",
          padding: "18px 24px",
        }}>
          {!hasMessages && welcomeMsg && (
            <Bubble
              T={T}
              msg={welcomeMsg}
              onAdopt={onAdopt}
              onAction={handleAction}
            />
          )}

          {hasMessages && messages.map((msg, i) => (
            <Bubble
              key={i}
              T={T}
              msg={msg}
              onAdopt={onAdopt}
              onAction={handleAction}
            />
          ))}

          {/* [Glass Coach v2] Status discret sous le dernier message Nuvi.
              S'affiche seulement quand pas de loading bubble (sinon redondant). */}
          {coachStatus && !loading && (
            <CoachInlineStatus status={coachStatus} lang={lang} />
          )}

          {/* Loading bubble */}
          {loading && (
            <div style={{
              display: "flex", justifyContent: "flex-start", marginBottom: 4,
              gap: 10, alignItems: "flex-start",
            }}>
              <div style={{
                width: 48, height: 48, flexShrink: 0,
                marginTop: 2,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <NuviCompanion size={48} mode="loading" />
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

          {/* [Glass Coach v2] Quand loading, le status est sous le loading bubble */}
          {coachStatus && loading && (
            <CoachInlineStatus status={coachStatus} lang={lang} />
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

        <div style={{
          padding: "12px 24px 18px",
          borderTop: "0.5px solid rgba(217, 119, 87, 0.25)",
          flexShrink: 0,
          background: "transparent",
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
      </LiquidGlassPanel>
    </div>
  );
}

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
