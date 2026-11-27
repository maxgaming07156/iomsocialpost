import { NextRequest, NextResponse } from "next/server";
import { isBackendConfigured, postToAppsScript } from "@/lib/appsScriptClient";

export const dynamic = "force-dynamic";

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

  if (action !== "enqueue_post" && action !== "update_queue_schedule") {
    return NextResponse.json(
      { ok: false, error: "Unsupported queue action." },
      { status: 400 }
    );
  }

  const scheduledAt = String(body.scheduled_at || "").trim();
  if (!scheduledAt) {
    return NextResponse.json(
      { ok: false, error: "scheduled_at is required." },
      { status: 400 }
    );
  }

  if (action === "enqueue_post" && !String(body.post_id || "").trim()) {
    return NextResponse.json(
      { ok: false, error: "post_id is required." },
      { status: 400 }
    );
  }

  if (
    action === "update_queue_schedule" &&
    !String(body.queue_id || "").trim()
  ) {
    return NextResponse.json(
      { ok: false, error: "queue_id is required." },
      { status: 400 }
    );
  }

  if (!isBackendConfigured()) {
    return NextResponse.json({ ok: true, mode: "demo" });
  }

  const result = await postToAppsScript(action, body);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error || "Failed to update queue." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "live",
    data: result.data,
  });
}
