import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  buildSessionCookieOptions,
  readOAuthSession,
} from "@/lib/oauthVault";
import { readPublishingControls } from "@/lib/publishingControls";
import { executePlatformPublish } from "@/lib/publishingEngine";
import { isBackendConfigured, postToAppsScript } from "@/lib/appsScriptClient";
import { PublishExecutionRequest } from "@/types/publishing";

export const dynamic = "force-dynamic";

const COMPLETED_JOBS_COOKIE = "iom_pub_jobs_v1";

export async function POST(req: NextRequest) {
  let body: Partial<PublishExecutionRequest>;
  try {
    body = (await req.json()) as Partial<PublishExecutionRequest>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const postId = String(body.postId || "").trim();
  const platform = body.platform;

  if (!postId || (platform !== "instagram" && platform !== "tiktok")) {
    return NextResponse.json(
      { ok: false, error: "Valid postId and platform are required." },
      { status: 400 }
    );
  }

  const [controls, session, cookieStore] = await Promise.all([
    readPublishingControls(),
    readOAuthSession(platform),
    cookies(),
  ]);

  let completedList: string[] = [];
  try {
    const raw = cookieStore.get(COMPLETED_JOBS_COOKIE)?.value;
    if (raw) completedList = JSON.parse(raw) as string[];
  } catch {
    completedList = [];
  }

  const completedPostIds = new Set(completedList);

  const result = await executePlatformPublish(
    {
      postId,
      queueId: body.queueId,
      platform,
      postStatus: String(body.postStatus || ""),
      caption: String(body.caption || ""),
      headline: String(body.headline || ""),
      imageUrl: String(body.imageUrl || ""),
      confirmed: Boolean(body.confirmed),
      privacyLevel: body.privacyLevel,
      disableComment: body.disableComment,
    },
    {
      controls,
      session,
      completedPostIds,
    }
  );

  // Record outcome in Google Sheets if backend is configured and job reached platform execution
  if (
    isBackendConfigured() &&
    (result.status === "PUBLISHED" ||
      result.code === "PLATFORM_API_ERROR")
  ) {
    await postToAppsScript("record_publish_result", {
      post_id: postId,
      queue_id: body.queueId || "",
      job_id: result.jobId,
      status: result.status,
      platform_post_id: result.platformPostId || "",
      published_at: result.publishedAt || "",
      error_message: result.error || "",
    });
  }

  const res = NextResponse.json(result, {
    status: result.ok ? 200 : 400,
  });

  if (result.ok) {
    completedPostIds.add(postId);
    res.cookies.set(
      COMPLETED_JOBS_COOKIE,
      JSON.stringify(Array.from(completedPostIds).slice(-50)),
      buildSessionCookieOptions(60 * 60 * 24 * 30)
    );
  }

  return res;
}
