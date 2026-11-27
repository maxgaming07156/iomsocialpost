import { NextRequest, NextResponse } from "next/server";
import {
  AppsScriptAction,
  callAppsScript,
  isBackendConfigured,
} from "@/lib/appsScriptClient";

export const dynamic = "force-dynamic";

const RESOURCE_TO_ACTION: Record<string, AppsScriptAction> = {
  news: "news",
  "social-posts": "social_posts",
  sources: "sources",
  media: "media",
  queue: "queue",
  settings: "settings",
  logs: "logs",
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ resource: string }> }
) {
  const { resource } = await context.params;
  const action = RESOURCE_TO_ACTION[resource];

  if (!action) {
    return NextResponse.json(
      { ok: false, error: `Unknown studio resource: ${resource}` },
      { status: 404 }
    );
  }

  if (!isBackendConfigured()) {
    return NextResponse.json({
      ok: true,
      configured: false,
      mode: "demo",
      data: [],
    });
  }

  const result = await callAppsScript<unknown[]>(action);

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        mode: "live",
        error: result.error || `Failed to fetch ${resource}.`,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    mode: "live",
    data: Array.isArray(result.data) ? result.data : [],
  });
}
