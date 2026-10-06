// LE REGISTRE DES TABLEAUX D'OFFRES
//
// Une entreprise par ligne : son identifiant chez son ATS, et le nom qu'un
// candidat reconnait. C'est la seule partie de cette fonctionnalite qui ne
// s'ecrit pas, qui se construit : lire un tableau est trivial, savoir qu'il
// existe ne l'est pas. C'est aussi, pour cette raison, la seule qui protege.
//
// Cette premiere liste a ete verifiee le 6 octobre 2026 : cent dix-huit noms
// d'entreprise devines a la main, essayes contre les six ATS, quarante-neuf
// tableaux vivants et pres de quatre mille postes. Un taux de reussite de
// quarante pour cent sur des devinettes, ce qui dit surtout combien il reste
// a trouver.
//
// POUR L'ALLONGER : node scripts/decouvrir-des-boards.mjs mes-candidats.txt
//
// Le script essaie chaque nom contre les six ATS et n'ecrit que ce qui
// repond avec au moins un poste. Rien ici n'est devine : une ligne presente
// est une ligne qui a repondu.

export const BOARDS = [
  { slug: "stripe", ats: "greenhouse", nom: "Stripe" },
  { slug: "elastic", ats: "greenhouse", nom: "Elastic" },
  { slug: "sumup", ats: "greenhouse", nom: "SumUp" },
  { slug: "palantir", ats: "lever", nom: "Palantir" },
  { slug: "canonical", ats: "greenhouse", nom: "Canonical" },
  { slug: "gitlab", ats: "greenhouse", nom: "GitLab" },
  { slug: "deliveroo", ats: "greenhouse", nom: "Deliveroo" },
  { slug: "graphcore", ats: "greenhouse", nom: "Graphcore" },
  { slug: "ebury", ats: "greenhouse", nom: "Ebury" },
  { slug: "airbnb", ats: "greenhouse", nom: "Airbnb" },
  { slug: "wayve", ats: "ashby", nom: "Wayve" },
  { slug: "payoneer", ats: "greenhouse", nom: "Payoneer" },
  { slug: "tide", ats: "greenhouse", nom: "Tide" },
  { slug: "spotify", ats: "lever", nom: "Spotify" },
  { slug: "faculty", ats: "ashby", nom: "Faculty" },
  { slug: "monzo", ats: "greenhouse", nom: "Monzo" },
  { slug: "getyourguide", ats: "greenhouse", nom: "GetYourGuide" },
  { slug: "n26", ats: "greenhouse", nom: "N26" },
  { slug: "trustpilot", ats: "greenhouse", nom: "Trustpilot" },
  { slug: "farfetch", ats: "lever", nom: "Farfetch" },
  { slug: "quantexa", ats: "ashby", nom: "Quantexa" },
  { slug: "zopa", ats: "lever", nom: "Zopa" },
  { slug: "trainline", ats: "ashby", nom: "Trainline" },
  { slug: "pleo", ats: "ashby", nom: "Pleo" },
  { slug: "primer", ats: "ashby", nom: "Primer" },
  { slug: "gocardless", ats: "greenhouse", nom: "GoCardless" },
  { slug: "moneybox", ats: "ashby", nom: "Moneybox" },
  { slug: "elliptic", ats: "ashby", nom: "Elliptic" },
  { slug: "paddle", ats: "ashby", nom: "Paddle" },
  { slug: "multiverse", ats: "ashby", nom: "Multiverse" },
  { slug: "snyk", ats: "ashby", nom: "Snyk" },
  { slug: "wise", ats: "greenhouse", nom: "Wise" },
  { slug: "typeform", ats: "greenhouse", nom: "Typeform" },
  { slug: "zilch", ats: "ashby", nom: "Zilch" },
  { slug: "marshmallow", ats: "ashby", nom: "Marshmallow" },
  { slug: "mindfoundry", ats: "greenhouse", nom: "Mind Foundry" },
  { slug: "immersivelabs", ats: "ashby", nom: "Immersive Labs" },
  { slug: "form3", ats: "greenhouse", nom: "Form3" },
  { slug: "griffin", ats: "ashby", nom: "Griffin" },
  { slug: "freetrade", ats: "ashby", nom: "Freetrade" },
  { slug: "signal-ai", ats: "ashby", nom: "Signal AI" },
  { slug: "beamery", ats: "ashby", nom: "Beamery" },
  { slug: "copperco", ats: "greenhouse", nom: "Copper" },
  { slug: "improbable", ats: "ashby", nom: "Improbable" },
  { slug: "truelayer", ats: "greenhouse", nom: "TrueLayer" },
  { slug: "cleo", ats: "greenhouse", nom: "Cleo" },
  { slug: "ovoenergy", ats: "greenhouse", nom: "OVO Energy" },
  { slug: "unmind", ats: "ashby", nom: "Unmind" },
  { slug: "personio", ats: "recruitee", nom: "Personio" },
];

export function boardsParAts(nom) {
  return BOARDS.filter((b) => b.ats === nom);
}

export function nomDeLEntreprise(slug) {
  const b = BOARDS.find((x) => x.slug === slug);
  return (b && b.nom) || slug;
}
