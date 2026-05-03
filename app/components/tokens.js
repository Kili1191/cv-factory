// Nuvi v2 - Design tokens partages.
// Importes par page.jsx ET les composants extraits dans /components.
// Source de verite unique pour la palette, les fonts, les radius, les shadows.
//
// [Nuvi v2 alignment] :
//   - Coral passe de #ff5a36 (orange vif) a #d97757 (terracotta doux)
//   - Cream/CreamSoft alignes sur la palette Nuvi (#faf8f3 / #f6f2e8)
//   - Ajout Magenta (#b91c8c) pour les gradients CTA primaires
//   - Ajout Hairline et InkMuted (utilises dans NuviSidebar v2 et AdjustModal)
//   - GradCoral passe en terracotta only (au lieu de orange->jaune)
//   - Gold/GoldDeep RESERVES au CV preview (elegance pro), inchanges

// ===== Palette Nuvi =====
export const Ink       = "#0a0a0a";   // noir profond, surface principale
export const InkMuted  = "#5a5a62";   // [Nuvi v2] gris-bleu pour text muted
export const Cream     = "#faf8f3";   // [Nuvi v2] cream Nuvi (etait #f5f1e8)
export const CreamSoft = "#f6f2e8";   // [Nuvi v2] cream soft Nuvi (etait #faf7ef)
export const Paper     = "#ffffff";   // cards
export const Hairline  = "#e8e3d6";   // [Nuvi v2] border subtle (utilise sidebar v2)
export const Gold      = "#c9a96e";   // RESERVE au CV preview (elegance pro)
export const GoldDeep  = "#a07840";   // RESERVE au CV preview
export const Purple    = "#5b3df5";   // violet electrique : Coach, IA, CTA primaires
export const PurpleSoft= "#ede9fe";
export const Magenta   = "#b91c8c";   // [Nuvi v2] magenta pour gradients CTA
export const Coral     = "#d97757";   // [Nuvi v2] terracotta doux (etait #ff5a36)
export const CoralSoft = "#fce7dd";   // [Nuvi v2] terracotta tres clair (coherent)
export const Green     = "#16a34a";
export const GreenSoft = "#dcfce7";

// Echelle de gris
export const Gray50    = "#fafaf9";
export const Gray100   = "#f5f4f0";
export const Gray200   = "#e7e5dc";
export const Gray400   = "#a8a59a";
export const Gray600   = "#57534e";
export const Gray900   = "#292524";

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
export const GradDark   = "linear-gradient(135deg, #0a0a0a 0%, #1a1a1f 50%, #c9a96e 100%)";
export const GradGold   = "linear-gradient(135deg, #c9a96e 0%, #a07840 100%)";              // RESERVE au CV
export const GradPurple = "linear-gradient(135deg, #5b3df5 0%, #b91c8c 100%)";              // [Nuvi v2] CTA primaire
export const GradCoral  = "linear-gradient(135deg, #d97757 0%, #c25c3d 100%)";              // [Nuvi v2] terracotta only

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
  border:"1px solid #ddd", fontSize:13, fontFamily:"inherit",
  boxSizing:"border-box", outline:"none", background:"#fff", ...x
});

// LBL : style pour les <label> au-dessus des inputs.
export const LBL = {
  display:"block", fontSize:10, fontWeight:700, color:"#999",
  letterSpacing:1.2, textTransform:"uppercase", marginBottom:5
};

// SH(extras) : style pour les sous-headers de section.
export const SH = (x={}) => ({
  fontSize:10, fontWeight:700, color:"#999", letterSpacing:1.5,
  textTransform:"uppercase", margin:"16px 0 10px",
  paddingBottom:5, borderBottom:"1px solid #eee", ...x
});

// Anti-tirets : phrase de garde injectee dans tous les prompts IA.
// La sanitization cote client (sanDeep dans page.jsx) l'enforce de toute facon,
// mais on demande aussi explicitement a l'IA de l'eviter pour une double-securite.
export const NO_DASH =
  "INTERDICTION ABSOLUE d'utiliser des tirets cadratins (em dash) ou demi-cadratins (en dash). "
+ "Utilise des virgules, des deux-points, des points, ou retire-les. Aucune exception.";
