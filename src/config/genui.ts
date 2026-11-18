/** Generative UI Playground — model, styles, limits, palettes */

export const GENUI_STYLES = [
  "minimal",
  "modern-saas",
  "editorial",
  "night-sky",
  "obsidian",
  "fintech",
] as const;
export type GenuiStyle = (typeof GENUI_STYLES)[number];

export const GENUI_STYLE_LABELS: Record<GenuiStyle, string> = {
  minimal: "Minimal",
  "modern-saas": "Modern SaaS",
  editorial: "Editorial",
  "night-sky": "Night Sky",
  obsidian: "Obsidian",
  fintech: "Fintech",
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
    background: "#F6F7FB",
    card: "#FFFFFF",
    table: "#F1F5F9",
    text: "#0F172A",
    muted: "#64748B",
    accent: "#7C3AED",
    border: "#E8EAF2",
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
  /** Dark product studio — ink + emerald/violet (Claude Design-like) */
  "night-sky": {
    background: "#05070D",
    card: "#0F141C",
    table: "#0A0E16",
    text: "#E6E8EC",
    muted: "#94A3B8",
    accent: "#22D3A1",
    border: "#1E2633",
  },
  /** Cinematic agency — matte ink + electric cyan (Obsidian / Lokuma-like) */
  obsidian: {
    background: "#050505",
    card: "#111111",
    table: "#0A0A0A",
    text: "#F5F5F5",
    muted: "#A1A1AA",
    accent: "#22D3EE",
    border: "#27272A",
  },
  /** Bright fintech dashboard — white + violet (CryptoHub-like) */
  fintech: {
    background: "#F8F7FC",
    card: "#FFFFFF",
    table: "#F3F0FA",
    text: "#0F172A",
    muted: "#6B7280",
    accent: "#8B5CF6",
    border: "#E9E4F5",
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

export function isDarkGenuiStyle(style: GenuiStyle) {
  return style === "night-sky" || style === "obsidian";
}
