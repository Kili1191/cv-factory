// LIRE LES REPONSES DES RECRUTEURS
//
// Le suivi des candidatures a un defaut que tous les outils du marche
// partagent : il faut le tenir a la main. On postule, on note, et trois
// semaines plus tard le tableau ment - la moitie des lignes marquees "en
// attente" ont recu une reponse qu'on a lue sur son telephone sans revenir
// mettre a jour quoi que ce soit.
//
// Ce fichier lit la boite mail et rend a chaque candidature son vrai etat.
//
// CE QU'IL NE FAIT PAS
//
//   Il ne lit pas la boite mail. Il ne connait ni jeton, ni reseau, ni
//   Google : on lui donne une liste de messages deja recuperes et une liste
//   de candidatures, il rend des rapprochements. C'est ce qui permet de le
//   verifier sur des cas reels sans compte, sans reseau et sans attente.
//
//   Il ne modifie rien. Il PROPOSE un changement d'etat. La decision revient
//   a l'utilisateur, ecran par ecran. Un classement automatique qui se
//   trompe une fois sur vingt fait passer une candidature vivante pour morte,
//   et personne ne relance une candidature que l'outil a enterree.
//
// CE QU'IL LIT
//
//   L'expediteur, l'objet, la date, et l'extrait que Google renvoie avec
//   chaque message - une centaine de caracteres. Jamais le corps complet.
//   C'est suffisant pour classer, et c'est la difference entre un outil qui
//   consulte des en-tetes et un outil qui lit votre courrier.

// Les relais des logiciels de recrutement. Un message parti de Workday porte
// le domaine de Workday, pas celui de l'entreprise : chercher l'entreprise
// dans le domaine ne donnerait jamais rien. Pour ceux-la, le nom de
// l'entreprise se trouve dans le nom affiche de l'expediteur ou dans l'objet.
export const ATS_RELAYS = [
  "myworkday.com", "workday.com", "greenhouse.io", "us.greenhouse-mail.io",
  "lever.co", "hire.lever.co", "icims.com", "smartrecruiters.com",
  "ashbyhq.com", "teamtailor.com", "welcomekit.co", "welcometothejungle.com",
  "workable.com", "recruitee.com", "taleo.net", "successfactors.com",
  "jobvite.com", "bamboohr.com", "personio.de", "factorialhr.com",
  "linkedin.com", "indeed.com", "indeedemail.com", "monster.fr",
  "hellowork.com", "apec.fr", "francetravail.fr", "pole-emploi.fr",
  "reed.co.uk", "totaljobs.com", "cv-library.co.uk",
];

// Les hebergeurs generalistes. Un recruteur qui ecrit depuis Gmail existe -
// surtout dans les petites structures - mais son domaine ne dit rien de son
// employeur, donc il ne peut pas servir de preuve de rapprochement.
export const GENERIC_HOSTS = [
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "hotmail.fr",
  "live.com", "live.fr", "yahoo.com", "yahoo.fr", "orange.fr", "free.fr",
  "wanadoo.fr", "sfr.fr", "laposte.net", "icloud.com", "me.com", "proton.me",
  "protonmail.com", "gmx.com", "aol.com",
];

// ---------------------------------------------------------------------------
// NORMALISATION
// ---------------------------------------------------------------------------

// Les accents et la casse ne portent aucune information ici : "Décathlon",
// "DECATHLON" et "decathlon" sont la meme entreprise, et un recruteur ecrit
// l'un ou l'autre selon son clavier.
export function fold(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// "Marie Dupont <marie@acme.fr>" -> { name: "marie dupont", email, domain }
export function parseFrom(from) {
  const raw = String(from || "").trim();
  const m = raw.match(/^\s*(?:"([^"]*)"|([^<]*?))\s*<([^>]+)>\s*$/);
  const email = (m ? m[3] : raw).trim().toLowerCase();
  const name = fold((m ? (m[1] || m[2]) : "").trim());
  const at = email.lastIndexOf("@");
  const domain = at >= 0 ? email.slice(at + 1) : "";
  return { name, email, domain };
}

// Le domaine sans ses sous-domaines de service : "jobs.mail.acme.co.uk"
// devient "acme.co.uk". Sans ca, "recrutement@jobs.acme.fr" ne se
// rapprocherait jamais de "acme.fr".
export function rootDomain(domain) {
  const parts = String(domain || "").toLowerCase().split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  // Les suffixes a deux niveaux. La liste publique complete en compte des
  // milliers ; ceux-ci couvrent les pays ou Nuvi est utilise.
  const two = ["co.uk", "org.uk", "ac.uk", "gov.uk", "com.au", "co.nz",
               "co.jp", "com.br", "com.mx", "co.za"];
  const last2 = parts.slice(-2).join(".");
  const keep = two.includes(last2) ? 3 : 2;
  return parts.slice(-keep).join(".");
}

export function isRelay(domain) {
  const r = rootDomain(domain);
  return ATS_RELAYS.some(d => r === d || domain === d || domain.endsWith("." + d));
}

export function isGenericHost(domain) {
  return GENERIC_HOSTS.includes(rootDomain(domain));
}

// Le nom d'une entreprise, reduit a ce qui l'identifie. On retire les formes
// juridiques et la ponctuation : "BNP Paribas S.A." et "BNP PARIBAS" doivent
// se rapprocher, et "Groupe Renault" doit reconnaitre "renault".
const LEGAL = new Set([
  "sa", "sas", "sasu", "sarl", "eurl", "sci", "gmbh", "ag", "bv", "nv",
  "ltd", "limited", "llc", "inc", "corp", "corporation", "plc", "co",
  "group", "groupe", "holding", "holdings", "france", "uk", "international",
  "the", "and", "et",
]);

export function companyTokens(company) {
  return fold(company)
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(t => t.length >= 2 && !LEGAL.has(t));
}

// ---------------------------------------------------------------------------
// RAPPROCHEMENT MESSAGE <-> CANDIDATURE
// ---------------------------------------------------------------------------

// Un message est rapproche d'une candidature quand l'entreprise apparait a un
// endroit qui ne peut pas etre un hasard. Trois preuves, par ordre de force :
//
//   domaine   l'adresse d'envoi contient le nom de l'entreprise. C'est la
//             preuve la plus forte : personne d'autre ne possede ce domaine.
//   nom       le nom affiche de l'expediteur contient l'entreprise. C'est la
//             preuve qui fait fonctionner les relais du recrutement, ou
//             l'entreprise s'affiche mais n'est pas proprietaire du domaine.
//   objet     l'entreprise est citee dans l'objet. Seule, elle ne suffit
//             pas : une lettre d'information cite l'entreprise a chaque
//             envoi. Elle vaut donc uniquement en renfort d'un autre indice,
//             ou accompagnee d'un vocabulaire de candidature.
//
// Le poste, lui, ne sert jamais de preuve unique : "Product Manager" apparait
// dans des centaines de messages sans rapport.
export function matchApplication(msg, applications) {
  const from = parseFrom(msg.from);
  const subject = fold(msg.subject);
  const snippet = fold(msg.snippet);
  const haystackName = from.name;
  const relay = isRelay(from.domain);
  const generic = isGenericHost(from.domain);
  const root = rootDomain(from.domain);
  const domainCore = root.split(".")[0] || "";

  let best = null;

  for (const app of applications || []) {
    const tokens = companyTokens(app.company);
    if (!tokens.length) continue;
    // Le nom de l'entreprise colle, sans espaces : "bnp paribas" -> "bnpparibas",
    // qui est la forme qu'on trouve dans un nom de domaine.
    const glued = tokens.join("");

    let score = 0;
    const why = [];

    const domainHit = !relay && !generic && (
      domainCore === glued ||
      domainCore.includes(glued) ||
      (glued.length >= 5 && glued.includes(domainCore) && domainCore.length >= 5) ||
      tokens.some(t => t.length >= 4 && domainCore.includes(t))
    );
    if (domainHit) { score += 60; why.push("domaine"); }

    const nameHit = tokens.some(t => t.length >= 3 && haystackName.includes(t));
    if (nameHit) { score += 30; why.push("expediteur"); }

    const subjectHit = tokens.some(t => t.length >= 3 && subject.includes(t));
    if (subjectHit) { score += 18; why.push("objet"); }

    const bodyHit = tokens.some(t => t.length >= 4 && snippet.includes(t));
    if (bodyHit) { score += 8; why.push("extrait"); }

    // Le poste en renfort : il ne cree pas un rapprochement, il le confirme.
    const roleTokens = companyTokens(app.role).filter(t => t.length >= 4);
    if (roleTokens.length && roleTokens.every(t => subject.includes(t))) {
      score += 12; why.push("poste");
    }

    // Un vocabulaire de candidature dans l'objet leve le doute quand la seule
    // preuve etait l'objet lui-meme.
    if (score > 0 && APPLY_WORDS.test(subject + " " + snippet)) {
      score += 10; why.push("vocabulaire");
    }

    if (!best || score > best.score) best = { app, score, why };
  }

  // Le seuil. En dessous, la seule preuve est une citation dans l'objet sans
  // rien autour : c'est le profil exact d'une lettre d'information, et
  // proposer de passer une candidature en "refusee" sur cette base serait
  // pire que ne rien proposer.
  if (!best || best.score < 30) return null;
  return best;
}

const APPLY_WORDS =
  /candidature|application|postul|recrut|recruit|entretien|interview|poste|position|offre d'?emploi|job|hiring|talent|rh\b|hr\b/;

// ---------------------------------------------------------------------------
// CLASSEMENT DU MESSAGE
// ---------------------------------------------------------------------------

// Chaque famille est reconnue par des EXPRESSIONS, jamais par des mots isoles.
// C'est le coeur du probleme : "unfortunately" seul est aussi bien le debut
// d'un refus que d'un recruteur qui deplace un rendez-vous, et "offer"
// apparait dans "we cannot offer you the position". Un mot isole classe mal ;
// une expression classe juste.
const MARKERS = {
  rejected: [
    // anglais
    /we regret to inform/, /regret to inform you/,
    /not (?:be )?mov(?:ing|e) forward/, /not moving forward with your/,
    /decided not to (?:proceed|move forward|continue)/,
    /not (?:been )?(?:selected|successful|shortlisted)/,
    /will not be (?:proceeding|progressing)/,
    /other candidates whose/, /more closely (?:matched|aligned)/,
    /pursue other candidates/, /unable to offer you/, /cannot offer you/,
    /keep your (?:cv|resume|details) on file/,
    /wish you (?:all the best|every success|the best) (?:in|with) your (?:job )?search/,
    // francais
    /n'?(?:a|avons) pas (?:ete )?retenu/, /n'?(?:a|avons) pas retenu votre/,
    /ne (?:pas )?donner? (?:pas )?suite/, /ne donnons pas suite/,
    /ne donnerons pas suite/, /sans suite/,
    /votre candidature n'?a pas/, /ne correspond pas (?:au|aux|a nos)/,
    /d'?autres candidat/, /profil(?:s)? plus (?:proche|en adequation)/,
    /nous avons retenu (?:un|une|d'?autres)/,
    /conserv(?:ons|er) votre (?:cv|candidature)/,
    /vous souhait(?:ons|e) (?:bonne chance|plein succes|reussite)/,
  ],
  offer: [
    /pleased to offer you/, /delighted to offer you/, /happy to offer you/,
    /we would like to offer you/, /formal offer/, /offer of employment/,
    /employment offer/, /your offer letter/,
    /proposition d'?embauche/, /offre d'?embauche/,
    /nous (?:avons le plaisir|sommes ravis) de vous proposer/,
    /promesse d'?embauche/, /votre contrat de travail/,
    /nous vous proposons le poste/,
  ],
  interview: [
    /schedule (?:a|an) (?:call|interview|chat|meeting)/,
    /invit(?:e|ing) you to (?:an?|the) (?:interview|call|conversation)/,
    /(?:would|we'?d) (?:like|love) to (?:meet|speak|chat|talk) (?:with|to) you/,
    /next step[s]? (?:in|of) (?:the|our) (?:process|recruitment)/,
    /available (?:for|to) (?:a|an) (?:call|interview|chat)/,
    /phone screen/, /first (?:round|stage) interview/,
    /book a (?:time|slot)/, /calendar (?:link|invite)/,
    /entretien/, /rencontrer/, /echanger (?:avec|de vive voix)/,
    /vos disponibilites/, /vous etes disponible/,
    /premier echange/, /convier|convions|convions vous/,
    /nous souhaitons vous (?:rencontrer|recevoir)/,
    /prochaine etape/,
  ],
  ack: [
    /(?:we|have) received your application/, /thank you for applying/,
    /thanks for (?:applying|your application)/,
    /your application (?:has been|was) (?:received|submitted)/,
    /we have your application/, /application confirmation/,
    /nous avons (?:bien )?(?:recu|receptionne) votre candidature/,
    /accuse de reception/, /votre candidature a (?:bien )?ete (?:recue|enregistree)/,
    /merci (?:pour|de) votre candidature/,
    /nous vous remercions de l'?interet/,
  ],
};

// L'ordre du depouillement.
//
// Le refus passe en premier et prend tout : un refus poli commence presque
// toujours par un remerciement ("merci pour votre candidature") et cite
// souvent l'entretien qui vient d'avoir lieu. Depouille dans l'autre sens, le
// meme message serait classe "accuse de reception" ou "entretien", et
// l'utilisateur croirait avoir un rendez-vous a preparer.
const ORDER = ["rejected", "offer", "interview", "ack"];

export function classify(msg) {
  const text = fold((msg.subject || "") + " \n " + (msg.snippet || ""));
  const hits = {};
  for (const family of ORDER) {
    const found = MARKERS[family].filter(re => re.test(text));
    if (found.length) hits[family] = found.length;
  }

  for (const family of ORDER) {
    if (hits[family]) {
      return {
        outcome: family,
        // Deux expressions concordantes valent mieux qu'une : la confiance
        // sert a decider ce qu'on affiche d'emblee et ce qu'on met en doute.
        confidence: hits[family] >= 2 ? "haute" : "moyenne",
        matched: hits[family],
        // Un entretien telephonique n'est pas un entretien : le suivi
        // distingue les deux, parce qu'ils ne se preparent pas pareil.
        phone: family === "interview" && /phone screen|par telephone|telephonique|appel de|call with/.test(text),
      };
    }
  }
  return { outcome: "unrelated", confidence: "nulle", matched: 0 };
}

// ---------------------------------------------------------------------------
// PROPOSITION DE CHANGEMENT D'ETAT
// ---------------------------------------------------------------------------

// L'ordre des etapes. Il sert a une seule regle, mais elle est capitale : une
// candidature ne recule jamais. Un accuse de reception qui arrive apres un
// entretien - parce que la boite en envoie un par offre, ou parce que le
// message est vieux - ne doit pas ramener le dossier a "envoyee".
const RANK = {
  applied: 1, phone: 2, interview: 3, offer: 4, accepted: 5,
};

export function proposedStatus(current, verdict) {
  // Le refus peut arriver a n'importe quelle etape, y compris apres une
  // offre. Il est le seul mouvement autorise vers l'arriere.
  if (verdict.outcome === "rejected") {
    return current === "rejected" ? null : "rejected";
  }
  if (verdict.outcome === "ack") {
    // L'accuse de reception ne change pas l'etape. Il prouve seulement que la
    // candidature est arrivee quelque part, ce qui a son utilite : le suivi
    // cesse de la compter comme "peut-etre perdue dans le vide".
    return null;
  }
  const next = verdict.outcome === "offer" ? "offer"
    : verdict.phone ? "phone" : "interview";
  const from = RANK[current] || 0;
  const to = RANK[next] || 0;
  return to > from ? next : null;
}

// ---------------------------------------------------------------------------
// LE BALAYAGE
// ---------------------------------------------------------------------------

// Rend une proposition par candidature, jamais une par message : cinq
// messages d'un meme recruteur donnent une ligne, pas cinq. C'est le message
// le plus avance qui l'emporte - un refus recu apres une invitation reste un
// refus, et une invitation recue apres un accuse de reception reste une
// invitation.
export function scanInbox(messages, applications) {
  const byApp = new Map();

  for (const msg of listOf(messages)) {
    const match = matchApplication(msg, applications);
    if (!match) continue;
    const verdict = classify(msg);
    if (verdict.outcome === "unrelated") continue;

    const key = String(match.app.id);
    const prev = byApp.get(key);
    const weight = ORDER.length - ORDER.indexOf(verdict.outcome);
    if (!prev || weight > prev.weight
        || (weight === prev.weight && msgTime(msg) > msgTime(prev.message))) {
      byApp.set(key, { app: match.app, message: msg, verdict, match, weight });
    }
  }

  const out = [];
  for (const entry of byApp.values()) {
    const status = proposedStatus(entry.app.status, entry.verdict);
    out.push({
      applicationId: entry.app.id,
      company: entry.app.company,
      role: entry.app.role,
      currentStatus: entry.app.status,
      proposedStatus: status,
      outcome: entry.verdict.outcome,
      confidence: entry.verdict.confidence,
      why: entry.match.why,
      message: {
        id: entry.message.id,
        from: entry.message.from,
        subject: entry.message.subject,
        date: entry.message.date,
        snippet: entry.message.snippet,
      },
    });
  }
  // Ce qui change passe devant. Une liste ou les cinq premieres lignes disent
  // "rien a faire" n'est pas lue jusqu'au bout.
  out.sort((a, b) => (b.proposedStatus ? 1 : 0) - (a.proposedStatus ? 1 : 0));
  return out;
}

function msgTime(msg) {
  const t = Date.parse(msg && msg.date);
  return Number.isFinite(t) ? t : 0;
}

// Une reponse d'API qui n'est pas un tableau a deja fait tomber la recherche
// d'offres. Le meme garde-fou ici, pour la meme raison.
function listOf(v) {
  return Array.isArray(v) ? v : [];
}

// ---------------------------------------------------------------------------
// LA REQUETE ENVOYEE A GMAIL
// ---------------------------------------------------------------------------

// On ne demande jamais "tous les messages". La requete ne porte que sur les
// entreprises effectivement suivies et sur une fenetre de temps : ce que
// l'application peut lire est borne par ce que l'utilisateur a lui-meme
// saisi dans son suivi.
//
// Rend une chaine vide s'il n'y a rien a chercher - l'appelant doit alors
// n'appeler personne, plutot que d'envoyer une requete sans filtre.
export function buildQuery(applications, { days = 120, max = 40 } = {}) {
  const terms = new Set();
  for (const app of listOf(applications).slice(0, max)) {
    const tokens = companyTokens(app.company);
    if (!tokens.length) continue;
    // Le nom entier entre guillemets : Gmail cherche alors l'expression, et
    // "bnp paribas" ne remonte pas tous les messages contenant "paribas".
    terms.add('"' + tokens.join(" ") + '"');
  }
  if (!terms.size) return "";
  return `newer_than:${days}d -in:spam -in:trash (${[...terms].join(" OR ")})`;
}
