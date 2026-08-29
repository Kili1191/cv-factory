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
// ShadowLg n'existait que dans sharedTokens.js : les 26 fichiers qui
// importaient celui-ci n'avaient aucune ombre haute a leur disposition, et
// s'en fabriquaient une a la main quand il leur en fallait une.
export const ShadowLg   = "0 14px 40px rgba(10,10,10,.10), 0 0 0 0.5px rgba(10,10,10,.06)";
// Peu utilise, mais importe par des composants qui passaient par l'autre
// fichier : il doit exister ici pour que celui-la puisse disparaitre.
export const InkSoft    = "#1a1a1f";

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


// ============================================================
// CE QUI MANQUAIT AU SYSTEME, ET QUI PRODUISAIT LA DERIVE
// ============================================================
//
// Les couleurs, les rayons et les ombres etaient nommes. Les ESPACES, les
// TAILLES DE TEXTE et le MOUVEMENT ne l'etaient pas : ils s'ecrivaient a la
// main, au cas par cas, dans 266 blocs de style en ligne du seul AppRoot.
// C'est la que la coherence se perd, parce que personne ne peut retenir si
// l'ecran d'a cote respirait a 14 ou a 16.
//
// Ces trois echelles ne sont pas inventees : elles sont relevees sur ce qui
// existe deja dans le produit, arrondies aux valeurs qui reviennent le plus.
// Le but n'est pas de changer l'apparence, c'est de lui donner un nom.

// L'ESPACE
// Une seule progression, pour que deux ecrans voisins respirent pareil.
export const Space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

// LE TEXTE
// Les tailles reellement employees, nommees par role plutot que par nombre :
// on choisit un role, pas un pixel, et deux libelles de meme role finissent
// enfin a la meme taille.
export const Text = {
  micro: 10,    // les libelles en capitales, au-dessus des champs
  small: 12,    // les mentions secondaires
  body: 13,     // le texte courant de l'interface
  lead: 15,     // une phrase qui porte
  title: 18,    // un titre de panneau
  display: 24,  // un titre d'ecran
};

// LE MOUVEMENT
//
// Il n'etait nomme nulle part, et 130 endroits ecrivaient "transition: all".
// "all" anime TOUT ce qui change, y compris ce que personne n'a voulu animer :
// une largeur qui se recalcule, une couleur heritee, une ombre. C'est la
// premiere cause de saccade, et c'est invisible a la relecture parce que la
// ligne a l'air anodine.
//
// Les durees sont courtes volontairement. Une interface ou l'on travaille
// n'est pas une vitrine : le mouvement doit dire ce qui a change, puis
// disparaitre. Au-dela de 300ms on attend le logiciel.
//
// Les valeurs ne sont pas choisies dans le vide : le produit s'etait deja
// stabilise sur 180ms et 200ms, ecrits a la main partout. L'echelle epouse
// donc ce qui existe, pour que nommer le mouvement ne le change pas.
export const Dur = {
  instant: 120,  // un survol, un enfoncement
  fast: 180,     // un changement d'etat sur place, la valeur la plus courante
  base: 240,     // l'arrivee d'un element
  slow: 380,     // un panneau entier
};

// Une seule courbe pour tout ce qui entre, une pour tout ce qui bouge sur
// place. Melanger les courbes se voit sans qu'on sache dire pourquoi.
export const Ease = {
  // Sort vite, s'installe doucement : c'est la sensation d'un objet pose.
  out: "cubic-bezier(.22, 1, .36, 1)",
  inOut: "cubic-bezier(.65, 0, .35, 1)",
};

// TRANSITION NOMMEE
//
// A utiliser a la place de "all". On dit QUELLES proprietes bougent, ce qui
// evite d'animer par accident une largeur ou une hauteur recalculee.
//
//   transition: Trans("background")                    -> duree fast
//   transition: Trans(["transform", "opacity"], "base") -> duree base
//
// Le nom compte : "T" etait pris. Dans tout ce depot, T est l'objet des
// traductions, passe en prop a presque chaque composant. Un import nomme T
// aurait ete masque par la prop a l'interieur de chaque fonction, et
// l'appel serait parti sur l'objet i18n. Le build passe, la page casse au
// premier survol.
export const Trans = (props, duree = "fast") => {
  const liste = Array.isArray(props) ? props : [props];
  const ms = Dur[duree] || Dur.fast;
  return liste.map((p) => p + " " + ms + "ms " + Ease.out).join(", ");
};
