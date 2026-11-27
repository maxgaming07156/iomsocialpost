"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Send,
  ShieldAlert,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { QueueItem, SocialPost } from "@/types/studio";
import { IntegrationsStatusPayload } from "@/types/integrations";
import {
  DEFAULT_PUBLISHING_CONTROLS,
  PublishExecutionResult,
  PublishingControls,
} from "@/types/publishing";
import { useStudio } from "@/context/StudioContext";

interface PublishConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  queueItem: QueueItem | null;
  post: SocialPost | null;
}

export function PublishConfirmationModal({
  open,
  onClose,
  queueItem,
  post,
}: PublishConfirmationModalProps) {
  const { refreshData, notify } = useStudio();
  const [integrations, setIntegrations] =
    useState<IntegrationsStatusPayload | null>(null);
  const [controls, setControls] = useState<PublishingControls>(
    DEFAULT_PUBLISHING_CONTROLS
  );
  const [loadingMeta, setLoadingMeta] = useState(false);

  const [privacyLevel, setPrivacyLevel] = useState("");
  const [disableComment, setDisableComment] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setConfirmed(false);
    setResultError(null);
    setPrivacyLevel("");
    setLoadingMeta(true);

    Promise.all([
      fetch("/api/integrations/status", { cache: "no-store" }).then((r) =>
        r.json()
      ),
      fetch("/api/publishing/controls", { cache: "no-store" }).then((r) =>
        r.json()
      ),
    ])
      .then(([intJson, ctrlJson]) => {
        setIntegrations(intJson as IntegrationsStatusPayload);
        if (ctrlJson?.controls) {
          const c = ctrlJson.controls as PublishingControls;
          setControls(c);
          if (c.testMode) setPrivacyLevel("SELF_ONLY");
        }
      })
      .finally(() => setLoadingMeta(false));
  }, [open]);

  if (!queueItem || !post) return null;

  const platform = queueItem.platform;
  const accountSummary =
    integrations &&
    (platform === "instagram" ? integrations.instagram : integrations.tiktok);
  const isTikTok = platform === "tiktok";

  const handlePublish = async () => {
    setSubmitting(true);
    setResultError(null);
    try {
      const res = await fetch("/api/publishing/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          queueId: queueItem.queueId,
          platform,
          postStatus: queueItem.status || post.status,
          caption: `${post.caption}\n\n${post.hashtags.join(" ")}`.trim(),
          headline: post.headline,
          imageUrl: post.graphicUrl || "",
          confirmed,
          privacyLevel: isTikTok ? privacyLevel : undefined,
          disableComment,
        }),
      });

      const json = (await res.json()) as PublishExecutionResult;
      if (!res.ok || !json.ok) {
        setResultError(json.error || "Publishing was blocked or failed.");
        return;
      }

      notify(
        `Published to ${platform.toUpperCase()}`,
        `Platform Post ID: ${json.platformPostId}`
      );
      await refreshData();
      onClose();
    } catch {
      setResultError("Network error while executing publish request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Final Publishing Confirmation"
      subtitle="Review all details carefully before submitting to the platform API."
      maxWidthClass="max-w-xl"
    >
      {loadingMeta ? (
        <div className="flex items-center justify-center py-10 text-xs text-zinc-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Checking account connection & publishing controls...
        </div>
      ) : (
        <div className="space-y-4 text-xs">
          {/* Platform + Account + Controls Summary */}
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3.5">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Platform
              </span>
              <p className="mt-1 font-semibold uppercase text-zinc-950">
                {platform}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Connected Account
              </span>
              <p className="mt-1 font-semibold text-zinc-950">
                {accountSummary?.accountName || "Not connected"}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Scheduled Time
              </span>
              <p className="mt-1 font-mono text-[11px] text-zinc-800">
                {queueItem.scheduledAt
                  ? `${queueItem.scheduledAt} (Europe/Isle_of_Man)`
                  : "Immediate"}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Publishing Mode
              </span>
              <div className="mt-1 flex items-center gap-1.5">
                <Badge variant={controls.testMode ? "warning" : "dark"}>
                  {controls.testMode ? "Test Mode ON" : "Live Mode"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Graphic + Caption Preview */}
          <div className="flex gap-4 rounded-lg border border-zinc-200 p-3">
            <div className="w-24 shrink-0">
              {post.graphicUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={post.graphicUrl}
                  alt={post.headline}
                  className="aspect-[4/5] w-full rounded border border-zinc-200 object-cover"
                />
              ) : (
                <div className="flex aspect-[4/5] items-center justify-center rounded border border-dashed border-zinc-300 bg-zinc-50 p-2 text-center text-[10px] text-zinc-400">
                  No graphic URL
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-zinc-950">{post.headline}</p>
              <p className="mt-1 line-clamp-4 whitespace-pre-line text-[11px] text-zinc-600">
                {post.caption}
              </p>
              <p className="mt-1.5 text-[10px] font-medium text-[#C81E1E]">
                {post.hashtags.join(" ")}
              </p>
            </div>
          </div>

          {/* Visibility / Privacy & Restrictions */}
          <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/70 p-3">
            {isTikTok ? (
              <>
                <label className="block font-semibold text-zinc-800">
                  TikTok Visibility / Privacy Setting (Required)
                </label>
                <select
                  value={privacyLevel}
                  onChange={(e) => setPrivacyLevel(e.target.value)}
                  disabled={controls.testMode}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-950 disabled:bg-zinc-100"
                >
                  <option value="">-- Select privacy level --</option>
                  <option value="SELF_ONLY">SELF_ONLY (Private)</option>
                  {!controls.testMode && (
                    <>
                      <option value="MUTUAL_FOLLOW_FRIENDS">
                        MUTUAL_FOLLOW_FRIENDS
                      </option>
                      <option value="PUBLIC_TO_EVERYONE">
                        PUBLIC_TO_EVERYONE
                      </option>
                    </>
                  )}
                </select>
                <label className="flex items-center gap-2 pt-1 text-[11px] text-zinc-700">
                  <input
                    type="checkbox"
                    checked={disableComment}
                    onChange={(e) => setDisableComment(e.target.checked)}
                    className="accent-zinc-950"
                  />
                  Disable comments on this TikTok post
                </label>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-800">
                  Visibility / Privacy
                </span>
                <span className="text-[11px] text-zinc-600">
                  Public Instagram Feed (Graph API)
                </span>
              </div>
            )}

            <p className="flex items-start gap-1.5 pt-1 text-[11px] text-zinc-500">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#C81E1E]" />
              <span>
                {isTikTok
                  ? "TikTok Photo API requires JPEG/WebP on a verified domain (no promotional branding) and enforces SELF_ONLY until App Audit passes."
                  : "Instagram requires a Professional Business/Creator account, Meta App Review, and a publicly accessible HTTPS image URL."}
              </span>
            </p>
          </div>

          {resultError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-[#C81E1E]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{resultError}</span>
            </div>
          )}

          {/* Explicit Confirmation Checkbox */}
          <label className="flex items-start gap-2.5 rounded-lg border border-zinc-200 bg-white p-3 text-xs">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 accent-zinc-950"
            />
            <span className="font-medium text-zinc-800">
              I confirm this post, graphic, and privacy setting are accurate and
              explicitly authorise submission to {platform.toUpperCase()}.
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting || !confirmed || (isTikTok && !privacyLevel)}
              onClick={handlePublish}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-40"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {submitting ? "Submitting..." : `Publish to ${platform}`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
