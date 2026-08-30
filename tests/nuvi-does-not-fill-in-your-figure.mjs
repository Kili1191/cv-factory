// Nuvi ne met pas un chiffre a la place de la personne.
//
// CE QUI ETAIT ECRIT
//
// Le registre "impact" du reformulateur de puces disait au modele :
//
//   "Si la phrase originale ne contient pas de chiffre, propose une
//    fourchette plausible (par exemple: +15-25%, 5-10 personnes)."
//
// Trois lignes plus bas, dans le meme prompt, QUI_DECIDE lui interdit
// d'ajouter de sa propre autorite un chiffre qui n'est pas dans le CV. Le
// prompt ordonnait une chose et son contraire, et le modele suivait la plus
// precise des deux : celle qui donnait des exemples.
//
// POURQUOI C'EST GRAVE ICI PLUS QU'AILLEURS
//
// Un chiffre invente ne coute rien a ecrire et se paie en entretien. La
// personne arrive avec un "+20 % de chiffre d'affaires" qu'elle n'a jamais
// mesure, un recruteur lui demande comment elle l'a obtenu, et elle n'a rien
// a repondre. Le produit promet a quelqu'un un CV credible : lui donner une
// phrase qu'elle ne peut pas defendre est le contraire du service rendu.
//
// CE QUE LE PRODUIT FAIT MAINTENANT
//
// Le registre garde la forme du resultat et rend la mesure a qui la connait :
// la phrase revient avec le marqueur [?] a l'endroit du chiffre, et
// l'interface demande le chiffre avant de laisser adopter la version, en
// disant pourquoi elle le demande.
//
// Ce test lit le source, pas le rendu : il n'y a pas de cle d'API dans la
// suite, donc aucune reponse de modele a observer. Ce qu'on peut prouver,
// c'est que l'instruction fautive n'est pas revenue et que l'interface ne
// laisse pas passer un trou non rempli.

import { readFile } from "node:fs/promises";
import { startServer, stopServer, launchBrowser, seedApp } from "./lib/harness.mjs";

// UN TEST QUI LIT LES COMMENTAIRES ACCUSE LE CODE QUI S'EXPLIQUE
//
// La premiere version de ce test a echoue sur le commentaire qui raconte
// l'instruction fautive : le commentaire la cite pour dire pourquoi elle a
// ete retiree, et le test y a vu l'instruction elle-meme. Un test qui punit
// le fait de documenter une correction pousse a effacer la trace de l'erreur,
// ce qui est exactement l'inverse de ce que la maison veut.
//
// On retire donc les lignes de commentaire avant de chercher. Uniquement les
// lignes qui COMMENCENT par //, pour ne pas amputer une chaine qui contient
// un "https://" ou une barre oblique.
function sansCommentaires(src) {
  return src.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
}

export async function run() {
  const failures = [];

  const appRoot = sansCommentaires(
    await readFile(new URL("../app/AppRoot.jsx", import.meta.url), "utf8"));
  const transformer = await readFile(
    new URL("../app/components/BulletTransformer.jsx", import.meta.url), "utf8");
  const fr = await readFile(new URL("../app/i18n/fr.js", import.meta.url), "utf8");
  const en = await readFile(new URL("../app/i18n/en.js", import.meta.url), "utf8");

  // 1. Aucun prompt ne redemande une estimation inventee.
  //
  // On cherche les tournures exactes qui ont existe, plus la famille a
  // laquelle elles appartiennent. Une variante formulee autrement passerait,
  // et c'est assume : un test qui pretend attraper toutes les manieres de
  // dire la meme chose se met a accuser du code correct.
  const INTERDITS = [
    /fourchette plausible/i,
    /estimation chiffree credible/i,
    /propose une fourchette/i,
    /invente un chiffre/i,
  ];
  for (const r of INTERDITS) {
    if (r.test(appRoot)) {
      failures.push(
        "un prompt redemande un chiffre invente (" + r.source + "). Ce chiffre "
        + "ne coute rien a ecrire et se paie en entretien : la personne ne "
        + "peut pas defendre une mesure qu'elle n'a jamais faite."
      );
    }
  }

  // 2. Le prompt dit explicitement de ne rien inventer et nomme le marqueur.
  if (!/marqueur exact \[\?\]/.test(appRoot)) {
    failures.push(
      "le prompt ne demande plus le marqueur [?] a la place du chiffre "
      + "manquant. Sans lui, le modele n'a que deux issues : inventer, ou "
      + "rendre une phrase qui n'est plus un resultat."
    );
  }
  if (!/N'invente ni chiffre, ni pourcentage/.test(appRoot)) {
    failures.push(
      "l'interdiction d'inventer un chiffre a disparu du registre impact. "
      + "QUI_DECIDE la porte deja en general, et c'est exactement ici qu'elle "
      + "avait ete contredite."
    );
  }

  // 3. L'interface bloque l'adoption tant que le trou n'est pas comble.
  if (!/disabled=\{aUnTrou\(levels\[c\.key\]\) && !\(chiffres\[c\.key\] \|\| ""\)\.trim\(\)\}/.test(transformer)) {
    failures.push(
      "le bouton Adopter n'est plus desactive quand la version porte un trou. "
      + "La personne mettrait alors un [?] litteral sur son CV, ce qui est pire "
      + "qu'un chiffre invente."
    );
  }
  if (!/split\(MARQUEUR\)\.join\(/.test(transformer)) {
    failures.push(
      "le marqueur n'est plus remplace par ce que la personne a tape : la "
      + "version adoptee garderait le [?]."
    );
  }

  // 4. L'interface DIT pourquoi elle demande ce chiffre.
  //
  // Une case a remplir sans raison se lit comme une corvee de plus. La raison
  // est ce qui la transforme en preparation d'entretien.
  for (const [langue, src] of [["fr", fr], ["en", en]]) {
    if (!/bt_trou_why:/.test(src)) {
      failures.push(
        "[" + langue + "] l'interface demande un chiffre sans dire pourquoi. "
        + "Sans la raison, c'est un champ obligatoire de plus ; avec elle, "
        + "c'est la question que le recruteur posera."
      );
    }
    if (!/bt_trou_label:/.test(src) || !/bt_trou_ph:/.test(src)) {
      failures.push(
        "[" + langue + "] le champ du chiffre n'a plus d'intitule ou plus "
        + "d'exemple. Sans exemple, personne ne sait ce qu'on attend : un "
        + "pourcentage, un montant, un delai."
      );
    }
  }

  // 5. Le registre ne s'appelle plus "estimation chiffree".
  if (/bt_impact_hint:"Avec estimation chiffree"/.test(fr)
      || /bt_impact_hint:"With quantified estimate"/.test(en)) {
    failures.push(
      "le registre s'annonce encore comme une estimation. Il ne produit plus "
      + "d'estimation : il produit la forme du resultat et demande la mesure."
    );
  }

  // 6. A L'ECRAN : le trou ne se ferme pas tout seul.
  //
  // Les cinq controles precedents lisent du source. Ils prouvent que la regle
  // est ecrite, pas que le produit l'applique. Sans cle d'API la suite ne peut
  // pas observer un vrai modele, mais elle peut lui substituer une reponse et
  // verifier ce que la personne peut faire avec : c'est ce que fait la suite.
  failures.push(...(await surLEcran()));

  if (!failures.length) {
    console.log(
      "      aucun prompt ne reclame de chiffre invente, la version a trou ne "
      + "s'adopte pas vide, le chiffre tape remplace le marqueur, et les deux "
      + "langues disent pourquoi il est demande"
    );
  }
  return failures;
}

// La reponse que le modele rendrait sur une puce sans chiffre : la forme du
// resultat, la mesure en attente.
const VERSIONS = {
  simple: "Tenue du bar en service",
  pro: "Pilotage du bar en service",
  ats: "Gestion de bar, encaissement, stocks",
  premium: "Orchestration du bar en service",
  impact: "Marge boissons tenue a [?] sur l'annee",
};
const REPONSE = JSON.stringify({
  content: [{ type: "text", text: JSON.stringify(VERSIONS) }],
});

const CV = {
  name: "Kilian Maisonnette", title: "Bar Manager",
  email: "k@example.com", phone: "07 00 00 00 00", location: "London",
  summary: "Bar manager, six ans en hotellerie.",
  experience: [{
    id: 1, title: "Bar Manager", company: "Taj Exotica",
    location: "London", period: "2025 - 2026",
    bullets: ["Responsable du bar et des commandes fournisseurs"],
  }],
  education: [], skills: ["Bar", "Stocks"], languages: [], certifications: [],
};

async function surLEcran() {
  const echecs = [];
  let srv = null;
  let browser = null;
  try {
    srv = await startServer();
    browser = await launchBrowser();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.route("**/api/claude", (r) => r.fulfill({
      status: 200, contentType: "application/json", body: REPONSE,
    }));
    await seedApp(page, CV, { locale: "fr" });

    // On y va comme la personne : par le diagnostic. La carte "Resultats
    // obtenus" note la puce a 0, son bouton mene a l'editeur d'experiences,
    // et c'est la que la puce se reformule. Ce chemin verifie au passage que
    // le bouton de l'axe ouvre bien quelque chose.
    await page.evaluate(() => window.__nuviOpenModal && window.__nuviOpenModal("open-score"));
    await page.waitForTimeout(1600);
    const carteAxe = page.locator("button").filter({ hasText: "Resultats obtenus" }).first();
    if (await carteAxe.count() === 0) {
      echecs.push("la carte de l'axe des resultats est absente du diagnostic.");
      await ctx.close();
      return echecs;
    }
    await carteAxe.click();
    await page.waitForTimeout(600);
    const cta = page.locator("button").filter({ hasText: "Chiffrer mes resultats" }).first();
    if (await cta.count() === 0) {
      echecs.push(
        "l'axe des resultats n'offre aucun bouton pour aller corriger : le "
        + "conseil dit quoi faire et rien ne mene a l'endroit ou le faire."
      );
      await ctx.close();
      return echecs;
    }
    await cta.click();
    await page.waitForTimeout(1200);
    const bouton = page.locator('button[title="Transformer ce bullet avec Nuvi"]').first();
    if (await bouton.count() === 0) {
      echecs.push(
        "le bouton qui reformule une puce est introuvable : le test ne peut "
        + "pas verifier ce que la personne voit."
      );
      await ctx.close();
      return echecs;
    }
    await bouton.click();
    await page.waitForTimeout(1500);

    // La carte du registre resultat, et son bouton Adopter.
    const etat = await page.evaluate(() => {
      const cartes = [...document.querySelectorAll("div")].filter(
        (d) => /Marge boissons tenue a/.test(d.textContent || "")
          && d.querySelector('button'));
      const carte = cartes[cartes.length - 1];
      if (!carte) return { trouve: false };
      const adopter = [...carte.querySelectorAll("button")].find(
        (b) => /Adopter/i.test(b.textContent || ""));
      const champ = carte.querySelector("input");
      return {
        trouve: true,
        bloque: adopter ? adopter.disabled : null,
        aUnChamp: !!champ,
        texte: (carte.textContent || "").replace(/\s+/g, " ").slice(0, 300),
      };
    });

    if (!etat.trouve) {
      echecs.push("la version a trou ne s'affiche pas du tout apres la reformulation.");
      await ctx.close();
      return echecs;
    }
    if (etat.bloque !== true) {
      echecs.push(
        "le bouton Adopter est actif alors que le chiffre n'est pas rempli. "
        + "La personne poserait un marqueur litteral sur son CV."
      );
    }
    if (!etat.aUnChamp) {
      echecs.push(
        "aucun champ ne demande le chiffre manquant. La version reste "
        + "inadoptable sans que rien ne dise comment la debloquer."
      );
    }
    if (!/n'ecrit pas ce chiffre a ta place/.test(etat.texte)) {
      echecs.push(
        "la carte ne dit pas pourquoi Nuvi ne remplit pas le chiffre : "
        + `"${etat.texte}". Un champ obligatoire sans raison se subit ; avec `
        + "la raison, c'est la question que le recruteur posera."
      );
    }

    // On tape le chiffre, on adopte, et on regarde ce qui atterrit sur le CV.
    if (etat.aUnChamp) {
      const champ = page.locator("input").filter({ hasNot: page.locator("x") });
      await page.evaluate(() => {
        const cartes = [...document.querySelectorAll("div")].filter(
          (d) => /Marge boissons tenue a/.test(d.textContent || ""));
        const carte = cartes[cartes.length - 1];
        const i = carte && carte.querySelector("input");
        if (i) i.focus();
      });
      await page.keyboard.type("78 %");
      await page.waitForTimeout(400);
      const apres = await page.evaluate(() => {
        const cartes = [...document.querySelectorAll("div")].filter(
          (d) => /Marge boissons tenue a/.test(d.textContent || "")
            && d.querySelector("button"));
        const carte = cartes[cartes.length - 1];
        const adopter = [...carte.querySelectorAll("button")].find(
          (b) => /Adopter/i.test(b.textContent || ""));
        if (adopter && !adopter.disabled) adopter.click();
        return adopter ? adopter.disabled : null;
      });
      if (apres !== false) {
        echecs.push(
          "le bouton Adopter reste bloque apres avoir tape le chiffre : la "
          + "version est inadoptable quoi qu'on fasse."
        );
      }
      await page.waitForTimeout(900);
      const surLeCv = await page.evaluate(() => document.body.innerText);
      if (/\[\?\]/.test(surLeCv)) {
        echecs.push(
          "un marqueur [?] reste visible apres adoption : il partirait sur le "
          + "CV exporte, ce qui est pire qu'un chiffre invente."
        );
      }
      if (!/78 %/.test(surLeCv)) {
        echecs.push(
          "le chiffre tape n'a pas remplace le marqueur : la personne a "
          + "repondu et sa reponse est perdue."
        );
      }
      void champ;
    }

    await ctx.close();
  } catch (err) {
    echecs.push("la verification a l'ecran a plante : "
      + (err && err.message ? err.message : String(err)));
  } finally {
    if (browser) await browser.close();
    if (srv) await stopServer(srv);
  }
  return echecs;
}
