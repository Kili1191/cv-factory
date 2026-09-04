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

import { useState } from "react";
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
    raccourcir: "Raccourcir pour tenir sur une page",
    raccourcitEnCours: "Nuvi raccourcit...",
    corrigeTitre: (n) => n === 1 ? "1 correction faite" : n + " corrections faites",
    introReste: (n) => n === 1
      ? "Il reste une chose qui demande une decision, pas un clic."
      : "Il reste " + n + " choses qui demandent une decision, pas un clic.",
    retire: "retire",
    etAutres: (n) => "et " + n + " autre" + (n > 1 ? "s" : ""),
    dire: "Dire a Nuvi ce que c'est vraiment",
    placeholder: "Par exemple : ce n'est pas une ecole, c'est une formation que j'ai suivie dans l'entreprise",
    envoyer: "Envoyer",
    reflechit: "Nuvi reflechit...",
    toi: "Toi",
    nuvi: "Nuvi",
    deplace: "Nuvi a range",
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
    raccourcir: "Shorten to fit one page",
    raccourcitEnCours: "Nuvi is shortening...",
    corrigeTitre: (n) => n === 1 ? "1 fix applied" : n + " fixes applied",
    introReste: (n) => n === 1
      ? "One thing left that needs a decision, not a click."
      : n + " things left that need a decision, not a click.",
    retire: "removed",
    etAutres: (n) => "and " + n + " more",
    dire: "Tell Nuvi what this really is",
    placeholder: "For example: this is not a school, it is a training I did at the company",
    envoyer: "Send",
    reflechit: "Nuvi is thinking...",
    toi: "You",
    nuvi: "Nuvi",
    deplace: "Nuvi moved it",
  },
};

export default function DefautsAvantExport({
  defauts = [], corriges = [], explications = [], locale = "fr",
  onCorriger, onQuandMeme, onRaccourcir, raccourcitEnCours = false, onClose,
  onExpliquer,
}) {
  const t = TXT[locale] || TXT.fr;

  // LE FIL AVEC NUVI, PAR DEFAUT SIGNALE
  //
  // Le controle sait qu'une ligne ne va pas ; seul le candidat sait ce
  // qu'elle est. Chaque carte peut donc s'ouvrir sur un fil : il ecrit,
  // Nuvi demande s'il lui manque quelque chose, puis range. La cle du fil
  // est le defaut lui-meme, pas sa position dans la liste : la liste se
  // reordonne quand le CV change, le fil doit suivre sa carte.
  const [fils, setFils] = useState({});
  const cleDe = (d) => d.cle + "|" + d.ou;
  const filDe = (d) => fils[cleDe(d)] || { ouvert: false, messages: [], brouillon: "", enCours: false, erreur: "" };
  const poser = (d, patch) => setFils((prev) => ({ ...prev, [cleDe(d)]: { ...filDe(d), ...prev[cleDe(d)], ...patch } }));
  const envoyer = async (d) => {
    const fil = filDe(d);
    const texte = (fil.brouillon || "").trim();
    if (!texte || fil.enCours || typeof onExpliquer !== "function") return;
    const messages = fil.messages.concat([{ de: "candidat", texte }]);
    poser(d, { messages, brouillon: "", enCours: true, erreur: "" });
    try {
      const r = await onExpliquer(d, messages);
      const reponse = r && (r.question || r.explication);
      poser(d, {
        enCours: false,
        messages: reponse ? messages.concat([{ de: "nuvi", texte: reponse }]) : messages,
      });
    } catch (err) {
      poser(d, { enCours: false, erreur: (err && err.message) || String(err) });
    }
  };

  if (!defauts.length) return null;

  // Ce qui se corrige d'un clic, et ce qui demande une decision. Le bouton
  // "Corriger" ne s'affiche que s'il a quelque chose a faire : un bouton qui
  // ne fait rien est le defaut qu'on vient de reparer.
  const AUTOMATIQUES = new Set(["coupe", "cadratin", "placeholder", "creuse",
    "annee_doublee", "doublon", "langue_sans_nom"]);
  const aCorrigerSeul = defauts.some((d) => AUTOMATIQUES.has(d.cle));
  const deborde = defauts.some((d) => d.cle === "deborde_page");

  return (
    <Sheet
      eyebrow={t.eyebrow}
      title={t.titre}
      onClose={onClose}
    >
      {/* CE QUI VIENT D'ETRE FAIT, AVANT CE QUI RESTE
          Apres "Corriger", la personne doit voir le travail : sinon le
          panneau qui se rouvre avec une liste plus courte ressemble a un
          panneau qui n'a rien fait. */}
      {corriges.length || explications.length ? (
        <div data-nuvi="defauts-corriges" style={{
          background: "var(--nuvi-green-soft, #edf7ee)",
          border: "0.5px solid " + Hairline, borderRadius: RadiusMd,
          padding: "12px 14px", marginBottom: 16, fontFamily: Sans,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase", marginBottom: 8,
            color: "var(--nuvi-green-text, #1f6b3a)",
          }}>{corriges.length ? t.corrigeTitre(corriges.length) : t.deplace}</div>
          {explications.map((e, i) => (
            <div key={"e" + i} data-nuvi="defauts-explication" style={{
              fontSize: 13, lineHeight: 1.5, color: Ink, marginBottom: 6 }}>{e}</div>
          ))}
          {corriges.slice(0, 8).map((c, i) => (
            <div key={i} style={{ fontSize: 13, lineHeight: 1.5, color: Ink }}>
              <span style={{ color: InkMuted }}>{c.ou} : </span>
              <span style={{ textDecoration: "line-through", color: InkMuted }}>{c.avant}</span>
              {c.apres ? <span> {"→"} {c.apres}</span> : <span style={{ color: InkMuted }}> {t.retire}</span>}
            </div>
          ))}
          {corriges.length > 8 ? (
            <div style={{ fontSize: 12.5, color: InkMuted, marginTop: 4 }}>
              {t.etAutres(corriges.length - 8)}
            </div>
          ) : null}
        </div>
      ) : null}

      <p style={{
        fontSize: 14, lineHeight: 1.55, color: Ink, margin: "0 0 18px",
        maxWidth: "54ch", fontFamily: Sans,
      }}>{corriges.length ? t.introReste(defauts.length) : t.intro(defauts.length)}</p>

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

            {/* Le fil : sur ce qui se lit dans les donnees, pas sur ce qui
                se mesure a l'ecran. Un recouvrement ne s'explique pas, il
                se corrige dans la mise en page. */}
            {onExpliquer && !d.visuel ? (() => {
              const fil = filDe(d);
              return (
                <div style={{ marginTop: 10 }}>
                  {!fil.ouvert ? (
                    <button
                      data-nuvi="defaut-dire"
                      onClick={() => poser(d, { ouvert: true })}
                      style={{
                        ...B({
                          minHeight: 44, padding: "10px 14px", borderRadius: RadiusPill,
                          background: Paper, color: CoralText,
                          border: "1px solid " + Hairline,
                          fontFamily: Sans, fontSize: 13.5, fontWeight: 600,
                        })
                      }}>{t.dire}</button>
                  ) : (
                    <div data-nuvi="defaut-fil" style={{ display: "grid", gap: 8 }}>
                      {fil.messages.map((m, j) => (
                        <div key={j} data-nuvi-de={m.de} style={{
                          justifySelf: m.de === "nuvi" ? "start" : "end",
                          maxWidth: "88%", padding: "8px 12px", borderRadius: 12,
                          background: m.de === "nuvi" ? Cream : Ink,
                          color: m.de === "nuvi" ? Ink : Cream,
                          fontFamily: Sans, fontSize: 13.5, lineHeight: 1.5,
                        }}>
                          <span style={{ fontWeight: 700 }}>{m.de === "nuvi" ? t.nuvi : t.toi} : </span>
                          {m.texte}
                        </div>
                      ))}
                      {fil.enCours ? (
                        <div data-nuvi="defaut-reflechit" style={{ fontSize: 13, color: InkMuted, fontFamily: Sans }}>{t.reflechit}</div>
                      ) : null}
                      {fil.erreur ? (
                        <div data-nuvi="defaut-erreur" style={{ fontSize: 13, color: CoralText, fontFamily: Sans }}>{fil.erreur}</div>
                      ) : null}
                      <textarea
                        data-nuvi="defaut-message"
                        value={fil.brouillon}
                        placeholder={t.placeholder}
                        rows={2}
                        disabled={fil.enCours}
                        onChange={(e) => poser(d, { brouillon: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(d); }
                        }}
                        style={{
                          width: "100%", boxSizing: "border-box", minHeight: 48,
                          padding: "10px 12px", borderRadius: RadiusMd,
                          border: "1px solid " + Hairline, background: Paper, color: Ink,
                          fontFamily: Sans, fontSize: 14, lineHeight: 1.45, resize: "vertical",
                        }}/>
                      <button
                        data-nuvi="defaut-envoyer"
                        onClick={() => envoyer(d)}
                        disabled={fil.enCours || !(fil.brouillon || "").trim()}
                        style={{
                          ...B({
                            justifySelf: "end", minHeight: 44, padding: "10px 18px",
                            borderRadius: RadiusPill,
                            background: fil.enCours ? Hairline : Ink,
                            color: fil.enCours ? InkMuted : Cream,
                            fontFamily: Sans, fontSize: 13.5, fontWeight: 600,
                            cursor: fil.enCours ? "progress" : "pointer",
                          })
                        }}>{t.envoyer}</button>
                    </div>
                  )}
                </div>
              );
            })() : null}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {aCorrigerSeul ? <button
          data-nuvi="defauts-corriger"
          onClick={onCorriger}
          style={{
            ...B({
              flex: "1 1 200px", minHeight: 48, padding: "14px 20px",
              borderRadius: RadiusPill, background: Ink, color: Cream,
              fontFamily: Sans, fontSize: 14.5, fontWeight: 600,
            })
          }}>{t.corriger}</button> : null}

        {/* Un CV trop long ne se corrige pas d'un clic : il faut couper du
            texte, et couper est une redaction. C'est le modele qui s'en
            charge, sous la consigne qui compte : rien d'invente. */}
        {deborde && onRaccourcir ? <button
          data-nuvi="defauts-raccourcir"
          onClick={onRaccourcir}
          disabled={raccourcitEnCours}
          style={{
            ...B({
              flex: "1 1 200px", minHeight: 48, padding: "14px 20px",
              borderRadius: RadiusPill,
              background: raccourcitEnCours ? Hairline : Ink,
              color: raccourcitEnCours ? InkMuted : Cream,
              fontFamily: Sans, fontSize: 14.5, fontWeight: 600,
              cursor: raccourcitEnCours ? "progress" : "pointer",
            })
          }}>{raccourcitEnCours ? t.raccourcitEnCours : t.raccourcir}</button> : null}

        {/* Lisible, atteignable, sans piege. Une sortie qu'on rend penible
            n'est pas un choix. Absente quand l'ecran s'ouvre depuis le
            compagnon plutot que depuis le bouton Telecharger : il n'y a
            alors rien a "faire quand meme".

            ABSENTE AUSSI QUAND LE CV DEBORDE D'UNE PAGE. C'est la seule
            exception a "Nuvi ne decide pas", et elle n'est pas la mienne :
            "tiens sur 1 page when in pdf for the recruiter", dit deux fois
            par le proprietaire du produit. Un PDF de deux pages n'est pas un
            choix qu'on offre, c'est un fichier que le produit ne fabrique
            plus. La sortie reste ouverte : raccourcir, ou fermer et couper
            soi-meme. */}
        {onQuandMeme && !deborde ? <button
          data-nuvi="defauts-quand-meme"
          onClick={onQuandMeme}
          style={{
            ...B({
              flex: "1 1 200px", minHeight: 48, padding: "14px 20px",
              borderRadius: RadiusPill, background: Paper, color: Ink,
              border: "1px solid " + Hairline,
              fontFamily: Sans, fontSize: 14.5, fontWeight: 600,
            })
          }}>{t.quandMeme}</button> : null}
      </div>
    </Sheet>
  );
}
