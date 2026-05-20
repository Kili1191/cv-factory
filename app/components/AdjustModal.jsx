"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import NuviCompanion from "./NuviCompanion";
import NuviLoadingMessages from "./NuviLoadingMessages";
import LiquidGlassModal, { GlassCard, GlassButton, GlassInput, GlassSection } from "./LiquidGlassModal";
import { applyCoachActions } from "../../lib/applyCoachActions";

/**
 * AdjustModal v2 (2026-05-20) - Refonte LiquidGlassModal + actions structurees
 *
 * CHANGEMENTS MAJEURS vs v1 :
 *   - UI : LiquidGlassModal side panel (480px) avec frosted glass coherent
 *   - Logique : ACTIONS structurees (replace_bullet, delete_bullet, etc.)
 *     au lieu de regenerer le CV complet (cause du bug "fait mais rien change")
 *   - Verification : ne dit "applique" QUE si applyCoachActions a vraiment marche
 *   - Auto-retry : si l'IA renvoie 0 actions sur instruction explicite, signale
 *
 * Modes :
 *   - intro : suggestions chips + textarea (premier message)
 *   - chat  : historique + input continu (apres 1ere instruction)
 *
 * Props :
 *   - open: boolean
 *   - onClose: () => void
 *   - cv: object  (CV courant)
 *   - setCVFn: (newCv) => void
 *   - apiKey: string
 *   - T: object  (translations)
 *   - lang: "fr" | "en"
 *   - aiCall: async function
 *   - parseJSON: function
 *   - notify: (msg) => void
 *   - mob: boolean
 *   - prefillInst: string  (instruction pre-remplie depuis Audit/Truth)
 *   - onPrefillConsumed: () => void
 */
export default function AdjustModal({
  open,
  onClose,
  cv,
  setCVFn,
  apiKey,
  T,
  lang = "fr",
  aiCall,
  parseJSON,
  notify,
  mob = false,
  prefillInst = "",
  onPrefillConsumed,
}) {
  // Mode : "intro" (suggestions + textarea) ou "chat" (historique)
  const [mode, setMode] = useState("intro");
  const [instruction, setInstruction] = useState("");
  const [chatInput, setChatInput] = useState("");
  // history : [{ role: "user" | "nuvi", text: string, ts: number, applied?: string }]
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const chatScrollRef = useRef(null);
  const chatInputRef = useRef(null);

  // [Fix 2026-05-20] Consomme prefillInst des reception : envoie immediatement
  // l'instruction et bascule en mode chat. C'est ce qui permet aux suggestions
  // d'Audit/Truth de transiter via AdjustModal et etre effectivement appliquees.
  useEffect(() => {
    if (open && prefillInst && prefillInst.trim()) {
      const text = prefillInst.trim();
      // On bascule en mode chat ET on envoie l'instruction
      setMode("chat");
      // Defer pour que le mode change visuellement avant l'envoi
      const t = setTimeout(() => {
        sendInstructionInternal(text);
        if (onPrefillConsumed) onPrefillConsumed();
      }, 100);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefillInst]);

  // Persistance : restaure le draft + historique au montage
  useEffect(() => {
    if (open) {
      try {
        const draftI = localStorage.getItem("nv-adj-draft-instruction");
        if (draftI && !prefillInst) setInstruction(draftI);
        const draftH = localStorage.getItem("nv-adj-history");
        if (draftH) {
          const parsed = JSON.parse(draftH);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setHistory(parsed);
            setMode("chat");
          }
        }
      } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Persiste le draft et l'historique
  useEffect(() => {
    try {
      if (instruction) localStorage.setItem("nv-adj-draft-instruction", instruction);
      else localStorage.removeItem("nv-adj-draft-instruction");
    } catch (e) {}
  }, [instruction]);

  useEffect(() => {
    try {
      if (history.length > 0) localStorage.setItem("nv-adj-history", JSON.stringify(history));
      else localStorage.removeItem("nv-adj-history");
    } catch (e) {}
  }, [history]);

  // Auto-scroll chat
  useEffect(() => {
    if (mode === "chat" && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [history, loading, mode]);

  // Focus input
  useEffect(() => {
    if (open && mode === "chat" && chatInputRef.current) {
      chatInputRef.current.focus();
    }
  }, [open, mode]);

  // Suggestions chips
  const suggestions = lang === "fr" ? [
    { id: "chiffre", label: "Rends les bullets plus chiffrés" },
    { id: "court",   label: "Raccourcis l'accroche en 2 lignes" },
    { id: "verbes",  label: "Verbes d'action plus forts" },
    { id: "reorg",   label: "Réorganise les compétences" },
    { id: "pro",     label: "Ton premium corporate" },
    { id: "trad",    label: "Traduire en anglais" },
  ] : [
    { id: "chiffre", label: "Make bullets more quantified" },
    { id: "court",   label: "Shorten summary to 2 lines" },
    { id: "verbes",  label: "Stronger action verbs" },
    { id: "reorg",   label: "Reorganize skills" },
    { id: "pro",     label: "Premium corporate tone" },
    { id: "trad",    label: "Translate to English" },
  ];

  // [Fix 2026-05-20] Core function : envoie instruction et applique les actions
  // structurees (replace_bullet, delete_bullet, etc.) au lieu de regenerer
  // tout le CV. Beaucoup plus fiable et verifiable.
  const sendInstructionInternal = useCallback(async (text) => {
    if (!text || !text.trim()) return;
    if (!apiKey) {
      notify && notify(lang === "fr"
        ? "Cle API requise dans les Reglages."
        : "API key required in Settings.");
      return;
    }

    console.log("[AdjustModal v2] sendInstruction:", text);

    // Ajoute message user
    const userMsg = { role: "user", text: text.trim(), ts: Date.now() };
    setHistory(prev => [...prev, userMsg]);
    setLoading(true);
    setInstruction("");
    setChatInput("");
    setMode("chat");

    try {
      // Index explicite des experiences pour cibler par exp_idx
      const expIndex = (cv.experience || []).map((e, i) =>
        "  exp_idx=" + i
        + " : " + (e.title || "(no title)")
        + " @ " + (e.company || "(no company)")
        + " [" + (e.period || "no period") + "]"
        + " (" + ((e.bullets || []).filter(b => b).length) + " bullets)"
      ).join("\n");

      const noDash = "Tu interdis tous les tirets cadratin (em dash) ou demi-cadratin (en dash). "
        + "Utilise UNIQUEMENT virgule, parenthese, deux points ou tiret simple - (hyphen-minus).";

      const langLine = lang === "en"
        ? "Reply STRICTLY in English."
        : "Reply STRICTLY in French.";

      // [Fix 2026-05-20] Prompt avec ACTIONS STRUCTUREES au lieu de regen CV complet
      const prompt = "You are Nuvi, a senior CV expert. The candidate's complete CV is in your context (cv_context block)."
        + " Apply the user's instruction by returning structured ACTIONS, NOT the full CV."

        + "\n\nEXPERIENCE INDEX (use exp_idx to target a specific job):"
        + "\n" + (expIndex || "  (no experience)")

        + "\n\nUSER INSTRUCTION: \"" + text.trim() + "\""

        + "\n\nCORE BEHAVIOR:"
        + "\n- You APPLY directly via actions, you DON'T propose then re-propose."
        + "\n- Read the instruction carefully. Identify WHICH parts of the CV to modify."
        + "\n- Return ONLY the actions needed. Do NOT regenerate the whole CV."
        + "\n- If instruction is unclear, return empty actions + ask 1 clarifying question."
        + "\n- " + noDash + " " + langLine

        + "\n\nACTION TYPES YOU CAN RETURN (31 types - use the right one):"
        + "\n## PERSONAL : update_name, update_email, update_phone, update_location, update_linkedin {type, new_text}"
        + "\n## PROFILE : update_summary {type, new_text}, clear_summary {type}, update_title {type, new_text}, clear_title {type}"
        + "\n## BULLETS : replace_bullet {type, exp_idx, bullet_idx, new_text}, delete_bullet {type, exp_idx, bullet_idx}, add_bullet {type, exp_idx, text}, reorder_bullets {type, exp_idx, order:[]}"
        + "\n## EXPERIENCES : update_experience {type, exp_idx, new_title?, new_company?, new_period?, new_location?}, add_experience {type, title, company, period, bullets:[]}, delete_experience {type, exp_idx}, reorder_experiences {type, order:[]}"
        + "\n## EDUCATION : update_education {type, edu_idx, ...}, add_education {type, degree, school, period}, delete_education {type, edu_idx}, reorder_education {type, order:[]}"
        + "\n## CERTIFICATIONS : add_certification {type, text}, delete_certification {type, cert_idx}, replace_certification {type, cert_idx, new_text}"
        + "\n## SKILLS : add_skill {type, text}, delete_skill {type, skill_idx}, replace_skill {type, skill_idx, new_text}, replace_all_skills {type, skills:[]}"
        + "\n## LANGUAGES : add_language {type, lang, level}, delete_language {type, lang_idx}, update_language {type, lang_idx, new_lang?, new_level?}"
        + "\n\nGUIDELINES:"
        + "\n- Prefer replace_bullet to add_bullet (avoid accumulation)."
        + "\n- Use delete_experience to fully remove a job (not delete each bullet one by one)."
        + "\n- Use replace_all_skills for full skills reorganization."

        + "\n\nOUTPUT FORMAT (JSON ONLY, no markdown, no backticks):"
        + '\n{"reply": "your short reply (1-2 sentences)", "actions": [...]}'
        + '\n\nIf you need more info, return empty actions:'
        + '\n{"reply": "your follow-up question", "actions": []}';

      // [Fix] Passe le CV via options.cv (cache ephemeral)
      const txt = await aiCall(prompt, { cv, task_name: "adjust_modal_v2" });
      console.log("[AdjustModal v2] aiCall response length:", (txt || "").length);

      const parsed = parseJSON(txt);
      const reply = (parsed && parsed.reply) ? String(parsed.reply) : (txt || "");
      const actions = (parsed && Array.isArray(parsed.actions)) ? parsed.actions : [];

      console.log("[AdjustModal v2] actions count:", actions.length, "actions:", actions);

      // [Fix] Applique les actions ET verifie le resultat
      let appliedSummary = "";
      let realChange = false;

      if (actions.length > 0) {
        const result = applyCoachActions(cv, actions, { lang });
        console.log("[AdjustModal v2] applyCoachActions result:", result);

        if (result.applied > 0) {
          setCVFn(() => result.newCv);
          appliedSummary = result.summary;
          realChange = true;
          if (result.failed && result.failed.length > 0) {
            console.warn("[AdjustModal v2] Some actions failed:", result.failed);
          }
        } else if (result.failed && result.failed.length > 0) {
          console.warn("[AdjustModal v2] All actions failed:", result.failed);
        }
      }

      // [Fix] Construit la reponse Nuvi avec INDICATEUR REEL d'application
      let nuviReplyText;
      if (realChange) {
        // Vraie application : on confirme avec details
        nuviReplyText = reply || (lang === "fr"
          ? "C'est fait. " + appliedSummary
          : "Done. " + appliedSummary);
      } else if (actions.length === 0) {
        // Aucune action : c'est une question de clarification
        nuviReplyText = reply || (lang === "fr"
          ? "J'ai besoin de plus de details. Peux-tu preciser ?"
          : "I need more details. Can you specify?");
      } else {
        // Actions retournees mais aucune appliquee : signale l'echec
        console.warn("[AdjustModal v2] Actions returned but NONE applied");
        nuviReplyText = lang === "fr"
          ? "J'ai compris ta demande mais je n'ai pas reussi a l'appliquer. Peux-tu reformuler ?"
          : "I understood your request but couldn't apply it. Can you rephrase?";
      }

      const nuviMsg = {
        role: "nuvi",
        text: nuviReplyText,
        ts: Date.now(),
        ...(realChange ? { applied: appliedSummary } : {}),
      };
      setHistory(prev => [...prev, nuviMsg]);

      // Notif visible
      if (realChange) {
        notify && notify(lang === "fr" ? "Applique : " + appliedSummary : "Applied: " + appliedSummary);
      }

    } catch (e) {
      console.error("[AdjustModal v2] Error:", e);
      const errMsg = lang === "fr"
        ? "Erreur : " + (e?.message || "reessaie dans un instant.")
        : "Error: " + (e?.message || "try again.");
      const errReply = { role: "nuvi", text: errMsg, ts: Date.now() };
      setHistory(prev => [...prev, errReply]);
      notify && notify(errMsg);
    } finally {
      setLoading(false);
    }
  }, [cv, apiKey, lang, aiCall, parseJSON, setCVFn, notify]);

  // Public wrapper : recupere le texte depuis le bon input selon le mode
  const sendInstruction = useCallback((textToSend) => {
    const text = (textToSend || instruction || chatInput || "").trim();
    if (!text) {
      notify && notify(lang === "fr"
        ? "Ecris une instruction d'abord."
        : "Write an instruction first.");
      return;
    }
    sendInstructionInternal(text);
  }, [instruction, chatInput, sendInstructionInternal, notify, lang]);

  // Chip click : remplit le champ
  const handleChipClick = (sug) => {
    if (mode === "intro") setInstruction(sug.label);
    else setChatInput(sug.label);
  };

  // Reset historique
  const handleClearHistory = () => {
    setHistory([]);
    setMode("intro");
    setChatInput("");
    setInstruction("");
    try {
      localStorage.removeItem("nv-adj-history");
      localStorage.removeItem("nv-adj-draft-instruction");
    } catch (e) {}
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendInstruction();
    }
  };

  if (!open) return null;

  // Footer : input (chat) ou bouton submit (intro)
  let footerContent;
  if (mode === "intro") {
    footerContent = (
      <GlassButton
        variant="primary"
        fullWidth
        disabled={loading || !instruction.trim() || !apiKey}
        onClick={() => sendInstruction()}
      >
        {loading
          ? (lang === "fr" ? "Nuvi travaille..." : "Nuvi working...")
          : (lang === "fr" ? "Ajuster mon CV" : "Adjust my CV")}
        {!loading && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        )}
      </GlassButton>
    );
  } else {
    footerContent = (
      <div>
        {/* Quick suggestions chips */}
        <div style={{
          display: "flex", gap: 6, overflowX: "auto",
          marginBottom: 10, paddingBottom: 4,
        }}>
          {suggestions.slice(0, 4).map(sug => (
            <button
              key={sug.id}
              onClick={() => handleChipClick(sug)}
              style={{
                fontSize: 11,
                padding: "5px 11px",
                borderRadius: 999,
                background: "rgba(252, 231, 221, 0.7)",
                color: "#993C1D",
                border: "none",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                whiteSpace: "nowrap",
                flexShrink: 0,
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                transition: "background 150ms ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(245, 212, 197, 0.85)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(252, 231, 221, 0.7)"; }}
            >
              {sug.label}
            </button>
          ))}
        </div>

        {/* Input + send */}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <GlassInput
            multiline
            rows={1}
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={lang === "fr" ? "Demande a Nuvi..." : "Ask Nuvi..."}
            disabled={loading}
            style={{ maxHeight: 100 }}
          />
          <button
            onClick={() => sendInstruction()}
            disabled={loading || !chatInput.trim() || !apiKey}
            aria-label={lang === "fr" ? "Envoyer" : "Send"}
            style={{
              width: 38, height: 38,
              borderRadius: "50%",
              background: (loading || !chatInput.trim() || !apiKey)
                ? "rgba(255,255,255,0.4)"
                : "linear-gradient(135deg, var(--nuvi-purple), var(--nuvi-magenta))",
              border: "none",
              color: (loading || !chatInput.trim() || !apiKey) ? "var(--nuvi-ink-muted)" : "#fff",
              cursor: (loading || !chatInput.trim() || !apiKey) ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              transition: "all 150ms ease",
              boxShadow: (loading || !chatInput.trim() || !apiKey)
                ? "none" : "0 2px 8px rgba(91, 61, 245, 0.3)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Header actions : bouton Reset visible en mode chat
  const headerActions = (mode === "chat" && history.length > 0) ? (
    <button
      onClick={handleClearHistory}
      style={{
        background: "rgba(255, 255, 255, 0.5)",
        backdropFilter: "blur(18px) saturate(170%)",
        WebkitBackdropFilter: "blur(18px) saturate(170%)",
        border: "0.5px solid rgba(255, 255, 255, 0.6)",
        color: "var(--nuvi-ink)",
        cursor: "pointer",
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        fontFamily: "'Inter', sans-serif",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        transition: "all 150ms ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.75)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.5)"; }}
      title={lang === "fr" ? "Nouvelle conversation" : "New conversation"}
    >
      {lang === "fr" ? "Reset" : "Reset"}
    </button>
  ) : null;

  return (
    <LiquidGlassModal
      open={open}
      onClose={onClose}
      layout="side"
      width={mob ? window.innerWidth : 480}
      eyebrow={lang === "fr" ? "NUVI ADJUST" : "NUVI ADJUST"}
      title={lang === "fr" ? "Ajuster" : "Adjust"}
      titleAccent={lang === "fr" ? "avec Nuvi" : "with Nuvi"}
      subtitle={lang === "fr" ? "Je modifie sans inventer." : "I edit without inventing."}
      headerActions={headerActions}
      footer={footerContent}
    >
      {/* ============ MODE INTRO ============ */}
      {mode === "intro" && (
        <div style={{ paddingTop: 8 }}>
          {/* Sub-header */}
          <p style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 18, fontWeight: 400, lineHeight: 1.25,
            color: "var(--nuvi-ink)",
            margin: "0 0 6px",
            letterSpacing: "-0.015em",
          }}>
            {lang === "fr" ? "Que veux-tu ameliorer ?" : "What to improve?"}
          </p>
          <p style={{
            fontSize: 12, color: "var(--nuvi-ink-muted)",
            lineHeight: 1.5, margin: "0 0 20px",
          }}>
            {lang === "fr"
              ? "Decris en une phrase, je m'occupe du reste."
              : "Describe in one sentence, I'll handle the rest."}
          </p>

          {/* Suggestions */}
          <GlassSection title={lang === "fr" ? "Suggestions rapides" : "Quick suggestions"}>
            {suggestions.map(sug => (
              <GlassCard
                key={sug.id}
                onClick={() => handleChipClick(sug)}
                padding="11px 14px"
                marginBottom={8}
              >
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  fontSize: 13, color: "var(--nuvi-ink)",
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "var(--nuvi-coral)", flexShrink: 0,
                  }} />
                  {sug.label}
                </div>
              </GlassCard>
            ))}
          </GlassSection>

          {/* Textarea custom */}
          <GlassSection title={lang === "fr" ? "Ou ecris ton instruction" : "Or write your instruction"}>
            <GlassInput
              multiline
              rows={4}
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={lang === "fr"
                ? "Ex: Rends mon CV plus impactant pour un poste de Product Manager senior..."
                : "E.g.: Make my CV more impactful for a senior Product Manager role..."}
            />
          </GlassSection>

          {/* Hint */}
          <p style={{
            fontSize: 11, color: "var(--nuvi-ink-muted)",
            textAlign: "center", margin: "16px 0 8px",
            lineHeight: 1.4,
          }}>
            {lang === "fr"
              ? "Toujours annulable depuis l'historique."
              : "Always reversible from history."}
          </p>
        </div>
      )}

      {/* ============ MODE CHAT ============ */}
      {mode === "chat" && (
        <div
          ref={chatScrollRef}
          style={{
            display: "flex", flexDirection: "column",
            gap: 12, paddingTop: 4, paddingBottom: 8,
          }}
        >
          {history.map((msg, idx) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={idx}
                style={{
                  alignSelf: isUser ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  display: "flex", gap: 8,
                  flexDirection: isUser ? "row-reverse" : "row",
                  alignItems: "flex-start",
                }}
              >
                {!isUser && (
                  <div style={{
                    width: 32, height: 32, flexShrink: 0,
                    marginTop: 2,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    position: "relative",
                  }}>
                    {/* Shadow halo derriere l'oeil */}
                    <div style={{
                      position: "absolute",
                      inset: -3,
                      borderRadius: "50%",
                      background: "radial-gradient(circle, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.08) 50%, transparent 75%)",
                      filter: "blur(3px)",
                      pointerEvents: "none",
                      zIndex: 0,
                    }} />
                    <div style={{ position: "relative", zIndex: 1 }}>
                      <NuviCompanion size={32} mode="speaking" />
                    </div>
                  </div>
                )}
                <div style={{
                  padding: "10px 14px",
                  borderRadius: isUser ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                  background: isUser
                    ? "linear-gradient(135deg, var(--nuvi-purple) 0%, var(--nuvi-magenta) 100%)"
                    : "rgba(255, 255, 255, 0.55)",
                  backdropFilter: isUser ? undefined : "blur(20px) saturate(180%)",
                  WebkitBackdropFilter: isUser ? undefined : "blur(20px) saturate(180%)",
                  color: isUser ? "#fff" : "var(--nuvi-ink)",
                  fontSize: 13, lineHeight: 1.55,
                  border: isUser ? "none" : "0.5px solid rgba(255, 255, 255, 0.6)",
                  boxShadow: isUser
                    ? "0 4px 16px rgba(91, 61, 245, 0.25)"
                    : "0 2px 8px rgba(0,0,0,0.06)",
                  wordBreak: "break-word",
                }}>
                  {msg.text}
                </div>
              </div>
            );
          })}

          {/* Loading bubble */}
          {loading && (
            <div style={{
              alignSelf: "flex-start",
              display: "flex", gap: 8, alignItems: "flex-start",
            }}>
              <div style={{
                width: 32, height: 32, flexShrink: 0, marginTop: 2,
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
              }}>
                <div style={{
                  position: "absolute", inset: -3,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.08) 50%, transparent 75%)",
                  filter: "blur(3px)",
                  pointerEvents: "none",
                  zIndex: 0,
                }} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <NuviCompanion size={32} mode="loading" />
                </div>
              </div>
              <div style={{
                padding: "10px 14px",
                borderRadius: "4px 16px 16px 16px",
                background: "rgba(255, 255, 255, 0.55)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                border: "0.5px solid rgba(255, 255, 255, 0.6)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                fontSize: 12, color: "var(--nuvi-ink-muted)",
              }}>
                <NuviLoadingMessages series="generic" lang={lang} compact={true} />
              </div>
            </div>
          )}
        </div>
      )}
    </LiquidGlassModal>
  );
}
