import type {
  CritiqueDimension,
  CritiqueIssue,
  CritiqueScores,
  DesignIntent,
  UiNode,
  UiSchema,
} from "@/lib/genui/types";

const DIMS: CritiqueDimension[] = [
  "requirementCoverage",
  "componentCompleteness",
  "layoutQuality",
  "visualHierarchy",
  "styleConsistency",
  "responsiveBehavior",
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

function wantedList(intent: DesignIntent): string[] {
  const raw = [
    ...(intent.requiredComponents || []),
    ...(intent.components || []),
  ];
  const out: string[] = [];
  for (const w of raw) {
    const v = w.toLowerCase().trim();
    if (!v || out.includes(v)) continue;
    out.push(v);
  }
  return out;
}

function matchWant(
  want: string,
  types: Map<string, number>,
  schemaText: string,
  nodes: UiNode[]
): boolean {
  const matchers: Array<{ test: RegExp; types: string[]; text?: RegExp }> = [
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
      test: /sidebar|side nav|side panel|sidebar-layout/,
      types: ["sidebar-layout"],
      text: /sidebar-layout/,
    },
    { test: /nav|menu|navigation/, types: ["nav", "sidebar-layout"] },
    { test: /button|cta/, types: ["button"] },
    { test: /hero|headline|heading|title/, types: ["heading"] },
    { test: /card/, types: ["card", "kpi-card"] },
    { test: /form|input|field|search/, types: ["input", "button"] },
    { test: /image|photo|hero image/, types: ["image"] },
    { test: /list/, types: ["list", "table", "nav"] },
    { test: /badge|pill/, types: ["badge"] },
  ];

  for (const m of matchers) {
    if (m.test.test(want)) {
      return (
        m.types.some((t) => (types.get(t) || 0) > 0) ||
        Boolean(m.text && m.text.test(schemaText))
      );
    }
  }
  return (
    (types.get(want) || 0) > 0 ||
    schemaText.includes(want) ||
    nodes.some(
      (n) =>
        want.includes(n.type) ||
        n.type.includes(want.replace(/\s+/g, "-")) ||
        String(n.props?.title || "")
          .toLowerCase()
          .includes(want)
    )
  );
}

/**
 * Deterministic schema-rule critique — always runs (honest, non-LLM).
 * Maps to Phase-2 acceptance dimensions.
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
    requirementCoverage: 8.5,
    componentCompleteness: 8.5,
    layoutQuality: 8.5,
    visualHierarchy: 8.5,
    styleConsistency: 8.5,
    responsiveBehavior: 8,
  };

  const schemaText = JSON.stringify(schema).toLowerCase();
  const wanted = wantedList(intent);

  // 1) Requirement coverage — prompt/intent MUST-haves
  let missingReqs = 0;
  for (const w of wanted) {
    if (!matchWant(w, types, schemaText, nodes)) {
      missingReqs += 1;
      issues.push({
        dimension: "requirementCoverage",
        severity: "high",
        message: `Required “${w}” from the prompt/intent is missing in the schema.`,
        suggestion: `Add a whitelist node that satisfies “${w}”.`,
        source: "schema-rules",
      });
    }
  }
  if (missingReqs > 0) {
    scores.requirementCoverage -= Math.min(5, missingReqs * 1.4);
  }
  if ((intent.pageType || "").toLowerCase().includes("dashboard")) {
    if ((types.get("kpi-card") || 0) === 0) {
      scores.requirementCoverage -= 1.5;
      issues.push({
        dimension: "requirementCoverage",
        severity: "high",
        message: "Dashboard intent without KPI cards.",
        suggestion: "Add a grid of kpi-card metrics near the top.",
        source: "schema-rules",
      });
    }
    if ((types.get("chart") || 0) === 0 && (types.get("table") || 0) === 0) {
      scores.requirementCoverage -= 1.5;
      issues.push({
        dimension: "requirementCoverage",
        severity: "high",
        message: "Dashboard lacks chart and table data surfaces.",
        suggestion: "Include at least one chart and one data table.",
        source: "schema-rules",
      });
    }
  }

  // 2) Component completeness — structural density / expected widgets
  if (nodes.length < 6) {
    scores.componentCompleteness -= 2;
    issues.push({
      dimension: "componentCompleteness",
      severity: "medium",
      message: "Page feels sparse — very few structural nodes.",
      suggestion: "Add section stacks for header, metrics, and content blocks.",
      source: "schema-rules",
    });
  }
  if (nodes.length > 55) {
    scores.componentCompleteness -= 1;
    issues.push({
      dimension: "componentCompleteness",
      severity: "low",
      message: "Schema is quite dense; preview may feel crowded.",
      suggestion: "Merge similar cards or reduce nested wrappers.",
      source: "schema-rules",
    });
  }
  if (missingReqs > 0) {
    scores.componentCompleteness -= Math.min(3, missingReqs);
  }

  // 3) Layout quality
  const hasSidebar = (types.get("sidebar-layout") || 0) > 0;
  const hasStack = (types.get("stack") || 0) > 0;
  const hasGrid = (types.get("grid") || 0) > 0;
  if (!hasSidebar && !hasStack && !hasGrid) {
    scores.layoutQuality -= 2.5;
    issues.push({
      dimension: "layoutQuality",
      severity: "high",
      message: "No clear layout structure (sidebar / stack / grid).",
      suggestion:
        "Wrap content in sidebar-layout or a primary stack with sections.",
      source: "schema-rules",
    });
  }
  if (
    (intent.layout || "").includes("sidebar") &&
    !hasSidebar &&
    (intent.pageType || "").includes("dashboard")
  ) {
    scores.layoutQuality -= 1.5;
    issues.push({
      dimension: "layoutQuality",
      severity: "high",
      message: "Intent asks for sidebar layout but schema has none.",
      suggestion: "Use sidebar-layout with nav in the first child.",
      source: "schema-rules",
    });
  }

  // 4) Visual hierarchy
  const headings = nodes.filter((n) => n.type === "heading");
  const h1 = headings.filter((n) => Number(n.props?.level) === 1);
  if (h1.length === 0) {
    scores.visualHierarchy -= 2;
    issues.push({
      dimension: "visualHierarchy",
      severity: "high",
      message: "Missing a primary H1 heading.",
      suggestion: "Add one level-1 heading as the page title.",
      source: "schema-rules",
    });
  } else if (h1.length > 1) {
    scores.visualHierarchy -= 1;
    issues.push({
      dimension: "visualHierarchy",
      severity: "medium",
      message: "Multiple H1 headings compete for attention.",
      suggestion: "Keep a single H1; demote others to H2/H3.",
      source: "schema-rules",
    });
  }
  if (headings.length === 0) {
    scores.visualHierarchy -= 2;
    issues.push({
      dimension: "visualHierarchy",
      severity: "high",
      message: "No headings — visual hierarchy is weak.",
      suggestion: "Introduce section headings above each major block.",
      source: "schema-rules",
    });
  }
  const withGap = nodes.filter(
    (n) =>
      n.props?.gap === "sm" || n.props?.gap === "md" || n.props?.gap === "lg"
  );
  if (
    (types.get("stack") || 0) + (types.get("row") || 0) > 0 &&
    withGap.length === 0
  ) {
    scores.visualHierarchy -= 0.5;
    issues.push({
      dimension: "visualHierarchy",
      severity: "low",
      message: "Stacks/rows rarely declare gap tokens.",
      suggestion: "Set gap to sm/md/lg on primary stacks for consistent rhythm.",
      source: "schema-rules",
    });
  }

  // 5) Style consistency
  if (schema.meta.style !== intent.style) {
    scores.styleConsistency -= 2.5;
    issues.push({
      dimension: "styleConsistency",
      severity: "high",
      message: `Schema style "${schema.meta.style}" differs from intent "${intent.style}".`,
      suggestion: `Force meta.style to "${intent.style}" and restyle surfaces accordingly.`,
      source: "schema-rules",
    });
  }
  if (intent.visualAnalysis?.source === "vlm") {
    const va = intent.visualAnalysis;
    if (
      va.layoutStructure &&
      /sidebar/i.test(va.layoutStructure) &&
      !hasSidebar
    ) {
      scores.styleConsistency -= 1;
      issues.push({
        dimension: "styleConsistency",
        severity: "medium",
        message: "Reference image implies a sidebar shell that is missing.",
        suggestion: "Mirror the reference with sidebar-layout + nav items.",
        source: "schema-rules",
      });
    }
  } else if (intent.visualAnalysis?.source === "unavailable") {
    issues.push({
      dimension: "styleConsistency",
      severity: "low",
      message:
        "Reference image was provided but not visually understood — style match cannot be verified by VLM.",
      suggestion:
        "Configure GENUI_VISION_MODEL, or manually tune style / surfaces.",
      source: "schema-rules",
    });
  }

  // 6) Responsive behavior (schema-level heuristics; browser findings enrich later)
  if (!(intent.responsive || "").toLowerCase().includes("mobile")) {
    scores.responsiveBehavior -= 0.5;
  }
  const wideTable = nodes.some(
    (n) =>
      n.type === "table" &&
      Array.isArray(n.props?.columns) &&
      (n.props?.columns as unknown[]).length > 6
  );
  if (wideTable) {
    scores.responsiveBehavior -= 1;
    issues.push({
      dimension: "responsiveBehavior",
      severity: "medium",
      message: "Wide table may overflow on tablet/mobile artboards.",
      suggestion: "Reduce columns or expect horizontal scroll in preview.",
      source: "schema-rules",
    });
  }
  if (!hasSidebar && (intent.pageType || "").includes("dashboard")) {
    // dashboards without sidebar still need clear stacking for mobile
    scores.responsiveBehavior -= 0.3;
  }

  for (const d of DIMS) scores[d] = clampScore(scores[d]);

  const overall = DIMS.reduce((a, d) => a + scores[d], 0) / DIMS.length;
  const high = issues.filter((i) => i.severity === "high").length;
  const suggestRegenerate = overall < 5.5 || high >= 3;

  const summary =
    issues.length === 0
      ? "Schema-rule check looks solid — no major structural gaps."
      : `Schema-rule check found ${issues.length} issue(s); overall ${overall.toFixed(1)}/10.`;

  return {
    scores,
    issues,
    summary,
    suggestRegenerate,
  };
}

export { DIMS as CRITIQUE_DIMENSIONS };
