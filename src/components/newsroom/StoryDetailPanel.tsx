"use client";

import React from "react";
import Link from "next/link";
import {
  Check,
  X,
  Sparkles,
  MapPin,
  Calendar,
  ExternalLink,
  Send,
} from "lucide-react";
import { NewsStory, SocialPost } from "@/types/studio";
import { Badge } from "@/components/ui/Badge";

interface StoryDetailPanelProps {
  story: NewsStory | null;
  linkedPosts: SocialPost[];
  mode: "demo" | "live";
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function StoryDetailPanel({
  story,
  linkedPosts,
  mode,
  onClose,
  onApprove,
  onReject,
}: StoryDetailPanelProps) {
  if (!story) {
    return (
      <div className="hidden rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center lg:block">
        <p className="text-xs font-semibold text-zinc-900">
          Select a story to inspect
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Click any row in the newsroom table to view AI relevance reasoning,
          story summary, and linked social drafts.
        </p>
      </div>
    );
  }

  const isApproved =
    story.processingStatus === "Approved" ||
    story.processingStatus === "Drafts Generated" ||
    story.processingStatus === "AI_APPROVED";

  const isRejected =
    story.processingStatus === "Rejected" ||
    story.processingStatus === "REJECTED";

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-xs">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-200 p-4">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] font-semibold text-zinc-400">
              {story.id}
            </span>
            <Badge variant="outline">{story.category}</Badge>
            <Badge
              variant={
                isApproved ? "success" : isRejected ? "muted" : "warning"
              }
            >
              {story.processingStatus}
            </Badge>
          </div>
          <h3 className="mt-2 text-sm font-semibold leading-snug text-zinc-950">
            {story.headline}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 lg:hidden"
          aria-label="Close story detail"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-200 bg-zinc-50/70 p-3 text-xs">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              Source
            </span>
            <p className="mt-0.5 font-medium text-zinc-900">{story.source}</p>
          </div>
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              Location
            </span>
            <p className="mt-0.5 flex items-center gap-1 font-medium text-zinc-900">
              <MapPin className="h-3 w-3 text-zinc-400" />
              {story.location}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              Published
            </span>
            <p className="mt-0.5 flex items-center gap-1 font-medium text-zinc-900">
              <Calendar className="h-3 w-3 text-zinc-400" />
              {(() => {
                const d = new Date(story.publishedAt);
                return Number.isNaN(d.getTime())
                  ? story.publishedAt
                  : d.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });
              })()}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              Relevance Score
            </span>
            <p className="mt-0.5 font-mono font-semibold text-zinc-950">
              {story.relevanceScore} / 100
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Story Summary
          </h4>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-700">
            {story.summary}
          </p>
          {story.sourceUrl && (
            <a
              href={story.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#C81E1E] hover:underline"
            >
              Open original article
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
              <Sparkles className="h-3.5 w-3.5 text-[#C81E1E]" />
              AI Decision: {story.aiDecision}
            </span>
            <Badge variant="neutral">
              {story.aiProvider}
            </Badge>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-600">
            {story.aiReasoning}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Linked Social Drafts ({linkedPosts.length})
            </h4>
            {linkedPosts.length > 0 && (
              <Link
                href="/social-posts"
                className="flex items-center gap-1 text-[11px] font-medium text-[#C81E1E] hover:underline"
              >
                Open in Social Posts
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
          {linkedPosts.length === 0 ? (
            <p className="mt-1.5 text-xs text-zinc-500">
              No social drafts linked to this article yet.
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {linkedPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-medium capitalize text-zinc-900">
                      {post.platform} · {post.format}
                    </p>
                    <p className="truncate text-[11px] text-zinc-500">
                      {post.headline}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {post.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-zinc-200 pt-4">
          <p className="mb-2.5 text-[11px] text-zinc-500">
            {mode === "live"
              ? "Read-only in Phase 2 — sheet writes will be added in a later phase."
              : "Demonstration Actions — changes affect local browser state only."}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onApprove(story.id)}
              disabled={mode === "live" || isApproved}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-2 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" />
              Approve {mode === "demo" ? "(Demo)" : ""}
            </button>
            <button
              type="button"
              onClick={() => onReject(story.id)}
              disabled={mode === "live" || isRejected}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X className="h-3.5 w-3.5 text-[#C81E1E]" />
              Reject {mode === "demo" ? "(Demo)" : ""}
            </button>
          </div>
          <Link
            href="/graphics-studio"
            className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
          >
            <Send className="h-3.5 w-3.5" />
            Preview in Graphics Studio
          </Link>
        </div>
      </div>
    </div>
  );
}
