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

    const lireAvec = async (opts) => {
      const pdf = await pdfjsLib.getDocument({ data: buf.slice(0), ...opts }).promise;
      let out = "";
      for (let i = 1; i <= pdf.numPages; i += 1) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        out += content.items.map((it) => it.str).join(" ") + "\n\n";
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
