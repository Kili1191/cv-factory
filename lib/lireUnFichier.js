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
    const lignesDeLaPage = (items) => {
      const frags = items
        .filter((it) => it && typeof it.str === "string" && it.str.trim())
        .map((it) => {
          const t = it.transform || [1, 0, 0, 1, 0, 0];
          return { texte: it.str, x: t[4], y: t[5], h: Math.abs(t[3]) || 10 };
        });
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

    const lireAvec = async (opts) => {
      const pdf = await pdfjsLib.getDocument({ data: buf.slice(0), ...opts }).promise;
      let out = "";
      for (let i = 1; i <= pdf.numPages; i += 1) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        out += lignesDeLaPage(content.items).join("\n") + "\n\n";
      }
      return out.trim();
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

  const texte = await texteDuFichier(fichier, messages);
  if (!String(texte || "").trim()) {
    return { genre: "refus", raison: messages.format || "Format non lu" };
  }
  return { genre: "texte", texte: texte.trim(), nom: fichier.name || "" };
}
