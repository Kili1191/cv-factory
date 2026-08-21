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
import Sheet from "./Sheet";
import {
  Ink, InkMuted, CreamSoft, Paper, Hairline, Coral, Green,
  Purple, Magenta, Sans, Serif, RadiusSm, RadiusMd, RadiusPill, ShadowSm, B,
} from "./tokens";

export default function JobSearchModal({ T, locale = "fr", onTrack, onClose }) {
  const [what, setWhat] = useState("");
  const [where, setWhere] = useState("");
  const [country, setCountry] = useState("fr");
  const [jobs, setJobs] = useState([]);
  const [state, setState] = useState("idle"); // idle | loading | done | off
  const [warnings, setWarnings] = useState([]);
  const [sources, setSources] = useState([]);
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
  };

  const search = useCallback(async () => {
    setState("loading");
    setWarnings([]);
    try {
      const params = new URLSearchParams({ what, where, country });
      const res = await fetch(`/api/jobs/search?${params}`);
      const data = await res.json();
      if (!data.configured) { setState("off"); return; }
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
      setSources(data.sources || []);
      setWarnings(data.warnings || []);
      setState("done");
    } catch (err) {
      setWarnings([(err && err.message) || "recherche impossible"]);
      setState("done");
    }
  }, [what, where, country]);

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
        }}>{state === "loading" ? L.searching : L.search}</button>
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

      {jobs.length > 0 && (
        <div style={{ fontSize: 11, color: InkMuted, marginBottom: 10, fontFamily: Sans }}>
          {jobs.length} · {L.from} {sources.join(", ")}
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
          <div style={{ fontSize: 12.5, color: Coral, fontWeight: 600, marginTop: 2 }}>
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
    </Sheet>
  );
}
