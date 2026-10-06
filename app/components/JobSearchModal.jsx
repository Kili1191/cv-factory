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
  SEARCH_SCHEMA, searchInstruction, filtersFromTheModel, searchParams,
} from "../../lib/searchFromASentence.js";
import { NO_FILTERS, activeFilters } from "../../lib/jobFilters.js";
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
  const [indexState, setIndexState] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // THE SENTENCE, AND WHAT WAS UNDERSTOOD OF IT
  //
  // The sentence is not the search: the model turns it into requirements,
  // and `understood` says which ones. It is always shown, and the
  // requirements stay editable beside it, because a search you cannot
  // correct is a search you cannot trust.
  const [sentence, setSentence] = useState("");
  const [understood, setUnderstood] = useState("");
  // The sentence already read. Without it, searching again after correcting
  // a field by hand would pay for a model call all over again for nothing.
  const [sentenceRead, setSentenceRead] = useState("");
  const [filters, setFilters] = useState({ ...NO_FILTERS });
  const [reading, setReading] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  const [undecided, setUndecided] = useState({});
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
    read: (n, t) => n + " of " + t + " career pages read",
    more: "Search again to read the rest.",
    of: (n, t) => n + " of " + t.toLocaleString("en-GB") + " matching",
    showMore: "Show more", showingMore: "Loading...",
    sentence: "Say what you are looking for",
    sentenceEx: "a French speaking account manager role in London, from my CV",
    readingSentence: "Reading your sentence...",
    requirements: "Requirements", masquer: "Hide",
    noSalary: (n) => n + " of these do not state a salary",
    noDate: (n) => n + " of these do not state a date",
    nothing: "No requirement set. Every offer for this title and place.",
    labels: {
      workplace: "Place of work", language: "The job requires", contract: "Contract",
      level: "Level", salaryFrom: "Salary from", postedWithin: "Posted within",
    },
    values: {
      workplace: [["", "any"], ["remote", "remote"], ["hybrid", "hybrid"], ["onsite", "on site"]],
      language: [["", "no language"], ["french", "French"], ["german", "German"], ["spanish", "Spanish"],
        ["italian", "Italian"], ["dutch", "Dutch"], ["portuguese", "Portuguese"],
        ["arabic", "Arabic"], ["mandarin", "Mandarin"]],
      contract: [["", "any"], ["permanent", "permanent"], ["contract", "contract"],
        ["internship", "internship"], ["parttime", "part time"]],
      level: [["", "any"], ["junior", "junior"], ["mid", "mid"],
        ["senior", "senior"], ["lead", "lead and above"]],
      postedWithin: [["0", "any time"], ["3", "3 days"], ["7", "a week"], ["30", "a month"]],
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
    read: (n, t) => n + " pages carriere lues sur " + t,
    more: "Relance pour lire les autres.",
    of: (n, t) => n + " sur " + t.toLocaleString("fr-FR") + " qui correspondent",
    showMore: "En voir plus", showingMore: "Chargement...",
    sentence: "Dis ce que tu cherches",
    sentenceEx: "un poste de gestion de comptes francophone a Londres, depuis mon CV",
    readingSentence: "Lecture de ta sentence...",
    requirements: "Exigences", masquer: "Masquer",
    noSalary: (n) => n + " d'entre elles n'annoncent pas de salaire",
    noDate: (n) => n + " d'entre elles n'annoncent pas de date",
    nothing: "Aucune exigence. Toutes les offres de ce poste a cet endroit.",
    labels: {
      workplace: "Lieu de travail", language: "L'annonce exige", contract: "Contrat",
      level: "Niveau", salaryFrom: "Salaire a partir de", postedWithin: "Publiee depuis",
    },
    values: {
      workplace: [["", "peu importe"], ["remote", "a distance"], ["hybrid", "hybride"], ["onsite", "sur place"]],
      language: [["", "aucune langue"], ["french", "le francais"], ["german", "l'allemand"],
        ["spanish", "l'espagnol"], ["italian", "l'italien"], ["dutch", "le neerlandais"],
        ["portuguese", "le portugais"], ["arabic", "l'arabe"], ["mandarin", "le mandarin"]],
      contract: [["", "peu importe"], ["permanent", "CDI"], ["contract", "mission"],
        ["internship", "stage"], ["parttime", "temps partiel"]],
      level: [["", "peu importe"], ["junior", "junior"], ["mid", "confirme"],
        ["senior", "senior"], ["lead", "lead et au-dela"]],
      postedWithin: [["0", "peu importe"], ["3", "3 jours"], ["7", "une semaine"], ["30", "un mois"]],
    },
  };

  // ONE FUNCTION FOR THE FIRST PAGE AND FOR THE ONES AFTER
  //
  // `more` says which: the first replaces the list, the others extend it.
  // Writing two functions doubles the chance one of them forgets to
  // deduplicate, and a job shown twice reads as two jobs.
  const runSearch = useCallback(async (more) => {
    const n = more ? page + 1 : 1;
    if (more) setLoadingMore(true); else { setState("loading"); setWarnings([]); }
    try {
      // The two fields at the top stay the truth: the sentence fills them,
      // the person corrects them, and what they hold is what gets sent.
      const params = searchParams({ ...filters, what, where, country }, n);
      const res = await fetch(`/api/jobs/search?${params}`);
      const data = await res.json();
      if (!data.configured) { setState("off"); return; }
      const received = Array.isArray(data.jobs) ? data.jobs : [];
      setJobs((before) => {
        if (!more) return received;
        // Two pages of an aggregator overlap when a job is published between
        // the two calls: the key is the server's.
        const seen = new Set(before.map((j) => j.source + j.id));
        return before.concat(received.filter((j) => !seen.has(j.source + j.id)));
      });
      setSources(data.sources || []);
      setWarnings(data.warnings || []);
      if (!more) setIndexState(data.index || null);
      setTotal(Number(data.total) || 0);
      setUndecided(data.undecided || {});
      setHasMore(!!data.hasMore && received.length > 0);
      setPage(n);
      setState("done");
    } catch (err) {
      setWarnings([(err && err.message) || "recherche impossible"]);
      setState("done");
    } finally {
      setLoadingMore(false);
    }
  }, [what, where, country, page, filters]);


  // THE SENTENCE BECOMES A QUERY, THEN THE QUERY SEARCHES
  //
  // The model does not search and returns no jobs: it translates. If the
  // reading fails, the sentence goes into the title field as it stands,
  // because an approximate search beats a screen that does nothing, and the
  // warning says so.
  const readTheSentence = useCallback(async () => {
    const text = sentence.trim();
    if (!text) return;
    setReading(true);
    setWarnings([]);
    try {
      const txt = await aiCall(searchInstruction(text, locale), {
        cv, schema: SEARCH_SCHEMA, task_name: "job-search-query", max_tokens: 500,
      });
      const { filters: f, understood: sentenceUnderstood } = filtersFromTheModel(parseJSON(txt));
      setFilters(f);
      setWhat(f.what);
      setWhere(f.where);
      if (f.country) setCountry(f.country);
      setUnderstood(sentenceUnderstood);
      setSentenceRead(text);
      setPage(1);
      const params = searchParams(f, 1);
      setState("loading");
      const res = await fetch(`/api/jobs/search?${params}`);
      const data = await res.json();
      if (!data.configured) { setState("off"); return; }
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
      setSources(data.sources || []);
      setWarnings(data.warnings || []);
      setIndexState(data.index || null);
      setTotal(Number(data.total) || 0);
      setUndecided(data.undecided || {});
      setHasMore(!!data.hasMore);
      setState("done");
    } catch (err) {
      setWhat(text);
      setWarnings([(err && err.message) || "sentence not understood"]);
      setState("idle");
    } finally {
      setReading(false);
    }
  }, [sentence, locale, cv]);

  // ONE BUTTON, BECAUSE THERE IS ONLY ONE ACTION
  //
  // The first version had two, both named "Chercher": the sentence's and the
  // fields'. A suite saw it before a human did, by clicking the first of the
  // two and finding it disabled. Two buttons with the same name on one
  // screen are a defect whatever the test says, because the person cannot
  // tell which does what. So one button, and it decides: a sentence not yet
  // read is read first, and the search follows with what it filled in.
  const search = useCallback(() => {
    if (sentence.trim() && sentence.trim() !== sentenceRead) return readTheSentence();
    return runSearch(false);
  }, [sentence, sentenceRead, readTheSentence, runSearch]);

  const setRequirement = useCallback((key, value) => {
    setFilters((before) => ({
      ...before,
      [key]: key === "salaryFrom" || key === "postedWithin"
        ? Math.max(0, Math.round(Number(value) || 0))
        : value,
    }));
  }, []);

  const active = activeFilters(filters);

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

      {/* THE SENTENCE FIRST, THE FIELDS UNDER IT
          The two fields stay: they say what actually gets sent, and a
          sentence read wrong is corrected there, without calling the model
          again. */}
      <div style={{ marginBottom: 10 }}>
        <input value={sentence} onChange={e => setSentence(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") search(); }}
          placeholder={L.sentence} data-nuvi="offres-sentence"
          style={{ ...field, minHeight: 50, fontSize: 15 }} />
        <div style={{ fontSize: 11.5, color: InkMuted, margin: "6px 2px 0", fontFamily: Sans, lineHeight: 1.45 }}>
          {"\u201c" + L.sentenceEx + "\u201d"}
        </div>
      </div>

      {understood && (
        <div data-nuvi="offres-understood" style={{
          padding: "10px 13px", marginBottom: 10, borderRadius: RadiusSm,
          background: CreamSoft, border: "0.5px solid " + Hairline,
          fontSize: 12.5, color: Ink, fontFamily: Sans, lineHeight: 1.5,
        }}>{understood}</div>
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
        }}>{reading ? L.readingSentence : state === "loading" ? L.searching : L.search}</button>
      </div>

      {/* LES EXIGENCES, VISIBLES ET MODIFIABLES
          Un filtre pose par le modele doit pouvoir etre retire a la main :
          une recherche qu'on ne peut pas corriger est une recherche a
          laquelle on ne peut pas faire confiance. Le compte dans le label
          dit combien sont active, pour qu'un filtre oublie ne reste pas a
          vider les resultats en silence. */}
      <div style={{ marginBottom: 14 }}>
        <button onClick={() => setShowRequirements(!showRequirements)} data-nuvi="offres-exigences" style={{
          ...B({
            padding: "7px 13px", minHeight: 36, borderRadius: RadiusPill,
            background: active.length ? Ink : Paper,
            color: active.length ? "#fff" : InkMuted,
            border: "0.5px solid " + (active.length ? Ink : Hairline),
            fontSize: 12.5, fontWeight: 600, fontFamily: Sans,
          }),
        }}>
          {(showRequirements ? L.hide : L.requirements) + (active.length ? " \u00b7 " + active.length : "")}
        </button>

        {showRequirements && (
          <div style={{
            marginTop: 10, padding: "12px 14px", borderRadius: RadiusMd,
            background: CreamSoft, border: "0.5px solid " + Hairline,
            display: "grid", gap: 10, fontFamily: Sans,
          }}>
            {["workplace", "language", "contract", "level", "postedWithin"].map((key) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
                <span style={{ color: InkMuted, minWidth: 124, flexShrink: 0 }}>{L.labels[key]}</span>
                <select
                  value={String(filters[key] ?? "")}
                  onChange={(e) => setRequirement(key, e.target.value)}
                  style={{
                    flex: 1, minHeight: 38, padding: "0 9px", borderRadius: RadiusSm,
                    border: "1px solid " + Hairline, background: Paper, color: Ink,
                    fontSize: 13, fontFamily: Sans, boxSizing: "border-box",
                  }}
                >
                  {L.values[key].map(([v, label]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
              </label>
            ))}
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
              <span style={{ color: InkMuted, minWidth: 124, flexShrink: 0 }}>{L.labels.salaryFrom}</span>
              <input
                type="number" min="0" step="1000" inputMode="numeric"
                value={filters.salaryFrom || ""}
                onChange={(e) => setRequirement("salaryFrom", e.target.value)}
                style={{ ...field, flex: 1, minHeight: 38 }} />
            </label>
            {!active.length && (
              <div style={{ fontSize: 11.5, color: InkMuted, lineHeight: 1.45 }}>{L.nothing}</div>
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

      {(jobs.length > 0 || (indexState && indexState.pending > 0)) && (
        <div style={{ fontSize: 11, color: InkMuted, marginBottom: 10, fontFamily: Sans, lineHeight: 1.5 }}>
          {jobs.length > 0
            ? (total > jobs.length ? L.sur(jobs.length, total) : String(jobs.length))
              + " · " + L.from + " " + sources.join(", ")
            : null}
          {undecided.noSalary ? <div>{L.noSalary(undecided.noSalary)}</div> : null}
          {undecided.noDate ? <div>{L.noDate(undecided.noDate)}</div> : null}
          {indexState && indexState.boards ? (
            <div>
              {L.read(indexState.read, indexState.boards)}
              {indexState.pending > 0 ? " · " + L.more : null}
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

      {hasMore && (
        <button
          type="button"
          onClick={() => runSearch(true)}
          disabled={loadingMore}
          data-nuvi="offres-plus"
          style={{
            ...B({
              width: "100%", minHeight: 46, marginTop: 4, marginBottom: 8,
              borderRadius: RadiusPill, border: "1px solid " + Hairline,
              background: Paper, color: Ink,
              fontSize: 13.5, fontWeight: 600, fontFamily: Sans,
            }),
          }}
        >{loadingMore ? L.showingMore : L.showMore}</button>
      )}
    </Sheet>
  );
}
