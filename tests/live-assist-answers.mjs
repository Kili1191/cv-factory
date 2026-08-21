// L'assistant d'entretien repond-il vraiment ?
//
// CE QUE CE TEST COUVRE, ET CE QU'IL NE COUVRE PAS
//
// Le micro ne peut pas etre teste ici : il n'y en a pas, et la reconnaissance
// vocale du navigateur n'existe pas dans un navigateur pilote sans peripherique
// audio. Tout le reste peut l'etre, et c'est la majorite du chemin :
//
//   - l'ecran de confirmation du poste s'affiche avant toute ecoute
//   - les candidatures qui portent une annonce y sont proposees
//   - la question tapee a la main declenche une reponse
//   - la reponse arrive en flux et s'affiche en reperes separes
//   - la route de flux sait lire le protocole d'Anthropic
//
// Sans ce test, la seule chose qu'on saurait de cette fonctionnalite est
// qu'elle compile.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

const CUES = "- Lead with the 78% GP number\n- Name the team size, twenty people\n- Close on why this venue\n";

export async function run() {
  const failures = [];

  // --- 1. la route de flux lit-elle le protocole d'Anthropic ? -------------
  {
    const hadKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-not-used";
    const realFetch = globalThis.fetch;

    // Vrai format d'evenements Anthropic, decoupe en morceaux arbitraires
    // pour verifier que le tampon recolle les evenements a cheval.
    const sse = [
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"- Lead with the 78% GP number\\n"}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"- Name the team size"}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":", twenty people\\n"}}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    ].join("");

    globalThis.fetch = async () => ({
      ok: true, status: 200,
      body: new ReadableStream({
        start(c) {
          const enc = new TextEncoder();
          // Decoupe a un endroit qui coupe un evenement en deux.
          c.enqueue(enc.encode(sse.slice(0, 90)));
          c.enqueue(enc.encode(sse.slice(90)));
          c.close();
        },
      }),
    });

    try {
      const mod = await import("../app/api/claude/stream/route.js");
      const res = await mod.POST(new Request("http://localhost/api/claude/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: "s", messages: [{ role: "user", content: "q" }] }),
      }));
      const text = await new Response(res.body).text();
      if (!text.includes("78% GP number")) {
        failures.push(`la route de flux perd le debut du texte (recu: ${JSON.stringify(text.slice(0, 60))})`);
      }
      if (!text.includes("Name the team size, twenty people")) {
        failures.push("la route de flux ne recolle pas un evenement coupe en deux");
      }
      if (text.includes("content_block_delta")) {
        failures.push("la route renvoie le protocole brut au lieu du seul texte");
      }
    } catch (err) {
      failures.push(`la route de flux a leve : ${err.message.split("\n")[0]}`);
    } finally {
      globalThis.fetch = realFetch;
      if (hadKey === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = hadKey;
    }
  }

  // --- 2. l'ecran, de bout en bout, sans micro ----------------------------
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message.split("\n")[0].slice(0, 90)));

    await page.route("**/api/claude/stream", r => r.fulfill({
      status: 200, contentType: "text/plain; charset=utf-8", body: CUES,
    }));

    // Une candidature qui porte une annonce doit apparaitre au choix du poste.
    await seedApp(page, SAMPLE_CV);
    await page.evaluate(() => {
      localStorage.setItem("cvf_ap", JSON.stringify([{
        id: 1, company: "Soho House", role: "Bar Manager",
        date: new Date().toISOString().slice(0, 10), status: "interview",
        offer: "Bar Manager, cocktail led venue, team of 12.", notes: "", link: "",
      }]));
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1800);

    // L'entree doit etre au PREMIER niveau. Elle etait rangee sous
    // "Score & Audits", au troisieme : c'est l'outil qu'on ouvre sous
    // pression, deux minutes avant un appel. S'il faut le chercher, il est
    // deja trop tard.
    const entry = page.locator('[role="button"], button').filter({ hasText: "Entretien live" }).first();
    if (await entry.count() === 0) {
      failures.push("aucune entree 'Entretien live' au premier niveau de la barre laterale");
    } else {
      await entry.click({ timeout: 8000 });
      await page.waitForTimeout(1200);

      const asksRole = await page.evaluate(() =>
        /quel entretien|Which interview/i.test(document.body.innerText));
      if (!asksRole) failures.push("l'assistant n'a pas demande de quel entretien il s'agit");

      const listsApp = await page.evaluate(() => /Soho House/.test(document.body.innerText));
      if (!listsApp) failures.push("la candidature avec annonce n'est pas proposee au choix du poste");

      const warnsAudio = await page.evaluate(() =>
        /casque|headphone/i.test(document.body.innerText));
      if (!warnsAudio) failures.push("le montage audio n'est pas explique avant l'ecoute");

      // On choisit ce poste, puis on tape une question.
      await page.locator('button').filter({ hasText: "Bar Manager" }).first().click({ timeout: 8000 });
      await page.waitForTimeout(900);

      const box = page.locator('input[placeholder]').last();
      if (await box.count() === 0) {
        failures.push("aucun champ pour taper la question");
      } else {
        await box.fill("Tell me about a difficult service you handled");
        await box.press("Enter");
        await page.waitForTimeout(3500);

        const shown = await page.evaluate(() => document.body.innerText);
        if (!/78% GP number/.test(shown)) {
          failures.push("aucun repere affiche apres une question tapee");
        }
        const cueCount = await page.evaluate(() =>
          (document.body.innerText.match(/Lead with|Name the team|Close on why/g) || []).length);
        if (cueCount < 3) {
          failures.push(`${cueCount} repere(s) affiche(s) au lieu de 3`);
        }
        const roleVisible = await page.evaluate(() => /Bar Manager/.test(document.body.innerText));
        if (!roleVisible) failures.push("le poste choisi n'est plus visible pendant l'ecoute");
      }
    }

    if (errors.length) failures.push("erreur JS : " + errors[0]);
    await ctx.close();

    if (!failures.length) {
      console.log("      poste confirme, question tapee, trois reperes affiches (micro non testable ici)");
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
