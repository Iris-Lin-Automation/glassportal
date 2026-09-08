"use client";

import { cn } from "@/lib/utils";

interface CalloutGlassProps {
  content: string;
  /** Kept for API compatibility; icons intentionally omitted. */
  icon?: string;
  /** Theme rail + wash (border-l-4 border-current + soft bg). */
  className?: string;
}

/**
 * Executive callout — left accent rail only (no full box border).
 * Accent color comes from theme via `text-*` + `border-current`.
 */
export function CalloutGlass({ content, className }: CalloutGlassProps) {
  return (
    <div
      className={cn(
        "rounded-r-lg border-l-4 border-current bg-slate-50 p-4 text-slate-600",
        className
      )}
    >
      <p className="text-[15px] font-medium leading-relaxed text-slate-900">
        {content}
      </p>
    </div>
  );
}
