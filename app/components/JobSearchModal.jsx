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

import React, { useCallback, useMemo, useState } from "react";
import { codeAdzuna } from "../../lib/conventions.js";
import { aiCall, parseJSON } from "../../lib/ai.js";
import {
  SEARCH_SCHEMA, searchInstruction, filtersFromTheModel, searchParams,
} from "../../lib/searchFromASentence.js";
import { NO_FILTERS, activeFilters } from "../../lib/jobFilters.js";
import { rankByFit, fitKey } from "../../lib/jobFit.js";
import { shareLink } from "../../lib/shareLink.js";
import { whatIsNew, digestSummary, watchKey, storeWatch } from "../../lib/digest.js";
import { jobId as digestId } from "../../lib/digest.js";
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
  const [totalExact, setTotalExact] = useState(true);
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
  // THE ONLY ANSWER TO EIGHT THOUSAND RESULTS
  //
  // Sorting by what the person's own CV covers is the one thing a job board
  // cannot do. It is on by default because it is the point, and it is a
  // control rather than a silent reorder: an order the person cannot switch
  // off is an order they cannot check.
  const [sortBy, setSortBy] = useState("fit");
  // THE DOOR HAD NO HANDLE ON THE INSIDE
  //
  // thenuvi.com/<the ad's address> has opened the app with that ad already
  // read since the day it shipped, and nothing in the product has ever made
  // one. A loop only a person who already knew the trick could use is a loop
  // nobody uses. Keyed by job so one card says "copied" and not all of them.
  const [shared, setShared] = useState("");
  // WHAT IS NEW SINCE THIS SEARCH WAS LAST RUN
  //
  // Every job site has alerts and this one had none. The sending needs a
  // server and a mail provider; deciding what counts as new does not, and
  // that is the part worth getting right. So the same module that will feed
  // an email already answers it on screen, from the device, today.
  const [digest, setDigest] = useState(null);
  const [freshIds, setFreshIds] = useState(() => new Set());
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
    // When a requirement is sieved here rather than at the source, the big
    // number counts what was found BEFORE it, not what matches.
    ofFound: (n, t) => n + " shown, from " + t.toLocaleString("en-GB") + " found",
    showMore: "Show more", showingMore: "Loading...",
    sentence: "Say what you are looking for",
    sentenceEx: "account manager in London, hybrid, permanent, posted this week",
    readingSentence: "Reading your sentence...",
    requirements: "Requirements", masquer: "Hide",
    noSalary: (n) => n + " of these do not state a salary",
    noDate: (n) => n + " of these do not state a date",
    sortFit: "Best fit first", sortSource: "As found",
    sendLink: "Send as a Nuvi link", linkCopied: "Link copied",
    linkHere: "Copy this link:",
    isNew: "new",
    // A count, never a mark on its own. The repo settled that once on the
    // match panel: a score nobody can explain is a score nobody should act
    // on, so the card says what was counted and the share only sorts.
    fitCount: (p, d) => d + " phrases in this ad, " + p + " in your CV",
    notMeasured: (n) => (n === 1
      ? "1 ad says too little to measure, and keeps its source's order"
      : n + " ads say too little to measure, and keep their source's order"),
    noSponsorship: (n) => (n === 1
      ? "1 of these does not say whether it sponsors a visa"
      : n + " of these do not say whether they sponsor a visa"),
    nothing: "No requirement set. Every offer for this title and place.",
    labels: {
      workplace: "Place of work", language: "The job requires", contract: "Contract",
      level: "Level", salaryFrom: "Salary from", postedWithin: "Posted within",
      sponsorship: "Visa sponsorship",
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
      // "not ruled out" and not "sponsors", because that is all the ad says.
      // Promising a sponsor we cannot know about would be the one kind of
      // invention this product cannot afford.
      sponsorship: [["", "any"], ["possible", "not ruled out"]],
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
    ofFound: (n, t) => n + " affichees, sur " + t.toLocaleString("fr-FR") + " trouvees",
    showMore: "En voir plus", showingMore: "Chargement...",
    sentence: "Dis ce que tu cherches",
    sentenceEx: "gestion de comptes a Londres, hybride, CDI, publiee cette semaine",
    readingSentence: "Lecture de ta sentence...",
    requirements: "Exigences", masquer: "Masquer",
    noSalary: (n) => n + " d'entre elles n'annoncent pas de salaire",
    noDate: (n) => n + " d'entre elles n'annoncent pas de date",
    sortFit: "Correspondance d'abord", sortSource: "Ordre des sources",
    sendLink: "Envoyer en lien Nuvi", linkCopied: "Lien copie",
    linkHere: "Copie ce lien :",
    isNew: "nouveau",
    fitCount: (p, d) => d + " expressions dans l'annonce, " + p + " dans ton CV",
    notMeasured: (n) => (n === 1
      ? "1 annonce en dit trop peu pour etre mesuree, elle garde l'ordre de sa source"
      : n + " annonces en disent trop peu pour etre mesurees, elles gardent l'ordre de leur source"),
    noSponsorship: (n) => (n === 1
      ? "1 d'entre elles ne dit pas si elle parraine un visa"
      : n + " d'entre elles ne disent pas si elles parrainent un visa"),
    nothing: "Aucune exigence. Toutes les offres de ce poste a cet endroit.",
    labels: {
      workplace: "Lieu de travail", language: "L'annonce exige", contract: "Contrat",
      level: "Niveau", salaryFrom: "Salaire a partir de", postedWithin: "Publiee depuis",
      sponsorship: "Parrainage de visa",
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
      sponsorship: [["", "peu importe"], ["possible", "pas exclu"]],
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
      // THE DIGEST, ON PAGE ONE ONLY
      //
      // Turning a page must not re-arm the watch: the person is still reading
      // the same search, and marking page two's jobs as seen would hide them
      // from tomorrow's digest. Storage can refuse in a private window, so
      // nothing here is allowed to cost the person their results.
      if (!more) {
        try {
          const key = watchKey({ what, where, country });
          const all = JSON.parse(localStorage.getItem("cvf_vl") || "{}");
          const result = whatIsNew(received, all[key], Date.now());
          localStorage.setItem("cvf_vl", JSON.stringify(storeWatch(all, key, result.watch)));
          setDigest(result);
          setFreshIds(new Set(result.fresh.map((j) => digestId(j))));
        } catch {
          // No watch is not a broken search: the list is still right.
          setDigest(null);
          setFreshIds(new Set());
        }
      }
      setSources(data.sources || []);
      setWarnings(data.warnings || []);
      if (!more) setIndexState(data.index || null);
      setTotal(Number(data.total) || 0);
      setTotalExact(data.totalExact !== false);
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
      setTotalExact(data.totalExact !== false);
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

  // RANKING BY WHAT THE CV ALREADY COVERS
  //
  // Measured here rather than on the route, for two reasons: the CV never
  // leaves the device for it, and `couverture` is plain string work, so the
  // whole list is ranked in a few milliseconds and costs nothing per search.
  // Keyed on the list, so turning a page re-ranks what has accumulated
  // instead of only the slice that just arrived.
  // The product's own address as this browser knows it: a link built on a
  // preview deployment has to open that deployment, and one built in the test
  // harness must not send anybody to production.
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const fit = useMemo(() => rankByFit(cv, jobs), [cv, jobs]);
  // The sort only exists if something can be sorted. A control that reorders
  // nothing, on a search run before a CV was imported, is a control that
  // lies about what the screen knows.
  const canSortByFit = Boolean(cv) && fit.measured > 0;
  const shown = canSortByFit && sortBy === "fit" ? fit.ranked : jobs;

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
        {/* The example carries a title, a place and three conditions, because
            that is the shape of a real request. An example built around one
            requirement reads as the only thing the box accepts. */}
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
            {["workplace", "language", "contract", "level", "sponsorship", "postedWithin"].map((key) => (
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
          {undecided.noSponsorship ? <div>{L.noSponsorship(undecided.noSponsorship)}</div> : null}
          {digest ? <div>{digestSummary(digest, locale)}</div> : null}
          {canSortByFit && sortBy === "fit" && fit.unmeasured > 0
            ? <div>{L.notMeasured(fit.unmeasured)}</div> : null}
          {canSortByFit ? (
            <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
              {[["fit", L.sortFit], ["source", L.sortSource]].map(([key, label]) => (
                <button key={key} type="button" onClick={() => setSortBy(key)} style={{
                  ...B({
                    minHeight: 30, padding: "0 11px", borderRadius: RadiusPill,
                    background: sortBy === key ? Ink : Paper,
                    color: sortBy === key ? Paper : InkMuted,
                    border: "0.5px solid " + (sortBy === key ? Ink : Hairline),
                    fontFamily: Sans, fontSize: 11.5, fontWeight: 600,
                  }),
                }}>{label}</button>
              ))}
            </div>
          ) : null}
          {indexState && indexState.boards ? (
            <div>
              {L.read(indexState.read, indexState.boards)}
              {indexState.pending > 0 ? " · " + L.more : null}
            </div>
          ) : null}
        </div>
      )}

      {shown.map((job) => (
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
            {freshIds.has(digestId(job)) ? (
              <span data-nuvi="offre-nouvelle" style={{
                padding: "1px 7px", borderRadius: RadiusPill,
                background: Green, color: "#fff", fontSize: 10.5, fontWeight: 700,
                letterSpacing: "0.02em", textTransform: "uppercase",
              }}>{L.isNew}</span>
            ) : null}
          </div>

          {/* What was counted, not a mark out of 100. The number that sorts
              the list is the share; what the person reads is the count, so
              the order is explainable without inviting anyone to optimise a
              score instead of their CV. */}
          {canSortByFit && fit.fits.get(fitKey(job, 0)) ? (
            <div style={{ fontSize: 11.5, color: InkMuted, marginTop: 6 }}>
              {L.fitCount(fit.fits.get(fitKey(job, 0)).present,
                fit.fits.get(fitKey(job, 0)).demandees)}
            </div>
          ) : null}

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

          <div style={{
            display: "flex", gap: 14, justifyContent: "center",
            alignItems: "center", marginTop: 7, flexWrap: "wrap",
          }}>
            {job.url && (
              <a href={job.url} target="_blank" rel="noopener noreferrer" style={{
                fontSize: 12, color: InkMuted, textDecoration: "none",
              }}>{L.open}</a>
            )}
            {shareLink(job.url, origin) ? (
              <button
                type="button"
                data-nuvi="partager-offre"
                onClick={async () => {
                  const lien = shareLink(job.url, origin);
                  try {
                    await navigator.clipboard.writeText(lien);
                    setShared(fitKey(job, 0));
                  } catch {
                    // The clipboard is refused in plenty of places, and a
                    // button that silently does nothing is the failure this
                    // repo knows best. So the link comes out on screen and
                    // the person copies it themselves.
                    setShared("manuel:" + fitKey(job, 0));
                  }
                }}
                style={{
                  ...B({
                    padding: 0, minHeight: 0, background: "none", border: "none",
                    fontFamily: Sans, fontSize: 12, color: InkMuted,
                    textDecoration: "underline", cursor: "pointer",
                  }),
                }}
              >{shared === fitKey(job, 0) ? L.linkCopied : L.sendLink}</button>
            ) : null}
          </div>
          {shared === "manuel:" + fitKey(job, 0) ? (
            <div style={{ marginTop: 6, fontSize: 11.5, color: InkMuted, wordBreak: "break-all" }}>
              {L.linkHere} {shareLink(job.url, origin)}
            </div>
          ) : null}
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
