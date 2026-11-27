import { NextRequest, NextResponse } from "next/server";
import {
  buildSessionCookieOptions,
  encryptJsonPayload,
  generateCsrfState,
  isTokenEncryptionConfigured,
  OAUTH_STATE_COOKIE,
  StoredOAuthState,
} from "@/lib/oauthVault";
import { isInstagramConfigured } from "@/lib/integrationStatus";

export const dynamic = "force-dynamic";

function getPublicOrigin(req: NextRequest): string {
  const fwdHost = req.headers.get("x-forwarded-host");
  const fwdProto = req.headers.get("x-forwarded-proto") || "https";
  if (fwdHost) return `${fwdProto}://${fwdHost}`;
  return req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const origin = getPublicOrigin(req);

  if (!isInstagramConfigured() || !isTokenEncryptionConfigured()) {
    return NextResponse.redirect(
      `${origin}/settings?integration_error=${encodeURIComponent(
        "Instagram OAuth credentials or STUDIO_TOKEN_ENCRYPTION_KEY are not configured."
      )}`
    );
  }

  const appId = process.env.META_APP_ID!.trim();
  const redirectUri =
    process.env.META_REDIRECT_URI?.trim() ||
    `${origin}/api/integrations/instagram/callback`;
  const configId = process.env.META_CONFIG_ID?.trim();

  const state = generateCsrfState();
  const statePayload: StoredOAuthState = {
    platform: "instagram",
    state,
    createdAt: Date.now(),
  };

  // Facebook Login / Unified Login for Instagram Graph API
  const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  if (configId) {
    authUrl.searchParams.set("config_id", configId);
  } else {
    authUrl.searchParams.set(
      "scope",
      "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management"
    );
  }
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("auth_type", "rerequest");

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set(
    OAUTH_STATE_COOKIE,
    encryptJsonPayload(statePayload),
    buildSessionCookieOptions(600)
  );
  return res;
}
