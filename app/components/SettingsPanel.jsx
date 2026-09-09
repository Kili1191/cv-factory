"use client";

// Nuvi v3 - SettingsPanel (refondu palette Nuvi).
//
// Panneau de reglages : lang, dark mode, relance tutoriel, raccourcis clavier.

import { useEffect, useState } from "react";
import {
  Ink, InkMuted, Cream, CreamSoft, Paper, Hairline,
  Coral, Green, GreenSoft, Purple, Magenta, PurpleSoft,
  Gray100, Gray200, Gray400, Gray600,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm,
  GradPurple, B, Trans, CoralText, GreenText, PurpleText } from "./tokens";
import Sheet from "./Sheet";

// Sous-composant : une ligne de raccourci.
function KbdRow({ keys, label }) {
  return (
    <div style={{
      display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"10px 0",
      borderBottom:"0.5px solid "+Hairline,
    }}>
      <span style={{
        fontSize:13, color:Ink, fontFamily:Sans,
      }}>{label}</span>
      <div style={{display:"flex", gap:4}}>
        {keys.map((k, i) => (
          <span key={i} style={{
            padding:"3px 9px", borderRadius:6,
            background:CreamSoft, color:CoralText,
            border:"0.5px solid "+Hairline,
            fontSize:11, fontWeight:600,
            fontFamily:"ui-monospace, monospace",
            minWidth:24, textAlign:"center",
          }}>{k}</span>
        ))}
      </div>
    </div>
  );
}

import { useInstallState } from "./InstallAppSheet";
import { envoyerUnRapport } from "../../lib/incidents.js";

export default function SettingsPanel({
  T, locale, setLocale,
  darkMode, onToggleDark,
  onRelaunchTutorial, onClose,
  onOpenHistory, onClearAiCache,
  cloudEnabled = false, cloudUser = null,
  onSignIn = () => {}, onSignOut = () => {},
  // The plan, as /api/billing describes it; null while unknown or when
  // billing is not configured. Two ways out: choose a plan, or manage it.
  plan = null, onOpenPlan = () => {}, onManagePlan = () => {},
  // The answers every application form asks for. Kept here rather than
  // guessed, and repeated by the browser extension.
  reponses = {}, onReponses = () => {},
  onOpenInstall = () => {},
  // The shape of the current CV (lib/incidents.js formeDuCv): sections and
  // counts, no text. Sent with a report only when the person ticks the box.
  formeDuCv = null,
}) {
  // REPORT A PROBLEM
  //
  // A breakage on the live site used to reach the maintainer as a
  // screenshot, hours later, with no build id and no error message. This
  // row lets the person say what broke in their own words; the last
  // incidents this device kept travel with the note, and the CV's shape
  // only if asked. State stays local: the row opens, sends, and says so.
  const [rapportOuvert, setRapportOuvert] = useState(false);
  const [note, setNote] = useState("");
  const [avecForme, setAvecForme] = useState(false);
  const [envoi, setEnvoi] = useState("");   // "" | "encours" | "ok" | "echec"
  const envoyer = async () => {
    if (envoi === "encours") return;
    setEnvoi("encours");
    const ok = await envoyerUnRapport({ note, forme: avecForme ? formeDuCv : null });
    setEnvoi(ok ? "ok" : "echec");
    if (ok) setNote("");
  };

  // La ligne d'installation ne s'affiche que si elle mene quelque part :
  // deja installee, ou navigateur qui ne sait pas installer, elle disparait
  // plutot que de promettre un geste impossible.
  const install = useInstallState();

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [onClose]);

  // Detect platform pour afficher cmd ou ctrl.
  const isMac = typeof navigator !== "undefined"
    && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const cmdKey = isMac ? "⌘" : "Ctrl";

  return (
    <Sheet
      eyebrow={T.set_eyebrow}
      title={T.set_title}
      onClose={onClose}
    >
      {/* Compte. Absent tant qu'aucun serveur n'est configure : mieux vaut
          ne rien montrer qu'une fonction qui ne repondrait pas. */}
      {cloudEnabled && (
        <div style={{marginBottom:18}}>
          <label style={{
            display:"block", fontSize:11, fontWeight:600,
            letterSpacing:"0.1em", textTransform:"uppercase",
            color:CoralText, marginBottom:8, fontFamily:Sans,
          }}>{locale === "en" ? "Account" : "Compte"}</label>
          {cloudUser ? (
            <div style={{
              display:"flex", alignItems:"center", gap:12,
              padding:"12px 14px", borderRadius:12,
              background:Paper, border:"0.5px solid "+Hairline,
            }}>
              <div style={{
                width:34, height:34, borderRadius:"50%", flexShrink:0,
                background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
                color:"#fff", display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:14, fontWeight:600,
              }}>{String(cloudUser.email || "?").charAt(0).toUpperCase()}</div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{
                  fontSize:13, fontWeight:600, color:Ink,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                }}>{cloudUser.email}</div>
                <div style={{fontSize:11.5, color:InkMuted}}>
                  {locale === "en" ? "CV saved to your account" : "CV sauvegarde sur ton compte"}
                </div>
              </div>
              <button onClick={onSignOut} style={{
                ...B({
                  padding:"8px 12px", borderRadius:RadiusPill,
                  background:"transparent", border:"0.5px solid "+Hairline,
                  color:InkMuted, fontSize:12, fontFamily:Sans, minHeight:36,
                }),
              }}>{locale === "en" ? "Sign out" : "Deconnexion"}</button>
            </div>
          ) : (
            <button onClick={onSignIn} style={{
              ...B({
                width:"100%", minHeight:48, borderRadius:12,
                background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
                color:"#fff", fontSize:14, fontWeight:600, fontFamily:Sans,
              }),
            }}>
              {locale === "en" ? "Sign in to keep your CV" : "Se connecter pour garder son CV"}
            </button>
          )}
        </div>
      )}

      {/* THE PLAN
          What the person pays, or does not yet, and the one button that
          fits: choose the plan, or open Stripe's portal to change the card
          or cancel. No retention screen. Hidden when billing is off. */}
      {plan && plan.configured && (
        <div data-nuvi="reglages-plan" style={{marginBottom:18}}>
          <label style={{
            display:"block", fontSize:11, fontWeight:600,
            letterSpacing:"0.1em", textTransform:"uppercase",
            color:CoralText, marginBottom:8, fontFamily:Sans,
          }}>{T.set_plan}</label>
          <div style={{
            padding:"12px 14px", borderRadius:12,
            background:Paper, border:"0.5px solid "+Hairline,
          }}>
            <div style={{fontSize:13, fontWeight:600, color:Ink, marginBottom:2}}>
              {plan.status === "subscribed"
                ? (plan.plan === "trimestre" ? T.pl_status_quarter : T.pl_status_month)
                : plan.status === "free"
                  ? T.pl_status_free.replace("{n}", String(Math.max(0, (plan.fits_free || 3) - (plan.fits_used || 0))))
                  : T.pl_status_visitor}
            </div>
            <div style={{fontSize:11.5, color:InkMuted, marginBottom:10}}>
              {plan.status === "subscribed" && plan.period_end
                ? T.pl_until.replace("{date}", new Date(plan.period_end).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR"))
                : T.pl_includes_short}
            </div>
            <button
              data-nuvi="reglages-plan-bouton"
              onClick={plan.status === "subscribed" && plan.portal ? onManagePlan : onOpenPlan}
              style={{
                ...B({
                  width:"100%", minHeight:44, borderRadius:RadiusPill,
                  background: plan.status === "subscribed" ? Paper : `linear-gradient(135deg, ${Purple}, ${Magenta})`,
                  color: plan.status === "subscribed" ? Ink : "#fff",
                  border: plan.status === "subscribed" ? "0.5px solid "+Hairline : "none",
                  fontSize:13, fontWeight:600, fontFamily:Sans,
                }),
              }}>
              {plan.status === "subscribed" && plan.portal ? T.pl_manage : T.pl_choose}
            </button>
          </div>
        </div>
      )}

      {/* Lang switcher - selected = gradient violet→magenta */}
      <div style={{marginBottom:18}}>
        <label style={{
          display:"block", fontSize:11, fontWeight:600,
          letterSpacing:"0.1em", textTransform:"uppercase",
          color:CoralText, marginBottom:8, fontFamily:Sans,
        }}>{T.set_lang}</label>
        <div style={{display:"flex", gap:8}}>
          <button onClick={()=>setLocale("fr")} style={{
            ...B({
              flex:1, padding:"10px 14px", borderRadius:RadiusPill,
              background: locale === "fr"
                ? `linear-gradient(135deg, ${Purple}, ${Magenta})`
                : Paper,
              color: locale === "fr" ? "#fff" : Ink,
              border: "0.5px solid "+(locale === "fr" ? "transparent" : Hairline),
              fontSize:13, fontWeight:500, fontFamily:Sans,
              transition: Trans(["background","color","border-color","box-shadow","transform","opacity"], "fast"),
            })
          }}>Francais</button>
          <button onClick={()=>setLocale("en")} style={{
            ...B({
              flex:1, padding:"10px 14px", borderRadius:RadiusPill,
              background: locale === "en"
                ? `linear-gradient(135deg, ${Purple}, ${Magenta})`
                : Paper,
              color: locale === "en" ? "#fff" : Ink,
              border: "0.5px solid "+(locale === "en" ? "transparent" : Hairline),
              fontSize:13, fontWeight:500, fontFamily:Sans,
              transition: Trans(["background","color","border-color","box-shadow","transform","opacity"], "fast"),
            })
          }}>English</button>
        </div>
      </div>

      {/* Dark mode toggle */}
      <div style={{marginBottom:18}}>
        <button onClick={onToggleDark} style={{
          ...B({
            width:"100%",
            display:"flex", alignItems:"center", gap:14,
            padding:"14px 16px",
            background:Paper,
            border:"0.5px solid "+Hairline,
            borderRadius:RadiusMd,
            boxShadow:ShadowSm,
            textAlign:"left", fontFamily:Sans,
            transition: Trans(["background","color","border-color","box-shadow","transform","opacity"], "fast"),
          })
        }}>
          {/* Icon */}
          <div style={{
            width:36, height:36, borderRadius:10,
            display:"flex", alignItems:"center", justifyContent:"center",
            background: darkMode ? Ink : CreamSoft,
            color: darkMode ? "#fff" : Coral,
            flexShrink:0,
            transition: Trans(["background","color","border-color","box-shadow","transform","opacity"], "base"),
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              {darkMode
                ? <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                : <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M5 5l1.5 1.5M17.5 17.5L19 19M2 12h2M20 12h2M5 19l1.5-1.5M17.5 6.5L19 5"/></>
              }
            </svg>
          </div>

          {/* Text */}
          <div style={{flex:1, minWidth:0}}>
            <div style={{
              fontSize:13, fontWeight:600, color:Ink, marginBottom:2,
            }}>{T.set_dark}</div>
            <div style={{
              fontSize:11, color:InkMuted, lineHeight:1.4,
            }}>{T.set_dark_desc}</div>
          </div>

          {/* Toggle pill - gradient violet→magenta quand actif */}
          <div style={{
            width:42, height:24, borderRadius:12,
            background: darkMode
              ? `linear-gradient(135deg, ${Purple}, ${Magenta})`
              : Hairline,
            position:"relative",
            flexShrink:0,
            transition: Trans(["background","color","border-color","box-shadow","transform","opacity"], "base"),
          }}>
            <div style={{
              position:"absolute",
              top:2, left: darkMode ? 20 : 2,
              width:20, height:20, borderRadius:"50%",
              background:"#fff",
              transition: Trans(["background","color","border-color","box-shadow","transform","opacity"], "base"),
              boxShadow:"0 2px 4px rgba(0,0,0,.15)",
            }}/>
          </div>
        </button>
      </div>

      {/* Installer sur l'ecran d'accueil */}
      {install.installable && (
        <div style={{marginBottom:18}}>
          <button onClick={onOpenInstall} style={{
            ...B({
              width:"100%",
              display:"flex", alignItems:"center", gap:14,
              padding:"14px 16px",
              background:Paper,
              border:"0.5px solid "+Hairline,
              borderRadius:RadiusMd,
              boxShadow:ShadowSm,
              textAlign:"left", fontFamily:Sans,
              transition: Trans(["background","color","border-color","box-shadow","transform","opacity"], "fast"),
            })
          }}>
            <div style={{
              width:36, height:36, borderRadius:10, overflow:"hidden",
              flexShrink:0, border:"0.5px solid "+Hairline,
            }}>
              <img src="/apple-touch-icon.png" alt="" width={36} height={36}
                style={{display:"block", width:"100%", height:"100%"}}/>
            </div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:13, fontWeight:600, color:Ink, marginBottom:2}}>
                {T.set_install || (locale === "en" ? "Install the app" : "Installer l'application")}
              </div>
              <div style={{fontSize:11, color:InkMuted, lineHeight:1.4}}>
                {T.set_install_desc || (locale === "en"
                  ? "An icon on your home screen. Opens full screen."
                  : "Une icone sur ton ecran d'accueil. Ouverture plein ecran.")}
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={InkMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{flexShrink:0}}>
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      )}

      {/* Relancer tutoriel */}
      <div style={{marginBottom:18}}>
        <button onClick={onRelaunchTutorial} style={{
          ...B({
            width:"100%",
            display:"flex", alignItems:"center", gap:14,
            padding:"14px 16px",
            background:Paper,
            border:"0.5px solid "+Hairline,
            borderRadius:RadiusMd,
            boxShadow:ShadowSm,
            textAlign:"left", fontFamily:Sans,
            transition: Trans(["background","color","border-color","box-shadow","transform","opacity"], "fast"),
          })
        }}>
          <div style={{
            width:36, height:36, borderRadius:10,
            display:"flex", alignItems:"center", justifyContent:"center",
            background:PurpleSoft, color:PurpleText,
            flexShrink:0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{
              fontSize:13, fontWeight:600, color:Ink,
            }}>{T.set_tutorial}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={Gray400} strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      {/* Historique d'activite */}
      {onOpenHistory && (
        <div style={{marginBottom:18}}>
          <div style={{
            fontSize:11, fontWeight:600,
            letterSpacing:"0.1em", textTransform:"uppercase",
            color:CoralText, marginBottom:10, fontFamily:Sans,
          }}>{T.set_history}</div>
          <button onClick={onOpenHistory} style={{
            ...B({
              width:"100%", display:"flex", alignItems:"center", gap:14,
              padding:"14px 16px",
              background:Paper, border:"0.5px solid "+Hairline,
              borderRadius:RadiusMd, boxShadow:ShadowSm,
              textAlign:"left", fontFamily:Sans,
              transition: Trans(["background","color","border-color","box-shadow","transform","opacity"], "fast"),
            })
          }}>
            <div style={{
              width:36, height:36, borderRadius:10,
              display:"flex", alignItems:"center", justifyContent:"center",
              background:GreenSoft, color:GreenText, flexShrink:0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v5h5"/>
                <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>
                <path d="M12 7v5l4 2"/>
              </svg>
            </div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:13, fontWeight:600, color:Ink}}>{T.set_history_open}</div>
              <div style={{fontSize:11, color:Gray600, marginTop:2}}>{T.set_history_hint}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={Gray400} strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      )}

      {/* Cache IA */}
      {onClearAiCache && (
        <div style={{marginBottom:18}}>
          <div style={{
            fontSize:11, fontWeight:600,
            letterSpacing:"0.1em", textTransform:"uppercase",
            color:CoralText, marginBottom:10, fontFamily:Sans,
          }}>{T.set_cache}</div>
          <button onClick={onClearAiCache} style={{
            ...B({
              width:"100%", display:"flex", alignItems:"center", gap:14,
              padding:"14px 16px",
              background:Paper, border:"0.5px solid "+Hairline,
              borderRadius:RadiusMd, boxShadow:ShadowSm,
              textAlign:"left", fontFamily:Sans,
              transition: Trans(["background","color","border-color","box-shadow","transform","opacity"], "fast"),
            })
          }}>
            <div style={{
              width:36, height:36, borderRadius:10,
              display:"flex", alignItems:"center", justifyContent:"center",
              background:CreamSoft, color:CoralText, flexShrink:0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"/>
                <path d="M8 6V4h8v2"/>
                <path d="M19 6l-1 14H6L5 6"/>
              </svg>
            </div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:13, fontWeight:600, color:Ink}}>{T.set_cache_clear}</div>
              <div style={{fontSize:11, color:Gray600, marginTop:2}}>{T.set_cache_hint}</div>
            </div>
          </button>
        </div>
      )}

      {/* THE ANSWERS EVERY FORM ASKS FOR, GIVEN ONCE
          Right to work, notice period, salary. They are the boxes that eat
          the twenty minutes, because every application asks them and the
          answer never changes. Nuvi refuses to guess them; typed once here,
          the extension repeats them. Empty stays empty. */}
      <div data-nuvi="reglages-reponses" style={{marginBottom:18}}>
        <label style={{
          display:"block", fontSize:11, fontWeight:600,
          letterSpacing:"0.1em", textTransform:"uppercase",
          color:CoralText, marginBottom:4, fontFamily:Sans,
        }}>{T.rep_titre}</label>
        <div style={{fontSize:11.5, color:InkMuted, marginBottom:10, lineHeight:1.5}}>{T.rep_sous}</div>
        {[
          ["droitDeTravailler", T.rep_droit, T.rep_oui_non],
          ["sponsor", T.rep_sponsor, T.rep_oui_non],
          ["preavis", T.rep_preavis, T.rep_preavis_ex],
          ["salaire", T.rep_salaire, T.rep_salaire_ex],
          ["mobilite", T.rep_mobilite, T.rep_oui_non],
          ["permis", T.rep_permis, T.rep_oui_non],
        ].map(([cle, libelle, exemple]) => (
          <div key={cle} style={{marginBottom:8}}>
            <label htmlFor={"rep-" + cle} style={{
              display:"block", fontSize:12, fontWeight:600, color:Ink, marginBottom:3,
            }}>{libelle}</label>
            <input
              id={"rep-" + cle}
              data-nuvi-reponse={cle}
              value={(reponses && reponses[cle]) || ""}
              onChange={(e) => onReponses({ ...(reponses || {}), [cle]: e.target.value })}
              placeholder={exemple}
              style={{
                width:"100%", minHeight:44, boxSizing:"border-box",
                padding:"10px 12px", borderRadius:RadiusMd,
                border:"0.5px solid "+Hairline, background:Paper, color:Ink,
                fontFamily:Sans, fontSize:13,
              }}/>
          </div>
        ))}
      </div>

      {/* Raccourcis clavier - eyebrow Coral */}
      <div style={{marginBottom:18}}>
        <div style={{
          fontSize:11, fontWeight:600,
          letterSpacing:"0.1em", textTransform:"uppercase",
          color:CoralText, marginBottom:10, fontFamily:Sans,
        }}>{T.set_kbd}</div>
        <div style={{
          padding:"4px 14px",
          background:Paper, borderRadius:RadiusMd,
          border:"0.5px solid "+Hairline,
        }}>
          <KbdRow keys={[cmdKey, "S"]} label={T.set_kbd_save}/>
          <KbdRow keys={[cmdKey, "K"]} label={T.set_kbd_coach}/>
          <KbdRow keys={[cmdKey, ","]} label={T.set_kbd_settings}/>
          <KbdRow keys={["Esc"]}        label={T.set_kbd_esc}/>
        </div>
      </div>

      {/* Signaler un probleme */}
      <div style={{marginBottom:18}} data-cvf="report">
        <button onClick={() => setRapportOuvert((v) => !v)} aria-expanded={rapportOuvert} style={{
          ...B({
            width:"100%",
            display:"flex", alignItems:"center", gap:14,
            padding:"14px 16px",
            background:Paper,
            border:"0.5px solid "+Hairline,
            borderRadius:RadiusMd,
            boxShadow:ShadowSm,
            textAlign:"left", fontFamily:Sans,
            transition: Trans(["background","color","border-color","box-shadow","transform","opacity"], "fast"),
          })
        }}>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:13, fontWeight:600, color:Ink, marginBottom:2}}>
              {T.set_report || (locale === "en" ? "Report a problem" : "Signaler un probleme")}
            </div>
            <div style={{fontSize:11, color:InkMuted, lineHeight:1.4}}>
              {T.set_report_desc || (locale === "en"
                ? "What broke, in your words. Nothing from your CV is sent unless you tick the box."
                : "Ce qui a casse, avec tes mots. Rien de ton CV ne part sans cocher la case.")}
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke={InkMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{flexShrink:0, transform: rapportOuvert ? "rotate(90deg)" : "none"}}>
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
        {rapportOuvert && (
          <div style={{
            marginTop:8, padding:"12px 14px",
            background:Paper, border:"0.5px solid "+Hairline, borderRadius:RadiusMd,
            display:"flex", flexDirection:"column", gap:10,
          }}>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4}
              placeholder={T.rp_placeholder || ""}
              aria-label={T.set_report || "Report a problem"}
              style={{
                width:"100%", boxSizing:"border-box", resize:"vertical",
                padding:"10px 12px", fontFamily:Sans, fontSize:13, lineHeight:1.45,
                color:Ink, background:"transparent", border:"0.5px solid "+Hairline, borderRadius:10,
              }}/>
            <label style={{display:"flex", alignItems:"flex-start", gap:10, fontSize:12, color:InkMuted, lineHeight:1.4, cursor:"pointer"}}>
              <input type="checkbox" checked={avecForme} onChange={(e) => setAvecForme(e.target.checked)}
                style={{marginTop:2, width:16, height:16, flexShrink:0}}/>
              <span>{T.rp_shape || ""}</span>
            </label>
            <div style={{display:"flex", alignItems:"center", gap:12}}>
              <button onClick={envoyer} disabled={envoi === "encours" || (!note.trim() && !avecForme)} style={{
                ...B({
                  padding:"10px 16px", minHeight:44, fontFamily:Sans, fontSize:13, fontWeight:600,
                  color:Paper, background:Ink, border:"none", borderRadius:10,
                  opacity: (envoi === "encours" || (!note.trim() && !avecForme)) ? 0.5 : 1,
                })
              }}>{T.rp_send || "Send"}</button>
              <span role="status" style={{fontSize:12, color:InkMuted}}>
                {envoi === "ok" ? (T.rp_sent || "Sent.") : envoi === "echec" ? (T.rp_failed || "Could not send.") : ""}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Version servie. Sert a repondre a "est-ce que la mise a jour est en
          ligne ?" sans avoir a deviner d'apres l'interface. */}
      <div style={{
        textAlign:"center", fontSize:11, color:Gray400,
        fontFamily:"ui-monospace, monospace", marginBottom:8,
      }}>
        build {process.env.NEXT_PUBLIC_BUILD_ID || "unknown"}
      </div>
    </Sheet>
  );
}
