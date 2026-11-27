import { NextRequest, NextResponse } from "next/server";
import { buildImageSearchQuery } from "@/lib/imageQueryBuilder";

export const dynamic = "force-dynamic";

export type LicenceCategory = "PUBLIC_DOMAIN" | "CC0" | "CC_BY" | "CC_BY_SA";

export interface OnlineImageResult {
  id: string;
  title: string;
  thumbnailUrl: string;
  originalUrl: string;
  width: number;
  height: number;
  pageUrl: string;
  artist: string;
  licenceName: string;
  licenceUrl: string;
  licenceCategory: LicenceCategory;
  requiresAttribution: boolean;
  isShareAlike: boolean;
  shareAlikeNote?: string;
  attributionText: string;
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

function classifyLicence(
  shortName: string,
  usageTerms: string
): {
  category: LicenceCategory;
  requiresAttribution: boolean;
  isShareAlike: boolean;
  shareAlikeNote?: string;
} | null {
  const combined = `${shortName} ${usageTerms}`.toLowerCase();

  // Exclude non-commercial, no-derivatives, or unclear restrictions
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
    return {
      category: "CC0",
      requiresAttribution: false,
      isShareAlike: false,
    };
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

  // Handle ShareAlike separately from ordinary CC BY
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
        "ShareAlike (CC BY-SA): requires photographer attribution, and any derivative work using this photo must be shared under the same CC BY-SA licence.",
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

const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

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
  endpoint.searchParams.set("gsrnamespace", "6"); // File namespace
  endpoint.searchParams.set("gsrsearch", `${query} filetype:bitmap`);
  endpoint.searchParams.set("gsrlimit", "24");
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

    if (res.status === 429) {
      throw new Error(
        "Wikimedia Commons rate limit reached. Please wait a moment and try again."
      );
    }

    if (!res.ok) {
      throw new Error(`MediaWiki API returned HTTP ${res.status}.`);
    }

    const data = (await res.json()) as {
      query?: { pages?: Record<string, CommonsPage> };
      error?: { info?: string };
    };

    if (data.error?.info) {
      throw new Error(data.error.info);
    }

    return Object.values(data.query?.pages || {});
  } finally {
    clearTimeout(timer);
  }
}

async function queryCommons(query: string): Promise<OnlineImageResult[]> {
  let pages: CommonsPage[];
  try {
    pages = await fetchMediaWikiPages(
      "https://commons.wikimedia.org/w/api.php",
      query,
      3500
    );
  } catch {
    // Fallback to en.wikipedia.org MediaWiki API (serves the same InstantCommons repository)
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

    const classified = classifyLicence(licenceName, usageTerms);
    if (!classified) continue;

    const rawArtist = stripHtml(meta.Artist?.value || "");
    const rawCredit = stripHtml(meta.Credit?.value || "");
    const artist =
      rawArtist ||
      rawCredit ||
      "Wikimedia Commons contributor";

    const cleanTitle = String(page.title || "")
      .replace(/^File:/i, "")
      .replace(/\.[^.]+$/, "")
      .replace(/_/g, " ")
      .trim();

    const attributionText = classified.requiresAttribution
      ? `Photo: ${artist} / Wikimedia Commons (${licenceName || classified.category})`
      : `Photo: ${artist} / Wikimedia Commons (${licenceName || "Public Domain"})`;

    results.push({
      id: String(page.pageid || page.title || results.length),
      title: cleanTitle || "Wikimedia Commons Photograph",
      thumbnailUrl: info.thumburl,
      originalUrl: info.url,
      width: info.width || 1080,
      height: info.height || 1080,
      pageUrl:
        info.descriptionurl ||
        `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title || "")}`,
      artist,
      licenceName: licenceName || usageTerms,
      licenceUrl,
      licenceCategory: classified.category,
      requiresAttribution: classified.requiresAttribution,
      isShareAlike: classified.isShareAlike,
      shareAlikeNote: classified.shareAlikeNote,
      attributionText,
    });
  }

  return results;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const headline = req.nextUrl.searchParams.get("headline")?.trim() || "";
  const description = req.nextUrl.searchParams.get("description")?.trim() || "";

  const effectiveQuery =
    q || (headline ? buildImageSearchQuery(headline, description) : "Isle of Man");

  try {
    let images = await queryCommons(effectiveQuery);

    // If a specific query returns too few reusable photos, broaden once to "Isle of Man"
    if (images.length < 3 && effectiveQuery.toLowerCase() !== "isle of man") {
      const fallback = await queryCommons("Isle of Man");
      const seenIds = new Set(images.map((i) => i.id));
      for (const item of fallback) {
        if (!seenIds.has(item.id)) {
          images.push(item);
          seenIds.add(item.id);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      query: effectiveQuery,
      images: images.slice(0, 12),
    });
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "Wikimedia Commons search timed out."
        : err instanceof Error
          ? err.message
          : "Failed to search Wikimedia Commons.";
    return NextResponse.json(
      { ok: false, query: effectiveQuery, error: message, images: [] },
      { status: 502 }
    );
  }
}
