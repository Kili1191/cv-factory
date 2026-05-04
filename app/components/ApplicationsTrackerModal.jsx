"use client";

// Nuvi v3 - ApplicationsTrackerModal (refondu palette Nuvi).
//
// Suivi des candidatures de l'utilisateur. CRUD local en localStorage.

import { useState, useEffect, useMemo } from "react";
import {
  Ink, InkMuted, Cream, CreamSoft, Paper, Hairline,
  Coral, CoralSoft, Green, GreenSoft, Purple, Magenta, PurpleSoft,
  Gray100, Gray200, Gray400, Gray600,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm, B,
} from "./tokens";
import Sheet from "./Sheet";

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
  const [form, setForm] = useState(app || {
    id: Date.now(),
    company:"", role:"",
    date: new Date().toISOString().slice(0, 10),
    status:"applied",
    notes:"", link:"",
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
function ApplicationCard({ T, app, onEdit, onDelete }) {
  const badge = statusBadge(app.status, T);
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

export default function ApplicationsTrackerModal({ T, applications, onAdd, onUpdate, onDelete, onClose }) {
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

  // Filtre + tri par date desc.
  const visible = useMemo(() => {
    let v = applications;
    if (filter !== "all") {
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

      {/* Stats */}
      {applications.length > 0 && (
        <div style={{display:"flex", gap:8, marginBottom:16}}>
          <StatCard label={T.ap_stats_total}    value={stats.total}    color={Ink}/>
          <StatCard label={T.ap_stats_active}   value={stats.active}   color={Purple}/>
          <StatCard label={T.ap_stats_offers}   value={stats.offers}   color={Green}/>
          <StatCard label={T.ap_stats_rejected} value={stats.rejected} color={Coral}/>
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
      {!showForm && applications.length === 0 && (
        <div style={{
          padding:"32px 18px",
          background:CreamSoft, borderRadius:RadiusMd,
          border:"0.5px solid "+Hairline,
          textAlign:"center",
        }}>
          <div style={{
            fontFamily:Serif, fontSize:16, fontWeight:500,
            color:Ink, letterSpacing:"-0.01em", marginBottom:6,
          }}>{T.ap_empty_title}</div>
          <div style={{
            fontSize:12, color:InkMuted, lineHeight:1.5,
          }}>{T.ap_empty_sub}</div>
        </div>
      )}

      {!showForm && visible.map(app => (
        <ApplicationCard key={app.id} T={T} app={app}
          onEdit={handleEdit} onDelete={handleDelete}/>
      ))}
    </Sheet>
  );
}
