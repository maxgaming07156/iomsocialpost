"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  Layers,
  Download,
  RefreshCw,
  Upload,
  CloudUpload,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  X,
  Globe,
} from "lucide-react";
import { useStudio } from "@/context/StudioContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { GraphicCanvas } from "@/components/graphics-studio/GraphicCanvas";
import { OnlineImagePicker } from "@/components/graphics-studio/OnlineImagePicker";
import { OnlineImageResult } from "@/app/api/studio/images/search/route";
import {
  EditorialTemplateId,
  GeneratedGraphicResult,
  GraphicPlatformVariant,
  renderEditorialGraphicPng,
} from "@/lib/graphicRenderer";
import { sanitizeGraphicText } from "@/lib/contentSanitizer";

const TEMPLATE_OPTIONS: {
  id: EditorialTemplateId;
  code: string;
  label: string;
  description: string;
}[] = [
  {
    id: "breaking",
    code: "Template A",
    label: "Breaking News (Signature)",
    description:
      "Full-bleed photo, circular seal, slanted red/white BREAKING | NEWS badge, insidetheiom.com pill.",
  },
  {
    id: "general",
    code: "Template B",
    label: "Editorial Spotlight",
    description:
      "Full-bleed photo, circular seal, bold headline with red keyword highlight, insidetheiom.com pill.",
  },
  {
    id: "text-first",
    code: "Template C",
    label: "Feature Story Card",
    description:
      "Full-bleed photo, InsideTheIOM header lockup, left-aligned lower-third typography.",
  },
];

const CONFIRMED_PERMISSION_STATUSES = new Set([
  "APPROVED",
  "LICENSED",
  "CONFIRMED",
  "CLEARED",
  "OWNED",
  "PUBLIC_DOMAIN",
]);

function isPermissionConfirmed(status?: string): boolean {
  if (!status) return false;
  return CONFIRMED_PERMISSION_STATUSES.has(status.trim().toUpperCase());
}

function cleanGraphicSummary(raw: string): string {
  return sanitizeGraphicText(raw);
}

export function GraphicsStudioView() {
  const { mode, stories, posts, mediaAssets, refreshData, notify } =
    useStudio();

  const [sourceType, setSourceType] = useState<"post" | "story">("post");
  const [selectedId, setSelectedId] = useState<string>("");
  const [platformVariant, setPlatformVariant] =
    useState<GraphicPlatformVariant>("instagram");
  const [template, setTemplate] = useState<EditorialTemplateId>("breaking");
  const [categoryLabel, setCategoryLabel] = useState("ISLE OF MAN");
  const [headline, setHeadline] = useState("");
  const [supportingText, setSupportingText] = useState("");
  const [dateLabel, setDateLabel] = useState("");

  // Background image mode & state
  const [imageMode, setImageMode] = useState<"online" | "upload">("online");
  const [selectedOnlineImage, setSelectedOnlineImage] =
    useState<OnlineImageResult | null>(null);
  const [uploadedPhotoDataUrl, setUploadedPhotoDataUrl] = useState<
    string | null
  >(null);
  const [customPhotoUrl, setCustomPhotoUrl] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedGraphicResult | null>(
    null
  );
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isSavingDrive, setIsSavingDrive] = useState(false);
  const [savedDriveUrl, setSavedDriveUrl] = useState<string | null>(null);

  const orderedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      if (a.platform === b.platform) return 0;
      return a.platform === "instagram" ? -1 : 1;
    });
  }, [posts]);

  useEffect(() => {
    if (sourceType === "post" && orderedPosts.length > 0 && !selectedId) {
      loadFromPost(orderedPosts[0].id);
    } else if (sourceType === "story" && stories.length > 0 && !selectedId) {
      loadFromStory(stories[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedPosts, stories, sourceType]);

  const activePost = useMemo(
    () =>
      sourceType === "post"
        ? orderedPosts.find((p) => p.id === selectedId) ?? null
        : null,
    [sourceType, orderedPosts, selectedId]
  );

  const activeArticleId = useMemo(() => {
    if (sourceType === "post") return activePost?.storyId ?? "";
    return selectedId;
  }, [sourceType, activePost, selectedId]);

  const activeStory = useMemo(
    () => stories.find((s) => s.id === activeArticleId) ?? null,
    [stories, activeArticleId]
  );

  const confirmedMedia = useMemo(() => {
    if (!activeArticleId) return null;
    return (
      mediaAssets.find(
        (m) =>
          m.storyId === activeArticleId &&
          Boolean(m.imageUrl) &&
          isPermissionConfirmed(m.permissionStatus)
      ) ?? null
    );
  }, [mediaAssets, activeArticleId]);

  const activePreviewPhoto =
    uploadedPhotoDataUrl ||
    (customPhotoUrl.trim() ? customPhotoUrl.trim() : null) ||
    selectedOnlineImage?.thumbnailUrl ||
    confirmedMedia?.imageUrl ||
    null;

  const activePhotoCredit = useMemo(() => {
    if (selectedOnlineImage && !uploadedPhotoDataUrl && !customPhotoUrl.trim()) {
      return selectedOnlineImage.requiresAttribution
        ? selectedOnlineImage.attributionText
        : `Photo: ${selectedOnlineImage.artist} / Wikimedia Commons`;
    }
    if (confirmedMedia?.credit && !uploadedPhotoDataUrl && !customPhotoUrl.trim()) {
      return `Photo: ${confirmedMedia.credit}`;
    }
    return null;
  }, [
    selectedOnlineImage,
    uploadedPhotoDataUrl,
    customPhotoUrl,
    confirmedMedia,
  ]);

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", {
      timeZone: "Europe/Isle_of_Man",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const loadFromPost = (postId: string) => {
    const post = orderedPosts.find((p) => p.id === postId);
    if (!post) return;
    const linkedStory = stories.find((s) => s.id === post.storyId);

    setSelectedId(post.id);
    setHeadline(post.headline || linkedStory?.headline || "");
    const cleaned = cleanGraphicSummary(post.caption);
    setSupportingText(cleaned || linkedStory?.summary || "");
    setDateLabel(formatDate(linkedStory?.publishedAt || post.updatedAt));
    setCategoryLabel("ISLE OF MAN");
    setSavedDriveUrl(post.graphicUrl || null);
    setSelectedOnlineImage(null);
    setGenerated(null);
    setGenerationError(null);
  };

  const loadFromStory = (storyId: string) => {
    const story = stories.find((s) => s.id === storyId);
    if (!story) return;

    setSelectedId(story.id);
    setHeadline(story.headline);
    setSupportingText(cleanGraphicSummary(story.summary));
    setDateLabel(formatDate(story.publishedAt));
    setCategoryLabel("ISLE OF MAN");
    setSavedDriveUrl(null);
    setSelectedOnlineImage(null);
    setGenerated(null);
    setGenerationError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedPhotoDataUrl(String(reader.result));
      setCustomPhotoUrl("");
      setSelectedOnlineImage(null);
      setGenerated(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectOnlineImage = (img: OnlineImageResult | null) => {
    setSelectedOnlineImage(img);
    setUploadedPhotoDataUrl(null);
    setCustomPhotoUrl("");
    setGenerated(null);
    if (img) {
      notify(
        "Background photograph applied",
        `${img.licenceName} · ${img.artist}`
      );
    }
  };

  const handleCopyCredit = async (credit: string) => {
    try {
      await navigator.clipboard.writeText(credit);
      notify("Attribution copied", credit);
    } catch {
      notify("Copy credit", credit);
    }
  };

  const resolvePhotoDataUrlForCanvas = async (): Promise<string | null> => {
    if (uploadedPhotoDataUrl) return uploadedPhotoDataUrl;

    const remoteUrl =
      customPhotoUrl.trim() ||
      selectedOnlineImage?.thumbnailUrl ||
      confirmedMedia?.imageUrl ||
      "";
    if (!remoteUrl) return null;

    const proxyRes = await fetch(
      `/api/studio/image-proxy?url=${encodeURIComponent(remoteUrl)}`
    );
    if (!proxyRes.ok) {
      throw new Error(
        "Could not load background image URL. Try selecting another image or uploading a file."
      );
    }
    const imgBlob = await proxyRes.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed to read photo."));
      reader.readAsDataURL(imgBlob);
    });
  };

  const handleGenerate = async () => {
    if (!headline.trim()) {
      setGenerationError("Please enter a headline before generating.");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const photoDataUrl = await resolvePhotoDataUrlForCanvas();
      const result = await renderEditorialGraphicPng({
        template,
        platformVariant,
        categoryLabel,
        headline,
        supportingText,
        dateLabel,
        photoDataUrl,
        photoCredit: platformVariant === "instagram" ? activePhotoCredit : null,
      });

      setGenerated(result);
      notify(
        `Graphic generated (${result.width} × ${result.height} ${
          result.mimeType === "image/jpeg" ? "JPEG" : "PNG"
        })`,
        platformVariant === "tiktok"
          ? "TikTok-compliant unbranded JPEG ready."
          : "Branded Instagram PNG ready."
      );
    } catch (err) {
      setGenerationError(
        err instanceof Error ? err.message : "Failed to generate PNG graphic."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPng = () => {
    if (!generated) return;
    const slug = (selectedId || "insidetheiom-card")
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-");
    const ext = generated.mimeType === "image/jpeg" ? "jpg" : "png";
    const url = URL.createObjectURL(generated.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `insidetheiom-${slug}-${generated.platformVariant}-1080x1350.${ext}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleSaveToDrive = async () => {
    if (!generated || !activePost || mode !== "live") return;
    setIsSavingDrive(true);
    setGenerationError(null);

    try {
      const fileName = `insidetheiom-${activePost.id}.png`;
      const res = await fetch("/api/studio/save-graphic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: activePost.id,
          fileName,
          pngDataUrl: generated.dataUrl,
        }),
      });

      const json = (await res.json()) as {
        ok?: boolean;
        graphicUrl?: string;
        error?: string;
      };

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to save graphic to Drive.");
      }

      setSavedDriveUrl(json.graphicUrl || null);
      notify(
        "Saved to Drive & SOCIAL_POSTS",
        "graphic_url updated without creating duplicate records."
      );
      await refreshData();
    } catch (err) {
      setGenerationError(
        err instanceof Error ? err.message : "Failed to save graphic."
      );
    } finally {
      setIsSavingDrive(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Graphics Studio"
        breadcrumb="Graphics Studio"
        description="Editorial PNG generator (1080 × 1350 px, 4:5) branded exclusively for InsideTheIOM with Wikimedia Commons background search."
        action={<Badge variant="dark">Export: 1080 × 1350 px PNG</Badge>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column */}
        <div className="space-y-5 lg:col-span-5">
          {/* 1. Content Selector */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-800">
                1. Load Content ({mode === "live" ? "Live Sheets" : "Demo"})
              </h2>
              <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setSourceType("post");
                    setSelectedId("");
                  }}
                  className={`rounded-md px-2.5 py-1 font-medium ${
                    sourceType === "post"
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-600"
                  }`}
                >
                  Social Posts ({orderedPosts.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSourceType("story");
                    setSelectedId("");
                  }}
                  className={`rounded-md px-2.5 py-1 font-medium ${
                    sourceType === "story"
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-600"
                  }`}
                >
                  News ({stories.length})
                </button>
              </div>
            </div>

            {sourceType === "post" ? (
              <select
                value={selectedId}
                onChange={(e) => loadFromPost(e.target.value)}
                aria-label="Select social post"
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 focus:border-zinc-950 focus:bg-white focus:outline-none"
              >
                {orderedPosts.length === 0 && (
                  <option value="">No social posts available</option>
                )}
                {orderedPosts.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.platform.toUpperCase()}] {p.headline}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedId}
                onChange={(e) => loadFromStory(e.target.value)}
                aria-label="Select news article"
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 focus:border-zinc-950 focus:bg-white focus:outline-none"
              >
                {stories.length === 0 && (
                  <option value="">No news stories available</option>
                )}
                {stories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.headline}
                  </option>
                ))}
              </select>
            )}

            {savedDriveUrl && (
              <p className="mt-2 truncate text-[11px] text-emerald-700">
                Existing graphic_url:{" "}
                <a
                  href={savedDriveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {savedDriveUrl}
                </a>
              </p>
            )}
          </div>

          {/* 2. Background Image (Online Images + Upload/URL) */}
          <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-800">
                2. Background Image
              </h2>

              <div className="flex items-center gap-2">
                {activePreviewPhoto && (
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedPhotoDataUrl(null);
                      setCustomPhotoUrl("");
                      setSelectedOnlineImage(null);
                      setGenerated(null);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-900"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </button>
                )}
                <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setImageMode("online")}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium ${
                      imageMode === "online"
                        ? "bg-zinc-950 text-white"
                        : "text-zinc-600"
                    }`}
                  >
                    <Globe className="h-3 w-3" />
                    Online Images
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageMode("upload")}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium ${
                      imageMode === "upload"
                        ? "bg-zinc-950 text-white"
                        : "text-zinc-600"
                    }`}
                  >
                    <Upload className="h-3 w-3" />
                    Upload / URL
                  </button>
                </div>
              </div>
            </div>

            {imageMode === "online" ? (
              <OnlineImagePicker
                headline={activeStory?.headline || headline}
                description={activeStory?.summary || supportingText}
                selectedImage={selectedOnlineImage}
                onSelectImage={handleSelectOnlineImage}
                onCopyCredit={handleCopyCredit}
              />
            ) : (
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-800 transition hover:bg-zinc-100">
                    <Upload className="h-3.5 w-3.5" />
                    Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="url"
                    value={customPhotoUrl}
                    onChange={(e) => {
                      setCustomPhotoUrl(e.target.value);
                      setUploadedPhotoDataUrl(null);
                      setSelectedOnlineImage(null);
                      setGenerated(null);
                    }}
                    placeholder="Or paste licensed https:// image URL..."
                    className="min-w-[180px] flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:bg-white focus:outline-none"
                  />
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-500">
                  {confirmedMedia
                    ? `Confirmed photo also available in MEDIA (${confirmedMedia.permissionStatus}).`
                    : "Upload a local photo or paste a direct HTTPS image URL."}
                </p>
              </div>
            )}
          </div>

          {/* 3. Template & Platform Export Selector */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-zinc-500" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-800">
                  3. Platform & Template
                </h2>
              </div>
              <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setPlatformVariant("instagram");
                    setGenerated(null);
                  }}
                  className={`rounded-md px-2.5 py-1 font-medium ${
                    platformVariant === "instagram"
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-600"
                  }`}
                >
                  Instagram (PNG)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlatformVariant("tiktok");
                    setGenerated(null);
                  }}
                  className={`rounded-md px-2.5 py-1 font-medium ${
                    platformVariant === "tiktok"
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-600"
                  }`}
                >
                  TikTok (JPEG)
                </button>
              </div>
            </div>
            {platformVariant === "tiktok" && (
              <p className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] text-zinc-600">
                TikTok export omits InsideTheIOM logos, URLs, and promotional branding per TikTok Content Sharing Guidelines, and exports as JPEG.
              </p>
            )}
            <div className="space-y-2">
              {TEMPLATE_OPTIONS.map((opt) => {
                const active = template === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setTemplate(opt.id);
                      setGenerated(null);
                    }}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      active
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{opt.label}</span>
                      <span
                        className={`text-[10px] font-mono ${
                          active ? "text-zinc-300" : "text-zinc-400"
                        }`}
                      >
                        {opt.code}
                      </span>
                    </div>
                    <p
                      className={`mt-0.5 text-[11px] ${
                        active ? "text-zinc-300" : "text-zinc-500"
                      }`}
                    >
                      {opt.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Copy Editing */}
          <div className="space-y-3.5 rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-800">
              4. Graphic Copy
            </h2>

            <div>
              <label className="block text-xs font-semibold text-zinc-700">
                Headline
              </label>
              <textarea
                rows={2}
                value={headline}
                onChange={(e) => {
                  setHeadline(e.target.value);
                  setGenerated(null);
                }}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-950 focus:border-zinc-950 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700">
                Supporting Text
              </label>
              <textarea
                rows={3}
                value={supportingText}
                onChange={(e) => {
                  setSupportingText(e.target.value);
                  setGenerated(null);
                }}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-950 focus:border-zinc-950 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700">
                  Category Tag (Templates B & C)
                </label>
                <input
                  type="text"
                  value={categoryLabel}
                  onChange={(e) => {
                    setCategoryLabel(e.target.value);
                    setGenerated(null);
                  }}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-950 focus:border-zinc-950 focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700">
                  Date
                </label>
                <input
                  type="text"
                  value={dateLabel}
                  onChange={(e) => {
                    setDateLabel(e.target.value);
                    setGenerated(null);
                  }}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-950 focus:border-zinc-950 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {generationError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-[#C81E1E]">
                {generationError}
              </div>
            )}

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : generated ? (
                  <RefreshCw className="h-3.5 w-3.5" />
                ) : (
                  <ImageIcon className="h-3.5 w-3.5" />
                )}
                {isGenerating
                  ? "Rendering 1080 × 1350 PNG..."
                  : generated
                    ? "Regenerate 1080 × 1350 PNG"
                    : "Generate 1080 × 1350 PNG"}
              </button>

              {generated && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleDownloadPng}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-950 bg-white px-3 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download PNG
                  </button>

                  {mode === "live" && activePost && (
                    <button
                      type="button"
                      onClick={handleSaveToDrive}
                      disabled={isSavingDrive}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50"
                    >
                      {isSavingDrive ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CloudUpload className="h-3.5 w-3.5" />
                      )}
                      {isSavingDrive ? "Saving..." : "Save to Drive & Sheet"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Layout + Generated PNG Result */}
        <div className="lg:col-span-7">
          <div className="rounded-xl border border-zinc-200 bg-zinc-100/70 p-4 sm:p-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-zinc-800">
                {generated
                  ? "Generated PNG Output (Ready for Download)"
                  : "Live Editorial Layout Preview (4:5)"}
              </span>
              {generated ? (
                <Badge variant="success">
                  <CheckCircle2 className="h-3 w-3" />
                  {generated.width} × {generated.height} px · PNG
                </Badge>
              ) : (
                <Badge variant="outline">1080 × 1350 px Target</Badge>
              )}
            </div>

            {generated ? (
              <div className="mx-auto w-full max-w-[432px] overflow-hidden border border-zinc-300 bg-white shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={generated.dataUrl}
                  alt="Generated InsideTheIOM 1080x1350 PNG"
                  className="block aspect-[4/5] w-full"
                />
              </div>
            ) : (
              <GraphicCanvas
                template={template}
                platformVariant={platformVariant}
                categoryLabel={categoryLabel}
                headline={headline}
                supportingText={supportingText}
                dateLabel={dateLabel}
                photoUrl={activePreviewPhoto}
                photoCredit={
                  platformVariant === "instagram" ? activePhotoCredit : null
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
