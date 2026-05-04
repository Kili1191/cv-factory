import React, { useState, useEffect, useMemo, useRef } from 'react';

/**
 * NuviLoadingMessages — Copy à haut impact pour le chargement
 *
 * Affiche des messages psychologiques pendant que Nuvi charge,
 * pour transformer l'attente en moment de prise de conscience.
 *
 * 8 leviers psychologiques :
 *   - Contraste avant/après
 *   - Identité projetée
 *   - Spécificité concrète
 *   - Perte > gain (loss aversion)
 *   - Urgence douce implicite
 *   - Validation sociale en creux
 *   - Vision concrète
 *   - Justification post-action
 *
 * Structure typographique :
 *   - 2 lignes par message (accroche + révélation)
 *   - Aucun ? orphelin, aucun mot veuve
 *   - Lignes équilibrées (text-wrap: balance)
 *   - Police DM Serif Display (cohérence brand)
 *
 * @param {string}  series        - "generation" | "audit" | "match" | "interview" | "generic"
 * @param {object}  user          - { nom, metier, secteur, annees } pour personnaliser
 * @param {number}  cycleDuration - Durée du cycle complet en secondes (default 15)
 *                                  ~2.5 secondes par phrase, rythme dynamique
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

  // Reset start time si phases changent (changement de serie)
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
      const progress = phaseTime / cycleDuration; // 0 to 1
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
// {annees} ans de travail → "1 an de travail" ou "5 ans de travail"
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
    // Gestion du pluriel pour "ans" / "années"
    if (!hasMissing && user.annees !== undefined && user.annees !== null && user.annees !== '') {
      const n = parseInt(user.annees, 10);
      if (n === 1 || n === 0) {
        // Singulier : "1 an" au lieu de "1 ans", "1 année" au lieu de "1 années"
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
    generation: [
      { from: 0,    to: 0.18,
        line1: p("{annees} ans de travail.", "Des années de travail.", user),
        line2: "Quelques secondes pour les rassembler." },
      { from: 0.18, to: 0.34,
        line1: "La version de toi qui obtient des entretiens",
        line2: "ne ressemble pas à celle qui hésite à postuler." },
      { from: 0.34, to: 0.50,
        line1: "Quelque part, dans une boîte mail",
        line2: "un recruteur va lire ce qu'on prépare là." },
      { from: 0.50, to: 0.66,
        line1: p("Ce que tu as fait dans le {secteur}", "Ce que tu as appris dans ton métier", user),
        line2: "personne ne peut le raconter à ta place." },
      { from: 0.66, to: 0.84,
        line1: "Pendant que tu attends, beaucoup envoient",
        line2: "le même CV banal à dix entreprises." },
      { from: 0.84, to: 1.0,
        line1: "Toi tu vas avoir quelque chose",
        line2: "qui ne ressemble à personne d'autre." },
    ],
    audit: [
      { from: 0,    to: 0.18,
        line1: "Un recruteur passe sept secondes",
        line2: "sur un CV avant de décider." },
      { from: 0.18, to: 0.34,
        line1: "Ce qu'il voit, ce qu'il rate, ce qui le freine",
        line2: "c'est exactement ce qu'on regarde maintenant." },
      { from: 0.34, to: 0.50,
        line1: "La plupart des candidats ne savent pas",
        line2: "ce qui les a fait passer à la trappe." },
      { from: 0.50, to: 0.66,
        line1: "Tu vas le savoir avant le prochain envoi.",
        line2: "C'est rare. C'est une vraie longueur d'avance." },
      { from: 0.66, to: 0.84,
        line1: "Pas de complaisance, pas de flatterie.",
        line2: "Une lecture honnête, comme entre alliés." },
      { from: 0.84, to: 1.0,
        line1: "Ce que tu vas lire ensuite",
        line2: "vaudra plus qu'une heure de coaching." },
    ],
    match: [
      { from: 0,    to: 0.18,
        line1: "Quelque part en France, à cette seconde",
        line2: "ton prochain poste est en train d'être ouvert." },
      { from: 0.18, to: 0.34,
        line1: "Pas n'importe lequel.",
        line2: "Celui où tu seras enfin à ta place." },
      { from: 0.34, to: 0.50,
        line1: "Les meilleures offres ne sont jamais visibles",
        line2: "longtemps. On les attrape ou on les rate." },
      { from: 0.50, to: 0.66,
        line1: p("Avec {annees} ans d'expérience", "Avec ton expérience", user),
        line2: "tu mérites mieux que les listes génériques." },
      { from: 0.66, to: 0.84,
        line1: "On filtre pour toi le bruit du marché.",
        line2: "Ce qui reste, c'est ce qui te ressemble." },
      { from: 0.84, to: 1.0,
        line1: "Dans quelques secondes",
        line2: "tu sauras ce qui vaut le coup de viser." },
    ],
    interview: [
      { from: 0,    to: 0.18,
        line1: "Le candidat préparé",
        line2: "ne dit pas les mêmes choses que les autres." },
      { from: 0.18, to: 0.34,
        line1: "Ce que tu vas répéter dans ta tête ce soir",
        line2: "tu vas le construire ici, maintenant." },
      { from: 0.34, to: 0.50,
        line1: "Les questions pièges, les silences, les bouchons.",
        line2: "On les anticipe ensemble, là, tout de suite." },
      { from: 0.50, to: 0.66,
        line1: "Ceux qui obtiennent les bons salaires",
        line2: "ne sont pas ceux qui parlent le mieux." },
      { from: 0.66, to: 0.84,
        line1: "Ce sont ceux qui sont prêts à raconter",
        line2: "leur valeur sans hésiter." },
      { from: 0.84, to: 1.0,
        line1: "Tu n'auras pas une seconde occasion",
        line2: "de faire la première impression." },
    ],
    generic: [
      { from: 0,    to: 0.18,
        line1: "Les grands tournants ne s'annoncent jamais.",
        line2: "Ils se reconnaissent après coup." },
      { from: 0.18, to: 0.34,
        line1: "Pendant que tu lis ces lignes",
        line2: "quelque chose se met en place pour toi." },
      { from: 0.34, to: 0.50,
        line1: "Ce que beaucoup remettent à demain",
        line2: "tu es en train de le faire maintenant." },
      { from: 0.50, to: 0.66,
        line1: "Le futur toi qui regarde en arrière",
        line2: "se souviendra de ce moment." },
      { from: 0.66, to: 0.84,
        line1: "Pas de magie. Pas de promesse vide.",
        line2: "Juste un travail propre, sur ce qui compte." },
      { from: 0.84, to: 1.0,
        line1: "Le résultat dans quelques secondes",
        line2: "ne sera utile que si tu en fais quelque chose." },
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
    max-width: 360px;
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
