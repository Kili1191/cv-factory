// Le verdict des logiciels de tri se compte, et ne bouge pas.
//
// CE QUE CE TEST GARDE
//
// Le score de l'audit venait du modele : le prompt lui demandait de rendre un
// nombre, et rien ne comptait quoi que ce soit. Le meme CV, soumis deux fois,
// ne rendait pas la meme note. Un nombre qui bouge sans que rien n'ait change
// n'est pas une mesure, c'est un tirage, et c'est pourtant le nombre que la
// personne retient.
//
// La simulation des analyseurs remplace ce tirage. Elle doit donc tenir la
// promesse qui la justifie :
//
//   1. Deux passages sur le meme texte rendent exactement le meme rapport.
//   2. Chaque verdict arrive avec le fait qui le justifie, sinon il ne se
//      corrige pas : "3 postes sur 5 sans date lisible" se verifie d'un coup
//      d'oeil, "ameliore tes dates" ne se verifie pas.
//   3. Un defaut reel est bien attrape, et un CV propre passe. Un controle qui
//      dit toujours oui ne garde rien.
//
// CE QUE CE TEST NE PRETEND PAS
//
// Il ne verifie pas "la note Workday" : elle n'existe pas. Workday et ses
// concurrents ne notent pas un CV seul et n'affichent aucun chiffre au
// candidat ; ils extraient des champs et classent contre une offre precise.
// Ce qui est verifie ici, c'est ce qu'un analyseur retrouve et ce qu'il perd.

import { lireCommeLesAts, periodeLisible, PROFILS } from "../lib/atsVendors.js";

const CV_PROPRE = {
  name: "Jane Doe",
  experience: [
    { title: "Product Manager", company: "Acme", period: "2021 - 2024" },
    { title: "Analyst", company: "Northwind", period: "2019 - 2021" },
  ],
};

const TEXTE_PROPRE = [
  "Jane Doe",
  "Product Manager",
  "jane.doe@email.com +33 6 12 34 56 78 Paris",
  "EXPERIENCE",
  "Product Manager, Acme, 2021 - 2024",
  "Analyst, Northwind, 2019 - 2021",
  "EDUCATION",
  "MSc, ESSEC, 2019",
  "SKILLS",
  "SQL, Python",
].join("\n");

// Le meme CV, expose aux deux defauts qui SEPARENT les profils : une rubrique
// inventee et une periode illisible. Le nom et l'e-mail restent lisibles, et
// c'est voulu : ils sont exiges par TOUS les profils, donc les casser ferait
// echouer les six et ne prouverait plus rien sur leurs differences.
//
// Une premiere version de ce test mettait aussi le bloc contact avant le nom.
// Greenhouse echouait alors lui aussi, et c'etait juste : un analyseur, meme
// tolerant, lit les premieres lignes comme l'identite. Le test avait tort,
// pas le code.
const CV_CASSE = {
  name: "Jane Doe",
  experience: [
    { title: "Product Manager", company: "Acme", period: "depuis toujours" },
    { title: "Analyst", company: "Northwind", period: "2019 - 2021" },
  ],
};
const TEXTE_CASSE = [
  "Jane Doe",
  "Product Manager",
  "jane.doe@email.com +33 6 12 34 56 78 Paris",
  "WHERE I HAVE BEEN",
  "Product Manager, Acme, depuis toujours",
  "Analyst, Northwind, 2019 - 2021",
  "SKILLS",
  "SQL, Python",
].join("\n");

export async function run() {
  const failures = [];

  // 1. Deterministe : deux passages, le meme rapport, au caractere pres.
  const a = lireCommeLesAts(CV_PROPRE, TEXTE_PROPRE);
  const b = lireCommeLesAts(CV_PROPRE, TEXTE_PROPRE);
  if (JSON.stringify(a.profils) !== JSON.stringify(b.profils)) {
    failures.push(
      "deux lectures du meme texte rendent des rapports differents. "
      + "C'est exactement le defaut que cette simulation devait remplacer."
    );
  }

  // 2. Un CV propre passe partout. Sinon les controles sont faux et le
  //    rapport n'apprend rien a personne.
  for (const p of a.profils) {
    if (!p.passe) {
      failures.push(
        `un CV propre est refuse par ${p.nom} : `
        + p.bloquants.map((x) => x.quoi + " (" + x.fait + ")").join(", ")
        + ". Un controle qui refuse un document correct rend le rapport inutile."
      );
    }
  }

  // 3. Les defauts reels sont attrapes par les profils stricts.
  const c = lireCommeLesAts(CV_CASSE, TEXTE_CASSE);
  const strict = c.profils.find((p) => p.id === "taleo");
  if (strict && strict.passe) {
    failures.push(
      "un CV avec une rubrique inventee et une periode illisible passe quand "
      + "meme chez Taleo, qui exige les deux. Les controles ne gardent rien."
    );
  }
  // Les profils tolerants doivent, eux, continuer a passer : sans cette
  // difference, nommer six analyseurs ne servirait a rien.
  const tolerant = c.profils.find((p) => p.id === "greenhouse");
  if (tolerant && !tolerant.passe) {
    failures.push(
      "le meme CV est refuse par Greenhouse, qui indexe le texte entier. "
      + "Si tous les profils rendent le meme verdict, les distinguer est un "
      + "mensonge d'interface."
    );
  }

  // 4. Chaque blocage porte son fait.
  for (const p of c.profils) {
    for (const b2 of p.bloquants) {
      if (!b2.fait || !String(b2.fait).trim()) {
        failures.push(
          `${p.nom} bloque sur "${b2.quoi}" sans dire ce qui a ete mesure. `
          + "Un verdict sans mesure ne se corrige pas."
        );
      }
    }
  }

  // 5. La lecture des periodes, qui decide a elle seule de plusieurs profils.
  const casDates = [
    ["2021 - 2024", true], ["Feb 2025 - Jun 2026", true],
    ["2019 - present", true], ["2019 - en cours", true],
    ["depuis toujours", false], ["", false], ["recemment", false],
  ];
  for (const [texte, attendu] of casDates) {
    if (periodeLisible(texte) !== attendu) {
      failures.push(
        `periodeLisible("${texte}") rend ${periodeLisible(texte)}, `
        + `${attendu} attendu. Les dates decident du verdict de quatre profils.`
      );
    }
  }

  // 6. Les profils restent distincts : deux profils identiques en exigences
  //    n'apprennent rien de plus que l'un des deux.
  const signatures = PROFILS.map((p) => p.exige.slice().sort().join("+"));
  if (new Set(signatures).size < 3) {
    failures.push(
      "les profils ne se distinguent presque plus les uns des autres. "
      + "Les nommer separement ferait croire a six verifications quand il n'y "
      + "en a qu'une."
    );
  }

  if (!failures.length) {
    console.log(
      `      les ${PROFILS.length} analyseurs rendent deux fois le meme rapport, `
      + "laissent passer un CV propre, attrapent un CV casse et justifient "
      + "chaque blocage par une mesure"
    );
  }
  return failures;
}
