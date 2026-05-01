const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const MODEL_DEFAULT = "claude-sonnet-4-6";

const NO_DASH_BLOCK = `IMPORTANT FORMATTING RULE
Never use em dash (U+2014) or en dash (U+2013) characters anywhere in your output.
Use commas, parentheses, or rephrase the sentence instead.
This rule is absolute and overrides any other instruction.`;

const JSON_FORMAT_BLOCK = `RESPONSE FORMAT
When the user asks for structured data, respond ONLY with valid JSON.
No preamble, no markdown code fences, no explanation outside the JSON object.
Strings inside JSON must respect the formatting rule above.`;

const QUALITY_BLOCK = `QUALITY GUIDELINES
Be precise and concrete. Avoid vague phrases like very, really, quite.
Use active voice. Quantify when possible (numbers, percentages, ranges).
Match the requested language exactly (French or English) without mixing.`;

function buildSystemBlocks(cvContext) {
  const blocks = [
    { type: "text", text: NO_DASH_BLOCK, cache_control: { type: "ephemeral" } },
    { type: "text", text: JSON_FORMAT_BLOCK, cache_control: { type: "ephemeral" } },
    { type: "text", text: QUALITY_BLOCK },
  ];

  if (cvContext && typeof cvContext === "string" && cvContext.length > 0) {
    blocks.push({
      type: "text",
      text: `CURRENT CV CONTEXT
The user is working on the following CV. Use it as the source of truth for any task that requires knowledge of their experience, skills, or background.

${cvContext}`,
      cache_control: { type: "ephemeral" },
    });
  }

  return blocks;
}

function pickMaxTokens(requestedMax) {
  if (typeof requestedMax === "number" && requestedMax > 0 && requestedMax <= 16000) {
    return requestedMax;
  }
  return 8000;
}

export async function POST(request) {
  const startTime = Date.now();
  let taskName = "unknown";

  try {
    const body = await request.json();
    const {
      prompt,
      messages: providedMessages,
      cv_context: cvContext,
      max_tokens: requestedMaxTokens,
      temperature: requestedTemperature,
      task_name: requestedTaskName,
    } = body || {};

    if (typeof requestedTaskName === "string" && requestedTaskName.length > 0) {
      taskName = requestedTaskName;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: { message: "ANTHROPIC_API_KEY missing in env" } }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const max_tokens = pickMaxTokens(requestedMaxTokens);
    const temperature =
      typeof requestedTemperature === "number" &&
      requestedTemperature >= 0 &&
      requestedTemperature <= 1
        ? requestedTemperature
        : 0.7;

    const messages = Array.isArray(providedMessages) && providedMessages.length > 0
      ? providedMessages
      : prompt
      ? [{ role: "user", content: prompt }]
      : [];

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ error: { message: "Missing prompt or messages" } }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const system = buildSystemBlocks(cvContext);

    const upstreamRes = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_DEFAULT,
        max_tokens,
        temperature,
        system,
        messages,
      }),
    });

    const data = await upstreamRes.json();
    const elapsed = Date.now() - startTime;

    if (!upstreamRes.ok) {
      return new Response(
        JSON.stringify({
          error: {
            message:
              (data && data.error && data.error.message) ||
              `Anthropic API error ${upstreamRes.status}`,
            type: (data && data.error && data.error.type) || "api_error",
          },
        }),
        { status: upstreamRes.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const usage = data.usage || {};
    const cacheReadTokens = usage.cache_read_input_tokens || 0;
    const cacheCreationTokens = usage.cache_creation_input_tokens || 0;
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;

    const response = {
      ...data,
      _cvf_meta: {
        task_name: taskName,
        elapsed_ms: elapsed,
        cache_read_tokens: cacheReadTokens,
        cache_creation_tokens: cacheCreationTokens,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: {
          message: err && err.message ? err.message : "Unknown server error",
          type: "internal_error",
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const maxDuration = 60;
