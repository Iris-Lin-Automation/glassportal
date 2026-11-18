"use client";

import {
  GENUI_STYLE_LABELS,
  GENUI_STYLES,
  type GenuiStyle,
} from "@/config/genui";
import { cn } from "@/lib/utils";

const SWATCH: Record<GenuiStyle, { bg: string; ring: string }> = {
  minimal: { bg: "#F1F5F9", ring: "#94A3B8" },
  "modern-saas": { bg: "#7C3AED", ring: "#A78BFA" },
  editorial: { bg: "#E7E0D4", ring: "#A8A29E" },
  "night-sky": { bg: "#05070D", ring: "#22D3A1" },
  obsidian: { bg: "#050505", ring: "#22D3EE" },
  fintech: { bg: "#8B5CF6", ring: "#C4B5FD" },
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
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
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
