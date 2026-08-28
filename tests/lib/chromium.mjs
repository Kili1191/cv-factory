// Ou se trouve le Chromium a piloter.
//
// POURQUOI CE FICHIER EXISTE
//
// Le chemin vivait dans harness.mjs, et une deuxieme copie s'est glissee dans
// la configuration de playwright-cli quand cet outil est arrive. Deux endroits
// a corriger le jour ou l'image change, donc un des deux oublie. Un seul
// maintenant, dont le script scripts/playwright-cli-config.mjs derive l'autre.
//
// LE NUMERO DE BUILD N'EST PAS STABLE
//
// L'ancienne version nommait chromium-1194 en dur. Le numero appartient a la
// version de playwright qui a installe le binaire : il change des que l'image
// bouge, et il differe deja de celui qu'attend playwright-cli. On liste donc
// le dossier au lieu de parier sur un nombre.

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const RACINE = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers";

// L'ordre compte : ce que l'appelant a demande explicitement passe avant ce
// que la machine se trouve avoir.
export function cheminChromium() {
  const explicite = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  if (explicite && existsSync(explicite)) return explicite;

  let entrees = [];
  try {
    entrees = readdirSync(RACINE).filter(n => n.startsWith("chromium-"));
  } catch (e) { /* racine absente : on laisse playwright se debrouiller */ }

  // Du plus recent au plus ancien, pour qu'une image qui garde deux versions
  // serve celle qui correspond au playwright installe.
  entrees.sort((a, b) => Number(b.slice(9)) - Number(a.slice(9)));

  for (const nom of entrees) {
    const p = join(RACINE, nom, "chrome-linux", "chrome");
    if (existsSync(p)) return p;
  }
  return null;
}

// En CI, playwright installe son propre Chromium et trouve tout seul : rendre
// un objet vide le laisse faire, ce qui est le comportement voulu.
export function browserOptions() {
  const p = cheminChromium();
  return p ? { executablePath: p } : {};
}
