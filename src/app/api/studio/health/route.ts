import { NextResponse } from "next/server";
import {
  callAppsScript,
  isBackendConfigured,
} from "@/lib/appsScriptClient";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isBackendConfigured()) {
    return NextResponse.json({
      ok: true,
      configured: false,
      mode: "demo",
      status: "unconfigured",
    });
  }

  const result = await callAppsScript<Record<string, unknown>>("health", 10000);

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        mode: "live",
        error: result.error || "Health check failed.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    mode: "live",
    timestamp: result.timestamp || new Date().toISOString(),
  });
}
