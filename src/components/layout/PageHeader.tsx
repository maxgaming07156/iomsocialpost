"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useStudio } from "@/context/StudioContext";

interface PageHeaderProps {
  title: string;
  description: string;
  breadcrumb: string;
  action?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  action,
}: PageHeaderProps) {
  const { mode, connectionStatus } = useStudio();

  return (
    <div className="mb-6 flex flex-col justify-between gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-end">
      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
          <Link href="/" className="hover:text-zinc-900">
            InsideTheIOM Studio
          </Link>
          <ChevronRight className="h-3 w-3 text-zinc-400" />
          <span className="text-zinc-900">{breadcrumb}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl">
            {title}
          </h1>
          {mode === "live" ? (
            <Badge
              variant={connectionStatus === "error" ? "red" : "success"}
            >
              {connectionStatus === "error"
                ? "Live · Connection Error"
                : "Live · Read-Only"}
            </Badge>
          ) : (
            <Badge variant="outline">Demo Mode</Badge>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500 sm:text-sm">
          {description}
        </p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
