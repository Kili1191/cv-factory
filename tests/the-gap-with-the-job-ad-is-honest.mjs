// L'ecart avec l'annonce, et rien d'autre.
//
// CE QUE CE TEST PROTEGE
//
// Le panneau d'ecart montre a quelqu'un ce que l'annonce demande et que son CV
// ne dit pas. Sa valeur tient entierement a sa credibilite : le jour ou il
// propose trois lignes qui n'existent nulle part dans l'annonce, on cesse de
// lire les vingt autres, y compris les bonnes.
//
// Il verifie donc quatre choses, dans l'ordre de ce qu'elles coutent :
//
//   1. L'INTITULE ne se declare pas conforme quand il ne l'est pas.
//      "Assistant Bar Manager" contient "Bar Manager" : un simple booleen
//      disait "present" et taisait un ecart de seniorite - or l'intitule est
//      le signal le plus lourd chez Workday et iCIMS. Trois etats, pas deux.
//
//   2. AUCUNE EXPRESSION INVENTEE. Les suites de mots ne doivent jamais
//      traverser une fin de phrase ni un saut de ligne : "beverage team.
//      responsibilities" enjambe un point et un titre de section, "bar manager
//      soho" enjambe une ligne. Ces deux-la sont sorties du premier essai.
//
//   3. LE CAS QUI COMPTE VRAIMENT : l'experience est presente mais nommee
//      autrement. Le CV dit "stock and wastage control", l'annonce dit "stock
//      control". Taleo indexe en booleen : les deux ne se rencontrent jamais.
//      C'est injuste et c'est reparable, a condition de le montrer.
//
//   4. RIEN DE CACHE. Le module ne doit fabriquer aucun texte : il constate.
//      Un panneau qui proposerait d'ecrire des mots-clefs invisibles serait du
//      bourrage, c'est-a-dire une fausse declaration dans un recrutement.

import {
  rapport, titreEnTete, phrasesClefs, ecartMotsClefs, ticsDeMachine, couverture,
} from "../lib/atsMatch.js";

const CV = {
  title: "Assistant Bar Manager",
  summary: "Bilingual hospitality professional with a decade in premium venues.",
  experience: [{
    title: "Bar and Events Manager", company: "Taj Exotica", period: "2025",
    bullets: [
      "Oversaw bar and beverage operations across four outlets.",
      "Maintained beverage gross profit at 78% through tight stock and wastage control.",
    ],
  }],
  education: [{ degree: "Titre Professionnel", school: "AFPA" }],
  skills: ["Service standards", "Team training"],
  certifications: [], languages: [],
};

const ANNONCE = `Bar Manager
Soho House, London

We are looking for an experienced Bar Manager to lead our beverage team.

Responsibilities:
- Full stock control and inventory management across the bar
- Team leadership: recruit, train and develop a team of 15 bartenders
- Cost control and P&L responsibility for the beverage department`;

export async function run() {
  const failures = [];

  // --- 1. L'intitule ---------------------------------------------------
  const t = titreEnTete(CV, ANNONCE);
  if (t.vise !== "Bar Manager") {
    failures.push(`l'intitule de l'annonce est mal lu : "${t.vise}" au lieu de "Bar Manager"`);
  }
  if (t.etat !== "proche") {
    failures.push(
      `"Assistant Bar Manager" face a "Bar Manager" est rendu "${t.etat}" au lieu de "proche". `
      + "Un ecart de seniorite sur l'intitule est le signal le plus lourd d'un ATS : "
      + "le taire coute des places au classement."
    );
  }
  const exact = titreEnTete({ ...CV, title: "Bar Manager" }, ANNONCE);
  if (exact.etat !== "exact") {
    failures.push(`un intitule identique est rendu "${exact.etat}" au lieu de "exact"`);
  }
  const loin = titreEnTete({ title: "Pastry Chef", summary: "" }, ANNONCE);
  if (loin.etat !== "absent") {
    failures.push(`"Pastry Chef" face a "Bar Manager" est rendu "${loin.etat}" au lieu de "absent"`);
  }

  // --- 2. Aucune expression inventee ------------------------------------
  //
  // L'invariant est simple, et ma premiere version ne le testait pas : chaque
  // expression proposee doit se lire TELLE QUELLE dans un segment de
  // l'annonce. Un segment s'arrete a une fin de phrase ou a un saut de ligne.
  //
  // Sans cette regle on fabrique des expressions qui n'existent nulle part
  // - "beverage team responsibilities" enjambe un point et un titre de
  // section - et le panneau perd la confiance qu'il doit inspirer.
  const foldLocal = (x) => String(x || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['\u2019]/g, " ")
    .replace(/\.(?![a-z0-9])/g, " ")
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .replace(/\s+/g, " ").trim();

  const segments = ANNONCE.split(/[\r\n]+|(?<=[.!?;:])\s+/).map(foldLocal).filter(Boolean);
  const phrases = phrasesClefs(ANNONCE, 40);

  for (const p of phrases) {
    if (!segments.some(seg => seg.includes(p))) {
      failures.push(
        `expression inventee : "${p}" ne se lit dans aucune phrase de l'annonce. `
        + "Elle enjambe une fin de phrase ou un saut de ligne."
      );
    }
  }
  if (phrases.some(p => /\./.test(p))) {
    failures.push(`une expression garde un point de fin de phrase : "${phrases.find(p => /\./.test(p))}"`);
  }
  // Pas de recouvrement entre expressions retenues, dans un sens ou l'autre.
  for (const p of phrases) {
    const jumelle = phrases.find(q => q !== p && (q.includes(p) || p.includes(q)));
    if (jumelle) {
      failures.push(`"${p}" fait doublon avec "${jumelle}" : une idee doit tenir sur une ligne`);
      break;
    }
  }

  // --- 2b. Ni l'employeur, ni les adjectifs de prose ---------------------
  //
  // Les premieres lignes d'une annonce portent l'intitule, l'employeur et la
  // ville. Proposer d'ajouter "Soho House" a son CV n'a aucun sens - et deux
  // propositions absurdes suffisent a faire ignorer les vingt bonnes.
  //
  // Meme logique pour les intensificateurs : l'annonce ecrit "full stock
  // control", le terme qu'un index cherche est "stock control". Garder les
  // deux, c'est afficher la meme chose deux fois avec un mot en trop.
  for (const interdit of ["soho house", "soho", "house london"]) {
    if (phrases.includes(interdit)) {
      failures.push(`"${interdit}" vient de l'en-tete de l'annonce : c'est l'employeur, pas une exigence`);
    }
  }
  const INTENS = ["full", "strong", "proven", "excellent", "solid", "extensive"];
  const avecAdjectif = phrases.find(p => INTENS.includes(p.split(" ")[0]) && p.includes(" "));
  if (avecAdjectif) {
    failures.push(
      `"${avecAdjectif}" garde un adjectif de prose en tete. Le terme cherche par un `
      + "index est celui qui suit, et le CV a une chance de le contenir tel quel."
    );
  }

  // --- 3. Le cas qui compte : deja la, mal nomme ------------------------
  const e = ecartMotsClefs(CV, ANNONCE, 40);
  if (!e.aReformuler.includes("stock control")) {
    failures.push(
      "\"stock control\" n'est pas signale comme a reformuler. Le CV dit "
      + "\"stock and wastage control\" : les mots y sont, l'ordre non, et un "
      + "index booleen ne les rapproche jamais. C'est le cas que ce panneau existe pour attraper."
    );
  }
  if (e.manquantes.includes("stock control")) {
    failures.push("\"stock control\" est donne comme absent alors que l'experience est bien la");
  }
  if (!e.manquantes.some(p => /team leadership|cost control/.test(p))) {
    failures.push("aucune des deux exigences dures absentes du CV n'est signalee");
  }
  // Ce qui EST dans le CV ne doit pas etre reclame.
  const dejaDit = [...e.manquantes, ...e.aReformuler].find(p => p === "beverage operations");
  if (dejaDit) failures.push(`"${dejaDit}" est ecrit tel quel dans le CV et pourtant reclame`);

  // --- 4. Les tics de machine, dont le tiret long -----------------------
  const long = String.fromCharCode(0x2014);
  const tics = ticsDeMachine({
    summary: `Passionate about excellence ${long} a proven track record.`,
    experience: [],
  });
  for (const attendu of ["passionate about", "proven track record", "tiret long"]) {
    if (!tics.includes(attendu)) failures.push(`tic de machine non detecte : "${attendu}"`);
  }
  if (ticsDeMachine({ summary: "Managed a bar team of twenty.", experience: [] }).length) {
    failures.push("une phrase ordinaire est prise pour du texte de machine");
  }

  // --- 5. Le rapport ne fabrique rien -----------------------------------
  const r = rapport(CV, ANNONCE);
  const cléSuspecte = Object.keys(r).find(k => /texte|genere|inject|cache|hidden/i.test(k));
  if (cléSuspecte) {
    failures.push(
      `le rapport expose "${cléSuspecte}" : ce module constate un ecart, il n'ecrit pas de texte, `
      + "et surtout aucun texte que l'humain ne verrait pas."
    );
  }
  if (typeof r.aCorriger !== "number") failures.push("le rapport ne rend plus de compte a corriger");

  // --- 5. LE GRAND CHIFFRE SE CALCULE -----------------------------------
  //
  // Le panneau affichait un score sur 100 rendu par le modele : un champ
  // libre du schema, que rien ne calculait et que rien ne verifiait. Deux
  // passages sur le meme couple annonce/CV ne donnaient pas le meme nombre.
  // Ce fichier-ci refusait deja de rendre une note, avec la raison ecrite a
  // cote : une note fait croire a une precision qu'on n'a pas.
  //
  // Celui-la se compte. Ce qu'on tient ici, c'est qu'il mesure bien quelque
  // chose : qu'il monte quand le CV reprend les mots de l'annonce, qu'il
  // tombe a zero quand il n'en reprend aucun, qu'il ne rend rien plutot
  // qu'un chiffre creux quand l'annonce n'offre rien a comparer, et que son
  // denominateur est celui que le panneau affiche a cote.
  const couv = couverture(CV, ANNONCE);
  if (!couv) {
    failures.push("aucune couverture calculee sur une vraie annonce : le panneau n'aurait pas de chiffre");
  } else {
    if (couv.demandees !== e.demandees) {
      failures.push("la couverture compte " + couv.demandees + " expressions demandees et l'ecart "
        + e.demandees + " : les deux chiffres du panneau ne parlent pas de la meme chose");
    }
    if (couv.present !== couv.demandees - e.manquantes.length - e.aReformuler.length) {
      failures.push("le nombre d'expressions presentes ne se deduit pas des listes affichees");
    }
    if (couv.score < 0 || couv.score > 100) {
      failures.push("la couverture rend " + couv.score + ", hors de l'echelle qu'elle affiche");
    }
    // Le meme CV ecrit avec les mots de l'annonce doit mieux s'en sortir.
    // Sans cette comparaison, une fonction qui rendrait toujours 50 passerait.
    const avecLesMots = { ...CV, title: "Bar Manager", skills: [...CV.skills, ...phrasesClefs(ANNONCE)] };
    const mieux = couverture(avecLesMots, ANNONCE);
    if (!mieux || mieux.score <= couv.score) {
      failures.push("reprendre les expressions de l'annonce ne fait pas monter le chiffre ("
        + couv.score + " puis " + (mieux && mieux.score) + ") : il ne mesure pas ce qu'il annonce");
    }
    const vide = couverture({ title: "", summary: "", experience: [], education: [], skills: [], languages: [] }, ANNONCE);
    if (!vide || vide.score !== 0) {
      failures.push("un CV vide ne tombe pas a zero (" + (vide && vide.score) + ")");
    }
    if (couverture(CV, "") !== null) {
      failures.push("une annonce sans expression rend quand meme un chiffre, qui ne repose sur rien");
    }
  }

  // --- 6. LE MOBILIER D'UNE ANNONCE N'EST PAS UNE EXIGENCE --------------
  //
  // Sur une annonce agregee, un titre, un salaire, un type de contrat et
  // presque rien d'autre, les expressions extraites etaient le salaire, la
  // date de publication, le bouton Postuler et le nom de la boite. Le
  // panneau les donnait comme "absentes de ton CV", et le chiffre les
  // comptait au denominateur : un CV parfaitement adapte sortait a 7 sur
  // 100 parce que personne n'ecrit "days ago" sur un CV.
  const MINCE = `Senior Associate, Client and Workplace Experience
Expedite Group Europe

London, United Kingdom
Full-time
Salary: 36,000 - 60,000 GBP per year
Posted 3 days ago
Apply now on the company website
About the role: Senior Associate, Client and Workplace Experience.
Expedite Group Europe is hiring.`;
  // Deuxieme passage, releve sur une vraie annonce : le panneau donnait a
  // ajouter au CV le nom de la rue et le code postal du bureau, plus deux
  // morceaux de la page du site. Le chiffre les comptait au denominateur.
  const ADRESSE = `Senior Associate, Client and Workplace Experience
Expedite Group Europe

Job details align with your profile.
Location: 12 Bartholomew Lane, London EC2N 2AT
Second office: 40 Lavender Road, London.
Job details align with your profile.
Location: 12 Bartholomew Lane, London EC2N 2AT
Second office: 40 Lavender Road, London.`;
  for (const mobilier of ["bartholomew lane", "lavender road", "london ec2n",
    "details align", "lane london"]) {
    if (phrasesClefs(ADRESSE).includes(mobilier)) {
      failures.push("\"" + mobilier + "\" est propose comme exigence : c'est l'adresse du "
        + "bureau ou un morceau de la page, pas ce que le poste demande");
    }
  }

  const duMince = phrasesClefs(MINCE);
  for (const mobilier of ["gbp", "days ago", "apply now", "company website",
    "united kingdom", "expedite group", "full time", "000"]) {
    const vu = duMince.find((p) => p.includes(mobilier));
    if (vu) {
      failures.push("\"" + vu + "\" est propose comme exigence de l'annonce : "
        + "c'est le mobilier du site d'emploi, pas ce que le poste demande");
    }
  }
  if (couverture(CV, MINCE) !== null) {
    failures.push("une annonce qui ne dit que son titre et son salaire rend quand meme "
      + "une part sur 100 : un CV bien adapte y sortait a 7 et le chiffre ne mesurait rien");
  }
  // Et l'annonce complete, elle, garde ses exigences : le filtre coupe le
  // mobilier, pas le metier. Ces trois-la sortent bien de cette annonce,
  // verifie contre la version d'avant le filtre.
  const duRiche = phrasesClefs(ANNONCE);
  for (const vrai of ["stock control", "cost control", "inventory management"]) {
    if (!duRiche.includes(vrai)) {
      failures.push("le filtre du mobilier a emporte \"" + vrai + "\", qui est une vraie exigence");
    }
  }

  if (!failures.length) {
    console.log(
      `      intitule "${t.actuel}" vs "${t.vise}" -> ${t.etat} ; `
      + `${e.aReformuler.length} a reformuler, ${e.manquantes.length} absentes, aucune inventee ; `
      + `couverture mesuree ${couv ? couv.present + "/" + couv.demandees : "aucune"}`
    );
  }
  return failures;
}
