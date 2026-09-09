// FILLING THE FORM IS WHERE THE TIME GOES
//
// Applying to a hundred jobs is not a hundred hard decisions, it is the
// same twenty boxes typed a hundred times: first name, last name, email,
// phone, city, LinkedIn. The tools that promise "apply to fifty at once"
// are extensions doing exactly this inside the person's own browser, which
// is also why the job boards cannot block them: the browser is the person.
//
// Two rules hold the whole thing up.
//
// It fills, it never sends. The person reads what is there and presses the
// button themselves. A machine that submits on someone's behalf is how you
// end up in a video an HR department is laughing at, and it is against the
// terms of the big boards.
//
// It only writes what the person already told us, and only into a box
// whose meaning is unambiguous. A wrong value in a form is worse than an
// empty one: an empty box gets filled, a wrong one gets sent.

// What the CV already knows, in the shape a form asks for it.
export function profilDepuisLeCv(cv) {
  const c = cv || {};
  const nomComplet = String(c.name || "").trim();
  const morceaux = nomComplet.split(/\s+/).filter(Boolean);
  const liens = [c.linkedin, c.website, c.site, c.portfolio, c.url]
    .map((x) => String(x || "").trim()).filter(Boolean);
  const linkedin = liens.find((l) => /linkedin\./i.test(l)) || "";
  const site = liens.find((l) => l !== linkedin) || "";
  const lieu = String(c.location || "").trim();
  return {
    nomComplet,
    prenom: morceaux.length > 1 ? morceaux[0] : nomComplet,
    nom: morceaux.length > 1 ? morceaux.slice(1).join(" ") : "",
    email: String(c.email || "").trim(),
    telephone: String(c.phone || "").trim(),
    ville: lieu.split(",")[0].trim(),
    lieu,
    linkedin,
    site,
  };
}

// The CV knows a name and an email. It does not know a notice period, so
// the answers the person gave once in Settings travel beside it.
export function profilComplet(cv, reponses) {
  const r = reponses && typeof reponses === "object" ? reponses : {};
  const propre = {};
  for (const cle of ["droitDeTravailler", "sponsor", "preavis", "salaire", "mobilite", "permis"]) {
    const v = String(r[cle] || "").trim();
    if (v) propre[cle] = v;
  }
  return { ...profilDepuisLeCv(cv), ...propre };
}

// WHAT A BOX IS CALLED, IN EVERY DIALECT
//
// The order matters: the longer, more specific names are tested first, so
// that "first name" never falls through to the rule for "name".
const REGLES = [
  ["prenom", /(^|[^a-z])(first[\s_-]*name|given[\s_-]*name|forename|prenom|first)([^a-z]|$)/i],
  ["nom", /(^|[^a-z])(last[\s_-]*name|family[\s_-]*name|surname|nom[\s_-]*de[\s_-]*famille|lastname)([^a-z]|$)/i],
  ["email", /(e[\s_-]*mail|courriel)/i],
  ["telephone", /(phone|mobile|telephone|tel\b|contact[\s_-]*number)/i],
  ["linkedin", /linked[\s_-]*in/i],
  ["site", /(portfolio|personal[\s_-]*(web)?site|website|github|web[\s_-]*address)/i],
  ["ville", /(^|[^a-z])(city|town|ville|address[\s_-]*level[\s_-]*2)([^a-z]|$)/i],
  ["lieu", /(^|[^a-z])(location|where[\s_-]*are[\s_-]*you[\s_-]*based|current[\s_-]*location)([^a-z]|$)/i],
  ["nomComplet", /(^|[^a-z])(full[\s_-]*name|your[\s_-]*name|name)([^a-z]|$)/i],
];

// THE QUESTIONS EVERY FORM ASKS, ANSWERED ONCE
//
// Right to work, notice period, salary expectation, sponsorship. These are
// the boxes that actually eat the twenty minutes, because they are asked
// on every single application and the answer never changes. Nuvi does not
// guess at any of them: the person answers once, in Settings, and the
// extension repeats their words. An unanswered question stays empty.
const REPONSES = [
  // Sponsorship is tested before the right to work, because "will you
  // require sponsorship to work in the UK" contains both, and answering it
  // with the wrong one inverts the meaning.
  ["sponsor", /(require|need|request).{0,30}(sponsor|visa)|sponsor(ship)?[\s_-]*(required|needed)/i],
  ["droitDeTravailler", /(right[\s_-]*to[\s_-]*work|authoris(ed|ation)[\s_-]*to[\s_-]*work|legally[\s_-]*(able|entitled)[\s_-]*to[\s_-]*work|eligible[\s_-]*to[\s_-]*work|work[\s_-]*permit)/i],
  ["preavis", /(notice[\s_-]*period|when[\s_-]*(can|could)[\s_-]*you[\s_-]*start|availability|available[\s_-]*from|start[\s_-]*date|preavis)/i],
  ["salaire", /(salary|expected[\s_-]*(pay|salary)|salary[\s_-]*expectation|remuneration|desired[\s_-]*pay|pretentions)/i],
  ["mobilite", /(relocat|willing[\s_-]*to[\s_-]*move|open[\s_-]*to[\s_-]*relocation)/i],
  ["permis", /(driving[\s_-]*licen[cs]e|driver'?s[\s_-]*licen[cs]e|permis[\s_-]*de[\s_-]*conduire)/i],
];

// WHAT IS NEVER TOUCHED, WHATEVER IT IS CALLED
//
// A password, a national insurance number, a date of birth, the diversity
// questions, and anything the person has to write themselves. There is no
// answer we could store that would make guessing at these right.
const JAMAIS = /(password|passe|national[\s_-]*insurance|\bnino\b|social[\s_-]*security|\bssn\b|birth|naissance|disab|gender|ethnic|\brace\b|veteran|sexual|religion|criminal|conviction|cover[\s_-]*letter|lettre|why[\s_-]*do[\s_-]*you|tell[\s_-]*us[\s_-]*(about|why)|search|recherche|coupon|promo|referral[\s_-]*code)/i;

const TYPES_ECRIVABLES = new Set(["text", "email", "tel", "url", "search", ""]);

// The autocomplete attribute is a declaration by the page itself, so it
// beats every guess made from a label.
const PAR_AUTOCOMPLETE = {
  "given-name": "prenom",
  "family-name": "nom",
  name: "nomComplet",
  email: "email",
  tel: "telephone",
  "tel-national": "telephone",
  url: "site",
  "address-level2": "ville",
};

export function champPour(descripteur) {
  const d = descripteur || {};
  if (d.type === "password" || d.type === "hidden" || d.type === "file") return null;
  if (!TYPES_ECRIVABLES.has(String(d.type || "").toLowerCase())) return null;
  const auto = String(d.autocomplete || "").toLowerCase().trim();
  const mots = [d.label, d.name, d.id, d.placeholder, d.ariaLabel].filter(Boolean).join(" ");
  if (JAMAIS.test(mots)) return null;
  if (PAR_AUTOCOMPLETE[auto]) return PAR_AUTOCOMPLETE[auto];
  if (!mots.trim()) return null;
  // The repeated questions first: "when can you start" is a question about
  // a date, and the rule for a name must never see it.
  for (const [cle, motif] of REPONSES) {
    if (motif.test(mots)) return cle;
  }
  for (const [cle, motif] of REGLES) {
    if (motif.test(mots)) return cle;
  }
  return null;
}

// A question with two answers is a dropdown or a pair of buttons more often
// than a box, so yes and no have to be recognised as the page spells them.
const OUI = /^\s*(yes|oui|y|true|i (do|am|have))\b/i;
const NON = /^\s*(no|non|n|false|i (do not|don't|am not))\b/i;

export function optionPour(textes, valeur) {
  const v = String(valeur || "").trim();
  if (!v) return -1;
  const cible = OUI.test(v) ? OUI : NON.test(v) ? NON : null;
  const liste = textes.map((t) => String(t || "").trim());
  if (cible) {
    const i = liste.findIndex((t) => cible.test(t));
    if (i >= 0) return i;
    return -1;
  }
  // Free text, a notice period or a start date: the option that says the
  // same thing, then the one that contains it.
  const exact = liste.findIndex((t) => t.toLowerCase() === v.toLowerCase());
  if (exact >= 0) return exact;
  const contient = liste.findIndex((t) => t && v.toLowerCase().includes(t.toLowerCase()));
  return contient;
}

// React and its kind listen for events, and setting .value by hand does
// not produce one: the box shows the text and the form still thinks it is
// empty. Going through the prototype's setter and then dispatching is what
// makes the value real to the page.
function ecrire(el, valeur) {
  const proto = el instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value");
  if (setter && setter.set) setter.set.call(el, valeur);
  else el.value = valeur;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function libelleDe(el, doc) {
  const parId = el.id ? doc.querySelector('label[for="' + CSS.escape(el.id) + '"]') : null;
  if (parId) return parId.textContent || "";
  const parent = el.closest("label");
  if (parent) return parent.textContent || "";
  // Many boards put the question in a div above the box rather than a label.
  const bloc = el.closest("div,fieldset,li,section");
  if (bloc) {
    const t = (bloc.textContent || "").trim();
    if (t.length < 160) return t;
  }
  return "";
}

export function decrire(el, doc) {
  return {
    type: (el.getAttribute("type") || (el.tagName === "TEXTAREA" ? "text" : "text")).toLowerCase(),
    name: el.getAttribute("name") || "",
    id: el.id || "",
    placeholder: el.getAttribute("placeholder") || "",
    ariaLabel: el.getAttribute("aria-label") || "",
    autocomplete: el.getAttribute("autocomplete") || "",
    label: libelleDe(el, doc),
  };
}

function marquerLe(el, cle) {
  el.setAttribute("data-nuvi-rempli", cle);
  try { el.style.outline = "2px solid #5b3df5"; el.style.outlineOffset = "1px"; } catch { /* styles refused */ }
}

// Fills what it recognises and leaves everything else alone. A box the
// person already filled is never overwritten: their answer beats ours.
export function remplirLeDocument(doc, profil, marquer = true) {
  const remplis = [];
  const vus = new Set();

  for (const el of doc.querySelectorAll("input, textarea")) {
    if (el.disabled || el.readOnly) continue;
    const type = String(el.getAttribute("type") || "").toLowerCase();

    // A pair of buttons is one question: it is read from the group's own
    // wording, not from the label of the button, which only says "Yes".
    if (type === "radio") {
      const nom = el.getAttribute("name") || "";
      if (!nom || vus.has("radio:" + nom)) continue;
      const groupe = [...doc.querySelectorAll('input[type="radio"][name="' + CSS.escape(nom) + '"]')];
      if (groupe.some((r) => r.checked)) { vus.add("radio:" + nom); continue; }
      const enveloppe = el.closest("fieldset,div,li,section");
      const question = enveloppe ? (enveloppe.querySelector("legend,label,p,span") || {}).textContent || "" : "";
      const cle = champPour({ type: "text", name: nom, label: question });
      const valeur = cle && profil && profil[cle];
      if (!valeur) { vus.add("radio:" + nom); continue; }
      const i = optionPour(groupe.map((r) => libelleDe(r, doc) || r.value), valeur);
      if (i >= 0) {
        groupe[i].checked = true;
        groupe[i].dispatchEvent(new Event("change", { bubbles: true }));
        if (marquer) marquerLe(groupe[i], cle);
        remplis.push(cle);
      }
      vus.add("radio:" + nom);
      continue;
    }

    if (String(el.value || "").trim()) continue;
    const cle = champPour(decrire(el, doc));
    if (!cle) continue;
    const valeur = profil && profil[cle];
    if (!valeur) continue;
    ecrire(el, valeur);
    if (marquer) marquerLe(el, cle);
    remplis.push(cle);
  }

  for (const el of doc.querySelectorAll("select")) {
    if (el.disabled || el.selectedIndex > 0) continue;
    const cle = champPour({ ...decrire(el, doc), type: "text" });
    const valeur = cle && profil && profil[cle];
    if (!valeur) continue;
    const options = [...el.options];
    const i = optionPour(options.map((o) => o.textContent), valeur);
    if (i < 0) continue;
    el.value = options[i].value;
    el.dispatchEvent(new Event("change", { bubbles: true }));
    if (marquer) marquerLe(el, cle);
    remplis.push(cle);
  }

  return remplis;
}
