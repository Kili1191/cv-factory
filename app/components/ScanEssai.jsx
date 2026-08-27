"use client";

/**
 * LA PHRASE DU VISITEUR PASSE SOUS LA MEME LIGNE
 *
 * Une demonstration ecrite d'avance reste la demonstration de quelqu'un
 * d'autre. On peut la regarder, la trouver bien faite, et partir sans avoir
 * rien reconnu. La seule facon de faire comprendre a un serveur ou a un
 * aide-soignant ce qu'un logiciel de tri fait de son CV, c'est de le lui
 * faire sur SA phrase, celle qu'il a ecrite et relue.
 *
 * POURQUOI CA NE COUTE RIEN
 *
 * Le jugement est rendu dans le navigateur par lib/lectureMachine.js. Aucun
 * appel a une IA, aucun octet qui sort. Ce n'est pas qu'une economie : on
 * demande a un inconnu de coller une ligne de son CV avant meme qu'il ait un
 * compte. L'envoyer a un serveur pour lui vendre quelque chose serait la
 * pire premiere impression que le produit puisse donner.
 *
 * LE REJEU
 *
 * Les mots meurent par une animation CSS qui ne se rejoue pas si React
 * reutilise les memes noeuds. On force donc un remontage a chaque phrase
 * (`cle`), sinon le visiteur tape et ne voit que le resultat, jamais le
 * passage de la ligne - c'est-a-dire justement la chose qu'on voulait
 * montrer.
 */

import React, { useEffect, useRef, useState } from "react";
import ScanHero from "./ScanHero";

const ATTENTE = 420;   // ms apres la derniere frappe
const MAX = 220;       // caracteres : une ligne de CV, pas un CV entier

export default function ScanEssai({ lang, labels, textes }) {
  const [saisi, setSaisi] = useState("");
  const [phrase, setPhrase] = useState("");
  const [cle, setCle] = useState(0);
  const minuteur = useRef(null);
  // Le premier passage du minuteur aurait remonte le composant 420 ms
  // apres l'arrivee, coupant net la premiere descente de la ligne : le
  // visiteur voyait un sursaut au lieu de la demonstration.
  const premier = useRef(true);

  // On ne rejoue pas a chaque touche : la ligne mettrait 3 secondes a
  // descendre et serait interrompue avant d'avoir atteint le premier mot.
  useEffect(() => {
    if (premier.current) { premier.current = false; return; }
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => {
      setPhrase(saisi.trim());
      setCle((n) => n + 1);
    }, ATTENTE);
    return () => { if (minuteur.current) clearTimeout(minuteur.current); };
  }, [saisi]);

  const sien = phrase.length > 0;

  return (
    <div style={{ width: "100%" }}>
      <div key={cle}>
        <ScanHero lang={lang} labels={labels} texte={phrase}/>
      </div>

      <div style={{
        marginTop: 26, display: "flex", flexWrap: "wrap",
        alignItems: "flex-end", gap: "10px 16px",
      }}>
        <label style={{ flex: "1 1 320px", minWidth: 0 }}>
          <span style={{
            display: "block", marginBottom: 7,
            fontFamily: "'Inter', sans-serif", fontSize: 10.5, fontWeight: 700,
            letterSpacing: "0.16em", textTransform: "uppercase",
            color: "var(--nuvi-ink-muted, #5a5a62)",
          }}>{textes.lead}</span>
          <input
            type="text"
            value={saisi}
            maxLength={MAX}
            onChange={(e) => setSaisi(e.target.value)}
            placeholder={textes.placeholder}
            style={{
              width: "100%", boxSizing: "border-box",
              minHeight: 48, padding: "12px 14px",
              fontFamily: "'Inter', sans-serif", fontSize: 15,
              color: "var(--nuvi-ink, #0a0a0a)",
              background: "var(--nuvi-paper, #fff)",
              border: "1px solid var(--nuvi-hair, #e6e2d8)",
              borderRadius: 10, outline: "none",
            }}
          />
        </label>

        {sien ? (
          <button type="button" onClick={() => setSaisi("")} style={{
            minHeight: 48, padding: "0 16px", cursor: "pointer",
            fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
            color: "var(--nuvi-ink-muted, #5a5a62)",
            background: "transparent",
            border: "1px solid var(--nuvi-hair, #e6e2d8)", borderRadius: 10,
          }}>{textes.reset}</button>
        ) : null}
      </div>

      {/* Dit avant qu'on le demande. Quelqu'un a qui on reclame une ligne de
          son CV a le droit de savoir ou elle va, et la reponse est : nulle
          part. */}
      <p style={{
        margin: "9px 0 0",
        fontFamily: "'Inter', sans-serif", fontSize: 12.5,
        color: "var(--nuvi-ink-muted, #5a5a62)",
      }}>{textes.prive}</p>
    </div>
  );
}
