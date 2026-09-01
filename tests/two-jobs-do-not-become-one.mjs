// Two jobs must not collapse into one, whatever bullet glyph the CV uses.
//
// WHAT HAPPENED
//
// A real CV was dropped on /verifier. It carried two roles, Real Estate
// Sales Consultant and Client Advisor at Yves Saint Laurent. The page
// answered "1 employeur retrouve" and "1 poste sur 1".
//
// The cause was one missing character. estPuce accepted U+2022, the small
// bullet, but not U+25CF, the big black circle, which is what Word and
// Google Docs place in front of a list as soon as the level changes. That CV
// was full of them.
//
// The cost was not cosmetic. blocs() closes a block when a non-bullet line
// follows a bullet: that is precisely what separates two jobs. With no line
// recognised as a bullet, no block ever closed, and both roles merged into
// one entry carrying the first job's title, the first job's CITY as the
// employer, the second job's dates, and no bullets at all.
//
// WHY IT MATTERS MORE HERE THAN ELSEWHERE
//
// This is a verification tool. Somebody uses it precisely because they do
// not trust what they are told, and it answered with a number that was
// wrong. A checking tool that miscounts is worse than no tool: it sends
// people to fix a CV that was fine, or reassures them about one that is not.
//
// The same parser feeds CV import, so the merge was silently damaging every
// imported CV that used those glyphs.

import { lireUnCv } from "../lib/lireUnCv.js";
import { verifierUnPdf } from "../lib/verifierUnPdf.js";

// Les puces que posent vraiment les traitements de texte, une par cas.
const GLYPHES = [
  ["•", "petite puce, Word par defaut"],
  ["●", "gros rond noir, Word niveau 2 et Google Docs"],
  ["▪", "carre plein"],
  ["◦", "rond creux"],
  ["⁃", "tiret de liste"],
  ["➤", "fleche, modeles Canva"],
  ["✓", "coche"],
  ["-", "tiret simple"],
];

const cv = (puce) => [
  "Kilian Maisonnette",
  "Client Advisor",
  "k@exemple.com",
  "+971 502237756",
  "Professional Experience",
  "Real Estate Sales Consultant – Dubai, UAE 2025",
  puce + " Leveraged luxury clienteling expertise to advise clients.",
  "Client Advisor – Yves Saint Laurent, Harrods, London, UK 2017–2024",
  puce + " Consistently exceeded boutique performance goals.",
  puce + " Cultivated a portfolio of 300+ loyal clients.",
  "Education",
  "Baccalaureat 2015",
  "Languages",
  "French, English",
].join("\n");

export async function run() {
  const failures = [];

  for (const [puce, quoi] of GLYPHES) {
    const r = lireUnCv(cv(puce));
    const postes = (r.cv && r.cv.experience) || [];

    if (postes.length !== 2) {
      failures.push(
        `avec la puce ${quoi} (${JSON.stringify(puce)}), ${postes.length} poste(s) `
        + "au lieu de 2. Quand une puce n'est pas reconnue, aucun bloc ne se "
        + "ferme et deux postes fusionnent : la personne voit un employeur la "
        + "ou son CV en porte deux."
      );
      continue;
    }

    // L'employeur du second poste est ecrit noir sur blanc dans le CV.
    if (!/Yves Saint Laurent/.test(postes[1].company || "")) {
      failures.push(
        `avec la puce ${quoi}, l'employeur du second poste est `
        + `"${postes[1].company}" au lieu d'Yves Saint Laurent.`
      );
    }
    // Les puces doivent atterrir sur le poste, pas dans les en-tetes.
    const totalPuces = postes.reduce((n, p) => n + (p.bullets || []).length, 0);
    if (totalPuces !== 3) {
      failures.push(
        `avec la puce ${quoi}, ${totalPuces} puce(s) retenue(s) au lieu de 3. `
        + "Une puce prise pour une ligne d'en-tete disparait du CV importe."
      );
    }
  }

  // Le compte annonce a la personne suit la meme verite.
  const v = verifierUnPdf(cv("●"));
  if (!/2 employeur/.test(v.champs.employeurs.fait)) {
    failures.push(
      "la page de verification annonce \"" + v.champs.employeurs.fait
      + "\" sur un CV qui porte deux employeurs. Un outil de controle qui se "
      + "trompe de compte est pire que pas d'outil."
    );
  }

  // UNE ANNEE SEULE SE GARDE, ET NE COMPTE PAS POUR AUTANT
  //
  // "Role - Ville 2025" porte une date. L'import doit la retenir, sinon la
  // personne la retape. Mais un analyseur a besoin de deux reperes pour
  // ranger un poste par anciennete, donc ce poste doit rester compte comme
  // mal date. Les deux affirmations doivent tenir ensemble.
  const r = lireUnCv(cv("●"));
  if ((r.cv.experience[0].period || "") !== "2025") {
    failures.push(
      "l'annee seule \"2025\" est perdue a l'import : elle vaut "
      + `"${r.cv.experience[0].period}". La personne devra la retaper.`
    );
  }
  if (!/1 poste\(s\) sur 2/.test(v.champs.dates.fait)) {
    failures.push(
      "le controle des dates annonce \"" + v.champs.dates.fait + "\". Une annee "
      + "seule ne suffit pas a un analyseur : la retenir a l'import ne doit pas "
      + "la faire passer pour une periode complete."
    );
  }

  if (!failures.length) {
    console.log(
      "      huit glyphes de puce testes, deux postes restent deux postes avec "
      + "leur employeur et leurs puces, et une annee seule se garde sans compter "
      + "pour une periode"
    );
  }
  return failures;
}
