// Rien ne doit recouvrir le bas de la barre laterale.
//
// LE DEFAUT QU'IL EMPECHE
//
// Le bouton Telecharger est en position fixe, avec un z-index superieur a
// celui de la barre. Quand la barre etait un rail de 56px, il passait a cote ;
// des qu'elle s'ouvrait a 240px, il se posait DESSUS et coupait le libelle des
// dernieres entrees : Rejouer, Reglages, Compte.
//
// Rien ne le signale : pas d'erreur, pas de log, le build passe, les autres
// tests passent. Il faut regarder l'ecran. C'est ainsi qu'on l'a trouve, et
// c'est pour ca que ce test existe.
//
// CE QUI A CHANGE, ET POURQUOI LE TEST RESTE
//
// La barre ne se deplie plus au survol : elle est large en permanence, avec
// ses libelles lisibles sans rien survoler. L'etat ou le defaut apparaissait
// est donc devenu l'etat NORMAL, et ce controle compte davantage qu'avant, pas
// moins.
//
// Une version precedente cherchait ses entrees avec [role="button"]. La barre
// utilise maintenant de vrais <button>, et ce selecteur ne trouvait plus rien
// : le test passait en ne verifiant plus AUCUNE ligne. C'est le pire mode
// d'echec possible, et la raison pour laquelle il compte desormais ce qu'il a
// balaye et echoue s'il n'a rien trouve.
//
// CE QU'IL FAIT DE PLUS QU'UN CLIC
//
// Il ne teste pas le centre de chaque entree : le centre est l'icone, et
// l'icone n'etait justement PAS recouverte - seul le texte, a droite,
// disparaissait. Un test au centre aurait dit "tout va bien" pendant que le
// libelle etait illisible. Il balaie donc toute la largeur.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await seedApp(page, SAMPLE_CV, { locale: "en" });

    const balayer = async () => page.evaluate(() => {
      const rail = document.querySelector("aside");
      if (!rail) return { absent: true };
      // data-nv-nav est pose par la barre elle-meme sur chacune de ses
      // entrees : il ne depend ni de la balise choisie ni du role ARIA, donc
      // il survit a une refonte, ce que [role="button"] n'avait pas fait.
      const rows = [...rail.querySelectorAll("[data-nv-nav]")];
      const bas = rows.slice(-3); // Rejouer, Reglages, Compte
      const out = [];
      let balayees = 0;
      for (const row of bas) {
        const r = row.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        balayees++;
        for (let f = 0.1; f <= 0.95; f += 0.1) {
          const sur = document.elementFromPoint(r.x + r.width * f, r.y + r.height / 2);
          if (sur && !row.contains(sur) && sur !== row) {
            out.push({
              entree: (row.innerText || row.getAttribute("data-nv-nav") || "?").trim().slice(0, 24),
              par: (sur.getAttribute("aria-label") || sur.innerText || sur.tagName).trim().slice(0, 24),
            });
            break;
          }
        }
      }
      return {
        largeur: Math.round(rail.getBoundingClientRect().width),
        bloques: out, balayees, total: rows.length,
      };
    });

    const vu = await balayer();
    if (vu.absent) {
      failures.push("la barre laterale n'existe plus : ce test ne verifie plus rien.");
    } else {
      // SANS CETTE LIGNE, LE TEST PEUT PASSER SUR RIEN
      if (vu.balayees < 2) {
        failures.push(
          "ce test n'a balaye que " + vu.balayees + " entree(s) sur " + vu.total
          + " : il ne verifie plus le bas de la barre, il se contente de ne "
          + "rien trouver."
        );
      }
      for (const b of vu.bloques) {
        failures.push('"' + b.entree + '" est recouverte par "' + b.par
          + '". Le libelle est illisible.');
      }
    }

    // --- LA BARRE NE MANGE PAS LE NOM DU DOCUMENT ---------------------
    //
    // Elle se posait AU-DESSUS du contenu quand elle s'ouvrait : sur une
    // capture d'utilisateur, "Kilian Maisonnette" se lisait "ette". Elle est
    // maintenant dans le flux, donc le nom doit commencer a sa droite.
    const pos = await page.evaluate(() => {
      const rail = document.querySelector("aside");
      const spans = [...document.querySelectorAll("span")];
      // Hors de la barre : son propre logo est serif lui aussi.
      const nom = spans.find((x) => !x.closest("aside")
        && /Fraunces|serif/i.test(getComputedStyle(x).fontFamily)
        && x.getBoundingClientRect().top < 90
        && x.getBoundingClientRect().width > 30);
      const cv = document.querySelector('[data-cvf="cv"]');
      return {
        nom: nom ? Math.round(nom.getBoundingClientRect().left) : null,
        rail: rail ? Math.round(rail.getBoundingClientRect().right) : null,
        cv: cv ? Math.round(cv.getBoundingClientRect().left) : null,
      };
    });
    if (pos.nom !== null && pos.rail !== null && pos.nom < pos.rail) {
      failures.push(
        "le nom du document commence a " + pos.nom + "px, sous une barre qui va "
        + "jusqu'a " + pos.rail + "px : le titre est ampute."
      );
    }

    // --- ET ELLE NE BOUGE PLUS, MEME SI ON LA SURVOLE -----------------
    //
    // C'est la garantie que la refonte apporte, et elle merite d'etre tenue
    // par un test : tant que la largeur ne depend plus du curseur, ni le CV ni
    // l'en-tete ne peuvent sauter sous les yeux de quelqu'un qui lit. Ce
    // controle echoue le jour ou quelqu'un remet l'ouverture au survol.
    await page.mouse.move(1200, 450);
    await page.waitForTimeout(400);
    const froid = await page.evaluate(() => ({
      rail: Math.round(document.querySelector("aside").getBoundingClientRect().width),
      cv: Math.round((document.querySelector('[data-cvf="cv"]') || {}).getBoundingClientRect
        ? document.querySelector('[data-cvf="cv"]').getBoundingClientRect().left : 0),
    }));
    await page.locator("aside").first().hover({ position: { x: 25, y: 300 } });
    await page.waitForTimeout(900);
    const chaud = await page.evaluate(() => ({
      rail: Math.round(document.querySelector("aside").getBoundingClientRect().width),
      cv: Math.round((document.querySelector('[data-cvf="cv"]') || {}).getBoundingClientRect
        ? document.querySelector('[data-cvf="cv"]').getBoundingClientRect().left : 0),
    }));
    if (froid.rail !== chaud.rail) {
      failures.push(
        "la barre change de largeur au survol (" + froid.rail + "px -> " + chaud.rail
        + "px). C'est ce qui faisait sauter le document sous les yeux, et ce "
        + "que la barre permanente devait supprimer."
      );
    }
    if (froid.cv !== chaud.cv) {
      failures.push(
        "le CV se decale de " + froid.cv + "px a " + chaud.cv + "px quand la souris "
        + "passe sur la barre."
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
