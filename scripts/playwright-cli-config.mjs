// Ecrit .playwright/cli.config.json a partir du meme resolveur que les tests.
//
//   node scripts/playwright-cli-config.mjs
//
// playwright-cli embarque sa propre version de playwright, donc son propre
// numero de build attendu. Sur une image qui fournit deja un Chromium, il
// cherche un dossier qui n'existe pas et refuse de demarrer, alors qu'un
// binaire parfaitement utilisable est a cote. On le lui designe.
//
// Le fichier produit est ignore par git : il nomme un chemin absolu, vrai sur
// cette machine et faux sur la suivante. C'est justement pourquoi il est
// genere et non versionne.

import { mkdirSync, writeFileSync } from "node:fs";
import { cheminChromium } from "../tests/lib/chromium.mjs";

const chemin = cheminChromium();

if (!chemin) {
  // Pas d'echec : sans binaire fourni, playwright-cli telechargera le sien,
  // ce qui est le comportement normal sur un poste de developpement.
  console.log("aucun Chromium fourni par l'image, playwright-cli installera le sien");
  process.exit(0);
}

const config = {
  browser: {
    browserName: "chromium",
    launchOptions: {
      executablePath: chemin,
      // Le bac a sable exige des privileges que les conteneurs n'ont pas.
      chromiumSandbox: false,
    },
  },
};

mkdirSync(".playwright", { recursive: true });
writeFileSync(".playwright/cli.config.json", JSON.stringify(config, null, 2) + "\n");
console.log(`playwright-cli utilisera ${chemin}`);
