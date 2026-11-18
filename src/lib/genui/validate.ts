import {
  GENUI_MAX_NODES,
  GENUI_MAX_SCHEMA_DEPTH,
} from "@/config/genui";
import { UiSchemaSchema, parseJsonObject } from "@/lib/genui/schema";
import type { UiNode, UiSchema } from "@/lib/genui/types";

function walk(
  node: UiNode,
  depth: number,
  counter: { n: number },
  issues: string[]
) {
  counter.n += 1;
  if (counter.n > GENUI_MAX_NODES) {
    issues.push(`Too many nodes (max ${GENUI_MAX_NODES})`);
    return;
  }
  if (depth > GENUI_MAX_SCHEMA_DEPTH) {
    issues.push(`Schema too deep (max ${GENUI_MAX_SCHEMA_DEPTH})`);
    return;
  }
  for (const child of node.children || []) {
    walk(child, depth + 1, counter, issues);
  }
}

export function validateUiSchema(input: unknown): {
  ok: true;
  schema: UiSchema;
} | {
  ok: false;
  error: string;
  issues: string[];
} {
  const parsed = UiSchemaSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "UI Schema failed validation",
      issues: parsed.error.issues.map(
        (i) => `${i.path.join(".") || "root"}: ${i.message}`
      ),
    };
  }

  const issues: string[] = [];
  walk(parsed.data.root, 0, { n: 0 }, issues);
  if (issues.length) {
    return { ok: false, error: "UI Schema failed safety checks", issues };
  }
  return { ok: true, schema: parsed.data };
}

export function validateUiSchemaFromModelText(raw: string) {
  try {
    const json = parseJsonObject(raw);
    return validateUiSchema(json);
  } catch (e) {
    return {
      ok: false as const,
      error: "Model output is not valid JSON",
      issues: [e instanceof Error ? e.message : "JSON parse error"],
    };
  }
}
