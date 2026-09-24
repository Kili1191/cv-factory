// What happened to the CVs that went out is counted, and counted honestly.
//
// Nuvi measures one thing before a CV leaves: how much of the ad's wording it
// carries. That is a proxy for a machine's behaviour. The number that settles
// the promise on the front page is the one nothing counted: of the CVs
// actually sent, how many got a human to answer.
//
// Every piece was already stored, and nothing joined them up. This suite is
// about the joining being honest, because the failure mode here is not a
// crash: it is a number that looks like evidence and is not. Three replies
// out of four is not a 75% reply rate. A layout with two applications behind
// it is not better than one with thirty.

import {
  reponses, ceQuiEstCompte, ASSEZ_POUR_UN_TAUX,
} from "../lib/reponses.js";

// Builds n applications with a status, and optionally a layout.
function lot(n, status, gabarit) {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1, company: "C" + i, role: "R", offer: "an ad", status,
    ...(gabarit ? { gabarit } : {}),
  }));
}

export async function run() {
  const failures = [];

  // --- 1. Prepared is not sent -------------------------------------------
  //
  // A "prepared" row exists because an ad was read. Counting it would divide
  // by the ads someone browsed instead of the jobs they applied for, which
  // makes every rate look worse the more the product is used.
  {
    const r = reponses([...lot(12, "prepared"), ...lot(11, "applied")]);
    if (r.envoyees !== 11) {
      failures.push("sent counted " + r.envoyees + " instead of 11: reading an ad is not applying for it");
    }
  }

  // --- 2. A rejection is a reply -----------------------------------------
  //
  // The promise is that the document reaches a person. A rejection proves it
  // did. Counting it as a failure would measure whether the candidate suits
  // the job, which Nuvi never claimed to change.
  {
    const r = reponses([...lot(6, "rejected"), ...lot(6, "ghosted")]);
    if (r.repondues !== 6) {
      failures.push("replies counted " + r.repondues + " instead of 6: a rejection is a human answering");
    }
    if (r.avancees !== 0) {
      failures.push("a rejection moved the advance count: it is a reply, not an advance");
    }
    if (r.taux !== 50) failures.push("reply rate came out " + r.taux + " instead of 50");
  }

  // --- 3. Replies and advances never merge --------------------------------
  {
    const r = reponses([...lot(4, "interview"), ...lot(4, "rejected"), ...lot(4, "ghosted")]);
    if (r.repondues !== 8) failures.push("replies " + r.repondues + " instead of 8");
    if (r.avancees !== 4) failures.push("advances " + r.avancees + " instead of 4");
    if (r.taux === r.tauxAvance) {
      failures.push("the reply rate and the advance rate came out identical on data where they differ");
    }
  }

  // --- 4. No percentage under the threshold -------------------------------
  //
  // THE FAILURE THIS PREVENTS
  //
  // Three replies out of four is not a 75% reply rate, it is four
  // applications. Showing 75% invites someone to rewrite their CV because of
  // two events. lib/atsMatch.js settled the same argument for the match
  // score, with the same reason: a share of nothing is nothing.
  {
    const r = reponses([...lot(3, "interview"), ...lot(1, "ghosted")]);
    if (r.taux !== null) {
      failures.push(
        "a rate of " + r.taux + " was shown on 4 applications. Under "
        + ASSEZ_POUR_UN_TAUX + " the counts must stand alone."
      );
    }
    if (r.repondues !== 3 || r.envoyees !== 4) {
      failures.push("the counts must still be exact under the threshold");
    }
  }
  {
    // And exactly at the threshold it appears, so the rule has a real edge
    // rather than drifting with the data.
    const r = reponses(lot(ASSEZ_POUR_UN_TAUX, "interview"));
    if (r.taux !== 100) {
      failures.push("at exactly " + ASSEZ_POUR_UN_TAUX + " sent the rate must appear, got " + r.taux);
    }
  }

  // --- 5. A layout is compared by the same rule as the total --------------
  {
    const r = reponses([
      ...lot(12, "interview", "classic"),
      ...lot(8, "ghosted", "classic"),
      ...lot(15, "ghosted", "sidebar"),
    ]);
    const classic = r.parGabarit.find((g) => g.gabarit === "classic");
    const sidebar = r.parGabarit.find((g) => g.gabarit === "sidebar");
    if (!classic || !sidebar) {
      failures.push("both layouts must appear once each has been sent");
    } else {
      if (classic.taux !== 60) failures.push("classic came out at " + classic.taux + " instead of 60");
      if (sidebar.taux !== 0) failures.push("sidebar came out at " + sidebar.taux + " instead of 0");
      // The one with the most evidence leads, so the eye does not land on a
      // layout that happens to sort first alphabetically.
      // classic: 12 + 8 = 20 sent. sidebar: 15. classic leads.
      if (r.parGabarit[0].gabarit !== "classic") {
        failures.push("the layout with the most applications behind it must be listed first");
      }
    }
  }

  // --- 6. A layout with too little behind it shows no rate ----------------
  //
  // This is the one that would actually mislead: two applications on a layout
  // showing 100% next to thirty on another showing 40% reads as a verdict,
  // and it is noise.
  {
    const r = reponses([
      ...lot(2, "interview", "swiss"),
      ...lot(30, "ghosted", "classic"),
    ]);
    const swiss = r.parGabarit.find((g) => g.gabarit === "swiss");
    if (!swiss) failures.push("the layout is missing from the breakdown");
    else if (swiss.taux !== null) {
      failures.push(
        "a layout with 2 applications behind it showed " + swiss.taux + "%. "
        + "Beside a layout with 30, that reads as a verdict and it is noise."
      );
    }
  }

  // --- 7. Rows from before the layout was recorded are left out -----------
  //
  // Not bucketed as "unknown": a bucket looks like a layout and would be
  // compared against real ones.
  {
    const r = reponses([...lot(20, "interview"), ...lot(12, "ghosted", "classic")]);
    if (r.parGabarit.length !== 1 || r.parGabarit[0].gabarit !== "classic") {
      failures.push("rows with no layout recorded must not become a layout of their own");
    }
    if (r.envoyees !== 32) failures.push("they must still count in the total: got " + r.envoyees);
  }

  // --- 8. Waiting is reported, because it changes what a low rate means ---
  {
    const r = reponses([...lot(10, "applied"), ...lot(10, "rejected")]);
    if (r.enAttente !== 10) {
      failures.push("still waiting counted " + r.enAttente + " instead of 10");
    }
  }

  // --- 9. Nothing at all does not throw and shows no rate -----------------
  {
    for (const vide of [[], null, undefined, [null, undefined]]) {
      const r = reponses(vide);
      if (r.envoyees !== 0 || r.taux !== null || r.parGabarit.length !== 0) {
        failures.push("an empty tracker must produce zeroes and no rate");
      }
    }
  }

  // --- 10. The number says what it counted --------------------------------
  //
  // The match score carries a line saying what it counted, because a score
  // nobody can explain is a score nobody should act on. This one is built
  // from statuses a person set by hand, so it has to say out loud that a
  // rejection was treated as a reply.
  for (const [langue, motif] of [["en", /rejection counts as a reply/i], ["fr", /refus compte comme une reponse/i]]) {
    if (!motif.test(ceQuiEstCompte(langue))) {
      failures.push("the line under the number does not say what it counted, in " + langue);
    }
  }

  return failures;
}
