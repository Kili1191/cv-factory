// Lanceur des tests de bout en bout.
//
//   npm test
//
// Chaque test renvoie une liste d'echecs. Un seul suffit a faire echouer la
// commande, donc la CI bloque la fusion. Ils couvrent ce qui est parti casse
// en production, pas ce qui est facile a tester.

const SUITES = [
  ["aucune dependance CDN a l'execution", "./no-runtime-cdn.mjs"],
  ["la requete envoyee a l'IA est bien formee", "./the-ai-request-is-well-formed.mjs"],
  ["les comptes ne perdent jamais le CV", "./accounts-never-lose-the-cv.mjs"],
  ["les sources d'offres rendent la meme forme", "./job-sources-normalise.mjs"],
  ["une offre trouvee devient une candidature", "./job-search-becomes-an-application.mjs"],
  ["l'extension lit une annonce", "./extension-reads-a-job-ad.mjs"],
  ["l'assistant d'entretien repond", "./live-assist-answers.mjs"],
  ["Gmail rend au suivi son vrai etat", "./gmail-reads-the-replies.mjs"],
  ["l'app s'installe sur l'ecran d'accueil", "./installs-on-the-home-screen.mjs"],
  ["l'accueil ne cache aucun texte", "./the-home-screen-hides-no-text.mjs"],
  ["rien ne recouvre une commande sur telephone", "./nothing-covers-a-control-on-mobile.mjs"],
  ["le PDF exporte est lisible par un ATS", "./export-pdf-is-machine-readable.mjs"],
  ["les moteurs d'extraction des ATS lisent le CV", "./ats-parsers-read-the-cv.mjs"],
  ["la couche invisible correspond a la page", "./the-invisible-layer-matches-the-page.mjs"],
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
