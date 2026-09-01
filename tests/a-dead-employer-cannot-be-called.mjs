// An employer that no longer exists cannot answer the phone.
//
// This is how an application dies without anyone saying so: the recruiter
// rings the employer from six years ago to check the job, the number is dead,
// and they move to the next file. Nothing about it is visible from the
// candidate's side. You do not get a rejection for this, you get nothing.
//
// It hits Nuvi's users hardest. Restaurants, home-care agencies and small
// shops close constantly, and their closure leaves no mark on a CV.
//
// WHAT THIS TEST HOLDS, AND WHY THE DOUBT ONLY RUNS ONE WAY
//
// Getting it wrong one way costs a missed preparation. Getting it wrong the
// other way tells someone their old employer went under when it is still
// trading: that is an accusation, it is false, and it is humiliating if they
// repeat it in an interview.
//
// So every arm below checks the same thing from a different angle: "closed"
// requires a registry to have said so, in a state we recognise, about a name
// that really matches. Everything else has to come back unknown. A renamed
// field, an unreachable registry, a country with no open register and two
// firms sharing a name must all produce silence, never a verdict.

import {
  experiencesAVerifier, paysDeLExperience, memeSociete, normaliserNom,
  lireReponseUk, lireReponseFrance, direLaFermeture,
} from "../lib/registresEntreprises.js";
import { startServer, stopServer, launchBrowser, seedApp } from "./lib/harness.mjs";

const CV = {
  experience: [
    { role: "Client Advisor", company: "Harrods", location: "London, UK", period: "2022 - present" },
    { role: "Serveur", company: "Le Bistrot", location: "Lyon, France", period: "2018 - 2021" },
    { role: "Sales", company: "Al Barsha Trading", location: "Dubai, UAE", period: "2015 - 2017" },
  ],
};

export async function run() {
  const failures = [];

  // === Qui est verifie ===
  const aFaire = experiencesAVerifier(CV);
  if (aFaire.some((e) => e.company === "Harrods")) {
    failures.push(
      "le poste actuel est envoye au registre. Quelqu'un sait si la boite ou "
      + "il travaille aujourd'hui tourne encore, et la question est deplacee."
    );
  }
  if (aFaire.length !== 2) {
    failures.push("il faut verifier les 2 postes anterieurs, " + aFaire.length + " sont retenus.");
  }

  // LE PLUS RECENT SE DECIDE SUR LES DATES, PAS SUR LA POSITION
  //
  // Un CV importe d'un PDF n'est pas toujours antichronologique. Prendre
  // l'element zero sauterait la verification du bon poste et la ferait sur le
  // poste actuel : les deux erreurs a la fois.
  const desordre = { experience: [CV.experience[1], CV.experience[0], CV.experience[2]] };
  const aFaire2 = experiencesAVerifier(desordre);
  if (aFaire2.some((e) => e.company === "Harrods")) {
    failures.push(
      "sur un CV qui n'est pas antichronologique, c'est le premier de la liste "
      + "qui est pris pour le poste actuel et non le plus recent."
    );
  }

  // Un employeur non nomme n'est pas verifiable : il n'y a rien a chercher.
  const sansNom = { experience: [
    { company: "Harrods", location: "London, UK", period: "2022 - present" },
    { company: "", location: "Lyon, France", period: "2018 - 2021" },
  ] };
  if (experiencesAVerifier(sansNom).length !== 0) {
    failures.push("une experience sans employeur nomme part quand meme au registre.");
  }

  // === Le pays ===
  if (paysDeLExperience({ location: "Lyon, France" }) !== "fr") {
    failures.push("Lyon n'est pas reconnu comme francais.");
  }
  if (paysDeLExperience({ location: "London, UK" }) !== "uk") {
    failures.push("Londres n'est pas reconnu comme britannique.");
  }
  // UN PAYS SANS REGISTRE N'EST PAS UN PAYS SUSPECT
  //
  // Les Emirats n'exposent aucun registre interrogeable gratuitement. Une
  // experience a Dubai doit donc etre declaree non verifiable, et surtout pas
  // envoyee au hasard a l'un des deux registres couverts, qui repondrait
  // "aucun resultat" pour une raison qui n'a rien a voir.
  if (paysDeLExperience({ location: "Dubai, UAE" }) !== null) {
    failures.push(
      "un lieu hors des deux pays couverts est quand meme route vers un "
      + "registre. Il repondrait \"introuvable\" pour la mauvaise raison."
    );
  }

  // === Le nom ===
  if (!memeSociete("Le Bistrot", "LE BISTROT SARL")) {
    failures.push("le suffixe juridique empeche la correspondance : un CV n'ecrit jamais SARL.");
  }
  if (!memeSociete("Harrods", "Harrods Limited")) {
    failures.push("\"Limited\" empeche la correspondance.");
  }
  if (memeSociete("Bar", "Bar Le Sport")) {
    failures.push(
      "un nom de trois lettres accroche par inclusion. Il matcherait la moitie "
      + "du registre, et la fermeture annoncee serait celle d'une autre societe."
    );
  }
  if (memeSociete("Harrods", "Selfridges")) {
    failures.push("deux noms differents correspondent.");
  }
  if (normaliserNom("  Cafe   de la  Paix  ") !== "cafe de la paix") {
    failures.push("la normalisation du nom ne rend pas " + normaliserNom("  Cafe   de la  Paix  "));
  }

  // === Companies House ===
  const ukFerme = lireReponseUk(
    { items: [{ title: "LE BISTROT LTD", company_status: "dissolved", date_of_cessation: "2021-03-14" }] },
    "Le Bistrot");
  if (ukFerme.etat !== "fermee") {
    failures.push("une societe radiee au Royaume-Uni n'est pas vue comme fermee.");
  }
  if (ukFerme.depuis !== "2021-03-14") {
    failures.push("la date de radiation n'est pas remontee : sans elle, la phrase ne dit pas quand.");
  }
  const ukActif = lireReponseUk({ items: [{ title: "HARRODS LIMITED", company_status: "active" }] }, "Harrods");
  if (ukActif.etat !== "active") {
    failures.push("une societe active au Royaume-Uni n'est pas vue comme active.");
  }

  // UN ETAT QUE LA LISTE NE CONNAIT PAS N'EST PAS UNE FERMETURE
  //
  // Le registre peut ajouter un statut demain. Le defaut doit etre le silence.
  const ukBizarre = lireReponseUk({ items: [{ title: "LE BISTROT LTD", company_status: "voluntary-arrangement" }] }, "Le Bistrot");
  if (ukBizarre.etat === "fermee") {
    failures.push(
      "un statut inconnu de la liste est traite comme une fermeture. Le jour ou "
      + "le registre en ajoute un, le produit accuse des entreprises vivantes."
    );
  }

  // DEUX SOCIETES DU MEME NOM NE PROUVENT RIEN
  const ukAmbigu = lireReponseUk({ items: [
    { title: "LE BISTROT LTD", company_status: "dissolved" },
    { title: "LE BISTROT LIMITED", company_status: "active" },
  ] }, "Le Bistrot");
  if (ukAmbigu.etat === "fermee") {
    failures.push(
      "deux societes du meme nom dont une seule a coule donnent un verdict de "
      + "fermeture. Rien ne dit que c'est celle ou la personne a travaille."
    );
  }

  // === Registre francais ===
  const frFerme = lireReponseFrance(
    { results: [{ nom_complet: "LE BISTROT", etat_administratif: "C", date_cessation: "2020-11-02" }] },
    "Le Bistrot");
  if (frFerme.etat !== "fermee" || frFerme.depuis !== "2020-11-02") {
    failures.push("une entreprise cessee en France n'est pas lue comme fermee avec sa date.");
  }
  // L'etat vit tantot sur la societe, tantot sur son siege.
  const frSiege = lireReponseFrance(
    { results: [{ nom_complet: "LE BISTROT", siege: { etat_administratif: "C", date_fermeture: "2019-06-01" } }] },
    "Le Bistrot");
  if (frSiege.etat !== "fermee") {
    failures.push("l'etat porte par le siege et non par la societe est ignore.");
  }
  const frActif = lireReponseFrance({ results: [{ nom_complet: "LE BISTROT", etat_administratif: "A" }] }, "Le Bistrot");
  if (frActif.etat !== "active") {
    failures.push("une entreprise active en France n'est pas lue comme active.");
  }

  // LE CAS QUI DECIDE DE TOUT : LE REGISTRE CHANGE SES CHAMPS
  //
  // Je n'ai pas pu joindre ces deux registres depuis l'environnement ou ce
  // code a ete ecrit, donc le nom exact des champs n'a pas ete verifie contre
  // une vraie reponse. Ce test est ce qui rend cette incertitude sans danger :
  // un champ absent ou renomme doit rendre INCONNU. Le produit devient muet,
  // il ne devient jamais faux.
  const champRenomme = lireReponseFrance(
    { results: [{ nom_complet: "LE BISTROT", statut_administratif: "C" }] }, "Le Bistrot");
  if (champRenomme.etat !== "inconnue") {
    failures.push(
      "un champ d'etat renomme par le registre ne rend pas INCONNU. C'est la "
      + "seule protection contre un nom de champ suppose au lieu d'etre verifie."
    );
  }
  for (const [quoi, vide] of [["france", {}], ["uk", {}], ["france nulle", null], ["uk nulle", null]]) {
    const v = quoi.startsWith("france") ? lireReponseFrance(vide, "X") : lireReponseUk(vide, "X");
    if (v.etat !== "inconnue") {
      failures.push("une reponse " + quoi + " illisible ne rend pas INCONNU.");
    }
  }
  // Un nom qui ne correspond a rien dans la reponse : le registre a repondu
  // pour une autre societe, ca ne dit rien sur celle-ci.
  const horsSujet = lireReponseUk({ items: [{ title: "SELFRIDGES PLC", company_status: "dissolved" }] }, "Harrods");
  if (horsSujet.etat === "fermee") {
    failures.push("la fermeture d'une societe au nom different est attribuee a celle du CV.");
  }

  // === Ce qui est dit a la personne ===
  const phrase = direLaFermeture(ukFerme, { company: "Le Bistrot" }, "en");
  if (!phrase.includes("2021")) {
    failures.push("la phrase ne dit pas depuis quand l'employeur a disparu.");
  }
  // Le produit ne sert a rien s'il annonce le probleme sans dire quoi faire :
  // ce qui survit a une societe morte, c'est une personne et un papier.
  if (!/manager|colleague/i.test(phrase) || !/payslip|contract|certificate/i.test(phrase)) {
    failures.push(
      "la phrase annonce la fermeture sans nommer ce qui tient encore : un "
      + "ancien responsable joignable et une preuve papier. Sans ca, elle "
      + "inquiete sans aider."
    );
  }
  if (direLaFermeture(ukActif, { company: "Harrods" }, "en") !== "") {
    failures.push("une entreprise active declenche quand meme un avertissement.");
  }
  if (direLaFermeture(champRenomme, { company: "Le Bistrot" }, "fr") !== "") {
    failures.push("un verdict INCONNU produit quand meme une phrase de fermeture.");
  }

  // === ET MAINTENANT, EST-CE QUE CA ATTEINT L'ECRAN ? ===
  //
  // Tout ce qui precede peut etre juste sans que personne ne le voie jamais.
  // C'est arrive deux fois dans ce depot le meme jour : la carte "je pars de
  // l'annonce" cablee au seul affichage mobile, et l'axe des resultats ajoute
  // a un tableau de bord qui tenait sa propre liste. Les deux etaient corrects
  // et invisibles, et aucun test de logique ne pouvait le dire.
  failures.push(...await surLEcran());
  return failures;
}

async function surLEcran() {
  const failures = [];
  let srv = null;
  let browser = null;
  try {
    srv = await startServer();
    browser = await launchBrowser();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();

    // Le registre est remplace par une reponse connue : ce test porte sur ce
    // que le produit FAIT d'un verdict, pas sur ce que le registre repond.
    await page.route("**/api/entreprise", (r) => r.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({
        registres: { fr: true, uk: true },
        verifiees: [
          { index: 1, company: "Le Bistrot", location: "Lyon, France",
            period: "2018 - 2021", pays: "fr", etat: "fermee",
            depuis: "2020-11-02", source: "Annuaire des entreprises" },
          { index: 2, company: "Cafe Vivant", location: "Lyon, France",
            period: "2015 - 2017", pays: "fr", etat: "active", depuis: null,
            source: "Annuaire des entreprises" },
        ],
      }),
    }));

    await seedApp(page, {
      name: "Sam Ortiz", title: "Serveur", email: "sam@exemple.com",
      phone: "0600000000", location: "Lyon",
      experience: [
        { role: "Serveur", company: "Chez Nous", location: "Lyon, France",
          period: "2022 - present", bullets: ["Service en salle."] },
        { role: "Serveur", company: "Le Bistrot", location: "Lyon, France",
          period: "2018 - 2021", bullets: ["Service en salle."] },
        { role: "Commis", company: "Cafe Vivant", location: "Lyon, France",
          period: "2015 - 2017", bullets: ["Mise en place."] },
      ],
      education: [], skills: [], languages: [],
    }, { locale: "fr" });

    const carte = page.locator('[data-nuvi-ferme="Le Bistrot"]');
    try {
      await carte.waitFor({ timeout: 15000 });
    } catch {
      failures.push(
        "l'employeur radie n'apparait nulle part a l'ecran. La verification "
        + "tourne et personne ne la voit : c'est le meme defaut que la carte "
        + "d'annonce cablee au seul mobile."
      );
      await ctx.close();
      return failures;
    }

    const texte = await carte.innerText();
    if (!/2020/.test(texte)) {
      failures.push("la ligne affichee ne dit pas depuis quand. Texte : " + texte.slice(0, 140));
    }
    if (!/Annuaire des entreprises/i.test(texte)) {
      failures.push(
        "la ligne n'attribue pas le constat au registre qui l'affirme. Sans la "
        + "source, c'est Nuvi qui a l'air d'accuser."
      );
    }
    // UNE ENTREPRISE VIVANTE NE DOIT RIEN DECLENCHER
    if (await page.locator('[data-nuvi-ferme="Cafe Vivant"]').count()) {
      failures.push(
        "un employeur que le registre donne pour ACTIF est affiche comme "
        + "disparu. C'est l'erreur qui fait dire une betise en entretien."
      );
    }

    await ctx.close();
  } catch (e) {
    failures.push("erreur inattendue a l'ecran : " + (e && e.message ? e.message : String(e)));
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (srv) await stopServer(srv);
  }
  return failures;
}
