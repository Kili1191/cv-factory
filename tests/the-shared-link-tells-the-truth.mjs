// Le lien partage annonce ce qu'on va trouver.
//
// POURQUOI CE TEST EXISTE
//
// La vignette de partage - titre, description, image, langue - est fabriquee
// par LinkedIn, WhatsApp ou X a partir des balises du document. Personne dans
// l'equipe ne la voit jamais : on ne la decouvre qu'en collant un lien
// quelque part, et on ne pense pas a le refaire apres une modification.
//
// Elle etait restee en francais alors que le site s'ouvre en anglais. La
// carte disait une chose, la page en disait une autre, et c'est precisement
// l'instant ou quelqu'un decide de cliquer ou non.
//
// CE QU'IL VERIFIE
//
//   1. Les balises existent : titre, description, image, manifeste, icone.
//      Sans elles, un lien colle n'affiche qu'une adresse nue.
//   2. La carte parle la MEME langue que le document. C'est le defaut qui
//      etait la, et rien d'autre ne peut l'attraper.
//   3. La page se declare adaptable au telephone, et n'interdit pas le zoom.
//      Bloquer le zoom rend l'application inutilisable a qui a besoin
//      d'agrandir, pour ne gagner qu'un detail esthetique.
//   4. Les images annoncees existent vraiment. Une vignette qui pointe vers
//      un fichier absent donne une carte vide, ce qui est pire que pas de
//      carte du tout.

import { startServer, stopServer, BASE_URL } from "./lib/harness.mjs";

// Des mots qui n'existent que dans une seule des deux langues.
const FRANCAIS = /\b(le|la|les|qui|colle|obtiens|tes|candidatures|annonce)\b/i;

function meta(html, cle) {
  const motifs = [
    new RegExp(`<meta[^>]+property="${cle}"[^>]+content="([^"]*)"`, "i"),
    new RegExp(`<meta[^>]+content="([^"]*)"[^>]+property="${cle}"`, "i"),
    new RegExp(`<meta[^>]+name="${cle}"[^>]+content="([^"]*)"`, "i"),
    new RegExp(`<meta[^>]+content="([^"]*)"[^>]+name="${cle}"`, "i"),
  ];
  for (const m of motifs) {
    const r = html.match(m);
    if (r) return r[1];
  }
  return null;
}

export async function run() {
  const failures = [];
  const server = await startServer();

  try {
    const html = await (await fetch(BASE_URL)).text();

    const lang = (html.match(/<html[^>]+lang="([^"]*)"/i) || [])[1] || "";
    const titre = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || "";

    // --- 1. Les balises existent ---------------------------------------
    const attendus = [
      ["og:title", "le titre de la vignette"],
      ["og:description", "la description de la vignette"],
      ["og:image", "l'image de la vignette"],
      ["description", "la description pour les moteurs de recherche"],
    ];
    const valeurs = {};
    for (const [cle, quoi] of attendus) {
      const v = meta(html, cle);
      valeurs[cle] = v;
      if (!v) {
        failures.push(
          `${quoi} (${cle}) est absente. Un lien colle sur LinkedIn ou envoye `
          + "par message n'affichera qu'une adresse nue."
        );
      }
    }
    if (!/<link[^>]+rel="manifest"/i.test(html)) {
      failures.push("le manifeste est absent : l'application ne s'installe pas sur un telephone");
    }
    if (!/<link[^>]+rel="apple-touch-icon"/i.test(html)) {
      failures.push("l'icone iOS est absente : l'ecran d'accueil affichera une capture de la page");
    }

    // --- 2. La carte parle la langue du document -----------------------
    //
    // On ne teste pas "c'est en anglais" mais "c'est la meme langue que la
    // page" : le jour ou le site basculera par defaut en francais, ce test
    // devra continuer a dire la verite sans etre reecrit.
    const pageEnFrancais = FRANCAIS.test(titre);
    for (const cle of ["og:title", "og:description", "description"]) {
      const v = valeurs[cle];
      if (!v) continue;
      const vignetteEnFrancais = FRANCAIS.test(v);
      if (vignetteEnFrancais !== pageEnFrancais) {
        failures.push(
          `${cle} est en ${vignetteEnFrancais ? "francais" : "anglais"} alors que `
          + `le document se declare lang="${lang}" et s'intitule "${titre}". `
          + "La carte de partage dira une chose et la page en dira une autre, "
          + "au moment precis ou quelqu'un decide de cliquer."
        );
      }
    }

    // --- 3. Adapte au telephone, zoom permis ---------------------------
    const vp = meta(html, "viewport") || "";
    if (!/width=device-width/.test(vp)) {
      failures.push(
        `la balise viewport ne dit pas width=device-width ("${vp}"). Le telephone `
        + "affichera la page en version bureau, minuscule."
      );
    }
    if (/user-scalable\s*=\s*(no|0)/i.test(vp) || /maximum-scale\s*=\s*1(\.0)?\b/.test(vp)) {
      failures.push(
        `la balise viewport interdit le zoom ("${vp}"). C'est inutilisable pour `
        + "qui a besoin d'agrandir, et ca ne gagne qu'un detail esthetique."
      );
    }

    // --- 4. Les images annoncees existent ------------------------------
    // metadataBase rend ces adresses absolues sur le domaine de production.
    // Les interroger la-bas testerait le site EN LIGNE, pas le build qu'on
    // vient de fabriquer : une image ajoutee aujourd'hui serait signalee
    // manquante, et une image supprimee passerait au vert jusqu'au prochain
    // deploiement. On ne garde donc que le chemin, et on le sert localement.
    const chemin = (src) => {
      try { return new URL(src, BASE_URL).pathname; } catch { return src; }
    };
    // og:image et twitter:image pointent volontairement sur le meme fichier :
    // sans dedoublonnage, le meme constat sortirait deux fois.
    const aTester = [...new Set(
      [valeurs["og:image"], meta(html, "twitter:image")].filter(Boolean).map(chemin)
    )];
    for (const src of aTester) {
      let code = 0;
      try { code = (await fetch(BASE_URL + src)).status; } catch { code = 0; }
      if (code !== 200) {
        failures.push(
          `l'image de partage ${src} repond ${code || "rien"} sur le build local. `
          + "La vignette sera vide, ce qui est pire que pas de vignette du tout."
        );
      }
    }

    if (!failures.length) {
      console.log(
        `      vignette coherente avec le document (lang="${lang}"), `
        + `images servies, zoom permis`
      );
    }
  } catch (err) {
    failures.push(`le test a plante : ${err && err.message}`);
  } finally {
    await stopServer(server);
  }
  return failures;
}
