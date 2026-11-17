import type { GenuiStyle } from "@/config/genui";
import { sha256Hex } from "@/lib/genui/ids";
import { chatJson, hasLlmApiKey } from "@/lib/genui/llm";
import {
  buildReviseUserPrompt,
  reviseSystemPrompt,
} from "@/lib/genui/prompts";
import type {
  CritiqueResult,
  DesignIntent,
  UiNode,
  UiSchema,
} from "@/lib/genui/types";
import { validateUiSchemaFromModelText } from "@/lib/genui/validate";
import { makeId } from "@/lib/genui/ids";

function cloneNode(node: UiNode): UiNode {
  return {
    ...node,
    props: node.props ? { ...node.props } : undefined,
    children: node.children?.map(cloneNode),
  };
}

/** Local deterministic revise when LLM unavailable / fixture mode */
export function reviseSchemaLocally(
  schema: UiSchema,
  critique: CritiqueResult,
  intent: DesignIntent
): UiSchema {
  const next: UiSchema = {
    version: 1,
    meta: {
      ...schema.meta,
      style: intent.style,
      description:
        schema.meta.description ||
        `Revised locally from critique ${critique.id}`,
    },
    root: cloneNode(schema.root),
  };

  const highCompleteness = critique.issues.some(
    (i) => i.dimension === "completeness" && i.severity !== "low"
  );
  const missingH1 = critique.issues.some((i) =>
    /h1|primary heading/i.test(i.message)
  );

  const kids = next.root.children ? [...next.root.children] : [];

  if (missingH1) {
    kids.unshift({
      id: makeId("n"),
      type: "heading",
      props: { text: next.meta.title || "Untitled", level: 1 },
    });
  }

  if (highCompleteness && intent.pageType?.toLowerCase().includes("dashboard")) {
    const hasKpi = JSON.stringify(next).includes('"kpi-card"');
    const hasChart = JSON.stringify(next).includes('"chart"');
    const hasTable = JSON.stringify(next).includes('"table"');
    const extras: UiNode[] = [];
    if (!hasKpi) {
      extras.push({
        id: makeId("n"),
        type: "grid",
        props: { columns: 3, gap: "md" },
        children: [
          {
            id: makeId("n"),
            type: "kpi-card",
            props: { title: "Metric A", value: "—", delta: "+0%" },
          },
          {
            id: makeId("n"),
            type: "kpi-card",
            props: { title: "Metric B", value: "—", delta: "+0%" },
          },
          {
            id: makeId("n"),
            type: "kpi-card",
            props: { title: "Metric C", value: "—", delta: "+0%" },
          },
        ],
      });
    }
    if (!hasChart) {
      extras.push({
        id: makeId("n"),
        type: "chart",
        props: {
          title: "Overview",
          chartType: "line",
          points: [8, 12, 10, 16, 18, 22],
        },
      });
    }
    if (!hasTable) {
      extras.push({
        id: makeId("n"),
        type: "table",
        props: {
          title: "Details",
          columns: ["Item", "Status"],
          rows: [
            ["Alpha", "Active"],
            ["Beta", "Pending"],
          ],
        },
      });
    }

    // Prefer injecting into sidebar main column when present
    const side = kids.find((c) => c.type === "sidebar-layout");
    if (side?.children?.[1]) {
      side.children[1] = {
        ...side.children[1],
        children: [...(side.children[1].children || []), ...extras],
      };
    } else {
      kids.push(...extras);
    }
  }

  next.root = { ...next.root, children: kids };
  return next;
}

export type ReviseResult = {
  schema: UiSchema;
  mode: "llm" | "local";
  model: string;
  provider: string;
  rawHash: string;
  usage?: { input: number; output: number };
  notes: string;
};

export async function reviseUiSchema(opts: {
  prompt: string;
  intent: DesignIntent;
  style: GenuiStyle;
  schema: UiSchema;
  critique: CritiqueResult;
  notes?: string;
  allowLocal?: boolean;
}): Promise<ReviseResult> {
  const notes =
    opts.notes?.trim() ||
    opts.critique.issues
      .slice(0, 6)
      .map((i) => `- [${i.severity}] ${i.dimension}: ${i.suggestion}`)
      .join("\n");

  if (!hasLlmApiKey() || opts.allowLocal) {
    if (!opts.allowLocal && !hasLlmApiKey()) {
      throw new Error(
        "OPENAI_API_KEY is not configured. Use local revise for fixture runs, or add a server key."
      );
    }
    const schema = reviseSchemaLocally(opts.schema, opts.critique, opts.intent);
    const raw = JSON.stringify(schema);
    return {
      schema,
      mode: "local",
      model: "local-revise",
      provider: "local",
      rawHash: await sha256Hex(raw),
      notes,
    };
  }

  const llm = await chatJson([
    { role: "system", content: reviseSystemPrompt(opts.style) },
    {
      role: "user",
      content: buildReviseUserPrompt({
        prompt: opts.prompt,
        intent: opts.intent,
        schema: opts.schema,
        critique: {
          overall: opts.critique.overall,
          scores: opts.critique.scores,
          issues: opts.critique.issues,
          summary: opts.critique.summary,
        },
        notes,
      }),
    },
  ]);

  let validated = validateUiSchemaFromModelText(llm.content);
  if (!validated.ok) {
    const repair = await chatJson([
      {
        role: "system",
        content: `${reviseSystemPrompt(opts.style)}\nFix validation errors. Return ONLY JSON.`,
      },
      {
        role: "user",
        content: `Validation issues:\n${validated.issues.join("\n")}\n\nOutput:\n${llm.content.slice(0, 6000)}`,
      },
    ]);
    validated = validateUiSchemaFromModelText(repair.content);
    if (!validated.ok) {
      throw new Error(
        `Revised schema invalid: ${validated.issues.slice(0, 5).join("; ")}`
      );
    }
    return {
      schema: { ...validated.schema, meta: { ...validated.schema.meta, style: opts.style } },
      mode: "llm",
      model: repair.model,
      provider: "openai-compatible",
      rawHash: await sha256Hex(repair.content),
      usage: repair.usage,
      notes,
    };
  }

  return {
    schema: {
      ...validated.schema,
      meta: { ...validated.schema.meta, style: opts.style },
    },
    mode: "llm",
    model: llm.model,
    provider: "openai-compatible",
    rawHash: await sha256Hex(llm.content),
    usage: llm.usage,
    notes,
  };
}
