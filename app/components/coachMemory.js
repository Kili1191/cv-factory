const KEEP_RECENT_MESSAGES = 3;
const SUMMARY_MAX_BULLETS = 8;

const SIGNAL_KEYWORDS_FR = [
  "objectif", "vise", "cherche", "veut", "souhaite",
  "salaire", "remuneration", "salaire", "k", "k€", "euros",
  "decision", "decide", "choisi", "opte",
  "prochaine", "etape", "action", "candidature",
  "entreprise", "boite", "boss", "manager", "rh",
  "force", "faiblesse", "atout", "limite",
  "experience", "competence", "skill",
  "entretien", "interview", "rdv",
  "doute", "peur", "stress", "blocage",
  "important", "cle", "majeur", "essentiel",
];

const SIGNAL_KEYWORDS_EN = [
  "goal", "target", "looking", "want", "wish",
  "salary", "compensation", "comp", "k$", "dollars",
  "decision", "decide", "chose", "opt",
  "next", "step", "action", "application",
  "company", "boss", "manager", "hr",
  "strength", "weakness", "asset", "limit",
  "experience", "skill", "competence",
  "interview", "meeting",
  "doubt", "fear", "stress", "block",
  "important", "key", "major", "essential",
];

function extractSignalsFromText(text, locale) {
  if (typeof text !== "string" || text.length === 0) return [];
  const lower = text.toLowerCase();
  const keywords = locale === "en" ? SIGNAL_KEYWORDS_EN : SIGNAL_KEYWORDS_FR;
  const sentences = text.split(/[.!?\n]+/).map((s) => s.trim()).filter(Boolean);
  const signals = [];

  for (const sentence of sentences) {
    if (sentence.length < 15 || sentence.length > 250) continue;
    const sentLower = sentence.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (sentLower.includes(kw)) score += 1;
    }
    if (/\d/.test(sentence)) score += 2;
    if (/[A-Z][a-z]+\s[A-Z]/.test(sentence)) score += 1;
    if (sentence.includes("€") || sentence.includes("$") || sentence.includes("k")) score += 1;

    if (score >= 2) {
      signals.push({ text: sentence, score });
    }
  }

  signals.sort((a, b) => b.score - a.score);
  return signals.slice(0, SUMMARY_MAX_BULLETS).map((s) => s.text);
}

export function buildHeuristicSummary(messages, locale = "fr") {
  if (!Array.isArray(messages) || messages.length === 0) return "";

  const userQuestions = [];
  const coachInsights = [];

  for (const msg of messages) {
    if (!msg || !msg.content) continue;
    const content = typeof msg.content === "string" ? msg.content : "";

    if (msg.role === "user") {
      const trimmed = content.trim();
      if (trimmed.length > 0 && trimmed.length < 200) {
        userQuestions.push(trimmed);
      } else if (trimmed.length >= 200) {
        const firstSentence = trimmed.split(/[.!?]/)[0];
        if (firstSentence && firstSentence.length < 200) {
          userQuestions.push(firstSentence + ".");
        }
      }
    } else if (msg.role === "assistant") {
      const insights = extractSignalsFromText(content, locale);
      coachInsights.push(...insights);
    }
  }

  const uniqueInsights = [];
  const seen = new Set();
  for (const insight of coachInsights) {
    const norm = insight.toLowerCase().replace(/\s+/g, " ");
    if (!seen.has(norm)) {
      seen.add(norm);
      uniqueInsights.push(insight);
    }
  }

  const trimmedInsights = uniqueInsights.slice(0, SUMMARY_MAX_BULLETS);

  if (locale === "en") {
    const lines = ["CONVERSATION SUMMARY (earlier messages):"];
    if (userQuestions.length > 0) {
      lines.push("Topics raised by user:");
      const recentQuestions = userQuestions.slice(-5);
      for (const q of recentQuestions) {
        lines.push(`- ${q}`);
      }
    }
    if (trimmedInsights.length > 0) {
      lines.push("Key points from coach so far:");
      for (const i of trimmedInsights) {
        lines.push(`- ${i}`);
      }
    }
    return lines.join("\n");
  }

  const lines = ["RESUME DE LA CONVERSATION (messages anterieurs) :"];
  if (userQuestions.length > 0) {
    lines.push("Sujets evoques par l'utilisateur :");
    const recentQuestions = userQuestions.slice(-5);
    for (const q of recentQuestions) {
      lines.push(`- ${q}`);
    }
  }
  if (trimmedInsights.length > 0) {
    lines.push("Points cles du coach jusqu'ici :");
    for (const i of trimmedInsights) {
      lines.push(`- ${i}`);
    }
  }
  return lines.join("\n");
}

export function buildOptimizedCoachMessages(allMessages, newUserMessage, locale = "fr") {
  if (!Array.isArray(allMessages) || allMessages.length === 0) {
    return [{ role: "user", content: newUserMessage }];
  }

  if (allMessages.length <= KEEP_RECENT_MESSAGES + 1) {
    return [...allMessages, { role: "user", content: newUserMessage }];
  }

  const olderMessages = allMessages.slice(0, -KEEP_RECENT_MESSAGES);
  const recentMessages = allMessages.slice(-KEEP_RECENT_MESSAGES);
  const summary = buildHeuristicSummary(olderMessages, locale);

  const optimized = [
    { role: "user", content: summary },
    {
      role: "assistant",
      content:
        locale === "en"
          ? "Understood. I have the context from our earlier conversation. Continuing from here."
          : "Compris. J'ai le contexte de notre echange precedent. Je continue.",
    },
    ...recentMessages,
    { role: "user", content: newUserMessage },
  ];

  return optimized;
}

export function estimateTokenSavings(allMessages, locale = "fr") {
  if (!Array.isArray(allMessages) || allMessages.length <= KEEP_RECENT_MESSAGES + 1) {
    return { saved: 0, before: 0, after: 0 };
  }

  const totalChars = allMessages.reduce((sum, m) => sum + (m.content ? m.content.length : 0), 0);
  const beforeTokens = Math.round(totalChars / 4);

  const optimized = buildOptimizedCoachMessages(allMessages, "test message", locale);
  const optimizedChars = optimized.reduce((sum, m) => sum + (m.content ? m.content.length : 0), 0);
  const afterTokens = Math.round(optimizedChars / 4);

  return {
    saved: beforeTokens - afterTokens,
    before: beforeTokens,
    after: afterTokens,
    savedRatio: beforeTokens > 0 ? Math.round(((beforeTokens - afterTokens) / beforeTokens) * 100) : 0,
  };
}
