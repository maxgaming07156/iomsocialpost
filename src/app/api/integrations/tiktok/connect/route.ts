import { NextRequest, NextResponse } from "next/server";
import {
  buildSessionCookieOptions,
  encryptJsonPayload,
  generateCsrfState,
  generatePkcePair,
  isTokenEncryptionConfigured,
  OAUTH_STATE_COOKIE,
  StoredOAuthState,
} from "@/lib/oauthVault";
import { isTikTokConfigured } from "@/lib/integrationStatus";

export const dynamic = "force-dynamic";

function getPublicOrigin(req: NextRequest): string {
  const fwdHost = req.headers.get("x-forwarded-host");
  const fwdProto = req.headers.get("x-forwarded-proto") || "https";
  if (fwdHost) return `${fwdProto}://${fwdHost}`;
  return req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const origin = getPublicOrigin(req);

  if (!isTikTokConfigured() || !isTokenEncryptionConfigured()) {
    return NextResponse.redirect(
      `${origin}/settings?integration_error=${encodeURIComponent(
        "TikTok OAuth credentials or STUDIO_TOKEN_ENCRYPTION_KEY are not configured."
      )}`
    );
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY!.trim();
  const redirectUri =
    process.env.TIKTOK_REDIRECT_URI?.trim() ||
    `${origin}/api/integrations/tiktok/callback`;

  const state = generateCsrfState();
  const { codeVerifier, codeChallenge } = generatePkcePair();

  const statePayload: StoredOAuthState = {
    platform: "tiktok",
    state,
    codeVerifier,
    createdAt: Date.now(),
  };

  const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
  authUrl.searchParams.set("client_key", clientKey);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set(
    "scope",
    "user.info.basic,video.upload,video.publish"
  );
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set(
    OAUTH_STATE_COOKIE,
    encryptJsonPayload(statePayload),
    buildSessionCookieOptions(600)
  );
  return res;
}
