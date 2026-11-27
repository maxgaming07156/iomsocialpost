import { NextRequest, NextResponse } from "next/server";
import { isBackendConfigured } from "@/lib/appsScriptClient";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isBackendConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        error: "Backend credentials are not configured.",
      },
      { status: 400 }
    );
  }

  let body: { postId?: string; fileName?: string; pngDataUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const postId = String(body.postId || "").trim();
  const fileName = String(body.fileName || "").trim();
  const pngDataUrl = String(body.pngDataUrl || "").trim();

  if (!postId || !pngDataUrl.startsWith("data:image/png;base64,")) {
    return NextResponse.json(
      {
        ok: false,
        error: "postId and a valid base64 PNG data URL are required.",
      },
      { status: 400 }
    );
  }

  const base64Data = pngDataUrl.replace(/^data:image\/png;base64,/, "");
  const baseUrl = process.env.APPS_SCRIPT_URL!.trim();
  const secret = process.env.APPS_SCRIPT_SECRET!.trim();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(baseUrl, {
      method: "POST",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret,
        action: "save_graphic",
        post_id: postId,
        file_name: fileName || `insidetheiom-${postId}.png`,
        base64_data: base64Data,
      }),
    });

    const rawText = await response.text();
    let json: { ok?: boolean; graphic_url?: string; error?: string };
    try {
      json = JSON.parse(rawText);
    } catch {
      const looksLikeHtml = rawText.trimStart().startsWith("<");
      return NextResponse.json(
        {
          ok: false,
          error: looksLikeHtml
            ? "Apps Script doPost is not deployed yet or returned HTML. Add StudioGraphicsApi.gs and deploy a New version."
            : "Apps Script returned invalid JSON.",
        },
        { status: 502 }
      );
    }

    if (!json.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: json.error || "Apps Script failed to save graphic.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      postId,
      graphicUrl: json.graphic_url,
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      {
        ok: false,
        error: timedOut
          ? "Request timed out while saving graphic to Google Drive."
          : "Network error while saving graphic to Apps Script.",
      },
      { status: 502 }
    );
  } finally {
    clearTimeout(timer);
  }
}
