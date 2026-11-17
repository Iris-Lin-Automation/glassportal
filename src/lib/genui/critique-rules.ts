import type {
  CritiqueDimension,
  CritiqueIssue,
  CritiqueScores,
  DesignIntent,
  UiNode,
  UiSchema,
} from "@/lib/genui/types";

const DIMS: CritiqueDimension[] = [
  "layout",
  "hierarchy",
  "spacing",
  "typography",
  "color",
  "completeness",
];

function walk(node: UiNode, out: UiNode[]) {
  out.push(node);
  for (const c of node.children || []) walk(c, out);
}

function countTypes(nodes: UiNode[]) {
  const map = new Map<string, number>();
  for (const n of nodes) map.set(n.type, (map.get(n.type) || 0) + 1);
  return map;
}

function clampScore(n: number) {
  return Math.max(1, Math.min(10, Math.round(n * 10) / 10));
}

/**
 * Deterministic design checks — always runs (honest, non-LLM).
 */
export function runRuleCritique(
  schema: UiSchema,
  intent: DesignIntent
): {
  scores: CritiqueScores;
  issues: CritiqueIssue[];
  summary: string;
  suggestRegenerate: boolean;
} {
  const nodes: UiNode[] = [];
  walk(schema.root, nodes);
  const types = countTypes(nodes);
  const issues: CritiqueIssue[] = [];
  const scores: CritiqueScores = {
    layout: 8,
    hierarchy: 8,
    spacing: 8,
    typography: 8,
    color: 8,
    completeness: 8,
  };

  // Layout
  const hasSidebar = (types.get("sidebar-layout") || 0) > 0;
  const hasStack = (types.get("stack") || 0) > 0;
  const hasGrid = (types.get("grid") || 0) > 0;
  if (!hasSidebar && !hasStack && !hasGrid) {
    scores.layout -= 2.5;
    issues.push({
      dimension: "layout",
      severity: "high",
      message: "No clear layout structure (sidebar / stack / grid).",
      suggestion: "Wrap content in sidebar-layout or a primary stack with sections.",
    });
  }
  if (nodes.length < 6) {
    scores.layout -= 1.5;
    issues.push({
      dimension: "layout",
      severity: "medium",
      message: "Page feels sparse — very few structural nodes.",
      suggestion: "Add section stacks for hero, metrics, and content blocks.",
    });
  }
  if (nodes.length > 55) {
    scores.layout -= 1;
    issues.push({
      dimension: "layout",
      severity: "low",
      message: "Schema is quite dense; preview may feel crowded.",
      suggestion: "Merge similar cards or reduce nested wrappers.",
    });
  }

  // Hierarchy
  const headings = nodes.filter((n) => n.type === "heading");
  const h1 = headings.filter((n) => Number(n.props?.level) === 1);
  if (h1.length === 0) {
    scores.hierarchy -= 2;
    issues.push({
      dimension: "hierarchy",
      severity: "high",
      message: "Missing a primary H1 heading.",
      suggestion: "Add one level-1 heading as the page title.",
    });
  } else if (h1.length > 1) {
    scores.hierarchy -= 1;
    issues.push({
      dimension: "hierarchy",
      severity: "medium",
      message: "Multiple H1 headings compete for attention.",
      suggestion: "Keep a single H1; demote others to H2/H3.",
    });
  }
  if (headings.length === 0) {
    scores.hierarchy -= 2;
    issues.push({
      dimension: "hierarchy",
      severity: "high",
      message: "No headings — visual hierarchy is weak.",
      suggestion: "Introduce section headings above each major block.",
    });
  }

  // Spacing / density heuristics via gap usage
  const withGap = nodes.filter(
    (n) => n.props?.gap === "sm" || n.props?.gap === "md" || n.props?.gap === "lg"
  );
  if ((types.get("stack") || 0) + (types.get("row") || 0) > 0 && withGap.length === 0) {
    scores.spacing -= 1;
    issues.push({
      dimension: "spacing",
      severity: "low",
      message: "Stacks/rows rarely declare gap tokens.",
      suggestion: "Set gap to sm/md/lg on primary stacks for consistent rhythm.",
    });
  }

  // Typography
  const texts = types.get("text") || 0;
  if (headings.length > 0 && texts === 0 && (types.get("kpi-card") || 0) === 0) {
    scores.typography -= 1;
    issues.push({
      dimension: "typography",
      severity: "medium",
      message: "Headings without supporting body copy.",
      suggestion: "Add short muted text under key headings.",
    });
  }

  // Color / style coherence (schema meta vs intent)
  if (schema.meta.style !== intent.style) {
    scores.color -= 2;
    issues.push({
      dimension: "color",
      severity: "high",
      message: `Schema style "${schema.meta.style}" differs from intent "${intent.style}".`,
      suggestion: `Force meta.style to "${intent.style}" and restyle surfaces accordingly.`,
    });
  }
  if (intent.style === "night-sky" && !String(schema.meta.description || "").toLowerCase().includes("dark") && !hasSidebar) {
    scores.color -= 0.5;
  }

  // Completeness vs intent components (map free-text wants → node types / schema text)
  const wanted = (intent.components || []).map((c) => c.toLowerCase().trim());
  const schemaText = JSON.stringify(schema).toLowerCase();
  const wantMatchers: Array<{
    test: RegExp;
    types: string[];
    text?: RegExp;
  }> = [
    {
      test: /transaction|table|data grid|recent/,
      types: ["table"],
      text: /transaction|table/,
    },
    { test: /chart|graph|plot|sparkline/, types: ["chart"], text: /chart/ },
    {
      test: /kpi|metric|stat|revenue card|counter/,
      types: ["kpi-card"],
      text: /kpi-card|total revenue|active users|churn/,
    },
    {
      test: /sidebar|side nav|side panel/,
      types: ["sidebar-layout"],
      text: /sidebar-layout/,
    },
    { test: /nav|menu|navigation/, types: ["nav", "sidebar-layout"] },
    { test: /button|cta/, types: ["button"] },
    { test: /hero|headline|heading|title/, types: ["heading"] },
    { test: /card/, types: ["card", "kpi-card"] },
    { test: /form|input|field/, types: ["input", "button"] },
    { test: /image|photo|hero image/, types: ["image"] },
    { test: /list/, types: ["list", "table", "nav"] },
  ];

  let missing = 0;
  for (const w of wanted) {
    if (!w || w.length < 2) continue;
    let ok = false;
    for (const m of wantMatchers) {
      if (m.test.test(w)) {
        ok =
          m.types.some((t) => (types.get(t) || 0) > 0) ||
          Boolean(m.text && m.text.test(schemaText));
        break;
      }
    }
    if (!ok) {
      // Exact node type / literal mention in schema
      ok =
        (types.get(w) || 0) > 0 ||
        schemaText.includes(w) ||
        nodes.some(
          (n) =>
            w.includes(n.type) ||
            n.type.includes(w.replace(/\s+/g, "-")) ||
            String(n.props?.title || "")
              .toLowerCase()
              .includes(w)
        );
    }
    if (!ok) {
      missing += 1;
      issues.push({
        dimension: "completeness",
        severity: "medium",
        message: `Intent asked for “${w}” but schema may be missing it.`,
        suggestion: `Add a matching whitelist component for “${w}”.`,
      });
    }
  }
  if (missing > 0) {
    scores.completeness -= Math.min(4, missing * 1.2);
  }
  if ((intent.pageType || "").toLowerCase().includes("dashboard")) {
    if ((types.get("kpi-card") || 0) === 0) {
      scores.completeness -= 1.5;
      issues.push({
        dimension: "completeness",
        severity: "high",
        message: "Dashboard intent without KPI cards.",
        suggestion: "Add a grid of kpi-card metrics near the top.",
      });
    }
    if ((types.get("chart") || 0) === 0 && (types.get("table") || 0) === 0) {
      scores.completeness -= 1.5;
      issues.push({
        dimension: "completeness",
        severity: "high",
        message: "Dashboard lacks chart and table.",
        suggestion: "Include at least one chart and one data table.",
      });
    }
  }

  for (const d of DIMS) scores[d] = clampScore(scores[d]);

  const overall =
    DIMS.reduce((a, d) => a + scores[d], 0) / DIMS.length;
  const high = issues.filter((i) => i.severity === "high").length;
  const suggestRegenerate = overall < 5.5 || high >= 3;

  const summary =
    issues.length === 0
      ? "Rule check looks solid — no major structural gaps."
      : `Rule check found ${issues.length} issue(s); overall ${overall.toFixed(1)}/10.`;

  return {
    scores,
    issues,
    summary,
    suggestRegenerate,
  };
}

export { DIMS as CRITIQUE_DIMENSIONS };
