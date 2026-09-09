// The extension fills the form, and never sends it.
//
// Applying to a hundred jobs is the same twenty boxes typed a hundred
// times. That is the whole of what the "apply to fifty at once" tools do,
// inside the person's own browser, which is also why the boards cannot
// block them. Nuvi does the same and stops one step earlier: it fills, the
// person reads, the person presses the button.
//
// Two things are checked, and the second matters more than the first. What
// it fills has to land in the right box, on the shapes the real boards
// use. And what it must never touch has to stay untouched: a wrong answer
// in an application is worse than an empty box, because an empty box gets
// filled and a wrong one gets sent.

import { readFile } from "node:fs/promises";
import { launchBrowser } from "./lib/harness.mjs";
import { champPour, profilDepuisLeCv, profilComplet, optionPour } from "../extension/champs.js";

// What the person answered once, in Settings.
const REPONSES = {
  droitDeTravailler: "Yes", sponsor: "No", preavis: "1 month",
  salaire: "38,000", mobilite: "Yes",
};

const CV = {
  name: "Camille Marchetti", title: "Bar Manager",
  email: "camille.marchetti@example.com", phone: "07700900123",
  location: "London, UK", linkedin: "https://www.linkedin.com/in/camille-marchetti",
};

// The shapes the boards actually use, name and label both.
const RECONNUS = [
  [{ name: "first_name", label: "First name" }, "prenom"],
  [{ name: "job_application[first_name]", label: "" }, "prenom"],
  [{ id: "given-name", autocomplete: "given-name" }, "prenom"],
  [{ label: "Forename" }, "prenom"],
  [{ name: "last_name", label: "Last name" }, "nom"],
  [{ label: "Surname" }, "nom"],
  [{ name: "email", type: "email", label: "Email address" }, "email"],
  [{ label: "E-mail" }, "email"],
  [{ name: "phone", type: "tel", label: "Mobile number" }, "telephone"],
  [{ label: "Contact number" }, "telephone"],
  [{ label: "LinkedIn profile" }, "linkedin"],
  [{ label: "Portfolio or website" }, "site"],
  [{ label: "Town or city" }, "ville"],
  [{ label: "Full name" }, "nomComplet"],
  [{ label: "Your name" }, "nomComplet"],
];

// The questions every form asks, which the person answered once.
const REPETEES = [
  [{ label: "Do you have the right to work in the UK?" }, "droitDeTravailler"],
  [{ label: "Are you legally entitled to work in the United Kingdom?" }, "droitDeTravailler"],
  [{ label: "Will you now or in the future require sponsorship?" }, "sponsor"],
  [{ label: "Do you require visa sponsorship?" }, "sponsor"],
  [{ label: "What is your notice period?" }, "preavis"],
  [{ label: "When can you start?" }, "preavis"],
  [{ label: "Salary expectation" }, "salaire"],
  [{ label: "Are you willing to relocate?" }, "mobilite"],
  [{ label: "Do you hold a full driving licence?" }, "permis"],
];

// The boxes that must stay empty, whatever they are called.
const INTOUCHABLES = [
  { name: "password", type: "password", label: "Password" },
  { label: "Confirm password", type: "password" },
  { label: "National Insurance number" },
  { label: "Date of birth" },
  { label: "Gender" },
  { label: "Ethnic origin" },
  { label: "Do you consider yourself to have a disability?" },
  { label: "Cover letter", type: "text" },
  { label: "Why do you want to work here?" },
  { label: "Search jobs", type: "search" },
  { label: "Referral code" },
  { label: "Upload your CV", type: "file" },
];

export async function run() {
  const failures = [];

  const profil = profilDepuisLeCv(CV);
  if (profil.prenom !== "Camille" || profil.nom !== "Marchetti") {
    failures.push("the name did not split into first and last (" + JSON.stringify(profil) + ")");
  }
  if (profil.ville !== "London") failures.push("the city was not taken from the location (" + profil.ville + ")");
  if (!/linkedin/.test(profil.linkedin)) failures.push("the LinkedIn address did not travel");
  if (profilDepuisLeCv({}).email !== "") failures.push("an empty CV produced something to type");

  for (const [descripteur, attendu] of RECONNUS) {
    const vu = champPour({ type: "text", ...descripteur });
    if (vu !== attendu) {
      failures.push("a box called \"" + (descripteur.label || descripteur.name) + "\" was read as "
        + vu + " instead of " + attendu);
    }
  }
  for (const [descripteur, attendu] of REPETEES) {
    const vu = champPour({ type: "text", ...descripteur });
    if (vu !== attendu) {
      failures.push("\"" + descripteur.label + "\" was read as " + vu + " instead of " + attendu
        + ": sponsorship and the right to work are opposite answers to the same subject");
    }
  }
  for (const [textes, valeur, attendu, quoi] of [
    [["Yes", "No"], "Yes", 0, "yes among yes and no"],
    [["Yes", "No"], "No", 1, "no among yes and no"],
    [["No", "Yes"], "Yes", 1, "yes when no comes first"],
    [["Please select", "Yes", "No"], "No", 2, "no past a placeholder"],
    [["Immediately", "1 month", "3 months"], "1 month", 1, "a notice period spelled the same"],
    [["Immediately", "1 month"], "Available in 1 month", 1, "a notice period inside a longer answer"],
    [["Yes", "No"], "", -1, "nothing, when the person did not answer"],
    [["Green", "Blue"], "Yes", -1, "nothing, when no option means yes"],
  ]) {
    const vu = optionPour(textes, valeur);
    if (vu !== attendu) failures.push("choosing " + quoi + " picked " + vu + " instead of " + attendu);
  }
  const complet = profilComplet(CV, { droitDeTravailler: "Yes", preavis: "1 month", salaire: "" });
  if (complet.droitDeTravailler !== "Yes" || complet.preavis !== "1 month") {
    failures.push("the answers given once did not join the profile");
  }
  if ("salaire" in complet) failures.push("an unanswered question travelled as an empty answer");

  for (const descripteur of INTOUCHABLES) {
    const vu = champPour({ type: "text", ...descripteur });
    if (vu) {
      failures.push("\"" + (descripteur.label || descripteur.name) + "\" would be filled with the "
        + vu + ": a wrong answer in an application is worse than an empty box");
    }
  }

  // --- the form itself, in a browser ------------------------------------
  // No server: this suite measures a form and a module, and nothing it
  // touches is served by the product.
  const browser = await launchBrowser();
  try {
    const module = await readFile(new URL("../extension/champs.js", import.meta.url), "utf8");
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    // A BLANK PAGE, AND NOTHING OF OURS ON IT
    //
    // The first version loaded one of the product's own pages as a host and
    // then replaced its body with this form. It passed here and crashed on
    // the CI, because React was still hydrating: it mounted a moment later,
    // put its own document back, and the form the test was reading had
    // stopped existing. A test that races the thing it is not measuring
    // fails on whichever machine is slower that day. A new page starts
    // blank, and blank is all this needs.
    await page.setContent(`<!doctype html><html><body><form id="f">
      <label for="fn">First name</label><input id="fn" name="first_name">
      <label for="ln">Last name</label><input id="ln" name="last_name">
      <label for="em">Email</label><input id="em" type="email" name="email">
      <label for="ph">Phone number</label><input id="ph" type="tel" name="phone">
      <label for="li">LinkedIn profile</label><input id="li" name="linkedin_url">
      <label for="ci">Town or city</label><input id="ci" name="city">
      <label for="ni">National Insurance number</label><input id="ni" name="nino">
      <label for="pw">Password</label><input id="pw" type="password" name="password">
      <label for="cv">Upload your CV</label><input id="cv" type="file" name="resume">
      <label for="pr">Preferred name</label><input id="pr" name="preferred_name" value="Cam">
      <label for="np">What is your notice period?</label><input id="np" name="notice">
      <label for="sal">Salary expectation</label><input id="sal" name="salary_expectation">
      <label for="rtw2">Do you have the right to work in the UK?</label>
      <select id="rtw2" name="rtw2"><option value="">Please select</option><option>Yes</option><option>No</option></select>
      <label for="sp">Will you now or in the future require sponsorship?</label>
      <select id="sp" name="sponsorship"><option value="">Please select</option><option>Yes</option><option>No</option></select>
      <fieldset id="relo"><legend>Are you willing to relocate?</legend>
        <label for="r1">Yes</label><input type="radio" id="r1" name="relocate" value="y">
        <label for="r2">No</label><input type="radio" id="r2" name="relocate" value="n"></fieldset>
      <label for="eth">Ethnic origin</label>
      <select id="eth" name="ethnicity"><option value="">Please select</option><option>Prefer not to say</option></select>
      <button type="submit" id="envoyer">Submit application</button>
    </form><div id="envoye">no</div>
    <script>document.getElementById("f").addEventListener("submit", function (e) {
      e.preventDefault(); document.getElementById("envoye").textContent = "yes"; });</script>
    </body></html>`);
    // The form has to be there before anything is measured on it.
    await page.waitForSelector("#fn", { timeout: 10000 });
    const resultat = await page.evaluate(async ({ src, profil: p }) => {
      const m = await import("data:text/javascript;base64," + btoa(unescape(encodeURIComponent(src))));
      const remplis = m.remplirLeDocument(document, p);
      // Named so that a box which vanished is reported as such, instead of
      // arriving as "cannot read properties of null" from somewhere.
      const v = (id) => {
        const el = document.getElementById(id);
        if (!el) throw new Error("the box " + id + " is not on the page");
        return el.value;
      };
      return {
        remplis,
        fn: v("fn"), ln: v("ln"), em: v("em"), ph: v("ph"), li: v("li"), ci: v("ci"),
        ni: v("ni"), pw: v("pw"), pr: v("pr"),
        np: v("np"), sal: v("sal"), rtw2: v("rtw2"), sp: v("sp"), eth: v("eth"),
        relocateOui: document.getElementById("r1").checked,
        relocateNon: document.getElementById("r2").checked,
        envoye: document.getElementById("envoye").textContent,
        marques: document.querySelectorAll("[data-nuvi-rempli]").length,
      };
    }, { src: module, profil: profilComplet(CV, REPONSES) });

    const attendus = {
      fn: "Camille", ln: "Marchetti", em: CV.email, ph: CV.phone,
      li: CV.linkedin, ci: "London",
      np: "1 month", sal: "38,000", rtw2: "Yes", sp: "No",
    };
    for (const [id, valeur] of Object.entries(attendus)) {
      if (resultat[id] !== valeur) {
        failures.push("the box " + id + " holds \"" + resultat[id] + "\" instead of \"" + valeur + "\"");
      }
    }
    if (!resultat.relocateOui || resultat.relocateNon) {
      failures.push("the yes and no pair for relocating was not answered as the person said");
    }
    if (resultat.eth) failures.push("a diversity question was answered by the machine: \"" + resultat.eth + "\"");
    for (const id of ["ni", "pw"]) {
      if (resultat[id]) failures.push("the box " + id + " was filled, and it never should be: \"" + resultat[id] + "\"");
    }
    if (resultat.pr !== "Cam") failures.push("a box the person had already filled was overwritten");
    if (resultat.envoye !== "no") failures.push("THE FORM WAS SUBMITTED. Nuvi fills, the person sends.");
    if (resultat.marques !== 11) failures.push(resultat.marques + " boxes are marked as filled instead of 11: the person cannot see what was touched");
    await ctx.close();

    if (!failures.length) {
      console.log("      " + (RECONNUS.length + REPETEES.length) + " shapes of a box land in the right "
        + "field, including dropdowns and yes-no pairs, " + INTOUCHABLES.length + " are never touched, "
        + "an answer already there survives, and the form is not sent");
    }
  } catch (err) {
    failures.push("the test itself crashed: " + (err && err.message));
  } finally {
    await browser.close();
  }
  return failures;
}
