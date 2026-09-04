// Talking to Nuvi about one thing the check flagged.
//
// WHAT THIS IS FOR
//
// The check before download said: "a school is not named in eighty
// characters with commas". The candidate knows better: "it is not a school,
// it is a training I did at the company". Until now the only answers were
// to fix it by hand or close the panel. Now the candidate says it in their
// own words, Nuvi asks back when something is missing (which job? when?),
// and then puts the thing where it belongs, elegantly, and shows what it
// moved.
//
// WHAT NUVI MAY AND MAY NOT DO
//
// It works from two sources only: the CV, and what the candidate wrote in
// this thread. It reorganises, renames, moves; it does not add. The prompt
// says so, and the guard below holds the line the prompt cannot: a figure
// that is in neither source is refused before it reaches the page. Rule
// three of the repo: the boundary must hold on its own.

const texte = (v) => String(v == null ? "" : v).trim();

// The transcript, as the model reads it. `echanges` is a list of
// {de: "candidat" | "nuvi", texte}.
function transcription(echanges) {
  return (echanges || []).map((e) =>
    (e.de === "nuvi" ? "Nuvi : " : "Candidat : ") + texte(e.texte)).join("\n");
}

export function promptPourExpliquer({ cv, defaut, echanges, locale, regles }) {
  const langLine = locale === "en"
    ? "Reponds STRICTEMENT en anglais, dans \"question\" comme dans \"explication\"."
    : "Reponds STRICTEMENT en francais, dans \"question\" comme dans \"explication\".";
  return "Le candidat te parle d'une chose que le controle avant telechargement "
    + "a signalee sur son CV. Il t'explique ce que c'est vraiment. Ton travail : "
    + "comprendre exactement, puis remettre cette chose a sa place dans le CV, "
    + "elegamment, comme le ferait le meilleur redacteur de CV.\n\n"
    + "CE QUI A ETE SIGNALE :\n"
    + "- ou : " + texte(defaut && defaut.ou) + "\n"
    + "- texte : \"" + texte(defaut && defaut.extrait) + "\"\n"
    + "- pourquoi : " + texte(defaut && defaut.pourquoi) + "\n\n"
    + "CE QUI S'EST DIT, DANS L'ORDRE :\n" + transcription(echanges) + "\n\n"
    + "DEUX ISSUES, UNE SEULE A LA FOIS :\n"
    + "1. S'il te manque une information pour placer la chose correctement "
    + "(sous quel poste, quand, sous quel nom, ce qui y a ete fait), pose UNE "
    + "question, courte et precise, dans \"question\", et renvoie le CV "
    + "INCHANGE dans \"cv\". Ne demande jamais ce qui est deja dans le CV ou "
    + "dans ce que le candidat a dit. Deux questions au maximum sur tout le "
    + "fil : au-dela, tu fais avec ce que tu as.\n"
    + "2. Si tu sais, renvoie \"question\" vide, le CV ENTIER remis en ordre "
    + "dans \"cv\", et dans \"explication\" une ou deux phrases qui disent ce "
    + "que tu as deplace et ou.\n\n"
    + "COMMENT PLACER :\n"
    + "- Une formation suivie en entreprise n'est pas une ecole : elle va sous "
    + "le poste ou elle a ete suivie, en une puce courte qui dit ce qu'elle a "
    + "apporte, ou en certifications si elle porte un nom. La ligne de "
    + "formation qui la portait disparait : rien n'apparait deux fois.\n"
    + "- Un diplome a un nom court, un etablissement, une periode. Une "
    + "description va en puce, jamais dans un champ de nom.\n"
    + "- Tu ne touches a rien d'autre que ce qui est signale et ce que le "
    + "candidat te demande.\n\n"
    + "CE QUE TU NE FAIS PAS : tu n'inventes rien. Aucun mot, chiffre, "
    + "employeur, date, intitule ou organisme qui n'est ni dans le CV ni dans "
    + "ce que le candidat a ecrit ici. Tu gardes la langue du CV.\n\n"
    + (regles ? regles + "\n" : "") + langLine + "\n\n"
    + "CV:\n" + JSON.stringify(cv);
}

// Figures in the new CV that exist in neither the old CV nor the thread.
// Years, counts, percentages: the things a recruiter checks and a model
// rounds up. Words are not guarded here: a synonym is not an invention,
// and the visible diff plus undo cover the rest.
export function chiffresInventes(avant, apres, echanges) {
  const nombres = (s) => new Set((String(s).match(/\d+(?:[.,]\d+)?/g) || []));
  const sources = nombres(JSON.stringify(avant || {}));
  for (const n of nombres(transcription(echanges))) sources.add(n);
  const out = [];
  for (const n of nombres(JSON.stringify(apres || {}))) {
    if (!sources.has(n)) out.push(n);
  }
  return out;
}
