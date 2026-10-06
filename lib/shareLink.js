// THE DOOR NOBODY WAS POINTED AT
//
// `app/[...cible]/page.jsx` has worked since the day it shipped:
//
//     thenuvi.com/https://job-boards.greenhouse.io/acme/jobs/4012
//
// opens the app with that ad already read. Its own header says "the link is
// shareable: a friend who sends you a job can send you the Nuvi link
// instead". Nothing in the product has ever produced one. The growth loop was
// a door with no handle on the inside: it could only be used by somebody who
// already knew the trick, which is nobody.
//
// WHY THIS IS THE LOOP AND NOT AN AD
//
// The competitor grows by search pages, 73 of them, all under /remote/. That
// needs Google's permission and a year. This needs one person to send one
// job to one friend, which happens anyway, every day, in every group chat.
// The only thing missing was a link worth sending instead of the raw one, and
// the recipient arrives at a tool that has already read the ad rather than at
// a home page asking them to sign up.
//
// WHAT IT REFUSES, AND WHY THAT MATTERS HERE
//
// The door makes the server fetch an address a stranger chose, so the route
// refuses anything private, by name and by resolved address, at every
// redirect. A share link to `localhost` would be refused there anyway, so
// building one here only produces a link that dies on the other person's
// screen. Refusing it at the point the link is made is the same rule applied
// one step earlier, and the button then simply does not appear: a control
// that makes a broken link is worse than no control.

import { adressePriveeOuInterdite } from "./annonceEnLigne.js";

// The product's own address, as the person's browser knows it. Passed in
// rather than hard coded: a link built on a preview deployment has to open
// that deployment, and a link built in the test harness must not send anyone
// to production.
export function shareLink(jobUrl, origin) {
  const raw = String(jobUrl || "").trim();
  if (!raw) return null;

  let target;
  try {
    target = new URL(raw);
  } catch {
    return null;
  }
  // Only a page a browser can open. A `mailto:` or a `javascript:` address is
  // not a job posting, and the door would not know what to do with it.
  if (target.protocol !== "http:" && target.protocol !== "https:") return null;
  if (adressePriveeOuInterdite(target.hostname)) return null;

  const base = String(origin || "").trim().replace(/\/+$/, "");
  if (!base) return null;
  let home;
  try {
    home = new URL(base);
  } catch {
    return null;
  }
  // A link to the ad already on Nuvi's own host is a loop back to this page,
  // not a door to anywhere.
  if (home.hostname === target.hostname) return null;

  // The address goes on whole, exactly as the door reassembles it. The door
  // already copes with a browser collapsing the double slash and with a link
  // somebody pasted already encoded, so encoding it again here would hand it
  // a string it has to undo.
  return base + "/" + target.href;
}
