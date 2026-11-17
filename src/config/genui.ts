/** Generative UI Playground — model, styles, limits, palettes */

export const GENUI_STYLES = [
  "minimal",
  "modern-saas",
  "editorial",
  "night-sky",
] as const;
export type GenuiStyle = (typeof GENUI_STYLES)[number];

export const GENUI_STYLE_LABELS: Record<GenuiStyle, string> = {
  minimal: "Minimal",
  "modern-saas": "Modern SaaS",
  editorial: "Editorial",
  "night-sky": "Night Sky",
};

/** Separately tunable surface colors (bg / card / table). */
export type GenuiPalette = {
  background: string;
  card: string;
  table: string;
  text: string;
  muted: string;
  accent: string;
  border: string;
};

export const GENUI_PALETTE_DEFAULTS: Record<GenuiStyle, GenuiPalette> = {
  minimal: {
    background: "#FFFFFF",
    card: "#FFFFFF",
    table: "#F8FAFC",
    text: "#0F172A",
    muted: "#64748B",
    accent: "#0F172A",
    border: "#E2E8F0",
  },
  "modern-saas": {
    background: "#F8FAFC",
    card: "#FFFFFF",
    table: "#F1F5F9",
    text: "#0F172A",
    muted: "#64748B",
    accent: "#4F46E5",
    border: "#E2E8F0",
  },
  editorial: {
    background: "#FAF7F2",
    card: "#FFFFFF",
    table: "#F3EFE8",
    text: "#1C1917",
    muted: "#78716C",
    accent: "#1C1917",
    border: "#E7E5E4",
  },
  "night-sky": {
    background: "#070B1A",
    card: "#121A2F",
    table: "#0C1224",
    text: "#E8EEFF",
    muted: "#8B9BB8",
    accent: "#22D3EE",
    border: "#2A3A5C",
  },
};

export const GENUI_VIEWPORTS = ["desktop", "tablet", "mobile"] as const;
export type GenuiViewport = (typeof GENUI_VIEWPORTS)[number];

/** Logical device artboard sizes used for responsive preview (not browser CSS breakpoints). */
export const GENUI_VIEWPORT_SIZE: Record<
  GenuiViewport,
  { width: number; height: number; label: string }
> = {
  desktop: { width: 1280, height: 800, label: "Desktop" },
  // Landscape tablet — matches how dashboards are usually previewed
  tablet: { width: 1024, height: 768, label: "Tablet" },
  mobile: { width: 390, height: 844, label: "Mobile" },
};

export function getGenuiModel() {
  return (process.env.GENUI_MODEL || "openai/gpt-oss-20b").trim();
}

export function getOpenAiBaseUrl() {
  return (
    process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
  ).replace(/\/$/, "");
}

export const GENUI_MAX_SCHEMA_DEPTH = 8;
export const GENUI_MAX_NODES = 80;
export const GENUI_RUN_INDEX_LIMIT = 100;
