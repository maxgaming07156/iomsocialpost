import { NextRequest, NextResponse } from "next/server";
import {
  buildSessionCookieOptions,
  decryptJsonPayload,
  encryptJsonPayload,
  IG_COOKIE_NAME,
  OAUTH_STATE_COOKIE,
  StoredOAuthSession,
  StoredOAuthState,
} from "@/lib/oauthVault";

export const dynamic = "force-dynamic";

function getPublicOrigin(req: NextRequest): string {
  const fwdHost = req.headers.get("x-forwarded-host");
  const fwdProto = req.headers.get("x-forwarded-proto") || "https";
  if (fwdHost) return `${fwdProto}://${fwdHost}`;
  if (process.env.META_REDIRECT_URI) {
    try {
      return new URL(process.env.META_REDIRECT_URI).origin;
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
        `Instagram authorisation cancelled or denied: ${oauthError}`
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
    storedState.platform !== "instagram" ||
    storedState.state !== state ||
    Date.now() - storedState.createdAt > 10 * 60 * 1000
  ) {
    return NextResponse.redirect(
      `${origin}/settings?integration_error=${encodeURIComponent(
        "Invalid or expired Instagram OAuth state. Please try connecting again."
      )}`
    );
  }

  const appId = process.env.META_APP_ID?.trim() || "";
  const appSecret = process.env.META_APP_SECRET?.trim() || "";
  const redirectUri =
    process.env.META_REDIRECT_URI?.trim() ||
    `${origin}/api/integrations/instagram/callback`;

  try {
    // 1. Exchange code for Facebook User Access Token
    const tokenUrl = new URL(
      "https://graph.facebook.com/v21.0/oauth/access_token"
    );
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString(), { cache: "no-store" });
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: { message?: string };
    };

    if (!tokenRes.ok || !tokenJson.access_token) {
      return NextResponse.redirect(
        `${origin}/settings?integration_error=${encodeURIComponent(
          tokenJson.error?.message || "Failed to exchange Meta OAuth code."
        )}`
      );
    }

    const accessToken = tokenJson.access_token;

    // 2. Fetch linked Facebook Pages and their Instagram Business Account
    const pagesUrl = new URL("https://graph.facebook.com/v21.0/me/accounts");
    pagesUrl.searchParams.set(
      "fields",
      "id,name,instagram_business_account{id,username}"
    );
    pagesUrl.searchParams.set("access_token", accessToken);

    const pagesRes = await fetch(pagesUrl.toString(), { cache: "no-store" });
    const pagesJson = (await pagesRes.json()) as {
      data?: Array<{
        id: string;
        name: string;
        instagram_business_account?: { id: string; username?: string };
      }>;
      error?: { message?: string };
    };

    if (!pagesRes.ok || pagesJson.error) {
      return NextResponse.redirect(
        `${origin}/settings?integration_error=${encodeURIComponent(
          pagesJson.error?.message ||
            "Could not query Facebook Pages linked to Instagram."
        )}`
      );
    }

    const linkedPage = (pagesJson.data || []).find(
      (p) => p.instagram_business_account?.id
    );

    if (!linkedPage || !linkedPage.instagram_business_account) {
      const pageNames = (pagesJson.data || []).map((p) => p.name);
      const detail =
        pageNames.length === 0
          ? "Meta returned 0 Facebook Pages. Re-connect and make sure you select your Facebook Page & Instagram account in the Meta popup."
          : `Found Facebook Page(s) (${pageNames.join(", ")}), but none have a linked Instagram Business/Creator account. Link @insidetheiom to that Page in Facebook Page Settings → Linked Accounts.`;
      return NextResponse.redirect(
        `${origin}/settings?integration_error=${encodeURIComponent(detail)}`
      );
    }

    // 3. Query granted permissions (read-only)
    const permsUrl = new URL("https://graph.facebook.com/v21.0/me/permissions");
    permsUrl.searchParams.set("access_token", accessToken);
    const permsRes = await fetch(permsUrl.toString(), { cache: "no-store" });
    const permsJson = (await permsRes.json()) as {
      data?: Array<{ permission: string; status: string }>;
    };
    const grantedScopes = (permsJson.data || [])
      .filter((p) => p.status === "granted")
      .map((p) => p.permission);

    const igAccount = linkedPage.instagram_business_account;
    const session: StoredOAuthSession = {
      platform: "instagram",
      accessToken,
      expiresAt: Date.now() + (tokenJson.expires_in || 3600) * 1000,
      accountId: igAccount.id,
      accountName: igAccount.username || linkedPage.name,
      accountType: "BUSINESS",
      grantedScopes,
      lastCheckedAt: new Date().toISOString(),
    };

    const res = NextResponse.redirect(`${origin}/settings?connected=instagram`);
    res.cookies.set(
      IG_COOKIE_NAME,
      encryptJsonPayload(session),
      buildSessionCookieOptions(60 * 60 * 24 * 30)
    );
    res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  } catch {
    return NextResponse.redirect(
      `${origin}/settings?integration_error=${encodeURIComponent(
        "Network error during Meta OAuth callback."
      )}`
    );
  }
}
