"use client";

/**
 * LES MEMES FAITS, QUI SE RANGENT AUTREMENT
 *
 * La vitrine montrait une phrase mourir, puis, deux sections plus bas, sa
 * version reecrite. Le rapprochement entre les deux etait a la charge du
 * visiteur : il fallait retenir la premiere en descendant vers la seconde.
 * Presque personne ne le fait.
 *
 * Ici la transformation se produit sur place. "une decennie d'experience"
 * devient "10 ans" sous les yeux, au meme endroit de la page. Ce n'est pas un
 * effet pose sur du texte : c'est exactement la these du produit - rien
 * d'invente, seulement range autrement - rendue visible en une seconde.
 *
 * POURQUOI CE N'EST PAS UN VRAI MORPHING DE LETTRES
 *
 * Deformer les glyphes d'un mot vers un autre demande de tracer les contours
 * et coute cher pour un resultat souvent illisible a mi-chemin. La sensation
 * de metamorphose vient d'ailleurs : le bloc garde sa taille, l'ancien texte
 * se trouble en partant, le nouveau se precise en arrivant. L'oeil lit une
 * transformation, et chaque etat reste lisible.
 *
 * CE QUI RESTE VRAI SANS ANIMATION
 *
 * L'etat par defaut est la version REECRITE. Un navigateur sans observateur
 * d'intersection, ou quelqu'un qui refuse le mouvement, voit la reponse -
 * pas une phrase molle figee a mi-course.
 */

import React, { useEffect, useRef, useState } from "react";

export default function Morph({ paires, lang = "en", labels }) {
  // `null` = l'etat de repos, c'est-a-dire la version reecrite. On ne
  // redescend vers la version faible que si l'animation peut vraiment jouer.
  const [etape, setEtape] = useState(null);
  const cadre = useRef(null);

  useEffect(() => {
    const el = cadre.current;
    if (!el || typeof window === "undefined") return;
    if (window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver !== "function") return;

    let minuteurs = [];
    const jouer = () => {
      setEtape(0);                                   // on repart du texte faible
      minuteurs.push(setTimeout(() => setEtape(1), 900));
    };
    const obs = new IntersectionObserver((entrees) => {
      for (const e of entrees) {
        // Rejoue a chaque entree dans le champ : redescendre pour revoir la
        // transformation est le premier reflexe, et ne rien obtenir donne
        // l'impression que la page est cassee.
        if (e.isIntersecting) jouer();
      }
    }, { threshold: 0.55 });
    obs.observe(el);
    return () => {
      obs.disconnect();
      minuteurs.forEach(clearTimeout);
      minuteurs = [];
    };
  }, []);

  // etape null ou 1 : on affiche la version rangee.
  const apres = etape !== 0;

  return (
    <div ref={cadre} style={{ width: "100%" }}>
      {labels && labels.lead ? (
        <p style={{
          margin: "0 0 18px",
          fontFamily: "'Inter', sans-serif", fontSize: 10.5, fontWeight: 700,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: "var(--nuvi-ink-muted, #5a5a62)",
        }}>{labels.lead}</p>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {paires.map((p, i) => (
          <div key={i} style={{
            // La grille superpose les deux etats dans la meme cellule : le
            // bloc prend la taille du plus grand et ne bouge plus. Sans ca,
            // chaque transformation decalerait tout ce qui suit.
            display: "inline-grid", justifyItems: "start", alignItems: "baseline",
            fontFamily: "'Fraunces', 'DM Serif Display', Georgia, serif",
            fontSize: "clamp(20px, 3.1vw, 38px)",
            lineHeight: 1.16, letterSpacing: "-0.025em",
          }}>
            <span aria-hidden={apres ? "true" : undefined} style={{
              gridArea: "1 / 1",
              color: "var(--nuvi-ink-muted, #5a5a62)",
              opacity: apres ? 0 : 1,
              filter: apres ? "blur(7px)" : "blur(0)",
              transform: apres ? "translateY(-7px) scale(.97)" : "none",
              transition: "opacity 620ms ease, filter 620ms ease, transform 620ms ease",
              transitionDelay: (i * 130) + "ms",
              textDecoration: "line-through",
              textDecorationColor: "var(--nuvi-coral, #d97757)",
              textDecorationThickness: "1px",
            }}>{p.avant[lang] || p.avant.en}</span>

            <span style={{
              gridArea: "1 / 1",
              color: "var(--nuvi-purple, #5b3df5)", fontWeight: 500,
              opacity: apres ? 1 : 0,
              filter: apres ? "blur(0)" : "blur(7px)",
              transform: apres ? "none" : "translateY(9px) scale(1.03)",
              transition: "opacity 620ms ease, filter 620ms ease, transform 620ms ease",
              transitionDelay: (i * 130 + 90) + "ms",
            }}>{p.apres[lang] || p.apres.en}</span>
          </div>
        ))}
      </div>

      {labels && labels.note ? (
        <p style={{
          margin: "20px 0 0", maxWidth: 46 + "ch",
          fontFamily: "'Inter', sans-serif", fontSize: "clamp(13px, 1.5vw, 15px)",
          lineHeight: 1.55, color: "var(--nuvi-ink-muted, #5a5a62)",
        }}>{labels.note}</p>
      ) : null}
    </div>
  );
}
