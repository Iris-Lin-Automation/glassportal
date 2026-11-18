import type { GenuiStyle } from "@/config/genui";
import type { DesignIntent } from "@/lib/genui/types";

export function intentSystemPrompt() {
  return `You are a Design Intent Parser for a Generative UI workbench.
Extract a structured design brief from the user prompt.
Return ONLY a JSON object with keys:
pageType (string), style (one of: minimal | modern-saas | editorial | night-sky | obsidian | fintech),
layout (string), components (string array), colorTone (string optional),
responsive (string optional), audience (string optional), rawSummary (string).
If style is unclear, default to "modern-saas".
If user asks for dark / geek / night / cyber / neon / Claude Design, use style "night-sky".
If user asks for cinematic / agency / brand studio / Obsidian / ink black / electric cyan hero, use style "obsidian".
If user asks for crypto / wallet / trading / fintech / purple dashboard, use style "fintech".`;
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
- chart: { title, chartType?: "line"|"bar"|"area", points?: number[] }
- table: { title, columns: string[], rows: string[][] }
- nav: { items: string[] }
- image: { src?: string, alt?: string, aspect?: string }
- badge: { text, tone?: "neutral"|"success"|"warning" }
- input: { label, placeholder? }
- sidebar-layout: children[0]=sidebar, children[1]=main
- stack/row/grid: use props.gap?: "sm"|"md"|"lg", props.columns?: number for grid

Style "${style}" rules:
- minimal: lots of whitespace, slate neutrals, thin borders, restrained type
- modern-saas: violet accents, soft cards, KPI row, area chart, polished product density
- editorial: serif-feeling headings, large title, story sections, fewer cards, strong cover image
- night-sky: dark product studio (Claude Design-like) — ink/black panels, emerald primary CTAs, soft violet glow, high-contrast white headings, KPI + chart + feature cards
- obsidian: cinematic agency landing — matte ink black, electric cyan accents, huge serif H1, full-bleed hero image, sparse CTAs, premium brand studio vibe (NOT a dense dashboard unless asked)
- fintech: bright CryptoHub-like dashboard — white canvas, purple accent, sidebar with active item, 3–4 KPI cards, area chart, trading/portfolio copy

Build a COMPLETE, visually premium page matching the intent. Prefer strong hierarchy and breathing room. Use unique string ids. Keep under 60 nodes.`;
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

export function critiqueSystemPrompt() {
  return `You are a strict UI Design Reviewer for a schema-driven Generative UI system.
Score the UI Schema on six dimensions from 1–10:
layout, hierarchy, spacing, typography, color, completeness.

Return ONLY JSON:
{
  "scores": { "layout": n, "hierarchy": n, "spacing": n, "typography": n, "color": n, "completeness": n },
  "issues": [{ "dimension": "...", "severity": "low"|"medium"|"high", "message": "...", "suggestion": "..." }],
  "summary": "one short paragraph",
  "suggestRegenerate": boolean
}

Be concrete. Reference missing components, weak hierarchy, crowding, or style mismatch.
Do not invent components outside the whitelist. Do not output markdown.`;
}

export function buildCritiqueUserPrompt(opts: {
  prompt: string;
  intent: DesignIntent;
  schema: unknown;
  ruleScores: unknown;
  ruleIssues: unknown;
}) {
  return `User prompt:
${opts.prompt}

Design intent:
${JSON.stringify(opts.intent, null, 2)}

Rule-engine scores (deterministic baseline — refine, don't ignore):
${JSON.stringify(opts.ruleScores, null, 2)}

Rule-engine issues:
${JSON.stringify(opts.ruleIssues, null, 2)}

UI Schema to review:
${JSON.stringify(opts.schema, null, 2).slice(0, 12000)}

Return the critique JSON.`;
}

export function reviseSystemPrompt(style: GenuiStyle) {
  return `${generateSystemPrompt(style)}

You are now a Revision Agent. Improve the existing UiSchema using the critique
AND any human feedback notes.
Keep the same page goal and style "${style}".
Return a COMPLETE updated UiSchema JSON (not a patch).
Priority order:
1) Human freeform direction and pinned block notes (must follow)
2) High/medium critique issues
3) Preserve working sections when possible.
When a note targets a node id/type, change that block specifically.`;
}

export function buildReviseUserPrompt(opts: {
  prompt: string;
  intent: DesignIntent;
  schema: unknown;
  critique: unknown;
  notes?: string;
}) {
  return `Original user prompt:
${opts.prompt}

Design intent:
${JSON.stringify(opts.intent, null, 2)}

Current UiSchema:
${JSON.stringify(opts.schema, null, 2).slice(0, 12000)}

Critique to address:
${JSON.stringify(opts.critique, null, 2).slice(0, 6000)}

Extra revision notes from user:
${opts.notes?.trim() || "(none)"}

Output the improved UiSchema JSON now.`;
}
