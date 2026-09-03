// La pastille de la navigation dit une chose vraie, ou ne s'affiche pas.
//
// CE QUI EXISTAIT
//
// Les deux barres, laterale et telephone, acceptent un objet
// `hasNotification` depuis le debut et savent dessiner la pastille. Personne
// ne le leur passait. La fonctionnalite existait des deux cotes du fil et ne
// pouvait pas se declencher : du code correct, teste par personne, visible
// par personne.
//
// POURQUOI UNE PASTILLE MERITE SON PROPRE TEST
//
// C'est le seul element d'interface dont la valeur ne tient pas a ce qu'il
// montre mais a ce qu'il PROMET : "il y a quelque chose ici, va voir". Une
// pastille qui se trompe une fois n'est plus jamais regardee, et elle emmene
// avec elle la confiance dans toutes les autres. C'est aussi l'element le
// plus facile a truquer : l'afficher toujours donnerait une interface qui a
// l'air vivante et un test de presence au vert.
//
// On mesure donc les deux moities de l'affirmation :
//
//   1. Elle apparait quand c'est vrai. Une candidature envoyee il y a huit
//      jours, sans reponse : il y a une relance a ecrire.
//   2. Elle N'apparait PAS quand ce n'est pas vrai. La meme candidature
//      envoyee hier, et une candidature ancienne deja passee en entretien.
//
// Le second controle est celui qui compte. Sans lui, une pastille collee en
// permanence passerait le premier.

import { startServer, stopServer, launchBrowser, seedApp } from "./lib/harness.mjs";

const ilYA = (jours) =>
  new Date(Date.now() - jours * 86400000).toISOString().slice(0, 10);

// Les trois etats du monde, et ce que la pastille doit en dire.
const CAS = [
  {
    nom: "une candidature de huit jours restee sans reponse",
    attendue: true,
    applications: [{ id: "a1", company: "Elmwood", role: "Care Assistant",
                     status: "applied", date: ilYA(8) }],
  },
  {
    nom: "une candidature envoyee hier",
    attendue: false,
    applications: [{ id: "a1", company: "Elmwood", role: "Care Assistant",
                     status: "applied", date: ilYA(1) }],
  },
  {
    nom: "une vieille candidature deja passee en entretien",
    attendue: false,
    applications: [{ id: "a1", company: "Elmwood", role: "Care Assistant",
                     status: "interview", date: ilYA(40) }],
  },
];

// La pastille de la barre laterale se dessine a cote de son entree. On
// compare la presence d'un point sur "Candidatures" avec ce que la regle
// impose, plutot que de chercher une classe : le dessin peut changer, la
// question ne change pas.
const SONDE = `(() => {
  const entrees = [...document.querySelectorAll('[role="button"], button')];
  const cible = entrees.find((e) =>
    /^(Applications|Candidatures)$/i.test((e.innerText || "").trim()));
  if (!cible) return { trouvee: false };
  // Un point : un element rond, plein, minuscule, a l'interieur de l'entree.
  const points = [...cible.querySelectorAll("*")].filter((e) => {
    const r = e.getBoundingClientRect();
    if (r.width < 3 || r.width > 14 || Math.abs(r.width - r.height) > 3) return false;
    const cs = getComputedStyle(e);
    const rond = parseFloat(cs.borderRadius) >= r.width / 2 - 1
      || cs.borderRadius.includes("%");
    const plein = cs.backgroundColor && !/rgba\\(0,\\s*0,\\s*0,\\s*0\\)|transparent/.test(cs.backgroundColor);
    return rond && plein && !(e.textContent || "").trim();
  });
  return { trouvee: true, pastille: points.length > 0 };
})()`;

async function jouer(browser, cas) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on("pageerror", (e) => erreurs.push(e.message.split("\n")[0].slice(0, 90)));
  await seedApp(page, undefined, { locale: "en" });

  // Les candidatures vivent dans le stockage local : on les pose et on
  // recharge, comme quelqu'un qui revient sur l'application le lendemain.
  await page.evaluate((apps) => {
    localStorage.setItem("cvf_ap", JSON.stringify(apps));
  }, cas.applications);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2200);

  const vu = await page.evaluate(SONDE);
  await ctx.close();
  return { vu, erreurs };
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();

  try {
    // LA REGLE ELLE-MEME, SANS NAVIGATEUR
    //
    // Elle est partagee par la pastille et par le tableau de suivi. Si les
    // deux se mettaient a repondre differemment, la pastille dirait trois et
    // le tableau en montrerait cinq.
    const { aRelancer, combienARelancer, JOURS_AVANT_RELANCE } =
      await import("../lib/applicationFollowUp.js");
    if (JOURS_AVANT_RELANCE !== 7) {
      failures.push("le seuil de relance vaut " + JOURS_AVANT_RELANCE
        + " jours. Le pack de candidature ecrit une relance \"a envoyer 7 a "
        + "10 jours apres\" : les deux doivent dire la meme chose.");
    }
    for (const cas of CAS) {
      const dit = combienARelancer(cas.applications) > 0;
      if (dit !== cas.attendue) {
        failures.push("la regle repond " + dit + " pour \"" + cas.nom
          + "\" alors qu'on attend " + cas.attendue + ".");
      }
    }
    if (aRelancer({ status: "applied", date: null })) {
      failures.push("une candidature sans date compte comme a relancer : une "
        + "ligne saisie a la hate ferait apparaitre une pastille perpetuelle.");
    }

    // ET CE QUE L'ECRAN EN FAIT
    let vues = 0;
    for (const cas of CAS) {
      const { vu, erreurs } = await jouer(browser, cas);
      for (const e of erreurs) failures.push(cas.nom + " : erreur JavaScript, " + e);

      if (!vu.trouvee) {
        failures.push(cas.nom + " : aucune entree \"Applications\" dans la "
          + "barre : le test ne mesure plus ce qu'il croit mesurer.");
        continue;
      }
      vues += 1;
      if (vu.pastille !== cas.attendue) {
        failures.push(cas.nom + " : la pastille est "
          + (vu.pastille ? "affichee" : "absente") + " alors qu'elle devrait "
          + (cas.attendue ? "l'etre" : "ne pas l'etre")
          + (cas.attendue
            ? ". Personne ne verra qu'il y a une relance a ecrire."
            : ". Une pastille qui se trompe une fois n'est plus jamais "
              + "regardee, et elle emmene la confiance dans les autres."));
      }
    }

    if (vues < CAS.length) {
      failures.push("seulement " + vues + " cas sur " + CAS.length + " ont pu "
        + "etre mesures a l'ecran.");
    } else if (!failures.length) {
      console.log("      la pastille apparait sur une relance due, et sur "
        + "rien d'autre");
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
