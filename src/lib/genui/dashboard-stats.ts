import { GENUI_STYLES, type GenuiStyle } from "@/config/genui";
import { listEvalCases } from "@/lib/genui/eval-cases";
import {
  listRuns,
  loadRunDetail,
} from "@/lib/genui/stores/run-store";
import type {
  CritiqueResult,
  GenerationRun,
  RevisionRecord,
} from "@/lib/genui/types";

export type DashboardRow = {
  runId: string;
  createdAt: string;
  prompt: string;
  style: GenuiStyle;
  model: string;
  mode: "llm" | "fixture";
  status: GenerationRun["status"];
  revisionCount: number;
  firstScore: number | null;
  latestScore: number | null;
  scoreDelta: number | null;
  issueCount: number;
  critiqueSource: CritiqueResult["source"] | null;
};

export type DashboardStats = {
  generatedAt: string;
  totals: {
    runs: number;
    revisions: number;
    evaluated: number;
    revised: number;
    withScore: number;
    avgLatestScore: number | null;
    avgScoreDelta: number | null;
    successRate: number;
  };
  byStyle: Array<{
    style: GenuiStyle;
    runs: number;
    avgLatestScore: number | null;
    avgDelta: number | null;
  }>;
  recent: DashboardRow[];
  evalCases: { count: number; scenarios: string[] };
};

function avg(nums: number[]) {
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function firstAndLatestScores(revisions: RevisionRecord[]) {
  const scored = revisions.filter((r) => r.critique);
  if (!scored.length) {
    return {
      first: null as number | null,
      latest: null as number | null,
      delta: null as number | null,
      issueCount: 0,
      source: null as CritiqueResult["source"] | null,
    };
  }
  const first = scored[0].critique!;
  const latest = scored[scored.length - 1].critique!;
  return {
    first: first.overall,
    latest: latest.overall,
    delta: Math.round((latest.overall - first.overall) * 10) / 10,
    issueCount: latest.issues.length,
    source: latest.source,
  };
}

export async function buildDashboardStats(opts?: {
  ownerKey?: string;
  limit?: number;
}): Promise<DashboardStats> {
  const ownerKey = opts?.ownerKey || "*";
  const limit = opts?.limit || 80;
  const runs = await listRuns(ownerKey, limit);

  const rows: DashboardRow[] = [];
  let revisionCount = 0;
  let evaluated = 0;
  let revised = 0;
  const latestScores: number[] = [];
  const deltas: number[] = [];
  const styleBucket: Record<
    GenuiStyle,
    { scores: number[]; deltas: number[]; runs: number }
  > = {
    minimal: { scores: [], deltas: [], runs: 0 },
    "modern-saas": { scores: [], deltas: [], runs: 0 },
    editorial: { scores: [], deltas: [], runs: 0 },
    "night-sky": { scores: [], deltas: [], runs: 0 },
  };

  for (const run of runs) {
    const detail = await loadRunDetail(run.id);
    if (!detail) continue;
    revisionCount += detail.revisions.length;
    if (run.status === "evaluated" || detail.revisions.some((r) => r.critique)) {
      evaluated += 1;
    }
    if (run.status === "revised" || detail.revisions.length > 1) {
      revised += 1;
    }
    const scores = firstAndLatestScores(detail.revisions);
    if (scores.latest != null) latestScores.push(scores.latest);
    if (scores.delta != null) deltas.push(scores.delta);

    const bucket = styleBucket[run.style] || styleBucket["modern-saas"];
    bucket.runs += 1;
    if (scores.latest != null) bucket.scores.push(scores.latest);
    if (scores.delta != null) bucket.deltas.push(scores.delta);

    rows.push({
      runId: run.id,
      createdAt: run.createdAt,
      prompt: run.prompt,
      style: run.style,
      model: run.model.name,
      mode: run.model.mode,
      status: run.status,
      revisionCount: detail.revisions.length,
      firstScore: scores.first,
      latestScore: scores.latest,
      scoreDelta: scores.delta,
      issueCount: scores.issueCount,
      critiqueSource: scores.source,
    });
  }

  const cases = listEvalCases();
  const successRate =
    rows.length === 0
      ? 0
      : Math.round(
          (rows.filter((r) => r.status !== "failed").length / rows.length) * 1000
        ) / 10;

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      runs: rows.length,
      revisions: revisionCount,
      evaluated,
      revised,
      withScore: latestScores.length,
      avgLatestScore: avg(latestScores),
      avgScoreDelta: avg(deltas),
      successRate,
    },
    byStyle: GENUI_STYLES.map((style) => ({
      style,
      runs: styleBucket[style].runs,
      avgLatestScore: avg(styleBucket[style].scores),
      avgDelta: avg(styleBucket[style].deltas),
    })),
    recent: rows,
    evalCases: {
      count: cases.length,
      scenarios: Array.from(new Set(cases.map((c) => c.scenario))),
    },
  };
}

export type ExportRecord = {
  runId: string;
  revisionId: string;
  createdAt: string;
  prompt: string;
  style: string;
  model: string;
  mode: string;
  status: string;
  source: string;
  overall: number | null;
  layout: number | null;
  hierarchy: number | null;
  spacing: number | null;
  typography: number | null;
  color: number | null;
  completeness: number | null;
  issueCount: number;
  critiqueSource: string | null;
  parentRevisionId: string | null;
};

export async function buildExportRecords(opts?: {
  ownerKey?: string;
  limit?: number;
}): Promise<ExportRecord[]> {
  const runs = await listRuns(opts?.ownerKey || "*", opts?.limit || 100);
  const out: ExportRecord[] = [];
  for (const run of runs) {
    const detail = await loadRunDetail(run.id);
    if (!detail) continue;
    for (const rev of detail.revisions) {
      const c = rev.critique;
      out.push({
        runId: run.id,
        revisionId: rev.id,
        createdAt: rev.createdAt,
        prompt: run.prompt,
        style: run.style,
        model: run.model.name,
        mode: run.model.mode,
        status: run.status,
        source: rev.source,
        overall: c?.overall ?? null,
        layout: c?.scores.layout ?? null,
        hierarchy: c?.scores.hierarchy ?? null,
        spacing: c?.scores.spacing ?? null,
        typography: c?.scores.typography ?? null,
        color: c?.scores.color ?? null,
        completeness: c?.scores.completeness ?? null,
        issueCount: c?.issues.length ?? 0,
        critiqueSource: c?.source ?? null,
        parentRevisionId: rev.parentRevisionId || null,
      });
    }
  }
  return out;
}

export function recordsToCsv(rows: ExportRecord[]) {
  if (!rows.length) {
    return "runId,revisionId,createdAt,prompt,style,model,mode,status,source,overall,layout,hierarchy,spacing,typography,color,completeness,issueCount,critiqueSource,parentRevisionId\n";
  }
  const keys = Object.keys(rows[0]) as (keyof ExportRecord)[];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [
    keys.join(","),
    ...rows.map((r) => keys.map((k) => esc(r[k])).join(",")),
  ].join("\n");
}
