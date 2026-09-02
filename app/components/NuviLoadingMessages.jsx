import React, { useState, useEffect, useMemo, useRef } from 'react';

/**
 * NuviLoadingMessages : copy a haut impact pour le chargement
 *
 * v3 - Refonte copywriting expert (Mai 2026)
 *
 * Principes appliques :
 *   - Apple style : phrases courtes, mots simples, emotions grandes
 *   - Mentor brutalement honnete : pas de complaisance, pas de bullshit
 *   - Mix de 5 leviers psychologiques en rotation :
 *     1. Identite projetee
 *     2. Loss aversion
 *     3. Specificite concrete
 *     4. Vision tangible
 *     5. Validation sociale en creux
 *
 * Cycle : 15 secondes / 6 phases = 2.5s par phase
 * Pluriel correct (1 an / 5 ans, 1 annee / 5 annees)
 *
 * @param {string}  series        - "generation" | "audit" | "match" | "interview" | "generic"
 * @param {object}  user          - { nom, metier, secteur, annees } pour personnaliser
 * @param {number}  cycleDuration - Duree du cycle complet en secondes (default 15)
 * @param {string}  className     - Classes additionnelles
 */
export default function NuviLoadingMessages({
  series = 'generic',
  user = {},
  cycleDuration = 15,
  className = '',
  lang = 'fr',
}) {
  const phases = useMemo(() => getPhases(series, user, lang), [series, user, lang]);
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
        <div className="nuvi-lm-series">{getSeriesLabel(series, lang)}</div>
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

function getSeriesLabel(series, lang) {
  const l = ETIQUETTES[lang] || ETIQUETTES.fr;
  return l[series] || l.generic;
}

const ETIQUETTES = {
  fr: { generation: 'Génération', audit: 'Analyse', match: 'Match',
        interview: 'Entretien', generic: 'En cours' },
  en: { generation: 'Generating', audit: 'Analysis', match: 'Match',
        interview: 'Interview', generic: 'Working' },
};

// Personnalisation, avec l'accord qui va avec.
//
// L'ancienne version rattrapait le pluriel par une regex sur le texte deja
// rendu : elle remplacait "1 ans" par "1 an" et s'arretait la. L'adjectif
// restait au pluriel, et "1 an condenses." s'affichait tel quel a l'ecran.
// Un modele ne peut pas s'accorder apres coup : on en ecrit donc deux, et
// c'est le nombre qui choisit.
function p(modeles, fallback, user) {
  try {
    const brut = user.annees;
    const n = (brut === undefined || brut === null || brut === '')
      ? null : parseInt(brut, 10);
    const modele = (typeof modeles === 'string')
      ? modeles
      : ((n === 0 || n === 1) ? modeles.un : modeles.plusieurs);

    let manquant = false;
    const sortie = String(modele).replace(/\{(\w+)\}/g, (_, cle) => {
      const v = user[cle];
      if (v === null || v === undefined || v === '') { manquant = true; return ''; }
      return v;
    });
    return manquant ? fallback : sortie;
  } catch {
    return fallback;
  }
}

// LA COPIE DES ATTENTES, DANS LES DEUX LANGUES
//
// Elle n'existait qu'en francais, et le composant n'acceptait meme pas de
// langue : quelqu'un qui avait choisi l'anglais au premier ecran voyait
// "Generation" et "C'est ce que les meilleurs savent faire." a chaque
// attente. Un des deux appels passait deja lang, silencieusement ignore.
//
// L'anglais n'est pas une traduction ligne a ligne du francais. Ces phrases
// visent quelqu'un qui lit vite, entre deux services : elles gardent le
// rythme court plutot que la formulation exacte.
function getPhases(series, user, lang) {
  const langue = SERIES[lang] ? lang : 'fr';
  const seriesMap = SERIES[langue](user);
  return seriesMap[series] || seriesMap.generic;
}

const SERIES = {
  fr: (user) => ({
    // ======== GENERATION ========
    // Cible : quelqu'un qui clique pour generer son CV
    // Emotion : excitation + apprehension du resultat
    generation: [
      { from: 0,    to: 0.18,
        line1: p({ un: "{annees} an condensé.", plusieurs: "{annees} ans condensés." },
                 "Ton parcours condensé.", user),
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
        line1: p({ un: "Avec {annees} an d'expérience", plusieurs: "Avec {annees} ans d'expérience" },
                 "Avec ton expérience", user),
        line2: "tu mérites un CV taillé sur mesure." },
      { from: 0.66, to: 0.84,
        line1: "Les ATS filtrent 75% des CV en moins d'une seconde.",
        line2: "Le tien va passer." },
      { from: 0.84, to: 1.0,
        line1: "Dans quelques secondes",
        line2: "ce poste sera moins une chance qu'une cible." },
    ],
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
  }),

  en: (user) => ({
    generation: [
      { from: 0,    to: 0.18,
        line1: p({ un: "{annees} year, distilled.", plusieurs: "{annees} years, distilled." },
                 "Your whole run of work, distilled.", user),
        line2: "That is what the best ones do." },
      { from: 0.18, to: 0.34,
        line1: "The average candidate applies.",
        line2: "The right candidate gets read." },
      { from: 0.34, to: 0.50,
        line1: "Somewhere, right now,",
        line2: "your next employer is opening an inbox." },
      { from: 0.50, to: 0.66,
        line1: p("Nobody tells a {secteur} story", "Nobody tells your trade's story", user),
        line2: "like the person who actually lived it." },
      { from: 0.66, to: 0.84,
        line1: "How many times have you thought",
        line2: "that your CV was not really you?" },
      { from: 0.84, to: 1.0,
        line1: "This time, it will be.",
        line2: "And that is what changes everything." },
    ],
    audit: [
      { from: 0,    to: 0.18,
        line1: "Seven seconds.",
        line2: "That is all a recruiter gives you." },
      { from: 0.18, to: 0.34,
        line1: "What they see, what they miss, what puts them off.",
        line2: "You will know it before they do." },
      { from: 0.34, to: 0.50,
        line1: "Nobody ever explained to you",
        line2: "why your CV kept ending up in the bin." },
      { from: 0.50, to: 0.66,
        line1: "No flattery. No going easy on you.",
        line2: "An honest read, the way an ally gives it." },
      { from: 0.66, to: 0.84,
        line1: "The people who land the good jobs",
        line2: "got this read before everyone else." },
      { from: 0.84, to: 1.0,
        line1: "What you are about to read in 3 seconds",
        line2: "is worth more than an hour of coaching." },
    ],
    match: [
      { from: 0,    to: 0.18,
        line1: "This job ad.",
        line2: "Not another one. This one." },
      { from: 0.18, to: 0.34,
        line1: "The generic candidate sends the same CV everywhere.",
        line2: "You are about to be surgical." },
      { from: 0.34, to: 0.50,
        line1: "Every keyword counts.",
        line2: "So does every silence." },
      { from: 0.50, to: 0.66,
        line1: p({ un: "With {annees} year behind you", plusieurs: "With {annees} years behind you" },
                 "With your experience", user),
        line2: "you deserve a CV cut to measure." },
      { from: 0.66, to: 0.84,
        line1: "Tracking systems drop 75% of CVs in under a second.",
        line2: "Yours is going to get through." },
      { from: 0.84, to: 1.0,
        line1: "In a few seconds",
        line2: "this job will be less a hope than a target." },
    ],
    interview: [
      { from: 0,    to: 0.18,
        line1: "The prepared candidate",
        line2: "does not say the same things as the rest." },
      { from: 0.18, to: 0.34,
        line1: "The trick questions. The silences. The blanks.",
        line2: "We get ahead of them together, here, now." },
      { from: 0.34, to: 0.50,
        line1: "You will not get a second chance",
        line2: "to make the first impression." },
      { from: 0.50, to: 0.66,
        line1: "The people who negotiate the best pay",
        line2: "are not the ones who speak best." },
      { from: 0.66, to: 0.84,
        line1: "They are the ones who can say",
        line2: "what they are worth without hesitating." },
      { from: 0.84, to: 1.0,
        line1: "Tomorrow, in that room,",
        line2: "you will be glad you did this." },
    ],
    generic: [
      { from: 0,    to: 0.18,
        line1: "The big turns never announce themselves.",
        line2: "You only recognise them afterwards." },
      { from: 0.18, to: 0.34,
        line1: "While you read these lines",
        line2: "something is falling into place." },
      { from: 0.34, to: 0.50,
        line1: "What most people put off until tomorrow",
        line2: "you are doing right now." },
      { from: 0.50, to: 0.66,
        line1: "No magic. No empty promise.",
        line2: "Just clean work, on what matters." },
      { from: 0.66, to: 0.84,
        line1: "The you of six months from now",
        line2: "will remember this exact moment." },
      { from: 0.84, to: 1.0,
        line1: "The result in a few seconds.",
        line2: "What you do with it is yours." },
    ],
  }),
};

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
