// La page de mise en service doit nommer le champ a corriger.
//
// CE QU'ELLE REMPLACE
//
// Brancher les comptes demande six champs repartis dans deux tableaux de bord.
// En rater un ne produit aucune erreur visible : le bouton de connexion
// n'apparait pas, ou le lien recu par mail renvoie sur localhost. La panne la
// plus penible qui soit, parce qu'il n'y a rien a corriger dans le code et
// rien qui l'indique.
//
// CE QUE CE TEST GARANTIT
//
//   1. La page s'affiche sans erreur, meme quand rien n'est configure -
//      c'est justement l'etat dans lequel on vient la consulter.
//   2. Elle nomme la variable d'environnement exacte, pas "la configuration".
//   3. Le Site URL conseille est le domaine de production, JAMAIS l'adresse
//      depuis laquelle on consulte la page. Consulter le diagnostic sur une
//      preversion Vercel et suivre son conseil enverrait tous les liens de
//      connexion - y compris ceux de vraies personnes - vers cette
//      preversion. Ce defaut a existe et c'est le rendu qui l'a montre.

import { startServer, stopServer, launchBrowser, BASE_URL } from "./lib/harness.mjs";

const SITE_URL = "https://thenuvi.com";

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 1200 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message.split("\n")[0].slice(0, 100)));

    await page.goto(`${BASE_URL}/diagnostic`, { waitUntil: "domcontentloaded" });
    // Les deux verifications reseau de la page ont besoin de repondre avant
    // qu'on lise le texte : sans cette attente le test lirait "en attente".
    await page.waitForTimeout(2500);

    const text = await page.innerText("main").catch(() => "");

    if (!text) {
      failures.push("/diagnostic ne rend aucun contenu");
      await ctx.close();
      return failures;
    }
    if (errors.length) {
      failures.push(`erreur JS sur /diagnostic : ${errors[0]}`);
    }

    // 2. Nommer le champ, pas le probleme.
    if (!/NEXT_PUBLIC_SUPABASE_URL/.test(text)) {
      failures.push(
        "la page ne nomme pas NEXT_PUBLIC_SUPABASE_URL : sans le nom exact de la "
        + "variable, celui qui installe ne sait pas quoi taper dans Vercel"
      );
    }
    if (!/NEXT_PUBLIC_SUPABASE_(PUBLISHABLE|ANON)_KEY/.test(text)) {
      failures.push("la page ne nomme pas la variable de la cle publique");
    }

    // 3. Le Site URL conseille ne doit pas suivre l'adresse consultee.
    const advised = /Site URL\s+(\S+)/.exec(text);
    if (!advised) {
      failures.push("la page ne donne plus de Site URL a poser dans Supabase");
    } else if (advised[1] !== SITE_URL) {
      failures.push(
        `Site URL conseille : "${advised[1]}" au lieu de "${SITE_URL}". `
        + "Consulte depuis une preversion, ce conseil renverrait les liens de "
        + "connexion de vraies personnes vers la preversion."
      );
    }

    // La cle ne doit jamais s'afficher en entier : cette page finit en capture
    // d'ecran dans une conversation d'assistance.
    if (/sb_publishable_[A-Za-z0-9_-]{20,}/.test(text)) {
      failures.push("la cle publique s'affiche en entier au lieu d'etre tronquee");
    }

    // Et le service_role n'a rien a faire ici, sous aucune forme.
    if (/service_role\s*=|sb_secret_|eyJ[A-Za-z0-9_-]{30,}/.test(text)) {
      failures.push("une cle secrete apparait sur la page de diagnostic");
    }

    await ctx.close();

    if (!failures.length) {
      console.log("      la page nomme chaque champ manquant, sans divulguer de cle");
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
