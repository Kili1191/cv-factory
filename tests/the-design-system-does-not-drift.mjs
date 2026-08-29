// Le systeme de design a une seule source, et rien n'anime "tout".
//
// POURQUOI CE TEST EXISTE
//
// Le systeme etait ecrit TROIS fois : tokens.js, sharedTokens.js, et une
// copie complete a l'interieur d'AppRoot.jsx. Le premier portait en tete un
// commentaire demandant de garder les fichiers "strictement alignes". La
// discipline a perdu, comme elle perd toujours :
//
//   ShadowMd  valait 0 4px 12px rgba(10,10,10,.08) d'un cote,
//                    0 4px 14px rgba(10,10,10,.06) de l'autre.
//   ShadowLg  n'existait que d'un cote, si bien que les 26 fichiers de
//             l'autre s'en fabriquaient une a la main.
//
// La meme ombre "moyenne" se dessinait donc differemment selon le fichier
// qu'un composant avait importe, sans que rien ne le signale. Un commentaire
// ne garde rien ; un test si.
//
// La copie d'AppRoot avait une consequence de plus : elle ecrivait les
// couleurs en hexadecimal quand les autres passent par les variables CSS. Le
// produit a un theme sombre entier construit sur ces variables, et le coeur
// de l'application ne l'aurait jamais suivi.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const JETONS = "app/components/tokens.js";
const REEXPORT = "app/components/sharedTokens.js";

// Les noms qui appartiennent au systeme. Les voir redefinis ailleurs, c'est
// une quatrieme copie qui commence.
const NOMS_DU_SYSTEME = [
  "Ink", "Cream", "CreamSoft", "Paper", "Gold", "GoldDeep",
  "Purple", "PurpleSoft", "Magenta", "Coral", "CoralSoft", "Green", "GreenSoft",
  "Gray50", "Gray100", "Gray200", "Gray400", "Gray600", "Gray900",
  "RadiusSm", "RadiusMd", "RadiusLg", "RadiusPill",
  "ShadowSm", "ShadowMd", "ShadowLg",
  "GradPurple", "GradCoral", "GradGold", "GradDark",
];

function fichiers(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) fichiers(p, out);
    else if (/\.(jsx?|css)$/.test(e.name)) out.push(p);
  }
  return out;
}

export async function run() {
  const failures = [];
  const tous = fichiers("app");

  // --- 1. Une seule source ------------------------------------------
  const reexport = readFileSync(REEXPORT, "utf8");
  if (!/export \* from "\.\/tokens\.js"/.test(reexport)) {
    failures.push(
      `${REEXPORT} ne se contente plus de re-exporter tokens.js. Une deuxieme `
      + "copie des jetons recommence, et les deux finiront par diverger : "
      + "c'est exactement ce qui est arrive a ShadowMd."
    );
  }

  // --- 2. Personne ne redefinit les jetons --------------------------
  for (const f of tous) {
    if (f === JETONS || f === REEXPORT) continue;
    if (!/\.jsx?$/.test(f)) continue;
    const src = readFileSync(f, "utf8");
    const redefinis = NOMS_DU_SYSTEME.filter((n) =>
      new RegExp("^\\s*(?:const|let|export const) " + n + "\\s*=\\s*[\"'`]", "m").test(src)
    );
    if (redefinis.length >= 5) {
      failures.push(
        `${f} redefinit ${redefinis.length} jetons du systeme `
        + `(${redefinis.slice(0, 5).join(", ")}...). C'est une copie de plus, `
        + "et la precedente avait deja derive de sa source."
      );
    }
  }

  // --- 3. Rien n'anime "tout" ---------------------------------------
  //
  // "all" anime toute propriete qui change, y compris celles que personne
  // n'a voulu animer : une largeur recalculee, une couleur heritee. C'est la
  // premiere cause de saccade, et c'est invisible a la relecture parce que la
  // ligne a l'air anodine.
  const coupables = [];
  for (const f of tous) {
    const src = readFileSync(f, "utf8");
    const n = (src.match(/transition:\s*["']?all\s/g) || []).length;
    if (n) coupables.push(f + " (" + n + ")");
  }
  if (coupables.length) {
    failures.push(
      "des transitions animent encore \"all\" : " + coupables.join(", ")
      + ". Nommer les proprietes qui bougent, avec Trans([...]) : "
      + "\"all\" anime aussi ce que personne n'a demande."
    );
  }

  // --- 4. L'entree ne laisse pas de transformation derriere elle ----
  //
  // Une transformation, meme nulle, cree un bloc conteneur : un enfant en
  // position fixed s'y accroche au lieu de s'accrocher a la fenetre. En
  // fill-mode "both", cet etat final reste applique pour toujours.
  //
  // Ce controle a une histoire : la premiere correction terminait l'animation
  // sur "transform: none", ce qui paraissait suffisant et ne l'etait pas.
  // Interpoler vers ce mot-cle rend une matrice identite, qui cree un bloc
  // conteneur comme les autres. Seul "backwards" rend l'element a ses styles.
  const css = readFileSync("app/globals.css", "utf8");
  for (const classe of ["nuvi-entree", "nuvi-sheet-corps > \\*"]) {
    const m = css.match(new RegExp("\\." + classe + "\\s*\\{[^}]*animation:[^;]*;", "m"));
    if (!m) {
      failures.push(`la regle .${classe.replace("\\", "")} n'a plus d'animation d'entree.`);
      continue;
    }
    if (/\bboth\b/.test(m[0])) {
      failures.push(
        `.${classe.replace("\\", "")} utilise le fill-mode "both". Son etat `
        + "final reste applique pour toujours, transformation comprise, et tout "
        + "enfant en position fixed s'ancre alors au panneau au lieu de la "
        + "fenetre. Utiliser \"backwards\"."
      );
    }
  }

  if (!failures.length) {
    console.log(
      "      une seule source de jetons, aucune redefinition ailleurs, "
      + "aucune transition sur \"all\", et l'entree ne laisse pas de "
      + "transformation derriere elle"
    );
  }
  return failures;
}
