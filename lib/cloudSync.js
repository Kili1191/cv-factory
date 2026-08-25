// Synchronisation du CV entre le navigateur et le compte.
//
// LE PRINCIPE : LE LOCAL D'ABORD
//
// Le navigateur reste la source de verite pour la LECTURE. Ouvrir son CV ne
// declenche jamais d'attente reseau, jamais de roue qui tourne, meme sur un
// train en 4G. Le nuage recoit les modifications en arriere-plan, groupees,
// sans que l'interface en depende.
//
// C'est ce qui separe un produit qu'on garde ouvert d'un produit dont on se
// lasse : la plupart des concurrents chargent depuis leur serveur a chaque
// ecran, et ca se sent.
//
// CE QUE CETTE COUCHE GARANTIT
//
//   - Sans compte, rien ne change. Le comportement est celui d'avant.
//   - A la premiere connexion, les donnees deja presentes dans le navigateur
//     sont ENVOYEES vers le compte. Elles ne sont jamais ecrasees par un
//     compte vide : c'est le scenario qui ferait perdre son CV a quelqu'un.
//   - Sur un autre appareil, la version la plus recente gagne, cle par cle.
//   - Une panne reseau ne perd rien : la file d'attente reste en memoire et
//     repart au prochain changement ou a la prochaine ouverture.

import { getSupabase, isCloudConfigured } from "./supabaseClient.js";

// Les cles qui suivent l'utilisateur d'un appareil a l'autre. La cle de
// tutoriel ou le brouillon d'interface restent locaux : les synchroniser
// n'apporterait rien et ferait du bruit.
export const SYNCED_KEYS = [
  "cvf_d",   // le CV
  "cvf_vs",  // les versions sauvegardees
  "cvf_ap",  // les candidatures suivies
  "cvf_t",   // le theme
  "cvf_l",   // la mise en page
  "cvf_c",   // la langue
  "cvf_co",  // la personnalisation
  "cvf_ct",  // le contexte
  "cvf_bk",  // la sauvegarde avant traduction
];

const TABLE = "user_state";
const DEBOUNCE_MS = 1200;

let queue = new Map();
let timer = null;
let listeners = new Set();
let state = { status: "off", user: null, lastSyncAt: null, error: null };

function emit(next) {
  state = { ...state, ...next };
  for (const fn of listeners) {
    try { fn(state); } catch { /* un abonne casse ne doit pas bloquer les autres */ }
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  try { fn(state); } catch { /* idem */ }
  return () => listeners.delete(fn);
}

export function getSyncState() {
  return state;
}

// --- lecture / ecriture locale, sans dependre de page.jsx ------------------

function readLocal(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

// Horodatage par cle, pour departager deux appareils.
function stampKey(key) { return `${key}__at`; }
function readStamp(key) {
  const n = Number(localStorage.getItem(stampKey(key)));
  return Number.isFinite(n) ? n : 0;
}
function writeStamp(key, at) {
  try { localStorage.setItem(stampKey(key), String(at)); } catch { /* quota */ }
}

// --- envoi ------------------------------------------------------------------

async function flush() {
  timer = null;
  const sb = getSupabase();
  if (!sb || !state.user || queue.size === 0) return;

  const batch = [...queue.entries()];
  queue = new Map();

  const rows = batch.map(([key, { value, at }]) => ({
    user_id: state.user.id,
    key,
    value,
    updated_at: new Date(at).toISOString(),
  }));

  try {
    const { error } = await sb.from(TABLE).upsert(rows, { onConflict: "user_id,key" });
    if (error) throw error;
    emit({ lastSyncAt: Date.now(), error: null });
  } catch (err) {
    // On remet dans la file ce qui n'est pas parti, sans ecraser une valeur
    // plus recente arrivee entre-temps.
    for (const [key, entry] of batch) {
      const pending = queue.get(key);
      if (!pending || pending.at < entry.at) queue.set(key, entry);
    }
    emit({ error: (err && err.message) || "synchronisation impossible" });
  }
}

/**
 * A appeler apres chaque ecriture locale. Ne bloque jamais l'appelant.
 */
export function queuePush(key, value) {
  if (!SYNCED_KEYS.includes(key)) return;
  const at = Date.now();
  writeStamp(key, at);
  if (!state.user) return;
  queue.set(key, { value, at });
  if (timer) clearTimeout(timer);
  timer = setTimeout(flush, DEBOUNCE_MS);
}

// --- reception --------------------------------------------------------------

// LA REGLE DE FUSION, ECRITE UNE SEULE FOIS
//
// Cette fonction est volontairement pure : pas de localStorage, pas de reseau,
// pas d'horloge. C'est la seule facon d'en faire quelque chose qu'un test peut
// interroger DIRECTEMENT, plutot que d'en recopier la logique a cote.
//
// La distinction compte : un test qui recopie la regle reste vert quand la
// regle change. Il rassure sans rien garantir - et ici ce qui est en jeu,
// c'est le CV de quelqu'un.
//
// Trois cas, dans cet ordre :
//
//   1. Le compte ne connait pas cette cle. Le navigateur gagne et sera
//      envoye. C'est la toute premiere connexion : sans cette ligne, creer un
//      compte effacerait le CV construit avant de l'avoir.
//   2. Le compte est plus recent. On reprend sa valeur localement.
//   3. Sinon le navigateur est plus recent (ou a egalite) : on l'envoie, et
//      en cas d'egalite on ne fait rien du tout.
export function decideKey(localValue, localAt, remoteRow) {
  if (!remoteRow) {
    return { push: localValue !== null, write: false };
  }
  const remoteAt = Date.parse(remoteRow.updated_at) || 0;
  if (remoteAt > localAt) {
    return { push: false, write: true, value: remoteRow.value, at: remoteAt };
  }
  return { push: localAt > remoteAt && localValue !== null, write: false };
}

/**
 * Rapproche le compte et le navigateur. Rend la liste des cles modifiees
 * localement, pour que l'interface puisse se recharger.
 */
export async function pullAndMerge() {
  const sb = getSupabase();
  if (!sb || !state.user) return [];

  let rows = [];
  try {
    const { data, error } = await sb
      .from(TABLE).select("key,value,updated_at")
      .eq("user_id", state.user.id);
    if (error) throw error;
    rows = data || [];
  } catch (err) {
    emit({ error: (err && err.message) || "lecture du compte impossible" });
    return [];
  }

  const remote = new Map(rows.map(r => [r.key, r]));
  const changed = [];

  for (const key of SYNCED_KEYS) {
    const localValue = readLocal(key);
    const decision = decideKey(localValue, readStamp(key), remote.get(key));

    if (decision.push) { queuePush(key, localValue); continue; }
    if (decision.write) {
      if (writeLocal(key, decision.value)) {
        writeStamp(key, decision.at);
        changed.push(key);
      }
    }
  }

  if (queue.size > 0) await flush();
  emit({ lastSyncAt: Date.now() });
  return changed;
}

// --- session ----------------------------------------------------------------

export function initCloud(onRemoteChange) {
  if (!isCloudConfigured()) { emit({ status: "off" }); return () => {}; }
  const sb = getSupabase();
  if (!sb) { emit({ status: "off" }); return () => {}; }

  emit({ status: "loading" });

  const handle = async (session) => {
    const user = session && session.user ? session.user : null;
    if (user) {
      emit({ status: "signed-in", user, error: null });
      const changed = await pullAndMerge();
      if (changed.length && typeof onRemoteChange === "function") onRemoteChange(changed);
    } else {
      emit({ status: "signed-out", user: null });
    }
  };

  sb.auth.getSession()
    .then(({ data }) => handle(data && data.session))
    .catch(() => emit({ status: "signed-out" }));

  const { data: sub } = sb.auth.onAuthStateChange((_event, session) => { handle(session); });
  return () => { try { sub.subscription.unsubscribe(); } catch { /* deja parti */ } };
}

export async function signInWithEmail(email) {
  const sb = getSupabase();
  if (!sb) throw new Error("Comptes non configures");
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signInWithGoogle() {
  const sb = getSupabase();
  if (!sb) throw new Error("Comptes non configures");
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut() {
  const sb = getSupabase();
  if (!sb) return;
  // On ne vide PAS le stockage local : l'utilisateur retrouve son CV comme
  // avant d'avoir un compte, et ne se retrouve pas devant un ecran vide.
  await sb.auth.signOut();
  emit({ status: "signed-out", user: null });
}

// --- Gmail ------------------------------------------------------------------
//
// LIRE LES REPONSES DES RECRUTEURS
//
// L'autorisation Gmail se demande PAR-DESSUS le compte, jamais pendant
// l'inscription. Reclamer l'acces a la boite mail au moment ou quelqu'un
// decouvre l'application est le meilleur moyen de le voir fermer l'onglet -
// et c'est legitime : a cet instant il n'a aucune raison de faire confiance.
// Le geste se propose plus tard, depuis le suivi, quand il a des
// candidatures a suivre et que la contrepartie est evidente.
//
// CE QUE GOOGLE NOUS DONNE, ET COMBIEN DE TEMPS
//
// Le jeton d'acces vit une heure. Supabase ne le renouvelle pas : passe ce
// delai, il faut repasser par Google. En pratique le consentement est deja
// donne, donc le passage est immediat et silencieux - mais il faut le
// declencher, et l'interface doit le dire plutot que d'afficher une erreur.
//
// Le jeton ne quitte jamais l'appareil : c'est le navigateur qui interroge
// Gmail (voir lib/gmailClient.js).

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export async function connectGmail() {
  const sb = getSupabase();
  if (!sb) throw new Error("Comptes non configures");
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      // Le parametre sert de signal au retour : l'application sait qu'elle
      // doit rouvrir le suivi et lancer le balayage, plutot que de rendre la
      // main sur l'accueil comme apres une connexion ordinaire.
      redirectTo: window.location.origin + "?gmail=1",
      scopes: GMAIL_SCOPE,
      queryParams: {
        access_type: "offline",
        // Sans "consent", Google rejoue une autorisation deja accordee sans
        // rendre de jeton de renouvellement, et le deuxieme balayage echoue
        // sans que rien n'explique pourquoi.
        prompt: "consent",
      },
    },
  });
  if (error) throw error;
}

// Rend le jeton Google de la session, ou null. Null ne veut pas dire "refus" :
// il veut dire "il faut redemander", et c'est ce que l'appelant doit proposer.
export async function getGmailToken() {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    const session = data && data.session;
    return (session && session.provider_token) || null;
  } catch {
    return null;
  }
}
