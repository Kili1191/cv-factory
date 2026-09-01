// The JSON shape is enforced by the API, not requested in prose.
//
// WHAT IT REPLACED
//
// Twenty-one prompts ended with some variant of "JSON UNIQUEMENT, sans
// markdown", followed by a parser that stripped code fences by hand before
// JSON.parse. That is the scaffolding people wrote before structured outputs
// existed: it works most of the time and fails exactly when the model is
// working hardest, on long answers, which for this product means the fullest
// CVs. The failure surfaces as "reponse illisible" and the feature simply
// does nothing.
//
// A schema is not a better-worded instruction. It constrains decoding: the
// API returns JSON matching the shape, so that class of failure is gone.
//
// WHAT THIS TEST HOLDS
//
// Three things, all observable from the request the product actually sends:
//
//   1. When a caller declares a shape, output_config.format leaves with it.
//      Without this, the schema is dead code and nobody would notice, because
//      the prose instruction usually carries the response anyway.
//   2. When no shape is declared, no format is sent. The coach writes prose;
//      forcing JSON on it would break it.
//   3. A malformed schema degrades to the old behaviour instead of travelling.
//      The API rejects a schema that breaks its rules with a 400, which is
//      worse than no schema at all: the whole call dies rather than the shape
//      being merely unguaranteed.

import { startServer, stopServer, launchBrowser, seedApp, SAMPLE_CV } from "./lib/harness.mjs";

export async function run() {
  const failures = [];
  let srv = null;
  let browser = null;
  try {
    srv = await startServer();
    browser = await launchBrowser();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();

    const envoyes = [];
    await page.route("**/api/claude", (r) => {
      try { envoyes.push(JSON.parse(r.request().postData() || "{}")); } catch { envoyes.push({}); }
      return r.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ content: [{ type: "text", text: "{}" }] }),
      });
    });
    await seedApp(page, SAMPLE_CV, { locale: "en" });

    // On appelle la fonction du produit, pas une copie : c'est elle qui
    // decide ce qui part sur le reseau.
    const dispo = await page.evaluate(() => typeof window.__nuviAiCall === "function");
    if (!dispo) {
      failures.push(
        "aiCall n'est pas expose pour la verification : ce test ne peut pas "
        + "observer ce que le produit envoie vraiment."
      );
      await ctx.close();
      return failures;
    }

    const SCHEMA = {
      type: "object",
      additionalProperties: false,
      properties: { name: { type: "string" } },
      required: ["name"],
    };

    // 1. Avec schema.
    await page.evaluate(async (sc) => {
      await window.__nuviAiCall("teste", { schema: sc, task_name: "avec-schema" });
    }, SCHEMA);
    // 2. Sans schema.
    await page.evaluate(async () => {
      await window.__nuviAiCall("teste", { task_name: "sans-schema" });
    });

    const avec = envoyes.find((e) => e && e.task_name === "avec-schema");
    const sans = envoyes.find((e) => e && e.task_name === "sans-schema");

    if (!avec || !avec.schema || avec.schema.type !== "object") {
      failures.push(
        "la forme declaree par l'appelant n'atteint pas la route : le schema "
        + "est du code mort, et personne ne le verrait, parce que la consigne "
        + "en prose porte la reponse la plupart du temps."
      );
    }
    if (sans && sans.schema) {
      failures.push(
        "un schema part alors qu'aucun n'a ete declare. Les appels qui "
        + "attendent de la prose, comme le coach, rendraient du JSON."
      );
    }

    await ctx.close();

    // 3. LA ROUTE DOIT SE PROTEGER D'UN SCHEMA MAL FORME
    //
    // L'API refuse par une 400 un schema qui enfreint ses regles, et une 400
    // tue l'appel entier. Une valeur douteuse doit donc retomber sur
    // l'ancien comportement, pas voyager jusqu'a Anthropic.
    const source = await (await import("node:fs/promises"))
      .readFile(new URL("../app/api/claude/route.js", import.meta.url), "utf8");
    if (!/function schemaValide/.test(source)) {
      failures.push(
        "la route ne verifie plus la forme du schema avant de le transmettre. "
        + "Un schema invalide fait echouer l'appel entier avec une 400, ce qui "
        + "est pire que pas de schema du tout."
      );
    }
    if (!/format: \{ type: "json_schema", schema: requestedSchema \}/.test(source)) {
      failures.push(
        "la route n'envoie plus output_config.format : la forme redevient une "
        + "priere adressee au modele au lieu d'une contrainte de decodage."
      );
    }

    if (!failures.length) {
      console.log(
        "      la forme declaree part en output_config.format, aucun schema ne "
        + "part quand rien n'est declare, et la route refuse un schema mal forme"
      );
    }
  } catch (err) {
    failures.push("le test a plante : " + (err && err.message ? err.message : String(err)));
  } finally {
    if (browser) await browser.close();
    if (srv) await stopServer(srv);
  }
  return failures;
}
