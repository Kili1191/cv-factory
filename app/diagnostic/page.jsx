"use client";

// LA PAGE QUI DIT CE QUI MANQUE
//
// Brancher les comptes demande six champs repartis dans deux tableaux de bord
// differents. En rater un ne produit aucune erreur : le bouton de connexion
// n'apparait pas, ou le lien recu par mail renvoie sur localhost. Rien ne
// s'affiche, rien ne s'explique, et on cherche du cote du code alors que le
// code va bien.
//
// Cette page fait les verifications a la place de celui qui installe, depuis
// le site en ligne, et nomme le champ exact a corriger. Elle n'est reliee a
// aucun bouton : on y va en tapant /diagnostic. C'est voulu - c'est un outil
// d'installation, pas une fonctionnalite.
//
// ELLE NE PEUT RIEN DIVULGUER
//
// Tout ce qu'elle lit est deja public : l'adresse du projet et la cle dite
// publiable voyagent dans chaque requete du navigateur. La cle n'est d'ailleurs
// jamais affichee en entier. Ce qui protege les CV, ce n'est pas le secret de
// ces deux valeurs, ce sont les regles RLS de la base - et cette page verifie
// justement qu'elles repondent.

import { useEffect, useState } from "react";
import { isCloudConfigured } from "../../lib/supabaseClient.js";

const CREAM = "#faf8f3";
const INK = "#1a1a1a";
const MUTED = "#6b6b6b";

// Le domaine de production, ecrit en dur et NON deduit de la page consultee.
// Ouvrir ce diagnostic depuis une preversion Vercel ne doit pas conseiller de
// mettre l'adresse de la preversion en Site URL : c'est la que repartent tous
// les liens de connexion, y compris ceux des vraies personnes.
const SITE_URL = "https://thenuvi.com";

const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const KEY_ENV =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  || "";

// On ne montre que les extremites : assez pour reconnaitre une faute de copie,
// pas assez pour servir a quoi que ce soit dans une capture d'ecran.
function masked(value) {
  if (!value) return "absente";
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)} (${value.length} caracteres)`;
}

function Verdict({ state, title, detail, fix }) {
  // Trois etats seulement, et le troisieme compte autant que les autres :
  // afficher "A CORRIGER" en rouge sur un point qu'on ne peut PAS corriger
  // envoie chercher une panne la ou il n'y en a pas.
  const color =
    state === "ok" ? "#2f7d4f" : state === "ko" ? "#b3261e" : MUTED;
  const mark =
    state === "ok" ? "OK"
    : state === "ko" ? "A CORRIGER"
    : state === "blocked" ? "EN ATTENTE"
    : "…";
  return (
    <li style={{
      listStyle: "none", padding: "16px 0",
      borderBottom: "1px solid rgba(0,0,0,.08)",
    }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
        <span style={{
          color, fontWeight: 700, fontSize: 11, letterSpacing: 1,
          minWidth: 92, flexShrink: 0,
        }}>{mark}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>
          {detail ? (
            <div style={{
              fontSize: 13, color: MUTED, marginTop: 4,
              wordBreak: "break-word",
            }}>{detail}</div>
          ) : null}
          {state === "ko" && fix ? (
            <div style={{
              fontSize: 13, marginTop: 8, padding: "10px 12px",
              background: "rgba(179,38,30,.06)", borderRadius: 8,
              borderLeft: "3px solid #b3261e", lineHeight: 1.5,
            }}>{fix}</div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default function Diagnostic() {
  const [origin, setOrigin] = useState("");
  const [reach, setReach] = useState({ state: "wait" });
  const [table, setTable] = useState({ state: "wait" });

  useEffect(() => { setOrigin(window.location.origin); }, []);

  useEffect(() => {
    if (!URL_ENV || !KEY_ENV) {
      const blocked = { state: "blocked", detail: "en attente des points 1 et 2" };
      setReach(blocked);
      setTable(blocked);
      return;
    }
    let alive = true;

    // 1. Le projet repond-il, et la cle est-elle acceptee ?
    fetch(`${URL_ENV}/auth/v1/settings`, { headers: { apikey: KEY_ENV } })
      .then(async (r) => {
        if (!alive) return;
        if (r.status === 401 || r.status === 403) {
          setReach({
            state: "ko",
            detail: `le projet repond mais refuse la cle (HTTP ${r.status})`,
            fix: "La cle ne correspond pas a ce projet. Reprends-la dans Supabase, "
               + "Project Settings > API keys, colonne publishable / anon.",
          });
          return;
        }
        if (!r.ok) {
          setReach({
            state: "ko",
            detail: `le projet a repondu HTTP ${r.status}`,
            fix: "Un projet gratuit se met en pause apres une periode sans usage. "
               + "Ouvre le tableau de bord Supabase : s'il propose Restore project, clique dessus.",
          });
          return;
        }
        setReach({ state: "ok", detail: "le projet repond et accepte la cle" });
      })
      .catch(() => alive && setReach({
        state: "ko",
        detail: "aucune reponse du projet",
        fix: "Soit l'adresse est fausse, soit le projet est en pause. Ouvre le "
           + "tableau de bord Supabase et verifie qu'il n'affiche pas Restore project.",
      }));

    // 2. La table repond-elle, et les regles RLS sont-elles bien en place ?
    //
    // Sans etre connecte, une table protegee doit rendre une liste VIDE, pas une
    // erreur et surtout pas des lignes. Des lignes ici voudraient dire que
    // n'importe qui peut lire les CV de tout le monde : c'est le seul resultat
    // de cette page qui soit une urgence.
    fetch(`${URL_ENV}/rest/v1/user_state?select=user_id&limit=1`, {
      headers: { apikey: KEY_ENV },
    })
      .then(async (r) => {
        if (!alive) return;
        if (r.status === 404) {
          setTable({
            state: "ko",
            detail: "la table user_state n'existe pas",
            fix: "Supabase > SQL Editor : rejoue le script de creation "
               + "(voir docs/mise-en-service.md).",
          });
          return;
        }
        if (!r.ok) {
          setTable({ state: "ko", detail: `la table a repondu HTTP ${r.status}` });
          return;
        }
        const rows = await r.json().catch(() => null);
        if (Array.isArray(rows) && rows.length > 0) {
          setTable({
            state: "ko",
            detail: "DANGER : la table rend des lignes a un visiteur non connecte",
            fix: "Les regles RLS sont desactivees. En l'etat, n'importe qui peut lire "
               + "les CV de tout le monde. Supabase > SQL Editor : "
               + "alter table user_state enable row level security;",
          });
          return;
        }
        setTable({ state: "ok", detail: "la table repond, et ne livre rien sans compte" });
      })
      .catch(() => alive && setTable({ state: "ko", detail: "table injoignable" }));

    return () => { alive = false; };
  }, []);

  const configured = isCloudConfigured();

  return (
    <main style={{
      minHeight: "100vh", background: CREAM, color: INK,
      fontFamily: "Inter, system-ui, sans-serif",
      padding: "48px 20px 80px",
    }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h1 style={{
          fontFamily: "Fraunces, Georgia, serif",
          fontSize: 30, fontWeight: 600, margin: "0 0 8px",
        }}>Mise en service</h1>
        <p style={{ color: MUTED, fontSize: 14, margin: "0 0 8px", lineHeight: 1.6 }}>
          Cette page verifie, depuis ce site, ce dont les comptes ont besoin pour
          fonctionner. Tout doit etre en OK.
        </p>
        <p style={{ color: MUTED, fontSize: 13, margin: "0 0 28px" }}>
          Page consultee depuis <strong style={{ color: INK }}>{origin || "…"}</strong>
        </p>

        <ul style={{ margin: 0, padding: 0 }}>
          <Verdict
            state={URL_ENV ? "ok" : "ko"}
            title="1. L'adresse du projet est dans la construction"
            detail={URL_ENV || "NEXT_PUBLIC_SUPABASE_URL absente"}
            fix={"Vercel > Settings > Environment Variables : ajoute "
              + "NEXT_PUBLIC_SUPABASE_URL, cochee pour Production, Preview et "
              + "Development. Puis Deployments > Redeploy : ces valeurs sont "
              + "inscrites dans le code au moment de la construction, les ajouter "
              + "ne suffit pas."}
          />
          <Verdict
            state={KEY_ENV ? "ok" : "ko"}
            title="2. La cle publique est dans la construction"
            detail={masked(KEY_ENV)}
            fix={"Meme endroit : NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou "
              + "NEXT_PUBLIC_SUPABASE_ANON_KEY, les deux noms sont acceptes). "
              + "Jamais la cle service_role : elle ignore les regles de securite."}
          />
          <Verdict
            state={reach.state === "wait" ? "wait" : reach.state}
            title="3. Le projet Supabase repond"
            detail={reach.detail}
            fix={reach.fix}
          />
          <Verdict
            state={table.state === "wait" ? "wait" : table.state}
            title="4. La table est creee et protegee"
            detail={table.detail}
            fix={table.fix}
          />
          <Verdict
            state={configured ? "ok" : "ko"}
            title="5. L'application propose les comptes"
            detail={configured
              ? "le bouton de connexion s'affiche dans les reglages"
              : "l'application fonctionne, mais sans comptes"}
            fix="Consequence directe des points 1 et 2 : corrige-les, redeploie, reviens ici."
          />
        </ul>

        {/* Le seul point qu'aucun code ne peut verifier, et donc le plus oublie. */}
        <div style={{
          marginTop: 32, padding: "18px 20px", borderRadius: 12,
          background: "rgba(0,0,0,.035)", fontSize: 13, lineHeight: 1.65,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            6. A verifier a la main : les adresses de retour
          </div>
          <p style={{ margin: "0 0 10px", color: MUTED }}>
            Aucun test ne peut lire ce reglage depuis ici. S'il est faux, le lien
            de connexion recu par mail renvoie sur <code>localhost</code> et ne
            se termine jamais. Supabase &gt; Authentication &gt; URL Configuration :
          </p>
          <div style={{
            fontFamily: "ui-monospace, monospace", fontSize: 12,
            background: "rgba(0,0,0,.05)", padding: "10px 12px", borderRadius: 8,
            whiteSpace: "pre-wrap", wordBreak: "break-all",
          }}>
            {`Site URL       ${SITE_URL}
Redirect URLs  https://thenuvi.com/**
               https://www.thenuvi.com/**
               https://*.vercel.app/**`}
          </div>
        </div>
      </div>
    </main>
  );
}
