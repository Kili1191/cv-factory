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

// WHAT IS NEVER TOUCHED, WHATEVER IT IS CALLED
//
// A password, a national insurance number, a date of birth, anything about
// money or a decision the person has to make themselves. Guessing at any
// of these is how an application goes out with a wrong answer in it.
const JAMAIS = /(password|passe|national[\s_-]*insurance|\bnino\b|social[\s_-]*security|\bssn\b|birth|naissance|salary|salaire|expected[\s_-]*pay|notice[\s_-]*period|sponsor|visa|right[\s_-]*to[\s_-]*work|disab|gender|ethnic|race|veteran|cover[\s_-]*letter|lettre|why[\s_-]*do[\s_-]*you|search|recherche|coupon|promo|referral[\s_-]*code)/i;

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
  for (const [cle, motif] of REGLES) {
    if (motif.test(mots)) return cle;
  }
  return null;
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

// Fills what it recognises and leaves everything else alone. A box the
// person already filled is never overwritten: their answer beats ours.
export function remplirLeDocument(doc, profil, marquer = true) {
  const remplis = [];
  const boites = doc.querySelectorAll("input, textarea");
  for (const el of boites) {
    if (el.disabled || el.readOnly) continue;
    if (String(el.value || "").trim()) continue;
    const cle = champPour(decrire(el, doc));
    if (!cle) continue;
    const valeur = profil && profil[cle];
    if (!valeur) continue;
    ecrire(el, valeur);
    if (marquer) {
      el.setAttribute("data-nuvi-rempli", cle);
      try { el.style.outline = "2px solid #5b3df5"; el.style.outlineOffset = "1px"; } catch { /* styles refused */ }
    }
    remplis.push(cle);
  }
  return remplis;
}
