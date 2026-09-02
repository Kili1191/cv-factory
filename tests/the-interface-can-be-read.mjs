// The interface can be read, in both themes.
//
// WHAT THE SWEEP FOUND
//
// Not one bad colour: a rule. The brand palette was being used as ink. Coral
// on white gives 3.12:1, the small grey eyebrow 2.32:1, the parser pill's
// green 3.00:1 on its own soft green. WCAG AA asks 4.5:1 of body text, and
// every one of those is set at 10 or 11 pixels - the size where it is paid for.
//
// It covered the navigation labels, every field label in the CV editor, the
// eyebrow over each panel, the coach's title, the floating coach pill, and the
// readiness chip added the same day. Twenty-nine measurements under the floor
// across four screens.
//
// Nuvi is for people reading on a phone, often outdoors, often in bad light.
// This is not a checkbox.
//
// THE FIX WAS NOT TO CHANGE THE BRAND
//
// The brand colours stay for fills, gradients and pills, where they carry
// white text and the contrast works out. Beside them now sit their ink
// versions, calibrated to hold 4.5:1 on the product's surfaces - including the
// soft backgrounds, which are stricter than white - and flipping with the
// theme. The rule is: text takes the -Text token, a fill takes the other.
//
// WHAT THIS TEST CANNOT MEASURE, AND SAYS SO
//
// Text on a gradient, and text painted BY a gradient, have no single
// background or foreground colour to compare. Those are skipped rather than
// guessed at - a false failure trains people to ignore the suite. The count of
// skips is asserted too: if it ever swallows most of the screen, the sweep has
// stopped being a sweep.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

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

// LE TELEPHONE FAISAIT PARTIE DE L'ANGLE MORT
//
// Ce balayage ne regardait que 1440x900. Or Nuvi sert des gens qui postulent
// depuis leur telephone, entre deux services, et l'ecran mobile a sa propre
// navigation, ses propres tailles et ses propres fonds : rien de ce qui est
// verifie sur grand ecran ne le couvre. La barre du bas est passee sombre
// sans qu'aucun test ne puisse le contredire.
const TAILLES = [
  { nom: "bureau", width: 1440, height: 900 },
  { nom: "telephone", width: 390, height: 844 },
];

const ECRANS = [
  { nom: "app", ouvrir: async () => {}, partout: true },
  { nom: "coach", ouvrir: async (p) => {
      await p.locator('[data-nv-nav="coach"]').click(); await p.waitForTimeout(1500); } },
  { nom: "editeur", ouvrir: async (p) => {
      await p.locator('[data-nv-nav="edit"]').click(); await p.waitForTimeout(300);
      await p.locator('[data-nv-sub="edit:exp"]').click(); await p.waitForTimeout(1500); } },
  { nom: "candidatures", ouvrir: async (p) => {
      await p.locator('[data-nv-nav="tracking"]').click(); await p.waitForTimeout(1500); } },
];

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    for (const theme of ["clair", "sombre"]) {
      for (const taille of TAILLES) {
        for (const ecran of ECRANS) {
        // Les panneaux s'ouvrent depuis la barre laterale, qui n'existe pas
        // sur telephone : seul l'ecran principal s'y verifie.
        if (taille.nom === "telephone" && !ecran.partout) continue;
        const ctx = await browser.newContext({ viewport: { width: taille.width, height: taille.height } });
        const page = await ctx.newPage();
        await seedApp(page, SAMPLE_CV, { locale: "en" });
        if (theme === "sombre") {
          await page.evaluate(() => {
            document.documentElement.dataset.theme = "dark";
            document.body.classList.add("cvf-dark");
          });
          await page.waitForTimeout(500);
        }
        if (taille.nom !== "telephone") await ecran.ouvrir(page);

        const releve = await page.evaluate(() => {
          const textes = [];
          let ignores = 0;
          for (const el of document.querySelectorAll("*")) {
            // Le CV est un document, pas de l'interface : ses couleurs sont un
            // choix de gabarit, et le gabarit par defaut a une colonne noire
            // voulue ainsi. Il se juge ailleurs.
            if (el.closest('[data-cvf="cv"]')) continue;
            const txt = [...el.childNodes]
              .filter((n) => n.nodeType === 3)
              .map((n) => n.textContent.trim()).join(" ").trim();
            if (txt.length < 2) continue;
            const r = el.getBoundingClientRect();
            if (r.width < 4 || r.height < 4) continue;
            if (r.bottom < 0 || r.top > window.innerHeight
                || r.right < 0 || r.left > window.innerWidth) continue;
            const st = getComputedStyle(el);
            if (st.visibility === "hidden" || parseFloat(st.opacity) < 0.5) continue;

            // Texte peint PAR un degrade : aucune couleur d'encre unique.
            const remplissage = st.webkitTextFillColor || st.color;
            if (/rgba\(0,\s*0,\s*0,\s*0\)|transparent/.test(remplissage)) { ignores++; continue; }

            // Fond : la premiere boite qui peint vraiment. Si elle peint un
            // degrade, il n'y a pas de couleur de fond unique non plus.
            let n = el, fond = null, degrade = false;
            while (n && n !== document.documentElement) {
              const cs = getComputedStyle(n);
              if (cs.backgroundImage && cs.backgroundImage !== "none"
                  && /gradient/.test(cs.backgroundImage)) { degrade = true; break; }
              const m = cs.backgroundColor.match(/[\d.]+/g);
              if (m && (m.length < 4 || Number(m[3]) > 0.6)) { fond = cs.backgroundColor; break; }
              n = n.parentElement;
            }
            if (degrade || !fond) { ignores++; continue; }

            const px = parseFloat(st.fontSize) || 14;
            const gras = (parseInt(st.fontWeight, 10) || 400) >= 700;
            textes.push({
              txt: txt.slice(0, 30), couleur: st.color, fond, px,
              gros: px >= 24 || (px >= 18.66 && gras),
            });
          }
          return { textes, ignores };
        });

        const vus = new Set();
        for (const t of releve.textes) {
          const c = rgb(t.couleur), f = rgb(t.fond);
          if (!c || !f) continue;
          const seuil = t.gros ? 3 : 4.5;
          const r = contraste(c, f);
          if (r >= seuil) continue;
          const cle = theme + "/" + taille.nom + "/" + ecran.nom + "/" + t.txt;
          if (vus.has(cle)) continue;
          vus.add(cle);
          failures.push(
            theme + " / " + taille.nom + " / " + ecran.nom + ' : "' + t.txt + '" a un contraste de '
            + r.toFixed(2) + ":1 (" + Math.round(t.px) + "px, minimum " + seuil
            + ":1) - " + t.couleur + " sur " + t.fond + "."
          );
        }

        // LE BALAYAGE DOIT AVOIR BALAYE
        if (releve.textes.length < 10) {
          failures.push(
            theme + " / " + taille.nom + " / " + ecran.nom + " : seulement " + releve.textes.length
            + " texte(s) mesurable(s). Ce balayage ne verifie plus l'ecran."
          );
        }
        // Et il ne doit pas s'exempter de la moitie de l'ecran.
        if (releve.ignores > releve.textes.length) {
          failures.push(
            theme + " / " + taille.nom + " / " + ecran.nom + " : " + releve.ignores + " textes ignores "
            + "pour " + releve.textes.length + " mesures. Les degrades avalent le "
            + "controle : il faudrait les mesurer autrement plutot que les sauter."
          );
        }
        await ctx.close();
        }
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
