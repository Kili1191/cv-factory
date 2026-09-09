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
import { startServer, stopServer, launchBrowser, BASE_URL } from "./lib/harness.mjs";
import { champPour, profilDepuisLeCv } from "../extension/champs.js";

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

// The boxes that must stay empty, whatever they are called.
const INTOUCHABLES = [
  { name: "password", type: "password", label: "Password" },
  { label: "Confirm password", type: "password" },
  { label: "National Insurance number" },
  { label: "Date of birth" },
  { label: "Expected salary" },
  { label: "Notice period" },
  { label: "Do you have the right to work in the UK?" },
  { label: "Will you require visa sponsorship?" },
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
  for (const descripteur of INTOUCHABLES) {
    const vu = champPour({ type: "text", ...descripteur });
    if (vu) {
      failures.push("\"" + (descripteur.label || descripteur.name) + "\" would be filled with the "
        + vu + ": a wrong answer in an application is worse than an empty box");
    }
  }

  // --- the form itself, in a browser ------------------------------------
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    const module = await readFile(new URL("../extension/champs.js", import.meta.url), "utf8");
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    // Any page will do as a host: what is measured is the filling, and the
    // form below is the shape a board serves.
    await page.goto(BASE_URL + "/verifier", { waitUntil: "domcontentloaded" });
    await page.setContent(`<!doctype html><html><body><form id="f">
      <label for="fn">First name</label><input id="fn" name="first_name">
      <label for="ln">Last name</label><input id="ln" name="last_name">
      <label for="em">Email</label><input id="em" type="email" name="email">
      <label for="ph">Phone number</label><input id="ph" type="tel" name="phone">
      <label for="li">LinkedIn profile</label><input id="li" name="linkedin_url">
      <label for="ci">Town or city</label><input id="ci" name="city">
      <label for="sa">Expected salary</label><input id="sa" name="salary">
      <label for="ni">National Insurance number</label><input id="ni" name="nino">
      <label for="rw">Do you have the right to work in the UK?</label><input id="rw" name="rtw">
      <label for="pw">Password</label><input id="pw" type="password" name="password">
      <label for="cv">Upload your CV</label><input id="cv" type="file" name="resume">
      <label for="pr">Preferred name</label><input id="pr" name="preferred_name" value="Cam">
      <button type="submit" id="envoyer">Submit application</button>
    </form><div id="envoye">no</div>
    <script>document.getElementById("f").addEventListener("submit", function (e) {
      e.preventDefault(); document.getElementById("envoye").textContent = "yes"; });</script>
    </body></html>`);
    await page.addScriptTag({ content: module, type: "module" });
    const resultat = await page.evaluate(async ({ src, profil: p }) => {
      const m = await import("data:text/javascript;base64," + btoa(unescape(encodeURIComponent(src))));
      const remplis = m.remplirLeDocument(document, p);
      const v = (id) => document.getElementById(id).value;
      return {
        remplis,
        fn: v("fn"), ln: v("ln"), em: v("em"), ph: v("ph"), li: v("li"), ci: v("ci"),
        sa: v("sa"), ni: v("ni"), rw: v("rw"), pw: v("pw"), pr: v("pr"),
        envoye: document.getElementById("envoye").textContent,
        marques: document.querySelectorAll("[data-nuvi-rempli]").length,
      };
    }, { src: module, profil });

    const attendus = {
      fn: "Camille", ln: "Marchetti", em: CV.email, ph: CV.phone,
      li: CV.linkedin, ci: "London",
    };
    for (const [id, valeur] of Object.entries(attendus)) {
      if (resultat[id] !== valeur) {
        failures.push("the box " + id + " holds \"" + resultat[id] + "\" instead of \"" + valeur + "\"");
      }
    }
    for (const id of ["sa", "ni", "rw", "pw"]) {
      if (resultat[id]) failures.push("the box " + id + " was filled, and it never should be: \"" + resultat[id] + "\"");
    }
    if (resultat.pr !== "Cam") failures.push("a box the person had already filled was overwritten");
    if (resultat.envoye !== "no") failures.push("THE FORM WAS SUBMITTED. Nuvi fills, the person sends.");
    if (resultat.marques !== 6) failures.push(resultat.marques + " boxes are marked as filled instead of 6: the person cannot see what was touched");
    await ctx.close();

    if (!failures.length) {
      console.log("      " + RECONNUS.length + " shapes of a box land in the right field, "
        + INTOUCHABLES.length + " are never touched, an answer already there survives, "
        + "and the form is not sent");
    }
  } catch (err) {
    failures.push("the test itself crashed: " + (err && err.message));
  } finally {
    await browser.close();
    await stopServer(server);
  }
  return failures;
}
