"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Instagram,
  Video,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Unlink,
  ShieldCheck,
  CircleDot,
  Loader2,
} from "lucide-react";
import {
  IntegrationConnectionStatus,
  IntegrationsStatusPayload,
  PlatformIntegrationSummary,
} from "@/types/integrations";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useStudio } from "@/context/StudioContext";

function statusBadgeVariant(status: IntegrationConnectionStatus) {
  switch (status) {
    case "CONNECTED":
      return "success";
    case "CONNECTION_ERROR":
      return "red";
    case "ACTION_REQUIRED":
      return "warning";
    default:
      return "muted";
  }
}

function PlatformIntegrationCard({
  summary,
  checkingPlatform,
  disconnectingPlatform,
  onCheck,
  onDisconnect,
}: {
  summary: PlatformIntegrationSummary;
  checkingPlatform: string | null;
  disconnectingPlatform: string | null;
  onCheck: (platform: "instagram" | "tiktok") => void;
  onDisconnect: (platform: "instagram" | "tiktok") => void;
}) {
  const isIg = summary.platform === "instagram";
  const Icon = isIg ? Instagram : Video;
  const title = isIg ? "Instagram" : "TikTok";
  const isConnected = summary.status === "CONNECTED";
  const canStartOAuth =
    summary.credentialsConfigured && summary.encryptionConfigured;
  const isChecking = checkingPlatform === summary.platform;
  const isDisconnecting = disconnectingPlatform === summary.platform;

  const completedCount = summary.checklist.filter((c) => c.complete).length;

  return (
    <Card>
      <CardHeader
        title={`${title} Integration`}
        subtitle={
          isIg
            ? "Meta Instagram Graph API (Business / Creator)"
            : "TikTok Login Kit & Content Posting API v2"
        }
        action={
          <Badge variant={statusBadgeVariant(summary.status)}>
            {summary.status.replace("_", " ")}
          </Badge>
        }
      />

      {/* Distinct 4-Layer Status Breakdown */}
      <div className="mt-4 space-y-2.5 rounded-lg border border-zinc-200 bg-zinc-50/70 p-3.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-zinc-500">Account Connection</span>
          <span className="font-semibold text-zinc-950">
            {summary.accountName || "Not connected"}
          </span>
        </div>

        {isIg && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-zinc-500">Account Type</span>
            <span className="font-medium text-zinc-900">
              {summary.accountType || "Business or Creator required"}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="text-zinc-500">API Eligibility</span>
          <span className="text-right font-medium text-zinc-900">
            {summary.apiEligibility}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-zinc-500">Required Permissions</span>
          <span className="text-right font-mono text-[10px] text-zinc-700">
            {summary.requiredPermissions.join(", ")}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-zinc-500">Actual Publishing</span>
          <Badge variant="muted">DISABLED (Readiness Only)</Badge>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-zinc-200/80 pt-2">
          <span className="text-zinc-500">Last Connection Check</span>
          <span className="font-mono text-[11px] text-zinc-700">
            {summary.lastCheckedAt
              ? new Date(summary.lastCheckedAt).toLocaleString("en-GB", {
                  timeZone: "Europe/Isle_of_Man",
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Never"}
          </span>
        </div>
      </div>

      {/* Status Message */}
      <p className="mt-3 text-xs leading-relaxed text-zinc-600">
        {summary.statusMessage}
      </p>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {canStartOAuth ? (
          <a
            href={`/api/integrations/${summary.platform}/connect`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800"
          >
            <Icon className="h-3.5 w-3.5" />
            {isConnected ? `Reconnect ${title}` : `Connect ${title}`}
          </a>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-100 px-3.5 py-2 text-xs font-medium text-zinc-500">
            <Icon className="h-3.5 w-3.5" />
            Set Env Credentials First
          </span>
        )}

        {summary.lastCheckedAt && (
          <>
            <button
              type="button"
              disabled={isChecking}
              onClick={() => onCheck(summary.platform)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isChecking ? "animate-spin" : ""}`}
              />
              Verify Connection
            </button>

            <button
              type="button"
              disabled={isDisconnecting}
              onClick={() => onDisconnect(summary.platform)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-[#C81E1E] hover:bg-red-100 disabled:opacity-50"
            >
              <Unlink className="h-3.5 w-3.5" />
              Disconnect
            </button>
          </>
        )}

        <a
          href={summary.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-[#C81E1E] hover:underline"
        >
          Official Docs
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Readiness Checklist */}
      <div className="mt-5 border-t border-zinc-200 pt-4">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Publishing Readiness Checklist
          </span>
          <span className="font-mono text-[11px] font-semibold text-zinc-700">
            {completedCount} / {summary.checklist.length} ready
          </span>
        </div>

        <div className="space-y-2">
          {summary.checklist.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2.5 rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2 text-xs"
            >
              {item.complete ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              ) : (
                <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-zinc-900">{item.label}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
                  {item.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function SocialIntegrationsSection() {
  const { notify } = useStudio();
  const [data, setData] = useState<IntegrationsStatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingPlatform, setCheckingPlatform] = useState<string | null>(null);
  const [disconnectingPlatform, setDisconnectingPlatform] = useState<
    string | null
  >(null);
  const [oauthBanner, setOauthBanner] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/status", {
        cache: "no-store",
      });
      const json = (await res.json()) as IntegrationsStatusPayload;
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("integration_error");
      const connected = params.get("connected");
      if (err) {
        setOauthBanner({ type: "error", message: err });
      } else if (connected) {
        setOauthBanner({
          type: "success",
          message: `${connected.toUpperCase()} account connected (read-only). Publishing remains disabled in Phase 5.`,
        });
      }
    }
  }, [loadStatus]);

  const handleCheck = async (platform: "instagram" | "tiktok") => {
    setCheckingPlatform(platform);
    try {
      const res = await fetch("/api/integrations/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const json = (await res.json()) as IntegrationsStatusPayload;
      setData(json);
      const target = platform === "instagram" ? json.instagram : json.tiktok;
      notify(`${platform.toUpperCase()} check: ${target.status}`, target.statusMessage);
    } finally {
      setCheckingPlatform(null);
    }
  };

  const handleDisconnect = async (platform: "instagram" | "tiktok") => {
    setDisconnectingPlatform(platform);
    try {
      const res = await fetch("/api/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const json = (await res.json()) as IntegrationsStatusPayload;
      setData(json);
      notify(`Disconnected ${platform.toUpperCase()}`, "Server-side OAuth cookie cleared.");
    } finally {
      setDisconnectingPlatform(null);
    }
  };

  return (
    <div className="mb-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-zinc-950">
            Social Integrations (Phase 5 Readiness)
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Server-side OAuth2 & readiness checks. Tokens are encrypted in
            HttpOnly cookies and never stored in Google Sheets or logs.
          </p>
        </div>
        <Badge variant="outline">
          <ShieldCheck className="h-3 w-3 text-[#C81E1E]" />
          Publishing Disabled
        </Badge>
      </div>

      {oauthBanner && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs ${
            oauthBanner.type === "error"
              ? "border-red-200 bg-red-50 text-[#C81E1E]"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {oauthBanner.type === "error" ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{oauthBanner.message}</span>
        </div>
      )}

      {loading || !data ? (
        <div className="flex items-center justify-center rounded-xl border border-zinc-200 bg-white py-12 text-xs text-zinc-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Checking integration readiness...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PlatformIntegrationCard
            summary={data.instagram}
            checkingPlatform={checkingPlatform}
            disconnectingPlatform={disconnectingPlatform}
            onCheck={handleCheck}
            onDisconnect={handleDisconnect}
          />
          <PlatformIntegrationCard
            summary={data.tiktok}
            checkingPlatform={checkingPlatform}
            disconnectingPlatform={disconnectingPlatform}
            onCheck={handleCheck}
            onDisconnect={handleDisconnect}
          />
        </div>
      )}
    </div>
  );
}
