// Nuvi v3 - Design tokens partages avec support dark mode via CSS variables.
// Importes par page.jsx ET les composants extraits dans /components.
// Source de verite unique pour la palette, les fonts, les radius, les shadows.
//
// [Nuvi v3 dark mode] :
//   - Les couleurs sont desormais des CSS variables (var(--nuvi-...))
//   - Le theme bascule via [data-theme="dark"] sur <html>
//   - Definitions des variables : voir app/globals.css
//   - Aucune modification des composants n'est requise
//
// IMPORTANT : Pour les valeurs hex pures (genre dans gradient strings ou
// concatenations CSS-in-JS), on conserve les valeurs hardcodees ci-dessous
// dans des constantes _RAW. Utiliser les CSS vars dans 99% des cas.

// ===== Palette Nuvi (CSS variables) =====
export const Ink       = "var(--nuvi-ink)";
export const InkMuted  = "var(--nuvi-ink-muted)";
export const Cream     = "var(--nuvi-cream)";
export const CreamSoft = "var(--nuvi-cream-soft)";
export const Paper     = "var(--nuvi-paper)";
export const Hairline  = "var(--nuvi-hairline)";
export const Gold      = "var(--nuvi-gold)";       // RESERVE au CV preview
export const GoldDeep  = "var(--nuvi-gold-deep)";  // RESERVE au CV preview
export const Purple    = "var(--nuvi-purple)";
export const PurpleSoft= "var(--nuvi-purple-soft)";
export const Magenta   = "var(--nuvi-magenta)";
export const Coral     = "var(--nuvi-coral)";
export const CoralSoft = "var(--nuvi-coral-soft)";
export const Green     = "var(--nuvi-green)";
export const GreenSoft = "var(--nuvi-green-soft)";

// Echelle de gris
export const Gray50    = "var(--nuvi-gray50)";
export const Gray100   = "var(--nuvi-gray100)";
export const Gray200   = "var(--nuvi-gray200)";
export const Gray400   = "var(--nuvi-gray400)";
export const Gray600   = "var(--nuvi-gray600)";
export const Gray900   = "var(--nuvi-gray900)";

// ===== Valeurs RAW pour les cas ou CSS vars ne marchent pas =====
// Utilises uniquement dans les gradients string et certains concatenations.
// Ces valeurs sont les valeurs LIGHT (pour eviter les bugs de rendu).
export const Ink_RAW       = "#0a0a0a";
export const Cream_RAW     = "#faf8f3";
export const Paper_RAW     = "#ffffff";
export const Purple_RAW    = "#5b3df5";
export const Magenta_RAW   = "#b91c8c";
export const Coral_RAW     = "#d97757";
export const Gold_RAW      = "#c9a96e";
export const GoldDeep_RAW  = "#a07840";

// ===== Fonts =====
export const Serif = "'Fraunces', 'Playfair Display', Georgia, serif";
export const Sans  = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// URL CSS chargee une fois dans le shell App.
export const FONT_URL = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..700&family=Inter:wght@300..700&family=Lato:wght@400;700&family=Playfair+Display:wght@400;700&display=swap";

// ===== Radius / Shadows =====
export const RadiusSm   = 10;
export const RadiusMd   = 16;
export const RadiusLg   = 22;
export const RadiusPill = 999;
export const ShadowSm   = "0 1px 2px rgba(10,10,10,.04), 0 0 0 0.5px rgba(10,10,10,.06)";
export const ShadowMd   = "0 4px 12px rgba(10,10,10,.08), 0 0 0 0.5px rgba(10,10,10,.06)";

// ===== Gradients reserves aux moments forts =====
// Utilisent les valeurs RAW pour eviter les bugs (les gradients sont des strings).
export const GradDark   = "linear-gradient(135deg, #0a0a0a 0%, #1a1a1f 50%, #c9a96e 100%)";
export const GradGold   = "linear-gradient(135deg, #c9a96e 0%, #a07840 100%)";              // RESERVE au CV
export const GradPurple = "linear-gradient(135deg, #5b3df5 0%, #b91c8c 100%)";              // CTA primaire
export const GradCoral  = "linear-gradient(135deg, #d97757 0%, #c25c3d 100%)";              // terracotta only

// Keyframes globales (cvfSpin / cvfFadeIn / cvfSlideUp).
export const KEYFRAMES_V17 = `
@keyframes cvfSpin{to{transform:rotate(360deg)}}
@keyframes cvfFadeIn{from{opacity:0}to{opacity:1}}
@keyframes cvfSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
`;

// ===== Helper button reset =====
export const B = (x={}) => ({ border:"none", cursor:"pointer", fontFamily:"inherit", ...x });

// Alias retro-compat : Dark = Ink (pour les composants legacy qui utilisent encore "Dark").
export const Dark = Ink;

// ===== Helpers d'input / label =====
// IN(extras) : style standard pour les <input> et <textarea>.
export const IN = (x={}) => ({
  width:"100%", padding:"10px 12px", borderRadius:8,
  border:"1px solid var(--nuvi-hairline)", fontSize:13, fontFamily:"inherit",
  boxSizing:"border-box", outline:"none", background:"var(--nuvi-paper)",
  color:"var(--nuvi-ink)",
  ...x
});

// LBL : style pour les <label> au-dessus des inputs.
export const LBL = {
  display:"block", fontSize:10, fontWeight:700, color:"var(--nuvi-ink-muted)",
  letterSpacing:1.2, textTransform:"uppercase", marginBottom:5
};

// SH(extras) : style pour les sous-headers de section.
export const SH = (x={}) => ({
  fontSize:10, fontWeight:700, color:"var(--nuvi-ink-muted)", letterSpacing:1.5,
  textTransform:"uppercase", margin:"16px 0 10px",
  paddingBottom:5, borderBottom:"1px solid var(--nuvi-hairline)", ...x
});

// Anti-tirets : phrase de garde injectee dans tous les prompts IA.
export const NO_DASH =
  "INTERDICTION ABSOLUE d'utiliser des tirets cadratins (em dash) ou demi-cadratins (en dash). "
+ "Utilise des virgules, des deux-points, des points, ou retire-les. Aucune exception.";
