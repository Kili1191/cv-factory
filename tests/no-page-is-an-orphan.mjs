// Une page qui existe se rejoint depuis le produit.
//
// LE DEFAUT
//
// /verifier est une page complete : on y depose son CV en PDF et elle montre
// ce qu'un robot de tri en lit, sur place, sans compte et sans rien envoyer.
// Elle marche, elle a ses propres tests, elle est en production depuis des
// semaines. Aucun lien du site n'y menait. Personne ne l'a jamais vue, sauf
// en tapant l'adresse.
//
// Ce n'est pas une faute qu'on remarque : rien n'echoue, rien n'est rouge, la
// page repond parfaitement a qui la demande. Elle n'existe simplement pas
// pour ceux a qui elle etait destinee.
//
// L'EXCEPTION, ET POURQUOI ELLE EST NOMMEE ICI
//
// /diagnostic verifie la configuration Supabase d'une installation. Son
// propre en-tete dit qu'elle n'est reliee a aucun bouton et que c'est voulu :
// c'est un outil de mise en service, pas une fonctionnalite. Elle est donc
// exemptee, par son nom, pour qu'ajouter une page orpheline demande de
// l'ecrire ici et d'assumer la raison.

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const APP = new URL("../app/", import.meta.url).pathname;

// Les routes qui n'ont pas a etre reliees, et pourquoi.
const EXEMPTES = {
  "/app": "c'est l'outil lui-meme, la vitrine y mene",
  "/diagnostic": "outil de mise en service, orpheline volontairement (voir "
    + "l'en-tete de app/diagnostic/page.jsx)",
};

function routes() {
  const out = [];
  for (const e of readdirSync(APP, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    if (["api", "components", "i18n", "lib"].includes(e.name)) continue;
    if (e.name.startsWith("_") || e.name.startsWith(".")) continue;
    try {
      statSync(join(APP, e.name, "page.jsx"));
      out.push("/" + e.name);
    } catch { /* pas une route */ }
  }
  return out;
}

function sources(racine) {
  const out = [];
  for (const e of readdirSync(racine, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = join(racine, e.name);
    if (e.isDirectory()) out.push(...sources(p));
    else if (/\.(jsx|js|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

export async function run() {
  const failures = [];

  try {
    const fichiers = sources(APP);
    let verifiees = 0;

    for (const route of routes()) {
      if (EXEMPTES[route]) continue;
      verifiees += 1;
      const dossier = APP + route.slice(1) + "/";

      // Un lien vers la route, ecrit ailleurs que dans la page elle-meme :
      // une page qui pointe sur soi ne prouve rien.
      const menent = fichiers.filter((f) => {
        if (f.startsWith(dossier)) return false;
        const src = readFileSync(f, "utf8");
        return src.includes('"' + route + '"') || src.includes("'" + route + "'")
          || src.includes("href=" + JSON.stringify(route));
      });

      if (!menent.length) {
        failures.push("la page " + route + " existe et rien n'y mene. Elle "
          + "marche, elle ne rate aucun test, et personne ne la voit : on n'y "
          + "arrive qu'en tapant l'adresse. Poser un lien, ou l'inscrire dans "
          + "EXEMPTES avec sa raison.");
      }
    }

    if (verifiees < 1) {
      failures.push("aucune route verifiee : le balayage ne trouve plus les "
        + "dossiers de pages sous app/.");
    } else if (!failures.length) {
      console.log("      " + verifiees + " page(s) hors exemptions, toutes "
        + "reliees depuis le produit");
    }
  } catch (err) {
    failures.push("le test lui-meme a plante : " + (err && err.message));
  }

  return failures;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((f) => {
    for (const l of f) console.log("ECHEC " + l);
    process.exit(f.length ? 1 : 0);
  });
}
