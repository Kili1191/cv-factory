// Le diagnostic distingue ce qu'on vous a confie de ce que vous avez obtenu.
//
// POURQUOI CET AXE EXISTE
//
// C'est la difference qui decide d'un rappel. "Responsable du bar" dit le
// perimetre : n'importe qui ayant tenu ce poste pourrait l'ecrire, et un
// recruteur le verifie sur une fiche de poste. "Marge boissons tenue a 78%"
// dit ce qui a change parce que la personne etait la, et ne se verifie
// qu'aupres d'elle.
//
// CE QUE LES DEUX CONTROLES PRECEDENTS RATAIENT
//
// Le diagnostic comptait la presence d'un chiffre et les debuts de puce en
// forme de fiche de poste. Les deux sont utiles, aucun ne suffit :
//
//   "Encadre une equipe de 12 sur quatre points de vente"
//
// porte un chiffre, ne commence pas par une formule plate, et passait donc
// les deux. Elle ne dit pourtant aucun resultat : 12 et 4 mesurent le
// perimetre confie, pas ce qui en est advenu. Un chiffre de perimetre n'est
// pas un chiffre de resultat, et c'est tout l'objet de cet axe.
//
// LE CONSEIL DOIT CITER LA PHRASE
//
// "Montre des resultats" se relit et s'oublie : personne ne sait laquelle de
// ses puces est visee ni ce qu'il faudrait y ajouter. Le conseil cite donc la
// puce concernee, dit ce qu'elle raconte aujourd'hui, et nomme ce qui manque.
// Ce test l'exige, parce qu'un conseil general est exactement ce vers quoi on
// derive quand on simplifie.

import { diagnostiquer } from "../lib/diagnostic.js";
import { etatDeLaPuce } from "../lib/resultatOuResponsabilite.js";

const CV = (puces) => ({
  name: "Kilian Maisonnette", title: "Bar Manager",
  email: "k@example.com", phone: "07000", location: "London",
  experience: [{ id: 1, title: "Bar Manager", company: "Taj Exotica",
                 period: "2025 - 2026", bullets: puces }],
  education: [], skills: ["Bar"], languages: [], certifications: [],
});

// Les cas qui comptent, pris dans les metiers que Nuvi vise.
const CAS = [
  // Un perimetre, chiffre ou non : ce n'est pas un resultat.
  ["Responsible for the bar", "responsabilite"],
  ["Led and trained a team of 20 across four outlets", "responsabilite"],
  ["Ran tills, cash-up and daily takings", "responsabilite"],
  ["Servi 200 couverts par service", "responsabilite"],
  ["Accompagne 14 residents au quotidien", "responsabilite"],
  ["Encadre une equipe de 12 sur quatre points de vente", "responsabilite"],
  // Un deplacement mesure : un resultat.
  ["Maintained beverage gross profit at 78% through tight stock control", "resultat"],
  ["Grew the deli from 5 regular guests to 120 in five months", "resultat"],
  ["Cut food waste 25% through portion control", "resultat"],
  ["Delivered 140 parcels a day with a 99.2% first-time rate", "resultat"],
  ["Economise 8000 euros par an sur les achats", "resultat"],
  ["Fait passer le deli de 5 a 120 clients en cinq mois", "resultat"],
  // Un resultat annonce sans preuve : ni l'un ni l'autre.
  ["Improved the service", "indetermine"],
  ["Helped improve the business", "indetermine"],
  ["Ameliore la satisfaction client", "indetermine"],
];

export async function run() {
  const failures = [];

  // 1. Le classement, puce par puce.
  for (const [texte, attendu] of CAS) {
    const { etat } = etatDeLaPuce(texte);
    if (etat !== attendu) {
      failures.push(
        `"${texte}" est classe "${etat}" au lieu de "${attendu}".`
        + (attendu === "responsabilite" && etat === "resultat"
          ? " Un chiffre de perimetre est pris pour un chiffre de resultat :"
            + " le CV sera note trop haut, et la personne ne corrigera rien."
          : "")
      );
    }
  }

  // 2. LE PIEGE HISTORIQUE : la comparaison sur des sous-chaines.
  //    "Servi 200 couverts" passait pour un resultat parce que "couverts"
  //    contient "ouvert". Le mot le plus banal du metier vise devenait une
  //    preuve de reussite.
  if (etatDeLaPuce("Servi 200 couverts par service").etat === "resultat") {
    failures.push(
      "\"couverts\" est encore lu comme le verbe \"ouvert\" : la comparaison "
      + "se fait sur des sous-chaines et non sur des mots entiers. C'est le "
      + "meme defaut qui faisait passer SQL pour un intitule de rubrique."
    );
  }

  // 3. Trois CV, trois notes qui doivent se separer nettement.
  const duties = diagnostiquer(CV([
    "Oversaw bar, beverage and events operations across four outlets",
    "Led and trained a team of 20",
    "Ran tills, cash-up and daily takings",
  ]), "en").scores.find((s) => s.id === "achievements");
  const claimed = diagnostiquer(CV([
    "Improved the service", "Helped improve the business", "Reduced complaints",
  ]), "en").scores.find((s) => s.id === "achievements");
  const proven = diagnostiquer(CV([
    "Maintained beverage gross profit at 78% through tight stock control",
    "Grew the deli from 5 regular guests to 120 in five months",
    "Cut food waste 25% through portion control",
  ]), "en").scores.find((s) => s.id === "achievements");

  if (!(proven.score > claimed.score && claimed.score > duties.score)) {
    failures.push(
      `les trois CV ne se separent pas : responsabilites ${duties.score}, `
      + `resultats annonces ${claimed.score}, resultats mesures ${proven.score}. `
      + "Un axe qui ne distingue pas ces trois-la ne sert a rien."
    );
  }

  // 4. Le conseil cite la puce de la personne, dans les deux langues.
  for (const langue of ["en", "fr"]) {
    const a = diagnostiquer(CV([
      "Oversaw bar, beverage and events operations across four outlets",
      "Led and trained a team of 20",
    ]), langue).scores.find((s) => s.id === "achievements");
    if (!/Oversaw bar/.test(a.reco)) {
      failures.push(
        `[${langue}] le conseil ne cite pas la puce visee : "${a.reco}". `
        + "Un conseil general se relit et s'oublie, parce que personne ne sait "
        + "laquelle de ses puces est concernee."
      );
    }
    // Et il dit POURQUOI, pas seulement quoi.
    if (!/what came of it|ce qui en est sorti/.test(a.reco)) {
      failures.push(
        `[${langue}] le conseil ne dit pas pourquoi la puce ne suffit pas. `
        + "Sans la raison, on obtient une consigne a suivre au lieu d'une "
        + "chose comprise, et elle ne se transpose pas aux autres puces."
      );
    }
  }

  // 5. Un axe reussi doit dire quelque chose. Sans entree dans la table des
  //    axes deja bons, la phrase valait undefined et le tableau affichait un
  //    vide, ce qui se lit comme une panne.
  for (const langue of ["en", "fr"]) {
    const a = diagnostiquer(CV([
      "Cut food waste 25% through portion control",
      "Grew the deli from 5 regular guests to 120 in five months",
    ]), langue).scores.find((s) => s.id === "achievements");
    if (!a.reco || /undefined/.test(String(a.reco))) {
      failures.push(`[${langue}] un axe a ${a.score}/100 ne dit rien : "${a.reco}".`);
    }
  }

  if (!failures.length) {
    console.log(
      `      ${CAS.length} puces classees, les trois CV se separent `
      + `(${duties.score} / ${claimed.score} / ${proven.score}), et le conseil `
      + "cite la puce visee en disant pourquoi elle ne suffit pas"
    );
  }
  return failures;
}
