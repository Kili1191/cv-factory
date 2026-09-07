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
import ApercuGabarit from "./ApercuGabarit";
import { LAYOUTS, metaGabarit } from "../../lib/gabarits";

const T = {
  en: {
    menu: "Menu", close: "Close", open: "Open the app",
    h1a: "Your CV, read by", h1b: "a robot first",
    sub: "Before any recruiter sees your CV, a piece of software reads it and sorts it. Nuvi writes your CV so it gets through. That software is called an ATS.",
    cta: "Try it with my CV",
    cardTitle: "See what the software keeps",
    readEyebrow: "What the software looks for", readNote: "It looks for exactly this, and nothing else. What it cannot find, it throws away, and no human ever sees it.",
    cherche: [["Your name and how to reach you", "Found, or lost. Nothing in between."],
      ["Each job title and each employer", "A real job title. \u201cHospitality professional\u201d is not one."],
      ["The dates", "From when to when. \u201cFor years\u201d does not count."],
      ["What you achieved, in numbers", "\u201cTeam of 12\u201d counts. \u201cLed a large team\u201d does not."]],
    links: [["How it works", "#how"], ["Layouts", "#templates"], ["Check my CV", "#check"], ["Price", "#pricing"], ["Contact", "mailto:hello@thenuvi.com"]],
    touch: "Get in touch", lang: "Language",
    ticker: ["Read whole by the sorting software", "One page", "Nothing made up", "Free to check", "PDF and Word", "In French and English"],
    checkEyebrow: "Why you hear nothing back", checkTitle: "A robot reads your CV before anyone does.",
    checkLead: "You type your line above and watch it happen: some words stay, some are dropped. Your whole CV goes through the same thing at every company you apply to. Nuvi writes it so nothing gets thrown out.",
    kept: "What the software kept", dropped: "What it dropped", word: "word", words: "words", droppedNone: "nothing", keptNone: "nothing", keptAll: "all of it",
    essaiLead: "Type a line from your CV", essaiHolder: "Hard-working team player with excellent communication skills",
    essaiReset: "Back to the example", essaiPrive: "Nothing leaves your phone or computer. No account, nothing sent, nothing kept.",
    verifLien: "Check my whole CV, as a PDF",
    quiEyebrow: "Who it is for", quiTitle: "For everyone who applies.",
    quiLead: "Whatever the job, a robot reads your CV first. Nuvi works for every CV, from a first job to a management role. These are the jobs people apply to most, where it is needed most often.",
    howEyebrow: "How it works", howTitle: "Three steps. Ten minutes.",
    howLead: "No template to fill in. You start from the CV you already have.",
    steps: [["Drop your CV", "A PDF, a Word file, a photo of it, or your LinkedIn page. Nuvi reads it in a second, for free, before you decide anything."],
      ["Paste the job ad", "Nuvi rewrites your CV for that job, using only what you have already done. It never makes anything up."],
      ["Download and send", "One page, in PDF or Word, that the sorting software reads from the first line to the last."]],
    tplEyebrow: "Six layouts", tplTitle: "Pick the one that looks like you.",
    tplLead: "All six get through the sorting software. We check it every time we change anything.",
    ruleEyebrow: "Our rule", ruleTitle: "Nuvi never makes anything up.",
    ruleLead: "Ten years stay ten years. A team of twelve stays a team of twelve. Nuvi only changes how it is written, so the software finds it. If you cannot defend a line in an interview, it is not on your CV.",
    morphLead: "Same facts, written so the software finds them",
    morphNote: "Nothing is added here. The years are the same years, the work is the same work. Only the wording changed, and with it whether the software can file it.",
    cvLead: "What you get", cvTitle: "A whole CV, written for one job, ready to send.",
    cvBody: "Not one sentence: every part of it. Paste the ad, Nuvi rewrites the CV for that ad and hands you the file.",
    cvTemps: ["Paste the ad.", "Nuvi rewrites every part for it.", "Send the file."],
    afterEyebrow: "After the CV", afterTitle: "Nuvi stays with you until the interview.",
    after: [["Cover letter", "One click from Download, written from the same CV and the same ad. Same rule: nothing made up."],
      ["Follow your applications", "Connect your Gmail and every reply from a recruiter updates your list by itself."],
      ["Prepare the interview", "The questions they will ask, from the ad and your CV, and help during the call, on your phone."],
      ["PDF or Word", "Send the file the recruiter asks for. Both are read whole by their software."]],
    priceEyebrow: "Price", priceTitle: "One plan. One price. Cancel in one click.",
    priceRows: ["Checking your CV is free, no account needed.", "One plan gives you everything: the rewriting, the letter, the follow-up, the interview prep.", "Same price for everyone. Cancel from Settings, no e-mail to write."],
    priceBig: "Free to check", priceSmall: "price announced at launch",
    footCols: [["Nuvi", [["How it works", "#how"], ["Layouts", "#templates"], ["Check my CV", "#check"], ["Price", "#pricing"]]],
      ["Start", [["Open the app", "/app"], ["Check a PDF", "/verifier"], ["hello@thenuvi.com", "mailto:hello@thenuvi.com"]]]],
    footNote: "Your CV stays on your phone or computer unless you sign in to save it online.",
  },
  fr: {
    menu: "Menu", close: "Fermer", open: "Ouvrir l'app",
    h1a: "Ton CV, lu par", h1b: "un robot d'abord",
    sub: "Avant qu'un recruteur voie ton CV, un logiciel le lit et le trie. Nuvi ecrit ton CV pour qu'il passe. Ce logiciel s'appelle un ATS.",
    cta: "Essayer avec mon CV",
    cardTitle: "Regarde ce que le logiciel garde",
    readEyebrow: "Ce que le logiciel cherche", readNote: "Il cherche exactement ca, et rien d'autre. Ce qu'il ne trouve pas, il le jette, et aucun humain ne le voit.",
    cherche: [["Ton nom et comment te joindre", "Trouve, ou perdu. Rien entre les deux."],
      ["Chaque poste et chaque employeur", "Un vrai intitule de poste. \u00ab Professionnel de la restauration \u00bb n'en est pas un."],
      ["Les dates", "De quand a quand. \u00ab Depuis des annees \u00bb ne compte pas."],
      ["Ce que tu as accompli, en chiffres", "\u00ab Equipe de 12 \u00bb compte. \u00ab A encadre une grande equipe \u00bb non."]],
    links: [["Comment ca marche", "#how"], ["Mises en page", "#templates"], ["Verifier mon CV", "#check"], ["Prix", "#pricing"], ["Contact", "mailto:hello@thenuvi.com"]],
    touch: "Nous ecrire", lang: "Langue",
    ticker: ["Lu en entier par le logiciel de tri", "Une page", "Rien d'invente", "Verification gratuite", "PDF et Word", "En francais et en anglais"],
    checkEyebrow: "Pourquoi tu n'as pas de reponse", checkTitle: "Un robot lit ton CV avant tout le monde.",
    checkLead: "Tu tapes ta ligne au-dessus et tu le vois : des mots restent, d'autres sont ecartes. Ton CV entier subit la meme chose dans chaque entreprise ou tu postules. Nuvi l'ecrit pour que rien ne soit jete.",
    kept: "Ce que le logiciel a garde", dropped: "Ce qu'il a ecarte", word: "mot", words: "mots", droppedNone: "rien", keptNone: "rien", keptAll: "tout",
    essaiLead: "Tape une ligne de ton CV", essaiHolder: "Serieux et motive, dote d'un excellent relationnel",
    essaiReset: "Revenir a l'exemple", essaiPrive: "Rien ne sort de ton telephone ou de ton ordinateur. Pas de compte, rien d'envoye, rien de garde.",
    verifLien: "Verifier mon CV entier, en PDF",
    quiEyebrow: "Pour qui", quiTitle: "Pour tous ceux qui postulent.",
    quiLead: "Quel que soit le poste, un robot lit ton CV en premier. Nuvi marche pour tous les CV, du premier emploi au poste de direction. Voici les metiers ou l'on postule le plus, la ou il sert le plus souvent.",
    howEyebrow: "Comment ca marche", howTitle: "Trois etapes. Dix minutes.",
    howLead: "Pas de modele a remplir. Tu pars du CV que tu as deja.",
    steps: [["Depose ton CV", "Un PDF, un fichier Word, une photo, ou ta page LinkedIn. Nuvi le lit en une seconde, gratuitement, avant que tu decides quoi que ce soit."],
      ["Colle l'annonce", "Nuvi reecrit ton CV pour ce poste, avec seulement ce que tu as deja fait. Il n'invente jamais rien."],
      ["Telecharge et envoie", "Une page, en PDF ou en Word, que le logiciel de tri lit de la premiere ligne a la derniere."]],
    tplEyebrow: "Six mises en page", tplTitle: "Choisis celle qui te ressemble.",
    tplLead: "Les six passent le logiciel de tri. On le verifie a chaque fois qu'on change quelque chose.",
    ruleEyebrow: "Notre regle", ruleTitle: "Nuvi n'invente jamais rien.",
    ruleLead: "Dix ans restent dix ans. Une equipe de douze reste une equipe de douze. Nuvi ne change que la facon de l'ecrire, pour que le logiciel le trouve. Si tu ne peux pas defendre une ligne en entretien, elle n'est pas sur ton CV.",
    morphLead: "Les memes faits, ecrits pour que le logiciel les trouve",
    morphNote: "Rien n'est ajoute ici. Les annees sont les memes annees, le travail est le meme travail. Seule la formulation a change, et avec elle le fait que le logiciel sache la ranger.",
    cvLead: "Ce que tu obtiens", cvTitle: "Un CV entier, ecrit pour un poste, pret a envoyer.",
    cvBody: "Pas une phrase : toutes ses parties. Colle l'annonce, Nuvi reecrit le CV pour elle et te rend le fichier.",
    cvTemps: ["Colle l'annonce.", "Nuvi reecrit chaque partie pour elle.", "Envoie le fichier."],
    afterEyebrow: "Apres le CV", afterTitle: "Nuvi reste avec toi jusqu'a l'entretien.",
    after: [["Lettre de motivation", "A un clic de Telecharger, ecrite depuis le meme CV et la meme annonce. Meme regle : rien d'invente."],
      ["Suis tes candidatures", "Connecte ton Gmail et chaque reponse d'un recruteur met ta liste a jour toute seule."],
      ["Prepare l'entretien", "Les questions qu'on va te poser, tirees de l'annonce et de ton CV, et de l'aide pendant l'appel, sur ton telephone."],
      ["PDF ou Word", "Envoie le fichier que le recruteur demande. Les deux sont lus en entier par son logiciel."]],
    priceEyebrow: "Prix", priceTitle: "Un plan. Un prix. Resiliable en un clic.",
    priceRows: ["Verifier ton CV est gratuit, sans compte.", "Un seul plan te donne tout : la reecriture, la lettre, le suivi, la preparation d'entretien.", "Le meme prix pour tout le monde. Resiliation depuis Reglages, pas d'e-mail a ecrire."],
    priceBig: "Verification gratuite", priceSmall: "prix annonce au lancement",
    footCols: [["Nuvi", [["Comment ca marche", "#how"], ["Mises en page", "#templates"], ["Verifier mon CV", "#check"], ["Prix", "#pricing"]]],
      ["Commencer", [["Ouvrir l'app", "/app"], ["Verifier un PDF", "/verifier"], ["hello@thenuvi.com", "mailto:hello@thenuvi.com"]]]],
    footNote: "Ton CV reste sur ton telephone ou ton ordinateur, sauf si tu te connectes pour le garder en ligne.",
  },
};

// THE JOBS THIS PAGE SPEAKS TO
//
// The titles people apply for most, in the UK and in France: retail,
// warehouse, delivery, care, customer service, hospitality, admin,
// cleaning, security, and the office roles that answer ads by the dozen.
// Nuvi is for everyone who applies; these are the people who meet the
// sorting robot most often, so the ticker names them. The "for whom"
// section shares the list and says the page is for every CV.
const METIERS = {
  en: ["Sales assistant", "Warehouse operative", "Delivery driver", "Customer service advisor", "Care assistant",
       "Waiter", "Barista", "Receptionist", "Administrative assistant", "Cleaner", "Security officer", "Cashier",
       "Kitchen porter", "Chef", "Forklift driver", "Nursery assistant", "Teaching assistant", "Call centre agent",
       "Bartender", "Housekeeper", "Recruiter", "Account manager", "Marketing assistant", "Bus driver"],
  fr: ["Vendeur", "Preparateur de commandes", "Chauffeur-livreur", "Conseiller clientele", "Aide-soignant",
       "Serveur", "Barista", "Receptionniste", "Assistant administratif", "Agent d'entretien", "Agent de securite", "Caissier",
       "Plongeur", "Cuisinier", "Cariste", "Auxiliaire de creche", "Assistant d'education", "Teleconseiller",
       "Barman", "Femme de chambre", "Charge de recrutement", "Commercial", "Assistant marketing", "Conducteur de bus"],
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
              {(METIERS[lang] || METIERS.en).map((m) => <span key={copie + m}>{m}<i aria-hidden="true" /></span>)}
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
              <div className="vv-cherche">
                {t.cherche.map(([quoi, comment]) => (
                  <div key={quoi} className="vv-cherche__r"><b>{quoi}</b><span>{comment}</span></div>
                ))}
              </div>
              <p className="vv-note">{t.readNote}</p>            </div>
          </div>
        </section>

        {/* FOR WHOM: the jobs, in large type */}
        <section className="vv-sec nuvi-scroll-in" id="qui">
          <div className="vv-grid2">
            <div className="vv-sticky">
              <span className="vv-eyebrow">{t.quiEyebrow}</span>
              <h2 className="vv-h nuvi-titre-geant"><Mots>{t.quiTitle}</Mots></h2>
              <p className="vv-lead vv-muted">{t.quiLead}</p>
            </div>
            <ul className="vv-metiers">
              {(METIERS[lang] || METIERS.en).map((m) => <li key={m}>{m}</li>)}
            </ul>
          </div>
        </section>

        {/* 02 THREE MOVES */}
        <section className="vv-sec vv-sec--white nuvi-scroll-in" id="how">
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
        <section className="vv-sec nuvi-scroll-in" id="templates">
          <span className="vv-eyebrow">{t.tplEyebrow}</span>
          <h2 className="vv-h nuvi-titre-geant"><Mots>{t.tplTitle}</Mots></h2>
          <p className="vv-lead vv-muted">{t.tplLead}</p>
          <div className="vv-rail" style={{ marginTop: "3rem" }}>
            {LAYOUTS.map((id) => (
              <figure key={id} className="vv-tpl">
                <div className="vv-tpl__card"><ApercuGabarit kind={id} locale={lang} /></div>
                <figcaption><b>{metaGabarit(lang)[id].label}</b><span>{metaGabarit(lang)[id].desc}</span></figcaption>
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
            {t.after.map(([titre, corps]) => (
              <div key={titre} className="vv-frost"><h3>{titre}</h3><p>{corps}</p></div>
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
