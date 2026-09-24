// WHAT ACTUALLY HAPPENED TO THE CVS THAT WENT OUT
//
// Nuvi measures one thing about a CV before it leaves: how much of the ad's
// wording it carries. That is a proxy, and it is the honest kind, but it is
// still a guess about a machine's behaviour. The only number that settles the
// promise on the front page is the one nothing here has ever counted: of the
// CVs actually sent, how many got a human to answer.
//
// Every piece was already stored. A tracked application keeps the ad, the
// company, the status, and since the tracker learned to hand a CV back, the
// CV as it left. Gmail moves the status by itself when a recruiter replies.
// Nothing joined them up.
//
// WHY THE DISTINCTION BETWEEN A REPLY AND AN ADVANCE
//
// A rejection is a reply. It means a person read the thing, which is exactly
// what the ATS promise is about: the CV was not filtered out before a human
// saw it. Counting rejections as failures would measure whether the candidate
// is a good fit for the job, which Nuvi does not claim to change. Counting
// them as replies measures whether the document got through, which is what it
// does claim.
//
// So two numbers, never merged: replies, and of those, the ones that moved
// forward.

// Sent means it left. "prepared" is a row that exists because an ad was read,
// and nothing was sent yet: counting it would quietly divide by the ads the
// person browsed rather than the jobs they applied for.
const ENVOYEES = ["applied", "phone", "interview", "offer", "accepted", "rejected", "ghosted"];

// A human answered. Rejections belong here: see above.
const REPONDUES = ["phone", "interview", "offer", "accepted", "rejected"];

// It went further than an answer.
const AVANCEES = ["phone", "interview", "offer", "accepted"];

// UNDER THIS, NO PERCENTAGE
//
// lib/atsMatch.js already settled this argument for the match score, with the
// reason written next to it: a share of nothing is nothing. Three replies out
// of four applications is not a 75% reply rate, it is four applications, and
// showing 75% invites someone to change their CV because of two events. The
// counts are always shown; the rate waits until it means something.
export const ASSEZ_POUR_UN_TAUX = 10;

function estUn(liste, statut) {
  return liste.indexOf(String(statut || "").toLowerCase()) !== -1;
}

function part(combien, sur) {
  if (sur < ASSEZ_POUR_UN_TAUX) return null;
  return Math.round((combien / sur) * 100);
}

// One group of applications, counted. Used for the whole list and for each
// layout, so a layout can never be counted by a different rule than the total.
function compter(candidatures) {
  const envoyees = candidatures.filter((a) => estUn(ENVOYEES, a && a.status));
  const repondues = envoyees.filter((a) => estUn(REPONDUES, a.status));
  const avancees = envoyees.filter((a) => estUn(AVANCEES, a.status));
  // Still at "applied": nobody has answered yet, and it may still come. Shown
  // beside the rate because a low rate over many recent applications means
  // something different from a low rate over old ones.
  const enAttente = envoyees.filter((a) => String(a.status).toLowerCase() === "applied");
  return {
    envoyees: envoyees.length,
    repondues: repondues.length,
    avancees: avancees.length,
    enAttente: enAttente.length,
    taux: part(repondues.length, envoyees.length),
    tauxAvance: part(avancees.length, envoyees.length),
  };
}

// The layout a CV was sent with. Rows created before the tracker started
// recording it have none, and they are kept out of the comparison rather than
// lumped into a bucket called "unknown" that would look like a layout and be
// compared against real ones.
function gabaritDe(a) {
  const g = a && a.gabarit;
  return typeof g === "string" && g ? g : null;
}

export function reponses(candidatures) {
  const liste = Array.isArray(candidatures) ? candidatures.filter(Boolean) : [];
  const total = compter(liste);

  const parGabarit = [];
  const vus = [];
  for (const a of liste) {
    const g = gabaritDe(a);
    if (g && vus.indexOf(g) === -1) vus.push(g);
  }
  for (const g of vus) {
    const c = compter(liste.filter((a) => gabaritDe(a) === g));
    if (c.envoyees > 0) parGabarit.push({ gabarit: g, ...c });
  }
  // Most sent first: the layout with the most evidence behind it leads.
  parGabarit.sort((x, y) => y.envoyees - x.envoyees);

  return { ...total, parGabarit };
}

// THE SENTENCE UNDER THE NUMBER
//
// The match score carries a line saying what it counted, because a score
// nobody can explain is a score nobody should act on. The same applies here,
// and more so: this one is built from statuses the person set by hand or that
// Gmail moved, so it has to say out loud what it treated as an answer.
export function ceQuiEstCompte(locale) {
  return locale === "en"
    ? "Sent means it left: anything still being prepared is not counted. "
      + "A rejection counts as a reply, because a person read it, which is what "
      + "getting past the sorting software means."
    : "Envoyee veut dire partie : ce qui est encore en preparation n'est pas "
      + "compte. Un refus compte comme une reponse, parce qu'une personne l'a "
      + "lu, et c'est ce que veut dire passer le logiciel de tri.";
}
