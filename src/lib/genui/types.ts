import type { GenuiStyle } from "@/config/genui";

/** How a reference screenshot should influence generation. */
export type ReferenceMode =
  | "style"
  | "layout"
  | "component"
  | "full";

export const REFERENCE_MODES: ReferenceMode[] = [
  "style",
  "layout",
  "component",
  "full",
];

export const REFERENCE_MODE_LABELS: Record<ReferenceMode, string> = {
  style: "Style Reference",
  layout: "Layout Reference",
  component: "Component Reference",
  full: "Full Reference",
};

/** Structured visual tokens extracted from a reference image (VLM or heuristic). */
export type VisualStyleAnalysis = {
  colorPalette?: string[];
  typography?: string;
  spacingSystem?: string;
  layoutStructure?: string;
  componentHierarchy?: string[];
  borderRadius?: string;
  visualDensity?: string;
  visualStyle?: string;
  notes?: string;
  /** Honest provenance — never claim vision when unavailable */
  source: "vlm" | "unavailable" | "manual";
  model?: string;
};

export type ReferenceImageInput = {
  id: string;
  /** data:image/...;base64,... (client) or https URL */
  dataUrl: string;
  name?: string;
  mimeType?: string;
};

export type DesignIntent = {
  pageType: string;
  style: GenuiStyle;
  layout: string;
  /** Free-form component mentions from the prompt */
  components: string[];
  /**
   * Canonical required building blocks that MUST appear
   * (e.g. sidebar-layout, kpi-card, chart, table).
   */
  requiredComponents: string[];
  colorTone?: string;
  typography?: string;
  spacing?: string;
  hierarchy?: string;
  responsive?: string;
  audience?: string;
  rawSummary?: string;
  referenceMode?: ReferenceMode;
  visualAnalysis?: VisualStyleAnalysis;
};

export type UiNodeType =
  | "page"
  | "stack"
  | "row"
  | "grid"
  | "sidebar-layout"
  | "text"
  | "heading"
  | "button"
  | "card"
  | "kpi-card"
  | "badge"
  | "input"
  | "image"
  | "divider"
  | "nav"
  | "chart"
  | "table"
  | "list"
  | "spacer";

export type UiNode = {
  id: string;
  type: UiNodeType;
  props?: Record<string, unknown>;
  children?: UiNode[];
};

export type UiSchema = {
  version: 1;
  meta: {
    title: string;
    pageType?: string;
    style: GenuiStyle;
    description?: string;
  };
  root: UiNode;
};

export type GenerationStatus =
  | "draft"
  | "generated"
  | "evaluated"
  | "revised"
  | "failed";

export type GenerationRun = {
  id: string;
  createdAt: string;
  updatedAt: string;
  ownerKey: string;
  prompt: string;
  intent: DesignIntent;
  style: GenuiStyle;
  model: { provider: string; name: string; mode: "llm" | "fixture" };
  status: GenerationStatus;
  currentRevisionId: string;
  revisionIds: string[];
  error?: string;
};

/** Phase-2 acceptance dimensions (schema + optional browser + LLM/VLM). */
export type CritiqueDimension =
  | "requirementCoverage"
  | "componentCompleteness"
  | "layoutQuality"
  | "visualHierarchy"
  | "styleConsistency"
  | "responsiveBehavior";

export type CritiqueIssue = {
  dimension: CritiqueDimension;
  severity: "low" | "medium" | "high";
  message: string;
  suggestion: string;
  /** Which checker produced this finding */
  source?: CritiqueSourceTag;
};

export type CritiqueScores = Record<CritiqueDimension, number>;

export type CritiqueSourceTag =
  | "schema-rules"
  | "browser"
  | "llm"
  | "vlm";

export type BrowserCritiqueFindings = {
  viewport: string;
  containerWidth: number;
  containerHeight: number;
  overflowNodeIds: string[];
  clippedNodeIds: string[];
  notes?: string[];
};

export type CritiqueResult = {
  id: string;
  revisionId: string;
  createdAt: string;
  /**
   * Compact provenance label for UI/export.
   * Prefer `sources` for the precise checker mix.
   */
  source: "rules" | "rules+llm" | "rules+browser" | "rules+llm+browser" | "rules+vlm";
  /** Explicit checkers that contributed — never invent vision scores */
  sources: CritiqueSourceTag[];
  overall: number;
  scores: CritiqueScores;
  issues: CritiqueIssue[];
  summary: string;
  suggestRegenerate: boolean;
  model?: string;
  browserFindings?: BrowserCritiqueFindings;
};

export type RevisionRecord = {
  id: string;
  runId: string;
  parentRevisionId?: string;
  createdAt: string;
  source: "generate" | "revise" | "fixture";
  promptSnapshot: string;
  intentSnapshot: DesignIntent;
  schema: UiSchema;
  rawModelOutputHash?: string;
  tokenUsage?: { input: number; output: number };
  critique?: CritiqueResult;
  revisionNotes?: string;
  error?: string;
};

export type RunDetail = {
  run: GenerationRun;
  revisions: RevisionRecord[];
  current: RevisionRecord | null;
};
