"use client";

import React from "react";
import { Heart, MessageCircle, Bookmark, Share2, Music2 } from "lucide-react";
import { Platform } from "@/types/studio";

interface PlatformPreviewProps {
  platform: Platform;
  headline: string;
  caption: string;
  hashtags: string[];
  storyHeadline: string;
}

export function PlatformPreview({
  platform,
  headline,
  caption,
  hashtags,
  storyHeadline,
}: PlatformPreviewProps) {
  const hashtagString = hashtags.join(" ");

  if (platform === "instagram") {
    return (
      <div className="mx-auto w-full max-w-[340px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {/* IG Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-950 text-[9px] font-bold text-white">
              IN
            </div>
            <div>
              <p className="text-[11px] font-semibold text-zinc-950">
                insidetheiom
              </p>
              <p className="text-[10px] text-zinc-400">Isle of Man</p>
            </div>
          </div>
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-500">
            4:5 Preview
          </span>
        </div>

        {/* IG 4:5 Card Placeholder */}
        <div className="relative flex aspect-[4/5] flex-col justify-between bg-zinc-950 p-5 text-white">
          <div className="flex items-center justify-between">
            <span className="border-l-2 border-[#C81E1E] pl-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-300">
              InsideTheIOM
            </span>
            <span className="text-[9px] uppercase tracking-widest text-zinc-400">
              1080×1350
            </span>
          </div>
          <div>
            <p className="text-lg font-bold uppercase leading-tight tracking-tight">
              {headline || "HEADLINE PREVIEW"}
            </p>
            <p className="mt-2 line-clamp-2 text-[11px] text-zinc-400">
              {storyHeadline}
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-800 pt-2.5 text-[9px] uppercase tracking-widest text-zinc-400">
            <span>The Isle of Man All In One Place</span>
            <span className="text-[#EF4444]">IOM</span>
          </div>
        </div>

        {/* IG Actions & Caption */}
        <div className="p-3.5">
          <div className="flex items-center justify-between text-zinc-800">
            <div className="flex items-center gap-3">
              <Heart className="h-4 w-4" />
              <MessageCircle className="h-4 w-4" />
              <Share2 className="h-4 w-4" />
            </div>
            <Bookmark className="h-4 w-4" />
          </div>
          <div className="mt-2.5 text-xs leading-relaxed text-zinc-800">
            <span className="mr-1.5 font-semibold text-zinc-950">
              insidetheiom
            </span>
            <span className="whitespace-pre-line">{caption}</span>
          </div>
          {hashtagString && (
            <p className="mt-1.5 text-[11px] font-medium text-[#C81E1E]">
              {hashtagString}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-white shadow-sm">
      <div className="relative flex aspect-[9/16] flex-col justify-between p-4">
        <div className="flex items-center justify-between text-[10px] text-zinc-400">
          <span className="font-semibold text-white">Following · For You</span>
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px]">
            9:16 Preview
          </span>
        </div>

        {/* Center Title Overlay */}
        <div className="my-auto rounded-lg border border-zinc-800 bg-zinc-900/90 p-3.5">
          <span className="inline-block rounded bg-[#C81E1E] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
            IOM Brief
          </span>
          <p className="mt-2 text-sm font-bold leading-snug text-white">
            {headline || "TikTok Hook Preview"}
          </p>
          <p className="mt-1 line-clamp-2 text-[10px] text-zinc-400">
            {storyHeadline}
          </p>
        </div>

        {/* Bottom Overlay */}
        <div className="space-y-2 pr-8">
          <p className="text-xs font-semibold">@insidetheiom</p>
          <p className="line-clamp-4 whitespace-pre-line text-[11px] leading-relaxed text-zinc-200">
            {caption}
          </p>
          {hashtagString && (
            <p className="text-[11px] font-medium text-zinc-400">
              {hashtagString}
            </p>
          )}
          <div className="flex items-center gap-1.5 pt-1 text-[10px] text-zinc-400">
            <Music2 className="h-3 w-3" />
            <span>Original Sound — InsideTheIOM Newsroom</span>
          </div>
        </div>
      </div>
    </div>
  );
}
