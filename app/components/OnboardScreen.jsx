"use client";

// Nuvi - OnboardScreen
// Extrait de page.jsx pour permettre le lazy loading.
// [Nuvi rebrand] Couleurs alignees : terracotta (Coral #d97757) + violet/magenta gradient pour CTA primaires.

import { useState, useRef } from "react";
import { texteDuFichier } from "../../lib/lireUnFichier";
import {
  Coral, CoralSoft, Cream, CreamSoft, Gold, GoldDeep, GradCoral, GradDark,
  GradGold, GradPurple, Gray200, Gray400, Gray600, Ink, Paper, RadiusMd,
  RadiusPill, RadiusSm, Sans, Serif, ShadowSm, B, Trans, CoralText } from "./sharedTokens";


// LA LECTURE DES FICHIERS A DEMENAGE
//
// Elle vit maintenant dans lib/lireUnFichier.js, parce que le coach en a
// besoin lui aussi. La recopier aurait donne deux lectures, et la seconde
// n'aurait pas eu le garde-fou du worker pdf.js - qui n'est pas un detail
// mais le resultat d'une panne reelle.
async function extractCvText(file, T) {
  const texte = await texteDuFichier(file, { pdf: T.ob_file_pdf_err });
  if (!String(texte || "").trim()) throw new Error(T.ob_file_format_err);
  return texte;
}

function OnboardScreen({ T, locale, setLocale, apiKey, mode, setMode,
  raw, setRaw, imping, onImport, setTab, setAiMode, lireImageCv,
  choixGabarit, onFromOffer = () => {} }) {

  // Les deux champs du chemin "je pars de l'annonce". Ils vivent ici parce
  // qu'ils ne servent qu'a cet ecran et ne survivent pas a sa fermeture.
  const [offreTexte, setOffreTexte] = useState("");
  const [parcoursTexte, setParcoursTexte] = useState("");

  const fileInputRef = useRef(null);
  const [fileBusy, setFileBusy] = useState("");   // nom du fichier en lecture
  const [fileErr, setFileErr]   = useState("");

  // [Nuvi] Style accent par mode :
  //  - mode "import" simple   : terracotta (Coral)
  //  - mode "import-adapt"    : violet (gradient purple/magenta)
  // Le bouton CTA primaire utilise systematiquement le gradient violet/magenta (signature Nuvi).
  const accent     = mode === "import-adapt" ? Coral     : Coral;
  const accentSoft = mode === "import-adapt" ? CoralSoft : CoralSoft;
  const accentGrad = mode === "import-adapt" ? GradPurple : GradPurple;

  // === Ecran de choix initial ===
  if (!mode) {
    const cards = [
      {
        key:"have", grad:GradCoral,  // [Nuvi] terracotta pour "j'ai deja un CV" (action principale)
        title:T.ob_card_have, desc:T.ob_card_have_desc,
        icon:(<svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v6"/><path d="m9 5 3-3 3 3"/>
          <rect x="4" y="8" width="16" height="14" rx="2"/>
        </svg>),
        onClick:()=>setMode("import"),
      },
      {
        key:"adapt", grad:GradPurple,  // [Nuvi] violet pour "j'adapte a une offre" (Nuvi)
        title:T.ob_card_adapt, desc:T.ob_card_adapt_desc,
        icon:(<svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="6"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>),
        onClick:()=>setMode("import-adapt"),
      },
      {
        key:"create", grad:GradPurple,  // [Nuvi] violet pour "creation Nuvi"
        title:T.ob_card_create, desc:T.ob_card_create_desc,
        icon:(<svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="m4.93 4.93 4.24 4.24"/>
          <path d="m14.83 9.17 4.24-4.24"/>
          <path d="m14.83 14.83 4.24 4.24"/>
          <path d="m9.17 14.83-4.24 4.24"/>
          <circle cx="12" cy="12" r="4"/>
        </svg>),
        onClick:()=>{ setMode("done"); setTab("ai"); setAiMode("generate"); },
      },
      {
        key:"blank", grad:"linear-gradient(135deg,#0a0a0a,#1a1a1f)",
        iconColor:Coral,  // [Nuvi] icone terracotta sur fond noir (etait Gold)
        title:T.ob_card_blank, desc:T.ob_blank_desc,
        icon:(<svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6"/>
        </svg>),
        onClick:()=>setMode("done"),
      },
    ];
    return (
      <div style={{
        position:"fixed", inset:0, zIndex:500,
        background:CreamSoft,
        overflowY:"auto",
        fontFamily:Sans,
      }}>
        <div className="nuvi-choix" style={{
          padding:"28px 24px 40px",
          minHeight:"100%",
          width:"100%", boxSizing:"border-box",
          display:"flex", flexDirection:"column",
        }}>
          {/* Brand Nuvi (etait "CV Factory") */}
          <div style={{
            display:"flex", alignItems:"center", gap:10, marginBottom:48,
          }}>
            <div style={{
              width:36, height:36, background:GradPurple,  // [Nuvi] gradient violet pour le mark
              borderRadius:10, display:"flex",
              alignItems:"center", justifyContent:"center",
              color:"#fff", fontFamily:Serif, fontWeight:600, fontSize:16,
              letterSpacing:"-0.02em",
            }}>N</div>
            <div style={{
              fontFamily:Serif, fontWeight:500, fontSize:20,
              letterSpacing:"-0.01em", color:Ink,
            }}>Nuvi</div>
          </div>
          {/* Hero editorial */}
          <h1 style={{
            fontFamily:Serif, fontWeight:300,
            fontSize:"clamp(32px, 4.6vw, 58px)", lineHeight:1.03,
            letterSpacing:"-0.03em", textWrap:"balance",
            color:Ink, margin:"0 0 18px",
          }}>
            {T.hero_h1_a}
            {" "}
            <em style={{
              fontStyle:"italic", fontWeight:400,
              background:GradPurple,
              WebkitBackgroundClip:"text",
              backgroundClip:"text",
              color:"transparent",
            }}>{T.hero_h1_em}</em>
            {" "}
            {T.hero_h1_b}
          </h1>
          <p style={{
            fontSize:15, lineHeight:1.55,
            color:Gray600, margin:"0 0 32px",
            maxWidth:"94%",
          }}>{T.hero_sub}</p>

          {/* Eyebrow [Nuvi] : terracotta au lieu de GoldDeep */}
          <div style={{
            fontSize:11, fontWeight:600,
            letterSpacing:"0.12em", textTransform:"uppercase",
            color:CoralText, marginBottom:12,
          }}>{T.ob_choose}</div>

          {/* Cartes CTA - cote a cote sur grand ecran : deux choix cote a
              cote se comparent, empiles le second se decouvre apres. */}
          <div className="nuvi-choix-cartes" style={{
            display:"flex", flexDirection:"column", gap:12,
          }}>
            {cards.map(c => (
              <button key={c.key} onClick={c.onClick} style={{
                ...B({
                  background:Paper,
                  borderRadius:RadiusMd,
                  padding:"18px 20px",
                  display:"flex", alignItems:"center", gap:14,
                  boxShadow:ShadowSm,
                  border:"0.5px solid "+Gray200,
                  textAlign:"left",
                  // Jamais "all" : il anime aussi les proprietes de mise en page,
            // que le compositeur ne sait pas traiter seul.
            transition:"background 180ms ease-out, box-shadow 180ms ease-out, transform 140ms ease-out",
                  width:"100%",
                })
              }}>
                <div style={{
                  width:48, height:48,
                  borderRadius:14,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background:c.grad,
                  color:c.iconColor || "#fff",
                  flexShrink:0,
                }}>{c.icon}</div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{
                    fontFamily:Serif, fontWeight:500, fontSize:16,
                    letterSpacing:"-0.01em", color:Ink, marginBottom:2,
                  }}>{c.title}</div>
                  <div style={{
                    fontSize:12, color:Gray600,
                    lineHeight:1.4,
                  }}>{c.desc}</div>
                </div>
                <span style={{color:Gray400, flexShrink:0}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </span>
              </button>
            ))}
          </div>

          {/* Le meme choix etait ici AUSSI, juste sous la question qui vient
              de le poser. Il vit dans les reglages ; il n'a rien a faire sur
              le chemin de quelqu'un qui commence son CV. */}
        </div>
      </div>
    );
  }

  // === Ecran "je pars de l'annonce" ===
  //
  // Deux champs et un bouton. L'annonce dit ce que le poste reclame ; le
  // parcours, meme jete en trois lignes, dit ce que la personne a fait. Nuvi
  // ecrit le CV vise sur cette annonce a partir de ce qu'elle a donne.
  //
  // Aucun sermon nulle part sur ce chemin. Le prompt porte deja QUI_DECIDE,
  // qui interdit au modele de faire la morale, d'avertir ou de transformer une
  // demande en version plus sage. Ici on n'ajoute rien de plus : c'est un
  // outil, il execute.
  if (mode === "offre") {
    const pret = offreTexte.trim().length > 40 && parcoursTexte.trim().length > 10;
    return (
      <div style={{
        position:"fixed", inset:0, zIndex:500, background:CreamSoft,
        overflowY:"auto", fontFamily:Sans,
      }}>
        <div style={{ padding:"24px 24px 48px", maxWidth:760, margin:"0 auto" }}>
          <button onClick={()=>setMode(null)} style={{
            ...B({
              background:"none", color:Gray600, fontSize:13, fontFamily:Sans,
              fontWeight:500, textAlign:"left", padding:"4px 8px 4px 0",
              marginBottom:10, minHeight:44, display:"inline-flex",
              alignItems:"center", gap:6,
            })
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            {T.back}
          </button>

          <h2 style={{
            fontFamily:Serif, fontWeight:400, fontSize:"clamp(24px, 5vw, 38px)",
            letterSpacing:"-0.03em", lineHeight:1.1, margin:"6px 0 8px",
          }}>{T.ob_offre_title}</h2>
          <p style={{ fontSize:14.5, lineHeight:1.6, color:Gray600, margin:"0 0 26px", maxWidth:"52ch" }}>
            {T.ob_offre_sub}
          </p>

          <label style={{ display:"block", marginBottom:18 }}>
            <span style={{
              display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.12em",
              textTransform:"uppercase", color:CoralText, marginBottom:8,
            }}>{T.ob_offre_label}</span>
            <textarea
              value={offreTexte}
              data-nuvi="offre-annonce"
              onChange={(e)=>setOffreTexte(e.target.value)}
              placeholder={T.ob_offre_ph}
              rows={8}
              style={{
                width:"100%", padding:"14px 16px", borderRadius:RadiusSm,
                border:"1px solid "+Gray200, background:Paper, color:Ink,
                fontFamily:Sans, fontSize:14, lineHeight:1.6, resize:"vertical",
                boxSizing:"border-box", outline:"none",
              }}/>
          </label>

          <label style={{ display:"block", marginBottom:10 }}>
            <span style={{
              display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.12em",
              textTransform:"uppercase", color:CoralText, marginBottom:8,
            }}>{T.ob_parcours_label}</span>
            <textarea
              value={parcoursTexte}
              data-nuvi="offre-parcours"
              onChange={(e)=>setParcoursTexte(e.target.value)}
              placeholder={T.ob_parcours_ph}
              rows={7}
              style={{
                width:"100%", padding:"14px 16px", borderRadius:RadiusSm,
                border:"1px solid "+Gray200, background:Paper, color:Ink,
                fontFamily:Sans, fontSize:14, lineHeight:1.6, resize:"vertical",
                boxSizing:"border-box", outline:"none",
              }}/>
          </label>
          <div style={{ fontSize:12.5, color:Gray600, lineHeight:1.55, marginBottom:24 }}>
            {T.ob_parcours_aide}
          </div>

          <button
            onClick={()=>onFromOffer(offreTexte, parcoursTexte)}
            data-nuvi="offre-cta"
            disabled={!pret || imping}
            style={{
              ...B({
                width:"100%", padding:"16px 24px", minHeight:52,
                borderRadius:RadiusPill,
                background: pret && !imping ? GradPurple : Gray200,
                color: pret && !imping ? "#fff" : Gray600,
                fontFamily:Sans, fontWeight:600, fontSize:15,
              })
            }}>{imping ? T.ob_offre_encours : T.ob_offre_cta}</button>
        </div>
      </div>
    );
  }

  // === Ecran d'import (mode "import" ou "import-adapt") ===
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:500,
      background:CreamSoft,
      overflowY:"auto",
      fontFamily:Sans,
    }}>
      <div style={{
        padding:"24px 24px 40px",
        minHeight:"100%",
        width:"100%", boxSizing:"border-box",
      }} className="nuvi-import">
        <div className="nuvi-import-gauche">
        {/* Bouton retour */}
        <button onClick={()=>setMode(null)} style={{
          ...B({
            background:"none", color:Gray600, fontSize:13,
            fontFamily:Sans, fontWeight:500,
            textAlign:"left", padding:"4px 8px 4px 0", marginBottom:10,
            minHeight:44, boxSizing:"border-box",
            display:"inline-flex", alignItems:"center", gap:6,
          })
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          {T.back}
        </button>

        {/* Steps bar editoriale */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"center",
          gap:8, marginBottom:22, fontSize:11,
          fontWeight:600, letterSpacing:"0.04em",
        }}>
          <span style={{color:accent}}>1. {T.ob_step_import}</span>
          <span style={{color:Gray400}}>{">"}</span>
          <span style={{color:Gray600}}>
            2. {mode==="import-adapt" ? T.ob_step_paste_offer : T.ob_step_boost}
          </span>
          <span style={{color:Gray400}}>{">"}</span>
          <span style={{color:Gray600}}>
            3. {mode==="import-adapt" ? T.ob_step_adapt : T.ob_step_download}
          </span>
        </div>

        {/* Hero editorial */}
        <h2 style={{
          fontFamily:Serif, fontWeight:400,
          // La meme echelle que la vitrine. Un titre a 32px fixes sur un
          // ecran de 1440 donne un formulaire administratif ; la vitrine
          // monte a 66px. Deux surfaces du meme produit, une seule voix.
          fontSize:"clamp(30px, 4.4vw, 52px)", lineHeight:1.06,
          letterSpacing:"-0.03em", color:Ink,
          textAlign:"center", margin:"0 0 12px",
          // Evite les lignes veuves sur un titre court.
          textWrap:"balance",
        }}>{mode==="import-adapt" ? T.ob_import_first : T.ob_import_title}</h2>
        <p style={{
          fontSize:"clamp(14px, 1.5vw, 16px)", color:Gray600, lineHeight:1.6,
          textAlign:"center", margin:"0 auto 28px", maxWidth:"52ch",
        }}>
          {mode==="import-adapt" ? T.ob_import_sub_adapt : T.ob_import_sub_boost}
          {" "}{T.ob_import_format}
        </p>

        </div>

        <div className="nuvi-import-droite">
        {/* Champ fichier masque.
            accept : iOS filtre tres mal sur les seules extensions et grise
            alors des fichiers parfaitement valides dans l'app Fichiers. On
            donne aussi les types MIME. */}
        <input
          type="file"
          id="cv-file-upload"
          ref={fileInputRef}
          // Les images comptent : beaucoup de gens n'ont pas leur CV en
          // fichier, ils en ont une photo. Sur telephone, "image/*" ouvre
          // aussi l'appareil photo - on peut donc photographier un CV
          // imprime et repartir avec.
          accept={[
            ".pdf", ".docx", ".txt",
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
            "image/*",
          ].join(",")}
          style={{
            // display:none empeche l'ouverture du selecteur sur certains
            // navigateurs mobiles ; ce masquage-la reste "visible" pour eux.
            position:"absolute", width:1, height:1,
            opacity:0, overflow:"hidden", pointerEvents:"none",
          }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setFileErr("");
            setFileBusy(file.name);
            try {
              // Le lecteur commun distingue ce qui se lit sur place (PDF,
              // DOCX, TXT) de ce qui doit etre regarde (une image). Le texte
              // ne sort jamais du navigateur ; une photo, elle, n'a pas de
              // texte a extraire ici, et c'est le seul cas ou le fichier
              // lui-meme part au modele.
              const { lireUnFichier } = await import("../../lib/lireUnFichier");
              const lu = await lireUnFichier(file, {
                pdf: T.ob_file_pdf_err,
                format: T.ob_file_format_err,
                tropGrosse: T.ob_img_too_big,
              });
              let text = "";
              if (lu.genre === "refus") {
                setFileErr(lu.raison);
              } else if (lu.genre === "image") {
                if (typeof lireImageCv !== "function") {
                  setFileErr(T.ob_file_format_err);
                } else {
                  setFileBusy(T.ob_img_reading);
                  text = await lireImageCv(lu);
                }
              } else {
                text = lu.texte;
              }
              if (lu.genre !== "refus") {
                if (!text || !text.trim()) setFileErr(T.ob_file_empty_err);
                else setRaw(text);
              }
            } catch (err) {
              // alert() disparait tout seul sur certains mobiles : l'erreur
              // doit rester lisible dans la page.
              setFileErr((err && err.message) ? err.message : T.ob_file_read_err);
            } finally {
              setFileBusy("");
              e.target.value = '';
            }
          }}
        />

        {/* Big upload card (paper, dashed accent terracotta) */}
        <button
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          style={{
            ...B({
              // Elle prend toute sa colonne. En grille, un bouton se reduit
              // a son contenu : la zone de depot tombait a 176px sous une
              // zone de texte de 445px - la chose la plus invitante de
              // l'ecran etait devenue la plus petite.
              width:"100%", boxSizing:"border-box",
              padding:"clamp(28px, 5vh, 48px) 18px",
              borderRadius:RadiusMd,
              background:Paper,
              border:"1.5px dashed "+accent,
              color:accent,
              fontWeight:600, fontSize:14,
              display:"flex", flexDirection:"column",
              alignItems:"center", gap:10,
              fontFamily:Sans,
              boxShadow:ShadowSm,
              // Jamais "all" : il anime aussi la mise en page.
              transition:"border-color 200ms ease-out, background 200ms ease-out, box-shadow 200ms ease-out",
            })
          }}
        >
          <div style={{
            width:48, height:48, borderRadius:14,
            background:accentGrad, color:"#fff",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div style={{
            fontFamily:Serif, fontWeight:500, fontSize:16,
            letterSpacing:"-0.01em", color:Ink,
          }}>{T.ob_pick_file}</div>
          <div style={{
            fontSize:11, color:Gray600, fontWeight:400,
          }}>{T.ob_pick_file_hint}</div>
        </button>

        {/* Retour de lecture du fichier.
            Auparavant l'unique signal etait un alert(), qui sur mobile peut
            disparaitre avant d'etre lu : un import rate ne laissait aucune
            trace et l'utilisateur reessayait a l'aveugle. */}
        {fileBusy && (
          <div style={{
            marginTop:10, padding:"11px 14px",
            borderRadius:RadiusSm, background:CreamSoft,
            border:"0.5px solid "+Gray200,
            fontSize:12.5, color:Ink, fontFamily:Sans,
            display:"flex", alignItems:"center", gap:10,
          }} role="status" aria-live="polite">
            <span style={{
              width:14, height:14, flexShrink:0,
              border:"2px solid "+Gray200, borderTopColor:Coral,
              borderRadius:"50%",
              animation:"cvfSpin 0.8s linear infinite",
            }}/>
            {T.ob_file_reading} {fileBusy}
          </div>
        )}
        {fileErr && (
          <div style={{
            marginTop:10, padding:"11px 14px",
            borderRadius:RadiusSm, background:CoralSoft,
            border:"0.5px solid "+Coral,
            fontSize:12.5, color:"#7f1d1d", fontFamily:Sans, lineHeight:1.5,
          }} role="alert">
            {fileErr}
            <div style={{ marginTop:6, fontSize:11.5, color:"#7f1d1d", opacity:.85 }}>
              {T.ob_file_fallback_hint}
            </div>
          </div>
        )}

        {/* Separator */}
        <div style={{
          textAlign:"center",
          color:Gray400,
          fontSize:11,
          letterSpacing:"0.08em",
          textTransform:"uppercase",
          margin:"18px 0 12px",
          fontWeight:500,
        }}>{T.ob_or_paste}</div>

        {/* Paste textarea label [Nuvi] : terracotta au lieu de GoldDeep */}
        <label style={{
          fontSize:11, fontWeight:600,
          letterSpacing:"0.1em", textTransform:"uppercase",
          color:CoralText, marginBottom:8, display:"block",
        }}>{T.ob_paste_label}</label>
        <textarea value={raw} onChange={e=>setRaw(e.target.value)}
          placeholder={T.ob_paste_ph}
          rows={8}
          style={{
            width:"100%",
            padding:"14px 16px",
            borderRadius:RadiusMd,
            border:"0.5px solid "+Gray200,
            background:Paper,
            color:Ink, fontSize:13, lineHeight:1.6,
            resize:"vertical",
            fontFamily:Sans,
            outline:"none",
            boxShadow:ShadowSm,
            boxSizing:"border-box",
          }}/>

        {/* API key warning */}
        {!apiKey && (
          <div style={{
            background:CoralSoft,
            border:"0.5px solid "+Coral,
            borderRadius:RadiusSm,
            padding:"10px 14px",
            fontSize:12, color:Ink,
            marginTop:12, lineHeight:1.5,
          }}>{T.ob_no_key}</div>
        )}

        {/* LE BOUTON N'EXIGE PLUS DE CLE
            Depuis que la lecture locale range un CV ordinaire sans appeler
            personne, l'import marche sans cle d'API. Le bouton restait gris
            et mort pour qui n'en avait pas : la fonctionnalite existait et
            son seul point d'entree etait eteint.

            La condition etait par ailleurs recopiee trois fois - etat, fond,
            couleur. Nommee une fois, elle ne peut plus diverger. */}
        {/* LA FORME DU CV SE CHOISIT ICI, PAS DANS UN PANNEAU DE REGLAGES
            Elle etait decidee d'avance et le selecteur vivait derriere un
            onglet qu'il faut savoir ouvrir : les gens repartaient avec une
            mise en page qu'ils n'avaient pas choisie, sans savoir qu'il y
            en avait cinq autres. Le choix se pose juste avant le bouton,
            pendant que la personne a son document sous les yeux, et il
            reste modifiable ensuite dans Apparence. */}
        {choixGabarit}

        <button onClick={onImport} disabled={imping||!raw.trim()}
          className={(imping||!raw.trim()) ? undefined : "nuvi-cta"} style={{
          ...B({
            padding:"15px 22px",
            borderRadius:RadiusPill,
            background: (imping||!raw.trim()) ? Gray200 : GradPurple,
            color: (imping||!raw.trim()) ? Gray600 : "#fff",
            fontWeight:600, fontSize:14,
            fontFamily:Sans,
            marginTop:14,
            transition: Trans(["background","color","border-color","box-shadow","transform","opacity"], "fast"),
            display:"inline-flex",
            alignItems:"center", justifyContent:"center", gap:8,
            boxShadow: (imping||!raw.trim())
              ? "none"
              : "0 4px 16px rgba(91, 61, 245, 0.25)",
          })
        }}>
          {imping ? T.ob_parsing : (mode==="import-adapt" ? T.ob_continue_adapt : T.ob_parse)}
          {!imping && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          )}
        </button>

        {/* Continue without key (only when key missing) */}
        {!apiKey && (
          <button onClick={()=>setMode("done")} style={{
            ...B({
              padding:"10px 22px", borderRadius:RadiusPill,
              background:"transparent",
              color:Gray600, fontSize:12,
              marginTop:8,
            })
          }}>{T.ob_continue}</button>
        )}

        </div>

        {/* ON NE REDEMANDE PAS CE QU'ON VIENT DE DEMANDER

            La langue est demandee au tout premier ecran, dans une fenetre qui
            barre la route tant qu'on n'a pas repondu. Reafficher le meme
            choix en bas de l'ecran suivant donnait l'impression que la
            reponse n'avait pas ete prise - on se demande si on doit
            recommencer.

            Le choix reste evidemment modifiable : il vit dans les reglages,
            la ou l'on va quand on veut changer quelque chose, et non sur le
            chemin de quelqu'un qui essaie d'importer son CV. */}
      </div>
    </div>
  );
}

export default OnboardScreen;
