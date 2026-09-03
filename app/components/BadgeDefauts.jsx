"use client";

// Le compagnon porte le compte de ce qui cloche dans le CV.
//
// POURQUOI SUR LE COMPAGNON, ET PAS AILLEURS
//
// Le controle avant telechargement attrape un CV casse au dernier moment.
// C'est necessaire, et c'est tard : la personne a passe une heure sur un
// document dont trois champs etaient coupes depuis l'import, et elle
// l'apprend au moment de partir. Le compagnon, lui, est la depuis le debut,
// dans le coin de l'ecran, et il est cense veiller. C'est sa raison d'etre.
// Un compagnon qui regarde un intitule "Account Manager (cadratin)" pendant
// une heure sans rien dire n'est pas un compagnon, c'est une decoration.
//
// CE QU'IL DIT, ET CE QU'IL NE DIT PAS
//
// Un chiffre. Pas une expression triste, pas une animation, pas un message :
// une expression se joue une fois et s'oublie, un chiffre reste tant que le
// probleme reste, et disparait quand il est corrige. C'est la seule forme
// qui ne mente jamais et qui ne harcele jamais.
//
// Le chiffre ne compte que les ACCIDENTS de structure - champs coupes,
// entrees creuses, doublons - jamais la qualite du contenu. "Ton accroche est
// fade" est un jugement, il appartient au coach, et un badge qui le porterait
// resterait allume pour toujours.
//
// IL VIT A COTE DU BOUTON DU COMPAGNON, PAS DEDANS
//
// Un bouton dans un bouton n'est pas du HTML valide, et le bouton du
// compagnon se laisse deplacer a la souris : un enfant cliquable y aurait
// declenche le glissement. Le badge est donc un frere, en position fixe, qui
// suit les memes coordonnees.

import { CoralText } from "./tokens";

export default function BadgeDefauts({ compte = 0, mob = false, coachPos = null, onClick, locale = "fr" }) {
  if (!compte) return null;
  const taille = mob ? 90 : 140;
  // LA CIBLE FAIT 44 PIXELS, LA PASTILLE EN FAIT 24
  //
  // La suite qui mesure les commandes sur telephone a refuse la premiere
  // version : 31x24, sous le plancher de 44px du depot. Sous ce plancher, le
  // doigt couvre plus que la cible et on tape a cote. On ne grossit pas la
  // pastille, qui doit rester un chiffre discret sur le compagnon : c'est le
  // bouton qui fait 44 sur 44, transparent, et la pastille est dessinee au
  // centre. La position vise donc le centre du bouton, decale d'autant.
  const CIBLE = 44;
  const decal = (CIBLE - 24) / 2;
  // Le coin haut droit du cercle du compagnon, qu'il ait ete deplace ou non.
  const position = coachPos
    ? { left: coachPos.x + taille - 26 - decal, top: coachPos.y + 2 - decal }
    : { right: 24 + 6 - decal, bottom: 24 + taille - 24 - decal };
  const libelle = locale === "en"
    ? compte + (compte === 1 ? " thing to fix in the CV" : " things to fix in the CV")
    : compte + (compte === 1 ? " chose a corriger dans le CV" : " choses a corriger dans le CV");

  return (
    <button
      type="button"
      data-nuvi="badge-defauts"
      data-nuvi-compte={compte}
      aria-label={libelle}
      title={libelle}
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (onClick) onClick(); }}
      style={{
        position: "fixed", ...position, zIndex: 91,
        width: CIBLE, height: CIBLE, padding: 0,
        background: "transparent", border: "none", cursor: "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <span aria-hidden="true" style={{
        minWidth: 24, height: 24, padding: "0 7px", boxSizing: "border-box",
        borderRadius: 999, border: "2px solid var(--nuvi-cream, #faf8f3)",
        // Encre corail calibree, sur creme : c'est du texte, il prend le
        // jeton -Text. Le fond est le fond de page, pas un aplat corail.
        background: "var(--nuvi-paper, #fff)", color: CoralText,
        fontFamily: "inherit", fontSize: 12, fontWeight: 700,
        lineHeight: "20px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}>{compte}</span>
    </button>
  );
}
