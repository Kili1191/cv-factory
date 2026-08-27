"use client";

import React from "react";

// Les regles d'animation vivent dans globals.css - voir la note sur
// l'apostrophe plus bas, qui explique pourquoi elles ne peuvent PAS etre
// dans un <style> pose ici.

/**
 * LE SCANNER
 *
 * L'ancien heros disait "la plupart des CV sont ecartes avant qu'un humain
 * les lise", puis montrait un tableau. Une affirmation, puis une preuve
 * rangee dans une grille. C'etait juste, et ca ne faisait rien voir : on
 * lisait un argument au lieu d'assister a la chose.
 *
 * Ici, la chose se produit. Une phrase de CV, a taille reelle de titre, et
 * une ligne de lecture qui la traverse. Sur son passage, ce que le logiciel
 * ne sait pas ranger MEURT : ca palit, ca se barre, ca cesse d'exister. Ce
 * qui reste est ce qui arrivera devant un humain.
 *
 * C'est le produit entier en une image, et c'est la seule chose de Nuvi
 * qu'on ne peut voir nulle part ailleurs - ni dans l'editeur, ni dans un
 * export, ni dans un vrai logiciel de tri, qui ne montre jamais son travail.
 *
 * POURQUOI EN CSS PUR
 *
 * Aucune bibliotheque : Nuvi s'interdit toute dependance chargee a
 * l'execution, et une suite le verifie. Tout se joue en animations
 * declaratives, donc hors du fil principal - la page reste fluide meme
 * pendant que le reste demarre.
 *
 * LE SENS DU REPLI
 *
 * L'etat final - ce que la machine a retenu - est l'etat PAR DEFAUT du
 * document. L'animation ne fait que remonter dans le temps pour le rejouer.
 * Ecrit dans l'autre sens, un navigateur sans animation, ou quelqu'un qui
 * refuse le mouvement, verrait une phrase a moitie morte et rien d'autre.
 */

// La phrase, decoupee. `faible` marque ce qu'un logiciel de tri ne peut pas
// ranger : une intention, un adjectif, une formule. Ce ne sont pas des mots
// mal choisis - ce sont des mots que la machine n'a nulle part ou mettre.
const PHRASE = {
  en: [
    [{ m: "Passionate" , f: 1 }, { m: "and", f: 1 }, { m: "hard-working", f: 1 },
     { m: "hospitality", f: 0 }, { m: "professional", f: 1 }],
    [{ m: "with", f: 1 }, { m: "a", f: 1 }, { m: "decade", f: 1 }, { m: "of", f: 1 },
     { m: "experience", f: 1 }, { m: "who", f: 1 }, { m: "improved", f: 1 }],
    [{ m: "the", f: 1 }, { m: "business", f: 1 }, { m: "and", f: 1 },
     { m: "loves", f: 1 }, { m: "a", f: 1 }, { m: "challenge.", f: 1 }],
  ],
  fr: [
    [{ m: "Professionnel", f: 1 }, { m: "passionne", f: 1 }, { m: "de", f: 1 },
     { m: "la", f: 1 }, { m: "restauration", f: 0 }],
    [{ m: "avec", f: 1 }, { m: "dix", f: 1 }, { m: "ans", f: 1 },
     { m: "d'experience,", f: 1 }, { m: "qui", f: 1 }, { m: "a", f: 1 }],
    [{ m: "ameliore", f: 1 }, { m: "les", f: 1 }, { m: "resultats", f: 1 },
     { m: "et", f: 1 }, { m: "aime", f: 1 }, { m: "les", f: 1 }, { m: "defis.", f: 1 }],
  ],
};

// LA MEME PHRASE, REECRITE
//
// Les memes faits, exactement : dix ans, la restauration, des resultats. Rien
// n'est ajoute - c'est la regle du produit et c'est la regle ici. Seule
// change la forme : un intitule que la machine connait, un nombre au lieu
// d'une periphrase, un resultat chiffre au lieu d'un adjectif.
//
// Aucun mot n'est marque faible : ils survivent tous au passage de la ligne.
// C'est la reponse a ce que le heros vient de montrer, avec le meme
// mecanisme, ce qui rend la comparaison immediate.
const REECRIT = {
  en: [
    [{ m: "Bar", f: 0 }, { m: "Manager", f: 0 }, { m: "with", f: 0 }, { m: "10", f: 0 },
     { m: "years", f: 0 }, { m: "in", f: 0 }, { m: "hospitality.", f: 0 }],
    [{ m: "78%", f: 0 }, { m: "beverage", f: 0 }, { m: "GP,", f: 0 },
     { m: "200", f: 0 }, { m: "covers", f: 0 }, { m: "a", f: 0 }, { m: "service,", f: 0 }],
    [{ m: "team", f: 0 }, { m: "of", f: 0 }, { m: "12.", f: 0 }],
  ],
  fr: [
    [{ m: "Barman", f: 0 }, { m: "responsable,", f: 0 }, { m: "10", f: 0 },
     { m: "ans", f: 0 }, { m: "en", f: 0 }, { m: "restauration.", f: 0 }],
    [{ m: "78%", f: 0 }, { m: "de", f: 0 }, { m: "marge", f: 0 }, { m: "boissons,", f: 0 },
     { m: "200", f: 0 }, { m: "couverts", f: 0 }, { m: "par", f: 0 }, { m: "service,", f: 0 }],
    [{ m: "equipe", f: 0 }, { m: "de", f: 0 }, { m: "12.", f: 0 }],
  ],
};

// Ce que le logiciel a effectivement retenu. Un seul mot sur toute la
// phrase : c'est le chiffre le plus honnete de la page.
const RETENU = { en: "hospitality", fr: "restauration" };

export default function ScanHero({ lang = "en", labels, mode = "perte", pilote = false }) {
  const garde = mode === "garde";
  const source = garde ? REECRIT : PHRASE;
  const lignes = source[lang] || source.en;
  const total = lignes.reduce((n, l) => n + l.length, 0);

  return (
    <div className={pilote ? "nuvi-scan-pilote" : undefined}
      style={{ position: "relative", width: "100%" }}>

      <div style={{ position: "relative", overflow: "hidden", padding: "6px 0 10px" }}>
        {/* La ligne de lecture */}
        <div className="nuvi-scan-ligne" aria-hidden="true" style={{
          position: "absolute", left: "-4%", right: "-4%", top: 0, height: 3,
          background: "linear-gradient(90deg, transparent, var(--nuvi-purple,#5b3df5) 18%, var(--nuvi-magenta,#b91c8c) 82%, transparent)",
          boxShadow: "0 0 22px 4px rgba(91,61,245,.35)",
          zIndex: 2, pointerEvents: "none",
        }}/>

        <p style={{
          margin: 0,
          fontFamily: "'Fraunces', 'DM Serif Display', Georgia, serif",
          fontWeight: 400,
          fontSize: "clamp(27px, 5.6vw, 64px)",
          lineHeight: 1.14,
          letterSpacing: "-0.03em",
          color: "var(--nuvi-ink, #0a0a0a)",
        }}>
          {lignes.map((ligne, li) => {
            const avant = lignes.slice(0, li).reduce((n, l) => n + l.length, 0);
            return (
              <React.Fragment key={li}>
                {ligne.map((mot, mi) => {
                  // Le retard suit la position du mot dans la phrase, donc la
                  // descente de la ligne : chaque mot meurt quand elle
                  // l'atteint, pas avant.
                  const part = (avant + mi) / total;
                  const retard = 0.5 + part * 2.7;
                  if (!mot.f) {
                    return (
                      <span key={mi} style={{
                        color: "var(--nuvi-purple, #5b3df5)", fontWeight: 500,
                        marginRight: "0.26em", display: "inline-block",
                      }}>{mot.m}</span>
                    );
                  }
                  return (
                    <span key={mi} className="nuvi-mot-faible"
                      style={{
                        position: "relative", display: "inline-block",
                        marginRight: "0.26em",
                        opacity: 0.17,
                        "--retard": retard + "s",
                        "--part": part,
                      }}>
                      {mot.m}
                      <i aria-hidden="true" style={{
                        position: "absolute", left: 0, right: 0, top: "52%",
                        height: 2, background: "var(--nuvi-coral, #d97757)",
                        transformOrigin: "left center", display: "block",
                      }}/>
                    </span>
                  );
                })}
                {li < lignes.length - 1 ? " " : null}
              </React.Fragment>
            );
          })}
        </p>
      </div>

      {/* Le verdict. Un mot sur toute la phrase : c'est le chiffre le plus
          honnete de la page, et il n'a besoin d'aucun commentaire. */}
      <div style={{
        display: "flex", alignItems: "baseline", flexWrap: "wrap",
        gap: "8px 14px", marginTop: 22,
        fontFamily: "'Inter', sans-serif",
      }}>
        <span style={{
          fontSize: 10.5, fontWeight: 700, letterSpacing: "0.16em",
          textTransform: "uppercase", color: "var(--nuvi-ink-muted, #5a5a62)",
        }}>{labels.kept}</span>
        <span style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: "clamp(19px, 2.6vw, 30px)", fontWeight: 500,
          color: garde ? "var(--nuvi-green, #16a34a)" : "var(--nuvi-purple, #5b3df5)",
        }}>{garde ? labels.keptAll : (RETENU[lang] || RETENU.en)}</span>
        <span style={{
          fontSize: "clamp(12px, 1.4vw, 14px)",
          color: "var(--nuvi-ink-muted, #5a5a62)",
        }}>{labels.keptSub}</span>
      </div>
    </div>
  );
}
