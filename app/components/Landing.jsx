"use client";

import React, { useEffect, useRef, useState } from "react";
import { destinationDuRetour, destinationDUneAppInstallee } from "../authReturn";
import ScanHero from "./ScanHero";
import ScanEssai from "./ScanEssai";
import Morph from "./Morph";
import LandingCV from "./LandingCV";
import { Magnetic } from "./motion";

/**
 * LA VITRINE
 *
 * thenuvi.com ouvrait directement dans un editeur de CV. Quelqu'un qui
 * arrive par un lien voyait un outil sans savoir ce qu'il fait, pour qui,
 * ni pourquoi rester. Et l'ecran qu'on juge - celui qu'on partage, celui
 * qu'un jury regarde - etait le meme que celui ou l'on travaille sous
 * pression a onze heures du soir. Les deux ne peuvent pas etre bons en meme
 * temps : l'un doit convaincre, l'autre doit se faire oublier.
 *
 * CE QUE CETTE PAGE DOIT FAIRE, DANS L'ORDRE
 *
 *   1. Dire en une phrase ce que c'est. Pas une promesse, un mecanisme.
 *   2. MONTRER le mecanisme. Un CV passe devant un logiciel de tri qui n'en
 *      lit qu'une partie : c'est ca, le produit, et c'est invisible partout
 *      ailleurs. C'est le seul moment ou l'on peut le rendre visible.
 *   3. Donner la seule preuve qui compte : ce que le robot a retenu.
 *   4. Demander, une seule fois, en bas.
 *
 * Rien ici n'appelle l'IA. Tout est joue en local : la page doit s'ouvrir
 * instantanement pour quelqu'un qui n'a encore aucune raison d'attendre.
 */

const T = {
  en: {
    kicker: "The CV that gets past the ATS",
    h1a: "Most CVs are rejected",
    h1b: "before a human reads them.",
    sub: "Before a recruiter sees your CV, a tracking system - an ATS - reads it. It does not read like a person. Nuvi writes for both.",
    cta: "Open Nuvi",
    ctaSub: "Start without an account. Works in your browser.",
    scrollHint: "See how it reads",
    s2kicker: "The machine's turn",
    s2title: "This is what the software sees",
    s2body: "A tracking system does not read your CV. It extracts fields. What it cannot place, it drops - and what it drops was never in front of a human.",
    s3kicker: "Who this is for",
    s3title: "The jobs nobody writes templates for.",
    s3body: "CV tools are built for engineers and consultants. Most people are not. Nuvi is written for the shifts, the rounds and the rotas.",
    finalTitle: "Your turn.",
    finalSub: "Paste a job ad. Get the CV that matches it.",
    finalCta: "Open Nuvi",
    foot: "Your CV stays on your device unless you sign in to sync it.",
    kept: "What the software kept",
    dropped: "What it dropped",
    word: "word",
    words: "words",
    droppedNone: "nothing",
    scanLead: "Watch a tracking system read a CV.",
    keptAll: "all of it",
    keptNone: "nothing",
    essaiLead: "Now put a line of your own CV through it",
    essaiHolder: "Hard-working team player with excellent communication skills",
    essaiReset: "Back to the example",
    essaiPrive: "Nothing leaves your browser. No account, no upload, nothing stored.",
    answerLead: "The same person, written so the machine can file it.",
    cvLead: "This is what comes out",
    cvTitle: "A whole CV, aimed at one job ad, in a file you can send.",
    cvBody: "Not one sentence - every section. Paste the ad you are going for, and Nuvi writes the CV for that ad, then hands you the file.",
    morphLead: "Watch the same facts re-file themselves",
    morphNote: "Not one of these adds anything. The years are the same years, the work is the same work. Only the shape changed, and with it whether the software can put it anywhere.",
    answerTitle: "Nothing invented. Only re-filed.",
    answerBody: "Ten years is still ten years. The job title is one the software recognises, the result is a number instead of an adjective. Same facts, different fate.",
  },
  fr: {
    kicker: "Le CV qui passe l'ATS",
    h1a: "La plupart des CV sont ecartes",
    h1b: "avant qu'un humain les lise.",
    sub: "Avant qu'un recruteur voie ton CV, un logiciel de tri - un ATS - le lit. Il ne lit pas comme une personne. Nuvi ecrit pour les deux.",
    cta: "Ouvrir Nuvi",
    ctaSub: "Commence sans compte. Tout se passe dans ton navigateur.",
    scrollHint: "Voir comment il lit",
    s2kicker: "Au tour de la machine",
    s2title: "Voila ce que le logiciel voit",
    s2body: "Un logiciel de tri ne lit pas ton CV. Il en extrait des champs. Ce qu'il n'arrive pas a ranger, il l'ecarte - et ce qu'il ecarte n'est jamais passe devant un humain.",
    s3kicker: "Pour qui",
    s3title: "Les metiers pour qui personne n'ecrit de modele.",
    s3body: "Les outils de CV sont faits pour les ingenieurs et les consultants. La plupart des gens ne le sont pas. Nuvi est ecrit pour les services, les tournees et les plannings.",
    finalTitle: "A toi.",
    finalSub: "Colle une annonce. Recupere le CV qui lui correspond.",
    finalCta: "Ouvrir Nuvi",
    foot: "Ton CV reste sur ton appareil, sauf si tu te connectes pour le synchroniser.",
    kept: "Ce que le logiciel a retenu",
    dropped: "Ce qu'il a ecarte",
    word: "mot",
    words: "mots",
    droppedNone: "rien",
    scanLead: "Regarde un logiciel de tri lire un CV.",
    keptAll: "tout",
    keptNone: "rien",
    essaiLead: "Maintenant, passe une ligne de ton CV",
    essaiHolder: "Serieux et motive, dote d'un excellent relationnel",
    essaiReset: "Revenir a l'exemple",
    essaiPrive: "Rien ne sort de ton navigateur. Pas de compte, pas d'envoi, rien d'enregistre.",
    answerLead: "La meme personne, ecrite pour que la machine sache la ranger.",
    cvLead: "Voila ce qui en sort",
    cvTitle: "Un CV entier, vise sur une annonce, dans un fichier que tu peux envoyer.",
    cvBody: "Pas une phrase - toutes les sections. Colle l'annonce que tu vises, Nuvi ecrit le CV pour elle, et te rend le fichier.",
    morphLead: "Regarde les memes faits se ranger autrement",
    morphNote: "Aucun n'ajoute quoi que ce soit. Les annees sont les memes annees, le travail est le meme travail. Seule la forme a change, et avec elle le fait que le logiciel sache ou la mettre.",
    answerTitle: "Rien d'invente. Juste range autrement.",
    answerBody: "Dix ans restent dix ans. L'intitule est un que le logiciel connait, le resultat est un chiffre au lieu d'un adjectif. Memes faits, autre sort.",
  },
};

// LE MECANISME, RENDU VISIBLE
//
// Les champs qu'un logiciel de tri cherche vraiment, dans l'ordre ou il les
// cherche. "trouve: false" n'est pas une mise en scene : c'est ce qui arrive
// a un CV ecrit pour l'oeil humain, ou l'intitule est une formule et les
// resultats sont des adjectifs.
// LES FAITS QUI SE RANGENT AUTREMENT
//
// Chaque paire est le MEME fait, ecrit deux fois. A gauche la formule qu'un
// logiciel de tri ne sait pas ranger, a droite la forme qu'il range. Rien
// n'est ajoute : "une decennie" et "10 ans" sont la meme duree, "a ameliore
// les resultats" et "78% de marge" decrivent le meme travail. C'est la regle
// du produit, et elle vaut aussi pour sa vitrine - une paire qui inventerait
// une competence rendrait toute la page malhonnete.
const PAIRES = [
  { avant: { en: "a decade of experience", fr: "une decennie d'experience" },
    apres: { en: "10 years", fr: "10 ans" } },
  { avant: { en: "improved the business", fr: "a ameliore les resultats" },
    apres: { en: "78% beverage GP", fr: "78% de marge boissons" } },
  { avant: { en: "hospitality professional", fr: "professionnel de la restauration" },
    apres: { en: "Bar Manager", fr: "Barman responsable" } },
  { avant: { en: "led a large team", fr: "a encadre une grande equipe" },
    apres: { en: "team of 12", fr: "equipe de 12" } },
];

// LE BANDEAU : LES METIERS POUR QUI NUVI EXISTE
//
// Ce ne sont pas des mots pris au hasard pour faire du mouvement. Ce sont
// les metiers que le produit sert vraiment, et ceux que les outils de CV
// ignorent - on ecrit des modeles pour ingenieurs et consultants, pas pour
// un aide-soignant ou un preparateur de commandes. Les nommer, c'est dire
// a qui l'on parle avant meme la premiere phrase.
const METIERS = {
  en: ["Waiter", "Carer", "Delivery driver", "Sales assistant", "Warehouse operative",
       "Receptionist", "Chef de partie", "Bar Manager", "Cleaner", "Security officer",
       "Teaching assistant", "Admin assistant"],
  fr: ["Serveur", "Aide-soignant", "Chauffeur-livreur", "Vendeuse", "Preparateur de commandes",
       "Receptionniste", "Cuisinier", "Barman", "Agent d'entretien", "Agent de securite",
       "Assistant d'education", "Assistant administratif"],
};



function useVu(ref, seuil = 0.35) {
  const [vu, setVu] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === "undefined") { setVu(true); return undefined; }
    const o = new IntersectionObserver(
      (entrees) => { if (entrees.some((e) => e.isIntersecting)) setVu(true); },
      { threshold: seuil }
    );
    o.observe(el);
    // Un filet : passe trois secondes, on montre, signal ou pas. Une section
    // qui ne s'affiche jamais parce qu'un observateur s'est tu est pire que
    // pas d'animation du tout.
    const t = setTimeout(() => setVu(true), 3000);
    return () => { o.disconnect(); clearTimeout(t); };
  }, [ref, seuil]);
  return vu;
}

export default function Landing({ lang = "en" }) {
  const t = T[lang] || T.en;
  const refScan = useRef(null);
  const refApres = useRef(null);
  const vuScan = useVu(refScan);
  const vuApres = useVu(refApres);

  // Un retour de connexion atterrit ici parce que le fournisseur ne connait
  // que la racine du domaine. On le relaie vers l'application, requete et
  // fragment intacts, avant meme de peindre : sinon la personne voit une
  // vitrine au lieu d'etre connectee.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const dest = destinationDuRetour(window.location.search, window.location.hash)
      || destinationDUneAppInstallee(window.location.search);
    if (dest) window.location.replace(dest);
  }, []);

  const Ink = "var(--nuvi-ink, #0a0a0a)";
  const Muted = "var(--nuvi-ink-muted, #5a5a62)";
  const Hair = "var(--nuvi-hairline, #e8e3d6)";
  const Serif = "'Fraunces', 'DM Serif Display', Georgia, serif";
  const Sans = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  // LE BOUTON EST AIMANTE
  //
  // Le composant existait deja et servait dans l'application ; la vitrine ne
  // l'utilisait pas. Il tire le bouton vers le curseur quand on l'approche,
  // puis le laisse revenir.
  //
  // Ce n'est pas qu'un ornement : la cible devient plus facile a atteindre,
  // puisqu'elle vient au-devant du geste. C'est la seule commande de la page
  // qui compte, et elle merite d'etre celle qui repond le mieux.
  //
  // Deux elements, et c'est necessaire : l'aimant deplace un span exterieur,
  // le bouton lui-meme se souleve au survol. Sur un seul element, les deux
  // transform se remplaceraient l'un l'autre - l'aimantation ecraserait le
  // soulevement, ou l'inverse, selon l'ordre.
  //
  // Le composant ignore les pointeurs tactiles et le mouvement refuse : sur
  // telephone il ne se passe rien du tout, ce qui est correct - il n'y a pas
  // de curseur a approcher.
  // `centre` n'est pas un detail de style : l'enveloppe aimantee est un bloc
  // flex, et un bloc flex ignore le text-align de sa section. Cale en
  // flex-start, le bouton de la derniere section partait se coller au bord
  // gauche de la page pendant que son titre restait centre.
  const lien = (etiquette, sousTitre, gros, centre) => (
    <div style={{
      display: "flex", flexDirection: "column", gap: 9,
      alignItems: centre ? "center" : "flex-start",
    }}>
      <Magnetic as="span" strength={0.22} radius={110} style={{ display: "inline-flex" }}>
      <a href="/app" className="nuvi-cta" style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        minHeight: gros ? 56 : 48, padding: gros ? "0 34px" : "0 26px",
        borderRadius: 999, textDecoration: "none",
        background: "linear-gradient(135deg,#5b3df5,#b91c8c)", color: "#fff",
        fontFamily: Sans, fontSize: gros ? 17 : 15, fontWeight: 600,
        letterSpacing: "-0.01em",
        boxShadow: "0 8px 26px rgba(91,61,245,.26)",
      }}>{etiquette}</a>
      </Magnetic>
      {sousTitre && (
        <span style={{ fontFamily: Sans, fontSize: 12.5, color: Muted }}>{sousTitre}</span>
      )}
    </div>
  );

  const eyebrow = (txt) => (
    <div style={{
      fontFamily: Sans, fontSize: 10.5, fontWeight: 700,
      letterSpacing: "0.16em", textTransform: "uppercase",
      color: Muted, marginBottom: 14,
    }}>{txt}</div>
  );

  return (
    <div className="nuvi-page" style={{ fontFamily: Sans, color: Ink }}>
      {/* Manchette, la meme que dans l'application : les deux surfaces
          doivent se lire comme un seul produit. */}
      <header style={{
        position: "sticky", top: 0, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px clamp(16px, 4vw, 40px)",
        borderBottom: "1px solid " + Hair,
        background: "var(--nuvi-cream, #faf8f3)",
      }}>
        <span style={{ fontFamily: Serif, fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>Nuvi</span>
        <a href="/app" className="nuvi-fleche" style={{
          fontFamily: Sans, fontSize: 13, fontWeight: 600, color: Ink,
          textDecoration: "none", minHeight: 44, display: "inline-flex", alignItems: "center",
          gap: 6, padding: "0 6px",
        }}>{t.cta}<span aria-hidden="true">&rarr;</span></a>
      </header>

      {/* ===== 1. CE QUE C'EST ===== */}
      <section style={{
        minHeight: "min(92vh, 820px)",
        display: "flex", flexDirection: "column",
        alignItems: "flex-start", justifyContent: "center", textAlign: "left",
        padding: "clamp(48px, 9vh, 96px) clamp(18px, 5vw, 56px)",
        maxWidth: 1180, margin: "0 auto", width: "100%", boxSizing: "border-box",
        borderBottom: "1px solid " + Hair,
      }}>
        {/* LA DEMONSTRATION A PRIS LA PLACE DE L'AFFIRMATION
            Le heros disait "la plupart des CV sont ecartes avant qu'un humain
            les lise". C'etait vrai, et ca ne faisait rien voir : on lisait un
            argument. Ici la chose se produit sous les yeux - une ligne de
            lecture traverse une phrase de CV, et ce que le logiciel ne sait
            pas ranger meurt sur son passage.
            Le titre vient APRES, comme legende de ce qu'on vient de voir. */}
        <div className="nuvi-arrivee" style={{ "--pose": "0ms" }}>{eyebrow(t.scanLead)}</div>
        <div className="nuvi-arrivee" style={{ "--pose": "90ms", width: "100%" }}>
          <ScanEssai lang={lang}
            labels={{ kept: t.kept, dropped: t.dropped, word: t.word, words: t.words,
              droppedNone: t.droppedNone, keptNone: t.keptNone }}
            textes={{ lead: t.essaiLead, placeholder: t.essaiHolder,
              reset: t.essaiReset, prive: t.essaiPrive }}/>
        </div>
        {/* LE TITRE ET SA SUITE, COTE A COTE
            Empiles, ils tenaient sur 26 puis 52 caracteres et laissaient plus
            de la moitie de l'ecran vide sous le balayage. Le titre passe a
            gauche, en grand ; la phrase et l'appel a l'action tiennent la
            colonne de droite. La bande sous le balayage est enfin occupee. */}
        <div className="nuvi-duo nuvi-arrivee"
          style={{ "--pose": "260ms", marginTop: 44 }}>
          <h1 className="nuvi-titre-geant" style={{
            fontFamily: Serif, fontWeight: 400,
            fontSize: "clamp(26px, 5.2vw, 66px)",
            lineHeight: 1.04, letterSpacing: "-0.035em",
            margin: 0,
          }}>
            {t.h1a}{" "}
            <em style={{
              fontStyle: "italic",
              background: "linear-gradient(135deg,#5b3df5,#b91c8c)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text", paddingRight: "0.12em",
            }}>{t.h1b}</em>
          </h1>
          <div>
            <p style={{
              fontSize: "clamp(14px, 1.6vw, 18px)", lineHeight: 1.6,
              color: Muted, maxWidth: 40 + "ch", margin: "0 0 26px",
            }}>{t.sub}</p>
            {lien(t.cta, t.ctaSub, true)}
          </div>
        </div>
      </section>

      {/* Le bandeau. Deux copies : quand la premiere quitte l'ecran, la
          seconde est exactement a sa place de depart et la boucle ne se voit
          pas. La seconde est aria-hidden - un lecteur d'ecran n'a pas a lire
          deux fois la meme liste. */}
      <div style={{
        borderBottom: "1px solid " + Hair,
        overflow: "hidden", padding: "18px 0",
        maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
      }}>
        <div className="nuvi-bandeau">
          {[0, 1].map((copie) => (
            <div key={copie} aria-hidden={copie === 1 ? "true" : undefined}
              style={{ display: "flex", flexShrink: 0 }}>
              {(METIERS[lang] || METIERS.en).map((m) => (
                <span key={copie + m} style={{
                  fontFamily: Serif, fontSize: "clamp(15px, 2vw, 22px)",
                  color: Muted, whiteSpace: "nowrap",
                  padding: "0 clamp(14px, 2.4vw, 28px)",
                  display: "inline-flex", alignItems: "center", gap: "clamp(14px, 2.4vw, 28px)",
                }}>
                  {m}
                  <span aria-hidden="true" style={{
                    width: 4, height: 4, borderRadius: "50%",
                    background: "var(--nuvi-purple, #5b3df5)", opacity: 0.45,
                  }}/>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ===== 2. LA REPONSE, AVEC LE MEME MECANISME =====

          Cette section montrait un tableau d'extraction. Depuis que le heros
          FAIT le balayage, ce tableau redisait ce qu'on venait de voir, en
          moins bien - deux preuves du meme fait, dont l'une rangee dans une
          grille.

          Elle repond maintenant : la meme phrase, reecrite, et la meme ligne
          de lecture qui la traverse. Cette fois rien ne meurt. La symetrie
          fait tout le travail d'explication, et on compare sans avoir a lire
          une comparaison. */}
      <section ref={refScan} className="nuvi-scroll-in" style={{
        padding: "clamp(56px, 12vh, 130px) clamp(18px, 5vw, 56px)",
        borderBottom: "1px solid " + Hair,
        maxWidth: 1180, margin: "0 auto", width: "100%", boxSizing: "border-box",
      }}>
        {eyebrow(t.answerLead)}
        <ScanHero lang={lang} mode="garde" pilote
          labels={{ kept: t.kept, dropped: t.dropped, word: t.word, words: t.words,
            droppedNone: t.droppedNone, keptAll: t.keptAll }}/>
        <div className="nuvi-duo" style={{ marginTop: 40 }}>
          <h2 className="nuvi-titre-geant" style={{
            fontFamily: Serif, fontWeight: 400,
            fontSize: "clamp(26px, 5vw, 62px)", lineHeight: 1.06,
            letterSpacing: "-0.032em", margin: 0,
          }}>{t.answerTitle}</h2>
          <p style={{
            fontSize: "clamp(14px, 1.6vw, 18px)", lineHeight: 1.62,
            color: Muted, maxWidth: 42 + "ch", margin: 0,
          }}>{t.answerBody}</p>
        </div>
      </section>

      {/* ===== 2 bis. LA TRANSFORMATION, SUR PLACE =====

          Le heros montre une phrase mourir ; la section precedente montre sa
          reecriture survivre. Entre les deux, le rapprochement restait a la
          charge du visiteur : retenir la premiere en descendant vers la
          seconde. Presque personne ne le fait.

          Ici les deux formes occupent le meme endroit et l'une devient
          l'autre. C'est la these du produit - rien d'invente, seulement range
          autrement - rendue visible en une seconde, sur des faits qu'on a
          deja lus plus haut. */}
      <section className="nuvi-scroll-in" style={{
        padding: "clamp(56px, 12vh, 130px) clamp(18px, 5vw, 56px)",
        borderBottom: "1px solid " + Hair,
        maxWidth: 1180, margin: "0 auto", width: "100%", boxSizing: "border-box",
      }}>
        <Morph paires={PAIRES} lang={lang}
          labels={{ lead: t.morphLead, note: t.morphNote }}/>
      </section>

      {/* ===== 2 ter. LE DOCUMENT, ENFIN A L'ECRAN =====

          La page parlait de CV pendant six sections sans jamais en montrer
          un : on arrivait au bouton sans avoir vu ce qu'on allait obtenir.

          Cette section ne rejoue PAS le morphing. Lui montre ce qui change
          dans une phrase ; celle-ci montre ce que la page n'avait jamais
          dit - l'etendue et la sortie. Un CV entier, vise sur une annonce
          precise, et un fichier a envoyer. Si elle redisait "formule molle
          contre fait range", elle serait le morphing avec un cadre autour,
          et il faudrait la retirer. */}
      <section className="nuvi-scroll-in" style={{
        padding: "clamp(56px, 12vh, 130px) 0 clamp(56px, 12vh, 130px) clamp(18px, 5vw, 56px)",
        borderBottom: "1px solid " + Hair,
        maxWidth: 1180, margin: "0 auto", width: "100%", boxSizing: "border-box",
        overflow: "hidden",
      }}>
        {/* Pas de grille en style en ligne : elle l'emporterait sur la
            classe, et la requete de media qui passe a deux colonnes ne
            gagnerait jamais. Le document restait donc sous le texte, avec la
            moitie droite de l'ecran vide - exactement le defaut qu'on
            corrigeait. */}
        <div className="nuvi-duo nuvi-duo-doc" style={{ alignItems: "center" }}>
          <div>
            {eyebrow(t.cvLead)}
            <h2 className="nuvi-titre-geant" style={{
              fontFamily: Serif, fontWeight: 400,
              fontSize: "clamp(26px, 4.6vw, 58px)", lineHeight: 1.05,
              letterSpacing: "-0.032em", margin: "0 0 16px",
            }}>{t.cvTitle}</h2>
            <p style={{
              fontSize: "clamp(14px, 1.6vw, 18px)", lineHeight: 1.62,
              color: Muted, maxWidth: 40 + "ch", margin: 0,
            }}>{t.cvBody}</p>
          </div>
          {/* Le document deborde volontairement du cadre : coupe par le bord,
              il se lit comme un objet pose sur la page et non comme une
              vignette centree dans une boite. */}
          <div style={{ justifySelf: "start", marginRight: "-14vw" }}>
            <LandingCV lang={lang}/>
          </div>
        </div>
      </section>

      {/* ===== 3. POUR QUI =====
          Le second tableau disait la meme chose que le premier. Il a laisse la
          place a la seule information que la page n'avait pas encore donnee :
          a qui Nuvi s'adresse. Les outils de CV ecrivent des modeles pour
          ingenieurs et consultants ; le bandeau au-dessus nomme les autres. */}
      <section ref={refApres} className="nuvi-scroll-in" style={{
        padding: "clamp(56px, 12vh, 130px) clamp(18px, 5vw, 56px)",
        borderBottom: "1px solid " + Hair,
        maxWidth: 1180, margin: "0 auto", width: "100%", boxSizing: "border-box",
      }}>
        {eyebrow(t.s3kicker)}
        {/* Le titre tenait sur 22 caracteres a 48px et laissait 58% de
            l'ecran vide. Il prend la colonne large, le texte la colonne
            etroite : la page occupe enfin sa largeur. */}
        <div className="nuvi-duo">
          <h2 className="nuvi-titre-geant" style={{
            fontFamily: Serif, fontWeight: 400,
            fontSize: "clamp(30px, 6.6vw, 84px)", lineHeight: 1.03,
            letterSpacing: "-0.035em", margin: 0,
          }}>{t.s3title}</h2>
          <p style={{
            fontSize: "clamp(14px, 1.6vw, 18px)", lineHeight: 1.62,
            color: Muted, maxWidth: 42 + "ch", margin: 0,
          }}>{t.s3body}</p>
        </div>
      </section>

      {/* ===== 4. LA DEMANDE ===== */}
      <section style={{
        padding: "clamp(64px, 13vh, 140px) clamp(18px, 5vw, 40px)",
        textAlign: "center",
      }}>
        <h2 className="nuvi-titre-geant" style={{
          fontFamily: Serif, fontWeight: 400,
          fontSize: "clamp(38px, 9vw, 116px)", lineHeight: 1.0,
          letterSpacing: "-0.04em", margin: "0 0 18px",
        }}>{t.finalTitle}</h2>
        <p style={{
          fontSize: "clamp(14px, 1.6vw, 17px)", lineHeight: 1.55,
          color: Muted, margin: "0 auto 32px", maxWidth: 44 + "ch",
        }}>{t.finalSub}</p>
        {lien(t.finalCta, t.foot, true, true)}
      </section>
    </div>
  );
}
