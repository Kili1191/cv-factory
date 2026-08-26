// Tout ce que la personne a deja ecrit, rassemble en une seule source.
//
// LE PROBLEME
//
// Adapter un CV a une offre ne peut piocher que dans le CV ouvert a l'ecran.
// Quelqu'un qui garde une version "hotellerie" et une version "commercial" et
// qui postule a un poste commercial avec la premiere chargee obtient une
// adaptation batie sur le mauvais materiau. Son experience commerciale existe,
// elle est enregistree, et personne ne va la chercher.
//
// Ce fichier rassemble le CV courant et toutes les versions sauvegardees en un
// dossier unique. C'est le materiau brut a partir duquel on construit le CV
// d'une offre donnee.
//
// CE QUE CA N'EST PAS
//
// Ce n'est pas un CV. On ne l'affiche jamais tel quel : il contient tout, donc
// il est trop long et sans ordre de priorite. C'est une reserve dans laquelle
// on choisit - et choisir dans ce qu'on a vraiment fait n'est pas mentir,
// contrairement a ajouter ce qu'on n'a pas fait.
//
// LA DEDUPLICATION EST LE POINT DELICAT
//
// La meme experience figure dans cinq versions, formulee cinq fois autrement.
// La garder cinq fois gonfle le dossier et fait croire a un parcours plus long
// qu'il n'est. On regroupe donc par poste, entreprise et periode, et on REUNIT
// les formulations : c'est justement leur diversite qui a de la valeur, parce
// que l'une d'elles emploie peut-etre deja les mots de l'offre.

function fold(s) {
  return String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function clefExperience(e) {
  return [fold(e && e.title), fold(e && e.company), fold(e && e.period)].join("|");
}

function clefFormation(e) {
  return [fold(e && e.degree), fold(e && e.school)].join("|");
}

// Reunit des listes de chaines sans doublon, en gardant la premiere graphie
// rencontree : c'est celle du CV courant, donc celle que la personne utilise
// aujourd'hui.
function unionTextes(listes) {
  const vus = new Map();
  for (const l of listes) {
    for (const x of l || []) {
      const t = String(x || "").trim();
      if (!t) continue;
      const k = fold(t);
      if (k && !vus.has(k)) vus.set(k, t);
    }
  }
  return [...vus.values()];
}

/**
 * Rassemble le CV courant et les versions en un dossier unique.
 *
 * L'ordre compte : le CV courant passe en premier partout, donc en cas de
 * doublon c'est SA formulation qui est retenue comme principale. Les autres
 * viennent en renfort.
 *
 * @param {object} cvCourant
 * @param {Array<{name?:string, cv:object}>} versions
 */
export function dossierParcours(cvCourant, versions = []) {
  const sources = [cvCourant, ...(versions || []).map(v => v && v.cv)].filter(
    x => x && typeof x === "object"
  );
  if (!sources.length) return { experience: [], education: [], skills: [], certifications: [], languages: [], sources: 0 };

  const parExp = new Map();
  for (const src of sources) {
    for (const e of src.experience || []) {
      if (!e || (!e.title && !e.company)) continue;
      const k = clefExperience(e);
      const deja = parExp.get(k);
      if (!deja) {
        parExp.set(k, {
          title: e.title, company: e.company, period: e.period, location: e.location,
          // Toutes les facons dont cette experience a ete racontee. Une seule
          // sera retenue pour un CV donne, mais c'est le choix qui fait la
          // valeur : l'une d'elles parle peut-etre deja la langue de l'offre.
          bullets: unionTextes([e.bullets]),
        });
      } else {
        deja.bullets = unionTextes([deja.bullets, e.bullets]);
        // Un champ vide dans la premiere source se laisse completer par une
        // suivante : mieux vaut une localisation venue d'ailleurs que rien.
        for (const champ of ["location", "period", "company", "title"]) {
          if (!deja[champ] && e[champ]) deja[champ] = e[champ];
        }
      }
    }
  }

  const parEdu = new Map();
  for (const src of sources) {
    for (const e of src.education || []) {
      if (!e || (!e.degree && !e.school)) continue;
      const k = clefFormation(e);
      if (!parEdu.has(k)) parEdu.set(k, { degree: e.degree, school: e.school, period: e.period });
    }
  }

  const parLangue = new Map();
  for (const src of sources) {
    for (const l of src.languages || []) {
      if (!l || !l.lang) continue;
      const k = fold(l.lang);
      if (!parLangue.has(k)) parLangue.set(k, { lang: l.lang, level: l.level });
    }
  }

  return {
    experience: [...parExp.values()],
    education: [...parEdu.values()],
    skills: unionTextes(sources.map(s => s.skills)),
    certifications: unionTextes(sources.map(s => s.certifications)),
    languages: [...parLangue.values()],
    sources: sources.length,
  };
}

/**
 * Le dossier apporte-t-il quelque chose que le CV courant n'a pas ?
 *
 * Sert a ne PAS proposer un choix qui ne change rien. Offrir "construire
 * depuis tout mon parcours" a quelqu'un qui n'a qu'une seule version, c'est
 * lui faire croire a une option qui rendra exactement le meme resultat - et
 * la deception coute plus cher que l'absence de choix.
 */
export function apportDuDossier(cvCourant, versions = []) {
  const dossier = dossierParcours(cvCourant, versions);
  const cur = cvCourant || {};
  const clefsCourantes = new Set((cur.experience || []).map(clefExperience));
  // On garde les ELEMENTS, pas seulement leur nombre. "3 experiences en plus"
  // demande de faire confiance ; "Serveur, Le Comptoir, 2019-2021" se
  // verifie d'un coup d'oeil. C'est le parcours de la personne : elle doit
  // pouvoir voir ce que Nuvi est alle chercher avant qu'il s'en serve, pas
  // le decouvrir dans le CV produit.
  const expsEnPlus = dossier.experience.filter(e => !clefsCourantes.has(clefExperience(e)));
  const expEnPlus = expsEnPlus.length;

  const skillsCourants = new Set((cur.skills || []).map(fold));
  const skillsListe = dossier.skills.filter(s => !skillsCourants.has(fold(s)));
  const skillsEnPlus = skillsListe.length;

  // Une formulation supplementaire sur une experience deja presente compte :
  // c'est peut-etre celle qui emploie les mots de l'offre.
  let formulationsEnPlus = 0;
  for (const e of dossier.experience) {
    const k = clefExperience(e);
    const courante = (cur.experience || []).find(x => clefExperience(x) === k);
    if (courante) {
      formulationsEnPlus += Math.max(0, e.bullets.length - (courante.bullets || []).filter(Boolean).length);
    }
  }

  return {
    experiences: expEnPlus,
    competences: skillsEnPlus,
    formulations: formulationsEnPlus,
    // De quoi montrer, et pas seulement compter.
    listeExperiences: expsEnPlus.map(e => ({
      title: e.title || "",
      company: e.company || "",
      period: e.period || "",
    })),
    listeCompetences: skillsListe,
    utile: expEnPlus > 0 || skillsEnPlus > 0 || formulationsEnPlus > 0,
  };
}

/**
 * Le dossier mis a plat pour une consigne d'IA. Texte, pas JSON : on demande
 * de CHOISIR dans ce materiau, pas de le recopier.
 */
export function dossierEnTexte(dossier) {
  if (!dossier) return "";
  const lignes = [];
  for (const e of dossier.experience) {
    lignes.push(
      `- ${e.title || "?"} | ${e.company || "?"} | ${e.period || "?"}`
      + (e.location ? ` | ${e.location}` : "")
    );
    for (const b of e.bullets) lignes.push(`    . ${b}`);
  }
  const bloc = [];
  if (lignes.length) bloc.push("EXPERIENCES (toutes formulations connues) :\n" + lignes.join("\n"));
  if (dossier.education.length) {
    bloc.push("FORMATIONS :\n" + dossier.education
      .map(e => `- ${e.degree || "?"} | ${e.school || "?"} | ${e.period || "?"}`).join("\n"));
  }
  if (dossier.skills.length) bloc.push("COMPETENCES : " + dossier.skills.join(", "));
  if (dossier.certifications.length) bloc.push("CERTIFICATIONS : " + dossier.certifications.join(", "));
  if (dossier.languages.length) {
    bloc.push("LANGUES : " + dossier.languages.map(l => `${l.lang} ${l.level || ""}`.trim()).join(", "));
  }
  return bloc.join("\n\n");
}
