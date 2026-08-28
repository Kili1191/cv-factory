/**
 * DEVINER LE SECTEUR A PARTIR DE L'INTITULE
 *
 * L'ecran de generation demandait sept choses avant de produire quoi que ce
 * soit : intitule, secteur, annees, ton, langue, parcours, annonce. Pour
 * quelqu'un qui remplit ca sur un telephone pendant sa pause, c'est six
 * decisions de trop avant la premiere ligne de valeur.
 *
 * Or le secteur se deduit presque toujours de l'intitule. "Aide-soignante"
 * ne laisse aucun doute, "chauffeur-livreur" non plus. On le devine donc, on
 * l'affiche, et on laisse le corriger - au lieu de le demander.
 *
 * DETERMINISTE ET LOCAL
 *
 * Aucun appel, aucun cout, reponse immediate. C'est la meme position que
 * lib/diagnostic.js : ce qui se calcule ne se demande pas au modele, et
 * surtout ne se demande pas a l'utilisateur.
 */

import { fold } from "./atsMatch.js";

// Les identifiants sont stables ; les libelles affiches vivent dans les
// traductions. Sans cette separation, deviner un secteur en anglais et
// l'afficher en francais devient impossible.
export const SECTEURS = [
  "hospitality", "care", "retail", "logistics", "cleaning", "security",
  "education", "trades", "admin", "health", "finance", "tech",
  "consulting", "marketing", "hr", "sales", "industry", "property", "luxury",
];

// Les mots d'un metier, dans les deux langues. On garde des racines courtes :
// "serveur" attrape "serveuse", "soignant" attrape "aide-soignante".
const INDICES = {
  hospitality: "serveur serveus barman barmaid bar restaurant brasserie cafe "
    + "cuisin chef commis plong hotel hotell reception restauration sommelier "
    + "waiter waitress bartender barista kitchen catering hospitality host "
    + "chef partie porter concierge",
  care: "soignant soignante aide-soignant auxiliaire ehpad aide domicile "
    + "puericul creche assistante maternelle accompagnant handicap "
    + "carer caregiver care support worker healthcare assistant nursery "
    + "childminder residential domiciliary",
  retail: "vendeur vendeuse caissier caissiere magasin boutique rayon "
    + "commerce merchandis hote caisse "
    + "retail shop store sales assistant cashier till checkout stockroom",
  logistics: "livreur chauffeur cariste manutention preparateur commandes "
    + "entrepot logistique transport coursier routier magasinier "
    + "driver delivery courier warehouse operative forklift picker packer "
    + "logistics haulage van hgv",
  cleaning: "agent entretien menage nettoyage proprete plonge "
    + "cleaner cleaning housekeeping janitor custodian domestic",
  security: "agent securite surveillance gardien vigile maitre chien "
    + "security officer guard doorman steward",
  education: "enseignant professeur instituteur atsem surveillant animateur "
    + "teaching assistant teacher tutor learning support classroom",
  trades: "plombier electricien macon menuisier peintre couvreur chauffagiste "
    + "soudeur mecanicien carrossier technicien maintenance artisan "
    + "plumber electrician carpenter joiner bricklayer painter welder "
    + "mechanic engineer maintenance labourer construction",
  admin: "secretaire assistant administratif accueil standardiste "
    + "gestionnaire agent administratif "
    + "administrator administrative clerk receptionist secretary office",
  health: "infirmier infirmiere medecin kinesitherapeute pharmacien "
    + "ambulancier dentiste sage-femme "
    + "nurse doctor paramedic pharmacist physiotherapist clinical",
  finance: "comptable financier controleur gestion tresorier auditeur banque "
    + "credit assurance "
    + "accountant finance controller treasury audit banking insurance cfo",
  tech: "developpeur developpeuse ingenieur logiciel data devops informatique "
    + "systeme reseau cyber "
    + "developer software engineer data devops backend frontend fullstack it "
    + "cto architect",
  consulting: "consultant conseil strategie transformation "
    + "consultant consulting strategy advisory",
  marketing: "marketing communication community brand contenu digital "
    + "growth seo social media communications cmo",
  hr: "ressources humaines recrutement paie formation talent "
    + "human resources recruiter recruitment payroll talent people chro",
  sales: "commercial business developer account grands comptes "
    + "sales account executive business development",
  industry: "production usine atelier operateur qualite methodes industriel "
    + "manufacturing production plant operator quality",
  property: "immobilier syndic gestion locative agent immobilier "
    + "real estate property lettings estate agent",
  luxury: "luxe joaillerie horlogerie maroquinerie haute couture "
    + "luxury jewellery watchmaking couture",
};

// Prepare une fois : chaque secteur devient un ensemble de racines.
const RACINES = Object.entries(INDICES).map(([cle, mots]) => [
  cle, mots.split(/\s+/).filter(Boolean).map(fold),
]);

/**
 * Rend l'identifiant de secteur le plus probable, ou null quand l'intitule
 * n'apprend rien - auquel cas il vaut mieux ne rien preselectionner que
 * d'imposer un secteur au hasard.
 */
export function secteurProbable(intitule) {
  const t = fold(String(intitule || ""));
  if (t.length < 3) return null;
  let gagnant = null;
  let meilleur = 0;
  for (const [cle, racines] of RACINES) {
    let points = 0;
    for (const r of racines) {
      if (r.length >= 3 && t.includes(r)) {
        // Une racine longue est un signal plus sur qu'une courte : "cuisin"
        // pese plus que "bar", qui apparait dans "barrage".
        points += r.length;
      }
    }
    if (points > meilleur) { meilleur = points; gagnant = cle; }
  }
  return gagnant;
}
