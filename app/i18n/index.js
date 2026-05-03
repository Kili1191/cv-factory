// Nuvi — Router i18n
//
// Phase 1 : extraction simple synchrone (zéro risque).
// Les 2 dictionnaires (FR_T et EN_T) sont déplacés depuis page.jsx
// dans des fichiers séparés. La signature et les noms restent identiques :
// le code existant ligne 5476 (`locale==="en" ? EN_T : FR_T`) fonctionne
// sans aucune modification.
//
// Gains :
//   - page.jsx allégé de ~1540 lignes
//   - hot reload Vite plus rapide (les dicos sont cachés indépendamment)
//   - prêt pour une Phase 2 lazy loading par langue plus tard

import FR_T from "./fr";
import EN_T from "./en";

export { FR_T, EN_T };

// Helper si besoin : retourne le bon dictionnaire selon la locale
export function getT(locale) {
  return locale === "en" ? EN_T : FR_T;
}
