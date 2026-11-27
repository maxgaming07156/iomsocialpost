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
]);

/**
 * Generates a concise Wikimedia Commons search query from a news headline
 * and optional summary, anchored with Isle of Man context when helpful.
 */
export function buildImageSearchQuery(
  headline: string,
  description = ""
): string {
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
    if (keywords.length >= 3) break;
  }

  if (keywords.length === 0) {
    return "Isle of Man";
  }

  return `${keywords.join(" ")} Isle of Man`;
}
