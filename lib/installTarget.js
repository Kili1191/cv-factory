// OU L'APPLICATION PEUT-ELLE S'INSTALLER, ET COMMENT
//
// Cette logique vit dans un module a part, sans JSX, pour une raison
// pratique : elle est verifiable directement par les tests, sans navigateur
// ni compilation. C'est la seule partie de l'installation qui peut se
// tromper silencieusement - une detection ratee envoie quelqu'un chercher un
// bouton qui n'existe pas chez lui - donc c'est celle qui doit etre la plus
// facile a mettre a l'epreuve.

// iPadOS se presente comme un Mac depuis iOS 13 : sa chaine d'identification
// ne contient plus "iPad". Le seul indice qui reste est l'ecran tactile, un
// Mac n'en ayant pas. Sans ce test, tous les iPad recevraient le mode
// d'emploi de bureau, qui ne mene nulle part chez eux.
export function detectPlatform(ua, hasTouch, maxTouchPoints) {
  const s = String(ua || "");
  if (/iPhone|iPod|iPad/.test(s)) return "ios";
  if (/Macintosh/.test(s) && (hasTouch || (maxTouchPoints || 0) > 1)) return "ios";
  if (/Android/.test(s)) return "android";
  return "desktop";
}

// L'application tourne-t-elle DEJA depuis l'ecran d'accueil ?
//
// `display-mode: standalone` est la reponse standard. `navigator.standalone`
// est celle d'Apple, plus ancienne, et la seule fiable sur les iOS anterieurs
// a 17. On accepte les deux : proposer d'installer ce qui est deja installe
// est le genre de detail qui fait douter du reste.
export function isStandalone(win) {
  const w = win || (typeof window !== "undefined" ? window : null);
  if (!w) return false;
  try {
    if (w.navigator && w.navigator.standalone === true) return true;
    if (!w.matchMedia) return false;
    return w.matchMedia("(display-mode: standalone)").matches
        || w.matchMedia("(display-mode: minimal-ui)").matches;
  } catch {
    return false;
  }
}
