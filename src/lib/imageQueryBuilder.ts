const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "being", "but", "by",
  "can", "could", "did", "do", "does", "for", "from", "had", "has", "have",
  "he", "her", "his", "how", "in", "into", "is", "it", "its", "may", "might",
  "more", "most", "new", "no", "not", "of", "on", "or", "our", "out", "over",
  "read", "said", "says", "set", "she", "should", "so", "some", "such", "than",
  "that", "the", "their", "them", "then", "there", "these", "they", "this",
  "to", "up", "was", "we", "were", "what", "when", "where", "which", "who",
  "will", "with", "would", "you", "your",
  "isle", "man", "manx", "iom", "insidetheiom", "breaking", "news", "update",
  "report", "reports", "announces", "announced", "confirms", "confirmed",
  "local", "island", "residents", "people", "public", "year", "years",
]);

const NON_PHOTO_PENALTY_TERMS = [
  "map", "outline", "certificate", "document", "scan", "diagram", "chart",
  "graph", "logo", "flag", "coat of arms", "emblem", "seal", "stamp",
  "signature", "screenshot", "locator", "svg", "vector", "drawing", "sketch",
];

interface ContextualRule {
  keywords: string[];
  query: string;
  label: string;
}

const CONTEXTUAL_RULES: ContextualRule[] = [
  {
    keywords: ["detector", "treasure", "coin", "hoard", "ancient", "archaeolog", "viking", "medieval", "museum", "heritage", "excavation"],
    query: "metal detector archaeological coins artefacts",
    label: "Archaeology & Heritage",
  },
  {
    keywords: ["ferry", "steam packet", "sailing", "sailings", "harbour", "harbor", "port", "heysham", "sea terminal", "vessel", "ship", "freight"],
    query: "passenger ferry ship harbour sea",
    label: "Maritime & Ferry",
  },
  {
    keywords: ["tt", "motorcycle", "motorbike", "grandstand", "paddock", "racing", "motorsport", "rider", "circuit", "mountain course"],
    query: "motorcycle racing circuit road",
    label: "Motorsport",
  },
  {
    keywords: ["flight", "airport", "ronaldsway", "loganair", "easyjet", "airline", "aviation", "plane"],
    query: "commercial airplane airport runway",
    label: "Aviation & Travel",
  },
  {
    keywords: ["flood", "coastal", "storm", "weather", "wind", "rain", "gale", "snow", "wave", "sea wall"],
    query: "coastal storm waves seawall",
    label: "Weather & Coast",
  },
  {
    keywords: ["tram", "railway", "train", "bus", "road", "promenade", "traffic", "highway", "infrastructure"],
    query: "heritage tram railway street",
    label: "Transport & Infrastructure",
  },
  {
    keywords: ["christmas", "market", "festival", "concert", "event", "artisan", "food", "poetry", "culture", "art"],
    query: "outdoor market festival stalls",
    label: "Community & Culture",
  },
  {
    keywords: ["hospital", "health", "doctor", "nurse", "noble", "nhs", "medical", "clinic"],
    query: "hospital medical healthcare building",
    label: "Health & Public Services",
  },
  {
    keywords: ["tynwald", "government", "minister", "consultation", "parliament", "policy", "tax", "budget", "business", "enterprise"],
    query: "parliament building government architecture",
    label: "Civic & Economy",
  },
];

export function extractSubjectKeywords(
  headline: string,
  description = ""
): string[] {
  const combined = `${headline} ${description}`
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/#\w+/g, " ")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .toLowerCase();

  const keywords: string[] = [];
  const seen = new Set<string>();

  for (const token of combined.split(/\s+/)) {
    const clean = token.trim();
    if (clean.length < 3) continue;
    if (STOP_WORDS.has(clean)) continue;
    if (/^\d+$/.test(clean)) continue;
    if (seen.has(clean)) continue;
    seen.add(clean);
    keywords.push(clean);
    if (keywords.length >= 5) break;
  }

  return keywords;
}

/**
 * Generates a concise subject-focused search query for Wikimedia Commons / Pexels.
 */
export function buildImageSearchQuery(
  headline: string,
  description = ""
): string {
  const contextual = getContextualFallbackQuery(headline, description);
  const keywords = extractSubjectKeywords(headline, description);

  if (keywords.length === 0) {
    return contextual.query;
  }

  // Use top 3 subject keywords without forcing "Isle of Man" on every query
  // (contextual Isle of Man query is searched separately as a companion)
  return keywords.slice(0, 3).join(" ");
}

export function getContextualFallbackQuery(
  headline: string,
  description = ""
): { query: string; label: string } {
  const haystack = `${headline} ${description}`.toLowerCase();
  for (const rule of CONTEXTUAL_RULES) {
    if (rule.keywords.some((kw) => haystack.includes(kw))) {
      return { query: rule.query, label: rule.label };
    }
  }
  return {
    query: "Isle of Man Douglas harbour landscape",
    label: "Isle of Man Context",
  };
}

/**
 * Scores a candidate photograph (0–100) for editorial relevance & visual suitability.
 */
export function scoreCandidateImage(params: {
  title: string;
  headline: string;
  description: string;
  width: number;
  height: number;
  source: "pexels" | "wikimedia";
}): number {
  const titleLower = params.title.toLowerCase();

  // Reject non-photographic documents, maps, certificates, logos, etc.
  for (const badTerm of NON_PHOTO_PENALTY_TERMS) {
    if (titleLower.includes(badTerm)) {
      return -100;
    }
  }

  let score = params.source === "pexels" ? 20 : 10;
  const keywords = extractSubjectKeywords(params.headline, params.description);

  for (const kw of keywords) {
    if (titleLower.includes(kw)) {
      score += 25;
    }
  }

  // Bonus for contextual domain terms
  const ctx = getContextualFallbackQuery(params.headline, params.description);
  for (const ctxWord of ctx.query.split(/\s+/)) {
    if (ctxWord.length >= 4 && titleLower.includes(ctxWord.toLowerCase())) {
      score += 12;
    }
  }

  // Resolution & 4:5 suitability
  if (params.width >= 1000 && params.height >= 800) {
    score += 15;
  } else if (params.width >= 600 && params.height >= 400) {
    score += 5;
  } else {
    score -= 30;
  }

  // Portrait/square orientation works best for 1080x1350
  if (params.height >= params.width * 0.75) {
    score += 10;
  }

  return score;
}
