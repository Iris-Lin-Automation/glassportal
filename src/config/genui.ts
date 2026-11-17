/** Generative UI Playground — model, styles, limits */

export const GENUI_STYLES = ["minimal", "modern-saas", "editorial"] as const;
export type GenuiStyle = (typeof GENUI_STYLES)[number];

export const GENUI_STYLE_LABELS: Record<GenuiStyle, string> = {
  minimal: "Minimal",
  "modern-saas": "Modern SaaS",
  editorial: "Editorial",
};

export const GENUI_VIEWPORTS = ["desktop", "tablet", "mobile"] as const;
export type GenuiViewport = (typeof GENUI_VIEWPORTS)[number];

export const GENUI_VIEWPORT_SIZE: Record<
  GenuiViewport,
  { width: number; label: string }
> = {
  desktop: { width: 1200, label: "Desktop" },
  tablet: { width: 768, label: "Tablet" },
  mobile: { width: 390, label: "Mobile" },
};

export function getGenuiModel() {
  return (process.env.GENUI_MODEL || "gpt-4o-mini").trim();
}

export function getOpenAiBaseUrl() {
  return (
    process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
  ).replace(/\/$/, "");
}

export const GENUI_MAX_SCHEMA_DEPTH = 8;
export const GENUI_MAX_NODES = 80;
export const GENUI_RUN_INDEX_LIMIT = 100;
