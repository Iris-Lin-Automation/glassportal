import type { PortalTheme } from "@/lib/types";

export interface ThemePreset {
  id: PortalTheme;
  label: string;
  /** Primary accent hex (progress, toolbar, KPI figures, badges) */
  brandColor: string;
  description: string;
  /** Portal page canvas */
  pageBg: string;
  pageText: string;
  /** Header / cards */
  card: string;
  headerTopbar: string;
  headerTopbarText: string;
  accent: string;
  divider: string;
  mutedText: string;
  chip: string;
  statCard: string;
  progressBar: string;
  previewChrome: string;
  /** Block renderer */
  bodyText: string;
  headingText: string;
  quote: string;
  code: string;
  tableWrap: string;
  tableHead: string;
  tableCell: string;
  tableRow: string;
  tableRule: string;
  callout: string;
  /** Metric card footer / status tint */
  statStatus: string;
  listMarker: string;
}

/**
 * Executive Theme catalog — McKinsey / BCG / Stripe consulting aesthetics.
 * Only these three appear in the Studio dropdown.
 */
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "mckinsey-slate",
    label: "McKinsey Slate",
    brandColor: "#475569",
    description: "Pure white · slate-900 type · slate-600 accent",
    pageBg: "bg-white",
    pageText: "text-slate-900",
    card: "bg-white border-slate-200",
    headerTopbar: "bg-white border-slate-200",
    headerTopbarText: "text-slate-900",
    accent: "bg-slate-600 text-white",
    divider: "bg-slate-200",
    mutedText: "text-slate-500",
    chip: "border-slate-200 bg-slate-50 text-slate-700",
    statCard: "bg-white border border-slate-200 rounded-xl p-5 shadow-sm",
    progressBar: "border-slate-200 bg-white/95",
    previewChrome: "border-slate-200 bg-slate-50 text-slate-600",
    bodyText: "text-[15px] leading-relaxed text-slate-800",
    headingText: "text-slate-900",
    quote:
      "rounded-r-lg border-l-4 border-current bg-slate-50 p-4 text-slate-600",
    code: "border-slate-200 bg-slate-50 text-slate-800",
    tableWrap: "border-slate-200 bg-white",
    tableHead:
      "border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-[0.06em] text-slate-600",
    tableCell: "text-sm text-slate-700",
    tableRow: "border-b border-slate-100 hover:bg-slate-50/50",
    tableRule: "border-r border-slate-100",
    callout:
      "rounded-r-lg border-l-4 border-current bg-slate-50 p-4 text-slate-600",
    statStatus: "text-xs font-medium text-slate-600",
    listMarker: "marker:text-slate-400",
  },
  {
    id: "bcg-emerald",
    label: "BCG Emerald",
    brandColor: "#16A34A",
    description: "Strategy green · emerald callouts & status",
    pageBg: "bg-white",
    pageText: "text-slate-900",
    card: "bg-white border-slate-200",
    headerTopbar: "bg-white border-slate-200",
    headerTopbarText: "text-slate-900",
    accent: "bg-emerald-600 text-white",
    divider: "bg-slate-200",
    mutedText: "text-slate-500",
    chip: "border-emerald-200 bg-emerald-50/60 text-emerald-700",
    statCard: "bg-white border border-slate-200 rounded-xl p-5 shadow-sm",
    progressBar: "border-slate-200 bg-white/95",
    previewChrome: "border-slate-200 bg-emerald-50/50 text-emerald-800",
    bodyText: "text-[15px] leading-relaxed text-slate-800",
    headingText: "text-slate-900",
    quote:
      "rounded-r-lg border-l-4 border-current bg-emerald-50/60 p-4 text-emerald-600",
    code: "border-slate-200 bg-slate-50 text-slate-800",
    tableWrap: "border-slate-200 bg-white",
    tableHead:
      "border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-[0.06em] text-slate-600",
    tableCell: "text-sm text-slate-700",
    tableRow: "border-b border-slate-100 hover:bg-emerald-50/30",
    tableRule: "border-r border-slate-100",
    callout:
      "rounded-r-lg border-l-4 border-current bg-emerald-50/60 p-4 text-emerald-600",
    statStatus: "text-xs font-medium text-emerald-600",
    listMarker: "marker:text-emerald-600/70",
  },
  {
    id: "stripe-midnight",
    label: "Stripe Midnight",
    brandColor: "#4F46E5",
    description: "Tech indigo · white canvas · slate borders",
    pageBg: "bg-white",
    pageText: "text-slate-900",
    card: "bg-white border-slate-200",
    headerTopbar: "bg-white border-slate-200",
    headerTopbarText: "text-slate-900",
    accent: "bg-indigo-600 text-white",
    divider: "bg-slate-200",
    mutedText: "text-slate-500",
    chip: "border-slate-200 bg-indigo-50/50 text-indigo-700",
    statCard: "bg-white border border-slate-200 rounded-xl p-5 shadow-sm",
    progressBar: "border-slate-200 bg-white/95",
    previewChrome: "border-slate-200 bg-indigo-50/40 text-indigo-800",
    bodyText: "text-[15px] leading-relaxed text-slate-800",
    headingText: "text-slate-900",
    quote:
      "rounded-r-lg border-l-4 border-current bg-indigo-50/50 p-4 text-indigo-600",
    code: "border-slate-200 bg-slate-50 text-slate-800",
    tableWrap: "border-slate-200 bg-white",
    tableHead:
      "border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-[0.06em] text-slate-600",
    tableCell: "text-sm text-slate-700",
    tableRow: "border-b border-slate-100 hover:bg-indigo-50/20",
    tableRule: "border-r border-slate-100",
    callout:
      "rounded-r-lg border-l-4 border-current bg-indigo-50/50 p-4 text-indigo-600",
    statStatus: "text-xs font-medium text-indigo-600",
    listMarker: "marker:text-indigo-400",
  },
];

const PRESET_BY_ID = Object.fromEntries(
  THEME_PRESETS.map((p) => [p.id, p])
) as Partial<Record<PortalTheme, ThemePreset>>;

/** Map legacy theme ids saved in localStorage / branding → current catalog. */
export function normalizeThemeId(raw?: string | null): PortalTheme {
  if (!raw) return "mckinsey-slate";

  const legacy: Record<string, PortalTheme> = {
    "mckinsey-slate": "mckinsey-slate",
    "bcg-emerald": "bcg-emerald",
    "stripe-midnight": "stripe-midnight",
    // legacy → McKinsey Slate
    "slate-gray": "mckinsey-slate",
    "executive-light": "mckinsey-slate",
    "crisp-minimal": "mckinsey-slate",
    "dark-glass": "mckinsey-slate",
    // legacy → Stripe Midnight
    "royal-navy": "stripe-midnight",
    "neon-midnight": "stripe-midnight",
  };

  return legacy[raw] || "mckinsey-slate";
}

export function getThemePreset(
  theme: PortalTheme | string | null | undefined
): ThemePreset {
  return PRESET_BY_ID[normalizeThemeId(theme)] || THEME_PRESETS[0];
}

export function themeBrandColor(
  theme: PortalTheme | string | null | undefined
): string {
  return getThemePreset(theme).brandColor;
}
