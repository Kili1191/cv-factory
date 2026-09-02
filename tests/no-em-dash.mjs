// Ni cadratin, ni demi-cadratin.
//
// POURQUOI C'EST UNE REGLE ET PAS UNE PREFERENCE
//
// Ces deux tirets longs sont devenus la signature visuelle
// du texte ecrit par une machine. Sur un produit qui promet a quelqu'un un CV
// credible, cette signature travaille contre lui : elle se lit avant le
// contenu.
//
// La regle vaut pour TOUT le depot, pas seulement l'interface. Le separateur
// entre l'entreprise et la ville vivait dans CVLayouts et s'imprimait sur le
// CV lui-meme, donc dans le PDF que lit le recruteur : une regle qui ne
// couvrirait que les boutons aurait laisse passer le pire endroit.
//
// CE TEST N'OUVRE PAS DE NAVIGATEUR
//
// C'est une lecture de fichiers. Il coute quelques millisecondes et rougit
// avant qu'un caractere colle depuis ailleurs n'atteigne la production.
// Remplacements : le point median pour separer, le deux-points pour
// introduire, la virgule pour incidenter, le tiret simple dans les
// commentaires.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// LE TEST N'ECRIT JAMAIS LES CARACTERES QU'IL CHERCHE
//
// Ecrits en clair, ils se trouveraient eux-memes et le test rougirait sur son
// propre code. On les construit donc depuis leur point de code. S'excluir par
// une exception aurait marche aussi, mais une exception dans un garde-fou est
// exactement l'endroit ou un vrai oubli finit par se cacher.
const CADRATIN = String.fromCharCode(0x2014);
const DEMI = String.fromCharCode(0x2013);
// POURQUOI .claude EST EXCLU
//
// Ce dossier ne contient aucun texte produit : ce sont des fichiers
// d'instructions destines aux agents, recopies tels quels depuis leurs depots
// d'origine. Rien de ce qui s'y trouve n'atteint un ecran ni un PDF. Les
// reecrire ferait rougir la prochaine mise a jour amont sans rien proteger.
// La regle garde donc sa portee la ou elle compte : tout ce qui peut finir
// imprime sur un CV.
const IGNORE = new Set([".git", "node_modules", ".next", "out", "dist", ".claude"]);
const EXT = [".jsx", ".js", ".mjs", ".css", ".md", ".json", ".html"];

function fichiers(dir, out = []) {
  for (const nom of readdirSync(dir)) {
    if (IGNORE.has(nom)) continue;
    const p = join(dir, nom);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) fichiers(p, out);
    else if (EXT.some(e => nom.endsWith(e))) out.push(p);
  }
  return out;
}

export async function run() {
  const failures = [];
  let lus = 0;
  const trouves = [];

  for (const p of fichiers(".")) {
    let src;
    try { src = readFileSync(p, "utf8"); } catch { continue; }
    lus++;
    if (!src.includes(CADRATIN) && !src.includes(DEMI)) continue;
    src.split("\n").forEach((ligne, i) => {
      if (!ligne.includes(CADRATIN) && !ligne.includes(DEMI)) return;
      const quoi = ligne.includes(CADRATIN) ? "cadratin" : "demi-cadratin";
      trouves.push(`${p}:${i + 1} ${quoi} dans : ${ligne.trim().slice(0, 60)}`);
    });
  }

  if (lus === 0) {
    return ["aucun fichier lu : ce test ne verifie plus rien"];
  }
  for (const t of trouves.slice(0, 12)) {
    failures.push(t);
  }
  if (trouves.length > 12) {
    failures.push(`... et ${trouves.length - 12} autre(s)`);
  }
  if (!failures.length) {
    console.log(`      ${lus} fichiers lus, aucun cadratin ni demi-cadratin`);
  }
  return failures;
}

// EXECUTE DIRECTEMENT, CE FICHIER DOIT VERIFIER QUELQUE CHOSE
//
// Il n'exportait que run(). "node tests/no-em-dash.mjs" ne l'appelait donc
// jamais : la commande rendait 0 sans lire un seul fichier, et ce silence se
// lisait comme un succes. Utilisee comme garde-fou pendant toute une session,
// elle n'a rien garde du tout, et la regle numero un du depot s'est fait
// enfreindre dans le fichier meme qui l'enonce.
//
// Un test qui se tait quand on le lance est pire qu'un test absent : l'absence
// se remarque. Lance directement, il s'execute et sort en erreur s'il trouve
// quelque chose.
if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((f) => {
    for (const l of f) console.log("ECHEC " + l);
    process.exit(f.length ? 1 : 0);
  });
}
