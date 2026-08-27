// POSER NUVI SUR L'ECRAN D'ACCUEIL D'UN IPHONE
//
// "Sur l'ecran d'accueil" existe toujours dans Safari, meme pour une page qui
// ne declare rien. La difference ne se voit qu'apres : sans manifeste et sans
// icone, iOS fabrique une vignette a partir d'une capture de la page, nomme
// le raccourci avec le titre complet tronque, et l'ouvre dans Safari avec sa
// barre d'adresse. Un marque-page deguise.
//
// Ce test verifie les quatre declarations dont depend le vrai comportement -
// et surtout que les fichiers qu'elles designent existent REELLEMENT. Une
// icone declaree mais absente est le defaut le plus courant et le plus
// invisible : la balise est la, la revue de code passe, et l'icone posee sur
// l'ecran d'accueil est une page blanche.
//
// Il verifie aussi viewport-fit=cover, qui n'a l'air de rien : sans lui, iOS
// renvoie zero pour tous les env(safe-area-inset-*), et en mode plein ecran -
// ou il n'y a plus de barre de navigateur pour proteger le bas - la barre de
// navigation de Nuvi passe sous l'indicateur d'accueil.

import { startServer, stopServer, launchBrowser, BASE_URL, APP_URL } from "./lib/harness.mjs";
import { detectPlatform } from "../lib/installTarget.js";

export async function run() {
  const failures = [];

  // La detection de plateforme se verifie sans navigateur : elle decide quel
  // mode d'emploi s'affiche, et se tromper enverrait un possesseur d'iPad
  // chercher un bouton d'installation qui n'existe pas chez lui.
  const UA = [
    ["iPhone", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15", false, 5, "ios"],
    // iPadOS se presente comme un Mac depuis iOS 13. Seul l'ecran tactile
    // le trahit.
    ["iPad moderne", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15", true, 5, "ios"],
    ["Mac", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126", false, 0, "desktop"],
    ["Android", "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126", true, 5, "android"],
  ];
  for (const [name, ua, touch, points, expected] of UA) {
    const got = detectPlatform(ua, touch, points);
    if (got !== expected) failures.push(`${name} detecte comme "${got}", attendu "${expected}"`);
  }

  let server, browser;
  try {
    server = await startServer();
    browser = await launchBrowser();
  } catch (err) {
    return [...failures, `demarrage impossible : ${err && err.message}`];
  }

  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 45000 });

    const head = await page.evaluate(() => {
      const meta = (sel, attr = "content") => {
        const el = document.head.querySelector(sel);
        return el ? el.getAttribute(attr) : null;
      };
      return {
        manifest: meta('link[rel="manifest"]', "href"),
        appleCapable: meta('meta[name="apple-mobile-web-app-capable"]')
          || meta('meta[name="mobile-web-app-capable"]'),
        appleTitle: meta('meta[name="apple-mobile-web-app-title"]'),
        appleIcon: meta('link[rel="apple-touch-icon"]', "href"),
        viewport: meta('meta[name="viewport"]'),
        themeColor: meta('meta[name="theme-color"]'),
        title: document.title,
      };
    });

    if (!head.manifest) failures.push("aucun manifeste declare : iOS fabriquera un marque-page");
    if (!head.appleCapable) failures.push("apple-mobile-web-app-capable absent : l'app s'ouvrira dans Safari, barre d'adresse comprise");
    if (head.appleTitle !== "Nuvi") {
      failures.push(`le nom sous l'icone est "${head.appleTitle}", attendu "Nuvi"`);
    }
    if (!head.appleIcon) failures.push("aucune apple-touch-icon : l'icone sera une capture de la page");
    if (!head.viewport || !/viewport-fit\s*=\s*cover/.test(head.viewport)) {
      failures.push("viewport-fit=cover absent : tous les env(safe-area-inset-*) valent zero sur iOS");
    }
    if (!head.themeColor) failures.push("theme-color absent : la barre d'etat ne suivra pas l'application");
    if (!/Nuvi/.test(head.title || "")) {
      failures.push(`le titre du document est "${head.title}" : la marque n'y est pas`);
    }

    // LES FICHIERS DOIVENT EXISTER
    //
    // C'est le vrai piege. Declarer une icone coute une ligne ; la produire
    // demande un outil. Une balise qui pointe vers un fichier absent passe
    // toutes les revues et donne une icone blanche sur l'ecran d'accueil.
    const manifestUrl = new URL(head.manifest || "/manifest.webmanifest", BASE_URL).href;
    const mRes = await page.request.get(manifestUrl);
    if (!mRes.ok()) {
      failures.push(`le manifeste declare repond ${mRes.status()}`);
    } else {
      let manifest = null;
      try { manifest = await mRes.json(); }
      catch { failures.push("le manifeste n'est pas un JSON valide"); }

      if (manifest) {
        if (manifest.display !== "standalone") {
          failures.push(`display vaut "${manifest.display}", attendu "standalone" : sans lui l'app garde la barre du navigateur`);
        }
        if (!manifest.name || !manifest.short_name) {
          failures.push("le manifeste n'a pas de nom court : le libelle sous l'icone sera tronque au hasard");
        }
        const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
        if (!icons.length) failures.push("le manifeste ne declare aucune icone");
        if (!icons.some(i => String(i.purpose || "").includes("maskable"))) {
          failures.push("aucune icone maskable : Android rognera l'icone dans un cercle et coupera le dessin");
        }
        if (!icons.some(i => String(i.sizes || "").includes("512"))) {
          failures.push("aucune icone 512 : l'ecran de lancement d'Android sera flou");
        }
        // Chaque fichier declare doit repondre, et repondre une image.
        for (const icon of icons) {
          const url = new URL(icon.src, BASE_URL).href;
          const res = await page.request.get(url);
          if (!res.ok()) {
            failures.push(`icone declaree mais absente : ${icon.src} repond ${res.status()}`);
            continue;
          }
          const type = res.headers()["content-type"] || "";
          if (!type.startsWith("image/")) {
            failures.push(`${icon.src} n'est pas une image (${type})`);
            continue;
          }
          const body = await res.body();
          // Une icone d'ecran d'accueil qui pese moins de 400 octets est un
          // carre vide : le generateur a tourne, mais sur rien.
          if (body.length < 400) {
            failures.push(`${icon.src} ne pese que ${body.length} octets : l'icone est vide`);
          }
        }
      }
    }

    // L'icone d'Apple, declaree hors du manifeste, doit exister aussi.
    if (head.appleIcon) {
      const res = await page.request.get(new URL(head.appleIcon, BASE_URL).href);
      if (!res.ok()) {
        failures.push(`apple-touch-icon declaree mais absente : ${head.appleIcon} repond ${res.status()}`);
      } else {
        const body = await res.body();
        if (body.length < 400) {
          failures.push(`apple-touch-icon vide (${body.length} octets)`);
        }
      }
    }

    await ctx.close();
  } catch (err) {
    failures.push(`le test a plante : ${err && err.message}`);
  } finally {
    try { await browser.close(); } catch { /* deja fermee */ }
    await stopServer(server);
  }

  if (!failures.length) {
    console.log("      manifeste, icones reellement servies, plein ecran et zones sures : l'icone posee est une vraie app");
  }
  return failures;
}
