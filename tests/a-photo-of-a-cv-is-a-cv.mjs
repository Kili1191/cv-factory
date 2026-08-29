// UNE PHOTO DE CV EST UN CV
//
// L'ecran d'accueil n'acceptait que PDF, DOCX et TXT. Or beaucoup de gens
// n'ont pas leur CV sous forme de fichier : il est sur un ancien telephone,
// dans un courriel, ou imprime dans un classeur. La photo est le seul
// exemplaire qu'ils possedent - et leur demander de retaper trois pages a la
// main est exactement la friction que ce produit existe pour supprimer.
//
// Une image n'a pas de texte a extraire dans le navigateur : c'est le seul
// cas ou le fichier lui-meme part au modele. Ce test verifie les deux faces :
// le champ accepte bien les images (sinon le selecteur les grise et la
// fonctionnalite n'existe pas sur telephone), et le texte lu revient dans la
// zone de saisie comme si la personne l'avait colle.

import { startServer, stopServer, launchBrowser, answerLanguageIfAsked, BASE_URL } from "./lib/harness.mjs";

const APP = (b) => b + "/app";

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 },
      isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const erreurs = [];
    page.on("pageerror", (e) => erreurs.push(String(e && e.message || e).split("\n")[0]));

    // Le modele n'est pas appele pour de vrai : on rend la transcription
    // qu'il produirait, pour verifier le CHEMIN, pas le modele.
    await page.route("**/api/claude**", (route) => route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ content: [{ type: "text",
        text: "Amara Okafor\nCare Assistant\n6 years in residential care.\n"
          + "Elmwood Residential Home, 2022-2026\nLed a team of 6 across night shifts.",
      }] }),
    }));

    await page.goto(APP(BASE_URL),
      { waitUntil: "domcontentloaded" });
    await answerLanguageIfAsked(page, "en");
    await page.waitForTimeout(2500);

    // --- 1. Le champ accepte-t-il une image ? -------------------------
    //
    // Sur telephone, un `accept` sans image grise les photos dans le
    // selecteur : la fonctionnalite peut exister dans le code et rester
    // inatteignable au doigt.
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")]
        .find((x) => /already have a CV|I have a CV|deja un CV/i.test(x.textContent || ""));
      if (b) b.click();
    });
    await page.waitForTimeout(1400);

    const champ = await page.evaluate(() => {
      const i = document.querySelector('input[type="file"]');
      return i ? { accept: i.getAttribute("accept") || "" } : null;
    });

    if (!champ) {
      failures.push(
        "aucun champ de fichier sur l'ecran d'import : impossible de deposer "
        + "un CV existant."
      );
    } else if (!/image/.test(champ.accept)) {
      failures.push(
        "le champ de fichier n'accepte pas les images (accept=\"" + champ.accept
        + "\"). Sur telephone, le selecteur grise alors les photos : quelqu'un "
        + "dont le seul exemplaire est une photo ne peut pas entrer."
      );
    }

    // --- 2. Le texte lu revient-il dans la zone de saisie ? -----------
    if (champ && /image/.test(champ.accept)) {
      // Un PNG minuscule mais valide suffit : ce qu'on teste est le chemin.
      const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
      await page.setInputFiles('input[type="file"]', {
        name: "cv.png", mimeType: "image/png", buffer: Buffer.from(png, "base64"),
      });
      await page.waitForTimeout(4000);

      const zone = await page.evaluate(() => {
        const t = document.querySelector("textarea");
        return t ? t.value : null;
      });

      if (zone === null) {
        failures.push("aucune zone de saisie pour recevoir le texte lu.");
      } else if (!/Amara Okafor|Care Assistant/.test(zone)) {
        failures.push(
          "la photo n'a rien mis dans la zone de saisie (\"" + String(zone).slice(0, 60)
          + "\"). Le fichier est accepte et rien n'en sort : l'utilisateur "
          + "choisit sa photo et se retrouve devant un champ vide."
        );
      }
    }

    if (erreurs.length) {
      failures.push("erreur JS pendant l'import d'une photo - "
        + [...new Set(erreurs)].slice(0, 2).join(" | "));
    }

    if (!failures.length) {
      console.log(
        "      le champ accepte les photos, et le texte lu revient dans la "
        + "zone de saisie comme un CV colle"
      );
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
