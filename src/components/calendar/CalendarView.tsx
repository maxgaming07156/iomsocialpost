"use client";

import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Target, CalendarDays } from "lucide-react";
import { useStudio } from "@/context/StudioContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Platform } from "@/types/studio";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarView() {
  const { posts, settings } = useStudio();
  // Default to November 2026 to match demonstration schedule dates
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(10); // 0-indexed: 10 = November
  const [platformFilter, setPlatformFilter] = useState<Platform | "all">("all");
  const [selectedDayKey, setSelectedDayKey] = useState<string>("2026-11-26");

  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Convert Sunday=0..Saturday=6 to Monday=0..Sunday=6
    const startOffset = (firstDay.getDay() + 6) % 7;
    const cells: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const postsByDay = useMemo(() => {
    const map: Record<string, typeof posts> = {};
    posts.forEach((post) => {
      if (platformFilter !== "all" && post.platform !== platformFilter) return;
      const dateStr = post.scheduledFor
        ? post.scheduledFor.slice(0, 10)
        : "2026-11-28"; // Place unscheduled drafts on an upcoming demo slot
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(post);
    });
    return map;
  }, [posts, platformFilter]);

  const selectedDayPosts = postsByDay[selectedDayKey] ?? [];

  return (
    <div>
      <PageHeader
        title="Publishing Calendar"
        breadcrumb="Publishing Calendar"
        description="Monthly editorial schedule against the InsideTheIOM daily target of 2 posts per day (Europe/Isle_of_Man). Demonstration data only."
        action={
          <Badge variant="red">
            <Target className="h-3 w-3" />
            Daily Target: {settings.dailyPublishingTarget} posts
          </Badge>
        }
      />

      {/* Toolbar */}
      <div className="mb-5 flex flex-col justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="rounded-lg border border-zinc-200 p-1.5 text-zinc-700 hover:bg-zinc-50"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[150px] text-center text-sm font-semibold text-zinc-950">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="rounded-lg border border-zinc-200 p-1.5 text-zinc-700 hover:bg-zinc-50"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500">Platform:</span>
          <select
            value={platformFilter}
            onChange={(e) =>
              setPlatformFilter(e.target.value as Platform | "all")
            }
            aria-label="Filter calendar by platform"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 focus:border-zinc-950 focus:outline-none"
          >
            <option value="all">All Platforms</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Monthly Grid */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white lg:col-span-8">
          <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50/80">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-500"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-zinc-100">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[96px] bg-zinc-50/40 p-2"
                  />
                );
              }
              const dayKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(
                day
              ).padStart(2, "0")}`;
              const dayPosts = postsByDay[dayKey] ?? [];
              const isSelected = dayKey === selectedDayKey;
              const targetMet = dayPosts.length >= settings.dailyPublishingTarget;

              return (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => setSelectedDayKey(dayKey)}
                  className={`flex min-h-[96px] flex-col justify-between p-2 text-left transition ${
                    isSelected
                      ? "bg-zinc-100/90 ring-1 ring-inset ring-zinc-950"
                      : "hover:bg-zinc-50"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span
                      className={`text-xs font-semibold ${
                        isSelected ? "text-[#C81E1E]" : "text-zinc-800"
                      }`}
                    >
                      {day}
                    </span>
                    {dayPosts.length > 0 && (
                      <span
                        className={`rounded px-1 py-0.5 font-mono text-[9px] font-semibold ${
                          targetMet
                            ? "bg-zinc-950 text-white"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {dayPosts.length}/{settings.dailyPublishingTarget}
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 space-y-1">
                    {dayPosts.slice(0, 2).map((p) => (
                      <div
                        key={p.id}
                        className="truncate rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-zinc-800"
                      >
                        <span className="mr-1 font-bold uppercase text-[#C81E1E]">
                          {p.platform === "instagram" ? "IG" : "TT"}
                        </span>
                        {p.status}
                      </div>
                    ))}
                    {dayPosts.length > 2 && (
                      <p className="text-[9px] font-medium text-zinc-500">
                        +{dayPosts.length - 2} more
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Drawer */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader
              title={`Schedule · ${selectedDayKey}`}
              subtitle={`Target: ${settings.dailyPublishingTarget} posts (Demo)`}
              action={
                <Badge
                  variant={
                    selectedDayPosts.length >= settings.dailyPublishingTarget
                      ? "success"
                      : "outline"
                  }
                >
                  {selectedDayPosts.length} / {settings.dailyPublishingTarget}
                </Badge>
              }
            />

            <div className="mt-4 space-y-3">
              {selectedDayPosts.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="No posts on this date"
                  description="Select a highlighted day (such as 25–28 Nov 2026) to inspect demonstration posts."
                />
              ) : (
                selectedDayPosts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="dark" className="uppercase">
                        {post.platform}
                      </Badge>
                      <Badge
                        variant={
                          post.status === "PUBLISHED"
                            ? "success"
                            : post.status === "SCHEDULED"
                              ? "red"
                              : "neutral"
                        }
                      >
                        {post.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-zinc-950">
                      {post.headline}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[11px] text-zinc-500">
                      {post.storyHeadline}
                    </p>
                    <p className="mt-2 font-mono text-[10px] text-zinc-400">
                      {post.scheduledFor
                        ? `${post.scheduledFor.slice(11, 16)} Europe/Isle_of_Man`
                        : "Unscheduled Draft (Demo)"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
