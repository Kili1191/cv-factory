"use client";

// Assistant d'entretien en direct.
//
// CE QUI GOUVERNE CETTE CONCEPTION : LE DELAI
//
// Un assistant qui repond en cinq secondes est inutilisable pendant qu'on
// parle a quelqu'un. Tout ici est plie a cette contrainte :
//
//   - La transcription se fait dans le navigateur, pas sur un serveur. Zero
//     aller-retour reseau pour entendre.
//   - On declenche des qu'une question semble finie, sans attendre un
//     silence long.
//   - La reponse arrive en flux : le premier repere s'affiche pendant que la
//     suite s'ecrit encore.
//   - On demande TROIS REPERES COURTS, jamais un texte. Personne ne peut lire
//     un paragraphe en repondant a quelqu'un. Des reperes se lisent d'un coup
//     d'oeil et se disent avec ses propres mots.
//
// SUR LA LANGUE
//
// Les reperes sont ecrits dans l'anglais du candidat, pas dans un anglais de
// manuel. Le CV sert d'echantillon de style : meme registre, meme vocabulaire.
// Un repere qu'on ne saurait pas prononcer naturellement ne sert a rien.

import React, { useCallback, useEffect, useRef, useState } from "react";

const SILENCE_MS = 900;

export default function LiveAssistModal({ open, onClose, cv, offer, locale = "fr" }) {
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [cues, setCues] = useState("");
  const [thinking, setThinking] = useState(false);
  const [support, setSupport] = useState("unknown");
  const [manual, setManual] = useState("");

  const recRef = useRef(null);
  const silenceRef = useRef(null);
  const lastSentRef = useRef("");
  const abortRef = useRef(null);

  const T = locale === "en" ? {
    title: "Live assist",
    sub: "It listens, and gives you three cues. Never a script.",
    start: "Start listening", stop: "Stop",
    heard: "Heard", cues: "Say this",
    idle: "Waiting for a question...",
    manual: "Or type the question",
    ask: "Get cues",
    noSupport: "This browser cannot transcribe. Type the question instead.",
    thinking: "...",
  } : {
    title: "Assistant live",
    sub: "Il ecoute et te donne trois reperes. Jamais un texte a lire.",
    start: "Commencer a ecouter", stop: "Arreter",
    heard: "Entendu", cues: "Dis ca",
    idle: "En attente d'une question...",
    manual: "Ou tape la question",
    ask: "Donne-moi les reperes",
    noSupport: "Ce navigateur ne sait pas transcrire. Tape la question a la place.",
    thinking: "...",
  };

  // Echantillon de style : ce que le candidat ecrit deja, pour que les
  // reperes lui ressemblent.
  const styleSample = [
    cv && cv.summary,
    ...((cv && cv.experience) || []).flatMap(e => (e.bullets || []).slice(0, 2)),
  ].filter(Boolean).join(" ").slice(0, 700);

  const askFor = useCallback(async (question) => {
    const q = String(question || "").trim();
    if (q.length < 6 || q === lastSentRef.current) return;
    lastSentRef.current = q;

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setThinking(true);
    setCues("");

    const system =
      "You help a candidate answer live during a job interview.\n"
      + "Reply with EXACTLY three short cues, one per line, each starting with '- '.\n"
      + "A cue is at most 12 words. Never write a full sentence to read aloud:\n"
      + "the candidate speaks in their own words, they only glance at your cues.\n"
      + "Anchor every cue in the candidate's real experience below. Invent nothing.\n"
      + "Write in the same register and vocabulary as the writing sample: if the\n"
      + "candidate would not say a word naturally, do not use it.\n"
      + "No preamble, no closing line, no markdown. Three lines, nothing else.\n\n"
      + "CANDIDATE EXPERIENCE:\n" + (styleSample || "(not provided)")
      + (offer ? "\n\nROLE THEY ARE INTERVIEWING FOR:\n" + String(offer).slice(0, 1500) : "");

    try {
      const res = await fetch("/api/claude/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          system,
          messages: [{ role: "user", content: "Interviewer just asked: " + q }],
        }),
      });
      if (!res.ok || !res.body) throw new Error("stream indisponible");

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setCues(acc);          // affichage au fil de l'eau
        setThinking(false);
      }
    } catch (err) {
      if (err && err.name !== "AbortError") {
        setCues("- " + ((err && err.message) || "reponse indisponible"));
      }
    } finally {
      setThinking(false);
    }
  }, [styleSample, offer]);

  // --- ecoute ---------------------------------------------------------------
  const stopListening = useCallback(() => {
    setListening(false);
    if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null; }
    if (recRef.current) { try { recRef.current.stop(); } catch { /* deja arrete */ } }
  }, []);

  const startListening = useCallback(() => {
    const Ctor = typeof window !== "undefined"
      && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!Ctor) { setSupport("no"); return; }
    setSupport("yes");

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = locale === "en" ? "en-US" : "en-US"; // l'entretien se tient en anglais

    rec.onresult = (event) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        text += event.results[i][0].transcript;
      }
      const clean = text.trim();
      setHeard(clean);
      // On n'attend pas un long silence : des que ca s'arrete brievement, on
      // considere la question posee et on lance la reponse.
      if (silenceRef.current) clearTimeout(silenceRef.current);
      silenceRef.current = setTimeout(() => { askFor(clean); }, SILENCE_MS);
    };
    rec.onerror = () => { setListening(false); };
    rec.onend = () => { setListening(false); };

    try { rec.start(); recRef.current = rec; setListening(true); }
    catch { setSupport("no"); }
  }, [askFor, locale]);

  useEffect(() => {
    if (!open) stopListening();
    return () => stopListening();
  }, [open, stopListening]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const lines = cues.split("\n").map(l => l.replace(/^[-•]\s*/, "").trim()).filter(Boolean);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, zIndex: 6500,
        background: "rgba(8,8,10,.93)",
        display: "flex", flexDirection: "column",
        padding: "max(18px, env(safe-area-inset-top)) 18px 18px",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#fff", fontSize: 17, fontWeight: 600 }}>{T.title}</div>
          <div style={{ color: "rgba(255,255,255,.55)", fontSize: 12.5 }}>{T.sub}</div>
        </div>
        <button
          onClick={onClose}
          aria-label={locale === "en" ? "Close" : "Fermer"}
          style={{
            width: 44, height: 44, borderRadius: "50%", border: "none",
            background: "rgba(255,255,255,.12)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Les reperes. C'est la seule chose qu'on regarde en parlant, donc
          c'est la seule chose ecrite en grand. */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: "auto",
        display: "flex", flexDirection: "column", justifyContent: "center", gap: 14,
      }}>
        {lines.length === 0 ? (
          <div style={{
            color: "rgba(255,255,255,.35)", fontSize: 17, textAlign: "center",
          }}>{thinking ? T.thinking : T.idle}</div>
        ) : lines.map((l, i) => (
          <div key={i} style={{
            display: "flex", gap: 14, alignItems: "flex-start",
            padding: "16px 18px", borderRadius: 14,
            background: "rgba(255,255,255,.07)",
          }}>
            <span style={{
              color: "#7c6bff", fontSize: 15, fontWeight: 700, flexShrink: 0,
              fontVariantNumeric: "tabular-nums",
            }}>{i + 1}</span>
            <span style={{ color: "#fff", fontSize: 21, lineHeight: 1.35, fontWeight: 500 }}>{l}</span>
          </div>
        ))}
      </div>

      {heard && (
        <div style={{
          margin: "14px 0 0", padding: "9px 12px", borderRadius: 10,
          background: "rgba(255,255,255,.05)",
          color: "rgba(255,255,255,.5)", fontSize: 12.5, lineHeight: 1.4,
          maxHeight: 58, overflow: "hidden",
        }}>
          <span style={{ opacity: .6 }}>{T.heard}: </span>{heard.slice(-160)}
        </div>
      )}

      {support === "no" && (
        <p style={{ color: "#ffb4a2", fontSize: 13, margin: "12px 0 0" }}>{T.noSupport}</p>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && manual.trim()) { askFor(manual); setManual(""); } }}
          placeholder={T.manual}
          style={{
            flex: 1, minHeight: 52, padding: "0 14px", borderRadius: 12,
            border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.06)",
            color: "#fff", fontSize: 15, fontFamily: "inherit", outline: "none",
          }}
        />
        <button
          onClick={() => (listening ? stopListening() : startListening())}
          style={{
            minWidth: 128, minHeight: 52, borderRadius: 12, border: "none",
            background: listening
              ? "rgba(255,255,255,.16)"
              : "linear-gradient(135deg,#5b3df5,#b91c8c)",
            color: "#fff", fontSize: 14.5, fontWeight: 600,
            fontFamily: "inherit", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {listening && (
            <span style={{
              width: 9, height: 9, borderRadius: "50%", background: "#ff5f5f",
              animation: "liveDot 1.1s ease-in-out infinite",
            }} />
          )}
          {listening ? T.stop : T.start}
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes liveDot { 0%,100% { opacity:1 } 50% { opacity:.25 } }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important } }
      ` }} />
    </div>
  );
}
