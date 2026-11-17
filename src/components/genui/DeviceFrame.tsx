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
    <div className={cn("flex justify-center overflow-auto", className)}>
      <div
        className="min-h-[480px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-[width] duration-300"
        style={{ width: `min(100%, ${width}px)` }}
      >
        <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-2.5 py-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-300" />
          <span className="h-2 w-2 rounded-full bg-slate-300" />
          <span className="h-2 w-2 rounded-full bg-slate-300" />
          <span className="ml-1.5 text-[9px] font-medium uppercase tracking-wide text-slate-400">
            {GENUI_VIEWPORT_SIZE[viewport].label} · {width}px
          </span>
        </div>
        <div className="max-h-[72vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
