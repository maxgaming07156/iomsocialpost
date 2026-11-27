import { NextRequest, NextResponse } from "next/server";
import { IG_COOKIE_NAME, TT_COOKIE_NAME } from "@/lib/oauthVault";
import { getIntegrationsStatus } from "@/lib/integrationStatus";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { platform?: string };
  try {
    body = (await req.json()) as { platform?: string };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const platform = body.platform;
  if (platform !== "instagram" && platform !== "tiktok") {
    return NextResponse.json(
      { ok: false, error: "Platform must be 'instagram' or 'tiktok'." },
      { status: 400 }
    );
  }

  const cookieName =
    platform === "instagram" ? IG_COOKIE_NAME : TT_COOKIE_NAME;
  const response = NextResponse.json({ ok: true, disconnected: platform });
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  // Also return refreshed status snapshot
  const status = await getIntegrationsStatus();
  if (platform === "instagram") {
    status.instagram.status = "NOT_CONNECTED";
    status.instagram.accountName = null;
    status.instagram.accountType = null;
    status.instagram.lastCheckedAt = null;
  } else {
    status.tiktok.status = "NOT_CONNECTED";
    status.tiktok.accountName = null;
    status.tiktok.accountType = null;
    status.tiktok.lastCheckedAt = null;
  }

  const finalRes = NextResponse.json(status, { status: 200 });
  finalRes.cookies.set(cookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return finalRes;
}
