// Coller une annonce suffit pour obtenir un CV.
//
// LE DEFAUT, TEL QUE KILIAN L'A VU
//
// Une capture de thenuvi.com/app : l'annonce est collee, entiere, et le
// bouton "Write my CV for this job" reste gris. Rien ne dit pourquoi. Le
// champ du dessous, "ce que tu as fait", montre son exemple en gris clair,
// qui ressemble a du texte deja saisi. Pour la personne devant l'ecran,
// l'outil ne marche pas.
//
// Deux portes fermaient le chemin, et une seule etait visible :
//
//   OnboardScreen : pret = annonce > 40 ET parcours > 10
//   runFromOffer  : if (a.length < 40 || p0.length < 10) return;
//
// La seconde est la pire des deux. Elle repart sans un mot : pas d'erreur,
// pas de message, pas d'appel. Meme en forcant le clic, il ne se passe
// rien. Un test qui ne verifierait que l'etat du bouton serait donc au vert
// sur une fonctionnalite morte, ce qui est exactement le piege ici.
//
// CE QU'ON MESURE
//
// L'appel part. C'est la seule preuve qui traverse les deux portes, et elle
// se lit sans dependre de ce que le modele repond.
//
// ET LE COLLAGE ARRIVE PROPRE
//
// La meme capture montre "&nbsp;" sur trois lignes dans le champ de
// l'annonce : les sites d'emploi rendent leurs espaces insecables en
// entites, et le presse-papier les emporte telles quelles. Ces six
// caracteres s'affichent a la personne et partent ensuite dans la consigne.
// On colle donc du texte de site d'emploi et on exige qu'il n'en reste rien.

import { startServer, stopServer, launchBrowser, seedApp } from "./lib/harness.mjs";

// Une vraie annonce, avec ce qu'un site d'emploi y met : entites, espaces
// insecables, et une puce en HTML.
const ANNONCE_BRUTE = "Care Assistant &ndash; Elmwood House, Manchester\n"
  + "&nbsp;\n"
  + "Benefits\n"
  + "Pulled from the full job description\n"
  + "&nbsp;\n"
  + "Company pension&nbsp;\n"
  + "Private medical insurance\n"
  + "&nbsp;\n"
  + "Full job description\n"
  + "<ul><li>Support 14 residents with personal care and medication</li>"
  + "<li>Keep daily records</li></ul>\n"
  + "NVQ Level 3 preferred. Night shifts available. Immediate start.";

// Un CV vide : c'est l'etat de quelqu'un qui arrive, et la seule facon
// d'atteindre l'accueil qui mene a ce chemin.
// Ce qu'un ancien CV contient, reduit a ce qu'il faut pour reconnaitre qu'il
// est bien arrive dans le champ.
const PARCOURS_FICHIER = "Sam Carter\n\nExperience\n"
  + "Waiter, Le Comptoir, Lyon, 2019 to 2022. 80 covers a night, trained new "
  + "starters, cashed up at close.\nBaker's assistant, 2017 to 2019.";

const CV_VIDE = { name: "", title: "", summary: "", experience: [], education: [], skills: [] };

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await ctx.newPage();
    const erreurs = [];
    page.on("pageerror", (e) => erreurs.push(e.message.split("\n")[0].slice(0, 90)));

    // On intercepte l'appel plutot que de le laisser partir : ce test mesure
    // qu'il PART, pas ce que le modele repond.
    // ON GARDE LE PREMIER APPEL, PAS LE DERNIER
    //
    // Ce chemin en emet deux : l'ecriture, puis une reprise qui corrige ce
    // que les analyseurs ont trouve. Retenir le dernier ferait lire la
    // consigne de reprise, qui ne prouve rien de la porte qu'on teste.
    const appels = [];
    await page.route("**/api/claude", (r) => {
      try { appels.push(JSON.parse(r.request().postData() || "{}")); } catch { appels.push({}); }
      return r.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ content: [{ type: "text", text: JSON.stringify({
          name: "Sam Carter", title: "Care Assistant", summary: "Care assistant.",
          experience: [], education: [], skills: [], deduit: [],
        }) }] }),
      });
    });

    await seedApp(page, CV_VIDE, { locale: "en" });

    const entree = page.locator('[data-nuvi="home-offre"]');
    if (await entree.count() === 0) {
      failures.push("l'accueil n'offre aucune entree \"je pars de l'annonce\" "
        + "(data-nuvi=\"home-offre\") : le chemin est injoignable.");
    } else {
      await entree.first().click({ timeout: 8000 });
      await page.waitForSelector('[data-nuvi="offre-annonce"]', { timeout: 8000 });

      // On colle, on ne tape pas : c'est le collage que le produit recoit, et
      // c'est lui qui porte les entites.
      await page.locator('[data-nuvi="offre-annonce"]').click();
      await page.evaluate((t) => navigator.clipboard.writeText(t), ANNONCE_BRUTE)
        .catch(() => {});
      let colle = true;
      try {
        await page.evaluate((t) => {
          const dt = new DataTransfer();
          dt.setData("text/plain", t);
          const champ = document.querySelector('[data-nuvi="offre-annonce"]');
          champ.focus();
          champ.dispatchEvent(new ClipboardEvent("paste", {
            clipboardData: dt, bubbles: true, cancelable: true,
          }));
        }, ANNONCE_BRUTE);
      } catch { colle = false; }
      await page.waitForTimeout(300);

      let dansLeChamp = await page.locator('[data-nuvi="offre-annonce"]').inputValue();
      if (!dansLeChamp.trim()) {
        // Le navigateur a refuse l'evenement synthetique : on remplit
        // autrement pour que le reste du test garde son sens. La proprete du
        // collage est alors la seule chose qu'on ne peut plus affirmer.
        colle = false;
        await page.locator('[data-nuvi="offre-annonce"]').fill(ANNONCE_BRUTE);
        await page.waitForTimeout(200);
        dansLeChamp = await page.locator('[data-nuvi="offre-annonce"]').inputValue();
      }

      if (colle) {
        for (const trace of ["&nbsp;", "&ndash;", "<li>", "<ul>"]) {
          if (dansLeChamp.includes(trace)) {
            failures.push("apres le collage, le champ de l'annonce contient "
              + "encore \"" + trace + "\". La personne lit du balisage dans "
              + "son propre champ, et ce balisage part ensuite au modele.");
          }
        }
      }

      // QUAND ON N'A PAS DE TEXTE A COLLER
      //
      // Le parcours n'existe pas toujours sous forme de texte : un vieux PDF,
      // un document Word, la photo d'un CV imprime. Sans depot sur cet ecran,
      // la seule sortie est de tout retaper, et personne ne le fait.
      //
      // On donne un .txt : il traverse le meme lecteur que le reste, sans
      // dependre ni de pdf.js ni d'un appel au modele pour une image, donc
      // ce qui echoue ici est bien le cablage et pas l'extraction.
      const depot = page.locator('[data-nuvi-depot="offre-parcours"]');
      if (await depot.count() === 0) {
        failures.push("aucun moyen de deposer un document ou une photo sur "
          + "l'ecran de l'annonce : qui n'a pas son parcours en texte doit "
          + "tout retaper.");
      } else {
        const chooser = page.waitForEvent("filechooser", { timeout: 8000 });
        await depot.click({ timeout: 8000 });
        const fc = await chooser.catch(() => null);
        if (!fc) {
          failures.push("le bouton de depot n'ouvre aucun selecteur de "
            + "fichier : il ne fait rien.");
        } else {
          await fc.setFiles({
            name: "ancien-cv.txt",
            mimeType: "text/plain",
            buffer: Buffer.from(PARCOURS_FICHIER, "utf8"),
          });
          await page.waitForTimeout(1500);
          const dedans = await page.locator('[data-nuvi="offre-parcours"]').inputValue();
          if (!dedans.includes("Le Comptoir")) {
            const err = await page.locator('[data-nuvi-depot-err="offre-parcours"]')
              .innerText().catch(() => "");
            failures.push("le fichier depose n'atteint pas le champ du "
              + "parcours (il contient \"" + dedans.slice(0, 40) + "\")"
              + (err ? ", message affiche : " + err : ", et rien ne s'affiche")
              + ".");
          }
          // On repart d'un champ vide : la suite du test prouve qu'une
          // annonce SEULE suffit, et un parcours rempli la contredirait.
          await page.locator('[data-nuvi="offre-parcours"]').fill("");
          await page.waitForTimeout(200);
        }
      }

      // ET LE DEPOT SAIT LIRE UNE PHOTO
      //
      // Une image est le seul fichier qui parte au modele, et cette lecture
      // descend par contexte depuis AppRoot, qui a DEUX arbres de rendu :
      // ordinateur et telephone. Poser le fournisseur sur un seul est une
      // faute invisible - les PDF et les documents Word passent toujours, les
      // photos sont refusees en silence, et sur la moitie des ecrans
      // seulement. C'est arrive a la premiere pose du composant.
      const sansImage = await page.$$eval('[data-nuvi-depot-image="0"]',
        (n) => n.map((e) => e.getAttribute("data-nuvi-depot")));
      if (sansImage.length) {
        failures.push("le(s) depot(s) " + sansImage.join(", ") + " refusent "
          + "les photos : le lecteur d'image ne leur parvient pas. Beaucoup "
          + "de gens n'ont que la photo d'un CV imprime.");
      }

      // LE PARCOURS RESTE VIDE. C'EST TOUT L'OBJET DU TEST.
      const parcours = await page.locator('[data-nuvi="offre-parcours"]').inputValue();
      if (parcours.trim()) {
        failures.push("le champ du parcours n'est pas vide au depart (\""
          + parcours.slice(0, 30) + "\") : le test ne prouve plus rien.");
      }

      const cta = page.locator('[data-nuvi="offre-cta"]');
      if (await cta.isDisabled()) {
        failures.push("l'annonce est collee, le parcours est vide, et le "
          + "bouton reste desactive. Rien a l'ecran ne dit ce qui manque.");
      }

      // On clique meme si le bouton se declare desactive : la seconde porte
      // vit dans runFromOffer, et c'est elle qu'il faut prouver ouverte.
      await cta.click({ timeout: 8000, force: true }).catch(() => {});
      await page.waitForTimeout(2500);

      const envoye = appels[0] || null;
      if (!envoye) {
        failures.push("le clic ne declenche aucun appel a /api/claude. "
          + "runFromOffer repart en silence quand le parcours est vide : "
          + "pas d'erreur, pas de message, rien.");
      } else {
        if (envoye.task_name !== "cv-from-offer") {
          failures.push("l'appel parti porte task_name \"" + envoye.task_name
            + "\" au lieu de \"cv-from-offer\".");
        }
        // LA FORME PART AVEC LA CONSIGNE
        if (!envoye.schema || !envoye.schema.properties) {
          failures.push("aucune forme declaree dans l'appel : la reponse "
            + "n'est plus garantie, elle est demandee poliment.");
        }
        // Sans parcours, presque tout est deduit, et la consigne doit le
        // dire : c'est la seule chose qui empeche un CV de faits inventes
        // de se presenter comme celui de la personne.
        const p = String(envoye.prompt || "");
        if (!/deduit/i.test(p)) {
          failures.push("la consigne envoyee ne parle pas de \"deduit\" : "
            + "rien n'obligera le modele a signaler ce qu'il a invente, et "
            + "la personne lira des employeurs qu'elle n'a jamais eus comme "
            + "s'ils venaient d'elle.");
        }
        if (p.includes("&nbsp;")) {
          failures.push("l'annonce part au modele avec ses entites HTML.");
        }
      }
    }

    for (const e of erreurs) {
      failures.push("erreur JavaScript a l'ecran : " + e);
    }

    // Le nettoyage lui-meme, sans navigateur : voir la note en fin de fichier.
    failures.push(...(await verifierIdempotence()));

    await ctx.close();

    if (!failures.length) {
      console.log("      une annonce collee seule suffit, et elle arrive propre");
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

// LE NETTOYAGE NE DOIT S'APPLIQUER QU'UNE FOIS
//
// Il retire les balises ET decode les entites, dont &lt; qui redonne un
// chevron : un second passage prendrait ce chevron pour une balise et
// effacerait le texte autour. Une annonce contenant litteralement "&lt;b&gt;"
// perdrait donc trois caracteres a chaque appel supplementaire, sans que rien
// ne le signale.
//
// C'est une propriete de la fonction, pas de l'ecran : elle se verifie ici,
// sans navigateur, et elle vaut avertissement pour quiconque serait tente de
// rappeler le nettoyage "par securite" en aval.
export async function verifierIdempotence() {
  const { nettoyerLAnnonce } = await import("../lib/pastedPosting.js");
  const echecs = [];
  const CAS = [
    "Care Assistant &ndash; Elmwood&nbsp;House",
    "<p>Chef de rang</p><ul><li>80 couverts</li></ul>",
    "Salaire: 12 GBP/h. Contrat: CDI. Horaires: nuit.",
  ];
  for (const c of CAS) {
    const une = nettoyerLAnnonce(c);
    const deux = nettoyerLAnnonce(une);
    if (une !== deux) {
      echecs.push("nettoyer deux fois change le texte : \"" + une + "\" devient \""
        + deux + "\". Ces annonces-la doivent traverser sans perte.");
    }
  }
  return echecs;
}
