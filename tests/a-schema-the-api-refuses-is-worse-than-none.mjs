// Every declared schema obeys the rules the API enforces.
//
// WHY THIS IS WORSE THAN A MISSING SCHEMA
//
// Structured outputs accept a subset of JSON Schema, and the restrictions do
// not announce themselves: no minLength or maxLength, no minimum or maximum,
// minItems only at 0 or 1, additionalProperties only at false, and every
// declared property listed in required. A schema that breaks one of them does
// not degrade. The API answers 400 and the entire call dies, so the feature
// does nothing at all, where an absent schema would merely have left the
// shape unguaranteed.
//
// The route checks only the outer shape on purpose: the schema comes from our
// own code, not from a user. That trust is exactly what needs a test behind
// it. Nineteen schemas now describe what the product asks the model for, they
// are written by hand, and several derive from one another with spreads and
// filters. A typo in a required list is invisible in review and fatal in
// production.
//
// WHY IT READS THE SOURCE
//
// The shared shapes live in app/components/schemas.js and import cleanly. The
// rest are module-scope consts inside AppRoot.jsx, a React component file
// that cannot be imported outside a browser. So the declarations are lifted
// out of the source by balanced braces and evaluated on their own. Copying
// them into the test instead would give us a second description that drifts,
// which is the very thing schemas.js exists to prevent.

import { readFileSync } from "node:fs";

// Les mots-cles que l'API refuse, et qui font echouer l'appel entier.
const INTERDITS = ["minLength", "maxLength", "minimum", "maximum", "pattern",
                   "minProperties", "maxProperties", "format"];

// Les declarations a extraire : les schemas eux-memes et les fragments qu'ils
// partagent. On les prend dans l'ordre du fichier pour que les references
// tiennent au moment de l'evaluation.
const NOMS = /^const (chaine|listeDeChaines|REGISTRES|CLES_REGISTRES|SCHEMA_[A-Z_]+) = /;

// Une declaration va de sa premiere ligne jusqu'a ce que les accolades se
// referment. Compter les accolades suffit ici : ces declarations sont des
// litteraux de donnees, sans chaine ni commentaire qui en contienne une.
function extraitDeclarations(src) {
  const lignes = src.split("\n");
  const out = [];
  for (let i = 0; i < lignes.length; i++) {
    if (!NOMS.test(lignes[i])) continue;
    let profondeur = 0;
    let j = i;
    do {
      for (const c of lignes[j]) {
        if (c === "{" || c === "[") profondeur++;
        if (c === "}" || c === "]") profondeur--;
      }
      j++;
    } while (j < lignes.length && profondeur > 0);
    out.push(lignes.slice(i, j).join("\n"));
    i = j - 1;
  }
  return out;
}

function verifie(noeud, chemin, ecarts) {
  if (!noeud || typeof noeud !== "object") return;
  for (const mot of INTERDITS) {
    if (mot in noeud) ecarts.push(chemin + " : " + mot + ", refuse par l'API");
  }
  if ("minItems" in noeud && noeud.minItems !== 0 && noeud.minItems !== 1) {
    ecarts.push(chemin + " : minItems=" + noeud.minItems + ", seuls 0 et 1 passent");
  }
  if (noeud.type === "object") {
    if (noeud.additionalProperties !== false) {
      ecarts.push(chemin + " : additionalProperties doit valoir false");
    }
    const props = Object.keys(noeud.properties || {});
    const requis = noeud.required || [];
    if (!props.length) ecarts.push(chemin + " : objet sans propriete");
    for (const p of props) {
      if (!requis.includes(p)) ecarts.push(chemin + " : " + p + " absent de required");
      verifie(noeud.properties[p], chemin + "." + p, ecarts);
    }
    for (const r of requis) {
      if (!props.includes(r)) ecarts.push(chemin + " : required cite " + r + ", inexistant");
    }
  }
  if (noeud.type === "array") verifie(noeud.items, chemin + "[]", ecarts);
}

export async function run() {
  const failures = [];

  // Le module partage est importe par une URL absolue. Les declarations
  // extraites d'AppRoot sont evaluees depuis une data: URL, qui n'a aucune
  // base pour resoudre un chemin relatif.
  const urlPartages = new URL("../app/components/schemas.js", import.meta.url).href;
  const partages = await import(urlPartages);
  const decls = extraitDeclarations(readFileSync("app/AppRoot.jsx", "utf8"));
  if (decls.length < 10) {
    return ["seules " + decls.length + " declarations extraites d'AppRoot : "
            + "l'extraction ne trouve plus les schemas, le test ne verifie rien."];
  }

  const importes = Object.keys(partages).filter((k) => k.startsWith("SCHEMA_"));
  const source =
    "import { " + importes.join(", ") + ' } from "' + urlPartages + '";\n'
    + decls.join("\n\n") + "\n"
    + "export const TOUS = { " + importes.join(", ") + ", "
    + decls.map((d) => d.match(NOMS)[1]).filter((n) => n.startsWith("SCHEMA_")).join(", ")
    + " };\n";

  let locaux;
  try {
    locaux = await import(
      "data:text/javascript;base64," + Buffer.from(source, "utf8").toString("base64"));
  } catch (err) {
    // Le message porte la source entiere en base64 : on n'en garde que le
    // debut, sinon l'echec remplit l'ecran et devient illisible.
    const m = err && err.message ? err.message : String(err);
    return ["les declarations extraites d'AppRoot ne s'evaluent pas : " + m.slice(0, 180)];
  }

  const ecarts = [];
  const tous = locaux.TOUS;
  for (const [nom, s] of Object.entries(tous)) {
    if (s && s.type === "object") verifie(s, nom, ecarts);
    else ecarts.push(nom + " : la racine d'un schema doit etre un objet");
  }
  for (const e of ecarts) failures.push(e);

  if (!failures.length) {
    console.log("      " + Object.keys(tous).length
                + " schemas conformes a ce que l'API accepte");
  }
  return failures;
}

// Lance directement, il s'execute. La lecon de no-em-dash, qui rendait 0 sans
// rien lire et dont le silence passait pour un succes.
if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((f) => {
    for (const l of f) console.log("ECHEC " + l);
    process.exit(f.length ? 1 : 0);
  });
}
