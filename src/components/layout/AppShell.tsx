"use client";

import React, { useState } from "react";
import {
  Menu,
  FlaskConical,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { ToastContainer } from "@/components/ui/Toast";
import { useStudio } from "@/context/StudioContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const {
    connectionStatus,
    isLoading,
    backendError,
    lastSyncedAt,
    settings,
    refreshData,
  } = useStudio();

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-950">
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-h-screen flex-col lg:pl-64">
        {/* Top Connection Status Bar & Mobile Header */}
        <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-zinc-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-zinc-200 p-1.5 text-zinc-700 hover:bg-zinc-100 lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold tracking-tight text-zinc-950 lg:hidden">
              InsideThe<span className="text-[#C81E1E]">IOM</span> Studio
            </span>

            <div className="hidden items-center gap-2 sm:flex">
              {connectionStatus === "checking" && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600">
                  <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />
                  Checking backend connection...
                </span>
              )}
              {connectionStatus === "demo" && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600">
                  <FlaskConical className="h-3 w-3 text-[#C81E1E]" />
                  Demo Mode · Backend credentials not configured
                </span>
              )}
              {connectionStatus === "connected" && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Live Mode · Google Sheets Connected (Read-Only)
                </span>
              )}
              {connectionStatus === "error" && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-medium text-[#C81E1E]">
                  <AlertTriangle className="h-3 w-3" />
                  Live Mode · Connection Error
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
            {lastSyncedAt && (
              <span className="hidden md:inline text-[11px] text-zinc-400">
                Synced{" "}
                {new Date(lastSyncedAt).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            <button
              type="button"
              onClick={() => refreshData()}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
              title="Refresh studio data"
            >
              <RefreshCw
                className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <span className="hidden rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[10px] text-zinc-700 md:inline">
              {settings.timezone || "Europe/Isle_of_Man"}
            </span>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {backendError && (
            <div className="mb-6 flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50/70 p-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#C81E1E]" />
                <div>
                  <p className="text-xs font-semibold text-zinc-950">
                    Unable to load live Google Sheets data
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-700">{backendError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => refreshData()}
                disabled={isLoading}
                className="shrink-0 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                Retry Connection
              </button>
            </div>
          )}

          {isLoading && connectionStatus === "checking" ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white py-20 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              <p className="mt-3 text-xs font-semibold text-zinc-900">
                Loading InsideTheIOM Studio...
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Checking server-side Google Apps Script connection.
              </p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
