"use client";

import { Loader2, Sparkles, Wand2 } from "lucide-react";
import type { CritiqueDimension, CritiqueResult, RevisionRecord } from "@/lib/genui/types";
import { cn } from "@/lib/utils";

const LABELS: Record<CritiqueDimension, string> = {
  layout: "Layout",
  hierarchy: "Hierarchy",
  spacing: "Spacing",
  typography: "Typography",
  color: "Color",
  completeness: "Completeness",
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="tabular-nums text-slate-800">{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            value >= 7.5
              ? "bg-emerald-500"
              : value >= 5.5
                ? "bg-amber-400"
                : "bg-rose-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function CritiquePanel({
  critique,
  previousCritique,
  revision,
  previousRevision,
  busy,
  onCritique,
  onRevise,
}: {
  critique: CritiqueResult | null;
  previousCritique?: CritiqueResult | null;
  revision: RevisionRecord | null;
  previousRevision?: RevisionRecord | null;
  busy: "critique" | "revise" | null;
  onCritique: () => void;
  onRevise: () => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="flex items-center justify-between border-b border-slate-200/80 px-3 py-2">
        <div>
          <p className="text-[12px] font-semibold text-slate-800">
            Critique & Revision
          </p>
          <p className="text-[10px] text-slate-400">
            Real rules{critique?.source === "rules+llm" ? " + LLM" : ""} — no fake scores
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={!!busy || !revision}
            onClick={onCritique}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {busy === "critique" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Critique
          </button>
          <button
            type="button"
            disabled={!!busy || !revision}
            onClick={onRevise}
            className="inline-flex h-7 items-center gap-1 rounded-md bg-slate-900 px-2 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {busy === "revise" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Wand2 className="h-3 w-3" />
            )}
            Revise
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        {!critique ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-[12px] text-slate-500">
            Run Critique to score this revision on six dimensions.
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Overall
                  </p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                    {critique.overall.toFixed(1)}
                    <span className="text-base font-semibold text-slate-400">
                      /10
                    </span>
                  </p>
                </div>
                {previousCritique ? (
                  <div className="text-right text-[11px]">
                    <p className="text-slate-400">vs previous</p>
                    <p
                      className={cn(
                        "font-semibold tabular-nums",
                        critique.overall - previousCritique.overall >= 0
                          ? "text-emerald-600"
                          : "text-rose-600"
                      )}
                    >
                      {critique.overall - previousCritique.overall >= 0
                        ? "+"
                        : ""}
                      {(critique.overall - previousCritique.overall).toFixed(1)}
                    </p>
                  </div>
                ) : null}
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-slate-600">
                {critique.summary}
              </p>
              {critique.suggestRegenerate ? (
                <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
                  Suggests a stronger revision / regenerate.
                </p>
              ) : null}
            </div>

            <div className="space-y-2.5">
              {(Object.keys(LABELS) as CritiqueDimension[]).map((d) => (
                <ScoreBar
                  key={d}
                  label={LABELS[d]}
                  value={critique.scores[d]}
                />
              ))}
            </div>

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Issues ({critique.issues.length})
              </p>
              {critique.issues.length === 0 ? (
                <p className="text-[12px] text-slate-500">No issues flagged.</p>
              ) : (
                <ul className="space-y-2">
                  {critique.issues.map((issue, i) => (
                    <li
                      key={`${issue.dimension}-${i}`}
                      className="rounded-lg border border-slate-200/80 px-2.5 py-2"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          {LABELS[issue.dimension]}
                        </span>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                            issue.severity === "high"
                              ? "bg-rose-100 text-rose-700"
                              : issue.severity === "medium"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {issue.severity}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] font-medium text-slate-800">
                        {issue.message}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        → {issue.suggestion}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {previousRevision && revision ? (
              <div className="rounded-xl border border-slate-200/80 p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Before / After
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="font-semibold text-slate-500">Before</p>
                    <p className="mt-1 text-slate-700">
                      {previousRevision.schema.meta.title}
                    </p>
                    <p className="text-slate-400">
                      {previousCritique
                        ? `${previousCritique.overall.toFixed(1)}/10`
                        : "no score"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-2 text-white">
                    <p className="font-semibold text-white/70">After</p>
                    <p className="mt-1">{revision.schema.meta.title}</p>
                    <p className="text-white/60">
                      {critique.overall.toFixed(1)}/10
                    </p>
                  </div>
                </div>
                {revision.revisionNotes ? (
                  <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-2 text-[10px] text-slate-600">
                    {revision.revisionNotes}
                  </pre>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
