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

// Keyframes globales injectees une fois par branche (mobile/desktop/spinner).
// cvfSpin existe deja en v16. cvfFadeIn et cvfSlideUp servent l'IOSSheet v17.
const KEYFRAMES_V17 = `
@keyframes cvfSpin{to{transform:rotate(360deg)}}
@keyframes cvfFadeIn{from{opacity:0}to{opacity:1}}
@keyframes cvfSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
`;

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
  ai_overwrite_warn:"Tu as deja un CV. Generer va l'ecraser. Continuer ?",
  ai_existing_title:"Tu as deja un CV",
  ai_existing_msg:"Generer va ecraser ton CV actuel. Tu veux plutot l'ajuster avec une instruction libre ?",
  ai_existing_btn:"Aller a Ajuster",
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
  // === v17 : 3 phases narratives ===
  ph_start:"Demarrer", ph_target:"Cibler", ph_finalize:"Finaliser",
  // Hero onboarding (style editorial Fraunces)
  hero_h1_a:"Un CV qui ouvre", hero_h1_em:"des portes", hero_h1_b:"pas qui prend la poussiere.",
  hero_sub:"Strategie, ciblage et redaction par une IA recruteur senior.",
  // CTA cards onboarding
  ob_import_desc:"L'IA structure ton CV existant en 10 secondes",
  ob_adapt:"Adapter a une offre", ob_adapt_desc:"Importe ton CV puis colle l'offre, l'IA fait le pont",
  ob_generate_desc:"Cree un CV complet a partir de ton profil",
  ob_blank_desc:"Tu construis ligne par ligne",
  // Hub Cibler
  hub_eyebrow:"Le pivot strategique",
  hub_title_a:"Une", hub_title_em:"offre", hub_title_b:"une candidature complete.",
  hub_cta_paste:"Coller une offre",
  hub_cta_change:"Changer d'offre",
  hub_match_label:"Match offre",
  hub_subhead:"Ou commence par une analyse",
  hub_audit:"Audit recruteur", hub_audit_desc:"Analyse honnete de ton CV par marche",
  hub_pos:"Positionnement", hub_pos_desc:"3 angles strategiques pour ton parcours",
  hub_truth:"Truth check", hub_truth_desc:"Phrases faibles, vagues ou risquees",
  hub_pack:"Pack candidature", hub_pack_desc:"Lettre, LinkedIn, pitch et reponses",
  hub_empty:"Charge d'abord un CV depuis Demarrer pour activer le ciblage.",
  // Phase Finaliser
  fin_eyebrow:"Edition fine",
  fin_sections:"Modifier par section",
  fin_eyebrow_design:"Design",
  fin_eyebrow_strategy:"Strategie et versions",
  fin_eyebrow_export:"Export et historique",
  fin_eyebrow_translate:"Traduction",
  fin_eyebrow_api:"Cle API",
  // Sheet labels
  sheet_close:"Fermer",
  // Onboarding v17 (cartes de choix)
  ob_choose:"Choisis ce qui correspond a ta situation",
  ob_card_have:"J'ai deja un CV",
  ob_card_have_desc:"L'IA structure ton CV existant en 10 secondes",
  ob_card_adapt:"J'adapte a une offre",
  ob_card_adapt_desc:"Importe ton CV puis colle l'offre, l'IA fait le pont",
  ob_card_create:"Je cree un CV",
  ob_card_create_desc:"Pas encore de CV ? L'IA en genere un a partir de tes infos",
  ob_card_blank:"Ou commencer vierge",
  // Steps bar
  ob_step_import:"Importer", ob_step_paste_offer:"Coller l'offre",
  ob_step_adapt:"Adapter", ob_step_boost:"Booster", ob_step_download:"Telecharger",
  // Import screen
  ob_import_first:"Importe d'abord ton CV",
  ob_import_title:"Importe ton CV",
  ob_import_sub_adapt:"L'IA va d'abord structurer ton CV, puis tu colleras l'offre.",
  ob_import_sub_boost:"L'IA va lire ton CV et le restructurer automatiquement.",
  ob_import_format:"Format accepte : PDF, Word, ou texte.",
  ob_pick_file:"Cliquer pour selectionner mon CV",
  ob_pick_file_hint:"PDF, Word (.docx) ou texte (.txt)",
  ob_or_paste:"ou copier-coller le contenu",
  ob_paste_label:"Colle ton CV en texte brut",
  ob_paste_ph:"Nom, titre, email...\nExperiences, formation, competences...",
  ob_continue_adapt:"Continuer vers l'adaptation",
  // File upload errors
  ob_file_format_err:"Format non supporte. Utilise PDF, DOCX ou TXT.",
  ob_file_read_err:"Erreur lors de la lecture du fichier",
  // Generic UI
  back:"Retour",
  // Offer sheet (Cibler)
  off_eyebrow:"Analyse d'offre",
  off_title_a:"Une", off_title_em:"offre", off_title_b:"decodee.",
  off_sub:"L'IA decode l'offre et adapte ton CV.",
  off_paste_label:"Colle l'offre d'emploi",
  off_paste_ph:"Description du poste, missions, exigences...",
  off_run:"Analyser et adapter",
  off_running:"Analyse en cours...",
  off_running_sub:"L'IA decode l'offre et adapte ton CV.",
  off_apply:"Appliquer le CV adapte",
  off_change:"Nouvelle offre",
  off_score_label:"Match offre",
  off_no_offer:"Colle une offre d'abord",
  // Finalize phase (sections + boutons)
  fin_section_edit:"Editer le CV",
  fin_section_design:"Apparence",
  fin_section_strategy:"Strategie",
  fin_section_export:"Export et reglages",
  fin_section_translate:"Traduction",
  fin_section_settings:"Reglages",
  fin_score_btn:"Voir le score CV",
  fin_score_eyebrow:"Diagnostic",
  fin_pos_btn:"Positionnement carriere",
  fin_truth_btn:"Truth check",
  fin_versions_btn:"Versions",
  fin_undo_btn:"Annuler le dernier ajustement",
  fin_template_section:"Templates",
  fin_template_load:"Charger ce CV",
  fin_template_loaded:"Template charge",
  fin_iface_lang:"Langue de l'interface",
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
  ai_overwrite_warn:"You already have a CV. Generating will overwrite it. Continue?",
  ai_existing_title:"You already have a CV",
  ai_existing_msg:"Generating will overwrite your current CV. Want to adjust it with a free instruction instead?",
  ai_existing_btn:"Go to Adjust",
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
  // === v17 : 3 narrative phases ===
  ph_start:"Start", ph_target:"Target", ph_finalize:"Finalize",
  // Hero onboarding (editorial Fraunces)
  hero_h1_a:"A CV that opens", hero_h1_em:"doors", hero_h1_b:"not one that gathers dust.",
  hero_sub:"Strategy, targeting and writing by a senior recruiter AI.",
  // CTA cards onboarding
  ob_import_desc:"AI structures your existing CV in 10 seconds",
  ob_adapt:"Adapt to a job posting", ob_adapt_desc:"Import your CV then paste the posting, AI bridges the gap",
  ob_generate_desc:"Build a full CV from your profile",
  ob_blank_desc:"You build it line by line",
  // Targeting hub
  hub_eyebrow:"The strategic pivot",
  hub_title_a:"One", hub_title_em:"posting", hub_title_b:"one full application.",
  hub_cta_paste:"Paste a job posting",
  hub_cta_change:"Change posting",
  hub_match_label:"Posting match",
  hub_subhead:"Or start with an analysis",
  hub_audit:"Recruiter audit", hub_audit_desc:"Honest analysis of your CV per market",
  hub_pos:"Positioning", hub_pos_desc:"3 strategic angles for your career",
  hub_truth:"Truth check", hub_truth_desc:"Weak, vague or risky sentences",
  hub_pack:"Application pack", hub_pack_desc:"Letter, LinkedIn, pitch and answers",
  hub_empty:"Load a CV from Start first to unlock targeting.",
  // Finalize phase
  fin_eyebrow:"Fine editing",
  fin_sections:"Edit by section",
  fin_eyebrow_design:"Design",
  fin_eyebrow_strategy:"Strategy and versions",
  fin_eyebrow_export:"Export and history",
  fin_eyebrow_translate:"Translation",
  fin_eyebrow_api:"API key",
  // Sheet labels
  sheet_close:"Close",
  // Onboarding v17 (choice cards)
  ob_choose:"Choose what fits your situation",
  ob_card_have:"I already have a CV",
  ob_card_have_desc:"AI structures your existing CV in 10 seconds",
  ob_card_adapt:"I adapt to a posting",
  ob_card_adapt_desc:"Import your CV then paste the posting, AI bridges the gap",
  ob_card_create:"I create a CV",
  ob_card_create_desc:"No CV yet? AI generates one from your info",
  ob_card_blank:"Or start blank",
  // Steps bar
  ob_step_import:"Import", ob_step_paste_offer:"Paste posting",
  ob_step_adapt:"Adapt", ob_step_boost:"Boost", ob_step_download:"Download",
  // Import screen
  ob_import_first:"First, import your CV",
  ob_import_title:"Import your CV",
  ob_import_sub_adapt:"AI will first structure your CV, then you'll paste the posting.",
  ob_import_sub_boost:"AI will read your CV and restructure it automatically.",
  ob_import_format:"Accepted formats: PDF, Word, or text.",
  ob_pick_file:"Click to select my CV",
  ob_pick_file_hint:"PDF, Word (.docx) or text (.txt)",
  ob_or_paste:"or copy and paste the content",
  ob_paste_label:"Paste your CV as plain text",
  ob_paste_ph:"Name, title, email...\nExperience, education, skills...",
  ob_continue_adapt:"Continue to adaptation",
  // File upload errors
  ob_file_format_err:"Unsupported format. Use PDF, DOCX or TXT.",
  ob_file_read_err:"Error while reading the file",
  // Generic UI
  back:"Back",
  // Offer sheet (Target)
  off_eyebrow:"Posting analysis",
  off_title_a:"A", off_title_em:"posting", off_title_b:"decoded.",
  off_sub:"AI decodes the posting and tailors your CV.",
  off_paste_label:"Paste the job posting",
  off_paste_ph:"Job description, missions, requirements...",
  off_run:"Analyze and adapt",
  off_running:"Analyzing...",
  off_running_sub:"AI decodes the posting and tailors your CV.",
  off_apply:"Apply tailored CV",
  off_change:"New posting",
  off_score_label:"Posting match",
  off_no_offer:"Paste a posting first",
  // Finalize phase (sections + buttons)
  fin_section_edit:"Edit CV",
  fin_section_design:"Appearance",
  fin_section_strategy:"Strategy",
  fin_section_export:"Export and settings",
  fin_section_translate:"Translation",
  fin_section_settings:"Settings",
  fin_score_btn:"See CV score",
  fin_score_eyebrow:"Diagnostic",
  fin_pos_btn:"Career positioning",
  fin_truth_btn:"Truth check",
  fin_versions_btn:"Versions",
  fin_undo_btn:"Undo last adjustment",
  fin_template_section:"Templates",
  fin_template_load:"Load this CV",
  fin_template_loaded:"Template loaded",
  fin_iface_lang:"Interface language",
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
  if (typeof window === "undefined") return fb;
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; }
  catch { return fb; }
}
function lsS(k, v) {
  if (typeof window === "undefined") return;
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

// IOSSheet v17 : sheet bottom iOS-native avec handle, backdrop blur, slide-up.
// Conserve la signature de l'ancien `Sheet({title,onClose,children})`
// pour que tous les Sheet*/Modals existants l'heritent automatiquement.
// Optionnel : `eyebrow` pour le pre-titre style editorial gold-deep.
function Sheet({ title, eyebrow, onClose, children }) {
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:2000,
      display:"flex", flexDirection:"column", justifyContent:"flex-end",
      fontFamily:Sans,
    }}>
      <div style={{
        position:"absolute", inset:0,
        background:"rgba(10,10,10,.55)",
        backdropFilter:"blur(8px)",
        WebkitBackdropFilter:"blur(8px)",
        animation:"cvfFadeIn 200ms ease-out",
      }} onClick={onClose}/>
      <div style={{
        position:"relative", background:CreamSoft,
        borderRadius:"32px 32px 0 0",
        maxHeight:"92vh", display:"flex", flexDirection:"column",
        boxShadow:"0 -20px 60px rgba(0,0,0,.2)",
        animation:"cvfSlideUp 280ms cubic-bezier(.32,.72,0,1)",
      }}>
        {/* Handle iOS */}
        <div style={{
          width:40, height:4, background:Gray200,
          borderRadius:RadiusPill,
          margin:"10px auto 6px",
          flexShrink:0,
        }}/>
        {/* Header editorial */}
        <div style={{
          padding:"6px 24px 14px",
          borderBottom:"0.5px solid "+Gray200,
          flexShrink:0,
          display:"flex", alignItems:"flex-start",
          justifyContent:"space-between", gap:12,
        }}>
          <div style={{flex:1, minWidth:0}}>
            {eyebrow && (
              <div style={{
                fontSize:11, fontWeight:600,
                letterSpacing:"0.12em", textTransform:"uppercase",
                color:GoldDeep, marginBottom:4,
              }}>{eyebrow}</div>
            )}
            <div style={{
              fontFamily:Serif, fontWeight:400, fontSize:22,
              letterSpacing:"-0.02em", color:Ink, lineHeight:1.15,
            }}>{title}</div>
          </div>
          <button onClick={onClose} aria-label="close" style={{
            ...B({
              background:Paper, borderRadius:RadiusPill,
              width:32, height:32, fontSize:16, color:Gray600,
              border:"0.5px solid "+Gray200,
              display:"flex", alignItems:"center", justifyContent:"center",
              flexShrink:0,
            })
          }}>x</button>
        </div>
        <div style={{
          overflowY:"auto",
          padding:"18px 24px 48px",
          flex:1,
        }}>
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

function SheetEx({ cv, set, onClose, onTransformBullet, T }) {
  const { ux, ub } = MK(set);

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
                onClick={()=>onTransformBullet(ex.id,j,b)}
                style={{
                  ...B({
                    background:"#fff9f0",
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

function AIPanel({ onGen, loading, apiKey, T, cvIsEmpty, onSwitchToAdjust }) {
  const [job, setJob]   = useState("");
  const [sec, setSec]   = useState(0);
  const [yrs, setYrs]   = useState("");
  const [tone, setTone] = useState("p");
  const [lang, setLang] = useState("fr");
  const [parc, setParc] = useState("");
  const [offre, setOffre] = useState("");

  // v17 helpers : inputs paper-on-cream + eyebrow editorial
  const inV17 = (extra={}) => ({
    width:"100%", padding:"12px 14px", borderRadius:RadiusSm,
    border:"0.5px solid "+Gray200, background:Paper,
    fontSize:13, color:Ink, fontFamily:Sans,
    boxSizing:"border-box", outline:"none",
    transition:"border-color 200ms ease-out",
    ...extra,
  });
  const eyV17 = {
    fontSize:11, fontWeight:600,
    letterSpacing:"0.1em", textTransform:"uppercase",
    color:GoldDeep, marginBottom:8, marginTop:14,
    display:"block",
  };

  // Pill toggle (tone, lang)
  const Pill = ({v, cur, set, l}) => (
    <button onClick={()=>set(v)} style={{
      ...B({
        flex:1, padding:"10px 8px", borderRadius:RadiusPill,
        border:"0.5px solid "+(cur===v ? Ink : Gray200),
        background:cur===v ? Ink : Paper,
        color:cur===v ? Cream : Ink,
        fontWeight:cur===v ? 600 : 500, fontSize:12,
        fontFamily:Sans,
        transition:"all 180ms ease-out",
      })
    }}>{l}</button>
  );

  const go = () => {
    if (!cvIsEmpty) {
      const ok = window.confirm(
        T.ai_overwrite_warn || "Tu as deja un CV. Generer va l'ecraser. Continuer ?"
      );
      if (!ok) return;
    }
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
    <div style={{fontFamily:Sans}}>
      {!apiKey && (
        <div style={{
          background:CoralSoft,
          border:"0.5px solid "+Coral,
          borderRadius:RadiusSm,
          padding:"10px 14px", marginBottom:14,
          fontSize:12, color:Ink, lineHeight:1.5,
        }}>
          {T.ai_nk}
        </div>
      )}
      {!cvIsEmpty && (
        <div style={{
          background:Paper,
          borderRadius:RadiusMd,
          padding:"16px 18px", marginBottom:18,
          border:"0.5px solid "+Gray200,
          boxShadow:ShadowSm,
        }}>
          <div style={{
            fontSize:11, fontWeight:600,
            letterSpacing:"0.12em", textTransform:"uppercase",
            color:Coral, marginBottom:6,
          }}>{T.ai_existing_title || "Tu as deja un CV"}</div>
          <div style={{
            fontFamily:Serif, fontWeight:400,
            fontSize:18, lineHeight:1.25,
            letterSpacing:"-0.01em",
            color:Ink, marginBottom:10,
          }}>{T.ai_existing_msg || "Generer va ecraser ton CV actuel. Tu veux plutot l'ajuster ?"}</div>
          <button onClick={onSwitchToAdjust} style={{
            ...B({
              padding:"10px 18px", borderRadius:RadiusPill,
              background:Ink, color:Cream,
              fontSize:12, fontWeight:600,
              fontFamily:Sans,
              display:"inline-flex", alignItems:"center", gap:6,
            })
          }}>
            {T.ai_existing_btn || "Aller a Ajuster"}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </button>
        </div>
      )}

      <label style={{...eyV17, marginTop:0}}>{T.ai_job}</label>
      <input value={job} onChange={e=>setJob(e.target.value)}
        placeholder={T.ai_jph} style={inV17()}/>

      <label style={eyV17}>{T.ai_sec}</label>
      <select value={sec} onChange={e=>setSec(Number(e.target.value))}
        style={inV17()}>
        {T.ai_secs.map((s,i) => <option key={i} value={i}>{s}</option>)}
      </select>

      <label style={eyV17}>{T.ai_yrs}</label>
      <input value={yrs} onChange={e=>setYrs(e.target.value)}
        placeholder="12" style={inV17()}/>

      <label style={eyV17}>{T.ai_tone}</label>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6}}>
        <Pill v="p" cur={tone} set={setTone} l={T.ai_tp}/>
        <Pill v="c" cur={tone} set={setTone} l={T.ai_tc}/>
        <Pill v="k" cur={tone} set={setTone} l={T.ai_tk}/>
      </div>

      <label style={eyV17}>{T.ai_lang}</label>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:6}}>
        <Pill v="fr" cur={lang} set={setLang} l="Francais"/>
        <Pill v="en" cur={lang} set={setLang} l="English"/>
      </div>

      <label style={eyV17}>{T.ai_parc}</label>
      <textarea value={parc} onChange={e=>setParc(e.target.value)}
        rows={3} style={inV17({resize:"vertical", lineHeight:1.5})}/>

      <label style={eyV17}>{T.ai_off}</label>
      <textarea value={offre} onChange={e=>setOffre(e.target.value)}
        rows={3} style={inV17({resize:"vertical", lineHeight:1.5})}/>

      <button onClick={go} disabled={loading||!apiKey} style={{
        ...B({
          width:"100%", padding:"15px 22px", borderRadius:RadiusPill,
          background:loading||!apiKey ? Gray200 : GradDark,
          color:loading||!apiKey ? Gray600 : Cream,
          fontWeight:600, fontSize:14, fontFamily:Sans,
          marginTop:22,
          display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
          transition:"all 200ms ease-out",
        })
      }}>
        {loading ? T.ai_gen : T.ai_btn}
        {!loading && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        )}
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

function MatchPanel({ cv, setCVFn, notify, apiKey, T, onPackRequest,
  onResult, onApplied, initialResult }) {
  const [offer, setOffer] = useState("");
  const [load, setLoad]   = useState(false);
  const [res, setRes]     = useState(initialResult || null);
  const [ph, setPh]       = useState(initialResult ? "done" : "input");

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
      if (onResult) onResult(r);
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
    if (onApplied) onApplied();
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

// === v17 helpers : 3 phases narratives ===
// Le state legacy `tab` (5 valeurs) est conserve pour ne pas tout casser.
// `phaseFromTab` mappe vers les 3 phases narratives affichees dans la nav.
// En v17 on introduit la valeur "target" comme un onglet dedie au hub Cibler.
function phaseFromTab(tab) {
  if (tab === "target") return "target";
  if (tab === "ai") return "start";
  if (tab === "edit" || tab === "design"
   || tab === "score" || tab === "tools") return "finalize";
  return "start";
}
// Inverse : quel `tab` legacy declencher quand on choisit une phase ?
// Etape 4 remplacera "edit" par un Finalize unifie phase-natif.
function tabFromPhase(phase) {
  if (phase === "start") return { tab:"ai",     aiMode:"generate" };
  if (phase === "target") return { tab:"target", aiMode:null };
  if (phase === "finalize") return { tab:"edit", aiMode:null };
  return { tab:"ai", aiMode:"generate" };
}

// Icones SVG fines pour la nav 3 phases
const IconStart = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <path d="M14 2v6h6"/>
  </svg>
);
const IconTarget = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
);
const IconFinalize = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

// BottomNav v17 : 3 phases (Demarrer / Cibler / Finaliser).
// `active` est une phase ("start"/"target"/"finalize"), `onPhase` re-route.
function BottomNav({ active, onPhase, T }) {
  const items = [
    ["start",    IconStart,    T.ph_start],
    ["target",   IconTarget,   T.ph_target],
    ["finalize", IconFinalize, T.ph_finalize],
  ];
  return (
    <div style={{
      display:"flex",
      background:Paper,
      borderTop:"0.5px solid "+Gray200,
      padding:"10px 8px 22px",
      flexShrink:0,
      fontFamily:Sans,
      justifyContent:"space-around",
    }}>
      {items.map(([key, icon, label]) => {
        const isActive = active === key;
        return (
          <button key={key} onClick={()=>onPhase(key)} style={{
            ...B({
              display:"flex", flexDirection:"column",
              alignItems:"center", gap:4,
              padding:"6px 14px", borderRadius:RadiusMd,
              background:"transparent",
              flex:1, maxWidth:108,
              transition:"all 200ms ease-out",
            })
          }}>
            <span style={{
              width:24, height:24,
              display:"flex", alignItems:"center", justifyContent:"center",
              color:isActive ? Ink : Gray400,
              transition:"color 200ms ease-out",
            }}>{icon}</span>
            <span style={{
              fontSize:11,
              fontWeight:isActive ? 600 : 500,
              color:isActive ? Ink : Gray400,
              letterSpacing:"0.01em",
              transition:"color 200ms ease-out",
            }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}



// ============================================================
// OnboardScreen v17 : style editorial, fond cream-soft, hero Fraunces
// 4 cartes paper-on-cream avec icones gradient, mode import-adapt en Coral
// ============================================================
function OnboardScreen({ T, locale, setLocale, apiKey, mode, setMode,
  raw, setRaw, imping, onImport, setTab, setAiMode }) {

  // Style accent par mode (gold pour import simple, coral pour adapt)
  const accent     = mode === "import-adapt" ? Coral     : Gold;
  const accentSoft = mode === "import-adapt" ? CoralSoft : "rgba(201,169,110,.15)";
  const accentGrad = mode === "import-adapt" ? GradCoral : GradGold;

  // === Ecran de choix initial ===
  if (!mode) {
    const cards = [
      {
        key:"have", grad:GradGold,
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
        key:"adapt", grad:GradCoral,
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
        key:"create", grad:GradPurple,
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
        iconColor:Gold,
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
        <div style={{
          maxWidth:480, margin:"0 auto",
          padding:"28px 24px 40px",
          minHeight:"100%",
          display:"flex", flexDirection:"column",
        }}>
          {/* Brand */}
          <div style={{
            display:"flex", alignItems:"center", gap:10, marginBottom:48,
          }}>
            <div style={{
              width:36, height:36, background:GradDark,
              borderRadius:10, display:"flex",
              alignItems:"center", justifyContent:"center",
              color:Gold, fontFamily:Serif, fontWeight:600, fontSize:16,
              letterSpacing:"-0.02em",
            }}>CV</div>
            <div style={{
              fontFamily:Serif, fontWeight:500, fontSize:20,
              letterSpacing:"-0.01em", color:Ink,
            }}>Factory</div>
          </div>
          {/* Hero editorial */}
          <h1 style={{
            fontFamily:Serif, fontWeight:300,
            fontSize:42, lineHeight:1.05,
            letterSpacing:"-0.025em",
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

          {/* Eyebrow */}
          <div style={{
            fontSize:11, fontWeight:600,
            letterSpacing:"0.12em", textTransform:"uppercase",
            color:GoldDeep, marginBottom:12,
          }}>{T.ob_choose}</div>

          {/* Cartes CTA */}
          <div style={{
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
                  transition:"all 200ms ease-out",
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

          {/* Locale pills */}
          <div style={{
            display:"flex", justifyContent:"center", gap:8,
            padding:"32px 0 8px",
          }}>
            {[["fr","FR"],["en","EN"]].map(([lc,label]) => (
              <button key={lc} onClick={()=>setLocale(lc)} style={{
                ...B({
                  padding:"6px 14px", borderRadius:RadiusPill,
                  fontSize:12, fontWeight:500,
                  color:locale===lc ? Cream : Gray600,
                  background:locale===lc ? Ink : Paper,
                  border:"0.5px solid "+(locale===lc ? Ink : Gray200),
                })
              }}>{label}</button>
            ))}
          </div>
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
        maxWidth:520, margin:"0 auto",
        padding:"24px 24px 40px",
        minHeight:"100%",
        display:"flex", flexDirection:"column",
      }}>
        {/* Bouton retour */}
        <button onClick={()=>setMode(null)} style={{
          ...B({
            background:"none", color:Gray600, fontSize:13,
            fontFamily:Sans, fontWeight:500,
            textAlign:"left", padding:"4px 0", marginBottom:14,
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
          fontSize:32, lineHeight:1.1,
          letterSpacing:"-0.02em", color:Ink,
          textAlign:"center", margin:"0 0 10px",
        }}>{mode==="import-adapt" ? T.ob_import_first : T.ob_import_title}</h2>
        <p style={{
          fontSize:13, color:Gray600, lineHeight:1.6,
          textAlign:"center", margin:"0 0 24px",
        }}>
          {mode==="import-adapt" ? T.ob_import_sub_adapt : T.ob_import_sub_boost}
          {" "}{T.ob_import_format}
        </p>

        {/* Hidden file input */}
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
                alert(T.ob_file_format_err);
              }
            } catch (err) {
              alert(T.ob_file_read_err + ': ' + err.message);
            }
            e.target.value = '';
          }}
        />

        {/* Big upload card (paper, dashed accent) */}
        <button
          onClick={() => document.getElementById('cv-file-upload').click()}
          style={{
            ...B({
              padding:"26px 18px",
              borderRadius:RadiusMd,
              background:Paper,
              border:"1.5px dashed "+accent,
              color:accent,
              fontWeight:600, fontSize:14,
              display:"flex", flexDirection:"column",
              alignItems:"center", gap:10,
              fontFamily:Sans,
              boxShadow:ShadowSm,
              transition:"all 200ms ease-out",
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

        {/* Paste textarea */}
        <label style={{
          fontSize:11, fontWeight:600,
          letterSpacing:"0.1em", textTransform:"uppercase",
          color:GoldDeep, marginBottom:8, display:"block",
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

        {/* Submit button */}
        <button onClick={onImport} disabled={imping||!raw.trim()||!apiKey} style={{
          ...B({
            padding:"15px 22px",
            borderRadius:RadiusPill,
            background:imping||!raw.trim()||!apiKey
              ? Gray200
              : (mode==="import-adapt" ? GradCoral : GradGold),
            color:imping||!raw.trim()||!apiKey ? Gray600 : "#fff",
            fontWeight:600, fontSize:14,
            fontFamily:Sans,
            marginTop:14,
            transition:"all 200ms ease-out",
            display:"inline-flex",
            alignItems:"center", justifyContent:"center", gap:8,
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

        {/* Locale pills */}
        <div style={{
          display:"flex", justifyContent:"center", gap:8,
          padding:"24px 0 8px",
        }}>
          {[["fr","FR"],["en","EN"]].map(([lc,label]) => (
            <button key={lc} onClick={()=>setLocale(lc)} style={{
              ...B({
                padding:"6px 14px", borderRadius:RadiusPill,
                fontSize:12, fontWeight:500,
                color:locale===lc ? Cream : Gray600,
                background:locale===lc ? Ink : Paper,
                border:"0.5px solid "+(locale===lc ? Ink : Gray200),
              })
            }}>{label}</button>
          ))}
        </div>
      </div>
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


// ============================================================
// TargetHub v17 : phase Cibler, hub strategique central
// - Hero card Ink/Gold "Une offre -> candidature complete" + CTA cream
// - Score card violet si offre deja analysee (gradient purple sur le chiffre)
// - Grille 2x2 des 4 super-pouvoirs : Audit / Positioning / Truth / Pack
// ============================================================
function TargetHub({ T, cvIsEmpty, offerResult, locale,
  onOpenOffer, onOpenAudit, onOpenPos, onOpenTruth, onOpenPack }) {

  // Couleur du score (vert/jaune/orange/rouge)
  const scoreColor = (s) => {
    if (s >= 80) return Green;
    if (s >= 65) return GoldDeep;
    if (s >= 50) return Coral;
    return "#dc2626";
  };

  // Cas vide : rien a cibler tant qu'on n'a pas de CV.
  if (cvIsEmpty) {
    return (
      <div style={{fontFamily:Sans, padding:"8px 4px"}}>
        <h1 style={{
          fontFamily:Serif, fontWeight:400,
          fontSize:28, lineHeight:1.1,
          letterSpacing:"-0.02em", color:Ink,
          margin:"0 0 18px",
        }}>{T.ph_target}</h1>
        <div style={{
          background:Paper, borderRadius:RadiusLg,
          padding:"24px 22px", border:"0.5px solid "+Gray200,
          boxShadow:ShadowSm,
        }}>
          <div style={{
            fontSize:11, fontWeight:600,
            letterSpacing:"0.12em", textTransform:"uppercase",
            color:GoldDeep, marginBottom:8,
          }}>{T.hub_eyebrow}</div>
          <p style={{
            fontFamily:Serif, fontWeight:400,
            fontSize:18, lineHeight:1.35,
            letterSpacing:"-0.01em",
            color:Ink, margin:0,
          }}>{T.hub_empty}</p>
        </div>
      </div>
    );
  }

  // Cartes "super-pouvoirs"
  const powers = [
    {
      key:"audit", icon:(
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
      ),
      iconBg:"rgba(201,169,110,.15)", iconColor:GoldDeep,
      title:T.hub_audit, desc:T.hub_audit_desc, onClick:onOpenAudit,
    },
    {
      key:"pos", icon:(
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/>
        </svg>
      ),
      iconBg:PurpleSoft, iconColor:Purple,
      title:T.hub_pos, desc:T.hub_pos_desc, onClick:onOpenPos,
    },
    {
      key:"truth", icon:(
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"/>
          <path d="M16 19h6"/><path d="M19 16v6"/>
          <path d="M8 7h8"/><path d="M8 11h6"/>
        </svg>
      ),
      iconBg:CoralSoft, iconColor:Coral,
      title:T.hub_truth, desc:T.hub_truth_desc, onClick:onOpenTruth,
    },
    {
      key:"pack", icon:(
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6"/>
          <path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>
        </svg>
      ),
      iconBg:GreenSoft, iconColor:Green,
      title:T.hub_pack, desc:T.hub_pack_desc, onClick:onOpenPack,
    },
  ];

  const hasOffer = !!(offerResult && typeof offerResult.match_score === "number");

  return (
    <div style={{fontFamily:Sans, padding:"8px 4px"}}>
      {/* Header editorial */}
      <h1 style={{
        fontFamily:Serif, fontWeight:400,
        fontSize:28, lineHeight:1.1,
        letterSpacing:"-0.02em", color:Ink,
        margin:"0 0 16px",
      }}>{T.ph_target}</h1>

      {/* Hero card Ink/Gold avec radial gradient */}
      <div style={{
        position:"relative", overflow:"hidden",
        background:Ink, color:Cream,
        borderRadius:RadiusLg,
        padding:"24px 22px", marginBottom:14,
      }}>
        <div style={{
          position:"absolute", inset:0,
          background:"radial-gradient(ellipse 100% 80% at 90% 0%, rgba(201,169,110,.4) 0%, transparent 60%)",
          pointerEvents:"none",
        }}/>
        <div style={{
          fontSize:11, fontWeight:600,
          letterSpacing:"0.12em", textTransform:"uppercase",
          color:Gold, marginBottom:10, position:"relative",
        }}>{T.hub_eyebrow}</div>
        <h2 style={{
          fontFamily:Serif, fontWeight:400,
          fontSize:26, lineHeight:1.15,
          letterSpacing:"-0.02em",
          margin:"0 0 14px", position:"relative",
        }}>
          {T.hub_title_a}
          {" "}
          <em style={{fontStyle:"italic", color:Gold}}>
            {T.hub_title_em}
          </em>
          {", "}
          {T.hub_title_b}
        </h2>
        <button onClick={onOpenOffer} style={{
          ...B({
            display:"inline-flex", alignItems:"center", gap:8,
            background:Cream, color:Ink,
            padding:"13px 22px", borderRadius:RadiusPill,
            fontSize:14, fontWeight:600,
            fontFamily:Sans,
            position:"relative",
            transition:"all 200ms ease-out",
          })
        }}>
          {hasOffer ? T.hub_cta_change : T.hub_cta_paste}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        </button>
      </div>

      {/* Score card si offre analysee */}
      {hasOffer && (
        <button onClick={onOpenOffer} style={{
          ...B({
            width:"100%", textAlign:"left",
            background:Paper, borderRadius:RadiusLg,
            padding:"22px 22px", marginBottom:14,
            border:"0.5px solid "+Gray200,
            boxShadow:ShadowSm,
            fontFamily:Sans, color:Ink,
            transition:"all 200ms ease-out",
            display:"block", cursor:"pointer",
          })
        }}>
          <div style={{display:"flex", alignItems:"center", gap:18}}>
            <div style={{
              fontFamily:Serif, fontWeight:300,
              fontSize:56, lineHeight:1,
              letterSpacing:"-0.04em",
              background:GradPurple,
              WebkitBackgroundClip:"text",
              backgroundClip:"text",
              color:"transparent",
              flexShrink:0,
            }}>{offerResult.match_score}</div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{
                fontSize:11, fontWeight:600,
                letterSpacing:"0.1em", textTransform:"uppercase",
                color:Gray400, marginBottom:4,
              }}>{T.hub_match_label}</div>
              <div style={{
                fontFamily:Serif, fontSize:15, fontWeight:500,
                letterSpacing:"-0.01em",
                color:Ink, marginBottom:8,
                overflow:"hidden", textOverflow:"ellipsis",
                whiteSpace:"nowrap",
              }}>
                {offerResult.job_title || ""}
                {offerResult.company ? " - " + offerResult.company : ""}
              </div>
              <div style={{
                width:"100%", height:6, background:Gray100,
                borderRadius:RadiusPill, overflow:"hidden",
              }}>
                <div style={{
                  height:"100%",
                  width:Math.max(2, Math.min(100, offerResult.match_score)) + "%",
                  background:GradPurple,
                  borderRadius:RadiusPill,
                }}/>
              </div>
            </div>
          </div>
          {/* Tags mots-cles a integrer */}
          {(offerResult.keywords_to_add || []).length > 0 && (
            <div style={{
              display:"flex", flexWrap:"wrap", gap:6,
              marginTop:14,
            }}>
              {(offerResult.keywords_to_add || []).slice(0, 6).map((k,i)=>(
                <span key={i} style={{
                  padding:"5px 11px", borderRadius:RadiusPill,
                  fontSize:11, fontWeight:500,
                  background:Ink, color:Gold,
                  border:"0.5px solid "+Ink,
                }}>+ {k}</span>
              ))}
            </div>
          )}
        </button>
      )}

      {/* Eyebrow grille */}
      <div style={{
        fontSize:11, fontWeight:600,
        letterSpacing:"0.12em", textTransform:"uppercase",
        color:GoldDeep, marginTop:18, marginBottom:10,
      }}>{T.hub_subhead}</div>

      {/* Grille 2x2 super-pouvoirs */}
      <div style={{
        display:"grid",
        gridTemplateColumns:"1fr 1fr",
        gap:12,
      }}>
        {powers.map(p => (
          <button key={p.key} onClick={p.onClick} style={{
            ...B({
              background:Paper, borderRadius:RadiusMd,
              padding:"18px 16px",
              border:"0.5px solid "+Gray200,
              transition:"all 200ms ease-out",
              minHeight:130,
              display:"flex", flexDirection:"column",
              justifyContent:"space-between",
              textAlign:"left", fontFamily:Sans,
              boxShadow:ShadowSm,
            })
          }}>
            <div>
              <div style={{
                width:36, height:36, borderRadius:11,
                display:"flex", alignItems:"center", justifyContent:"center",
                background:p.iconBg, color:p.iconColor,
                marginBottom:12,
              }}>{p.icon}</div>
              <div style={{
                fontFamily:Serif, fontWeight:500,
                fontSize:15, letterSpacing:"-0.01em",
                color:Ink, marginBottom:4,
              }}>{p.title}</div>
              <div style={{
                fontSize:11, color:Gray600, lineHeight:1.4,
              }}>{p.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// OfferSheet v17 : sheet bottom iOS-native qui contient le MatchPanel.
// Permet d'analyser l'offre OU de re-consulter le resultat persiste.
// ============================================================
function OfferSheet({ T, cv, setCVFn, notify, apiKey,
  initialResult, onResult, onApplied, onPackRequest, onClose }) {
  return (
    <Sheet
      title={
        <>
          {T.off_title_a}{" "}
          <em style={{
            fontFamily:Serif, fontStyle:"italic", color:Gold,
          }}>{T.off_title_em}</em>
          {", "}{T.off_title_b}
        </>
      }
      eyebrow={T.off_eyebrow}
      onClose={onClose}
    >
      <p style={{
        fontSize:13, color:Gray600, lineHeight:1.5,
        margin:"0 0 18px", fontFamily:Sans,
      }}>{T.off_sub}</p>
      <MatchPanel
        cv={cv}
        setCVFn={setCVFn}
        notify={notify}
        apiKey={apiKey}
        T={T}
        onPackRequest={onPackRequest}
        initialResult={initialResult}
        onResult={onResult}
        onApplied={onApplied}
      />
    </Sheet>
  );
}


export default function App() {
  // === HYDRATION-SAFE STATE INITIALIZATION ===
  // All states that depend on localStorage or window are initialized to
  // deterministic defaults. They are hydrated from localStorage in a useEffect
  // below, AFTER the first client render matches the server render.
  // This eliminates React hydration errors #418 / #423.
  const [hydrated, setHydrated] = useState(false);

  const [cv, setCV_]       = useState(EMPTY);
  const [thN, setThN_]     = useState("executive");
  const [layout, setLy_]   = useState("sidebar");
  const [apiKey, setAK_]   = useState("server-managed");
  const [locale, setLc_]   = useState("fr");
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
  const [versions, setVersions]       = useState([]);
  const [bt, setBt]                   = useState(null);
  // v17 : phase Cibler
  const [offerResult, setOfferResult] = useState(null);
  const [showOffer, setShowOffer]     = useState(false);
  // v17 : phase Finaliser
  const [showScore, setShowScore]     = useState(false);
  const cRef = useRef();

  // Hydrate from localStorage AFTER first render. This is the only safe
  // moment to read localStorage in a Next.js / SSR context.
  useEffect(() => {
    const savedCV = lsG(SK.CV, null);
    if (savedCV) {
      setCV_({
        ...EMPTY, ...savedCV,
        skills:         Array.isArray(savedCV.skills)         ? savedCV.skills         : EMPTY.skills,
        languages:      Array.isArray(savedCV.languages)      ? savedCV.languages      : EMPTY.languages,
        certifications: Array.isArray(savedCV.certifications) ? savedCV.certifications : EMPTY.certifications,
        experience:     Array.isArray(savedCV.experience)     ? savedCV.experience     : EMPTY.experience,
        education:      Array.isArray(savedCV.education)      ? savedCV.education      : EMPTY.education,
      });
    }
    const savedTh = lsG(SK.TH, "executive");
    if (savedTh !== "executive") setThN_(savedTh);
    const savedLy = lsG(SK.LY, "sidebar");
    if (savedLy !== "sidebar") setLy_(savedLy);
    const savedKy = lsG(SK.KY, "");
    if (savedKy) setAK_(savedKy);
    const savedLc = lsG(SK.LC, "fr");
    if (savedLc !== "fr") setLc_(savedLc);
    const savedVs = lsG(SK.VS, []);
    if (Array.isArray(savedVs) && savedVs.length) setVersions(savedVs);
    setHydrated(true);
  }, []);

  const setCVFn = useCallback(fn => setCV_(p => {
    const n = typeof fn==="function" ? fn(p) : fn;
    lsS(SK.CV, n);
    return n;
  }), []);
  const setTh = useCallback(v => { setThN_(v); lsS(SK.TH, v); }, []);
  const setLy = useCallback(v => { setLy_(v);  lsS(SK.LY, v); }, []);
  const setAK = useCallback(v => { setAK_(v);  lsS(SK.KY, v); }, []);
  const setLc = useCallback(v => { setLc_(v);  lsS(SK.LC, v); }, []);

  // === v17 : phase router ===
  // Expose un setPhase qui pilote le couple (tab, aiMode) pour rester compat
  // avec tout le code legacy qui aiguille via setTab/setAiMode.
  // phase : "start" | "target" | "finalize"
  const phase = phaseFromTab(tab);
  const setPhase = useCallback(p => {
    const m = tabFromPhase(p);
    setTab(m.tab);
    if (m.aiMode) setAiMode(m.aiMode);
  }, []);

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

  const runBulletTransform = useCallback(async (expId, bulletIdx, text) => {
    if (!apiKey) { notify(T.nk); return; }
    if (!text || !text.trim()) {
      notify(T.bt_empty || "Ecris d'abord un bullet a transformer");
      return;
    }
    setBt({ expId, bulletIdx, original: text, levels: null, loading: true });
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
      setBt(s => s ? { ...s, levels: r, loading: false } : null);
    } catch (err) {
      notify((T.bt_err || "Erreur transformation: ") + (err.message || ""));
      setBt(null);
    }
  }, [apiKey, notify, T]);

  const adoptBulletVersion = useCallback((newText) => {
    setBt(curr => {
      if (!curr) return null;
      setCVFn(p => ({
        ...p,
        experience: p.experience.map(e =>
          e.id === curr.expId
            ? { ...e, bullets: e.bullets.map((b, i) => i === curr.bulletIdx ? newText : b) }
            : e
        )
      }));
      notify(T.bt_adopted || "Version adoptee");
      return null;
    });
  }, [notify, T]);

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
      const wasAdaptMode = obMode === "import-adapt";
      setObMode(null);
      if (wasAdaptMode) {
        // Apres import-adapt : aller en phase Cibler et ouvrir le sheet d'offre
        setTab("target");
        setShowOffer(true);
      } else {
        // Apres import simple : aller sur Ajuster (le CV existe deja)
        setTab("ai");
        setAiMode("adjust");
      }
      notify(T.okimp);
    } catch { notify(T.ep); }
    setObImp(false);
  }, [obRaw, apiKey, T, setCVFn, notify, obMode, setTab, setAiMode, setShowOffer]);

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
        display:"flex", gap:6, marginBottom:18,
        padding:4,
      }}>
        {[["generate", T.tab_gen],
          ["adjust",   T.tab_adj]].map(([m, label]) => {
            const a = aiMode === m;
            return (
              <button key={m} onClick={()=>setAiMode(m)} style={{
                ...B({
                  flex:1, padding:"10px 14px", borderRadius:RadiusPill,
                  background:a ? Ink : Paper,
                  color:a ? Cream : Ink,
                  border:"0.5px solid "+(a ? Ink : Gray200),
                  fontWeight:a ? 600 : 500, fontSize:13,
                  fontFamily:Sans,
                  textAlign:"center",
                  transition:"all 180ms ease-out",
                })
              }}>{label}</button>
            );
          })}
      </div>
      {aiMode==="generate" && (
        <AIPanel onGen={handleGen} loading={load} apiKey={apiKey} T={T}
          cvIsEmpty={cvIsEmpty} onSwitchToAdjust={()=>setAiMode("adjust")}/>
      )}
      {aiMode==="adjust" && (
        <AdjustPanel cv={cv} setCVFn={setCVFn} notify={notify} apiKey={apiKey} T={T}
          prefillInst={adjPrefill}
          onPrefillConsumed={()=>setAdjPrefill("")}/>
      )}
      {aiMode==="match" && (
        <MatchPanel cv={cv} setCVFn={setCVFn} notify={notify} apiKey={apiKey} T={T}
          onPackRequest={requestPack}
          initialResult={offerResult}
          onResult={setOfferResult}
          onApplied={()=>setOfferResult(null)}/>
      )}
    </div>
  );

  // v17 : phase Cibler (le hub) + sheet d'offre quand on l'ouvre.
  const TargetHubContent = (
    <TargetHub
      T={T} cvIsEmpty={cvIsEmpty}
      offerResult={offerResult} locale={locale}
      onOpenOffer={()=>setShowOffer(true)}
      onOpenAudit={()=>setShowAudit(true)}
      onOpenPos={runPositioning}
      onOpenTruth={runTruthCheck}
      onOpenPack={()=>{
        // Si on a deja une analyse offre, on lance le pack avec ce contexte.
        // Sinon on demande d'abord de coller une offre.
        if (offerResult) {
          requestPack("", offerResult);
        } else {
          setShowOffer(true);
        }
      }}
    />
  );

  // ============================================================
  // FinalizeContent v17 : remplace EditContent + DesignContent + ToolsContent.
  // Sections editoriales avec eyebrow gold-deep, titres Fraunces, cards Paper.
  // ============================================================
  const finEyebrow = {
    fontSize:11, fontWeight:600,
    letterSpacing:"0.12em", textTransform:"uppercase",
    color:GoldDeep, marginTop:24, marginBottom:10,
    display:"block",
  };
  const finRow = {
    width:"100%", padding:"14px 16px",
    borderRadius:RadiusMd,
    background:Paper, color:Ink,
    border:"0.5px solid "+Gray200,
    boxShadow:ShadowSm,
    display:"flex", alignItems:"center", gap:12,
    textAlign:"left", fontFamily:Sans, fontSize:14,
    fontWeight:500, marginBottom:8,
    transition:"all 200ms ease-out",
  };
  const finRowChevron = (
    <span style={{
      color:Gray400, marginLeft:"auto", flexShrink:0,
      display:"inline-flex",
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 18 6-6-6-6"/>
      </svg>
    </span>
  );
  const finIconWrap = (bg, color) => ({
    width:32, height:32, borderRadius:10,
    background:bg, color:color,
    display:"flex", alignItems:"center", justifyContent:"center",
    flexShrink:0,
  });
  const finPill = (active) => ({
    padding:"10px 14px", borderRadius:RadiusPill,
    fontSize:12, fontWeight:active ? 600 : 500,
    color:active ? Cream : Ink,
    background:active ? Ink : Paper,
    border:"0.5px solid "+(active ? Ink : Gray200),
    fontFamily:Sans,
    transition:"all 180ms ease-out",
  });

  const FinalizeContent = (
    <div style={{fontFamily:Sans, padding:"8px 4px"}}>
      <h1 style={{
        fontFamily:Serif, fontWeight:400,
        fontSize:28, lineHeight:1.1,
        letterSpacing:"-0.02em", color:Ink,
        margin:"0 0 4px",
      }}>{T.ph_finalize}</h1>

      {/* === Editer le CV === */}
      <div style={finEyebrow}>{T.fin_section_edit}</div>
      {editSects.map(([label, m]) => (
        <button key={m} onClick={()=>setModal(m)} style={{...B(finRow)}}>
          <span style={finIconWrap("rgba(201,169,110,.15)", GoldDeep)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </span>
          <span style={{flex:1}}>{label}</span>
          {finRowChevron}
        </button>
      ))}
      <div style={{
        padding:"10px 14px", background:CreamSoft,
        borderRadius:RadiusSm, fontSize:11, color:Gray600,
        lineHeight:1.6, marginTop:6,
        border:"0.5px solid "+Gray200,
      }}>{T.edit_tip}</div>

      {/* === Stratégie === */}
      <div style={finEyebrow}>{T.fin_section_strategy}</div>
      <button onClick={()=>setShowScore(true)} style={{...B(finRow)}}>
        <span style={finIconWrap(PurpleSoft, Purple)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </span>
        <span style={{flex:1}}>{T.fin_score_btn}</span>
        {finRowChevron}
      </button>
      <button onClick={runPositioning} style={{...B(finRow)}}>
        <span style={finIconWrap(PurpleSoft, Purple)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
          </svg>
        </span>
        <span style={{flex:1}}>{T.fin_pos_btn}</span>
        {finRowChevron}
      </button>
      <button onClick={runTruthCheck} style={{...B(finRow)}}>
        <span style={finIconWrap(CoralSoft, Coral)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"/>
            <path d="M16 19h6"/><path d="M19 16v6"/>
          </svg>
        </span>
        <span style={{flex:1}}>{T.fin_truth_btn}</span>
        {finRowChevron}
      </button>
      <button onClick={()=>setShowVersions(true)} style={{...B(finRow)}}>
        <span style={finIconWrap("rgba(201,169,110,.15)", GoldDeep)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 8v13H3V8"/>
            <path d="M1 3h22v5H1z"/>
            <path d="M10 12h4"/>
          </svg>
        </span>
        <span style={{flex:1}}>{T.fin_versions_btn} ({versions.length})</span>
        {finRowChevron}
      </button>

      {/* === Apparence === */}
      <div style={finEyebrow}>{T.fin_section_design}</div>
      <div style={{
        fontSize:11, fontWeight:600,
        letterSpacing:"0.06em", color:Gray600,
        marginBottom:8, marginTop:4,
      }}>{T.dth}</div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14}}>
        {Object.entries(THEMES).map(([k, th]) => {
          const active = thN === k;
          return (
            <button key={k} onClick={()=>setTh(k)} style={{
              ...B({
                display:"flex", alignItems:"center", gap:10,
                padding:"12px 12px", borderRadius:RadiusMd,
                border:active ? "1.5px solid "+Ink : "0.5px solid "+Gray200,
                background:active ? CreamSoft : Paper,
                textAlign:"left",
                boxShadow:active ? "none" : ShadowSm,
                transition:"all 180ms ease-out",
              })
            }}>
              <div style={{
                width:22, height:22, borderRadius:6,
                background:th.sb, border:"1.5px solid "+th.ac, flexShrink:0,
              }}/>
              <span style={{
                fontSize:12, fontWeight:active ? 600 : 500,
                color:Ink, fontFamily:Sans,
              }}>{th.name}</span>
            </button>
          );
        })}
      </div>
      <div style={{
        fontSize:11, fontWeight:600,
        letterSpacing:"0.06em", color:Gray600,
        marginBottom:8,
      }}>{T.dly}</div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:8}}>
        {LAYOUTS.map(k => (
          <button key={k} onClick={()=>setLy(k)} style={{...B(finPill(layout===k))}}>
            {k.charAt(0).toUpperCase() + k.slice(1)}
          </button>
        ))}
      </div>
      {layout==="ats" && (
        <div style={{
          marginTop:6, padding:"10px 14px", background:GreenSoft,
          borderRadius:RadiusSm, fontSize:11, color:"#166534",
          border:"0.5px solid rgba(22,163,74,.25)",
        }}>{T.dats}</div>
      )}

      {/* Templates */}
      <div style={{
        fontSize:11, fontWeight:600,
        letterSpacing:"0.06em", color:Gray600,
        marginBottom:8, marginTop:14,
      }}>{T.fin_template_section}</div>
      {TEMPLATES.map(tpl => (
        <div key={tpl.id} style={{
          borderRadius:RadiusMd, border:"0.5px solid "+Gray200,
          background:Paper, overflow:"hidden", marginBottom:8,
          boxShadow:ShadowSm,
        }}>
          <div style={{padding:"12px 14px"}}>
            <div style={{
              fontFamily:Serif, fontSize:14, fontWeight:500,
              letterSpacing:"-0.01em", color:Ink, marginBottom:2,
            }}>{tpl.label}</div>
            <div style={{fontSize:11, color:Gray600}}>
              {(tpl.cv.title || "").slice(0, 50)}
            </div>
          </div>
          <button onClick={()=>loadTpl(tpl)} style={{
            ...B({
              width:"100%", padding:"9px 14px",
              background:CreamSoft, color:Ink,
              fontWeight:500, fontSize:12,
              borderTop:"0.5px solid "+Gray200,
              fontFamily:Sans, textAlign:"center",
            })
          }}>{T.fin_template_load}</button>
        </div>
      ))}

      {/* === Traduction === */}
      <div style={finEyebrow}>{T.fin_section_translate}</div>
      <button onClick={()=>setShowTranslate(true)} style={{
        ...B({
          width:"100%", padding:"15px 22px", borderRadius:RadiusPill,
          background:GradGold, color:"#fff",
          fontFamily:Sans, fontWeight:600, fontSize:14,
          display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
          marginBottom:8,
          transition:"all 200ms ease-out",
        })
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/>
          <path d="M2 5h12"/><path d="M7 2h1"/>
          <path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>
        </svg>
        {T.tr_btn}
      </button>
      {hasBackup && (
        <button onClick={restoreBackup} style={{
          ...B({
            width:"100%", padding:"12px 16px", borderRadius:RadiusMd,
            background:Paper, color:Ink,
            border:"0.5px solid "+Gray200,
            fontSize:13, fontWeight:500, fontFamily:Sans,
            boxShadow:ShadowSm,
            transition:"all 200ms ease-out",
          })
        }}>{T.tr_restore}</button>
      )}

      {/* === Export & historique === */}
      <div style={finEyebrow}>{T.fin_section_export}</div>
      <button onClick={exportPDF} style={{
        ...B({
          width:"100%", padding:"15px 22px", borderRadius:RadiusPill,
          background:GradDark, color:Cream,
          fontFamily:Sans, fontWeight:600, fontSize:14,
          display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
          marginBottom:8,
          transition:"all 200ms ease-out",
        })
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        {T.t_pdf}
      </button>
      {layout!=="ats" && (
        <div style={{
          fontSize:11, color:Gray600, marginBottom:10,
          padding:"10px 14px", background:CreamSoft,
          borderRadius:RadiusSm, lineHeight:1.6,
          border:"0.5px solid "+Gray200,
        }}>{T.t_ath}</div>
      )}
      <button onClick={undo} disabled={!hist.length} style={{
        ...B({
          width:"100%", padding:"12px 16px", borderRadius:RadiusMd,
          background:Paper, color:!hist.length ? Gray400 : Ink,
          border:"0.5px solid "+Gray200,
          fontSize:13, fontWeight:500, fontFamily:Sans,
          boxShadow:!hist.length ? "none" : ShadowSm,
          marginBottom:8,
          transition:"all 200ms ease-out",
        })
      }}>{T.fin_undo_btn} ({hist.length})</button>
      <button onClick={doReset} style={{
        ...B({
          width:"100%", padding:"12px 16px", borderRadius:RadiusMd,
          background:CoralSoft, color:Coral,
          border:"0.5px solid "+Coral,
          fontSize:13, fontWeight:500, fontFamily:Sans,
          transition:"all 200ms ease-out",
        })
      }}>{T.t_rst}</button>

      {/* === Réglages === */}
      <div style={finEyebrow}>{T.fin_section_settings}</div>
      <div style={{
        fontSize:11, fontWeight:600,
        letterSpacing:"0.06em", color:Gray600,
        marginBottom:8,
      }}>{T.fin_iface_lang}</div>
      <div style={{display:"flex", gap:8, marginBottom:14}}>
        {[["fr","FR"],["en","EN"]].map(([lc,label]) => (
          <button key={lc} onClick={()=>setLc(lc)} style={{...B(finPill(locale===lc))}}>
            {label}
          </button>
        ))}
      </div>
      <div style={{
        fontSize:11, fontWeight:600,
        letterSpacing:"0.06em", color:Gray600,
        marginBottom:8,
      }}>{T.t_api}</div>
      <input type="password" value={apiKey}
        onChange={e=>setAK(e.target.value)}
        placeholder={T.t_aph}
        style={{
          width:"100%", padding:"12px 14px",
          borderRadius:RadiusSm,
          border:"0.5px solid "+Gray200,
          background:Paper,
          fontFamily:"ui-monospace, monospace", fontSize:12,
          color:Ink, outline:"none", boxSizing:"border-box",
          marginBottom:6,
        }}/>
      <div style={{
        fontSize:11, color:Gray400, lineHeight:1.5,
        marginBottom:14,
      }}>{T.t_ahi}</div>

      {/* Quick actions */}
      <div style={finEyebrow}>{T.t_qck}</div>
      {quick.map(([l, fn], i) => (
        <button key={i} onClick={fn} style={{
          ...B({
            width:"100%", padding:"12px 14px", borderRadius:RadiusMd,
            background:Paper, color:Ink,
            border:"0.5px solid "+Gray200,
            fontSize:13, fontWeight:500, fontFamily:Sans,
            textAlign:"left", marginBottom:7,
            boxShadow:ShadowSm,
            transition:"all 200ms ease-out",
          })
        }}>{l}</button>
      ))}
    </div>
  );

  const Modals = (
    <>
      {modal==="id"  && <SheetId cv={cv} set={setCVFn} onClose={()=>setModal(null)} T={T}/>}
      {modal==="exp" && <SheetEx cv={cv} set={setCVFn} onClose={()=>setModal(null)}
        onTransformBullet={runBulletTransform} T={T}/>}
      {modal==="edu" && <SheetEd cv={cv} set={setCVFn} onClose={()=>setModal(null)} T={T}/>}
      {modal==="sk"  && <SheetSk cv={cv} set={setCVFn} onClose={()=>setModal(null)} T={T}/>}
      {showOffer && (
        <OfferSheet
          T={T} cv={cv} setCVFn={setCVFn}
          notify={notify} apiKey={apiKey}
          initialResult={offerResult}
          onResult={setOfferResult}
          onApplied={()=>{ setOfferResult(null); setShowOffer(false); }}
          onPackRequest={requestPack}
          onClose={()=>setShowOffer(false)}
        />
      )}
      {showScore && (
        <Sheet
          eyebrow={T.fin_score_eyebrow}
          title={T.fin_score_btn}
          onClose={()=>setShowScore(false)}
        >
          <ScorePanel cv={cv} apiKey={apiKey} notify={notify}
            layout={layout} T={T}/>
        </Sheet>
      )}
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
      {bt && (
        <BulletTransformer
          original={bt.original}
          levels={bt.levels}
          loading={bt.loading}
          onAdopt={adoptBulletVersion}
          onClose={()=>{ if (!bt.loading) setBt(null); }}
          T={T}
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

  if (!hydrated) {
    return (
      <div suppressHydrationWarning style={{
        minHeight:"100vh",
        background:CreamSoft,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:Sans,
      }}>
        <div style={{
          width:48, height:48,
          border:"3px solid "+Gold+"33", borderTopColor:Gold,
          borderRadius:"50%",
          animation:"cvfSpin 1s linear infinite",
        }}/>
        <style>{KEYFRAMES_V17}</style>
      </div>
    );
  }

    if (!mob) {
    const tS = a => ({
      ...B({
        flex:1, padding:"14px 0", fontSize:13,
        fontWeight:a?600:500, color:a?Ink:Gray400,
        borderBottom:a?"2px solid "+Ink:"2px solid transparent",
        textAlign:"center", fontFamily:Sans,
        background:"transparent",
        transition:"all 200ms ease-out",
      })
    });
    return (
      <>
        <link href={FONT} rel="stylesheet"/>
        <style>{KEYFRAMES_V17}</style>
        {notif && <Notif msg={notif}/>}
        {Modals}
        {Onboard}
        <div style={{
          display:"flex", height:"100vh",
          fontFamily:Sans,
          background:CreamSoft, overflow:"hidden",
        }}>
          <div style={{
            width:300, background:Paper,
            borderRight:"0.5px solid "+Gray200,
            display:"flex", flexDirection:"column",
            overflow:"hidden", flexShrink:0,
          }}>
            <div style={{padding:"18px 20px", background:Paper,
              borderBottom:"0.5px solid "+Gray200,
              display:"flex", alignItems:"center", gap:10}}>
              <div style={{
                width:30, height:30, background:GradDark,
                borderRadius:9, display:"flex",
                alignItems:"center", justifyContent:"center",
                color:Gold, fontFamily:Serif, fontWeight:600, fontSize:14,
                letterSpacing:"-0.02em",
              }}>CV</div>
              <div>
                <div style={{
                  fontFamily:Serif, fontWeight:500, fontSize:17,
                  letterSpacing:"-0.01em", color:Ink, lineHeight:1,
                }}>Factory</div>
                <div style={{
                  color:Gray400, fontSize:10, marginTop:3,
                  fontFamily:Sans,
                }}>{T.appSub}</div>
              </div>
            </div>
            <div style={{
              display:"flex",
              borderBottom:"0.5px solid "+Gray200,
              padding:"0 8px",
            }}>
              {[["start", T.ph_start],
                ["target", T.ph_target],
                ["finalize", T.ph_finalize]].map(([k, label]) => (
                  <button key={k}
                    style={tS(phase===k)}
                    onClick={()=>setPhase(k)}>
                    {label}
                  </button>
                ))}
            </div>
            <div style={{flex:1, overflowY:"auto", padding:"18px 18px 24px"}}>
              {tab==="ai"     && AITabContent}
              {tab==="target" && TargetHubContent}
              {(tab==="edit" || tab==="design"
                || tab==="score" || tab==="tools") && FinalizeContent}
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
      <style>{KEYFRAMES_V17}</style>
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
        overflow:"hidden", background:CreamSoft,
        fontFamily:Sans,
      }}>
        <div style={{
          display:"flex", alignItems:"center",
          justifyContent:"space-between",
          padding:"12px 16px", background:Paper,
          borderBottom:"0.5px solid "+Gray200,
          flexShrink:0,
        }}>
          <div style={{display:"flex", alignItems:"center", gap:10}}>
            <div style={{
              width:28, height:28, background:GradDark,
              borderRadius:8, display:"flex",
              alignItems:"center", justifyContent:"center",
              color:Gold, fontFamily:Serif, fontWeight:600, fontSize:13,
              letterSpacing:"-0.02em",
            }}>CV</div>
            <div style={{
              fontFamily:Serif, fontWeight:500, fontSize:16,
              letterSpacing:"-0.01em", color:Ink, lineHeight:1,
            }}>Factory</div>
          </div>
          <div style={{display:"flex", gap:6}}>
            <button onClick={()=>setZoomed(true)} style={{
              ...B({
                background:Paper, color:Ink,
                border:"0.5px solid "+Gray200,
                borderRadius:RadiusPill, padding:"6px 12px",
                fontSize:11, fontWeight:500, fontFamily:Sans,
              })
            }}>{T.zoom}</button>
            <button onClick={()=>setShowCV(p=>!p)} style={{
              ...B({
                background:showCV ? Paper : Ink,
                color:showCV ? Ink : Cream,
                border:"0.5px solid "+(showCV ? Gray200 : Ink),
                borderRadius:RadiusPill, padding:"6px 12px",
                fontSize:11, fontWeight:500, fontFamily:Sans,
              })
            }}>{showCV ? T.hide : T.show}</button>
          </div>
        </div>
        {showCV && (
          <div ref={cRef} style={{
            background:Gray100, padding:"7px", flexShrink:0,
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
          {tab==="target" && TargetHubContent}
          {(tab==="edit" || tab==="design"
            || tab==="score" || tab==="tools") && FinalizeContent}
        </div>
        <BottomNav active={phase} onPhase={setPhase} T={T}/>
      </div>
    </>
  );
}
