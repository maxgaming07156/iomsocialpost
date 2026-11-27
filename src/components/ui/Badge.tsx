import React from "react";

type BadgeVariant =
  | "neutral"
  | "red"
  | "dark"
  | "outline"
  | "success"
  | "warning"
  | "muted";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: "bg-zinc-100 text-zinc-800 border-zinc-200",
  red: "bg-red-50 text-[#C81E1E] border-red-200",
  dark: "bg-zinc-950 text-white border-zinc-950",
  outline: "bg-white text-zinc-700 border-zinc-300",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  muted: "bg-zinc-50 text-zinc-500 border-zinc-200",
};

export function Badge({
  children,
  variant = "neutral",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-tight ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
