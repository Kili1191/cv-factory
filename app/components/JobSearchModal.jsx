"use client";

// Recherche d'offres.
//
// CE QUE CET ECRAN FERME
//
// Toutes les briques existaient et ne se parlaient pas : le suivi de
// candidatures, l'adaptation du CV a une annonce, la preparation d'entretien.
// Il manquait le debut de la chaine. Ici, une offre trouvee devient en un
// geste une candidature suivie QUI PORTE SON ANNONCE, et l'annonce est ce qui
// alimente tout le reste.
//
// C'est precisement la boucle que les concurrents laissent ouverte : leur
// suivi et leur adaptation de CV sont deux outils separes, et l'utilisateur
// fait le pont a la main, en recollant l'annonce a chaque etape.

import React, { useCallback, useState } from "react";
import { codeAdzuna } from "../../lib/conventions.js";
import { aiCall, parseJSON } from "../../lib/ai.js";
import {
  SCHEMA_RECHERCHE, consigneDeRecherche, filtresDepuisLeModele, parametresDeRecherche,
} from "../../lib/rechercheEnPhrase.js";
import { FILTRES_VIDES, filtresActifs } from "../../lib/filtresDOffre.js";
import Sheet from "./Sheet";
import {
  Ink, InkMuted, CreamSoft, Paper, Hairline, Coral, Green,
  Purple, Magenta, Sans, Serif, RadiusSm, RadiusMd, RadiusPill, ShadowSm, B,  CoralText } from "./tokens";

export default function JobSearchModal({ marche = "", T, locale = "en", cv = null, onTrack, onClose }) {
  const [what, setWhat] = useState("");
  const [where, setWhere] = useState("");
  // The market the person already set decides where the search starts. It
  // defaulted to France for everyone, so somebody in London searched the
  // French market until they spotted the button.
  const [country, setCountry] = useState(() => codeAdzuna(marche) || "fr");
  const [jobs, setJobs] = useState([]);
  const [state, setState] = useState("idle"); // idle | loading | done | off
  const [warnings, setWarnings] = useState([]);
  const [sources, setSources] = useState([]);
  const [etatIndex, setEtatIndex] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [plus, setPlus] = useState(false);
  const [plusEnCours, setPlusEnCours] = useState(false);
  // LA PHRASE, ET CE QUI EN A ETE COMPRIS
  //
  // La phrase n'est pas la recherche : le modele la traduit en exigences, et
  // `lu` dit lesquelles. On l'affiche toujours, et les exigences restent
  // modifiables a cote, parce qu'une recherche qu'on ne peut pas corriger
  // est une recherche a laquelle on ne peut pas faire confiance.
  const [phrase, setPhrase] = useState("");
  const [lu, setLu] = useState("");
  // La phrase deja traduite. Sans elle, relancer apres avoir corrige un
  // champ ferait repayer un appel au modele pour rien.
  const [lue, setLue] = useState("");
  const [filtres, setFiltres] = useState({ ...FILTRES_VIDES });
  const [traduction, setTraduction] = useState(false);
  const [exigences, setExigences] = useState(false);
  const [indecis, setIndecis] = useState({});
  const [tracked, setTracked] = useState({});

  const L = locale === "en" ? {
    eyebrow: "JOB SEARCH", title: "Find a role",
    sub: "Search live listings, then turn one into a tracked application with its ad attached.",
    what: "Job title or keywords", where: "City or region",
    search: "Search", searching: "Searching...",
    none: "No results. Try fewer words, or a wider area.",
    track: "Track it and tailor my CV", tracked: "Tracked",
    open: "See the listing",
    offTitle: "No job source connected yet",
    offBody: "Connect Adzuna, France Travail or Reed and live listings appear here. See docs/comptes.md.",
    from: "from",
    // The index fills over a few searches. Saying so costs one line and
    // stops a short list from reading as "nothing is hiring today".
    lus: (n, t) => n + " of " + t + " career pages read",
    encore: "Search again to read the rest.",
    sur: (n, t) => n + " of " + t.toLocaleString("en-GB") + " matching",
    plus: "Show more", plusEnCours: "Loading...",
    phrase: "Say what you are looking for",
    phraseEx: "a French speaking account manager role in London, from my CV",
    traduisant: "Reading your sentence...",
    exigences: "Requirements", masquer: "Hide",
    sansSalaire: (n) => n + " of these do not state a salary",
    sansDate: (n) => n + " of these do not state a date",
    rien: "No requirement set. Every offer for this title and place.",
    etiquettes: {
      remote: "Place of work", langue: "The job requires", contrat: "Contract",
      seniorite: "Level", salaireMin: "Salary from", depuisJours: "Posted within",
    },
    valeurs: {
      remote: [["", "any"], ["remote", "remote"], ["hybride", "hybrid"], ["surplace", "on site"]],
      langue: [["", "no language"], ["french", "French"], ["german", "German"], ["spanish", "Spanish"],
        ["italian", "Italian"], ["dutch", "Dutch"], ["portuguese", "Portuguese"],
        ["arabic", "Arabic"], ["mandarin", "Mandarin"]],
      contrat: [["", "any"], ["cdi", "permanent"], ["mission", "contract"],
        ["stage", "internship"], ["partiel", "part time"]],
      seniorite: [["", "any"], ["junior", "junior"], ["confirme", "mid"],
        ["senior", "senior"], ["lead", "lead and above"]],
      depuisJours: [["0", "any time"], ["3", "3 days"], ["7", "a week"], ["30", "a month"]],
    },
  } : {
    eyebrow: "RECHERCHE D'OFFRES", title: "Trouver un poste",
    sub: "Cherche des offres en direct, puis transforme-en une en candidature suivie, annonce comprise.",
    what: "Intitule ou mots-cles", where: "Ville ou region",
    search: "Chercher", searching: "Recherche...",
    none: "Aucun resultat. Essaie moins de mots, ou une zone plus large.",
    track: "Suivre et adapter mon CV", tracked: "Suivie",
    open: "Voir l'annonce",
    offTitle: "Aucune source d'offres branchee",
    offBody: "Branche Adzuna, France Travail ou Reed et les offres apparaissent ici. Voir docs/comptes.md.",
    from: "via",
    lus: (n, t) => n + " pages carriere lues sur " + t,
    encore: "Relance pour lire les autres.",
    sur: (n, t) => n + " sur " + t.toLocaleString("fr-FR") + " qui correspondent",
    plus: "En voir plus", plusEnCours: "Chargement...",
    phrase: "Dis ce que tu cherches",
    phraseEx: "un poste de gestion de comptes francophone a Londres, depuis mon CV",
    traduisant: "Lecture de ta phrase...",
    exigences: "Exigences", masquer: "Masquer",
    sansSalaire: (n) => n + " d'entre elles n'annoncent pas de salaire",
    sansDate: (n) => n + " d'entre elles n'annoncent pas de date",
    rien: "Aucune exigence. Toutes les offres de ce poste a cet endroit.",
    etiquettes: {
      remote: "Lieu de travail", langue: "L'annonce exige", contrat: "Contrat",
      seniorite: "Niveau", salaireMin: "Salaire a partir de", depuisJours: "Publiee depuis",
    },
    valeurs: {
      remote: [["", "peu importe"], ["remote", "a distance"], ["hybride", "hybride"], ["surplace", "sur place"]],
      langue: [["", "aucune langue"], ["french", "le francais"], ["german", "l'allemand"],
        ["spanish", "l'espagnol"], ["italian", "l'italien"], ["dutch", "le neerlandais"],
        ["portuguese", "le portugais"], ["arabic", "l'arabe"], ["mandarin", "le mandarin"]],
      contrat: [["", "peu importe"], ["cdi", "CDI"], ["mission", "mission"],
        ["stage", "stage"], ["partiel", "temps partiel"]],
      seniorite: [["", "peu importe"], ["junior", "junior"], ["confirme", "confirme"],
        ["senior", "senior"], ["lead", "lead et au-dela"]],
      depuisJours: [["0", "peu importe"], ["3", "3 jours"], ["7", "une semaine"], ["30", "un mois"]],
    },
  };

  // UNE SEULE FONCTION POUR LA PREMIERE PAGE ET POUR LES SUIVANTES
  //
  // `suite` dit laquelle : la premiere remplace la liste et remonte, les
  // autres l'allongent. Ecrire deux fonctions a double le risque qu'une des
  // deux oublie de dedupliquer, et une offre affichee deux fois se lit comme
  // deux offres.
  const chercher = useCallback(async (suite) => {
    const n = suite ? page + 1 : 1;
    if (suite) setPlusEnCours(true); else { setState("loading"); setWarnings([]); }
    try {
      // Les deux champs du haut restent la verite : la phrase les remplit,
      // la personne les corrige, et c'est ce qu'ils contiennent qui part.
      const params = parametresDeRecherche({ ...filtres, what, where, country }, n);
      const res = await fetch(`/api/jobs/search?${params}`);
      const data = await res.json();
      if (!data.configured) { setState("off"); return; }
      const recues = Array.isArray(data.jobs) ? data.jobs : [];
      setJobs((avant) => {
        if (!suite) return recues;
        // Deux pages d'un agregateur se recouvrent quand une offre est
        // publiee entre les deux appels : la cle est celle du serveur.
        const vus = new Set(avant.map((j) => j.source + j.id));
        return avant.concat(recues.filter((j) => !vus.has(j.source + j.id)));
      });
      setSources(data.sources || []);
      setWarnings(data.warnings || []);
      if (!suite) setEtatIndex(data.index || null);
      setTotal(Number(data.total) || 0);
      setIndecis(data.indecis || {});
      setPlus(!!data.plus && recues.length > 0);
      setPage(n);
      setState("done");
    } catch (err) {
      setWarnings([(err && err.message) || "recherche impossible"]);
      setState("done");
    } finally {
      setPlusEnCours(false);
    }
  }, [what, where, country, page, filtres]);


  // LA PHRASE DEVIENT UNE REQUETE, PUIS LA REQUETE CHERCHE
  //
  // Le modele ne cherche pas et ne rend aucune offre : il traduit. Si la
  // traduction echoue, la phrase part telle quelle dans le champ intitule,
  // parce qu'une recherche approximative vaut mieux qu'un ecran qui ne fait
  // rien, et l'avertissement le dit.
  const traduire = useCallback(async () => {
    const texte = phrase.trim();
    if (!texte) return;
    setTraduction(true);
    setWarnings([]);
    try {
      const txt = await aiCall(consigneDeRecherche(texte, locale), {
        cv, schema: SCHEMA_RECHERCHE, task_name: "job-search-query", max_tokens: 500,
      });
      const { filtres: f, lu: phraseLue } = filtresDepuisLeModele(parseJSON(txt));
      setFiltres(f);
      setWhat(f.what);
      setWhere(f.where);
      if (f.country) setCountry(f.country);
      setLu(phraseLue);
      setLue(texte);
      setPage(1);
      const params = parametresDeRecherche(f, 1);
      setState("loading");
      const res = await fetch(`/api/jobs/search?${params}`);
      const data = await res.json();
      if (!data.configured) { setState("off"); return; }
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
      setSources(data.sources || []);
      setWarnings(data.warnings || []);
      setEtatIndex(data.index || null);
      setTotal(Number(data.total) || 0);
      setIndecis(data.indecis || {});
      setPlus(!!data.plus);
      setState("done");
    } catch (err) {
      setWhat(texte);
      setWarnings([(err && err.message) || "phrase non comprise"]);
      setState("idle");
    } finally {
      setTraduction(false);
    }
  }, [phrase, locale, cv]);

  // UN SEUL BOUTON, PARCE QU'IL N'Y A QU'UNE SEULE ACTION
  //
  // La premiere version en avait deux, tous les deux nommes "Chercher" :
  // celui de la phrase et celui des champs. Une suite l'a vu avant un
  // humain, en cliquant le premier des deux et en le trouvant desactive.
  // Deux boutons du meme nom sur un ecran sont un defaut quel que soit le
  // test : la personne ne sait pas lequel fait quoi. Donc un seul, et c'est
  // lui qui decide : une phrase pas encore lue est lue d'abord, et la
  // recherche suit avec ce qu'elle a rempli.
  const search = useCallback(() => {
    if (phrase.trim() && phrase.trim() !== lue) return traduire();
    return chercher(false);
  }, [phrase, lue, traduire, chercher]);

  const poserUneExigence = useCallback((cle, valeur) => {
    setFiltres((avant) => ({
      ...avant,
      [cle]: cle === "salaireMin" || cle === "depuisJours"
        ? Math.max(0, Math.round(Number(valeur) || 0))
        : valeur,
    }));
  }, []);

  const actives = filtresActifs(filtres);

  const field = {
    width: "100%", minHeight: 46, padding: "0 13px",
    borderRadius: RadiusSm, border: "1px solid " + Hairline,
    background: Paper, color: Ink, fontSize: 14,
    fontFamily: Sans, outline: "none", boxSizing: "border-box",
  };

  return (
    <Sheet eyebrow={L.eyebrow} title={L.title} onClose={onClose}>
      <p style={{ fontSize: 13, color: InkMuted, lineHeight: 1.5, margin: "0 0 16px", fontFamily: Sans }}>
        {L.sub}
      </p>

      {/* LA PHRASE EN PREMIER, LES CHAMPS EN DESSOUS
          Les deux champs restent : ils disent ce qui part vraiment, et une
          phrase mal comprise se corrige la, sans relancer le modele. */}
      <div style={{ marginBottom: 10 }}>
        <input value={phrase} onChange={e => setPhrase(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") search(); }}
          placeholder={L.phrase} data-nuvi="offres-phrase"
          style={{ ...field, minHeight: 50, fontSize: 15 }} />
        <div style={{ fontSize: 11.5, color: InkMuted, margin: "6px 2px 0", fontFamily: Sans, lineHeight: 1.45 }}>
          {"\u201c" + L.phraseEx + "\u201d"}
        </div>
      </div>

      {lu && (
        <div data-nuvi="offres-lu" style={{
          padding: "10px 13px", marginBottom: 10, borderRadius: RadiusSm,
          background: CreamSoft, border: "0.5px solid " + Hairline,
          fontSize: 12.5, color: Ink, fontFamily: Sans, lineHeight: 1.5,
        }}>{lu}</div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input value={what} onChange={e => setWhat(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") search(); }}
          placeholder={L.what} style={{ ...field, flex: 2 }} />
        <input value={where} onChange={e => setWhere(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") search(); }}
          placeholder={L.where} style={{ ...field, flex: 1 }} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["fr", "France"], ["gb", "UK"]].map(([code, label]) => (
          <button key={code} onClick={() => setCountry(code)} style={{
            ...B({
              padding: "9px 16px", borderRadius: RadiusPill, minHeight: 40,
              background: country === code ? Ink : Paper,
              color: country === code ? "#fff" : InkMuted,
              border: "0.5px solid " + (country === code ? Ink : Hairline),
              fontSize: 13, fontWeight: 600, fontFamily: Sans,
            }),
          }}>{label}</button>
        ))}
        <button onClick={search} disabled={state === "loading"} style={{
          ...B({
            flex: 1, minHeight: 40, borderRadius: RadiusPill,
            background: `linear-gradient(135deg, ${Purple}, ${Magenta})`,
            color: "#fff", fontSize: 13.5, fontWeight: 600, fontFamily: Sans,
          }),
        }}>{traduction ? L.traduisant : state === "loading" ? L.searching : L.search}</button>
      </div>

      {/* LES EXIGENCES, VISIBLES ET MODIFIABLES
          Un filtre pose par le modele doit pouvoir etre retire a la main :
          une recherche qu'on ne peut pas corriger est une recherche a
          laquelle on ne peut pas faire confiance. Le compte dans le libelle
          dit combien sont actives, pour qu'un filtre oublie ne reste pas a
          vider les resultats en silence. */}
      <div style={{ marginBottom: 14 }}>
        <button onClick={() => setExigences(!exigences)} data-nuvi="offres-exigences" style={{
          ...B({
            padding: "7px 13px", minHeight: 36, borderRadius: RadiusPill,
            background: actives.length ? Ink : Paper,
            color: actives.length ? "#fff" : InkMuted,
            border: "0.5px solid " + (actives.length ? Ink : Hairline),
            fontSize: 12.5, fontWeight: 600, fontFamily: Sans,
          }),
        }}>
          {(exigences ? L.masquer : L.exigences) + (actives.length ? " \u00b7 " + actives.length : "")}
        </button>

        {exigences && (
          <div style={{
            marginTop: 10, padding: "12px 14px", borderRadius: RadiusMd,
            background: CreamSoft, border: "0.5px solid " + Hairline,
            display: "grid", gap: 10, fontFamily: Sans,
          }}>
            {["remote", "langue", "contrat", "seniorite", "depuisJours"].map((cle) => (
              <label key={cle} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
                <span style={{ color: InkMuted, minWidth: 124, flexShrink: 0 }}>{L.etiquettes[cle]}</span>
                <select
                  value={String(filtres[cle] ?? "")}
                  onChange={(e) => poserUneExigence(cle, e.target.value)}
                  style={{
                    flex: 1, minHeight: 38, padding: "0 9px", borderRadius: RadiusSm,
                    border: "1px solid " + Hairline, background: Paper, color: Ink,
                    fontSize: 13, fontFamily: Sans, boxSizing: "border-box",
                  }}
                >
                  {L.valeurs[cle].map(([v, libelle]) => (
                    <option key={v} value={v}>{libelle}</option>
                  ))}
                </select>
              </label>
            ))}
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
              <span style={{ color: InkMuted, minWidth: 124, flexShrink: 0 }}>{L.etiquettes.salaireMin}</span>
              <input
                type="number" min="0" step="1000" inputMode="numeric"
                value={filtres.salaireMin || ""}
                onChange={(e) => poserUneExigence("salaireMin", e.target.value)}
                style={{ ...field, flex: 1, minHeight: 38 }} />
            </label>
            {!actives.length && (
              <div style={{ fontSize: 11.5, color: InkMuted, lineHeight: 1.45 }}>{L.rien}</div>
            )}
          </div>
        )}
      </div>

      {state === "off" && (
        <div style={{
          padding: "16px 18px", borderRadius: RadiusMd,
          background: CreamSoft, border: "0.5px solid " + Hairline, fontFamily: Sans,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: Ink, marginBottom: 6 }}>{L.offTitle}</div>
          <div style={{ fontSize: 13, color: InkMuted, lineHeight: 1.5 }}>{L.offBody}</div>
        </div>
      )}

      {warnings.length > 0 && warnings.map((w, i) => (
        <div key={i} style={{
          padding: "9px 12px", borderRadius: RadiusSm, marginBottom: 8,
          background: CreamSoft, border: "0.5px solid " + Coral,
          fontSize: 12, color: Ink, fontFamily: Sans,
        }}>{w}</div>
      ))}

      {state === "done" && jobs.length === 0 && (
        <p style={{ fontSize: 13.5, color: InkMuted, fontFamily: Sans }}>{L.none}</p>
      )}

      {(jobs.length > 0 || (etatIndex && etatIndex.en_attente > 0)) && (
        <div style={{ fontSize: 11, color: InkMuted, marginBottom: 10, fontFamily: Sans, lineHeight: 1.5 }}>
          {jobs.length > 0
            ? (total > jobs.length ? L.sur(jobs.length, total) : String(jobs.length))
              + " · " + L.from + " " + sources.join(", ")
            : null}
          {indecis.sansSalaire ? <div>{L.sansSalaire(indecis.sansSalaire)}</div> : null}
          {indecis.sansDate ? <div>{L.sansDate(indecis.sansDate)}</div> : null}
          {etatIndex && etatIndex.tableaux ? (
            <div>
              {L.lus(etatIndex.lus, etatIndex.tableaux)}
              {etatIndex.en_attente > 0 ? " · " + L.encore : null}
            </div>
          ) : null}
        </div>
      )}

      {jobs.map((job) => (
        <div key={job.source + job.id} style={{
          padding: "14px 16px", marginBottom: 10,
          background: Paper, borderRadius: RadiusMd,
          border: "0.5px solid " + Hairline, boxShadow: ShadowSm, fontFamily: Sans,
        }}>
          <div style={{
            fontFamily: Serif, fontSize: 15.5, fontWeight: 500,
            color: Ink, lineHeight: 1.3, letterSpacing: "-0.01em",
          }}>{job.title}</div>
          <div style={{ fontSize: 12.5, color: CoralText, fontWeight: 600, marginTop: 2 }}>
            {job.company}
          </div>
          <div style={{
            display: "flex", gap: 10, flexWrap: "wrap",
            fontSize: 11.5, color: InkMuted, marginTop: 5,
          }}>
            {job.location && <span>{job.location}</span>}
            {job.salary && <span>{job.salary}</span>}
            <span style={{ opacity: .7 }}>{job.source}</span>
          </div>

          <button
            onClick={() => { onTrack(job); setTracked(t => ({ ...t, [job.source + job.id]: true })); }}
            disabled={Boolean(tracked[job.source + job.id])}
            style={{
              ...B({
                width: "100%", minHeight: 44, marginTop: 11,
                borderRadius: RadiusPill, border: "none",
                background: tracked[job.source + job.id]
                  ? CreamSoft
                  : `linear-gradient(135deg, ${Purple}, ${Magenta})`,
                color: tracked[job.source + job.id] ? Green : "#fff",
                fontSize: 13, fontWeight: 600, fontFamily: Sans,
              }),
            }}
          >{tracked[job.source + job.id] ? L.tracked : L.track}</button>

          {job.url && (
            <a href={job.url} target="_blank" rel="noopener noreferrer" style={{
              display: "block", textAlign: "center", marginTop: 7,
              fontSize: 12, color: InkMuted, textDecoration: "none",
            }}>{L.open}</a>
          )}
        </div>
      ))}

      {plus && (
        <button
          type="button"
          onClick={() => chercher(true)}
          disabled={plusEnCours}
          data-nuvi="offres-plus"
          style={{
            ...B({
              width: "100%", minHeight: 46, marginTop: 4, marginBottom: 8,
              borderRadius: RadiusPill, border: "1px solid " + Hairline,
              background: Paper, color: Ink,
              fontSize: 13.5, fontWeight: 600, fontFamily: Sans,
            }),
          }}
        >{plusEnCours ? L.plusEnCours : L.plus}</button>
      )}
    </Sheet>
  );
}
