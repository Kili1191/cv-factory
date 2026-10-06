// LES OFFRES QUI NE SONT SUR AUCUN SITE D'EMPLOI
//
// Kilian, le 6 octobre 2026, en montrant careerhound.io : "on peut faire
// pareil ?" Ce produit vend une seule chose, les postes publies sur le site
// des entreprises et nulle part ailleurs, et son argument est juste : une
// annonce sur un agregateur a deux cents candidats dans l'heure, l'employeur
// paie une commission, et il prefere les candidatures directes.
//
// Techniquement c'est a notre portee pour une raison qu'on avait deja
// mesuree sans la voir : Indeed et LinkedIn repondent 401 a un serveur, et
// les ATS servent tout en JSON public, sans cle. Les offres que Nuvi ne
// pourra jamais lire sont celles qu'il ne faut pas viser ; celles qu'il lit
// sans effort sont celles ou la candidature compte.
//
// CE QUE CE TEST TIENT, SANS RESEAU
//
// Les lectures reelles appartiennent a la CI d'une entreprise tierce, pas a
// la notre : un tableau Greenhouse qui change de forme un mardi ne doit pas
// rendre cette suite rouge. On tient donc ce qui est a nous, et qui est
// aussi ce qui s'est casse pendant l'ecriture :
//
//   1. Chaque ATS est lu dans la forme qu'il rend vraiment, relevee le jour
//      de l'ecriture sur un vrai tableau.
//   2. "account manager" ne rend pas "Senior Manager, Accounting". C'est le
//      defaut de la premiere version : includes() trouve "account" dans
//      "accounting", et trois des dix premiers resultats etaient de la
//      comptabilite.
//   3. Un intitule maison est quand meme trouve, mais seulement si l'annonce
//      ecrit l'expression entiere. "Client Partner" chez Deliveroo est un
//      poste de gestion de comptes et son titre ne le dit pas. La regle
//      d'avant acceptait les deux mots n'importe ou dans le corps, et toute
//      annonce de manager contient "account" une fois : vingt resultats sur
//      vingt-neuf etaient du mauvais metier.
//   4. Le registre ne contient que des entreprises verifiees, avec un ATS
//      connu. Une ligne devinee serait une recherche plus lente pour rien.

import { ATS, NOMS_ATS, normaliser, lieuCorrespond, titreCorrespond, lireUnBoard, dansLeMarche, MARCHES } from "../lib/ats.js";
import { BOARDS, nomDeLEntreprise, boardsDuMarche } from "../lib/boards.js";

// Les formes relevees sur de vrais tableaux le 6 octobre 2026.
const REPONSES = {
  greenhouse: { jobs: [{ title: "Corporate Account Manager", location: { name: "London, UK" },
    absolute_url: "https://job-boards.greenhouse.io/x/jobs/1", updated_at: "2026-10-01", content: "Own a portfolio." }] },
  lever: [{ text: "Account Manager", categories: { location: "London" },
    hostedUrl: "https://jobs.lever.co/x/1", createdAt: 1759276800000, descriptionPlain: "Own a portfolio." }],
  ashby: { jobs: [{ title: "Account Manager", location: "London", jobUrl: "https://jobs.ashbyhq.com/x/1",
    publishedAt: "2026-10-01", descriptionPlain: "Own a portfolio." }] },
  recruitee: { offers: [{ title: "Account Manager", city: "London", country: "UK",
    careers_url: "https://x.recruitee.com/o/1", published_at: "2026-10-01", description: "Own a portfolio." }] },
  teamtailor: { jobs: [{ title: "Account Manager", location: "London",
    url: "https://x.teamtailor.com/jobs/1", created_at: "2026-10-01", body: "Own a portfolio." }] },
  personio: [{ name: "Account Manager", office: "London", url: "https://x.jobs.personio.com/job/1",
    createdAt: "2026-10-01" }],
};

export async function run() {
  const failures = [];

  // --- 1. CHAQUE ATS EST LU DANS SA FORME REELLE ------------------------
  for (const nom of NOMS_ATS) {
    const postes = ATS[nom].lire(REPONSES[nom]);
    if (postes.length !== 1) {
      failures.push(nom + " : " + postes.length + " poste lu au lieu d'un, sur la forme que cet ATS rend vraiment");
      continue;
    }
    const p = normaliser(postes[0], "Test Ltd", "ats");
    if (!/account manager/i.test(p.title)) failures.push(nom + " : l'intitule n'est pas lu (\"" + p.title + "\")");
    if (!/london/i.test(p.location)) failures.push(nom + " : le lieu n'est pas lu (\"" + p.location + "\")");
    if (!/^https?:\/\//.test(p.url)) {
      failures.push(nom + " : aucune adresse pour postuler.\n" +
        "      Une offre sans lien est une offre qu'on ne peut pas prendre.");
    }
    if (p.company !== "Test Ltd") failures.push(nom + " : l'entreprise est perdue");
  }

  // --- 2. LA COMPTABILITE N'EST PAS LA GESTION DE COMPTES ---------------
  const comptable = { title: "Senior Manager, Accounting", description: "Month end close and reporting." };
  if (titreCorrespond(comptable, "account manager")) {
    failures.push(
      "\"Senior Manager, Accounting\" est rendu pour \"account manager\".\n" +
      "      includes() trouve \"account\" dans \"accounting\" : trois des dix premiers resultats\n" +
      "      de la premiere version etaient du mauvais metier."
    );
  }

  // --- 3. UN INTITULE MAISON EST QUAND MEME TROUVE ----------------------
  const maison = { title: "Client Partner",
    description: "Own a portfolio of SME accounts, acting as their account manager day to day." };
  if (!titreCorrespond(maison, "account manager")) {
    failures.push(
      "\"Client Partner\" n'est pas trouve pour \"account manager\".\n" +
      "      C'est le poste de gestion de comptes de Deliveroo ; son titre ne le dit pas, et\n" +
      "      c'est exactement le genre d'offre que personne ne voit."
    );
  }
  const loin = { title: "Data Science Manager",
    description: "You will work with the credit account teams. Reports to the senior manager." };
  if (titreCorrespond(loin, "account manager")) {
    failures.push(
      "\"Data Science Manager\" est rendu pour \"account manager\".\n" +
      "      Les deux mots sont dans le corps a trois paragraphes d'ecart, ce que contient\n" +
      "      toute annonce de manager : vingt resultats sur vingt-neuf etaient du mauvais metier."
    );
  }

  // --- 4. UN LIEU EST UNE CHAINE LIBRE ----------------------------------
  for (const lieu of ["London", "London, United Kingdom", "London, England", "UK - London", "Remote, UK"]) {
    if (!lieuCorrespond(lieu, "London")) {
      failures.push("\"" + lieu + "\" n'est pas reconnu comme Londres : chaque ATS l'ecrit autrement");
    }
  }
  if (lieuCorrespond("Paris, France", "London")) failures.push("Paris est rendu pour une recherche a Londres");

  // --- 5. LE REGISTRE NE CONTIENT QUE DU VERIFIE ------------------------
  if (BOARDS.length < 20) {
    failures.push("le registre ne porte que " + BOARDS.length + " entreprises : trop peu pour que la recherche vaille");
  }
  const slugs = new Set();
  for (const b of BOARDS) {
    if (!NOMS_ATS.includes(b.ats)) failures.push(b.slug + " : ATS inconnu \"" + b.ats + "\"");
    if (!b.slug || !b.nom) failures.push(JSON.stringify(b) + " : ligne incomplete");
    if (slugs.has(b.slug)) failures.push(b.slug + " : en double dans le registre");
    slugs.add(b.slug);
  }
  if (nomDeLEntreprise("monzo") === "monzo") {
    failures.push("le nom lisible de monzo n'est pas renseigne : la liste affichera un identifiant");
  }

  // --- 6. REPONDRE N'EST PAS APPARTENIR --------------------------------
  //
  // Un identifiant d'ATS est mondial et court, donc il se partage. Les deux
  // chaines ci-dessous sont celles qu'on a vraiment lues le 6 octobre 2026
  // en devinant des noms d'entreprises londoniennes : `bbc.recruitee.com`
  // publie a Mechelen, en Belgique, et `web.jobs.personio.com` a Munich.
  // Les deux avaient repondu avec des postes, et la regle "une ligne ecrite
  // est une ligne qui a repondu" les aurait inscrites comme la BBC et comme
  // une universite de Londres.
  const usurpateurs = [
    ["Mechelen, Vlaams Gewest, Belgium", "bbc.recruitee.com, qui n'est pas la BBC"],
    ["M\u00fcnchen", "web.jobs.personio.com, qui n'est pas a Londres"],
    ["Salt Lake City", "un tableau americain"],
  ];
  for (const [lieu, quoi] of usurpateurs) {
    if (dansLeMarche(lieu, "gb")) {
      failures.push(
        "\"" + lieu + "\" passe pour du marche britannique : " + quoi + " entrerait au registre.\n" +
        "      Le filtre par lieu est la seule chose qui distingue un homonyme d'une entreprise."
      );
    }
  }
  for (const lieu of ["London, UK", "Manchester", "Remote, England", "Edinburgh, Scotland", "United Kingdom"]) {
    if (!dansLeMarche(lieu, "gb")) {
      failures.push("\"" + lieu + "\" est refuse du marche britannique : de vraies entreprises seraient perdues");
    }
  }
  // Un marche inconnu ne doit rien filtrer : sinon ajouter un pays au
  // registre viderait sa recherche en silence, et rien ne le dirait.
  if (!dansLeMarche("Sao Paulo", "br")) {
    failures.push("un marche absent de MARCHES filtre tout : la recherche se vide sans le dire");
  }
  if (Object.keys(MARCHES).length < 4) failures.push("MARCHES ne couvre presque aucun pays");

  // --- 7. UN CHAMP AJOUTE NE RETIRE PERSONNE ----------------------------
  //
  // Les quarante-neuf premieres lignes n'ont pas de marche. Si le filtre les
  // ecartait, la recherche d'hier rendrait moins que celle d'avant-hier, et
  // c'est exactement le genre de regression qu'aucun ecran ne montre.
  const sansMarche = BOARDS.filter((b) => !b.marche);
  for (const code of ["gb", "fr", "us", "zz"]) {
    const retenus = boardsDuMarche(code);
    for (const b of sansMarche) {
      if (!retenus.some((x) => x.slug === b.slug)) {
        failures.push(b.slug + " disparait de la recherche " + code
          + " alors que sa ligne ne declare aucun marche");
        break;
      }
    }
  }
  const gb = boardsDuMarche("gb");
  if (BOARDS.some((b) => b.marche === "fr") && gb.some((b) => b.marche === "fr")) {
    failures.push("un tableau declare francais est lu par une recherche britannique : le marche ne filtre rien");
  }
  for (const b of BOARDS) {
    if (b.marche && !MARCHES[b.marche]) {
      failures.push(b.slug + ' porte le marche "' + b.marche + '", que dansLeMarche ne connait pas :'
        + " sa ligne ne sera jamais filtree sur le lieu");
    }
  }

  // --- 8. UN TABLEAU MUET NE CASSE PAS LA RECHERCHE ---------------------
  //
  // Une entreprise change d'ATS, et son identifiant ne repond plus. Si cette
  // lecture levait, les quarante-huit autres seraient perdues avec elle.
  const mort = await lireUnBoard("nexistepas", "greenhouse", async () => { throw new Error("ENOTFOUND"); });
  if (!mort.erreur || mort.postes.length) {
    failures.push("un tableau injoignable ne se declare pas en erreur : la recherche entiere tombe avec lui");
  }
  const inconnu = await lireUnBoard("x", "pasunats", async () => { throw new Error("jamais appele"); });
  if (!inconnu.erreur) failures.push("un ATS inconnu n'est pas refuse");

  if (!failures.length) {
    console.log("      " + BOARDS.length + " pages carriere verifiees ("
      + boardsDuMarche("gb").length + " pour le marche britannique), six ATS lus dans leur forme reelle, "
      + "et ni la comptabilite ni les homonymes n'entrent dans les resultats");
  }
  return failures;
}
