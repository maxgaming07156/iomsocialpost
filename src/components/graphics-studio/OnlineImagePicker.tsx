"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  ExternalLink,
  Check,
  Loader2,
  ImageOff,
  AlertTriangle,
  Copy,
  Info,
} from "lucide-react";
import { OnlineImageResult } from "@/app/api/studio/images/search/route";
import { buildImageSearchQuery } from "@/lib/imageQueryBuilder";
import { Badge } from "@/components/ui/Badge";

interface OnlineImagePickerProps {
  headline: string;
  description: string;
  selectedImage: OnlineImageResult | null;
  initialCandidates?: OnlineImageResult[];
  initialQuery?: string;
  isAutoSelecting?: boolean;
  selectionTierLabel?: string | null;
  onSelectImage: (image: OnlineImageResult | null) => void;
  onCopyCredit: (credit: string) => void;
}

export function OnlineImagePicker({
  headline,
  description,
  selectedImage,
  initialCandidates,
  initialQuery,
  isAutoSelecting = false,
  selectionTierLabel,
  onSelectImage,
  onCopyCredit,
}: OnlineImagePickerProps) {
  const [query, setQuery] = useState(initialQuery || "");
  const [results, setResults] = useState<OnlineImageResult[]>(
    initialCandidates || []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (initialQuery) setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (initialCandidates && initialCandidates.length > 0) {
      setResults(initialCandidates);
      setHasSearched(true);
      setError(null);
    }
  }, [initialCandidates]);

  const runSearch = useCallback(async (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const res = await fetch(
        `/api/studio/images/search?q=${encodeURIComponent(trimmed)}`,
        { cache: "no-store" }
      );
      const json = (await res.json()) as {
        ok?: boolean;
        images?: OnlineImageResult[];
        error?: string;
      };

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to search Wikimedia Commons.");
      }

      setResults(json.images || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to search Wikimedia Commons."
      );
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync default query when article changes (auto-select handles initial search)
  useEffect(() => {
    if (!headline.trim()) return;
    if (!initialQuery) {
      setQuery(buildImageSearchQuery(headline, description));
    }
  }, [headline, description, initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Wikimedia Commons (e.g. Douglas harbour Isle of Man)..."
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-xs text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:bg-white focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="rounded-lg bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
        >
          {isLoading ? "Searching..." : "Search"}
        </button>
      </form>

      {/* Selected Image Attribution & Licence Summary */}
      {selectedImage && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-zinc-950">
              {selectionTierLabel || "Selected Background & Attribution"}
            </span>
            <div className="flex items-center gap-1.5">
              <Badge
                variant={selectedImage.isShareAlike ? "warning" : "success"}
              >
                {selectedImage.licenceName}
              </Badge>
              <button
                type="button"
                onClick={() => onCopyCredit(selectedImage.attributionText)}
                className="inline-flex items-center gap-1 rounded border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-800 hover:bg-zinc-100"
              >
                <Copy className="h-2.5 w-2.5" />
                Copy Caption Credit
              </button>
            </div>
          </div>

          <p className="mt-1.5 text-[11px] text-zinc-700">
            <span className="font-semibold">Photographer:</span>{" "}
            {selectedImage.artist} ·{" "}
            <a
              href={selectedImage.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-[#C81E1E] hover:underline"
            >
              Wikimedia Commons
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </p>

          {selectedImage.isShareAlike && selectedImage.shareAlikeNote && (
            <p className="mt-1.5 flex items-start gap-1.5 rounded border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{selectedImage.shareAlikeNote}</span>
            </p>
          )}

          <p className="mt-1.5 text-[10px] text-zinc-500">
            Editorial note: Illustrative background photograph only — do not
            present stock imagery as an on-scene photo of the reported event.
          </p>
        </div>
      )}

      {/* Loading State */}
      {(isLoading || isAutoSelecting) && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50/70 py-10 text-center">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          <p className="mt-2 text-xs font-medium text-zinc-700">
            {isAutoSelecting
              ? "Auto-selecting relevant photograph for this story..."
              : "Searching for relevant photographs..."}
          </p>
        </div>
      )}

      {/* Error State */}
      {!isLoading && !isAutoSelecting && error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-[#C81E1E]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Image search failed</p>
            <p className="mt-0.5 text-[11px]">{error}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && hasSearched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50/60 py-8 text-center">
          <ImageOff className="h-5 w-5 text-zinc-400" />
          <p className="mt-2 text-xs font-semibold text-zinc-900">
            No clearly licensed photographs found
          </p>
          <p className="mt-0.5 max-w-xs text-[11px] text-zinc-500">
            Try a broader subject keyword (e.g. &ldquo;Douglas Isle of Man&rdquo;
            or &ldquo;Manx coast&rdquo;). Images with unclear licences are
            filtered out automatically.
          </p>
        </div>
      )}

      {/* Results Grid */}
      {!isLoading && !error && results.length > 0 && (
        <div className="grid max-h-[380px] grid-cols-2 gap-2.5 overflow-y-auto pr-1">
          {results.map((img) => {
            const isSelected = selectedImage?.id === img.id;
            return (
              <div
                key={img.id}
                className={`group flex flex-col overflow-hidden rounded-lg border transition ${
                  isSelected
                    ? "border-zinc-950 ring-1 ring-zinc-950"
                    : "border-zinc-200 hover:border-zinc-400"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectImage(img)}
                  className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100 text-left"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.thumbnailUrl}
                    alt={img.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
                  />
                  {isSelected && (
                    <span className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#C81E1E] text-white shadow">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  <span
                    className={`absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                      img.isShareAlike
                        ? "bg-amber-400 text-zinc-950"
                        : "bg-zinc-950/85 text-white"
                    }`}
                  >
                    {img.licenceName}
                  </span>
                </button>

                <div className="flex flex-1 flex-col justify-between bg-white p-2">
                  <p className="line-clamp-1 text-[11px] font-semibold text-zinc-900">
                    {img.title}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-1 text-[10px] text-zinc-500">
                    <span className="truncate">{img.artist}</span>
                    <a
                      href={img.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-zinc-400 hover:text-zinc-900"
                      title="View on Wikimedia Commons"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
