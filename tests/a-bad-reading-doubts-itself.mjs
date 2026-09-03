// Une lecture qui s'est trompee le sait, et laisse la main au modele.
//
// LE DEFAUT
//
// Le CV de Kilian, en production, marquait dix sur dix a la lecture locale :
// un nom, un contact, six postes tous nommes, des puces, des competences.
// Il ne passait donc jamais par le modele, et l'ecran affichait :
//
//     Account Manager (cadratin)
//     Private Clients (cadratin) . UAE
//     CERTIFICATIONS
//     . 2023
//     Level 7 Diploma ... (expected 2026) (cadratin) 2026     [colonne 2026]
//     Banking and Finance Training - Banking products, ...    [nom d'ecole]
//
// Le decoupage s'est trompe a quatre endroits et le score n'avait aucun moyen
// de s'en apercevoir : il comptait ce qui avait ete TROUVE, jamais ce qui
// clochait. C'etait un score de completude deguise en score de qualite, et
// c'est pour cette raison exacte qu'un CV bien rempli et mal lu passait mieux
// qu'un CV pauvre et bien lu.
//
// POURQUOI CE N'EST PAS UN PROBLEME DE REGEX
//
// On pourrait rafistoler le decoupeur pour ce CV-la. Le suivant tombera
// ailleurs : les CV reels sont mis en page par des gens, dans Word, avec des
// tabulations et des tirets un peu partout. Le produit a deja la reponse au
// cas difficile, c'est le modele, et il le decrit comme son role : "Nuvi met
// en forme". Ce qui manquait n'etait pas de l'habilete, c'etait un aveu de
// doute.
//
// CE QUE CE TEST GARDE
//
// Que le doute coute des points, donc qu'une lecture douteuse repasse par le
// modele. Et surtout, l'inverse : qu'une lecture propre n'en perde aucun. Un
// garde-fou qui doute de tout renverrait chaque CV au modele, ferait payer
// tout le monde, et le premier reflexe serait de le desactiver.

import { lireUnCv, CONFIANCE_SUFFISANTE, signesDeDoute } from "../lib/lireUnCv.js";

// Le CV tel que le lecteur l'avait range, reconstitue depuis les captures.
const MAL_LU = {
  name: "Kilian Maisonnette",
  experience: [
    { title: "Account Manager " + String.fromCharCode(0x2014), company: "Stenn International", period: "2016 - 2023", bullets: ["x"] },
  ],
  education: [
    { degree: "Level 7 Diploma in Strategic Management (expected 2026) 2026",
      school: "Banking and Finance Training, Banking products, regulatory compliance, advisory sales techniques",
      period: "2026" },
  ],
  certifications: ["2023"],
};

const BIEN_LU = {
  name: "Kilian Maisonnette",
  experience: [
    { title: "Account Manager", company: "Stenn International", period: "2016 - 2023", bullets: ["x"] },
  ],
  education: [
    { degree: "Level 7 Diploma in Strategic Management", school: "CMI", period: "2026" },
  ],
  certifications: ["CIPD Level 3"],
};

// Un CV brut, complet et propre : il doit continuer a se lire sans rien
// couter. C'est le cas ordinaire, et le proteger compte autant que d'attraper
// l'autre.
//
// LE SEPARATEUR EST CELUI QUE LE LECTEUR SAIT LIRE
//
// Mesure faite en ecrivant ce test : le decoupeur reconnait "chez", "at",
// "|", " - " et " . ", mais PAS la virgule. "Care Assistant, Elmwood House,
// Manchester", qui est pourtant la forme la plus repandue dans les vrais CV,
// tombe a 0,7 et repart vers le modele. C'est le bon comportement - le
// modele reorganise - mais ce n'est pas ce qu'on veut mesurer ici, ou il
// faut justement une lecture locale reussie.
const BRUT_PROPRE = [
  "Sam Carter",
  "Care Assistant",
  "sam.carter@gmail.com | 07700 900123",
  "",
  "EXPERIENCE",
  "Care Assistant - Elmwood House",
  "2022 - 2026",
  "- Supported 14 residents with personal care and medication.",
  "- Trained 5 new starters.",
  "",
  "Support Worker - Bright Path Care",
  "2020 - 2022",
  "- Kept daily records the night team never had to chase.",
  "",
  "EDUCATION",
  "NVQ Level 3 in Health and Social Care",
  "Manchester College",
  "2020",
  "",
  "SKILLS",
  "Medication administration, personal care, record keeping, safeguarding",
].join("\n");

export async function run() {
  const failures = [];

  try {
    // 1. LES QUATRE SIGNES SONT VUS
    const vus = signesDeDoute(MAL_LU);
    if (vus.length < 4) {
      failures.push("seulement " + vus.length + " signe(s) de doute sur les "
        + "quatre du CV reel : " + JSON.stringify(vus) + ". Une lecture "
        + "fautive continuera de se declarer sure d'elle.");
    }

    // 2. ET UNE LECTURE PROPRE N'EN DECLENCHE AUCUN
    const faux = signesDeDoute(BIEN_LU);
    if (faux.length) {
      failures.push("une lecture propre declenche " + faux.length + " signe(s) "
        + "de doute : " + JSON.stringify(faux) + ". Un garde-fou qui doute de "
        + "tout renvoie chaque CV au modele, fait payer tout le monde, et "
        + "finit desactive.");
    }

    // 3. LE DOUTE FAIT VRAIMENT PASSER SOUS LE SEUIL
    //
    // C'est le seul controle qui prouve que le signe SERT. Compter des signes
    // sans regarder le score laisserait passer un bareme ou ils ne pesent
    // rien.
    const brutFautif = [
      "Kilian Maisonnette",
      "Account Manager",
      "kilian@gmail.com | 07383686858",
      "",
      "EXPERIENCE",
      "Account Manager " + String.fromCharCode(0x2014),
      "Stenn International, London, UK",
      "2016 - 2023",
      "- Onboarded 60+ SME clients.",
      "",
      "EDUCATION",
      "Level 7 Diploma in Strategic Management (expected 2026) 2026",
      "Banking and Finance Training, Banking products, regulatory compliance, advisory sales techniques",
      "2026",
      "",
      "CERTIFICATIONS",
      "2023",
      "",
      "SKILLS",
      "Salesforce, KYC, AML",
    ].join("\n");

    const fautif = lireUnCv(brutFautif);
    if (fautif.confiance >= CONFIANCE_SUFFISANTE) {
      failures.push("le CV mal lu garde une confiance de " + fautif.confiance
        + ", au-dessus du seuil de " + CONFIANCE_SUFFISANTE + " : il part a "
        + "l'ecran tel quel, sans que le modele le reorganise. Raisons "
        + "relevees : " + JSON.stringify(fautif.raisons));
    }

    const propre = lireUnCv(BRUT_PROPRE);
    if (propre.confiance < CONFIANCE_SUFFISANTE) {
      failures.push("un CV propre tombe a " + propre.confiance + ", sous le "
        + "seuil : il repasserait par le modele pour rien, donc plusieurs "
        + "secondes d'attente et un appel paye, sur le geste le plus frequent "
        + "du produit. Raisons : " + JSON.stringify(propre.raisons));
    }

    if (!failures.length) {
      console.log("      la lecture fautive doute d'elle-meme (" + fautif.confiance
        + ") et la propre garde sa confiance (" + propre.confiance + ")");
    }
  } catch (err) {
    failures.push("le test lui-meme a plante : " + (err && err.message));
  }

  return failures;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((f) => {
    for (const l of f) console.log("ECHEC " + l);
    process.exit(f.length ? 1 : 0);
  });
}
