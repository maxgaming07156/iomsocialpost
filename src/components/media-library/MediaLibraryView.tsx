"use client";

import React, { useMemo, useState } from "react";
import { Search, FolderOpen, Eye } from "lucide-react";
import { useStudio } from "@/context/StudioContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { GraphicCanvas } from "@/components/graphics-studio/GraphicCanvas";
import { MediaAsset } from "@/types/studio";

export function MediaLibraryView() {
  const { mode, mediaAssets, stories } = useStudio();
  const [search, setSearch] = useState("");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);

  const filteredAssets = useMemo(() => {
    return mediaAssets.filter((asset) => {
      const matchesSearch =
        search.trim() === "" ||
        asset.fileName.toLowerCase().includes(search.toLowerCase()) ||
        asset.title.toLowerCase().includes(search.toLowerCase()) ||
        asset.storyHeadline.toLowerCase().includes(search.toLowerCase());

      const matchesFormat =
        formatFilter === "all" || asset.platformFormat === formatFilter;

      return matchesSearch && matchesFormat;
    });
  }, [mediaAssets, search, formatFilter]);

  const linkedStory = previewAsset
    ? stories.find((s) => s.id === previewAsset.storyId)
    : undefined;

  return (
    <div>
      <PageHeader
        title="Media Library"
        breadcrumb="Media Library"
        description={
          mode === "live"
            ? "Live media records from your Google Sheets MEDIA tab (read-only in Phase 2)."
            : "Demonstration graphics archive showing generated 4:5 and 9:16 editorial assets linked to Isle of Man news stories."
        }
      />

      {/* Search & Format Filter */}
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by file name, title, or associated story..."
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-xs text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:bg-white focus:outline-none"
          />
        </div>

        <select
          value={formatFilter}
          onChange={(e) => setFormatFilter(e.target.value)}
          aria-label="Filter by platform format"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 focus:border-zinc-950 focus:outline-none"
        >
          <option value="all">All Formats</option>
          <option value="1080×1350 (4:5)">1080×1350 (4:5)</option>
          <option value="1080×1920 (9:16)">1080×1920 (9:16)</option>
        </select>
      </div>

      {filteredAssets.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={
            mediaAssets.length === 0
              ? "No records in MEDIA sheet"
              : "No media assets found"
          }
          description={
            mediaAssets.length === 0
              ? "The MEDIA tab in Google Sheets currently has 0 rows."
              : "No assets match your current search or format filter."
          }
          action={
            mediaAssets.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFormatFilter("all");
                }}
                className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
              >
                Reset Filters
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAssets.map((asset) => {
            const isDark =
              asset.accentTone === "crimson" || asset.accentTone === "obsidian";
            return (
              <div
                key={asset.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs transition hover:border-zinc-300"
              >
                {asset.imageUrl ? (
                  <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.imageUrl}
                      alt={asset.title}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPreviewAsset(asset)}
                      className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white/95 px-2.5 py-1 text-[11px] font-medium text-zinc-900 opacity-0 shadow-xs transition group-hover:opacity-100"
                    >
                      <Eye className="h-3 w-3" />
                      Preview
                    </button>
                  </div>
                ) : (
                  <div
                    className={`relative flex aspect-[4/3] flex-col justify-between p-5 ${
                      asset.accentTone === "crimson"
                        ? "bg-zinc-950 text-white"
                        : asset.accentTone === "obsidian"
                          ? "bg-[#121216] text-white"
                          : asset.accentTone === "slate"
                            ? "bg-zinc-100 text-zinc-950"
                            : "bg-[#F7F6F3] text-zinc-950"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="border-l-2 border-[#C81E1E] pl-2 text-[10px] font-semibold uppercase tracking-widest opacity-80">
                        InsideTheIOM · {asset.category}
                      </span>
                      <Badge
                        variant={isDark ? "dark" : "outline"}
                        className="text-[10px]"
                      >
                        {asset.platformFormat}
                      </Badge>
                    </div>

                    <div>
                      <p className="text-base font-bold leading-snug tracking-tight">
                        {asset.title}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-widest opacity-60">
                        {mode === "live" ? "MEDIA Record" : "Demo Asset"} ·{" "}
                        {asset.templateType}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPreviewAsset(asset)}
                      className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white/95 px-2.5 py-1 text-[11px] font-medium text-zinc-900 opacity-0 shadow-xs transition group-hover:opacity-100"
                    >
                      <Eye className="h-3 w-3" />
                      Preview
                    </button>
                  </div>
                )}

                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <p className="truncate font-mono text-[11px] font-semibold text-zinc-900">
                      {asset.fileName}
                    </p>
                    <p className="mt-1.5 line-clamp-2 text-xs text-zinc-600">
                      {asset.storyHeadline}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2.5 text-[11px] text-zinc-400">
                    <span>Story: {asset.storyId}</span>
                    <span>
                      {asset.permissionStatus || asset.fileSize}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewAsset && (
        <Modal
          open={Boolean(previewAsset)}
          onClose={() => setPreviewAsset(null)}
          title={previewAsset.fileName}
          subtitle={`Linked to ${previewAsset.storyId} · ${previewAsset.platformFormat}`}
          maxWidthClass="max-w-lg"
        >
          {previewAsset.imageUrl ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewAsset.imageUrl}
                alt={previewAsset.title}
                className="w-full rounded-lg border border-zinc-200"
              />
              {previewAsset.credit && (
                <p className="text-xs text-zinc-500">
                  Credit: {previewAsset.credit}
                </p>
              )}
            </div>
          ) : (
            <GraphicCanvas
              template={
                previewAsset.templateType === "breaking"
                  ? "breaking"
                  : previewAsset.templateType === "community"
                    ? "text-first"
                    : "general"
              }
              categoryLabel={previewAsset.category}
              headline={previewAsset.title}
              supportingText={linkedStory?.summary ?? previewAsset.storyHeadline}
              dateLabel={
                linkedStory
                  ? new Date(linkedStory.publishedAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "Isle of Man"
              }
            />
          )}
        </Modal>
      )}
    </div>
  );
}
