// app/api/claude/route.js
//
// Route API qui relaie les requetes vers Anthropic avec :
// - timeout etendu a 60s (vs 10s par defaut sur Vercel Hobby) pour eviter les 504
// - gestion d'erreur claire renvoyee au client (status code Anthropic propage)
// - pas de cle API cote client : tout passe par cette route serveur
//
// Pour le bon fonctionnement il faut definir ANTHROPIC_API_KEY dans
// les Environment Variables de Vercel (Settings > Environment Variables)
// OU dans .env.local en local.

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_RULES =
  "Tu es un assistant qui produit du contenu professionnel pour un editeur de CV. "
  + "Regle stricte: n'utilise JAMAIS de tirets cadratin (em dash) ou demi-cadratin (en dash) "
  + "dans tes reponses. Utilise uniquement des virgules, parentheses, ou tirets simples. "
  + "Quand on te demande du JSON, reponds UNIQUEMENT avec du JSON valide strict, sans markdown, sans backticks, sans commentaire.";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: { message: "Body invalide" } },
      { status: 400 }
    );
  }

  const { prompt } = body || {};
  if (!prompt || typeof prompt !== "string") {
    return Response.json(
      { error: { message: "Champ 'prompt' manquant ou invalide" } },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: { message: "ANTHROPIC_API_KEY non configuree sur le serveur" } },
      { status: 500 }
    );
  }

  // AbortController pour eviter de tenir Vercel jusqu'a la limite de 60s
  // si Anthropic met trop de temps. On laisse 55s a Anthropic, 5s de marge.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: SYSTEM_RULES,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    const data = await r.json();

    if (!r.ok) {
      // Anthropic renvoie { type: 'error', error: { type, message } }
      const msg =
        (data && data.error && data.error.message) ||
        ("Erreur Anthropic " + r.status);
      return Response.json(
        { error: { message: msg, status: r.status } },
        { status: r.status }
      );
    }

    return Response.json(data);
  } catch (err) {
    clearTimeout(timer);
    const isAbort = err && (err.name === "AbortError" || err.code === "ABORT_ERR");
    const msg = isAbort
      ? "Timeout: Anthropic met plus de 55s a repondre. Reessaie ou reduis le contenu du CV."
      : "Erreur reseau: " + (err && err.message ? err.message : String(err));
    return Response.json(
      { error: { message: msg } },
      { status: isAbort ? 504 : 500 }
    );
  }
}
