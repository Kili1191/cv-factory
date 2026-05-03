// CV Factory — Design tokens & shared helpers
// Extrait de page.jsx pour permettre aux composants externalisés
// d'avoir accès aux mêmes valeurs.
//
// IMPORTANT : page.jsx définit les MÊMES tokens en inline pour ne pas
// casser sa logique existante. Les valeurs DOIVENT rester strictement
// identiques entre les deux. Si on en modifie un, modifier les deux.

// === Palette ===
export const Ink       = "#0a0a0a";
export const InkSoft   = "#1a1a1f";
export const Cream     = "#f5f1e8";
export const CreamSoft = "#faf7ef";
export const Paper     = "#ffffff";
export const Gold      = "#c9a96e";
export const GoldDeep  = "#a07840";
export const Purple    = "#5b3df5";
export const PurpleSoft= "#ede9fe";
export const Coral     = "#ff5a36";
export const CoralSoft = "#ffe8e1";
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
export const GradGold   = "linear-gradient(135deg, #c9a96e 0%, #a07840 100%)";
export const GradPurple = "linear-gradient(135deg, #5b3df5 0%, #b91c8c 100%)";
export const GradCoral  = "linear-gradient(135deg, #ff5a36 0%, #ffa800 100%)";

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
