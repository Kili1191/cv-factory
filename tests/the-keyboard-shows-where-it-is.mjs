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
// AND THE SECOND ONE, WHICH THE FIRST SWEEP FOUND
//
// Checking only the sidebar was too narrow. Tabbing across four screens in
// both themes showed that every input and every textarea in the product had NO
// ring at all: the CV editor, the coach, the box where a job ad is pasted -
// everywhere you type.
//
// The cause was in the fix itself. Twenty-seven places set outline:"none" as
// an INLINE style, and the rule meant to undo that was wrapped in :where(),
// which is worth zero specificity. Inline beats any non-important rule, so it
// lost to all twenty-seven. It worked for buttons, which do not set it, and
// never once for a text field.
//
// WHAT IT HOLDS
//
// Every tabbable element on several screens, in BOTH themes, must carry a ring
// that stands out from the surface behind it - 3:1, what WCAG 2.2 asks of a
// focus indicator. Both themes matter because the fix for one is what broke
// the other: cream on dark reads, cream on white does not, and one
// unconditional colour cannot serve both.
//
// It walks with Tab rather than calling focus(): :focus-visible deliberately
// does not light for a click or a script, so a test that clicked would never
// see a ring and would pass whatever happened.

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

  // Quatre ecrans, choisis pour ce qu'ils contiennent : la coquille et sa
  // navigation, une fenetre a saisie libre, un formulaire dense, et une liste.
  const ECRANS = [
    { nom: "app", ouvrir: async () => {} },
    { nom: "coach", ouvrir: async (p) => {
        await p.locator('[data-nv-nav="coach"]').click();
        await p.waitForTimeout(1500);
      } },
    { nom: "editeur", ouvrir: async (p) => {
        await p.locator('[data-nv-nav="edit"]').click();
        await p.waitForTimeout(300);
        await p.locator('[data-nv-sub="edit:exp"]').click();
        await p.waitForTimeout(1500);
      } },
    { nom: "candidatures", ouvrir: async (p) => {
        await p.locator('[data-nv-nav="tracking"]').click();
        await p.waitForTimeout(1500);
      } },
  ];

  try {
    for (const theme of ["clair", "sombre"]) {
      for (const ecran of ECRANS) {
        const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await ctx.newPage();
        await seedApp(page, SAMPLE_CV, { locale: "en" });
        if (theme === "sombre") {
          await page.evaluate(() => {
            document.documentElement.dataset.theme = "dark";
            document.body.classList.add("cvf-dark");
          });
          await page.waitForTimeout(500);
        }
        await ecran.ouvrir(page);

        const deja = new Set();
        let visites = 0;
        for (let i = 0; i < 45; i++) {
          await page.keyboard.press("Tab");
          const vu = await page.evaluate(() => {
            const a = document.activeElement;
            if (!a || a === document.body) return null;
            const st = getComputedStyle(a);
            const quoi = a.getAttribute("data-nv-nav")
              || a.getAttribute("aria-label")
              || (a.innerText || "").trim().slice(0, 22)
              || a.tagName;
            if (st.outlineStyle === "none" || !parseFloat(st.outlineWidth)) {
              return { quoi, sansAnneau: true };
            }
            let n = a, fond = null;
            while (n && n !== document.documentElement) {
              const bg = getComputedStyle(n).backgroundColor;
              const m = bg.match(/[\d.]+/g);
              if (m && (m.length < 4 || Number(m[3]) > 0.5)) { fond = bg; break; }
              n = n.parentElement;
            }
            return { quoi, couleur: st.outlineColor, fond };
          });
          if (!vu) continue;
          visites++;
          const cle = ecran.nom + "/" + vu.quoi;
          if (deja.has(cle)) continue;
          deja.add(cle);

          if (vu.sansAnneau) {
            failures.push(
              theme + " / " + ecran.nom + ' : "' + vu.quoi + '" ne montre aucun '
              + "anneau au clavier. On tabule dessus sans savoir qu'on y est."
            );
            continue;
          }
          const c = rgb(vu.couleur), f = rgb(vu.fond);
          if (!c || !f) continue;
          const r = contraste(c, f);
          if (r < MINIMUM) {
            failures.push(
              theme + " / " + ecran.nom + ' : "' + vu.quoi + '" a un anneau a '
              + r.toFixed(2) + ":1 (" + vu.couleur + " sur " + vu.fond + "), sous "
              + "les " + MINIMUM + ":1 demandes. L'anneau est dans les styles et "
              + "ne se voit pas."
            );
          }
        }

        // SANS CETTE LIGNE, UN ECRAN QUI NE SE TABULE PLUS PASSERAIT AU VERT
        if (visites < 8) {
          failures.push(
            theme + " / " + ecran.nom + " : la tabulation n'a atteint que "
            + visites + " element(s). Ce balayage ne verifie plus rien."
          );
        }
        await ctx.close();
      }
    }
  } catch (err) {
    failures.push("le test a plante : " + (err && err.message ? err.message : String(err)));
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
