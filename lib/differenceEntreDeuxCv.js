// What changed between two CVs, field by field, in words a person reads.
//
// WHY THIS EXISTS
//
// When Nuvi moves something in the CV on the candidate's word ("it is not a
// school, it is a training I did at the company"), the candidate must see
// the work: what left which field, what arrived where. A panel that closes
// with a shorter list looks like a panel that did nothing, and a change one
// cannot see is a change one cannot refuse. The same shape as the fixer's
// list ({ou, avant, apres}) so the screen has one way to show a change.

const TXT = {
  fr: {
    exp: (i) => "experience " + i, edu: (i) => "formation " + i,
    title: "intitule", company: "employeur", period: "periode", location: "lieu",
    bullet: (j) => "ligne " + j, degree: "diplome", school: "etablissement",
    skill: (i) => "competence " + i, cert: (i) => "certification " + i,
    lang: (i) => "langue " + i,
    name: "nom", headline: "intitule du CV", summary: "accroche",
    email: "email", phone: "telephone", loc: "lieu", linkedin: "LinkedIn",
    entry: (i) => "poste " + i, eduEntry: (i) => "formation " + i,
  },
  en: {
    exp: (i) => "job " + i, edu: (i) => "education " + i,
    title: "title", company: "employer", period: "period", location: "location",
    bullet: (j) => "line " + j, degree: "degree", school: "school",
    skill: (i) => "skill " + i, cert: (i) => "certification " + i,
    lang: (i) => "language " + i,
    name: "name", headline: "CV headline", summary: "summary",
    email: "email", phone: "phone", loc: "location", linkedin: "LinkedIn",
    entry: (i) => "job " + i, eduEntry: (i) => "education " + i,
  },
};

const texte = (v) => String(v == null ? "" : v).trim();
const liste = (v) => (Array.isArray(v) ? v : []);

export function differenceEntreDeuxCv(avant, apres, locale = "fr") {
  const L = TXT[locale] || TXT.fr;
  const a = avant && typeof avant === "object" ? avant : {};
  const b = apres && typeof apres === "object" ? apres : {};
  const out = [];
  const champ = (ou, x, y) => {
    const s = texte(x), t = texte(y);
    if (s !== t) out.push({ ou, avant: s, apres: t });
  };

  champ(L.name, a.name, b.name);
  champ(L.headline, a.title, b.title);
  champ(L.summary, a.summary, b.summary);
  champ(L.email, a.email, b.email);
  champ(L.phone, a.phone, b.phone);
  champ(L.loc, a.location, b.location);
  champ(L.linkedin, a.linkedin, b.linkedin);

  const ea = liste(a.experience), eb = liste(b.experience);
  for (let i = 0; i < Math.max(ea.length, eb.length); i += 1) {
    const x = ea[i], y = eb[i], ou = L.exp(i + 1);
    if (!x || !y) {
      // A whole job appeared or vanished: one line says so, not five.
      const e = x || y;
      const resume = [texte(e.title), texte(e.company)].filter(Boolean).join(", ");
      out.push({ ou: L.entry(i + 1), avant: x ? resume : "", apres: y ? resume : "" });
      continue;
    }
    champ(ou + ", " + L.title, x.title, y.title);
    champ(ou + ", " + L.company, x.company, y.company);
    champ(ou + ", " + L.period, x.period, y.period);
    champ(ou + ", " + L.location, x.location, y.location);
    const pa = liste(x.bullets), pb = liste(y.bullets);
    for (let j = 0; j < Math.max(pa.length, pb.length); j += 1) {
      champ(ou + ", " + L.bullet(j + 1), pa[j], pb[j]);
    }
  }

  const da = liste(a.education), db = liste(b.education);
  for (let i = 0; i < Math.max(da.length, db.length); i += 1) {
    const x = da[i], y = db[i], ou = L.edu(i + 1);
    if (!x || !y) {
      const e = x || y;
      const resume = [texte(e.degree), texte(e.school)].filter(Boolean).join(", ");
      out.push({ ou: L.eduEntry(i + 1), avant: x ? resume : "", apres: y ? resume : "" });
      continue;
    }
    champ(ou + ", " + L.degree, x.degree, y.degree);
    champ(ou + ", " + L.school, x.school, y.school);
    champ(ou + ", " + L.period, x.period, y.period);
  }

  const sa = liste(a.skills), sb = liste(b.skills);
  for (let i = 0; i < Math.max(sa.length, sb.length); i += 1) champ(L.skill(i + 1), sa[i], sb[i]);
  const ca = liste(a.certifications), cb = liste(b.certifications);
  for (let i = 0; i < Math.max(ca.length, cb.length); i += 1) champ(L.cert(i + 1), ca[i], cb[i]);
  const la = liste(a.languages), lb = liste(b.languages);
  for (let i = 0; i < Math.max(la.length, lb.length); i += 1) {
    const x = la[i] || {}, y = lb[i] || {};
    champ(L.lang(i + 1), [texte(x.lang), texte(x.level)].filter(Boolean).join(" "),
      [texte(y.lang), texte(y.level)].filter(Boolean).join(" "));
  }
  return out;
}
