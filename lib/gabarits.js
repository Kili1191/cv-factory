// THE SIX LAYOUTS, THEIR NAMES, AND THE CV THAT PREVIEWS THEM
//
// These lived at the top of the root component. The front page now shows
// the same six previews as the app's appearance picker, with the same
// names and the same sample CV, so a visitor who opens the app finds what
// the site showed. One definition, imported by both.

export const LAYOUTS = ["sidebar","classic","timeline","swiss","compact","ats"];

// Metadata pour chaque layout (label affiche + description courte)
// LES GABARITS, DECRITS POUR CEUX QUI VONT S EN SERVIR
//
// Les descriptions disaient "Conseil, Direction", "Design, Tech", "Junior".
// Nuvi est ecrit pour les services, les tournees et les plannings : personne
// dans ce public ne se reconnait dans ces mots, et le seul effet d'une
// etiquette qui ne vous vise pas est de vous faire croire que l'outil non
// plus. Elles disent maintenant a quoi sert la forme, pas quel cadre la
// porte. Et elles existent dans les deux langues, parce que ce choix se pose
// desormais des le debut, a quelqu'un qui vient de choisir sa langue.
export const LAYOUT_META = {
  fr: {
    sidebar:  { label: "Colonne",   desc: "Une bande a gauche pour le contact et les competences" },
    classic:  { label: "Classique", desc: "Une seule colonne, simple et lisible partout" },
    timeline: { label: "Parcours",  desc: "Met en avant l'ordre des postes" },
    swiss:    { label: "Epure",     desc: "Beaucoup de blanc, tres peu de decor" },
    compact:  { label: "Compact",   desc: "Tout tient sur une page" },
    ats:      { label: "Anti-robot",desc: "La forme la plus surement lue par les logiciels de tri" },
  },
  en: {
    sidebar:  { label: "Column",    desc: "A band on the left for contact and skills" },
    classic:  { label: "Classic",   desc: "One column, plain and readable anywhere" },
    timeline: { label: "Track",     desc: "Puts the order of your jobs up front" },
    swiss:    { label: "Clean",     desc: "Lots of white space, almost no decoration" },
    compact:  { label: "Compact",   desc: "Everything fits on one page" },
    ats:      { label: "Robot-safe",desc: "The shape tracking software reads most reliably" },
  },
};
export function metaGabarit(locale) {
  return LAYOUT_META[locale === "en" ? "en" : "fr"];
}


// Vrai apercu CV : on rend le composant CV en taille reduite (scale 0.18)
// pour avoir un preview realiste qui reflete le vrai rendu.
//
// THE SAMPLE CV EXISTS IN BOTH LANGUAGES, AND IT DID NOT
//
// This CV is what fills the six template previews: the gallery on the shop
// window, and the appearance picker inside the app. The labels around it
// (Profile, Education, Skills) were translated long ago, in ApercuGabarit.
// The CV itself was not, so an English visitor judged the product on six
// French documents: "Reduction du churn de 18% en 6 mois", "Langue
// maternelle", a degree from HEC Paris and a +33 phone number, on the one
// page where somebody decides whether this tool writes the kind of CV they
// need. Measured on 7 October 2026 by reading every visible word on the
// English home page: five of the twelve French strings found came from here.
//
// The English version is not a translation of the French one. It is a London
// CV: a London address, a UK phone from Ofcom's reserved drama range (safe in
// a public repository), pounds rather than euros, British degrees. The
// product's market is London, and a sample CV is a promise about the shape of
// the document somebody is about to get.
const DEMO_FR = {
  name: "Alex Martin",
  title: "Senior Product Manager",
  email: "alex.martin@email.com",
  phone: "+33 6 12 34 56 78",
  location: "Paris, France",
  linkedin: "linkedin.com/in/alex-martin",
  summary: "Product Manager senior avec 8 ans d'experience dans le SaaS B2B. Passionne par l'IA, le design produit, et la croissance d'equipes tech. Track record solide en lancement de produits a fort impact.",
  skills: ["Product Strategy", "Roadmap", "Agile / Scrum", "SQL", "Figma", "A/B Testing", "Analytics"],
  experience: [
    {
      id: "e1", title: "Senior Product Manager",
      company: "TechCorp", location: "Paris",
      period: "2022 - present",
      bullets: [
        "Lance 3 produits qui ont genere 12M EUR ARR la premiere annee",
        "Manage une equipe de 8 PMs et designers, +25% velocity",
        "Mise en place du framework de discovery produit",
      ],
    },
    {
      id: "e2", title: "Product Manager",
      company: "StartupCo", location: "Lyon",
      period: "2019 - 2022",
      bullets: [
        "Pilotage roadmap de l'app mobile (500K MAU)",
        "Reduction du churn de 18% en 6 mois",
      ],
    },
    {
      id: "e3", title: "Associate PM",
      company: "BigCorp", location: "Paris",
      period: "2017 - 2019",
      bullets: [
        "Lance feature de paiement qui a augmente conversion +12%",
      ],
    },
  ],
  education: [
    {
      id: "ed1", degree: "Master Management",
      school: "HEC Paris", period: "2015 - 2017",
    },
    {
      id: "ed2", degree: "Licence Eco-Gestion",
      school: "Universite Paris-Dauphine", period: "2012 - 2015",
    },
  ],
  languages: [
    { lang: "Francais", level: "Langue maternelle" },
    { lang: "Anglais", level: "Courant (C1)" },
  ],
  certifications: [
    "Certified Scrum Product Owner (CSPO)",
    "Pragmatic Marketing Level 3",
  ],
  photoMode: "initials",
  photoUrl: null,
  labels: {},
};

const DEMO_EN = {
  name: "Alex Martin",
  title: "Senior Product Manager",
  email: "alex.martin@email.com",
  phone: "07700 900123",
  location: "London, United Kingdom",
  linkedin: "linkedin.com/in/alex-martin",
  summary: "Senior Product Manager, 8 years in B2B SaaS. Works on AI features, product design and growing engineering teams. Track record of launches that reached revenue in their first year.",
  skills: ["Product Strategy", "Roadmap", "Agile / Scrum", "SQL", "Figma", "A/B Testing", "Analytics"],
  experience: [
    {
      id: "e1", title: "Senior Product Manager",
      company: "TechCorp", location: "London",
      period: "2022 - present",
      bullets: [
        "Launched 3 products that reached 10M GBP ARR in their first year",
        "Led a team of 8 product managers and designers, velocity up 25%",
        "Set up the product discovery framework the whole team now uses",
      ],
    },
    {
      id: "e2", title: "Product Manager",
      company: "StartupCo", location: "Manchester",
      period: "2019 - 2022",
      bullets: [
        "Owned the mobile app roadmap, 500K monthly active users",
        "Cut churn by 18% in 6 months",
      ],
    },
    {
      id: "e3", title: "Associate Product Manager",
      company: "BigCorp", location: "London",
      period: "2017 - 2019",
      bullets: [
        "Shipped a payment feature that lifted conversion by 12%",
      ],
    },
  ],
  education: [
    {
      id: "ed1", degree: "MSc Management",
      school: "London School of Economics", period: "2015 - 2017",
    },
    {
      id: "ed2", degree: "BSc Economics",
      school: "University of Manchester", period: "2012 - 2015",
    },
  ],
  languages: [
    { lang: "English", level: "Native" },
    { lang: "French", level: "Fluent (C1)" },
  ],
  certifications: [
    "Certified Scrum Product Owner (CSPO)",
    "Pragmatic Marketing Level 3",
  ],
  photoMode: "initials",
  photoUrl: null,
  labels: {},
};

// There is no bare DEMO_CV on purpose. A sample CV with no language asked for
// is the defect above: whoever imports it gets French, and nothing on screen
// says so. The caller has to name a language, the same way metaGabarit does.
export function cvDemo(locale) {
  return locale === "en" ? DEMO_EN : DEMO_FR;
}

// Theme demo coherent pour les previews (Sidebar Pro dore classique)
export const DEMO_THEME = {
  bf: "Inter, system-ui, sans-serif",
  tf: "Fraunces, Georgia, serif",
  bg: "#ffffff",
  ti: "#1a1a1e",
  sb: "#1a1a2e",       // sidebar background
  st: "#f5e9d2",       // sidebar text
  ac: "#c9a96e",       // accent (or classique)
};
