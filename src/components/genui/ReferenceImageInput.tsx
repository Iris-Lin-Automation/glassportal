"use client";

import { useRef } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import {
  GENUI_MAX_REFERENCE_BYTES,
  GENUI_MAX_REFERENCE_IMAGES,
} from "@/config/genui";
import {
  REFERENCE_MODE_LABELS,
  REFERENCE_MODES,
  type ReferenceImageInput,
  type ReferenceMode,
} from "@/lib/genui/types";
import { cn } from "@/lib/utils";
import { makeId } from "@/lib/genui/ids";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

/** Optional reference screenshots for Style / Layout / Component / Full mode. */
export function ReferenceImageInput({
  images,
  mode,
  onImagesChange,
  onModeChange,
  visionHint,
}: {
  images: ReferenceImageInput[];
  mode: ReferenceMode;
  onImagesChange: (next: ReferenceImageInput[]) => void;
  onModeChange: (mode: ReferenceMode) => void;
  visionHint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = async (files: FileList | null) => {
    if (!files?.length) return;
    const next = [...images];
    for (const file of Array.from(files)) {
      if (next.length >= GENUI_MAX_REFERENCE_IMAGES) break;
      if (!file.type.startsWith("image/")) continue;
      if (file.size > GENUI_MAX_REFERENCE_BYTES) continue;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        if (!dataUrl.startsWith("data:image/")) continue;
        if (dataUrl.length > GENUI_MAX_REFERENCE_BYTES) continue;
        next.push({
          id: makeId("ref"),
          dataUrl,
          name: file.name,
          mimeType: file.type,
        });
      } catch {
        /* skip */
      }
    }
    onImagesChange(next);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Reference images
        </p>
        <span className="text-[10px] text-slate-400">
          {images.length}/{GENUI_MAX_REFERENCE_IMAGES}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {REFERENCE_MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            className={cn(
              "rounded-md border px-2 py-1 text-[10px] font-semibold transition",
              mode === m
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {REFERENCE_MODE_LABELS[m]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {images.map((img) => (
          <div
            key={img.id}
            className="group relative h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.dataUrl}
              alt={img.name || "Reference"}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() =>
                onImagesChange(images.filter((x) => x.id !== img.id))
              }
              className="absolute inset-0 flex items-center justify-center bg-slate-900/55 opacity-0 transition group-hover:opacity-100"
              title="Remove"
            >
              <Trash2 className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        ))}
        {images.length < GENUI_MAX_REFERENCE_IMAGES ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-slate-300 bg-white text-slate-500 hover:border-slate-400 hover:bg-slate-50"
          >
            <ImagePlus className="h-4 w-4" />
            <span className="text-[9px] font-semibold">Add</span>
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => void onPick(e.target.files)}
      />

      {visionHint ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] leading-relaxed text-amber-800">
          {visionHint}
        </p>
      ) : (
        <p className="text-[10px] leading-relaxed text-slate-400">
          Optional UI screenshots. Vision models extract palette, type, spacing,
          layout, and components. Without a vision model, images are kept but
          not pretended to be understood.
        </p>
      )}
    </div>
  );
}
