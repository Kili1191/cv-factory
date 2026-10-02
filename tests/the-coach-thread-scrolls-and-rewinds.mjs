// REMONTER LE FIL, ET REPRENDRE UN CHANGEMENT PRECIS
//
// Kilian, le 2 octobre 2026, deux demandes dans la meme phrase, et chacune
// repondait a un defaut reel.
//
// 1. "POUVOIR SCROLLER LA CONVERSATION"
//
// Le conteneur du fil portait justifyContent:"flex-end". L'effet voulu est
// bon, une conversation courte se colle a la zone de saisie au lieu de
// flotter en haut d'un grand vide, et il casse des que le fil depasse la
// hauteur : le debordement d'un conteneur en flex-end part vers le HAUT, et
// aucun defilement ne le ramene. Les premiers messages devenaient
// inatteignables, sans que rien ne le signale.
//
// 2. "REVENIR A UNE PUCE ECRITE AVANT, ET CHOISIR QUELLE VERSION"
//
// Interroge sur une puce qu'il venait lui-meme de reecrire, le coach a
// repondu qu'il n'avait "pas de trace d'une version precedente" et a demande
// a Kilian de retaper l'original. L'etat d'avant existait : il est pris
// juste avant d'appliquer, pour Annuler. Mais Annuler ne reprend que le
// DERNIER changement, et dans une conversation on revient souvent sur
// l'avant-dernier.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

const PREMIER = "First reply from Nuvi, the one that must stay reachable at the top.";

function reponse(texte, bullet) {
  return JSON.stringify({
    reply: texte,
    operations: [{ op: "replace", path: "/experience/0/bullets/0", value: bullet }],
  });
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const erreurs = [];
    page.on("pageerror", (e) => erreurs.push(e.message.split("\n")[0].slice(0, 90)));
    await seedApp(page, SAMPLE_CV, { locale: "en" });

    let tour = 0;
    await page.route("**/api/claude", (r) => {
      tour += 1;
      const texte = tour === 1 ? PREMIER : "Reply number " + tour + ".";
      return r.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ content: [{ type: "text",
          text: reponse(texte, "Bullet written on turn " + tour) }] }) });
    });

    await page.evaluate(() => window.__nuviOpenModal("open-coach"));
    await page.waitForTimeout(1200);
    const champ = page.locator("textarea").last();
    if (!(await champ.count())) {
      failures.push("le Coach n'offre pas de champ de saisie");
    } else {
      // Assez de tours pour que le fil depasse la hauteur du panneau.
      for (let i = 1; i <= 6; i += 1) {
        await champ.fill("rewrite my first bullet, attempt " + i);
        await champ.press("Enter");
        await page.waitForTimeout(1500);
      }

      // --- 1. LE HAUT DU FIL EST ATTEIGNABLE ---------------------------
      const fil = await page.evaluate(() => {
        // On vise le fil par son CONTENU : l'apercu du CV defile aussi, et
        // prendre "le dernier conteneur qui deborde" mesurait la feuille au
        // lieu de la conversation. Le test passait alors pour une raison qui
        // n'avait rien a voir avec ce qu'il affirme.
        const el = [...document.querySelectorAll("div")].find((n) => {
          const st = getComputedStyle(n);
          return st.overflowY === "auto"
            && n.scrollHeight > n.clientHeight + 20
            && (n.innerText || "").includes("reachable at the top");
        });
        if (!el) return null;
        el.scrollTop = 0;
        // innerText rend TOUT le texte du conteneur, visible ou non : le
        // chercher la ne prouverait rien. On mesure la position de la bulle
        // dans la fenetre du conteneur, une fois remonte en haut.
        const cadre = el.getBoundingClientRect();
        let dedans = false;
        for (const n of el.querySelectorAll("div")) {
          if (!(n.textContent || "").includes("reachable at the top")) continue;
          const r = n.getBoundingClientRect();
          if (r.top >= cadre.top - 2 && r.bottom <= cadre.bottom + 2) { dedans = true; break; }
        }
        return { haut: el.scrollTop, premierVisible: dedans };
      });
      if (!fil) {
        failures.push(
          "le fil ne se trouve pas comme une zone qui deborde ET qui contient le premier\n" +
          "      message. Sous justifyContent:\"flex-end\" c'est exactement ce qu'on observe :\n" +
          "      le haut du fil est hors du conteneur et hors d'atteinte."
        );
      } else {
        if (fil.haut !== 0) {
          failures.push(
            "le fil refuse de remonter en haut (scrollTop reste a " + fil.haut + ").\n" +
            "      C'est le defaut de justifyContent:\"flex-end\" sur un conteneur qui defile :\n" +
            "      le debordement part vers le haut et aucun defilement ne le ramene."
          );
        }
        if (!fil.premierVisible) {
          failures.push(
            "le premier message n'est pas visible une fois remonte en haut du fil.\n" +
            "      Les premiers echanges sont perdus pour la personne."
          );
        }
      }

      // --- 2. CHAQUE CHANGEMENT SE REPREND INDIVIDUELLEMENT ------------
      const boutons = page.getByRole("button", { name: /put this version back/i });
      const combien = await boutons.count();
      if (combien < 2) {
        failures.push(
          "seuls " + combien + " changement(s) offrent de revenir en arriere.\n" +
          "      Annuler ne reprend que le dernier ; la demande est de choisir lequel."
        );
      } else {
        // Le deuxieme bouton en partant du haut remet l'etat d'avant le
        // deuxieme tour : la puce doit redevenir celle du premier.
        await boutons.nth(1).click({ timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(1200);
        const puce = await page.evaluate(() => {
          try {
            const c = JSON.parse(localStorage.getItem("cvf_d") || "{}");
            return ((c.experience || [])[0] || {}).bullets?.[0] || "";
          } catch { return ""; }
        });
        if (puce !== "Bullet written on turn 1") {
          failures.push(
            "remettre la version d'avant le deuxieme tour ne rend pas la puce du premier.\n" +
            "      Lu : \"" + puce + "\"."
          );
        }
      }
      // --- 3. LE STOCKAGE PLEIN NE FAIT PAS DISPARAITRE LE BOUTON ------
      //
      // Chez quelqu'un dont le navigateur est deja plein de son CV, de ses
      // versions et de ses candidatures, l'ecriture est refusee. La premiere
      // version rendait alors null et n'affichait aucun bouton, sans un mot :
      // le correctif reproduisait la panne qu'il corrigeait.
      {
        const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page2 = await ctx2.newPage();
        await seedApp(page2, SAMPLE_CV, { locale: "en" });
        let t2 = 0;
        await page2.route("**/api/claude", (r) => {
          t2 += 1;
          return r.fulfill({ status: 200, contentType: "application/json",
            body: JSON.stringify({ content: [{ type: "text",
              text: reponse("Reply " + t2 + ".", "Bullet on turn " + t2) }] }) });
        });
        // Le stockage refuse tout, comme un quota plein.
        await page2.evaluate(() => {
          const vrai = Storage.prototype.setItem;
          Storage.prototype.setItem = function (k, v) {
            if (String(k) === "cvf_coach_avant") throw new Error("QuotaExceededError");
            return vrai.call(this, k, v);
          };
        });
        await page2.evaluate(() => window.__nuviOpenModal("open-coach"));
        await page2.waitForTimeout(1000);
        const champ2 = page2.locator("textarea").last();
        await champ2.fill("rewrite my first bullet");
        await champ2.press("Enter");
        await page2.waitForTimeout(2500);
        const n = await page2.getByRole("button", { name: /put this version back/i }).count();
        if (n < 1) {
          failures.push(
            "quand le stockage refuse l'ecriture, aucun bouton n'apparait.\n" +
            "      La personne ne peut plus revenir en arriere, et rien ne lui dit pourquoi."
          );
        }
        await ctx2.close();
      }

      if (erreurs.length) failures.push("erreur de page : " + erreurs[0]);
    }
    await ctx.close();

    if (!failures.length) {
      console.log("      le fil remonte jusqu'au premier message, et chaque changement se reprend seul");
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
