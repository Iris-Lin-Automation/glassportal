"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Download,
  Loader2,
  Play,
  RefreshCw,
} from "lucide-react";
import { GENUI_STYLE_LABELS } from "@/config/genui";
import type { DashboardStats } from "@/lib/genui/dashboard-stats";

const OWNER = "glassportal-eval";

export default function GenuiDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [busy, setBusy] = useState<"load" | "seed" | null>("load");
  const [error, setError] = useState("");
  const [seedNote, setSeedNote] = useState("");

  const load = useCallback(async () => {
    setBusy("load");
    setError("");
    try {
      const res = await fetch(
        `/api/genui/dashboard?ownerKey=${encodeURIComponent(OWNER)}&limit=100`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Load failed");
      setStats(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runEvalSuite = async () => {
    setBusy("seed");
    setError("");
    setSeedNote("");
    try {
      const res = await fetch("/api/genui/eval/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerKey: OWNER,
          fixture: true,
          critique: true,
          revise: true,
          limit: 20,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Eval run failed");
      setSeedNote(
        `Ran ${json.count} cases (${json.meta?.note || "fixture + rules"}).`
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eval run failed");
      setBusy(null);
    }
  };

  const t = stats?.totals;

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 flex h-11 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur">
        <div className="flex items-center gap-2 text-[12px]">
          <Link
            href="/generative-ui"
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Workspace
          </Link>
          <span className="text-slate-300">/</span>
          <span className="font-semibold">Eval Dashboard</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void load()}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {busy === "load" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void runEvalSuite()}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-slate-900 px-2.5 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {busy === "seed" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            Run 20 evals
          </button>
          <a
            href={`/api/genui/export?ownerKey=${encodeURIComponent(OWNER)}&format=json`}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            JSON
          </a>
          <a
            href={`/api/genui/export?ownerKey=${encodeURIComponent(OWNER)}&format=csv`}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Evaluation Dashboard
          </h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Real run history, rule/LLM critique scores, before→after deltas, and
            export. No fabricated scores.
          </p>
          {seedNote ? (
            <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-900">
              {seedNote}
            </p>
          ) : null}
          {error ? (
            <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Runs", t?.runs ?? "—"],
            ["Avg score", t?.avgLatestScore ?? "—"],
            ["Avg Δ after fix", t?.avgScoreDelta ?? "—"],
            ["Success %", t ? `${t.successRate}` : "—"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {label}
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                {value}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Scores by style
              </h2>
              <p className="text-[11px] text-slate-400">
                Eval catalog: {stats?.evalCases.count ?? 0} prompts ·{" "}
                {(stats?.evalCases.scenarios || []).join(" · ")}
              </p>
            </div>
            <p className="text-[11px] text-slate-400">
              {stats?.totals.evaluated ?? 0} evaluated ·{" "}
              {stats?.totals.revised ?? 0} revised
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {(stats?.byStyle || []).map((s) => (
              <div
                key={s.style}
                className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
              >
                <p className="text-[11px] font-semibold text-slate-700">
                  {GENUI_STYLE_LABELS[s.style]}
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                  {s.avgLatestScore ?? "—"}
                  <span className="ml-1 text-[11px] font-medium text-slate-400">
                    /10
                  </span>
                </p>
                <p className="text-[10px] text-slate-500">
                  {s.runs} runs · Δ {s.avgDelta ?? "—"}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">
              Recent runs
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-max min-w-full text-left text-[12px]">
              <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-semibold">Prompt</th>
                  <th className="px-3 py-2 font-semibold">Style</th>
                  <th className="px-3 py-2 font-semibold">Mode</th>
                  <th className="px-3 py-2 font-semibold">Revs</th>
                  <th className="px-3 py-2 font-semibold">First</th>
                  <th className="px-3 py-2 font-semibold">Latest</th>
                  <th className="px-3 py-2 font-semibold">Δ</th>
                  <th className="px-3 py-2 font-semibold">Issues</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.recent || []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-10 text-center text-slate-400"
                    >
                      No eval runs yet. Click “Run 20 evals”.
                    </td>
                  </tr>
                ) : (
                  (stats?.recent || []).map((r) => (
                    <tr
                      key={r.runId}
                      className="border-t border-slate-100 hover:bg-slate-50/60"
                    >
                      <td className="max-w-[320px] px-3 py-2">
                        <Link
                          href={`/generative-ui?run=${encodeURIComponent(r.runId)}`}
                          className="line-clamp-2 font-medium text-slate-800 hover:underline"
                        >
                          {r.prompt}
                        </Link>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {new Date(r.createdAt).toLocaleString()}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                        {GENUI_STYLE_LABELS[r.style]}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                        {r.mode}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-slate-600">
                        {r.revisionCount}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-slate-600">
                        {r.firstScore ?? "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums font-semibold text-slate-800">
                        {r.latestScore ?? "—"}
                      </td>
                      <td
                        className={`px-3 py-2 tabular-nums font-semibold ${
                          (r.scoreDelta || 0) > 0
                            ? "text-emerald-600"
                            : (r.scoreDelta || 0) < 0
                              ? "text-rose-600"
                              : "text-slate-400"
                        }`}
                      >
                        {r.scoreDelta == null
                          ? "—"
                          : `${r.scoreDelta > 0 ? "+" : ""}${r.scoreDelta}`}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-slate-600">
                        {r.issueCount}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
