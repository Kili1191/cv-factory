// Le dossier de parcours rassemble, il n'invente pas.
//
// CE QU'IL RESOUT
//
// Adapter un CV a une offre ne pouvait piocher que dans le CV ouvert. Quelqu'un
// qui garde une version "hotellerie" et une version "commercial", et qui
// postule au commercial avec la premiere chargee, obtenait une adaptation batie
// sur le mauvais materiau. Son experience commerciale existait, elle etait
// enregistree, et personne n'allait la chercher.
//
// LA GARANTIE QUI COMPTE
//
// Choisir dans ce qu'on a deja ecrit n'est pas inventer : c'est ce que fait
// quiconque adapte son CV a la main. Mais la frontiere doit tenir toute seule,
// pas dependre de la vigilance. Ce test verifie donc que CHAQUE element du
// dossier existe dans au moins une source. Rien n'apparait en chemin.
//
// L'AUTRE GARANTIE, PLUS DISCRETE
//
// Le choix "tout mon parcours" ne doit pas s'afficher quand il ne changerait
// rien. Proposer une option qui rend exactement le meme resultat decoit plus
// qu'elle n'aide, et decredibilise celles qui servent.

import { dossierParcours, apportDuDossier, dossierEnTexte } from "../lib/careerRecord.js";

const COURANT = {
  title: "Assistant Bar Manager",
  experience: [{
    title: "Bar and Events Manager", company: "Taj Exotica", period: "2025",
    bullets: ["Oversaw bar operations across four outlets."],
  }],
  education: [{ degree: "Titre Professionnel", school: "AFPA" }],
  skills: ["Service standards"],
  languages: [{ lang: "French", level: "Native" }],
  certifications: [],
};

const VERSIONS = [{
  name: "Commercial",
  cv: {
    experience: [
      {
        title: "Bar and Events Manager", company: "Taj Exotica", period: "2025",
        bullets: [
          "Delivered cost control and P&L for the beverage department.",
          "Led team leadership for 20 staff.",
        ],
      },
      {
        title: "Sales Executive", company: "Pernod Ricard", period: "2018-2019",
        bullets: ["Managed a portfolio of 45 on-trade accounts."],
      },
    ],
    education: [{ degree: "BTS Commerce", school: "Lycee Jean Moulin" }],
    skills: ["Cost control", "Team leadership"],
    languages: [{ lang: "English", level: "Fluent" }],
    certifications: ["WSET Level 2"],
  },
}];

function fold(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export async function run() {
  const failures = [];
  const d = dossierParcours(COURANT, VERSIONS);

  // --- 1. Rien n'apparait en chemin -------------------------------------
  //
  // La garantie centrale : tout ce qui sort etait deja entre.
  const sources = [COURANT, ...VERSIONS.map(v => v.cv)];
  const toutLeTexte = new Set();
  for (const s of sources) {
    for (const e of s.experience || []) {
      [e.title, e.company, e.period, e.location, ...(e.bullets || [])]
        .filter(Boolean).forEach(x => toutLeTexte.add(fold(x)));
    }
    for (const e of s.education || []) {
      [e.degree, e.school, e.period].filter(Boolean).forEach(x => toutLeTexte.add(fold(x)));
    }
    (s.skills || []).forEach(x => toutLeTexte.add(fold(x)));
    (s.certifications || []).forEach(x => toutLeTexte.add(fold(x)));
    (s.languages || []).forEach(l => { toutLeTexte.add(fold(l.lang)); toutLeTexte.add(fold(l.level)); });
  }

  const sortis = [];
  for (const e of d.experience) {
    [e.title, e.company, e.period, e.location, ...(e.bullets || [])]
      .filter(Boolean).forEach(x => sortis.push(["experience", x]));
  }
  for (const e of d.education) {
    [e.degree, e.school, e.period].filter(Boolean).forEach(x => sortis.push(["formation", x]));
  }
  d.skills.forEach(x => sortis.push(["competence", x]));
  d.certifications.forEach(x => sortis.push(["certification", x]));
  d.languages.forEach(l => { sortis.push(["langue", l.lang]); if (l.level) sortis.push(["langue", l.level]); });

  for (const [quoi, valeur] of sortis) {
    if (!toutLeTexte.has(fold(valeur))) {
      failures.push(
        `${quoi} inventee : "${valeur}" ne figure dans aucune source. `
        + "Le dossier rassemble ce qui existe, il ne fabrique rien."
      );
    }
  }

  // --- 2. La meme experience ne compte qu'une fois -----------------------
  const taj = d.experience.filter(e => /Taj Exotica/.test(e.company || ""));
  if (taj.length !== 1) {
    failures.push(
      `la meme experience apparait ${taj.length} fois. Un parcours dedouble donne `
      + "l'impression d'une carriere plus longue qu'elle n'est."
    );
  } else if (taj[0].bullets.length !== 3) {
    failures.push(
      `l'experience commune ne garde que ${taj[0].bullets.length} formulation(s) sur 3. `
      + "C'est leur diversite qui a de la valeur : l'une d'elles emploie peut-etre "
      + "deja les mots de l'offre."
    );
  } else if (!/Oversaw bar operations/.test(taj[0].bullets[0])) {
    failures.push(
      "la formulation du CV courant n'est plus en tete. C'est celle que la personne "
      + "utilise aujourd'hui, elle doit primer."
    );
  }

  // --- 3. Ce qui n'existait que dans une version est bien la -------------
  if (!d.experience.some(e => /Pernod Ricard/.test(e.company || ""))) {
    failures.push(
      "l'experience presente uniquement dans une version sauvegardee est absente : "
      + "c'est precisement le probleme que ce dossier existe pour resoudre"
    );
  }
  if (!d.skills.includes("Cost control") || !d.certifications.includes("WSET Level 2")) {
    failures.push("des competences ou certifications d'une version sauvegardee sont perdues");
  }
  if (d.languages.length !== 2) {
    failures.push(`${d.languages.length} langue(s) au lieu de 2 : une version en apporte une seconde`);
  }

  // --- 4. Pas de choix qui ne change rien --------------------------------
  const seul = apportDuDossier(COURANT, []);
  if (seul.utile) {
    failures.push(
      "sans version sauvegardee, le dossier se declare utile. Le choix "
      + "\"tout mon parcours\" s'afficherait alors qu'il rendrait le meme resultat."
    );
  }
  const avec = apportDuDossier(COURANT, VERSIONS);
  if (!avec.utile || avec.experiences !== 1) {
    failures.push(
      `l'apport est mal compte : ${JSON.stringify(avec)}. L'ecran annonce ces chiffres `
      + "a l'utilisateur, ils doivent etre exacts."
    );
  }

  // --- 5. Le texte de consigne contient bien tout -----------------------
  const txt = dossierEnTexte(d);
  for (const attendu of ["Pernod Ricard", "Cost control", "WSET Level 2", "Titre Professionnel"]) {
    if (!txt.includes(attendu)) failures.push(`"${attendu}" manque dans le texte transmis a l'IA`);
  }

  if (!failures.length) {
    console.log(
      `      ${d.experience.length} experiences depuis ${d.sources} sources, `
      + `${taj[0].bullets.length} formulations sur l'experience commune, rien d'invente`
    );
  }
  return failures;
}
