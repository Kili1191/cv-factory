// Ce qu'est un CV qui ne va pas.
//
// POURQUOI CE FICHIER EXISTE
//
// Kilian a telecharge son CV depuis thenuvi.com et il est sorti avec, entre
// autres, "Account Manager (cadratin)" comme intitule de poste, une section
// CERTIFICATIONS dont l'unique element etait "2023", et un nom d'ecole qui
// etait une phrase de quatre-vingt-dix caracteres. Le produit n'a rien dit.
// Il a affiche un bouton Telecharger, l'a laisse cliquer, et lui a rendu le
// document qu'il enverra a des recruteurs.
//
// C'est le pire moment pour se taire. Tout le reste du produit peut se
// rattraper : un mauvais conseil se rejette, une reformulation ratee se
// reecrit. Le telechargement, non. Ce qui part part, et la personne
// l'apprendra, si elle l'apprend, par un silence de trois semaines.
//
// D'ou une regle : Nuvi ne laisse pas partir un CV casse sans le dire.
//
// IL LE DIT, IL NE L'INTERDIT PAS
//
// La regle de la maison est que Nuvi ne decide pas a la place de la personne.
// Bloquer le bouton serait decider. Quelqu'un peut avoir une bonne raison de
// telecharger un brouillon : l'envoyer a un ami, l'imprimer pour le relire au
// crayon, verifier une mise en page. Ce qu'il ne doit pas pouvoir faire,
// c'est le telecharger SANS LE SAVOIR.
//
// Chaque defaut est donc nomme, avec le texte exact qui le declenche, et la
// personne choisit. La difference entre un outil qui protege et un outil qui
// materne tient entierement la : on montre ce qu'on a vu, on ne retire pas le
// bouton.
//
// CE QUI EST ICI ET CE QUI N'Y EST PAS
//
// Ici : ce qui se mesure sans avis, sur la structure du document. Un champ
// coupe au mauvais endroit, une date qui se repete, une section vide, un
// separateur orphelin. Ce sont des ACCIDENTS, pas des choix : personne
// n'ecrit "Account Manager (cadratin)" volontairement.
//
// Pas ici : la qualite du contenu. "Ton accroche est fade", "ce poste manque
// de chiffres", "cette experience n'interesse pas ce recruteur" sont des
// jugements, ils appartiennent au score et au coach, et ils ne doivent jamais
// empecher ni retarder un telechargement.

const SEPARATEUR_FINAL = /[\-\u2013\u2014\u00b7|,;:]\s*$/;
const SEPARATEUR_INITIAL = /^\s*[\-\u2013\u2014\u00b7|;:]/;
const TIRET_LONG = /[\u2012\u2013\u2014\u2015]/;
// Le point de suspension que l'editeur affiche sur un champ vide. C'est une
// affordance a l'ecran, et ca n'a aucun sens dans un document.
const PLACEHOLDER = /^\s*\.\.\.\s*$|^\s*…\s*$/;

const texte = (v) => String(v == null ? "" : v).trim();

// L'annee de la colonne, recopiee en bout d'intitule : ce que le correcteur
// sait retirer, et donc ce que le detecteur a le droit de signaler.
export const ANNEE_EN_FIN = (an) =>
  new RegExp("[\\s\\-\\u2013\\u2014,:|]*\\(?" + an + "\\)?\\s*$");
export function anneeEnFin(degree, an) {
  const s = texte(degree);
  if (!s || !an) return false;
  // Une annee entre parentheses avec un mot devant ("(expected 2026)") est
  // une precision, pas un doublon.
  if (new RegExp("\\([a-z ]+" + an + "\\)\\s*$", "i").test(s)) return false;
  return ANNEE_EN_FIN(an).test(s) && s.replace(ANNEE_EN_FIN(an), "").trim().length > 0;
}

// LA HAUTEUR DU DOCUMENT, TELLE QUE L'EXPORT LA VERRA
//
// A l'ecran, le document porte ses commandes d'edition (.cvf-no-print) et
// une mise a l'echelle d'affichage. L'export les retire avant de mesurer.
// Mesurer autrement ici donnerait une hauteur differente de celle qui
// decide, et un controle qui ne mesure pas ce qu'il juge se trompe dans les
// deux sens : il crie sur un CV qui tient, il se tait sur un CV qui deborde.
// On applique donc la meme feuille de style, le temps d'une lecture.
export function hauteurDuDocumentMm(doc) {
  if (!doc || typeof doc.querySelector !== "function") return 0;
  const el = doc.getElementById("cv-print") || doc.querySelector('[data-cvf="cv"]');
  if (!el) return 0;
  const style = doc.createElement("style");
  style.textContent = ".cvf-no-print{display:none !important}[data-cvf-zoom]{zoom:1 !important}";
  doc.head.appendChild(style);
  let px = 0;
  try { void el.offsetHeight; px = el.scrollHeight; } finally { style.remove(); }
  return px * 25.4 / 96;
}

// Un CV tient sur une feuille jusqu'a ce point : au-dela, meme reduit au
// plancher de lisibilite, il deborde. La valeur est celle de l'export
// (FACTEUR_MIN), et les deux doivent rester egales.
export const HAUTEUR_UNE_PAGE_MM = 297;
export const FACTEUR_MIN = 0.85;
export const HAUTEUR_MAX_UNE_PAGE_MM = HAUTEUR_UNE_PAGE_MM / FACTEUR_MIN;

// Un defaut : ce qu'on a vu, ou, et pourquoi ca compte pour la personne.
function defaut(cle, ou, extrait, pourquoi) {
  return { cle, ou, extrait: texte(extrait).slice(0, 80), pourquoi };
}

export function defautsDuCv(cv) {
  const out = [];
  if (!cv || typeof cv !== "object") return out;

  const exp = Array.isArray(cv.experience) ? cv.experience : [];
  const edu = Array.isArray(cv.education) ? cv.education : [];
  const certs = Array.isArray(cv.certifications) ? cv.certifications : [];
  const skills = Array.isArray(cv.skills) ? cv.skills : [];
  const langues = Array.isArray(cv.languages) ? cv.languages : [];

  // 1. UN CHAMP COUPE AU MAUVAIS ENDROIT
  //
  // "Account Manager (cadratin)" : le tiret qui separait l'intitule de
  // l'employeur est reste accroche a l'intitule, et l'employeur a disparu
  // avec la coupure. Un recruteur lit un titre inacheve ; un analyseur
  // enregistre le tiret comme faisant partie du poste.
  const champs = [
    ...exp.flatMap((e, i) => [
      { v: e.title, ou: "experience " + (i + 1) + ", intitule" },
      { v: e.company, ou: "experience " + (i + 1) + ", employeur" },
    ]),
    ...edu.flatMap((e, i) => [
      { v: e.degree, ou: "formation " + (i + 1) + ", diplome" },
      { v: e.school, ou: "formation " + (i + 1) + ", etablissement" },
    ]),
    { v: cv.title, ou: "intitule du CV" },
    { v: cv.name, ou: "nom" },
  ];
  // UN DEFAUT PAR CHAMP, PAS UN PAR REGLE
  //
  // "Account Manager (cadratin)" declenche les deux premieres : il finit par
  // un separateur, et ce separateur est un tiret long. Les afficher toutes
  // les deux ferait lire trois fois le meme champ dans une liste de dix, et
  // une liste qu'on ne finit pas de lire ne sert a rien. On garde donc la
  // premiere raison qui explique le mieux, et la raison combinee le dit
  // quand les deux valent.
  for (const { v, ou } of champs) {
    const s = texte(v);
    if (!s) continue;
    const coupe = SEPARATEUR_FINAL.test(s) || SEPARATEUR_INITIAL.test(s);
    const long = TIRET_LONG.test(s);
    if (PLACEHOLDER.test(s)) {
      out.push(defaut("placeholder", ou, s,
        "le point de suspension de l'editeur est parti dans le document : "
        + "un recruteur y lit une information manquante"));
    } else if (coupe) {
      out.push(defaut("coupe", ou, s,
        "le champ finit par un separateur, donc la coupure est tombee au "
        + "mauvais endroit et ce qui suivait a disparu"
        + (long ? ". Ce separateur est en plus un tiret long, devenu la "
          + "signature du texte ecrit par une machine" : "")));
    } else if (long) {
      out.push(defaut("cadratin", ou, s,
        "un tiret long est devenu la signature du texte ecrit par une "
        + "machine, et il se lit avant le contenu"));
    }
  }

  // 2. UNE ENTREE QUI N'EST QU'UNE DATE
  //
  // La section CERTIFICATIONS de Kilian ne contenait que "2023". Un analyseur
  // enregistre une certification qui s'appelle "2023".
  for (const [liste, nom] of [[certs, "certification"], [skills, "competence"]]) {
    liste.forEach((c, i) => {
      const s = texte(c);
      if (!s) return;
      if (/^\(?\d{4}\)?$/.test(s) || !/[a-z0-9]/i.test(s)) {
        out.push(defaut("creuse", nom + " " + (i + 1), s,
          "cette ligne ne porte aucun nom : c'est un decoupage rate, et elle "
          + "sera lue comme une " + nom + " qui s'appelle \"" + s + "\""));
      }
    });
  }

  // 3. UNE ANNEE QUI SE REPETE DANS SON PROPRE INTITULE
  //
  // En FIN d'intitule seulement. "Level 7 Diploma (expected 2026)" porte
  // l'annee au milieu, entre parentheses : c'est une precision, elle reste.
  // "Level 7 Diploma (expected 2026) 2026" la porte une seconde fois, en
  // bout de ligne, collee a la colonne de dates : c'est celle-la qui a ete
  // mal detachee. Une premiere version testait "contient l'annee" et
  // accusait la precision ; le correcteur, lui, ne retire que la fin. Les
  // deux doivent lire la meme regle, sinon l'un signale ce que l'autre ne
  // sait pas reparer, et le bouton "Corriger" ment une seconde fois.
  edu.forEach((e, i) => {
    const an = texte(e.period).match(/\d{4}/);
    if (an && anneeEnFin(texte(e.degree), an[0])) {
      out.push(defaut("annee_doublee", "formation " + (i + 1), e.degree,
        "l'annee apparait dans le diplome ET dans sa colonne de dates : la "
        + "periode n'a pas ete detachee du texte"));
    }
  });

  // 4. UN ETABLISSEMENT QUI EST UNE PHRASE
  edu.forEach((e, i) => {
    const s = texte(e.school);
    if (s.length > 70 && (s.match(/,/g) || []).length >= 2) {
      out.push(defaut("phrase", "formation " + (i + 1) + ", etablissement", s,
        "un etablissement ne s'appelle pas en quatre-vingts caracteres avec "
        + "des virgules : c'est une description rangee au mauvais endroit"));
    }
  });

  // 5. UNE EXPERIENCE SANS RIEN A LIRE
  //
  // Un poste sans intitule ni employeur, ou un poste sans une seule puce, ne
  // dit rien a un recruteur et ne rapporte rien a un analyseur : il occupe de
  // la place sur la page en echange de zero information.
  exp.forEach((e, i) => {
    const puces = (Array.isArray(e.bullets) ? e.bullets : []).filter((b) => texte(b));
    if (!texte(e.title) && !texte(e.company)) {
      out.push(defaut("poste_anonyme", "experience " + (i + 1), texte(e.period),
        "ce poste n'a ni intitule ni employeur : il occupe une place sur la "
        + "page sans rien dire"));
    } else if (!puces.length) {
      out.push(defaut("poste_muet", "experience " + (i + 1),
        texte(e.title) || texte(e.company),
        "ce poste n'a aucune ligne : un recruteur ne saura pas ce qui y a ete "
        + "fait, et les mots-cles du metier manqueront a l'analyseur"));
    }
  });

  // 6. DEUX FOIS LA MEME LIGNE
  //
  // Une puce recopiee est ce qui se voit le plus vite a la lecture en
  // diagonale, et c'est toujours un accident de copier-coller.
  const vues = new Map();
  exp.forEach((e, i) => {
    (Array.isArray(e.bullets) ? e.bullets : []).forEach((b) => {
      const s = texte(b).toLowerCase();
      if (s.length < 15) return;
      if (vues.has(s)) {
        out.push(defaut("doublon", "experience " + (i + 1), b,
          "cette ligne apparait deja dans " + vues.get(s)));
      } else {
        vues.set(s, "l'experience " + (i + 1));
      }
    });
  });

  // 7. UNE LANGUE SANS NIVEAU, UN NIVEAU SANS LANGUE
  langues.forEach((l, i) => {
    const lang = texte(l && l.lang);
    const niv = texte(l && l.level);
    if (niv && !lang) {
      out.push(defaut("langue_sans_nom", "langue " + (i + 1), niv,
        "un niveau sans langue : la ligne s'affichera sans dire de quoi elle "
        + "parle"));
    }
  });

  // 8. LE MINIMUM VITAL
  //
  // Sans nom, ou sans aucun moyen de rappeler la personne, le document ne
  // peut pas faire son travail, meme parfaitement mis en page.
  if (!texte(cv.name)) {
    out.push(defaut("sans_nom", "en-tete", "",
      "le CV ne porte pas de nom : un analyseur prendra la premiere ligne "
      + "venue pour l'identite du candidat"));
  }
  if (!texte(cv.email) && !texte(cv.phone)) {
    out.push(defaut("sans_contact", "en-tete", "",
      "aucun email ni telephone : un recruteur convaincu ne peut pas "
      + "repondre"));
  }

  return out;
}

// LE DEFAUT QUI SE VOIT, ET QUI NE SE CALCULE PAS
//
// Les regles ci-dessus lisent des donnees. Certains defauts n'existent qu'une
// fois le document DESSINE : du texte qui deborde de la feuille, un titre de
// section seul en bas de page avec sa section sur la suivante, une colonne
// qui recouvre l'autre. Aucune donnee ne les annonce.
//
// Cette fonction s'execute dans le navigateur, sur l'element du CV, et rend
// les memes objets que ci-dessus pour que l'ecran n'ait qu'une seule liste a
// afficher. Elle est ici, avec les autres regles, parce que "ce qu'est un CV
// qui ne va pas" doit s'ecrire a un seul endroit.
//
// Elle recoit `doc` au lieu de lire `document` : le module reste alors
// importable par Node, donc les regles du dessus se testent sans navigateur.
// Une premiere version rendait ce code sous forme de chaine a evaluer dans la
// page - c'etait se donner un eval() pour eviter un parametre.
export function defautsVisuels(doc) {
  if (!doc || typeof doc.querySelector !== "function") return [];
  const el = doc.getElementById("cv-print")
    || doc.querySelector('[data-cvf="cv"]');
  if (!el) return [];
  const vue = doc.defaultView;
  if (!vue) return [];
  const getComputedStyle = (n) => vue.getComputedStyle(n);
  const out = [];
  const cadre = el.getBoundingClientRect();
  const d = (cle, ou, extrait, pourquoi) => out.push({
    cle, ou, extrait: String(extrait || "").trim().slice(0, 80), pourquoi, visuel: true });

  // 0. UN CV TIENT SUR UNE PAGE
  //
  // C'est la regle du produit, dite par son proprietaire : "un CV doit
  // toujours etre dans une page, et pas telecharge coupe". Deux feuilles se
  // lisent comme un document coupe ; une image reduite sous 85% se lit
  // comme un document illisible. Entre les deux, l'export reduit. Au-dela,
  // il n'y a rien a reduire : il faut couper du texte, et c'est une
  // decision, donc elle est annoncee ici avant de partir.
  const hauteur = hauteurDuDocumentMm(doc);
  if (hauteur > HAUTEUR_MAX_UNE_PAGE_MM) {
    const pages = Math.round((hauteur / HAUTEUR_UNE_PAGE_MM) * 10) / 10;
    d("deborde_page", "longueur", pages + " pages",
      "le CV fait " + String(pages).replace(".", ",") + " page : il ne tient "
      + "pas sur une feuille, meme reduit. Le PDF d'un recruteur fait une "
      + "page, toujours, donc il ne partira pas avant de tenir. Il faut "
      + "raccourcir");
  }

  // 1. DU TEXTE QUI SORT DE LA FEUILLE
  //
  // Lateralement : un mot trop long, un lien non coupe, une colonne trop
  // etroite. Le texte est simplement absent du PDF, sans rien pour le
  // signaler.
  for (const n of el.querySelectorAll("*")) {
    if (n.children.length) continue;
    const t = (n.textContent || "").trim();
    if (!t) continue;
    const r = n.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (r.right > cadre.right + 1.5 || r.left < cadre.left - 1.5) {
      d("deborde", "sur la largeur", t,
        "ce texte sort de la feuille : il sera coupe dans le PDF, et ce qui "
        + "est coupe n'est signale nulle part");
    }
  }

  // 2. UN TITRE DE SECTION SEUL EN BAS DE PAGE
  //
  // Le titre reste sur une page et son contenu passe a la suivante. A la
  // lecture, la section a l'air vide.
  const HAUTEUR_PAGE = 1122.5;  // 297mm a 96 points par pouce
  if (cadre.height > HAUTEUR_PAGE) {
    const titres = [...el.querySelectorAll("*")].filter((n) => {
      if (n.children.length) return false;
      const t = (n.textContent || "").trim();
      if (!t || t.length > 30) return false;
      const cs = getComputedStyle(n);
      return parseFloat(cs.fontWeight) >= 600
        && cs.textTransform === "uppercase";
    });
    for (const n of titres) {
      const y = n.getBoundingClientRect().top - cadre.top;
      const dansLaPage = y % HAUTEUR_PAGE;
      if (dansLaPage > HAUTEUR_PAGE - 60) {
        d("titre_orphelin", "bas de page", n.textContent,
          "ce titre de section tombe en bas d'une page et son contenu passe "
          + "a la suivante : la section a l'air vide");
      }
    }
  }

  // 3. DEUX TEXTES QUI SE RECOUVRENT
  //
  // Sur une mise en page a deux colonnes, une colonne trop pleine passe sous
  // l'autre. A l'ecran on croit lire ; dans le PDF les deux se melangent.
  const feuilles = [...el.querySelectorAll("*")].filter((n) => {
    if (n.children.length) return false;
    const t = (n.textContent || "").trim();
    if (t.length < 4) return false;
    const r = n.getBoundingClientRect();
    return r.width > 8 && r.height > 6;
  }).slice(0, 400);
  for (let i = 0; i < feuilles.length; i += 1) {
    const a = feuilles[i].getBoundingClientRect();
    for (let j = i + 1; j < feuilles.length; j += 1) {
      const b = feuilles[j].getBoundingClientRect();
      const surfaceX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const surfaceY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (surfaceX > 6 && surfaceY > 6) {
        d("recouvrement", "mise en page", feuilles[i].textContent,
          "deux textes se recouvrent : dans le PDF ils se melangent et "
          + "deviennent illisibles tous les deux");
        i = feuilles.length;  // un seul suffit a alerter
        break;
      }
    }
  }

  return out;
}

// Ce qu'on affiche a la personne, dans l'ordre ou ca compte pour elle.
const ORDRE = ["sans_nom", "sans_contact", "recouvrement", "deborde",
  "cadratin", "coupe", "placeholder", "creuse", "annee_doublee", "phrase",
  "poste_anonyme", "poste_muet", "doublon", "titre_orphelin",
  "langue_sans_nom"];

export function trierLesDefauts(liste) {
  return [...(liste || [])].sort(
    (a, b) => ORDRE.indexOf(a.cle) - ORDRE.indexOf(b.cle));
}
