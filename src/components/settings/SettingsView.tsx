"use client";

import React from "react";
import {
  Rss,
  Cpu,
  Clock,
  Instagram,
  Video,
  Power,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { useStudio } from "@/context/StudioContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SocialIntegrationsSection } from "@/components/settings/SocialIntegrationsSection";
import { PublishingControlsSection } from "@/components/settings/PublishingControlsSection";

export function SettingsView() {
  const { mode, settings, toggleNewsSource, updateSettings, notify } =
    useStudio();

  const isLive = mode === "live";

  return (
    <div>
      <PageHeader
        title="Settings"
        breadcrumb="Settings"
        description={
          isLive
            ? "Live read-only view of your Google Sheets SOURCES and SETTINGS tabs."
            : "Configure RSS sources, AI evaluation preferences, and publishing targets. All controls below are demonstration-only."
        }
        action={
          <Badge variant={isLive ? "success" : "red"}>
            {isLive ? "Live · Read-Only" : "Demo Mode"}
          </Badge>
        }
      />

      {/* Mode Notice */}
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#C81E1E]" />
        <div className="text-xs leading-relaxed text-zinc-600">
          {isLive ? (
            <>
              <span className="font-semibold text-zinc-950">
                Phase 2 Read-Only Integration:
              </span>{" "}
              Displaying live configuration from your Google Sheet{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[11px]">
                SOURCES
              </code>{" "}
              and{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[11px]">
                SETTINGS
              </code>{" "}
              tabs. Write-back edits will be enabled in a future phase.
            </>
          ) : (
            <>
              <span className="font-semibold text-zinc-950">
                Demo Mode Notice:
              </span>{" "}
              Backend credentials are not configured, so settings reflect local
              demonstration state only.
            </>
          )}
        </div>
      </div>

      {/* Social Integrations (Phase 5) */}
      <SocialIntegrationsSection />

      {/* Publishing Engine Controls (Phase 6) */}
      <PublishingControlsSection />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* News Sources */}
        <Card className="lg:col-span-2">
          <CardHeader
            title={`Isle of Man News Sources (${isLive ? "SOURCES Tab" : "Demo"})`}
            subtitle="RSS feeds configured for runDiscovery()"
            action={
              <Badge variant="outline">
                <Rss className="h-3 w-3 text-[#C81E1E]" />
                {settings.newsSources.filter((s) => s.enabled).length} of{" "}
                {settings.newsSources.length} enabled
              </Badge>
            }
          />
          {settings.newsSources.length === 0 ? (
            <p className="py-6 text-center text-xs text-zinc-500">
              No sources found in the SOURCES tab.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-zinc-100">
              {settings.newsSources.map((src) => (
                <div
                  key={src.id}
                  className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold text-zinc-950">
                        {src.name}
                      </p>
                      {src.trustLevel && (
                        <Badge variant="outline">{src.trustLevel}</Badge>
                      )}
                      <span className="text-[11px] text-zinc-400">
                        · {src.itemsCollectedDemo} stories
                      </span>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-zinc-500">
                      {src.feedUrl}
                    </p>
                    {src.lastError && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#C81E1E]">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {src.lastError}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-[11px] text-zinc-400">
                      {src.lastPolledDemo}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleNewsSource(src.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        src.enabled
                          ? "border-zinc-950 bg-zinc-950 text-white"
                          : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >
                      {src.enabled ? "Enabled" : "Paused"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* AI Provider Preferences */}
        <Card>
          <CardHeader
            title={`AI Provider Preferences (${isLive ? "SETTINGS" : "Demo"})`}
            subtitle="Relevance scoring & caption generation routing"
            action={<Cpu className="h-4 w-4 text-zinc-400" />}
          />
          <div className="mt-4 space-y-4 text-xs">
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/70 p-3">
              <div>
                <p className="font-semibold text-zinc-950">Primary Provider</p>
                <p className="text-[11px] text-zinc-500">
                  Used first for relevance & caption drafts
                </p>
              </div>
              <Badge variant="dark">{settings.primaryAiProvider}</Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/70 p-3">
              <div>
                <p className="font-semibold text-zinc-950">Fallback Provider</p>
                <p className="text-[11px] text-zinc-500">
                  Automatic failover if primary rate-limits
                </p>
              </div>
              <Badge variant="outline">{settings.fallbackAiProvider}</Badge>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="font-semibold text-zinc-800">
                  Minimum Relevance Score Threshold
                </label>
                <span className="font-mono font-semibold text-[#C81E1E]">
                  {settings.relevanceThreshold} / 100
                </span>
              </div>
              <input
                type="range"
                min={40}
                max={95}
                step={5}
                disabled={isLive}
                value={settings.relevanceThreshold}
                onChange={(e) =>
                  updateSettings({
                    relevanceThreshold: Number(e.target.value),
                  })
                }
                className="mt-2 w-full accent-[#C81E1E] disabled:opacity-60"
              />
            </div>
          </div>
        </Card>

        {/* Publishing Target & Timezone */}
        <Card>
          <CardHeader
            title={`Publishing Cadence & Timezone (${isLive ? "SETTINGS" : "Demo"})`}
            subtitle="Local schedule targets for InsideTheIOM"
            action={<Clock className="h-4 w-4 text-zinc-400" />}
          />
          <div className="mt-4 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-zinc-800">
                Daily Publishing Target (posts / day)
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() =>
                      updateSettings({ dailyPublishingTarget: num })
                    }
                    className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition ${
                      settings.dailyPublishingTarget === num
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {num} / day
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-zinc-800">
                Editorial Timezone
              </label>
              <input
                type="text"
                readOnly
                value={settings.timezone}
                className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-700"
              />
              <p className="mt-1 text-[11px] text-zinc-500">
                Configured in Google Sheets SETTINGS tab.
              </p>
            </div>
          </div>
        </Card>

        {/* Platform Connections */}
        <Card>
          <CardHeader
            title="Platform Connection Status"
            subtitle="Social publishing flags from SETTINGS"
          />
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800">
                  <Instagram className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-950">Instagram</p>
                  <p className="text-[11px] text-zinc-500">
                    instagram_enabled
                  </p>
                </div>
              </div>
              <Badge variant={settings.instagramConnected ? "success" : "muted"}>
                {settings.instagramConnected ? "Enabled" : "Disabled"}
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800">
                  <Video className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-950">TikTok</p>
                  <p className="text-[11px] text-zinc-500">
                    tiktok_enabled
                  </p>
                </div>
              </div>
              <Badge variant={settings.tiktokConnected ? "success" : "muted"}>
                {settings.tiktokConnected ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Automation Status */}
        <Card>
          <CardHeader
            title="Automation & Publishing Status"
            subtitle="Flags from SETTINGS tab"
            action={<Power className="h-4 w-4 text-zinc-400" />}
          />
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3.5">
              <div>
                <p className="font-semibold text-zinc-950">
                  Discovery & AI Automation
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  automation_enabled in SETTINGS
                </p>
              </div>
              <Badge variant={settings.automationEnabled ? "success" : "muted"}>
                {settings.automationEnabled ? "TRUE" : "FALSE"}
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3.5">
              <div>
                <p className="font-semibold text-zinc-950">
                  Auto-Publishing
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  publishing_enabled in SETTINGS
                </p>
              </div>
              <Badge variant={settings.publishingEnabled ? "success" : "muted"}>
                {settings.publishingEnabled ? "TRUE" : "FALSE"}
              </Badge>
            </div>

            <button
              type="button"
              onClick={() =>
                notify(
                  "Phase 2 is read-only",
                  "No automatic social media publishing is performed from the dashboard."
                )
              }
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Verify Read-Only Guardrail
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
