// Le document reste en place pendant que les trois temps se decouvrent.
//
// CE QUE CE TEST EMPECHE
//
// Cette section est la seule de la vitrine qui raconte quelque chose en
// bougeant : le document se fige a l'ecran, et les trois gestes de la
// personne, coller, attendre, envoyer, arrivent l'un apres l'autre pendant
// qu'on avance. Tout cela tient a trois declarations CSS, et chacune se
// desactive en silence.
//
//   - position: sticky ne colle a rien si un ancetre fabrique un conteneur
//     de defilement, ou si la piste n'est pas plus haute que l'ecran ;
//   - view-timeline-name ne sert a rien si la section perd sa classe ;
//   - animation-range mal placee joue la sequence en dehors de la fenetre
//     ou le bloc est colle, et on voit alors le texte s'allumer pendant que
//     la page defile, ce qui se lit comme un retard d'affichage.
//
// Aucun de ces trois cas ne casse quoi que ce soit. La page s'affiche, le
// texte est la, le CV est la. Il ne se passe simplement plus rien.
//
// C'EST EXACTEMENT LE DEFAUT QU'ON A DEJA EU
//
// Un effet de profondeur avait ete ajoute a cette page et ne bougeait pas
// d'un pixel : sa section portait overflow: hidden, ce qui en faisait un
// conteneur de defilement, et view() s'y mesurait contre quelque chose qui
// ne defile jamais. Le code etait juste, la cause etait deja ecrite dans le
// meme fichier, et il a fallu MESURER pour la voir. Lire ne suffit pas.
//
// On mesure donc les deux choses que la personne constate : le bloc tient sa
// position pendant qu'on avance, et les trois temps n'arrivent pas ensemble.

import { startServer, stopServer, launchBrowser, BASE_URL } from "./lib/harness.mjs";

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    // Au-dessus de 900px : en dessous la grille repasse a une colonne et la
    // sequence est volontairement desactivee.
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL + "/", { waitUntil: "load" });
    await page.waitForTimeout(800);

    const present = await page.evaluate(() => ({
      supporte: CSS.supports("animation-timeline: view()"),
      piste: !!document.querySelector(".nuvi-piste-doc"),
      colle: !!document.querySelector(".nuvi-piste-colle"),
      temps: document.querySelectorAll(".nuvi-temps").length,
    }));

    if (!present.piste || !present.colle) {
      failures.push(
        "la section du document n'a plus sa piste (.nuvi-piste-doc) ou son "
        + "bloc collant (.nuvi-piste-colle) : la sequence ne peut plus avoir "
        + "lieu."
      );
    } else if (present.temps !== 3) {
      failures.push(
        present.temps + " temps affiche(s) au lieu de 3 : la liste des gestes "
        + "a change de forme, la sequence ne decrit plus ce que fait la "
        + "personne."
      );
    } else if (!present.supporte) {
      failures.push(
        "ce navigateur ne connait pas animation-timeline : le test ne peut "
        + "rien affirmer sur cette sequence, et ne doit pas passer au vert."
      );
    } else {
      // On avance dans la piste par pas reguliers et on releve, a chaque
      // pas, la position du bloc a l'ecran et l'opacite des trois temps.
      const releves = await page.evaluate(async () => {
        const piste = document.querySelector(".nuvi-piste-doc");
        const colle = document.querySelector(".nuvi-piste-colle");
        const temps = [...document.querySelectorAll(".nuvi-temps")];
        const haut = piste.getBoundingClientRect().top + window.scrollY;
        const hauteur = piste.offsetHeight;
        const out = [];
        // Du moment ou la piste arrive en haut de l'ecran jusqu'a sa sortie.
        for (let i = 0; i <= 20; i++) {
          window.scrollTo(0, Math.round(haut + (hauteur * i) / 20));
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          out.push({
            y: window.scrollY,
            top: Math.round(colle.getBoundingClientRect().top),
            op: temps.map((t) => Number(getComputedStyle(t).opacity)),
            // L'opacite de la section elle-meme : c'est par la que cette
            // page s'est deja delavee deux fois.
            section: Number(getComputedStyle(piste).opacity),
          });
        }
        return { hauteur, ecran: window.innerHeight, releves: out };
      });

      const pas = releves.releves;

      // 1. LA PISTE DOIT ETRE PLUS HAUTE QUE L'ECRAN
      // Sans surplus, il n'y a rien a tenir en place : sticky se comporte
      // comme static et personne ne voit de difference.
      if (releves.hauteur <= releves.ecran) {
        failures.push(
          "la piste fait " + releves.hauteur + "px pour un ecran de "
          + releves.ecran + "px : sans hauteur en trop, le bloc n'a nulle "
          + "part ou coller et la sequence ne se joue jamais."
        );
      }

      // 2. LE BLOC TIENT SA POSITION
      // Colle, il garde le meme haut a l'ecran sur une bonne partie de la
      // piste. On compte les pas ou il ne bouge plus.
      const tops = pas.map((p) => p.top);
      const tenus = tops.filter((t, i) => i > 0 && Math.abs(t - tops[i - 1]) <= 2).length;
      if (tenus < 6) {
        failures.push(
          "le bloc ne tient sa position que sur " + tenus + " pas sur "
          + (pas.length - 1) + " : il defile avec la page au lieu de rester "
          + "en place. Position relevee : " + tops.join(", ")
        );
      }

      // 3. LES TROIS TEMPS N'ARRIVENT PAS ENSEMBLE
      // C'est la difference entre une sequence et un fondu : a un moment, le
      // premier est la et le troisieme n'y est pas encore.
      const decale = pas.some((p) => p.op[0] - p.op[2] > 0.4);
      if (!decale) {
        failures.push(
          "les trois temps ne se decalent jamais : a aucun moment le premier "
          + "n'est visible pendant que le troisieme ne l'est pas encore. La "
          + "sequence est devenue un fondu unique. Opacites relevees : "
          + pas.map((p) => "[" + p.op.map((o) => o.toFixed(2)).join(" ") + "]").join(" ")
        );
      }

      // 4. ILS ARRIVENT TOUS
      // Une plage mal placee peut laisser le dernier temps a zero pour
      // toujours : le texte serait alors simplement invisible.
      const arrives = [0, 1, 2].filter((i) => pas.some((p) => p.op[i] > 0.9));
      if (arrives.length !== 3) {
        failures.push(
          "seuls les temps " + arrives.join(", ") + " atteignent leur pleine "
          + "opacite : les autres restent invisibles quoi qu'on fasse, donc "
          + "illisibles."
        );
      }

      // 5. LA SECTION N'EST PAS DELAVEE LA OU ON LA LIT
      // Un fondu d'entree dont la plage se mesure sur la traversee complete
      // du bloc finit d'autant plus tard que le bloc est haut. Celui-ci fait
      // plus de deux ecrans : le fondu s'y terminerait bien apres l'endroit
      // ou la personne lit. C'est arrive deux fois sur cette page.
      const pale = pas.filter((p) => p.section < 0.99);
      if (pale.length) {
        failures.push(
          "la section est a " + pale[0].section.toFixed(2) + " d'opacite "
          + "pendant qu'on la lit : un fondu d'entree est calcule sur toute "
          + "sa hauteur, et elle est trop haute pour ca. Elle se lit delavee."
        );
      }

      if (!failures.length) {
        console.log(
          "      le bloc tient sur " + tenus + " pas, les trois temps "
          + "arrivent l'un apres l'autre"
        );
      }
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
