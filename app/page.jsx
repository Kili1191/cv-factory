"use client";

// LA RACINE EST UNE VITRINE, PLUS UN EDITEUR
//
// L'application a demenage sur /app. Voir app/app/page.jsx et
// app/components/Landing.jsx pour le pourquoi.
//
// ELLE EST RENDUE PAR LE SERVEUR, ET C'ETAIT UN VRAI DEFAUT
//
// La premiere version chargeait la vitrine en dynamic({ ssr: false }),
// c'est-a-dire que le serveur ne renvoyait AUCUN contenu : une page vide
// jusqu'a ce que le JavaScript arrive.
//
// Sur un editeur, ce choix se defend - il n'y a rien a montrer avant que
// l'application demarre. Sur une page d'accueil, c'est le pire choix
// possible, et pour trois raisons qui comptent toutes :
//
//   - un visiteur sur un reseau lent voit du blanc, puis la page. Le seul
//     moment ou il decide de rester est precisement celui-la ;
//   - Google et les reseaux sociaux lisent le HTML renvoye. Vide, la page
//     n'a ni titre, ni texte, ni raison d'etre indexee ;
//   - la vignette de partage se fabrique a partir de ce meme HTML.
//
// Le composant reste client - il ecoute le defilement et lit la langue -
// mais il est desormais IMPORTE, donc rendu une premiere fois par le
// serveur puis repris par le navigateur.
//
// La langue par defaut est l'anglais des deux cotes, et le choix
// enregistre n'est lu qu'apres le montage : sans ca, le serveur rendrait
// une langue et le navigateur une autre, ce qui casse la reprise.

import { useEffect, useState } from "react";
import Landing from "./components/Landing";

export default function Accueil() {
  const [lang, setLang] = useState("en");

  useEffect(() => {
    try {
      const brut = localStorage.getItem("cvf_c");
      if (brut) {
        const v = JSON.parse(brut);
        if (v === "fr" || v === "en") setLang(v);
      }
    } catch { /* stockage refuse : l'anglais par defaut */ }
  }, []);

  return <Landing lang={lang}/>;
}
