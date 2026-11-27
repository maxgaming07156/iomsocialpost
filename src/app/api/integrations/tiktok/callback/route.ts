import { NextRequest, NextResponse } from "next/server";
import {
  buildSessionCookieOptions,
  decryptJsonPayload,
  encryptJsonPayload,
  OAUTH_STATE_COOKIE,
  StoredOAuthSession,
  StoredOAuthState,
  TT_COOKIE_NAME,
} from "@/lib/oauthVault";

export const dynamic = "force-dynamic";

function getPublicOrigin(req: NextRequest): string {
  const fwdHost = req.headers.get("x-forwarded-host");
  const fwdProto = req.headers.get("x-forwarded-proto") || "https";
  if (fwdHost) return `${fwdProto}://${fwdHost}`;
  if (process.env.TIKTOK_REDIRECT_URI) {
    try {
      return new URL(process.env.TIKTOK_REDIRECT_URI).origin;
    } catch {
      // fall through
    }
  }
  return req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const origin = getPublicOrigin(req);
  const search = req.nextUrl.searchParams;

  const oauthError = search.get("error_description") || search.get("error");
  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/settings?integration_error=${encodeURIComponent(
        `TikTok authorisation cancelled or denied: ${oauthError}`
      )}`
    );
  }

  const code = search.get("code");
  const state = search.get("state");
  const rawStateCookie = req.cookies.get(OAUTH_STATE_COOKIE)?.value || "";
  const storedState = decryptJsonPayload<StoredOAuthState>(rawStateCookie);

  if (
    !code ||
    !state ||
    !storedState ||
    storedState.platform !== "tiktok" ||
    storedState.state !== state ||
    !storedState.codeVerifier ||
    Date.now() - storedState.createdAt > 10 * 60 * 1000
  ) {
    return NextResponse.redirect(
      `${origin}/settings?integration_error=${encodeURIComponent(
        "Invalid or expired TikTok OAuth state. Please try connecting again."
      )}`
    );
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim() || "";
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET?.trim() || "";
  const redirectUri =
    process.env.TIKTOK_REDIRECT_URI?.trim() ||
    `${origin}/api/integrations/tiktok/callback`;

  try {
    const tokenRes = await fetch(
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code_verifier: storedState.codeVerifier,
        }),
      }
    );

    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      open_id?: string;
      scope?: string;
      error_description?: string;
    };

    if (!tokenRes.ok || !tokenJson.access_token) {
      return NextResponse.redirect(
        `${origin}/settings?integration_error=${encodeURIComponent(
          tokenJson.error_description || "Failed to exchange TikTok OAuth code."
        )}`
      );
    }

    // Read-only profile verification
    const userRes = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name",
      {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
        cache: "no-store",
      }
    );
    const userJson = (await userRes.json()) as {
      data?: { user?: { open_id?: string; display_name?: string } };
      error?: { message?: string };
    };

    if (!userRes.ok || !userJson.data?.user?.display_name) {
      return NextResponse.redirect(
        `${origin}/settings?integration_error=${encodeURIComponent(
          userJson.error?.message || "Could not verify TikTok creator profile."
        )}`
      );
    }

    const session: StoredOAuthSession = {
      platform: "tiktok",
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token,
      expiresAt: Date.now() + (tokenJson.expires_in || 86400) * 1000,
      accountId: userJson.data.user.open_id || tokenJson.open_id || "",
      accountName: userJson.data.user.display_name,
      accountType: "CREATOR",
      grantedScopes: tokenJson.scope
        ? tokenJson.scope.split(",").map((s) => s.trim())
        : [],
      lastCheckedAt: new Date().toISOString(),
    };

    const res = NextResponse.redirect(`${origin}/settings?connected=tiktok`);
    res.cookies.set(
      TT_COOKIE_NAME,
      encryptJsonPayload(session),
      buildSessionCookieOptions(60 * 60 * 24 * 30)
    );
    res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  } catch {
    return NextResponse.redirect(
      `${origin}/settings?integration_error=${encodeURIComponent(
        "Network error during TikTok OAuth callback."
      )}`
    );
  }
}
