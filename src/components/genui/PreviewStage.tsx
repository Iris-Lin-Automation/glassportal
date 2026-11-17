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

/**
 * Full-bleed preview: renders at device width, then scales to FIT the
 * available stage so users see the whole UI without nested scrolling.
 */
export function PreviewStage({
  viewport,
  children,
  className,
}: {
  viewport: GenuiViewport;
  children: ReactNode;
  className?: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentH, setContentH] = useState(600);
  const artboardW = GENUI_VIEWPORT_SIZE[viewport].width;

  const measure = () => {
    const stage = stageRef.current;
    const content = contentRef.current;
    if (!stage || !content) return;

    const pad = 24;
    const availW = Math.max(stage.clientWidth - pad * 2, 120);
    const availH = Math.max(stage.clientHeight - pad * 2, 120);
    const naturalH = Math.max(content.scrollHeight, 400);
    setContentH(naturalH);

    const s = Math.min(availW / artboardW, availH / naturalH, 1);
    setScale(Number.isFinite(s) && s > 0 ? s : 1);
  };

  useLayoutEffect(() => {
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport, children]);

  useEffect(() => {
    const stage = stageRef.current;
    const content = contentRef.current;
    if (!stage) return;

    const ro = new ResizeObserver(() => measure());
    ro.observe(stage);
    if (content) ro.observe(content);

    const t = window.setTimeout(measure, 80);
    const t2 = window.setTimeout(measure, 320);
    return () => {
      ro.disconnect();
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport, children]);

  const scaledW = artboardW * scale;
  const scaledH = contentH * scale;

  return (
    <div
      ref={stageRef}
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden",
        className
      )}
    >
      <div
        className="relative shrink-0 transition-[width,height] duration-300 ease-out"
        style={{ width: scaledW, height: scaledH }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left overflow-hidden rounded-xl border border-slate-700/40 bg-white shadow-[0_24px_64px_rgba(0,0,0,0.35)]"
          style={{
            width: artboardW,
            transform: `scale(${scale})`,
          }}
        >
          <div className="flex items-center gap-1.5 border-b border-black/5 bg-slate-100/90 px-2.5 py-1">
            <span className="h-2 w-2 rounded-full bg-[#FF5F57]" />
            <span className="h-2 w-2 rounded-full bg-[#FEBC2E]" />
            <span className="h-2 w-2 rounded-full bg-[#28C840]" />
            <span className="ml-1.5 text-[9px] font-medium uppercase tracking-wide text-slate-400">
              {GENUI_VIEWPORT_SIZE[viewport].label} · fit {Math.round(scale * 100)}%
            </span>
          </div>
          <div ref={contentRef}>{children}</div>
        </div>
      </div>
    </div>
  );
}
