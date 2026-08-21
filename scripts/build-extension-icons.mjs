import { chromium } from "playwright";
import { writeFileSync, existsSync } from "node:fs";

// Meme resolution que le harnais des tests : l'image fournit un binaire a un
// emplacement fixe, que Playwright ne trouve plus tout seul depuis une mise a
// jour ratee.
const BIN = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const opts = existsSync(BIN) ? { executablePath: BIN } : {};

// L'oeil de Nuvi, simplifie pour les petites tailles. A 16 pixels les bras,
// les reflets secondaires et le contour fin disparaissent de toute facon :
// les garder ne ferait que salir l'icone. On conserve ce qui identifie le
// personnage - la forme de l'oeil, le sourcil violet, l'iris et son reflet.
const svg = (size) => `
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
  <g transform="translate(0, 8)">
    <path d="M 90 20 C 132 22, 167 51, 169 91 C 170 131, 136 164, 88 162 C 40 160, 9 129, 11 87 C 13 49, 48 20, 90 20 Z"
          fill="url(#body)" stroke="#c25b3f" stroke-width="${size >= 48 ? 4 : 6}" stroke-linejoin="round"/>
    <path d="M 48 46 Q 90 30, 132 48" fill="none" stroke="#6d3fc4"
          stroke-width="${size >= 48 ? 11 : 14}" stroke-linecap="round"/>
    <ellipse cx="90" cy="97" rx="37" ry="36" fill="url(#iris)"/>
    <circle cx="92" cy="95" r="9" fill="#1a1a1a"/>
    <ellipse cx="100" cy="83" rx="8" ry="6.5" fill="#fbf6ee"/>
  </g>
</svg>`;

const browser = await chromium.launch(opts);
for (const size of [16, 48, 128]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<body style="margin:0;background:transparent">${svg(size)}</body>`,
    { waitUntil: "load" }
  );
  const buf = await page.screenshot({ omitBackground: true });
  writeFileSync(`/home/user/cv-factory/extension/icon${size}.png`, buf);
  console.log(`icon${size}.png ecrit, ${buf.length} octets`);
  await page.close();
}
await browser.close();
