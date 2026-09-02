// The diagnosis names one cause, and says nothing when it cannot.
//
// WHY THIS ONE IS PURE
//
// Every other suite here drives a browser, because what matters is what a
// person sees. This one does not, and the reason is worth stating: the
// verdict is the only part of the feature that a browser cannot show is
// wrong. A screen that renders "you are aiming too high" looks exactly as
// convincing when the right answer was "you are in the wrong trade". The
// output is a sentence either way, and a sentence always looks like an
// answer.
//
// So the judgement was kept out of the model and out of React, in a function
// that takes readings and returns a cause. Here it meets fixed input and has
// to produce the same cause every time.
//
// WHAT IT HOLDS
//
//   1. Each cause is reachable, on evidence that plainly belongs to it.
//   2. The order between "aiming too high" and "wrong trade" holds, because
//      the two look alike in the numbers and lead to opposite advice.
//   3. It refuses to answer on too little, rather than guessing.
//   4. It is willing to say the CV is not the problem. A product that sells
//      rewriting has every incentive to find fault here, which is exactly
//      why this case is tested.
//   5. The same requirement written two ways counts once, not twice.

import { pourquoiPasDentretien, MINIMUM_ANNONCES } from "../lib/pourquoiPasDentretien.js";

// Une annonce lue, telle que le modele la rend. Les valeurs par defaut
// decrivent le cas sain : bien ciblee, au niveau, rien qui manque.
function annonce(sur = {}) {
  return { titre: "Care Assistant", entreprise: "Elmwood", score: 80,
           niveau: "niveau", manques: [], ...sur };
}

function verifier(failures, nom, attendu, obtenu) {
  if (obtenu !== attendu) {
    failures.push(nom + " : cause \"" + obtenu + "\" au lieu de \"" + attendu + "\"");
  }
}

export async function run() {
  const failures = [];

  // 1. TROP PEU POUR SE PRONONCER
  for (let n = 0; n < MINIMUM_ANNONCES; n++) {
    const r = pourquoiPasDentretien(Array.from({ length: n }, () => annonce({ score: 20 })));
    verifier(failures, n + " annonce(s), meme tres mauvaises", "pas_assez", r.cause);
  }

  // Et des qu'il y en a assez, il se prononce.
  const juste = pourquoiPasDentretien(
    Array.from({ length: MINIMUM_ANNONCES }, () => annonce({ score: 20 })));
  if (juste.cause === "pas_assez") {
    failures.push(MINIMUM_ANNONCES + " annonces suffisent, il refuse encore de repondre");
  }

  // 2. LE NIVEAU PASSE AVANT LE CIBLAGE
  // Meme matiere, meme score bas. Ce qui distingue les deux causes, c'est
  // que l'annonce demande au-dessus du dossier. Dire "mauvais secteur" a
  // quelqu'un qui vise seulement trop haut l'envoie tout reecrire pour rien.
  const tropHaut = pourquoiPasDentretien([
    annonce({ score: 30, niveau: "dessus" }),
    annonce({ score: 25, niveau: "dessus" }),
    annonce({ score: 35, niveau: "dessus" }),
    annonce({ score: 40, niveau: "niveau" }),
  ]);
  verifier(failures, "trois annonces sur quatre au-dessus du dossier", "niveau", tropHaut.cause);

  // Le libelle du niveau vient d'un modele : la variante anglaise doit
  // compter comme la francaise, sinon le cas "vise trop haut" se lit comme un
  // probleme de secteur des que le modele repond dans l'autre langue.
  const tropHautEn = pourquoiPasDentretien([
    annonce({ score: 30, niveau: "above" }),
    annonce({ score: 25, niveau: "above" }),
    annonce({ score: 35, niveau: "above" }),
  ]);
  verifier(failures, "le niveau rendu en anglais", "niveau", tropHautEn.cause);

  const horsCible = pourquoiPasDentretien([
    annonce({ score: 30 }), annonce({ score: 25 }), annonce({ score: 35 }),
  ]);
  verifier(failures, "scores bas sans probleme de niveau", "ciblage", horsCible.cause);

  // 3. LES MOTS, QUAND LE POSTE EST LE BON
  const mots = pourquoiPasDentretien([
    annonce({ score: 72, manques: ["medication administration", "safeguarding"] }),
    annonce({ score: 68, manques: ["medication administration"] }),
    annonce({ score: 75, manques: ["medication administration", "manual handling"] }),
  ]);
  verifier(failures, "bon score, une exigence manquante partout", "mots_cles", mots.cause);
  if (!mots.manquesRecurrents.length
      || !/medication/i.test(mots.manquesRecurrents[0].quoi)) {
    failures.push(
      "le manque recurrent n'est pas remonte en premier : "
      + JSON.stringify(mots.manquesRecurrents));
  }
  if (mots.manquesRecurrents[0] && mots.manquesRecurrents[0].sur !== 3) {
    failures.push("le manque recurrent est compte sur "
      + mots.manquesRecurrents[0].sur + " annonces au lieu de 3");
  }

  // Un manque qui n'apparait qu'une fois sur trois n'est pas un motif : il
  // decrit une annonce exigeante, pas un trou dans le CV.
  const isole = pourquoiPasDentretien([
    annonce({ score: 80, manques: ["forklift licence"] }),
    annonce({ score: 78 }),
    annonce({ score: 82 }),
  ]);
  verifier(failures, "un manque isole ne fait pas un motif", "ailleurs", isole.cause);

  // 4. LE CAS OU LE CV VA BIEN, ET OU IL FAUT LE DIRE
  const rienACorriger = pourquoiPasDentretien([
    annonce({ score: 85 }), annonce({ score: 78 }), annonce({ score: 90 }),
    annonce({ score: 81 }),
  ]);
  verifier(failures, "tout est bon, le CV n'est pas en cause", "ailleurs", rienACorriger.cause);

  // 5. LA MEME EXIGENCE ECRITE AUTREMENT COMPTE UNE FOIS
  // Sans reduction, "Safeguarding", "safeguarding." et "SAFEGUARDING"
  // feraient trois motifs distincts, chacun sous le seuil, et le vrai
  // probleme passerait inapercu.
  const memeMot = pourquoiPasDentretien([
    annonce({ score: 70, manques: ["Safeguarding"] }),
    annonce({ score: 72, manques: ["safeguarding."] }),
    annonce({ score: 68, manques: ["SAFEGUARDING"] }),
  ]);
  verifier(failures, "trois graphies d'une meme exigence", "mots_cles", memeMot.cause);
  if (memeMot.manquesRecurrents.length !== 1) {
    failures.push("trois graphies d'un meme mot donnent "
      + memeMot.manquesRecurrents.length + " motifs au lieu d'un seul");
  }

  // La meme exigence citee deux fois dans UNE annonce ne compte pas double.
  const doublon = pourquoiPasDentretien([
    annonce({ score: 70, manques: ["Safeguarding", "safeguarding"] }),
    annonce({ score: 72 }), annonce({ score: 68 }),
  ]);
  if (doublon.manquesRecurrents.length) {
    failures.push(
      "une exigence citee deux fois dans la meme annonce passe pour recurrente");
  }

  // 6. LA MEDIANE, PAS LA MOYENNE
  // Une annonce parfaitement alignee au milieu de trois qui ne le sont pas
  // remonterait une moyenne au-dessus du seuil et cacherait la situation.
  const medianeTient = pourquoiPasDentretien([
    annonce({ score: 20 }), annonce({ score: 25 }), annonce({ score: 30 }),
    annonce({ score: 100 }),
  ]);
  verifier(failures, "une annonce parfaite ne doit pas masquer trois mauvaises",
           "ciblage", medianeTient.cause);

  // 7. IL NE PLANTE PAS SUR CE QU'ON LUI DONNE DE TRAVERS
  // Cette fonction lit une sortie de modele. Un champ absent ne doit pas
  // faire tomber l'ecran de diagnostic.
  for (const [quoi, entree] of [
    ["rien", undefined], ["null", null], ["une chaine", "annonces"],
    ["un tableau de null", [null, null, null]],
    ["des annonces sans champs", [{}, {}, {}]],
    ["des scores illisibles", [annonce({ score: "beaucoup" }),
                               annonce({ score: null }), annonce({ score: NaN })]],
  ]) {
    try {
      const r = pourquoiPasDentretien(entree);
      if (!r || typeof r.cause !== "string") {
        failures.push("entree " + quoi + " : aucune cause rendue");
      }
    } catch (err) {
      failures.push("entree " + quoi + " : la fonction a plante, "
        + (err && err.message));
    }
  }

  if (!failures.length) {
    console.log("      chaque cause est atteignable, et il se tait sous "
      + MINIMUM_ANNONCES + " annonces");
  }
  return failures;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((f) => {
    for (const l of f) console.log("ECHEC " + l);
    process.exit(f.length ? 1 : 0);
  });
}
