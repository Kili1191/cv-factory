// Les deux lectures d'un CV se comptent, et elles ont le droit de diverger.
//
// POURQUOI DEUX NOTES ET PAS UNE
//
// Un CV est lu deux fois. D'abord par un logiciel, qui ne juge rien et essaie
// de RANGER le document en champs : s'il n'y arrive pas, la personne n'existe
// pas dans la base, et aucune qualite du texte ne la rattrape. Ensuite par un
// humain, qui ne range rien et cherche une raison d'appeler.
//
// Les deux se contredisent souvent. Bourrer un CV de mots-cles fait monter la
// premiere note et descendre la seconde ; une accroche brillante et vague fait
// l'inverse. Une note unique moyennerait ces deux mouvements et cacherait le
// seul renseignement utile : lequel des deux lecteurs vous perd.
//
// Ce test garde exactement ca : que les deux notes PEUVENT diverger. Si elles
// bougent toujours ensemble, en afficher deux est un mensonge d'interface.
//
// LA SIMULATION NE DOIT PAS CONTREDIRE LA MESURE
//
// Le controle le plus important est le dernier. Une premiere version modelisait
// la mise en page a bande en rangeant le bloc contact avant le nom : elle
// annoncait un echec chez les six analyseurs, alors que le meme document,
// exporte pour de vrai, est lu correctement par poppler, MuPDF et Tika. Le
// test d'export le verifie sur les six modeles.
//
// Une simulation qui contredit la mesure a tort, toujours. Celle-ci aurait
// fait fuir les gens d'une mise en page qui marche, sur la foi d'un chiffre
// invente. C'est le defaut le plus grave que puisse avoir un score : etre
// confiant et faux.

import { deuxLectures, texteProbable } from "../lib/deuxLectures.js";

const SOLIDE = {
  name: "Kilian Maisonnette", title: "Bar and Events Manager",
  email: "k@example.com", phone: "07383686858", location: "London SW11",
  summary: "Hospitality manager, ten years across premium bars and events.",
  experience: [
    { title: "Bar and Events Manager", company: "Taj Exotica", location: "Dubai",
      period: "2025 - 2026", bullets: [
        "Maintained beverage gross profit at 78% through tight stock control.",
        "Led and trained a team of 20 across four outlets.",
        "Delivered 140 private events in one year." ] },
    { title: "Deli and Bar Manager", company: "Maison Francois", location: "London",
      period: "2022 - 2025", bullets: [
        "Grew the deli from 5 regular guests to 120 in five months.",
        "Managed two bars end to end: ordering, stock and daily operations." ] },
  ],
  education: [{ degree: "WSET Level 2", school: "WSET", period: "2021" }],
  skills: ["Bar management", "Stock control", "Events"],
  languages: [{ lang: "English", level: "C2" }],
};

// Le meme parcours, ecrit en formules. La structure reste correcte, donc un
// logiciel s'en sort ; il n'y a plus rien pour un humain.
const EN_FORMULES = {
  ...SOLIDE,
  title: "Passionate hospitality professional",
  summary: "Dynamic and motivated team player with excellent communication skills.",
  experience: SOLIDE.experience.map((e) => ({
    ...e,
    bullets: ["Responsible for the bar", "Helped improve the business",
              "Team player with a strong work ethic"],
  })),
};

const LAYOUTS = ["sidebar", "classic", "timeline", "swiss", "compact", "ats"];

export async function run() {
  const failures = [];

  // 1. Deterministe. C'est la promesse qui justifie d'avoir remplace le
  //    modele : deux passages, le meme couple de notes, au caractere pres.
  const a = JSON.stringify(deuxLectures(SOLIDE, { layout: "classic", langue: "en" }));
  const b = JSON.stringify(deuxLectures(SOLIDE, { layout: "classic", langue: "en" }));
  if (a !== b) {
    failures.push(
      "deux lectures du meme CV rendent des rapports differents. Un nombre qui "
      + "bouge sans que rien n'ait change n'est pas une mesure."
    );
  }

  // 2. Les notes restent des notes.
  for (const [nom, cv] of [["solide", SOLIDE], ["en formules", EN_FORMULES], ["vide", {}]]) {
    const r = deuxLectures(cv, { langue: "en" });
    for (const [quoi, n] of [["machine", r.machine.note], ["humain", r.humain.note]]) {
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        failures.push(`CV ${nom} : la note ${quoi} vaut ${n}, hors de 0-100.`);
      }
    }
  }

  // 3. Les deux lectures divergent quand elles le doivent. Un CV bien range
  //    mais vide de preuve doit etre nettement mieux vu par la machine que
  //    par l'humain. Sans cet ecart, deux notes n'apprennent rien.
  const creux = deuxLectures(EN_FORMULES, { langue: "en" });
  if (!(creux.machine.note - creux.humain.note >= 15)) {
    failures.push(
      "un CV bien structure mais sans aucune preuve chiffree obtient "
      + `machine=${creux.machine.note} et humain=${creux.humain.note}. `
      + "Les deux notes bougent ensemble : en afficher deux ne dit rien de plus "
      + "qu'une seule."
    );
  }

  // 4. Un bon CV est bon pour les deux.
  const bon = deuxLectures(SOLIDE, { langue: "en" });
  if (bon.machine.note < 80 || bon.humain.note < 75) {
    failures.push(
      `un CV chiffre, date et bien range obtient machine=${bon.machine.note} `
      + `humain=${bon.humain.note}. Un bareme qui ne recompense pas un bon `
      + "document decourage exactement ce qu'il devrait encourager."
    );
  }

  // 5. Chaque axe humain porte sa mesure ET sa phrase. Une note sans mesure
  //    ne se corrige pas.
  for (const axe of bon.humain.axes) {
    if (axe.fait === undefined || axe.fait === null) {
      failures.push(`l'axe humain "${axe.id}" ne porte aucune mesure.`);
    }
    if (!axe.reco || !String(axe.reco).trim()) {
      failures.push(`l'axe humain "${axe.id}" ne dit pas quoi en faire.`);
    }
  }

  // 6. LA SIMULATION NE CONTREDIT PAS LA MESURE.
  //    Le test d'export prouve que les six mises en page sortent un PDF ou le
  //    nom precede le mot CONTACT, lu par trois vrais moteurs. La simulation
  //    ne doit donc condamner aucune d'elles.
  for (const layout of LAYOUTS) {
    const r = deuxLectures(SOLIDE, { layout, langue: "en" });
    if (r.machine.passent < r.machine.total) {
      failures.push(
        `mise en page ${layout} : la simulation annonce ${r.machine.passent}/`
        + `${r.machine.total} analyseurs sur un CV propre, alors que le test `
        + "d'export prouve que ce modele est lu correctement par poppler, MuPDF "
        + "et Tika. Une simulation qui contredit la mesure a tort : elle ferait "
        + "fuir les gens d'une mise en page qui marche."
      );
    }
  }

  // 7. Le texte reconstitue met l'identite avant le bloc contact, comme le
  //    PDF reel. C'est la cause exacte du defaut corrige en 6.
  const t = texteProbable(SOLIDE);
  const posNom = t.indexOf(SOLIDE.name);
  const posContact = t.search(/CONTACT/i);
  if (posNom < 0 || (posContact >= 0 && posContact < posNom)) {
    failures.push(
      "le texte reconstitue ne commence pas par le nom. Un analyseur prend les "
      + "premieres lignes pour l'identite, et la note partirait d'une faute que "
      + "le produit ne commet pas."
    );
  }

  // 8. La provenance est dite. Une note tiree d'un texte reconstitue et une
  //    note tiree d'un vrai PDF ne valent pas la meme chose, et l'interface
  //    doit pouvoir le dire.
  if (bon.machine.source !== "reconstitue") {
    failures.push("une note calculee sans PDF ne se declare pas comme reconstituee.");
  }
  const mesure = deuxLectures(SOLIDE, { texte: texteProbable(SOLIDE), langue: "en" });
  if (mesure.machine.source !== "pdf") {
    failures.push("une note calculee sur un texte fourni ne se declare pas comme mesuree.");
  }

  if (!failures.length) {
    console.log(
      "      les deux lectures se comptent, divergent sur un CV creux "
      + `(machine ${creux.machine.note} contre humain ${creux.humain.note}), `
      + "et ne contredisent aucune des six mises en page mesurees"
    );
  }
  return failures;
}
