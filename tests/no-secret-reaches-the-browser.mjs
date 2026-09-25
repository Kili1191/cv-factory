// LE DEPOT EST PUBLIC, ET UNE CLE PARTIE NE REVIENT PAS
//
// Nuvi a deux cles Supabase. L'anonyme est faite pour le navigateur : les
// regles RLS la tiennent, elle ne peut lire que ce que la personne a le
// droit de lire. La cle service passe AU-DESSUS de RLS : elle lit et ecrit
// la table de tout le monde, et c'est elle qui fait exister un abonnement
// quand Stripe le dit. Le jour ou quelqu'un la pose dans Vercel avec le
// prefixe NEXT_PUBLIC_, Next l'inscrit en clair dans le bundle servi a
// chaque visiteur, et l'erreur ne se repare pas : elle se revoque.
//
// CE QUI EXISTAIT AVANT CE FICHIER
//
// La page /diagnostic previent, en toutes lettres, que la cle service ne
// doit jamais porter ce prefixe, et une suite verifie qu'elle previent.
// Prevenir n'est pas empecher : rien ne regardait ce qui part vraiment au
// navigateur. C'est le seul defaut connu du depot dont le cout ne retombe
// pas sur un document mais sur le compte.
//
// COMMENT ON RECONNAIT LA MAUVAISE CLE
//
// Pas par le nom de la variable : le nom est justement ce que la faute
// change. Les deux cles Supabase sont des JWT, et leur charge utile porte
// "role": "anon" ou "role": "service_role". On decode donc chaque JWT
// trouve dans le bundle et on lit le role. L'anonyme passe, la cle service
// echoue, quel que soit le nom qui l'a amenee jusque-la.

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

// Les mots qui n'ont rien a faire derriere NEXT_PUBLIC_. "KEY" n'en est pas
// un : NEXT_PUBLIC_SUPABASE_ANON_KEY et PUBLISHABLE_KEY sont legitimes, et
// une regle qui crie au loup sur elles serait desactivee en une semaine.
const MOTS_INTERDITS = /(SERVICE_ROLE|SERVICE|SECRET|PRIVATE|PASSWORD|ANTHROPIC)/;
const PREFIXE = /NEXT_PUBLIC_[A-Z0-9_]+/g;

// Les formes qui ne sont jamais publiques, quelle que soit leur provenance.
// Stripe nomme ses cles secretes sk_ et rk_, et signe ses webhooks avec
// whsec_ ; Anthropic prefixe sk-ant-.
const FORMES = [
  [/\bsk_(live|test)_[A-Za-z0-9]{10,}/, "une cle secrete Stripe (sk_)"],
  [/\brk_(live|test)_[A-Za-z0-9]{10,}/, "une cle restreinte Stripe (rk_)"],
  [/\bwhsec_[A-Za-z0-9]{10,}/, "un secret de webhook Stripe (whsec_)"],
  [/\bsk-ant-[A-Za-z0-9_-]{10,}/, "une cle Anthropic (sk-ant-)"],
];

// La signature doit faire au moins huit caracteres, comme toute vraie
// signature. Ce detail a failli couter la preuve : la premiere fuite
// plantee dans le bundle pour verifier que ce controle devient rouge se
// terminait par ".sig", trois caracteres, et n'a rien declenche. Le vert
// qui a suivi ressemblait trait pour trait a un vert legitime.
const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.(eyJ[A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]{8,}/g;

function roleDuJwt(charge) {
  try {
    const json = Buffer.from(charge.replace(/-/g, "+").replace(/_/g, "/"), "base64")
      .toString("utf8");
    const o = JSON.parse(json);
    return typeof o.role === "string" ? o.role : null;
  } catch {
    // Pas un JWT lisible : une suite de caracteres qui y ressemble. On ne
    // sait rien d'elle, donc on ne l'accuse pas.
    return null;
  }
}

// Le coeur, pur, pour qu'on puisse lui montrer une fuite fabriquee et
// verifier qu'il la voit. Un detecteur de secret qu'on n'a jamais vu rouge
// est un detecteur dont on ne sait rien.
export function fuiteDansLeTexte(texte) {
  const trouve = [];
  for (const [rx, quoi] of FORMES) {
    const m = texte.match(rx);
    if (m) trouve.push(`${quoi}, en clair`);
  }
  let m;
  JWT.lastIndex = 0;
  while ((m = JWT.exec(texte)) !== null) {
    const role = roleDuJwt(m[1]);
    if (role && role !== "anon" && role !== "authenticated") {
      trouve.push(`un JWT Supabase dont le role est "${role}" et non "anon"`);
    }
  }
  return trouve;
}

function parcourir(dir, filtre, out = []) {
  let entrees = [];
  try { entrees = readdirSync(dir); } catch { return out; }
  for (const e of entrees) {
    const p = join(dir, e);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) parcourir(p, filtre, out);
    else if (filtre.test(e)) out.push(p);
  }
  return out;
}

export async function run() {
  const failures = [];

  // 1. LE DETECTEUR SAIT-IL ENCORE VOIR
  //
  // Une cle service fabriquee ici meme, jamais ecrite dans un fichier : si
  // ce controle ne la trouve pas, tout le reste de la suite est un vert qui
  // ne veut rien dire, et c'est exactement ainsi qu'un test meurt sans
  // qu'on s'en apercoive.
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const factice = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ role: "service_role", iss: "supabase" })}.signature-de-test`;
  if (!fuiteDansLeTexte(factice).length) {
    failures.push(
      "le detecteur ne reconnait plus une cle service fabriquee pour l'occasion.\n" +
      "      Tant que ce point est rouge, le vert du reste de cette suite ne prouve rien."
    );
  }
  const anon = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ role: "anon", iss: "supabase" })}.signature-de-test`;
  if (fuiteDansLeTexte(anon).length) {
    failures.push(
      "le detecteur accuse la cle anonyme, qui est faite pour le navigateur.\n" +
      "      Une suite qui crie au loup sur la cle normale sera desactivee, et la vraie fuite passera."
    );
  }

  // 2. LA SOURCE : AUCUN NOM DANGEREUX DERRIERE NEXT_PUBLIC_
  let fichiers = [];
  for (const d of ["app", "lib", "extension"]) fichiers = fichiers.concat(parcourir(join(ROOT, d), /\.(js|jsx|mjs|ts|tsx)$/));
  if (existsSync(join(ROOT, "middleware.js"))) fichiers.push(join(ROOT, "middleware.js"));
  for (const f of fichiers) {
    const src = readFileSync(f, "utf8");
    src.split("\n").forEach((ligne, i) => {
      const noms = ligne.match(PREFIXE) || [];
      for (const nom of noms) {
        if (MOTS_INTERDITS.test(nom)) {
          failures.push(
            `${relative(ROOT, f)}:${i + 1} lit ${nom}.\n` +
            "      Next inscrit en clair dans le bundle tout ce qui porte ce prefixe.\n" +
            "      Le secret se lit cote serveur, sans prefixe, comme lib/facturation.js le fait."
          );
        }
      }
    });
  }

  // 3. CE QUI PART VRAIMENT : LE BUNDLE SERVI AU NAVIGATEUR
  //
  // .next/static n'existe qu'apres un build. Avec SKIP_BUILD=1 sur une
  // machine de developpement, ce controle ne peut pas tourner : il le DIT,
  // au lieu d'etre saute en silence, parce qu'un controle de secret qu'on
  // croit actif est pire que pas de controle du tout. Sur la CI, ou le
  // build precede toujours la suite, son absence est un echec.
  const statique = join(ROOT, ".next", "static");
  if (!existsSync(statique)) {
    if (process.env.CI) {
      failures.push(
        ".next/static est absent alors que la CI construit avant de tester.\n" +
        "      Le seul controle qui regarde ce qui part vraiment au navigateur n'a pas tourne."
      );
    } else {
      console.log("      NON EXECUTE : pas de .next/static (SKIP_BUILD). Le bundle n'a pas ete relu.");
    }
  } else {
    const bundles = parcourir(statique, /\.(js|json|txt|map)$/);
    let lus = 0;
    for (const f of bundles) {
      let src = "";
      try { src = readFileSync(f, "utf8"); } catch { continue; }
      lus += 1;
      for (const quoi of fuiteDansLeTexte(src)) {
        failures.push(
          `${relative(ROOT, f)} contient ${quoi}.\n` +
          "      Ce fichier est servi a chaque visiteur. La cle est a considerer comme publique :\n" +
          "      la revoquer d'abord, corriger le nom de la variable ensuite."
        );
      }
    }

    // Les valeurs reellement presentes a la construction, quel que soit le
    // nom qui les porte. Vide en local, rempli sur la machine qui deploie.
    const SERVEUR = ["SUPABASE_SERVICE_ROLE_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "ANTHROPIC_API_KEY"];
    const valeurs = SERVEUR.map((n) => [n, process.env[n] || ""]).filter(([, v]) => v.length >= 12);
    if (valeurs.length) {
      for (const f of bundles) {
        let src = "";
        try { src = readFileSync(f, "utf8"); } catch { continue; }
        for (const [nom, valeur] of valeurs) {
          if (src.includes(valeur)) {
            failures.push(
              `${relative(ROOT, f)} contient la valeur de ${nom}.\n` +
              "      Elle est partie au navigateur. La revoquer avant toute autre chose."
            );
          }
        }
      }
    }
    if (!failures.length) {
      console.log(`      ${lus} fichiers du bundle relus, aucun secret ; ${valeurs.length} valeur(s) serveur comparee(s)`);
    }
  }

  return failures;
}

// Comme no-em-dash et no-runtime-cdn, ce fichier se lance a la main pendant
// qu'on deplace une variable d'environnement. Il doit donc vraiment tourner
// quand on l'appelle directement, sans quoi son silence passe pour un vert.
if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((f) => {
    for (const l of f) console.log("ECHEC " + l);
    process.exit(f.length ? 1 : 0);
  });
}
