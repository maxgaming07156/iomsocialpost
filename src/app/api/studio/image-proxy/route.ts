import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ ok: false, error: "Missing url." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid url." }, { status: 400 });
  }

  if (target.protocol !== "https:") {
    return NextResponse.json(
      { ok: false, error: "Only HTTPS image URLs are allowed." },
      { status: 400 }
    );
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(target.toString(), {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent":
          "InsideTheIOMStudio/1.0 (https://insidetheiom.com; editorial-dashboard)",
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Upstream image returned HTTP ${res.status}.` },
        { status: 502 }
      );
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: "Upstream URL did not return an image." },
        { status: 400 }
      );
    }

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to fetch licensed image." },
      { status: 502 }
    );
  }
}
