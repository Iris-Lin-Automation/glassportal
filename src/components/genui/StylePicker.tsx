"use client";

import {
  GENUI_STYLE_LABELS,
  GENUI_STYLES,
  type GenuiStyle,
} from "@/config/genui";
import { cn } from "@/lib/utils";

const SWATCH: Record<GenuiStyle, { bg: string; ring: string }> = {
  minimal: { bg: "#F1F5F9", ring: "#94A3B8" },
  "modern-saas": { bg: "#4F46E5", ring: "#818CF8" },
  editorial: { bg: "#E7E0D4", ring: "#A8A29E" },
  "night-sky": { bg: "#0B1224", ring: "#22D3EE" },
};

/** Compact Figma-like style chips */
export function StylePicker({
  value,
  onChange,
}: {
  value: GenuiStyle;
  onChange: (style: GenuiStyle) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {GENUI_STYLES.map((s) => {
        const active = value === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition",
              active
                ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-100"
                : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
            )}
          >
            <span
              className="h-2.5 w-2.5 rounded-[3px] shadow-inner"
              style={{
                background: SWATCH[s].bg,
                boxShadow: `inset 0 0 0 1px ${SWATCH[s].ring}55`,
              }}
            />
            {GENUI_STYLE_LABELS[s]}
          </button>
        );
      })}
    </div>
  );
}
