"use client";

import { useRef, useState } from "react";
import type { GenuiAnnotateTarget } from "@/components/genui/UiSchemaRenderer";
import { cn } from "@/lib/utils";

export type MarkStroke = {
  id: string;
  /** SVG path in overlay-local coords */
  path: string;
  /** Bounding box of the stroke */
  box: { x: number; y: number; w: number; h: number };
};

function pointsToPath(pts: Array<{ x: number; y: number }>) {
  if (pts.length === 0) return "";
  return pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
}

function bounds(pts: Array<{ x: number; y: number }>) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  if (!Number.isFinite(minX)) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }
  const pad = 8;
  return {
    x: minX - pad,
    y: minY - pad,
    w: Math.max(maxX - minX + pad * 2, 24),
    h: Math.max(maxY - minY + pad * 2, 24),
  };
}

function hitTestNodes(
  overlay: HTMLElement,
  box: { x: number; y: number; w: number; h: number }
): GenuiAnnotateTarget[] {
  const root = overlay.parentElement;
  if (!root) return [];
  const overlayRect = overlay.getBoundingClientRect();
  const abs = {
    left: overlayRect.left + box.x,
    top: overlayRect.top + box.y,
    right: overlayRect.left + box.x + box.w,
    bottom: overlayRect.top + box.y + box.h,
  };

  const nodes = Array.from(
    root.querySelectorAll<HTMLElement>("[data-genui-id]")
  );
  const hits: GenuiAnnotateTarget[] = [];
  for (const el of nodes) {
    if (getComputedStyle(el).display === "contents") continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const overlap =
      r.left < abs.right &&
      r.right > abs.left &&
      r.top < abs.bottom &&
      r.bottom > abs.top;
    if (!overlap) continue;
    // Prefer smaller / more specific nodes over page wrappers
    const area = r.width * r.height;
    hits.push({
      nodeId: el.dataset.genuiId || "",
      nodeType: el.dataset.genuiType || "block",
      label: el.dataset.genuiLabel || el.dataset.genuiType || "block",
      // stash area for sort via label? use separate
      ...( { _area: area } as object),
    });
  }

  hits.sort((a, b) => {
    const aa = (a as { _area?: number })._area || 0;
    const bb = (b as { _area?: number })._area || 0;
    return aa - bb;
  });

  // Drop page / huge wrappers if we have tighter hits
  const filtered = hits.filter((h) => h.nodeType !== "page");
  const list = (filtered.length ? filtered : hits).slice(0, 4);
  return list.map(({ nodeId, nodeType, label }) => ({
    nodeId,
    nodeType,
    label,
  }));
}

/**
 * Freehand circle/lasso overlay for human-in-the-loop marking.
 * Draw on preview → resolve nearby UI blocks → call onStrokeComplete.
 */
export function MarkOverlay({
  enabled,
  strokes,
  onStrokeComplete,
  className,
}: {
  enabled: boolean;
  strokes: MarkStroke[];
  onStrokeComplete: (stroke: MarkStroke, hits: GenuiAnnotateTarget[]) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState<Array<{ x: number; y: number }>>([]);
  const drawingRef = useRef(drawing);
  drawingRef.current = drawing;

  if (!enabled && strokes.length === 0) return null;

  const toLocal = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <div
      ref={ref}
      className={cn(
        "absolute inset-0 z-[15]",
        enabled ? "cursor-crosshair touch-none" : "pointer-events-none",
        className
      )}
      onPointerDown={(e) => {
        if (!enabled) return;
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setDrawing([toLocal(e)]);
      }}
      onPointerMove={(e) => {
        if (!enabled || drawingRef.current.length === 0) return;
        setDrawing((prev) => [...prev, toLocal(e)]);
      }}
      onPointerUp={(e) => {
        if (!enabled) return;
        const pts = [...drawingRef.current, toLocal(e)];
        setDrawing([]);
        if (pts.length < 3) return;
        const box = bounds(pts);
        if (box.w < 12 && box.h < 12) return;
        const stroke: MarkStroke = {
          id: `stroke_${Date.now()}`,
          path: pointsToPath(pts),
          box,
        };
        const hits = ref.current ? hitTestNodes(ref.current, box) : [];
        onStrokeComplete(stroke, hits);
      }}
      onPointerCancel={() => setDrawing([])}
    >
      <svg className="h-full w-full">
        {strokes.map((s) => (
          <g key={s.id}>
            <rect
              x={s.box.x}
              y={s.box.y}
              width={s.box.w}
              height={s.box.h}
              rx={10}
              fill="rgba(34,211,238,0.08)"
              stroke="rgba(34,211,238,0.85)"
              strokeWidth={2}
              strokeDasharray="6 4"
            />
            <path
              d={s.path}
              fill="none"
              stroke="rgba(34,211,238,0.95)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}
        {drawing.length > 1 ? (
          <path
            d={pointsToPath(drawing)}
            fill="none"
            stroke="rgba(34,211,238,1)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
      </svg>
    </div>
  );
}
