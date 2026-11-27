"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Newspaper,
  Clock,
  CheckCircle2,
  FileEdit,
  CalendarClock,
  ArrowUpRight,
  Activity,
  Target,
  Instagram,
  Video,
} from "lucide-react";
import { useStudio } from "@/context/StudioContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

function isApprovedStatus(status: string): boolean {
  return (
    status === "Approved" ||
    status === "Drafts Generated" ||
    status === "AI_APPROVED"
  );
}

export function OverviewView() {
  const { mode, stories, posts, queue, activities, settings } = useStudio();
  const [logsModalOpen, setLogsModalOpen] = useState(false);

  const draftPosts = posts.filter((p) => p.status === "DRAFT").length;
  const awaitingReview = posts.filter((p) => p.status === "NEEDS_REVIEW").length;
  const approvedPosts = posts.filter((p) => p.status === "APPROVED").length;
  const scheduledPosts =
    queue.length > 0
      ? queue.filter((q) => q.status.toUpperCase() === "SCHEDULED").length
      : posts.filter((p) => p.status === "SCHEDULED").length;
  const publishedPosts = posts.filter((p) => p.status === "PUBLISHED").length;

  const igPosts = posts.filter((p) => p.platform === "instagram");
  const ttPosts = posts.filter((p) => p.platform === "tiktok");

  const dataLabel = mode === "live" ? "Live" : "Demo";

  const stats = [
    {
      label: "Drafts",
      value: draftPosts,
      sub: "SOCIAL_POSTS · DRAFT",
      icon: FileEdit,
      href: "/social-posts",
    },
    {
      label: "Awaiting Review",
      value: awaitingReview,
      sub: "SOCIAL_POSTS · NEEDS_REVIEW",
      icon: Clock,
      href: "/social-posts",
      highlight: awaitingReview > 0,
    },
    {
      label: "Approved",
      value: approvedPosts,
      sub: "Ready for queue",
      icon: CheckCircle2,
      href: "/queue",
    },
    {
      label: "Scheduled",
      value: scheduledPosts,
      sub: "Queued in Europe/Isle_of_Man",
      icon: CalendarClock,
      href: "/queue",
    },
    {
      label: "Published",
      value: publishedPosts,
      sub: `${stories.length} stories in NEWS`,
      icon: Newspaper,
      href: "/calendar",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Editorial Overview"
        breadcrumb="Overview"
        description={
          mode === "live"
            ? "Live read-only summary from your InsideTheIOM Google Sheets backend (NEWS, SOCIAL_POSTS, QUEUE, SETTINGS, LOGS)."
            : "Summary of Isle of Man story collection, AI relevance triage, and social publishing readiness. All figures below reflect local demonstration data."
        }
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/newsroom"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50"
            >
              Review Stories
              <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" />
            </Link>
            <Link
              href="/graphics-studio"
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-2 text-xs font-medium text-white transition hover:bg-zinc-800"
            >
              Open Graphics Studio
            </Link>
          </div>
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href} className="group block">
              <Card className="h-full transition group-hover:border-zinc-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-500">
                    {stat.label}
                  </span>
                  <Icon
                    className={`h-4 w-4 ${
                      stat.highlight ? "text-[#C81E1E]" : "text-zinc-400"
                    }`}
                  />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tracking-tight text-zinc-950">
                    {stat.value}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                    {dataLabel}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">{stat.sub}</p>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Middle Row: Daily Target + Platform Publishing Overview */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader
            title="Daily Publishing Target"
            subtitle={`Configured cadence (${dataLabel})`}
            action={
              <Badge variant="red">
                <Target className="h-3 w-3" />
                {settings.dailyPublishingTarget} posts / day
              </Badge>
            }
          />
          <div className="mt-4 space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-semibold tracking-tight text-zinc-950">
                  {scheduledPosts} / {settings.dailyPublishingTarget}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Scheduled in queue ({dataLabel})
                </p>
              </div>
              <span className="rounded-md bg-zinc-100 px-2 py-1 font-mono text-[11px] text-zinc-700">
                {settings.timezone}
              </span>
            </div>

            <div className="space-y-2 border-t border-zinc-100 pt-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Primary AI Evaluation</span>
                <span className="font-medium text-zinc-900">
                  {settings.primaryAiProvider}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Fallback AI Provider</span>
                <span className="font-medium text-zinc-900">
                  {settings.fallbackAiProvider}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Discovery Automation</span>
                <Badge variant={settings.automationEnabled ? "success" : "muted"}>
                  {settings.automationEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Platform Publishing Overview"
            subtitle={
              mode === "live"
                ? "Live SOCIAL_POSTS distribution across Instagram and TikTok"
                : "Demonstration queue distribution across Instagram and TikTok"
            }
            action={
              <Link
                href="/social-posts"
                className="text-xs font-medium text-[#C81E1E] hover:underline"
              >
                Manage Posts →
              </Link>
            }
          />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Instagram Summary */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-950 text-white">
                    <Instagram className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-950">
                      Instagram
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      1080×1350 (4:5) Editorial Cards
                    </p>
                  </div>
                </div>
                <Badge variant="outline">{dataLabel}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-200/80 pt-3 text-center">
                <div>
                  <p className="text-base font-semibold text-zinc-950">
                    {igPosts.filter((p) => p.status === "DRAFT").length}
                  </p>
                  <p className="text-[10px] text-zinc-500">Draft</p>
                </div>
                <div>
                  <p className="text-base font-semibold text-zinc-950">
                    {igPosts.filter((p) => p.status === "SCHEDULED").length}
                  </p>
                  <p className="text-[10px] text-zinc-500">Scheduled</p>
                </div>
                <div>
                  <p className="text-base font-semibold text-zinc-950">
                    {igPosts.filter((p) => p.status === "PUBLISHED").length}
                  </p>
                  <p className="text-[10px] text-zinc-500">Published</p>
                </div>
              </div>
            </div>

            {/* TikTok Summary */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-950 text-white">
                    <Video className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-950">TikTok</p>
                    <p className="text-[11px] text-zinc-500">
                      1080×1920 (9:16) Short Briefs
                    </p>
                  </div>
                </div>
                <Badge variant="outline">{dataLabel}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-200/80 pt-3 text-center">
                <div>
                  <p className="text-base font-semibold text-zinc-950">
                    {ttPosts.filter((p) => p.status === "DRAFT").length}
                  </p>
                  <p className="text-[10px] text-zinc-500">Draft</p>
                </div>
                <div>
                  <p className="text-base font-semibold text-zinc-950">
                    {
                      ttPosts.filter(
                        (p) =>
                          p.status === "SCHEDULED" || p.status === "APPROVED"
                      ).length
                    }
                  </p>
                  <p className="text-[10px] text-zinc-500">Ready</p>
                </div>
                <div>
                  <p className="text-base font-semibold text-zinc-950">
                    {ttPosts.filter((p) => p.status === "PUBLISHED").length}
                  </p>
                  <p className="text-[10px] text-zinc-500">Published</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Row: Recent News Stories + Recent Execution Logs */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={`Recent News Stories (${dataLabel})`}
            subtitle={
              mode === "live"
                ? "Latest rows from NEWS tab"
                : "Latest Isle of Man items from demonstration RSS feeds"
            }
            action={
              <Link
                href="/newsroom"
                className="text-xs font-medium text-[#C81E1E] hover:underline"
              >
                View All →
              </Link>
            }
          />
          {stories.length === 0 ? (
            <p className="py-8 text-center text-xs text-zinc-500">
              No stories found in the NEWS sheet yet.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-zinc-100">
              {stories.slice(0, 5).map((story) => (
                <div
                  key={story.id}
                  className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-zinc-500">
                        {story.source}
                      </span>
                      <span className="text-zinc-300">·</span>
                      <span className="text-[11px] text-zinc-400">
                        {story.category}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs font-medium text-zinc-950 sm:text-sm">
                      {story.headline}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-zinc-700">
                      {story.relevanceScore}/100
                    </span>
                    <Badge
                      variant={
                        isApprovedStatus(story.processingStatus)
                          ? "success"
                          : story.processingStatus === "REJECTED" ||
                              story.processingStatus === "Rejected" ||
                              story.processingStatus === "AI_ERROR"
                            ? "muted"
                            : "warning"
                      }
                    >
                      {story.processingStatus}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title={
              mode === "live" ? "Execution Logs (LOGS)" : "Recent Activity (Demo)"
            }
            subtitle={
              mode === "live"
                ? "Recent entries from Google Sheets LOGS tab"
                : "Simulated pipeline & editor events"
            }
            action={
              <button
                type="button"
                onClick={() => setLogsModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#C81E1E] hover:underline"
              >
                <Activity className="h-3.5 w-3.5" />
                View All ({activities.length})
              </button>
            }
          />
          {activities.length === 0 ? (
            <p className="py-8 text-center text-xs text-zinc-500">
              No execution logs recorded yet.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {activities.slice(0, 5).map((act) => (
                <div key={act.id} className="flex gap-3">
                  <div
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      act.type === "error" ? "bg-[#C81E1E]" : "bg-zinc-900"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-medium text-zinc-900">
                        {act.action}
                      </p>
                      <span className="shrink-0 text-[10px] text-zinc-400">
                        {act.timestamp}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">
                      {act.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Full Logs Modal */}
      <Modal
        open={logsModalOpen}
        onClose={() => setLogsModalOpen(false)}
        title={mode === "live" ? "Execution Logs (LOGS Tab)" : "Activity Log (Demo)"}
        subtitle={`Showing ${activities.length} recorded entries`}
        maxWidthClass="max-w-3xl"
      >
        {activities.length === 0 ? (
          <p className="py-6 text-center text-xs text-zinc-500">
            No logs available.
          </p>
        ) : (
          <div className="max-h-[60vh] divide-y divide-zinc-100 overflow-y-auto">
            {activities.map((act) => (
              <div key={act.id} className="py-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-zinc-950">
                    {act.action}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-400">
                    {act.timestamp}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-zinc-600">{act.detail}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
