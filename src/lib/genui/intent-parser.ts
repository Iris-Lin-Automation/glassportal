import { GENUI_STYLES, type GenuiStyle } from "@/config/genui";
import { DesignIntentSchema, parseJsonObject } from "@/lib/genui/schema";
import { chatJson, hasLlmApiKey } from "@/lib/genui/llm";
import { intentSystemPrompt } from "@/lib/genui/prompts";
import type { DesignIntent } from "@/lib/genui/types";

function detectStyle(prompt: string, forced?: GenuiStyle): GenuiStyle {
  if (forced && GENUI_STYLES.includes(forced)) return forced;
  const p = prompt.toLowerCase();
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

/** Deterministic heuristic parser — labeled honestly when LLM is unavailable. */
export function parseIntentHeuristic(
  prompt: string,
  forcedStyle?: GenuiStyle
): DesignIntent {
  const p = prompt.toLowerCase();
  const style = detectStyle(prompt, forcedStyle);

  let pageType = "landing";
  if (/dashboard|analytics|kpi|admin/.test(p)) pageType = "dashboard";
  else if (/pricing/.test(p)) pageType = "pricing";
  else if (/product|detail|ecommerce|shop/.test(p)) pageType = "product-detail";
  else if (/form|signup|onboard/.test(p)) pageType = "form";
  else if (/settings|account/.test(p)) pageType = "settings";

  const layout = /sidebar|dashboard|admin/.test(p)
    ? "sidebar-main"
    : /split|two.?column/.test(p)
      ? "split"
      : "single-column";

  const components: string[] = [];
  if (/kpi|metric|stat/.test(p)) components.push("kpi-card");
  if (/chart|graph|revenue/.test(p)) components.push("chart");
  if (/table|transaction|list/.test(p)) components.push("table");
  if (/nav|sidebar|menu/.test(p)) components.push("nav");
  if (/button|cta/.test(p)) components.push("button");
  if (/card/.test(p)) components.push("card");
  if (/hero|headline/.test(p)) components.push("heading");
  if (!components.length) {
    components.push("heading", "text", "button", "card");
  }

  let colorTone = "neutral slate";
  if (/blue|indigo|sky/.test(p)) colorTone = "blue / indigo";
  if (/green|emerald/.test(p)) colorTone = "emerald";
  if (/warm|orange|amber/.test(p)) colorTone = "warm amber";

  return DesignIntentSchema.parse({
    pageType,
    style,
    layout,
    components,
    colorTone,
    responsive: /mobile|responsive/.test(p)
      ? "Desktop + Mobile"
      : "Desktop first, responsive",
    rawSummary: prompt.trim().slice(0, 280),
  });
}

export async function parseDesignIntent(
  prompt: string,
  opts?: { style?: GenuiStyle; preferLlm?: boolean }
): Promise<{ intent: DesignIntent; source: "llm" | "heuristic"; model?: string }> {
  const forced = opts?.style;
  const preferLlm = opts?.preferLlm !== false;

  if (preferLlm && hasLlmApiKey()) {
    try {
      const result = await chatJson([
        { role: "system", content: intentSystemPrompt() },
        {
          role: "user",
          content: forced
            ? `${prompt}\n\nForce style to: ${forced}`
            : prompt,
        },
      ]);
      const json = parseJsonObject(result.content);
      const intent = DesignIntentSchema.parse({
        ...(json as object),
        style: forced || (json as DesignIntent).style || "modern-saas",
      });
      return { intent, source: "llm", model: result.model };
    } catch {
      // Fall through to honest heuristic
    }
  }

  return {
    intent: parseIntentHeuristic(prompt, forced),
    source: "heuristic",
  };
}
