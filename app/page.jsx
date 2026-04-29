"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

// === V10 REBRAND : Editorial luxury, mobile-first ===
const FONT = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..900,30..100&family=Inter:wght@300;400;500;600;700;800&display=swap";

// Palette
const Ink       = "#0a0a0a";   // noir profond, surface principale
const InkSoft   = "#1a1a1f";   // noir bleute pour gradient
const Cream     = "#f5f1e8";   // creme chaude, fond editorial
const CreamSoft = "#faf7ef";   // creme clair, fond app
const Paper     = "#ffffff";   // cards
const Gold      = "#c9a96e";   // gold luxe
const GoldDeep  = "#a07840";   // gold profond pour text-on-cream
const Purple    = "#5b3df5";   // violet electrique pour accents
const PurpleSoft= "#ede9fe";
const Coral     = "#ff5a36";   // corail vif
const CoralSoft = "#ffe8e1";
const Green     = "#16a34a";
const GreenSoft = "#dcfce7";
const Gray50    = "#fafaf9";
const Gray100   = "#f5f4f0";
const Gray200   = "#e7e5dc";
const Gray400   = "#a8a59a";
const Gray600   = "#57534e";
const Gray900   = "#292524";

// Fonts
const Serif = "'Fraunces', 'Playfair Display', Georgia, serif";
const Sans  = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// Backwards compat (existing code uses these names)
const Dark = Ink;

// Radius / shadow tokens
const RadiusSm   = 10;
const RadiusMd   = 16;
const RadiusLg   = 22;
const RadiusPill = 999;
const ShadowSm   = "0 1px 2px rgba(10,10,10,.04), 0 0 0 0.5px rgba(10,10,10,.06)";
const ShadowMd   = "0 4px 14px rgba(10,10,10,.06), 0 0 0 0.5px rgba(10,10,10,.06)";
const ShadowLg   = "0 14px 40px rgba(10,10,10,.10), 0 0 0 0.5px rgba(10,10,10,.06)";

// Gradients réservés aux moments forts
const GradDark   = "linear-gradient(135deg, #0a0a0a 0%, #1a1a1f 50%, #c9a96e 100%)";
const GradGold   = "linear-gradient(135deg, #c9a96e 0%, #a07840 100%)";
const GradPurple = "linear-gradient(135deg, #5b3df5 0%, #b91c8c 100%)";
const GradCoral  = "linear-gradient(135deg, #ff5a36 0%, #ffa800 100%)";

// REGLE TIRETS - duplicated in every AI prompt for maximum compliance
const NO_DASH =
  "INTERDICTION ABSOLUE des tirets cadratin (em dash, caractere Unicode U+2014) "
  + "et demi-cadratin (en dash, caractere Unicode U+2013). N'utilise JAMAIS ces caracteres, "
  + "meme entre des mots, des dates, ou pour des incises. "
  + "Utilise uniquement: virgule, parentheses, deux-points, point-virgule, "
  + "ou tiret simple - (hyphen-minus U+002D). "
  + "Toute occurrence d'un tiret cadratin ou demi-cadratin sera consideree comme une faute majeure.";

const SK = { CV:"cvf_d", TH:"cvf_t", LY:"cvf_l", KY:"cvf_k", LC:"cvf_c", BK:"cvf_bk", VS:"cvf_vs" };

const FR_T = {
  appName:"CV Factory", appSub:"L'IA qui boost et adapte ton CV",
  tab_ai:"IA", tab_edit:"Editer", tab_design:"Design",
  tab_score:"Score", tab_tools:"Outils",
  tab_gen:"Generer", tab_adj:"Ajuster", tab_match:"Offre",
  ob_import:"Importer mon CV", ob_generate:"Generer avec l'IA",
  ob_blank:"Commencer vierge", ob_back:"Retour",
  ob_paste:"Colle ton CV ici (texte brut)",
  ob_parse:"Importer mon CV avec l'IA", ob_parsing:"L'IA analyse ton CV...",
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
  tr_btn:"Traduire le CV",
  tr_title:"Traduction IA du CV",
  tr_sub:"Traduit le contenu de ton CV en preservant la structure",
  tr_dir:"Direction",
  tr_fr_en:"Francais vers Anglais",
  tr_en_fr:"Anglais vers Francais",
  tr_warn:"Cette action remplacera le contenu actuel du CV. Une copie de la version originale sera sauvegardee et tu pourras la restaurer a tout moment.",
  tr_run:"Lancer la traduction",
  tr_loading:"Traduction en cours...",
  tr_msgs:[
    "Lecture du CV...",
    "Identification des elements a preserver...",
    "Traduction des realisations...",
    "Adaptation des termes professionnels...",
    "Verification de la coherence...",
    "Finalisation...",
  ],
  tr_ok:"CV traduit avec succes",
  tr_err:"Erreur traduction",
  tr_nk:"Cle API requise pour traduire",
  tr_restore:"Restaurer la version originale",
  tr_restore_conf:"Restaurer la version sauvegardee? La traduction sera perdue.",
  tr_restored:"Version originale restauree",
  tr_section:"Traduction",
  tr_hint_backup:"Une version sauvegardee existe deja. Tu pourras la restaurer apres traduction depuis l'onglet Outils.",
  audit_btn:"Audit IA Recruteur",
  bt_btn_title:"Transformer ce bullet en 5 versions",
  bt_empty:"Ecris d'abord un bullet a transformer",
  bt_err:"Erreur transformation: ",
  bt_adopted:"Version adoptee",
  bt_modal_title:"Transformer ce bullet",
  bt_modal_sub:"5 versions dans 5 registres differents",
  bt_original:"Original",
  bt_loading:"Generation des 5 versions...",
  bt_loading_sub:"5 a 8 secondes",
  bt_simple:"Simple", bt_simple_hint:"Clarifie sans embellir",
  bt_pro:"Pro", bt_pro_hint:"Corporate sobre, verbe d'action",
  bt_ats:"ATS", bt_ats_hint:"Mots-cles metier maximises",
  bt_premium:"Premium", bt_premium_hint:"Registre executive elegant",
  bt_impact:"Impact", bt_impact_hint:"Avec estimation chiffree",
  bt_adopt:"Adopter",
};

const EN_T = {
  appName:"CV Factory", appSub:"AI that boosts and tailors your CV",
  tab_ai:"AI", tab_edit:"Edit", tab_design:"Design",
  tab_score:"Score", tab_tools:"Tools",
  tab_gen:"Generate", tab_adj:"Adjust", tab_match:"Match",
  ob_import:"Import my CV", ob_generate:"Generate with AI",
  ob_blank:"Start blank", ob_back:"Back",
  ob_paste:"Paste your CV here (plain text)",
  ob_parse:"Import my CV with AI", ob_parsing:"AI is analyzing your CV...",
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
  tr_btn:"Translate CV",
  tr_title:"AI CV Translation",
  tr_sub:"Translates your CV content while preserving structure",
  tr_dir:"Direction",
  tr_fr_en:"French to English",
  tr_en_fr:"English to French",
  tr_warn:"This will replace the current CV content. A copy of the original will be saved and can be restored at any time.",
  tr_run:"Run translation",
  tr_loading:"Translating...",
  tr_msgs:[
    "Reading the CV...",
    "Identifying elements to preserve...",
    "Translating achievements...",
    "Adapting professional terms...",
    "Checking consistency...",
    "Finalizing...",
  ],
  tr_ok:"CV translated successfully",
  tr_err:"Translation error",
  tr_nk:"API key required to translate",
  tr_restore:"Restore original version",
  tr_restore_conf:"Restore saved version? The translation will be lost.",
  tr_restored:"Original version restored",
  tr_section:"Translation",
  tr_hint_backup:"A saved version already exists. You can restore it after translation from the Tools tab.",
  audit_btn:"AI Recruiter Audit",
  bt_btn_title:"Transform this bullet into 5 versions",
  bt_empty:"Write a bullet first to transform",
  bt_err:"Transform error: ",
  bt_adopted:"Version adopted",
  bt_modal_title:"Transform this bullet",
  bt_modal_sub:"5 versions in 5 different registers",
  bt_original:"Original",
  bt_loading:"Generating 5 versions...",
  bt_loading_sub:"5 to 8 seconds",
  bt_simple:"Simple", bt_simple_hint:"Clarifies without dressing up",
  bt_pro:"Pro", bt_pro_hint:"Corporate tone, action verb",
  bt_ats:"ATS", bt_ats_hint:"Maximizes industry keywords",
  bt_premium:"Premium", bt_premium_hint:"Executive elegant register",
  bt_impact:"Impact", bt_impact_hint:"With quantified estimate",
  bt_adopt:"Adopt",
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
  if (typeof t !== "string") return t;
  return t
    .split("\u2014").join("-")  // em dash
    .split("\u2013").join("-")  // en dash
    .split("\u2015").join("-")  // horizontal bar
    .split("\u2012").join("-")  // figure dash
    .split("\u2010").join("-")  // hyphen
    .split("\u2011").join("-"); // non-breaking hyphen
}

// Recursively sanitize all string values in an object / array tree.
// Used to clean CV / Pack / Audit results returned from the AI.
function sanDeep(v) {
  if (typeof v === "string") return san(v);
  if (Array.isArray(v)) return v.map(sanDeep);
  if (v && typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v)) out[k] = sanDeep(v[k]);
    return out;
  }
  return v;
}

async function aiCall(prompt) {
  // Timeout cote client a 60s (legerement plus que le serveur a 55s)
  // pour qu'on lise toujours la reponse du serveur plutot que de couper avant.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  let r;
  try {
    r = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: ctrl.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err && err.name === "AbortError") {
      throw new Error("Timeout cote client (60s). L'IA met trop longtemps a repondre.");
    }
    throw new Error("Erreur reseau: " + (err.message || String(err)));
  }
  clearTimeout(timer);

  // Si le serveur renvoie une erreur HTTP (504, 500, 401, 429...) on le voit ici
  let d;
  try {
    d = await r.json();
  } catch {
    throw new Error("Reponse serveur invalide (HTTP " + r.status + "). Probablement un timeout Vercel.");
  }
  if (!r.ok || (d && d.error)) {
    const m = (d && d.error && d.error.message) || ("Erreur HTTP " + r.status);
    throw new Error(m);
  }
  return san((d.content||[]).map(b=>b.text||"").join(""));
}

function parseJSON(txt) {
  const clean = txt.split("```json").join("").split("```").join("").trim();
  const parsed = JSON.parse(clean);
  return sanDeep(parsed);
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
  const [trf, setTrf] = useState(null); // {expId, bulletIdx, original, levels|null, loading}
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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

  const openTransformer = async (id, idx, text) => {
    if (!apiKey) { notify(T.nk); return; }
    if (!text || !text.trim()) {
      notify(T.bt_empty || "Ecris d'abord un bullet a transformer");
      return;
    }
    setTrf({ expId: id, bulletIdx: idx, original: text, levels: null, loading: true });
    try {
      const p = "Tu es expert CV. On te donne UNE phrase de bullet d'experience professionnelle. "
        + "Tu dois generer 5 reformulations differentes, chacune dans un registre distinct, "
        + "en gardant la langue d'origine.\n\n"
        + "PHRASE ORIGINALE:\n" + text + "\n\n"
        + "REGISTRES (5 niveaux):\n"
        + "1. simple: clarifie sans embellir, langage neutre, plus court si possible.\n"
        + "2. pro: ton corporate sobre, verbe d'action en debut, focus sur le faire.\n"
        + "3. ats: maximise les mots-cles du metier (CRM, P&L, KPI, B2B, etc.) pour passer les filtres ATS.\n"
        + "4. premium: registre executive elegant, tournure plus litteraire, mots forts (orchestre, pilote, deploie).\n"
        + "5. impact: ajoute une estimation chiffree credible (CA, %, nombre de personnes, delai). Si la phrase originale ne contient pas de chiffre, propose une fourchette plausible (par exemple: \"+15-25%\", \"5-10 personnes\").\n\n"
        + "REGLES:\n"
        + "- Ne pas inventer de fait nouveau ou d'entreprise. Reste fidele au sens original.\n"
        + "- Maximum 18 mots par version.\n"
        + "- " + NO_DASH + "\n"
        + "- JSON valide strict uniquement.\n\n"
        + '{\n'
        + '  "simple": "version simple",\n'
        + '  "pro": "version pro",\n'
        + '  "ats": "version ats",\n'
        + '  "premium": "version premium",\n'
        + '  "impact": "version chiffree"\n'
        + '}';
      const txt = await aiCall(p);
      const r = parseJSON(txt);
      setTrf(s => s ? { ...s, levels: r, loading: false } : null);
    } catch (err) {
      notify((T.bt_err || "Erreur transformation: ") + (err.message || ""));
      setTrf(null);
    }
  };

  const adoptVersion = (text) => {
    if (!trf) return;
    ub(trf.expId, trf.bulletIdx, text);
    setTrf(null);
    notify(T.bt_adopted || "Version adoptee");
  };

  return (
    <>
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
                onClick={()=>openTransformer(ex.id,j,b)}
                disabled={trf && trf.loading}
                style={{
                  ...B({
                    background:(trf && trf.loading)?"#eee":"#fff9f0",
                    border:"1px solid "+Gold+"44",
                    borderRadius:5, padding:"4px 7px",
                    fontSize:11, color:Gold, flexShrink:0,
                  })
                }}
                title={T.bt_btn_title || "Transformer ce bullet"}>
                *
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
    {mounted && trf && (
      <BulletTransformer
        original={trf.original}
        levels={trf.levels}
        loading={trf.loading}
        onAdopt={adoptVersion}
        onClose={()=>{ if (!trf.loading) setTrf(null); }}
        T={T}
      />
    )}
    </>
  );
}

function BulletTransformer({ original, levels, loading, onAdopt, onClose, T }) {
  const cards = [
    { key:"simple",  label:T.bt_simple,  hint:T.bt_simple_hint,  color:"#666" },
    { key:"pro",     label:T.bt_pro,     hint:T.bt_pro_hint,     color:Dark },
    { key:"ats",     label:T.bt_ats,     hint:T.bt_ats_hint,     color:"#1d4ed8" },
    { key:"premium", label:T.bt_premium, hint:T.bt_premium_hint, color:Gold },
    { key:"impact",  label:T.bt_impact,  hint:T.bt_impact_hint,  color:"#16a34a" },
  ];
  if (typeof document === "undefined") return null;
  return createPortal((
    <div style={{
      position:"fixed", inset:0, zIndex:99999,
      background:"rgba(0,0,0,.75)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:20, fontFamily:"'Lato',sans-serif",
    }}>
      <div style={{
        background:"#fff", borderRadius:16, maxWidth:620, width:"100%",
        maxHeight:"92vh", overflowY:"auto",
        boxShadow:"0 20px 60px rgba(0,0,0,.4)",
      }}>
        <div style={{
          padding:"18px 22px 14px", borderBottom:"1px solid #eee",
          display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12,
          position:"sticky", top:0, background:"#fff", zIndex:2,
        }}>
          <div style={{flex:1}}>
            <div style={{fontSize:16, fontWeight:800, color:Dark}}>
              {T.bt_modal_title}
            </div>
            <div style={{fontSize:11, color:"#888", marginTop:2}}>
              {T.bt_modal_sub}
            </div>
          </div>
          <button onClick={onClose} disabled={loading} style={{
            ...B({
              width:32, height:32, borderRadius:8,
              background:"#f5f5f5", color:"#666", fontSize:16, fontWeight:700,
              opacity:loading?.4:1,
            })
          }}>x</button>
        </div>
        <div style={{padding:"18px 22px"}}>
          <div style={{
            background:"#fafafa", border:"1px solid #eee",
            borderRadius:9, padding:"10px 13px", marginBottom:14,
          }}>
            <div style={{
              fontSize:9, fontWeight:800, color:"#888",
              letterSpacing:1, textTransform:"uppercase", marginBottom:5,
            }}>{T.bt_original}</div>
            <div style={{fontSize:12, color:"#555", lineHeight:1.5, fontStyle:"italic"}}>
              "{original}"
            </div>
          </div>
          {loading && (
            <div style={{
              padding:"36px 20px", textAlign:"center",
              background:"linear-gradient(135deg,#fdfaf3,#f8f4ec)",
              borderRadius:12,
            }}>
              <div style={{
                width:48, height:48, margin:"0 auto 12px",
                border:"3px solid "+Gold+"33", borderTopColor:Gold,
                borderRadius:"50%",
                animation:"cvfSpin 1s linear infinite",
              }}/>
              <div style={{fontSize:13, fontWeight:700, color:Dark}}>
                {T.bt_loading}
              </div>
              <div style={{fontSize:11, color:"#888", marginTop:5}}>
                {T.bt_loading_sub}
              </div>
            </div>
          )}
          {!loading && levels && cards.map(c => levels[c.key] && (
            <div key={c.key} style={{
              border:"1px solid #e5e0d6", borderRadius:11,
              padding:"13px 15px", marginBottom:9,
              transition:"all 200ms",
            }}>
              <div style={{
                display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom:7,
              }}>
                <div style={{display:"flex", alignItems:"center", gap:8}}>
                  <span style={{
                    fontSize:10, fontWeight:800, color:"#fff",
                    background:c.color, padding:"3px 9px", borderRadius:11,
                    textTransform:"uppercase", letterSpacing:1,
                  }}>{c.label}</span>
                  <span style={{fontSize:10, color:"#888"}}>{c.hint}</span>
                </div>
                <button onClick={()=>onAdopt(levels[c.key])} style={{
                  ...B({
                    padding:"5px 11px", borderRadius:7,
                    background:Dark, color:"#fff",
                    fontSize:10, fontWeight:700,
                    textTransform:"uppercase", letterSpacing:1,
                  })
                }}>{T.bt_adopt}</button>
              </div>
              <div style={{
                fontSize:13, color:Dark, lineHeight:1.55,
              }}>
                {levels[c.key]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ), document.body);
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
      +" 3 exps chiffrees 2 formations 8 competences. " + NO_DASH;
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

function AdjustPanel({ cv, setCVFn, notify, apiKey, T, prefillInst, onPrefillConsumed }) {
  const [inst, setInst]     = useState("");
  const [load, setLoad]     = useState(false);
  const [hist, setHist]     = useState([]);
  const [raw, setRaw]       = useState("");
  const [impOpen, setImpOpen] = useState(false);
  const [imping, setImping] = useState(false);

  useEffect(() => {
    if (prefillInst && prefillInst.trim()) {
      setInst(prefillInst);
      if (onPrefillConsumed) onPrefillConsumed();
    }
  }, [prefillInst, onPrefillConsumed]);

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
      + " " + NO_DASH + "\n\n"
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
      + " " + NO_DASH + " UNIQUEMENT JSON.\nCV:\n" + raw;
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

function MatchPanel({ cv, setCVFn, notify, apiKey, T, onPackRequest }) {
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
    const p = "Expert recrutement. Decode l'offre fournie + reecris le CV pour matcher.\n"
      +"OFFRE:\n"+offer+"\nCV:\n"+cvT+"\n"
      +"REGLES: ne pas inventer, adapter mots-cles offre. " + NO_DASH + "\n"
      +"Sois precis et actionnable. Le decodage de l'offre doit reveler des elements caches.\n"
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
        {res.hidden_signals && res.hidden_signals.length > 0 && (
          <div style={{
            background:"#fef3c7", border:"1px solid #fbbf24",
            borderRadius:9, padding:"10px 13px", marginBottom:10,
          }}>
            <div style={{fontSize:10, fontWeight:700, color:"#92400e", marginBottom:6}}>
              Signaux caches dans l'offre
            </div>
            {res.hidden_signals.map((s,i) => (
              <div key={i} style={{fontSize:12, color:"#78350f", marginBottom:4, lineHeight:1.5}}>
                {"> "}{s}
              </div>
            ))}
          </div>
        )}
        {res.culture_decode && (
          <div style={{
            background:"#ede9fe", border:"1px solid #c4b5fd",
            borderRadius:9, padding:"10px 13px", marginBottom:10,
          }}>
            <div style={{fontSize:10, fontWeight:700, color:"#5b21b6", marginBottom:5}}>
              Culture entreprise (decodee)
            </div>
            <div style={{fontSize:12, color:"#4c1d95", lineHeight:1.5}}>
              {res.culture_decode}
            </div>
          </div>
        )}
        {res.seniority_decode && (
          <div style={{
            background:"#f0fdf4", border:"1px solid #86efac",
            borderRadius:9, padding:"10px 13px", marginBottom:10,
          }}>
            <div style={{fontSize:10, fontWeight:700, color:"#166534", marginBottom:5}}>
              Niveau attendu (decode)
            </div>
            <div style={{fontSize:12, color:"#14532d", lineHeight:1.5}}>
              {res.seniority_decode}
            </div>
          </div>
        )}
        {res.likely_interview_questions && res.likely_interview_questions.length > 0 && (
          <div style={{
            background:"#fee2e2", border:"1px solid #fca5a5",
            borderRadius:9, padding:"10px 13px", marginBottom:12,
          }}>
            <div style={{fontSize:10, fontWeight:700, color:"#991b1b", marginBottom:6}}>
              Questions probables en entretien
            </div>
            {res.likely_interview_questions.map((q,i) => (
              <div key={i} style={{fontSize:12, color:"#7f1d1d", marginBottom:4, lineHeight:1.5}}>
                {(i+1)+". "}{q}
              </div>
            ))}
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
        {onPackRequest && (
          <button onClick={()=>onPackRequest(offer, res)} style={{
            ...B({
              width:"100%", padding:13, borderRadius:11,
              background:"linear-gradient(135deg,"+Dark+","+Gold+")",
              color:"#fff", fontWeight:800, fontSize:14, marginBottom:8,
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            })
          }}>
            <span style={{fontSize:16}}>{">"}</span>
            <span>Generer la candidature complete</span>
          </button>
        )}
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
        <>
          <div style={{
            color:"rgba(255,255,255,.7)", fontSize:13,
            marginBottom:24, textAlign:"center", maxWidth:520,
          }}>
            Choisis ce qui correspond a ta situation :
          </div>
          <div style={{
            display:"flex", flexDirection:"row", gap:14,
            flexWrap:"wrap", justifyContent:"center",
            width:"100%", maxWidth:920,
          }}>
            {/* Carte 1 : J'ai deja un CV */}
            <button onClick={()=>setMode("import")} style={{
              ...B({
                flex:"1 1 240px", maxWidth:280, minHeight:200,
                padding:"22px 18px", borderRadius:15,
                background:"rgba(201,169,110,.15)",
                border:"2px solid "+Gold, color:"#fff",
                display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center", gap:10,
                textAlign:"center",
              })
            }}>
              <div style={{fontSize:36}}>+</div>
              <div style={{fontWeight:800, fontSize:16, color:Gold}}>
                J'ai deja un CV
              </div>
              <div style={{fontSize:12, opacity:.75, lineHeight:1.5}}>
                Importe ton CV (PDF, Word, texte) - l'IA le boost et l'optimise
              </div>
            </button>
            
            {/* Carte 2 : J'ai un CV ET une offre */}
            <button onClick={()=>{setMode("import-adapt");}} style={{
              ...B({
                flex:"1 1 240px", maxWidth:280, minHeight:200,
                padding:"22px 18px", borderRadius:15,
                background:"rgba(233,69,96,.12)",
                border:"2px solid #e94560", color:"#fff",
                display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center", gap:10,
                textAlign:"center",
              })
            }}>
              <div style={{fontSize:36}}>~</div>
              <div style={{fontWeight:800, fontSize:16, color:"#e94560"}}>
                J'adapte mon CV a une offre
              </div>
              <div style={{fontSize:12, opacity:.75, lineHeight:1.5}}>
                Importe ton CV + l'offre - l'IA adapte ton CV au job vise
              </div>
            </button>
            
            {/* Carte 3 : Je cree mon CV */}
            <button onClick={()=>{setMode("done");setTab("ai");setAiMode("generate");}} style={{
              ...B({
                flex:"1 1 240px", maxWidth:280, minHeight:200,
                padding:"22px 18px", borderRadius:15,
                background:"rgba(255,255,255,.07)",
                border:"2px solid rgba(255,255,255,.25)",
                color:"#fff",
                display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center", gap:10,
                textAlign:"center",
              })
            }}>
              <div style={{fontSize:36}}>*</div>
              <div style={{fontWeight:800, fontSize:16}}>
                Je cree un CV
              </div>
              <div style={{fontSize:12, opacity:.65, lineHeight:1.5}}>
                Pas encore de CV ? L'IA en genere un a partir de tes infos
              </div>
            </button>
          </div>
          
          <button onClick={()=>setMode("done")} style={{
            ...B({
              marginTop:24, padding:"9px 22px", borderRadius:9,
              background:"transparent",
              color:"rgba(255,255,255,.35)",
              fontWeight:500, fontSize:11, textAlign:"center",
            })
          }}>Ou commencer vierge</button>
        </>
      )}
      {(mode==="import" || mode==="import-adapt") && (
        <div style={{
          width:"100%", maxWidth:520,
          display:"flex", flexDirection:"column", gap:11,
        }}>
          <button onClick={()=>setMode(null)} style={{
            ...B({background:"none", color:"rgba(255,255,255,.4)", fontSize:12, textAlign:"left", marginBottom:6})
          }}>← Retour</button>
          
          {/* Barre d'étapes */}
          <div style={{
            display:"flex", justifyContent:"center", gap:8,
            marginBottom:14, fontSize:11,
          }}>
            <div style={{color:mode==="import-adapt"?"#e94560":Gold, fontWeight:700}}>1. Importer</div>
            <div style={{color:"rgba(255,255,255,.25)"}}>→</div>
            <div style={{color:"rgba(255,255,255,.4)"}}>{mode==="import-adapt"?"2. Coller l'offre":"2. Booster"}</div>
            <div style={{color:"rgba(255,255,255,.25)"}}>→</div>
            <div style={{color:"rgba(255,255,255,.4)"}}>{mode==="import-adapt"?"3. Adapter":"3. Telecharger"}</div>
          </div>
          
          <div style={{
            color:mode==="import-adapt"?"#e94560":Gold, fontSize:18, fontWeight:800,
            textAlign:"center", marginBottom:4,
          }}>{mode==="import-adapt"?"Importe d'abord ton CV":"Importe ton CV"}</div>
          <div style={{
            color:"rgba(255,255,255,.55)", fontSize:12,
            textAlign:"center", marginBottom:18, lineHeight:1.6,
          }}>{mode==="import-adapt"
            ? <>L'IA va d'abord structurer ton CV, puis tu colleras l'offre.<br/>Format accepte : PDF, Word, ou texte.</>
            : <>L'IA va lire ton CV et le restructurer automatiquement.<br/>Format accepte : PDF, Word, ou texte.</>
          }</div>
          
          {/* Bouton d'upload de fichier */}
          <input
            type="file"
            id="cv-file-upload"
            accept=".pdf,.docx,.txt"
            style={{display:"none"}}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const ext = file.name.split('.').pop().toLowerCase();
                if (ext === 'txt') {
                  const text = await file.text();
                  setRaw(text);
                } else if (ext === 'pdf') {
                  const pdfjsLib = await import('pdfjs-dist/build/pdf');
                  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                  const arrayBuffer = await file.arrayBuffer();
                  const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
                  let fullText = '';
                  for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n\n';
                  }
                  setRaw(fullText.trim());
                } else if (ext === 'docx') {
                  const mammoth = await import('mammoth/mammoth.browser');
                  const arrayBuffer = await file.arrayBuffer();
                  const result = await mammoth.extractRawText({arrayBuffer});
                  setRaw(result.value);
                } else {
                  alert('Format non supporte. Utilise PDF, DOCX ou TXT.');
                }
              } catch (err) {
                alert('Erreur lors de la lecture du fichier: ' + err.message);
              }
              e.target.value = '';
            }}
          />
          <button
            onClick={() => document.getElementById('cv-file-upload').click()}
            style={{
              ...B({
                padding:"22px 18px", borderRadius:13,
                background:mode==="import-adapt"?"rgba(233,69,96,.15)":"rgba(201,169,110,.18)",
                border:"2px dashed "+(mode==="import-adapt"?"#e94560":Gold),
                color:mode==="import-adapt"?"#e94560":Gold, fontWeight:800, fontSize:15,
                display:"flex", flexDirection:"column", alignItems:"center", gap:6,
              })
            }}
          >
            <div style={{fontSize:28, lineHeight:1}}>+</div>
            <div>Cliquer pour selectionner mon CV</div>
            <div style={{fontSize:11, opacity:.7, fontWeight:400}}>PDF, Word (.docx) ou texte (.txt)</div>
          </button>
          <div style={{
            textAlign:"center",
            color:"rgba(255,255,255,.3)",
            fontSize:11,
            margin:"6px 0",
          }}>- ou copier-coller le contenu -</div>
          
          <label style={{...LBL, color:"rgba(255,255,255,.5)", fontSize:11}}>Colle ton CV en texte brut</label>
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
                : (mode==="import-adapt"
                    ? "linear-gradient(135deg,#e94560,#c73850)"
                    : "linear-gradient(135deg,"+Gold+",#a07840)"),
              color:"#fff", fontWeight:800, fontSize:14,
            })
          }}>
            {imping ? T.ob_parsing : (mode==="import-adapt" ? "Continuer vers l'adaptation" : T.ob_parse)}
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


function AuditModal({ cv, country, setCountry, loading, result, msgIdx, messages, onRun, onClose, onApplySuggestion, onIntegrateKeywords, kwLoading }) {
  const countries = [
    ["FR", "France"], ["UK", "Royaume-Uni"], ["US", "Etats-Unis"],
    ["DE", "Allemagne"], ["CH", "Suisse"], ["BE", "Belgique"],
    ["LU", "Luxembourg"], ["ES", "Espagne"], ["IT", "Italie"],
    ["AE", "Emirats Arabes Unis"], ["CA", "Canada"], ["AUTO", "Auto-detection"],
  ];
  
  const verdictColor = (v) => {
    if (!v) return "#666";
    const x = v.toLowerCase();
    if (x.includes("rappelle")) return "#16a34a";
    if (x.includes("hesite")) return "#ca8a04";
    return "#dc2626";
  };
  
  const scoreColor = (s) => {
    if (s >= 80) return "#16a34a";
    if (s >= 65) return "#ca8a04";
    if (s >= 50) return "#ea580c";
    return "#dc2626";
  };
  
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:1000,
      background:"rgba(0,0,0,.75)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:20, fontFamily:"'Lato',sans-serif",
    }}>
      <div style={{
        background:"#fff", borderRadius:16, maxWidth:680, width:"100%",
        maxHeight:"92vh", overflowY:"auto", overflowX:"hidden",
        boxShadow:"0 20px 60px rgba(0,0,0,.4)",
      }}>
        {/* Header */}
        <div style={{
          padding:"20px 26px", borderBottom:"1px solid #eee",
          display:"flex", justifyContent:"space-between", alignItems:"center",
          position:"sticky", top:0, background:"#fff", zIndex:2,
        }}>
          <div>
            <div style={{fontSize:18, fontWeight:800, color:Dark}}>
              Audit IA Recruteur
            </div>
            <div style={{fontSize:11, color:"#888", marginTop:2}}>
              Analyse de ton CV par un recruteur senior virtuel
            </div>
          </div>
          <button onClick={onClose} style={{
            ...B({
              width:34, height:34, borderRadius:8,
              background:"#f5f5f5", color:"#666", fontSize:18,
              fontWeight:700,
            })
          }}>X</button>
        </div>
        
        {/* Body */}
        <div style={{padding:"22px 26px"}}>
          
          {/* Loader stylé */}
          {loading && (
            <div style={{
              padding:"40px 20px", textAlign:"center",
              background:"linear-gradient(135deg,#fdfaf3,#f8f4ec)",
              borderRadius:13, marginBottom:10,
            }}>
              <div style={{
                width:64, height:64, margin:"0 auto 18px",
                border:"4px solid "+Gold+"33",
                borderTopColor:Gold,
                borderRadius:"50%",
                animation:"spin 1s linear infinite",
              }}/>
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
                @keyframes pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.5; }
                }
              `}</style>
              <div style={{
                fontSize:14, fontWeight:700, color:Dark, marginBottom:6,
                animation:"pulse 1.6s ease-in-out infinite",
              }}>
                {messages[msgIdx]}
              </div>
              <div style={{fontSize:11, color:"#888"}}>
                L'analyse prend 15-30 secondes
              </div>
              {/* Progress bar fake */}
              <div style={{
                marginTop:18, height:4, background:"#e5dfd0",
                borderRadius:2, overflow:"hidden", width:200, margin:"18px auto 0",
              }}>
                <div style={{
                  height:"100%", background:Gold,
                  animation:"slide 2s ease-in-out infinite",
                  width:"40%",
                }}/>
                <style>{`
                  @keyframes slide {
                    0% { transform: translateX(-100%); }
                    50% { transform: translateX(150%); }
                    100% { transform: translateX(400%); }
                  }
                `}</style>
              </div>
            </div>
          )}
          
          {/* Form de pays - avant l'audit */}
          {!loading && !result && (
            <>
              <div style={{
                background:"#f8f4ec", border:"1px solid "+Gold+"55",
                borderRadius:11, padding:"14px 16px", marginBottom:18,
              }}>
                <div style={{fontSize:13, fontWeight:700, color:Dark, marginBottom:4}}>
                  L'audit recruteur va analyser ton CV en profondeur
                </div>
                <div style={{fontSize:12, color:"#666", lineHeight:1.6}}>
                  Score global, longueur, forces et faiblesses, mots-cles manquants, et verdict honnete d'un recruteur.
                </div>
              </div>
              
              <label style={{
                display:"block", fontSize:12, fontWeight:700,
                color:Dark, marginBottom:8, textTransform:"uppercase",
                letterSpacing:1,
              }}>
                Pays cible (marche du travail)
              </label>
              <select 
                value={country} 
                onChange={e=>setCountry(e.target.value)}
                style={{
                  width:"100%", padding:"12px 14px", borderRadius:10,
                  border:"1.5px solid #ddd", fontSize:14, color:Dark,
                  background:"#fff", marginBottom:10, fontFamily:"inherit",
                }}>
                {countries.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
              <div style={{
                fontSize:11, color:"#888", marginBottom:20, lineHeight:1.5,
              }}>
                Chaque pays a ses codes (longueur, format, mots-cles attendus). L'IA adapte l'audit en consequence.
              </div>
              
              <button onClick={onRun} style={{
                ...B({
                  width:"100%", padding:"15px 20px", borderRadius:11,
                  background:"linear-gradient(135deg,"+Gold+",#a07840)",
                  color:"#fff", fontWeight:800, fontSize:14,
                })
              }}>
                Lancer l'audit recruteur
              </button>
            </>
          )}
          
          {/* Résultat de l'audit */}
          {!loading && result && (
            <>
              {/* Score global + verdict */}
              <div style={{
                display:"flex", gap:12, marginBottom:18,
              }}>
                <div style={{
                  flex:1, padding:"18px 16px", borderRadius:12,
                  background:scoreColor(result.score_global)+"15",
                  border:"2px solid "+scoreColor(result.score_global),
                  textAlign:"center",
                }}>
                  <div style={{fontSize:11, color:"#666", fontWeight:600, marginBottom:4}}>SCORE GLOBAL</div>
                  <div style={{fontSize:36, fontWeight:800, color:scoreColor(result.score_global), lineHeight:1}}>
                    {result.score_global}
                  </div>
                  <div style={{fontSize:11, color:"#666", marginTop:4}}>/ 100</div>
                </div>
                <div style={{
                  flex:1.5, padding:"14px 16px", borderRadius:12,
                  background:verdictColor(result.verdict_recruteur)+"15",
                  border:"2px solid "+verdictColor(result.verdict_recruteur),
                }}>
                  <div style={{fontSize:11, color:"#666", fontWeight:600, marginBottom:4}}>VERDICT RECRUTEUR</div>
                  <div style={{fontSize:18, fontWeight:800, color:verdictColor(result.verdict_recruteur), lineHeight:1.2, marginBottom:6}}>
                    {result.verdict_recruteur}
                  </div>
                  <div style={{fontSize:11, color:"#444", lineHeight:1.5}}>
                    {result.raison_verdict}
                  </div>
                </div>
              </div>
              
              {/* Première impression */}
              {result.premiere_impression && (
                <div style={{
                  background:"#f8f4ec", borderLeft:"3px solid "+Gold,
                  padding:"12px 14px", borderRadius:6, marginBottom:18,
                  fontSize:12, color:"#444", fontStyle:"italic", lineHeight:1.6,
                }}>
                  <div style={{fontSize:10, fontWeight:700, color:Gold, textTransform:"uppercase", letterSpacing:1, marginBottom:4, fontStyle:"normal"}}>
                    Premiere impression (5 sec)
                  </div>
                  "{result.premiere_impression}"
                </div>
              )}
              
              {/* Verdict longueur */}
              {result.verdict_longueur && (
                <div style={{
                  padding:"10px 14px", borderRadius:9,
                  background:"#fff8e1", border:"1px solid #ffc107",
                  marginBottom:14, fontSize:12, color:"#664d03", lineHeight:1.6,
                }}>
                  <strong>Longueur :</strong> {result.verdict_longueur}
                  {result.longueur_recommandation && <><br/><span style={{fontSize:11}}>{result.longueur_recommandation}</span></>}
                </div>
              )}
              
              {/* Forces */}
              {result.forces && result.forces.length > 0 && (
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:13, fontWeight:800, color:"#16a34a", marginBottom:8, textTransform:"uppercase", letterSpacing:1}}>
                    Forces
                  </div>
                  {result.forces.map((f, i) => (
                    <div key={i} style={{
                      padding:"8px 12px", marginBottom:6, borderRadius:7,
                      background:"#dcfce7", color:"#15803d", fontSize:12, lineHeight:1.5,
                    }}>+ {f}</div>
                  ))}
                </div>
              )}
              
              {/* Faiblesses */}
              {result.faiblesses && result.faiblesses.length > 0 && (
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:13, fontWeight:800, color:"#dc2626", marginBottom:8, textTransform:"uppercase", letterSpacing:1}}>
                    Faiblesses
                  </div>
                  {result.faiblesses.map((f, i) => (
                    <div key={i} style={{
                      padding:"8px 12px", marginBottom:6, borderRadius:7,
                      background:"#fee2e2", color:"#991b1b", fontSize:12, lineHeight:1.5,
                    }}>- {f}</div>
                  ))}
                </div>
              )}
              
              {/* Suggestions */}
              {result.suggestions && result.suggestions.length > 0 && (
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:13, fontWeight:800, color:Gold, marginBottom:8, textTransform:"uppercase", letterSpacing:1}}>
                    Suggestions actionnables
                  </div>
                  <div style={{fontSize:11, color:"#888", marginBottom:8, fontStyle:"italic"}}>
                    Clique sur une suggestion pour l'envoyer dans Ajuster
                  </div>
                  {result.suggestions.map((s, i) => (
                    <button key={i}
                      onClick={()=>onApplySuggestion && onApplySuggestion(s)}
                      style={{
                        ...B({
                          width:"100%", textAlign:"left",
                          padding:"10px 14px", marginBottom:6, borderRadius:8,
                          background:"#f8f4ec", border:"1px solid "+Gold+"33",
                          fontSize:12, lineHeight:1.6, color:Dark,
                          display:"flex", gap:8, alignItems:"flex-start",
                          fontFamily:"inherit",
                          transition:"all .15s",
                        })
                      }}
                      onMouseEnter={e=>{
                        e.currentTarget.style.background="#fdfaf3";
                        e.currentTarget.style.borderColor=Gold;
                      }}
                      onMouseLeave={e=>{
                        e.currentTarget.style.background="#f8f4ec";
                        e.currentTarget.style.borderColor=Gold+"33";
                      }}>
                      <span style={{color:Gold, fontWeight:800, flexShrink:0}}>{i+1}.</span>
                      <span style={{flex:1}}>{s}</span>
                      <span style={{color:Gold, fontSize:14, fontWeight:700, flexShrink:0}}>{">"}</span>
                    </button>
                  ))}
                </div>
              )}
              
              {/* Mots-clés manquants */}
              {result.mots_cles_manquants && result.mots_cles_manquants.length > 0 && (
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:13, fontWeight:800, color:Dark, marginBottom:8, textTransform:"uppercase", letterSpacing:1}}>
                    Mots-cles a ajouter (ATS)
                  </div>
                  <div style={{display:"flex", flexWrap:"wrap", gap:6, marginBottom:10}}>
                    {result.mots_cles_manquants.map((k, i) => (
                      <span key={i} style={{
                        padding:"5px 11px", borderRadius:14,
                        background:Dark, color:Gold, fontSize:11, fontWeight:600,
                      }}>{k}</span>
                    ))}
                  </div>
                  <button
                    onClick={()=>onIntegrateKeywords && onIntegrateKeywords(result.mots_cles_manquants)}
                    disabled={kwLoading}
                    style={{
                      ...B({
                        width:"100%", padding:"11px", borderRadius:10,
                        background:kwLoading?"#ccc":"linear-gradient(135deg,"+Dark+","+Gold+")",
                        color:"#fff", fontWeight:700, fontSize:13,
                        cursor:kwLoading?"wait":"pointer",
                      })
                    }}>
                    {kwLoading ? "Integration en cours..." : "Integrer ces mots-cles dans le CV"}
                  </button>
                  <div style={{fontSize:10, color:"#888", marginTop:6, textAlign:"center", lineHeight:1.5}}>
                    L'IA placera intelligemment les mots-cles dans tes bullets et ton accroche, sans bourrage.
                  </div>
                </div>
              )}
              
              <button onClick={onRun} style={{
                ...B({
                  width:"100%", padding:12, borderRadius:10,
                  background:"#f0f0f0", color:"#666", fontWeight:700, fontSize:13,
                  marginTop:8,
                })
              }}>
                Relancer l'audit
              </button>
            </>
          )}
          
        </div>
      </div>
    </div>
  );
}

function TranslateModal({ T, dir, setDir, loading, msgIdx, hasBackup, onRun, onClose }) {
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:1000,
      background:"rgba(0,0,0,.75)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:20, fontFamily:"'Lato',sans-serif",
    }}>
      <div style={{
        background:"#fff", borderRadius:16, maxWidth:520, width:"100%",
        maxHeight:"92vh", overflowY:"auto", overflowX:"hidden",
        boxShadow:"0 20px 60px rgba(0,0,0,.4)",
      }}>
        <div style={{
          padding:"20px 26px", borderBottom:"1px solid #eee",
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <div>
            <div style={{fontSize:18, fontWeight:800, color:Dark}}>
              {T.tr_title}
            </div>
            <div style={{fontSize:11, color:"#888", marginTop:2}}>
              {T.tr_sub}
            </div>
          </div>
          <button onClick={onClose} disabled={loading} style={{
            ...B({
              width:34, height:34, borderRadius:8,
              background:"#f5f5f5", color:"#666", fontSize:18,
              fontWeight:700, opacity:loading?.4:1,
            })
          }}>X</button>
        </div>

        <div style={{padding:"22px 26px"}}>
          {loading ? (
            <div style={{
              padding:"40px 20px", textAlign:"center",
              background:"linear-gradient(135deg,#fdfaf3,#f8f4ec)",
              borderRadius:13,
            }}>
              <div style={{
                width:64, height:64, margin:"0 auto 18px",
                border:"4px solid "+Gold+"33",
                borderTopColor:Gold,
                borderRadius:"50%",
                animation:"spin 1s linear infinite",
              }}/>
              <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }
                @keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }
              `}</style>
              <div style={{
                fontSize:14, fontWeight:700, color:Dark, marginBottom:6,
                animation:"pulse 1.6s ease-in-out infinite",
              }}>
                {T.tr_msgs[msgIdx]}
              </div>
              <div style={{fontSize:11, color:"#888"}}>
                {T.tr_loading}
              </div>
              <div style={{
                marginTop:18, height:4, background:"#e5dfd0",
                borderRadius:2, overflow:"hidden", width:200, margin:"18px auto 0",
                position:"relative",
              }}>
                <div style={{
                  height:"100%", background:Gold,
                  animation:"slide 2s ease-in-out infinite",
                  width:"40%",
                }}/>
              </div>
            </div>
          ) : (
            <>
              <div style={{
                fontSize:11, fontWeight:700, color:"#888",
                textTransform:"uppercase", letterSpacing:1,
                marginBottom:10,
              }}>{T.tr_dir}</div>
              <div style={{display:"flex", gap:8, marginBottom:18}}>
                {[
                  ["fr_en", T.tr_fr_en],
                  ["en_fr", T.tr_en_fr],
                ].map(([k,l]) => (
                  <button key={k} onClick={()=>setDir(k)} style={{
                    ...B({
                      flex:1, padding:"12px 10px", borderRadius:10,
                      border:"2px solid "+(dir===k?Gold:"#e5e0d6"),
                      background:dir===k?"#fdfaf3":"#fff",
                      color:dir===k?Dark:"#666",
                      fontWeight:dir===k?700:500, fontSize:12,
                    })
                  }}>{l}</button>
                ))}
              </div>

              <div style={{
                padding:"12px 14px", background:"#fff8eb",
                border:"1px solid #f0e0a8", borderRadius:9,
                fontSize:12, color:"#664d00", lineHeight:1.6,
                marginBottom:18,
              }}>{T.tr_warn}</div>

              <button onClick={onRun} style={{
                ...B({
                  width:"100%", padding:"14px", borderRadius:11,
                  background:"linear-gradient(135deg,"+Dark+","+Gold+")",
                  color:"#fff", fontWeight:800, fontSize:14,
                })
              }}>{T.tr_run}</button>

              {hasBackup && (
                <div style={{
                  marginTop:12, fontSize:11, color:"#888",
                  textAlign:"center", lineHeight:1.5,
                }}>
                  {T.tr_hint_backup}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


function ApplicationPackModal({ pack, loading, msgIdx, onClose, onCopy }) {
  const [activeTab, setActiveTab] = useState("cover");
  const tabs = [
    ["cover",   "Lettre"],
    ["linkedin","LinkedIn"],
    ["email",   "Email"],
    ["pitch",   "Pitch"],
    ["star",    "Reponses STAR"],
  ];
  const loadingMsgs = [
    "Redaction de la lettre de motivation...",
    "Composition du message LinkedIn...",
    "Preparation de l'email de candidature...",
    "Construction du pitch d'entretien...",
    "Generation des reponses STAR...",
    "Finalisation de la candidature...",
  ];
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:1000,
      background:"rgba(0,0,0,.75)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:20, fontFamily:"'Lato',sans-serif",
    }}>
      <div style={{
        background:"#fff", borderRadius:16, maxWidth:780, width:"100%",
        maxHeight:"92vh", overflowY:"auto", overflowX:"hidden",
        boxShadow:"0 20px 60px rgba(0,0,0,.4)",
      }}>
        <div style={{
          padding:"20px 26px", borderBottom:"1px solid #eee",
          display:"flex", justifyContent:"space-between", alignItems:"center",
          position:"sticky", top:0, background:"#fff", zIndex:2,
        }}>
          <div>
            <div style={{fontSize:18, fontWeight:800, color:Dark}}>
              Candidature complete
            </div>
            <div style={{fontSize:11, color:"#888", marginTop:2}}>
              CV + Lettre + LinkedIn + Email + Pitch + STAR
            </div>
          </div>
          <button onClick={onClose} disabled={loading} style={{
            ...B({
              width:34, height:34, borderRadius:8,
              background:"#f5f5f5", color:"#666", fontSize:18, fontWeight:700,
              opacity:loading?.4:1,
            })
          }}>X</button>
        </div>

        <div style={{padding:"22px 26px"}}>
          {loading ? (
            <div style={{
              padding:"40px 20px", textAlign:"center",
              background:"linear-gradient(135deg,#fdfaf3,#f8f4ec)",
              borderRadius:13,
            }}>
              <div style={{
                width:64, height:64, margin:"0 auto 18px",
                border:"4px solid "+Gold+"33",
                borderTopColor:Gold,
                borderRadius:"50%",
                animation:"spin 1s linear infinite",
              }}/>
              <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }
                @keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }
              `}</style>
              <div style={{
                fontSize:14, fontWeight:700, color:Dark, marginBottom:6,
                animation:"pulse 1.6s ease-in-out infinite",
              }}>
                {loadingMsgs[msgIdx % loadingMsgs.length]}
              </div>
              <div style={{fontSize:11, color:"#888"}}>
                La generation prend 25-40 secondes
              </div>
              <div style={{
                marginTop:18, height:4, background:"#e5dfd0",
                borderRadius:2, overflow:"hidden", width:200, margin:"18px auto 0",
              }}>
                <div style={{
                  height:"100%", background:Gold,
                  animation:"slide 2s ease-in-out infinite",
                  width:"40%",
                }}/>
              </div>
            </div>
          ) : pack ? (
            <>
              <div style={{
                display:"flex", gap:4, marginBottom:18,
                borderBottom:"1px solid #eee", overflowX:"auto",
              }}>
                {tabs.map(([k,l]) => (
                  <button key={k} onClick={()=>setActiveTab(k)} style={{
                    ...B({
                      padding:"9px 14px", borderRadius:0,
                      background:"transparent",
                      color:activeTab===k?Dark:"#888",
                      fontWeight:activeTab===k?700:500, fontSize:12,
                      borderBottom:activeTab===k?"2.5px solid "+Gold:"2.5px solid transparent",
                      whiteSpace:"nowrap", flexShrink:0,
                    })
                  }}>{l}</button>
                ))}
              </div>

              {activeTab==="cover" && pack.cover_letter && (
                <div>
                  <Section title="Lettre de motivation" content={pack.cover_letter} onCopy={onCopy}/>
                </div>
              )}
              {activeTab==="linkedin" && pack.linkedin_message && (
                <div>
                  <Section title="Message LinkedIn au recruteur" content={pack.linkedin_message} onCopy={onCopy}/>
                </div>
              )}
              {activeTab==="email" && pack.application_email && (
                <div>
                  {pack.application_email.subject && (
                    <Section title="Objet de l'email" content={pack.application_email.subject} onCopy={onCopy} small/>
                  )}
                  {pack.application_email.body && (
                    <Section title="Corps de l'email" content={pack.application_email.body} onCopy={onCopy}/>
                  )}
                </div>
              )}
              {activeTab==="pitch" && pack.interview_pitch && (
                <div>
                  <div style={{
                    fontSize:11, color:"#888", marginBottom:8, fontStyle:"italic",
                  }}>
                    Reponse a "Tell me about yourself" - 60 secondes max
                  </div>
                  <Section title="Pitch d'introduction" content={pack.interview_pitch} onCopy={onCopy}/>
                </div>
              )}
              {activeTab==="star" && pack.star_answers && pack.star_answers.length > 0 && (
                <div>
                  <div style={{
                    fontSize:11, color:"#888", marginBottom:14, fontStyle:"italic",
                  }}>
                    Reponses preparees aux questions probables (methode STAR)
                  </div>
                  {pack.star_answers.map((qa, i) => (
                    <div key={i} style={{
                      marginBottom:18, paddingBottom:14,
                      borderBottom:i < pack.star_answers.length-1 ? "1px solid #eee" : "none",
                    }}>
                      <div style={{
                        fontSize:12, fontWeight:700, color:Dark, marginBottom:8,
                        background:"#fef3c7", padding:"8px 11px", borderRadius:7,
                      }}>
                        Q{i+1}: {qa.question}
                      </div>
                      {["situation","task","action","result"].map(k => qa[k] && (
                        <div key={k} style={{marginBottom:7}}>
                          <div style={{
                            fontSize:9, fontWeight:800, color:Gold,
                            textTransform:"uppercase", letterSpacing:1, marginBottom:3,
                          }}>{k}</div>
                          <div style={{
                            fontSize:12, color:"#444", lineHeight:1.6,
                            paddingLeft:10, borderLeft:"2px solid "+Gold+"55",
                          }}>{qa[k]}</div>
                        </div>
                      ))}
                      <button onClick={()=>onCopy && onCopy(
                        "Q: "+qa.question+"\n\n"
                        +"S: "+(qa.situation||"")+"\n"
                        +"T: "+(qa.task||"")+"\n"
                        +"A: "+(qa.action||"")+"\n"
                        +"R: "+(qa.result||"")
                      )} style={{
                        ...B({
                          marginTop:6, padding:"6px 11px", borderRadius:6,
                          background:"#f5f5f5", color:"#666", fontSize:11, fontWeight:600,
                        })
                      }}>Copier cette reponse</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Section({ title, content, onCopy, small }) {
  return (
    <div style={{marginBottom:14}}>
      <div style={{
        display:"flex", justifyContent:"space-between", alignItems:"center",
        marginBottom:6,
      }}>
        <div style={{fontSize:11, fontWeight:700, color:Gold, textTransform:"uppercase", letterSpacing:1}}>
          {title}
        </div>
        <button onClick={()=>onCopy && onCopy(content)} style={{
          ...B({
            padding:"5px 11px", borderRadius:6,
            background:"#f5f5f5", color:"#666", fontSize:11, fontWeight:600,
          })
        }}>Copier</button>
      </div>
      <div style={{
        background:"#fdfaf3", border:"1px solid "+Gold+"33",
        borderRadius:9, padding:"12px 14px",
        fontSize:small?12:13, color:"#333", lineHeight:1.7,
        whiteSpace:"pre-wrap", fontFamily:"'Lato',sans-serif",
      }}>
        {content}
      </div>
    </div>
  );
}


function PositioningModal({ result, loading, onAdopt, onClose }) {
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:1000,
      background:"rgba(0,0,0,.75)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:20, fontFamily:"'Lato',sans-serif",
    }}>
      <div style={{
        background:"#fff", borderRadius:16, maxWidth:780, width:"100%",
        maxHeight:"92vh", overflowY:"auto",
        boxShadow:"0 20px 60px rgba(0,0,0,.4)",
      }}>
        <div style={{
          padding:"20px 26px", borderBottom:"1px solid #eee",
          display:"flex", justifyContent:"space-between", alignItems:"center",
          position:"sticky", top:0, background:"#fff", zIndex:2,
        }}>
          <div>
            <div style={{fontSize:18, fontWeight:800, color:Dark}}>
              Positionnement de carriere
            </div>
            <div style={{fontSize:11, color:"#888", marginTop:2}}>
              3 angles strategiques pour ton parcours
            </div>
          </div>
          <button onClick={onClose} disabled={loading} style={{
            ...B({
              width:34, height:34, borderRadius:8,
              background:"#f5f5f5", color:"#666", fontSize:18, fontWeight:700,
              opacity:loading?.4:1,
            })
          }}>X</button>
        </div>
        <div style={{padding:"22px 26px"}}>
          {loading && (
            <div style={{
              padding:"40px 20px", textAlign:"center",
              background:"linear-gradient(135deg,#fdfaf3,#f8f4ec)",
              borderRadius:13,
            }}>
              <div style={{
                width:64, height:64, margin:"0 auto 18px",
                border:"4px solid "+Gold+"33", borderTopColor:Gold,
                borderRadius:"50%", animation:"spin 1s linear infinite",
              }}/>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <div style={{fontSize:14, fontWeight:700, color:Dark}}>
                Analyse strategique de ton parcours...
              </div>
              <div style={{fontSize:11, color:"#888", marginTop:6}}>
                15-25 secondes
              </div>
            </div>
          )}
          {!loading && result && result.angles && result.angles.map((a, i) => (
            <div key={i} style={{
              border:"1px solid #e5e0d6", borderRadius:11,
              padding:"16px 18px", marginBottom:12,
              background:i===0?"#fdfaf3":"#fff",
            }}>
              <div style={{
                display:"flex", alignItems:"center", gap:8, marginBottom:8,
              }}>
                <span style={{
                  fontSize:11, fontWeight:800, color:"#fff",
                  background:Gold, padding:"3px 9px", borderRadius:11,
                  letterSpacing:1, textTransform:"uppercase",
                }}>Angle {i+1}</span>
                {a.salary_range && (
                  <span style={{
                    fontSize:11, color:"#16a34a", fontWeight:700,
                    background:"#dcfce7", padding:"3px 9px", borderRadius:11,
                  }}>{a.salary_range}</span>
                )}
              </div>
              <div style={{fontSize:17, fontWeight:800, color:Dark, marginBottom:6}}>
                {a.title}
              </div>
              {a.credibility && (
                <div style={{fontSize:12, color:"#555", lineHeight:1.6, marginBottom:10}}>
                  {a.credibility}
                </div>
              )}
              {a.key_points && a.key_points.length > 0 && (
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:10, fontWeight:700, color:Gold, marginBottom:5, textTransform:"uppercase", letterSpacing:1}}>
                    A mettre en avant
                  </div>
                  {a.key_points.map((p,j) => (
                    <div key={j} style={{fontSize:12, color:"#333", marginBottom:3, paddingLeft:8}}>
                      {"+ "}{p}
                    </div>
                  ))}
                </div>
              )}
              {a.target_employers && (
                <div style={{
                  fontSize:11, color:"#666",
                  background:"#f5f5f5", padding:"7px 10px", borderRadius:7,
                  marginBottom:10,
                }}>
                  <strong>Cible:</strong> {a.target_employers}
                </div>
              )}
              {a.new_summary && (
                <div style={{
                  background:"#fff8eb", border:"1px solid #f0e0a8",
                  borderRadius:7, padding:"9px 11px", marginBottom:10,
                  fontSize:11, color:"#664d00", fontStyle:"italic", lineHeight:1.6,
                }}>
                  "{a.new_summary}"
                </div>
              )}
              <button onClick={()=>onAdopt(a)} style={{
                ...B({
                  width:"100%", padding:"10px", borderRadius:9,
                  background:"linear-gradient(135deg,"+Dark+","+Gold+")",
                  color:"#fff", fontWeight:700, fontSize:12,
                })
              }}>
                Adopter cet angle (titre + accroche)
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function TruthModal({ result, loading, onClose, onApplyFix }) {
  const typeColor = (t) => {
    const c = (t||"").toLowerCase();
    if (c.includes("bullshit") || c.includes("pretentieux")) return "#dc2626";
    if (c.includes("incoherent") || c.includes("risque")) return "#dc2626";
    if (c.includes("vague") || c.includes("generique")) return "#ea580c";
    if (c.includes("faible")) return "#ca8a04";
    return "#666";
  };
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:1000,
      background:"rgba(0,0,0,.75)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:20, fontFamily:"'Lato',sans-serif",
    }}>
      <div style={{
        background:"#fff", borderRadius:16, maxWidth:760, width:"100%",
        maxHeight:"92vh", overflowY:"auto",
        boxShadow:"0 20px 60px rgba(0,0,0,.4)",
      }}>
        <div style={{
          padding:"20px 26px", borderBottom:"1px solid #eee",
          display:"flex", justifyContent:"space-between", alignItems:"center",
          position:"sticky", top:0, background:"#fff", zIndex:2,
        }}>
          <div>
            <div style={{fontSize:18, fontWeight:800, color:Dark}}>
              Truth Check
            </div>
            <div style={{fontSize:11, color:"#888", marginTop:2}}>
              Phrases faibles, vagues ou risquees detectees
            </div>
          </div>
          <button onClick={onClose} disabled={loading} style={{
            ...B({
              width:34, height:34, borderRadius:8,
              background:"#f5f5f5", color:"#666", fontSize:18, fontWeight:700,
              opacity:loading?.4:1,
            })
          }}>X</button>
        </div>
        <div style={{padding:"22px 26px"}}>
          {loading && (
            <div style={{
              padding:"40px 20px", textAlign:"center",
              background:"linear-gradient(135deg,#fdfaf3,#f8f4ec)",
              borderRadius:13,
            }}>
              <div style={{
                width:64, height:64, margin:"0 auto 18px",
                border:"4px solid "+Gold+"33", borderTopColor:Gold,
                borderRadius:"50%", animation:"spin 1s linear infinite",
              }}/>
              <div style={{fontSize:14, fontWeight:700, color:Dark}}>
                Analyse honnete de ton CV...
              </div>
              <div style={{fontSize:11, color:"#888", marginTop:6}}>
                15-25 secondes
              </div>
            </div>
          )}
          {!loading && result && (
            <>
              {result.overall_verdict && (
                <div style={{
                  background:"#fef3c7", border:"1px solid #fbbf24",
                  borderRadius:9, padding:"12px 14px", marginBottom:14,
                  fontSize:13, color:"#78350f", lineHeight:1.6,
                }}>
                  <strong>Verdict global: </strong>{result.overall_verdict}
                </div>
              )}
              {result.issues && result.issues.length > 0 ? result.issues.map((iss, i) => (
                <div key={i} style={{
                  border:"1px solid #e5e0d6", borderRadius:10,
                  padding:"13px 15px", marginBottom:10,
                }}>
                  <div style={{display:"flex", gap:8, alignItems:"center", marginBottom:7, flexWrap:"wrap"}}>
                    <span style={{
                      fontSize:10, fontWeight:800, color:"#fff",
                      background:typeColor(iss.type),
                      padding:"3px 9px", borderRadius:10,
                      textTransform:"uppercase", letterSpacing:1,
                    }}>{iss.type || "issue"}</span>
                    {iss.location && (
                      <span style={{
                        fontSize:10, color:"#666",
                        background:"#f5f5f5", padding:"3px 8px", borderRadius:8,
                        fontFamily:"monospace",
                      }}>{iss.location}</span>
                    )}
                  </div>
                  <div style={{
                    fontSize:12, color:"#666", fontStyle:"italic",
                    background:"#fee2e2", padding:"7px 10px", borderRadius:6,
                    marginBottom:7, lineHeight:1.5,
                  }}>
                    "{iss.quote}"
                  </div>
                  {iss.why && (
                    <div style={{fontSize:11, color:"#7f1d1d", marginBottom:8, lineHeight:1.5}}>
                      <strong>Pourquoi: </strong>{iss.why}
                    </div>
                  )}
                  {iss.fix && (
                    <div style={{
                      background:"#dcfce7", border:"1px solid #86efac",
                      borderRadius:7, padding:"8px 11px",
                      fontSize:12, color:"#14532d", lineHeight:1.6,
                    }}>
                      <div style={{fontSize:9, fontWeight:800, color:"#16a34a", marginBottom:3, textTransform:"uppercase", letterSpacing:1}}>
                        Reformulation proposee
                      </div>
                      {iss.fix}
                    </div>
                  )}
                  {iss.fix && onApplyFix && (
                    <button onClick={()=>onApplyFix(iss)} style={{
                      ...B({
                        marginTop:8, width:"100%", padding:"8px", borderRadius:7,
                        background:"#fdfaf3", border:"1px solid "+Gold+"55",
                        color:Dark, fontWeight:600, fontSize:11,
                      })
                    }}>
                      Envoyer cette correction dans Ajuster
                    </button>
                  )}
                </div>
              )) : (
                <div style={{
                  textAlign:"center", padding:"30px 20px",
                  fontSize:14, color:"#16a34a", fontWeight:700,
                }}>
                  Aucun probleme majeur detecte
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


function VersionsModal({ versions, currentCv, onSave, onLoad, onDelete, onClose }) {
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:1000,
      background:"rgba(0,0,0,.75)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:20, fontFamily:"'Lato',sans-serif",
    }}>
      <div style={{
        background:"#fff", borderRadius:16, maxWidth:560, width:"100%",
        maxHeight:"92vh", overflowY:"auto",
        boxShadow:"0 20px 60px rgba(0,0,0,.4)",
      }}>
        <div style={{
          padding:"20px 26px", borderBottom:"1px solid #eee",
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <div>
            <div style={{fontSize:18, fontWeight:800, color:Dark}}>
              Versions de CV
            </div>
            <div style={{fontSize:11, color:"#888", marginTop:2}}>
              Sauvegarde plusieurs versions selon les cibles
            </div>
          </div>
          <button onClick={onClose} style={{
            ...B({
              width:34, height:34, borderRadius:8,
              background:"#f5f5f5", color:"#666", fontSize:18, fontWeight:700,
            })
          }}>X</button>
        </div>
        <div style={{padding:"22px 26px"}}>
          <button onClick={onSave} style={{
            ...B({
              width:"100%", padding:13, borderRadius:11,
              background:"linear-gradient(135deg,"+Dark+","+Gold+")",
              color:"#fff", fontWeight:700, fontSize:13, marginBottom:18,
            })
          }}>
            + Sauvegarder la version actuelle
          </button>
          {versions.length === 0 ? (
            <div style={{
              textAlign:"center", padding:"30px 20px",
              fontSize:13, color:"#888",
              background:"#fafafa", borderRadius:10,
            }}>
              Aucune version sauvegardee.
              <br/>
              <span style={{fontSize:11}}>
                Sauvegarde le CV actuel pour pouvoir le restaurer plus tard.
              </span>
            </div>
          ) : (
            <div>
              <div style={{fontSize:11, fontWeight:700, color:"#888", marginBottom:8, textTransform:"uppercase", letterSpacing:1}}>
                Versions sauvegardees ({versions.length})
              </div>
              {versions.map(v => (
                <div key={v.id} style={{
                  border:"1px solid #e5e0d6", borderRadius:10,
                  padding:"12px 14px", marginBottom:8,
                }}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6}}>
                    <div>
                      <div style={{fontSize:14, fontWeight:700, color:Dark}}>
                        {v.name}
                      </div>
                      <div style={{fontSize:10, color:"#888", marginTop:2}}>
                        {v.cv && v.cv.title ? v.cv.title : ""} {v.cv && v.cv.name ? "- "+v.cv.name : ""}
                      </div>
                      <div style={{fontSize:10, color:"#aaa", marginTop:2}}>
                        {new Date(v.created).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div style={{display:"flex", gap:6}}>
                    <button onClick={()=>onLoad(v.id)} style={{
                      ...B({
                        flex:1, padding:"7px 11px", borderRadius:7,
                        background:"#fdfaf3", border:"1px solid "+Gold+"55",
                        color:Dark, fontWeight:600, fontSize:11,
                      })
                    }}>Charger</button>
                    <button onClick={()=>onDelete(v.id)} style={{
                      ...B({
                        padding:"7px 11px", borderRadius:7,
                        background:"#fee2e2", border:"1px solid #fca5a5",
                        color:"#dc2626", fontWeight:600, fontSize:11,
                      })
                    }}>Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
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
  const [showAudit, setShowAudit] = useState(false);
  const [auditCountry, setAuditCountry] = useState("FR");
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult]   = useState(null);
  const [auditMsgIdx, setAuditMsgIdx]   = useState(0);
  const [showTranslate, setShowTranslate] = useState(false);
  const [trDir, setTrDir] = useState("fr_en");
  const [trLoading, setTrLoading] = useState(false);
  const [trMsgIdx, setTrMsgIdx] = useState(0);
  const [hasBackup, setHasBackup] = useState(false);
  const [adjPrefill, setAdjPrefill] = useState("");
  const [kwLoading, setKwLoading] = useState(false);
  const [showPack, setShowPack]   = useState(false);
  const [packLoading, setPackLoading] = useState(false);
  const [packResult, setPackResult]   = useState(null);
  const [packMsgIdx, setPackMsgIdx]   = useState(0);
  const [packCtx, setPackCtx]         = useState(null);
  const [showPos, setShowPos]         = useState(false);
  const [posLoading, setPosLoading]   = useState(false);
  const [posResult, setPosResult]     = useState(null);
  const [showTruth, setShowTruth]     = useState(false);
  const [truthLoading, setTruthLoading] = useState(false);
  const [truthResult, setTruthResult] = useState(null);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions]       = useState(() => lsG(SK.VS, []));
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

  const auditMessages = [
    "Analyse de ton parcours en cours...",
    "Comparaison aux standards du marche local...",
    "Identification des forces et faiblesses...",
    "Verification des mots-cles ATS...",
    "Evaluation de la longueur et structure...",
    "Generation des recommandations...",
  ];
  
  useEffect(() => {
    if (!auditLoading) return;
    const interval = setInterval(() => {
      setAuditMsgIdx(i => (i + 1) % auditMessages.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [auditLoading]);

  useEffect(() => {
    setHasBackup(!!lsG(SK.BK));
  }, []);

  useEffect(() => {
    if (!trLoading) return;
    const interval = setInterval(() => {
      setTrMsgIdx(i => (i + 1) % T.tr_msgs.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [trLoading, T]);
  
  const runAudit = useCallback(async () => {
    setAuditLoading(true);
    setAuditResult(null);
    setAuditMsgIdx(0);
    
    const expT = cv.experience.map(e =>
      e.title + " chez " + e.company + " (" + e.period + "): "
      + e.bullets.filter(b=>b).join("; ")
    ).join(" | ");
    const cvT = "Nom: " + cv.name + "\nTitre: " + cv.title
      + "\nLocalisation: " + cv.location
      + "\nAccroche: " + cv.summary
      + "\nExperiences: " + expT
      + "\nFormations: " + cv.education.map(e=>e.degree+" - "+e.school+" ("+e.period+")").join(" | ")
      + "\nCompetences: " + cv.skills.filter(s=>s).join(", ")
      + "\nLangues: " + cv.languages.filter(l=>l.lang).map(l=>l.lang+" "+l.level).join(", ")
      + "\nCertifications: " + cv.certifications.filter(c=>c).join(", ");
    
    const countryName = ({
      FR: "France", UK: "Royaume-Uni", US: "Etats-Unis", DE: "Allemagne",
      CH: "Suisse", BE: "Belgique", LU: "Luxembourg", ES: "Espagne",
      IT: "Italie", AE: "Emirats Arabes Unis", CA: "Canada", AUTO: "auto-detecte"
    })[auditCountry] || auditCountry;
    
    const p = "Tu es un recruteur senior expert du marche " + countryName + " avec 20 ans d'experience. "
      + "Audite ce CV du point de vue d'un recruteur qui le recevrait pour un poste senior. "
      + "Sois HONNETE, DIRECT, sans complaisance. Aucune diplomatie. "
      + "Tiens compte des codes specifiques du marche " + countryName + " (longueur, format, mots-cles, soft skills attendus).\n\n"
      + "CV:\n" + cvT + "\n\n"
      + "Reponds UNIQUEMENT en JSON valide strict, sans markdown:\n"
      + '{'
      + '"score_global":75,'
      + '"verdict_longueur":"trop long",'
      + '"longueur_recommandation":"Reduire de 30% - vise 1 page max pour ce profil sur le marche FR",'
      + '"forces":["force concrete 1","force 2","force 3"],'
      + '"faiblesses":["faiblesse precise 1 avec exemple","faiblesse 2","faiblesse 3"],'
      + '"suggestions":["suggestion actionnable 1","suggestion 2","suggestion 3","suggestion 4","suggestion 5"],'
      + '"mots_cles_manquants":["mot1","mot2","mot3"],'
      + '"premiere_impression":"Ce que je pense en 5 secondes en tant que recruteur sur ce marche",'
      + '"verdict_recruteur":"Je rappelle / Je passe / J\'hesite",'
      + '"raison_verdict":"Pourquoi ce verdict en 1-2 phrases"'
      + '}';
    
    try {
      const txt = await aiCall(p);
      const r = parseJSON(txt);
      setAuditResult(r);
    } catch (err) {
      notify("Audit: " + (err && err.message ? err.message : "erreur inconnue"));
    } finally {
      setAuditLoading(false);
    }
  }, [cv, auditCountry, notify]);

  const applyAuditSuggestion = useCallback((suggestion) => {
    setShowAudit(false);
    setAuditResult(null);
    setAdjPrefill(suggestion);
    setTab("ai");
    setAiMode("adjust");
    notify(locale==="en" ? "Suggestion sent to Adjust" : "Suggestion envoyee dans Ajuster");
  }, [notify, locale]);

  const integrateKeywords = useCallback(async (keywords) => {
    if (!apiKey) { notify(T.nk); return; }
    if (!keywords || !keywords.length) return;
    setKwLoading(true);
    const kwList = keywords.join(", ");
    const p = "Tu es expert CV et ATS. Voici un CV au format JSON et une liste de mots-cles ATS a integrer naturellement.\n\n"
      + "REGLES STRICTES:\n"
      + "1. Integre les mots-cles dans les bullets de realisations et l'accroche, la ou c'est CONTEXTUELLEMENT pertinent.\n"
      + "2. Si un mot-cle ne peut pas etre integre naturellement, l'ajouter dans la liste skills plutot que de forcer.\n"
      + "3. INTERDIT: bourrage de mots-cles, repetition mecanique, phrases qui sonnent fake.\n"
      + "4. Preserve la structure JSON exacte, les IDs, les dates, les noms d'entreprises.\n"
      + "5. N'invente jamais de realisations ou competences. Reformule l'existant pour y placer les mots-cles.\n"
      + "6. Garde la langue d'origine du CV.\n"
      + "7. " + NO_DASH + "\n\n"
      + "MOTS-CLES A INTEGRER: " + kwList + "\n\n"
      + "CV:\n" + JSON.stringify(cv) + "\n\n"
      + "Reponds UNIQUEMENT avec le CV modifie en JSON valide strict, sans markdown.";
    try {
      const txt = await aiCall(p);
      const json = parseJSON(txt);
      pushH();
      setCVFn(() => normCV(json, cv));
      setShowAudit(false);
      setAuditResult(null);
      notify(locale==="en" ? "Keywords integrated" : "Mots-cles integres");
    } catch (err) {
      notify((locale==="en" ? "Integration error: " : "Erreur integration: ") + (err.message || ""));
    } finally {
      setKwLoading(false);
    }
  }, [cv, apiKey, T, pushH, setCVFn, notify, locale]);

  const requestPack = useCallback((offer, matchRes) => {
    setPackCtx({ offer, matchRes });
    setShowPack(true);
    setPackResult(null);
  }, []);

  const runPack = useCallback(async () => {
    if (!packCtx) return;
    if (!apiKey) { notify(T.nk); return; }
    setPackLoading(true);
    setPackMsgIdx(0);

    const { offer, matchRes } = packCtx;
    const cvSummary = "Nom: "+cv.name+" - "+cv.title
      +"\nAccroche: "+(cv.summary||"")
      +"\nExperiences: "+cv.experience.map(e =>
          e.title+" chez "+e.company+" ("+e.period+"): "
          +e.bullets.filter(b=>b).join("; ")
        ).join(" | ")
      +"\nSkills: "+cv.skills.filter(s=>s).join(", ")
      +"\nLangues: "+cv.languages.filter(l=>l.lang).map(l=>l.lang+" "+l.level).join(", ");

    const company = (matchRes && matchRes.company) || "l'entreprise";
    const role = (matchRes && matchRes.job_title) || "le poste";
    const interviewQs = (matchRes && matchRes.likely_interview_questions) || [];

    const p = "Tu es expert en candidature. Genere une candidature complete pour ce poste.\n\n"
      +"OFFRE:\n"+offer+"\n\n"
      +"CV CANDIDAT:\n"+cvSummary+"\n\n"
      +"REGLES:\n"
      +"- Reste authentique au parcours du candidat. Ne pas inventer.\n"
      +"- Adapter le ton a la culture detectee de l'entreprise.\n"
      +"- Lettre: 250-300 mots, 4 paragraphes (accroche, valeur, motivation, call-to-action).\n"
      +"- Message LinkedIn: max 90 mots, professionnel mais humain, pas de phrase bateau.\n"
      +"- Email: objet specifique (pas 'Candidature au poste de X'), corps court 150 mots max.\n"
      +"- Pitch entretien: 60 secondes a l'oral (~150 mots), structure: qui je suis, ce que j'apporte, pourquoi ce poste.\n"
      +"- 5 reponses STAR aux questions probables, chacune avec Situation/Task/Action/Result concrets bases sur le CV.\n"
      +"- " + NO_DASH + "\n"
      +"- Reponds UNIQUEMENT en JSON valide strict, sans markdown.\n\n"
      +(interviewQs.length ? ("Questions probables identifiees: "+interviewQs.join(" | ")+"\n\n") : "")
      +'JSON STRUCTURE:\n'
      +'{\n'
      +'  "cover_letter": "lettre complete avec sauts de ligne",\n'
      +'  "linkedin_message": "message direct au recruteur",\n'
      +'  "application_email": {\n'
      +'    "subject": "objet specifique",\n'
      +'    "body": "corps de l email"\n'
      +'  },\n'
      +'  "interview_pitch": "pitch 60 secondes",\n'
      +'  "star_answers": [\n'
      +'    {\n'
      +'      "question": "question probable",\n'
      +'      "situation": "contexte concret tire du CV",\n'
      +'      "task": "ce qu il fallait accomplir",\n'
      +'      "action": "action prise par le candidat",\n'
      +'      "result": "resultat chiffre si possible"\n'
      +'    }\n'
      +'  ]\n'
      +'}';
    try {
      const txt = await aiCall(p);
      const r = parseJSON(txt);
      setPackResult(r);
    } catch (err) {
      notify("Erreur candidature: " + (err.message || "inconnue"));
      setShowPack(false);
    } finally {
      setPackLoading(false);
    }
  }, [packCtx, cv, apiKey, T, notify]);

  useEffect(() => {
    if (showPack && packCtx && !packResult && !packLoading) {
      runPack();
    }
  }, [showPack, packCtx, packResult, packLoading, runPack]);

  useEffect(() => {
    if (!packLoading) return;
    const interval = setInterval(() => {
      setPackMsgIdx(i => i + 1);
    }, 2500);
    return () => clearInterval(interval);
  }, [packLoading]);

  const copyToClipboard = useCallback((text) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      notify(locale==="en" ? "Copied" : "Copie");
    } catch {
      notify(locale==="en" ? "Copy failed" : "Echec copie");
    }
  }, [notify, locale]);

  const runPositioning = useCallback(async () => {
    if (!apiKey) { notify(T.nk); return; }
    if (cvIsEmpty) { notify(locale==="en" ? "Empty CV" : "CV vide"); return; }
    setShowPos(true);
    setPosLoading(true);
    setPosResult(null);
    const cvSummary = "Titre actuel: "+cv.title
      +"\nAccroche: "+(cv.summary||"")
      +"\nExperiences: "+cv.experience.map(e =>
          e.title+" chez "+e.company+" ("+e.period+"): "
          +e.bullets.filter(b=>b).join("; ")
        ).join(" | ")
      +"\nFormation: "+cv.education.map(e=>e.degree+" "+e.school).join(" | ")
      +"\nSkills: "+cv.skills.filter(s=>s).join(", ")
      +"\nLangues: "+cv.languages.filter(l=>l.lang).map(l=>l.lang+" "+l.level).join(", ");
    const p = "Tu es expert en strategie de carriere. Analyse ce parcours et propose 3 angles de positionnement differents.\n\n"
      +"PARCOURS:\n"+cvSummary+"\n\n"
      +"Pour chaque angle, tu dois:\n"
      +"1. Donner un titre professionnel precis (le job qu'on vise)\n"
      +"2. Expliquer pourquoi ce profil est credible pour cet angle\n"
      +"3. Donner une fourchette de salaire realiste pour ce positionnement\n"
      +"4. Lister les 3 points cles a mettre en avant\n"
      +"5. Identifier la cible employeur ideale\n"
      +"6. Reecrire l'accroche du CV pour matcher cet angle\n\n"
      +"REGLES:\n"
      +"- Les 3 angles doivent etre VRAIMENT differents (pas 3 variantes du meme job)\n"
      +"- Chaque angle doit etre credible avec ce parcours, pas une projection irrealiste\n"
      +"- " + NO_DASH + "\n"
      +"- Reponds UNIQUEMENT en JSON valide strict.\n\n"
      +'{\n'
      +'  "angles": [\n'
      +'    {\n'
      +'      "title": "Titre professionnel precis",\n'
      +'      "credibility": "Pourquoi ce profil est credible pour cet angle",\n'
      +'      "salary_range": "Fourchette realiste",\n'
      +'      "key_points": ["point 1", "point 2", "point 3"],\n'
      +'      "target_employers": "Type d entreprises a cibler",\n'
      +'      "new_summary": "Accroche reecrite pour ce positionnement"\n'
      +'    }\n'
      +'  ]\n'
      +'}';
    try {
      const txt = await aiCall(p);
      const r = parseJSON(txt);
      setPosResult(r);
    } catch (err) {
      notify("Erreur positionnement: " + (err.message || ""));
      setShowPos(false);
    } finally {
      setPosLoading(false);
    }
  }, [cv, cvIsEmpty, apiKey, T, notify, locale]);

  const adoptAngle = useCallback((angle) => {
    if (!angle) return;
    pushH();
    setCVFn(c => ({
      ...c,
      title: angle.title || c.title,
      summary: angle.new_summary || c.summary,
    }));
    setShowPos(false);
    setPosResult(null);
    notify(locale==="en" ? "Angle applied" : "Angle adopte");
  }, [pushH, setCVFn, notify, locale]);

  const runTruthCheck = useCallback(async () => {
    if (!apiKey) { notify(T.nk); return; }
    if (cvIsEmpty) { notify(locale==="en" ? "Empty CV" : "CV vide"); return; }
    setShowTruth(true);
    setTruthLoading(true);
    setTruthResult(null);
    const cvSummary = "Titre: "+cv.title
      +"\nAccroche: "+(cv.summary||"")
      +"\nExperiences:\n"+cv.experience.map((e,i) =>
          "[EXP-"+(i+1)+"] "+e.title+" chez "+e.company+" ("+e.period+"):\n"
          +e.bullets.filter(b=>b).map((b,j)=>"  - [BUL-"+(i+1)+"."+(j+1)+"] "+b).join("\n")
        ).join("\n");
    const p = "Tu es recruteur senior expert. Identifie les phrases faibles, vagues, ou risquees dans ce CV.\n\n"
      +"CV:\n"+cvSummary+"\n\n"
      +"Pour chaque probleme detecte, indique:\n"
      +"- type (vague, generique, bullshit, incoherent, faible, pretentieux, risque entretien)\n"
      +"- phrase concernee (citation exacte)\n"
      +"- localisation (titre, accroche, ou ID de l experience/bullet ex: EXP-2 ou BUL-2.3)\n"
      +"- pourquoi c'est un probleme\n"
      +"- proposition de reformulation forte\n\n"
      +"REGLES:\n"
      +"- Sois honnete et direct, sans complaisance.\n"
      +"- Concentre-toi sur les vrais problemes, pas du nitpicking.\n"
      +"- Maximum 8 issues, prends les plus importants.\n"
      +"- " + NO_DASH + "\n"
      +"- JSON valide strict uniquement.\n\n"
      +'{\n'
      +'  "issues": [\n'
      +'    {\n'
      +'      "type": "vague",\n'
      +'      "quote": "phrase exacte du CV",\n'
      +'      "location": "EXP-2 ou Accroche etc",\n'
      +'      "why": "raison concrete du probleme",\n'
      +'      "fix": "reformulation proposee"\n'
      +'    }\n'
      +'  ],\n'
      +'  "overall_verdict": "Verdict global en 1-2 phrases"\n'
      +'}';
    try {
      const txt = await aiCall(p);
      const r = parseJSON(txt);
      setTruthResult(r);
    } catch (err) {
      notify("Erreur truth check: " + (err.message || ""));
      setShowTruth(false);
    } finally {
      setTruthLoading(false);
    }
  }, [cv, cvIsEmpty, apiKey, T, notify, locale]);

  const saveVersion = useCallback(() => {
    const name = window.prompt(
      locale==="en" ? "Name for this version (e.g. 'Banking', 'Sales EN', 'Senior'):" 
                    : "Nom de cette version (ex: 'Banque', 'Sales EN', 'Senior'):"
    );
    if (!name || !name.trim()) return;
    const v = {
      id: Date.now(),
      name: name.trim().slice(0, 40),
      cv: cv,
      created: new Date().toISOString(),
    };
    setVersions(vs => {
      const next = [...vs, v];
      lsS(SK.VS, next);
      return next;
    });
    notify(locale==="en" ? "Version saved" : "Version sauvegardee");
  }, [cv, notify, locale]);

  const loadVersion = useCallback((id) => {
    const v = versions.find(x => x.id === id);
    if (!v) return;
    if (!window.confirm(
      locale==="en" ? "Load this version? Current CV will be replaced (history will allow undo)." 
                    : "Charger cette version? Le CV actuel sera remplace (annulable via Historique)."
    )) return;
    pushH();
    setCVFn(() => normCV(v.cv, EMPTY));
    setShowVersions(false);
    notify(locale==="en" ? "Version loaded" : "Version chargee");
  }, [versions, pushH, setCVFn, notify, locale]);

  const deleteVersion = useCallback((id) => {
    if (!window.confirm(locale==="en" ? "Delete this version?" : "Supprimer cette version?")) return;
    setVersions(vs => {
      const next = vs.filter(x => x.id !== id);
      lsS(SK.VS, next);
      return next;
    });
  }, [locale]);

  const runTranslate = useCallback(async () => {
    if (!apiKey) { notify(T.tr_nk); return; }
    setTrLoading(true);
    setTrMsgIdx(0);

    lsS(SK.BK, cv);
    setHasBackup(true);

    const target = trDir === "fr_en" ? "English" : "French";
    const source = trDir === "fr_en" ? "French" : "English";

    const p = "You are a professional CV translator. Translate the following CV from " + source + " to " + target + ".\n\n"
      + "STRICT RULES:\n"
      + "1. Translate ONLY the textual content (job titles, summaries, achievements/bullets, descriptions, skill names where applicable).\n"
      + "2. PRESERVE EXACTLY (do not translate): person's name, company names, school names, dates and periods, cities/locations (translate only if there is a standard equivalent like Londres -> London), email, phone, LinkedIn URL, certification names if they are official titles, technology names, product names, acronyms.\n"
      + "3. Adapt professional terminology naturally to the " + target + " job market. For example, in English use action verbs (Led, Drove, Delivered) at the start of bullets.\n"
      + "4. Keep the same JSON structure and the same number of items in every array.\n"
      + "5. Do not invent, add or remove content. Translate what is there.\n"
      + "6. " + NO_DASH + "\n"
      + "7. For language proficiency levels: keep CEFR codes (A1, A2, B1, B2, C1, C2) as-is. Translate descriptive levels (Native, Fluent, Intermediate / Maternelle, Courant, Intermediaire).\n\n"
      + "CV to translate (JSON):\n"
      + JSON.stringify(cv) + "\n\n"
      + "Reply with the translated CV as VALID JSON only, no markdown, no commentary, same structure exactly.";

    try {
      const txt = await aiCall(p);
      const json = parseJSON(txt);
      pushH();
      setCVFn(() => normCV(json, cv));
      notify(T.tr_ok);
      setShowTranslate(false);
    } catch (err) {
      notify(T.tr_err + ": " + (err.message || ""));
    } finally {
      setTrLoading(false);
    }
  }, [cv, apiKey, trDir, T, pushH, setCVFn, notify]);

  const restoreBackup = useCallback(() => {
    const b = lsG(SK.BK);
    if (!b) { notify(T.nu); return; }
    if (!window.confirm(T.tr_restore_conf)) return;
    pushH();
    setCVFn(() => normCV(b, EMPTY));
    notify(T.tr_restored);
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
      + " " + NO_DASH + " UNIQUEMENT JSON.\nCV:\n" + obRaw;
    try {
      const txt = await aiCall(p);
      const parsed = parseJSON(txt);
      setCVFn(() => normCV(parsed));
      setObRaw("");
      // Si on était en mode adapt, on va direct vers l'onglet Match (adaptation)
      const wasAdaptMode = obMode === "import-adapt";
      setObMode(null);
      if (wasAdaptMode) {
        setTab("ai");
        setAiMode("match");
      }
      notify(T.okimp);
    } catch { notify(T.ep); }
    setObImp(false);
  }, [obRaw, apiKey, T, setCVFn, notify, obMode, setTab, setAiMode]);

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
        <AdjustPanel cv={cv} setCVFn={setCVFn} notify={notify} apiKey={apiKey} T={T}
          prefillInst={adjPrefill}
          onPrefillConsumed={()=>setAdjPrefill("")}/>
      )}
      {aiMode==="match" && (
        <MatchPanel cv={cv} setCVFn={setCVFn} notify={notify} apiKey={apiKey} T={T}
          onPackRequest={requestPack}/>
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
      <div style={SH()}>{T.tr_section}</div>
      <button onClick={()=>setShowTranslate(true)} style={{
        ...B({
          width:"100%", padding:"11px", borderRadius:11,
          background:"linear-gradient(135deg,"+Gold+",#a07840)",
          color:"#fff", fontWeight:700, fontSize:13, marginBottom:8,
          display:"flex", alignItems:"center", justifyContent:"center", gap:6,
        })
      }}>
        <span style={{fontSize:15}}>~</span>
        <span>{T.tr_btn}</span>
      </button>
      {hasBackup && (
        <button onClick={restoreBackup} style={{
          ...B({
            width:"100%", padding:"10px", borderRadius:9,
            border:"1px solid #e0e0e0", background:"#fff9f0",
            color:Dark, fontSize:12, fontWeight:600, marginBottom:14,
          })
        }}>{T.tr_restore}</button>
      )}
      {!hasBackup && <div style={{marginBottom:14}}/>}
      <div style={SH()}>{locale==="en" ? "Strategy" : "Strategie"}</div>
      <button onClick={runPositioning} style={{
        ...B({
          width:"100%", padding:"11px", borderRadius:11,
          background:"linear-gradient(135deg,#7c3aed,"+Gold+")",
          color:"#fff", fontWeight:700, fontSize:13, marginBottom:7,
          display:"flex", alignItems:"center", justifyContent:"center", gap:6,
        })
      }}>
        <span style={{fontSize:15}}>*</span>
        <span>{locale==="en" ? "Career positioning" : "Positionnement carriere"}</span>
      </button>
      <button onClick={runTruthCheck} style={{
        ...B({
          width:"100%", padding:"11px", borderRadius:11,
          background:"#1a1a2e", color:"#fff",
          fontWeight:700, fontSize:13, marginBottom:7,
          display:"flex", alignItems:"center", justifyContent:"center", gap:6,
        })
      }}>
        <span style={{fontSize:15}}>!</span>
        <span>{locale==="en" ? "Truth check" : "Truth check"}</span>
      </button>
      <button onClick={()=>setShowVersions(true)} style={{
        ...B({
          width:"100%", padding:"11px", borderRadius:11,
          border:"1px solid "+Gold+"55", background:"#fdfaf3",
          color:Dark, fontWeight:700, fontSize:13, marginBottom:14,
          display:"flex", alignItems:"center", justifyContent:"center", gap:6,
        })
      }}>
        <span style={{fontSize:15}}>=</span>
        <span>
          {locale==="en" ? "Versions" : "Versions"} ({versions.length})
        </span>
      </button>
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
      {showAudit && (
        <AuditModal 
          cv={cv}
          country={auditCountry}
          setCountry={setAuditCountry}
          loading={auditLoading}
          result={auditResult}
          msgIdx={auditMsgIdx}
          messages={auditMessages}
          onRun={runAudit}
          onClose={()=>{setShowAudit(false);setAuditResult(null);}}
          onApplySuggestion={applyAuditSuggestion}
          onIntegrateKeywords={integrateKeywords}
          kwLoading={kwLoading}
        />
      )}
      {showTranslate && (
        <TranslateModal
          T={T}
          dir={trDir}
          setDir={setTrDir}
          loading={trLoading}
          msgIdx={trMsgIdx}
          hasBackup={hasBackup}
          onRun={runTranslate}
          onClose={()=>{ if (!trLoading) setShowTranslate(false); }}
        />
      )}
      {showPack && (
        <ApplicationPackModal
          pack={packResult}
          loading={packLoading}
          msgIdx={packMsgIdx}
          onCopy={copyToClipboard}
          onClose={()=>{
            if (packLoading) return;
            setShowPack(false);
            setPackResult(null);
            setPackCtx(null);
          }}
        />
      )}
      {showPos && (
        <PositioningModal
          result={posResult}
          loading={posLoading}
          onAdopt={adoptAngle}
          onClose={()=>{
            if (posLoading) return;
            setShowPos(false);
            setPosResult(null);
          }}
        />
      )}
      {showTruth && (
        <TruthModal
          result={truthResult}
          loading={truthLoading}
          onApplyFix={(iss)=>{
            const inst = "Remplace dans mon CV la phrase: \""+iss.quote+"\" par: \""+iss.fix+"\". Garde tout le reste identique.";
            setShowTruth(false);
            setTruthResult(null);
            setAdjPrefill(inst);
            setTab("ai");
            setAiMode("adjust");
            notify(locale==="en" ? "Fix sent to Adjust" : "Correction envoyee dans Ajuster");
          }}
          onClose={()=>{
            if (truthLoading) return;
            setShowTruth(false);
            setTruthResult(null);
          }}
        />
      )}
      {showVersions && (
        <VersionsModal
          versions={versions}
          currentCv={cv}
          onSave={saveVersion}
          onLoad={loadVersion}
          onDelete={deleteVersion}
          onClose={()=>setShowVersions(false)}
        />
      )}
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
        <style>{`@keyframes cvfSpin{to{transform:rotate(360deg)}}`}</style>
        {notif && <Notif msg={notif}/>}
        {Modals}
        {Onboard}
        {!cvIsEmpty && (
          <button onClick={()=>setShowAudit(true)} style={{
            position:"fixed", bottom:24, right:24, zIndex:400,
            padding:"14px 22px", borderRadius:50,
            background:"linear-gradient(135deg,"+Gold+",#a07840)",
            color:"#fff", fontWeight:800, fontSize:13,
            border:"none", cursor:"pointer",
            boxShadow:"0 8px 24px rgba(201,169,110,.4)",
            display:"flex", alignItems:"center", gap:8,
            fontFamily:"'Lato',sans-serif",
          }}>
            <span style={{fontSize:18}}>*</span>
            <span>{T.audit_btn}</span>
          </button>
        )}
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
      <style>{`@keyframes cvfSpin{to{transform:rotate(360deg)}}`}</style>
      {notif && <Notif msg={notif}/>}
      {Modals}
      {Onboard}
      {!cvIsEmpty && (
        <button onClick={()=>setShowAudit(true)} style={{
          position:"fixed", bottom:78, right:14, zIndex:400,
          padding:"12px 18px", borderRadius:50,
          background:"linear-gradient(135deg,"+Gold+",#a07840)",
          color:"#fff", fontWeight:800, fontSize:12,
          border:"none", cursor:"pointer",
          boxShadow:"0 8px 24px rgba(201,169,110,.4)",
          display:"flex", alignItems:"center", gap:6,
          fontFamily:"'Lato',sans-serif",
        }}>
          <span style={{fontSize:16}}>*</span>
          <span>{T.audit_btn}</span>
        </button>
      )}
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
