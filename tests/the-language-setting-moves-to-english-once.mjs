// A STORED ANSWER BEATS A DEFAULT, AND NOTHING SAID SO
//
// English has been the default on both sides for a long time, and on
// 7 October 2026 the whole site was swept into English: the template
// previews, the editor's sheets, /diagnostic, the extension's popup. None of
// it reached Kilian. His browser held "fr" from the day he answered the
// language question, so every screen kept answering in French, including the
// job panel, and the cause was a setting rather than a missing translation.
// He asked for English twice and read French both times.
//
// So `langueDuSite` moves a stored "fr" to English one time. The whole risk
// of a migration like this is that it keeps running: it would then undo a
// deliberate choice, hold a French speaker on English, and there would be no
// way for them to see why. That is a worse product than the defect it fixes.
//
// WHAT THIS SUITE ASSERTS, AND WHY EACH ONE IS A WAY IT GOES WRONG
//
//   1. a stored "fr" becomes "en". The defect itself.
//   2. it happens ONCE. French chosen afterwards survives every later load,
//      which is the property that makes the move acceptable at all.
//   3. a browser that has never chosen still gets the flag, so somebody who
//      answers "francais" AFTER this ships is never moved. Without this the
//      language question reads as broken: you pick French and get English.
//   4. the timestamp is written with the value. `cvf_c` is synced and
//      cloudSync settles a conflict by comparing `<key>__at`, so an unstamped
//      write is older than anything the account holds and the next pull hands
//      "fr" straight back. That failure only appears on a signed in browser,
//      which is exactly the kind this repository ships blind.
//   5. the stamp's shape is cloudSync's own. langueDuSite spells it out rather
//      than importing cloudSync, so the shop window does not pull Supabase in
//      for one string, and two spellings of one format is how they drift. The
//      suite asks cloudSync for `stampKey` and compares.
//   6. a browser with storage refused changes nothing and never half moves.
//
// It is a pure module, so this runs with no server and no browser: a fake
// storage object is the honest test here, because what is being checked is a
// decision about four keys, not a screen.

import { langueDuSite, cleHorodatage, CLE_LANGUE, CLE_PASSAGE_ANGLAIS } from "../lib/langueDuSite.js";
import { stampKey } from "../lib/cloudSync.js";
import { startServer, stopServer, launchBrowser, SAMPLE_CV } from "./lib/harness.mjs";

function storageDouble(initial = {}, { refuse = false } = {}) {
  const data = { ...initial };
  return {
    data,
    getItem(k) {
      if (refuse) throw new Error("storage refused");
      return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
    },
    setItem(k, v) {
      if (refuse) throw new Error("storage refused");
      data[k] = String(v);
    },
  };
}

export async function run() {
  const failures = [];
  const T = 1760000000000;
  const horloge = () => T;

  // 1. A stored "fr" moves to English.
  {
    const s = storageDouble({ [CLE_LANGUE]: JSON.stringify("fr") });
    const got = langueDuSite(s, horloge);
    if (got !== "en") {
      failures.push('a browser holding "fr" reads ' + JSON.stringify(got)
        + ' instead of "en". That is the defect: the whole site was translated '
        + "and the stored setting kept answering in French.");
    }
    if (s.data[CLE_LANGUE] !== JSON.stringify("en")) {
      failures.push("the move was not written back, so it would have to happen "
        + "again on every load: " + JSON.stringify(s.data[CLE_LANGUE]));
    }
    // 4. and the timestamp went with it.
    if (!s.data[cleHorodatage(CLE_LANGUE)]) {
      failures.push("no timestamp was written beside the value. cvf_c is synced "
        + "and cloudSync keeps the most recent side, so on a signed in browser "
        + 'the next pull hands "fr" back and the move undoes itself in silence.');
    } else if (s.data[cleHorodatage(CLE_LANGUE)] !== String(T)) {
      failures.push("the timestamp is " + s.data[cleHorodatage(CLE_LANGUE)]
        + " instead of the injected clock " + T + ", so it is not the one the "
        + "merge will compare.");
    }
  }

  // 2. ONCE. French chosen after the move survives, for ever.
  {
    const s = storageDouble({ [CLE_LANGUE]: JSON.stringify("fr") });
    langueDuSite(s, horloge);                       // the move happens
    s.data[CLE_LANGUE] = JSON.stringify("fr");      // the person picks French
    for (let load = 1; load <= 3; load += 1) {
      const got = langueDuSite(s, horloge);
      if (got !== "fr") {
        failures.push("French chosen after the move was undone on load " + load
          + " (read " + JSON.stringify(got) + "). A migration that keeps running "
          + "holds somebody on a language they did not choose, with nothing on "
          + "screen able to say why. That is worse than the defect it fixes.");
        break;
      }
    }
  }

  // 3. A browser that never chose is flagged, so a later "francais" is safe.
  {
    const s = storageDouble();
    const got = langueDuSite(s, horloge);
    if (got !== null) {
      failures.push("a browser that has never chosen reads " + JSON.stringify(got)
        + " instead of null. null is what makes the language question appear; "
        + "anything else answers it on the person's behalf.");
    }
    if (!s.data[CLE_PASSAGE_ANGLAIS]) {
      failures.push("the flag was not written for a browser with no choice yet. "
        + "Somebody answering \"francais\" after this ships would then be moved "
        + "to English on their next load, which reads as the language question "
        + "being broken.");
    }
    // Now they answer French, as a new visitor does.
    s.data[CLE_LANGUE] = JSON.stringify("fr");
    const apres = langueDuSite(s, horloge);
    if (apres !== "fr") {
      failures.push("a visitor who answered \"francais\" after this shipped was "
        + "moved to English (read " + JSON.stringify(apres) + "). They would pick "
        + "French and get English, with no way to make it stick.");
    }
  }

  // 5. The stamp's shape is cloudSync's own, not a second spelling of it.
  {
    const mine = cleHorodatage(CLE_LANGUE);
    const theirs = stampKey(CLE_LANGUE);
    if (mine !== theirs) {
      failures.push("langueDuSite writes the timestamp at " + mine
        + " and cloudSync reads it at " + theirs + ". The merge would never see "
        + "the move, so a signed in browser would be handed French back.");
    }
  }

  // 6. Storage refused: nothing is read, nothing is written, nothing is half done.
  {
    const s = storageDouble({ [CLE_LANGUE]: JSON.stringify("fr") }, { refuse: true });
    let got;
    try {
      got = langueDuSite(s, horloge);
    } catch (e) {
      failures.push("a browser with storage refused made langueDuSite throw: "
        + String(e && e.message || e).slice(0, 90)
        + ". It is called during the first render of three pages.");
      got = undefined;
    }
    if (got !== null && got !== undefined) {
      failures.push("storage refused but langueDuSite still claimed "
        + JSON.stringify(got) + ".");
    }
  }

  // And the move must not fire when the flag write itself failed, or it would
  // repeat on every load for exactly the browsers that cannot remember it.
  {
    const data = { [CLE_LANGUE]: JSON.stringify("fr") };
    const s = {
      data,
      getItem(k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
      setItem(k, v) {
        if (k === CLE_PASSAGE_ANGLAIS) throw new Error("quota");
        data[k] = String(v);
      },
    };
    const got = langueDuSite(s, horloge);
    if (got !== "fr") {
      failures.push("the flag could not be stored and the move happened anyway "
        + "(read " + JSON.stringify(got) + "). It would then repeat on every "
        + "load, holding that browser on English against its own choice.");
    }
  }

  // AND THE DECISION HAS TO BE WIRED IN, WHICH THE PART ABOVE CANNOT SEE
  //
  // Everything above tests a pure module against a fake storage. All of it
  // passes while nothing calls it, which is this repository's oldest shape of
  // failure: the visa filter shipped once rendering a control that reached no
  // request. So this part seeds a real browser with "fr", the way Kilian's own
  // browser holds it, opens the real app and reads the screen. English there
  // is the only proof that the wiring exists.
  const server = await startServer();
  const browser = await launchBrowser();
  const base = "http://127.0.0.1:" + (process.env.TEST_PORT || 4311);
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await ctx.newPage();
    await page.goto(base + "/app", { waitUntil: "networkidle", timeout: 60_000 });
    await page.evaluate(({ cv }) => {
      try {
        localStorage.setItem("cvf_d", JSON.stringify(cv));
        localStorage.setItem("cvf_tu", JSON.stringify(true));
        // The state this suite exists for: a choice made before the site spoke
        // English, and no migration flag, which is every browser that answered
        // the language question up to 7 October 2026.
        localStorage.setItem("cvf_c", JSON.stringify("fr"));
        localStorage.removeItem("cvf_c_en");
      } catch { /* a browser with storage refused is covered above */ }
    }, { cv: SAMPLE_CV });
    await page.reload({ waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(2500);

    const stored = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem("cvf_c") || "null"); } catch { return "unreadable"; }
    });
    if (stored !== "en") {
      failures.push("the app loaded with a stored \"fr\" and left it as "
        + JSON.stringify(stored) + ". The module is right and nothing calls it, "
        + "which is the shape of failure this repository knows best: a correct "
        + "decision that reaches no screen.");
    }

    // The language question must not reappear: a value is stored, so somebody
    // has answered. Being asked again would read as the setting being lost.
    if (await page.locator('[data-nuvi-lang-ask="1"]').count()) {
      failures.push("the language question came back although a choice was "
        + "stored. The move must not look like the setting was forgotten.");
    }

    // And the screen itself. "Retour" is the word Kilian was reading.
    const texte = (await page.innerText("body").catch(() => "")).replace(/\s+/g, " ");
    const francais = ["Retour", "Telecharger", "Reglages", "Competences", "Formations"]
      .filter((w) => new RegExp("\\b" + w + "\\b").test(texte));
    if (francais.length) {
      failures.push("the app still shows French after the move: "
        + francais.join(", ") + ". The stored value changed and the screen did not.");
    }
  } catch (e) {
    failures.push("the browser half could not finish: "
      + String(e && e.message || e).split("\n")[0].slice(0, 150));
  } finally {
    await browser.close();
    await stopServer(server);
  }

  if (!failures.length) {
    console.log("      a stored \"fr\" moves to English once, with the timestamp "
      + "cloudSync compares, French chosen afterwards survives every load, and "
      + "the real app comes up in English");
  }
  return failures;
}
