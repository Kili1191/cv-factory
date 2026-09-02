// Aucun texte de l'interface n'est eclairci par une opacite.
//
// LE DEFAUT QUE CE TEST EMPECHE, ET POURQUOI IL ECHAPPAIT AU RESTE
//
// La signature sous le logo, sur telephone, portait une encre quasi noire,
// rgb(10,10,10), et une opacite de 0,65. Les deux ensemble donnent un gris
// moyen sur un entete en verre clair, en corps 9,5.
//
// the-interface-can-be-read mesure tout texte visible et ne l'a jamais vu.
// C'est structurel, pas un oubli : ce controle compare une COULEUR DE TEXTE
// declaree a une COULEUR DE FOND declaree. Il lisait donc rgb(10,10,10) sur
// un fond clair, calculait environ 19:1, et passait au vert. Ce qui
// s'affichait tenait 4:1, sous le plancher de 4,5.
//
// Une opacite n'est pas une couleur. Elle ne se lit dans aucune des deux
// valeurs comparees, et elle divise pourtant le contraste reel.
//
// POURQUOI CE TEST NE MESURE PAS DE CONTRASTE
//
// La premiere version photographiait l'ecran et relisait les pixels affiches.
// Elle trouve bien le defaut, et elle se trompe aussi : en corps 10, le
// lissage des caracteres empeche les pixels d'atteindre la couleur nominale,
// et un intitule a 6,35:1 se mesure vers 4,3. Rendue bloquante, elle aurait
// crie sur des textes parfaitement lisibles, et un test qui crie pour rien
// finit ignore.
//
// On garde donc la cause plutot que le symptome. La regle est nette, sans
// seuil a debattre : le texte de l'interface prend une couleur, pas une
// transparence. Les encres du produit sont calibrees pour tenir 4,5:1 sur ses
// fonds ; les eclaircir apres coup defait ce calibrage en silence.
//
// CE QUI RESTE PERMIS
//
// Le CV lui-meme. Ses gabarits gerent leur propre palette, creme sur colonne
// sombre, et ce qu'ils impriment est verifie autrement : le PDF est exporte
// puis relu par de vrais analyseurs. Trois textes y vivent a 0,65 et 0,9 sans
// que ce soit un defaut.
//
// Les transitions aussi : un bloc qui apparait passe par des valeurs
// intermediaires. Le seuil de 0,92 les laisse tranquilles, et un texte
// reellement eclairci descend bien plus bas.

import { startServer, stopServer, launchBrowser, seedApp } from "./lib/harness.mjs";

// En dessous, l'opacite n'est plus un effet de transition mais un choix de
// teinte, et ce choix appartient a la couleur.
const PLANCHER = 0.92;

const SCAN = (page) => page.evaluate((plancher) => {
  const out = [];
  for (const e of document.querySelectorAll("*")) {
    // Les feuilles qui portent des mots : un conteneur herite l'opacite de
    // ses enfants et les compterait deux fois.
    if (e.children.length || (e.textContent || "").trim().length < 3) continue;
    const b = e.getBoundingClientRect();
    if (b.width < 8 || b.height < 6 || b.top > window.innerHeight || b.bottom < 0) continue;
    const cs = getComputedStyle(e);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    // Le CV a ses propres regles, et son rendu se verifie a l'export.
    if (e.closest('[data-cvf="cv"]')) continue;

    // L'opacite se multiplie le long de la chaine : 0,8 sous 0,8 fait 0,64.
    let o = 1;
    let n = e;
    while (n && n.tagName !== "HTML") {
      const v = Number(getComputedStyle(n).opacity);
      if (Number.isFinite(v) && v < 1) o *= v;
      n = n.parentElement;
    }
    // Zero veut dire cache, pas eclairci : ce n'est pas le defaut vise.
    if (o > 0.001 && o < plancher) {
      out.push({
        texte: (e.textContent || "").trim().slice(0, 40),
        taille: Math.round(parseFloat(cs.fontSize)),
        couleur: cs.color,
        opacite: Math.round(o * 100) / 100,
      });
    }
  }
  return out;
}, PLANCHER);

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    // Les deux tailles comptent : la signature fautive ne s'affichait que sur
    // l'entete du telephone, absent de l'ecran d'ordinateur.
    for (const [nom, vp] of [
      ["telephone", { width: 390, height: 844 }],
      ["ordinateur", { width: 1440, height: 900 }],
    ]) {
      const ctx = await browser.newContext({ viewport: vp });
      const page = await ctx.newPage();
      await seedApp(page, undefined, { locale: "en" });
      await page.waitForTimeout(600);

      const vus = await SCAN(page);
      for (const v of vus) {
        failures.push(
          nom + " : \"" + v.texte + "\" (" + v.taille + "px, " + v.couleur
          + ") est eclairci par une opacite de " + v.opacite + ". La couleur "
          + "declaree reste sombre, donc le controle de contraste la lit comme "
          + "lisible et ce qui s'affiche ne l'est pas. Prendre une encre plus "
          + "claire plutot qu'une transparence."
        );
      }
      await ctx.close();
    }

    if (!failures.length) {
      console.log("      aucun texte d'interface eclairci par une opacite");
    }
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
