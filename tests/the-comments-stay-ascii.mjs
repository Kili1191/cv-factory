// Les commentaires du code restent en ASCII.
//
// POURQUOI LA REGLE EXISTE
//
// CLAUDE.md la pose : docs/ et le fichier lui-meme sont accentues, les
// commentaires dans .js, .jsx et .mjs ne le sont pas. C'etait vrai du francais
// sans accents, ca reste vrai de l'anglais.
//
// POURQUOI CE TEST EXISTE
//
// La regle etait ecrite et rien ne la tenait. Je l'ai enfreinte le jour meme
// ou je documentais les autres regles, en ecrivant un accent dans un
// commentaire de schemas.js, et je ne l'ai vu qu'en cherchant autre chose.
//
// C'est le meme defaut que no-em-dash avant qu'il ne s'execute vraiment : une
// regle sans test est une intention, et une intention se perd. Celle-ci a
// l'avantage d'etre verifiable en une ligne.
//
// CE QU'IL NE FAIT PAS
//
// Il ne touche pas aux CHAINES. Les textes que lit l'utilisateur sont
// bilingues et accentues, c'est un choix produit pose dans app/i18n. Seuls les
// commentaires sont concernes, parce qu'eux ne s'affichent nulle part et que
// leur encodage a deja casse des outils.

import { readdirSync, statSync, readFileSync } from "fs";
import { join } from "path";

const IGNORE = new Set([".git", "node_modules", ".next", "out", "dist", ".claude"]);
const EXT = [".js", ".jsx", ".mjs"];

function fichiers(dir, out = []) {
  for (const nom of readdirSync(dir)) {
    if (IGNORE.has(nom)) continue;
    const p = join(dir, nom);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) fichiers(p, out);
    else if (EXT.some((e) => nom.endsWith(e))) out.push(p);
  }
  return out;
}

// Une ligne de commentaire, et rien d'autre. On ne cherche pas a analyser le
// langage : une ligne dont le premier caractere non blanc ouvre un commentaire
// EST un commentaire, et c'est le seul cas que la regle vise. Une ligne de
// code portant un commentaire en fin de ligne pourrait contenir une chaine
// accentuee avant lui, donc on la laisse tranquille plutot que de risquer une
// fausse alerte : un test qui crie pour rien finit ignore.
const COMMENTAIRE = /^\s*(\/\/|\*|\/\*)/;

export async function run() {
  const failures = [];
  let lus = 0;
  const trouves = [];

  for (const p of fichiers(".")) {
    let src;
    try { src = readFileSync(p, "utf8"); } catch { continue; }
    lus++;
    src.split("\n").forEach((ligne, i) => {
      if (!COMMENTAIRE.test(ligne)) return;
      // eslint-disable-next-line no-control-regex
      const hors = ligne.match(/[^\x00-\x7F]/g);
      if (!hors) return;
      trouves.push(
        `${p}:${i + 1} caractere non ASCII (${[...new Set(hors)].join(" ")}) `
        + `dans : ${ligne.trim().slice(0, 56)}`);
    });
  }

  if (!lus) {
    failures.push("aucun fichier lu : ce test ne verifie rien.");
  }
  for (const t of trouves) failures.push(t);
  if (!failures.length) {
    console.log(`      ${lus} fichiers lus, commentaires en ASCII pur`);
  }
  return failures;
}

// Lance directement, il s'execute : la lecon de no-em-dash, qui rendait 0 sans
// rien lire et dont le silence passait pour un succes.
if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((f) => {
    for (const l of f) console.log("ECHEC " + l);
    process.exit(f.length ? 1 : 0);
  });
}
