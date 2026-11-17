"use client";

import { Loader2, MousePointerClick, Sparkles, Trash2, Wand2, X } from "lucide-react";
import type {
  CritiqueDimension,
  CritiqueResult,
  RevisionRecord,
} from "@/lib/genui/types";
import type { GenuiAnnotateTarget } from "@/components/genui/UiSchemaRenderer";
import { cn } from "@/lib/utils";

const LABELS: Record<CritiqueDimension, string> = {
  layout: "Layout",
  hierarchy: "Hierarchy",
  spacing: "Spacing",
  typography: "Typography",
  color: "Color",
  completeness: "Completeness",
};

export type HumanPin = GenuiAnnotateTarget & {
  id: string;
  note: string;
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
  humanNotes,
  onHumanNotesChange,
  pins,
  onRemovePin,
  onUpdatePin,
  annotateMode,
  onToggleAnnotate,
  pendingTarget,
  pendingNote,
  onPendingNoteChange,
  onConfirmPending,
  onCancelPending,
  onCritique,
  onRevise,
}: {
  critique: CritiqueResult | null;
  previousCritique?: CritiqueResult | null;
  revision: RevisionRecord | null;
  previousRevision?: RevisionRecord | null;
  busy: "critique" | "revise" | null;
  humanNotes: string;
  onHumanNotesChange: (v: string) => void;
  pins: HumanPin[];
  onRemovePin: (id: string) => void;
  onUpdatePin: (id: string, note: string) => void;
  annotateMode: boolean;
  onToggleAnnotate: () => void;
  pendingTarget: GenuiAnnotateTarget | null;
  pendingNote: string;
  onPendingNoteChange: (v: string) => void;
  onConfirmPending: () => void;
  onCancelPending: () => void;
  onCritique: () => void;
  onRevise: () => void;
}) {
  const canRevise =
    !!revision &&
    (Boolean(humanNotes.trim()) ||
      pins.some((p) => p.note.trim()) ||
      !!critique);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="flex items-center justify-between border-b border-slate-200/80 px-3 py-2">
        <div>
          <p className="text-[12px] font-semibold text-slate-800">
            Critique & Revision
          </p>
          <p className="text-[10px] text-slate-400">
            Human notes + real rules
            {critique?.source === "rules+llm" ? " + LLM" : ""}
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
            disabled={!!busy || !canRevise}
            onClick={onRevise}
            className="inline-flex h-7 items-center gap-1 rounded-md bg-slate-900 px-2 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {busy === "revise" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Wand2 className="h-3 w-3" />
            )}
            Revise with AI
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        {/* Human-in-the-loop */}
        <section className="rounded-xl border border-slate-900/10 bg-slate-50/90 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold text-slate-800">
                Your feedback
              </p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
                Mark blocks on the left preview, write what to change, then
                Revise with AI.
              </p>
            </div>
            <button
              type="button"
              disabled={!revision}
              onClick={onToggleAnnotate}
              className={cn(
                "inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[10px] font-semibold",
                annotateMode
                  ? "bg-cyan-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              <MousePointerClick className="h-3 w-3" />
              {annotateMode ? "Marking…" : "Mark on preview"}
            </button>
          </div>

          {annotateMode ? (
            <p className="mt-2 rounded-md border border-cyan-200 bg-cyan-50 px-2 py-1.5 text-[11px] text-cyan-900">
              Click any block in the preview (KPI, chart, table, heading…) to pin
              a note on it.
            </p>
          ) : null}

          {pendingTarget ? (
            <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[11px] font-semibold text-slate-800">
                  Pin · {pendingTarget.label}
                </p>
                <button
                  type="button"
                  onClick={onCancelPending}
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <textarea
                value={pendingNote}
                onChange={(e) => onPendingNoteChange(e.target.value)}
                rows={3}
                autoFocus
                placeholder="What should AI change here?"
                className="mt-1.5 w-full resize-none rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[12px] text-slate-800 outline-none focus:border-slate-400"
              />
              <button
                type="button"
                disabled={!pendingNote.trim()}
                onClick={onConfirmPending}
                className="mt-1.5 inline-flex h-7 w-full items-center justify-center rounded-md bg-slate-900 text-[11px] font-semibold text-white disabled:opacity-40"
              >
                Add pin
              </button>
            </div>
          ) : null}

          {pins.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {pins.map((pin) => (
                <li
                  key={pin.id}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-cyan-700">
                      {pin.label}
                    </p>
                    <button
                      type="button"
                      onClick={() => onRemovePin(pin.id)}
                      className="rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <textarea
                    value={pin.note}
                    onChange={(e) => onUpdatePin(pin.id, e.target.value)}
                    rows={2}
                    className="mt-1 w-full resize-none rounded-md border border-slate-100 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-slate-300"
                  />
                </li>
              ))}
            </ul>
          ) : null}

          <label className="mt-2 block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Freeform direction
            </span>
            <textarea
              value={humanNotes}
              onChange={(e) => onHumanNotesChange(e.target.value)}
              rows={4}
              placeholder="e.g. Make the KPI row denser, move chart above the table, use stronger cyan accents…"
              className="mt-1 w-full resize-none rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400"
            />
          </label>
        </section>

        {!critique ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-[12px] text-slate-500">
            Optional: run Critique for automatic scores, or just write feedback
            and Revise with AI.
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Auto overall
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
                Auto issues ({critique.issues.length})
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
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
