"use client";

import type { GenuiPalette } from "@/config/genui";
import { cn } from "@/lib/utils";

const KEYS = [
  ["background", "BG"],
  ["card", "Card"],
  ["table", "Table"],
] as const;

/** Tiny circular color wells — like design-tool property chips */
export function SurfaceColors({
  palette,
  onChange,
  onReset,
}: {
  palette: GenuiPalette;
  onChange: (next: GenuiPalette) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {KEYS.map(([key, label]) => (
          <label
            key={key}
            className="group relative flex cursor-pointer flex-col items-center gap-0.5"
            title={`${label}: ${palette[key]}`}
          >
            <span
              className={cn(
                "relative h-6 w-6 overflow-hidden rounded-full border border-black/10 shadow-sm",
                "ring-offset-1 transition group-hover:ring-2 group-hover:ring-slate-300"
              )}
              style={{ backgroundColor: palette[key] }}
            >
              <input
                type="color"
                value={palette[key]}
                onChange={(e) =>
                  onChange({ ...palette, [key]: e.target.value })
                }
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </span>
            <span className="text-[9px] font-medium text-slate-400">
              {label}
            </span>
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={onReset}
        className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        Reset
      </button>
    </div>
  );
}
