"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PortalData, PortalTheme } from "@/lib/types";
import {
  getThemePreset,
  normalizeThemeId,
  themeBrandColor,
} from "@/lib/theme-presets";
import { usePortalAnalytics } from "@/hooks/usePortalAnalytics";
import { PortalRenderer } from "@/components/portal/PortalRenderer";
import { ReadingProgress } from "@/components/portal/ReadingProgress";
import { BrandFavicon } from "@/components/portal/BrandFavicon";
import { ExportToolbar } from "@/components/ui/ExportToolbar";

interface PortalShellProps {
  data: PortalData;
  token?: string;
  shareUrl?: string;
  showToolbar?: boolean;
  pinProgress?: boolean;
  liveSync?: boolean;
  liveSyncMs?: number;
  onLiveData?: (data: PortalData) => void;
  /** Sidebar Executive Theme — drives live preview surfaces */
  theme?: PortalTheme;
  /** Pro/Agency white-label — hide GlassPortal chrome */
  whiteLabel?: boolean;
  /** Starter watermark footer (preview + client + PDF capture) */
  showWatermark?: boolean;
}

function isRenderableLogo(icon?: string) {
  if (!icon) return false;
  return (
    icon.startsWith("data:") ||
    icon.startsWith("http://") ||
    icon.startsWith("https://") ||
    icon.startsWith("/")
  );
}

function brandingLogoPath(pageId: string, updatedAt?: string) {
  const v = encodeURIComponent(updatedAt || String(Date.now()));
  return `/api/branding/${encodeURIComponent(pageId)}/logo?v=${v}`;
}

function mergeLive(prev: PortalData, next: PortalData): PortalData {
  const keepBrandedIcon =
    prev.icon?.startsWith("/api/branding") || prev.icon?.startsWith("data:");
  const prevImages = prev.blocks
    .filter((b) => b.type === "image")
    .map((b) => `${b.id}:${b.url || ""}`)
    .join("|");
  const nextImages = next.blocks
    .filter((b) => b.type === "image")
    .map((b) => `${b.id}:${b.url || ""}`)
    .join("|");
  const imagesChanged = prevImages !== nextImages;

  return {
    ...next,
    // Never let Notion emoji / expired file icons wipe the client logo
    icon: keepBrandedIcon
      ? prev.icon
      : isRenderableLogo(next.icon)
        ? next.icon
        : prev.icon || next.icon,
    brandColor: prev.brandColor || next.brandColor,
    clientName: prev.clientName || next.clientName,
    badge: prev.badge || next.badge,
    description: prev.description || next.description,
    title: prev.title || next.title,
    updatedAt: imagesChanged
      ? `${next.updatedAt || ""}-${Date.now()}`
      : next.updatedAt || prev.updatedAt,
  };
}

/**
 * Themed portal shell: reading progress + heartbeat tracking + action bar.
 */
export function PortalShell({
  data,
  token,
  shareUrl,
  showToolbar = true,
  pinProgress = true,
  liveSync = true,
  liveSyncMs = 12000,
  onLiveData,
  theme = "mckinsey-slate",
  whiteLabel = false,
  showWatermark = false,
}: PortalShellProps) {
  const [live, setLive] = useState(data);
  const syncing = useRef(false);
  const resolvedTheme = normalizeThemeId(theme);
  const preset = getThemePreset(resolvedTheme);
  // Track parent *content* identity so theme/branding updates don't clobber blocks
  const parentContentKey = useRef(
    `${data.id}|${data.updatedAt}|${data.blocks.map((b) => b.id).join(",")}`
  );

  useEffect(() => {
    setLive((prev) => {
      // Never let UI/theme/data refresh wipe a renderable uploaded logo
      const nextIcon = isRenderableLogo(data.icon)
        ? data.icon
        : isRenderableLogo(prev.icon)
          ? prev.icon
          : data.icon;

      const contentKey = `${data.id}|${data.updatedAt}|${data.blocks
        .map((b) => b.id)
        .join(",")}`;
      const contentChanged = contentKey !== parentContentKey.current;

      // Theme / clientName / logo / brandColor only — keep live Notion blocks & images
      if (prev.id === data.id && !contentChanged) {
        return {
          ...prev,
          title: data.title || prev.title,
          description: data.description ?? prev.description,
          clientName: data.clientName || prev.clientName,
          badge: data.badge || prev.badge,
          preparedFor: data.preparedFor || prev.preparedFor,
          password: data.password ?? prev.password,
          status: data.status ?? prev.status,
          statusLabel: data.statusLabel ?? prev.statusLabel,
          brandColor: data.brandColor || prev.brandColor,
          icon: nextIcon,
        };
      }

      parentContentKey.current = contentKey;
      return {
        ...data,
        // Prefer fresher in-shell blocks after Auto-Sync when parent re-pushes same revision
        blocks:
          prev.id === data.id &&
          prev.blocks.length >= data.blocks.length &&
          data.updatedAt === prev.updatedAt
            ? prev.blocks
            : data.blocks,
        icon: nextIcon,
        brandColor: data.brandColor || prev.brandColor,
      };
    });
  }, [data]);

  const tokenFromUrl = useMemo(() => {
    const fromProp = token?.trim();
    if (fromProp && /^(secret_|ntn_)/i.test(fromProp)) return fromProp;
    if (typeof window === "undefined") {
      return fromProp || undefined;
    }
    const sp = new URLSearchParams(window.location.search);
    const nt = (sp.get("nt") || sp.get("ntoken") || sp.get("t") || "").trim();
    if (nt && /^(secret_|ntn_)/i.test(nt)) return nt;
    const legacy = (sp.get("token") || "").trim();
    if (legacy && /^(secret_|ntn_)/i.test(legacy)) return legacy;
    // Studio may pass a valid integration token that doesn't match prefix heuristics
    return fromProp || nt || undefined;
  }, [token]);

  // Re-hydrate logo from branding API after hard refresh (favicon + header)
  useEffect(() => {
    let cancelled = false;
    const pageId = data.id;
    if (!pageId) return;

    void (async () => {
      try {
        const res = await fetch(
          `/api/branding/${encodeURIComponent(pageId)}?_=${Date.now()}`,
          { cache: "no-store" }
        );
        if (!res.ok || cancelled) return;
        const branding = (await res.json()) as {
          logoDataUrl?: string;
          brandColor?: string;
          clientName?: string;
          cardTitle?: string;
          cardSubtitle?: string;
          confidentialLabel?: string;
          updatedAt?: string;
        };
        if (!branding.logoDataUrl && !branding.brandColor) return;
        setLive((prev) => ({
          ...prev,
          icon: branding.logoDataUrl
            ? brandingLogoPath(pageId, branding.updatedAt)
            : prev.icon,
          // Prefer parent/theme-driven accent when already set
          brandColor: prev.brandColor || branding.brandColor || prev.brandColor,
          clientName: branding.clientName || prev.clientName,
          title: prev.title || branding.cardTitle || prev.title,
          description: prev.description || branding.cardSubtitle,
          badge: prev.badge || branding.confidentialLabel,
        }));
      } catch {
        /* keep server-provided branding */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data.id]);

  const refreshFromNotion = useCallback(async () => {
    if (!tokenFromUrl || syncing.current) return;
    syncing.current = true;
    try {
      const res = await fetch(
        `/api/portal/${encodeURIComponent(live.id)}?_=${Date.now()}`,
        {
          headers: { "x-notion-token": tokenFromUrl },
          cache: "no-store",
        }
      );
      if (!res.ok) return;
      const json = (await res.json()) as PortalData;
      setLive((prev) => {
        const merged = mergeLive(prev, json);
        onLiveData?.(merged);
        return merged;
      });
    } catch {
      /* keep current canvas */
    } finally {
      syncing.current = false;
    }
  }, [tokenFromUrl, live.id, onLiveData]);

  useEffect(() => {
    if (!liveSync || !tokenFromUrl) return;

    const onFocus = () => {
      void refreshFromNotion();
    };
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(() => {
      void refreshFromNotion();
    }, liveSyncMs);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [liveSync, tokenFromUrl, liveSyncMs, refreshFromNotion]);

  // Parent updates brandColor on theme select / logo upload — keep in sync
  const brandColor =
    data.brandColor || themeBrandColor(resolvedTheme) || "#475569";
  const logoUrl = isRenderableLogo(live.icon) ? live.icon : undefined;

  const {
    progress,
    activeSection,
    trackConfirm,
    trackUnconfirm,
    trackExport,
    trackCopy,
  } = usePortalAnalytics({
    pageId: live.id,
    token: tokenFromUrl,
  });

  return (
    <div
      data-portal-theme={resolvedTheme}
      className={`min-h-full transition-colors duration-200 ${preset.pageBg} ${preset.pageText}`}
    >
      <BrandFavicon href={logoUrl} />
      <ReadingProgress
        progress={progress}
        activeSection={activeSection}
        documentTitle={live.title}
        brandColor={brandColor}
        logoUrl={logoUrl}
        pinToViewport={pinProgress}
        barClassName={preset.progressBar}
        mutedTextClassName={preset.mutedText}
      />
      {/* Spacer is owned by ReadingProgress anchor — avoid double gap */}
      <PortalRenderer
        data={{ ...live, brandColor }}
        token={tokenFromUrl}
        logoUrl={logoUrl}
        theme={resolvedTheme}
        whiteLabel={whiteLabel}
        showWatermark={showWatermark}
      />
      {showToolbar ? (
        <ExportToolbar
          shareUrl={shareUrl}
          brandColor={brandColor}
          showWatermark={showWatermark && !whiteLabel}
          onConfirm={trackConfirm}
          onUnconfirm={trackUnconfirm}
          onExport={trackExport}
          onCopyLink={trackCopy}
        />
      ) : null}
    </div>
  );
}
