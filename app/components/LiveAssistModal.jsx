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
import { serializeCvForContext } from "../../lib/cvSerializer.js";
import FileDrop, { joindreAuTexte } from "./FileDrop";
import { nettoyerLAnnonce } from "../../lib/pastedPosting";

const SILENCE_MS = 900;

export default function LiveAssistModal({
  open, onClose, cv, offer, locale = "en", applications = [], onChangeCv,
}) {
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [cues, setCues] = useState("");
  const [thinking, setThinking] = useState(false);
  const [support, setSupport] = useState("unknown");
  // POURQUOI L'ERREUR EST UN ETAT ET NON UN SILENCE
  //
  // onerror se contentait de couper l'ecoute. Quand le navigateur refuse le
  // micro, ou que son service de transcription est injoignable, il ne se
  // passait donc RIEN : le bouton revenait a "Commencer a ecouter" et
  // l'assistant paraissait casse sans raison. C'est ce qu'on voit sur
  // ordinateur, ou la permission se demande une fois par site et ou le
  // service passe par le reseau. Le motif est maintenant dit.
  const [micErreur, setMicErreur] = useState("");
  const [manual, setManual] = useState("");
  // Tant que le poste n'est pas confirme, on n'ecoute pas. Se tromper de
  // poste en direct est pire que de perdre trois secondes a le choisir.
  const [confirmed, setConfirmed] = useState(false);
  const [chosen, setChosen] = useState(null);
  // L'annonce collee ici meme, et l'intitule tape a la main. Voir plus bas
  // pourquoi cet ecran doit les accepter au lieu de renvoyer ailleurs.
  const [colle, setColle] = useState("");
  const [posteTape, setPosteTape] = useState("");

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
    // Chaque motif dit quoi faire, pas seulement ce qui a rate.
    micRefuse: "The microphone is blocked for this site. Allow it in the address bar, then start listening again.",
    micAbsent: "No microphone found. Plug one in, or type the question below.",
    micReseau: "The browser could not reach its transcription service. Type the question below, it works the same.",
    micRien: "Nothing was heard. Start listening again, or type the question.",
    micAutre: "Listening stopped. Start again, or type the question below.",
    micRepris: "Mic off while you answer. Tap to catch the next question.",
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
    micRefuse: "Le micro est bloque pour ce site. Autorise-le dans la barre d'adresse, puis relance l'ecoute.",
    micAbsent: "Aucun micro trouve. Branche-en un, ou tape la question ci-dessous.",
    micReseau: "Le navigateur n'a pas pu joindre son service de transcription. Tape la question ci-dessous, ca marche pareil.",
    micRien: "Rien n'a ete entendu. Relance l'ecoute, ou tape la question.",
    micAutre: "L'ecoute s'est arretee. Relance-la, ou tape la question ci-dessous.",
    micRepris: "Micro coupe pendant que tu reponds. Touche pour attraper la question suivante.",
  };

  // Le CV ENTIER, pas un extrait. Un recruteur peut demander n'importe quel
  // poste de la liste, y compris le plus ancien : un resume tronque produirait
  // trois reperes vides sur la seule question ou ils comptaient.
  const fullCv = serializeCvForContext(cv) || "";

  // Echantillon de style, distinct du contenu : il sert au registre et au
  // vocabulaire, pas aux faits.
  const styleSample = [
    cv && cv.summary,
    ...((cv && cv.experience) || []).flatMap(e => (e.bullets || []).slice(0, 2)),
  ].filter(Boolean).join(" ").slice(0, 700);

  // Candidatures qui portent une annonce : ce sont les seules pour lesquelles
  // on peut preparer quoi que ce soit.
  const withOffer = (applications || []).filter(a => a && a.offer && a.offer.trim());

  // Le poste retenu : celui qu'on vient de choisir, sinon celui passe par
  // l'ecran precedent.
  const activeOffer = chosen ? chosen.offer : (offer || "");
  const activeLabel = chosen
    // Une annonce collee sans intitule n'a ni poste ni entreprise a afficher.
    // Laisser le libelle vide donnerait un bandeau muet, comme si rien
    // n'avait ete choisi alors que l'annonce est bien prise en compte.
    ? ([chosen.role, chosen.company].filter(Boolean).join(" - ")
       || (chosen.offer
            ? (locale === "en" ? "The ad you pasted" : "L'annonce que tu as collee")
            : ""))
    : (offer ? (locale === "en" ? "The role from the previous screen" : "Le poste de l'ecran precedent") : "");

  const askFor = useCallback(async (question) => {
    const q = String(question || "").trim();
    if (q.length < 6 || q === lastSentRef.current) return;
    lastSentRef.current = q;

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setThinking(true);
    setCues("");

    // Le type de question decide de ce qu'on a le droit de fabriquer.
    //
    // Une mise en situation ("que feriez-vous si...") attend une construction :
    // il n'y a rien a se rappeler, inventer EST la reponse correcte, et une
    // regle "n'invente rien" rendrait l'assistant inutile sur la moitie des
    // entretiens.
    //
    // Une question de comportement ("parlez-moi d'une fois ou...") demande du
    // vecu. On construit quand meme si rien ne colle, mais en restant dans le
    // monde du candidat : ses metiers, ses tailles d'equipe, ses ordres de
    // grandeur. Un exemple qui contredit le CV se retourne contre lui a la
    // question suivante - c'est une contrainte d'efficacite, pas de principe.
    const system =
      "You help a candidate answer live during a job interview.\n"
      + "Reply with EXACTLY three short cues, one per line, each starting with '- '.\n"
      + "A cue is at most 12 words. Never write a full sentence to read aloud:\n"
      + "the candidate speaks in their own words, they only glance at your cues.\n\n"
      + "HOW TO HANDLE THE QUESTION TYPE:\n"
      + "- Hypothetical or scenario question ('what would you do if', 'how would you\n"
      + "  handle', a roleplay): construct a concrete answer. There is nothing to\n"
      + "  recall, so build one. Be specific: a first move, a trade-off, an outcome.\n"
      + "  Generic advice is worthless here.\n"
      + "- Behavioural question ('tell me about a time'): use the real experience\n"
      + "  below when something fits. When nothing fits, construct a plausible\n"
      + "  example, but keep it inside the candidate's world: same industry, same\n"
      + "  seniority, same order of magnitude for team sizes, budgets and results.\n"
      + "  An example that contradicts their CV will collapse under one follow-up\n"
      + "  question, so never invent an employer, a title or a date.\n"
      + "- Factual question about their background: stick to the CV exactly.\n\n"
      + "Write in the same register and vocabulary as the writing sample: if the\n"
      + "candidate would not say a word naturally, do not use it.\n"
      + "No preamble, no closing line, no markdown. Three lines, nothing else.\n\n"
      + "FULL CV (facts come from here):\n" + (fullCv || "(not provided)")
      + "\n\nWRITING SAMPLE (register and vocabulary only):\n" + (styleSample || "(none)")
      + (activeOffer
        ? "\n\nROLE THEY ARE INTERVIEWING FOR:\n" + String(activeOffer).slice(0, 2500)
        : "\n\nThe role is unknown: keep cues general and do not guess the company.");

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
  }, [fullCv, styleSample, activeOffer]);

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
    setMicErreur("");

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
      silenceRef.current = setTimeout(() => {
        askFor(clean);
        // ON COUPE LE MICRO DES QU'UNE QUESTION EST PARTIE
        //
        // L'ecoute etait continue, y compris pendant que les reperes
        // s'affichaient. Or a ce moment precis la personne LIT ces reperes a
        // voix haute : c'est tout l'objet de l'ecran. Le micro entendait donc
        // sa propre reponse, la prenait pour une nouvelle question, et
        // remplacait a l'ecran ce qu'elle etait en train de dire.
        //
        // C'est une boucle : plus l'assistant sert, plus il se casse. Aucun
        // reglage de duree de silence ne la corrige, parce que la voix qui
        // parle est justement celle qu'on attend.
        //
        // Le micro s'arrete donc a chaque question. On le relance d'un geste
        // pour la suivante, ce qui est aussi ce qu'on veut dans un entretien :
        // personne ne souhaite un micro ouvert en permanence.
        try { rec.stop(); } catch (err) { /* deja arrete */ }
        setListening(false);
      }, SILENCE_MS);
    };
    rec.onerror = (e) => {
      setListening(false);
      setMicErreur((e && e.error) || "unknown");
    };
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

  // --- confirmation du poste ----------------------------------------------
  // Demandee a chaque ouverture. L'assistant qui repond sur le mauvais poste
  // est pire qu'un assistant absent.
  if (!confirmed) {
    const pick = (app) => { setChosen(app); setConfirmed(true); };
    const cvName = (cv && (cv.name || cv.fullName)) || "";
    const cvTitle = (cv && (cv.title || cv.headline)) || "";
    const nExp = ((cv && cv.experience) || []).filter(e => e && (e.title || e.company)).length;

    return (
      <div role="dialog" aria-modal="true" style={{
        position: "fixed", inset: 0, zIndex: 6500,
        background: "rgba(8,8,10,.97)", overflowY: "auto",
        // LE CV NE DOIT PAS SE LIRE A TRAVERS CET ECRAN
        //
        // Le fond etait a 95% : les 5% restants laissaient passer une page
        // blanche, et le texte sombre du CV se lisait en filigrane par-dessus
        // les cartes. Sur la capture d'un utilisateur, le nom et les
        // experiences traversaient l'ecran et le rendaient illisible.
        //
        // Ce n'est pas un probleme d'empilement : la mesure montre le dialogue
        // a z-index 6500 sans ancetre limitant, bien au-dessus du CV a 1. C'est
        // la transparence, et rien d'autre.
        //
        // Le flou est la vraie garantie : meme si quelqu'un rebaisse un jour
        // l'opacite, un flou de 18px ne laisse plus aucun mot lisible. Cet
        // ecran sert PENDANT un entretien - on n'y dechiffre pas, on y lit.
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        padding: "max(22px, env(safe-area-inset-top)) 20px 24px",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}>
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 22 }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#fff", fontSize: 21, fontWeight: 600, letterSpacing: "-.02em" }}>
                {locale === "en" ? "Which interview is this?" : "C'est pour quel entretien ?"}
              </div>
              <div style={{ color: "rgba(255,255,255,.55)", fontSize: 13.5, marginTop: 4, lineHeight: 1.45 }}>
                {locale === "en"
                  ? "So the cues match the role, not a different one."
                  : "Pour que les reperes collent a ce poste-la, pas a un autre."}
              </div>
            </div>
            <button onClick={onClose} aria-label={locale === "en" ? "Close" : "Fermer"} style={{
              width: 44, height: 44, borderRadius: "50%", border: "none",
              background: "rgba(255,255,255,.12)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff"
                strokeWidth="2.2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Le CV qui sera utilise, verifiable d'un coup d'oeil. */}
          <div style={{
            padding: "13px 15px", borderRadius: 12, marginBottom: 18,
            background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)",
          }}>
            {/* CHANGER DE CV DEPUIS ICI
                La carte annoncait quel CV serait utilise sans donner aucun
                moyen d'en prendre un autre. Quelqu'un qui garde une version
                par metier voyait le mauvais nom juste avant son entretien et
                n'avait que la croix pour sortir. */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, color: "rgba(255,255,255,.45)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>
                {locale === "en" ? "CV used" : "CV utilise"}
              </div>
              {onChangeCv && (
                <button onClick={onChangeCv} style={{
                  minHeight: 44, padding: "0 12px", borderRadius: 999,
                  border: "1px solid rgba(255,255,255,.22)", cursor: "pointer",
                  background: "transparent", color: "rgba(255,255,255,.85)",
                  fontSize: 12.5, fontWeight: 600, fontFamily: "inherit",
                }}>
                  {locale === "en" ? "Change" : "Changer"}
                </button>
              )}
            </div>
            <div style={{ color: "#fff", fontSize: 15, fontWeight: 600, marginTop: 4 }}>
              {cvName || (locale === "en" ? "Your CV" : "Ton CV")}
            </div>
            <div style={{ color: "rgba(255,255,255,.55)", fontSize: 12.5, marginTop: 2 }}>
              {[cvTitle, nExp
                ? `${nExp} ${locale === "en" ? "roles" : "experiences"}`
                : null].filter(Boolean).join(" · ")}
            </div>
          </div>

          {withOffer.length > 0 && (
            <>
              <div style={{ color: "rgba(255,255,255,.45)", fontSize: 11, letterSpacing: ".08em",
                textTransform: "uppercase", marginBottom: 8 }}>
                {locale === "en" ? "Your applications" : "Tes candidatures"}
              </div>
              {withOffer.map((a) => (
                <button key={a.id} onClick={() => pick(a)} style={{
                  width: "100%", textAlign: "left", marginBottom: 8,
                  padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                  background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)",
                  fontFamily: "inherit",
                }}>
                  <div style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>{a.role || "?"}</div>
                  <div style={{ color: "rgba(255,255,255,.55)", fontSize: 13, marginTop: 2 }}>
                    {a.company || "?"}
                  </div>
                </button>
              ))}
            </>
          )}

          {offer && (
            <button onClick={() => pick(null)} style={{
              width: "100%", minHeight: 52, marginTop: withOffer.length ? 6 : 0,
              borderRadius: 12, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg,#5b3df5,#b91c8c)",
              color: "#fff", fontSize: 15, fontWeight: 600, fontFamily: "inherit",
            }}>
              {locale === "en" ? "Use the role I was working on" : "Utiliser le poste en cours"}
            </button>
          )}

          {/* L'ANNONCE SE COLLE ICI, PAS AILLEURS
              Cet ecran nommait les trois choses qui manquent - le CV, le
              poste, l'annonce - et n'en laissait corriger aucune. Il disait
              "colle-en une dans le suivi", c'est-a-dire : ferme cet ecran, va
              ailleurs, reviens. Deux minutes avant un entretien, personne ne
              fait ca : on clique "continuer sans poste precis" et l'assistant
              repond a cote pendant tout l'appel.
              Le champ est donc ici, et il est propose meme quand des
              candidatures existent : celle d'aujourd'hui n'est pas forcement
              dans le suivi. */}
          <div style={{
            marginTop: withOffer.length || offer ? 14 : 0,
            padding: "14px 16px", borderRadius: 12,
            background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)",
          }}>
            <div style={{
              color: "rgba(255,255,255,.45)", fontSize: 11, letterSpacing: ".08em",
              textTransform: "uppercase", marginBottom: 8,
            }}>
              {withOffer.length || offer
                ? (locale === "en" ? "Or paste this interview's ad" : "Ou colle l'annonce de cet entretien")
                : (locale === "en" ? "Paste this interview's ad" : "Colle l'annonce de cet entretien")}
            </div>
            <textarea
              value={colle}
              onChange={(e) => setColle(e.target.value)}
              onPaste={(e) => {
                const brut = e.clipboardData && e.clipboardData.getData("text/plain");
                if (!brut) return;
                const propre = nettoyerLAnnonce(brut);
                if (propre === brut) return;
                e.preventDefault();
                const c = e.target;
                const d = c.selectionStart == null ? c.value.length : c.selectionStart;
                const f = c.selectionEnd == null ? c.value.length : c.selectionEnd;
                setColle(c.value.slice(0, d) + propre + c.value.slice(f));
              }}
              placeholder={locale === "en"
                ? "Paste the job ad here. The cues will match this role."
                : "Colle l'annonce ici. Les reperes colleront a ce poste."}
              rows={4}
              style={{
                width: "100%", boxSizing: "border-box", resize: "vertical",
                padding: "10px 12px", borderRadius: 10,
                background: "rgba(0,0,0,.35)", color: "#fff",
                border: "1px solid rgba(255,255,255,.15)",
                fontSize: 13.5, lineHeight: 1.45, fontFamily: "inherit",
              }}
            />
            {/* DEUX MINUTES AVANT L'APPEL, PERSONNE NE COLLE UNE ANNONCE
                Elle est ouverte dans un onglet, enregistree en PDF, ou
                photographiee. Surface sombre : les encres claires viennent
                d'ici, le composant ne devine pas son fond. */}
            <FileDrop locale={locale} quoi="annonce" testId="direct-offre"
              style={{ marginTop: 8 }}
              couleurs={{
                encre: "#ffd9cc", filet: "rgba(255,255,255,.25)",
                papier: "rgba(0,0,0,.35)", gris: "rgba(255,255,255,.55)",
              }}
              onTexte={(texte)=>setColle((avant)=>joindreAuTexte(avant, nettoyerLAnnonce(texte)))}/>
            <input
              value={posteTape}
              onChange={(e) => setPosteTape(e.target.value)}
              placeholder={locale === "en"
                ? "Job title, if you do not have the ad"
                : "Intitule du poste, si tu n'as pas l'annonce"}
              style={{
                width: "100%", boxSizing: "border-box", marginTop: 8,
                minHeight: 44, padding: "10px 12px", borderRadius: 10,
                background: "rgba(0,0,0,.35)", color: "#fff",
                border: "1px solid rgba(255,255,255,.15)",
                fontSize: 13.5, fontFamily: "inherit",
              }}
            />
            <button
              disabled={!colle.trim() && !posteTape.trim()}
              onClick={() => pick({
                role: posteTape.trim() || null,
                company: null,
                offer: colle.trim(),
              })}
              style={{
                width: "100%", minHeight: 46, marginTop: 10,
                borderRadius: 10, border: "none",
                cursor: (colle.trim() || posteTape.trim()) ? "pointer" : "not-allowed",
                background: (colle.trim() || posteTape.trim())
                  ? "linear-gradient(135deg,#5b3df5,#b91c8c)"
                  : "rgba(255,255,255,.08)",
                color: (colle.trim() || posteTape.trim()) ? "#fff" : "rgba(255,255,255,.35)",
                fontSize: 14.5, fontWeight: 600, fontFamily: "inherit",
              }}>
              {locale === "en" ? "Use this role" : "Utiliser ce poste"}
            </button>
          </div>

          <button onClick={() => pick(null)} style={{
            width: "100%", minHeight: 46, marginTop: 12, border: "none",
            background: "transparent", color: "rgba(255,255,255,.5)",
            fontSize: 13.5, fontFamily: "inherit", cursor: "pointer",
          }}>
            {locale === "en" ? "Continue without a role" : "Continuer sans poste precis"}
          </button>

          {/* Le montage audio. C'est la seule chose qui decide si l'assistant
              entend le recruteur ou seulement toi, et ca se joue avant l'appel,
              pas pendant. Deux appareils separes evitent aussi la question du
              partage de micro entre deux logiciels, qui marche sur ordinateur
              mais jamais sur telephone. */}
          <div style={{
            marginTop: 18, padding: "14px 16px", borderRadius: 12,
            background: "rgba(124,107,255,.12)", border: "1px solid rgba(124,107,255,.3)",
          }}>
            <div style={{
              color: "#b3a6ff", fontSize: 11, letterSpacing: ".08em",
              textTransform: "uppercase", marginBottom: 8, fontWeight: 600,
            }}>{locale === "en" ? "Audio setup" : "Montage audio"}</div>
            <div style={{ color: "rgba(255,255,255,.82)", fontSize: 13.5, lineHeight: 1.55 }}>
              {locale === "en" ? (
                <>
                  <strong>Best: two devices.</strong> Take the call on your computer with the
                  speakers on, and open this on your phone beside it. The phone hears both of
                  you, nothing competes for a microphone, and the cues do not cover the call.
                  <br /><br />
                  Same computer as the call also works on macOS and Windows, where two apps can
                  share one microphone. On a phone they cannot: the call app takes it.
                  <br /><br />
                  <strong>Headphones stop this working</strong> whatever the setup. No microphone
                  ever hears the interviewer. Speakers on, or type the question.
                </>
              ) : (
                <>
                  <strong>Le mieux : deux appareils.</strong> L'appel sur ton ordinateur,
                  haut-parleurs allumes, et ceci ouvert sur ton telephone a cote. Le telephone
                  vous entend tous les deux, aucun logiciel ne se dispute le micro, et les
                  reperes ne recouvrent pas l'appel.
                  <br /><br />
                  Sur le meme ordinateur que l'appel, ca marche aussi : macOS et Windows
                  laissent deux logiciels partager un micro. Sur telephone, non : l'app d'appel
                  le prend.
                  <br /><br />
                  <strong>Le casque empeche tout</strong>, quel que soit le montage. Aucun micro
                  n'entend le recruteur. Haut-parleurs, ou tape la question.
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const lines = cues.split("\n").map(l => l.replace(/^[-•]\s*/, "").trim()).filter(Boolean);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, zIndex: 6500,
        background: "rgba(8,8,10,.97)",
        // LE CV NE DOIT PAS SE LIRE A TRAVERS CET ECRAN
        //
        // Le fond etait a 95% : les 5% restants laissaient passer une page
        // blanche, et le texte sombre du CV se lisait en filigrane par-dessus
        // les cartes. Sur la capture d'un utilisateur, le nom et les
        // experiences traversaient l'ecran et le rendaient illisible.
        //
        // Ce n'est pas un probleme d'empilement : la mesure montre le dialogue
        // a z-index 6500 sans ancetre limitant, bien au-dessus du CV a 1. C'est
        // la transparence, et rien d'autre.
        //
        // Le flou est la vraie garantie : meme si quelqu'un rebaisse un jour
        // l'opacite, un flou de 18px ne laisse plus aucun mot lisible. Cet
        // ecran sert PENDANT un entretien - on n'y dechiffre pas, on y lit.
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        display: "flex", flexDirection: "column",
        padding: "max(18px, env(safe-area-inset-top)) 18px 18px",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#fff", fontSize: 17, fontWeight: 600 }}>{T.title}</div>
          <div style={{
            color: activeLabel ? "#9d8bff" : "rgba(255,255,255,.55)",
            fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{activeLabel || T.sub}</div>
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

      {!listening && !cues && (
        <div style={{
          margin: "12px 0 0", padding: "11px 13px", borderRadius: 10,
          background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
          color: "rgba(255,255,255,.6)", fontSize: 12.5, lineHeight: 1.5,
        }}>
          {locale === "en"
            ? "Uses this device's default microphone. With headphones on, it cannot hear the interviewer - keep the call on speaker, or type the question."
            : "Utilise le micro par defaut de cet appareil. Avec un casque, il n'entend pas le recruteur : garde l'appel en haut-parleur, ou tape la question."}
        </div>
      )}

      {support === "no" && (
        <p style={{ color: "#ffb4a2", fontSize: 13, margin: "12px 0 0" }}>{T.noSupport}</p>
      )}

      {/* CE QUI A EMPECHE L'ECOUTE, DIT SUR PLACE
          Sans ce bloc, un micro refuse ou un service injoignable rendait
          simplement le bouton inerte. La personne est en entretien : elle n'a
          pas le temps de chercher pourquoi, il faut lui dire ou cliquer. */}
      {micErreur && (
        <div role="status" aria-live="polite" style={{
          marginTop: 14, padding: "12px 14px", borderRadius: 12,
          background: "rgba(255,95,95,.12)",
          border: "1px solid rgba(255,95,95,.3)",
          color: "#ffd9d9", fontSize: 14, lineHeight: 1.5,
        }}>
          {micErreur === "not-allowed" || micErreur === "service-not-allowed" ? T.micRefuse
            : micErreur === "audio-capture" ? T.micAbsent
            : micErreur === "network" ? T.micReseau
            : micErreur === "no-speech" ? T.micRien
            : T.micAutre}
        </div>
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
