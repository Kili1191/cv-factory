// Ce qu'on atteint sur un ordinateur, on l'atteint sur un telephone.
//
// LE DEFAUT, ET POURQUOI PERSONNE NE LE VOYAIT
//
// La barre laterale d'ordinateur range l'edition en quatre entrees :
// identite, experiences, formation, competences. Le tiroir du telephone n'en
// avait qu'une, "Editer", cablee en dur sur setModal("id"). Sur un telephone,
// on pouvait donc corriger son nom et son adresse, et rien de ce qui fait un
// CV. Meme chose pour les modeles de CV : le tiroir ouvrait la
// personnalisation sur l'onglet des couleurs et rien ne menait a celui des
// gabarits.
//
// Rien ne signale ce genre de manque. Les deux barres sont deux listes
// ecrites a la main, dans deux fichiers, et une entree absente d'une seule
// ressemble a un choix. Il faut comparer les deux listes pour le voir, ce que
// personne ne fait en lisant du code.
//
// Nuvi se lit et se corrige sur un telephone, souvent dehors : c'est
// l'appareil principal du produit, pas son mode degrade.
//
// CE QUE CE TEST LIT
//
// Les deux listes de navigation, dans la source. Pas l'ecran : ouvrir
// quarante entrees dans deux navigateurs prendrait des minutes pour prouver
// ce que deux listes disent deja. Ce que l'ecran doit prouver, que l'entree
// ouvre bien quelque chose, est le travail des suites qui pilotent
// l'application.

import { readFileSync } from "fs";

const RACINE = new URL("../app/", import.meta.url).pathname;

// Les entrees d'ordinateur qui n'ont pas a exister sur telephone, et
// pourquoi. Chaque ligne est un choix assume, pas un oubli range.
const HORS_TELEPHONE = {
  home: "le telephone y revient par la barre du bas",
  coach: "il a son propre bouton dans la barre du bas",
  target: "il a son propre bouton dans la barre du bas",
  live: "il a son propre bouton dans la barre du bas",
  edit: "eclate en quatre entrees dans le tiroir",
  audits: "un en-tete de section, pas une destination",
  cvs: "eclate en list, versions et compare dans le tiroir",
  design: "eclate en design, translate et templates dans le tiroir",
  list: "presente sous le nom cvs dans le tiroir",
  id: "presente sous le nom edit dans le tiroir",
  custom: "presente sous le nom design dans le tiroir",
};

// Les cles du tiroir portent parfois un autre nom que celles de la barre.
// Le rapprochement est explicite : deviner ferait passer le test sur des
// paires qui n'ont rien a voir.
const MEMES = {
  exp: "edit_exp", edu: "edit_edu", sk: "edit_sk",
  lecture: "lecture",
};

function cles(source, debut, fin) {
  const bloc = source.slice(source.indexOf(debut), source.indexOf(fin, source.indexOf(debut)));
  return [...bloc.matchAll(/key:\s*"([a-z_]+)"/g)].map((m) => m[1]);
}

export async function run() {
  const failures = [];

  try {
    const barre = readFileSync(RACINE + "components/NuviSidebar.jsx", "utf8");
    const tiroir = readFileSync(RACINE + "components/NuviBottomNav.jsx", "utf8");

    const surOrdi = new Set([
      ...cles(barre, "const subItemsMap", "const topItems"),
      ...cles(barre, "const topItems", "const middleItems"),
      ...cles(barre, "const middleItems", "]"),
    ]);
    const surTelephone = new Set(cles(tiroir, "const drawerItems", "const handleSelect"));

    if (surOrdi.size < 15 || surTelephone.size < 15) {
      failures.push("les listes relevees sont trop courtes (ordinateur "
        + surOrdi.size + ", telephone " + surTelephone.size + ") : le "
        + "balayage ne trouve plus les tableaux de navigation, sans doute "
        + "renommes.");
    } else {
      const manquantes = [];
      for (const k of surOrdi) {
        if (HORS_TELEPHONE[k]) continue;
        if (surTelephone.has(k)) continue;
        if (MEMES[k] && surTelephone.has(MEMES[k])) continue;
        manquantes.push(k);
      }
      if (manquantes.length) {
        failures.push("ces entrees existent sur ordinateur et pas sur "
          + "telephone : " + manquantes.join(", ") + ". Nuvi se corrige "
          + "surtout sur un telephone ; une fonctionnalite absente du tiroir "
          + "n'existe pas pour la plupart des gens. La poser dans "
          + "NuviBottomNav, ou l'inscrire dans HORS_TELEPHONE avec sa raison.");
      }

      if (!failures.length) {
        console.log("      " + surOrdi.size + " entrees d'ordinateur, toutes "
          + "joignables depuis le tiroir du telephone");
      }
    }
  } catch (err) {
    failures.push("le test lui-meme a plante : " + (err && err.message));
  }

  return failures;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((f) => {
    for (const l of f) console.log("ECHEC " + l);
    process.exit(f.length ? 1 : 0);
  });
}
