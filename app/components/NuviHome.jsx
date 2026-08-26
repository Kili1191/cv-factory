"use client";

import React, { useState, useEffect, useRef } from "react";
import NuviCompanion from "./NuviCompanion";
import { Reveal, WordReveal, Magnetic, Aurora, ScrollProgress, useReducedMotion } from "./motion";

/**
 * NuviHome v5 : Demarrage "avant / apres" (Direction D, verdict panel 2026-05-21)
 *
 * Remplace l'ancien processus (compagnon spin -> texte lettre par lettre 9,5s
 * -> 2 modes Generate/Upload -> chargement). Nouveau flow, 0 token, instantane :
 *
 *   Temps 1 : phrase d'accueil INSTANTANEE (plus de typewriter lent)
 *   Temps 2 : le WOW. Un CV banal se transforme en CV percutant sous les yeux
 *             du visiteur (avant -> apres, reecrit ligne par ligne). Joue 1 fois
 *             automatiquement + bouton "Rejouer". 2 exemples qui alternent.
 *   Temps 3 : le CHOIX, APRES la valeur : "Envie de ca pour le mien" (onGenerate)
 *             / "J'ai deja un CV" (onImport).
 *
 * Aucun appel IA ici : les exemples sont pre-faits en local. L'IA ne se declenche
 * que plus tard, quand le visiteur a fourni de la vraie matiere (modales Adjust,
 * Match, Generate...). Coherent avec la logique anti-gaspillage de tokens.
 *
 * Props identiques a v4 : lang, mob, userName, onGenerate, onImport, onCoachOpen.
 */

const TEXT = {
  fr: {
    title: "Voila ce que je fais aux",
    titleAccent: "CV",
    sub: "Regarde la difference. Aucune inscription, juste un apercu.",
    before: "Avant",
    after: "Apres",
    replay: "Rejouer",
    transforming: "Nuvi reecrit...",
    ctaMain: "Envie de ca pour le mien",
    ctaImport: "J'ai deja un CV",
    coachLabel: "Coach",
  },
  en: {
    // "CV" et non "resume" : Nuvi vise le Royaume-Uni et la France, deux
    // marches ou l'on dit CV. "Resume" est americain, et le bouton juste en
    // dessous disait deja "I already have a CV" - le titre et le bouton se
    // contredisaient sur le mot le plus important de la page.
    title: "Here's what I do to a",
    titleAccent: "CV",
    sub: "See the difference. No signup, just a preview.",
    before: "Before",
    after: "After",
    replay: "Replay",
    transforming: "Nuvi is rewriting...",
    ctaMain: "I want this for mine",
    ctaImport: "I already have a CV",
    coachLabel: "Coach",
  },
};

/**
 * Les 2 exemples avant/apres (alternent a chaque rejouer).
 * "before" = plat, vague, sans chiffres. "after" = percutant, chiffre, verbes
 * d'action. Le contraste DOIT etre fort (condition du panel).
 */
const EXAMPLES = {
  fr: [
    {
      beforeTitle: "Serveur",
      before: "Serveur en restaurant. Je prenais les commandes et je servais les clients.",
      after: "Assure 120 couverts par service sur un rang de 14 tables, avec une vente additionnelle en vins qui a fait monter le ticket moyen de 22%.",
    },
    {
      beforeTitle: "Vendeuse",
      before: "Travail en magasin, aide aux clients et tenue de la caisse.",
      after: "Atteint 118% de l'objectif magasin six mois d'affilee, en convertissant un visiteur sur trois en vente.",
    },
    {
      beforeTitle: "Aide-soignant",
      before: "Je m'occupais des residents dans une maison de retraite.",
      after: "Accompagne 18 residents au quotidien et fait baisser les chutes signalees de 40% en revoyant la ronde de nuit.",
    },
    {
      beforeTitle: "Chauffeur-livreur",
      before: "Livraison de colis pour une entreprise.",
      after: "Effectue 140 livraisons par jour sur trois secteurs, avec 99,2% de remises reussies du premier coup.",
    },
    {
      beforeTitle: "Preparateur de commandes",
      before: "Preparation des commandes dans un entrepot.",
      after: "Prepare 400 commandes par vacation en gardant un taux d'erreur sous 0,3% pendant 18 mois.",
    },
    {
      beforeTitle: "Receptionniste",
      before: "Accueil telephonique et physique des visiteurs.",
      after: "Gere 90 appels et 40 visiteurs par jour, en ramenant l'attente moyenne de 6 a 2 minutes.",
    },
    {
      beforeTitle: "Cuisinier",
      before: "Preparation des plats en cuisine.",
      after: "Tenu le poste grillade sur 200 couverts par service et reduit le gaspillage alimentaire de 25% par le controle des portions.",
    },
    {
      beforeTitle: "Assistant administratif",
      before: "Taches administratives et classement des dossiers.",
      after: "Traite 250 factures par mois sans un seul retard de paiement, en economisant 6 heures par semaine grace aux relances automatisees.",
    },
  ],
  en: [
    {
      beforeTitle: "Waiter",
      before: "Restaurant server. I took orders and served customers.",
      after: "Served 120 covers a night across a 14-table section, lifting average spend 22% through wine upselling.",
    },
    {
      beforeTitle: "Sales assistant",
      before: "Worked in a shop, helped customers and handled the till.",
      after: "Hit 118% of store target six months running, converting one in three walk-ins into a sale.",
    },
    {
      beforeTitle: "Carer",
      before: "Looked after residents in a care home.",
      after: "Cared for 18 residents daily and cut reported falls by 40% by redesigning the night-check routine.",
    },
    {
      beforeTitle: "Delivery driver",
      before: "Delivered parcels for a company.",
      after: "Completed 140 drops a day across three boroughs, holding a 99.2% first-time delivery rate.",
    },
    {
      beforeTitle: "Warehouse operative",
      before: "Worked in a warehouse picking orders.",
      after: "Picked and packed 400 orders a shift, keeping the error rate under 0.3% for 18 months.",
    },
    {
      beforeTitle: "Receptionist",
      before: "Answered the phone and welcomed visitors.",
      after: "Handled 90 calls and 40 visitors a day, cutting average wait time from 6 minutes to 2.",
    },
    {
      beforeTitle: "Chef de partie",
      before: "Worked in a kitchen preparing dishes.",
      after: "Ran the grill section for 200 covers a service and cut food waste 25% through portion control.",
    },
    {
      beforeTitle: "Admin assistant",
      before: "Did administrative tasks and filing.",
      after: "Processed 250 invoices a month with zero late payments, saving six hours a week by automating chasers.",
    },
  ],
};

function balanceText(text) {
  if (!text || typeof text !== "string") return text;
  let t = text;
  t = t.replace(/ ([?!:;»])/g, "\u00A0$1");
  t = t.replace(/« /g, "«\u00A0");
  return t;
}

// LA LIGNE QUI SE REECRIT
//
// Le mot est l'unite, pas la phrase. En faisant disparaitre puis reapparaitre
// un bloc entier, l'oeil voit deux textes ; en changeant mot a mot, il voit UN
// texte qui se corrige. C'est la meme donnee et ce n'est pas la meme promesse.
//
// Les chiffres sortent en dernier, plus gros et colores. Un recruteur balaie
// un CV en six secondes et n'accroche que les intitules, les dates et les
// chiffres : la demonstration doit accrocher l'oeil au meme endroit.
//
// La hauteur est reservee des le depart. Sans cela, la phrase "apres" etant
// plus longue, tout ce qui suit - le bouton principal - sauterait vers le bas
// au moment ou le visiteur s'apprete a cliquer.
function RewriteLine({ avant, apres, phase, mob, reducedMotion }) {
  const texte = phase === "avant" ? avant : apres;
  const mots = String(texte || "").split(/\s+/).filter(Boolean);
  const sorti = phase === "apres";

  return (
    <div style={{
      fontFamily: "'Fraunces', Georgia, serif",
      fontWeight: 400,
      fontSize: mob ? "clamp(22px, 6.2vw, 30px)" : "clamp(30px, 3.6vw, 52px)",
      lineHeight: 1.22,
      letterSpacing: "-0.015em",
      textAlign: "center",
      maxWidth: mob ? "100%" : 940,
      margin: "0 auto",
      color: "var(--nuvi-ink)",
      minHeight: mob ? 132 : 176,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexWrap: "wrap", gap: "0 0.28em",
      padding: mob ? "0 4px" : 0,
    }}>
      {mots.map((m, i) => {
        // Un mot porteur de chiffre : c'est lui qui fait la difference entre
        // un CV qu'on lit et un CV qu'on repose.
        const chiffre = sorti && /\d/.test(m);
        return (
          <span
            key={phase + "-" + i + "-" + m}
            style={{
              display: "inline-block",
              opacity: reducedMotion ? 1 : 0,
              transform: reducedMotion ? "none" : "translateY(0.32em)",
              animation: reducedMotion
                ? "none"
                : `nuviWordIn 520ms cubic-bezier(.22,1,.36,1) ${
                    // Les chiffres attendent que le reste soit pose.
                    (i * 42) + (chiffre ? 260 : 0)
                  }ms forwards`,
              color: chiffre ? "var(--nuvi-magenta)" : "inherit",
              fontWeight: chiffre ? 600 : 400,
              fontStyle: phase === "avant" ? "normal" : "normal",
            }}
          >{m}</span>
        );
      })}
    </div>
  );
}

// LE SCORE QUI GRIMPE
//
// C'est le seul element qui relie le spectacle au mecanisme reel : ce n'est
// pas une jolie phrase qui fait passer un CV, c'est un score de tri. Le
// montrer monter pendant que les mots changent explique le produit sans une
// ligne de texte.
function ScoreClimb({ from, to, go, mob, reducedMotion, label }) {
  const [n, setN] = useState(from);
  useEffect(() => {
    if (!go) { setN(from); return undefined; }
    if (reducedMotion) { setN(to); return undefined; }
    const debut = performance.now();
    const duree = 900;
    let raf = 0;
    const pas = (t) => {
      const k = Math.min(1, (t - debut) / duree);
      // Depart franc, arrivee douce : un compteur qui ralentit en fin de
      // course se lit comme un resultat, pas comme une animation.
      const doux = 1 - Math.pow(1 - k, 3);
      setN(Math.round(from + (to - from) * doux));
      if (k < 1) raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [go, from, to, reducedMotion]);

  const vert = n >= 75;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
      marginTop: mob ? 10 : 16,
      opacity: go ? 1 : 0.5,
      transition: reducedMotion ? "none" : "opacity 500ms ease",
      fontFamily: "'Inter', sans-serif",
    }}>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
        textTransform: "uppercase", color: "var(--nuvi-ink-muted)",
      }}>{label}</span>
      <span style={{
        fontSize: mob ? 22 : 28, fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
        color: vert ? "var(--nuvi-green)" : "var(--nuvi-ink-muted)",
        transition: reducedMotion ? "none" : "color 400ms ease",
      }}>{n}</span>
    </div>
  );
}

export default function NuviHome({
  lang = "en",
  mob = false,
  userName = null,
  onGenerate = () => {},
  onImport = () => {},
  onCoachOpen = () => {},
}) {
  const T = TEXT[lang] || TEXT.fr;
  const examples = EXAMPLES[lang] || EXAMPLES.fr;

  const Cream = "var(--nuvi-cream)";
  const Paper = "var(--nuvi-paper)";
  const Ink = "var(--nuvi-ink)";
  const InkMuted = "var(--nuvi-ink-muted)";
  const Hairline = "var(--nuvi-hairline)";
  const Coral = "var(--nuvi-coral)";
  const Violet = "var(--nuvi-purple)";
  const Magenta = "var(--nuvi-magenta)";

  // exampleIdx : quel exemple afficher (alterne a chaque rejouer)
  const [exampleIdx, setExampleIdx] = useState(0);
  // showAfter : false = on montre le "avant", true = le "apres" reecrit
  const [showAfter, setShowAfter] = useState(false);
  // transforming : pendant la bascule (Nuvi "reecrit")
  const [transforming, setTransforming] = useState(false);
  // entered : petit fade-in d'entree global
  const [entered, setEntered] = useState(false);

  const timers = useRef([]);
  const ex = examples[exampleIdx];

  // QUAND LE MOUVEMENT EST REFUSE, LA DEMONSTRATION EST DEJA FINIE
  //
  // Le coeur de cet ecran est une transformation qui se joue sous les yeux du
  // visiteur : un CV banal devient un CV percutant, ligne apres ligne, en
  // deux secondes. C'est le meilleur argument de l'application, et c'est
  // aussi, precisement, ce que quelqu'un qui a coche "reduire les animations"
  // a demande a ne pas subir.
  //
  // Couper les transitions CSS ne suffit pas : le decompte, lui, continue de
  // tourner, et cette personne attend deux secondes devant une carte vide
  // sans savoir qu'il se passe quelque chose. On lui montre donc le resultat
  // tout de suite. Elle voit la meme chose - la comparaison avant/apres -
  // sans le spectacle.
  const reducedMotion = useReducedMotion();

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };

  // Joue la transformation : montre "avant" 1,2s, bascule "transforming" 0,9s,
  // puis revele "apres".
  const playTransform = (idx) => {
    clearTimers();
    setExampleIdx(idx);
    setTransforming(false);
    if (reducedMotion) {
      setShowAfter(true);
      return;
    }
    setShowAfter(false);
    timers.current.push(setTimeout(() => setTransforming(true), 1200));
    timers.current.push(setTimeout(() => {
      setTransforming(false);
      setShowAfter(true);
    }, 2100));
  };

  // LE PREMIER METIER EST TIRE AU SORT, ET LES SUIVANTS S'ENCHAINENT
  //
  // Huit metiers ordinaires - serveur, aide-soignant, chauffeur-livreur,
  // receptionniste - et chaque visiteur tombe sur un autre. Un exemple de
  // commercial affiche a tout le monde fait croire que l'outil est fait pour
  // les cadres, et les trois quarts des gens passent leur chemin.
  //
  // Le tirage se fait dans un effet, jamais au rendu : Next.js dessine cette
  // page une fois sur le serveur et une fois dans le navigateur, et deux
  // Math.random() differents produisent un ecart d'hydratation - React jette
  // alors le rendu serveur et le refait, avec un clignotement visible.
  //
  // L'enchainement se fait tout seul. Attendre un clic sur "Rejouer" pour
  // montrer un deuxieme metier, c'est ne le montrer a presque personne : on
  // reste quelques secondes sur une page d'accueil, pas assez pour avoir
  // l'idee de cliquer.
  useEffect(() => {
    setEntered(true);
    let vivant = true;
    const tire = Math.floor(Math.random() * examples.length);

    // Le reglage "reduire les animations" est lu par un media query, donc
    // connu un instant APRES le premier rendu. On relance donc la sequence
    // quand la reponse arrive : sans ce declencheur, la toute premiere
    // lecture (false par defaut) resterait figee et le decompte partirait
    // quand meme.
    const t = setTimeout(() => { if (vivant) playTransform(tire); },
      reducedMotion ? 0 : 500);
    timers.current.push(t);

    // Mouvement refuse : on montre UN metier, fixe. Faire defiler huit
    // exemples devant quelqu'un qui a demande le calme est exactement ce
    // qu'il ne veut pas.
    if (reducedMotion) return () => { vivant = false; clearTimers(); };

    // 5,6 secondes par metier : 1,2s pour lire l'avant, 0,9s de bascule, et
    // 3,5s sur l'apres - le temps de lire la phrase ET de voir le score
    // arriver, qui est le dernier element a se poser.
    const boucle = setInterval(() => {
      if (!vivant) return;
      setExampleIdx((i) => {
        const suivant = (i + 1) % examples.length;
        playTransform(suivant);
        return suivant;
      });
    }, 5600);

    return () => { vivant = false; clearInterval(boucle); clearTimers(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  const handleReplay = () => {
    const next = (exampleIdx + 1) % examples.length;
    playTransform(next);
  };

  const cardPad = mob ? "16px 18px" : "20px 22px";
  // C'est ce bloc qui defile, pas la page : l'ecran est en position fixe.
  const scrollRef = useRef(null);
  const lineColBefore = InkMuted;
  const lineColAfter = "#3a3a40";

  return (
    <div
      ref={scrollRef}
      style={{
        position: "fixed",
        inset: 0,
        background: Cream,
        zIndex: 1000,
        overflow: "auto",
        fontFamily: "'Inter', -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        // Le compagnon Coach flotte en bas a droite, au-dessus de tout. Sur
        // telephone il se posait sur le bouton "J'ai deja un CV" : taper la
        // ouvrait le Coach au lieu d'importer son CV, et rien ne le laissait
        // deviner. On reserve la hauteur qu'il occupe - son cercle plus son
        // etiquette - pour que le contenu puisse defiler au clair.
        padding: mob ? "24px 16px 120px" : "32px",
        opacity: entered ? 1 : 0,
        transition: "opacity 500ms ease",
      }}
    >
      <ScrollProgress targetRef={scrollRef}/>
      <Aurora style={{ width: "100%", maxWidth: mob ? "100%" : 720 }}>

        {/* ===== TEMPS 1 : ACCUEIL (instantane) ===== */}
        <div style={{ textAlign: "center", marginBottom: mob ? 18 : 24 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <NuviCompanion
              size={mob ? 56 : 64}
              mode={transforming ? "loading" : "speaking"}
              cycleDuration={transforming ? 30 : 4}
            />
          </div>
          <div style={{
            color: Ink,
            fontFamily: "'Fraunces', 'DM Serif Display', Georgia, serif",
            fontSize: mob ? 24 : 30,
            fontWeight: 400,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            marginBottom: 6,
          }}>
            <WordReveal text={T.title}/>{" "}
            <em style={{
              fontStyle: "italic",
              color: Magenta,
              background: "linear-gradient(135deg, " + Violet + " 0%, " + Magenta + " 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            // PAS DE WordReveal ICI, ET C'EST UNE REGLE, PAS UN OUBLI.
            //
            // Ce mot est peint par un degrade decoupe sur la forme des
            // lettres : le texte lui-meme est transparent, et c'est le fond
            // de l'element qui se voit a travers. Un mot decoupe en spans
            // enfants garde la transparence mais perd le fond - chaque span
            // peint dans sa propre couche, et le mot disparait purement et
            // simplement de la page.
            //
            // C'est arrive : "Voila ce que je fais aux ." est parti en
            // production. Le test "l'accueil ne cache aucun texte" verifie
            // desormais qu'aucun element transparent n'est prive de son fond.
            }}>{T.titleAccent}</em>.
          </div>
          <Reveal as="p" delay={260} y={12} style={{
            color: InkMuted,
            fontSize: mob ? 13 : 14,
            margin: 0,
            lineHeight: 1.5,
          }}>{balanceText(T.sub)}</Reveal>
        </div>

        {/* ===== TEMPS 2 : LA PHRASE QUI SE REECRIT =====

            AVANT : deux cartes cote a cote, 326x197, texte a 13px. Mesure sur
            un ecran de 1440 : le titre a 30px, 40% de la surface occupee,
            295px de vide au-dessus. Ce qui PROUVE le produit etait rendu a la
            taille d'un tweet.

            Deux cartes DECRIVENT la transformation. Une phrase qui se reecrit
            sous les yeux la FAIT. C'est la meme information, a la difference
            pres qu'on n'a plus rien a expliquer.

            Les chiffres arrivent en dernier et plus gros : c'est ce que l'oeil
            d'un recruteur accroche en six secondes, donc ce que l'oeil du
            visiteur doit accrocher ici. */}
        <div style={{ minHeight: mob ? 200 : 240 }}>
          <RewriteLine
            avant={ex.before}
            apres={ex.after}
            phase={showAfter ? "apres" : transforming ? "bascule" : "avant"}
            mob={mob}
            reducedMotion={reducedMotion}
          />
          {/* Le score suit la phrase au lieu de flotter dessus. Pose en absolu
              en haut a droite, il se posait sur un mot - constate a l'ecran, a
              1440 comme a 1280. Ici il se lit comme la consequence de ce qu'on
              vient de voir, ce qui est exactement ce qu'il est. */}
          <ScoreClimb
            from={34} to={91} go={showAfter} mob={mob}
            reducedMotion={reducedMotion}
            label={T.atsLabel || "ATS"}
          />
        </div>

        {/* Bouton Rejouer (apparait apres la 1ere transformation) */}
        {/* 48px, et non 28 : "Rejouer" ne faisait que 16px de haut, ce qui
            est sous le plancher tactile. La hauteur du conteneur est reservee
            en permanence pour que rien ne saute quand le bouton apparait. */}
        <div style={{ textAlign: "center", height: 48, marginTop: 12 }}>
          {showAfter && (
            <button
              onClick={handleReplay}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                minHeight: 44, padding: "0 14px", boxSizing: "border-box",
                background: "transparent", border: "none", cursor: "pointer",
                color: InkMuted, fontSize: 12, fontWeight: 500,
                fontFamily: "'Inter', sans-serif",
                animation: "nuviFadeIn 400ms ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = Violet; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = InkMuted; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 4v4h4"/>
              </svg>
              {T.replay}
            </button>
          )}
        </div>

        {/* ===== TEMPS 3 : LE CHOIX (apres la valeur) ===== */}
        <Reveal delay={120} y={16} style={{
          display: "flex",
          flexDirection: mob ? "column" : "row",
          gap: 10,
          maxWidth: mob ? "100%" : 440,
          margin: "20px auto 0",
        }}>
          <Magnetic as="span" style={{ flex: 1, display: "flex" }}>
          <button
            onClick={onGenerate}
            style={{
              flex: 1,
              background: "linear-gradient(135deg, " + Violet + " 0%, " + Magenta + " 100%)",
              color: "#fff", border: "none", borderRadius: 12,
              padding: "13px 18px", minHeight: 44, boxSizing: "border-box",
              fontSize: 14, fontWeight: 500,
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
              boxShadow: "0 4px 16px rgba(91,61,245,0.28)",
              transition: "transform 180ms ease, box-shadow 180ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(91,61,245,0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(91,61,245,0.28)";
            }}
          >{T.ctaMain}</button>
          </Magnetic>

          <Magnetic as="span" strength={0.18} style={{ flex: 1, display: "flex" }}>
          <button
            onClick={onImport}
            style={{
              flex: 1,
              background: Paper, color: Ink,
              border: "1px solid " + Hairline, borderRadius: 12,
              padding: "13px 18px", minHeight: 44, boxSizing: "border-box",
              fontSize: 14, fontWeight: 500,
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
              transition: "border-color 180ms ease, transform 180ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = Coral;
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = Hairline;
              e.currentTarget.style.transform = "";
            }}
          >{T.ctaImport}</button>
          </Magnetic>
        </Reveal>

      </Aurora>

      {/* ===== COACH FLOTTANT (bas-droite) ===== */}
      <button
        onClick={onCoachOpen}
        aria-label={T.coachLabel}
        style={{
          position: "fixed",
          ...(mob ? { right: 16, bottom: 16 } : { right: 24, bottom: 24 }),
          zIndex: 90,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          padding: 0, background: "transparent", border: "none", cursor: "pointer",
          fontFamily: "'Inter', -apple-system, sans-serif",
          transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
          userSelect: "none",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px) scale(1.05)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
      >
        <span aria-hidden="true" style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, position: "relative",
          width: mob ? 70 : 96, height: mob ? 70 : 96,
        }}>
          <span style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: "radial-gradient(circle at 50% 55%, rgba(91, 61, 245, 0.35) 0%, rgba(185, 28, 140, 0.20) 35%, rgba(91, 61, 245, 0.05) 60%, transparent 75%)",
            animation: "nuviBoxBreathe 16s ease-in-out infinite",
            pointerEvents: "none", filter: "blur(8px)",
          }} />
          <span style={{
            position: "relative", zIndex: 2,
            filter: "drop-shadow(0 4px 12px rgba(91, 61, 245, 0.25))",
          }}>
            <NuviCompanion size={mob ? 54 : 76} mode="idle" cycleDuration={60} />
          </span>
        </span>
        <span style={{
          marginTop: 2, padding: "3px 10px",
          background: "rgba(91, 61, 245, 0.08)", borderRadius: 999,
          fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
          color: "#5b3df5", border: "0.5px solid rgba(91, 61, 245, 0.15)",
        }}>{T.coachLabel}</span>
      </button>

      {/* ===== STYLES ===== */}
      <style>{`
        @keyframes nuviFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes nuviArrowPulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.12); }
        }
        @keyframes nuviBoxBreathe {
          0%   { transform: scale(0.65); opacity: 0.35; }
          25%  { transform: scale(1.0);  opacity: 0.85; }
          50%  { transform: scale(1.0);  opacity: 0.85; }
          75%  { transform: scale(0.65); opacity: 0.35; }
          100% { transform: scale(0.65); opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
