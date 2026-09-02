// Dark mode dresses the app, never the document.
//
// WHY THIS ONE MATTERS MORE THAN IT LOOKS
//
// The CV on the right is the thing that gets exported. If it followed the
// theme, someone working at night would send a recruiter a black page with
// pale text - and would have no way of knowing, because on their screen it
// would look deliberate. This product has already shipped an export defect
// that only showed up on the recruiter's side, and the person who found it
// was the user, after applying.
//
// globals.css and AppRoot both carry a rule for exactly this
// (body.cvf-dark [data-cvf="cv"]{color-scheme:light}), and nothing tested it.
// A rule nobody tests is a rule someone deletes.
//
// WHAT ELSE IT HOLDS
//
// Dark mode had no coverage at all: not one suite mentioned it. That is how
// the navigation rebuild nearly shipped a WHITE sidebar into it - the bar went
// from a translucent glass to a flat var(--nuvi-paper), and whether that flips
// depends on a data-theme attribute set somewhere else entirely. It happens to
// be set. Nothing said so, and nothing would have said so if it were not.
//
// So: the chrome must actually be dark, the document must stay light, and the
// labels must stay readable against what is behind them. Contrast is measured,
// not admired - WCAG AA asks 4.5:1 for body text and the house rules ask for
// AA throughout.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

// Luminance relative, formule WCAG 2.x.
function luminance(rgb) {
  const c = rgb.map((v) => {
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

    // LE CONTROLE EST UNE COMPARAISON, PAS UN JUGEMENT SUR UNE COULEUR
    //
    // Premiere version : lire le fond du CV et verifier qu'il est clair. Deux
    // fausses alertes tout de suite, et aucune n'etait un defaut du produit.
    // Le noeud [data-cvf="cv"] ne peint rien lui-meme, donc remonter l'arbre
    // trouvait le plan de travail derriere et le declarait "CV sombre". Et le
    // gabarit par defaut a une colonne de gauche NOIRE avec du texte clair,
    // voulue ainsi : y lire du texte pale et crier au theme inverse revenait a
    // interdire un gabarit.
    //
    // La garantie qui compte ne parle pas de clair ni de sombre, elle parle
    // d'invariance : le document doit s'afficher A L'IDENTIQUE dans les deux
    // themes, puisque c'est lui qui part en PDF. On releve donc les memes
    // noeuds deux fois et on compare. N'importe quelle fuite du theme dans le
    // document echoue, y compris celles auxquelles je n'ai pas pense.
    const releve = () => page.evaluate(() => {
      const cv = document.querySelector('[data-cvf="cv"]');
      if (!cv) return null;
      const noeuds = [...cv.querySelectorAll("*")].slice(0, 60);
      return {
        racine: getComputedStyle(cv).backgroundColor,
        styles: noeuds.map((e) => {
          const st = getComputedStyle(e);
          return st.color + "|" + st.backgroundColor + "|" + st.borderColor;
        }),
      };
    });

    // LE RELEVE CLAIR DOIT VRAIMENT ETRE PRIS EN CLAIR
    //
    // Une version de ce fichier posait le theme sombre avant les DEUX releves.
    // Elle comparait donc le sombre a lui-meme et passait au vert sans rien
    // verifier. Ce garde-fou coute une ligne et rend ce piege impossible.
    const themeAvant = await page.evaluate(() => document.documentElement.dataset.theme || "");
    if (themeAvant === "dark") {
      failures.push(
        "le premier releve est deja pris en mode sombre : la comparaison "
        + "opposerait le sombre a lui-meme et ne verifierait rien."
      );
    }

    const clair = await releve();
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
      document.body.classList.add("cvf-dark");
    });
    await page.waitForTimeout(700);
    const sombre = await releve();

    if (!clair || !sombre) {
      failures.push("le CV est introuvable : ce test ne verifie plus rien.");
    } else if (clair.styles.length !== sombre.styles.length) {
      failures.push(
        "le CV ne rend pas les memes noeuds dans les deux themes ("
        + clair.styles.length + " contre " + sombre.styles.length + ")."
      );
    } else {
      const diff = [];
      if (clair.racine !== sombre.racine) diff.push("racine: " + clair.racine + " -> " + sombre.racine);
      for (let k = 0; k < clair.styles.length; k++) {
        if (clair.styles[k] !== sombre.styles[k]) {
          diff.push("noeud " + k + " : " + clair.styles[k] + " -> " + sombre.styles[k]);
        }
        if (diff.length >= 3) break;
      }
      if (diff.length) {
        failures.push(
          "le mode sombre change l'apparence du CV, et c'est lui qui part en "
          + "PDF : le recruteur recevrait autre chose que ce qui a ete relu. "
          + diff.join(" ; ")
        );
      }
    }

    const vu = await page.evaluate(() => {
      const aside = document.querySelector("aside");
      const fondReel = (el) => {
        let n = el;
        while (n && n !== document.documentElement) {
          const bg = getComputedStyle(n).backgroundColor;
          const m = bg.match(/[\d.]+/g);
          if (m && (m.length < 4 || Number(m[3]) > 0.5)) return bg;
          n = n.parentElement;
        }
        return getComputedStyle(document.documentElement).backgroundColor;
      };
      const libelles = [...(aside ? aside.querySelectorAll("[data-nv-nav]") : [])]
        .slice(0, 6).map((b) => ({
          k: b.getAttribute("data-nv-nav"),
          couleur: getComputedStyle(b).color,
          fond: fondReel(b),
        }));
      return { asideFond: aside ? fondReel(aside) : null, libelles };
    });

    // --- 2. LA COQUILLE, ELLE, EST BIEN SOMBRE -----------------------
    const fondAside = rgb(vu.asideFond);
    if (!fondAside) {
      failures.push("impossible de lire le fond de la barre laterale.");
    } else if (luminance(fondAside) > 0.5) {
      failures.push(
        "en mode sombre, la barre laterale reste claire (" + vu.asideFond + "). "
        + "Une navigation blanche a cote d'une application sombre n'est pas un "
        + "theme, c'est une moitie de theme."
      );
    }

    // --- 3. ET ON PEUT LA LIRE ---------------------------------------
    if (!vu.libelles.length) {
      failures.push("aucun libelle de navigation trouve : le controle de lisibilite ne porte sur rien.");
    }
    for (const l of vu.libelles) {
      const t = rgb(l.couleur), f = rgb(l.fond);
      if (!t || !f) continue;
      const r = contraste(t, f);
      if (r < 4.5) {
        failures.push(
          'le libelle "' + l.k + '" affiche un contraste de ' + r.toFixed(2)
          + ":1 en mode sombre, sous les 4.5:1 demandes. " + l.couleur
          + " sur " + l.fond + "."
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
