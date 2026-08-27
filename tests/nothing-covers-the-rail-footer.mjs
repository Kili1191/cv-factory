// Rien ne doit recouvrir le bas de la barre laterale.
//
// LE DEFAUT QU'IL EMPECHE
//
// Le bouton Telecharger est en position fixe, en bas a gauche, avec un
// z-index superieur a celui de la barre. Repliee, la barre fait 56px et le
// bouton passe a cote. Deployee, elle fait 240px - et le bouton se pose
// DESSUS, coupant le libelle des dernieres entrees.
//
// Rien ne le signale : pas d'erreur, pas de log, le build passe, les autres
// tests passent. Il faut regarder l'ecran, la barre ouverte. C'est ainsi
// qu'on l'a trouve, et c'est pour ca que ce test existe.
//
// CE QU'IL FAIT DE PLUS QU'UN CLIC
//
// Il ne se contente pas de tester le centre de chaque entree : le centre est
// l'icone, et l'icone n'etait justement PAS recouverte - seul le texte, a
// droite, disparaissait. Un test au centre aurait donc dit "tout va bien"
// pendant que le libelle etait illisible. Il balaie donc toute la largeur.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await seedApp(page, SAMPLE_CV);

    // Balaie une entree sur toute sa largeur et rend ce qui la recouvre.
    const balayer = async () => page.evaluate(() => {
      const rail = document.querySelector("aside");
      if (!rail) return { absent: true };
      const rows = [...rail.querySelectorAll('[role="button"]')];
      const bas = rows.slice(-3); // les dernieres entrees : Rejouer, Reglages, Compte
      const out = [];
      for (const row of bas) {
        const r = row.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        for (let f = 0.1; f <= 0.95; f += 0.1) {
          const x = r.x + r.width * f;
          const y = r.y + r.height / 2;
          const sur = document.elementFromPoint(x, y);
          if (sur && !row.contains(sur) && sur !== row) {
            out.push({
              entree: (row.getAttribute("aria-label") || row.innerText || "?").slice(0, 24),
              par: (sur.getAttribute("aria-label") || sur.innerText || sur.tagName).trim().slice(0, 24),
            });
            break;
          }
        }
      }
      return { largeur: Math.round(rail.getBoundingClientRect().width), bloques: out };
    });

    // LE CURSEUR DOIT ETRE AILLEURS AVANT DE MESURER L'ETAT REPLIE
    //
    // Playwright demarre sa souris en (0,0) - c'est-a-dire SUR la barre, qui
    // s'ouvre au survol. Le test mesurait donc une barre deja ouverte et
    // croyait qu'elle ne s'ouvrait plus. Il passait ici et rougissait en CI,
    // selon l'endroit ou le curseur avait fini sa course.
    //
    // On l'ecarte explicitement, et on attend la fin de l'animation.
    await page.mouse.move(1200, 450);
    await page.waitForTimeout(900);

    const replie = await balayer();
    if (replie.absent) {
      failures.push("la barre laterale n'existe plus : ce test ne verifie plus rien");
    } else if (replie.bloques.length) {
      for (const b of replie.bloques) {
        failures.push(`barre repliee : "${b.entree}" est recouverte par "${b.par}"`);
      }
    }

    // Deploie la barre en la survolant, comme le fait un utilisateur.
    await page.locator("aside").first().hover({ position: { x: 25, y: 300 } });
    await page.waitForTimeout(1200);

    const deploye = await balayer();
    if (!deploye.absent) {
      if (deploye.largeur <= (replie.largeur || 0)) {
        failures.push(
          `la barre ne s'ouvre plus au survol (${replie.largeur}px -> ${deploye.largeur}px) : `
          + "le test ne verifie donc plus l'etat ou le defaut apparaissait"
        );
      }
      for (const b of deploye.bloques) {
        failures.push(
          `barre ouverte : "${b.entree}" est recouverte par "${b.par}". `
          + "Le libelle devient illisible des qu'on survole la barre."
        );
      }
    }

    // --- LA BARRE OUVERTE NE MANGE PAS LE NOM DU DOCUMENT -------------
    //
    // Se poser au-dessus a regle le vrai probleme - le CV ne se decale plus
    // au survol. Mais la ligne d'en-tete commence bien plus a gauche que le
    // document, et elle, se faisait avaler : sur une capture d'utilisateur,
    // "Kilian Maisonnette" se lisait "ette". Le CV etait intact, le titre du
    // document illisible, et rien ne le signalait.
    {
      const lire = () => page.evaluate(() => {
        const cv = document.querySelector('[data-cvf="cv"]');
        const rail = document.querySelector("aside");
        // Le nom du document est le premier texte serif de la bande du haut.
        const spans = [...document.querySelectorAll("span")];
        // Hors de la barre : son propre logo "Nuvi" est serif lui aussi et
        // se trouve tout en haut, donc il repondait a la place du nom du CV.
        const nom = spans.find((x) => !x.closest("aside")
          && /Fraunces|serif/i.test(getComputedStyle(x).fontFamily)
          && x.getBoundingClientRect().top < 90
          && x.getBoundingClientRect().width > 30);
        return {
          nom: nom ? Math.round(nom.getBoundingClientRect().left) : null,
          rail: rail ? Math.round(rail.getBoundingClientRect().right) : null,
          cv: cv ? Math.round(cv.getBoundingClientRect().left) : null,
        };
      });

      const replie = await lire();
      await page.hover("aside");
      await page.waitForTimeout(700);
      const ouvert = await lire();

      if (ouvert.nom !== null && ouvert.rail !== null && ouvert.nom < ouvert.rail) {
        failures.push(
          "barre ouverte : le nom du document commence a " + ouvert.nom + "px, "
          + "sous une barre qui va jusqu'a " + ouvert.rail + "px. Le titre du CV "
          + "est donc ampute - on lit la fin d'un nom sans savoir quel document "
          + "on edite."
        );
      }
      // Et le document, lui, ne doit toujours pas bouger : c'est la raison
      // d'etre du recouvrement, et le corriger d'un cote ne doit pas le
      // casser de l'autre.
      if (replie.cv !== null && replie.cv !== ouvert.cv) {
        failures.push(
          "le CV se decale de " + replie.cv + "px a " + ouvert.cv + "px quand la "
          + "barre s'ouvre. C'est exactement ce que le recouvrement devait "
          + "supprimer."
        );
      }
    }

    await ctx.close();
    if (!failures.length) {
      console.log(`      bas de barre libre, repliee (${replie.largeur}px) comme ouverte (${deploye.largeur}px)`);
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
