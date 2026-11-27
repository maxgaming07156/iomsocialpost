"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Newspaper,
  Send,
  Palette,
  CalendarDays,
  ListChecks,
  FolderOpen,
  Settings,
  RotateCcw,
  RefreshCw,
  X,
} from "lucide-react";
import { useStudio } from "@/context/StudioContext";

export const NAV_ITEMS = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Newsroom", href: "/newsroom", icon: Newspaper },
  { label: "Social Posts", href: "/social-posts", icon: Send },
  { label: "Graphics Studio", href: "/graphics-studio", icon: Palette },
  { label: "Publishing Queue", href: "/queue", icon: ListChecks },
  { label: "Publishing Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Media Library", href: "/media-library", icon: FolderOpen },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { mode, isLoading, posts, settings, resetDemoData, refreshData } =
    useStudio();

  const scheduledTodayCount = posts.filter(
    (p) => p.status === "SCHEDULED" || p.status === "PUBLISHED"
  ).length;

  const content = (
    <div className="flex h-full flex-col justify-between bg-white">
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <Link
            href="/"
            onClick={onCloseMobile}
            className="group flex flex-col focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-zinc-950 text-[10px] font-bold tracking-tight text-white">
                IN
              </span>
              <span className="text-sm font-bold tracking-tight text-zinc-950">
                InsideThe<span className="text-[#C81E1E]">IOM</span>
              </span>
              <span className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                Studio
              </span>
            </div>
            <span className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
              THE ISLE OF MAN ALL IN ONE PLACE
            </span>
          </Link>
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 lg:hidden"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="space-y-1 px-3 py-4" aria-label="Primary Navigation">
          <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Editorial Workspace
          </p>
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${
                  isActive
                    ? "bg-zinc-950 text-white shadow-xs"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive
                      ? "text-[#EF4444]"
                      : "text-zinc-400 group-hover:text-zinc-700"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Target & Profile Area */}
      <div className="space-y-3 border-t border-zinc-200 p-3">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-700">
              Daily Target ({mode === "live" ? "Live" : "Demo"})
            </span>
            <span className="text-[11px] font-bold text-[#C81E1E]">
              {settings.dailyPublishingTarget} posts/day
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-zinc-950 transition-all"
              style={{
                width: `${Math.min(
                  100,
                  Math.round(
                    (Math.min(
                      scheduledTodayCount,
                      settings.dailyPublishingTarget
                    ) /
                      Math.max(1, settings.dailyPublishingTarget)) *
                      100
                  )
                )}%`,
              }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-zinc-500">
            {scheduledTodayCount} queued/published ({mode === "live" ? "Sheets" : "Demo"})
          </p>
        </div>

        {mode === "live" ? (
          <button
            type="button"
            onClick={() => refreshData()}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-950 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`}
            />
            {isLoading ? "Syncing Sheets..." : "Sync Google Sheets"}
          </button>
        ) : (
          <button
            type="button"
            onClick={resetDemoData}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-950"
          >
            <RotateCcw className="h-3 w-3" />
            Reset Demo State
          </button>
        )}

        {/* Subtle User Profile Area */}
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-zinc-950 text-[11px] font-semibold text-white">
            FJ
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-zinc-900">
              Francis Joe
            </p>
            <p className="truncate text-[11px] text-zinc-500">
              Editorial Lead · {mode === "live" ? "Phase 2" : "Demo"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-64 lg:border-r lg:border-zinc-200">
        {content}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-zinc-950/40 backdrop-blur-[1px]"
            onClick={onCloseMobile}
          />
          <aside className="relative z-50 w-72 max-w-[85vw] border-r border-zinc-200 bg-white shadow-2xl">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
