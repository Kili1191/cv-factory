// LIRE LES REPONSES DES RECRUTEURS SANS SE TROMPER
//
// Ce test existe pour une raison precise. Le suivi propose de changer l'etat
// d'une candidature a partir d'un courriel, et les deux erreurs possibles
// n'ont pas du tout le meme cout :
//
//   classer un refus en "entretien"  ->  l'utilisateur prepare un rendez-vous
//                                        qui n'existe pas
//   classer une invitation en "refus" ->  l'utilisateur abandonne un poste
//                                        qu'il vient d'obtenir
//
// La seconde est irrattrapable, et c'est exactement celle que produit un
// classement naif : un refus poli s'ouvre presque toujours par un
// remerciement, et une invitation contient parfois "malheureusement".
//
// Les messages ci-dessous sont les formes reelles des logiciels de
// recrutement et des recruteurs francais et britanniques. Aucun n'est
// invente pour arranger le resultat : les pieges - la lettre d'information
// de la meme entreprise, le refus qui remercie, le recruteur qui deplace un
// rendez-vous - sont la parce qu'ils arrivent tous les jours.

import {
  scanInbox, classify, matchApplication, proposedStatus, buildQuery, parseFrom,
} from "../lib/gmailScan.js";

const APPLICATIONS = [
  { id: 1, company: "Doctolib",     role: "Product Manager",  status: "applied",   date: "2026-07-20" },
  { id: 2, company: "Monzo Bank",   role: "Backend Engineer", status: "applied",   date: "2026-07-28" },
  { id: 3, company: "BNP Paribas",  role: "Analyste risques", status: "phone",     date: "2026-07-10" },
  { id: 4, company: "Deliveroo",    role: "Ops Manager",      status: "interview", date: "2026-06-30" },
  { id: 5, company: "Alan",         role: "Designer",         status: "applied",   date: "2026-08-05" },
];

// [message, candidature attendue (null = aucune), issue attendue, etat propose]
const CASES = [
  // --- REFUS -------------------------------------------------------------
  ["refus poli qui commence par un remerciement", {
    id: "m1",
    from: "Doctolib Recrutement <ne-pas-repondre@doctolib.com>",
    subject: "Votre candidature chez Doctolib",
    snippet: "Merci pour votre candidature au poste de Product Manager. Apres etude, nous n'avons pas retenu votre profil pour ce poste.",
    date: "2026-08-14T09:12:00Z",
  }, 1, "rejected", "rejected"],

  ["refus anglais via Greenhouse", {
    id: "m2",
    from: "Monzo Bank <no-reply@us.greenhouse-mail.io>",
    subject: "Your application to Monzo Bank",
    snippet: "Thank you for your interest in Monzo. We regret to inform you that we have decided not to move forward with your application at this time.",
    date: "2026-08-12T16:40:00Z",
  }, 2, "rejected", "rejected"],

  ["refus apres entretien : il doit primer sur le mot entretien", {
    id: "m3",
    from: "Camille Roux <camille.roux@deliveroo.co.uk>",
    subject: "Suite a votre entretien - Ops Manager",
    snippet: "Merci d'avoir pris le temps de nous rencontrer. Nous avons decide de ne pas donner suite a votre candidature, un autre profil correspondait davantage.",
    date: "2026-08-16T11:05:00Z",
  }, 4, "rejected", "rejected"],

  // --- ENTRETIEN ---------------------------------------------------------
  ["invitation a un entretien", {
    id: "m4",
    from: "Sophie Bernard <sophie@alan.com>",
    subject: "Alan - Designer : on se rencontre ?",
    snippet: "Bonjour, votre profil nous interesse beaucoup. Pouvez-vous m'indiquer vos disponibilites cette semaine pour un premier echange ?",
    date: "2026-08-18T08:30:00Z",
  }, 5, "interview", "interview"],

  ["invitation anglaise a un appel de qualification", {
    id: "m5",
    from: "Monzo Talent <talent@monzo.com>",
    subject: "Monzo - Backend Engineer: next steps",
    snippet: "We would love to chat with you. Are you available for a phone screen next week? Here is my calendar link.",
    date: "2026-08-19T10:00:00Z",
  }, 2, "interview", "phone"],

  // --- OFFRE -------------------------------------------------------------
  ["offre ferme", {
    id: "m6",
    from: "BNP Paribas RH <recrutement@group.bnpparibas>",
    subject: "Proposition d'embauche - Analyste risques",
    snippet: "Nous avons le plaisir de vous proposer le poste. Vous trouverez ci-joint votre promesse d'embauche.",
    date: "2026-08-20T14:00:00Z",
  }, 3, "offer", "offer"],

  // --- ACCUSE DE RECEPTION ----------------------------------------------
  ["accuse de reception : la candidature est vivante mais n'avance pas", {
    id: "m7",
    from: "Alan <jobs@ashbyhq.com>",
    subject: "Nous avons bien recu votre candidature - Alan",
    snippet: "Merci pour votre candidature. Notre equipe l'etudie et reviendra vers vous sous dix jours.",
    date: "2026-08-06T07:00:00Z",
  }, 5, "ack", null],

  // --- LES PIEGES --------------------------------------------------------
  // Le courriel VIENT bien de Doctolib : le rapprochement est juste, et
  // pretendre le contraire reviendrait a demander a l'etape "de qui" de
  // repondre a la question "de quoi". C'est le classement qui doit refuser,
  // et le balayage complet, plus bas, verifie qu'aucune proposition n'en
  // sort.
  ["lettre d'information de la meme entreprise : reconnue, mais sans objet", {
    id: "m8",
    from: "Doctolib <newsletter@doctolib-news.com>",
    subject: "Doctolib : les nouveautes de l'ete",
    snippet: "Decouvrez la teleconsultation amelioree et nos nouveaux services praticiens.",
    date: "2026-08-10T06:00:00Z",
  }, 1, "unrelated", null],

  ["recruteur qui deplace un rendez-vous : malheureusement n'est pas un refus", {
    id: "m9",
    from: "Camille Roux <camille.roux@deliveroo.co.uk>",
    subject: "Deliveroo - notre entretien de jeudi",
    snippet: "Malheureusement je ne suis plus disponible jeudi. Pouvez-vous me donner vos disponibilites vendredi ?",
    date: "2026-08-17T09:00:00Z",
  }, 4, "interview", null],

  ["un refus qui contient le mot offer ne devient pas une offre", {
    id: "m10",
    from: "Monzo Bank <no-reply@us.greenhouse-mail.io>",
    subject: "Monzo Bank - update on your application",
    snippet: "Unfortunately we are unable to offer you the position on this occasion. We will keep your CV on file.",
    date: "2026-08-13T12:00:00Z",
  }, 2, "rejected", "rejected"],

  ["une entreprise non suivie ne touche a rien", {
    id: "m11",
    from: "Spotify Careers <careers@spotify.com>",
    subject: "Your application to Spotify",
    snippet: "We regret to inform you that we will not be moving forward.",
    date: "2026-08-11T12:00:00Z",
  }, null, null, null],
];

export async function run() {
  const failures = [];

  for (const [label, msg, expectedApp, expectedOutcome, expectedStatus] of CASES) {
    const match = matchApplication(msg, APPLICATIONS);
    const gotApp = match ? match.app.id : null;
    if (gotApp !== expectedApp) {
      failures.push(`${label} : rapproche de ${gotApp === null ? "aucune candidature" : "la candidature " + gotApp}, attendu ${expectedApp === null ? "aucune" : expectedApp}`);
      continue;
    }
    if (expectedApp === null) continue;

    const verdict = classify(msg);
    if (verdict.outcome !== expectedOutcome) {
      failures.push(`${label} : classe "${verdict.outcome}", attendu "${expectedOutcome}"`);
      continue;
    }
    if (expectedOutcome === "unrelated") continue;
    const app = APPLICATIONS.find(a => a.id === expectedApp);
    const status = proposedStatus(app.status, verdict);
    if (status !== expectedStatus) {
      failures.push(`${label} : propose "${status}", attendu "${expectedStatus}"`);
    }
  }

  // UNE LIGNE PAR CANDIDATURE, PAS UNE PAR MESSAGE
  //
  // Monzo apparait dans quatre messages : un refus, une invitation et un
  // refus deguise. Le suivi doit en tirer UNE proposition, et ce doit etre
  // la plus avancee de la boite - sinon l'ordre d'arrivee des courriels
  // deciderait de l'etat de la candidature.
  const all = scanInbox(CASES.map(c => c[1]), APPLICATIONS);

  // AUCUNE PROPOSITION NE PEUT NAITRE D'UN MESSAGE SANS RAPPORT
  //
  // La lettre d'information et le message d'une entreprise non suivie
  // n'apparaissent nulle part dans le resultat. C'est la garantie de bout en
  // bout : peu importe comment le rapprochement les a traites, rien n'est
  // propose a l'utilisateur.
  for (const dead of ["m8", "m11"]) {
    if (all.some(r => r.message.id === dead)) {
      failures.push(`le message ${dead}, sans rapport avec une candidature, produit une proposition`);
    }
  }
  const monzo = all.filter(r => r.applicationId === 2);
  if (monzo.length !== 1) {
    failures.push(`quatre messages Monzo donnent ${monzo.length} lignes, attendu 1`);
  } else if (monzo[0].outcome !== "rejected") {
    failures.push(`Monzo : le refus doit primer sur l'invitation, obtenu "${monzo[0].outcome}"`);
  }

  // UNE CANDIDATURE NE RECULE JAMAIS
  //
  // Un accuse de reception arrive apres un entretien ne doit pas ramener le
  // dossier a "envoyee" : c'est ainsi qu'on perd la trace d'un rendez-vous
  // deja pris.
  if (proposedStatus("interview", { outcome: "ack" }) !== null) {
    failures.push("un accuse de reception fait reculer une candidature en entretien");
  }
  if (proposedStatus("offer", { outcome: "interview", phone: false }) !== null) {
    failures.push("une invitation fait reculer une candidature qui a deja une offre");
  }
  // Le refus, lui, peut arriver a n'importe quelle etape.
  if (proposedStatus("offer", { outcome: "rejected" }) !== "rejected") {
    failures.push("un refus apres une offre n'est pas pris en compte");
  }

  // LA REQUETE NE PART JAMAIS SANS FILTRE
  //
  // Sans candidature suivie, il n'y a rien a chercher, et une requete vide
  // rapporterait la boite entiere. C'est la difference entre un outil qui
  // consulte quelques fils et un outil qui aspire le courrier.
  if (buildQuery([]) !== "") {
    failures.push("sans candidature, la requete n'est pas vide");
  }
  const q = buildQuery(APPLICATIONS);
  if (!q.includes("newer_than:") || !q.includes('"doctolib"') || !q.includes('"bnp paribas"')) {
    failures.push(`la requete ne borne pas la recherche : ${q}`);
  }
  if (!q.includes("-in:spam") || !q.includes("-in:trash")) {
    failures.push("la requete ne met pas de cote le spam et la corbeille");
  }

  // L'expediteur doit se lire sous ses trois formes courantes.
  for (const [raw, domain] of [
    ['"Doctolib Recrutement" <rh@doctolib.com>', "doctolib.com"],
    ["Sophie Bernard <sophie@alan.com>", "alan.com"],
    ["rh@acme.fr", "acme.fr"],
  ]) {
    if (parseFrom(raw).domain !== domain) {
      failures.push(`expediteur mal lu : ${raw} -> ${parseFrom(raw).domain}`);
    }
  }

  if (!failures.length) {
    const decided = CASES.filter(c => c[3] && c[3] !== "unrelated").length;
    console.log(`      ${CASES.length} messages reels lus, ${decided} classes,`
      + ` ${all.filter(r => r.proposedStatus).length} changements proposes ;`
      + " un refus poli reste un refus, une lettre d'information ne touche a rien");
  }
  return failures;
}
