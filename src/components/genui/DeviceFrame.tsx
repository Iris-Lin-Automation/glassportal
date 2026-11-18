"use client";

import {
  GENUI_VIEWPORT_SIZE,
  type GenuiViewport,
} from "@/config/genui";
import { cn } from "@/lib/utils";

export function DeviceFrame({
  viewport,
  children,
  className,
}: {
  viewport: GenuiViewport;
  children: React.ReactNode;
  className?: string;
}) {
  const width = GENUI_VIEWPORT_SIZE[viewport].width;
  return (
    <div className={cn("mx-auto w-full", className)}>
      <div
        className="mx-auto overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.08)] transition-[max-width] duration-300"
        style={{ maxWidth: `${width}px` }}
      >
        <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50/90 px-2.5 py-1.5">
          <span className="h-2 w-2 rounded-full bg-[#FF5F57]" />
          <span className="h-2 w-2 rounded-full bg-[#FEBC2E]" />
          <span className="h-2 w-2 rounded-full bg-[#28C840]" />
          <span className="ml-1.5 text-[9px] font-medium uppercase tracking-wide text-slate-400">
            {GENUI_VIEWPORT_SIZE[viewport].label} · {width}px
          </span>
        </div>
        <div className="max-h-[calc(100dvh-7.5rem)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
