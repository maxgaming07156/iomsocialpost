import { NextRequest, NextResponse } from "next/server";
import {
  PUBLISHING_CONTROLS_COOKIE,
  readPublishingControls,
  serializePublishingControls,
} from "@/lib/publishingControls";
import { PublishingControls } from "@/types/publishing";

export const dynamic = "force-dynamic";

export async function GET() {
  const controls = await readPublishingControls();
  return NextResponse.json({ ok: true, controls });
}

export async function POST(req: NextRequest) {
  let body: Partial<PublishingControls>;
  try {
    body = (await req.json()) as Partial<PublishingControls>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const current = await readPublishingControls();
  const next: PublishingControls = {
    publishingEnabled:
      typeof body.publishingEnabled === "boolean"
        ? body.publishingEnabled
        : current.publishingEnabled,
    instagramPublishingEnabled:
      typeof body.instagramPublishingEnabled === "boolean"
        ? body.instagramPublishingEnabled
        : current.instagramPublishingEnabled,
    tiktokPublishingEnabled:
      typeof body.tiktokPublishingEnabled === "boolean"
        ? body.tiktokPublishingEnabled
        : current.tiktokPublishingEnabled,
    manualConfirmationRequired:
      typeof body.manualConfirmationRequired === "boolean"
        ? body.manualConfirmationRequired
        : current.manualConfirmationRequired,
    testMode:
      typeof body.testMode === "boolean" ? body.testMode : current.testMode,
  };

  const { value, options } = serializePublishingControls(next);
  const res = NextResponse.json({ ok: true, controls: next });
  res.cookies.set(PUBLISHING_CONTROLS_COOKIE, value, options);
  return res;
}
