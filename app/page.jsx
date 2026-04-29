"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const FONT = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Lato:wght@400;700&family=Montserrat:wght@700&family=Open+Sans:wght@600&display=swap";
const Gold = "#c9a96e";
const Dark = "#1a1a2e";
const SK = { CV:"cvf_d", TH:"cvf_t", LY:"cvf_l", KY:"cvf_k", LC:"cvf_c" };

const FR_T = {
  appName:"CV Factory", appSub:"Editeur Premium IA",
  tab_ai:"IA", tab_edit:"Editer", tab_design:"Design",
  tab_score:"Score", tab_tools:"Outils",
  tab_gen:"Generer", tab_adj:"Ajuster", tab_match:"Offre",
  ob_import:"Importer mon CV", ob_generate:"Generer avec l'IA",
  ob_blank:"Commencer vierge", ob_back:"Retour",
  ob_paste:"Colle ton CV ici (texte brut)",
  ob_parse:"Parser et importer", ob_parsing:"Import...",
  ob_continue:"Continuer sans cle API",
  ob_no_key:"Cle API requise - va dans Outils",
  sh_save:"Enregistrer",
  sh_name:"Nom", sh_title:"Titre", sh_email:"Email",
  sh_phone:"Tel", sh_loc:"Localisation", sh_li:"LinkedIn",
  sh_sum:"Accroche", sh_et:"Poste", sh_ec:"Entreprise",
  sh_ep:"Periode", sh_ey:"Ville", sh_eb:"Realisations",
  sh_addl:"+ Ligne", sh_addex:"+ Experience", sh_added:"+ Formation",
  sh_del:"Supprimer", sh_edd:"Diplome", sh_eds:"Ecole",
  sh_sk:"Competences", sh_addsk:"+ Competence",
  sh_lg:"Langues", sh_addlg:"+ Langue",
  sh_lph1:"Langue", sh_lph2:"Niveau",
  sh_ct:"Certifications", sh_addct:"+ Certification",
  dth:"Theme", dly:"Layout", dlg:"Langue interface",
  dats:"Mode ATS actif.",
  ai_job:"Poste vise", ai_jph:"ex: DRH, CFO...",
  ai_sec:"Secteur", ai_yrs:"Annees exp.",
  ai_tone:"Ton", ai_tp:"Premium", ai_tc:"Creatif", ai_tk:"Sobre",
  ai_lang:"Langue du CV",
  ai_parc:"Votre parcours (opt.)", ai_off:"Offre emploi (opt.)",
  ai_btn:"Generer avec l'IA", ai_gen:"Generation...",
  ai_nk:"Cle API requise dans Outils",
  ai_secs:["Finance/Banque","Tech/Digital","Conseil","Marketing",
    "RH","Commercial","Industrie","Sante/Pharma","Immobilier","Luxe"],
  adj_inst:"Instruction",
  adj_ph:"Ex: Rends les bullets plus chiffres...",
  adj_btn:"Ajuster mon CV", adj_ld:"Ajustement...",
  adj_undo:"Annuler", adj_sugg:"Suggestions",
  adj_pre:["Bullets plus chiffres",
    "Accroche en 2 lignes",
    "Ton premium corporate",
    "Traduire en anglais",
    "Verbes d'action",
    "Reorganise competences"],
  adj_tip:"L'IA modifie sans inventer. Annulable.",
  adj_imp:"Importer CV existant",
  adj_par:"Parser", adj_can:"Annuler", adj_sec:"Ajuster",
  edit_t:"Modifier par section",
  edit_id:"Identite et Contact", edit_ex:"Experiences",
  edit_ed:"Formations", edit_sk:"Competences et Langues",
  edit_tip:"Appuyez sur le texte du CV pour modifier.",
  t_api:"Cle API Anthropic", t_aph:"sk-ant-...",
  t_ahi:"Stockee localement",
  t_exp:"Export", t_pdf:"Exporter en PDF",
  t_ath:"Pour ATS: passe en layout ATS-Safe",
  t_hist:"Historique", t_undo:"Annuler",
  t_rst:"Reinitialiser", t_qck:"Actions rapides",
  hide:"Masquer", show:"Voir CV", zoom:"Zoom",
  conf:"Reinitialiser le CV?",
  q_ex:"+ Experience", q_ed:"+ Formation", q_sk:"+ Competence",
  nt:"Nouveau poste", nc:"Entreprise", np:"20XX-20XX",
  ny:"Ville", nb:"Realisation cle",
  nd:"Diplome", ns:"Ecole", nsp:"20XX-20XX",
  cv_p:"Profil", cv_e:"Experience", cv_el:"Experience Professionnelle",
  cv_ed:"Formation", cv_s:"Competences", cv_l:"Langues",
  cv_c:"Certifications", cv_ct:"Contact",
  ok:"CV genere!", okadj:"CV ajuste!", okimp:"CV importe!",
  okb:"Bullet ameliore", oka:"Ajoute", okr:"CV reinitialise",
  oku:"Annule", okp:"PDF exporte",
  nk:"Entrez votre cle API dans Outils",
  ni:"Ecris une instruction", np2:"Colle ton CV d'abord",
  ep:"Erreur parsing - verifie la cle API",
  ea:"Erreur API", eb:"Erreur API", au:"Annule", nu:"Rien a annuler",
};

const EN_T = {
  appName:"CV Factory", appSub:"Premium AI Editor",
  tab_ai:"AI", tab_edit:"Edit", tab_design:"Design",
  tab_score:"Score", tab_tools:"Tools",
  tab_gen:"Generate", tab_adj:"Adjust", tab_match:"Match",
  ob_import:"Import my CV", ob_generate:"Generate with AI",
  ob_blank:"Start blank", ob_back:"Back",
  ob_paste:"Paste your CV here (plain text)",
  ob_parse:"Parse and import", ob_parsing:"Importing...",
  ob_continue:"Continue without API key",
  ob_no_key:"API key required - go to Tools",
  sh_save:"Save",
  sh_name:"Full name", sh_title:"Job title", sh_email:"Email",
  sh_phone:"Phone", sh_loc:"Location", sh_li:"LinkedIn",
  sh_sum:"Summary", sh_et:"Job title", sh_ec:"Company",
  sh_ep:"Period", sh_ey:"City", sh_eb:"Achievements",
  sh_addl:"+ Line", sh_addex:"+ Experience", sh_added:"+ Education",
  sh_del:"Delete", sh_edd:"Degree", sh_eds:"School",
  sh_sk:"Skills", sh_addsk:"+ Skill",
  sh_lg:"Languages", sh_addlg:"+ Language",
  sh_lph1:"Language", sh_lph2:"Level",
  sh_ct:"Certifications", sh_addct:"+ Certification",
  dth:"Theme", dly:"Layout", dlg:"Interface language",
  dats:"ATS mode active.",
  ai_job:"Target role", ai_jph:"e.g. CFO, CMO...",
  ai_sec:"Industry", ai_yrs:"Years of exp.",
  ai_tone:"Tone", ai_tp:"Executive", ai_tc:"Creative", ai_tk:"Classic",
  ai_lang:"CV language",
  ai_parc:"Your background (opt.)", ai_off:"Job posting (opt.)",
  ai_btn:"Generate with AI", ai_gen:"Generating...",
  ai_nk:"API key required in Tools",
  ai_secs:["Finance/Banking","Tech/Digital","Consulting","Marketing",
    "HR","Sales","Industry","Healthcare","Real Estate","Luxury"],
  adj_inst:"Instruction",
  adj_ph:"E.g. Make bullets more quantified...",
  adj_btn:"Adjust my CV", adj_ld:"Adjusting...",
  adj_undo:"Undo", adj_sugg:"Quick suggestions",
  adj_pre:["Quantify all bullets",
    "Shorten summary",
    "Executive tone",
    "Translate to French",
    "Action verbs",
    "Reorder skills"],
  adj_tip:"AI edits without inventing. Undoable.",
  adj_imp:"Import existing CV",
  adj_par:"Parse", adj_can:"Cancel", adj_sec:"Adjust",
  edit_t:"Edit by section",
  edit_id:"Identity and Contact", edit_ex:"Experience",
  edit_ed:"Education", edit_sk:"Skills and Languages",
  edit_tip:"Tap any CV text to edit inline.",
  t_api:"Anthropic API Key", t_aph:"sk-ant-...",
  t_ahi:"Stored locally",
  t_exp:"Export", t_pdf:"Export as PDF",
  t_ath:"For ATS: switch to ATS-Safe layout",
  t_hist:"History", t_undo:"Undo",
  t_rst:"Reset", t_qck:"Quick actions",
  hide:"Hide CV", show:"Show CV", zoom:"Zoom",
  conf:"Reset entire CV?",
  q_ex:"+ Experience", q_ed:"+ Education", q_sk:"+ Skill",
  nt:"New position", nc:"Company", np:"20XX-20XX",
  ny:"City", nb:"Key achievement",
  nd:"Degree", ns:"School", nsp:"20XX-20XX",
  cv_p:"Professional Profile", cv_e:"Experience",
  cv_el:"Professional Experience",
  cv_ed:"Education", cv_s:"Skills", cv_l:"Languages",
  cv_c:"Certifications", cv_ct:"Contact",
  ok:"CV generated!", okadj:"CV adjusted!", okimp:"CV imported!",
  okb:"Bullet improved", oka:"Added", okr:"CV reset",
  oku:"Undone", okp:"PDF exported",
  nk:"Enter your API key in Tools",
  ni:"Enter an instruction first", np2:"Paste your CV first",
  ep:"Parsing error - check API key",
  ea:"Error - check API key.", eb:"API error",
  au:"Undone", nu:"Nothing to undo",
};

const THEMES = {
  executive:{
    name:"Executive", 
    pr:"#1a1a2e", ac:"#c9a96e", bg:"#f8f6f1",
    sb:"#1a1a2e", st:"#f8f6f1",
    hf:"'Playfair Display',serif", bf:"'Lato',sans-serif"
  },
  modern:{
    name:"Modern", 
    pr:"#0f3460", ac:"#e94560", bg:"#fff",
    sb:"#0f3460", st:"#fff",
    hf:"'Montserrat',sans-serif", bf:"'Open Sans',sans-serif"
  },
  creative:{
    name:"Creative", 
    pr:"#1e1e1e", ac:"#ff6b35", bg:"#fafafa",
    sb:"#1e1e1e", st:"#fafafa",
    hf:"'Space Grotesk',sans-serif", bf:"'Lato',sans-serif"
  },
  minimal:{
    name:"Minimal", 
    pr:"#222", ac:"#888", bg:"#fff",
    sb:"#f0f0f0", st:"#222",
    hf:"Georgia,serif", bf:"'Lato',sans-serif"
  },
  luxury:{
    name:"Luxury", 
    pr:"#2c1810", ac:"#a67c52", bg:"#fdf8f3",
    sb:"#2c1810", st:"#fdf8f3",
    hf:"Georgia,serif", bf:"'Lato',sans-serif"
  },
};

const LAYOUTS = ["sidebar","classic","ats"];

const EMPTY = {
  name:"", title:"", email:"", phone:"",
  location:"", linkedin:"", summary:"",
  experience:[{id:1,title:"",company:"",period:"",location:"",bullets:["",""]}],
  education:[{id:1,degree:"",school:"",period:""}],
  skills:["","","","","","","",""],
  languages:[{lang:"",level:""},{lang:"",level:""}],
  certifications:[""],
};

const TEMPLATES = [
  {
    id:"finance", label:"Finance CFO", 
    theme:"executive", layout:"sidebar",
    cv:{
      name:"Sophie Marchand",
      title:"CFO - Directrice Financiere",
      email:"s.marchand@email.com",
      phone:"+33 6 11 22 33 44",
      location:"Paris, France",
      linkedin:"linkedin.com/in/sophiemarchand",
      summary:"CFO avec 15 ans en finance d'entreprise et M&A. " +
        "3 LBO reussis (250M EUR cumules). Expert restructuring et IFRS.",
      experience:[
        {id:1,title:"CFO",company:"Groupe Meridian",
          period:"2019-Present",location:"Paris",
          bullets:["P&L groupe 420M EUR - EBITDA +8pts en 3 ans",
            "Gestion dette LBO 180M EUR",
            "Deploiement ERP SAP S/4HANA 8 filiales"]},
        {id:2,title:"Directrice Controle de Gestion",
          company:"Vivendi SE",period:"2014-2019",location:"Paris",
          bullets:["Budget groupe 2.4 Mds EUR - 12 BUs",
            "2 acquisitions due diligence 60M + 140M EUR"]},
        {id:3,title:"Auditrice Senior",
          company:"PwC France",period:"2009-2014",location:"Paris",
          bullets:["Audit CAC40 - chef de mission equipe 8",
            "Certification IFRS - missions UK et Belgique"]},
      ],
      education:[
        {id:1,degree:"Master CCA",school:"Paris-Dauphine",period:"2007-2009"},
        {id:2,degree:"Licence Economie",school:"Sciences Po",period:"2004-2007"},
      ],
      skills:["Finance d'entreprise","M&A/LBO","IFRS","SAP S/4HANA",
        "Cash management","Budget Forecast","Restructuring","Reporting COMEX"],
      languages:[{lang:"Francais",level:"Natif"},{lang:"Anglais",level:"C1"}],
      certifications:["CPA - Certified Public Accountant","Diplome DEC"],
    }
  },

  {
    id:"sales", label:"Trade Finance", 
    theme:"creative", layout:"sidebar",
    cv:{
      name:"Kilian Maisonnette",
      title:"Senior Trade Finance Consultant",
      email:"k.maisonnette@email.com",
      phone:"+33 6 78 90 12 34",
      location:"Lyon, France",
      linkedin:"linkedin.com/in/kilianm",
      summary:"Consultant Senior Trade Finance 12 ans dont 7 ans chez Stenn " +
        "(Fintech UK, 600M+ debt funding). Expert affacturage et BFR.",
      experience:[
        {id:1,title:"Responsable Commercial B2B",
          company:"Primagaz",period:"2025-Present",location:"Lyon",
          bullets:["Solutions energetiques B2B PME Rhone-Alpes",
            "Developpement portefeuille clients multi-sectoriel"]},
        {id:2,title:"Senior Trade Finance Consultant",
          company:"Stenn International",period:"2017-2024",location:"Londres",
          bullets:["Conseil PME exportatrices financement BFR",
            "Structuration trade finance supply chain finance",
            "Portefeuille PME multi-secteurs EU MENA Asie"]},
        {id:3,title:"Senior Real Estate Consultant",
          company:"ALH Properties",period:"2024-2025",location:"Dubai",
          bullets:["Vente immobiliere HNW internationale",
            "Tickets 1M USD+ cycles de vente longs"]},
      ],
      education:[
        {id:1,degree:"Leadership Development Niv.7",
          school:"OTHM UK",period:"2026"},
        {id:2,degree:"Formation Bancaire",
          school:"ING Direct",period:"2013"},
      ],
      skills:["Trade Finance","Affacturage BFR","Negociation B2B",
        "Analyse credit","Due diligence","Business Dev","Management","Closing"],
      languages:[
        {lang:"Francais",level:"Natif"},
        {lang:"Anglais",level:"Courant 10 ans UK"},
      ],
      certifications:["Titre Professionnel Niv.4 AFPA (RNCP)"],
    }
  },
];

function lsG(k, fb=null) {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; }
  catch { return fb; }
}
function lsS(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
}

const B = (x={}) => ({ border:"none", cursor:"pointer", fontFamily:"inherit", ...x });
const IN = (x={}) => ({
  width:"100%", padding:"10px 12px", borderRadius:8,
  border:"1px solid #ddd", fontSize:13, fontFamily:"inherit",
  boxSizing:"border-box", outline:"none", background:"#fff", ...x
});
const LBL = {
  display:"block", fontSize:10, fontWeight:700, color:"#999",
  letterSpacing:1.2, textTransform:"uppercase", marginBottom:5
};
const SH = (x={}) => ({
  fontSize:10, fontWeight:700, color:"#999", letterSpacing:1.5,
  textTransform:"uppercase", margin:"16px 0 10px",
  paddingBottom:5, borderBottom:"1px solid #eee", ...x
});

function san(t) {
  return (t||"").split("\u2014").join("-").split("\u2013").join("-");
}

async function aiCall(prompt) {
  const r = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return san((d.content||[]).map(b=>b.text||"").join(""));
}

function parseJSON(txt) {
  const clean = txt.split("```json").join("").split("```").join("").trim();
  return JSON.parse(clean);
}

function normCV(raw, base=EMPTY) {
  const ns = v => typeof v==="string" ? v : String(v||"");
  return {
    ...base, ...raw,
    skills:(Array.isArray(raw.skills)?raw.skills:[]).map(ns),
    languages:(Array.isArray(raw.languages)?raw.languages:[]).map(
      l=>({lang:ns(l.lang||""), level:ns(l.level||"")})
    ),
    certifications:(Array.isArray(raw.certifications)?raw.certifications:[]).map(ns),
    experience:(Array.isArray(raw.experience)?raw.experience:[]).map(
      (e,i)=>({...e, id:i+1, bullets:(Array.isArray(e.bullets)?e.bullets:[]).map(ns)})
    ),
    education:(Array.isArray(raw.education)?raw.education:[]).map(
      (e,i)=>({...e, id:i+1})
    ),
  };
}

function E({ value, onChange, multi=false, style={} }) {
  const [ed, setEd] = useState(false);
  const [loc, setLoc] = useState("");

  const open = useCallback(() => {
    setLoc(value||"");
    setEd(true);
  }, [value]);

  const commit = useCallback(() => {
    onChange(loc);
    setEd(false);
  }, [loc, onChange]);

  if (ed) {
    const s = {
      width:"100%", background:"rgba(255,255,200,.95)",
      border:"2px solid "+Gold, borderRadius:3,
      padding:"2px 6px", font:"inherit", fontSize:"inherit",
      color:"inherit", resize:multi?"vertical":"none",
      minHeight:multi?52:undefined,
      boxSizing:"border-box", outline:"none", ...style
    };
    if (multi) {
      return (
        <textarea autoFocus value={loc}
          onChange={e=>setLoc(e.target.value)}
          onBlur={commit} style={s}/>
      );
    }
    return (
      <input autoFocus value={loc}
        onChange={e=>setLoc(e.target.value)}
        onBlur={commit}
        onKeyDown={e=>{
          if(e.key==="Enter") commit();
          if(e.key==="Escape") setEd(false);
        }}
        style={s}/>
    );
  }

  return (
    <span onClick={open}
      style={{
        cursor:"text",
        display:multi?"block":"inline",
        borderBottom:"1.5px dashed transparent",
        transition:"border-color .15s",
        ...style,
      }}
      onMouseEnter={e=>e.currentTarget.style.borderBottomColor=Gold+"aa"}
      onMouseLeave={e=>e.currentTarget.style.borderBottomColor="transparent"}>
      {value||<span style={{opacity:.3, fontStyle:"italic"}}>...</span>}
    </span>
  );
}

function Notif({ msg }) {
  return (
    <div style={{
      position:"fixed", top:16, left:"50%",
      transform:"translateX(-50%)",
      background:Dark, color:Gold,
      padding:"10px 22px", borderRadius:20, zIndex:9999,
      fontWeight:700, fontSize:13,
      boxShadow:"0 4px 20px rgba(0,0,0,.3)",
      whiteSpace:"nowrap", pointerEvents:"none",
    }}>
      {msg}
    </div>
  );
}

function Shimmer() {
  return (
    <div style={{
      position:"absolute", inset:0,
      background:"rgba(255,255,255,.85)", zIndex:50,
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", gap:10,
    }}>
      <div style={{fontSize:22}}>*</div>
      <div style={{fontSize:12, fontWeight:700, color:Dark}}>
        Redaction en cours...
      </div>
    </div>
  );
}

function Sheet({ title, onClose, children }) {
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:2000,
      display:"flex", flexDirection:"column", justifyContent:"flex-end",
    }}>
      <div style={{position:"absolute", inset:0, background:"rgba(0,0,0,.5)"}}
        onClick={onClose}/>
      <div style={{
        position:"relative", background:"#fff",
        borderRadius:"20px 20px 0 0",
        maxHeight:"90vh", display:"flex", flexDirection:"column",
      }}>
        <div style={{
          display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"16px 20px 12px", borderBottom:"1px solid #f0f0f0", flexShrink:0,
        }}>
          <span style={{fontWeight:700, fontSize:15, color:Dark}}>{title}</span>
          <button onClick={onClose} style={{
            ...B({background:"#f0f0f0", borderRadius:"50%",
              width:30, height:30, fontSize:18, color:"#666"})
          }}>x</button>
        </div>
        <div style={{overflowY:"auto", padding:"14px 18px 48px", flex:1}}>
          {children}
        </div>
      </div>
    </div>
  );
}

function FR({ label, value, onChange, multi=false }) {
  return (
    <div style={{marginBottom:12}}>
      <label style={LBL}>{label}</label>
      {multi
        ? <textarea value={value} onChange={e=>onChange(e.target.value)}
            rows={3} style={{...IN(), resize:"vertical"}}/>
        : <input value={value} onChange={e=>onChange(e.target.value)}
            style={IN()}/>
      }
    </div>
  );
}

function SaveBtn({ onClose, T }) {
  return (
    <button onClick={onClose} style={{
      ...B({
        width:"100%", padding:13, borderRadius:12,
        background:Dark, color:Gold, fontWeight:700, fontSize:14, marginTop:6,
      })
    }}>
      {T.sh_save}
    </button>
  );
}

function MK(set) {
  return {
    u:  f=>v=>set(p=>({...p,[f]:v})),
    ux: (id,k,v)=>set(p=>({...p,
      experience:p.experience.map(e=>e.id===id?{...e,[k]:v}:e)})),
    ub: (id,i,v)=>set(p=>({...p,
      experience:p.experience.map(e=>e.id===id
        ?{...e,bullets:e.bullets.map((b,j)=>j===i?v:b)}:e)})),
    ue: (id,k,v)=>set(p=>({...p,
      education:p.education.map(e=>e.id===id?{...e,[k]:v}:e)})),
    us: (i,v)=>set(p=>({...p,skills:p.skills.map((s,j)=>j===i?v:s)})),
    ul: (i,k,v)=>set(p=>({...p,
      languages:p.languages.map((l,j)=>j===i?{...l,[k]:v}:l)})),
    uc: (i,v)=>set(p=>({...p,
      certifications:p.certifications.map((c,j)=>j===i?v:c)})),
  };
}

function SheetId({ cv, set, onClose, T }) {
  const { u } = MK(set);
  return (
    <Sheet title={T.edit_id} onClose={onClose}>
      <FR label={T.sh_name}  value={cv.name}     onChange={u("name")}/>
      <FR label={T.sh_title} value={cv.title}    onChange={u("title")}/>
      <FR label={T.sh_email} value={cv.email}    onChange={u("email")}/>
      <FR label={T.sh_phone} value={cv.phone}    onChange={u("phone")}/>
      <FR label={T.sh_loc}   value={cv.location} onChange={u("location")}/>
      <FR label={T.sh_li}    value={cv.linkedin} onChange={u("linkedin")}/>
      <FR label={T.sh_sum}   value={cv.summary}  onChange={u("summary")} multi/>
      <SaveBtn onClose={onClose} T={T}/>
    </Sheet>
  );
}

function SheetEx({ cv, set, onClose, apiKey, notify, T }) {
  const { ux, ub } = MK(set);
  const [imp, setImp] = useState(null);

  const ax = () => set(p=>({...p,
    experience:[...p.experience, {
      id:Date.now(), title:"", company:"", period:"", location:"", bullets:[""]
    }]
  }));
  const dx = id => set(p=>({...p,
    experience:p.experience.filter(e=>e.id!==id)
  }));
  const ab = id => set(p=>({...p,
    experience:p.experience.map(e=>e.id===id
      ?{...e,bullets:[...e.bullets,""]}:e)
  }));
  const db = (id,i) => set(p=>({...p,
    experience:p.experience.map(e=>e.id===id
      ?{...e,bullets:e.bullets.filter((_,j)=>j!==i)}:e)
  }));

  const improve = async (id, idx, text) => {
    if (!apiKey) { notify(T.nk); return; }
    if (!text.trim()) return;
    setImp(id+"-"+idx);
    try {
      const r = await aiCall(
        "Reformule ce bullet CV plus percutant chiffre max 15 mots meme langue: \""
        + text
        + "\". UNIQUEMENT la reformulation sans guillemets. Jamais de tirets cadratins.",
        apiKey
      );
      ub(id, idx, r.trim());
      notify(T.okb);
    } catch { notify(T.eb); }
    setImp(null);
  };

  return (
    <Sheet title={T.edit_ex} onClose={onClose}>
      {cv.experience.map((ex,i) => (
        <div key={ex.id} style={{
          background:"#f8f6f1", borderRadius:10, padding:14, marginBottom:14
        }}>
          <div style={{
            display:"flex", justifyContent:"space-between", marginBottom:10
          }}>
            <b style={{fontSize:13}}>{T.sh_et} {i+1}</b>
            <button onClick={()=>dx(ex.id)} style={{
              ...B({background:"#fee2e2", borderRadius:7,
                padding:"4px 10px", fontSize:12, color:"#dc2626", fontWeight:600})
            }}>{T.sh_del}</button>
          </div>
          <FR label={T.sh_et}   value={ex.title}    onChange={v=>ux(ex.id,"title",v)}/>
          <FR label={T.sh_ec}   value={ex.company}  onChange={v=>ux(ex.id,"company",v)}/>
          <FR label={T.sh_ep}   value={ex.period}   onChange={v=>ux(ex.id,"period",v)}/>
          <FR label={T.sh_ey}   value={ex.location} onChange={v=>ux(ex.id,"location",v)}/>
          <label style={LBL}>{T.sh_eb}</label>
          {ex.bullets.map((b,j) => (
            <div key={j} style={{
              display:"flex", gap:6, marginBottom:6, alignItems:"center"
            }}>
              <span style={{color:Gold}}>|</span>
              <input value={b} onChange={e=>ub(ex.id,j,e.target.value)}
                style={{...IN({padding:"7px 9px", fontSize:12, flex:1})}}/>
              <button
                onClick={()=>improve(ex.id,j,b)}
                disabled={imp===ex.id+"-"+j}
                style={{
                  ...B({
                    background:imp===ex.id+"-"+j?"#eee":"#fff9f0",
                    border:"1px solid "+Gold+"44",
                    borderRadius:5, padding:"4px 7px",
                    fontSize:11, color:Gold, flexShrink:0,
                  })
                }}>
                {imp===ex.id+"-"+j?"...":"*"}
              </button>
              <button onClick={()=>db(ex.id,j)} style={{
                ...B({color:"#e74c3c", fontSize:20, lineHeight:1,
                  padding:0, background:"none", flexShrink:0})
              }}>x</button>
            </div>
          ))}
          <button onClick={()=>ab(ex.id)} style={{
            ...B({fontSize:12, color:Gold, background:"none",
              border:"1px dashed "+Gold, borderRadius:5,
              padding:"4px 10px", marginTop:3})
          }}>{T.sh_addl}</button>
        </div>
      ))}
      <button onClick={ax} style={{
        ...B({width:"100%", padding:12, borderRadius:10,
          border:"2px dashed "+Gold, background:"#fff9f0",
          color:Gold, fontWeight:700, fontSize:13, marginBottom:10})
      }}>{T.sh_addex}</button>
      <SaveBtn onClose={onClose} T={T}/>
    </Sheet>
  );
}

function SheetEd({ cv, set, onClose, T }) {
  const { ue } = MK(set);
  const ae = () => set(p=>({...p,
    education:[...p.education, {id:Date.now(), degree:"", school:"", period:""}]
  }));
  const de = id => set(p=>({...p,
    education:p.education.filter(e=>e.id!==id)
  }));
  return (
    <Sheet title={T.edit_ed} onClose={onClose}>
      {cv.education.map((ed,i) => (
        <div key={ed.id} style={{
          background:"#f8f6f1", borderRadius:10, padding:14, marginBottom:14
        }}>
          <div style={{
            display:"flex", justifyContent:"space-between", marginBottom:10
          }}>
            <b style={{fontSize:13}}>{T.sh_edd} {i+1}</b>
            <button onClick={()=>de(ed.id)} style={{
              ...B({background:"#fee2e2", borderRadius:7,
                padding:"4px 10px", fontSize:12, color:"#dc2626", fontWeight:600})
            }}>{T.sh_del}</button>
          </div>
          <FR label={T.sh_edd} value={ed.degree} onChange={v=>ue(ed.id,"degree",v)}/>
          <FR label={T.sh_eds} value={ed.school} onChange={v=>ue(ed.id,"school",v)}/>
          <FR label={T.sh_ep}  value={ed.period} onChange={v=>ue(ed.id,"period",v)}/>
        </div>
      ))}
      <button onClick={ae} style={{
        ...B({width:"100%", padding:12, borderRadius:10,
          border:"2px dashed "+Gold, background:"#fff9f0",
          color:Gold, fontWeight:700, fontSize:13, marginBottom:10})
      }}>{T.sh_added}</button>
      <SaveBtn onClose={onClose} T={T}/>
    </Sheet>
  );
}

function SheetSk({ cv, set, onClose, T }) {
  const { us, ul, uc } = MK(set);
  const as = () => set(p=>({...p, skills:[...p.skills,""]}));
  const ds = i => set(p=>({...p, skills:p.skills.filter((_,j)=>j!==i)}));
  const al = () => set(p=>({...p,
    languages:[...p.languages, {lang:"", level:""}]
  }));
  const dl = i => set(p=>({...p,
    languages:p.languages.filter((_,j)=>j!==i)
  }));
  const ac = () => set(p=>({...p, certifications:[...p.certifications,""]}));
  const dc = i => set(p=>({...p,
    certifications:p.certifications.filter((_,j)=>j!==i)
  }));
  const X = ({fn}) => (
    <button onClick={fn} style={{
      ...B({color:"#e74c3c", fontSize:20, lineHeight:1,
        padding:0, background:"none", flexShrink:0})
    }}>x</button>
  );
  const Plus = ({fn, label}) => (
    <button onClick={fn} style={{
      ...B({fontSize:12, color:Gold, background:"none",
        border:"1px dashed "+Gold, borderRadius:5,
        padding:"4px 10px", marginBottom:4})
    }}>{label}</button>
  );
  return (
    <Sheet title={T.edit_sk} onClose={onClose}>
      <div style={SH()}>{T.sh_sk}</div>
      {cv.skills.map((s,i) => (
        <div key={i} style={{display:"flex", gap:7, marginBottom:7, alignItems:"center"}}>
          <input value={s} onChange={e=>us(i,e.target.value)} style={IN()}/>
          <X fn={()=>ds(i)}/>
        </div>
      ))}
      <Plus fn={as} label={T.sh_addsk}/>
      <div style={SH()}>{T.sh_lg}</div>
      {cv.languages.map((l,i) => (
        <div key={i} style={{display:"flex", gap:7, marginBottom:7, alignItems:"center"}}>
          <input value={l.lang} placeholder={T.sh_lph1}
            onChange={e=>ul(i,"lang",e.target.value)}
            style={{...IN({flex:1})}}/>
          <input value={l.level} placeholder={T.sh_lph2}
            onChange={e=>ul(i,"level",e.target.value)}
            style={{...IN({flex:1})}}/>
          <X fn={()=>dl(i)}/>
        </div>
      ))}
      <Plus fn={al} label={T.sh_addlg}/>
      <div style={SH()}>{T.sh_ct}</div>
      {cv.certifications.map((c,i) => (
        <div key={i} style={{display:"flex", gap:7, marginBottom:7, alignItems:"center"}}>
          <input value={c} onChange={e=>uc(i,e.target.value)} style={IN()}/>
          <X fn={()=>dc(i)}/>
        </div>
      ))}
      <Plus fn={ac} label={T.sh_addct}/>
      <div style={{marginTop:10}}>
        <SaveBtn onClose={onClose} T={T}/>
      </div>
    </Sheet>
  );
}

function CVSidebar({ cv, set, t, T }) {
  const { u, ux, ub, ue, us, ul, uc } = MK(set);
  const SS = l => (
    <div style={{
      fontSize:8, fontWeight:700, letterSpacing:3, textTransform:"uppercase",
      color:t.ac, margin:"14px 0 7px",
      borderBottom:"1px solid "+t.ac+"44", paddingBottom:3,
    }}>{l}</div>
  );
  const MS = l => (
    <div style={{
      fontSize:9, fontWeight:700, letterSpacing:2.5, textTransform:"uppercase",
      color:t.ac, margin:"16px 0 9px",
      borderBottom:"2px solid "+t.ac, paddingBottom:3,
    }}>{l}</div>
  );
  return (
    <div style={{display:"flex", minHeight:"100%", fontFamily:t.bf, background:t.bg}}>
      <div style={{
        width:185, background:t.sb, color:t.st,
        padding:"22px 15px", flexShrink:0, minHeight:"100%",
      }}>
        <div style={{
          width:52, height:52, borderRadius:"50%",
          background:t.ac+"33", border:"2px solid "+t.ac,
          margin:"0 auto 12px",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:19, fontFamily:t.hf, fontWeight:700, color:t.ac,
        }}>
          {cv.name ? cv.name.charAt(0) : "?"}
        </div>
        {SS(T.cv_ct)}
        {["email","phone","location","linkedin"].map(f => (
          <div key={f} style={{marginBottom:4}}>
            <E value={cv[f]} onChange={u(f)}
              style={{color:t.st, fontSize:9, lineHeight:1.5}}/>
          </div>
        ))}
        {SS(T.cv_s)}
        {cv.skills.map((s,i) => (
          <div key={i} style={{
            display:"flex", gap:4, marginBottom:3, alignItems:"flex-start"
          }}>
            <span style={{color:t.ac, fontSize:8, flexShrink:0, marginTop:2}}>|</span>
            <E value={s} onChange={v=>us(i,v)}
              style={{color:t.st, fontSize:9}}/>
          </div>
        ))}
        {SS(T.cv_l)}
        {cv.languages.map((l,i) => (
          <div key={i} style={{marginBottom:4}}>
            <E value={l.lang} onChange={v=>ul(i,"lang",v)}
              style={{color:t.st, fontWeight:600, fontSize:9, display:"block"}}/>
            <E value={l.level} onChange={v=>ul(i,"level",v)}
              style={{color:t.st+"88", fontSize:8, display:"block"}}/>
          </div>
        ))}
        {SS(T.cv_c)}
        {cv.certifications.map((c,i) => (
          <div key={i} style={{fontSize:8, marginBottom:3, lineHeight:1.4}}>
            <span style={{color:t.ac}}>v </span>
            <E value={c} onChange={v=>uc(i,v)}
              style={{color:t.st, fontSize:8}}/>
          </div>
        ))}
      </div>
      <div style={{flex:1, padding:"22px 24px"}}>
        <div style={{
          fontFamily:t.hf, fontSize:21, fontWeight:700,
          color:t.pr, lineHeight:1.1, marginBottom:2,
        }}>
          <E value={cv.name} onChange={u("name")}
            style={{fontFamily:t.hf, fontSize:21, fontWeight:700, color:t.pr}}/>
        </div>
        <div style={{
          fontSize:10, color:t.ac, fontWeight:600,
          letterSpacing:1.5, textTransform:"uppercase",
        }}>
          <E value={cv.title} onChange={u("title")}
            style={{color:t.ac, fontSize:10}}/>
        </div>
        {MS(T.cv_p)}
        <E value={cv.summary} onChange={u("summary")} multi
          style={{fontSize:10, color:"#555", lineHeight:1.7}}/>
        {MS(T.cv_e)}
        {cv.experience.map(ex => (
          <div key={ex.id} style={{marginBottom:12}}>
            <div style={{display:"flex", justifyContent:"space-between", gap:8}}>
              <div>
                <div style={{fontWeight:700, fontSize:11, color:t.pr}}>
                  <E value={ex.title} onChange={v=>ux(ex.id,"title",v)}
                    style={{fontWeight:700, fontSize:11, color:t.pr}}/>
                </div>
                <div style={{fontSize:9.5, color:t.ac, fontWeight:600}}>
                  <E value={ex.company} onChange={v=>ux(ex.id,"company",v)}
                    style={{fontSize:9.5, color:t.ac}}/>
                  {" - "}
                  <E value={ex.location} onChange={v=>ux(ex.id,"location",v)}
                    style={{fontSize:9.5, color:"#888"}}/>
                </div>
              </div>
              <div style={{fontSize:8.5, color:"#aaa", flexShrink:0}}>
                <E value={ex.period} onChange={v=>ux(ex.id,"period",v)}
                  style={{fontSize:8.5, color:"#aaa"}}/>
              </div>
            </div>
            <ul style={{margin:"3px 0 0 12px", padding:0}}>
              {ex.bullets.map((b,i) => (
                <li key={i} style={{fontSize:9.5, color:"#444", marginBottom:2, lineHeight:1.5}}>
                  <E value={b} onChange={v=>ub(ex.id,i,v)} style={{fontSize:9.5}}/>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {MS(T.cv_ed)}
        {cv.education.map(ed => (
          <div key={ed.id} style={{
            marginBottom:7, display:"flex",
            justifyContent:"space-between", gap:8,
          }}>
            <div>
              <div style={{fontWeight:700, fontSize:10, color:t.pr}}>
                <E value={ed.degree} onChange={v=>ue(ed.id,"degree",v)}
                  style={{fontWeight:700, fontSize:10}}/>
              </div>
              <div style={{fontSize:9, color:"#777"}}>
                <E value={ed.school} onChange={v=>ue(ed.id,"school",v)}
                  style={{fontSize:9}}/>
              </div>
            </div>
            <div style={{fontSize:8.5, color:"#aaa", flexShrink:0}}>
              <E value={ed.period} onChange={v=>ue(ed.id,"period",v)}
                style={{fontSize:8.5}}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function CVAts({ cv, set, T }) {
  const { u, ux, ub, ue, us, ul, uc } = MK(set);
  const S = l => (
    <div style={{
      fontWeight:700, fontSize:11, color:"#000",
      borderBottom:"1.5px solid #000",
      paddingBottom:3, marginBottom:8, marginTop:16,
      letterSpacing:.5, textTransform:"uppercase",
    }}>{l}</div>
  );
  return (
    <div style={{
      fontFamily:"Arial,sans-serif", background:"#fff",
      padding:"28px 36px", color:"#111",
    }}>
      <div style={{marginBottom:12, paddingBottom:10, borderBottom:"2px solid #000"}}>
        <div style={{fontSize:20, fontWeight:700}}>
          <E value={cv.name} onChange={u("name")} style={{fontSize:20, fontWeight:700}}/>
        </div>
        <div style={{fontSize:11, fontWeight:600, color:"#333", marginTop:2}}>
          <E value={cv.title} onChange={u("title")}/>
        </div>
        <div style={{
          fontSize:9.5, color:"#444", marginTop:5,
          display:"flex", gap:12, flexWrap:"wrap",
        }}>
          {["email","phone","location","linkedin"].map(f => (
            <span key={f}>
              <E value={cv[f]} onChange={u(f)} style={{fontSize:9.5}}/>
            </span>
          ))}
        </div>
      </div>
      {S(T.cv_p)}
      <p style={{fontSize:10, color:"#222", lineHeight:1.7, margin:"0 0 3px"}}>
        <E value={cv.summary} onChange={u("summary")} multi style={{fontSize:10}}/>
      </p>
      {S(T.cv_el)}
      {cv.experience.map(ex => (
        <div key={ex.id} style={{marginBottom:12}}>
          <div style={{display:"flex", justifyContent:"space-between"}}>
            <div style={{fontWeight:700, fontSize:11}}>
              <E value={ex.title} onChange={v=>ux(ex.id,"title",v)}
                style={{fontWeight:700, fontSize:11}}/>
            </div>
            <div style={{fontSize:9.5, color:"#555"}}>
              <E value={ex.period} onChange={v=>ux(ex.id,"period",v)}
                style={{fontSize:9.5}}/>
            </div>
          </div>
          <div style={{fontSize:10, fontStyle:"italic", color:"#444", marginBottom:2}}>
            <E value={ex.company} onChange={v=>ux(ex.id,"company",v)}/>
            {" - "}
            <E value={ex.location} onChange={v=>ux(ex.id,"location",v)}/>
          </div>
          <ul style={{margin:"0 0 0 14px", padding:0}}>
            {ex.bullets.map((b,i) => (
              <li key={i} style={{fontSize:10, color:"#222", marginBottom:2, lineHeight:1.5}}>
                <E value={b} onChange={v=>ub(ex.id,i,v)} style={{fontSize:10}}/>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {S(T.cv_ed)}
      {cv.education.map(ed => (
        <div key={ed.id} style={{
          marginBottom:7, display:"flex", justifyContent:"space-between",
        }}>
          <div>
            <div style={{fontWeight:700, fontSize:10.5}}>
              <E value={ed.degree} onChange={v=>ue(ed.id,"degree",v)}
                style={{fontWeight:700, fontSize:10.5}}/>
            </div>
            <div style={{fontSize:9.5, color:"#555"}}>
              <E value={ed.school} onChange={v=>ue(ed.id,"school",v)}/>
            </div>
          </div>
          <div style={{fontSize:9.5, color:"#555"}}>
            <E value={ed.period} onChange={v=>ue(ed.id,"period",v)}
              style={{fontSize:9.5}}/>
          </div>
        </div>
      ))}
      {S(T.cv_s)}
      <p style={{fontSize:10, margin:0, lineHeight:1.7, color:"#222"}}>
        {cv.skills.map((s,i) => (
          <span key={i}>
            <E value={s} onChange={v=>us(i,v)} style={{fontSize:10}}/>
            {i < cv.skills.length-1
              ? <span style={{color:"#888"}}> | </span>
              : null}
          </span>
        ))}
      </p>
      {S(T.cv_l)}
      {cv.languages.map((l,i) => (
        <div key={i} style={{fontSize:10, marginBottom:2}}>
          <E value={l.lang} onChange={v=>ul(i,"lang",v)}
            style={{fontWeight:600, fontSize:10}}/>
          {" : "}
          <E value={l.level} onChange={v=>ul(i,"level",v)} style={{fontSize:10}}/>
        </div>
      ))}
      {cv.certifications.filter(c=>c).length > 0 && (
        <>
          {S(T.cv_c)}
          {cv.certifications.map((c,i) => (
            <div key={i} style={{fontSize:10, marginBottom:2}}>
              {"- "}
              <E value={c} onChange={v=>uc(i,v)} style={{fontSize:10}}/>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function AIPanel({ onGen, loading, apiKey, T }) {
  const [job, setJob]   = useState("");
  const [sec, setSec]   = useState(0);
  const [yrs, setYrs]   = useState("");
  const [tone, setTone] = useState("p");
  const [lang, setLang] = useState("fr");
  const [parc, setParc] = useState("");
  const [offre, setOffre] = useState("");

  const Ch = ({v, cur, set, l}) => (
    <button onClick={()=>set(v)} style={{
      ...B({
        padding:"8px 5px", borderRadius:7,
        border:cur===v?"2px solid "+Gold:"1px solid #e0e0e0",
        background:cur===v?"#fff9f0":"#f8f8f8",
        fontWeight:cur===v?700:400, fontSize:11, color:"#333", flex:1,
      })
    }}>{l}</button>
  );

  const go = () => {
    const s = T.ai_secs[sec];
    const tStr = tone==="p"
      ? "elegant percutant chiffre"
      : tone==="c" ? "creatif differenciants" : "sobre factuel";
    let p = "Expert CV. Poste:"+job+" Secteur:"+s+" Exp:"+yrs+" Ton:"+tStr
      +" Langue:"+(lang==="fr"?"Francais":"Anglais");
    if(parc.trim())p+=" Parcours:"+parc;
    if(offre.trim())p+=" Offre:"+offre;
    p+=" JSON uniquement sans markdown:"
      +'{"name":"","title":"","email":"","phone":"","location":"",'
      +'"linkedin":"","summary":"","experience":[{"id":1,"title":"","company":"",'
      +'"period":"","location":"","bullets":["","",""]}],'
      +'"education":[{"id":1,"degree":"","school":"","period":""}],'
      +'"skills":["","","","","","","",""],'
      +'"languages":[{"lang":"","level":""}],"certifications":[""]}'
      +" 3 exps chiffrees 2 formations 8 competences. Pas de tirets cadratins.";
    onGen(p);
  };

  return (
    <div>
      {!apiKey && (
        <div style={{
          background:"#fff3cd", border:"1px solid #ffc107",
          borderRadius:9, padding:"9px 13px", marginBottom:12,
          fontSize:12, color:"#664d03",
        }}>
          {T.ai_nk}
        </div>
      )}
      <label style={LBL}>{T.ai_job}</label>
      <input value={job} onChange={e=>setJob(e.target.value)}
        placeholder={T.ai_jph} style={{...IN({marginBottom:12})}}/>
      <label style={LBL}>{T.ai_sec}</label>
      <select value={sec} onChange={e=>setSec(Number(e.target.value))}
        style={{...IN({marginBottom:12})}}>
        {T.ai_secs.map((s,i) => <option key={i} value={i}>{s}</option>)}
      </select>
      <label style={LBL}>{T.ai_yrs}</label>
      <input value={yrs} onChange={e=>setYrs(e.target.value)}
        placeholder="ex: 12" style={{...IN({marginBottom:12})}}/>
      <label style={LBL}>{T.ai_tone}</label>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:5, marginBottom:12}}>
        <Ch v="p" cur={tone} set={setTone} l={T.ai_tp}/>
        <Ch v="c" cur={tone} set={setTone} l={T.ai_tc}/>
        <Ch v="k" cur={tone} set={setTone} l={T.ai_tk}/>
      </div>
      <label style={LBL}>{T.ai_lang}</label>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:5, marginBottom:12}}>
        <Ch v="fr" cur={lang} set={setLang} l="Francais"/>
        <Ch v="en" cur={lang} set={setLang} l="English"/>
      </div>
      <label style={LBL}>{T.ai_parc}</label>
      <textarea value={parc} onChange={e=>setParc(e.target.value)}
        rows={3} style={{...IN({resize:"vertical", marginBottom:12})}}/>
      <label style={LBL}>{T.ai_off}</label>
      <textarea value={offre} onChange={e=>setOffre(e.target.value)}
        rows={3} style={{...IN({resize:"vertical", marginBottom:18})}}/>
      <button onClick={go} disabled={loading||!apiKey} style={{
        ...B({
          width:"100%", padding:13, borderRadius:11,
          background:loading||!apiKey
            ? "#ccc"
            : "linear-gradient(135deg,"+Dark+","+Gold+")",
          color:"#fff", fontWeight:800, fontSize:14,
        })
      }}>
        {loading ? T.ai_gen : T.ai_btn}
      </button>
    </div>
  );
}

function AdjustPanel({ cv, setCVFn, notify, apiKey, T }) {
  const [inst, setInst]     = useState("");
  const [load, setLoad]     = useState(false);
  const [hist, setHist]     = useState([]);
  const [raw, setRaw]       = useState("");
  const [impOpen, setImpOpen] = useState(false);
  const [imping, setImping] = useState(false);

  const adjust = async () => {
    if (!inst.trim()) { notify(T.ni); return; }
    if (!apiKey) { notify(T.nk); return; }
    setLoad(true);
    setHist(h => [...h.slice(-4), cv]);
    const p = "Expert CV. JSON recu + instruction."
      + " Reponds UNIQUEMENT JSON valide strict sans markdown.\n"
      + "REGLES: preserve structure JSON exacte, IDs,"
      + " jamais inventer experiences/diplomes,"
      + " garde langue origine sauf traduction demandee."
      + " Jamais tirets cadratins, utilise uniquement -.\n\n"
      + "CV:\n" + JSON.stringify(cv, null, 2)
      + "\n\nINSTRUCTION: \"" + inst + "\""
      + "\n\nRetourne UNIQUEMENT le JSON modifie.";
    try {
      const txt = await aiCall(p);
      const nCV = parseJSON(txt);
      setCVFn(() => nCV);
      setInst("");
      notify(T.okadj);
    } catch { notify(T.ea); }
    setLoad(false);
  };

  const undoL = () => {
    if (!hist.length) { notify(T.nu); return; }
    setCVFn(() => hist[hist.length-1]);
    setHist(h => h.slice(0,-1));
    notify(T.au);
  };

  const importRaw = async () => {
    if (!raw.trim()) { notify(T.np2); return; }
    if (!apiKey) { notify(T.nk); return; }
    setImping(true);
    const p = "Expert parsing CV. JSON valide strict sans markdown.\n"
      + 'STRUCTURE:{"name":"","title":"","email":"","phone":"",'
      + '"location":"","linkedin":"","summary":"",'
      + '"experience":[{"id":1,"title":"","company":"","period":"",'
      + '"location":"","bullets":["",""]}],'
      + '"education":[{"id":1,"degree":"","school":"","period":""}],'
      + '"skills":[""],"languages":[{"lang":"","level":""}],'
      + '"certifications":[""]}\n'
      + "REGLES:toutes experiences, IDs depuis 1, vide si absent."
      + " Jamais tirets cadratins. UNIQUEMENT JSON.\nCV:\n" + raw;
    try {
      const txt = await aiCall(p);
      const parsed = parseJSON(txt);
      setCVFn(() => normCV(parsed));
      setRaw("");
      setImpOpen(false);
      notify(T.okimp);
    } catch { notify(T.ep); }
    setImping(false);
  };

  return (
    <div>
      {!apiKey && (
        <div style={{
          background:"#fff3cd", border:"1px solid #ffc107",
          borderRadius:9, padding:"9px 13px", marginBottom:12,
          fontSize:12, color:"#664d03",
        }}>
          {T.nk}
        </div>
      )}
      <button onClick={()=>setImpOpen(p=>!p)} style={{
        ...B({
          width:"100%", padding:"10px 13px", borderRadius:9,
          border:"2px dashed "+Gold,
          background:impOpen?"#fff9f0":"#fff",
          color:Gold, fontWeight:700, fontSize:13,
          marginBottom:impOpen?0:14,
          display:"flex", alignItems:"center", justifyContent:"space-between",
        })
      }}>
        <span>{T.adj_imp}</span>
        <span>{impOpen?"^":"v"}</span>
      </button>
      {impOpen && (
        <div style={{
          background:"#fff9f0",
          border:"1px solid "+Gold+"44",
          borderRadius:"0 0 9px 9px",
          padding:"12px 13px 14px", marginBottom:14,
        }}>
          <textarea value={raw} onChange={e=>setRaw(e.target.value)}
            placeholder={T.ob_paste} rows={7}
            style={{...IN({resize:"vertical", marginBottom:10, fontSize:12, lineHeight:1.6})}}/>
          <div style={{display:"flex", gap:7}}>
            <button onClick={importRaw}
              disabled={imping||!raw.trim()||!apiKey}
              style={{
                ...B({
                  flex:1, padding:"10px", borderRadius:8,
                  background:imping||!raw.trim()||!apiKey
                    ? "#ccc"
                    : "linear-gradient(135deg,"+Dark+","+Gold+")",
                  color:"#fff", fontWeight:700, fontSize:13,
                })
              }}>
              {imping ? T.ob_parsing : T.adj_par}
            </button>
            <button onClick={()=>{setRaw("");setImpOpen(false);}} style={{
              ...B({padding:"10px 13px", borderRadius:8,
                background:"#f0f0f0", color:"#666", fontSize:13})
            }}>{T.adj_can}</button>
          </div>
        </div>
      )}
      <div style={SH({marginTop:impOpen?14:0})}>{T.adj_sec}</div>
      <label style={LBL}>{T.adj_inst}</label>
      <textarea value={inst} onChange={e=>setInst(e.target.value)}
        placeholder={T.adj_ph} rows={4}
        style={{...IN({resize:"vertical", marginBottom:10})}}/>
      <button onClick={adjust} disabled={load||!inst.trim()||!apiKey} style={{
        ...B({
          width:"100%", padding:13, borderRadius:11,
          background:load||!inst.trim()||!apiKey
            ? "#ccc"
            : "linear-gradient(135deg,"+Dark+","+Gold+")",
          color:"#fff", fontWeight:800, fontSize:14, marginBottom:7,
        })
      }}>
        {load ? T.adj_ld : T.adj_btn}
      </button>
      {hist.length > 0 && (
        <button onClick={undoL} style={{
          ...B({
            width:"100%", padding:10, borderRadius:9,
            background:"#f0f0f0", color:"#666",
            fontWeight:600, fontSize:13, marginBottom:14,
          })
        }}>{T.adj_undo} ({hist.length})</button>
      )}
      <div style={SH()}>{T.adj_sugg}</div>
      {T.adj_pre.map((p,i) => (
        <button key={i} onClick={()=>setInst(p)} style={{
          ...B({
            width:"100%", padding:"9px 11px", borderRadius:7,
            border:"1px solid #e8e4dc", background:"#fafafa",
            textAlign:"left", fontSize:12, color:"#555",
            marginBottom:5, lineHeight:1.4,
          })
        }}>{p}</button>
      ))}
      <div style={{
        marginTop:12, padding:11, background:"#f8f6f1",
        borderRadius:8, fontSize:11, color:"#888", lineHeight:1.6,
      }}>
        {T.adj_tip}
      </div>
    </div>
  );
}

function MatchPanel({ cv, setCVFn, notify, apiKey, T }) {
  const [offer, setOffer] = useState("");
  const [load, setLoad]   = useState(false);
  const [res, setRes]     = useState(null);
  const [ph, setPh]       = useState("input");

  const analyze = async () => {
    if (!offer.trim()) { notify("Colle une offre d'abord"); return; }
    if (!apiKey) { notify(T.nk); return; }
    setLoad(true);
    setPh("loading");
    const expT = cv.experience.map(e =>
      e.title + " chez " + e.company
      + " (" + e.period + "): "
      + e.bullets.filter(b=>b).join("; ")
    ).join(" | ");
    const cvT = "Profil: " + cv.name + " - " + cv.title
      + "\nAcrroche: " + cv.summary
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
    const p = "Expert recrutement. Reecris ce CV pour l'offre fournie.\n"
      +"OFFRE:\n"+offer+"\nCV:\n"+cvT+"\n"
      +"REGLES: ne pas inventer, adapter mots-cles offre, pas de tirets cadratins.\n"
      +'JSON uniquement: {"match_score":75,"job_title":"","company":"",'
      +'"key_requirements":["r1","r2","r3"],"keywords_matched":["k1","k2"],'
      +'"keywords_to_add":["k1","k2"],"cover_letter_hook":"accroche",'
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
    } catch { notify(T.ea); setPh("input"); }
    setLoad(false);
  };

  const apply = () => {
    if (!res || !res.cv_optimized) return;
    setCVFn(() => normCV(res.cv_optimized, cv));
    notify("CV adapte applique!");
    setPh("input");
    setRes(null);
    setOffer("");
  };

  const sc = function(s) { if (s >= 80) return "#16a34a"; if (s >= 65) return "#ca8a04"; if (s >= 50) return "#ea580c"; return "#dc2626"; };

  if (ph === "loading") {
    return (
      <div style={{textAlign:"center", padding:"36px 20px"}}>
        <div style={{fontSize:28, marginBottom:10}}>{">"}</div>
        <div style={{fontSize:14, fontWeight:700, color:Dark, marginBottom:6}}>
          Analyse en cours...
        </div>
        <div style={{fontSize:12, color:"#888"}}>
          L'IA adapte ton CV pour matcher parfaitement.
        </div>
      </div>
    );
  }

  if (ph === "done" && res) {
    return (
      <div>
        <div style={{
          display:"flex", alignItems:"center", gap:14,
          background:"#f8f6f1", borderRadius:11,
          padding:"14px 18px", marginBottom:12,
        }}>
          <div style={{textAlign:"center", flexShrink:0}}>
            <div style={{
              fontSize:34, fontWeight:900,
              color:sc(res.match_score), lineHeight:1,
            }}>
              {res.match_score}
            </div>
            <div style={{fontSize:9, color:"#888", fontWeight:600, letterSpacing:1}}>
              Match
            </div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:13, fontWeight:700, color:Dark, marginBottom:4}}>
              {res.job_title}{res.company?" - "+res.company:""}
            </div>
            <div style={{width:"100%", height:5, borderRadius:3, background:"#eee"}}>
              <div style={{
                width:res.match_score+"%", height:"100%",
                borderRadius:3, background:sc(res.match_score),
              }}/>
            </div>
          </div>
        </div>
        {(res.key_requirements||[]).length > 0 && (
          <div style={{
            background:"#f0f4ff", borderRadius:9,
            padding:"10px 13px", marginBottom:10,
          }}>
            <div style={{fontSize:10, fontWeight:700, color:"#4338ca", marginBottom:6}}>
              Requirements cles
            </div>
            {(res.key_requirements||[]).map((r,i) => (
              <div key={i} style={{fontSize:12, color:"#333", marginBottom:3}}>
                {"* "}{r}
              </div>
            ))}
          </div>
        )}
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:10}}>
          {(res.keywords_matched||[]).length > 0 && (
            <div style={{background:"#f0fff4", borderRadius:9, padding:"9px 11px"}}>
              <div style={{fontSize:9, fontWeight:700, color:"#16a34a", marginBottom:5}}>
                Presents
              </div>
              <div style={{display:"flex", flexWrap:"wrap", gap:3}}>
                {(res.keywords_matched||[]).map((k,i) => (
                  <span key={i} style={{
                    background:"#dcfce7", color:"#16a34a",
                    borderRadius:3, padding:"2px 5px", fontSize:9,
                  }}>{k}</span>
                ))}
              </div>
            </div>
          )}
          {(res.keywords_to_add||[]).length > 0 && (
            <div style={{background:"#fff9f0", borderRadius:9, padding:"9px 11px"}}>
              <div style={{fontSize:9, fontWeight:700, color:Gold, marginBottom:5}}>
                Ajoutes
              </div>
              <div style={{display:"flex", flexWrap:"wrap", gap:3}}>
                {(res.keywords_to_add||[]).map((k,i) => (
                  <span key={i} style={{
                    background:"#fff3cd", color:"#92400e",
                    borderRadius:3, padding:"2px 5px", fontSize:9,
                  }}>{k}</span>
                ))}
              </div>
            </div>
          )}
        </div>
        {res.cover_letter_hook && (
          <div style={{
            background:Gold+"15",
            border:"1px solid "+Gold+"44",
            borderRadius:9, padding:"10px 13px", marginBottom:12,
          }}>
            <div style={{fontSize:10, fontWeight:700, color:Gold, marginBottom:5}}>
              Accroche lettre de motivation
            </div>
            <div style={{fontSize:12, color:"#555", lineHeight:1.6, fontStyle:"italic"}}>
              "{res.cover_letter_hook}"
            </div>
          </div>
        )}
        <button onClick={apply} style={{
          ...B({
            width:"100%", padding:13, borderRadius:11,
            background:"linear-gradient(135deg,#7c3aed,"+Gold+")",
            color:"#fff", fontWeight:800, fontSize:14, marginBottom:8,
          })
        }}>
          Appliquer ce CV adapte
        </button>
        <button onClick={()=>{setPh("input");setRes(null);}} style={{
          ...B({
            width:"100%", padding:10, borderRadius:9,
            background:"#f0f0f0", color:"#666", fontWeight:600, fontSize:13,
          })
        }}>
          Nouvelle offre
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        background:Gold+"15", border:"1px solid "+Gold+"44",
        borderRadius:9, padding:"11px 13px", marginBottom:14,
      }}>
        <div style={{fontSize:13, fontWeight:700, color:Dark, marginBottom:3}}>
          CV sur mesure pour une offre
        </div>
        <div style={{fontSize:12, color:"#666", lineHeight:1.6}}>
          Colle l'offre - l'IA adapte ton CV existant sans rien inventer.
        </div>
      </div>
      {!cv.name && !cv.summary && (
        <div style={{
          background:"#fff3cd", border:"1px solid #ffc107",
          borderRadius:8, padding:"9px 12px", marginBottom:10,
          fontSize:12, color:"#664d03",
        }}>
          Ton CV est vide - importe ou genere un CV d'abord.
        </div>
      )}
      <label style={LBL}>Offre d'emploi</label>
      <textarea value={offer} onChange={e=>setOffer(e.target.value)}
        placeholder={"Colle l'offre d'emploi complete ici:\n- Intitule du poste\n- Missions\n- Profil recherche\n- Competences requises"}
        rows={11}
        style={{...IN({resize:"vertical", marginBottom:14, fontSize:12, lineHeight:1.7})}}/>
      <button onClick={analyze}
        disabled={load||!apiKey||!offer.trim()}
        style={{
          ...B({
            width:"100%", padding:13, borderRadius:11,
            background:load||!apiKey||!offer.trim()
              ? "#ccc"
              : "linear-gradient(135deg,#7c3aed,"+Gold+")",
            color:"#fff", fontWeight:800, fontSize:14,
          })
        }}>
        Adapter mon CV a cette offre
      </button>
      {!apiKey && (
        <div style={{fontSize:11, color:"#888", textAlign:"center", marginTop:7}}>
          Cle API requise dans Outils
        </div>
      )}
    </div>
  );
}

function ScorePanel({ cv, apiKey, notify, layout, T }) {
  const [res, setRes]   = useState(null);
  const [load, setLoad] = useState(false);
  const [offer, setOffer] = useState("");
  const [mode, setMode] = useState("local");

  const scoreLocal = () => {
    const C=[], add=(cat,label,ok,tip,w=1)=>{C.push({cat,label,ok,tip,w});};
    const sl=cv.summary.trim().length;
    add("Contact","Nom",!!cv.name.trim(),"Nom requis");
    add("Contact","Titre",!!cv.title.trim(),"Titre requis");
    add("Contact","Email",!!cv.email.trim(),"Email requis");
    add("Contact","Tel",!!cv.phone.trim(),"Tel requis");
    add("Contact","Location",!!cv.location.trim(),"Ville requise");
    add("Contact","LinkedIn",!!cv.linkedin.trim(),"LinkedIn recommande");
    add("Accroche","Presente",sl>0,"Accroche indispensable");
    add("Accroche","Longueur ok",sl>100&&sl<600,"Vise 3-4 phrases");
    add("Accroche","Chiffres",cv.summary.split("").some(c=>c>="0"&&c<="9"),"Ajoute des chiffres");
    const exps=cv.experience.filter(e=>e.title||e.company);
    add("Experience","Presente",exps.length>=1,"Aucune experience");
    add("Experience","Periodes",exps.length>0&&exps.every(e=>e.period.trim()),"Periodes requises");
    add("Experience","Bullets chiffres",exps.some(e=>e.bullets.some(b=>b.split("").some(c=>c>="0"&&c<="9"))),"Ajoute des chiffres");
    add("Experience","Volume",exps.reduce((s,e)=>s+e.bullets.filter(b=>b.trim()).length,0)>=6,"Min 6 bullets");
    const sk=cv.skills.filter(s=>s.trim());
    add("Competences","Min 5",sk.length>=5,"Vise 6-10");
    add("Competences","Min 8",sk.length>=8,"ATS filtrent sur mots-cles");
    add("Langues","Presente",cv.languages.filter(l=>l.lang.trim()).length>=1,"Section vide");
    add("Certifications","Presente",cv.certifications.filter(c=>c.trim()).length>=1,"Valorise le profil");
    add("Format ATS","ATS-Safe",layout==="ats","Passe en ATS-Safe",2);
    const tot=C.filter(c=>c.ok).reduce((s,c)=>s+c.w,0);
    const maxPts=C.reduce((s,c)=>s+c.w,0);
    const score=Math.round((tot/maxPts)*100);
    const bycat={};
    C.forEach(c=>{
      if(!bycat[c.cat])bycat[c.cat]={ok:0,tot:0,checks:[]};
      bycat[c.cat].ok+=c.ok?c.w:0;bycat[c.cat].tot+=c.w;bycat[c.cat].checks.push(c);
    });
    return {score,checks:C,bycat,mode:"local"};
  };

  const scoreAI = async () => {
    if (!apiKey) { notify(T.nk); return; }
    setLoad(true);
    const expT = cv.experience.map(e=>
      e.title+" chez "+e.company+": "+e.bullets.filter(b=>b).join("; ")
    ).join(" | ");
    const cvT = "Nom: "+cv.name+"\nTitre: "+cv.title
      +"\nAccroche: "+cv.summary
      +"\nExps: "+expT
      +"\nSkills: "+cv.skills.filter(s=>s).join(", ");
    const offerPart = offer ? "OFFRE:\n"+offer+"\n\n" : "";
    const p = "Expert recruteur ATS. Analyse ce CV"+(offer?" vs offre fournie":"")+"."
      +"\nCV: "+cvT
      +(offer?"\nOFFRE:\n"+offer:"")
      +"\nJSON uniquement: "
      +'{"recruiter_score":75,"ats_score":70,'
      +'"recruiter_grade":"B+","ats_grade":"B",'
      +'"strengths":["f1","f2","f3"],'
      +'"critical_fixes":["c1","c2","c3"],'
      +'"ats_keywords_missing":["k1","k2"],'
      +'"ats_keywords_present":["k1","k2"]}';
    try {
      const txt = await aiCall(p);
      const r = parseJSON(txt);
      const local = scoreLocal();
      setRes({...local, ai:r, mode:"ai"});
    } catch { notify(T.ea); }
    setLoad(false);
  };

  const sc = function(s) { if (s >= 80) return "#16a34a"; if (s >= 65) return "#ca8a04"; if (s >= 50) return "#ea580c"; return "#dc2626"; };

  return (
    <div>
      <div style={{
        display:"flex", gap:5, marginBottom:14,
        background:"#f0ede5", padding:4, borderRadius:9,
      }}>
        <button onClick={()=>setMode("local")} style={{
          ...B({
            flex:1, padding:"7px 8px", borderRadius:7,
            background:mode==="local"?"#fff":"transparent",
            color:mode==="local"?Dark:"#888",
            fontWeight:mode==="local"?700:500, fontSize:12, textAlign:"center",
          })
        }}>Score rapide</button>
        <button onClick={()=>setMode("ai")} style={{
          ...B({
            flex:1, padding:"7px 8px", borderRadius:7,
            background:mode==="ai"?"#fff":"transparent",
            color:mode==="ai"?Dark:"#888",
            fontWeight:mode==="ai"?700:500, fontSize:12, textAlign:"center",
          })
        }}>Score IA</button>
      </div>

      {mode==="ai" && (
        <>
          <label style={LBL}>Offre d'emploi (optionnel)</label>
          <textarea value={offer} onChange={e=>setOffer(e.target.value)}
            placeholder="Colle l'offre pour score ATS precis..." rows={4}
            style={{...IN({resize:"vertical", marginBottom:10})}}/>
          <button onClick={scoreAI} disabled={load||!apiKey} style={{
            ...B({
              width:"100%", padding:12, borderRadius:11,
              background:load||!apiKey?"#ccc":"linear-gradient(135deg,#0f3460,#e94560)",
              color:"#fff", fontWeight:700, fontSize:14, marginBottom:6,
            })
          }}>
            {load ? "Analyse..." : "Analyser avec l'IA"}
          </button>
          {!apiKey && (
            <div style={{fontSize:11,color:"#888",textAlign:"center",marginBottom:10}}>
              Cle API requise
            </div>
          )}
          <button onClick={()=>setRes(scoreLocal())} style={{
            ...B({
              width:"100%", padding:10, borderRadius:9,
              background:"#f0f0f0", color:"#666",
              fontWeight:600, fontSize:13, marginBottom:14,
            })
          }}>Analyse rapide sans IA</button>
        </>
      )}

      {mode==="local" && (
        <button onClick={()=>setRes(scoreLocal())} style={{
          ...B({
            width:"100%", padding:12, borderRadius:11,
            background:"linear-gradient(135deg,"+Dark+","+Gold+")",
            color:"#fff", fontWeight:700, fontSize:14, marginBottom:14,
          })
        }}>Analyser mon CV maintenant</button>
      )}

      {res && (
        <div>
          <div style={{
            background:"#f8f6f1", borderRadius:11,
            padding:"14px 16px", marginBottom:12,
          }}>
            <div style={{display:"flex", alignItems:"center", gap:14}}>
              <div style={{textAlign:"center"}}>
                <div style={{
                  fontSize:36, fontWeight:900,
                  color:sc(res.score), lineHeight:1,
                }}>
                  {res.score}
                </div>
                <div style={{
                  fontSize:9, color:"#888", fontWeight:600,
                  letterSpacing:1, textTransform:"uppercase",
                }}>Score</div>
              </div>
              {res.ai && (
                <>
                  <div style={{textAlign:"center"}}>
                    <div style={{
                      fontSize:28, fontWeight:900,
                      color:sc(res.ai.recruiter_score), lineHeight:1,
                    }}>
                      {res.ai.recruiter_score}
                    </div>
                    <div style={{fontSize:9,color:"#888"}}>Recruteur</div>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{
                      fontSize:28, fontWeight:900,
                      color:sc(res.ai.ats_score), lineHeight:1,
                    }}>
                      {res.ai.ats_score}
                    </div>
                    <div style={{fontSize:9,color:"#888"}}>ATS</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {res.ai && (
            <>
              <div style={{
                background:"#f0fff4", borderRadius:9,
                padding:"10px 13px", marginBottom:8,
              }}>
                <div style={{
                  fontSize:10, fontWeight:700, color:"#16a34a", marginBottom:5,
                }}>Points forts</div>
                {(res.ai.strengths||[]).map((s,i) => (
                  <div key={i} style={{fontSize:12,color:"#333",marginBottom:2}}>
                    {"* "}{s}
                  </div>
                ))}
              </div>
              <div style={{
                background:"#fff3f0", borderRadius:9,
                padding:"10px 13px", marginBottom:8,
              }}>
                <div style={{
                  fontSize:10, fontWeight:700, color:"#dc2626", marginBottom:5,
                }}>Corrections prioritaires</div>
                {(res.ai.critical_fixes||[]).map((f,i) => (
                  <div key={i} style={{fontSize:12,color:"#333",marginBottom:2}}>
                    {"* "}{f}
                  </div>
                ))}
              </div>
              {(res.ai.ats_keywords_missing||[]).length > 0 && (
                <div style={{
                  background:"#fff9f0", borderRadius:9,
                  padding:"10px 13px", marginBottom:10,
                }}>
                  <div style={{
                    fontSize:10, fontWeight:700, color:Gold, marginBottom:5,
                  }}>Mots-cles ATS manquants</div>
                  <div style={{display:"flex", flexWrap:"wrap", gap:4}}>
                    {(res.ai.ats_keywords_missing||[]).map((k,i) => (
                      <span key={i} style={{
                        background:"#fee2e2", color:"#dc2626",
                        borderRadius:3, padding:"2px 6px", fontSize:10,
                      }}>{k}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div style={SH()}>Detail</div>
          {res.checks.map((ch,i)=>(
            <div key={i} style={{display:"flex",gap:7,marginBottom:5,alignItems:"flex-start"}}>
              <span style={{fontSize:12,flexShrink:0,color:ch.ok?"#16a34a":"#dc2626"}}>
                {ch.ok?"v":"x"}
              </span>
              <div>
                <div style={{fontSize:12,fontWeight:ch.ok?400:600,color:ch.ok?"#555":Dark}}>
                  {ch.cat}: {ch.label}
                </div>
                {!ch.ok&&<div style={{fontSize:11,color:"#888"}}>{ch.tip}</div>}
              </div>
            </div>
          ))}

          <button onClick={()=>setRes(null)} style={{
            ...B({
              width:"100%", padding:10, borderRadius:9,
              background:"#f0f0f0", color:"#666", fontSize:12, marginTop:6,
            })
          }}>Nouvelle analyse</button>
        </div>
      )}
    </div>
  );
}

function BottomNav({ active, set, T }) {
  const tabs = [
    ["ai","*",T.tab_ai],
    ["edit","~",T.tab_edit],
    ["design","*",T.tab_design],
    ["score","*",T.tab_score],
    ["tools","*",T.tab_tools],
  ];
  return (
    <div style={{
      display:"flex", background:"#fff",
      borderTop:"1px solid #eee",
      boxShadow:"0 -2px 12px rgba(0,0,0,.08)", flexShrink:0,
    }}>
      {tabs.map(([key,icon,label]) => (
        <button key={key} onClick={()=>set(key)} style={{
          ...B({
            flex:1, padding:"10px 0 12px",
            display:"flex", flexDirection:"column",
            alignItems:"center", gap:3,
            background:"none", position:"relative",
          })
        }}>
          {active===key && (
            <div style={{
              position:"absolute", top:0, left:"50%",
              transform:"translateX(-50%)",
              width:28, height:3, background:Gold,
              borderRadius:"0 0 3px 3px",
            }}/>
          )}
          <span style={{fontSize:17, lineHeight:1}}>{icon}</span>
          <span style={{
            fontSize:9,
            fontWeight:active===key?700:400,
            color:active===key?Dark:"#bbb",
          }}>{label}</span>
        </button>
      ))}
    </div>
  );
}

function OnboardScreen({ T, locale, setLocale, apiKey, mode, setMode,
  raw, setRaw, imping, onImport, setTab, setAiMode }) {
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:500,
      background:"linear-gradient(135deg,"+Dark+" 0%,#2d2418 100%)",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      padding:24, fontFamily:"'Lato',sans-serif",
    }}>
      <div style={{position:"absolute", top:14, right:14, display:"flex", gap:6}}>
        {[["fr","FR"],["en","EN"]].map(([lc,flag]) => (
          <button key={lc} onClick={()=>setLocale(lc)} style={{
            ...B({
              padding:"5px 11px", borderRadius:18,
              background:locale===lc?Gold:"rgba(255,255,255,.1)",
              color:locale===lc?Dark:"rgba(255,255,255,.6)",
              fontWeight:locale===lc?700:400, fontSize:13,
              border:locale===lc?"none":"1px solid rgba(255,255,255,.2)",
            })
          }}>{flag}</button>
        ))}
      </div>
      <div style={{fontSize:32, marginBottom:7}}>*</div>
      <div style={{
        color:Gold, fontWeight:800, fontSize:20,
        letterSpacing:3, textTransform:"uppercase", marginBottom:3,
      }}>{T.appName}</div>
      <div style={{color:"rgba(255,255,255,.5)", fontSize:12, marginBottom:36}}>
        {T.appSub}
      </div>
      {!mode && (
        <div style={{display:"flex", flexDirection:"column", gap:12, width:"100%", maxWidth:370}}>
          <button onClick={()=>setMode("import")} style={{
            ...B({
              padding:"16px 22px", borderRadius:13,
              background:"rgba(201,169,110,.15)",
              border:"2px solid "+Gold, color:Gold,
              fontWeight:700, fontSize:14,
              display:"flex", alignItems:"center", gap:12, textAlign:"left",
            })
          }}>
            <span style={{fontSize:26}}>{">"}</span>
            <div>
              <div style={{fontWeight:800, marginBottom:1}}>{T.ob_import}</div>
              <div style={{fontSize:11, opacity:.7, fontWeight:400}}>
                Texte brut - l'IA structure tout
              </div>
            </div>
          </button>
          <button onClick={()=>{setMode("done");setTab("ai");setAiMode("generate");}} style={{
            ...B({
              padding:"16px 22px", borderRadius:13,
              background:"rgba(255,255,255,.07)",
              border:"2px solid rgba(255,255,255,.2)",
              color:"#fff", fontWeight:700, fontSize:14,
              display:"flex", alignItems:"center", gap:12, textAlign:"left",
            })
          }}>
            <span style={{fontSize:26}}>*</span>
            <div>
              <div style={{fontWeight:800, marginBottom:1}}>{T.ob_generate}</div>
              <div style={{fontSize:11, opacity:.5, fontWeight:400}}>
                A partir de quelques infos
              </div>
            </div>
          </button>
          <button onClick={()=>setMode("done")} style={{
            ...B({
              padding:"11px 22px", borderRadius:13,
              background:"transparent",
              border:"1px solid rgba(255,255,255,.15)",
              color:"rgba(255,255,255,.4)",
              fontWeight:500, fontSize:12, textAlign:"center",
            })
          }}>{T.ob_blank}</button>
        </div>
      )}
      {mode==="import" && (
        <div style={{
          width:"100%", maxWidth:460,
          display:"flex", flexDirection:"column", gap:9,
        }}>
          <button onClick={()=>setMode(null)} style={{
            ...B({background:"none", color:"rgba(255,255,255,.4)", fontSize:12, textAlign:"left"})
          }}>{T.ob_back}</button>
          <label style={{...LBL, color:"rgba(255,255,255,.6)"}}>{T.ob_paste}</label>
          <textarea value={raw} onChange={e=>setRaw(e.target.value)}
            placeholder={"Nom, titre, email...\nExperiences, formation, competences..."}
            rows={9} style={{
              ...IN({
                background:"rgba(255,255,255,.08)",
                border:"1px solid rgba(201,169,110,.4)",
                color:"#fff", fontSize:12, lineHeight:1.7, resize:"vertical",
              })
            }}/>
          {!apiKey && (
            <div style={{
              background:"rgba(255,193,7,.15)",
              border:"1px solid rgba(255,193,7,.4)",
              borderRadius:7, padding:"9px 12px",
              fontSize:11, color:"#ffc107",
            }}>{T.ob_no_key}</div>
          )}
          <button onClick={onImport} disabled={imping||!raw.trim()||!apiKey} style={{
            ...B({
              padding:13, borderRadius:11,
              background:imping||!raw.trim()||!apiKey
                ? "rgba(255,255,255,.15)"
                : "linear-gradient(135deg,"+Gold+",#a07840)",
              color:"#fff", fontWeight:800, fontSize:14,
            })
          }}>
            {imping ? T.ob_parsing : T.ob_parse}
          </button>
          {!apiKey && (
            <button onClick={()=>setMode("done")} style={{
              ...B({
                padding:9, borderRadius:9, background:"transparent",
                color:"rgba(255,255,255,.35)", fontSize:11,
              })
            }}>{T.ob_continue}</button>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [cv, setCV_]       = useState(() => {
    const s = lsG(SK.CV, null);
    if (!s) return EMPTY;
    return {
      ...EMPTY, ...s,
      skills:       Array.isArray(s.skills)        ? s.skills        : EMPTY.skills,
      languages:    Array.isArray(s.languages)     ? s.languages     : EMPTY.languages,
      certifications: Array.isArray(s.certifications) ? s.certifications : EMPTY.certifications,
      experience:   Array.isArray(s.experience)    ? s.experience    : EMPTY.experience,
      education:    Array.isArray(s.education)     ? s.education     : EMPTY.education,
    };
  });
  const [thN, setThN_]     = useState(() => lsG(SK.TH, "executive"));
  const [layout, setLy_]   = useState(() => lsG(SK.LY, "sidebar"));
  const [apiKey, setAK_]   = useState(() => lsG(SK.KY, "") || "server-managed");
  const [locale, setLc_]   = useState(() => lsG(SK.LC, "fr"));
  const [tab, setTab]       = useState("ai");
  const [aiMode, setAiMode] = useState("generate");
  const [load, setLoad]     = useState(false);
  const [notif, setNotif]   = useState("");
  const [modal, setModal]   = useState(null);
  const [showCV, setShowCV] = useState(true);
  const [mob, setMob]       = useState(false);
  const [hist, setHist]     = useState([]);
  const [cvW, setCvW]       = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [obMode, setObMode] = useState(null);
  const [obRaw, setObRaw]   = useState("");
  const [obImp, setObImp]   = useState(false);
  const cRef = useRef();

  const setCVFn = useCallback(fn => setCV_(p => {
    const n = typeof fn==="function" ? fn(p) : fn;
    lsS(SK.CV, n);
    return n;
  }), []);
  const setTh = useCallback(v => { setThN_(v); lsS(SK.TH, v); }, []);
  const setLy = useCallback(v => { setLy_(v);  lsS(SK.LY, v); }, []);
  const setAK = useCallback(v => { setAK_(v);  lsS(SK.KY, v); }, []);
  const setLc = useCallback(v => { setLc_(v);  lsS(SK.LC, v); }, []);

  const T = locale==="en" ? EN_T : FR_T;
  const theme = THEMES[thN] || THEMES.executive;
  const cvIsEmpty = !cv.name && !cv.title && !cv.summary
    && cv.experience.every(e => !e.title && !e.company);

  const notify = useCallback(msg => {
    setNotif(msg);
    setTimeout(() => setNotif(""), 3000);
  }, []);

  const pushH = useCallback(() => setCV_(c => {
    setHist(h => [...h.slice(-11), c]);
    return c;
  }), []);

  const undo = useCallback(() => {
    setHist(h => {
      if (!h.length) { notify(T.nu); return h; }
      const p = h[h.length-1];
      setCV_(p);
      lsS(SK.CV, p);
      notify(T.oku);
      return h.slice(0,-1);
    });
  }, [T, notify]);

  useEffect(() => {
    const c = () => setMob(window.innerWidth < 800);
    c();
    window.addEventListener("resize", c);
    return () => window.removeEventListener("resize", c);
  }, []);

  useEffect(() => {
    if (!cRef.current) return;
    const ro = new ResizeObserver(es => {
      for (const e of es) setCvW(e.contentRect.width);
    });
    ro.observe(cRef.current);
    return () => ro.disconnect();
  }, []);

  const scale = cvW > 0 ? Math.min(1, (cvW-16)/794) : 1;
  const cvH   = Math.round(1123 * scale);

  const handleGen = useCallback(async p => {
    if (!apiKey) { notify(T.nk); return; }
    pushH();
    setLoad(true);
    try {
      const txt = await aiCall(p);
      const json = parseJSON(txt);
      setCVFn(() => normCV(json));
      notify(T.ok);
    } catch { notify(T.ea); }
    setLoad(false);
  }, [apiKey, T, pushH, setCVFn, notify]);

  const exportPDF = useCallback(() => {
    const el = document.getElementById("cv-print");
    if (!el) return;
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    s.onerror = () => notify("Erreur chargement PDF");
    s.onload = () => {
      const fname = "CV_" + cv.name.split(" ").join("_") + ".pdf";
      window.html2pdf().set({
        margin:0, filename:fname,
        image:{type:"jpeg", quality:.98},
        html2canvas:{scale:2, useCORS:true, logging:false},
        jsPDF:{unit:"mm", format:"a4", orientation:"portrait"},
      }).from(el).save();
      notify(T.okp+": "+fname);
    };
    document.head.appendChild(s);
  }, [cv.name, T, notify]);

  const doReset = useCallback(() => {
    if (!window.confirm(T.conf)) return;
    pushH();
    setCVFn(() => EMPTY);
    notify(T.okr);
  }, [T, pushH, setCVFn, notify]);

  const onImport = useCallback(async () => {
    if (!obRaw.trim()) { notify(T.np2); return; }
    if (!apiKey) { notify(T.nk); return; }
    setObImp(true);
    const p = "Expert parsing CV. JSON valide strict sans markdown.\n"
      + 'STRUCTURE:{"name":"","title":"","email":"","phone":"",'
      + '"location":"","linkedin":"","summary":"",'
      + '"experience":[{"id":1,"title":"","company":"","period":"",'
      + '"location":"","bullets":["",""]}],'
      + '"education":[{"id":1,"degree":"","school":"","period":""}],'
      + '"skills":[""],"languages":[{"lang":"","level":""}],'
      + '"certifications":[""]}\n'
      + "REGLES:toutes experiences, IDs depuis 1, vide si absent."
      + " Jamais tirets cadratins. UNIQUEMENT JSON.\nCV:\n" + obRaw;
    try {
      const txt = await aiCall(p);
      const parsed = parseJSON(txt);
      setCVFn(() => normCV(parsed));
      setObRaw("");
      setObMode(null);
      notify(T.okimp);
    } catch { notify(T.ep); }
    setObImp(false);
  }, [obRaw, apiKey, T, setCVFn, notify]);

  const loadTpl = useCallback(tpl => {
    try {
      pushH();
      setCVFn(() => normCV(tpl.cv));
      setTh(tpl.theme || "executive");
      setLy(tpl.layout || "sidebar");
      notify("Template charge!");
    } catch(e) { notify("Erreur: "+e.message); }
  }, [pushH, setCVFn, setTh, setLy, notify]);

  const quick = [
    [T.q_ex, () => {
      pushH();
      setCVFn(p => ({...p, experience:[...p.experience, {
        id:Date.now(), title:T.nt, company:T.nc,
        period:T.np, location:T.ny, bullets:[T.nb],
      }]}));
      notify(T.oka);
    }, "#f0fff4"],
    [T.q_ed, () => {
      pushH();
      setCVFn(p => ({...p, education:[...p.education, {
        id:Date.now(), degree:T.nd, school:T.ns, period:T.nsp,
      }]}));
      notify(T.oka);
    }, "#f0f4ff"],
    [T.q_sk, () => {
      pushH();
      setCVFn(p => ({...p, skills:[...p.skills,""]}));
      notify(T.oka);
    }, "#fff9f0"],
  ];

  const editSects = [
    [T.edit_id, "id", "#fff9f0"],
    [T.edit_ex, "exp", "#f0fff4"],
    [T.edit_ed, "edu", "#f0f4ff"],
    [T.edit_sk, "sk", "#fef6ee"],
  ];

  const CVEl = (
    <div id="cv-print" style={{position:"relative"}}>
      {load && <Shimmer/>}
      {layout==="sidebar" && <CVSidebar cv={cv} set={setCVFn} t={theme} T={T}/>}
      {layout==="classic" && <CVSidebar cv={cv} set={setCVFn} t={theme} T={T}/>}
      {layout==="ats"     && <CVAts     cv={cv} set={setCVFn} T={T}/>}
    </div>
  );

  const AITabContent = (
    <div>
      <div style={{
        display:"flex", gap:4, marginBottom:14,
        background:"#f0ede5", padding:4, borderRadius:9,
      }}>
        {[["generate",T.tab_gen,"*"],["adjust",T.tab_adj,"~"],["match",T.tab_match,">>"]].map(
          ([m,label,icon]) => (
            <button key={m} onClick={()=>setAiMode(m)} style={{
              ...B({
                flex:1, padding:"7px 5px", borderRadius:7,
                background:aiMode===m?"#fff":"transparent",
                color:aiMode===m?Dark:"#888",
                fontWeight:aiMode===m?700:500, fontSize:11,
                textAlign:"center", lineHeight:1.3,
              })
            }}>
              <span style={{display:"block", fontSize:13}}>{icon}</span>
              {label}
            </button>
          )
        )}
      </div>
      {aiMode==="generate" && (
        <AIPanel onGen={handleGen} loading={load} apiKey={apiKey} T={T}/>
      )}
      {aiMode==="adjust" && (
        <AdjustPanel cv={cv} setCVFn={setCVFn} notify={notify} apiKey={apiKey} T={T}/>
      )}
      {aiMode==="match" && (
        <MatchPanel cv={cv} setCVFn={setCVFn} notify={notify} apiKey={apiKey} T={T}/>
      )}
    </div>
  );

  const DesignContent = (
    <div>
      <div style={SH()}>{T.dth}</div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:4}}>
        {Object.entries(THEMES).map(([k,th]) => (
          <button key={k} onClick={()=>setTh(k)} style={{
            ...B({
              display:"flex", alignItems:"center", gap:8,
              padding:"10px 11px", borderRadius:9,
              border:thN===k?"2px solid "+th.ac:"1px solid #e8e4dc",
              background:thN===k?"#fff9f0":"#fff", textAlign:"left",
            })
          }}>
            <div style={{
              width:20, height:20, borderRadius:4,
              background:th.sb, border:"2px solid "+th.ac, flexShrink:0,
            }}/>
            <span style={{fontSize:12, fontWeight:thN===k?700:500, color:"#333"}}>
              {th.name}
            </span>
          </button>
        ))}
      </div>
      <div style={SH()}>{T.dly}</div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:8}}>
        {LAYOUTS.map(k => (
          <button key={k} onClick={()=>setLy(k)} style={{
            ...B({
              padding:"9px 6px", borderRadius:9, textAlign:"center",
              border:layout===k?"2px solid "+Gold:"1px solid #e8e4dc",
              background:layout===k?"#fff9f0":"#fff",
            })
          }}>
            <span style={{
              fontSize:11, fontWeight:layout===k?700:600,
              color:layout===k?Dark:"#333",
            }}>{k.charAt(0).toUpperCase()+k.slice(1)}</span>
          </button>
        ))}
      </div>
      {layout==="ats" && (
        <div style={{
          marginTop:8, padding:9, background:"#f0fff4",
          borderRadius:7, fontSize:11, color:"#166534",
        }}>{T.dats}</div>
      )}
      <div style={SH({marginTop:16})}>{T.dlg}</div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:16}}>
        {[["fr","FR Francais"],["en","EN English"]].map(([lc,label]) => (
          <button key={lc} onClick={()=>setLc(lc)} style={{
            ...B({
              padding:"10px", borderRadius:9,
              border:locale===lc?"2px solid "+Gold:"1px solid #e8e4dc",
              background:locale===lc?"#fff9f0":"#fff",
              fontSize:12, fontWeight:locale===lc?700:500, color:"#333",
            })
          }}>{label}{locale===lc?" v":""}</button>
        ))}
      </div>
      <div style={SH()}>Templates</div>
      {TEMPLATES.map(tpl => (
        <div key={tpl.id} style={{
          borderRadius:9, border:"1px solid #e8e4dc",
          background:"#fff", overflow:"hidden", marginBottom:7,
        }}>
          <div style={{padding:"9px 11px", display:"flex", alignItems:"center", gap:9}}>
            <span style={{fontSize:20}}>{tpl.emoji}</span>
            <div>
              <div style={{fontSize:12, fontWeight:700, color:Dark}}>{tpl.label}</div>
              <div style={{fontSize:10, color:"#aaa"}}>{tpl.cv.title.slice(0,35)}</div>
            </div>
          </div>
          <button onClick={()=>loadTpl(tpl)} style={{
            ...B({
              width:"100%", padding:"7px 11px",
              background:"#f8f6f1", color:Gold,
              fontWeight:600, fontSize:11,
              borderTop:"1px solid #eee", textAlign:"center",
            })
          }}>Charger ce CV</button>
        </div>
      ))}
    </div>
  );

  const ToolsContent = (
    <div>
      <div style={SH()}>{T.t_api}</div>
      <input type="password" value={apiKey}
        onChange={e=>setAK(e.target.value)}
        placeholder={T.t_aph}
        style={{...IN({fontFamily:"monospace", fontSize:12, marginBottom:3})}}/>
      <div style={{fontSize:10, color:"#aaa", marginBottom:14}}>{T.t_ahi}</div>
      <div style={SH()}>{T.t_exp}</div>
      <button onClick={exportPDF} style={{
        ...B({
          width:"100%", padding:"11px", borderRadius:11,
          background:"linear-gradient(135deg,"+Dark+","+Gold+")",
          color:"#fff", fontWeight:700, fontSize:13, marginBottom:8,
        })
      }}>{T.t_pdf}</button>
      {layout!=="ats" && (
        <div style={{
          fontSize:11, color:"#888", marginBottom:12,
          padding:"8px 10px", background:"#f8f6f1",
          borderRadius:7, lineHeight:1.6,
        }}>{T.t_ath}</div>
      )}
      <div style={SH()}>{T.t_hist}</div>
      <button onClick={undo} disabled={!hist.length} style={{
        ...B({
          width:"100%", padding:"10px", borderRadius:9,
          border:"1px solid #e0e0e0",
          background:!hist.length?"#f5f5f5":"#fff9f0",
          color:!hist.length?"#ccc":Gold,
          fontWeight:700, fontSize:13, marginBottom:7,
        })
      }}>{T.t_undo} ({hist.length})</button>
      <button onClick={doReset} style={{
        ...B({
          width:"100%", padding:"10px", borderRadius:9,
          border:"1px solid #eee", background:"#fee2e2",
          color:"#dc2626", fontSize:13, marginBottom:14,
        })
      }}>{T.t_rst}</button>
      <div style={SH()}>{T.t_qck}</div>
      {quick.map(([l,fn,bg]) => (
        <button key={l} onClick={fn} style={{
          ...B({
            width:"100%", marginBottom:7, padding:"10px 13px",
            borderRadius:9, border:"1px solid #eee",
            background:bg, textAlign:"left", fontSize:13, color:"#333",
          })
        }}>{l}</button>
      ))}
    </div>
  );

  const EditContent = (
    <div>
      <div style={SH()}>{T.edit_t}</div>
      {editSects.map(([label,m,bg]) => (
        <button key={m} onClick={()=>setModal(m)} style={{
          ...B({
            display:"flex", alignItems:"center",
            justifyContent:"space-between",
            width:"100%", marginBottom:8,
            padding:"13px 14px", borderRadius:11,
            border:"1px solid #e0ddd7", background:bg,
            textAlign:"left", fontSize:13, color:Dark, fontWeight:600,
          })
        }}>
          {label}
          <span style={{color:Gold, fontSize:18, lineHeight:1}}>{">"}</span>
        </button>
      ))}
      <div style={{
        padding:10, background:"#f8f6f1", borderRadius:9,
        fontSize:11, color:"#888", lineHeight:1.7, marginTop:3,
      }}>{T.edit_tip}</div>
      <div style={SH({marginTop:14})}>{T.t_qck}</div>
      {quick.map(([l,fn,bg]) => (
        <button key={l} onClick={fn} style={{
          ...B({
            width:"100%", marginBottom:6, padding:"9px 13px",
            borderRadius:8, border:"1px solid #eee",
            background:bg, textAlign:"left", fontSize:12, color:"#333",
          })
        }}>{l}</button>
      ))}
    </div>
  );

  const Modals = (
    <>
      {modal==="id"  && <SheetId cv={cv} set={setCVFn} onClose={()=>setModal(null)} T={T}/>}
      {modal==="exp" && <SheetEx cv={cv} set={setCVFn} onClose={()=>setModal(null)}
        apiKey={apiKey} notify={notify} T={T}/>}
      {modal==="edu" && <SheetEd cv={cv} set={setCVFn} onClose={()=>setModal(null)} T={T}/>}
      {modal==="sk"  && <SheetSk cv={cv} set={setCVFn} onClose={()=>setModal(null)} T={T}/>}
    </>
  );

  const Onboard = cvIsEmpty && obMode!=="done" && (
    <OnboardScreen T={T} locale={locale} setLocale={setLc}
      apiKey={apiKey} mode={obMode} setMode={setObMode}
      raw={obRaw} setRaw={setObRaw} imping={obImp}
      onImport={onImport} setTab={setTab} setAiMode={setAiMode}/>
  );

    if (!mob) {
    const tS = a => ({
      ...B({
        flex:1, padding:"10px 0", fontSize:11,
        fontWeight:a?700:400, color:a?Dark:"#aaa",
        borderBottom:a?"2.5px solid "+Gold:"2.5px solid transparent",
        textAlign:"center",
      })
    });
    return (
      <>
        <link href={FONT} rel="stylesheet"/>
        {notif && <Notif msg={notif}/>}
        {Modals}
        {Onboard}
        <div style={{
          display:"flex", height:"100vh",
          fontFamily:"'Lato',sans-serif",
          background:"#edeae4", overflow:"hidden",
        }}>
          <div style={{
            width:270, background:"#fff",
            borderRight:"1px solid #e8e4dc",
            display:"flex", flexDirection:"column",
            overflow:"hidden", flexShrink:0,
          }}>
            <div style={{padding:"13px 18px", background:Dark}}>
              <div style={{
                color:Gold, fontWeight:800, fontSize:13,
                letterSpacing:2, textTransform:"uppercase",
              }}>{T.appName}</div>
              <div style={{color:"#ffffff44", fontSize:9, marginTop:1}}>
                {T.appSub}
              </div>
            </div>
            <div style={{display:"flex", borderBottom:"1px solid #eee"}}>
              {[["ai","*"],["design","*"],["edit","~"],["score","*"],["tools","*"]].map(
                ([k,ic]) => (
                  <button key={k} style={tS(tab===k)} onClick={()=>setTab(k)}>
                    {ic}
                  </button>
                )
              )}
            </div>
            <div style={{flex:1, overflowY:"auto", padding:"14px"}}>
              {tab==="ai"     && AITabContent}
              {tab==="design" && DesignContent}
              {tab==="edit"   && EditContent}
              {tab==="score"  && (
                <ScorePanel cv={cv} apiKey={apiKey} notify={notify}
                  layout={layout} T={T}/>
              )}
              {tab==="tools"  && ToolsContent}
            </div>
          </div>
          <div style={{
            flex:1, overflow:"auto", padding:22,
            display:"flex", justifyContent:"center", alignItems:"flex-start",
          }}>
            <div style={{
              width:794, minHeight:1123, background:"#fff",
              boxShadow:"0 8px 48px rgba(0,0,0,.14)",
              borderRadius:4, overflow:"hidden",
            }}>
              {CVEl}
            </div>
          </div>
        </div>
      </>
    );
  }

    return (
    <>
      <link href={FONT} rel="stylesheet"/>
      {notif && <Notif msg={notif}/>}
      {Modals}
      {Onboard}
      {zoomed && (
        <div style={{
          position:"fixed", inset:0, zIndex:1500,
          background:"rgba(0,0,0,.9)", overflow:"auto",
        }} onClick={()=>setZoomed(false)}>
          <div style={{minWidth:794, padding:14}}>{CVEl}</div>
        </div>
      )}
      <div style={{
        display:"flex", flexDirection:"column", height:"100vh",
        overflow:"hidden", background:"#edeae4",
        fontFamily:"'Lato',sans-serif",
      }}>
        <div style={{
          display:"flex", alignItems:"center",
          justifyContent:"space-between",
          padding:"10px 14px", background:Dark, flexShrink:0,
        }}>
          <div>
            <div style={{
              color:Gold, fontWeight:800, fontSize:13,
              letterSpacing:2, textTransform:"uppercase",
            }}>{T.appName}</div>
            <div style={{color:"#ffffff44", fontSize:9}}>{T.appSub}</div>
          </div>
          <div style={{display:"flex", gap:7}}>
            <button onClick={()=>setZoomed(true)} style={{
              ...B({
                background:"rgba(201,169,110,.15)",
                border:"1px solid rgba(201,169,110,.3)",
                color:Gold, borderRadius:6, padding:"5px 9px",
                fontSize:11, fontWeight:600,
              })
            }}>{T.zoom}</button>
            <button onClick={()=>setShowCV(p=>!p)} style={{
              ...B({
                background:"rgba(201,169,110,.2)",
                border:"1px solid rgba(201,169,110,.4)",
                color:Gold, borderRadius:6, padding:"5px 9px",
                fontSize:11, fontWeight:700,
              })
            }}>{showCV ? T.hide : T.show}</button>
          </div>
        </div>
        {showCV && (
          <div ref={cRef} style={{
            background:"#ccc9c0", padding:"7px", flexShrink:0,
          }}>
            <div style={{
              height:cvH, overflow:"hidden",
              background:"#fff", borderRadius:5,
              boxShadow:"0 4px 20px rgba(0,0,0,.15)",
            }}>
              <div style={{
                transformOrigin:"top left",
                transform:"scale("+scale+")",
                width:scale<1 ? (100/scale)+"%" : "100%",
              }}>
                {CVEl}
              </div>
            </div>
          </div>
        )}
        <div style={{flex:1, overflowY:"auto", padding:"13px 13px 4px"}}>
          {tab==="ai"     && AITabContent}
          {tab==="edit"   && EditContent}
          {tab==="design" && DesignContent}
          {tab==="score"  && (
            <ScorePanel cv={cv} apiKey={apiKey} notify={notify}
              layout={layout} T={T}/>
          )}
          {tab==="tools"  && ToolsContent}
        </div>
        <BottomNav active={tab} set={setTab} T={T}/>
      </div>
    </>
  );
}
