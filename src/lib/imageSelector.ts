import {
  buildImageSearchQuery,
  getContextualFallbackQuery,
  scoreCandidateImage,
} from "@/lib/imageQueryBuilder";

export type LicenceCategory =
  | "PUBLIC_DOMAIN"
  | "CC0"
  | "CC_BY"
  | "CC_BY_SA"
  | "PEXELS"
  | "ARTICLE_ORIGINAL";

export interface OnlineImageResult {
  id: string;
  title: string;
  thumbnailUrl: string;
  originalUrl: string;
  width: number;
  height: number;
  pageUrl: string;
  artist: string;
  sourceName: "Pexels" | "Wikimedia Commons" | "Original Article";
  licenceName: string;
  licenceUrl: string;
  licenceCategory: LicenceCategory;
  requiresAttribution: boolean;
  isShareAlike: boolean;
  shareAlikeNote?: string;
  attributionText: string;
  relevanceScore?: number;
}

export interface AutoSelectImageResponse {
  ok: boolean;
  tier: "original_article" | "online_subject" | "contextual_fallback";
  originalImageChecked: {
    url: string | null;
    usable: boolean;
    reason: string;
  };
  queryUsed: string;
  selected: OnlineImageResult | null;
  candidates: OnlineImageResult[];
  error?: string;
}

interface CommonsImageInfo {
  url?: string;
  thumburl?: string;
  width?: number;
  height?: number;
  mime?: string;
  descriptionurl?: string;
  extmetadata?: Record<string, { value?: string }>;
}

interface CommonsPage {
  pageid?: number;
  title?: string;
  imageinfo?: CommonsImageInfo[];
}

const BLOCKED_URL_PATTERNS = [
  "placeholder",
  "default",
  "logo",
  "favicon",
  "sprite",
  "1x1",
  "pixel",
  "avatar",
  "badge",
  "icon",
  "bbc_news",
  "manxradio",
];

const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

function stripHtml(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function classifyWikimediaLicence(
  shortName: string,
  usageTerms: string
): {
  category: "PUBLIC_DOMAIN" | "CC0" | "CC_BY" | "CC_BY_SA";
  requiresAttribution: boolean;
  isShareAlike: boolean;
  shareAlikeNote?: string;
} | null {
  const combined = `${shortName} ${usageTerms}`.toLowerCase();

  if (
    combined.includes("noncommercial") ||
    combined.includes("non-commercial") ||
    combined.includes("-nc") ||
    combined.includes("noderivatives") ||
    combined.includes("no-derivatives") ||
    combined.includes("-nd") ||
    combined.includes("fair use") ||
    combined.includes("copyrighted free use")
  ) {
    return null;
  }

  if (combined.includes("cc0") || combined.includes("cc-zero")) {
    return { category: "CC0", requiresAttribution: false, isShareAlike: false };
  }

  if (
    combined.includes("public domain") ||
    /\bpd\b/.test(combined) ||
    combined.startsWith("pd-")
  ) {
    return {
      category: "PUBLIC_DOMAIN",
      requiresAttribution: false,
      isShareAlike: false,
    };
  }

  if (
    combined.includes("cc by-sa") ||
    combined.includes("cc-by-sa") ||
    combined.includes("sharealike") ||
    combined.includes("share-alike")
  ) {
    return {
      category: "CC_BY_SA",
      requiresAttribution: true,
      isShareAlike: true,
      shareAlikeNote:
        "ShareAlike (CC BY-SA): requires photographer attribution, and derivative works using this photo must be shared under the same CC BY-SA licence.",
    };
  }

  if (
    combined.includes("cc by") ||
    combined.includes("cc-by") ||
    combined.includes("creative commons attribution")
  ) {
    return {
      category: "CC_BY",
      requiresAttribution: true,
      isShareAlike: false,
    };
  }

  return null;
}

/**
 * Priority 1: Validate an original article image_url from NEWS.
 */
export async function checkOriginalArticleImage(
  rawUrl: string | undefined | null
): Promise<{ usable: boolean; url: string | null; reason: string }> {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) {
    return { usable: false, url: null, reason: "No image_url on article." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { usable: false, url: trimmed, reason: "Invalid image_url." };
  }

  if (parsed.protocol !== "https:") {
    return {
      usable: false,
      url: trimmed,
      reason: "Article image_url is not HTTPS.",
    };
  }

  const lower = trimmed.toLowerCase();
  if (BLOCKED_URL_PATTERNS.some((p) => lower.includes(p))) {
    return {
      usable: false,
      url: trimmed,
      reason: "Article image_url appears to be a publisher logo or placeholder.",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(parsed.toString(), {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent":
          "InsideTheIOMStudio/1.0 (https://insidetheiom.com; editorial-dashboard)",
      },
    });

    if (!res.ok) {
      return {
        usable: false,
        url: trimmed,
        reason: `Upstream returned HTTP ${res.status}.`,
      };
    }

    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!ct.startsWith("image/") || ct.includes("svg")) {
      return {
        usable: false,
        url: trimmed,
        reason: `Unsupported content type (${ct || "unknown"}).`,
      };
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength < 12_000) {
      return {
        usable: false,
        url: trimmed,
        reason: "Image file is too small (< 12 KB) for a 1080×1350 graphic.",
      };
    }

    return {
      usable: true,
      url: trimmed,
      reason: `Verified original article photograph (${Math.round(
        buf.byteLength / 1024
      )} KB).`,
    };
  } catch {
    return {
      usable: false,
      url: trimmed,
      reason: "Could not reach original article image_url.",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Search Pexels Official API (if PEXELS_API_KEY is configured).
 */
export async function searchPexelsImages(
  query: string,
  headline = "",
  description = ""
): Promise<OnlineImageResult[]> {
  const apiKey = process.env.PEXELS_API_KEY?.trim();
  if (!apiKey) return [];

  const endpoint = new URL("https://api.pexels.com/v1/search");
  endpoint.searchParams.set("query", query);
  endpoint.searchParams.set("per_page", "10");
  endpoint.searchParams.set("orientation", "portrait");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(endpoint.toString(), {
      signal: controller.signal,
      cache: "no-store",
      headers: { Authorization: apiKey },
    });

    if (!res.ok) return [];

    const json = (await res.json()) as {
      photos?: Array<{
        id: number;
        width: number;
        height: number;
        url: string;
        photographer: string;
        alt?: string;
        src: { large2x?: string; large?: string; original: string };
      }>;
    };

    const results: OnlineImageResult[] = [];
    for (const p of json.photos || []) {
      const thumb = p.src.large2x || p.src.large || p.src.original;
      const title = p.alt || query;
      const score = scoreCandidateImage({
        title,
        headline: headline || query,
        description,
        width: p.width,
        height: p.height,
        source: "pexels",
      });

      if (score < 0) continue;

      results.push({
        id: `pexels-${p.id}`,
        title,
        thumbnailUrl: thumb,
        originalUrl: p.src.original,
        width: p.width,
        height: p.height,
        pageUrl: p.url,
        artist: p.photographer || "Pexels Photographer",
        sourceName: "Pexels",
        licenceName: "Pexels License",
        licenceUrl: "https://www.pexels.com/license/",
        licenceCategory: "PEXELS",
        requiresAttribution: true,
        isShareAlike: false,
        attributionText: `Photo: ${p.photographer || "Pexels"} / Pexels`,
        relevanceScore: score,
      });
    }

    return results;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchMediaWikiPages(
  baseUrl: string,
  query: string,
  timeoutMs: number
): Promise<CommonsPage[]> {
  const endpoint = new URL(baseUrl);
  endpoint.searchParams.set("action", "query");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("origin", "*");
  endpoint.searchParams.set("generator", "search");
  endpoint.searchParams.set("gsrnamespace", "6");
  endpoint.searchParams.set("gsrsearch", `${query} filetype:bitmap`);
  endpoint.searchParams.set("gsrlimit", "20");
  endpoint.searchParams.set("prop", "imageinfo");
  endpoint.searchParams.set("iiprop", "url|extmetadata|mime|size");
  endpoint.searchParams.set("iiurlwidth", "1080");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint.toString(), {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent":
          "InsideTheIOMStudio/1.0 (https://insidetheiom.com; editorial-dashboard)",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`MediaWiki API returned HTTP ${res.status}.`);
    }

    const data = (await res.json()) as {
      query?: { pages?: Record<string, CommonsPage> };
      error?: { info?: string };
    };

    if (data.error?.info) throw new Error(data.error.info);
    return Object.values(data.query?.pages || {});
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Search Wikimedia Commons (with en.wikipedia.org fallback).
 */
export async function searchWikimediaImages(
  query: string,
  headline = "",
  description = ""
): Promise<OnlineImageResult[]> {
  let pages: CommonsPage[];
  try {
    pages = await fetchMediaWikiPages(
      "https://commons.wikimedia.org/w/api.php",
      query,
      3500
    );
  } catch {
    pages = await fetchMediaWikiPages(
      "https://en.wikipedia.org/w/api.php",
      query,
      10000
    );
  }

  const results: OnlineImageResult[] = [];

  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    if (!info.mime || !ALLOWED_MIMES.has(info.mime)) continue;
    if (!info.thumburl || !info.url) continue;
    if ((info.width || 0) < 600 || (info.height || 0) < 400) continue;

    const meta = info.extmetadata || {};
    const licenceName = stripHtml(meta.LicenseShortName?.value || "");
    const usageTerms = stripHtml(meta.UsageTerms?.value || "");
    const licenceUrl = stripHtml(meta.LicenseUrl?.value || "");

    if (!licenceName && !usageTerms) continue;

    const classified = classifyWikimediaLicence(licenceName, usageTerms);
    if (!classified) continue;

    const cleanTitle = String(page.title || "")
      .replace(/^File:/i, "")
      .replace(/\.[^.]+$/, "")
      .replace(/_/g, " ")
      .trim();

    const descText = stripHtml(meta.ImageDescription?.value || "");
    const score = scoreCandidateImage({
      title: `${cleanTitle} ${descText}`,
      headline: headline || query,
      description,
      width: info.width || 1080,
      height: info.height || 1080,
      source: "wikimedia",
    });

    // Reject maps, certificates, scans, documents, diagrams, flags, logos
    if (score < 0) continue;

    const rawArtist = stripHtml(meta.Artist?.value || "");
    const rawCredit = stripHtml(meta.Credit?.value || "");
    const artist = rawArtist || rawCredit || "Wikimedia Commons contributor";

    results.push({
      id: `wm-${page.pageid || results.length}`,
      title: cleanTitle || "Wikimedia Commons Photograph",
      thumbnailUrl: info.thumburl,
      originalUrl: info.url,
      width: info.width || 1080,
      height: info.height || 1080,
      pageUrl:
        info.descriptionurl ||
        `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title || "")}`,
      artist,
      sourceName: "Wikimedia Commons",
      licenceName: licenceName || usageTerms,
      licenceUrl,
      licenceCategory: classified.category,
      requiresAttribution: classified.requiresAttribution,
      isShareAlike: classified.isShareAlike,
      shareAlikeNote: classified.shareAlikeNote,
      attributionText: classified.requiresAttribution
        ? `Photo: ${artist} / Wikimedia Commons (${licenceName || classified.category})`
        : `Photo: ${artist} / Wikimedia Commons (${licenceName || "Public Domain"})`,
      relevanceScore: score,
    });
  }

  return results;
}

/**
 * Combined search across Pexels + Wikimedia Commons, ranked by relevance score.
 */
export async function searchRankedOnlineImages(
  query: string,
  headline = "",
  description = ""
): Promise<OnlineImageResult[]> {
  const [pexels, wikimedia] = await Promise.all([
    searchPexelsImages(query, headline, description),
    searchWikimediaImages(query, headline, description).catch(() => []),
  ]);

  const combined = [...pexels, ...wikimedia];
  combined.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  return combined;
}

/**
 * Full 3-tier automatic image selection for a news article.
 */
export async function autoSelectArticleImage(params: {
  headline: string;
  description?: string;
  articleImageUrl?: string | null;
}): Promise<AutoSelectImageResponse> {
  const { headline, description = "", articleImageUrl } = params;

  // Priority 1: Original article image_url
  const originalCheck = await checkOriginalArticleImage(articleImageUrl);
  if (originalCheck.usable && originalCheck.url) {
    return {
      ok: true,
      tier: "original_article",
      originalImageChecked: originalCheck,
      queryUsed: "Original NEWS.image_url",
      selected: {
        id: "original-article",
        title: headline,
        thumbnailUrl: originalCheck.url,
        originalUrl: originalCheck.url,
        width: 1080,
        height: 1080,
        pageUrl: originalCheck.url,
        artist: "Original Article",
        sourceName: "Original Article",
        licenceName: "Editorial Source Reference",
        licenceUrl: "",
        licenceCategory: "ARTICLE_ORIGINAL",
        requiresAttribution: false,
        isShareAlike: false,
        attributionText: "",
        relevanceScore: 100,
      },
      candidates: [],
    };
  }

  // Priority 2: Specific subject search
  const subjectQuery = buildImageSearchQuery(headline, description);
  const subjectCandidates = await searchRankedOnlineImages(
    subjectQuery,
    headline,
    description
  );

  if (
    subjectCandidates.length > 0 &&
    (subjectCandidates[0].relevanceScore || 0) >= 20
  ) {
    return {
      ok: true,
      tier: "online_subject",
      originalImageChecked: originalCheck,
      queryUsed: subjectQuery,
      selected: subjectCandidates[0],
      candidates: subjectCandidates.slice(0, 12),
    };
  }

  // Priority 3: Contextual photograph fallback
  const contextual = getContextualFallbackQuery(headline, description);
  const contextualCandidates = await searchRankedOnlineImages(
    contextual.query,
    headline,
    description
  );

  const merged = [...subjectCandidates];
  const seen = new Set(merged.map((c) => c.id));
  for (const c of contextualCandidates) {
    if (!seen.has(c.id)) {
      merged.push(c);
      seen.add(c.id);
    }
  }
  merged.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

  return {
    ok: merged.length > 0,
    tier: "contextual_fallback",
    originalImageChecked: originalCheck,
    queryUsed: contextual.query,
    selected: merged[0] || null,
    candidates: merged.slice(0, 12),
    error:
      merged.length === 0
        ? "No reusable photographs found for this article."
        : undefined,
  };
}
