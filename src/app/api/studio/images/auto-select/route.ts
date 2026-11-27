import { NextRequest, NextResponse } from "next/server";
import { autoSelectArticleImage } from "@/lib/imageSelector";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: {
    headline?: string;
    description?: string;
    articleImageUrl?: string | null;
  };
  try {
    body = (await req.json()) as {
      headline?: string;
      description?: string;
      articleImageUrl?: string | null;
    };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const headline = String(body.headline || "").trim();
  if (!headline) {
    return NextResponse.json(
      { ok: false, error: "headline is required." },
      { status: 400 }
    );
  }

  const result = await autoSelectArticleImage({
    headline,
    description: String(body.description || ""),
    articleImageUrl: body.articleImageUrl || null,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
