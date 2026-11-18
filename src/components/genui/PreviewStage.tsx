"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  GENUI_VIEWPORT_SIZE,
  type GenuiViewport,
} from "@/config/genui";
import { cn } from "@/lib/utils";

export type PreviewStageMetrics = {
  viewport: GenuiViewport;
  /** Visible stage box (after prompt panel reflow) */
  stageWidth: number;
  stageHeight: number;
  /** Logical artboard width the UI is laid out for */
  artboardWidth: number;
  artboardHeight: number;
  scale: number;
};

/**
 * Device-accurate preview stage.
 * - Always ResizeObserver-driven so prompt panel open/close reflows correctly.
 * - desktop: fill measured stage width (artboardWidth === stageWidth)
 * - tablet / mobile: fixed logical size, scaled to fit
 */
export function PreviewStage({
  viewport,
  children,
  className,
  onMetrics,
}: {
  viewport: GenuiViewport;
  children: ReactNode;
  className?: string;
  onMetrics?: (m: PreviewStageMetrics) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [stageSize, setStageSize] = useState({ w: 1280, h: 800 });
  const device = GENUI_VIEWPORT_SIZE[viewport];

  const publish = (next: {
    scale: number;
    stageW: number;
    stageH: number;
    artboardW: number;
    artboardH: number;
  }) => {
    onMetrics?.({
      viewport,
      stageWidth: next.stageW,
      stageHeight: next.stageH,
      artboardWidth: next.artboardW,
      artboardHeight: next.artboardH,
      scale: next.scale,
    });
  };

  const measure = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const stageW = Math.max(stage.clientWidth, 1);
    const stageH = Math.max(stage.clientHeight, 1);
    setStageSize({ w: stageW, h: stageH });

    if (viewport === "desktop") {
      setScale(1);
      publish({
        scale: 1,
        stageW,
        stageH,
        artboardW: stageW,
        artboardH: stageH,
      });
      return;
    }

    const pad = 28;
    const availW = Math.max(stageW - pad * 2, 80);
    const availH = Math.max(stageH - pad * 2, 80);
    const next = Math.min(availW / device.width, availH / device.height, 1);
    const safe = Number.isFinite(next) && next > 0 ? next : 1;
    setScale(safe);
    publish({
      scale: safe,
      stageW,
      stageH,
      artboardW: device.width,
      artboardH: device.height,
    });
  };

  useLayoutEffect(() => {
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(stage);
    // Also observe parent — prompt panel flex reflow changes section size
    if (stage.parentElement) ro.observe(stage.parentElement);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport]);

  // Desktop: theme fills the measured stage — width tracks panel open/close
  if (viewport === "desktop") {
    return (
      <div
        ref={stageRef}
        className={cn(
          "relative h-full min-h-full w-full overflow-auto",
          className
        )}
        data-genui-stage="desktop"
        data-genui-artboard-width={Math.round(stageSize.w)}
      >
        <div
          className="flex min-h-full w-full flex-col [&>*]:min-h-full [&>*]:flex-1"
          style={{
            width: "100%",
            minWidth: 0,
            maxWidth: "100%",
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  const scaledW = device.width * scale;
  const scaledH = device.height * scale;
  const isPhone = viewport === "mobile";

  return (
    <div
      ref={stageRef}
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden bg-slate-100",
        className
      )}
      data-genui-stage={viewport}
      data-genui-artboard-width={device.width}
    >
      <div
        className="relative shrink-0 transition-[width,height] duration-300 ease-out"
        style={{ width: scaledW, height: scaledH }}
      >
        <div
          className={cn(
            "absolute left-0 top-0 origin-top-left overflow-hidden bg-black shadow-[0_24px_64px_rgba(15,23,42,0.28)]",
            isPhone
              ? "rounded-[2rem] border-[10px] border-slate-900"
              : "rounded-2xl border-[8px] border-slate-800"
          )}
          style={{
            width: device.width,
            height: device.height,
            transform: `scale(${scale})`,
          }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-1.5">
            {isPhone ? (
              <span className="h-4 w-24 rounded-full bg-black/80" />
            ) : (
              <span className="text-[9px] font-medium uppercase tracking-wide text-white/40">
                {device.label} · {Math.round(scale * 100)}% · {device.width}px
              </span>
            )}
          </div>
          <div
            className="h-full w-full overflow-y-auto overflow-x-hidden"
            style={{ width: device.width, height: device.height }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Collect overflow / clipping signals from the live preview DOM. */
export function collectBrowserFindings(opts: {
  root: ParentNode | null;
  viewport: GenuiViewport;
  stageWidth: number;
  stageHeight: number;
}): {
  viewport: string;
  containerWidth: number;
  containerHeight: number;
  overflowNodeIds: string[];
  clippedNodeIds: string[];
  notes: string[];
} {
  const overflowNodeIds: string[] = [];
  const clippedNodeIds: string[] = [];
  const notes: string[] = [];
  if (!opts.root) {
    return {
      viewport: opts.viewport,
      containerWidth: opts.stageWidth,
      containerHeight: opts.stageHeight,
      overflowNodeIds,
      clippedNodeIds,
      notes: ["Preview root not mounted — browser check skipped."],
    };
  }

  const nodes = opts.root.querySelectorAll<HTMLElement>("[data-genui-id]");
  nodes.forEach((el) => {
    const id = el.getAttribute("data-genui-id") || "";
    if (!id) return;
    const overflows =
      el.scrollWidth > el.clientWidth + 2 ||
      el.scrollHeight > el.clientHeight + 4;
    if (overflows) overflowNodeIds.push(id);

    const style = window.getComputedStyle(el);
    if (
      (style.overflow === "hidden" ||
        style.overflowX === "hidden" ||
        style.overflowY === "hidden") &&
      (el.scrollWidth > el.clientWidth + 4 ||
        el.scrollHeight > el.clientHeight + 4)
    ) {
      clippedNodeIds.push(id);
    }
  });

  // Heading truncation heuristic
  opts.root.querySelectorAll<HTMLElement>("h1, h2").forEach((el) => {
    if (el.scrollWidth > el.clientWidth + 2) {
      const id =
        el.closest("[data-genui-id]")?.getAttribute("data-genui-id") ||
        "heading";
      if (!clippedNodeIds.includes(id)) clippedNodeIds.push(id);
      notes.push("Heading text appears truncated/clipped in the current artboard.");
    }
  });

  return {
    viewport: opts.viewport,
    containerWidth: opts.stageWidth,
    containerHeight: opts.stageHeight,
    overflowNodeIds: overflowNodeIds.slice(0, 20),
    clippedNodeIds: clippedNodeIds.slice(0, 20),
    notes: notes.slice(0, 6),
  };
}
