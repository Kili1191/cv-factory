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

export default function Imprimer() {
  const [d, setD] = useState(null);
  const [pret, setPret] = useState(false);
  useEffect(() => {
    if (!d) return;
    const el = document.getElementById("cv-print");
    if (el) {
      resserrerLesTitres(el);
      // After the fonts, so the drawn letters are the printed face.
      const finir = () => { dessinerLesMonogrammes(el); setPret(true); };
      const prets = document.fonts && document.fonts.ready;
      if (prets && typeof prets.then === "function") {
        Promise.race([prets, new Promise((r) => setTimeout(r, 4000))]).then(finir, finir);
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
