// LES FORMES QUE L'API DOIT GARANTIR
//
// Un schema ne se plaide pas, il contraint le decodage. C'est ce qui remplace
// "Reponds UNIQUEMENT en JSON valide strict, sans markdown" suivi d'un
// gabarit recopie a la main : la formule d'avant les sorties structurees, qui
// tient la plupart du temps et cede exactement sur les reponses les plus
// longues, donc sur les CV les plus fournis.
//
// POURQUOI CE FICHIER EXISTE
//
// SCHEMA_CV vivait dans AppRoot. MatchPanel produit lui aussi un CV complet,
// n'y avait pas acces, et decrivait donc sa propre forme dans le prompt. Deux
// descriptions du meme objet a deux endroits : c'est la palette recopiee trois
// fois et les icones enfermees dans la barre laterale, une troisieme fois.
// Une seule source.

export const SCHEMA_CV = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    title: { type: "string" },
    email: { type: "string" },
    phone: { type: "string" },
    location: { type: "string" },
    linkedin: { type: "string" },
    summary: { type: "string" },
    experience: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          company: { type: "string" },
          period: { type: "string" },
          location: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
        },
        required: ["title", "company", "period", "location", "bullets"],
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          degree: { type: "string" },
          school: { type: "string" },
          period: { type: "string" },
        },
        required: ["degree", "school", "period"],
      },
    },
    skills: { type: "array", items: { type: "string" } },
    languages: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { lang: { type: "string" }, level: { type: "string" } },
        required: ["lang", "level"],
      },
    },
    certifications: { type: "array", items: { type: "string" } },
    // CE QUE NUVI A MIS SANS QU'ON LE LUI DISE
    //
    // Le modele remplit tout, y compris ce que le parcours ne renseignait pas.
    // C'est voulu : un CV a trous se fait ecarter avant d'etre lu.
    //
    // Mais un employeur, une date ou un diplome ne se verifient pas comme une
    // tournure de phrase : ils se verifient par un appel. La personne doit
    // donc savoir lesquels viennent d'elle et lesquels viennent de Nuvi, sans
    // avoir a relire ligne a ligne un document que la machine a produit d'un
    // bloc. Le modele liste ici le chemin de chaque champ de ce type qu'il a
    // rempli lui-meme.
    //
    // Rien n'est bloque et rien n'est retire : c'est un signalement, pas une
    // autorisation a demander.
    deduit: { type: "array", items: { type: "string" } },
  },
  required: ["name", "title", "email", "phone", "location", "linkedin",
             "summary", "experience", "education", "skills", "languages",
             "certifications", "deduit"],
};

// LES TROIS ANALYSES ONT LEUR FORME, ELLES AUSSI
//
// Elles la demandaient en prose : "Reponds UNIQUEMENT en JSON valide strict,
// sans markdown", suivi d'un exemple de sortie, et parseJSON retirait les
// blocs de code a la main. C'est l'echafaudage d'avant les sorties
// structurees : il tient la plupart du temps et cede exactement quand le
// modele travaille le plus, donc sur les CV les plus fournis, donc chez les
// gens qui ont le plus a raconter.
//
// Un schema ne se plaide pas, il contraint le decodage. Les exemples de
// sortie disparaissent des prompts au passage : ils coutaient des jetons a
// chaque appel pour decrire ce que le schema garantit.
export const SCHEMA_AUDIT = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict_longueur: { type: "string" },
    longueur_recommandation: { type: "string" },
    forces: { type: "array", items: { type: "string" } },
    faiblesses: { type: "array", items: { type: "string" } },
    suggestions: { type: "array", items: { type: "string" } },
    mots_cles_manquants: { type: "array", items: { type: "string" } },
    premiere_impression: { type: "string" },
    verdict_recruteur: { type: "string" },
    raison_verdict: { type: "string" },
  },
  required: ["verdict_longueur", "longueur_recommandation", "forces",
             "faiblesses", "suggestions", "mots_cles_manquants",
             "premiere_impression", "verdict_recruteur", "raison_verdict"],
};

export const SCHEMA_POSITIONNEMENT = {
  type: "object",
  additionalProperties: false,
  properties: {
    angles: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          credibility: { type: "string" },
          salary_range: { type: "string" },
          key_points: { type: "array", items: { type: "string" } },
          target_employers: { type: "string" },
          new_summary: { type: "string" },
        },
        required: ["title", "credibility", "salary_range", "key_points",
                   "target_employers", "new_summary"],
      },
    },
  },
  required: ["angles"],
};

// L'ANALYSE D'UNE ANNONCE : LA PLUS GROSSE SORTIE DU PRODUIT
//
// Elle rend une lecture de l'offre ET un CV complet reecrit pour elle. Elle
// decrivait sa forme dans le prompt, y compris le CV, parce que ce composant
// n'avait pas acces a SCHEMA_CV. D'ou ce fichier.
export const SCHEMA_MATCH = {
  type: "object",
  additionalProperties: false,
  properties: {
    match_score: { type: "number" },
    job_title: { type: "string" },
    company: { type: "string" },
    key_requirements: { type: "array", items: { type: "string" } },
    keywords_matched: { type: "array", items: { type: "string" } },
    keywords_to_add: { type: "array", items: { type: "string" } },
    hidden_signals: { type: "array", items: { type: "string" } },
    culture_decode: { type: "string" },
    seniority_decode: { type: "string" },
    likely_interview_questions: { type: "array", items: { type: "string" } },
    cover_letter_hook: { type: "string" },
    // Le meme CV que partout ailleurs, moins "deduit" : ce champ signale ce
    // que le modele a rempli seul, et cette fonction reecrit a partir d'un CV
    // existant plutot que de remplir des trous.
    cv_optimized: {
      type: "object",
      additionalProperties: false,
      properties: Object.fromEntries(
        Object.entries(SCHEMA_CV.properties).filter(([k]) => k !== "deduit")),
      required: SCHEMA_CV.required.filter((k) => k !== "deduit"),
    },
  },
  required: ["match_score", "job_title", "company", "key_requirements",
             "keywords_matched", "keywords_to_add", "hidden_signals",
             "culture_decode", "seniority_decode", "likely_interview_questions",
             "cover_letter_hook", "cv_optimized"],
};

export const SCHEMA_VERITE = {
  type: "object",
  additionalProperties: false,
  properties: {
    issues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: { type: "string" },
          quote: { type: "string" },
          location: { type: "string" },
          why: { type: "string" },
          fix: { type: "string" },
        },
        required: ["type", "quote", "location", "why", "fix"],
      },
    },
    overall_verdict: { type: "string" },
  },
  required: ["issues", "overall_verdict"],
};
