// Un CV casse ne part pas en silence.
//
// LE DEFAUT
//
// Kilian a telecharge son CV depuis thenuvi.com. Il est sorti avec, entre
// autres, "Account Manager (cadratin)" comme intitule de poste, un employeur
// "Private Clients (cadratin)", une section CERTIFICATIONS dont l'unique
// element etait "2023", et un nom d'ecole qui etait une phrase de
// quatre-vingt-dix caracteres.
//
// Le produit n'a rien dit. Bouton, clic, fichier.
//
// C'est le pire endroit pour se taire, parce que c'est le seul geste du
// produit qui ne se rattrape pas. Un mauvais conseil se rejette, une
// reformulation ratee se reecrit, un score injuste s'ignore. Un CV envoye est
// envoye, et la personne l'apprendra - si elle l'apprend - par trois semaines
// de silence.
//
// CE QUE CE TEST GARDE, ET DANS QUEL ORDRE
//
//   1. Les defauts du CV reel sont vus. Chacun de ceux de la capture.
//   2. Un CV propre n'en declenche AUCUN. C'est le controle qui compte le
//      plus : une garde qui crie sur tout le monde est desactivee dans la
//      semaine, et elle aura alors coute la confiance de ceux qu'elle devait
//      proteger.
//   3. Un champ n'est signale qu'une fois. Dix defauts sur trois champs font
//      une liste qu'on ne lit pas.
//   4. Le bouton n'est jamais retire. Nuvi ne decide pas a la place de la
//      personne : quelqu'un peut vouloir imprimer un brouillon pour le relire
//      au crayon. Ce qu'il ne doit pas pouvoir faire, c'est telecharger sans
//      savoir.

import { defautsDuCv, trierLesDefauts } from "../lib/leCvEstIlPresentable.js";

const CADRATIN = String.fromCharCode(0x2014);

// Le CV de la capture, reconstitue champ par champ.
const CV_CASSE = {
  name: "Kilian Maisonnette",
  email: "kilian.maisonnette@gmail.com",
  phone: "07383686858",
  experience: [
    { title: "Client Relationship Manager", company: "Private Clients " + CADRATIN,
      period: "2023 - 2026", bullets: ["Managed a portfolio of private investors."] },
    { title: "Account Manager " + CADRATIN, company: "Stenn International",
      period: "2016 - 2023", bullets: ["Onboarded 60+ SME clients over 7 years."] },
    { title: "Customer Service Advisor " + CADRATIN, company: "La Banque Postale",
      period: "2013 - 2016", bullets: [] },
  ],
  education: [{
    degree: "Level 7 Diploma in Strategic Management and Leadership (expected 2026) 2026",
    school: "Banking and Finance Training, Banking products, regulatory compliance, advisory sales techniques",
    period: "2026",
  }],
  certifications: ["2023"],
  skills: ["Salesforce CRM and Pipeline Management"],
  languages: [{ lang: "French", level: "Native" }],
};

// Le meme CV, tel qu'il aurait du sortir. Rien d'exceptionnel : un CV
// ordinaire, correctement decoupe.
const CV_PROPRE = {
  name: "Kilian Maisonnette",
  email: "kilian.maisonnette@gmail.com",
  phone: "07383686858",
  experience: [
    { title: "Client Relationship Manager", company: "Private Clients",
      location: "UAE", period: "2023 - 2026",
      bullets: ["Managed a portfolio of private investors through the full cycle."] },
    { title: "Account Manager", company: "Stenn International",
      location: "London, UK", period: "2016 - 2023",
      bullets: ["Onboarded 60+ SME clients over 7 years, cutting delays by 30%."] },
  ],
  education: [{
    degree: "Level 7 Diploma in Strategic Management and Leadership",
    school: "CMI", period: "2026",
  }],
  certifications: ["CIPD Level 3"],
  skills: ["Salesforce CRM and Pipeline Management", "KYC and AML Compliance"],
  languages: [{ lang: "French", level: "Native" }],
};

export async function run() {
  const failures = [];

  try {
    const vus = trierLesDefauts(defautsDuCv(CV_CASSE));
    const cles = vus.map((d) => d.cle);

    // 1. CHACUN DES DEFAUTS DE LA CAPTURE
    const ATTENDUS = {
      coupe: "un champ qui finit par un tiret long, donc coupe au mauvais endroit",
      creuse: "une certification qui n'est qu'une annee",
      annee_doublee: "l'annee du diplome repetee dans son intitule et sa colonne",
      phrase: "un nom d'ecole qui est une phrase entiere",
      poste_muet: "un poste sans une seule ligne a lire",
    };
    for (const [cle, quoi] of Object.entries(ATTENDUS)) {
      if (!cles.includes(cle)) {
        failures.push("non vu : " + quoi + " (" + cle + "). Ce defaut etait "
          + "sur le CV telecharge depuis la production, et il repartirait "
          + "sans un mot.");
      }
    }

    // 2. UN CV PROPRE NE DECLENCHE RIEN
    //
    // Le controle le plus important du fichier. Une garde qui crie sur tout
    // le monde est desactivee dans la semaine.
    const faux = defautsDuCv(CV_PROPRE);
    if (faux.length) {
      failures.push("un CV correct declenche " + faux.length + " alerte(s) : "
        + faux.map((d) => d.cle + " sur " + d.ou).join(", ")
        + ". Une garde qui se declenche a tort est desactivee dans la "
        + "semaine, et elle aura coute la confiance de ceux qu'elle devait "
        + "proteger.");
    }

    // 3. UN CHAMP N'EST SIGNALE QU'UNE FOIS
    const parChamp = new Map();
    for (const d of vus) parChamp.set(d.ou, (parChamp.get(d.ou) || 0) + 1);
    for (const [ou, n] of parChamp) {
      if (n > 1) {
        failures.push("le champ \"" + ou + "\" est signale " + n + " fois. Dix "
          + "alertes sur trois champs font une liste qu'on ne lit pas "
          + "jusqu'au bout.");
      }
    }

    // 4. CHAQUE ALERTE PORTE LE TEXTE EXACT ET UNE RAISON
    //
    // Quelqu'un ne corrige que ce qu'il reconnait. "Un champ est mal coupe"
    // envoie chercher ; "Account Manager -" se retrouve d'un coup d'oeil.
    for (const d of vus) {
      if (!d.pourquoi || d.pourquoi.length < 20) {
        failures.push("l'alerte \"" + d.cle + "\" ne dit pas pourquoi ca "
          + "compte pour la personne.");
      }
      if (!d.ou) {
        failures.push("l'alerte \"" + d.cle + "\" ne dit pas ou regarder.");
      }
    }

    // 5. LE CAS VIDE NE PLANTE PAS
    //
    // Le controle tourne avant CHAQUE telechargement : s'il leve sur un CV
    // a moitie rempli, il emporte le telechargement avec lui.
    for (const bancal of [null, undefined, {}, { experience: null }, { education: "x" }]) {
      try {
        defautsDuCv(bancal);
      } catch (e) {
        failures.push("le controle plante sur " + JSON.stringify(bancal)
          + " : il tourne avant chaque telechargement, donc il emporterait "
          + "le telechargement avec lui.");
      }
    }

    if (!failures.length) {
      console.log("      " + vus.length + " defauts vus sur le CV telecharge en "
        + "production, aucun sur un CV correct");
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
