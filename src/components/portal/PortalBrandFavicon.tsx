"use client";

import { useEffect, useState } from "react";
import { BrandFavicon } from "@/components/portal/BrandFavicon";

/**
 * Loads saved branding logo by Notion page id and locks the tab favicon.
 * Mounted outside PasswordGate so the tab icon works before unlock.
 */
export function PortalBrandFavicon({ pageId }: { pageId: string }) {
  const [href, setHref] = useState<string>("");

  useEffect(() => {
    if (!pageId) return;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(
          `/api/branding/${encodeURIComponent(pageId)}?_=${Date.now()}`,
          { cache: "no-store" }
        );
        if (!res.ok || cancelled) return;
        const branding = (await res.json()) as {
          logoDataUrl?: string;
          updatedAt?: string;
        };
        if (!branding.logoDataUrl || cancelled) return;
        setHref(
          `/api/branding/${encodeURIComponent(pageId)}/logo?v=${encodeURIComponent(
            branding.updatedAt || String(Date.now())
          )}`
        );
      } catch {
        /* keep existing tab icon */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pageId]);

  if (!href) return null;
  return <BrandFavicon href={href} />;
}
