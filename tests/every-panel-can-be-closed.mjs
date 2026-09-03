// Toute fenetre qui s'ouvre se referme, et sa croix se comporte comme un
// bouton.
//
// LE SIGNALEMENT
//
// "quand le curseur veut fermer une fenetre ca veut pas ca met pas la main
// pour fermer" - releve sur la version en production, sans dire laquelle des
// vingt-huit fenetres. C'est ce qui rend ce defaut interessant : le chercher
// a la lecture revient a relire vingt-huit composants en esperant reconnaitre
// celui qui manque, et le curseur vient d'un raccourci partage, B(), qui pose
// deja cursor:pointer. Le code a l'air juste partout.
//
// LES TROIS FACONS DONT UNE CROIX CESSE D'ETRE UN BOUTON
//
//   1. Elle n'a pas cursor:pointer. La seule que le signalement nomme, et la
//      moins probable puisque B() le pose.
//   2. Quelque chose la recouvre. Le curseur reste une fleche et le clic
//      atteint la couche du dessus : un degrade decoratif, un en-tete colle,
//      un halo de verre pose apres coup. Rien dans le composant de la croix
//      ne le montre.
//   3. Elle est bien cliquee et la fenetre reste ouverte.
//
// Les trois donnent le meme symptome vu de la chaise : "ca veut pas fermer".
// On les mesure donc toutes les trois, dans le navigateur, sur chaque fenetre
// que l'application sait ouvrir.
//
// CE QUI SE MESURE VRAIMENT
//
// elementFromPoint au centre de la croix : c'est ce que le navigateur
// atteindra au clic, donc c'est ce qui decide, et c'est la seule facon de
// voir un recouvrement. Puis un vrai clic, et on regarde si la fenetre est
// partie.
//
// LA REGLE EST INVERSEE, ET C'EST CE QUI LA REND SURE
//
// Deux versions de ce fichier ont accuse le produit de leur propre defaut.
// La premiere ouvrait une seconde fenetre par-dessus la premiere en cherchant
// un sous-menu, puis mesurait la croix du dessous : recouverte, evidemment,
// par la fenetre du dessus. La seconde ne mesurait que la derniere croix du
// document, en supposant que l'ordre du DOM donne l'ordre d'empilement. Il ne
// le donne pas : un tiroir ferme reste dans le document, apres la fenetre
// ouverte, et sa croix est hors de l'ecran. Message precis, convaincant, et
// faux : "Why nobody answers", ouverte seule et regardee a la main, repond
// parfaitement.
//
// Les deux fois, l'erreur etait de designer UNE croix et de la juger. On ne
// sait pas laquelle est devant, et le savoir demanderait de reimplementer
// l'empilement CSS dans le test.
//
// On demande donc l'inverse, ce qui ne demande de designer personne :
//
//   quand une fenetre est ouverte, AU MOINS UNE croix doit etre
//   veritablement atteignable, et un clic dessus doit refermer.
//
// Plusieurs croix presentes dont une seule joignable, c'est le comportement
// normal d'une pile de fenetres. Zero croix joignable alors qu'une fenetre
// est ouverte, c'est le defaut signale, et il n'y a pas de troisieme lecture.

import { startServer, stopServer, launchBrowser, seedApp } from "./lib/harness.mjs";

// Les entrees de la barre laterale qui ouvrent une fenetre. Les libelles sont
// ceux de l'interface anglaise, epinglee par seedApp, et releves dans le
// navigateur plutot que recopies du dictionnaire : une entree renommee doit
// faire echouer le test sur son compte final, pas le faire passer a vide.
const ENTREES = [
  "Coach", "Tweak", "Why nobody answers", "Find a role", "Match",
  "Application Pack", "Live interview", "Score & Audits", "My CVs",
  "Design", "Applications", "Settings",
];

const A_UNE_CROIX = `!!document.querySelector('[aria-label="close" i], [aria-label*="Close" i], [aria-label*="Fermer" i], [data-nuvi-close]')`;

const SONDE = `(() => {
  const tous = [...document.querySelectorAll(
    '[aria-label="close" i], [aria-label*="Close" i], [aria-label*="Fermer" i], [data-nuvi-close]')];
  const out = [];
  for (const b of tous) {
    const r = b.getBoundingClientRect();
    if (r.width < 6 || r.height < 6) continue;
    const cs = getComputedStyle(b);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const dedans = x >= 0 && y >= 0 && x < window.innerWidth && y < window.innerHeight;
    const dessus = dedans ? document.elementFromPoint(x, y) : null;
    out.push({
      curseur: cs.cursor,
      taille: Math.round(r.width) + "x" + Math.round(r.height),
      // Joignable : le point que le navigateur atteindra au clic tombe sur
      // la croix ou sur le signe qu'elle contient.
      joignable: !!dessus && (dessus === b || b.contains(dessus)),
      dessus: dessus ? (dessus.tagName.toLowerCase()
        + (dessus.className && dessus.className.baseVal === undefined
           ? "." + String(dessus.className).trim().split(/\s+/)[0] : "")) : "hors ecran",
    });
  }
  return out;
})()`;

// "Score & Audits" porte une esperluette, que RegExp lit comme un motif.
function echapper(t) { return t.replace(/[.*+?^${}()|[\]\\&]/g, "\\$&"); }

async function ouvrir(page, libelle) {
  const e = page.locator('[role="button"], button')
    .filter({ hasText: new RegExp("^\\s*" + echapper(libelle) + "\\s*$", "i") }).first();
  if (await e.count() === 0) return false;
  await e.click({ timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(900);

  // PLUSIEURS ENTREES DEPLOIENT UN SOUS-MENU AU LIEU D'OUVRIR
  //
  // "Score & Audits" et "My CVs" en tete. Sans ce second clic, le test
  // traverserait la moitie de la barre sans jamais voir une fenetre, et son
  // compte final le dirait - mais on veut les mesurer, pas les compter.
  if (!(await page.evaluate(A_UNE_CROIX))) {
    const sous = page.locator('[role="button"], button');
    const n = Math.min(await sous.count(), 60);
    for (let i = 0; i < n; i += 1) {
      const t = (await sous.nth(i).innerText().catch(() => "")).trim();
      if (!t || t.length > 24 || ENTREES.includes(t)) continue;
      if (["Home", "Reset", "Download", "Edit"].includes(t)) continue;
      await sous.nth(i).click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(700);
      if (await page.evaluate(A_UNE_CROIX)) break;
    }
  }
  return true;
}

// Une croix visible au moment ou l'on regarde : les deux servent a savoir si
// l'entree a ouvert quelque chose, pas a mesurer.

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => failures.push("erreur JavaScript : " + e.message.split("\n")[0].slice(0, 90)));
    // Aucun appel ne part : on ouvre des fenetres, on ne fait pas travailler
    // le modele.
    await page.route("**/api/claude", (r) => r.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ content: [{ type: "text", text: "{}" }] }),
    }));
    await seedApp(page, undefined, { locale: "en" });

    // Sortir de tout ce qui est ouvert, jusqu'a ce qu'il ne reste rien. Sans
    // cela, la fenetre suivante s'ouvre par-dessus et tout ce qu'on mesure
    // ensuite porte sur une croix legitimement cachee.
    // On sort par la croix, comme une personne, et Echap ne sert que de
    // secours. Toutes les fenetres ne repondent pas a Echap, et exiger les
    // deux ici ferait echouer le nettoyage plutot que la mesure : le message
    // parlerait alors de la fenetre suivante, pas de la fautive.
    const CLIC_CROIX = `(() => {
      const tous = [...document.querySelectorAll(
        '[aria-label="close" i], [aria-label*="Close" i], [aria-label*="Fermer" i], [data-nuvi-close]')];
      for (const b of tous) {
        const r = b.getBoundingClientRect();
        if (r.width < 6 || r.height < 6) continue;
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) continue;
        const d = document.elementFromPoint(x, y);
        if (d && (d === b || b.contains(d))) { b.click(); return true; }
      }
      return false;
    })()`;

    const toutFermer = async () => {
      for (let i = 0; i < 8; i += 1) {
        if (!(await page.evaluate(A_UNE_CROIX))) return true;
        const clique = await page.evaluate(CLIC_CROIX);
        if (!clique) await page.keyboard.press("Escape").catch(() => {});
        await page.waitForTimeout(500);
      }
      return !(await page.evaluate(A_UNE_CROIX));
    };

    let ouvertes = 0;
    for (const libelle of ENTREES) {
      if (!(await toutFermer())) {
        failures.push("avant \"" + libelle + "\", une fenetre refuse de se "
          + "fermer meme a la touche Echap : tout ce qui suit se mesurerait "
          + "a travers elle.");
        break;
      }
      if (!(await ouvrir(page, libelle))) continue;

      const croix = await page.evaluate(SONDE);
      if (!croix.length) {
        // Toutes les entrees n'ouvrent pas une fenetre a croix : certaines
        // basculent un panneau lateral. On ne compte que ce qu'on a vu.
        continue;
      }
      ouvertes += 1;

      const joignables = croix.filter((c) => c.joignable);
      if (!joignables.length) {
        failures.push("\"" + libelle + "\" est ouverte et aucune de ses "
          + croix.length + " croix n'est atteignable au clic : "
          + croix.map((c) => c.dessus).join(", ") + " se trouve(nt) devant. "
          + "De la chaise, la fenetre ne se ferme pas.");
      }
      for (const c of joignables) {
        if (c.curseur !== "pointer") {
          failures.push("\"" + libelle + "\" : la croix affiche le curseur \""
            + c.curseur + "\" au lieu de la main. Rien ne dit qu'elle se "
            + "clique, et c'est le premier geste que fait quelqu'un qui veut "
            + "sortir.");
        }
      }

      // ET ELLE FERME VRAIMENT
      //
      // Compte des croix avant et apres : une fenetre qui part en emmene la
      // sienne. Le clic va sur la croix joignable, pas sur la premiere du
      // document, qui peut etre celle d'un tiroir ferme.
      const avant = croix.length;
      await page.evaluate(CLIC_CROIX);
      await page.waitForTimeout(800);
      const apres = (await page.evaluate(SONDE)).length;
      if (joignables.length && apres >= avant) {
        failures.push("\"" + libelle + "\" : la croix est cliquee et la "
          + "fenetre est toujours la.");
      }
    }

    if (ouvertes < 5) {
      failures.push("seulement " + ouvertes + " fenetre(s) ouverte(s) : le "
        + "test ne balaie plus ce qu'il croit balayer, sans doute parce que "
        + "les libelles de la barre laterale ont change.");
    } else if (!failures.length) {
      console.log("      " + ouvertes + " fenetres : croix visible, cliquable, "
        + "et qui ferme");
    }

    await ctx.close();
  } catch (err) {
    failures.push("le test lui-meme a plante : " + (err && err.message));
  } finally {
    await browser.close();
    await stopServer(server);
  }

  return failures;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((f) => {
    for (const l of f) console.log("ECHEC " + l);
    process.exit(f.length ? 1 : 0);
  });
}
