"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  MousePointerClick,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
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

/** Compact floating feedback dock — keeps preview visible */
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
  collapsed,
  onToggleCollapsed,
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
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const [showAuto, setShowAuto] = useState(false);
  const canRevise =
    !!revision &&
    (Boolean(humanNotes.trim()) ||
      pins.some((p) => p.note.trim()) ||
      !!critique);
  const pinCount = pins.length;

  if (collapsed) {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/95 p-1 pl-2 shadow-lg backdrop-blur">
        {critique ? (
          <span className="px-1.5 text-[11px] font-bold tabular-nums text-slate-800">
            {critique.overall.toFixed(1)}
          </span>
        ) : null}
        {pinCount > 0 ? (
          <span className="rounded-full bg-cyan-100 px-1.5 text-[10px] font-semibold text-cyan-800">
            {pinCount} pin{pinCount > 1 ? "s" : ""}
          </span>
        ) : null}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="inline-flex h-8 items-center gap-1 rounded-full bg-slate-900 px-3 text-[11px] font-semibold text-white"
        >
          <PanelRightOpen className="h-3.5 w-3.5" />
          Feedback
        </button>
      </div>
    );
  }

  return (
    <div className="flex max-h-[min(70vh,560px)] w-[300px] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-[0_16px_48px_rgba(15,23,42,0.18)] backdrop-blur">
      <div className="flex items-center gap-1 border-b border-slate-100 px-2 py-1.5">
        <p className="min-w-0 flex-1 truncate px-1 text-[11px] font-semibold text-slate-800">
          Feedback
          {critique ? (
            <span className="ml-1.5 tabular-nums text-slate-400">
              {critique.overall.toFixed(1)}/10
            </span>
          ) : null}
        </p>
        <button
          type="button"
          disabled={!revision}
          onClick={onToggleAnnotate}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-semibold",
            annotateMode
              ? "bg-cyan-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          )}
          title="Mark on preview"
        >
          <MousePointerClick className="h-3 w-3" />
          Mark
        </button>
        <button
          type="button"
          disabled={!!busy || !revision}
          onClick={onCritique}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          title="Auto critique"
        >
          {busy === "critique" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          disabled={!!busy || !canRevise}
          onClick={onRevise}
          className="inline-flex h-7 items-center gap-1 rounded-md bg-slate-900 px-2 text-[10px] font-semibold text-white disabled:opacity-40"
        >
          {busy === "revise" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Wand2 className="h-3 w-3" />
          )}
          Revise
        </button>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          title="Hide panel"
        >
          <PanelRightClose className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
        {annotateMode ? (
          <p className="rounded-md bg-cyan-50 px-2 py-1 text-[10px] font-medium text-cyan-900">
            Click a preview block to pin a note
          </p>
        ) : null}

        {pendingTarget ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <div className="flex items-center justify-between gap-1">
              <p className="truncate text-[10px] font-semibold text-slate-700">
                {pendingTarget.label}
              </p>
              <button
                type="button"
                onClick={onCancelPending}
                className="rounded p-0.5 text-slate-400 hover:bg-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <textarea
              value={pendingNote}
              onChange={(e) => onPendingNoteChange(e.target.value)}
              rows={2}
              autoFocus
              placeholder="What should change here?"
              className="mt-1 w-full resize-none rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-slate-400"
            />
            <button
              type="button"
              disabled={!pendingNote.trim()}
              onClick={onConfirmPending}
              className="mt-1 h-6 w-full rounded-md bg-slate-900 text-[10px] font-semibold text-white disabled:opacity-40"
            >
              Add pin
            </button>
          </div>
        ) : null}

        {pins.length > 0 ? (
          <ul className="space-y-1">
            {pins.map((pin) => (
              <li
                key={pin.id}
                className="rounded-md border border-slate-200 px-2 py-1.5"
              >
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-cyan-700">
                    {pin.label}
                  </p>
                  <button
                    type="button"
                    onClick={() => onRemovePin(pin.id)}
                    className="rounded p-0.5 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <textarea
                  value={pin.note}
                  onChange={(e) => onUpdatePin(pin.id, e.target.value)}
                  rows={2}
                  className="mt-0.5 w-full resize-none rounded border-0 bg-slate-50 px-1.5 py-1 text-[11px] text-slate-700 outline-none"
                />
              </li>
            ))}
          </ul>
        ) : null}

        <textarea
          value={humanNotes}
          onChange={(e) => onHumanNotesChange(e.target.value)}
          rows={3}
          placeholder="Tell AI what to change…"
          className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[12px] leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
        />

        {critique ? (
          <div className="rounded-lg border border-slate-100">
            <button
              type="button"
              onClick={() => setShowAuto((v) => !v)}
              className="flex w-full items-center justify-between px-2 py-1.5 text-left text-[10px] font-semibold text-slate-500 hover:bg-slate-50"
            >
              <span>
                Auto scores · {critique.issues.length} issue
                {critique.issues.length === 1 ? "" : "s"}
              </span>
              {showAuto ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {showAuto ? (
              <div className="space-y-2 border-t border-slate-100 px-2 py-2">
                <p className="text-[11px] leading-relaxed text-slate-600">
                  {critique.summary}
                </p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  {(Object.keys(LABELS) as CritiqueDimension[]).map((d) => (
                    <div
                      key={d}
                      className="flex items-center justify-between text-[10px]"
                    >
                      <span className="text-slate-500">{LABELS[d]}</span>
                      <span className="font-semibold tabular-nums text-slate-800">
                        {critique.scores[d].toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
                {critique.issues.slice(0, 4).map((issue, i) => (
                  <p
                    key={`${issue.dimension}-${i}`}
                    className="text-[10px] leading-snug text-slate-600"
                  >
                    <span className="font-semibold text-slate-800">
                      {LABELS[issue.dimension]}:
                    </span>{" "}
                    {issue.message}
                  </p>
                ))}
                {previousRevision && previousCritique ? (
                  <p className="text-[10px] text-slate-500">
                    vs previous{" "}
                    <span
                      className={cn(
                        "font-semibold",
                        critique.overall - previousCritique.overall >= 0
                          ? "text-emerald-600"
                          : "text-rose-600"
                      )}
                    >
                      {critique.overall - previousCritique.overall >= 0
                        ? "+"
                        : ""}
                      {(critique.overall - previousCritique.overall).toFixed(1)}
                    </span>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
