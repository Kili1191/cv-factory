// CE FICHIER N'A PLUS DE CONTENU PROPRE, ET C'EST LE BUT.
//
// Il existait une deuxieme copie complete des jetons, avec en tete un
// commentaire demandant de garder les deux fichiers "strictement alignes".
// La discipline a perdu, comme toujours : les deux avaient deja derive.
//
//   ShadowMd  ici : 0 4px 14px rgba(10,10,10,.06)
//             la  : 0 4px 12px rgba(10,10,10,.08)
//   ShadowLg  n'existait que d'un cote, si bien que les 26 fichiers de
//             l'autre n'avaient aucune ombre haute et s'en fabriquaient une.
//
// La meme ombre "moyenne" se dessinait donc differemment selon le fichier
// qu'un composant avait importe, sans que rien ne le signale. C'est
// exactement le defaut que le depot documente ailleurs a propos du chemin de
// Chromium : deux endroits a corriger, donc un des deux oublie.
//
// tokens.js est desormais la seule source. Ce fichier ne subsiste que pour
// les cinq composants qui l'importent par ce nom : ils continuent de marcher,
// et rien ne peut plus diverger.
export * from "./tokens.js";
