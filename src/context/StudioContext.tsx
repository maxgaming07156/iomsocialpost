"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  DEMO_ACTIVITIES,
  DEMO_MEDIA_ASSETS,
  DEMO_SETTINGS,
  DEMO_SOCIAL_POSTS,
  DEMO_STORIES,
} from "@/data/demoData";
import {
  ActivityItem,
  MediaAsset,
  NewsStory,
  Platform,
  PostStatus,
  QueueItem,
  SocialPost,
  StoryProcessingStatus,
  StudioBackendPayload,
  StudioMode,
  StudioSettings,
} from "@/types/studio";

export type ConnectionStatus = "checking" | "demo" | "connected" | "error";

interface ToastMessage {
  id: string;
  title: string;
  description?: string;
}

interface StudioContextValue {
  mode: StudioMode;
  connectionStatus: ConnectionStatus;
  isLoading: boolean;
  backendError: string | null;
  lastSyncedAt: string | null;
  stories: NewsStory[];
  posts: SocialPost[];
  mediaAssets: MediaAsset[];
  queue: QueueItem[];
  activities: ActivityItem[];
  settings: StudioSettings;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
  notify: (title: string, description?: string) => void;
  refreshData: () => Promise<void>;
  updateStoryStatus: (storyId: string, status: StoryProcessingStatus) => void;
  savePostDraft: (params: {
    postId?: string;
    articleId: string;
    platform: Platform;
    headline: string;
    caption: string;
    supportingText: string;
    hashtags: string[];
    status?: "DRAFT" | "NEEDS_REVIEW";
  }) => Promise<boolean>;
  setPostApprovalStatus: (
    postId: string,
    status: "DRAFT" | "NEEDS_REVIEW" | "APPROVED" | "REJECTED",
    rejectionReason?: string
  ) => Promise<boolean>;
  enqueueApprovedPost: (
    postId: string,
    scheduledAt: string
  ) => Promise<boolean>;
  rescheduleQueueItem: (
    queueId: string,
    scheduledAt: string
  ) => Promise<boolean>;
  updateSettings: (updates: Partial<StudioSettings>) => void;
  toggleNewsSource: (sourceId: string) => void;
  resetDemoData: () => void;
}

const StudioContext = createContext<StudioContextValue | undefined>(undefined);

const EMPTY_SETTINGS: StudioSettings = {
  newsSources: [],
  primaryAiProvider: "GEMINI",
  fallbackAiProvider: "GROQ",
  relevanceThreshold: 70,
  dailyPublishingTarget: 2,
  timezone: "Europe/Isle_of_Man",
  instagramConnected: false,
  tiktokConnected: false,
  automationEnabled: false,
  publishingEnabled: false,
};

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<StudioMode>("demo");
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("checking");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const [stories, setStories] = useState<NewsStory[]>(DEMO_STORIES);
  const [posts, setPosts] = useState<SocialPost[]>(DEMO_SOCIAL_POSTS);
  const [mediaAssets, setMediaAssets] =
    useState<MediaAsset[]>(DEMO_MEDIA_ASSETS);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>(DEMO_ACTIVITIES);
  const [settings, setSettings] = useState<StudioSettings>(DEMO_SETTINGS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((title: string, description?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setBackendError(null);

    try {
      const res = await fetch("/api/studio/data", {
        method: "GET",
        cache: "no-store",
      });

      const json = (await res.json()) as {
        ok?: boolean;
        configured?: boolean;
        mode?: StudioMode;
        fetchedAt?: string;
        data?: StudioBackendPayload;
        error?: string;
      };

      if (json.configured === false) {
        setMode("demo");
        setConnectionStatus("demo");
        setStories(DEMO_STORIES);
        setPosts(DEMO_SOCIAL_POSTS);
        setMediaAssets(DEMO_MEDIA_ASSETS);
        setQueue([]);
        setActivities(DEMO_ACTIVITIES);
        setSettings(DEMO_SETTINGS);
        setLastSyncedAt(null);
        return;
      }

      setMode("live");

      if (!res.ok || !json.ok || !json.data) {
        setConnectionStatus("error");
        setBackendError(
          json.error || "Unable to load data from Google Sheets backend."
        );
        setStories([]);
        setPosts([]);
        setMediaAssets([]);
        setQueue([]);
        setActivities([]);
        setSettings(EMPTY_SETTINGS);
        return;
      }

      setConnectionStatus("connected");
      setStories(json.data.stories);
      setPosts(json.data.posts);
      setMediaAssets(json.data.mediaAssets);
      setQueue(json.data.queue);
      setActivities(json.data.activities);
      setSettings(json.data.settings);
      setLastSyncedAt(json.fetchedAt || new Date().toISOString());
    } catch {
      setMode("live");
      setConnectionStatus("error");
      setBackendError("Network error while contacting /api/studio/data.");
      setStories([]);
      setPosts([]);
      setMediaAssets([]);
      setQueue([]);
      setActivities([]);
      setSettings(EMPTY_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const appendActivity = useCallback(
    (action: string, detail: string, type: ActivityItem["type"]) => {
      const entry: ActivityItem = {
        id: `ACT-${Date.now()}`,
        action,
        detail,
        timestamp: "Just now",
        type,
      };
      setActivities((prev) => [entry, ...prev.slice(0, 11)]);
    },
    []
  );

  const updateStoryStatus = useCallback(
    (storyId: string, status: StoryProcessingStatus) => {
      if (mode === "live") {
        notify(
          "Read-only on NEWS tab",
          "Original NEWS records are preserved; use Social Posts to approve or reject drafts."
        );
        return;
      }
      setStories((prev) =>
        prev.map((s) =>
          s.id === storyId ? { ...s, processingStatus: status } : s
        )
      );
      const target = stories.find((s) => s.id === storyId);
      appendActivity(
        `Story marked ${status} (Demo)`,
        target ? target.headline : storyId,
        "approval"
      );
      notify(
        `Story marked "${status}"`,
        "Updated in local demonstration state only."
      );
    },
    [mode, stories, appendActivity, notify]
  );

  const savePostDraft = useCallback(
    async (params: {
      postId?: string;
      articleId: string;
      platform: Platform;
      headline: string;
      caption: string;
      supportingText: string;
      hashtags: string[];
      status?: "DRAFT" | "NEEDS_REVIEW";
    }): Promise<boolean> => {
      const nextStatus: PostStatus = params.status || "DRAFT";
      const hashtagString = params.hashtags.join(" ");

      if (mode === "demo") {
        if (params.postId) {
          setPosts((prev) =>
            prev.map((p) =>
              p.id === params.postId
                ? {
                    ...p,
                    headline: params.headline,
                    caption: params.caption,
                    supportingText: params.supportingText,
                    hashtags: params.hashtags,
                    status: nextStatus,
                    updatedAt: new Date().toISOString(),
                  }
                : p
            )
          );
        } else {
          const story = stories.find((s) => s.id === params.articleId);
          setPosts((prev) => [
            {
              id: `POST-${Date.now()}`,
              storyId: params.articleId,
              storyHeadline: story?.headline || params.headline,
              platform: params.platform,
              headline: params.headline,
              caption: params.caption,
              supportingText: params.supportingText,
              hashtags: params.hashtags,
              status: nextStatus,
              format:
                params.platform === "instagram"
                  ? "1080×1350 (4:5)"
                  : "1080×1920 (9:16)",
              updatedAt: new Date().toISOString(),
            },
            ...prev,
          ]);
        }
        notify("Draft saved (Demo)", `Status: ${nextStatus}`);
        return true;
      }

      try {
        const res = await fetch("/api/studio/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            params.postId
              ? {
                  action: "update_post",
                  post_id: params.postId,
                  headline: params.headline,
                  caption: params.caption,
                  supporting_text: params.supportingText,
                  hashtags: hashtagString,
                  status: nextStatus,
                }
              : {
                  action: "upsert_post_for_article",
                  article_id: params.articleId,
                  platform: params.platform.toUpperCase(),
                  headline: params.headline,
                  caption: params.caption,
                  supporting_text: params.supportingText,
                  hashtags: hashtagString,
                  status: nextStatus,
                }
          ),
        });

        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) {
          notify("Failed to save post", json.error || "Apps Script error");
          return false;
        }

        notify("Saved to Google Sheets", `SOCIAL_POSTS updated (${nextStatus}).`);
        await refreshData();
        return true;
      } catch {
        notify("Network error", "Could not save post to Google Sheets.");
        return false;
      }
    },
    [mode, stories, notify, refreshData]
  );

  const setPostApprovalStatus = useCallback(
    async (
      postId: string,
      status: "DRAFT" | "NEEDS_REVIEW" | "APPROVED" | "REJECTED",
      rejectionReason?: string
    ): Promise<boolean> => {
      if (mode === "demo") {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  status,
                  rejectionReason:
                    status === "REJECTED" ? rejectionReason : undefined,
                  updatedAt: new Date().toISOString(),
                }
              : p
          )
        );
        notify(`Post marked ${status} (Demo)`, rejectionReason);
        return true;
      }

      try {
        const res = await fetch("/api/studio/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "set_post_status",
            post_id: postId,
            status,
            rejection_reason: rejectionReason || "",
          }),
        });

        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) {
          notify("Status update failed", json.error || "Apps Script error");
          return false;
        }

        notify(`Post marked ${status}`, "Persisted to SOCIAL_POSTS.");
        await refreshData();
        return true;
      } catch {
        notify("Network error", "Could not update post status.");
        return false;
      }
    },
    [mode, notify, refreshData]
  );

  const enqueueApprovedPost = useCallback(
    async (postId: string, scheduledAt: string): Promise<boolean> => {
      const target = posts.find((p) => p.id === postId);
      if (!target || target.status !== "APPROVED") {
        notify(
          "Approval required",
          "Only APPROVED posts can be added to the publishing queue."
        );
        return false;
      }

      if (mode === "demo") {
        const queueId = `Q-${Date.now()}`;
        setQueue((prev) => [
          ...prev,
          {
            queueId,
            postId,
            platform: target.platform,
            scheduledAt,
            status: "SCHEDULED",
          },
        ]);
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, status: "SCHEDULED", scheduledFor: scheduledAt }
              : p
          )
        );
        notify("Added to Queue (Demo)", scheduledAt);
        return true;
      }

      try {
        const res = await fetch("/api/studio/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "enqueue_post",
            post_id: postId,
            scheduled_at: scheduledAt,
          }),
        });

        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) {
          notify("Queue update failed", json.error || "Apps Script error");
          return false;
        }

        notify(
          "Added to Publishing Queue",
          `Scheduled for ${scheduledAt} (Europe/Isle_of_Man).`
        );
        await refreshData();
        return true;
      } catch {
        notify("Network error", "Could not add post to queue.");
        return false;
      }
    },
    [mode, posts, notify, refreshData]
  );

  const rescheduleQueueItem = useCallback(
    async (queueId: string, scheduledAt: string): Promise<boolean> => {
      if (mode === "demo") {
        setQueue((prev) =>
          prev.map((q) =>
            q.queueId === queueId ? { ...q, scheduledAt } : q
          )
        );
        notify("Schedule updated (Demo)", scheduledAt);
        return true;
      }

      try {
        const res = await fetch("/api/studio/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_queue_schedule",
            queue_id: queueId,
            scheduled_at: scheduledAt,
          }),
        });

        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) {
          notify("Reschedule failed", json.error || "Apps Script error");
          return false;
        }

        notify(
          "Schedule updated",
          `Updated to ${scheduledAt} (Europe/Isle_of_Man).`
        );
        await refreshData();
        return true;
      } catch {
        notify("Network error", "Could not update schedule.");
        return false;
      }
    },
    [mode, notify, refreshData]
  );

  const updateSettings = useCallback(
    (updates: Partial<StudioSettings>) => {
      if (mode === "live") {
        notify("Read-only in Phase 4", "SETTINGS tab is read-only.");
        return;
      }
      setSettings((prev) => ({ ...prev, ...updates }));
      notify(
        "Demo settings updated",
        "Demo settings are stored in local browser state only."
      );
    },
    [mode, notify]
  );

  const toggleNewsSource = useCallback(
    (sourceId: string) => {
      if (mode === "live") {
        notify("Read-only in Phase 4", "SOURCES tab is read-only.");
        return;
      }
      setSettings((prev) => ({
        ...prev,
        newsSources: prev.newsSources.map((src) =>
          src.id === sourceId ? { ...src, enabled: !src.enabled } : src
        ),
      }));
      notify(
        "RSS source toggled (Demo)",
        "Backend Apps Script feeds are not modified in Demo Mode."
      );
    },
    [mode, notify]
  );

  const resetDemoData = useCallback(() => {
    if (mode === "live") {
      refreshData();
      return;
    }
    setStories(DEMO_STORIES);
    setPosts(DEMO_SOCIAL_POSTS);
    setMediaAssets(DEMO_MEDIA_ASSETS);
    setQueue([]);
    setActivities(DEMO_ACTIVITIES);
    setSettings(DEMO_SETTINGS);
    notify("Demonstration state reset", "All sample data restored to defaults.");
  }, [mode, refreshData, notify]);

  return (
    <StudioContext.Provider
      value={{
        mode,
        connectionStatus,
        isLoading,
        backendError,
        lastSyncedAt,
        stories,
        posts,
        mediaAssets,
        queue,
        activities,
        settings,
        toasts,
        dismissToast,
        notify,
        refreshData,
        updateStoryStatus,
        savePostDraft,
        setPostApprovalStatus,
        enqueueApprovedPost,
        rescheduleQueueItem,
        updateSettings,
        toggleNewsSource,
        resetDemoData,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) {
    throw new Error("useStudio must be used within a StudioProvider");
  }
  return ctx;
}
