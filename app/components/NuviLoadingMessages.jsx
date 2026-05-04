import React, { useState, useEffect, useMemo, useRef } from 'react';

/**
 * NuviLoadingMessages : copy à haut impact pour le chargement
 *
 * v3 - Refonte copywriting expert (Mai 2026)
 *
 * Principes appliqués :
 *   - Apple style : phrases courtes, mots simples, émotions grandes
 *   - Mentor brutalement honnête : pas de complaisance, pas de bullshit
 *   - Mix de 5 leviers psychologiques en rotation :
 *     1. Identité projetée
 *     2. Loss aversion
 *     3. Spécificité concrète
 *     4. Vision tangible
 *     5. Validation sociale en creux
 *
 * Cycle : 15 secondes / 6 phases = 2.5s par phase
 * Pluriel correct (1 an / 5 ans, 1 année / 5 années)
 *
 * @param {string}  series        - "generation" | "audit" | "match" | "interview" | "generic"
 * @param {object}  user          - { nom, metier, secteur, annees } pour personnaliser
 * @param {number}  cycleDuration - Durée du cycle complet en secondes (default 15)
 * @param {string}  className     - Classes additionnelles
 */
export default function NuviLoadingMessages({
  series = 'generic',
  user = {},
  cycleDuration = 15,
  className = '',
}) {
  const phases = useMemo(() => getPhases(series, user), [series, user]);
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const startTimeRef = useRef(Date.now());
  const currentPhaseIdxRef = useRef(0);

  useEffect(() => {
    startTimeRef.current = Date.now();
    currentPhaseIdxRef.current = 0;
    setCurrentPhaseIdx(0);
    setIsVisible(true);
  }, [phases]);

  useEffect(() => {
    const tick = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const phaseTime = elapsed % cycleDuration;
      const progress = phaseTime / cycleDuration;
      const phaseIdx = phases.findIndex(p => progress >= p.from && progress < p.to);
      if (phaseIdx >= 0 && phaseIdx !== currentPhaseIdxRef.current) {
        currentPhaseIdxRef.current = phaseIdx;
        setIsVisible(false);
        setTimeout(() => {
          setCurrentPhaseIdx(phaseIdx);
          setIsVisible(true);
        }, 250);
      }
    };
    const interval = setInterval(tick, 150);
    return () => clearInterval(interval);
  }, [phases, cycleDuration]);

  const current = phases[currentPhaseIdx] || phases[0];

  return (
    <>
      <style>{messagesStyles}</style>
      <div className={`nuvi-loading-messages ${className}`}>
        <div className="nuvi-lm-series">{getSeriesLabel(series)}</div>
        <div
          className="nuvi-lm-stack"
          style={{ opacity: isVisible ? 1 : 0 }}
        >
          <div className="nuvi-lm-line nuvi-lm-line-1">{current.line1}</div>
          <div className="nuvi-lm-line nuvi-lm-line-2">{current.line2}</div>
        </div>
      </div>
    </>
  );
}

function getSeriesLabel(series) {
  const labels = {
    generation: 'Génération',
    audit: 'Analyse',
    match: 'Match',
    interview: 'Entretien',
    generic: 'En cours',
  };
  return labels[series] || labels.generic;
}

// Helper de personnalisation avec gestion du pluriel pour "annees"
function p(template, fallback, user) {
  try {
    let result = template;
    let hasMissing = false;
    result = template.replace(/\{(\w+)\}/g, (_, key) => {
      if (user[key] !== null && user[key] !== undefined && user[key] !== '') {
        return user[key];
      }
      hasMissing = true;
      return '';
    });
    // Pluriel correct : "1 an" / "5 ans", "1 année" / "5 années"
    if (!hasMissing && user.annees !== undefined && user.annees !== null && user.annees !== '') {
      const n = parseInt(user.annees, 10);
      if (n === 1 || n === 0) {
        result = result.replace(/\b(\d+) ans\b/gi, '$1 an');
        result = result.replace(/\b(\d+) années\b/gi, '$1 année');
      }
    }
    return hasMissing ? fallback : result;
  } catch {
    return fallback;
  }
}

function getPhases(series, user) {
  const seriesMap = {
    // ======== GÉNÉRATION ========
    // Cible : quelqu'un qui clique pour générer son CV
    // Émotion : excitation + appréhension du résultat
    generation: [
      { from: 0,    to: 0.18,
        line1: p("{annees} ans condensés.", "Ton parcours condensé.", user),
        line2: "C'est ce que les meilleurs savent faire." },
      { from: 0.18, to: 0.34,
        line1: "Le candidat moyen postule.",
        line2: "Le bon candidat est lu." },
      { from: 0.34, to: 0.50,
        line1: "Quelque part, là, maintenant",
        line2: "ton prochain employeur ouvre une boîte mail." },
      { from: 0.50, to: 0.66,
        line1: p("Personne ne raconte un parcours dans le {secteur}", "Personne ne raconte ton métier", user),
        line2: "comme celui qui l'a vraiment vécu." },
      { from: 0.66, to: 0.84,
        line1: "Combien de fois tu t'es dit",
        line2: "que ton CV ne te ressemblait pas ?" },
      { from: 0.84, to: 1.0,
        line1: "Cette fois, il va te ressembler.",
        line2: "Et c'est ça qui change tout." },
    ],

    // ======== AUDIT ========
    // Cible : quelqu'un qui veut savoir pourquoi ses candidatures ratent
    // Émotion : anxiété + soulagement de comprendre enfin
    audit: [
      { from: 0,    to: 0.18,
        line1: "Sept secondes.",
        line2: "C'est tout ce qu'un recruteur t'accorde." },
      { from: 0.18, to: 0.34,
        line1: "Ce qu'il voit, ce qu'il rate, ce qui le gêne.",
        line2: "Tu vas le savoir avant lui." },
      { from: 0.34, to: 0.50,
        line1: "Personne ne t'a jamais expliqué",
        line2: "pourquoi ton CV finissait à la corbeille." },
      { from: 0.50, to: 0.66,
        line1: "Pas de flatterie. Pas de complaisance.",
        line2: "Une lecture honnête, comme entre alliés." },
      { from: 0.66, to: 0.84,
        line1: "Ceux qui décrochent les bons postes",
        line2: "ont eu ce diagnostic avant les autres." },
      { from: 0.84, to: 1.0,
        line1: "Ce que tu vas lire dans 3 secondes",
        line2: "vaut plus qu'une heure de coaching." },
    ],

    // ======== MATCH ========
    // Cible : quelqu'un qui veut adapter son CV à une offre
    // Émotion : ciblage + précision chirurgicale
    match: [
      { from: 0,    to: 0.18,
        line1: "Cette offre.",
        line2: "Pas une autre. Celle-là." },
      { from: 0.18, to: 0.34,
        line1: "Le candidat générique envoie le même CV partout.",
        line2: "Toi, tu vas être chirurgical." },
      { from: 0.34, to: 0.50,
        line1: "Chaque mot-clé compte.",
        line2: "Chaque silence aussi." },
      { from: 0.50, to: 0.66,
        line1: p("Avec {annees} ans d'expérience", "Avec ton expérience", user),
        line2: "tu mérites un CV taillé sur mesure." },
      { from: 0.66, to: 0.84,
        line1: "Les ATS filtrent 75% des CV en moins d'une seconde.",
        line2: "Le tien va passer." },
      { from: 0.84, to: 1.0,
        line1: "Dans quelques secondes",
        line2: "ce poste sera moins une chance qu'une cible." },
    ],

    // ======== INTERVIEW ========
    // Cible : quelqu'un qui se prépare à un entretien
    // Émotion : préparation + confiance acquise
    interview: [
      { from: 0,    to: 0.18,
        line1: "Le candidat préparé",
        line2: "ne dit pas les mêmes choses que les autres." },
      { from: 0.18, to: 0.34,
        line1: "Les questions pièges. Les silences. Les bouchons.",
        line2: "On les anticipe ensemble, ici, maintenant." },
      { from: 0.34, to: 0.50,
        line1: "Tu n'auras pas une seconde occasion",
        line2: "de faire la première impression." },
      { from: 0.50, to: 0.66,
        line1: "Ceux qui négocient les meilleurs salaires",
        line2: "ne sont pas ceux qui parlent le mieux." },
      { from: 0.66, to: 0.84,
        line1: "Ce sont ceux qui savent raconter",
        line2: "leur valeur sans hésiter." },
      { from: 0.84, to: 1.0,
        line1: "Demain, dans la salle",
        line2: "tu seras content d'avoir fait ça." },
    ],

    // ======== GENERIC ========
    // Cible : tout autre traitement (Coach, traduction, etc.)
    // Émotion : confiance + sensation de momentum
    generic: [
      { from: 0,    to: 0.18,
        line1: "Les grands tournants ne s'annoncent jamais.",
        line2: "Ils se reconnaissent après coup." },
      { from: 0.18, to: 0.34,
        line1: "Pendant que tu lis ces lignes",
        line2: "quelque chose se met en place." },
      { from: 0.34, to: 0.50,
        line1: "Ce que beaucoup remettent à demain",
        line2: "tu es en train de le faire maintenant." },
      { from: 0.50, to: 0.66,
        line1: "Pas de magie. Pas de promesse vide.",
        line2: "Juste un travail propre, sur ce qui compte." },
      { from: 0.66, to: 0.84,
        line1: "Le toi de dans six mois",
        line2: "se souviendra de cet instant précis." },
      { from: 0.84, to: 1.0,
        line1: "Le résultat dans quelques secondes.",
        line2: "Ce que tu en feras, c'est à toi." },
    ],
  };
  return seriesMap[series] || seriesMap.generic;
}

const messagesStyles = `
  .nuvi-loading-messages {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    max-width: 380px;
    text-align: center;
  }
  .nuvi-lm-series {
    font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(109, 63, 196, 0.55);
    font-weight: 600;
  }
  .nuvi-lm-stack {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: center;
    transition: opacity 0.3s ease;
  }
  .nuvi-lm-line {
    font-family: 'DM Serif Display', Georgia, serif;
    font-weight: 400;
    color: #1a1a1a;
    line-height: 1.35;
    letter-spacing: -0.01em;
    text-wrap: balance;
  }
  .nuvi-lm-line-1 {
    font-size: 18px;
  }
  .nuvi-lm-line-2 {
    font-size: 17px;
    font-style: italic;
    color: rgba(26, 26, 26, 0.75);
  }

  @media (prefers-reduced-motion: reduce) {
    .nuvi-lm-stack {
      transition: none;
    }
  }
`;
