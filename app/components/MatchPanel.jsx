"use client";

// Nuvi v3 - MatchPanel (refondu palette Nuvi).
//
// Adapte le CV a une offre d'emploi.

import { useState, useMemo } from "react";
import { SCHEMA_MATCH } from "./schemas";
import { rapport } from "../../lib/atsMatch.js";
import { normCV } from "../../lib/cvSchema.js";
import { aiCall, parseJSON } from "../../lib/ai.js";
import FileDrop, { joindreAuTexte } from "./FileDrop";
import { nettoyerLAnnonce, ANNONCE_MINIMUM } from "../../lib/pastedPosting";
import { dossierParcours, apportDuDossier, dossierEnTexte } from "../../lib/careerRecord.js";
import {
  Ink, InkMuted, Cream, CreamSoft, Paper, Hairline,
  Coral, CoralSoft, Green, GreenSoft, Purple, Magenta, PurpleSoft,
  Sans, Serif, RadiusMd, RadiusPill, ShadowSm,
  B, IN, LBL, NO_DASH, CoralText, GreenText, PurpleText } from "./sharedTokens";

// ONE THING IS COLOURED, AND IT IS THE ONE THING COLOUR MEANS SOMETHING
//
// The result used to be ten filled boxes down a narrow column, each with its
// own tint, its own border and its own shouted label. Green carried three
// unrelated ideas (applied, keywords present, seniority), coral carried
// three more (the hook, the hidden signals, the questions), purple two. The
// colour was rotation, not meaning, so nothing stood out and the panel read
// as noise on the screen someone looks at on every single application.
//
// Border, fill and radius each say "separate object". Spent on every block
// they say nothing. So they are spent once: on the score, which is the
// summary, and on the two keyword lists, where green against coral is the
// only genuine pair on the panel, already in your CV against missing from
// it. Everything else is a section: a quiet label, its text, and the space
// between them. No feature left, nothing hidden, one voice instead of ten.
function Section({ label, children, last = false }) {
  return (
    <div style={{
      paddingBottom: last ? 0 : 14, marginBottom: last ? 0 : 14,
      borderBottom: last ? "none" : "0.5px solid " + Hairline,
    }}>
      <div style={{
        fontSize: 9.5, fontWeight: 700, color: InkMuted, marginBottom: 7,
        letterSpacing: "0.07em", textTransform: "uppercase",
      }}>{label}</div>
      {children}
    </div>
  );
}

function MatchPanel({ cv, versions = [], setCVFn, notify, apiKey, T, locale = "en", onPackRequest,
  onResult, onApplied, initialResult, initialOffer = "",
  pushH, onCreateFromOffer, onUndo, onDownload }) {
  // `initialOffer` vient du suivi de candidatures : ouvrir "Adapter mon CV"
  // depuis une candidature arrive avec son annonce deja collee.
  const [offer, setOffer] = useState(initialOffer || "");
  const [load, setLoad]   = useState(false);
  const [res, setRes]     = useState(initialResult || null);
  const [ph, setPh]       = useState(initialResult ? "done" : "input");

  // L'ECART SE CALCULE AVANT DE DEPENSER UN APPEL
  //
  // Ce rapport ne coute rien, ne part nulle part, et ne peut rien inventer :
  // il compare deux textes. Il n'a donc aucune raison d'attendre l'IA.
  //
  // Il repond a une question que l'IA ne pose pas : parmi ce qui manque,
  // qu'est-ce que la personne a DEJA mais nomme autrement ? C'est le cas le
  // plus frequent et le seul qu'on puisse corriger sans rien exagerer.
  // Taleo indexe en booleen : "stock and wastage control" et "stock control"
  // ne se rencontrent jamais, meme si c'est le meme travail.
  //
  // Le seuil de 120 caracteres evite d'analyser trois mots colles par erreur.
  const ecart = useMemo(
    () => (offer.trim().length > 120 ? rapport(cv, offer) : null),
    [cv, offer]
  );

  // DEUX CHEMINS, ET LE SECOND N'APPARAIT QUE S'IL CHANGE QUELQUE CHOSE
  //
  //   "actuel"   on part du CV a l'ecran. Rapide, previsible.
  //   "parcours" on part de TOUT ce qui a ete enregistre : le CV courant plus
  //              chaque version sauvegardee. Quelqu'un qui garde une version
  //              hotellerie et une version commerciale, et qui postule au
  //              commercial avec la premiere chargee, obtient sinon une
  //              adaptation batie sur le mauvais materiau. Son experience
  //              existe, elle est enregistree, et personne ne va la chercher.
  //
  // Le choix ne s'affiche que si le dossier apporte reellement quelque chose.
  // Proposer une option qui rend le meme resultat decoit plus qu'elle n'aide.
  const apport = useMemo(() => apportDuDossier(cv, versions), [cv, versions]);

  // UN CLIC, ET LE CV EST A L'ECRAN
  //
  // "Coller l'annonce, choisir le CV, et Nuvi fait le meilleur CV possible."
  // Le choix du point de depart et le lancement sont le meme geste, et le
  // resultat s'applique tout seul : c'est le proprietaire du produit qui le
  // demande. Ce qui reste a la personne : voir ce qui a change, et Ctrl+Z,
  // ou le bouton "Remettre le precedent", qui ne coute rien. `applique`
  // dit si le CV a l'ecran est deja l'adapte ; `creation` dit qu'on ecrit
  // un CV depuis l'annonce seule plutot que d'en adapter un.
  const [applique, setApplique] = useState(false);
  const [creation, setCreation] = useState(false);

  const lancer = async (choix, baseChoisie) => {
    if (!offer.trim()) { notify(T.off_no_offer); return; }
    if (!apiKey) { notify(T.nk); return; }
    // Le point de depart : le CV a l'ecran, ou un CV enregistre que la
    // personne vient de choisir. Le CV enregistre ne passe pas par l'ecran
    // avant : on part de lui directement, et c'est le resultat qui s'y pose.
    const base = baseChoisie || cv;
    setLoad(true);
    setPh("loading");
    const expT = (base.experience || []).map(e =>
      e.title + " chez " + e.company
      + " (" + e.period + "): "
      + (e.bullets || []).filter(b=>b).join("; ")
    ).join(" | ");
    const cvT = "Profil: " + base.name + " - " + base.title
      + "\nAccroche: " + base.summary
      + "\nExps: " + expT
      + "\nSkills: " + (base.skills || []).filter(s=>s).join(", ")
      + "\nLangues: " + (base.languages || []).filter(l=>l && l.lang)
          .map(l=>l.lang+" "+l.level).join(", ");
    // Le materiau change selon le chemin. En mode "parcours", on ne donne plus
    // le seul CV a l'ecran mais tout ce que la personne a deja ecrit, et on
    // demande de CHOISIR dedans. Choisir dans ce qu'on a fait n'est pas
    // inventer : c'est ce que fait quiconque adapte son CV a la main.
    const materiau = choix === "parcours"
      ? dossierEnTexte(dossierParcours(cv, versions))
      : cvT;

    // AN APPLICATION IS WRITTEN IN THE LANGUAGE OF THE AD
    //
    // This prompt said nothing about language. It is written in French, so
    // the model answered in French: the decoding, the cover letter hook,
    // and the rewritten CV itself. Someone applying in London, interface in
    // English, ad in English, got a French CV to send to a British
    // recruiter. This is the central action of the product, and it made the
    // application unusable with nothing on screen to say so.
    //
    // The rule is the one a person applying already follows: you write in
    // the language of the ad. Not the interface language, which only says
    // what someone prefers to read; not the source CV's, which only says
    // where they started. Translating your own sentences is not inventing:
    // the same facts, in the reader's language.
    //
    // The interface language is only the fallback, for an ad too short or
    // too mixed to decide from.
    const langueDeLaCandidature =
      "LANGUE : redige TOUT (decodage, accroche, questions, et le CV optimise "
      + "en entier) dans la langue de l'OFFRE ci-dessus. Si l'offre ne permet "
      + "pas de trancher, ecris en "
      + (locale === "en" ? "anglais" : "francais") + ". "
      + "Les intitules de poste, les noms d'entreprise et les noms d'ecole "
      + "restent tels quels.\n";

    const p = "Expert recrutement. Decode l'offre fournie + reecris le CV pour matcher.\n"
      + langueDeLaCandidature
      +"OFFRE:\n"+offer+"\n"
      +(choix === "parcours"
        ? "PARCOURS COMPLET (toutes les versions enregistrees par le candidat) :\n"
          + materiau + "\n"
          + "Construis le CV de CETTE offre en CHOISISSANT dans ce parcours : garde ce "
          + "qui sert l'offre, ecarte le reste, et quand une experience a plusieurs "
          + "formulations retiens celle qui parle le plus la langue de l'offre. "
          + "N'ajoute rien qui ne figure pas ci-dessus.\n"
        : "CV:\n"+cvT+"\n")
      +"REGLES: ne pas inventer, adapter mots-cles offre. " + NO_DASH + "\n"
      +"Sois precis et actionnable. Le decodage de l'offre doit reveler des elements caches.\n"
      // C'est la promesse du produit : coller une offre et obtenir un CV qui
      // passe le tri automatique. Les mots-cles manquants ne servent a rien
      // s'ils restent dans une liste a cote ; il faut qu'ils soient dans le
      // CV, avec les termes exacts de l'offre, sinon le robot ne les voit pas.
      +"CV_OPTIMIZED, exigences supplementaires :\n"
      +"- Reprends dans le CV les termes exacts de l'offre (pas de synonyme) quand"
      +" l'experience reelle du candidat les justifie : c'est sur ces chaines que"
      +" le tri automatique compare.\n"
      +"- Chaque mot-cle de keywords_to_add que le parcours permet d'appuyer doit"
      +" apparaitre dans summary, dans un bullet, ou dans skills. Laisse de cote"
      +" ceux que rien ne justifie plutot que d'inventer.\n"
      +"- Le titre doit reprendre l'intitule du poste vise s'il est credible.\n"
      +"- Garde chaque bullet sur une ligne de texte simple, avec un verbe d'action"
      +" et un chiffre quand il existe. Ni tableau, ni colonne, ni caractere"
      +" decoratif : le CV doit rester lisible par une machine.\n"
      // Forme garantie par SCHEMA_MATCH : le gabarit qui tenait ici
      // decrivait l'analyse ET un CV complet, recopie a la main, alors que
      // l'API impose desormais les deux.
      +"- Le CV optimise reprend la structure du CV source, champ pour champ.";
    try {
      const txt = await aiCall(p, { schema: SCHEMA_MATCH, task_name: "match" });
      const r = parseJSON(txt);
      // LE RESULTAT SE POSE TOUT SEUL, ET SE REPREND D'UN GESTE
      // Un instantane d'abord : c'est l'action centrale du produit et elle
      // remplace TOUT le CV. Sans lui, une adaptation moins bonne que
      // l'original etait sans retour.
      if (r && r.cv_optimized) {
        if (typeof pushH === "function") pushH();
        setCVFn(() => normCV(r.cv_optimized, base));
        setApplique(true);
      }
      setRes(r);
      setPh("done");
      if (onResult) onResult(r);
    } catch { notify(T.ea); setPh("input"); }
    setLoad(false);
  };
  const analyze = () => lancer("actuel", null);

  // ECRIRE LE CV DE CE POSTE, SANS RIEN D'AUTRE QUE L'ANNONCE
  // La meme porte que l'accueil : le CV que ce poste reclame, complet, avec
  // ce que Nuvi ne peut pas savoir de la personne signale pour qu'elle le
  // remplace. Il se pose a l'ecran ; la feuille se ferme dessus.
  const creer = async () => {
    if (!offer.trim()) { notify(T.off_no_offer); return; }
    if (typeof onCreateFromOffer !== "function") return;
    setCreation(true);
    setLoad(true);
    setPh("loading");
    try {
      const annonce = offer;
      const ecrit = await onCreateFromOffer(offer);
      setOffer("");
      setRes(null);
      setPh("input");
      if (onApplied) onApplied(annonce, null, ecrit || null);
    } catch {
      notify(T.ea);
      setPh("input");
    }
    setLoad(false);
    setCreation(false);
  };

  const apply = () => {
    if (!res || !res.cv_optimized) return;
    // Rouvert depuis un resultat garde en memoire, ou remis en arriere par
    // "Remettre le precedent" : le CV a l'ecran n'est pas l'adapte, on le
    // pose maintenant, avec l'instantane qui permet d'y revenir.
    // When already applied, the CV on screen IS the fitted one; otherwise
    // it is built here, and the same object goes to the editor and to the
    // application row, so the row keeps exactly what the person sees.
    const envoye = applique ? cv : normCV(res.cv_optimized, cv);
    if (!applique) {
      if (typeof pushH === "function") pushH();
      setCVFn(() => envoye);
    }
    notify(T.mt_applied);
    const annonce = offer, resultat = res;
    setPh("input");
    setRes(null);
    setOffer("");
    setApplique(false);
    // The ad, the result and the CV travel with the gesture, so the root
    // can keep the application whole without asking for anything twice.
    if (onApplied) onApplied(annonce, resultat, envoye);
  };

  const remettre = () => {
    if (typeof onUndo === "function") onUndo();
    setApplique(false);
  };

  const sc = function(s) { if (s >= 80) return "#16a34a"; if (s >= 65) return Purple; if (s >= 50) return Coral; return "#dc2626"; };

  if (ph === "loading") {
    return (
      <div style={{textAlign:"center", padding:"36px 20px", fontFamily:Sans}}>
        <div style={{
          width:42, height:42, margin:"0 auto 14px",
          border:"3px solid "+Hairline, borderTopColor:Purple,
          borderRadius:"50%",
          animation:"cvfSpin 1s linear infinite",
        }}/>
        <div style={{fontFamily:Serif, fontSize:16, fontWeight:500, color:Ink, marginBottom:6, letterSpacing:"-0.01em"}}>
          {creation ? T.mt_create_running : T.off_running}
        </div>
        <div style={{fontSize:12, color:InkMuted}}>
          {creation ? T.mt_choose_create_s : T.off_running_sub}
        </div>
      </div>
    );
  }

  if (ph === "done" && res) {
    return (
      <div style={{fontFamily:Sans}}>
        {applique ? (
          <div data-nuvi="match-applique" style={{
            background:GreenSoft, border:"0.5px solid "+Green,
            borderRadius:RadiusMd, padding:"10px 13px", marginBottom:12,
            fontSize:12.5, color:GreenText, fontWeight:600, lineHeight:1.5,
          }}>{T.mt_applied}</div>
        ) : null}
        {/* Score Match - hero card */}
        <div style={{
          display:"flex", alignItems:"center", gap:14,
          background:CreamSoft, borderRadius:RadiusMd,
          padding:"14px 18px", marginBottom:12,
          border:"0.5px solid "+Hairline,
        }}>
          <div style={{textAlign:"center", flexShrink:0}}>
            <div style={{
              fontFamily:Serif, fontSize:34, fontWeight:500,
              color:sc(res.match_score), lineHeight:1, letterSpacing:"-0.02em",
            }}>
              {res.match_score}
            </div>
            <div style={{fontSize:9, color:InkMuted, fontWeight:600, letterSpacing:1, marginTop:2}}>
              Match
            </div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:13, fontWeight:600, color:Ink, marginBottom:6, fontFamily:Sans}}>
              {res.job_title}{res.company?" - "+res.company:""}
            </div>
            <div style={{width:"100%", height:5, borderRadius:3, background:Hairline}}>
              <div style={{
                width:res.match_score+"%", height:"100%",
                borderRadius:3, background:sc(res.match_score),
              }}/>
            </div>
          </div>
        </div>


        {/* Apply button - gradient violet→magenta */}
        <button onClick={apply} style={{
          ...B({
            width:"100%", padding:13, minHeight:44, boxSizing:"border-box", borderRadius:RadiusPill,
            background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
            color:"#fff", fontWeight:600, fontSize:14, marginBottom:8,
            border:"none", fontFamily:Sans,
            boxShadow:"0 4px 16px rgba(91, 61, 245, 0.25)",
          })
        }}>
          {applique ? T.mt_keep : T.mt_apply}
        </button>
        {/* DOWNLOAD FROM HERE
            Someone who applies a hundred times pastes, fits, downloads.
            The fitted CV is already on screen behind the sheet; this
            button closes the sheet and opens the format choice, so the
            file is two clicks from the paste. */}
        {applique && typeof onDownload === "function" ? (
          <button data-nuvi="match-dl" onClick={() => {
            const annonce = offer, resultat = res;
            if (onApplied) onApplied(annonce, resultat, cv);
            onDownload();
          }} style={{
            ...B({
              width:"100%", padding:13, minHeight:44, boxSizing:"border-box", borderRadius:RadiusPill,
              background:Ink, color:"#fff", border:"none",
              fontWeight:600, fontSize:14, marginBottom:8, fontFamily:Sans,
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            })
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>
            </svg>
            {T.mt_dl}
          </button>
        ) : null}
        {applique && typeof onUndo === "function" ? (
          <button data-nuvi="match-remettre" onClick={remettre} style={{
            ...B({
              width:"100%", padding:12, minHeight:44, boxSizing:"border-box", borderRadius:RadiusPill,
              background:Paper, color:Ink, border:"1px solid "+Hairline,
              fontWeight:600, fontSize:13.5, marginBottom:8, fontFamily:Sans,
            })
          }}>{T.mt_undo}</button>
        ) : null}

        {/* Pack button - secondary CTA */}
        {onPackRequest && (
          <button onClick={()=>onPackRequest(offer, res)} style={{
            ...B({
              width:"100%", padding:13, minHeight:44, boxSizing:"border-box", borderRadius:RadiusPill,
              background:Paper, color:PurpleText,
              border:"0.5px solid "+Purple,
              fontWeight:600, fontSize:14, marginBottom:8,
              fontFamily:Sans,
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            })
          }}>
            <span>{T.mt_gen_pack}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </button>
        )}


        {/* WHAT TO LOOK AT, AND WHAT TO LOOK AT LATER
            The panel used to hand over an essay: the score, then five
            requirements, then ten chips, then a paragraph of hook, four
            paragraphs of hidden signals, two more decodes and six interview
            questions, all at once, in a column the width of a phone. Kilian
            put it exactly right: you do not know where to look.
            The person has one decision here, take this CV or not, and it
            rests on two things: the score, and which words of the ad are
            already in the CV against which are missing. Those stay open,
            with the button that acts on them underneath.
            The rest is reading for later. The culture and the seniority
            matter when you write the letter, the questions matter the night
            before an interview, and none of it changes the decision on
            screen. It is one tap away, and nothing has been removed. */}
        <details data-nuvi="match-decodage" style={{marginTop:4}}>
          <summary style={{
            cursor:"pointer", listStyle:"none", padding:"11px 0",
            fontSize:12, fontWeight:600, color:InkMuted, fontFamily:Sans,
            display:"flex", alignItems:"center", gap:7, minHeight:44,
            boxSizing:"border-box", borderTop:"0.5px solid "+Hairline,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6"/>
            </svg>
            {T.mt_decoded_more}
          </summary>
          <div style={{paddingTop:6}}>
            {/* Requirements */}
            {(res.key_requirements||[]).length > 0 && (
              <Section label={T.mt_req_key}>
                {(res.key_requirements||[]).map((r,i) => (
                  <div key={i} style={{
                    fontSize:12.5, color:Ink, lineHeight:1.55, marginBottom:4,
                    paddingLeft:13, textIndent:-13,
                  }}>
                    <span style={{color:InkMuted}}>{"\u2022  "}</span>{r}
                  </div>
                ))}
              </Section>
            )}

            {/* Keywords matched / to add */}
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:10}}>
              {(res.keywords_matched||[]).length > 0 && (
                <div style={{background:GreenSoft, borderRadius:RadiusMd, padding:"10px 12px"}}>
                  <div style={{fontSize:9.5, fontWeight:700, color:GreenText, marginBottom:6, letterSpacing:"0.05em", textTransform:"uppercase"}}>
                    {T.mt_kw_in}
                  </div>
                  <div style={{display:"flex", flexWrap:"wrap", gap:4}}>
                    {(res.keywords_matched||[]).map((k,i) => (
                      <span key={i} style={{
                        background:Paper, color:GreenText,
                        borderRadius:4, padding:"3px 7px", fontSize:10,
                      }}>{k}</span>
                    ))}
                  </div>
                </div>
              )}
              {(res.keywords_to_add||[]).length > 0 && (
                <div style={{background:CoralSoft, borderRadius:RadiusMd, padding:"10px 12px"}}>
                  <div style={{fontSize:9.5, fontWeight:700, color:CoralText, marginBottom:6, letterSpacing:"0.05em", textTransform:"uppercase"}}>
                    {T.mt_kw_add}
                  </div>
                  <div style={{display:"flex", flexWrap:"wrap", gap:4}}>
                    {(res.keywords_to_add||[]).map((k,i) => (
                      <span key={i} style={{
                        background:Paper, color:CoralText,
                        borderRadius:4, padding:"3px 7px", fontSize:10,
                      }}>{k}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* The hook is a sentence to reuse, so it is set as one: the serif
                italic already marks it as quoted, and a tinted box around it
                added nothing but another edge. */}
            {res.cover_letter_hook && (
              <Section label={T.mt_hook}>
                <div style={{
                  fontSize:13.5, color:Ink, lineHeight:1.65, fontStyle:"italic",
                  fontFamily:Serif, paddingLeft:11, borderLeft:"2px solid "+Coral,
                }}>
                  {res.cover_letter_hook}
                </div>
              </Section>
            )}

            {/* Hidden signals */}
            {res.hidden_signals && res.hidden_signals.length > 0 && (
              <Section label={T.mt_hidden}>
                {res.hidden_signals.map((s,i) => (
                  <div key={i} style={{
                    fontSize:12.5, color:Ink, marginBottom:7, lineHeight:1.55,
                    paddingLeft:13, textIndent:-13,
                  }}>
                    <span style={{color:CoralText}}>{"\u2022  "}</span>{s}
                  </div>
                ))}
              </Section>
            )}

            {/* Culture and seniority answer the same question, what kind of
                place is this, so they sit together instead of as two tinted
                blocks of different colours. */}
            {res.culture_decode && (
              <Section label={T.mt_culture}>
                <div style={{fontSize:12.5, color:Ink, lineHeight:1.55}}>
                  {res.culture_decode}
                </div>
              </Section>
            )}

            {res.seniority_decode && (
              <Section label={T.mt_seniority}>
                <div style={{fontSize:12.5, color:Ink, lineHeight:1.55}}>
                  {res.seniority_decode}
                </div>
              </Section>
            )}

            {/* Interview questions. Last section, so no rule under it: the
                Apply button is the next thing and it draws its own line. */}
            {res.likely_interview_questions && res.likely_interview_questions.length > 0 && (
              <Section label={T.mt_questions} last>
                {res.likely_interview_questions.map((q,i) => (
                  <div key={i} style={{
                    fontSize:12.5, color:Ink, marginBottom:7, lineHeight:1.55,
                    paddingLeft:17, textIndent:-17,
                  }}>
                    <span style={{color:InkMuted, fontVariantNumeric:"tabular-nums"}}>{(i+1)+".  "}</span>{q}
                  </div>
                ))}
              </Section>
            )}
          </div>
        </details>

        {/* New offer */}
        <button onClick={()=>{setPh("input");setRes(null);}} style={{
          ...B({
            width:"100%", padding:10, borderRadius:RadiusPill,
            background:Hairline, color:InkMuted, fontWeight:600, fontSize:13,
            border:"none", fontFamily:Sans,
          })
        }}>
          {T.off_change}
        </button>
      </div>
    );
  }

  return (
    <div style={{fontFamily:Sans}}>
      {/* Intro card - terracotta */}
      <div style={{
        background:CoralSoft,
        border:"0.5px solid "+Coral,
        borderRadius:RadiusMd, padding:"11px 13px", marginBottom:14,
      }}>
        <div style={{fontSize:13, fontWeight:600, color:Ink, marginBottom:3, fontFamily:Serif}}>
          {T.mt_tailored_t}
        </div>
        <div style={{fontSize:12, color:InkMuted, lineHeight:1.6}}>
          {T.mt_tailored_s}
        </div>
      </div>

      {!cv.name && !cv.summary && (
        <div style={{
          background:CoralSoft, border:"0.5px solid "+Coral,
          borderRadius:RadiusMd, padding:"9px 12px", marginBottom:10,
          fontSize:12, color:CoralText,
        }}>
          {T.mt_empty_cv}
        </div>
      )}
      <label style={LBL}>{T.mt_offer_label}</label>
      {/* The most frequented field of the product: it takes the focus as
          the sheet opens, so "New ad" then Ctrl+V is the whole gesture. */}
      <textarea value={offer} onChange={e=>setOffer(e.target.value)}
        autoFocus data-nuvi="match-annonce"
        onPaste={(e)=>{
          const brut = e.clipboardData && e.clipboardData.getData("text/plain");
          if (!brut) return;
          const propre = nettoyerLAnnonce(brut);
          if (propre === brut) return;
          e.preventDefault();
          const c = e.target;
          const a = c.selectionStart == null ? c.value.length : c.selectionStart;
          const b = c.selectionEnd == null ? c.value.length : c.selectionEnd;
          setOffer(c.value.slice(0, a) + propre + c.value.slice(b));
        }}
        placeholder={T.mt_offer_ph}
        rows={11}
        style={{...IN({resize:"vertical", marginBottom:10, fontSize:12, lineHeight:1.7})}}/>
      {/* C'est le champ le plus frequente du produit : le panneau
          d'adaptation s'ouvre depuis la barre, depuis le hub et depuis
          l'extension. Une annonce est tres souvent un PDF ou une capture. */}
      <FileDrop T={T} quoi="annonce" testId="match-offre"
        style={{ marginBottom:14 }}
        onTexte={(texte)=>setOffer((avant)=>joindreAuTexte(avant, nettoyerLAnnonce(texte)))}/>
      {ecart && (ecart.aReformuler.length > 0 || ecart.titre.etat !== "exact" || ecart.manquantes.length > 0) && (
        <div style={{
          border:"0.5px solid "+Hairline, borderRadius:RadiusMd,
          padding:"12px 14px", marginBottom:14, background:Paper,
        }}>
          <div style={{
            fontSize:9, fontWeight:700, color:InkMuted, marginBottom:9,
            letterSpacing:"0.06em", textTransform:"uppercase",
          }}>{T.mt_read_local}</div>

          {/* L'INTITULE D'ABORD : c'est le signal individuel le plus lourd
              chez Workday et iCIMS, et un ecart de seniorite s'y voit. */}
          {ecart.titre.etat !== "exact" && ecart.titre.vise && (
            <div style={{fontSize:12, color:Ink, lineHeight:1.5, marginBottom:10}}>
              <strong>{T.mt_gap_title}</strong>{T.mt_gap_says}
              <span style={{background:CoralSoft, borderRadius:3, padding:"1px 5px"}}>{ecart.titre.vise}</span>
              {ecart.titre.actuel ? <>{T.mt_gap_yours}<span style={{background:CreamSoft, borderRadius:3, padding:"1px 5px"}}>{ecart.titre.actuel}</span></> : null}
              {ecart.titre.etat === "proche" ? T.mt_gap_close : T.mt_gap_exact}
            </div>
          )}

          {/* LE COEUR : deja la, nomme autrement. */}
          {ecart.aReformuler.length > 0 && (
            <div style={{marginBottom: ecart.manquantes.length ? 10 : 0}}>
              <div style={{fontSize:12, color:Ink, lineHeight:1.5, marginBottom:6}}>
                <strong>{T.mt_gap_renamed}</strong>{" "}
                <span style={{color:InkMuted}}>{T.mt_gap_renamed_sub}</span>
              </div>
              <div style={{display:"flex", flexWrap:"wrap", gap:4}}>
                {ecart.aReformuler.map((k,i) => (
                  <span key={i} style={{
                    background:CoralSoft, color:CoralText,
                    borderRadius:4, padding:"3px 7px", fontSize:11,
                  }}>{k}</span>
                ))}
              </div>
            </div>
          )}

          {ecart.manquantes.length > 0 && (
            <div>
              <div style={{fontSize:12, color:InkMuted, lineHeight:1.5, marginBottom:6}}>
                {T.mt_gap_missing}{ecart.manquantes.length > 6 ? T.mt_gap_missing_6 : ""} :
              </div>
              <div style={{display:"flex", flexWrap:"wrap", gap:4}}>
                {ecart.manquantes.slice(0,6).map((k,i) => (
                  <span key={i} style={{
                    background:CreamSoft, color:InkMuted,
                    borderRadius:3, padding:"3px 7px", fontSize:11,
                  }}>{k}</span>
                ))}
              </div>
            </div>
          )}

          {/* On ne propose jamais d'ecrire ces mots a la place de quelqu'un :
              un mot-clef ajoute sans experience derriere est un mensonge que
              l'entretien decouvre en trente secondes. */}
          <div style={{fontSize:11, color:InkMuted, marginTop:10, lineHeight:1.5}}>
            Tu choisis lesquels ajouter.
          </div>
        </div>
      )}
      {/* LE CHOIX EST LE LANCEMENT
          Des que l'annonce est la, les points de depart s'affichent : le CV
          a l'ecran, chaque CV enregistre, tout le dossier quand il apporte
          quelque chose, et "ecrire un CV pour ce poste". Un clic sur l'un
          d'eux fait tout : Nuvi adapte, applique, et montre le resultat. */}
      {offer.trim().length >= ANNONCE_MINIMUM && (
        <div style={{marginBottom:14}}>
          <div style={{fontSize:13, fontWeight:600, color:Ink, marginBottom:3, fontFamily:Serif}}>
            {T.mt_choose_t}
          </div>
          <div style={{fontSize:11.5, color:InkMuted, lineHeight:1.5, marginBottom:10}}>
            {T.mt_choose_s}
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(190px, 1fr))", gap:8}}>
            {[
              (cv.name || cv.summary) ? {
                id:"actuel", titre:T.mt_choose_current,
                sous:[cv.name, cv.title].filter(Boolean).join(", "),
                run:() => lancer("actuel", null) } : null,
              ...versions.map(v => ({
                id:"version-" + v.id, titre:v.name || T.mt_saved,
                sous:[T.mt_saved, v.cv && v.cv.title].filter(Boolean).join(", "),
                run:() => lancer("actuel", normCV(v.cv)) })),
              apport.utile ? {
                id:"parcours", titre:T.mt_choose_record,
                sous:[
                  apport.experiences ? `${apport.experiences} experience${apport.experiences > 1 ? "s" : ""}` : null,
                  apport.competences ? `${apport.competences} competence${apport.competences > 1 ? "s" : ""}` : null,
                  apport.formulations ? `${apport.formulations} formulation${apport.formulations > 1 ? "s" : ""}` : null,
                ].filter(Boolean).join(", "),
                run:() => lancer("parcours", null) } : null,
              typeof onCreateFromOffer === "function" ? {
                id:"creer", titre:T.mt_choose_create, sous:T.mt_choose_create_s,
                run:creer, accent:true } : null,
            ].filter(Boolean).map(o => (
              <button key={o.id} data-nuvi="match-choix" data-nuvi-choix={o.id}
                onClick={o.run} disabled={load || !apiKey} style={{
                ...B({
                  textAlign:"left", padding:"11px 13px", minHeight:44,
                  borderRadius:RadiusMd, fontFamily:Sans, cursor:"pointer",
                  background: o.accent ? PurpleSoft : Paper,
                  border: "1px solid " + (o.accent ? Purple : Hairline),
                  boxShadow: o.accent ? "none" : ShadowSm,
                })
              }}>
                <div style={{fontSize:12.5, fontWeight:600, color: o.accent ? PurpleText : Ink}}>
                  {o.titre}
                </div>
                {o.sous ? (
                  <div style={{fontSize:10.5, color:InkMuted, marginTop:2, lineHeight:1.35}}>
                    {o.sous}
                  </div>
                ) : null}
              </button>
            ))}
          </div>
          {/* CE QUE NUVI EST ALLE CHERCHER SE VOIT AVANT, PAS APRES
              Le dossier complet est une carte comme les autres, mais son
              contenu se verifie d'un coup d'oeil avant de cliquer : une
              version d'essai ou un poste qu'on ne veut pas voir remonter se
              repere ici, pas dans le CV adapte. */}
          {apport.utile && (apport.listeExperiences || []).length > 0 && (
            <div style={{
              marginTop:8, padding:"9px 11px",
              background:CreamSoft, borderRadius:RadiusMd,
              border:"1px solid "+Hairline,
            }}>
              <div style={{
                fontSize:9, fontWeight:700, color:InkMuted, marginBottom:6,
                letterSpacing:"0.06em", textTransform:"uppercase",
              }}>{T.mt_reach_adds}</div>
              {apport.listeExperiences.map((e, i) => (
                <div key={i} style={{
                  fontSize:11.5, color:Ink, lineHeight:1.45,
                  marginBottom: i === apport.listeExperiences.length - 1 ? 0 : 3,
                }}>
                  {e.title || T.mt_saved}
                  {e.company ? <span style={{color:InkMuted}}>{" / " + e.company}</span> : null}
                  {e.period ? <span style={{color:InkMuted}}>{" (" + e.period + ")"}</span> : null}
                </div>
              ))}
              {(apport.listeCompetences || []).length > 0 && (
                <div style={{ fontSize:11, color:InkMuted, marginTop:6, lineHeight:1.45 }}>
                  {(T.cv_s || "Skills") + " : " + apport.listeCompetences.slice(0, 12).join(", ")}
                  {apport.listeCompetences.length > 12 ? " +" + (apport.listeCompetences.length - 12) : ""}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <button onClick={analyze}
        disabled={load||!apiKey||!offer.trim()}
        style={{
          ...B({
            width:"100%", padding:13, minHeight:44, boxSizing:"border-box", borderRadius:RadiusPill,
            background: load||!apiKey||!offer.trim()
              ? Hairline
              : `linear-gradient(135deg, ${Purple}, ${Magenta})`,
            color: load||!apiKey||!offer.trim() ? InkMuted : "#fff",
            fontWeight:600, fontSize:14,
            border:"none", fontFamily:Sans,
            boxShadow: load||!apiKey||!offer.trim() ? "none" : "0 4px 16px rgba(91, 61, 245, 0.25)",
          })
        }}>
        {T.mt_cta}
      </button>
      {!apiKey && (
        <div style={{fontSize:11, color:InkMuted, textAlign:"center", marginTop:7}}>
          {T.mt_need_key}
        </div>
      )}
    </div>
  );
}

export default MatchPanel;
