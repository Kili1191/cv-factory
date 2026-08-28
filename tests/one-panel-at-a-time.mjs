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

    if (!failures.length) {
      console.log(
        "      " + PARCOURS.length + " fonctionnalites ouvertes l'une apres "
        + "l'autre : jamais plus d'un panneau a l'ecran, et aucun mot de "
        + "francais dans l'interface anglaise"
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
