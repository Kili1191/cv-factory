// UNE PHRASE EST UNE RECHERCHE, ET UN FILTRE NE DOIT RIEN AVALER EN SILENCE
//
// Kilian, le 6 octobre 2026 : "si j'ecris trouve moi un job de francophone
// avec mon CV a Londres, est-ce que ca cherche sur tout internet ?" La
// recherche n'avait que deux champs, l'intitule et la ville : "francophone"
// n'etait ni l'un ni l'autre, et c'est pourtant l'exigence qui compte le
// plus pour lui. Une annonce londonienne qui demande le francais est une
// annonce ou son profil passe devant les autres.
//
// CE QUE CE TEST TIENT
//
// Le modele traduit la phrase, il ne cherche pas, donc rien ici n'appelle
// l'IA. Ce qui est a nous, c'est la lecture des exigences dans la prose de
// l'annonce, et c'est la que tout se joue : un mot present ne veut pas dire
// ce qu'on croit.
//
//   1. "Fluent French essential" exige le francais. "We serve the French
//      market" et "French fries on the menu" ne l'exigent pas. C'est la
//      meme lecon que includes("account") dans "accounting".
//   2. "This role is not remote" n'est pas une offre de remote, alors que la
//      phrase contient le mot. Le refus se teste avant l'offre, comme le
//      parrainage avant le droit de travailler dans extension/champs.js.
//   3. Une annonce sans salaire PASSE un plancher, et le compte des indecis
//      le dit. L'ecarter viderait la liste de ses meilleures offres sans
//      qu'un mot le dise.
//   4. Ce que le modele rend est ramene dans les clous : une enumeration
//      inconnue devient vide, pas un filtre qui n'accepte rien.

import {
  passeLesFiltres, compterLesIndecis, filtresActifs, formeDeTravail,
  offreExigeLaLangue, plancherAnnonce, typeDeContrat, niveauDuPoste, FILTRES_VIDES,
} from "../lib/filtresDOffre.js";
import {
  filtresDepuisLeModele, parametresDeRecherche, filtresDepuisLesParametres,
  consigneDeRecherche, SCHEMA_RECHERCHE,
} from "../lib/rechercheEnPhrase.js";

const offre = (titre, texte, extra = {}) => ({
  id: "1", source: "ats", title: titre, company: "Test Ltd", location: "London, UK",
  url: "https://example.invalid/1", description: texte, ...extra,
});

export async function run() {
  const failures = [];

  // --- 1. LA LANGUE EXIGEE, PAS LA LANGUE MENTIONNEE ---------------------
  const exige = [
    "Fluent French is essential for this role.",
    "We are looking for a French speaker.",
    "French-speaking candidates only.",
    "Native French required.",
    "Bilingual French / English.",
    "Francais courant exige.",
    "Maitrise du francais indispensable.",
  ];
  for (const t of exige) {
    if (!offreExigeLaLangue(offre("Account Manager", t), "french")) {
      failures.push("\"" + t + "\" n'est pas lu comme une exigence de francais");
    }
  }
  const mentionne = [
    "We serve the French market from London.",
    "Our French office opened in 2024.",
    "French fries are on the canteen menu.",
    "You will report to the French CEO.",
    "Experience with French GAAP is a plus.",
  ];
  for (const t of mentionne) {
    if (offreExigeLaLangue(offre("Account Manager", t), "french")) {
      failures.push(
        "\"" + t + "\" est lu comme une exigence de francais.\n" +
        "      C'est la lecon d'includes(\"account\") dans \"accounting\" : le mot est la,\n" +
        "      l'exigence n'y est pas, et la personne postule a un poste qui ne la cherche pas."
      );
    }
  }
  if (offreExigeLaLangue(offre("Account Manager", "Fluent French essential."), "german")) {
    failures.push("une annonce en francais est rendue pour une recherche en allemand");
  }

  // --- 2. LA NEGATION CONTIENT LE MOT -----------------------------------
  const formes = [
    ["This role is fully remote.", "remote"],
    ["Work from home, UK based.", "remote"],
    ["Hybrid: 3 days a week in the office.", "hybride"],
    ["This role is not remote.", "surplace"],
    ["On-site only, central London.", "surplace"],
  ];
  for (const [t, attendu] of formes) {
    const vu = formeDeTravail(offre("Account Manager", t));
    if (vu !== attendu) {
      failures.push("\"" + t + "\" est lu \"" + vu + "\" au lieu de \"" + attendu + "\"");
    }
  }
  // Quelqu'un qui veut du remote prend l'hybride. L'inverse n'est pas vrai.
  if (!passeLesFiltres(offre("x", "Hybrid, 2 days a week in the office."), { remote: "remote" })) {
    failures.push("une offre hybride est refusee a qui cherche du remote : trois jours chez soi valent mieux que rien");
  }
  if (passeLesFiltres(offre("x", "This role is not remote."), { remote: "remote" })) {
    failures.push("une offre explicitement sur place est rendue a qui cherche du remote");
  }

  // --- 3. UN FILTRE QUI NE PEUT PAS TRANCHER N'EXCLUT PAS ----------------
  const muette = offre("Account Manager", "A great role.", { salary: null });
  if (!passeLesFiltres(muette, { salaireMin: 50000 })) {
    failures.push(
      "une annonce sans salaire est ecartee par un plancher.\n" +
      "      La moitie des annonces ne le disent pas : demander 50 000 viderait la liste\n" +
      "      de ses meilleures offres sans qu'un mot le dise."
    );
  }
  if (passeLesFiltres(offre("x", "", { salary: "28000 - 32000" }), { salaireMin: 50000 })) {
    failures.push("un salaire annonce sous le plancher passe quand meme : le filtre ne filtre rien");
  }
  if (plancherAnnonce({ salary: "45k-60k" }) !== 45000) failures.push('"45k-60k" n\'est pas lu comme 45000');
  if (plancherAnnonce({ salary: "GBP 50,000" }) !== 50000) failures.push('"GBP 50,000" n\'est pas lu');
  if (plancherAnnonce({ salary: "Competitive" }) !== null) failures.push('"Competitive" devrait rendre null');
  if (plancherAnnonce({ salary: "500 per day" }) !== null) {
    failures.push("un taux journalier est compare a un plancher annuel : toutes les missions seraient refusees");
  }
  const indecis = compterLesIndecis([muette, offre("x", "", { salary: "60000" })], { salaireMin: 50000 });
  if (indecis.sansSalaire !== 1) {
    failures.push("le compte des annonces sans salaire est " + indecis.sansSalaire + " au lieu de 1 :"
      + " sans lui, la personne croit que toutes tiennent son plancher");
  }

  // Une date absente passe aussi, pour la meme raison.
  if (!passeLesFiltres(offre("x", "", { created: "" }), { depuisJours: 7 })) {
    failures.push("une annonce sans date est ecartee par un filtre de fraicheur");
  }
  const vieille = offre("x", "", { created: new Date(Date.now() - 40 * 86400000).toISOString() });
  if (passeLesFiltres(vieille, { depuisJours: 7 })) failures.push("une annonce de 40 jours passe un filtre de 7 jours");

  // --- 4. LE CONTRAT ET LE NIVEAU ---------------------------------------
  if (typeDeContrat(offre("x", "A full-time internship in our London office.")) !== "stage") {
    failures.push("\"full-time internship\" est lu comme un CDI : l'ordre des motifs compte");
  }
  if (typeDeContrat(offre("x", "6 month fixed-term contract.")) !== "mission") {
    failures.push("un CDD n'est pas lu comme une mission");
  }
  if (niveauDuPoste(offre("Head of Partnerships", "")) !== "lead") failures.push("\"Head of\" n'est pas un niveau lead");
  if (niveauDuPoste(offre("Account Manager", "You will work with senior stakeholders and report to the Head of Sales.")) !== "confirme") {
    failures.push(
      "le niveau est lu dans le corps de l'annonce.\n" +
      "      Toute annonce dit \"senior stakeholders\" et \"report to the Head of\" :\n" +
      "      le niveau du poste est dans son intitule, pas dans sa prose."
    );
  }

  // --- 5. CE QUE LE MODELE REND EST RAMENE DANS LES CLOUS ----------------
  const { filtres, lu } = filtresDepuisLeModele({
    what: " Account Manager ", where: "London", country: "GB",
    langue: "french", remote: "n'importe quoi", contrat: "cdi",
    salaireMin: "55000", depuisJours: -3, seniorite: "inconnu",
    lu: "Postes de gestion de comptes a Londres qui exigent le francais.",
  });
  if (filtres.what !== "Account Manager") failures.push("l'intitule n'est pas nettoye");
  if (filtres.country !== "gb") failures.push("le pays n'est pas ramene en minuscules");
  if (filtres.remote !== "") {
    failures.push("une valeur hors enumeration est gardee : le filtre n'accepterait plus aucune offre");
  }
  if (filtres.seniorite !== "") failures.push("un niveau inconnu est garde");
  if (filtres.salaireMin !== 55000) failures.push("un nombre en chaine n'est pas lu");
  if (filtres.depuisJours !== 0) failures.push("un nombre negatif de jours n'est pas ramene a zero");
  if (!lu) failures.push("la phrase comprise n'est pas rendue : l'ecran ne peut rien montrer a corriger");
  const { filtres: vide } = filtresDepuisLeModele(null);
  if (vide.what !== "" || vide.country !== "gb") {
    failures.push("une reponse vide du modele ne donne pas une recherche vide mais une exception");
  }

  // --- 6. LA REQUETE FAIT L'ALLER ET LE RETOUR --------------------------
  const params = parametresDeRecherche(filtres, 3);
  if (params.get("page") !== "3") failures.push("la page n'est pas transmise");
  if (params.get("langue") !== "french") failures.push("la langue exigee n'est pas transmise a la route");
  if (params.has("remote")) failures.push("un filtre vide est transmis : la route le lirait comme une exigence");
  const retour = filtresDepuisLesParametres(params);
  for (const cle of ["what", "where", "country", "langue", "contrat", "salaireMin"]) {
    if (String(retour[cle]) !== String(filtres[cle])) {
      failures.push("le filtre \"" + cle + "\" ne survit pas a l'aller-retour (" + retour[cle] + ")");
    }
  }
  const injecte = filtresDepuisLesParametres(new URLSearchParams({ langue: "'; DROP--", seniorite: "x" }));
  if (injecte.langue !== "" || injecte.seniorite !== "") {
    failures.push("une valeur inventee dans l'adresse devient un filtre");
  }

  // --- 7. AUCUNE EXIGENCE, AUCUN FILTRE ---------------------------------
  if (filtresActifs({ ...FILTRES_VIDES, what: "x", where: "y" }).length) {
    failures.push("l'intitule et la ville comptent comme des exigences : le panneau s'afficherait toujours actif");
  }
  if (!passeLesFiltres(offre("Anything", "Anything at all."), {})) {
    failures.push("sans aucune exigence, une offre est ecartee");
  }

  // --- 8. LA CONSIGNE DIT AU MODELE DE NE RIEN AJOUTER ------------------
  const consigne = consigneDeRecherche("a French speaking role in London", "en");
  if (!/do not invent/i.test(consigne) || !/silence/i.test(consigne)) {
    failures.push(
      "la consigne n'interdit pas d'ajouter une exigence que la personne n'a pas dite.\n" +
      "      Un filtre invente retire des offres sans qu'un mot le dise, et c'est la\n" +
      "      panne que ce depot connait le mieux."
    );
  }
  if (!SCHEMA_RECHERCHE.required.includes("lu")) {
    failures.push("le schema ne rend pas obligatoire la phrase comprise : l'ecran n'aurait rien a montrer");
  }

  if (!failures.length) {
    console.log("      une phrase devient des exigences, le francais exige se distingue du francais"
      + " mentionne, et une annonce muette n'est jamais ecartee en silence");
  }
  return failures;
}
