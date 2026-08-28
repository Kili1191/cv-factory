"use client";

// Nuvi v3 - MatchPanel (refondu palette Nuvi).
//
// Adapte le CV a une offre d'emploi.

import { useState, useMemo } from "react";
import { rapport } from "../../lib/atsMatch.js";
import { dossierParcours, apportDuDossier, dossierEnTexte } from "../../lib/careerRecord.js";
import {
  Ink, InkMuted, Cream, CreamSoft, Paper, Hairline,
  Coral, CoralSoft, Green, GreenSoft, Purple, Magenta, PurpleSoft,
  Sans, Serif, RadiusMd, RadiusPill, ShadowSm,
  B, IN, LBL, NO_DASH,
} from "./sharedTokens";

function MatchPanel({ cv, versions = [], setCVFn, notify, apiKey, T, onPackRequest,
  onResult, onApplied, initialResult, initialOffer = "",
  aiCall, parseJSON, normCV, pushH }) {
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
  const [source, setSource] = useState("actuel");
  const apport = useMemo(() => apportDuDossier(cv, versions), [cv, versions]);

  const analyze = async () => {
    if (!offer.trim()) { notify(T.off_no_offer); return; }
    if (!apiKey) { notify(T.nk); return; }
    setLoad(true);
    setPh("loading");
    const expT = cv.experience.map(e =>
      e.title + " chez " + e.company
      + " (" + e.period + "): "
      + e.bullets.filter(b=>b).join("; ")
    ).join(" | ");
    const cvT = "Profil: " + cv.name + " - " + cv.title
      + "\nAccroche: " + cv.summary
      + "\nExps: " + expT
      + "\nSkills: " + cv.skills.filter(s=>s).join(", ")
      + "\nLangues: " + cv.languages.filter(l=>l.lang)
          .map(l=>l.lang+" "+l.level).join(", ");
    const expJ = cv.experience.map((e,i) =>
      JSON.stringify({
        id:i+1, title:e.title, company:e.company,
        period:e.period, location:e.location,
        bullets:e.bullets.filter(b=>b),
      })
    ).join(",");
    const eduJ = cv.education.map((e,i) =>
      JSON.stringify({id:i+1, degree:e.degree, school:e.school, period:e.period})
    ).join(",");
    // Le materiau change selon le chemin. En mode "parcours", on ne donne plus
    // le seul CV a l'ecran mais tout ce que la personne a deja ecrit, et on
    // demande de CHOISIR dedans. Choisir dans ce qu'on a fait n'est pas
    // inventer : c'est ce que fait quiconque adapte son CV a la main.
    const materiau = source === "parcours"
      ? dossierEnTexte(dossierParcours(cv, versions))
      : cvT;

    const p = "Expert recrutement. Decode l'offre fournie + reecris le CV pour matcher.\n"
      +"OFFRE:\n"+offer+"\n"
      +(source === "parcours"
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
      +'JSON uniquement: {"match_score":75,"job_title":"","company":"",'
      +'"key_requirements":["r1","r2","r3"],"keywords_matched":["k1","k2"],'
      +'"keywords_to_add":["k1","k2"],'
      +'"hidden_signals":["signal cache 1 que la plupart ne voient pas","signal 2"],'
      +'"culture_decode":"Ce que dit l offre sur la culture reelle de l entreprise en 2 phrases",'
      +'"seniority_decode":"Niveau reellement attendu vs ce qui est ecrit",'
      +'"likely_interview_questions":["q1","q2","q3","q4","q5"],'
      +'"cover_letter_hook":"accroche",'
      +'"cv_optimized":{"name":"'+cv.name+'","title":"","email":"'+cv.email+'",'
      +'"phone":"'+cv.phone+'","location":"'+cv.location+'","linkedin":"'+cv.linkedin+'",'
      +'"summary":"","experience":['+expJ+'],"education":['+eduJ+'],'
      +'"skills":["s1","s2","s3","s4","s5","s6","s7","s8"],'
      +'"languages":'+JSON.stringify(cv.languages)+',"certifications":'+JSON.stringify(cv.certifications)+'}}';
    try {
      const txt = await aiCall(p);
      const r = parseJSON(txt);
      setRes(r);
      setPh("done");
      if (onResult) onResult(r);
    } catch { notify(T.ea); setPh("input"); }
    setLoad(false);
  };

  const apply = () => {
    if (!res || !res.cv_optimized) return;
    // Snapshot avant de remplacer TOUT le CV. C'est l'action centrale de
    // l'app (coller une offre -> CV adapte) et elle ecrasait le CV de
    // l'utilisateur sans retour possible : si la version optimisee est moins
    // bonne, il n'y avait aucun moyen de revenir en arriere.
    if (typeof pushH === "function") pushH();
    setCVFn(() => normCV(res.cv_optimized, cv));
    notify("CV adapte applique!");
    setPh("input");
    setRes(null);
    setOffer("");
    if (onApplied) onApplied();
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
          Analyse en cours...
        </div>
        <div style={{fontSize:12, color:InkMuted}}>
          Nuvi adapte ton CV pour matcher parfaitement.
        </div>
      </div>
    );
  }

  if (ph === "done" && res) {
    return (
      <div style={{fontFamily:Sans}}>
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

        {/* Requirements */}
        {(res.key_requirements||[]).length > 0 && (
          <div style={{
            background:PurpleSoft, borderRadius:RadiusMd,
            padding:"10px 13px", marginBottom:10,
            border:"0.5px solid "+Purple,
          }}>
            <div style={{fontSize:10, fontWeight:700, color:Purple, marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase"}}>
              Requirements cles
            </div>
            {(res.key_requirements||[]).map((r,i) => (
              <div key={i} style={{fontSize:12, color:Ink, marginBottom:3}}>
                {"* "}{r}
              </div>
            ))}
          </div>
        )}

        {/* Keywords matched / to add */}
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:10}}>
          {(res.keywords_matched||[]).length > 0 && (
            <div style={{background:GreenSoft, borderRadius:RadiusMd, padding:"9px 11px"}}>
              <div style={{fontSize:9, fontWeight:700, color:Green, marginBottom:5, letterSpacing:"0.05em", textTransform:"uppercase"}}>
                Presents
              </div>
              <div style={{display:"flex", flexWrap:"wrap", gap:3}}>
                {(res.keywords_matched||[]).map((k,i) => (
                  <span key={i} style={{
                    background:"#dcfce7", color:Green,
                    borderRadius:3, padding:"2px 5px", fontSize:9,
                  }}>{k}</span>
                ))}
              </div>
            </div>
          )}
          {(res.keywords_to_add||[]).length > 0 && (
            <div style={{background:CoralSoft, borderRadius:RadiusMd, padding:"9px 11px"}}>
              <div style={{fontSize:9, fontWeight:700, color:Coral, marginBottom:5, letterSpacing:"0.05em", textTransform:"uppercase"}}>
                Ajoutes
              </div>
              <div style={{display:"flex", flexWrap:"wrap", gap:3}}>
                {(res.keywords_to_add||[]).map((k,i) => (
                  <span key={i} style={{
                    background:"#fef3c7", color:"#92400e",
                    borderRadius:3, padding:"2px 5px", fontSize:9,
                  }}>{k}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cover letter hook - terracotta */}
        {res.cover_letter_hook && (
          <div style={{
            background:CoralSoft,
            border:"0.5px solid "+Coral,
            borderRadius:RadiusMd, padding:"10px 13px", marginBottom:12,
          }}>
            <div style={{fontSize:10, fontWeight:700, color:Coral, marginBottom:5, letterSpacing:"0.06em", textTransform:"uppercase"}}>
              Accroche lettre de motivation
            </div>
            <div style={{fontSize:12, color:Ink, lineHeight:1.6, fontStyle:"italic", fontFamily:Serif}}>
              "{res.cover_letter_hook}"
            </div>
          </div>
        )}

        {/* Hidden signals */}
        {res.hidden_signals && res.hidden_signals.length > 0 && (
          <div style={{
            background:CoralSoft, border:"0.5px solid "+Coral,
            borderRadius:RadiusMd, padding:"10px 13px", marginBottom:10,
          }}>
            <div style={{fontSize:10, fontWeight:700, color:Coral, marginBottom:6, letterSpacing:"0.05em", textTransform:"uppercase"}}>
              Signaux caches dans l'offre
            </div>
            {res.hidden_signals.map((s,i) => (
              <div key={i} style={{fontSize:12, color:"#7f1d1d", marginBottom:4, lineHeight:1.5}}>
                {"> "}{s}
              </div>
            ))}
          </div>
        )}

        {/* Culture decode */}
        {res.culture_decode && (
          <div style={{
            background:PurpleSoft, border:"0.5px solid "+Purple,
            borderRadius:RadiusMd, padding:"10px 13px", marginBottom:10,
          }}>
            <div style={{fontSize:10, fontWeight:700, color:Purple, marginBottom:5, letterSpacing:"0.05em", textTransform:"uppercase"}}>
              Culture entreprise (decodee)
            </div>
            <div style={{fontSize:12, color:Ink, lineHeight:1.5}}>
              {res.culture_decode}
            </div>
          </div>
        )}

        {/* Seniority decode */}
        {res.seniority_decode && (
          <div style={{
            background:GreenSoft, border:"0.5px solid "+Green,
            borderRadius:RadiusMd, padding:"10px 13px", marginBottom:10,
          }}>
            <div style={{fontSize:10, fontWeight:700, color:Green, marginBottom:5, letterSpacing:"0.05em", textTransform:"uppercase"}}>
              Niveau attendu (decode)
            </div>
            <div style={{fontSize:12, color:Ink, lineHeight:1.5}}>
              {res.seniority_decode}
            </div>
          </div>
        )}

        {/* Interview questions */}
        {res.likely_interview_questions && res.likely_interview_questions.length > 0 && (
          <div style={{
            background:CoralSoft, border:"0.5px solid "+Coral,
            borderRadius:RadiusMd, padding:"10px 13px", marginBottom:12,
          }}>
            <div style={{fontSize:10, fontWeight:700, color:Coral, marginBottom:6, letterSpacing:"0.05em", textTransform:"uppercase"}}>
              Questions probables en entretien
            </div>
            {res.likely_interview_questions.map((q,i) => (
              <div key={i} style={{fontSize:12, color:"#7f1d1d", marginBottom:4, lineHeight:1.5}}>
                {(i+1)+". "}{q}
              </div>
            ))}
          </div>
        )}

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
          Appliquer ce CV adapte
        </button>

        {/* Pack button - secondary CTA */}
        {onPackRequest && (
          <button onClick={()=>onPackRequest(offer, res)} style={{
            ...B({
              width:"100%", padding:13, minHeight:44, boxSizing:"border-box", borderRadius:RadiusPill,
              background:Paper, color:Purple,
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

        {/* New offer */}
        <button onClick={()=>{setPh("input");setRes(null);}} style={{
          ...B({
            width:"100%", padding:10, borderRadius:RadiusPill,
            background:Hairline, color:InkMuted, fontWeight:600, fontSize:13,
            border:"none", fontFamily:Sans,
          })
        }}>
          Nouvelle offre
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
          fontSize:12, color:"#7f1d1d",
        }}>
          {T.mt_empty_cv}
        </div>
      )}
      <label style={LBL}>{T.mt_offer_label}</label>
      <textarea value={offer} onChange={e=>setOffer(e.target.value)}
        placeholder={T.mt_offer_ph}
        rows={11}
        style={{...IN({resize:"vertical", marginBottom:14, fontSize:12, lineHeight:1.7})}}/>
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
              <strong>Intitule</strong>{" : l'offre dit "}
              <span style={{background:CoralSoft, borderRadius:3, padding:"1px 5px"}}>{ecart.titre.vise}</span>
              {ecart.titre.actuel ? <>{", ton CV dit "}<span style={{background:CreamSoft, borderRadius:3, padding:"1px 5px"}}>{ecart.titre.actuel}</span></> : null}
              {ecart.titre.etat === "proche" ? ". Proche, mais pas identique." : "."}
            </div>
          )}

          {/* LE COEUR : deja la, nomme autrement. */}
          {ecart.aReformuler.length > 0 && (
            <div style={{marginBottom: ecart.manquantes.length ? 10 : 0}}>
              <div style={{fontSize:12, color:Ink, lineHeight:1.5, marginBottom:6}}>
                <strong>Tu l'as deja, ils l'appellent autrement.</strong>{" "}
                <span style={{color:InkMuted}}>
                  Les mots sont dans ton CV, pas dans cet ordre. Un tri automatique
                  ne les rapproche pas.
                </span>
              </div>
              <div style={{display:"flex", flexWrap:"wrap", gap:4}}>
                {ecart.aReformuler.map((k,i) => (
                  <span key={i} style={{
                    background:"#fef3c7", color:"#92400e",
                    borderRadius:3, padding:"3px 7px", fontSize:11,
                  }}>{k}</span>
                ))}
              </div>
            </div>
          )}

          {ecart.manquantes.length > 0 && (
            <div>
              <div style={{fontSize:12, color:InkMuted, lineHeight:1.5, marginBottom:6}}>
                Absent de ton CV{ecart.manquantes.length > 6 ? " (les 6 premiers)" : ""} :
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
      {apport.utile && (
        <div style={{marginBottom:14}}>
          <div style={{
            fontSize:9, fontWeight:700, color:InkMuted, marginBottom:8,
            letterSpacing:"0.06em", textTransform:"uppercase",
          }}>A partir de quoi</div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
            {[
              { id:"actuel", titre:"Mon CV actuel",
                sous:"Celui affiche a l'ecran." },
              { id:"parcours", titre:"Tout mon parcours",
                sous: [
                  apport.experiences ? `${apport.experiences} experience${apport.experiences > 1 ? "s" : ""} en plus` : null,
                  apport.competences ? `${apport.competences} competence${apport.competences > 1 ? "s" : ""}` : null,
                  apport.formulations ? `${apport.formulations} formulation${apport.formulations > 1 ? "s" : ""}` : null,
                ].filter(Boolean).join(", ") },
            ].map(o => {
              const actif = source === o.id;
              return (
                <button key={o.id} onClick={() => setSource(o.id)} style={{
                  ...B({
                    textAlign:"left", padding:"11px 13px", minHeight:44,
                    borderRadius:RadiusMd, fontFamily:Sans, cursor:"pointer",
                    background: actif ? PurpleSoft : Paper,
                    border: "1px solid " + (actif ? Purple : Hairline),
                    boxShadow: actif ? "none" : ShadowSm,
                  })
                }}>
                  <div style={{fontSize:12.5, fontWeight:600, color: actif ? Purple : Ink}}>
                    {o.titre}
                  </div>
                  <div style={{fontSize:10.5, color:InkMuted, marginTop:2, lineHeight:1.35}}>
                    {o.sous}
                  </div>
                </button>
              );
            })}
          </div>
          {source === "parcours" && (
            <div style={{marginTop:8}}>
              <div style={{fontSize:11, color:InkMuted, lineHeight:1.5}}>
                Nuvi choisit dans ce que tu as deja ecrit, garde ce qui sert
                l&apos;offre et ecarte le reste.
              </div>
              {/* CE QUE NUVI EST ALLE CHERCHER SE VOIT AVANT, PAS APRES
                  Le bouton annoncait "3 experiences en plus" : un nombre, qui
                  demande de faire confiance. C'est le parcours de la personne,
                  elle doit pouvoir verifier d'un coup d'oeil ce qui va servir -
                  et surtout reperer une version d'essai ou un poste qu'elle ne
                  veut pas voir remonter, AVANT de depenser un appel. */}
              {(apport.listeExperiences || []).length > 0 && (
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
                      {e.title || "Poste sans intitule"}
                      {e.company ? <span style={{color:InkMuted}}>{" chez " + e.company}</span> : null}
                      {e.period ? <span style={{color:InkMuted}}>{" (" + e.period + ")"}</span> : null}
                    </div>
                  ))}
                  {(apport.listeCompetences || []).length > 0 && (
                    <div style={{
                      fontSize:11, color:InkMuted, marginTop:6, lineHeight:1.45,
                    }}>
                      {"Competences : " + apport.listeCompetences.slice(0, 12).join(", ")}
                      {apport.listeCompetences.length > 12
                        ? ` et ${apport.listeCompetences.length - 12} autres`
                        : ""}
                    </div>
                  )}
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
