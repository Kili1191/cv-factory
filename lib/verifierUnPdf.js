// WHAT A SCREENING TOOL SEES, READING NOTHING BUT THE FILE
//
// The product told people their download had been re-checked against three
// real parsers. It had not: the module doing that comparison was imported by
// tests only. The owner used that sentence to reassure himself, found out
// nothing verified, and stopped believing the rest. A promise of verification
// stops doubt instead of informing it.
//
// This module exists so the check runs where the person can watch it.
//
// WHY THIS IS NOT A WEAKER TEST THAN THE ONE IN CI
//
// lib/atsVendors.js compares the extracted text against the CV as the app
// holds it. That truth is what makes silent LOSS visible: a field present in
// your data and absent from the file. It only exists for a CV the app built.
//
// A real screening tool never has that truth. It receives a file and nothing
// else. So reading the file alone is not an approximation of the real test,
// it IS the real test, and it is the only one that can run on a PDF somebody
// uploads. What it cannot do is prove nothing was lost on the way in, because
// there is no "before" to compare against. That limit is stated on screen
// rather than papered over.
//
// The checks are the ones from lib/atsVendors.js, minus the two that need the
// truth, restated as "did the parser find anything at all":
//   - a name, an email, a phone number
//   - section headings it recognises
//   - a readable period on each job
//   - at least one employer
//   - the name before the contact block, not after it
//
// The vendor profiles keep their own exige/tolere lists, so the verdict a
// person reads here is built the same way as the one the test suite checks.

import { parseResume, fold } from "./atsParser.js";
import { lireUnCv } from "./lireUnCv.js";
import { PROFILS } from "./atsVendors.js";

// DEUX LECTEURS, PARCE QUE LES VRAIS ANALYSEURS NE SE RESSEMBLENT PAS
//
// parseResume est volontairement strict : il cherche ce qu'un analyseur
// prudent cherche, et abandonne ce qu'il ne sait pas ranger. Il rend le nom,
// l'adresse, le telephone et les rubriques qu'il reconnait, mais il ne separe
// jamais l'employeur du poste : pour lui un bloc d'experience est du texte.
//
// lireUnCv est le lecteur structurel de l'application : il decoupe les blocs
// et rend un poste, un employeur, une periode. Sur le meme texte il retrouve
// "Senior Product Manager" chez "Acme SaaS" en "2021 - 2024" la ou le premier
// ne voit qu'une suite de mots.
//
// On se sert des deux, chacun pour ce qu'il sait faire, et l'ecart entre eux
// n'est pas un defaut : c'est exactement ce qui separe deux ATS reels sur le
// meme fichier.

// Under this, there is no document to judge: the file carries an image and no
// text layer, which is the failure that looks perfect on screen and arrives
// blank at the parser. 120 characters is roughly a name, an email and a line.
const TROP_COURT = 120;

function periodeLisible(t) {
  const s = String(t || "");
  // Deux reperes, comme un analyseur : soit deux annees, soit un mois et une
  // annee. "Depuis toujours" n'en est pas un.
  return /(19|20)\d{2}\D{0,12}((19|20)\d{2}|present|actuel|now|today|aujourd)/i.test(s)
    || /(janv|fevr|mars|avril|mai|juin|juil|aout|sept|octo|nove|dece|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s*(19|20)\d{2}/i.test(s);
}

/**
 * Reads an uploaded CV the way a screening tool does, from the file alone.
 *
 * @param {string} texte the text extracted from the PDF, as a parser got it
 * @returns {{lisible: boolean, texte: string, champs: object, profils: Array,
 *            pire: object|null, parsed: object}}
 */
export function verifierUnPdf(texte) {
  const brut = String(texte || "");
  const nu = brut.replace(/\s+/g, " ").trim();
  const parsed = parseResume(brut);

  // LE CAS QUI COMPTE LE PLUS, ET QUI SE VOIT LE MOINS
  //
  // Un PDF fabrique a partir d'une image, ou exporte sans couche de texte,
  // s'affiche parfaitement et arrive vide. Personne ne le remarque en le
  // regardant : c'est exactement pour ce cas que cet outil existe.
  if (nu.length < TROP_COURT) {
    return {
      lisible: false,
      texte: brut,
      caracteres: nu.length,
      champs: {},
      profils: PROFILS.map((p) => ({ id: p.id, nom: p.nom, passe: false,
        bloquants: [{ quoi: "texte", fait: "aucun texte a lire" }], degradations: [] })),
      pire: null,
      parsed,
    };
  }

  const structure = lireUnCv(brut);
  const postes = ((structure && structure.cv && structure.cv.experience) || [])
    .filter(Boolean);
  const sansDate = postes.filter((e) => !periodeLisible(e.period || ""));
  const employeurs = postes.filter((e) => (e.company || "").trim());
  const rubriques = (parsed.sectionsFound || []).filter(Boolean);

  const posNom = parsed.name ? fold(nu).indexOf(fold(parsed.name)) : -1;
  const posContact = fold(nu).search(/\bcontact\b/);

  const champs = {
    nom: {
      ok: !!parsed.name,
      fait: parsed.name ? 'lu comme "' + parsed.name + '"' : "aucun nom retrouve",
    },
    email: {
      ok: !!parsed.email,
      fait: parsed.email || "aucune adresse lisible",
    },
    telephone: {
      ok: !!parsed.phone,
      fait: parsed.phone || "aucun numero lisible",
    },
    rubriques: {
      ok: rubriques.length >= 2,
      fait: rubriques.length
        ? rubriques.length + " rubrique(s) reconnue(s) : " + rubriques.join(", ")
        : "aucune rubrique reconnue",
    },
    dates: {
      ok: postes.length > 0 && sansDate.length === 0,
      fait: postes.length
        ? (postes.length - sansDate.length) + " poste(s) sur " + postes.length
          + " avec une periode lisible"
        : "aucun poste retrouve",
    },
    employeurs: {
      ok: employeurs.length > 0,
      fait: employeurs.length
        ? employeurs.length + " employeur(s) retrouve(s)"
        : "aucun employeur retrouve",
    },
    ordre: {
      ok: posNom >= 0 && (posContact < 0 || posNom < posContact),
      fait: posNom < 0
        ? "le nom n'apparait pas dans le texte extrait"
        : (posContact >= 0 && posNom > posContact
          ? "le texte commence par le bloc contact, le nom arrive apres"
          : "le nom vient en premier"),
    },
  };

  const profils = PROFILS.map((p) => {
    const durs = p.exige.filter((k) => champs[k] && !champs[k].ok);
    const souples = p.tolere.filter((k) => champs[k] && !champs[k].ok);
    return {
      id: p.id,
      nom: p.nom,
      passe: durs.length === 0,
      bloquants: durs.map((k) => ({ quoi: k, fait: champs[k].fait })),
      degradations: souples.map((k) => ({ quoi: k, fait: champs[k].fait })),
    };
  });

  // Le plus severe qui echoue : le corriger fait passer les autres.
  const pire = profils.find((p) => !p.passe) || null;

  return { lisible: true, texte: brut, caracteres: nu.length, champs, profils, pire,
           parsed, postes };
}
