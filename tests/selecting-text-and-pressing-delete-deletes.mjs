// "JE NE PEUX PAS SUPPRIMER"
//
// Kilian, le 3 octobre 2026, "Lyon," surligne dans son CV. Mesure dans un
// navigateur avant correction : la valeur ne bougeait pas d'un caractere.
//
// Un champ du CV est un texte ordinaire tant qu'on n'a pas clique dessus, et
// un input ensuite. Selectionner puis appuyer sur Supprimer ne touchait donc
// rien : il n'y a pas d'input a cet instant, et un navigateur n'efface pas
// un noeud de texte qui n'est pas editable. Rien a l'ecran ne le disait, et
// toute la page est faite pour ressembler a un document qu'on edite. Le
// geste etait juste ; c'est la reponse qui manquait.
//
// Et une fois le champ vide, il disparaissait de la mise en page sur le
// gabarit a deux colonnes : plus rien a cliquer pour le remplir a nouveau.
// Effacer devenait irreversible sans Ctrl+Z.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

const CV = {
  ...SAMPLE_CV,
  experience: [{
    id: "e1", title: "Client Advisor", company: "Hermes",
    period: "2011 - 2013", location: "Lyon, France",
    bullets: ["Advised clients on luxury product selections"],
  }],
};

const champ = (page, mot) => page.locator("[data-cvf-e]", { hasText: mot }).first();

const selectionner = (cible) => cible.evaluate((el) => {
  const r = document.createRange();
  r.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(r);
});

const lire = (page, clef) => page.evaluate((k) => {
  try { return (JSON.parse(localStorage.getItem("cvf_d") || "{}").experience[0] || {})[k]; }
  catch { return "?"; }
}, clef);

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const erreurs = [];
    page.on("pageerror", (e) => erreurs.push(e.message.split("\n")[0].slice(0, 90)));
    await seedApp(page, CV, { locale: "en" });
    await page.waitForTimeout(1200);

    // --- 1. TOUT LE CHAMP SELECTIONNE, PUIS SUPPRIMER -------------------
    const lieu = champ(page, "Lyon");
    if (!(await lieu.count())) {
      failures.push("le champ du lieu n'est pas a l'ecran");
    } else {
      await selectionner(lieu);
      await page.keyboard.press("Backspace");
      await page.waitForTimeout(600);
      const apres = await lire(page, "location");
      if (apres !== "") {
        failures.push(
          "selectionner le lieu et appuyer sur Supprimer ne l'efface pas : \"" + apres + "\".\n" +
          "      C'est le geste de n'importe quel editeur de texte, sur une page faite pour\n" +
          "      ressembler a un document qu'on edite."
        );
      }
    }

    // --- 2. ET LE CHAMP VIDE RESTE CLIQUABLE ----------------------------
    //
    // Sinon effacer est sans retour : il n'y a plus rien ou cliquer pour
    // remettre quelque chose.
    const restant = await page.evaluate(() => {
      const spans = [...document.querySelectorAll("[data-cvf-e]")];
      const vides = spans.filter((s) => !(s.textContent || "").replace(/\./g, "").trim());
      return vides.map((s) => {
        const r = s.getBoundingClientRect();
        const pointille = s.querySelector(".cvf-no-print");
        return { w: Math.round(r.width), h: Math.round(r.height), pointille: !!pointille };
      });
    });
    if (!restant.length) {
      failures.push(
        "une fois vide, le champ n'est plus dans la page : rien a cliquer pour le remplir.\n" +
        "      Effacer devient irreversible, sauf a connaitre Ctrl+Z."
      );
    } else {
      const atteignable = restant.some((v) => v.w >= 6 && v.h >= 6);
      if (!atteignable) {
        failures.push("le champ vide mesure moins de six pixels : il existe sans etre cliquable");
      }
      if (!restant.some((v) => v.pointille)) {
        failures.push(
          "le champ vide ne porte pas le pointille marque cvf-no-print.\n" +
          "      Soit il ne se signale pas, soit il partira dans le PDF du recruteur."
        );
      }
    }

    // --- 3. UN MOT AU MILIEU, PAS TOUTE LA LIGNE ------------------------
    const titre = champ(page, "Client Advisor");
    if (await titre.count()) {
      await titre.evaluate((el) => {
        const noeud = el.firstChild;
        const r = document.createRange();
        // "Client " : les sept premiers caracteres, le reste doit survivre.
        r.setStart(noeud, 0);
        r.setEnd(noeud, 7);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
      });
      await page.keyboard.press("Delete");
      await page.waitForTimeout(600);
      const t = await lire(page, "title");
      if (t !== "Advisor") {
        failures.push(
          "supprimer une partie du champ emporte autre chose que la selection : \"" + t + "\"\n" +
          "      au lieu de \"Advisor\"."
        );
      }
    }

    if (erreurs.length) failures.push("erreur de page : " + erreurs[0]);
    await ctx.close();

    if (!failures.length) {
      console.log("      selectionner et supprimer efface, la selection seule, et le champ vide reste cliquable");
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
