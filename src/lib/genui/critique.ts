import { makeId } from "@/lib/genui/ids";
import { chatJson, hasLlmApiKey } from "@/lib/genui/llm";
import {
  CRITIQUE_DIMENSIONS,
  runRuleCritique,
} from "@/lib/genui/critique-rules";
import {
  buildCritiqueUserPrompt,
  critiqueSystemPrompt,
} from "@/lib/genui/prompts";
import type {
  CritiqueDimension,
  CritiqueIssue,
  CritiqueResult,
  CritiqueScores,
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
        suggestion: String(o.suggestion || "").slice(0, 280) || "Improve this area.",
      });
    }
    return {
      scores,
      issues,
      summary: String(json.summary || "").slice(0, 400) || "LLM critique complete.",
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

/**
 * Critique = deterministic rules always + optional real LLM (never fake scores).
 */
export async function critiqueUiSchema(opts: {
  schema: UiSchema;
  intent: DesignIntent;
  prompt: string;
  revisionId: string;
  /** Prefer rules-only when fixture / no key */
  allowLlm?: boolean;
}): Promise<CritiqueResult> {
  const rules = runRuleCritique(opts.schema, opts.intent);
  const base: CritiqueResult = {
    id: makeId("crit"),
    revisionId: opts.revisionId,
    createdAt: new Date().toISOString(),
    source: "rules",
    overall: Math.round(average(rules.scores) * 10) / 10,
    scores: rules.scores,
    issues: rules.issues,
    summary: rules.summary,
    suggestRegenerate: rules.suggestRegenerate,
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
          ruleScores: rules.scores,
          ruleIssues: rules.issues,
        }),
      },
    ]);
    const parsed = parseLlmCritique(llm.content, rules.scores);
    if (!parsed) {
      return {
        ...base,
        summary: `${base.summary} (LLM critique parse failed — keeping rules only.)`,
      };
    }

    const scores = mergeScores(rules.scores, parsed.scores);
    const issues = [...rules.issues, ...parsed.issues].slice(0, 20);
    const overall = Math.round(average(scores) * 10) / 10;
    return {
      id: base.id,
      revisionId: opts.revisionId,
      createdAt: base.createdAt,
      source: "rules+llm",
      overall,
      scores,
      issues,
      summary: parsed.summary || rules.summary,
      suggestRegenerate:
        parsed.suggestRegenerate || rules.suggestRegenerate || overall < 5.5,
      model: llm.model,
    };
  } catch (e) {
    return {
      ...base,
      summary: `${base.summary} (LLM unavailable: ${
        e instanceof Error ? e.message : "error"
      })`,
    };
  }
}
