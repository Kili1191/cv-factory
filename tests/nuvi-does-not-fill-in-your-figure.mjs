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
// LA CORRECTION QUI A RATE
//
// La premiere correction rendait la phrase avec un trou et refusait de la
// laisser adopter tant que la personne n'avait rien tape. Honnete, et
// inutilisable. Montrer une case vide et le mot "chiffre" a quelqu'un a qui
// on n'a jamais demande de mesurer son travail, ce n'est pas poser une
// question, c'est faire passer un examen. La personne ne repond pas, elle
// ferme le panneau. Une fonctionnalite qu'on n'utilise pas ne protege
// personne : elle laisse la puce en l'etat, ce qui etait le probleme.
//
// CE QUE LE PRODUIT FAIT MAINTENANT
//
// Le modele fait le travail qu'il sait faire : il connait le metier, il sait
// quels chiffres s'y mesurent. Il pose la vraie question ("Combien de
// couverts par service ?") et propose trois valeurs plausibles. La phrase
// arrive COMPLETE, avec la premiere proposition en place, adoptable d'un
// geste. La personne reconnait son chiffre, en tape un autre, ou corrige.
//
// Ce qui reste vrai : le chiffre propose est marque comme une proposition,
// il se change d'un tap, et la carte dit qu'il faut le verifier parce que
// c'est celui qu'un recruteur demandera d'expliquer. Ce qui n'est plus vrai :
// on ne bloque plus la personne. Reconnaitre son chiffre parmi trois, c'est
// encore le sien ; une case vide, c'est un abandon.
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
  // LA QUESTION EST DU TEXTE NEUF, DONC SA LANGUE SE DIT
  //
  // "en gardant la langue d'origine" porte sur les cinq reformulations : ce
  // sont des reecritures, elles heritent de la langue de la phrase.
  // impact_question et impact_choix sont neufs, adresses a la personne. Ce
  // prompt etant redige en francais, le modele repondait en francais a
  // quelqu'un qui avait choisi l'anglais.
  if (!/MEME LANGUE que la phrase/.test(appRoot)) {
    failures.push(
      "le prompt n'impose plus la langue de la question et des propositions. "
      + "Ce sont les deux seuls champs qui ne sont pas des reformulations : "
      + "sans consigne, ils reviennent dans la langue du prompt, et une "
      + "personne qui a choisi l'anglais lit une question en francais."
    );
  }
  if (!/impact_question/.test(appRoot) || !/impact_choix/.test(appRoot)) {
    failures.push(
      "le prompt ne reclame plus la question du metier et ses propositions. "
      + "Sans elles la carte retombe sur une case vide, et une case vide n'est "
      + "pas une question : c'est un examen que la personne ne passe pas."
    );
  }
  if (!/Un chiffre glisse dans la phrase\s*"\s*\+\s*"sans le dire est un chiffre invente/.test(appRoot)
      && !/sans le dire est un chiffre invente/.test(appRoot)) {
    failures.push(
      "l'interdiction d'ecrire un chiffre invente A L'INTERIEUR de la phrase a "
      + "disparu. C'est la seule difference qui compte entre proposer et "
      + "inventer : dans impact_choix la personne le voit et le change, dans la "
      + "phrase elle ne sait meme pas qu'il vient du modele."
    );
  }

  // 3. L'interface bloque l'adoption tant que le trou n'est pas comble.
  if (!/const valeur = \(k\)/.test(transformer)
      || !/return \(propositions\[0\] \|\| ""\)\.trim\(\)/.test(transformer)) {
    failures.push(
      "la carte ne retombe plus sur la proposition du modele quand la personne "
      + "n'a rien tape. Elle redevient une case vide a remplir, ce qui est la "
      + "version dont on est parti."
    );
  }
  if (!/split\(MARQUEUR\)\.join\(/.test(transformer)) {
    failures.push(
      "le marqueur n'est plus remplace par la valeur retenue : la version "
      + "adoptee garderait le [?]."
    );
  }
  if (!/disabled=\{aUnTrou\(levels\[c\.key\]\) && !valeur\(c\.key\)\}/.test(transformer)) {
    failures.push(
      "la carte laisse adopter une phrase dont le trou n'a AUCUNE valeur, ni "
      + "tapee ni proposee. Un [?] litteral partirait sur le CV, ce qui est "
      + "pire qu'un chiffre approximatif."
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
      "le registre s'annonce encore comme une estimation faite par la machine. "
      + "Le chiffre est une proposition que la personne valide ou corrige."
    );
  }
  for (const [langue, src] of [["fr", fr], ["en", en]]) {
    if (!/bt_trou_q:/.test(src)) {
      failures.push(
        "[" + langue + "] la question de repli a disparu. Quand le modele "
        + "n'en fournit pas, la carte afficherait un champ sans rien demander."
      );
    }
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
      "      aucun chiffre invente ne se glisse dans la phrase, la carte arrive "
      + "remplie et adoptable, la question du metier est posee, les propositions "
      + "se changent d'un tap, et c'est la valeur choisie qui part sur le CV"
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
  impact_question: "Quelle marge tenais-tu sur les boissons ?",
  impact_choix: ["65 %", "72 %", "80 %"],
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
    // Le texte du bouton est aussi contenu dans le texte de la carte qui le
    // porte : un filtre "hasText" attrape la carte avant le bouton, et le
    // clic replie la carte au lieu d'ouvrir l'editeur. On demande donc le
    // bouton dont le nom accessible EST exactement celui-la.
    const cta = page.getByRole("button", { name: "Chiffrer mes resultats", exact: true }).first();
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
    // Le titre exact vient de l'i18n (bt_btn_title) et a deja change une
    // fois : on s'accroche a son debut, pas a sa formulation complete.
    const bouton = page.locator('button[title^="Transformer ce bullet"]').first();
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
        texte: (carte.textContent || "").replace(/\s+/g, " ").slice(0, 900),
      };
    });

    if (!etat.trouve) {
      echecs.push("la version a trou ne s'affiche pas du tout apres la reformulation.");
      await ctx.close();
      return echecs;
    }

    // LE POINT QUI A CHANGE : LA CARTE N'EST PAS UN CUL-DE-SAC
    //
    // Avant, cette carte arrivait avec un trou et un bouton mort. Elle arrive
    // maintenant remplie de la premiere proposition du modele : la personne
    // adopte d'un geste si le chiffre lui parle, et le change sinon.
    if (etat.bloque !== false) {
      echecs.push(
        "le bouton Adopter est inerte alors que le modele a propose des "
        + "valeurs. La personne se retrouve devant une case a remplir, ce qui "
        + "est la version dont on est parti : elle ferme le panneau et la puce "
        + "reste telle quelle."
      );
    }
    if (!/65 %/.test(etat.texte)) {
      echecs.push(
        "la phrase n'affiche pas la proposition du modele a la place du "
        + `marqueur : "${etat.texte}". Un trou ne se remplit pas tout seul dans `
        + "la tete de quelqu'un a qui on n'a jamais demande de mesurer son travail."
      );
    }

    // LA QUESTION EST POSEE, ET ELLE EST REPONDABLE
    if (!/Quelle marge tenais-tu sur les boissons/.test(etat.texte)) {
      echecs.push(
        "la question du modele n'est pas affichee. Sans elle, la personne voit "
        + "un chiffre surligne sans savoir ce qu'il mesure ni ce qu'on lui demande."
      );
    }
    for (const v of ["72 %", "80 %"]) {
      if (!etat.texte.includes(v)) {
        echecs.push(
          `la proposition "${v}" n'est pas offerte. Reconnaitre son chiffre `
          + "parmi plusieurs est ce qui rend la question repondable ; une seule "
          + "valeur imposee redevient une affirmation du modele."
        );
      }
    }
    if (!/proposant|propose ce chiffre|suggests this figure/i.test(etat.texte)) {
      echecs.push(
        "la carte ne dit pas que le chiffre est une proposition a verifier : "
        + `"${etat.texte}". La personne le prendrait pour une mesure, et c'est `
        + "elle qu'un recruteur interrogera dessus."
      );
    }

    // ON CHANGE LA VALEUR D'UN TAP, ET C'EST ELLE QUI PART SUR LE CV
    const autre = page.getByRole("button", { name: "80 %", exact: true }).first();
    if (await autre.count() === 0) {
      echecs.push("les propositions ne sont pas des boutons : on ne peut pas en changer d'un tap.");
      await ctx.close();
      return echecs;
    }
    await autre.click();
    await page.waitForTimeout(400);

    const adopter = page.getByRole("button", { name: "Adopter", exact: true });
    const nb = await adopter.count();
    let clique = false;
    for (let i = 0; i < nb; i++) {
      const b = adopter.nth(i);
      const texteCarte = await b.evaluate(
        (el) => (el.closest("div").parentElement.textContent || ""));
      if (!/Marge boissons tenue a/.test(texteCarte)) continue;
      if (await b.isDisabled()) break;
      await b.click();
      clique = true;
      break;
    }
    if (!clique) {
      echecs.push("le bouton Adopter de la carte a trou est introuvable ou inerte.");
    }
    await page.waitForTimeout(1200);

    const surLeCv = await page.evaluate(() => document.body.innerText);
    if (/\[\?\]/.test(surLeCv)) {
      echecs.push(
        "un marqueur [?] reste visible apres adoption : il partirait sur le "
        + "CV exporte, ce qui est pire qu'un chiffre approximatif."
      );
    }
    if (!/80 %/.test(surLeCv)) {
      echecs.push(
        "la valeur choisie par la personne n'est pas celle qui atterrit sur le "
        + "CV : elle a repondu et sa reponse est perdue."
      );
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
