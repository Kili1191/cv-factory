"use client";

// Ce que Nuvi a vu avant de laisser partir le CV.
//
// POURQUOI CET ECRAN EXISTE
//
// Un CV est sorti de thenuvi.com avec "Account Manager (cadratin)" comme
// intitule de poste et une section CERTIFICATIONS dont l'unique element etait
// "2023". Le produit n'a rien dit : bouton, clic, fichier. C'est le pire
// moment pour se taire, parce que c'est le seul geste du produit qui ne se
// rattrape pas. Un mauvais conseil se rejette. Un CV envoye est envoye.
//
// CE QU'IL FAIT, ET CE QU'IL NE FAIT PAS
//
// Il nomme chaque defaut, avec le texte exact et l'endroit, et il laisse
// telecharger quand meme. Retirer le bouton serait decider a la place de la
// personne, ce que ce produit ne fait jamais : on peut vouloir imprimer un
// brouillon pour le relire au crayon. Ce qu'on ne doit pas pouvoir faire,
// c'est telecharger sans savoir.
//
// D'ou l'ordre des deux commandes. "Corriger" est en premier et en pleine
// couleur parce que c'est ce qui sert la personne. "Telecharger quand meme"
// est en second, lisible, sans piege : ni gris pale, ni petit, ni cache
// derriere un deuxieme clic. Une sortie qu'on rend penible n'est pas un
// choix, c'est une pression.

import Sheet from "./Sheet";
import {
  Ink, InkMuted, Paper, Hairline, Cream, CoralText, CoralSoft,
  Sans, Serif, RadiusMd, RadiusPill, B } from "./tokens";

const TXT = {
  fr: {
    titre: "Avant d'envoyer ca",
    eyebrow: "Verification",
    intro: (n) => n === 1
      ? "Une chose dans ce CV se lira comme une negligence. Elle vient d'un decoupage rate, pas de ce que tu as ecrit."
      : n + " choses dans ce CV se liront comme des negligences. Elles viennent de decoupages rates, pas de ce que tu as ecrit.",
    corriger: "Corriger d'abord",
    quandMeme: "Telecharger quand meme",
    visuel: "A l'impression",
  },
  en: {
    titre: "Before you send this",
    eyebrow: "Check",
    intro: (n) => n === 1
      ? "One thing in this CV will read as carelessness. It comes from a bad split, not from what you wrote."
      : n + " things in this CV will read as carelessness. They come from bad splits, not from what you wrote.",
    corriger: "Fix these first",
    quandMeme: "Download anyway",
    visuel: "On the page",
  },
};

export default function DefautsAvantExport({
  defauts = [], locale = "fr", onCorriger, onQuandMeme, onClose,
}) {
  const t = TXT[locale] || TXT.fr;
  if (!defauts.length) return null;

  return (
    <Sheet
      eyebrow={t.eyebrow}
      title={t.titre}
      onClose={onClose}
    >
      <p style={{
        fontSize: 14, lineHeight: 1.55, color: Ink, margin: "0 0 18px",
        maxWidth: "54ch", fontFamily: Sans,
      }}>{t.intro(defauts.length)}</p>

      <div style={{ display: "grid", gap: 10, marginBottom: 22 }}>
        {defauts.map((d, i) => (
          <div key={i} style={{
            background: Paper, border: "0.5px solid " + Hairline,
            borderRadius: RadiusMd, padding: "12px 14px",
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase", color: CoralText,
              marginBottom: 6, fontFamily: Sans,
            }}>{d.visuel ? t.visuel : d.ou}</div>

            {/* LE TEXTE EXACT, PAS UN RESUME
                Quelqu'un ne peut corriger que ce qu'il reconnait. "Un champ
                est mal coupe" envoie chercher ; "Account Manager -" se
                retrouve d'un coup d'oeil dans le document. */}
            {d.extrait ? (
              <div style={{
                fontFamily: Serif, fontSize: 15, color: Ink,
                lineHeight: 1.4, marginBottom: 6,
                background: CoralSoft, borderRadius: 8,
                padding: "6px 10px", display: "inline-block",
              }}>{d.extrait}</div>
            ) : null}

            <div style={{
              fontSize: 13, lineHeight: 1.5, color: InkMuted, fontFamily: Sans,
            }}>{d.pourquoi}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          data-nuvi="defauts-corriger"
          onClick={onCorriger}
          style={{
            ...B({
              flex: "1 1 200px", minHeight: 48, padding: "14px 20px",
              borderRadius: RadiusPill, background: Ink, color: Cream,
              fontFamily: Sans, fontSize: 14.5, fontWeight: 600,
            })
          }}>{t.corriger}</button>

        {/* Lisible, atteignable, sans piege. Une sortie qu'on rend penible
            n'est pas un choix. */}
        <button
          data-nuvi="defauts-quand-meme"
          onClick={onQuandMeme}
          style={{
            ...B({
              flex: "1 1 200px", minHeight: 48, padding: "14px 20px",
              borderRadius: RadiusPill, background: Paper, color: Ink,
              border: "1px solid " + Hairline,
              fontFamily: Sans, fontSize: 14.5, fontWeight: 600,
            })
          }}>{t.quandMeme}</button>
      </div>
    </Sheet>
  );
}
