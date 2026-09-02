"use client";

/**
 * LES MEMES FAITS, QUI SE RANGENT AUTREMENT - EN SE DEFORMANT
 *
 * Premiere version : un fondu enchaine entre deux textes. Ce n'etait pas un
 * morphing. Deux textes qui se croisent en transparence restent deux textes,
 * et l'oeil lit une substitution, pas une transformation. Le commentaire qui
 * justifiait ce choix - "deformer les glyphes coute cher et reste illisible a
 * mi-chemin" - decrivait surtout la solution la plus facile.
 *
 * Les lettres se deforment maintenant pour de bon, par deux moyens :
 *
 *   LES AXES DE LA FONTE. Fraunces est variable, et le document charge deja
 *   ses axes de graisse (300 a 900) et de douceur (30 a 100). Ce sont des
 *   nombres, donc ils s'animent : pendant la transformation les contours
 *   epaississent et s'arrondissent. Rien n'est simule, c'est le dessin de la
 *   lettre qui bouge.
 *
 *   LE FILTRE GOUTTE. Un flou suivi d'un fort contraste alpha fait fusionner
 *   ce qui est proche. Les lettres voisines se collent en une masse liquide
 *   puis s'en detachent en formant les nouvelles - la matiere coule d'un mot
 *   a l'autre au lieu de se substituer.
 *
 * POURQUOI AUCUNE LETTRE NE VOYAGE D'UN MOT A L'AUTRE
 *
 * On peut apparier les lettres communes et les faire glisser de leur ancienne
 * place a la nouvelle. Sur ces paires-la, "une decennie d'experience" contre
 * "10 ans", les lettres communes sont rares et eloignees : un "e" traverserait
 * la ligne pour aller se ranger vingt caracteres plus loin. Le resultat est
 * agite, pas transforme. La fusion par le filtre donne la continuite de
 * matiere sans ce desordre.
 *
 * CE QUI RESTE VRAI SANS ANIMATION
 *
 * L'etat par defaut du document est la version REECRITE, sans filtre ni
 * deformation. Un navigateur sans observateur d'intersection, ou quelqu'un
 * qui refuse le mouvement, voit la reponse - pas une phrase figee a
 * mi-course.
 */

import React, { useEffect, useRef, useState } from "react";

// Le filtre est pose une seule fois par page : plusieurs definitions du meme
// identifiant se disputeraient la reference et le rendu deviendrait
// dependant de l'ordre de montage.
function DefsGoutte() {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs>
        <filter id="nuvi-goutte">
          <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="flou"/>
          {/* Le contraste sur l'alpha : tout ce qui est a demi opaque devient
              opaque ou disparait. C'est ce seuil qui recolle les lettres
              voisines en une seule masse. */}
          <feColorMatrix in="flou" mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 28 -12" result="goutte"/>
          <feBlend in="SourceGraphic" in2="goutte"/>
        </filter>
      </defs>
    </svg>
  );
}

function Lettres({ texte, etat, sens }) {
  return [...texte].map((c, i) => (
    <span key={i} aria-hidden="true"
      className={"nuvi-morph-lettre " + etat}
      style={{
        // Le decalage suit la lecture : la masse se forme de gauche a droite
        // au lieu de gonfler d'un bloc.
        //
        // `--pas` porte la deformation, `--pasOp` la disparition. La lettre
        // sortante reste opaque pendant tout son ecrasement et ne s efface
        // qu une fois plate ; l entrante n apparait qu apres, quand la barre
        // est deja formee. Le milieu est donc une masse, pas deux phrases.
        "--pas": (sens === "sort" ? i * 13 : i * 13 + 430) + "ms",
        "--pasOp": (sens === "sort" ? i * 13 + 300 : i * 13 + 430) + "ms",
      }}>{c}</span>
  ));
}

export default function Morph({ paires, lang = "en", labels }) {
  // "repos" : la version rangee, nette, sans filtre. C'est l'etat du document
  // au chargement et celui vers lequel on revient toujours.
  const [phase, setPhase] = useState("repos");
  const cadre = useRef(null);

  useEffect(() => {
    const el = cadre.current;
    if (!el || typeof window === "undefined") return;
    // On NE SORT PLUS ici. Sortir laissait les faits sur leur version
    // faible et la section n'avait plus aucun sens : la these du produit
    // disparaissait pour qui a demande moins de mouvement.
    //
    // La transformation joue donc quand meme, et la feuille de style la
    // reduit a un fondu - sans ecrasement, sans flou, sans deformation de
    // la fonte. On laisse simplement plus de temps pour lire.
    const calme = window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (typeof IntersectionObserver !== "function") return;

    let minuteurs = [];
    const poser = (f, ms) => minuteurs.push(setTimeout(f, ms));

    const jouer = () => {
      minuteurs.forEach(clearTimeout);
      minuteurs = [];
      setPhase("avant");                 // on montre la formule molle
      poser(() => setPhase("fond"), calme ? 1500 : 1000); // elle fond, l'autre nait
      // Le filtre est retire des que la transformation finit : au repos, le
      // texte doit etre net. Un flou permanent sur du serif se voit.
      poser(() => setPhase("repos"), calme ? 3200 : 2400);
    };

    const obs = new IntersectionObserver((entrees) => {
      for (const e of entrees) if (e.isIntersecting) jouer();
    }, { threshold: 0.55 });
    obs.observe(el);
    return () => {
      obs.disconnect();
      minuteurs.forEach(clearTimeout);
      minuteurs = [];
    };
  }, []);

  const avant = phase === "avant";
  const fond = phase === "fond";

  return (
    <div ref={cadre} style={{ width: "100%" }}>
      <DefsGoutte/>

      {labels && labels.lead ? (
        <p style={{
          margin: "0 0 18px",
          fontFamily: "'Inter', sans-serif", fontSize: 10.5, fontWeight: 700,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: "var(--nuvi-ink-muted, #5a5a62)",
        }}>{labels.lead}</p>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {paires.map((p, i) => {
          const txtAvant = p.avant[lang] || p.avant.en;
          const txtApres = p.apres[lang] || p.apres.en;
          return (
            <div key={i}
              // Le filtre n'est pose que pendant la fusion, et sur la cellule
              // entiere : c'est ce qui permet aux deux textes de se coller.
              className={(avant || fond) ? "nuvi-morph-goutte" : undefined}
              style={{
                // La grille superpose les deux etats dans la meme cellule :
                // le bloc prend la taille du plus grand et ne bouge plus.
                display: "inline-grid", justifyItems: "start",
                alignItems: "baseline",
                fontFamily: "'Fraunces', 'DM Serif Display', Georgia, serif",
                // L'ECHELLE EST L'ARGUMENT
                //
                // Ce bloc plafonnait a 38px, la taille d'un sous-titre. C'est
                // pourtant le seul geste original de la page : les lettres se
                // deforment vraiment, par les axes variables de Fraunces et
                // par un filtre de fusion, et aucun autre outil de CV ne
                // montre ca. A 38px on le lisait comme une legende, et le
                // titre de section a cote, lui, montait a 60.
                //
                // Il passe donc a l'echelle des titres. Une demonstration
                // qu'il faut chercher des yeux n'est pas une demonstration.
                fontSize: "var(--t-title)",
                lineHeight: 1.08, letterSpacing: "-0.035em",
                // Marge de securite pour que le flou du filtre ne soit pas
                // coupe par la boite : une goutte tronquee au ras du texte
                // se voit immediatement.
                padding: "6px 16px", margin: "-6px -16px",
              }}>
              {/* Le morphing decoupe ses phrases en lettres pour les
                  deformer une a une, et chaque lettre est masquee aux
                  lecteurs d'ecran : une lettre seule ne se lit pas. La
                  transformation leur est donc donnee ici, en clair et une
                  seule fois - c'est elle qui porte le sens, pas le seul
                  resultat. */}
              <span className="sr-only" style={{ gridArea: "1 / 1" }}>
                {txtAvant + " \u2192 " + txtApres}
              </span>

              {/* La formule que la machine ne sait pas ranger. */}
              <span style={{
                gridArea: "1 / 1", color: "var(--nuvi-ink-muted, #5a5a62)",
                // Presente seulement le temps de la transformation : hors de
                // ce moment elle n'a pas a occuper le document.
                visibility: (avant || fond) ? "visible" : "hidden",
              }}>
                <Lettres texte={txtAvant} sens="sort"
                  etat={avant ? "nuvi-morph-pose" : "nuvi-morph-sort"}/>
              </span>

              {/* Le meme fait, dans la forme que la machine range. */}
              <span style={{
                gridArea: "1 / 1",
                color: "var(--nuvi-purple, #5b3df5)",
              }}>
                <Lettres texte={txtApres} sens="entre"
                  etat={avant ? "nuvi-morph-entre" : "nuvi-morph-pose"}/>
              </span>
            </div>
          );
        })}
      </div>

      {labels && labels.note ? (
        <p style={{
          margin: "20px 0 0", maxWidth: 46 + "ch",
          fontFamily: "'Inter', sans-serif", fontSize: "var(--t-micro)",
          lineHeight: 1.55, color: "var(--nuvi-ink-muted, #5a5a62)",
        }}>{labels.note}</p>
      ) : null}
    </div>
  );
}
