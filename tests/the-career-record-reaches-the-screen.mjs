// Le choix "tout mon parcours" arrive vraiment a l'ecran.
//
// POURQUOI CE TEST EXISTE
//
// La bibliotheque qui rassemble les versions enregistrees etait correcte,
// testee, et prouvee. Elle n'etait pourtant JAMAIS visible sur ordinateur :
// le panneau y etait monte sans la liste des versions, donc l'apport se
// calculait sur une liste vide, se declarait inutile, et le choix ne
// s'affichait pas. Seule la feuille du telephone passait la donnee.
//
// Rien ne le signalait. Le code compilait, la bibliotheque passait ses
// propres tests, et le defaut n'existait que dans le cablage entre les deux.
// C'est exactement le genre de trou qu'un test de bibliotheque ne peut pas
// voir : il faut regarder l'ecran.
//
// CE QU'IL VERIFIE
//
//   1. Avec des versions enregistrees, le choix APPARAIT - sur ordinateur
//      comme sur telephone, parce que le defaut n'existait que d'un cote.
//   2. Il liste ce qu'il a retrouve, et pas seulement un nombre : la personne
//      doit reconnaitre son parcours avant de depenser un appel.
//   3. Ce qui est liste vient bien de la version enregistree.
//   4. Sans version enregistree, le choix ne s'affiche PAS : proposer une
//      option qui rendrait le meme resultat est une deception qui coute plus
//      cher que l'absence de choix.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

// Une version enregistree qui apporte une experience et des competences que
// le CV a l'ecran n'a pas. Les intitules sont volontairement reconnaissables.
const VERSION = {
  name: "Version restauration",
  cv: {
    ...SAMPLE_CV,
    experience: [{
      id: "vr1",
      title: "Chef de rang",
      company: "Le Comptoir",
      period: "2018 - 2020",
      location: "Lyon",
      bullets: ["Encadre une equipe de 4 personnes", "Gere 90 couverts par service"],
    }],
    skills: ["Encaissement", "Oenologie"],
  },
};

const OFFRE =
  "Serveur H/F, Brasserie du Centre, Lyon.\n"
  + "Nous recherchons un serveur experimente pour un service de 100 couverts.\n"
  + "Missions : accueil client, prise de commandes, encaissement, gestion "
  + "d'equipe en l'absence du chef de rang, service au plateau.\n"
  + "Profil : 2 ans d'experience minimum en brasserie, sens du commerce, "
  + "resistance au stress, connaissance des vins appreciee.\n"
  + "Contrat 39h, salaire selon profil.";

const ECRANS = [
  { nom: "ordinateur", viewport: { width: 1400, height: 960 } },
  { nom: "telephone", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
];

// LA MEME DESTINATION PORTE DEUX NOMS
//
// Sur ordinateur la barre laterale dit "Match offre" ; sur telephone la
// barre du bas dit "Cibler". Ce n'est pas un detail de test : c'est le meme
// ecran designe par deux mots selon l'appareil, et quelqu'un qui passe du
// telephone a l'ordinateur cherche une entree qui n'existe plus sous ce nom.
// On accepte donc les deux ici, et on le note pour que ce soit corrige.
//
// Sur ordinateur la barre est repliee et ne se deplie qu'au survol, donc il
// faut survoler avant de chercher : sans ca, l'entree existe mais n'est pas
// atteignable, et le test conclut a tort que le panneau est casse.
async function ouvrirCibler(page, mob) {
  if (!mob) {
    await page.mouse.move(30, 400);
    await page.waitForTimeout(700);
  }
  // Les entrees de la barre ne sont PAS des <button> : ce sont des div
  // cliquables. Chercher uniquement des boutons ne trouve rien et fait
  // conclure que l'entree a disparu. On cherche donc l'element le plus
  // profond qui porte exactement ce libelle, quelle que soit sa balise.
  //
  // Le dernier candidat, et non le premier : les elements imbriques portent
  // tous le meme innerText, et cliquer le conteneur exterieur rate parfois
  // la zone reellement cliquable.
  const ouvert = await page.evaluate(() => {
    const tous = [...document.querySelectorAll("button, a, div, span, li")];
    const candidats = tous.filter((x) => {
      const t = (x.innerText || "").replace(/\s+/g, " ").trim();
      return /^(match offre|cibler)$/i.test(t);
    });
    const b = candidats[candidats.length - 1];
    if (!b) return false;
    b.click();
    return true;
  });
  await page.waitForTimeout(1400);
  return ouvert;
}

async function inspecter(browser, ecran, versions) {
  const ctx = await browser.newContext(ecran);
  const page = await ctx.newPage();
  await seedApp(page, SAMPLE_CV);
  await page.evaluate((v) => localStorage.setItem("cvf_vs", JSON.stringify(v)), versions);
  // networkidle, pas domcontentloaded : avec le second, la barre laterale
  // n'a pas fini de s'installer quand on la survole, l'entree ne se deplie
  // pas, et le test conclut que le panneau a disparu alors qu'il est la.
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const entree = await ouvrirCibler(page, !!ecran.isMobile);
  if (!entree) {
    await ctx.close();
    return { entreeIntrouvable: true };
  }

  const zone = page.locator("textarea").first();
  if (await zone.count()) {
    await zone.fill(OFFRE);
    await page.waitForTimeout(1500);
  }

  const vu = await page.evaluate(() => {
    const boutons = [...document.querySelectorAll("button")];
    const parcours = boutons.find((b) => /tout mon parcours/i.test(b.innerText || ""));
    if (parcours) parcours.click();
    return { present: !!parcours, zoneTrouvee: !!document.querySelector("textarea") };
  });
  await page.waitForTimeout(700);
  const texte = await page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " "));
  await ctx.close();
  return { ...vu, texte };
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    for (const ecran of ECRANS) {
      const { nom, ...viewport } = ecran;

      // --- 1 a 3. Avec des versions, le choix est la et il montre ------
      const avec = await inspecter(browser, viewport, [VERSION]);
      if (avec.entreeIntrouvable) {
        failures.push(
          `${nom} : aucune entree "Match offre" ni "Cibler" dans l'interface. Soit elle a `
          + "ete renommee - corriger le repere ici plutot que supprimer le test - "
          + "soit elle a disparu et le panneau n'est plus atteignable."
        );
        continue;
      }
      if (!avec.zoneTrouvee) {
        failures.push(
          `${nom} : le champ de l'offre est introuvable, le panneau Cibler ne `
          + "s'est pas ouvert. Ce test ne prouve rien tant que ce n'est pas corrige."
        );
        continue;
      }
      if (!avec.present) {
        failures.push(
          `${nom} : le choix "Tout mon parcours" n'apparait pas alors qu'une `
          + "version enregistree apporte une experience et deux competences. "
          + "Le panneau est probablement monte sans la liste des versions, et "
          + "tout le travail sur le parcours est alors inaccessible ici."
        );
        continue;
      }
      // La liste, pas seulement le compte.
      for (const attendu of ["Chef de rang", "Le Comptoir"]) {
        if (!avec.texte.includes(attendu)) {
          failures.push(
            `${nom} : "${attendu}" vient de la version enregistree mais n'est pas `
            + "montre. L'ecran annonce un nombre d'experiences sans dire "
            + "lesquelles, donc sans permettre de les reconnaitre."
          );
        }
      }
      if (!/Oenologie|Encaissement/.test(avec.texte)) {
        failures.push(`${nom} : aucune des competences retrouvees n'est montree`);
      }

      // --- 4. Sans version, pas de choix vide -------------------------
      const sans = await inspecter(browser, viewport, []);
      if (sans.present) {
        failures.push(
          `${nom} : le choix "Tout mon parcours" s'affiche sans aucune version `
          + "enregistree. Il rendrait exactement le meme resultat que "
          + "\"Mon CV actuel\", et la deception coute plus cher que l'absence de choix."
        );
      }
    }

    if (!failures.length) {
      console.log(
        "      le choix parcours apparait sur les 2 ecrans, nomme ce qu'il a "
        + "retrouve, et disparait quand il n'apporte rien"
      );
    }
  } catch (err) {
    failures.push(`le test a plante : ${err && err.message}`);
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
