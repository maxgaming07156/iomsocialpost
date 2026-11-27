import crypto from "crypto";
import type { StoredOAuthSession } from "./oauthVault";
import type {
  PublishExecutionRequest,
  PublishExecutionResult,
  PublishingControls,
} from "../types/publishing";

export interface PublishingEngineDeps {
  controls: PublishingControls;
  session: StoredOAuthSession | null;
  completedPostIds: Set<string>;
  fetchFn?: typeof fetch;
}

const ELIGIBLE_STATUSES = new Set(["APPROVED", "SCHEDULED"]);

export async function executePlatformPublish(
  req: PublishExecutionRequest,
  deps: PublishingEngineDeps
): Promise<PublishExecutionResult> {
  const jobId = crypto.randomUUID();
  const fetchFn = deps.fetchFn || fetch;
  const { controls, session, completedPostIds } = deps;

  // 1. Global & Platform Publishing Controls
  if (!controls.publishingEnabled) {
    return {
      ok: false,
      jobId,
      status: "FAILED",
      platform: req.platform,
      code: "CONTROLS_DISABLED",
      error: "Global publishing is disabled in Settings.",
    };
  }

  if (req.platform === "instagram" && !controls.instagramPublishingEnabled) {
    return {
      ok: false,
      jobId,
      status: "FAILED",
      platform: req.platform,
      code: "CONTROLS_DISABLED",
      error: "Instagram publishing is disabled in Settings.",
    };
  }

  if (req.platform === "tiktok" && !controls.tiktokPublishingEnabled) {
    return {
      ok: false,
      jobId,
      status: "FAILED",
      platform: req.platform,
      code: "CONTROLS_DISABLED",
      error: "TikTok publishing is disabled in Settings.",
    };
  }

  // 2. Manual Confirmation Guardrail
  if (controls.manualConfirmationRequired && !req.confirmed) {
    return {
      ok: false,
      jobId,
      status: "FAILED",
      platform: req.platform,
      code: "CONFIRMATION_REQUIRED",
      error: "Explicit manual confirmation is required before publishing.",
    };
  }

  // 3. Status Eligibility (only APPROVED or SCHEDULED)
  const normalizedStatus = String(req.postStatus || "").trim().toUpperCase();
  if (!ELIGIBLE_STATUSES.has(normalizedStatus)) {
    return {
      ok: false,
      jobId,
      status: "FAILED",
      platform: req.platform,
      code: "UNAPPROVED_STATUS",
      error: `Post status "${normalizedStatus}" is not eligible. Only APPROVED or SCHEDULED posts may be published.`,
    };
  }

  // 4. Duplicate Job Prevention
  if (completedPostIds.has(req.postId)) {
    return {
      ok: false,
      jobId,
      status: "FAILED",
      platform: req.platform,
      code: "DUPLICATE_JOB",
      error: "A publishing job has already completed or is in progress for this post.",
    };
  }

  // 5. Account Connection & Token Expiry Check
  if (!session || session.platform !== req.platform) {
    return {
      ok: false,
      jobId,
      status: "FAILED",
      platform: req.platform,
      code: "NOT_CONNECTED",
      error: `${req.platform.toUpperCase()} account is not connected.`,
    };
  }

  if (session.expiresAt <= Date.now()) {
    return {
      ok: false,
      jobId,
      status: "FAILED",
      platform: req.platform,
      code: "NOT_CONNECTED",
      error: `${req.platform.toUpperCase()} access token has expired. Please reconnect.`,
    };
  }

  // 6. Required Publishing Permissions Check
  if (req.platform === "instagram") {
    const hasIgScope =
      session.grantedScopes.includes("instagram_content_publish") ||
      session.grantedScopes.includes("instagram_business_content_publish");
    if (!hasIgScope) {
      return {
        ok: false,
        jobId,
        status: "FAILED",
        platform: "instagram",
        code: "MISSING_PERMISSIONS",
        error:
          "Missing required Instagram publishing permission (instagram_content_publish).",
      };
    }

    if (
      session.accountType !== "BUSINESS" &&
      session.accountType !== "MEDIA_CREATOR"
    ) {
      return {
        ok: false,
        jobId,
        status: "FAILED",
        platform: "instagram",
        code: "MISSING_PERMISSIONS",
        error: `Instagram account type "${session.accountType}" is not eligible. Business or Creator account required.`,
      };
    }

    // Test Mode blocks public Instagram feed publishing
    if (controls.testMode) {
      return {
        ok: false,
        jobId,
        status: "FAILED",
        platform: "instagram",
        code: "TEST_MODE_BLOCKED",
        error:
          "Test Mode is ON: Instagram does not support private feed posts, so live submission is blocked to prevent accidental public publishing.",
      };
    }

    return publishInstagramContainer(req, session, jobId, fetchFn);
  }

  // TikTok Permission & Media Checks
  const hasTtScope =
    session.grantedScopes.includes("video.publish") ||
    session.grantedScopes.includes("video.upload");
  if (!hasTtScope) {
    return {
      ok: false,
      jobId,
      status: "FAILED",
      platform: "tiktok",
      code: "MISSING_PERMISSIONS",
      error:
        "Missing required TikTok publishing scope (video.publish or video.upload).",
    };
  }

  return publishTikTokPhoto(req, session, controls, jobId, fetchFn);
}

async function publishInstagramContainer(
  req: PublishExecutionRequest,
  session: StoredOAuthSession,
  jobId: string,
  fetchFn: typeof fetch
): Promise<PublishExecutionResult> {
  if (!req.imageUrl || !req.imageUrl.startsWith("https://")) {
    return {
      ok: false,
      jobId,
      status: "FAILED",
      platform: "instagram",
      code: "INVALID_MEDIA",
      error: "Instagram requires a publicly accessible HTTPS image URL.",
    };
  }

  try {
    // Step 1: Create media container
    const createRes = await fetchFn(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(
        session.accountId
      )}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          image_url: req.imageUrl,
          caption: req.caption,
          access_token: session.accessToken,
        }),
      }
    );

    const createJson = (await createRes.json()) as {
      id?: string;
      error?: { message?: string };
    };

    if (!createRes.ok || !createJson.id) {
      return {
        ok: false,
        jobId,
        status: "FAILED",
        platform: "instagram",
        code: "PLATFORM_API_ERROR",
        error:
          createJson.error?.message ||
          "Instagram failed to create media container.",
      };
    }

    const creationId = createJson.id;

    // Step 2: Check container status
    const statusRes = await fetchFn(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(
        creationId
      )}?fields=status_code&access_token=${encodeURIComponent(
        session.accessToken
      )}`,
      { cache: "no-store" }
    );
    const statusJson = (await statusRes.json()) as {
      status_code?: string;
      error?: { message?: string };
    };

    if (!statusRes.ok || statusJson.status_code === "ERROR") {
      return {
        ok: false,
        jobId,
        status: "FAILED",
        platform: "instagram",
        code: "PLATFORM_API_ERROR",
        error:
          statusJson.error?.message ||
          "Instagram media container processing failed.",
      };
    }

    // Step 3: Final publish (NEVER blindly retried if outcome is uncertain)
    const publishRes = await fetchFn(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(
        session.accountId
      )}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          creation_id: creationId,
          access_token: session.accessToken,
        }),
      }
    );

    const publishJson = (await publishRes.json()) as {
      id?: string;
      error?: { message?: string };
    };

    if (!publishRes.ok || !publishJson.id) {
      return {
        ok: false,
        jobId,
        status: "FAILED",
        platform: "instagram",
        code: "PLATFORM_API_ERROR",
        error:
          publishJson.error?.message ||
          "Instagram media_publish did not confirm publication.",
      };
    }

    return {
      ok: true,
      jobId,
      status: "PUBLISHED",
      platform: "instagram",
      platformPostId: publishJson.id,
      publishedAt: new Date().toISOString(),
    };
  } catch {
    return {
      ok: false,
      jobId,
      status: "FAILED",
      platform: "instagram",
      code: "PLATFORM_API_ERROR",
      error:
        "Network error during Instagram publishing. Do not blindly retry without checking Instagram.",
    };
  }
}

async function publishTikTokPhoto(
  req: PublishExecutionRequest,
  session: StoredOAuthSession,
  controls: PublishingControls,
  jobId: string,
  fetchFn: typeof fetch
): Promise<PublishExecutionResult> {
  if (!req.imageUrl || !req.imageUrl.startsWith("https://")) {
    return {
      ok: false,
      jobId,
      status: "FAILED",
      platform: "tiktok",
      code: "INVALID_MEDIA",
      error:
        "TikTok requires a verified-domain HTTPS image URL in JPEG or WebP format.",
    };
  }

  // TikTok Photo API typically rejects PNGs
  if (/\.png(\?|$)/i.test(req.imageUrl)) {
    return {
      ok: false,
      jobId,
      status: "FAILED",
      platform: "tiktok",
      code: "INVALID_MEDIA",
      error:
        "TikTok Photo API requires JPEG or WebP (PNG is rejected). Export the TikTok JPEG variant first.",
    };
  }

  try {
    // Step 1: Query creator info
    const creatorRes = await fetchFn(
      "https://open.tiktokapis.com/v2/post/creator_info/query/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
      }
    );

    const creatorJson = (await creatorRes.json()) as {
      data?: { privacy_level_options?: string[] };
      error?: { code?: string; message?: string };
    };

    if (
      !creatorRes.ok ||
      (creatorJson.error?.code && creatorJson.error.code !== "ok")
    ) {
      return {
        ok: false,
        jobId,
        status: "FAILED",
        platform: "tiktok",
        code: "PLATFORM_API_ERROR",
        error:
          creatorJson.error?.message ||
          "Failed to query TikTok creator_info.",
      };
    }

    const availablePrivacy = creatorJson.data?.privacy_level_options || [
      "SELF_ONLY",
    ];
    const requestedPrivacy = controls.testMode
      ? "SELF_ONLY"
      : req.privacyLevel || "";

    if (!requestedPrivacy || !availablePrivacy.includes(requestedPrivacy)) {
      return {
        ok: false,
        jobId,
        status: "FAILED",
        platform: "tiktok",
        code: "CONFIRMATION_REQUIRED",
        error:
          "Please select a valid TikTok privacy level returned by creator_info.",
      };
    }

    // Step 2: Initialize photo direct post
    const initRes = await fetchFn(
      "https://open.tiktokapis.com/v2/post/publish/content/init/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          post_info: {
            title: req.headline.slice(0, 90),
            description: req.caption.slice(0, 4000),
            privacy_level: requestedPrivacy,
            disable_comment: Boolean(req.disableComment),
            auto_add_music: false,
          },
          source_info: {
            source: "PULL_FROM_URL",
            photo_cover_index: 0,
            photo_images: [req.imageUrl],
          },
          post_mode: "DIRECT_POST",
          media_type: "PHOTO",
        }),
      }
    );

    const initJson = (await initRes.json()) as {
      data?: { publish_id?: string };
      error?: { code?: string; message?: string };
    };

    if (!initRes.ok || !initJson.data?.publish_id) {
      return {
        ok: false,
        jobId,
        status: "FAILED",
        platform: "tiktok",
        code: "PLATFORM_API_ERROR",
        error:
          initJson.error?.message ||
          "TikTok content/init failed to create publish_id.",
      };
    }

    const publishId = initJson.data.publish_id;

    // Step 3: Fetch publishing status
    const fetchStatusRes = await fetchFn(
      "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({ publish_id: publishId }),
      }
    );

    const fetchStatusJson = (await fetchStatusRes.json()) as {
      data?: { status?: string; publicaly_available_post_id?: string[] };
      error?: { message?: string };
    };

    const ttStatus = fetchStatusJson.data?.status;
    if (!fetchStatusRes.ok || ttStatus === "FAILED") {
      return {
        ok: false,
        jobId,
        status: "FAILED",
        platform: "tiktok",
        code: "PLATFORM_API_ERROR",
        error:
          fetchStatusJson.error?.message ||
          "TikTok reported FAILED status during publish.",
      };
    }

    const postIdOut =
      fetchStatusJson.data?.publicaly_available_post_id?.[0] || publishId;

    return {
      ok: true,
      jobId,
      status: "PUBLISHED",
      platform: "tiktok",
      platformPostId: postIdOut,
      publishedAt: new Date().toISOString(),
    };
  } catch {
    return {
      ok: false,
      jobId,
      status: "FAILED",
      platform: "tiktok",
      code: "PLATFORM_API_ERROR",
      error: "Network error during TikTok publishing.",
    };
  }
}
