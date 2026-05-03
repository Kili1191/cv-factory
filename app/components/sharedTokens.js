// CV Factory / Nuvi - Design tokens & shared helpers
// Extrait de page.jsx pour permettre aux composants externalises
// d'avoir acces aux memes valeurs.
//
// IMPORTANT : page.jsx definit les MEMES tokens en inline pour ne pas
// casser sa logique existante. Les valeurs DOIVENT rester strictement
// identiques entre les deux. Si on en modifie un, modifier les deux.

// === Palette Nuvi ===
export const Ink       = "#0a0a0a";
export const InkSoft   = "#1a1a1f";
export const Cream     = "#faf8f3";   // [Nuvi] cream aligne (etait #f5f1e8)
export const CreamSoft = "#f6f2e8";   // [Nuvi] cream soft aligne (etait #faf7ef)
export const Paper     = "#ffffff";
export const Gold      = "#c9a96e";   // RESERVE au CV preview (elegance pro)
export const GoldDeep  = "#a07840";   // RESERVE au CV preview
export const Purple    = "#5b3df5";   // [Nuvi] violet pour Coach, IA, generation
export const PurpleSoft= "#ede9fe";
export const Magenta   = "#b91c8c";   // [Nuvi] magenta pour gradients CTA primaires
export const Coral     = "#d97757";   // [Nuvi] terracotta doux (etait #ff5a36 trop vif)
export const CoralSoft = "#fce7dd";   // [Nuvi] terracotta tres clair (coherent)
export const Green     = "#16a34a";
export const GreenSoft = "#dcfce7";
export const Gray50    = "#fafaf9";
export const Gray100   = "#f5f4f0";
export const Gray200   = "#e7e5dc";
export const Gray400   = "#a8a59a";
export const Gray600   = "#57534e";
export const Gray900   = "#292524";

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
export const GradDark   = "linear-gradient(135deg, #0a0a0a 0%, #1a1a1f 50%, #c9a96e 100%)";
export const GradGold   = "linear-gradient(135deg, #c9a96e 0%, #a07840 100%)";  // RESERVE au CV
export const GradPurple = "linear-gradient(135deg, #5b3df5 0%, #b91c8c 100%)";  // [Nuvi] CTA primaire
export const GradCoral  = "linear-gradient(135deg, #d97757 0%, #c25c3d 100%)";  // [Nuvi] terracotta soft

// === Style helpers ===
export const B = (x={}) => ({ border:"none", cursor:"pointer", fontFamily:"inherit", ...x });

export const IN = (x={}) => ({
  width:"100%", padding:"10px 12px", borderRadius:8,
  border:"1px solid #ddd", fontSize:13, fontFamily:"inherit",
  boxSizing:"border-box", outline:"none", background:"#fff", ...x
});

export const LBL = {
  display:"block", fontSize:10, fontWeight:700, color:"#999",
  letterSpacing:1.2, textTransform:"uppercase", marginBottom:5
};

export const SH = (x={}) => ({
  fontSize:10, fontWeight:700, color:"#999", letterSpacing:1.5,
  textTransform:"uppercase", margin:"16px 0 10px",
  paddingBottom:5, borderBottom:"1px solid #eee", ...x
});

// === Anti-em-dash constraint (pour les prompts AI) ===
export const NO_DASH =
    "Tu interdis tous les tirets cadratin (em dash) ou demi-cadratin (en dash). "
  + "Pour separer ou ponctuer, utilise UNIQUEMENT virgule, parenthese, deux points "
  + "ou tiret simple - (hyphen-minus U+002D). "
  + "Toute occurrence d'un tiret cadratin ou demi-cadratin sera consideree comme une faute majeure.";
