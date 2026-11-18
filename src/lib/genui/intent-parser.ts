import { GENUI_STYLES, type GenuiStyle } from "@/config/genui";
import { DesignIntentSchema, parseJsonObject } from "@/lib/genui/schema";
import { chatJson, hasLlmApiKey } from "@/lib/genui/llm";
import { intentSystemPrompt } from "@/lib/genui/prompts";
import type {
  DesignIntent,
  ReferenceMode,
  VisualStyleAnalysis,
} from "@/lib/genui/types";

function detectStyle(prompt: string, forced?: GenuiStyle): GenuiStyle {
  if (forced && GENUI_STYLES.includes(forced)) return forced;
  const p = prompt.toLowerCase();
  if (
    /pulse|pulsemetrics|dark purple|electric purple|analytics dashboard.*purple/.test(
      p
    )
  )
    return "pulse";
  if (
    /obsidian|cinematic|brand studio|agency landing|electric cyan|ink black|lokuma/.test(
      p
    )
  )
    return "obsidian";
  if (/crypto|wallet|fintech|trading|portfolio dashboard|cryptohub/.test(p))
    return "fintech";
  if (/night|dark|geek|cyber|neon|space|claude design|星空|暗黑|极客/.test(p))
    return "night-sky";
  if (/editorial|magazine|serif|story|content site/.test(p)) return "editorial";
  if (/minimal|clean|simple|quiet|whitespace/.test(p)) return "minimal";
  return "modern-saas";
}

/** Map free-text wants → canonical whitelist component ids. */
export function extractRequiredComponents(prompt: string): string[] {
  const p = prompt.toLowerCase();
  const required: string[] = [];
  const add = (id: string) => {
    if (!required.includes(id)) required.push(id);
  };

  if (/sidebar|side nav|admin shell|dashboard/.test(p)) add("sidebar-layout");
  if (/kpi|metric|stat card|active users|sessions|retention|churn rate/.test(p))
    add("kpi-card");
  if (/chart|graph|plot|sparkline|weekly active|revenue chart|area chart|bar chart/.test(p))
    add("chart");
  if (/table|transaction|recent transactions|data grid/.test(p)) add("table");
  if (/nav|menu|navigation/.test(p)) add("nav");
  if (/button|cta|generate report|export/.test(p)) add("button");
  if (/search|input|field|form/.test(p)) add("input");
  if (/badge|pill|tag/.test(p)) add("badge");
  if (/hero|headline|heading|title/.test(p)) add("heading");
  if (/card(?!s?\b.*kpi)/.test(p) || /feature card/.test(p)) add("card");
  if (/image|photo|hero image|cover/.test(p)) add("image");
  if (/list/.test(p)) add("list");

  // Phrase bundles: "Dashboard + KPI Cards + Revenue Chart + Recent Transactions"
  if (/dashboard/.test(p)) {
    add("sidebar-layout");
    add("heading");
    if (!required.includes("kpi-card") && /kpi|metric|card/.test(p))
      add("kpi-card");
  }

  return required;
}

function mergeRequired(
  fromPrompt: string[],
  fromComponents: string[],
  fromVision?: string[]
) {
  const out: string[] = [];
  const add = (raw: string) => {
    const v = raw.toLowerCase().trim();
    if (!v) return;
    let canon = v;
    if (/sidebar/.test(v)) canon = "sidebar-layout";
    else if (/kpi|metric|stat/.test(v)) canon = "kpi-card";
    else if (/chart|graph|plot/.test(v)) canon = "chart";
    else if (/table|transaction/.test(v)) canon = "table";
    else if (/nav|menu/.test(v)) canon = "nav";
    else if (/button|cta/.test(v)) canon = "button";
    else if (/heading|title|hero/.test(v)) canon = "heading";
    else if (/input|search|field/.test(v)) canon = "input";
    else if (/image|photo/.test(v)) canon = "image";
    else if (/badge|pill/.test(v)) canon = "badge";
    else if (/list/.test(v)) canon = "list";
    else if (/card/.test(v)) canon = "card";
    if (!out.includes(canon)) out.push(canon);
  };
  for (const x of fromPrompt) add(x);
  for (const x of fromComponents) add(x);
  for (const x of fromVision || []) add(x);
  return out;
}

/** Deterministic heuristic parser — labeled honestly when LLM is unavailable. */
export function parseIntentHeuristic(
  prompt: string,
  forcedStyle?: GenuiStyle,
  extras?: {
    referenceMode?: ReferenceMode;
    visualAnalysis?: VisualStyleAnalysis;
  }
): DesignIntent {
  const p = prompt.toLowerCase();
  const style = detectStyle(prompt, forcedStyle);

  let pageType = "landing";
  if (/dashboard|analytics|kpi|admin|metrics/.test(p)) pageType = "dashboard";
  else if (/pricing/.test(p)) pageType = "pricing";
  else if (/product|detail|ecommerce|shop/.test(p)) pageType = "product-detail";
  else if (/form|signup|onboard/.test(p)) pageType = "form";
  else if (/settings|account/.test(p)) pageType = "settings";

  const layout =
    extras?.visualAnalysis?.layoutStructure ||
    (/sidebar|dashboard|admin/.test(p)
      ? "sidebar-main"
      : /split|two.?column/.test(p)
        ? "split"
        : "single-column");

  const components: string[] = [];
  if (/kpi|metric|stat/.test(p)) components.push("kpi-card");
  if (/chart|graph|revenue/.test(p)) components.push("chart");
  if (/table|transaction|list/.test(p)) components.push("table");
  if (/nav|sidebar|menu/.test(p)) components.push("nav");
  if (/button|cta/.test(p)) components.push("button");
  if (/card/.test(p)) components.push("card");
  if (/hero|headline/.test(p)) components.push("heading");
  if (/search|input/.test(p)) components.push("input");
  if (!components.length) {
    if (pageType === "dashboard") {
      components.push("sidebar-layout", "kpi-card", "chart", "heading");
    } else {
      components.push("heading", "text", "button", "card");
    }
  }

  const requiredComponents = mergeRequired(
    extractRequiredComponents(prompt),
    components,
    extras?.visualAnalysis?.componentHierarchy
  );

  let colorTone =
    extras?.visualAnalysis?.colorPalette?.slice(0, 4).join(", ") ||
    "neutral slate";
  if (!extras?.visualAnalysis?.colorPalette) {
    if (/blue|indigo|sky/.test(p)) colorTone = "blue / indigo";
    if (/green|emerald/.test(p)) colorTone = "emerald";
    if (/warm|orange|amber/.test(p)) colorTone = "warm amber";
    if (/purple|violet|pulse/.test(p)) colorTone = "electric purple";
    if (style === "pulse") colorTone = "navy charcoal + electric purple";
    if (style === "obsidian") colorTone = "ink black + electric cyan";
    if (style === "fintech") colorTone = "white + violet";
    if (style === "night-sky") colorTone = "ink + emerald / violet";
  }

  return DesignIntentSchema.parse({
    pageType,
    style,
    layout,
    components,
    requiredComponents,
    colorTone,
    typography: extras?.visualAnalysis?.typography,
    spacing: extras?.visualAnalysis?.spacingSystem,
    hierarchy:
      extras?.visualAnalysis?.componentHierarchy?.join(" → ") ||
      (pageType === "dashboard"
        ? "sidebar → header → KPI row → charts"
        : "brand → headline → CTA → sections"),
    responsive: /mobile|responsive/.test(p)
      ? "Desktop + Tablet + Mobile"
      : "Desktop first, responsive",
    rawSummary: prompt.trim().slice(0, 280),
    referenceMode: extras?.referenceMode,
    visualAnalysis: extras?.visualAnalysis,
  });
}

export async function parseDesignIntent(
  prompt: string,
  opts?: {
    style?: GenuiStyle;
    preferLlm?: boolean;
    referenceMode?: ReferenceMode;
    visualAnalysis?: VisualStyleAnalysis;
  }
): Promise<{ intent: DesignIntent; source: "llm" | "heuristic"; model?: string }> {
  const forced = opts?.style;
  const preferLlm = opts?.preferLlm !== false;
  const extras = {
    referenceMode: opts?.referenceMode,
    visualAnalysis: opts?.visualAnalysis,
  };

  if (preferLlm && hasLlmApiKey()) {
    try {
      const visionBlock = opts?.visualAnalysis
        ? `\n\nReference visual analysis (JSON):\n${JSON.stringify(opts.visualAnalysis, null, 2)}\nReference mode: ${opts.referenceMode || "full"}`
        : "";
      const result = await chatJson([
        { role: "system", content: intentSystemPrompt() },
        {
          role: "user",
          content: forced
            ? `${prompt}${visionBlock}\n\nForce style to: ${forced}`
            : `${prompt}${visionBlock}`,
        },
      ]);
      const json = parseJsonObject(result.content) as DesignIntent;
      const requiredComponents = mergeRequired(
        extractRequiredComponents(prompt),
        json.components || [],
        [
          ...(json.requiredComponents || []),
          ...(opts?.visualAnalysis?.componentHierarchy || []),
        ]
      );
      const intent = DesignIntentSchema.parse({
        ...json,
        style: forced || json.style || "modern-saas",
        requiredComponents,
        referenceMode: opts?.referenceMode || json.referenceMode,
        visualAnalysis: opts?.visualAnalysis || json.visualAnalysis,
        typography: json.typography || opts?.visualAnalysis?.typography,
        spacing: json.spacing || opts?.visualAnalysis?.spacingSystem,
        hierarchy:
          json.hierarchy ||
          opts?.visualAnalysis?.componentHierarchy?.join(" → "),
      });
      return { intent, source: "llm", model: result.model };
    } catch {
      // Fall through to honest heuristic
    }
  }

  return {
    intent: parseIntentHeuristic(prompt, forced, extras),
    source: "heuristic",
  };
}
