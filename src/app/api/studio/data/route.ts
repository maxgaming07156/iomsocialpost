import { NextResponse } from "next/server";
import {
  callAppsScript,
  isBackendConfigured,
} from "@/lib/appsScriptClient";
import {
  mapAllSheetsToStudioPayload,
  RawAllSheetsResponse,
} from "@/lib/sheetMappers";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isBackendConfigured()) {
    return NextResponse.json(
      {
        ok: true,
        configured: false,
        mode: "demo",
        message:
          "APPS_SCRIPT_URL and APPS_SCRIPT_SECRET are not configured. Running in Demo Mode.",
      },
      { status: 200 }
    );
  }

  const result = await callAppsScript<RawAllSheetsResponse>("all");

  if (!result.ok || !result.data) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        mode: "live",
        error: result.error || "Failed to retrieve data from Apps Script.",
      },
      { status: 502 }
    );
  }

  const fetchedAt = result.timestamp || new Date().toISOString();
  const mapped = mapAllSheetsToStudioPayload(result.data, fetchedAt);

  return NextResponse.json(
    {
      ok: true,
      configured: true,
      mode: "live",
      fetchedAt,
      data: mapped,
    },
    { status: 200 }
  );
}
