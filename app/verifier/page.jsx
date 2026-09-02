"use client";

// WHAT A SCREENING TOOL SEES, ON YOUR OWN FILE, ANY TIME YOU WANT
//
// The diagnostic panel used to state that downloading a CV had it re-read by
// three real parsers. It did not: the module doing that comparison was
// imported by tests only. The owner relied on that sentence, found out
// nothing verified, and stopped believing the rest. A promise of
// verification stops doubt instead of informing it. So the check runs here,
// where the person can watch it, on the file they hold.
//
// TWO CORRECTIONS THIS PAGE HAS ALREADY NEEDED
//
// It shipped hardcoded in French while the whole product opens in English:
// AppRoot holds locale at "en" and asks once. A page written in one language
// is not a design choice, it is a page that forgot i18n existed. It now
// follows the same stored choice as the rest of the site, English by
// default.
//
// It also shipped in a near-black of my own invention, with a mint green
// that belongs to no palette here. Nuvi is cream and ink with coral for
// accent. A page in black is not an intention, it is a palette borrowed from
// somewhere else. Contrast now comes from what the brand owns.

import { useCallback, useEffect, useRef, useState } from "react";
import { verifierUnPdf } from "../../lib/verifierUnPdf.js";
import { texteDuFichier } from "../../lib/lireUnFichier.js";
import {
  Ink, Cream, CreamSoft, Paper, Coral, CoralSoft, Green, GreenSoft,
  Purple, Magenta, Gray200, Gray600, Serif, Sans, GradPurple,  CoralText, PurpleText } from "../components/tokens";

const Muted = Gray600;
const Hair = Gray200;
const Mono = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

// LE FAISCEAU PORTE LE VIOLET ET LE MAGENTA, ET C'EST LE BON ENDROIT
//
// Ces deux couleurs sont l'energie de la marque, et elles ne vivaient que
// sur deux boutons. Le faisceau est le seul element de la page qui represente
// Nuvi en train d'agir : c'est lui qui lit, et c'est a lui de porter le
// degrade. Le corail reste sur ce qui alerte, le vert sur ce qui passe. Une
// couleur par role, sinon la page devient un nuancier.
const FAISCEAU = "linear-gradient(90deg, transparent, " + Purple + " 35%, "
  + Magenta + " 65%, transparent)";
const HALO = "0 0 26px 4px rgba(91,61,245,.42)";

// La cle sous laquelle le reste du produit range la langue choisie. On la lit
// plutot que d'en poser une autre : quelqu'un qui a repondu "francais" dans
// l'application ne doit pas retrouver l'anglais ici.
const CLE_LANGUE = "cvf_c";

const KEYFRAMES = `
@keyframes vBeam {
  0%   { transform: translateY(-10%); opacity: 0 }
  10%  { opacity: 1 }
  90%  { opacity: 1 }
  100% { transform: translateY(112%); opacity: 0 }
}
@keyframes vMeurt { from { opacity: 1 } to { opacity: .16 } }
@keyframes vNait  { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
@keyframes vRise  { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
@keyframes vPop {
  0%   { opacity: 0; transform: scale(.9) translateY(10px) }
  65%  { opacity: 1; transform: scale(1.02) translateY(0) }
  100% { opacity: 1; transform: scale(1) translateY(0) }
}
@keyframes vBar { from { transform: scaleX(0) } to { transform: scaleX(1) } }

.v-rise { animation: vRise 560ms cubic-bezier(.22,1,.36,1) backwards;
          animation-delay: calc(min(var(--r,0), 12) * 65ms) }
.v-pop  { animation: vPop 520ms cubic-bezier(.22,1,.36,1) backwards;
          animation-delay: calc(min(var(--r,0), 12) * 65ms) }
.v-bar  { transform-origin: left; animation: vBar 700ms cubic-bezier(.22,1,.36,1) backwards;
          animation-delay: calc(min(var(--r,0), 12) * 65ms + 140ms) }
.v-nait { animation: vNait 300ms ease-out backwards;
          animation-delay: calc(min(var(--r,0), 40) * 30ms) }
.v-demo-beam { animation: vBeam 4.2s cubic-bezier(.5,0,.5,1) infinite }
.v-demo-mot  { animation: vMeurt 2.1s ease-out infinite alternate;
               animation-delay: calc(var(--p, 0) * 2.4s) }
.v-scan { animation: vBeam 1150ms cubic-bezier(.4,0,.2,1) infinite }

.v-zone { transition: border-color 240ms ease, background 240ms ease,
                      box-shadow 240ms ease, transform 240ms ease }
.v-zone[data-glisse="1"] { transform: scale(1.008) }

/* La lueur suit le curseur. Elle est posee en variables CSS par le
   composant : un setState a chaque mousemove ferait travailler le rendu pour
   un effet purement visuel. */
.v-lueur::before {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(460px circle at var(--mx, 50%) var(--my, 50%),
              rgba(91,61,245,.15), rgba(185,28,140,.07) 40%, transparent 66%);
  opacity: 0; transition: opacity 320ms ease;
}
.v-lueur:hover::before, .v-zone[data-glisse="1"]::before { opacity: 1 }

@media (prefers-reduced-motion: reduce) {
  .v-rise, .v-pop, .v-bar, .v-nait, .v-demo-mot { animation: none !important }
  .v-demo-beam, .v-scan { display: none !important }
  .v-zone { transition: none !important }
  .v-lueur::before { display: none }
}
`;

const T = {
  en: {
    marque: "Free check",
    h1a: "Your CV,", h1b: "as read by the software", h1c: "that screens you.",
    sous: "Before a recruiter sees you, a program pulls your CV apart into fields and drops whatever it cannot place. Drop any PDF: you see exactly what survives.",
    puces: ["No account", "Nothing is uploaded", "Six real parsers"],
    demoReste: "What is left of it",
    depot: "Drop", depotLache: "Let go", depotLecture: "Reading",
    depotTitre: "Drop your CV anywhere on this page",
    depotLisant: "Nuvi is reading your CV...",
    depotSous: "PDF. Yours, or the one you have been sending for months.",
    depotSousLisant: "On your device. Nothing is sent, nothing is kept.",
    choisir: "Choose a file", autre: "Choose another CV", lecture: "Reading...",
    erreur: "This file could not be read: ",
    erreurSuite: ". If it is password protected, a parser will not read it either.",
    blancheTag: "Blank page",
    blancheTitre: "This PDF carries no text at all.",
    blancheCorps1: "It displays perfectly, and a screening tool finds only ",
    blancheCorps2: " character(s) in it. This is the most dangerous defect because it is invisible: your CV looks normal and arrives empty at the first filter. It happens when the PDF comes from a photo, a scan, or an export with no text layer.",
    verdictTag: "What the machine sees",
    tous: "All six of the most widely used parsers read you in full.",
    aucun: "None of the six parsers finds what it needs.",
    partiel: " of the six most widely used parsers read you in full.",
    lit: "reads you", perd: "loses you",
    champTag: "Field by field",
    retrouve: "found", perdu: "lost",
    bruteTag: "Raw text",
    bruteTitre: "This is everything it receives.",
    bruteCorps: "No layout, no colours, no photo reach it. You can get the same result without us: open your PDF, select all, copy, paste anywhere.",
    afficher: "Show the extracted text", masquer: "Hide",
    limiteTag: "What this check cannot tell you",
    limite1: "This page reads your file and nothing else, exactly like a real parser, which never has more. So it cannot know what existed BEFORE: if a line vanished between your CV and the PDF, there is nothing here to compare it against.",
    limite2: "And a parser that reads you is not a recruiter who calls you. Passing all six says nothing about how strong your CV is, only that it arrives intact in front of a human.",
    cta: "Fix my CV with Nuvi",
    avantTag: "Seven checks, six parsers",
    avantTitre: "What a program looks for, and loses.",
    vendeursTitre: "Workday, Taleo, iCIMS, SuccessFactors, Greenhouse, Lever",
    vendeursCorps: "Each has its own demands. Taleo loses whole blocks without a word; Greenhouse forgives more.",
    libelles: {
      nom: "Your name", email: "Your email address", telephone: "Your phone number",
      rubriques: "Your section headings", dates: "The dates on each job",
      employeurs: "Your employers", ordre: "The reading order",
    },
    pourquoi: {
      nom: "A program that cannot find your name creates a record with no candidate in it.",
      email: "This is how they reply. Missing, you do not exist in the database.",
      telephone: "Plenty of recruiters call before they write.",
      rubriques: "A parser matches your headings against a known list. “My journey” is not on it.",
      dates: "Without two markers, a job cannot be sorted into any search by seniority.",
      employeurs: "This is the name a recruiter filters on when they search by sector.",
      ordre: "If the contact block comes before your name, the record takes an address for a candidate.",
    },
  },
  fr: {
    marque: "Verification gratuite",
    h1a: "Ton CV,", h1b: "vu par la machine", h1c: "qui te trie.",
    sous: "Avant qu'un recruteur te lise, un logiciel extrait ton CV en champs et jette ce qu'il ne sait pas ranger. Depose n'importe quel PDF : tu vois exactement ce qu'il en reste.",
    puces: ["Aucun compte", "Rien n'est envoye", "Six analyseurs reels"],
    demoReste: "Ce qu'il en reste",
    depot: "Depot", depotLache: "Lache le fichier", depotLecture: "Lecture en cours",
    depotTitre: "Glisse ton CV n'importe ou sur la page",
    depotLisant: "Nuvi lit ton CV...",
    depotSous: "PDF. Le tien, ou celui que tu envoies deja depuis des mois.",
    depotSousLisant: "Sur ton appareil. Rien n'est envoye, rien n'est garde.",
    choisir: "Choisir un fichier", autre: "Choisir un autre CV", lecture: "Lecture...",
    erreur: "Ce fichier n'a pas pu etre lu : ",
    erreurSuite: ". Si c'est un PDF protege par mot de passe, un analyseur ne le lira pas davantage.",
    blancheTag: "Page blanche",
    blancheTitre: "Ce PDF ne contient aucun texte a lire.",
    blancheCorps1: "Il s'affiche parfaitement, et un logiciel de tri n'y trouve que ",
    blancheCorps2: " caractere(s). C'est le defaut le plus dangereux parce qu'il est invisible : ton CV a l'air normal et il arrive vide devant le premier filtre. Cela arrive quand le PDF vient d'une photo, d'un scan, ou d'un export sans couche de texte.",
    verdictTag: "Ce que voit la machine",
    tous: "Les six analyseurs les plus repandus te lisent en entier.",
    aucun: "Aucun des six analyseurs ne retrouve ce dont il a besoin.",
    partiel: " des six analyseurs les plus repandus te lisent en entier.",
    lit: "te lit", perd: "te perd",
    champTag: "Champ par champ",
    retrouve: "retrouve", perdu: "perdu",
    bruteTag: "Texte brut",
    bruteTitre: "Voila tout ce qu'il recoit.",
    bruteCorps: "Ni la mise en page, ni les couleurs, ni la photo ne lui parviennent. Tu obtiens le meme resultat sans nous : ouvre ton PDF, tout selectionner, copier, coller n'importe ou.",
    afficher: "Afficher le texte extrait", masquer: "Masquer",
    limiteTag: "La limite de ce controle",
    limite1: "Cette page lit ton fichier et rien d'autre, exactement comme un vrai analyseur, qui n'a jamais rien de plus. Elle ne peut donc pas savoir ce qui existait AVANT : si une ligne a disparu entre ton CV et le PDF, il n'y a rien ici a quoi la comparer.",
    limite2: "Et un analyseur qui te lit n'est pas un recruteur qui te rappelle. Passer les six ne dit rien de la force de ton CV, seulement qu'il arrive entier devant un humain.",
    cta: "Corriger mon CV avec Nuvi",
    avantTag: "Sept controles, six analyseurs",
    avantTitre: "Ce qu'un logiciel cherche, et perd.",
    vendeursTitre: "Workday, Taleo, iCIMS, SuccessFactors, Greenhouse, Lever",
    vendeursCorps: "Chacun a ses exigences. Taleo perd des blocs entiers sans rien signaler ; Greenhouse pardonne davantage.",
    libelles: {
      nom: "Ton nom", email: "Ton adresse e-mail", telephone: "Ton numero",
      rubriques: "Les intitules de rubrique", dates: "Les periodes de chaque poste",
      employeurs: "Les employeurs", ordre: "L'ordre de lecture",
    },
    pourquoi: {
      nom: "Un logiciel qui ne retrouve pas ton nom cree une fiche sans candidat.",
      email: "C'est par la qu'on te repond. Absente, tu n'existes pas dans la base.",
      telephone: "Beaucoup de recruteurs appellent avant d'ecrire.",
      rubriques: "Un analyseur compare tes titres a une liste connue. « Mon parcours » n'y figure pas.",
      dates: "Sans deux reperes, un poste ne se range dans aucune recherche par anciennete.",
      employeurs: "C'est le nom que le recruteur cherche quand il filtre par secteur.",
      ordre: "Si le bloc contact passe avant ton nom, la fiche prend une adresse pour un candidat.",
    },
  },
};

const DEMO = [
  { t: "Kilian Maisonnette", gros: true },
  { t: "Bar Manager" },
  { t: "CONTACT", faible: true },
  { t: "k@exemple.com" },
  { t: "EXPERIENCE", faible: true },
  { t: "Bar Manager, Taj Exotica" },
  { t: "2021 - 2024" },
];

function Compteur({ vers, duree = 1100 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const reduit = window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduit) { setN(vers); return undefined; }
    let brut = null; let raf = 0;
    const pas = (t) => {
      if (brut === null) brut = t;
      const p = Math.min(1, (t - brut) / duree);
      setN(Math.round(vers * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [vers, duree]);
  return <>{n}</>;
}

export default function PageVerifier() {
  // ANGLAIS PAR DEFAUT, ET AUCUNE QUESTION POSEE ICI
  //
  // La langue se demande UNE fois, a l'arrivee sur le site, et se change
  // ensuite dans les reglages. C'est la regle du produit, et elle vaut aussi
  // pour cette page : une premiere version y avait ajoute un selecteur EN/FR
  // dans l'en-tete. Deux endroits pour repondre a la meme question, c'est un
  // endroit de trop, et celui qu'on ajoute finit toujours par diverger de
  // l'autre.
  //
  // On part donc de l'anglais, comme AppRoot, et on adopte le choix deja fait
  // s'il existe. La lecture se fait dans un effet et non au premier rendu :
  // localStorage n'existe pas sur le serveur, et lire au rendu ferait diverger
  // le HTML rendu par le serveur de celui du navigateur, ce que React signale
  // et paie en re-rendu complet.
  const [langue, setLangue] = useState("en");
  useEffect(() => {
    try {
      const brut = window.localStorage.getItem(CLE_LANGUE);
      const v = brut ? JSON.parse(brut) : null;
      if (v === "fr" || v === "en") setLangue(v);
    } catch { /* pas de stockage : l'anglais reste */ }
  }, []);
  const t = T[langue] || T.en;

  const [etat, setEtat] = useState("attente");
  const [resultat, setResultat] = useState(null);
  const [nomFichier, setNomFichier] = useState("");
  const [erreur, setErreur] = useState("");
  const [glisse, setGlisse] = useState(false);
  const [texteOuvert, setTexteOuvert] = useState(false);
  const inputRef = useRef(null);
  const zoneRef = useRef(null);
  const resultatRef = useRef(null);

  const onMouse = useCallback((e) => {
    const el = zoneRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", (e.clientX - r.left) + "px");
    el.style.setProperty("--my", (e.clientY - r.top) + "px");
  }, []);

  // Viser un cadre avec un fichier est une corvee sur grand ecran : la
  // fenetre entiere accepte le depot, et la zone s'allume pour le dire.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    let compte = 0;
    const entre = (e) => { e.preventDefault(); compte += 1; setGlisse(true); };
    const sort = (e) => { e.preventDefault(); compte -= 1; if (compte <= 0) setGlisse(false); };
    const survole = (e) => e.preventDefault();
    window.addEventListener("dragenter", entre);
    window.addEventListener("dragleave", sort);
    window.addEventListener("dragover", survole);
    return () => {
      window.removeEventListener("dragenter", entre);
      window.removeEventListener("dragleave", sort);
      window.removeEventListener("dragover", survole);
    };
  }, []);

  const lire = useCallback(async (fichier) => {
    if (!fichier) return;
    setNomFichier(fichier.name || "");
    setErreur(""); setResultat(null); setTexteOuvert(false);
    setEtat("lecture");
    try {
      const texte = await texteDuFichier(fichier);
      // Le faisceau doit avoir eu le temps d'etre vu : sur un petit PDF la
      // lecture rend la main en 200ms et l'ecran clignote.
      await new Promise((r) => setTimeout(r, 620));
      setResultat(verifierUnPdf(texte));
      setEtat("fait");
      setTimeout(() => {
        const el = resultatRef.current;
        if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (e) {
      setErreur((e && e.message) || "unreadable");
      setEtat("erreur");
    }
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setGlisse(false);
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) lire(f);
  }, [lire]);

  const passent = resultat && resultat.profils
    ? resultat.profils.filter((p) => p.passe).length : 0;
  const montreDemo = etat === "attente" || etat === "erreur";
  const tag = {
    fontFamily: Mono, fontSize: 10.5, letterSpacing: "0.18em",
    textTransform: "uppercase", color: CoralText,
  };

  return (
    <main lang={langue} style={{
      minHeight: "100vh", background: Cream, color: Ink, fontFamily: Sans,
      overflowX: "clip",
    }}>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <div style={{
        maxWidth: 1120, margin: "0 auto",
        padding: "clamp(22px, 4vw, 40px) clamp(18px, 5vw, 56px) 0",
      }}>
        <a href="/" style={{
          fontFamily: Serif, fontSize: 20, color: Ink,
          textDecoration: "none", letterSpacing: "-0.02em",
        }}>Nuvi</a>
      </div>

      {/* ================= HEROS ========================================= */}
      <section style={{
        maxWidth: 1120, margin: "0 auto",
        padding: "clamp(34px, 8vh, 86px) clamp(18px, 5vw, 56px) clamp(30px, 6vh, 60px)",
        display: "grid", gap: "clamp(34px, 5vw, 62px)",
        gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
        alignItems: "center",
      }}>
        <div>
          <div className="v-rise" style={{ "--r": 0, ...tag, marginBottom: 14 }}>{t.marque}</div>
          <h1 className="v-rise" style={{
            "--r": 1, fontFamily: Serif, fontWeight: 400,
            fontSize: "clamp(34px, 6.4vw, 68px)", lineHeight: 1.02,
            letterSpacing: "-0.04em", margin: 0,
          }}>
            {t.h1a}<br />{t.h1b}<br />
            <span style={{ fontStyle: "italic", color: CoralText }}>{t.h1c}</span>
          </h1>
          <p className="v-rise" style={{
            "--r": 2, fontSize: 16, lineHeight: 1.62, color: Muted,
            maxWidth: "44ch", marginTop: 20,
          }}>{t.sous}</p>
          <div className="v-rise" style={{
            "--r": 3, display: "flex", gap: 10, flexWrap: "wrap",
            marginTop: 24, fontSize: 12, color: Muted,
          }}>
            {t.puces.map((x) => (
              <span key={x} style={{
                border: "1px solid " + Hair, borderRadius: 999,
                padding: "7px 14px", background: Paper,
              }}>{x}</span>
            ))}
          </div>
        </div>

        {/* LA DEMONSTRATION : ce que le faisceau laisse derriere lui. */}
        <div className="v-rise" aria-hidden="true" style={{
          "--r": 2, position: "relative",
          background: Paper, borderRadius: 18, border: "1px solid " + Hair,
          boxShadow: "0 30px 70px -46px rgba(10,10,10,.4)",
          padding: "26px 24px", overflow: "hidden", minHeight: 300,
        }}>
          {montreDemo && (
            <div className="v-demo-beam" style={{
              position: "absolute", left: 0, right: 0, top: 0, height: 2,
              background: FAISCEAU, boxShadow: HALO,
            }}/>
          )}
          {DEMO.map((l, i) => (
            <div key={l.t} className={montreDemo ? "v-demo-mot" : ""} style={{
              "--p": i / DEMO.length,
              fontFamily: l.gros ? Serif : Sans,
              fontSize: l.gros ? 24 : l.faible ? 10 : 13.5,
              fontWeight: l.faible ? 700 : l.gros ? 400 : 500,
              letterSpacing: l.faible ? "0.14em" : "-0.01em",
              textTransform: l.faible ? "uppercase" : "none",
              color: l.faible ? Muted : Ink,
              marginBottom: l.gros ? 4 : 11, marginTop: l.faible ? 16 : 0,
            }}>{l.t}</div>
          ))}
          <div style={{
            marginTop: 18, paddingTop: 14, borderTop: "1px dashed " + Hair,
            fontFamily: Mono, fontSize: 11, color: Muted, lineHeight: 1.7,
          }}>
            Kilian Maisonnette / Bar Manager / k@exemple.com /<br />
            Bar Manager, Taj Exotica / 2021-2024
          </div>
          <div style={{ ...tag, fontSize: 10, marginTop: 8 }}>{t.demoReste}</div>
        </div>
      </section>

      {/* ================= LA ZONE DE DEPOT ============================== */}
      <section style={{
        maxWidth: 1120, margin: "0 auto",
        padding: "0 clamp(18px, 5vw, 56px) clamp(40px, 8vh, 80px)",
      }}>
        <div ref={zoneRef} className="v-zone v-lueur v-rise"
          data-glisse={glisse ? "1" : "0"} onMouseMove={onMouse}
          onDragOver={(e) => e.preventDefault()} onDrop={onDrop}
          style={{
            "--r": 4, position: "relative", overflow: "hidden",
            background: glisse ? "rgba(91,61,245,.06)" : CreamSoft,
            border: "1.5px solid " + (glisse ? Purple : Gray200),
            boxShadow: glisse
              ? "0 36px 80px -50px rgba(217,119,87,.55)"
              : "0 26px 66px -54px rgba(10,10,10,.5)",
            borderRadius: 22, padding: "clamp(38px, 7vw, 74px) 24px",
            textAlign: "center",
          }}>
          {etat === "lecture" && (
            <div className="v-scan" style={{
              position: "absolute", left: 0, right: 0, top: 0, height: 2,
              background: FAISCEAU, boxShadow: HALO,
            }}/>
          )}

          <input ref={inputRef} type="file" accept=".pdf,application/pdf,.txt"
            onChange={(e) => lire(e.target.files && e.target.files[0])}
            style={{ display: "none" }}/>

          <div style={{ ...tag, marginBottom: 14 }}>
            {etat === "lecture" ? t.depotLecture : glisse ? t.depotLache : t.depot}
          </div>
          <div style={{
            fontFamily: Serif, fontSize: "clamp(22px, 3.6vw, 34px)",
            letterSpacing: "-0.03em", marginBottom: 8, color: Ink,
          }}>
            {etat === "lecture" ? t.depotLisant : nomFichier || t.depotTitre}
          </div>
          <div style={{ fontSize: 13.5, color: Muted, marginBottom: 26 }}>
            {etat === "lecture" ? t.depotSousLisant : t.depotSous}
          </div>

          <button onClick={() => inputRef.current && inputRef.current.click()}
            disabled={etat === "lecture"}
            style={{
              border: "none", cursor: etat === "lecture" ? "default" : "pointer",
              padding: "15px 30px", minHeight: 50, borderRadius: 999,
              background: etat === "lecture" ? Gray200 : GradPurple,
              color: etat === "lecture" ? Muted : "#fff",
              fontFamily: Sans, fontWeight: 600, fontSize: 14.5,
            }}>
            {etat === "lecture" ? t.lecture : (resultat ? t.autre : t.choisir)}
          </button>
        </div>

        {etat === "erreur" && (
          <div className="v-rise" style={{
            marginTop: 16, background: CoralSoft, border: "1px solid " + Coral,
            borderRadius: 14, padding: "15px 18px", fontSize: 13.5, lineHeight: 1.55,
          }}>{t.erreur}{erreur}{t.erreurSuite}</div>
        )}
      </section>

      <div ref={resultatRef} />

      {/* ================= PAGE BLANCHE ================================== */}
      {etat === "fait" && resultat && !resultat.lisible && (
        <section className="v-rise" style={{
          maxWidth: 1120, margin: "0 auto",
          padding: "0 clamp(18px, 5vw, 56px) clamp(50px, 9vh, 96px)",
        }}>
          <div style={{
            background: CoralSoft, border: "1px solid " + Coral, borderRadius: 22,
            padding: "clamp(30px, 6vw, 56px)",
          }}>
            <div style={{ ...tag, marginBottom: 14 }}>{t.blancheTag}</div>
            <h2 style={{
              fontFamily: Serif, fontWeight: 400, fontSize: "clamp(26px, 5vw, 44px)",
              letterSpacing: "-0.035em", margin: "0 0 16px", lineHeight: 1.1,
            }}>{t.blancheTitre}</h2>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: Ink, margin: 0, maxWidth: "58ch" }}>
              {t.blancheCorps1}{resultat.caracteres}{t.blancheCorps2}
            </p>
          </div>
        </section>
      )}

      {/* ================= LE VERDICT ==================================== */}
      {etat === "fait" && resultat && resultat.lisible && (
        <>
          <section style={{
            maxWidth: 1120, margin: "0 auto",
            padding: "0 clamp(18px, 5vw, 56px) clamp(40px, 7vh, 76px)",
          }}>
            <div className="v-rise" style={{ "--r": 0, ...tag, marginBottom: 18 }}>{t.verdictTag}</div>

            <div className="v-pop" style={{
              "--r": 1, display: "flex", alignItems: "flex-end",
              gap: "clamp(16px, 3vw, 34px)", flexWrap: "wrap", marginBottom: 30,
            }}>
              <div style={{
                fontFamily: Serif, fontWeight: 300,
                fontSize: "clamp(76px, 15vw, 150px)", lineHeight: .82,
                letterSpacing: "-0.06em",
                color: passent === 6 ? Green : passent >= 4 ? Ink : Coral,
              }}>
                <Compteur vers={passent} />
                <span style={{ fontSize: "0.34em", color: Muted, letterSpacing: "-0.02em" }}>/6</span>
              </div>
              <div style={{
                fontSize: 17, color: Ink, lineHeight: 1.45, maxWidth: "28ch",
                paddingBottom: 10, fontFamily: Serif, letterSpacing: "-0.015em",
              }}>
                {passent === 6 ? t.tous : passent === 0 ? t.aucun : passent + t.partiel}
              </div>
            </div>

            <div style={{
              display: "grid", gap: 12,
              gridTemplateColumns: "repeat(auto-fill, minmax(262px, 1fr))",
            }}>
              {resultat.profils.map((p, i) => (
                <div key={p.id} className="v-pop" style={{
                  "--r": i + 2,
                  background: p.passe ? Paper : CoralSoft,
                  borderRadius: 16,
                  border: "1px solid " + (p.passe ? Hair : Coral),
                  padding: "17px 18px",
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 10, marginBottom: p.bloquants.length || p.degradations.length ? 10 : 0,
                  }}>
                    <span style={{ fontWeight: 600, fontSize: 14.5 }}>{p.nom}</span>
                    <span style={{
                      fontFamily: Mono, fontSize: 9.5, fontWeight: 700,
                      letterSpacing: "0.1em", textTransform: "uppercase",
                      color: p.passe ? Green : Coral,
                      background: p.passe ? GreenSoft : Paper,
                      padding: "5px 10px", borderRadius: 999, whiteSpace: "nowrap",
                    }}>{p.passe ? t.lit : t.perd}</span>
                  </div>
                  {p.bloquants.concat(p.passe ? p.degradations : []).map((b) => (
                    <div key={b.quoi} style={{ fontSize: 12.5, lineHeight: 1.55, color: Muted }}>
                      {t.libelles[b.quoi] || b.quoi} : {b.fait}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {/* ================= CHAMP PAR CHAMP ============================ */}
          <section style={{
            maxWidth: 1120, margin: "0 auto",
            padding: "0 clamp(18px, 5vw, 56px) clamp(40px, 7vh, 76px)",
          }}>
            <div className="v-rise" style={{ "--r": 0, ...tag, marginBottom: 20 }}>{t.champTag}</div>
            {Object.entries(resultat.champs).map(([cle, v], i) => (
              <div key={cle} className="v-rise" style={{
                "--r": i + 1, borderTop: "1px solid " + Hair, padding: "18px 0",
              }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 11, flexWrap: "wrap" }}>
                  <span aria-hidden="true" style={{
                    color: v.ok ? Green : Coral, fontWeight: 700, fontSize: 15,
                  }}>{v.ok ? "✓" : "✗"}</span>
                  <span style={{ fontFamily: Serif, fontSize: 18, letterSpacing: "-0.02em" }}>
                    {t.libelles[cle] || cle}
                  </span>
                  <span style={{
                    fontFamily: Mono, fontSize: 9.5, color: v.ok ? Green : Coral,
                    fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                  }}>{v.ok ? t.retrouve : t.perdu}</span>
                </div>
                <div style={{ fontSize: 13.5, color: Ink, lineHeight: 1.6, paddingLeft: 26, marginTop: 5 }}>
                  {v.fait}
                </div>
                {!v.ok && (
                  <div style={{ fontSize: 12.5, color: Muted, lineHeight: 1.6, paddingLeft: 26, marginTop: 5 }}>
                    {t.pourquoi[cle]}
                  </div>
                )}
                <div className="v-bar" style={{
                  "--r": i + 1, height: 2, borderRadius: 2, marginTop: 12, marginLeft: 26,
                  background: v.ok ? GradPurple : Coral, opacity: v.ok ? .55 : .45,
                }}/>
              </div>
            ))}
          </section>

          {/* ================= LE TEXTE BRUT ============================== */}
          <section style={{ background: CreamSoft, padding: "clamp(50px, 9vh, 96px) 0" }}>
            <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 clamp(18px, 5vw, 56px)" }}>
              <div style={{ ...tag, marginBottom: 14 }}>{t.bruteTag}</div>
              <h2 style={{
                fontFamily: Serif, fontWeight: 400, fontSize: "clamp(24px, 4.4vw, 40px)",
                letterSpacing: "-0.035em", margin: "0 0 14px", lineHeight: 1.1, maxWidth: "20ch",
              }}>{t.bruteTitre}</h2>
              <p style={{ fontSize: 14.5, lineHeight: 1.7, color: Muted, maxWidth: "58ch", margin: "0 0 24px" }}>
                {t.bruteCorps}
              </p>

              <button onClick={() => setTexteOuvert((o) => !o)} aria-expanded={texteOuvert}
                data-nuvi-texte-brut="1"
                style={{
                  border: "1px solid " + Ink, background: "transparent", cursor: "pointer",
                  borderRadius: 999, padding: "12px 22px", minHeight: 46,
                  fontFamily: Mono, fontSize: 12, color: Ink, letterSpacing: "0.04em",
                }}>{texteOuvert ? t.masquer : t.afficher}</button>

              {texteOuvert && (
                <div style={{
                  marginTop: 18, background: Paper,
                  borderLeft: "3px solid " + Coral, border: "1px solid " + Hair,
                  borderLeftWidth: 3, borderLeftColor: Coral,
                  borderRadius: 14, padding: "20px 22px",
                  maxHeight: 480, overflowY: "auto",
                }}>
                  {resultat.texte.split("\n").map((ligne, i) => (
                    <div key={i} className="v-nait" style={{
                      "--r": i, display: "flex", gap: 16,
                      fontFamily: Mono, fontSize: 12.5, lineHeight: 1.9,
                    }}>
                      <span style={{ color: Gray200, userSelect: "none", minWidth: 26, textAlign: "right" }}>
                        {i + 1}
                      </span>
                      <span style={{ color: ligne.trim() ? Ink : Gray200, whiteSpace: "pre-wrap" }}>
                        {ligne || "·"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ================= LA LIMITE, PUIS LA SUITE =================== */}
          <section style={{
            maxWidth: 1120, margin: "0 auto",
            padding: "clamp(44px, 8vh, 86px) clamp(18px, 5vw, 56px) clamp(60px, 10vh, 110px)",
          }}>
            <div className="v-rise" style={{
              background: Paper, border: "1px solid " + Hair, borderRadius: 18,
              padding: "24px 26px", maxWidth: 720,
            }}>
              <div style={{ ...tag, color: Muted, fontSize: 10, marginBottom: 10 }}>{t.limiteTag}</div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: Ink, margin: 0 }}>{t.limite1}</p>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: Muted, margin: "12px 0 0" }}>{t.limite2}</p>
            </div>

            <a href="/app" className="v-rise" style={{
              display: "inline-flex", alignItems: "center", gap: 10, marginTop: 30,
              background: GradPurple, color: "#fff", textDecoration: "none",
              padding: "17px 32px", minHeight: 52, borderRadius: 999,
              fontWeight: 600, fontSize: 15,
            }}>{t.cta} <span aria-hidden="true">&rarr;</span></a>
          </section>
        </>
      )}

      {/* ================= AVANT DEPOT =================================== */}
      {montreDemo && (
        <section style={{ background: CreamSoft, padding: "clamp(54px, 10vh, 104px) 0" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 clamp(18px, 5vw, 56px)" }}>
            <div style={{ ...tag, marginBottom: 16 }}>{t.avantTag}</div>
            <h2 style={{
              fontFamily: Serif, fontWeight: 400, fontSize: "clamp(26px, 4.8vw, 46px)",
              letterSpacing: "-0.035em", margin: "0 0 34px", lineHeight: 1.08, maxWidth: "18ch",
            }}>{t.avantTitre}</h2>

            <div style={{
              display: "grid", gap: 1, background: Hair,
              border: "1px solid " + Hair, borderRadius: 16, overflow: "hidden",
              gridTemplateColumns: "repeat(auto-fit, minmax(268px, 1fr))",
            }}>
              {Object.entries(t.libelles).map(([cle, nom], i) => (
                <div key={cle} style={{ background: Paper, padding: "20px 22px" }}>
                  <div style={{
                    fontFamily: Mono, fontSize: 10, color: PurpleText,
                    marginBottom: 8, letterSpacing: "0.08em",
                  }}>{String(i + 1).padStart(2, "0")}</div>
                  <div style={{
                    fontFamily: Serif, fontSize: 18, letterSpacing: "-0.02em", marginBottom: 7,
                  }}>{nom}</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.6, color: Muted }}>
                    {t.pourquoi[cle]}
                  </div>
                </div>
              ))}
              <div style={{ background: Ink, color: Cream, padding: "20px 22px" }}>
                <div style={{
                  fontFamily: Mono, fontSize: 10, color: CoralText,
                  marginBottom: 8, letterSpacing: "0.08em",
                }}>+</div>
                <div style={{
                  fontFamily: Serif, fontSize: 17, letterSpacing: "-0.02em",
                  marginBottom: 7, lineHeight: 1.25,
                }}>{t.vendeursTitre}</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.6, color: Gray200 }}>
                  {t.vendeursCorps}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
