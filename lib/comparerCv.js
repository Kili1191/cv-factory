/**
 * COMPARER DEUX VERSIONS D'UN CV, EXACTEMENT
 *
 * La comparaison partait au modele avec les deux CV mis a plat, et on lui
 * demandait de "lister les changements concrets, maximum 8, en ignorant les
 * details mineurs". Trois choses clochent, dans l'ordre de gravite :
 *
 *   1. Un diff n'est pas une opinion. Comparer deux objets champ par champ
 *      est mecanique et exact. Confie a un modele, ca devient approximatif :
 *      il peut oublier un changement, en inventer un, ou en fusionner deux.
 *      Quelqu'un qui compare deux versions de SON CV veut savoir ce qui a
 *      change - pas ce qu'un lecteur a cru voir changer.
 *   2. "Maximum 8, ignore les details mineurs" lui faisait choisir ce qui
 *      compte. Une puce chiffree remplacee par une formule molle est un
 *      detail pour un resumeur et une catastrophe pour un candidat.
 *   3. Ca coutait un appel et plusieurs secondes pour une question dont la
 *      reponse etait deja entierement contenue dans les deux objets.
 *
 * LE VERDICT AUSSI SE MESURE
 *
 * "Qui est meilleur" avait l'air d'un jugement. lib/diagnostic.js note deja
 * un CV sans rien deviner ; on note les deux et on annonce l'ecart avec sa
 * raison - "B l'emporte, 78 contre 64, surtout sur les puces". Reproductible,
 * et l'utilisateur peut verifier axe par axe au lieu de croire sur parole.
 */

import { diagnostiquer } from "./diagnostic.js";

const norm = (v) => String(v == null ? "" : v).replace(/\s+/g, " ").trim();
const memeTexte = (a, b) => norm(a) === norm(b);

/** Les listes se comparent par contenu, pas par ordre : reordonner n'est pas changer. */
function ecartListe(a, b) {
  const A = (a || []).map(norm).filter(Boolean);
  const B = (b || []).map(norm).filter(Boolean);
  const sa = new Set(A), sb = new Set(B);
  return {
    ajoutes: B.filter((x) => !sa.has(x)),
    retires: A.filter((x) => !sb.has(x)),
  };
}

/** Une experience se reconnait a son employeur et son intitule, pas a son rang. */
function cle(e) {
  return norm((e && e.company) || "") + "|" + norm((e && e.title) || "");
}

function comparerExperiences(a, b, diffs) {
  const A = (a || []), B = (b || []);
  const parCle = new Map(A.map((e) => [cle(e), e]));
  const vues = new Set();

  for (const nb of B) {
    const k = cle(nb);
    const na = parCle.get(k);
    if (!na) {
      diffs.push({ field: "experience", type: "added",
        old: "", new: (nb.title || "") + (nb.company ? " - " + nb.company : "") });
      continue;
    }
    vues.add(k);
    if (!memeTexte(na.period, nb.period)) {
      diffs.push({ field: "experience.period", type: "changed",
        old: (na.title || k) + " : " + norm(na.period),
        new: (nb.title || k) + " : " + norm(nb.period) });
    }
    // Les puces portent tout le poids d'une experience : on les compare une
    // a une, sans plafond. C'est la ou un resume "maximum 8" perdait le plus.
    const { ajoutes, retires } = ecartListe(na.bullets, nb.bullets);
    for (const t of ajoutes) {
      diffs.push({ field: "experience.bullet", type: "added",
        old: "", new: (nb.title || k) + " : " + t });
    }
    for (const t of retires) {
      diffs.push({ field: "experience.bullet", type: "removed",
        old: (na.title || k) + " : " + t, new: "" });
    }
  }
  for (const na of A) {
    const k = cle(na);
    if (!vues.has(k) && !B.some((x) => cle(x) === k)) {
      diffs.push({ field: "experience", type: "removed",
        old: (na.title || "") + (na.company ? " - " + na.company : ""), new: "" });
    }
  }
}

const MOTS = {
  fr: {
    titre: "intitule", accroche: "accroche", competence: "competence",
    langue: "langue", certification: "certification", poste: "poste",
    puce: "puce", periode: "periode",
    rien: "Les deux versions disent exactement la meme chose.",
    egal: "Les deux versions se valent a la mesure.",
  },
  en: {
    titre: "title", accroche: "summary", competence: "skill",
    langue: "language", certification: "certification", poste: "role",
    puce: "bullet", periode: "period",
    rien: "Both versions say exactly the same thing.",
    egal: "Both versions measure the same.",
  },
};

/**
 * Rend exactement la forme que l'ecran de comparaison consomme deja
 * ({ summary, diffs, verdict, winner }), sans reseau et sans modele.
 */
export function comparerCv(cvA, cvB, langue = "fr") {
  const L = MOTS[langue] ? langue : "fr";
  const M = MOTS[L];
  const a = cvA || {}, b = cvB || {};
  const diffs = [];

  for (const [champ, nom] of [["title", M.titre], ["summary", M.accroche]]) {
    if (!memeTexte(a[champ], b[champ])) {
      diffs.push({ field: champ, type: "changed", nom,
        old: norm(a[champ]), new: norm(b[champ]) });
    }
  }

  comparerExperiences(a.experience, b.experience, diffs);

  for (const [champ, nom] of [["skills", M.competence],
    ["certifications", M.certification]]) {
    const { ajoutes, retires } = ecartListe(a[champ], b[champ]);
    for (const t of ajoutes) diffs.push({ field: champ, type: "added", nom, old: "", new: t });
    for (const t of retires) diffs.push({ field: champ, type: "removed", nom, old: t, new: "" });
  }

  {
    const nom = (x) => (x && (x.lang || x)) || "";
    const { ajoutes, retires } = ecartListe((a.languages || []).map(nom),
      (b.languages || []).map(nom));
    for (const t of ajoutes) diffs.push({ field: "languages", type: "added", nom: M.langue, old: "", new: t });
    for (const t of retires) diffs.push({ field: "languages", type: "removed", nom: M.langue, old: t, new: "" });
  }

  // Le verdict se mesure au lieu de se decreter : les deux CV passent par le
  // meme juge, et on annonce l'ecart avec l'axe qui le fait.
  const da = diagnostiquer(a, L);
  const db = diagnostiquer(b, L);
  const ecart = db.global_score - da.global_score;
  const winner = Math.abs(ecart) < 3 ? "tie" : (ecart > 0 ? "B" : "A");

  let axe = null;
  let plusGrand = 0;
  for (const sb of db.scores) {
    const sa = da.scores.find((x) => x.id === sb.id);
    if (!sa) continue;
    const d = Math.abs(sb.score - sa.score);
    if (d > plusGrand) { plusGrand = d; axe = sb.id; }
  }

  const compte = {
    ajout: diffs.filter((d) => d.type === "added").length,
    retire: diffs.filter((d) => d.type === "removed").length,
    change: diffs.filter((d) => d.type === "changed").length,
  };

  const summary = !diffs.length ? M.rien : (L === "en"
    ? `${compte.change} changed, ${compte.ajout} added, ${compte.retire} removed.`
    : `${compte.change} modifie(s), ${compte.ajout} ajoute(s), ${compte.retire} retire(s).`);

  const verdict = winner === "tie"
    ? `${M.egal} A ${da.global_score}/100, B ${db.global_score}/100.`
    : (L === "en"
      ? `${winner} scores ${Math.max(da.global_score, db.global_score)}/100 against `
        + `${Math.min(da.global_score, db.global_score)}`
        + (axe ? `, mostly on ${axe}.` : ".")
      : `${winner} obtient ${Math.max(da.global_score, db.global_score)}/100 contre `
        + `${Math.min(da.global_score, db.global_score)}`
        + (axe ? `, surtout sur ${axe}.` : "."));

  return { summary, diffs, verdict, winner, scoreA: da.global_score, scoreB: db.global_score };
}
