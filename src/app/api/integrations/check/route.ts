import { NextRequest, NextResponse } from "next/server";
import {
  buildSessionCookieOptions,
  encryptJsonPayload,
  IG_COOKIE_NAME,
  readOAuthSession,
  StoredOAuthSession,
  TT_COOKIE_NAME,
} from "@/lib/oauthVault";
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

  const session = await readOAuthSession(platform);
  if (!session) {
    const status = await getIntegrationsStatus();
    return NextResponse.json(status, { status: 200 });
  }

  if (platform === "instagram") {
    try {
      const url = new URL(
        `https://graph.facebook.com/v21.0/${encodeURIComponent(
          session.accountId
        )}`
      );
      url.searchParams.set("fields", "id,username");
      url.searchParams.set("access_token", session.accessToken);

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = (await res.json()) as {
        id?: string;
        username?: string;
        error?: { message?: string };
      };

      if (!res.ok || data.error || !data.id) {
        const status = await getIntegrationsStatus({
          instagram:
            data.error?.message ||
            "Instagram token is invalid or permissions were revoked.",
        });
        return NextResponse.json(status, { status: 200 });
      }

      const updated: StoredOAuthSession = {
        ...session,
        accountName: data.username || session.accountName,
        lastCheckedAt: new Date().toISOString(),
      };

      const status = await getIntegrationsStatus();
      status.instagram.accountName = `@${updated.accountName}`;
      status.instagram.accountType = updated.accountType;
      status.instagram.lastCheckedAt = updated.lastCheckedAt;

      const out = NextResponse.json(status, { status: 200 });
      out.cookies.set(
        IG_COOKIE_NAME,
        encryptJsonPayload(updated),
        buildSessionCookieOptions(60 * 60 * 24 * 30)
      );
      return out;
    } catch {
      const status = await getIntegrationsStatus({
        instagram: "Network error while verifying Instagram connection.",
      });
      return NextResponse.json(status, { status: 200 });
    }
  }

  // TikTok read-only check (with refresh if expired and refresh_token exists)
  try {
    let activeToken = session.accessToken;
    let activeRefresh = session.refreshToken;
    let expiresAt = session.expiresAt;

    if (Date.now() >= expiresAt - 60_000 && activeRefresh) {
      const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim() || "";
      const clientSecret = process.env.TIKTOK_CLIENT_SECRET?.trim() || "";
      const refreshRes = await fetch(
        "https://open.tiktokapis.com/v2/oauth/token/",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_key: clientKey,
            client_secret: clientSecret,
            grant_type: "refresh_token",
            refresh_token: activeRefresh,
          }),
        }
      );

      const refreshJson = (await refreshRes.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        error_description?: string;
      };

      if (!refreshRes.ok || !refreshJson.access_token) {
        const status = await getIntegrationsStatus({
          tiktok:
            refreshJson.error_description ||
            "TikTok token refresh failed. Please reconnect.",
        });
        return NextResponse.json(status, { status: 200 });
      }

      activeToken = refreshJson.access_token;
      activeRefresh = refreshJson.refresh_token || activeRefresh;
      expiresAt = Date.now() + (refreshJson.expires_in || 86400) * 1000;
    }

    const userRes = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name",
      {
        headers: { Authorization: `Bearer ${activeToken}` },
        cache: "no-store",
      }
    );
    const userJson = (await userRes.json()) as {
      data?: { user?: { open_id?: string; display_name?: string } };
      error?: { message?: string };
    };

    if (!userRes.ok || !userJson.data?.user?.display_name) {
      const status = await getIntegrationsStatus({
        tiktok:
          userJson.error?.message ||
          "TikTok token is invalid or permissions were revoked.",
      });
      return NextResponse.json(status, { status: 200 });
    }

    const updated: StoredOAuthSession = {
      ...session,
      accessToken: activeToken,
      refreshToken: activeRefresh,
      expiresAt,
      accountName: userJson.data.user.display_name,
      lastCheckedAt: new Date().toISOString(),
    };

    const status = await getIntegrationsStatus();
    status.tiktok.accountName = updated.accountName;
    status.tiktok.lastCheckedAt = updated.lastCheckedAt;
    status.tiktok.tokenExpiresAt = new Date(updated.expiresAt).toISOString();

    const out = NextResponse.json(status, { status: 200 });
    out.cookies.set(
      TT_COOKIE_NAME,
      encryptJsonPayload(updated),
      buildSessionCookieOptions(60 * 60 * 24 * 30)
    );
    return out;
  } catch {
    const status = await getIntegrationsStatus({
      tiktok: "Network error while verifying TikTok connection.",
    });
    return NextResponse.json(status, { status: 200 });
  }
}
