"use client";

/**
 * THE FRONT PAGE
 *
 * Kilian chose the reference on 7 September 2026: the "Planetary Pulse"
 * hero on motionsites, an iridescent orb video on a near-white studio,
 * black light type, a liquid-glass card that refracts the video behind
 * it, a chamfered button, a menu that slides in. This file is that page
 * with Nuvi's words, and the site below it in the same world. A first
 * version recoloured the reference into the site's cream and coral and
 * was refused: the video's own light is the palette here.
 *
 * WHAT THE PAGE MUST DO, IN ORDER (unchanged from the previous front page)
 *
 *   1. Say in one sentence what this is: a CV the robots read whole.
 *   2. SHOW it. The visitor types a line of their own CV and watches the
 *      screening software keep or drop each word, on the device, for free.
 *   3. Give the proof: what the parsers read, measured, not scored.
 *   4. Ask, once, at the bottom.
 *
 * Nothing here calls the model. The suites hold on to a few class names
 * (nuvi-scroll-in, nuvi-titre-geant, nuvi-mots, nuvi-piste-doc,
 * nuvi-temps): they carry the scroll-driven motion in globals.css and the
 * tests that prove a section is never left half-faded.
 *
 * THE VIDEO
 *
 * The page asks for /vitrine/orbe.mp4 first, Nuvi's own copy of the loop,
 * and falls back to the reference's file on its host while that copy is
 * not in the repo. Decorative: without it the studio grey shows and every
 * word still reads. The rule against runtime CDNs is about what the app
 * needs to work; this is what it wears.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import "./vitrine.css";
import { destinationDuRetour, destinationDUneAppInstallee } from "../authReturn";
import dynamic from "next/dynamic";

// The animated wordmark paints with a long keyframe cycle and does not
// hydrate cleanly (Sheet.jsx learnt the same): it loads after mount, and
// a still copy of the same mark holds its place until then, so the server
// HTML and the first paint carry the logo too.
const MarqueFixe = () => (
  <span className="vv-mark-still" aria-hidden="true"><span>Nuv</span><span className="vv-i" /></span>
);
const NuviLogo = dynamic(() => import("./NuviLogo"), { ssr: false, loading: MarqueFixe });
import ScanEssai from "./ScanEssai";
import LandingCV from "./LandingCV";
import Morph from "./Morph";
import RevelationDeSecours from "./RevelationDeSecours";

const VIDEO_LOCAL = "/vitrine/orbe.mp4";
const VIDEO_REFERENCE = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260816_125506_3a597378-ec85-4ebd-bd22-03b45508ac62.mp4";

const T = {
  en: {
    menu: "Menu", close: "Close", open: "Open the app",
    h1a: "A CV that passes", h1b: "the robots",
    sub: "Drop your CV. Nuvi rewrites it for the job and hands you a file the ATS reads whole.",
    cta: "Start with my CV",
    cardTitle: "What the parsers read", cardIndex: "//06",
    f1t: "Native text, five engines", f1: "Every template is read by poppler, MuPDF and Apache Tika before it ships. Embedded fonts, one page, in reading order.",
    f2t: "Nothing invented", f2: "Every line of the tailored CV exists in something you already wrote. A test refuses the merge otherwise.",
    links: [["Product", "#how"], ["Templates", "#templates"], ["ATS check", "#check"], ["Pricing", "#pricing"], ["Contact", "mailto:hello@thenuvi.com"]],
    touch: "Get in touch", lang: "Language",
    ticker: ["poppler", "MuPDF", "Apache Tika", "PDFBox", "pdf.js"],
    tickerWords: ["fonts embedded", "one page", "reading order kept", "nothing invented"],
    checkEyebrow: "01 The check", checkTitle: "Watch the robots read your CV.",
    checkLead: "Recruiters do not read CVs first. Their software does. Nuvi runs the same reading on your line, on your device, and shows what it keeps and what it drops. Nothing is sent anywhere.",
    kept: "What the software kept", dropped: "What it dropped", word: "word", words: "words", droppedNone: "nothing", keptNone: "nothing", keptAll: "all of it",
    essaiLead: "Put a line of your own CV through it", essaiHolder: "Hard-working team player with excellent communication skills",
    essaiReset: "Back to the example", essaiPrive: "Nothing leaves your browser. No account, no upload, nothing stored.",
    verifLien: "Run your whole CV through it, as a PDF",
    howEyebrow: "02 Three moves", howTitle: "Drop it. Aim it. Send it.",
    howLead: "The whole product in three moves, and the third one is the one the others skip.",
    steps: [["Drop your CV", "PDF, Word, a photo, a LinkedIn export. Read on your device in under a second, for free, before you decide anything."],
      ["Aim it at the job", "Paste the posting. Nuvi rewrites your CV for it from what you have already written, across every version you have. It picks. It never invents."],
      ["Pass the check, then send", "Native text, embedded fonts, one page, reading order kept. Five engines read every template whole before it ships; you download it as PDF or Word."]],
    tplEyebrow: "03 Six templates", tplTitle: "Every one of them read whole.",
    tplLead: "Two columns are where parsers lose lines. Nuvi's two-column templates leave with a written reading layer, and the one-column ones leave as pure text. Measured on every build.",
    tpls: [["Classic", "one column"], ["Timeline", "one column"], ["ATS", "one column"], ["Sidebar", "two columns"], ["Swiss", "two columns"], ["Compact", "dense"]],
    ruleEyebrow: "04 The rule", ruleTitle: "The AI invents nothing.",
    ruleLead: "Every line of a tailored CV exists in something you already wrote. A test refuses the change otherwise. Choosing from your own material is not inventing; the border holds by itself, not by vigilance.",
    morphLead: "Watch the same facts re-file themselves",
    morphNote: "Not one of these adds anything. The years are the same years, the work is the same work. Only the shape changed, and with it whether the software can put it anywhere.",
    cvLead: "05 What comes out", cvTitle: "A whole CV, aimed at one job ad, in a file you can send.",
    cvBody: "Not one sentence: every section. Paste the ad you are going for, and Nuvi writes the CV for that ad, then hands you the file.",
    cvTemps: ["Paste the ad.", "Nuvi rewrites every section for it.", "Send the file."],
    afterEyebrow: "06 After the CV", afterTitle: "The rest of the application, in the same file.",
    after: [["Cover letter", "One click from Download, written from the same CV and the same posting. Same rule: nothing invented."],
      ["A tracker that reads your inbox", "Connect Gmail and the recruiter's reply moves the application by itself. No board to fill by hand."],
      ["Interview preparation", "Questions from the posting and your CV, and a live assistant during the call, on your phone."],
      ["PDF and Word", "The PDF is real text with the fonts inside. The Word file is one column, real headings, real bullets, never a table."]],
    priceEyebrow: "07 Pricing", priceTitle: "One plan. One price. Cancel in one click.",
    priceRows: ["Your CV is read, checked and kept on your device for free, before any account.", "One plan unlocks the rewriting, the letter, the tracker and the interview prep.", "The same price for everyone. Cancel from Settings, no e-mail to write."],
    priceBig: "Free to check", priceSmall: "price announced at launch",
    footCols: [["Product", [["The check", "#check"], ["How it works", "#how"], ["Templates", "#templates"], ["Pricing", "#pricing"]]],
      ["Nuvi", [["Open the app", "/app"], ["Check a PDF", "/verifier"], ["hello@thenuvi.com", "mailto:hello@thenuvi.com"]]]],
    footNote: "Your CV stays on your device unless you sign in to sync it.",
  },
  fr: {
    menu: "Menu", close: "Fermer", open: "Ouvrir l'app",
    h1a: "Le CV qui passe", h1b: "les robots",
    sub: "Depose ton CV. Nuvi le reecrit pour le poste et te rend un fichier que l'ATS lit en entier.",
    cta: "Commencer avec mon CV",
    cardTitle: "Ce que lisent les analyseurs", cardIndex: "//06",
    f1t: "Texte natif, cinq moteurs", f1: "Chaque gabarit est lu par poppler, MuPDF et Apache Tika avant de partir. Polices incorporees, une page, dans l'ordre de lecture.",
    f2t: "Rien d'invente", f2: "Chaque ligne du CV adapte existe dans quelque chose que tu as deja ecrit. Un test refuse la fusion sinon.",
    links: [["Produit", "#how"], ["Gabarits", "#templates"], ["Verification ATS", "#check"], ["Tarif", "#pricing"], ["Contact", "mailto:hello@thenuvi.com"]],
    touch: "Nous ecrire", lang: "Langue",
    ticker: ["poppler", "MuPDF", "Apache Tika", "PDFBox", "pdf.js"],
    tickerWords: ["polices incorporees", "une page", "ordre de lecture garde", "rien d'invente"],
    checkEyebrow: "01 La verification", checkTitle: "Regarde les robots lire ton CV.",
    checkLead: "Les recruteurs ne lisent pas les CV en premier. Leur logiciel, si. Nuvi fait la meme lecture sur ta ligne, sur ton appareil, et montre ce qu'il garde et ce qu'il ecarte. Rien n'est envoye nulle part.",
    kept: "Ce que le logiciel a retenu", dropped: "Ce qu'il a ecarte", word: "mot", words: "mots", droppedNone: "rien", keptNone: "rien", keptAll: "tout",
    essaiLead: "Passe une ligne de ton CV", essaiHolder: "Serieux et motive, dote d'un excellent relationnel",
    essaiReset: "Revenir a l'exemple", essaiPrive: "Rien ne sort de ton navigateur. Pas de compte, pas d'envoi, rien d'enregistre.",
    verifLien: "Passe ton CV entier, en PDF",
    howEyebrow: "02 Trois gestes", howTitle: "Depose. Vise. Envoie.",
    howLead: "Tout le produit en trois gestes, et le troisieme est celui que les autres sautent.",
    steps: [["Depose ton CV", "PDF, Word, une photo, un export LinkedIn. Lu sur ton appareil en moins d'une seconde, gratuitement, avant de decider quoi que ce soit."],
      ["Vise le poste", "Colle l'annonce. Nuvi reecrit ton CV pour elle a partir de ce que tu as deja ecrit, dans toutes tes versions. Il choisit. Il n'invente jamais."],
      ["Passe la verification, puis envoie", "Texte natif, polices incorporees, une page, ordre de lecture garde. Cinq moteurs lisent chaque gabarit en entier avant qu'il parte ; tu le telecharges en PDF ou en Word."]],
    tplEyebrow: "03 Six gabarits", tplTitle: "Chacun lu en entier.",
    tplLead: "Deux colonnes, c'est la que les analyseurs perdent des lignes. Les gabarits a deux colonnes partent avec une couche de lecture ecrite, ceux a une colonne en texte pur. Mesure a chaque build.",
    tpls: [["Classique", "une colonne"], ["Chronologie", "une colonne"], ["ATS", "une colonne"], ["Sidebar", "deux colonnes"], ["Swiss", "deux colonnes"], ["Compact", "dense"]],
    ruleEyebrow: "04 La regle", ruleTitle: "L'IA n'invente rien.",
    ruleLead: "Chaque ligne d'un CV adapte existe dans quelque chose que tu as deja ecrit. Un test refuse le changement sinon. Choisir dans ta propre matiere n'est pas inventer ; la frontiere tient toute seule, pas par vigilance.",
    morphLead: "Regarde les memes faits se ranger autrement",
    morphNote: "Aucun n'ajoute quoi que ce soit. Les annees sont les memes annees, le travail est le meme travail. Seule la forme a change, et avec elle le fait que le logiciel sache ou la mettre.",
    cvLead: "05 Ce qui en sort", cvTitle: "Un CV entier, vise sur une annonce, dans un fichier que tu peux envoyer.",
    cvBody: "Pas une phrase : toutes les sections. Colle l'annonce que tu vises, Nuvi ecrit le CV pour elle, et te rend le fichier.",
    cvTemps: ["Colle l'annonce.", "Nuvi reecrit chaque section pour elle.", "Envoie le fichier."],
    afterEyebrow: "06 Apres le CV", afterTitle: "Le reste de la candidature, dans le meme fichier.",
    after: [["Lettre de motivation", "A un clic de Telecharger, ecrite depuis le meme CV et la meme annonce. Meme regle : rien d'invente."],
      ["Un suivi qui lit ta boite mail", "Connecte Gmail et la reponse du recruteur deplace la candidature toute seule. Pas de tableau a remplir a la main."],
      ["Preparation d'entretien", "Les questions tirees de l'annonce et de ton CV, et un assistant en direct pendant l'appel, sur ton telephone."],
      ["PDF et Word", "Le PDF est du vrai texte avec les polices dedans. Le fichier Word est en une colonne, vrais titres, vraies puces, jamais de tableau."]],
    priceEyebrow: "07 Tarif", priceTitle: "Un plan. Un prix. Resiliable en un clic.",
    priceRows: ["Ton CV est lu, verifie et garde sur ton appareil gratuitement, avant tout compte.", "Un seul plan debloque la reecriture, la lettre, le suivi et la preparation d'entretien.", "Le meme prix pour tout le monde. Resiliation depuis Reglages, pas d'e-mail a ecrire."],
    priceBig: "Verification gratuite", priceSmall: "prix annonce au lancement",
    footCols: [["Produit", [["La verification", "#check"], ["Comment ca marche", "#how"], ["Gabarits", "#templates"], ["Tarif", "#pricing"]]],
      ["Nuvi", [["Ouvrir l'app", "/app"], ["Verifier un PDF", "/verifier"], ["hello@thenuvi.com", "mailto:hello@thenuvi.com"]]]],
    footNote: "Ton CV reste sur ton appareil, sauf si tu te connectes pour le synchroniser.",
  },
};

// The same facts, filed two ways, for the Morph section. Nothing is added:
// "a decade" and "10 years" are the same span, the same work. That is the
// product's rule, and it holds for its front page too.
const PAIRES = [
  { avant: { en: "a decade of experience", fr: "une decennie d'experience" }, apres: { en: "10 years", fr: "10 ans" } },
  { avant: { en: "improved the business", fr: "a ameliore les resultats" }, apres: { en: "78% beverage GP", fr: "78% de marge boissons" } },
  { avant: { en: "hospitality professional", fr: "professionnel de la restauration" }, apres: { en: "Bar Manager", fr: "Barman responsable" } },
  { avant: { en: "led a large team", fr: "a encadre une grande equipe" }, apres: { en: "team of 12", fr: "equipe de 12" } },
];

// A title that assembles word by word as the page scrolls: each word
// carries --part, its position in the sentence, and globals.css offsets
// its animation range by it. Spaces stay text nodes between the spans so
// the title still wraps.
function Mots({ children }) {
  const mots = String(children || "").split(" ").filter(Boolean);
  if (mots.length < 2) return children;
  return (
    <span className="nuvi-mots">
      {mots.map((m, i) => (
        <React.Fragment key={i}>
          {i > 0 ? " " : null}
          <span style={{ "--part": i / (mots.length - 1) }}>{m}</span>
        </React.Fragment>
      ))}
    </span>
  );
}

const Fleche = ({ size = 16, className = "vv-icon" }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
);

// A rectangle with two opposite corners cut at 14px. The stroke keeps its
// width while the viewBox stretches.
function Chamfer({ href, children, plain }) {
  return (
    <a className={"vv-chamfer" + (plain ? " vv-chamfer--plain" : "")} href={href}>
      <span className="vv-chamfer__glass" aria-hidden="true" />
      <svg className="vv-chamfer__outline" viewBox="0 0 260 48" preserveAspectRatio="none" aria-hidden="true">
        <polygon points="14,0 260,0 260,34 246,48 0,48 0,14" fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="vv-chamfer__label">{children}</span>
      <Fleche />
    </a>
  );
}

// A skeleton of a CV page for the templates rail: bars, not words, so the
// six shapes read at a glance and no fake person is printed.
function Feuille({ lignes, deux }) {
  const barre = (w, k, cls) => <i key={k} className={cls} style={{ width: w + "%" }} />;
  if (deux) {
    return (
      <div className="vv-sheet vv-two" aria-hidden="true">
        <div className="vv-side">{[80, 60, 70].map((w, i) => barre(w, i))}<i className="vv-h2" style={{ width: "50%" }} />{[70, 50].map((w, i) => barre(w, "b" + i))}</div>
        <div><i className="vv-name" />{barre(60, "t")}<i className="vv-h2" />{lignes.map((w, i) => barre(w, i))}</div>
      </div>
    );
  }
  return (
    <div className="vv-sheet" aria-hidden="true">
      <i className="vv-name" />{barre(38, "a")}{barre(60, "b")}<i className="vv-h2" />{lignes.map((w, i) => barre(w, i))}
    </div>
  );
}

export default function Vitrine({ lang = "en", onLang }) {
  const t = T[lang] || T.en;
  const [menu, setMenu] = useState("closed"); // closed | open | closing
  // THE SOURCE IS CHOSEN AFTER MOUNT, NOT IN THE HTML
  //
  // The first version rendered the local path in the server HTML and fell
  // back to the reference on the element's error event. On a fast
  // connection the 404 fired before React had attached the handler, so
  // the fallback never happened and the page showed the studio grey with
  // no orb at all: seen live on 7 September. The element now starts with
  // no source; once mounted, one HEAD request says whether Nuvi's copy
  // exists, and only then is a source set, with every handler in place.
  const [videoSrc, setVideoSrc] = useState(null);
  const [videoLive, setVideoLive] = useState(false);
  const videoRef = useRef(null);
  const cardRef = useRef(null);
  const dupRef = useRef(null);
  const canvasRef = useRef(null);
  const openBtn = useRef(null);
  const closeBtn = useRef(null);
  const closing = useRef(null);

  // A sign-in return lands here because the provider only knows the root
  // of the domain. Relay it to the app before painting anything.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const dest = destinationDuRetour(window.location.search, window.location.hash)
      || destinationDUneAppInstallee(window.location.search);
    if (dest) window.location.replace(dest);
  }, []);

  // THE CARD IS A WINDOW ONTO A REFRACTED DUPLICATE OF THE VIDEO
  //
  // Every frame the current video frame is drawn into a canvas positioned
  // so its pixels sit exactly where the real video's pixels sit behind the
  // card; the card's radius clips it and CSS applies the SVG refraction.
  // The duplicate is sized to the viewport plus a margin on every side:
  // the filter shifts each channel by up to 65px, so a duplicate that
  // stopped at the viewport edge showed its own hard channel-split edge
  // inside a card sitting 20px from the edge on a phone. Beyond the
  // margin the source rectangle leaves the video and drawImage paints
  // nothing there, so the real video shows through unrefracted instead of
  // a band. The duplicate stays at 1x on retina: the filter's cost scales
  // with pixel count and buys nothing on a soft refraction.
  useEffect(() => {
    const video = videoRef.current, card = cardRef.current, dup = dupRef.current, canvas = canvasRef.current;
    if (!video || !card || !dup || !canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    const PAD = 120;
    let raf = 0, lastW = 0, lastH = 0, stopped = false;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = () => {
      if (stopped) return;
      raf = requestAnimationFrame(frame);
      // Out of view, nothing to refract: the loop idles at no cost.
      const rect = card.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || rect.bottom < 0) return;
      if (!video.videoWidth || !video.videoHeight) return;
      const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
      const W = vw + 2 * PAD, H = vh + 2 * PAD;
      dup.style.left = (-rect.left - PAD) + "px";
      dup.style.top = (-rect.top - PAD) + "px";
      dup.style.width = W + "px";
      dup.style.height = H + "px";
      if (W !== lastW || H !== lastH) { canvas.width = W; canvas.height = H; lastW = W; lastH = H; }
      const cover = Math.max(vw / video.videoWidth, vh / video.videoHeight);
      const sw = vw / cover, sh = vh / cover;
      const sx = (video.videoWidth - sw) / 2, sy = (video.videoHeight - sh) / 2;
      const m = PAD / cover;
      try {
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(video, sx - m, sy - m, sw + 2 * m, sh + 2 * m, 0, 0, W, H);
      } catch (e) { /* a frame may not be decodable yet; the next one will be */ }
      if (still && video.paused) { stopped = true; cancelAnimationFrame(raf); }
    };
    raf = requestAnimationFrame(frame);
    return () => { stopped = true; cancelAnimationFrame(raf); };
  }, [videoSrc]);

  // The menu opens like a drawer and closes the way it came. "closing" is
  // a real state so the reverse stagger has time to play before the layer
  // goes inert; Escape only acts while open; focus goes where the eye goes.
  const ouvrir = useCallback(() => {
    if (closing.current) { clearTimeout(closing.current); closing.current = null; }
    setMenu("open");
    document.documentElement.style.overflow = "hidden";
    setTimeout(() => closeBtn.current && closeBtn.current.focus({ preventScroll: true }), 60);
  }, []);
  const fermer = useCallback(() => {
    setMenu((m) => (m === "open" ? "closing" : m));
    document.documentElement.style.overflow = "";
    if (openBtn.current) openBtn.current.focus({ preventScroll: true });
    closing.current = setTimeout(() => { setMenu("closed"); closing.current = null; }, 600);
  }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && menu === "open") fermer(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menu, fermer]);
  useEffect(() => () => { document.documentElement.style.overflow = ""; }, []);
  useEffect(() => {
    let vivant = true;
    const ctrl = typeof AbortController === "function" ? new AbortController() : null;
    const minuterie = setTimeout(() => ctrl && ctrl.abort(), 4000);
    fetch(VIDEO_LOCAL, { method: "HEAD", signal: ctrl ? ctrl.signal : undefined })
      .then((r) => {
        const type = (r.headers.get("content-type") || "");
        if (vivant) setVideoSrc(r.ok && /video/i.test(type) ? VIDEO_LOCAL : VIDEO_REFERENCE);
      })
      .catch(() => { if (vivant) setVideoSrc(VIDEO_REFERENCE); })
      .finally(() => clearTimeout(minuterie));
    return () => { vivant = false; clearTimeout(minuterie); };
  }, []);
  useEffect(() => {
    const v = videoRef.current;
    if (v && v.readyState >= 3) setVideoLive(true);
  }, [videoSrc]);

  const choisirLangue = (l) => {
    try { localStorage.setItem("cvf_c", JSON.stringify(l)); } catch (e) { /* storage refused: the page still switches */ }
    if (onLang) onLang(l);
  };

  const scanLabels = { kept: t.kept, dropped: t.dropped, word: t.word, words: t.words, droppedNone: t.droppedNone, keptNone: t.keptNone };
  const scanTextes = { lead: t.essaiLead, placeholder: t.essaiHolder, reset: t.essaiReset, prive: t.essaiPrive };

  return (
    <div className="vv nuvi-page">
      <RevelationDeSecours />

      <video ref={videoRef} className={"vv-video" + (videoLive ? " is-live" : "")} aria-hidden="true"
        autoPlay muted loop playsInline preload="auto" src={videoSrc || undefined}
        onCanPlay={() => setVideoLive(true)}
        onError={() => { if (videoSrc && videoSrc !== VIDEO_REFERENCE) setVideoSrc(VIDEO_REFERENCE); }} />

      {/* The liquid glass: a static fractal noise field, masked to the
          card's rim by a blurred and inverted alpha, displaces the source
          three times at 65 / 56 / 47, one colour channel each, recombined
          with screen blends. The per-channel spread is the fringing. The
          values are tuned; keep them exact. */}
      <svg className="vv-glass-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="vv-liquid-glass" x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.015" numOctaves="3" result="noise" />
            <feColorMatrix in="SourceAlpha" type="matrix" result="boosted_alpha" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 100 0" />
            <feGaussianBlur in="boosted_alpha" stdDeviation="45" result="blurred_alpha" />
            <feComponentTransfer in="blurred_alpha" result="edge_mask"><feFuncA type="linear" slope="-1.3" intercept="1" /></feComponentTransfer>
            <feComposite in="noise" in2="edge_mask" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="masked_noise" />
            <feDisplacementMap in="SourceGraphic" in2="masked_noise" scale="65" xChannelSelector="R" yChannelSelector="G" result="red_displaced" />
            <feColorMatrix in="red_displaced" type="matrix" result="red" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
            <feDisplacementMap in="SourceGraphic" in2="masked_noise" scale="56" xChannelSelector="R" yChannelSelector="G" result="green_displaced" />
            <feColorMatrix in="green_displaced" type="matrix" result="green" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" />
            <feDisplacementMap in="SourceGraphic" in2="masked_noise" scale="47" xChannelSelector="R" yChannelSelector="G" result="blue_displaced" />
            <feColorMatrix in="blue_displaced" type="matrix" result="blue" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" />
            <feBlend in="red" in2="green" mode="screen" result="rg" />
            <feBlend in="rg" in2="blue" mode="screen" result="chromatic_dispersion" />
          </filter>
        </defs>
      </svg>

      <main className="vv-hero">
        {["left", "right"].map((cote) => (
          <div key={cote} className={"vv-rule vv-rule--" + cote} aria-hidden="true">
            <span className="vv-rule__seg vv-rule__seg--end" /><span className="vv-rule__plus">+</span>
            <span className="vv-rule__seg vv-rule__seg--mid" /><span className="vv-rule__plus">+</span>
            <span className="vv-rule__seg vv-rule__seg--end" />
          </div>
        ))}

        <nav className="vv-nav vv-arrive" style={{ "--pose": "0ms" }}>
          <button ref={openBtn} id="vv-menu-open" className="vv-nav__item" type="button"
            aria-expanded={menu === "open" ? "true" : "false"} aria-controls="vv-menu" onClick={ouvrir}>
            <span className="vv-burger" aria-hidden="true"><i /><i /><i /></span>
            <span className="vv-nav__label vv-nav__label--menu">{t.menu}</span>
          </button>
          <a className="vv-logo" href="/" aria-label="Nuvi"><NuviLogo size={22} inkColor="#000" /></a>
          <a className="vv-nav__item" href="/app">
            <span className="vv-nav__dot" aria-hidden="true" />
            <span className="vv-nav__label">{t.open}</span>
          </a>
        </nav>

        <div className="vv-hero-bottom">
          <div className="vv-lede">
            <h1 className="vv-lede__title vv-arrive" style={{ "--pose": "120ms" }}>{t.h1a}<br />{t.h1b}</h1>
            <p className="vv-lede__body vv-arrive" style={{ "--pose": "220ms" }}>{t.sub}</p>
            <div className="vv-arrive" style={{ "--pose": "320ms" }}><Chamfer href="/app">{t.cta}</Chamfer></div>
          </div>

          <aside ref={cardRef} className="vv-card">
            <div ref={dupRef} className="vv-dup"><canvas ref={canvasRef} /></div>
            <div className="vv-card__frost" aria-hidden="true" />
            <div className="vv-card__head">
              <h2 className="vv-card__title">{t.cardTitle}</h2>
              <span className="vv-card__index">{t.cardIndex}</span>
            </div>
            <div className="vv-card__body">
              <div><h3 className="vv-finding__title">{t.f1t}</h3><p className="vv-finding__text">{t.f1}</p></div>
              <div><h3 className="vv-finding__title">{t.f2t}</h3><p className="vv-finding__text">{t.f2}</p></div>
            </div>
            <svg className="vv-card__wave" viewBox="0 0 220 50" fill="none" aria-hidden="true">
              <path d="M0 30 C10 30 12 45 18 45 C24 45 26 10 34 10 C42 10 44 40 52 40 C60 40 62 5 70 5 C78 5 80 42 88 42 C96 42 98 15 106 15 C114 15 116 38 124 38 C132 38 134 20 142 20 C150 20 152 35 160 35 C168 35 170 22 178 22 C186 22 188 32 196 32 C204 32 210 28 220 28"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            </svg>
          </aside>
        </div>
      </main>

      <div className={"vv-menu" + (menu === "open" ? " is-open" : "") + (menu === "closing" ? " is-closing" : "")} id="vv-menu" aria-hidden={menu === "open" ? "false" : "true"}>
        <div className="vv-menu__veil" onClick={fermer} />
        <div className="vv-menu__panel" role="dialog" aria-modal="true" aria-label={t.menu}>
          <button ref={closeBtn} className="vv-menu__close" type="button" onClick={fermer} tabIndex={menu === "open" ? 0 : -1}>
            <svg className="vv-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
            <span>{t.close}</span>
          </button>
          <nav className="vv-menu__nav">
            {t.links.map(([label, href]) => (
              <a key={href} className="vv-menu__link" href={href} onClick={fermer} tabIndex={menu === "open" ? 0 : -1}>
                <span className="vv-menu__text">{label}</span>
                <Fleche className="vv-menu__arrow vv-icon" />
              </a>
            ))}
          </nav>
          <div className="vv-menu__foot">
            <span className="vv-menu__label">{t.touch}</span>
            <a className="vv-menu__mail" href="mailto:hello@thenuvi.com" tabIndex={menu === "open" ? 0 : -1}>hello@thenuvi.com</a>
            <span className="vv-menu__label" style={{ marginTop: "1.25rem" }}>{t.lang}</span>
            <div className="vv-lang">
              {[["fr", "Francais"], ["en", "English"]].map(([l, nom]) => (
                <button key={l} type="button" aria-pressed={lang === l ? "true" : "false"} onClick={() => choisirLangue(l)} tabIndex={menu === "open" ? 0 : -1}>{nom}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="vv-ticker" aria-hidden="true">
        <div className="vv-ticker__row">
          {[0, 1].map((copie) => (
            <React.Fragment key={copie}>
              {t.ticker.map((e) => <span key={copie + e}>{e} <i>100</i></span>)}
              {t.tickerWords.map((w) => <span key={copie + w}>{w}</span>)}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="vv-site">
        {/* 01 THE CHECK: the visitor's own line under the reading line.
            The only thing on the page that is not an assertion. */}
        <section className="vv-sec vv-sec--white nuvi-scroll-in" id="check">
          <div className="vv-grid2">
            <div className="vv-sticky">
              <span className="vv-eyebrow">{t.checkEyebrow}</span>
              <h2 className="vv-h nuvi-titre-geant"><Mots>{t.checkTitle}</Mots></h2>
              <p className="vv-lead vv-muted">{t.checkLead}</p>
              <a href="/verifier" className="vv-link vv-link--more">{t.verifLien}<Fleche size={14} /></a>
            </div>
            <div className="vv-frost">
              <ScanEssai lang={lang} labels={scanLabels} textes={scanTextes} />
            </div>
          </div>
        </section>

        {/* 02 THREE MOVES */}
        <section className="vv-sec nuvi-scroll-in" id="how">
          <div className="vv-grid2">
            <div className="vv-sticky">
              <span className="vv-eyebrow">{t.howEyebrow}</span>
              <h2 className="vv-h nuvi-titre-geant"><Mots>{t.howTitle}</Mots></h2>
              <p className="vv-lead vv-muted">{t.howLead}</p>
            </div>
            <div>
              {t.steps.map(([titre, corps], i) => (
                <div key={titre} className="vv-step">
                  <span className="vv-k">0{i + 1}</span>
                  <div><h3>{titre}</h3><p>{corps}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 03 SIX TEMPLATES */}
        <section className="vv-sec vv-sec--white nuvi-scroll-in" id="templates">
          <span className="vv-eyebrow">{t.tplEyebrow}</span>
          <h2 className="vv-h nuvi-titre-geant"><Mots>{t.tplTitle}</Mots></h2>
          <p className="vv-lead vv-muted">{t.tplLead}</p>
          <div className="vv-rail" style={{ marginTop: "3rem" }}>
            {t.tpls.map(([nom, forme], i) => (
              <figure key={nom} className="vv-tpl">
                <Feuille deux={i === 3 || i === 4}
                  lignes={i === 2 ? [92, 92, 92, 92, 92, 92] : i === 5 ? [90, 90, 90, 90, 90, 90, 90, 90] : i === 1 ? [70, 88, 60, 84, 66, 90] : [88, 72, 90, 64, 86, 78]} />
                <figcaption>{nom} <span>{forme}</span></figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* 04 THE RULE, on ink. The section declares itself dark so the
            app's inks flip inside the Morph, which paints with tokens. */}
        <section className="vv-sec vv-sec--ink nuvi-scroll-in" data-nuvi-sombre="">
          <div className="vv-grid2">
            <div className="vv-sticky">
              <span className="vv-eyebrow">{t.ruleEyebrow}</span>
              <h2 className="vv-h nuvi-titre-geant"><Mots>{t.ruleTitle}</Mots></h2>
              <p className="vv-lead vv-muted">{t.ruleLead}</p>
            </div>
            <div className="vv-frost">
              <Morph paires={PAIRES} lang={lang} labels={{ lead: t.morphLead, note: t.morphNote }} />
            </div>
          </div>
        </section>

        {/* 05 WHAT COMES OUT: the document holds while the three moves
            arrive. The track and its sticky block keep the classes that
            globals.css and the suite know. No nuvi-scroll-in here: a track
            two screens tall would end its fade far too late. */}
        <section className="vv-sec nuvi-piste-doc">
          <div className="nuvi-piste-colle">
            <div className="nuvi-duo nuvi-duo-doc" style={{ alignItems: "center" }}>
              <div>
                <span className="vv-eyebrow">{t.cvLead}</span>
                <h2 className="vv-h nuvi-titre-geant" style={{ marginBottom: 16 }}><Mots>{t.cvTitle}</Mots></h2>
                <p className="vv-lead vv-muted" style={{ marginTop: 0 }}>{t.cvBody}</p>
                <ol className="nuvi-temps-liste">
                  {t.cvTemps.map((mot, i) => <li key={mot} className="nuvi-temps" style={{ "--part": i }}>{mot}</li>)}
                </ol>
              </div>
              <div style={{ minWidth: 0 }}><LandingCV lang={lang} /></div>
            </div>
          </div>
        </section>

        {/* 06 AFTER THE CV */}
        <section className="vv-sec vv-sec--white nuvi-scroll-in">
          <span className="vv-eyebrow">{t.afterEyebrow}</span>
          <h2 className="vv-h nuvi-titre-geant"><Mots>{t.afterTitle}</Mots></h2>
          <div className="vv-four">
            {t.after.map(([titre, corps], i) => (
              <div key={titre} className="vv-frost"><span className="vv-idx">//0{i + 1}</span><h3>{titre}</h3><p>{corps}</p></div>
            ))}
          </div>
        </section>

        {/* 07 PRICING */}
        <section className="vv-sec nuvi-scroll-in" id="pricing">
          <div className="vv-price">
            <div>
              <span className="vv-eyebrow">{t.priceEyebrow}</span>
              <h2 className="vv-h nuvi-titre-geant"><Mots>{t.priceTitle}</Mots></h2>
              <ul>{t.priceRows.map((r) => <li key={r}>{r}</li>)}</ul>
            </div>
            <div className="vv-frost" style={{ padding: "2.5rem" }}>
              <p className="vv-big">{t.priceBig}<small>{t.priceSmall}</small></p>
              <div style={{ marginTop: "2rem" }}><Chamfer href="/app" plain>{t.cta}</Chamfer></div>
            </div>
          </div>
        </section>
      </div>

      <footer className="vv-foot">
        <a className="vv-foot__mark" href="/" aria-label="Nuvi"><span>Nuv</span><span className="vv-i" aria-hidden="true" /></a>
        <div className="vv-cols">
          {t.footCols.map(([titre, liens]) => (
            <div key={titre} className="vv-col">
              <span className="vv-lbl">{titre}</span>
              {liens.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
            </div>
          ))}
          <div className="vv-col">
            <span className="vv-lbl">{t.lang}</span>
            <button type="button" onClick={() => choisirLangue("fr")}>Francais</button>
            <button type="button" onClick={() => choisirLangue("en")}>English</button>
          </div>
        </div>
        <p className="vv-foot__bottom">{t.footNote}</p>
      </footer>
    </div>
  );
}
