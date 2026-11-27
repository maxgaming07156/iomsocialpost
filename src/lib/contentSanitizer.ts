const EXTERNAL_PUBLISHER_PATTERNS: RegExp[] = [
  /\b(?:according to|as reported by|reported by|via|courtesy of|source:)\s+(?:bbc(?:\s+isle\s+of\s+man)?|manx\s+radio|isle\s+of\s+man\s+today|iom\s+today|3fm|energy\s+fm|gef(?:\s+the\s+mongoose)?|isle\s+of\s+man\s+government|gov\.im)\b[:,]?\s*/gi,
  /\b(?:bbc\s+isle\s+of\s+man|bbc\s+news|bbc|manx\s+radio|isle\s+of\s+man\s+today|iom\s+today|3fm|energy\s+fm|gef\s+the\s+mongoose)\b/gi,
];

const EXTERNAL_URL_REGEX = /https?:\/\/(?!insidetheiom\.com\b)[^\s)]+/gi;

/**
 * Removes external publisher names, attribution phrases, and external URLs
 * from public-facing copy (headlines, graphic descriptions, captions).
 */
export function sanitizePublicCopy(
  input: string,
  options: { includeWebsiteCta?: boolean } = {}
): string {
  let text = String(input || "").trim();
  if (!text) return "";

  // Replace "Read more: <external url>" or standalone external URLs
  text = text.replace(/read\s+more\s*:?\s*https?:\/\/(?!insidetheiom\.com\b)[^\s)]+/gi, "");
  text = text.replace(EXTERNAL_URL_REGEX, "");

  for (const pattern of EXTERNAL_PUBLISHER_PATTERNS) {
    text = text.replace(pattern, "");
  }

  // Clean up leftover punctuation/whitespace artifacts
  text = text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/read\s+more\s*:\s*$/gim, "")
    .trim();

  if (options.includeWebsiteCta) {
    const hasIomCta = /insidetheiom\.com/i.test(text);
    if (!hasIomCta) {
      text = `${text}\n\nRead more at https://insidetheiom.com`;
    }
  }

  return text;
}

/**
 * Cleans graphic headline or supporting description (never includes URLs or hashtags).
 */
export function sanitizeGraphicText(input: string): string {
  return sanitizePublicCopy(input, { includeWebsiteCta: false })
    .replace(/#\w+/g, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

const DEFAULT_IOM_HASHTAGS = [
  "#IsleOfMan",
  "#InsideTheIOM",
  "#ManxNews",
  "#IsleOfManNews",
  "#ManxLife",
  "#IOM",
  "#ManxCommunity",
  "#DiscoverIOM",
];

/**
 * Deduplicates hashtags case-insensitively and ensures 8–12 relevant tags.
 */
export function normalizeHashtags(rawTags: string[]): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const raw of rawTags) {
    const trimmed = String(raw || "").trim();
    if (!trimmed) continue;
    const formatted = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    const key = formatted.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(formatted);
    if (cleaned.length >= 12) break;
  }

  for (const fallback of DEFAULT_IOM_HASHTAGS) {
    if (cleaned.length >= 8) break;
    const key = fallback.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      cleaned.push(fallback);
    }
  }

  return cleaned.slice(0, 12);
}
