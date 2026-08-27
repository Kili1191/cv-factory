// Lanceur des tests de bout en bout.
//
//   npm test
//
// Chaque test renvoie une liste d'echecs. Un seul suffit a faire echouer la
// commande, donc la CI bloque la fusion. Ils couvrent ce qui est parti casse
// en production, pas ce qui est facile a tester.

const SUITES = [
  ["aucune dependance CDN a l'execution", "./no-runtime-cdn.mjs"],
  ["ni cadratin ni demi-cadratin", "./no-em-dash.mjs"],
  ["la requete envoyee a l'IA est bien formee", "./the-ai-request-is-well-formed.mjs"],
  ["les comptes ne perdent jamais le CV", "./accounts-never-lose-the-cv.mjs"],
  ["la page de mise en service nomme ce qui manque", "./the-setup-page-names-what-is-missing.mjs"],
  ["les sources d'offres rendent la meme forme", "./job-sources-normalise.mjs"],
  ["l'ecart avec l'annonce est honnete", "./the-gap-with-the-job-ad-is-honest.mjs"],
  ["le dossier de parcours n'invente rien", "./the-career-record-invents-nothing.mjs"],
  ["une offre trouvee devient une candidature", "./job-search-becomes-an-application.mjs"],
  ["l'extension lit une annonce", "./extension-reads-a-job-ad.mjs"],
  ["l'assistant d'entretien repond", "./live-assist-answers.mjs"],
  ["Gmail rend au suivi son vrai etat", "./gmail-reads-the-replies.mjs"],
  ["l'app s'installe sur l'ecran d'accueil", "./installs-on-the-home-screen.mjs"],
  ["l'accueil ne cache aucun texte", "./the-home-screen-hides-no-text.mjs"],
  ["la langue est demandee une fois", "./the-site-opens-in-english.mjs"],
  ["une connexion qui echoue le dit", "./a-failed-sign-in-says-so.mjs"],
  ["Nuvi ne decide pas a la place du candidat", "./nuvi-does-not-decide.mjs"],
  ["une IA saturee n'est pas une IA en panne", "./a-busy-ai-is-not-a-broken-one.mjs"],
  ["le parcours arrive vraiment a l'ecran", "./the-career-record-reaches-the-screen.mjs"],
  ["la vitrine fait son travail", "./the-front-door-does-its-job.mjs"],
  ["le lien partage dit la verite", "./the-shared-link-tells-the-truth.mjs"],
  ["crash test avant mise en ligne", "./ready-to-launch.mjs"],
  ["toutes les largeurs d'ecran tiennent", "./every-screen-size-works.mjs"],
  ["les mots en italique sont de vrais italiques", "./the-italics-are-real.mjs"],
  ["rien ne recouvre une commande sur telephone", "./nothing-covers-a-control-on-mobile.mjs"],
  ["rien ne recouvre le bas de la barre laterale", "./nothing-covers-the-rail-footer.mjs"],
  ["la barre de suggestion s'ecarte et sait partir", "./the-suggestion-bar-gets-out-of-the-way.mjs"],
  ["le PDF exporte est lisible par un ATS", "./export-pdf-is-machine-readable.mjs"],
  ["les moteurs d'extraction des ATS lisent le CV", "./ats-parsers-read-the-cv.mjs"],
  ["la couche invisible correspond a la page", "./the-invisible-layer-matches-the-page.mjs"],
  ["l'import lit un PDF, worker coupe compris", "./import-reads-a-pdf.mjs"],
  ["le pack candidature produit une lettre", "./application-pack-produces-a-letter.mjs"],
  ["le diagnostic ne coute rien et ne bouge pas", "./the-diagnosis-costs-nothing.mjs"],
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
