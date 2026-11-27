"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  Instagram,
  Video,
  Check,
  X,
  CalendarClock,
  Eye,
  Save,
  FileText,
  Search,
  Send,
  Palette,
  Loader2,
  AlertCircle,
  Download,
  CloudUpload,
  Globe,
  Upload,
} from "lucide-react";
import { useStudio } from "@/context/StudioContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { PlatformPreview } from "@/components/social-posts/PlatformPreview";
import { GraphicCanvas } from "@/components/graphics-studio/GraphicCanvas";
import { OnlineImagePicker } from "@/components/graphics-studio/OnlineImagePicker";
import { OnlineImageResult } from "@/app/api/studio/images/search/route";
import {
  EditorialTemplateId,
  GeneratedGraphicResult,
  renderEditorialGraphicPng,
} from "@/lib/graphicRenderer";
import {
  normalizeHashtags,
  sanitizeGraphicText,
  sanitizePublicCopy,
} from "@/lib/contentSanitizer";
import { Platform, PostStatus } from "@/types/studio";

function defaultScheduleTime(): string {
  const d = new Date();
  d.setHours(d.getHours() + 2, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusBadgeVariant(status: PostStatus) {
  switch (status) {
    case "APPROVED":
    case "PUBLISHED":
      return "success";
    case "SCHEDULED":
      return "red";
    case "NEEDS_REVIEW":
      return "warning";
    case "REJECTED":
      return "muted";
    default:
      return "neutral";
  }
}

export function SocialPostsView() {
  const {
    mode,
    stories,
    posts,
    refreshData,
    savePostDraft,
    setPostApprovalStatus,
    enqueueApprovedPost,
    notify,
  } = useStudio();

  const [platformFilter, setPlatformFilter] = useState<Platform | "all">("all");
  const [statusFilter, setStatusFilter] = useState<PostStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string>("");
  const [editorPlatform, setEditorPlatform] = useState<Platform>("instagram");

  const [headlineDraft, setHeadlineDraft] = useState("");
  const [supportingDraft, setSupportingDraft] = useState("");
  const [captionDraft, setCaptionDraft] = useState("");
  const [hashtagsDraft, setHashtagsDraft] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [queueModalOpen, setQueueModalOpen] = useState(false);
  const [scheduleInput, setScheduleInput] = useState(defaultScheduleTime);
  const [isEnqueuing, setIsEnqueuing] = useState(false);

  const [rightTab, setRightTab] = useState<"preview" | "graphic">("preview");
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Integrated Graphic Studio state
  const [template, setTemplate] = useState<EditorialTemplateId>("breaking");
  const [imageMode, setImageMode] = useState<"online" | "upload">("online");
  const [selectedOnlineImage, setSelectedOnlineImage] =
    useState<OnlineImageResult | null>(null);
  const [uploadedPhotoDataUrl, setUploadedPhotoDataUrl] = useState<
    string | null
  >(null);
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);
  const [generatedPng, setGeneratedPng] =
    useState<GeneratedGraphicResult | null>(null);
  const [isSavingDrive, setIsSavingDrive] = useState(false);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesPlatform =
        platformFilter === "all" || post.platform === platformFilter;
      const matchesStatus =
        statusFilter === "all" || post.status === statusFilter;
      const matchesQuery =
        searchQuery.trim() === "" ||
        post.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.storyHeadline.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPlatform && matchesStatus && matchesQuery;
    });
  }, [posts, platformFilter, statusFilter, searchQuery]);

  const activePost = useMemo(() => {
    if (selectedPostId) {
      const exact = posts.find((p) => p.id === selectedPostId);
      if (exact) return exact;
    }
    if (selectedArticleId) {
      return (
        posts.find(
          (p) =>
            p.storyId === selectedArticleId && p.platform === editorPlatform
        ) ?? null
      );
    }
    return filteredPosts[0] ?? null;
  }, [posts, selectedPostId, selectedArticleId, editorPlatform, filteredPosts]);

  const activeStory = useMemo(() => {
    const targetArticleId = activePost?.storyId || selectedArticleId;
    return stories.find((s) => s.id === targetArticleId) ?? null;
  }, [stories, activePost, selectedArticleId]);

  useEffect(() => {
    if (activePost) {
      setSelectedArticleId(activePost.storyId);
      setEditorPlatform(activePost.platform);
      setHeadlineDraft(activePost.headline);
      setSupportingDraft(
        activePost.supportingText ||
          activePost.caption
            .replace(/https?:\/\/\S+/g, "")
            .replace(/#\w+/g, "")
            .replace(/\bRead more:\s*$/i, "")
            .replace(/\s+/g, " ")
            .trim()
      );
      setCaptionDraft(activePost.caption);
      setHashtagsDraft(activePost.hashtags.join(" "));
      setGeneratedPng(null);
    } else if (activeStory) {
      setHeadlineDraft(sanitizeGraphicText(activeStory.headline));
      setSupportingDraft(sanitizeGraphicText(activeStory.summary));
      setCaptionDraft(
        sanitizePublicCopy(activeStory.summary, { includeWebsiteCta: true })
      );
      setHashtagsDraft(normalizeHashtags(["#IsleOfMan", "#InsideTheIOM"]).join(" "));
      setGeneratedPng(null);
    }
  }, [activePost, activeStory]);

  const handleSelectStoryFromDropdown = (articleId: string) => {
    setSelectedArticleId(articleId);
    const matchingPost =
      posts.find(
        (p) => p.storyId === articleId && p.platform === editorPlatform
      ) ?? posts.find((p) => p.storyId === articleId);
    setSelectedPostId(matchingPost ? matchingPost.id : null);
    if (matchingPost) {
      setEditorPlatform(matchingPost.platform);
    }
  };

  const handleSwitchEditorPlatform = (plat: Platform) => {
    setEditorPlatform(plat);
    const articleId = activePost?.storyId || selectedArticleId;
    if (!articleId) return;
    const sibling = posts.find(
      (p) => p.storyId === articleId && p.platform === plat
    );
    setSelectedPostId(sibling ? sibling.id : null);
  };

  const parseTags = () =>
    hashtagsDraft
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith("#") ? t : `#${t}`));

  const handleSaveDraft = async (
    targetStatus: "DRAFT" | "NEEDS_REVIEW" = "DRAFT"
  ) => {
    const articleId = activePost?.storyId || selectedArticleId;
    if (!articleId) return;
    setIsSaving(true);
    await savePostDraft({
      postId: activePost?.id,
      articleId,
      platform: editorPlatform,
      headline: headlineDraft,
      caption: captionDraft,
      supportingText: supportingDraft,
      hashtags: parseTags(),
      status: targetStatus,
    });
    setIsSaving(false);
  };

  const handleApprove = async () => {
    if (!activePost) return;
    setIsUpdatingStatus(true);
    await setPostApprovalStatus(activePost.id, "APPROVED");
    setIsUpdatingStatus(false);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePost || !rejectionReason.trim()) return;
    setIsUpdatingStatus(true);
    const ok = await setPostApprovalStatus(
      activePost.id,
      "REJECTED",
      rejectionReason.trim()
    );
    setIsUpdatingStatus(false);
    if (ok) {
      setRejectModalOpen(false);
      setRejectionReason("");
    }
  };

  const handleConfirmEnqueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePost || !scheduleInput) return;
    setIsEnqueuing(true);
    const ok = await enqueueApprovedPost(activePost.id, scheduleInput);
    setIsEnqueuing(false);
    if (ok) setQueueModalOpen(false);
  };

  const handleGraphicFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedPhotoDataUrl(String(reader.result));
      setSelectedOnlineImage(null);
      setGeneratedPng(null);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateIntegratedPng = async () => {
    if (!headlineDraft.trim()) return;
    setIsGeneratingPng(true);
    try {
      let photoDataUrl: string | null = uploadedPhotoDataUrl;
      if (!photoDataUrl && selectedOnlineImage?.thumbnailUrl) {
        const res = await fetch(
          `/api/studio/image-proxy?url=${encodeURIComponent(
            selectedOnlineImage.thumbnailUrl
          )}`
        );
        if (res.ok) {
          const blob = await res.blob();
          photoDataUrl = await new Promise<string>((resolve) => {
            const r = new FileReader();
            r.onloadend = () => resolve(String(r.result));
            r.readAsDataURL(blob);
          });
        }
      }

      const dateStr = activeStory?.publishedAt
        ? new Date(activeStory.publishedAt).toLocaleDateString("en-GB", {
            timeZone: "Europe/Isle_of_Man",
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "";

      const result = await renderEditorialGraphicPng({
        template,
        categoryLabel: "ISLE OF MAN",
        headline: headlineDraft,
        supportingText: supportingDraft,
        dateLabel: dateStr,
        photoDataUrl,
        photoCredit: selectedOnlineImage?.requiresAttribution
          ? selectedOnlineImage.attributionText
          : null,
      });

      setGeneratedPng(result);
      notify("Graphic generated (1080 × 1350 PNG)");
    } catch {
      notify("Graphic generation failed", "Check background image and try again.");
    } finally {
      setIsGeneratingPng(false);
    }
  };

  const handleDownloadIntegratedPng = () => {
    if (!generatedPng) return;
    const slug = (activePost?.id || "insidetheiom-post")
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-");
    const url = URL.createObjectURL(generatedPng.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `insidetheiom-${slug}-1080x1350.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleSaveIntegratedGraphicToDrive = async () => {
    if (!generatedPng || !activePost || mode !== "live") return;
    setIsSavingDrive(true);
    try {
      const res = await fetch("/api/studio/save-graphic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: activePost.id,
          fileName: `insidetheiom-${activePost.id}.png`,
          pngDataUrl: generatedPng.dataUrl,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        notify("Save to Drive failed", json.error || "Apps Script error");
        return;
      }
      notify("Graphic saved to Drive & SOCIAL_POSTS");
      await refreshData();
    } finally {
      setIsSavingDrive(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Social Posts"
        breadcrumb="Social Posts"
        description="Edit Instagram and TikTok captions, generate 1080 × 1350 graphics, approve or reject posts, and queue approved posts."
      />

      {/* Filter & Story Selection Bar */}
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3.5">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1">
            {(["all", "instagram", "tiktok"] as const).map((plat) => (
              <button
                key={plat}
                type="button"
                onClick={() => setPlatformFilter(plat)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  platformFilter === plat
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                {plat === "instagram" && <Instagram className="h-3.5 w-3.5" />}
                {plat === "tiktok" && <Video className="h-3.5 w-3.5" />}
                {plat === "all" ? `All (${posts.length})` : plat}
              </button>
            ))}
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
            <div className="relative min-w-[200px] flex-1 lg:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts..."
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 pl-9 pr-3 text-xs text-zinc-950 focus:border-zinc-950 focus:bg-white focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as PostStatus | "all")
              }
              aria-label="Filter posts by status"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 focus:border-zinc-950 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="NEEDS_REVIEW">NEEDS_REVIEW</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="SCHEDULED">SCHEDULED</option>
              <option value="PUBLISHED">PUBLISHED</option>
            </select>
          </div>
        </div>

        {/* Select any NEWS story directly */}
        <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Load NEWS Story:
          </span>
          <select
            value={selectedArticleId}
            onChange={(e) => handleSelectStoryFromDropdown(e.target.value)}
            aria-label="Select NEWS story"
            className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 focus:border-zinc-950 focus:bg-white focus:outline-none"
          >
            {stories.map((s) => (
              <option key={s.id} value={s.id}>
                [{s.source}] {s.headline}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Post List */}
        <div className="space-y-3 lg:col-span-4">
          {filteredPosts.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No matching posts"
              description="Adjust your status/platform filter or select a NEWS story above to create a new draft."
            />
          ) : (
            filteredPosts.map((post) => {
              const isSelected = activePost?.id === post.id;
              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => {
                    setSelectedPostId(post.id);
                    setSelectedArticleId(post.storyId);
                    setEditorPlatform(post.platform);
                  }}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    isSelected
                      ? "border-zinc-950 bg-white shadow-sm"
                      : "border-zinc-200 bg-white hover:border-zinc-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-semibold uppercase text-zinc-500">
                      {post.platform}
                    </span>
                    <Badge variant={statusBadgeVariant(post.status)}>
                      {post.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-zinc-950">
                    {post.headline}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">
                    {post.caption}
                  </p>
                  {post.status === "REJECTED" && post.rejectionReason && (
                    <p className="mt-2 rounded bg-red-50 px-2 py-1 text-[10px] text-[#C81E1E]">
                      Reason: {post.rejectionReason}
                    </p>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Editor + Approval + Preview/Graphics */}
        <div className="grid grid-cols-1 gap-6 lg:col-span-8 xl:grid-cols-12">
          {/* Editor Column */}
          <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 xl:col-span-7">
            {/* Header & Platform Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
              <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleSwitchEditorPlatform("instagram")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-semibold ${
                    editorPlatform === "instagram"
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-600"
                  }`}
                >
                  <Instagram className="h-3.5 w-3.5" />
                  Instagram
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchEditorPlatform("tiktok")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-semibold ${
                    editorPlatform === "tiktok"
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-600"
                  }`}
                >
                  <Video className="h-3.5 w-3.5" />
                  TikTok
                </button>
              </div>

              <div className="flex items-center gap-2">
                {activePost && (
                  <Badge variant={statusBadgeVariant(activePost.status)}>
                    {activePost.status}
                  </Badge>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 xl:hidden"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </button>
              </div>
            </div>

            {activePost?.status === "REJECTED" && activePost.rejectionReason && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-[#C81E1E]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Rejected</p>
                  <p className="mt-0.5 text-[11px]">
                    {activePost.rejectionReason}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-800">
                Headline
              </label>
              <input
                type="text"
                value={headlineDraft}
                onChange={(e) => setHeadlineDraft(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-950 focus:border-zinc-950 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-800">
                Supporting Text (Graphic Summary)
              </label>
              <textarea
                rows={2}
                value={supportingDraft}
                onChange={(e) => setSupportingDraft(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-950 focus:border-zinc-950 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-zinc-800">
                  {editorPlatform === "instagram"
                    ? "Instagram Caption"
                    : "TikTok Caption"}
                </label>
                <span className="font-mono text-[11px] text-zinc-400">
                  {captionDraft.length} / 2,200
                </span>
              </div>
              <textarea
                rows={6}
                value={captionDraft}
                onChange={(e) => setCaptionDraft(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-950 focus:border-zinc-950 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-800">
                Hashtags
              </label>
              <input
                type="text"
                value={hashtagsDraft}
                onChange={(e) => setHashtagsDraft(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-950 focus:border-zinc-950 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Save & Approval Actions */}
            <div className="space-y-2.5 border-t border-zinc-100 pt-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveDraft("DRAFT")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save Draft
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveDraft("NEEDS_REVIEW")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  Mark Needs Review
                </button>
              </div>

              {activePost && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={
                      isUpdatingStatus || activePost.status === "APPROVED"
                    }
                    onClick={handleApprove}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-40"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Approve
                  </button>

                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => setRejectModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-[#C81E1E] transition hover:bg-red-100 disabled:opacity-40"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reject
                  </button>

                  <button
                    type="button"
                    disabled={activePost.status !== "APPROVED"}
                    onClick={() => setQueueModalOpen(true)}
                    title={
                      activePost.status === "APPROVED"
                        ? "Add to Publishing Queue"
                        : "Only APPROVED posts can be added to the queue"
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-950 bg-white px-3 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CalendarClock className="h-3.5 w-3.5 text-[#C81E1E]" />
                    Add to Queue
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Post Preview / Integrated Graphics Studio */}
          <div className="hidden space-y-3 xl:col-span-5 xl:block">
            <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-2">
              <button
                type="button"
                onClick={() => setRightTab("preview")}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                  rightTab === "preview"
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                Post Preview
              </button>
              <button
                type="button"
                onClick={() => setRightTab("graphic")}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${
                  rightTab === "graphic"
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                <Palette className="h-3.5 w-3.5" />
                Graphic Studio
              </button>
            </div>

            {rightTab === "preview" ? (
              <PlatformPreview
                platform={editorPlatform}
                headline={headlineDraft}
                caption={captionDraft}
                hashtags={parseTags()}
                storyHeadline={activeStory?.headline || headlineDraft}
              />
            ) : (
              <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3.5">
                {/* Template A / B / C */}
                <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                  {(
                    [
                      ["breaking", "Template A"],
                      ["general", "Template B"],
                      ["text-first", "Template C"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setTemplate(id);
                        setGeneratedPng(null);
                      }}
                      className={`rounded-md border py-1.5 font-semibold ${
                        template === id
                          ? "border-zinc-950 bg-zinc-950 text-white"
                          : "border-zinc-200 text-zinc-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Image Picker Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-zinc-700">
                    Background Photo
                  </span>
                  <div className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setImageMode("online")}
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-medium ${
                        imageMode === "online"
                          ? "bg-zinc-950 text-white"
                          : "text-zinc-600"
                      }`}
                    >
                      <Globe className="h-2.5 w-2.5" />
                      Online
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageMode("upload")}
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-medium ${
                        imageMode === "upload"
                          ? "bg-zinc-950 text-white"
                          : "text-zinc-600"
                      }`}
                    >
                      <Upload className="h-2.5 w-2.5" />
                      Upload
                    </button>
                  </div>
                </div>

                {imageMode === "online" ? (
                  <OnlineImagePicker
                    headline={activeStory?.headline || headlineDraft}
                    description={activeStory?.summary || supportingDraft}
                    selectedImage={selectedOnlineImage}
                    onSelectImage={(img) => {
                      setSelectedOnlineImage(img);
                      setUploadedPhotoDataUrl(null);
                      setGeneratedPng(null);
                    }}
                    onCopyCredit={(c) => notify("Credit copied", c)}
                  />
                ) : (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 py-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100">
                    <Upload className="h-3.5 w-3.5" />
                    Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleGraphicFileUpload}
                      className="hidden"
                    />
                  </label>
                )}

                {generatedPng ? (
                  <div className="overflow-hidden border border-zinc-300">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={generatedPng.dataUrl}
                      alt="Generated 1080x1350 PNG"
                      className="aspect-[4/5] w-full"
                    />
                  </div>
                ) : (
                  <GraphicCanvas
                    template={template}
                    categoryLabel="ISLE OF MAN"
                    headline={headlineDraft}
                    supportingText={supportingDraft}
                    dateLabel={
                      activeStory?.publishedAt
                        ? new Date(activeStory.publishedAt).toLocaleDateString(
                            "en-GB",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )
                        : ""
                    }
                    photoUrl={
                      uploadedPhotoDataUrl ||
                      selectedOnlineImage?.thumbnailUrl ||
                      activePost?.graphicUrl ||
                      null
                    }
                    photoCredit={
                      selectedOnlineImage?.requiresAttribution
                        ? selectedOnlineImage.attributionText
                        : null
                    }
                  />
                )}

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleGenerateIntegratedPng}
                    disabled={isGeneratingPng}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-950 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {isGeneratingPng && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    {generatedPng
                      ? "Regenerate 1080 × 1350 PNG"
                      : "Generate 1080 × 1350 PNG"}
                  </button>

                  {generatedPng && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadIntegratedPng}
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-zinc-950 py-1.5 text-xs font-semibold text-zinc-950"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                      {mode === "live" && activePost && (
                        <button
                          type="button"
                          onClick={handleSaveIntegratedGraphicToDrive}
                          disabled={isSavingDrive}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 text-xs font-semibold text-zinc-800"
                        >
                          <CloudUpload className="h-3.5 w-3.5" />
                          {isSavingDrive ? "Saving..." : "Save to Post"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Reason Modal */}
      <Modal
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Post"
        subtitle="Provide a brief editorial reason for rejecting this draft."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleConfirmReject} className="space-y-4">
          <textarea
            rows={3}
            required
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Insufficient Isle of Man detail / outdated information..."
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-950 focus:border-zinc-950 focus:bg-white focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRejectModalOpen(false)}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdatingStatus || !rejectionReason.trim()}
              className="rounded-lg bg-[#C81E1E] px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              Confirm Rejection
            </button>
          </div>
        </form>
      </Modal>

      {/* Add to Queue Modal */}
      <Modal
        open={queueModalOpen}
        onClose={() => setQueueModalOpen(false)}
        title="Add Approved Post to Queue"
        subtitle="Schedule date & time in Europe/Isle_of_Man (no automatic publishing)."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleConfirmEnqueue} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-800">
              Scheduled Date & Time (Europe/Isle_of_Man)
            </label>
            <input
              type="datetime-local"
              required
              value={scheduleInput}
              onChange={(e) => setScheduleInput(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-950 focus:border-zinc-950 focus:bg-white focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setQueueModalOpen(false)}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isEnqueuing}
              className="rounded-lg bg-zinc-950 px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {isEnqueuing ? "Scheduling..." : "Add to Queue"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Mobile Preview Modal */}
      <Modal
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title="Post Preview"
        maxWidthClass="max-w-md"
      >
        <PlatformPreview
          platform={editorPlatform}
          headline={headlineDraft}
          caption={captionDraft}
          hashtags={parseTags()}
          storyHeadline={activeStory?.headline || headlineDraft}
        />
      </Modal>
    </div>
  );
}
