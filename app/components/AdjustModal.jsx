"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import NuviCompanion from "./NuviCompanion";
import NuviLoadingMessages from "./NuviLoadingMessages";

/**
 * AdjustModal - Modal sliding from right pour ajuster le CV avec Nuvi
 *
 * Comportement hybride (specs experts) :
 *   - Mode INTRO (par defaut) : suggestions chips + textarea, single instruction
 *   - Mode CHAT (apres 1ere instruction) : historique + input continu
 *
 * Specs validees par panel d'experts :
 *   - Largeur 420px desktop, full-width mobile (Zhuo + Lovin)
 *   - Slide-in 250ms cubic-bezier (Saarinen)
 *   - NuviCompanion en speaking mode (Ross)
 *   - Suggestions chips visibles (Walter)
 *   - Auto-close optionnel apres envoi (Zhuo) - ON par defaut en mode intro
 *   - Mode chat persistant (Stanton) - apres switch
 *   - Draft + historique en localStorage (Lovin)
 *   - Backdrop blur + opacite 30% (Ive)
 *
 * Props :
 *   - open: boolean
 *   - onClose: () => void
 *   - cv: object  (CV courant)
 *   - setCVFn: (newCv) => void  (applique le nouveau CV)
 *   - apiKey: string
 *   - T: object  (translations dictionary, depuis page.jsx)
 *   - lang: "fr" | "en"
 *   - aiCall: async function  (appel a l'API Claude)
 *   - parseJSON: function (parse safe)
 *   - notify: (msg) => void
 *   - mob: boolean
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
}) {
  // Couleurs Nuvi
  const Cream = "#faf8f3";
  const CreamSoft = "#f6f2e8";
  const Paper = "#ffffff";
  const Ink = "#0f0f12";
  const InkMuted = "#5a5a62";
  const Hairline = "#e8e3d6";
  const Coral = "#d97757";
  const CoralSoft = "#fce7dd";
  const CoralDeep = "#993C1D";
  const Violet = "#5b3df5";
  const Magenta = "#b91c8c";
  const VioletSoft = "#ede9fe";

  // Mode : "intro" (par defaut, single instruction) ou "chat" (apres 1ere instruction)
  const [mode, setMode] = useState("intro");
  const [instruction, setInstruction] = useState("");
  const [chatInput, setChatInput] = useState("");
  // history : [{ role: "user" | "nuvi", text: string, ts: number }]
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shouldRender, setShouldRender] = useState(open);
  const [closing, setClosing] = useState(false);

  const chatScrollRef = useRef(null);
  const chatInputRef = useRef(null);

  // Persistance : restaure le draft + historique au montage
  useEffect(() => {
    if (open) {
      try {
        const draftI = localStorage.getItem("nv-adj-draft-instruction");
        if (draftI) setInstruction(draftI);
        const draftH = localStorage.getItem("nv-adj-history");
        if (draftH) {
          const parsed = JSON.parse(draftH);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setHistory(parsed);
            setMode("chat"); // si historique existe, on est en mode chat
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }, [open]);

  // Persiste le draft et l'historique
  useEffect(() => {
    try {
      if (instruction) {
        localStorage.setItem("nv-adj-draft-instruction", instruction);
      } else {
        localStorage.removeItem("nv-adj-draft-instruction");
      }
    } catch (e) {}
  }, [instruction]);

  useEffect(() => {
    try {
      if (history.length > 0) {
        localStorage.setItem("nv-adj-history", JSON.stringify(history));
      } else {
        localStorage.removeItem("nv-adj-history");
      }
    } catch (e) {}
  }, [history]);

  // Animation d'entree / sortie
  useEffect(() => {
    if (open) {
      setShouldRender(true);
      setClosing(false);
    } else if (shouldRender) {
      setClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setClosing(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open, shouldRender]);

  // Auto-scroll chat vers le bas a chaque nouveau message
  useEffect(() => {
    if (mode === "chat" && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [history, loading, mode]);

  // Focus auto sur l'input
  useEffect(() => {
    if (open && mode === "chat" && chatInputRef.current) {
      chatInputRef.current.focus();
    }
  }, [open, mode]);

  // Suggestions chips (couleur terracotta)
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

  // Handler envoi instruction (intro mode ou chat mode)
  const sendInstruction = useCallback(async (textToSend) => {
    const text = (textToSend || instruction || chatInput || "").trim();
    if (!text) {
      notify && notify(lang === "fr"
        ? "Ecris une instruction d'abord."
        : "Write an instruction first.");
      return;
    }
    if (!apiKey) {
      notify && notify(lang === "fr"
        ? "Clé API requise dans les Réglages."
        : "API key required in Settings.");
      return;
    }

    // Ajoute l'instruction utilisateur a l'historique
    const newUserMsg = { role: "user", text, ts: Date.now() };
    setHistory(prev => [...prev, newUserMsg]);
    setLoading(true);
    setInstruction("");
    setChatInput("");

    try {
      // Construire le prompt pour Nuvi
      const sys = lang === "fr"
        ? "Tu es Nuvi, recruteur senior. L'utilisateur te donne une instruction pour modifier son CV. Tu modifies UNIQUEMENT ce qui est demande, sans inventer de contenu. Reponds STRICTEMENT en JSON avec la structure CV complete modifiee. Pas de tirets cadratin (em dash) ni demi-cadratin (en dash). Format JSON brut, pas de markdown."
        : "You are Nuvi, a senior recruiter. The user gives you an instruction to modify their CV. You modify ONLY what is requested, without inventing content. Reply STRICTLY in JSON with the complete modified CV structure. No em dashes or en dashes. Raw JSON format, no markdown.";

      const usr = `CV actuel:\n${JSON.stringify(cv, null, 2)}\n\nInstruction: ${text}\n\nRetourne le CV modifie en JSON brut.`;

      const response = await aiCall({
        system: sys,
        user: usr,
        max_tokens: 4000,
        apiKey,
      });

      const newCv = parseJSON(response);
      if (newCv && typeof newCv === "object") {
        setCVFn(newCv);

        // Ajoute la reponse de Nuvi a l'historique
        const replyText = lang === "fr"
          ? "C'est fait. Modification appliquée."
          : "Done. Changes applied.";
        const nuviMsg = { role: "nuvi", text: replyText, ts: Date.now() };
        setHistory(prev => [...prev, nuviMsg]);

        // Switch vers mode chat (si on etait en intro, on reste en chat apres)
        setMode("chat");

        notify && notify(lang === "fr" ? "CV ajusté" : "CV adjusted");
      } else {
        const errMsg = lang === "fr"
          ? "Désolé, la modification n'a pas pu être appliquée. Essaie de reformuler."
          : "Sorry, the change couldn't be applied. Try rephrasing.";
        const errReply = { role: "nuvi", text: errMsg, ts: Date.now() };
        setHistory(prev => [...prev, errReply]);
      }
    } catch (e) {
      const errMsg = lang === "fr"
        ? "Erreur. " + (e.message || "")
        : "Error. " + (e.message || "");
      const errReply = { role: "nuvi", text: errMsg, ts: Date.now() };
      setHistory(prev => [...prev, errReply]);
    } finally {
      setLoading(false);
    }
  }, [instruction, chatInput, cv, apiKey, lang, aiCall, parseJSON, setCVFn, notify]);

  // Handler chip click : remplit le champ
  const handleChipClick = (sug) => {
    if (mode === "intro") {
      setInstruction(sug.label);
    } else {
      setChatInput(sug.label);
    }
  };

  // Handler clear history (revient en mode intro)
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

  // Handler keypress in textarea / input (Enter sans Shift = envoyer)
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendInstruction();
    }
  };

  if (!shouldRender) return null;

  // Largeur : 420px desktop, full-width mobile
  const modalWidth = mob ? "100vw" : 420;

  return (
    <>
      {/* Backdrop avec blur leger */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 15, 18, 0.3)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          zIndex: 600,
          opacity: closing ? 0 : 1,
          transition: "opacity 200ms ease-out",
        }}
        aria-hidden="true"
      />

      {/* Modal sliding from right */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={T?.adj_title || (lang === "fr" ? "Ajuster avec Nuvi" : "Adjust with Nuvi")}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: modalWidth,
          maxWidth: "100vw",
          background: Paper,
          boxShadow: "0 0 40px rgba(0,0,0,0.15)",
          zIndex: 601,
          display: "flex",
          flexDirection: "column",
          fontFamily: "'Inter', -apple-system, sans-serif",
          transform: closing ? "translateX(100%)" : "translateX(0)",
          transition: closing
            ? "transform 200ms cubic-bezier(0.55, 0, 1, 0.45)"
            : "transform 250ms cubic-bezier(0.22, 1, 0.36, 1)",
          animation: !closing ? "nuviModalSlideIn 250ms cubic-bezier(0.22, 1, 0.36, 1)" : undefined,
        }}
      >
        {/* Header */}
        <div style={{
          padding: "16px 18px",
          borderBottom: "0.5px solid " + Hairline,
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: Paper,
          flexShrink: 0,
        }}>
          {/* NuviCompanion en mode speaking (anime quand loading) */}
          <div style={{ width: 44, height: 44, flexShrink: 0 }}>
            <NuviCompanion
              mode={loading ? "loading" : "speaking"}
              size={44}
              ariaLabel="Nuvi"
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 500,
              fontSize: 17,
              margin: 0,
              color: Ink,
              letterSpacing: "-0.01em",
            }}>
              {lang === "fr" ? "Ajuster avec Nuvi" : "Adjust with Nuvi"}
            </h2>
            <p style={{
              fontSize: 11,
              color: InkMuted,
              margin: "2px 0 0",
              fontWeight: 500,
            }}>
              {lang === "fr"
                ? "Je modifie sans inventer."
                : "I edit without inventing."}
            </p>
          </div>

          {/* Clear history (visible en mode chat seulement) */}
          {mode === "chat" && history.length > 0 && (
            <button
              onClick={handleClearHistory}
              style={{
                background: "transparent",
                border: "none",
                color: InkMuted,
                cursor: "pointer",
                padding: 6,
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 500,
                fontFamily: "inherit",
                transition: "color 150ms ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = Coral; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = InkMuted; }}
              aria-label={lang === "fr" ? "Effacer l'historique" : "Clear history"}
              title={lang === "fr" ? "Nouvelle conversation" : "New conversation"}
            >
              {lang === "fr" ? "Reset" : "Reset"}
            </button>
          )}

          {/* Close button */}
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
            aria-label={lang === "fr" ? "Fermer" : "Close"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* === MODE INTRO : single instruction + suggestions === */}
        {mode === "intro" && (
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 18px",
            display: "flex",
            flexDirection: "column",
          }}>
            {/* Sub-header */}
            <p style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 22,
              fontWeight: 400,
              lineHeight: 1.2,
              color: Ink,
              margin: "0 0 6px",
              letterSpacing: "-0.015em",
            }}>
              {lang === "fr"
                ? "Que veux-tu améliorer ?"
                : "What do you want to improve?"}
            </p>
            <p style={{
              fontSize: 13,
              color: InkMuted,
              lineHeight: 1.5,
              margin: "0 0 22px",
            }}>
              {lang === "fr"
                ? "Décris en une phrase, je m'occupe du reste."
                : "Describe in one sentence, I'll handle the rest."}
            </p>

            {/* Suggestions chips */}
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: Coral,
              marginBottom: 10,
            }}>
              {lang === "fr" ? "Suggestions rapides" : "Quick suggestions"}
            </div>
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 22,
            }}>
              {suggestions.map(sug => (
                <button
                  key={sug.id}
                  onClick={() => handleChipClick(sug)}
                  style={{
                    textAlign: "left",
                    padding: "11px 14px",
                    border: "0.5px solid " + Hairline,
                    borderRadius: 10,
                    background: Paper,
                    fontSize: 13,
                    fontFamily: "inherit",
                    color: Ink,
                    cursor: "pointer",
                    transition: "all 150ms ease",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = Coral;
                    e.currentTarget.style.background = CoralSoft;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = Hairline;
                    e.currentTarget.style.background = Paper;
                  }}
                >
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: Coral, flexShrink: 0,
                  }}/>
                  {sug.label}
                </button>
              ))}
            </div>

            {/* Textarea instruction custom */}
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: Coral,
              marginBottom: 8,
            }}>
              {lang === "fr" ? "Ou écris ton instruction" : "Or write your instruction"}
            </div>
            <textarea
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={lang === "fr"
                ? "Ex: Rends mon CV plus impactant pour un poste de Product Manager senior..."
                : "E.g.: Make my CV more impactful for a senior Product Manager role..."}
              rows={4}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "0.5px solid " + Hairline,
                background: Paper,
                color: Ink,
                fontSize: 13,
                lineHeight: 1.5,
                fontFamily: "inherit",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 150ms ease",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = Violet; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = Hairline; }}
            />

            {/* Footer with submit button */}
            <div style={{ marginTop: 16 }}>
              <button
                onClick={() => sendInstruction()}
                disabled={loading || !instruction.trim() || !apiKey}
                style={{
                  width: "100%",
                  padding: "13px 22px",
                  borderRadius: 999,
                  background: (loading || !instruction.trim() || !apiKey)
                    ? Hairline
                    : `linear-gradient(135deg, ${Violet} 0%, ${Magenta} 100%)`,
                  color: (loading || !instruction.trim() || !apiKey) ? InkMuted : "#fff",
                  border: "none",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: (loading || !instruction.trim() || !apiKey) ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 200ms ease",
                  boxShadow: (loading || !instruction.trim() || !apiKey)
                    ? "none"
                    : "0 4px 16px rgba(91, 61, 245, 0.25)",
                }}
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
              </button>

              {/* Hint footer */}
              <p style={{
                fontSize: 11,
                color: InkMuted,
                textAlign: "center",
                margin: "10px 0 0",
                lineHeight: 1.4,
              }}>
                {lang === "fr"
                  ? "Toujours annulable depuis l'historique."
                  : "Always reversible from history."}
              </p>
            </div>
          </div>
        )}

        {/* === MODE CHAT : historique + input continu === */}
        {mode === "chat" && (
          <>
            <div
              ref={chatScrollRef}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                background: CreamSoft,
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
                      display: "flex",
                      gap: 8,
                      flexDirection: isUser ? "row-reverse" : "row",
                      alignItems: "flex-start",
                    }}
                  >
                    {!isUser && (
                      <div style={{
                        width: 24, height: 24, flexShrink: 0,
                        borderRadius: "50%",
                        background: `linear-gradient(135deg, ${Violet}, ${Magenta})`,
                        marginTop: 4,
                      }}/>
                    )}
                    <div style={{
                      padding: "9px 13px",
                      borderRadius: isUser
                        ? "16px 16px 4px 16px"
                        : "4px 16px 16px 16px",
                      background: isUser ? Violet : Paper,
                      color: isUser ? "#fff" : Ink,
                      fontSize: 13,
                      lineHeight: 1.5,
                      border: isUser ? "none" : "0.5px solid " + Hairline,
                      wordBreak: "break-word",
                    }}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}

              {/* Loading state Nuvi */}
              {loading && (
                <div style={{
                  alignSelf: "flex-start",
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                }}>
                  <div style={{
                    width: 24, height: 24, flexShrink: 0,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${Violet}, ${Magenta})`,
                    marginTop: 4,
                  }}/>
                  <div style={{
                    padding: "9px 13px",
                    borderRadius: "4px 16px 16px 16px",
                    background: Paper,
                    border: "0.5px solid " + Hairline,
                    fontSize: 12,
                    color: InkMuted,
                  }}>
                    <NuviLoadingMessages
                      series="generic"
                      lang={lang}
                      compact={true}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Suggestions chips condenses en mode chat */}
            <div style={{
              padding: "8px 14px",
              borderTop: "0.5px solid " + Hairline,
              background: Paper,
              display: "flex",
              gap: 6,
              overflowX: "auto",
              flexShrink: 0,
            }}>
              {suggestions.slice(0, 4).map(sug => (
                <button
                  key={sug.id}
                  onClick={() => handleChipClick(sug)}
                  style={{
                    fontSize: 11,
                    padding: "5px 11px",
                    borderRadius: 999,
                    background: CoralSoft,
                    color: CoralDeep,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    transition: "background 150ms ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#f5d4c5"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = CoralSoft; }}
                >
                  {sug.label}
                </button>
              ))}
            </div>

            {/* Input continu */}
            <div style={{
              padding: "12px 14px",
              borderTop: "0.5px solid " + Hairline,
              background: Paper,
              display: "flex",
              gap: 8,
              alignItems: "flex-end",
              flexShrink: 0,
            }}>
              <textarea
                ref={chatInputRef}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={lang === "fr"
                  ? "Demande à Nuvi..."
                  : "Ask Nuvi..."}
                rows={1}
                style={{
                  flex: 1,
                  padding: "9px 14px",
                  borderRadius: 999,
                  border: "0.5px solid " + Hairline,
                  background: CreamSoft,
                  color: Ink,
                  fontSize: 13,
                  lineHeight: 1.4,
                  fontFamily: "inherit",
                  resize: "none",
                  outline: "none",
                  boxSizing: "border-box",
                  maxHeight: 100,
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = Violet; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = Hairline; }}
              />
              <button
                onClick={() => sendInstruction()}
                disabled={loading || !chatInput.trim() || !apiKey}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: (loading || !chatInput.trim() || !apiKey)
                    ? Hairline
                    : `linear-gradient(135deg, ${Violet}, ${Magenta})`,
                  border: "none",
                  color: (loading || !chatInput.trim() || !apiKey) ? InkMuted : "#fff",
                  cursor: (loading || !chatInput.trim() || !apiKey) ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 150ms ease",
                  boxShadow: (loading || !chatInput.trim() || !apiKey)
                    ? "none"
                    : "0 2px 8px rgba(91, 61, 245, 0.3)",
                }}
                aria-label={lang === "fr" ? "Envoyer" : "Send"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>
                </svg>
              </button>
            </div>
          </>
        )}

        {/* Animation keyframes */}
        <style>{`
          @keyframes nuviModalSlideIn {
            from {
              transform: translateX(100%);
            }
            to {
              transform: translateX(0);
            }
          }
        `}</style>
      </aside>
    </>
  );
}
