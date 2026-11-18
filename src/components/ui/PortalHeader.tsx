"use client";

import type { PortalData, PortalTheme } from "@/lib/types";
import { getThemePreset } from "@/lib/theme-presets";
import { Building2, Lock } from "lucide-react";

interface PortalHeaderProps {
  data: PortalData;
  /**
   * Dynamic client logo URL (data: / http / /api/branding/...).
   * ALWAYS prefer this over any default. Never hardcode a static image path.
   */
  logoUrl?: string;
  /** Executive theme — drives header / card / accent surface classes. */
  theme?: PortalTheme;
  /** Pro/Agency: hide GlassPortal chrome in the top bar. */
  whiteLabel?: boolean;
}

function isRenderableLogo(src?: string) {
  if (!src) return false;
  return (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:") ||
    src.startsWith("/")
  );
}

/** Only render badge/tag UI when label text is non-empty after trim. */
function hasTagText(value?: string | null): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function contrastOn(hex: string): "#FFFFFF" | "#0F172A" {
  const raw = hex.replace("#", "").trim();
  if (raw.length < 6) return "#FFFFFF";
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.62 ? "#0F172A" : "#FFFFFF";
}

/**
 * Sleek top nav + Notion page title + KPI metrics.
 * Logo contract: logoUrl prop first → data.icon → Building2 fallback only.
 * Title contract: always render `data.title` (Notion page title) as the hero H1.
 * Badge contract: never render empty bordered tag shells; status text always high-contrast.
 */
export function PortalHeader({
  data,
  logoUrl,
  theme,
  whiteLabel = false,
}: PortalHeaderProps) {
  const {
    icon,
    title,
    badge,
    clientName = "Acme Corporation",
    preparedFor,
    statusLabel,
    stats = [],
    brandColor,
    coverUrl,
  } = data;

  const preset = getThemePreset(theme);
  const accent = brandColor || preset.brandColor;
  const accentFg = contrastOn(accent);
  const pageTitle = (title || "").trim();

  const badgeText = hasTagText(badge) ? badge.trim() : "";
  const statusText = hasTagText(statusLabel) ? statusLabel.trim() : "";
  const preparedText = hasTagText(preparedFor) ? preparedFor.trim() : "";
  const showBadgeRow = Boolean(badgeText || statusText || preparedText);

  const visibleStats = (stats || []).filter(
    (s) => hasTagText(s.label) && hasTagText(s.value)
  );

  // Priority: explicit logoUrl → branding icon on data → fallback icon component
  const resolvedLogo = isRenderableLogo(logoUrl)
    ? logoUrl
    : isRenderableLogo(icon)
      ? icon
      : undefined;

  return (
    <section
      className={`overflow-hidden rounded-xl border shadow-sm ${preset.card}`}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-2.5 border-b border-transparent px-4 py-2.5 md:px-5 ${preset.headerTopbar}`}
      >
        <div
          className={`flex min-w-0 flex-wrap items-center gap-2 text-sm ${preset.headerTopbarText}`}
        >
          {resolvedLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolvedLogo}
              alt={`${clientName} logo`}
              className="h-7 w-7 shrink-0 rounded-md object-contain"
            />
          ) : (
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50"
              style={{ color: accent }}
              aria-hidden
            >
              <Building2 className="h-3.5 w-3.5" />
            </span>
          )}
          {hasTagText(clientName) ? (
            <span className="font-semibold tracking-tight">
              {clientName.trim()}
            </span>
          ) : null}
          {!whiteLabel ? (
            <>
              {hasTagText(clientName) ? (
                <span className="opacity-30">|</span>
              ) : null}
              <span className={preset.mutedText}>GlassPortal</span>
            </>
          ) : null}
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
          style={{ backgroundColor: accent, color: accentFg }}
        >
          <Lock className="h-3 w-3" />
          <span className="sm:hidden">Confidential</span>
          <span className="hidden sm:inline">
            Confidential Commercial Delivery
          </span>
        </span>
      </div>

      {isRenderableLogo(coverUrl) ? (
        <div className="relative aspect-[2.4/1] w-full overflow-hidden border-t border-slate-100 bg-slate-100 sm:aspect-[2/1] md:aspect-[16/9]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-transparent" />
        </div>
      ) : null}

      {pageTitle ? (
        <div className="border-t border-slate-100 px-4 py-5 sm:px-5 sm:py-6 md:px-6">
          <h1 className="text-[1.375rem] font-bold leading-snug tracking-tight text-slate-900 sm:text-2xl md:text-[1.75rem]">
            {pageTitle}
          </h1>
        </div>
      ) : null}

      {showBadgeRow ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2.5 sm:px-5 md:px-6">
          {badgeText ? (
            <span
              className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-medium ${preset.chip}`}
            >
              {badgeText}
            </span>
          ) : null}
          {statusText ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold"
              style={{ backgroundColor: accent, color: accentFg }}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: accentFg }}
              />
              {statusText}
            </span>
          ) : null}
          {preparedText ? (
            <span
              className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-medium ${preset.chip}`}
            >
              Prepared for: {preparedText}
            </span>
          ) : null}
        </div>
      ) : null}

      {visibleStats.length > 0 ? (
        <div className="grid gap-3 border-t border-slate-100 px-4 py-4 sm:grid-cols-3 sm:gap-4 sm:px-5 sm:py-5 md:px-6">
          {visibleStats.map((stat) => {
            const status =
              typeof stat.status === "string" && stat.status.trim()
                ? stat.status.trim()
                : "";
            return (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {stat.label.trim()}
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {stat.value.trim()}
                </p>
                {status ? (
                  <p className={`mt-2 ${preset.statStatus}`}>{status}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
