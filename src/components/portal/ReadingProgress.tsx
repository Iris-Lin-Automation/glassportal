"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

interface ReadingProgressProps {
  progress: number;
  activeSection?: string;
  documentTitle?: string;
  brandColor?: string;
  logoUrl?: string;
  /**
   * true  → fixed to the browser viewport (public /p/[id] portal)
   * false → fixed to the Live Preview scroll pane (Studio)
   * NEVER demote this to a non-pinned in-flow bar.
   */
  pinToViewport?: boolean;
  /** Theme-driven chrome classes for the bar shell */
  barClassName?: string;
  mutedTextClassName?: string;
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

function Bar({
  progress,
  label,
  className,
  style,
  brandColor = "#0F172A",
  logoUrl,
  mutedTextClassName = "text-slate-500",
}: {
  progress: number;
  label: string;
  className: string;
  style?: CSSProperties;
  brandColor?: string;
  logoUrl?: string;
  mutedTextClassName?: string;
}) {
  const showLogo =
    !!logoUrl &&
    (logoUrl.startsWith("data:") ||
      logoUrl.startsWith("http") ||
      logoUrl.startsWith("/"));

  return (
    <div className={className} style={style} data-reading-progress="1">
      <div className="h-1 w-full bg-black/5">
        <div
          className="h-full transition-[width] duration-150 ease-out"
          style={{
            width: `${Math.min(100, Math.max(0, progress))}%`,
            backgroundColor: brandColor,
          }}
        />
      </div>
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-6 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {showLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="h-5 w-5 shrink-0 rounded object-contain"
            />
          ) : null}
          <p className={`truncate text-[11px] font-medium ${mutedTextClassName}`}>
            {label}
          </p>
        </div>
        <p
          className="shrink-0 text-[11px] font-semibold tabular-nums"
          style={{ color: brandColor }}
        >
          {Math.round(progress)}%
        </p>
      </div>
    </div>
  );
}

/**
 * Reading progress bar — ALWAYS pinned while scrolling.
 * Public portal: fixed to viewport via portal.
 * Studio preview: fixed to the preview scroll pane edges (survives overflow:hidden ancestors).
 */
export function ReadingProgress({
  progress,
  activeSection,
  documentTitle,
  brandColor = "#0F172A",
  logoUrl,
  pinToViewport = true,
  barClassName = "border-slate-200 bg-white/95",
  mutedTextClassName = "text-slate-500",
}: ReadingProgressProps) {
  const [mounted, setMounted] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [paneStyle, setPaneStyle] = useState<CSSProperties | null>(null);

  useEffect(() => setMounted(true), []);

  // Studio: pin to the Live Preview scroll container, not document flow
  useLayoutEffect(() => {
    if (pinToViewport) return;

    const sync = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const pane = findScrollParent(anchor);
      if (!pane) {
        setPaneStyle({
          position: "sticky",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          width: "100%",
        });
        return;
      }
      const rect = pane.getBoundingClientRect();
      setPaneStyle({
        position: "fixed",
        top: Math.max(0, rect.top),
        left: rect.left,
        width: rect.width,
        zIndex: 45,
      });
    };

    sync();
    const pane = findScrollParent(anchorRef.current);
    pane?.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    const ro =
      typeof ResizeObserver !== "undefined" && pane
        ? new ResizeObserver(sync)
        : null;
    if (pane && ro) ro.observe(pane);

    return () => {
      pane?.removeEventListener("scroll", sync);
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      ro?.disconnect();
    };
  }, [pinToViewport, mounted]);

  const label = activeSection
    ? `Reading · ${activeSection}`
    : documentTitle
      ? `Reading · ${documentTitle}`
      : "Chapter progress tracking";

  const shell = `border-b shadow-sm backdrop-blur-md ${barClassName}`;

  // Invisible anchor keeps us in the portal tree so we can find the scroll parent
  const anchor = (
    <div
      ref={anchorRef}
      className="h-11 shrink-0"
      aria-hidden
      data-reading-progress-anchor="1"
    />
  );

  if (!pinToViewport) {
    return (
      <>
        {anchor}
        {mounted && paneStyle
          ? createPortal(
              <Bar
                progress={progress}
                label={label}
                brandColor={brandColor}
                logoUrl={logoUrl}
                mutedTextClassName={mutedTextClassName}
                className={shell}
                style={paneStyle}
              />,
              document.body
            )
          : null}
      </>
    );
  }

  // Public portal: fixed to the browser viewport
  return (
    <>
      {anchor}
      {mounted
        ? createPortal(
            <Bar
              progress={progress}
              label={label}
              brandColor={brandColor}
              logoUrl={logoUrl}
              mutedTextClassName={mutedTextClassName}
              className={`fixed inset-x-0 top-0 z-[190] ${shell}`}
            />,
            document.body
          )
        : null}
    </>
  );
}
