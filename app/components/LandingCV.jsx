"use client";

/**
 * LE DOCUMENT, ENFIN A L'ECRAN
 *
 * La vitrine parlait de CV pendant six sections sans jamais en montrer un.
 * On y voyait une phrase se faire manger, des formules se ranger autrement,
 * des metiers defiler - et on arrivait au bouton sans avoir vu une seule
 * fois ce qu'on allait obtenir. Mesure faite sur les captures : trois
 * sections sur quatre occupaient moins de la moitie de l'ecran, le reste
 * restant creme. Il manquait un objet dans la page.
 *
 * C'EST LE VRAI COMPOSANT, PAS UNE IMITATION
 *
 * On aurait pu dessiner un faux CV en HTML : moins lourd, et faux le jour ou
 * le produit change. Ce sont les memes composants que l'editeur
 * (app/components/CVLayouts.jsx), avec un setteur qui ne fait rien. Ils
 * n'ont besoin d'aucun contexte ni d'aucun etat global - AppRoot s'en sert
 * deja ainsi pour ses vignettes de gabarit. La page ne peut donc pas mentir
 * sur le produit : elle affiche le produit.
 *
 * ET IL NE COUTE RIEN AU PREMIER CHARGEMENT
 *
 * Charge a la demande, et seulement quand la section approche de l'ecran.
 * Le poids d'entree de la vitrine ne bouge pas : quelqu'un qui lit le haut
 * de la page et repart n'a jamais telecharge le rendu.
 *
 * PERSONNE N'EDITE ICI
 *
 * Chaque champ du vrai composant devient un champ de saisie au clic. Sur une
 * vitrine ce serait une promesse fausse - on modifierait un document qui
 * n'appartient a personne et rien ne serait garde. Les evenements de
 * pointeur sont donc coupes, et l'ensemble est masque aux lecteurs d'ecran :
 * c'est une illustration, et le texte de la section porte deja le sens.
 */

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const CVClassic = dynamic(
  () => import("./CVLayouts").then((m) => m.CVClassic),
  { ssr: false, loading: () => null });

// UN CV QUE CETTE PAGE PEUT ASSUMER
//
// L'editeur a deja un CV de demonstration, mais c'est une directrice
// marketing : budgets de 1,5 M EUR, ecole de commerce. L'afficher ici
// contredirait a la lettre la section qui promet "les metiers pour qui
// personne n'ecrit de modele" - une aide-soignante regarderait le CV d'une
// cadre se faire polir. Celui-ci est ecrit pour les gens a qui la page
// s'adresse, et il applique ce qu'elle vient de demontrer : un intitule que
// la machine connait, des resultats chiffres, aucun adjectif qui ne prouve
// rien.
const CV = {
  en: {
    name: "Amara Okafor", title: "Care Assistant",
    email: "amara.okafor@email.com", phone: "07700 900312",
    location: "Manchester M14", linkedin: "", links: [], extraContacts: [],
    labels: {},
    summary: "Care Assistant, 6 years in residential and domiciliary care. "
      + "Caseload of 14 residents, NVQ Level 3, medication trained.",
    skills: ["Medication administration", "Manual handling", "Care planning",
      "Safeguarding", "Dementia care", "Record keeping"],
    languages: [{ lang: "English", level: "Native" }, { lang: "Igbo", level: "Native" }],
    certifications: ["NVQ Level 3 Health and Social Care", "Care Certificate"],
    education: [{ id: "e1", school: "Manchester College", degree: "NVQ Level 3 Health and Social Care", period: "2019 - 2020" }],
    experience: [
      { id: "x1", title: "Senior Care Assistant", company: "Elmwood Residential Home",
        period: "2022 - 2026", location: "Manchester",
        bullets: [
          "Led a team of 6 across night shifts for 32 residents.",
          "Cut medication errors to zero across 18 months of audits.",
          "Trained 9 new starters through their Care Certificate.",
        ] },
      { id: "x2", title: "Care Assistant", company: "Bright Path Homecare",
        period: "2020 - 2022", location: "Manchester",
        bullets: [
          "Visited 14 clients a day across a 20 mile round.",
          "Kept daily records for 14 care plans without a single gap.",
        ] },
    ],
  },
  fr: {
    name: "Amara Okafor", title: "Aide-soignante",
    email: "amara.okafor@email.com", phone: "06 12 34 56 78",
    location: "Lyon 7e", linkedin: "", links: [], extraContacts: [],
    labels: {},
    summary: "Aide-soignante, 6 ans en EHPAD et a domicile. "
      + "14 residents suivis, diplome d'Etat, formee a la distribution des medicaments.",
    skills: ["Distribution des medicaments", "Manutention", "Projet de soins",
      "Protection des personnes", "Troubles cognitifs", "Transmissions"],
    languages: [{ lang: "Francais", level: "Langue maternelle" }, { lang: "Anglais", level: "Courant" }],
    certifications: ["Diplome d'Etat d'aide-soignant", "AFGSU niveau 2"],
    education: [{ id: "e1", school: "IFAS Lyon", degree: "Diplome d'Etat d'aide-soignant", period: "2019 - 2020" }],
    experience: [
      { id: "x1", title: "Aide-soignante referente", company: "EHPAD Les Ormes",
        period: "2022 - 2026", location: "Lyon",
        bullets: [
          "Encadre une equipe de 6 en service de nuit pour 32 residents.",
          "Zero erreur de distribution sur 18 mois de controles.",
          "Forme 9 nouveaux arrivants jusqu'a leur validation.",
        ] },
      { id: "x2", title: "Aide-soignante a domicile", company: "Bien-Etre Domicile",
        period: "2020 - 2022", location: "Lyon",
        bullets: [
          "14 visites par jour sur une tournee de 30 km.",
          "Transmissions tenues pour 14 projets de soins, sans trou.",
        ] },
    ],
  },
};

const THEME = {
  bf: "Inter, system-ui, sans-serif",
  tf: "Fraunces, Georgia, serif",
  bg: "#ffffff",
  ti: "#1a1a1e",
  sb: "#1a1a2e",
  st: "#f5e9d2",
  ac: "#5b3df5",
  pr: "#5b3df5",
  hf: "Fraunces, Georgia, serif",
};

const MOTS = {
  en: { cv_p: "Profile", cv_el: "Experience", cv_ed: "Education",
    cv_s: "Skills", cv_l: "Languages", cv_c: "Certifications", cv_ct: "Contact", cv_e: "Experience" },
  fr: { cv_p: "Profil", cv_el: "Experience", cv_ed: "Formation",
    cv_s: "Competences", cv_l: "Langues", cv_c: "Certifications", cv_ct: "Contact", cv_e: "Experience" },
};

const LARGEUR = 794;   // une page A4 a 96 dpi

export default function LandingCV({ lang = "en", echelle: echelleMax = 0.8 }) {
  const [proche, setProche] = useState(false);
  const cadre = useRef(null);

  // L ECHELLE SUIT LA COLONNE
  //
  // Elle valait 0,8 quoi qu il arrive, et le document debordait de sa
  // colonne : sur un ecran de 1440 la colonne des dates etait coupee a
  // "2022 -", sur un telephone la moitie droite de la page manquait. Un
  // CV coupe dans son texte se lit comme un defaut, pas comme un objet
  // pose. La page A4 se reduit donc a la largeur disponible, jamais plus
  // grande que 0,8.
  const [echelle, setEchelle] = useState(echelleMax);
  useEffect(() => {
    const el = cadre.current;
    if (!el || !el.parentElement || typeof ResizeObserver !== "function") return undefined;
    const parent = el.parentElement;
    const mesurer = () => {
      const l = parent.clientWidth;
      if (l > 0) setEchelle(Math.min(echelleMax, l / LARGEUR));
    };
    mesurer();
    const obs = new ResizeObserver(mesurer);
    obs.observe(parent);
    return () => obs.disconnect();
  }, [echelleMax]);

  // On ne telecharge le rendu que si la section approche : quelqu'un qui lit
  // le haut de la page et repart n'a rien paye.
  useEffect(() => {
    const el = cadre.current;
    if (!el || typeof IntersectionObserver !== "function") { setProche(true); return; }
    const obs = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting)) { setProche(true); obs.disconnect(); }
    }, { rootMargin: "600px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const cv = CV[lang] || CV.en;

  return (
    <div ref={cadre} aria-hidden="true" style={{
      // La hauteur est reservee avant que le rendu arrive : sans elle, la
      // page sauterait au moment du chargement.
      //
      // On coupe AVANT le bas de la page A4. A pleine hauteur, le dernier
      // tiers etait du blanc vide - le CV s'arrete avant la fin de la feuille
      // - et cette zone morte se lisait comme un defaut de mise en page.
      // Coupe dans le texte, le document se lit comme une vraie page qui
      // continue hors du cadre.
      height: Math.round(1123 * echelle * 0.62),
      overflow: "hidden",
      pointerEvents: "none", userSelect: "none",
      // L'ombre porte le document au-dessus du fond creme : c'est ce qui en
      // fait un objet pose sur la page plutot qu'un bloc de texte de plus.
      borderRadius: 4,
      boxShadow: "0 40px 90px -30px rgba(26,26,30,.28), 0 2px 10px rgba(26,26,30,.06)",
      background: "#fff",
      width: Math.round(LARGEUR * echelle),
      maxWidth: "100%",
      transition: "height 160ms ease-out",
    }}>
      <div style={{
        width: LARGEUR, transform: "scale(" + echelle + ")",
        transformOrigin: "top left",
      }}>
        {proche ? (
          <CVClassic cv={cv} set={() => {}} t={THEME}
            T={MOTS[lang] || MOTS.en} locale={lang}/>
        ) : null}
      </div>
    </div>
  );
}
