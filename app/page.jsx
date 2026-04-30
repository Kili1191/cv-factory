"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import BulletTransformer from "./components/BulletTransformer";
import ScoreDashboard from "./components/ScoreDashboard";
import GapRepairModal from "./components/GapRepairModal";
import InterviewModal from "./components/InterviewModal";
import VersionsModal from "./components/VersionsModal";
import TruthModal from "./components/TruthModal";
import PositioningModal from "./components/PositioningModal";
import TranslateModal from "./components/TranslateModal";
import AuditModal from "./components/AuditModal";
import ApplicationPackModal from "./components/ApplicationPackModal";
import { E, FR, SaveBtn, MK } from "./components/EditHelpers";
import { SheetId, SheetEx, SheetEd, SheetSk } from "./components/EditSheets";
import { CVSidebar, CVAts } from "./components/CVLayouts";
import CoachModal, { CoachFAB } from "./components/CoachModal";
import LinkedInExportModal from "./components/LinkedInExportModal";
import CVCompareModal from "./components/CVCompareModal";
import ApplicationsTrackerModal from "./components/ApplicationsTrackerModal";
import MultiCVStrategyModal from "./components/MultiCVStrategyModal";
import {
  detectGaps, analyzeYearOnlyStrategy, findGroupingOpportunities,
  countUnparsable, parsePeriod, reformatPeriodToYearOnly, formatDate,
} from "./components/dateUtils";

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

const SK = { CV:"cvf_d", TH:"cvf_t", LY:"cvf_l", KY:"cvf_k", LC:"cvf_c", BK:"cvf_bk", VS:"cvf_vs", CT:"cvf_ct", CO:"cvf_co", AP:"cvf_ap" };

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
  bt_eyebrow:"Bullet",
  // Bullet Transformer pour le summary (accroche) : 3 registres communs + 2 adaptes.
  bts_eyebrow:"Accroche",
  bts_title:"5 angles, ton choix.",
  bts_sub:"5 reformulations de ton accroche, registres differents.",
  bts_btn:"Transformer l'accroche",
  bts_empty:"Ecris d'abord une accroche a transformer",
  bts_sobre:"Sobre", bts_sobre_hint:"Factuel, sans superlatifs",
  bts_story:"Storytelling", bts_story_hint:"Narration fil rouge",
  bts_adopted:"Accroche adoptee",
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
  // === CV Score Dashboard 8 axes ===
  sd_tab_dashboard:"Diagnostic 8",
  sd_tab_quick:"Score rapide",
  sd_eyebrow:"Diagnostic IA",
  sd_title_a:"8 axes,", sd_title_em:"un verdict.", sd_title_b:"",
  sd_sub:"L'IA analyse 8 dimensions de ton CV et te dit ou agir en priorite.",
  sd_run:"Analyser mon CV",
  sd_running:"L'IA decortique ton CV...",
  sd_running_sub:"8 axes a evaluer, 30 secondes.",
  sd_global:"Score global",
  sd_priority:"Priorite numero 1",
  sd_no_cv:"Charge d'abord un CV",
  sd_reco:"Recommandation",
  sd_cta_fix:"Aller a l'outil",
  sd_back_top:"Retour en haut",
  // 8 axes (nom + sub-titre court)
  sd_ax_title:"Clarte du titre",
  sd_ax_title_sub:"Le metier visible en 1 seconde",
  sd_ax_bullets:"Impact des bullets",
  sd_ax_bullets_sub:"Chiffres et resultats concrets",
  sd_ax_ats:"ATS-friendly",
  sd_ax_ats_sub:"Mots-cles et format pro",
  sd_ax_relevance:"Pertinence du parcours",
  sd_ax_relevance_sub:"Coherence avec le metier vise",
  sd_ax_credibility:"Credibilite",
  sd_ax_credibility_sub:"Phrases solides, sans bullshit",
  sd_ax_design:"Style et design",
  sd_ax_design_sub:"Lisibilite visuelle, hierarchie",
  sd_ax_readability:"Lisibilite",
  sd_ax_readability_sub:"Longueur, densite, equilibre",
  sd_ax_differentiation:"Differenciation",
  sd_ax_differentiation_sub:"Ce qui te rend unique",
  // CTA labels par axe (ce qu'on va faire)
  sd_cta_title:"Editer le titre",
  sd_cta_bullets:"Transformer les bullets",
  sd_cta_ats:"Activer ATS-Safe",
  sd_cta_relevance:"Voir le positionnement",
  sd_cta_credibility:"Lancer Truth Check",
  sd_cta_design:"Personnaliser",
  sd_cta_readability:"Editer les experiences",
  sd_cta_differentiation:"Voir le positionnement",
  // === Gap Repair (Lisser le parcours) ===
  gr_btn:"Lisser le parcours",
  gr_eyebrow:"Chronologie",
  gr_title_a:"Faire", gr_title_em:"disparaitre", gr_title_b:"les trous.",
  gr_sub:"L'IA detecte les trous et propose comment les masquer sans mentir.",
  gr_run:"Analyser ma chronologie",
  gr_running:"Analyse de la chronologie...",
  gr_running_sub:"On detecte les trous et on cherche les meilleures strategies.",
  gr_no_cv:"Charge d'abord un CV",
  gr_no_gaps_title:"Aucun trou detecte.",
  gr_no_gaps_sub:"Ta chronologie est lisse.",
  gr_unparsable:"Standardise d'abord les dates de tes experiences.",
  gr_unparsable_sub:"Format attendu : MM/YYYY ou YYYY. L'IA ne peut analyser que des dates structurees.",
  gr_gap_title:"Trou de",
  gr_gap_months:"mois",
  gr_gap_year:"an",
  gr_gap_years:"ans",
  gr_gap_between:"entre",
  gr_gap_and:"et",
  gr_gap_present:"aujourd'hui",
  // 4 strategies
  gr_strat_year:"Format annees seulement",
  gr_strat_year_sub:"Reformatter toutes tes dates en YYYY au lieu de MM/YYYY. Un trou de quelques mois disparait.",
  gr_strat_year_btn:"Appliquer le format annees",
  gr_strat_year_warn:"Cela va modifier toutes les dates de toutes tes experiences.",
  gr_strat_year_done:"Dates reformatees en annees",
  gr_strat_year_partial:"Format annees seulement reduit certains trous mais pas tous.",
  gr_strat_year_full:"Le format annees seulement fait disparaitre tous tes trous.",
  gr_strat_year_useless:"Le format annees seulement ne change rien : tes trous sont trop longs.",
  gr_strat_extend:"Etirement legitime",
  gr_strat_extend_sub:"Etendre la fin de l'experience precedente pour inclure la transition (negociation, onboarding).",
  gr_strat_extend_btn:"Etendre cette experience",
  gr_strat_extend_warn:"Uniquement si tu peux defendre cette periode (preavis, transition, onboarding).",
  gr_strat_extend_done:"Date etendue",
  gr_strat_group:"Regroupement",
  gr_strat_group_sub:"Fusionner plusieurs missions courtes en une seule ligne continue.",
  gr_strat_group_btn:"Fusionner ces experiences",
  gr_strat_group_warn:"Les bullets seront combines, les dates passent en couverture continue.",
  gr_strat_group_done:"Experiences fusionnees",
  gr_strat_functional:"Format fonctionnel",
  gr_strat_functional_sub:"CV par competences plutot que chronologique. Les dates passent au second plan.",
  gr_strat_functional_btn:"Voir comment faire",
  gr_strat_functional_help:"Reorganise ton CV par theme (Expertise, Realisations, Formation) plutot que par dates. Active le layout adapte dans Apparence.",
  gr_no_strategies:"Pas de strategie automatique pour ce trou.",
  gr_no_strategies_sub:"Tu peux le combler manuellement en ajoutant une experience (formation, projets, conseil).",
  gr_section_strategies:"Strategies disponibles",
  gr_section_results:"Trous detectes",
  // === Interview Continuity (Preparer l'entretien) ===
  iv_btn:"Preparer l'entretien",
  iv_btn_desc:"L'IA simule le recruteur typique de ton marche",
  iv_eyebrow:"Apres le CV",
  iv_title_a:"L'entretien", iv_title_em:"se prepare", iv_title_b:".",
  iv_sub:"L'IA joue le recruteur de ton marche et te liste les questions probables, avec des reponses STAR pretes.",
  iv_run:"Generer mes questions",
  iv_run_again:"Regenerer d'autres questions",
  iv_running:"L'IA simule un recruteur senior...",
  iv_running_sub:"Pays, secteur, niveau : analyse complete.",
  iv_no_cv:"Charge d'abord un CV",
  iv_offer_label:"Offre d'emploi (optionnel)",
  iv_offer_ph:"Colle l'offre pour des questions ultra-ciblees, ou laisse vide pour un mode generique.",
  iv_offer_already:"Offre detectee depuis Cibler. On l'utilise.",
  iv_meta_country:"Pays",
  iv_meta_role:"Niveau",
  iv_meta_count:"questions",
  iv_progress:"Question",
  iv_of:"sur",
  iv_prev:"Precedente",
  iv_next:"Suivante",
  // 3 categories de questions
  iv_cat_tech:"Technique",
  iv_cat_behav:"Comportementale",
  iv_cat_case:"Cas pratique",
  iv_cat_culture:"Culture",
  iv_cat_motiv:"Motivation",
  iv_cat_other:"Autre",
  // Reponse STAR (4 sections)
  iv_star_title:"Reponse modele",
  iv_star_situation:"Situation",
  iv_star_task:"Tache",
  iv_star_action:"Action",
  iv_star_result:"Resultat",
  iv_star_tip:"Conseil",
  iv_back_overview:"Voir toutes les questions",
  iv_overview_title:"Vue d'ensemble",
  iv_done:"Tu es pret.",
  iv_done_sub:"Bonne chance pour ton entretien.",
  // === Versions multi-CV ===
  vs_eyebrow:"Multi-CV",
  vs_title_a:"Plusieurs", vs_title_em:"versions", vs_title_b:", un seul outil.",
  vs_sub:"Sauvegarde des versions selon les marches, secteurs ou postes vises.",
  vs_save:"Sauvegarder cette version",
  vs_empty_title:"Aucune version sauvegardee.",
  vs_empty_sub:"Sauvegarde le CV actuel pour pouvoir le restaurer plus tard.",
  vs_count:"versions",
  vs_load:"Charger",
  vs_delete:"Supprimer",
  vs_load_confirm:"Charger cette version va remplacer le CV actuel. Continuer ?",
  vs_delete_confirm:"Supprimer cette version ? Action irreversible.",
  // === Truth Check (modal) ===
  tc_eyebrow:"Audit",
  tc_title:"Truth Check",
  tc_sub:"Phrases faibles, vagues ou risquees detectees",
  tc_loading:"Analyse honnete de ton CV...",
  tc_loading_sub:"15 a 25 secondes",
  tc_verdict:"Verdict global",
  tc_no_issues:"Aucun probleme majeur detecte",
  tc_why:"Pourquoi",
  tc_fix:"Reformulation proposee",
  tc_send:"Envoyer cette correction dans Ajuster",
  tc_type_bullshit:"Bullshit",
  tc_type_vague:"Vague",
  tc_type_weak:"Faible",
  tc_type_risky:"Risque",
  tc_type_incoherent:"Incoherent",
  // === Positioning Modal ===
  pm_eyebrow:"Strategie",
  pm_title:"Positionnement de carriere",
  pm_sub:"3 angles strategiques pour ton parcours",
  pm_loading:"Analyse strategique de ton parcours...",
  pm_loading_sub:"15 a 25 secondes",
  pm_angle:"Angle",
  pm_highlight:"A mettre en avant",
  pm_target:"Cible",
  pm_adopt:"Adopter cet angle (titre + accroche)",
  // === Audit Modal ===
  am_eyebrow:"Audit IA",
  am_title:"Audit IA Recruteur",
  am_sub:"Analyse de ton CV par un recruteur senior virtuel",
  am_intro_title:"L'audit recruteur va analyser ton CV en profondeur",
  am_intro_sub:"Score global, longueur, forces et faiblesses, mots-cles manquants, et verdict honnete d'un recruteur.",
  am_country_label:"Pays cible (marche du travail)",
  am_country_help:"Chaque pays a ses codes (longueur, format, mots-cles attendus). L'IA adapte l'audit en consequence.",
  am_run:"Lancer l'audit recruteur",
  am_loading_sub:"L'analyse prend 15 a 30 secondes",
  am_score_global:"Score global",
  am_score_unit:"sur 100",
  am_verdict:"Verdict recruteur",
  am_first_impression:"Premiere impression (5 secondes)",
  am_length:"Longueur",
  am_strengths:"Forces",
  am_weaknesses:"Faiblesses",
  am_suggestions:"Suggestions actionnables",
  am_suggestions_hint:"Clique sur une suggestion pour l'envoyer dans Ajuster",
  am_kw_missing:"Mots-cles a ajouter (ATS)",
  am_kw_integrate:"Integrer ces mots-cles dans le CV",
  am_kw_integrating:"Integration en cours...",
  am_kw_hint:"L'IA placera intelligemment les mots-cles dans tes bullets et ton accroche, sans bourrage.",
  am_relaunch:"Relancer l'audit",
  // Pays
  am_country_fr:"France",
  am_country_uk:"Royaume-Uni",
  am_country_us:"Etats-Unis",
  am_country_de:"Allemagne",
  am_country_ch:"Suisse",
  am_country_be:"Belgique",
  am_country_lu:"Luxembourg",
  am_country_es:"Espagne",
  am_country_it:"Italie",
  am_country_ae:"Emirats Arabes Unis",
  am_country_ca:"Canada",
  am_country_auto:"Auto-detection",
  // === Application Pack Modal ===
  pk_eyebrow:"Candidature",
  pk_title:"Candidature complete",
  pk_sub:"CV + Lettre + LinkedIn + Email + Pitch + STAR",
  pk_loading_sub:"La generation prend 25 a 40 secondes",
  pk_loading_msgs:[
    "Redaction de la lettre de motivation...",
    "Composition du message LinkedIn...",
    "Preparation de l'email de candidature...",
    "Construction du pitch d'entretien...",
    "Generation des reponses STAR...",
    "Finalisation de la candidature...",
  ],
  pk_tab_cover:"Lettre",
  pk_tab_linkedin:"LinkedIn",
  pk_tab_email:"Email",
  pk_tab_pitch:"Pitch",
  pk_tab_star:"Reponses STAR",
  pk_section_cover:"Lettre de motivation",
  pk_section_linkedin:"Message LinkedIn au recruteur",
  pk_section_email_subject:"Objet de l'email",
  pk_section_email_body:"Corps de l'email",
  pk_section_pitch:"Pitch d'introduction",
  pk_pitch_hint:"Reponse a 'Tell me about yourself' - 60 secondes max",
  pk_star_hint:"Reponses preparees aux questions probables (methode STAR)",
  pk_star_situation:"Situation",
  pk_star_task:"Tache",
  pk_star_action:"Action",
  pk_star_result:"Resultat",
  pk_copy:"Copier",
  pk_copy_answer:"Copier cette reponse",
  // === Coach IA conversationnel ===
  co_fab_aria:"Ouvrir le coach IA",
  co_eyebrow:"Coach IA",
  co_title_a:"Ton", co_title_em:"coach", co_title_b:"carriere.",
  co_sub:"Discute avec l'IA pour faire briller ton CV.",
  co_no_cv:"Charge d'abord un CV pour discuter avec ton coach.",
  co_welcome_title:"Par quoi on commence ?",
  co_welcome_sub:"Choisis un parcours guide ou pose une question libre.",
  co_path_describe:"Decrire une experience",
  co_path_describe_desc:"Mettre en valeur une experience qui manque de relief",
  co_path_shine:"Faire briller mon CV",
  co_path_shine_desc:"Identifier les zones plates et les transformer",
  co_path_gap:"Gerer un trou de carriere",
  co_path_gap_desc:"Transformer une periode floue en force",
  co_path_transition:"Presenter une transition",
  co_path_transition_desc:"Justifier un changement de secteur ou de role",
  co_path_pitch:"Construire mon pitch personnel",
  co_path_pitch_desc:"Definir comment me presenter en 60 secondes",
  co_path_free:"Question libre",
  co_path_free_desc:"Pose ta propre question au coach",
  co_input_ph:"Tape ta reponse...",
  co_send:"Envoyer",
  co_thinking:"Le coach reflechit...",
  co_clear:"Effacer la conversation",
  co_clear_confirm:"Effacer toute la conversation ? Action irreversible.",
  co_adopt_summary:"Adopter comme accroche",
  co_adopt_title:"Adopter comme titre",
  co_adopt_bullet:"Ajouter ce bullet",
  co_adopted:"Adopte dans le CV",
  co_back_paths:"Choisir un autre parcours",
  // === Export LinkedIn ===
  li_btn:"Exporter pour LinkedIn",
  li_btn_desc:"Headline + About + experiences au format LinkedIn",
  li_eyebrow:"LinkedIn",
  li_title_a:"Optimise ton", li_title_em:"profil", li_title_b:"LinkedIn.",
  li_sub:"L'IA reformate ton CV pour le format LinkedIn (informel, premiere personne, mots-cles ATS).",
  li_no_cv:"Charge d'abord un CV",
  li_run:"Generer mon profil LinkedIn",
  li_loading:"Reformatage pour LinkedIn...",
  li_loading_sub:"15 a 25 secondes",
  li_section_headline:"Headline (titre du profil)",
  li_section_about:"A propos (About)",
  li_section_experiences:"Experiences",
  li_headline_hint:"Maximum 220 caracteres. Apparait sous ton nom.",
  li_about_hint:"Format informel premiere personne. Premiere phrase = hook.",
  li_exp_role:"Intitule",
  li_exp_company:"Entreprise",
  li_exp_desc:"Description",
  li_copy_all:"Tout copier",
  li_copy_section:"Copier",
  li_copied:"Copie dans le presse-papiers",
  // === CV Compare ===
  cmp_btn:"Comparer 2 versions",
  cmp_btn_desc:"Vois l'evolution entre 2 versions de ton CV",
  cmp_eyebrow:"Comparaison",
  cmp_title_a:"Compare", cmp_title_em:"deux", cmp_title_b:"versions.",
  cmp_sub:"Selectionne 2 versions sauvegardees pour voir l'evolution et le verdict de l'IA.",
  cmp_no_versions:"Tu as besoin d'au moins 2 versions sauvegardees pour comparer.",
  cmp_pick_a:"Version A",
  cmp_pick_b:"Version B",
  cmp_pick_ph:"Selectionne une version",
  cmp_run:"Comparer",
  cmp_loading:"Analyse comparative...",
  cmp_loading_sub:"15 a 25 secondes",
  cmp_section_summary:"Resume des differences",
  cmp_section_diffs:"Changements detectes",
  cmp_section_verdict:"Verdict IA",
  cmp_section_better:"Quelle version est meilleure ?",
  cmp_field_changed:"Modifie",
  cmp_field_added:"Ajoute",
  cmp_field_removed:"Supprime",
  cmp_winner_a:"Version A est meilleure",
  cmp_winner_b:"Version B est meilleure",
  cmp_winner_tie:"Equivalentes",
  // === Applications Tracker (suivi candidatures) ===
  ap_btn:"Suivi candidatures",
  ap_btn_desc:"Trace tes candidatures, statuts et relances",
  ap_eyebrow:"Suivi",
  ap_title_a:"Tes", ap_title_em:"candidatures", ap_title_b:".",
  ap_sub:"Garde une trace de toutes les candidatures, statuts et relances. Stocke localement.",
  ap_add:"Ajouter une candidature",
  ap_edit:"Modifier",
  ap_delete:"Supprimer",
  ap_delete_confirm:"Supprimer cette candidature ?",
  ap_save:"Enregistrer",
  ap_cancel:"Annuler",
  ap_field_company:"Entreprise",
  ap_field_role:"Poste",
  ap_field_date:"Date de candidature",
  ap_field_status:"Statut",
  ap_field_notes:"Notes",
  ap_field_link:"Lien (offre, profil)",
  ap_status_applied:"Envoyee",
  ap_status_phone:"Entretien tel",
  ap_status_interview:"Entretien",
  ap_status_offer:"Offre recue",
  ap_status_rejected:"Refusee",
  ap_status_ghosted:"Ghosted",
  ap_status_accepted:"Acceptee",
  ap_filter_all:"Toutes",
  ap_empty_title:"Aucune candidature pour l'instant.",
  ap_empty_sub:"Ajoute ta premiere candidature pour commencer le suivi.",
  ap_stats_total:"Total",
  ap_stats_active:"En cours",
  ap_stats_offers:"Offres",
  ap_stats_rejected:"Refus",
  // === Multi-CV strategie (recommandation IA) ===
  mc_btn:"Quel CV envoyer ?",
  mc_btn_desc:"L'IA recommande la meilleure version pour cette offre",
  mc_eyebrow:"Strategie multi-CV",
  mc_title_a:"Quel", mc_title_em:"CV", mc_title_b:"pour cette offre ?",
  mc_sub:"L'IA analyse l'offre et compare toutes tes versions sauvegardees pour recommander la plus pertinente.",
  mc_no_versions:"Tu n'as pas encore de versions sauvegardees. Sauvegarde au moins 2 versions pour utiliser cet outil.",
  mc_offer_label:"Offre d'emploi",
  mc_offer_ph:"Colle ici l'offre que tu veux cibler...",
  mc_offer_already:"Offre detectee depuis Cibler. On l'utilise.",
  mc_run:"Recommander la meilleure version",
  mc_loading:"Analyse comparative en cours...",
  mc_loading_sub:"15 a 25 secondes",
  mc_recommendation:"Recommandation",
  mc_recommended:"Version recommandee",
  mc_match:"Score de match",
  mc_why:"Pourquoi cette version",
  mc_alternatives:"Autres versions evaluees",
  mc_load_recommended:"Charger cette version",
  // === Customize CV (couleurs + polices + suggestions) ===
  cust_btn:"Personnaliser le CV",
  cust_eyebrow:"Apparence",
  cust_title_a:"Ton CV,", cust_title_em:"signature.", cust_title_b:"",
  cust_sub:"Couleurs, polices, ou laisse l'IA decider.",
  cust_scope_global:"Style par defaut",
  cust_scope_version:"Cette version uniquement",
  cust_scope_global_hint:"Applique a tous tes CV.",
  cust_scope_version_hint:"Override pour la version active. Le defaut reste intact.",
  cust_tab_colors:"Couleurs",
  cust_tab_fonts:"Polices",
  cust_tab_suggest:"Suggestions IA",
  cust_color_accent:"Couleur d'accent",
  cust_color_sidebar:"Couleur du bandeau lateral",
  cust_color_paper:"Couleur du fond du CV",
  cust_color_picker:"Choisir une autre couleur",
  cust_font_header:"Police des titres",
  cust_font_body:"Police du corps",
  cust_font_sample_header:"Aa",
  cust_font_sample_body:"Profil et experience",
  cust_font_url_label:"Ou colle une URL Google Fonts",
  cust_font_url_ph:"https://fonts.googleapis.com/css2?family=...",
  cust_font_url_apply:"Charger cette police",
  cust_font_url_apply_target:"Appliquer aux titres ou au corps ?",
  cust_font_url_to_header:"Aux titres",
  cust_font_url_to_body:"Au corps",
  cust_font_url_invalid:"URL Google Fonts invalide",
  cust_font_url_loading:"Chargement de la police...",
  cust_font_url_failed:"Echec du chargement de la police",
  cust_reset:"Reinitialiser au theme",
  cust_resetted:"Personnalisation reinitialisee",
  cust_wcag_aa:"AA",
  cust_wcag_aaa:"AAA",
  cust_wcag_fail:"Contraste insuffisant",
  cust_suggest_btn:"Suggerer pour mon profil",
  cust_suggest_loading:"L'IA analyse ton profil...",
  cust_suggest_no_cv:"Charge d'abord un CV",
  cust_suggest_why:"Pourquoi cette combinaison",
  cust_suggest_adopt:"Adopter ce style",
  cust_adopted:"Style applique",
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
  bt_eyebrow:"Bullet",
  // Bullet Transformer for the summary: 3 shared + 2 adapted registers.
  bts_eyebrow:"Summary",
  bts_title:"5 angles, your pick.",
  bts_sub:"5 rewrites of your summary, different registers.",
  bts_btn:"Transform summary",
  bts_empty:"Write a summary first to transform it",
  bts_sobre:"Plain", bts_sobre_hint:"Factual, no superlatives",
  bts_story:"Storytelling", bts_story_hint:"Narrative through-line",
  bts_adopted:"Summary adopted",
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
  // === CV Score Dashboard 8 axes ===
  sd_tab_dashboard:"Diagnostic 8",
  sd_tab_quick:"Quick score",
  sd_eyebrow:"AI diagnostic",
  sd_title_a:"8 axes,", sd_title_em:"one verdict.", sd_title_b:"",
  sd_sub:"AI analyzes 8 dimensions of your CV and tells you where to focus.",
  sd_run:"Analyze my CV",
  sd_running:"AI is dissecting your CV...",
  sd_running_sub:"8 axes to evaluate, 30 seconds.",
  sd_global:"Global score",
  sd_priority:"Top priority",
  sd_no_cv:"Load a CV first",
  sd_reco:"Recommendation",
  sd_cta_fix:"Open tool",
  sd_back_top:"Back to top",
  // 8 axes (name + short sub)
  sd_ax_title:"Title clarity",
  sd_ax_title_sub:"The role visible in 1 second",
  sd_ax_bullets:"Bullet impact",
  sd_ax_bullets_sub:"Numbers and concrete results",
  sd_ax_ats:"ATS-friendly",
  sd_ax_ats_sub:"Keywords and clean format",
  sd_ax_relevance:"Career relevance",
  sd_ax_relevance_sub:"Coherence with target role",
  sd_ax_credibility:"Credibility",
  sd_ax_credibility_sub:"Solid sentences, no fluff",
  sd_ax_design:"Style and design",
  sd_ax_design_sub:"Visual readability, hierarchy",
  sd_ax_readability:"Readability",
  sd_ax_readability_sub:"Length, density, balance",
  sd_ax_differentiation:"Differentiation",
  sd_ax_differentiation_sub:"What makes you unique",
  // CTA labels per axis
  sd_cta_title:"Edit title",
  sd_cta_bullets:"Transform bullets",
  sd_cta_ats:"Enable ATS-Safe",
  sd_cta_relevance:"View positioning",
  sd_cta_credibility:"Run Truth Check",
  sd_cta_design:"Customize",
  sd_cta_readability:"Edit experiences",
  sd_cta_differentiation:"View positioning",
  // === Gap Repair (Polish timeline) ===
  gr_btn:"Polish timeline",
  gr_eyebrow:"Chronology",
  gr_title_a:"Make", gr_title_em:"gaps", gr_title_b:"disappear.",
  gr_sub:"AI detects gaps and suggests how to mask them without lying.",
  gr_run:"Analyze my timeline",
  gr_running:"Analyzing chronology...",
  gr_running_sub:"Detecting gaps and finding the best strategies.",
  gr_no_cv:"Load a CV first",
  gr_no_gaps_title:"No gap detected.",
  gr_no_gaps_sub:"Your timeline is smooth.",
  gr_unparsable:"Standardize your experience dates first.",
  gr_unparsable_sub:"Expected format: MM/YYYY or YYYY. AI can only analyze structured dates.",
  gr_gap_title:"Gap of",
  gr_gap_months:"months",
  gr_gap_year:"year",
  gr_gap_years:"years",
  gr_gap_between:"between",
  gr_gap_and:"and",
  gr_gap_present:"today",
  // 4 strategies
  gr_strat_year:"Years only format",
  gr_strat_year_sub:"Reformat all dates as YYYY instead of MM/YYYY. A gap of a few months vanishes.",
  gr_strat_year_btn:"Apply years format",
  gr_strat_year_warn:"This will change all dates across all your experiences.",
  gr_strat_year_done:"Dates reformatted to years",
  gr_strat_year_partial:"Years only format shrinks some gaps but not all.",
  gr_strat_year_full:"Years only format makes all your gaps vanish.",
  gr_strat_year_useless:"Years only format does not help: your gaps are too long.",
  gr_strat_extend:"Legitimate stretch",
  gr_strat_extend_sub:"Extend the end of the previous experience to include the transition (notice, onboarding).",
  gr_strat_extend_btn:"Extend this experience",
  gr_strat_extend_warn:"Only if you can defend this period (notice period, transition, onboarding).",
  gr_strat_extend_done:"Date extended",
  gr_strat_group:"Group experiences",
  gr_strat_group_sub:"Merge several short missions into a single continuous line.",
  gr_strat_group_btn:"Merge these experiences",
  gr_strat_group_warn:"Bullets will be combined, dates become continuous coverage.",
  gr_strat_group_done:"Experiences merged",
  gr_strat_functional:"Functional format",
  gr_strat_functional_sub:"CV by skills rather than chronological. Dates become secondary.",
  gr_strat_functional_btn:"See how",
  gr_strat_functional_help:"Reorganize your CV by theme (Expertise, Achievements, Education) rather than by dates. Switch to the matching layout in Appearance.",
  gr_no_strategies:"No automatic strategy for this gap.",
  gr_no_strategies_sub:"You can fill it manually by adding an experience (training, projects, consulting).",
  gr_section_strategies:"Available strategies",
  gr_section_results:"Detected gaps",
  // === Interview Continuity (Prepare for interview) ===
  iv_btn:"Prepare for interview",
  iv_btn_desc:"AI simulates the typical recruiter for your market",
  iv_eyebrow:"After the CV",
  iv_title_a:"The interview", iv_title_em:"is prepared", iv_title_b:".",
  iv_sub:"AI plays the recruiter from your market and lists likely questions, with STAR answers ready.",
  iv_run:"Generate my questions",
  iv_run_again:"Regenerate other questions",
  iv_running:"AI is simulating a senior recruiter...",
  iv_running_sub:"Country, sector, level: full analysis.",
  iv_no_cv:"Load a CV first",
  iv_offer_label:"Job offer (optional)",
  iv_offer_ph:"Paste the job for ultra-targeted questions, or leave empty for generic mode.",
  iv_offer_already:"Job detected from Target. We use it.",
  iv_meta_country:"Country",
  iv_meta_role:"Level",
  iv_meta_count:"questions",
  iv_progress:"Question",
  iv_of:"of",
  iv_prev:"Previous",
  iv_next:"Next",
  // 3 categories of questions
  iv_cat_tech:"Technical",
  iv_cat_behav:"Behavioral",
  iv_cat_case:"Case study",
  iv_cat_culture:"Culture",
  iv_cat_motiv:"Motivation",
  iv_cat_other:"Other",
  // STAR answer
  iv_star_title:"Model answer",
  iv_star_situation:"Situation",
  iv_star_task:"Task",
  iv_star_action:"Action",
  iv_star_result:"Result",
  iv_star_tip:"Tip",
  iv_back_overview:"See all questions",
  iv_overview_title:"Overview",
  iv_done:"You are ready.",
  iv_done_sub:"Good luck with your interview.",
  // === Multi-CV versions ===
  vs_eyebrow:"Multi-CV",
  vs_title_a:"Several", vs_title_em:"versions", vs_title_b:", one tool.",
  vs_sub:"Save versions for different markets, sectors or target roles.",
  vs_save:"Save this version",
  vs_empty_title:"No saved version.",
  vs_empty_sub:"Save the current CV to restore it later.",
  vs_count:"versions",
  vs_load:"Load",
  vs_delete:"Delete",
  vs_load_confirm:"Loading this version will replace the current CV. Continue?",
  vs_delete_confirm:"Delete this version? This is irreversible.",
  // === Truth Check (modal) ===
  tc_eyebrow:"Audit",
  tc_title:"Truth Check",
  tc_sub:"Weak, vague or risky sentences detected",
  tc_loading:"Honest analysis of your CV...",
  tc_loading_sub:"15 to 25 seconds",
  tc_verdict:"Overall verdict",
  tc_no_issues:"No major issues detected",
  tc_why:"Why",
  tc_fix:"Proposed rewrite",
  tc_send:"Send this fix to Adjust",
  tc_type_bullshit:"Bullshit",
  tc_type_vague:"Vague",
  tc_type_weak:"Weak",
  tc_type_risky:"Risky",
  tc_type_incoherent:"Incoherent",
  // === Positioning Modal ===
  pm_eyebrow:"Strategy",
  pm_title:"Career positioning",
  pm_sub:"3 strategic angles for your background",
  pm_loading:"Strategic analysis of your background...",
  pm_loading_sub:"15 to 25 seconds",
  pm_angle:"Angle",
  pm_highlight:"To highlight",
  pm_target:"Target",
  pm_adopt:"Adopt this angle (title + summary)",
  // === Audit Modal ===
  am_eyebrow:"AI Audit",
  am_title:"AI Recruiter Audit",
  am_sub:"Your CV analyzed by a virtual senior recruiter",
  am_intro_title:"The recruiter audit will analyze your CV in depth",
  am_intro_sub:"Global score, length, strengths and weaknesses, missing keywords, and an honest recruiter verdict.",
  am_country_label:"Target country (job market)",
  am_country_help:"Each country has its codes (length, format, expected keywords). The AI adapts the audit accordingly.",
  am_run:"Run recruiter audit",
  am_loading_sub:"Analysis takes 15 to 30 seconds",
  am_score_global:"Global score",
  am_score_unit:"out of 100",
  am_verdict:"Recruiter verdict",
  am_first_impression:"First impression (5 seconds)",
  am_length:"Length",
  am_strengths:"Strengths",
  am_weaknesses:"Weaknesses",
  am_suggestions:"Actionable suggestions",
  am_suggestions_hint:"Click on a suggestion to send it to Adjust",
  am_kw_missing:"Keywords to add (ATS)",
  am_kw_integrate:"Integrate these keywords into the CV",
  am_kw_integrating:"Integrating...",
  am_kw_hint:"The AI will smartly place keywords in your bullets and summary without stuffing.",
  am_relaunch:"Re-run the audit",
  // Countries
  am_country_fr:"France",
  am_country_uk:"United Kingdom",
  am_country_us:"United States",
  am_country_de:"Germany",
  am_country_ch:"Switzerland",
  am_country_be:"Belgium",
  am_country_lu:"Luxembourg",
  am_country_es:"Spain",
  am_country_it:"Italy",
  am_country_ae:"United Arab Emirates",
  am_country_ca:"Canada",
  am_country_auto:"Auto-detection",
  // === Application Pack Modal ===
  pk_eyebrow:"Application",
  pk_title:"Complete application",
  pk_sub:"CV + Cover letter + LinkedIn + Email + Pitch + STAR",
  pk_loading_sub:"Generation takes 25 to 40 seconds",
  pk_loading_msgs:[
    "Drafting cover letter...",
    "Composing LinkedIn message...",
    "Preparing application email...",
    "Building interview pitch...",
    "Generating STAR answers...",
    "Finalizing application...",
  ],
  pk_tab_cover:"Cover letter",
  pk_tab_linkedin:"LinkedIn",
  pk_tab_email:"Email",
  pk_tab_pitch:"Pitch",
  pk_tab_star:"STAR answers",
  pk_section_cover:"Cover letter",
  pk_section_linkedin:"LinkedIn message to recruiter",
  pk_section_email_subject:"Email subject",
  pk_section_email_body:"Email body",
  pk_section_pitch:"Introduction pitch",
  pk_pitch_hint:"Answer to 'Tell me about yourself' - 60 seconds max",
  pk_star_hint:"Prepared answers to likely questions (STAR method)",
  pk_star_situation:"Situation",
  pk_star_task:"Task",
  pk_star_action:"Action",
  pk_star_result:"Result",
  pk_copy:"Copy",
  pk_copy_answer:"Copy this answer",
  // === AI Coach conversational ===
  co_fab_aria:"Open AI coach",
  co_eyebrow:"AI Coach",
  co_title_a:"Your", co_title_em:"career", co_title_b:"coach.",
  co_sub:"Chat with the AI to make your CV shine.",
  co_no_cv:"Load a CV first to chat with your coach.",
  co_welcome_title:"Where shall we start?",
  co_welcome_sub:"Pick a guided path or ask a free question.",
  co_path_describe:"Describe an experience",
  co_path_describe_desc:"Make a flat experience stand out",
  co_path_shine:"Make my CV shine",
  co_path_shine_desc:"Identify weak areas and transform them",
  co_path_gap:"Handle a career gap",
  co_path_gap_desc:"Turn a fuzzy period into a strength",
  co_path_transition:"Frame a career transition",
  co_path_transition_desc:"Justify a sector or role switch",
  co_path_pitch:"Build my personal pitch",
  co_path_pitch_desc:"Define how to present myself in 60 seconds",
  co_path_free:"Free question",
  co_path_free_desc:"Ask your own question to the coach",
  co_input_ph:"Type your answer...",
  co_send:"Send",
  co_thinking:"The coach is thinking...",
  co_clear:"Clear conversation",
  co_clear_confirm:"Clear the entire conversation? This is irreversible.",
  co_adopt_summary:"Adopt as summary",
  co_adopt_title:"Adopt as title",
  co_adopt_bullet:"Add this bullet",
  co_adopted:"Adopted in CV",
  co_back_paths:"Pick another path",
  // === LinkedIn Export ===
  li_btn:"Export for LinkedIn",
  li_btn_desc:"Headline + About + experiences in LinkedIn format",
  li_eyebrow:"LinkedIn",
  li_title_a:"Optimize your", li_title_em:"LinkedIn", li_title_b:"profile.",
  li_sub:"The AI reformats your CV for LinkedIn (informal, first person, ATS keywords).",
  li_no_cv:"Load a CV first",
  li_run:"Generate my LinkedIn profile",
  li_loading:"Reformatting for LinkedIn...",
  li_loading_sub:"15 to 25 seconds",
  li_section_headline:"Headline (profile title)",
  li_section_about:"About",
  li_section_experiences:"Experiences",
  li_headline_hint:"Maximum 220 characters. Appears under your name.",
  li_about_hint:"Informal first person. First sentence = hook.",
  li_exp_role:"Role",
  li_exp_company:"Company",
  li_exp_desc:"Description",
  li_copy_all:"Copy all",
  li_copy_section:"Copy",
  li_copied:"Copied to clipboard",
  // === CV Compare ===
  cmp_btn:"Compare 2 versions",
  cmp_btn_desc:"See evolution between 2 versions of your CV",
  cmp_eyebrow:"Compare",
  cmp_title_a:"Compare", cmp_title_em:"two", cmp_title_b:"versions.",
  cmp_sub:"Pick 2 saved versions to see the evolution and AI verdict.",
  cmp_no_versions:"You need at least 2 saved versions to compare.",
  cmp_pick_a:"Version A",
  cmp_pick_b:"Version B",
  cmp_pick_ph:"Pick a version",
  cmp_run:"Compare",
  cmp_loading:"Comparing...",
  cmp_loading_sub:"15 to 25 seconds",
  cmp_section_summary:"Summary of differences",
  cmp_section_diffs:"Detected changes",
  cmp_section_verdict:"AI verdict",
  cmp_section_better:"Which version is better?",
  cmp_field_changed:"Changed",
  cmp_field_added:"Added",
  cmp_field_removed:"Removed",
  cmp_winner_a:"Version A is better",
  cmp_winner_b:"Version B is better",
  cmp_winner_tie:"Equivalent",
  // === Applications Tracker ===
  ap_btn:"Applications tracker",
  ap_btn_desc:"Track your applications, statuses, and follow-ups",
  ap_eyebrow:"Tracker",
  ap_title_a:"Your", ap_title_em:"applications", ap_title_b:".",
  ap_sub:"Keep track of all your applications, statuses, and follow-ups. Stored locally.",
  ap_add:"Add an application",
  ap_edit:"Edit",
  ap_delete:"Delete",
  ap_delete_confirm:"Delete this application?",
  ap_save:"Save",
  ap_cancel:"Cancel",
  ap_field_company:"Company",
  ap_field_role:"Role",
  ap_field_date:"Application date",
  ap_field_status:"Status",
  ap_field_notes:"Notes",
  ap_field_link:"Link (offer, profile)",
  ap_status_applied:"Applied",
  ap_status_phone:"Phone screen",
  ap_status_interview:"Interview",
  ap_status_offer:"Offer received",
  ap_status_rejected:"Rejected",
  ap_status_ghosted:"Ghosted",
  ap_status_accepted:"Accepted",
  ap_filter_all:"All",
  ap_empty_title:"No applications yet.",
  ap_empty_sub:"Add your first application to start tracking.",
  ap_stats_total:"Total",
  ap_stats_active:"Active",
  ap_stats_offers:"Offers",
  ap_stats_rejected:"Rejected",
  // === Multi-CV strategy (AI recommendation) ===
  mc_btn:"Which CV to send?",
  mc_btn_desc:"AI recommends the best version for this offer",
  mc_eyebrow:"Multi-CV strategy",
  mc_title_a:"Which", mc_title_em:"CV", mc_title_b:"for this offer?",
  mc_sub:"AI analyzes the offer and compares all your saved versions to recommend the best one.",
  mc_no_versions:"You don't have saved versions yet. Save at least 2 versions to use this tool.",
  mc_offer_label:"Job offer",
  mc_offer_ph:"Paste the offer you want to target here...",
  mc_offer_already:"Offer detected from Target. We use it.",
  mc_run:"Recommend the best version",
  mc_loading:"Comparing versions...",
  mc_loading_sub:"15 to 25 seconds",
  mc_recommendation:"Recommendation",
  mc_recommended:"Recommended version",
  mc_match:"Match score",
  mc_why:"Why this version",
  mc_alternatives:"Other versions evaluated",
  mc_load_recommended:"Load this version",
  // === Customize CV (colors + fonts + suggestions) ===
  cust_btn:"Customize CV",
  cust_eyebrow:"Appearance",
  cust_title_a:"Your CV,", cust_title_em:"signature.", cust_title_b:"",
  cust_sub:"Colors, fonts, or let AI decide.",
  cust_scope_global:"Default style",
  cust_scope_version:"This version only",
  cust_scope_global_hint:"Applies to every CV.",
  cust_scope_version_hint:"Override for the active version. Default stays untouched.",
  cust_tab_colors:"Colors",
  cust_tab_fonts:"Fonts",
  cust_tab_suggest:"AI suggestions",
  cust_color_accent:"Accent color",
  cust_color_sidebar:"Sidebar color",
  cust_color_paper:"CV background color",
  cust_color_picker:"Pick another color",
  cust_font_header:"Heading font",
  cust_font_body:"Body font",
  cust_font_sample_header:"Aa",
  cust_font_sample_body:"Profile and experience",
  cust_font_url_label:"Or paste a Google Fonts URL",
  cust_font_url_ph:"https://fonts.googleapis.com/css2?family=...",
  cust_font_url_apply:"Load this font",
  cust_font_url_apply_target:"Apply to headings or body?",
  cust_font_url_to_header:"Headings",
  cust_font_url_to_body:"Body",
  cust_font_url_invalid:"Invalid Google Fonts URL",
  cust_font_url_loading:"Loading font...",
  cust_font_url_failed:"Font loading failed",
  cust_reset:"Reset to theme",
  cust_resetted:"Customization reset",
  cust_wcag_aa:"AA",
  cust_wcag_aaa:"AAA",
  cust_wcag_fail:"Contrast too low",
  cust_suggest_btn:"Suggest for my profile",
  cust_suggest_loading:"AI is analyzing your profile...",
  cust_suggest_no_cv:"Load a CV first",
  cust_suggest_why:"Why this combination",
  cust_suggest_adopt:"Adopt this style",
  cust_adopted:"Style applied",
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

// ============================================================
// v17 Custom : librairies cur\u00e9es (couleurs + polices) + merge theme
// ============================================================

// Presets curees pour la couleur d'accent (le dore par defaut).
const ACCENT_PRESETS = [
  { id:"gold",     name:"Or classique",   color:"#c9a96e" },
  { id:"bordeaux", name:"Bordeaux",       color:"#7a1f2b" },
  { id:"forest",   name:"Vert foret",     color:"#2d5a3d" },
  { id:"navy",     name:"Bleu marine",    color:"#1e3a5f" },
  { id:"plum",     name:"Aubergine",      color:"#4a1d3f" },
  { id:"charcoal", name:"Charbon",        color:"#3a3a3a" },
  { id:"rust",     name:"Rouille",        color:"#a64b2a" },
  { id:"teal",     name:"Bleu petrole",   color:"#1f4d4a" },
];

// Presets pour le bandeau lateral (sidebar du CV, fond noir par defaut).
const SIDEBAR_PRESETS = [
  { id:"ink",      name:"Noir profond",   color:"#0a0a0a" },
  { id:"midnight", name:"Bleu nuit",      color:"#0f1d3a" },
  { id:"charcoal", name:"Charbon",        color:"#26262b" },
  { id:"forest",   name:"Vert sapin",     color:"#1a3329" },
  { id:"darkwine", name:"Bordeaux fonce", color:"#3a0e15" },
  { id:"cream",    name:"Creme inverse",  color:"#f5f1e8" },
];

// Presets pour le fond du CV (paper).
const PAPER_PRESETS = [
  { id:"cream",    name:"Creme classique", color:"#f8f6f1" },
  { id:"white",    name:"Blanc pur",       color:"#ffffff" },
  { id:"cream2",   name:"Creme chaud",     color:"#faf3e7" },
  { id:"pearl",    name:"Gris perle",      color:"#f0eee9" },
  { id:"ivory",    name:"Ivoire",          color:"#fdfbf3" },
];

// Bibliotheque cur\u00e9e de polices titres (display / heading).
// Chaque entree : { name, family (CSS), googleHref (sans https:), vibe, target }
const HEADER_FONTS = [
  { id:"playfair",  name:"Playfair Display",  family:"'Playfair Display', serif",  googleHref:"https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap", vibe:"Premium classique", target:"Banque, conseil, juridique" },
  { id:"fraunces",  name:"Fraunces",          family:"'Fraunces', serif",          googleHref:"https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..700&display=swap", vibe:"Editorial moderne", target:"Strategie, branding" },
  { id:"cormorant", name:"Cormorant Garamond",family:"'Cormorant Garamond', serif",googleHref:"https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap", vibe:"Sobre intemporel", target:"Academique, art, recherche" },
  { id:"dmserif",   name:"DM Serif Display",  family:"'DM Serif Display', serif",  googleHref:"https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap", vibe:"Premium contemporain", target:"Marketing premium, luxe" },
  { id:"space",     name:"Space Grotesk",     family:"'Space Grotesk', sans-serif",googleHref:"https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap", vibe:"Tech minimal", target:"Tech, produit, design" },
  { id:"montserrat",name:"Montserrat",        family:"'Montserrat', sans-serif",   googleHref:"https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap", vibe:"Geometrique", target:"Marketing, communication" },
  { id:"inter",     name:"Inter",             family:"'Inter', sans-serif",        googleHref:"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap", vibe:"Sans-serif fort", target:"Corporate moderne, ATS" },
  { id:"lora",      name:"Lora",              family:"'Lora', serif",              googleHref:"https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap", vibe:"Humain serif", target:"RH, coaching, social" },
];

// Bibliotheque curee de polices corps (body) - toutes ATS-friendly.
const BODY_FONTS = [
  { id:"inter",     name:"Inter",          family:"'Inter', sans-serif",       googleHref:"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap", vibe:"Tech moderne",       ats:"Excellent" },
  { id:"lato",      name:"Lato",           family:"'Lato', sans-serif",        googleHref:"https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap", vibe:"Pro chaleureux",      ats:"Excellent" },
  { id:"sourcesans",name:"Source Sans 3",  family:"'Source Sans 3', sans-serif",googleHref:"https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&display=swap", vibe:"Corporate sobre",     ats:"Excellent" },
  { id:"dmsans",    name:"DM Sans",        family:"'DM Sans', sans-serif",     googleHref:"https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap", vibe:"Minimaliste",         ats:"Excellent" },
  { id:"plex",      name:"IBM Plex Sans",  family:"'IBM Plex Sans', sans-serif",googleHref:"https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap", vibe:"Tech premium",        ats:"Excellent" },
  { id:"opensans",  name:"Open Sans",      family:"'Open Sans', sans-serif",   googleHref:"https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap", vibe:"Universel",           ats:"Excellent" },
  { id:"nunito",    name:"Nunito Sans",    family:"'Nunito Sans', sans-serif", googleHref:"https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;500;600;700&display=swap", vibe:"Doux moderne",        ats:"Excellent" },
  { id:"work",      name:"Work Sans",      family:"'Work Sans', sans-serif",   googleHref:"https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap", vibe:"Geometrique leger",   ats:"Excellent" },
];

// Empile theme + custom global + custom version. Chaque palier override le precedent.
// Forme du custom : { ac, sb, bg, hf, bf, hfHref, bfHref } - tous optionnels.
function mergeTheme(theme, globalCustom, versionCustom) {
  const eff = { ...theme };
  const apply = (cu) => {
    if (!cu) return;
    if (cu.ac) eff.ac = cu.ac;
    if (cu.sb) eff.sb = cu.sb;
    if (cu.bg) eff.bg = cu.bg;
    if (cu.hf) eff.hf = cu.hf;
    if (cu.bf) eff.bf = cu.bf;
    // hfHref / bfHref ne sont pas appliques dans le theme effectif, ils servent
    // juste a savoir quoi charger via ensureFontLoaded.
  };
  apply(globalCustom);
  apply(versionCustom);
  return eff;
}

// Charge dynamiquement une Google Font en injectant un <link> dans <head>.
// Idempotent : ne re-injecte pas si l'URL est deja presente.
// `href` doit etre une URL fonts.googleapis.com complete.
function ensureFontLoaded(href) {
  if (typeof document === "undefined") return;
  if (!href || typeof href !== "string") return;
  if (!/^https:\/\/fonts\.googleapis\.com\//.test(href)) return;
  // Cherche un link existant pointant la meme href.
  const existing = document.querySelector('link[href="' + href + '"]');
  if (existing) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

// Charge toutes les fonts referencees par un custom global + version.
// Appele dans un useEffect sur changement du custom.
function ensureCustomFontsLoaded(globalCustom, versionCustom) {
  [globalCustom, versionCustom].forEach(cu => {
    if (!cu) return;
    if (cu.hfHref) ensureFontLoaded(cu.hfHref);
    if (cu.bfHref) ensureFontLoaded(cu.bfHref);
  });
}

// Retourne family si trouvee dans la lib, sinon { family, googleHref } extrait
// d'une URL Google Fonts brute. Utilise pour le champ libre.
// Exemple : "https://fonts.googleapis.com/css2?family=Cormorant+Infant:wght@400;700&display=swap"
//   -> { family: "'Cormorant Infant', serif", googleHref: same URL }
function parseGoogleFontUrl(url) {
  if (!url || typeof url !== "string") return null;
  const m = url.match(/family=([^:&]+)/);
  if (!m) return null;
  const familyRaw = decodeURIComponent(m[1]).replace(/\+/g, " ");
  if (!familyRaw) return null;
  // On ajoute serif fallback ; le genre exact (serif/sans) n'est pas garanti.
  return {
    family: "'" + familyRaw + "', serif",
    name: familyRaw,
    googleHref: url,
  };
}

// === Helpers WCAG (luminance + ratio de contraste) ===
function _hexToRgb(hex) {
  if (!hex || typeof hex !== "string") return null;
  let h = hex.replace("#","").trim();
  if (h.length === 3) h = h.split("").map(c => c+c).join("");
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0,2), 16);
  const g = parseInt(h.slice(2,4), 16);
  const b = parseInt(h.slice(4,6), 16);
  if ([r,g,b].some(v => Number.isNaN(v))) return null;
  return [r,g,b];
}
function _relLum(rgb) {
  const [r,g,b] = rgb.map(v => {
    const s = v/255;
    return s <= 0.03928 ? s/12.92 : Math.pow((s+0.055)/1.055, 2.4);
  });
  return 0.2126*r + 0.7152*g + 0.0722*b;
}
function contrastRatio(hex1, hex2) {
  const a = _hexToRgb(hex1), b = _hexToRgb(hex2);
  if (!a || !b) return 0;
  const la = _relLum(a), lb = _relLum(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}
// Retourne "AAA", "AA", ou "FAIL" pour du texte normal (>=18pt = large, sinon).
function wcagLevel(hex1, hex2) {
  const r = contrastRatio(hex1, hex2);
  if (r >= 7) return "AAA";
  if (r >= 4.5) return "AA";
  return "FAIL";
}

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

// ScorePanel v17 : 2 onglets.
//   - dashboard : Score Dashboard 8 axes (delegue a <ScoreDashboard>)
//   - quick     : Score rapide local (calcul client instantane sur la structure)
// Default = dashboard (la valeur premium).
function ScorePanel({ cv, apiKey, notify, layout, T,
  dashLoading, dashResult, onRunDashboard, onCtaAxis }) {
  const [mode, setMode] = useState("dashboard");
  const [quickRes, setQuickRes] = useState(null);

  const computeQuick = () => {
    const C=[]; const add=(cat,label,ok,tip,w=1)=>{C.push({cat,label,ok,tip,w});};
    const sl=(cv.summary||"").trim().length;
    add("Contact","Nom",!!(cv.name||"").trim(),"Nom requis");
    add("Contact","Titre",!!(cv.title||"").trim(),"Titre requis");
    add("Contact","Email",!!(cv.email||"").trim(),"Email requis");
    add("Contact","Tel",!!(cv.phone||"").trim(),"Tel requis");
    add("Contact","Location",!!(cv.location||"").trim(),"Ville requise");
    add("Contact","LinkedIn",!!(cv.linkedin||"").trim(),"LinkedIn recommande");
    add("Accroche","Presente",sl>0,"Accroche indispensable");
    add("Accroche","Longueur ok",sl>100&&sl<600,"Vise 3 a 4 phrases");
    add("Accroche","Chiffres",(cv.summary||"").split("").some(c=>c>="0"&&c<="9"),"Ajoute des chiffres");
    const exps=(cv.experience||[]).filter(e=>e.title||e.company);
    add("Experience","Presente",exps.length>=1,"Aucune experience");
    add("Experience","Periodes",exps.length>0&&exps.every(e=>(e.period||"").trim()),"Periodes requises");
    add("Experience","Bullets chiffres",exps.some(e=>(e.bullets||[]).some(b=>(b||"").split("").some(c=>c>="0"&&c<="9"))),"Ajoute des chiffres");
    add("Experience","Volume",exps.reduce((s,e)=>s+(e.bullets||[]).filter(b=>(b||"").trim()).length,0)>=6,"Min 6 bullets");
    const sk=(cv.skills||[]).filter(s=>(s||"").trim());
    add("Competences","Min 5",sk.length>=5,"Vise 6 a 10");
    add("Competences","Min 8",sk.length>=8,"ATS filtrent sur mots-cles");
    add("Langues","Presente",(cv.languages||[]).filter(l=>(l.lang||"").trim()).length>=1,"Section vide");
    add("Certifications","Presente",(cv.certifications||[]).filter(c=>(c||"").trim()).length>=1,"Valorise le profil");
    add("Format ATS","ATS-Safe",layout==="ats","Passe en ATS-Safe",2);
    const tot=C.filter(c=>c.ok).reduce((s,c)=>s+c.w,0);
    const maxPts=C.reduce((s,c)=>s+c.w,0);
    const score=Math.round((tot/maxPts)*100);
    const bycat={};
    C.forEach(c=>{
      if(!bycat[c.cat])bycat[c.cat]={ok:0,tot:0,checks:[]};
      bycat[c.cat].ok+=c.ok?c.w:0;bycat[c.cat].tot+=c.w;bycat[c.cat].checks.push(c);
    });
    setQuickRes({score,checks:C,bycat});
  };

  const sc = (s) => { if (s >= 80) return Green; if (s >= 65) return GoldDeep; if (s >= 50) return Coral; return "#dc2626"; };

  return (
    <div style={{fontFamily:Sans}}>
      {/* Tabs pills */}
      <div style={{display:"flex", gap:6, marginBottom:18}}>
        <button onClick={()=>setMode("dashboard")} style={{
          ...B({
            flex:1, padding:"10px 14px", borderRadius:RadiusPill,
            background: mode==="dashboard" ? Ink : Paper,
            color: mode==="dashboard" ? Cream : Ink,
            border:"0.5px solid "+(mode==="dashboard" ? Ink : Gray200),
            fontFamily:Sans, fontWeight:mode==="dashboard"?600:500, fontSize:12,
            transition:"all 180ms ease-out",
          })
        }}>{T.sd_tab_dashboard}</button>
        <button onClick={()=>setMode("quick")} style={{
          ...B({
            flex:1, padding:"10px 14px", borderRadius:RadiusPill,
            background: mode==="quick" ? Ink : Paper,
            color: mode==="quick" ? Cream : Ink,
            border:"0.5px solid "+(mode==="quick" ? Ink : Gray200),
            fontFamily:Sans, fontWeight:mode==="quick"?600:500, fontSize:12,
            transition:"all 180ms ease-out",
          })
        }}>{T.sd_tab_quick}</button>
      </div>

      {mode === "dashboard" && (
        <ScoreDashboard
          T={T}
          cv={cv}
          apiKey={apiKey}
          loading={dashLoading}
          result={dashResult}
          onRun={onRunDashboard}
          onCta={onCtaAxis}
        />
      )}

      {mode === "quick" && (
        <div>
          <button onClick={computeQuick} style={{
            ...B({
              width:"100%", padding:"15px 22px", borderRadius:RadiusPill,
              background: "linear-gradient(135deg,#0a0a0a 0%, #1a1a1f 50%, #c9a96e 100%)",
              color:Cream,
              fontFamily:Sans, fontWeight:600, fontSize:14,
              marginBottom: 18,
              transition:"all 200ms ease-out",
              display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
            })
          }}>
            {quickRes ? "Recalculer" : "Analyser mon CV maintenant"}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </button>

          {quickRes && (
            <>
              {/* Score global rapide */}
              <div style={{
                padding: "20px 22px",
                background: scoreBg(quickRes.score),
                borderRadius: RadiusMd, marginBottom: 18,
                border:"0.5px solid "+Gray200,
                boxShadow: ShadowSm,
                display:"flex", alignItems:"center", gap:18,
              }}>
                <div style={{
                  fontFamily: Serif, fontWeight: 300,
                  fontSize: 56, lineHeight: 1,
                  letterSpacing: "-0.04em",
                  color: sc(quickRes.score), flexShrink:0,
                }}>{quickRes.score}</div>
                <div>
                  <div style={{
                    fontSize: 11, fontWeight: 600,
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    color: Gray600, fontFamily: Sans, marginBottom: 4,
                  }}>SCORE</div>
                  <div style={{
                    fontFamily: Serif, fontSize: 14, fontWeight: 400,
                    color: Ink, letterSpacing: "-0.01em",
                  }}>{
                    quickRes.score >= 80 ? "Excellent CV"
                    : quickRes.score >= 65 ? "Bon CV, ameliorations possibles"
                    : quickRes.score >= 50 ? "CV correct, plusieurs faiblesses"
                    : "Plusieurs manques structurels"
                  }</div>
                </div>
              </div>

              {/* Detail par categorie */}
              <div style={{
                fontSize: 11, fontWeight: 600,
                letterSpacing: "0.1em", textTransform: "uppercase",
                color: GoldDeep, marginBottom: 10,
                fontFamily: Sans,
              }}>Detail</div>
              <div style={{
                background: Paper,
                borderRadius: RadiusMd,
                border: "0.5px solid "+Gray200,
                boxShadow: ShadowSm,
                padding: "8px 0",
              }}>
                {quickRes.checks.map((c, i) => (
                  <div key={i} style={{
                    padding: "6px 16px",
                    display: "flex", alignItems: "flex-start", gap: 10,
                    borderBottom: i < quickRes.checks.length - 1 ? "0.5px solid "+Gray100 : "none",
                  }}>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: c.ok ? Green : Coral,
                      lineHeight: 1.45,
                      width: 14, flexShrink: 0,
                    }}>{c.ok ? "v" : "x"}</span>
                    <div style={{flex:1, minWidth:0}}>
                      <span style={{
                        fontSize: 12, color: Ink,
                        fontWeight: c.ok ? 400 : 600,
                        fontFamily: Sans,
                        lineHeight: 1.45,
                      }}>{c.cat}: {c.label}</span>
                      {!c.ok && (
                        <div style={{
                          fontSize: 11, color: Gray600,
                          marginTop: 2, fontFamily: Sans,
                          lineHeight: 1.4,
                        }}>{c.tip}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// scoreBg pour le quick (helpers locaux)
function scoreBg(s) {
  if (s >= 80) return "#dcfce7";
  if (s >= 65) return "rgba(201,169,110,.15)";
  if (s >= 50) return "#fff1ed";
  return "#fff1ed";
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













// ============================================================
// TargetHub v17 : phase Cibler, hub strategique central
// - Hero card Ink/Gold "Une offre -> candidature complete" + CTA cream
// - Score card violet si offre deja analysee (gradient purple sur le chiffre)
// - Grille 2x2 des 4 super-pouvoirs : Audit / Positioning / Truth / Pack
// ============================================================
function TargetHub({ T, cvIsEmpty, offerResult, locale,
  onOpenOffer, onOpenAudit, onOpenPos, onOpenTruth, onOpenPack, onOpenInterview, onOpenMultiCV }) {

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

      {/* 5e super-pouvoir : Preparer l'entretien (pleine largeur, accent fort) */}
      {onOpenInterview && (
        <button onClick={onOpenInterview} style={{
          ...B({
            display:"flex", alignItems:"center", gap:14,
            width:"100%",
            background:Ink, color:Cream,
            borderRadius:RadiusMd,
            padding:"16px 18px",
            marginTop:12,
            border:"0.5px solid "+Ink,
            textAlign:"left", fontFamily:Sans,
            position:"relative", overflow:"hidden",
            transition:"all 200ms ease-out",
          })
        }}>
          <div style={{
            position:"absolute", inset:0,
            background:"radial-gradient(ellipse 80% 100% at 0% 100%, rgba(91,61,245,.35) 0%, transparent 60%)",
            pointerEvents:"none",
          }}/>
          <div style={{
            width:40, height:40, borderRadius:11,
            display:"flex", alignItems:"center", justifyContent:"center",
            background:"rgba(245,241,232,.15)", color:Cream,
            flexShrink:0, position:"relative",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div style={{flex:1, minWidth:0, position:"relative"}}>
            <div style={{
              fontFamily:Serif, fontWeight:500,
              fontSize:16, letterSpacing:"-0.01em",
              color:Cream, marginBottom:3,
            }}>{T.iv_btn || "Preparer l'entretien"}</div>
            <div style={{
              fontSize:11, color:Gold, lineHeight:1.4,
            }}>{T.iv_btn_desc || "L'IA simule le recruteur typique de ton marche"}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={Gold} strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{flexShrink:0, position:"relative"}}>
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        </button>
      )}

      {/* 6e super-pouvoir : Multi-CV strategie (pleine largeur, accent Gold) */}
      {onOpenMultiCV && (
        <button onClick={onOpenMultiCV} style={{
          ...B({
            display:"flex", alignItems:"center", gap:14,
            width:"100%",
            background:Paper, color:Ink,
            borderRadius:RadiusMd,
            padding:"16px 18px",
            marginTop:10,
            border:"0.5px solid "+Gold,
            textAlign:"left", fontFamily:Sans,
            position:"relative", overflow:"hidden",
            boxShadow:ShadowSm,
            transition:"all 200ms ease-out",
          })
        }}>
          <div style={{
            position:"absolute", inset:0,
            background:"radial-gradient(ellipse 80% 100% at 100% 100%, rgba(201,169,110,.18) 0%, transparent 60%)",
            pointerEvents:"none",
          }}/>
          <div style={{
            width:40, height:40, borderRadius:11,
            display:"flex", alignItems:"center", justifyContent:"center",
            background:CreamSoft, color:GoldDeep,
            flexShrink:0, position:"relative",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <rect width="14" height="18" x="5" y="3" rx="2"/>
              <line x1="9" y1="9" x2="15" y2="9"/>
              <line x1="9" y1="13" x2="15" y2="13"/>
              <line x1="9" y1="17" x2="13" y2="17"/>
            </svg>
          </div>
          <div style={{flex:1, minWidth:0, position:"relative"}}>
            <div style={{
              fontFamily:Serif, fontWeight:500,
              fontSize:16, letterSpacing:"-0.01em",
              color:Ink, marginBottom:3,
            }}>{T.mc_btn || "Quel CV envoyer ?"}</div>
            <div style={{
              fontSize:11, color:Gray600, lineHeight:1.4,
            }}>{T.mc_btn_desc || "L'IA recommande la meilleure version"}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={GoldDeep} strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{flexShrink:0, position:"relative"}}>
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        </button>
      )}
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


// ============================================================
// Composants atomiques pour la personnalisation (etape 2)
// ============================================================

// Petit swatch carre cliquable - presets de couleurs.
function ColorSwatch({ color, name, active, onClick, size=44 }) {
  return (
    <button onClick={onClick} title={name} aria-label={name} style={{
      ...B({
        width:size, height:size, borderRadius:12,
        background:color,
        border:active ? "2px solid "+Ink : "0.5px solid "+Gray200,
        boxShadow:active ? "0 0 0 2px "+Cream+", 0 0 0 3px "+Ink : ShadowSm,
        cursor:"pointer", padding:0, flexShrink:0,
        transition:"all 180ms ease-out",
      })
    }}/>
  );
}

// Badge WCAG : "AAA" (vert), "AA" (gold-deep), ou warning si "FAIL".
function WCAGBadge({ ratio, level, T }) {
  if (!ratio || ratio === 0) return null;
  const isFail = level === "FAIL";
  const color = isFail ? Coral : (level === "AAA" ? Green : GoldDeep);
  const bg    = isFail ? CoralSoft : (level === "AAA" ? GreenSoft : "rgba(201,169,110,.15)");
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:6,
      padding:"3px 9px", borderRadius:RadiusPill,
      background:bg, color:color,
      fontSize:11, fontWeight:600, fontFamily:Sans,
      letterSpacing:"0.04em",
    }}>
      <span>{isFail ? T.cust_wcag_fail : level}</span>
      <span style={{opacity:.65, fontWeight:500}}>
        {ratio.toFixed(1)}:1
      </span>
    </span>
  );
}

// Bloc reutilisable : eyebrow + grille de presets + color picker libre.
// onChange recoit la couleur hex finale.
// `contrastWith` (optionnel) permet d'afficher un badge WCAG par rapport
// a une couleur de reference (typiquement la couleur de texte qui sera dessus).
function ColorPickerBlock({
  T, label, value, onChange, presets,
  contrastWith, contrastLabel, columns=4,
}) {
  const ratio = contrastWith && value ? contrastRatio(value, contrastWith) : 0;
  const level = ratio ? wcagLevel(value, contrastWith) : null;
  return (
    <div style={{marginBottom:22}}>
      <div style={{
        display:"flex", justifyContent:"space-between", alignItems:"center",
        marginBottom:10,
      }}>
        <span style={{
          fontSize:11, fontWeight:600,
          letterSpacing:"0.1em", textTransform:"uppercase",
          color:GoldDeep, fontFamily:Sans,
        }}>{label}</span>
        {contrastWith && level && (
          <WCAGBadge ratio={ratio} level={level} T={T}/>
        )}
      </div>

      {/* Presets en grille */}
      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat("+columns+", 1fr)",
        gap:10,
        marginBottom:12,
      }}>
        {presets.map(p => (
          <div key={p.id} style={{
            display:"flex", flexDirection:"column",
            alignItems:"center", gap:6,
          }}>
            <ColorSwatch
              color={p.color}
              name={p.name}
              active={value && value.toLowerCase() === p.color.toLowerCase()}
              onClick={()=>onChange(p.color)}
            />
            <span style={{
              fontSize:10, color:Gray600,
              textAlign:"center", lineHeight:1.3,
              fontFamily:Sans, fontWeight:500,
            }}>{p.name}</span>
          </div>
        ))}
      </div>

      {/* Color picker libre HTML5 */}
      <label style={{
        display:"flex", alignItems:"center", gap:10,
        padding:"10px 14px", borderRadius:RadiusMd,
        background:Paper, border:"0.5px solid "+Gray200,
        cursor:"pointer", boxShadow:ShadowSm,
        fontFamily:Sans,
      }}>
        <input
          type="color"
          value={value || "#c9a96e"}
          onChange={e => onChange(e.target.value)}
          style={{
            width:30, height:30, border:"none",
            background:"none", cursor:"pointer",
            padding:0,
          }}
        />
        <span style={{
          flex:1, fontSize:12, color:Gray600,
          fontWeight:500,
        }}>{T.cust_color_picker}</span>
        <span style={{
          fontSize:11, color:Gray400,
          fontFamily:"ui-monospace, monospace",
        }}>{value || ""}</span>
      </label>
    </div>
  );
}

// Tab Couleurs complet : 3 ColorPickerBlock (accent, sidebar, paper).
function ColorsTab({ T, scope, theme, cvCustom, versionCustom, writeCustom }) {

  // La valeur effective courante (apres merge) pour pre-selectionner
  // le bon swatch / pre-remplir le picker.
  // Selon le scope on edite le custom global ou le custom version.
  const editing = scope === "global" ? cvCustom : versionCustom;
  const eff = mergeTheme(theme, cvCustom, versionCustom);

  const setAccent = (color) => writeCustom(c => ({ ...c, ac: color }));
  const setSidebar = (color) => writeCustom(c => ({ ...c, sb: color }));
  const setPaper = (color) => writeCustom(c => ({ ...c, bg: color }));

  return (
    <div>
      {/* Couleur d'accent : doit contraster avec sidebar (pour le titre / accent visible dessus) */}
      <ColorPickerBlock
        T={T}
        label={T.cust_color_accent}
        value={(editing && editing.ac) || eff.ac}
        onChange={setAccent}
        presets={ACCENT_PRESETS}
        contrastWith={eff.sb}
        columns={4}
      />
      {/* Bandeau lateral : doit contraster avec la couleur de texte sur sidebar (st) */}
      <ColorPickerBlock
        T={T}
        label={T.cust_color_sidebar}
        value={(editing && editing.sb) || eff.sb}
        onChange={setSidebar}
        presets={SIDEBAR_PRESETS}
        contrastWith={eff.st}
        columns={3}
      />
      {/* Fond du CV : doit contraster avec le texte principal (Ink en general) */}
      <ColorPickerBlock
        T={T}
        label={T.cust_color_paper}
        value={(editing && editing.bg) || eff.bg}
        onChange={setPaper}
        presets={PAPER_PRESETS}
        contrastWith={Ink}
        columns={5}
      />
    </div>
  );
}

// FontCard : aperçu d'une font (Aa + nom + vibe + ATS badge optionnel).
// Charge la font des le mount via ensureFontLoaded pour rendre l'apercu fidele.
function FontCard({ font, active, onClick, sample, isBody }) {
  useEffect(() => {
    ensureFontLoaded(font.googleHref);
  }, [font.googleHref]);
  return (
    <button onClick={onClick} style={{
      ...B({
        background:active ? CreamSoft : Paper,
        border:active ? "1.5px solid "+Ink : "0.5px solid "+Gray200,
        borderRadius:RadiusMd,
        padding:"14px 16px",
        textAlign:"left",
        boxShadow:active ? "none" : ShadowSm,
        transition:"all 180ms ease-out",
        width:"100%",
        cursor:"pointer",
        display:"flex", alignItems:"center", gap:14,
      })
    }}>
      {/* Apercu rendu dans la font cible */}
      <div style={{
        width:48, height:48, flexShrink:0,
        borderRadius:10,
        background:Cream,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:font.family,
        fontSize:isBody ? 22 : 26,
        fontWeight:isBody ? 500 : 600,
        color:Ink,
        letterSpacing:isBody ? "0" : "-0.02em",
        border:"0.5px solid "+Gray200,
      }}>{sample}</div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{
          fontFamily:Sans, fontSize:13, fontWeight:600,
          color:Ink, marginBottom:2,
        }}>{font.name}</div>
        <div style={{
          fontFamily:Sans, fontSize:11, color:Gray600,
          lineHeight:1.4,
        }}>
          {font.vibe}
          {font.target ? " - " + font.target : ""}
        </div>
      </div>
      {isBody && font.ats && (
        <span style={{
          padding:"3px 9px", borderRadius:RadiusPill,
          background:GreenSoft, color:Green,
          fontSize:10, fontWeight:600, fontFamily:Sans,
          letterSpacing:"0.04em",
          flexShrink:0,
        }}>{font.ats}</span>
      )}
    </button>
  );
}

// FontSection : eyebrow + grille de FontCard (1 colonne sur mobile).
function FontSection({ T, label, fonts, value, onPick, sample, isBody }) {
  // Match strict : on cherche "'Nom Exact'" entoure de quotes simples
  // pour eviter les faux positifs (ex "Inter Tight" qui matcherait "Inter").
  const isActive = (f) => {
    if (!value) return false;
    const v = value.toLowerCase();
    const target = "'" + f.name.toLowerCase() + "'";
    return v.indexOf(target) !== -1;
  };
  return (
    <div style={{marginBottom:22}}>
      <div style={{
        fontSize:11, fontWeight:600,
        letterSpacing:"0.1em", textTransform:"uppercase",
        color:GoldDeep, marginBottom:10,
        fontFamily:Sans,
      }}>{label}</div>
      <div style={{
        display:"flex", flexDirection:"column", gap:8,
      }}>
        {fonts.map(f => (
          <FontCard
            key={f.id}
            font={f}
            sample={sample}
            isBody={isBody}
            active={isActive(f)}
            onClick={()=>onPick(f)}
          />
        ))}
      </div>
    </div>
  );
}

// FontUrlInput : champ libre Google Fonts URL.
// Apres saisie d'une URL valide, demande "aux titres ou au corps ?"
// puis applique. Gere les erreurs de validation et de chargement.
function FontUrlInput({ T, onApply }) {
  const [url, setUrl]       = useState("");
  const [pending, setPending] = useState(null); // { name, family, googleHref }
  const [err, setErr]       = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    setErr("");
    const parsed = parseGoogleFontUrl(url.trim());
    if (!parsed) {
      setErr(T.cust_font_url_invalid);
      return;
    }
    setLoading(true);
    ensureFontLoaded(parsed.googleHref);
    // Petite latence pour laisser la font se charger avant d'afficher
    // le choix headings/body.
    setTimeout(() => {
      setPending(parsed);
      setLoading(false);
    }, 600);
  };

  const apply = (target) => {
    if (!pending) return;
    onApply(target, pending);
    setUrl("");
    setPending(null);
    setErr("");
  };

  return (
    <div style={{
      padding:"16px 16px 18px",
      borderRadius:RadiusMd,
      background:Paper,
      border:"0.5px solid "+Gray200,
      boxShadow:ShadowSm,
      marginTop:8,
    }}>
      <div style={{
        fontSize:11, fontWeight:600,
        letterSpacing:"0.1em", textTransform:"uppercase",
        color:GoldDeep, marginBottom:10,
        fontFamily:Sans,
      }}>{T.cust_font_url_label}</div>
      <input
        type="url"
        value={url}
        onChange={e => { setUrl(e.target.value); setErr(""); }}
        placeholder={T.cust_font_url_ph}
        style={{
          width:"100%",
          padding:"11px 14px",
          borderRadius:RadiusSm,
          border:"0.5px solid "+(err ? Coral : Gray200),
          background:Cream,
          color:Ink, fontSize:12,
          fontFamily:"ui-monospace, monospace",
          outline:"none",
          marginBottom:err ? 6 : 10,
          boxSizing:"border-box",
        }}
      />
      {err && (
        <div style={{
          fontSize:11, color:Coral,
          marginBottom:10, fontFamily:Sans,
        }}>{err}</div>
      )}
      {!pending && (
        <button onClick={validate} disabled={loading || !url.trim()} style={{
          ...B({
            width:"100%", padding:"11px 18px", borderRadius:RadiusPill,
            background:loading || !url.trim() ? Gray200 : Ink,
            color:loading || !url.trim() ? Gray600 : Cream,
            fontSize:13, fontWeight:600, fontFamily:Sans,
            transition:"all 200ms ease-out",
          })
        }}>
          {loading ? T.cust_font_url_loading : T.cust_font_url_apply}
        </button>
      )}
      {pending && (
        <div>
          {/* Apercu rapide */}
          <div style={{
            padding:"12px 14px", borderRadius:RadiusSm,
            background:CreamSoft,
            border:"0.5px solid "+Gray200,
            marginBottom:12,
          }}>
            <div style={{
              fontFamily:pending.family,
              fontSize:24, fontWeight:600,
              color:Ink, marginBottom:2,
              letterSpacing:"-0.01em",
            }}>{pending.name}</div>
            <div style={{
              fontFamily:pending.family,
              fontSize:13, color:Gray600,
            }}>The quick brown fox jumps over the lazy dog</div>
          </div>
          <div style={{
            fontSize:12, color:Gray600,
            marginBottom:8, fontFamily:Sans,
          }}>{T.cust_font_url_apply_target}</div>
          <div style={{display:"flex", gap:8}}>
            <button onClick={()=>apply("header")} style={{
              ...B({
                flex:1, padding:"11px 14px", borderRadius:RadiusPill,
                background:Ink, color:Cream,
                fontSize:12, fontWeight:600, fontFamily:Sans,
                transition:"all 200ms ease-out",
              })
            }}>{T.cust_font_url_to_header}</button>
            <button onClick={()=>apply("body")} style={{
              ...B({
                flex:1, padding:"11px 14px", borderRadius:RadiusPill,
                background:Ink, color:Cream,
                fontSize:12, fontWeight:600, fontFamily:Sans,
                transition:"all 200ms ease-out",
              })
            }}>{T.cust_font_url_to_body}</button>
          </div>
          <button onClick={()=>{ setPending(null); setUrl(""); }} style={{
            ...B({
              width:"100%", marginTop:8, padding:"8px 14px",
              background:"transparent", color:Gray600,
              fontSize:11, fontFamily:Sans,
            })
          }}>{T.back}</button>
        </div>
      )}
    </div>
  );
}

// FontsTab : section titres + section corps + champ libre URL.
function FontsTab({ T, scope, theme, cvCustom, versionCustom, writeCustom }) {
  const editing = scope === "global" ? cvCustom : versionCustom;
  const eff     = mergeTheme(theme, cvCustom, versionCustom);

  const pickHeader = (font) => writeCustom(c => ({
    ...c, hf: font.family, hfHref: font.googleHref,
  }));
  const pickBody = (font) => writeCustom(c => ({
    ...c, bf: font.family, bfHref: font.googleHref,
  }));
  const applyUrl = (target, parsed) => {
    if (target === "header") {
      writeCustom(c => ({ ...c, hf: parsed.family, hfHref: parsed.googleHref }));
    } else {
      writeCustom(c => ({ ...c, bf: parsed.family, bfHref: parsed.googleHref }));
    }
  };

  return (
    <div>
      <FontSection
        T={T}
        label={T.cust_font_header}
        fonts={HEADER_FONTS}
        value={(editing && editing.hf) || eff.hf || ""}
        onPick={pickHeader}
        sample={T.cust_font_sample_header}
        isBody={false}
      />
      <FontSection
        T={T}
        label={T.cust_font_body}
        fonts={BODY_FONTS}
        value={(editing && editing.bf) || eff.bf || ""}
        onPick={pickBody}
        sample={T.cust_font_sample_body}
        isBody={true}
      />
      <FontUrlInput T={T} onApply={applyUrl}/>
    </div>
  );
}

// ============================================================
// Suggestions IA (etape 4) : analyse deep du profil + 4 combos curees
// ============================================================

// Construit le prompt deep pour les suggestions de style.
// Analyse en profondeur : secteur, seniorite (deduite des dates), pays,
// niveau (executive / mid / junior), culture cible.
function buildStylePrompt(cv, locale) {
  const yrs = (cv.experience || []).reduce((acc, e) => {
    const m = (e.period || "").match(/(\d{4})\s*[-]\s*(\d{4}|present|now|en cours|aujourd|actuel)/i);
    if (m) {
      const start = parseInt(m[1], 10);
      const endRaw = m[2];
      const end = /\d{4}/.test(endRaw) ? parseInt(endRaw, 10) : new Date().getFullYear();
      return acc + Math.max(0, end - start);
    }
    return acc;
  }, 0);
  const expSummary = (cv.experience || []).slice(0, 4).map(e =>
    (e.title || "") + " chez " + (e.company || "") + " (" + (e.period || "") + ")"
  ).join(" | ");
  const skillsSummary = (cv.skills || []).filter(Boolean).slice(0, 8).join(", ");
  const profileLine =
      "Titre actuel: " + (cv.title || "(non renseigne)")
    + "\nNom: " + (cv.name || "(non renseigne)")
    + "\nLocalisation: " + (cv.location || "(non renseignee)")
    + "\nAccroche: " + ((cv.summary || "").slice(0, 280) || "(non renseignee)")
    + "\nExperiences (4 plus recentes): " + (expSummary || "(aucune)")
    + "\nCompetences cles: " + (skillsSummary || "(aucune)")
    + "\nAnnees d'experience cumulees (estimation): " + yrs;

  const langLine = locale === "en"
    ? "Reponds STRICTEMENT en anglais. "
    : "Reponds STRICTEMENT en francais. ";

  return (
    "Tu es directeur artistique senior pour CV executifs."
    + " Analyse le profil ci-dessous et propose EXACTEMENT 4 combinaisons style"
    + " (couleurs + polices) qui maximisent l'impact recruteur."
    + "\n\nPROFIL:\n" + profileLine
    + "\n\nREGLES STRICTES:"
    + "\n- Chaque combinaison doit etre COHERENTE avec le secteur et le niveau."
    + "\n- 4 combinaisons distinctes ciblant des CULTURES DIFFERENTES (ex: banque classique, fintech, conseil premium, tech moderne)."
    + "\n- Couleurs en hex valides (#RRGGBB)."
    + "\n- Polices choisies parmi: Playfair Display, Fraunces, Cormorant Garamond, DM Serif Display, Space Grotesk, Montserrat, Inter, Lora, Lato, Source Sans 3, DM Sans, IBM Plex Sans, Open Sans, Nunito Sans, Work Sans."
    + "\n- Le 'why' doit expliquer en 1 phrase precise pourquoi ce combo colle au profil."
    + "\n- " + NO_DASH + " " + langLine + "JSON UNIQUEMENT, sans markdown."
    + '\n\n{"combos":[{"name":"Banque classique","accent":"#7a1f2b","sidebar":"#0a0a0a","paper":"#f8f6f1","header_font":"Playfair Display","body_font":"Lato","target":"banque privee, gestion patrimoine","why":"explication 1 phrase precise"}]}'
  );
}

// Resout un nom de font (ex "Playfair Display") en entree de la lib curee.
// Retourne null si pas trouve.
function resolveFontByName(name) {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  return HEADER_FONTS.find(f => f.name.toLowerCase() === lower)
      || BODY_FONTS.find(f => f.name.toLowerCase() === lower)
      || null;
}

// Carte d'un combo IA : bandeau de couleurs + apercu fonts + why + adopter.
function SuggestionCombo({ T, combo, onAdopt }) {
  const headerFont = resolveFontByName(combo.header_font);
  const bodyFont   = resolveFontByName(combo.body_font);

  // Charge les fonts du combo des le mount (pour l'apercu).
  useEffect(() => {
    if (headerFont) ensureFontLoaded(headerFont.googleHref);
    if (bodyFont)   ensureFontLoaded(bodyFont.googleHref);
  }, [headerFont, bodyFont]);

  // Validation minimale des couleurs hex
  const validHex = (s) => typeof s === "string" && /^#[0-9a-fA-F]{6}$/.test(s);
  const accent  = validHex(combo.accent)  ? combo.accent  : "#c9a96e";
  const sidebar = validHex(combo.sidebar) ? combo.sidebar : "#0a0a0a";
  const paper   = validHex(combo.paper)   ? combo.paper   : "#f8f6f1";

  return (
    <div style={{
      background:Paper, borderRadius:RadiusMd,
      border:"0.5px solid "+Gray200,
      boxShadow:ShadowSm,
      padding:0, marginBottom:14, overflow:"hidden",
      fontFamily:Sans,
    }}>
      {/* Apercu visuel : bandeau sidebar + zone paper avec accent */}
      <div style={{
        display:"flex", height:96,
        borderBottom:"0.5px solid "+Gray200,
      }}>
        <div style={{
          width:"30%", background:sidebar,
          display:"flex", flexDirection:"column",
          justifyContent:"center", alignItems:"center",
          padding:8,
        }}>
          <div style={{
            fontFamily:headerFont ? headerFont.family : Serif,
            fontSize:22, fontWeight:600,
            color:accent, letterSpacing:"-0.02em",
            lineHeight:1,
          }}>Aa</div>
          <div style={{
            width:18, height:2, background:accent,
            marginTop:6, borderRadius:1,
          }}/>
        </div>
        <div style={{
          flex:1, background:paper,
          padding:"14px 16px",
          display:"flex", flexDirection:"column", justifyContent:"center",
        }}>
          <div style={{
            fontFamily:headerFont ? headerFont.family : Serif,
            fontSize:14, fontWeight:600,
            color:Ink, marginBottom:4,
            letterSpacing:"-0.01em",
          }}>{combo.name || "Combo"}</div>
          <div style={{
            fontFamily:bodyFont ? bodyFont.family : Sans,
            fontSize:11, color:"#444",
            lineHeight:1.4,
          }}>The quick brown fox jumps</div>
          <div style={{
            display:"flex", gap:5, marginTop:6,
          }}>
            <span style={{width:10, height:10, borderRadius:"50%", background:accent, border:"0.5px solid "+Gray200}}/>
            <span style={{width:10, height:10, borderRadius:"50%", background:sidebar, border:"0.5px solid "+Gray200}}/>
            <span style={{width:10, height:10, borderRadius:"50%", background:paper, border:"0.5px solid "+Gray200}}/>
          </div>
        </div>
      </div>

      {/* Body de la card : nom du combo + why + adopter */}
      <div style={{padding:"14px 16px 16px"}}>
        <div style={{
          fontSize:11, fontWeight:600,
          letterSpacing:"0.1em", textTransform:"uppercase",
          color:GoldDeep, marginBottom:6,
        }}>{combo.target || ""}</div>
        <div style={{
          fontFamily:Serif, fontWeight:400, fontStyle:"italic",
          fontSize:14, lineHeight:1.5,
          color:Ink, marginBottom:4,
          letterSpacing:"-0.005em",
        }}>"{combo.why || ""}"</div>
        <div style={{
          fontSize:11, color:Gray600, marginTop:8,
          marginBottom:12, fontFamily:Sans,
        }}>
          {combo.header_font || "?"}
          {" + "}
          {combo.body_font || "?"}
        </div>
        <button onClick={()=>onAdopt({
          ac: accent, sb: sidebar, bg: paper,
          hf: headerFont ? headerFont.family : null,
          hfHref: headerFont ? headerFont.googleHref : null,
          bf: bodyFont ? bodyFont.family : null,
          bfHref: bodyFont ? bodyFont.googleHref : null,
        })} style={{
          ...B({
            width:"100%", padding:"11px 16px", borderRadius:RadiusPill,
            background:Ink, color:Cream,
            fontSize:12, fontWeight:600, fontFamily:Sans,
            display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
            transition:"all 200ms ease-out",
          })
        }}>
          {T.cust_suggest_adopt}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// SuggestTab : bouton run + loading + 4 SuggestionCombo + reset.
function SuggestTab({ T, cv, locale, apiKey, notify, scope, writeCustom, onAdopted }) {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(false);

  const cvIsEmpty = !cv.name && !cv.title && !cv.summary
    && (cv.experience || []).every(e => !e.title && !e.company);

  const run = async () => {
    if (cvIsEmpty) { notify(T.cust_suggest_no_cv); return; }
    if (!apiKey)   { notify(T.nk); return; }
    setLoading(true);
    setCombos([]);
    try {
      const txt = await aiCall(buildStylePrompt(cv, locale));
      const parsed = parseJSON(txt);
      const arr = Array.isArray(parsed && parsed.combos) ? parsed.combos : [];
      setCombos(arr);
    } catch (err) {
      notify(T.ea + ": " + (err && err.message ? err.message : ""));
    }
    setLoading(false);
  };

  const adopt = (custom) => {
    // Applique le custom complet d'un coup (couleurs + fonts).
    writeCustom(c => ({ ...c, ...custom }));
    notify(T.cust_adopted);
    if (onAdopted) onAdopted();
  };

  return (
    <div>
      <button onClick={run} disabled={loading || cvIsEmpty || !apiKey} style={{
        ...B({
          width:"100%", padding:"15px 22px", borderRadius:RadiusPill,
          background:loading || cvIsEmpty || !apiKey ? Gray200 : GradPurple,
          color:loading || cvIsEmpty || !apiKey ? Gray600 : "#fff",
          fontFamily:Sans, fontWeight:600, fontSize:14,
          display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
          marginBottom:18,
          transition:"all 200ms ease-out",
        })
      }}>
        {loading ? T.cust_suggest_loading : T.cust_suggest_btn}
        {!loading && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>
          </svg>
        )}
      </button>

      {cvIsEmpty && (
        <div style={{
          padding:"18px 16px", background:CreamSoft,
          border:"0.5px solid "+Gray200, borderRadius:RadiusMd,
          fontSize:12, color:Gray600, lineHeight:1.5,
          fontFamily:Sans, textAlign:"center",
        }}>{T.cust_suggest_no_cv}</div>
      )}

      {!loading && combos.length > 0 && combos.map((c, i) => (
        <SuggestionCombo
          key={i}
          T={T}
          combo={c}
          onAdopt={adopt}
        />
      ))}

      {loading && (
        <div style={{
          padding:"32px 18px", textAlign:"center",
          color:Gray600, fontSize:13, fontFamily:Sans,
        }}>
          <div style={{
            width:32, height:32,
            border:"2.5px solid "+Gray200, borderTopColor:Purple,
            borderRadius:"50%",
            margin:"0 auto 12px",
            animation:"cvfSpin 1s linear infinite",
          }}/>
          {T.cust_suggest_loading}
        </div>
      )}
    </div>
  );
}

// ============================================================
// CustomizeSheet v17 : sheet bottom iOS-native pour la personnalisation
// du CV rendu (couleurs + polices + suggestions IA).
//
// Architecture :
// - Tabs pills : Couleurs / Polices / Suggestions IA
// - Toggle scope : Style par defaut (global) / Cette version (override)
// - Reset au theme en bas
//
// Etape 1 : skeleton (tabs vides). Les contenus arrivent en etapes 2-4.
// ============================================================
function CustomizeSheet({ T, cv, theme, cvCustom, setCvCustom, setCvFn,
  apiKey, notify, locale, onClose }) {

  // Scope : "global" ou "version" - quel custom on edite.
  const [scope, setScope] = useState("global");
  // Tab principal : "colors" | "fonts" | "suggest"
  const [tab, setTab] = useState("colors");

  // Lit / ecrit le custom selon le scope choisi.
  const versionCustom = (cv && cv.custom && typeof cv.custom === "object") ? cv.custom : null;
  const currentCustom = scope === "global" ? cvCustom : versionCustom;

  const writeCustom = useCallback((mutator) => {
    if (scope === "global") {
      setCvCustom(prev => {
        const base = prev || {};
        const next = mutator({ ...base });
        // Si tout est vide, on remet null pour garder lsS propre.
        if (!next || Object.keys(next).length === 0) return null;
        return next;
      });
    } else {
      // Override de version : on ecrit dans cv.custom.
      setCvFn(prev => {
        const base = prev.custom || {};
        const next = mutator({ ...base });
        if (!next || Object.keys(next).length === 0) {
          const { custom, ...rest } = prev;
          return rest;
        }
        return { ...prev, custom: next };
      });
    }
  }, [scope, setCvCustom, setCvFn]);

  const resetCurrent = () => {
    if (scope === "global") {
      setCvCustom(null);
    } else {
      setCvFn(prev => {
        const { custom, ...rest } = prev;
        return rest;
      });
    }
    notify(T.cust_resetted);
  };

  // Pill style (re-usable in this sheet)
  const pill = (active) => ({
    flex:1, padding:"10px 12px", borderRadius:RadiusPill,
    background:active ? Ink : Paper,
    color:active ? Cream : Ink,
    border:"0.5px solid "+(active ? Ink : Gray200),
    fontFamily:Sans, fontWeight:active ? 600 : 500, fontSize:12,
    transition:"all 180ms ease-out",
    cursor:"pointer",
  });

  return (
    <Sheet
      eyebrow={T.cust_eyebrow}
      title={
        <>
          {T.cust_title_a}{" "}
          <em style={{
            fontFamily:Serif, fontStyle:"italic", color:Gold,
          }}>{T.cust_title_em}</em>
          {T.cust_title_b}
        </>
      }
      onClose={onClose}
    >
      <p style={{
        fontSize:13, color:Gray600, lineHeight:1.5,
        margin:"0 0 16px", fontFamily:Sans,
      }}>{T.cust_sub}</p>

      {/* Toggle scope : global / version */}
      <div style={{display:"flex", gap:8, marginBottom:6}}>
        <button onClick={()=>setScope("global")} style={{...B(pill(scope==="global"))}}>
          {T.cust_scope_global}
        </button>
        <button onClick={()=>setScope("version")} style={{...B(pill(scope==="version"))}}>
          {T.cust_scope_version}
        </button>
      </div>
      <div style={{
        fontSize:11, color:Gray600, lineHeight:1.5,
        marginBottom:18, fontFamily:Sans,
      }}>
        {scope === "global" ? T.cust_scope_global_hint : T.cust_scope_version_hint}
      </div>

      {/* Tabs principaux */}
      <div style={{
        display:"flex", gap:6, marginBottom:18,
      }}>
        {[["colors", T.cust_tab_colors],
          ["fonts",  T.cust_tab_fonts],
          ["suggest",T.cust_tab_suggest]].map(([k, label]) => (
            <button key={k} onClick={()=>setTab(k)} style={{...B(pill(tab===k))}}>
              {label}
            </button>
          ))}
      </div>

      {/* Tab content */}
      {tab === "colors" && (
        <ColorsTab
          T={T} scope={scope} theme={theme}
          cvCustom={cvCustom} versionCustom={versionCustom}
          writeCustom={writeCustom}
        />
      )}
      {tab === "fonts" && (
        <FontsTab
          T={T} scope={scope} theme={theme}
          cvCustom={cvCustom} versionCustom={versionCustom}
          writeCustom={writeCustom}
        />
      )}
      {tab === "suggest" && (
        <SuggestTab
          T={T} cv={cv} locale={locale} apiKey={apiKey}
          notify={notify} scope={scope} writeCustom={writeCustom}
        />
      )}

      {/* Reset bouton */}
      {currentCustom && (
        <button onClick={resetCurrent} style={{
          ...B({
            width:"100%", padding:"12px 16px", borderRadius:RadiusMd,
            background:CoralSoft, color:Coral,
            border:"0.5px solid "+Coral,
            fontSize:13, fontWeight:500, fontFamily:Sans,
            marginTop:24,
            transition:"all 200ms ease-out",
          })
        }}>{T.cust_reset}</button>
      )}
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
  // v17 chantier 4 : Score Dashboard 8 axes (resultat IA persiste pour la session).
  const [dashLoading, setDashLoading] = useState(false);
  const [dashResult, setDashResult]   = useState(null);
  // v17 chantier 5 : Gap Repair (Lisser le parcours)
  const [showGapRepair, setShowGapRepair] = useState(false);
  // v17 chantier 6 : Interview Continuity (Preparer l'entretien)
  const [showInterview, setShowInterview] = useState(false);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [interviewResult, setInterviewResult] = useState(null);
  const [interviewOffer, setInterviewOffer] = useState("");
  // v17 chantier 7 : Coach IA conversationnel
  const [showCoach, setShowCoach] = useState(false);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachMessages, setCoachMessages] = useState([]);
  // v17 chantier 8 : Export LinkedIn
  const [showLinkedIn, setShowLinkedIn] = useState(false);
  const [linkedInLoading, setLinkedInLoading] = useState(false);
  const [linkedInResult, setLinkedInResult] = useState(null);
  // v17 chantier 9 : CV Compare
  const [showCompare, setShowCompare] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareResult, setCompareResult] = useState(null);
  const [comparePickA, setComparePickA] = useState(null);
  const [comparePickB, setComparePickB] = useState(null);
  // v17 chantier 10 : Applications Tracker
  const [showApplications, setShowApplications] = useState(false);
  const [applications, setApplications] = useState([]);
  // v17 chantier 11 : Multi-CV strategie
  const [showMultiCV, setShowMultiCV] = useState(false);
  const [multiCVLoading, setMultiCVLoading] = useState(false);
  const [multiCVResult, setMultiCVResult] = useState(null);
  const [multiCVOffer, setMultiCVOffer] = useState("");
  // v17 : Customize CV (couleurs + polices)
  // cvCustom = custom global (applique partout par defaut).
  // versionCustom est lu depuis cv.custom (par-version) si present.
  const [cvCustom, setCvCustom_]      = useState(null);
  const [showCustomize, setShowCustomize] = useState(false);
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
    const savedCt = lsG(SK.CT, null);
    if (savedCt && typeof savedCt === "object") setCvCustom_(savedCt);
    // Load coach conversation history (cap a 50 derniers messages)
    const savedCo = lsG(SK.CO, []);
    if (Array.isArray(savedCo) && savedCo.length) {
      setCoachMessages(savedCo.slice(-50));
    }
    // Load applications tracker
    const savedAp = lsG(SK.AP, []);
    if (Array.isArray(savedAp) && savedAp.length) {
      setApplications(savedAp);
    }
    setHydrated(true);
  }, []);

  // Setter persiste pour le custom global.
  const setCvCustom = useCallback(fn => setCvCustom_(p => {
    const n = typeof fn === "function" ? fn(p) : fn;
    lsS(SK.CT, n);
    return n;
  }), []);

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

  // v17 : custom theme effectif (theme < global custom < version custom).
  // Le custom par-version est stocke directement dans cv.custom.
  const versionCustom = (cv && cv.custom && typeof cv.custom === "object") ? cv.custom : null;
  const effTheme = mergeTheme(theme, cvCustom, versionCustom);

  // Charge dynamiquement les Google Fonts custom des qu'elles changent.
  useEffect(() => {
    ensureCustomFontsLoaded(cvCustom, versionCustom);
  }, [cvCustom, versionCustom]);

  // v17 chantier 5 : analyse de chronologie pour Gap Repair.
  // Tout est calcule a partir de cv.experience, donc on memoize
  // pour eviter de re-calculer a chaque render.
  const gapAnalysis = useMemo(() => {
    const exps = cv && cv.experience ? cv.experience : [];
    if (exps.length < 2) {
      return { gaps: [], yearStrategy: null, groupOps: [], unparsableCount: 0 };
    }
    const gaps = detectGaps(exps, 1);
    const yearStrategy = analyzeYearOnlyStrategy(exps, 1);
    const groupOps = findGroupingOpportunities(exps);
    const unparsableCount = countUnparsable(exps);
    return { gaps, yearStrategy, groupOps, unparsableCount };
  }, [cv]);

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
    s.onload = async () => {
      // v17 : attend que les Google Fonts custom soient chargees avant snapshot.
      try {
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }
      } catch {}
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

  // v17 chantier 4 : Score Dashboard 8 axes.
  // Demande a l'IA d'evaluer 8 dimensions distinctes du CV. Retour : 8 scores
  // entre 0 et 100, une recommandation actionnable par axe, un verdict global,
  // et la priorite numero 1 a corriger.
  const runScoreDashboard = useCallback(async () => {
    if (!apiKey) { notify(T.nk); return; }
    if (cvIsEmpty) { notify(T.sd_no_cv); return; }
    setDashLoading(true);
    try {
      const expT = (cv.experience || []).map(e =>
        (e.title||"") + " chez " + (e.company||"")
        + " (" + (e.period||"") + "): "
        + (e.bullets||[]).filter(b=>b).join("; ")
      ).join(" | ");
      const cvT = "Nom: " + (cv.name||"")
        + "\nTitre actuel: " + (cv.title||"")
        + "\nLocalisation: " + (cv.location||"")
        + "\nLinkedIn: " + (cv.linkedin ? "present" : "absent")
        + "\nAccroche: " + (cv.summary||"")
        + "\nExperiences: " + expT
        + "\nCompetences: " + (cv.skills||[]).filter(s=>s).join(", ")
        + "\nLangues: " + (cv.languages||[]).filter(l=>l.lang).map(l=>l.lang+" ("+(l.level||"")+")").join(", ")
        + "\nCertifications: " + (cv.certifications||[]).filter(c=>c).join(", ")
        + "\nLayout actuel: " + layout;
      const langLine = locale === "en"
        ? "Reponds STRICTEMENT en anglais. "
        : "Reponds STRICTEMENT en francais. ";
      const p = "Tu es expert RH senior, recruteur international avec 15 ans d'experience."
        + " Analyse le CV ci-dessous selon 8 axes distincts."
        + "\n\nCV:\n" + cvT
        + "\n\nREGLES STRICTES:"
        + "\n- Score chaque axe entre 0 et 100 (sois honnete et exigeant, pas complaisant)."
        + "\n- Pour chaque axe, ecris une recommandation ACTIONNABLE en 1 phrase (max 25 mots)."
        + "\n- La recommandation doit etre concrete : 'Reformule X', 'Ajoute Y', pas 'ameliore'."
        + "\n- Le verdict global est une phrase synthese de 1 a 2 phrases (max 200 caracteres)."
        + "\n- Le top_priority est l'action numero 1 si l'utilisateur ne fait QU'UNE chose (max 30 mots)."
        + "\n- " + NO_DASH + " " + langLine + "JSON UNIQUEMENT, sans markdown."
        + "\n\nLES 8 AXES:"
        + "\n1. title : Clarte du titre. Le titre rend-il le metier evident en 1 seconde ?"
        + "\n2. bullets : Impact des bullets. Chiffres, verbes d'action, resultats concrets ?"
        + "\n3. ats : Compatibilite ATS. Mots-cles metier, format propre (pas de tableaux pieges) ?"
        + "\n4. relevance : Pertinence du parcours. Coherence avec le metier actuel/vise ?"
        + "\n5. credibility : Credibilite. Phrases solides, sans bullshit ni exagerations vagues ?"
        + "\n6. design : Style et design. Hierarchie visuelle, lisibilite, presentation pro ?"
        + "\n7. readability : Lisibilite. Longueur appropriee, densite equilibree, sections proportionnees ?"
        + "\n8. differentiation : Differenciation. Y-a-t-il un angle qui sort du lot, ou est-ce interchangeable ?"
        + "\n\nFORMAT DE REPONSE (JSON strict) :"
        + '\n{"global_score":75,"verdict_global":"phrase synthese","top_priority":"action numero 1 a faire","scores":['
        + '{"id":"title","score":80,"reco":"phrase actionnable"},'
        + '{"id":"bullets","score":60,"reco":"phrase actionnable"},'
        + '{"id":"ats","score":75,"reco":"phrase actionnable"},'
        + '{"id":"relevance","score":85,"reco":"phrase actionnable"},'
        + '{"id":"credibility","score":70,"reco":"phrase actionnable"},'
        + '{"id":"design","score":65,"reco":"phrase actionnable"},'
        + '{"id":"readability","score":80,"reco":"phrase actionnable"},'
        + '{"id":"differentiation","score":55,"reco":"phrase actionnable"}'
        + ']}';
      const txt = await aiCall(p);
      const r = parseJSON(txt);
      setDashResult(r);
    } catch (err) {
      notify(T.ea + (err && err.message ? ": " + err.message : ""));
    }
    setDashLoading(false);
  }, [apiKey, cv, cvIsEmpty, layout, locale, notify, T]);

  // v17 chantier 4 : dispatcher des CTAs des cards de score vers le bon outil.
  // Chaque axe a un CTA different (ex "Editer le titre" -> ouvre SheetId).
  const onCtaAxisDispatch = useCallback((axisId) => {
    // On ferme la sheet score d'abord pour laisser place a la nouvelle action.
    const close = () => setShowScore(false);
    if (axisId === "title") {
      close();
      setModal("id");
    } else if (axisId === "bullets") {
      close();
      setModal("exp");
    } else if (axisId === "ats") {
      close();
      setLy("ats");
      notify(locale === "en" ? "ATS-Safe layout activated" : "Layout ATS-Safe active");
    } else if (axisId === "relevance" || axisId === "differentiation") {
      close();
      runPositioning();
    } else if (axisId === "credibility") {
      close();
      runTruthCheck();
    } else if (axisId === "design") {
      close();
      setShowCustomize(true);
    } else if (axisId === "readability") {
      close();
      setModal("exp");
    }
  }, [locale, notify, runPositioning, runTruthCheck]);

  // v17 chantier 5 : Gap Repair handlers (deterministes, pas d'IA).
  //
  // Strategy 1 : reformatte toutes les dates des experiences en YYYY (years only).
  // Strategy 2 : etend une experience precedente jusqu'a la date de debut suivante.
  // Strategy 3 : fusionne plusieurs experiences en une seule ligne continue.

  // Strategie 1 : reformatte toutes les periodes en YYYY.
  const applyYearOnlyFormat = useCallback(() => {
    pushH();
    setCVFn(p => ({
      ...p,
      experience: (p.experience || []).map(e => ({
        ...e,
        period: reformatPeriodToYearOnly(e.period || ""),
      })),
    }));
    notify(T.gr_strat_year_done || "Dates reformatees en annees");
  }, [pushH, setCVFn, notify, T]);

  // Strategie 2 : etend la fin de l'experience "before" pour qu'elle finisse juste
  // avant le debut de l'experience "after".
  // gap.beforeIdx pointe sur l'index dans le tableau cv.experience original.
  const applyExtendDate = useCallback((gapInfo) => {
    if (!gapInfo || !gapInfo.beforeExp || !gapInfo.afterExp) return;
    pushH();
    setCVFn(p => {
      const exps = [...(p.experience || [])];
      const targetIdx = gapInfo.beforeIdx;
      if (targetIdx < 0 || targetIdx >= exps.length) return p;
      const target = exps[targetIdx];
      // On parse la periode actuelle et on etend la fin a la date de debut suivante.
      const parsed = parsePeriod(target.period || "");
      if (!parsed.start) return p;
      const newEnd = gapInfo.afterExp.period
        ? parsePeriod(gapInfo.afterExp.period).start
        : null;
      if (!newEnd) return p;
      // Reconstitue la string period dans le format original (MM/YYYY si on avait des mois,
      // sinon YYYY).
      const startStr = parsed.start.month
        ? String(parsed.start.month).padStart(2, "0") + "/" + parsed.start.year
        : String(parsed.start.year);
      const endStr = newEnd.month
        ? String(newEnd.month).padStart(2, "0") + "/" + newEnd.year
        : String(newEnd.year);
      const newPeriod = startStr + " - " + endStr;
      exps[targetIdx] = { ...target, period: newPeriod };
      return { ...p, experience: exps };
    });
    notify(T.gr_strat_extend_done || "Date etendue");
  }, [pushH, setCVFn, notify, T]);

  // Strategie 3 : fusionne plusieurs experiences en une seule ligne avec dates en couverture.
  // indices = liste des index dans cv.experience a regrouper.
  const applyGroupExperiences = useCallback((indices) => {
    if (!Array.isArray(indices) || indices.length < 2) return;
    pushH();
    setCVFn(p => {
      const exps = (p.experience || []);
      const toMerge = indices.map(i => exps[i]).filter(Boolean);
      if (toMerge.length < 2) return p;
      // Combinaison : titre = "Conseil et missions" (generique), company = liste,
      // period = "annee_min - annee_max", bullets = concatenation.
      const minYear = Math.min(...toMerge.map(e => {
        const pp = parsePeriod(e.period || ""); return pp.start ? pp.start.year : 9999;
      }));
      const maxYear = Math.max(...toMerge.map(e => {
        const pp = parsePeriod(e.period || ""); return pp.end && !pp.end.present ? pp.end.year : (pp.start ? pp.start.year : 0);
      }));
      const combinedTitle = locale === "en"
        ? "Consulting and missions"
        : "Conseil et missions";
      const combinedCompany = toMerge.map(e => e.company).filter(Boolean).join(", ");
      const combinedBullets = toMerge.flatMap(e =>
        (e.bullets || []).filter(b => (b || "").trim())
      );
      const merged = {
        id: Date.now(),
        title: combinedTitle,
        company: combinedCompany,
        period: minYear + " - " + maxYear,
        location: toMerge[0].location || "",
        bullets: combinedBullets.length > 0 ? combinedBullets : [""],
      };
      // Retire les experiences fusionnees, ajoute la nouvelle a la place de la 1ere.
      const indexSet = new Set(indices);
      const newExps = [];
      let inserted = false;
      exps.forEach((e, i) => {
        if (indexSet.has(i)) {
          if (!inserted) {
            newExps.push(merged);
            inserted = true;
          }
        } else {
          newExps.push(e);
        }
      });
      return { ...p, experience: newExps };
    });
    notify(T.gr_strat_group_done || "Experiences fusionnees");
  }, [locale, pushH, setCVFn, notify, T]);

  // v17 chantier 6 : Interview Continuity.
  // L'IA joue le role du recruteur typique du marche (pays + secteur + niveau)
  // et propose un set adaptatif de questions probables d'entretien, avec reponses STAR.
  // Pas de quota fixe : c'est l'IA qui decide combien de questions et quel mix
  // selon le contexte (ex au Japon plus de questions sur la fidelite, en France
  // plus de cas pratiques, aux US plus de "tell me about a time when").
  const runInterviewPrep = useCallback(async () => {
    if (!apiKey) { notify(T.nk); return; }
    if (cvIsEmpty) { notify(T.iv_no_cv || "Charge d'abord un CV"); return; }
    setInterviewLoading(true);
    setInterviewResult(null);
    try {
      const expT = (cv.experience || []).map(e =>
        (e.title||"") + " chez " + (e.company||"")
        + " (" + (e.period||"") + "): "
        + (e.bullets||[]).filter(b=>b).join("; ")
      ).join(" | ");
      const cvT = "Nom: " + (cv.name||"")
        + "\nTitre: " + (cv.title||"")
        + "\nLocalisation: " + (cv.location||"")
        + "\nAccroche: " + (cv.summary||"")
        + "\nExperiences: " + expT
        + "\nCompetences: " + (cv.skills||[]).filter(s=>s).join(", ")
        + "\nLangues: " + (cv.languages||[]).filter(l=>l.lang).map(l=>l.lang+" ("+(l.level||"")+")").join(", ");

      // Si l'utilisateur a saisi une offre, on l'utilise pour cibler les questions.
      const offerLine = interviewOffer && interviewOffer.trim()
        ? "\n\nOFFRE D'EMPLOI VISEE:\n" + interviewOffer.trim()
        : "";

      const langLine = locale === "en"
        ? "Reponds STRICTEMENT en anglais. "
        : "Reponds STRICTEMENT en francais. ";

      const p = "Tu es recruteur senior international avec 20 ans d'experience."
        + " Pour le candidat ci-dessous, joue le role du recruteur TYPIQUE de son marche"
        + " (pays inferé depuis la localisation, secteur infère depuis le titre + experiences,"
        + " niveau infère depuis la duree totale et les titres)."
        + "\n\nCANDIDAT:\n" + cvT
        + offerLine
        + "\n\nMISSION:"
        + "\nGenere les questions d'entretien que TU lui poserais en vrai. Le nombre et le mix"
        + " de questions doivent refletter LES PRATIQUES REELLES de ton marche (pas un quota artificiel)."
        + " Par exemple:"
        + "\n- En Asie : plus de questions sur la stabilite, le long terme, la culture entreprise."
        + "\n- En Amerique du Nord : beaucoup de comportementales 'tell me about a time when'."
        + "\n- En France : beaucoup de cas pratiques, etudes de cas chiffrees, jugement."
        + "\n- En Allemagne : tres techniques, processus, methodologie."
        + "\n- Au UK : un mix equilibre techniques + competency-based."
        + "\n\nREGLES STRICTES:"
        + "\n- Entre 8 et 12 questions au total selon le marche (pas plus, pas moins)."
        + "\n- Chaque question est realiste et FREQUEMMENT posee dans ce contexte."
        + "\n- Pour CHAQUE question, fournis une reponse modele en methode STAR (Situation, Tache, Action, Resultat)."
        + "\n- La reponse STAR doit s'inspirer du parcours reel du candidat (pas inventer)."
        + "\n- Categories possibles : Technique, Comportementale, Cas pratique, Culture, Motivation."
        + "\n- " + NO_DASH + " " + langLine + "JSON UNIQUEMENT, sans markdown, sans backticks."
        + "\n\nFORMAT JSON STRICT:"
        + '\n{"country":"France","sector":"Banque","level":"Senior",'
        + '"total_questions":10,"questions":['
        + '{"category":"Technique","question":"Question concrete posee par recruteur",'
        + '"why":"pourquoi le recruteur la pose","answer":{'
        + '"situation":"contexte concret tire du parcours","task":"objectif a atteindre",'
        + '"action":"actions concretes prises","result":"resultat chiffre ou qualitatif"}}'
        + ']}';

      const txt = await aiCall(p);
      const parsed = parseJSON(txt);
      setInterviewResult(parsed);
    } catch (err) {
      notify(T.ea + (err && err.message ? ": " + err.message : ""));
    }
    setInterviewLoading(false);
  }, [apiKey, cv, cvIsEmpty, interviewOffer, locale, notify, T]);

  // Pre-rempli le champ offre depuis offerResult de Cibler si dispo.
  // S'execute a chaque ouverture du modal interview.
  useEffect(() => {
    if (showInterview && offerResult && offerResult.offer_text && !interviewOffer) {
      setInterviewOffer(offerResult.offer_text);
    }
  }, [showInterview, offerResult, interviewOffer]);

  // v17 chantier 7 : Coach IA conversationnel.
  //
  // Persiste l'historique en localStorage (cap a 50 derniers messages).
  // L'IA dialogue, peut proposer des reformulations adoptables (kind: summary/title/bullet).
  //
  // Format JSON attendu de la reponse IA :
  //   { "reply": "texte conversationnel", "adopt": {"kind":"summary"|"title"|"bullet", "value":"..."} }
  //   adopt est optionnel.
  const runCoachMessage = useCallback(async (userText) => {
    if (!apiKey) { notify(T.nk); return; }
    if (cvIsEmpty) { notify(T.co_no_cv); return; }
    if (!userText || !userText.trim()) return;

    // Append immediately user message (UX feedback instant)
    const userMsg = { role:"user", content:userText.trim(), ts:Date.now() };
    let nextMessages;
    setCoachMessages(prev => {
      nextMessages = [...prev, userMsg].slice(-50);
      lsS(SK.CO, nextMessages);
      return nextMessages;
    });
    setCoachLoading(true);

    try {
      const expT = (cv.experience || []).slice(0, 5).map(e =>
        (e.title||"") + " chez " + (e.company||"")
        + " (" + (e.period||"") + "): "
        + (e.bullets||[]).filter(b=>b).slice(0,3).join("; ")
      ).join(" | ");
      const cvCtx = "Nom: " + (cv.name||"")
        + " | Titre: " + (cv.title||"")
        + " | Loc: " + (cv.location||"")
        + " | Accroche: " + (cv.summary||"").slice(0,200)
        + " | Exp: " + expT
        + " | Skills: " + (cv.skills||[]).filter(s=>s).slice(0,10).join(", ");

      // Conversation history pour le contexte (transformee en transcription)
      // On garde les 10 derniers echanges pour eviter context overflow.
      const recentHistory = (nextMessages || [])
        .slice(-12)
        .slice(0, -1)  // exclut le message qu'on vient d'ajouter
        .map(m => (m.role === "user" ? "USER" : "COACH") + ": " + m.content)
        .join("\n");

      const langLine = locale === "en"
        ? "Reply STRICTLY in English. "
        : "Reply STRICTLY in French. ";

      const p = "You are a senior career coach with 20 years of experience helping job seekers"
        + " refine their CV through conversation. Your tone is warm, direct, expert, never pushy."
        + "\n\nCONTEXT - Candidate's CV:\n" + cvCtx
        + (recentHistory ? "\n\nCONVERSATION HISTORY:\n" + recentHistory : "")
        + "\n\nLATEST USER MESSAGE: " + userText.trim()
        + "\n\nINSTRUCTIONS:"
        + "\n- Reply in 2 to 4 sentences. Be conversational, NOT a wall of text."
        + "\n- Ask precise follow-up questions to extract concrete details (numbers, scope, impact)."
        + "\n- When you have enough info, propose a CONCRETE rewrite the user can adopt directly."
        + "\n- Adoption rewrites must be clean text (no markdown, no quotes around them)."
        + "\n- " + NO_DASH + " " + langLine + "Output JSON ONLY, no markdown, no backticks."
        + "\n\nRESPONSE FORMAT (JSON):"
        + '\n{"reply":"your conversational reply","adopt":{"kind":"summary"|"title"|"bullet","value":"the rewritten text"}}'
        + '\nIf you don\'t have a concrete rewrite to propose yet, omit "adopt" entirely:'
        + '\n{"reply":"your reply asking for more details"}';

      const txt = await aiCall(p);
      const parsed = parseJSON(txt);
      const reply = (parsed && parsed.reply) ? String(parsed.reply) : txt;
      const adopt = (parsed && parsed.adopt && parsed.adopt.kind && parsed.adopt.value)
        ? { kind: String(parsed.adopt.kind), value: String(parsed.adopt.value) }
        : null;

      const aiMsg = {
        role:"assistant",
        content: reply,
        ts: Date.now(),
        ...(adopt ? { adopt } : {}),
      };
      setCoachMessages(prev => {
        const next = [...prev, aiMsg].slice(-50);
        lsS(SK.CO, next);
        return next;
      });
    } catch (err) {
      const errMsg = {
        role:"assistant",
        content: T.ea + (err && err.message ? ": " + err.message : ""),
        ts: Date.now(),
      };
      setCoachMessages(prev => {
        const next = [...prev, errMsg].slice(-50);
        lsS(SK.CO, next);
        return next;
      });
    }
    setCoachLoading(false);
  }, [apiKey, cv, cvIsEmpty, locale, notify, T]);

  // Efface toute la conversation coach.
  const clearCoach = useCallback(() => {
    if (!confirm(T.co_clear_confirm)) return;
    setCoachMessages([]);
    lsS(SK.CO, []);
  }, [T]);

  // Adopte une suggestion proposee par le coach dans le CV.
  const adoptCoachSuggestion = useCallback((kind, value) => {
    if (!value || !value.trim()) return;
    pushH(cv);
    if (kind === "summary") {
      setCVFn(p => ({...p, summary: value.trim()}));
    } else if (kind === "title") {
      setCVFn(p => ({...p, title: value.trim()}));
    } else if (kind === "bullet") {
      // Ajoute en bullet a la 1ere experience, ou cree une nouvelle exp si aucune
      setCVFn(p => {
        if (!p.experience || p.experience.length === 0) {
          return {...p, experience:[{
            id:Date.now(), title:"", company:"", period:"", location:"",
            bullets:[value.trim()],
          }]};
        }
        const exps = [...p.experience];
        exps[0] = {...exps[0], bullets:[...(exps[0].bullets||[]), value.trim()]};
        return {...p, experience: exps};
      });
    }
    notify(T.co_adopted);
  }, [cv, pushH, setCVFn, notify, T]);

  // v17 chantier 8 : Export LinkedIn.
  // Genere headline + about + experiences au format LinkedIn (informel, 1ere personne).
  const runLinkedIn = useCallback(async () => {
    if (!apiKey) { notify(T.nk); return; }
    if (cvIsEmpty) { notify(T.li_no_cv); return; }
    setLinkedInLoading(true);
    setLinkedInResult(null);
    try {
      const expT = (cv.experience || []).slice(0, 8).map(e =>
        (e.title||"") + " chez " + (e.company||"")
        + " (" + (e.period||"") + "): "
        + (e.bullets||[]).filter(b=>b).join("; ")
      ).join(" | ");
      const cvT = "Nom: " + (cv.name||"")
        + "\nTitre actuel: " + (cv.title||"")
        + "\nLocalisation: " + (cv.location||"")
        + "\nAccroche CV: " + (cv.summary||"")
        + "\nExperiences: " + expT
        + "\nCompetences: " + (cv.skills||[]).filter(s=>s).join(", ");

      const langLine = locale === "en"
        ? "Output in English. " : "Output in French. ";

      const p = "Tu es expert LinkedIn. Reformate le CV ci-dessous au format LinkedIn officiel."
        + "\n\nCV SOURCE:\n" + cvT
        + "\n\nFORMAT LINKEDIN (regles strictes):"
        + "\n- HEADLINE (titre du profil, max 220 caracteres) : 3-5 elements separes par |."
        + "  Ex: 'Senior PM | B2B SaaS | Building data products | ex-Google'"
        + "\n- ABOUT (4-6 paragraphes, 1ere personne, ton informel mais pro) :"
        + "  Para 1 = hook accrocheur ('I help X do Y by Z')."
        + "  Para 2 = parcours en 2-3 phrases."
        + "  Para 3 = ce qui te distingue."
        + "  Para 4 = call-to-action (DM, collaboration, etc.)."
        + "\n- EXPERIENCES : pour chaque exp, reformate role + company + une description"
        + "  3-5 lignes en bullets format LinkedIn (commence par verbe d'action, KPIs chiffres)."
        + "\n\nREGLES STRICTES:"
        + "\n- Premiere personne (I, my, j'ai, mon)."
        + "\n- Ton informel mais credible."
        + "\n- Mots-cles ATS pertinents."
        + "\n- " + NO_DASH + " " + langLine + "JSON UNIQUEMENT, sans markdown, sans backticks."
        + "\n\nFORMAT JSON STRICT:"
        + '\n{"headline":"...","about":"para1\\n\\npara2\\n\\npara3\\n\\npara4",'
        + '"experiences":[{"role":"...","company":"...","description":"bullet 1\\n\\nbullet 2\\n\\nbullet 3"}]}';

      const txt = await aiCall(p);
      const parsed = parseJSON(txt);
      setLinkedInResult(parsed);
    } catch (err) {
      notify(T.ea + (err && err.message ? ": " + err.message : ""));
    }
    setLinkedInLoading(false);
  }, [apiKey, cv, cvIsEmpty, locale, notify, T]);

  // v17 chantier 9 : CV Compare.
  // Compare 2 versions du CV (selectionnees par leur id dans la liste 'versions')
  // et demande a l'IA de produire un resume + diffs + verdict + winner.
  const runCompare = useCallback(async () => {
    if (!apiKey) { notify(T.nk); return; }
    if (!comparePickA || !comparePickB || comparePickA === comparePickB) return;

    const va = (versions || []).find(v => v.id === comparePickA);
    const vb = (versions || []).find(v => v.id === comparePickB);
    if (!va || !vb) return;

    setCompareLoading(true);
    setCompareResult(null);
    try {
      const fmt = (cv) => {
        const expT = (cv.experience || []).slice(0, 6).map(e =>
          (e.title||"") + " chez " + (e.company||"")
          + " (" + (e.period||"") + "): "
          + (e.bullets||[]).filter(b=>b).join("; ")
        ).join(" | ");
        return "Titre: " + (cv.title||"")
          + " | Accroche: " + (cv.summary||"").slice(0,300)
          + " | Exp: " + expT
          + " | Skills: " + (cv.skills||[]).filter(s=>s).slice(0,15).join(", ");
      };

      const langLine = locale === "en"
        ? "Reply in English. " : "Reply in French. ";

      const p = "Tu es expert en CV. Compare ces 2 versions et identifie ce qui les distingue."
        + "\n\nVERSION A (\"" + (va.name || "A") + "\"):\n" + fmt(va.cv)
        + "\n\nVERSION B (\"" + (vb.name || "B") + "\"):\n" + fmt(vb.cv)
        + "\n\nMISSION:"
        + "\n1. Resume general des differences (1-2 phrases)."
        + "\n2. Liste les changements concrets (champ + type=changed/added/removed + ancien/nouveau si applicable)."
        + "\n3. Verdict d'expert : qui est meilleur et pourquoi (1-2 phrases incisives)."
        + "\n4. Winner : 'A', 'B', ou 'tie' selon ton analyse."
        + "\n\nREGLES:"
        + "\n- Sois honnete et tranchant."
        + "\n- Liste max 8 changements importants (skip les details mineurs)."
        + "\n- Ignore les espaces, ponctuation, ordre identique."
        + "\n- " + NO_DASH + " " + langLine + "JSON UNIQUEMENT, sans markdown, sans backticks."
        + "\n\nFORMAT JSON STRICT:"
        + '\n{"summary":"...","diffs":[{"field":"summary","type":"changed","old":"...","new":"..."}],'
        + '"verdict":"...","winner":"A"|"B"|"tie"}';

      const txt = await aiCall(p);
      const parsed = parseJSON(txt);
      setCompareResult(parsed);
    } catch (err) {
      notify(T.ea + (err && err.message ? ": " + err.message : ""));
    }
    setCompareLoading(false);
  }, [apiKey, comparePickA, comparePickB, versions, locale, notify, T]);

  // v17 chantier 10 : Applications Tracker. CRUD local en localStorage.
  const addApplication = useCallback((app) => {
    setApplications(prev => {
      const next = [...prev, app];
      lsS(SK.AP, next);
      return next;
    });
  }, []);
  const updateApplication = useCallback((app) => {
    setApplications(prev => {
      const next = prev.map(a => a.id === app.id ? app : a);
      lsS(SK.AP, next);
      return next;
    });
  }, []);
  const deleteApplication = useCallback((id) => {
    setApplications(prev => {
      const next = prev.filter(a => a.id !== id);
      lsS(SK.AP, next);
      return next;
    });
  }, []);

  // v17 chantier 11 : Multi-CV strategie.
  // Compare l'offre a TOUTES les versions sauvegardees et recommande la meilleure.
  const runMultiCV = useCallback(async () => {
    if (!apiKey) { notify(T.nk); return; }
    if (!multiCVOffer || !multiCVOffer.trim()) return;
    if (!versions || versions.length < 2) return;

    setMultiCVLoading(true);
    setMultiCVResult(null);
    try {
      const fmt = (cv) => {
        const expT = (cv.experience || []).slice(0, 5).map(e =>
          (e.title||"") + " (" + (e.company||"") + "): "
          + (e.bullets||[]).filter(b=>b).slice(0,2).join("; ")
        ).join(" | ");
        return "Titre: " + (cv.title||"")
          + " | Accroche: " + (cv.summary||"").slice(0,180)
          + " | Exp: " + expT
          + " | Skills: " + (cv.skills||[]).filter(s=>s).slice(0,12).join(", ");
      };

      const versionsBlock = versions.map(v =>
        "VERSION " + v.id + " (\"" + (v.name||"?") + "\"):\n" + fmt(v.cv)
      ).join("\n\n");

      const idsList = versions.map(v => v.id).join(", ");

      const langLine = locale === "en"
        ? "Reply in English. " : "Reply in French. ";

      const p = "Tu es expert en CV. Voici une offre d'emploi et "
        + versions.length + " versions de CV sauvegardees du candidat."
        + " Recommande la version la plus pertinente et explique pourquoi."
        + "\n\nOFFRE D'EMPLOI:\n" + multiCVOffer.trim()
        + "\n\n" + versionsBlock
        + "\n\nMISSION:"
        + "\n1. Analyse le fit de chaque version contre l'offre."
        + "\n2. Recommande la MEILLEURE version (recommended_id = ID exact d'une des versions)."
        + "\n3. Score de match 0-100 pour la recommandee."
        + "\n4. Explique en 2-3 phrases POURQUOI cette version est la meilleure."
        + "\n5. Pour les autres versions, donne un score 0-100 et un commentaire court."
        + "\n\nIMPORTANT: recommended_id et alternatives[].id doivent etre des nombres valides "
        + "presents dans cette liste : [" + idsList + "]"
        + "\n\nREGLES:"
        + "\n- Sois honnete et tranchant."
        + "\n- " + NO_DASH + " " + langLine + "JSON UNIQUEMENT, sans markdown."
        + "\n\nFORMAT JSON STRICT:"
        + '\n{"recommended_id":12345,"recommended_score":85,'
        + '"why":"explication 2-3 phrases",'
        + '"alternatives":[{"id":67890,"score":62,"comment":"..."}]}';

      const txt = await aiCall(p);
      const parsed = parseJSON(txt);
      // Coerce ids to numbers (au cas où l'IA les retourne en string)
      if (parsed) {
        if (parsed.recommended_id) parsed.recommended_id = Number(parsed.recommended_id);
        if (Array.isArray(parsed.alternatives)) {
          parsed.alternatives = parsed.alternatives.map(a => ({
            ...a, id: Number(a.id), score: Number(a.score) || 0,
          }));
        }
      }
      setMultiCVResult(parsed);
    } catch (err) {
      notify(T.ea + (err && err.message ? ": " + err.message : ""));
    }
    setMultiCVLoading(false);
  }, [apiKey, multiCVOffer, versions, locale, notify, T]);

  // Pre-rempli le champ offre depuis offerResult de Cibler si dispo.
  useEffect(() => {
    if (showMultiCV && offerResult && offerResult.offer_text && !multiCVOffer) {
      setMultiCVOffer(offerResult.offer_text);
    }
  }, [showMultiCV, offerResult, multiCVOffer]);

  // v17 : Bullet/Summary Transformer unifie.
  // kind = "bullet" : pour les bullets d'experience (ex.bullets[idx]).
  //   On passe { expId, bulletIdx, text }.
  // kind = "summary" : pour l'accroche (cv.summary).
  //   On passe { text } (pas d'expId/bulletIdx).
  const runTextTransform = useCallback(async (kind, payload) => {
    if (!apiKey) { notify(T.nk); return; }
    const text = payload && payload.text;
    if (!text || !text.trim()) {
      notify(kind === "summary"
        ? (T.bts_empty || "Ecris d'abord une accroche a transformer")
        : (T.bt_empty || "Ecris d'abord un bullet a transformer"));
      return;
    }
    setBt({
      kind,
      expId: payload.expId, bulletIdx: payload.bulletIdx,
      original: text, levels: null, loading: true,
    });
    try {
      let p;
      if (kind === "summary") {
        // Prompt summary : 2-3 phrases, registres adaptes (Sobre + Storytelling
        // remplacent Simple + Impact pour mieux coller a une accroche).
        p = "Tu es expert CV. On te donne UNE accroche (resume professionnel d'un CV). "
          + "Tu dois generer 5 reformulations distinctes, chacune dans un registre different, "
          + "en gardant la langue d'origine.\n\n"
          + "ACCROCHE ORIGINALE:\n" + text + "\n\n"
          + "REGISTRES (5 angles):\n"
          + "1. simple: factuel, sobre, sans superlatifs ni adjectifs creux. Decrit le profil tel quel.\n"
          + "2. pro: ton corporate sobre, professionnel, structure verbe d'action.\n"
          + "3. ats: maximise les mots-cles metier pour passer les filtres ATS du secteur. Densifie le vocabulaire technique.\n"
          + "4. premium: registre executive elegant, tournures litteraires nuancees, mots forts (orchestrer, deployer, piloter).\n"
          + "5. impact: storytelling avec un fil rouge narratif. Une 'voix' qui raconte le parcours plutot que de l'enumerer.\n\n"
          + "REGLES STRICTES:\n"
          + "- Ne pas inventer d'experience, d'entreprise, de titre ou de chiffre nouveau. Reste fidele au sens original.\n"
          + "- Format : 2 a 3 phrases par version, entre 30 et 60 mots.\n"
          + "- " + NO_DASH + "\n"
          + "- JSON valide strict uniquement, sans markdown.\n\n"
          + '{\n'
          + '  "simple": "version sobre",\n'
          + '  "pro": "version pro",\n'
          + '  "ats": "version ats",\n'
          + '  "premium": "version premium",\n'
          + '  "impact": "version storytelling"\n'
          + '}';
      } else {
        // Prompt bullet (inchange par rapport a l'existant).
        p = "Tu es expert CV. On te donne UNE phrase de bullet d'experience professionnelle. "
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
      }
      const txt = await aiCall(p);
      const r = parseJSON(txt);
      setBt(s => s ? { ...s, levels: r, loading: false } : null);
    } catch (err) {
      notify((T.bt_err || "Erreur transformation: ") + (err.message || ""));
      setBt(null);
    }
  }, [apiKey, notify, T]);

  // Wrapper compat retro : signature legacy attendue par SheetEx.
  const runBulletTransform = useCallback((expId, bulletIdx, text) => {
    return runTextTransform("bullet", { expId, bulletIdx, text });
  }, [runTextTransform]);

  // Adoption d'une version : dispatch selon kind (bullet ou summary).
  const adoptTextVersion = useCallback((newText) => {
    setBt(curr => {
      if (!curr) return null;
      if (curr.kind === "summary") {
        setCVFn(p => ({ ...p, summary: newText }));
        notify(T.bts_adopted || "Accroche adoptee");
      } else {
        setCVFn(p => ({
          ...p,
          experience: p.experience.map(e =>
            e.id === curr.expId
              ? { ...e, bullets: e.bullets.map((b, i) => i === curr.bulletIdx ? newText : b) }
              : e
          )
        }));
        notify(T.bt_adopted || "Version adoptee");
      }
      return null;
    });
  }, [setCVFn, notify, T]);

  // Alias retro-compat (utilise dans <BulletTransformer onAdopt={...} />).
  const adoptBulletVersion = adoptTextVersion;

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
      {layout==="sidebar" && <CVSidebar cv={cv} set={setCVFn} t={effTheme} T={T}/>}
      {layout==="classic" && <CVSidebar cv={cv} set={setCVFn} t={effTheme} T={T}/>}
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
      onOpenInterview={()=>setShowInterview(true)}
      onOpenMultiCV={()=>setShowMultiCV(true)}
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
      {/* Transformer l'accroche : disponible uniquement si summary non vide */}
      <button
        onClick={()=>{
          if (!cv.summary || !cv.summary.trim()) {
            notify(T.bts_empty || "Ecris d'abord une accroche a transformer");
            return;
          }
          runTextTransform("summary", { text: cv.summary });
        }}
        style={{
          ...B({
            ...finRow,
            opacity: (cv.summary && cv.summary.trim()) ? 1 : 0.55,
          })
        }}
      >
        <span style={finIconWrap(PurpleSoft, Purple)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>
            <circle cx="12" cy="12" r="2.5"/>
          </svg>
        </span>
        <span style={{flex:1}}>{T.bts_btn || "Transformer l'accroche"}</span>
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
      {/* v17 chantier 5 : Lisser le parcours (Gap Repair) */}
      <button
        onClick={()=>{
          if ((cv.experience || []).length < 2) {
            notify(T.gr_no_gaps_title || "Aucun trou detecte");
            return;
          }
          setShowGapRepair(true);
        }}
        style={{
          ...B({
            ...finRow,
            opacity: (cv.experience || []).length >= 2 ? 1 : 0.55,
          })
        }}
      >
        <span style={finIconWrap(CoralSoft, Coral)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h4l3-9 4 18 3-9h4"/>
          </svg>
        </span>
        <span style={{flex:1}}>{T.gr_btn || "Lisser le parcours"}</span>
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
      <button onClick={()=>setShowCompare(true)} disabled={versions.length < 2}
        style={{
          ...B(finRow),
          opacity: versions.length < 2 ? 0.45 : 1,
          cursor: versions.length < 2 ? "not-allowed" : "pointer",
        }}>
        <span style={finIconWrap(PurpleSoft, Purple)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"/>
            <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/>
            <path d="M12 3v18"/>
          </svg>
        </span>
        <span style={{flex:1}}>{T.cmp_btn}</span>
        {finRowChevron}
      </button>
      <button onClick={()=>setShowApplications(true)} style={{...B(finRow)}}>
        <span style={finIconWrap(GreenSoft, Green)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        </span>
        <span style={{flex:1}}>{T.ap_btn}{applications.length > 0 ? ` (${applications.length})` : ""}</span>
        {finRowChevron}
      </button>

      {/* === Apparence === */}
      <div style={finEyebrow}>{T.fin_section_design}</div>

      {/* CTA Personnaliser le CV (couleurs + polices + IA) */}
      <button onClick={()=>setShowCustomize(true)} style={{
        ...B({
          width:"100%", padding:"15px 22px", borderRadius:RadiusPill,
          background:GradPurple, color:"#fff",
          fontFamily:Sans, fontWeight:600, fontSize:14,
          display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
          marginBottom:14,
          transition:"all 200ms ease-out",
          position:"relative",
        })
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
          <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
          <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
          <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
        </svg>
        {T.cust_btn}
        {(cvCustom || versionCustom) && (
          <span style={{
            position:"absolute", top:6, right:14,
            width:8, height:8, background:Gold, borderRadius:"50%",
          }}/>
        )}
      </button>

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
      {/* Bouton Export LinkedIn */}
      <button onClick={()=>setShowLinkedIn(true)} disabled={cvIsEmpty} style={{
        ...B({
          width:"100%", padding:"13px 18px", borderRadius:RadiusMd,
          background: cvIsEmpty ? Gray100 : Paper,
          color: cvIsEmpty ? Gray400 : Ink,
          border:"0.5px solid "+(cvIsEmpty ? Gray200 : Gold),
          boxShadow: cvIsEmpty ? "none" : ShadowSm,
          fontSize:13, fontWeight:600, fontFamily:Sans,
          display:"flex", alignItems:"center", gap:12,
          marginBottom:10, textAlign:"left",
          transition:"all 200ms ease-out",
          opacity: cvIsEmpty ? 0.6 : 1,
        })
      }}>
        <div style={{
          width:32, height:32, borderRadius:9,
          display:"flex", alignItems:"center", justifyContent:"center",
          background:"#0a66c2", color:"#fff", flexShrink:0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 1 1 8.3 6.5a1.78 1.78 0 0 1-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0 0 13 14.19a.66.66 0 0 0 0 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 0 1 2.7-1.4c1.55 0 3.36.86 3.36 3.66z"/>
          </svg>
        </div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{
            fontSize:13, fontWeight:600,
            color: cvIsEmpty ? Gray400 : Ink, marginBottom:2,
          }}>{T.li_btn}</div>
          <div style={{fontSize:11, color:Gray600, lineHeight:1.4}}>
            {T.li_btn_desc}
          </div>
        </div>
      </button>
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
      {modal==="id"  && <SheetId cv={cv} set={setCVFn} onClose={()=>setModal(null)}
        onTransformSummary={(text)=>runTextTransform("summary", { text })}
        T={T}/>}
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
          <ScorePanel
            cv={cv} apiKey={apiKey} notify={notify}
            layout={layout} T={T}
            dashLoading={dashLoading}
            dashResult={dashResult}
            onRunDashboard={runScoreDashboard}
            onCtaAxis={onCtaAxisDispatch}
          />
        </Sheet>
      )}
      {showCustomize && (
        <CustomizeSheet
          T={T} cv={cv} theme={theme}
          cvCustom={cvCustom} setCvCustom={setCvCustom}
          setCvFn={setCVFn}
          apiKey={apiKey} notify={notify} locale={locale}
          onClose={()=>setShowCustomize(false)}
        />
      )}
      {showGapRepair && (
        <GapRepairModal
          T={T} cv={cv}
          loading={false}
          gaps={gapAnalysis.gaps}
          yearStrategy={gapAnalysis.yearStrategy}
          groupOps={gapAnalysis.groupOps}
          unparsableCount={gapAnalysis.unparsableCount}
          onApplyYearOnly={()=>{
            applyYearOnlyFormat();
            setShowGapRepair(false);
          }}
          onApplyExtend={(gapInfo)=>{
            applyExtendDate(gapInfo);
            setShowGapRepair(false);
          }}
          onApplyGroup={(indices)=>{
            applyGroupExperiences(indices);
            setShowGapRepair(false);
          }}
          onClose={()=>setShowGapRepair(false)}
        />
      )}
      {showInterview && (
        <InterviewModal
          T={T} cv={cv} apiKey={apiKey}
          loading={interviewLoading}
          result={interviewResult}
          offerText={interviewOffer}
          setOfferText={setInterviewOffer}
          prefilledOffer={!!(offerResult && offerResult.offer_text && interviewOffer === offerResult.offer_text)}
          onRun={runInterviewPrep}
          onClose={()=>setShowInterview(false)}
        />
      )}
      {showCoach && (
        <CoachModal
          T={T} cv={cv} apiKey={apiKey}
          loading={coachLoading}
          messages={coachMessages}
          onSend={runCoachMessage}
          onClear={clearCoach}
          onAdopt={adoptCoachSuggestion}
          onClose={()=>setShowCoach(false)}
        />
      )}
      {showLinkedIn && (
        <LinkedInExportModal
          T={T} cv={cv} apiKey={apiKey}
          loading={linkedInLoading}
          result={linkedInResult}
          onRun={runLinkedIn}
          onCopy={copyToClipboard}
          onClose={()=>{ if (!linkedInLoading) { setShowLinkedIn(false); setLinkedInResult(null); }}}
        />
      )}
      {showCompare && (
        <CVCompareModal
          T={T} versions={versions} apiKey={apiKey}
          loading={compareLoading}
          result={compareResult}
          pickA={comparePickA} setPickA={setComparePickA}
          pickB={comparePickB} setPickB={setComparePickB}
          onRun={runCompare}
          onClose={()=>{ if (!compareLoading) { setShowCompare(false); setCompareResult(null); }}}
        />
      )}
      {showApplications && (
        <ApplicationsTrackerModal
          T={T} applications={applications}
          onAdd={addApplication}
          onUpdate={updateApplication}
          onDelete={deleteApplication}
          onClose={()=>setShowApplications(false)}
        />
      )}
      {showMultiCV && (
        <MultiCVStrategyModal
          T={T} versions={versions} apiKey={apiKey}
          loading={multiCVLoading}
          result={multiCVResult}
          offerText={multiCVOffer}
          setOfferText={setMultiCVOffer}
          prefilledOffer={!!(offerResult && offerResult.offer_text && multiCVOffer === offerResult.offer_text)}
          onRun={runMultiCV}
          onLoadVersion={(id)=>{
            loadVersion(id);
            setShowMultiCV(false);
            setMultiCVResult(null);
          }}
          onClose={()=>{ if (!multiCVLoading) { setShowMultiCV(false); setMultiCVResult(null); }}}
        />
      )}
      {showAudit && (
        <AuditModal 
          T={T}
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
          T={T}
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
          T={T}
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
          T={T}
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
          T={T}
          versions={versions}
          onSave={saveVersion}
          onLoad={loadVersion}
          onDelete={deleteVersion}
          onClose={()=>setShowVersions(false)}
        />
      )}
      {bt && (
        <BulletTransformer
          kind={bt.kind || "bullet"}
          original={bt.original}
          levels={bt.levels}
          loading={bt.loading}
          onAdopt={adoptTextVersion}
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
        <CoachFAB T={T} onOpen={()=>setShowCoach(true)}
          hidden={
            cvIsEmpty
            || showCoach || showAudit || showTranslate || showPack
            || showPos || showTruth || showVersions || !!bt
            || showOffer || showScore || showGapRepair || showInterview
            || showCustomize || !!modal
            || showLinkedIn || showCompare || showApplications
            || showMultiCV
          }/>
      </div>
    </>
  );
}
