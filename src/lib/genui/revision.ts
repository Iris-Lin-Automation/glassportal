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

function extractTargetNodeIds(notes: string) {
  const ids = new Set<string>();
  const re = /id=([a-zA-Z0-9_-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(notes)) !== null) {
    ids.add(m[1]);
  }
  return ids;
}

function resolveColorFromNotes(notes: string) {
  const hex = notes.match(/#([0-9a-fA-F]{3,8})\b/);
  if (hex) return `#${hex[1]}`;
  if (/青绿|teal|cyan|青/i.test(notes)) return "#22D3EE";
  if (/绿|green/i.test(notes) && !/红/.test(notes)) return "#34D399";
  if (/蓝|blue/i.test(notes)) return "#60A5FA";
  if (/紫|purple|violet/i.test(notes)) return "#A78BFA";
  if (/橙|orange/i.test(notes)) return "#FB923C";
  if (/黄|yellow|金/i.test(notes)) return "#FBBF24";
  if (/白|white/i.test(notes)) return "#F8FAFC";
  // “变一下这个红色” / change this red → swap red toward cyan accent
  if (/红|rose|crimson|red/i.test(notes)) return "#22D3EE";
  return null;
}

function applyLocalHumanNotes(root: UiNode, notes: string) {
  const rename =
    notes.match(/rename(?:\s+title)?\s+to\s+[“"']?([^”"'\n.]+)[”"']?/i) ||
    notes.match(/title\s+say\s+[“"']?([^”"'\n.]+)[”"']?/i);
  const targetTitle = rename?.[1]?.trim();
  const color = resolveColorFromNotes(notes);
  const wantsColor =
    Boolean(color) && /色|color|红|绿|蓝|青|橙|紫|变/i.test(notes);
  const targetIds = extractTargetNodeIds(notes);
  const mentionsKpi = /kpi|metric|churn|revenue|users|卡片|指标/i.test(notes);
  const mentionsSidebar = /sidebar|侧边/i.test(notes);

  const walk = (n: UiNode): UiNode => {
    const next: UiNode = {
      ...n,
      children: n.children?.map(walk),
    };
    const targeted =
      targetIds.has(n.id) ||
      (mentionsKpi && n.type === "kpi-card") ||
      (mentionsSidebar && n.type === "sidebar-layout");

    if (targetTitle) {
      if (
        (n.type === "chart" || n.type === "table" || n.type === "heading") &&
        (targeted ||
          notes
            .toLowerCase()
            .includes(
              String(n.props?.title || n.props?.text || "")
                .toLowerCase()
                .slice(0, 12) || "___never___"
            ))
      ) {
        if (n.type === "heading") {
          next.props = { ...n.props, text: targetTitle };
        } else {
          next.props = { ...n.props, title: targetTitle };
        }
      } else if (n.type === "chart" && /chart/i.test(notes)) {
        next.props = { ...n.props, title: targetTitle };
      }
    }

    if (wantsColor && color) {
      if (n.type === "kpi-card" && (targeted || targetIds.size === 0)) {
        const delta = String(n.props?.delta || "");
        if (/红|red|rose/i.test(notes) || /^\s*-/.test(delta)) {
          next.props = {
            ...next.props,
            deltaColor: color,
            accentColor: color,
          };
        } else if (targeted) {
          next.props = { ...next.props, accentColor: color };
        }
      }
      if (n.type === "chart" && (targeted || /chart|图/i.test(notes))) {
        next.props = { ...next.props, accentColor: color };
      }
    }
    return next;
  };
  return walk(root);
}

export type LocalReviseOutcome = {
  schema: UiSchema;
  changelog: string[];
};

/** Local deterministic revise when LLM unavailable / fixture mode */
export function reviseSchemaLocally(
  schema: UiSchema,
  critique: CritiqueResult,
  intent: DesignIntent,
  humanNotes?: string
): LocalReviseOutcome {
  const changelog: string[] = [];
  const before = JSON.stringify(schema);
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

  if (schema.meta.style !== intent.style) {
    changelog.push(`Set style to ${intent.style}`);
  }

  if (humanNotes?.trim()) {
    next.root = applyLocalHumanNotes(next.root, humanNotes);
    changelog.push("Applied human / critique notes to matching blocks");
  }

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
    changelog.push("Added missing H1 heading");
  }

  const blob = () =>
    JSON.stringify({ ...next, root: { ...next.root, children: kids } });
  const needsTable = critique.issues.some((i) =>
    /table|transaction/i.test(`${i.message} ${i.suggestion}`)
  );
  const needsChart = critique.issues.some((i) =>
    /chart|graph/i.test(`${i.message} ${i.suggestion}`)
  );
  const needsKpi = critique.issues.some((i) =>
    /kpi|metric/i.test(`${i.message} ${i.suggestion}`)
  );
  const highCompleteness = critique.issues.some(
    (i) => i.dimension === "completeness" && i.severity !== "low"
  );

  const hasKpi = blob().includes('"kpi-card"');
  const hasChart = blob().includes('"chart"');
  const hasTable = blob().includes('"table"');
  const extras: UiNode[] = [];

  if ((highCompleteness || needsKpi) && !hasKpi) {
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
    changelog.push("Added KPI cards");
  }
  if ((highCompleteness || needsChart) && !hasChart) {
    extras.push({
      id: makeId("n"),
      type: "chart",
      props: {
        title: "Overview",
        chartType: "line",
        points: [8, 12, 10, 16, 18, 22],
      },
    });
    changelog.push("Added chart");
  }
  if ((highCompleteness || needsTable) && !hasTable) {
    extras.push({
      id: makeId("n"),
      type: "table",
      props: {
        title: "Recent Transactions",
        columns: ["Customer", "Plan", "Amount", "Status"],
        rows: [
          ["Acme Corp", "Pro", "$190", "Paid"],
          ["Globex", "Agency", "$490", "Paid"],
        ],
      },
    });
    changelog.push("Added Recent Transactions table");
  } else if (needsTable && hasTable) {
    // Ensure an existing table is labeled clearly for the intent
    const rename = (n: UiNode): UiNode => {
      if (n.type === "table") {
        const title = String(n.props?.title || "");
        if (!/transaction/i.test(title)) {
          changelog.push(`Renamed table to Recent Transactions`);
          return {
            ...n,
            props: { ...n.props, title: "Recent Transactions" },
            children: n.children?.map(rename),
          };
        }
      }
      return { ...n, children: n.children?.map(rename) };
    };
    for (let i = 0; i < kids.length; i++) kids[i] = rename(kids[i]);
  }

  if (extras.length) {
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

  if (JSON.stringify(next) === before && changelog.length === 0) {
    changelog.push(
      "Schema already matched critique — re-score should clear false gaps"
    );
  }

  return { schema: next, changelog };
}

export type ReviseResult = {
  schema: UiSchema;
  mode: "llm" | "local";
  model: string;
  provider: string;
  rawHash: string;
  usage?: { input: number; output: number };
  notes: string;
  changelog: string[];
  palettePatch?: Partial<{
    accent: string;
    background: string;
    card: string;
    table: string;
  }>;
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

  // No key / explicit local → deterministic revise (never hang with empty change)
  if (!hasLlmApiKey() || opts.allowLocal) {
    const local = reviseSchemaLocally(
      opts.schema,
      opts.critique,
      opts.intent,
      notes
    );
    const color = resolveColorFromNotes(notes);
    const palettePatch =
      color && /色|color|红|绿|蓝|青|橙|紫|accent|变/i.test(notes)
        ? { accent: color }
        : undefined;
    if (palettePatch) local.changelog.push(`Palette accent → ${palettePatch.accent}`);
    const raw = JSON.stringify(local.schema);
    return {
      schema: local.schema,
      mode: "local",
      model: "local-revise",
      provider: "local",
      rawHash: await sha256Hex(raw),
      notes,
      changelog: local.changelog,
      palettePatch,
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
      changelog: ["LLM revised schema from critique + human notes"],
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
    changelog: ["LLM revised schema from critique + human notes"],
  };
}
