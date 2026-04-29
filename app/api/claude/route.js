// Endpoint serverless qui appelle l'API Anthropic depuis le serveur.
// La cle API est stockee dans process.env.ANTHROPIC_API_KEY (jamais expose au client).

export const runtime = "edge";

export async function POST(req) {
  try {
    const { prompt, max_tokens = 2000, model = "claude-sonnet-4-5" } = await req.json();

    if (!prompt) {
      return Response.json({ error: { message: "prompt requis" } }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: { message: "ANTHROPIC_API_KEY non configuree sur le serveur" } },
        { status: 500 }
      );
    }

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await r.json();
    return Response.json(data, { status: r.status });
  } catch (e) {
    return Response.json(
      { error: { message: "Erreur serveur: " + e.message } },
      { status: 500 }
    );
  }
}
