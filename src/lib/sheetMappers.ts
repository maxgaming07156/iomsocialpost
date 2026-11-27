import {
  ActivityItem,
  MediaAsset,
  NewsSourceConfig,
  NewsStory,
  Platform,
  PostStatus,
  QueueItem,
  SocialPost,
  StoryAiDecision,
  StoryProcessingStatus,
  StudioBackendPayload,
  StudioSettings,
} from "@/types/studio";
import {
  sanitizeGraphicText,
  sanitizePublicCopy,
} from "@/lib/contentSanitizer";

type RawRow = Record<string, unknown>;

export interface RawAllSheetsResponse {
  sources?: RawRow[];
  news?: RawRow[];
  social_posts?: RawRow[];
  media?: RawRow[];
  queue?: RawRow[];
  settings?: RawRow[];
  logs?: RawRow[];
}

function asStr(val: unknown, fallback = ""): string {
  if (val === null || val === undefined) return fallback;
  return String(val).trim();
}

function asBool(val: unknown): boolean {
  if (typeof val === "boolean") return val;
  return String(val || "").trim().toUpperCase() === "TRUE";
}

function asNum(val: unknown, fallback = 0): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function mapNewsStatus(rawStatus: string): StoryProcessingStatus {
  const upper = rawStatus.toUpperCase();
  if (
    upper === "NEW" ||
    upper === "PROCESSING" ||
    upper === "AI_APPROVED" ||
    upper === "REJECTED" ||
    upper === "AI_ERROR"
  ) {
    return upper as StoryProcessingStatus;
  }
  return "NEW";
}

function mapAiDecision(rawStatus: string, score: number): StoryAiDecision {
  const upper = rawStatus.toUpperCase();
  if (upper === "AI_APPROVED") return "Publish";
  if (upper === "REJECTED") return "Skip";
  if (score >= 70) return "Publish";
  return "Review";
}

function mapPostStatus(rawStatus: string): PostStatus {
  const upper = rawStatus.trim().toUpperCase();
  if (
    upper === "DRAFT" ||
    upper === "NEEDS_REVIEW" ||
    upper === "APPROVED" ||
    upper === "REJECTED" ||
    upper === "SCHEDULED" ||
    upper === "PUBLISHED"
  ) {
    return upper;
  }
  return "DRAFT";
}

function mapPlatform(rawPlatform: string): Platform {
  return rawPlatform.toUpperCase() === "TIKTOK" ? "tiktok" : "instagram";
}

export function mapSourcesRows(rows: RawRow[] = []): NewsSourceConfig[] {
  return rows.map((row) => {
    const lastChecked = asStr(row.last_checked);
    return {
      id: asStr(row.source_id, "UNKNOWN"),
      name: asStr(row.source_name, "Unknown Source"),
      feedUrl: asStr(row.rss_url),
      enabled: asBool(row.enabled),
      trustLevel: asStr(row.trust_level, "MEDIUM"),
      lastPolledDemo: lastChecked
        ? formatDisplayTimestamp(lastChecked)
        : "Not checked yet",
      lastError: asStr(row.last_error) || undefined,
      itemsCollectedDemo: 0,
    };
  });
}

export function mapNewsRows(rows: RawRow[] = []): NewsStory[] {
  return rows
    .map((row) => {
      const rawStatus = asStr(row.status, "NEW");
      const score = asNum(row.relevance_score, 0);
      const sourceName = asStr(row.source_name, "Unknown Source");

      return {
        id: asStr(row.article_id),
        headline: asStr(row.original_title, "Untitled Story"),
        summary: stripHtml(asStr(row.description, "No description provided.")),
        source: sourceName,
        sourceUrl: asStr(row.source_url),
        imageUrl: asStr(row.image_url) || undefined,
        category: asStr(row.source_id, "News"),
        publishedAt:
          asStr(row.published_at) ||
          asStr(row.discovered_at) ||
          new Date().toISOString(),
        discoveredAt: asStr(row.discovered_at) || undefined,
        processedAt: asStr(row.processed_at) || undefined,
        relevanceScore: score,
        aiDecision: mapAiDecision(rawStatus, score),
        aiProvider: "Pipeline" as const,
        aiReasoning:
          rawStatus === "NEW"
            ? "Awaiting AI evaluation in next processSocialNews() run."
            : rawStatus === "AI_APPROVED"
              ? `Approved by backend AI pipeline with relevance score ${score}/100.`
              : rawStatus === "REJECTED"
                ? `Rejected by backend AI pipeline (score ${score}/100).`
                : rawStatus === "AI_ERROR"
                  ? "Backend AI processing encountered an error. Check LOGS tab."
                  : `Current sheet status: ${rawStatus}`,
        processingStatus: mapNewsStatus(rawStatus),
        location: "Isle of Man",
      };
    })
    .reverse();
}

export function mapSocialPostRows(
  rows: RawRow[] = [],
  storiesById: Map<string, NewsStory>,
  queueByPostId: Map<string, QueueItem>
): SocialPost[] {
  return rows
    .map((row) => {
      const postId = asStr(row.post_id);
      const articleId = asStr(row.article_id);
      const platform = mapPlatform(asStr(row.platform));
      const linkedStory = storiesById.get(articleId);
      const queueItem = queueByPostId.get(postId);
      const rawTags = asStr(row.hashtags);
      const hashtags = rawTags ? rawTags.split(/\s+/).filter(Boolean) : [];

      return {
        id: postId,
        storyId: articleId,
        storyHeadline: linkedStory?.headline || `Article ${articleId}`,
        platform,
        headline: sanitizeGraphicText(asStr(row.headline, "Untitled Draft")),
        caption: sanitizePublicCopy(asStr(row.caption), {
          includeWebsiteCta: true,
        }),
        supportingText: asStr(row.supporting_text)
          ? sanitizeGraphicText(asStr(row.supporting_text))
          : undefined,
        hashtags,
        graphicUrl: asStr(row.graphic_url) || undefined,
        status: queueItem
          ? mapPostStatus(queueItem.status)
          : mapPostStatus(asStr(row.status, "DRAFT")),
        rejectionReason: asStr(row.rejection_reason) || undefined,
        scheduledFor: queueItem?.scheduledAt || undefined,
        format:
          platform === "instagram"
            ? ("1080×1350 (4:5)" as const)
            : ("1080×1920 (9:16)" as const),
        updatedAt:
          asStr(row.updated_at) ||
          asStr(row.created_at) ||
          new Date().toISOString(),
      };
    })
    .reverse();
}

export function mapQueueRows(rows: RawRow[] = []): QueueItem[] {
  return rows.map((row) => ({
    queueId: asStr(row.queue_id),
    postId: asStr(row.post_id),
    platform: mapPlatform(asStr(row.platform)),
    scheduledAt: asStr(row.scheduled_at),
    status: asStr(row.status, "SCHEDULED"),
    publishedAt: asStr(row.published_at) || undefined,
    platformPostId: asStr(row.platform_post_id) || undefined,
    errorMessage: asStr(row.error_message) || undefined,
  }));
}

export function mapMediaRows(
  rows: RawRow[] = [],
  storiesById: Map<string, NewsStory>
): MediaAsset[] {
  return rows
    .map((row) => {
      const articleId = asStr(row.article_id);
      const linkedStory = storiesById.get(articleId);
      const imageUrl = asStr(row.image_url);
      const mediaId = asStr(row.media_id);

      return {
        id: mediaId,
        fileName: imageUrl
          ? imageUrl.split("/").pop()?.split("?")[0] || `${mediaId}.jpg`
          : `${mediaId}.png`,
        title: linkedStory?.headline || `Media ${mediaId}`,
        category: linkedStory?.source || asStr(row.image_source, "Media"),
        templateType: "editorial" as const,
        platformFormat: "1080×1350 (4:5)" as const,
        storyId: articleId,
        storyHeadline: linkedStory?.headline || `Article ${articleId}`,
        createdAt: asStr(row.created_at) || new Date().toISOString(),
        fileSize: asStr(row.permission_status, "Sheet Record"),
        accentTone: "obsidian" as const,
        imageUrl: imageUrl || undefined,
        imageSource: asStr(row.image_source) || undefined,
        permissionStatus: asStr(row.permission_status) || undefined,
        credit: asStr(row.credit) || undefined,
      };
    })
    .reverse();
}

export function mapLogsRows(rows: RawRow[] = []): ActivityItem[] {
  return rows
    .map((row, index) => {
      const level = asStr(row.level, "INFO").toUpperCase();
      const stage = asStr(row.stage, "SYSTEM").toUpperCase();
      const message = asStr(row.message);
      const details = asStr(row.details);
      const ts = asStr(row.timestamp);

      let type: ActivityItem["type"] = "ingest";
      if (level === "ERROR") type = "error";
      else if (stage.includes("AI")) type = "ai";
      else if (stage.includes("SCHED") || stage.includes("QUEUE"))
        type = "schedule";

      return {
        id: `LOG-${index}-${ts}`,
        action: `[${level}] ${stage}`,
        detail: details ? `${message} — ${details}` : message,
        timestamp: ts ? formatDisplayTimestamp(ts) : "—",
        level,
        stage,
        type,
      };
    })
    .reverse();
}

export function mapSettingsRows(
  settingRows: RawRow[] = [],
  sources: NewsSourceConfig[]
): StudioSettings {
  const map = new Map<string, string>();
  settingRows.forEach((row) => {
    const k = asStr(row.setting);
    if (k) map.set(k, asStr(row.value));
  });

  return {
    newsSources: sources,
    primaryAiProvider: map.get("ai_primary") || "GEMINI",
    fallbackAiProvider: map.get("ai_fallback") || "GROQ",
    relevanceThreshold: 70, // AI_CONFIG.minimumRelevance in Code.gs
    dailyPublishingTarget: asNum(map.get("daily_post_target"), 2),
    timezone: map.get("timezone") || "Europe/Isle_of_Man",
    instagramConnected: asBool(map.get("instagram_enabled")),
    tiktokConnected: asBool(map.get("tiktok_enabled")),
    automationEnabled: asBool(map.get("automation_enabled")),
    publishingEnabled: asBool(map.get("publishing_enabled")),
  };
}

export function mapAllSheetsToStudioPayload(
  raw: RawAllSheetsResponse,
  fetchedAt: string
): StudioBackendPayload {
  const sources = mapSourcesRows(raw.sources);
  const stories = mapNewsRows(raw.news);

  // Compute collected story counts per source
  const countsBySource = new Map<string, number>();
  stories.forEach((s) => {
    countsBySource.set(s.source, (countsBySource.get(s.source) || 0) + 1);
  });
  sources.forEach((src) => {
    src.itemsCollectedDemo = countsBySource.get(src.name) || 0;
  });

  const storiesById = new Map<string, NewsStory>();
  stories.forEach((s) => {
    if (s.id) storiesById.set(s.id, s);
  });

  const queue = mapQueueRows(raw.queue);
  const queueByPostId = new Map<string, QueueItem>();
  queue.forEach((q) => {
    if (q.postId) queueByPostId.set(q.postId, q);
  });

  const posts = mapSocialPostRows(raw.social_posts, storiesById, queueByPostId);
  const mediaAssets = mapMediaRows(raw.media, storiesById);
  const activities = mapLogsRows(raw.logs);
  const settings = mapSettingsRows(raw.settings, sources);

  return {
    stories,
    posts,
    mediaAssets,
    queue,
    activities,
    settings,
    fetchedAt,
  };
}

function formatDisplayTimestamp(isoOrStr: string): string {
  const date = new Date(isoOrStr);
  if (Number.isNaN(date.getTime())) return isoOrStr;
  return date.toLocaleString("en-GB", {
    timeZone: "Europe/Isle_of_Man",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
