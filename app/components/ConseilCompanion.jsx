"use client";

// NUVI EXPLIQUE UNE LIGNE DU CV, ET DIT POURQUOI
//
// Le diagnostic rendait deja la bonne phrase : il cite la puce, dit ce
// qu'elle raconte aujourd'hui et nomme ce qui manque. Elle etait posee dans
// une carte de tableau de bord, entre huit autres notes, en corps 13. Un
// conseil qui a l'air d'une ligne de rapport se lit comme un rapport : on
// hoche la tete et on passe.
//
// Le produit se vend comme un compagnon qui accompagne jusqu'a l'embauche.
// Un compagnon ne depose pas une note dans un tableau, il vient te dire la
// chose en face. C'est le meme texte, mais il change de statut : Nuvi
// apparait, parle, montre la ligne en cause, montre a quoi elle ressemblerait
// une fois corrigee, et propose d'y aller.
//
// Rien n'est demande au modele ici. Tout ce qui s'affiche est deja calcule
// par lib/diagnostic.js : c'est instantane, gratuit, et deux ouvertures
// disent exactement la meme chose.

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import NuviCompanion from "./NuviCompanion";
import {
  Ink, CreamSoft, Paper, Coral, CoralSoft, Green, GreenSoft,
  Gray200, Gray600, Purple, Magenta,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm,
  B, Trans } from "./tokens";

// Les animations de ce panneau. Elles sont ecrites ici et pas dans les
// jetons parce qu'elles ne servent qu'ici : les jetons portent ce qui est
// partage, le reste appartient au composant qui s'en sert.
const KEYFRAMES = `
@keyframes nuviConseilVoile{from{opacity:0}to{opacity:1}}
@keyframes nuviConseilCarte{
  from{opacity:0;transform:translateY(26px) scale(.97)}
  to{opacity:1;transform:translateY(0) scale(1)}
}
@keyframes nuviConseilNuvi{
  0%{opacity:0;transform:translateY(14px) scale(.7)}
  60%{opacity:1;transform:translateY(-4px) scale(1.06)}
  100%{opacity:1;transform:translateY(0) scale(1)}
}
@keyframes nuviConseilLigne{
  from{opacity:0;transform:translateY(10px)}
  to{opacity:1;transform:translateY(0)}
}
@keyframes nuviConseilTrait{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@media (prefers-reduced-motion: reduce){
  [data-nuvi-conseil] *{animation:none!important;transition:none!important}
}
`;

// Une entree decalee : chaque bloc arrive apres le precedent. Le decalage est
// court expres, il donne le sens de lecture sans faire attendre.
const entree = (rang) => ({
  animation: "nuviConseilLigne 380ms cubic-bezier(.22,1,.36,1) both",
  animationDelay: (140 + rang * 90) + "ms",
});

export default function ConseilCompanion({ T, locale, ouvert, axe, onClose, onGo }) {
  const fermerRef = useRef(null);

  useEffect(() => {
    if (!ouvert) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    // Le focus part sur la croix : au clavier, on doit pouvoir sortir sans
    // avoir a traverser le panneau.
    const t = setTimeout(() => fermerRef.current && fermerRef.current.focus(), 60);
    return () => { window.removeEventListener("keydown", onKey); clearTimeout(t); };
  }, [ouvert, onClose]);

  useEffect(() => {
    if (typeof document === "undefined" || !ouvert) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [ouvert]);

  if (typeof document === "undefined" || !ouvert || !axe) return null;

  const en = locale === "en";
  const fait = axe.fait || {};
  const ex = fait.exemples || {};
  const cible = ex.responsabilite || ex.indetermine || null;

  // CE QUI EST MONTRE, ET CE QUI NE L'EST PAS
  //
  // La colonne "avant" porte la phrase de la personne, telle qu'elle l'a
  // ecrite. La colonne "apres" ne porte PAS une phrase reecrite : Nuvi ne
  // sait pas ce qui a change grace a elle, et une phrase inventee ici serait
  // exactement ce que le produit s'interdit. Elle porte la FORME que la
  // phrase doit prendre, avec un exemple pris dans un AUTRE metier que celui
  // de la personne, pour deux raisons : on ne le recopie pas tel quel, et on
  // comprend que la regle vaut partout.
  //
  // L'exemple tourne. Nuvi s'adresse a des serveurs, des aides-soignantes,
  // des livreurs, des magasiniers, des agents d'entretien. Un exemple fige
  // dans la restauration disait a tous les autres que ce produit n'est pas
  // pour eux. Le tirage suit la longueur de la phrase visee : il ne bouge
  // donc pas d'une ouverture a l'autre sur le meme CV, ce qui compte autant
  // que la variete. Un exemple qui change tout seul ferait douter du reste.
  const forme = en
    ? "What you did + what changed + by how much"
    : "Ce que tu as fait + ce qui a change + de combien";
  const EXEMPLES = en ? [
    "Cut medication errors from 9 a month to 2 on the ward",
    "Took on-time delivery from 88% to 97% over one round",
    "Cut picking errors by two thirds in six months",
    "Raised average basket from 18 to 24 pounds in a quarter",
    "Cut room turnaround from 25 to 17 minutes",
  ] : [
    "Chutes ramenees de 9 a 2 par mois sur l'unite",
    "Livraisons a l'heure portees de 88 a 97 % sur la tournee",
    "Erreurs de preparation divisees par trois en six mois",
    "Panier moyen porte de 18 a 24 euros en un trimestre",
    "Remise en etat d'une chambre ramenee de 25 a 17 minutes",
  ];
  const exemple = EXEMPLES[(cible && cible.texte ? cible.texte.length : 0) % EXEMPLES.length];

  return createPortal((
    <div
      data-nuvi-conseil="1"
      role="dialog"
      aria-modal="true"
      aria-label={T.cc_titre || (en ? "Nuvi explains" : "Nuvi t'explique")}
      style={{
        position: "fixed", inset: 0, zIndex: 100000,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        fontFamily: Sans,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(10,10,10,.55)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        animation: "nuviConseilVoile 240ms ease-out both",
      }} onClick={onClose}/>

      <div style={{
        position: "relative",
        width: "100%", maxWidth: 560,
        background: CreamSoft,
        borderRadius: "32px 32px 0 0",
        maxHeight: "92vh", overflowY: "auto",
        boxShadow: "0 -20px 60px rgba(0,0,0,.22)",
        animation: "nuviConseilCarte 420ms cubic-bezier(.32,.72,0,1) both",
        padding: "0 22px 30px",
      }}>
        <div style={{
          width: 40, height: 4, background: Gray200,
          borderRadius: RadiusPill, margin: "10px auto 0",
        }}/>

        <button
          ref={fermerRef}
          onClick={onClose}
          aria-label={en ? "Close" : "Fermer"}
          style={{
            ...B({
              position: "absolute", top: 14, right: 16,
              width: 44, height: 44, borderRadius: RadiusPill,
              background: Paper, border: "0.5px solid " + Gray200,
              color: Gray600, fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
            })
          }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>

        {/* NUVI ARRIVE, PUIS PARLE */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          paddingTop: 16,
        }}>
          <div style={{
            animation: "nuviConseilNuvi 620ms cubic-bezier(.22,1,.36,1) both",
          }}>
            {/* Le viewBox de Nuvi fait 240x280 et se loge dans un carre :
                a 78px le personnage tenait dans un tiers de la hauteur et se
                lisait comme une pastille. A 132 il regarde la personne. */}
            <NuviCompanion size={132} mode="speaking" ariaLabel="Nuvi" />
          </div>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
            textTransform: "uppercase", color: Purple,
            marginTop: 10, ...entree(0),
          }}>{T.cc_eyebrow || (en ? "Nuvi explains" : "Nuvi t'explique")}</div>
          <h2 style={{
            fontFamily: Serif, fontWeight: 400, fontSize: 26,
            letterSpacing: "-0.025em", color: Ink,
            margin: "6px 0 0", textAlign: "center", lineHeight: 1.15,
            ...entree(1),
          }}>{T.cc_titre || (en
            ? "One line is holding your CV back"
            : "Une ligne retient ton CV")}</h2>
        </div>

        {/* LA PHRASE EN CAUSE, TELLE QU'ELLE EST ECRITE */}
        {cible && (
          <div style={{
            marginTop: 20, background: Paper,
            border: "0.5px solid " + Gray200, borderRadius: RadiusMd,
            padding: "14px 16px", boxShadow: ShadowSm, ...entree(2),
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
              textTransform: "uppercase", color: Coral, marginBottom: 7,
            }}>{T.cc_avant || (en ? "What you wrote" : "Ce que tu as ecrit")}</div>
            <div style={{
              fontFamily: Serif, fontStyle: "italic", fontSize: 15,
              color: Ink, lineHeight: 1.5,
            }}>{cible.texte}</div>
            <div style={{
              height: 2, background: Coral, borderRadius: 2,
              margin: "12px 0", transformOrigin: "left",
              animation: "nuviConseilTrait 520ms cubic-bezier(.22,1,.36,1) both",
              animationDelay: "520ms",
            }}/>
            <div style={{
              fontSize: 13, color: Ink, lineHeight: 1.55,
            }}>{axe.reco}</div>
          </div>
        )}

        {/* CE QU'UN RECRUTEUR CHERCHE A LA PLACE */}
        <div style={{
          marginTop: 12, background: GreenSoft,
          border: "0.5px solid " + Green, borderRadius: RadiusMd,
          padding: "14px 16px", ...entree(3),
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
            textTransform: "uppercase", color: Green, marginBottom: 7,
          }}>{T.cc_apres || (en ? "The shape to aim for" : "La forme a viser")}</div>
          <div style={{
            fontFamily: Sans, fontSize: 13, fontWeight: 600,
            color: Ink, lineHeight: 1.5,
          }}>{forme}</div>
          <div style={{
            fontFamily: Serif, fontStyle: "italic", fontSize: 14,
            color: Gray600, lineHeight: 1.5, marginTop: 8,
          }}>{en ? "For example: " : "Par exemple : "}{exemple}</div>
        </div>

        {/* POURQUOI CA CHANGE QUELQUE CHOSE */}
        <div style={{
          marginTop: 12, background: CoralSoft,
          borderRadius: RadiusSm, padding: "12px 14px",
          fontSize: 12.5, color: Ink, lineHeight: 1.6, ...entree(4),
        }}>
          {T.cc_pourquoi || (en
            ? "A responsibility is on the job ad: anyone who held the job could write it, and a recruiter has already read it fifty times today. A result only exists with you. That is the line that gets you called."
            : "Une responsabilite est sur l'annonce : n'importe qui ayant tenu ce poste pourrait l'ecrire, et un recruteur l'a deja lue cinquante fois aujourd'hui. Un resultat n'existe qu'avec toi. C'est cette ligne-la qui fait decrocher le telephone.")}
        </div>

        {/* COMPTE, PARCE QU'UN CHIFFRE SE VERIFIE */}
        {typeof fait.total === "number" && fait.total > 0 && (
          <div style={{
            marginTop: 10, fontSize: 11.5, color: Gray600,
            textAlign: "center", ...entree(5),
          }}>
            {en
              ? `${fait.responsabilite || 0} of your ${fait.total} bullets read that way.`
              : `${fait.responsabilite || 0} de tes ${fait.total} puces sont dans ce cas.`}
          </div>
        )}

        <button onClick={onGo} style={{
          ...B({
            width: "100%", marginTop: 18, padding: "15px 22px",
            borderRadius: RadiusPill, minHeight: 48,
            background: `linear-gradient(135deg, ${Purple}, ${Magenta})`,
            color: "#fff", fontFamily: Sans, fontWeight: 600, fontSize: 14,
            transition: Trans(["background", "opacity", "transform"], "fast"),
            ...entree(6),
          })
        }}>{T.cc_cta || (en ? "Fix this line with Nuvi" : "Corriger cette ligne avec Nuvi")}</button>

        <button onClick={onClose} style={{
          ...B({
            width: "100%", marginTop: 8, padding: "12px",
            background: "transparent", color: Gray600,
            fontFamily: Sans, fontSize: 12.5, minHeight: 44,
            ...entree(6),
          })
        }}>{T.cc_plus_tard || (en ? "Later" : "Plus tard")}</button>

        <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      </div>
    </div>
  ), document.body);
}
