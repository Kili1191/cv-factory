"use client";

// LA RACINE EST UNE VITRINE, PLUS UN EDITEUR
//
// L'application a demenage sur /app. Voir app/app/page.jsx et
// app/components/Landing.jsx pour le pourquoi.
//
// La langue suit le meme choix que l'application, lu dans le meme endroit :
// quelqu'un qui a repondu "francais" une fois ne doit pas retrouver une
// vitrine anglaise. On ne POSE rien ici - la question de la langue se pose
// dans l'application, pas sur une page qu'on ne fait que traverser.

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Landing = dynamic(() => import("./components/Landing"), { ssr: false });

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
