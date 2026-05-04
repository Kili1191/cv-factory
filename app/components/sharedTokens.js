// CV Factory / Nuvi - Design tokens & shared helpers (v3 dark mode)
// Extrait de page.jsx pour permettre aux composants externalises
// d'avoir acces aux memes valeurs.
//
// [Nuvi v3 dark mode] :
//   - Les couleurs sont desormais des CSS variables (var(--nuvi-...))
//   - Le theme bascule via [data-theme="dark"] sur <html>
//   - Definitions des variables : voir app/globals.css
//
// IMPORTANT : tokens.js et sharedTokens.js doivent rester strictement
// alignes. Si on en modifie un, modifier l'autre.

// === Palette Nuvi (CSS variables) ===
export const Ink       = "var(--nuvi-ink)";
export const InkSoft   = "#1a1a1f";              // [Nuvi v3] reste hardcode (peu utilise)
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
export const Gray50    = "var(--nuvi-gray50)";
export const Gray100   = "var(--nuvi-gray100)";
export const Gray200   = "var(--nuvi-gray200)";
export const Gray400   = "var(--nuvi-gray400)";
export const Gray600   = "var(--nuvi-gray600)";
export const Gray900   = "var(--nuvi-gray900)";

// === Fonts ===
export const Serif = "'Fraunces', 'Playfair Display', Georgia, serif";
export const Sans  = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// === Backwards compat ===
export const Dark = Ink;

// === Radius / shadow tokens ===
export const RadiusSm   = 10;
export const RadiusMd   = 16;
export const RadiusLg   = 22;
export const RadiusPill = 999;
export const ShadowSm   = "0 1px 2px rgba(10,10,10,.04), 0 0 0 0.5px rgba(10,10,10,.06)";
export const ShadowMd   = "0 4px 14px rgba(10,10,10,.06), 0 0 0 0.5px rgba(10,10,10,.06)";
export const ShadowLg   = "0 14px 40px rgba(10,10,10,.10), 0 0 0 0.5px rgba(10,10,10,.06)";

// === Gradients ===
// Utilisent les valeurs RAW pour eviter les bugs (les gradients sont des strings).
export const GradDark   = "linear-gradient(135deg, #0a0a0a 0%, #1a1a1f 50%, #c9a96e 100%)";
export const GradGold   = "linear-gradient(135deg, #c9a96e 0%, #a07840 100%)";  // RESERVE au CV
export const GradPurple = "linear-gradient(135deg, #5b3df5 0%, #b91c8c 100%)";  // CTA primaire
export const GradCoral  = "linear-gradient(135deg, #d97757 0%, #c25c3d 100%)";  // terracotta soft

// === Style helpers ===
export const B = (x={}) => ({ border:"none", cursor:"pointer", fontFamily:"inherit", ...x });

export const IN = (x={}) => ({
  width:"100%", padding:"10px 12px", borderRadius:8,
  border:"1px solid var(--nuvi-hairline)", fontSize:13, fontFamily:"inherit",
  boxSizing:"border-box", outline:"none",
  background:"var(--nuvi-paper)",
  color:"var(--nuvi-ink)",
  ...x
});

export const LBL = {
  display:"block", fontSize:10, fontWeight:700, color:"var(--nuvi-ink-muted)",
  letterSpacing:1.2, textTransform:"uppercase", marginBottom:5
};

export const SH = (x={}) => ({
  fontSize:10, fontWeight:700, color:"var(--nuvi-ink-muted)", letterSpacing:1.5,
  textTransform:"uppercase", margin:"16px 0 10px",
  paddingBottom:5, borderBottom:"1px solid var(--nuvi-hairline)", ...x
});

// === Anti-em-dash constraint (pour les prompts AI) ===
export const NO_DASH =
    "Tu interdis tous les tirets cadratin (em dash) ou demi-cadratin (en dash). "
  + "Pour separer ou ponctuer, utilise UNIQUEMENT virgule, parenthese, deux points "
  + "ou tiret simple - (hyphen-minus U+002D). "
  + "Toute occurrence d'un tiret cadratin ou demi-cadratin sera consideree comme une faute majeure.";
