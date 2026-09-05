// Where the Chromium that prints the PDF lives, outside of Vercel.
//
// WHY THIS IS SHARED
//
// The print route and the test harness both need the same binary. The first
// version of the route carried its own copy of the lookup, limited to the
// /opt/pw-browsers root of the remote session image. On GitHub Actions
// "npx playwright install" puts the browser under ~/.cache/ms-playwright
// instead, so the route answered 503 there, the export fell back to the
// picture, and the suite asserting a text PDF failed while every local run
// was green. One lookup, used by both sides, cannot drift like that.
//
// THE BUILD NUMBER IS NOT STABLE
//
// The chromium-NNNN directory name belongs to the playwright version that
// installed it. We list the roots instead of hard-coding a number, newest
// first so an image keeping two versions serves the one that matches.

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

function racines() {
  const liste = [];
  if (process.env.PLAYWRIGHT_BROWSERS_PATH) liste.push(process.env.PLAYWRIGHT_BROWSERS_PATH);
  liste.push("/opt/pw-browsers");
  // Playwright's default cache on Linux, which is what CI ends up with.
  try { liste.push(join(homedir(), ".cache", "ms-playwright")); } catch { /* no home: skip */ }
  return liste;
}

// Explicit paths win over whatever the machine happens to have.
export function cheminChromium() {
  const explicite = process.env.PDF_CHROMIUM_PATH || process.env.PLAYWRIGHT_CHROMIUM_PATH;
  if (explicite && existsSync(explicite)) return explicite;

  for (const racine of racines()) {
    let entrees = [];
    try { entrees = readdirSync(racine).filter((n) => n.startsWith("chromium-")); } catch { continue; }
    entrees.sort((a, b) => Number(b.slice(9)) - Number(a.slice(9)));
    for (const nom of entrees) {
      const p = join(racine, nom, "chrome-linux", "chrome");
      if (existsSync(p)) return p;
    }
  }
  return null;
}
