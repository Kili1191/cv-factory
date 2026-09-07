// THE SHAPE OF A CV, IN ONE PLACE
//
// Every CV in the product passes through normCV, whatever door it came
// in by: the local reader, the model, a restore from the account, a
// version, a template. The empty CV, the cleaning of a tree returned by
// the model and the structure line handed to the model in prompts all
// describe the same shape, and they lived as four private copies at the
// top of a 10,000-line component. A field added to one and forgotten in
// another would be silently dropped at the next import. Here the prompt
// structure is derived from the empty CV, so there is one definition.

import { nettoyerUnChamp, estUneCoquille } from "./nettoyerLesChamps.js";

export const EMPTY = {
  name:"", title:"", email:"", phone:"",
  location:"", linkedin:"", summary:"",
  experience:[{id:1,title:"",company:"",period:"",location:"",bullets:["",""]}],
  education:[{id:1,degree:"",school:"",period:""}],
  skills:["","","","","","","",""],
  languages:[{lang:"",level:""},{lang:"",level:""}],
  certifications:[""],
  labels: {},
};

// Long dashes are the visual signature of machine-written text (rule one
// of the repo). Anything the model returns goes through here.
export function san(t) {
  if (typeof t !== "string") return t;
  return t
    .split("\u2014").join("-")  // em dash
    .split("\u2013").join("-")  // en dash
    .split("\u2015").join("-")  // horizontal bar
    .split("\u2012").join("-")  // figure dash
    .split("\u2010").join("-")  // hyphen
    .split("\u2011").join("-"); // non-breaking hyphen
}

// Recursively sanitize all string values in an object / array tree.
// Used to clean CV / Pack / Audit results returned from the AI.
export function sanDeep(v) {
  if (typeof v === "string") return san(v);
  if (Array.isArray(v)) return v.map(sanDeep);
  if (v && typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v)) out[k] = sanDeep(v[k]);
    return out;
  }
  return v;
}

/**
 * The STRUCTURE line of the import and rewrite prompts: the empty CV with
 * one element per list, without the user's own section labels (the model
 * does not name sections). Derived, so a field added to EMPTY reaches the
 * model without anyone remembering a second string.
 */
export function structureDuCv() {
  const une = (a) => (Array.isArray(a) && a.length ? [a[0]] : []);
  const { labels, ...reste } = EMPTY;
  const forme = {};
  for (const k of Object.keys(reste)) forme[k] = Array.isArray(reste[k]) ? une(reste[k]) : reste[k];
  return JSON.stringify(forme);
}

export function normCV(raw, base=EMPTY) {
  // [Fix 2026-05-19] Filtre les null/undefined du raw pour qu'ils
  // n'override pas les defaults vides de base via spread.
  // Sinon "name": null peut donner cvIsEmpty = true en boucle.
  //
  // LE NETTOYAGE SE FAIT ICI, PARCE QU'ICI TOUT PASSE
  //
  // san() retire les cadratins depuis longtemps, et sanDeep() l'applique a
  // tout un arbre. Mais sanDeep n'etait appele que dans parseJSON, donc
  // uniquement sur les reponses du modele. Le lecteur local lit un CV colle
  // sans rien demander a personne : c'est le chemin le plus frequent du
  // produit, celui que le CLAUDE.md decrit comme prioritaire parce qu'il est
  // instantane et gratuit, et il ne passait par aucun nettoyage.
  //
  // Resultat, vu sur le CV de Kilian en production : "Account Manager -",
  // avec un cadratin, dans le document que lira le recruteur. La regle
  // numero un du depot, enfreinte a l'endroit exact qu'elle nomme. Word met
  // ces tirets tout seul et la plupart des CV bien mis en page ecrivent
  // "Account Manager (cadratin) Stenn International" : la porte la moins
  // chere etait celle par laquelle ils entraient tous.
  //
  // normCV est le passage oblige de TOUT CV, quelle que soit la porte :
  // lecture locale, modele, restauration depuis le compte, reprise apres
  // mesure. Un nettoyage pose ici couvre celles d'aujourd'hui et celles que
  // personne n'a encore ecrites.
  const ns = v => nettoyerUnChamp(typeof v==="string" ? v : (v==null ? "" : String(v)));
  const cleanRaw = {};
  if (raw && typeof raw === "object") {
    for (const k in raw) {
      // Garde uniquement les valeurs non-nulles (sauf arrays explicites)
      if (raw[k] != null) cleanRaw[k] = raw[k];
    }
  }
  return {
    ...base, ...cleanRaw,
    // Force tous les champs strings a etre des strings (jamais null)
    name: ns(cleanRaw.name || base.name),
    title: ns(cleanRaw.title || base.title),
    summary: ns(cleanRaw.summary || base.summary),
    email: ns(cleanRaw.email || base.email),
    phone: ns(cleanRaw.phone || base.phone),
    location: ns(cleanRaw.location || base.location),
    linkedin: ns(cleanRaw.linkedin || base.linkedin),
    skills:(Array.isArray(cleanRaw.skills)?cleanRaw.skills:[]).map(ns),
    languages:(Array.isArray(cleanRaw.languages)?cleanRaw.languages:[]).map(
      l=>({lang:ns(l && l.lang), level:ns(l && l.level)})
    ),
    // UNE ENTREE QUI N'EST QU'UNE DATE N'EST PAS UNE ENTREE
    //
    // Le CV de Kilian affichait une section CERTIFICATIONS dont l'unique
    // element etait "2023". Le lecteur avait decoupe une ligne au mauvais
    // endroit et garde l'annee toute seule. Un recruteur y lit de la
    // negligence, et un analyseur y lit une certification qui s'appellerait
    // "2023". Mieux vaut une section absente qu'une section qui ment.
    certifications:(Array.isArray(cleanRaw.certifications)?cleanRaw.certifications:[])
      .map(ns).filter(c => !estUneCoquille(c)),
    experience:(Array.isArray(cleanRaw.experience)?cleanRaw.experience:[]).map(
      (e,i)=>({
        ...e, id:i+1,
        title: ns(e && e.title),
        company: ns(e && e.company),
        period: ns(e && e.period),
        location: ns(e && e.location),
        bullets:(Array.isArray(e && e.bullets)?e.bullets:[]).map(ns),
      })
    ),
    education:(Array.isArray(cleanRaw.education)?cleanRaw.education:[]).map(
      (e,i)=>({
        ...e, id:i+1,
        degree: ns(e && e.degree),
        school: ns(e && e.school),
        period: ns(e && e.period),
      })
    ),
  };
}
