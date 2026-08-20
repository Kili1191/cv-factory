// Lanceur des tests de bout en bout.
//
//   npm test
//
// Chaque test renvoie une liste d'echecs. Un seul suffit a faire echouer la
// commande, donc la CI bloque la fusion. Ils couvrent ce qui est parti casse
// en production, pas ce qui est facile a tester.

const SUITES = [
  ["aucune dependance CDN a l'execution", "./no-runtime-cdn.mjs"],
  ["le PDF exporte est lisible par un ATS", "./export-pdf-is-machine-readable.mjs"],
  ["l'import lit un PDF, worker coupe compris", "./import-reads-a-pdf.mjs"],
  ["le pack candidature produit une lettre", "./application-pack-produces-a-letter.mjs"],
  ["chaque fonctionnalite produit un resultat", "./every-feature-produces-output.mjs"],
  ["le telephone atteint toutes les fonctionnalites", "./mobile-reaches-every-feature.mjs"],
];

const only = process.argv[2];
let failed = 0;

for (const [name, path] of SUITES) {
  if (only && !path.includes(only) && !name.includes(only)) continue;
  process.stdout.write(`\n  ${name}\n`);
  let failures;
  try {
    const mod = await import(path);
    failures = await mod.run();
  } catch (err) {
    failures = [`le test lui-meme a plante : ${err && err.message}`];
  }
  if (failures.length === 0) {
    console.log("      OK");
  } else {
    failed += failures.length;
    for (const f of failures) console.log(`    ECHEC ${f}`);
  }
}

console.log("");
if (failed) {
  console.log(`${failed} probleme(s). Ne pas livrer en l'etat.`);
  process.exit(1);
}
console.log("Tout est vert.");
