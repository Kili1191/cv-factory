import { chromium } from "playwright";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";

// Meme resolution que le harnais des tests : l'image fournit un binaire a un
// emplacement fixe, que Playwright ne trouve plus tout seul depuis une mise a
// jour ratee.
const BIN = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const opts = existsSync(BIN) ? { executablePath: BIN } : {};

// POURQUOI CES ICONES SONT OPAQUES
//
// Sur l'ecran d'accueil d'un iPhone, une icone transparente est composee sur
// du noir : l'oeil de Nuvi, dont le corps est creme, deviendrait un trou noir
// avec un iris dedans. iOS applique lui-meme le masque arrondi, donc l'image
// doit etre un carre plein, sans coins arrondis dessines a la main - sinon on
// voit deux arrondis superposes.
//
// Le fond reprend le creme de l'application : l'icone posee sur l'ecran
// d'accueil et l'ecran de lancement sont alors de la meme couleur, et le
// demarrage ne fait pas de flash blanc.
const CREAM = "#faf8f3";

// `pad` est la marge autour de l'oeil, en fraction du cote.
//
//   0.10  icones classiques (iOS et Android rognent peu)
//   0.14  icone "maskable" d'Android, ou le systeme peut rogner jusqu'a un
//         cercle inscrit : tout ce qui depasse des 80% centraux peut
//         disparaitre. A 0.14 le dessin occupe les 72% centraux, donc il
//         tient entierement dans ce cercle - et il reste assez grand pour
//         etre reconnaissable, ce qui n'etait plus le cas a 0.20.
const svg = (size, pad, transparent) => {
  const inner = 1 - pad * 2;
  const stroke = size >= 96 ? 4 : size >= 48 ? 5 : 6;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 180 180">
  <defs>
    <radialGradient id="body" cx="35%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#FFFCF7"/>
      <stop offset="55%" stop-color="#FAF1ED"/>
      <stop offset="100%" stop-color="#E5C9B8"/>
    </radialGradient>
    <radialGradient id="iris" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#9d7fe0"/>
      <stop offset="60%" stop-color="#6d3fc4"/>
      <stop offset="100%" stop-color="#5631a3"/>
    </radialGradient>
  </defs>
  ${transparent ? "" : `<rect width="180" height="180" fill="${CREAM}"/>`}
  <g transform="translate(${180 * pad}, ${180 * pad}) scale(${inner})">
    <!-- L'oeil s'inscrit de y=20 a y=164 : son centre est a 92, pas a 90.
         Sans cette correction de deux unites, l'icone posee sur l'ecran
         d'accueil est visiblement plus basse que ses voisines, ce qui se
         remarque sans qu'on sache dire pourquoi. -->
    <g transform="translate(0, -2)">
      <path d="M 90 20 C 132 22, 167 51, 169 91 C 170 131, 136 164, 88 162 C 40 160, 9 129, 11 87 C 13 49, 48 20, 90 20 Z"
            fill="url(#body)" stroke="#c25b3f" stroke-width="${stroke}" stroke-linejoin="round"/>
      <path d="M 48 46 Q 90 30, 132 48" fill="none" stroke="#6d3fc4"
            stroke-width="${size >= 48 ? 11 : 14}" stroke-linecap="round"/>
      <ellipse cx="90" cy="97" rx="37" ry="36" fill="url(#iris)"/>
      <circle cx="92" cy="95" r="9" fill="#1a1a1a"/>
      <ellipse cx="100" cy="83" rx="8" ry="6.5" fill="#fbf6ee"/>
    </g>
  </g>
</svg>`;
};

const OUT = "/home/user/cv-factory/public";
mkdirSync(OUT, { recursive: true });

const targets = [
  // L'icone que iOS pose sur l'ecran d'accueil. 180 est la taille des
  // ecrans @3x ; iOS reduit lui-meme pour les autres.
  { file: "apple-touch-icon.png", size: 180, pad: 0.10, transparent: false },
  { file: "icon-192.png",         size: 192, pad: 0.10, transparent: false },
  { file: "icon-512.png",         size: 512, pad: 0.10, transparent: false },
  // Android peut rogner celle-ci jusqu'au cercle inscrit.
  { file: "icon-maskable-512.png", size: 512, pad: 0.14, transparent: false },
  // L'onglet du navigateur : la, la transparence est correctement geree et
  // permet a l'icone de vivre sur un onglet clair comme sombre.
  { file: "favicon-32.png",       size: 32,  pad: 0.02, transparent: true },
];

const browser = await chromium.launch(opts);
for (const t of targets) {
  const page = await browser.newPage({
    viewport: { width: t.size, height: t.size },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<body style="margin:0;background:transparent">${svg(t.size, t.pad, t.transparent)}</body>`,
    { waitUntil: "load" }
  );
  const buf = await page.screenshot({ omitBackground: t.transparent });
  writeFileSync(`${OUT}/${t.file}`, buf);
  console.log(`${t.file} ecrit, ${buf.length} octets`);
  await page.close();
}
await browser.close();
