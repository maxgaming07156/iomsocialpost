import { NextRequest, NextResponse } from "next/server";
import { isBackendConfigured, postToAppsScript } from "@/lib/appsScriptClient";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = new Set([
  "DRAFT",
  "NEEDS_REVIEW",
  "APPROVED",
  "REJECTED",
]);

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const action = String(body.action || "").trim();

  if (
    action !== "update_post" &&
    action !== "upsert_post_for_article" &&
    action !== "set_post_status"
  ) {
    return NextResponse.json(
      { ok: false, error: "Unsupported post action." },
      { status: 400 }
    );
  }

  if (action === "set_post_status") {
    const status = String(body.status || "").trim().toUpperCase();
    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json(
        { ok: false, error: "Invalid status value." },
        { status: 400 }
      );
    }
    if (status === "REJECTED" && !String(body.rejection_reason || "").trim()) {
      return NextResponse.json(
        { ok: false, error: "Rejection reason is required." },
        { status: 400 }
      );
    }
  }

  if (!isBackendConfigured()) {
    return NextResponse.json({ ok: true, mode: "demo" });
  }

  const result = await postToAppsScript(action, body);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error || "Failed to update post." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "live",
    data: result.data,
  });
}
