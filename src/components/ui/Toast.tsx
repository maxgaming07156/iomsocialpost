"use client";

import React from "react";
import { CheckCircle2, X } from "lucide-react";
import { useStudio } from "@/context/StudioContext";

export function ToastContainer() {
  const { toasts, dismissToast } = useStudio();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-950 px-4 py-3 text-white shadow-lg"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">{toast.title}</p>
            {toast.description && (
              <p className="mt-0.5 text-[11px] text-zinc-400">
                {toast.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="rounded p-0.5 text-zinc-400 hover:text-white"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
