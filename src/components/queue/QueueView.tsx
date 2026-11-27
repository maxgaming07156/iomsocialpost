"use client";

import React, { useMemo, useState } from "react";
import {
  ListChecks,
  CalendarClock,
  CheckCircle2,
  ShieldAlert,
  Save,
  Plus,
  Loader2,
  Send,
} from "lucide-react";
import { useStudio } from "@/context/StudioContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PublishConfirmationModal } from "@/components/queue/PublishConfirmationModal";
import { QueueItem } from "@/types/studio";

function defaultScheduleDateTime(): string {
  const now = new Date();
  now.setHours(now.getHours() + 2, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function QueueView() {
  const {
    mode,
    queue,
    posts,
    enqueueApprovedPost,
    rescheduleQueueItem,
  } = useStudio();

  const [selectedApprovedPostId, setSelectedApprovedPostId] = useState("");
  const [newScheduleTime, setNewScheduleTime] = useState(
    defaultScheduleDateTime
  );
  const [isEnqueuing, setIsEnqueuing] = useState(false);

  const [editingTimes, setEditingTimes] = useState<Record<string, string>>({});
  const [savingQueueId, setSavingQueueId] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<QueueItem | null>(null);

  const approvedPosts = useMemo(
    () => posts.filter((p) => p.status === "APPROVED"),
    [posts]
  );

  const postsById = useMemo(() => {
    const map = new Map<string, (typeof posts)[number]>();
    posts.forEach((p) => map.set(p.id, p));
    return map;
  }, [posts]);

  const handleAddToQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = selectedApprovedPostId || approvedPosts[0]?.id;
    if (!targetId || !newScheduleTime) return;
    setIsEnqueuing(true);
    const ok = await enqueueApprovedPost(targetId, newScheduleTime);
    setIsEnqueuing(false);
    if (ok) {
      setSelectedApprovedPostId("");
    }
  };

  const handleSaveSchedule = async (queueId: string, fallbackTime: string) => {
    const nextTime = editingTimes[queueId] ?? fallbackTime;
    if (!nextTime) return;
    setSavingQueueId(queueId);
    await rescheduleQueueItem(queueId, nextTime);
    setSavingQueueId(null);
  };

  return (
    <div>
      <PageHeader
        title="Publishing Queue"
        breadcrumb="Publishing Queue"
        description="Manage scheduled posts in Europe/Isle_of_Man. Only APPROVED posts can be queued. Auto-publishing remains disabled."
        action={
          <Badge variant="muted">
            <ShieldAlert className="h-3 w-3 text-[#C81E1E]" />
            Auto-Publishing Disabled
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Add Approved Post to Queue */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader
              title="Add Approved Post to Queue"
              subtitle="Only APPROVED posts are eligible"
              action={
                <Badge variant="success">
                  {approvedPosts.length} Approved
                </Badge>
              }
            />

            {approvedPosts.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={CheckCircle2}
                  title="No APPROVED posts ready"
                  description="Approve a post in Social Posts first before adding it to the publishing queue."
                />
              </div>
            ) : (
              <form onSubmit={handleAddToQueue} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-800">
                    Approved Post
                  </label>
                  <select
                    value={selectedApprovedPostId || approvedPosts[0]?.id || ""}
                    onChange={(e) => setSelectedApprovedPostId(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-950 focus:border-zinc-950 focus:bg-white focus:outline-none"
                  >
                    {approvedPosts.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.platform.toUpperCase()}] {p.headline}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-800">
                    Scheduled Date & Time (Europe/Isle_of_Man)
                  </label>
                  <input
                    type="datetime-local"
                    value={newScheduleTime}
                    onChange={(e) => setNewScheduleTime(e.target.value)}
                    required
                    className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-950 focus:border-zinc-950 focus:bg-white focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isEnqueuing}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isEnqueuing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  {isEnqueuing ? "Adding to Queue..." : "Add to Queue"}
                </button>
              </form>
            )}
          </Card>
        </div>

        {/* Right: Queued Posts List */}
        <div className="lg:col-span-8">
          {queue.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title={
                mode === "live"
                  ? "Publishing queue is empty"
                  : "No queued posts in demo state"
              }
              description="Approve a post in Social Posts and add it to the queue to schedule its Europe/Isle_of_Man slot."
            />
          ) : (
            <div className="space-y-4">
              {queue.map((item) => {
                const post = postsById.get(item.postId);
                const currentInputValue =
                  editingTimes[item.queueId] ??
                  (item.scheduledAt ? item.scheduledAt.slice(0, 16) : "");
                const isSaving = savingQueueId === item.queueId;

                return (
                  <Card key={item.queueId} padding="sm">
                    <div className="flex flex-col gap-4 sm:flex-row">
                      {/* Graphic Preview */}
                      <div className="w-full shrink-0 sm:w-28">
                        {post?.graphicUrl ? (
                          <div className="aspect-[4/5] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={post.graphicUrl}
                              alt={post.headline}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex aspect-[4/5] items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-2 text-center text-[10px] text-zinc-400">
                            No graphic saved
                          </div>
                        )}
                      </div>

                      {/* Post & Schedule Details */}
                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="dark" className="uppercase">
                                {item.platform}
                              </Badge>
                              <Badge variant="red">{item.status}</Badge>
                            </div>
                            <span className="font-mono text-[10px] text-zinc-400">
                              {item.queueId}
                            </span>
                          </div>

                          <h3 className="mt-2 text-sm font-semibold text-zinc-950">
                            {post?.headline || `Post ${item.postId}`}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-xs text-zinc-600">
                            {post?.caption || "No caption available."}
                          </p>
                        </div>

                        <div className="mt-4 flex flex-col gap-2 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <CalendarClock className="h-3.5 w-3.5 text-zinc-400" />
                            <input
                              type="datetime-local"
                              value={currentInputValue}
                              onChange={(e) =>
                                setEditingTimes((prev) => ({
                                  ...prev,
                                  [item.queueId]: e.target.value,
                                }))
                              }
                              aria-label="Scheduled date and time"
                              className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 font-mono text-xs text-zinc-900 focus:border-zinc-950 focus:bg-white focus:outline-none"
                            />
                            <span className="text-[10px] text-zinc-400">
                              Europe/Isle_of_Man
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleSaveSchedule(
                                  item.queueId,
                                  item.scheduledAt.slice(0, 16)
                                )
                              }
                              disabled={isSaving}
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-50 disabled:opacity-50"
                            >
                              {isSaving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Save className="h-3 w-3" />
                              )}
                              {isSaving ? "Saving..." : "Update Time"}
                            </button>

                            {item.status.toUpperCase() !== "PUBLISHED" && post && (
                              <button
                                type="button"
                                onClick={() => setConfirmItem(item)}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-800"
                              >
                                <Send className="h-3 w-3" />
                                Review & Publish
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <PublishConfirmationModal
        open={Boolean(confirmItem)}
        onClose={() => setConfirmItem(null)}
        queueItem={confirmItem}
        post={confirmItem ? postsById.get(confirmItem.postId) ?? null : null}
      />
    </div>
  );
}
