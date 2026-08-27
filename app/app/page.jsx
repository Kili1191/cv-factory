// LA ROUTE DE L'APPLICATION
//
// L'application vivait a la racine. Elle a demenage ici pour que "/" puisse
// devenir une vraie page d'accueil : un visiteur qui arrive sur thenuvi.com
// tombait directement dans un editeur, sans savoir ce que c'est ni pourquoi
// il devrait rester.
//
// Le composant, lui, N'A PAS bouge de dossier : il est passe de
// app/page.jsx a app/AppRoot.jsx, c'est-a-dire au meme niveau. Ses onze
// imports relatifs - ./components/..., ../lib/... - resolvent donc
// exactement comme avant. Le deplacer dans app/app/ aurait demande de tous
// les reecrire, dans un fichier de neuf mille lignes, pour aucun gain.
export { default } from "../AppRoot";
