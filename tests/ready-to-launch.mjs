// Le crash test avant mise en ligne.
//
// POURQUOI CE TEST EXISTE
//
// Les autres suites verifient chacune UNE chose, en profondeur : le PDF, les
// italiques, la langue, le parcours. Aucune ne pose la question qui decide
// d'une mise en ligne : est-ce que TOUT tient debout, sur les deux appareils,
// quand on s'en sert vraiment ?
//
// Ce qui coule un lancement n'est presque jamais la fonction qu'on vient
// d'ecrire. C'est un ecran secondaire qui plante pour un visiteur sans CV,
// une page qui defile lateralement sur un telephone, un bouton de 28px que
// personne n'arrive a toucher, ou une action qui explose parce qu'il n'y a
// pas de cle d'API. Ces defauts ne se voient pas en developpant : on
// developpe avec un CV rempli, une cle valide, et un grand ecran.
//
// CE QU'IL FAIT
//
// Il ouvre chaque destination de l'application, sur ordinateur ET sur
// telephone, dans quatre situations : visiteur neuf sans rien, utilisateur
// normal, CV monstrueux, et sans cle d'API. A chaque ecran il regarde :
//
//   1. ERREURS JAVASCRIPT. Un ecran qui jette est un ecran mort. Aucune
//      tolerance : c'est le seul critere ou zero est la seule note qui passe.
//   2. DEFILEMENT LATERAL sur telephone. Le defaut "pas adapte au mobile"
//      par excellence, et il est invisible sur un grand ecran.
//   3. ZONES DE TOUCHE. Sous 44px, on rate le bouton. C'est le plancher
//      d'Apple, et il vaut pour tout le monde.
//   4. DEBORDEMENT. Un element dont le rectangle sort de l'ecran est un
//      element que personne ne lira.
//
// CE QU'IL NE FAIT PAS, ET IL FAUT LE SAVOIR
//
// Il ne juge pas le gout, ne verifie pas les textes, ne mesure pas les
// performances, et ne remplace aucune des autres suites. Il repond a une
// seule question : est-ce que ca tient debout partout. Vert ici ne veut pas
// dire "beau", ca veut dire "rien ne casse".

import { startServer, stopServer, launchBrowser, BASE_URL, SAMPLE_CV } from "./lib/harness.mjs";

const APPAREILS = [
  { nom: "ordinateur", viewport: { width: 1400, height: 900 }, mob: false },
  { nom: "telephone", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, mob: true },
];

// 44px : le plancher d'Apple, repris par les regles d'accessibilite. En
// dessous, le doigt couvre plus que la cible et on tape a cote.
const TOUCHE_MIN = 44;

// Un CV construit pour casser une mise en page : chaines tres longues sans
// espace (une URL, un mot allemand), beaucoup d'experiences, champs vides,
// accents et emoji. Rien d'exotique : tout ca arrive de vrais utilisateurs.
const CV_MONSTRE = {
  ...SAMPLE_CV,
  name: "Jean-Baptiste de la Tour-Maubourg-Villeneuve",
  title: "Responsable du developpement commercial et de la strategie partenaires Europe du Sud",
  email: "jean.baptiste.de.la.tour.maubourg@une-entreprise-au-nom-tres-long.example.com",
  summary: "A".repeat(600),
  skills: [
    "Betriebsfuehrungsverantwortlichkeit",
    "https://exemple.fr/un/chemin/vraiment/tres/long/qui/ne/coupe/nulle/part",
    "", "  ", "Négociation", "Excel", "SQL", "Gestion d'équipe", "Anglais",
    "Reporting", "CRM", "Prospection", "Budget", "Formation", "Recrutement",
  ],
  experience: Array.from({ length: 14 }, (_, i) => ({
    id: `m${i}`,
    title: i % 3 === 0 ? "" : `Poste numero ${i + 1} au titre deliberement etire`,
    company: i % 4 === 0 ? "" : `Entreprise ${i + 1}`,
    period: "2010 - 2024",
    location: "Paris",
    bullets: [
      "B".repeat(320),
      "Resultat chiffre : +42% sur douze mois",
      i % 2 ? "" : "Encadrement d'une equipe de 8 personnes",
    ],
  })),
};

// Les situations testees. Chacune decrit ce qu'on pose dans le navigateur
// AVANT que l'application demarre.
const SITUATIONS = [
  {
    nom: "visiteur neuf",
    pourquoi: "personne n'a de CV a sa premiere visite, et c'est l'ecran que tout le monde voit en premier",
    stockage: { cvf_c: "fr", cvf_tu: true },
  },
  {
    nom: "utilisateur normal",
    pourquoi: "le cas courant",
    stockage: { cvf_c: "fr", cvf_tu: true, cvf_k: "sk-test-not-used", cvf_d: SAMPLE_CV },
  },
  {
    nom: "CV monstrueux",
    pourquoi: "les mises en page cassent sur les chaines longues et les champs vides, pas sur les exemples",
    stockage: { cvf_c: "fr", cvf_tu: true, cvf_k: "sk-test-not-used", cvf_d: CV_MONSTRE },
  },
  {
    nom: "sans cle d'API",
    pourquoi: "toutes les actions d'IA doivent se refuser proprement, pas exploser",
    stockage: { cvf_c: "fr", cvf_tu: true, cvf_d: SAMPLE_CV },
  },
];

async function preparer(browser, appareil, situation) {
  const { nom, mob, ...ctxOpts } = appareil;
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();

  const erreurs = [];
  page.on("pageerror", (e) => erreurs.push(String(e && e.message || e)));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    // Les 404 de ressources et les avertissements d'hydratation de React en
    // developpement ne sont pas des plantages. On garde ce qui vient du code.
    if (/favicon|manifest|net::ERR_|Failed to load resource/i.test(t)) return;
    erreurs.push("console: " + t);
  });

  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => {
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v));
  }, situation.stockage);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2600);
  return { ctx, page, erreurs };
}

// Les destinations ne sont PAS codees en dur : on les decouvre. Une liste
// figee se perime des qu'une entree est renommee, et le test passe alors au
// vert en ne testant plus rien. En echange, on exige d'en trouver assez :
// "je n'ai rien trouve, donc tout va bien" est le pire des resultats.
async function destinations(page, mob) {
  if (!mob) {
    await page.mouse.move(30, 400);
    await page.waitForTimeout(700);
  }
  return page.evaluate(() => {
    const vus = new Set();
    const sortie = [];
    for (const el of document.querySelectorAll("button, a, [role=button], li, div")) {
      const t = (el.innerText || "").replace(/\s+/g, " ").trim();
      if (!t || t.length > 26 || t.includes("\n")) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 20 || r.height < 20) continue;
      // On ne garde que la feuille : les conteneurs portent le meme texte.
      if ([...el.children].some((c) => (c.innerText || "").trim() === t)) continue;
      const cle = t.toLowerCase();
      if (vus.has(cle)) continue;
      vus.add(cle);
      sortie.push(t);
    }
    return sortie;
  });
}

// CE QU'ON NE CLIQUE PAS
//
// Le balayage clique tout ce qu'il trouve. Deux categories ne doivent JAMAIS
// etre touchees :
//   - ce qui detruit : "Reset" efface le CV, et les ecrans suivants seraient
//     alors testes a vide sans qu'on s'en apercoive. Le test se saboterait
//     lui-meme, et passerait au vert pour la mauvaise raison.
//   - ce qui coute : un export PDF prend des dizaines de secondes et n'a rien
//     a voir avec ce qu'on mesure ici. Une autre suite s'en occupe.
const A_NE_PAS_CLIQUER = /^(reset|telecharger|download|supprimer|delete|se deconnecter|sign out|log out|effacer)$/i;

async function cliquer(page, libelle, mob) {
  if (!mob) {
    await page.mouse.move(30, 400);
    await page.waitForTimeout(400);
  }
  const ok = await page.evaluate((l) => {
    const tous = [...document.querySelectorAll("button, a, [role=button], li, div")]
      .filter((x) => (x.innerText || "").replace(/\s+/g, " ").trim() === l)
      .filter((x) => ![...x.children].some((c) => (c.innerText || "").trim() === l));
    const cible = tous[tous.length - 1];
    if (!cible) return false;
    cible.click();
    return true;
  }, libelle);
  await page.waitForTimeout(1300);
  return ok;
}

// L'etat de l'ecran, mesure dans le navigateur.
function ausculter(page, mob, TOUCHE_MIN) {
  return page.evaluate(({ mob, TOUCHE_MIN }) => {
    const doc = document.documentElement;
    const vp = { w: window.innerWidth, h: window.innerHeight };

    // Un element est-il reellement visible ? Un rectangle n'est pas une
    // preuve : il faut qu'aucun ancetre ne le masque ni ne le decoupe.
    const visible = (el) => {
      const s = getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return false;
      let p = el.parentElement;
      let box = { l: r.left, t: r.top, r: r.right, b: r.bottom };
      while (p && p !== doc) {
        const ps = getComputedStyle(p);
        if (ps.display === "none" || ps.visibility === "hidden") return false;
        if (/auto|scroll|hidden/.test(ps.overflow + ps.overflowX + ps.overflowY)) {
          const pr = p.getBoundingClientRect();
          box = {
            l: Math.max(box.l, pr.left), t: Math.max(box.t, pr.top),
            r: Math.min(box.r, pr.right), b: Math.min(box.b, pr.bottom),
          };
          if (box.r - box.l < 1 || box.b - box.t < 1) return false;
        }
        p = p.parentElement;
      }
      return true;
    };

    const petits = [];
    const dehors = [];
    if (mob) {
      for (const el of document.querySelectorAll("button, a, [role=button], input, select, textarea")) {
        if (!visible(el)) continue;
        const r = el.getBoundingClientRect();
        const t = (el.innerText || el.value || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 30);
        if (r.height < TOUCHE_MIN - 0.5 || r.width < TOUCHE_MIN - 0.5) {
          petits.push({ t: t || el.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height) });
        }
        // Un element dont le centre est hors de l'ecran est inatteignable.
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (cx < 0 || cx > vp.w || cy < -1 || cy > vp.h + 1) {
          // Hors ecran verticalement peut simplement vouloir dire "plus bas".
          if (cx < 0 || cx > vp.w) dehors.push({ t: t || el.tagName.toLowerCase(), x: Math.round(cx) });
        }
      }
    }

    return {
      // Le defilement lateral : la page est plus large que la fenetre.
      largeurDoc: doc.scrollWidth,
      largeurVue: doc.clientWidth,
      petits: petits.slice(0, 6),
      nbPetits: petits.length,
      dehors: dehors.slice(0, 4),
      texte: (document.body.innerText || "").replace(/\s+/g, " ").slice(0, 120),
    };
  }, { mob, TOUCHE_MIN });
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();
  const bilan = [];
  const petitsGroupes = new Map();

  try {
    for (const appareil of APPAREILS) {
      for (const situation of SITUATIONS) {
        const { ctx, page, erreurs } = await preparer(browser, appareil, situation);
        const ou = `${appareil.nom} / ${situation.nom}`;

        try {
          // Certaines situations ouvrent la question de la langue. On y
          // repond, sinon rien derriere n'est cliquable et le balayage ne
          // verifie qu'un seul ecran.
          await page.evaluate(() => {
            const d = document.querySelector('[data-nuvi-lang-ask="1"]');
            if (d) d.querySelector('button[lang="fr"]')?.click();
          });
          await page.waitForTimeout(900);

          const liste = await destinations(page, appareil.mob);
          // Le garde-fou : trop peu d'entrees veut dire que la decouverte a
          // echoue, PAS que l'application est simple.
          if (liste.length < 4) {
            failures.push(
              `${ou} : seulement ${liste.length} destination(s) trouvee(s) `
              + `(${JSON.stringify(liste)}). Le balayage n'a rien pu explorer, `
              + "donc ce resultat ne prouve rien."
            );
            continue;
          }

          // Ecran d'arrivee compris, puis chaque destination.
          const etapes = ["(arrivee)", ...liste];
          let explorees = 0;
          for (const etape of etapes) {
            if (etape !== "(arrivee)") {
              if (A_NE_PAS_CLIQUER.test(etape)) continue;
              const ouvert = await cliquer(page, etape, appareil.mob);
              if (!ouvert) continue;
            }
            explorees += 1;
            const vu = await ausculter(page, appareil.mob, TOUCHE_MIN);

            if (appareil.mob && vu.largeurDoc > vu.largeurVue + 1) {
              failures.push(
                `${ou} > ${etape} : la page defile lateralement `
                + `(${vu.largeurDoc}px de contenu pour ${vu.largeurVue}px d'ecran). `
                + "C'est le defaut \"pas adapte au mobile\" par excellence, et il "
                + "est invisible sur grand ecran."
              );
            }
            // Les zones trop petites sont regroupees et rapportees UNE fois a
            // la fin. Une ligne par ecran donnerait quarante lignes disant la
            // meme chose sur le meme bouton vu quarante fois, et le vrai
            // probleme se noierait dans le bruit.
            for (const p of vu.petits) {
              const cle = `${p.t}|${p.w}x${p.h}`;
              const deja = petitsGroupes.get(cle);
              if (deja) { deja.ecrans.add(etape); }
              else { petitsGroupes.set(cle, { ...p, ecrans: new Set([etape]) }); }
            }
            if (vu.dehors.length) {
              failures.push(
                `${ou} > ${etape} : ${vu.dehors.length} commande(s) hors de l'ecran `
                + `horizontalement : ${vu.dehors.map((d) => `"${d.t}" a x=${d.x}`).join(", ")}`
              );
            }
            // On revient a l'accueil entre deux destinations quand c'est une
            // feuille qui s'est ouverte : sinon on empile les modales.
            await page.keyboard.press("Escape").catch(() => {});
            await page.waitForTimeout(350);
          }
          bilan.push(`${ou}:${explorees}`);
        } finally {
          if (erreurs.length) {
            const uniques = [...new Set(erreurs)].slice(0, 4);
            failures.push(
              `${ou} : ${erreurs.length} erreur(s) JavaScript pendant le parcours. `
              + `${uniques.join(" | ")}. ${situation.pourquoi}.`
            );
          }
          await ctx.close();
        }
      }
    }

    if (petitsGroupes.size) {
      const lignes = [...petitsGroupes.values()]
        .sort((x, y) => (x.w * x.h) - (y.w * y.h))
        .slice(0, 12)
        .map((p) => `"${p.t}" ${p.w}x${p.h} (${[...p.ecrans].slice(0, 3).join(", ")})`);
      failures.push(
        `${petitsGroupes.size} commande(s) distinctes sous ${TOUCHE_MIN}px sur `
        + `telephone. Sous ce plancher, le doigt couvre plus que la cible et on `
        + `tape a cote. Les plus petites : ${lignes.join(" ; ")}`
        + (petitsGroupes.size > 12 ? ` ... et ${petitsGroupes.size - 12} autres.` : "")
      );
    }
    if (!failures.length) {
      console.log(`      ecrans parcourus sans casse : ${bilan.join("  ")}`);
    }
  } catch (err) {
    failures.push(`le crash test a plante : ${err && err.message}`);
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
