import type { GenuiStyle } from "@/config/genui";
import type { DesignIntent } from "@/lib/genui/types";

export function intentSystemPrompt() {
  return `You are a Design Intent Parser for a Generative UI workbench.
Extract a structured design brief from the user prompt AND any reference visual analysis.
Return ONLY a JSON object with keys:
pageType (string),
style (one of: minimal | modern-saas | editorial | night-sky | obsidian | fintech | pulse),
layout (string),
components (string array of free-form wants),
requiredComponents (string array of CANONICAL whitelist ids that MUST appear — e.g. sidebar-layout, kpi-card, chart, table, nav, button, heading, input),
colorTone (string optional),
typography (string optional),
spacing (string optional),
hierarchy (string optional — component order),
responsive (string optional),
audience (string optional),
rawSummary (string).

Rules:
- If the user lists Dashboard + KPI Cards + Revenue Chart + Recent Transactions, ALL of those must land in requiredComponents (sidebar-layout, kpi-card, chart, table).
- If style is unclear, default to "modern-saas".
- dark / geek / night / cyber / neon / Claude Design → night-sky
- cinematic / agency / Obsidian / ink black / electric cyan → obsidian
- crypto / wallet / trading / fintech / CryptoHub → fintech
- PulseMetrics / dark purple analytics / electric purple dashboard → pulse
- Honor reference visual analysis when present (palette, layout, hierarchy).`;
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
- pulse: dark PulseMetrics-like analytics — navy charcoal canvas, electric purple accents, sidebar MENU, search header, 4 KPI cards with deltas, line + bar charts, Generate Report CTA

IMPORTANT: Every id in intent.requiredComponents MUST appear as a real node type in the schema.
Build a COMPLETE, visually premium page matching the intent. Prefer strong hierarchy and breathing room. Use unique string ids. Keep under 60 nodes.`;
}

export function buildGenerateUserPrompt(
  prompt: string,
  intent: DesignIntent,
  style: GenuiStyle
) {
  const vision =
    intent.visualAnalysis?.source === "vlm"
      ? `\nVisual reference analysis (trusted VLM):\n${JSON.stringify(intent.visualAnalysis, null, 2)}\nReference mode: ${intent.referenceMode || "full"}`
      : intent.visualAnalysis?.source === "unavailable"
        ? `\nNOTE: Reference images were uploaded but NOT visually understood (${intent.visualAnalysis.notes || "vision unavailable"}). Do not invent a fake match to unseen screenshots.`
        : "";

  return `User prompt:
${prompt}

Parsed design intent (JSON):
${JSON.stringify(intent, null, 2)}
${vision}

Forced visual style: ${style}
Required components (MUST include): ${(intent.requiredComponents || []).join(", ") || "(none listed)"}

Generate the UiSchema JSON now.`;
}

export function critiqueSystemPrompt() {
  return `You are a strict UI Design Reviewer for a schema-driven Generative UI system.
Score the UI Schema on six acceptance dimensions from 1–10:
requirementCoverage, componentCompleteness, layoutQuality, visualHierarchy, styleConsistency, responsiveBehavior.

Return ONLY JSON:
{
  "scores": {
    "requirementCoverage": n,
    "componentCompleteness": n,
    "layoutQuality": n,
    "visualHierarchy": n,
    "styleConsistency": n,
    "responsiveBehavior": n
  },
  "issues": [{ "dimension": "...", "severity": "low"|"medium"|"high", "message": "...", "suggestion": "..." }],
  "summary": "one short paragraph",
  "suggestRegenerate": boolean
}

Rules:
- Cross-check original prompt + intent.requiredComponents against the schema.
- Do not invent browser overflow findings; those come separately when provided.
- Do not invent VLM/reference visual scores when visualAnalysis.source is unavailable.
- Be concrete. Do not invent components outside the whitelist. Do not output markdown.`;
}

export function buildCritiqueUserPrompt(opts: {
  prompt: string;
  intent: DesignIntent;
  schema: unknown;
  ruleScores: unknown;
  ruleIssues: unknown;
  browserFindings?: unknown;
}) {
  return `User prompt:
${opts.prompt}

Design intent:
${JSON.stringify(opts.intent, null, 2)}

Schema-rule scores (deterministic baseline — refine, don't ignore):
${JSON.stringify(opts.ruleScores, null, 2)}

Schema-rule issues:
${JSON.stringify(opts.ruleIssues, null, 2)}

Browser findings (may be null — only trust when present):
${JSON.stringify(opts.browserFindings ?? null, null, 2)}

UI Schema to review:
${JSON.stringify(opts.schema, null, 2).slice(0, 12000)}

Return the critique JSON.`;
}

export function reviseSystemPrompt(style: GenuiStyle) {
  return `${generateSystemPrompt(style)}

You are now a Revision Agent. Improve the existing UiSchema using the critique
AND any human feedback notes / circled node ids / reference style notes.
Keep the same page goal and style "${style}".
Return a COMPLETE updated UiSchema JSON (not a patch).
Priority order:
1) Human freeform direction and pinned block notes (must follow)
2) High/medium critique issues (especially requirementCoverage / missing components)
3) Reference visual analysis when source is "vlm"
4) Preserve working sections when possible.
When a note targets a node id/type, change that block specifically.
Always keep intent.requiredComponents present after revision.`;
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

Required components that must remain/appear: ${(opts.intent.requiredComponents || []).join(", ") || "(none)"}

Output the improved UiSchema JSON now.`;
}
