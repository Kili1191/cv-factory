"use client";

import { lireCommeUneMachine } from "../../lib/lectureMachine";
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

// LES DEUX PHRASES DE LA DEMONSTRATION
//
// Elles etaient decoupees mot a mot, avec l'etat de chaque mot ecrit a la
// main. Ca marchait tant que la demonstration etait la seule. Depuis que le
// visiteur peut faire passer SA phrase sous la meme ligne, deux regles
// coexistaient : celle qu'on avait tapee, et celle du code. Elles pouvaient
// diverger, et le jour ou elles divergent la page ment sur son propre
// mecanisme. Il n'y a plus qu'une regle, dans lib/lectureMachine.js, et les
// phrases d'exemple y passent comme les autres.
const PHRASE = {
  en: "Passionate and hard-working hospitality professional with a decade of "
    + "experience who improved the business and loves a challenge.",
  fr: "Professionnel passionne de la restauration avec dix ans d'experience, "
    + "qui a ameliore les resultats et aime les defis.",
};

// LA MEME PHRASE, REECRITE
//
// Les memes faits, exactement : dix ans, la restauration, des resultats. Rien
// n'est ajoute - c'est la regle du produit et c'est la regle ici. Seule
// change la forme : un intitule que la machine connait, un nombre au lieu
// d'une periphrase, un resultat chiffre au lieu d'un adjectif.
//
// Qu'elle survive entierement n'est pas decrete : on la donne au meme juge,
// et il ne trouve rien a jeter.
const REECRIT = {
  en: "Bar Manager with 10 years in hospitality. 78% beverage GP, "
    + "200 covers a service, team of 12.",
  fr: "Barman responsable, 10 ans en restauration. 78% de marge boissons, "
    + "200 couverts par service, equipe de 12.",
};

export default function ScanHero({ lang = "en", labels, mode = "perte",
  pilote = false, texte = "" }) {
  const garde = mode === "garde";
  // `texte` non vide : c'est la phrase du visiteur, et elle passe devant.
  const brut = texte.trim()
    || (garde ? REECRIT : PHRASE)[lang]
    || (garde ? REECRIT : PHRASE).en;
  const lu = lireCommeUneMachine(brut);
  const lignes = lu.lignes;
  const total = Math.max(lu.total, 1);
  // Ne compte QUE les vraies pertes. Le liant ("and", "de") n'a jamais ete
  // candidat a etre retenu : le compter gonflerait le chiffre, et toute la
  // credibilite de la page tient a ce qu'aucun chiffre ne soit gonfle.
  const ecartes = lu.ecartes;

  // CE QUI RESTE, DIT EN TOUTES LETTRES
  // Une phrase entierement classee n'a pas besoin qu'on enumere ses mots :
  // "tout" se lit plus vite et dit la meme chose. Une phrase qui ne laisse
  // rien doit le dire aussi, sinon la case reste vide et se lit comme un bug.
  const survivants = lu.retenus;
  const resume = !survivants.length
    ? (labels.keptNone || labels.droppedNone)
    : (ecartes === 0 && labels.keptAll)
      ? labels.keptAll
      : survivants.slice(0, 5).join(" ")
        + (survivants.length > 5 ? " +" + (survivants.length - 5) : "");

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
                  // RETENU : la machine sait ou le mettre. Il reste debout.
                  if (mot.f === 0) {
                    return (
                      <span key={mi} style={{
                        color: "var(--nuvi-purple, #5b3df5)", fontWeight: 500,
                        marginRight: "0.26em", display: "inline-block",
                      }}>{mot.m}</span>
                    );
                  }
                  // LIANT : la grammaire s'efface, mais on ne la RAYE pas.
                  // Une barre sur "and" ferait passer pour une perte ce qui
                  // n'a jamais rien pese, et le visiteur compterait faux.
                  if (mot.f === 2) {
                    return (
                      <span key={mi} className="nuvi-mot-faible" style={{
                        display: "inline-block", marginRight: "0.26em",
                        opacity: 0.17,
                        "--retard": retard + "s", "--part": part,
                      }}>{mot.m}</span>
                    );
                  }
                  // ECARTE : un mot que le candidat a choisi, et que la
                  // machine n'a nulle part ou ranger. C'est la perte.
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

      {/* LE VERDICT A DEUX FACES
          La ligne montre des mots mourir ; sans legende, un visiteur voit un
          effet. Nommer et compter les deux cotes transforme l'effet en fait :
          un mot retenu, dix-sept ecartes, sur la phrase qu'il vient de lire. */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "14px 34px", marginTop: 22,
        fontFamily: "'Inter', sans-serif",
      }}>
        {[
          { titre: labels.kept,
            valeur: resume,
            // Vert quand rien n'est perdu, violet sinon : la couleur
            // porte le verdict avant qu'on ait lu le chiffre.
            teinte: ecartes === 0 ? "var(--nuvi-green, #16a34a)" : "var(--nuvi-purple, #5b3df5)",
            barre: false },
          { titre: labels.dropped,
            // "1 words" sur une demonstration qui se veut soignee suffit a faire
            // douter du reste.
            valeur: ecartes
              ? ecartes + " " + (ecartes === 1 ? (labels.word || labels.words) : labels.words)
              : labels.droppedNone,
            teinte: "var(--nuvi-ink-muted, #5a5a62)",
            // Barre seulement s'il y a vraiment eu une perte : rayer "rien"
            // donnerait a la reponse l'air d'un echec alors qu'elle est la
            // demonstration inverse.
            barre: ecartes > 0 },
        ].map((face) => (
          <div key={face.titre} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: "0.16em",
              textTransform: "uppercase", color: "var(--nuvi-ink-muted, #5a5a62)",
            }}>{face.titre}</span>
            <span style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: "clamp(19px, 2.6vw, 30px)", fontWeight: 500,
              color: face.teinte,
              textDecoration: face.barre ? "line-through" : "none",
              textDecorationThickness: "1px",
              opacity: face.barre ? 0.75 : 1,
            }}>{face.valeur}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
