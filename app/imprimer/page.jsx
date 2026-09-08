"use client";

// The page Chromium prints: the CV alone, as the editor draws it.
//
// WHY A SECOND WAY TO MAKE THE PDF
//
// The export in the browser photographs the CV (html2canvas) and lays an
// invisible text layer over the picture. Every parser reads it, but it is
// a picture: 700 KB for a page, pixels when zoomed, hidden text in a
// generic font with no bold. Every builder people compare Nuvi with hands
// out a native PDF: vector text, the real fonts, 60 KB.
//
// This page renders the SAME templates the editor uses, and nothing else:
// no rail, no header, no coach. The route app/api/pdf opens it in headless
// Chromium, hands it the CV through window.__NUVI_IMPRESSION__, waits for
// data-cvf-pret, and prints. What the person edited is what gets printed,
// by the same code, in the same fonts (app/layout.jsx loads them for every
// page, this one included).
//
// A first version rendered the templates on the server with
// renderToStaticMarkup. Next's app router refuses react-dom/server, and
// going around it produced two copies of React and a crash in the hooks.
// Letting the browser render is simpler and truer to the screen.
//
// WHAT THE PRINT CSS DOES THAT THE SCREEN DOES NOT
//
// - Hides the editor's affordances (.cvf-no-print), as the picture export
//   already did.
// - Orders the text for the machine. A PDF's text comes out in paint order,
//   and paint order follows the DOM: on the column template the sidebar
//   (CONTACT, the e-mail, the skills) came before the name, and the
//   monogram "KM" came before everything. A parser that takes the first
//   line for the candidate's name read "KM". Positioned elements with a
//   z-index paint after the normal flow, so the sidebar and the monogram
//   get one: same look, and the name is the first thing read.
// - Fits one page: the route measures the sheet and zooms it down, never
//   under the floor the check before download already enforces.

import { useEffect, useState } from "react";
import { CVSidebar, CVClassic, CVTimeline, CVSwiss, CVCompact, CVAts } from "../components/CVLayouts";
import { FR_T, EN_T } from "../i18n";
import { FORMATS } from "../../lib/formatsPdf";

const CSS = (f) => `
  @page { size: ${f.css}; margin: 0; }
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
  body { width: ${f.largeur}mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .cvf-no-print { display: none !important; }
  /* NO CONTEXTUAL ALTERNATES ON PAPER. Inter swaps "+" and "-" next to
     digits for case-sensitive variants (its "calt" feature), and those
     glyphs carry no Unicode mapping in the PDF: pdf.js read the phone as
     "33 6 12 34 56 78" and the dates as "2021  2024". Measured on the
     printed file; the plain glyphs come back the moment the feature is
     off. Ligatures go for the same reason: one glyph for "ffi" is one
     more thing an extractor can drop. */
  #cv-print, #cv-print * { font-feature-settings: "calt" 0, "liga" 0, "clig" 0 !important; font-variant-ligatures: none !important; }
  [data-cvf-decorative] { position: relative; z-index: 1; }
  [data-cvf-layout="sidebar"] > div > div:first-child { position: relative; z-index: 1; }
`;

function Gabarit({ cv, layout, t, T, locale }) {
  const set = () => {};
  const props = { cv, set, t, T, locale };
  if (layout === "sidebar") return <CVSidebar {...props} />;
  if (layout === "timeline") return <CVTimeline {...props} />;
  if (layout === "swiss") return <CVSwiss {...props} />;
  if (layout === "compact") return <CVCompact {...props} />;
  if (layout === "ats") return <CVAts cv={cv} set={set} T={T} locale={locale} />;
  return <CVClassic {...props} />;
}

// LETTER-SPACED HEADINGS ARE NOT WORDS TO A MACHINE
//
// Section headings are set in capitals with a wide tracking, 0.2em on the
// classic template. Printed natively, each glyph lands with that gap, and
// every extractor reads "P R O F E S S I O N A L  P R O F I L E": a heading
// no parser recognises, on the one line whose job is to be recognised. The
// picture export never had the problem: its hidden text was typed as
// words. Capped at 0.08em the gap stays under the word threshold of the
// extractors measured in the suite, and the eye barely sees the change.
const ESPACEMENT_MAX_EM = 0.08;
function resserrerLesTitres(racine) {
  for (const el of racine.querySelectorAll("*")) {
    const cs = window.getComputedStyle(el);
    const ls = parseFloat(cs.letterSpacing);
    const fs = parseFloat(cs.fontSize);
    if (Number.isFinite(ls) && fs > 0 && ls > fs * ESPACEMENT_MAX_EM) {
      el.style.letterSpacing = ESPACEMENT_MAX_EM + "em";
    }
  }
}

// THE MONOGRAM IS DRAWN, NOT WRITTEN
//
// The initials in the circle are decoration. Printed as text they become
// the first thing a position-based parser reads, top-left of the page:
// "JD", then the name. The picture export left them out of its text
// layer; a native page cannot leave text out, so it draws them instead: the
// span's letters go onto a canvas with the same face, size and colour, and
// an image takes their place. Same look, no text.
function dessinerLesMonogrammes(racine) {
  for (const el of racine.querySelectorAll("[data-cvf-decorative]")) {
    const texte = (el.textContent || "").trim();
    if (!texte) continue;
    const cs = window.getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const echelle = 3;
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(r.width * echelle);
    canvas.height = Math.ceil(r.height * echelle);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.scale(echelle, echelle);
    ctx.font = [cs.fontStyle, cs.fontWeight, cs.fontSize, cs.fontFamily].join(" ");
    ctx.fillStyle = cs.color;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    if (cs.letterSpacing && cs.letterSpacing !== "normal") ctx.letterSpacing = cs.letterSpacing;
    ctx.fillText(texte, r.width / 2, r.height / 2);
    const img = document.createElement("img");
    img.src = canvas.toDataURL("image/png");
    img.alt = "";
    img.width = Math.round(r.width);
    img.height = Math.round(r.height);
    img.style.display = "block";
    el.replaceChildren(img);
  }
}

// THE CONTENT STREAM MUST FOLLOW THE READING ORDER
//
// Chromium writes the PDF in paint order, and CSS paints positioned
// elements after the in-flow text of their stacking context. The timeline
// template positions each job entry to anchor its dot, so the whole
// experience block landed at the END of the stream, after skills and
// languages. Poppler and pdf.js sort glyphs by position and hid it;
// PDFBox, the engine behind Apache Tika and a share of real ATS, reads
// the stream as written and put the jobs after the languages: 81%
// fidelity on CI, dates and employer counted as lost.
//
// If every element is positioned, all of them paint in one phase, in tree
// order, which is the reading order of a single-column template. Relative
// positioning without offsets moves nothing. One exception: an absolutely
// positioned decoration is placed against its nearest positioned ancestor,
// so the static wrappers between such a decoration and its current anchor
// must stay static or the decoration would jump. They are collected first,
// from the anchors as they are before anything changes.
function peindreDansLOrdreDeLecture(el) {
  const tous = [...el.querySelectorAll("*")];
  const geles = new Set();
  for (const e of tous) {
    const pos = getComputedStyle(e).position;
    if (pos !== "absolute" && pos !== "fixed") continue;
    let p = e.parentElement;
    while (p && p !== el && getComputedStyle(p).position === "static") { geles.add(p); p = p.parentElement; }
  }
  for (const e of tous) {
    if (geles.has(e)) continue;
    if (getComputedStyle(e).position === "static") e.style.position = "relative";
  }
  // A bare text node next to positioned siblings still paints in the
  // in-flow phase, before them: the middle dot between an employer and a
  // city came out ahead of both, as "dot Acme Paris". Such a node gets a
  // positioned span of its own, so it takes its place in the same phase
  // as its neighbours.
  for (const e of [el, ...tous]) {
    if (!e.children.length) continue;
    for (const n of [...e.childNodes]) {
      if (n.nodeType !== 3 || !n.nodeValue.trim()) continue;
      const span = document.createElement("span");
      span.style.position = "relative";
      e.replaceChild(span, n);
      span.appendChild(n);
    }
  }
}

export default function Imprimer() {
  const [d, setD] = useState(null);
  const [pret, setPret] = useState(false);
  // THE DOCUMENT IS THE CANDIDATE'S, AND ITS PROPERTIES SAY SO
  //
  // Chromium copies document.title into the PDF's /Title. This page had no
  // title of its own, so it inherited the site's, and every CV printed here
  // left with "Nuvi - the CV that gets past the ATS" in File > Properties:
  // the tool's name and its slogan, on the candidate's document, readable
  // by any recruiter and by the ATS that index PDF metadata. A competitor
  // went viral in September 2026 for exactly this class of leak, a trace of
  // the tool visible to the person hiring.
  //
  // The title is what a document written by hand would carry: the name, and
  // the role when there is one. Nothing about how it was made.
  useEffect(() => {
    if (!d || !d.cv) return;
    const nom = String(d.cv.name || "").trim();
    const poste = String(d.cv.title || "").trim();
    const titre = [nom, poste].filter(Boolean).join(" - ");
    if (titre) document.title = titre;
  }, [d]);

  useEffect(() => {
    if (!d) return;
    const el = document.getElementById("cv-print");
    if (el) {
      peindreDansLOrdreDeLecture(el);
      resserrerLesTitres(el);
      // After the fonts, so the drawn letters are the printed face.
      const finir = () => { dessinerLesMonogrammes(el); setPret(true); };
      const prets = document.fonts && document.fonts.ready;
      if (prets && typeof prets.then === "function") {
        // Eight seconds, not four: the route answers the font requests from
        // its cache, but a cold instance fetches from Google first, and a
        // page printed before its fonts arrive prints the fallback face.
        Promise.race([prets, new Promise((r) => setTimeout(r, 8000))]).then(finir, finir);
      } else finir();
      return;
    }
    setPret(true);
  }, [d]);
  useEffect(() => {
    // Handed by the route before the page loads; or, for a person or a
    // test opening the page by hand, carried in the URL hash as JSON.
    const injecte = typeof window !== "undefined" ? window.__NUVI_IMPRESSION__ : null;
    if (injecte && injecte.cv) { setD(injecte); return; }
    try {
      const h = decodeURIComponent((window.location.hash || "").slice(1));
      if (h) { const x = JSON.parse(h); if (x && x.cv) setD(x); }
    } catch { /* pas de donnees : la page reste vide, et le dit */ }
  }, []);

  if (!d) {
    return <p data-cvf-attente style={{ fontFamily: "sans-serif", padding: 24 }}>
      Nuvi: waiting for a CV to print.
    </p>;
  }
  const T = d.locale === "en" ? EN_T : FR_T;
  const f = FORMATS[d.format] || FORMATS.a4;
  const theme = d.theme || {};
  return (
    <>
      <style>{CSS(f)}</style>
      {/* The theme's own fonts, chosen by the person: the screen loads them
          through ensureFontLoaded, this page through the same URLs. The route
          answers these requests with static instances (see app/api/pdf). */}
      {[theme.hfHref, theme.bfHref]
        .filter((h, i, a) => typeof h === "string" && /^https:\/\/fonts\.googleapis\.com\//.test(h) && a.indexOf(h) === i)
        .map((h) => <link key={h} rel="stylesheet" href={h} />)}
      <div id="cv-print" data-cvf="cv" data-cvf-layout={d.layout || "classic"}
        data-cvf-pret={pret ? "1" : undefined} style={{
        position: "relative", width: "210mm", boxSizing: "border-box",
        background: theme.bg || "#faf8f3", margin: "0 auto", overflowX: "hidden",
      }}>
        <Gabarit cv={d.cv} layout={d.layout || "classic"} t={theme} T={T} locale={d.locale || "fr"} />
      </div>
    </>
  );
}
