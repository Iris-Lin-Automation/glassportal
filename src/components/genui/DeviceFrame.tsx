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
    <div className={cn("flex justify-center overflow-auto p-4", className)}>
      <div
        className="min-h-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-[width] duration-300"
        style={{ width: `min(100%, ${width}px)` }}
      >
        <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {GENUI_VIEWPORT_SIZE[viewport].label} · {width}px
          </span>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
