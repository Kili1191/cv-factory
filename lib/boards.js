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
  { slug: "wpp", ats: "greenhouse", nom: "WPP", marche: "gb" },
  { slug: "metropolis", ats: "greenhouse", nom: "Metropolis", marche: "gb" },
  { slug: "map", ats: "greenhouse", nom: "MAP", marche: "gb" },
  { slug: "framestore", ats: "recruitee", nom: "Framestore", marche: "gb" },
  { slug: "swire", ats: "recruitee", nom: "Swire", marche: "gb" },
  { slug: "moss", ats: "ashby", nom: "Moss", marche: "gb" },
  { slug: "mintel", ats: "greenhouse", nom: "Mintel", marche: "gb" },
  { slug: "zeal-network", ats: "ashby", nom: "Zeal Network", marche: "gb" },
  { slug: "inizio", ats: "greenhouse", nom: "Inizio", marche: "gb" },
  { slug: "cube", ats: "ashby", nom: "CUBE", marche: "gb" },
  { slug: "eunetworks", ats: "greenhouse", nom: "euNetworks", marche: "gb" },
  { slug: "moonpig", ats: "lever", nom: "Moonpig", marche: "gb" },
  { slug: "janes", ats: "greenhouse", nom: "Janes", marche: "gb" },
  { slug: "storiogroup", ats: "lever", nom: "Storio group", marche: "gb" },
  { slug: "ifrsfoundation", ats: "greenhouse", nom: "IFRS Foundation", marche: "gb" },
  { slug: "clearbank", ats: "ashby", nom: "ClearBank", marche: "gb" },
  { slug: "mec", ats: "recruitee", nom: "MEC Consulting Group", marche: "gb" },
  { slug: "dmgt", ats: "greenhouse", nom: "DMGT", marche: "gb" },
  { slug: "ikpartners", ats: "recruitee", nom: "IK Partners", marche: "gb" },
  { slug: "bcpartners", ats: "recruitee", nom: "BC Partners", marche: "gb" },
  { slug: "octoenergy", ats: "lever", nom: "Octopus Energy Group", marche: "gb" },
  { slug: "thesocialhub", ats: "greenhouse", nom: "The Social Hub", marche: "gb" },
  { slug: "sophos", ats: "lever", nom: "Sophos", marche: "gb" },
  { slug: "castrol", ats: "greenhouse", nom: "Castrol", marche: "gb" },
  { slug: "mulberry", ats: "lever", nom: "Mulberry", marche: "gb" },
  { slug: "joblogic", ats: "greenhouse", nom: "Joblogic", marche: "gb" },
  { slug: "headfirst", ats: "recruitee", nom: "Vertage", marche: "gb" },
  { slug: "searchable", ats: "ashby", nom: "Searchable", marche: "gb" },
  { slug: "red-gate", ats: "ashby", nom: "Redgate", marche: "gb" },
  { slug: "exclaimer", ats: "greenhouse", nom: "Exclaimer", marche: "gb" },
  { slug: "foundry", ats: "greenhouse", nom: "Foundry", marche: "gb" },
  { slug: "elsevier", ats: "greenhouse", nom: "Elsevier", marche: "gb" },
  { slug: "policyexpert", ats: "greenhouse", nom: "Policy Expert", marche: "gb" },
  { slug: "bromcom", ats: "recruitee", nom: "Bromcom Computers Plc", marche: "gb" },
  { slug: "rubix", ats: "greenhouse", nom: "Rubix", marche: "gb" },
  { slug: "nothing", ats: "greenhouse", nom: "Nothing", marche: "gb" },
  { slug: "thinkmarkets", ats: "greenhouse", nom: "ThinkMarkets", marche: "gb" },
  { slug: "notpla", ats: "personio", nom: "Notpla Limited", marche: "gb" },
  { slug: "apax", ats: "recruitee", nom: "Apax", marche: "gb" },
  { slug: "validsoft", ats: "personio", nom: "ValidSoft", marche: "gb" },
  { slug: "blacks", ats: "greenhouse", nom: "Blacks", marche: "gb" },
  { slug: "nmcareers", ats: "greenhouse", nom: "NaturalMotion", marche: "gb" },
  { slug: "dovetailgames", ats: "recruitee", nom: "Dovetail Games Ltd", marche: "gb" },
  { slug: "firesprite", ats: "greenhouse", nom: "Firesprite", marche: "gb" },
  { slug: "shemed", ats: "greenhouse", nom: "SheMed", marche: "gb" },
];

export function boardsParAts(nom) {
  return BOARDS.filter((b) => b.ats === nom);
}

// UN TABLEAU SANS `marche` EST D'AVANT QUE LE CHAMP EXISTE
//
// Les quarante-neuf premieres lignes ont ete verifiees a la main, une par
// une, et plusieurs sont des entreprises qui embauchent partout. Elles sont
// donc essayees pour tous les marches : un champ ajoute ne doit jamais
// retirer une ligne d'une recherche qui la trouvait hier.
//
// Pour les suivantes, le marche est ce qui rend l'echelle possible. Une
// recherche a Londres n'a aucune raison de lire les tableaux allemands, et
// c'est la difference entre un registre de cinq cents lignes et un registre
// qui peut en porter des milliers.
//
// Cette fonction est APRES boardsParAts et non avant, parce que les scripts
// de decouverte inserent leurs lignes juste devant celle-la : la chaine
// "];\n\nexport function boardsParAts" est leur point d'ancrage, et y glisser
// quoi que ce soit leur fait refuser d'ecrire.
export function boardsDuMarche(code) {
  const c = String(code || "").toLowerCase();
  return BOARDS.filter((b) => !b.marche || b.marche === c);
}

export function nomDeLEntreprise(slug) {
  const b = BOARDS.find((x) => x.slug === slug);
  return (b && b.nom) || slug;
}
