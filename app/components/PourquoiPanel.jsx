"use client";

// Pourquoi personne ne repond.
//
// CE QUE CET ECRAN FAIT QUE LES AUTRES NE FONT PAS
//
// Les onze autres outils reparent chacun une chose. Aucun ne dit LAQUELLE
// est cassee. Quelqu'un qui a envoye deux cents candidatures sans reponse
// n'a pas besoin d'un deux cent unieme CV : il a besoin de savoir laquelle
// des quatre causes possibles est la sienne, parce qu'elles se corrigent de
// quatre facons differentes et qu'on ne peut pas les traiter toutes.
//
// Envoyer en masse, c'est ce qu'on fait quand on ne sait pas ce qui cloche.
//
// LE PARTAGE DU TRAVAIL
//
// Le modele LIT : pour chaque annonce, ce que le parcours couvre deja, si
// l'offre demande au-dessus, ce qui manque. Le verdict se CALCULE dans
// lib/pourquoiPasDentretien.js, en code ordinaire et testable.
//
// Ce partage n'est pas une precaution de style. Un ecran qui affiche "tu
// vises trop haut" est exactement aussi convaincant quand la bonne reponse
// etait "ce n'est pas ton metier" : dans les deux cas c'est une phrase, et
// une phrase a toujours l'air d'une reponse. Le seul moyen de savoir qu'elle
// est fausse, c'est de pouvoir la rejouer sur des entrees fixes.

import { useState, useMemo } from "react";
import { SCHEMA_DIAGNOSTIC } from "./schemas";
import { pourquoiPasDentretien, MINIMUM_ANNONCES } from "../../lib/pourquoiPasDentretien.js";
import { dossierParcours, dossierEnTexte } from "../../lib/careerRecord.js";
import FileDrop from "./FileDrop";
import { nettoyerLAnnonce } from "../../lib/pastedPosting";
import {
  Ink, InkMuted, Cream, Paper, Hairline,
  CoralSoft, GreenSoft, PurpleSoft,
  Sans, Serif, RadiusMd, RadiusPill,
  NO_DASH, CoralText, GreenText, PurpleText } from "./sharedTokens";

// A chaque cause, sa couleur, son texte et l'outil qui la repare. C'est la
// seule table de l'ecran : tout le reste en decoule.
const CAUSES = {
  pas_assez: { teinte: InkMuted,   fond: Cream,      cle: "pas_assez" },
  niveau:    { teinte: PurpleText, fond: PurpleSoft, cle: "niveau" },
  ciblage:   { teinte: CoralText,  fond: CoralSoft,  cle: "ciblage" },
  // "cle" est le suffixe des textes, pas le nom de la cause : les deux ont
  // diverge une fois et le verdict s'est affiche sans titre.
  mots_cles: { teinte: CoralText,  fond: CoralSoft,  cle: "mots" },
  ailleurs:  { teinte: GreenText,  fond: GreenSoft,  cle: "ailleurs" },
};

export default function PourquoiPanel({
  cv, versions = [], T, locale = "fr", apiKey, notify, aiCall, parseJSON,
  onAction,
}) {
  // Trois champs au depart : c'est le minimum, et le montrer evite d'avoir a
  // l'expliquer avant que la personne ait commence.
  const [annonces, setAnnonces] = useState(["", "", ""]);
  const [load, setLoad] = useState(false);
  const [res, setRes] = useState(null);

  const remplies = useMemo(
    () => annonces.map((a) => a.trim()).filter((a) => a.length > 80),
    [annonces]);

  const cvVide = !cv || (!cv.name && !cv.title && !(cv.experience || []).some((e) => e && e.company));

  const changer = (i, v) => setAnnonces((s) => s.map((a, k) => (k === i ? v : a)));

  const lancer = async () => {
    if (cvVide) { notify(T.pq_manque_cv); return; }
    if (remplies.length < MINIMUM_ANNONCES) { notify(T.pq_manque_annonces); return; }
    if (!apiKey) { notify(T.nk); return; }
    setLoad(true);
    setRes(null);
    try {
      // LE DOSSIER, PAS SEULEMENT LE CV AFFICHE
      //
      // La question est "qu'est-ce que ton parcours prouve", pas "qu'est-ce
      // que dit la version ouverte a l'ecran". Quelqu'un qui a plusieurs CV
      // a souvent laisse la moitie de ses preuves dans une autre version, et
      // la juger sur une seule reviendrait a lui reprocher un trou qui n'en
      // est pas un.
      const dossier = dossierEnTexte(dossierParcours(cv, versions));
      const p = "Tu es recruteur. On te donne le parcours d'une personne et "
        + MINIMUM_ANNONCES + " annonces ou plus auxquelles elle a postule sans "
        + "obtenir un seul entretien. Lis chaque annonce et rends, pour "
        + "chacune :\n"
        + "- titre et entreprise tels qu'ils apparaissent dans l'annonce ;\n"
        + "- score : la part des exigences de l'annonce que ce parcours couvre "
        + "DEJA, sur 100. Ne note pas la qualite de la redaction, note la "
        + "matiere.\n"
        + "- niveau : exactement un de ces trois mots. \"dessus\" si l'annonce "
        + "demande plus d'anciennete ou de responsabilite que ce parcours "
        + "montre, \"dessous\" si elle en demande moins, \"niveau\" si c'est la "
        + "meme marche.\n"
        + "- manques : les exigences de l'annonce qu'on ne retrouve NULLE PART "
        + "dans le parcours. Une exigence deja presente sous un autre nom n'est "
        + "pas un manque.\n\n"
        + "Ne conclus rien, ne conseille rien : on te demande des lectures, "
        + "annonce par annonce. La conclusion se calcule ailleurs.\n"
        + "- " + NO_DASH + "\n\n"
        + "PARCOURS:\n" + dossier + "\n\n"
        + remplies.map((a, i) => "ANNONCE " + (i + 1) + ":\n" + a).join("\n\n");

      const txt = await aiCall(p, { cv, schema: SCHEMA_DIAGNOSTIC, task_name: "why-no-interview" });
      const lu = parseJSON(txt);
      const lues = (lu && Array.isArray(lu.annonces)) ? lu.annonces : [];
      setRes(pourquoiPasDentretien(lues));
    } catch (err) {
      notify((T.ea || "Erreur") + ": " + (err && err.message ? err.message : ""));
    }
    setLoad(false);
  };

  const bloc = res ? (CAUSES[res.cause] || CAUSES.pas_assez) : null;

  return (
    <div data-nuvi-pourquoi="1" style={{
      fontFamily: Sans, color: Ink,
      // LE VERRE, MAIS PAS AU PRIX DE LA LECTURE
      //
      // Pose sur le verre nu, le texte devenait illisible : le CV qui vit
      // derriere la modale remontait au travers, et l'introduction se lisait
      // par-dessus "PRODUCT MANAGER" en gris sur gris.
      //
      // La reponse de la maison est la carte de verre : translucide ET
      // floutee. Le flou est ce qui compte, il detruit le texte du dessous au
      // lieu de le laisser concurrencer le notre. L'opacite est celle mesuree
      // plus bas, pas celle du repli de la modale : a 0,5 sur un CV sombre le
      // fond tombe vers un gris moyen et l'encre passe sous 4,5:1.
      background: "var(--nuvi-glass-card, rgba(255,255,255,0.5))",
      backdropFilter: "var(--nuvi-glass-card-blur, blur(20px) saturate(180%))",
      WebkitBackdropFilter: "var(--nuvi-glass-card-blur, blur(20px) saturate(180%))",
      borderRadius: RadiusMd, padding: 18,
    }}>
      <p style={{
        fontSize: 14, lineHeight: 1.55, color: InkMuted, margin: "0 0 20px",
        maxWidth: "56ch",
      }}>{T.pq_intro}</p>

      <div style={{ display: "grid", gap: 10 }}>
        {annonces.map((a, i) => (
          <textarea
            key={i}
            data-pq-annonce={i}
            value={a}
            onChange={(e) => changer(i, e.target.value)}
            onPaste={(e) => {
              const brut = e.clipboardData && e.clipboardData.getData("text/plain");
              if (!brut) return;
              const propre = nettoyerLAnnonce(brut);
              if (propre === brut) return;
              e.preventDefault();
              const c = e.target;
              const d = c.selectionStart == null ? c.value.length : c.selectionStart;
              const f = c.selectionEnd == null ? c.value.length : c.selectionEnd;
              changer(i, c.value.slice(0, d) + propre + c.value.slice(f));
            }}
            placeholder={T.pq_placeholder + " " + (i + 1)}
            rows={3}
            style={{
              width: "100%", boxSizing: "border-box", padding: "12px 14px",
              borderRadius: RadiusMd, border: "0.5px solid " + Hairline,
              background: Paper, color: Ink, fontFamily: Sans,
              // 16px : en dessous, Safari sur iPhone zoome la page des qu'on
              // touche le champ, et ne dezoome jamais tout seul.
              fontSize: 16, lineHeight: 1.5, resize: "vertical",
            }}/>
        ))}
      </div>

      {/* TROIS ANNONCES A LA MAIN, C'EST LE PLUS GROS COUT DE FRAPPE DU
          PRODUIT, et c'est demande sur l'ecran qui dit justement aux gens ce
          qui ne va pas : abandonner ici coute cher. Une annonce se garde
          souvent en PDF ou en capture d'ecran. Le fichier va donc dans le
          premier champ libre, et en ouvre un s'ils sont tous pris. */}
      <FileDrop T={T} quoi="annonce" testId="pourquoi-annonce"
        style={{ marginTop: 10 }}
        onTexte={(texte) => {
          const propre = nettoyerLAnnonce(texte);
          setAnnonces((liste) => {
            const i = liste.findIndex((v) => !String(v || "").trim());
            if (i === -1) return [...liste, propre];
            const suite = [...liste];
            suite[i] = propre;
            return suite;
          });
        }}/>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
        <button
          onClick={() => setAnnonces((s) => [...s, ""])}
          style={{
            minHeight: 44, padding: "0 16px", borderRadius: RadiusPill,
            border: "0.5px solid " + Hairline, background: Paper,
            color: Ink, fontFamily: Sans, fontSize: 14, fontWeight: 500,
          }}>{T.pq_ajouter}</button>
        <button
          data-pq-lancer="1"
          onClick={lancer}
          disabled={load}
          style={{
            minHeight: 44, padding: "0 20px", borderRadius: RadiusPill,
            border: "none", background: Ink, color: Cream,
            fontFamily: Sans, fontSize: 14, fontWeight: 600,
            opacity: load ? 0.6 : 1,
          }}>{load ? T.pq_encours : T.pq_lancer}</button>
      </div>

      {res && (
        <div data-pq-verdict={res.cause} style={{
          marginTop: 24, padding: 18, borderRadius: RadiusMd,
          background: bloc.fond, border: "0.5px solid " + Hairline,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", color: bloc.teinte, marginBottom: 8,
          }}>{res.annonces} {T.pq_annonces_lues}
            {res.cause !== "pas_assez"
              ? " · " + res.mediane + "% " + T.pq_correspondance
              : ""}</div>

          <h3 style={{
            fontFamily: Serif, fontWeight: 400, fontSize: 22, lineHeight: 1.15,
            letterSpacing: "-0.02em", margin: "0 0 10px", color: Ink,
          }}>{T["pq_" + bloc.cle + "_titre"]}</h3>

          <p style={{
            fontSize: 14, lineHeight: 1.6, color: Ink, margin: 0,
            maxWidth: "58ch",
          }}>{T["pq_" + bloc.cle + "_quoi"]}</p>

          {/* LA PREUVE, PARCE QU'UN VERDICT SANS ELLE NE SE VERIFIE PAS
              La personne doit pouvoir aller relire les deux annonces qui ont
              pese le plus, et l'exigence qui manquait a chaque fois. Sans ca
              on lui demande de nous croire. */}
          {res.manquesRecurrents.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{
                fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
                textTransform: "uppercase", color: InkMuted, marginBottom: 6,
              }}>{T.pq_revoir}</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.6 }}>
                {res.manquesRecurrents.slice(0, 4).map((m) => (
                  <li key={m.quoi}>
                    <strong style={{ fontWeight: 600 }}>{m.quoi}</strong> <span style={{ color: InkMuted }}>
                      {m.sur} {T.pq_sur} {res.annonces}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {res.cause !== "pas_assez" && res.exemples.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.6 }}>
                {res.exemples.map((e, i) => (
                  <li key={i}>
                    <strong style={{ fontWeight: 600 }}>{e.titre}</strong>
                    {e.entreprise ? <span style={{ color: InkMuted }}>{" · " + e.entreprise}</span> : null}
                    <span style={{ color: InkMuted }}>{" · " + Math.round(Number(e.score) || 0) + "%"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            data-pq-action={res.cause}
            onClick={() => onAction && onAction(res.cause)}
            style={{
              marginTop: 18, minHeight: 44, padding: "0 20px",
              borderRadius: RadiusPill, border: "none",
              background: Ink, color: Cream,
              fontFamily: Sans, fontSize: 14, fontWeight: 600,
            }}>{T["pq_" + bloc.cle + "_action"]}</button>
        </div>
      )}
    </div>
  );
}
