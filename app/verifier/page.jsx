"use client";

// WHAT A SCREENING TOOL SEES, ON YOUR OWN FILE, ANY TIME YOU WANT
//
// The diagnostic panel used to state that downloading a CV had it re-read by
// three real parsers. It did not: the module doing that comparison was
// imported by tests only. The owner relied on that sentence, found out
// nothing verified, and stopped believing the rest. A promise of
// verification stops doubt instead of informing it. So the check now runs
// where the person can watch it, on the file they hold, as often as they
// like.
//
// WHY THE PAGE LOOKS LIKE THIS
//
// The first version was a dashed rectangle and a button on cream. Correct,
// and utterly forgettable. This page has one idea worth seeing, and it is
// visual by nature: a document a human reads is not the document a machine
// reads. So the page IS that idea. Light where the person looks, dark where
// the machine reads, and a beam that turns one into the other.
//
// The demo runs before any file is dropped. Someone who has never heard of
// an ATS gets the whole argument in four seconds without doing anything,
// which is the only way this page earns the upload.
//
// NOTHING LEAVES THE BROWSER
//
// pdf.js is already bundled for CV import, so the file is read on the device
// and never uploaded. That is why the page can be public with no account:
// there is no server to pay for and nothing to store.

import { useCallback, useEffect, useRef, useState } from "react";
import { verifierUnPdf } from "../../lib/verifierUnPdf.js";
import { texteDuFichier } from "../../lib/lireUnFichier.js";
import {
  Ink, Cream, Paper, Coral, CoralSoft, Green, GreenSoft,
  Gray200, Gray600, Serif, Sans,
} from "../components/tokens";

// LES JETONS VIENNENT DE LEUR SOURCE, PAS D'UNE COPIE
//
// La premiere version de cette page recopiait Ink, Cream, Paper, Coral et
// les autres en hexadecimal. tests/the-design-system-does-not-drift.mjs l'a
// refuse, et il a raison : une copie derive, et la precedente avait deja
// derive de sa source. On importe.
//
// Seules les valeurs qui n'existent PAS dans le systeme sont definies ici :
// la gamme sombre de cette page. Elle lui est propre, parce qu'elle porte
// une idee qui n'appartient qu'a elle - le clair est ce que lit un humain,
// le sombre est ce que lit la machine. Si une autre page en a besoin un
// jour, ces trois valeurs remonteront dans tokens.js plutot que d'etre
// recopiees ici une seconde fois.
const Muted = Gray600;
const Hair = Gray200;
const Nuit = "#0e0e10";
const NuitDoux = "#16161a";
const Vert = "#6ee7a5";
const Mono = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

// LES ANIMATIONS
//
// Elles sont ici parce qu'elles ne servent qu'a cette page. Deux d'entre
// elles font un vrai travail plutot que de decorer :
//
// - vBeam est le balayage. Lire un PDF prend une a deux secondes ; un ecran
//   fige pendant ce temps passe pour une panne. Le faisceau ne tourne que
//   pendant la lecture reelle, donc il ne ment jamais sur l'etat.
// - vMeurt fait palir les mots de la demonstration au passage du faisceau.
//   C'est litteralement ce que fait un analyseur : il garde le texte et
//   laisse tomber la mise en forme. On ne l'explique pas, on le montre.
const KEYFRAMES = `
@keyframes vBeam {
  0%   { transform: translateY(-10%); opacity: 0 }
  10%  { opacity: 1 }
  90%  { opacity: 1 }
  100% { transform: translateY(112%); opacity: 0 }
}
@keyframes vMeurt {
  from { opacity: 1; filter: blur(0) }
  to   { opacity: .16; filter: blur(.4px) }
}
@keyframes vNait {
  from { opacity: 0; transform: translateY(6px) }
  to   { opacity: 1; transform: translateY(0) }
}
@keyframes vRise {
  from { opacity: 0; transform: translateY(20px) }
  to   { opacity: 1; transform: translateY(0) }
}
@keyframes vPop {
  0%   { opacity: 0; transform: scale(.9) translateY(10px) }
  65%  { opacity: 1; transform: scale(1.02) translateY(0) }
  100% { opacity: 1; transform: scale(1) translateY(0) }
}
@keyframes vBar   { from { transform: scaleX(0) } to { transform: scaleX(1) } }
@keyframes vGrain { 0%,100% { opacity: .05 } 50% { opacity: .09 } }

.v-rise { animation: vRise 560ms cubic-bezier(.22,1,.36,1) backwards;
          animation-delay: calc(min(var(--r,0), 12) * 65ms) }
.v-pop  { animation: vPop 520ms cubic-bezier(.22,1,.36,1) backwards;
          animation-delay: calc(min(var(--r,0), 12) * 65ms) }
.v-bar  { transform-origin: left;
          animation: vBar 700ms cubic-bezier(.22,1,.36,1) backwards;
          animation-delay: calc(min(var(--r,0), 12) * 65ms + 140ms) }
.v-nait { animation: vNait 300ms ease-out backwards;
          animation-delay: calc(min(var(--r,0), 40) * 34ms) }

/* La demonstration tourne en boucle tant qu'aucun fichier n'est depose. */
.v-demo-beam { animation: vBeam 4.2s cubic-bezier(.5,0,.5,1) infinite }
.v-demo-mot  { animation: vMeurt 500ms ease-out infinite alternate;
               animation-duration: 2.1s;
               animation-delay: calc(var(--p, 0) * 2.4s) }

/* Le faisceau de la lecture reelle : une seule vitesse, en boucle, tant que
   le fichier n'a pas rendu la main. */
.v-scan { animation: vBeam 1150ms cubic-bezier(.4,0,.2,1) infinite }

.v-zone { transition: border-color 240ms ease, background 240ms ease,
                      box-shadow 240ms ease, transform 240ms ease }
.v-zone[data-glisse="1"] { transform: scale(1.008) }

/* La lueur suit le curseur. Elle est posee en variables par le composant, ce
   qui evite de re-rendre React a chaque mouvement de souris. */
.v-lueur::before {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%),
              rgba(217,119,87,.13), transparent 62%);
  opacity: 0; transition: opacity 320ms ease;
}
.v-lueur:hover::before, .v-zone[data-glisse="1"]::before { opacity: 1 }

.v-grain::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background-image: radial-gradient(rgba(255,255,255,.5) .5px, transparent .5px);
  background-size: 3px 3px; opacity: .06;
  animation: vGrain 5s ease-in-out infinite;
}

/* Quelqu'un qui a demande moins d'animation voit la page entiere, immobile.
   Le faisceau disparait : c'est le seul element vraiment mobile. */
@media (prefers-reduced-motion: reduce) {
  .v-rise, .v-pop, .v-bar, .v-nait, .v-demo-mot, .v-grain::after { animation: none !important }
  .v-demo-beam, .v-scan { display: none !important }
  .v-zone { transition: none !important }
  .v-lueur::before { display: none }
}
`;

// La demonstration : une ligne de CV telle qu'un humain la voit, et ce qu'il
// en reste une fois la mise en forme retiree.
const DEMO = [
  { t: "Kilian Maisonnette", gros: true },
  { t: "Bar Manager" },
  { t: "CONTACT", faible: true },
  { t: "k@exemple.com" },
  { t: "EXPERIENCE", faible: true },
  { t: "Bar Manager, Taj Exotica" },
  { t: "2021 - 2024" },
];

function Compteur({ vers, duree = 1100 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const reduit = window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduit) { setN(vers); return undefined; }
    let brut = null; let raf = 0;
    const pas = (t) => {
      if (brut === null) brut = t;
      const p = Math.min(1, (t - brut) / duree);
      setN(Math.round(vers * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [vers, duree]);
  return <>{n}</>;
}

const LIBELLES = {
  nom: "Ton nom", email: "Ton adresse e-mail", telephone: "Ton numero",
  rubriques: "Les intitules de rubrique", dates: "Les periodes de chaque poste",
  employeurs: "Les employeurs", ordre: "L'ordre de lecture",
};
const POURQUOI = {
  nom: "Un logiciel qui ne retrouve pas ton nom cree une fiche sans candidat.",
  email: "C'est par la qu'on te repond. Absente, tu n'existes pas dans la base.",
  telephone: "Beaucoup de recruteurs appellent avant d'ecrire.",
  rubriques: "Un analyseur compare tes titres a une liste connue. « Mon parcours » n'y figure pas.",
  dates: "Sans deux reperes, un poste ne se range dans aucune recherche par anciennete.",
  employeurs: "C'est le nom que le recruteur cherche quand il filtre par secteur.",
  ordre: "Si le bloc contact passe avant ton nom, la fiche prend une adresse pour un candidat.",
};

export default function PageVerifier() {
  const [etat, setEtat] = useState("attente");
  const [resultat, setResultat] = useState(null);
  const [nomFichier, setNomFichier] = useState("");
  const [erreur, setErreur] = useState("");
  const [glisse, setGlisse] = useState(false);
  const [texteOuvert, setTexteOuvert] = useState(false);
  const inputRef = useRef(null);
  const zoneRef = useRef(null);
  const resultatRef = useRef(null);

  // La lueur suit le curseur sans re-rendre React : on ecrit deux variables
  // CSS. Un setState a chaque mousemove ferait travailler le rendu pour un
  // effet purement visuel.
  const onMouse = useCallback((e) => {
    const el = zoneRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", (e.clientX - r.left) + "px");
    el.style.setProperty("--my", (e.clientY - r.top) + "px");
  }, []);

  // GLISSER N'IMPORTE OU SUR LA PAGE
  //
  // Viser un cadre avec un fichier est une corvee sur un grand ecran. La
  // fenetre entiere accepte le depot, et la zone s'allume pour le dire.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    let compte = 0;
    const entre = (e) => { e.preventDefault(); compte += 1; setGlisse(true); };
    const sort = (e) => { e.preventDefault(); compte -= 1; if (compte <= 0) setGlisse(false); };
    const survole = (e) => e.preventDefault();
    window.addEventListener("dragenter", entre);
    window.addEventListener("dragleave", sort);
    window.addEventListener("dragover", survole);
    return () => {
      window.removeEventListener("dragenter", entre);
      window.removeEventListener("dragleave", sort);
      window.removeEventListener("dragover", survole);
    };
  }, []);

  const lire = useCallback(async (fichier) => {
    if (!fichier) return;
    setNomFichier(fichier.name || "");
    setErreur(""); setResultat(null); setTexteOuvert(false);
    setEtat("lecture");
    try {
      const texte = await texteDuFichier(fichier);
      // Le faisceau doit avoir eu le temps d'etre vu. Sur un petit PDF la
      // lecture rend la main en 200ms et l'ecran clignote : on ne ment pas
      // sur ce qui se passe, on laisse le mouvement finir sa course.
      await new Promise((r) => setTimeout(r, 620));
      setResultat(verifierUnPdf(texte));
      setEtat("fait");
      // On amene le resultat sous les yeux : sur telephone il tombe sinon
      // sous la ligne de flottaison et rien n'a l'air de s'etre passe.
      setTimeout(() => {
        const el = resultatRef.current;
        if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (e) {
      setErreur((e && e.message) || "Fichier illisible");
      setEtat("erreur");
    }
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setGlisse(false);
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) lire(f);
  }, [lire]);

  const passent = resultat && resultat.profils
    ? resultat.profils.filter((p) => p.passe).length : 0;
  const montreDemo = etat === "attente" || etat === "erreur";

  return (
    <main style={{
      minHeight: "100vh", background: Cream, color: Ink, fontFamily: Sans,
      overflowX: "clip",
    }}>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <div style={{
        maxWidth: 1120, margin: "0 auto",
        padding: "clamp(22px, 4vw, 40px) clamp(18px, 5vw, 56px) 0",
      }}>
        <a href="/" style={{
          fontFamily: Serif, fontSize: 20, color: Ink,
          textDecoration: "none", letterSpacing: "-0.02em",
        }}>Nuvi</a>
      </div>

      {/* ================= HEROS : LE TITRE, ET LA DEMONSTRATION ========= */}
      <section style={{
        maxWidth: 1120, margin: "0 auto",
        padding: "clamp(34px, 8vh, 86px) clamp(18px, 5vw, 56px) clamp(30px, 6vh, 60px)",
        display: "grid", gap: "clamp(34px, 5vw, 62px)",
        gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
        alignItems: "center",
      }}>
        <div>
          <div className="v-rise" style={{
            "--r": 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.16em",
            textTransform: "uppercase", color: Coral, marginBottom: 14,
          }}>Verification gratuite</div>
          <h1 className="v-rise" style={{
            "--r": 1, fontFamily: Serif, fontWeight: 400,
            fontSize: "clamp(34px, 6.4vw, 68px)", lineHeight: 1.02,
            letterSpacing: "-0.04em", margin: 0,
          }}>
            Ton CV,<br />vu par la machine<br />
            <span style={{ fontStyle: "italic", color: Coral }}>qui te trie.</span>
          </h1>
          <p className="v-rise" style={{
            "--r": 2, fontSize: 16, lineHeight: 1.62, color: Muted,
            maxWidth: "44ch", marginTop: 20,
          }}>
            Avant qu&apos;un recruteur te lise, un logiciel extrait ton CV en
            champs et jette ce qu&apos;il ne sait pas ranger. Depose
            n&apos;importe quel PDF : tu vois exactement ce qu&apos;il en reste.
          </p>
          <div className="v-rise" style={{
            "--r": 3, display: "flex", gap: 10, flexWrap: "wrap",
            marginTop: 24, fontSize: 12, color: Muted,
          }}>
            {["Aucun compte", "Rien n'est envoye", "Six analyseurs reels"].map((x) => (
              <span key={x} style={{
                border: "1px solid " + Hair, borderRadius: 999,
                padding: "7px 14px", background: Paper,
              }}>{x}</span>
            ))}
          </div>
        </div>

        {/* LA DEMONSTRATION : ce que le faisceau laisse derriere lui. */}
        <div className="v-rise" aria-hidden="true" style={{
          "--r": 2, position: "relative",
          background: Paper, borderRadius: 18, border: "1px solid " + Hair,
          boxShadow: "0 30px 70px -40px rgba(10,10,10,.45)",
          padding: "26px 24px", overflow: "hidden",
          minHeight: 300,
        }}>
          {montreDemo && (
            <div className="v-demo-beam" style={{
              position: "absolute", left: 0, right: 0, top: 0, height: 2,
              background: "linear-gradient(90deg, transparent, " + Coral + ", transparent)",
              boxShadow: "0 0 22px 3px rgba(217,119,87,.55)",
            }}/>
          )}
          {DEMO.map((l, i) => (
            <div key={l.t}
              className={montreDemo ? "v-demo-mot" : ""}
              style={{
                "--p": i / DEMO.length,
                fontFamily: l.gros ? Serif : Sans,
                fontSize: l.gros ? 24 : l.faible ? 10 : 13.5,
                fontWeight: l.faible ? 700 : l.gros ? 400 : 500,
                letterSpacing: l.faible ? "0.14em" : "-0.01em",
                textTransform: l.faible ? "uppercase" : "none",
                color: l.faible ? Muted : Ink,
                marginBottom: l.gros ? 4 : 11,
                marginTop: l.faible ? 16 : 0,
              }}>{l.t}</div>
          ))}
          <div style={{
            marginTop: 18, paddingTop: 14, borderTop: "1px dashed " + Hair,
            fontFamily: Mono, fontSize: 11, color: Muted, lineHeight: 1.7,
          }}>
            Kilian Maisonnette / Bar Manager / k@exemple.com /<br />
            Bar Manager, Taj Exotica / 2021-2024
          </div>
          <div style={{
            marginTop: 8, fontSize: 10.5, color: Coral, fontWeight: 600,
            letterSpacing: "0.08em", textTransform: "uppercase",
          }}>Ce qu&apos;il en reste</div>
        </div>
      </section>

      {/* ================= LA ZONE DE DEPOT ============================== */}
      <section style={{
        maxWidth: 1120, margin: "0 auto",
        padding: "0 clamp(18px, 5vw, 56px) clamp(40px, 8vh, 80px)",
      }}>
        <div
          ref={zoneRef}
          className="v-zone v-lueur v-grain v-rise"
          data-glisse={glisse ? "1" : "0"}
          onMouseMove={onMouse}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          style={{
            "--r": 4, position: "relative", overflow: "hidden",
            background: glisse ? NuitDoux : Nuit,
            border: "1px solid " + (glisse ? Coral : "#26262c"),
            boxShadow: glisse
              ? "0 40px 90px -50px rgba(217,119,87,.6)"
              : "0 30px 80px -55px rgba(10,10,10,.7)",
            borderRadius: 22, padding: "clamp(38px, 7vw, 74px) 24px",
            textAlign: "center", color: "#fff",
          }}
        >
          {etat === "lecture" && (
            <div className="v-scan" style={{
              position: "absolute", left: 0, right: 0, top: 0, height: 2,
              background: "linear-gradient(90deg, transparent, " + Vert + ", transparent)",
              boxShadow: "0 0 26px 4px rgba(110,231,165,.5)",
            }}/>
          )}

          <input ref={inputRef} type="file" accept=".pdf,application/pdf,.txt"
            onChange={(e) => lire(e.target.files && e.target.files[0])}
            style={{ display: "none" }}/>

          <div style={{
            fontFamily: Mono, fontSize: 10.5, letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: etat === "lecture" ? Vert : "#6e6e78", marginBottom: 14,
          }}>
            {etat === "lecture" ? "Lecture en cours" : glisse ? "Lache le fichier" : "Depot"}
          </div>

          <div style={{
            fontFamily: Serif, fontSize: "clamp(22px, 3.6vw, 34px)",
            letterSpacing: "-0.03em", marginBottom: 8, color: "#fff",
          }}>
            {etat === "lecture" ? "Nuvi lit ton CV..."
              : nomFichier || "Glisse ton CV n'importe ou sur la page"}
          </div>
          <div style={{ fontSize: 13.5, color: "#8a8a94", marginBottom: 26 }}>
            {etat === "lecture"
              ? "Sur ton appareil. Rien n'est envoye, rien n'est garde."
              : "PDF. Le tien, ou celui que tu envoies deja depuis des mois."}
          </div>

          <button onClick={() => inputRef.current && inputRef.current.click()}
            disabled={etat === "lecture"}
            style={{
              border: "none", cursor: etat === "lecture" ? "default" : "pointer",
              padding: "15px 30px", minHeight: 50, borderRadius: 999,
              background: etat === "lecture" ? "#2a2a30" : Cream,
              color: etat === "lecture" ? "#7a7a84" : Ink,
              fontFamily: Sans, fontWeight: 600, fontSize: 14.5,
              transition: "transform 180ms ease, background 180ms ease",
            }}
          >{etat === "lecture" ? "Lecture..." : (resultat ? "Choisir un autre CV" : "Choisir un fichier")}</button>
        </div>

        {etat === "erreur" && (
          <div className="v-rise" style={{
            marginTop: 16, background: CoralSoft, border: "1px solid " + Coral,
            borderRadius: 14, padding: "15px 18px", fontSize: 13.5, lineHeight: 1.55,
          }}>
            Ce fichier n&apos;a pas pu etre lu : {erreur}. Si c&apos;est un PDF
            protege par mot de passe, un analyseur ne le lira pas davantage.
          </div>
        )}
      </section>

      <div ref={resultatRef} />

      {/* ================= PAGE BLANCHE ================================== */}
      {etat === "fait" && resultat && !resultat.lisible && (
        <section className="v-rise" style={{
          maxWidth: 1120, margin: "0 auto",
          padding: "0 clamp(18px, 5vw, 56px) clamp(50px, 9vh, 96px)",
        }}>
          <div style={{
            background: Nuit, color: "#fff", borderRadius: 22,
            padding: "clamp(30px, 6vw, 56px)", position: "relative", overflow: "hidden",
          }} className="v-grain">
            <div style={{
              fontFamily: Mono, fontSize: 10.5, letterSpacing: "0.18em",
              textTransform: "uppercase", color: Coral, marginBottom: 14,
            }}>Page blanche</div>
            <h2 style={{
              fontFamily: Serif, fontWeight: 400, fontSize: "clamp(26px, 5vw, 44px)",
              letterSpacing: "-0.035em", margin: "0 0 16px", lineHeight: 1.1,
            }}>Ce PDF ne contient aucun texte a lire.</h2>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: "#b8b8c0", margin: 0, maxWidth: "58ch" }}>
              Il s&apos;affiche parfaitement, et un logiciel de tri n&apos;y trouve
              que {resultat.caracteres} caractere(s). C&apos;est le defaut le plus
              dangereux parce qu&apos;il est invisible : ton CV a l&apos;air normal
              et il arrive vide devant le premier filtre. Cela arrive quand le PDF
              vient d&apos;une photo, d&apos;un scan, ou d&apos;un export sans couche
              de texte.
            </p>
          </div>
        </section>
      )}

      {/* ================= LE VERDICT ==================================== */}
      {etat === "fait" && resultat && resultat.lisible && (
        <>
          <section style={{
            maxWidth: 1120, margin: "0 auto",
            padding: "0 clamp(18px, 5vw, 56px) clamp(40px, 7vh, 76px)",
          }}>
            <div className="v-rise" style={{
              "--r": 0, fontFamily: Mono, fontSize: 10.5, letterSpacing: "0.18em",
              textTransform: "uppercase", color: Coral, marginBottom: 18,
            }}>Ce que voit la machine</div>

            <div className="v-pop" style={{
              "--r": 1, display: "flex", alignItems: "flex-end", gap: "clamp(16px, 3vw, 34px)",
              flexWrap: "wrap", marginBottom: 30,
            }}>
              <div style={{
                fontFamily: Serif, fontWeight: 300,
                fontSize: "clamp(76px, 15vw, 150px)", lineHeight: .82,
                letterSpacing: "-0.06em",
                color: passent === 6 ? Green : passent >= 4 ? Ink : Coral,
              }}>
                <Compteur vers={passent} />
                <span style={{ fontSize: "0.34em", color: Muted, letterSpacing: "-0.02em" }}>/6</span>
              </div>
              <div style={{
                fontSize: 17, color: Ink, lineHeight: 1.45, maxWidth: "28ch",
                paddingBottom: 10, fontFamily: Serif, letterSpacing: "-0.015em",
              }}>
                {passent === 6
                  ? "Les six analyseurs les plus repandus te lisent en entier."
                  : passent === 0
                    ? "Aucun des six analyseurs ne retrouve ce dont il a besoin."
                    : passent + " des six analyseurs les plus repandus te lisent en entier."}
              </div>
            </div>

            <div style={{
              display: "grid", gap: 12,
              gridTemplateColumns: "repeat(auto-fill, minmax(262px, 1fr))",
            }}>
              {resultat.profils.map((p, i) => (
                <div key={p.id} className="v-pop" style={{
                  "--r": i + 2, position: "relative", overflow: "hidden",
                  background: p.passe ? Paper : Nuit,
                  color: p.passe ? Ink : "#fff",
                  borderRadius: 16,
                  border: "1px solid " + (p.passe ? Hair : "#2a2a30"),
                  padding: "17px 18px",
                  boxShadow: p.passe ? "none" : "0 24px 50px -40px rgba(10,10,10,.8)",
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 10, marginBottom: p.bloquants.length || p.degradations.length ? 10 : 0,
                  }}>
                    <span style={{ fontWeight: 600, fontSize: 14.5 }}>{p.nom}</span>
                    <span style={{
                      fontFamily: Mono, fontSize: 9.5, fontWeight: 700,
                      letterSpacing: "0.1em", textTransform: "uppercase",
                      color: p.passe ? Green : Coral,
                      background: p.passe ? GreenSoft : "rgba(217,119,87,.16)",
                      padding: "5px 10px", borderRadius: 999, whiteSpace: "nowrap",
                    }}>{p.passe ? "te lit" : "te perd"}</span>
                  </div>
                  {p.bloquants.map((b) => (
                    <div key={b.quoi} style={{ fontSize: 12.5, lineHeight: 1.55, color: "#c9c9d2" }}>
                      {LIBELLES[b.quoi] || b.quoi} : {b.fait}
                    </div>
                  ))}
                  {p.passe && p.degradations.map((b) => (
                    <div key={b.quoi} style={{ fontSize: 12.5, lineHeight: 1.55, color: Muted }}>
                      {LIBELLES[b.quoi] || b.quoi} : {b.fait}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {/* ================= CHAMP PAR CHAMP ============================ */}
          <section style={{
            maxWidth: 1120, margin: "0 auto",
            padding: "0 clamp(18px, 5vw, 56px) clamp(40px, 7vh, 76px)",
          }}>
            <div className="v-rise" style={{
              "--r": 0, fontFamily: Mono, fontSize: 10.5, letterSpacing: "0.18em",
              textTransform: "uppercase", color: Coral, marginBottom: 20,
            }}>Champ par champ</div>
            {Object.entries(resultat.champs).map(([cle, v], i) => (
              <div key={cle} className="v-rise" style={{
                "--r": i + 1, borderTop: "1px solid " + Hair, padding: "18px 0",
              }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 11, flexWrap: "wrap" }}>
                  <span aria-hidden="true" style={{
                    color: v.ok ? Green : Coral, fontWeight: 700, fontSize: 15,
                  }}>{v.ok ? "✓" : "✗"}</span>
                  <span style={{
                    fontFamily: Serif, fontSize: 18, letterSpacing: "-0.02em",
                  }}>{LIBELLES[cle] || cle}</span>
                  <span style={{
                    fontFamily: Mono, fontSize: 9.5, color: v.ok ? Green : Coral,
                    fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                  }}>{v.ok ? "retrouve" : "perdu"}</span>
                </div>
                <div style={{ fontSize: 13.5, color: Ink, lineHeight: 1.6, paddingLeft: 26, marginTop: 5 }}>
                  {v.fait}
                </div>
                {!v.ok && (
                  <div style={{ fontSize: 12.5, color: Muted, lineHeight: 1.6, paddingLeft: 26, marginTop: 5 }}>
                    {POURQUOI[cle]}
                  </div>
                )}
                <div className="v-bar" style={{
                  "--r": i + 1, height: 2, borderRadius: 2, marginTop: 12, marginLeft: 26,
                  background: v.ok ? Green : Coral, opacity: .45,
                }}/>
              </div>
            ))}
          </section>

          {/* ================= LE TEXTE BRUT, EN NOIR ===================== */}
          <section style={{ background: Nuit, color: "#fff", padding: "clamp(50px, 9vh, 96px) 0" }}>
            <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 clamp(18px, 5vw, 56px)" }}>
              <div style={{
                fontFamily: Mono, fontSize: 10.5, letterSpacing: "0.18em",
                textTransform: "uppercase", color: Vert, marginBottom: 14,
              }}>Texte brut</div>
              <h2 style={{
                fontFamily: Serif, fontWeight: 400, fontSize: "clamp(24px, 4.4vw, 40px)",
                letterSpacing: "-0.035em", margin: "0 0 14px", lineHeight: 1.1, maxWidth: "20ch",
              }}>Voila tout ce qu&apos;il recoit.</h2>
              <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "#a8a8b2", maxWidth: "58ch", margin: "0 0 24px" }}>
                Ni la mise en page, ni les couleurs, ni la photo ne lui parviennent.
                Tu obtiens le meme resultat sans nous : ouvre ton PDF, tout
                selectionner, copier, coller n&apos;importe ou.
              </p>

              <button onClick={() => setTexteOuvert((o) => !o)} aria-expanded={texteOuvert}
                data-nuvi-texte-brut="1"
                style={{
                  border: "1px solid #2e2e36", background: NuitDoux, cursor: "pointer",
                  borderRadius: 999, padding: "12px 22px", minHeight: 46,
                  fontFamily: Mono, fontSize: 12, color: "#fff", letterSpacing: "0.04em",
                }}>{texteOuvert ? "Masquer" : "Afficher le texte extrait"}</button>

              {texteOuvert && (
                <div style={{
                  marginTop: 18, background: "#08080a", border: "1px solid #22222a",
                  borderRadius: 16, padding: "20px 22px",
                  maxHeight: 480, overflowY: "auto",
                }}>
                  {resultat.texte.split("\n").map((ligne, i) => (
                    <div key={i} className="v-nait" style={{
                      "--r": i, display: "flex", gap: 16,
                      fontFamily: Mono, fontSize: 12.5, lineHeight: 1.9,
                    }}>
                      <span style={{ color: "#3a3a44", userSelect: "none", minWidth: 26, textAlign: "right" }}>
                        {i + 1}
                      </span>
                      <span style={{ color: ligne.trim() ? "#e6e6ec" : "#3a3a44", whiteSpace: "pre-wrap" }}>
                        {ligne || "·"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ================= LA LIMITE, PUIS LA SUITE =================== */}
          <section style={{
            maxWidth: 1120, margin: "0 auto",
            padding: "clamp(44px, 8vh, 86px) clamp(18px, 5vw, 56px) clamp(60px, 10vh, 110px)",
          }}>
            <div className="v-rise" style={{
              background: Paper, border: "1px solid " + Hair, borderRadius: 18,
              padding: "24px 26px", maxWidth: 720,
            }}>
              <div style={{
                fontFamily: Mono, fontSize: 10, letterSpacing: "0.16em",
                textTransform: "uppercase", color: Muted, marginBottom: 10,
              }}>La limite de ce controle</div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: Ink, margin: 0 }}>
                Cette page lit ton fichier et rien d&apos;autre, exactement comme un
                vrai analyseur, qui n&apos;a jamais rien de plus. Elle ne peut donc
                pas savoir ce qui existait AVANT : si une ligne a disparu entre ton
                CV et le PDF, il n&apos;y a rien ici a quoi la comparer.
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: Muted, margin: "12px 0 0" }}>
                Et un analyseur qui te lit n&apos;est pas un recruteur qui te
                rappelle. Passer les six ne dit rien de la force de ton CV,
                seulement qu&apos;il arrive entier devant un humain.
              </p>
            </div>

            <a href="/app" className="v-rise" style={{
              display: "inline-flex", alignItems: "center", gap: 10, marginTop: 30,
              background: Ink, color: Cream, textDecoration: "none",
              padding: "17px 32px", minHeight: 52, borderRadius: 999,
              fontWeight: 600, fontSize: 15,
            }}>Corriger mon CV avec Nuvi <span aria-hidden="true">&rarr;</span></a>
          </section>
        </>
      )}

      {/* ================= AVANT DEPOT : CE QU'ON CONTROLE =============== */}
      {montreDemo && (
        <section style={{ background: Nuit, color: "#fff", padding: "clamp(54px, 10vh, 104px) 0" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 clamp(18px, 5vw, 56px)" }}>
            <div style={{
              fontFamily: Mono, fontSize: 10.5, letterSpacing: "0.18em",
              textTransform: "uppercase", color: Vert, marginBottom: 16,
            }}>Sept controles, six analyseurs</div>
            <h2 style={{
              fontFamily: Serif, fontWeight: 400, fontSize: "clamp(26px, 4.8vw, 46px)",
              letterSpacing: "-0.035em", margin: "0 0 34px", lineHeight: 1.08, maxWidth: "18ch",
            }}>Ce qu&apos;un logiciel cherche, et perd.</h2>

            <div style={{
              display: "grid", gap: 1, background: "#22222a",
              border: "1px solid #22222a", borderRadius: 16, overflow: "hidden",
              gridTemplateColumns: "repeat(auto-fit, minmax(268px, 1fr))",
            }}>
              {Object.entries(LIBELLES).map(([cle, nom], i) => (
                <div key={cle} style={{
                  background: Nuit, padding: "20px 22px",
                }}>
                  <div style={{
                    fontFamily: Mono, fontSize: 10, color: Vert,
                    marginBottom: 8, letterSpacing: "0.08em",
                  }}>{String(i + 1).padStart(2, "0")}</div>
                  <div style={{
                    fontFamily: Serif, fontSize: 18, letterSpacing: "-0.02em", marginBottom: 7,
                  }}>{nom}</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "#9a9aa4" }}>
                    {POURQUOI[cle]}
                  </div>
                </div>
              ))}
              <div style={{ background: NuitDoux, padding: "20px 22px" }}>
                <div style={{
                  fontFamily: Mono, fontSize: 10, color: Coral,
                  marginBottom: 8, letterSpacing: "0.08em",
                }}>ET</div>
                <div style={{
                  fontFamily: Serif, fontSize: 18, letterSpacing: "-0.02em", marginBottom: 7,
                }}>Workday, Taleo, iCIMS,<br />SuccessFactors, Greenhouse, Lever</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "#9a9aa4" }}>
                  Chacun a ses exigences. Taleo perd des blocs entiers sans
                  rien signaler ; Greenhouse pardonne davantage.
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
