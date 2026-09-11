// UN PANNEAU A LA FOIS, ET DANS LA LANGUE CHOISIE
//
// Deux defauts vus sur la meme capture d'ecran d'utilisateur.
//
// LA CASCADE. Chaque fonctionnalite avait son propre booleen d'ouverture et
// rien ne fermait les autres. Ouvrir Match par-dessus le Coach par-dessus le
// Score les empilait : trois panneaux vivants, dont deux caches sous le
// troisieme. En fermant celui du dessus on retombait sur le precedent, qu'on
// croyait ferme depuis longtemps, et il fallait fermer trois fois pour
// revenir au CV.
//
// LA LANGUE. Le panneau Match etait anglais en haut et francais des la
// premiere carte : "CV sur mesure pour une offre", "Colle l'offre",
// "Adapter mon CV a cette offre". Ces libelles etaient ecrits en dur au lieu
// de passer par les traductions, donc choisir l'anglais ne les touchait pas.
//
// Ce test ouvre les fonctionnalites comme quelqu'un qui navigue, et exige
// qu'il n'en reste qu'une a l'ecran, entierement dans la langue demandee.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

// Des mots qui n'existent qu'en francais et qui apparaissaient vraiment dans
// l'interface anglaise.
const MOTS_FR = [
  "Colle l'offre", "Intitule du poste", "Missions", "Profil recherche",
  "Competences requises", "Adapter mon CV", "sur mesure pour une offre",
  "Ton CV est vide", "Offre d'emploi", "Cle API requise",
];

const PARCOURS = ["open-coach", "open-score", "open-match", "open-versions", "open-pack"];

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await seedApp(page, SAMPLE_CV, { locale: "en" });

    // Un panneau est une couche fixe, large et visible, hors barre laterale.
    // Les libelles de la barre ("Coach", "My CVs") sont toujours a l'ecran et
    // ne prouveraient rien.
    const panneauxOuverts = () => page.evaluate(() => {
      const vus = [];
      for (const el of document.querySelectorAll("div,aside,section")) {
        const st = getComputedStyle(el);
        if (st.position !== "fixed" || st.display === "none") continue;
        if (st.visibility === "hidden" || parseFloat(st.opacity) < 0.2) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 320 || r.height < 320) continue;
        if (el.closest("aside") || el.querySelector("nav")) continue;
        if (vus.some((o) => o.contains(el) || el.contains(o))) continue;
        // LE VERDICT EST UNE COUCHE VOULUE, PAS UN PANNEAU EMPILE
        //
        // Il se pose SUR le score quand la note depasse 85, et c'est son
        // travail. Le compter comme un second panneau faisait echouer ce
        // test selon que la note du CV d'essai passait ou non le seuil -
        // vert ici, rouge sur l'integration continue, pour un comportement
        // correct dans les deux cas.
        //
        // Ce qui etait un vrai defaut, c'est qu'il SURVIVAIT au panneau qui
        // le justifie : on quittait le Score pour Match et il restait
        // au-dessus. La suite du parcours le verifie - s'il fuyait hors du
        // Score, il serait compte sur l'etape suivante.
        const titre = (el.innerText || "").trim();
        if (/^VERDICT NUVI/i.test(titre)) continue;
        vus.push(el);
      }
      return vus.map((el) => (el.innerText || "").trim().split("\n")
        .filter(Boolean)[0] || "(sans titre)").map((x) => x.slice(0, 30));
    });

    for (const cle of PARCOURS) {
      const ok = await page.evaluate((k) => {
        if (typeof window.__nuviOpenModal !== "function") return false;
        window.__nuviOpenModal(k);
        return true;
      }, cle);
      if (!ok) {
        failures.push("impossible de piloter les panneaux : __nuviOpenModal absent.");
        break;
      }
      await page.waitForTimeout(1100);

      const ouverts = await panneauxOuverts();
      if (ouverts.length > 1) {
        failures.push(
          cle + " : " + ouverts.length + " panneaux a l'ecran (" + ouverts.join(" | ")
          + "). Ouvrir une fonctionnalite doit fermer la precedente ; empilees, "
          + "il faut fermer autant de fois qu'on a clique pour revoir son CV."
        );
      }

      const fr = await page.evaluate((mots) => {
        const t = document.body.innerText;
        return mots.filter((m) => t.includes(m));
      }, MOTS_FR);
      if (fr.length) {
        failures.push(
          cle + " : texte francais dans une interface anglaise - " + fr.join(", ")
          + ". Ces libelles ne passent pas par les traductions, donc choisir "
          + "l'anglais ne les change pas."
        );
      }
    }

    // LE RESULTAT DU MATCH, L'ECRAN LU A CHAQUE CANDIDATURE
    //
    // Le parcours ci-dessus ouvre le panneau Match VIDE, et c'est tout ce
    // qu'il a jamais mesure. Trois libelles du RESULTAT etaient ecrits en
    // dur en francais ("Requirements cles", "Presents", "Ajoutes") : ils ne
    // s'affichent qu'une fois l'adaptation faite, donc aucune suite ne les
    // voyait, et ils sont partis en production sur l'ecran que quelqu'un
    // qui postule cent fois regarde cent fois. On produit donc un resultat,
    // avec un modele double, et on lit ce qu'il affiche.
    // CHAQUE BLOC DU RESULTAT, PAS SEULEMENT CEUX QUI SE REMPLISSENT SEULS
    //
    // La version precedente laissait hidden_signals, culture_decode,
    // seniority_decode, les questions et l'accroche VIDES, donc les cinq
    // panneaux qui les affichent ne se dessinaient jamais et leurs libelles
    // n'etaient lus par personne. Ils sont partis en francais dans
    // l'interface anglaise, et c'est un utilisateur qui l'a vu, sur l'ecran
    // qu'on regarde a chaque candidature. Un champ vide dans un jeu d'essai
    // est une branche non testee.
    const resultat = { match_score: 78, job_title: "Beverage Manager", company: "A venue",
      key_requirements: ["WSET Level 2"], keywords_matched: ["stock control"],
      keywords_to_add: ["gross profit"],
      hidden_signals: ["The venue does 200 covers, so volume matters more than the title"],
      culture_decode: "A small team where everyone carries several roles",
      seniority_decode: "Mid level, with full ownership of the drinks programme",
      likely_interview_questions: ["How do you hold gross profit through a bad month?"],
      cover_letter_hook: "Ten years running high volume bars, and a route to Beverage Manager.",
      cv_optimized: { ...SAMPLE_CV, title: "Beverage Manager" } };
    // Le prompt part-il en disant dans quelle langue repondre ? Il ne le
    // disait pas, et comme il est ecrit en francais le modele repondait en
    // francais : le CV adapte sortait en francais pour une annonce anglaise,
    // pret a etre envoye a un recruteur britannique. Les libelles ci-dessous
    // ne voient pas ca, parce que rien a l'ecran n'est faux : c'est le
    // contenu qui est dans la mauvaise langue. On lit donc la demande.
    let promptEnvoye = "";
    await page.route("**/api/claude", (route) => {
      try { promptEnvoye = route.request().postData() || ""; } catch { promptEnvoye = ""; }
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ content: [{ type: "text", text: JSON.stringify(resultat) }] }) });
    });
    await page.evaluate(() => window.__nuviOpenModal("open-match"));
    await page.waitForTimeout(900);
    const champ = page.locator('textarea[data-nuvi="match-annonce"]').first();
    if (!(await champ.count())) {
      failures.push("le panneau Match n'offre pas son champ d'annonce");
    } else {
      await champ.fill("Beverage Manager wanted in central London. You will own the drinks "
        + "programme for a 200 cover venue, manage fifteen staff, and control gross profit "
        + "and stock. WSET Level 2 essential.");
      await page.waitForTimeout(400);
      await page.locator('[data-nuvi="match-choix"][data-nuvi-choix="actuel"]').first().click({ timeout: 8000 });
      await page.waitForTimeout(2500);
      // Ces intitules sont mis en capitales par le CSS : innerText rend la
      // forme affichee, pas la chaine du code. On compare donc sans casse,
      // sinon le test echoue sur un libelle parfaitement juste.
      const vu = (await page.evaluate(() => document.body.innerText)).toLowerCase();
      for (const mot of ["requirements cles", "ajoutes", "presents",
        "accroche lettre de motivation", "signaux caches", "culture entreprise",
        "niveau attendu", "questions probables", "absent de ton cv",
        "tu l'as deja, ils l'appellent autrement"]) {
        if (vu.includes(mot)) {
          failures.push("le resultat du match affiche \"" + mot + "\" dans une interface "
            + "anglaise : ce libelle ne passe pas par les traductions");
        }
      }
      if (!promptEnvoye) {
        failures.push("la demande envoyee a l'IA n'a pas ete lue : l'assertion sur la langue ne prouve rien");
      } else if (!/langue de l['\u2019]?OFFRE/i.test(promptEnvoye)) {
        failures.push("le prompt du match ne dit pas dans quelle langue repondre. Ecrit en "
          + "francais, il fait repondre en francais : quelqu'un qui postule a Londres recoit "
          + "un CV francais a envoyer a un recruteur britannique");
      }
      for (const mot of ["what the job asks for", "already in your cv", "added for this ad",
        "cover letter hook", "hidden signals in the ad", "company culture, decoded",
        "level expected, decoded", "likely interview questions"]) {
        if (!vu.includes(mot)) {
          failures.push("le resultat du match n'affiche pas \"" + mot + "\" : le libelle "
            + "traduit n'est pas arrive a l'ecran");
        }
      }
    }

    if (!failures.length) {
      console.log(
        "      " + PARCOURS.length + " fonctionnalites ouvertes l'une apres "
        + "l'autre : jamais plus d'un panneau a l'ecran, et aucun mot de "
        + "francais dans l'interface anglaise, resultat du match compris"
      );
    }
    await ctx.close();

    // ================================================================
    // LE MENU QUI S'OUVRAIT AU SURVOL, DERRIERE LE PANNEAU
    // ================================================================
    //
    // Ce test ne verifiait que des enchainements de CLICS, et il passait au
    // vert pendant que la cascade etait sous les yeux du proprietaire : le
    // panneau Apparence ouvert avec le menu DESIGN encore visible dessous.
    //
    // LA CASCADE EST MORTE PAR CONSTRUCTION, ET C'EST CA QU'ON VERIFIE
    //
    // Version d'origine du defaut : le sous-menu s'ouvrait au SURVOL, dans un
    // panneau flottant. Une fois une fenetre ouverte, la souris qui remontait
    // vers elle traversait la barre et rallumait le menu DERRIERE. Aucun
    // scenario de clic ne pouvait le produire, et c'est pourtant le geste que
    // tout le monde fait.
    //
    // On avait d'abord soigne le symptome : un drapeau panneauOuvert qui
    // faisait taire le survol. La barre s'ouvre desormais au CLIC et deroule
    // ses entrees DANS le flux, donc plus rien ne peut se poser par-dessus
    // quoi que ce soit.
    //
    // Ce controle garde les deux bouts : le geste d'origine ne doit rallumer
    // aucun menu, ET le sous-menu doit rester dans le flux. La seconde
    // assertion est celle qui tient dans le temps : elle echoue le jour ou
    // quelqu'un remet un panneau flottant, avant meme que la cascade se voie.
    {
      const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const p2 = await ctx2.newPage();
      await seedApp(p2, SAMPLE_CV, { locale: "en" });

      const design = p2.locator('[data-nv-nav="design"]').first();
      if (await design.count() === 0) {
        failures.push(
          "l'entree Design de la barre laterale est introuvable : ce controle "
          + "ne peut pas verifier la cascade."
        );
      } else {
        await design.click();
        await p2.waitForTimeout(500);
        const sousMenu = p2.locator('[data-nv-sous="design"]');
        if (await sousMenu.count() === 0) {
          failures.push("le sous-menu Design ne s'ouvre pas au clic.");
        } else {
          // DANS LE FLUX, PAS AU-DESSUS
          const flottant = await sousMenu.evaluate((el) => {
            const st = getComputedStyle(el);
            return (st.position === "fixed" || st.position === "absolute") ? st.position : null;
          });
          if (flottant) {
            failures.push(
              "le sous-menu de la barre est en position " + flottant + " : il se "
              + "pose au-dessus du contenu au lieu de le pousser. C'est la forme "
              + "meme qui produisait la cascade."
            );
          }

          const sous = sousMenu.locator("button").filter({ hasText: /Customi/i }).first();
          if (await sous.count() === 0) {
            failures.push("le sous-menu Design ne propose pas Customize.");
          } else {
            await sous.click();
            await p2.waitForTimeout(900);
            // Le geste d'origine : la souris revient sur la barre.
            await design.hover();
            await p2.waitForTimeout(900);

            const menuVisible = await p2.evaluate(() => {
              for (const el of document.querySelectorAll("div,aside,section,nav")) {
                const st = getComputedStyle(el);
                if (st.position !== "fixed" && st.position !== "absolute") continue;
                if (st.visibility === "hidden" || parseFloat(st.opacity) < 0.2) continue;
                const r = el.getBoundingClientRect();
                if (r.width < 140 || r.height < 100) continue;
                const t = (el.innerText || "").replace(/\s+/g, " ").trim();
                if (/Customize/.test(t) && /Translate/.test(t) && t.length < 90) return t.slice(0, 60);
              }
              return null;
            });

            if (menuVisible) {
              failures.push(
                "un menu flottant de la barre laterale se pose par-dessus le "
                + `panneau ouvert : "${menuVisible}". C'est la cascade.`
              );
            }
          }
        }
      }
      await ctx2.close();
    }

  } catch (err) {
    failures.push("le test a plante : " + (err && err.message ? err.message : String(err)));
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
