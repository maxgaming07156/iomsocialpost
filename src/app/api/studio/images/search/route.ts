import { NextRequest, NextResponse } from "next/server";
import { buildImageSearchQuery } from "@/lib/imageQueryBuilder";
import {
  OnlineImageResult,
  searchRankedOnlineImages,
} from "@/lib/imageSelector";

export type { OnlineImageResult };
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const headline = req.nextUrl.searchParams.get("headline")?.trim() || "";
  const description = req.nextUrl.searchParams.get("description")?.trim() || "";

  const effectiveQuery =
    q ||
    (headline
      ? buildImageSearchQuery(headline, description)
      : "Isle of Man harbour");

  try {
    const images = await searchRankedOnlineImages(
      effectiveQuery,
      headline,
      description
    );

    return NextResponse.json({
      ok: true,
      query: effectiveQuery,
      images: images.slice(0, 12),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to search online images.";
    return NextResponse.json(
      { ok: false, query: effectiveQuery, error: message, images: [] },
      { status: 502 }
    );
  }
}
