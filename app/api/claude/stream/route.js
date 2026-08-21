// Reponse en flux, pour l'assistant d'entretien.
//
// POURQUOI UNE ROUTE SEPAREE
//
// L'autre route attend la reponse complete avant de rendre quoi que ce soit.
// Pour un CV c'est sans importance : trois secondes de plus ne changent rien.
// Pendant un entretien, si.
//
// Ici le premier mot doit apparaitre avant que le recruteur ait fini sa
// phrase. Trois choix vont dans ce sens et aucun n'est negociable :
//
//   1. Le flux. On renvoie les jetons au fur et a mesure. Ce qui compte n'est
//      pas la duree totale mais le delai avant le premier mot.
//   2. Claude Haiku 4.5. C'est le modele le plus rapide de la famille. Ce
//      n'est pas une economie : c'est la seule facon d'obtenir une reponse
//      conversationnelle. Le raisonnement, precieux pour ecrire un CV, coute
//      ici des secondes avant le premier jeton.
//   3. Une reponse courte. On demande des reperes, pas un texte. Personne ne
//      peut lire un paragraphe en repondant a quelqu'un.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL_LIVE = "claude-haiku-4-5";
const MAX_TOKENS_LIVE = 400;

export const maxDuration = 60;

export async function POST(request) {
  try {
    const body = await request.json();
    const { system, messages } = body || {};

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: { message: "ANTHROPIC_API_KEY missing in env" } }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: { message: "Missing messages" } }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const upstream = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_LIVE,
        max_tokens: MAX_TOKENS_LIVE,
        stream: true,
        system: typeof system === "string" ? system : undefined,
        messages,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: { message: detail || `Anthropic ${upstream.status}` } }),
        { status: upstream.status || 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // On ne renvoie que le texte, pas le protocole d'evenements : le client
    // n'a rien a analyser, il concatene ce qui arrive.
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";

    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body.getReader();
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // Les evenements arrivent separes par une ligne vide.
            let cut;
            while ((cut = buffer.indexOf("\n\n")) !== -1) {
              const chunk = buffer.slice(0, cut);
              buffer = buffer.slice(cut + 2);
              for (const line of chunk.split("\n")) {
                if (!line.startsWith("data:")) continue;
                const payload = line.slice(5).trim();
                if (!payload || payload === "[DONE]") continue;
                try {
                  const evt = JSON.parse(payload);
                  if (evt.type === "content_block_delta"
                      && evt.delta && typeof evt.delta.text === "string") {
                    controller.enqueue(encoder.encode(evt.delta.text));
                  }
                } catch { /* un evenement illisible ne doit pas couper le flux */ }
              }
            }
          }
        } catch (err) {
          controller.enqueue(encoder.encode("\n[flux interrompu]"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: { message: (err && err.message) || "erreur" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
