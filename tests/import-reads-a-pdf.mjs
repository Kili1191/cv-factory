// L'autre panne arrivee en production : l'import de CV ne rendait rien.
//
// Le worker pdf.js venait de cdnjs ; quand la requete ne passait pas, pdf.js
// retentait la meme url via son "fake worker", echouait, et l'utilisateur
// n'obtenait rien. Ce test lit un vrai PDF par l'interface, worker coupe,
// pour verifier que le repli embarque prend bien le relais.

import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServer, stopServer, launchBrowser, BASE_URL } from "./lib/harness.mjs";

function buildPdf(lines) {
  const objs = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];
  let stream = "BT /F1 14 Tf 60 780 Td";
  lines.forEach((l, i) => { stream += (i ? " 0 -22 Td" : "") + ` (${l}) Tj`; });
  stream += " ET";
  objs.push(`5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`);

  let out = "%PDF-1.4\n";
  const offsets = [];
  for (const o of objs) { offsets.push(out.length); out += o; }
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return out;
}

async function importOnce(browser, { blockWorker }) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  let alerted = false;
  page.on("dialog", async d => { alerted = true; await d.dismiss(); });
  if (blockWorker) await page.route("**/pdf.worker.min.js", r => r.abort());

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2600);
  await page.getByRole("button", { name: /J'ai deja un CV/i }).first().click();
  await page.waitForTimeout(2200);

  const dir = mkdtempSync(join(tmpdir(), "cvf-import-"));
  const file = join(dir, "cv.pdf");
  writeFileSync(file, buildPdf(["Jane Doe - Product Manager", "jane.doe@email.com", "Senior PM chez Acme 2021-2024"]));

  await page.setInputFiles("#cv-file-upload", file);
  await page.waitForTimeout(9000);
  const value = await page.locator("textarea").first().inputValue().catch(() => "");
  await page.close();
  return { value, alerted };
}

export async function run() {
  const failures = [];
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    const normal = await importOnce(browser, { blockWorker: false });
    if (!normal.value.includes("Jane Doe")) {
      failures.push("import d'un PDF : aucun texte recupere dans le champ (worker disponible)");
    }

    // Le cas qui s'est produit chez un utilisateur.
    const degraded = await importOnce(browser, { blockWorker: true });
    if (!degraded.value.includes("Jane Doe")) {
      failures.push(
        "import d'un PDF avec /pdf.worker.min.js injoignable : rien recupere.\n" +
        "      Le repli embarque (pdf.worker.entry) ne prend pas le relais."
      );
    }
    if (normal.alerted || degraded.alerted) {
      failures.push("un alert() bloquant est apparu : les erreurs doivent rester dans la page");
    }
    if (!failures.length) console.log("      PDF lu avec worker, et worker coupe, sans alert()");
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
