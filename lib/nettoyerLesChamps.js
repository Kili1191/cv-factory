// Ce qu'un champ de CV ne doit jamais porter, quelle que soit la porte.
//
// LE DEFAUT, VU SUR SON PROPRE CV
//
// Une capture de thenuvi.com/app, le CV de Kilian a l'ecran :
//
//     Client Relationship Manager
//     Private Clients (cadratin) . UAE
//     Account Manager (cadratin)
//     Customer Service Advisor (cadratin)
//     Banking and Finance Training - Banking products, ... (cadratin)
//
// Des cadratins, dans le document, sur la page que le recruteur lira. C'est
// la regle numero un du depot, et elle etait enfreinte a l'endroit exact
// qu'elle nomme : le CV lui-meme.
//
// POURQUOI LE GARDE-FOU EXISTANT NE LES VOYAIT PAS
//
// san() les retire depuis longtemps, et sanDeep() l'applique a tout un arbre.
// Mais sanDeep n'est appele que dans parseJSON, donc UNIQUEMENT sur les
// reponses du modele. Le lecteur local, lireUnCv, lit un CV colle sans rien
// demander a personne : c'est le chemin le plus frequent du produit, celui
// que le CLAUDE.md decrit comme prioritaire parce qu'il est instantane et
// gratuit. Il ne passait par aucun nettoyage.
//
// Le CV de quelqu'un contient des cadratins pour une raison banale : Word en
// met tout seul, et la plupart des CV bien mis en page ecrivent
// "Account Manager (cadratin) Stenn International". La porte la moins chere
// etait donc aussi celle par laquelle ils entraient tous.
//
// ET UN CHAMP NE COMMENCE NI NE FINIT PAR UN SEPARATEUR
//
// Le meme CV montrait "Account Manager -" tout court : le tiret qui separait
// l'intitule de l'employeur est reste accroche a l'intitule quand le lecteur
// les a separes. Un gabarit qui compose ensuite "employeur . ville" produit
// "Private Clients - . UAE". Ce n'est pas la faute du gabarit : la valeur
// elle-meme se termine par un separateur qui ne separe plus rien.

// Les tirets longs, sous toutes leurs formes. La liste vient de san() dans
// AppRoot, a laquelle ce module ne peut pas acceder : ce fichier est du
// metier pur, testable sans navigateur.
const TIRETS = /[\u2010\u2011\u2012\u2013\u2014\u2015]/g;

// Ce qui n'a rien a faire au debut ni a la fin d'un champ : les separateurs
// qu'un gabarit ajoute lui-meme entre deux valeurs. La virgule et le
// deux-points en font partie, la parenthese non : "(en cours)" est un
// contenu, pas un separateur.
const AUX_BORDS = /^[\s\-.,;:|/·•]+|[\s\-.,;:|/·•]+$/g;

// Le point final d'une phrase, lui, reste. Une puce de CV se termine par un
// point et le lui retirer abimerait chaque ligne du document.
const PHRASE = /[.!?]$/;

export function nettoyerUnChamp(valeur) {
  if (typeof valeur !== "string") return valeur;
  let s = valeur.replace(TIRETS, "-");
  // Un espace insecable ou fin venu d'un traitement de texte compte comme un
  // espace : sans ca, "Account Manager -&nbsp;" garde son tiret.
  s = s.replace(/[     ]/g, " ");
  // Une phrase garde sa ponctuation finale ; tout le reste se fait tailler.
  const finitParUnePhrase = PHRASE.test(s.trim()) && /\s/.test(s.trim());
  if (finitParUnePhrase) {
    s = s.replace(/^[\s\-,;:|/·•]+/, "");
  } else {
    s = s.replace(AUX_BORDS, "");
  }
  // Deux separateurs qui se suivent apres nettoyage ne separent plus rien.
  s = s.replace(/\s{2,}/g, " ");
  s = s.replace(/(\s[-·|]\s)(?=\s*[-·|]\s)/g, "");
  return s;
}

// Tout l'arbre d'un CV, sans toucher aux nombres ni aux identifiants.
export function nettoyerLesChamps(valeur) {
  if (typeof valeur === "string") return nettoyerUnChamp(valeur);
  if (Array.isArray(valeur)) return valeur.map(nettoyerLesChamps);
  if (valeur && typeof valeur === "object") {
    const out = {};
    for (const k of Object.keys(valeur)) out[k] = nettoyerLesChamps(valeur[k]);
    return out;
  }
  return valeur;
}

// Une entree qui ne porte qu'une date, ou qu'un separateur, n'est pas une
// entree : c'est une ligne que le lecteur a mal decoupee. Le CV de Kilian
// affichait une section CERTIFICATIONS dont l'unique element etait "2023".
// Un recruteur y lit une negligence, et un analyseur y lit une certification
// nommee "2023".
export function estUneCoquille(texte) {
  const s = String(texte == null ? "" : texte).trim();
  if (!s) return true;
  // Une annee seule, une plage d'annees, ou de la ponctuation seule.
  if (/^\(?\d{4}\)?$/.test(s)) return true;
  if (/^\(?\d{4}\s*[-\u2013\u2014a\u00e0to]*\s*\d{0,4}\)?$/i.test(s)) return true;
  if (!/[a-z0-9]/i.test(s)) return true;
  return false;
}
