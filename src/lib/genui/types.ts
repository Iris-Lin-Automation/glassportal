import type { GenuiStyle } from "@/config/genui";

export type DesignIntent = {
  pageType: string;
  style: GenuiStyle;
  layout: string;
  components: string[];
  colorTone?: string;
  responsive?: string;
  audience?: string;
  rawSummary?: string;
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
  error?: string;
};

export type RunDetail = {
  run: GenerationRun;
  revisions: RevisionRecord[];
  current: RevisionRecord | null;
};
