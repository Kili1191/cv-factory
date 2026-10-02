"use client";

// LES DEUX LONGUEURS, COTE A COTE, ET ON CLIQUE CELLE QU'ON GARDE
//
// Le panneau d'avant telechargement disait "le CV fait 1,3 page" et offrait
// un seul bouton, Raccourcir. Kilian : "donc la personne perd toute la
// valeur qu'elle a mis du temps a construire ?", puis, une fois la version
// longue mise a l'abri dans Mes CV : "ce ne serait pas mieux de faire un
// apercu cliquable des deux versions cote a cote ?"
//
// Oui, et pour une raison qui n'est pas le confort. Raccourcir enleve des
// puces, et personne ne peut juger ce qui manque en lisant une phrase de
// confirmation. Un filet range ailleurs demande de se souvenir qu'il existe,
// d'aller le chercher, et de comparer de memoire. Ici les deux documents
// sont a l'ecran en meme temps, a la meme echelle, et le choix se fait en
// regardant plutot qu'en faisant confiance.
//
// La page entiere, pas les deux tiers : ce qu'on veut voir, c'est justement
// ce qui a disparu en bas.

import { useState } from "react";
import {
  Ink, InkMuted, Paper, Hairline, Purple, PurpleSoft, CreamSoft,
  Serif, Sans, RadiusMd, B } from "./tokens";
import Sheet from "./Sheet";
import ApercuGabarit from "./ApercuGabarit";

function compterLesPuces(cv) {
  return ((cv && cv.experience) || [])
    .reduce((n, e) => n + ((e && e.bullets) || []).filter((b) => b && b.trim()).length, 0);
}

function Carte({ titre, sous, cv, gabarit, theme, locale, choisi, onChoisir, T, testId }) {
  const [survol, setSurvol] = useState(false);
  return (
    <button
      type="button"
      data-nuvi={testId}
      aria-pressed={choisi}
      onClick={onChoisir}
      onMouseEnter={() => setSurvol(true)}
      onMouseLeave={() => setSurvol(false)}
      style={{
        ...B({
          display: "block", width: "100%", textAlign: "left", padding: 0,
          background: Paper,
          border: (choisi ? "2px solid " + Purple : "1px solid " + Hairline),
          borderRadius: RadiusMd, overflow: "hidden", cursor: "pointer",
          boxShadow: survol && !choisi ? "0 6px 20px rgba(0,0,0,0.08)" : "none",
        }),
      }}
    >
      <div style={{ pointerEvents: "none" }}>
        <ApercuGabarit kind={gabarit} locale={locale} cv={cv} theme={theme} part={1} />
      </div>
      <div style={{
        padding: "10px 12px 12px",
        background: choisi ? PurpleSoft : CreamSoft,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: Ink, fontFamily: Serif }}>{titre}</div>
        <div style={{ fontSize: 11.5, color: InkMuted, fontFamily: Sans, marginTop: 2, lineHeight: 1.5 }}>
          {sous}
        </div>
        <div style={{
          marginTop: 8, fontSize: 11, fontWeight: 700, fontFamily: Sans,
          color: choisi ? Purple : InkMuted,
        }}>{choisi ? (T.ch_kept || "Kept") : (T.ch_keep || "Keep this one")}</div>
      </div>
    </button>
  );
}

export default function ChoixDeLongueur({
  T, locale = "en", avant, apres, gabarit, theme, pages, onGarder, onClose,
}) {
  const [choix, setChoix] = useState("apres");
  const pucesAvant = compterLesPuces(avant);
  const pucesApres = compterLesPuces(apres);
  const perdues = Math.max(0, pucesAvant - pucesApres);
  const en = locale === "en";

  return (
    <Sheet
      eyebrow={T.ch_eyebrow || "LENGTH"}
      title={T.ch_title || "Which one do you send?"}
      onClose={onClose}
    >
      <div style={{ fontSize: 13, color: InkMuted, fontFamily: Sans, lineHeight: 1.6, marginBottom: 14 }}>
        {perdues > 0
          ? (en
            ? ("Shortening dropped " + perdues + (perdues > 1 ? " lines." : " line.")
              + " Both are yours, and the long one stays in My CVs whichever you pick.")
            : ("Raccourcir a retire " + perdues + (perdues > 1 ? " lignes." : " ligne.")
              + " Les deux sont a toi, et la longue reste dans Mes CV quoi qu'il arrive."))
          : (en
            ? "Both are yours, and the long one stays in My CVs whichever you pick."
            : "Les deux sont a toi, et la longue reste dans Mes CV quoi qu'il arrive.")}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
        gap: 14, marginBottom: 16,
      }}>
        <Carte
          testId="choix-avant"
          titre={en ? "Full length" : "Version longue"}
          sous={(pages ? String(pages).replace(".", en ? "." : ",") + (en ? " pages, " : " pages, ") : "")
            + pucesAvant + (en ? " lines" : " lignes")}
          cv={avant} gabarit={gabarit} theme={theme} locale={locale}
          choisi={choix === "avant"} onChoisir={() => setChoix("avant")} T={T}
        />
        <Carte
          testId="choix-apres"
          titre={en ? "Shortened" : "Raccourci"}
          sous={(en ? "one page, " : "une page, ") + pucesApres + (en ? " lines" : " lignes")}
          cv={apres} gabarit={gabarit} theme={theme} locale={locale}
          choisi={choix === "apres"} onChoisir={() => setChoix("apres")} T={T}
        />
      </div>

      <button
        type="button"
        data-nuvi="choix-garder"
        onClick={() => onGarder(choix)}
        style={{
          ...B({
            width: "100%", padding: "14px 18px", borderRadius: RadiusMd,
            background: Ink, color: "#fff", border: "none",
            fontSize: 14, fontWeight: 700, fontFamily: Sans, cursor: "pointer",
          }),
        }}
      >
        {choix === "avant"
          ? (en ? "Keep the full-length one" : "Garder la version longue")
          : (en ? "Keep the shortened one" : "Garder la version raccourcie")}
      </button>
    </Sheet>
  );
}
