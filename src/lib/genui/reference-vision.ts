import {
  GENUI_MAX_REFERENCE_BYTES,
  GENUI_MAX_REFERENCE_IMAGES,
} from "@/config/genui";
import { chatJsonVision, supportsVisionModel } from "@/lib/genui/llm";
import { parseJsonObject } from "@/lib/genui/schema";
import type {
  ReferenceImageInput,
  ReferenceMode,
  VisualStyleAnalysis,
} from "@/lib/genui/types";

const VISION_SYSTEM = `You analyze UI reference screenshots for a Generative UI workbench.
Return ONLY JSON with keys:
colorPalette (string[] of hex or named colors),
typography (string),
spacingSystem (string),
layoutStructure (string),
componentHierarchy (string[]),
borderRadius (string),
visualDensity (string: sparse|comfortable|dense),
visualStyle (string),
notes (string).
Be concrete and visual. Do not invent components that are not visible.`;

function sanitizeDataUrl(url: string): string | null {
  const trimmed = (url || "").trim();
  if (!trimmed.startsWith("data:image/")) return null;
  if (trimmed.length > GENUI_MAX_REFERENCE_BYTES) return null;
  if (!/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function normalizeReferenceImages(
  input: unknown
): ReferenceImageInput[] {
  if (!Array.isArray(input)) return [];
  const out: ReferenceImageInput[] = [];
  for (const item of input.slice(0, GENUI_MAX_REFERENCE_IMAGES)) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const dataUrl = sanitizeDataUrl(String(o.dataUrl || ""));
    if (!dataUrl) continue;
    out.push({
      id: String(o.id || `ref_${out.length + 1}`).slice(0, 64),
      dataUrl,
      name: o.name ? String(o.name).slice(0, 120) : undefined,
      mimeType: o.mimeType ? String(o.mimeType).slice(0, 64) : undefined,
    });
  }
  return out;
}

/**
 * Extract visual tokens from reference images.
 * Honest: if vision is unavailable, returns source "unavailable" — never fakes analysis.
 */
export async function analyzeReferenceImages(opts: {
  images: ReferenceImageInput[];
  mode: ReferenceMode;
  prompt?: string;
}): Promise<{
  analysis: VisualStyleAnalysis;
  visionSupported: boolean;
  error?: string;
}> {
  if (!opts.images.length) {
    return {
      analysis: { source: "unavailable", notes: "No reference images provided." },
      visionSupported: supportsVisionModel(),
    };
  }

  if (!supportsVisionModel()) {
    return {
      analysis: {
        source: "unavailable",
        notes:
          "Reference images were uploaded, but the configured model does not support vision. Set GENUI_VISION_MODEL to a multimodal model (e.g. gpt-4o). Generation will continue from the text prompt only — images were NOT understood.",
      },
      visionSupported: false,
      error:
        "Vision model not configured. Images were ignored for understanding.",
    };
  }

  const modeHint =
    opts.mode === "style"
      ? "Focus on color, type, radius, density, and atmosphere."
      : opts.mode === "layout"
        ? "Focus on layout structure, grid, sidebar, and section order."
        : opts.mode === "component"
          ? "Focus on component hierarchy and which widgets appear."
          : "Capture style, layout, components, and overall visual system.";

  try {
    const content = [
      {
        type: "text" as const,
        text: `${modeHint}\nUser prompt context:\n${(opts.prompt || "").slice(0, 1200)}\nReference mode: ${opts.mode}`,
      },
      ...opts.images.map((img) => ({
        type: "image_url" as const,
        image_url: { url: img.dataUrl, detail: "low" as const },
      })),
    ];

    const result = await chatJsonVision([
      { role: "system", content: VISION_SYSTEM },
      { role: "user", content },
    ]);

    const json = parseJsonObject(result.content) as Record<string, unknown>;
    const analysis: VisualStyleAnalysis = {
      colorPalette: Array.isArray(json.colorPalette)
        ? json.colorPalette.map(String).slice(0, 12)
        : undefined,
      typography: json.typography ? String(json.typography).slice(0, 240) : undefined,
      spacingSystem: json.spacingSystem
        ? String(json.spacingSystem).slice(0, 240)
        : undefined,
      layoutStructure: json.layoutStructure
        ? String(json.layoutStructure).slice(0, 320)
        : undefined,
      componentHierarchy: Array.isArray(json.componentHierarchy)
        ? json.componentHierarchy.map(String).slice(0, 20)
        : undefined,
      borderRadius: json.borderRadius
        ? String(json.borderRadius).slice(0, 80)
        : undefined,
      visualDensity: json.visualDensity
        ? String(json.visualDensity).slice(0, 80)
        : undefined,
      visualStyle: json.visualStyle
        ? String(json.visualStyle).slice(0, 240)
        : undefined,
      notes: json.notes ? String(json.notes).slice(0, 400) : undefined,
      source: "vlm",
      model: result.model,
    };

    return { analysis, visionSupported: true };
  } catch (e) {
    return {
      analysis: {
        source: "unavailable",
        notes: `Vision request failed: ${
          e instanceof Error ? e.message : "unknown error"
        }. Images were not understood.`,
      },
      visionSupported: true,
      error: e instanceof Error ? e.message : "Vision analysis failed",
    };
  }
}
