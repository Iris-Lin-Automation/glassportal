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
 * Full-bleed preview: artboard scales to fill the stage (contain),
 * so the generated UI is visible at a glance without nested scrolling.
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
  const artboardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [natural, setNatural] = useState({ w: 1200, h: 800 });
  const artboardW = GENUI_VIEWPORT_SIZE[viewport].width;

  const measure = () => {
    const stage = stageRef.current;
    const board = artboardRef.current;
    if (!stage || !board) return;

    // Temporarily unscale to read true layout size
    const prev = board.style.transform;
    board.style.transform = "scale(1)";
    const natW = artboardW;
    const natH = Math.max(board.scrollHeight, board.offsetHeight, 480);
    board.style.transform = prev;

    const pad = 8;
    const availW = Math.max(stage.clientWidth - pad * 2, 80);
    const availH = Math.max(stage.clientHeight - pad * 2, 80);
    const next = Math.min(availW / natW, availH / natH);
    const s = Number.isFinite(next) && next > 0 ? next : 1;

    setNatural({ w: natW, h: natH });
    setScale(s);
  };

  useLayoutEffect(() => {
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport, children]);

  useEffect(() => {
    const stage = stageRef.current;
    const board = artboardRef.current;
    if (!stage || !board) return;

    const ro = new ResizeObserver(() => measure());
    ro.observe(stage);
    ro.observe(board);

    // Charts / fonts settle after first paint
    const timers = [50, 150, 400, 900, 1600].map((ms) =>
      window.setTimeout(measure, ms)
    );
    return () => {
      ro.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport, children]);

  return (
    <div
      ref={stageRef}
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden",
        className
      )}
    >
      <div
        className="relative shrink-0"
        style={{
          width: natural.w * scale,
          height: natural.h * scale,
        }}
      >
        <div
          ref={artboardRef}
          className="absolute left-0 top-0 origin-top-left overflow-visible rounded-lg border border-white/10 bg-[#0B0F17] shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
          style={{
            width: artboardW,
            transform: `scale(${scale})`,
          }}
        >
          <div className="pointer-events-none absolute left-2 top-1.5 z-10 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
            <span className="text-[8px] font-medium uppercase tracking-wider text-white/30">
              {GENUI_VIEWPORT_SIZE[viewport].label} · {Math.round(scale * 100)}%
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
