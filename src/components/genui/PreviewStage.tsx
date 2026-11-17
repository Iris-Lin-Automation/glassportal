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
 * Device-accurate preview stage.
 * - desktop: generated UI fills the stage edge-to-edge (the theme IS the screen)
 * - tablet / mobile: fixed device aspect, content clipped inside, scaled to fit
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
  const [scale, setScale] = useState(1);
  const device = GENUI_VIEWPORT_SIZE[viewport];

  const measure = () => {
    const stage = stageRef.current;
    if (!stage) return;
    if (viewport === "desktop") {
      setScale(1);
      return;
    }
    const pad = 28;
    const availW = Math.max(stage.clientWidth - pad * 2, 80);
    const availH = Math.max(stage.clientHeight - pad * 2, 80);
    const next = Math.min(availW / device.width, availH / device.height, 1);
    setScale(Number.isFinite(next) && next > 0 ? next : 1);
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
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport]);

  // Desktop: theme fills the entire stage — no floating card / letterbox
  if (viewport === "desktop") {
    return (
      <div
        ref={stageRef}
        className={cn(
          "relative h-full min-h-full w-full overflow-auto",
          className
        )}
      >
        <div className="flex min-h-full w-full flex-col [&>*]:min-h-full [&>*]:flex-1">
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
    >
      <div
        className="relative shrink-0 transition-[width,height] duration-300 ease-out"
        style={{ width: scaledW, height: scaledH }}
      >
        <div
          className={cn(
            "absolute left-0 top-0 origin-top-left overflow-hidden bg-black shadow-[0_24px_64px_rgba(15,23,42,0.28)]",
            isPhone ? "rounded-[2rem] border-[10px] border-slate-900" : "rounded-2xl border-[8px] border-slate-800"
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
                {device.label} · {Math.round(scale * 100)}%
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
