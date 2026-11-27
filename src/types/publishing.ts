import { Platform } from "@/types/studio";

export interface PublishingControls {
  publishingEnabled: boolean;
  instagramPublishingEnabled: boolean;
  tiktokPublishingEnabled: boolean;
  manualConfirmationRequired: boolean;
  testMode: boolean;
}

export const DEFAULT_PUBLISHING_CONTROLS: PublishingControls = {
  publishingEnabled: false,
  instagramPublishingEnabled: false,
  tiktokPublishingEnabled: false,
  manualConfirmationRequired: true,
  testMode: true,
};

export type PublishJobStatus =
  | "PENDING"
  | "PROCESSING"
  | "PUBLISHED"
  | "FAILED";

export interface PublishExecutionRequest {
  postId: string;
  queueId?: string;
  platform: Platform;
  postStatus: string;
  caption: string;
  headline: string;
  imageUrl: string;
  confirmed: boolean;
  privacyLevel?: string;
  disableComment?: boolean;
}

export interface PublishExecutionResult {
  ok: boolean;
  jobId: string;
  status: PublishJobStatus;
  platform: Platform;
  platformPostId?: string;
  publishedAt?: string;
  error?: string;
  code?:
    | "CONTROLS_DISABLED"
    | "UNAPPROVED_STATUS"
    | "DUPLICATE_JOB"
    | "NOT_CONNECTED"
    | "MISSING_PERMISSIONS"
    | "CONFIRMATION_REQUIRED"
    | "TEST_MODE_BLOCKED"
    | "INVALID_MEDIA"
    | "PLATFORM_API_ERROR";
}
