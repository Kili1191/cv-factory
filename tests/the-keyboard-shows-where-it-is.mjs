// Someone navigating with the keyboard can see where they are.
//
// This is not a minority concern. It is the screen reader, the person who
// cannot hold a mouse, and the one who tabs through a form because it is
// faster. And the first thing anyone tabs through is the navigation.
//
// HOW IT BROKE
//
// A rule made the focus ring cream inside `aside`, unconditionally. It was
// right when the sidebar was dark glass. The rebuild made the bar white in the
// light theme, and the cream ring landed on it: measured, rgb(250,248,243) on
// rgb(255,255,255), which is 1.05:1. There was still an outline in the
// computed styles, still two pixels wide, and it could not be seen at all.
//
// That is the shape of defect this file exists for: nothing throws, nothing
// looks broken in a screenshot taken with a mouse, and the feature is gone.
//
// WHAT IT HOLDS
//
// The ring must stand out from the surface it is drawn on, in BOTH themes -
// 3:1, which is what WCAG 2.2 asks of a focus indicator. Both themes matter
// because the fix for one is what broke the other: cream on dark reads, cream
// on white does not, and a single unconditional colour cannot serve both.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

const MINIMUM = 3;

function luminance([r, g, b]) {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contraste(a, b) {
  const la = luminance(a), lb = luminance(b);
  const [h, l] = la > lb ? [la, lb] : [lb, la];
  return (h + 0.05) / (l + 0.05);
}
function rgb(s) {
  const m = String(s || "").match(/(\d+(?:\.\d+)?)/g);
  return m && m.length >= 3 ? m.slice(0, 3).map(Number) : null;
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await seedApp(page, SAMPLE_CV, { locale: "en" });

    const mesurer = async () => {
      // AU CLAVIER, PAS A LA SOURIS
      //
      // :focus-visible ne s'allume pas sur un clic - c'est voulu, et c'est
      // aussi pourquoi un test qui cliquerait ne verrait jamais l'anneau et
      // passerait au vert quoi qu'il arrive.
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      await page.keyboard.press("Tab");
      for (let i = 0; i < 14; i++) {
        const dedans = await page.evaluate(() => {
          const a = document.activeElement;
          return !!(a && a.closest && a.closest("aside") && a.hasAttribute("data-nv-nav"));
        });
        if (dedans) break;
        await page.keyboard.press("Tab");
      }
      return page.evaluate(() => {
        const a = document.activeElement;
        if (!a || !a.closest("aside")) return null;
        const st = getComputedStyle(a);
        // La surface derriere : la premiere boite qui peint vraiment.
        let n = a, fond = null;
        while (n && n !== document.documentElement) {
          const bg = getComputedStyle(n).backgroundColor;
          const m = bg.match(/[\d.]+/g);
          if (m && (m.length < 4 || Number(m[3]) > 0.5)) { fond = bg; break; }
          n = n.parentElement;
        }
        return {
          quoi: a.getAttribute("data-nv-nav"),
          couleur: st.outlineColor,
          largeur: parseFloat(st.outlineWidth) || 0,
          style: st.outlineStyle,
          fond,
        };
      });
    };

    for (const theme of ["clair", "sombre"]) {
      if (theme === "sombre") {
        await page.evaluate(() => {
          document.documentElement.dataset.theme = "dark";
          document.body.classList.add("cvf-dark");
        });
        await page.waitForTimeout(600);
      }
      const vu = await mesurer();
      if (!vu) {
        failures.push(
          theme + " : la tabulation n'atteint aucune entree de navigation. Soit "
          + "la barre n'est pas atteignable au clavier, soit ce test ne mesure rien."
        );
        continue;
      }
      if (!vu.largeur || vu.style === "none") {
        failures.push(theme + " : aucun anneau de focus sur \"" + vu.quoi + "\".");
        continue;
      }
      const c = rgb(vu.couleur), f = rgb(vu.fond);
      if (!c || !f) {
        failures.push(theme + " : impossible de lire les couleurs de l'anneau.");
        continue;
      }
      const r = contraste(c, f);
      if (r < MINIMUM) {
        failures.push(
          theme + " : l'anneau de focus affiche " + r.toFixed(2) + ":1 sur la barre "
          + "(" + vu.couleur + " sur " + vu.fond + "), sous les " + MINIMUM + ":1 "
          + "demandes. L'anneau existe dans les styles et ne se voit pas : au "
          + "clavier, on ne sait plus ou on est."
        );
      }
    }

    await ctx.close();
  } catch (err) {
    failures.push("le test a plante : " + (err && err.message ? err.message : String(err)));
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
