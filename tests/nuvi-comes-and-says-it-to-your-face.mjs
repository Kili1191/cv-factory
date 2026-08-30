// Nuvi ne depose pas un conseil dans un tableau : il vient le dire.
//
// POURQUOI CE PANNEAU EXISTE
//
// Le diagnostic rendait deja la bonne phrase. Elle cite la puce de la
// personne, dit ce qu'elle raconte aujourd'hui et nomme ce qui manque. Elle
// etait posee dans une carte de tableau de bord, en corps 13, entre huit
// autres notes. Un conseil qui a la forme d'une ligne de rapport se lit
// comme une ligne de rapport : on hoche la tete et on passe a la suivante.
//
// Le produit se vend comme un compagnon qui accompagne quelqu'un jusqu'a
// l'embauche. Un compagnon ne laisse pas une note dans un tableau. Le meme
// texte, sorti du tableau et porte par Nuvi, change de statut : ce n'est
// plus un score qu'on subit, c'est quelqu'un qui explique.
//
// CE QUE CE TEST TIENT
//
// Trois choses qu'aucune relecture ne garantit :
//
//   1. Le panneau montre la phrase DE LA PERSONNE. Un conseil general ne se
//      corrige pas : "montre des resultats" ne dit pas laquelle des puces
//      est visee.
//   2. Il dit POURQUOI, pas seulement quoi. Sans la raison on obtient une
//      consigne a suivre au lieu d'une chose comprise, et elle ne se
//      transpose pas aux autres puces.
//   3. Son bouton mene la ou la correction se fait. Un panneau qui explique
//      et ne mene nulle part est une lecon.
//
// Il verifie aussi qu'aucun appel reseau ne part : tout ce qui s'affiche est
// deja calcule par lib/diagnostic.js, donc le panneau doit etre instantane,
// gratuit, et dire deux fois la meme chose.

import { startServer, stopServer, launchBrowser, seedApp } from "./lib/harness.mjs";

const CV = {
  name: "Amina Diallo", title: "Chef de rang",
  email: "a@d.fr", phone: "06 00 00 00 00", location: "Lyon",
  summary: "Chef de rang, six ans en brasserie et en restauration de groupe.",
  experience: [{
    id: 1, title: "Chef de rang", company: "Le Comptoir",
    location: "Lyon", period: "2022 - 2026",
    bullets: [
      "Responsable du service en salle sur 80 couverts",
      "Encadrement d une equipe de 6 serveurs",
    ],
  }],
  education: [{ id: 1, degree: "CAP restaurant", school: "CFA Lyon", period: "2019" }],
  skills: ["service en salle", "encaissement", "HACCP", "accueil client", "gestion de rang"],
};

export async function run() {
  const failures = [];
  let srv = null;
  let browser = null;
  try {
    srv = await startServer();
    browser = await launchBrowser();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();

    const appels = [];
    await page.route("**/api/claude**", (r) => {
      appels.push(r.request().url());
      return r.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    await seedApp(page, CV, { locale: "fr" });

    await page.evaluate(() => window.__nuviOpenModal && window.__nuviOpenModal("open-score"));
    await page.waitForTimeout(1700);

    const bouton = page.getByRole("button", { name: "Nuvi t'explique", exact: true });
    if (await bouton.count() === 0) {
      failures.push(
        "aucun axe n'offre l'explication de Nuvi. Le conseil reste une ligne "
        + "de tableau, ce qui est l'etat dont on est parti."
      );
      await ctx.close();
      return failures;
    }
    await bouton.first().click();
    await page.waitForTimeout(1400);

    const vu = await page.evaluate(() => {
      const d = document.querySelector('[data-nuvi-conseil]');
      if (!d) return { ouvert: false };
      return {
        ouvert: true,
        role: d.getAttribute("role"),
        texte: (d.textContent || "").replace(/\s+/g, " "),
        nuvi: !!d.querySelector("svg"),
        boutons: [...d.querySelectorAll("button")]
          .map((b) => (b.textContent || "").trim()).filter(Boolean),
      };
    });

    if (!vu.ouvert) {
      failures.push("le bouton n'ouvre aucun panneau.");
      await ctx.close();
      return failures;
    }

    // 1. La phrase de la personne, mot pour mot.
    if (!vu.texte.includes("Responsable du service en salle sur 80 couverts")) {
      failures.push(
        "le panneau ne montre pas la puce de la personne telle qu'elle l'a "
        + "ecrite. Un conseil qui ne designe pas la phrase visee ne se corrige "
        + "pas : personne ne sait laquelle de ses lignes est en cause."
      );
    }

    // 2. La raison, pas seulement la consigne.
    if (!/n'importe qui ayant tenu ce poste/i.test(vu.texte)) {
      failures.push(
        "le panneau ne dit pas pourquoi une responsabilite ne suffit pas. "
        + "Sans la raison, la personne corrige cette ligne-ci et refait la "
        + "meme chose sur la suivante."
      );
    }

    // 3. La forme a viser, sans phrase inventee a sa place.
    if (!/ce qui a change/i.test(vu.texte)) {
      failures.push(
        "le panneau ne montre pas la forme a viser. Dire ce qui ne va pas sans "
        + "montrer a quoi ca ressemble une fois corrige laisse la personne "
        + "devant sa page blanche."
      );
    }

    // 4. Nuvi est la. C'est ce qui distingue un compagnon d'un rapport.
    if (!vu.nuvi) {
      failures.push(
        "Nuvi n'est pas dessine dans le panneau : il ne reste que le texte du "
        + "tableau dans une autre boite."
      );
    }
    if (vu.role !== "dialog") {
      failures.push(
        "le panneau n'est pas annonce comme un dialogue : un lecteur d'ecran "
        + "ne signale pas qu'il vient de s'ouvrir."
      );
    }

    // 5. Rien n'a ete demande au reseau.
    if (appels.length) {
      failures.push(
        "le panneau a appele l'IA " + appels.length + " fois alors que tout ce "
        + "qu'il affiche est deja calcule. C'est le cout et l'attente qu'on "
        + "avait supprimes du diagnostic."
      );
    }

    // 6. Le bouton mene a l'endroit de la correction.
    const aller = page.getByRole("button", { name: "Corriger cette ligne avec Nuvi", exact: true });
    if (await aller.count() === 0) {
      failures.push(
        "le panneau explique et ne mene nulle part. Un conseil sans porte de "
        + "sortie est une lecon."
      );
    } else {
      await aller.first().click();
      await page.waitForTimeout(1400);
      const arrive = await page.locator('button[title^="Transformer ce bullet"]').count();
      if (arrive === 0) {
        failures.push(
          "le bouton du panneau n'ouvre pas l'editeur ou la puce se corrige : "
          + "la personne comprend ce qu'il faut faire et se retrouve seule."
        );
      }
      const reste = await page.evaluate(() => !!document.querySelector('[data-nuvi-conseil]'));
      if (reste) {
        failures.push(
          "le panneau reste ouvert par-dessus l'editeur : il recouvre "
          + "exactement l'endroit ou il envoie la personne."
        );
      }
    }

    await ctx.close();
  } catch (err) {
    failures.push("le test a plante : " + (err && err.message ? err.message : String(err)));
  } finally {
    if (browser) await browser.close();
    if (srv) await stopServer(srv);
  }

  if (!failures.length) {
    console.log(
      "      Nuvi montre la puce de la personne, dit pourquoi elle ne suffit "
      + "pas, montre la forme a viser, et son bouton ouvre l'editeur sans rien "
      + "demander au reseau"
    );
  }
  return failures;
}
