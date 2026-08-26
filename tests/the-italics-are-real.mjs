// Les mots en italique doivent etre de vrais italiques.
//
// LE DEFAUT QU'IL EMPECHE
//
// Une URL Google Fonts ne sert QUE ce qu'on lui demande. Sans l'axe "ital",
// elle rend zero face italique - et rien ne le signale : pas d'erreur, pas de
// 404, la police se charge, la page s'affiche.
//
// Le navigateur, lui, doit bien honorer font-style: italic. Alors il fabrique
// un faux italique en penchant les lettres droites. Une lettre penchee de
// force garde la largeur d'avance de la lettre droite : son encre deborde a
// droite, et tout conteneur qui la serre - overflow cache, degrade pose par
// background-clip:text - lui coupe le bout.
//
// Resultat vu en production : des mots italiques amputes un peu partout, y
// compris dans le CV exporte en PDF, la ou un recruteur les lit.
//
// CE QUE CE TEST FAIT
//
// Il ne se contente pas de chercher "ital" dans les URL : il DEMANDE a Google
// combien de faces italiques chaque URL sert reellement. Une URL qui a l'air
// juste mais que Google refuse (axe mal ecrit, poids inexistant) est attrapee.
//
// Sans reseau, le test ne rougit pas : il annonce qu'il n'a pas pu verifier.
// Faire echouer une livraison parce que Google Fonts est injoignable serait
// pire que le defaut lui-meme.

import { readFileSync } from "node:fs";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
  + "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Les polices qui n'ont PAS d'italique chez Google. Leur reclamer l'axe ferait
// rendre 400 et la police ne se chargerait plus du tout : pire que le defaut.
const SANS_ITALIQUE = ["Space+Grotesk"];

function urlsDuDepot() {
  const found = new Set();
  for (const f of ["app/layout.jsx", "app/page.jsx"]) {
    const src = readFileSync(f, "utf8");
    const utile = src
      // Les lignes de commentaire contiennent des URL d'EXEMPLE, qui ne sont
      // jamais chargees. Les juger ferait rougir le test pour une police qui
      // n'existe nulle part dans le produit - ce qui est arrive.
      .split("\n").filter(l => !l.trimStart().startsWith("//")).join("\n")
      // Les URL de layout.jsx sont concatenees sur plusieurs lignes : on
      // recolle les morceaux entre guillemets avant de chercher.
      .replace(/"\s*\+\s*"/g, "");
    for (const m of utile.matchAll(/https:\/\/fonts\.googleapis\.com\/css2\?[^"'`\s]+/g)) {
      found.add(m[0]);
    }
  }
  return [...found];
}

export async function run() {
  const failures = [];
  const urls = urlsDuDepot();

  if (urls.length === 0) {
    return ["aucune URL Google Fonts trouvee : le test ne verifie plus rien"];
  }

  let verifiees = 0;
  for (const url of urls) {
    // Une URL peut porter plusieurs familles : on les traite une par une.
    const familles = [...url.matchAll(/family=([^&]+)/g)].map(m => m[1]);

    const attendues = familles.filter(f => {
      const nom = f.split(":")[0];
      return !SANS_ITALIQUE.includes(nom);
    });
    if (attendues.length === 0) continue;

    let css;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        failures.push(
          `Google refuse cette URL de police (HTTP ${res.status}) : ${url.slice(0, 90)}. `
          + "La police ne se chargera pas du tout."
        );
        continue;
      }
      css = await res.text();
    } catch {
      // Reseau absent : on ne juge pas.
      continue;
    }

    verifiees++;

    // POLICE PAR POLICE, ET NON SUR LA REPONSE ENTIERE
    //
    // Une seule URL peut charger trois familles. Compter les faces italiques
    // sur tout le CSS laisse passer le cas ou UNE famille perd les siennes
    // pendant que les autres en ont : le total reste positif, le test reste
    // vert, et le defaut part en production. C'est arrive en ecrivant ce
    // test, attrape en le cassant expres.
    const italiquesPar = new Map();
    for (const bloc of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
      const corps = bloc[1];
      const fam = /font-family:\s*'([^']+)'/.exec(corps);
      if (!fam) continue;
      const estItalique = /font-style:\s*italic/.test(corps);
      const dejaVu = italiquesPar.get(fam[1]) || false;
      italiquesPar.set(fam[1], dejaVu || estItalique);
    }

    for (const f of attendues) {
      const nom = decodeURIComponent(f.split(":")[0]).replace(/\+/g, " ");
      if (!italiquesPar.get(nom)) {
        failures.push(
          `${nom} : aucune face italique servie. Il manque l'axe "ital" dans l'URL. `
          + "Le navigateur penchera les lettres droites, et leur encre debordera "
          + "au point d'etre coupee."
        );
      }
    }
  }

  if (verifiees === 0) {
    console.log("      Google Fonts injoignable : verification non faite (pas un echec)");
    return failures;
  }
  if (!failures.length) {
    console.log(`      ${verifiees} URL de polices verifiees chez Google : toutes servent l'italique`);
  }
  return failures;
}
