"use client";

// Deposer un fichier, partout ou l'on demande du texte.
//
// POURQUOI CE COMPOSANT EXISTE
//
// Le produit demandait du texte colle a onze endroits : l'annonce sur
// l'ecran d'accueil, l'annonce dans le panneau d'adaptation, les trois
// annonces du diagnostic, l'annonce du pack de candidature, celle de la
// strategie multi-CV, celle de l'entretien, celle de l'assistance en direct,
// le parcours du generateur. Deux seulement acceptaient un fichier.
//
// Or les gens que Nuvi vise n'ont presque jamais leur materiau en texte. Ils
// ont un CV en PDF envoye par un ami, un vieux document Word, la photo d'un
// CV imprime, une capture d'ecran de l'annonce prise dans le metro. Leur
// repondre "colle le texte" revient a leur demander de le retaper sur un
// telephone, c'est a dire a leur demander d'abandonner. C'est exactement la
// friction que ce produit existe pour supprimer.
//
// Une seule implementation, donc, et pas onze : les garde-fous qui comptent
// ici viennent tous de pannes reelles - le worker pdf.js qui partait chercher
// un CDN, la photo trop lourde, l'alerte qui disparait toute seule sur
// mobile. Une copie n'en aurait aucun.

import { createContext, useContext, useRef, useState } from "react";

// LA LECTURE D'IMAGE VIENT D'EN HAUT
//
// Une image n'a pas de texte a extraire dans le navigateur : c'est le seul
// cas ou le fichier part au modele, qui le relit. Cette lecture-la vit dans
// AppRoot, ou l'appel au modele est cable. La faire descendre en prop a
// travers dix composants aurait coute dix signatures elargies pour une
// valeur qui ne change jamais : un contexte dit la meme chose une fois.
//
// Sans fournisseur, la valeur est nulle et le composant refuse poliment les
// images en acceptant tout le reste. C'est le bon comportement par defaut :
// une vitrine sans cle d'API n'a pas de quoi lire une photo.
export const ContexteLireImage = createContext(null);

// iOS filtre tres mal sur les seules extensions et grise alors des fichiers
// parfaitement valides dans l'app Fichiers : on donne aussi les types MIME.
// Sur telephone, "image/*" ouvre en plus l'appareil photo, donc on peut
// photographier une annonce affichee ou un CV imprime et repartir avec.
export const TYPES_ACCEPTES = [
  ".pdf", ".docx", ".txt",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/*",
].join(",");

// display:none empeche l'ouverture du selecteur sur certains navigateurs
// mobiles ; ce masquage-la reste "visible" pour eux.
export const INPUT_CACHE = {
  position: "absolute", width: 1, height: 1,
  opacity: 0, overflow: "hidden", pointerEvents: "none",
};

// Ajouter plutot qu'ecraser. Quelqu'un peut avoir tape deux lignes avant de
// penser a son vieux CV ; les perdre au moment ou il essaie d'en donner plus
// serait la pire facon de le recompenser.
export function joindreAuTexte(avant, ajout) {
  const a = String(avant || "").trim();
  const b = String(ajout || "").trim();
  if (!a) return b;
  if (!b) return a;
  return a + "\n\n" + b;
}

// Les libelles, par nature de ce qu'on depose. Le mot compte : "depose ton
// CV" et "depose l'annonce" ne s'adressent pas au meme geste, et un libelle
// generique laisserait la personne se demander lequel des deux champs il
// remplit.
// LES LIBELLES SURVIVENT A UN DICTIONNAIRE INCOMPLET
//
// Le composant se pose sur des ecrans qui n'ont pas tous le meme T :
// l'assistance en direct construit le sien, court, sur place. Un libelle
// manquant s'afficherait alors "undefined" a l'ecran, ce qui est pire que
// tout ce que ce composant est venu reparer. Les valeurs de repli sont donc
// completes et bilingues ; le dictionnaire du produit prime des qu'il les a.
const REPLI = {
  fr: {
    depot_annonce: "Ou depose l'annonce : PDF, Word ou une capture d'ecran",
    depot_cv: "Ou depose ton CV : PDF, Word ou une photo",
    depot_parcours: "Ou depose un fichier : PDF, Word, ou une photo de ton CV",
    ob_file_reading: "Lecture de",
    ob_img_reading: "Nuvi lit l'image...",
    ob_file_pdf_err: "Ce PDF n'a pas pu etre lu. Essaie un autre format, ou une photo.",
    ob_file_format_err: "Format non pris en charge. PDF, Word, texte ou image.",
    ob_file_empty_err: "Aucun texte n'a pu etre lu dans ce fichier.",
    ob_file_read_err: "Ce fichier n'a pas pu etre lu.",
    ob_img_too_big: "Cette image est trop lourde. Reduis-la ou reprends la photo.",
  },
  en: {
    depot_annonce: "Or upload the posting: PDF, Word or a screenshot",
    depot_cv: "Or upload your CV: PDF, Word or a photo",
    depot_parcours: "Or upload a file: PDF, Word, or a photo of your CV",
    ob_file_reading: "Reading",
    ob_img_reading: "Nuvi is reading the image...",
    ob_file_pdf_err: "This PDF could not be read. Try another format, or a photo.",
    ob_file_format_err: "Unsupported format. PDF, Word, text or an image.",
    ob_file_empty_err: "No text could be read from this file.",
    ob_file_read_err: "This file could not be read.",
    ob_img_too_big: "This image is too large. Shrink it or take the photo again.",
  },
};

function mots(T, locale) {
  const base = REPLI[locale === "en" ? "en" : "fr"];
  const out = { ...base };
  for (const k of Object.keys(base)) {
    if (T && typeof T[k] === "string" && T[k]) out[k] = T[k];
  }
  return out;
}

function libelleDe(quoi, T) {
  if (quoi === "cv") return T.depot_cv;
  if (quoi === "parcours") return T.depot_parcours;
  return T.depot_annonce;
}

// LA LECTURE, SANS LE BOUTON
//
// L'ecran d'import a sa propre zone de depot, grande, dessinee, et qui porte
// tout le poids de cet ecran-la : elle ne peut pas devenir un petit bouton
// pour partager du code. Le crochet rend donc la lecture seule, et les deux
// habillages se posent dessus. C'etait ca, ou une deuxieme copie des
// garde-fous, et une deuxieme copie ne les aurait pas eus.
export function useLectureDeFichier(T, locale) {
  const lireImage = useContext(ContexteLireImage);
  const M = mots(T, locale);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const lire = async (file, deposer) => {
    if (!file) return;
    setErr("");
    setBusy(file.name);
    try {
      const { lireUnFichier } = await import("../../lib/lireUnFichier");
      const lu = await lireUnFichier(file, {
        pdf: M.ob_file_pdf_err,
        format: M.ob_file_format_err,
        tropGrosse: M.ob_img_too_big,
      });
      let texte = "";
      if (lu.genre === "refus") {
        setErr(lu.raison);
      } else if (lu.genre === "image") {
        if (typeof lireImage !== "function") {
          setErr(M.ob_file_format_err);
        } else {
          setBusy(M.ob_img_reading);
          texte = await lireImage(lu);
        }
      } else {
        texte = lu.texte;
      }
      if (lu.genre !== "refus") {
        if (!texte || !texte.trim()) setErr(M.ob_file_empty_err);
        else deposer(texte.trim());
      }
    } catch (e) {
      // alert() disparait tout seul sur certains mobiles : l'erreur doit
      // rester lisible dans la page.
      setErr((e && e.message) ? e.message : M.ob_file_read_err);
    } finally {
      setBusy("");
    }
  };

  return { lire, busy, err, setErr };
}

export default function FileDrop({
  T,
  locale,
  onTexte,
  quoi = "annonce",     // "annonce" | "cv" | "parcours"
  couleurs = {},
  style = {},
  remplace = false,     // vrai quand le champ ne peut porter qu'une chose
  testId,
}) {
  const champRef = useRef(null);
  const [survole, setSurvole] = useState(false);
  const M = mots(T, locale);
  const { lire: lireLeFichier, busy, err } = useLectureDeFichier(T, locale);

  const Encre = couleurs.encre || "var(--nuvi-coral-text, #a8442a)";
  const Filet = couleurs.filet || "var(--nuvi-gray-200, #e8e3d6)";
  const Papier = couleurs.papier || "var(--nuvi-paper, #fff)";
  const Gris = couleurs.gris || "var(--nuvi-gray-text, #6b6660)";

  const lire = (f) => lireLeFichier(f, (texte) => onTexte(texte, { remplace }));

  return (
    <div
      style={{ ...style }}
      // Le glisser-deposer double le bouton sans le remplacer : sur
      // ordinateur c'est le geste naturel, sur telephone il n'existe pas.
      onDragOver={(e) => { e.preventDefault(); setSurvole(true); }}
      onDragLeave={() => setSurvole(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSurvole(false);
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) lire(f);
      }}
    >
      <input
        type="file"
        ref={champRef}
        data-nuvi-depot-champ={testId || quoi}
        accept={TYPES_ACCEPTES}
        style={INPUT_CACHE}
        onChange={async (e) => {
          const f = e.target.files && e.target.files[0];
          await lire(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => champRef.current && champRef.current.click()}
        data-nuvi-depot={testId || quoi}
        disabled={!!busy}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: survole ? "var(--nuvi-coral-soft, #fdf0eb)" : Papier,
          border: "1px dashed " + (survole ? Encre : Filet),
          color: busy ? Gris : Encre,
          borderRadius: 10, padding: "10px 14px", minHeight: 44,
          fontFamily: "inherit", fontWeight: 600, fontSize: 13,
          cursor: busy ? "progress" : "pointer",
          width: "100%", justifyContent: "center", boxSizing: "border-box",
          transition: "border-color 160ms ease, background 160ms ease",
        }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <span>{busy ? M.ob_file_reading + " " + busy : libelleDe(quoi, M)}</span>
      </button>
      {err ? (
        <div role="alert" data-nuvi-depot-err={testId || quoi} style={{
          fontSize: 12.5, lineHeight: 1.5, color: Encre, marginTop: 8,
        }}>{err}</div>
      ) : null}
    </div>
  );
}
