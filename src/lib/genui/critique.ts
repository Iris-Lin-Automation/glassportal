import { makeId } from "@/lib/genui/ids";
import { chatJson, hasLlmApiKey, supportsVisionModel } from "@/lib/genui/llm";
import {
  CRITIQUE_DIMENSIONS,
  runRuleCritique,
} from "@/lib/genui/critique-rules";
import {
  buildCritiqueUserPrompt,
  critiqueSystemPrompt,
} from "@/lib/genui/prompts";
import type {
  BrowserCritiqueFindings,
  CritiqueDimension,
  CritiqueIssue,
  CritiqueResult,
  CritiqueScores,
  CritiqueSourceTag,
  DesignIntent,
  UiSchema,
} from "@/lib/genui/types";

function clamp(n: unknown, fallback: number) {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(1, Math.min(10, Math.round(v * 10) / 10));
}

function parseLlmCritique(
  raw: string,
  fallback: CritiqueScores
): {
  scores: CritiqueScores;
  issues: CritiqueIssue[];
  summary: string;
  suggestRegenerate: boolean;
} | null {
  try {
    const json = JSON.parse(raw) as Record<string, unknown>;
    const scoresIn = (json.scores || {}) as Record<string, unknown>;
    const scores: CritiqueScores = { ...fallback };
    for (const d of CRITIQUE_DIMENSIONS) {
      scores[d] = clamp(scoresIn[d], fallback[d]);
    }
    const issuesRaw = Array.isArray(json.issues) ? json.issues : [];
    const issues: CritiqueIssue[] = [];
    for (const item of issuesRaw.slice(0, 16)) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const dim = String(o.dimension || "") as CritiqueDimension;
      if (!CRITIQUE_DIMENSIONS.includes(dim)) continue;
      const severity =
        o.severity === "high" || o.severity === "low" ? o.severity : "medium";
      issues.push({
        dimension: dim,
        severity,
        message: String(o.message || "").slice(0, 280) || "Issue",
        suggestion:
          String(o.suggestion || "").slice(0, 280) || "Improve this area.",
        source: "llm",
      });
    }
    return {
      scores,
      issues,
      summary:
        String(json.summary || "").slice(0, 400) || "LLM critique complete.",
      suggestRegenerate: Boolean(json.suggestRegenerate),
    };
  } catch {
    return null;
  }
}

function average(scores: CritiqueScores) {
  return (
    CRITIQUE_DIMENSIONS.reduce((a, d) => a + scores[d], 0) /
    CRITIQUE_DIMENSIONS.length
  );
}

function mergeScores(a: CritiqueScores, b: CritiqueScores): CritiqueScores {
  const out = { ...a };
  for (const d of CRITIQUE_DIMENSIONS) {
    out[d] = Math.round(((a[d] + b[d]) / 2) * 10) / 10;
  }
  return out;
}

function applyBrowserFindings(
  scores: CritiqueScores,
  findings?: BrowserCritiqueFindings | null
): { scores: CritiqueScores; issues: CritiqueIssue[] } {
  if (!findings) return { scores, issues: [] };
  const next = { ...scores };
  const issues: CritiqueIssue[] = [];
  const overflow = findings.overflowNodeIds?.length || 0;
  const clipped = findings.clippedNodeIds?.length || 0;
  if (overflow > 0) {
    next.responsiveBehavior = clamp(
      next.responsiveBehavior - Math.min(3, overflow * 0.8),
      1
    );
    next.layoutQuality = clamp(
      next.layoutQuality - Math.min(2, overflow * 0.5),
      1
    );
    issues.push({
      dimension: "responsiveBehavior",
      severity: overflow >= 2 ? "high" : "medium",
      message: `Browser detected overflow on ${overflow} node(s) at ${findings.viewport} (${Math.round(findings.containerWidth)}px).`,
      suggestion:
        "Tighten layout, reduce columns, or enable horizontal scroll for wide tables.",
      source: "browser",
    });
  }
  if (clipped > 0) {
    next.layoutQuality = clamp(
      next.layoutQuality - Math.min(2.5, clipped * 0.7),
      1
    );
    issues.push({
      dimension: "layoutQuality",
      severity: "high",
      message: `Browser detected clipping/cutoff on ${clipped} node(s) — content may be hidden by overflow:hidden or panel overlap.`,
      suggestion:
        "Ensure the preview artboard resizes with the prompt panel; avoid fixed widths that exceed the stage.",
      source: "browser",
    });
  }
  for (const note of findings.notes || []) {
    issues.push({
      dimension: "responsiveBehavior",
      severity: "low",
      message: note,
      suggestion: "Re-check Desktop / Tablet / Mobile preview widths.",
      source: "browser",
    });
  }
  return { scores: next, issues };
}

function provenanceLabel(
  tags: CritiqueSourceTag[]
): CritiqueResult["source"] {
  const has = (t: CritiqueSourceTag) => tags.includes(t);
  if (has("vlm") && has("browser")) return "rules+vlm";
  if (has("vlm")) return "rules+vlm";
  if (has("llm") && has("browser")) return "rules+llm+browser";
  if (has("llm")) return "rules+llm";
  if (has("browser")) return "rules+browser";
  return "rules";
}

/**
 * Critique = schema rules always + optional browser findings + optional LLM/VLM.
 * Never fabricates visual scores when vision is unavailable.
 */
export async function critiqueUiSchema(opts: {
  schema: UiSchema;
  intent: DesignIntent;
  prompt: string;
  revisionId: string;
  allowLlm?: boolean;
  browserFindings?: BrowserCritiqueFindings | null;
  /** Optional reference image data URLs for VLM compare (only if vision supported) */
  referenceImages?: Array<{ dataUrl: string }>;
}): Promise<CritiqueResult> {
  const rules = runRuleCritique(opts.schema, opts.intent);
  const sources: CritiqueSourceTag[] = ["schema-rules"];
  let scores = rules.scores;
  let issues: CritiqueIssue[] = rules.issues.map((i) => ({
    ...i,
    source: i.source || ("schema-rules" as CritiqueSourceTag),
  }));

  const browser = applyBrowserFindings(scores, opts.browserFindings);
  if (opts.browserFindings) {
    sources.push("browser");
    scores = browser.scores;
    issues = [...issues, ...browser.issues];
  }

  const base: CritiqueResult = {
    id: makeId("crit"),
    revisionId: opts.revisionId,
    createdAt: new Date().toISOString(),
    source: provenanceLabel(sources),
    sources,
    overall: Math.round(average(scores) * 10) / 10,
    scores,
    issues,
    summary: rules.summary,
    suggestRegenerate: rules.suggestRegenerate,
    browserFindings: opts.browserFindings || undefined,
  };

  const wantLlm = opts.allowLlm !== false && hasLlmApiKey();
  if (!wantLlm) return base;

  try {
    const llm = await chatJson([
      { role: "system", content: critiqueSystemPrompt() },
      {
        role: "user",
        content: buildCritiqueUserPrompt({
          prompt: opts.prompt,
          intent: opts.intent,
          schema: opts.schema,
          ruleScores: scores,
          ruleIssues: issues,
          browserFindings: opts.browserFindings || null,
        }),
      },
    ]);
    const parsed = parseLlmCritique(llm.content, scores);
    if (!parsed) {
      return {
        ...base,
        summary: `${base.summary} (LLM critique parse failed — keeping schema-rules${opts.browserFindings ? "+browser" : ""} only.)`,
      };
    }

    sources.push("llm");
    const merged = mergeScores(scores, parsed.scores);
    const allIssues = [...issues, ...parsed.issues].slice(0, 24);
    const overall = Math.round(average(merged) * 10) / 10;

    // Honest VLM compare only when vision is configured AND refs exist
    let vlmNote = "";
    if (opts.referenceImages?.length) {
      if (!supportsVisionModel()) {
        vlmNote =
          " Reference images were present but VLM compare was skipped (vision model not configured).";
      } else if (opts.intent.visualAnalysis?.source === "vlm") {
        sources.push("vlm");
        vlmNote = " Style tokens from prior VLM analysis were considered in intent.";
      }
    }

    return {
      id: base.id,
      revisionId: opts.revisionId,
      createdAt: base.createdAt,
      source: provenanceLabel(sources),
      sources: Array.from(new Set(sources)),
      overall,
      scores: merged,
      issues: allIssues,
      summary: `${parsed.summary || rules.summary}${vlmNote}`,
      suggestRegenerate:
        parsed.suggestRegenerate || rules.suggestRegenerate || overall < 5.5,
      model: llm.model,
      browserFindings: opts.browserFindings || undefined,
    };
  } catch (e) {
    return {
      ...base,
      source: provenanceLabel(sources),
      sources,
      summary: `${base.summary} (LLM unavailable: ${
        e instanceof Error ? e.message : "error"
      })`,
    };
  }
}
