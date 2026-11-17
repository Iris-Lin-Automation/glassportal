import { z } from "zod";
import { GENUI_STYLES } from "@/config/genui";
import type { UiNode, UiSchema } from "@/lib/genui/types";

export const UiNodeTypeSchema = z.enum([
  "page",
  "stack",
  "row",
  "grid",
  "sidebar-layout",
  "text",
  "heading",
  "button",
  "card",
  "kpi-card",
  "badge",
  "input",
  "image",
  "divider",
  "nav",
  "chart",
  "table",
  "list",
  "spacer",
]);

export const DesignIntentSchema = z.object({
  pageType: z.string().min(1),
  style: z.enum(GENUI_STYLES),
  layout: z.string().min(1),
  components: z.array(z.string()).default([]),
  colorTone: z.string().optional(),
  responsive: z.string().optional(),
  audience: z.string().optional(),
  rawSummary: z.string().optional(),
});

const UiNodeSchema: z.ZodType<UiNode> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    type: UiNodeTypeSchema,
    props: z.record(z.unknown()).optional(),
    children: z.array(UiNodeSchema).optional(),
  })
);

export const UiSchemaSchema: z.ZodType<UiSchema> = z.object({
  version: z.literal(1),
  meta: z.object({
    title: z.string().min(1),
    pageType: z.string().optional(),
    style: z.enum(GENUI_STYLES),
    description: z.string().optional(),
  }),
  root: UiNodeSchema,
});

export function parseJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  // Strip markdown fences if model wraps JSON
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(body);
}
