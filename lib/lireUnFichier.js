/**
 * LIRE UN FICHIER DEPOSE, SANS RIEN ENVOYER QUAND CE N'EST PAS NECESSAIRE
 *
 * Cette lecture existait deja, enfermee dans l'ecran d'accueil. Le coach en a
 * besoin a son tour : on peut desormais lui deposer un CV ou une annonce. La
 * recopier aurait donne deux lectures - et la seconde n'aurait pas eu le
 * garde-fou du worker ci-dessous, qui n'est pas un detail mais le resultat
 * d'une panne reelle.
 *
 * TEXTE : RIEN NE SORT DU NAVIGATEUR
 *
 * Un PDF, un .docx ou un .txt sont lus sur place. Le texte extrait part
 * ensuite dans la conversation comme si la personne l'avait colle
 * elle-meme - pas comme une piece jointe a faire analyser. Un CV de trois
 * pages coute donc le prix de son texte, pas celui d'une image.
 *
 * IMAGE : LA SEULE PIECE QUI DOIT VRAIMENT PARTIR
 *
 * Une capture d'ecran d'annonce ou un CV scanne n'a pas de texte a extraire
 * ici. Elle est donc encodee et envoyee au modele, qui sait la lire. C'est
 * le seul cas ou le fichier lui-meme quitte l'appareil, et l'interface le dit
 * avant l'envoi plutot qu'apres.
 */

// Ce que le modele accepte comme image. Un format hors liste part sinon en
// erreur cote API, apres l'attente et le cout du televersement.
const IMAGES = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  webp: "image/webp", gif: "image/gif",
};

// Au-dela, une image est refusee par l'API. Mieux vaut le dire tout de suite
// que faire patienter quelqu'un devant un envoi condamne.
export const MAX_IMAGE = 5 * 1024 * 1024;

export function extensionDe(fichier) {
  const nom = String((fichier && fichier.name) || "").toLowerCase();
  return nom.includes(".") ? nom.split(".").pop() : "";
}

export function estUneImage(fichier) {
  const ext = extensionDe(fichier);
  const type = (fichier && fichier.type) || "";
  return !!IMAGES[ext] || type.startsWith("image/");
}

/** Le type MIME que l'API attend, deduit du fichier. */
export function typeImage(fichier) {
  const ext = extensionDe(fichier);
  if (IMAGES[ext]) return IMAGES[ext];
  const t = (fichier && fichier.type) || "";
  return t.startsWith("image/") ? t : "image/png";
}

// A HIDDEN TEXT LAYER THAT STOPS MID-SENTENCE
//
// The product's own picture exports, until 5 September 2026, carried an
// invisible text layer under the photo of the CV, and that layer was cut at
// the right edge of every line: the picture read "Ran structured listening
// conversations with clients across the Middle East, Europe and Asia", the
// layer said "... Europe an". Someone who re-imported one of those downloads
// got a CV with every long bullet amputated, and nothing said why. Scanned
// PDFs with an OCR layer fail the same way, with worse misreadings.
//
// A wrapped sentence in a real text PDF also ends its first line without
// punctuation, so that alone proves nothing. What proves the cut is the
// NEXT line: a wrapped sentence continues in lowercase, a cut one is
// followed by a fresh item that starts with a capital or a bullet. Ending
// on a function word ("by", "an", "the") is the strongest sign: nobody
// writes a bullet that ends on "by". Three orphaned long lines count too,
// because the layer of a whole CV rarely cuts on function words only.
//
// This lookup only decides on a page that IS a picture (see below): a real
// text PDF never takes the photo path, whatever its line endings.
const MOT_OUTIL = /\b(a|an|the|and|or|to|of|by|with|for|in|on|at|from|that|which|into|as|de|la|le|les|et|ou|pour|par|avec|sur|dans|au|aux|du|des|un|une)$/i;
const FIN_DE_PHRASE = /[.!?:;)"\u00bb%\d]$/;

export function lignesCoupees(lignes) {
  let surOutil = 0;
  let sansFin = 0;
  const L = (Array.isArray(lignes) ? lignes : []).map((l) => String(l || "").trim());
  for (let i = 0; i < L.length; i += 1) {
    const l = L[i];
    if (l.length < 40 || FIN_DE_PHRASE.test(l)) continue;
    const suivante = L[i + 1] || "";
    if (/^[a-z\u00e0-\u00ff]/.test(suivante)) continue;
    sansFin += 1;
    if (MOT_OUTIL.test(l)) surOutil += 1;
  }
  return { surOutil, sansFin };
}

export function laCoucheTexteEstCoupee(lignes) {
  const c = lignesCoupees(lignes);
  return c.surOutil >= 1 || c.sansFin >= 3;
}

// The longest edge the vision model reads without shrinking the picture
// first. Larger costs upload time for nothing; smaller loses 9pt text.
const BORD_LE_PLUS_LONG = 1568;

// Pages sent as pictures, at most. A CV is one or two pages; beyond three
// the request grows past what the route accepts in one go.
const PAGES_EN_PHOTO = 3;

/**
 * A PDF, read on the device: its text as lines, page by page, and for each
 * page whether it is a picture with text on top rather than text on paper.
 * `pdf` and `pages` stay open so the caller can render a page when the text
 * turns out not to be trustworthy.
 */
// A PAGE IN TWO COLUMNS IS READ COLUMN BY COLUMN
//
// pdf.js hands fragments placed on the page, and lines were rebuilt from
// their height alone: on a page with a narrow column beside the main one,
// each rebuilt line took a piece of both, "Top Skills" glued to a job
// title. That is the shape of a LinkedIn profile saved as PDF (contact,
// skills and languages down the left, the profile on the right) and of
// most two-column templates people import from Canva or Word.
//
// A column shows as a vertical band that no fragment crosses. Header
// lines are allowed to span both, a name across the top does: only
// fragments below the top quarter of the text decide. On a single-column
// CV every bullet runs to the right margin and crosses every candidate
// band, so nothing is split there, whatever the dates on the right do.
// The two sides must each be a real column: lines that are words, not a
// column of periods, with a long line among them, and they must share
// the page vertically, or a heading above a body would count as two.
// The wider side is the profile and comes first; the narrow one, contact
// and skills, comes after, which is where a reader expects them.
const LIGNE_DE_DATES = new RegExp(
  "^[\\s(]*(?:[a-z\\u00e0-\\u00ff.]+\\s+)?(?:19|20)\\d{2}"
  + "(?:\\s*(?:[-\\u2013\\u2014]|to|a|au)\\s*(?:(?:[a-z\\u00e0-\\u00ff.]+\\s+)?(?:19|20)\\d{2}"
  + "|present|actuel|aujourd'hui|now|today|ce jour))?[\\s)]*$", "i");

export function enColonnes(frags, largeur) {
  if (frags.length < 12 || !(largeur > 0)) return null;
  let haut = -Infinity, bas = Infinity;
  for (const f of frags) { if (f.y > haut) haut = f.y; if (f.y < bas) bas = f.y; }
  if (haut - bas < 120) return null;
  const plafond = haut - (haut - bas) * 0.25;
  const corps = frags.filter((f) => f.y < plafond);
  if (corps.length < 10) return null;

  // The free vertical bands, scanned across the middle of the page.
  const pas = 3;
  const libre = [];
  for (let g = largeur * 0.15; g <= largeur * 0.65; g += pas) {
    libre.push({ g, ok: !corps.some((f) => f.x < g - 1 && f.x + f.w > g + 1) });
  }
  const bandes = [];
  let debut = null;
  for (let i = 0; i <= libre.length; i += 1) {
    const l = libre[i];
    if (l && l.ok) { if (debut === null) debut = l.g; continue; }
    if (debut !== null) { bandes.push([debut, libre[i - 1].g]); debut = null; }
  }

  const lignesDistinctes = (fs) => {
    const ys = [...new Set(fs.map((f) => Math.round(f.y / 3)))];
    return ys.length;
  };
  const texteDe = (fs) => {
    // One string per baseline, to judge lines and not fragments.
    const parY = new Map();
    for (const f of fs) { const k = Math.round(f.y / 3); parY.set(k, (parY.get(k) || "") + " " + f.texte); }
    return [...parY.values()].map((t) => t.replace(/\s+/g, " ").trim());
  };
  const estUneColonne = (fs) => {
    if (lignesDistinctes(fs) < 4) return false;
    const lignes = texteDe(fs);
    const mots = lignes.filter((t) => (t.match(/[a-z\u00e0-\u00ff]/gi) || []).length >= 3 && !LIGNE_DE_DATES.test(t));
    return mots.length >= 3 && mots.length >= lignes.length * 0.4 && mots.some((t) => t.length > 25);
  };
  const etendue = (fs) => {
    let a = Infinity, b = -Infinity;
    for (const f of fs) { if (f.y < a) a = f.y; if (f.y > b) b = f.y; }
    return [a, b];
  };

  let meilleure = null;
  for (const [g0, g1] of bandes) {
    if (g1 - g0 < 8) continue;
    // A fragment that starts in the narrow column and runs into the band,
    // an e-mail or a profile link longer than its column, still belongs to
    // that column: it reaches the other one only when it ends past it.
    const gauche = frags.filter((f) => f.x + f.w <= g1 - 1 && f.x < g0 + 1);
    const droite = frags.filter((f) => f.x >= g0 + 1);
    if (!estUneColonne(gauche) || !estUneColonne(droite)) continue;
    const [ga, gb] = etendue(gauche), [da, db] = etendue(droite);
    const commun = Math.min(gb, db) - Math.max(ga, da);
    if (commun < Math.min(gb - ga, db - da) * 0.4) continue;
    if (!meilleure || g1 - g0 > meilleure.largeur) meilleure = { g0, g1, gauche, droite, largeur: g1 - g0 };
  }
  if (!meilleure) return null;
  const { gauche, droite } = meilleure;
  const dedans = new Set([...gauche, ...droite]);
  const entete = frags.filter((f) => !dedans.has(f));
  const poids = (fs) => fs.reduce((n, f) => n + f.texte.length, 0);
  const principale = poids(droite) >= poids(gauche) ? droite : gauche;
  const laterale = principale === droite ? gauche : droite;
  return { entete, principale, laterale };
}

async function lirePdfEnDetail(fichier, messages = {}) {
  const pdfjsLib = await import("pdfjs-dist/build/pdf");
  const buf = await fichier.arrayBuffer();

  // LES LIGNES SONT LA STRUCTURE, ET ON LES JETAIT
  //
  // Cette fonction faisait items.map(it => it.str).join(" ") : tous les
  // fragments d'une page colles bout a bout avec des espaces, aucun retour
  // a la ligne. Le texte sortait en UNE seule ligne.
  //
  // Or tout ce qui lit un CV ensuite travaille par lignes. lireUnCv decoupe
  // en blocs, atsParser cherche des intitules de rubrique en debut de ligne.
  // Sur un texte plat ils ne trouvent ni rubrique, ni poste, ni employeur,
  // ni periode. Mesure sur un PDF exporte par le produit lui-meme, qui
  // contient pourtant tout : nom introuvable, zero rubrique, zero poste,
  // zero employeur. Le PDF etait bon et le lecteur etait aveugle.
  //
  // pdf.js ne rend pas de lignes, il rend des fragments places. La ligne se
  // reconstruit depuis leur position verticale, exactement comme le fait
  // poppler, qui sort bien "Jane Doe" puis "Chef de Produit" sur deux
  // lignes a partir du meme fichier.
  //
  // La tolerance verticale s'adapte a la taille du texte plutot que d'etre
  // un nombre fixe : une ligne de titre a 24pt et une puce a 9pt ne se
  // regroupent pas avec le meme ecart, et un seuil unique fusionnerait les
  // petites lignes ou separerait les grandes.
  const lignesDeLaPage = (items, largeurPage) => {
    const frags = items
      .filter((it) => it && typeof it.str === "string" && it.str.trim())
      .map((it) => {
        const t = it.transform || [1, 0, 0, 1, 0, 0];
        const h = Math.abs(t[3]) || 10;
        const w = Number.isFinite(it.width) && it.width > 0 ? it.width : it.str.length * h * 0.5;
        return { texte: it.str, x: t[4], y: t[5], h, w };
      });
    if (!frags.length) return [];

    // A page in two columns is read column by column, main column first.
    const col = enColonnes(frags, largeurPage);
    if (col) return [...lignesDe(col.entete), ...lignesDe(col.principale), ...lignesDe(col.laterale)];
    return lignesDe(frags);
  };

  const lignesDe = (frags) => {
    if (!frags.length) return [];
    // Du haut vers le bas : en PDF l'ordonnee croit vers le haut.
    frags.sort((a, b) => (b.y - a.y) || (a.x - b.x));

    const lignes = [];
    let courante = [frags[0]];
    for (let i = 1; i < frags.length; i += 1) {
      const f = frags[i];
      const ref = courante[courante.length - 1];
      const tolerance = Math.max(2, Math.min(ref.h, f.h) * 0.6);
      if (Math.abs(f.y - ref.y) <= tolerance) courante.push(f);
      else { lignes.push(courante); courante = [f]; }
    }
    lignes.push(courante);

    return lignes.map((l) => {
      l.sort((a, b) => a.x - b.x);
      // Deux fragments voisins appartiennent au meme mot quand rien ne les
      // separe : recoller sans espace evite "Pari s" ; en mettre un evite
      // "ParisFrance". On tranche sur l'ecart horizontal.
      let out = "";
      for (let i = 0; i < l.length; i += 1) {
        if (i > 0) {
          const ecart = l[i].x - l[i - 1].x;
          const largeurApprox = l[i - 1].texte.length * l[i - 1].h * 0.5;
          out += ecart - largeurApprox > l[i].h * 0.25 ? " " : "";
        }
        out += l[i].texte;
      }
      return out.replace(/\s+/g, " ").trim();
    }).filter(Boolean);
  };

  // A PAGE THAT IS A PICTURE
  //
  // The picture export draws one image the size of the sheet, then the
  // text on top of it. pdf.js does not say "this page is a photo"; it
  // hands the drawing operators, and the image's drawn size is read off
  // the transform in force when it is painted: "q w 0 0 h x y cm /I0 Do
  // Q", so the matrix at Do is the image's box. An image covering most of
  // the sheet makes the page a picture, whatever text sits over it.
  const pageEstUneImage = async (page) => {
    const OPS = pdfjsLib.OPS;
    const ops = await page.getOperatorList();
    const [x0, y0, x1, y1] = page.view;
    const aire = Math.abs((x1 - x0) * (y1 - y0)) || 1;
    const mul = (a, b) => [
      a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
      a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
      a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
    ];
    const pile = [];
    let m = [1, 0, 0, 1, 0, 0];
    for (let i = 0; i < ops.fnArray.length; i += 1) {
      const fn = ops.fnArray[i];
      if (fn === OPS.save) pile.push(m);
      else if (fn === OPS.restore) m = pile.pop() || m;
      else if (fn === OPS.transform) m = mul(m, ops.argsArray[i]);
      else if (fn === OPS.paintImageXObject || fn === OPS.paintJpegXObject
        || fn === OPS.paintImageXObjectRepeat) {
        const w = Math.hypot(m[0], m[1]);
        const h = Math.hypot(m[2], m[3]);
        if (w * h >= aire * 0.6) return true;
      }
    }
    return false;
  };

  const lireAvec = async (opts) => {
    const pdf = await pdfjsLib.getDocument({ data: buf.slice(0), ...opts }).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      let estImage = false;
      try { estImage = await pageEstUneImage(page); } catch (e) { estImage = false; }
      const vue = page.view || [0, 0, 595, 842];
      pages.push({ page, lignes: lignesDeLaPage(content.items, Math.abs(vue[2] - vue[0])), estImage });
    }
    const texte = pages.map((p) => p.lignes.join("\n")).join("\n\n").trim();
    return { pdf, pages, texte };
  };

  // Le repli doit etre arme AVANT la premiere tentative : pdf.js memorise
  // le resultat de sa mise en place de worker, donc un premier echec reste
  // definitif pour toute la vie de la page. Cette entree pose
  // window.pdfjsWorker, que pdf.js utilise directement si le chargement du
  // script echoue - le code du worker vient alors du bundle, sans reseau.
  try { await import("pdfjs-dist/build/pdf.worker.entry"); } catch (e) { /* repli deja pose */ }
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

  try {
    return await lireAvec({});
  } catch (err) {
    const e = new Error(messages.pdf || "PDF illisible");
    e.cause = err;
    throw e;
  }
}

/**
 * Le texte d'un fichier lisible sur place. Rend "" si le format n'en a pas.
 *
 * `messages` porte les phrases d'erreur pour que cette fonction ne connaisse
 * ni la langue ni le dictionnaire de l'application.
 */
export async function texteDuFichier(fichier, messages = {}) {
  const ext = extensionDe(fichier);
  const type = (fichier && fichier.type) || "";

  if (ext === "txt" || type === "text/plain") {
    return await fichier.text();
  }

  if (ext === "pdf" || type === "application/pdf") {
    const lu = await lirePdfEnDetail(fichier, messages);
    return lu.texte;
  }

  if (ext === "docx" || type.includes("wordprocessingml")) {
    const mammoth = await import("mammoth/mammoth.browser");
    const buf = await fichier.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return result.value;
  }

  return "";
}

/** L'image en base64, sans le prefixe "data:", tel que l'API l'attend. */
export function imageEnBase64(fichier) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("lecture impossible"));
    fr.onload = () => {
      const s = String(fr.result || "");
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    fr.readAsDataURL(fichier);
  });
}

/**
 * Lit un fichier depose et dit ce qu'il faut en faire.
 *
 * Rend { genre: "texte", texte } quand la lecture a eu lieu sur place, ou
 * { genre: "image", base64, media } quand seule une image peut porter
 * l'information. `genre: "refus"` porte la raison, deja formulee.
 */
export async function lireUnFichier(fichier, messages = {}) {
  if (!fichier) return { genre: "refus", raison: messages.vide || "Aucun fichier" };

  if (estUneImage(fichier)) {
    if (fichier.size > MAX_IMAGE) {
      return { genre: "refus", raison: messages.tropGrosse || "Image trop lourde (5 Mo maximum)" };
    }
    return {
      genre: "image",
      base64: await imageEnBase64(fichier),
      media: typeImage(fichier),
      nom: fichier.name || "",
    };
  }

  const ext = extensionDe(fichier);
  const type = (fichier && fichier.type) || "";
  if (ext === "pdf" || type === "application/pdf") {
    const lu = await lirePdfEnDetail(fichier, messages);
    const photo = lu.pages.some((p) => p.estImage);
    const coupee = laCoucheTexteEstCoupee(lu.pages.flatMap((p) => p.lignes));
    if (photo && coupee) {
      // The picture is the document; the layer under it is a copy that lost
      // its line ends. Read the picture, the way a photo of a CV is read.
      const pages = [];
      for (const p of lu.pages.slice(0, PAGES_EN_PHOTO)) {
        pages.push(await photoDeLaPage(p.page));
      }
      return {
        genre: "image", origine: "pdf",
        base64: pages[0], media: "image/png", pages,
        texteDeSecours: lu.texte, nom: fichier.name || "",
      };
    }
    if (!String(lu.texte || "").trim()) {
      return { genre: "refus", raison: messages.format || "Format non lu" };
    }
    return { genre: "texte", texte: lu.texte.trim(), nom: fichier.name || "" };
  }

  const texte = await texteDuFichier(fichier, messages);
  if (!String(texte || "").trim()) {
    return { genre: "refus", raison: messages.format || "Format non lu" };
  }
  return { genre: "texte", texte: texte.trim(), nom: fichier.name || "" };
}

// The page drawn into a canvas, then encoded like a photo: base64 without
// the "data:" prefix, which is what the API expects.
async function photoDeLaPage(page) {
  const base = page.getViewport({ scale: 1 });
  const echelle = BORD_LE_PLUS_LONG / Math.max(base.width, base.height, 1);
  const vp = page.getViewport({ scale: echelle });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(vp.width);
  canvas.height = Math.round(vp.height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  const url = canvas.toDataURL("image/png");
  return url.slice(url.indexOf(",") + 1);
}
