"use client";

// WHAT A SCREENING TOOL SEES, ON YOUR OWN FILE, ANY TIME YOU WANT
//
// The diagnostic panel used to claim that downloading a CV had it re-read by
// three real parsers. It did not: the module doing that comparison was
// imported by tests only. The owner of the product used that sentence to
// reassure himself, found out nothing had verified, and stopped believing the
// rest. A promise of verification stops doubt instead of informing it.
//
// The fix is not a better sentence. It is running the check where the person
// can watch it happen, on the file they hold, as often as they like. That is
// this page.
//
// NOTHING LEAVES THE BROWSER
//
// pdf.js is already bundled for CV import, so the file is read on the device
// and never uploaded. That is a real privacy property, not a slogan, and it
// is also why this page can be public with no account: there is no server to
// pay for.
//
// IT ACCEPTS ANY CV, NOT ONLY OURS
//
// A tool that only validates its own output proves nothing. This one reads
// any PDF, including the CV somebody already sends today. That makes it
// useful before Nuvi has done anything for them, and it is the most honest
// demonstration the product can give: here is what the machines actually see.

import { useCallback, useEffect, useRef, useState } from "react";
import { verifierUnPdf } from "../../lib/verifierUnPdf.js";
import { texteDuFichier } from "../../lib/lireUnFichier.js";

const Ink = "var(--nuvi-ink, #0a0a0a)";
const Muted = "var(--nuvi-ink-muted, #5a5a62)";
const Cream = "var(--nuvi-cream, #faf8f3)";
const Paper = "var(--nuvi-paper, #fffdf8)";
const Hair = "var(--nuvi-hairline, #e8e3d6)";
const Coral = "var(--nuvi-coral, #d97757)";
const CoralSoft = "var(--nuvi-coral-soft, #fce7dd)";
const Green = "#2f7d4f";
const GreenSoft = "#e6f4ec";
const Purple = "var(--nuvi-purple, #5b3df5)";
const Serif = "'Fraunces', 'DM Serif Display', Georgia, serif";
const Sans = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const Mono = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

// LES ANIMATIONS DE CETTE PAGE
//
// Elles sont ici et pas dans globals.css parce qu'elles ne servent qu'ici.
// Une seule fait un vrai travail : le balayage. Lire un PDF prend une a deux
// secondes, et pendant ce temps un ecran fige laisse croire a une panne. La
// ligne qui descend dit ce qui se passe, et elle dit VRAI : elle demarre a
// l'ouverture du fichier et s'arrete quand la lecture rend la main.
//
// Le reste est de l'entree decalee. Elle sert la lecture : les six analyseurs
// arrivent l'un apres l'autre, donc on les compte au lieu de voir un bloc.
const KEYFRAMES = `
@keyframes vScan {
  0%   { transform: translateY(-8%);  opacity: 0 }
  12%  { opacity: 1 }
  88%  { opacity: 1 }
  100% { transform: translateY(108%); opacity: 0 }
}
@keyframes vRise {
  from { opacity: 0; transform: translateY(14px) }
  to   { opacity: 1; transform: translateY(0) }
}
@keyframes vPop {
  0%   { transform: scale(.86); opacity: 0 }
  60%  { transform: scale(1.04); opacity: 1 }
  100% { transform: scale(1);   opacity: 1 }
}
@keyframes vBar {
  from { transform: scaleX(0) }
  to   { transform: scaleX(1) }
}
@keyframes vPulse {
  0%, 100% { opacity: .35 }
  50%      { opacity: 1 }
}
.v-rise { animation: vRise 460ms cubic-bezier(.22,1,.36,1) backwards;
          animation-delay: calc(min(var(--r, 0), 10) * 70ms) }
.v-pop  { animation: vPop 420ms cubic-bezier(.22,1,.36,1) backwards;
          animation-delay: calc(min(var(--r, 0), 10) * 70ms) }
.v-bar  { transform-origin: left; animation: vBar 620ms cubic-bezier(.22,1,.36,1) backwards;
          animation-delay: calc(min(var(--r, 0), 10) * 70ms + 120ms) }
.v-zone { transition: border-color 180ms ease, background 180ms ease, transform 180ms ease }
.v-zone[data-glisse="1"] { transform: scale(1.01) }

/* La regle qui compte. Quelqu'un qui a demande moins d'animations ne doit
   pas voir la page bouger, et surtout pas le balayage, qui est le seul
   element vraiment mobile de l'ecran. */
@media (prefers-reduced-motion: reduce) {
  .v-rise, .v-pop, .v-bar, .v-scan, .v-pulse { animation: none !important }
  .v-zone { transition: none !important }
}
`;

// Le compteur qui monte. Il ne sert pas a decorer : il donne le temps de lire
// le chiffre au lieu de le voir apparaitre deja fini.
function Compteur({ vers, duree = 900 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const reduit = window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduit) { setN(vers); return undefined; }
    let brut = null;
    let raf = 0;
    const pas = (t) => {
      if (brut === null) brut = t;
      const p = Math.min(1, (t - brut) / duree);
      // Sortie douce : le chiffre ralentit avant de s'arreter.
      setN(Math.round(vers * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [vers, duree]);
  return <>{n}</>;
}

const LIBELLES = {
  nom: "Ton nom",
  email: "Ton adresse e-mail",
  telephone: "Ton numero",
  rubriques: "Les intitules de rubrique",
  dates: "Les periodes de chaque poste",
  employeurs: "Les employeurs",
  ordre: "L'ordre de lecture",
};

// Ce que chaque controle veut dire, en une phrase, pour quelqu'un qui n'a
// jamais entendu parler d'ATS. Sans ca, "ordre" ne veut rien dire.
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
  const [etat, setEtat] = useState("attente"); // attente | lecture | fait | erreur
  const [resultat, setResultat] = useState(null);
  const [nomFichier, setNomFichier] = useState("");
  const [erreur, setErreur] = useState("");
  const [glisse, setGlisse] = useState(false);
  const [texteOuvert, setTexteOuvert] = useState(false);
  const inputRef = useRef(null);

  const lire = useCallback(async (fichier) => {
    if (!fichier) return;
    setNomFichier(fichier.name || "");
    setErreur("");
    setResultat(null);
    setTexteOuvert(false);
    setEtat("lecture");
    try {
      const texte = await texteDuFichier(fichier);
      // Le balayage doit avoir eu le temps de se voir. Sur un petit PDF la
      // lecture rend la main en 200ms et l'ecran clignote : on ne ment pas
      // sur ce qui se passe, on laisse l'animation finir sa course.
      await new Promise((r) => setTimeout(r, 420));
      setResultat(verifierUnPdf(texte));
      setEtat("fait");
    } catch (e) {
      setErreur((e && e.message) || "Fichier illisible");
      setEtat("erreur");
    }
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setGlisse(false);
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) lire(f);
  }, [lire]);

  const passent = resultat && resultat.profils
    ? resultat.profils.filter((p) => p.passe).length : 0;

  return (
    <main style={{
      minHeight: "100vh", background: Cream, color: Ink,
      fontFamily: Sans, padding: "clamp(28px, 6vw, 72px) clamp(18px, 5vw, 56px) 90px",
    }}>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <div style={{ maxWidth: 940, margin: "0 auto" }}>

        <a href="/" style={{
          fontFamily: Serif, fontSize: 19, color: Ink,
          textDecoration: "none", letterSpacing: "-0.02em",
        }}>Nuvi</a>

        <header style={{ marginTop: "clamp(30px, 7vh, 66px)" }}>
          <div className="v-rise" style={{
            "--r": 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em",
            textTransform: "uppercase", color: Coral, marginBottom: 10,
          }}>Verification</div>
          <h1 className="v-rise" style={{
            "--r": 1, fontFamily: Serif, fontWeight: 400,
            fontSize: "clamp(30px, 6vw, 54px)", lineHeight: 1.05,
            letterSpacing: "-0.035em", margin: 0, maxWidth: "16ch",
          }}>Vois ton CV comme le voit un logiciel de tri.</h1>
          <p className="v-rise" style={{
            "--r": 2, fontSize: 15, lineHeight: 1.6, color: Muted,
            maxWidth: "56ch", marginTop: 16,
          }}>
            Depose n&apos;importe quel CV en PDF, le tien ou un autre. Nuvi le lit
            comme le fait le premier filtre automatique, et te montre ce qui en
            ressort. Aucun compte, et le fichier ne quitte pas ton navigateur.
          </p>
        </header>

        {/* LA ZONE DE DEPOT */}
        <div
          className="v-zone v-rise"
          data-glisse={glisse ? "1" : "0"}
          onDragOver={(e) => { e.preventDefault(); setGlisse(true); }}
          onDragLeave={() => setGlisse(false)}
          onDrop={onDrop}
          style={{
            "--r": 3,
            marginTop: 30, position: "relative", overflow: "hidden",
            border: "1.5px dashed " + (glisse ? Coral : Hair),
            background: glisse ? CoralSoft : Paper,
            borderRadius: 20, padding: "clamp(30px, 6vw, 54px) 24px",
            textAlign: "center",
          }}
        >
          {/* LE BALAYAGE. Il ne tourne que pendant la lecture reelle. */}
          {etat === "lecture" && (
            <div className="v-scan" aria-hidden="true" style={{
              position: "absolute", left: 0, right: 0, top: 0, height: 3,
              background: "linear-gradient(90deg, transparent, " + Coral + ", transparent)",
              animation: "vScan 1100ms cubic-bezier(.4,0,.2,1) infinite",
            }}/>
          )}

          <input
            ref={inputRef} type="file" accept=".pdf,application/pdf,.txt"
            onChange={(e) => lire(e.target.files && e.target.files[0])}
            style={{ display: "none" }}
          />

          <div style={{
            fontFamily: Serif, fontSize: 20, letterSpacing: "-0.02em",
            marginBottom: 6,
          }}>
            {etat === "lecture"
              ? "Lecture du fichier..."
              : nomFichier || "Depose ton CV ici"}
          </div>
          <div style={{ fontSize: 13, color: Muted, marginBottom: 18 }}>
            {etat === "lecture"
              ? "Il est lu sur ton appareil, rien n'est envoye"
              : "PDF, ou glisse-le simplement dans ce cadre"}
          </div>

          <button
            onClick={() => inputRef.current && inputRef.current.click()}
            disabled={etat === "lecture"}
            style={{
              border: "none", cursor: etat === "lecture" ? "default" : "pointer",
              padding: "13px 26px", minHeight: 48, borderRadius: 999,
              background: etat === "lecture" ? Hair : Ink,
              color: etat === "lecture" ? Muted : Cream,
              fontFamily: Sans, fontWeight: 600, fontSize: 14,
            }}
          >{etat === "lecture" ? "Lecture..." : (resultat ? "Choisir un autre CV" : "Choisir un fichier")}</button>
        </div>

        {etat === "erreur" && (
          <div className="v-rise" style={{
            marginTop: 16, background: CoralSoft, border: "1px solid " + Coral,
            borderRadius: 12, padding: "14px 16px", fontSize: 13.5, lineHeight: 1.55,
          }}>
            Ce fichier n&apos;a pas pu etre lu : {erreur}. Si c&apos;est un PDF
            protege par mot de passe, un analyseur ne le lira pas non plus.
          </div>
        )}

        {/* LE CAS QUI JUSTIFIE TOUT L'OUTIL */}
        {etat === "fait" && resultat && !resultat.lisible && (
          <section className="v-rise" style={{ "--r": 0, marginTop: 34 }}>
            <div style={{
              background: CoralSoft, border: "1px solid " + Coral,
              borderRadius: 18, padding: "clamp(22px, 4vw, 34px)",
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
                textTransform: "uppercase", color: Coral, marginBottom: 8,
              }}>Page blanche</div>
              <h2 style={{
                fontFamily: Serif, fontWeight: 400, fontSize: "clamp(22px, 4vw, 32px)",
                letterSpacing: "-0.03em", margin: "0 0 12px", lineHeight: 1.15,
              }}>Ce PDF ne contient aucun texte a lire.</h2>
              <p style={{ fontSize: 14.5, lineHeight: 1.65, color: Ink, margin: 0 }}>
                Il s&apos;affiche parfaitement a l&apos;ecran, et un logiciel de
                tri n&apos;y trouve que {resultat.caracteres} caractere(s). C&apos;est
                le cas le plus dangereux, parce qu&apos;il est invisible : ton CV a
                l&apos;air normal, et il arrive vide devant le premier filtre.
                Cela arrive quand le PDF a ete fabrique a partir d&apos;une photo,
                d&apos;un scan, ou exporte sans couche de texte.
              </p>
            </div>
          </section>
        )}

        {/* LE VERDICT */}
        {etat === "fait" && resultat && resultat.lisible && (
          <>
            <section style={{ marginTop: 40 }}>
              <div className="v-rise" style={{
                "--r": 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
                textTransform: "uppercase", color: Coral, marginBottom: 12,
              }}>Ce que voit la machine</div>

              <div className="v-pop" style={{
                "--r": 1, display: "flex", alignItems: "baseline", gap: 14,
                flexWrap: "wrap", marginBottom: 8,
              }}>
                <div style={{
                  fontFamily: Serif, fontWeight: 300,
                  fontSize: "clamp(52px, 11vw, 86px)", lineHeight: 1,
                  letterSpacing: "-0.05em",
                  color: passent === 6 ? Green : passent >= 4 ? Ink : Coral,
                }}><Compteur vers={passent} /><span style={{ fontSize: "0.42em", color: Muted }}>/6</span></div>
                <div style={{ fontSize: 15, color: Ink, lineHeight: 1.5, maxWidth: "34ch" }}>
                  {passent === 6
                    ? "Les six analyseurs les plus repandus retrouvent tout ce dont ils ont besoin."
                    : passent === 0
                      ? "Aucun des six analyseurs ne retrouve ce dont il a besoin."
                      : passent + " des six analyseurs les plus repandus lisent ton CV en entier."}
                </div>
              </div>

              {/* LES SIX, L'UN APRES L'AUTRE */}
              <div style={{
                display: "grid", gap: 10, marginTop: 22,
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              }}>
                {resultat.profils.map((p, i) => (
                  <div key={p.id} className="v-rise" style={{
                    "--r": i + 2,
                    background: Paper, borderRadius: 14,
                    border: "1px solid " + (p.passe ? Hair : Coral),
                    padding: "14px 16px",
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      gap: 10, marginBottom: p.passe && !p.degradations.length ? 0 : 8,
                    }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{p.nom}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: p.passe ? Green : Coral,
                        background: p.passe ? GreenSoft : CoralSoft,
                        padding: "4px 9px", borderRadius: 999, whiteSpace: "nowrap",
                      }}>{p.passe ? "te lit" : "te perd"}</span>
                    </div>
                    {p.bloquants.map((b) => (
                      <div key={b.quoi} style={{ fontSize: 12.5, color: Ink, lineHeight: 1.5 }}>
                        {LIBELLES[b.quoi] || b.quoi} : {b.fait}
                      </div>
                    ))}
                    {p.passe && p.degradations.map((b) => (
                      <div key={b.quoi} style={{ fontSize: 12.5, color: Muted, lineHeight: 1.5 }}>
                        {LIBELLES[b.quoi] || b.quoi} : {b.fait}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>

            {/* CHAMP PAR CHAMP */}
            <section style={{ marginTop: 44 }}>
              <div className="v-rise" style={{
                "--r": 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
                textTransform: "uppercase", color: Coral, marginBottom: 14,
              }}>Champ par champ</div>
              {Object.entries(resultat.champs).map(([cle, v], i) => (
                <div key={cle} className="v-rise" style={{
                  "--r": i + 1,
                  borderTop: "1px solid " + Hair, padding: "15px 0",
                  display: "grid", gap: "4px 20px",
                  gridTemplateColumns: "minmax(0, 1fr)",
                }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
                    <span aria-hidden="true" style={{
                      color: v.ok ? Green : Coral, fontWeight: 700, fontSize: 14,
                    }}>{v.ok ? "✓" : "✗"}</span>
                    <span style={{ fontWeight: 600, fontSize: 14.5 }}>{LIBELLES[cle] || cle}</span>
                    <span style={{
                      fontSize: 11, color: v.ok ? Green : Coral, fontWeight: 600,
                      letterSpacing: "0.04em", textTransform: "uppercase",
                    }}>{v.ok ? "retrouve" : "perdu"}</span>
                  </div>
                  <div style={{ fontSize: 13.5, color: Ink, lineHeight: 1.55, paddingLeft: 23 }}>
                    {v.fait}
                  </div>
                  {!v.ok && (
                    <div style={{ fontSize: 12.5, color: Muted, lineHeight: 1.55, paddingLeft: 23 }}>
                      {POURQUOI[cle]}
                    </div>
                  )}
                  <div className="v-bar" style={{
                    "--r": i + 1, height: 2, borderRadius: 2, marginTop: 4,
                    marginLeft: 23,
                    background: v.ok ? Green : Coral, opacity: 0.5,
                  }}/>
                </div>
              ))}
            </section>

            {/* LE TEXTE BRUT : LA PREUVE QU'ON NE PEUT PAS CONTESTER */}
            <section style={{ marginTop: 44 }}>
              <button
                onClick={() => setTexteOuvert((o) => !o)}
                style={{
                  border: "1px solid " + Hair, background: Paper, cursor: "pointer",
                  borderRadius: 999, padding: "11px 20px", minHeight: 44,
                  fontFamily: Sans, fontSize: 13, fontWeight: 600, color: Ink,
                }}
                aria-expanded={texteOuvert}
              >{texteOuvert ? "Masquer le texte extrait" : "Voir le texte brut que lit la machine"}</button>

              {texteOuvert && (
                <pre className="v-rise" style={{
                  marginTop: 14, background: Paper, border: "1px solid " + Hair,
                  borderRadius: 14, padding: "18px 20px",
                  fontFamily: Mono, fontSize: 12.5, lineHeight: 1.7,
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                  color: Ink, maxHeight: 460, overflowY: "auto", margin: "14px 0 0",
                }}>{resultat.texte}</pre>
              )}

              <p style={{ fontSize: 12.5, color: Muted, lineHeight: 1.6, marginTop: 14, maxWidth: "62ch" }}>
                Ce texte est tout ce qu&apos;un logiciel de tri recoit. Ni la mise
                en page, ni les couleurs, ni la photo ne lui parviennent. Tu peux
                obtenir le meme resultat sans nous : ouvre ton PDF, tout
                selectionner, copier, coller n&apos;importe ou.
              </p>
            </section>

            {/* CE QUE CETTE PAGE NE PEUT PAS DIRE */}
            <section className="v-rise" style={{
              marginTop: 40, background: Paper, border: "1px solid " + Hair,
              borderRadius: 16, padding: "20px 22px",
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
                textTransform: "uppercase", color: Muted, marginBottom: 8,
              }}>La limite de ce controle</div>
              <p style={{ fontSize: 13.5, lineHeight: 1.65, color: Ink, margin: 0 }}>
                Cette page lit ton fichier et rien d&apos;autre, exactement comme un
                vrai analyseur, qui n&apos;a jamais rien de plus. Elle ne peut donc
                pas savoir ce qui existait AVANT : si une ligne a disparu entre ton
                CV et le PDF, il n&apos;y a rien ici a quoi la comparer. Elle dit ce
                que la machine trouve, pas ce que tu croyais avoir mis.
              </p>
              <p style={{ fontSize: 13.5, lineHeight: 1.65, color: Muted, margin: "10px 0 0" }}>
                Et un analyseur qui te lit n&apos;est pas un recruteur qui te
                rappelle. Passer les six ne dit rien de la force de ton CV, seulement
                qu&apos;il arrive entier devant un humain.
              </p>
            </section>

            <div style={{ marginTop: 34 }}>
              <a href="/app" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "linear-gradient(135deg, " + Purple + ", #b83280)",
                color: "#fff", textDecoration: "none",
                padding: "15px 28px", minHeight: 48, borderRadius: 999,
                fontWeight: 600, fontSize: 14,
              }}>Corriger mon CV avec Nuvi <span aria-hidden="true">&rarr;</span></a>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
