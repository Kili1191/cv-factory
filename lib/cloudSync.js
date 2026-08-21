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
    const localAt = readStamp(key);
    const row = remote.get(key);

    if (!row) {
      // Le compte ne connait pas cette cle : si le navigateur a quelque
      // chose, on l'envoie. C'est le cas de la toute premiere connexion, et
      // c'est ce qui evite de perdre un CV construit avant d'avoir un compte.
      if (localValue !== null) queuePush(key, localValue);
      continue;
    }

    const remoteAt = Date.parse(row.updated_at) || 0;
    if (remoteAt > localAt) {
      if (writeLocal(key, row.value)) {
        writeStamp(key, remoteAt);
        changed.push(key);
      }
    } else if (localAt > remoteAt && localValue !== null) {
      queuePush(key, localValue);
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
