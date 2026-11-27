"use client";

import React, { useMemo, useState } from "react";
import { Search, Newspaper, Check, X } from "lucide-react";
import { useStudio } from "@/context/StudioContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { StoryDetailPanel } from "@/components/newsroom/StoryDetailPanel";
import { StoryAiDecision } from "@/types/studio";

export function NewsroomView() {
  const { mode, stories, posts, updateStoryStatus } = useStudio();
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [decisionFilter, setDecisionFilter] = useState<StoryAiDecision | "all">(
    "all"
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    stories[0]?.id ?? null
  );

  const sources = useMemo(
    () => Array.from(new Set(stories.map((s) => s.source))),
    [stories]
  );

  const statuses = useMemo(
    () => Array.from(new Set(stories.map((s) => s.processingStatus))),
    [stories]
  );

  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      const matchesQuery =
        searchQuery.trim() === "" ||
        story.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        story.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
        story.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSource =
        sourceFilter === "all" || story.source === sourceFilter;
      const matchesStatus =
        statusFilter === "all" || story.processingStatus === statusFilter;
      const matchesDecision =
        decisionFilter === "all" || story.aiDecision === decisionFilter;

      return (
        matchesQuery && matchesSource && matchesStatus && matchesDecision
      );
    });
  }, [stories, searchQuery, sourceFilter, statusFilter, decisionFilter]);

  const selectedStory = useMemo(
    () =>
      stories.find((s) => s.id === selectedId) ??
      filteredStories[0] ??
      null,
    [stories, filteredStories, selectedId]
  );

  const linkedPosts = useMemo(
    () =>
      selectedStory
        ? posts.filter((p) => p.storyId === selectedStory.id)
        : [],
    [posts, selectedStory]
  );

  const clearFilters = () => {
    setSearchQuery("");
    setSourceFilter("all");
    setStatusFilter("all");
    setDecisionFilter("all");
  };

  return (
    <div>
      <PageHeader
        title="Newsroom"
        breadcrumb="Newsroom"
        description={
          mode === "live"
            ? "Live stories from your Google Sheets NEWS tab (read-only in Phase 2)."
            : "Collected Isle of Man stories evaluated by Gemini (primary) and Groq (fallback). Approve or reject actions update local demonstration state only."
        }
      />

      {/* Search & Filter Bar */}
      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search headlines, sources, or categories..."
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-xs text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            aria-label="Filter by source"
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-700 focus:border-zinc-950 focus:outline-none"
          >
            <option value="all">All Sources</option>
            {sources.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>

          <select
            value={decisionFilter}
            onChange={(e) =>
              setDecisionFilter(e.target.value as StoryAiDecision | "all")
            }
            aria-label="Filter by AI decision"
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-700 focus:border-zinc-950 focus:outline-none"
          >
            <option value="all">All AI Decisions</option>
            <option value="Publish">Publish</option>
            <option value="Review">Review</option>
            <option value="Skip">Skip</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by processing status"
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-700 focus:border-zinc-950 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            {statuses.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Split View: Table + Detail Panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {filteredStories.length === 0 ? (
            <EmptyState
              icon={Newspaper}
              title={
                stories.length === 0
                  ? "No stories in NEWS sheet"
                  : "No matching stories"
              }
              description={
                stories.length === 0
                  ? "Run news discovery in Apps Script or switch to Demo Mode to view sample stories."
                  : "No stories match your current search or filter criteria."
              }
              action={
                stories.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                  >
                    Clear Filters
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      <th className="px-4 py-3">Headline</th>
                      <th className="px-3 py-3">Source</th>
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3 text-right">Score</th>
                      <th className="px-3 py-3">AI Decision</th>
                      <th className="px-3 py-3">Status</th>
                      {mode === "demo" && (
                        <th className="px-4 py-3 text-right">Demo Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredStories.map((story) => {
                      const isSelected = selectedStory?.id === story.id;
                      const isApproved =
                        story.processingStatus === "Approved" ||
                        story.processingStatus === "Drafts Generated" ||
                        story.processingStatus === "AI_APPROVED";
                      const isRejected =
                        story.processingStatus === "Rejected" ||
                        story.processingStatus === "REJECTED" ||
                        story.processingStatus === "AI_ERROR";

                      return (
                        <tr
                          key={story.id}
                          onClick={() => setSelectedId(story.id)}
                          className={`cursor-pointer transition ${
                            isSelected
                              ? "bg-zinc-100/80"
                              : "hover:bg-zinc-50/80"
                          }`}
                        >
                          <td className="max-w-[260px] px-4 py-3">
                            <p className="line-clamp-2 font-medium text-zinc-950">
                              {story.headline}
                            </p>
                            <span className="mt-0.5 inline-block text-[10px] text-zinc-400">
                              {story.category} · {story.location}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-zinc-600">
                            {story.source}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-zinc-500">
                            {(() => {
                              const d = new Date(story.publishedAt);
                              return Number.isNaN(d.getTime())
                                ? "—"
                                : d.toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                  });
                            })()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right font-mono font-semibold text-zinc-900">
                            {story.relevanceScore}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <Badge
                              variant={
                                story.aiDecision === "Publish"
                                  ? "dark"
                                  : story.aiDecision === "Review"
                                    ? "warning"
                                    : "muted"
                              }
                            >
                              {story.aiDecision}
                            </Badge>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <Badge
                              variant={
                                isApproved
                                  ? "success"
                                  : isRejected
                                    ? "muted"
                                    : "warning"
                              }
                            >
                              {story.processingStatus}
                            </Badge>
                          </td>
                          {mode === "demo" && (
                            <td
                              className="whitespace-nowrap px-4 py-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  title="Approve story (Demo)"
                                  onClick={() =>
                                    updateStoryStatus(story.id, "Approved")
                                  }
                                  className="rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-700 transition hover:border-zinc-950 hover:bg-zinc-950 hover:text-white"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  title="Reject story (Demo)"
                                  onClick={() =>
                                    updateStoryStatus(story.id, "Rejected")
                                  }
                                  className="rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-700 transition hover:border-[#C81E1E] hover:bg-red-50 hover:text-[#C81E1E]"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Story Detail Panel */}
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-16">
            <StoryDetailPanel
              story={selectedStory}
              linkedPosts={linkedPosts}
              mode={mode}
              onClose={() => setSelectedId(null)}
              onApprove={(id) => updateStoryStatus(id, "Approved")}
              onReject={(id) => updateStoryStatus(id, "Rejected")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
