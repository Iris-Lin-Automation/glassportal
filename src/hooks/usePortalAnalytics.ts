"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function getSessionId() {
  if (typeof window === "undefined") return "ssr";
  const key = "glassportal_session";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `s_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

async function postEvent(payload: Record<string, unknown>) {
  try {
    await fetch("/api/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    /* analytics must not break UX */
  }
}

function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node: HTMLElement | null = el;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const oy = style.overflowY;
    if (
      (oy === "auto" || oy === "scroll" || oy === "overlay") &&
      node.scrollHeight > node.clientHeight + 2
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

function computeProgress(scrollParent: HTMLElement | null): number {
  if (scrollParent) {
    const max = scrollParent.scrollHeight - scrollParent.clientHeight;
    if (max <= 0) return 0;
    return Math.max(0, Math.min(100, (scrollParent.scrollTop / max) * 100));
  }
  const el = document.scrollingElement || document.documentElement;
  const max = el.scrollHeight - window.innerHeight;
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (window.scrollY / max) * 100));
}

interface Options {
  pageId: string;
  token?: string;
  rootSelector?: string;
  headingSelector?: string;
}

/** Lightweight engagement tracking via IntersectionObserver + heartbeat pings. */
export function usePortalAnalytics({
  pageId,
  token,
  rootSelector = "#portal-export-root",
  headingSelector = "article h2, article h3, article h4",
}: Options) {
  const [progress, setProgress] = useState(0);
  const [activeSection, setActiveSection] = useState("");
  const sessionId = useRef("");
  const progressRef = useRef(0);
  const lastProgressSync = useRef(0);
  const seenSections = useRef(new Set<string>());

  const emit = useCallback(
    (type: string, extra: Record<string, unknown> = {}, syncNotion = false) => {
      void postEvent({
        type,
        pageId,
        sessionId: sessionId.current,
        token,
        syncNotion,
        ts: Date.now(),
        ...extra,
      });
    },
    [pageId, token]
  );

  useEffect(() => {
    sessionId.current = getSessionId();
    emit("page_view", { progress: 0 });
  }, [emit]);

  useEffect(() => {
    const root = document.querySelector(rootSelector) as HTMLElement | null;
    let scrollParent = findScrollParent(root);

    const calc = () => {
      // Re-detect in case layout changed
      scrollParent = findScrollParent(root);
      const pct = computeProgress(scrollParent);
      progressRef.current = pct;
      setProgress(pct);

      if (pct >= 95 && lastProgressSync.current < 95) {
        lastProgressSync.current = pct;
        emit("progress", { progress: pct }, true);
      } else if (Math.abs(pct - lastProgressSync.current) >= 15) {
        lastProgressSync.current = pct;
        emit("progress", { progress: pct }, false);
      }
    };

    // Delay first calc until layout paints
    const raf = window.requestAnimationFrame(calc);
    const t = window.setTimeout(calc, 120);

    const onScroll = () => calc();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });

    // Also bind to nested preview scroller if present
    const nested = findScrollParent(root);
    nested?.addEventListener("scroll", onScroll, { passive: true });

    const heartbeat = window.setInterval(() => {
      emit("heartbeat", { progress: progressRef.current });
    }, 15000);

    const ro =
      typeof ResizeObserver !== "undefined" && root
        ? new ResizeObserver(() => calc())
        : null;
    if (root && ro) ro.observe(root);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, true);
      nested?.removeEventListener("scroll", onScroll);
      window.clearInterval(heartbeat);
      ro?.disconnect();
    };
  }, [emit, rootSelector]);

  useEffect(() => {
    const headings = Array.from(
      document.querySelectorAll(headingSelector)
    ) as HTMLElement[];
    headings.forEach((h, i) => {
      if (!h.dataset.trackId) h.dataset.trackId = `sec-${i}`;
    });
    if (!headings.length) return;

    const root = document.querySelector(rootSelector) as HTMLElement | null;
    const scrollRoot = findScrollParent(root);

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const id = el.dataset.trackId || el.id || el.textContent || "section";
          const title = (el.textContent || "").trim();
          setActiveSection(title);
          if (!seenSections.current.has(id)) {
            seenSections.current.add(id);
            emit("section_view", {
              sectionId: id,
              sectionTitle: title,
              progress: progressRef.current,
            });
          }
        }
      },
      {
        root: scrollRoot,
        rootMargin: "-15% 0px -60% 0px",
        threshold: [0, 0.25, 0.5],
      }
    );

    headings.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [emit, headingSelector, pageId, rootSelector]);

  const syncAction = useCallback(
    async (action: "confirm" | "unconfirm") => {
      emit(action, { progress: progressRef.current }, true);
      if (!token) return;
      const res = await fetch(`/api/portal/${encodeURIComponent(pageId)}/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-notion-token": token,
        },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Notion sync failed");
      }
    },
    [emit, pageId, token]
  );

  const trackConfirm = useCallback(
    () => syncAction("confirm"),
    [syncAction]
  );

  const trackUnconfirm = useCallback(
    () => syncAction("unconfirm"),
    [syncAction]
  );

  const trackExport = useCallback(() => {
    emit("export", { progress: progressRef.current });
  }, [emit]);

  const trackCopy = useCallback(() => {
    emit("copy_link", { progress: progressRef.current });
  }, [emit]);

  return {
    progress,
    activeSection,
    trackConfirm,
    trackUnconfirm,
    trackExport,
    trackCopy,
  };
}
