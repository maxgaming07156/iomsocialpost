"use client";

import React, { useEffect, useState } from "react";
import { ShieldAlert, Sliders, Loader2 } from "lucide-react";
import {
  DEFAULT_PUBLISHING_CONTROLS,
  PublishingControls,
} from "@/types/publishing";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useStudio } from "@/context/StudioContext";

function ControlToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50/70 p-3 text-xs">
      <div>
        <p className="font-semibold text-zinc-950">{label}</p>
        <p className="mt-0.5 text-[11px] text-zinc-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-50 ${
          checked
            ? "border-zinc-950 bg-zinc-950 text-white"
            : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50"
        }`}
      >
        {checked ? "ON" : "OFF"}
      </button>
    </div>
  );
}

export function PublishingControlsSection() {
  const { notify } = useStudio();
  const [controls, setControls] = useState<PublishingControls>(
    DEFAULT_PUBLISHING_CONTROLS
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/publishing/controls", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { ok?: boolean; controls?: PublishingControls }) => {
        if (j.ok && j.controls) setControls(j.controls);
      })
      .finally(() => setLoading(false));
  }, []);

  const updateControl = async (patch: Partial<PublishingControls>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/publishing/controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        controls?: PublishingControls;
      };
      if (res.ok && json.ok && json.controls) {
        setControls(json.controls);
        notify("Publishing controls updated");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader
        title="Publishing Engine Controls (Phase 6)"
        subtitle="All publishing switches default to OFF. Test Mode blocks accidental public posting."
        action={
          <div className="flex items-center gap-2">
            {controls.testMode && <Badge variant="warning">Test Mode ON</Badge>}
            <Badge variant={controls.publishingEnabled ? "success" : "muted"}>
              <Sliders className="h-3 w-3" />
              {controls.publishingEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-8 text-xs text-zinc-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading publishing controls...
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-2.5 rounded-lg border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#C81E1E]" />
            <span>
              Even when enabled, only <strong>APPROVED</strong> or{" "}
              <strong>SCHEDULED</strong> posts with a genuinely connected
              account and approved permissions can be submitted.
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <ControlToggleRow
              label="Master Publishing Enabled"
              description="Allow server-side publishing execution when confirmed."
              checked={controls.publishingEnabled}
              disabled={saving}
              onChange={(val) => updateControl({ publishingEnabled: val })}
            />
            <ControlToggleRow
              label="Manual Confirmation Required"
              description="Require final confirmation modal before every publish."
              checked={controls.manualConfirmationRequired}
              disabled={saving}
              onChange={(val) =>
                updateControl({ manualConfirmationRequired: val })
              }
            />
            <ControlToggleRow
              label="Instagram Publishing"
              description="Allow Instagram Graph API container publishing."
              checked={controls.instagramPublishingEnabled}
              disabled={saving}
              onChange={(val) =>
                updateControl({ instagramPublishingEnabled: val })
              }
            />
            <ControlToggleRow
              label="TikTok Publishing"
              description="Allow TikTok Content Posting API photo publishing."
              checked={controls.tiktokPublishingEnabled}
              disabled={saving}
              onChange={(val) =>
                updateControl({ tiktokPublishingEnabled: val })
              }
            />
            <ControlToggleRow
              label="Test Mode (Safe Guardrail)"
              description="Forces TikTok SELF_ONLY and blocks public Instagram feed posts."
              checked={controls.testMode}
              disabled={saving}
              onChange={(val) => updateControl({ testMode: val })}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
