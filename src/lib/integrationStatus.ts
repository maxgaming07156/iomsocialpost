import {
  IntegrationsStatusPayload,
  PlatformIntegrationSummary,
  ReadinessCheckItem,
} from "@/types/integrations";
import {
  isTokenEncryptionConfigured,
  readOAuthSession,
  StoredOAuthSession,
} from "@/lib/oauthVault";

export function isInstagramConfigured(): boolean {
  return Boolean(
    process.env.META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim()
  );
}

export function isTikTokConfigured(): boolean {
  return Boolean(
    process.env.TIKTOK_CLIENT_KEY?.trim() &&
      process.env.TIKTOK_CLIENT_SECRET?.trim()
  );
}

function buildInstagramSummary(
  session: StoredOAuthSession | null,
  overrideError?: string
): PlatformIntegrationSummary {
  const credentialsConfigured = isInstagramConfigured();
  const encryptionConfigured = isTokenEncryptionConfigured();
  const now = Date.now();
  const isExpired = session ? session.expiresAt <= now : false;

  let status: PlatformIntegrationSummary["status"] = "NOT_CONNECTED";
  let statusMessage =
    "Instagram is not connected. Configure Meta App credentials and authorise a Business or Creator account.";

  if (overrideError) {
    status = "CONNECTION_ERROR";
    statusMessage = overrideError;
  } else if (!credentialsConfigured || !encryptionConfigured) {
    status = "ACTION_REQUIRED";
    statusMessage = !encryptionConfigured
      ? "STUDIO_TOKEN_ENCRYPTION_KEY is missing in server environment."
      : "META_APP_ID and META_APP_SECRET are not configured in .env.local.";
  } else if (session && isExpired) {
    status = "ACTION_REQUIRED";
    statusMessage =
      "Instagram access token has expired. Re-authorise or run a connection check to refresh.";
  } else if (session) {
    const isPro =
      session.accountType === "BUSINESS" ||
      session.accountType === "MEDIA_CREATOR";
    if (!isPro) {
      status = "ACTION_REQUIRED";
      statusMessage =
        "Connected account is not a Business or Creator account. Switch account type in Instagram.";
    } else {
      status = "CONNECTED";
      statusMessage =
        "Read-only account connection verified. Publishing remains disabled in Phase 5.";
    }
  }

  const requiredPermissions = [
    "instagram_basic",
    "instagram_content_publish",
    "pages_show_list",
  ];

  const hasPublishScope = session
    ? session.grantedScopes.includes("instagram_content_publish") ||
      session.grantedScopes.includes("instagram_business_content_publish")
    : false;

  const checklist: ReadinessCheckItem[] = [
    {
      id: "ig-dev-app",
      label: "Meta Developer App & Credentials",
      complete: credentialsConfigured && encryptionConfigured,
      detail: credentialsConfigured
        ? "META_APP_ID and META_APP_SECRET configured."
        : "Create an App at developers.facebook.com and set META_APP_ID / META_APP_SECRET.",
      requiresManualAction: !credentialsConfigured || !encryptionConfigured,
    },
    {
      id: "ig-account-type",
      label: "Professional Account (Business / Creator)",
      complete: Boolean(
        session &&
          (session.accountType === "BUSINESS" ||
            session.accountType === "MEDIA_CREATOR")
      ),
      detail: session
        ? `Connected account type: ${session.accountType}`
        : "Personal accounts cannot publish via API; convert to Business or Creator and link to a Facebook Page.",
      requiresManualAction: !session,
    },
    {
      id: "ig-oauth",
      label: "Server-Side OAuth Connection",
      complete: Boolean(session && !isExpired),
      detail: session
        ? `Authorised as @${session.accountName}`
        : "Complete OAuth authorisation via Connect Instagram.",
      requiresManualAction: !session || isExpired,
    },
    {
      id: "ig-perms",
      label: "Publishing Permissions Granted",
      complete: hasPublishScope,
      detail:
        "Requires instagram_basic + instagram_content_publish (or instagram_business_content_publish).",
      requiresManualAction: !hasPublishScope,
    },
    {
      id: "ig-media",
      label: "Publicly Accessible Media Hosting",
      complete: false,
      detail:
        "Meta container API fetches JPEG/PNG from a public HTTPS URL (1080×1350 4:5 supported; Drive uc?export=view URLs may require a direct CDN).",
      requiresManualAction: true,
    },
    {
      id: "ig-review",
      label: "Meta App Review Status",
      complete: false,
      detail:
        "Live publishing outside Development Mode requires Meta App Review with screencast approval.",
      requiresManualAction: true,
    },
  ];

  return {
    platform: "instagram",
    status,
    credentialsConfigured,
    encryptionConfigured,
    accountName: session ? `@${session.accountName}` : null,
    accountType: session ? session.accountType : null,
    grantedScopes: session ? session.grantedScopes : [],
    requiredPermissions,
    apiEligibility: session
      ? session.accountType === "BUSINESS" ||
        session.accountType === "MEDIA_CREATOR"
        ? "Eligible (Professional Account · Pending App Review)"
        : `Ineligible (${session.accountType})`
      : "Unknown — Account not connected",
    publishingAvailability: "DISABLED_PHASE_5",
    lastCheckedAt: session ? session.lastCheckedAt : null,
    tokenExpiresAt: session
      ? new Date(session.expiresAt).toISOString()
      : null,
    statusMessage,
    docsUrl:
      "https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/content-publishing",
    checklist,
  };
}

function buildTikTokSummary(
  session: StoredOAuthSession | null,
  overrideError?: string
): PlatformIntegrationSummary {
  const credentialsConfigured = isTikTokConfigured();
  const encryptionConfigured = isTokenEncryptionConfigured();
  const now = Date.now();
  const isExpired = session ? session.expiresAt <= now : false;

  let status: PlatformIntegrationSummary["status"] = "NOT_CONNECTED";
  let statusMessage =
    "TikTok is not connected. Configure TikTok Developer credentials and authorise your account.";

  if (overrideError) {
    status = "CONNECTION_ERROR";
    statusMessage = overrideError;
  } else if (!credentialsConfigured || !encryptionConfigured) {
    status = "ACTION_REQUIRED";
    statusMessage = !encryptionConfigured
      ? "STUDIO_TOKEN_ENCRYPTION_KEY is missing in server environment."
      : "TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET are not configured in .env.local.";
  } else if (session && isExpired && !session.refreshToken) {
    status = "ACTION_REQUIRED";
    statusMessage =
      "TikTok access token has expired. Re-authorise your TikTok account.";
  } else if (session) {
    status = "CONNECTED";
    statusMessage =
      "Read-only TikTok connection verified. Public posting requires TikTok App Audit; publishing remains disabled in Phase 5.";
  }

  const requiredPermissions = [
    "user.info.basic",
    "video.upload",
    "video.publish",
  ];

  const hasPublishScope = session
    ? session.grantedScopes.includes("video.publish") ||
      session.grantedScopes.includes("video.upload")
    : false;

  const checklist: ReadinessCheckItem[] = [
    {
      id: "tt-dev-app",
      label: "TikTok Developer App & Login Kit + Content Posting API",
      complete: credentialsConfigured && encryptionConfigured,
      detail: credentialsConfigured
        ? "TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET configured."
        : "Create an App at developers.tiktok.com, enable Login Kit & Content Posting API, and set credentials.",
      requiresManualAction: !credentialsConfigured || !encryptionConfigured,
    },
    {
      id: "tt-oauth",
      label: "Server-Side OAuth 2.0 + PKCE Connection",
      complete: Boolean(session && (!isExpired || session.refreshToken)),
      detail: session
        ? `Authorised as ${session.accountName}`
        : "Complete OAuth2 PKCE authorisation via Connect TikTok.",
      requiresManualAction: !session,
    },
    {
      id: "tt-perms",
      label: "Content Posting Scopes Granted",
      complete: hasPublishScope,
      detail:
        "Requires user.info.basic + video.upload (drafts) and/or video.publish (direct post).",
      requiresManualAction: !hasPublishScope,
    },
    {
      id: "tt-media",
      label: "Verified Domain & JPEG/WebP Photo Format",
      complete: false,
      detail:
        "TikTok Photo API requires images on a verified domain URL prefix and uses JPEG or WebP (PNG is typically rejected).",
      requiresManualAction: true,
    },
    {
      id: "tt-ux",
      label: "Mandatory Creator Info & Privacy UX",
      complete: false,
      detail:
        "Before publishing, UI must query /v2/post/creator_info/query/ and show manual privacy dropdown (no pre-selected default).",
      requiresManualAction: true,
    },
    {
      id: "tt-audit",
      label: "TikTok App Audit Status",
      complete: false,
      detail:
        "Unaudited apps are restricted to SELF_ONLY (private) posts on private test accounts (max 5 users/24h).",
      requiresManualAction: true,
    },
  ];

  return {
    platform: "tiktok",
    status,
    credentialsConfigured,
    encryptionConfigured,
    accountName: session ? session.accountName : null,
    accountType: session ? session.accountType : null,
    grantedScopes: session ? session.grantedScopes : [],
    requiredPermissions,
    apiEligibility: session
      ? "Sandbox / Unaudited (SELF_ONLY until TikTok Audit passes)"
      : "Unknown — Account not connected",
    publishingAvailability: "DISABLED_PHASE_5",
    lastCheckedAt: session ? session.lastCheckedAt : null,
    tokenExpiresAt: session
      ? new Date(session.expiresAt).toISOString()
      : null,
    statusMessage,
    docsUrl:
      "https://developers.tiktok.com/doc/content-posting-api-get-started",
    checklist,
  };
}

export async function getIntegrationsStatus(errors?: {
  instagram?: string;
  tiktok?: string;
}): Promise<IntegrationsStatusPayload> {
  const [igSession, ttSession] = await Promise.all([
    readOAuthSession("instagram"),
    readOAuthSession("tiktok"),
  ]);

  return {
    ok: true,
    publishingEnabled: false,
    instagram: buildInstagramSummary(igSession, errors?.instagram),
    tiktok: buildTikTokSummary(ttSession, errors?.tiktok),
  };
}
