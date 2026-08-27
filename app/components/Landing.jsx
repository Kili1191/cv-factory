"use client";

import React, { useEffect, useRef, useState } from "react";
import { destinationDuRetour, destinationDUneAppInstallee } from "../authReturn";
import ScanHero from "./ScanHero";

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
    sub: "Before a recruiter sees your CV, software reads it. It does not read like a person. Nuvi writes for both.",
    cta: "Open Nuvi",
    ctaSub: "No signup. Works in your browser.",
    scrollHint: "See how it reads",
    s2kicker: "The machine's turn",
    s2title: "This is what the software sees",
    s2body: "A tracking system does not read your CV. It extracts fields. What it cannot place, it drops - and what it drops was never in front of a human.",
    s3kicker: "What survives",
    s3title: "Same person. Different outcome.",
    s3body: "Nothing here is invented. The facts are identical - only the words the machine looks for have changed.",
    finalTitle: "Your turn.",
    finalSub: "Paste a job ad. Get the CV that matches it.",
    finalCta: "Open Nuvi",
    foot: "Your CV stays in your browser.",
    kept: "What the software kept",
    keptSub: "out of twenty-two words.",
    scanLead: "Watch a tracking system read a CV.",
  },
  fr: {
    kicker: "Le CV qui passe l'ATS",
    h1a: "La plupart des CV sont ecartes",
    h1b: "avant qu'un humain les lise.",
    sub: "Avant qu'un recruteur voie ton CV, un logiciel le lit. Il ne lit pas comme une personne. Nuvi ecrit pour les deux.",
    cta: "Ouvrir Nuvi",
    ctaSub: "Sans inscription. Tout se passe dans ton navigateur.",
    scrollHint: "Voir comment il lit",
    s2kicker: "Au tour de la machine",
    s2title: "Voila ce que le logiciel voit",
    s2body: "Un logiciel de tri ne lit pas ton CV. Il en extrait des champs. Ce qu'il n'arrive pas a ranger, il l'ecarte - et ce qu'il ecarte n'est jamais passe devant un humain.",
    s3kicker: "Ce qui reste",
    s3title: "Meme personne. Autre resultat.",
    s3body: "Rien n'est invente ici. Les faits sont identiques : seuls les mots que la machine cherche ont change.",
    finalTitle: "A toi.",
    finalSub: "Colle une annonce. Recupere le CV qui lui correspond.",
    finalCta: "Ouvrir Nuvi",
    foot: "Ton CV reste dans ton navigateur.",
    kept: "Ce que le logiciel a retenu",
    keptSub: "sur vingt-deux mots.",
    scanLead: "Regarde un logiciel de tri lire un CV.",
  },
};

// LE MECANISME, RENDU VISIBLE
//
// Les champs qu'un logiciel de tri cherche vraiment, dans l'ordre ou il les
// cherche. "trouve: false" n'est pas une mise en scene : c'est ce qui arrive
// a un CV ecrit pour l'oeil humain, ou l'intitule est une formule et les
// resultats sont des adjectifs.
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

const CHAMPS = [
  { cle: "name", avant: "Kilian M.", trouve: true },
  { cle: "job_title", avant: "Passionate hospitality professional", trouve: false },
  { cle: "years_experience", avant: "a decade of experience", trouve: false },
  { cle: "skills", avant: "hard-working, team player", trouve: false },
  { cle: "achievements", avant: "improved the business", trouve: false },
];

const APRES = [
  { cle: "name", apres: "Kilian M." },
  { cle: "job_title", apres: "Bar Manager" },
  { cle: "years_experience", apres: "10" },
  { cle: "skills", apres: "GP control, stock, team of 12" },
  { cle: "achievements", apres: "78% beverage GP, 200 covers/service" },
];

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

  const lien = (etiquette, sousTitre, gros) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
      <a href="/app" style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        minHeight: gros ? 56 : 48, padding: gros ? "0 34px" : "0 26px",
        borderRadius: 999, textDecoration: "none",
        background: "linear-gradient(135deg,#5b3df5,#b91c8c)", color: "#fff",
        fontFamily: Sans, fontSize: gros ? 17 : 15, fontWeight: 600,
        letterSpacing: "-0.01em",
        boxShadow: "0 8px 26px rgba(91,61,245,.26)",
      }}>{etiquette}</a>
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
    <div style={{ fontFamily: Sans, color: Ink, overflowX: "hidden" }}>
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
        <a href="/app" style={{
          fontFamily: Sans, fontSize: 13, fontWeight: 600, color: Ink,
          textDecoration: "none", minHeight: 44, display: "inline-flex", alignItems: "center",
          padding: "0 6px",
        }}>{t.cta} &rarr;</a>
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
        {eyebrow(t.scanLead)}
        <ScanHero lang={lang} labels={{ kept: t.kept, keptSub: t.keptSub }}/>
        <h1 style={{
          fontFamily: Serif, fontWeight: 400,
          fontSize: "clamp(21px, 2.9vw, 34px)",
          lineHeight: 1.18, letterSpacing: "-0.025em",
          margin: "38px 0 14px", maxWidth: 26 + "ch",
        }}>
          {t.h1a}{" "}
          <em style={{
            fontStyle: "italic",
            background: "linear-gradient(135deg,#5b3df5,#b91c8c)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text", paddingRight: "0.12em",
          }}>{t.h1b}</em>
        </h1>
        <p style={{
          fontSize: "clamp(13.5px, 1.5vw, 16px)", lineHeight: 1.55,
          color: Muted, maxWidth: 52 + "ch", margin: "0 0 30px",
        }}>{t.sub}</p>
        {lien(t.cta, t.ctaSub, true)}
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

      {/* ===== 2. LE MECANISME ===== */}
      <section ref={refScan} className="nuvi-scroll-in" style={{
        padding: "clamp(56px, 11vh, 120px) clamp(18px, 5vw, 40px)",
        borderBottom: "1px solid " + Hair,
        maxWidth: 1080, margin: "0 auto",
      }}>
        {eyebrow(t.s2kicker)}
        <h2 style={{
          fontFamily: Serif, fontWeight: 400,
          fontSize: "clamp(26px, 4vw, 48px)", lineHeight: 1.12,
          letterSpacing: "-0.025em", margin: "0 0 14px", maxWidth: 20 + "ch",
        }}>{t.s2title}</h2>
        <p style={{
          fontSize: "clamp(13.5px, 1.5vw, 16px)", lineHeight: 1.6,
          color: Muted, maxWidth: 58 + "ch", margin: "0 0 34px",
        }}>{t.s2body}</p>

        {/* Le tableau d'extraction. Chaque ligne s'allume l'une apres
            l'autre : on voit le logiciel passer, et on voit ce qu'il laisse. */}
        <div style={{
          border: "1px solid " + Hair, borderRadius: 14, overflow: "hidden",
          background: "var(--nuvi-paper, #fff)",
        }}>
          {CHAMPS.map((c, i) => (
            <div key={c.cle} style={{
              display: "grid",
              gridTemplateColumns: "minmax(96px, 24%) 1fr auto",
              gap: "clamp(8px, 2vw, 18px)", alignItems: "center",
              padding: "clamp(11px, 1.6vw, 15px) clamp(12px, 2.4vw, 20px)",
              borderTop: i ? "1px solid " + Hair : "none",
              opacity: vuScan ? 1 : 0,
              transform: vuScan ? "none" : "translateY(6px)",
              transition: `opacity 420ms ease-out ${i * 110}ms, transform 420ms ease-out ${i * 110}ms`,
            }}>
              <code style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "clamp(10.5px, 1.2vw, 12px)", color: Muted,
                overflow: "hidden", textOverflow: "ellipsis",
              }}>{c.cle}</code>
              <span style={{
                fontSize: "clamp(12.5px, 1.4vw, 15px)",
                color: c.trouve ? Ink : Muted,
                textDecoration: c.trouve ? "none" : "line-through",
                textDecorationColor: Hair,
                minWidth: 0, overflow: "hidden", textOverflow: "ellipsis",
              }}>{c.avant}</span>
              <span style={{
                fontFamily: Sans, fontSize: 10, fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase",
                whiteSpace: "nowrap",
                color: c.trouve ? "var(--nuvi-green, #16a34a)" : "var(--nuvi-coral, #d97757)",
              }}>{c.trouve
                ? (lang === "en" ? "read" : "lu")
                : (lang === "en" ? "dropped" : "ecarte")}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 3. CE QUI RESTE ===== */}
      <section ref={refApres} className="nuvi-scroll-in" style={{
        padding: "clamp(56px, 11vh, 120px) clamp(18px, 5vw, 40px)",
        borderBottom: "1px solid " + Hair,
        maxWidth: 1080, margin: "0 auto",
      }}>
        {eyebrow(t.s3kicker)}
        <h2 style={{
          fontFamily: Serif, fontWeight: 400,
          fontSize: "clamp(26px, 4vw, 48px)", lineHeight: 1.12,
          letterSpacing: "-0.025em", margin: "0 0 14px", maxWidth: 20 + "ch",
        }}>{t.s3title}</h2>
        <p style={{
          fontSize: "clamp(13.5px, 1.5vw, 16px)", lineHeight: 1.6,
          color: Muted, maxWidth: 58 + "ch", margin: "0 0 34px",
        }}>{t.s3body}</p>

        <div style={{
          border: "1px solid " + Hair, borderRadius: 14, overflow: "hidden",
          background: "var(--nuvi-paper, #fff)",
        }}>
          {APRES.map((c, i) => (
            <div key={c.cle} style={{
              display: "grid",
              gridTemplateColumns: "minmax(96px, 24%) 1fr auto",
              gap: "clamp(8px, 2vw, 18px)", alignItems: "center",
              padding: "clamp(11px, 1.6vw, 15px) clamp(12px, 2.4vw, 20px)",
              borderTop: i ? "1px solid " + Hair : "none",
              opacity: vuApres ? 1 : 0,
              transform: vuApres ? "none" : "translateY(6px)",
              transition: `opacity 420ms ease-out ${i * 110}ms, transform 420ms ease-out ${i * 110}ms`,
            }}>
              <code style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "clamp(10.5px, 1.2vw, 12px)", color: Muted,
                overflow: "hidden", textOverflow: "ellipsis",
              }}>{c.cle}</code>
              <span style={{
                fontSize: "clamp(12.5px, 1.4vw, 15px)", color: Ink, fontWeight: 500,
                minWidth: 0, overflow: "hidden", textOverflow: "ellipsis",
              }}>{c.apres}</span>
              <span style={{
                fontFamily: Sans, fontSize: 10, fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase",
                whiteSpace: "nowrap", color: "var(--nuvi-green, #16a34a)",
              }}>{lang === "en" ? "read" : "lu"}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 4. LA DEMANDE ===== */}
      <section style={{
        padding: "clamp(64px, 13vh, 140px) clamp(18px, 5vw, 40px)",
        textAlign: "center",
      }}>
        <h2 style={{
          fontFamily: Serif, fontWeight: 400,
          fontSize: "clamp(30px, 5.2vw, 60px)", lineHeight: 1.08,
          letterSpacing: "-0.03em", margin: "0 0 14px",
        }}>{t.finalTitle}</h2>
        <p style={{
          fontSize: "clamp(14px, 1.6vw, 17px)", lineHeight: 1.55,
          color: Muted, margin: "0 auto 32px", maxWidth: 44 + "ch",
        }}>{t.finalSub}</p>
        {lien(t.finalCta, t.foot, true)}
      </section>
    </div>
  );
}
