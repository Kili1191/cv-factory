// LE CONTRASTE DES COULEURS DU CV
//
// Ces fonctions vivaient dans CVLayouts.jsx, au milieu du rendu React. Elles
// ne touchent pourtant rien de React : ce sont des couleurs et des rapports
// de luminance. Les sortir ici leur permet d'etre testees directement, ce
// qui compte parce que le defaut qu'elles ont produit - un monogramme noir
// sur noir, parti dans le PDF d'un recruteur - etait une erreur de calcul
// pur, invisible a l'ecran tant qu'on ne rendait pas le bon theme.

export function hexToRgb(hex) {
  if (!hex) return { r: 0, g: 0, b: 0 };
  let h = String(hex).replace("#", "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
export function relLuminance({ r, g, b }) {
  const f = v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function contrastRatioCv(hex1, hex2) {
  const l1 = relLuminance(hexToRgb(hex1));
  const l2 = relLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
export function darkenHex(hex, factor) {
  const { r, g, b } = hexToRgb(hex);
  const d = c => Math.max(0, Math.round(c * (1 - factor)));
  const toHex = c => c.toString(16).padStart(2, "0");
  return "#" + toHex(d(r)) + toHex(d(g)) + toHex(d(b));
}
export function lightenHex(hex, factor) {
  const { r, g, b } = hexToRgb(hex);
  const l = c => Math.min(255, Math.round(c + (255 - c) * factor));
  const toHex = c => c.toString(16).padStart(2, "0");
  return "#" + toHex(l(r)) + toHex(l(g)) + toHex(l(b));
}

// Retourne une version de `accent` garantie lisible (ratio >= 4.0) sur `bg`.
//
// CETTE FONCTION FAISAIT EXACTEMENT L INVERSE DE SON NOM
//
// Elle n'assombrissait, jamais autre chose. Sur un fond clair c'est la bonne
// direction. Sur un fond sombre, assombrir l'accent le pousse vers le noir,
// donc vers le fond : le contraste baisse a chaque tour. La boucle ne pouvait
// pas atteindre 4.0, elle rendait la main apres dix essais, et retournait un
// accent plus proche du fond que celui qu'on lui avait donne.
//
// Le theme Ink en donne le cas limite : accent #14140f sur bande #14140f, la
// meme couleur. La fonction rendait #020202, soit 1.12 : 1. Le monogramme du
// CV, un disque avec les initiales, se peignait donc en noir sur noir. Il
// partait comme ca dans le PDF envoye au recruteur.
//
// La direction ne se deduit pas de l'accent mais du fond, et on la choisit
// sans seuil arbitraire : on regarde lequel du blanc ou du noir contraste le
// plus avec ce fond, et on va de ce cote.
export function readableAccentOn(accent, bg) {
  if (!accent || !bg) return accent || "#0a0a0a";
  if (contrastRatioCv(accent, bg) >= 4.0) return accent;

  const fondSombre = contrastRatioCv("#ffffff", bg) > contrastRatioCv("#000000", bg);
  let c = accent;
  for (let i = 0; i < 12 && contrastRatioCv(c, bg) < 4.0; i++) {
    c = fondSombre ? lightenHex(c, 0.18) : darkenHex(c, 0.18);
  }

  // Un accent tres sature peut ne jamais atteindre 4.0 en gardant sa teinte.
  // Un texte lisible vaut mieux qu'une teinte respectee : on prend alors le
  // contraste maximal disponible plutot que de rendre quelque chose
  // d'invisible sur le document que lit un recruteur.
  if (contrastRatioCv(c, bg) < 4.0) c = fondSombre ? "#ffffff" : "#000000";
  return c;
}
