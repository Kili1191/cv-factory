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
// CV demo statique avec donnees factices.
export const DEMO_CV = {
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
