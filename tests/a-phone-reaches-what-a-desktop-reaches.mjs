// Ce qu'on atteint sur un appareil, on l'atteint sur l'autre.
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
// ET LE MANQUE VA DANS LES DEUX SENS
//
// La premiere version ne regardait que "present sur ordinateur, absent du
// telephone". L'historique des modifications, lui, existait dans le tiroir du
// telephone et PAS dans la barre laterale : sur ordinateur il fallait ouvrir
// les Reglages et y trouver "historique", un chemin que personne ne devine.
// Un test qui ne balaie que dans un sens laisse passer la moitie des trous,
// et donne l'impression rassurante d'avoir verifie.
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
// Les entrees du tiroir qui n'ont pas a exister dans la barre laterale.
const HORS_ORDINATEUR = {
  more: "le bouton qui ouvre le tiroir lui-meme",
  install: "l'installation sur l'ecran d'accueil ne concerne pas un ordinateur",
  score: "presente sous audits dans la barre",
  ats: "presente sous audits dans la barre",
  truth: "presente sous audits dans la barre",
  pos: "presente sous audits dans la barre",
  gap: "presente sous audits dans la barre",
  interview: "presente sous audits dans la barre",
  versions: "presente sous cvs dans la barre",
  compare: "presente sous cvs dans la barre",
  linkedin: "presente sous design dans la barre",
  translate: "presente sous design dans la barre",
  templates: "presente sous cvs dans la barre",
  edit_exp: "presente sous edit dans la barre",
  edit_edu: "presente sous edit dans la barre",
  edit_sk: "presente sous edit dans la barre",
  activity: "presente sous le nom activite dans la barre",
  edit: "presente sous le nom id dans la barre",
  design: "presente sous le nom custom dans la barre",
  cvs: "presente sous le nom list dans la barre",
};

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
  // L'historique s'appelle "activity" dans le tiroir depuis toujours et
  // "activite" dans la barre : le meme ecran, deux cles. Les rapprocher ici
  // vaut mieux que de renommer l'une des deux, ce qui casserait une cle
  // deja enregistree dans les preferences de gens qui s'en servent.
  activite: "activity",
};

function cles(source, debut, fin) {
  const bloc = source.slice(source.indexOf(debut), source.indexOf(fin, source.indexOf(debut)));
  return [...bloc.matchAll(/key:\s*"([a-z_]+)"/g)].map((m) => m[1]);
}

// LE PIED DE LA BARRE NE S'ECRIT PAS COMME LE RESTE
//
// Reglages et Reinitialiser n'y sont pas des entrees d'un tableau mais des
// appels a pied("reset", ...) et pied("settings", ...). Le releve par
// "key:" les manquait, et le controle en sens inverse a donc commence par
// accuser la barre laterale de ne pas les avoir. Elle les a depuis toujours.
// Deux facons d'ecrire la meme chose dans un fichier suffisent a faire mentir
// un test qui lit la source : il faut lire les deux.
function clesDuPied(source) {
  return [...source.matchAll(/pied\(\s*"([a-z_]+)"/g)].map((m) => m[1]);
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
      ...clesDuPied(barre),
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

      // ET DANS L'AUTRE SENS
      const inverse = {};
      for (const [k, v] of Object.entries(MEMES)) inverse[v] = k;
      const absentesDeLaBarre = [];
      for (const k of surTelephone) {
        if (HORS_ORDINATEUR[k]) continue;
        if (surOrdi.has(k)) continue;
        if (inverse[k] && surOrdi.has(inverse[k])) continue;
        absentesDeLaBarre.push(k);
      }
      if (absentesDeLaBarre.length) {
        failures.push("ces entrees existent sur telephone et pas dans la "
          + "barre laterale : " + absentesDeLaBarre.join(", ") + ". Sur "
          + "ordinateur, il faut alors les chercher dans les Reglages ou ne "
          + "jamais les trouver. La poser dans NuviSidebar, ou l'inscrire "
          + "dans HORS_ORDINATEUR avec sa raison.");
      }

      if (!failures.length) {
        console.log("      " + surOrdi.size + " entrees d'ordinateur et "
          + surTelephone.size + " du tiroir, chacune joignable des deux cotes");
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
