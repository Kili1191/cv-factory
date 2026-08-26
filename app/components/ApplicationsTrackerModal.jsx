"use client";

// Nuvi v3 - ApplicationsTrackerModal (refondu palette Nuvi).
//
// Suivi des candidatures de l'utilisateur. CRUD local en localStorage.

import { useState, useEffect, useMemo, Fragment } from "react";
import {
  Ink, InkMuted, Cream, CreamSoft, Paper, Hairline,
  Coral, CoralSoft, Green, GreenSoft, Purple, Magenta, PurpleSoft,
  Gray100, Gray200, Gray400, Gray600,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm, B,
} from "./tokens";
import Sheet from "./Sheet";
import GmailScanPanel from "./GmailScanPanel";

// Couleur tag par status.
function statusBadge(status, T) {
  switch (status) {
    case "applied":   return { fg:Coral,   bg:CoralSoft,   label:T.ap_status_applied };
    case "phone":     return { fg:Purple,  bg:PurpleSoft,  label:T.ap_status_phone };
    case "interview": return { fg:Purple,  bg:PurpleSoft,  label:T.ap_status_interview };
    case "offer":     return { fg:Green,   bg:GreenSoft,   label:T.ap_status_offer };
    case "accepted":  return { fg:"#fff",  bg:Green,       label:T.ap_status_accepted };
    case "rejected":  return { fg:Coral,   bg:CoralSoft,   label:T.ap_status_rejected };
    case "ghosted":   return { fg:InkMuted,bg:Hairline,    label:T.ap_status_ghosted };
    default:          return { fg:InkMuted,bg:Hairline,    label:status || "?" };
  }
}

// Petite carte stat.
function StatCard({ label, value, color }) {
  return (
    <div style={{
      flex:1,
      padding:"12px 14px",
      background:Paper,
      borderRadius:RadiusMd,
      border:"0.5px solid "+Hairline,
      boxShadow:ShadowSm,
      textAlign:"center",
      fontFamily:Sans,
      minWidth:0,
    }}>
      <div style={{
        fontFamily:Serif, fontSize:22, fontWeight:500,
        color:color || Ink, lineHeight:1, letterSpacing:"-0.02em",
      }}>{value}</div>
      <div style={{
        fontSize:10, fontWeight:600,
        letterSpacing:"0.08em", textTransform:"uppercase",
        color:InkMuted, marginTop:4,
      }}>{label}</div>
    </div>
  );
}

// Formulaire add/edit.
function ApplicationForm({ T, app, onSave, onCancel }) {
  // `offer` est le texte de l'annonce. C'est le champ qui transforme ce
  // tableau en chaine de travail : sans lui, aucune etape suivante ne peut
  // etre preparee pour CE poste-la. C'est exactement ce qui manque chez les
  // concurrents, dont le suivi et l'adaptation du CV ne se parlent pas.
  const [form, setForm] = useState(app || {
    id: Date.now(),
    company:"", role:"",
    date: new Date().toISOString().slice(0, 10),
    status:"applied",
    notes:"", link:"", offer:"",
    created: Date.now(),
  });

  const u = (k) => (v) => setForm(p => ({...p, [k]:v}));
  const canSave = form.company && form.company.trim() && form.role && form.role.trim();

  const labelStyle = {
    display:"block", fontSize:11, fontWeight:600,
    letterSpacing:"0.08em", textTransform:"uppercase",
    color:Coral, marginBottom:6, fontFamily:Sans,
  };
  const inputStyle = {
    width:"100%", padding:"10px 12px", borderRadius:RadiusSm,
    border:"1px solid "+Hairline, fontSize:13, color:Ink,
    background:Paper, fontFamily:Sans,
    outline:"none", boxSizing:"border-box",
  };

  return (
    <div style={{
      padding:"16px 18px",
      background:Paper, borderRadius:RadiusMd,
      border:"0.5px solid "+Purple, boxShadow:ShadowSm,
      marginBottom:16,
    }}>
      <div style={{marginBottom:12}}>
        <label style={labelStyle}>{T.ap_field_company}</label>
        <input value={form.company} onChange={e=>u("company")(e.target.value)}
          style={inputStyle} autoFocus/>
      </div>
      <div style={{marginBottom:12}}>
        <label style={labelStyle}>{T.ap_field_role}</label>
        <input value={form.role} onChange={e=>u("role")(e.target.value)}
          style={inputStyle}/>
      </div>
      <div style={{display:"flex", gap:10, marginBottom:12}}>
        <div style={{flex:1}}>
          <label style={labelStyle}>{T.ap_field_date}</label>
          <input type="date"
            value={form.date} onChange={e=>u("date")(e.target.value)}
            style={inputStyle}/>
        </div>
        <div style={{flex:1}}>
          <label style={labelStyle}>{T.ap_field_status}</label>
          <select value={form.status} onChange={e=>u("status")(e.target.value)}
            style={inputStyle}>
            <option value="applied">{T.ap_status_applied}</option>
            <option value="phone">{T.ap_status_phone}</option>
            <option value="interview">{T.ap_status_interview}</option>
            <option value="offer">{T.ap_status_offer}</option>
            <option value="accepted">{T.ap_status_accepted}</option>
            <option value="rejected">{T.ap_status_rejected}</option>
            <option value="ghosted">{T.ap_status_ghosted}</option>
          </select>
        </div>
      </div>
      <div style={{marginBottom:12}}>
        <label style={labelStyle}>{T.ap_field_link}</label>
        <input value={form.link} onChange={e=>u("link")(e.target.value)}
          placeholder="https://..."
          style={inputStyle}/>
      </div>
      {/* L'annonce. Collee ici, elle alimente l'adaptation du CV, la relance
          et la preparation d'entretien pour ce poste precis. */}
      <div style={{marginBottom:14}}>
        <label style={labelStyle}>
          {T.ap_field_offer || "Annonce (colle le texte)"}
        </label>
        <textarea
          value={form.offer || ""}
          onChange={e=>u("offer")(e.target.value)}
          rows={4}
          placeholder={T.ap_offer_hint
            || "Colle l'annonce ici : elle sert a adapter ton CV, preparer l'entretien et rediger la relance."}
          style={{...inputStyle, resize:"vertical", minHeight:80}}/>
        {form.offer && form.offer.trim().length > 0 && (
          <div style={{fontSize:11, color:Green, marginTop:5}}>
            {(T.ap_offer_ready || "Annonce enregistree, les actions suivantes sont debloquees")}
          </div>
        )}
      </div>
      <div style={{marginBottom:14}}>
        <label style={labelStyle}>{T.ap_field_notes}</label>
        <textarea value={form.notes} onChange={e=>u("notes")(e.target.value)}
          rows={3}
          style={{...inputStyle, resize:"vertical", minHeight:60}}/>
      </div>
      <div style={{display:"flex", gap:8}}>
        <button onClick={onCancel} style={{
          ...B({
            flex:1, padding:"10px 14px", borderRadius:RadiusPill,
            background:Paper, color:InkMuted,
            border:"0.5px solid "+Hairline,
            fontSize:13, fontWeight:500, fontFamily:Sans,
          })
        }}>{T.ap_cancel}</button>
        <button onClick={()=>onSave(form)} disabled={!canSave} style={{
          ...B({
            flex:1, padding:"10px 14px", borderRadius:RadiusPill,
            background: canSave
              ? `linear-gradient(135deg, ${Purple}, ${Magenta})`
              : Hairline,
            color: canSave ? "#fff" : InkMuted,
            fontSize:13, fontWeight:600, fontFamily:Sans,
            border:"none",
            boxShadow: canSave ? "0 2px 8px rgba(91, 61, 245, 0.2)" : "none",
          })
        }}>{T.ap_save}</button>
      </div>
    </div>
  );
}

// Carte d'une candidature.
// PROCHAINE ACTION SELON L'ETAPE
//
// Un tableau de suivi ordinaire est passif : on y deplace des cartes. Celui-ci
// est actif. Chaque etape sait ce qui fait avancer la candidature, et le
// propose en un clic, deja charge avec CETTE annonce.
//
//   envoyee      -> relancer, avec le nombre de jours ecoules
//   entretien    -> preparer l'entretien sur cette annonce
//   offre        -> preparer la negociation
//   sans annonce -> coller l'annonce, qui debloque tout le reste
//
// C'est la boucle que personne n'a fermee : chez les concurrents, le suivi et
// l'adaptation du CV sont deux outils separes qui ne se parlent pas.
function nextAction(app, T) {
  const hasOffer = Boolean(app.offer && app.offer.trim());
  if (!hasOffer) {
    return { key:"offer", label:T.ap_do_offer || "Coller l'annonce",
      hint:T.ap_do_offer_hint || "Debloque le CV adapte, la relance et l'entretien" };
  }
  switch (app.status) {
    case "applied": {
      const days = daysSince(app.date);
      return {
        key:"followup",
        label:T.ap_do_followup || "Rediger la relance",
        hint: days === null ? null
          : days >= 7 ? (T.ap_do_followup_due || `Envoyee il y a ${days} jours, c'est le moment`)
          : (T.ap_do_followup_soon || `Envoyee il y a ${days} jour${days > 1 ? "s" : ""}`),
        urgent: days !== null && days >= 7,
      };
    }
    case "phone":
    case "interview":
      return { key:"prepare", label:T.ap_do_prepare || "Preparer l'entretien",
        hint:T.ap_do_prepare_hint || "Questions et reponses sur cette annonce" };
    case "offer":
      return { key:"negotiate", label:T.ap_do_negotiate || "Preparer la negociation",
        hint:null };
    default:
      return { key:"tailor", label:T.ap_do_tailor || "Adapter mon CV",
        hint:T.ap_do_tailor_hint || "Reecrit ton CV pour cette annonce" };
  }
}

// ETAT DE SANTE D'UNE CANDIDATURE
//
// Trois familles, calculees sans IA : c'est instantane, gratuit, et le
// resultat ne change pas d'un appel a l'autre.
//
//   morte     refusee, sans nouvelles depuis trop longtemps, ou relancee sans
//             reponse. Elle encombre, il faut la sortir de la tete.
//   en cours  envoyee recemment, ou relance encore utile. C'est la que se
//             joue le travail.
//   ca avance entretien, offre, accepte. On protege ces dossiers-la.
//
// Les seuils suivent les usages du recrutement : sous une semaine il est trop
// tot pour s'inquieter, au-dela de trois semaines sans reponse ni relance la
// candidature est statistiquement finie.
const HEALTH_GOOD = "good";
const HEALTH_PENDING = "pending";
const HEALTH_DEAD = "dead";

function health(app) {
  const days = daysSince(app.date);
  switch (app.status) {
    case "accepted":
    case "offer":
    case "interview":
    case "phone":
      return { key:HEALTH_GOOD };
    case "rejected":
      return { key:HEALTH_DEAD, why:"refusee" };
    case "ghosted":
      return { key:HEALTH_DEAD, why:"sans reponse" };
    case "applied":
    default: {
      if (days === null) return { key:HEALTH_PENDING };
      const followed = Boolean(app.followedUpAt);
      if (days > 30) return { key:HEALTH_DEAD, why:`${days} jours sans reponse` };
      if (days > 21 && followed) return { key:HEALTH_DEAD, why:"relancee, sans suite" };
      if (days >= 7 && !followed) return { key:HEALTH_PENDING, why:"a relancer", act:true };
      return { key:HEALTH_PENDING, why:days === 0 ? "envoyee aujourd hui" : `${days} j` };
    }
  }
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  const then = Date.parse(dateStr);
  if (!Number.isFinite(then)) return null;
  return Math.max(0, Math.floor((Date.now() - then) / 86400000));
}

function ApplicationCard({ T, app, onEdit, onDelete, onAction }) {
  const badge = statusBadge(app.status, T);
  const action = nextAction(app, T);
  const h = health(app);
  return (
    <div style={{
      padding:"14px 16px",
      background:Paper, borderRadius:RadiusMd,
      border:"0.5px solid "+Hairline, boxShadow:ShadowSm,
      marginBottom:10, fontFamily:Sans,
    }}>
      {/* Header avec entreprise + status badge */}
      <div style={{
        display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        gap:10, marginBottom:8,
      }}>
        <div style={{flex:1, minWidth:0}}>
          <div style={{
            fontFamily:Serif, fontSize:15, fontWeight:500,
            color:Ink, letterSpacing:"-0.01em", lineHeight:1.3,
          }}>{app.company || "?"}</div>
          <div style={{
            fontSize:12, color:InkMuted, marginTop:2,
          }}>{app.role || "?"}</div>
        </div>
        <span style={{
          fontSize:10, fontWeight:600, color:badge.fg,
          background:badge.bg, padding:"4px 10px", borderRadius:RadiusPill,
          letterSpacing:"0.05em", textTransform:"uppercase",
          flexShrink:0,
        }}>{badge.label}</span>
      </div>

      {/* Date + lien */}
      <div style={{
        display:"flex", gap:10, alignItems:"center",
        fontSize:11, color:InkMuted, marginBottom: app.notes ? 8 : 10,
      }}>
        {app.date && <span>{app.date}</span>}
        {h.why && (
          <span style={{
            color: h.key === "dead" ? InkMuted : h.act ? Coral : InkMuted,
            fontWeight: h.act ? 600 : 400,
          }}>{h.why}</span>
        )}
        {app.link && (
          <a href={app.link} target="_blank" rel="noopener noreferrer"
            style={{color:Purple, textDecoration:"none"}}>
            {(() => {
              try { return new URL(app.link).host; }
              catch { return app.link.slice(0, 30); }
            })()}
          </a>
        )}
      </div>

      {/* Notes */}
      {app.notes && (
        <div style={{
          padding:"8px 10px",
          background:CreamSoft, borderRadius:RadiusSm,
          fontSize:11, color:Ink, lineHeight:1.5,
          marginBottom:10, whiteSpace:"pre-wrap",
        }}>{app.notes}</div>
      )}

      {/* Prochaine action : ce qui fait avancer CETTE candidature, en un clic
          et deja charge avec son annonce. */}
      <button
        onClick={()=>onAction && onAction(action.key, app)}
        style={{
          ...B({
            width:"100%", minHeight:44, marginBottom:8,
            borderRadius:RadiusPill, border:"none",
            background: action.urgent
              ? `linear-gradient(135deg, ${Purple}, ${Magenta})`
              : action.key === "offer" ? CreamSoft
              : `linear-gradient(135deg, ${Purple}, ${Magenta})`,
            color: action.key === "offer" ? Ink : "#fff",
            fontSize:13, fontWeight:600, fontFamily:Sans,
            display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", gap:1,
            padding:"6px 12px",
          }),
        }}
      >
        <span>{action.label}</span>
        {action.hint && (
          <span style={{
            fontSize:10.5, fontWeight:400, opacity:.85,
            color: action.key === "offer" ? InkMuted : "rgba(255,255,255,.9)",
          }}>{action.hint}</span>
        )}
      </button>

      {/* Actions */}
      <div style={{display:"flex", gap:8}}>
        <button onClick={()=>onEdit(app)} style={{
          ...B({
            flex:1, padding:"7px 12px", borderRadius:RadiusPill,
            background:CreamSoft, color:Coral,
            border:"0.5px solid "+Coral,
            fontSize:11, fontWeight:600, fontFamily:Sans,
          })
        }}>{T.ap_edit}</button>
        <button onClick={()=>onDelete(app.id)} style={{
          ...B({
            padding:"7px 12px", borderRadius:RadiusPill,
            background:CoralSoft, color:Coral,
            border:"0.5px solid "+Coral,
            fontSize:11, fontWeight:600, fontFamily:Sans,
          })
        }}>{T.ap_delete}</button>
      </div>
    </div>
  );
}

export default function ApplicationsTrackerModal({
  T, applications, onAdd, onUpdate, onDelete, onClose,
  onAction = () => {},
  // Gmail est facultatif : sans compte configure, ces trois-la restent nuls
  // et le panneau ne s'affiche pas. Le suivi fonctionne exactement comme
  // avant, a la main.
  locale = "en",
  connectGmail = null,
  getGmailToken = null,
  gmailAutoScan = false,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [onClose]);

  // Stats calculees.
  const stats = useMemo(() => {
    const total = applications.length;
    const offers = applications.filter(a => a.status === "offer" || a.status === "accepted").length;
    const rejected = applications.filter(a => a.status === "rejected" || a.status === "ghosted").length;
    const active = total - offers - rejected;
    return { total, active, offers, rejected };
  }, [applications]);

  // Tri de sante : ce qui avance, ce qui attend, ce qui est mort.
  const triage = useMemo(() => {
    const g = { good:[], pending:[], dead:[], toFollow:0 };
    for (const a of applications) {
      const h = health(a);
      g[h.key].push(a);
      if (h.act) g.toFollow += 1;
    }
    return g;
  }, [applications]);

  // Filtre + tri par date desc.
  const visible = useMemo(() => {
    let v = applications;
    if (filter === "good" || filter === "pending" || filter === "dead") {
      v = v.filter(a => health(a).key === filter);
    } else if (filter !== "all") {
      v = v.filter(a => a.status === filter);
    }
    return [...v].sort((a, b) => {
      const da = a.date || "";
      const db = b.date || "";
      if (da !== db) return db.localeCompare(da);
      return (b.created || 0) - (a.created || 0);
    });
  }, [applications, filter]);

  const handleSave = (app) => {
    if (editingApp) {
      onUpdate(app);
    } else {
      onAdd(app);
    }
    setShowForm(false);
    setEditingApp(null);
  };

  const handleEdit = (app) => {
    setEditingApp(app);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm(T.ap_delete_confirm)) {
      onDelete(id);
    }
  };

  return (
    <Sheet
      eyebrow={T.ap_eyebrow}
      title={
        <>
          {T.ap_title_a}
          {" "}<em style={{
            fontFamily:Serif, fontStyle:"italic",
            background: `linear-gradient(135deg, ${Purple}, ${Magenta})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}>{T.ap_title_em}</em>
          {T.ap_title_b}
        </>
      }
      onClose={onClose}
    >
      <p style={{
        fontSize:13, color:InkMuted, lineHeight:1.5,
        margin:"0 0 18px", fontFamily:Sans,
      }}>{T.ap_sub}</p>

      {/* Les reponses des recruteurs, lues dans la boite mail.
          C'est ce qui separe un tableau qu'il faut tenir a jour d'un tableau
          qui dit la verite : sans lui, les lignes "en attente" contiennent
          des refus encaisses il y a trois semaines et des invitations
          restees sans reponse. */}
      {connectGmail && getGmailToken && (
        <GmailScanPanel
          locale={locale}
          applications={applications}
          connectGmail={connectGmail}
          getGmailToken={getGmailToken}
          autoScan={gmailAutoScan}
          onApply={(id, status) => {
            const app = applications.find(a => String(a.id) === String(id));
            if (!app) return;
            // La date de derniere nouvelle repart d'aujourd'hui : c'est elle
            // qui decide, plus tard, si la candidature est a relancer ou
            // consideree comme morte.
            onUpdate({ ...app, status, lastReplyAt: Date.now() });
          }}
        />
      )}

      {/* Stats */}
      {applications.length > 0 && (
        <div style={{display:"flex", gap:8, marginBottom:16}}>
          <StatCard label={T.ap_stats_total}    value={stats.total}    color={Ink}/>
          <StatCard label={T.ap_stats_active}   value={stats.active}   color={Purple}/>
          <StatCard label={T.ap_stats_offers}   value={stats.offers}   color={Green}/>
          <StatCard label={T.ap_stats_rejected} value={stats.rejected} color={Coral}/>
        </div>
      )}

      {/* Le point de la semaine. Trois familles, cliquables pour filtrer.
          C'est ce qu'on veut savoir en ouvrant l'ecran : ou en suis-je, et
          qu'est-ce qui reclame quelque chose de moi maintenant. */}
      {applications.length > 0 && (
        <div style={{marginBottom:16}}>
          <div style={{display:"flex", gap:8}}>
            {[
              ["good",    T.ap_health_good    || "Ca avance", triage.good.length,    Green,  GreenSoft],
              ["pending", T.ap_health_pending || "En cours",  triage.pending.length, Purple, PurpleSoft],
              ["dead",    T.ap_health_dead    || "Mortes",    triage.dead.length,    InkMuted, Hairline],
            ].map(([key, label, n, fg, bg]) => (
              <button
                key={key}
                onClick={() => setFilter(filter === key ? "all" : key)}
                style={{
                  ...B({
                    flex:1, padding:"12px 8px", borderRadius:RadiusMd,
                    background: filter === key ? fg : bg,
                    border: "0.5px solid " + (filter === key ? fg : Hairline),
                    fontFamily:Sans, textAlign:"center", minHeight:64,
                  }),
                }}
              >
                <div style={{
                  fontSize:22, fontWeight:600, lineHeight:1,
                  color: filter === key ? "#fff" : fg,
                  fontVariantNumeric:"tabular-nums",
                }}>{n}</div>
                <div style={{
                  fontSize:11, marginTop:4,
                  color: filter === key ? "rgba(255,255,255,.9)" : InkMuted,
                }}>{label}</div>
              </button>
            ))}
          </div>
          {triage.toFollow > 0 && (
            <div style={{
              marginTop:8, padding:"10px 12px", borderRadius:RadiusSm,
              background:CoralSoft, border:"0.5px solid "+Coral,
              fontSize:12.5, color:Ink, fontFamily:Sans, lineHeight:1.45,
            }}>
              <strong>{triage.toFollow}</strong>{" "}
              {triage.toFollow > 1
                ? (T.ap_to_follow_many || "candidatures attendent une relance.")
                : (T.ap_to_follow_one || "candidature attend une relance.")}
              {" "}
              {T.ap_to_follow_hint || "C'est le seul geste qui les fait repartir."}
            </div>
          )}
        </div>
      )}

      {/* Bouton add - gradient violet→magenta */}
      {!showForm && (
        <button onClick={()=>{ setEditingApp(null); setShowForm(true); }} style={{
          ...B({
            width:"100%", padding:"13px 18px", borderRadius:RadiusPill,
            background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,
            color:"#fff",
            fontFamily:Sans, fontWeight:600, fontSize:13,
            border:"none",
            display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
            marginBottom:16,
            transition:"all 200ms ease-out",
            boxShadow:"0 4px 16px rgba(91, 61, 245, 0.25)",
          })
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          {T.ap_add}
        </button>
      )}

      {/* Form add/edit */}
      {showForm && (
        <ApplicationForm T={T}
          app={editingApp}
          onSave={handleSave}
          onCancel={()=>{ setShowForm(false); setEditingApp(null); }}
        />
      )}

      {/* Filtre par status - active = gradient violet→magenta */}
      {applications.length > 0 && !showForm && (
        <div style={{
          display:"flex", gap:6, marginBottom:14,
          overflowX:"auto", paddingBottom:4,
        }}>
          {[
            ["all",       T.ap_filter_all],
            ["applied",   T.ap_status_applied],
            ["interview", T.ap_status_interview],
            ["offer",     T.ap_status_offer],
            ["rejected",  T.ap_status_rejected],
          ].map(([k, l]) => (
            <button key={k} onClick={()=>setFilter(k)} style={{
              ...B({
                padding:"6px 12px", borderRadius:RadiusPill,
                background: filter === k
                  ? `linear-gradient(135deg, ${Purple}, ${Magenta})`
                  : Paper,
                color: filter === k ? "#fff" : InkMuted,
                border: "0.5px solid "+(filter === k ? "transparent" : Hairline),
                fontSize:11, fontWeight:500, fontFamily:Sans,
                whiteSpace:"nowrap", flexShrink:0,
                transition:"all 180ms ease-out",
              })
            }}>{l}</button>
          ))}
        </div>
      )}

      {/* Liste */}
      {/* L'ECRAN VIDE EST LE PREMIER QU'ON VOIT, PAS LE DERNIER
          C'etait une boite grise avec deux phrases : "Aucune candidature." et
          "Ajoute ta premiere candidature." Elle constatait le vide sans rien
          en faire - et c'est pourtant l'ecran que rencontre TOUT nouveau
          venu, avant d'avoir la moindre raison de rester.
          Un ecran vide bien fait ne decrit pas le vide, il montre ce qui va
          le remplir. Les trois etapes du suivi sont donc dessinees a l'avance,
          en creux : on voit le parcours d'une candidature avant d'en avoir
          une seule, et on comprend a quoi sert l'ecran sans le mode d'emploi. */}
      {!showForm && applications.length === 0 && (
        <div style={{
          padding:"26px 20px 24px",
          background:CreamSoft, borderRadius:RadiusMd,
          border:"0.5px solid "+Hairline,
          textAlign:"center",
        }}>
          <div style={{
            fontFamily:Serif, fontSize:17, fontWeight:500,
            color:Ink, letterSpacing:"-0.01em", marginBottom:5,
          }}>{T.ap_empty_title}</div>
          <div style={{
            fontSize:12.5, color:InkMuted, lineHeight:1.5, marginBottom:20,
          }}>{T.ap_empty_sub}</div>

          {/* Les trois etapes, en creux. Les pastilles sont vides : rien n'est
              encore arrive, et le dessin ne pretend pas le contraire. */}
          <div style={{
            display:"flex", alignItems:"flex-start", justifyContent:"center",
            gap:0, maxWidth:340, margin:"0 auto",
          }}>
            {[
              T.ap_step_sent || (locale === "en" ? "Sent" : "Envoyee"),
              T.ap_step_reply || (locale === "en" ? "Reply" : "Reponse"),
              T.ap_step_interview || (locale === "en" ? "Interview" : "Entretien"),
            ].map((etape, i, tout) => (
              <Fragment key={etape}>
                <div style={{
                  display:"flex", flexDirection:"column", alignItems:"center",
                  gap:7, flexShrink:0, width:74,
                }}>
                  <span style={{
                    width:13, height:13, borderRadius:"50%",
                    border:"1.5px dashed "+Gray400, display:"block",
                  }}/>
                  <span style={{
                    fontSize:10.5, fontWeight:600, letterSpacing:"0.04em",
                    color:InkMuted, lineHeight:1.2,
                  }}>{etape}</span>
                </div>
                {i < tout.length - 1 && (
                  <span aria-hidden="true" style={{
                    flex:1, height:1, marginTop:6, minWidth:18,
                    backgroundImage:"repeating-linear-gradient(90deg,"+Gray400+" 0 4px,transparent 4px 9px)",
                  }}/>
                )}
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {!showForm && visible.map(app => (
        <ApplicationCard key={app.id} T={T} app={app}
          onEdit={handleEdit} onDelete={handleDelete}
          onAction={onAction}/>
      ))}
    </Sheet>
  );
}
