// L'ACCES A GMAIL, DEPUIS LE NAVIGATEUR
//
// POURQUOI IL N'Y A PAS DE ROUTE SERVEUR ICI
//
// Le chemin habituel serait : le navigateur envoie le jeton a notre serveur,
// notre serveur interroge Google, notre serveur renvoie les messages. Ce
// chemin marche, et il a un defaut qu'aucune promesse ne repare : le jeton
// d'acces a la boite mail, et les messages eux-memes, passent par une machine
// qui nous appartient.
//
// L'API Gmail accepte les requetes depuis un navigateur. On s'en sert. Le
// jeton va du navigateur a Google et nulle part ailleurs, les messages ne
// quittent jamais l'appareil, et il n'existe aucun journal serveur ou ils
// pourraient echouer. Ce n'est pas une precaution de principe : c'est ce qui
// permet de repondre "nous ne pouvons pas les lire" plutot que "nous ne les
// lisons pas".
//
// CE QUI EST DEMANDE A GOOGLE
//
// gmail.readonly, et la requete est construite a partir des seules
// entreprises que l'utilisateur suit (voir buildQuery). Les messages sont
// demandes au format "metadata" avec trois en-tetes : expediteur, objet,
// date. Le corps complet n'est jamais telecharge - Gmail joint un extrait
// d'une centaine de caracteres, qui suffit a classer.

import { buildQuery } from "./gmailScan.js";

const API = "https://gmail.googleapis.com/gmail/v1/users/me";

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

// Six requetes en parallele. Gmail tolere beaucoup plus, mais au-dela le
// telephone passe son temps a ouvrir des connexions plutot qu'a afficher le
// resultat, et un quota depasse renvoie des 429 qu'il faudrait rejouer.
const CONCURRENCY = 6;

class GmailError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "GmailError";
    this.status = status;
  }
}
export { GmailError };

async function call(path, token) {
  const res = await fetch(API + path, {
    headers: { Authorization: "Bearer " + token },
  });
  if (res.status === 401 || res.status === 403) {
    // Le jeton d'acces Google vit une heure. Expire, il ne se distingue pas
    // d'une autorisation retiree : dans les deux cas il faut redemander le
    // consentement, et c'est ce que l'appelant doit proposer.
    throw new GmailError("autorisation expiree", res.status);
  }
  if (!res.ok) {
    throw new GmailError("Gmail a repondu " + res.status, res.status);
  }
  return res.json();
}

function header(payload, name) {
  const list = (payload && payload.headers) || [];
  const found = list.find(h => String(h.name).toLowerCase() === name);
  return found ? found.value : "";
}

// Telecharge les messages qui peuvent concerner les candidatures suivies.
//
// Rend un tableau vide - sans contacter Google - quand il n'y a rien a
// chercher. Une requete sans filtre rapporterait la boite entiere, ce que
// cette fonction ne doit jamais pouvoir faire, meme par accident.
export async function fetchCandidateMessages(token, applications, {
  days = 120, maxResults = 60, signal,
} = {}) {
  const q = buildQuery(applications, { days });
  if (!q) return [];
  if (!token) throw new GmailError("aucune autorisation", 401);

  const list = await call(
    `/messages?q=${encodeURIComponent(q)}&maxResults=${Math.min(100, maxResults)}`,
    token
  );
  const ids = Array.isArray(list.messages) ? list.messages.map(m => m.id) : [];
  if (!ids.length) return [];

  const out = [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < ids.length) {
      if (signal && signal.aborted) return;
      const id = ids[cursor++];
      try {
        const m = await call(
          `/messages/${id}?format=metadata`
          + "&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date",
          token
        );
        out.push({
          id: m.id,
          threadId: m.threadId,
          from: header(m.payload, "from"),
          subject: header(m.payload, "subject"),
          date: header(m.payload, "date")
            || (m.internalDate ? new Date(Number(m.internalDate)).toISOString() : ""),
          snippet: decodeEntities(m.snippet || ""),
        });
      } catch (err) {
        // Un message illisible - supprime entre la liste et la lecture, ou
        // refuse - ne doit pas faire echouer le balayage entier. Une
        // autorisation perdue, si : elle vaut pour tous les suivants.
        if (err instanceof GmailError && (err.status === 401 || err.status === 403)) throw err;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker)
  );
  return out;
}

// Gmail renvoie l'extrait avec ses entites HTML. Sans ce passage, un objet
// francais s'affiche "Votre candidature n&#39;a pas...", et les expressions
// du classement ne reconnaissent plus l'apostrophe.
export function decodeEntities(s) {
  return String(s)
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    // L'esperluette en dernier : la faire en premier recreerait les entites
    // qu'on vient de defaire.
    .replace(/&amp;/g, "&");
}

// Le lien qui ouvre le message dans Gmail. L'utilisateur doit pouvoir aller
// verifier de ses yeux avant d'accepter un changement d'etat : une
// proposition qu'on ne peut pas contredire n'est pas une proposition.
export function gmailLink(message) {
  const id = message && (message.threadId || message.id);
  return id ? `https://mail.google.com/mail/u/0/#all/${id}` : null;
}
