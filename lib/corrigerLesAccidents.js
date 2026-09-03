// Corriger ce qui peut l'etre sans demander a personne.
//
// LE BOUTON QUI MENTAIT
//
// Le controle avant telechargement affichait la liste des defauts et un
// bouton "Corriger d'abord". Kilian l'a clique. Il ne s'est rien passe : le
// bouton refermait le panneau et rendait la main, en supposant que la
// personne irait corriger elle-meme. Un bouton qui s'appelle "Corriger" et
// qui ne corrige rien est pire qu'un bouton absent : il promet, et il laisse
// la personne devant le meme document, en lui ayant pris un clic.
//
// CE QUI SE CORRIGE TOUT SEUL, ET CE QUI NE SE CORRIGE PAS
//
// Les defauts que lib/leCvEstIlPresentable.js releve sont des ACCIDENTS de
// structure, et la plupart ont une correction qui ne demande aucun jugement :
// un separateur orphelin se retire, un tiret long se remplace, une
// certification qui n'est qu'une annee se supprime, une puce recopiee se
// dedouble, une annee doublee dans un diplome se retire de l'intitule. Aucune
// de ces corrections n'invente un mot : elle enleve ce qui n'aurait jamais du
// etre la.
//
// D'autres demandent une decision ou une redaction : un nom d'ecole qui est
// une phrase (ou est le vrai nom ?), un poste sans aucune ligne (que faire
// dire a ce poste ?), un CV qui deborde d'une page (que couper ?). Ceux-la
// ne se corrigent pas ici. Ils restent dans la liste, avec la raison, et le
// modele ou la personne s'en chargent.
//
// La fonction rend les deux : ce qu'elle a corrige, nomme, et ce qui reste.
// L'ecran affiche l'un et l'autre, parce qu'une correction silencieuse dans
// un CV est exactement ce que ce produit promet de ne jamais faire.

import { nettoyerUnChamp, estUneCoquille } from "./nettoyerLesChamps.js";
import { anneeEnFin, ANNEE_EN_FIN } from "./leCvEstIlPresentable.js";

const texte = (v) => String(v == null ? "" : v).trim();

export function corrigerLesAccidents(cv) {
  const corriges = [];
  if (!cv || typeof cv !== "object") return { cv, corriges };

  const note = (ou, avant, apres) => corriges.push({
    ou, avant: texte(avant).slice(0, 80), apres: texte(apres).slice(0, 80) });

  // Un champ : separateurs orphelins et tirets longs. On ne note que ce qui
  // a change, pour que la liste dise la verite.
  const champ = (v, ou) => {
    const avant = texte(v);
    if (!avant) return v;
    const apres = nettoyerUnChamp(avant);
    if (apres !== avant) note(ou, avant, apres);
    return apres;
  };

  const out = { ...cv };
  out.name = champ(cv.name, "nom");
  out.title = champ(cv.title, "intitule du CV");

  // EXPERIENCES : champs, puces recopiees.
  const vues = new Set();
  out.experience = (Array.isArray(cv.experience) ? cv.experience : []).map((e, i) => {
    const ou = "experience " + (i + 1);
    const puces = [];
    for (const b of (Array.isArray(e.bullets) ? e.bullets : [])) {
      const s = texte(b);
      if (!s) continue;
      const cle = s.toLowerCase();
      if (s.length >= 15 && vues.has(cle)) {
        note(ou + ", puce recopiee", s, "");
        continue;
      }
      vues.add(cle);
      puces.push(champ(s, ou + ", puce"));
    }
    return {
      ...e,
      title: champ(e.title, ou + ", intitule"),
      company: champ(e.company, ou + ", employeur"),
      location: champ(e.location, ou + ", lieu"),
      bullets: puces,
    };
  });

  // FORMATIONS : champs, et l'annee doublee dans l'intitule.
  out.education = (Array.isArray(cv.education) ? cv.education : []).map((e, i) => {
    const ou = "formation " + (i + 1);
    // Les tirets longs d'abord : "(expected 2026) (cadratin) 2026" ne se
    // reconnait qu'une fois le tiret ramene a une forme connue. La regle de
    // fin d'intitule est celle du detecteur, importee et pas recopiee.
    let degree = nettoyerUnChamp(texte(e.degree));
    const an = texte(e.period).match(/\d{4}/);
    if (an && anneeEnFin(degree, an[0])) {
      const sans = nettoyerUnChamp(degree.replace(ANNEE_EN_FIN(an[0]), ""));
      if (sans && sans !== degree) { note(ou + ", annee doublee", degree, sans); degree = sans; }
    }
    return {
      ...e,
      degree: champ(degree, ou + ", diplome"),
      school: champ(e.school, ou + ", etablissement"),
    };
  });

  // CERTIFICATIONS ET COMPETENCES : les coquilles partent.
  const liste = (arr, nom) => (Array.isArray(arr) ? arr : []).filter((c) => {
    if (estUneCoquille(c)) { note(nom, c, ""); return false; }
    return true;
  }).map((c, i) => champ(c, nom + " " + (i + 1)));
  out.certifications = liste(cv.certifications, "certification");
  out.skills = liste(cv.skills, "competence");

  // LANGUES : un niveau sans langue ne dit rien.
  out.languages = (Array.isArray(cv.languages) ? cv.languages : []).filter((l) => {
    if (l && !texte(l.lang) && texte(l.level)) { note("langue", l.level, ""); return false; }
    return true;
  });

  return { cv: out, corriges };
}
