// LE TROISIEME TIERS DE LA FORMULE
//
// Kilian, le 6 octobre 2026 : "et la technique XYZ de Google ?" Celle de
// Laszlo Bock, son ancien patron des RH : "Accomplished [X] as measured by
// [Y], by doing [Z]."
//
// Nuvi faisait X et Y, et faisait Y mieux que la formule : "as measured by"
// ne distingue pas un chiffre de perimetre d'un chiffre de resultat, et
// c'est exactement la que la plupart des puces en XYZ se trompent, en
// remplissant le Y avec "equipe de 12".
//
// Le Z manquait. C'est lui qui rend une puce defendable : en entretien on
// est interroge sur le comment, pas sur le chiffre. "Retention au-dessus de
// 85%" se recite ; la meme avec "grace a un suivi structure du portefeuille"
// se raconte.
//
// CE QUE CE TEST REFUSE, AUTANT QUE CE QU'IL DEMANDE
//
// Un "by" n'est pas toujours un comment. "reducing time to first transaction
// by 30 percent" porte une quantite, et si cette forme comptait, toute puce
// chiffree se declarerait pourvue d'une methode : le signalement ne
// vaudrait plus rien.
//
// Et le comment ne doit pas devenir un quatrieme etat ni peser sur la note.
// Un resultat sans methode reste un resultat ; le sanctionner pousserait a
// rallonger chaque puce d'un "en faisant X", donc a deborder de la page, qui
// est la regle du proprietaire.

import { readFileSync } from "node:fs";
import { diraitComment, etatDeLaPuce, compterLesPuces } from "../lib/resultatOuResponsabilite.js";
import { diagnostiquer } from "../lib/diagnostic.js";

const AVEC = [
  "Maintained client retention above 85 percent through structured pipeline management",
  "Cut waste from 8% to 3% by rebuilding the stock count",
  "Marge boissons tenue a 78% en resserrant les pertes",
  "Augmente les ventes grace a un suivi mensuel du portefeuille",
  "Grew revenue 20% by introducing a weekly pipeline review",
  "Reduced churn using a monthly health check on every account",
];

const SANS = [
  // Le piege : "by" suivi d'une quantite. Si celle-ci passait, toute puce
  // chiffree se declarerait pourvue d'une methode.
  "Developed and onboarded 60 SME clients, reducing time to first transaction by 30 percent",
  "Reduced costs by 25%",
  "Grew ARR from 1M to 4M",
  "Managed a team of 12 across four sites",
  "Led client review meetings with SME directors",
  "Erreurs de picking divisees par trois en six mois",
];

export async function run() {
  const failures = [];

  // --- 1. LE COMMENT EST RECONNU, DANS LES DEUX LANGUES -----------------
  for (const p of AVEC) {
    if (!diraitComment(p)) {
      failures.push("le comment n'est pas vu dans : \"" + p.slice(0, 72) + "\"");
    }
  }

  // --- 2. ET UNE QUANTITE N'EN EST PAS UN -------------------------------
  for (const p of SANS) {
    if (diraitComment(p)) {
      failures.push(
        "une methode est annoncee dans une puce qui n'en porte aucune :\n" +
        "      \"" + p.slice(0, 72) + "\"\n" +
        "      Si \"by 30 percent\" compte, toute puce chiffree se declare pourvue d'une methode."
      );
    }
  }

  // --- 3. LE PIEGE QUI A FAIT ECHOUER LA PREMIERE VERSION ---------------
  //
  // Le retrait des quantites avalait le mot suivant : "a 78% en resserrant"
  // perdait son "en", et la methode disparaissait sur une puce qui en avait
  // une. Ce cas merite sa ligne parce qu'il est invisible sur les autres.
  if (!diraitComment("Marge tenue a 78% en resserrant les pertes")) {
    failures.push(
      "le retrait des quantites emporte le mot qui suit le chiffre.\n" +
      "      \"a 78% en resserrant\" perd son \"en\", et la methode avec."
    );
  }

  // --- 4. CE N'EST PAS UN QUATRIEME ETAT --------------------------------
  const sansMethode = etatDeLaPuce("Grew ARR from 1M to 4M");
  if (sansMethode.etat !== "resultat") {
    failures.push("un resultat sans methode n'est plus un resultat (\"" + sansMethode.etat + "\")");
  }
  if (sansMethode.comment !== false) failures.push("le comment est annonce sur une puce qui n'en a pas");
  const avecMethode = etatDeLaPuce("Cut waste from 8% to 3% by rebuilding the stock count");
  if (avecMethode.etat !== "resultat" || avecMethode.comment !== true) {
    failures.push("une puce complete n'est pas rendue comme un resultat avec son comment");
  }

  // --- 5. LE COMPTE REMONTE, SANS TOUCHER A LA NOTE ---------------------
  const c = compterLesPuces([...AVEC, ...SANS]);
  if (c.sansComment !== 3) {
    failures.push("le compte des resultats sans methode vaut " + c.sansComment + " au lieu de 3 : "
      + JSON.stringify({ resultat: c.resultat, indetermine: c.indetermine, responsabilite: c.responsabilite }));
  }
  if (!c.exemples.sansComment) {
    failures.push("aucun exemple de resultat sans methode : un conseil qui ne cite pas la phrase de la personne se relit et s'oublie");
  }

  const cvA = { name: "A", title: "T", email: "a@b.c", phone: "1", location: "London",
    summary: "x", skills: ["a","b","c","d","e"],
    experience: [{ title: "T", company: "C", period: "2020 - 2024", bullets: AVEC.slice(0, 3) }],
    education: [], languages: [], certifications: [] };
  const cvB = { ...cvA, experience: [{ ...cvA.experience[0],
    // Les memes resultats, prives de leur methode : la note ne doit pas bouger.
    bullets: AVEC.slice(0, 3).map((b) => b.replace(/\s+(?:through|by|en|grace a)\s.*$/i, "")) }] };
  const a = diagnostiquer(cvA, "en");
  const b = diagnostiquer(cvB, "en");
  const axeA = (a.scores || []).find((x) => x.id === "achievements");
  const axeB = (b.scores || []).find((x) => x.id === "achievements");
  if (!axeA || !axeB) {
    failures.push("l'axe des resultats n'existe plus dans le diagnostic");
  } else {
    if (axeA.score !== axeB.score) {
      failures.push(
        "retirer le comment change la note (" + axeB.score + " au lieu de " + axeA.score + ").\n" +
        "      Sanctionner l'absence de methode pousse a rallonger chaque puce, donc a deborder\n" +
        "      de la page, qui est la regle du proprietaire."
      );
    }
    if (typeof axeA.fait.sansComment !== "number") {
      failures.push("le diagnostic ne remonte pas le compte des resultats sans methode : rien ne peut le dire");
    }
  }

  // --- 6. LA CONSIGNE PORTE SES DEUX GARDES -----------------------------
  //
  // Demander le comment sans interdire de l'inventer donne une methode
  // fabriquee, c'est-a-dire un piege a la premiere question d'entretien.
  const consigne = readFileSync(new URL("../app/components/MatchPanel.jsx", import.meta.url).pathname, "utf8");
  if (!/LE COMMENT/.test(consigne)) {
    failures.push("la consigne d'adaptation ne demande pas le comment");
  }
  if (!/N'en invente JAMAIS/.test(consigne)) {
    failures.push(
      "la consigne demande le comment sans interdire de l'inventer.\n" +
      "      Une methode fabriquee est un piege a la premiere question d'entretien."
    );
  }
  if (!/tenir sur sa\s*\"?\s*\+?\s*\"?\s*page/.test(consigne.replace(/\s+/g, " "))) {
    failures.push("la consigne ne rappelle pas que le CV doit tenir sur sa page : le comment sur chaque puce la fait deborder");
  }

  if (!failures.length) {
    console.log("      le comment est vu dans les deux langues, une quantite n'en est pas un, "
      + "et son absence se dit sans peser sur la note");
  }
  return failures;
}
