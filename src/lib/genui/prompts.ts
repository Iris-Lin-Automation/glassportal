import type { GenuiStyle } from "@/config/genui";
import type { DesignIntent } from "@/lib/genui/types";

export function intentSystemPrompt() {
  return `You are a Design Intent Parser for a Generative UI workbench.
Extract a structured design brief from the user prompt.
Return ONLY a JSON object with keys:
pageType (string), style (one of: minimal | modern-saas | editorial),
layout (string), components (string array), colorTone (string optional),
responsive (string optional), audience (string optional), rawSummary (string).
If style is unclear, default to "modern-saas".`;
}

export function generateSystemPrompt(style: GenuiStyle) {
  return `You are a UI Generator that outputs STRICT JSON for a React component registry.
Never output JavaScript, TypeScript, HTML, or markdown — only a JSON object.

Schema shape:
{
  "version": 1,
  "meta": { "title": string, "pageType": string, "style": "${style}", "description": string },
  "root": { "id": string, "type": "page", "props": {}, "children": UiNode[] }
}

UiNode: { id, type, props?, children? }
Allowed types ONLY:
page, stack, row, grid, sidebar-layout, text, heading, button, card, kpi-card,
badge, input, image, divider, nav, chart, table, list, spacer.

Props conventions:
- heading: { text, level?: 1|2|3 }
- text: { text, muted?: boolean }
- button: { label, variant?: "primary"|"secondary"|"ghost" }
- kpi-card: { title, value, delta?: string }
- chart: { title, chartType?: "line"|"bar", points?: number[] }
- table: { title, columns: string[], rows: string[][] }
- nav: { items: string[] }
- image: { src?: string, alt?: string, aspect?: string }
- badge: { text, tone?: "neutral"|"success"|"warning" }
- input: { label, placeholder? }
- sidebar-layout: children[0]=sidebar, children[1]=main
- stack/row/grid: use props.gap?: "sm"|"md"|"lg", props.columns?: number for grid

Style "${style}" rules:
- minimal: lots of whitespace, slate neutrals, thin borders, restrained type
- modern-saas: indigo/sky accents, KPI row, clean cards, product UI density
- editorial: serif-feeling headings via tracking, large title, story sections, fewer cards

Build a COMPLETE page matching the intent. Use unique string ids. Keep under 60 nodes.`;
}

export function buildGenerateUserPrompt(
  prompt: string,
  intent: DesignIntent,
  style: GenuiStyle
) {
  return `User prompt:
${prompt}

Parsed design intent (JSON):
${JSON.stringify(intent, null, 2)}

Forced visual style: ${style}

Generate the UiSchema JSON now.`;
}
