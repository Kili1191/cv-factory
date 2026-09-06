// The native PDF: the /imprimer page printed by Chromium. Vector text, the
// real fonts, one page. See app/imprimer/page.jsx for why this exists next
// to the picture export, which stays as the fallback when this route fails.
//
// WHERE CHROMIUM COMES FROM
//
// On Vercel, @sparticuz/chromium ships a Chromium built for the Lambda
// runtime inside the function bundle: nothing is downloaded at run time,
// which is the repo's rule for anything the product needs to work. On a
// developer's machine and in the test suite, the Chromium Playwright
// already installed is used, found the way tests/lib/chromium.mjs finds
// it. No Chromium at all: the route says so with a 503, and the browser
// falls back to the picture export without the person noticing.

import puppeteer from "puppeteer-core";
import { FORMATS, FACTEUR_MIN } from "../../../lib/formatsPdf";
import { cheminChromium } from "../../../lib/chromiumLocal";
import { POLICES_DU_SITE, UA_POLICES_STATIQUES } from "../../../lib/policesDuSite";

export const runtime = "nodejs";
export const maxDuration = 60;

async function lancerChromium() {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  const local = cheminChromium();
  if (!local) return null;
  return puppeteer.launch({
    executablePath: local,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    headless: true,
  });
}

// WHETHER THE PRINTER WORKS, FROM A BROWSER
//
// The picture fallback hides every failure of this route from the person
// downloading, on purpose. It also hides it from whoever maintains the
// site: the first deploy could have shipped without its Chromium and
// nobody would have seen anything but slightly heavier PDFs. Opening
// /api/pdf in a browser launches Chromium, prints one blank page, and says
// what happened. No CV data is involved.
export async function GET() {
  const debut = Date.now();
  let navigateur = null;
  try {
    navigateur = await lancerChromium();
    if (!navigateur) {
      return Response.json({ ok: false, chromium: null,
        raison: "no chromium found on this machine" }, { status: 503 });
    }
    const page = await navigateur.newPage();
    await page.setContent("<p>nuvi</p>");
    const pdf = await page.pdf({ format: "A4" });
    return Response.json({ ok: true,
      chromium: process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME ? "bundled" : "local",
      octets: pdf.length, ms: Date.now() - debut });
  } catch (err) {
    return Response.json({ ok: false, raison: String((err && err.message) || err),
      ms: Date.now() - debut }, { status: 500 });
  } finally {
    if (navigateur) { try { await navigateur.close(); } catch (e) { /* already gone */ } }
  }
}

// THE FONTS, AS STATIC INSTANCES, INSIDE THE PAGE
//
// The print page must not use the variable fonts the screen uses: Chromium
// prints those as Type 3 outlines and extractors lose lines (see
// lib/policesDuSite.js). Google serves static instances to a legacy user
// agent, so the route fetches the CSS itself, with that agent, then fetches
// each font file it names and writes it into the CSS as a data: URL. The
// page's own font requests are answered with that CSS (see the request
// interception in POST), so the page needs no change to print right.
//
// Inlining, rather than leaving the gstatic URLs for Chromium to load,
// keeps the printer off the network: the function's Chromium prints from
// what it was handed, the test harness proves the fonts embed without a
// browser that can reach Google, and a slow font server cannot leave a
// half-loaded page. The files are cached in the module for the life of the
// instance, so only the first print of an instance pays the fetch.
//
// Only fonts.googleapis.com URLs are fetched: the theme carries whatever a
// person pasted as a custom font. No answer, or no network, is not a
// failure: the page falls back to the system fonts, which embed fine.
const POLICES_EN_CACHE = new Map();

async function lireAvecDelai(url, options, ms) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(ms) });
}

async function fichierEnDataUrl(url) {
  if (POLICES_EN_CACHE.has(url)) return POLICES_EN_CACHE.get(url);
  let data = "";
  try {
    const r = await lireAvecDelai(url, {}, 6000);
    if (r.ok) {
      const octets = Buffer.from(await r.arrayBuffer());
      const type = /\.woff2(\?|$)/.test(url) ? "font/woff2" : /\.woff(\?|$)/.test(url) ? "font/woff" : "font/ttf";
      data = "data:" + type + ";base64," + octets.toString("base64");
    }
  } catch (e) { data = ""; }
  if (data) POLICES_EN_CACHE.set(url, data);
  return data;
}

async function cssDesPolices(hrefs) {
  const liste = [...new Set(hrefs.filter((h) => typeof h === "string"
    && /^https:\/\/fonts\.googleapis\.com\/css2?\?/.test(h)))];
  const feuilles = await Promise.all(liste.map(async (h) => {
    if (POLICES_EN_CACHE.has(h)) return POLICES_EN_CACHE.get(h);
    try {
      const r = await lireAvecDelai(h, { headers: { "user-agent": UA_POLICES_STATIQUES } }, 4000);
      if (!r.ok) return "";
      let css = await r.text();
      const urls = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((m) => m[1]))];
      const inline = await Promise.all(urls.map(fichierEnDataUrl));
      urls.forEach((u, i) => { if (inline[i]) css = css.split("url(" + u + ")").join("url(" + inline[i] + ")"); });
      POLICES_EN_CACHE.set(h, css);
      return css;
    } catch (e) { return ""; }
  }));
  return feuilles.filter(Boolean).join("\n");
}

export async function POST(req) {
  let corps;
  try { corps = await req.json(); } catch { corps = null; }
  const cv = corps && corps.cv;
  if (!cv || typeof cv !== "object") {
    return Response.json({ error: "cv manquant" }, { status: 400 });
  }
  if (JSON.stringify(cv).length > 400_000) {
    return Response.json({ error: "cv trop lourd" }, { status: 413 });
  }
  const format = FORMATS[corps.format] ? corps.format : "a4";
  const f = FORMATS[format];
  const theme = corps.theme || {};
  const donnees = {
    cv, layout: corps.layout || "classic", theme,
    locale: corps.locale === "en" ? "en" : "fr", format,
  };
  // Warm the font cache before the page asks, so the interception below
  // answers at once and the page's font wait is not spent on Google.
  await cssDesPolices([POLICES_DU_SITE, theme.hfHref, theme.bfHref]);
  // The page to print lives on this same deployment: same build, same
  // templates, same fonts as the screen the person is looking at.
  // Behind a proxy that rewrites the URL, NUVI_ORIGINE names the public
  // address the printer must open instead.
  const origine = process.env.NUVI_ORIGINE || new URL(req.url).origin;

  let navigateur = null;
  try {
    navigateur = await lancerChromium();
    if (!navigateur) {
      return Response.json({ error: "chromium indisponible" }, { status: 503 });
    }
    const page = await navigateur.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument((d) => { window.__NUVI_IMPRESSION__ = d; }, donnees);
    // THE PAGE'S OWN FONT REQUESTS, ANSWERED WITH STATIC INSTANCES
    //
    // The page loads its fonts the way the screen does, through <link>s to
    // fonts.googleapis.com. Each of those requests is answered here with the
    // CSS fetched for a legacy user agent, font files inlined. Nothing else
    // changes on the page, nothing large travels through the script above
    // (a 1.4 MB payload there silently left the page without its data),
    // and the fonts arrive through the channel document.fonts.ready waits
    // on. A request the cache cannot serve goes through untouched.
    await page.setRequestInterception(true);
    page.on("request", (r) => {
      const url = r.url();
      if (/^https:\/\/fonts\.googleapis\.com\/css2?\?/.test(url)) {
        cssDesPolices([url]).then((css) => (css
          ? r.respond({ status: 200, contentType: "text/css; charset=utf-8", body: css })
          : r.continue())).catch(() => r.continue().catch(() => {}));
        return;
      }
      r.continue().catch(() => {});
    });
    // domcontentloaded, not load: "load" waits for the font stylesheets,
    // and where Google Fonts is slow or blocked that wait is the whole
    // budget. The page signals data-cvf-pret itself once fonts are in, or
    // after four seconds without them.
    await page.goto(origine + "/imprimer", { waitUntil: "domcontentloaded", timeout: 25_000 });
    await page.waitForSelector("[data-cvf-pret]", { timeout: 20_000 });
    // The fonts, when the network lets them through; five seconds at most,
    // then the fallback face prints rather than nothing.
    await Promise.race([
      page.evaluate(() => (document.fonts && document.fonts.ready) || null),
      new Promise((r) => setTimeout(r, 5_000)),
    ]);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

    // ONE PAGE, ALWAYS: measure the sheet, zoom it down to the page if it
    // runs over, never below the floor. Beyond the floor the check before
    // download has already refused, so this is a safety net, not a path.
    const hauteurPx = await page.evaluate(() => {
      const el = document.getElementById("cv-print");
      return el ? el.getBoundingClientRect().height : 0;
    });
    const hauteurMm = hauteurPx * 25.4 / 96;
    const facteur = Math.max(FACTEUR_MIN, Math.min(1, f.hauteur / Math.max(hauteurMm, 1)));
    if (facteur < 1) {
      await page.evaluate((z) => {
        const el = document.getElementById("cv-print");
        if (el) el.style.zoom = String(z);
      }, facteur);
    }
    const pdf = await page.pdf({
      format: f.puppeteer,
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      pageRanges: "1",
    });
    await page.close();
    return new Response(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store",
        "X-Nuvi-Facteur": facteur.toFixed(3),
        "X-Nuvi-Hauteur-Mm": hauteurMm.toFixed(1),
      },
    });
  } catch (err) {
    return Response.json({ error: String(err && err.message || err).slice(0, 200) }, { status: 500 });
  } finally {
    if (navigateur) { try { await navigateur.close(); } catch { /* deja ferme */ } }
  }
}
