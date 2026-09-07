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
 * THE ORB LEFT ON 7 SEPTEMBER
 *
 * The reference's video, an iridescent orb on a grey studio, filled the
 * screen and said nothing about the product. Kilian: too big, no use,
 * and the grey stayed whatever the filter. The hero keeps the
 * reference's structure (copy top left, a glass card bottom right, the
 * chamfered button, the rules with their plus marks) on the page's own
 * white, and the card now holds the only thing on this page that is not
 * an assertion: the visitor's line of CV under the reading line, kept or
 * dropped word by word, on the device.
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

const T = {
  en: {
    menu: "Menu", close: "Close", open: "Open the app",
    h1a: "A CV that passes", h1b: "the robots",
    sub: "Drop your CV. Nuvi rewrites it for the job and hands you a file the ATS reads whole.",
    cta: "Start with my CV",
    cardTitle: "Watch the software read", cardIndex: "//01",
    readEyebrow: "The classic template, read whole", readNote: "Five engines read every template on every build: poppler, MuPDF, Apache Tika, PDFBox and pdf.js. The number is what they read back, in percent.",
    f1t: "Native text, five engines", f1: "Every template is read by poppler, MuPDF and Apache Tika before it ships. Embedded fonts, one page, in reading order.",
    f2t: "Nothing invented", f2: "Every line of the tailored CV exists in something you already wrote. A test refuses the merge otherwise.",
    links: [["Product", "#how"], ["Templates", "#templates"], ["ATS check", "#check"], ["Pricing", "#pricing"], ["Contact", "mailto:hello@thenuvi.com"]],
    touch: "Get in touch", lang: "Language",
    ticker: ["poppler", "MuPDF", "Apache Tika", "PDFBox", "pdf.js"],
    tickerWords: ["fonts embedded", "one page", "reading order kept", "nothing invented"],
    checkEyebrow: "01 The check", checkTitle: "What the robots read back.",
    checkLead: "Recruiters do not read CVs first. Their software does. The line you typed above went through the same reading, on your device. The file Nuvi prints goes through five real engines before it ships.",
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
    cardTitle: "Regarde le logiciel lire", cardIndex: "//01",
    readEyebrow: "Le gabarit classique, lu en entier", readNote: "Cinq moteurs lisent chaque gabarit a chaque build : poppler, MuPDF, Apache Tika, PDFBox et pdf.js. Le chiffre est ce qu'ils relisent, en pour cent.",
    f1t: "Texte natif, cinq moteurs", f1: "Chaque gabarit est lu par poppler, MuPDF et Apache Tika avant de partir. Polices incorporees, une page, dans l'ordre de lecture.",
    f2t: "Rien d'invente", f2: "Chaque ligne du CV adapte existe dans quelque chose que tu as deja ecrit. Un test refuse la fusion sinon.",
    links: [["Produit", "#how"], ["Gabarits", "#templates"], ["Verification ATS", "#check"], ["Tarif", "#pricing"], ["Contact", "mailto:hello@thenuvi.com"]],
    touch: "Nous ecrire", lang: "Langue",
    ticker: ["poppler", "MuPDF", "Apache Tika", "PDFBox", "pdf.js"],
    tickerWords: ["polices incorporees", "une page", "ordre de lecture garde", "rien d'invente"],
    checkEyebrow: "01 La verification", checkTitle: "Ce que les robots relisent.",
    checkLead: "Les recruteurs ne lisent pas les CV en premier. Leur logiciel, si. La ligne que tu as tapee plus haut a subi la meme lecture, sur ton appareil. Le fichier que Nuvi imprime passe par cinq vrais moteurs avant de partir.",
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
  // THE INTRO PLAYS ONCE PER SESSION
  //
  // Rendered by the server too, so the first paint is the wordmark and
  // not a flash of the hero. Once mounted: already seen this session, or
  // less motion asked for, and it goes at once; otherwise it lifts after
  // its own animation and the hero arrives underneath.
  const [intro, setIntro] = useState(true);
  const openBtn = useRef(null);
  const closeBtn = useRef(null);
  const closing = useRef(null);

  useEffect(() => {
    let vu = false;
    try { vu = window.sessionStorage.getItem("nuvi_intro") === "1"; } catch (e) { /* storage refused: play it */ }
    const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (vu || calme) { setIntro(false); return undefined; }
    const t = setTimeout(() => {
      setIntro(false);
      try { window.sessionStorage.setItem("nuvi_intro", "1"); } catch (e) { /* nothing to remember with */ }
    }, 2600);
    return () => clearTimeout(t);
  }, []);

  // A sign-in return lands here because the provider only knows the root
  // of the domain. Relay it to the app before painting anything.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const dest = destinationDuRetour(window.location.search, window.location.hash)
      || destinationDUneAppInstallee(window.location.search);
    if (dest) window.location.replace(dest);
  }, []);

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
  const choisirLangue = (l) => {
    try { localStorage.setItem("cvf_c", JSON.stringify(l)); } catch (e) { /* storage refused: the page still switches */ }
    if (onLang) onLang(l);
  };

  const scanLabels = { kept: t.kept, dropped: t.dropped, word: t.word, words: t.words, droppedNone: t.droppedNone, keptNone: t.keptNone };
  const scanTextes = { lead: t.essaiLead, placeholder: t.essaiHolder, reset: t.essaiReset, prive: t.essaiPrive };

  return (
    <div className="vv nuvi-page" style={{ "--intro": intro ? "1900ms" : "0ms" }}>
      <RevelationDeSecours />
      {intro ? (
        <div className="vv-intro" aria-hidden="true">
          <span className="vv-intro__mark"><span>Nuv</span><span className="vv-i" /></span>
          <span className="vv-intro__line">{t.h1a} {t.h1b}</span>
        </div>
      ) : null}

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

          <aside className="vv-card vv-card--reading">
            <div className="vv-card__frost" aria-hidden="true" />
            <div className="vv-card__head">
              <h2 className="vv-card__title">{t.cardTitle}</h2>
              <span className="vv-card__index">{t.cardIndex}</span>
            </div>
            <div className="vv-card__body">
              <ScanEssai lang={lang} labels={scanLabels} textes={scanTextes} />
            </div>
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
              <span className="vv-eyebrow">{t.readEyebrow}</span>
              <div className="vv-engines">
                {t.ticker.map((e) => (
                  <div key={e} className="vv-engines__r"><span>{e}</span><div className="vv-engines__bar"><i /></div><span className="vv-engines__n">100</span></div>
                ))}
              </div>
              <p className="vv-note">{t.readNote}</p>            </div>
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
