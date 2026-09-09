"use client";
// THE DOOR THAT IS A LINK
//
//     thenuvi.com/https://job-boards.greenhouse.io/acme/jobs/4012
//
// Put the address of Nuvi in front of any job posting and land in the app
// with that ad already read and the fitting sheet open. Nothing to install,
// nothing to paste twice, and the link is shareable: a friend who sends you
// a job can send you the Nuvi link instead.
//
// The ad is handed over through the same door the browser extension uses,
// the cvf_incoming_job key, so the app needs to know nothing about where it
// came from: it already turns that into a tracked application with the
// sheet open on it.
//
// This is a catch all, so it also stands where the 404 used to. Anything
// that is not an address renders the same page as before.

import { useEffect, useState } from "react";
import { adresseDepuisLeChemin } from "../../lib/annonceEnLigne.js";
import NotFound from "../not-found.jsx";

const GRIS = "#f5f4f0";
const POLICE = '"Helvetica Neue", Inter, Helvetica, Arial, sans-serif';

export default function Porte({ params }) {
  const segments = (params && params.cible) || [];
  const [etat, setEtat] = useState("depart"); // depart | lecture | erreur | inconnu
  const [message, setMessage] = useState("");
  const [cible, setCible] = useState(null);

  useEffect(() => {
    const requete = typeof window !== "undefined" ? window.location.search : "";
    const url = adresseDepuisLeChemin(segments, requete);
    if (!url) { setEtat("inconnu"); return; }
    setCible(url);
    setEtat("lecture");
    let vivant = true;
    (async () => {
      try {
        const r = await fetch("/api/annonce", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const d = await r.json().catch(() => ({}));
        if (!vivant) return;
        if (!r.ok || !d.job) {
          setMessage((d.error && d.error.message) || "that page could not be read");
          setEtat("erreur");
          return;
        }
        // The extension's own channel: the app consumes this once, opens
        // the fitting sheet on it, and files the application.
        try {
          window.localStorage.setItem("cvf_incoming_job", JSON.stringify({
            ...d.job, capturedAt: Date.now(),
          }));
        } catch { /* storage refused: the app will simply open empty */ }
        window.location.replace("/app");
      } catch {
        if (vivant) { setMessage("the network did not answer"); setEtat("erreur"); }
      }
    })();
    return () => { vivant = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (etat === "inconnu") return <NotFound />;

  return (
    <main data-nuvi="porte-annonce" data-nuvi-etat={etat} style={{
      minHeight: "100dvh", boxSizing: "border-box", display: "flex", flexDirection: "column",
      justifyContent: "flex-end", padding: "clamp(24px, 5vw, 64px)",
      background: GRIS, color: "#000", fontFamily: POLICE, fontWeight: 300,
    }}>
      <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5f5f5f" }}>
        {etat === "erreur" ? "This link" : "Reading the ad"}
      </p>
      <h1 style={{
        margin: "12px 0 0", fontWeight: 300, fontSize: "clamp(1.75rem, 5vw, 3.5rem)",
        lineHeight: 1.05, letterSpacing: "-0.03em", maxWidth: "20ch",
      }}>
        {etat === "erreur" ? "Nuvi could not read that page." : "One moment. Your CV is next."}
      </h1>
      <p style={{ margin: "16px 0 0", fontSize: 15, color: "#5f5f5f", maxWidth: "48ch" }}>
        {etat === "erreur"
          ? message + ". Open the ad, copy the text, and paste it into Nuvi: that always works."
          : (cible ? new URL(cible).hostname : "")}
      </p>
      <a href="/app" style={{
        display: "inline-flex", alignItems: "center", gap: 12, width: 260, height: 48,
        marginTop: 32, padding: "0 24px", color: "#000", textDecoration: "none",
        fontSize: 14, letterSpacing: "0.025em", boxSizing: "border-box",
        clipPath: "polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)",
        border: "1.5px solid #000",
      }}>Open Nuvi <span aria-hidden="true">&rarr;</span></a>
    </main>
  );
}
