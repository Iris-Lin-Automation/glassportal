"use client";

import { useEffect, useRef, useState } from "react";

interface NotionImageProps {
  blockId: string;
  url?: string;
  caption?: string;
  token?: string;
  /** Cache-bust when Notion *content* is re-fetched (not theme / branding). */
  rev?: string | number;
}

function isNotionSignedUrl(url?: string) {
  if (!url) return false;
  return (
    /amazonaws\.com/i.test(url) ||
    /secure\.notion-static\.com/i.test(url) ||
    /prod-files-secure/i.test(url) ||
    /notion\.so\/image/i.test(url) ||
    /notion-static\.com/i.test(url)
  );
}

function isExternalHttp(url?: string) {
  if (!url) return false;
  return /^https?:\/\//i.test(url) && !isNotionSignedUrl(url);
}

/** Keep decoded images across theme toggles / remounts. */
const imageCache = new Map<string, { src: string; rev: string }>();

function cacheKey(blockId: string, token?: string) {
  return `${blockId}::${token?.trim() || ""}`;
}

/**
 * Notion images via same-origin proxy.
 * Stale-while-revalidate: theme changes never blank a loaded image.
 */
export function NotionImage({
  blockId,
  url,
  caption,
  token,
  rev,
}: NotionImageProps) {
  const cleanToken = token?.trim() || "";
  const key = cacheKey(blockId, cleanToken);
  const revKey = String(rev ?? "");
  const cached = imageCache.get(key);

  const [src, setSrc] = useState(cached?.src || "");
  const [failed, setFailed] = useState(false);
  const [detail, setDetail] = useState("");
  const loadedRef = useRef(cached?.src || "");

  useEffect(() => {
    let cancelled = false;

    if (isExternalHttp(url)) {
      loadedRef.current = url!;
      setSrc(url!);
      setFailed(false);
      setDetail("");
      return;
    }

    const hit = imageCache.get(key);
    // Same block + same content rev → keep pixels, zero network (theme toggles)
    if (hit?.src && hit.rev === revKey) {
      loadedRef.current = hit.src;
      setSrc(hit.src);
      setFailed(false);
      return;
    }

    // Different rev (or first load) but we already show something — keep it visible
    if (hit?.src) {
      loadedRef.current = hit.src;
      setSrc(hit.src);
      setFailed(false);
    }

    async function loadViaProxy(attempt: number): Promise<string | null> {
      if (!blockId) return null;

      const params = new URLSearchParams({ blockId });
      if (revKey) params.set("v", revKey);
      params.set("_", String(attempt));
      if (cleanToken) params.set("nt", cleanToken);

      const res = await fetch(`/api/media/notion?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: cleanToken ? { "x-notion-token": cleanToken } : undefined,
      });

      if (!res.ok) {
        let message = `Proxy ${res.status}`;
        try {
          const json = (await res.json()) as { error?: string };
          if (json.error) message = json.error;
        } catch {
          /* ignore */
        }
        if (!cancelled) setDetail(message);
        return null;
      }

      const blob = await res.blob();
      if (!blob.size) {
        if (!cancelled) setDetail("Empty image from proxy");
        return null;
      }
      return URL.createObjectURL(blob);
    }

    async function run() {
      if (!blockId) {
        if (url && /^https?:\/\//i.test(url)) {
          loadedRef.current = url;
          setSrc(url);
          setFailed(false);
        } else {
          setFailed(true);
        }
        return;
      }

      // Skip fetch entirely when cache already matches this content revision
      if (hit?.src && hit.rev === revKey) return;

      const next = (await loadViaProxy(0)) || (await loadViaProxy(1));
      if (cancelled) {
        if (next) URL.revokeObjectURL(next);
        return;
      }

      if (next) {
        const prev = imageCache.get(key)?.src;
        imageCache.set(key, { src: next, rev: revKey });
        loadedRef.current = next;
        setSrc(next);
        setFailed(false);
        setDetail("");
        if (prev && prev !== next && prev.startsWith("blob:")) {
          URL.revokeObjectURL(prev);
        }
        return;
      }

      // Soft-fail: keep whatever is on screen
      if (!loadedRef.current) {
        if (url && /^https?:\/\//i.test(url)) {
          loadedRef.current = url;
          setSrc(url);
          setFailed(false);
        } else {
          setFailed(true);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
      // Never revoke on cleanup — theme re-renders would erase the visible image.
    };
    // Note: ephemeral Notion signed `url` is intentionally not a reload trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- url only used as last-resort fallback
  }, [blockId, cleanToken, key, revKey]);

  if (failed && !src) {
    return (
      <div className="my-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-medium">Image could not be loaded.</p>
        <p className="mt-1 text-amber-800/90">
          The portal refreshes Notion file links via proxy — confirm your
          Integration can access this page, then wait for Auto-Sync or
          republish.
        </p>
        {detail ? (
          <p className="mt-2 font-mono text-[11px] text-amber-700/80">{detail}</p>
        ) : null}
      </div>
    );
  }

  if (!src) {
    return (
      <div className="my-6 h-40 w-full animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
    );
  }

  return (
    <figure className="my-6 w-full max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={caption || "Notion image"}
        className="mx-auto h-auto max-h-[560px] w-full max-w-full object-contain bg-slate-50"
        loading="eager"
        referrerPolicy="no-referrer"
        onError={() => {
          const cur = imageCache.get(key)?.src;
          if (cur?.startsWith("blob:")) URL.revokeObjectURL(cur);
          imageCache.delete(key);
          loadedRef.current = "";
          setSrc("");
          setFailed(true);
          setDetail((d) => d || "Browser failed to decode image bytes");
        }}
      />
      {caption ? (
        <figcaption className="border-t border-slate-100 px-4 py-2.5 text-center text-sm text-slate-500">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
