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
import AppRoot from "../AppRoot";

// CETTE PAGE NOMME LA SIENNE, PARCE QUE LE LAYOUT NE LE FAIT PLUS
//
// Le layout posait un titre de niveau 1 masque, valable pour tout le site. Il
// datait de l'epoque ou l'application n'en avait aucun. Depuis, la vitrine et
// la page de mise en service ont le leur, et celui du layout leur faisait
// doublon : deux h1 sur une page privent le plan du document de sa racine
// unique.
//
// En le retirant, l'editeur s'est retrouve sans aucun titre : le seul h1
// d'AppRoot vit a l'interieur du panneau Finaliser, donc il n'existe que
// lorsqu'on ouvre ce panneau. Mesure apres coup : zero h1 sur /app. Le titre
// revient donc ici, ou il appartient, et une seule page le porte.
//
// Il est masque visuellement : le nom du CV en cours tient deja ce role a
// l'ecran, et l'afficher ferait doublon avec la manchette.
export default function PageDeLApplication() {
  return (
    <>
      <h1 className="sr-only">Nuvi editor</h1>
      <AppRoot />
    </>
  );
}
