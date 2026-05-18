"use client";

import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from "react";
import dynamic from "next/dynamic";
import { useNuviReactions } from "./components/useNuviReactions";
import { createPortal } from "react-dom";
import BulletTransformer from "./components/BulletTransformer";
import ScoreDashboard from "./components/ScoreDashboard";

// === LAZY MODALS ===
// Ces modals ne sont rendus que sur action utilisateur (showXxx === true).
// Ils sont chargés à la volée la première fois qu'ils s'ouvrent, ce qui
// allège significativement le First Paint. Les chunks sont mis en cache
// par le navigateur pour les ouvertures suivantes.
const GapRepairModal = dynamic(() => import("./components/GapRepairModal"), { ssr: false });
const InterviewModal = dynamic(() => import("./components/InterviewModal"), { ssr: false });
const VersionsModal = dynamic(() => import("./components/VersionsModal"), { ssr: false });
const TruthModal = dynamic(() => import("./components/TruthModal"), { ssr: false });
const PositioningModal = dynamic(() => import("./components/PositioningModal"), { ssr: false });
const TranslateModal = dynamic(() => import("./components/TranslateModal"), { ssr: false });
const AuditModal = dynamic(() => import("./components/AuditModal"), { ssr: false });
const ApplicationPackModal = dynamic(() => import("./components/ApplicationPackModal"), { ssr: false });
const LinkedInExportModal = dynamic(() => import("./components/LinkedInExportModal"), { ssr: false });
const CVCompareModal = dynamic(() => import("./components/CVCompareModal"), { ssr: false });
const ApplicationsTrackerModal = dynamic(() => import("./components/ApplicationsTrackerModal"), { ssr: false });
const MultiCVStrategyModal = dynamic(() => import("./components/MultiCVStrategyModal"), { ssr: false });
const TutorialOverlay = dynamic(() => import("./components/TutorialOverlay"), { ssr: false });
const NuviTutorial = dynamic(() => import("./components/NuviTutorial"), { ssr: false });
const SettingsPanel = dynamic(() => import("./components/SettingsPanel"), { ssr: false });

// CoachModal est dynamic, chargé seulement à l'ouverture du Coach.
const CoachModal = dynamic(
  () => import("./components/CoachModal").then(m => ({ default: m.default })),
  { ssr: false }
);

// === LAZY UI COMPONENTS (extracted from page.jsx) ===
// Composants conditionnels lourds extraits dans des fichiers séparés.
// Chargés à la demande via React.lazy pour alléger le First Paint.
const OnboardScreen = dynamic(() => import("./components/OnboardScreen"), { ssr: false });
const TargetHub     = dynamic(() => import("./components/TargetHub"), { ssr: false });
const MatchPanel    = dynamic(() => import("./components/MatchPanel"), { ssr: false });
const ScorePanel    = dynamic(() => import("./components/ScorePanel"), { ssr: false });
const NuviCompanion = dynamic(() => import("./components/NuviCompanion"), { ssr: false });
const NuviLogo      = dynamic(() => import("./components/NuviLogo"), { ssr: false });
const NuviIntro     = dynamic(() => import("./components/NuviIntro"), { ssr: false });
const NuviLoadingOverlay = dynamic(() => import("./components/NuviLoadingOverlay"), { ssr: false });
const NuviSidebar = dynamic(() => import("./components/NuviSidebar"), { ssr: false });
const NuviBottomNav = dynamic(() => import("./components/NuviBottomNav"), { ssr: false });
const NuviHome = dynamic(() => import("./components/NuviHome"), { ssr: false });
const NuviBigLogo = dynamic(() => import("./components/NuviBigLogo"), { ssr: false });
const AdjustModal = dynamic(() => import("./components/AdjustModal"), { ssr: false });
const ResetCVModal = dynamic(() => import("./components/ResetCVModal"), { ssr: false });
const AccountSoonModal = dynamic(() => import("./components/AccountSoonModal"), { ssr: false });
const SavedIndicator = dynamic(() => import("./components/SavedIndicator"), { ssr: false });
const ExportPDFModal = dynamic(() => import("./components/ExportPDFModal"), { ssr: false });

import { E, FR, SaveBtn, MK } from "./components/EditHelpers";
import { SheetId, SheetEx, SheetEd, SheetSk } from "./components/EditSheets";
import { CVSidebar, CVAts } from "./components/CVLayouts";
import {
  detectGaps, analyzeYearOnlyStrategy, findGroupingOpportunities,
  countUnparsable, parsePeriod, reformatPeriodToYearOnly, formatDate,
} from "./components/dateUtils";
import { serializeCvForContext } from "../lib/cvSerializer";
import { cachedAiCall, invalidateCacheForTask } from "../lib/aiCache";
import { applyCoachActions } from "../lib/applyCoachActions";
import { cleanCVForExport, getRemovedSummary } from "../lib/cvCleaner";
import { FR_T, EN_T } from "./i18n";
// === V10 REBRAND : Editorial luxury, mobile-first ===
const FONT = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..900,30..100&family=Inter:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap";

// Palette
const Ink       = "#0a0a0a";   // noir profond, surface principale
const InkSoft   = "#1a1a1f";   // noir bleute pour gradient
const Cream     = "#faf8f3";   // [Nuvi] creme align, fond editorial
const CreamSoft = "#f6f2e8";   // [Nuvi] creme soft pour fond app
const Paper     = "#ffffff";   // cards
const Gold      = "#c9a96e";   // gold luxe (RESERVE au CV preview pour elegance)
const GoldDeep  = "#a07840";   // gold profond (RESERVE au CV preview)
const Purple    = "#5b3df5";   // [Nuvi] violet pour Coach, IA, generation
const PurpleSoft= "#ede9fe";
const Magenta   = "#b91c8c";   // [Nuvi] magenta pour gradients CTA primaires
const Coral     = "#d97757";   // [Nuvi] terracotta doux (etait #ff5a36 trop vif)
const CoralSoft = "#fce7dd";   // [Nuvi] terracotta tres clair (cohérent)
const Green     = "#16a34a";
const GreenSoft = "#dcfce7";
const Gray50    = "#fafaf9";
const Gray100   = "#f5f4f0";
const Gray200   = "#e7e5dc";
const Gray400   = "#a8a59a";
const Gray600   = "#57534e";
const Gray900   = "#292524";

// Fonts
const Serif = "'Fraunces', 'Playfair Display', Georgia, serif";
const Sans  = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// Backwards compat (existing code uses these names)
const Dark = Ink;

// Radius / shadow tokens
const RadiusSm   = 10;
const RadiusMd   = 16;
const RadiusLg   = 22;
const RadiusPill = 999;
const ShadowSm   = "0 1px 2px rgba(10,10,10,.04), 0 0 0 0.5px rgba(10,10,10,.06)";
const ShadowMd   = "0 4px 14px rgba(10,10,10,.06), 0 0 0 0.5px rgba(10,10,10,.06)";
const ShadowLg   = "0 14px 40px rgba(10,10,10,.10), 0 0 0 0.5px rgba(10,10,10,.06)";

// Gradients réservés aux moments forts
const GradDark   = "linear-gradient(135deg, #0a0a0a 0%, #1a1a1f 50%, #c9a96e 100%)";
const GradGold   = "linear-gradient(135deg, #c9a96e 0%, #a07840 100%)";  // RESERVE au CV
const GradPurple = "linear-gradient(135deg, #5b3df5 0%, #b91c8c 100%)";  // [Nuvi] CTA primaire
const GradCoral  = "linear-gradient(135deg, #d97757 0%, #c25c3d 100%)";  // [Nuvi] terracotta soft

// Keyframes globales injectees une fois par branche (mobile/desktop/spinner).
// cvfSpin existe deja en v16. cvfFadeIn et cvfSlideUp servent l'IOSSheet v17.
// Dark mode v17 : on cible UNIQUEMENT le panneau gauche (data-cvf="app"),
// le CV a droite (data-cvf="cv") reste TOUJOURS clair pour l'export PDF.
const KEYFRAMES_V17 = `
@keyframes cvfSpin{to{transform:rotate(360deg)}}
@keyframes cvfFadeIn{from{opacity:0}to{opacity:1}}
@keyframes cvfSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes pasteFlashFade{0%{opacity:0}10%{opacity:0.85}100%{opacity:0}}

/* Dark mode : surface app */
body.cvf-dark [data-cvf="app"]{background:#0f0f12 !important;color:#f5f1e8 !important;}
/* Cards et boutons dans l'app passent en sombre */
body.cvf-dark [data-cvf="app"] [data-cvf-card]{background:#1a1a1f !important;border-color:rgba(245,241,232,.08) !important;}
/* Inputs et textareas dans l'app passent en sombre */
body.cvf-dark [data-cvf="app"] input,
body.cvf-dark [data-cvf="app"] textarea,
body.cvf-dark [data-cvf="app"] select{background:#1a1a1f !important;color:#f5f1e8 !important;border-color:rgba(245,241,232,.15) !important;}
body.cvf-dark [data-cvf="app"] input::placeholder,
body.cvf-dark [data-cvf="app"] textarea::placeholder{color:rgba(245,241,232,.35) !important;}
/* Body lui-meme */
body.cvf-dark{background:#0a0a0a;}
/* Le CV (data-cvf="cv") reste explicitement clair, override toute heritage */
body.cvf-dark [data-cvf="cv"]{color-scheme:light;}

/* Auto-save indicator pill */
.cvf-saved-pill{
  position:fixed;top:14px;right:14px;
  padding:6px 12px;border-radius:20px;
  background:#16a34a;color:#fff;
  font-family:Inter,system-ui,sans-serif;
  font-size:11px;font-weight:600;
  letter-spacing:.04em;
  display:flex;align-items:center;gap:5px;
  z-index:9000;
  animation:cvfFadeIn 220ms ease-out;
  box-shadow:0 4px 14px rgba(22,163,74,.3);
  pointer-events:none;
}

/* [Deploy B+] Page-break rules for html2pdf multi-page export.
   Ces classes sont declarees dans CVLayouts.jsx sur chaque experience/education.
   html2pdf respecte 'page-break-inside: avoid' pour ne pas couper au milieu. */
.cv-exp-item, .cv-edu-item, .cv-section-no-break {
  page-break-inside: avoid;
  break-inside: avoid;
}
`;

// REGLE TIRETS - duplicated in every AI prompt for maximum compliance
const NO_DASH =
  "INTERDICTION ABSOLUE des tirets cadratin (em dash, caractere Unicode U+2014) "
  + "et demi-cadratin (en dash, caractere Unicode U+2013). N'utilise JAMAIS ces caracteres, "
  + "meme entre des mots, des dates, ou pour des incises. "
  + "Utilise uniquement: virgule, parentheses, deux-points, point-virgule, "
  + "ou tiret simple - (hyphen-minus U+002D). "
  + "Toute occurrence d'un tiret cadratin ou demi-cadratin sera consideree comme une faute majeure.";

const SK = { CV:"cvf_d", TH:"cvf_t", LY:"cvf_l", KY:"cvf_k", LC:"cvf_c", BK:"cvf_bk", VS:"cvf_vs", CT:"cvf_ct", CO:"cvf_co", AP:"cvf_ap", TU:"cvf_tu", DK:"cvf_dk" };


// === FR_T et EN_T ont été extraits dans ./i18n/{fr,en}.js ===
// Importés en haut du fichier via : import { FR_T, EN_T } from "./i18n";
// Voir ligne 5476 pour leur utilisation : const T = locale==="en" ? EN_T : FR_T;


const THEMES = {
  executive:{
    name:"Executive", 
    pr:"#1a1a2e", ac:"#c9a96e", bg:"#f8f6f1",
    sb:"#1a1a2e", st:"#f8f6f1",
    hf:"'Playfair Display',serif", bf:"'Lato',sans-serif"
  },
  modern:{
    name:"Modern", 
    pr:"#0f3460", ac:"#e94560", bg:"#fff",
    sb:"#0f3460", st:"#fff",
    hf:"'Montserrat',sans-serif", bf:"'Open Sans',sans-serif"
  },
  creative:{
    name:"Creative", 
    pr:"#1e1e1e", ac:"#ff6b35", bg:"#fafafa",
    sb:"#1e1e1e", st:"#fafafa",
    hf:"'Space Grotesk',sans-serif", bf:"'Lato',sans-serif"
  },
  minimal:{
    name:"Minimal", 
    pr:"#222", ac:"#888", bg:"#fff",
    sb:"#f0f0f0", st:"#222",
    hf:"Georgia,serif", bf:"'Lato',sans-serif"
  },
  luxury:{
    name:"Luxury", 
    pr:"#2c1810", ac:"#a67c52", bg:"#fdf8f3",
    sb:"#2c1810", st:"#fdf8f3",
    hf:"Georgia,serif", bf:"'Lato',sans-serif"
  },
};

const LAYOUTS = ["sidebar","classic","ats"];

// ============================================================
// v17 Custom : librairies cur\u00e9es (couleurs + polices) + merge theme
// ============================================================

// Presets curees pour la couleur d'accent (le dore par defaut).
const ACCENT_PRESETS = [
  { id:"gold",     name:"Or classique",   color:"#c9a96e" },
  { id:"bordeaux", name:"Bordeaux",       color:"#7a1f2b" },
  { id:"forest",   name:"Vert foret",     color:"#2d5a3d" },
  { id:"navy",     name:"Bleu marine",    color:"#1e3a5f" },
  { id:"plum",     name:"Aubergine",      color:"#4a1d3f" },
  { id:"charcoal", name:"Charbon",        color:"#3a3a3a" },
  { id:"rust",     name:"Rouille",        color:"#a64b2a" },
  { id:"teal",     name:"Bleu petrole",   color:"#1f4d4a" },
];

// Presets pour le bandeau lateral (sidebar du CV, fond noir par defaut).
const SIDEBAR_PRESETS = [
  { id:"ink",      name:"Noir profond",   color:"#0a0a0a" },
  { id:"midnight", name:"Bleu nuit",      color:"#0f1d3a" },
  { id:"charcoal", name:"Charbon",        color:"#26262b" },
  { id:"forest",   name:"Vert sapin",     color:"#1a3329" },
  { id:"darkwine", name:"Bordeaux fonce", color:"#3a0e15" },
  { id:"cream",    name:"Creme inverse",  color:"#f5f1e8" },
];

// Presets pour le fond du CV (paper).
const PAPER_PRESETS = [
  { id:"cream",    name:"Creme classique", color:"#f8f6f1" },
  { id:"white",    name:"Blanc pur",       color:"#ffffff" },
  { id:"cream2",   name:"Creme chaud",     color:"#faf3e7" },
  { id:"pearl",    name:"Gris perle",      color:"#f0eee9" },
  { id:"ivory",    name:"Ivoire",          color:"#fdfbf3" },
];

// Bibliotheque cur\u00e9e de polices titres (display / heading).
// Chaque entree : { name, family (CSS), googleHref (sans https:), vibe, target }
const HEADER_FONTS = [
  { id:"playfair",  name:"Playfair Display",  family:"'Playfair Display', serif",  googleHref:"https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap", vibe:"Premium classique", target:"Banque, conseil, juridique" },
  { id:"fraunces",  name:"Fraunces",          family:"'Fraunces', serif",          googleHref:"https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..700&display=swap", vibe:"Editorial moderne", target:"Strategie, branding" },
  { id:"cormorant", name:"Cormorant Garamond",family:"'Cormorant Garamond', serif",googleHref:"https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap", vibe:"Sobre intemporel", target:"Academique, art, recherche" },
  { id:"dmserif",   name:"DM Serif Display",  family:"'DM Serif Display', serif",  googleHref:"https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap", vibe:"Premium contemporain", target:"Marketing premium, luxe" },
  { id:"space",     name:"Space Grotesk",     family:"'Space Grotesk', sans-serif",googleHref:"https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap", vibe:"Tech minimal", target:"Tech, produit, design" },
  { id:"montserrat",name:"Montserrat",        family:"'Montserrat', sans-serif",   googleHref:"https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap", vibe:"Geometrique", target:"Marketing, communication" },
  { id:"inter",     name:"Inter",             family:"'Inter', sans-serif",        googleHref:"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap", vibe:"Sans-serif fort", target:"Corporate moderne, ATS" },
  { id:"lora",      name:"Lora",              family:"'Lora', serif",              googleHref:"https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap", vibe:"Humain serif", target:"RH, coaching, social" },
];

// Bibliotheque curee de polices corps (body) - toutes ATS-friendly.
const BODY_FONTS = [
  { id:"inter",     name:"Inter",          family:"'Inter', sans-serif",       googleHref:"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap", vibe:"Tech moderne",       ats:"Excellent" },
  { id:"lato",      name:"Lato",           family:"'Lato', sans-serif",        googleHref:"https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap", vibe:"Pro chaleureux",      ats:"Excellent" },
  { id:"sourcesans",name:"Source Sans 3",  family:"'Source Sans 3', sans-serif",googleHref:"https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&display=swap", vibe:"Corporate sobre",     ats:"Excellent" },
  { id:"dmsans",    name:"DM Sans",        family:"'DM Sans', sans-serif",     googleHref:"https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap", vibe:"Minimaliste",         ats:"Excellent" },
  { id:"plex",      name:"IBM Plex Sans",  family:"'IBM Plex Sans', sans-serif",googleHref:"https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap", vibe:"Tech premium",        ats:"Excellent" },
  { id:"opensans",  name:"Open Sans",      family:"'Open Sans', sans-serif",   googleHref:"https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap", vibe:"Universel",           ats:"Excellent" },
  { id:"nunito",    name:"Nunito Sans",    family:"'Nunito Sans', sans-serif", googleHref:"https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;500;600;700&display=swap", vibe:"Doux moderne",        ats:"Excellent" },
  { id:"work",      name:"Work Sans",      family:"'Work Sans', sans-serif",   googleHref:"https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap", vibe:"Geometrique leger",   ats:"Excellent" },
];

// Empile theme + custom global + custom version. Chaque palier override le precedent.
// Forme du custom : { ac, sb, bg, hf, bf, hfHref, bfHref } - tous optionnels.
function mergeTheme(theme, globalCustom, versionCustom) {
  const eff = { ...theme };
  const apply = (cu) => {
    if (!cu) return;
    if (cu.ac) eff.ac = cu.ac;
    if (cu.sb) eff.sb = cu.sb;
    if (cu.bg) eff.bg = cu.bg;
    if (cu.hf) eff.hf = cu.hf;
    if (cu.bf) eff.bf = cu.bf;
    // hfHref / bfHref ne sont pas appliques dans le theme effectif, ils servent
    // juste a savoir quoi charger via ensureFontLoaded.
  };
  apply(globalCustom);
  apply(versionCustom);
  return eff;
}

// Charge dynamiquement une Google Font en injectant un <link> dans <head>.
// Idempotent : ne re-injecte pas si l'URL est deja presente.
// `href` doit etre une URL fonts.googleapis.com complete.
function ensureFontLoaded(href) {
  if (typeof document === "undefined") return;
  if (!href || typeof href !== "string") return;
  if (!/^https:\/\/fonts\.googleapis\.com\//.test(href)) return;
  // Cherche un link existant pointant la meme href.
  const existing = document.querySelector('link[href="' + href + '"]');
  if (existing) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

// Charge toutes les fonts referencees par un custom global + version.
// Appele dans un useEffect sur changement du custom.
function ensureCustomFontsLoaded(globalCustom, versionCustom) {
  [globalCustom, versionCustom].forEach(cu => {
    if (!cu) return;
    if (cu.hfHref) ensureFontLoaded(cu.hfHref);
    if (cu.bfHref) ensureFontLoaded(cu.bfHref);
  });
}

// Retourne family si trouvee dans la lib, sinon { family, googleHref } extrait
// d'une URL Google Fonts brute. Utilise pour le champ libre.
// Exemple : "https://fonts.googleapis.com/css2?family=Cormorant+Infant:wght@400;700&display=swap"
//   -> { family: "'Cormorant Infant', serif", googleHref: same URL }
function parseGoogleFontUrl(url) {
  if (!url || typeof url !== "string") return null;
  const m = url.match(/family=([^:&]+)/);
  if (!m) return null;
  const familyRaw = decodeURIComponent(m[1]).replace(/\+/g, " ");
  if (!familyRaw) return null;
  // On ajoute serif fallback ; le genre exact (serif/sans) n'est pas garanti.
  return {
    family: "'" + familyRaw + "', serif",
    name: familyRaw,
    googleHref: url,
  };
}

// === Helper escapeHtml ===
// Utilise pour echapper le texte utilisateur dans les chaines HTML genere
// (notamment dans le PDF export qui injecte du HTML via innerHTML).
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// === Helper : charge html2pdf depuis CDN si pas deja charge ===
// Resout en window.html2pdf pret a l'emploi, ou rejette si echec reseau.
// Utilise par tous les PDF exports (CV, pack entretien, pense-bete).
function ensureHtml2pdfLoaded() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if (window.html2pdf) return resolve(window.html2pdf);
    const existing = document.querySelector('script[data-cvf-html2pdf]');
    if (existing) {
      // Deja en train de se charger : attendre
      const check = setInterval(() => {
        if (window.html2pdf) {
          clearInterval(check);
          resolve(window.html2pdf);
        }
      }, 100);
      setTimeout(() => clearInterval(check), 10000);
      return;
    }
    const s = document.createElement("script");
    s.setAttribute("data-cvf-html2pdf", "1");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    s.onload = () => resolve(window.html2pdf);
    s.onerror = () => reject(new Error("Erreur chargement PDF"));
    document.head.appendChild(s);
  });
}

// === Helpers WCAG (luminance + ratio de contraste) ===
function _hexToRgb(hex) {
  if (!hex || typeof hex !== "string") return null;
  let h = hex.replace("#","").trim();
  if (h.length === 3) h = h.split("").map(c => c+c).join("");
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0,2), 16);
  const g = parseInt(h.slice(2,4), 16);
  const b = parseInt(h.slice(4,6), 16);
  if ([r,g,b].some(v => Number.isNaN(v))) return null;
  return [r,g,b];
}
function _relLum(rgb) {
  const [r,g,b] = rgb.map(v => {
    const s = v/255;
    return s <= 0.03928 ? s/12.92 : Math.pow((s+0.055)/1.055, 2.4);
  });
  return 0.2126*r + 0.7152*g + 0.0722*b;
}
function contrastRatio(hex1, hex2) {
  const a = _hexToRgb(hex1), b = _hexToRgb(hex2);
  if (!a || !b) return 0;
  const la = _relLum(a), lb = _relLum(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}
// Retourne "AAA", "AA", ou "FAIL" pour du texte normal (>=18pt = large, sinon).
function wcagLevel(hex1, hex2) {
  const r = contrastRatio(hex1, hex2);
  if (r >= 7) return "AAA";
  if (r >= 4.5) return "AA";
  return "FAIL";
}

const EMPTY = {
  name:"", title:"", email:"", phone:"",
  location:"", linkedin:"", summary:"",
  experience:[{id:1,title:"",company:"",period:"",location:"",bullets:["",""]}],
  education:[{id:1,degree:"",school:"",period:""}],
  skills:["","","","","","","",""],
  languages:[{lang:"",level:""},{lang:"",level:""}],
  certifications:[""],
  labels: {},
  // [Deploy B] Photo CV : 3 modes - "upload" | "initials" | "none"
  // src optionnel (base64 thumbnail) si mode === "upload"
  photo: { mode: "initials" },
};

// === Labels par défaut pour les sections du CV (éditables par l'utilisateur) ===
const DEFAULT_LABELS_FR = {
  profile: "Profil",
  experience: "Expérience",
  education: "Formation",
  skills: "Compétences",
  languages: "Langues",
  certifications: "Certifications",
  contact: "Contact",
  links: "Liens",
};
const DEFAULT_LABELS_EN = {
  profile: "Profile",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  languages: "Languages",
  certifications: "Certifications",
  contact: "Contact",
  links: "Links",
};
// Helper : retourne le label custom de l'utilisateur OU le défaut selon la langue
function getLabel(cv, key, locale) {
  const custom = cv && cv.labels && cv.labels[key];
  if (custom && custom.trim()) return custom;
  const defaults = locale === "en" ? DEFAULT_LABELS_EN : DEFAULT_LABELS_FR;
  return defaults[key] || key;
}
// === EditableTitle : titre de section éditable au double-clic ===
function EditableTitle({ cv, setCVFn, labelKey, locale, style, defaultUppercase }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  const currentLabel = getLabel(cv, labelKey, locale);

  // Quand on entre en mode edit : pre-remplit avec le label courant et focus
  useEffect(() => {
    if (editing) {
      setValue(currentLabel);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [editing]);

  const save = () => {
    const trimmed = value.trim();
    setCVFn(prev => {
      const newLabels = { ...(prev.labels || {}) };
      if (trimmed && trimmed !== getLabel({}, labelKey, locale)) {
        // Sauvegarde uniquement si different du defaut
        newLabels[labelKey] = trimmed;
      } else {
        // Vide ou egal au defaut : on supprime le custom (revient au defaut)
        delete newLabels[labelKey];
      }
      return { ...prev, labels: newLabels };
    });
    setEditing(false);
  };

  const cancel = () => {
    setEditing(false);
    setValue("");
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") cancel();
        }}
        style={{
          ...style,
          background: "rgba(91, 61, 245, 0.08)",
          border: "1.5px solid #5b3df5",
          borderRadius: 4,
          padding: "2px 6px",
          outline: "none",
          fontFamily: "inherit",
          color: "inherit",
          textTransform: defaultUppercase ? "uppercase" : "none",
          minWidth: 80,
        }}
      />
    );
  }

  return (
    <span
      onDoubleClick={() => setEditing(true)}
      title="Double-clic pour modifier"
      style={{
        ...style,
        cursor: "text",
        userSelect: "none",
      }}
    >
      {defaultUppercase ? currentLabel.toUpperCase() : currentLabel}
    </span>
  );
}

const TEMPLATES = [
  {
    id:"finance", label:"Finance CFO", 
    theme:"executive", layout:"sidebar",
    cv:{
      name:"Sophie Marchand",
      title:"CFO - Directrice Financiere",
      email:"s.marchand@email.com",
      phone:"+33 6 11 22 33 44",
      location:"Paris, France",
      linkedin:"linkedin.com/in/sophiemarchand",
      summary:"CFO avec 15 ans en finance d'entreprise et M&A. " +
        "3 LBO reussis (250M EUR cumules). Expert restructuring et IFRS.",
      experience:[
        {id:1,title:"CFO",company:"Groupe Meridian",
          period:"2019-Present",location:"Paris",
          bullets:["P&L groupe 420M EUR - EBITDA +8pts en 3 ans",
            "Gestion dette LBO 180M EUR",
            "Deploiement ERP SAP S/4HANA 8 filiales"]},
        {id:2,title:"Directrice Controle de Gestion",
          company:"Vivendi SE",period:"2014-2019",location:"Paris",
          bullets:["Budget groupe 2.4 Mds EUR - 12 BUs",
            "2 acquisitions due diligence 60M + 140M EUR"]},
        {id:3,title:"Auditrice Senior",
          company:"PwC France",period:"2009-2014",location:"Paris",
          bullets:["Audit CAC40 - chef de mission equipe 8",
            "Certification IFRS - missions UK et Belgique"]},
      ],
      education:[
        {id:1,degree:"Master CCA",school:"Paris-Dauphine",period:"2007-2009"},
        {id:2,degree:"Licence Economie",school:"Sciences Po",period:"2004-2007"},
      ],
      skills:["Finance d'entreprise","M&A/LBO","IFRS","SAP S/4HANA",
        "Cash management","Budget Forecast","Restructuring","Reporting COMEX"],
      languages:[{lang:"Francais",level:"Natif"},{lang:"Anglais",level:"C1"}],
      certifications:["CPA - Certified Public Accountant","Diplome DEC"],
    }
  },

  {
    id:"sales", label:"Trade Finance", 
    theme:"creative", layout:"sidebar",
    cv:{
      name:"Kilian Maisonnette",
      title:"Senior Trade Finance Consultant",
      email:"k.maisonnette@email.com",
      phone:"+33 6 78 90 12 34",
      location:"Lyon, France",
      linkedin:"linkedin.com/in/kilianm",
      summary:"Consultant Senior Trade Finance 12 ans dont 7 ans chez Stenn " +
        "(Fintech UK, 600M+ debt funding). Expert affacturage et BFR.",
      experience:[
        {id:1,title:"Responsable Commercial B2B",
          company:"Primagaz",period:"2025-Present",location:"Lyon",
          bullets:["Solutions energetiques B2B PME Rhone-Alpes",
            "Developpement portefeuille clients multi-sectoriel"]},
        {id:2,title:"Senior Trade Finance Consultant",
          company:"Stenn International",period:"2017-2024",location:"Londres",
          bullets:["Conseil PME exportatrices financement BFR",
            "Structuration trade finance supply chain finance",
            "Portefeuille PME multi-secteurs EU MENA Asie"]},
        {id:3,title:"Senior Real Estate Consultant",
          company:"ALH Properties",period:"2024-2025",location:"Dubai",
          bullets:["Vente immobiliere HNW internationale",
            "Tickets 1M USD+ cycles de vente longs"]},
      ],
      education:[
        {id:1,degree:"Leadership Development Niv.7",
          school:"OTHM UK",period:"2026"},
        {id:2,degree:"Formation Bancaire",
          school:"ING Direct",period:"2013"},
      ],
      skills:["Trade Finance","Affacturage BFR","Negociation B2B",
        "Analyse credit","Due diligence","Business Dev","Management","Closing"],
      languages:[
        {lang:"Francais",level:"Natif"},
        {lang:"Anglais",level:"Courant 10 ans UK"},
      ],
      certifications:["Titre Professionnel Niv.4 AFPA (RNCP)"],
    }
  },
];

function lsG(k, fb=null) {
  if (typeof window === "undefined") return fb;
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; }
  catch { return fb; }
}
function lsS(k, v) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
}

const B = (x={}) => ({ border:"none", cursor:"pointer", fontFamily:"inherit", ...x });
const IN = (x={}) => ({
  width:"100%", padding:"10px 12px", borderRadius:8,
  border:"1px solid #ddd", fontSize:13, fontFamily:"inherit",
  boxSizing:"border-box", outline:"none", background:"#fff", ...x
});
const LBL = {
  display:"block", fontSize:10, fontWeight:700, color:"#999",
  letterSpacing:1.2, textTransform:"uppercase", marginBottom:5
};
const SH = (x={}) => ({
  fontSize:10, fontWeight:700, color:"#999", letterSpacing:1.5,
  textTransform:"uppercase", margin:"16px 0 10px",
  paddingBottom:5, borderBottom:"1px solid #eee", ...x
});

function san(t) {
  if (typeof t !== "string") return t;
  return t
    .split("\u2014").join("-")  // em dash
    .split("\u2013").join("-")  // en dash
    .split("\u2015").join("-")  // horizontal bar
    .split("\u2012").join("-")  // figure dash
    .split("\u2010").join("-")  // hyphen
    .split("\u2011").join("-"); // non-breaking hyphen
}

// Recursively sanitize all string values in an object / array tree.
// Used to clean CV / Pack / Audit results returned from the AI.
function sanDeep(v) {
  if (typeof v === "string") return san(v);
  if (Array.isArray(v)) return v.map(sanDeep);
  if (v && typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v)) out[k] = sanDeep(v[k]);
    return out;
  }
  return v;
}

async function aiCall(prompt, options = {}) {
  // Options: { cv, max_tokens, temperature, task_name, messages }
  const { cv, max_tokens, temperature, task_name = "unknown", messages } = options;
  
  // Sérialise le CV pour le system block caché (gain ~30% par cache_control Anthropic)
  let cv_context = null;
  if (cv) {
    try {
      cv_context = serializeCvForContext(cv);
    } catch (e) {
      cv_context = null;
    }
  }
  
  // Timeout cote client a 60s (legerement plus que le serveur a 55s)
  // pour qu'on lise toujours la reponse du serveur plutot que de couper avant.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  let r;
  try {
    r = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        prompt, 
        messages,
        cv_context, 
        max_tokens, 
        temperature,
        task_name,
      }),
      signal: ctrl.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err && err.name === "AbortError") {
      throw new Error("Timeout cote client (60s). L'IA met trop longtemps a repondre.");
    }
    throw new Error("Erreur reseau: " + (err.message || String(err)));
  }
  clearTimeout(timer);
  // Si le serveur renvoie une erreur HTTP (504, 500, 401, 429...) on le voit ici
  let d;
  try {
    d = await r.json();
  } catch {
    throw new Error("Reponse serveur invalide (HTTP " + r.status + "). Probablement un timeout Vercel.");
  }
  
  // Logging observabilité (gain via détection des doublons et erreurs)
  if (d && d._cvf_meta && typeof window !== "undefined") {
    try {
      const log = JSON.parse(window.localStorage.getItem("cvf_api_log") || "[]");
      log.push({ ts: Date.now(), ...d._cvf_meta });
      window.localStorage.setItem("cvf_api_log", JSON.stringify(log.slice(-500)));
    } catch (e) {}
  }
  
  if (!r.ok || (d && d.error)) {
    const m = (d && d.error && d.error.message) || ("Erreur HTTP " + r.status);
    throw new Error(m);
  }
  return san((d.content||[]).map(b=>b.text||"").join(""));
}

function parseJSON(txt) {
  if (typeof txt !== "string" || !txt.trim()) {
    throw new Error("Empty response");
  }
  // 1. Strip markdown code fences
  let clean = txt.split("```json").join("").split("```").join("").trim();

  // 2. Try direct parse first
  try {
    return sanDeep(JSON.parse(clean));
  } catch (e1) {
    // 3. Extract the largest balanced JSON object/array from the text
    //    This handles cases where Claude adds prose before/after the JSON.
    const extracted = extractBalancedJson(clean);
    if (extracted) {
      try {
        return sanDeep(JSON.parse(extracted));
      } catch (e2) {
        // Fall through to throw original error
      }
    }
    throw e1;
  }
}

// Find the largest balanced { ... } or [ ... ] block in the text.
// Useful when Claude adds prose before or after the JSON.
function extractBalancedJson(text) {
  let bestStart = -1;
  let bestEnd = -1;
  let bestLen = 0;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c !== "{" && c !== "[") continue;
    const opener = c;
    const closer = c === "{" ? "}" : "]";
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let j = i; j < text.length; j++) {
      const cc = text[j];
      if (escape) { escape = false; continue; }
      if (cc === "\\") { escape = true; continue; }
      if (cc === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (cc === opener) depth++;
      else if (cc === closer) {
        depth--;
        if (depth === 0) {
          const len = j - i + 1;
          if (len > bestLen) {
            bestLen = len;
            bestStart = i;
            bestEnd = j;
          }
          break;
        }
      }
    }
  }

  if (bestStart >= 0 && bestEnd > bestStart) {
    return text.substring(bestStart, bestEnd + 1);
  }
  return null;
}

function normCV(raw, base=EMPTY) {
  const ns = v => typeof v==="string" ? v : String(v||"");
  return {
    ...base, ...raw,
    skills:(Array.isArray(raw.skills)?raw.skills:[]).map(ns),
    languages:(Array.isArray(raw.languages)?raw.languages:[]).map(
      l=>({lang:ns(l.lang||""), level:ns(l.level||"")})
    ),
    certifications:(Array.isArray(raw.certifications)?raw.certifications:[]).map(ns),
    experience:(Array.isArray(raw.experience)?raw.experience:[]).map(
      (e,i)=>({...e, id:i+1, bullets:(Array.isArray(e.bullets)?e.bullets:[]).map(ns)})
    ),
    education:(Array.isArray(raw.education)?raw.education:[]).map(
      (e,i)=>({...e, id:i+1})
    ),
  };
}


function Notif({ msg }) {
  return (
    <div style={{
      position:"fixed", top:16, left:"50%",
      transform:"translateX(-50%)",
      background:Dark, color:Gold,
      padding:"10px 22px", borderRadius:20, zIndex:9999,
      fontWeight:700, fontSize:13,
      boxShadow:"0 4px 20px rgba(0,0,0,.3)",
      whiteSpace:"nowrap", pointerEvents:"none",
    }}>
      {msg}
    </div>
  );
}

function Shimmer() {
  return (
    <div style={{
      position:"absolute", inset:0,
      background:"rgba(255,255,255,.85)", zIndex:50,
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", gap:10,
    }}>
      <div style={{fontSize:22}}>*</div>
      <div style={{fontSize:12, fontWeight:700, color:Dark}}>
        Redaction en cours...
      </div>
    </div>
  );
}

// IOSSheet v17 : sheet bottom iOS-native avec handle, backdrop blur, slide-up.
// Conserve la signature de l'ancien `Sheet({title,onClose,children})`
// pour que tous les Sheet*/Modals existants l'heritent automatiquement.
// Optionnel : `eyebrow` pour le pre-titre style editorial gold-deep.
function Sheet({ title, eyebrow, onClose, children }) {
  return (
    <div data-cvf="app" style={{
      position:"fixed", inset:0, zIndex:2000,
      display:"flex", flexDirection:"column", justifyContent:"flex-end",
      fontFamily:Sans,
    }}>
      <div style={{
        position:"absolute", inset:0,
        background:"rgba(10,10,10,.55)",
        backdropFilter:"blur(8px)",
        WebkitBackdropFilter:"blur(8px)",
        animation:"cvfFadeIn 200ms ease-out",
      }} onClick={onClose}/>
      <div style={{
        position:"relative", background:"var(--nuvi-cream-soft)",
        borderRadius:"32px 32px 0 0",
        maxHeight:"92vh", display:"flex", flexDirection:"column",
        boxShadow:"0 -20px 60px rgba(0,0,0,.2)",
        animation:"cvfSlideUp 280ms cubic-bezier(.32,.72,0,1)",
      }}>
        {/* Handle iOS */}
        <div style={{
          width:40, height:4, background:Gray200,
          borderRadius:RadiusPill,
          margin:"10px auto 6px",
          flexShrink:0,
        }}/>
        {/* Header editorial */}
        <div style={{
          padding:"6px 24px 14px",
          borderBottom:"0.5px solid "+Gray200,
          flexShrink:0,
          display:"flex", alignItems:"flex-start",
          justifyContent:"space-between", gap:12,
        }}>
          <div style={{flex:1, minWidth:0}}>
            {eyebrow && (
              <div style={{
                fontSize:11, fontWeight:600,
                letterSpacing:"0.12em", textTransform:"uppercase",
                color:Coral, marginBottom:4,
              }}>{eyebrow}</div>
            )}
            <div style={{
              fontFamily:Serif, fontWeight:400, fontSize:22,
              letterSpacing:"-0.02em", color:"var(--nuvi-ink)", lineHeight:1.15,
            }}>{title}</div>
          </div>
          <button onClick={onClose} aria-label="close" style={{
            ...B({
              background:Paper, borderRadius:RadiusPill,
              width:32, height:32, fontSize:16, color:Gray600,
              border:"0.5px solid "+Gray200,
              display:"flex", alignItems:"center", justifyContent:"center",
              flexShrink:0,
            })
          }}>x</button>
        </div>
        <div style={{
          overflowY:"auto",
          padding:"18px 24px 48px",
          flex:1,
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}




function AIPanel({ onGen, loading, apiKey, T, cvIsEmpty, onSwitchToAdjust }) {
  const [job, setJob]   = useState("");
  const [sec, setSec]   = useState(0);
  const [yrs, setYrs]   = useState("");
  const [tone, setTone] = useState("p");
  const [lang, setLang] = useState("fr");
  const [parc, setParc] = useState("");
  const [offre, setOffre] = useState("");

  // v17 helpers : inputs paper-on-cream + eyebrow editorial
  const inV17 = (extra={}) => ({
    width:"100%", padding:"12px 14px", borderRadius:RadiusSm,
    border:"0.5px solid "+Gray200, background:Paper,
    fontSize:13, color:Ink, fontFamily:Sans,
    boxSizing:"border-box", outline:"none",
    transition:"border-color 200ms ease-out",
    ...extra,
  });
  const eyV17 = {
    fontSize:11, fontWeight:600,
    letterSpacing:"0.1em", textTransform:"uppercase",
    color:Coral, marginBottom:8, marginTop:14,
    display:"block",
  };

  // Pill toggle (tone, lang)
  const Pill = ({v, cur, set, l}) => (
    <button onClick={()=>set(v)} style={{
      ...B({
        flex:1, padding:"10px 8px", borderRadius:RadiusPill,
        border:"0.5px solid "+(cur===v ? Ink : Gray200),
        background:cur===v ? Ink : Paper,
        color:cur===v ? Cream : Ink,
        fontWeight:cur===v ? 600 : 500, fontSize:12,
        fontFamily:Sans,
        transition:"all 180ms ease-out",
      })
    }}>{l}</button>
  );

  const go = () => {
    if (!cvIsEmpty) {
      const ok = window.confirm(
        T.ai_overwrite_warn || "Tu as deja un CV. Generer va l'ecraser. Continuer ?"
      );
      if (!ok) return;
    }
    const s = T.ai_secs[sec];
    const tStr = tone==="p"
      ? "elegant percutant chiffre"
      : tone==="c" ? "creatif differenciants" : "sobre factuel";
    let p = "Expert CV. Poste:"+job+" Secteur:"+s+" Exp:"+yrs+" Ton:"+tStr
      +" Langue:"+(lang==="fr"?"Francais":"Anglais");
    if(parc.trim())p+=" Parcours:"+parc;
    if(offre.trim())p+=" Offre:"+offre;
    p+=" JSON uniquement sans markdown:"
      +'{"name":"","title":"","email":"","phone":"","location":"",'
      +'"linkedin":"","summary":"","experience":[{"id":1,"title":"","company":"",'
      +'"period":"","location":"","bullets":["","",""]}],'
      +'"education":[{"id":1,"degree":"","school":"","period":""}],'
      +'"skills":["","","","","","","",""],'
      +'"languages":[{"lang":"","level":""}],"certifications":[""]}'
      +" 3 exps chiffrees 2 formations 8 competences. " + NO_DASH;
    onGen(p);
  };

  return (
    <div style={{fontFamily:Sans}}>
      {!apiKey && (
        <div style={{
          background:CoralSoft,
          border:"0.5px solid "+Coral,
          borderRadius:RadiusSm,
          padding:"10px 14px", marginBottom:14,
          fontSize:12, color:Ink, lineHeight:1.5,
        }}>
          {T.ai_nk}
        </div>
      )}
      {!cvIsEmpty && (
        <div style={{
          background:Paper,
          borderRadius:RadiusMd,
          padding:"16px 18px", marginBottom:18,
          border:"0.5px solid "+Gray200,
          boxShadow:ShadowSm,
        }}>
          <div style={{
            fontSize:11, fontWeight:600,
            letterSpacing:"0.12em", textTransform:"uppercase",
            color:Coral, marginBottom:6,
          }}>{T.ai_existing_title || "Tu as deja un CV"}</div>
          <div style={{
            fontFamily:Serif, fontWeight:400,
            fontSize:18, lineHeight:1.25,
            letterSpacing:"-0.01em",
            color:Ink, marginBottom:10,
          }}>{T.ai_existing_msg || "Generer va ecraser ton CV actuel. Tu veux plutot l'ajuster ?"}</div>
          <button onClick={onSwitchToAdjust} style={{
            ...B({
              padding:"10px 18px", borderRadius:RadiusPill,
              background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
              color:"#fff",
              border:"none",
              fontSize:12, fontWeight:600,
              fontFamily:Sans,
              display:"inline-flex", alignItems:"center", gap:6,
            })
          }}>
            {T.ai_existing_btn || "Aller a Ajuster"}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </button>
        </div>
      )}

      <label style={{...eyV17, marginTop:0}}>{T.ai_job}</label>
      <input value={job} onChange={e=>setJob(e.target.value)}
        placeholder={T.ai_jph} style={inV17()}/>

      <label style={eyV17}>{T.ai_sec}</label>
      <select value={sec} onChange={e=>setSec(Number(e.target.value))}
        style={inV17()}>
        {T.ai_secs.map((s,i) => <option key={i} value={i}>{s}</option>)}
      </select>

      <label style={eyV17}>{T.ai_yrs}</label>
      <input value={yrs} onChange={e=>setYrs(e.target.value)}
        placeholder="12" style={inV17()}/>

      <label style={eyV17}>{T.ai_tone}</label>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6}}>
        <Pill v="p" cur={tone} set={setTone} l={T.ai_tp}/>
        <Pill v="c" cur={tone} set={setTone} l={T.ai_tc}/>
        <Pill v="k" cur={tone} set={setTone} l={T.ai_tk}/>
      </div>

      <label style={eyV17}>{T.ai_lang}</label>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:6}}>
        <Pill v="fr" cur={lang} set={setLang} l="Francais"/>
        <Pill v="en" cur={lang} set={setLang} l="English"/>
      </div>

      <label style={eyV17}>{T.ai_parc}</label>
      <textarea value={parc} onChange={e=>setParc(e.target.value)}
        rows={3} style={inV17({resize:"vertical", lineHeight:1.5})}/>

      <label style={eyV17}>{T.ai_off}</label>
      <textarea value={offre} onChange={e=>setOffre(e.target.value)}
        rows={3} style={inV17({resize:"vertical", lineHeight:1.5})}/>

      <button onClick={go} disabled={loading||!apiKey} style={{
        ...B({
          width:"100%", padding:"15px 22px", borderRadius:RadiusPill,
          background:loading||!apiKey ? Gray200 : `linear-gradient(135deg, ${Purple}, ${Magenta})`,
          color:loading||!apiKey ? Gray600 : "#fff",
          border:"none",
          fontWeight:600, fontSize:14, fontFamily:Sans,
          marginTop:22,
          display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
          transition:"all 200ms ease-out",
        })
      }}>
        {loading ? T.ai_gen : T.ai_btn}
        {!loading && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        )}
      </button>
    </div>
  );
}

function AdjustPanel({ cv, setCVFn, notify, apiKey, T, prefillInst, onPrefillConsumed }) {
  const [inst, setInst]     = useState("");
  const [load, setLoad]     = useState(false);
  const [hist, setHist]     = useState([]);
  const [raw, setRaw]       = useState("");
  const [impOpen, setImpOpen] = useState(false);
  const [imping, setImping] = useState(false);

  useEffect(() => {
    if (prefillInst && prefillInst.trim()) {
      setInst(prefillInst);
      if (onPrefillConsumed) onPrefillConsumed();
    }
  }, [prefillInst, onPrefillConsumed]);

  const adjust = async () => {
    if (!inst.trim()) { notify(T.ni); return; }
    if (!apiKey) { notify(T.nk); return; }
    setLoad(true);
    setHist(h => [...h.slice(-4), cv]);
    const p = "Expert CV. JSON recu + instruction."
      + " Reponds UNIQUEMENT JSON valide strict sans markdown.\n"
      + "REGLES: preserve structure JSON exacte, IDs,"
      + " jamais inventer experiences/diplomes,"
      + " garde langue origine sauf traduction demandee."
      + " " + NO_DASH + "\n\n"
      + "CV:\n" + JSON.stringify(cv, null, 2)
      + "\n\nINSTRUCTION: \"" + inst + "\""
      + "\n\nRetourne UNIQUEMENT le JSON modifie.";
    try {
      const txt = await aiCall(p);
      const nCV = parseJSON(txt);
      setCVFn(() => nCV);
      setInst("");
      notify(T.okadj);
    } catch { notify(T.ea); }
    setLoad(false);
  };

  const undoL = () => {
    if (!hist.length) { notify(T.nu); return; }
    setCVFn(() => hist[hist.length-1]);
    setHist(h => h.slice(0,-1));
    notify(T.au);
  };

  const importRaw = async () => {
    if (!raw.trim()) { notify(T.np2); return; }
    if (!apiKey) { notify(T.nk); return; }
    setImping(true);
    const p = "Expert parsing CV. JSON valide strict sans markdown.\n"
      + 'STRUCTURE:{"name":"","title":"","email":"","phone":"",'
      + '"location":"","linkedin":"","summary":"",'
      + '"experience":[{"id":1,"title":"","company":"","period":"",'
      + '"location":"","bullets":["",""]}],'
      + '"education":[{"id":1,"degree":"","school":"","period":""}],'
      + '"skills":[""],"languages":[{"lang":"","level":""}],'
      + '"certifications":[""]}\n'
      + "REGLES:toutes experiences, IDs depuis 1, vide si absent."
      + " " + NO_DASH + " UNIQUEMENT JSON.\nCV:\n" + raw;
    try {
      const txt = await aiCall(p);
      const parsed = parseJSON(txt);
      setCVFn(() => normCV(parsed));
      setRaw("");
      setImpOpen(false);
      notify(T.okimp);
    } catch { notify(T.ep); }
    setImping(false);
  };

  return (
    <div>
      {!apiKey && (
        <div style={{
          background:"#fff3cd", border:"1px solid #ffc107",
          borderRadius:9, padding:"9px 13px", marginBottom:12,
          fontSize:12, color:"#664d03",
        }}>
          {T.nk}
        </div>
      )}
      <button onClick={()=>setImpOpen(p=>!p)} style={{
        ...B({
          width:"100%", padding:"10px 13px", borderRadius:9,
          border:"2px dashed "+Purple,
          background:impOpen?PurpleSoft:"#fff",
          color:Purple, fontWeight:700, fontSize:13,
          marginBottom:impOpen?0:14,
          display:"flex", alignItems:"center", justifyContent:"space-between",
        })
      }}>
        <span>{T.adj_imp}</span>
        <span>{impOpen?"^":"v"}</span>
      </button>
      {impOpen && (
        <div style={{
          background:PurpleSoft,
          border:"1px solid "+Purple+"44",
          borderRadius:"0 0 9px 9px",
          padding:"12px 13px 14px", marginBottom:14,
        }}>
          <textarea value={raw} onChange={e=>setRaw(e.target.value)}
            placeholder={T.ob_paste} rows={7}
            style={{...IN({resize:"vertical", marginBottom:10, fontSize:12, lineHeight:1.6})}}/>
          <div style={{display:"flex", gap:7}}>
            <button onClick={importRaw}
              disabled={imping||!raw.trim()||!apiKey}
              style={{
                ...B({
                  flex:1, padding:"10px", borderRadius:8,
                  background:imping||!raw.trim()||!apiKey
                    ? "#ccc"
                    : `linear-gradient(135deg, ${Purple}, ${Magenta})`,
                  color:"#fff", fontWeight:700, fontSize:13,
                })
              }}>
              {imping ? T.ob_parsing : T.adj_par}
            </button>
            <button onClick={()=>{setRaw("");setImpOpen(false);}} style={{
              ...B({padding:"10px 13px", borderRadius:8,
                background:"#f0f0f0", color:"#666", fontSize:13})
            }}>{T.adj_can}</button>
          </div>
        </div>
      )}
      <div style={SH({marginTop:impOpen?14:0})}>{T.adj_sec}</div>
      <label style={LBL}>{T.adj_inst}</label>
      <textarea value={inst} onChange={e=>setInst(e.target.value)}
        placeholder={T.adj_ph} rows={4}
        style={{...IN({resize:"vertical", marginBottom:10})}}/>
      <button onClick={adjust} disabled={load||!inst.trim()||!apiKey} style={{
        ...B({
          width:"100%", padding:13, borderRadius:11,
          background:load||!inst.trim()||!apiKey
            ? "#ccc"
            : `linear-gradient(135deg, ${Purple}, ${Magenta})`,
          color:"#fff", fontWeight:800, fontSize:14, marginBottom:7,
        })
      }}>
        {load ? T.adj_ld : T.adj_btn}
      </button>
      {hist.length > 0 && (
        <button onClick={undoL} style={{
          ...B({
            width:"100%", padding:10, borderRadius:9,
            background:"#f0f0f0", color:"#666",
            fontWeight:600, fontSize:13, marginBottom:14,
          })
        }}>{T.adj_undo} ({hist.length})</button>
      )}
      <div style={SH()}>{T.adj_sugg}</div>
      {T.adj_pre.map((p,i) => (
        <button key={i} onClick={()=>setInst(p)} style={{
          ...B({
            width:"100%", padding:"9px 11px", borderRadius:7,
            border:"1px solid #e8e4dc", background:"#fafafa",
            textAlign:"left", fontSize:12, color:"#555",
            marginBottom:5, lineHeight:1.4,
          })
        }}>{p}</button>
      ))}
      <div style={{
        marginTop:12, padding:11, background:"#f8f6f1",
        borderRadius:8, fontSize:11, color:"#888", lineHeight:1.6,
      }}>
        {T.adj_tip}
      </div>
    </div>
  );
}


// ScorePanel v17 : 2 onglets.
//   - dashboard : Score Dashboard 8 axes (delegue a <ScoreDashboard>)
//   - quick     : Score rapide local (calcul client instantane sur la structure)
// Default = dashboard (la valeur premium).

// scoreBg pour le quick (helpers locaux)
function scoreBg(s) {
  if (s >= 80) return "#dcfce7";
  if (s >= 65) return "rgba(201,169,110,.15)";
  if (s >= 50) return "#fff1ed";
  return "#fff1ed";
}

// === v17 helpers : 3 phases narratives ===
// Le state legacy `tab` (5 valeurs) est conserve pour ne pas tout casser.
// `phaseFromTab` mappe vers les 3 phases narratives affichees dans la nav.
// En v17 on introduit la valeur "target" comme un onglet dedie au hub Cibler.
function phaseFromTab(tab) {
  if (tab === "target") return "target";
  if (tab === "ai") return "start";
  if (tab === "edit" || tab === "design"
   || tab === "score" || tab === "tools") return "finalize";
  return "start";
}
// Inverse : quel `tab` legacy declencher quand on choisit une phase ?
// Etape 4 remplacera "edit" par un Finalize unifie phase-natif.
function tabFromPhase(phase) {
  if (phase === "start") return { tab:"ai",     aiMode:"generate" };
  if (phase === "target") return { tab:"target", aiMode:null };
  if (phase === "finalize") return { tab:"edit", aiMode:null };
  return { tab:"ai", aiMode:"generate" };
}

// Icones SVG fines pour la nav 3 phases
const IconStart = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <path d="M14 2v6h6"/>
  </svg>
);
const IconTarget = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
);
const IconFinalize = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

// BottomNav v17 : 3 phases (Demarrer / Cibler / Finaliser).
// `active` est une phase ("start"/"target"/"finalize"), `onPhase` re-route.
function BottomNav({ active, onPhase, T }) {
  const items = [
    ["start",    IconStart,    T.ph_start],
    ["target",   IconTarget,   T.ph_target],
    ["finalize", IconFinalize, T.ph_finalize],
  ];
  return (
    <div style={{
      display:"flex",
      background:Paper,
      borderTop:"0.5px solid "+Gray200,
      padding:"10px 8px 22px",
      flexShrink:0,
      fontFamily:Sans,
      justifyContent:"space-around",
    }}>
      {items.map(([key, icon, label]) => {
        const isActive = active === key;
        return (
          <button key={key} onClick={()=>onPhase(key)} style={{
            ...B({
              display:"flex", flexDirection:"column",
              alignItems:"center", gap:4,
              padding:"6px 14px", borderRadius:RadiusMd,
              background:"transparent",
              flex:1, maxWidth:108,
              transition:"all 200ms ease-out",
            })
          }}>
            <span style={{
              width:24, height:24,
              display:"flex", alignItems:"center", justifyContent:"center",
              color:isActive ? Ink : Gray400,
              transition:"color 200ms ease-out",
            }}>{icon}</span>
            <span style={{
              fontSize:11,
              fontWeight:isActive ? 600 : 500,
              color:isActive ? Ink : Gray400,
              letterSpacing:"0.01em",
              transition:"color 200ms ease-out",
            }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}



// ============================================================
// OnboardScreen v17 : style editorial, fond cream-soft, hero Fraunces
// 4 cartes paper-on-cream avec icones gradient, mode import-adapt en Coral
// ============================================================













// ============================================================
// TargetHub v17 : phase Cibler, hub strategique central
// - Hero card Ink/Gold "Une offre -> candidature complete" + CTA cream
// - Score card violet si offre deja analysee (gradient purple sur le chiffre)
// - Grille 2x2 des 4 super-pouvoirs : Audit / Positioning / Truth / Pack
// ============================================================

// ============================================================
// OfferSheet v17 : sheet bottom iOS-native qui contient le MatchPanel.
// Permet d'analyser l'offre OU de re-consulter le resultat persiste.
// ============================================================
function OfferSheet({ T, cv, setCVFn, notify, apiKey,
  initialResult, onResult, onApplied, onPackRequest, onClose }) {
  return (
    <Sheet
      title={
        <>
          {T.off_title_a}{" "}
          <em style={{
            fontFamily:Serif, fontStyle:"italic",
            background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
            WebkitBackgroundClip:"text",
            WebkitTextFillColor:"transparent",
            backgroundClip:"text",
            paddingRight:"0.15em",
            display:"inline-block",
          }}>{T.off_title_em}</em>
          {", "}{T.off_title_b}
        </>
      }
      eyebrow={T.off_eyebrow}
      onClose={onClose}
    >
      <p style={{
        fontSize:13, color:Gray600, lineHeight:1.5,
        margin:"0 0 18px", fontFamily:Sans,
      }}>{T.off_sub}</p>
      <Suspense fallback={null}>
      <MatchPanel
        cv={cv}
        setCVFn={setCVFn}
        notify={notify}
        apiKey={apiKey}
        T={T}
        onPackRequest={onPackRequest}
        initialResult={initialResult}
        onResult={onResult}
        onApplied={onApplied}
        aiCall={aiCall}
        parseJSON={parseJSON}
        normCV={normCV}
      />
      </Suspense>    </Sheet>
  );
}


// ============================================================
// Composants atomiques pour la personnalisation (etape 2)
// ============================================================

// Petit swatch carre cliquable - presets de couleurs.
function ColorSwatch({ color, name, active, onClick, size=44 }) {
  return (
    <button onClick={onClick} title={name} aria-label={name} style={{
      ...B({
        width:size, height:size, borderRadius:12,
        background:color,
        border:active ? "2px solid "+Ink : "0.5px solid "+Gray200,
        boxShadow:active ? "0 0 0 2px "+Cream+", 0 0 0 3px "+Ink : ShadowSm,
        cursor:"pointer", padding:0, flexShrink:0,
        transition:"all 180ms ease-out",
      })
    }}/>
  );
}

// Jauge de lisibilite Nuvi : demi-cercle tachymetre avec aiguille.
// Remplace le badge WCAG technique par une experience premium.
function WCAGBadge({ ratio, level, T }) {
  if (!ratio || ratio === 0) return null;
  
  // Mappe le ratio (1-21) sur un angle (-90deg = rouge a gauche, +90deg = vert a droite)
  // Seuils: <3 = mauvais, 3-4.5 = moyen, 4.5-7 = bon, >7 = excellent
  const clampedRatio = Math.min(21, Math.max(1, ratio));
  const normalizedRatio = (clampedRatio - 1) / 20; // 0 a 1
  const angle = -90 + (normalizedRatio * 180); // -90 a +90
  
  // Texte selon ratio
  let label, color;
  if (ratio >= 4.5) {
    label = "Tres lisible";
    color = "#16a34a";
  } else if (ratio >= 3) {
    label = "Moyen";
    color = "#d97757";
  } else {
    label = "A revoir";
    color = "#dc2626";
  }
  
  return (
    <div style={{
      display:"inline-flex", flexDirection:"column", alignItems:"center", gap:2,
      fontFamily:Sans,
    }}>
      <span style={{
        fontSize:10, fontWeight:600,
        color:color, letterSpacing:"0.02em",
      }}>{label}</span>
      <svg width="64" height="36" viewBox="0 0 64 36" style={{display:"block"}}>
        {/* Arc gradient rouge -> orange -> vert */}
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#dc2626"/>
            <stop offset="50%" stopColor="#d97757"/>
            <stop offset="100%" stopColor="#16a34a"/>
          </linearGradient>
        </defs>
        {/* Arc de fond (demi-cercle) */}
        <path d="M 6 32 A 26 26 0 0 1 58 32"
              fill="none" stroke="url(#gaugeGrad)" strokeWidth="5"
              strokeLinecap="round"/>
        {/* Aiguille */}
        <line
          x1="32" y1="32"
          x2={32 + 22 * Math.cos((angle - 90) * Math.PI / 180)}
          y2={32 + 22 * Math.sin((angle - 90) * Math.PI / 180)}
          stroke="var(--nuvi-ink)"
          strokeWidth="2"
          strokeLinecap="round"
          style={{transition:"all 600ms cubic-bezier(0.34, 1.56, 0.64, 1)"}}
        />
        {/* Pivot central */}
        <circle cx="32" cy="32" r="3" fill="var(--nuvi-ink)"/>
      </svg>
    </div>
  );
}

// Bloc reutilisable : eyebrow + grille de presets + color picker libre.
// onChange recoit la couleur hex finale.
// `contrastWith` (optionnel) permet d'afficher un badge WCAG par rapport
// a une couleur de reference (typiquement la couleur de texte qui sera dessus).
function ColorPickerBlock({
  T, label, value, onChange, presets,
  contrastWith, contrastLabel, columns=4,
}) {
  const ratio = contrastWith && value ? contrastRatio(value, contrastWith) : 0;
  const level = ratio ? wcagLevel(value, contrastWith) : null;
  return (
    <div style={{marginBottom:22}}>
      <div style={{
        display:"flex", justifyContent:"space-between", alignItems:"center",
        marginBottom:10,
      }}>
        <span style={{
          fontSize:11, fontWeight:600,
          letterSpacing:"0.1em", textTransform:"uppercase",
          color:Coral, fontFamily:Sans,
        }}>{label}</span>
        {contrastWith && level && (
          <WCAGBadge ratio={ratio} level={level} T={T}/>
        )}
      </div>

      {/* Presets en ligne unique, palette-style condensee */}
      <div style={{
        display:"flex",
        gap:8,
        marginBottom:12,
        overflowX:"auto",
        paddingTop:6,
        paddingBottom:8,
      }}>
        {presets.map(p => (
          <div key={p.id} style={{
            display:"flex", flexDirection:"column",
            alignItems:"center", gap:6,
            flexShrink:0, minWidth:62,
          }}>
            <ColorSwatch
              color={p.color}
              name={p.name}
              active={value && value.toLowerCase() === p.color.toLowerCase()}
              onClick={()=>onChange(p.color)}
            />
            <span style={{
              fontSize:10, color:Gray600,
              textAlign:"center", lineHeight:1.3,
              fontFamily:Sans, fontWeight:500,
              maxWidth:72,
            }}>{p.name}</span>
          </div>
        ))}
      </div>

      {/* Color picker libre HTML5 - version compacte chip */}
      <label style={{
        display:"inline-flex", alignItems:"center", gap:8,
        padding:"7px 12px 7px 7px", borderRadius:RadiusPill,
        background:Paper, border:"0.5px solid "+Gray200,
        cursor:"pointer", boxShadow:ShadowSm,
        fontFamily:Sans,
      }}>
        <input
          type="color"
          value={value || "#c9a96e"}
          onChange={e => onChange(e.target.value)}
          style={{
            width:24, height:24, border:"none",
            background:"none", cursor:"pointer",
            padding:0, borderRadius:"50%",
          }}
        />
        <span style={{
          fontSize:11, color:Gray600,
          fontWeight:500,
        }}>{T.cust_color_picker}</span>
        <span style={{
          fontSize:10, color:Gray400,
          fontFamily:"ui-monospace, monospace",
          marginLeft:4,
        }}>{value || ""}</span>
      </label>
    </div>
  );
}

// Tab Couleurs complet : 3 ColorPickerBlock (accent, sidebar, paper).
function ColorsTab({ T, scope, theme, cvCustom, versionCustom, writeCustom }) {

  // La valeur effective courante (apres merge) pour pre-selectionner
  // le bon swatch / pre-remplir le picker.
  // Selon le scope on edite le custom global ou le custom version.
  const editing = scope === "global" ? cvCustom : versionCustom;
  const eff = mergeTheme(theme, cvCustom, versionCustom);

  const setAccent = (color) => writeCustom(c => ({ ...c, ac: color }));
  const setSidebar = (color) => writeCustom(c => ({ ...c, sb: color }));
  const setPaper = (color) => writeCustom(c => ({ ...c, bg: color }));

  return (
    <div>
      {/* Couleur d'accent : doit contraster avec sidebar (pour le titre / accent visible dessus) */}
      <ColorPickerBlock
        T={T}
        label={T.cust_color_accent}
        value={(editing && editing.ac) || eff.ac}
        onChange={setAccent}
        presets={ACCENT_PRESETS}
        contrastWith={eff.sb}
        columns={4}
      />
      {/* Bandeau lateral : doit contraster avec la couleur de texte sur sidebar (st) */}
      <ColorPickerBlock
        T={T}
        label={T.cust_color_sidebar}
        value={(editing && editing.sb) || eff.sb}
        onChange={setSidebar}
        presets={SIDEBAR_PRESETS}
        contrastWith={eff.st}
        columns={3}
      />
      {/* Fond du CV : doit contraster avec le texte principal (Ink en general) */}
      <ColorPickerBlock
        T={T}
        label={T.cust_color_paper}
        value={(editing && editing.bg) || eff.bg}
        onChange={setPaper}
        presets={PAPER_PRESETS}
        contrastWith={Ink}
        columns={5}
      />
    </div>
  );
}

// FontCard : aperçu d'une font (Aa + nom + vibe + ATS badge optionnel).
// Charge la font des le mount via ensureFontLoaded pour rendre l'apercu fidele.
function FontCard({ font, active, onClick, sample, isBody }) {
  useEffect(() => {
    ensureFontLoaded(font.googleHref);
  }, [font.googleHref]);
  return (
    <button onClick={onClick} style={{
      ...B({
        background:active ? CreamSoft : Paper,
        border:active ? "1.5px solid "+Ink : "0.5px solid "+Gray200,
        borderRadius:RadiusMd,
        padding:"14px 16px",
        textAlign:"left",
        boxShadow:active ? "none" : ShadowSm,
        transition:"all 180ms ease-out",
        width:"100%",
        cursor:"pointer",
        display:"flex", alignItems:"center", gap:14,
      })
    }}>
      {/* Apercu compact "Aa" rendu dans la font cible */}
      <div style={{
        width:48, height:48, flexShrink:0,
        borderRadius:10,
        background:Cream,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:font.family,
        fontSize:isBody ? 22 : 26,
        fontWeight:isBody ? 500 : 600,
        color:Ink,
        letterSpacing:isBody ? "0" : "-0.02em",
        border:"0.5px solid "+Gray200,
        overflow:"hidden",
      }}>Aa</div>
      <div style={{flex:1, minWidth:0}}>
        {/* Phrase d'apercu dans la font cible : c'est le vrai test visuel */}
        <div style={{
          fontFamily:font.family,
          fontSize:isBody ? 14 : 18,
          fontWeight:isBody ? 500 : 600,
          color:Ink,
          letterSpacing:isBody ? "0" : "-0.01em",
          lineHeight:1.2,
          marginBottom:4,
          whiteSpace:"nowrap",
          overflow:"hidden",
          textOverflow:"ellipsis",
        }}>{sample}</div>
        {/* Meta : nom de la font + vibe (toujours en Sans pour la lisibilite) */}
        <div style={{
          fontFamily:Sans, fontSize:11, color:Gray600,
          lineHeight:1.4,
          whiteSpace:"nowrap",
          overflow:"hidden",
          textOverflow:"ellipsis",
        }}>
          <span style={{fontWeight:600, color:Ink}}>{font.name}</span>
          {font.vibe ? " - " + font.vibe : ""}
          {font.target ? " - " + font.target : ""}
        </div>
      </div>
      {isBody && font.ats && (
        <span style={{
          padding:"3px 9px", borderRadius:RadiusPill,
          background:GreenSoft, color:Green,
          fontSize:10, fontWeight:600, fontFamily:Sans,
          letterSpacing:"0.04em",
          flexShrink:0,
        }}>{font.ats}</span>
      )}
    </button>
  );
}

// FontSection : eyebrow + grille de FontCard (1 colonne sur mobile).
function FontSection({ T, label, fonts, value, onPick, sample, isBody }) {
  // Match strict : on cherche "'Nom Exact'" entoure de quotes simples
  // pour eviter les faux positifs (ex "Inter Tight" qui matcherait "Inter").
  const isActive = (f) => {
    if (!value) return false;
    const v = value.toLowerCase();
    const target = "'" + f.name.toLowerCase() + "'";
    return v.indexOf(target) !== -1;
  };
  return (
    <div style={{marginBottom:22}}>
      <div style={{
        fontSize:11, fontWeight:600,
        letterSpacing:"0.1em", textTransform:"uppercase",
        color:Coral, marginBottom:10,
        fontFamily:Sans,
      }}>{label}</div>
      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))",
        gap:8,
      }}>
        {fonts.map(f => (
          <FontCard
            key={f.id}
            font={f}
            sample={sample}
            isBody={isBody}
            active={isActive(f)}
            onClick={()=>onPick(f)}
          />
        ))}
      </div>
    </div>
  );
}

// FontUrlInput : champ libre Google Fonts URL.
// Apres saisie d'une URL valide, demande "aux titres ou au corps ?"
// puis applique. Gere les erreurs de validation et de chargement.
function FontUrlInput({ T, onApply }) {
  const [url, setUrl]       = useState("");
  const [pending, setPending] = useState(null); // { name, family, googleHref }
  const [err, setErr]       = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    setErr("");
    const parsed = parseGoogleFontUrl(url.trim());
    if (!parsed) {
      setErr(T.cust_font_url_invalid);
      return;
    }
    setLoading(true);
    ensureFontLoaded(parsed.googleHref);
    // Petite latence pour laisser la font se charger avant d'afficher
    // le choix headings/body.
    setTimeout(() => {
      setPending(parsed);
      setLoading(false);
    }, 600);
  };

  const apply = (target) => {
    if (!pending) return;
    onApply(target, pending);
    setUrl("");
    setPending(null);
    setErr("");
  };

  return (
    <div style={{
      padding:"16px 16px 18px",
      borderRadius:RadiusMd,
      background:Paper,
      border:"0.5px solid "+Gray200,
      boxShadow:ShadowSm,
      marginTop:8,
    }}>
      <div style={{
        fontSize:11, fontWeight:600,
        letterSpacing:"0.1em", textTransform:"uppercase",
        color:Coral, marginBottom:10,
        fontFamily:Sans,
      }}>{T.cust_font_url_label}</div>
      <input
        type="url"
        value={url}
        onChange={e => { setUrl(e.target.value); setErr(""); }}
        placeholder={T.cust_font_url_ph}
        style={{
          width:"100%",
          padding:"11px 14px",
          borderRadius:RadiusSm,
          border:"0.5px solid "+(err ? Coral : Gray200),
          background:Cream,
          color:Ink, fontSize:12,
          fontFamily:"ui-monospace, monospace",
          outline:"none",
          marginBottom:err ? 6 : 10,
          boxSizing:"border-box",
        }}
      />
      {err && (
        <div style={{
          fontSize:11, color:Coral,
          marginBottom:10, fontFamily:Sans,
        }}>{err}</div>
      )}
      {!pending && (
        <button onClick={validate} disabled={loading || !url.trim()} style={{
          ...B({
            width:"100%", padding:"11px 18px", borderRadius:RadiusPill,
            background:loading || !url.trim() ? Gray200 : `linear-gradient(135deg, ${Purple}, ${Magenta})`,
            color:loading || !url.trim() ? Gray600 : "#fff",
            border:"none",
            fontSize:13, fontWeight:600, fontFamily:Sans,
            transition:"all 200ms ease-out",
          })
        }}>
          {loading ? T.cust_font_url_loading : T.cust_font_url_apply}
        </button>
      )}
      {pending && (
        <div>
          {/* Apercu rapide */}
          <div style={{
            padding:"12px 14px", borderRadius:RadiusSm,
            background:CreamSoft,
            border:"0.5px solid "+Gray200,
            marginBottom:12,
          }}>
            <div style={{
              fontFamily:pending.family,
              fontSize:24, fontWeight:600,
              color:Ink, marginBottom:2,
              letterSpacing:"-0.01em",
            }}>{pending.name}</div>
            <div style={{
              fontFamily:pending.family,
              fontSize:13, color:Gray600,
            }}>The quick brown fox jumps over the lazy dog</div>
          </div>
          <div style={{
            fontSize:12, color:Gray600,
            marginBottom:8, fontFamily:Sans,
          }}>{T.cust_font_url_apply_target}</div>
          <div style={{display:"flex", gap:8}}>
            <button onClick={()=>apply("header")} style={{
              ...B({
                flex:1, padding:"11px 14px", borderRadius:RadiusPill,
                background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
                color:"#fff",
                border:"none",
                fontSize:12, fontWeight:600, fontFamily:Sans,
                transition:"all 200ms ease-out",
              })
            }}>{T.cust_font_url_to_header}</button>
            <button onClick={()=>apply("body")} style={{
              ...B({
                flex:1, padding:"11px 14px", borderRadius:RadiusPill,
                background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
                color:"#fff",
                border:"none",
                fontSize:12, fontWeight:600, fontFamily:Sans,
                transition:"all 200ms ease-out",
              })
            }}>{T.cust_font_url_to_body}</button>
          </div>
          <button onClick={()=>{ setPending(null); setUrl(""); }} style={{
            ...B({
              width:"100%", marginTop:8, padding:"8px 14px",
              background:"transparent", color:Gray600,
              fontSize:11, fontFamily:Sans,
            })
          }}>{T.back}</button>
        </div>
      )}
    </div>
  );
}

// FontsTab : section titres + section corps + champ libre URL.
function FontsTab({ T, scope, theme, cvCustom, versionCustom, writeCustom }) {
  const editing = scope === "global" ? cvCustom : versionCustom;
  const eff     = mergeTheme(theme, cvCustom, versionCustom);

  // Precharge TOUTES les fonts du catalogue au mount, pour que les apercus
  // dans les FontCard rendent dans la font cible des le premier paint.
  // Sans ce preload, le useEffect interne au FontCard se declenche apres le
  // premier render et l'utilisateur voit brievement le fallback systeme.
  useEffect(() => {
    HEADER_FONTS.forEach(f => ensureFontLoaded(f.googleHref));
    BODY_FONTS.forEach(f => ensureFontLoaded(f.googleHref));
  }, []);

  const pickHeader = (font) => writeCustom(c => ({
    ...c, hf: font.family, hfHref: font.googleHref,
  }));
  const pickBody = (font) => writeCustom(c => ({
    ...c, bf: font.family, bfHref: font.googleHref,
  }));
  const applyUrl = (target, parsed) => {
    if (target === "header") {
      writeCustom(c => ({ ...c, hf: parsed.family, hfHref: parsed.googleHref }));
    } else {
      writeCustom(c => ({ ...c, bf: parsed.family, bfHref: parsed.googleHref }));
    }
  };

  return (
    <div>
      <FontSection
        T={T}
        label={T.cust_font_header}
        fonts={HEADER_FONTS}
        value={(editing && editing.hf) || eff.hf || ""}
        onPick={pickHeader}
        sample={T.cust_font_sample_header}
        isBody={false}
      />
      <FontSection
        T={T}
        label={T.cust_font_body}
        fonts={BODY_FONTS}
        value={(editing && editing.bf) || eff.bf || ""}
        onPick={pickBody}
        sample={T.cust_font_sample_body}
        isBody={true}
      />
      <FontUrlInput T={T} onApply={applyUrl}/>
    </div>
  );
}

// ============================================================
// Suggestions IA (etape 4) : analyse deep du profil + 4 combos curees
// ============================================================

// Construit le prompt deep pour les suggestions de style.
// Analyse en profondeur : secteur, seniorite (deduite des dates), pays,
// niveau (executive / mid / junior), culture cible.
// Construit la liste serialisable des presets pour le prompt IA.
// Format : "id: name (description)" - une ligne par item.
function _serializePresetsForPrompt(presets, type) {
  return presets.map(p => {
    let extra = "";
    if (type === "accent") {
      extra = " (couleur " + p.color + ")";
    } else if (type === "sidebar" || type === "paper") {
      extra = " (couleur " + p.color + ")";
    }
    return p.id + ": " + p.name + extra;
  }).join("\n");
}

function _serializeFontsForPrompt(fonts) {
  return fonts.map(f => {
    const target = f.target ? " - cible: " + f.target : "";
    const ats = f.ats ? " - ATS: " + f.ats : "";
    return f.id + ": " + f.name + " (" + (f.vibe || "") + target + ats + ")";
  }).join("\n");
}

function buildStylePrompt(cv, locale) {
  const yrs = (cv.experience || []).reduce((acc, e) => {
    const m = (e.period || "").match(/(\d{4})\s*[-]\s*(\d{4}|present|now|en cours|aujourd|actuel)/i);
    if (m) {
      const start = parseInt(m[1], 10);
      const endRaw = m[2];
      const end = /\d{4}/.test(endRaw) ? parseInt(endRaw, 10) : new Date().getFullYear();
      return acc + Math.max(0, end - start);
    }
    return acc;
  }, 0);
  const expSummary = (cv.experience || []).slice(0, 4).map(e =>
    (e.title || "") + " chez " + (e.company || "") + " (" + (e.period || "") + ")"
  ).join(" | ");
  const skillsSummary = (cv.skills || []).filter(Boolean).slice(0, 8).join(", ");
  const profileLine =
      "Titre actuel: " + (cv.title || "(non renseigne)")
    + "\nNom: " + (cv.name || "(non renseigne)")
    + "\nLocalisation: " + (cv.location || "(non renseignee)")
    + "\nAccroche: " + ((cv.summary || "").slice(0, 280) || "(non renseignee)")
    + "\nExperiences (4 plus recentes): " + (expSummary || "(aucune)")
    + "\nCompetences cles: " + (skillsSummary || "(aucune)")
    + "\nAnnees d'experience cumulees (estimation): " + yrs;

  // Bibliotheques curees serialisees pour que l'IA pick des IDs (pas du libre).
  const accentCatalog  = _serializePresetsForPrompt(ACCENT_PRESETS, "accent");
  const sidebarCatalog = _serializePresetsForPrompt(SIDEBAR_PRESETS, "sidebar");
  const paperCatalog   = _serializePresetsForPrompt(PAPER_PRESETS, "paper");
  const headerFontCatalog = _serializeFontsForPrompt(HEADER_FONTS);
  const bodyFontCatalog   = _serializeFontsForPrompt(BODY_FONTS);

  // Mapping secteur > combos forts (regles deterministes integrees au prompt).
  const sectorRules = [
    "Banque, finance, conseil senior, juridique > accent bordeaux/navy + sidebar ink/midnight + hf playfair/cormorant + bf lato/sourcesans",
    "Tech, produit, design, startup > accent charcoal/teal + sidebar ink + hf space/inter + bf inter/dmsans",
    "Marketing, communication, branding > accent rust/plum + sidebar ink/charcoal + hf montserrat/dmserif + bf opensans/work",
    "Executive, direction generale, comex > accent gold/bordeaux + sidebar ink + hf playfair/fraunces + bf lato/sourcesans",
    "Creative, art, mode > accent plum/rust + sidebar darkwine/cream + hf cormorant/dmserif + bf nunito/lora",
    "RH, coaching, social, ONG > accent forest/teal + sidebar forest/midnight + hf lora/fraunces + bf nunito/lato",
  ].join("\n");

  const langLine = locale === "en"
    ? "Reponds STRICTEMENT en anglais (les champs name, target et why en anglais). "
    : "Reponds STRICTEMENT en francais. ";

  return (
    "Tu es directeur artistique senior, expert typographie et CV executifs."
    + " Analyse le profil ci-dessous et propose EXACTEMENT 4 combinaisons de style"
    + " (couleurs + polices). Tu DOIS choisir uniquement parmi les IDs des catalogues fournis."
    + "\n\nPROFIL:\n" + profileLine
    + "\n\nCATALOGUE COULEUR D'ACCENT (choisis 1 id par combo):\n" + accentCatalog
    + "\n\nCATALOGUE COULEUR SIDEBAR (choisis 1 id par combo):\n" + sidebarCatalog
    + "\n\nCATALOGUE COULEUR PAPER (choisis 1 id par combo):\n" + paperCatalog
    + "\n\nCATALOGUE POLICE TITRES (choisis 1 id par combo):\n" + headerFontCatalog
    + "\n\nCATALOGUE POLICE CORPS (choisis 1 id par combo):\n" + bodyFontCatalog
    + "\n\nREGLES MAPPING SECTORIEL (orientation, pas obligation):\n" + sectorRules
    + "\n\nREGLES STRICTES:"
    + "\n- accentId, sidebarId, paperId, hfId, bfId DOIVENT etre des ids valides du catalogue ci-dessus."
    + "\n- 4 combinaisons distinctes ciblant des CULTURES DIFFERENTES (premium classique, moderne tech, creative, sobre)."
    + "\n- CONTRASTE OBLIGATOIRE accent vs sidebar: l'accent doit etre clairement lisible sur le sidebar (le titre en accent doit ressortir)."
    + "\n  -> Sidebar fonce (ink, midnight, charcoal, forest, darkwine) accepte uniquement accent CLAIR (gold) ou accent moyen-vif (rust)."
    + "\n  -> Sidebar clair (cream) accepte uniquement accent FONCE (bordeaux, navy, plum, charcoal, forest, teal)."
    + "\n  -> JAMAIS deux foncees ensemble: bordeaux+ink, navy+midnight, forest+forest, plum+darkwine, teal+forest sont INTERDITS."
    + "\n  -> Si tu hesites, prefere accent gold (le plus polyvalent) sur sidebar fonce, ou bordeaux/navy sur sidebar cream."
    + "\n- Le 'why' doit etre 1 phrase concrete (max 25 mots) qui cite le secteur ou la culture cible et explique le choix typographique."
    + "\n- " + NO_DASH + " " + langLine + "JSON UNIQUEMENT, sans markdown."
    + '\n\n{"combos":[{"name":"Banque classique","accentId":"gold","sidebarId":"ink","paperId":"cream","hfId":"playfair","bfId":"lato","target":"banque privee, gestion patrimoine","why":"explication 1 phrase precise"}]}'
  );
}

// Resolution stricte par ID dans les catalogues curees.
// Retourne l'entree complete ou null.
function resolveAccentId(id) {
  if (!id) return null;
  return ACCENT_PRESETS.find(p => p.id === id) || null;
}
function resolveSidebarId(id) {
  if (!id) return null;
  return SIDEBAR_PRESETS.find(p => p.id === id) || null;
}
function resolvePaperId(id) {
  if (!id) return null;
  return PAPER_PRESETS.find(p => p.id === id) || null;
}
function resolveHeaderFontId(id) {
  if (!id) return null;
  return HEADER_FONTS.find(f => f.id === id) || null;
}
function resolveBodyFontId(id) {
  if (!id) return null;
  return BODY_FONTS.find(f => f.id === id) || null;
}

// Snap : si l'IA renvoie une couleur hex au lieu d'un id, on cherche le preset
// le plus proche par distance euclidienne RGB. Garantit qu'on reste dans la
// palette curee meme si l'IA devie.
function _hexDistance(a, b) {
  const ra = _hexToRgb(a), rb = _hexToRgb(b);
  if (!ra || !rb) return Infinity;
  const dr = ra[0] - rb[0], dg = ra[1] - rb[1], db = ra[2] - rb[2];
  return Math.sqrt(dr*dr + dg*dg + db*db);
}
function snapColorToPreset(color, presets) {
  if (!color || !presets || presets.length === 0) return presets[0] || null;
  let best = presets[0];
  let bestDist = _hexDistance(color, presets[0].color);
  for (let i = 1; i < presets.length; i++) {
    const d = _hexDistance(color, presets[i].color);
    if (d < bestDist) { bestDist = d; best = presets[i]; }
  }
  return best;
}

// Validation et reconstruction d'un combo IA.
// Garantit que tous les champs sont des entrees valides du catalogue.
// Si l'IA a renvoye un hex au lieu d'un id, on snap au preset le plus proche.
// Si elle a renvoye un nom au lieu d'un id, on cherche par nom.
// Retourne le combo enrichi avec les VRAIES entrees catalogue, ou null si irreparable.
function validateAndEnrichCombo(raw) {
  if (!raw || typeof raw !== "object") return null;

  // Couleurs : try id first, then name match, then hex snap, then fallback.
  const tryColor = (val, presets) => {
    if (!val) return presets[0];
    const s = String(val).trim();
    // Direct id match
    const byId = presets.find(p => p.id === s);
    if (byId) return byId;
    // Name match (case insensitive)
    const byName = presets.find(p => p.name.toLowerCase() === s.toLowerCase());
    if (byName) return byName;
    // Hex match
    if (/^#[0-9a-f]{3,8}$/i.test(s)) {
      return snapColorToPreset(s, presets);
    }
    // Fallback: first preset
    return presets[0];
  };

  // Fonts : try id first, then name match, then fallback.
  const tryFont = (val, fonts) => {
    if (!val) return fonts[0];
    const s = String(val).trim().toLowerCase();
    const byId = fonts.find(f => f.id === s);
    if (byId) return byId;
    const byName = fonts.find(f => f.name.toLowerCase() === s);
    if (byName) return byName;
    // Partial match (ex "Playfair" matche "Playfair Display")
    const byPartial = fonts.find(f => s.includes(f.id) || f.name.toLowerCase().includes(s));
    if (byPartial) return byPartial;
    return fonts[0];
  };

  const accent  = tryColor(raw.accentId  || raw.accent,  ACCENT_PRESETS);
  let   sidebar = tryColor(raw.sidebarId || raw.sidebar, SIDEBAR_PRESETS);
  const paper   = tryColor(raw.paperId   || raw.paper,   PAPER_PRESETS);
  const hf      = tryFont(raw.hfId       || raw.header_font || raw.headerFont, HEADER_FONTS);
  const bf      = tryFont(raw.bfId       || raw.body_font   || raw.bodyFont,   BODY_FONTS);

  // Auto-fix contraste accent vs sidebar.
  // L'accent est l'element typographique fort (titres, separateurs, dates). Il
  // doit etre clairement lisible sur le sidebar. Si le combo IA echoue WCAG AA
  // (ratio < 4.5), on cherche dans SIDEBAR_PRESETS celui qui maximise le
  // contraste avec cet accent et on snap dessus.
  // Note: WCAG AA pour texte large c'est 3.0, mais l'accent fait souvent le
  // role d'un titre fin (separateur, lettre capitale) donc on vise 4.5 (AA
  // texte normal) pour la securite.
  const accentVsSidebar = contrastRatio(accent.color, sidebar.color);
  if (accentVsSidebar < 4.5) {
    let bestSidebar = sidebar;
    let bestRatio = accentVsSidebar;
    for (const sb of SIDEBAR_PRESETS) {
      const r = contrastRatio(accent.color, sb.color);
      if (r > bestRatio) { bestRatio = r; bestSidebar = sb; }
    }
    // On ne snap que si on trouve significativement mieux ET au-dessus du seuil.
    if (bestRatio >= 4.5) {
      sidebar = bestSidebar;
    }
  }

  // Calcul du contraste final (apres auto-fix eventuel) pour l'afficher en UI.
  const contrast = contrastRatio(accent.color, sidebar.color);

  return {
    name:    String(raw.name   || "").slice(0, 60) || "Style",
    target:  String(raw.target || "").slice(0, 80),
    why:     String(raw.why    || "").slice(0, 240),
    accent, sidebar, paper, hf, bf,
    contrast, // ratio numerique pour le badge WCAG dans la card
  };
}

// Carte d'un combo IA : bandeau de couleurs + apercu fonts + why + adopter.
function SuggestionCombo({ T, combo, onAdopt }) {
  // Apres validateAndEnrichCombo, combo a la forme:
  // { name, target, why,
  //   accent:{id,name,color}, sidebar:{id,name,color}, paper:{id,name,color},
  //   hf:{id,name,family,googleHref,vibe,target}, bf:{id,name,family,googleHref,vibe,ats} }
  const accent  = combo.accent  ? combo.accent.color  : "#c9a96e";
  const sidebar = combo.sidebar ? combo.sidebar.color : "#0a0a0a";
  const paper   = combo.paper   ? combo.paper.color   : "#f8f6f1";
  const headerFont = combo.hf || null;
  const bodyFont   = combo.bf || null;

  // Charge les fonts du combo des le mount (pour l'apercu).
  useEffect(() => {
    if (headerFont) ensureFontLoaded(headerFont.googleHref);
    if (bodyFont)   ensureFontLoaded(bodyFont.googleHref);
  }, [headerFont, bodyFont]);

  return (
    <div style={{
      background:Paper, borderRadius:RadiusMd,
      border:"0.5px solid "+Gray200,
      boxShadow:ShadowSm,
      padding:0, marginBottom:14, overflow:"hidden",
      fontFamily:Sans,
    }}>
      {/* Apercu visuel : bandeau sidebar + zone paper avec accent */}
      <div style={{
        display:"flex", height:110,
        borderBottom:"0.5px solid "+Gray200,
        position:"relative",
      }}>
        {/* Badge WCAG accent vs sidebar : transparence sur la qualite du combo */}
        {combo.contrast && (
          <div style={{
            position:"absolute", top:8, right:8, zIndex:2,
            padding:"3px 8px", borderRadius:RadiusPill,
            background: combo.contrast >= 7
              ? GreenSoft
              : combo.contrast >= 4.5
                ? PurpleSoft
                : CoralSoft,
            color: combo.contrast >= 7
              ? Green
              : combo.contrast >= 4.5
                ? Purple
                : Coral,
            fontSize:9, fontWeight:700, fontFamily:Sans,
            letterSpacing:"0.06em", textTransform:"uppercase",
            display:"inline-flex", alignItems:"center", gap:5,
            border:"0.5px solid "+(combo.contrast >= 7
              ? Green
              : combo.contrast >= 4.5
                ? Purple
                : Coral),
          }}>
            <span>
              {combo.contrast >= 7 ? "AAA" : combo.contrast >= 4.5 ? "AA" : "Bas"}
            </span>
            <span style={{opacity:.75, fontWeight:600, letterSpacing:"0.02em"}}>
              {combo.contrast.toFixed(1)}:1
            </span>
          </div>
        )}
        <div style={{
          width:"32%", background:sidebar,
          display:"flex", flexDirection:"column",
          justifyContent:"center", alignItems:"center",
          padding:8,
        }}>
          <div style={{
            fontFamily:headerFont ? headerFont.family : Serif,
            fontSize:26, fontWeight:600,
            color:accent, letterSpacing:"-0.02em",
            lineHeight:1,
          }}>Aa</div>
          <div style={{
            width:18, height:2, background:accent,
            marginTop:8, borderRadius:1,
          }}/>
        </div>
        <div style={{
          flex:1, background:paper,
          padding:"14px 18px",
          display:"flex", flexDirection:"column", justifyContent:"center",
          minWidth:0,
        }}>
          <div style={{
            fontFamily:headerFont ? headerFont.family : Serif,
            fontSize:16, fontWeight:600,
            color:Ink, marginBottom:5,
            letterSpacing:"-0.01em",
            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
          }}>{combo.name || "Combo"}</div>
          <div style={{
            fontFamily:bodyFont ? bodyFont.family : Sans,
            fontSize:12, color:"#444",
            lineHeight:1.4,
          }}>Profil et experience</div>
          <div style={{
            display:"flex", gap:5, marginTop:8,
          }}>
            <span title={combo.accent ? combo.accent.name : ""}
                  style={{width:11, height:11, borderRadius:"50%", background:accent, border:"0.5px solid "+Gray200}}/>
            <span title={combo.sidebar ? combo.sidebar.name : ""}
                  style={{width:11, height:11, borderRadius:"50%", background:sidebar, border:"0.5px solid "+Gray200}}/>
            <span title={combo.paper ? combo.paper.name : ""}
                  style={{width:11, height:11, borderRadius:"50%", background:paper, border:"0.5px solid "+Gray200}}/>
          </div>
        </div>
      </div>

      {/* Body de la card : nom du combo + why + adopter */}
      <div style={{padding:"14px 16px 16px"}}>
        {combo.target && (
          <div style={{
            fontSize:11, fontWeight:600,
            letterSpacing:"0.1em", textTransform:"uppercase",
            color:Coral, marginBottom:6,
          }}>{combo.target}</div>
        )}
        {combo.why && (
          <div style={{
            fontFamily:Serif, fontWeight:400, fontStyle:"italic",
            fontSize:14, lineHeight:1.5,
            color:Ink, marginBottom:4,
            letterSpacing:"-0.005em",
          }}>"{combo.why}"</div>
        )}
        <div style={{
          fontSize:11, color:Gray600, marginTop:10,
          marginBottom:12, fontFamily:Sans,
        }}>
          {(headerFont ? headerFont.name : "?")}
          {" + "}
          {(bodyFont ? bodyFont.name : "?")}
        </div>
        <button onClick={()=>onAdopt({
          ac: accent, sb: sidebar, bg: paper,
          hf: headerFont ? headerFont.family : null,
          hfHref: headerFont ? headerFont.googleHref : null,
          bf: bodyFont ? bodyFont.family : null,
          bfHref: bodyFont ? bodyFont.googleHref : null,
        })} style={{
          ...B({
            width:"100%", padding:"11px 16px", borderRadius:RadiusPill,
            background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
            color:"#fff",
            border:"none",
            fontSize:12, fontWeight:600, fontFamily:Sans,
            display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
            transition:"all 200ms ease-out",
          })
        }}>
          {T.cust_suggest_adopt}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// SuggestTab : bouton run + loading + 4 SuggestionCombo + reset.
function SuggestTab({ T, cv, locale, apiKey, notify, scope, writeCustom, onAdopted }) {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(false);

  const cvIsEmpty = !cv.name && !cv.title && !cv.summary
    && (cv.experience || []).every(e => !e.title && !e.company);

  const run = async () => {
    if (cvIsEmpty) { notify(T.cust_suggest_no_cv); return; }
    if (!apiKey)   { notify(T.nk); return; }
    setLoading(true);
    setCombos([]);
    try {
      const txt = await aiCall(buildStylePrompt(cv, locale));
      const parsed = parseJSON(txt);
      const raw = Array.isArray(parsed && parsed.combos) ? parsed.combos : [];
      // Validation + enrichment : chaque combo passe par le filtre qui garantit
      // que tous les champs (couleurs, fonts) sont des entrees valides du
      // catalogue curee. Si l'IA devie (hex libre, font inconnue), on snap.
      const validated = raw.map(validateAndEnrichCombo).filter(Boolean);
      setCombos(validated);
    } catch (err) {
      notify(T.ea + ": " + (err && err.message ? err.message : ""));
    }
    setLoading(false);
  };

  const adopt = (custom) => {
    // Applique le custom complet d'un coup (couleurs + fonts).
    writeCustom(c => ({ ...c, ...custom }));
    notify(T.cust_adopted);
    if (onAdopted) onAdopted();
  };

  return (
    <div>
      <button onClick={run} disabled={loading || cvIsEmpty || !apiKey} style={{
        ...B({
          width:"100%", padding:"15px 22px", borderRadius:RadiusPill,
          background:loading || cvIsEmpty || !apiKey ? Gray200 : GradPurple,
          color:loading || cvIsEmpty || !apiKey ? Gray600 : "#fff",
          fontFamily:Sans, fontWeight:600, fontSize:14,
          display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
          marginBottom:18,
          transition:"all 200ms ease-out",
        })
      }}>
        {loading ? T.cust_suggest_loading : T.cust_suggest_btn}
        {!loading && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>
          </svg>
        )}
      </button>

      {cvIsEmpty && (
        <div style={{
          padding:"18px 16px", background:CreamSoft,
          border:"0.5px solid "+Gray200, borderRadius:RadiusMd,
          fontSize:12, color:Gray600, lineHeight:1.5,
          fontFamily:Sans, textAlign:"center",
        }}>{T.cust_suggest_no_cv}</div>
      )}

      {!loading && combos.length > 0 && combos.map((c, i) => (
        <SuggestionCombo
          key={i}
          T={T}
          combo={c}
          onAdopt={adopt}
        />
      ))}

      {loading && (
        <div style={{
          padding:"32px 18px", textAlign:"center",
          color:Gray600, fontSize:13, fontFamily:Sans,
        }}>
          <div style={{
            width:32, height:32,
            border:"2.5px solid "+Gray200, borderTopColor:Purple,
            borderRadius:"50%",
            margin:"0 auto 12px",
            animation:"cvfSpin 1s linear infinite",
          }}/>
          {T.cust_suggest_loading}
        </div>
      )}
    </div>
  );
}

// ============================================================
// CustomizeSheet v17 : sheet bottom iOS-native pour la personnalisation
// du CV rendu (couleurs + polices + suggestions IA).
//
// Architecture :
// - Tabs pills : Couleurs / Polices / Suggestions IA
// - Toggle scope : Style par defaut (global) / Cette version (override)
// - Reset au theme en bas
//
// Etape 1 : skeleton (tabs vides). Les contenus arrivent en etapes 2-4.
// ============================================================
function CustomizeSheet({ T, cv, theme, cvCustom, setCvCustom, setCvFn,
  apiKey, notify, locale, onClose }) {

  // Scope : "global" ou "version" - quel custom on edite.
  const [scope, setScope] = useState("global");
  // Tab principal : "colors" | "fonts" | "suggest"
  const [tab, setTab] = useState("colors");

  // Lit / ecrit le custom selon le scope choisi.
  const versionCustom = (cv && cv.custom && typeof cv.custom === "object") ? cv.custom : null;
  const currentCustom = scope === "global" ? cvCustom : versionCustom;

  const writeCustom = useCallback((mutator) => {
    if (scope === "global") {
      setCvCustom(prev => {
        const base = prev || {};
        const next = mutator({ ...base });
        // Si tout est vide, on remet null pour garder lsS propre.
        if (!next || Object.keys(next).length === 0) return null;
        return next;
      });
    } else {
      // Override de version : on ecrit dans cv.custom.
      setCvFn(prev => {
        const base = prev.custom || {};
        const next = mutator({ ...base });
        if (!next || Object.keys(next).length === 0) {
          const { custom, ...rest } = prev;
          return rest;
        }
        return { ...prev, custom: next };
      });
    }
  }, [scope, setCvCustom, setCvFn]);

  const resetCurrent = () => {
    if (scope === "global") {
      setCvCustom(null);
    } else {
      setCvFn(prev => {
        const { custom, ...rest } = prev;
        return rest;
      });
    }
    notify(T.cust_resetted);
  };

  // Pill style (re-usable in this sheet)
  const pill = (active) => ({
    flex:1, padding:"10px 12px", borderRadius:RadiusPill,
    background:active ? GradPurple : "var(--nuvi-paper)",
    color:active ? "#fff" : "var(--nuvi-ink)",
    border:"0.5px solid "+(active ? "transparent" : "var(--nuvi-hairline)"),
    fontFamily:Sans, fontWeight:active ? 600 : 500, fontSize:12,
    transition:"all 180ms ease-out",
    cursor:"pointer",
  });

  return (
    <Sheet
      eyebrow={T.cust_eyebrow}
      title={
        <>
          {T.cust_title_a}{" "}
          <em style={{
            fontFamily:Serif, fontStyle:"italic",
            background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
            WebkitBackgroundClip:"text",
            WebkitTextFillColor:"transparent",
            backgroundClip:"text",
            paddingRight:"0.15em",
            display:"inline-block",
          }}>{T.cust_title_em}</em>
          {T.cust_title_b}
        </>
      }
      onClose={onClose}
    >
      <p style={{
        fontSize:13, color:Gray600, lineHeight:1.5,
        margin:"0 0 16px", fontFamily:Sans,
      }}>{T.cust_sub}</p>

      {/* Toggle scope : global / version */}
      <div style={{display:"flex", gap:8, marginBottom:6}}>
        <button onClick={()=>setScope("global")} style={{...B(pill(scope==="global"))}}>
          {T.cust_scope_global}
        </button>
        <button onClick={()=>setScope("version")} style={{...B(pill(scope==="version"))}}>
          {T.cust_scope_version}
        </button>
      </div>
      <div style={{
        fontSize:11, color:Gray600, lineHeight:1.5,
        marginBottom:18, fontFamily:Sans,
      }}>
        {scope === "global" ? T.cust_scope_global_hint : T.cust_scope_version_hint}
      </div>

      {/* Tabs principaux */}
      <div style={{
        display:"flex", gap:6, marginBottom:18,
      }}>
        {[["colors", T.cust_tab_colors],
          ["fonts",  T.cust_tab_fonts],
          ["suggest",T.cust_tab_suggest]].map(([k, label]) => (
            <button key={k} onClick={()=>setTab(k)} style={{...B(pill(tab===k))}}>
              {label}
            </button>
          ))}
      </div>

      {/* Tab content */}
      {tab === "colors" && (
        <ColorsTab
          T={T} scope={scope} theme={theme}
          cvCustom={cvCustom} versionCustom={versionCustom}
          writeCustom={writeCustom}
        />
      )}
      {tab === "fonts" && (
        <FontsTab
          T={T} scope={scope} theme={theme}
          cvCustom={cvCustom} versionCustom={versionCustom}
          writeCustom={writeCustom}
        />
      )}
      {tab === "suggest" && (
        <SuggestTab
          T={T} cv={cv} locale={locale} apiKey={apiKey}
          notify={notify} scope={scope} writeCustom={writeCustom}
        />
      )}

      {/* Reset bouton */}
      {currentCustom && (
        <button onClick={resetCurrent} style={{
          ...B({
            width:"100%", padding:"12px 16px", borderRadius:RadiusMd,
            background:CoralSoft, color:Coral,
            border:"0.5px solid "+Coral,
            fontSize:13, fontWeight:500, fontFamily:Sans,
            marginTop:24,
            transition:"all 200ms ease-out",
          })
        }}>{T.cust_reset}</button>
      )}
    </Sheet>
  );
}


export default function App() {
  // === HYDRATION-SAFE STATE INITIALIZATION ===
  // All states that depend on localStorage or window are initialized to
  // deterministic defaults. They are hydrated from localStorage in a useEffect
  // below, AFTER the first client render matches the server render.
  // This eliminates React hydration errors #418 / #423.
  const [hydrated, setHydrated] = useState(false);

  const [cv, setCV_]       = useState(EMPTY);
  const [thN, setThN_]     = useState("executive");
  const [layout, setLy_]   = useState("sidebar");
  const [apiKey, setAK_]   = useState("server-managed");
  const [locale, setLc_]   = useState("fr");
  const [tab, setTab]       = useState("ai");
  const [aiMode, setAiMode] = useState("generate");
  const [load, setLoad]     = useState(false);
  const [notif, setNotif]   = useState("");
  const [modal, setModal]   = useState(null);
  const [showCV, setShowCV] = useState(true);
  const [mob, setMob]       = useState(false);
  const [hist, setHist]     = useState([]);
  const [cvW, setCvW]       = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [obMode, setObMode] = useState(null);
  const [obRaw, setObRaw]   = useState("");
  const [obImp, setObImp]   = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);  // [Nuvi v2] AdjustModal sliding from right
  const [auditCountry, setAuditCountry] = useState("FR");
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult]   = useState(null);
  const [auditMsgIdx, setAuditMsgIdx]   = useState(0);
  const [showTranslate, setShowTranslate] = useState(false);
  const [trDir, setTrDir] = useState("fr_en");
  const [trLoading, setTrLoading] = useState(false);
  const [trMsgIdx, setTrMsgIdx] = useState(0);
  const [hasBackup, setHasBackup] = useState(false);
  const [adjPrefill, setAdjPrefill] = useState("");
  const [kwLoading, setKwLoading] = useState(false);
  const [showPack, setShowPack]   = useState(false);
  const [packLoading, setPackLoading] = useState(false);
  const [packResult, setPackResult]   = useState(null);
  const [packMsgIdx, setPackMsgIdx]   = useState(0);
  const [packCtx, setPackCtx]         = useState(null);
  const [showPos, setShowPos]         = useState(false);
  const [posLoading, setPosLoading]   = useState(false);
  const [posResult, setPosResult]     = useState(null);
  const [showTruth, setShowTruth]     = useState(false);
  const [truthLoading, setTruthLoading] = useState(false);
  const [truthResult, setTruthResult] = useState(null);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions]       = useState([]);
  const [bt, setBt]                   = useState(null);
  // v17 : phase Cibler
  const [offerResult, setOfferResult] = useState(null);
  const [showOffer, setShowOffer]     = useState(false);
  // v17 : phase Finaliser
  const [showScore, setShowScore]     = useState(false);
  // v17 chantier 4 : Score Dashboard 8 axes (resultat IA persiste pour la session).
  const [dashLoading, setDashLoading] = useState(false);
  const [dashResult, setDashResult]   = useState(null);
  // v17 chantier 5 : Gap Repair (Lisser le parcours)
  const [showGapRepair, setShowGapRepair] = useState(false);
  // v17 chantier 6 : Interview Continuity (Preparer l'entretien)
  const [showInterview, setShowInterview] = useState(false);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [interviewResult, setInterviewResult] = useState(null);
  const [interviewOffer, setInterviewOffer] = useState("");
  // v2 Interview Continuity : round + questions to ask
  const [interviewRound, setInterviewRound] = useState("all"); // "all"|"hr"|"manager"|"board"
  const [askRecruiterLoading, setAskRecruiterLoading] = useState(false);
  const [askRecruiterResult, setAskRecruiterResult] = useState(null);
  // v2 Tab Apres : contexte + email + debrief
  const [afterContext, setAfterContext] = useState({
    recruiterName: "", type: "video", duration: "", date: "", recap: "",
  });
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailResult, setEmailResult] = useState(null); // { subject, body }
  const [emailTone, setEmailTone] = useState("warm"); // warm|pro|concise|assertive
  const [debriefLoading, setDebriefLoading] = useState(false);
  const [debriefResult, setDebriefResult] = useState(null);
  // v2 Tab Pendant : pense-bete + pack PDF
  const [cheatSheetLoading, setCheatSheetLoading] = useState(false);
  const [cheatSheetResult, setCheatSheetResult] = useState(null);
  const [packPdfLoading, setPackPdfLoading] = useState(false);
  // v17 chantier 7 : Coach IA conversationnel
  const [showCoach, setShowCoach] = useState(false);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachMessages, setCoachMessages] = useState([]);
  // [Glass Coach v1] Status live affiche pendant le travail de Nuvi.
  // Cycle: 'reading' -> 'analyzing' -> 'applying' -> 'done' -> null
  const [coachStatus, setCoachStatus] = useState(null);
  // Coach button : position custom, count d'usage, drag mode, scroll detection
  const [coachPos, setCoachPos] = useState(null); // {x, y} ou null = position par défaut
  const [coachUsageCount, setCoachUsageCount] = useState(0);
  const [coachDragging, setCoachDragging] = useState(false);
  const [coachScrolling, setCoachScrolling] = useState(false);
  const coachLongPressTimer = useRef(null);
  const coachDragStartRef = useRef(null);
  const coachScrollTimerRef = useRef(null);
  // NuviIntro : présentation initiale du compagnon
  const [showIntro, setShowIntro] = useState(false);
  const [showIntroBubble, setShowIntroBubble] = useState(false); // bulle "Clique sur moi"
  const [introOrigin, setIntroOrigin] = useState(null); // { x, y } position de départ
  // v17 chantier 8 : Export LinkedIn
  const [showLinkedIn, setShowLinkedIn] = useState(false);
  const [linkedInLoading, setLinkedInLoading] = useState(false);
  const [linkedInResult, setLinkedInResult] = useState(null);
  // v17 chantier 9 : CV Compare
  const [showCompare, setShowCompare] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareResult, setCompareResult] = useState(null);
  const [comparePickA, setComparePickA] = useState(null);
  const [comparePickB, setComparePickB] = useState(null);
  // v17 chantier 10 : Applications Tracker
  const [showApplications, setShowApplications] = useState(false);
  const [applications, setApplications] = useState([]);
  // v17 chantier 11 : Multi-CV strategie
  const [showMultiCV, setShowMultiCV] = useState(false);
  const [multiCVLoading, setMultiCVLoading] = useState(false);
  const [multiCVResult, setMultiCVResult] = useState(null);
  const [multiCVOffer, setMultiCVOffer] = useState("");
  // v17 chantier 12 : Tutorial
  const [showTutorial, setShowTutorial] = useState(false);
  // === Tutorial Nuvi v3 demo handlers ===
  const [tutorialDemoMode, setTutorialDemoMode] = useState(false);
  const tutorialBackupCV = useRef(null);

  const tutLoadDemoCV = useCallback((demoCV) => {
    tutorialBackupCV.current = cv;
    setCV_(demoCV);
  }, [cv]);

  const tutRestoreCV = useCallback(() => {
    if (tutorialBackupCV.current) {
      setCV_(tutorialBackupCV.current);
      tutorialBackupCV.current = null;
    }
  }, []);

  const tutOpenModal = useCallback((modalKey) => {
    if (modalKey === "open-coach") setShowCoach(true);
    else if (modalKey === "open-match") setShowOffer(true);
    else if (modalKey === "open-pack") {
      setPackCtx({ offer: "Marketing Manager B2B", matchRes: null });
      setShowPack(true);
    }
    else if (modalKey === "open-score") setShowScore(true);
    else if (modalKey === "open-truth") setShowTruth(true);
    else if (modalKey === "open-gap") setShowGapRepair(true);
    else if (modalKey === "open-positioning") setShowPos(true);
    else if (modalKey === "open-interview") setShowInterview(true);
    else if (modalKey === "open-multicv") setShowMultiCV(true);
    else if (modalKey === "open-versions") setShowVersions(true);
    else if (modalKey === "open-compare") setShowCompare(true);
    else if (modalKey === "open-customize") setShowCustomize(true);
    else if (modalKey === "open-translate") setShowTranslate(true);
    else if (modalKey === "open-linkedin") setShowLinkedIn(true);
    else if (modalKey === "open-audit") setShowAudit(true);
    else if (modalKey === "open-tracker") setShowApplications(true);
    else if (modalKey === "open-adjust") setShowAdjust(true);
  }, []);

  const tutCloseModal = useCallback(() => {
    setShowCoach(false);
    setShowOffer(false);
    setShowPack(false);
    setShowScore(false);
    setShowTruth(false);
    setShowGapRepair(false);
    setShowPos(false);
    setShowInterview(false);
    setShowMultiCV(false);
    setShowVersions(false);
    setShowCompare(false);
    setShowCustomize(false);
    setShowTranslate(false);
    setShowLinkedIn(false);
    setShowAudit(false);
    setShowApplications(false);
    setShowAdjust(false);
  }, []);
  // v17 chantier 13 : Dark mode (interface uniquement, le CV reste clair)
  const [darkMode, setDarkMode] = useState(false);
  // v17 chantier 14 : Settings panel
  const [showSettings, setShowSettings] = useState(false);
  // NuviSidebar : section active (home, coach, target, pack, score, cvs, design, tracking)
  const [navSection, setNavSection] = useState("home");
  // v17 chantier 15 : Auto-save indicator
  const [autoSaved, setAutoSaved] = useState(false);
  // [Deploy A] Reset CV + Auto-save indicator
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showAccountSoon, setShowAccountSoon] = useState(false);
  // [Deploy B+] Smart PDF export modal (when CV overflows A4)
  const [showExportModal, setShowExportModal] = useState(false);
  const [cvPageCount, setCvPageCount] = useState(1);
  // v17 : Customize CV (couleurs + polices)
  // cvCustom = custom global (applique partout par defaut).
  // versionCustom est lu depuis cv.custom (par-version) si present.
  const [cvCustom, setCvCustom_]      = useState(null);
  const [showCustomize, setShowCustomize] = useState(false);
  const cRef = useRef();
  // === Nuvi Reactions (presence vivante) ===
  const { expression: nuviExpression, mode: nuviMode, bigLogoActive, triggerEvent: nuviTrigger } = useNuviReactions();

  // === [v15] Solution simple : paste flash + Konami code en local ===
  const [pasteFlash, setPasteFlash] = useState(false);
  const [bigLogoOpen, setBigLogoOpen] = useState(false);

  // Listener paste : flash blanc 200ms quand l'utilisateur colle
  useEffect(() => {
    const onPaste = () => {
      setPasteFlash(true);
      setTimeout(() => setPasteFlash(false), 200);
      // Trigger aussi le wink Nuvi via le hook
      if (typeof nuviTrigger === 'function') nuviTrigger('paste-detected');
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [nuviTrigger]);

  // Listener Konami code : Up Up Down Down Left Right Left Right B A
  useEffect(() => {
    const seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','KeyB','KeyA'];
    let buf = [];
    const onKey = (e) => {
      buf.push(e.code);
      if (buf.length > seq.length) buf.shift();
      if (buf.length === seq.length && buf.every((k,i) => k === seq[i])) {
        setBigLogoOpen(true);
        setTimeout(() => setBigLogoOpen(false), 3500);
        buf = [];
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Hydrate from localStorage AFTER first render. This is the only safe
  // moment to read localStorage in a Next.js / SSR context.
  useEffect(() => {
    const savedCV = lsG(SK.CV, null);
    if (savedCV) {
      setCV_({
        ...EMPTY, ...savedCV,
        skills:         Array.isArray(savedCV.skills)         ? savedCV.skills         : EMPTY.skills,
        languages:      Array.isArray(savedCV.languages)      ? savedCV.languages      : EMPTY.languages,
        certifications: Array.isArray(savedCV.certifications) ? savedCV.certifications : EMPTY.certifications,
        experience:     Array.isArray(savedCV.experience)     ? savedCV.experience     : EMPTY.experience,
        education:      Array.isArray(savedCV.education)      ? savedCV.education      : EMPTY.education,
      });
    }
    const savedTh = lsG(SK.TH, "executive");
    if (savedTh !== "executive") setThN_(savedTh);
    const savedLy = lsG(SK.LY, "sidebar");
    if (savedLy !== "sidebar") setLy_(savedLy);
    const savedKy = lsG(SK.KY, "");
    if (savedKy) setAK_(savedKy);
    const savedLc = lsG(SK.LC, "fr");
    if (savedLc !== "fr") setLc_(savedLc);
    const savedVs = lsG(SK.VS, []);
    if (Array.isArray(savedVs) && savedVs.length) setVersions(savedVs);
    const savedCt = lsG(SK.CT, null);
    if (savedCt && typeof savedCt === "object") setCvCustom_(savedCt);
    // Load coach conversation history (cap a 50 derniers messages)
    const savedCo = lsG(SK.CO, []);
    if (Array.isArray(savedCo) && savedCo.length) {
      setCoachMessages(savedCo.slice(-50));
    }
    // [Deploy A] Hydrate lastSavedAt for "Saved Xs ago" indicator
    const savedLastSaved = lsG("nv-last-saved", null);
    if (typeof savedLastSaved === "number") setLastSavedAt(savedLastSaved);
    // Load coach button position custom (drag persistance)
    const savedCp = lsG("nv-coach-pos", null);
    if (savedCp && typeof savedCp === "object" && typeof savedCp.x === "number" && typeof savedCp.y === "number") {
      setCoachPos(savedCp);
    }
    // Load coach usage count (pour shrink apres N utilisations)
    const savedCu = lsG("nv-coach-usage", 0);
    if (typeof savedCu === "number" && savedCu > 0) {
      setCoachUsageCount(savedCu);
    }
    // NuviIntro est desactive : NuviHome remplace l'introduction premiere visite.
    // NuviIntro reste accessible via "Rejouer la presentation Nuvi" dans Settings (replayIntro callback).
    // Le flag nv-intro-seen est mis a true par defaut pour eviter tout trigger.
    lsS("nv-intro-seen", true);
    // Load applications tracker
    const savedAp = lsG(SK.AP, []);
    if (Array.isArray(savedAp) && savedAp.length) {
      setApplications(savedAp);
    }
    // Load dark mode preference
    const savedDk = lsG(SK.DK, false);
    if (savedDk === true) setDarkMode(true);
    // Tutorial : auto-launch si jamais vu
    const tutSeen = lsG(SK.TU, false);
    if (tutSeen !== true) {
      // On lance apres 800ms pour laisser l'app se stabiliser
      setTimeout(() => setShowTutorial(true), 800);
    }
    setHydrated(true);
  }, []);

  // Setter persiste pour le custom global.
  const setCvCustom = useCallback(fn => setCvCustom_(p => {
    const n = typeof fn === "function" ? fn(p) : fn;
    lsS(SK.CT, n);
    return n;
  }), []);

  const setCVFn = useCallback(fn => setCV_(p => {
    const n = typeof fn==="function" ? fn(p) : fn;
    lsS(SK.CV, n);
    // v17 : auto-save indicator (legacy boolean, kept for compat)
    setAutoSaved(true);
    // [Deploy A] Timestamp for "saved Xs ago" indicator
    const now = Date.now();
    setLastSavedAt(now);
    try { lsS("nv-last-saved", now); } catch (e) {}
    return n;
  }), []);

  // Auto-reset l'indicator apres 1.5s.
  useEffect(() => {
    if (!autoSaved) return;
    const t = setTimeout(() => setAutoSaved(false), 1500);
    return () => clearTimeout(t);
  }, [autoSaved]);

  // v17 fix TDZ : cvIsEmpty doit etre declare AVANT le useEffect du Cmd+K
  // qui le reference dans son deps array. Sinon ReferenceError au mount.
  const cvIsEmpty = !cv.name && !cv.title && !cv.summary
    && cv.experience.every(e => !e.title && !e.company);

  // NuviLoadingOverlay : determine quel loading est actif et quelle serie afficher
  const loadingState = useMemo(() => {
    // Generation CV (le plus important - serie "generation")
    if (load) return { active: true, series: "generation" };
    // Import CV au demarrage (parsing, le moment crucial UX)
    if (obImp) return { active: true, series: "generation" };
    // Audit ATS
    if (auditLoading) return { active: true, series: "audit" };
    // Match offre / keywords
    if (kwLoading) return { active: true, series: "match" };
    // Interview prep
    if (interviewLoading) return { active: true, series: "interview" };
    // Autres loadings (generic series)
    if (trLoading || packLoading || posLoading || truthLoading
        || dashLoading || askRecruiterLoading || emailLoading
        || debriefLoading || cheatSheetLoading || packPdfLoading
        || linkedInLoading || compareLoading || multiCVLoading) {
      return { active: true, series: "generic" };
    }
    return { active: false, series: "generic" };
  }, [load, obImp, auditLoading, kwLoading, interviewLoading, trLoading, packLoading,
      posLoading, truthLoading, dashLoading, askRecruiterLoading, emailLoading,
      debriefLoading, cheatSheetLoading, packPdfLoading, linkedInLoading,
      compareLoading, multiCVLoading]);

  // Donnees user pour personnaliser les messages NuviLoadingMessages
  const loadingUser = useMemo(() => ({
    nom: cv.name || "",
    metier: cv.title || "",
    secteur: (cv.experience && cv.experience[0] && cv.experience[0].company) || "",
    annees: cv.experience ? cv.experience.length : 0,
  }), [cv.name, cv.title, cv.experience]);

  // v17 chantier 16 : Raccourcis clavier globaux.
  useEffect(() => {
    if (!hydrated) return;
    const onKey = (e) => {
      // Ne pas intercepter si l'user est en train de taper dans un input/textarea
      const tag = (e.target && e.target.tagName) || "";
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || (e.target && e.target.isContentEditable);
      const cmdOrCtrl = e.metaKey || e.ctrlKey;
      // Esc : ferme le modal actif (chaque modal a deja son propre handler Esc, donc rien a faire ici)
      // Cmd+S : export PDF (uniquement si pas de modal ouvert et pas en train de taper)
      if (cmdOrCtrl && e.key === "s" && !isTyping) {
        e.preventDefault();
        if (typeof exportPDF === "function") exportPDF();
      }
      // Cmd+K : ouvre coach
      if (cmdOrCtrl && e.key === "k") {
        e.preventDefault();
        if (!cvIsEmpty) setShowCoach(true);
      }
      // Cmd+, : ouvre reglages (la virgule est le standard mac pour preferences)
      if (cmdOrCtrl && e.key === ",") {
        e.preventDefault();
        setShowSettings(true);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [hydrated, cvIsEmpty]);  // exportPDF defined after, mais useCallback re-created => on l'evite ici (hoisting)

  const setTh = useCallback(v => { setThN_(v); lsS(SK.TH, v); }, []);
  const setLy = useCallback(v => { setLy_(v);  lsS(SK.LY, v); }, []);
  const setAK = useCallback(v => { setAK_(v);  lsS(SK.KY, v); }, []);
  const setLc = useCallback(v => { setLc_(v);  lsS(SK.LC, v); }, []);

  // === v17 : phase router ===
  // Expose un setPhase qui pilote le couple (tab, aiMode) pour rester compat
  // avec tout le code legacy qui aiguille via setTab/setAiMode.
  // phase : "start" | "target" | "finalize"
  const phase = phaseFromTab(tab);
  const setPhase = useCallback(p => {
    const m = tabFromPhase(p);
    setTab(m.tab);
    if (m.aiMode) setAiMode(m.aiMode);
  }, []);

  const T = locale==="en" ? EN_T : FR_T;
  const theme = THEMES[thN] || THEMES.executive;

  // v17 : custom theme effectif (theme < global custom < version custom).
  // Le custom par-version est stocke directement dans cv.custom.
  const versionCustom = (cv && cv.custom && typeof cv.custom === "object") ? cv.custom : null;
  const effTheme = mergeTheme(theme, cvCustom, versionCustom);

  // Charge dynamiquement les Google Fonts custom des qu'elles changent.
  useEffect(() => {
    ensureCustomFontsLoaded(cvCustom, versionCustom);
  }, [cvCustom, versionCustom]);

  // v17 chantier 5 : analyse de chronologie pour Gap Repair.
  // Tout est calcule a partir de cv.experience, donc on memoize
  // pour eviter de re-calculer a chaque render.
  const gapAnalysis = useMemo(() => {
    const exps = cv && cv.experience ? cv.experience : [];
    if (exps.length < 2) {
      return { gaps: [], yearStrategy: null, groupOps: [], unparsableCount: 0 };
    }
    const gaps = detectGaps(exps, 1);
    const yearStrategy = analyzeYearOnlyStrategy(exps, 1);
    const groupOps = findGroupingOpportunities(exps);
    const unparsableCount = countUnparsable(exps);
    return { gaps, yearStrategy, groupOps, unparsableCount };
  }, [cv]);

  const notify = useCallback(msg => {
    setNotif(msg);
    setTimeout(() => setNotif(""), 3000);
  }, []);

  const pushH = useCallback(() => setCV_(c => {
    setHist(h => [...h.slice(-11), c]);
    return c;
  }), []);

  const undo = useCallback(() => {
    setHist(h => {
      if (!h.length) { notify(T.nu); return h; }
      const p = h[h.length-1];
      setCV_(p);
      lsS(SK.CV, p);
      notify(T.oku);
      return h.slice(0,-1);
    });
  }, [T, notify]);

  useEffect(() => {
    const c = () => setMob(window.innerWidth < 800);
    c();
    window.addEventListener("resize", c);
    return () => window.removeEventListener("resize", c);
  }, []);

  useEffect(() => {
    if (!cRef.current) return;
    const ro = new ResizeObserver(es => {
      for (const e of es) setCvW(e.contentRect.width);
    });
    ro.observe(cRef.current);
    return () => ro.disconnect();
  }, []);

  const scale = cvW > 0 ? Math.min(1, (cvW-16)/794) : 1;
  const cvH   = Math.round(1123 * scale);

  const handleGen = useCallback(async p => {
    if (!apiKey) { notify(T.nk); return; }
    pushH();
    setLoad(true);
    try {
      const txt = await aiCall(p);
      const json = parseJSON(txt);
      setCVFn(() => normCV(json));
      notify(T.ok);
    } catch { notify(T.ea); }
    setLoad(false);
  }, [apiKey, T, pushH, setCVFn, notify]);

  // [Deploy B+] Hauteur d'une page A4 en pixels a 96 DPI : 297mm = 1123px
  // Tolerance pour considerer "1 page" : 1.1 page (= un peu de debordement OK)
  const A4_HEIGHT_PX = 1123;
  const A4_TOLERANCE = 1.10;

  // Mesure la hauteur reelle du CV preview en pixels
  const measureCVHeight = useCallback(() => {
    const el = document.getElementById("cv-print");
    if (!el) return 0;
    // Use scrollHeight to get the FULL content height even if scrolled or clipped
    return el.scrollHeight || el.getBoundingClientRect().height || 0;
  }, []);

  // [Deploy B+] Helper : run html2pdf with given options
  // Cleans the CV (removes empty sections/items) BEFORE snapshot for a homogeneous
  // PDF, then restores the original CV. Also strips wrapper minHeight to avoid
  // blank bottom band. Returns the cleanup report so we can notify the user.
  // [Bande blanche fix v3] Direct html2canvas + jsPDF approach.
  // Bypass html2pdf's auto-page logic which forces A4 height. Instead :
  //   1. Capture the CV inner element (not the wrapper) with html2canvas at real height
  //   2. Calculate how many A4 pages fit
  //   3. Slice the canvas into A4-sized images and append to jsPDF
  //   4. Last page gets trimmed to actual content height (NO blank band)
  //
  // options : {
  //   filename : string,
  //   mode     : "single" | "multi" | "long",
  //     single = exactly 1 A4 page (scaled to fit if too tall)
  //     multi  = multi-page A4, last page trimmed to content
  //     long   = single page with custom height = content height
  // }
  const runHtml2Pdf = useCallback((options) => {
    return new Promise((resolve, reject) => {
      const el = document.getElementById("cv-print");
      if (!el) { reject(new Error("CV element not found")); return; }

      // 1. Clean CV (remove empty sections/items for clean PDF)
      const { cleanedCv, removed } = cleanCVForExport(cv);

      // 2. Backup original CV and swap to cleaned version
      const originalCv = cv;
      setCV_(cleanedCv);

      // 3. Find wrapper for minHeight stripping
      const wrapper = el.closest('[data-cvf="cv"]');

      const stripMinHeights = () => {
        const stripped = [];
        if (wrapper) {
          stripped.push({ node: wrapper, prev: wrapper.style.minHeight });
          wrapper.style.minHeight = "0";
        }
        stripped.push({ node: el, prev: el.style.minHeight });
        el.style.minHeight = "0";
        el.querySelectorAll("*").forEach(node => {
          if (node.style && node.style.minHeight) {
            stripped.push({ node, prev: node.style.minHeight });
            node.style.minHeight = "0";
          }
        });
        return stripped;
      };

      let stripped = [];

      const restore = () => {
        stripped.forEach(({ node, prev }) => {
          if (node && node.style) node.style.minHeight = prev || "";
        });
        setCV_(originalCv);
      };

      const notifyCleanup = () => {
        if (removed.sections.length > 0 || removed.items > 0) {
          const sum = getRemovedSummary(removed, locale);
          if (sum) {
            setTimeout(() => {
              notify(locale === "en"
                ? "Hidden for clean export : " + sum
                : "Masque pour un export propre : " + sum);
            }, 600);
          }
        }
      };

      const doExport = async () => {
        // Wait for React flush + strip minHeights
        await new Promise(r => setTimeout(r, 80));
        stripped = stripMinHeights();
        // eslint-disable-next-line no-unused-expressions
        el.offsetHeight; // force reflow
        await new Promise(r => setTimeout(r, 30));

        try {
          if (document.fonts && document.fonts.ready) await document.fonts.ready;
        } catch {}

        // [v5 fix] Use the FULL #cv-print element, NOT firstElementChild.
        // The CV is a flex container with sidebar + content. Using firstElementChild
        // captures only the sidebar (or only the content), losing half the CV.
        // We measure the FULL element instead.
        const target = el;
        const contentH = target.scrollHeight;
        const contentW = target.scrollWidth || target.offsetWidth || 794;

        // Convert content height to mm
        // CV preview is 794px wide which maps to 210mm (A4 width)
        const PX_TO_MM = 210 / 794;
        const contentHmm = contentH * PX_TO_MM;

        const A4_W_MM = 210;
        const A4_H_MM = 297;

        const mode = options.mode || "single";
        const fname = options.filename || "CV.pdf";

        // Build html2pdf config based on mode
        let pdfFormat;
        let pageBreakMode;

        if (mode === "long") {
          // Single very-long page, custom height
          pdfFormat = [A4_W_MM, Math.max(A4_H_MM, contentHmm)];
          pageBreakMode = ["css"];
        } else if (mode === "multi") {
          // Multi-page A4, html2pdf will paginate automatically
          pdfFormat = "a4";
          pageBreakMode = ["css", "legacy"];
        } else {
          // SINGLE mode : custom format = exact content height (NO blank band)
          // If CV is super short (< 55% A4), keep min height to avoid postcard-look
          const MIN_RATIO = 0.55;
          const finalHmm = Math.max(contentHmm, A4_H_MM * MIN_RATIO);
          pdfFormat = [A4_W_MM, finalHmm];
          pageBreakMode = ["css"];
        }

        const html2pdfOptions = {
          margin: 0,
          filename: fname,
          image: { type: "jpeg", quality: 0.96 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            // Don't force width — let html2canvas use the natural element width
            // (forcing windowWidth breaks flex layouts and crops sidebar)
            scrollX: 0,
            scrollY: 0,
          },
          jsPDF: {
            unit: "mm",
            format: pdfFormat,
            orientation: "portrait",
          },
          pagebreak: {
            mode: pageBreakMode,
            avoid: [".cv-exp-item", ".cv-edu-item", ".cv-section-no-break"],
          },
        };

        try {
          await window.html2pdf().set(html2pdfOptions).from(target).save();
          restore();
          notifyCleanup();
          resolve();
        } catch (err) {
          console.error("[PDF export]", err);
          restore();
          reject(err);
        }
      };

      // Load html2pdf bundle if not already loaded
      if (window.html2pdf) {
        doExport();
      } else {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
        s.onerror = () => { restore(); notify("Erreur chargement PDF"); reject(new Error("script load failed")); };
        s.onload = doExport;
        document.head.appendChild(s);
      }
    });
  }, [cv, notify, locale]);

  // [Bande blanche v3] Export PDF en multi-pages A4 avec coupure intelligente
  // La derniere page est rognee exactement a la hauteur du contenu (pas de bande)
  const exportPDFTwoPages = useCallback(async () => {
    const fname = "CV_" + (cv.name || "Nuvi").split(" ").join("_") + ".pdf";
    try {
      await runHtml2Pdf({ filename: fname, mode: "multi" });
      notify(T.okp + ": " + fname);
      if (typeof nuviTrigger === "function") nuviTrigger("cv-exported");
    } catch (err) {
      console.error("[exportPDF multi]", err);
      notify("Erreur export PDF");
    }
  }, [cv.name, T, notify, runHtml2Pdf]);

  // [Bande blanche v3] Export PDF en 1 page longue (hauteur custom)
  const exportPDFLongPage = useCallback(async () => {
    const fname = "CV_" + (cv.name || "Nuvi").split(" ").join("_") + ".pdf";
    try {
      await runHtml2Pdf({ filename: fname, mode: "long" });
      notify(T.okp + ": " + fname);
      if (typeof nuviTrigger === "function") nuviTrigger("cv-exported");
    } catch (err) {
      console.error("[exportPDF long]", err);
      notify("Erreur export PDF");
    }
  }, [cv.name, T, notify, runHtml2Pdf]);

  // [Bande blanche v3] Export PDF "smart" : si CV tient sur 1 page, on l'envoie direct
  // Sinon ouvre la modale.
  const exportPDFSinglePage = useCallback(async () => {
    const fname = "CV_" + (cv.name || "Nuvi").split(" ").join("_") + ".pdf";
    try {
      await runHtml2Pdf({ filename: fname, mode: "single" });
      notify(T.okp + ": " + fname);
      if (typeof nuviTrigger === "function") nuviTrigger("cv-exported");
    } catch (err) {
      console.error("[exportPDF single]", err);
      notify("Erreur export PDF");
    }
  }, [cv.name, T, notify, runHtml2Pdf]);

  const exportPDF = useCallback(() => {
    // Measure raw height first (current state of DOM)
    const heightPx = measureCVHeight();

    // Estimate height reduction from cleaning (each empty section saves ~80px,
    // each empty item saves ~25px). Rough heuristic for the decision.
    const { removed } = cleanCVForExport(cv);
    const estimatedCleaning = removed.sections.length * 80 + removed.items * 25;
    const estimatedCleanedHeight = Math.max(0, heightPx - estimatedCleaning);
    const pageCount = estimatedCleanedHeight / A4_HEIGHT_PX;

    if (pageCount <= A4_TOLERANCE) {
      // CV tient sur 1 page A4 (ou tres peu de debordement) -> export simple
      exportPDFSinglePage();
      return;
    }

    // CV deborde : ouvre la modale de choix
    setCvPageCount(pageCount);
    setShowExportModal(true);
  }, [measureCVHeight, exportPDFSinglePage, cv]);

  const doReset = useCallback(() => {
    if (!window.confirm(T.conf)) return;
    pushH();
    setCVFn(() => EMPTY);
    notify(T.okr);
  }, [T, pushH, setCVFn, notify]);

  const auditMessages = [
    "Analyse de ton parcours en cours...",
    "Comparaison aux standards du marche local...",
    "Identification des forces et faiblesses...",
    "Verification des mots-cles ATS...",
    "Evaluation de la longueur et structure...",
    "Generation des recommandations...",
  ];
  
  useEffect(() => {
    if (!auditLoading) return;
    const interval = setInterval(() => {
      setAuditMsgIdx(i => (i + 1) % auditMessages.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [auditLoading]);

  useEffect(() => {
    setHasBackup(!!lsG(SK.BK));
  }, []);

  useEffect(() => {
    if (!trLoading) return;
    const interval = setInterval(() => {
      setTrMsgIdx(i => (i + 1) % T.tr_msgs.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [trLoading, T]);
  
  const runAudit = useCallback(async () => {
    setAuditLoading(true);
    setAuditResult(null);
    setAuditMsgIdx(0);
    
    const expT = cv.experience.map(e =>
      e.title + " chez " + e.company + " (" + e.period + "): "
      + e.bullets.filter(b=>b).join("; ")
    ).join(" | ");
    const cvT = "Nom: " + cv.name + "\nTitre: " + cv.title
      + "\nLocalisation: " + cv.location
      + "\nAccroche: " + cv.summary
      + "\nExperiences: " + expT
      + "\nFormations: " + cv.education.map(e=>e.degree+" - "+e.school+" ("+e.period+")").join(" | ")
      + "\nCompetences: " + cv.skills.filter(s=>s).join(", ")
      + "\nLangues: " + cv.languages.filter(l=>l.lang).map(l=>l.lang+" "+l.level).join(", ")
      + "\nCertifications: " + cv.certifications.filter(c=>c).join(", ");
    
    const countryName = ({
      FR: "France", UK: "Royaume-Uni", US: "Etats-Unis", DE: "Allemagne",
      CH: "Suisse", BE: "Belgique", LU: "Luxembourg", ES: "Espagne",
      IT: "Italie", AE: "Emirats Arabes Unis", CA: "Canada", AUTO: "auto-detecte"
    })[auditCountry] || auditCountry;
    
    const p = "Tu es un recruteur senior expert du marche " + countryName + " avec 20 ans d'experience. "
      + "Audite ce CV du point de vue d'un recruteur qui le recevrait pour un poste senior. "
      + "Sois HONNETE, DIRECT, sans complaisance. Aucune diplomatie. "
      + "Tiens compte des codes specifiques du marche " + countryName + " (longueur, format, mots-cles, soft skills attendus).\n\n"
      + "CV:\n" + cvT + "\n\n"
      + "Reponds UNIQUEMENT en JSON valide strict, sans markdown:\n"
      + '{'
      + '"score_global":75,'
      + '"verdict_longueur":"trop long",'
      + '"longueur_recommandation":"Reduire de 30% - vise 1 page max pour ce profil sur le marche FR",'
      + '"forces":["force concrete 1","force 2","force 3"],'
      + '"faiblesses":["faiblesse precise 1 avec exemple","faiblesse 2","faiblesse 3"],'
      + '"suggestions":["suggestion actionnable 1","suggestion 2","suggestion 3","suggestion 4","suggestion 5"],'
      + '"mots_cles_manquants":["mot1","mot2","mot3"],'
      + '"premiere_impression":"Ce que je pense en 5 secondes en tant que recruteur sur ce marche",'
      + '"verdict_recruteur":"Je rappelle / Je passe / J\'hesite",'
      + '"raison_verdict":"Pourquoi ce verdict en 1-2 phrases"'
      + '}';
    
    try {
      const { value: r } = await cachedAiCall(
        "audit",
        cv,
        { country: auditCountry, locale },
        async () => {
          const txt = await aiCall(p, { cv, task_name: "audit" });
          return parseJSON(txt);
        }
      );
      setAuditResult(r);
      // Nuvi reaction selon score
      // v7 : trigger wizard pour audit ATS
      if (typeof nuviTrigger === 'function') nuviTrigger('audit-ats-done');
      if (typeof nuviTrigger === 'function' && r) {
        if (r.score >= 80) nuviTrigger('audit-excellent', { score: r.score });
        else if (r.score < 50) nuviTrigger('audit-low', { score: r.score });
        else nuviTrigger('feature-completed');
      }
    } catch (err) {
      notify("Audit: " + (err && err.message ? err.message : "erreur inconnue"));
    } finally {
      setAuditLoading(false);
    }
  }, [cv, auditCountry, locale, notify]);

  const applyAuditSuggestion = useCallback((suggestion) => {
    setShowAudit(false);
    setAuditResult(null);
    setAdjPrefill(suggestion);
    setTab("ai");
    setAiMode("adjust");
    notify(locale==="en" ? "Suggestion sent to Adjust" : "Suggestion envoyee dans Ajuster");
  }, [notify, locale]);

  const integrateKeywords = useCallback(async (keywords) => {
    if (!apiKey) { notify(T.nk); return; }
    if (!keywords || !keywords.length) return;
    setKwLoading(true);
    const kwList = keywords.join(", ");
    const p = "Tu es expert CV et ATS. Voici un CV au format JSON et une liste de mots-cles ATS a integrer naturellement.\n\n"
      + "REGLES STRICTES:\n"
      + "1. Integre les mots-cles dans les bullets de realisations et l'accroche, la ou c'est CONTEXTUELLEMENT pertinent.\n"
      + "2. Si un mot-cle ne peut pas etre integre naturellement, l'ajouter dans la liste skills plutot que de forcer.\n"
      + "3. INTERDIT: bourrage de mots-cles, repetition mecanique, phrases qui sonnent fake.\n"
      + "4. Preserve la structure JSON exacte, les IDs, les dates, les noms d'entreprises.\n"
      + "5. N'invente jamais de realisations ou competences. Reformule l'existant pour y placer les mots-cles.\n"
      + "6. Garde la langue d'origine du CV.\n"
      + "7. " + NO_DASH + "\n\n"
      + "MOTS-CLES A INTEGRER: " + kwList + "\n\n"
      + "CV:\n" + JSON.stringify(cv) + "\n\n"
      + "Reponds UNIQUEMENT avec le CV modifie en JSON valide strict, sans markdown.";
    try {
      const txt = await aiCall(p);
      const json = parseJSON(txt);
      pushH();
      setCVFn(() => normCV(json, cv));
      setShowAudit(false);
      setAuditResult(null);
      notify(locale==="en" ? "Keywords integrated" : "Mots-cles integres");
    } catch (err) {
      notify((locale==="en" ? "Integration error: " : "Erreur integration: ") + (err.message || ""));
    } finally {
      setKwLoading(false);
    }
  }, [cv, apiKey, T, pushH, setCVFn, notify, locale]);

  const requestPack = useCallback((offer, matchRes) => {
    setPackCtx({ offer, matchRes });
    setShowPack(true);
    setPackResult(null);
  }, []);

  const runPack = useCallback(async () => {
    if (!packCtx) return;
    if (!apiKey) { notify(T.nk); return; }
    setPackLoading(true);
    setPackMsgIdx(0);

    const { offer, matchRes } = packCtx;
    const cvSummary = "Nom: "+cv.name+" - "+cv.title
      +"\nAccroche: "+(cv.summary||"")
      +"\nExperiences: "+cv.experience.map(e =>
          e.title+" chez "+e.company+" ("+e.period+"): "
          +e.bullets.filter(b=>b).join("; ")
        ).join(" | ")
      +"\nSkills: "+cv.skills.filter(s=>s).join(", ")
      +"\nLangues: "+cv.languages.filter(l=>l.lang).map(l=>l.lang+" "+l.level).join(", ");

    const company = (matchRes && matchRes.company) || "l'entreprise";
    const role = (matchRes && matchRes.job_title) || "le poste";
    const interviewQs = (matchRes && matchRes.likely_interview_questions) || [];

    const p = "Tu es expert en candidature. Genere une candidature complete pour ce poste.\n\n"
      +"OFFRE:\n"+offer+"\n\n"
      +"CV CANDIDAT:\n"+cvSummary+"\n\n"
      +"REGLES:\n"
      +"- Reste authentique au parcours du candidat. Ne pas inventer.\n"
      +"- Adapter le ton a la culture detectee de l'entreprise.\n"
      +"- Lettre: 250-300 mots, 4 paragraphes (accroche, valeur, motivation, call-to-action).\n"
      +"- Message LinkedIn: max 90 mots, professionnel mais humain, pas de phrase bateau.\n"
      +"- Email: objet specifique (pas 'Candidature au poste de X'), corps court 150 mots max.\n"
      +"- Pitch entretien: 60 secondes a l'oral (~150 mots), structure: qui je suis, ce que j'apporte, pourquoi ce poste.\n"
      +"- 5 reponses STAR aux questions probables, chacune avec Situation/Task/Action/Result concrets bases sur le CV.\n"
      +"- " + NO_DASH + "\n"
      +"- Reponds UNIQUEMENT en JSON valide strict, sans markdown.\n\n"
      +(interviewQs.length ? ("Questions probables identifiees: "+interviewQs.join(" | ")+"\n\n") : "")
      +'JSON STRUCTURE:\n'
      +'{\n'
      +'  "cover_letter": "lettre complete avec sauts de ligne",\n'
      +'  "linkedin_message": "message direct au recruteur",\n'
      +'  "application_email": {\n'
      +'    "subject": "objet specifique",\n'
      +'    "body": "corps de l email"\n'
      +'  },\n'
      +'  "interview_pitch": "pitch 60 secondes",\n'
      +'  "star_answers": [\n'
      +'    {\n'
      +'      "question": "question probable",\n'
      +'      "situation": "contexte concret tire du CV",\n'
      +'      "task": "ce qu il fallait accomplir",\n'
      +'      "action": "action prise par le candidat",\n'
      +'      "result": "resultat chiffre si possible"\n'
      +'    }\n'
      +'  ]\n'
      +'}';
    try {
      const txt = await aiCall(p);
      const r = parseJSON(txt);
      setPackResult(r);
      if (typeof nuviTrigger === 'function') nuviTrigger('feature-completed');
    } catch (err) {
      notify("Erreur candidature: " + (err.message || "inconnue"));
      setShowPack(false);
    } finally {
      setPackLoading(false);
    }
  }, [packCtx, cv, apiKey, T, notify]);

  useEffect(() => {
    if (showPack && packCtx && !packResult && !packLoading) {
      runPack();
    }
  }, [showPack, packCtx, packResult, packLoading, runPack]);

  useEffect(() => {
    if (!packLoading) return;
    const interval = setInterval(() => {
      setPackMsgIdx(i => i + 1);
    }, 2500);
    return () => clearInterval(interval);
  }, [packLoading]);

  const copyToClipboard = useCallback((text) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      notify(locale==="en" ? "Copied" : "Copie");
    } catch {
      notify(locale==="en" ? "Copy failed" : "Echec copie");
    }
  }, [notify, locale]);

  const runPositioning = useCallback(async () => {
    if (!apiKey) { notify(T.nk); return; }
    if (cvIsEmpty) { notify(locale==="en" ? "Empty CV" : "CV vide"); return; }
    setShowPos(true);
    setPosLoading(true);
    setPosResult(null);
    const cvSummary = "Titre actuel: "+cv.title
      +"\nAccroche: "+(cv.summary||"")
      +"\nExperiences: "+cv.experience.map(e =>
          e.title+" chez "+e.company+" ("+e.period+"): "
          +e.bullets.filter(b=>b).join("; ")
        ).join(" | ")
      +"\nFormation: "+cv.education.map(e=>e.degree+" "+e.school).join(" | ")
      +"\nSkills: "+cv.skills.filter(s=>s).join(", ")
      +"\nLangues: "+cv.languages.filter(l=>l.lang).map(l=>l.lang+" "+l.level).join(", ");
    const p = "Tu es expert en strategie de carriere. Analyse ce parcours et propose 3 angles de positionnement differents.\n\n"
      +"PARCOURS:\n"+cvSummary+"\n\n"
      +"Pour chaque angle, tu dois:\n"
      +"1. Donner un titre professionnel precis (le job qu'on vise)\n"
      +"2. Expliquer pourquoi ce profil est credible pour cet angle\n"
      +"3. Donner une fourchette de salaire realiste pour ce positionnement\n"
      +"4. Lister les 3 points cles a mettre en avant\n"
      +"5. Identifier la cible employeur ideale\n"
      +"6. Reecrire l'accroche du CV pour matcher cet angle\n\n"
      +"REGLES:\n"
      +"- Les 3 angles doivent etre VRAIMENT differents (pas 3 variantes du meme job)\n"
      +"- Chaque angle doit etre credible avec ce parcours, pas une projection irrealiste\n"
      +"- " + NO_DASH + "\n"
      +"- Reponds UNIQUEMENT en JSON valide strict.\n\n"
      +'{\n'
      +'  "angles": [\n'
      +'    {\n'
      +'      "title": "Titre professionnel precis",\n'
      +'      "credibility": "Pourquoi ce profil est credible pour cet angle",\n'
      +'      "salary_range": "Fourchette realiste",\n'
      +'      "key_points": ["point 1", "point 2", "point 3"],\n'
      +'      "target_employers": "Type d entreprises a cibler",\n'
      +'      "new_summary": "Accroche reecrite pour ce positionnement"\n'
      +'    }\n'
      +'  ]\n'
      +'}';
    try {
      const { value: r } = await cachedAiCall(
        "positioning",
        cv,
        { locale },
        async () => {
          const txt = await aiCall(p, { cv, task_name: "positioning" });
          return parseJSON(txt);
        }
      );
      setPosResult(r);
    } catch (err) {
      notify("Erreur positionnement: " + (err.message || ""));
      setShowPos(false);
    } finally {
      setPosLoading(false);
    }
  }, [cv, cvIsEmpty, apiKey, T, notify, locale]);

  const adoptAngle = useCallback((angle) => {
    if (!angle) return;
    pushH();
    setCVFn(c => ({
      ...c,
      title: angle.title || c.title,
      summary: angle.new_summary || c.summary,
    }));
    setShowPos(false);
    setPosResult(null);
    notify(locale==="en" ? "Angle applied" : "Angle adopte");
  }, [pushH, setCVFn, notify, locale]);

  const runTruthCheck = useCallback(async () => {
    if (!apiKey) { notify(T.nk); return; }
    if (cvIsEmpty) { notify(locale==="en" ? "Empty CV" : "CV vide"); return; }
    setShowTruth(true);
    setTruthLoading(true);
    setTruthResult(null);
    const cvSummary = "Titre: "+cv.title
      +"\nAccroche: "+(cv.summary||"")
      +"\nExperiences:\n"+cv.experience.map((e,i) =>
          "[EXP-"+(i+1)+"] "+e.title+" chez "+e.company+" ("+e.period+"):\n"
          +e.bullets.filter(b=>b).map((b,j)=>"  - [BUL-"+(i+1)+"."+(j+1)+"] "+b).join("\n")
        ).join("\n");
    const p = "Tu es recruteur senior expert. Identifie les phrases faibles, vagues, ou risquees dans ce CV.\n\n"
      +"CV:\n"+cvSummary+"\n\n"
      +"Pour chaque probleme detecte, indique:\n"
      +"- type (vague, generique, bullshit, incoherent, faible, pretentieux, risque entretien)\n"
      +"- phrase concernee (citation exacte)\n"
      +"- localisation (titre, accroche, ou ID de l experience/bullet ex: EXP-2 ou BUL-2.3)\n"
      +"- pourquoi c'est un probleme\n"
      +"- proposition de reformulation forte\n\n"
      +"REGLES:\n"
      +"- Sois honnete et direct, sans complaisance.\n"
      +"- Concentre-toi sur les vrais problemes, pas du nitpicking.\n"
      +"- Maximum 8 issues, prends les plus importants.\n"
      +"- " + NO_DASH + "\n"
      +"- JSON valide strict uniquement.\n\n"
      +'{\n'
      +'  "issues": [\n'
      +'    {\n'
      +'      "type": "vague",\n'
      +'      "quote": "phrase exacte du CV",\n'
      +'      "location": "EXP-2 ou Accroche etc",\n'
      +'      "why": "raison concrete du probleme",\n'
      +'      "fix": "reformulation proposee"\n'
      +'    }\n'
      +'  ],\n'
      +'  "overall_verdict": "Verdict global en 1-2 phrases"\n'
      +'}';
    try {
      const { value: r } = await cachedAiCall(
        "truth",
        cv,
        { locale },
        async () => {
          const txt = await aiCall(p, { cv, task_name: "truth" });
          return parseJSON(txt);
        }
      );
      setTruthResult(r);
      // v7 : trigger monocle pour truth check
      if (typeof nuviTrigger === 'function') nuviTrigger('truth-check-done');
    } catch (err) {
      notify("Erreur truth check: " + (err.message || ""));
      setShowTruth(false);
    } finally {
      setTruthLoading(false);
    }
  }, [cv, cvIsEmpty, apiKey, T, notify, locale]);

  const saveVersion = useCallback(() => {
    const name = window.prompt(
      locale==="en" ? "Name for this version (e.g. 'Banking', 'Sales EN', 'Senior'):" 
                    : "Nom de cette version (ex: 'Banque', 'Sales EN', 'Senior'):"
    );
    if (!name || !name.trim()) return;
    const v = {
      id: Date.now(),
      name: name.trim().slice(0, 40),
      cv: cv,
      created: new Date().toISOString(),
    };
    setVersions(vs => {
      const next = [...vs, v];
      lsS(SK.VS, next);
      return next;
    });
    notify(locale==="en" ? "Version saved" : "Version sauvegardee");
  }, [cv, notify, locale]);

  // [Deploy A] Quick save sans prompt - auto-name avec date courante
  // Utile pour le bouton "Sauvegarder cette version" dans le header
  const quickSaveVersion = useCallback(() => {
    if (cvIsEmpty) {
      notify(locale === "en" ? "Nothing to save" : "Rien a sauvegarder");
      return null;
    }
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const autoName = locale === "en"
      ? "Snapshot " + dd + "/" + mm + " " + hh + "h" + mi
      : "Snapshot du " + dd + "/" + mm + " a " + hh + "h" + mi;
    const v = {
      id: Date.now(),
      name: autoName,
      cv: cv,
      created: new Date().toISOString(),
    };
    setVersions(vs => {
      const next = [...vs, v];
      lsS(SK.VS, next);
      return next;
    });
    notify(locale === "en"
      ? "Saved as : " + autoName
      : "Sauvegarde : " + autoName);
    return v.id;
  }, [cv, cvIsEmpty, notify, locale]);

  // [Deploy A] Reset CV - vide tout et retourne au OnboardScreen
  const resetCV = useCallback(() => {
    pushH(cv); // snapshot Undo au cas ou
    setCVFn(() => ({
      ...EMPTY,
      // Deep clone des arrays pour eviter shared refs
      experience: [{id: Date.now(), title: "", company: "", period: "", location: "", bullets: ["", ""]}],
      education:  [{id: Date.now() + 1, degree: "", school: "", period: ""}],
      skills:     ["", "", "", "", "", "", "", ""],
      languages:  [{lang: "", level: ""}, {lang: "", level: ""}],
      certifications: [""],
      labels: {},
      // [Deploy B] Reset photo to default mode "initials"
      photo: { mode: "initials" },
    }));
    // Clear coach history aussi - nouveau CV = nouveau contexte
    setCoachMessages([]);
    lsS(SK.CO, []);
    // Notification
    notify(locale === "en"
      ? "Started fresh. Your new CV awaits."
      : "Tout est vide. Ton nouveau CV t'attend.");
  }, [cv, pushH, setCVFn, notify, locale]);

  // [Deploy A] Save current CV as snapshot then reset
  const saveAndReset = useCallback(() => {
    const savedId = quickSaveVersion();
    if (savedId) {
      // Small delay so user sees the "Saved" notif before reset
      setTimeout(() => resetCV(), 250);
    } else {
      resetCV();
    }
  }, [quickSaveVersion, resetCV]);

  const loadVersion = useCallback((id) => {
    const v = versions.find(x => x.id === id);
    if (!v) return;
    if (!window.confirm(
      locale==="en" ? "Load this version? Current CV will be replaced (history will allow undo)."
                    : "Charger cette version? Le CV actuel sera remplace (annulable via Historique)."
    )) return;
    pushH();
    setCVFn(() => normCV(v.cv, EMPTY));
    setShowVersions(false);
    notify(locale==="en" ? "Version loaded" : "Version chargee");
  }, [versions, pushH, setCVFn, notify, locale]);

  const deleteVersion = useCallback((id) => {
    if (!window.confirm(locale==="en" ? "Delete this version?" : "Supprimer cette version?")) return;
    setVersions(vs => {
      const next = vs.filter(x => x.id !== id);
      lsS(SK.VS, next);
      return next;
    });
  }, [locale]);

  // v17 chantier 4 : Score Dashboard 8 axes.
  // Demande a l'IA d'evaluer 8 dimensions distinctes du CV. Retour : 8 scores
  // entre 0 et 100, une recommandation actionnable par axe, un verdict global,
  // et la priorite numero 1 a corriger.
  const runScoreDashboard = useCallback(async () => {
    if (!apiKey) { notify(T.nk); return; }
    if (cvIsEmpty) { notify(T.sd_no_cv); return; }
    setDashLoading(true);
    try {
      const expT = (cv.experience || []).map(e =>
        (e.title||"") + " chez " + (e.company||"")
        + " (" + (e.period||"") + "): "
        + (e.bullets||[]).filter(b=>b).join("; ")
      ).join(" | ");
      const cvT = "Nom: " + (cv.name||"")
        + "\nTitre actuel: " + (cv.title||"")
        + "\nLocalisation: " + (cv.location||"")
        + "\nLinkedIn: " + (cv.linkedin ? "present" : "absent")
        + "\nAccroche: " + (cv.summary||"")
        + "\nExperiences: " + expT
        + "\nCompetences: " + (cv.skills||[]).filter(s=>s).join(", ")
        + "\nLangues: " + (cv.languages||[]).filter(l=>l.lang).map(l=>l.lang+" ("+(l.level||"")+")").join(", ")
        + "\nCertifications: " + (cv.certifications||[]).filter(c=>c).join(", ")
        + "\nLayout actuel: " + layout;
      const langLine = locale === "en"
        ? "Reponds STRICTEMENT en anglais. "
        : "Reponds STRICTEMENT en francais. ";
      const p = "Tu es expert RH senior, recruteur international avec 15 ans d'experience."
        + " Analyse le CV ci-dessous selon 8 axes distincts."
        + "\n\nCV:\n" + cvT
        + "\n\nREGLES STRICTES:"
        + "\n- Score chaque axe entre 0 et 100 (sois honnete et exigeant, pas complaisant)."
        + "\n- Pour chaque axe, ecris une recommandation ACTIONNABLE en 1 phrase (max 25 mots)."
        + "\n- La recommandation doit etre concrete : 'Reformule X', 'Ajoute Y', pas 'ameliore'."
        + "\n- Le verdict global est une phrase synthese de 1 a 2 phrases (max 200 caracteres)."
        + "\n- Le top_priority est l'action numero 1 si l'utilisateur ne fait QU'UNE chose (max 30 mots)."
        + "\n- " + NO_DASH + " " + langLine + "JSON UNIQUEMENT, sans markdown."
        + "\n\nLES 8 AXES:"
        + "\n1. title : Clarte du titre. Le titre rend-il le metier evident en 1 seconde ?"
        + "\n2. bullets : Impact des bullets. Chiffres, verbes d'action, resultats concrets ?"
        + "\n3. ats : Compatibilite ATS. Mots-cles metier, format propre (pas de tableaux pieges) ?"
        + "\n4. relevance : Pertinence du parcours. Coherence avec le metier actuel/vise ?"
        + "\n5. credibility : Credibilite. Phrases solides, sans bullshit ni exagerations vagues ?"
        + "\n6. design : Style et design. Hierarchie visuelle, lisibilite, presentation pro ?"
        + "\n7. readability : Lisibilite. Longueur appropriee, densite equilibree, sections proportionnees ?"
        + "\n8. differentiation : Differenciation. Y-a-t-il un angle qui sort du lot, ou est-ce interchangeable ?"
        + "\n\nFORMAT DE REPONSE (JSON strict) :"
        + '\n{"global_score":75,"verdict_global":"phrase synthese","top_priority":"action numero 1 a faire","scores":['
        + '{"id":"title","score":80,"reco":"phrase actionnable"},'
        + '{"id":"bullets","score":60,"reco":"phrase actionnable"},'
        + '{"id":"ats","score":75,"reco":"phrase actionnable"},'
        + '{"id":"relevance","score":85,"reco":"phrase actionnable"},'
        + '{"id":"credibility","score":70,"reco":"phrase actionnable"},'
        + '{"id":"design","score":65,"reco":"phrase actionnable"},'
        + '{"id":"readability","score":80,"reco":"phrase actionnable"},'
        + '{"id":"differentiation","score":55,"reco":"phrase actionnable"}'
        + ']}';
      const txt = await aiCall(p);
      const r = parseJSON(txt);
      setDashResult(r);
      // Nuvi reaction selon score
      if (typeof nuviTrigger === 'function' && r) {
        if (r.total >= 80) nuviTrigger('audit-excellent', { score: r.total });
        else if (r.total < 50) nuviTrigger('audit-low', { score: r.total });
        else nuviTrigger('feature-completed');
      }
    } catch (err) {
      notify(T.ea + (err && err.message ? ": " + err.message : ""));
    }
    setDashLoading(false);
  }, [apiKey, cv, cvIsEmpty, layout, locale, notify, T]);

  // v17 chantier 4 : dispatcher des CTAs des cards de score vers le bon outil.
  // Chaque axe a un CTA different (ex "Editer le titre" -> ouvre SheetId).
  const onCtaAxisDispatch = useCallback((axisId) => {
    // On ferme la sheet score d'abord pour laisser place a la nouvelle action.
    const close = () => setShowScore(false);
    if (axisId === "title") {
      close();
      setModal("id");
    } else if (axisId === "bullets") {
      close();
      setModal("exp");
    } else if (axisId === "ats") {
      close();
      setLy("ats");
      notify(locale === "en" ? "ATS-Safe layout activated" : "Layout ATS-Safe active");
    } else if (axisId === "relevance" || axisId === "differentiation") {
      close();
      runPositioning();
    } else if (axisId === "credibility") {
      close();
      runTruthCheck();
    } else if (axisId === "design") {
      close();
      setShowCustomize(true);
    } else if (axisId === "readability") {
      close();
      setModal("exp");
    }
  }, [locale, notify, runPositioning, runTruthCheck]);

  // v17 chantier 5 : Gap Repair handlers (deterministes, pas d'IA).
  //
  // Strategy 1 : reformatte toutes les dates des experiences en YYYY (years only).
  // Strategy 2 : etend une experience precedente jusqu'a la date de debut suivante.
  // Strategy 3 : fusionne plusieurs experiences en une seule ligne continue.

  // Strategie 1 : reformatte toutes les periodes en YYYY.
  const applyYearOnlyFormat = useCallback(() => {
    pushH();
    setCVFn(p => ({
      ...p,
      experience: (p.experience || []).map(e => ({
        ...e,
        period: reformatPeriodToYearOnly(e.period || ""),
      })),
    }));
    notify(T.gr_strat_year_done || "Dates reformatees en annees");
  }, [pushH, setCVFn, notify, T]);

  // Strategie 2 : etend la fin de l'experience "before" pour qu'elle finisse juste
  // avant le debut de l'experience "after".
  // gap.beforeIdx pointe sur l'index dans le tableau cv.experience original.
  const applyExtendDate = useCallback((gapInfo) => {
    if (!gapInfo || !gapInfo.beforeExp || !gapInfo.afterExp) return;
    pushH();
    setCVFn(p => {
      const exps = [...(p.experience || [])];
      const targetIdx = gapInfo.beforeIdx;
      if (targetIdx < 0 || targetIdx >= exps.length) return p;
      const target = exps[targetIdx];
      // On parse la periode actuelle et on etend la fin a la date de debut suivante.
      const parsed = parsePeriod(target.period || "");
      if (!parsed.start) return p;
      const newEnd = gapInfo.afterExp.period
        ? parsePeriod(gapInfo.afterExp.period).start
        : null;
      if (!newEnd) return p;
      // Reconstitue la string period dans le format original (MM/YYYY si on avait des mois,
      // sinon YYYY).
      const startStr = parsed.start.month
        ? String(parsed.start.month).padStart(2, "0") + "/" + parsed.start.year
        : String(parsed.start.year);
      const endStr = newEnd.month
        ? String(newEnd.month).padStart(2, "0") + "/" + newEnd.year
        : String(newEnd.year);
      const newPeriod = startStr + " - " + endStr;
      exps[targetIdx] = { ...target, period: newPeriod };
      return { ...p, experience: exps };
    });
    notify(T.gr_strat_extend_done || "Date etendue");
  }, [pushH, setCVFn, notify, T]);

  // Strategie 3 : fusionne plusieurs experiences en une seule ligne avec dates en couverture.
  // indices = liste des index dans cv.experience a regrouper.
  const applyGroupExperiences = useCallback((indices) => {
    if (!Array.isArray(indices) || indices.length < 2) return;
    pushH();
    setCVFn(p => {
      const exps = (p.experience || []);
      const toMerge = indices.map(i => exps[i]).filter(Boolean);
      if (toMerge.length < 2) return p;
      // Combinaison : titre = "Conseil et missions" (generique), company = liste,
      // period = "annee_min - annee_max", bullets = concatenation.
      const minYear = Math.min(...toMerge.map(e => {
        const pp = parsePeriod(e.period || ""); return pp.start ? pp.start.year : 9999;
      }));
      const maxYear = Math.max(...toMerge.map(e => {
        const pp = parsePeriod(e.period || ""); return pp.end && !pp.end.present ? pp.end.year : (pp.start ? pp.start.year : 0);
      }));
      const combinedTitle = locale === "en"
        ? "Consulting and missions"
        : "Conseil et missions";
      const combinedCompany = toMerge.map(e => e.company).filter(Boolean).join(", ");
      const combinedBullets = toMerge.flatMap(e =>
        (e.bullets || []).filter(b => (b || "").trim())
      );
      const merged = {
        id: Date.now(),
        title: combinedTitle,
        company: combinedCompany,
        period: minYear + " - " + maxYear,
        location: toMerge[0].location || "",
        bullets: combinedBullets.length > 0 ? combinedBullets : [""],
      };
      // Retire les experiences fusionnees, ajoute la nouvelle a la place de la 1ere.
      const indexSet = new Set(indices);
      const newExps = [];
      let inserted = false;
      exps.forEach((e, i) => {
        if (indexSet.has(i)) {
          if (!inserted) {
            newExps.push(merged);
            inserted = true;
          }
        } else {
          newExps.push(e);
        }
      });
      return { ...p, experience: newExps };
    });
    notify(T.gr_strat_group_done || "Experiences fusionnees");
  }, [locale, pushH, setCVFn, notify, T]);

  // v17 chantier 6 : Interview Continuity.
  // L'IA joue le role du recruteur typique du marche (pays + secteur + niveau)
  // et propose un set adaptatif de questions probables d'entretien, avec reponses STAR.
  // Pas de quota fixe : c'est l'IA qui decide combien de questions et quel mix
  // selon le contexte (ex au Japon plus de questions sur la fidelite, en France
  // plus de cas pratiques, aux US plus de "tell me about a time when").
  // v2 Interview Continuity : prend aussi le round (RH/manager/board/all) en compte.

  // Helpers factorises : on les utilise dans runInterviewPrep ET runAskRecruiter.
  const buildInterviewCvText = useCallback(() => {
    const expT = (cv.experience || []).map(e =>
      (e.title||"") + " chez " + (e.company||"")
      + " (" + (e.period||"") + "): "
      + (e.bullets||[]).filter(b=>b).join("; ")
    ).join(" | ");
    return "Nom: " + (cv.name||"")
      + "\nTitre: " + (cv.title||"")
      + "\nLocalisation: " + (cv.location||"")
      + "\nAccroche: " + (cv.summary||"")
      + "\nExperiences: " + expT
      + "\nCompetences: " + (cv.skills||[]).filter(s=>s).join(", ")
      + "\nLangues: " + (cv.languages||[]).filter(l=>l.lang).map(l=>l.lang+" ("+(l.level||"")+")").join(", ");
  }, [cv]);

  // Directive selon le round choisi. "all" = pas de directive specifique.
  // Ces directives sont injectees dans le prompt principal et dans le prompt
  // "questions a poser" pour adapter les sorties au stade de l'entretien.
  const roundDirective = useCallback((forAsk) => {
    if (interviewRound === "hr") {
      return forAsk
        ? "\n- Round actuel : 1er entretien RH/talent. Privilegie les questions sur la culture, les valeurs, le process de recrutement, l'organisation generale, l'onboarding."
        : "\n- Round actuel : 1er entretien RH/talent. Privilegie les questions de fit, motivation, parcours global, soft skills, comprehension du role.";
    }
    if (interviewRound === "manager") {
      return forAsk
        ? "\n- Round actuel : 2eme entretien avec le manager. Privilegie les questions sur les objectifs concrets du poste, l'equipe, les outils, les attentes a 30/60/90 jours, les blocages techniques actuels."
        : "\n- Round actuel : 2eme entretien avec le manager. Privilegie les questions techniques operationnelles, exemples de livraison, methodes, exemples concrets STAR du parcours.";
    }
    if (interviewRound === "board") {
      return forAsk
        ? "\n- Round actuel : 3eme entretien executive/board. Privilegie les questions sur la vision strategique, les enjeux a 1-3 ans, les decisions difficiles passees, les KPI executifs, le mandat."
        : "\n- Round actuel : 3eme entretien executive/board. Privilegie les questions de vision, leadership, decisions difficiles, gestion de crise, executive presence, contributions strategiques.";
    }
    return ""; // "all" : aucune directive specifique
  }, [interviewRound]);

  const runInterviewPrep = useCallback(async () => {
    if (!apiKey) { notify(T.nk); return; }
    if (cvIsEmpty) { notify(T.iv_no_cv || "Charge d'abord un CV"); return; }
    setInterviewLoading(true);
    setInterviewResult(null);
    setAskRecruiterResult(null); // reset ask-recruiter quand on regenere le main
    try {
      const cvT = buildInterviewCvText();

      // Si l'utilisateur a saisi une offre, on l'utilise pour cibler les questions.
      const offerLine = interviewOffer && interviewOffer.trim()
        ? "\n\nOFFRE D'EMPLOI VISEE:\n" + interviewOffer.trim()
        : "";

      const langLine = locale === "en"
        ? "Reponds STRICTEMENT en anglais. "
        : "Reponds STRICTEMENT en francais. ";

      const p = "Tu es recruteur senior international avec 20 ans d'experience."
        + " Pour le candidat ci-dessous, joue le role du recruteur TYPIQUE de son marche"
        + " (pays inferé depuis la localisation, secteur infère depuis le titre + experiences,"
        + " niveau infère depuis la duree totale et les titres)."
        + "\n\nCANDIDAT:\n" + cvT
        + offerLine
        + "\n\nMISSION:"
        + "\nGenere les questions d'entretien que TU lui poserais en vrai. Le nombre et le mix"
        + " de questions doivent refletter LES PRATIQUES REELLES de ton marche (pas un quota artificiel)."
        + " Par exemple:"
        + "\n- En Asie : plus de questions sur la stabilite, le long terme, la culture entreprise."
        + "\n- En Amerique du Nord : beaucoup de comportementales 'tell me about a time when'."
        + "\n- En France : beaucoup de cas pratiques, etudes de cas chiffrees, jugement."
        + "\n- En Allemagne : tres techniques, processus, methodologie."
        + "\n- Au UK : un mix equilibre techniques + competency-based."
        + "\n\nREGLES STRICTES:"
        + "\n- Entre 8 et 12 questions au total selon le marche (pas plus, pas moins)."
        + "\n- Chaque question est realiste et FREQUEMMENT posee dans ce contexte."
        + "\n- Pour CHAQUE question, fournis une reponse modele en methode STAR (Situation, Tache, Action, Resultat)."
        + "\n- La reponse STAR doit s'inspirer du parcours reel du candidat (pas inventer)."
        + "\n- Categories possibles : Technique, Comportementale, Cas pratique, Culture, Motivation."
        + roundDirective(false)
        + "\n- " + NO_DASH + " " + langLine + "JSON UNIQUEMENT, sans markdown, sans backticks."
        + "\n\nFORMAT JSON STRICT:"
        + '\n{"country":"France","sector":"Banque","level":"Senior",'
        + '"total_questions":10,"questions":['
        + '{"category":"Technique","question":"Question concrete posee par recruteur",'
        + '"why":"pourquoi le recruteur la pose","answer":{'
        + '"situation":"contexte concret tire du parcours","task":"objectif a atteindre",'
        + '"action":"actions concretes prises","result":"resultat chiffre ou qualitatif"}}'
        + ']}';

      const txt = await aiCall(p);
      const parsed = parseJSON(txt);
      setInterviewResult(parsed);
    } catch (err) {
      notify(T.ea + (err && err.message ? ": " + err.message : ""));
    }
    setInterviewLoading(false);
  }, [apiKey, cv, cvIsEmpty, interviewOffer, locale, notify, T,
      buildInterviewCvText, roundDirective]);

  // v2 Interview Continuity : runAskRecruiter
  // Genere 8-12 questions strategiques que LE CANDIDAT va poser AU recruteur,
  // organisees par theme (role, equipe, strategie, culture, next steps).
  // Adaptees au round courant (RH = culture/process, Manager = operationnel,
  // Board = vision/leadership).
  const runAskRecruiter = useCallback(async () => {
    if (!apiKey) { notify(T.nk); return; }
    if (cvIsEmpty) { notify(T.iv_no_cv || "Charge d'abord un CV"); return; }
    setAskRecruiterLoading(true);
    setAskRecruiterResult(null);
    try {
      const cvT = buildInterviewCvText();
      const offerLine = interviewOffer && interviewOffer.trim()
        ? "\n\nOFFRE D'EMPLOI VISEE:\n" + interviewOffer.trim()
        : "";

      const langLine = locale === "en"
        ? "Reponds STRICTEMENT en anglais. "
        : "Reponds STRICTEMENT en francais. ";

      const p = "Tu es coach carriere senior, ancien recruteur executive search."
        + " Tu prepares un candidat a poser DES QUESTIONS DE QUALITE au recruteur."
        + " Les bonnes questions transforment l'entretien : elles montrent la maturite,"
        + " la curiosite strategique, et permettent au candidat d'evaluer SI il veut le poste."
        + "\n\nCANDIDAT:\n" + cvT
        + offerLine
        + "\n\nMISSION:"
        + "\nGenere 8 a 12 questions strategiques que LE CANDIDAT va POSER au recruteur."
        + " Organise-les par theme :"
        + "\n- 'role' : le poste lui-meme, scope, perimetre, autonomie, livrables, mesure du succes a 6/12 mois"
        + "\n- 'team' : l'equipe, sa composition, le manager, les peers, dynamique, conflits"
        + "\n- 'strategy' : strategie entreprise, priorites, contraintes business, marche, concurrence"
        + "\n- 'culture' : valeurs reelles vs affichees, prises de decision, droit a l'erreur, work-life"
        + "\n- 'next' : prochaines etapes, calendrier, autres candidats, references, criteres de decision"
        + "\n\nREGLES STRICTES:"
        + "\n- Chaque question doit etre PRECISE, pas generique. 'Comment se passe l'onboarding ?' est generique. 'Pouvez-vous me decrire concretement les 30 premiers jours d'un nouvel arrivant a ce poste ?' est precis."
        + "\n- Pour CHAQUE question, fournis :"
        + "\n  * 'category' : un des 5 themes ci-dessus (role|team|strategy|culture|next)"
        + "\n  * 'question' : la question telle qu'on la pose"
        + "\n  * 'why' : 1 phrase (max 20 mots) qui explique l'angle strategique de la question"
        + "\n  * 'best_for' : 1-3 mots qui indiquent quel round/contexte (ex 'manager', 'RH+manager', 'board')"
        + "\n- Mix equilibre : viser 2-3 questions par theme."
        + "\n- Eviter les questions auxquelles l'offre repond deja."
        + "\n- Eviter les questions qui peuvent gener (salaire au 1er entretien, conges des le 1er rdv)."
        + roundDirective(true)
        + "\n- " + NO_DASH + " " + langLine + "JSON UNIQUEMENT, sans markdown, sans backticks."
        + "\n\nFORMAT JSON STRICT:"
        + '\n{"questions":['
        + '{"category":"role","question":"...","why":"...","best_for":"manager"},'
        + '{"category":"team","question":"...","why":"...","best_for":"RH+manager"}'
        + ']}';

      const txt = await aiCall(p);
      const parsed = parseJSON(txt);
      setAskRecruiterResult(parsed);
    } catch (err) {
      notify(T.ea + (err && err.message ? ": " + err.message : ""));
    }
    setAskRecruiterLoading(false);
  }, [apiKey, cv, cvIsEmpty, interviewOffer, locale, notify, T,
      buildInterviewCvText, roundDirective]);

  // === v2 Tab Apres : runEmail (email de remerciement) ===
  // Genere un email de remerciement personnalise base sur :
  // - Le CV du candidat (parcours, secteur, niveau)
  // - L'offre (si disponible)
  // - Le contexte de l'entretien (recruteur, type, duree, date, recap)
  // - Le ton choisi (warm/pro/concise/assertive)
  // Retourne { subject, body } pret a copier-coller dans Gmail/Outlook.
  const runEmail = useCallback(async () => {
    if (!apiKey) { notify(T.nk); return; }
    if (cvIsEmpty) { notify(T.iv_no_cv || "Charge d'abord un CV"); return; }
    if (!afterContext.recap || !afterContext.recap.trim()) {
      notify(T.iv_af_recap_required || "Decris d'abord comment ca s'est passe");
      return;
    }
    setEmailLoading(true);
    setEmailResult(null);
    try {
      const cvT = buildInterviewCvText();
      const offerLine = interviewOffer && interviewOffer.trim()
        ? "\n\nOFFRE D'EMPLOI VISEE:\n" + interviewOffer.trim()
        : "";

      // Contexte de l'entretien serialise
      const ctxLines = [];
      if (afterContext.recruiterName) ctxLines.push("Nom du recruteur: " + afterContext.recruiterName);
      if (afterContext.type) ctxLines.push("Type d'entretien: " + afterContext.type);
      if (afterContext.duration) ctxLines.push("Duree: " + afterContext.duration + " min");
      if (afterContext.date) ctxLines.push("Date: " + afterContext.date);
      const ctxBlock = ctxLines.length > 0 ? "\n\nCONTEXTE ENTRETIEN:\n" + ctxLines.join("\n") : "";
      const recapBlock = "\n\nRECAP DE L'ENTRETIEN PAR LE CANDIDAT:\n" + afterContext.recap.trim();

      // Ton
      const toneMap = {
        warm: "Chaleureux mais professionnel. Authentique, montre de l'enthousiasme sans en faire trop.",
        pro: "Professionnel sobre. Direct, factuel, courtois. Pas d'exclamation.",
        concise: "Tres court : 4-5 phrases maximum. Va droit au but.",
        assertive: "Affirmatif et confiant. Reaffirme clairement ta motivation et ta valeur ajoutee.",
      };
      const toneLine = "Ton: " + (toneMap[emailTone] || toneMap.warm);

      const langLine = locale === "en"
        ? "Reponds STRICTEMENT en anglais. "
        : "Reponds STRICTEMENT en francais. ";

      const p = "Tu es coach carriere et expert en communication professionnelle."
        + " Tu rediges un email de remerciement post-entretien pour le candidat ci-dessous."
        + "\n\nCANDIDAT:\n" + cvT
        + offerLine
        + ctxBlock
        + recapBlock
        + "\n\n" + toneLine
        + roundDirective(false)
        + "\n\nMISSION:"
        + "\nRedige un email de remerciement complet, pret a envoyer."
        + " L'email doit faire reference A UN POINT PRECIS de ce que le candidat a vecu pendant l'entretien"
        + " (une question particuliere, un sujet aborde, un point de connexion humaine)."
        + " Cela transforme un email standard en un message memorable."
        + "\n\nREGLES STRICTES:"
        + "\n- Le sujet doit etre court, professionnel, sans superlatifs (pas de 'Merci infiniment !!')."
        + "\n- Le corps commence par 'Bonjour " + (afterContext.recruiterName || "[Nom du recruteur]") + "' (ou en anglais si applicable)."
        + "\n- Reference precise au contenu de l'entretien (basee sur le recap)."
        + "\n- Reaffirme la motivation EN UNE PHRASE percutante."
        + "\n- Termine par une signature ouverte (Cordialement, prenom)."
        + "\n- Ne PAS poser de questions auxquelles le recruteur a deja repondu."
        + "\n- Ne PAS demander quand sera la decision (signe d'impatience)."
        + "\n- " + NO_DASH + " " + langLine + "JSON UNIQUEMENT, sans markdown, sans backticks."
        + "\n\nFORMAT JSON STRICT:"
        + '\n{"subject":"Sujet court professionnel","body":"Bonjour ...\\n\\nCorps complet de l\'email avec sauts de ligne via \\\\n.\\n\\nCordialement,\\n[Prenom]"}';

      const txt = await aiCall(p);
      const parsed = parseJSON(txt);
      setEmailResult(parsed);
    } catch (err) {
      notify(T.ea + (err && err.message ? ": " + err.message : ""));
    }
    setEmailLoading(false);
  }, [apiKey, cv, cvIsEmpty, interviewOffer, locale, notify, T,
      buildInterviewCvText, roundDirective, afterContext, emailTone]);

  // === v2 Tab Apres : runDebrief (auto-debrief de la performance) ===
  // Analyse la performance du candidat sur la base du recap et propose :
  // - 3 forces (ce qui a brille)
  // - 2-3 axes d'amelioration (ou il aurait pu mieux faire)
  // - Red flags potentiels (signaux negatifs detectes)
  // - Verdict probable (passage prochaine etape, hesitation, refus probable)
  // - Next steps recommandees
  const runDebrief = useCallback(async () => {
    if (!apiKey) { notify(T.nk); return; }
    if (cvIsEmpty) { notify(T.iv_no_cv || "Charge d'abord un CV"); return; }
    if (!afterContext.recap || !afterContext.recap.trim()) {
      notify(T.iv_af_recap_required || "Decris d'abord comment ca s'est passe");
      return;
    }
    setDebriefLoading(true);
    setDebriefResult(null);
    try {
      const cvT = buildInterviewCvText();
      const offerLine = interviewOffer && interviewOffer.trim()
        ? "\n\nOFFRE D'EMPLOI VISEE:\n" + interviewOffer.trim()
        : "";

      const ctxLines = [];
      if (afterContext.recruiterName) ctxLines.push("Nom du recruteur: " + afterContext.recruiterName);
      if (afterContext.type) ctxLines.push("Type d'entretien: " + afterContext.type);
      if (afterContext.duration) ctxLines.push("Duree: " + afterContext.duration + " min");
      if (afterContext.date) ctxLines.push("Date: " + afterContext.date);
      const ctxBlock = ctxLines.length > 0 ? "\n\nCONTEXTE ENTRETIEN:\n" + ctxLines.join("\n") : "";
      const recapBlock = "\n\nRECAP DE L'ENTRETIEN PAR LE CANDIDAT:\n" + afterContext.recap.trim();

      const langLine = locale === "en"
        ? "Reponds STRICTEMENT en anglais. "
        : "Reponds STRICTEMENT en francais. ";

      const p = "Tu es coach senior et ancien recruteur executive search."
        + " Tu fais un debrief HONNETE et UTILE de l'entretien que le candidat vient de passer."
        + " Pas de complaisance, pas non plus de demolition. Le but : aider le candidat a apprendre"
        + " et a progresser pour les prochains entretiens."
        + "\n\nCANDIDAT:\n" + cvT
        + offerLine
        + ctxBlock
        + recapBlock
        + roundDirective(false)
        + "\n\nMISSION:"
        + "\nAnalyse en profondeur le recap pour identifier:"
        + "\n- 3 FORCES (ce qui a probablement bien marche, indices dans le recap qui suggerent une bonne performance)"
        + "\n- 2 a 3 AXES D'AMELIORATION (ou le candidat aurait pu mieux preparer ou repondre)"
        + "\n- RED FLAGS si presents (signaux negatifs detectes : hesitations, sujets evites, questions auxquelles il n'a pas repondu, dynamique froide). Si rien : tableau vide []."
        + "\n- VERDICT PROBABLE : passage probable / hesitation / refus probable, avec rationale 1 phrase."
        + "\n- NEXT STEPS : 3 actions concretes recommandees pour la suite (preparer le prochain round, contacter quelqu'un, completer info, etc.)."
        + "\n\nREGLES STRICTES:"
        + "\n- Sois HONNETE. Si le recap suggere que ca s'est mal passe, dis-le clairement."
        + "\n- Sois SPECIFIQUE. Pas de conseils generiques type 'continue a t'entrainer'."
        + "\n- Chaque point est ancre dans un detail du recap (pas invente)."
        + "\n- " + NO_DASH + " " + langLine + "JSON UNIQUEMENT, sans markdown, sans backticks."
        + "\n\nFORMAT JSON STRICT:"
        + '\n{"strengths":["force 1 specifique","force 2","force 3"],'
        + '"improvements":["axe 1 concret","axe 2"],'
        + '"red_flags":["flag 1 si present","flag 2 si present"],'
        + '"verdict":{"label":"passage probable|hesitation|refus probable","why":"explication 1 phrase"},'
        + '"next_steps":["action 1","action 2","action 3"]}';

      const txt = await aiCall(p);
      const parsed = parseJSON(txt);
      setDebriefResult(parsed);
    } catch (err) {
      notify(T.ea + (err && err.message ? ": " + err.message : ""));
    }
    setDebriefLoading(false);
  }, [apiKey, cv, cvIsEmpty, interviewOffer, locale, notify, T,
      buildInterviewCvText, roundDirective, afterContext]);

  // === v2 Tab Pendant : runCheatSheet (pense-bete A4) ===
  // Genere un pense-bete imprimable A4 avec :
  // - 5 messages cles a faire passer pendant l'entretien
  // - Top 3 questions a poser (selectionnees parmi les meilleures pour le round)
  // - Checklist last-minute (5 items pratiques)
  const runCheatSheet = useCallback(async () => {
    if (!apiKey) { notify(T.nk); return; }
    if (cvIsEmpty) { notify(T.iv_no_cv || "Charge d'abord un CV"); return; }
    setCheatSheetLoading(true);
    setCheatSheetResult(null);
    try {
      const cvT = buildInterviewCvText();
      const offerLine = interviewOffer && interviewOffer.trim()
        ? "\n\nOFFRE D'EMPLOI VISEE:\n" + interviewOffer.trim()
        : "";

      const langLine = locale === "en"
        ? "Reponds STRICTEMENT en anglais. "
        : "Reponds STRICTEMENT en francais. ";

      const p = "Tu es coach senior qui prepare un candidat pour un entretien."
        + " Tu produis un pense-bete A4 a glisser dans la poche : tres synthetique,"
        + " concret, qui aide a se centrer dans les 5 minutes avant l'entretien."
        + "\n\nCANDIDAT:\n" + cvT
        + offerLine
        + roundDirective(false)
        + "\n\nMISSION:"
        + "\nGenere un pense-bete avec 3 sections:"
        + "\n1. '5 messages cles a faire passer' : 5 phrases courtes (max 12 mots)"
        + " que le candidat DOIT placer durant l'entretien. Exemple: 'J'ai pilote"
        + " une transformation de 50 personnes sur 18 mois'. Chaque message est"
        + " un argument fort et CHIFFRE issu du parcours."
        + "\n2. 'Top 3 questions a poser' : les 3 meilleures questions strategiques"
        + " a poser en fin d'entretien. Tres concretes, ancrees dans le contexte."
        + "\n3. 'Checklist last-minute' : 5 items pratiques a verifier 30 min avant"
        + " l'entretien (ex 'Verifier le micro / camera', 'Avoir un verre d'eau',"
        + " 'Relire les 3 dernieres news de l'entreprise', etc.). Pratique, pas vague."
        + "\n\nREGLES STRICTES:"
        + "\n- Tres synthetique, format pense-bete imprimable."
        + "\n- Chaque message cle est CHIFFRE quand possible."
        + "\n- Les questions sont specifiques au profil et au round."
        + "\n- La checklist est PRATIQUE (logistique, pas conseil moral)."
        + "\n- " + NO_DASH + " " + langLine + "JSON UNIQUEMENT, sans markdown, sans backticks."
        + "\n\nFORMAT JSON STRICT:"
        + '\n{"key_messages":["msg 1","msg 2","msg 3","msg 4","msg 5"],'
        + '"top_questions":["question 1","question 2","question 3"],'
        + '"checklist":["check 1","check 2","check 3","check 4","check 5"]}';

      const txt = await aiCall(p);
      const parsed = parseJSON(txt);
      setCheatSheetResult(parsed);
    } catch (err) {
      notify(T.ea + (err && err.message ? ": " + err.message : ""));
    }
    setCheatSheetLoading(false);
  }, [apiKey, cv, cvIsEmpty, interviewOffer, locale, notify, T,
      buildInterviewCvText, roundDirective]);

  // === v2 Tab Pendant : runPackPDF (export pack complet) ===
  // Compile tout ce qui a ete genere (questions a recevoir + STAR + questions a poser)
  // dans un PDF multi-pages telechargable.
  // Utilise html2pdf.js qui est deja dans le projet pour CV export.
  const runPackPDF = useCallback(async () => {
    if (cvIsEmpty) { notify(T.iv_no_cv || "Charge d'abord un CV"); return; }
    if (!interviewResult || !Array.isArray(interviewResult.questions) || interviewResult.questions.length === 0) {
      notify(T.iv_pk_empty || "Genere d'abord les questions");
      return;
    }
    setPackPdfLoading(true);
    try {
      // Charge html2pdf depuis le CDN (pattern existant pour CV export)
      const html2pdf = await ensureHtml2pdfLoaded();

      // Construire un document HTML complet pour le PDF.
      const container = document.createElement("div");
      container.style.cssText = "padding:30px 36px; font-family:Inter, Helvetica, Arial, sans-serif; color:#0a0a0a; max-width:780px;";

      const title = T.iv_pk_pdf_title || "Preparation entretien";
      const sectionRecv = T.iv_pk_pdf_section_recv || "Questions probables et reponses STAR";
      const sectionAsk = T.iv_pk_pdf_section_ask || "Tes questions a poser au recruteur";

      let html = "";

      // En-tete
      html += '<div style="border-bottom: 2px solid #0a0a0a; padding-bottom: 12px; margin-bottom: 24px;">';
      html += '<div style="font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:#a07e3a; font-weight:600; margin-bottom:4px;">CV Factory - Pack entretien</div>';
      html += '<div style="font-family:Georgia, serif; font-size:24px; font-weight:600; color:#0a0a0a; letter-spacing:-0.02em;">' + escapeHtml(title) + '</div>';
      html += '<div style="font-size:11px; color:#666; margin-top:4px;">' + escapeHtml(cv.name || "") + (cv.title ? " - " + escapeHtml(cv.title) : "") + '</div>';
      html += '</div>';

      // Section 1 : Questions a recevoir avec STAR
      html += '<div style="font-family:Georgia, serif; font-size:18px; font-weight:600; color:#0a0a0a; margin-bottom:14px; padding-bottom:6px; border-bottom:1px solid #ccc;">';
      html += escapeHtml(sectionRecv) + '</div>';

      interviewResult.questions.forEach((q, i) => {
        html += '<div style="margin-bottom:18px; page-break-inside: avoid;">';
        html += '<div style="font-size:10px; letter-spacing:0.08em; text-transform:uppercase; color:#a07e3a; font-weight:700; margin-bottom:4px;">Q' + (i + 1) + ' - ' + escapeHtml(q.category || "") + '</div>';
        html += '<div style="font-family:Georgia, serif; font-size:14px; font-weight:500; color:#0a0a0a; line-height:1.4; margin-bottom:6px;">' + escapeHtml(q.question || "") + '</div>';
        if (q.why) {
          html += '<div style="font-size:11px; color:#666; font-style:italic; margin-bottom:6px;">Pourquoi : ' + escapeHtml(q.why) + '</div>';
        }
        if (q.answer) {
          html += '<div style="background:#faf6ed; border-left:3px solid #a07e3a; padding:8px 12px; border-radius:3px;">';
          if (q.answer.situation) html += '<div style="font-size:11px; line-height:1.5; margin-bottom:3px;"><b style="color:#a07e3a;">S:</b> ' + escapeHtml(q.answer.situation) + '</div>';
          if (q.answer.task)      html += '<div style="font-size:11px; line-height:1.5; margin-bottom:3px;"><b style="color:#a07e3a;">T:</b> ' + escapeHtml(q.answer.task) + '</div>';
          if (q.answer.action)    html += '<div style="font-size:11px; line-height:1.5; margin-bottom:3px;"><b style="color:#a07e3a;">A:</b> ' + escapeHtml(q.answer.action) + '</div>';
          if (q.answer.result)    html += '<div style="font-size:11px; line-height:1.5;"><b style="color:#a07e3a;">R:</b> ' + escapeHtml(q.answer.result) + '</div>';
          html += '</div>';
        }
        html += '</div>';
      });

      // Section 2 : Questions a poser (si dispo)
      if (askRecruiterResult && Array.isArray(askRecruiterResult.questions) && askRecruiterResult.questions.length > 0) {
        html += '<div style="font-family:Georgia, serif; font-size:18px; font-weight:600; color:#0a0a0a; margin-top:30px; margin-bottom:14px; padding-bottom:6px; border-bottom:1px solid #ccc; page-break-before: auto;">';
        html += escapeHtml(sectionAsk) + '</div>';

        askRecruiterResult.questions.forEach((q, i) => {
          html += '<div style="margin-bottom:14px; page-break-inside: avoid;">';
          html += '<div style="font-size:10px; letter-spacing:0.08em; text-transform:uppercase; color:#7a4d96; font-weight:700; margin-bottom:4px;">Q' + (i + 1) + ' - ' + escapeHtml(q.category || "") + '</div>';
          html += '<div style="font-family:Georgia, serif; font-size:13px; font-weight:500; color:#0a0a0a; line-height:1.4; font-style:italic; margin-bottom:4px;">"' + escapeHtml(q.question || "") + '"</div>';
          if (q.why) {
            html += '<div style="font-size:11px; color:#666; line-height:1.5;">Angle : ' + escapeHtml(q.why) + '</div>';
          }
          html += '</div>';
        });
      }

      // Footer
      html += '<div style="margin-top:30px; padding-top:12px; border-top:1px solid #ccc; font-size:10px; color:#999; text-align:center;">CV Factory - Genere par IA</div>';

      container.innerHTML = html;
      document.body.appendChild(container);

      const opt = {
        margin: 8,
        filename: "interview-pack-" + (cv.name || "candidate").replace(/[^a-z0-9]/gi, "_") + ".pdf",
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      };

      await html2pdf().set(opt).from(container).save();
      if (typeof nuviTrigger === 'function') nuviTrigger('cv-exported');
      document.body.removeChild(container);
    } catch (err) {
      notify(T.ea + (err && err.message ? ": " + err.message : ""));
    }
    setPackPdfLoading(false);
  }, [cv, cvIsEmpty, interviewResult, askRecruiterResult, notify, T]);

  // Pre-rempli le champ offre depuis offerResult de Cibler si dispo.
  // S'execute a chaque ouverture du modal interview.
  useEffect(() => {
    if (showInterview && offerResult && offerResult.offer_text && !interviewOffer) {
      setInterviewOffer(offerResult.offer_text);
    }
  }, [showInterview, offerResult, interviewOffer]);

  // [Glass Coach v1] Pose data-coach-busy="true" sur body pendant que Nuvi
  // travaille. Permet au CSS injecte de rendre le CoachModal semi-transparent
  // pour que l'user voie son CV a travers en temps reel.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (coachLoading) {
      document.body.setAttribute("data-coach-busy", "true");
    } else {
      document.body.removeAttribute("data-coach-busy");
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.removeAttribute("data-coach-busy");
      }
    };
  }, [coachLoading]);

  // v17 chantier 7 : Coach IA conversationnel.
  //
  // Persiste l'historique en localStorage (cap a 50 derniers messages).
  // L'IA dialogue, peut proposer des reformulations adoptables (kind: summary/title/bullet).
  //
  // Format JSON attendu de la reponse IA :
  //   { "reply": "texte conversationnel", "adopt": {"kind":"summary"|"title"|"bullet", "value":"..."} }
  //   adopt est optionnel.
  // [Nuvi v4] runCoachMessage refondu (fix bugs 1.1.a/b/c/d) :
  //   - CV COMPLET passe via aiCall options.cv (cache ephemeral cote route.js)
  //   - Coach retourne des ACTIONS structurees (replace/delete/add/update_*)
  //   - applyCoachActions applique directement au CV (plus de re-generation JSON)
  //   - Prompt direct : "Tu APPLIQUES, tu ne proposes pas." Stop les repetitions.
  //   - Retro-compat : si Claude renvoie {adopt: ...} (ancien format), on garde
  //     le bouton Adopter manuel via adoptCoachSuggestion.
  const runCoachMessage = useCallback(async (userText) => {
    if (!apiKey) { notify(T.nk); return; }
    if (cvIsEmpty) { notify(T.co_no_cv); return; }
    if (!userText || !userText.trim()) return;

    // Append immediately user message (UX feedback instant)
    const userMsg = { role:"user", content:userText.trim(), ts:Date.now() };
    let nextMessages;
    setCoachMessages(prev => {
      nextMessages = [...prev, userMsg].slice(-50);
      lsS(SK.CO, nextMessages);
      return nextMessages;
    });
    setCoachLoading(true);

    // [Glass Coach v1] Cycle des status pendant le travail.
    // Etapes psychologiques (pas reellement lies a l'API) pour montrer
    // a l'user que Nuvi est en train de bosser sur SON CV en temps reel.
    setCoachStatus("reading");
    const statusTimer1 = setTimeout(() => setCoachStatus("analyzing"), 1200);
    const statusTimer2 = setTimeout(() => setCoachStatus("applying"), 3500);

    try {
      // [Coach v5] Index complet avec bullets numerotees pour cibler precisement.
      // Permet a Claude de faire replace_bullet bullet_idx=N au lieu d'add_bullet.
      const expIndex = (cv.experience || []).map((e, i) => {
        let block = "exp_idx=" + i
          + " : " + (e.title || "(sans titre)")
          + " @ " + (e.company || "(sans entreprise)")
          + " [" + (e.period || "?") + "]";
        const bullets = Array.isArray(e.bullets) ? e.bullets : [];
        if (bullets.length > 0) {
          bullets.forEach((b, bi) => {
            if (b && b.trim()) {
              block += '\n  bullet_idx=' + bi + ' : "' + b.replace(/"/g, '\\"').slice(0, 140) + '"';
            }
          });
        }
        return block;
      }).join("\n");

      // Summary + title visibles pour update_summary / update_title precis
      const cvHeader = "name=\"" + (cv.name || "") + "\""
        + " | title=\"" + (cv.title || "") + "\""
        + ' | summary="' + (cv.summary || "").slice(0, 200).replace(/"/g, '\\"') + (cv.summary && cv.summary.length > 200 ? '...' : '') + '"';

      // Historique conversationnel (10 derniers tours, exclut le message courant)
      const recentHistory = (nextMessages || [])
        .slice(-12)
        .slice(0, -1)
        .map(m => (m.role === "user" ? "USER" : "COACH") + ": " + m.content)
        .join("\n");

      const langLine = locale === "en"
        ? "Reply STRICTLY in English. "
        : "Reponds STRICTEMENT en francais. ";

      // [Coach v5] Prompt refonte : expertise reelle + coherence stricte reply/actions
      const p = "Tu es Nuvi, coach carriere senior (20 ans d'experience RH+coaching cadres+ATS)."
        + " Tu connais : frameworks STAR/CAR, standards par secteur (Tech aime metriques produit/MRR/users ; Finance aime montants M EUR/AUM/PnL ; Conseil aime impact client/equipes ; Vente aime % atteinte/CA/portefeuille)."
        + " Tu corriges les anti-patterns : 'responsable de' -> verbes d'action ('pilote', 'deploie', 'orchestre') ;"
        + " 'participe a' -> action precise + resultat ; tâches descriptives -> impact mesurable."
        + "\n\n=== CV HEADER ==="
        + "\n" + cvHeader
        + "\n\n=== EXPERIENCES (avec bullets numerotees) ==="
        + "\n" + (expIndex || "(aucune experience)")
        + (recentHistory ? "\n\n=== HISTORIQUE CONVERSATION ===\n" + recentHistory : "")
        + "\n\n=== MESSAGE USER ==="
        + "\n" + userText.trim()
        + "\n\n=== REGLE ABSOLUE DE COHERENCE ==="
        + "\nSi ta reply dit 'C'est fait' / 'Voici tes...' / 'Corrige' / 'Modifie' / 'Mis a jour'"
        + " ALORS tu DOIS retourner des actions non-vides qui appliquent reellement le changement."
        + " Si tu ne peux PAS appliquer (info manquante, demande ambigue, action impossible),"
        + " DIS-LE clairement : 'Je n'ai pas pu modifier X parce que [raison]. Peux-tu preciser ?'"
        + " et retourne actions=[] sans mentir."
        + "\n\n=== CIBLAGE PRECIS ==="
        + "\n- Pour MODIFIER un bullet existant -> replace_bullet (exp_idx, bullet_idx, new_text)."
        + "\n  Les bullets sont numerotes ci-dessus, utilise leur bullet_idx exact."
        + "\n- Pour SUPPRIMER un bullet -> delete_bullet (exp_idx, bullet_idx)."
        + "\n- Pour AJOUTER un nouveau bullet -> add_bullet (exp_idx, text)."
        + "\n  N'AJOUTE QUE si l'user demande explicitement 'ajoute' ou 's'il manque qqch'."
        + "\n  Si l'user dit 'corrige X' ou 'reformule Y', utilise replace_bullet, pas add_bullet."
        + "\n- update_summary / update_title : pour le resume ou titre du CV (pas d'idx)."
        + "\n\n=== EXPERTISE PAR DEFAUT ==="
        + "\nQuand tu reformules un bullet, applique STAR/CAR :"
        + "\n  S(ituation) + T(ache) + A(ction) + R(esultat chiffre)"
        + "\nExemples concrets :"
        + "\n  AVANT : 'Responsable des clients'"
        + "\n  APRES : 'Pilote portefeuille de 60 clients PME, encours 1,5M EUR par client'"
        + "\n  AVANT : 'Participe au developpement commercial'"
        + "\n  APRES : 'Ouvre 12 nouveaux comptes B2B, +35% CA secteur fintech sur 2 ans'"
        + "\n\n=== STYLE DE REPONSE ==="
        + "\n- " + langLine
        + "\n- Reply courte (1 a 3 phrases max), conversationnelle, sharp, pas de bla-bla."
        + "\n- Pas d'em-dash. Utilise : , . ( ) ou - simple."
        + "\n- N'invente JAMAIS d'experience, entreprise, date, diplome non present dans le CV."
        + "\n\n=== FORMAT DE SORTIE (JSON STRICT, RIEN APRES) ==="
        + '\n{"reply": "ta reponse courte", "actions": [...]}'
        + "\nRetourne UNIQUEMENT ce JSON, AUCUN texte avant ou apres, AUCUN markdown.";

      // Passe le CV complet via options.cv (cache ephemeral cote route.js)
      const txt = await aiCall(p, { cv, task_name: "coach_chat" });
      const parsed = parseJSON(txt);

      let reply = (parsed && parsed.reply) ? String(parsed.reply) : txt;
      const actions = (parsed && Array.isArray(parsed.actions)) ? parsed.actions : [];

      // Retro-compat : ancien format {adopt: {kind, value}}
      const legacyAdopt = (parsed && parsed.adopt && parsed.adopt.kind && parsed.adopt.value)
        ? { kind: String(parsed.adopt.kind), value: String(parsed.adopt.value) }
        : null;

      // [Coach v5] Detection coherence reply/actions :
      // Si Claude dit "c'est fait" mais actions vides, on remplace par message honnete.
      const claimsDone = /\b(c'est fait|voici|corrig[ée]|modifi[ée]|appliqu[ée]|mis a jour|done|here are|corrected|updated|applied|modified)\b/i.test(reply);
      if (claimsDone && actions.length === 0 && !legacyAdopt) {
        console.warn("[Coach v5] Reply incoherente : dit 'fait' mais actions vides");
        reply = locale === "en"
          ? "I tried but couldn't apply that. Can you tell me more specifically what to change ? (which bullet, which experience)"
          : "Je n'ai pas pu appliquer ce changement. Tu peux preciser quel bullet ou quelle experience modifier ?";
      }

      // Applique les actions structurees automatiquement
      let applySummary = "";
      if (actions.length > 0) {
        pushH(cv); // snapshot pour Undo
        const result = applyCoachActions(cv, actions, { lang: locale });
        if (result.applied > 0) {
          setCVFn(() => result.newCv);
          applySummary = result.summary;
          if (result.failed.length > 0) {
            console.warn("[Coach v5] Some actions failed:", result.failed);
          }
        } else if (result.failed.length > 0) {
          console.warn("[Coach v5] All actions failed:", result.failed);
        }
      }

      const aiMsg = {
        role: "assistant",
        content: reply,
        ts: Date.now(),
        ...(legacyAdopt ? { adopt: legacyAdopt } : {}),
        ...(applySummary ? { appliedSummary: applySummary } : {}),
      };

      setCoachMessages(prev => {
        const next = [...prev, aiMsg].slice(-50);
        lsS(SK.CO, next);
        return next;
      });

      // [Glass Coach v2] Si une action a ete appliquee, montre "done" et le
      // LAISSE affiche. Il sera reset au prochain envoi de message ou close.
      // Si juste reply (pas d'action), reset direct.
      clearTimeout(statusTimer1);
      clearTimeout(statusTimer2);
      if (applySummary) {
        setCoachStatus("done");
        // Pas de timeout : le "done" reste tant que l'user n'envoie pas un nouveau message
      } else {
        setCoachStatus(null);
      }

      // Notif visible des changements appliques
      if (applySummary) {
        notify((locale === "en" ? "Applied : " : "Applique : ") + applySummary);
      }
    } catch (err) {
      console.error("[Coach v5] error:", err);
      clearTimeout(statusTimer1);
      clearTimeout(statusTimer2);
      setCoachStatus(null);
      const errMsg = {
        role:"assistant",
        content: T.ea + (err && err.message ? ": " + err.message : ""),
        ts: Date.now(),
      };
      setCoachMessages(prev => {
        const next = [...prev, errMsg].slice(-50);
        lsS(SK.CO, next);
        return next;
      });
    }
    setCoachLoading(false);
  }, [apiKey, cv, cvIsEmpty, locale, notify, T, pushH, setCVFn]);


  // Efface toute la conversation coach.
  const clearCoach = useCallback(() => {
    if (!confirm(T.co_clear_confirm)) return;
    setCoachMessages([]);
    lsS(SK.CO, []);
  }, [T]);

  // Ouvre le coach et incremente le compteur d'usage (pour shrink auto apres N usages)
  const openCoach = useCallback((event) => {
    // Si l'intro n'a jamais ete vue, on la lance au lieu d'ouvrir le Coach
    const introSeen = lsG("nv-intro-seen", false);
    if (introSeen !== true) {
      // Calcule l'origine (position du bouton Coach pour l'animation)
      let origin = null;
      if (event && event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        origin = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      }
      setIntroOrigin(origin);
      setShowIntroBubble(false);
      setShowIntro(true);
      return;
    }
    setShowCoach(true);
    setCoachUsageCount(prev => {
      const next = prev + 1;
      lsS("nv-coach-usage", next);
      return next;
    });
  }, []);

  // Fin de la presentation NuviIntro
  const completeIntro = useCallback(() => {
    lsS("nv-intro-seen", true);
    setShowIntro(false);
    setShowIntroBubble(false);
    // Optionnel : on peut ouvrir directement le Coach apres l'intro
    setTimeout(() => {
      setShowCoach(true);
      setCoachUsageCount(prev => {
        const next = prev + 1;
        lsS("nv-coach-usage", next);
        return next;
      });
    }, 200);
  }, []);

  // Skip de l'intro (l'utilisateur clique sur Passer)
  const skipIntro = useCallback(() => {
    lsS("nv-intro-seen", true);
    setShowIntro(false);
    setShowIntroBubble(false);
  }, []);

  // Relancer l'intro depuis Settings
  const replayIntro = useCallback(() => {
    setIntroOrigin(null);
    setShowIntroBubble(false);
    setShowIntro(true);
  }, []);

  // Adopte une suggestion proposee par le coach dans le CV.
  const adoptCoachSuggestion = useCallback((kind, value) => {
    if (!value || !value.trim()) return;
    pushH(cv);
    if (kind === "summary") {
      setCVFn(p => ({...p, summary: value.trim()}));
    } else if (kind === "title") {
      setCVFn(p => ({...p, title: value.trim()}));
    } else if (kind === "bullet") {
      // Ajoute en bullet a la 1ere experience, ou cree une nouvelle exp si aucune
      setCVFn(p => {
        if (!p.experience || p.experience.length === 0) {
          return {...p, experience:[{
            id:Date.now(), title:"", company:"", period:"", location:"",
            bullets:[value.trim()],
          }]};
        }
        const exps = [...p.experience];
        exps[0] = {...exps[0], bullets:[...(exps[0].bullets||[]), value.trim()]};
        return {...p, experience: exps};
      });
    }
    notify(T.co_adopted);
  }, [cv, pushH, setCVFn, notify, T]);

  // v17 chantier 8 : Export LinkedIn.
  // Genere headline + about + experiences au format LinkedIn (informel, 1ere personne).
  const runLinkedIn = useCallback(async () => {
    if (!apiKey) { notify(T.nk); return; }
    if (cvIsEmpty) { notify(T.li_no_cv); return; }
    setLinkedInLoading(true);
    setLinkedInResult(null);
    try {
      const expT = (cv.experience || []).slice(0, 8).map(e =>
        (e.title||"") + " chez " + (e.company||"")
        + " (" + (e.period||"") + "): "
        + (e.bullets||[]).filter(b=>b).join("; ")
      ).join(" | ");
      const cvT = "Nom: " + (cv.name||"")
        + "\nTitre actuel: " + (cv.title||"")
        + "\nLocalisation: " + (cv.location||"")
        + "\nAccroche CV: " + (cv.summary||"")
        + "\nExperiences: " + expT
        + "\nCompetences: " + (cv.skills||[]).filter(s=>s).join(", ");

      const langLine = locale === "en"
        ? "Output in English. " : "Output in French. ";

      const p = "Tu es best expert LinkedIn in the world. Reformate le CV ci-dessous au format LinkedIn officiel."
        + "\n\nCV SOURCE:\n" + cvT
        + "\n\nFORMAT LINKEDIN (regles strictes):"
        + "\n- HEADLINE (titre du profil, max 220 caracteres) : 3-5 elements separes par |."
        + "  Ex: 'Senior PM | B2B SaaS | Building data products | ex-Google'"
        + "\n- ABOUT (4-6 paragraphes, 1ere personne, ton informel mais pro) :"
        + "  Para 1 = hook accrocheur ('I help X do Y by Z')."
        + "  Para 2 = parcours en 2-3 phrases."
        + "  Para 3 = ce qui te distingue."
        + "  Para 4 = call-to-action (DM, collaboration, etc.)."
        + "\n- EXPERIENCES : pour chaque exp, reformate role + company + une description"
        + "  3-5 lignes en bullets format LinkedIn (commence par verbe d'action, KPIs chiffres)."
        + "\n\nREGLES STRICTES:"
        + "\n- Premiere personne (I, my, j'ai, mon)."
        + "\n- Ton informel mais credible."
        + "\n- Mots-cles ATS pertinents."
        + "\n- " + NO_DASH + " " + langLine + "JSON UNIQUEMENT, sans markdown, sans backticks."
        + "\n\nFORMAT JSON STRICT:"
        + '\n{"headline":"...","about":"para1\\n\\npara2\\n\\npara3\\n\\npara4",'
        + '"experiences":[{"role":"...","company":"...","description":"bullet 1\\n\\nbullet 2\\n\\nbullet 3"}]}';

      const { value: parsed } = await cachedAiCall(
        "linkedin",
        cv,
        { locale },
        async () => {
          const txt = await aiCall(p, { cv, task_name: "linkedin" });
          return parseJSON(txt);
        }
      );
      setLinkedInResult(parsed);
    } catch (err) {
      notify(T.ea + (err && err.message ? ": " + err.message : ""));
    }
    setLinkedInLoading(false);
  }, [apiKey, cv, cvIsEmpty, locale, notify, T]);

  // v17 chantier 9 : CV Compare.
  // Compare 2 versions du CV (selectionnees par leur id dans la liste 'versions')
  // et demande a l'IA de produire un resume + diffs + verdict + winner.
  const runCompare = useCallback(async () => {
    if (!apiKey) { notify(T.nk); return; }
    if (!comparePickA || !comparePickB || comparePickA === comparePickB) return;

    const va = (versions || []).find(v => v.id === comparePickA);
    const vb = (versions || []).find(v => v.id === comparePickB);
    if (!va || !vb) return;

    setCompareLoading(true);
    setCompareResult(null);
    try {
      const fmt = (cv) => {
        const expT = (cv.experience || []).slice(0, 6).map(e =>
          (e.title||"") + " chez " + (e.company||"")
          + " (" + (e.period||"") + "): "
          + (e.bullets||[]).filter(b=>b).join("; ")
        ).join(" | ");
        return "Titre: " + (cv.title||"")
          + " | Accroche: " + (cv.summary||"").slice(0,300)
          + " | Exp: " + expT
          + " | Skills: " + (cv.skills||[]).filter(s=>s).slice(0,15).join(", ");
      };

      const langLine = locale === "en"
        ? "Reply in English. " : "Reply in French. ";

      const p = "Tu es expert en CV. Compare ces 2 versions et identifie ce qui les distingue."
        + "\n\nVERSION A (\"" + (va.name || "A") + "\"):\n" + fmt(va.cv)
        + "\n\nVERSION B (\"" + (vb.name || "B") + "\"):\n" + fmt(vb.cv)
        + "\n\nMISSION:"
        + "\n1. Resume general des differences (1-2 phrases)."
        + "\n2. Liste les changements concrets (champ + type=changed/added/removed + ancien/nouveau si applicable)."
        + "\n3. Verdict d'expert : qui est meilleur et pourquoi (1-2 phrases incisives)."
        + "\n4. Winner : 'A', 'B', ou 'tie' selon ton analyse."
        + "\n\nREGLES:"
        + "\n- Sois honnete et tranchant."
        + "\n- Liste max 8 changements importants (skip les details mineurs)."
        + "\n- Ignore les espaces, ponctuation, ordre identique."
        + "\n- " + NO_DASH + " " + langLine + "JSON UNIQUEMENT, sans markdown, sans backticks."
        + "\n\nFORMAT JSON STRICT:"
        + '\n{"summary":"...","diffs":[{"field":"summary","type":"changed","old":"...","new":"..."}],'
        + '"verdict":"...","winner":"A"|"B"|"tie"}';

      const txt = await aiCall(p);
      const parsed = parseJSON(txt);
      setCompareResult(parsed);
    } catch (err) {
      notify(T.ea + (err && err.message ? ": " + err.message : ""));
    }
    setCompareLoading(false);
  }, [apiKey, comparePickA, comparePickB, versions, locale, notify, T]);

  // v17 chantier 10 : Applications Tracker. CRUD local en localStorage.
  const addApplication = useCallback((app) => {
    setApplications(prev => {
      const next = [...prev, app];
      lsS(SK.AP, next);
      return next;
    });
  }, []);
  const updateApplication = useCallback((app) => {
    setApplications(prev => {
      const next = prev.map(a => a.id === app.id ? app : a);
      lsS(SK.AP, next);
      return next;
    });
  }, []);
  const deleteApplication = useCallback((id) => {
    setApplications(prev => {
      const next = prev.filter(a => a.id !== id);
      lsS(SK.AP, next);
      return next;
    });
  }, []);

  // v17 chantier 12 : Tutorial close/skip handlers.
  const closeTutorial = useCallback(() => {
    setShowTutorial(false);
    lsS(SK.TU, true);
  }, []);
  // Bouton dans Reglages : relance le tuto sans toucher au flag.
  const relaunchTutorial = useCallback(() => {
    setShowSettings(false);
    setShowTutorial(true);
  }, []);

  // v17 chantier 13 : Dark mode toggle.
  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => {
      const next = !prev;
      lsS(SK.DK, next);
      return next;
    });
  }, []); // Applique le theme dark/light sur <html> (active les CSS variables dark).
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    }
  }, [darkMode]);

  // Sync class on body for dark mode CSS.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (darkMode) {
      document.body.classList.add("cvf-dark");
    } else {
      document.body.classList.remove("cvf-dark");
    }
    return () => {
      // Cleanup au unmount
      document.body.classList.remove("cvf-dark");
    };
  }, [darkMode]);

  // v17 chantier 11 : Multi-CV strategie.
  // Compare l'offre a TOUTES les versions sauvegardees et recommande la meilleure.
  const runMultiCV = useCallback(async () => {
    if (!apiKey) { notify(T.nk); return; }
    if (!multiCVOffer || !multiCVOffer.trim()) return;
    if (!versions || versions.length < 2) return;

    setMultiCVLoading(true);
    setMultiCVResult(null);
    try {
      const fmt = (cv) => {
        const expT = (cv.experience || []).slice(0, 5).map(e =>
          (e.title||"") + " (" + (e.company||"") + "): "
          + (e.bullets||[]).filter(b=>b).slice(0,2).join("; ")
        ).join(" | ");
        return "Titre: " + (cv.title||"")
          + " | Accroche: " + (cv.summary||"").slice(0,180)
          + " | Exp: " + expT
          + " | Skills: " + (cv.skills||[]).filter(s=>s).slice(0,12).join(", ");
      };

      const versionsBlock = versions.map(v =>
        "VERSION " + v.id + " (\"" + (v.name||"?") + "\"):\n" + fmt(v.cv)
      ).join("\n\n");

      const idsList = versions.map(v => v.id).join(", ");

      const langLine = locale === "en"
        ? "Reply in English. " : "Reply in French. ";

      const p = "Tu es expert en CV. Voici une offre d'emploi et "
        + versions.length + " versions de CV sauvegardees du candidat."
        + " Recommande la version la plus pertinente et explique pourquoi."
        + "\n\nOFFRE D'EMPLOI:\n" + multiCVOffer.trim()
        + "\n\n" + versionsBlock
        + "\n\nMISSION:"
        + "\n1. Analyse le fit de chaque version contre l'offre."
        + "\n2. Recommande la MEILLEURE version (recommended_id = ID exact d'une des versions)."
        + "\n3. Score de match 0-100 pour la recommandee."
        + "\n4. Explique en 2-3 phrases POURQUOI cette version est la meilleure."
        + "\n5. Pour les autres versions, donne un score 0-100 et un commentaire court."
        + "\n\nIMPORTANT: recommended_id et alternatives[].id doivent etre des nombres valides "
        + "presents dans cette liste : [" + idsList + "]"
        + "\n\nREGLES:"
        + "\n- Sois honnete et tranchant."
        + "\n- " + NO_DASH + " " + langLine + "JSON UNIQUEMENT, sans markdown."
        + "\n\nFORMAT JSON STRICT:"
        + '\n{"recommended_id":12345,"recommended_score":85,'
        + '"why":"explication 2-3 phrases",'
        + '"alternatives":[{"id":67890,"score":62,"comment":"..."}]}';

      const txt = await aiCall(p);
      const parsed = parseJSON(txt);
      // Coerce ids to numbers (au cas où l'IA les retourne en string)
      if (parsed) {
        if (parsed.recommended_id) parsed.recommended_id = Number(parsed.recommended_id);
        if (Array.isArray(parsed.alternatives)) {
          parsed.alternatives = parsed.alternatives.map(a => ({
            ...a, id: Number(a.id), score: Number(a.score) || 0,
          }));
        }
      }
      setMultiCVResult(parsed);
    } catch (err) {
      notify(T.ea + (err && err.message ? ": " + err.message : ""));
    }
    setMultiCVLoading(false);
  }, [apiKey, multiCVOffer, versions, locale, notify, T]);

  // Pre-rempli le champ offre depuis offerResult de Cibler si dispo.
  useEffect(() => {
    if (showMultiCV && offerResult && offerResult.offer_text && !multiCVOffer) {
      setMultiCVOffer(offerResult.offer_text);
    }
  }, [showMultiCV, offerResult, multiCVOffer]);

  // v17 : Bullet/Summary Transformer unifie.
  // kind = "bullet" : pour les bullets d'experience (ex.bullets[idx]).
  //   On passe { expId, bulletIdx, text }.
  // kind = "summary" : pour l'accroche (cv.summary).
  //   On passe { text } (pas d'expId/bulletIdx).
  const runTextTransform = useCallback(async (kind, payload) => {
    if (!apiKey) { notify(T.nk); return; }
    const text = payload && payload.text;
    if (!text || !text.trim()) {
      notify(kind === "summary"
        ? (T.bts_empty || "Ecris d'abord une accroche a transformer")
        : (T.bt_empty || "Ecris d'abord un bullet a transformer"));
      return;
    }
    setBt({
      kind,
      expId: payload.expId, bulletIdx: payload.bulletIdx,
      original: text, levels: null, loading: true,
    });
    try {
      let p;
      if (kind === "summary") {
        // Prompt summary : 2-3 phrases, registres adaptes (Sobre + Storytelling
        // remplacent Simple + Impact pour mieux coller a une accroche).
        p = "Tu es expert CV. On te donne UNE accroche (resume professionnel d'un CV). "
          + "Tu dois generer 5 reformulations distinctes, chacune dans un registre different, "
          + "en gardant la langue d'origine.\n\n"
          + "ACCROCHE ORIGINALE:\n" + text + "\n\n"
          + "REGISTRES (5 angles):\n"
          + "1. simple: factuel, sobre, sans superlatifs ni adjectifs creux. Decrit le profil tel quel.\n"
          + "2. pro: ton corporate sobre, professionnel, structure verbe d'action.\n"
          + "3. ats: maximise les mots-cles metier pour passer les filtres ATS du secteur. Densifie le vocabulaire technique.\n"
          + "4. premium: registre executive elegant, tournures litteraires nuancees, mots forts (orchestrer, deployer, piloter).\n"
          + "5. impact: storytelling avec un fil rouge narratif. Une 'voix' qui raconte le parcours plutot que de l'enumerer.\n\n"
          + "REGLES STRICTES:\n"
          + "- Ne pas inventer d'experience, d'entreprise, de titre ou de chiffre nouveau. Reste fidele au sens original.\n"
          + "- Format : 2 a 3 phrases par version, entre 30 et 60 mots.\n"
          + "- " + NO_DASH + "\n"
          + "- JSON valide strict uniquement, sans markdown.\n\n"
          + '{\n'
          + '  "simple": "version sobre",\n'
          + '  "pro": "version pro",\n'
          + '  "ats": "version ats",\n'
          + '  "premium": "version premium",\n'
          + '  "impact": "version storytelling"\n'
          + '}';
      } else {
        // Prompt bullet (inchange par rapport a l'existant).
        p = "Tu es expert CV. On te donne UNE phrase de bullet d'experience professionnelle. "
          + "Tu dois generer 5 reformulations differentes, chacune dans un registre distinct, "
          + "en gardant la langue d'origine.\n\n"
          + "PHRASE ORIGINALE:\n" + text + "\n\n"
          + "REGISTRES (5 niveaux):\n"
          + "1. simple: clarifie sans embellir, langage neutre, plus court si possible.\n"
          + "2. pro: ton corporate sobre, verbe d'action en debut, focus sur le faire.\n"
          + "3. ats: maximise les mots-cles du metier (CRM, P&L, KPI, B2B, etc.) pour passer les filtres ATS.\n"
          + "4. premium: registre executive elegant, tournure plus litteraire, mots forts (orchestre, pilote, deploie).\n"
          + "5. impact: ajoute une estimation chiffree credible (CA, %, nombre de personnes, delai). Si la phrase originale ne contient pas de chiffre, propose une fourchette plausible (par exemple: \"+15-25%\", \"5-10 personnes\").\n\n"
          + "REGLES:\n"
          + "- Ne pas inventer de fait nouveau ou d'entreprise. Reste fidele au sens original.\n"
          + "- Maximum 18 mots par version.\n"
          + "- " + NO_DASH + "\n"
          + "- JSON valide strict uniquement.\n\n"
          + '{\n'
          + '  "simple": "version simple",\n'
          + '  "pro": "version pro",\n'
          + '  "ats": "version ats",\n'
          + '  "premium": "version premium",\n'
          + '  "impact": "version chiffree"\n'
          + '}';
      }
      const txt = await aiCall(p);
      const r = parseJSON(txt);
      setBt(s => s ? { ...s, levels: r, loading: false } : null);
    } catch (err) {
      notify((T.bt_err || "Erreur transformation: ") + (err.message || ""));
      setBt(null);
    }
  }, [apiKey, notify, T]);

  // Wrapper compat retro : signature legacy attendue par SheetEx.
  const runBulletTransform = useCallback((expId, bulletIdx, text) => {
    return runTextTransform("bullet", { expId, bulletIdx, text });
  }, [runTextTransform]);

  // Adoption d'une version : dispatch selon kind (bullet ou summary).
  const adoptTextVersion = useCallback((newText) => {
    setBt(curr => {
      if (!curr) return null;
      if (curr.kind === "summary") {
        setCVFn(p => ({ ...p, summary: newText }));
        notify(T.bts_adopted || "Accroche adoptee");
      } else {
        setCVFn(p => ({
          ...p,
          experience: p.experience.map(e =>
            e.id === curr.expId
              ? { ...e, bullets: e.bullets.map((b, i) => i === curr.bulletIdx ? newText : b) }
              : e
          )
        }));
        notify(T.bt_adopted || "Version adoptee");
      }
      return null;
    });
  }, [setCVFn, notify, T]);

  // Alias retro-compat (utilise dans <BulletTransformer onAdopt={...} />).
  const adoptBulletVersion = adoptTextVersion;

  const runTranslate = useCallback(async () => {
    if (!apiKey) { notify(T.tr_nk); return; }
    setTrLoading(true);
    setTrMsgIdx(0);

    lsS(SK.BK, cv);
    setHasBackup(true);

    const target = trDir === "fr_en" ? "English" : "French";
    const source = trDir === "fr_en" ? "French" : "English";

    const p = "You are a professional CV translator. Translate the following CV from " + source + " to " + target + ".\n\n"
      + "STRICT RULES:\n"
      + "1. Translate ONLY the textual content (job titles, summaries, achievements/bullets, descriptions, skill names where applicable).\n"
      + "2. PRESERVE EXACTLY (do not translate): person's name, company names, school names, dates and periods, cities/locations (translate only if there is a standard equivalent like Londres -> London), email, phone, LinkedIn URL, certification names if they are official titles, technology names, product names, acronyms.\n"
      + "3. Adapt professional terminology naturally to the " + target + " job market. For example, in English use action verbs (Led, Drove, Delivered) at the start of bullets.\n"
      + "4. Keep the same JSON structure and the same number of items in every array.\n"
      + "5. Do not invent, add or remove content. Translate what is there.\n"
      + "6. " + NO_DASH + "\n"
      + "7. For language proficiency levels: keep CEFR codes (A1, A2, B1, B2, C1, C2) as-is. Translate descriptive levels (Native, Fluent, Intermediate / Maternelle, Courant, Intermediaire).\n\n"
      + "CV to translate (JSON):\n"
      + JSON.stringify(cv) + "\n\n"
      + "Reply with the translated CV as VALID JSON only, no markdown, no commentary, same structure exactly.";

    try {
      const { value: json } = await cachedAiCall(
        "translate",
        cv,
        { dir: trDir },
        async () => {
          const txt = await aiCall(p, { cv, task_name: "translate" });
          return parseJSON(txt);
        }
      );
      pushH();
      setCVFn(() => normCV(json, cv));
      notify(T.tr_ok);
      setShowTranslate(false);
    } catch (err) {
      notify(T.tr_err + ": " + (err.message || ""));
    } finally {
      setTrLoading(false);
    }
  }, [cv, apiKey, trDir, T, pushH, setCVFn, notify]);

  const restoreBackup = useCallback(() => {
    const b = lsG(SK.BK);
    if (!b) { notify(T.nu); return; }
    if (!window.confirm(T.tr_restore_conf)) return;
    pushH();
    setCVFn(() => normCV(b, EMPTY));
    notify(T.tr_restored);
  }, [T, pushH, setCVFn, notify]);
  
  const onImport = useCallback(async () => {
    if (!obRaw.trim()) { notify(T.np2); return; }
    if (!apiKey) { notify(T.nk); return; }
    setObImp(true);
    const p = "Expert parsing CV. JSON valide strict sans markdown.\n"
      + 'STRUCTURE:{"name":"","title":"","email":"","phone":"",'
      + '"location":"","linkedin":"","summary":"",'
      + '"experience":[{"id":1,"title":"","company":"","period":"",'
      + '"location":"","bullets":["",""]}],'
      + '"education":[{"id":1,"degree":"","school":"","period":""}],'
      + '"skills":[""],"languages":[{"lang":"","level":""}],'
      + '"certifications":[""]}\n'
      + "REGLES:toutes experiences, IDs depuis 1, vide si absent."
      + " " + NO_DASH + " UNIQUEMENT JSON.\nCV:\n" + obRaw;
    try {
      const txt = await aiCall(p);
      const parsed = parseJSON(txt);
      setCVFn(() => normCV(parsed));
      setObRaw("");
      const wasAdaptMode = obMode === "import-adapt";
      setObMode(null);
      if (wasAdaptMode) {
        // Apres import-adapt : aller en phase Cibler et ouvrir le sheet d'offre
        setTab("target");
        setShowOffer(true);
      } else {
        // Apres import simple : aller sur Ajuster (le CV existe deja)
        setTab("ai");
        setAiMode("adjust");
      }
      notify(T.okimp);
    } catch { notify(T.ep); }
    setObImp(false);
  }, [obRaw, apiKey, T, setCVFn, notify, obMode, setTab, setAiMode, setShowOffer]);

  const loadTpl = useCallback(tpl => {
    try {
      pushH();
      setCVFn(() => normCV(tpl.cv));
      setTh(tpl.theme || "executive");
      setLy(tpl.layout || "sidebar");
      notify("Template charge!");
    } catch(e) { notify("Erreur: "+e.message); }
  }, [pushH, setCVFn, setTh, setLy, notify]);

  const quick = [
    [T.q_ex, () => {
      pushH();
      setCVFn(p => ({...p, experience:[...p.experience, {
        id:Date.now(), title:T.nt, company:T.nc,
        period:T.np, location:T.ny, bullets:[T.nb],
      }]}));
      notify(T.oka);
    }, "#f0fff4"],
    [T.q_ed, () => {
      pushH();
      setCVFn(p => ({...p, education:[...p.education, {
        id:Date.now(), degree:T.nd, school:T.ns, period:T.nsp,
      }]}));
      notify(T.oka);
    }, "#f0f4ff"],
    [T.q_sk, () => {
      pushH();
      setCVFn(p => ({...p, skills:[...p.skills,""]}));
      notify(T.oka);
    }, "#fff9f0"],
  ];

  const editSects = [
    [T.edit_id, "id", "#fff9f0"],
    [T.edit_ex, "exp", "#f0fff4"],
    [T.edit_ed, "edu", "#f0f4ff"],
    [T.edit_sk, "sk", "#fef6ee"],
  ];

  const CVEl = (
    <div id="cv-print" style={{position:"relative"}}>
      {load && <Shimmer/>}
      {layout==="sidebar" && <CVSidebar cv={cv} set={setCVFn} t={effTheme} T={T} locale={locale}/>}
      {layout==="classic" && <CVSidebar cv={cv} set={setCVFn} t={effTheme} T={T} locale={locale}/>}
      {layout==="ats"     && <CVAts     cv={cv} set={setCVFn} T={T} locale={locale}/>}
    </div>
  );

  const AITabContent = (
    <div>
      <div style={{
        display:"flex", gap:6, marginBottom:18,
        padding:4,
      }}>
        {[["generate", T.tab_gen],
          ["adjust",   T.tab_adj]].map(([m, label]) => {
            const a = aiMode === m;
            return (
              <button key={m} onClick={()=>setAiMode(m)} style={{
                ...B({
                  flex:1, padding:"10px 14px", borderRadius:RadiusPill,
                  background:a ? Ink : Paper,
                  color:a ? Cream : Ink,
                  border:"0.5px solid "+(a ? Ink : Gray200),
                  fontWeight:a ? 600 : 500, fontSize:13,
                  fontFamily:Sans,
                  textAlign:"center",
                  transition:"all 180ms ease-out",
                })
              }}>{label}</button>
            );
          })}
      </div>
      {aiMode==="generate" && (
        <AIPanel onGen={handleGen} loading={load} apiKey={apiKey} T={T}
          cvIsEmpty={cvIsEmpty} onSwitchToAdjust={()=>setAiMode("adjust")}/>
      )}
      {aiMode==="adjust" && (
        <AdjustPanel cv={cv} setCVFn={setCVFn} notify={notify} apiKey={apiKey} T={T}
          prefillInst={adjPrefill}
          onPrefillConsumed={()=>setAdjPrefill("")}/>
      )}
      {aiMode==="match" && (
        <Suspense fallback={null}>
        <MatchPanel cv={cv} setCVFn={setCVFn} notify={notify} apiKey={apiKey} T={T}
          onPackRequest={requestPack}
          initialResult={offerResult}
          onResult={(r) => { setOfferResult(r); if (typeof nuviTrigger === 'function' && r) nuviTrigger('feature-completed'); }}
          onApplied={()=>setOfferResult(null)}
          aiCall={aiCall}
          parseJSON={parseJSON}
          normCV={normCV}/>
        </Suspense>
      )}
    </div>
  );

  // v17 : phase Cibler (le hub) + sheet d'offre quand on l'ouvre.
  const TargetHubContent = (
    <Suspense fallback={null}>
    <TargetHub
      T={T} cvIsEmpty={cvIsEmpty}
      offerResult={offerResult} locale={locale}
      onOpenOffer={()=>setShowOffer(true)}
      onOpenAudit={()=>setShowAudit(true)}
      onOpenPos={runPositioning}
      onOpenTruth={runTruthCheck}
      onOpenPack={()=>{
        // Si on a deja une analyse offre, on lance le pack avec ce contexte.
        // Sinon on demande d'abord de coller une offre.
        if (offerResult) {
          requestPack("", offerResult);
        } else {
          setShowOffer(true);
        }
      }}
      onOpenInterview={()=>setShowInterview(true)}
      onOpenMultiCV={()=>setShowMultiCV(true)}
    />
    </Suspense>
  );

  // ============================================================
  // FinalizeContent v17 : remplace EditContent + DesignContent + ToolsContent.
  // Sections editoriales avec eyebrow gold-deep, titres Fraunces, cards Paper.
  // ============================================================
  const finEyebrow = {
    fontSize:11, fontWeight:600,
    letterSpacing:"0.12em", textTransform:"uppercase",
    color:Coral, marginTop:24, marginBottom:10,
    display:"block",
  };
  const finRow = {
    width:"100%", padding:"14px 16px",
    borderRadius:RadiusMd,
    background:Paper, color:Ink,
    border:"0.5px solid "+Gray200,
    boxShadow:ShadowSm,
    display:"flex", alignItems:"center", gap:12,
    textAlign:"left", fontFamily:Sans, fontSize:14,
    fontWeight:500, marginBottom:8,
    transition:"all 200ms ease-out",
  };
  const finRowChevron = (
    <span style={{
      color:Gray400, marginLeft:"auto", flexShrink:0,
      display:"inline-flex",
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 18 6-6-6-6"/>
      </svg>
    </span>
  );
  const finIconWrap = (bg, color) => ({
    width:32, height:32, borderRadius:10,
    background:bg, color:color,
    display:"flex", alignItems:"center", justifyContent:"center",
    flexShrink:0,
  });
  const finPill = (active) => ({
    padding:"10px 14px", borderRadius:RadiusPill,
    fontSize:12, fontWeight:active ? 600 : 500,
    color:active ? Cream : Ink,
    background:active ? Ink : Paper,
    border:"0.5px solid "+(active ? Ink : Gray200),
    fontFamily:Sans,
    transition:"all 180ms ease-out",
  });

  const FinalizeContent = (
    <div style={{fontFamily:Sans, padding:"8px 4px"}}>
      <h1 style={{
        fontFamily:Serif, fontWeight:400,
        fontSize:28, lineHeight:1.1,
        letterSpacing:"-0.02em", color:Ink,
        margin:"0 0 4px",
      }}>{T.ph_finalize}</h1>

      {/* === Editer le CV === */}
      <div style={finEyebrow}>{T.fin_section_edit}</div>
      {editSects.map(([label, m]) => (
        <button key={m} onClick={()=>setModal(m)} style={{...B(finRow)}}>
          <span style={finIconWrap("rgba(201,169,110,.15)", GoldDeep)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </span>
          <span style={{flex:1}}>{label}</span>
          {finRowChevron}
        </button>
      ))}
      <div style={{
        padding:"10px 14px", background:CreamSoft,
        borderRadius:RadiusSm, fontSize:11, color:Gray600,
        lineHeight:1.6, marginTop:6,
        border:"0.5px solid "+Gray200,
      }}>{T.edit_tip}</div>

      {/* === Stratégie === */}
      <div style={finEyebrow}>{T.fin_section_strategy}</div>
      <button onClick={()=>setShowScore(true)} style={{...B(finRow)}}>
        <span style={finIconWrap(PurpleSoft, Purple)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </span>
        <span style={{flex:1}}>{T.fin_score_btn}</span>
        {finRowChevron}
      </button>
      {/* Transformer l'accroche : disponible uniquement si summary non vide */}
      <button
        onClick={()=>{
          if (!cv.summary || !cv.summary.trim()) {
            notify(T.bts_empty || "Ecris d'abord une accroche a transformer");
            return;
          }
          runTextTransform("summary", { text: cv.summary });
        }}
        style={{
          ...B({
            ...finRow,
            opacity: (cv.summary && cv.summary.trim()) ? 1 : 0.55,
          })
        }}
      >
        <span style={finIconWrap(PurpleSoft, Purple)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>
            <circle cx="12" cy="12" r="2.5"/>
          </svg>
        </span>
        <span style={{flex:1}}>{T.bts_btn || "Transformer l'accroche"}</span>
        {finRowChevron}
      </button>
      <button onClick={runPositioning} style={{...B(finRow)}}>
        <span style={finIconWrap(PurpleSoft, Purple)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
          </svg>
        </span>
        <span style={{flex:1}}>{T.fin_pos_btn}</span>
        {finRowChevron}
      </button>
      <button onClick={runTruthCheck} style={{...B(finRow)}}>
        <span style={finIconWrap(CoralSoft, Coral)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"/>
            <path d="M16 19h6"/><path d="M19 16v6"/>
          </svg>
        </span>
        <span style={{flex:1}}>{T.fin_truth_btn}</span>
        {finRowChevron}
      </button>
      {/* v17 chantier 5 : Lisser le parcours (Gap Repair) */}
      <button
        onClick={()=>{
          if ((cv.experience || []).length < 2) {
            notify(T.gr_no_gaps_title || "Aucun trou detecte");
            return;
          }
          setShowGapRepair(true);
        }}
        style={{
          ...B({
            ...finRow,
            opacity: (cv.experience || []).length >= 2 ? 1 : 0.55,
          })
        }}
      >
        <span style={finIconWrap(CoralSoft, Coral)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h4l3-9 4 18 3-9h4"/>
          </svg>
        </span>
        <span style={{flex:1}}>{T.gr_btn || "Lisser le parcours"}</span>
        {finRowChevron}
      </button>
      <button onClick={()=>setShowVersions(true)} style={{...B(finRow)}}>
        <span style={finIconWrap("rgba(201,169,110,.15)", GoldDeep)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 8v13H3V8"/>
            <path d="M1 3h22v5H1z"/>
            <path d="M10 12h4"/>
          </svg>
        </span>
        <span style={{flex:1}}>{T.fin_versions_btn} ({versions.length})</span>
        {finRowChevron}
      </button>
      <button onClick={()=>setShowCompare(true)} disabled={versions.length < 2}
        style={{
          ...B(finRow),
          opacity: versions.length < 2 ? 0.45 : 1,
          cursor: versions.length < 2 ? "not-allowed" : "pointer",
        }}>
        <span style={finIconWrap(PurpleSoft, Purple)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"/>
            <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/>
            <path d="M12 3v18"/>
          </svg>
        </span>
        <span style={{flex:1}}>{T.cmp_btn}</span>
        {finRowChevron}
      </button>
      <button onClick={()=>setShowApplications(true)} style={{...B(finRow)}}>
        <span style={finIconWrap(GreenSoft, Green)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        </span>
        <span style={{flex:1}}>{T.ap_btn}{applications.length > 0 ? ` (${applications.length})` : ""}</span>
        {finRowChevron}
      </button>

      {/* === Apparence === */}
      <div style={finEyebrow}>{T.fin_section_design}</div>

      {/* CTA Personnaliser le CV (couleurs + polices + IA) */}
      <button onClick={()=>setShowCustomize(true)} style={{
        ...B({
          width:"100%", padding:"15px 22px", borderRadius:RadiusPill,
          background:GradPurple, color:"#fff",
          fontFamily:Sans, fontWeight:600, fontSize:14,
          display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
          marginBottom:14,
          transition:"all 200ms ease-out",
          position:"relative",
        })
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
          <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
          <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
          <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
        </svg>
        {T.cust_btn}
        {(cvCustom || versionCustom) && (
          <span style={{
            position:"absolute", top:6, right:14,
            width:8, height:8, background:Gold, borderRadius:"50%",
          }}/>
        )}
      </button>

      <div style={{
        fontSize:11, fontWeight:600,
        letterSpacing:"0.06em", color:Gray600,
        marginBottom:8, marginTop:4,
      }}>{T.dth}</div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14}}>
        {Object.entries(THEMES).map(([k, th]) => {
          const active = thN === k;
          return (
            <button key={k} onClick={()=>setTh(k)} style={{
              ...B({
                display:"flex", alignItems:"center", gap:10,
                padding:"12px 12px", borderRadius:RadiusMd,
                border:active ? "1.5px solid "+Ink : "0.5px solid "+Gray200,
                background:active ? CreamSoft : Paper,
                textAlign:"left",
                boxShadow:active ? "none" : ShadowSm,
                transition:"all 180ms ease-out",
              })
            }}>
              <div style={{
                width:22, height:22, borderRadius:6,
                background:th.sb, border:"1.5px solid "+th.ac, flexShrink:0,
              }}/>
              <span style={{
                fontSize:12, fontWeight:active ? 600 : 500,
                color:Ink, fontFamily:Sans,
              }}>{th.name}</span>
            </button>
          );
        })}
      </div>
      <div style={{
        fontSize:11, fontWeight:600,
        letterSpacing:"0.06em", color:Gray600,
        marginBottom:8,
      }}>{T.dly}</div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:8}}>
        {LAYOUTS.map(k => (
          <button key={k} onClick={()=>setLy(k)} style={{...B(finPill(layout===k))}}>
            {k.charAt(0).toUpperCase() + k.slice(1)}
          </button>
        ))}
      </div>
      {layout==="ats" && (
        <div style={{
          marginTop:6, padding:"10px 14px", background:GreenSoft,
          borderRadius:RadiusSm, fontSize:11, color:"#166534",
          border:"0.5px solid rgba(22,163,74,.25)",
        }}>{T.dats}</div>
      )}

      {/* Templates */}
      <div style={{
        fontSize:11, fontWeight:600,
        letterSpacing:"0.06em", color:Gray600,
        marginBottom:8, marginTop:14,
      }}>{T.fin_template_section}</div>
      {TEMPLATES.map(tpl => (
        <div key={tpl.id} style={{
          borderRadius:RadiusMd, border:"0.5px solid "+Gray200,
          background:Paper, overflow:"hidden", marginBottom:8,
          boxShadow:ShadowSm,
        }}>
          <div style={{padding:"12px 14px"}}>
            <div style={{
              fontFamily:Serif, fontSize:14, fontWeight:500,
              letterSpacing:"-0.01em", color:Ink, marginBottom:2,
            }}>{tpl.label}</div>
            <div style={{fontSize:11, color:Gray600}}>
              {(tpl.cv.title || "").slice(0, 50)}
            </div>
          </div>
          <button onClick={()=>loadTpl(tpl)} style={{
            ...B({
              width:"100%", padding:"9px 14px",
              background:CreamSoft, color:Ink,
              fontWeight:500, fontSize:12,
              borderTop:"0.5px solid "+Gray200,
              fontFamily:Sans, textAlign:"center",
            })
          }}>{T.fin_template_load}</button>
        </div>
      ))}

      {/* === Traduction === */}
      <div style={finEyebrow}>{T.fin_section_translate}</div>
      <button onClick={()=>setShowTranslate(true)} style={{
        ...B({
          width:"100%", padding:"15px 22px", borderRadius:RadiusPill,
          background:GradGold, color:"#fff",
          fontFamily:Sans, fontWeight:600, fontSize:14,
          display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
          marginBottom:8,
          transition:"all 200ms ease-out",
        })
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/>
          <path d="M2 5h12"/><path d="M7 2h1"/>
          <path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>
        </svg>
        {T.tr_btn}
      </button>
      {hasBackup && (
        <button onClick={restoreBackup} style={{
          ...B({
            width:"100%", padding:"12px 16px", borderRadius:RadiusMd,
            background:Paper, color:Ink,
            border:"0.5px solid "+Gray200,
            fontSize:13, fontWeight:500, fontFamily:Sans,
            boxShadow:ShadowSm,
            transition:"all 200ms ease-out",
          })
        }}>{T.tr_restore}</button>
      )}

      {/* === Export & historique === */}
      <div style={finEyebrow}>{T.fin_section_export}</div>
      <button onClick={()=>setShowSettings(true)} style={{
        ...B({
          width:"100%", padding:"13px 18px", borderRadius:RadiusMd,
          background:Paper, color:Ink,
          border:"0.5px solid "+Gray200,
          boxShadow:ShadowSm,
          fontSize:13, fontWeight:600, fontFamily:Sans,
          display:"flex", alignItems:"center", gap:12,
          marginBottom:10, textAlign:"left",
          transition:"all 200ms ease-out",
        })
      }}>
        <div style={{
          width:32, height:32, borderRadius:9,
          display:"flex", alignItems:"center", justifyContent:"center",
          background:CreamSoft, color:GoldDeep, flexShrink:0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </div>
        <span style={{flex:1}}>{T.set_btn}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke={Gray400} strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
      <button onClick={exportPDF} style={{
        ...B({
          width:"100%", padding:"15px 22px", borderRadius:RadiusPill,
          background:GradDark, color:Cream,
          fontFamily:Sans, fontWeight:600, fontSize:14,
          display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
          marginBottom:8,
          transition:"all 200ms ease-out",
        })
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        {T.t_pdf}
      </button>
      {layout!=="ats" && (
        <div style={{
          fontSize:11, color:Gray600, marginBottom:10,
          padding:"10px 14px", background:CreamSoft,
          borderRadius:RadiusSm, lineHeight:1.6,
          border:"0.5px solid "+Gray200,
        }}>{T.t_ath}</div>
      )}
      {/* Bouton Export LinkedIn */}
      <button onClick={()=>setShowLinkedIn(true)} disabled={cvIsEmpty} style={{
        ...B({
          width:"100%", padding:"13px 18px", borderRadius:RadiusMd,
          background: cvIsEmpty ? Gray100 : Paper,
          color: cvIsEmpty ? Gray400 : Ink,
          border:"0.5px solid "+(cvIsEmpty ? Gray200 : Gold),
          boxShadow: cvIsEmpty ? "none" : ShadowSm,
          fontSize:13, fontWeight:600, fontFamily:Sans,
          display:"flex", alignItems:"center", gap:12,
          marginBottom:10, textAlign:"left",
          transition:"all 200ms ease-out",
          opacity: cvIsEmpty ? 0.6 : 1,
        })
      }}>
        <div style={{
          width:32, height:32, borderRadius:9,
          display:"flex", alignItems:"center", justifyContent:"center",
          background:"#0a66c2", color:"#fff", flexShrink:0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 1 1 8.3 6.5a1.78 1.78 0 0 1-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0 0 13 14.19a.66.66 0 0 0 0 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 0 1 2.7-1.4c1.55 0 3.36.86 3.36 3.66z"/>
          </svg>
        </div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{
            fontSize:13, fontWeight:600,
            color: cvIsEmpty ? Gray400 : Ink, marginBottom:2,
          }}>{T.li_btn}</div>
          <div style={{fontSize:11, color:Gray600, lineHeight:1.4}}>
            {T.li_btn_desc}
          </div>
        </div>
      </button>
      <button onClick={undo} disabled={!hist.length} style={{
        ...B({
          width:"100%", padding:"12px 16px", borderRadius:RadiusMd,
          background:Paper, color:!hist.length ? Gray400 : Ink,
          border:"0.5px solid "+Gray200,
          fontSize:13, fontWeight:500, fontFamily:Sans,
          boxShadow:!hist.length ? "none" : ShadowSm,
          marginBottom:8,
          transition:"all 200ms ease-out",
        })
      }}>{T.fin_undo_btn} ({hist.length})</button>
      <button onClick={doReset} style={{
        ...B({
          width:"100%", padding:"12px 16px", borderRadius:RadiusMd,
          background:CoralSoft, color:Coral,
          border:"0.5px solid "+Coral,
          fontSize:13, fontWeight:500, fontFamily:Sans,
          transition:"all 200ms ease-out",
        })
      }}>{T.t_rst}</button>

      {/* === Réglages === */}
      <div style={finEyebrow}>{T.fin_section_settings}</div>
      <div style={{
        fontSize:11, fontWeight:600,
        letterSpacing:"0.06em", color:Gray600,
        marginBottom:8,
      }}>{T.fin_iface_lang}</div>
      <div style={{display:"flex", gap:8, marginBottom:14}}>
        {[["fr","FR"],["en","EN"]].map(([lc,label]) => (
          <button key={lc} onClick={()=>setLc(lc)} style={{...B(finPill(locale===lc))}}>
            {label}
          </button>
        ))}
      </div>
      <div style={{
        fontSize:11, fontWeight:600,
        letterSpacing:"0.06em", color:Gray600,
        marginBottom:8,
      }}>{T.t_api}</div>
      <input type="password" value={apiKey}
        onChange={e=>setAK(e.target.value)}
        placeholder={T.t_aph}
        style={{
          width:"100%", padding:"12px 14px",
          borderRadius:RadiusSm,
          border:"0.5px solid "+Gray200,
          background:Paper,
          fontFamily:"ui-monospace, monospace", fontSize:12,
          color:Ink, outline:"none", boxSizing:"border-box",
          marginBottom:6,
        }}/>
      <div style={{
        fontSize:11, color:Gray400, lineHeight:1.5,
        marginBottom:14,
      }}>{T.t_ahi}</div>

      {/* Quick actions */}
      <div style={finEyebrow}>{T.t_qck}</div>
      {quick.map(([l, fn], i) => (
        <button key={i} onClick={fn} style={{
          ...B({
            width:"100%", padding:"12px 14px", borderRadius:RadiusMd,
            background:Paper, color:Ink,
            border:"0.5px solid "+Gray200,
            fontSize:13, fontWeight:500, fontFamily:Sans,
            textAlign:"left", marginBottom:7,
            boxShadow:ShadowSm,
            transition:"all 200ms ease-out",
          })
        }}>{l}</button>
      ))}
    </div>
  );

  const Modals = (
    <>
      {modal==="id"  && <SheetId cv={cv} set={setCVFn} onClose={()=>setModal(null)}
        onTransformSummary={(text)=>runTextTransform("summary", { text })}
        T={T}/>}
      {modal==="exp" && <SheetEx cv={cv} set={setCVFn} onClose={()=>setModal(null)}
        onTransformBullet={runBulletTransform} T={T}/>}
      {modal==="edu" && <SheetEd cv={cv} set={setCVFn} onClose={()=>setModal(null)} T={T}/>}
      {modal==="sk"  && <SheetSk cv={cv} set={setCVFn} onClose={()=>setModal(null)} T={T}/>}
      {showOffer && (
        <OfferSheet
          T={T} cv={cv} setCVFn={setCVFn}
          notify={notify} apiKey={apiKey}
          initialResult={offerResult}
          onResult={(r) => { setOfferResult(r); if (typeof nuviTrigger === 'function' && r) nuviTrigger('feature-completed'); }}
          onApplied={()=>{ setOfferResult(null); setShowOffer(false); }}
          onPackRequest={requestPack}
          onClose={()=>setShowOffer(false)}
        />
      )}
      {showScore && (
        <Sheet
          eyebrow={T.fin_score_eyebrow}
          title={T.fin_score_btn}
          onClose={()=>setShowScore(false)}
        >
          <Suspense fallback={null}>
          <ScorePanel
            cv={cv} apiKey={apiKey} notify={notify}
            layout={layout} T={T}
            dashLoading={dashLoading}
            dashResult={dashResult}
            onRunDashboard={runScoreDashboard}
            onCtaAxis={onCtaAxisDispatch}
          />
          </Suspense>
        </Sheet>
      )}
      {showCustomize && (
        <CustomizeSheet
          T={T} cv={cv} theme={theme}
          cvCustom={cvCustom} setCvCustom={setCvCustom}
          setCvFn={setCVFn}
          apiKey={apiKey} notify={notify} locale={locale}
          onClose={()=>setShowCustomize(false)}
        />
      )}
      {showGapRepair && (
        <Suspense fallback={null}>
        <GapRepairModal
          T={T} cv={cv}
          loading={false}
          gaps={gapAnalysis.gaps}
          yearStrategy={gapAnalysis.yearStrategy}
          groupOps={gapAnalysis.groupOps}
          unparsableCount={gapAnalysis.unparsableCount}
          onApplyYearOnly={()=>{
            applyYearOnlyFormat();
            setShowGapRepair(false);
          }}
          onApplyExtend={(gapInfo)=>{
            applyExtendDate(gapInfo);
            setShowGapRepair(false);
          }}
          onApplyGroup={(indices)=>{
            applyGroupExperiences(indices);
            setShowGapRepair(false);
          }}
          onClose={()=>setShowGapRepair(false)}
        />
        </Suspense>
      )}
      {showInterview && (
        <Suspense fallback={null}>
        <InterviewModal
          T={T} cv={cv} apiKey={apiKey}
          loading={interviewLoading}
          result={interviewResult}
          offerText={interviewOffer}
          setOfferText={setInterviewOffer}
          prefilledOffer={!!(offerResult && offerResult.offer_text && interviewOffer === offerResult.offer_text)}
          onRun={runInterviewPrep}
          onClose={()=>setShowInterview(false)}
          round={interviewRound}
          setRound={setInterviewRound}
          askRecruiterLoading={askRecruiterLoading}
          askRecruiterResult={askRecruiterResult}
          onRunAskRecruiter={runAskRecruiter}
          afterContext={afterContext}
          setAfterContext={setAfterContext}
          emailLoading={emailLoading}
          emailResult={emailResult}
          emailTone={emailTone}
          setEmailTone={setEmailTone}
          onRunEmail={runEmail}
          debriefLoading={debriefLoading}
          debriefResult={debriefResult}
          onRunDebrief={runDebrief}
          cheatSheetLoading={cheatSheetLoading}
          cheatSheetResult={cheatSheetResult}
          onRunCheatSheet={runCheatSheet}
          packLoading={packPdfLoading}
          onRunPackPDF={runPackPDF}
        />
        </Suspense>
      )}
      {showCoach && (
        <Suspense fallback={null}>
        {/* [Glass Coach v4] Glass maximum : sheet quasi-invisible, backdrop nu.
            On vise un effet "vitrine teintee" : le CV est clairement visible
            a travers, le chat reste lisible grace au blur+saturation. */}
        <style>{`
          /* Sheet : 8% d'opacite seulement = quasi-vitre, blur tres fort pour la lisibilite */
          body[data-coach-busy="true"] [data-nv-coach-sheet="true"] {
            background-color: rgba(246, 242, 232, 0.08) !important;
            backdrop-filter: blur(22px) saturate(1.4);
            -webkit-backdrop-filter: blur(22px) saturate(1.4);
            box-shadow: 0 -20px 60px rgba(0,0,0,.08) !important;
          }
          /* Backdrop : transparent total - on voit le CV directement */
          body[data-coach-busy="true"] [data-nv-coach-backdrop="true"] {
            background-color: transparent !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }
          /* Renforce la lisibilite : bulles de chat avec un fond legerement opaque
             pour que le texte reste lisible meme sur CV chargee derriere */
          body[data-coach-busy="true"] [data-nv-coach-sheet="true"] [style*="background: rgb(255, 255, 255)"],
          body[data-coach-busy="true"] [data-nv-coach-sheet="true"] [style*="background: #fff"] {
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
          }
        `}</style>

        <CoachModal
          T={T} cv={cv} apiKey={apiKey}
          lang={locale}
          loading={coachLoading}
          coachStatus={coachStatus}
          messages={coachMessages}
          onSend={runCoachMessage}
          onClear={clearCoach}
          onAdopt={adoptCoachSuggestion}
          onClose={() => { setShowCoach(false); setCoachStatus(null); }}
          onAction={(action) => {
            // [Nuvi v3] Coach proactif : dispatch des actions feature.
            // Le coach peut proposer des boutons qui ouvrent les modales directement.
            if (!action || action.type !== "open_modal") return;
            const m = action.modal;
            // Ferme le coach d'abord pour eviter conflit modales
            setShowCoach(false);
            // Petite tempo pour transition propre
            setTimeout(() => {
              if (m === "audit")           setShowAudit(true);
              else if (m === "score")      setShowScore(true);
              else if (m === "offer")      setShowOffer(true);
              else if (m === "match")      setShowOffer(true);
              else if (m === "pack")       setShowPack(true);
              else if (m === "truth")      { runTruthCheck && runTruthCheck(); }
              else if (m === "pos")        { runPositioning && runPositioning(); }
              else if (m === "gap")        setShowGapRepair(true);
              else if (m === "translate")  setShowTranslate(true);
              else if (m === "adjust")     setShowAdjust(true);
              else if (m === "versions")   setShowVersions(true);
              else if (m === "compare")    setShowCompare(true);
              else if (m === "multicv")    setShowMultiCV(true);
              else if (m === "tracking")   setShowApplications(true);
              else if (m === "customize")  setShowCustomize(true);
            }, 150);
          }}
        />
        </Suspense>
      )}
      {showLinkedIn && (
        <Suspense fallback={null}>
        <LinkedInExportModal
          T={T} cv={cv} apiKey={apiKey}
          loading={linkedInLoading}
          result={linkedInResult}
          onRun={runLinkedIn}
          onCopy={copyToClipboard}
          onClose={()=>{ if (!linkedInLoading) { setShowLinkedIn(false); setLinkedInResult(null); }}}
        />
        </Suspense>
      )}
      {showCompare && (
        <Suspense fallback={null}>
        <CVCompareModal
          T={T} versions={versions} apiKey={apiKey}
          loading={compareLoading}
          result={compareResult}
          pickA={comparePickA} setPickA={setComparePickA}
          pickB={comparePickB} setPickB={setComparePickB}
          onRun={runCompare}
          onClose={()=>{ if (!compareLoading) { setShowCompare(false); setCompareResult(null); }}}
        />
        </Suspense>
      )}
      {showApplications && (
        <Suspense fallback={null}>
        <ApplicationsTrackerModal
          T={T} applications={applications}
          onAdd={addApplication}
          onUpdate={updateApplication}
          onDelete={deleteApplication}
          onClose={()=>setShowApplications(false)}
        />
        </Suspense>
      )}
      {showMultiCV && (
        <Suspense fallback={null}>
        <MultiCVStrategyModal
          T={T} versions={versions} apiKey={apiKey}
          loading={multiCVLoading}
          result={multiCVResult}
          offerText={multiCVOffer}
          setOfferText={setMultiCVOffer}
          prefilledOffer={!!(offerResult && offerResult.offer_text && multiCVOffer === offerResult.offer_text)}
          onRun={runMultiCV}
          onLoadVersion={(id)=>{
            loadVersion(id);
            setShowMultiCV(false);
            setMultiCVResult(null);
          }}
          onClose={()=>{ if (!multiCVLoading) { setShowMultiCV(false); setMultiCVResult(null); }}}
        />
        </Suspense>
      )}
      {showTutorial && (
        <Suspense fallback={null}>
        <NuviTutorial
          mob={mob}
          onComplete={closeTutorial}
          onSkip={closeTutorial}
          onLoadDemoCV={tutLoadDemoCV}
          onRestoreCV={tutRestoreCV}
        />
        </Suspense>
      )}
      {showSettings && (
        <Suspense fallback={null}>
        <SettingsPanel
          T={T} locale={locale} setLocale={setLc_}
          darkMode={darkMode}
          onToggleDark={toggleDarkMode}
          onRelaunchTutorial={relaunchTutorial}
          onReplayIntro={() => { setShowSettings(false); replayIntro(); }}
          onResetCV={() => { setShowSettings(false); setShowResetModal(true); }}
          onClose={()=>setShowSettings(false)}
        />
        </Suspense>
      )}
      {/* [Deploy A] Reset CV confirmation modal */}
      {showResetModal && (
        <Suspense fallback={null}>
        <ResetCVModal
          open={showResetModal}
          onClose={() => setShowResetModal(false)}
          onSaveAndReset={saveAndReset}
          onAccountStub={() => { setShowResetModal(false); setShowAccountSoon(true); }}
          onResetWithoutSave={resetCV}
          T={T}
          lang={locale}
          mob={mob}
        />
        </Suspense>
      )}
      {/* [Deploy A] Account waitlist stub (placeholder for future auth) */}
      {showAccountSoon && (
        <Suspense fallback={null}>
        <AccountSoonModal
          open={showAccountSoon}
          onClose={() => setShowAccountSoon(false)}
          T={T}
          lang={locale}
          mob={mob}
        />
        </Suspense>
      )}
      {/* [Deploy B+] Export PDF choice modal (when CV > 1.1 page A4) */}
      {showExportModal && (
        <Suspense fallback={null}>
        <ExportPDFModal
          open={showExportModal}
          onClose={() => setShowExportModal(false)}
          onTwoPages={exportPDFTwoPages}
          onLongPage={exportPDFLongPage}
          pageCount={cvPageCount}
          T={T}
          lang={locale}
          mob={mob}
        />
        </Suspense>
      )}
      {showAudit && (
        <Suspense fallback={null}>
        <AuditModal 
          T={T}
          cv={cv}
          country={auditCountry}
          setCountry={setAuditCountry}
          loading={auditLoading}
          result={auditResult}
          msgIdx={auditMsgIdx}
          messages={auditMessages}
          onRun={runAudit}
          onClose={()=>{setShowAudit(false);setAuditResult(null);}}
          onApplySuggestion={applyAuditSuggestion}
          onIntegrateKeywords={integrateKeywords}
          kwLoading={kwLoading}
        />
        </Suspense>
      )}
      {/* [Nuvi v2] AdjustModal sliding from right (chat hybride avec Nuvi) */}
      {showAdjust && (
        <Suspense fallback={null}>
        <AdjustModal
          open={showAdjust}
          onClose={() => setShowAdjust(false)}
          cv={cv}
          setCVFn={setCVFn}
          apiKey={apiKey}
          T={T}
          lang={locale}
          aiCall={aiCall}
          parseJSON={parseJSON}
          notify={notify}
          mob={false}
        />
        </Suspense>
      )}
      {showTranslate && (
        <Suspense fallback={null}>
        <TranslateModal
          T={T}
          dir={trDir}
          setDir={setTrDir}
          loading={trLoading}
          msgIdx={trMsgIdx}
          hasBackup={hasBackup}
          onRun={runTranslate}
          onClose={()=>{ if (!trLoading) setShowTranslate(false); }}
        />
        </Suspense>
      )}
      {showPack && (
        <Suspense fallback={null}>
        <ApplicationPackModal
          T={T}
          pack={packResult}
          loading={packLoading}
          msgIdx={packMsgIdx}
          onCopy={copyToClipboard}
          onClose={()=>{
            if (packLoading) return;
            setShowPack(false);
            setPackResult(null);
            setPackCtx(null);
          }}
        />
        </Suspense>
      )}
      {showPos && (
        <Suspense fallback={null}>
        <PositioningModal
          T={T}
          result={posResult}
          loading={posLoading}
          onAdopt={adoptAngle}
          onClose={()=>{
            if (posLoading) return;
            setShowPos(false);
            setPosResult(null);
          }}
        />
        </Suspense>
      )}
      {showTruth && (
        <Suspense fallback={null}>
        <TruthModal
          T={T}
          result={truthResult}
          loading={truthLoading}
          onApplyFix={(iss)=>{
            const inst = "Remplace dans mon CV la phrase: \""+iss.quote+"\" par: \""+iss.fix+"\". Garde tout le reste identique.";
            setShowTruth(false);
            setTruthResult(null);
            setAdjPrefill(inst);
            setTab("ai");
            setAiMode("adjust");
            notify(locale==="en" ? "Fix sent to Adjust" : "Correction envoyee dans Ajuster");
          }}
          onClose={()=>{
            if (truthLoading) return;
            setShowTruth(false);
            setTruthResult(null);
          }}
        />
        </Suspense>
      )}
      {showVersions && (
        <Suspense fallback={null}>
        <VersionsModal
          T={T}
          versions={versions}
          onSave={saveVersion}
          onLoad={loadVersion}
          onDelete={deleteVersion}
          onClose={()=>setShowVersions(false)}
        />
        </Suspense>
      )}
      {bt && (
        <BulletTransformer
          kind={bt.kind || "bullet"}
          original={bt.original}
          levels={bt.levels}
          loading={bt.loading}
          onAdopt={adoptTextVersion}
          onClose={()=>{ if (!bt.loading) setBt(null); }}
          T={T}
        />
      )}
    </>
  );

  // NuviHome est le seul ecran d'arrivee : s'affiche quand CV vide et mode pas encore choisi
  // (NuviIntro est desactive en faveur de NuviHome qui est plus court et premium)
  const showNuviHome = cvIsEmpty && obMode === null;
  const Onboard = cvIsEmpty && obMode !== "done" && obMode !== null && (
    <Suspense fallback={null}>
    <OnboardScreen T={T} locale={locale} setLocale={setLc}
      apiKey={apiKey} mode={obMode} setMode={setObMode}
      raw={obRaw} setRaw={setObRaw} imping={obImp}
      onImport={onImport} setTab={setTab} setAiMode={setAiMode}/>
    </Suspense>
  );

  // Cinematique premium d'arrivee
  const NuviHomeEl = showNuviHome && (
    <Suspense fallback={null}>
      <NuviHome
        lang={locale}
        mob={false}
        userName={cv.name ? cv.name.split(" ")[0] : null}
        onGenerate={() => {
          // Mode generation : ouvre le panneau Demarrer en mode "generate"
          setObMode("done");
          setAiMode("generate");
          setTab("ai");
        }}
        onImport={() => {
          // Mode import : ouvre le flow OnboardScreen "import"
          setObMode("import");
        }}
        onCoachOpen={() => {
          openCoach();
        }}
      />
    </Suspense>
  );

  if (!hydrated) {
    return (
      <div suppressHydrationWarning style={{
        minHeight:"100vh",
        background:"linear-gradient(135deg, #faf8f3 0%, #f0ebe0 100%)",
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        fontFamily:Sans,
        gap: 20,
      }}>
        {/* [Nuvi v3] Boot screen Nuvi-branded.
            Volontairement statique (pas de NuviCompanion qui est ssr:false)
            pour eviter mismatch SSR/client.
            suppressHydrationWarning sur le conteneur evite les warnings React. */}

        {/* Cercle gradient subtle (loading visuel light, pas d'animation lourde) */}
        <div style={{
          width: 56, height: 56,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #5b3df5, #b91c8c)",
          opacity: 0.85,
          animation: "nuviBootPulse 1.6s ease-in-out infinite",
        }} />

        <div style={{
          fontFamily: Serif,
          fontSize: 17,
          fontWeight: 400,
          color: "#5a5a62",
          letterSpacing: "-0.01em",
          opacity: 0.75,
        }}>
          Nuvi
        </div>

        <style>{`
          @keyframes nuviBootPulse {
            0%, 100% { transform: scale(1); opacity: 0.85; }
            50% { transform: scale(1.08); opacity: 1; }
          }
          ${KEYFRAMES_V17}
        `}</style>
      </div>
    );
  }

    if (!mob) {
    const tS = a => ({
      ...B({
        flex:1, padding:"14px 0", fontSize:13,
        fontWeight:a?600:500, color:a?Ink:Gray400,
        borderBottom:a?"2px solid "+Ink:"2px solid transparent",
        textAlign:"center", fontFamily:Sans,
        background:"transparent",
        transition:"all 200ms ease-out",
      })
    });
    return (
      <>
        <link href={FONT} rel="stylesheet"/>
        <style>{KEYFRAMES_V17}</style>
        {notif && <Notif msg={notif}/>}
        {pasteFlash && (
          <div style={{
            position: "fixed",
            inset: 0,
            background: "#ffffff",
            zIndex: 9998,
            opacity: 0.85,
            pointerEvents: "none",
            animation: "pasteFlashFade 200ms ease-out forwards",
          }} />
        )}
        {/* [Deploy A] Single circular Reset button - always visible on CV page */}
        {hydrated && !cvIsEmpty && (
          <button
            onClick={() => setShowResetModal(true)}
            title={locale === "en" ? "Start a fresh CV" : "Commencer un nouveau CV"}
            aria-label={locale === "en" ? "New CV" : "Nouveau CV"}
            style={{
              position: "fixed",
              top: 14,
              right: 14,
              zIndex: 9990,
              background: "var(--nuvi-paper)",
              border: "0.5px solid var(--nuvi-hairline)",
              borderRadius: "50%",
              width: 36,
              height: 36,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--nuvi-ink-muted)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              transition: "all 150ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--nuvi-coral-soft)";
              e.currentTarget.style.borderColor = "var(--nuvi-coral)";
              e.currentTarget.style.color = "#993C1D";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--nuvi-paper)";
              e.currentTarget.style.borderColor = "var(--nuvi-hairline)";
              e.currentTarget.style.color = "var(--nuvi-ink-muted)";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
        )}
        {Modals}
        {Onboard}
        {NuviHomeEl}
        {showIntro && (
          <NuviIntro
            lang={locale}
            mob={false}
            origin={introOrigin}
            onComplete={completeIntro}
            onSkip={skipIntro}
          />
        )}
        <NuviLoadingOverlay
          active={loadingState.active}
          series={loadingState.series}
          user={loadingUser}
          lang={locale}
          mob={false}
        />
        <div data-cvf="app" style={{
          display:"flex", height:"100vh",
          fontFamily:Sans,
          background:"var(--nuvi-cream-soft)", overflow:"hidden",
        }}>
          <NuviSidebar
            active={navSection}
            onSelect={(key) => {
              setNavSection(key);
              // Wire chaque section a la modale ou comportement correspondant
              if (key === "home") {
                // "home" = revient au dashboard d'accueil (CV preview + stats)
                // Rien a ouvrir, le main contient deja le CV preview
              } else if (key === "adjust") {
                // Ouvre l'AdjustModal (chat-style avec Nuvi)
                setShowAdjust(true);
              } else if (key === "target") {
                setShowOffer(true);
              } else if (key === "pack") {
                setShowPack(true);
              } else if (key === "tracking") {
                setShowApplications(true);
              }
              // Les items avec sub-items (edit, audits, cvs, design)
              // ne font rien sur onSelect - ils ouvrent leur sub-menu via onSubSelect
            }}
            onSubSelect={(parentKey, subKey) => {
              // Sub-items : on route vers la bonne modale ou action selon parent+sub
              if (parentKey === "edit") {
                // edit_id, edit_exp, edit_edu, edit_sk
                setModal(subKey);
              } else if (parentKey === "audits") {
                if (subKey === "score")      setShowScore(true);
                else if (subKey === "pos")   { runPositioning && runPositioning(); }
                else if (subKey === "truth") { runTruthCheck && runTruthCheck(); }
                else if (subKey === "gap")   {
                  if ((cv.experience || []).length < 2) {
                    notify(T.gr_no_gaps_title || "Aucun trou detecte");
                  } else {
                    setShowGapRepair(true);
                  }
                }
              } else if (parentKey === "cvs") {
                if (subKey === "list")           setShowMultiCV(true);
                else if (subKey === "versions")  setShowVersions(true);
                else if (subKey === "compare")   {
                  if (versions.length < 2) {
                    notify(lang === "fr"
                      ? "Il faut au moins 2 versions pour comparer."
                      : "At least 2 versions needed to compare.");
                  } else {
                    setShowCompare(true);
                  }
                }
                else if (subKey === "templates") setShowMultiCV(true); // templates inclus dans MultiCV
              } else if (parentKey === "design") {
                if (subKey === "custom")    setShowCustomize(true);
                else if (subKey === "translate") setShowTranslate(true);
              }
            }}
            lang={locale}
            onCoachOpen={() => openCoach()}
            onSettingsOpen={() => setShowSettings(true)}
          />
          {/* [Nuvi v2] Ancien panneau 300px supprime - toutes les features sont
              accessibles via NuviSidebar v2 + ses sub-items + AdjustModal */}
          <div style={{
            flex:1, overflow:"auto", padding:22,
            display:"flex", justifyContent:"center", alignItems:"flex-start",
          }}>
            <div data-cvf="cv" style={{
              width:794, minHeight:1123, background:"#fff",
              boxShadow:"0 8px 48px rgba(0,0,0,.14)",
              borderRadius:4, overflow:"hidden",
            }}>
              {CVEl}
            </div>
          </div>
        </div>
        {/* Bouton Coach intelligent : drag (long press), shrink apres N usages, scroll-hide */}
        {!(
          cvIsEmpty
          || showCoach || showAudit || showTranslate || showPack
          || showPos || showTruth || showVersions
          || showOffer || showScore || showGapRepair || showInterview
          || showCustomize || !!modal
          || showLinkedIn || showCompare || showApplications
          || showMultiCV
          || showTutorial || showSettings
        ) && (
         <button
            onClick={(e) => {
              if (coachDragging) { setCoachDragging(false); return; }
              openCoach(e);
            }}
            onMouseDown={(e) => {
              const startX = e.clientX;
              const startY = e.clientY;
              coachDragStartRef.current = { startX, startY, moved: false };
              coachLongPressTimer.current = setTimeout(() => {
                setCoachDragging(true);
              }, 500);
            }}
            onMouseMove={(e) => {
              if (!coachDragging) {
                if (coachDragStartRef.current) {
                  const dx = Math.abs(e.clientX - coachDragStartRef.current.startX);
                  const dy = Math.abs(e.clientY - coachDragStartRef.current.startY);
                  if (dx > 5 || dy > 5) {
                    clearTimeout(coachLongPressTimer.current);
                    coachDragStartRef.current = null;
                  }
                }
                return;
              }
              const btn = e.currentTarget.getBoundingClientRect();
              const newX = e.clientX - btn.width / 2;
              const newY = e.clientY - btn.height / 2;
              const maxX = window.innerWidth - btn.width - 8;
              const maxY = window.innerHeight - btn.height - 8;
              setCoachPos({
                x: Math.max(8, Math.min(maxX, newX)),
                y: Math.max(8, Math.min(maxY, newY)),
              });
            }}
            onMouseUp={() => {
              clearTimeout(coachLongPressTimer.current);
              if (coachDragging && coachPos) {
                lsS("nv-coach-pos", coachPos);
              }
              setTimeout(() => setCoachDragging(false), 50);
              coachDragStartRef.current = null;
            }}
            onMouseLeave={() => {
              clearTimeout(coachLongPressTimer.current);
              if (coachDragging && coachPos) {
                lsS("nv-coach-pos", coachPos);
              }
              setCoachDragging(false);
              coachDragStartRef.current = null;
            }}
            aria-label="Coach"
            style={{
              position: "fixed",
              ...(coachPos
                ? { left: coachPos.x, top: coachPos.y, right: "auto", bottom: "auto" }
                : { right: 24, bottom: 24 }),
              zIndex: 90,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: 0,
              background: "transparent",
              color: "#5b3df5",
              border: "none",
              cursor: coachDragging ? "grabbing" : "pointer",
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              transition: coachDragging
                ? "none"
                : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
              transform: coachDragging ? "scale(1.08)" : "",
              userSelect: "none",
              touchAction: "none",
            }}
            onMouseEnter={(e) => {
              if (coachDragging) return;
              e.currentTarget.style.transform = "translateY(-2px) scale(1.05)";
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                position: "relative",
                width: mob ? 90 : 140,
                height: mob ? 90 : 140,
              }}
            >
              <span style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: "radial-gradient(circle at 50% 55%, rgba(91, 61, 245, 0.35) 0%, rgba(185, 28, 140, 0.20) 35%, rgba(91, 61, 245, 0.05) 60%, transparent 75%)",
                animation: coachDragging ? "none" : "nuviBoxBreathe 16s ease-in-out infinite",
                pointerEvents: "none",
                filter: "blur(8px)",
              }} />
              <span style={{
                position: "absolute",
                inset: "15%",
                borderRadius: "50%",
                background: "radial-gradient(ellipse at 45% 40%, rgba(91, 61, 245, 0.25) 0%, transparent 65%)",
                animation: coachDragging ? "none" : "nuviBoxBreathe 16s ease-in-out infinite",
                animationDelay: "0.5s",
                pointerEvents: "none",
                filter: "blur(4px)",
              }} />
              <span style={{
                position: "relative",
                zIndex: 2,
                filter: "drop-shadow(0 4px 12px rgba(91, 61, 245, 0.25))",
              }}>
                <NuviCompanion size={mob ? 70 : 120} mode={nuviExpression ? "expression" : "idle"} expression={nuviExpression} cycleDuration={60} />
              </span>
            </span>
            {coachUsageCount < 3 && (
              <span style={{
                marginTop: 2,
                padding: "3px 10px",
                background: "rgba(91, 61, 245, 0.08)",
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "#5b3df5",
                border: "0.5px solid rgba(91, 61, 245, 0.15)",
              }}>
                Coach
              </span>
            )}
            <style>{`
              @keyframes nuviBoxBreathe {
                0%   { transform: scale(0.65); opacity: 0.35; }
                25%  { transform: scale(1.0);  opacity: 0.85; }
                50%  { transform: scale(1.0);  opacity: 0.85; }
                75%  { transform: scale(0.65); opacity: 0.35; }
                100% { transform: scale(0.65); opacity: 0.35; }
              }
            `}</style>
          </button>
        )}
        {/* === BOUTON TELECHARGER PERSISTANT (Desktop) === */}
        {!cvIsEmpty && !(
          showCoach || showAudit || showTranslate || showPack
          || showPos || showTruth || showVersions
          || showOffer || showScore || showGapRepair || showInterview
          || showCustomize || !!modal
          || showLinkedIn || showCompare || showApplications
          || showMultiCV || showTutorial || showSettings
        ) && (
          <button
            onClick={exportPDF}
            aria-label="Telecharger CV"
            style={{
              position: "fixed",
              left: 100,
              bottom: 24,
              zIndex: 89,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 22px",
              background: "linear-gradient(135deg, #5b3df5 0%, #b91c8c 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 999,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 0.2,
              boxShadow: "0 8px 24px rgba(91, 61, 245, 0.35), 0 2px 6px rgba(91, 61, 245, 0.25)",
              transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms ease",
              userSelect: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px) scale(1.03)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(91, 61, 245, 0.45), 0 4px 10px rgba(91, 61, 245, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(91, 61, 245, 0.35), 0 2px 6px rgba(91, 61, 245, 0.25)";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {locale === "en" ? "Download" : "Telecharger"}
          </button>
        )}
        <NuviBigLogo active={bigLogoOpen || bigLogoActive} onDismiss={() => setBigLogoOpen(false)} />
        {showIntroBubble && !showIntro && !cvIsEmpty && (
          <div
            onClick={() => {
              setShowIntroBubble(false);
              setIntroOrigin(coachPos
                ? { x: coachPos.x + 60, y: coachPos.y + 60 }
                : { x: window.innerWidth - 80, y: window.innerHeight - 80 }
              );
              setShowIntro(true);
            }}
            style={{
              position: "fixed",
              ...(coachPos
                ? { left: Math.max(12, coachPos.x - 80), top: Math.max(12, coachPos.y - 60) }
                : { right: 30, bottom: 100 }),
              zIndex: 91,
              background: "#0f0f12",
              color: "#faf8f3",
              borderRadius: 14,
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
              boxShadow: "0 12px 32px rgba(0,0,0,0.35), 0 4px 8px rgba(0,0,0,0.2)",
              cursor: "pointer",
              animation: "introBubbleBounce 1800ms ease-in-out infinite",
              whiteSpace: "nowrap",
              lineHeight: 1.3,
              userSelect: "none",
            }}
          >
            {locale === "en" ? "👋 Click me!" : "👋 Clique sur moi !"}
            <div style={{
              position: "absolute",
              bottom: -6, left: "75%", transform: "translateX(-50%) rotate(45deg)",
              width: 12, height: 12, background: "#0f0f12",
            }} />
            <style>{`
              @keyframes introBubbleBounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-6px); }
              }
            `}</style>
          </div>
        )}
      </>
    );
  }

    return (
    <>
      <link href={FONT} rel="stylesheet"/>
      <style>{KEYFRAMES_V17}</style>
      {notif && <Notif msg={notif}/>}
        {pasteFlash && (
          <div style={{
            position: "fixed",
            inset: 0,
            background: "#ffffff",
            zIndex: 9998,
            opacity: 0.85,
            pointerEvents: "none",
            animation: "pasteFlashFade 200ms ease-out forwards",
          }} />
        )}
      {/* [Deploy A] Single circular Reset button (mobile) */}
      {hydrated && !cvIsEmpty && (
        <button
          onClick={() => setShowResetModal(true)}
          aria-label={locale === "en" ? "New CV" : "Nouveau CV"}
          style={{
            position: "fixed",
            top: 8,
            right: 8,
            zIndex: 9990,
            background: "var(--nuvi-paper)",
            border: "0.5px solid var(--nuvi-hairline)",
            borderRadius: "50%",
            width: 34,
            height: 34,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--nuvi-ink-muted)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
        </button>
      )}
      {Modals}
      {Onboard}
      {showNuviHome && (
        <Suspense fallback={null}>
          <NuviHome
            lang={locale}
            mob={true}
            userName={cv.name ? cv.name.split(" ")[0] : null}
            onGenerate={() => {
              setObMode("done");
              setAiMode("generate");
              setTab("ai");
            }}
            onImport={() => {
              setObMode("import");
            }}
            onCoachOpen={() => {
              openCoach();
            }}
          />
        </Suspense>
      )}
      {showIntro && (
        <NuviIntro
          lang={locale}
          mob={true}
          origin={introOrigin}
          onComplete={completeIntro}
          onSkip={skipIntro}
        />
      )}
      <NuviLoadingOverlay
        active={loadingState.active}
        series={loadingState.series}
        user={loadingUser}
        lang={locale}
        mob={true}
      />
      {zoomed && (
        <div style={{
          position:"fixed", inset:0, zIndex:1500,
          background:"rgba(0,0,0,.9)", overflow:"auto",
        }} onClick={()=>setZoomed(false)}>
          <div style={{minWidth:794, padding:14}}>{CVEl}</div>
        </div>
      )}
      <div data-cvf="app" style={{
        display:"flex", flexDirection:"column", height:"100vh",
        overflow:"hidden", background:"var(--nuvi-cream-soft)",
        fontFamily:Sans,
      }}>
        <div style={{
          display:"flex", alignItems:"center",
          justifyContent:"space-between",
          padding:"12px 16px", background:Paper,
          borderBottom:"0.5px solid "+Gray200,
          flexShrink:0,
        }}>
          <div style={{display:"flex", flexDirection:"column", alignItems:"flex-start", gap:2}}>
            <NuviLogo size={32} inkColor={Ink} />
            <div style={{
              color:Ink, fontSize:9.5,
              fontFamily:Serif, fontStyle:"italic",
              fontWeight:400, opacity:0.65,
              letterSpacing:"0.02em",
              marginLeft:1,
            }}>{T.appSub}</div>
          </div>
          <div style={{display:"flex", gap:6}}>
            {!cvIsEmpty && (
              <button onClick={exportPDF} aria-label="Telecharger CV" style={{
                ...B({
                  background:"linear-gradient(135deg, #5b3df5 0%, #b91c8c 100%)",
                  color:"#fff",
                  border:"none",
                  borderRadius:RadiusPill,
                  padding:"6px 10px",
                  display:"flex",
                  alignItems:"center",
                  gap:5,
                  fontSize:11,
                  fontWeight:600,
                  fontFamily:Sans,
                  boxShadow:"0 4px 12px rgba(91, 61, 245, 0.25)",
                  transition:"all 200ms ease",
                })
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.4"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
            )}
            <button onClick={()=>setZoomed(true)} style={{
              ...B({
                background:Paper, color:Ink,
                border:"0.5px solid "+Gray200,
                borderRadius:RadiusPill, padding:"6px 12px",
                fontSize:11, fontWeight:500, fontFamily:Sans,
              })
            }}>{T.zoom}</button>
            <button onClick={()=>setShowCV(p=>!p)} style={{
              ...B({
                background:showCV ? Paper : Ink,
                color:showCV ? Ink : Cream,
                border:"0.5px solid "+(showCV ? Gray200 : Ink),
                borderRadius:RadiusPill, padding:"6px 12px",
                fontSize:11, fontWeight:500, fontFamily:Sans,
              })
            }}>{showCV ? T.hide : T.show}</button>
          </div>
        </div>
        {showCV && (
          <div ref={cRef} style={{
            background:Gray100, padding:"7px", flexShrink:0,
            maxHeight:"55vh", overflow:"auto",
            WebkitOverflowScrolling:"touch",
          }}
          onScroll={() => {
            setCoachScrolling(true);
            if (coachScrollTimerRef.current) clearTimeout(coachScrollTimerRef.current);
            coachScrollTimerRef.current = setTimeout(() => {
              setCoachScrolling(false);
            }, 800);
          }}
          onTouchStart={() => {
            setCoachScrolling(true);
            if (coachScrollTimerRef.current) clearTimeout(coachScrollTimerRef.current);
          }}
          onTouchEnd={() => {
            if (coachScrollTimerRef.current) clearTimeout(coachScrollTimerRef.current);
            coachScrollTimerRef.current = setTimeout(() => {
              setCoachScrolling(false);
            }, 600);
          }}
          >
            <div data-cvf="cv" style={{
              height:cvH, overflow:"hidden",
              background:"#fff", borderRadius:5,
              boxShadow:"0 4px 20px rgba(0,0,0,.15)",
            }}>
              <div style={{
                transformOrigin:"top left",
                transform:"scale("+scale+")",
                width:scale<1 ? (100/scale)+"%" : "100%",
              }}>
                {CVEl}
              </div>
            </div>
          </div>
        )}
        <div style={{flex:1, overflowY:"auto", padding:"13px 13px 4px"}}>
          {/* Sur mobile, le contenu inline est l'AITabContent (Demarrer) par defaut.
              Les autres sections (Coach, Cibler, Pack, Score, etc.) ouvrent des modales
              via NuviBottomNav, donc pas besoin d'afficher leur contenu inline.
              On garde TargetHubContent et FinalizeContent au cas ou un legacy tab les active. */}
          {tab==="ai"     && AITabContent}
          {tab==="target" && TargetHubContent}
          {(tab==="edit" || tab==="design"
            || tab==="score" || tab==="tools") && FinalizeContent}
        </div>
        <NuviBottomNav
          active={navSection}
          onSelect={(key) => {
            setNavSection(key);
            // Wire chaque section à la modale existante (cohérent avec sidebar desktop)
            if (key === "target") {
              setShowOffer(true);
            } else if (key === "pack") {
              setShowPack(true);
            } else if (key === "score") {
              setShowScore(true);
            } else if (key === "cvs") {
              setShowMultiCV(true);
            } else if (key === "design") {
              setShowCustomize(true);
            } else if (key === "tracking") {
              setShowApplications(true);
            }
            // "home" = juste mettre la section active
          }}
          lang={locale}
          onCoachOpen={() => openCoach()}
          onSettingsOpen={() => setShowSettings(true)}
        />
        {/* Bouton Coach intelligent (mobile + desktop) : drag (long press), shrink, scroll-hide */}
        {!(
          cvIsEmpty
          || showCoach || showAudit || showTranslate || showPack
          || showPos || showTruth || showVersions
          || showOffer || showScore || showGapRepair || showInterview
          || showCustomize || !!modal
          || showLinkedIn || showCompare || showApplications
          || showMultiCV
          || showTutorial || showSettings
          || (mob && coachScrolling)
        ) && (
          <button
            onClick={(e) => {
              if (coachDragging) { setCoachDragging(false); return; }
              openCoach(e);
            }}
            onTouchStart={(e) => {
              if (!mob) return;
              const touch = e.touches[0];
              const startX = touch.clientX;
              const startY = touch.clientY;
              coachDragStartRef.current = { startX, startY };
              coachLongPressTimer.current = setTimeout(() => {
                setCoachDragging(true);
                if (navigator.vibrate) navigator.vibrate(50);
              }, 500);
            }}
            onTouchMove={(e) => {
              if (!mob) return;
              const touch = e.touches[0];
              if (!coachDragging) {
                if (coachDragStartRef.current) {
                  const dx = Math.abs(touch.clientX - coachDragStartRef.current.startX);
                  const dy = Math.abs(touch.clientY - coachDragStartRef.current.startY);
                  if (dx > 5 || dy > 5) {
                    clearTimeout(coachLongPressTimer.current);
                    coachDragStartRef.current = null;
                  }
                }
                return;
              }
              e.preventDefault();
              const btn = e.currentTarget.getBoundingClientRect();
              const newX = touch.clientX - btn.width / 2;
              const newY = touch.clientY - btn.height / 2;
              const maxX = window.innerWidth - btn.width - 8;
              const maxY = window.innerHeight - btn.height - 8;
              setCoachPos({
                x: Math.max(8, Math.min(maxX, newX)),
                y: Math.max(8, Math.min(maxY, newY)),
              });
            }}
            onTouchEnd={() => {
              if (!mob) return;
              clearTimeout(coachLongPressTimer.current);
              if (coachDragging && coachPos) {
                lsS("nv-coach-pos", coachPos);
              }
              setTimeout(() => setCoachDragging(false), 50);
              coachDragStartRef.current = null;
            }}
            aria-label="Coach"
            style={{
              position: "fixed",
              ...(coachPos
                ? { left: coachPos.x, top: coachPos.y, right: "auto", bottom: "auto" }
                : { right: 16, bottom: 86 }),
              zIndex: 90,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: 0,
              background: "transparent",
              color: "#5b3df5",
              border: "none",
              cursor: coachDragging ? "grabbing" : "pointer",
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              transition: coachDragging
                ? "none"
                : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease",
              transform: coachDragging ? "scale(1.08)" : "",
              userSelect: "none",
              touchAction: "none",
              opacity: coachScrolling ? 0.4 : 1,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                position: "relative",
                width: 90,
                height: 90,
              }}
            >
              <span style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: "radial-gradient(circle at 50% 55%, rgba(91, 61, 245, 0.35) 0%, rgba(185, 28, 140, 0.20) 35%, rgba(91, 61, 245, 0.05) 60%, transparent 75%)",
                animation: coachDragging ? "none" : "nuviBoxBreathe 16s ease-in-out infinite",
                pointerEvents: "none",
                filter: "blur(8px)",
              }} />
              <span style={{
                position: "absolute",
                inset: "15%",
                borderRadius: "50%",
                background: "radial-gradient(ellipse at 45% 40%, rgba(91, 61, 245, 0.25) 0%, transparent 65%)",
                animation: coachDragging ? "none" : "nuviBoxBreathe 16s ease-in-out infinite",
                animationDelay: "0.5s",
                pointerEvents: "none",
                filter: "blur(4px)",
              }} />
              <span style={{
                position: "relative",
                zIndex: 2,
                filter: "drop-shadow(0 4px 12px rgba(91, 61, 245, 0.25))",
              }}>
                <NuviCompanion size={70} mode={nuviExpression ? "expression" : "idle"} expression={nuviExpression} cycleDuration={60} />
              </span>
            </span>
            {coachUsageCount < 3 && (
              <span style={{
                marginTop: 2,
                padding: "3px 10px",
                background: "rgba(91, 61, 245, 0.08)",
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "#5b3df5",
                border: "0.5px solid rgba(91, 61, 245, 0.15)",
              }}>
                Coach
              </span>
            )}
         </button>
        )}
        <NuviBigLogo active={bigLogoOpen || bigLogoActive} onDismiss={() => setBigLogoOpen(false)} />
        {showIntroBubble && !showIntro && !cvIsEmpty && (
          <div
            onClick={() => {
              setShowIntroBubble(false);
              setIntroOrigin(coachPos
                ? { x: coachPos.x + 40, y: coachPos.y + 40 }
                : { x: window.innerWidth - 60, y: window.innerHeight - 130 }
              );
              setShowIntro(true);
            }}
            style={{
              position: "fixed",
              ...(coachPos
                ? { left: Math.max(12, coachPos.x - 60), top: Math.max(12, coachPos.y - 50) }
                : { right: 16, bottom: 158 }),
              zIndex: 91,
              background: "#0f0f12",
              color: "#faf8f3",
              borderRadius: 14,
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
              boxShadow: "0 12px 32px rgba(0,0,0,0.35), 0 4px 8px rgba(0,0,0,0.2)",
              cursor: "pointer",
              animation: "introBubbleBounce 1800ms ease-in-out infinite",
              whiteSpace: "nowrap",
              lineHeight: 1.3,
              userSelect: "none",
            }}
          >
            {locale === "en" ? "👋 Tap me!" : "👋 Touche-moi !"}
            <div style={{
              position: "absolute",
              bottom: -6, left: "75%", transform: "translateX(-50%) rotate(45deg)",
              width: 12, height: 12, background: "#0f0f12",
            }} />
            <style>{`
              @keyframes introBubbleBounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-6px); }
              }
            `}</style>
          </div>
        )}
      </div>
    </>
  );
}
