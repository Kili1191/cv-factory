// Ou se trouve le Chromium a piloter.
//
// La recherche elle-meme vit dans lib/chromiumLocal.js, parce que la route
// d'impression PDF en a besoin aussi et qu'une deuxieme copie a deja diverge
// une fois (voir le commentaire la-bas). Ce fichier ne garde que les deux
// noms que le harnais et scripts/playwright-cli-config.mjs importent.

export { cheminChromium } from "../../lib/chromiumLocal.js";
import { cheminChromium } from "../../lib/chromiumLocal.js";

// En CI, playwright installe son propre Chromium et trouve tout seul : rendre
// un objet vide le laisse faire, ce qui est le comportement voulu.
export function browserOptions() {
  const p = cheminChromium();
  return p ? { executablePath: p } : {};
}
