export type Platform = "instagram" | "tiktok";

export type StudioMode = "demo" | "live";

export type StoryAiDecision = "Publish" | "Review" | "Skip";

export type StoryProcessingStatus =
  | "Awaiting Review"
  | "Approved"
  | "Rejected"
  | "Drafts Generated"
  | "NEW"
  | "PROCESSING"
  | "AI_APPROVED"
  | "REJECTED"
  | "AI_ERROR";

export type PostStatus =
  | "DRAFT"
  | "NEEDS_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SCHEDULED"
  | "PUBLISHED";

export type GraphicTemplateType =
  | "editorial"
  | "breaking"
  | "community"
  | "event";

export interface NewsStory {
  id: string;
  headline: string;
  summary: string;
  source: string;
  sourceUrl: string;
  imageUrl?: string;
  category: string;
  publishedAt: string; // ISO date string or feed date string
  discoveredAt?: string;
  processedAt?: string;
  relevanceScore: number; // 0-100
  aiDecision: StoryAiDecision;
  aiProvider: "Gemini" | "Groq" | "Pipeline";
  aiReasoning: string;
  processingStatus: StoryProcessingStatus;
  location: string;
}

export interface SocialPost {
  id: string;
  storyId: string;
  storyHeadline: string;
  platform: Platform;
  headline: string;
  caption: string;
  supportingText?: string;
  hashtags: string[];
  graphicUrl?: string;
  status: PostStatus;
  rejectionReason?: string;
  scheduledFor?: string; // ISO date-time string
  format: "1080×1350 (4:5)" | "1080×1920 (9:16)";
  updatedAt: string;
}

export interface MediaAsset {
  id: string;
  fileName: string;
  title: string;
  category: string;
  templateType: GraphicTemplateType;
  platformFormat: "1080×1350 (4:5)" | "1080×1920 (9:16)" | "1080×1080 (1:1)";
  storyId: string;
  storyHeadline: string;
  createdAt: string;
  fileSize: string;
  accentTone: "crimson" | "obsidian" | "slate" | "bone";
  imageUrl?: string;
  imageSource?: string;
  permissionStatus?: string;
  credit?: string;
}

export interface QueueItem {
  queueId: string;
  postId: string;
  platform: Platform;
  scheduledAt: string;
  status: string;
  publishedAt?: string;
  platformPostId?: string;
  errorMessage?: string;
}

export interface ActivityItem {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
  level?: string;
  stage?: string;
  type: "ingest" | "ai" | "approval" | "draft" | "schedule" | "error";
}

export interface NewsSourceConfig {
  id: string;
  name: string;
  feedUrl: string;
  enabled: boolean;
  trustLevel?: string;
  lastPolledDemo: string;
  lastError?: string;
  itemsCollectedDemo: number;
}

export interface StudioSettings {
  newsSources: NewsSourceConfig[];
  primaryAiProvider: string;
  fallbackAiProvider: string;
  relevanceThreshold: number;
  dailyPublishingTarget: number;
  timezone: string;
  instagramConnected: boolean;
  tiktokConnected: boolean;
  automationEnabled: boolean;
  publishingEnabled?: boolean;
}

export interface StudioBackendPayload {
  stories: NewsStory[];
  posts: SocialPost[];
  mediaAssets: MediaAsset[];
  queue: QueueItem[];
  activities: ActivityItem[];
  settings: StudioSettings;
  fetchedAt: string;
}
